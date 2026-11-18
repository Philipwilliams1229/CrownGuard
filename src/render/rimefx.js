// ============ ZONE IV PAINTERS (PLACEHOLDER) ============
// What the Rimewater's engine mechanics look like until the zone IV artists
// draw them (engine/rime.js has the rules). Hooked into draw.js in four
// places: the longship among the drawables (drawShip), the ice shells over
// frozen halls (drawFrostShells), the effects (ZONE_FX[fx.type]), and the
// rig aliases below. Everything here is a stand-in to be replaced:
//   drawShip        a longship under sail: hull, striped sail, oars, a
//                   health bar (its hp decides how many raiders land)
//   landingWarn     the telegraph: a pulsing ring where it will beach and a
//                   dotted line up to the road, for the whole run in
//   beached         the empty hull drawn up on the shingle, fading
//   shipsink        a holed hull going down by the bow
//   plank           a raider's jump from the hull to the road
//   frostcast       the seer's cast: a pale line from her to the hall
//   thaw            the shell breaking up
//   drawFrostShells a pale blue ice shell over a frozen hall, cracking as
//                   it thaws; also (same pass) a hall coiled by the serpent or
//                   smashed by a kraken's arm, and stars over dazed soldiers
//   drawSea         the sea monsters (engine/serpent.js): the serpent's wake
//                   and shadow while submerged, its coils and raised head when
//                   up; the kraken's dome offshore; each arm on the shore
//   serpentRise / serpentBite / serpentGone / krakenRise / krakenSink /
//   armRise / armGrab / armSmash / armSweep / armCut / armSink / stomp
//                   their effects (ZONE_FX)
// A real rig for any of these (rigs-rime.js / rigs-rimebeasts.js) replaces
// the alias or painter here: delete the alias line; for the sea monsters,
// draw.js's `e.sea` hook calls drawSea, which an artist may rewrite freely.

import { S, CELL, W, H as BH } from "../data/constants.js";
import { PX } from "./paint.js";
import { drawArcherTower, drawWizardSpire, drawGarrison, drawSupportTower, drawCatapult, drawBladewheel, drawGoldworks, drawTrapsmith, drawFalconry, drawSunforge, drawAssassin, drawRiverwatchHall, drawGunpowder, drawBandTower } from "./towers.js";
import { RIGS, drawRig } from "./rigs.js";
import { Pix, mat, toCanvas } from "./pix/pix.js";
// the sea monsters' own frame mapping (waterlines, the arm's grab, the sinks)
import { drawSeaRig, armSinkFx, krakenSinkFx, drawSeaHold, drawKrakenDeepRig } from "./rigs-rimebeasts.js";

// ---- borrowed looks for the clans' stub foes (data/enemies.js) ----
// (until rigs-rime.js exists: delete these lines when it lands)
for (const [type, like] of [
  ["thrall", "levy"], ["huscarl", "sergeant"], ["rimeseer", "chaplain"],
  ["berserker", "berserk"], ["rimerider", "wolfrider"], ["rimewolf", "wolf"], ["skald", "shaman"],
  ["frostgiant", "troll"], ["icedrake", "bat"], ["rimejarl", "marshal"],
]) {
  if (!RIGS[type] && RIGS[like]) RIGS[type] = RIGS[like];
}

const HULL_DK = "#2a1c12";

