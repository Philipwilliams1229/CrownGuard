// ============ PIX HALL: the Trapsmith, all nine forms ============
// The smithy the game draws while "New sprites" is on (render/halls/trapsmith.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, brick and stone course by course as tone, shingle rows, the forge fire
// lighting the shed's inside wall.
//
// THE SMITH DECIDES THE BUILDING. The hall file stands him at (-13, 8) (art pixels, two to a
// board unit, from the hall's ANCHOR, y down), his hammer lands on the anvil's face at about
// (5, -16), the hot iron is painted there live, and the ready traps hang at x -28 on rungs at
// y -40, -30, -20, -10. Every part below is today's part at today's place (old numbers x2),
// and NOTHING is drawn over him: the shed is open-fronted, its roof sits over the forge and
// the back wall, so the whole hall goes in the BACK picture and the front one stays empty.
//
// The forms, as today's hall has them: a canvas lean-to over a fire ring and a stump anvil
// (1); a plank shed with a brick forge and bellows (2); a stone forge with a hood, a chimney
// and a shingled roof, a grindstone in the yard (3). The Springworks hangs a great cog on the
// gable (a), the Guillotine Gate stands a guillotine beside it (aa), the Caltrop Field a
// hopper spilling caltrops over the yard (ab). The Blastworks banks sandbags and bomb-marked
// kegs (b), the Minefield Doctrine mounts a brass horn and a map board full of pins (ba), the
// Aerostat Yard a windlass for its balloon (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the spec's `live` list (the forge flame, the pennant), its `lights`
// (the forge on the wall, key "forge": the hall breathes it with the bellows), and what the
// hall file paints itself (the smith, the hot iron, sparks, chimney smoke, the hung traps,
// the blade's glint, the balloon and its tether). The traps and the balloon have pictures
// here too (`trapPix`, `balloonPix`), stamped live by the hall.
import { Pix, mat, flat } from "./pix.js";
import { STYLES, drum, disc, beam, boulder, hash, clamp } from "./hall-kit.js";

export const BOX = { w: 108, h: 152, ox: 54, oy: 122 };
export const LABEL = "Trapsmith";

const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48");
const IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), STEEL = mat("#c4c8d0", { contrast: 1.2 }), ANVIL = mat("#6a6e7a", { contrast: 1.3 });
const STONE = mat("#8a8478"), STONE_L = mat("#9e988a"), STONE_D = mat("#6a655c"), GRIND = mat("#a8a49a");
const BRICK = mat("#9a5a44"), BRICK_L = mat("#b06c52"), CANVAS = mat("#d8c8a0"), SHINGLE = mat("#6a5a4e"), PLANK = mat("#8a6238");
const WALL2 = mat("#73522f"), WALL3 = mat("#54463a"), EARTH = mat("#7c6242"), FLAGS = mat("#8e8676");
const LEATHER = mat("#7a4a2e"), ROPE = mat("#b89a64"), RED_W = mat("#6a3a2a"), RED_WD = mat("#5a2e22");
const KEG = mat("#6a4a2e"), BAG = mat("#b8a078"), BRASS = mat("#d8b04a", { contrast: 1.2 }), BRASS_D = mat("#8a6a22"), PARCH = mat("#d8c8a0"), CALT = mat("#6a707c");
const BLOCK = mat("#4a4a52"), CUT = mat("#d8b888"), BOMB = mat("#2e2e36", { contrast: 1.3 }), BALLOON = mat("#c05848"), CREAM = mat("#e8dcc0"), BASKET = mat("#8a6238");
const DARK = flat("#2a1c18"), HOLE = flat("#3a3c46"), ASH = flat("#3a2a26"), PIN = flat("#c03a2a"), MARK = flat("#c05848");
const COAL = flat("#d8582a", { emis: true }), COAL_L = flat("#f4a040", { emis: true });
const FLAG_OF = { base: "#8a8f9a", a: "#7a94b8", aa: "#8a2f2a", ab: "#8a8f9a", b: "#c05848", ba: "#d8b34a", bb: "#c05848" };

