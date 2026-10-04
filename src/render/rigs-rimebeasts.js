// ============ RIGS: THE RIME CLANS' BEASTS AND MONSTERS (zone IV) ============
// Bespoke bodies for the Rimewater's beasts (art/ZONES-4-5.md). Entries in
// RIMEBEAST_RIGS join RIGS (same shape: { kind, box: { hw, up, down }, p,
// fly?, fightN? }); RIMEBEAST_PAINTERS maps each `kind` to its painter
// (ctx, p) — p.pose ("walk" | "fight") and p.frame, feet (or the waterline)
// at 0,0, facing +x. Frames are baked once and inked by rigs.js.
//
//   rimerider   a clan raider (spangenhelm, braided beard, fur mantle, round
//               shield on his back, a bearded axe) on a great white frost
//               wolf at the gallop. Fight (4): guard, wind-up, the chop,
//               follow-through, the wolf braced then lunging under him.
//   rimewolf    the same wolf alone (the rider's deathSkin, if the engine
//               unseats him as it does the boar rider)
//   frostgiant  the bruiser: blue-grey hide, a frost-white beard and mane, a
//               fur mantle and kilt, a whale's jawbone crusted with ice for a
//               club, trailed at the walk. Fight (4) is the STOMP: guard,
//               the knee and the bone raised, the foot and the bone brought
//               down (ice bursts from the ground), follow-through.
//   icedrake    a lesser drake off the ice cliffs: pale blue-white scales,
//               an icicle crest and spines, finger-boned wings, four-beat
//               flap. Fight (4) is the frost breath: rear, draw in (the
//               throat glows cold), breathe, the breath trailing off.
//   rimejarl    the boss's war-mammoth: a shaggy umber coat rimed white,
//               iron-banded tusks, a teal saddle cloth and a plank howdah
//               hung with shields; the Jarl sits in it. Walk: the lateral
//               amble. Fight (4) is the trample: tusks levelled, rear up and
//               trumpet, forefeet down (ice bursts), the tusk sweep.
//   seaserpent  a long sea-green serpent with an ice-blue frill, drawn at
//               the waterline (the anchor is the water's surface): above it
//               solid, below it a dim refracted body, foam where it cuts the
//               surface. Walk (4): swimming surfaced, humps rolling back.
//               Fight (4): reared guard, the hiss (wind-up), the strike,
//               follow-through. Extra frames on the WALK sheet (frame given
//               as a string): "sub.0-3" submerged (a shadow and fin tips),
//               "surface.0-3" coming up, "dive.0-3" going down.
//   kraken      the sea-beast's head and mantle rising offshore, eyes and
//               beak at the water, arm roots curling at the surface. Walk
//               (4): breathing idle. Fight (4): watch, rear, ROAR, settle.
//               Walk-sheet strings: "rise.0-3" (coming up), "sink.0-3" (the
//               death or a dive).
//   krakenarm   one tentacle standing out of the water, suckers on its
//               inner face. Walk (4): the sway. Fight (4): raised, arched
//               back, SLAM (laid along the ground ahead), dragged back.
//               Walk-sheet strings: "rise.0-3" (bursting up), "grab.0-3"
//               (reach, wrap, squeeze, lift), "sink.0-3".
//
// The extra sheets go through the normal rig cache: the engine (or draw.js)
// calls drawRig(ctx, type, x, y, face, "walk", "surface.2") — rigs.js keys
// a bake by its frame, so any string is its own frame (as the skiff's are).
//
// Colour params keep the generic names (col, belly, mane, wing, skin, cloth,
// cloth2, hair, cape, eyes) so revive() and the white hit-flash reach them.

import { lighten, darken, mix, lin, part, shadow, glow } from "./paint.js";
import { weapon, drawRig } from "./rigs.js";
import { BEAST_PAINTERS } from "./rigs-beasts.js";
import { rimeJarlRider, RIME_JARL } from "./rigs-rime.js";
import { logJoint } from "./folk-kit.js";

const TAU = Math.PI * 2;
const q = (v) => Math.round(v * 2) / 2;               // snap to the art pixel
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const PI = Math.PI;

// ---- shape kit (as rigs-beasts.js) -------------------------------------------
const curve = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  c.moveTo(...mid(pts[0], pts[1]));
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n], m = mid(p, pts[(i + 1) % n]);
    if (p[2]) { c.lineTo(p[0], p[1]); c.lineTo(m[0], m[1]); } else c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  c.closePath();
};
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const fillPoly = (c, pts, col) => { c.fillStyle = col; poly(c, pts); c.fill(); };
const tone = (c, x0, y0, x1, y1, col, hi = 0.3, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
const taper = (c, pts, ws) => {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i], r = ws[i] / 2;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (i + 1 < pts.length) {
      const [x2, y2] = pts[i + 1], r2 = ws[i + 1] / 2;
      const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      c.beginPath(); c.moveTo(x + nx * r, y + ny * r); c.lineTo(x2 + nx * r2, y2 + ny * r2); c.lineTo(x2 - nx * r2, y2 - ny * r2); c.lineTo(x - nx * r, y - ny * r); c.closePath(); c.fill();
    }
  }
};
// two-bone reach: bend +1 folds toward -x (an elbow), -1 toward +x (a knee)
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const t = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1))));
  const ang = Math.atan2(dy, dx) + bend * t;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
const leg = (ctx, pts, ws, col, o = {}) => part(ctx, (c) => {
  c.fillStyle = col; taper(c, pts, ws);
  if (o.hi) { c.fillStyle = o.hi; taper(c, pts.slice(0, -1).map(([x, y], i) => [x - ws[i] * 0.24, y - 0.2]), ws.slice(0, -1).map((w) => w * 0.34)); }
  if (o.extra) o.extra(c, pts);
});
const spike = (c, p, n, h, w = 0.9, lean = 0.45) => {
  const t = [-n[1], n[0]];
  poly(c, [[p[0] + t[0] * w, p[1] + t[1] * w], [p[0] + n[0] * h - h * lean, p[1] + n[1] * h], [p[0] - t[0] * w, p[1] - t[1] * w]]);
  c.fill();
};
// a smooth centreline through a few control points (Catmull-Rom), n samples a span
const spline = (pts, n = 4) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice(0, 2));
  return out;
};
// the unit normal of a centreline at sample i, turned to face up (or down)
const normalAt = (pts, i, up = true) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  let n = [-dy / l, dx / l];
  if ((n[1] < 0) !== up) n = [-n[0], -n[1]];
  return n;
};
const ICE = "#d4f0fc", ICE_LT = "#f4fcff", ICE_DK = "#8ec4dc";
// a cluster of ice spikes bursting out of the ground round (x, 0): the stomp
const iceBurst = (ctx, x, r, k = 1) => part(ctx, (c) => {
  const sp = [[-r, 0.55, -0.5], [-r * 0.45, 0.9, -0.2], [0, 1, 0.05], [r * 0.5, 0.8, 0.3], [r, 0.5, 0.55]];
  for (const [dx, h, lean] of sp) {
    const hh = h * 5.5 * k, bx = x + dx;
    fillPoly(c, [[bx - 1.3, 0.6], [bx + lean * hh * 0.5, -hh], [bx + 1.3, 0.6]], ICE_DK);
    fillPoly(c, [[bx - 1.3, 0.6], [bx + lean * hh * 0.5, -hh], [bx - 0.1, 0.6]], ICE_LT);
  }
}, { ink: null });
// the cracks and frost the stomp leaves on the ground (flat, under the ink)
const frostCracks = (c, x, r) => {
  c.fillStyle = "rgba(214,240,252,0.2)";
  c.beginPath(); c.ellipse(x, 0.3, r, r * 0.3, 0, 0, TAU); c.fill();
};

