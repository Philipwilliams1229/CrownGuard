// ============ RIGS: THE GREENWOOD BEASTS ============
// Bespoke bodies for the Greenwood roster. Entries in BEAST_RIGS override the
// generic ones in rigs.js (same shape: { kind, box: { hw, up, down }, p, fly? });
// BEAST_PAINTERS maps each new `kind` to its painter (ctx, p) — the pose is
// p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-1 fight), feet at 0,0,
// facing +x. Frames are baked once and inked by rigs.js.
//
// The dire wolf gallops (extend, fore-strike, gather, hind-strike), the boar
// trots heavy on diagonal pairs, the fell bat is a scrap of leather on a
// four-beat flap, and the dragon is the chapter's boss: long neck, horned
// jaw, spined back, finger-boned wings, a spade on the tail, fire in the belly.
// Colour params keep the generic names (col, belly, mane, wing, skin, cloth,
// hair, eyes) so the necromancer's revive() still pales them.

import { lighten, darken, mix, shadow, glow, lin, part } from "./paint.js";
import { weapon } from "./rigs.js";
import { HORDE_PAINTERS } from "./rigs-horde.js";

const TAU = Math.PI * 2;
const q = (v) => Math.round(v * 2) / 2;             // snap to the art pixel
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };

// ---- shape kit --------------------------------------------------------------
// A smooth closed outline through pts (midpoint quadratics); a point with a
// third element set is a hard corner — ear tips, noses, claws.
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
// three cel tones down a gradient line: sunlit, body, shade
const tone = (c, x0, y0, x1, y1, col, hi = 0.3, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
// a tapering tube through pts, ws = width at each point (fills with the current style)
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
// the unit normal of a centreline at point i, turned to face up (or down)
const normalAt = (pts, i, up = true) => {
  const a = pts[Math.max(0, Math.ceil(i) - 1)], b = pts[Math.min(pts.length - 1, Math.floor(i) + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  let n = [-dy / l, dx / l];
  if ((n[1] < 0) !== up) n = [-n[0], -n[1]];
  return n;
};
// two-bone reach: the middle joint for a limb from a to b; bend +1 folds the
// joint toward -x (a foreleg's elbow), -1 toward +x (a hind stifle)
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const t = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1))));
  const ang = Math.atan2(dy, dx) + bend * t;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
// one leg as its own inked piece: a lit strip down the sun side, a paw or hoof
const leg = (ctx, pts, ws, col, o = {}) => part(ctx, (c) => {
  c.fillStyle = col; taper(c, pts, ws);
  if (o.hi) { c.fillStyle = o.hi; taper(c, pts.slice(0, -1).map(([x, y], i) => [x - ws[i] * 0.24, y - 0.2]), ws.slice(0, -1).map((w) => w * 0.34)); }
  if (o.extra) o.extra(c, pts);
});
// a spike standing off an edge point along normal n, leaning back (-x)
const spike = (c, p, n, h, w = 0.9) => {
  const t = [-n[1], n[0]];
  poly(c, [[p[0] + t[0] * w, p[1] + t[1] * w], [p[0] + n[0] * h - h * 0.45, p[1] + n[1] * h], [p[0] - t[0] * w, p[1] - t[1] * w]]);
  c.fill();
};

// ---- the riders -------------------------------------------------------------
// The crown's berserker astride his wolf: hip at (x, y), facing +x, axe on
// the shoulder at the run, raised and brought down in the fight. Colours ride
// on the mount's own params — skin, cloth, cloth2, hair — so they revive too.
const berserker = (ctx, p, x, y, fight, frame) => {
  const r = p.rider, skin = p.skin, cloth = p.cloth, hair = p.hair;
  const lean = fight ? (frame === 1 ? 1.4 : -0.8) : 0.5;
  ctx.save(); ctx.translate(x, y);
  // far arm, on the scruff
  leg(ctx, [[1 + lean, -5.2], [4.2 + lean * 0.6, -2.8], [5 + lean * 0.6, -2.4]], [1.8, 1.5, 1.6], darken(skin, 0.3));
  // near leg, draped down the flank
  leg(ctx, [[0.2, -0.8], [3.2, 1.4], [2.4, 4.6]], [3, 2.3, 2], darken(cloth, 0.22), { hi: lighten(darken(cloth, 0.22), 0.25), extra: (c) => { c.fillStyle = "#3a2a22"; c.beginPath(); c.ellipse(3.1, 5, 1.6, 1, 0, 0, TAU); c.fill(); } });
  // torso, leaning into the ride, bare-chested like the hall's berserkers:
  // one strap across it and a fur belt
  part(ctx, (c) => {
    curve(c, [[-2.4, 0.6], [2.2, 0.6], [2.6 + lean * 0.4, -3], [2.2 + lean, -6.2], [lean * 0.8, -7], [-1.8 + lean * 0.8, -6.2], [-2.6, -2.6]]);
    c.fillStyle = tone(c, -2.6, -7, 2.6, 0, skin, 0.3, 0.4); c.fill();
    c.strokeStyle = p.cloth2 || darken(cloth, 0.4); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-1.8 + lean * 0.8, -6.2); c.lineTo(2.2, -0.6); c.stroke();
    c.fillStyle = cloth; c.fillRect(-2.6, -1.8, 5.4, 1.4);
  });
  // head: a wild red mane and beard
  const hx = 1.8 + lean * 1.1, hy = -9.2;
  part(ctx, (c) => {
    c.fillStyle = tone(c, hx - 2.4, hy - 2.4, hx + 2.4, hy + 2.4, skin, 0.3, 0.35);
    curve(c, [[hx - 2, hy + 0.4], [hx - 1.6, hy - 2], [hx + 0.8, hy - 2.4], [hx + 2.2, hy - 0.8], [hx + 2.6, hy + 0.6, 1], [hx + 1.8, hy + 1.4], [hx - 0.6, hy + 2.2]]); c.fill();
    c.fillStyle = tone(c, hx - 3, hy - 4, hx + 2, hy + 3, hair, 0.3, 0.4);
    curve(c, [[hx - 3.4, hy + 1.8, 1], [hx - 2.6, hy + 0.4], [hx - 4, hy - 0.8, 1], [hx - 2.4, hy - 1.6], [hx - 2.8, hy - 3.4, 1], [hx - 0.8, hy - 2.8], [hx + 0.4, hy - 4, 1], [hx + 1.2, hy - 2.6], [hx + 2.4, hy - 2.2, 1], [hx + 1.6, hy - 1.2], [hx - 0.4, hy - 1.4], [hx - 1, hy + 1.2]]); c.fill();
    curve(c, [[hx + 0.4, hy + 1.2], [hx + 2.2, hy + 1.2], [hx + 1.8, hy + 3.2, 1], [hx + 0.6, hy + 2.6]]); c.fill();
    c.fillStyle = "#3a6aa8"; c.fillRect(hx - 0.4, hy - 0.8, 3, 1);   // war paint across the eyes
    c.fillStyle = "#2a2230"; c.fillRect(hx + 1.1, hy - 0.4, 0.6, 0.7);
  });
  // near arm and the axe in it
  const sh = [0.4 + lean, -5.6];
  const hand = fight ? (frame === 1 ? [5.6, -4.2] : [-0.4, -10]) : [2.8 + lean, -4.6];
  const ang = fight ? (frame === 1 ? 0.15 : -2.3) : -2.55 + Math.sin(((p.frame || 0) / 4) * TAU) * 0.1;
  weapon(ctx, r.weapon || "axe", hand[0], hand[1], ang, r.wcol, r.ws || 1);
  leg(ctx, [sh, hand], [2, 1.7], skin, { extra: (c) => { c.fillStyle = skin; c.beginPath(); c.arc(hand[0], hand[1], 0.95, 0, TAU); c.fill(); } });
  ctx.restore();
};

