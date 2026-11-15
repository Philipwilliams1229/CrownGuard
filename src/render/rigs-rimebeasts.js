// ============ RIGS: THE RIME CLANS' BEASTS AND MONSTERS (zone IV) ============
// Bespoke bodies for the Rimewater's beasts (art/ZONES-4-5.md). Entries in
// RIMEBEAST_RIGS join RIGS (same shape: { kind, box: { hw, up, down }, p,
// fly?, fightN? }); RIMEBEAST_PAINTERS maps each `kind` to its painter
// (ctx, p) — p.pose ("walk" | "fight") and p.frame, feet (or the waterline)
// at 0,0, facing +x. Frames are baked once and inked by rigs.js.
//
//   (the clans' raiders, wolves, giants, drakes and the Jarl's mammoth are pix figures now:
//   render/pix/fig-*.js, listed in pix/pixrigs.js. Only the sea monsters' old painters remain.)
//   seaserpent  (a pix figure; its colours here still tint the seized-victim coil, drawSeaHold)
//               a long sea-green serpent with an ice-blue frill, drawn at
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

import { lighten, darken, mix, lin, part, glow, bakeSprite, PX } from "./paint.js";
import { drawRig, hasPix } from "./rigs.js";

const TAU = Math.PI * 2;
const q = (v) => Math.round(v * 2) / 2;               // snap to the art pixel
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

          // the rider's four fight frames over the wolf's two

// ---- the frost giant -------------------------------------------------------------
// A hunched, heavy biped: hips at 15, a barrel of a torso, long arms, a small
// head sunk between the shoulders. Bones: thigh 8.5, shin 8, upper arm and
// forearm 8 each (logged for the joint lab).
const G_THIGH = 8.5, G_SHIN = 8, G_UP = 8, G_FORE = 8;

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
  deep: (f) => ({ deep: true, f: f % 4 }),
  rise: (f) => ({ h: 46, arms: 0, dep: [44, 28, 14, 4][f % 4], fx: f % 4 < 3 ? "bulge" : "drip" }),
  sink: (f) => ({ h: 46, arms: -0.2, dep: [6, 18, 32, 48][f % 4], tilt: -0.04 * (f % 4 + 1), fx: "bubbles" }),
};
const kraken = (ctx, p) => {
  const fight = p.pose === "fight";
  let k;
  if (typeof p.frame === "string") { const [sh, n] = p.frame.split("."); k = (KRAKEN_EXTRA[sh] || KRAKEN_EXTRA.rise)(Number(n) || 0); }
  else k = fight ? KRAKEN_FIGHT[(p.frame || 0) % 4] : KRAKEN_WALK((p.frame || 0) % 4);
  if (k.deep) { krakenDeep(ctx, p, k.f); return; }
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
    if (e.hold && (e.hold.u || e.hold.e)) return { type: "seaserpent", sheet: "walk", frame: `hold.${Math.floor(t * 4 + id) % 4}` };
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
    if (e.hold && (e.hold.u || e.hold.e)) return { type: "krakenarm", skip: true };     // drawSeaHold paints all of it
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
  if (f.skip) return true;
  const y = e.y + (SEA_LIFT[e.sea] || 4);
  // a new figure is opaque: the serpent swimming under is laid on faint, as the old painter drew it
  const under = hasPix(f.type) && typeof f.frame === "string" && f.frame.startsWith("sub.") ? 0.55 : undefined;
  drawRig(ctx, f.type, e.x, y, e.face || 1, f.sheet, f.frame, undefined, under);
  if (e.hitFlash > g.time * 1000 && !e.submerged) drawRig(ctx, f.type, e.x, y, e.face || 1, f.sheet, f.frame, "white", 0.6);
  return true;
};
// an arm going down when its time is up (the engine removes the foe and leaves
// an armSink effect: { x, y, ttl, life }), and the kraken's last dive
// (krakenSink): ZONE_FX-shaped painters
export const armSinkFx = (ctx, fx) => drawRig(ctx, "krakenarm", fx.x, fx.y + SEA_LIFT.arm, fx.face || 1, "walk", `sink.${Math.min(3, Math.floor((1 - fx.ttl / fx.life) * 4))}`);
export const krakenSinkFx = (ctx, fx) => drawRig(ctx, "kraken", fx.x, fx.y + SEA_LIFT.kraken, fx.face || 1, "walk", `sink.${Math.min(3, Math.floor((1 - fx.ttl / fx.life) * 4))}`);