// ---- the longship, sculpted (pix/pix.js): the beached longship's clinker hull, shield row, dragon prow and
// striped sail, here under sail with oars out. Baked once per facing and sail state; the oars and wake are live.
// Art pixels (2 to a board unit) from the ship's centre (x, y); the keel sits ~6 units under it.
const Q = 0.5, LH = 50;
const SHIPS = new Map();
const shipSprite = (face, sail) => {
  const key = face * 2 + (sail ? 1 : 0);
  let sp = SHIPS.get(key);
  if (sp) return sp;
  const ob = new Pix(2 * (LH + 34), 120, LH + 34, 84);
  const M = {
    hull: mat("#6e5440"), hull2: mat("#5a4636"), wood: mat("#76583c"), woodDk: mat("#4a3426"), teal: mat("#2f8a84"),
    ochre: mat("#d49a30"), red: mat("#bd4a3e"), steel: mat("#c4c8d0"), cloth: mat("#e4dcc4"), rope: mat("#8a7a58"),
  };
  const dir = face, X = (u) => u * LH * dir;
  const keel = (u) => 12 - Math.pow(Math.abs(u), 3) * 8, rail = (u) => -4 - Math.pow(Math.abs(u), 2.4) * 7;
  const N = 24, mats = [M.teal, M.hull, M.hull2, M.hull, M.hull2];
  for (let b = 0; b < mats.length; b++) {
    const t0 = b / mats.length, t1 = (b + 1) / mats.length, up = [], dn = [];
    for (let k = 0; k <= N; k++) { const u = -1 + 2 * k / N, ya = rail(u), yb = keel(u); up.push([X(u), ya + (yb - ya) * t0]); dn.push([X(u), ya + (yb - ya) * t1 + 0.5]); }
    ob.part(); ob.poly([...up, ...dn.reverse()], mats[b], 2 - b * 0.3, { n: [0, -0.2, 0.9], ny: -0.2 });
  }
  const bez = (a, b, c, d) => (t) => { const m = 1 - t; return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1]]; };
  const along = (p, n, r0, r1, m, z) => { let a = p(0); for (let k = 1; k <= n; k++) { const c = p(k / n); ob.part(); ob.capsule(a[0], a[1], r0 + (r1 - r0) * ((k - 1) / n), c[0], c[1], r0 + (r1 - r0) * (k / n), m, z, { round: 0.8 }); a = c; } };
  along((t) => [X(-1 + 2 * t), rail(-1 + 2 * t) - 0.5], 30, 1.3, 1.3, M.wood, 4);
  for (const end of [1, -1]) {
    const u = end * 0.97, bx = X(u), by = rail(u), up = end === 1 ? 20 : 15, k = end * dir;
    along(bez([bx - k * 6, by + 6], [bx + k * 9, by + 3], [bx + k * 9, by - up * 0.55], [bx + k * 4, by - up]), 10, 3.4, 2, M.hull2, 3);
    if (end === 1) {
      const hx = bx + k * 4, hy = by - up;
      ob.part(); ob.poly([[hx - k * 5, hy - 6], [hx + k * 17, hy - 2], [hx + k * 16, hy + 4.5], [hx - k * 1, hy + 6.5]], M.ochre, 4, { round: 0.5, ny: -0.2 });
      ob.part(); ob.dot(hx + k * 3, hy - 1, M.teal, 5, {}); ob.part(); ob.dot(hx + k * 3 + 1, hy - 1, M.teal, 5, {});
      for (let q = 0; q < 3; q++) { ob.part(); ob.ellipse(hx - k * (3 + q * 3), hy - (4.5 + q * 2), 1.8, 1.8, M.woodDk, 3.5, {}); }
    } else { ob.part(); ob.ellipse(bx + k * 3, by - up - 1, 3.6, 3.6, M.ochre, 4, { round: 1 }); }
  }
  // the mast, stepped amidships; the yard and the striped sail hanging from it, belled by the wind
  const yy = -60, foot = -22;
  ob.part(); ob.capsule(0, -4, 1.7, 0, yy - 4, 1.2, M.woodDk, 2.5, {});
  for (const e of [1, -1]) along(bez([0, yy - 3], [X(e * 0.3), yy + 8], [X(e * 0.7), -18], [X(e * 0.93), rail(e * 0.93)]), 12, 0.5, 0.5, M.rope, 3);
  if (sail) {
    const W2 = 25, cnt = 8;
    for (let k = 0; k < cnt; k++) {
      const x0 = -W2 + k * (2 * W2 / cnt), x1 = x0 + 2 * W2 / cnt, bell = (x) => Math.sin((x + W2) / (2 * W2) * Math.PI) * 5 * dir;
      ob.part(); ob.poly([[x0, yy + 2], [x1, yy + 2], [x1 + bell(x1) * 0.2, foot + 3], [x1 + bell(x1) * 0.2, foot - 1 + Math.abs(bell(x1)) * 0.3], [x0 + bell(x0) * 0.2, foot - 1 + Math.abs(bell(x0)) * 0.3]], k % 2 ? M.cloth : M.red, 2.8, { n: [0.1 * dir, 0.1, 0.9], round: 0.55 });
    }
  } else { ob.part(); ob.capsule(-W2f(), foot - 18, 1, W2f(), foot - 18, 1, M.cloth, 3, { round: 0.7 }); }
  ob.part(); ob.capsule(-27, yy + 1, 1.5, 27, yy + 1, 1.5, M.wood, 4, { round: 1 });
  // the shield row along the rail, on the hull's side
  for (let k = 0; k < 9; k++) {
    const u = -0.68 + k * 0.17, cx = X(u), cy = rail(u) + 6;
    ob.part(); ob.ellipse(cx, cy, 4.3, 4.3, k % 2 ? M.teal : M.ochre, 5, { round: 1 });
    ob.part(); ob.ellipse(cx - 0.2, cy - 0.2, 1.3, 1.3, M.steel, 6, { round: 1 });
  }
  const img = ob.resolve({ line: "tint" });
  sp = { cv: toCanvas(img), x: -img.ox * Q, y: -img.oy * Q, w: img.w * Q, h: img.h * Q };
  SHIPS.set(key, sp);
  return sp;
};
const W2f = () => 22;
// ---- Round 4 (owner's picks, 2026-11-17): longship B, sea serpent surfaces B, frozen hall B ----
// Everything below is drawn in ART PIXELS (PX to a board unit; `art` opens that frame at a world point,
// whole pixels, one sun upper left) and baked per frame / variant (`bake`), then stamped with one drawImage.
// Concept: concept/fx-r4-rime.js (the code these were ported from).
const TAU = Math.PI * 2;
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ez = (p) => 1 - (1 - p) * (1 - p);
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// the pen helpers keep the caller's globalAlpha and multiply it by `a`
const px = (c, x, y, col, a = 1) => { const p = c.globalAlpha; if (a < 1) c.globalAlpha = p * a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = p; };
const rect = (c, x, y, w, h, col, a = 1) => { const p = c.globalAlpha; if (a < 1) c.globalAlpha = p * a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), w, h); c.globalAlpha = p; };
const ell = (c, cx, cy, rx, ry, col, o = {}) => {
  const a = o.a ?? 1, dens = o.dens ?? 1, hole = o.hole ?? 0;
  if (rx < 0.5 || ry < 0.4) return;
  const p = c.globalAlpha; c.fillStyle = col; if (a < 1) c.globalAlpha = p * a;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 || d < hole * hole) continue;
    if (dens < 1 && bay(x, y) >= dens) continue;
    c.fillRect(x, y, 1, 1);
  }
  c.globalAlpha = p;
};
const ring = (c, cx, cy, rx, ry, col, o = {}) => ell(c, cx, cy, rx, ry, col, { ...o, hole: 1 - (o.th || 1) / Math.max(1, Math.min(rx, ry)) });
// a ring in row spans (no dither): cheap enough to run live, even for the kraken's big ones
const spanRing = (c, cx, cy, rx, ry, col, th = 2, a = 1) => {
  if (rx < 1 || ry < 1) return;
  const p = c.globalAlpha; c.fillStyle = col; if (a < 1) c.globalAlpha = p * a;
  const ix = Math.max(0, rx - th), iy = Math.max(0, ry - th * 0.9);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const ny = (y + 0.5 - cy) / ry; if (ny * ny > 1) continue;
    const xo = rx * Math.sqrt(1 - ny * ny), ni = iy > 0.5 ? (y + 0.5 - cy) / iy : 2;
    const xi = ni * ni < 1 ? ix * Math.sqrt(1 - ni * ni) : -1;
    const L = Math.round(cx - xo), R = Math.round(cx + xo);
    if (xi > 0) { const li = Math.round(cx - xi), ri = Math.round(cx + xi); c.fillRect(L, y, Math.max(1, li - L), 1); c.fillRect(ri, y, Math.max(1, R - ri), 1); }
    else c.fillRect(L, y, Math.max(1, R - L), 1);
  }
  c.globalAlpha = p;
};
const ring2 = (c, cx, cy, rx, ry, col, ink, th = 2, o = {}) => { ring(c, cx, cy, rx + 1, ry + 1, ink, { th: th + 2, a: o.a }); ring(c, cx, cy, rx, ry, col, { th, a: o.a, dens: o.dens }); };
const line = (c, x0, y0, x1, y1, col, a = 1) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let er = dx + dy;
  for (let n = 0; n < 400; n++) { px(c, x0, y0, col, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
};
// open the art-pixel frame at a world point
const art = (ctx, x, y, fn) => { ctx.save(); ctx.translate(Math.round(x * PX) / PX, Math.round(y * PX) / PX); ctx.scale(1 / PX, 1 / PX); fn(); ctx.restore(); };
// baked sprites: a cell of w x h art pixels whose origin is (ax, ay)
const BK = new Map();
const bake = (key, w, h, ax, ay, draw, ink) => {
  let s = BK.get(key);
  if (s) return s;
  if (BK.size > 700) { let n = 200; for (const k of BK.keys()) { BK.delete(k); if (--n <= 0) break; } }
  const cv = mk(w, h), g = cv.getContext("2d", { willReadFrequently: !!ink });
  g.imageSmoothingEnabled = false; g.translate(ax, ay); draw(g);
  if (ink) {   // the tinted one-pixel line round whatever was drawn, in its neighbour's own dark
    g.setTransform(1, 0, 0, 1, 0, 0);
    const img = g.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3] > 40) continue; let n = -1;
      if (x > 0 && d[i - 4 + 3] > 40) n = i - 4; else if (x < w - 1 && d[i + 4 + 3] > 40) n = i + 4;
      else if (y > 0 && d[i - w * 4 + 3] > 40) n = i - w * 4; else if (y < h - 1 && d[i + w * 4 + 3] > 40) n = i + w * 4;
      if (n < 0) continue;
      out[i] = d[n] * 0.4 + 10; out[i + 1] = d[n + 1] * 0.32 + 4; out[i + 2] = d[n + 2] * 0.46 + 18; out[i + 3] = 255;
    }
    img.data.set(out); g.putImageData(img, 0, 0);
  }
  s = { cv, ax, ay }; BK.set(key, s);
  return s;
};
const stamp = (ctx, s, dx = 0, dy = 0) => ctx.drawImage(s.cv, dx - s.ax, dy - s.ay);

const FOAM = "#eef8fc", FOAM2 = "#c4dde9", MIST = "#bfe8ff";
const foamRow = (c, cx, y, hw, amt, ph) => { for (let x = -hw; x <= hw; x++) { const h = H(x + ph * 3, 9); if (h < amt) px(c, cx + x, y + (h < amt * 0.3 ? -1 : 0), h < amt * 0.5 ? FOAM : FOAM2); } };
const bubbles = (c, cx, cy, n, p, spread) => { for (let i = 0; i < n; i++) { const u = (p * 1.2 + H(i, 3)) % 1, x = cx + (H(i, 5) - 0.5) * spread + Math.sin(u * 9 + i) * 1.2, y = cy - u * 26; px(c, x, y, FOAM, 1 - u); if (H(i, 8) > 0.6) px(c, x + 1, y, FOAM2, 1 - u); } };