// The boar's lancer is the horde's own goblin (rigs-horde.js), sat astride:
// painted from the hips up over a leg of ours bent down the flank. Spear up
// on the march, drawn back and thrust in the fight.
const GOB_HIP = 7.95;   // the horde goblin's standing hip height at h 20
const goblinRider = (ctx, p, x, y, fight, frame) => {
  const r = p.rider, h = r.h ?? 16, k = h / 20;
  const skin = p.skin, wrap = darken(p.cloth2 || p.cloth, 0.05);
  leg(ctx, [[x + 0.2, y - 0.4], [x + 3, y + 1.6], [x + 2.2, y + 4.6]], [1.9, 1.5, 1.4], skin, {
    hi: lighten(skin, 0.2),
    extra: (c) => { c.fillStyle = wrap; c.fillRect(x + 1.5, y + 3, 1.5, 1.4); c.fillStyle = darken(wrap, 0.1); c.beginPath(); c.ellipse(x + 2.9, y + 5, 1.5, 0.8, 0, 0, TAU); c.fill(); },
  });
  const sink = fight ? (frame === 1 ? 0.63 : 0.21) : 0;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 40, y - 40, 80, 41.2); ctx.clip();
  ctx.translate(x, y + (GOB_HIP - sink) * k);
  HORDE_PAINTERS.hGoblin(ctx, { h, skin, cloth: p.cloth, cloth2: p.cloth2, hair: p.hair, eyes: p.eyes, head: r.head || "hood", weapon: "spear", wcol: r.wcol, pose: fight ? "fight" : "walk", frame: fight ? frame : 0 });
  ctx.restore();
};

// ---- the dire wolf ---------------------------------------------------------------
// A four-beat gallop: fn/ff/hn/hf = near fore, far fore, near hind, far hind
// as [foot x, foot y (0 = ground), pastern/hock lean]. arch bows the back,
// st stretches the body, hd drops the head, tail lifts the brush.
const WOLF_RUN = [
  // stretched out in flight: forepaws reaching, hind legs streaming back
  { bob: -1.5, arch: -0.4, st: 1, hd: 0.5, tail: -0.12, fn: [13.5, -3.5, 0.9], ff: [11.5, -3, 0.6], hn: [-16.5, -3.5, -1.1], hf: [-14.5, -3, -0.9] },
  // the forefeet strike
  { bob: 0, arch: 0.3, st: 0, hd: 1, tail: 0.05, fn: [7, 0, 0.25], ff: [2.5, 0, -0.5], hn: [-4, -3, 0.3], hf: [-7, -4.5, -0.3] },
  // gathered: all four under the body, back bowed
  { bob: -1, arch: 1.5, st: -1, hd: 0, tail: 0.2, fn: [3.5, -3.5, -1.3], ff: [5, -2.5, -0.8], hn: [-1, -2, 0.5], hf: [-3, -1.5, 0.4] },
  // the hind feet strike and drive
  { bob: 0, arch: 0.6, st: 0, hd: 0.5, tail: 0.05, fn: [10, -3.5, 0.3], ff: [7.5, -2.5, -0.6], hn: [-5, 0, 0.2], hf: [-8, 0, -0.2] },
];
const WOLF_FIGHT = [
  // braced and snarling, head low, hackles up
  { bob: 1, arch: 0.8, st: 0, hd: 2, tail: 0.45, jaw: 0.3, hackles: 1.6, fn: [11, 0, 0.3], ff: [8, 0, 0.2], hn: [-6, 0, 0.3], hf: [-9, 0, 0] },
  // the lunge: forefeet off the ground, jaws wide
  { bob: -1.5, arch: -0.3, st: 1.2, hd: 0, tail: -0.2, jaw: 0.62, dx: 2.5, hackles: 1.6, fn: [16, -5, 1], ff: [14, -3.5, 0.8], hn: [-11.5, 0, -0.4], hf: [-13.5, 0, -0.5] },
];