const frac = (v) => v - Math.floor(v);
const UP = [0, -0.8, 0.6], FRONT = [0.12, 0, 0.99], LIT = [-0.2, -0.1, 0.97], SLOPE = [-0.1, -0.5, 0.86];
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A flat face (any shape with one span a row) whose tone is worked pixel by pixel:
// fn(x, y) -> tone steps up or down (null leaves the pixel out). n: the face's normal.
const face = (px, pts, m, z, n, fn, o = {}) => {
  if (!o.same) px.part();
  let y0 = 1e9, y1 = -1e9;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let j = Math.floor(y0); j < Math.ceil(y1); j++) {
    const py = j + 0.5, xs = [];
    for (let a = 0; a < pts.length; a++) { const p = pts[a], q = pts[(a + 1) % pts.length]; if ((p[1] <= py && q[1] > py) || (q[1] <= py && p[1] > py)) xs.push(p[0] + ((py - p[1]) / (q[1] - p[1])) * (q[0] - p[0])); }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let i = Math.ceil(xs[0] - 0.5); i <= Math.floor(xs[xs.length - 1] - 0.5); i++) {
      const b = fn ? fn(i + 0.5, py) : 0; if (b == null) continue;
      px._put(i + px.ox, j + px.oy, m, z, n[0], n[1], n[2], { cast: o.cast ?? 1, floor: o.floor || 0, bias: (o.bias || 0) + b, noLine: o.noLine });
    }
  }
  return px;
};
// stonework as tone on a flat wall: courses `ch` high, blocks `bw` long in a running bond;
// a stone a tone up or down, broken mortar under and right of it, a bevel on the lit side
const stones = (seed, ch, bw) => (x, y) => {
  const c = Math.floor(y / ch), off = (c & 1) * bw * 0.5 + Math.floor(hash(c, seed) * 3), k = Math.floor((x + off) / bw);
  const fy = y - c * ch, fx = x + off - k * bw, hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
  let b = 0;
  if (hv < 0.16) b -= 1; else if (hv > 0.8) b += 1;
  if ((fy >= ch - 1 || fx >= bw - 1) && hm < 0.78) b -= 1;
  else if ((fy < 1 || fx < 1) && hv > 0.55) b += 1;
  return clamp(b, -2, 1);
};
// roofing as tone: rows `rh` deep from y0, each lapping the next; `sw` wide shingles (or long boards)
const courses = (seed, rh, sw, y0) => (x, y) => {
  const r = Math.floor((y - y0) / rh), fy = y - y0 - r * rh, off = (r & 1) * sw * 0.5 + Math.floor(hash(r, seed) * 2), k = Math.floor((x + off) / sw), fx = x + off - k * sw, hv = hash(r, k, seed);
  if (fy < 1 && r > 0) return -1;                                   // the shadow under the row above
  if (fx < 1) return hv > 0.35 ? -1 : 0;                            // the joint between two shingles
  return hv > 0.8 ? 1 : hv < 0.14 ? -1 : 0;
};

