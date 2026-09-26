// ============ RIGS: THE HOLLOW COURT'S BEASTS AND SPIRITS (ghoul, wraith, amalgam) ============
// Bespoke bodies that override the generic entries in rigs.js (same shape:
// { kind, box: { hw, up, down }, p, fly? }); HOLLOWBEAST_PAINTERS maps each new
// `kind` to its painter (ctx, p). The pose is p.pose ("walk" | "fight") and
// p.frame (0-3 walk/fly, 0-1 fight), feet at 0,0, facing +x. Frames are baked
// once and inked by rigs.js.
//
// The ghoul is a starved corpse gone back to all fours: long clawed arms,
// crouched legs, a knuckled spine and a jaw full of teeth, on a four-beat
// gallop as quick as the wolf's. The wraith is a drowned shroud with no feet,
// its hem unravelling into mist, grasping hands and a drowned chain trailing.
// The amalgam is a mound of the dead stitched and stapled into one body,
// heads and ghoul arms sticking out of it, hauling itself on one great arm.
// Colours come only from the rig params (col, belly, mane, skin, cloth,
// cloth2, hair, eyes) so the necromancer's revive() and the hit-flash reach
// them; only teeth, claws and iron keep their own.

import { lighten, darken, mix, rgba, shadow, glow, lin, part } from "./paint.js";

const TAU = Math.PI * 2;
const q = (v) => Math.round(v * 2) / 2;             // snap to the art pixel
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const TOOTH = "#e6dcc2", CLAW = "#d8ccae", MAW = "#3a1a22", IRON = "#6a6e78";

// ---- shape kit (as rigs-beasts.js) --------------------------------------------
// a smooth closed outline; a point with a third element set is a hard corner
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
const stroke = (c, pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke(); };
// two-bone reach: the middle joint; bend +1 folds toward -x (elbow), -1 toward +x (knee)
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const t = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1))));
  const ang = Math.atan2(dy, dx) + bend * t;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
// one limb as its own inked piece, a lit strip down the sun side
const limb = (ctx, pts, ws, col, o = {}) => part(ctx, (c) => {
  c.fillStyle = col; taper(c, pts, ws);
  if (o.hi) { c.fillStyle = o.hi; taper(c, pts.slice(0, -1).map(([x, y], i) => [x - ws[i] * 0.24, y - 0.25]), ws.slice(0, -1).map((w) => w * 0.34)); }
  if (o.extra) o.extra(c, pts);
});
// a clawed hand at the end of a limb: palm toward `dir` (radians), `curl` 0
// (splayed, planted) to 1 (hooked), `n` claws
const clawHand = (c, w, dir, curl, col, sc = 1, n = 3) => {
  const P = (x, y) => { const r = rot([x * sc, y * sc], [0, 0], dir); return [w[0] + r[0], w[1] + r[1]]; };
  c.fillStyle = col; taper(c, [P(0, 0), P(1.4, 0)], [1.6 * sc, 1.3 * sc]);
  for (let i = 0; i < n; i++) {
    const sp = (i - (n - 1) / 2) * 0.55, a0 = P(1.4, sp * 0.8);
    const tip = rot([2.6, sp * 1.6], [0, 0], curl * 1.1);
    const fing = P(1.4 + tip[0] * 0.55, sp * 0.8 + tip[1] * 0.55);
    c.fillStyle = col; taper(c, [a0, fing], [0.8 * sc, 0.6 * sc]);
    const t2 = P(1.4 + tip[0] * 0.95, sp * 0.8 + tip[1] * 0.95 + curl * 0.6);
    c.fillStyle = CLAW; taper(c, [fing, t2], [0.55 * sc, 0.2 * sc]);
  }
};
// stitches across a seam: a thread line with short crossing ticks
const stitches = (c, pts, col, every = 1.5) => {
  c.lineCap = "butt";
  c.strokeStyle = col; c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.stroke();
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i], pts[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    for (let d = 0.6; d < L; d += every) {
      const m = lerp(a, b, d / L);
      c.beginPath(); c.moveTo(m[0] + nx * 0.9 - ny * 0.3, m[1] + ny * 0.9 + nx * 0.3); c.lineTo(m[0] - nx * 0.9 + ny * 0.3, m[1] - ny * 0.9 - nx * 0.3); c.stroke();
    }
  }
};
// an iron staple bridging a seam: a lit bar on two dark legs
const staple = (c, x, y, w = 2.5) => {
  c.fillStyle = darken(IRON, 0.4); c.fillRect(q(x), q(y), 0.5, 1.5); c.fillRect(q(x + w - 0.5), q(y), 0.5, 1.5);
  c.fillStyle = lighten(IRON, 0.3); c.fillRect(q(x), q(y), w, 0.5);
  c.fillStyle = IRON; c.fillRect(q(x), q(y) + 0.5, w, 0.5);
};