// ---- the beach warning: a stepped ring, a dotted run up the shingle, a sculpted horn over it ----
const WARN_INK = "#4a1418", WARN_RED = "#f05a44";
const warnSprite = (step) => bake("warn" + step, 120, 62, 60, 31, (g) => {
  const pl = step / 5;
  ring2(g, 0, 0, Math.round((17 + 6 * pl) * 2), Math.round((8 + 3 * pl) * 2 * 0.9), WARN_RED, WARN_INK, 3);
  ring(g, 0, 0, 16, 7, "#f6c0b0", { th: 1, dens: 0.5 });
});
const hornSprite = () => bake("horn", 70, 60, 35, 38, (g) => {
  g.save(); g.scale(1.7, 1.7);
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, hx = -11 + 22 * u, hy = 5 - 11 * u + 6 * u * u, r = 4.4 - 3.4 * u;
    ell(g, hx, hy, r, r, u > 0.3 && u < 0.4 ? "#d9a63a" : u < 0.1 ? "#c44a3c" : "#f2ead2");
    if (u > 0.1 && !(u > 0.3 && u < 0.4)) ell(g, hx + 0.6, hy + r * 0.45, r * 0.8, r * 0.5, "#c9b88e", { dens: 0.75 });
    if (u > 0.4) px(g, hx - 1, hy - r * 0.5, "#ffffff");
  }
  ell(g, -11.5, 5, 3.4, 4.6, "#c44a3c"); ell(g, -11.2, 5, 2.2, 3.4, "#4a1a18"); px(g, -12, 3, "#e8705c"); px(g, -12, 4, "#e8705c");
  g.restore();
}, true);
const landingWarn = (ctx, fx, g) => {
  const p = 1 - fx.ttl / fx.life, t = g.time;
  const pulse = 0.5 + 0.5 * Math.sin(t * 8), a = Math.min(1, fx.ttl / 400);
  art(ctx, fx.x, fx.y, () => {
    ctx.globalAlpha = a;
    stamp(ctx, warnSprite(Math.round(pulse * 5)));
    const dx = (fx.rx - fx.x) * PX, dy = (fx.ry - fx.y) * PX;
    for (let i = 0; i <= 6; i++) {
      if ((i + Math.floor(t * 7)) % 2) continue;
      const u = 0.16 + 0.84 * i / 6, x = Math.round(dx * u), y = Math.round(dy * u);
      rect(ctx, x - 2, y - 2, 4, 4, WARN_INK); rect(ctx, x - 1, y - 1, 2, 2, WARN_RED);
    }
    if (p < 0.98) stamp(ctx, hornSprite(), 0, -34 + Math.round(Math.sin(t * 8)));
  });
};

// ---- the longship: hull clipped at the waterline, a bow wave and a wake; holed, it snaps and goes under ----
const hull = (ctx, sp, dx, dy, tilt, wl, half) => {
  ctx.save();
  if (wl != null) { ctx.beginPath(); ctx.rect(-400, -400, 800, 400 + wl); ctx.clip(); }
  ctx.translate(dx, dy); ctx.rotate(tilt);
  if (half) { ctx.beginPath(); ctx.rect(half < 0 ? -400 : 0, -400, 400, 800); ctx.clip(); }
  ctx.drawImage(sp.cv, sp.x * PX, sp.y * PX, sp.w * PX, sp.h * PX);
  ctx.restore();
};
const WL = 5;     // the waterline, art pixels under the ship's centre
const longship = (ctx, x, y, face, t, { sail = true, oars = true, alpha = 1 } = {}) => {
  const sp = shipSprite(face, sail), f = face || 1, hl = 25 * PX;
  art(ctx, x, y, () => {
    ctx.globalAlpha *= alpha;
    if (oars) {   // the bow wave, and a wake trailing astern
      for (let n = 0; n < 9; n++) { const bxx = f * (hl - n * 3.2), off = 1 + n * 0.9; px(ctx, bxx, 3 + off, n < 4 ? FOAM : FOAM2); px(ctx, bxx, 5 - off * 0.3, FOAM2); }
      for (let n = 0; n < 4; n++) rect(ctx, f > 0 ? f * (hl + 2 + n) : f * (hl + 2 + n) - 1, 2 - n % 2, 2, 1, FOAM);
      const ph = Math.floor(t * 5) % 3;
      for (let n = 0; n < 26; n++) { const h = H(n, 2 + ph), xx = -f * (hl - 2 + n * 2.2); if (h < 0.75 - n * 0.02) px(ctx, xx, 6 + (h < 0.3 ? 1 : 0), h < 0.35 ? FOAM : FOAM2); }
    }
    hull(ctx, sp, 0, 0, 0, oars ? WL : null, 0);
    if (oars) {
      foamRow(ctx, 0, WL, hl, 0.35, Math.floor(t * 6) % 8);
      for (let i = -2; i <= 2; i++) {   // oars, beating
        const ph = Math.sin(t * 6 + i * 0.5), ox = (i * 9 * f + f) * PX, x1 = ox + f * (3 + ph * 4) * PX, y1 = (11 + ph * 1.5) * PX;
        line(ctx, ox, 5 * PX, x1, y1, HULL_DK);
        rect(ctx, x1 - 1, y1, 3, 2, "#2f8a84");
        px(ctx, x1 - 2, y1 + 2, FOAM); px(ctx, x1 + 2, y1 + 2, FOAM2);
      }
    }
  });
};

export const drawShip = (ctx, e, g) => {
  const t = g.time;
  longship(ctx, e.x, e.y, e.face, t);
  // health bar: what is left of the hull is what lands
  const k = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = "rgba(16,14,20,0.75)"; ctx.fillRect(S(e.x) - 16, S(e.y) - 38, 32, 4);
  ctx.fillStyle = k > 0.5 ? "#8ad06a" : k > 0.25 ? "#e0c050" : "#d85a48"; ctx.fillRect(S(e.x) - 15, S(e.y) - 37, Math.round(30 * k), 2);
  if (e.hitFlash > t * 1000) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(S(e.x) - 24, S(e.y) - 2, 48, 6); }
};

