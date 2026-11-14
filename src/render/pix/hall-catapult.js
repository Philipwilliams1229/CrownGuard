// ============ HALL CONCEPT: the Catapult (level 3 mangonel, treatments A / B / C) ============
// Today's mangonel (halls/catapult.js) in the pixel sculptor: a wheeled timber bed,
// two A-frames, the throwing arm cocked up over the engineer with its stone in the
// cup, the windlass under his fists. A machine is all timber and iron, so this is
// where the treatments differ least: A is clean beams, B shows grain, iron bands,
// lashings and the skein, C is the heavier engine (big shod wheels, a mantlet,
// painted trim). Concept only: the arm here is baked cocked; in the game the arm,
// rope and stone stay live exactly as they are today.
import { mat } from "./pix.js";
import { STYLES, beam, wheel, boulder } from "./hall-kit.js";

export const BOX = { w: 140, h: 136, ox: 66, oy: 110 };
export const LABEL = "Catapult";

const TIMBER = mat("#7a5634"), TIMBER_L = mat("#9a6c40"), TIMBER_D = mat("#5c4028"), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), ROPE = mat("#b89a64");
const GRANITE = mat("#8e8c94"), RED = mat("#a04a3f"), BLUE = mat("#3a5474"), GOLD = mat("#d8b34a"), EARTH = mat("#8a7048"), TYRE = mat("#6c727e", { contrast: 1.2 });