// ---- water: the waterline is y = 0 ------------------------------------------
const SEA = "#1e4656", FOAM = "#eef6f8";
// what lies under the surface: painted at full strength on a scratch layer
// with the colours pulled toward the sea, then laid on dim (alpha under the
// ink's threshold, so it is never outlined): a refraction, not a body. Every
// translucent piece here (this, ripples, rings, mist) is kept faint enough
// that two of them overlapping still stay under the threshold (~0.43).
const submerged = (ctx, fn, a = 0.26) => {
  const cv = ctx.canvas;
  if (!cv || !cv.width) return;
  const tmp = document.createElement("canvas");
  tmp.width = cv.width; tmp.height = cv.height;
  const t = tmp.getContext("2d");
  t.imageSmoothingEnabled = false;
  t.setTransform(ctx.getTransform());
  t.beginPath(); t.rect(-400, 0.5, 800, 400); t.clip();
  fn(t, (col) => mix(col, SEA, 0.55));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(tmp, 0, 0); ctx.restore();
};
// the part above the surface: a part clipped to y <= 0
const above = (ctx, fn) => part(ctx, (c) => { c.save(); c.beginPath(); c.rect(-400, -400, 800, 400.4); c.clip(); fn(c, (col) => col); c.restore(); });
// foam where a body cuts the surface: a bright collar and a ripple ring
const foam = (ctx, x, w, k = 1) => {
  ctx.fillStyle = "rgba(226,240,246,0.15)";
  ctx.beginPath(); ctx.ellipse(x, 0.6, w * 1.6 * k, 1.6 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = FOAM;
  ctx.beginPath(); ctx.ellipse(x, 0.2, w * 0.62, 0.9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#c4e2ec";
  ctx.fillRect(x - w * 0.62, 0.4, w * 1.24, 0.5);
};
// spray: drops thrown up off the surface
const spray = (ctx, x, w, h, seed = 1) => {
  for (let i = 0; i < 6; i++) {
    const u = ((i * 37 + seed * 11) % 17) / 17 - 0.5, v = ((i * 53 + seed * 7) % 13) / 13;
    ctx.fillStyle = i % 3 ? FOAM : "#bfe0ea";
    const dx = x + u * w * 2, dy = -v * h - 0.5;
    ctx.fillRect(q(dx), q(dy), 1, 1);
  }
};
const rings = (ctx, x, w, k) => {
  ctx.strokeStyle = `rgba(226,240,246,${0.15 * k})`; ctx.lineWidth = 0.5;
  for (const r of [1, 1.7]) { ctx.beginPath(); ctx.ellipse(x, 0.6, w * r, w * r * 0.26, 0, 0, TAU); ctx.stroke(); }
};

// ---- the clan raider, seated ---------------------------------------------------------
// Hip at (0, 0) of the caller's transform, facing +x. pose: lean, the axe
// hand and the haft's angle.
const raider = (ctx, p, k, o = {}) => {
  const skin = p.skin, cloth = p.cloth, fur = p.cloth2, hair = p.hair, steel = "#8e96a2";
  const lean = k.lean;
  // the round shield slung across his back (far side)
  part(ctx, (c) => {
    const sx = -2.6 + lean * 0.4, sy = -4.6;
    c.fillStyle = tone(c, sx - 3.6, sy - 3.6, sx + 3.6, sy + 3.6, p.shcol || "#d8d0bc", 0.25, 0.4);
    c.beginPath(); c.ellipse(sx, sy, 3.3, 3.7, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(sx, sy, 3.3, 3.7, 0, 0, TAU); c.clip();
    c.fillStyle = darken(cloth, 0.05); c.fillRect(sx - 4, sy - 4, 4, 4); c.fillRect(sx, sy, 4, 4);
    c.restore();
    c.fillStyle = steel; c.beginPath(); c.arc(sx, sy, 0.9, 0, TAU); c.fill();
  });
  // far arm, on the scruff (in shade)
  leg(ctx, [[1 + lean, -5.2], [4 + lean * 0.6, -3.2], [5 + lean * 0.6, -2.4]], [1.9, 1.6, 1.6], darken(cloth, 0.3));
  // near leg down the flank: dark breeches, the shin bound in fur
  leg(ctx, [[0.2, -0.8], [3.2, 1.4], [2.4, 4.6]], [3, 2.4, 2.1], darken(cloth, 0.3), {
    extra: (c) => { c.fillStyle = fur; c.fillRect(1.5, 2.4, 2.2, 1.7); c.fillStyle = "#3a2c26"; c.beginPath(); c.ellipse(3.1, 5, 1.6, 1, 0, 0, TAU); c.fill(); },
  });
  // torso: a wool tunic under a mail shirt, a fur mantle over the shoulders
  part(ctx, (c) => {
    const body = [[-2.6, 0.6], [2.4, 0.6], [2.8 + lean * 0.4, -3], [2.4 + lean, -6.2], [lean * 0.8, -7.2], [-2 + lean * 0.8, -6.4], [-2.8, -2.6]];
    curve(c, body);
    c.fillStyle = tone(c, -2.8, -7, 2.8, 0, steel, 0.3, 0.45); c.fill();
    c.save(); curve(c, body); c.clip();
    // mail rings: a stipple of darker rows
    c.fillStyle = darken(steel, 0.35);
    for (let y = -6; y < 0; y += 1) for (let x = -3 + (y & 1) * 0.5; x < 3.4 + lean; x += 1) c.fillRect(x, y, 0.5, 0.5);
    // the tunic's hem and a belt
    c.fillStyle = tone(c, -2.8, -1.6, 2.8, 0.6, cloth, 0.25, 0.4); c.fillRect(-3, -1.4, 7, 2.2);
    c.fillStyle = "#4a3426"; c.fillRect(-3, -2.2, 7, 0.9);
    c.fillStyle = "#c8a050"; c.fillRect(1 + lean * 0.3, -2.2, 0.8, 0.9);
    c.restore();
    // the fur mantle: a ragged collar across the shoulders
    c.fillStyle = tone(c, 0, -8.6, 0, -4.6, fur, 0.2, 0.35);
    const m = lean * 0.85;
    curve(c, [[-2.8 + m, -7.4], [-0.6 + m, -8.4], [2 + m, -8.2], [3.4 + m, -6.8], [2.6 + m, -5.6, 1], [1.8 + m, -6.2], [1 + m, -5.2, 1], [0 + m, -6], [-1 + m, -5, 1], [-1.8 + m, -5.8], [-2.8 + m, -4.6, 1], [-3.4 + m, -6.2]]);
    c.fill();
  });
  // head: spangenhelm with a nasal, a braided beard
  const hx = 1.8 + lean * 1.1, hy = -9.6;
  part(ctx, (c) => {
    // the braid down his back, under everything else
    c.fillStyle = tone(c, hx - 3, hy, hx - 1, hy + 4, hair, 0.25, 0.4);
    taper(c, [[hx - 1.6, hy - 0.4], [hx - 2.6, hy + 1.6], [hx - 3, hy + 3.6]], [1.8, 1.3, 1]);
    // face
    c.fillStyle = tone(c, hx - 2.4, hy - 2.4, hx + 2.4, hy + 2.4, skin, 0.3, 0.35);
    curve(c, [[hx - 2, hy + 0.4], [hx - 1.6, hy - 2], [hx + 0.8, hy - 2.4], [hx + 2.2, hy - 0.8], [hx + 2.6, hy + 0.6, 1], [hx + 1.8, hy + 1.4], [hx - 0.6, hy + 2.2]]); c.fill();
    // the beard, plaited to a point (the Jarl's long and white)
    const bc = hair, bl = 0;
    c.fillStyle = tone(c, hx - 1, hy, hx + 2.5, hy + 4 + bl, bc, 0.25, 0.4);
    curve(c, [[hx - 1, hy + 0.2], [hx + 0.8, hy + 0.9], [hx + 2.5, hy + 0.6], [hx + 2.2, hy + 2], [hx + 1.6, hy + 3.4 + bl, 1], [hx + 0.6, hy + 2.6 + bl * 0.6], [hx - 0.8, hy + 1.8]]); c.fill();
    c.fillStyle = darken(bc, 0.3); c.fillRect(hx + 1.1, hy + 2.3 + bl * 0.5, 1, 0.5);
    // the helm: a conical cap riveted in four plates, a rim band and a nasal
    const hc = steel;
    c.fillStyle = tone(c, hx - 2.6, hy - 5, hx + 2.6, hy, hc, 0.35, 0.4);
    curve(c, [[hx - 2.5, hy - 0.4], [hx - 2.3, hy - 2.6], [hx - 0.4, hy - 4.8, 1], [hx + 1.6, hy - 3.2], [hx + 2.6, hy - 0.8], [hx + 0.2, hy - 1.2]]); c.fill();
    c.fillStyle = darken(hc, 0.3);
    c.fillRect(hx - 2.5, hy - 1.4, 5.1, 0.9);
    c.fillRect(hx + 1.9, hy - 1.4, 0.8, 2.4);            // the nasal
    c.fillStyle = darken(hc, 0.25); c.fillRect(hx - 0.6, hy - 4.3, 0.5, 2.9);
    // the eye under the brim
    c.fillStyle = "#1e1822"; c.fillRect(hx + 1, hy - 0.4, 0.6, 0.7);
  });
  // near arm and the axe: two bones that keep their length, the elbow folding
  // the natural way; one inked part, the fist over the haft
  const sh = [0.4 + lean, -5.8], hand = k.hand;
  weapon(ctx, o.weapon || "axe", hand[0], hand[1], k.ang, p.wcol, o.ws || 1.1);
  const UP = 2.8, FORE = 2.7, el = ik(sh, hand, UP, FORE, 1);
  logJoint(ctx, "arm", sh, el, hand, { lens: [UP, FORE] });
  leg(ctx, [sh, el, hand], [2.1, 1.9, 1.7], darken(steel, 0.08), {
    extra: (c) => { c.fillStyle = mix(skin, "#8a6a52", 0.3); c.beginPath(); c.arc(hand[0], hand[1], 0.95, 0, TAU); c.fill(); c.fillStyle = fur; c.fillRect(el[0] + (hand[0] - el[0]) * 0.55 - 0.8, el[1] + (hand[1] - el[1]) * 0.55 - 0.8, 1.6, 1.6); },
  });
};
// the axe through a ride and a fight (the hand in the rider's own frame)
const RIDER_WALK = (f) => ({ lean: 0.5, hand: [3.3, -4.6], ang: -2.55 + Math.sin((f / 4) * TAU) * 0.1 });
const RIDER_FIGHT = [
  { lean: 0.2, hand: [4.2, -6.6], ang: -1.05 },        // guard: the axe up before him
  { lean: -0.8, hand: [-1.8, -10.1], ang: -2.1 },      // wind-up: the axe up behind his head
  { lean: 1.4, hand: [5.6, -4.2], ang: 0.15 },         // the chop
  { lean: 1, hand: [4.6, -2.6], ang: 0.9 },            // follow-through, the head low
];

// ---- the frost wolf and its rider -------------------------------------------------
// The wolf is the Greenwood's dire wolf body (rigs-beasts.js) in a white
// coat; the seat follows its gait keys (WOLF_RUN / WOLF_FIGHT there).
const WOLF_SEAT = [{ bob: -1.5, arch: -0.4, st: 1 }, { bob: 0, arch: 0.3, st: 0 }, { bob: -1, arch: 1.5, st: -1 }, { bob: 0, arch: 0.6, st: 0 }];
const WOLF_SEAT_FIGHT = [{ bob: 1, arch: 0.8, st: 0 }, { bob: -1.5, arch: -0.3, st: 1.2, dx: 2.5 }];
const WOLF_OF_FIGHT = [0, 0, 1, 1];          // the rider's four fight frames over the wolf's two
const frostwolf = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const wf = fight ? WOLF_OF_FIGHT[f % 4] : f % 4;
  BEAST_PAINTERS.direwolf(ctx, { len: p.len, col: p.col, belly: p.belly, mane: p.mane, eyes: p.eyes, pose: p.pose, frame: wf });
  // rime on the ruff and the brush: a few ice-white points
  const s = (p.len ?? 30) / 30;
  const k = fight ? WOLF_SEAT_FIGHT[wf] : WOLF_SEAT[wf];
  const b = q(k.bob);
  // a breath of frost from the jaws
  const mx = (21.5 + (k.st || 0) * 0.8 + (k.dx || 0)) * s, my = (-17.4 + b) * s;
  ctx.fillStyle = "rgba(230,246,252,0.34)";
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(mx + 1.6 + i * 2.6, my - 0.8 - i * 0.9, 0.8 + i * 0.3, 0, TAU); ctx.fill(); }
  if (!p.rider) return;
  ctx.save();
  ctx.translate((0.5 + k.st * 0.3 + (k.dx || 0)) * s, (-16 + b - k.arch * 0.8) * s);
  ctx.scale(s * 1.3, s * 1.3);
  raider(ctx, p, fight ? RIDER_FIGHT[f % 4] : RIDER_WALK(f));
  ctx.restore();
};

// ---- the frost giant -------------------------------------------------------------
// A hunched, heavy biped: hips at 15, a barrel of a torso, long arms, a small
// head sunk between the shoulders. Bones: thigh 8.5, shin 8, upper arm and
// forearm 8 each (logged for the joint lab).
const G_THIGH = 8.5, G_SHIN = 8, G_UP = 8, G_FORE = 8;
const GIANT_WALK = [
  { b: 0, lean: 0.6, near: [5, 0], far: [-4, 0], hand: [8.4, -14.6], ang: 2.5, fhand: [-1.6, -15] },
  { b: -1, lean: 0.8, near: [1, 0], far: [0.5, -2.6], hand: [7.2, -15.4], ang: 2.42, fhand: [1, -15.6] },
  { b: 0, lean: 0.6, near: [-4, 0], far: [5, 0], hand: [5.8, -15], ang: 2.36, fhand: [3.6, -15] },
  { b: -1, lean: 0.8, near: [0.5, -2.6], far: [1, 0], hand: [7, -15.4], ang: 2.44, fhand: [1.4, -15.6] },
];
const GIANT_FIGHT = [
  // guard: crouched, both fists on the bone held up across him
  { b: 1, lean: 0.6, near: [6, 0], far: [-5, 0], hand: [10.5, -19], ang: -1.0, two: true },
  // wind-up: the near knee up, the bone up behind his head, leaning back
  { b: 0, lean: -1.5, near: [6.5, -7], far: [-4.5, 0], hand: [-5, -40], ang: -2.4, fhand: [8.5, -24] },
  // the stomp: foot and bone down together, ice bursting from the ground
  { b: 3, lean: 2, near: [7.5, 0], far: [-5, 0], hand: [13, -12], ang: 0.55, two: true, burst: 1 },
  // follow-through: low, the bone on the ground, the ice settling
  { b: 2, lean: 1.5, near: [7.5, 0], far: [-5, 0], hand: [11.5, -13], ang: 0.75, two: true, burst: 0.55 },
];
const giant = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? GIANT_FIGHT[f % 4] : GIANT_WALK[f % 4];
  const skin = p.skin, fur = p.cloth2, kilt = p.cloth, hair = p.hair, bone = p.wcol || "#e6dcc4";
  const b = k.b, L = k.lean;
  const farSkin = darken(skin, 0.28);
  shadow(ctx, 1.5, 0.4, 13, 2.6, 0.32);
  if (k.burst) part(ctx, (c) => frostCracks(c, k.near[0] + 1, 9 * k.burst), { ink: null });
  const hipN = [-0.5, -15 + b], hipF = [1, -15.6 + b];
  const S = [3.5 + L, -28.5 + b], SF = [S[0] - 3, S[1] - 1];
  const dir = [Math.cos(k.ang), Math.sin(k.ang)];
  const grip2 = [k.hand[0] - dir[0] * 2.6, k.hand[1] - dir[1] * 2.6];
  const fhand = k.two ? grip2 : k.fhand;
  // a leg: hip, knee forward, ankle; a fur-bound foot
  const gLeg = (hip, foot, col, hi) => {
    const ank = [foot[0], foot[1] - 1.3];
    const kn = ik(hip, ank, G_THIGH, G_SHIN, -1);
    logJoint(ctx, "leg", hip, kn, ank, { lens: [G_THIGH, G_SHIN] });
    leg(ctx, [hip, kn, ank], [6.2, 5, 4.2], col, {
      hi,
      extra: (c) => {
        // fur wrapping round the shin, then the broad bare foot
        const m = lerp(kn, ank, 0.55);
        c.fillStyle = darken(fur, hi ? 0.05 : 0.3); c.beginPath(); c.ellipse(m[0], m[1], 2.6, 1.8, 0, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.ellipse(ank[0] + 1.4, ank[1] + 0.8, 3.2, 1.3, 0, 0, TAU); c.fill();
        c.fillStyle = darken(col, 0.35); for (const t of [0.8, 2, 3.2]) c.fillRect(ank[0] + 1 + t, ank[1] + 1, 0.6, 0.5);
      },
    });
  };
  const gArm = (sh, hand, col, front) => {
    const el = ik(sh, hand, G_UP, G_FORE, 1);
    logJoint(ctx, "arm", sh, el, hand, { lens: [G_UP, G_FORE] });
    leg(ctx, [sh, el, hand], [5, 4.2, 3.8], col, {
      hi: front ? lighten(col, 0.18) : null,
      extra: (c) => {
        // an iron cuff at the wrist, then the fist
        const w = lerp(el, hand, 0.72);
        c.fillStyle = front ? "#6a727e" : "#4a505a"; c.beginPath(); c.arc(w[0], w[1], 2.1, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(hand[0], hand[1], 2.1, 0, TAU); c.fill();
      },
    });
  };
  // the whale's jaw: a long pale bone thickening to its end, lashed at the
  // grip and crusted with ice at the head
  const club = () => part(ctx, (c) => {
    const P = (d, o = 0) => [k.hand[0] + dir[0] * d - dir[1] * o, k.hand[1] + dir[1] * d + dir[0] * o];
    const pts = [P(-3.6), P(2), P(8, -0.5), P(13, -0.8), P(17, -0.3)];
    c.fillStyle = tone(c, ...P(0, -3), ...P(0, 3), bone, 0.25, 0.4);
    taper(c, pts, [2, 2.4, 3.2, 4.2, 4.6]);
    c.fillStyle = darken(bone, 0.3);
    for (const d of [5, 9, 13]) { const a = P(d, 1), e = P(d + 1.4, 1.2); c.fillRect(Math.min(a[0], e[0]), Math.min(a[1], e[1]), 0.6, 0.6); }
    // rawhide lashing at the grip
    c.fillStyle = "#5a3e2c"; for (const d of [-2.6, -1.2]) { const a = P(d); c.beginPath(); c.arc(a[0], a[1], 1.25, 0, TAU); c.fill(); }
    // the ice crust: shards standing off the head
    for (const [d, o, h] of [[12, -1.6, 2.8], [14.5, -2, 3.4], [17, -1.2, 2.8], [16, 1.6, 2.2], [13.2, 1.8, 1.8]]) {
      const a = P(d, o), tip = P(d + 0.6, o + Math.sign(o) * h);
      fillPoly(c, [[a[0] - 0.9, a[1]], tip, [a[0] + 0.9, a[1]]], ICE);
      fillPoly(c, [[a[0] - 0.9, a[1]], tip, [a[0], a[1] + 0.3]], ICE_LT);
    }
    c.fillStyle = ICE; const e = P(18.4); c.beginPath(); c.arc(e[0], e[1], 1.6, 0, TAU); c.fill();
  });
  const windup = fight && f % 4 === 1;
  // far leg and far arm, in shade
  gLeg(hipF, k.far, farSkin, null);
  if (!k.two) gArm(SF, fhand, farSkin, false);
  if (windup || !fight) club();          // the bone behind him (trailed, or raised behind the head)
  // near leg
  gLeg(hipN, k.near, skin, lighten(skin, 0.15));
  // the torso: a hunched barrel, the hump of the back high behind the head
  part(ctx, (c) => {
    const tor = [[-6.4, -13 + b], [5, -12.4 + b], [9.4 + L * 0.5, -16.6 + b], [11 + L, -22.4 + b], [10 + L, -28 + b], [6.4 + L, -32 + b], [0 + L, -34.6 + b], [-5.6 + L * 0.7, -33 + b], [-10 + L * 0.4, -27 + b], [-8.6 + L * 0.2, -17.6 + b]];
    c.fillStyle = tone(c, -7, -34 + b, 8, -13 + b, skin, 0.3, 0.42);
    curve(c, tor); c.fill();
    c.save(); curve(c, tor); c.clip();
    // the pale belly, the chest's shadow, scars of old fights
    c.fillStyle = mix(skin, "#dce6ee", 0.3);
    c.beginPath(); c.ellipse(5.6 + L * 0.6, -18.6 + b, 5.2, 5.8, -0.3, 0, TAU); c.fill();
    c.fillStyle = darken(skin, 0.25); c.fillRect(3 + L, -25.5 + b, 7, 0.8);
    c.restore();
    // the fur kilt, belted with a rope
    c.fillStyle = tone(c, 0, -17 + b, 0, -8 + b, kilt, 0.25, 0.4);
    curve(c, [[-7, -16.8 + b], [6.6, -16.2 + b], [7.2, -10 + b, 1], [5, -11 + b], [3.6, -9 + b, 1], [2, -10.6 + b], [0.4, -8.6 + b, 1], [-1.4, -10.4 + b], [-3, -8.8 + b, 1], [-4.4, -10.6 + b], [-6.6, -9.4 + b, 1], [-6.6, -12 + b]]); c.fill();
    c.fillStyle = "#4a3426"; c.fillRect(-7, -17 + b, 14, 1.2);
    // the fur mantle on the hump of the shoulders, rimed
    c.fillStyle = tone(c, 0, -36 + b, 0, -27 + b, fur, 0.25, 0.4);
    curve(c, [[-8.6 + L * 0.7, -30.5 + b], [-5 + L, -35 + b], [2 + L, -36 + b], [7.6 + L, -33 + b], [9.6 + L, -29.4 + b, 1], [7.4 + L, -30.2 + b], [6 + L, -28 + b, 1], [4 + L, -29.8 + b], [2 + L, -27.6 + b, 1], [0 + L, -29.6 + b], [-2 + L, -27.4 + b, 1], [-4 + L, -29.4 + b], [-6 + L * 0.6, -27 + b, 1], [-7.4 + L * 0.5, -28.8 + b], [-9.4 + L * 0.4, -26.6 + b, 1]]); c.fill();
    c.fillStyle = ICE_LT;
    for (const [x, y] of [[-3, -34], [0.4, -35], [3.6, -34.2], [-5.4, -32]]) c.fillRect(x + L, y + b, 1, 0.5);
  });
  // head: small, sunk between the shoulders, a frost-white mane and beard
  const hx = 8.8 + L * 1.05, hy = -33.6 + b;
  const head = () => part(ctx, (c) => {
    c.save(); c.translate(hx, hy); c.scale(1.2, 1.2);
    // the mane falling down the back of the neck onto the hump
    c.fillStyle = tone(c, -6, -4, 0, 4, hair, 0.2, 0.4);
    curve(c, [[-1, -3.8], [-4.6, -2.8], [-6.4, 0.6], [-5.6, 3.4, 1], [-4.4, 1.6], [-3.4, 3, 1], [-2.4, 1.2], [-1.4, 0]]); c.fill();
    // face: a heavy brow, a broad nose, a jaw like a stone
    c.fillStyle = tone(c, -3, -3.4, 3, 3, skin, 0.3, 0.38);
    curve(c, [[-2.6, 1], [-2.6, -2.2], [-0.4, -3.6], [2.2, -3], [3, -1.4], [3.8, 0.1, 1], [3.1, 0.9], [2.8, 2.4], [0, 3]]); c.fill();
    c.fillStyle = darken(skin, 0.42); poly(c, [[-0.4, -2], [3.3, -1.7], [3.2, -1], [-0.2, -1.2]]); c.fill();
    c.fillStyle = darken(skin, 0.2); poly(c, [[2.6, -1], [3.9, 0.2], [2.8, 0.7]]); c.fill();
    c.fillStyle = p.eyes || "#bfe8ff"; c.fillRect(1.1, -1, 1.3, 0.7);
    c.fillStyle = "#1e2430"; c.fillRect(2, -1, 0.4, 0.7);
    // the ear
    c.fillStyle = darken(skin, 0.15); c.beginPath(); c.ellipse(-1.4, -0.4, 0.8, 1.2, 0, 0, TAU); c.fill();
    // the beard, frost in it, down onto the chest
    c.fillStyle = tone(c, -1, 0, 3, 6, hair, 0.2, 0.38);
    curve(c, [[-1.2, 0.6], [1, 1.4], [3.2, 1], [3.4, 3], [2.6, 6.4, 1], [1.6, 4.6], [0.6, 6.2, 1], [-0.4, 3.8], [-1.4, 2.6]]); c.fill();
    c.fillStyle = darken(hair, 0.3); c.fillRect(0.4, 3.2, 0.5, 1.6); c.fillRect(1.8, 3, 0.5, 1.8);
    c.fillStyle = ICE_LT; for (const [x, y] of [[0.6, 2.4], [2.4, 3.8], [1.2, 5]]) c.fillRect(x, y, 0.6, 0.6);
    c.fillStyle = darken(skin, 0.55); c.fillRect(2, 1.3, 1.3, 0.5);    // the mouth in the beard
    c.restore();
  });
  head();
  glow(ctx, hx + 2.1, hy - 0.8, 1.5, p.eyes || "#bfe8ff", 0.4);
  // near arm (a raised arm is drawn after the head, the elbow behind its middle)
  if (fight && !windup) club();
  if (k.two) gArm(SF, fhand, farSkin, false);
  gArm(S, k.hand, skin, true);
  if (k.burst) iceBurst(ctx, k.near[0] + 1.4, 7, k.burst);
};

// ---- the ice drake ---------------------------------------------------------------
// A lesser kin of the Greenwood's dragon: light, quick, all neck and tail.
// The flap keys follow the dragon's (wing key, bob, neck and tail sway).
const DRAKE_FLY = [
  { bob: 1, wing: 0, neck: 0, tail: 1, head: 0.05 },
  { bob: -0.5, wing: 1, neck: 0.6, tail: 0, head: 0 },
  { bob: -2, wing: 2, neck: 0, tail: -1, head: -0.05 },
  { bob: -0.5, wing: 3, neck: -0.6, tail: 0, head: 0 },
];
const DRAKE_FIGHT = [
  { bob: -0.5, wing: 0, neck: -1, neckY: -0.5, tail: 0.5, head: -0.1, jaw: 0.12 },                    // rear, watching
  { bob: -1.5, wing: 3, neck: -2.6, neckY: -1.4, tail: 1, head: -0.38, jaw: 0.18, windup: true },      // draw in: the throat glows cold
  { bob: 0.5, wing: 2, neck: 2.6, neckY: 1.4, tail: -1, head: 0.26, jaw: 0.56, breath: 1 },          // the frost breath
  { bob: 0, wing: 1, neck: 1.6, neckY: 0.8, tail: -0.4, head: 0.16, jaw: 0.3, breath: 0.5 },          // trailing off
];
const DWINGS = [
  { E: [-4, -9], W: [4, -21], T: [[12, -26], [-2, -31], [-16, -28], [-28, -18]], B: [-18, 4] },
  { E: [-3, -6], W: [7, -13], T: [[19, -16], [8, -23], [-8, -24], [-24, -17]], B: [-18, 4] },
  { E: [-1, 6], W: [8, 12], T: [[18, 16], [8, 22], [-4, 22], [-16, 14]], B: [-18, 4] },
  { E: [-4, -8], W: [-1, -18], T: [[5, -24], [-7, -26], [-18, -21], [-26, -11]], B: [-18, 4] },
];
const drakeWing = (ctx, R, key, sc, mem, bone, tilt = 0) => part(ctx, (c) => {
  const P = (v) => { const r = rot(v, [0, 0], tilt); return [R[0] + r[0] * sc, R[1] + r[1] * sc]; };
  const E = P(key.E), W = P(key.W), T = key.T.map(P), B = P(key.B);
  const edge = () => {
    c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]);
    let prev = T[0];
    for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
    c.closePath();
  };
  edge(); c.fillStyle = mem; c.fill();
  c.save(); edge(); c.clip();
  c.strokeStyle = lighten(mem, 0.3); c.lineWidth = 5 * sc; c.lineJoin = "round";
  c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]); c.stroke();
  c.strokeStyle = darken(mem, 0.28); c.lineWidth = 3.4 * sc;
  let prev = T[0]; c.beginPath(); c.moveTo(...prev);
  for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
  c.stroke();
  c.restore();
  c.fillStyle = bone; taper(c, [R, E, W], [2.6 * sc, 2 * sc, 1.7 * sc]);
  for (const t of T) taper(c, [W, t], [1.2 * sc, 0.5 * sc]);
  fillPoly(c, [[W[0] - 0.7, W[1] + 0.2], [W[0] + 0.7, W[1] - 2.4], [W[0] + 1, W[1] + 0.3]], ICE_LT);
});
const drake = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? DRAKE_FIGHT[f % 4] : DRAKE_FLY[f % 4];
  const s = (p.len ?? 40) / 40;
  const col = p.col, belly = p.belly, mem = p.wing, far = darken(col, 0.3);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob), ns = k.neck, ny = k.neckY || 0, tw = k.tail;
  const key = DWINGS[k.wing];
  // far wing, in shade
  drakeWing(ctx, [0, -24.5 + b], key, 0.5, darken(mem, 0.3), far, -0.28);
  // legs tucked, dangling a beat behind
  const dang = -b * 0.5;
  const claws = (c, pts) => { const [fx, fy] = pts[pts.length - 1]; c.fillStyle = ICE_LT; for (let i = 0; i < 3; i++) poly(c, [[fx - 0.8 + i * 0.8, fy], [fx - 0.2 + i * 0.8, fy + 1.6], [fx + 0.3 + i * 0.8, fy]]), c.fill(); };
  const hind = (o, cl) => leg(ctx, [add(o, [-5, -17 + b]), add(o, [-8.4, -12.6 + b + dang]), add(o, [-6.4, -10.8 + b + dang])], [3.4, 2.2, 1.8], cl, { extra: claws });
  const fore = (o, cl) => leg(ctx, [add(o, [6, -17.6 + b]), add(o, [5, -14.4 + b]), add(o, [7.4, -12.4 + b + dang])], [2.8, 2, 1.6], cl, { extra: claws });
  hind([-2, -1], far); fore([-2, -1], far);
  const TL = [[-8.6, -18.8 + b], [-13.6, -17.4 + b], [-18.6, -16.4 + b + tw * 0.6], [-23.4, -17.4 + b + tw * 1.2], [-27.4, -20 + b + tw * 1.6]];
  const TW = [6.4, 4.6, 3.3, 2.1, 1.2];
  const NK = [[8, -22 + b], [11 + ns * 0.3, -25.6 + b + ny * 0.3], [13 + ns * 0.6, -28.6 + b + ny * 0.6], [15.6 + ns, -30.6 + b + ny]];
  const NW = [6.4, 4.8, 4, 3.6];
  const torso = [[9.6, -21 + b], [8.4, -16.6 + b], [4, -14.8 + b], [-3, -14.8 + b], [-8.4, -16.4 + b], [-10, -19.4 + b], [-7, -22.6 + b], [0, -24.4 + b], [6, -24.8 + b]];
  const bodyTone = (c) => tone(c, 0, -26 + b, 0, -14 + b, col, 0.3, 0.4);
  part(ctx, (c) => {
    // icicle spines down the neck, the back and the tail
    c.fillStyle = ICE;
    for (let i = 0; i < 3; i++) { const pt = lerp(NK[i], NK[i + 1], 0.5), n = normalAt(NK, i, true); spike(c, add(pt, [n[0] * 1.6, n[1] * 1.6]), n, 2.2, 0.8); }
    [[4.4, -24.6, 2.6], [1, -24.2, 3], [-2.4, -23.4, 2.8], [-5.6, -22, 2.4]].forEach(([x, y, h]) => spike(c, [x, y + b + 0.5], [0, -1], h, 1));
    for (let i = 1; i < TL.length - 1; i++) { const n = normalAt(TL, i, true); spike(c, add(TL[i], [n[0] * (TW[i] / 2 - 0.3), n[1] * (TW[i] / 2 - 0.3)]), n, 2 - i * 0.3, 0.8); }
    // tail, ending in a blade of ice
    c.fillStyle = bodyTone(c); taper(c, TL, TW);
    const e = TL[TL.length - 1], pe = TL[TL.length - 2], dl = Math.hypot(e[0] - pe[0], e[1] - pe[1]), d = [(e[0] - pe[0]) / dl, (e[1] - pe[1]) / dl], n = [-d[1], d[0]];
    const S2 = (u, v) => [e[0] + d[0] * u + n[0] * v, e[1] + d[1] * u + n[1] * v];
    fillPoly(c, [S2(-0.4, 0.6), S2(1.2, 2.2), S2(4.6, 0), S2(1.2, -2.2), S2(-0.4, -0.6)], ICE);
    fillPoly(c, [S2(-0.4, 0), S2(1.2, -2.2), S2(4.6, 0)], ICE_LT);
    // torso and neck
    c.fillStyle = bodyTone(c); curve(c, torso); c.fill();
    c.fillStyle = tone(c, 0, -33 + b, 0, -20 + b, col, 0.3, 0.4); taper(c, NK, NW);
    // the pale belly plates
    const throat = NK.map((pt, i) => { const n2 = normalAt(NK, i, false); return add(pt, [n2[0] * NW[i] * 0.24, n2[1] * NW[i] * 0.24]); });
    c.fillStyle = belly; taper(c, throat, NW.map((w) => w * 0.46));
    c.save(); curve(c, torso); c.clip();
    c.fillStyle = belly; curve(c, [[10, -18 + b], [8, -15.4 + b], [3, -14 + b], [-4, -14 + b], [-8, -16 + b], [-4, -17.2 + b], [2, -17.6 + b], [7, -19.4 + b]]); c.fill();
    c.fillStyle = darken(belly, 0.25); for (let x = -5; x <= 8; x += 2.2) c.fillRect(x, -17.6 + b, 0.5, 4);
    // frost-flecked scales on the back
    c.fillStyle = lighten(col, 0.45); for (const [x, y] of [[-6, -20.6], [-3, -22], [0.6, -22.8], [4, -22.6], [-1.4, -20.2], [2.6, -20.6]]) c.fillRect(x, y + b, 0.6, 0.5);
    c.restore();
  });
  // the head: an icicle crest swept back, a long snout, a jaw that opens
  const HB = NK[NK.length - 1], jaw = k.jaw || 0;
  const headXf = (c) => { c.translate(HB[0], HB[1]); c.rotate(k.head || 0); };
  part(ctx, (c) => {
    c.save(); headXf(c);
    c.fillStyle = ICE_DK; taper(c, [[1.6, -2.4], [-1.4, -4.6], [-4.6, -6]], [1.6, 1, 0.4]);
    const hinge = [1.2, 0.7], J = (pt) => rot(pt, hinge, jaw);
    if (jaw) fillPoly(c, [hinge, [8.6, 0.5], J([8.2, 0.8]), J([3, 1.6])], k.windup || k.breath ? "#cfeeff" : "#3a2a3e");
    c.fillStyle = tone(c, 0, 0, 0, 3, col, 0.2, 0.4);
    curve(c, [[0.8, 0.9], J([8.4, 0.7]), J([8, 1.7]), J([4.4, 2.4]), [0.4, 2.2]]); c.fill();
    if (jaw > 0.2) { c.fillStyle = ICE_LT; for (const x of [4, 6, 7.6]) { const t = J([x, 0.9]); poly(c, [[t[0] - 0.4, t[1] + 0.3], [t[0], t[1] - 1], [t[0] + 0.4, t[1] + 0.3]]); c.fill(); } }
    c.fillStyle = tone(c, 0, -4, 0, 1.5, col, 0.32, 0.4);
    curve(c, [[-1.2, -1.2], [0.4, -3.2], [3.2, -3.4, 1], [5, -2.4], [8, -1.6], [9.6, -0.6, 1], [8.8, 0.5], [4.4, 0.7], [1.6, 1.1], [-1, 1.4]]); c.fill();
    c.fillStyle = darken(col, 0.42); poly(c, [[1.8, -2.6], [5.4, -2.1], [5.2, -1.6], [2, -2]]); c.fill();
    c.fillStyle = "#1e2430"; c.fillRect(8.4, -1, 0.7, 0.5);
    c.fillStyle = p.eyes || "#e0f8ff"; c.fillRect(3, -1.9, 1.5, 0.8);
    c.fillStyle = "#1e2430"; c.fillRect(3.9, -1.9, 0.4, 0.8);
    // the near crest: three icicles swept back off the skull
    for (const [x0, y0, x1, y1, w] of [[0.6, -2.8, -4.2, -6.4, 1.8], [2, -3.2, -1.8, -7.6, 1.5], [-0.4, -1.4, -4.8, -3, 1.3]]) {
      c.fillStyle = ICE; taper(c, [[x0, y0], [x1, y1]], [w, 0.3]);
      c.fillStyle = ICE_LT; taper(c, [[x0 - 0.2, y0 - 0.2], [lerp([x0, y0], [x1, y1], 0.6)[0] - 0.2, lerp([x0, y0], [x1, y1], 0.6)[1] - 0.2]], [w * 0.4, 0.2]);
    }
    c.restore();
  });
  // near legs, then the near wing over everything
  hind([0, 0], col); fore([0, 0], col);
  drakeWing(ctx, [2, -23.5 + b], key, 0.6, mem, lighten(col, 0.1));
  // the cold in the throat, then the breath
  const HP = (pt) => { const r = rot(pt, [0, 0], k.head || 0); return [HB[0] + r[0], HB[1] + r[1]]; };
  if (k.windup) {
    glow(ctx, ...lerp(NK[1], NK[2], 0.5), 4, "#9ad8f8", 0.55);
    const m = HP([8.6, 0.8]); glow(ctx, m[0], m[1], 2.2, "#e8faff", 0.8);
  }
  if (k.breath) {
    const bk = k.breath;
    // the gust: a pale fan of mist (never inked) with a bright core of rime in it
    ctx.save(); headXf(ctx); ctx.translate(8.6, 1); ctx.rotate(0.14);
    ctx.fillStyle = `rgba(214,240,252,${0.34 * bk})`;
    curve(ctx, [[0, -0.8], [6 * bk + 3, -3.6], [12 * bk + 3, -5.6], [17 * bk + 2, -3.4], [18 * bk + 2, 1, 1], [16 * bk + 2, 4.6], [10 * bk + 3, 5], [5, 2.8], [0, 1]]); ctx.fill();
    ctx.restore();
    if (bk >= 1) part(ctx, (c) => {
      c.save(); headXf(c); c.translate(8.6, 1); c.rotate(0.14);
      c.fillStyle = tone(c, 0, -3, 0, 3, "#bfe6f8", 0.3, 0.2);
      curve(c, [[0, -0.5], [5, -1.8], [10, -2.6], [13.6, -1.2], [12, 0.6, 1], [14, 2], [9, 2.4], [4, 1.4], [0, 0.6]]); c.fill();
      c.fillStyle = ICE_LT; curve(c, [[0.4, -0.2], [4, -0.8], [8, -0.8], [6, 0.6], [3, 0.8], [0.4, 0.4]]); c.fill();
      c.restore();
    });
    // rime crystals carried on it
    ctx.save(); headXf(ctx); ctx.translate(8.6, 1); ctx.rotate(0.14);
    ctx.fillStyle = ICE_LT;
    for (const [x, y] of [[6, -3], [9, 2.6], [12, -4], [15, 0.6], [17, -2.4], [11, 4]]) if (x < 18 * bk + 1) ctx.fillRect(q(x), q(y), 1, 1);
    ctx.restore();
  }
  const eyeP = HP([3.8, -1.5]);
  glow(ctx, eyeP[0], eyeP[1], 2, p.eyes || "#e0f8ff", 0.5);
  ctx.restore();
};