const wolf = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? WOLF_FIGHT[(p.frame || 0) % 2] : WOLF_RUN[(p.frame || 0) % 4];
  const s = (p.len ?? 30) / 30;
  const col = p.col, pale = p.belly, dark = p.mane || darken(col, 0.3), far = darken(col, 0.3);
  shadow(ctx, 1.5, 0.4, 12 * s, 2 * s, 0.3);
  ctx.save(); ctx.scale(s, s); ctx.translate(k.dx || 0, 0);
  const b = q(k.bob), a = k.arch, st = k.st;
  const S = [6.5 + st, -11.8 + b], H = [-7 - st * 0.5, -12.3 + b];
  // a foreleg: shoulder, elbow (folds back), wrist, paw; a hind leg: hip,
  // stifle (folds forward), hock, paw — the long wolf hock is what makes it run
  const fore = (sh, [fx, fy, th]) => { const pw = [fx, fy - 0.8], w = [pw[0] - Math.sin(th) * 1.7, pw[1] - Math.cos(th) * 1.7]; return [sh, ik(sh, w, 5.2, 5.4, 1), w, pw]; };
  const hind = (hp, [fx, fy, ph]) => { const pw = [fx, fy - 0.8], hk = [pw[0] - Math.sin(ph) * 3.6, pw[1] - Math.cos(ph) * 3.6]; return [hp, ik(hp, hk, 5, 4.8, -1), hk, pw]; };
  const paw = (colr) => (c, pts) => { const [fx, fy] = pts[pts.length - 1]; c.fillStyle = colr; c.beginPath(); c.ellipse(fx + 0.5, fy + 0.1, 1.3, 0.7, 0, 0, TAU); c.fill(); };
  // far legs, in shade
  leg(ctx, hind(add(H, [-0.8, -0.6]), k.hf), [3.4, 2.3, 1.7, 1.5], far, { extra: paw(darken(far, 0.1)) });
  leg(ctx, fore(add(S, [-0.8, -0.6]), k.ff), [3, 2.2, 1.7, 1.5], far, { extra: paw(darken(far, 0.1)) });
  // the brush, carried low and straight behind at the run
  part(ctx, (c) => {
    c.save(); c.translate(-10.8 - st * 0.6, -14.4 + b); c.rotate(-(0.22 + k.tail));
    curve(c, [[0.8, -1.5], [-3, -2.2], [-7, -2.1], [-10.4, -1], [-12.4, 0.4, 1], [-10.4, 1.2], [-9.6, 0.9, 1], [-8.8, 2, 1], [-7.6, 1.4, 1], [-6.4, 2.4, 1], [-5.2, 1.7], [-2, 1.9], [0.6, 1.3]]);
    c.fillStyle = tone(c, 0, -2.2, 0, 2.4, col, 0.25, 0.4); c.fill();
    c.clip();
    c.fillStyle = dark; c.fillRect(-13, -3, 4, 6); c.fillRect(-9, -3, 9.5, 1.3);
    c.restore();
  });
  // body, neck and head: one mass
  const hx = q(st * 0.8), hy = q(b + k.hd);
  const Hp = (x, y) => [x + hx, y + hy];
  part(ctx, (c) => {
    // far ear, and the ruff at the scruff (the hackles, raised to fight)
    fillPoly(c, [Hp(12.4, -20), Hp(12.9, -23.4), Hp(14.3, -20.6)], darken(col, 0.3));
    c.fillStyle = dark;
    const hk = k.hackles || 0.7;
    for (const [x0, y0] of [[5, -17.6], [7.2, -18.2], [9.4, -18.8]]) spike(c, [x0 + st * 0.5, y0 + b - a * 0.3], [0, -1], 1.3 * hk, 1);
    // neck and body
    const body = [
      [11 + st * 0.6, -13.4 + b], [9.8 + st * 0.6, -9 + b], [4.5 + st * 0.4, -7 + b], [-1, -9.4 + b + a * 0.2], [-4.6 - st * 0.3, -11.2 + b - a * 0.3],
      [-8.6 - st * 0.6, -10 + b], [-11.6 - st * 0.6, -12.2 + b], [-11 - st * 0.6, -15 + b - a * 0.2], [-6 - st * 0.3, -15.9 + b - a * 0.9],
      [0, -16.4 + b - a], [5.5 + st * 0.5, -18 + b - a * 0.3], [9.6 + st * 0.6, -16.6 + b],
    ];
    const bodyFill = tone(c, 0, -18 + b, 0, -8 + b, col, 0.28, 0.4);
    c.fillStyle = bodyFill;
    curve(c, [[5 + st * 0.5, -17.2 + b - a * 0.3], Hp(12.2, -20.4), Hp(13.6, -15.6), [11.2 + st * 0.6, -12.2 + b], [8, -13.5 + b]]); c.fill();
    curve(c, body); c.fill();
    // the dark saddle down the back, the pale underside, both with a furry edge
    c.save(); curve(c, body); c.clip();
    c.fillStyle = dark;
    curve(c, [[-12, -16 + b], [-6, -17 + b - a], [0, -17.6 + b - a], [6, -19 + b], [8.5, -15.4 + b, 1], [6.5, -15.8 + b], [5, -14.6 + b, 1], [3, -15.4 + b - a * 0.8], [1, -14.4 + b - a * 0.8, 1], [-1, -15.2 + b - a * 0.8], [-3, -14.4 + b - a * 0.6, 1], [-5, -15 + b - a * 0.6], [-7, -14 + b, 1], [-9, -14.6 + b], [-12, -13 + b]]); c.fill();
    c.fillStyle = pale;
    curve(c, [[12, -12.8 + b], [10.2, -8.4 + b], [4.5, -6.2 + b], [-1, -8.6 + b], [-5, -10.6 + b], [-3.6, -10.6 + b - a * 0.3, 1], [-2.6, -9.6 + b, 1], [-0.4, -10.4 + b, 1], [1, -9.4 + b, 1], [3, -10.2 + b, 1], [4.6, -9.2 + b, 1], [6.4, -10.8 + b, 1], [8, -10 + b, 1], [9.2, -12 + b]]); c.fill();
    c.restore();
    // throat ruff
    c.fillStyle = pale;
    curve(c, [Hp(13.4, -15.8), [11.6 + st * 0.6, -12.2 + b], [9.8 + st * 0.6, -10.2 + b, 1], [10.6 + st * 0.6, -12.6 + b], [10 + st * 0.6, -13 + b, 1], Hp(11.8, -15.8), Hp(11.4, -16.6, 1), Hp(12.8, -16.8)]); c.fill();
    // the head
    c.save(); c.translate(hx, hy);
    const jaw = k.jaw || 0, hinge = [14.6, -16.4];
    const J = (pt) => rot(pt, hinge, jaw);
    if (jaw) fillPoly(c, [hinge, [20.4, -17.1], J([20.2, -17]), J([16, -16.6])], "#5a1c24");
    c.fillStyle = mix(col, pale, 0.5);
    curve(c, [[14.2, -16.6], J([20.2, -17]), J([19.8, -16.2]), J([17.2, -15.4]), J([14.6, -14.8]), [13.4, -15.6]]); c.fill();
    if (jaw) { c.fillStyle = "#ece0c4"; const t1 = J([19.2, -16.9]), t2 = J([17.4, -16.7]); for (const t of [t1, t2]) { poly(c, [[t[0] - 0.4, t[1] + 0.2], [t[0], t[1] - 1], [t[0] + 0.4, t[1] + 0.2]]); c.fill(); } }
    c.fillStyle = tone(c, 0, -21, 0, -15.5, col, 0.3, 0.35);
    curve(c, [[12, -17.4], [12.6, -19.8], [14.6, -21], [16.8, -20.4], [19.2, -19.5], [21, -18.7], [21.5, -17.6, 1], [20.6, -17], [17.5, -16.8], [15, -15.6], [12.6, -15.6]]); c.fill();
    if (jaw) { c.fillStyle = "#ece0c4"; poly(c, [[19.3, -17.1], [19.8, -15.8], [20.2, -17.1]]); c.fill(); poly(c, [[17.6, -16.9], [18, -16], [18.4, -16.9]]); c.fill(); }
    // pale cheek and muzzle side, the near ear
    c.fillStyle = pale; curve(c, [[13.2, -16.2], [15.6, -17.6], [18.6, -17.3], [17.4, -16.7], [14.8, -15.8]]); c.fill();
    c.fillStyle = tone(c, 0, -24, 0, -20, col, 0.3, 0.3); poly(c, [[13.5, -20.3], [14.6, -24.2], [16.2, -20.5]]); c.fill();
    fillPoly(c, [[14.3, -20.6], [14.8, -22.8], [15.5, -20.7]], darken(col, 0.5));
    // nose, brow and the yellow eye
    c.fillStyle = "#231c26"; c.beginPath(); c.ellipse(21, -17.9, 0.8, 0.6, 0, 0, TAU); c.fill();
    c.fillStyle = darken(col, 0.55); poly(c, [[15.6, -20.1], [18.4, -19.4], [18.2, -18.9], [15.8, -19.5]]); c.fill();
    c.fillStyle = p.eyes || "#e8c14a"; c.fillRect(16.4, -19.2, 1.5, 0.8);
    c.fillStyle = "#1a1420"; c.fillRect(17.4, -19.2, 0.5, 0.8);
    c.restore();
  });
  // near legs, the haunch rounded over the flank
  const hn = hind(H, k.hn), fn = fore(S, k.fn);
  leg(ctx, hn, [4, 2.6, 1.9, 1.7], col, {
    hi: lighten(col, 0.2),
    extra: (c, pts) => {
      paw(pale)(c, pts);
      const m = lerp(pts[0], pts[1], 0.4), ang = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
      c.fillStyle = tone(c, 0, -18 + b, 0, -8 + b, col, 0.28, 0.4);
      c.beginPath(); c.ellipse(m[0], m[1], 3.4, 2.4, ang, 0, TAU); c.fill();
    },
  });
  leg(ctx, fn, [3.4, 2.5, 1.8, 1.7], col, { hi: lighten(col, 0.2), extra: paw(pale) });
  ctx.restore();
  // the rider sits a man's size on the wolf's back: scaled up about his own
  // hip so the seat stays on the saddle
  if (p.rider) {
    ctx.save();
    ctx.translate((0.5 + st * 0.3 + (k.dx || 0)) * s, (-16 + b - a * 0.8) * s);
    ctx.scale(s * 1.35, s * 1.35);
    berserker(ctx, p, 0, 0, fight, p.frame || 0);
    ctx.restore();
  }
  glow(ctx, (17 + hx + (k.dx || 0)) * s, (-18.8 + hy) * s, 1.8 * s, p.eyes || "#e8c14a", 0.45);
};

