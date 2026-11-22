// ============ PIX HALL: the Knight Garrison, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/garrison.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun from the upper left, stone and timber as tone, a shadow under every eave.
//
// The hall has no crew: its knights are units on the road. What the engine reads is the DOOR:
// new men step out at (t.x, t.y + 10) (engine/towers.js syncUnits) and march to the flag, so
// the door stays on the centre line with open yard in front of it. Everything is in ART
// PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y), y down; the numbers are the
// old painter's (halls/garrison.js `dims`, `roofOf`, `yard`) times two: the footing's front
// edge at +10, the campfire at (-11, 24), the right-hand prop's feet at (17, 25).
//
// The forms, as today's hall has them: a plank bunkhouse with a straw dummy (1), a
// half-timbered hall with a torch, a dummy and a weapon rack (2), the same on a taller stone
// footing behind a palisade, with a corner turret and a campfire (3); the Paladin Order's
// whitewashed stone under blue slate with a gilt ridge, a rose window and sun banners (a),
// the Grand Champion's gold-capped keep and war-hammer on a plinth (aa), the Radiant
// Basilica's golden dome and gold ring in the ground (ab); the Knights Errant's dark lodge
// under forest green with brass, kite shields, a crown and crossed swords (b), the Lancer
// Order's stable, trough, quintain and lances (ba), the Crossbow Company's watch platform,
// crossbow rack, pavises and butt (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the spec's `live` (the standard, the lances' pennons, the campfire
// and torch flames) and `lights` (firelight, the rose window, the hammer, the dome; the hall
// file drives the last three by key). The chimney smoke, the basilica's runes and the rally
// flag are still painted by the hall file.
import { mat, flat } from "./pix.js";
import { STYLES, hash, clamp, drum, cone, beam, door, wallBanner, boulder, ivy, WARM } from "./hall-kit.js";

export const BOX = { w: 100, h: 150, ox: 50, oy: 112 };
export const LABEL = "Knight Garrison";
const SQ = 0.34;                 // the camera's squash for the round turret and its cap

// ---- materials (the old painter's palette) ---------------------------------------------------
const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), DAUB = mat("#e0d4b4"), GREY = mat("#9a9488"), CHIM = mat("#7a746a");
const PALE = mat("#c8c0ac"), PALE_W = mat("#e0d8c4"), PALE_F = mat("#b8b0a0"), GOLD = mat("#d8b34a"), RED = mat("#a04a3f"), CREAM = mat("#e8e2d0");
const STRAW = mat("#d8b868"), STEEL = mat("#c4c8d0", { contrast: 1.2 }), STEEL_H = mat("#b0b4c0", { contrast: 1.2 }), IRON = mat("#4a4c56"), DOOR = mat("#5e4128");
// the Errant livery: gunmetal, forest green, brass, off-white
const GUN = mat("#4c525e"), GUN_L = mat("#7c8494"), GUN_D = mat("#34383f"), GUN_ST = mat("#5c6270"), GREEN = mat("#2f6b3f"), GREEN_D = mat("#1f4a2c"), GREEN_L = mat("#4f8f58"), BRASS = mat("#c9a24a"), ERR_T = mat("#4a3f3a");
const EARTH = mat("#7c6242"), EARTH_B = mat("#6a5a48"), DARK = flat("#2a2030"), BAY = mat("#b0693a"), MANE = mat("#3a2018"), MUZZ = mat("#f0e2c4"), WATER = flat("#6aa0c0"), WATER_L = flat("#b8dcec");
const SACK = mat("#b89a64"), BLUE = mat("#3a5a8a"), SLATE = mat("#4a6a92"), TILE = mat("#a0503c"), ROCK = mat("#8a8478"), COAL = flat("#e8683a", { emis: true }), RING = flat("#ad8f4c");
const PANES = ["#3a6ac8", "#e8c14a", "#c8383a", "#3a6ac8"].map((c) => flat(c, { emis: true }));

// flat faces under the one sun: a wall facing the viewer, a top, a face turned to the sun, one turned away
const N_F = [0.12, -0.05, 0.99], N_TOP = [0, -0.8, 0.6], N_W = [-0.3, -0.2, 0.93], N_E = [0.85, 0, 0.53], N_ROOF = [0.2, -0.1, 0.97];
const put = (px, x, y, m, z, n, o) => px._put(Math.floor(x + px.ox), Math.floor(y + px.oy), m, z, n[0], n[1], n[2], o);

// A flat rectangular face. tex(u, v): tone steps from a texture (u, v from the face's corner);
// o.shade(x, y): more tone steps (a shadow lying on it); o.same: stay in the current part.
const face = (px, x, y, w, h, m, z, n, tex, o = {}) => {
  if (!o.same) px.part();
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.floor(x + w), y1 = Math.floor(y + h);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    let b = tex ? tex(i - x0, j - y0) : 0;
    if (o.shade) b += o.shade(i + 0.5, j + 0.5);
    put(px, i + 0.5, j + 0.5, m, z, n, { bias: b, cast: o.cast ?? 1 });
  }
};
// stonework as tone: a stone a tone up or down, broken mortar below and right of it, a bevel above and left
const stones = (seed, ch = 6, bw = 10) => (u, v) => {
  const c = Math.floor(v / ch), off = (c & 1) * (bw >> 1) + Math.floor(hash(c, seed) * 3), k = Math.floor((u + off) / bw);
  const hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
  const eB = (v + 1) % ch === 0, eR = (u + off + 1) % bw === 0, eT = v % ch === 0, eL = (u + off) % bw === 0;
  let b = hv < 0.15 ? -1 : hv > 0.8 ? 1 : 0;
  if ((eB || eR) && hm < 0.7) b -= 1; else if ((eT || eL) && hv > 0.5) b += 1;
  return clamp(b, -1, 1);
};
// upright boards: a dark joint, a board in four a tone up, a knot now and then
const boards = (seed, pw = 6) => (u, v) => {
  const k = Math.floor(u / pw);
  if (u - k * pw === 0) return -1;
  if (hash(k, Math.floor(v / 5), seed + 3) > 0.93) return -1;
  return hash(k, seed) > 0.74 ? 1 : 0;
};
// the roof's shadow on the wall under it (the resolve adds two more pixels of cast shadow)
const eaveShade = (wt) => (x, y) => (y < wt + 4 + (x > 0 ? 1 : 0) ? -1 : 0);

