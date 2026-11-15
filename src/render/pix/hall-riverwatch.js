// ============ PIX HALL: the River Watch, all nine forms ============
// The jetty the game draws while "New sprites" is on (render/halls/riverwatch.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, the deck plank by plank as tone, wet piles with weed at the waterline,
// shingles in lapping courses, the watch lantern lighting its post and the boards.
//
// THE WATCHMAN DECIDES THE JETTY. The hall file stands him at (-3, -9) (art pixels, two to a
// board unit, from the hall's ANCHOR, y down) and he is drawn after everything here, as he
// always was: the whole hall goes in the BACK picture and the front one stays empty. Every
// part below is today's part at today's place (old numbers x2). The deck's half-width grows
// as today's does (2 x hw = 20 / 21 / 22, 24 on a path), so the lantern post, the bell, the
// keg and the engines on the jetty's end move out with it exactly as the old ones do.
//
// The forms, as today's hall has them: a bare jetty on driven piles, a mooring post with the
// watch lantern and a rope coil (1); a back rail, an alarm bell on its frame and a keg (2); a
// stilted watch hut with a red roof at the back (3). The Harbour Patrol builds a boathouse
// with a skiff's nose in it and oars racked (a); the Crown Navy raises a mast with a crow's
// nest, a yard and a stay, faces the jetty in stone and mounts a bronze swivel gun (aa); the
// Harpooners mount a great harpoon gun on the jetty's end, spare irons against the boathouse
// (ab). The Fireship Wharf stacks pitch and keeps a cauldron over a fire (b); the Hellburner
// lights a beacon over marked powder kegs (ba); the Chain Boom winds a capstan whose chain
// runs down over the jetty's edge into the river (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the spec's `live` list (the pennant, the cauldron's fire, the
// beacon's flame), its `lights` ("lamp": the watch lantern, the hall pulses it; "fire": under
// the cauldron; "torch": the beacon), and what the hall file paints itself (the ripples round
// the piles, kept to the water; the smoke; the watchman; the bell's and the masthead's glints).
import { mat, flat } from "./pix.js";
import { STYLES, drum, disc, beam, hash, clamp } from "./hall-kit.js";

export const BOX = { w: 108, h: 150, ox: 54, oy: 128 };
export const LABEL = "River Watch";

const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER_L = mat("#a37a48");
const DECK = mat("#9a6e42"), DECK_D = mat("#73522f"), PILE = mat("#5a3e26"), WEED = mat("#6a8a5a"), WALL = mat("#835e38");
const IRON = mat("#4a4c56"), IRON_D = mat("#3a3a44"), IRON_L = mat("#8a909c", { contrast: 1.2 }), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const STONE = mat("#a19a8a");
const SHINGLE = mat("#4a6a8a"), NAVY = mat("#3a5a8a"), TILE = mat("#8e4d3e"), CREAM = mat("#e8e0c8");
const HULL = mat("#5a7aa0"), ROPE = mat("#b89a64"), ROPE_P = mat("#b8a070"), GOLD = mat("#d8b34a", { contrast: 1.2 }), BELL = mat("#d8b04a", { contrast: 1.25 });
const KEG = mat("#7a5634"), PITCHKEG = mat("#5a3a2a"), HOOP = mat("#2e2630"), CAULD = mat("#3a3440", { contrast: 1.3 }), CAPSTAN = mat("#6a6058"), CHAIN = mat("#3a3c46", { contrast: 1.3 });
const BRONZE = mat("#b08a4a", { contrast: 1.2 }), BRONZE_D = mat("#7a5a2a"), STAND = mat("#5a4a3a"), STOCK = mat("#6a4a2e"), MOSS = mat("#5f8a44"), OAR = mat("#a08458");
const DARK = flat("#2a2430"), WATER_IN = flat("#2c4250"), GLINT = flat("#6f97a8"), PITCH = flat("#1e1a22");
const LAMP = flat("#ffd070", { emis: true }), LAMP_HOT = flat("#fff3d2", { emis: true }), COAL = flat("#d8582a", { emis: true }), COAL_L = flat("#f4a040", { emis: true });
const FLAG_OF = { base: "#4a5a7c", a: "#3a5a8a", aa: "#3a5a8a", ab: "#8a6a4a", b: "#a04030", ba: "#a04030", bb: "#6a6058" };

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
      px._put(i + px.ox, j + px.oy, m, z, n[0], n[1], n[2], { cast: o.cast ?? 1, floor: o.floor || 0, bias: (o.bias || 0) + b, noLine: o.noLine, edge: o.edge });
    }
  }
  return px;
};
// stonework as tone on a flat wall: courses `ch` high, blocks `bw` long in a running bond
const stones = (seed, ch, bw) => (x, y) => {
  const c = Math.floor(y / ch), off = (c & 1) * bw * 0.5 + Math.floor(hash(c, seed) * 3), k = Math.floor((x + off) / bw);
  const fy = y - c * ch, fx = x + off - k * bw, hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
  let b = 0;
  if (hv < 0.16) b -= 1; else if (hv > 0.8) b += 1;
  if ((fy >= ch - 1 || fx >= bw - 1) && hm < 0.78) b -= 1;
  else if ((fy < 1 || fx < 1) && hv > 0.55) b += 1;
  return clamp(b, -2, 1);
};
// roofing as tone: rows `rh` deep from y0, each lapping the next; `sw` wide shingles
const courses = (seed, rh, sw, y0) => (x, y) => {
  const r = Math.floor((y - y0) / rh), fy = y - y0 - r * rh, off = (r & 1) * sw * 0.5 + Math.floor(hash(r, seed) * 2), k = Math.floor((x + off) / sw), fx = x + off - k * sw, hv = hash(r, k, seed);
  if (fy < 1 && r > 0) return -1;                                   // the shadow under the row above
  if (fx < 1) return hv > 0.35 ? -1 : 0;                            // the joint between two shingles
  return hv > 0.8 ? 1 : hv < 0.14 ? -1 : 0;
};

