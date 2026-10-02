// ============ CAPTAIN HALE'S EFFECTS ON THE BOARD ============
// (see ./index.js for the hooks; engine/heroes/hale.js keeps the state.)
//
//   u.brace      Brace Pikes: a hedge of eight pikes grounded round his feet,
//                butts in, steel points out, the near half drawn over him and
//                the far half under; a glint runs from point to point. They
//                drive out as he sets them and draw back in at the end.
//   g.haleFx     an impaling: a steel star where the point went in, splinters
//                flying off it (bigger and with a jolt on a rider).
//   u.sweep      his halberd's sweep through every foe he holds: a pale arc
//                of steel before him for a moment after the blow.
//   g.haleLevy   Sound the Levy: the horn's call rings off him (arcs of gold
//                lifting from his head), and at the spot a crown-blue pennant
//                is planted while the heart lasts, with a gold ring run out to
//                the reach of it and left lying as a dotted ring.
//
// Pixel art as in rings.js: rows of art pixels snapped to the grid, alpha in a
// few hard steps, no gradients.
import { PX, hash } from "../paint.js";
import { ringPx } from "../fx.js";

const INK = "#241a26", STEEL = ["#fff3d2", "#e0e4ea", "#c4c8d0", "#8a90a0"], OAK = ["#a07a52", "#7a5334"];
const GOLD = ["#fff3d2", "#f0d885", "#d8b34a", "#a8782e"], BLUE = ["#5a7aa8", "#3a5474", "#2a3c58"];
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;

// a line of art pixels `th` units thick, one path, one fill
const pxLine = (ctx, x0, y0, x1, y1, th, col) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * PX));
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.rect(sn(x0 + (x1 - x0) * t - th / 2), sn(y0 + (y1 - y0) * t - th / 2), th, th);
  }
  ctx.fill();
};
// a four-point twinkle: arms `s` long, one art pixel thick, a cream core
const star = (ctx, x, y, s, col, core) => {
  const X = sn(x), Y = sn(y), p = 1 / PX;
  ctx.fillStyle = col;
  ctx.fillRect(X - p / 2, Y - s, p, s * 2);
  ctx.fillRect(X - s, Y - p / 2, s * 2, p);
  if (core) { ctx.fillStyle = core; ctx.fillRect(X - p, Y - p, p * 2, p * 2); }
};

const hale = (g) => g.bands?.find((b) => b.kind === "hero" && b.hero === "hale" && !b.leaving) || null;

// ---- Brace Pikes ----
const PIKES = 8;
// how far the pikes stand out: they drive out as he sets them (180 ms) and
// draw back in over the last 300
const braceOut = (br, tms) => Math.min(easeOut((tms - br.t0) / 180), clamp01((br.until - tms) / 300));
// each pike: butt near his feet, point out on the ground ellipse; `near`
// picks the half south of him (drawn over him), else the far half
const drawPikes = (ctx, u, br, tms, near) => {
  const k = braceOut(br, tms);
  if (k <= 0) return;
  const cx = u.x, cy = u.y + 8;
  const turn = (u.id % 7) * 0.13 + Math.PI / PIKES;
  const pikes = [];
  for (let i = 0; i < PIKES; i++) {
    const an = turn + (i / PIKES) * TAU, s = Math.sin(an);
    if ((s > 0) !== near) continue;
    const c = Math.cos(an);
    // grounded butt, the point raised a little and leaning out
    const bx = cx + c * 6, by = cy + s * 2.6;
    const L = 9 + 8 * k;
    const px = cx + c * (6 + L), py = cy + s * (2.6 + L * 0.42) - 3 * k;
    pikes.push([bx, by, px, py, c, s, i]);
  }
  if (!pikes.length) return;
  ctx.save();
  ctx.globalAlpha *= stepA(k * 1.5, 3);
  // ink first (a 2-pixel outline), then the ash shafts, then the steel heads
  for (const [bx, by, px, py] of pikes) pxLine(ctx, bx, by, px, py, 2, INK);
  for (const [bx, by, px, py, c, s] of pikes) {
    const hx = px - c * 3.2, hy = py - s * 1.3 + 1.2;
    pxLine(ctx, bx, by, hx, hy, 1, OAK[1]);
    pxLine(ctx, px - c * 3.6 - 0.5 / PX, py - s * 1.5 + 1.4, px, py, 1.5, INK);
    pxLine(ctx, hx, hy, px, py, 1, STEEL[2]);
    ctx.fillStyle = STEEL[0];
    ctx.fillRect(sn(px - 0.5), sn(py - 0.5), 1 / PX, 1 / PX);
  }
  // the glint runs round the points, one pike at a time
  const at = Math.floor((tms - br.t0) / 130) % PIKES;
  for (const [, , px, py, , , i] of pikes) if (i === at) star(ctx, px, py - 0.5, 2.5, STEEL[1], STEEL[0]);
  ctx.restore();
};
// as he sets them: a ring of steel sparks driven out to the points
const braceSet = (ctx, u, br, tms) => {
  const age = (tms - br.t0) / Math.max(1, (br.k || 1));
  if (age > 320) return;
  const p = age / 320, r = 10 + 14 * easeOut(p);
  ctx.save();
  ctx.globalAlpha *= stepA(1 - p, 3);
  ringPx(ctx, u.x, u.y + 8, r, r * 0.45, 1, STEEL[1]);
  ctx.restore();
};