// A hip roof seen from the south and above: the front slope, the west hip in the sun, the east
// hip in shade, tile courses as tone, a fascia at the eave.
//   eave: the eave line's y; E: its half-width; rw: the ridge's half-width; h: ridge over eave
//   D: how much of the building's depth shows (the hips' height at the eave corners)
const hipRoof = (px, o) => {
  const { eave, E, rw, h, m, z, seed = 1, D = 9, rows = 5, x0 = 0, fascia = m } = o;
  px.part();
  // the hip line sags a little, as the old roof's does
  const half = (t) => { const s = (1.1 - Math.sqrt(1.21 - 0.4 * t)) / 0.2; return (1 - s) * (1 - s) * (E + 1) + 2 * s * (1 - s) * (0.72 * E) + s * s * rw; };
  for (let j = Math.floor(eave - h); j < Math.floor(eave); j++) {
    const y = j + 0.5, t = clamp((eave - y) / h, 0, 1), xi = half(t), xo = half(clamp((eave - D - y) / (h - D), 0, 1));
    const row = Math.floor((eave - y) / rows), fr = eave - y - row * rows;
    for (let i = -Math.ceil(xo) - 1; i <= Math.ceil(xo); i++) {
      const x = i + 0.5, ax = Math.abs(x);
      if (ax > xo) continue;
      let n = N_ROOF, b = 0;
      if (ax <= xi) {
        const sx = Math.floor(x + (row & 1) * 3 + 200), k = Math.floor(sx / 6), hv = hash(row, k, seed);
        if (fr < 1) b -= 1;                                                    // each course laps the next
        else if (sx % 6 === 0 && hash(row, k, seed + 9) < 0.22) b -= 1;        // a joint here and there
        else if (hv > 0.88 && x < E * 0.45) b += 1;                             // a tile catching the light
        else if (hv < 0.05) b -= 1;
        if (t > 0.94) b = 1;                                                   // the ridge
        if (ax > xi - 1.2 && x < 0 && t < 0.94) b = Math.max(b, 0) + 1;        // the hip's edge toward the sun
      } else if (x < 0) { n = N_W; if (fr < 1 && hash(row, seed + 2) < 0.7) b -= 1; }
      else { n = N_E; if (fr < 1 && hash(row, seed + 4) < 0.4) b += 1; }
      put(px, x0 + x, y, m, z, n, { bias: b });
    }
  }
  for (let j = 0; j < 2; j++) for (let i = -Math.ceil(E) - 1; i <= Math.ceil(E); i++) put(px, x0 + i + 0.5, eave + j + 0.5, fascia, z, N_F, { bias: j ? -2 : -1 });
};

// ---- small things on the walls ------------------------------------------------------------------
// a kite shield of the livery: brass rim, green field, a brass cross or chevron
const kite = (px, x, y, w, h, z, dev = 0, field = GREEN, rim = BRASS) => {
  const sh = (k) => [[x - w / 2 + k, y + k], [x + w / 2 - k, y + k], [x + w / 2 - k, y + h * 0.45], [x, y + h - k * 1.5], [x - w / 2 + k, y + h * 0.45]];
  px.part(); px.poly(sh(0), rim, z, { round: 0.6 }); px.poly(sh(1.3), field, z + 0.1, { round: 0.6, cast: 0 });
  const o = { cast: 0 };
  if (dev % 2 === 0) { for (let j = 2; j < h - 5; j++) px.dot(x, y + j + 0.5, rim, z + 0.2, o); for (let i = -1; i <= 1; i++) px.dot(x + i, y + 4.5, rim, z + 0.2, o); }
  else for (let i = -2; i <= 2; i++) { px.dot(x + i, y + 4.5 + Math.abs(i), rim, z + 0.2, o); px.dot(x + i, y + 5.5 + Math.abs(i), rim, z + 0.2, o); }
};
const CROWN = ["b...b...b", "b...b...b", "bb.bbb.bb", "bbbbbbbbb", "bbbgggbbb", "bbbbbbbbb"];
const crown = (px, x, y, z) => { px.part(); px.stamp(CROWN, x - 4, y - 5, { b: { m: BRASS }, g: { m: GREEN_L, fix: 3 } }, z, { cast: 1 }); };
// two swords crossed, point up: steel blades, brass guards and pommels
const crossedSwords = (px, x, y, z) => {
  px.part();
  for (const s of [-1, 1]) {
    px.line(x - s * 4, y - 2, x + s * 4, y - 13, STEEL, z, { cast: 0 }); px.line(x - s * 4 + 1, y - 2, x + s * 4 + 1, y - 13, STEEL, z, { cast: 0, bias: -1 });
    px.dot(x - s * 4.5, y - 0.5, BRASS, z + 0.1, { cast: 0 }); px.dot(x - s * 4.5 + 1, y - 0.5, BRASS, z + 0.1, { cast: 0 });
    for (let d = -2; d <= 2; d++) px.dot(x - s * 2.4 + d, y - 4.4 + s * d * 0.7, BRASS, z + 0.1, { cast: 0 });
  }
};
// a lance, point up, with a brass collar (its pennon is live)
const lance = (px, x, base, top, z) => {
  beam(px, x, base, x, top, 2, TIMBER, z, { grain: false, cast: 0 });
  px.part(); px.poly([[x - 2, top], [x, top - 7], [x + 2, top]], STEEL, z + 0.1, { n: [-0.3, -0.3, 0.9] }); px.rect(x - 2, top, 4, 2, BRASS, z + 0.2, { n: N_F, cast: 0 });
};
const torch = (px, x, y, z) => { px.part(); px.line(x, y + 8, x, y + 2, IRON, z, { cast: 1 }); px.rect(x - 2, y, 4, 2, IRON, z, { n: [0, -0.5, 0.8] }); };
const SUN = ["#.#.#", ".###.", "#####", ".###.", "#.#.#"], BOLT = [".#.", "###", ".#.", ".#.", "o#o", ".o."];