// ---- the war boar ---------------------------------------------------------------
// A heavy trot on diagonal pairs: nf/ff/nh/hf = [foot x, foot y]. tilt tips
// the head (down to gore, up to toss), hd drops it.
const BOAR_TROT = [
  { bob: 0, hd: 0.5, tail: 0, nf: [10, 0], ff: [4, 0], nh: [-10.5, 0], fh: [-4.5, 0] },
  { bob: -1, hd: -0.5, tail: 1, nf: [7, 0], ff: [9, -3], nh: [-6, -2.8], fh: [-8, 0] },
  { bob: 0, hd: 0.5, tail: 0, nf: [4, 0], ff: [10, 0], nh: [-4.5, 0], fh: [-10.5, 0] },
  { bob: -1, hd: -0.5, tail: -1, nf: [9, -3], ff: [7, 0], nh: [-8, 0], fh: [-6, -2.8] },
];
const BOAR_FIGHT = [
  // head down, tusks levelled, braced
  { bob: 0.5, hd: 1, tilt: 0.22, dx: -1, tail: 1, nf: [11.5, 0], ff: [9.5, 0], nh: [-8, 0], fh: [-11, 0] },
  // the toss: head ripping up, forefeet leaving the ground
  { bob: -1, hd: -1, tilt: -0.34, dx: 2, tail: -1, nf: [12.5, -2], ff: [11, -1], nh: [-8.5, 0], fh: [-11, 0] },
];