// ---- timber in the water ------------------------------------------------------------------------
// A driven pile, round in section: wet and dark for its last `wet` pixels, a line of weed where
// the river stands on it. o.bias: a pile in the deck's shade.
const pile = (px, cx, top, bot, r, z, o = {}) => {
  px.part();
  const wl = bot - (o.wet ?? 6);
  for (let j = Math.floor(top); j < Math.ceil(bot); j++) for (let i = Math.floor(cx - r); i < Math.ceil(cx + r); i++) {
    const x = i + 0.5 - cx, y = j + 0.5, u = x / r;
    if (Math.abs(u) >= 1) continue;
    let m = PILE, bias = o.bias || 0;
    if (o.wet !== 0 && y > wl + 2) bias -= 1;
    else if (o.wet !== 0 && y > wl) { m = WEED; bias = u > 0.2 ? -1 : 0; }
    else if (hash(i, Math.floor(j / 4), o.seed || 1) > 0.84) bias -= 1;         // a check in the grain
    const nx = clamp(u * 0.9 + 0.2, -0.98, 0.98);
    px._put(i + px.ox, j + px.oy, m, z, nx, -0.04, Math.sqrt(Math.max(0.04, 1 - nx * nx)), { bias, cast: 1 });
  }
};
// the deck's boards run front to back: a seam a board, a weathered board here and there, nail
// heads in a row at the back and the front. fire: the Wharf's scorched patches.
const deckTop = (seed, fire) => (x, y) => {
  const k = Math.floor((x + 60) / 6), fx = x + 60 - k * 6, hv = hash(k, seed, 11);
  let b = fx < 1 ? -1 : hv < 0.24 ? -1 : 0;
  if (fx >= 3 && fx < 4 && (Math.floor(y) === -13 || Math.floor(y) === -8)) b = -2;
  if (fire && ((x > 3 && x < 15 && y < -9) || (x > -19 && x < -12 && y > -12 && y < -7)) && hash(Math.floor(x), Math.floor(y), 5) > 0.3) b -= 1;
  return b;
};
const jetty = (px, w2, navy, fire, seed) => {
  for (const x of [-Math.round(w2 * 0.5), Math.round(w2 * 0.5)]) pile(px, x, -4, 8, 2.4, 0.3, { bias: -1, wet: 5, seed });   // the far row, in the deck's shade
  for (const x of [-w2 + 4, 0, w2 - 4]) pile(px, x, -6, 14, 2.9, 0.5, { seed: seed + x });
  face(px, [[-w2, -14], [w2, -14], [w2 + 2, -6], [-w2 - 2, -6]], DECK, 0, UP, deckTop(seed, fire));
  if (navy) face(px, box(-w2 - 3, -6, 2 * w2 + 6, 10), STONE, 1, FRONT, (x, y) => (y < -4.5 ? 1 : stones(seed + 3, 4, 9)(x, y + 4.5)));   // the Navy's quay face
  else {
    face(px, box(-w2 - 2, -6, 2 * w2 + 4, 6), DECK_D, 1, FRONT, (x, y) => (y < -5 ? 1 : (Math.floor(x + 60) % 11 === 0 ? -1 : 0) + (y > -1.2 ? -1 : 0)));
    px.part(); for (const x of [-w2 + 4, 0, w2 - 4]) px.dot(x, -3, IRON, 1.1, { cast: 0 });                                   // a bolt through the stringer into each pile
  }
};
const coil = (px, x, y, m, z) => {
  px.part(); px.ellipse(x, y, 4.8, 2.6, m, z, { round: 0.9 });
  for (let a = 0; a < 6.2; a += 0.7) px.tone(x + Math.cos(a) * 2.6, y + Math.sin(a) * 1.3, -1);
  px.dot(x, y, DARK, z + 0.05, { cast: 0 });
};

