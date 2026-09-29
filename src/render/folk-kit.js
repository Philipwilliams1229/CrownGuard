// ============ FOLK: THE BODY KIT ============
// The pieces every tower crew is built from (folk.js re-exports it all): the
// lit blob, the head under its hood or cap, the jerkin, jointed legs and
// arms, and the crews' shared cloth. The figures themselves live in
// folk-archer.js, folk-casters.js, folk-workers.js and folk-gunners.js; the
// build crew in folk.js.

import { lighten, darken, mix as mixCol, rgba, ball, lin, part } from "./paint.js";

// A rounded limb between two points, shaded across its width. `limbStroke`
// paints it into a part already open; `limb` makes it a part of its own.
export const limbStroke = (c, x0, y0, x1, y1, w, col) => {
  const ww = w * 0.8;                                   // slim: a forearm, not a sausage
  c.strokeStyle = lin(c, x0 - ww, y0 - ww, x0 + ww, y0 + ww, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = ww;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
export const limb = (ctx, x0, y0, x1, y1, w, col) => part(ctx, (c) => limbStroke(c, x0, y0, x1, y1, w, col));
// Two bones of one limb (upper arm and forearm, thigh and shin) as ONE inked
// part: the ink runs round the whole limb, never across the joint (owner,
// 2026-09-29: no black line between the forearm and the upper arm).
// `then(c)` paints more into the same part (a gauntlet, a cuff, a sleeve's
// hem), so its edge is colour, never a second ink line across the limb.
export const limb2 = (ctx, a, b, c2, w0, w1, col0, col1 = col0, then = null) => part(ctx, (c) => {
  limbStroke(c, a[0], a[1], b[0], b[1], w0, col0);
  limbStroke(c, b[0], b[1], c2[0], c2[1], w1, col1);
  if (then) then(c);
});

// ---- the body kit ----------------------------------------------------------
// The same construction as the crown's soldiers (rigs-crown.js): a closed
// path through [x, y] points (rounded) or [x, y, 1] (a corner), lit across
// its bounds, inked as its own part; `then` paints inside it, clipped.
export const pathPts = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const st = pts[0][2] ? pts[0] : mid(pts[n - 1], pts[0]);
  c.beginPath(); c.moveTo(st[0], st[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    if (p[2]) c.lineTo(p[0], p[1]);
    else { const m = q[2] ? q : mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  }
  c.closePath();
};
// `fillLit` paints the closed path lit across its bounds into a part already
// open (several shapes that ink as ONE); `blob` makes it a part of its own.
export const fillLit = (c, pts, col, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  pathPts(c, pts);
  c.fillStyle = lin(c, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), [[0, lighten(col, o.hi ?? 0.3)], [0.5, col], [1, darken(col, o.lo ?? 0.42)]]);
  c.fill();
};
export const blob = (ctx, pts, col, o = {}) => part(ctx, (c) => {
  fillLit(c, pts, col, o);
  if (o.then) { c.save(); pathPts(c, pts); c.clip(); o.then(c); c.restore(); }
});
export const at = (pts, x, y, k = 1) => pts.map(([px, py, cn]) => (cn ? [x + px * k, y + py * k, 1] : [x + px * k, y + py * k]));
export const dab = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
export const INKY = "#2a2230";

// A head about 5 across, so a figure stands 4½ heads tall: a jaw, an ear,
// a brow, an eye with a glint, a nose that breaks the profile. The hood (or
// cap) is a peaked cowl that shades the brow and falls to the shoulders.
export const FACE = [[-2.0, 0.2], [-1.9, -1.6], [-0.6, -2.5], [1.2, -2.4], [2.1, -1.4], [2.3, -0.5], [2.8, 0.3, 1], [2.2, 0.8], [2.0, 1.6], [1.1, 2.4], [-0.4, 2.3], [-1.6, 1.4]];
export const HOOD = [[-2.2, 3.4, 1], [-2.9, 0.6], [-2.9, -1.8], [-4.8, -3.6, 1], [-1.6, -3.4], [0.6, -3.4], [2.2, -2.5], [2.9, -1.3, 1], [1.4, -1.6], [0.4, -0.6], [0.3, 1.4], [1.2, 3.4, 1]];
export const head = (ctx, x, y, pal, o = {}) => {
  const k = 1.08, hy = y - 0.3;
  const hooded = o.hood !== false;
  blob(ctx, at(FACE, x, hy, k), pal.skin, {
    hi: 0.28, lo: 0.35, then: (c) => {
      dab(c, x - 1.0 * k, hy - 0.3, 0.8, 1.2, darken(pal.skin, 0.22));                 // the ear
      c.strokeStyle = darken(pal.skin, 0.55); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(x + 0.6 * k, hy - 1.3 * k); c.lineTo(x + 1.9 * k, hy - 1.1 * k); c.stroke();   // brow
      dab(c, x + 1.05 * k, hy - 0.8 * k, 0.65, 0.9, INKY); dab(c, x + 1.05 * k, hy - 0.8 * k, 0.3, 0.3, "#fff3d2");
      dab(c, x + 1.5 * k, hy + 1.3 * k, 0.8, 0.4, darken(pal.skin, 0.45));             // the mouth
      if (hooded) { c.fillStyle = rgba(darken(pal.skin, 0.45), 0.55); c.fillRect(x - 3, hy - 3, 7, 1.6); }   // shade under the hood
    },
  });
  if (hooded) {
    const hood = pal.hood;
    blob(ctx, at(HOOD, x, hy, k), hood, {
      hi: 0.35, lo: 0.45, then: (c) => {
        c.strokeStyle = darken(hood, 0.4); c.lineWidth = 0.45;
        c.beginPath(); c.moveTo(x - 2.0 * k, hy - 2.6 * k); c.lineTo(x - 0.6 * k, hy + 1.0 * k); c.stroke();
        c.strokeStyle = lighten(hood, 0.35); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(x + 0.6 * k, hy - 3.0 * k); c.lineTo(x + 2.2 * k, hy - 1.9 * k); c.stroke();
      },
    });
    if (pal.hair) blob(ctx, at([[1.0, -1.7], [2.0, -1.4], [1.3, -0.4, 1], [0.8, -0.8]], x, hy, k), pal.hair, { hi: 0.3 });
  } else if (pal.hair) blob(ctx, at([[-2.2, 0.4], [-2.3, -1.8], [-0.6, -2.8], [1.6, -2.6], [2.3, -1.6, 1], [0.2, -1.6], [-0.9, 0.6, 1]], x, hy, k), pal.hair, { hi: 0.3 });
};

// Torso: a jerkin with shoulders, a belt, and a short skirt below it. `top`
// is the shoulder line, `h` down to the hem.
export const torso = (ctx, x, top, h, w, pal) => {
  const hw = w / 2, belt = top + h * 0.66, hem = top + h + 1.2;
  const coat = pal.coat;
  blob(ctx, [[x - hw + 0.3, belt], [x + hw - 0.2, belt], [x + hw + 0.5, hem, 1], [x - hw - 0.4, hem, 1]], darken(coat, 0.12), {
    then: (c) => { dab(c, x - hw - 1, hem - 0.8, w + 2, 0.8, darken(coat, 0.45)); dab(c, x + 0.3, belt, 0.5, hem - belt, darken(coat, 0.4)); },
  });
  blob(ctx, [[x + hw - 0.4, belt + 0.4], [x + hw - 0.1, top + h * 0.3], [x + hw * 0.8, top + 0.3], [x + 0.2, top - 0.5], [x - hw * 0.85, top + 0.2], [x - hw - 0.2, top + h * 0.35], [x - hw + 0.2, belt + 0.4]], coat, {
    then: (c) => {
      dab(c, x - hw, belt - 0.6, w, 1.2, darken(pal.trim || pal.boots, 0.15));                    // the belt
      dab(c, x + 0.6, belt - 0.6, 1, 1.2, "#d8b34a");                                               // its buckle
      c.strokeStyle = darken(coat, 0.4); c.lineWidth = 0.45;
      c.beginPath(); c.moveTo(x + hw - 1, top + 1); c.lineTo(x + hw - 1.2, belt - 0.8); c.stroke(); // the jerkin's lacing edge
      c.strokeStyle = rgba(darken(pal.trim || pal.boots, 0.1), 0.9); c.lineWidth = 0.7;             // a strap across the chest
      c.beginPath(); c.moveTo(x - hw, top + 0.8); c.lineTo(x + hw, belt - 1.2); c.stroke();
    },
  });
};

// Two jointed legs: thigh and shin, knees a touch bent, boots with a toe.
// o.hip [dx, dy] moves the hips off the planted feet (a weight shift, a
// crouch, a lunge): the knees are solved then, folding forward only.
export const THIGH = 4.08, SHIN = 2.61;
export const legs = (ctx, x, y, pal, stride = 0, o = {}) => {
  const leg = (hx, fx, col) => {
    let kx = (hx + fx) / 2 + 0.5, ky = y - 3.8, hy = y - 7.8;
    if (o.hip) { hx += o.hip[0]; hy += o.hip[1]; [kx, ky] = elbowFor(hx, hy, fx, y - 1.2, { upper: THIGH, fore: SHIN, flip: true }); }
    logJoint(ctx, "leg", [hx, hy], [kx, ky], [fx, y - 1.2], { lens: [THIGH, SHIN] });
    limb2(ctx, [hx, hy], [kx, ky], [fx, y - 1.2], 2.6, 2.3, col);
    blob(ctx, [[fx - 1.1, y - 2.2], [fx + 0.8, y - 2.2], [fx + 2.2, y - 0.4, 1], [fx + 1.8, y + 0.2, 1], [fx - 1.2, y + 0.2, 1]], darken(pal.boots, 0.2), { hi: 0.35 });
  };
  leg(x - 0.9, x - 1.6 - stride * 1.5, darken(pal.boots, 0.12));
  leg(x + 0.9, x + 1.5 + stride * 1.5, pal.boots);
};

// An arm in two parts: shoulder to elbow to hand, the elbow dropping (or,
// with bend -1, lifting) as the arm folds, and a small closed hand on the end.
export const hand = (ctx, x, y, col) => ball(ctx, x, y, 1.1, 1.2, col, { hi: 0.4, lo: 0.4 });

// ---- joints ------------------------------------------------------------------
// The joint lab (joint-lab.html) sets JOINTS.log to an array; every arm (and
// leg) drawn while it is set is logged there — shoulder, elbow, hand in the
// figure's own space (facing +x) and on the canvas — and the lab measures
// each one against the body's limits (see "Joints" in art/STYLE-GUIDE.md).
export const JOINTS = { log: null };
// the arm's two bones: shoulder to elbow, elbow to the middle of the hand
export const UPPER = 4.6, FORE = 4.4;
export const logJoint = (ctx, kind, a, b, c, o = {}) => {
  if (!JOINTS.log) return;
  const m = ctx.getTransform(), dev = ([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  JOINTS.log.push({ kind, a, b, c, flip: !!o.flip, lens: o.lens || null, dev: [dev(a), dev(b), dev(c)] });
};

// An arm in two bones that keep their length (UPPER, FORE): given where the
// hand must be, the elbow is solved, always folding the way a real elbow
// does — for a figure facing +x the forearm swings forward and up off the
// upper arm, so a hanging arm's elbow points back and a raised arm's points
// down and forward; never back like a knee. Out of reach the arm goes
// straight (the bones stretch to the target: the joint lab flags it).
//   o.flip   the other fold, for an arm raised OUT to the side, whose elbow
//            the side view sees reversed: a bow drawn to the cheek, a throw
//            cocked behind the head. Use it only for those.
//   o.elbow  [x, y]: place the elbow by hand (the lab still measures it).
//   o.col / o.glove / o.hand: false  sleeve colour, hand colour, no hand.
//   o.then(c, elbow)  paints into the arm's own part (a gauntlet, a cuff).
export const elbowFor = (sx, sy, hx, hy, o = {}) => {
  const u = o.upper ?? UPPER, f = o.fore ?? FORE;
  const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy);
  if (L >= u + f - 0.01) { const k = u / (u + f); return [sx + dx * k, sy + dy * k]; }
  const d = Math.max(L, Math.abs(u - f) + 0.05);
  const a = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (u * u + d * d - f * f) / (2 * u * d))));
  const j = a + (o.flip ? -k : k);
  return [sx + Math.cos(j) * u, sy + Math.sin(j) * u];
};
export const arm = (ctx, sx, sy, hx, hy, pal, o = {}) => {
  const [ex, ey] = o.elbow || elbowFor(sx, sy, hx, hy, o);
  logJoint(ctx, "arm", [sx, sy], [ex, ey], [hx, hy], o);
  const col = o.col || pal.coat;
  limb2(ctx, [sx, sy], [ex, ey], [hx, hy], 2.4, 2.2, col, col, o.then ? (c) => o.then(c, [ex, ey]) : null);
  if (o.hand !== false) hand(ctx, hx, hy, o.glove || pal.skin);
};
// ---- timing --------------------------------------------------------------------
// A hall picks a baked frame from a 0..1 phase; these turn a few key poses
// into eased in-betweens so an action reads as wind-up, strike, follow-
// through and settle instead of a two-frame toggle (see "Joints and motion"
// in art/STYLE-GUIDE.md).
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));   // slow out, slow in
export const easeIn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t);                // gathering speed (a strike)
export const easeOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) * (1 - t)); // losing it (a settle)
// the n-th of `n` frames for a phase p in 0..1 (wraps)
export const frameOf = (p, n) => Math.min(n - 1, Math.floor((((p % 1) + 1) % 1) * n));
// numbers, and arrays / objects of them, blended a → b
export const mixPose = (a, b, t) => {
  if (typeof a === "number") return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => mixPose(v, b[i], t));
  if (a && typeof a === "object") { const o = {}; for (const k in a) o[k] = k in b ? mixPose(a[k], b[k], t) : a[k]; return o; }
  return t < 0.5 ? a : b;
};
// a hand's path from a to b around the shoulder `sh`: angle and reach blend,
// so the hand swings on an arc as a real one does, not along a ruler
export const arcMix = (sh, a, b, t) => {
  const pa = [Math.atan2(a[1] - sh[1], a[0] - sh[0]), Math.hypot(a[0] - sh[0], a[1] - sh[1])];
  let pb = Math.atan2(b[1] - sh[1], b[0] - sh[0]);
  while (pb - pa[0] > Math.PI) pb -= 2 * Math.PI;
  while (pb - pa[0] < -Math.PI) pb += 2 * Math.PI;
  const ang = pa[0] + (pb - pa[0]) * t, r = pa[1] + (Math.hypot(b[0] - sh[0], b[1] - sh[1]) - pa[1]) * t;
  return [sh[0] + Math.cos(ang) * r, sh[1] + Math.sin(ang) * r];
};
// keys [[at, pose], ...] with `at` rising from 0 to 1: the pose at phase p,
// eased between the two keys around it (o.ease: a curve per span, default ease)
export const keyed = (keys, p, o = {}) => {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i];
    if (p <= t1) { const [t0, a] = keys[i - 1]; const k = (p - t0) / ((t1 - t0) || 1); return mixPose(a, b, (keys[i][2] || o.ease || ease)(k)); }
  }
  return keys[keys.length - 1][1];
};