const boar = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? BOAR_FIGHT[(p.frame || 0) % 2] : BOAR_TROT[(p.frame || 0) % 4];
  const s = (p.len ?? 30) / 30;
  const col = p.col, pale = p.belly, dark = p.mane || darken(col, 0.45), far = darken(col, 0.32);
  const hoofCol = "#2e2228";
  shadow(ctx, 1.5, 0.4, 12 * s, 2.2 * s, 0.32);
  ctx.save(); ctx.scale(s, s); ctx.translate(k.dx || 0, 0);
  const b = q(k.bob);
  const bodyTone = (c) => tone(c, 0, -20 + b, 0, -5 + b, col, 0.28, 0.42);
  const S = [6.4, -8 + b], H = [-7.8, -8.6 + b];
  // the visible leg below the belly: knee folds forward, hock folds back
  const fl = (sh, [fx, fy]) => { const f = [fx, fy - 1]; return [sh, ik(sh, f, 3.8, 3.6, -1), f]; };
  const hl = (hp, [fx, fy]) => { const f = [fx, fy - 1]; return [hp, ik(hp, f, 4, 3.8, 1), f]; };
  const hoof = (c, pts) => { const [fx, fy] = pts[pts.length - 1]; fillPoly(c, [[fx - 1, fy - 0.2], [fx + 1.1, fy - 0.2], [fx + 1.5, fy + 1.1], [fx - 1, fy + 1.1]], hoofCol); };
  leg(ctx, hl(add(H, [-0.8, -0.6]), k.fh), [3.8, 2.2, 1.8], far, { extra: hoof });
  leg(ctx, fl(add(S, [-0.8, -0.6]), k.ff), [3.6, 2.2, 1.8], far, { extra: hoof });
  // the whip of a tail, tufted
  part(ctx, (c) => {
    const tw = k.tail * 0.8;
    c.strokeStyle = darken(col, 0.2); c.lineWidth = 0.9; c.lineCap = "round";
    c.beginPath(); c.moveTo(-10.2, -12 + b); c.quadraticCurveTo(-12.6, -13.2 + b + tw, -12.6, -10.6 + b + tw); c.stroke();
    fillPoly(c, [[-13.2, -11 + b + tw], [-12, -11 + b + tw], [-12.8, -9 + b + tw]], dark);
  });
  // the body: all shoulder and hump, falling away to small hams
  const body = [
    [9.5, -6.2 + b], [2, -5.2 + b], [-5, -5.8 + b], [-9, -7.6 + b], [-10.8, -10.4 + b], [-9.6, -13.4 + b],
    [-5, -16 + b], [1, -19.6 + b], [6.4, -19.4 + b], [10.6, -15 + b], [11, -8.6 + b],
  ];
  part(ctx, (c) => {
    // the crest first, standing up off the spine; the body covers its roots
    const ridge = [[8.6, -18], [6.4, -19.6], [4, -20.4], [1.6, -20], [-0.8, -18.8], [-3.2, -17.4], [-5.4, -16], [-7.6, -14.6]];
    const hs = [2, 2.6, 3, 3, 2.7, 2.3, 1.8, 1.2];
    c.fillStyle = dark;
    ridge.forEach(([x, y], i) => spike(c, [x, y + b + 0.8], [0, -1], hs[i], 1));
    c.fillStyle = bodyTone(c);
    curve(c, body); c.fill();
    c.save(); curve(c, body); c.clip();
    // paler, shaggy underside
    c.fillStyle = pale;
    curve(c, [[11, -8 + b], [2, -4.6 + b], [-6, -5.2 + b], [-10, -7 + b], [-8, -7.8 + b, 1], [-6.6, -6.8 + b, 1], [-5, -8 + b, 1], [-3, -6.8 + b, 1], [-1, -8 + b, 1], [1, -6.8 + b, 1], [3, -8.2 + b, 1], [5, -7 + b, 1], [7, -8.6 + b, 1], [9, -7.8 + b]]); c.fill();
    // the dark bristled mantle over the shoulders
    c.fillStyle = dark;
    curve(c, [[11.4, -16.4 + b], [2, -21.8 + b], [-5, -17 + b], [-8.6, -14.6 + b], [-5.4, -14 + b, 1], [-3.6, -12.8 + b, 1], [-1.6, -14.4 + b, 1], [0.4, -13 + b, 1], [2.4, -15 + b, 1], [4.4, -13.6 + b, 1], [6.4, -15.4 + b, 1], [8.4, -14 + b, 1], [10.2, -14.6 + b]]); c.fill();
    c.restore();
  });
  // the head: a heavy wedge slung low, ending in the snout disc, tusks hooked up
  part(ctx, (c) => {
    c.save(); c.translate(0, q(b + k.hd));
    const piv = [10, -11];
    c.translate(piv[0], piv[1]); c.rotate(k.tilt || 0); c.translate(-piv[0], -piv[1]);
    fillPoly(c, [[8.6, -15.8], [6.8, -18.6], [10, -16.6]], darken(col, 0.35));
    c.fillStyle = dark;
    for (const [x, y, h] of [[9.6, -16, 2], [11.4, -15, 1.6]]) spike(c, [x, y], [0, -1], h, 0.8);
    c.fillStyle = tone(c, 8, -16.5, 19, -4, col, 0.3, 0.4);
    curve(c, [[8.6, -16.4], [12, -14.8], [16, -11.2], [19.4, -8.6], [20.8, -8.4, 1], [21, -5.2, 1], [18.8, -4.6], [15.4, -4.2], [12, -5], [9.4, -8]]); c.fill();
    // bristled jowl
    c.fillStyle = darken(col, 0.25);
    curve(c, [[10.4, -9], [14, -7.6], [16, -5], [13.6, -4.6, 1], [13, -3.8, 1], [11.8, -4.8, 1], [10.6, -4.4, 1], [9.6, -7.4]]); c.fill();
    // the snout disc, nostrils, a grim mouth
    c.fillStyle = mix(col, "#e0a090", 0.55); c.beginPath(); c.ellipse(20.6, -6.8, 0.8, 1.6, 0, 0, TAU); c.fill();
    c.fillStyle = "#2a1c24"; c.fillRect(20.6, -7.8, 0.5, 0.6); c.fillRect(20.6, -6.2, 0.5, 0.6);
    c.fillStyle = darken(col, 0.55); c.fillRect(16.4, -5.1, 3.4, 0.5);
    // the tusks: far one in shade, near one curling up past the snout
    c.fillStyle = "#b8a888"; taper(c, [[16.6, -5], [17.4, -6.2], [17.8, -7.8]], [1, 0.8, 0.3]);
    c.fillStyle = "#ece0c4"; taper(c, [[17.4, -4.4], [18.6, -5.4], [19.2, -7.2], [19.2, -9]], [1.5, 1.2, 0.8, 0.3]);
    // the near ear, laid back in temper, and the angry little eye
    c.fillStyle = tone(c, 0, -19, 0, -15, col, 0.3, 0.3); poly(c, [[9.4, -15.6], [7.4, -19.2], [11.6, -16]]); c.fill();
    fillPoly(c, [[9.6, -16.2], [8.2, -18.2], [10.8, -16.2]], darken(col, 0.5));
    c.fillStyle = darken(col, 0.6); poly(c, [[12.2, -13], [15, -11.8], [14.8, -11.2], [12.2, -12.3]]); c.fill();
    c.fillStyle = p.eyes || "#e05248"; c.fillRect(13.4, -11.6, 1.2, 0.8);
    c.restore();
  });
  // near legs, hams rounded over the flank (in the body's own bands, so only
  // the ink line draws them)
  leg(ctx, hl(H, k.nh), [4.4, 2.4, 1.9], col, {
    hi: lighten(col, 0.2),
    extra: (c, pts) => { hoof(c, pts); c.fillStyle = bodyTone(c); c.beginPath(); c.ellipse(-7.4, -10.2 + b, 3.4, 3.8, 0.4, 0, TAU); c.fill(); },
  });
  leg(ctx, fl(S, k.nf), [4, 2.4, 1.9], col, { hi: lighten(col, 0.2), extra: hoof });
  if (p.rider) goblinRider(ctx, p, -3, -16.6 + b, fight, p.frame || 0);
  ctx.restore();
  glow(ctx, (14 + (k.dx || 0)) * s, (-11.2 + b + k.hd) * s, 1.6 * s, p.eyes || "#e05248", 0.5);
};

// ---- the fell bat -----------------------------------------------------------------
// W = the wrist, T = three fingertips (leading first); mirrored for the other wing
const BAT = [
  { bob: 0.5, W: [4.5, -15.5], T: [[9, -19], [11, -13.5], [8, -9.5]] },
  { bob: 0, W: [5.5, -11.5], T: [[11.5, -13], [11.5, -8.5], [7.5, -6.5]] },
  { bob: -1, W: [5, -7.5], T: [[10, -4], [7.5, -1.5], [4, -3]] },
  { bob: -0.5, W: [4, -12.5], T: [[6.5, -16], [8.5, -11.5], [6, -8.5]] },
];