// a round corner turret under a cone
const turret = (px, cx, top, bot, r, stone, trim, cap, capH, z, st, seed) => {
  drum(px, { cx, top, bot, r, sq: SQ, m: stone, z, st, seed, course: 5, stoneW: 0.7, strings: [[top + 2, 2, trim]] });
  px.part(); px.rect(cx - 1.5, top + 10, 3, 8, st.lit ? WARM : DARK, z + 0.2, { cast: 0, n: [0, 0, 1] });
  px.rect(cx - 1.5, top + 10, 1, 8, DARK, z + 0.3, { cast: 0 }); px.rect(cx - 1.5, top + 10, 3, 1, DARK, z + 0.3, { cast: 0 });
  cone(px, { cx, y: top + 1, r: r + 3.5, h: capH, sq: SQ, m: cap, z: z + 0.5, st, rows: 4, seed });
};
// a row of sharpened stakes behind the hall, tallest in the middle
const palisade = (px, cx, top, half, seed, z, m = OAK, m2 = OAK_D) => {
  const n = Math.max(1, Math.round(half / 6.8));
  for (let i = -n; i <= n; i++) {
    const x = cx + i * 6.8, ph = 36 - Math.abs(i) * (16 / n) + hash(seed, i + 9) * 4;
    px.part(); px.poly([[x - 3.4, top - ph], [x, top - ph - 6], [x + 3.4, top - ph], [x + 3.4, top + 8], [x - 3.4, top + 8]], hash(seed, i + 20) > 0.5 ? m : m2, z + i * 0.01, { round: 0.7 });
  }
  beam(px, cx - n * 6.8 - 3.4, top - 10, cx + n * 6.8 + 3.4, top - 10, 3, m2, z + 0.2, { grain: false });
};
const chimney = (px, cx, cy, m, z, seed) => {
  face(px, cx - 5, cy - 14, 7, 18, m, z, N_F, stones(seed, 4, 5));
  face(px, cx + 2, cy - 14, 3, 18, m, z, N_E, null, { same: true });
  face(px, cx - 6, cy - 17, 12, 3, m, z + 0.1, N_F, null, { shade: (x, y) => (y < cy - 16 ? 1 : -1) });
};