// ---- the war-mammoth and the Jarl ---------------------------------------------------
// A lateral amble (each foot in turn, hind then fore on a side) on pillar legs
// with a shaggy hair skirt; a domed head, a trunk that swings, tusks that sweep
// forward and up, banded in iron. On its back a teal saddle cloth and a plank
// howdah hung with round shields; the Jarl sits in it, the howdah's near rail
// and shields drawn over his hips (so any standing figure can sit there).
// Leg roots: fore near 12, fore far 9.6, hind near -14, hind far -11.6; the
// feet are [dx from the root, lift].
const MAM_WALK = [
  { b: 0, fn: [4, 0], ff: [-3, 0], hn: [0.5, -3.2], hf: [3, 0] },
  { b: -0.5, fn: [1, 0], ff: [1.5, -3.2], hn: [4, 0], hf: [0, 0] },
  { b: 0, fn: [-3, 0], ff: [4, 0], hn: [1, 0], hf: [0.5, -3.2] },
  { b: -0.5, fn: [1.5, -3.2], ff: [1, 0], hn: [-3, 0], hf: [4, 0] },
];
const MAM_FIGHT = [
  // tusks levelled, braced, the trunk tucked
  { b: 0.5, rear: 0, head: 0.12, trunk: "tuck", fn: [5, 0], ff: [3, 0], hn: [-2, 0], hf: [0, 0] },
  // rear up and trumpet
  { b: 0, rear: -0.2, head: -0.1, trunk: "up", fn: [6, -9], ff: [4, -7], hn: [-1, 0], hf: [1, 0] },
  // forefeet down: the ice bursts
  { b: 1.5, rear: 0, head: 0.18, trunk: "down", fn: [5, 0], ff: [2, 0], hn: [-1, 0], hf: [1, 0], burst: 1 },
  // the tusk sweep
  { b: 0.8, rear: 0.03, head: -0.16, trunk: "curl", fn: [4, 0], ff: [2, 0], hn: [-1, 0], hf: [1, 0], burst: 0.5 },
];
const TRUNKS = {
  hang: (sw) => [[29, -40], [31, -32], [31.4 + sw, -24], [30.4 + sw, -16.4], [32 + sw, -12], [34 + sw, -13]],
  tuck: () => [[29, -40], [30.4, -31.6], [29.6, -24], [27.6, -18.4], [25.6, -17.6], [24.6, -19.4]],
  up: () => [[29, -42], [33.4, -47.4], [36, -54.4], [35, -60.4], [32.4, -62.6], [31, -61]],
  down: () => [[29, -40], [33, -33], [36.4, -26.4], [38.6, -19.6], [41, -17.4], [42.4, -18.6]],
  curl: () => [[29, -40], [32.6, -34], [33.4, -27], [31, -22.6], [28, -23.4], [28.6, -26.6]],
};
const MAM_LEN = 6;
const mammoth = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? MAM_FIGHT[f % 4] : MAM_WALK[f % 4];
  const s = (p.len ?? 60) / 60;
  const col = p.col, shag = p.mane, pale = p.belly, cape = p.cape, fur = p.cloth2, iron = "#6c727e", tusk = "#ece2c6", oak = "#7a5334";
  const far = darken(col, 0.3);
  const b = k.b, rear = k.rear || 0;
  shadow(ctx, 2, 0.6 * s, 30 * s, 4 * s, 0.34);
  if (k.burst) part(ctx, (c) => frostCracks(c, (12 + k.fn[0]) * s, 12 * k.burst * s), { ink: null });
  ctx.save(); ctx.scale(s, s);
  const pivot = [-14, 0];
  const R = (pt) => rot([pt[0], pt[1] + b], pivot, rear);
  const pillar = (root, foot, colr, near) => {
    const top = R(root), ft = [root[0] + foot[0], foot[1]];
    const kn = ik(top, [ft[0], ft[1] - 1.5], 12.6, 12.6, -1);
    leg(ctx, [top, kn, [ft[0], ft[1] - 1.5]], [10.4, 8.6, 8], colr, {
      hi: near ? lighten(colr, 0.12) : null,
      extra: (c) => {
        // shaggy locks down the shin, then the broad pad and its nails
        c.fillStyle = darken(colr, 0.22);
        for (const t of [0.15, 0.45]) { const m = lerp(kn, ft, t); c.fillRect(m[0] - 2.6, m[1], 0.6, 2.4); c.fillRect(m[0] + 0.6, m[1] + 0.8, 0.6, 2.2); }
        c.fillStyle = darken(colr, 0.15); c.beginPath(); c.ellipse(ft[0] + 0.4, ft[1] - 0.6, 5, 1.6, 0, 0, TAU); c.fill();
        c.fillStyle = near ? "#d8ccb0" : "#a89c84"; for (const x of [-2.4, 0.2, 2.8]) { c.beginPath(); c.ellipse(ft[0] + x + 0.6, ft[1] - 0.9, 1, 0.7, 0, 0, TAU); c.fill(); }
      },
    });
    return ft;
  };
  // far legs, in shade, then the near legs: the coat's hanging hair falls over their tops
  pillar([-11.6, -24], k.hf, far, false);
  const ffFoot = pillar([9.6, -25], k.ff, far, false);
  pillar([-14, -24], k.hn, col, true);
  const fnFoot = pillar([12, -25], k.fn, col, true);
  // the body, the head and all that rides it turn about the hind feet when it rears
  ctx.save();
  ctx.translate(pivot[0], pivot[1]); ctx.rotate(rear); ctx.translate(-pivot[0], -pivot[1]);
  ctx.translate(0, b);
  const headPiv = [17, -44];
  const HX = (c) => { c.translate(headPiv[0], headPiv[1]); c.rotate(k.head || 0); c.translate(-headPiv[0], -headPiv[1]); };
  // far tusk, behind everything of the head
  const tuskPts = [[27, -35], [31, -28], [37, -25], [42, -28], [44.4, -34], [42.6, -38.4]];
  const tuskW = [3.6, 3.2, 2.8, 2.2, 1.5, 0.8];
  part(ctx, (c) => { c.save(); HX(c); c.translate(-2.4, -1.4); c.fillStyle = darken(tusk, 0.3); taper(c, tuskPts, tuskW); c.restore(); });
  // the long tail, a tuft at its end
  part(ctx, (c) => {
    c.strokeStyle = darken(col, 0.2); c.lineWidth = 1.6; c.lineCap = "round";
    c.beginPath(); c.moveTo(-25, -34); c.quadraticCurveTo(-29, -30, -28.4, -24 + (fight ? 0 : f % 2)); c.stroke();
    fillPoly(c, [[-29.8, -25 + (fight ? 0 : f % 2)], [-27, -25], [-28.4, -20.6]], shag);
  });
  // the body: a great hump over the shoulders falling to the rump, the
  // shaggy coat hanging in a fringe along the belly
  const body = [[20, -36], [19.4, -25], [15, -19.6], [11, -16.4, 1], [9, -18.4], [6.6, -15.4, 1], [4, -17.6], [1.4, -15, 1], [-1.6, -17.4], [-4.4, -15, 1], [-7, -17.4], [-10, -15.2, 1], [-12.6, -17.6], [-15.6, -15.8, 1], [-18, -18.6], [-23, -23], [-25.6, -31], [-23, -40], [-15, -47], [-4, -52.4], [6, -54.6], [13.4, -52.6], [18, -46]];
  part(ctx, (c) => {
    c.fillStyle = tone(c, -10, -56, 6, -16, col, 0.28, 0.42);
    curve(c, body); c.fill();
    c.save(); curve(c, body); c.clip();
    // the long dark hair of the flank and belly, in hanging locks
    c.fillStyle = shag;
    curve(c, [[22, -30], [16, -17], [-20, -17], [-26, -26], [-22, -27, 1], [-19, -24, 1], [-16, -27.4, 1], [-12.6, -24.4, 1], [-9, -27.6, 1], [-5.4, -24.6, 1], [-1.6, -27.6, 1], [2, -24.6, 1], [5.6, -27.6, 1], [9, -24.6, 1], [12.6, -27.6, 1], [16, -25, 1], [19, -29.6, 1]]); c.fill();
    c.fillStyle = darken(shag, 0.3);
    for (let x = -20; x < 18; x += 3.6) c.fillRect(x, -22, 0.6, 4.4);
    // rime on the hump: the frost-white tips of the coat
    c.fillStyle = pale;
    for (const [x, y] of [[-12, -47], [-6, -50.4], [0, -52.4], [6, -53], [11, -51.6], [-17, -43], [-21, -37], [-8.6, -48.2], [3, -51.6]]) c.fillRect(x, y, 1.4, 0.6);
    c.restore();
  });
  // the saddle cloth and its fur hem, the girth strap under the belly
  part(ctx, (c) => {
    c.fillStyle = tone(c, -12, -54, 12, -28, cape, 0.25, 0.42);
    curve(c, [[-14, -48.4, 1], [-4, -53.4], [8, -54.8], [14.4, -51.6, 1], [15, -36, 1], [-14.4, -36.6, 1]]); c.fill();
    c.fillStyle = "#e8e2d0"; for (let x = -12; x < 13; x += 3) poly(c, [[x, -42], [x + 1.5, -43.6], [x + 3, -42], [x + 1.5, -40.4]]), c.fill();
    c.fillStyle = tone(c, 0, -38, 0, -34, fur, 0.2, 0.35);
    curve(c, [[-15, -37.6], [15.6, -37], [15.4, -34, 1], [13.6, -35.2], [12, -33.4, 1], [10, -35], [8, -33.2, 1], [6, -35], [4, -33.2, 1], [2, -35], [0, -33.2, 1], [-2, -35], [-4, -33.2, 1], [-6, -35], [-8, -33.2, 1], [-10, -35], [-12, -33.2, 1], [-14, -35], [-15.4, -33.6, 1]]); c.fill();
    c.fillStyle = "#4a3426"; c.fillRect(2, -34, 2.2, 15);
  });
  // the head: domed, the ear small and flat, the eye deep in the hair
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 16, -60, 32, -34, col, 0.3, 0.42);
    curve(c, [[15.6, -51], [19, -58.6], [24.6, -59.6], [29.6, -54], [31.4, -46], [30.6, -38.6], [26.4, -33.4], [19.6, -35.4]]); c.fill();
    c.fillStyle = pale; for (const [x, y] of [[20, -58], [23.4, -59], [26.6, -57.4]]) c.fillRect(x, y, 1.4, 0.6);
    c.fillStyle = darken(col, 0.25); c.beginPath(); c.ellipse(19.6, -43.6, 2.4, 3.4, 0.2, 0, TAU); c.fill();      // the ear
    c.fillStyle = shag; poly(c, [[17, -40], [22, -38], [24, -33], [21.6, -34.6], [20.4, -31.6], [19, -34.4], [17, -33]]); c.fill();   // throat hair
    c.fillStyle = "#1e1620"; c.beginPath(); c.ellipse(25.4, -46.4, 0.9, 0.8, 0, 0, TAU); c.fill();
    c.fillStyle = darken(col, 0.4); c.fillRect(24, -48.2, 3, 0.6);
    c.restore();
  });
  // the trunk, ringed with creases
  const tr = (k.trunk ? TRUNKS[k.trunk]() : TRUNKS.hang(f % 2 ? 0.8 : -0.6));
  const trp = spline(tr, 3), trw = trp.map((_, i) => 6.4 - (i / (trp.length - 1)) * 4.2);
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 26, -60, 40, -12, col, 0.25, 0.4); taper(c, trp, trw);
    c.fillStyle = darken(col, 0.3);
    for (let i = 2; i < trp.length - 1; i += 2) { const n = normalAt(trp, i, true); const w = trw[i] * 0.42; c.fillRect(trp[i][0] - Math.abs(n[1]) * w, trp[i][1] - Math.abs(n[0]) * w, Math.max(0.5, Math.abs(n[1]) * w * 2), Math.max(0.5, Math.abs(n[0]) * w * 2)); }
    c.restore();
  });
  // the near tusk, banded in iron
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 26, -40, 44, -24, tusk, 0.2, 0.32); taper(c, tuskPts, tuskW);
    c.fillStyle = iron; for (const i of [1, 2]) { const [x, y] = tuskPts[i]; c.beginPath(); c.ellipse(x, y, 1.1, tuskW[i] * 0.62, 0.5 + i * 0.4, 0, TAU); c.fill(); }
    c.restore();
  });
  // the howdah: a plank box lashed on, a banner pole at its back
  const seat = [1.6, -57];
  part(ctx, (c) => {
    c.strokeStyle = darken(oak, 0.3); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-9.6, -57); c.lineTo(-9.6, -75); c.stroke();
    c.fillStyle = tone(c, -24, -76, -10, -66, cape, 0.25, 0.4);
    const fl = fight ? 0 : (f % 2) * 0.8;
    curve(c, [[-9.6, -75.4, 1], [-21, -73.4 + fl], [-24.4, -72 - fl, 1], [-21, -70.6 + fl], [-9.6, -69, 1]]); c.fill();
    c.fillStyle = "#e8e2d0"; c.fillRect(-18, -73.2 + fl * 0.5, 4, 1);
    c.fillStyle = "#d8b34a"; c.beginPath(); c.arc(-9.6, -75.6, 0.9, 0, TAU); c.fill();
    // the box's back wall and floor (the Jarl sits in front of it)
    c.fillStyle = tone(c, -10, -61, 10, -53, oak, 0.25, 0.4); c.fillRect(-10.4, -61, 20.6, 5);
    c.fillStyle = darken(oak, 0.3); for (const x of [-5, 0, 5]) c.fillRect(x, -61, 0.5, 5);
  });
  ctx.restore();
  // the Jarl, then the howdah's near rail and shields over his hips
  const sw = rot([seat[0], seat[1] + b], pivot, rear);
  jarlSeat(ctx, p, sw, fight, f, 1 / s);
  part(ctx, (c) => {
    c.save(); c.translate(pivot[0], pivot[1]); c.rotate(rear); c.translate(-pivot[0], -pivot[1]); c.translate(0, b);
    c.fillStyle = tone(c, -11, -58, 11, -51, oak, 0.28, 0.42); c.fillRect(-11, -57.4, 22.4, 5.4);
    c.fillStyle = darken(oak, 0.35); c.fillRect(-11, -55, 22.4, 0.6);
    c.fillStyle = "#4a3426"; for (const x of [-11, 10.8]) c.fillRect(x, -58.4, 1.2, 8);
    c.restore();
  });
  part(ctx, (c) => {
    c.save(); c.translate(pivot[0], pivot[1]); c.rotate(rear); c.translate(-pivot[0], -pivot[1]); c.translate(0, b);
    for (const [x, i] of [[-6.4, 0], [0.6, 1], [7.6, 2]]) {
      const cy = -54.4;
      c.fillStyle = tone(c, x - 3, cy - 3, x + 3, cy + 3, i % 2 ? "#d8d0bc" : cape, 0.25, 0.4);
      c.beginPath(); c.arc(x, cy, 3, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(x, cy, 3, 0, TAU); c.clip();
      c.fillStyle = i % 2 ? cape : "#d8d0bc"; c.fillRect(x - 3, cy - 3, 3, 3); c.fillRect(x, cy, 3, 3);
      c.restore();
      c.fillStyle = iron; c.beginPath(); c.arc(x, cy, 0.9, 0, TAU); c.fill();
    }
    c.restore();
  });
  if (k.burst) { iceBurst(ctx, fnFoot[0] + 1, 7, k.burst); iceBurst(ctx, ffFoot[0] - 2, 5, k.burst * 0.7); }
  ctx.restore();
};
// The Jarl in the howdah: his figure is rigs-rime.js's (rimeJarlRider, hips
// at the seat, drawn at his own size — `inv` undoes the mammoth's scale).
// His colours ride in the mammoth's skin / cloth / cloth2 / hair, so revive()
// reaches them; his cape, frost stones and beard keep RIME_JARL's.
const jarlSeat = (ctx, p, at, fight, f, inv) => {
  ctx.save(); ctx.translate(at[0], at[1]); ctx.scale(inv, inv);
  rimeJarlRider(ctx, { skin: p.skin, cloth: p.cloth, cloth2: p.cloth2, hair: p.hair, eyes: RIME_JARL.eyes }, fight, f % 4);
  ctx.restore();
};