// ---- the kraken roaming under the water ------------------------------------------
// Seen from above through the black water: a vast dim shape, the sac leading,
// the eight arms streaming behind it, a bulge of water over it and a vee of
// wake. Everything translucent (never inked) but the foam. Facing +x = the way
// it swims; four frames of the arms' wave. (drawRig(…, "walk", "deep.n"))
// a shape painted solid on a scratch layer, then laid on dim (never inked)
const dim = (ctx, fn, a) => {
  const cv = ctx.canvas;
  if (!cv || !cv.width) return;
  const tmp = document.createElement("canvas");
  tmp.width = cv.width; tmp.height = cv.height;
  const t = tmp.getContext("2d");
  t.imageSmoothingEnabled = false;
  t.setTransform(ctx.getTransform());
  fn(t);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(tmp, 0, 0); ctx.restore();
};
const krakenDeep = (ctx, p, f) => {
  const ph = (f / 4) * TAU;
  // all of it on ONE layer laid on dim, so nothing stacks past the ink's
  // threshold: the heave of water over it, the body, a paler back, the eyes'
  // gleam, a vee of wake off its brow
  dim(ctx, (c) => {
    c.fillStyle = "#5e8a98"; c.beginPath(); c.ellipse(8, 0, 19, 8.5, 0, 0, TAU); c.fill();
    c.fillStyle = "#1c0a18";
    for (let i = 0; i < 8; i++) {
      const row = (i % 4) - 1.5, pts = [];
      for (let j = 0; j <= 10; j++) {
        const u = j / 10;
        pts.push([-6 - u * 34, row * (4.2 + u * 2.2) + Math.sin(ph + u * 5 + i) * (1 + u * 2.4)]);
      }
      taper(c, pts, pts.map((_, j) => 3.4 * (1 - j / 11) + 0.6));
    }
    curve(c, [[-10, -6], [4, -9], [16, -7], [22, -2], [22, 3], [14, 7], [2, 8.6], [-10, 6.4], [-14, 0]]); c.fill();
    c.fillStyle = "#4a1e3a"; curve(c, [[-4, -4], [8, -6], [16, -4], [18, 0], [10, 2], [-2, 1]]); c.fill();
    c.fillStyle = "#c8a840"; for (const y of [-5.4, 5.6]) c.fillRect(q(-3.5), q(y - 0.6), 2, 1);
    c.fillStyle = FOAM;
    for (let i = 0; i < 6; i++) {
      const x = 22 - i * 6.5, o = 3 + i * 2.6, w = (i + f) % 2 ? 2 : 3;
      c.fillRect(q(x), q(-o), w, 0.5); c.fillRect(q(x), q(o), w, 0.5);
    }
    c.fillRect(21.5, -1.5 + (f % 2) * 0.5, 2, 0.5); c.fillRect(22.5, 0.5, 1.5, 0.5);
    c.fillRect(q(16 - f), -7.5, 1, 0.5); c.fillRect(q(14 + f), 7, 1, 0.5);
  }, 0.4);
};
export const drawKrakenDeepRig = (ctx, e, g) => drawRig(ctx, "kraken", e.x, e.y, e.face || 1, "walk", `deep.${Math.floor(g.time * 3 + (e.id || 0)) % 4}`, undefined, hasPix("kraken") ? 0.4 : undefined);

