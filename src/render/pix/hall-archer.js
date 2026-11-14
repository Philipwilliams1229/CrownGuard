// ============ HALL CONCEPT: the Archer hall (levels 1-3, treatments A / B / C) ============
// Today's designs (halls/archer.js) redrawn in the pixel sculptor through hall-kit.js:
// level 1 a timber watch platform, level 2 a stone foot under a timber hoarding, level 3
// the stone tower with its crenellated crown, banner, door and torch. A and B keep
// today's shapes; C is the bolder one (a battered foot, a crown on deep corbels, a
// capped stair turret). Concept only: the game still draws halls/archer.js.
import { mat, flat } from "./pix.js";
import { STYLES, drum, disc, parapet, bandEdge, cone, beam, door, loop, archWindow, wallBanner, ivy, boulder, WARM, hash } from "./hall-kit.js";

export const BOX = { w: 124, h: 214, ox: 62, oy: 190 };
export const LABEL = "Archer hall";

const STONE = mat("#9a9488"), STONE_L = mat("#b0a998"), STONE_W = mat("#a69c88"), STONE_WL = mat("#bcb29c");
const OAK = mat("#6f4a2a"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48"), IRON = mat("#4a4c56"), ROPE = mat("#b89a64");
const RED = mat("#a04a3f"), GOLD = mat("#d8b34a"), SLATE = mat("#3f5a8c"), STRAW = mat("#d8b868"), WHITE = mat("#e8e0c8"), FLETCH = mat("#e8e0c8");
const EARTH = mat("#7c6242");
const ARROW = ["..#..", ".###.", "#.#.#", "..#..", "..#..", ".#.#."];

// the straw butt on its easel, and the arrow barrel: the yard props every level keeps
const butt = (px, x, y, z) => {
  px.part();
  beam(px, x - 4, y, x - 1, y - 12, 2, OAK, z, { same: true, grain: false }); beam(px, x + 4, y, x + 1, y - 12, 2, OAK, z, { same: true, grain: false });
  px.part();
  px.ellipse(x, y - 9, 6.5, 6.5, STRAW, z + 1, { round: 0.5 });
  px.ellipse(x, y - 9, 4.4, 4.4, WHITE, z + 1.1, { round: 0.2, cast: 0 });
  px.ellipse(x, y - 9, 2.4, 2.4, RED, z + 1.2, { round: 0.2, cast: 0 });
  px.dot(x - 0.5, y - 9.5, GOLD, z + 1.3, { fix: 4 });
};
const barrel = (px, x, y, z, st) => {
  drum(px, { cx: x, top: y - 11, bot: y - 2, r: 5, r2: 4.6, sq: 0.34, m: TIMBER, z, st: STYLES.A, stoneW: 9, course: 99, strings: [[y - 9.5, 1.2, IRON], [y - 4.5, 1.2, IRON]] });
  disc(px, { cx: x, y: y - 11, r: 4.4, sq: 0.34, m: OAK, z: z + 0.1 });
  px.part();
  for (const [dx, h] of [[-2, 7], [0.5, 9], [2.5, 6]]) { px.line(x + dx, y - 11, x + dx + 0.6, y - 11 - h, OAK, z + 0.3, { cast: 0 }); px.dot(x + dx + 0.6, y - 12 - h, FLETCH, z + 0.4, { fix: 4 }); px.dot(x + dx + 0.6, y - 11 - h, st.stones === 2 ? RED : FLETCH, z + 0.4); }
};
const groundBed = (px, rx, ry) => { px.part(); px.ellipse(0, 1, rx, ry, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 }); };