// ---- the sea serpent -----------------------------------------------------------------
// The anchor is the water's surface. Its body is one centreline: humps rolling
// back along a wave behind the neck (y > 0 under the water), then the neck
// rising through control points to the head. Above the surface it is solid;
// under it a dim, sea-tinted refraction; foam collars where it cuts through.
// pose: A (hump height), ph (the wave's phase), neck (control points from the
// waterline up), tilt / jaw (the head), dep (the whole beast sunk this far),
// fins (fin tips only, the submerged swim), fluke (the tail flung up, a dive),
// fx: "bulge" | "spray" | "drip" | "splash" | "rings".
const SERP_WALK = (f) => ({ A: 5, ph: f * PI / 2, neck: [[10, -6 + [0, 0.8, 0, -0.8][f]], [11.6, -12], [14.2, -16.6]], tilt: 0.14, jaw: 0.05 });
const SERP_FIGHT = [
  { A: 4, ph: 0.4, neck: [[9, -10], [8, -20], [12, -28]], tilt: 0.22, jaw: 0.1 },              // reared, watching
  { A: 4, ph: 0.9, neck: [[8, -12], [5, -24], [8, -31]], tilt: -0.34, jaw: 0.55 },             // the hiss: drawn back, jaws wide
  { A: 3.4, ph: 1.4, neck: [[12, -10], [20, -14], [26, -10]], tilt: 0.55, jaw: 0.7, fx: "spray" },  // the strike
  { A: 3.4, ph: 1.9, neck: [[11, -7], [17, -9], [22, -5]], tilt: 0.32, jaw: 0.14, fx: "splash" },  // follow-through, the head in the spray
];
const SERP_EXTRA = {
  sub: (f) => ({ A: 4, ph: f * PI / 2, neck: [[10, 3], [13, 4], [16, 4.6]], tilt: 0, jaw: 0, dep: 6, fins: true }),
  surface: (f) => [
    { A: 3, ph: 0, neck: [[10, 3], [13, 2], [15, 2.4]], tilt: -0.2, jaw: 0, dep: 5, fx: "bulge" },
    { A: 3, ph: 0.4, neck: [[10, -3], [12, -6], [13, -8]], tilt: -0.7, jaw: 0, dep: 2, fx: "spray" },
    { A: 3.4, ph: 0.8, neck: [[10, -6], [11.4, -11], [13.4, -15]], tilt: -0.1, jaw: 0.1, fx: "drip" },
    { ...SERP_FIGHT[0], fx: "drip" },
  ][f % 4],
  dive: (f) => [
    { A: 4, ph: 0.6, neck: [[11, -10], [17, -10], [20, -4]], tilt: 1.2, jaw: 0 },
    { A: 4, ph: 1.2, neck: [[12, -7], [17, -4], [19, 2]], tilt: 1.45, jaw: 0, fx: "splash", at: 18.6 },
    { A: 3, ph: 1.8, neck: [[10, 3], [13, 4], [16, 4.6]], tilt: 0, jaw: 0, dep: 4, fluke: true, fx: "rings", at: 16 },
    { A: 3, ph: 2.4, neck: [[10, 3], [13, 4], [16, 4.6]], tilt: 0, jaw: 0, dep: 9, fx: "rings", at: -4 },
  ][f % 4],
};
const serpentLine = (k) => {
  const pts = [], X0 = 7, X1 = -31, lam = 15;
  for (let x = X1; x <= X0 + 0.01; x += 1.5) {
    const env = Math.min(1, (X0 - x) / 4);
    pts.push([x, 1.6 - k.A * env * Math.sin((2 * PI * (X0 - x)) / lam - k.ph) + (k.dep || 0)]);
  }
  const base = pts[pts.length - 1];
  const neck = spline([base, ...k.neck.map(([x, y]) => [x, y + (k.dep || 0)])], 4);
  const all = pts.concat(neck.slice(1));
  const nb = pts.length;
  const ws = all.map((_, i) => (i < nb ? 1.6 + 4.4 * Math.pow(i / (nb - 1), 0.7) : 6 - 1.6 * ((i - nb) / (all.length - nb))));
  return { all, ws, nb };
};
const serpentHead = (c, C, p, k, at) => {
  const col = C(p.col), belly = C(p.belly), fin = C(p.mane);
  c.save(); c.translate(at[0], at[1]); c.rotate(k.tilt);
  const jaw = k.jaw, hinge = [1, 1], J = (pt) => rot(pt, hinge, jaw);
  // the frill fanned behind the jaw, ice-blue, ribbed
  c.fillStyle = fin;
  curve(c, [[0.4, -1.4], [-4, -4.6, 1], [-3.2, -2.2], [-6, -0.8, 1], [-3.4, 0.4], [-5.2, 3, 1], [-1, 2], [0.6, 1]]); c.fill();
  c.fillStyle = darken(fin, 0.3); for (const a of [-0.6, 0.1, 0.8]) { c.save(); c.rotate(a); c.fillRect(-4, -0.25, 3.6, 0.5); c.restore(); }
  if (jaw) fillPoly(c, [hinge, [9.6, 0.8], J([9.2, 1]), J([3, 2])], C("#4a1a28"));
  c.fillStyle = tone(c, 0, 0, 0, 3, col, 0.2, 0.4);
  curve(c, [[0.6, 1], J([9.4, 0.9]), J([9, 1.9]), J([5, 2.7]), [0.4, 2.5]]); c.fill();
  c.fillStyle = belly; curve(c, [J([2, 2.4]), J([5, 2.4]), J([8.4, 1.8]), J([5, 2.8])]); c.fill();
  if (jaw > 0.2) { c.fillStyle = C(ICE_LT); for (const x of [3.6, 5.8, 8]) { const t = J([x, 1.1]); poly(c, [[t[0] - 0.4, t[1] + 0.3], [t[0], t[1] - 1.2], [t[0] + 0.4, t[1] + 0.3]]); c.fill(); } poly(c, [[7.6, 0.6], [8.1, 2], [8.6, 0.6]]); c.fill(); }
  c.fillStyle = tone(c, 0, -4, 0, 1.5, col, 0.3, 0.42);
  curve(c, [[-1.6, -1.8], [0.8, -3.6], [4, -3.4], [7, -2.2], [9.8, -1], [10.6, 0.1, 1], [9.6, 0.9], [5, 1.1], [1.6, 1.7], [-1.4, 1.6]]); c.fill();
  // two horns of ice back off the brow, a ridge of scales
  c.fillStyle = C(ICE); taper(c, [[1.8, -3.2], [-1, -5.4], [-3.4, -6]], [1.4, 0.8, 0.3]);
  c.fillStyle = darken(col, 0.38); poly(c, [[2.2, -2.6], [5.8, -2], [5.6, -1.5], [2.4, -1.9]]); c.fill();
  c.fillStyle = C(p.eyes || "#e8f070"); c.fillRect(3.2, -1.8, 1.5, 0.9);
  c.fillStyle = "#1a1a22"; c.fillRect(4, -1.8, 0.4, 0.9);
  c.fillStyle = "#1a1a22"; c.fillRect(9.2, -0.7, 0.6, 0.5);
  c.restore();
};
const serpentBody = (c, C, p, k, L) => {
  const col = C(p.col), belly = C(p.belly), fin = C(p.mane);
  const { all, ws, nb } = L;
  // the frill down the back of the neck and the dorsal fin along the humps
  c.fillStyle = fin;
  for (let i = 3; i < all.length - 3; i += 2) {
    const n = normalAt(all, i, true);
    spike(c, add(all[i], [n[0] * ws[i] * 0.36, n[1] * ws[i] * 0.36]), n, i < nb ? 2 : 2.6, 0.9, 0.55);
  }
  c.fillStyle = tone(c, -20, -24, 10, 6, col, 0.32, 0.42); taper(c, all, ws);
  // the pale belly down the underside, and dark bands of scale across the back
  const und = all.map((pt, i) => { const n = normalAt(all, i, false); return add(pt, [n[0] * ws[i] * 0.26, n[1] * ws[i] * 0.26]); });
  c.fillStyle = belly; taper(c, und, ws.map((w) => w * 0.42));
  c.fillStyle = darken(col, 0.3);
  for (let i = 2; i < all.length - 2; i += 3) { const n = normalAt(all, i, true); const pt = add(all[i], [n[0] * ws[i] * 0.22, n[1] * ws[i] * 0.22]); c.fillRect(pt[0] - 0.5, pt[1] - 0.5, 1, 1); }
  // the tail's fluke (flung up on a dive)
  const t0 = all[0], fl = k.fluke ? [-24, -9 + (k.dep || 0) * 0] : null;
  if (fl) { c.fillStyle = tone(c, -30, -16, -18, 0, col, 0.3, 0.4); taper(c, [[-22, 2], [-24, -4], [-26, -8]], [3, 2.4, 1.6]); c.fillStyle = fin; curve(c, [[-26, -8], [-31, -13, 1], [-27.4, -9.4], [-28.6, -4.4, 1], [-25, -6.6]]); c.fill(); }
  else { c.fillStyle = fin; curve(c, [[t0[0] + 1, t0[1]], [t0[0] - 3.4, t0[1] - 2.6, 1], [t0[0] - 2, t0[1]], [t0[0] - 3.4, t0[1] + 2.4, 1]]); c.fill(); }
};
const seaserpent = (ctx, p) => {
  const fight = p.pose === "fight";
  let k;
  if (typeof p.frame === "string") { const [sh, n] = p.frame.split("."); k = (SERP_EXTRA[sh] || SERP_EXTRA.sub)(Number(n) || 0); }
  else k = fight ? SERP_FIGHT[(p.frame || 0) % 4] : SERP_WALK((p.frame || 0) % 4);
  const s = (p.len ?? 40) / 40;
  ctx.save(); ctx.scale(s, s);
  const L = serpentLine(k);
  const head = L.all[L.all.length - 1];
  const draw = (c, C) => { serpentBody(c, C, p, k, L); serpentHead(c, C, p, k, head); };
  submerged(ctx, draw, k.dep > 5 ? 0.3 : 0.26);
  if (k.fins) {
    // fin tips slicing the surface over the humps, a vee of wake behind each
    part(ctx, (c) => { c.fillStyle = p.mane; for (const x of [-20, -5, 9]) fillPoly(c, [[x - 1.6, 0.4], [x - 2.6, -2.6], [x + 1.2, 0.4]], p.mane); });
    for (const x of [-20, -5, 9]) {
      ctx.fillStyle = "rgba(226,240,246,0.4)";
      for (let i = 1; i < 4; i++) { ctx.fillRect(x - 2 - i * 2.4, 0.4 - i * 0.5, 1.6, 0.5); ctx.fillRect(x - 2 - i * 2.4, 0.9 + i * 0.5, 1.6, 0.5); }
      ctx.fillStyle = FOAM; ctx.fillRect(x - 2, 0.2, 3.4, 0.6);
    }
  } else {
    above(ctx, draw);
    // foam wherever the line cuts the surface
    const { all, ws } = L;
    for (let i = 1; i < all.length; i++) if ((all[i - 1][1] > 0) !== (all[i][1] > 0)) foam(ctx, (all[i - 1][0] + all[i][0]) / 2, ws[i] * 0.8, 0.8);
  }
  const at = k.at ?? head[0];
  if (k.fx === "bulge") { ctx.fillStyle = "rgba(226,240,246,0.15)"; ctx.beginPath(); ctx.ellipse(14, 0, 7, 1.8, 0, 0, TAU); ctx.fill(); foam(ctx, 14, 5); spray(ctx, 14, 4, 3, 2); }
  if (k.fx === "spray") { spray(ctx, at, 5, 8, 3); spray(ctx, 10, 4, 6, 5); }
  if (k.fx === "splash") { foam(ctx, at, 5, 1.3); spray(ctx, at, 6, 7, 4); }
  if (k.fx === "drip") { ctx.fillStyle = FOAM; for (const [x, y] of [[head[0] - 2, head[1] + 4], [head[0] + 4, head[1] + 6], [11, -9], [12.4, -4]]) ctx.fillRect(q(x), q(y), 0.5, 1); }
  if (k.fx === "rings") { rings(ctx, at, 6, 1); ctx.fillStyle = FOAM; for (const [x, y] of [[at - 2, -1], [at + 1, -2.4], [at + 3, -0.6]]) ctx.fillRect(q(x), q(y), 1, 1); }
  if (!k.fins && !k.dep && head[1] < -2) glow(ctx, ...add(head, rot([3.9, -1.4], [0, 0], k.tilt)), 1.8, p.eyes || "#e8f070", 0.45);
  ctx.restore();
};