// ---- the yard's things (feet at (x, y)) --------------------------------------------------------
const dummy = (px, x, y, z) => {
  beam(px, x, y, x, y - 28, 3, OAK, z, { grain: false });
  beam(px, x - 10, y - 22, x + 10, y - 22, 3, OAK, z + 0.1, { grain: false });
  px.part(); px.poly([[x - 5, y - 26], [x + 5, y - 26], [x + 5, y - 12], [x - 5, y - 12]], STRAW, z + 0.2, { round: 0.7 });
  px.toneLine(x - 4, y - 16, x + 4, y - 16, -1); px.rect(x - 2, y - 22, 4, 4, RED, z + 0.3, { cast: 0, n: N_F });
  px.part(); px.ellipse(x, y - 31, 4.4, 4.4, STRAW, z + 0.3, { round: 0.9 });
};
// a rack of three spears, a shield leaned on its left post
const rack = (px, x, y, shield, z) => {
  beam(px, x - 6, y, x - 6, y - 18, 3, OAK, z, { grain: false }); beam(px, x + 5, y, x + 5, y - 18, 3, OAK, z, { grain: false, same: true });
  beam(px, x - 8, y - 15, x + 7, y - 15, 3, TIMBER, z + 0.1, { grain: false });
  for (let i = 0; i < 3; i++) {
    const sx = x - 4 + i * 4, top = y - 27 - ((i * 2) % 3) * 3;
    px.part(); px.line(sx, y - 1, sx, top, OAK_D, z + 0.2, { cast: 0 }); px.poly([[sx - 1, top], [sx + 0.5, top - 6], [sx + 2, top]], STEEL, z + 0.3, { n: [-0.3, -0.3, 0.9] });
  }
  if (shield) { px.part(); px.ellipse(x - 7, y - 6, 5, 5.6, shield, z + 0.4, { round: 0.75 }); px.dot(x - 7.5, y - 6.5, GOLD, z + 0.5, { fix: 4, cast: 0 }); px.dot(x - 6.5, y - 6.5, GOLD, z + 0.5, { fix: 3, cast: 0 }); }
};
// the campfire ring (its fire is live): back stones, crossed logs, front stones
const campfire = (px, x, y, z, seed) => {
  const at = [...Array(6).keys()].map((i) => (i / 6) * Math.PI * 2 + 0.26);
  for (const a of at.filter((a) => Math.sin(a) < 0)) boulder(px, x + Math.cos(a) * 8, y + Math.sin(a) * 3.6 + 1, 2.8, 2.2, ROCK, z);
  beam(px, x - 6, y + 1, x + 5, y - 3, 3, mat("#5f4326"), z + 0.1, { grain: false }); beam(px, x - 5, y - 3, x + 6, y + 1, 3, mat("#4a3018"), z + 0.2, { grain: false });
  px.dot(x - 1, y - 1.5, COAL, z + 0.3, { cast: 0 }); px.dot(x + 1, y - 0.5, COAL, z + 0.3, { cast: 0 });
  for (const a of at.filter((a) => Math.sin(a) >= 0)) boulder(px, x + Math.cos(a) * 8, y + Math.sin(a) * 3.6 + 1, 2.8, 2.2, ROCK, z + 0.4);
  void seed;
};
// the Champion's war-hammer, its handle driven into a stone plinth
const hammer = (px, hx, py, z, seed) => {
  face(px, hx - 8, py - 7, 16, 7, PALE, z, N_F, stones(seed, 4, 8));
  face(px, hx - 9, py - 11, 18, 4, PALE_W, z + 0.1, N_TOP, null);
  beam(px, hx, py - 9, hx, -34, 5, OAK, z + 0.2, { bands: [0.4, 0.64], bandM: GOLD, grain: false });
  px.part(); px.poly([[hx - 14, -48], [hx + 14, -48], [hx + 14, -32], [hx - 14, -32]], STEEL_H, z + 0.4, { round: 0.8 });
  px.toneLine(hx - 13, -47.5, hx + 6, -47.5, 1); px.toneLine(hx - 13, -32.5, hx + 13, -32.5, -1);
  px.rect(hx - 14, -42, 28, 3, GOLD, z + 0.5, { n: N_F, cast: 0 }); px.rect(hx - 2, -48, 4, 16, GOLD, z + 0.5, { n: [-0.2, -0.1, 0.97], cast: 0 });
};
const hayBale = (px, x, y, w, h, z) => {
  px.part(); px.poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y], [x - w / 2, y]], STRAW, z, { round: 0.6 });
  px.toneLine(x - w * 0.22, y - h, x - w * 0.22, y, -1); px.toneLine(x + w * 0.22, y - h, x + w * 0.22, y, -1); px.toneLine(x - w / 2 + 1, y - h + 0.5, x + 1, y - h + 0.5, 1);
};
// a barded warhorse looking out over the half-door: a bay under a gunmetal chanfron, a green crest
const HORSE = [
  "..e.....e..",
  "..ee.G.ee..",
  ".mhhGGGhh..",
  ".mhhhchhhh.",
  "mmhkhchkhh.",
  "mmhhhbhhhh.",
  "mmhhhchhhh.",
  "mmnhhhhhnn.",
  "mmnnwwwnnn.",
  "mmnnwdwdnn.",
  "mmnnnwwnnn.",
  ".mnnnnnnnn.",
  ".nnnnnnnnnn",
  ".nnnnnnnnnn",
  ".nnnnnnnnnn",
];
// the Lancers' stall: posts, a dark bay, hay, the horse, a half-door, a little green roof
const stable = (px, sx, sy, z, seed) => {
  face(px, sx - 10, sy - 21, 20, 21, mat("#3a2e30"), z, N_F, null, { shade: (x, y) => (y < sy - 15 ? -1 : 0) });
  face(px, sx - 10, sy - 2, 20, 2, STRAW, z + 0.05, N_TOP, null, { cast: 0 });
  hayBale(px, sx - 5.5, sy - 2, 8, 6, z + 0.1);
  px.part(); px.stamp(HORSE, sx - 3, sy - 20, { h: { m: BAY }, e: { m: BAY, bias: -1 }, n: { m: BAY, bias: -1 }, m: { m: MANE }, c: { m: GUN_L }, b: { m: BRASS, fix: 4 }, k: { m: DARK, fix: 0 }, d: { m: DARK, fix: 0 }, w: { m: MUZZ }, G: { m: GREEN_L } }, z + 0.2, { ball: [5, 5, 7, 9] });
  face(px, sx - 9, sy - 6, 18, 6, ERR_T, z + 0.4, N_F, boards(seed, 5), { shade: (x, y) => (y < sy - 5 ? 1 : 0) });
  px.dot(sx, sy - 3.5, BRASS, z + 0.5, { fix: 4, cast: 0 }); px.dot(sx - 1, sy - 3.5, BRASS, z + 0.5, { cast: 0 });
  for (const s of [-1, 1]) { face(px, sx + s * 9.6 - 2, sy - 21, 4, 22, GUN, z + 0.5, s < 0 ? N_W : N_F, null); face(px, sx + s * 9.6 - 2, sy - 21, 4, 2, BRASS, z + 0.6, N_F, null, { same: true, cast: 0 }); }
  hipRoof(px, { x0: sx, eave: sy - 20, E: 13, rw: 5, h: 12, m: GREEN, z: z + 1, seed, D: 4, rows: 4 });
  face(px, sx - 6, sy - 34, 12, 2, BRASS, z + 1.1, N_TOP, null, { cast: 0 });
};
const trough = (px, x, y, z) => {
  px.part(); px.poly([[x - 7, y - 6], [x + 7, y - 6], [x + 6, y], [x - 6, y]], ERR_T, z, { round: 0.5 });
  px.rect(x - 5, y - 6, 10, 2, WATER, z + 0.1, { cast: 0 }); px.rect(x - 4, y - 6, 3, 1, WATER_L, z + 0.2, { cast: 0 }); px.rect(x - 7, y - 3, 14, 1, GUN_L, z + 0.1, { n: N_F, cast: 0 });
};
// a tilting post: a green kite on one arm, a sandbag on the other
const quintain = (px, x, y, z) => {
  beam(px, x - 8, y, x - 1, y - 10, 2, OAK, z, { grain: false }); beam(px, x + 8, y, x + 1, y - 10, 2, OAK, z, { grain: false, same: true });
  beam(px, x, y, x, y - 26, 4, OAK, z + 0.1, { grain: false });
  beam(px, x - 12.5, y - 26, x + 12.5, y - 26, 3, OAK_D, z + 0.2, { grain: false });
  px.part(); px.rect(x - 2, y - 30, 4, 2, BRASS, z + 0.3, { n: N_TOP });
  kite(px, x - 11, y - 24.5, 8, 13, z + 0.4, 0);
  px.part(); px.line(x + 11.5, y - 24, x + 11.5, y - 19, MANE, z + 0.3, { cast: 0 }); px.ellipse(x + 11.5, y - 15, 4.2, 4.8, SACK, z + 0.4, { round: 0.9 });
};
// a butt: a straw target on two legs, rings in the livery, two bolts in it
const butt = (px, x, y, z) => {
  beam(px, x - 6.5, y, x - 1.5, y - 10, 2, OAK, z, { grain: false }); beam(px, x + 6.5, y, x + 1.5, y - 10, 2, OAK, z, { grain: false, same: true });
  px.part(); px.ellipse(x, y - 16.5, 9.6, 10, STRAW, z + 0.1, { round: 0.5 });
  for (const [r, m] of [[7.6, CREAM], [5.6, GUN], [3.8, GREEN], [1.9, BRASS]]) px.ellipse(x, y - 16.5, r * 0.94, r, m, z + 0.2 + (8 - r) * 0.01, { round: 0.15, cast: 0 });
  px.part(); px.line(x - 2, y - 18, x - 8, y - 22, OAK_D, z + 0.4, { cast: 0 }); px.dot(x - 8.5, y - 22.5, CREAM, z + 0.5, { fix: 4, cast: 0 }); px.dot(x - 9.5, y - 22.5, CREAM, z + 0.5, { fix: 3, cast: 0 });
  px.line(x + 2, y - 14, x + 8, y - 12, OAK_D, z + 0.4, { cast: 0 }); px.dot(x + 8.5, y - 12.5, CREAM, z + 0.5, { fix: 4, cast: 0 });
};
// a pavise: the tall shield a crossbowman shelters behind, propped on a stay
const pavise = (px, x, y, z, i) => {
  y -= i % 2;                                                        // the row is not dressed to a line
  beam(px, x + 1, y - 14, x + 4, y, 2, OAK_D, z - 0.1, { grain: false });
  px.part(); px.poly([[x - 2, y - 19], [x + 2, y - 19], [x + 3, y - 17], [x + 3, y], [x - 3, y], [x - 3, y - 17]], GREEN, z, { round: 0.8 });
  px.rect(x - 2, y - 18, 4, 1, BRASS, z + 0.1, { n: N_F, cast: 0 }); px.rect(x - 3, y - 2, 6, 1, BRASS, z + 0.1, { n: N_F, cast: 0 });
  for (let j = 16; j > 3; j--) px.dot(x, y - j, CREAM, z + 0.1, { cast: 0 });
  px.rect(x - 1.5, y - 11 - (i % 2), 3, 3, BRASS, z + 0.2, { n: N_F, cast: 0 });
};
// the Crossbow Company's rack on the wall: a dark board, a brass rail, two crossbows
const crossbowRack = (px, x, y, w, h, z) => {
  face(px, x, y, w, h, GUN_D, z, N_F, null, { shade: (xx, yy) => (yy < y + 1 ? 0 : xx > x + w - 1.5 ? -1 : 0) });
  face(px, x, y, w, 1, BRASS, z + 0.05, N_F, null, { same: true, cast: 0 });
  for (const cy of [y + 5, y + h - 4]) {
    const cx = x + w / 2;
    px.part(); px.line(cx - 5.5, cy, cx + 5, cy, mat("#7a5a3a"), z + 0.1, { cast: 0 }); px.dot(cx + 3.5, cy, BRASS, z + 0.2, { cast: 0 });
    for (const [dx, dy] of [[2, -3], [3, -2], [4, -1], [4, 0], [4, 1], [3, 2], [2, 3]]) px.dot(cx + dx + 0.5, cy + dy + 0.5, GUN_L, z + 0.2, { cast: 0, fix: 3 });
  }
};
const posy = (px, x, y, seed) => { for (let i = 0; i < 4; i++) { const fx = x + (hash(seed, i) - 0.5) * 8, fy = y + (hash(seed, i + 5) - 0.5) * 3; px.dot(fx, fy, flat("#e8e4d8"), -40, { noLine: true }); px.dot(fx, fy + 1, flat("#4f8a3c"), -40, { noLine: true }); } };
// darken or lighten a patch of what is already drawn (trodden earth, a swept lane)
const patch = (px, cx, cy, rx, ry, d) => { for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) px.tone(i + 0.5, j + 0.5, d); };