// ---- small things of the yard -----------------------------------------------------------------
const caltrop = (px, x, y, z) => {
  px.part();
  for (const [dx, dy] of [[-1, 0], [0, 0], [1, 0], [0, 1]]) px.dot(x + dx, y + dy, CALT, z, { cast: 0 });
  px.dot(x, y - 1, STEEL, z, { fix: 4, cast: 0 });
};
const keg = (px, x, y, z) => {
  drum(px, { cx: x, top: y - 13, bot: y - 2, r: 5.6, r2: 5, sq: 0.36, m: KEG, z, st: STYLES.A, boards: 0.5, course: 99, strings: [[y - 11.5, 1.3, IRON], [y - 4.6, 1.3, IRON]] });
  disc(px, { cx: x, y: y - 13, r: 4.8, sq: 0.36, m: OAK_D, z: z + 0.1 });
  px.part();                                                         // the bomb mark burnt on its staves
  px.ellipse(x - 0.5, y - 7, 2.1, 2.1, MARK, z + 0.2, { cast: 0 }); px.dot(x + 1, y - 9.5, MARK, z + 0.2, { cast: 0 });
};
const sandbag = (px, x, y, z) => {
  px.part(); px.ellipse(x, y - 1, 5.6, 3.7, BAG, z, { round: 0.9 });
  px.toneLine(x - 0.5, y - 4, x - 0.5, y + 2, -1); px.dot(x + 5.5, y - 2.5, BAG, z, { bias: 1 });
};
// the anvil on its block (a stump at level one, an iron block after): the face in the sun,
// the horn to the right, a waist, a foot. Today's outline, row by row.
const ANVIL_ROWS = [[-12, 8], [-12, 13], [-12, 16], [-12, 18], [-9, 10], [-8, 6], [-8, 5], [-8, 5], [-9, 7]];
const anvil = (px, stump) => {
  if (stump) { drum(px, { top: -6, bot: 3, r: 7.5, sq: 0.3, m: TIMBER, z: 0, st: STYLES.A, boards: 0.42, course: 99 }); disc(px, { y: -6, r: 7.5, sq: 0.3, m: CUT, z: 0.1 }); px.tone(-1, -6, -1); px.tone(1, -5, -1); }
  else { drum(px, { top: -6, bot: 3, r: 6.5, sq: 0.3, m: BLOCK, z: 0, st: STYLES.A, course: 99, strings: [[-1, 1.2, IRON_L]] }); disc(px, { y: -6, r: 6.5, sq: 0.3, m: BLOCK, z: 0.1 }); }
  px.part();
  ANVIL_ROWS.forEach(([a, b], r) => {
    for (let i = a; i < b; i++) {
      const top = r < 2, n = top ? UP : [clamp((i + 2) / 14, -0.7, 0.7) * 0.5 + 0.1, 0, 0.9];
      let bias = top ? (r === 0 ? 1 : 0) : r === 4 ? -1 : 0;
      if (!top && i < a + 2) bias += 1;                              // the lit corner
      px._put(i + px.ox, -15 + r + px.oy, ANVIL, 1, n[0], n[1], n[2], { bias, cast: 1 });
    }
  });
};
// the rack: two posts and a top bar, three rungs under it, a hook for each ready trap (empty here)
const rack = (px) => {
  for (const x of [-35, -22]) beam(px, x, 6, x, -41, 4, OAK, -1, { grain: false });
  beam(px, -38.5, -39, -18.5, -39, 3, TIMBER_L, -0.9, { grain: false });
  px.part();
  for (const y of [-30, -20, -10]) px.line(-33, y, -24, y, OAK_D, -1.05, { cast: 0 });
  for (const y of [-37, -29, -19, -9]) px.dot(-28.5, y, IRON, -0.8, { cast: 0 });
};
const cog = (px, cx, cy, R, z) => {
  px.part();
  for (let j = Math.floor(cy - R - 5); j <= Math.ceil(cy + R + 5); j++) for (let i = Math.floor(cx - R - 5); i <= Math.ceil(cx + R + 5); i++) {
    const x = i + 0.5 - cx, y = j + 0.5 - cy, d = Math.hypot(x, y), tooth = frac((Math.atan2(y, x) / (Math.PI * 2)) * 10 + 0.25) < 0.5;
    if (d > (tooth ? R + 3.6 : R)) continue;
    let m = IRON_L, bias = 0;
    if (d < 2.2) m = HOLE; else if (d < 4.8) bias = 1; else if (d < R - 3.4) bias = -1; else if (d > R && y > 2) bias = -1;
    const nx = clamp((x / (R + 4)) * 0.75, -0.9, 0.9), ny = clamp((y / (R + 4)) * 0.75, -0.9, 0.9);
    px._put(i + px.ox, j + px.oy, m, z, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), { bias, cast: 1 });
  }
};