// ---- the kraken -----------------------------------------------------------------------
// One tentacle: from base along ang0 (radians, -PI/2 straight up), turning by
// curl over its length (most of it toward the tip as pow rises): suckers on
// the inner face of the turn. o.floor lays any part that would go below the
// ground (y > -0.8) along it — a slam.
const tentLine = (base, ang0, curl, pow, len, o = {}) => {
  const N = 16, seg = len / N, pts = [base.slice()];
  let [x, y] = base;
  for (let i = 1; i <= N; i++) {
    const a = ang0 + curl * Math.pow(i / N, pow);
    x += Math.cos(a) * seg; y += Math.sin(a) * seg;
    if (o.floor && y > -0.8) y = -0.8;
    pts.push([x, y]);
  }
  return pts;
};
const tentacle = (c, C, pts, curl, w0, col, belly) => {
  const N = pts.length - 1, ws = pts.map((_, i) => w0 * Math.pow(1 - i / N, 0.85) + 0.7);
  const side = curl >= 0 ? 1 : -1;
  const nrm = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * side, dx / l * side]; };
  c.fillStyle = tone(c, pts[0][0] - 10, pts[0][1] - 30, pts[0][0] + 10, pts[0][1], C(col), 0.3, 0.42); taper(c, pts, ws);
  // the inner face: pale, with a row of suckers
  const inn = pts.map((pt, i) => { const n = nrm(i); return [pt[0] + n[0] * ws[i] * 0.26, pt[1] + n[1] * ws[i] * 0.26]; });
  c.fillStyle = C(belly); taper(c, inn, ws.map((w) => w * 0.44));
  for (let i = 2; i < N; i++) {
    const n = nrm(i), r = ws[i] * 0.17, pt = [pts[i][0] + n[0] * ws[i] * 0.34, pts[i][1] + n[1] * ws[i] * 0.34];
    c.fillStyle = C(lighten(belly, 0.25)); c.beginPath(); c.ellipse(pt[0], pt[1], Math.max(0.5, r), Math.max(0.5, r * 0.8), 0, 0, TAU); c.fill();
    if (r > 0.6) { c.fillStyle = C(darken(belly, 0.35)); c.fillRect(pt[0] - 0.25, pt[1] - 0.25, 0.5, 0.5); }
  }
  // darker mottling along the outer face
  c.fillStyle = C(darken(col, 0.3));
  for (let i = 1; i < N - 2; i += 2) { const n = nrm(i); const pt = [pts[i][0] - n[0] * ws[i] * 0.22, pts[i][1] - n[1] * ws[i] * 0.22]; c.fillRect(pt[0] - 0.5, pt[1] - 0.5, 1, 1); }
};
// where a centreline cuts the surface (for the foam)
const crossings = (pts) => { const out = []; for (let i = 1; i < pts.length; i++) if ((pts[i - 1][1] > 0) !== (pts[i][1] > 0)) out.push((pts[i - 1][0] + pts[i][0]) / 2); return out; };