const fellbat = (ctx, p) => {
  const s = (p.h ?? 10) / 10;
  const fight = p.pose === "fight";
  const k = BAT[fight ? ((p.frame || 0) % 2) * 2 : (p.frame || 0) % 4];
  const col = p.col, mem = p.wing || lighten(col, 0.12);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob) + (fight && p.frame === 1 ? 1 : 0), dx = fight && p.frame === 1 ? 1.5 : 0;
  ctx.translate(dx, b);
  for (const sgn of [-1, 1]) part(ctx, (c) => {
    const X = ([x, y]) => [0.4 + sgn * x, y];
    const sh = X([1.4, -9.4]), hip = X([1, -6.8]), W = X(k.W), T = k.T.map(X);
    c.beginPath(); c.moveTo(...sh); c.lineTo(...W); c.lineTo(...T[0]);
    let prev = T[0];
    for (const n of [T[1], T[2], hip]) { const m = lerp(prev, n, 0.5), cp = lerp(m, W, 0.38); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
    c.closePath();
    const ys = [sh[1], W[1], ...T.map((t) => t[1]), hip[1]];
    const wc = sgn < 0 ? darken(mem, 0.12) : mem;
    c.fillStyle = tone(c, 0, Math.min(...ys), 0, Math.max(...ys), wc, 0.25, 0.35); c.fill();
    // arm and finger bones
    c.fillStyle = darken(col, 0.3); taper(c, [sh, W], [1.1, 0.9]);
    for (const t of T) taper(c, [W, t], [0.6, 0.4]);
    c.fillStyle = "#ece0c4"; c.fillRect(W[0] - 0.25, W[1] - 1, 0.5, 0.8);
  });
  // the furry body, the big ears, red eyes and fangs
  part(ctx, (c) => {
    c.fillStyle = tone(c, -2, -12, 2, -5, col, 0.3, 0.4);
    fillPoly(c, [[-0.8, -12.6], [-1.6, -16], [0.4, -13.2]], darken(col, 0.1));
    fillPoly(c, [[1.2, -13.2], [2.6, -16.2], [2.6, -12.4]], col);
    c.fillStyle = tone(c, -2, -12, 2, -5, col, 0.3, 0.4);
    curve(c, [[0.4, -5.4], [-1.6, -6.6], [-2.2, -9], [-1.4, -11.6], [0.6, -13.4], [2.4, -12.2], [2.8, -9], [2.2, -6.6]]); c.fill();
    fillPoly(c, [[1.6, -13], [2.3, -15], [2.3, -12.8]], "#8a5a6a");
    c.fillStyle = lighten(col, 0.2); c.fillRect(-0.6, -9.4, 2, 2.4);
    c.fillStyle = "#2a1c24"; c.fillRect(-0.6, -5.6, 0.6, 0.8); c.fillRect(1, -5.6, 0.6, 0.8);
    c.fillStyle = p.eyes || "#e05248"; c.fillRect(-0.2, -12.2, 0.8, 0.8); c.fillRect(1.3, -12.2, 0.8, 0.8);
    c.fillStyle = "#ece0c4"; c.fillRect(0.1, -10.6, 0.5, 0.8); c.fillRect(1.1, -10.6, 0.5, 0.8);
  });
  glow(ctx, 0.2, -11.8, 1.3, p.eyes || "#e05248", 0.55); glow(ctx, 1.7, -11.8, 1.3, p.eyes || "#e05248", 0.55);
  ctx.restore();
};

// ---- the dragon ---------------------------------------------------------------------
// The flap: wing key, body bob (it rises on the downstroke), neck and tail
// sway. Fight: the breath — rear back with the fire rising in the throat,
// then throw the head forward and let it go.
const DRAGON_FLY = [
  { bob: 1, wing: 0, neck: 0, tail: 1, head: 0.04 },
  { bob: -0.5, wing: 1, neck: 0.6, tail: 0, head: 0 },
  { bob: -2, wing: 2, neck: 0, tail: -1, head: -0.04 },
  { bob: -0.5, wing: 3, neck: -0.6, tail: 0, head: 0 },
];
const DRAGON_FIGHT = [
  { bob: -1, wing: 0, neck: -2.5, neckY: -1, tail: 1, head: -0.3, jaw: 0.12, windup: true },
  { bob: 0, wing: 1, neck: 2.5, neckY: 1.5, tail: -1, head: 0.2, jaw: 0.5, fire: true },
];
// wing joints relative to the shoulder: E elbow, W wrist, T four fingertips
// (leading first), B where the trailing edge meets the flank
const WINGS = [
  { E: [-4, -9], W: [4, -21], T: [[12, -26], [-2, -31], [-16, -28], [-28, -18]], B: [-18, 4] },
  { E: [-3, -6], W: [7, -13], T: [[19, -16], [8, -23], [-8, -24], [-24, -17]], B: [-18, 4] },
  { E: [-1, 6], W: [8, 12], T: [[18, 16], [8, 22], [-4, 22], [-16, 14]], B: [-18, 4] },
  { E: [-4, -8], W: [-1, -18], T: [[5, -24], [-7, -26], [-18, -21], [-26, -11]], B: [-18, 4] },
];

const dwing = (ctx, R, key, sc, mem, bone, tilt = 0) => part(ctx, (c) => {
  const P = (v) => { const r = rot(v, [0, 0], tilt); return [R[0] + r[0] * sc, R[1] + r[1] * sc]; };
  const E = P(key.E), W = P(key.W), T = key.T.map(P), B = P(key.B);
  // the membrane: along the arm to the first fingertip, then scalloped from
  // tip to tip and back to the flank
  const edge = () => {
    c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]);
    let prev = T[0];
    for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
    c.closePath();
  };
  edge(); c.fillStyle = mem; c.fill();
  c.save(); edge(); c.clip();
  // sun along the arm, shade pooling in the scallops
  c.strokeStyle = lighten(mem, 0.18); c.lineWidth = 7 * sc; c.lineJoin = "round";
  c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]); c.stroke();
  c.strokeStyle = darken(mem, 0.3); c.lineWidth = 4 * sc;
  let prev = T[0]; c.beginPath(); c.moveTo(...prev);
  for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
  c.stroke();
  c.restore();
  // arm and finger bones
  c.fillStyle = bone; taper(c, [R, E, W], [3.2 * sc, 2.4 * sc, 2 * sc]);
  for (const t of T) taper(c, [W, t], [1.4 * sc, 0.6 * sc]);
  // the thumb claw at the wrist
  fillPoly(c, [[W[0] - 0.8, W[1] + 0.2], [W[0] + 0.8, W[1] - 2.8], [W[0] + 1.2, W[1] + 0.4]], "#e8dfc6");
});