// ---- level 1: the lean-to ---------------------------------------------------------------------
const leanTo = (px, seed) => {
  for (const x of [-28, 20]) beam(px, x, -4, x, -52, 4, OAK, -6, { grain: false });
  // the canvas, laced to the pole tops, sagging between its three ties
  face(px, [[-34, -48], [26, -48], [23, -22], [-31, -22]], CANVAS, -5, [-0.1, -0.45, 0.88], (x, y) => {
    const edge = -23.5 - 2.6 * Math.abs(Math.sin(((x + 31) / 54) * Math.PI * 2));
    if (y > edge) return null;
    let b = 0;
    if (frac((x + 34) / 10) < 0.1) b -= 1;                           // the seams
    if (y < -47) b += 1; else if (y > edge - 2) b -= 1;              // the laced hem in the sun, the loose edge turned under
    if (x > -10 && x < -4 && y > -41 && y < -35) b -= (x < -9 || y > -36) ? 2 : 1;   // a patch
    return b;
  });
  for (const x of [-28, 20]) { px.part(); px.rect(x - 2, -49, 4, 2, ROPE, -4.9, { n: LIT, cast: 0 }); }
  px.part(); px.line(-29, -47, -34, 6, ROPE, -5.5, { cast: 0 }); px.dot(-34, 7, OAK_D, -5.5); px.dot(-33, 7, OAK_D, -5.5);
  // the fire ring on the open ground at the lean-to's mouth: back stones, coals, front stones
  const ring = (frontHalf) => { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.2; if ((Math.sin(a) > 0) === frontHalf) boulder(px, 19 + Math.cos(a) * 8.8, 4.4 + Math.sin(a) * 3.6, 2.9, 2.4, i % 3 ? STONE : STONE_L, frontHalf ? 1.4 : 1); } };
  ring(false);
  px.part(); px.ellipse(19, 2.6, 6, 2.4, ASH, 1.1, { cast: 0 });
  for (const [dx, dy, m] of [[-3, 0, COAL], [-1, -1, COAL_L], [1, 0, COAL], [3, -0.5, COAL], [0, 1, COAL_L], [-2, 1, COAL]]) px.dot(19 + dx, 2.6 + dy, m, 1.2, { cast: 0 });
  ring(true);
};