// The dead head, shared by the ghoul and the amalgam's many faces: a gaunt
// skull under tight skin, a long hinged jaw full of teeth, a sunken socket
// with witch-fire in it, a pointed ear and a few lank strands. Facing +x,
// cranium at (x, y). Drawn into the part `c` it is given.
const deadHead = (c, x, y, sc, ang, jaw, col, o = {}) => {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
  const hinge = [0.4, 1], J = (pt) => rot(pt, hinge, jaw);
  // lank hair hanging off the back of the skull
  if (o.hair) {
    stroke(c, [[0.2, -3.4], [-1.4, -2.8], [-2.2, -0.6], [-2.4, 2.6]], 0.7, o.hair);
    stroke(c, [[-1, -3], [-2.6, -1.4], [-3.4, 1.4]], 0.6, o.hair);
  }
  // the gape
  if (jaw > 0.05) fillPoly(c, [hinge, [4.4, 0.8], J([4.4, 1.3]), J([1.2, 1.8])], MAW);
  // lower jaw, long and narrow, a row of teeth along it
  c.fillStyle = tone(c, 0, 0.5, 0, 3, darken(col, 0.1), 0.2, 0.32);
  curve(c, [J([-0.2, 0.8]), J([2, 1.2]), J([4.3, 1.2]), J([4.5, 2.2], 1), J([2.4, 3]), J([0.2, 2.4])]); c.fill();
  c.fillStyle = TOOTH;
  for (const tx of [1.8, 2.8, 3.8]) { const t = J([tx, 1.3]); c.fillRect(q(t[0]), q(t[1] - 0.5), 0.5, 1); }
  // the skull: a dome behind, the face sharp and fallen in
  c.fillStyle = tone(c, -1, -3.6, 3, 1.4, col, 0.32, 0.4);
  curve(c, [[-1.8, 0.6], [-2.4, -1.2], [-1.4, -3], [0.8, -3.5], [2.7, -2.9], [3.6, -1.8, 1], [3.9, -0.9], [5, 0, 1], [4.6, 0.9, 1], [2.2, 0.9], [0.6, 1.5], [-1, 1.4]]); c.fill();
  // the pointed ear, laid back
  fillPoly(c, [[-0.2, -1.4], [-2.6, -3.4], [-0.4, -2.6]], darken(col, 0.3));
  // sunken temple and cheek, heavy brow, nose slit
  c.fillStyle = darken(col, 0.28); c.fillRect(0.2, -1.8, 1, 1.2); c.fillRect(1.4, 0.1, 1.8, 0.5);
  c.fillStyle = lighten(col, 0.2); c.fillRect(1.4, -0.4, 1.4, 0.5);
  c.fillStyle = darken(col, 0.55); poly(c, [[1.2, -2.4], [3.6, -1.9], [3.5, -1.4], [1.4, -1.8]]); c.fill();
  c.fillStyle = "#1a1418"; c.fillRect(q(4), -0.5, 0.5, 0.5);
  c.fillStyle = "#140e16"; c.beginPath(); c.ellipse(2.5, -1.1, 1.2, 0.95, 0, 0, TAU); c.fill();
  c.fillStyle = o.eyes || "#7ce0b8"; c.fillRect(2.2, -1.5, 1, 0.5);
  // upper teeth, long, down over the lip
  c.fillStyle = TOOTH;
  for (const tx of [2.2, 3.2, 4]) c.fillRect(q(tx), 0.5, 0.5, tx === 3.2 ? 1.5 : 1);
  c.restore();
};

// ---- the ghoul ---------------------------------------------------------------------
// A rotary gallop, as the wolf's: fn/ff = near/far hand, hn/hf = near/far
// foot as [x, y] (0 = ground). arch bows the spine, st stretches the body,
// hd drops the head, jaw opens it.
const GHOUL_RUN = [
  // flung out: hands reaching, feet streaming back
  { bob: -1.5, arch: -0.3, st: 1, hd: 1, jaw: 0.45, fn: [13, -4], ff: [11, -2.5], hn: [-14.5, -3], hf: [-12.5, -2] },
  // the hands strike
  { bob: 0, arch: 0.4, st: 0, hd: 1.5, jaw: 0.25, fn: [8, 0], ff: [4.5, 0], hn: [-6, -3.5], hf: [-8.5, -4.5] },
  // gathered: feet planting under the belly, spine bowed
  { bob: -1, arch: 1.8, st: -1, hd: 0.5, jaw: 0.15, fn: [2.5, -3], ff: [4.5, -2], hn: [-1.5, 0], hf: [-3.5, -1.2] },
  // the feet drive
  { bob: 0, arch: 0.8, st: 0, hd: 1, jaw: 0.5, fn: [10, -3], ff: [7.5, -2], hn: [-5.5, 0], hf: [-8.5, 0] },
];
const GHOUL_FIGHT = [
  // reared on its haunches, the near claw drawn up and back, jaw agape
  { bob: 0.5, arch: 1.4, st: -0.5, hd: 1.5, jaw: 0.6, fn: [8.5, -21], fbend: -1, fcurl: 1, ff: [8.5, 0], hn: [-3.5, 0], hf: [-6, 0], lift: 2 },
  // the swipe: lunging in, claw raked forward and down, teeth bared
  { bob: -0.5, arch: -0.2, st: 1.2, hd: 1, jaw: 0.8, dx: 2, fn: [15.5, -6.5], fcurl: 0.3, ff: [11, 0], hn: [-9, 0], hf: [-11.5, 0] },
];