// A cap over a bare head: a crown and a brim that juts forward (+x).
// It rides half a unit up the brow of a head drawn at (x, y), so the brim's
// ink (a unit deep) clears the eye's top row and the eye reads under it at
// 1x; o.lift raises the whole cap (brim and crown) further. Every caller
// today stands half a unit higher again (the smith and the build crew pass
// a y 0.5 above the head's, the musketeer lift 0.5): at that height alone
// the ink still touched the eye, pixel-luck deciding whether it showed.
export const cap = (ctx, x, y, col, o = {}) => {
  const hy = y - 0.8 - (o.lift || 0), w = o.wide ? 1.9 : 1;
  blob(ctx, [[x - 2.6 * w, hy - 1.8, 1], [x + 3.2 * w, hy - 1.8, 1], [x + 3.4 * w, hy - 1.1, 1], [x - 2.8 * w, hy - 1.1, 1]], darken(col, 0.1), { hi: 0.3 });
  blob(ctx, [[x - 2.4, hy - 1.6, 1], [x - 2.2, hy - 3.3], [x - 0.2, hy - (o.tall ? 5.2 : 4.1)], [x + 2.0, hy - 3.4], [x + 2.5, hy - 1.6, 1]], col, {
    hi: 0.35, then: (c) => { if (o.band) dab(c, x - 2.6, hy - 2.6, 5.4, 0.8, o.band); },
  });
};