// ---- the mooring post (the Navy's mast) and the watch lantern on it --------------------------------
const lantern = (px, lx, z) => {
  const c = lx - 8;
  beam(px, lx - 12, -44.5, lx, -44.5, 3, OAK, z + 0.1, { grain: false });                    // its bracket
  px.part(); px.dot(c, -43, IRON_D, z + 0.2, { cast: 0 }); px.dot(c - 1, -43, IRON_D, z + 0.2, { cast: 0 });
  px.poly([[c - 2, -42], [c + 1, -42], [c + 4, -39], [c - 5, -39]], IRON_D, z + 0.3, { n: SLOPE });   // the cap
  px.part(); px.rect(c - 4, -39, 7, 6, LAMP, z + 0.3, { cast: 0 });                          // the horn panes, lit
  px.rect(c - 2, -38, 3, 3, LAMP_HOT, z + 0.35, { cast: 0 });
  px.part(); px.rect(c - 5, -33, 9, 2, IRON_D, z + 0.4, { n: LIT });                         // its foot
  for (const dx of [-5, 3]) for (let j = -39; j < -33; j++) px.dot(c + dx, j, IRON_D, z + 0.4, { cast: 0 });
};
const mooring = (px, lx, lvl) => {
  beam(px, lx, -9, lx, -48, 6, OAK, 3, lvl >= 2 ? { bands: [0.7], bandM: IRON } : {});
  face(px, box(lx - 3, -49, 6, 2), TIMBER_L, 3.05, UP, null);                                // its sawn top
  px.part(); for (let i = -3; i < 3; i++) { px.dot(lx + i, -17, ROPE, 3.1, { cast: 0, bias: i > 0 ? -1 : 0 }); px.dot(lx + i, -15, ROPE, 3.1, { cast: 0, bias: i > 0 ? -1 : 0 }); }   // a turn of the mooring line
  lantern(px, lx, 3);
};
const mast = (px, lx, stayTo) => {
  px.part(); px.line(lx + 1, -112, stayTo[0], stayTo[1], ROPE, 2.5, { cast: 0, noLine: true });   // stayed to the boathouse eave
  beam(px, lx, -9, lx, -104, 6, OAK, 3, { bands: [0.2, 0.55], bandM: IRON });
  beam(px, lx - 16, -88, lx + 16, -88, 3.4, OAK, 3.2, { grain: false });                     // the yard
  px.part(); px.rect(lx - 14, -86, 28, 2, CREAM, 3.15, { n: FRONT, cast: 0, bias: -1 });      // its sail, furled along it
  for (const dx of [-10, -3, 4, 11]) px.dot(lx + dx, -86, ROPE, 3.25, { cast: 0 });
  // the crow's nest: a staved tub with a gilt hoop, the topmast through it
  drum(px, { cx: lx, top: -106, bot: -97, r: 8, r2: 6.5, sq: 0.3, m: OAK, z: 3.5, st: STYLES.A, boards: 0.45, course: 99, strings: [[-103, 1.6, GOLD]] });
  disc(px, { cx: lx, y: -106, r: 8, sq: 0.3, m: OAK_D, z: 3.55 });
  beam(px, lx, -104, lx, -117, 4, OAK, 3.6, { grain: false });
  px.part(); px.rect(lx - 2, -120, 4, 3, GOLD, 3.7, { n: LIT }); px.dot(lx - 1, -121, GOLD, 3.7, { fix: 4 }); px.dot(lx, -121, GOLD, 3.7, { fix: 3 });   // the gilt truck
  lantern(px, lx, 3);
};