const ghoul = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? GHOUL_FIGHT[(p.frame || 0) % 2] : GHOUL_RUN[(p.frame || 0) % 4];
  const s = (p.len ?? 26) / 26;
  const col = p.col, pale = p.belly, dark = p.mane || darken(col, 0.4), far = darken(col, 0.3), rag = p.cloth;
  shadow(ctx, 1.5, 0.4, 12 * s, 2 * s, 0.3);
  ctx.save(); ctx.scale(s, s); ctx.translate(k.dx || 0, 0);
  const b = q(k.bob), a = k.arch, st = k.st, lift = k.lift || 0;
  const S = [5 + st * 0.6, -13.8 + b - lift], H = [-6.5 - st * 0.5, -10.4 + b];
  // an arm: shoulder, elbow folding back, wrist, and the clawed hand
  const arm = (sh, [fx, fy], bend = 1) => { const w = [fx - 0.8, fy - 1.3]; return [sh, ik(sh, w, 6.6, 6.4, bend), w]; };
  // a leg: hip, knee forward (crouched man), ankle; the foot flat under it
  const legOf = (hp, [fx, fy]) => { const an = [fx - 1.4, fy - 1.3]; return [hp, ik(hp, an, 6.8, 6.2, -1), an]; };
  const foot = (colr) => (c, pts) => { const an = pts[2]; c.fillStyle = colr; taper(c, [an, [an[0] + 2.2, an[1] + 0.9]], [1.4, 1]); c.fillStyle = CLAW; c.fillRect(q(an[0] + 2.4), q(an[1] + 0.6), 0.5, 0.5); };
  const hand = (colr, curl) => (c, pts) => { const w = pts[2], e = pts[1]; const dir = pts[2][1] > -1.8 ? 0 : Math.atan2(w[1] - e[1], w[0] - e[0]); clawHand(c, w, dir, curl, colr); };
  // far limbs, in shade
  limb(ctx, legOf([H[0] - 0.8, H[1] - 0.6], k.hf), [2.2, 1.5, 1.2], far, { extra: foot(far) });
  limb(ctx, arm([S[0] - 0.8, S[1] - 0.6], k.ff), [1.7, 1.3, 1.1], far, { extra: hand(far, fight ? 0.1 : k.ff[1] < -1 ? 0.8 : 0) });
  // the rag of a loincloth, flapping behind
  part(ctx, (c) => {
    const fl = fight ? 0 : [1, 0, -0.5, 0.4][(p.frame || 0) % 4];
    c.fillStyle = tone(c, -12, -12 + b, -4, -5 + b, rag, 0.25, 0.4);
    poly(c, [[H[0] + 1.5, H[1] - 1.5], [H[0] - 3, H[1] - 1.6], [H[0] - 5.5, H[1] + 1 + fl], [H[0] - 4.2, H[1] + 1.8 + fl], [H[0] - 3.6, H[1] + 3.6 + fl * 0.6], [H[0] - 2.2, H[1] + 2.4], [H[0] - 1.2, H[1] + 4.2], [H[0] + 0.2, H[1] + 2.6], [H[0] + 1.8, H[1] + 2]]); c.fill();
  });
  // the body: haunch, pinched belly, the cage of ribs, hunched shoulders
  const B = (x, y) => [x, y + b];
  const body = [
    [H[0] - 3, H[1] + 0.2], [H[0] - 1.4, H[1] + 1.6], [H[0] + 1.6, H[1] + 1], B(-2, -11.6 + a * 0.2), B(1.8 + st * 0.3, -9), [S[0] + 2.4, S[1] + 4.2],
    [S[0] + 3.2, S[1] + 0.8], [S[0] + 2.6, S[1] - 2.6], [S[0] - 0.4, S[1] - 4.4 - a * 0.3], B(-1 - st * 0.1, -15.4 - a), [H[0] + 0.4, H[1] - 4.4 - a * 0.3], [H[0] - 2.6, H[1] - 2.8],
  ];
  part(ctx, (c) => {
    // the knuckled spine first, its knobs standing off the back
    c.fillStyle = tone(c, 0, -19 + b, 0, -12 + b, col, 0.3, 0.3);
    const spine = [[H[0] + 0.2, H[1] - 4.4 - a * 0.3], B(-3.4 - st * 0.2, -15.2 - a * 0.9), B(-1 - st * 0.1, -15.6 - a), B(1.4, -15.8 - a * 0.8), [S[0] - 1.6, S[1] - 4.4 - a * 0.4], [S[0] + 0.8, S[1] - 4.2]];
    for (let i = 0; i + 1 < spine.length; i++) for (const t of [0, 0.5]) { const [x, y] = lerp(spine[i], spine[i + 1], t); c.beginPath(); c.ellipse(x, y - 0.3, 0.6, 0.65, 0, 0, TAU); c.fill(); }
    c.fillStyle = tone(c, 0, -17 + b, 0, -8 + b, col, 0.3, 0.42);
    curve(c, body); c.fill();
    c.save(); curve(c, body); c.clip();
    // pale underside of the chest and the pinched belly in shade
    c.fillStyle = darken(col, 0.3);
    curve(c, [B(-6, -8), B(-1.5, -8.6), B(2, -7.6), B(1.4, -10 + a * 0.2), B(-2, -11.2 + a * 0.2), B(-5, -10.2)]); c.fill();
    // the ribs, each a lit bar over a shadow groove
    for (let i = 0; i < 4; i++) {
      const rx = 0.8 + i * 1.5 + st * 0.3, top = -13.6 + b - a * 0.5 + i * 0.1;
      c.strokeStyle = darken(col, 0.38); c.lineWidth = 0.55; c.beginPath(); c.moveTo(rx - 1, top); c.quadraticCurveTo(rx - 0.4, top + 2.6, rx + 0.4, top + 4.6 - i * 0.2); c.stroke();
      c.strokeStyle = pale; c.lineWidth = 0.5; c.beginPath(); c.moveTo(rx - 0.3, top - 0.1); c.quadraticCurveTo(rx + 0.2, top + 2.4, rx + 1, top + 4.2 - i * 0.2); c.stroke();
    }
    // the hip bone showing through
    c.fillStyle = pale; c.beginPath(); c.ellipse(H[0] + 0.8, H[1] - 2.2, 1.1, 0.7, -0.4, 0, TAU); c.fill();
    c.fillStyle = darken(col, 0.35); c.fillRect(q(H[0] + 0.2), q(H[1] - 1.2), 1.4, 0.5);
    // grave-mould along the spine
    c.fillStyle = dark;
    for (const [x, y] of [B(-3, -14.6 - a * 0.9), B(1, -15.1 - a * 0.8), [S[0] - 1.8, S[1] - 3.7 - a * 0.4]]) c.fillRect(q(x), q(y), 1.5, 0.5);
    c.restore();
    // what is left of a shirt: a rotten rag hanging under the ribs
    const fl = fight ? 0.5 : [0.6, 0, -0.4, 0.3][(p.frame || 0) % 4];
    c.fillStyle = tone(c, 0, S[1], 0, S[1] + 7, rag, 0.25, 0.4);
    poly(c, [[S[0] - 4.6, S[1] + 1.2], [S[0] + 0.6, S[1] + 1.6], [S[0] + 1.2, S[1] + 4.6], [S[0] + 0.2, S[1] + 3.8], [S[0] - 0.4 - fl, S[1] + 6.4], [S[0] - 1.4, S[1] + 4.2], [S[0] - 2.4 - fl, S[1] + 5.6], [S[0] - 3.2, S[1] + 3.6], [S[0] - 4.6 - fl, S[1] + 4.4]]); c.fill();
    c.fillStyle = lighten(rag, 0.25); c.fillRect(q(S[0] - 4.4), q(S[1] + 1.2), 4.6, 0.5);
  });
  // neck and the dead head, slung low and forward
  const hx = S[0] + 5.6 + st * 0.4, hy = S[1] + 1.2 + k.hd;
  part(ctx, (c) => {
    c.fillStyle = tone(c, 0, S[1] - 3, 0, S[1] + 3, darken(col, 0.15), 0.2, 0.4);
    taper(c, [[S[0] + 1, S[1] - 1.8], [hx - 1.2, hy + 0.2]], [2.6, 1.7]);
    c.fillStyle = darken(col, 0.35); c.fillRect(q(S[0] + 2), q(S[1] + 0.2), 1.6, 0.5);
  });
  part(ctx, (c) => {
    deadHead(c, hx, hy, 0.92, fight ? (p.frame ? 0.1 : -0.35) : 0.08, k.jaw || 0, mix(col, pale, 0.3), { hair: p.hair, eyes: p.eyes });
  });
  // near leg: a thin thigh with a knob of a knee, the long foot
  const hn = legOf(H, k.hn), fn = arm(S, k.fn, k.fbend || 1);
  limb(ctx, hn, [2.4, 1.7, 1.3], col, {
    hi: lighten(col, 0.2),
    extra: (c, pts) => {
      foot(col)(c, pts);
      c.fillStyle = lighten(col, 0.15); c.beginPath(); c.ellipse(pts[1][0], pts[1][1], 1, 0.9, 0, 0, TAU); c.fill();
      c.fillStyle = tone(c, 0, H[1] - 3, 0, H[1] + 3, col, 0.28, 0.4);
      const m = lerp(pts[0], pts[1], 0.35); c.beginPath(); c.ellipse(m[0], m[1], 1.9, 1.6, 0, 0, TAU); c.fill();
    },
  });
  // near arm: long, the elbow a knot, the hand a rake of claws
  limb(ctx, fn, [1.9, 1.5, 1.2], col, {
    hi: lighten(col, 0.2),
    extra: (c, pts) => {
      c.fillStyle = lighten(col, 0.12); c.beginPath(); c.arc(pts[1][0], pts[1][1], 1, 0, TAU); c.fill();
      hand(col, fight ? k.fcurl : k.fn[1] < -1 ? 0.8 : 0)(c, pts);
    },
  });
  ctx.restore();
  // the witch-fire in the socket
  const eyeAt = rot([2.2, -1.1], [0, 0], fight ? (p.frame ? 0.1 : -0.35) : 0.08);
  glow(ctx, (hx + eyeAt[0] + (k.dx || 0)) * s, (hy + eyeAt[1]) * s, 1.4 * s, p.eyes || "#7ce0b8", 0.45);
};

