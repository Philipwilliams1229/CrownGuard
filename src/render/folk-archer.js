// ============ FOLK: THE ARCHER ============
// The bowman of the archer halls and the castle wall, and the crews' cloth
// by tower and path. Built from folk-kit.js; folk.js re-exports it.

import { lighten, darken, shadow, roundRect, lin, part } from "./paint.js";
import { limb, dab, head, torso, legs, arm, hand, elbowFor, logJoint, mixPose } from "./folk-kit.js";

// ---- the shot, as key poses ---------------------------------------------------
// Side view, facing +x, feet at (0, 0). Both arms are solved by arm() with
// their bones at full length; only the hands are placed:
//   ns / fs   the near (string) and far (bow) shoulders. He stands side-on,
//             so the bow shoulder is the forward one; the string shoulder
//             settles back as he comes to full draw
//   h         the string hand;  flip: its elbow is the one raised OUT to the
//             side (the set, the draw, the anchor, the loose) — see
//             "Joints and motion" in art/STYLE-GUIDE.md
//   g, rot    the bow hand on the grip, and the bow's roll (+ = top forward)
//   str       1 while the string hand holds the string (the limbs then bend
//             with the pull), 0 when it runs free; shiver: it hums after the loose
//   arr       0 no arrow, 1 nocked (nock at the hand, shaft over the bow
//             hand), 2 carried in the hand at angle `aa`
//   lean/bob  the upper body over the planted feet (the hips follow half
//             the lean, the knees solve), open: the string fingers spread
const K = {
  // bow carried low in front in the bow hand, the string hand easy at the
  // side (elbow back)
  rest: { ns: [0.6, -16.4], fs: [0.9, -16.4], h: [1.5, -8.2], flip: 0, g: [5.0, -9.4], rot: 0.45, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0, bob: 0, open: 0 },
  // the bow coming up, the string hand going to meet it
  lift: { ns: [0.2, -16.4], fs: [1.0, -16.4], h: [4.6, -12.2], flip: 0, g: [7.8, -13.0], rot: 0.22, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0, bob: 0, open: 0 },
  // nocked and set: bow arm up with a soft elbow, fingers on the string,
  // the string elbow raised to take the weight
  set: { ns: [-0.3, -16.3], fs: [1.2, -16.4], h: [7.5, -17.3], flip: 1, g: [9.2, -16.4], rot: 0, str: 1, shiver: 0, bend: 0, arr: 1, aa: 0, lean: -0.1, bob: 0, open: 0 },
  // full draw: the bow arm has pushed out straight, the string hand is at
  // the corner of the mouth, the elbow high behind the head; he leans a
  // touch back into the weight
  anchor: { ns: [0.0, -16.3], fs: [1.2, -16.5], h: [1.6, -19.3], flip: 1, g: [9.9, -16.6], rot: -0.03, str: 1, shiver: 0, bend: 1, arr: 1, aa: 0, lean: -0.5, bob: 0, open: 0 },
  // the instant after: the string has slipped, the fingers open and the
  // hand slides back along the jaw; the bow arm drives on, the bow rolls
  loose: { ns: [-0.2, -16.2], fs: [1.2, -16.5], h: [0.3, -19.7], flip: 1, g: [10.0, -16.4], rot: 0.14, str: 0, shiver: 1, bend: 0, arr: 0, aa: 0, lean: -0.35, bob: 0, open: 1 },
  // follow-through: the hand past the ear, the bow rolled on and settling
  follow: { ns: [-0.3, -16.2], fs: [1.1, -16.4], h: [-0.6, -20.0], flip: 1, g: [9.5, -15.8], rot: 0.3, str: 0, shiver: 0.35, bend: 0, arr: 0, aa: 0, lean: -0.15, bob: 0, open: 1 },
  // over the shoulder to the quiver: elbow up by the head, hand behind the
  // neck on the fletchings; the bow arm eases down a little
  reach: { ns: [-0.4, -16.3], fs: [1.0, -16.4], h: [-3.8, -19.4], flip: 0, g: [8.4, -14.6], rot: 0.24, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0.15, bob: 0, open: 0 },
  // the arrow brought round over the shoulder to the bow, head first
  bring: { ns: [-0.4, -16.3], fs: [1.1, -16.4], h: [3.4, -19.4], flip: 1, g: [8.9, -15.8], rot: 0.08, str: 0, shiver: 0, bend: 0, arr: 2, aa: 0.28, lean: 0.05, bob: 0, open: 0 },
};
export const ARCHER_POSES = K;
// the draw, set to anchor: `d` 0..1 of the way (the halls ease it)
const drawn = (d) => mixPose(K.set, K.anchor, d);
// A pose by name: the four the castle and the old callers use ("rest",
// "draw" with its `draw`, "loose", "reach") and the rest of the cycle
// ("lift", "set", "anchor", "follow", "bring"). o.to / o.k blend toward a
// second pose (o.toDraw its draw), o.arrow false takes the arrow away (the
// idle string test), o.breath 0..1 lifts the chest one art pixel.
export const archerPose = (pose, draw = 1, o = {}) => {
  let P = pose === "draw" ? drawn(draw) : K[pose] || K.rest;
  if (o.to) P = mixPose(P, o.to === "draw" ? drawn(o.toDraw ?? 1) : K[o.to] || K.rest, o.k ?? 0.5);
  if (o.arrow === false && P.arr) P = { ...P, arr: 0 };
  if (o.breath) P = { ...P, bob: P.bob - 0.5 * o.breath };
  return P;
};