// the arm: a pose is [ang0, curl, pow, o]
const ARM_WALK = (f) => ({ a: -PI / 2 - 0.08 + 0.13 * Math.sin((f / 4) * TAU), curl: 2.4 + 0.5 * Math.cos((f / 4) * TAU), pow: 2.4 });
const ARM_FIGHT = [
  { a: -1.78, curl: 3.6, pow: 2.8 },                    // raised high, the tip curled over
  { a: -2.02, curl: 1.2, pow: 1.4 },                    // arched back
  { a: -1.0, curl: 1.95, pow: 1.0, floor: true, fx: "slam" },   // SLAM: laid along the ground ahead
  { a: -0.55, curl: 0.75, pow: 1.2, floor: true, fx: "dust" },  // dragged back
];
const ARM_EXTRA = {
  rise: (f) => ({ ...ARM_WALK(0), dep: [0.8, 0.55, 0.25, 0][f % 4], fx: f % 4 < 3 ? "burst" : "drip" }),
  grab: (f) => [
    { a: -1.2, curl: 1.0, pow: 1.5 },
    { a: -1.3, curl: 5.4, pow: 3.4 },
    { a: -1.42, curl: 6.2, pow: 4 },
    { a: -1.78, curl: 6.2, pow: 4 },
  ][f % 4],
  sink: (f) => ({ ...ARM_WALK(0), a: -PI / 2 + 0.25 * (f % 4), dep: [0.15, 0.4, 0.7, 0.95][f % 4], fx: "rings" }),
};
const krakenarm = (ctx, p) => {
  const fight = p.pose === "fight";
  let k;
  if (typeof p.frame === "string") { const [sh, n] = p.frame.split("."); k = (ARM_EXTRA[sh] || ARM_EXTRA.rise)(Number(n) || 0); }
  else k = fight ? ARM_FIGHT[(p.frame || 0) % 4] : ARM_WALK((p.frame || 0) % 4);
  const len = p.len ?? 44, w0 = p.w ?? 8;
  const dep = (k.dep || 0) * len;
  const pts = tentLine([0, 2 + dep], k.a, k.curl, k.pow, len + 2, { floor: k.floor });
  const draw = (c, C) => tentacle(c, C, pts, k.curl, w0, p.col, p.belly);
  // it bursts up through the shore's ice and shingle (engine: up to `inland`
  // px from the waterline): a hole of black water, broken ice heaved round it
  const hw = w0 * 0.95;
  part(ctx, (c) => {
    c.fillStyle = "#16303a"; c.beginPath(); c.ellipse(0.4, 0.6, hw, hw * 0.34, 0, 0, TAU); c.fill();
    c.fillStyle = "#2a5464"; c.beginPath(); c.ellipse(0.8, 0.9, hw * 0.7, hw * 0.2, 0, 0, TAU); c.fill();
  });
  above(ctx, draw);
  part(ctx, (c) => {
    // the near lip of the hole, and slabs of ice tipped up round it
    for (const [dx, dy, w, h, tilt] of [[-hw - 0.6, 0.2, 3.2, 1.8, -0.5], [-hw * 0.4, 1.6, 3.4, 1.6, 0.15], [hw * 0.45, 1.6, 3, 1.5, -0.2], [hw + 0.4, 0.1, 3, 1.9, 0.55]]) {
      c.save(); c.translate(dx, dy); c.rotate(tilt);
      c.fillStyle = ICE_DK; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = ICE_LT; c.fillRect(-w / 2, -h / 2, w, h * 0.45);
      c.restore();
    }
  });
  const tip = pts[pts.length - 1];
  if (k.fx === "burst") { spray(ctx, pts[0][0], 7, 10, 1); spray(ctx, 2, 5, 6, 6); }
  if (k.fx === "drip") { ctx.fillStyle = FOAM; for (const i of [5, 9, 13]) ctx.fillRect(q(pts[i][0] + 2), q(pts[i][1] + 1.5), 0.5, 1); }
  if (k.fx === "slam") { part(ctx, (c) => frostCracks(c, tip[0] - 4, 9), { ink: null }); spray(ctx, tip[0] - 3, 7, 7, 3); iceBurst(ctx, tip[0] - 2, 5, 0.6); }
  if (k.fx === "dust") { ctx.fillStyle = "rgba(226,240,246,0.3)"; ctx.beginPath(); ctx.ellipse(tip[0] - 6, -0.6, 8, 1.6, 0, 0, TAU); ctx.fill(); }
  if (k.fx === "rings") rings(ctx, 0, w0 * 0.8, 1 - (k.dep || 0) * 0.5);
};