const wyrm = (ctx, p) => {
  const fight = p.pose === "fight";
  const k = fight ? DRAGON_FIGHT[(p.frame || 0) % 2] : DRAGON_FLY[(p.frame || 0) % 4];
  const s = (p.len ?? 72) / 72;
  const col = p.col, belly = p.belly, mem = p.wing, horn = "#e8dfc6";
  const spineCol = darken(p.wing, 0.35), far = darken(col, 0.32);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob), ns = k.neck, ny = k.neckY || 0, tw = k.tail;
  const key = WINGS[k.wing];
  const bodyTone = (c) => tone(c, 0, -25 + b, 0, -6 + b, col, 0.28, 0.42);
  // far wing, in shade, set back and up behind the body
  dwing(ctx, [-1, -25 + b], key, 0.88, darken(mem, 0.3), darken(col, 0.3), -0.28);
  // the legs, tucked up and dangling a beat behind the body
  const dang = -b * 0.5;
  const claws = (c, pts) => { const [fx, fy] = pts[pts.length - 1]; c.fillStyle = horn; for (let i = 0; i < 3; i++) poly(c, [[fx - 1 + i, fy], [fx - 0.2 + i, fy + 2], [fx + 0.3 + i, fy + 0.1]]), c.fill(); };
  const hindLeg = (o, cl) => leg(ctx, [add(o, [-8, -9.5 + b]), add(o, [-12.5, -4.5 + b + dang]), add(o, [-10, -2.4 + b + dang])], [4, 2.8, 2.2], cl, { extra: claws });
  const foreLeg = (o, cl) => leg(ctx, [add(o, [10, -11 + b]), add(o, [8.4, -7 + b]), add(o, [11.6, -4.4 + b + dang]), add(o, [13.4, -3.8 + b + dang])], [3.8, 2.8, 2.2, 1.8], cl, { extra: claws });
  hindLeg([-3, -1.5], far);
  foreLeg([-3, -1.5], far);
  // the long body: tail, torso and neck in one mass, spines standing off it
  const TL = [[-14, -13.5 + b], [-21, -11 + b], [-28, -9 + b + tw * 0.6], [-35, -10 + b + tw * 1.2], [-40, -14 + b + tw * 1.8], [-43, -19 + b + tw * 2]];
  const TW = [9, 6.6, 5, 3.6, 2.4, 1.5];
  const NK = [[12, -20 + b], [17.5 + ns * 0.4, -25.5 + b + ny * 0.4], [20 + ns * 0.8, -31 + b + ny * 0.8], [24 + ns, -35 + b + ny]];
  const NW = [10.5, 7.6, 6, 5.2];
  const torso = [[16, -19 + b], [15, -12 + b], [10, -8 + b], [2, -6.5 + b], [-6, -6.5 + b], [-12, -8 + b], [-16, -11 + b], [-16, -16 + b], [-10, -19.5 + b], [-1, -22.5 + b], [7, -24.5 + b], [13, -23 + b]];
  part(ctx, (c) => {
    c.fillStyle = spineCol;
    // spines: down the neck, along the back, dwindling down the tail
    for (let i = 0; i < 3; i++) for (const t of [0.3, 0.75]) {
      const pt = lerp(NK[i], NK[i + 1], t), n = normalAt(NK, i + t, true), w = NW[i] + (NW[i + 1] - NW[i]) * t;
      spike(c, add(pt, [n[0] * (w / 2 - 0.6), n[1] * (w / 2 - 0.6)]), n, 3 - i * 0.3, 1.1);
    }
    [[9, -24.2, 3.6], [5, -24, 4.2], [1, -23, 4.2], [-3, -21.8, 3.8], [-7, -20.4, 3.4], [-11, -18.6, 3], [-14.5, -16.6, 2.6]].forEach(([x, y, h]) => spike(c, [x, y + b + 0.6], [0, -1], h, 1.4));
    for (let i = 1; i < TL.length - 1; i++) { const n = normalAt(TL, i, true); spike(c, add(TL[i], [n[0] * (TW[i] / 2 - 0.4), n[1] * (TW[i] / 2 - 0.4)]), n, 2.4 - i * 0.35, 0.9); }
    // the tail and its spade
    c.fillStyle = bodyTone(c); taper(c, TL, TW);
    const e = TL[TL.length - 1], pe = TL[TL.length - 2], dl = Math.hypot(e[0] - pe[0], e[1] - pe[1]), d = [(e[0] - pe[0]) / dl, (e[1] - pe[1]) / dl], n = [-d[1], d[0]];
    const S = (u, v) => [e[0] + d[0] * u + n[0] * v, e[1] + d[1] * u + n[1] * v];
    c.fillStyle = spineCol; poly(c, [S(-0.6, 0.7), S(0.2, 3.2), S(5.2, 0), S(0.2, -3.2), S(-0.6, -0.7)]); c.fill();
    // torso and neck
    c.fillStyle = bodyTone(c);
    curve(c, torso); c.fill();
    c.fillStyle = tone(c, 0, -38 + b, 0, -18 + b, col, 0.28, 0.42); taper(c, NK, NW);
    // cream belly plates down the throat and under the body
    const throat = NK.map((pt, i) => { const n2 = normalAt(NK, i, false); return add(pt, [n2[0] * NW[i] * 0.24, n2[1] * NW[i] * 0.24]); });
    c.fillStyle = belly; taper(c, throat, NW.map((w) => w * 0.48));
    c.save(); curve(c, torso); c.clip();
    const bel = [[17, -16 + b], [14.6, -11 + b], [9.6, -7.4 + b], [2, -5.8 + b], [-6, -5.8 + b], [-12, -7.6 + b], [-12, -9.4 + b], [-6, -9 + b], [0, -9.4 + b], [6, -10.8 + b], [11, -14 + b], [13.4, -18.6 + b]];
    c.fillStyle = tone(c, 0, -17 + b, 0, -6 + b, belly, 0.2, 0.3); curve(c, bel); c.fill();
    curve(c, bel); c.clip();
    c.fillStyle = darken(belly, 0.35);
    for (let x = -9.6; x <= 12; x += 2.7) c.fillRect(x, -16 + b, 0.5, 11);
    c.restore();
    c.strokeStyle = darken(belly, 0.35); c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) for (const t of [0.25, 0.75]) {
      const pt = lerp(throat[i], throat[i + 1], t), n2 = normalAt(throat, i + t, false), w = (NW[i] + (NW[i + 1] - NW[i]) * t) * 0.22;
      c.beginPath(); c.moveTo(pt[0] - n2[0] * w, pt[1] - n2[1] * w); c.lineTo(pt[0] + n2[0] * w, pt[1] + n2[1] * w); c.stroke();
    }
  });
  // the head: horned, brow-ridged, a jaw that opens
  const HB = NK[NK.length - 1];
  const jaw = k.jaw || 0;
  const headXf = (c) => { c.translate(HB[0], HB[1]); c.rotate(k.head || 0); };
  part(ctx, (c) => {
    c.save(); headXf(c);
    // far horn, in shade
    c.fillStyle = darken(horn, 0.3); taper(c, [[3, -4.6], [0.6, -6.8], [-2.4, -8.4], [-5.4, -9.4]], [2.2, 1.6, 1, 0.4]);
    // cheek frills
    fillPoly(c, [[1, 1.2], [-4.4, 3.6], [0.4, 3.2]], darken(col, 0.2));
    fillPoly(c, [[-0.4, -0.8], [-5, -0.2], [-0.8, 1]], darken(col, 0.2));
    const hinge = [2, 1], J = (pt) => rot(pt, hinge, jaw);
    if (jaw) fillPoly(c, [hinge, [12.8, 0.6], J([12, 0.9]), J([4, 2])], k.fire || k.windup ? "#e8a040" : "#4a1418");
    // lower jaw
    c.fillStyle = tone(c, 0, 0, 0, 4.4, col, 0.2, 0.4);
    curve(c, [[1.2, 1.3], J([12.2, 0.9]), J([11.8, 2.2]), J([7, 3.2]), J([3, 4.2]), [0.4, 3.4]]); c.fill();
    c.fillStyle = belly; curve(c, [J([3.5, 3.4]), J([7, 2.6]), J([10.5, 2]), J([7, 3.4])]); c.fill();
    if (jaw) { c.fillStyle = horn; for (const x of [5.5, 8, 10.5]) { const t = J([x, 1.2]); poly(c, [[t[0] - 0.5, t[1] + 0.3], [t[0], t[1] - 1.3], [t[0] + 0.5, t[1] + 0.3]]); c.fill(); } }
    // the skull and snout
    c.fillStyle = tone(c, 0, -5, 0, 2, col, 0.3, 0.4);
    curve(c, [[-1.6, -1.6], [0.4, -4.4], [4.6, -5.2, 1], [6.6, -3.8], [10.5, -2.8], [13.2, -2], [14, -0.4, 1], [12.8, 0.6], [7, 0.8], [3.5, 1.2], [1, 2.6], [-1.6, 1.6]]); c.fill();
    // teeth hanging over the lip
    c.fillStyle = horn; for (const x of jaw ? [5, 7.5, 10, 12] : [7.5, 11.6]) { poly(c, [[x - 0.5, 0.6], [x, 2], [x + 0.5, 0.6]]); c.fill(); }
    // brow ridge, nostril, the gold eye
    c.fillStyle = darken(col, 0.45); poly(c, [[2.4, -4], [7.2, -3.3], [6.8, -2.6], [2.8, -3]]); c.fill();
    c.fillStyle = "#2a1418"; c.fillRect(12, -1.6, 1, 0.6);
    c.fillStyle = p.eyes || "#e8c14a"; c.fillRect(4.2, -2.6, 2, 1);
    c.fillStyle = "#1a1016"; c.fillRect(5.2, -2.6, 0.5, 1);
    // the near horn, swept back
    c.fillStyle = tone(c, -6, -10, 3, -3, horn, 0.2, 0.35); taper(c, [[2.6, -3.8], [-0.6, -5.8], [-4, -7.4], [-7.6, -8.2]], [2.8, 2.1, 1.3, 0.5]);
    c.fillStyle = tone(c, -1, -7, 2, -2, horn, 0.2, 0.35); taper(c, [[4.4, -4.2], [3.6, -6], [2.4, -7.2]], [1.5, 1.1, 0.4]);
    c.restore();
  });
  // near legs, then the near wing over everything
  // the near haunch shares the leg's outline, so thigh flows into shin
  leg(ctx, [[-8, -9.5 + b], [-12.5, -4.5 + b + dang], [-10, -2.4 + b + dang]], [4, 2.8, 2.2], col, {
    extra: (c, pts) => { claws(c, pts); c.fillStyle = bodyTone(c); c.beginPath(); c.ellipse(-9.6, -11.6 + b, 5.6, 3.4, 0.8, 0, TAU); c.fill(); },
  });
  foreLeg([0, 0], col);
  dwing(ctx, [4, -22.5 + b], key, 1, mem, lighten(col, 0.08));
  // the fire: kindling in the throat, then the breath itself
  const HP = (pt) => { const r = rot(pt, [0, 0], k.head || 0); return [HB[0] + r[0], HB[1] + r[1]]; };
  if (k.windup) {
    glow(ctx, ...lerp(NK[1], NK[2], 0.5), 5, "#f0a040", 0.55);
    const m = HP([13, 1]); glow(ctx, m[0], m[1], 2.6, "#ffd070", 0.8);
    const nz = HP([12.5, -1.6]); ctx.fillStyle = "rgba(150,140,140,0.4)"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(nz[0] + 1 + i * 1.6, nz[1] - 1.4 - i * 1.4, 0.8 + i * 0.35, 0, TAU); ctx.fill(); }
  }
  if (k.fire) part(ctx, (c) => {
    c.save(); headXf(c); c.translate(12.5, 1.2); c.rotate(0.12);
    c.fillStyle = tone(c, 0, -5, 0, 5, "#d8563a", 0.2, 0.3);
    curve(c, [[0, -0.8], [5, -3], [10, -4.6], [14, -3.6], [16.4, -1, 1], [15, 1.6], [16.6, 3.6, 1], [12.6, 5.2], [7.4, 4.6], [3, 2.4], [0, 1]]); c.fill();
    c.fillStyle = "#f0a040"; curve(c, [[0.5, -0.4], [5, -1.8], [10, -2.6], [13, -1], [11.4, 1.6], [13.4, 3], [8, 3.2], [3, 1.6], [0.5, 0.6]]); c.fill();
    c.fillStyle = "#fff3d2"; curve(c, [[0.5, -0.2], [4, -0.8], [8, -0.8], [6.4, 0.8], [8.4, 1.8], [3.6, 1.2], [0.5, 0.4]]); c.fill();
    c.restore();
  });
  const eyeP = HP([5.2, -2.1]);
  glow(ctx, eyeP[0], eyeP[1], 2.6, p.eyes || "#e8c14a", 0.55);
  ctx.restore();
};