// ---- levels 2 and 3 and every path: the shed ----------------------------------------------------
const shed = (px, stone, seed, E, ridge) => {
  const W = stone ? WALL3 : WALL2;
  // the floor between the back wall and the posts
  face(px, [[-33, -6], [29, -6], [31, 3.5], [-35, 3.5]], stone ? FLAGS : EARTH, -12, UP, stone ? stones(seed + 1, 3, 9) : (x, y) => (hash(Math.floor(x / 2), Math.floor(y), seed) > 0.86 ? 1 : 0), { bias: -1 });
  // the back wall: upright boards, in the roof's shade
  face(px, box(-32, -52, 60, 48), W, -10, FRONT, (x, y) => {
    const k = Math.floor((x + 32) / 7.5);
    let b = frac((x + 32) / 7.5) < 0.14 ? -1 : hash(k, seed + 2) > 0.72 ? 1 : 0;
    if (y < E + 12) b -= 1;
    if (y > -8 && hash(k, 9, seed) > 0.5) b -= 1;                    // damp at the foot of some boards
    return b;
  });
  // tools on the wall: tongs, a saw, a horseshoe for luck
  px.part(); px.line(-23, -46, -21, -30, IRON_L, -9.5, { cast: 0 }); px.line(-19, -46, -21, -30, IRON_L, -9.5, { cast: 0 }); px.dot(-21, -38, IRON, -9.4, { cast: 0 });
  px.part(); px.rect(-12, -44, 12, 3, STEEL, -9.5, { n: LIT, cast: 0 }); for (let i = 0; i < 6; i++) px.tone(-11.5 + i * 2, -41.5, -2);
  px.part(); px.rect(-16, -45, 4, 5, OAK, -9.4, { n: LIT, cast: 0 });
  px.part(); for (const [dx, dy] of [[0, 0], [-1, 1], [-1, 2], [-1, 3], [0, 4], [3, 0], [4, 1], [4, 2], [4, 3], [3, 4], [1, -1], [2, -1]]) px.dot(-5 + dx, -34 + dy, IRON_L, -9.5, { cast: 0 });

  // the forge: brick at two, stone with a hood and a chimney at three
  if (stone) {
    drum(px, { cx: 20, top: -93, bot: -38, r: 6.5, sq: 0.3, m: STONE, z: -8, st: STYLES.B, seed: seed + 5, course: 5, stoneW: 0.7 });
    drum(px, { cx: 20, top: -96, bot: -92.5, r: 8.5, sq: 0.3, m: STONE_D, z: -7.9, st: STYLES.A, course: 99 });
    disc(px, { cx: 20, y: -96, r: 8.5, sq: 0.3, m: STONE_L, z: -7.8 });
    px.part(); px.ellipse(20, -96, 5.2, 1.5, flat("#2a2030"), -7.7, { cast: 0 });
  }
  face(px, box(4, -28, 28, 29), stone ? STONE : BRICK, -6, FRONT, stone ? stones(seed + 3, 5, 9) : stones(seed + 3, 4, 8));
  if (stone) {
    face(px, [[2, -28], [34, -28], [27, -40], [9, -40]], STONE_L, -5.6, [-0.1, -0.42, 0.9], (x, y) => stones(seed + 9, 4, 8)(x, y) + (x > 25 ? -1 : 0));
    face(px, box(1, -29.5, 34, 2.5), STONE_L, -5.5, UP, null);
  } else face(px, box(3, -30, 30, 2.5), BRICK_L, -5.9, UP, null);
  // its mouth, a bed of coals in it (the flame over them is live)
  face(px, [[10, -11], [10, -19], [13, -22], [23, -22], [26, -19], [26, -11]], DARK, -5.8, FRONT, null, { cast: 0 });
  px.toneLine(9.5, -12, 9.5, -19, 1); px.toneLine(13, -23, 23, -23, 1);
  px.part(); px.rect(11, -14, 14, 3, COAL, -5.7, { cast: 0 });
  for (const [dx, dy] of [[1, 0], [4, 1], [6, 0], [9, 1], [12, 0], [3, 2], [10, 2]]) px.dot(11 + dx, -14 + dy, COAL_L, -5.6, { cast: 0 });
  // the bellows beside the hearth, its nozzle at the fire
  face(px, [[-12, -18], [2, -22.5], [2, -13.5]], LEATHER, -5.4, FRONT, (x) => (Math.floor(x + 20) % 3 === 0 ? -1 : 0));
  px.part(); px.rect(-15, -21, 3.5, 6, OAK, -5.3, { n: LIT }); px.rect(2, -19, 3, 2, IRON, -5.3, { n: LIT, cast: 0 });

  // the posts and their braces: over the forge and the back, never over the smith
  for (const x of [-31, 27]) {
    beam(px, x, 3, x, -52, 5, OAK, -4, { bands: stone ? [0.8] : null, bandM: IRON, seed: seed + x });
    beam(px, x, -39, x + (x < 0 ? 9 : -9), -49, 2.4, OAK_D, -4.2, { grain: false });
    if (stone) boulder(px, x, 5, 4.4, 2.6, STONE_L, -3.9);
  }
  // the roof: its eave to the front, the ridge behind; shingles at three, long boards at two
  face(px, [[-44, E], [-36, ridge], [32, ridge], [40, E]], stone ? SHINGLE : PLANK, -2, SLOPE, (x, y) => {
    let b = stone ? courses(seed + 2, 4, 6, ridge)(x, y) : courses(seed + 2, 5, 22, ridge)(x, y);
    if (y > E - 1) b = 1;                                            // the eave's edge catches the sun
    if (stone && hash(Math.floor(x / 5), Math.floor((y - ridge) / 4), seed + 40) > 0.93) b -= 1;   // a slipped or mossy shingle
    return b;
  });
  beam(px, -44.5, E, -36.5, ridge, 2.6, stone ? OAK : TIMBER_L, -1.8, { grain: false });
  beam(px, 40.5, E, 32.5, ridge, 2.6, OAK_D, -1.8, { grain: false });
  beam(px, -37, ridge, 33, ridge, 2.6, stone ? STONE_D : OAK, -1.7, { grain: false });
  face(px, box(-44, E, 84, 3), OAK, -1.9, FRONT, (x, y) => (y < E + 1 ? 1 : Math.floor(x + 60) % 12 === 0 ? -1 : 0));
};