const mangonel = (back, front, st) => {
  const bold = st.bold, rich = st.stones === 2, k = bold ? 1 : 0, S = 1.2, wr = (bold ? 10.5 : 8.5) * S;
  // the machine is laid out on a small grid and scaled: every helper below takes grid numbers
  const bm = (ax, ay, bx, by, w, m, z, o) => beam(back, ax * S, ay * S, bx * S, by * S, Math.max(2, Math.round(w * S)), m, z, o);
  const el = (x, y, rx, ry, m, z, o) => back.ellipse(x * S, y * S, rx * S, ry * S, m, z, o);
  const pl = (pts, m, z, o) => back.poly(pts.map(([x, y]) => [x * S, y * S]), m, z, o);
  const tl = (ax, ay, bx, by, d) => back.toneLine(ax * S, ay * S, bx * S, by * S, d);
  back.part(); back.ellipse(0, 2, 34, 7, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  // the far side: wheels, rail and A-frame, a tone down
  for (const s of [-1, 1]) wheel(back, s * 15 * S, -15 * S, wr - 1, TIMBER, IRON, -8, { turn: 0.3 });
  bm(-23, -17, 23, -17, 4, TIMBER_D, -6, { grain: false });
  bm(-9, -18, -1, -43 - k * 3, 3, TIMBER_D, -5, { grain: false }); bm(9, -18, 1, -43 - k * 3, 3, TIMBER_D, -5, { grain: false });
  // the bed's top, planked
  back.part(); pl([[-25, -10], [25, -10], [23, -17], [-23, -17]], TIMBER_L, -4, { n: [0, -0.75, 0.66] });
  for (let x = -20; x < 24; x += 6) tl(x, -16.5, x - 0.6, -10.5, -1);
  // the throwing arm, cocked: butt low on the west side, the cup and its stone up over the engineer
  const piv = [0, -41 - k * 3], tip = [29, -60 - k * 3], butt = [-12, -33 - k * 3];
  bm(butt[0], butt[1], tip[0], tip[1], 4 + k, TIMBER_L, 0, { seed: 4, bands: rich ? [0.12, 0.5, 0.82] : [0.12], bandM: IRON });
  back.part(); el(tip[0] + 1, tip[1] - 1, 5.5 + k, 3, TIMBER_D, 0.5, { round: 0.6 });
  back.part(); el(tip[0] + 1, tip[1] - 5 - k, 4.6 + k, 4.4 + k, GRANITE, 0.8, { round: 0.95 }); back.tone((tip[0] - 1) * S, (tip[1] - 3) * S, -1); back.tone((tip[0] + 3) * S, (tip[1] - 6) * S, -1);
  // the windlass on the east leg (it stays where his fists are, whatever the scale) and the rope up to the arm
  const hub = [18, -26];
  back.part(); back.line((piv[0] + 6) * S, (piv[1] - 3) * S, hub[0], hub[1], ROPE, 0.3, { cast: 0 });
  // the near A-frame, its tie, the pivot and (B) the skein and lashings
  bm(-11, -9, -1, piv[1], 4 + k, TIMBER, 3, { seed: 2 }); bm(11, -9, 1, piv[1], 4 + k, TIMBER, 3, { seed: 3 });
  bm(-7, -22, 7, -22, 3, TIMBER_L, 3.2, { grain: false });
  if (rich) {
    back.part(); el(0, piv[1] + 1, 4, 4, ROPE, 3.6, { round: 0.7 }); for (let j = -3; j <= 3; j += 2) tl(-3, piv[1] + 1 + j, 3, piv[1] + 1 + j, -1);
    for (const s of [-1, 1]) { back.part(); pl([[s * 7 - 2, -24], [s * 7 + 2, -24], [s * 7 + 2, -20], [s * 7 - 2, -20]], ROPE, 3.4, { n: [0, -0.2, 0.97] }); tl(s * 7 - 2, -22, s * 7 + 2, -22, -1); }
  }
  back.part(); el(0, piv[1] + 1, 1.8, 1.8, IRON_L, 4, { round: 0.9 });
  // the near rail, shod at the ends; C: the crown's red along it
  back.part(); pl([[-26, -10], [26, -10], [26, -4 + k], [-26, -4 + k]], TIMBER, 2, { n: [0, -0.1, 0.99] });
  tl(-26, -9.6, 26, -9.6, 1); tl(-26, -4.6 + k, 26, -4.6 + k, -1);
  if (rich) for (let x = -20; x <= 20; x += 8) back.tone(x * S, -7 * S, -1);
  if (bold) { back.part(); pl([[-22, -8], [22, -8], [22, -6], [-22, -6]], RED, 2.1, { n: [0, -0.1, 0.99], cast: 0 }); }
  for (const s of [-1, 1]) { back.part(); pl([[s * 26, -11], [s * 23, -11], [s * 23, -3 + k], [s * 26, -3 + k]], IRON, 2.2, { n: [s * 0.3, -0.2, 0.9] }); if (rich) back.dot(s * 24.5 * S, -8 * S, IRON_L, 2.3, { fix: 4 }); }
  // the windlass: a bracket off the leg, a drum, its axle
  beam(back, 10, hub[1] + 1, hub[0], hub[1] + 1, 2, TIMBER_D, 3.5, { grain: false });
  back.part(); back.ellipse(hub[0], hub[1], 4.2, 4.2, TIMBER_D, 3.8, { round: 0.8 }); if (rich) { back.tone(hub[0] - 2, hub[1], 1); back.tone(hub[0] + 2, hub[1], -1); } back.ellipse(hub[0], hub[1], 1.3, 1.3, IRON_L, 3.9, { cast: 0 });
  // the near wheels
  for (const s of [-1, 1]) { wheel(back, s * 16 * S, -4 * S, wr, TIMBER_L, bold ? IRON_L : TYRE, 5, { turn: s * 0.2, spokes: bold ? 10 : 8 }); if (bold) for (let a = 0; a < 8; a++) back.dot(s * 16 * S + Math.cos(a * 0.785) * (wr - 0.8) * 0.92, -4 * S + Math.sin(a * 0.785) * (wr - 0.8), IRON, 5.1, { fix: 0 }); }
  // C: a mantlet on the west end, boarded and painted
  if (bold) {
    back.part(); pl([[-33, -34], [-25, -37], [-25, -7], [-33, -4]], TIMBER, 4, { n: [-0.35, -0.1, 0.93] });
    for (let y = -30; y < -6; y += 6) tl(-33, y + 2, -25, y, -1);
    back.part(); pl([[-32, -24], [-26, -26], [-26, -18], [-32, -16]], BLUE, 4.1, { n: [-0.35, -0.1, 0.93], cast: 0 }); back.dot(-29.5 * S, -21.5 * S, GOLD, 4.2, { fix: 3 }); back.dot(-28.5 * S, -21.5 * S, GOLD, 4.2, { fix: 4 });
    for (const y of [-33, -9]) { back.dot(-31.5 * S, (y + 1) * S, IRON_L, 4.2, { fix: 4 }); back.dot(-26.5 * S, y * S, IRON_L, 4.2, { fix: 4 }); }
  }
  // shot ready to hand
  const pile = bold ? [[-44, 8, 3.8], [-37, 10, 3.6], [-41, 4, 3.4], [-32, 8, 2.8]] : [[-38, 8, 3.6], [-31, 10, 3.4], [-35, 4, 3]];
  for (const [x, y, r] of pile) boulder(back, x, y, r, r * 0.86, GRANITE, 6);
  return {
    crew: [{ fig: "engineer", x: 32, y: 4, dir: -1, clip: "winchIdle", variant: "engineer", crank: hub }],
    live: [{ kind: "pennant", x: -25, y: -21, col: "#a04a3f", pole: 15, len: 12, h: 6, layer: "back" }],
    shadow: { rx: 38, ry: 9, dx: 7, dy: 3 },
  };
};
export const build = (o = {}) => (back, front) => mangonel(back, front, STYLES[o.style || "B"]);