// ---- the roster ---------------------------------------------------------------------
const WOLF = { len: 26, col: "#8e919c", belly: "#dcd6c6", mane: "#4a4c5a", eyes: "#e8c14a" };
export const BEAST_RIGS = {
  wolf: { kind: "direwolf", box: { hw: 24, up: 28, down: 4 }, p: { ...WOLF } },
  wolfrider: { kind: "direwolf", box: { hw: 24, up: 44, down: 4 }, p: { ...WOLF, len: 28, skin: "#e8b990", cloth: "#6a3a2a", cloth2: "#3a2018", hair: "#b0503a", rider: { weapon: "axe", wcol: "#b8bcc4" } } },
  boarrider: { kind: "warboar", box: { hw: 26, up: 34, down: 4 }, p: { len: 32, col: "#6e4a38", belly: "#96725c", mane: "#3a2620", eyes: "#e05248", skin: "#6aa04f", cloth: "#5f4326", cloth2: "#3c2a18", hair: "#5a4630", rider: { h: 18, head: "hood", wcol: "#c4c8d0" } } },
  bat: { kind: "fellbat", fly: true, box: { hw: 14, up: 20, down: 2 }, p: { h: 10, col: "#4a3a48", wing: "#6a4a62", eyes: "#e05248" } },
  dragon: { kind: "wyrm", fly: true, box: { hw: 56, up: 62, down: 6 }, p: { len: 72, col: "#b4463a", belly: "#ecd4a2", wing: "#6c2630", eyes: "#e8c14a" } },
};
export const BEAST_PAINTERS = { direwolf: wolf, warboar: boar, fellbat, wyrm };
