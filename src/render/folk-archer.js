// ============ FOLK: THE ARCHER ============
// The bowman of the archer halls and the castle wall, and the crews' cloth
// by tower and path. Built from folk-kit.js; folk.js re-exports it.

import { mixPose } from "./folk-kit.js";

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
//   back      where the string arm (one inked part, no line across the
//             elbow) goes against the head: 0 wholly in front (rest, lift,
//             bring: held low or out in front, clear of the face); 1 wholly
//             behind the head and hood with only the hand in front of them
//             (set and the idle test0, the whole draw, the anchor, the loose,
//             the follow: the elbow shows back past the hood, the face stays
//             clear; at the set the upper arm tucks behind the jaw and the
//             forearm comes out from under the chin); 2 behind, hand and all
//             (the reach: the arm behind the head, the wrist and hand
//             showing past the hood's back edge on the fletchings). An
//             in-between whose elbow rises past the chin goes behind too.
//   lean/bob  the upper body over the planted feet (the hips follow half
//             the lean, the knees solve), open: the string fingers spread
const K = {
  // bow carried low in front in the bow hand, the string hand easy at the
  // side (elbow back)
  rest: { ns: [0.6, -16.4], fs: [0.9, -16.4], h: [1.5, -8.2], flip: 0, back: 0, g: [5.0, -9.4], rot: 0.45, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0, bob: 0, open: 0 },
  // the bow coming up, the string hand going to meet it
  lift: { ns: [0.2, -16.4], fs: [1.0, -16.4], h: [4.6, -12.2], flip: 0, back: 0, g: [7.8, -13.0], rot: 0.22, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0, bob: 0, open: 0 },
  // nocked and set: bow arm up with a soft elbow, fingers on the string,
  // the string elbow raised to take the weight
  set: { ns: [-0.3, -16.3], fs: [1.2, -16.4], h: [7.5, -17.3], flip: 1, back: 1, g: [9.2, -16.4], rot: 0, str: 1, shiver: 0, bend: 0, arr: 1, aa: 0, lean: -0.1, bob: 0, open: 0 },
  // full draw: the bow arm has pushed out straight, the string hand is
  // anchored at the cheek, the elbow high behind the head (it shows past the
  // hood, the draw shoulder a touch shrugged); he leans back into the weight
  anchor: { ns: [-0.8, -16.8], fs: [1.2, -16.5], h: [0.9, -19.6], flip: 1, back: 1, g: [9.9, -16.6], rot: -0.03, str: 1, shiver: 0, bend: 1, arr: 1, aa: 0, lean: -0.5, bob: 0, open: 0 },
  // the instant after: the string has slipped, the fingers open and the
  // hand slides back along the jaw to the ear (clear of the face, against
  // the hood); the bow arm drives on, the bow rolls
  loose: { ns: [-0.2, -16.2], fs: [1.2, -16.5], h: [-0.9, -19.6], flip: 1, back: 1, g: [10.0, -16.4], rot: 0.14, str: 0, shiver: 1, bend: 0, arr: 0, aa: 0, lean: -0.35, bob: 0, open: 1 },
  // follow-through: the hand past the ear, the bow rolled on and settling
  follow: { ns: [-0.3, -16.2], fs: [1.1, -16.4], h: [-2.0, -18.8], flip: 1, back: 1, g: [9.5, -15.8], rot: 0.3, str: 0, shiver: 0.35, bend: 0, arr: 0, aa: 0, lean: -0.15, bob: 0, open: 1 },
  // over the shoulder to the quiver: elbow up by the head, the hand behind
  // the neck on the fletchings, past the hood's back edge — the arm behind
  // the head (back 2), its wrist and hand showing from behind the hood; the
  // bow arm eases down a little
  reach: { ns: [-0.4, -16.3], fs: [1.0, -16.4], h: [-5.1, -18.7], flip: 0, back: 2, g: [8.4, -14.6], rot: 0.24, str: 0, shiver: 0, bend: 0, arr: 0, aa: 0, lean: 0.15, bob: 0, open: 0 },
  // the arrow brought down and round in front of him to the bow, head
  // first, the hand under his chin (the elbow down, the face clear)
  bring: { ns: [-0.4, -16.3], fs: [1.1, -16.4], h: [3.6, -17.2], flip: 0, back: 0, g: [8.9, -15.8], rot: 0.08, str: 0, shiver: 0, bend: 0, arr: 2, aa: -0.12, lean: 0.05, bob: 0, open: 0 },
};
                         // the chin's underside (head() at y -20.6)
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