// the numbers every form is built on (halls/garrison.js `dims` and `roofOf`, in art pixels)
const dimsOf = (level, br, r4) => {
  const hw = r4 === "ba" ? 12.5 : r4 ? 14.5 : br ? 14 : [11, 12.5, 13.5][level - 1];
  const wallH = r4 ? 15 : br ? 14 : 11 + level, grown = level >= 3 || !!br;
  const roofH = 11 + level + (br ? 2 : 0) + (br === "b" ? 1 : 0);
  return { hw, W: 2 * hw, wt: 10 - 2 * wallH, wb: 10 - 2 * (grown ? 4 : 3), rh: 2 * roofH, grown };
};
const FIRE = [-11, 24], PAV = [-11, 27], KIT = [17, 25];
const FLAG = { base: "#a04a3f", a: "#e8d47a", b: "#4f8f58" };

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const st = STYLES[o.style || "B"], level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null;
  const pal = br === "a", ber = br === "b", seed = (o.seed || 0) * 7 + level;
  const { hw, W, wt, wb, rh, grown } = dimsOf(level, br, r4), rt = wt - rh;
  const E = 2 * (hw + 4), rw = 2 * hw * (ber ? 0.5 : 0.35);
  const fire = grown && r4 !== "ba" && r4 !== "bb";
  const live = [], lights = [];

  // ---- the ground: the earth bed and the trodden yard before the door
  back.part(); back.ellipse(0, 17, Math.min(37, W + 9), 13, ber ? EARTH_B : EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  patch(back, 0, 21, 20, 7, 1);
  if (r4 === "ab") for (let a = 0; a < Math.PI * 2; a += 0.03) back.dot(Math.cos(a) * 32, 18 + Math.sin(a) * 11, RING, -49, { noLine: true, cast: 0 });   // the gold ring the runes turn on
  if (r4 === "ba") {                                                                    // hoof-churned earth and scraps of straw
    for (const [x, y, r] of [[-22, 21, 9], [-10, 25, 7], [12, 22, 8], [23, 26, 6], [4, 28, 5]]) patch(back, x, y, r, r * 0.4, -2);
    for (const [x, y] of [[-30, 20], [-14, 19], [-19, 22], [-5, 24], [11, 27], [20, 24]]) { back.dot(x, y, flat("#d8b868"), -49, { noLine: true }); back.dot(x + 1, y, flat("#d8b868"), -49, { noLine: true }); back.dot(x + 2, y, flat("#d8b868"), -49, { noLine: true }); }
  }
  if (r4 === "bb") { patch(back, 10, 27, 19, 4, 1); for (const [x, y] of [[7, 29], [13, 30], [26, 28]]) { back.dot(x, y, CREAM, -49, { noLine: true, fix: 3 }); back.dot(x + 1, y, OAK, -49, { noLine: true }); back.dot(x + 2, y, OAK, -49, { noLine: true }); } }
  if (fire) patch(back, FIRE[0], FIRE[1] + 1, 12, 5, -1);                                // ash and scorch

  // ---- behind the hall: the palisade, the turret, the keep or the watch platform (only their crowns show over the roof)
  if (grown && !ber) {
    const d = (wt / 2 + 2 - 3) / 13, half = 2 * (18 * Math.sqrt(Math.max(0, 1 - d * d)) - 2);
    palisade(back, 2, wt - 8, half, seed, -20, pal ? mat("#8a7a5a") : OAK, pal ? mat("#6c5f46") : OAK_D);
    const keep = r4 === "aa", tx = -(W - 6), th = keep ? 68 : 48, top = wt - th + 16, capH = keep ? 26 : 20;
    turret(back, tx, top, wt + 16, keep ? 11 : 8, pal ? PALE : GREY, pal ? PALE_W : mat("#b0aa9c"), keep ? GOLD : pal ? SLATE : TILE, capH, -15, st, seed + 4);
    if (keep) { back.part(); back.rect(tx - 1, top + 1 - capH - 6, 2, 8, GOLD, -14, { n: N_F }); back.ellipse(tx, top - capH - 6, 2, 2, GOLD, -13.9, { round: 0.9 }); back.rect(tx - 1.5, top + 22, 3, 8, st.lit ? WARM : DARK, -14.7, { cast: 0 }); }
    if (st.moss && !pal) ivy(back, tx - 5, top + 40, 16, -14, { seed: seed + 2, side: 1, spread: 2 });
  }
  if (ber && !r4) {
    const tx = -(W - 6), top = wt - 32;
    turret(back, tx, top, wt + 16, 8, GUN_ST, GUN_L, GREEN, 20, -15, st, seed + 4);
    back.part(); back.rect(tx - 1, top - 23, 2, 6, BRASS, -14, { n: N_F }); back.rect(tx - 2.5, top - 20, 5, 2, BRASS, -14, { n: N_F });
  }
  if (r4 === "bb") {
    // the watch platform: a square gunmetal tower, a lit slit, a crenellated deck, the company's banner
    const tx = -(W - 5), top = wt - 42;
    face(back, tx - 9, top, 14, 58, GUN_ST, -15, N_F, stones(seed + 4, 5, 7), { shade: (x, y) => (y < top + 6 ? -1 : 0) });
    face(back, tx + 5, top, 4, 58, GUN_ST, -15, N_E, null, { same: true });
    back.part(); back.rect(tx - 3, top + 25, 3, 7, st.lit ? WARM : DARK, -14.8, { cast: 0 }); back.rect(tx - 3, top + 25, 1, 7, DARK, -14.7, { cast: 0 });
    face(back, tx - 12, top - 2, 24, 5, GUN_L, -14.5, N_F, null, { shade: (x, y) => (y < top - 1 ? 1 : y > top + 2 ? -1 : 0) });
    for (let i = 0; i < 4; i++) face(back, tx - 12 + i * 6.6, top - 9, 4.4, 7, GUN_L, -14.4, N_F, null, { shade: (x, y) => (y < top - 8 ? 1 : 0) });
    wallBanner(back, tx - 2, top + 7, 8, 14, GREEN, BRASS, -14, { device: BOLT, deviceY: 3, tail: "point" });
  }

  // ---- the walls on their stone footing
  const shade = eaveShade(wt);
  if (pal) face(back, -W, wt, 2 * W, wb - wt, PALE_W, 0, N_F, stones(seed, 7, 12), { shade });
  else if (ber) {
    // dark timber above, gunmetal stone below, a brass band under the eaves
    face(back, -W, wt, 2 * W, wb - wt - 9, ERR_T, 0, N_F, boards(seed, 6), { shade });
    face(back, -W, wb - 9, 2 * W, 9, GUN_ST, 0, N_F, stones(seed + 2, 5, 9), { same: true, shade: (x, y) => (y < wb - 8 ? 1 : 0) });
    face(back, -W, wt + 5, 2 * W, 2, BRASS, 0.1, N_F, null, { cast: 0, shade: (x) => (x > W * 0.5 ? -1 : 0) });
  } else if (level === 1) face(back, -W, wt, 2 * W, wb - wt, TIMBER, 0, N_F, boards(seed, 6), { shade });
  else {
    // wattle and daub between oak framing
    face(back, -W, wt, 2 * W, wb - wt, DAUB, 0, N_F, (u, v) => (hash(Math.floor(u / 3), Math.floor(v / 2), seed) > 0.9 ? -1 : 0), { shade });
    for (const fx of [-W + 1.5, W - 1.5]) beam(back, fx, wt + 2, fx, wb, 3, OAK, 0.3, { grain: false });
    for (const fx of [-W * 0.45, W * 0.45]) beam(back, fx, wt + 2, fx, wb, 2, OAK, 0.3, { grain: false });
    beam(back, -W, wt + 3.5, W, wt + 3.5, 3, OAK, 0.3, { grain: false }); beam(back, -W, wb - 1, W, wb - 1, 2, OAK_D, 0.3, { grain: false });
    beam(back, -W + 3, wb - 2, -W * 0.45 - 2, wt + 6, 2, OAK, 0.25, { grain: false }); beam(back, W - 3, wb - 2, W * 0.45 + 2, wt + 6, 2, OAK, 0.25, { grain: false });
  }
  const footM = pal ? PALE_F : ber ? GUN : GREY;
  face(back, -(W + 4), wb, 2 * W + 8, 10 - wb, footM, 0.5, N_F, stones(seed + 1, 4, 9), { shade: (x, y) => (y < wb + 1 ? 1 : y > 9 ? -1 : x > W ? -1 : 0) });
  if (st.moss && !ber) ivy(back, W - 1, 9, pal ? 14 : 18, 1.4, { seed: seed + 3, side: -1, spread: 2.4 });

  // ---- the door (the knights' way out) on its step, and what hangs on the wall round it
  const dh = ber ? 17 : Math.min(wb - wt - 1, 21);
  door(back, 0, wb, 14, dh, pal ? PALE : ber ? GUN_L : OAK_D, ber ? GREEN_D : DOOR, IRON, 1, { vous: pal, mRing: ber ? BRASS : undefined });
  face(back, -10, wb, 20, 3, footM, 1.2, N_TOP, null, { cast: 0 });
  if (!pal && !ber) {
    // the kingdom's shield beside the door
    kite(back, -Math.round(hw * 1.44), wt + 7, 10, 13, 1.5, 0, RED, mat("#c86a5a"));
    for (let i = -2; i <= 2; i++) { back.dot(-Math.round(hw * 1.44) + i, wt + 11.5, CREAM, 1.8, { cast: 0 }); back.dot(-Math.round(hw * 1.44), wt + 11.5 + i * 1.4 + 1, CREAM, 1.8, { cast: 0 }); }
    if (level >= 2) { torch(back, 10, -12, 1.5); live.push({ kind: "flame", x: 10, y: -12, w: 4, h: 7 }); lights.push({ key: "torch", x: 10, y: -15, r: 13, col: "#ffa040", a: 0.45 }); }
  }
  if (ber && !r4) [-24.5, -17.5, -10.5].forEach((sx, i) => kite(back, sx, wt + 8, 7, 13, 1.5, i + seed));   // three kites left of the door
  if (r4 === "ba") {
    kite(back, 16.5, wt + 8, 8, 13, 1.5, seed + 1);
    torch(back, -11, -10, 1.6); live.push({ kind: "flame", x: -11, y: -10, w: 5, h: 8 });     // a door torch for the Lancers' hall
    lights.push({ key: "torch", x: -11, y: -13, r: 19, col: "#ffa040", a: 0.85 });   // brighter (owner, 2026-11-22)
  }
  if (r4 === "bb") {
    wallBanner(back, -16.5, wt + 8, 9, 14, GREEN, BRASS, 1.5, { device: BOLT, deviceY: 3, tail: "point" });
    crossbowRack(back, 10, wt + 8, 17, 14, 1.5);
    // two door torches, each its own light (owner, 2026-11-22: "the two torches on the last one should look brighter")
    for (const s of [-1, 1]) { torch(back, s * 9.5, -18, 1.6); live.push({ kind: "flame", x: s * 9.5, y: -18, w: 5, h: 8 }); lights.push({ key: "torch", x: s * 9.5, y: -21, r: 18, col: "#ffa040", a: 0.85 }); }
  }
  if (pal) for (const s of [-1, 1]) wallBanner(back, Math.round(s * hw * 1.24), wt + 8, 9, 16, r4 === "aa" ? PALE_W : BLUE, GOLD, 1.5, { device: SUN, deviceY: 4, tail: "point" });

  // ---- the roof
  if (r4 === "ab") {
    // the basilica: a short pale roof with a gilt eave, crowned by a golden dome on a drum
    hipRoof(back, { eave: wt, E: 2 * (hw + 3), rw: 2 * hw * 0.4, h: 18, m: PALE_W, z: 5, seed, D: 7, fascia: GOLD });
    back.part(); back.poly([[-14, wt - 28], [14, wt - 28], [14, wt - 15], [-14, wt - 15]], PALE_W, 5.5, { round: 0.85 }); back.toneLine(-14, wt - 16.5, 14, wt - 16.5, -1);
    const arc = []; for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += Math.PI / 24) arc.push([Math.cos(a) * 16, wt - 26 + Math.sin(a) * 18]);
    back.part(); back.poly(arc, GOLD, 5.8, { round: 0.92, ny: -0.25 });
    back.toneLine(-8, wt - 41, -9, wt - 27, -1); back.toneLine(6, wt - 42, 7, wt - 27, -1); back.toneLine(-15, wt - 26.5, 15, wt - 26.5, -1); back.toneLine(-9, wt - 39, -5, wt - 42, 1);
    back.part(); back.rect(-1, wt - 58, 2, 15, GOLD, 5.9, { n: N_F }); back.ellipse(0, wt - 60, 3, 3, GOLD, 6, { round: 0.9 });
    lights.push({ key: "dome", x: 0, y: wt - 40, r: 24, col: "#f8e08a" });
  } else {
    hipRoof(back, { eave: wt, E, rw, h: rh, m: pal ? SLATE : ber ? GREEN : TILE, z: 5, seed });
    if (pal || ber) face(back, -rw - 2, rt - 3, 2 * rw + 4, 3, pal ? GOLD : BRASS, 6, N_TOP, null, { shade: (x, y) => (y > rt - 1 ? -1 : 0) });   // the gilt ridge
  }
  if (pal) {
    // the rose window over the door
    back.part(); back.ellipse(0, wt - 2, 7.4, 7.4, PALE_W, 6.2, { round: 0.4 });
    for (let j = -6; j < 6; j++) for (let i = -6; i < 6; i++) {
      const x = i + 0.5, y = j + 0.5; if (x * x + y * y > 30) continue;
      const q = (x > 0 ? (y > 0 ? 0 : 3) : (y > 0 ? 1 : 2)), bar = Math.abs(x) < 1 || Math.abs(y) < 1;
      put(back, x, wt - 2 + y, bar ? PALE : PANES[q], 6.3, [0, 0, 1], { cast: 0, bias: bar ? -1 : 0 });
    }
    lights.push({ key: "rose", x: 0, y: wt - 2, r: 13, col: "#f8e8a0", a: 0.8 });
  }
  if (ber) {
    crown(back, 0, wt + 4, 6.2);                                                                         // the order's crown over the door
    if (r4 === "ba") [-1, 1].forEach((s, i) => lance(back, s * (rw + 3), rt + 6, rt - 22 + i * 4, 4.5)); // lances at the ridge ends
    else for (const s of [-1, 1]) crossedSwords(back, s * (rw + 3), rt + 3, 6.4);
  }
  if (!ber && r4 !== "ab") chimney(back, hw, Math.round(wt - rh * 0.55), pal ? PALE : CHIM, 6, seed + 6);

  // ---- the Lancers' stable, in front of the hall's left end
  if (r4 === "ba") stable(back, -23, 12, 8, seed);

  // ---- the yard: everything stands on open ground in front of the footing
  if (fire) { campfire(back, FIRE[0], FIRE[1], 12, seed); live.push({ kind: "flame", x: FIRE[0], y: FIRE[1] - 1, w: 6, h: 9 }); lights.push({ key: "torch", x: FIRE[0], y: FIRE[1] - 5, r: ber ? 22 : 20, col: "#ffa040", a: ber ? 0.9 : 0.7 }); }   // the green path's campfire a touch brighter
  if (r4 === "ba") { trough(back, -24.5, 22.5, 11); hayBale(back, -11, 20.5, 9, 6.5, 10.5); quintain(back, KIT[0], KIT[1], 12); }
  else if (r4 === "bb") { [-18.5, -11, -3.5].forEach((x, i) => pavise(back, x, PAV[1], 12 + i * 0.1, i)); butt(back, KIT[0], KIT[1], 12); }
  else if (ber) rack(back, KIT[0], KIT[1], GREEN, 12);
  else if (r4 === "aa") { hammer(back, KIT[0] - 1, KIT[1], 12, seed); lights.push({ key: "hammer", x: KIT[0] - 1, y: -40, r: 22, col: "#f8e8a0" }); }
  else if (!pal && level >= 2) rack(back, KIT[0], KIT[1], RED, 12);
  else if (pal) rack(back, KIT[0], KIT[1], GOLD, 12);
  if (!pal && !ber && level === 1) { dummy(back, KIT[0], KIT[1] + 1, 12); posy(back, -12, 26, seed); }
  if (!pal && !ber && level === 2) dummy(back, FIRE[0], KIT[1] + 1, 12);
  if (pal && r4 !== "aa") posy(back, 28, 24, seed);

  // ---- what moves: the standard on the ridge (the Lancers fly two long pennons from their lances instead)
  const flag = FLAG[br || "base"];
  if (r4 === "ba") [-1, 1].forEach((s, i) => live.push({ kind: "pennant", x: s * (rw + 3), y: rt - 22 + i * 4 + 8, col: "#2f6b3f", pole: 0, len: 23, h: 7, swallow: true }));
  else live.push({ kind: "pennant", x: 0, y: r4 === "ab" ? wt - 44 : rt + 1, col: flag, pole: 17, len: 13 });
  return { live, lights, crew: [], shadow: { rx: W + 10, ry: 8, dx: 7, dy: 13 } };
};