// ---- effects ----
// aground while the party jumps down (`hold` ms), then it backs off the shingle, comes about and rows
// out the way it came (`out` ms, to sx, sy past the edge), fading only if its way out ends on the board
const beached = (ctx, fx, g) => {
  const el = fx.life - fx.ttl, sail = fx.hp > 0.5;
  if (fx.hold == null) { longship(ctx, fx.x, fx.y, fx.face, g.time, { oars: false, sail, alpha: Math.min(1, fx.ttl / 1500) }); return; }
  if (el < fx.hold) { longship(ctx, fx.x, fx.y, fx.face, g.time, { oars: false, sail }); return; }
  const u = cl((el - fx.hold) / fx.out), BACK = 0.18;
  const dx = fx.sx - fx.x, dy = fx.sy - fx.y, d = Math.hypot(dx, dy) || 1;
  // backing oars: a short slow push off the beach, still facing in
  const back = Math.min(18, d * 0.1) * ez(Math.min(1, u / BACK));
  let k = 0, face = fx.face;
  if (u > BACK) { const v = (u - BACK) / (1 - BACK); k = v * v * 0.5 + v * 0.5; face = dx >= 0 ? 1 : -1; }   // about, and away
  const r = back + (d - back) * k;
  const onBoard = fx.sx > 0 && fx.sx < W && fx.sy > 0 && fx.sy < BH;
  longship(ctx, fx.x + dx / d * r, fx.y + dy / d * r, face, g.time, { sail, alpha: onBoard ? Math.min(1, (1 - u) / 0.25) : 1 });
};
const shipsink = (ctx, fx, g) => {
  const q = cl(1 - fx.ttl / fx.life), f = fx.face || 1, i = Math.floor(g.time * 6) % 8;
  art(ctx, fx.x, fx.y, () => {
    ctx.globalAlpha = cl(fx.ttl / 380);
    const brk = q > 0.12, s = ez(q), sail = q < 0.55;
    if (brk) {   // the keel snaps: two halves tilt apart and go down
      hull(ctx, shipSprite(f, sail), -2 * s, s * 30, -0.25 * s, WL, -1);
      hull(ctx, shipSprite(f, sail), 3 * s, s * 35, 0.35 * s, WL, 1);
      if (q < 0.45) for (let n = 0; n < 7; n++) { const u = q - 0.12, dx = (H(n, 1) - 0.5) * 30 * u * 2, dy = -u * 40 * (0.4 + H(n, 2)) + 90 * u * u; px(ctx, dx, 1 + dy, n % 2 ? "#8a6a48" : "#4a3426"); px(ctx, dx + 1, 1 + dy, "#6e5440"); }
    } else hull(ctx, shipSprite(f, true), 0, 2, 0, WL, 0);
    foamRow(ctx, 0, WL, 25 * PX * 0.9, 0.55, i);
    spanRing(ctx, 0, WL, 12 * PX * q + 5, 4.5 * PX * q + 2, FOAM, 1, 1 - q * 0.7);
    bubbles(ctx, 0, WL, 9, q, 34);
    // flotsam: planks, shields, a barrel, bobbing and drifting off
    const fl = [[-16, 3, "p"], [10, 5, "s"], [-30, 7, "p"], [22, 2, "b"], [-4, 9, "s"], [32, 8, "p"]], tt = g.time * 6.3;
    fl.forEach(([dx, dy, kind], n) => {
      if (q < 0.15 + n * 0.02) return;
      const u = q - 0.15, fx0 = dx * (1 + u * 0.7) + u * 8, fy = dy + Math.round(Math.sin(tt + n)) - Math.max(0, 6 - u * 30);
      if (kind === "p") { rect(ctx, fx0 - 6, fy, 13, 3, "#4a3426"); rect(ctx, fx0 - 6, fy, 12, 2, "#8a6a48"); rect(ctx, fx0 - 2, fy, 4, 1, "#a8865c"); }
      else if (kind === "s") { ring(ctx, fx0, fy, 8, 4, "#2a1c12", { th: 1 }); ell(ctx, fx0, fy, 7, 3, n % 2 ? "#2f8a84" : "#d49a30"); ell(ctx, fx0 - 1.5, fy - 1, 4, 1.4, n % 2 ? "#52b0a6" : "#f0c050"); rect(ctx, fx0 - 1, fy, 2, 1, "#c4c8d0"); }
      else { rect(ctx, fx0 - 5, fy - 7, 10, 10, "#2a1c12"); rect(ctx, fx0 - 4, fy - 6, 8, 8, "#6e5440"); rect(ctx, fx0 - 4, fy - 6, 8, 2, "#8a6a48"); rect(ctx, fx0 - 4, fy - 3, 8, 1, "#3a2a20"); rect(ctx, fx0 - 4, fy, 8, 1, "#3a2a20"); }
      foamRow(ctx, fx0, fy + 3, 8, 0.5, i + n);
    });
  });
};
const plank = (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.fillStyle = `rgba(122,86,52,${0.8 * (1 - p)})`;
  for (let i = 0; i <= 5; i++) ctx.fillRect(S(fx.x + (fx.tx - fx.x) * i / 5), S(fx.y + (fx.ty - fx.y) * i / 5), CELL * 2, CELL);
};
const frostcast = (ctx, fx) => {
  const a = fx.ttl / fx.life;
  art(ctx, 0, 0, () => {
    ctx.globalAlpha = a;
    let x0 = fx.x * PX, y0 = fx.y * PX;
    for (let i = 1; i <= 6; i++) {   // a jagged pixel line of frost
      const u = i / 6, x1 = (fx.x + (fx.tx - fx.x) * u) * PX + (i < 6 ? Math.sin(i * 2.7) * 8 : 0), y1 = (fx.y + (fx.ty - fx.y) * u) * PX + (i < 6 ? Math.cos(i * 1.9) * 8 : 0);
      line(ctx, x0, y0 + 1, x1, y1 + 1, "#5f98c6"); line(ctx, x0, y0, x1, y1, "#c8eafa");
      px(ctx, x1, y1 - 1, "#f2fcff"); x0 = x1; y0 = y1;
    }
  });
};
const thaw = (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  art(ctx, fx.x, fx.y, () => {
    ctx.globalAlpha = 1 - p;
    for (let i = 0; i < 12; i++) { const a = i * 0.52 + H(i, 1), r = (6 + 14 * p) * (0.6 + H(i, 2) * 0.7); rect(ctx, Math.cos(a) * r * PX * 0.9, Math.sin(a) * r * 0.55 * PX + 18 * p * p * PX, 2, 2, i % 3 ? "#bfe4f6" : "#f2fcff"); }
  });
};
export const ZONE_FX = { landingWarn, beached, shipsink, plank, frostcast, thaw };

// ---- the serpent surfaces: a boil of churned foam and popping rings, the body breaks the water, spray falls ----
const SEA2 = "#6a97ae";
const serpentFrame = (g, i) => {
  const gg = cl(i / 5);
  if (i < 12) {
    const grow = i < 5 ? gg : 1 - (i - 5) / 9 * 0.5, R = 28 + 18 * ez(cl(i / 6));
    ell(g, 0, 2, R, R * 0.42, "#2d4c64", { dens: 0.5, a: 0.8 }); ell(g, 0, 1, R * 0.8, R * 0.33, SEA2, { dens: 0.35, a: 0.8 });   // churned dark water under the foam, so it reads on pale seas
    for (let n = 0; n < 46; n++) {
      const a = H(n, 1) * TAU, r = Math.sqrt(H(n, 2)) * R * grow, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.4 + 1, ph = (grow * 3 + H(n, 3) * 3) % 1;
      if (ph > 0.85) continue;
      rect(g, x, y + 1, 2, 1, "#2d4c64", 0.7); rect(g, x, y, 2, 1, FOAM);
      if (H(n, 4) > 0.45) { rect(g, x, y - 1, 2, 1, FOAM2); px(g, x + 1, y + 1, FOAM2); px(g, x - 1, y, "#ffffff"); }
    }
    for (let n = 0; n < 6; n++) { const a = H(n, 9) * TAU, r = H(n, 8) * R * 0.7 * grow, ph = (grow * 2 + H(n, 7)) % 1; ring(g, Math.cos(a) * r, Math.sin(a) * r * 0.4, 3 + ph * 9, 1.4 + ph * 3.4, FOAM2, { th: 1, a: 1 - ph }); }
  }
  const rr = ez(cl((i - 3) / 9));
  if (i >= 3) { const ra = 1 - cl((i - 3) / 10), rx = Math.round(12 + 44 * rr), ry = Math.round(5 + 17 * rr); ring(g, 0, 2, rx, ry, "#2d4c64", { th: 1, a: ra * 0.8 }); ring(g, 0, 1, rx, ry, FOAM, { th: 1, a: ra }); }
  if (i >= 6) {   // spray, flung up and falling
    const q = (i - 6) / 7;
    for (let n = 0; n < 36; n++) {
      const x0 = 6 + (H(n, 1) - 0.4) * 30, u = Math.max(0, q - H(n, 2) * 0.2), v = 40 + H(n, 3) * 60, dy = -v * u * 1.6 + 120 * u * u;
      if (u > 0 && dy < 3) { const x = x0 + (H(n, 4) - 0.4) * 50 * u, col = n % 3 ? FOAM : MIST; rect(g, x, dy - 4, 2, 2, col); if (n % 2 === 0) px(g, x + 2, dy - 3, FOAM2); if (n % 5 === 0) px(g, x, dy - 2, "#ffffff"); }
    }
  }
  if (i >= 10) for (let n = 0; n < 6; n++) { const x = -2 + H(n, 4) * 16, u = ((i - 10) / 3 + H(n, 6)) % 1; rect(g, x, -24 + u * 26, 1, 2, MIST); }
};
const serpentRise = (ctx, fx) => {
  const p = cl(1 - fx.ttl / fx.life), i = Math.min(13, Math.floor(fx.dive ? 5 + p * 9 : p * 14));
  const s = bake("serp" + i, 170, 100, 85, 75, (g) => serpentFrame(g, i));
  art(ctx, fx.x, fx.y, () => { ctx.globalAlpha = cl(fx.ttl / 220); stamp(ctx, s); });
};