// ---- level 1: the watch platform ---------------------------------------------------
const level1 = (back, front, st) => {
  const top = -78, hw = 21, bold = st.bold;
  groundBed(back, 27, 7);
  // four legs: the far pair a tone down, the near pair splayed a little
  for (const s of [-1, 1]) beam(back, s * (hw - 7), -5, s * (hw - 9), top + 4, 3, OAK, -6, { bias: -1, grain: false });
  beam(back, -(hw - 8), -30, hw - 8, -34, 2, OAK, -6.5, { bias: -1, grain: false });
  for (const s of [-1, 1]) beam(back, s * hw, 2, s * (hw - 3), top + 6, 4, TIMBER, -2, { seed: s + 3 });
  // cross braces and girts
  beam(back, -hw + 1, -4, hw - 3, -40, 3, TIMBER, -3, { seed: 5 }); beam(back, hw - 1, -4, -hw + 3, -40, 3, TIMBER, -3.2, { seed: 6 });
  beam(back, -hw + 2, -42, hw - 2, -42, 3, TIMBER_L, -2.5, { seed: 7 });
  if (st.stones === 2 || bold) { beam(back, -hw + 3, -44, hw - 5, -70, 2, TIMBER, -3.4, { grain: false }); beam(back, hw - 3, -44, -hw + 5, -70, 2, TIMBER, -3.5, { grain: false }); }
  // the ladder
  for (const dx of [-5, 3]) beam(back, dx, 3, dx + 1, top + 6, 2, TIMBER_L, -1, { grain: false });
  for (let y = -3; y > top + 8; y -= 7) beam(back, -5, y, 4, y, 1.2, TIMBER_L, -1.1, { grain: false });
  // lashings where the timbers cross (B: rope, a tone of care)
  if (st.stones === 2) for (const [x, y] of [[-hw + 1, -42], [hw - 1, -42], [0, -22]]) { back.part(); back.rect(x - 2, y - 2, 4, 4, ROPE, -1.5, { n: [0, -0.2, 0.97] }); back.toneLine(x - 2, y, x + 2, y, -1); }
  // the platform: its top in the sun, a thick front edge, joist ends under it
  back.part();
  back.poly([[-hw - 3, top + 1], [hw + 3, top + 1], [hw + 5, top + 9], [-hw - 5, top + 9]], TIMBER_L, 0, { n: [0, -0.8, 0.6] });
  for (let x = -hw - 1; x < hw + 4; x += 6) back.toneLine(x, top + 1, x - 1, top + 9, -1);
  back.part();
  back.rect(-hw - 5, top + 9, hw * 2 + 10, 4, TIMBER, 0.2, { n: [0, -0.1, 0.99] });
  back.toneLine(-hw - 5, top + 9, hw + 5, top + 9, 1); back.toneLine(-hw - 5, top + 12, hw + 5, top + 12, -1);
  for (let x = -hw; x <= hw; x += 7) { back.tone(x, top + 10, -1); back.tone(x, top + 11, -1); }
  // the far rail (behind the crew) and the near rail (over their shins)
  for (const x of [-hw - 2, -7, 7, hw + 2]) beam(back, x, top + 1, x, top - 9, 2, OAK, -4, { grain: false, bias: -1 });
  beam(back, -hw - 3, top - 9, hw + 3, top - 9, 2, OAK, -4.2, { grain: false, bias: -1 });
  for (const x of [-hw - 4, -8, 8, hw + 4]) beam(front, x, top + 10, x, top - 1, 2.4, OAK, 6, { grain: false });
  beam(front, -hw - 5, top - 1, hw + 5, top - 1, 2.4, TIMBER, 6.2, { grain: false });
  if (bold) {                                                                   // C: wicker mantlets hung on the rail
    for (const x of [-15, 15]) { front.part(); front.poly([[x - 6, top], [x + 6, top], [x + 5, top + 10], [x - 5, top + 10]], STRAW, 7, { n: [-0.1, -0.1, 0.98] }); for (let j = 2; j < 10; j += 2) front.toneLine(x - 6, top + j, x + 6, top + j, -1); }
  }
  for (const s of [-1, 1]) boulder(back, s * (hw + 1), 4, 3.4, 2.4, STONE, 2);
  butt(back, -hw - 4, 9, 3);
  return {
    crew: [{ fig: "bowman", x: 1, y: top + 6, dir: 1 }],
    live: [{ kind: "pennant", x: hw + 3, y: top - 9, col: "#a04a3f", pole: 14, len: 12, layer: "back" }],
    shadow: { rx: 27, ry: 7, dx: 6, dy: 3 },
  };
};