// ---- the wraith ----------------------------------------------------------------------
// It drifts: a slow bob, the shroud streaming back, the hem unravelling into
// mist that is not inked (it is not solid), the hands reaching in turn.
const WRAITH_FLY = [
  { bob: 0, reach: 0, hem: 0 },
  { bob: -1, reach: 1, hem: 1 },
  { bob: -1.5, reach: 0, hem: 2 },
  { bob: -0.5, reach: -1, hem: 3 },
];
const WRAITH_FIGHT = [
  { bob: -1.5, reach: -1.5, hem: 1 },
  { bob: 0, reach: 1.5, hem: 3, dx: 1 },
];

const wraith = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? WRAITH_FIGHT[(p.frame || 0) % 2] : WRAITH_FLY[(p.frame || 0) % 4];
  const s = (p.h ?? 26) / 26;
  const col = p.col, inner = p.mane || darken(col, 0.6), weed = p.cloth2, bone = p.skin, chain = p.hair;
  const eyes = p.eyes || "#7ce0b8";
  const ph = (k.hem / 4) * TAU, r = k.reach;
  ctx.save(); ctx.scale(s, s); ctx.translate(k.dx || 0, q(k.bob));
  // the hem's tatters: tip points, swaying out of time with one another
  const tips = [[4.2, -5.6], [1, -4], [-3, -4.4], [-6.6, -6.2], [-9.4, -8.6]].map(([x, y], i) => [x + Math.sin(ph + i * 1.3) * 0.6, y + Math.cos(ph + i * 1.3) * 0.8]);
  // mist first, trailing off every tatter: not solid, so never inked
  for (const [al, len] of [[0.14, 6.5], [0.24, 3.6]]) {
    ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = lighten(col, 0.25);
    tips.forEach(([x, y], i) => {
      const sw = Math.sin(ph + i * 1.7) * 0.8, L = len + (i % 2) * 1.2;
      ctx.beginPath(); ctx.moveTo(x + 0.9, y - 2); ctx.quadraticCurveTo(x + 0.4 + sw, y + L * 0.5, x - 1.6 + sw, y + L); ctx.quadraticCurveTo(x - 1 + sw * 0.5, y + L * 0.3, x - 1.3, y - 2); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  const nearW = [9.2 + r * 0.5, -18 - r * 0.2], farW = [8.2 - r * 0.5, -20.6 + r * 0.2];
  // the far arm: a ragged sleeve in shade and a long grey hand
  part(ctx, (c) => {
    c.fillStyle = darken(col, 0.3);
    poly(c, [[-0.4, -23.4], [2.6, -24.2], [farW[0] - 1.4, farW[1] - 1.6], [farW[0] - 0.4, farW[1] + 0.4], [farW[0] - 1.8, farW[1] + 1.4], [farW[0] - 2.6, farW[1] + 0.4], [farW[0] - 3.4, farW[1] + 1.6], [1, -19]]); c.fill();
    c.fillStyle = darken(bone, 0.3);
    taper(c, [[farW[0] - 1.4, farW[1]], farW], [1.1, 0.9]);
    for (const [fx, fy] of [[2.6, -1.1], [3, 0], [2.4, 1]]) taper(c, [farW, [farW[0] + fx, farW[1] + fy + r * 0.2]], [0.55, 0.4]);
  });
  // the shroud: long, narrow, streaming back into the tatters
  const robe = [
    [4.4, -25.2], [5.4, -22], [5.8, -17], [5.2, -11.5], [...tips[0], 1], [2.6, -9.4], [...tips[1], 1], [-0.6, -9], [...tips[2], 1],
    [-4, -9.6], [...tips[3], 1], [-6.8, -10.8], [...tips[4], 1], [-8.4, -13.6], [-6.8, -19], [-4.4, -23.6], [-2.4, -25.6],
  ];
  part(ctx, (c) => {
    c.fillStyle = tone(c, -7, -26, 6, -12, col, 0.3, 0.42); curve(c, robe); c.fill();
    c.save(); curve(c, robe); c.clip();
    // folds falling from the shoulders to the tatters
    for (const [x0, x1, w] of [[-3, -6.6, 1.3], [0, -2.4, 1.1], [3, 1.4, 0.9]]) {
      c.strokeStyle = darken(col, 0.4); c.lineWidth = w; c.beginPath(); c.moveTo(x0, -22.5); c.quadraticCurveTo(x0 - 0.2, -15, x1, -6); c.stroke();
      c.strokeStyle = lighten(col, 0.22); c.lineWidth = 0.5; c.beginPath(); c.moveTo(x0 + w * 0.75, -22.5); c.quadraticCurveTo(x0 + w * 0.75 - 0.2, -15, x1 + w * 0.75, -6); c.stroke();
    }
    // the lower shroud sinks into the drowned dark as it frays
    c.fillStyle = lin(c, 0, -13, 0, -5, [[0, rgba(darken(col, 0.5), 0)], [0.4, rgba(darken(col, 0.5), 0.35)], [1, rgba(darken(col, 0.6), 0.7)]]);
    c.fillRect(-12, -13, 20, 10);
    c.restore();
  });
  // the hood: peaked and sodden, its tip drooping back, its mouth a pit
  part(ctx, (c) => {
    c.fillStyle = tone(c, -4, -34, 5, -23, col, 0.35, 0.4);
    curve(c, [[-3, -23.2], [-4.2, -27.2], [-3.6, -30.8], [-5.6, -32.4, 1], [-1.2, -33.4], [2.4, -32], [4.6, -29.4], [6.2, -26.4, 1], [5.2, -24.2], [1.4, -23.2]]); c.fill();
    c.fillStyle = inner;
    curve(c, [[2.2, -24], [2, -28.4], [3.6, -30.2], [5.4, -28.6], [5.9, -26.4, 1], [4.6, -24.2]]); c.fill();
    c.strokeStyle = lighten(col, 0.35); c.lineWidth = 0.5; c.beginPath(); c.moveTo(1.9, -24.6); c.quadraticCurveTo(1.7, -28.8, 3.6, -30.6); c.stroke();
    // witch-fire eyes, low in the dark
    c.fillStyle = eyes; c.fillRect(3.4, -27.6, 1, 0.6); c.fillRect(5, -27.6, 0.6, 0.6);
    c.fillStyle = lighten(eyes, 0.5); c.fillRect(3.4, -27.6, 0.5, 0.5);
  });
  // fen-weed draped over the crown and down the back, a strand off the shoulder
  part(ctx, (c) => {
    stroke(c, [[0.6, -33], [-2.2, -32.2], [-4.4, -28.8], [-5.6, -24], [-6.6, -19.4 + Math.sin(ph) * 0.4]], 0.9, weed);
    stroke(c, [[-1.4, -32.6], [-3.2, -30], [-3.6, -26], [-4, -22.4 + Math.sin(ph + 1) * 0.4]], 0.7, darken(weed, 0.2));
    stroke(c, [[1.2, -23.6], [0.6, -20.6], [1, -17.6 + Math.sin(ph + 2) * 0.5]], 0.7, weed);
    c.fillStyle = lighten(weed, 0.25);
    for (const [x, y] of [[-4.6, -28], [-5.8, -22.6], [-2.4, -31.8], [0.6, -19.4]]) c.fillRect(q(x), q(y), 1, 0.5);
  });
  // the near arm: sleeve out, a manacle, a long bony hand grasping
  part(ctx, (c) => {
    c.fillStyle = tone(c, 0, -26, 0, -16, col, 0.3, 0.42);
    poly(c, [[-1.4, -23.6], [2.4, -24.4], [nearW[0] - 1.2, nearW[1] - 1.8], [nearW[0] - 0.2, nearW[1] + 0.2], [nearW[0] - 1.4, nearW[1] + 1.2], [nearW[0] - 2, nearW[1] + 0.2], [nearW[0] - 2.8, nearW[1] + 1.8], [nearW[0] - 3.8, nearW[1] + 0.8], [0.4, -18.6]]); c.fill();
    c.strokeStyle = darken(col, 0.35); c.lineWidth = 0.6; c.beginPath(); c.moveTo(0.4, -21); c.lineTo(nearW[0] - 2.4, nearW[1] + 0.2); c.stroke();
    c.fillStyle = tone(c, 0, nearW[1] - 1, 0, nearW[1] + 1, bone, 0.3, 0.35);
    taper(c, [[nearW[0] - 1.2, nearW[1]], nearW], [1.3, 1.1]);
    const curl = fight ? (p.frame ? 0.2 : 0.9) : 0.5 + r * 0.15;
    for (const [fx, fy, l] of [[1, -0.9, 3.4], [1.2, 0, 3.8], [1, 0.9, 3.2], [0.2, 1, 2]]) {
      const tip = rot([l, fy * 0.6], [0, 0], curl * (0.6 + fy * 0.2));
      const kn = [nearW[0] + fx * 0.6 + tip[0] * 0.5, nearW[1] + fy * 0.5 + tip[1] * 0.5];
      taper(c, [[nearW[0] + fx * 0.4, nearW[1] + fy * 0.4], kn, [nearW[0] + fx * 0.6 + tip[0], nearW[1] + fy * 0.5 + tip[1] + curl * 0.7]], [0.7, 0.55, 0.35]);
    }
    // the manacle, black iron
    c.fillStyle = darken(chain, 0.35); c.fillRect(q(nearW[0] - 1.6), q(nearW[1] - 0.9), 1, 2);
    c.fillStyle = lighten(chain, 0.3); c.fillRect(q(nearW[0] - 1.6), q(nearW[1] - 0.9), 1, 0.5);
  });
  // the drowned chain from the manacle, sagging and trailing under the hem
  const sw = Math.sin(ph + 0.6);
  const chainPts = [[nearW[0] - 1.2, nearW[1] + 1.2], [nearW[0] - 2.2, -13.4], [nearW[0] - 3.8, -9.6 + sw * 0.3], [1.4 + sw * 0.4, -6.4 + sw * 0.6], [-2.4 + sw * 0.8, -3.2 + sw]];
  part(ctx, (c) => {
    let n = 0;
    for (let i = 0; i + 1 < chainPts.length; i++) {
      const [a0, a1] = [chainPts[i], chainPts[i + 1]], L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      for (let d = 0; d < L; d += 1, n++) {
        const m = lerp(a0, a1, d / L);
        c.fillStyle = n % 2 ? darken(chain, 0.25) : lighten(chain, 0.25);
        c.fillRect(q(m[0] - 0.5), q(m[1] - 0.5), 1, n % 2 ? 0.5 : 1);
      }
    }
    // weed caught on its broken end, verdigris on the last link
    c.fillStyle = mix(chain, "#5a8a78", 0.6); c.fillRect(q(chainPts[4][0] - 0.5), q(chainPts[4][1] - 0.5), 1, 1);
    stroke(c, [chainPts[3], [chainPts[3][0] - 1.2, chainPts[3][1] + 1.6 + sw * 0.4]], 0.6, weed);
  });
  ctx.restore();
  // the witch-fire glow in the hood, and a faint cold light about the hand
  const ly = q(k.bob), ox = k.dx || 0;
  glow(ctx, (4.4 + ox) * s, (-27.4 + ly) * s, 2.2 * s, eyes, 0.5);
  glow(ctx, (nearW[0] + 2 + ox) * s, (nearW[1] + ly) * s, 2.4 * s, eyes, 0.18);
};

// ---- the grave amalgam --------------------------------------------------------------
// A slow haul: the great arm reaches, plants and drags the mound on; the
// stump legs shuffle behind; heads loll out of time with one another.
// reach = the great hand [x, y]; dx lurches the mass; lg = which stump lifts.
const AMALGAM_WALK = [
  { bob: 0, dx: -0.5, tilt: -0.02, hand: [17.5, -4.5], lg: 0, loll: 0 },
  { bob: 0.5, dx: -0.5, tilt: 0.02, hand: [16.5, 0], lg: 0, loll: 1 },
  { bob: 0, dx: 0.5, tilt: 0.05, hand: [13.5, 0], lg: 1, loll: 2 },
  { bob: -0.5, dx: 0.5, tilt: 0, hand: [15.5, -4], lg: 2, loll: 3 },
];
const AMALGAM_FIGHT = [
  // reared back, the great arm raised over the heads
  { bob: -1, dx: -1.5, tilt: -0.12, hand: [9, -33], lg: 0, loll: 1, jaw: 0.5 },
  // brought down: the whole mound falls forward behind the blow
  { bob: 1, dx: 1.5, tilt: 0.12, hand: [17, -3.2], lg: 0, loll: 3, jaw: 0.8 },
];

const amalgam = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? AMALGAM_FIGHT[(p.frame || 0) % 2] : AMALGAM_WALK[(p.frame || 0) % 4];
  const s = (p.h ?? 30) / 30;
  const col = p.col, pale = p.belly, bruise = p.mane, rag = p.cloth, thread = p.hair, weed = p.cloth2;
  const far = darken(col, 0.3), ph = (k.loll / 4) * TAU;
  shadow(ctx, 1.5, 0.4, 16 * s, 3 * s, 0.34);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob), dx = k.dx;
  // points on the mound, turned by its tilt about its footing
  const M = (x, y) => { const r = rot([x, y], [0, -6], k.tilt); return [r[0] + dx, r[1] + b]; };
  // far side first: a ghoul arm clawing out of the back of the mound, a stump leg
  const wav = Math.sin(ph);
  limb(ctx, [M(-7, -22), M(-11.5, -28 + wav), M(-13 + wav, -32.5 + wav * 1.5)], [2, 1.6, 1.3], far, { extra: (c, pts) => clawHand(c, pts[2], -1.9 + wav * 0.2, 0.7, far, 0.9) });
  const stump = (hip, i, colr, w) => {
    const up = k.lg === i + 1 ? 2 : 0, fx = hip[0] + (k.lg === i + 1 ? 1.5 : -0.5);
    limb(ctx, [hip, [hip[0] + 1.2, (hip[1] - up) * 0.5 - up * 0.5], [fx, -1 - up]], [w, w * 0.85, w * 0.8], colr, {
      extra: (c, pts) => { const f = pts[2]; c.fillStyle = darken(colr, 0.1); c.beginPath(); c.ellipse(f[0] + 1, f[1] + 0.4, w * 0.6, 0.9, 0, 0, TAU); c.fill(); c.fillStyle = CLAW; for (const t of [0, 1.2]) c.fillRect(q(f[0] + 1.6 + t * 0.5), q(f[1] + 0.4), 0.5, 0.5); },
    });
  };
  stump(M(-4, -7), 1, far, 4.4);
  // the far drag arm under the belly, a thin ghoul arm pawing the ground
  const pw = fight ? 0 : Math.sin(ph + 1.5) * 1.5;
  limb(ctx, [M(3, -9), [7 + dx + pw, -5], [9 + dx + pw * 1.5, -1.2]], [2, 1.6, 1.3], far, { extra: (c, pts) => clawHand(c, pts[2], 0, 0, far, 0.9) });
  // the mound: several bodies' worth of hide, patched, stitched and stapled
  const mound = [
    M(-13, -8), M(-14.5, -13), M(-13, -19), M(-9, -23), M(-4, -25.5), M(1, -27), M(6, -25.5), M(10, -22.5), M(13, -18), M(14, -13), M(12, -8.5), M(6, -5.5), M(0, -5), M(-7, -5.2),
  ];
  part(ctx, (c) => {
    c.fillStyle = tone(c, -12, -27 + b, 10, -5 + b, col, 0.3, 0.45); curve(c, mound); c.fill();
    c.save(); curve(c, mound); c.clip();
    // patches of other hides: a pale corpse across the flank, a bruised one on top, rags
    const paleP = [M(-12, -12), M(-7, -15.4), M(-1, -14), M(1, -9.5), M(-1, -5.5), M(-9, -5)];
    c.fillStyle = tone(c, -12, -16 + b, 4, -5 + b, pale, 0.25, 0.4); curve(c, paleP); c.fill();
    const bruiseP = [M(-6, -26), M(2, -28), M(6, -24), M(3, -20), M(-4, -19.5), M(-8, -22)];
    c.fillStyle = tone(c, -8, -28 + b, 6, -19 + b, bruise, 0.25, 0.4); curve(c, bruiseP); c.fill();
    c.fillStyle = tone(c, 6, -20 + b, 14, -8 + b, rag, 0.2, 0.4);
    poly(c, [M(8, -20), M(15, -17), M(15, -9), M(11, -7.5), M(10.4, -10), M(9.4, -8.4), M(8.6, -11), M(7.4, -9.4), M(7, -14)]); c.fill();
    // an open seam in the flank: ribs showing through the dark
    c.fillStyle = MAW; curve(c, [M(-1.6, -17.4), M(3.4, -18.4), M(5.2, -16), M(3, -13.6), M(-1, -14)]); c.fill();
    for (let i = 0; i < 3; i++) { const a0 = M(0 + i * 1.7, -17.8 - i * 0.2), a1 = M(0.4 + i * 1.7, -14 - i * 0.1); c.strokeStyle = mix(TOOTH, col, 0.5); c.lineWidth = 0.6; c.beginPath(); c.moveTo(...a0); c.quadraticCurveTo(a0[0] + 1.6, (a0[1] + a1[1]) / 2, a1[0], a1[1]); c.stroke(); }
    // shade under the belly, lit rolls of flesh on top
    c.fillStyle = rgba(darken(col, 0.6), 0.5); curve(c, [M(-14, -8), M(0, -9), M(14, -9), M(14, -3), M(-14, -3)]); c.fill();
    c.fillStyle = lighten(col, 0.28);
    for (const [x, y, w] of [[-10, -19.4, 3], [8.4, -21.6, 2.6], [-12.6, -14, 1.6]]) { const m = M(x, y); c.fillRect(q(m[0]), q(m[1]), w, 0.5); }
    // the seams, and iron staples across the worst of them
    stitches(c, [M(-12, -12), M(-7, -15.4), M(-1, -14), M(1, -9.5), M(-1, -5.5)], thread);
    stitches(c, [M(-8, -22), M(-4, -19.5), M(3, -20), M(6, -24)], thread);
    stitches(c, [M(7, -14), M(8, -20), M(12, -22)], thread);
    c.restore();
    for (const [x, y] of [[-6.6, -16.6], [2.4, -20.6], [7.4, -17], [-10.4, -13.4]]) { const m = M(x, y); staple(c, m[0] - 0.8, m[1] - 0.4); }
  });
  // weed and a rag draped over the top, dripping
  part(ctx, (c) => {
    stroke(c, [M(-11, -20.6), M(-6, -24.4), M(-1, -26.4), M(4, -25.8)], 0.9, weed);
    stroke(c, [M(-10.5, -20.4), M(-12.4, -17), M(-12.8, -13.6 + wav * 0.5)], 0.8, weed);
    stroke(c, [M(3.4, -25.8), M(5, -22), M(4.6, -19.4 + wav * 0.4)], 0.7, darken(weed, 0.2));
    c.fillStyle = lighten(weed, 0.25); for (const [x, y] of [[-7, -24], [-12.4, -15.6], [4.8, -21.4]]) { const m = M(x, y); c.fillRect(q(m[0]), q(m[1]), 1, 0.5); }
  });
  // the heads: one lolling off the back, one on top, the leader at the front
  const lj = k.jaw || 0;
  const heads = [
    [M(-12.5, -20), 0.8, 2.6 + Math.sin(ph) * 0.15, 0.25 + Math.max(0, Math.sin(ph + 1)) * 0.3],
    [M(-1, -28.6), 0.85, -0.5 + Math.sin(ph + 2) * 0.12, 0.2 + lj * 0.5],
    [M(12.6, -19.5), 1.15, 0.2 + (fight ? (p.frame ? 0.25 : -0.3) : Math.sin(ph + 0.8) * 0.06), 0.25 + lj],
  ];
  for (const [[x, y], sc, ang, jaw] of heads) part(ctx, (c) => {
    c.fillStyle = tone(c, x - 3, y - 3, x + 3, y + 3, col, 0.2, 0.4);
    taper(c, [[x - 2 * Math.cos(ang), y + 2.2], [x, y + 0.4]], [3 * sc, 2.4 * sc]);
    deadHead(c, x, y, sc, ang, jaw, col, { hair: sc > 1 ? p.hair : null, eyes: p.eyes });
  });
  // the great arm, bundled from two, planted ahead and hauling
  const sh = M(10, -15), hd = [k.hand[0], Math.min(k.hand[1], -1.6)], el = ik(sh, hd, 10, 10, fight && hd[1] < -20 ? -1 : 1);
  limb(ctx, [sh, el, hd], [6, 4.6, 3.6], col, {
    hi: lighten(col, 0.2),
    extra: (c, pts) => {
      // a second, thinner arm bound along it, and the iron bands that hold them
      c.fillStyle = pale; taper(c, [lerp(pts[0], pts[1], 0.2), lerp(pts[1], pts[2], 0.1), lerp(pts[1], pts[2], 0.7)].map(([x, y]) => [x + 0.6, y + 0.9]), [1.8, 1.5, 1.2]);
      for (const t of [0.5, 1.4]) { const m = t < 1 ? lerp(pts[0], pts[1], t) : lerp(pts[1], pts[2], t - 1); c.fillStyle = darken(IRON, 0.2); c.beginPath(); c.ellipse(m[0], m[1], 1.1, 2.4, Math.atan2(pts[2][1] - pts[1][1], pts[2][0] - pts[1][0]), 0, TAU); c.fill(); c.fillStyle = lighten(IRON, 0.3); c.fillRect(q(m[0] - 0.5), q(m[1] - 1.4), 1, 0.5); }
      c.fillStyle = darken(col, 0.3); c.beginPath(); c.arc(pts[1][0], pts[1][1], 1.8, 0, TAU); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(pts[1][0] - 0.3, pts[1][1] - 0.3, 1.5, 0, TAU); c.fill();
      clawHand(c, pts[2], fight && hd[1] < -20 ? -1.4 : k.hand[1] > -1 ? 0 : 0.05, fight && p.frame ? 0.1 : k.hand[1] > -1 ? 0 : 0.6, col, 1.5, 4);
    },
  });
  // the near stump leg, and a ghoul arm hanging out of the belly, clawing
  stump(M(-8, -7), 0, col, 4.8);
  stump(M(2.5, -6), 2, col, 4);
  const hang = fight ? 1 : Math.sin(ph + 3);
  limb(ctx, [M(-2, -10), [-0.5 + dx + hang, -5], [1.4 + dx + hang * 1.4, -1.4]], [2.2, 1.7, 1.4], col, { hi: lighten(col, 0.2), extra: (c, pts) => clawHand(c, pts[2], 0.2, 0.2, col, 0.9) });
  ctx.restore();
  // the witch-fire in every socket
  for (const [[x, y], sc, ang] of heads) { const e = rot([2.5 * sc, -0.9 * sc], [0, 0], ang); glow(ctx, (x + e[0]) * s, (y + e[1]) * s, 1.6 * s * sc, p.eyes || "#7ce0b8", 0.5); }
};

export const HOLLOWBEAST_RIGS = {
  ghoul: { kind: "hbGhoul", box: { hw: 24, up: 26, down: 4 }, p: { len: 28, col: "#7c8a70", belly: "#b4bc9c", mane: "#4a5448", cloth: "#4a3a5e", hair: "#5a5246", eyes: "#7ce0b8" } },
  wraith: { kind: "hbWraith", fly: true, box: { hw: 16, up: 36, down: 4 }, p: { h: 26, col: "#566a80", mane: "#0e0c16", cloth2: "#4e6a52", skin: "#b4c6c8", hair: "#5e6662", eyes: "#7ce0b8" } },
  amalgam: { kind: "hbAmalgam", box: { hw: 29, up: 44, down: 5 }, p: { h: 33, col: "#6e7c64", belly: "#a4a88a", mane: "#6a5670", cloth: "#3e3448", hair: "#b4a684", cloth2: "#4a5a50", eyes: "#7ce0b8" } },
};
export const HOLLOWBEAST_PAINTERS = { hbGhoul: ghoul, hbWraith: wraith, hbAmalgam: amalgam };