// ---- frozen halls: ice creeps up from the ground, facets, icicles, a frost sheet; then it cracks and melts ----
const ICE = ["#f2fcff", "#c8eafa", "#94cbe8", "#5f98c6"], ICE_INK = "#2c4c78";
const paintHallRaw = (c, t) => {
  const f = { ...t, x: 0, y: 0, units: [], iceLeft: 0 };
  switch (t.kind) {
    case "archer": return drawArcherTower(c, f, 0);
    case "wizard": return drawWizardSpire(c, f, 0);
    case "support": return drawSupportTower(c, f, 0);
    case "catapult": return drawCatapult(c, f, 0);
    case "spiker": return drawBladewheel(c, f, 0);
    case "goldworks": return drawGoldworks(c, f, 0);
    case "trapsmith": return drawTrapsmith(c, f, 0);
    case "assassin": return drawAssassin(c, f, 0);
    case "falconry": return drawFalconry(c, f, 0);
    case "sunforge": return drawSunforge(c, f, 0);
    case "band": return drawBandTower(c, f, 0);
    case "riverwatch": return drawRiverwatchHall(c, f, 0);
    case "gunpowder": return drawGunpowder(c, f, 0);
    default: return drawGarrison(c, f, 0);
  }
};
// a hall's silhouette (art pixels from its foot), baked once per kind / level / form
const MASKS = new Map();
const MW = 240, MH = 280, MAX = 120, MAY = 230;
const hallMask = (t) => {
  const key = `${t.kind}|${t.level}|${t.branch || ""}|${t.rank4 || ""}`;
  let r = MASKS.get(key);
  if (r) return r;
  const cv = mk(MW, MH), g = cv.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = false; g.translate(MAX, MAY); g.scale(PX, PX);
  try { paintHallRaw(g, t); } catch (err) { console.warn("frost mask", t.kind, err); g.fillStyle = "#000"; g.fillRect(-22, -56, 44, 60); }
  const d = g.getImageData(0, 0, MW, MH).data, m = new Uint8Array(MW * MH);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (d[(y * MW + x) * 4 + 3] > 90) { m[y * MW + x] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x0 > x1) { x0 = MAX - 22; x1 = MAX + 22; y0 = MAY - 56; y1 = MAY + 4; }
  // a round-cornered dilation by 3, as two passes (a horizontal run, then a vertical one, corners clipped)
  const rad = 3, Hh = new Uint8Array(MW * MH), D = new Uint8Array(MW * MH);
  const ya = Math.max(0, y0 - rad), yb = Math.min(MH - 1, y1 + rad), xa = Math.max(0, x0 - rad), xb = Math.min(MW - 1, x1 + rad);
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { let v = 0; for (let dx = -rad; dx <= rad; dx++) { const X = x + dx; if (X >= 0 && X < MW && m[y * MW + X]) { v = 1; break; } } Hh[y * MW + x] = v; }
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { let v = 0; for (let dy = -rad; dy <= rad; dy++) { const Y = y + dy; if (Y >= 0 && Y < MH && Hh[Y * MW + x]) { v = 1; break; } } D[y * MW + x] = v; }
  for (const [cx, cy] of [[xa, ya], [xb, ya], [xa, yb], [xb, yb]]) D[cy * MW + cx] = m[cy * MW + cx];
  r = { m, D, x0: x0 - MAX, x1: x1 - MAX, y0: y0 - MAY, y1: y1 - MAY };
  MASKS.set(key, r);
  return r;
};
// one shell frame: gi 1..8 how far it has grown up the hall, ti 0..8 how far it has thawed
const frostSprite = (t, gi, ti, ground) => {
  const M = hallMask(t), key = `${ground ? "icg" : "ice"}|${t.kind}|${t.level}|${t.branch || ""}|${t.rank4 || ""}|${gi}|${ti}`;
  const grow = gi / 8, th = ti / 8, melt = cl((th - 0.5) / 0.5), crk = cl(th / 0.5);
  const MG = 32, cx0 = M.x0 - MG, cy0 = M.y0 - 14, w = (M.x1 - M.x0) + MG * 2 + 1, h = (M.y1 - M.y0) + 14 + 22;
  return bake(key, w, h, -cx0, -cy0, (g) => {
    const inD = (X, Y) => (X + MAX < 0 || Y + MAY < 0 || X + MAX >= MW || Y + MAY >= MH ? 0 : M.D[(Y + MAY) * MW + X + MAX]);
    const inM = (X, Y) => (X + MAX < 0 || Y + MAY < 0 || X + MAX >= MW || Y + MAY >= MH ? 0 : M.m[(Y + MAY) * MW + X + MAX]);
    const top = M.y0 - 2, bot = M.y1 + 2, span = bot - top, mid = (M.x0 + M.x1) / 2;
    if (ground) {   // the frost sheet on the ground (thinner as it thaws) and the puddle it melts into: UNDER the figures
      const gs = ez(grow) * (1 - cl(th * 1.5)), r = ((M.x1 - M.x0) / 2 + 12) * gs;
      ell(g, mid, bot - 2, r, r * 0.28, "#d6eaf4", { dens: 0.55, a: 0.9 }); ell(g, mid, bot - 2, r * 0.7, r * 0.2, "#f2fcff", { dens: 0.33 }); ring(g, mid, bot - 2, r, r * 0.28, "#5f98c6", { th: 1, dens: 0.5 });
      if (melt > 0) { const pr = melt * (M.x1 - M.x0) * 0.55; ell(g, mid, bot - 1, pr, pr * 0.22, "#7fb4d6", { dens: 0.8, a: 0.9 }); ell(g, mid - 2, bot - 2, pr * 0.6, pr * 0.12, "#d6f0ff", { dens: 0.5 }); }
      return;
    }
    const V = new Uint8Array(w * h), tone = new Uint8Array(w * h), ALP = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x + cx0, Y = y + cy0; if (!inD(X, Y)) continue;
      const hh = (bot - Y) / span, noise = (H(X * 0.8, 3) - 0.5) * 0.16 + Math.sin(X * 0.35) * 0.04;
      if (hh > grow + noise) continue;
      if (hh > 1 - melt * 1.25 + (H(X, Y * 0.3) - 0.5) * 0.18) continue;
      const rim = !inM(X, Y), j = y * w + x, f = Math.floor((X * 0.8 + Y * 0.55 + 100) / 7) % 3;
      V[j] = 1; ALP[j] = rim ? 0.95 : [0.56, 0.7, 0.48][f] * (1 - melt * 0.45);
      let tn = [1, 2, 1][f] + (bay(X, Y) < 0.28 ? (f === 1 ? 1 : -1) : 0); if (H(X, Y) > 0.985) tn = 0;
      tone[j] = cl(tn, 0, 3);
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : V[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = y * w + x; if (!V[j]) continue;
      let tn = tone[j];
      if (!at(x - 1, y - 1) || !at(x, y - 1) && !at(x - 1, y)) tn = 0; else if (!at(x + 1, y + 1) || !at(x, y + 1) && !at(x + 1, y)) tn = 3;
      const edge = tn === 0 || tn === 3 ? !(at(x - 1, y - 1) && at(x + 1, y + 1)) : false;
      px(g, x + cx0, y + cy0, ICE[tn], edge ? 0.95 : ALP[j]);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x; if (V[j] || !(at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) continue; px(g, x + cx0, y + cy0, ICE_INK); }
    for (let x = 0; x < w; x++) for (let y = 0; y < h - 1; y++) {   // icicles off the lower edges
      if (!(V[y * w + x] && !V[(y + 1) * w + x]) || y + cy0 > bot - 8) continue;
      const hs = H(x + cx0, 7); if (hs < 0.5) continue;
      const L = Math.round((2 + Math.floor(hs * 6)) * (1 - melt * 1.1) * cl(grow * 1.4 - 0.2));
      for (let n = 1; n <= L; n++) { px(g, x + cx0, y + cy0 + n, n === L ? ICE[0] : ICE[1]); if (n > 1 && n < L) px(g, x + cx0 + 1, y + cy0 + n, ICE_INK, 0.5); }
      px(g, x + cx0, y + cy0 + L + 1, ICE_INK);
    }
    if (crk > 0) for (let n = 0; n < 4; n++) {   // cracks, each with a lit lip
      let cx = M.x0 + 6 + (n * (M.x1 - M.x0 - 10)) / 3 + H(n, 5) * 4, cy = top + 8 + H(n, 6) * span * 0.35; const len = Math.round(crk * span * 0.6);
      for (let s = 0; s < len; s++) { cx += (H(n, s) - 0.5) * 2.2; cy += 1; const jx = Math.round(cx), jy = Math.round(cy); if (V[(jy - cy0) * w + (jx - cx0)]) { px(g, jx, jy, "#4a78a6"); px(g, jx - 1, jy, ICE[0], 0.9); } }
    }
  });
};
// where a frozen hall stands in its growth / thaw
const frostPhase = (t, tms) => {
  const k = Math.min(1, t.iceLeft / (t.iceMax || 1));         // 1 fresh, 0 melted
  const grow = cl((tms - (t.iceAt || 0)) / Math.max(700, 0.22 * (t.iceMax || 4500))), th = cl((0.4 - k) / 0.4);
  return { k, grow, th, gi: Math.max(1, Math.ceil(grow * 8)), ti: Math.round(th * 8) };
};
// the frost sheet and the thaw puddle on the ground: draw.js calls this BEFORE the figures (beside the grounds)
export const drawFrostGround = (ctx, g) => {
  const tms = g.time * 1000;
  for (const t of g.towers) {
    if (!(t.iceLeft > 0)) continue;
    const { gi, ti } = frostPhase(t, tms);
    try { const sp = frostSprite(t, gi, ti, true); art(ctx, t.x, t.y, () => stamp(ctx, sp)); } catch (err) { if (!frostWarned) { frostWarned = true; console.error("frost ground failed", err); } }
  }
};
// warm one not-yet-cached hall form (mask + its first shell frame) per frame while a freezer walks, so the
// first freeze does not hitch
let warmI = 0;
const warmFrost = (g) => {
  if (!g.enemies.some((e) => e.freezeEvery && !e.dead)) return;
  for (let n = 0; n < g.towers.length; n++) {
    const t = g.towers[(warmI + n) % g.towers.length];
    const key = `${t.kind}|${t.level}|${t.branch || ""}|${t.rank4 || ""}`;
    if (MASKS.has(key)) continue;
    warmI = (warmI + n + 1) % g.towers.length;
    try { frostSprite(t, 1, 0); frostSprite(t, 1, 0, true); } catch (err) { /* the shell will report */ }
    return;
  }
};
export const drawFrostShells = (ctx, g) => {
  const tms = g.time * 1000;
  warmFrost(g);
  for (const t of g.towers) {
    if (!(t.iceLeft > 0)) continue;
    const { k, grow, th, gi, ti } = frostPhase(t, tms);
    ctx.save();
    try {
      const sp = frostSprite(t, gi, ti), M = hallMask(t), bot = M.y1 + 2;
      art(ctx, t.x, t.y, () => {
        stamp(ctx, sp);
        if (grow < 1) for (let n = 0; n < 6; n++) { const u = (g.time * 1.4 + H(n, 4)) % 1; px(ctx, M.x0 + H(n, 2) * (M.x1 - M.x0), bot - u * 30, "#f2fcff", 1 - u); }
        if (th > 0.3) for (let n = 0; n < 8; n++) { const u = (g.time * 1.3 + H(n, 3)) % 1; px(ctx, M.x0 + 4 + H(n, 2) * (M.x1 - M.x0 - 8), bot - 6 + u * 12, "#bfe4f6", 1 - u * 0.5); }
      });
    } catch (err) { if (!frostWarned) { frostWarned = true; console.error("frost shell failed", err); } }
    ctx.restore();
    // a small timer bar under it
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(t.x) - 12, S(t.y) + 10, 24, 3);
    ctx.fillStyle = "#bfe8ff"; ctx.fillRect(S(t.x) - 11, S(t.y) + 11, Math.round(22 * k), 1);
  }
  drawDowned(ctx, g, tms);
  drawDazed(ctx, g, tms);
  drawHolds(ctx, g, tms);
};
let frostWarned = false;