// The baked frames the halls stamp, by name: [pose, draw, options]. The
// shot runs loose → follow → reach → bring → set → d1 → d2 → anchor (the
// draw eased: most of the way fast, the last of it slow into the anchor);
// at ease: rest / rest1 (a breath), and the string test lift → test0 →
// test1 and back down (no arrow on it).
export const ARCHER_FRAMES = {
  loose: ["loose", 0], follow: ["follow", 0], reach: ["reach", 0], bring: ["bring", 0],
  set: ["draw", 0], d1: ["draw", 0.55], d2: ["draw", 0.88], anchor: ["draw", 1],
  rest: ["rest", 0], rest1: ["rest", 0, { breath: 1 }], lift: ["lift", 0],
  test0: ["draw", 0, { arrow: false }], test1: ["draw", 0.45, { arrow: false }],
};
// draw one of them (the options merge over the frame's own)
export const drawArcherFrame = (ctx, x, y, dir, pal, frame, o = {}) => {
  const [pose, d, fo] = ARCHER_FRAMES[frame] || ARCHER_FRAMES.rest;
  drawArcher(ctx, x, y, dir, pal, d, { ...o, ...fo, pose });
};

// An archer at the string. `draw` runs 0..1, set to full draw. Towers may
// pass `o.pose`: "rest" (bow carried low, at ease), "loose" (the string has
// just slipped: it snaps straight and shivers, the bow arm drives on, the
// drawing hand slides back past the ear), "reach" (a hand over the shoulder
// to the quiver), or any key of ARCHER_POSES; see archerPose for o.to /
// o.k / o.arrow / o.breath. Without a pose the figure draws by `draw`: the
// limbs bend, the string comes back to the corner of the mouth, the arrow
// rides on it, and he leans back into the weight.
export const drawArcher = (ctx, x, y, dir, pal, draw = 1, o = {}) => {
  const big = !!o.big;
  const s = big ? 1.15 : 1;
  const P = archerPose(o.pose || "draw", draw, o);
  const bowCol = o.bowCol || "#4a3018";
  const fl = o.fletch || "#e8e0c8";
  const cock = bowCol === "#4a3018" ? "#a04a3f" : fl;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shadow(ctx, 0.5, 0.4, 4.6, 1.6, 0.3);
  const lean = P.lean, bob = P.bob;
  // the quiver rides on the back, fletchings behind the neck
  part(ctx, (c) => {
    c.save(); c.translate(-2.7 + lean, -11.2 + bob); c.rotate(-0.3);
    for (const [i, col] of [[0, fl], [1, "#a04a3f"], [2, fl]].entries()) { c.fillStyle = col; c.beginPath(); c.moveTo(-1.0 + i * 0.9, -6.6); c.lineTo(-0.7 + i * 0.9, -8.6); c.lineTo(-0.2 + i * 0.9, -6.6); c.closePath(); c.fill(); }
    roundRect(c, -1.3, -6.8, 2.6, 7, 0.9);
    c.fillStyle = lin(c, -1.3, 0, 1.3, 0, [[0, lighten("#7a5334", 0.3)], [0.5, "#7a5334"], [1, darken("#7a5334", 0.4)]]); c.fill();
    c.fillStyle = darken("#7a5334", 0.45); c.fillRect(-1.3, -5.8, 2.6, 0.6); c.fillRect(-1.3, -1.6, 2.6, 0.6);
    c.restore();
  });
  // feet planted a stride apart whatever he does; the hips carry half the lean
  legs(ctx, 0, 0, pal, 0.45, lean || bob ? { hip: [lean * 0.5, bob * 0.3] } : {});
  ctx.save();
  ctx.translate(lean, bob);
  const half = big ? 8.6 : 7.6;
  const [gx, gy] = P.g, cr = Math.cos(P.rot), sr = Math.sin(P.rot);
  const toBow = (px, py) => [(px - gx) * cr + (py - gy) * sr, -(px - gx) * sr + (py - gy) * cr];   // world → the bow's frame
  const fromBow = (bx, by) => [gx + bx * cr - by * sr, gy + bx * sr + by * cr];
  // how far the string is pulled off its brace decides how the limbs bend
  const brace = 1.7;
  const [hbx, hby] = toBow(...P.h);
  const bend = P.str ? Math.max(0, Math.min(1, (-hbx - brace) / 6.6)) : P.bend;
  // the far arm (the bow arm) behind the body, a soft elbow under it
  arm(ctx, ...P.fs, gx, gy, pal, { col: darken(pal.coat, 0.18), hand: false });
  torso(ctx, 0, -17.2, 10.4, 6.4, pal);
  // the string arm, solved once. Raised out to the side (the draw, the
  // anchor, the loose) its upper arm passes behind the head, so the face
  // stays clear and the elbow shows behind the hood; the forearm and hand
  // come in front of the head to the string
  const flip = P.flip >= 0.5;
  const [ex, ey] = elbowFor(...P.ns, ...P.h, { flip });
  const back = flip && ey < P.ns[1] - 1.5;
  logJoint(ctx, "arm", P.ns, [ex, ey], P.h, { flip });
  if (back) limb(ctx, ...P.ns, ex, ey, 2.4, pal.coat);
  head(ctx, 0.5, -20.6, pal);
  // the bow, its grip in the bow hand: the limbs sweep back to the tips as
  // it bends, the string runs tip to nock to tip
  const tipX = -brace - bend * 2.4, bel = 1.3 + bend * 2.6;
  ctx.save();
  ctx.translate(gx, gy); ctx.rotate(P.rot);
  part(ctx, (c) => {
    c.strokeStyle = lin(c, 0, -half, bel, half, [[0, lighten(bowCol, 0.35)], [0.5, bowCol], [1, darken(bowCol, 0.35)]]);
    c.lineWidth = big ? 1.7 : 1.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(tipX, -half); c.quadraticCurveTo(bel, -half * 0.35, 0, 0); c.quadraticCurveTo(bel, half * 0.35, tipX, half); c.stroke();
    c.fillStyle = darken(bowCol, 0.45); c.fillRect(-0.7, -1.1, 1.4, 2.2);                              // the leather grip
  });
  ctx.strokeStyle = "rgba(244,236,214,0.95)";
  ctx.lineWidth = 0.55;
  const [nx, ny] = P.str ? [hbx, hby] : [tipX, 0];
  ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(nx, ny); ctx.lineTo(tipX, half); ctx.stroke();
  if (P.shiver > 0.05) {
    // the string still humming: two ghosts either side of it
    const w = 1.3 * P.shiver;
    ctx.strokeStyle = `rgba(244,236,214,${0.25 + 0.3 * P.shiver})`;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(tipX + k * w, 0); ctx.lineTo(tipX, half); ctx.stroke(); }
  }
  ctx.restore();
  // the arrow: nocked, from the string hand out over the bow hand; or
  // carried in the hand, head first
  if (P.arr) {
    const len = big ? 11 : 10.2;
    let ux, uy, bx, by;
    if (P.arr >= 1.5) { ux = Math.cos(P.aa); uy = Math.sin(P.aa); bx = P.h[0] - ux * 1.2; by = P.h[1] - uy * 1.2; }
    else {
      const [rx, ry] = fromBow(0.3, -0.9);
      const ax = rx - P.h[0], ay = ry - P.h[1], L = Math.hypot(ax, ay) || 1;
      ux = ax / L; uy = ay / L; bx = P.h[0]; by = P.h[1];
    }
    // never cut the head off at the edge of the sprite this is baked into
    // (the wall's frames are tight): the shaft gives way instead
    let l = len;
    const m = ctx.getTransform(), CW = ctx.canvas?.width, CH = ctx.canvas?.height;
    if (CW) for (; l > 5; l -= 0.5) {
      const tx = bx + ux * (l + 2.2), ty = by + uy * (l + 2.2);
      const dx = m.a * tx + m.c * ty + m.e, dy = m.b * tx + m.d * ty + m.f;
      if (dx >= 2 && dx <= CW - 2 && dy >= 2 && dy <= CH - 2) break;
    }
    const ex = bx + ux * l, ey = by + uy * l;
    part(ctx, (c) => {
      c.strokeStyle = "#8a6a44"; c.lineWidth = 0.7; c.lineCap = "butt";
      c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = "#c4c8d0";
      c.beginPath(); c.moveTo(ex + ux * 2.2, ey + uy * 2.2); c.lineTo(ex - uy * 1.1, ey + ux * 1.1); c.lineTo(ex + uy * 1.1, ey - ux * 1.1); c.closePath(); c.fill();
      c.fillStyle = cock;
      c.beginPath(); c.moveTo(bx + ux * 0.4, by + uy * 0.4); c.lineTo(bx + ux * 2.4 - uy * 1.2, by + uy * 2.4 + ux * 1.2); c.lineTo(bx + ux * 2.6, by + uy * 2.6); c.closePath(); c.fill();
      c.fillStyle = fl;
      c.beginPath(); c.moveTo(bx + ux * 0.4, by + uy * 0.4); c.lineTo(bx + ux * 2.4 + uy * 1.2, by + uy * 2.4 - ux * 1.2); c.lineTo(bx + ux * 2.6, by + uy * 2.6); c.closePath(); c.fill();
    });
  }
  // the bow hand closes round the grip
  hand(ctx, gx - 0.2 * cr, gy - 0.2 * sr, pal.skin);
  // the near arm: the string arm
  if (!back) limb(ctx, ...P.ns, ex, ey, 2.4, pal.coat);
  limb(ctx, ex, ey, ...P.h, 2.2, pal.coat);
  hand(ctx, ...P.h, pal.skin);
  if (P.open > 0.5) { dab(ctx, P.h[0] - 1.6, P.h[1] - 1.2, 0.6, 0.6, pal.skin); dab(ctx, P.h[0] - 1.8, P.h[1] + 0.2, 0.6, 0.6, pal.skin); }   // fingers open
  ctx.restore();
  ctx.restore();
};

// The crews' cloth, by tower and path.
export const ARCHER_FOLK = {
  base: { skin: "#e8b990", hood: "#5c7a3f", coat: "#7a5432", boots: "#3e2a1a", trim: "#3e2a1a" },
  a: { skin: "#e8b990", hood: "#3f6a34", coat: "#8a6a40", boots: "#3e2a1a", trim: "#2f4a24" },
  b: { skin: "#e8b990", hood: "#2c3e54", coat: "#3a5474", boots: "#2a2a30", trim: "#1f2c3e" },
  aa: { skin: "#d6c8a0", hood: "#5a2a3a", coat: "#3c6a34", boots: "#2a3020", trim: "#243a20" },
  ab: { skin: "#e8b990", hood: "#e8e0c8", coat: "#4a7098", boots: "#2a2a30", trim: "#3a5060" },
  bb: { skin: "#e8b990", hood: "#8e2f2a", coat: "#a0473a", boots: "#2a2a30", trim: "#d8b34a" },
  crew: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
};