// ---- his sweep ----
const drawSweep = (ctx, u, tms) => {
  const sw = u.sweep;
  if (!sw) return;
  const age = tms - sw.at;
  if (age < 0 || age > 240) return;
  const p = age / 240, f = u.face || 1;
  const cx = u.x + f * 4, cy = u.y - 2, r = 15 + 4 * p;
  // a crescent before him, from high behind to low in front
  ctx.save();
  ctx.globalAlpha *= stepA(1 - p, 3);
  const a0 = -2.1, a1 = 0.9, n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, an = a0 + (a1 - a0) * t;
    if (t > 0.25 + p * 1.1) break;                 // the edge runs ahead of the fade
    const x = cx + f * Math.cos(an) * r, y = cy + Math.sin(an) * r * 0.75;
    ctx.fillStyle = t > 0.6 ? STEEL[0] : STEEL[2];
    ctx.fillRect(sn(x - 1), sn(y - 1), 2, 1.5);
  }
  ctx.restore();
};

// ---- an impaling ----
const drawImpale = (ctx, f, tms) => {
  const life = f.life || 420, p = (tms - f.t0) / life;
  if (p < 0 || p >= 1) return;
  const s = f.big ? 6 : 4, x = f.x, y = f.y - 7;
  ctx.save();
  ctx.globalAlpha *= stepA(1 - p, 3);
  star(ctx, x, y, s * (0.6 + 0.6 * easeOut(p * 2)), STEEL[1], STEEL[0]);
  // splinters thrown off the point, away from him
  const away = Math.atan2(f.y - f.hy, f.x - f.hx);
  const n = f.big ? 6 : 4, sd = (Math.floor(f.x) * 7 + Math.floor(f.t0)) % 997;
  ctx.fillStyle = f.big ? OAK[0] : STEEL[2];
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const an = away + (hash(sd, i) - 0.5) * 1.8, d = (4 + 10 * hash(sd, i + 9)) * easeOut(p * 1.4);
    ctx.rect(sn(x + Math.cos(an) * d), sn(y + Math.sin(an) * d * 0.7 + p * p * 6), 1, 1);
  }
  ctx.fill();
  ctx.restore();
};