// ---- what the paths stand in the yard -----------------------------------------------------------
const grindstone = (px) => {
  beam(px, 20.8, 15, 20.8, -1, 3, OAK, 3, { grain: false });
  px.part(); px.ellipse(26, -2, 7.2, 7.2, GRIND, 3.5, { round: 0.55 });
  for (let a = 0; a < 6.2; a += 0.5) px.tone(26 + Math.cos(a) * 5, -2 + Math.sin(a) * 5, hash(a, 3) > 0.5 ? -1 : 0);
  px.part(); px.ellipse(26, -2, 1.8, 1.8, OAK, 3.6, { cast: 0 }); px.rect(31.5, -3, 4, 2, OAK, 3.6, { n: LIT });
  beam(px, 31.2, 15, 31.2, -1, 3, OAK, 4, { grain: false });
};
const guillotine = (px) => {
  beam(px, 18, 8, 18, -47, 4, RED_W, 3, { grain: false });
  px.part(); px.poly([[20, -42], [30, -42], [30, -32], [20, -27.6]], STEEL, 3.2, { n: [-0.3, -0.25, 0.92] });
  px.toneLine(20, -28.5, 30, -33, 1);                                // the edge
  px.rect(20, -45, 10, 3, IRON, 3.3, { n: LIT });
  face(px, box(17, 1, 16, 7), RED_W, 3.4, FRONT, (x, y) => (y < 2 ? 1 : 0));
  px.part(); px.ellipse(25, 2.4, 2.8, 2.2, DARK, 3.5, { cast: 0 });
  beam(px, 32, 8, 32, -47, 4, RED_W, 3.6, { grain: false });
  beam(px, 14, -47, 36, -47, 5, RED_WD, 3.8, { grain: false });
  px.part(); px.line(33, -44, 35, -2, ROPE, 3.9, { cast: 0 });
};
const hopper = (px, seed) => {
  beam(px, 17, 8, 18.6, -24, 3, OAK, 3, { grain: false }); beam(px, 33, 8, 31.4, -24, 3, OAK, 3, { grain: false });
  for (const [dx, dy] of [[-4, 7.2], [3, 8], [0, 4.8], [6, 5.2], [-7, 5.6], [2, 6], [-2, 9]]) caltrop(px, 25 + dx, dy, 3.4);
  px.part(); px.poly([[9, -44], [41, -44], [33, -22], [17, -22]], TIMBER, 3.5, { round: 0.55 });
  for (const x of [15, 21, 27, 33]) px.toneLine(x, -44, 25 + (x - 25) * 0.55, -22, -1);
  px.rect(10.5, -41, 29, 2.4, IRON, 3.6, { n: LIT, cast: 0 }); px.rect(22, -22, 6, 6, IRON, 3.6, { n: LIT });
  px.part(); px.ellipse(25, -44, 15.4, 3.2, IRON, 3.7, { round: 0.2 });
  for (let i = 0; i < 9; i++) px.dot(13 + i * 3 + (i % 2), -45 + (i % 3), i % 2 ? STEEL : CALT, 3.8, { fix: i % 2 ? 4 : 2, cast: 0 });
  // caltrops scattered over the yard
  for (let i = 0; i < 12; i++) { const a = hash(seed, i) * Math.PI * 2, d = Math.sqrt(hash(seed, i + 20)); caltrop(px, Math.cos(a) * d * 28, 11 + Math.sin(a) * d * 11, 0.5); }
};
const horn = (px) => {
  px.part(); px.rect(24, -40.5, 7, 2.4, IRON, 3, { n: LIT });
  px.part(); px.poly([[29, -40.5], [29, -38.5], [42, -33], [42, -47]], BRASS, 3.2, { n: [-0.25, -0.45, 0.85] });
  px.toneLine(31, -38.5, 41, -34, -1);
  px.part(); px.ellipse(42, -40, 2.6, 7.6, BRASS_D, 3.4, { round: 0.4 }); px.ellipse(42.4, -40, 1.3, 5.4, DARK, 3.5, { cast: 0 });
};
const mapBoard = (px) => {
  beam(px, -34, -1, -34, -28, 3, OAK, -1, { grain: false });
  px.part(); px.rect(-45, -45, 22, 18, OAK, -0.9, { n: LIT });
  px.part(); px.rect(-44, -44, 20, 16, PARCH, -0.8, { n: LIT, cast: 0 });
  px.toneLine(-43, -36, -36, -38, -1); px.toneLine(-36, -38, -30, -34, -1); px.toneLine(-30, -34, -25, -35, -1);   // a road across the map
  for (const [x, y] of [[-40, -41], [-34, -34], [-30, -41], [-38, -31], [-27, -31]]) { px.dot(x, y, PIN, -0.7, { cast: 0 }); px.dot(x + 1, y, PIN, -0.7, { cast: 0 }); }
  // the trodden spots the mine pile stands on
  px.part(); for (const [x, y] of [[-30, 6], [-21, 7]]) px.ellipse(x, y, 5, 1.8, EARTH, -0.5, { bias: -2, cast: 0, noLine: true, n: UP });
};
const windlass = (px) => {
  for (const x of [20.6, 33.4]) beam(px, x, 8, x, -13, 3.2, OAK, 3, { grain: false });
  px.part(); px.capsule(19.5, -10, 4, 34.5, -10, 4, OAK, 3.4);
  px.part(); px.capsule(23.5, -10, 4.6, 30.5, -10, 4.6, ROPE, 3.5, { cast: 0 });
  for (let x = 23; x < 32; x += 2) px.toneLine(x, -14, x, -6, -1);
  px.part(); px.line(36, -10, 39, -15, IRON, 3.6, { cast: 0 }); px.dot(40, -16, OAK_D, 3.6); px.dot(40, -15, OAK_D, 3.6);
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const lvl = br ? 3 : level, spring = br === "a", blast = br === "b", seed = (o.seed || 0) * 7 + lvl;
  const E = -50, ridge = lvl >= 3 ? -70 : -66;
  // the trodden yard
  back.part(); back.ellipse(0, 8, 35, 13, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  for (let i = 0; i < 14; i++) { const a = hash(seed, i, 3) * Math.PI * 2, d = Math.sqrt(hash(seed, i, 5)); back.tone(Math.cos(a) * d * 30, 8 + Math.sin(a) * d * 11, hash(seed, i, 7) > 0.5 ? 1 : -1); }
  boulder(back, -31, 17, 3, 2.2, STONE, 2); boulder(back, 33, 12, 2.6, 2, STONE_L, 2);

  if (lvl === 1) leanTo(back, seed); else shed(back, lvl >= 3, seed, E, ridge);
  if (spring) { beam(back, -6, ridge, -6, -87, 3, OAK, -7, { grain: false }); cog(back, -6, -87, 13, -1.5); }
  anvil(back, lvl === 1);
  if (lvl >= 3 && !blast && !r4) grindstone(back);
  if (r4 === "aa") guillotine(back);
  if (r4 === "ab") hopper(back, seed);
  if (r4 === "ba") { horn(back); mapBoard(back); }
  if (blast) for (const [x, y] of r4 === "bb" ? [[17, 5]] : r4 ? [[24, 6]] : [[20, 5], [30, 7]]) keg(back, x, y, 2 + y * 0.01);
  if (r4 === "bb") windlass(back);
  if (blast) for (const [x, y] of [[11, 18], [19, 17], [26, 14]]) sandbag(back, x, y, 5 + x * 0.01);
  if (r4 !== "ba") rack(back);

  // what moves: the forge's flame and its light on the wall, the pennant on the ridge
  const live = [], lights = [];
  if (lvl === 1) { live.push({ kind: "flame", x: 19, y: 2, w: 7, h: 9 }); lights.push({ key: "forge", x: 19, y: -3, r: 28, col: "#ffa040", a: 0.7 }); }
  else { live.push({ kind: "flame", x: 18, y: -12, w: 9, h: 7 }); lights.push({ key: "forge", x: 18, y: -15, r: 34, col: "#ffa040", a: 0.85 }); }
  if (lvl >= 2) live.push({ kind: "pennant", x: -34, y: ridge, col: FLAG_OF[key], pole: 10, len: 12, h: 6, dir: -1 });
  return {
    live, lights,
    // the smith, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [{ fig: "smith", x: -13, y: 8, dir: 1, clip: "hammer" }],
    shadow: lvl === 1 ? { rx: 30, ry: 8, dx: 8, dy: 9 } : { rx: 38, ry: 10, dx: 8, dy: 9 },
  };
};

// ---- what the hall stamps live ------------------------------------------------------------------
// One ready trap hung from its hook (the anchor is the hook's foot, as the old painter's):
//   "s" a spike board, "a" bear-iron jaws, "b" a round mine, "m" the same mine with no hook (the Doctrine's pile)
export const trapPix = (kind) => {
  const px = new Pix(16, 18, 8, 6);
  px.part();
  if (kind !== "m") px.line(0, -4, 0, 0, IRON, 0, { cast: 0 });
  if (kind === "a") {
    px.part(); px.rect(-5, 0, 10, 6, IRON_L, 1, { n: LIT });
    for (let i = 0; i < 5; i++) { px.dot(-5 + i * 2, 0, STEEL, 1.1, { fix: 4, cast: 0 }); px.dot(-4 + i * 2, 1, STEEL, 1.1, { fix: 4, cast: 0 }); }
    px.rect(-5, 3, 10, 3, IRON, 1.1, { n: LIT, cast: 0 }); px.dot(-0.5, 4, STEEL, 1.2, { fix: 3, cast: 0 });
  } else if (kind === "b" || kind === "m") {
    px.part(); px.ellipse(0, 4, 4.3, 4.3, BOMB, 1, { round: 0.95 });
    px.dot(-2, 2, IRON_L, 1.1, { fix: 4, cast: 0 }); px.dot(-0.5, 0, MARK, 1.2, { cast: 0 }); px.dot(0.5, 0, MARK, 1.2, { cast: 0 });
  } else {
    px.part(); px.rect(-5, 1, 10, 4, TIMBER, 1, { n: LIT });
    for (const x of [-4, -1, 2]) { px.dot(x, -1, STEEL, 1.1, { fix: 4, cast: 0 }); px.dot(x, 0, STEEL, 1.1, { fix: 4, cast: 0 }); px.dot(x + 1, 0, STEEL, 1.1, { fix: 3, cast: 0 }); }
  }
  return px.resolve();
};
// The Aerostat Yard's balloon (the anchor is the envelope's middle): gores, a load ring, the
// basket on its ropes and the bomb slung under it. The hall bobs it and draws the tether.
export const balloonPix = () => {
  const px = new Pix(36, 58, 18, 19);
  px.part(); px.ellipse(0, 0, 14, 16, BALLOON, 0, { round: 0.95 });
  for (let j = -15; j < 16; j++) {
    const s = Math.sqrt(Math.max(0, 1 - ((j + 0.5) / 16) ** 2)), ny = ((j + 0.5) / 16) * 0.95;
    for (const g of [-0.72, -0.26, 0.26, 0.72]) { const x = 14 * g * s, nx = g * 0.95; px._put(Math.floor(x + px.ox), j + px.oy, CREAM, 0.1, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), { cast: 0 }); }
  }
  px.part(); px.line(-8, 12, -4, 22, ROPE, -0.5, { cast: 0 }); px.line(7, 12, 3, 22, ROPE, -0.5, { cast: 0 });
  px.part(); px.rect(-5, 21, 10, 6, BASKET, 1, { n: LIT }); px.toneLine(-5, 23.5, 5, 23.5, -1); px.toneLine(-5, 21.5, 5, 21.5, 1);
  px.part(); px.line(0, 27, 0, 29, ROPE, 0.5, { cast: 0 }); px.ellipse(0, 32, 4.4, 4.4, BOMB, 1, { round: 0.95 }); px.dot(-2, 30, IRON_L, 1.1, { fix: 4, cast: 0 });
  return px.resolve();
};