// ---- halls knocked out by the sea monsters (engine/serpent.js t.downLeft) ----
const COIL = "#3e5a5c", COIL_LT = "#6f9a94", COIL_DK = "#1e2e30", INK = "#2a1830";
const drawDowned = (ctx, g, tms) => {
  for (const t of g.towers) {
    if (!(t.downLeft > 0)) continue;
    const k = Math.min(1, t.downLeft / (t.downMax || 1));
    ctx.save();
    if (t.downKind === "coil") {
      // three loops of the serpent wrapped round the hall, squeezing
      const sq = Math.sin(tms / 140) * 1.5;
      for (let i = 0; i < 3; i++) {
        const y = t.y - 10 - i * 14, w = 24 - i * 3 + sq;
        ctx.fillStyle = COIL_DK; ctx.fillRect(S(t.x - w) - 2, S(y) - 2, w * 2 + 4, 10);
        ctx.fillStyle = COIL; ctx.fillRect(S(t.x - w), S(y), w * 2, 6);
        ctx.fillStyle = COIL_LT; ctx.fillRect(S(t.x - w), S(y), w * 2, CELL);
        for (let j = -w + 4; j < w - 2; j += 8) { ctx.fillStyle = COIL_DK; ctx.fillRect(S(t.x + j), S(y + 2), CELL, CELL); }
      }
    } else {
      // smashed: dust and splinters over a hall knocked askew
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.fillStyle = "rgba(120,100,80,0.55)"; ctx.fillRect(S(t.x - 22), S(t.y - 30), 44, 36);
      ctx.fillStyle = "#3a2a1a";
      for (let i = 0; i < 5; i++) ctx.fillRect(S(t.x - 18 + i * 9), S(t.y - 24 + (i * 7) % 18), 6, CELL);
      ctx.fillStyle = INK;
      ctx.fillRect(S(t.x - 6), S(t.y - 34), CELL, 14); ctx.fillRect(S(t.x - 4), S(t.y - 22), 8, CELL);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(t.x) - 12, S(t.y) + 10, 24, 3);
    ctx.fillStyle = t.downKind === "coil" ? "#8ad0b8" : "#e0b070"; ctx.fillRect(S(t.x) - 11, S(t.y) + 11, Math.round(22 * k), 1);
  }
};
// soldiers dazed by a frost giant's stomp: stars wheeling over their heads
const drawDazed = (ctx, g, tms) => {
  const star = (x, y) => { ctx.fillStyle = "#f8e890"; ctx.fillRect(S(x), S(y), CELL, CELL); };
  const one = (u) => {
    if (!(u.dazedUntil > tms) || u.state === "dead") return;
    for (let i = 0; i < 3; i++) { const a = tms / 220 + i * 2.1; star(u.x + Math.cos(a) * 7, u.y - 26 + Math.sin(a) * 2); }
  };
  for (const t of g.towers) if (t.units) for (const u of t.units) one(u);
  for (const b of g.bands || []) for (const u of b.units) one(u);
};