// ---- Sound the Levy ----
// the horn's call: three arcs of gold lift off his head and widen, each a
// beat after the last
const drawHorn = (ctx, lv, tms) => {
  const age = (tms - lv.t0) / lv.k;
  if (age > 900) return;
  const hx = lv.hx, hy = lv.hy - 20;
  ctx.save();
  const a0 = ctx.globalAlpha;
  for (let j = 0; j < 3; j++) {
    const q = (age - j * 150) / 600;
    if (q < 0 || q > 1) continue;
    const r = 4 + 16 * easeOut(q);
    ctx.globalAlpha = a0 * stepA(1 - q, 3);
    ctx.fillStyle = j ? GOLD[2] : GOLD[1];
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const an = -Math.PI * 0.85 + (i / 10) * Math.PI * 0.7;   // the upper arc only
      ctx.rect(sn(hx + Math.cos(an) * r), sn(hy + Math.sin(an) * r * 0.8 - q * 4), 1, 1);
    }
    ctx.fill();
  }
  ctx.restore();
};
const levyFade = (lv, tms) => stepA(Math.min((tms - lv.t0) / (160 * lv.k), (lv.until - tms) / 600, 1));
// the ground: a gold ring run out to the reach of the heart, then a dotted
// ring that stays while it lasts
const levyGround = (ctx, lv, tms) => {
  const A = levyFade(lv, tms);
  if (A <= 0) return;
  const q = (tms - lv.t0) / (420 * lv.k), r = lv.r * easeOut(q);
  ctx.save();
  ctx.globalAlpha *= A;
  if (q < 1) {
    ctx.save();
    ctx.globalAlpha *= stepA(1.3 - q, 3);
    ringPx(ctx, lv.x, lv.y, r, r * 0.55, 2, GOLD[2]);
    ringPx(ctx, lv.x, lv.y, r - 2, (r - 2) * 0.55, 1, GOLD[0]);
    ctx.restore();
  }
  ctx.globalAlpha *= 0.55;
  const n = Math.max(12, Math.round((TAU * r) / 7)), turn = tms / 5000;
  ctx.fillStyle = GOLD[2];
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + turn;
    ctx.rect(sn(lv.x + Math.cos(an) * r - 1), sn(lv.y + Math.sin(an) * r * 0.55 - 0.5), 2, 1);
  }
  ctx.fill();
  ctx.restore();
};
// the banner: an ash pole with a gilt finial and a crown-blue swallowtail
// pennant, a gold band across it; it springs up as the horn sounds and flaps
const levyBanner = (ctx, lv, tms) => {
  const A = levyFade(lv, tms);
  if (A <= 0) return;
  const up = easeOut((tms - lv.t0) / (200 * lv.k)), H = 30 * up;
  const x = lv.x, base = lv.y + 2, top = base - H;
  const flap = Math.floor(tms / 180) % 2;
  ctx.save();
  ctx.globalAlpha *= A;
  // a contact shadow down-right
  ctx.fillStyle = "rgba(36,26,38,0.25)";
  ctx.fillRect(sn(x - 1), sn(base), 5, 1.5);
  // the pole: ink then oak
  ctx.fillStyle = INK; ctx.fillRect(sn(x - 1), sn(top - 1), 2, H + 1.5);
  ctx.fillStyle = OAK[0]; ctx.fillRect(sn(x - 0.5), sn(top), 1, H);
  if (H > 12) {
    // the pennant hangs off the pole toward +x (mirrors cleanly: no lettering)
    const py = top + 2, w = 13, h = 8, dip = flap ? 1 : 0;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.rect(sn(x), sn(py - 1), w + 1, h + 2);
    ctx.fill();
    ctx.fillStyle = BLUE[1];
    ctx.fillRect(sn(x + 0.5), sn(py), w, h);
    // the swallowtail notch, the tails dipping as it flaps
    ctx.fillStyle = INK;
    ctx.fillRect(sn(x + w - 3), sn(py + h / 2 - 1.5), 4, 3);
    ctx.fillStyle = BLUE[0];
    ctx.fillRect(sn(x + 0.5), sn(py), w, 1.5);                 // lit from above
    ctx.fillStyle = BLUE[2];
    ctx.fillRect(sn(x + 0.5), sn(py + h - 1.5 + dip), w - 4, 1.5); // the shadowed hem
    ctx.fillStyle = GOLD[2];
    ctx.fillRect(sn(x + 3), sn(py), 2, h);                     // a gold band at the hoist
    ctx.fillStyle = GOLD[1];
    ctx.fillRect(sn(x + 3), sn(py), 1, h);
  }
  // the finial: a gilt point, with a flash as it is planted
  ctx.fillStyle = INK; ctx.fillRect(sn(x - 1.5), sn(top - 3), 3, 3);
  ctx.fillStyle = GOLD[1]; ctx.fillRect(sn(x - 1), sn(top - 2.5), 2, 2);
  const fl = (tms - lv.t0) / (360 * lv.k);
  if (fl < 1) {
    ctx.globalAlpha *= stepA(1 - fl, 3);
    star(ctx, x, top - 2, 4 + 5 * easeOut(fl), GOLD[0], GOLD[0]);
  }
  ctx.restore();
};

export default {
  // braced and between blows, he stands in his guard, halberd levelled
  pose(b, u, time) {
    const tms = time * 1000;
    if (!u.brace || u.brace.until <= tms || u.state === "moving") return null;
    if (u.state === "fighting" && (u.swing > 0 || u.atkCd < (b.st?.rate || 950) * 0.3)) return null;
    return { sheet: "fight", frame: 0 };
  },

  under(ctx, g) {
    const tms = g.time * 1000;
    if (g.haleLevy) for (const lv of g.haleLevy) levyGround(ctx, lv, tms);
    const b = hale(g), u = b?.units[0];
    if (u && u.state !== "dead" && u.brace && u.brace.until > tms) drawPikes(ctx, u, u.brace, tms, false);
  },

  fx(ctx, g) {
    const tms = g.time * 1000;
    const b = hale(g), u = b?.units[0];
    if (u && u.state !== "dead") {
      if (u.brace && u.brace.until > tms) { drawPikes(ctx, u, u.brace, tms, true); braceSet(ctx, u, u.brace, tms); }
      drawSweep(ctx, u, tms);
    }
    if (g.haleFx) for (const f of g.haleFx) if (f.kind === "impale") drawImpale(ctx, f, tms);
    if (g.haleLevy) for (const lv of g.haleLevy) { levyBanner(ctx, lv, tms); drawHorn(ctx, lv, tms); }
  },
};