// ---- level 2: a stone foot, a timber hoarding ----------------------------------------
const level2 = (back, front, st) => {
  const deck = -92, r = 24, bold = st.bold, P = { deck, r: 31, sq: 0.3, wall: 5, band: 9 };
  groundBed(back, 31, 9);
  drum(back, { top: -8, bot: -3, r: 28, r2: 29, m: STONE_L, z: -1, st, seed: 4, course: 5 });
  drum(back, { top: -50, bot: -7, r: bold ? 24 : r, r2: bold ? 28 : r + 1.5, m: STONE, z: 0, st, seed: 11 });
  // the timber storey: upright boards, a girt, a hung shield
  drum(back, { top: deck, bot: -50, r: r, m: TIMBER, z: 0.1, st: STYLES.A, stoneW: 0.2, course: 99, seed: 2, strings: [[-53, 3, OAK]], under: bandEdge(P), underLen: 4, planks: true });
  boards(back, r, deck + 14, -53, st);
  door(back, 0, -4, 9, 13, STONE_L, OAK, IRON, 2, { vous: st.stones === 2 });
  loop(back, -1.5, -40, 8, STONE_L, 2);
  if (st.lit) archWindow(back, 10, -70, 5, 7, OAK, 2, { glow: WARM, frame: true });
  // the shield on the boards: the crown's red, a white cross
  back.part(); back.poly([[-10, -72], [-1, -72], [-1, -65], [-5.5, -60], [-10, -65]], RED, 3, { n: [-0.2, -0.1, 0.97] });
  for (let i = -8; i < -3; i++) back.dot(i + 0.5, -67.5, WHITE, 3.1, { cast: 0 }); for (let j = -71; j < -62; j++) back.dot(-5.5, j + 0.5, WHITE, 3.1, { cast: 0 });
  // the hoarding: a timber gallery on brackets, posts and a rail instead of merlons
  disc(back, { y: deck, r: P.r - 1, m: TIMBER_L, z: 0.5, lip: 5, planks: 5 });
  parapet(back, front, { ...P, m: TIMBER, mTrim: OAK, st: STYLES.A, mer: { n: 14, duty: 0.22, h: 6, ph: 0.1 }, corbels: true });
  if (st.moss) ivy(back, 21, -6, 30, 3, { seed: 4, side: -1 });
  butt(back, -27, 10, 4); barrel(back, 24, 12, 4, st);
  return {
    crew: [{ fig: "bowman", x: -9, y: deck + 2, dir: 1 }, { fig: "bowman", x: 9, y: deck - 1, dir: 1 }],
    live: [{ kind: "pennant", x: 27, y: deck - 4, col: "#a04a3f", pole: 16, len: 12, layer: "back" }],
    shadow: { rx: 32, ry: 9, dx: 7, dy: 3 },
  };
};
// upright boards on a round timber wall: a dark joint every few pixels of turn
const boards = (px, r, top, bot, st) => {
  for (let a = -1.35; a < 1.4; a += st.stones === 2 ? 0.2 : 0.33) { const x = Math.sin(a) * r, sag = r * 0.3 * Math.cos(a); px.toneLine(x, top + sag, x, bot + sag - 1, -1); }
};