// ---- the sea monsters (engine/serpent.js) ----
const SERP = "#36575a", SERP_LT = "#6a9690", SERP_DK = "#18282a", BELLY = "#b8c8a0", EYE = "#f0d050";
const KRAK = "#6a2e4a", KRAK_LT = "#9a5070", KRAK_DK = "#3a1428", SUCK = "#e0b8c0";
const ripple = (ctx, x, y, r, a) => {
  ctx.strokeStyle = `rgba(226,240,246,${a})`; ctx.lineWidth = CELL;
  ctx.beginPath(); ctx.ellipse(S(x), S(y), Math.max(1, r), Math.max(1, r * 0.45), 0, 0, Math.PI * 2); ctx.stroke();
};
const bar = (ctx, x, y, k, w = 28, col) => {
  ctx.fillStyle = "rgba(16,14,20,0.75)"; ctx.fillRect(S(x) - w / 2 - 1, S(y), w + 2, 4);
  ctx.fillStyle = col || (k > 0.5 ? "#8ad06a" : k > 0.25 ? "#e0c050" : "#d85a48"); ctx.fillRect(S(x) - w / 2, S(y) + 1, Math.round(w * Math.max(0, k)), 2);
};

const drawSerpent = (ctx, e, g) => {
  const t = g.time, tms = t * 1000, sp = e.serp;
  if (!sp) return;
  const f = e.face || 1;
  if (e.submerged) {
    // a long dark shadow under the water, and a V of a wake behind its head
    ctx.save();
    ctx.translate(S(e.x), S(e.y));
    ctx.fillStyle = "rgba(10,24,30,0.35)";
    for (let i = 0; i < 6; i++) ctx.fillRect(S(-f * i * 6) - 4, S(Math.sin(t * 5 + i) * 2) - 2, 8, 4);
    ctx.fillStyle = "rgba(226,240,246,0.55)";
    for (let i = 1; i <= 4; i++) { ctx.fillRect(S(-f * i * 6), S(-i * 2.2) , 4, CELL); ctx.fillRect(S(-f * i * 6), S(i * 2.2), 4, CELL); }
    ctx.restore();
    if (sp.phase === "rise") { const p = Math.min(1, (tms - sp.t) / 500); ripple(ctx, e.x, e.y, 6 + 12 * p, 0.8 * (1 - p * 0.5)); }
    return;
  }
  // surfaced: arches of coil breaking the water behind a raised S of a neck
  const dive = sp.phase === "dive" ? Math.min(1, (tms - sp.t) / 450) : 0;
  const lift = 1 - dive;
  const blob = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(S(x), S(y), r, 0, Math.PI * 2); ctx.fill(); };
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  // two arches of its back, each a row of scales over the water
  for (let i = 1; i <= 2; i++) {
    const cx = -f * (i * 16 + 2), hh = (11 - i * 3) * lift;
    for (let k = 0; k <= 6; k++) {
      const u = k / 6, x = cx + (u - 0.5) * 14, y = -Math.sin(u * Math.PI) * hh;
      blob(x, y, 4, SERP_DK);
    }
    for (let k = 0; k <= 6; k++) {
      const u = k / 6, x = cx + (u - 0.5) * 14, y = -Math.sin(u * Math.PI) * hh;
      blob(x, y, 2.6, k % 2 ? SERP : SERP_LT);
    }
    ctx.fillStyle = "rgba(226,240,246,0.6)"; ctx.fillRect(S(cx) - 10, 2, 6, CELL); ctx.fillRect(S(cx) + 4, 2, 6, CELL);
  }
  // the neck: an S-curve of round segments, the head lunging on a strike
  const lunge = e.atkAnim > 0 ? Math.sin((1 - e.atkAnim / 420) * Math.PI) : 0;
  const nh = 30 * lift, pts = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    pts.push([f * (Math.sin(u * Math.PI * 1.4) * 4 + u * u * (4 + lunge * 12)), -u * nh * (1 - lunge * 0.25)]);
  }
  for (const [x, y] of pts) blob(x, y, 4.5, SERP_DK);
  pts.forEach(([x, y], k) => { blob(x, y, 3.2, SERP); if (k % 2 === 0) blob(x + f * 1.5, y, 1.4, BELLY); });
  const [hx, hy] = pts[8];
  // the head: a wedge with a brow ridge, a yellow eye, fangs when it bites
  blob(hx + f * 3, hy, 6, SERP_DK);
  blob(hx + f * 3, hy, 4.6, SERP);
  ctx.fillStyle = SERP_DK; ctx.fillRect(S(hx + f * 6) - 3, S(hy) - 2, 6, 4);
  ctx.fillStyle = SERP; ctx.fillRect(S(hx + f * 6) - 2, S(hy) - 1, 6, 2);
  ctx.fillStyle = SERP_LT; ctx.fillRect(S(hx + f * 1) - 2, S(hy) - 5, 6, CELL);
  ctx.fillStyle = EYE; ctx.fillRect(S(hx + f * 4), S(hy) - 3, CELL, CELL);
  if (lunge > 0.2) { ctx.fillStyle = "#f4f0e0"; ctx.fillRect(S(hx + f * 7), S(hy) + 1, CELL, 3); ctx.fillRect(S(hx + f * 4), S(hy) + 1, CELL, 3); }
  // white water round the neck
  ctx.fillStyle = "rgba(226,240,246,0.75)"; ctx.fillRect(-8, 2, 16, CELL); ctx.fillRect(-5, 4, 10, CELL);
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(S(e.x) - 8, S(e.y - nh - 8), 16, nh + 10); }
  bar(ctx, e.x, e.y - 46, e.hp / e.maxHp);
};

const drawKraken = (ctx, e, g) => {
  const t = g.time, tms = t * 1000, K = e.kr;
  if (!K) return;
  const age = tms - K.t0;
  const up = Math.min(1, age / 1200);
  const bob = Math.sin(t * 1.6) * 2;
  ctx.save();
  ctx.translate(S(e.x), S(e.y + bob));
  // the dome of its mantle above the black water
  const w = 34, h = 18 * up;
  ctx.fillStyle = KRAK_DK; ctx.beginPath(); ctx.ellipse(0, 0, w + 2, h + 2, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = KRAK; ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = KRAK_LT; for (let i = -3; i <= 3; i++) ctx.fillRect(S(i * 8) - 2, S(-h * 0.7 + Math.abs(i) * 2), 4, CELL);
  // two great eyes just above the water
  if (up > 0.6) for (const sx of [-1, 1]) {
    ctx.fillStyle = "#f0e070"; ctx.fillRect(S(sx * 14) - 3, -6, 6, 4);
    ctx.fillStyle = "#1a0a10"; ctx.fillRect(S(sx * 14) - 1, -6, CELL, 4);
  }
  // the water churning round it
  ctx.fillStyle = "rgba(226,240,246,0.65)";
  for (let i = -5; i <= 5; i++) ctx.fillRect(S(i * 7 + Math.sin(t * 3 + i) * 2), 0, 5, CELL);
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(S(e.x) - w, S(e.y) - h, w * 2, h); }
  bar(ctx, e.x, e.y - 30, e.hp / e.maxHp, 44);
  // the tide it will go out on: a thin bar of what is left of its stay
  const stay = K.stay || 75000;
  bar(ctx, e.x, e.y - 25, 1 - age / stay, 44, "#7ab8e0");
};

