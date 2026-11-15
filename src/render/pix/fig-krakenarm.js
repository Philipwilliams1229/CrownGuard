// ============ FIGURE: a Kraken's tentacle (game type `krakenarm`) ============
// One plum-red tentacle bursting up through the shore's ice out of a hole of black water, a pale
// inner face studded with suckers on the side of its curl, slabs of broken ice tipped up round
// the hole. The anchor is the HOLE (0, 0): anything that would lie below it is cut away (a
// rising or sinking arm is hidden by the hole). Facing +x. Built on fig-kraken.js's tentacle.
// Clips (the game asks for the string frames by name, e.g. "grab.1"):
//   walk    the sway, 8 frames
//   attack  raised, arched back, SLAM (laid along the ground ahead, the ice cracking, at 0.5),
//           dragged back
//   rise    4 frames bursting up out of the hole, spray and ice
//   grab    4 frames: reach, wrap, squeeze, lift (the tip curling tight: the victim itself is
//           drawn by rigs-rimebeasts.js drawSeaHold, which is not a rig)
//   sink    4 frames going back down, ripples
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys } from "./rig.js";
import { tentLine, tentacle } from "./fig-kraken.js";
import { underwater } from "./fig-seaserpent.js";

const ICEL = mat("#bfe6f2", { contrast: 1.2 }), ICED = mat("#5f8ea4", { contrast: 1.2 });
const HOLE = flat("#16303a"), HOLE2 = flat("#2a5464");
const FOAM = flat("#f2fbff", { emis: true, line: "#7fb4cc" }), FOAM2 = flat("#cfe8f2", { emis: true, line: "#7fb4cc" });
const CRACK = flat("#e8f8ff", { emis: true, line: "#7fb4cc" });

export const BOX = { w: 186, h: 140, ox: 60, oy: 118 };
export const BONES = HUMAN;                 // unused
const PI = Math.PI, LEN = 88, W0 = 9.5;

const P0 = { a: -PI / 2, curl: 2.4, pow: 2.4, dep: 0, floor: false, fx: "" };
const WALK = (ph) => ({ ...P0, a: -PI / 2 - 0.08 + 0.13 * Math.sin(ph * 2 * PI), curl: 2.4 + 0.5 * Math.cos(ph * 2 * PI) });
const RAISE = { ...P0, a: -1.78, curl: 3.6, pow: 2.8 }, ARCH = { ...P0, a: -2.02, curl: 1.2, pow: 1.4 };
const SLAM = { ...P0, a: -1.0, curl: 1.95, pow: 1.0, floor: true, fx: "slam" }, DRAG = { ...P0, a: -0.55, curl: 0.75, pow: 1.2, floor: true, fx: "dust" };
const EXTRA = {
  rise: (f) => ({ ...WALK(0), dep: [0.8, 0.55, 0.25, 0][f], fx: f < 3 ? "burst" : "drip" }),
  grab: (f) => [{ ...P0, a: -1.2, curl: 1.0, pow: 1.5 }, { ...P0, a: -1.3, curl: 5.4, pow: 3.4 }, { ...P0, a: -1.42, curl: 6.2, pow: 4 }, { ...P0, a: -1.78, curl: 6.2, pow: 4 }][f],
  sink: (f) => ({ ...WALK(0), a: -PI / 2 + 0.25 * f, dep: [0.15, 0.4, 0.7, 0.95][f], fx: "rings" }),
};