// ---- headwear ----------------------------------------------------------------
// hat(ctx, x, y, kind, pal, o): what a crewman wears on his head, over a
// BARE head — draw head(ctx, x, y, pal, { hood: false }) first, at the same
// (x, y), in the same frame, so the hat rides every nod and tilt of it
// (folk-gunners.js onHead, folk-workers.js nod). Points are in the head's own
// units (FACE's: x forward, the eye at (1.05, -0.8), the brow at -1.3, the
// ear at (-1.0, -0.3)), scaled by the head's 1.08. Each kind is a different
// silhouette at 1x and none is the archer's peaked cowl (head()'s default,
// HOOD — the Archery's alone now, and the castle's own crew). Colours come
// from the palette's keys, so a hall's per-form palettes still vary them:
// pal.hood the hat's felt or cloth, pal.trim its band, plume or tails,
// pal.hair what shows under it.
//   "falconer"  a soft hunting hat (a bycocket): a round crown, the brim
//               drawn to a point over the brow and turned up high behind,
//               a hawk's tail feather swept back from the band (tawny,
//               barred, a dark tip: never the cream of the birds' heads nor
//               a clerk's white quill; o.plumeCol for another), and under
//               it a braid down the back (pal.hair; o.braid false: none).
//               o.plume: the feather's extra sweep in radians about its
//               quill's root, for the figure's secondary motion: + LIFTS it
//               (stands it up, as when she pulls back), − lays it flat and
//               trailing (as she throws forward)
//   "wrap"      the Covert's close wrap: a dark cloth (pal.hood) bound round
//               the skull from the brow to the nape, and a scarf (pal.trim,
//               a shade darker; o.maskCol) pulled up over the nose and jaw
//               and knotted behind, its two tails streaming back. The eye,
//               brow and the bridge of the nose show in the slit between
//               them. o.tails: the tails' extra sweep, + LIFTS them (the
//               crouch), − lets them hang
//   "grenadier" the bombardier's fur cap: a short flat-topped drum of rough
//               dark fur (pal.hood), a cloth bag (o.bag, red) falling from
//               its crown behind, and a brass plate on the front with a
//               burning grenade on it — the bomb-thrower's badge. The fur's
//               edge sits on the brow, so the eye shows under it
//   "chaperon"  the alchemist's (a scholar's) hat: a padded roundlet round
//               the head (pal.hood, twisted with pal.trim), a gathered puff
//               of cloth over the crown and the cornette's short end hanging
//               behind to the ear. Round and soft, never a point, never a
//               curtain down the neck (that is a hood again)
// Signs: every sweep here turns the piece about its root the way the head's
// own tilt does (+ is clockwise on screen for a figure facing +x), so for
// anything that trails back off the head + raises it and − drops it.
// Anything held up in front of the face is drawn after the hat; anything
// raised behind the head before head().
const HEAD_K = 1.08;
const HAIR = "#4a2e20";
const PLUME = "#b07844";                    // a hawk's tawny tail feather
// a closed shape in the head's frame, lit and inked as its own part
const headBlob = (ctx, x, hy, pts, col, o) => blob(ctx, at(pts, x, hy, HEAD_K), col, o);
// rotate head-frame points [x, y(, 1)] about (px, py) by a
const turn = (pts, px, py, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([u, v, cn]) => { const dx = u - px, dy = v - py, q = [px + dx * c - dy * s, py + dx * s + dy * c]; if (cn) q.push(1); return q; });
};
const HATS = {
  falconer: (ctx, x, hy, pal, o) => {
    const felt = pal.hood, band = pal.trim || darken(felt, 0.35);
    const hair = pal.hair || HAIR;
    // the braid, from under the hat's back down between the shoulders
    if (o.braid !== false) {
      headBlob(ctx, x, hy, [[-1.6, -0.6], [-2.6, 0.4], [-3.0, 2.2], [-2.9, 4.2, 1], [-2.2, 4.4, 1], [-2.1, 2.2], [-1.4, 0.6]], hair, {
        hi: 0.3, then: (c) => { for (let i = 0; i < 3; i++) dab(c, x + (-2.95 + i * 0.12) * HEAD_K, hy + (1.2 + i * 1.05) * HEAD_K, 0.9 * HEAD_K, 0.35, darken(hair, 0.4)); },
      });
      headBlob(ctx, x, hy, [[-2.2, -1.6], [-2.4, 0.3], [-1.2, 0.6, 1], [-1.0, -0.8]], hair, { hi: 0.3 });   // under the brim, over the ear's back
    }
    // the plume, a hawk's tail feather swept back from the band (behind the
    // crown): drawn 0.85 of its old length about its root, so it clears the
    // perches and the wheel behind her
    const plumeCol = o.plumeCol || PLUME, bar = darken(plumeCol, 0.55);
    const sw = o.plume || 0;
    const pv = (pts) => at(turn(pts.map(([u, v, cn]) => [-1.3 + (u + 1.3) * 0.85, -2.9 + (v + 2.9) * 0.85, cn]), -1.3, -2.9, sw), x, hy, HEAD_K);
    const vane = pv([[-0.9, -3.1], [-1.8, -5.0], [-3.5, -6.3], [-5.3, -6.6], [-6.5, -6.1, 1], [-5.0, -5.7], [-3.4, -5.3], [-2.2, -4.2], [-1.6, -2.7]]);
    part(ctx, (c) => {
      fillLit(c, vane, plumeCol, { hi: 0.25, lo: 0.3 });
      c.save(); pathPts(c, vane); c.clip();
      c.strokeStyle = bar; c.lineWidth = 0.7; c.lineCap = "butt";                     // two dark bars across the vane
      for (const [a, b] of [[[-3.7, -4.2], [-2.1, -6.6]], [[-5.0, -5.0], [-4.0, -7.1]]]) { const [p, q] = pv([a, b]); c.beginPath(); c.moveTo(...p); c.lineTo(...q); c.stroke(); }
      c.fillStyle = bar; pathPts(c, pv([[-5.7, -7.6, 1], [-7.6, -7.6, 1], [-7.6, -4.6, 1], [-5.7, -4.6, 1]])); c.fill();   // and the dark tip
      const q = pv([[-1.3, -3.0], [-2.1, -4.8], [-3.9, -5.9], [-5.6, -6.1]]);
      c.strokeStyle = lighten(plumeCol, 0.3); c.lineWidth = 0.35;                    // the pale quill down the vane
      c.beginPath(); c.moveTo(...q[0]); c.quadraticCurveTo(...q[1], ...q[2]); c.lineTo(...q[3]); c.stroke();
      c.restore();
    });
    // the crown, then the brim: peaked over the brow, turned up behind
    headBlob(ctx, x, hy, [[-2.3, -1.8], [-2.3, -3.5], [-1.0, -4.8], [0.9, -4.8], [2.1, -3.6], [2.3, -1.9, 1]], felt, {
      hi: 0.35, lo: 0.42, then: (c) => dab(c, x - 2.6 * HEAD_K, hy - 2.7 * HEAD_K, 5.2 * HEAD_K, 0.75 * HEAD_K, band),
    });
    headBlob(ctx, x, hy, [[-3.5, -4.3, 1], [-2.4, -2.8], [-0.4, -2.3], [2.2, -2.1], [4.2, -1.3, 1], [2.2, -1.2], [-0.8, -1.4], [-2.6, -1.7], [-3.1, -2.6]], darken(felt, 0.08), { hi: 0.4, lo: 0.4 });
  },
  wrap: (ctx, x, hy, pal, o) => {
    const cloth = pal.hood, scarf = pal.trim || lighten(cloth, 0.3), mask = o.maskCol || darken(scarf, 0.18);
    const tw = o.tails || 0, T = (pts, a) => at(turn(pts, -2.3, -0.6, a), x, hy, HEAD_K);
    // the scarf's knot behind the head and its two tails streaming back, ONE
    // part (no ink between them); the wrap covers its root
    part(ctx, (c) => {
      fillLit(c, T([[-2.2, -1.2], [-3.8, -1.1], [-5.6, -0.2], [-6.4, 0.6, 1], [-5.0, 0.5], [-3.5, 0.2], [-2.3, 0.0]], tw), scarf, { hi: 0.3 });
      fillLit(c, T([[-2.4, -0.4], [-3.4, 0.9], [-4.4, 2.6], [-4.6, 3.6, 1], [-3.7, 2.4], [-2.8, 1.2], [-2.0, 0.4]], tw * 0.6), darken(scarf, 0.15), { hi: 0.3 });
      fillLit(c, at([[-3.1, -1.3], [-2.0, -1.5], [-1.8, -0.4], [-2.8, 0.0]], x, hy, HEAD_K), darken(scarf, 0.05), { hi: 0.35 });
    });
    // the wrap over the skull and down the back of the neck: its front edge
    // high on the brow (its ink is the brow line), the ear half under it
    headBlob(ctx, x, hy, [[-2.5, 1.2], [-2.6, -1.4], [-1.7, -2.8], [0.3, -3.1], [1.9, -2.8], [2.6, -1.95], [2.45, -1.7, 1], [0.6, -1.75], [-0.4, -1.55], [-0.95, 0.1], [-1.5, 1.4]], cloth, {
      hi: 0.4, lo: 0.4, then: (c) => {
        c.strokeStyle = darken(cloth, 0.45); c.lineWidth = 0.4;                         // a turn of the cloth
        c.beginPath(); c.moveTo(x - 2.2 * HEAD_K, hy - 2.2 * HEAD_K); c.lineTo(x + 1.6 * HEAD_K, hy - 2.3 * HEAD_K); c.stroke();
      },
    });
    // the scarf over the nose and jaw (it rides to a point past the nose),
    // its top edge under the eye, a shade lighter than the wrap so the two
    // read as two cloths and the eye, brow and nose between them as a face
    headBlob(ctx, x, hy, [[-1.2, 0.4], [0.5, 0.55, 1], [2.3, 0.45], [3.1, 0.85, 1], [2.35, 1.2], [2.1, 1.8], [1.1, 2.6], [-0.4, 2.5], [-1.4, 1.6]], mask, {
      hi: 0.3, lo: 0.35, then: (c) => dab(c, x + 0.3 * HEAD_K, hy + 0.55 * HEAD_K, 2.3 * HEAD_K, 0.4, lighten(mask, 0.3)),   // its hem, catching the light
    });
  },
  grenadier: (ctx, x, hy, pal, o) => {
    const fur = pal.hood, bag = o.bag || "#8a2f2a";
    // the bag, from the crown down the back of the drum
    headBlob(ctx, x, hy, [[-0.2, -4.3], [-1.6, -4.9], [-3.1, -4.6], [-3.6, -3.5, 1], [-2.9, -3.2, 1], [-2.4, -3.9], [-1.2, -3.9]], bag, {
      hi: 0.35, lo: 0.4, then: (c) => dab(c, x - 3.5 * HEAD_K, hy - 3.6 * HEAD_K, 0.9, 0.9, "#d8b34a"),   // its tassel
    });
    // the drum of fur: flat on top, a rough edge, its hem on the brow
    headBlob(ctx, x, hy, [[-2.6, -0.8, 1], [-2.9, -1.8], [-2.6, -2.7, 1], [-2.9, -3.5], [-2.3, -4.4, 1], [-1.2, -4.2], [-0.4, -4.55, 1], [0.6, -4.25], [1.5, -4.55, 1], [2.3, -4.2], [2.6, -3.3, 1], [2.45, -2.4], [2.75, -1.55, 1], [2.55, -1.3, 1], [0.8, -1.4], [-0.6, -1.25], [-1.1, -0.5]], fur, {
      hi: 0.45, lo: 0.4, then: (c) => {
        c.fillStyle = lighten(fur, 0.4);                                                 // tufts catching the light
        for (const [u, v] of [[-1.6, -3.9], [-0.1, -4.1], [-2.2, -2.9], [-1.0, -3.1], [-1.9, -1.9]]) c.fillRect(x + u * HEAD_K, hy + v * HEAD_K, 0.6, 0.5);
        // the brass plate on the front, a grenade with its flame on it
        const px = x + 0.7 * HEAD_K, py = hy - 3.7 * HEAD_K;
        c.fillStyle = "#d8b34a"; c.fillRect(px, py, 1.6 * HEAD_K, 2.2 * HEAD_K);
        c.fillStyle = "#f4dc8a"; c.fillRect(px, py, 0.5, 2.2 * HEAD_K);
        c.fillStyle = "#6a4a1e"; c.fillRect(px + 0.55 * HEAD_K, py + 1.1 * HEAD_K, 0.8, 0.8);                    // the grenade
        c.fillStyle = "#e86a2a"; c.fillRect(px + 0.8 * HEAD_K, py + 0.35 * HEAD_K, 0.5, 0.6);                    // its flame
      },
    });
  },
  chaperon: (ctx, x, hy, pal, o) => {
    const cloth = pal.hood, twist = pal.trim || lighten(cloth, 0.35);
    // the cornette's end, a short flap hanging off the back of the roll to
    // the ear's height (never a curtain down the neck: that reads as a hood)
    headBlob(ctx, x, hy, [[-2.0, -3.1], [-3.2, -2.8], [-3.8, -1.5], [-3.6, -0.1, 1], [-2.8, -0.5], [-2.5, -1.6]], darken(cloth, 0.12), { hi: 0.3, lo: 0.4 });
    // the gathered puff over the crown, folds in it
    headBlob(ctx, x, hy, [[-2.0, -2.9], [-1.8, -4.2], [-0.4, -5.0], [1.2, -4.7], [2.1, -3.6], [1.9, -2.8]], lighten(cloth, 0.08), {
      hi: 0.4, lo: 0.4, then: (c) => {
        c.strokeStyle = darken(cloth, 0.35); c.lineWidth = 0.4;
        for (const [a, b] of [[[-0.9, -3.0], [-0.6, -4.5]], [[0.6, -3.0], [0.5, -4.5]]]) { c.beginPath(); c.moveTo(x + a[0] * HEAD_K, hy + a[1] * HEAD_K); c.lineTo(x + b[0] * HEAD_K, hy + b[1] * HEAD_K); c.stroke(); }
      },
    });
    // the roundlet: a padded roll round the head at the brow, twisted with gold
    headBlob(ctx, x, hy, [[-2.9, -2.0], [-2.7, -3.3], [-1.2, -3.7], [1.2, -3.6], [2.7, -3.0], [3.0, -2.1], [2.5, -1.35, 1], [0.8, -1.5], [-1.2, -1.35], [-2.6, -1.3]], cloth, {
      hi: 0.45, lo: 0.4, then: (c) => {
        c.strokeStyle = mixCol(twist, cloth, 0.35); c.lineWidth = 0.45;
        for (const u of [-1.7, 0.0, 1.7]) { c.beginPath(); c.moveTo(x + (u - 0.5) * HEAD_K, hy - 1.4 * HEAD_K); c.lineTo(x + (u + 0.5) * HEAD_K, hy - 3.5 * HEAD_K); c.stroke(); }
      },
    });
  },
};
export const HAT_KINDS = Object.keys(HATS);
export const hat = (ctx, x, y, kind, pal, o = {}) => { const fn = HATS[kind]; if (fn) fn(ctx, x, y - 0.3, pal, o); };