// ---- at the back ---------------------------------------------------------------------------------
// A roof seen from the south and above: its near slope up to a short ridge, shingled in courses,
// the west hip in the sun and the east one turned away, moss gathering toward the eave.
const roof = (px, cx, eave, apex, half, m, z, seed) => {
  face(px, [[cx - half, eave], [cx - 2, apex], [cx + 2, apex], [cx + half, eave]], m, z, SLOPE, (x, y) => {
    const t = (y - apex) / (eave - apex), e = 2 + (half - 2) * t, d = x - cx;
    if (d < -e + 2.2) return 1;
    let b = courses(seed, 4, 5, apex)(x, y);
    if (d > e - 2.4) b = -1; else if (d > e * 0.35) b -= 1;
    if (y > eave - 1 && d <= e - 2.4) b = Math.max(b, 0);
    return clamp(b, -2, 1);
  });
  px.part(); for (let i = 0; i < 6; i++) { const mx = cx + (hash(seed, i, 61) - 0.6) * half * 1.1, my = eave - 1.5 - hash(seed, i, 67) * 4; px.dot(mx, my, MOSS, z + 0.05, { n: SLOPE, cast: 0, bias: i % 2 ? 0 : -1 }); }
  face(px, box(cx - half, eave, half * 2, 2), OAK_D, z - 0.05, FRONT, (x, y) => (y < eave + 1 ? 0 : -1));   // the eave board
  px.part(); px.rect(cx - 1, apex - 3, 2, 3, OAK, z + 0.1, { n: LIT });                                     // a stub of a finial
};
const boards = (x0, seed, w = 5) => (x, y) => { const k = Math.floor((x - x0) / w); return x - x0 - k * w < 1 ? -1 : hash(k, seed, 3) > 0.68 ? 1 : 0; };
// the stilted watch hut: plank walls, a lamplit window between navy shutters, a red tiled roof
const hut = (px, hx, seed) => {
  for (const dx of [-12, 12]) pile(px, hx + dx, -32, -8, 2.2, -8, { wet: 0, seed });
  beam(px, hx - 11, -17, hx + 11, -29, 2, OAK_D, -8.2, { grain: false });                    // a brace between the stilts
  face(px, box(hx - 14, -50, 28, 20), WALL, -6, FRONT, (x, y) => (y > -32 ? -1 : boards(hx - 14, seed)(x, y) + (y < -45 ? -1 : 0)));
  px.part(); px.rect(hx - 4, -46, 8, 8, DARK, -5.8, { cast: 0 });
  px.rect(hx - 3, -45, 6, 6, LAMP, -5.75, { cast: 0 });
  for (let i = -3; i < 3; i++) px.dot(hx + i, -42, DARK, -5.7, { cast: 0 });
  for (let j = -45; j < -39; j++) px.dot(hx - 0.5, j, DARK, -5.7, { cast: 0 });
  for (const sx of [hx - 8, hx + 4]) face(px, box(sx, -46, 4, 8), NAVY, -5.7, LIT, (x, y) => (Math.floor(y) === -42 ? -1 : 0));
  face(px, box(hx - 5, -38, 10, 1), TIMBER_L, -5.6, UP, null, { cast: 0 });                   // the sill
  roof(px, hx, -48, -64, 19, TILE, -5, seed);
};
// the boathouse: open to the water, a skiff's nose in the dark, oars racked across its back
const boathouse = (px, bx, seed) => {
  face(px, box(bx - 14, -44, 28, 30), DARK, -9, FRONT, null, { cast: 0 });
  px.part();
  for (const y of [-40, -37]) { px.line(bx - 11, y, bx + 8, y, OAR, -8.95, { cast: 0, noLine: true, bias: -1 }); px.rect(bx + 8, y - 1, 4, 2, OAR, -8.95, { cast: 0, noLine: true, bias: -1 }); }
  px.part(); px.rect(bx - 14, -19, 28, 5, WATER_IN, -8.9, { cast: 0 });
  for (const [dx, dy] of [[-12, -17], [-11, -17], [11, -16], [12, -16], [-3, -15], [-2, -15], [5, -17]]) px.dot(bx + dx, dy, GLINT, -8.85, { cast: 0 });
  // the skiff's bow, pale blue with a white strake
  px.part(); px.poly([[bx - 10, -19], [bx - 8, -26], [bx, -32], [bx + 8, -26], [bx + 10, -19]], HULL, -8.5, { round: 0.85 });
  for (let i = -9; i < 9; i++) px.dot(bx + i, -22.5, CREAM, -8.4, { cast: 0, bias: i > 3 ? -1 : 0 });
  px.toneLine(bx - 0.5, -31, bx - 0.5, -24, 1);
  // its two walls, wet at the foot, and the lintel under the eave
  face(px, box(bx - 20, -46, 6, 32), WALL, -8, LIT, (x, y) => (y > -18 ? -2 : boards(bx - 20, seed, 3)(x, y)));
  face(px, box(bx + 14, -46, 6, 32), WALL, -8, FRONT, (x, y) => (y > -18 ? -2 : boards(bx + 14, seed + 1, 3)(x, y)));
  face(px, box(bx - 20, -44, 40, 3), OAK_D, -7.5, FRONT, (x, y) => (y > -42 ? -1 : 0));
  roof(px, bx, -44, -62, 26, SHINGLE, -7, seed);
  px.part(); px.poly([[bx - 5, -45], [bx, -52], [bx + 5, -45]], CREAM, -6.9, { n: SLOPE, cast: 0 });           // the Patrol's white gable mark
};
const rail = (px, w2) => {
  const xr = Math.round(w2 * 0.3);
  for (const x of [-w2 + 2, -xr, xr]) beam(px, x, -13, x, -23, 3, OAK, -3, { grain: false });
  beam(px, -w2 + 1, -22, xr + 2, -22, 2.6, TIMBER_L, -2.9, { grain: false });
};