export const draw = (px, F) => {
  const k = F.sk.p, dep = k.dep * LEN;
  // the hole: black water, a lighter ring inside, then the arm
  px.part();
  px.ellipse(0.8, -0.2, W0 * 1.95, W0 * 0.45, HOLE, 0.5, { noLine: true });
  px.ellipse(1.6, 0.2, W0 * 1.35, W0 * 0.26, HOLE2, 0.55, { noLine: true });
  const pts = tentLine([0, 3 + dep], k.a, k.curl, k.pow, LEN + 4, { floor: k.floor ? -1.5 : undefined });
  tentacle(px, pts, k.curl, W0, 3);
  // the hole swallows the part below the ground; the near lip and the ice slabs tipped up round it
  underwater(px, { hide: true });
  const hw = W0 * 1.9;
  for (const [dx, dy, w, h, t] of [[-hw - 1, 0.4, 6.4, 3.6, -0.5], [-hw * 0.4, 3, 6.8, 3.2, 0.15], [hw * 0.45, 3, 6, 3, -0.2], [hw + 1, 0.2, 6, 3.8, 0.55]]) {
    px.part();
    const c = Math.cos(t), s = Math.sin(t), P = (x, y) => [dx + x * c - y * s, dy + x * s + y * c];
    px.poly([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], ICED, 6, { round: 0.4 });
    px.poly([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, -h * 0.05), P(-w / 2, -h * 0.05)], ICEL, 6.1, { fix: 3 });
  }
  const tip = pts[pts.length - 1];
  if (k.fx === "burst") for (let i = 0; i < 10; i++) { const a = -0.5 - i * 0.24; px.dot(Math.cos(a) * (6 + i * 1.3) * (i % 2 ? -1 : 1), -2 + Math.sin(a) * (10 + i * 1.6), i % 2 ? FOAM : FOAM2, 42, { noLine: true }); }
  if (k.fx === "drip") for (const i of [5, 9, 13]) { px.dot(pts[i][0] + 4, pts[i][1] + 3, FOAM, 42, { noLine: true }); px.dot(pts[i][0] + 4, pts[i][1] + 4, FOAM2, 42, { noLine: true }); }
  if (k.fx === "rings") for (let x = -12; x <= 12; x += 2) px.dot(x, 3 + (Math.abs(x) > 7 ? 0 : 1), FOAM2, 42, { noLine: true });
  return { tip };
};

// the slam's frost cracks, spray and a puff of dust where the tip lands
export const fx = (px, F, info) => {
  const k = F.sk.p, tip = info.tip;
  if (!tip) return;
  if (k.fx === "slam") {
    for (const [dx, dy, l] of [[-10, 0, 14], [-4, 2, 20], [2, 0, 16], [-8, -1, 8], [6, 3, 10]]) px.line(tip[0] - 6 + dx, -0.5 + dy, tip[0] - 6 + dx + l * 0.8, dy + (dx > 0 ? 3 : -1), CRACK, 20, { noLine: true });
    for (let i = 0; i < 9; i++) { const a = -0.3 - i * 0.3; px.dot(tip[0] - 6 + Math.cos(a) * (6 + i * 1.4), -2 + Math.sin(a) * (7 + i * 1.8), i % 2 ? FOAM : FOAM2, 21, { noLine: true }); }
    for (let i = 0; i < 4; i++) px.dot(tip[0] + 2 + i * 3, -3 - (i % 2) * 2, CRACK, 21, { noLine: true });
  }
  if (k.fx === "dust") for (let x = -12; x <= 6; x += 2) px.dot(tip[0] + x - 4, -1 - ((x >> 1) & 1), FOAM2, 20, { noLine: true });
};

const strip = (name, ms) => ({ n: 4, ms, loop: false, lag: 0.1, pose: (ph) => EXTRA[name](Math.round(ph * 3)) });
export const CLIPS = {
  walk: { n: 8, ms: 1600, loop: true, lag: 0.1, pose: (ph) => WALK(ph) },
  attack: {
    n: 8, ms: 700, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: RAISE },
      { t: 0.25, e: "out", p: ARCH },
      { t: 0.5, e: "in3", p: SLAM },
      { t: 0.75, e: "out", p: DRAG },
      { t: 1, e: "io", p: WALK(0) },
    ], ph),
  },
  rise: strip("rise", 700), grab: strip("grab", 800), sink: strip("sink", 700),
};