const drawArm = (ctx, e, g) => {
  const t = g.time, tms = t * 1000;
  const rise = e.riseAt !== undefined ? Math.min(1, (tms - e.riseAt) / (e.riseMs || 700)) : 1;
  const f = e.face || 1;
  const strike = e.atkAnim > 0 ? Math.sin((1 - e.atkAnim / 500) * Math.PI) : 0;
  const H2 = 36 * rise, n = 9;
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  // a splash ring where it breaks through
  ctx.fillStyle = "rgba(226,240,246,0.7)"; ctx.fillRect(-10, 0, 20, CELL); ctx.fillRect(-6, 2, 12, CELL);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const sway = Math.sin(t * 3 + u * 3 + e.id) * 3 * u + f * strike * 14 * u * u;
    const x = sway, y = -u * H2, wdt = Math.max(2, 8 - u * 6);
    ctx.fillStyle = KRAK_DK; ctx.fillRect(S(x) - wdt / 2 - 1, S(y) - 3, wdt + 2, 6);
    ctx.fillStyle = KRAK; ctx.fillRect(S(x) - wdt / 2, S(y) - 2, wdt, 5);
    if (i % 2 === 0 && wdt > 3) { ctx.fillStyle = SUCK; ctx.fillRect(S(x + f * (wdt / 2 - 2)), S(y), CELL, CELL); }
  }
  ctx.restore();
  if (e.hitFlash > tms) { ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(S(e.x) - 6, S(e.y - H2), 12, H2); }
  if (rise >= 1) bar(ctx, e.x, e.y - 44, e.hp / e.maxHp, 18);
};

// With the beast artist's rig (rigs-rimebeasts.js: seaserpent / kraken /
// krakenarm, anchored at the waterline) the monster is drawn from its sheets,
// picked off the engine's state; without one, the placeholder painters above.
const q4 = (k) => Math.min(3, Math.max(0, Math.floor(k * 4)));
const seaFrame = (e, g) => {
  const tms = g.time * 1000, cyc = Math.floor(g.time * 6 + e.id) % 4;
  const fight = e.atkAnim > 0 ? q4(1 - e.atkAnim / 500) : null;
  if (e.sea === "serpent") {
    const sp = e.serp;
    if (!sp) return null;
    if (sp.phase === "swim") return ["walk", `sub.${cyc}`];
    if (sp.phase === "rise") return ["walk", `surface.${q4((tms - sp.t) / ENEMY_MS.rise)}`];
    if (sp.phase === "dive") return ["walk", `dive.${q4((tms - sp.t) / ENEMY_MS.dive)}`];
    return fight != null ? ["fight", fight] : ["walk", cyc];
  }
  if (e.sea === "kraken") {
    const age = tms - (e.kr?.t0 ?? tms);
    if (age < 1200) return ["walk", `rise.${q4(age / 1200)}`];
    return ["walk", cyc];
  }
  const rise = e.riseAt !== undefined ? (tms - e.riseAt) / (e.riseMs || 700) : 1;
  if (rise < 1) return ["walk", `rise.${q4(rise)}`];
  return fight != null ? ["fight", fight] : ["walk", cyc];
};
const ENEMY_MS = { rise: 500, dive: 450 };   // (the serpent's rise / dive, enemies.js)
const seaRig = (ctx, e, g) => {
  const fr = seaFrame(e, g);
  if (!fr) return false;
  const tms = g.time * 1000;
  drawRig(ctx, e.type, e.x, e.y, e.face || 1, fr[0], fr[1]);
  if (e.hitFlash > tms && !e.submerged) drawRig(ctx, e.type, e.x, e.y, e.face || 1, fr[0], fr[1], "white", 0.6);
  return true;
};
// the kraken under the water as it roams (engine/serpent.js: e.submerged
// while it swims): its dim shape seen through the sea, a bulge and a vee of
// wake (rigs-rimebeasts.js, the kraken rig's "deep" frames)
const drawKrakenDeep = (ctx, e, g) => {
  if (RIGS.kraken) { drawKrakenDeepRig(ctx, e, g); return; }
  const t = g.time;
  ctx.save();
  ctx.translate(S(e.x), S(e.y));
  ctx.fillStyle = "rgba(20,8,18,0.32)";
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(226,240,246,0.5)";
  for (let i = -3; i <= 3; i++) ctx.fillRect(S(i * 9 + Math.sin(t * 2 + i) * 3), S(-12 + Math.abs(i) * 2), 5, CELL);
  ctx.restore();
};
export const drawSea = (ctx, e, g) => {
  if (!e.seaInit) return;
  if (e.sea === "kraken" && e.kr && e.kr.phase === "swim") { drawKrakenDeep(ctx, e, g); return; }
  if (RIGS[e.type] && (drawSeaRig(ctx, e, g) || seaRig(ctx, e, g))) {
    // the bars stay (what is left of it; the kraken's tide)
    if (e.sea === "kraken" && e.kr) {
      bar(ctx, e.x, e.y - 46, e.hp / e.maxHp, 44);

    } else if (!e.submerged && !(e.riseAt !== undefined && g.time * 1000 - e.riseAt < e.riseMs)) bar(ctx, e.x, e.y - 50, e.hp / e.maxHp, e.sea === "arm" ? 18 : 28);
    return;
  }
  if (e.sea === "serpent") drawSerpent(ctx, e, g);
  else if (e.sea === "kraken") drawKraken(ctx, e, g);
  else if (e.sea === "arm") drawArm(ctx, e, g);
};

// their effects
const ringFx = (col, r0, r1) => {
  const m = col.match(/rgba\((\d+),(\d+),(\d+)/), rgb = `rgb(${m[1]},${m[2]},${m[3]})`;
  return (ctx, fx) => {
    const p = cl(1 - fx.ttl / fx.life), r = (r0 + (r1 - r0) * p) * PX;
    art(ctx, fx.x, fx.y, () => spanRing(ctx, 0, 0, Math.round(r), Math.round(r * 0.45), rgb, 2, 1 - p));
  };
};
const lineFx = (col) => (ctx, fx) => {
  const p = 1 - fx.ttl / fx.life;
  ctx.fillStyle = col.replace("A", (1 - p).toFixed(2));
  for (let i = 0; i <= 8; i++) ctx.fillRect(S(fx.x + (fx.tx - fx.x) * i / 8) - 1, S(fx.y - 18 + (fx.ty - fx.y + 18) * i / 8) - 1, 4, 4);
};
Object.assign(ZONE_FX, {
  serpentRise,
  serpentGone: ringFx("rgba(226,240,246,A)", 8, 30),
  serpentBite: lineFx("rgba(240,240,220,A)"),
  krakenRise: ringFx("rgba(226,240,246,A)", 20, 70),
  krakenSink: (ctx, fx) => { ringFx("rgba(226,240,246,A)", 30, 80)(ctx, fx); if (RIGS.kraken) krakenSinkFx(ctx, fx); },
  armRise: ringFx("rgba(200,180,160,A)", 4, 18),
  armSink: (ctx, fx) => { ringFx("rgba(226,240,246,A)", 4, 16)(ctx, fx); if (RIGS.krakenarm) armSinkFx(ctx, fx); },
  armGrab: lineFx("rgba(154,80,112,A)"),
  armSmash: (ctx, fx) => { ringFx("rgba(180,140,100,A)", 6, 28)(ctx, { ...fx, x: fx.tx, y: fx.ty }); },
  armSweep: lineFx("rgba(106,46,74,A)"),
  armCut: (ctx, fx) => {
    const p = 1 - fx.ttl / fx.life;
    ctx.fillStyle = `rgba(30,16,30,${0.8 * (1 - p)})`;
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.fillRect(S(fx.x + Math.cos(a) * 14 * p), S(fx.y - 10 + Math.sin(a) * 8 * p), 4, 4); }
  },
  stomp: (ctx, fx) => { ringFx("rgba(200,232,255,A)", 6, fx.r || 50)(ctx, fx); },
});

// ---- what a sea monster holds (engine/serpent.js m.hold) ----
// The arm (or the serpent's neck) coiled round the held creature, drawn over
// the crowd: rigs-rimebeasts.js drawSeaHold (the arm's own rig steps aside
// while it holds; the serpent's shows only its humps).
const drawHolds = (ctx, g, tms) => {
  for (const m of g.enemies) {
    if (m.dead || !m.hold || !m.sea) continue;
    if (!(m.hold.u || m.hold.e)) continue;
    drawSeaHold(ctx, m, g);
  }
};