// ---- the dressings on the deck -------------------------------------------------------------------
const bell = (px, w2) => {
  const p = w2 - 8, c = w2 - 2;
  beam(px, p, -10, p, -36, 3.4, OAK, 4, { grain: false });
  beam(px, p - 1, -35, c + 3, -35, 3, OAK, 4.1, { grain: false });
  px.part(); px.poly([[c - 2, -33], [c + 2, -33], [c + 3, -27], [c + 4.5, -24], [c - 4.5, -24], [c - 3, -27]], BELL, 4.2, { round: 0.85 });
  px.toneLine(c - 4, -25.5, c + 4, -25.5, -1);
  px.dot(c - 0.5, -23.5, IRON, 4.2, { cast: 0 });
};
const keg = (px, x, y, m, z, mark) => {
  drum(px, { cx: x, top: y - 11, bot: y - 1.5, r: 4.8, r2: 4.4, sq: 0.34, m, z, st: STYLES.A, boards: 0.5, course: 99, strings: [[y - 9.5, 1.2, HOOP], [y - 4, 1.2, HOOP]] });
  disc(px, { cx: x, y: y - 11, r: 4.4, sq: 0.34, m: mark ? m : OAK_D, z: z + 0.1 });
  if (mark) { px.part(); px.rect(x - 2, y - 8, 3, 3, CREAM, z + 0.2, { cast: 0 }); }                          // powder: a pale mark on the staves
};
const swivelGun = (px, w2) => {
  drum(px, { cx: w2 - 8, top: -16, bot: -9, r: 3.6, sq: 0.3, m: STAND, z: 5, st: STYLES.A, course: 99 });
  px.part(); px.capsule(w2 - 16, -17.5, 2.8, w2 + 2, -22, 2.2, BRONZE, 5.2);
  for (const [k, r] of [[0.14, 3], [0.9, 2.6]]) { const bx = w2 - 16 + 18 * k, by = -17.5 - 4.5 * k; for (let d = -r; d <= r; d++) px.dot(bx + d * 0.25, by + d, BRONZE_D, 5.25, { cast: 0 }); }
  px.dot(w2 + 3, -22.5, DARK, 5.3, { cast: 0 });
};
const harpoonGun = (px, w2) => {
  const p = w2 - 10;
  drum(px, { cx: p, top: -20, bot: -9, r: 4, sq: 0.3, m: IRON, z: 5, st: STYLES.A, course: 99 });
  beam(px, p, -25, p + 8, -38, 4, STOCK, 5.1, { grain: false });                              // the bow's two limbs
  beam(px, p, -25, p + 12, -15, 4, STOCK, 5.1, { grain: false });
  px.part(); px.line(p + 9, -38, p + 20, -29, ROPE, 5.05, { cast: 0, noLine: true }); px.line(p + 20, -29, p + 13, -15, ROPE, 5.05, { cast: 0, noLine: true });   // its string
  beam(px, w2 - 24, -22, w2 + 10, -30, 5.6, STOCK, 5.3, { bands: [0.3, 0.8], bandM: IRON });   // the stock
  px.part(); px.poly([[w2 + 7, -34.5], [w2 + 18, -32.6], [w2 + 8.6, -26.6]], STEEL, 5.5, { n: LIT });   // the barbed head
  px.toneLine(w2 + 9, -33.6, w2 + 16, -32.6, 1);
  coil(px, w2 - 4, -8.5, ROPE_P, 5.6);
};
const spareIrons = (px, bx) => {
  for (const [x0, x1] of [[bx + 23, bx + 21], [bx + 26, bx + 25]]) {
    px.part(); px.line(x0, -14, x1, -50, STOCK, -6.5, { cast: 0 });
    px.dot(x1, -51, STEEL, -6.4, { fix: 4, cast: 0 }); px.dot(x1, -52, STEEL, -6.4, { fix: 3, cast: 0 }); px.dot(x1 + 1, -50, STEEL, -6.4, { fix: 3, cast: 0 });
  }
};
const cauldron = (px, cx) => {
  px.part(); for (const dx of [-6, 5]) for (let j = -18; j < -8; j++) px.dot(cx + dx, j, IRON_D, 5, { cast: 0 });   // the trivet
  for (const [dx, m] of [[-3, COAL], [-1, COAL_L], [1, COAL], [2, COAL_L]]) px.dot(cx + dx, -9, m, 5.05, { cast: 0 });
  px.part(); px.ellipse(cx, -19.5, 8.8, 6.6, CAULD, 5.2, { round: 0.95 });
  px.part(); px.ellipse(cx, -24.4, 7.2, 2.4, CAULD, 5.3, { n: UP, bias: 1 }); px.ellipse(cx, -24.4, 5.8, 1.5, PITCH, 5.35, { cast: 0 });   // the rim, the pitch in it
  px.dot(cx - 2, -25, IRON_L, 5.4, { fix: 2, cast: 0 });
};
const beacon = (px, bx) => {
  beam(px, bx, -11, bx, -72, 4.8, OAK_D, 2, { bands: [0.3, 0.7], bandM: IRON });
  px.part(); px.poly([[bx - 10, -84], [bx + 10, -84], [bx + 5, -72], [bx - 5, -72]], IRON_D, 2.2, { round: 0.6 });   // the iron basket
  for (const dx of [-6, -1, 4]) px.toneLine(bx + dx + 0.5, -83, bx + dx * 0.5 + 0.5, -73, 1);
  px.toneLine(bx - 9, -83.5, bx + 9, -83.5, 1);
  for (let i = -7; i < 7; i++) px.dot(bx + i, -85, i % 3 ? COAL : COAL_L, 2.3, { cast: 0 });
};
const capstan = (px, cx) => {
  drum(px, { cx, top: -26, bot: -10, r: 8, r2: 7, sq: 0.32, m: CAPSTAN, z: 4, st: STYLES.A, course: 99, strings: [[-21, 2.6, CHAIN], [-15.5, 2.6, CHAIN]] });
  disc(px, { cx, y: -26, r: 8, sq: 0.32, m: CAPSTAN, z: 4.1 });
  beam(px, cx - 14, -27.6, cx + 14, -25.2, 3.2, OAK, 4.2, { grain: false });                  // its bars
  beam(px, cx - 5, -29.5, cx + 5, -23.5, 3, OAK, 4.25, { grain: false });
  px.part(); px.ellipse(cx, -26.6, 3, 1.6, IRON_L, 4.3, { cast: 0 });
};
// the boom chain: links by turns flat and edge-on, off the drum and down into the river
const chain = (px, x0, y0, x1, y1, z) => {
  px.part();
  const n = Math.round((y1 - y0) / 3.4);
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k);
    if (i % 2) for (let d = 0; d < 3; d++) px.dot(x, y + d, CHAIN, z, { fix: d ? 2 : 3, cast: 0 });
    else for (const [dx, dy, f] of [[-1, 0, 3], [0, 0, 3], [1, 0, 2], [-1, 1, 3], [1, 1, 1], [-1, 2, 2], [0, 2, 1], [1, 2, 1]]) px.dot(x + dx, y + dy, CHAIN, z, { fix: f, cast: 0 });
  }
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const lvl = br ? 3 : level, navy = r4 === "aa", fire = br === "b", seed = (o.seed || 0) * 7 + lvl;
  const w2 = 19 + lvl + (br ? 2 : 0), lx = -w2 + 4, bx = 6;       // twice the old hw; the lantern post; the boathouse's middle

  // at the back: what the jetty grows
  if (br === "a") boathouse(back, bx, seed);
  else if (lvl >= 3 && !fire) hut(back, 14, seed);
  if (r4 === "ab") spareIrons(back, bx);
  if (lvl >= 2 && br !== "a") rail(back, w2);
  jetty(back, w2, navy, fire, seed);

  // on the boards, back to front
  if (fire) for (const [x, y] of [[8, -11], [19, -11], [13.5, -22]]) keg(back, x, y, PITCHKEG, 2 - y * 0.01, r4 === "ba");
  if (r4 === "ba") beacon(back, -10);
  if (navy) mast(back, lx, [bx + 25, -45]); else mooring(back, lx, lvl);
  coil(back, lx + 7, -9.5, ROPE, 3.4);
  if (lvl >= 2 && !br) { bell(back, w2); keg(back, w2 - 17, -7, KEG, 4.5, false); }
  if (r4 === "bb") { capstan(back, 14); chain(back, 11, -15, 13, -1, 4.6); }
  if (r4 === "ab") harpoonGun(back, w2);
  if (navy) swivelGun(back, w2);
  if (fire && r4 !== "bb") cauldron(back, w2 - 10);

  // what moves: the pennant, the fires; the lantern's light on its post and the boards
  const live = [], lights = [{ key: "lamp", x: lx - 8, y: -36, r: 24, col: "#ffcf70", a: 0.8 }];
  if (navy) live.push({ kind: "pennant", x: lx + 2, y: -114, col: FLAG_OF.aa, pole: 0, len: 34, h: 6, swallow: true });      // the admiral's long pennant, off the masthead
  else if (br === "a") live.push({ kind: "pennant", x: bx, y: -64, col: FLAG_OF[key], pole: 12, len: 13, h: 6 });
  else live.push({ kind: "pennant", x: lx, y: -48, col: FLAG_OF[key], pole: lvl >= 2 ? 14 : 8, len: lvl >= 2 ? 14 : 11, h: 6, dir: -1 });
  if (fire && r4 !== "bb") { live.push({ kind: "flame", x: w2 - 10, y: -8, w: 7, h: 5 }); lights.push({ key: "fire", x: w2 - 10, y: -11, r: 20, col: "#ff9040", a: 0.8 }); }
  if (r4 === "ba") { live.push({ kind: "flame", x: -10, y: -84, w: 15, h: 20 }); lights.push({ key: "torch", x: -10, y: -90, r: 44, col: "#ff9a40", a: 0.8 }); }
  return {
    live, lights,
    // the watchman, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [{ fig: "stander", x: -3, y: -9, dir: 1, clip: "watch", variant: br ? "watch|" + br : "watch" }],
    // the dark of the water under the boards
    shadow: { rx: w2 + 4, ry: 6, dx: 5, dy: 11 },
  };
};