// ---- level 3: the stone tower ----------------------------------------------------------
const level3 = (back, front, st) => {
  const bold = st.bold, deck = -98, r = bold ? 24 : 26, P = { deck, r: bold ? 37 : 35, sq: 0.3, wall: 6, band: bold ? 12 : 9 };
  const S = bold ? STONE_W : STONE, SL = bold ? STONE_WL : STONE_L;
  groundBed(back, 34, 10);
  drum(back, { top: -9, bot: -3, r: bold ? 33 : 30, r2: bold ? 34 : 31, m: SL, z: -1, st, seed: 4, course: 5, strings: [[-9, 1.5, SL]] });
  drum(back, {
    top: deck, bot: -8, r, r2: bold ? 31 : r + 1.5, m: S, z: 0, st, seed: 7, under: bandEdge(P), underLen: bold ? 7 : 5,
    strings: st.stones === 2 ? [[-52, 2, SL]] : [],
    stain: (x, h) => (Math.abs(x) < 2 && h > -34 && h < -26 ? -1 : 0),
  });
  door(back, 0, -5, 11, 16, SL, OAK, IRON, 2, { vous: st.stones === 2 });
  if (bold) { back.part(); back.poly([[-9, -5], [9, -5], [11, -1], [-11, -1]], SL, 2.5, { n: [0, -0.8, 0.6] }); back.poly([[-11, -1], [11, -1], [11, 1], [-11, 1]], SL, 2.5, { n: [0, 0, 1], bias: -1 }); }
  loop(back, -1.5, -40, 9, SL, 2);
  if (st.lit) { archWindow(back, -14, -64, 5, 7, SL, 2, { glow: WARM }); }
  wallBanner(back, 0, bold ? -74 : -77, 12, 22, RED, GOLD, 2, { device: ARROW, deviceY: 5, stripe: true, fold: 3 });
  // the torch by the door
  back.part(); back.line(-14, -13, -14, -19, IRON, 3, { cast: 1 }); back.rect(-16, -21, 4, 2, IRON, 3, { n: [0, -0.5, 0.8] });
  if (st.moss) { ivy(back, 22, -8, 44, 3, { seed: 9, side: -1 }); ivy(back, -24, -8, 22, 3, { seed: 3, side: 1, spread: 2 }); }
  // C: a stair turret on the east flank, capped in the crown's blue
  if (bold) {
    const tx = 30, tt = deck - 34;
    drum(back, { cx: tx, top: tt, bot: -48, r: 9, m: S, z: -3, st, seed: 21, course: 5, stoneW: 0.6, strings: [[tt + 6, 2, SL]] });
    drum(back, { cx: tx, top: -48, bot: -36, r: 9, r2: 2.5, m: S, z: -3.1, st: STYLES.A, seed: 5 });   // its corbelled foot
    loop(back, tx - 1.5, tt + 14, 6, SL, -2);
    cone(back, { cx: tx, y: tt, r: 12, h: 25, m: SLATE, z: -2, st, rows: 5 });
  }
  disc(back, { y: deck, r: P.r - 1, m: SL, z: 0.5, lip: 7 });
  parapet(back, front, { ...P, m: S, mTrim: SL, st, mer: { n: bold ? 12 : 14, duty: 0.56, h: bold ? 9 : 7, ph: 0.22 } });
  butt(back, -29, 11, 4); barrel(back, 27, 13, 4, st);
  return {
    crew: [{ fig: "bowman", x: -15, y: deck + 1, dir: 1 }, { fig: "bowman", x: 13, y: deck - 2, dir: 1 }, { fig: "bowman", x: -1, y: deck + 4, dir: 1 }],
    live: [
      bold ? { kind: "pennant", x: 30, y: deck - 59, col: "#a04a3f", pole: 5, len: 13, layer: "back" } : { kind: "pennant", x: 31, y: deck - 4, col: "#a04a3f", pole: 20, len: 13, layer: "back" },
      { kind: "flame", x: -14, y: -21, layer: "back" },
    ],
    lights: [{ key: "torch", x: -14, y: -24, r: 24, col: "#ffa040" }],
    shadow: { rx: bold ? 37 : 34, ry: 10, dx: 8, dy: 3 },
  };
};

// build({ level, style }) -> (back, front) => spec
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"];
  return (o.level === 1 ? level1 : o.level === 2 ? level2 : level3)(back, front, st);
};
void hash; void flat;