export const CREW_FOLK = {
  engineer: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
  smith: { skin: "#e8b990", hood: "#4a3a2e", coat: "#5a4a3c", boots: "#2e2420", trim: "#6a4a2e" },
  clerk: { skin: "#e8b990", hood: "#3a4a6a", coat: "#4a5a7a", boots: "#2a2a30", trim: "#d8b34a" },
  blade: { skin: "#e8b990", hood: "#2a2434", coat: "#3a3244", boots: "#1e1a26", trim: "#6a5a80" },
  bladeGuild: { skin: "#e8b990", hood: "#2e3a2a", coat: "#3a4a34", boots: "#1e241c", trim: "#8a6aa8" },
  mistress: { skin: "#e8b990", hood: "#7a3c30", coat: "#8a5a3a", boots: "#3e2a1a", trim: "#d8b34a", hair: "#5a3222" },
  mistressCourt: { skin: "#e8b990", hood: "#3a3468", coat: "#5a4a8c", boots: "#2a2a30", trim: "#d8b34a", hair: "#2e2426" },
  bomber: { skin: "#e8b990", hood: "#3a3028", coat: "#5a4a3c", boots: "#2e2420", trim: "#3a3028" },
  musketeer: { skin: "#e8b990", hood: "#2c2a36", coat: "#3a4a6a", boots: "#2a2a30", trim: "#c8b070" },
};