// the body: pose { h (mantle height), up (risen extra), roar (beak 0-1),
// arms (arm-root curl), look (pupil), dep (sunk), tilt }
const KRAKEN_WALK = (f) => ({ h: 46 + [0, 0.5, 1, 0.5][f], arms: [0.5, 0.7, 0.85, 0.65][f], look: [0, 0.3, 0, -0.3][f], narrow: 0.3 });
const KRAKEN_FIGHT = [
  { h: 46, arms: 0.6, narrow: 1 },
  { h: 49, up: 3, arms: 0.9, narrow: 1 },
  { h: 50, up: 4, arms: 1.2, roar: 1, narrow: 0.4, fx: "spray" },
  { h: 47, up: 1, arms: 0.5, roar: 0.25 },
];
const KRAKEN_EXTRA = {
  rise: (f) => ({ h: 46, arms: 0, dep: [44, 28, 14, 4][f % 4], fx: f % 4 < 3 ? "bulge" : "drip" }),
  sink: (f) => ({ h: 46, arms: -0.2, dep: [6, 18, 32, 48][f % 4], tilt: -0.04 * (f % 4 + 1), fx: "bubbles" }),
};
const kraken = (ctx, p) => {
  const fight = p.pose === "fight";
  let k;
  if (typeof p.frame === "string") { const [sh, n] = p.frame.split("."); k = (KRAKEN_EXTRA[sh] || KRAKEN_EXTRA.rise)(Number(n) || 0); }
  else k = fight ? KRAKEN_FIGHT[(p.frame || 0) % 4] : KRAKEN_WALK((p.frame || 0) % 4);
  const s = (p.len ?? 40) / 40;
  const col = p.col, belly = p.belly, dark = p.mane;
  ctx.save(); ctx.scale(s, s);
  const dep = k.dep || 0, up = k.up || 0, H = k.h + up;
  const Y = (y) => y + dep - up * 0.2;
  // arm roots round the base: [base x, ang0, curl, len, w]; the far pair first
  const ar = k.arms;
  const ARMS_FAR = [[-15, -1.95 + ar * 0.25, -3.4 + ar * 0.6, 28 + ar * 4, 6], [15, -1.2 - ar * 0.25, 3.4 - ar * 0.6, 28 + ar * 4, 6]];
  const ARMS_NEAR = [[-9.5, -2.35 + ar * 0.3, -3.8 + ar * 0.8, 23 + ar * 4, 6.6], [10.5, -0.8 - ar * 0.3, 3.8 - ar * 0.8, 23 + ar * 4, 6.6]];
  const armPts = (arr) => arr.map(([x, a, cu, l, w]) => [tentLine([x, Y(2)], a, cu, 2.2, l), cu, w]);
  const far = armPts(ARMS_FAR), near = armPts(ARMS_NEAR);
  // a bulbous sac leaning back over the brow, the head broad at the water
  const mantle = [[-17.6, Y(3)], [-19, Y(-8)], [-16.4, Y(-18)], [-19.4, Y(-27)], [-21, Y(-H + 8)], [-15, Y(-H - 1)], [-5, Y(-H - 2)], [3, Y(-H + 5)], [6.4, Y(-34)], [11, Y(-24)], [16.6, Y(-15)], [18.4, Y(-5)], [16.6, Y(3)]];
  const draw = (c, C) => {
    for (const [pts, cu, w] of far) tentacle(c, (x) => C(darken(x, 0.25)), pts, cu, w, col, belly);
    c.save(); c.translate(0, Y(0)); c.rotate(k.tilt || 0); c.translate(0, -Y(0));
    // the mantle: a great lumpy dome, mottled, pale spots, creased at the brow
    c.fillStyle = tone(c, -18, Y(-H), 18, Y(2), C(col), 0.3, 0.42); curve(c, mantle); c.fill();
    c.save(); curve(c, mantle); c.clip();
    c.fillStyle = C(darken(col, 0.28));
    // the sac's shade on its underside, mottling, pale spots, the brow's folds
    c.fillStyle = C(darken(col, 0.18)); c.beginPath(); c.ellipse(2, Y(-27), 9, 4, -0.5, 0, TAU); c.fill();
    c.fillStyle = C(darken(col, 0.3));
    for (const [x, y, rx, ry] of [[-12, -38, 3, 4], [-4, -44, 2.6, 2.6], [-15, -26, 2, 3], [4, -18, 2, 2.4], [-11, -14, 2.2, 2.4]]) { c.beginPath(); c.ellipse(x, Y(y), rx, ry, 0, 0, TAU); c.fill(); }
    c.fillStyle = C(belly);
    for (const [x, y] of [[-8, -40], [-16, -33], [-1, -38], [10, -16], [-14, -9], [-10, -46], [-4, -22], [14, -9], [-17, -20]]) { c.beginPath(); c.arc(x, Y(y - up * 0.1), 0.9, 0, TAU); c.fill(); }
    // the lower face and the beak's lips
    c.fillStyle = C(mix(col, belly, 0.18)); c.beginPath(); c.ellipse(1, Y(-3.4), 9, 4.6, 0, 0, TAU); c.fill();
    c.restore();
    // eyes: great, gold, a thick bar of a pupil; a lid slanting down toward
    // the beak cuts across the top of each, under a hard brow ridge
    const narrow = k.narrow || 0;
    for (const [ex, ey, r, ff] of [[-7.4, -13, 3, 0.75], [8.2, -12.4, 3.8, 1]]) {
      const ey2 = Y(ey), inward = ex < 0 ? 1 : -1;
      const lidOut = ey2 - r * (0.95 - narrow * 0.3), lidIn = ey2 - r * (0.2 - narrow * 0.25);
      const P = (side, y) => [ex + side * inward * (r + 2), y];
      c.fillStyle = C(darken(col, 0.42)); c.beginPath(); c.ellipse(ex, ey2, r + 1.1, r * 0.86 + 1, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(ex, ey2, r, r * 0.8, 0, 0, TAU); c.clip();
      c.fillStyle = C(p.eyes || "#f0d050"); c.fillRect(ex - r, ey2 - r, r * 2, r * 2);
      c.fillStyle = C(darken(p.eyes || "#f0d050", 0.3)); c.fillRect(ex - r, ey2 + r * 0.35, r * 2, r);
      c.fillStyle = "#1a1018"; c.fillRect(ex - r * 0.55 + (k.look || 0) * ff, ey2 - 0.7, r * 1.1, 1.5);
      c.fillStyle = C(darken(col, 0.2)); poly(c, [P(-1, ey2 - r - 1), P(1, ey2 - r - 1), P(1, lidIn), P(-1, lidOut)]); c.fill();
      c.restore();
      // the ridge along the lid's edge, running on past the eye
      c.strokeStyle = C(darken(col, 0.5)); c.lineWidth = 1.3; c.lineCap = "round";
      c.beginPath(); c.moveTo(...P(-1.15, lidOut - 0.9)); c.lineTo(...P(1.1, lidIn - 0.2)); c.stroke();
      c.fillStyle = C(lighten(p.eyes || "#f0d050", 0.5)); c.fillRect(ex - r * 0.1 * inward - 0.5, ey2 + r * 0.05, 1, 0.6);
    }
    // the beak: a black parrot's hook, cream at the tip; opened, a dark maw
    const ro = k.roar || 0, bx = 1.4, by = Y(-3.6);
    c.save(); c.translate(bx, by); c.scale(1.45, 1.45); c.translate(-bx, -by);
    if (ro) { c.fillStyle = C("#3a1420"); c.beginPath(); c.ellipse(bx + 0.4, by + 1.6 * ro, 4.6, 1 + 3.4 * ro, 0, 0, TAU); c.fill(); c.fillStyle = C("#7a2a3a"); c.beginPath(); c.ellipse(bx + 0.4, by + 2.6 * ro, 2.4, 1.6 * ro, 0, 0, TAU); c.fill(); }
    c.fillStyle = C("#2a1e26"); curve(c, [[bx - 3, by - 1.8], [bx + 0.6, by - 2.8], [bx + 3, by - 1.6], [bx + 3.4, by + 0.4], [bx + 1.4, by + 2.4 - ro * 0.8, 1], [bx + 0.6, by + 0.4 - ro * 0.6], [bx - 2.4, by + 0.2]]); c.fill();
    c.fillStyle = C("#5a4a50"); poly(c, [[bx - 1.6, by - 1.8], [bx + 1.8, by - 2], [bx + 0.4, by - 1.2]]); c.fill();
    c.fillStyle = C("#e0d4b4"); poly(c, [[bx + 2.2, by + 0.2 - ro * 0.6], [bx + 3.2, by + 0.2], [bx + 1.4, by + 2.4 - ro * 0.8]]); c.fill();
    if (ro) { c.fillStyle = C("#2a1e26"); curve(c, [[bx - 2.6, by + 1.4 + ro * 3.6], [bx + 2.8, by + 1.2 + ro * 3.6], [bx + 1.8, by + 3 + ro * 3.6, 1], [bx - 1.6, by + 2.8 + ro * 3.6]]); c.fill(); }
    c.restore();
    c.restore();
    for (const [pts, cu, w] of near) tentacle(c, C, pts, cu, w, col, belly);
  };
  submerged(ctx, draw, 0.28);
  above(ctx, draw);
  // the sea heaving round it: a long foam collar, a foam ring where each arm cuts
  if (dep < 40) foam(ctx, 0, 17, 1.4);
  for (const [pts, , w] of near.concat(far)) for (const x of crossings(pts)) foam(ctx, x, w * 0.7, 0.8);
  if (k.fx === "spray") { spray(ctx, -10, 8, 10, 2); spray(ctx, 10, 8, 10, 7); }
  if (k.fx === "bulge") { ctx.fillStyle = "rgba(226,240,246,0.15)"; ctx.beginPath(); ctx.ellipse(0, 0, 24, 3.4, 0, 0, TAU); ctx.fill(); spray(ctx, 0, 14, 9, 4); }
  if (k.fx === "drip") { ctx.fillStyle = FOAM; for (const [x, y] of [[-10, -20], [-4, -36], [6, -30], [12, -14], [-14, -8]]) ctx.fillRect(x, y, 0.5, 1.2); }
  if (k.fx === "bubbles") { rings(ctx, 0, 16, 1); ctx.fillStyle = FOAM; for (const [x, y] of [[-8, -1.6], [-2, -3], [5, -1.2], [10, -2.6], [1, -5]]) { ctx.beginPath(); ctx.arc(x, y, 0.7, 0, TAU); ctx.fill(); } }
  if (dep < 8) for (const [ex, ey, r] of [[-7.4, -13, 2], [8.2, -12.4, 2.6]]) glow(ctx, ex, Y(ey), r, p.eyes || "#f0d050", 0.35);
  ctx.restore();
};

// ---- the sea monsters on the board: engine state -> rig frame ------------------------
// For draw.js / rimefx.js drawSea (engine/serpent.js owns the state): which
// sheet and frame each monster shows now. drawSeaRig paints it (and its hit
// flash) and returns true; health bars stay with the caller.
//   serpent  e.submerged + e.serp.phase "swim" -> "sub.n"; "rise" (still
//            hidden, rise ms) -> "surface.0/1"; "up" -> "surface.2/3" for its
//            first 300 ms, then the fight: strike (atkAnim 420) 2 -> 3, the
//            wind-up 1 in the last 450 ms before e.serp.next, else guard 0;
//            "dive" (450 ms) -> "dive.0-3"
//   kraken   e.kr.t0: its first 1200 ms "rise.0-3", its last 1200 ms of
//            e.kr.stay "sink.0-3"; while any of its arms strikes, the ROAR
//            (fight 1-3 off that arm's atkAnim); else the breathing idle
//   arm      e.riseAt / e.riseMs -> "rise.0-3"; a grab (an armGrab effect from
//            its spot, alive) -> "grab.0-3"; another blow (atkAnim 500) ->
//            fight 1 (arched), 2 (SLAM), 3 (drag); else the sway
// The anchor: the serpent's and the kraken's waterline is e.y + 4; the arm's
// hole is e.y + 3.
const SEA_LIFT = { serpent: 4, kraken: 4, arm: 3 };
export const seaFrame = (e, g) => {
  const tms = g.time * 1000, t = g.time, id = e.id || 0;
  if (e.sea === "serpent") {
    const S2 = e.serp; if (!S2) return null;
    const d = ENEMY_RISE;
    if (S2.phase === "swim" || e.submerged && S2.phase !== "rise") return { type: "seaserpent", sheet: "walk", frame: `sub.${Math.floor(t * 6 + id) % 4}` };
    if (S2.phase === "rise") return { type: "seaserpent", sheet: "walk", frame: `surface.${tms - S2.t < d.serpRise * 0.5 ? 0 : 1}` };
    if (S2.phase === "dive") return { type: "seaserpent", sheet: "walk", frame: `dive.${Math.min(3, Math.floor(((tms - S2.t) / d.serpDive) * 4))}` };
    const since = tms - S2.t;
    if (since < 300 && !(e.atkAnim > 0)) return { type: "seaserpent", sheet: "walk", frame: `surface.${since < 150 ? 2 : 3}` };
    const fr = e.atkAnim > 210 ? 2 : e.atkAnim > 0 ? 3 : S2.next !== undefined && S2.next - tms < 450 ? 1 : 0;
    return { type: "seaserpent", sheet: "fight", frame: fr };
  }
  if (e.sea === "kraken") {
    const K = e.kr; if (!K) return null;
    const age = tms - K.t0, stay = K.stay || 75000;
    if (age < 1200) return { type: "kraken", sheet: "walk", frame: `rise.${Math.floor(age / 300)}` };
    if (age > stay - 1200) return { type: "kraken", sheet: "walk", frame: `sink.${Math.min(3, Math.floor((age - stay + 1200) / 300))}` };
    const blow = Math.max(0, ...(K.arms || []).map((a) => (!a.dead && a.atkAnim > 0 ? a.atkAnim : 0)));
    if (blow > 0) return { type: "kraken", sheet: "fight", frame: blow > 350 ? 1 : blow > 150 ? 2 : 3 };
    return { type: "kraken", sheet: "walk", frame: Math.floor(t * 3 + id) % 4 };
  }
  if (e.sea === "arm") {
    if (e.riseAt !== undefined && tms - e.riseAt < (e.riseMs || 700)) return { type: "krakenarm", sheet: "walk", frame: `rise.${Math.floor(((tms - e.riseAt) / (e.riseMs || 700)) * 4)}` };
    const grab = (g.effects || []).find((fx) => fx.type === "armGrab" && fx.x === e.x && fx.y === e.y && fx.ttl > 0);
    if (grab) return { type: "krakenarm", sheet: "walk", frame: `grab.${Math.min(3, Math.floor((1 - grab.ttl / grab.life) * 4))}` };
    // (still holding what it grabbed, engine/serpent.js m.hold: wrap and squeeze in turn)
    if (e.hold) return { type: "krakenarm", sheet: "walk", frame: `grab.${2 + (Math.floor(t * 2.5 + id) % 2)}` };
    if (e.atkAnim > 0) return { type: "krakenarm", sheet: "fight", frame: e.atkAnim > 380 ? 1 : e.atkAnim > 200 ? 2 : 3 };
    return { type: "krakenarm", sheet: "walk", frame: Math.floor(t * 4 + id) % 4 };
  }
  return null;
};
// the engine's timings these frames are cut to (enemies.js seaserpent rise / dive)
const ENEMY_RISE = { serpRise: 500, serpDive: 450 };
export const drawSeaRig = (ctx, e, g) => {
  const f = seaFrame(e, g);
  if (!f) return false;
  const y = e.y + (SEA_LIFT[e.sea] || 4);
  drawRig(ctx, f.type, e.x, y, e.face || 1, f.sheet, f.frame);
  if (e.hitFlash > g.time * 1000 && !e.submerged) drawRig(ctx, f.type, e.x, y, e.face || 1, f.sheet, f.frame, "white", 0.6);
  return true;
};
// an arm going down when its time is up (the engine removes the foe and leaves
// an armSink effect: { x, y, ttl, life }), and the kraken's last dive
// (krakenSink): ZONE_FX-shaped painters
export const armSinkFx = (ctx, fx) => drawRig(ctx, "krakenarm", fx.x, fx.y + SEA_LIFT.arm, fx.face || 1, "walk", `sink.${Math.min(3, Math.floor((1 - fx.ttl / fx.life) * 4))}`);
export const krakenSinkFx = (ctx, fx) => drawRig(ctx, "kraken", fx.x, fx.y + SEA_LIFT.kraken, fx.face || 1, "walk", `sink.${Math.min(3, Math.floor((1 - fx.ttl / fx.life) * 4))}`);

// ---- the roster -----------------------------------------------------------------------
const FROSTWOLF = { len: 32, col: "#d4dde5", belly: "#f4f1e8", mane: "#7896ae", eyes: "#8ad8f0" };
const RAIDER = { skin: "#e8bea0", cloth: "#2f5a58", cloth2: "#cbbfa6", hair: "#d8b860", shcol: "#d8d0bc", wcol: "#c4c8d0" };
export const RIMEBEAST_RIGS = {
  rimerider: { kind: "rbFrostwolf", fightN: 4, box: { hw: 27, up: 46, down: 4 }, p: { ...FROSTWOLF, ...RAIDER, rider: true } },
  rimewolf: { kind: "rbFrostwolf", box: { hw: 27, up: 31, down: 4 }, p: { ...FROSTWOLF } },
  icedrake: { kind: "rbDrake", fly: true, fightN: 4, box: { hw: 42, up: 44, down: 4 }, p: { len: 40, col: "#9cc2d8", belly: "#eef4f4", wing: "#7eaccc", eyes: "#e8fbff" } },
  rimejarl: { kind: "rbMammoth", fightN: 4, box: { hw: 46, up: 82, down: 6 }, p: { len: 54, col: "#6e5442", belly: "#e8eef0", mane: "#3e2e24", cape: "#2f5a58", skin: RIME_JARL.skin, cloth: RIME_JARL.cloth, cloth2: RIME_JARL.cloth2, hair: RIME_JARL.hair, wcol: RIME_JARL.wcol } },
  seaserpent: { kind: "rbSerpent", fightN: 4, box: { hw: 38, up: 40, down: 10 }, p: { len: 40, col: "#3c8478", belly: "#d4ece0", mane: "#86cce0", eyes: "#e8f070" } },
  kraken: { kind: "rbKraken", fightN: 4, box: { hw: 50, up: 74, down: 14 }, p: { len: 48, col: "#8a4252", belly: "#e2b6aa", mane: "#4a2234", eyes: "#f0d050" } },
  krakenarm: { kind: "rbKrakenArm", fightN: 4, box: { hw: 50, up: 54, down: 10 }, p: { len: 44, w: 9.5, col: "#8a4252", belly: "#e2b6aa", mane: "#4a2234" } },
  frostgiant: { kind: "rbGiant", fightN: 4, box: { hw: 34, up: 58, down: 4 }, p: { skin: "#7f93ab", cloth: "#5e4a3a", cloth2: "#8a7860", hair: "#e4ecf0", eyes: "#bfe8ff", wcol: "#e6dcc4" } },
};
export const RIMEBEAST_PAINTERS = { rbFrostwolf: frostwolf, rbGiant: giant, rbDrake: drake, rbMammoth: mammoth, rbSerpent: seaserpent, rbKraken: kraken, rbKrakenArm: krakenarm };