// ---- what a sea monster holds ------------------------------------------------------
// A kraken's arm seizes a creature (a raider or a soldier: engine/serpent.js
// m.hold, u.seizedBy / e.seized) and the serpent coils round one. Drawn over
// the crowd (rimefx.js drawHolds): the arm rises out of its hole (or the
// serpent's neck out of the water beside its humps), arcs over to the victim,
// comes round its waist in a band across the front, then a second band higher
// up, and the tip (the serpent's head) curls over the shoulder. The bands are
// kept narrow and low so the figure — a knight we want to save — still reads.
// Baked per (monster kind, offset to the victim in 2-unit steps, victim size,
// squeeze frame), stamped mirrored when the victim lies to the left.
const HOLD_CACHE = new Map();
const holdTube = (c, pts, ws, col, belly, o = {}) => {
  // the body of a limb along pts, ws wide; its underside (down-right of the
  // line) pale with suckers (an arm) or belly scutes (the serpent); the top
  // mottled or frilled
  const N = pts.length - 1;
  const nrm = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    let n = [-dy / l, dx / l];
    if (n[0] * 0.45 + n[1] < 0) n = [-n[0], -n[1]];
    return n;
  };
  if (o.frill) {
    c.fillStyle = o.frill;
    for (let i = 2; i < N - 1; i += 2) { const n = nrm(i); spike(c, [pts[i][0] - n[0] * ws[i] * 0.36, pts[i][1] - n[1] * ws[i] * 0.36], [-n[0], -n[1]], 1.8, 0.8, 0.3); }
  }
  c.fillStyle = tone(c, pts[0][0] - 12, pts[0][1] - 20, pts[0][0] + 12, pts[0][1] + 8, col, 0.32, 0.42); taper(c, pts, ws);
  const bk = o.suck ? 0.42 : 0.26;
  const und = pts.map((pt, i) => { const n = nrm(i); return [pt[0] + n[0] * ws[i] * (0.5 - bk * 0.55), pt[1] + n[1] * ws[i] * (0.5 - bk * 0.55)]; });
  c.fillStyle = belly; taper(c, und, ws.map((w) => w * bk));
  if (!o.suck) {
    // the serpent's back: a dark dorsal line with paler scale flecks
    const top = pts.map((pt, i) => { const n = nrm(i); return [pt[0] - n[0] * ws[i] * 0.14, pt[1] - n[1] * ws[i] * 0.14]; });
    c.fillStyle = darken(col, 0.22); taper(c, top, ws.map((w) => w * 0.24));
  }
  for (let i = 1; i < N; i += o.suck ? 1 : 2) {
    const n = nrm(i), pt = [pts[i][0] + n[0] * ws[i] * 0.3, pts[i][1] + n[1] * ws[i] * 0.3];
    if (o.suck) {
      const r = Math.max(0.5, ws[i] * 0.16);
      if (i % 2) { c.fillStyle = lighten(belly, 0.3); c.beginPath(); c.ellipse(pt[0], pt[1], r, r * 0.85, 0, 0, TAU); c.fill(); }
      if (r > 0.6 && i % 2) { c.fillStyle = darken(belly, 0.4); c.fillRect(pt[0] - 0.25, pt[1] - 0.25, 0.5, 0.5); }
    } else { c.fillStyle = darken(belly, 0.28); c.fillRect(pt[0] - 0.25, pt[1] - 0.25, 0.5, 0.5); }
    const tp = [pts[i][0] - n[0] * ws[i] * 0.2, pts[i][1] - n[1] * ws[i] * 0.2];
    if (i % 3 === 1) { c.fillStyle = darken(col, 0.32); c.fillRect(tp[0] - 0.5, tp[1] - 0.5, 1, 1); }
  }
  // a lit ridge along the top
  c.fillStyle = lighten(col, 0.35);
  for (let i = 1; i < N; i += 2) { const n = nrm(i); const tp = [pts[i][0] - n[0] * ws[i] * 0.36, pts[i][1] - n[1] * ws[i] * 0.36]; c.fillRect(tp[0] - 0.25, tp[1] - 0.25, 0.5, 0.5); }
};
// widths along a spline by arc length: from w0 through to w1
const widthsAlong = (pts, stops) => {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1] || 1;
  return L.map((l) => {
    const u = l / tot;
    for (let k = 1; k < stops.length; k++) if (u <= stops[k][0]) { const [u0, w0] = stops[k - 1], [u1, w1] = stops[k]; return w0 + (w1 - w0) * ((u - u0) / (u1 - u0 || 1)); }
    return stops[stops.length - 1][1];
  });
};
const paintHold = (c, kind, adx, dy, hw, f, waist) => {
  const arm = kind === "a";
  const sq = [0, 0.5, 1, 0.5][f];
  const P = arm ? RIMEBEAST_RIGS.krakenarm.p : RIMEBEAST_RIGS.seaserpent.p;
  const col = P.col, belly = P.belly;
  const dist = Math.hypot(adx, dy);
  // where the limb leaves the water, its arc over, the waist band (dy is the
  // victim's waist; its chest about 4.5 higher, its head from 9 up: kept clear)
  const up = -Math.min(arm ? 12 : 13, 4 + dist * 0.24);
  const archY = Math.min(up, dy - 4) - (arm ? 2 : 3);
  const band = [[adx - hw - 0.8, dy + 1], [adx + 0.2, dy + 1.8 - sq * 0.3], [adx + hw + 1, dy + 0.6]];
  let ctrlA;
  if (arm) ctrlA = [[0, 1.6], [adx * 0.05, up * 0.6], [adx * 0.18 + 1, up], [adx * 0.55, archY], [adx - hw - 3.4, dy - 1.4], ...band];
  else {
    // the serpent comes up out of the water and slithers over the ground to
    // its victim in S-bends (it lies on the ground: feet level is dy + waist),
    // then climbs its legs into the coils
    const fy = dy + waist, gx = adx - hw - 2.4, n = Math.max(2, Math.round(Math.hypot(gx, fy) / 14));
    const len = Math.hypot(gx, fy) || 1, px = -fy / len, py = gx / len;
    ctrlA = [[0, 1.2]];
    for (let i = 1; i < n; i++) { const u = i / n, a = (i % 2 ? 1 : -1) * Math.min(5, len * 0.12); ctrlA.push([gx * u + px * a, fy * u + py * a - 0.5]); }
    ctrlA.push([gx, fy - 1], [adx - hw - 2.2, dy + 3], ...band);
  }
  const A = spline(ctrlA, 4);
  const wA = widthsAlong(A, arm ? [[0, 8.6], [0.25, 6], [0.7, 3.8], [0.85, 3], [1, 2.7 - sq * 0.3]] : [[0, 5.4], [0.6, 4.8], [0.85, 3.8], [1, 3 - sq * 0.3]]);
  // the second band across the chest, out from behind the near side; then the
  // tip (the serpent's head) rising off the far shoulder, clear of the face
  const ctrlB = arm
    ? [[adx - hw - 0.8, dy - 3.6], [adx, dy - 4.4 - sq * 0.2], [adx + hw + 1.4, dy - 5.4], [adx + hw + 3, dy - 8], [adx + hw + 4.4, dy - 10.6], [adx + hw + 5.8, dy - 10.4], [adx + hw + 5.4, dy - 9]]
    : [[adx - hw - 1, dy - 3.6], [adx, dy - 4.2 - sq * 0.2], [adx + hw + 1.4, dy - 5.4], [adx + hw + 3.4, dy - 9], [adx + hw + 3.8, dy - 14], [adx + hw + 2.4, dy - 18]];
  const B = spline(ctrlB, 4);
  const wB = widthsAlong(B, arm ? [[0, 2.6], [0.45, 2.4], [0.8, 1.4], [1, 0.7]] : [[0, 3], [0.6, 2.8], [1, 2.6]]);
  // the water where it comes up: the arm's hole through the ice and shingle,
  // or a foam collar off the serpent's back
  if (arm) part(c, (cc) => {
    cc.fillStyle = "#16303a"; cc.beginPath(); cc.ellipse(0.4, 0.6, 9, 3, 0, 0, TAU); cc.fill();
    cc.fillStyle = "#2a5464"; cc.beginPath(); cc.ellipse(0.8, 0.9, 6.3, 1.8, 0, 0, TAU); cc.fill();
  });
  if (!arm) { c.fillStyle = "rgba(20,20,26,0.22)"; taper(c, A.slice(0, -10).map(([x, y]) => [x + 1, y + 1.6]), wA.slice(0, -10).map((w) => w * 0.9)); }
  part(c, (cc) => {
    cc.save(); cc.beginPath(); cc.rect(-400, -400, 900, 900); cc.rect(-10, 0.6, 20, 7); cc.clip("evenodd");
    holdTube(cc, A, wA, col, belly, arm ? { suck: true } : { frill: P.mane });
    cc.restore();
  });
  part(c, (cc) => holdTube(cc, B, wB, col, belly, arm ? { suck: true } : { frill: P.mane }));
  if (!arm) {
    // the head reared over the far shoulder, jaws at the victim's head
    const at = B[B.length - 1];
    part(c, (cc) => {
      cc.save(); cc.translate(at[0], at[1]); cc.scale(-0.8, 0.8);
      serpentHead(cc, (x) => x, P, { tilt: 0.35, jaw: 0.35 + sq * 0.35 }, [0, 0]);
      cc.restore();
    });
  }
  if (arm) part(c, (cc) => {
    for (const [dx, dy2, w, h, tilt] of [[-9.6, 0.2, 3.2, 1.8, -0.5], [-3.8, 1.6, 3.4, 1.6, 0.15], [4.3, 1.6, 3, 1.5, -0.2], [9.4, 0.1, 3, 1.9, 0.55]]) {
      cc.save(); cc.translate(dx, dy2); cc.rotate(tilt);
      cc.fillStyle = ICE_DK; cc.fillRect(-w / 2, -h / 2, w, h);
      cc.fillStyle = ICE_LT; cc.fillRect(-w / 2, -h / 2, w, h * 0.45);
      cc.restore();
    }
  });
  else foam(c, 0.4, 4.6, 1);
  // the squeeze: drops wrung out at the waist band
  if (sq >= 1) { c.fillStyle = FOAM; c.fillRect(q(adx + hw + 1.8), q(dy + 2), 0.5, 1); c.fillRect(q(adx - hw - 1.4), q(dy + 2.8), 0.5, 1); }
};
const holdSprite = (kind, adx, dy, hw, f, white, waist) => {
  const key = `${kind}|${adx}|${dy}|${hw}|${f}|${waist}|${white ? 1 : 0}`;
  let sp = HOLD_CACHE.get(key);
  if (sp) return sp;
  if (HOLD_CACHE.size > 240) HOLD_CACHE.clear();
  const x0 = -18, y0 = Math.min(-26, dy - 24), x1 = adx + hw + 18, y1 = Math.max(10, dy + waist + 10);
  const cv = bakeSprite(x1 - x0, y1 - y0, (c) => { c.translate(-x0, -y0); paintHold(c, kind, adx, dy, hw, f, waist); });
  if (white) { const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = "#f4f2ea"; c.fillRect(0, 0, cv.width, cv.height); }
  sp = { cv, ax: -x0, ay: -y0 };
  HOLD_CACHE.set(key, sp);
  return sp;
};
// m: the monster (a krakenarm or a seaserpent with m.hold: { u } a soldier
// or { e } a foe)
export const drawSeaHold = (ctx, m, g) => {
  const v = m && m.hold && (m.hold.u || m.hold.e);
  if (!v) return;
  const arm = m.sea === "arm";
  const tms = g.time * 1000;
  const ox = arm ? m.x : m.x + (m.face || 1) * 10.5, oy = m.y + (arm ? SEA_LIFT.arm : SEA_LIFT.serpent);
  // the victim's waist: a soldier stands at u.y + 9, a foe at e.y + size * 0.55
  const foe = !!m.hold.e;
  const feet = foe ? v.y + v.size * 0.55 : v.y + 9;
  const waist = foe ? Math.max(7, v.size * 0.5) : 8.5;
  const hw = q(foe ? Math.max(3.6, v.size * 0.27) : 4);
  const dx = v.x - ox, dy = Math.round((feet - waist - oy) / 2) * 2;
  const adx = Math.max(6, Math.round(Math.abs(dx) / 2) * 2), dir = dx >= 0 ? 1 : -1;
  const f = Math.floor(g.time * 3 + (m.id || 0)) % 4;
  const draw = (sp, a = 1) => {
    const w = sp.cv.width / PX, h = sp.cv.height / PX;
    ctx.save(); if (a !== 1) ctx.globalAlpha *= a;
    ctx.translate(ox, oy); if (dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(sp.cv, -sp.ax, -sp.ay, w, h);
    ctx.restore();
  };
  const wq = Math.round(waist);
  draw(holdSprite(arm ? "a" : "s", adx, dy, hw, f, false, wq));
  if (m.hitFlash > tms) draw(holdSprite(arm ? "a" : "s", adx, dy, hw, f, true, wq), 0.45);
};

export const RIMEBEAST_RIGS = {
  seaserpent: { fightN: 4, box: { hw: 38, up: 40, down: 10 }, p: { len: 40, col: "#3c8478", belly: "#d4ece0", mane: "#86cce0", eyes: "#e8f070" } },
  kraken: { kind: "rbKraken", fightN: 4, box: { hw: 50, up: 74, down: 14 }, p: { len: 48, col: "#8a4252", belly: "#e2b6aa", mane: "#4a2234", eyes: "#f0d050" } },
  krakenarm: { kind: "rbKrakenArm", fightN: 4, box: { hw: 50, up: 54, down: 10 }, p: { len: 44, w: 9.5, col: "#8a4252", belly: "#e2b6aa", mane: "#4a2234" } },
};
export const RIMEBEAST_PAINTERS = { rbKraken: kraken, rbKrakenArm: krakenarm };
