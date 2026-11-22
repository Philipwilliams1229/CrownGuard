// ============ PIX HALL: the Powder Works, all nine forms ============
// The powder store the game draws while "New sprites" is on (render/halls/gunpowder.js asks
// for it through pix/halls.js); the old painter stays under the switch. Treatment B: thin
// tinted line, one sun, the stonework stone by stone as tone, the deck board by board, a
// hooded lamp that lights the magazine door.
//
// THE TWO MEN DECIDE THE BUILDING. The hall file stands the bombardier 5.5 units back from
// the middle and the musketeer 6.5 units out toward the road, both with their feet 2.5 units
// above the deck's front edge, and the deck's front edge is 9 + level units above the anchor
// (engine/muzzles.js reads the same numbers for the muzzle and the throwing hand). So, in
// ART PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y), y down: the deck's
// front edge is at D = -18 - 2 level, the men's feet at (-11, D - 5) and (13, D - 5), the
// store's front face runs from D down to +8 and is 24 px to each side (26 from level two).
// Every part below is today's part at today's place (the old numbers x2).
//
// THE STORE NEVER TURNS, but it is built facing the road it watches: this picture is the
// store with the road to its EAST (door, rack and crate east; kegs, mortars and the pennant
// west). For a store that faces west the hall file bakes it with `flip` and draws it
// mirrored, so the sun stays in the upper left; it tells this file so through the seed
// (seed 3..5 = the same stonework 0..2, baked for the mirror), because a few hand-set tones
// (the wall's lit and shaded ends, a door's reveal) must know which side the sun is on.
//
// The forms, as today's hall has them: rubble walls, a rope rail and one keg (1); coursed
// stone, a banded door, a timber rail and a pile of shot (2); dressed stone with quoins, a
// red magazine door with a gold flame under a hooded lamp, two kegs and a crate of
// cartridges (3). The Bombard Yard sets a bronze mortar before the store (a), the Grand
// Battery two with gilt bands under a crossed-guns banner (aa), Dragon's Breath chars the
// whole store, runs pitch down it, and burns a brazier beside an iron mortar (ab). The Long
// Muskets rack spare long guns on the deck (b), the Sharpshooters keep the full rack (ba:
// the scoped gun and its rest are the musketeer's own), the Grapeshot Crew heap grape bags
// at the corner (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the brazier's flame and the lamp's light (the spec's `live` and
// `lights`), the pennant (frames from `pennantOf`, stamped by the hall file so it streams
// off the rear corner whichever way the store faces), and everything the hall file paints
// itself (the two men, fuse, muzzle flash, smoke, the mortars' bark, the brazier's smoke).
import { mat, flat } from "./pix.js";
import { STYLES, drum, disc, beam, wallBanner, ivy, pennantFrames, hash, clamp } from "./hall-kit.js";

export const BOX = { w: 96, h: 144, ox: 48, oy: 108 };
export const LABEL = "Powder Works";

const tint = (h, k) => "#" + [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16); return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)).toString(16).padStart(2, "0"); }).join("");
const STONE_OF = { 1: "#8a8272", 2: "#948c7e", 3: "#a29a8a", dragon: "#544a46" };
export const FLAG_OF = { base: "#5a4a3c", a: "#a04a3f", b: "#3a4a6a", dragon: "#c8502a" };

const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_D = mat("#7c5832"), CHAR_W = mat("#4a3a30"), CHAR_WD = mat("#3a2c28");
const IRON = mat("#5c626e", { contrast: 1.2 }), IRON_D = mat("#3a3440", { contrast: 1.3 }), SHOT = mat("#4a4e58", { contrast: 1.4 });
const BRONZE = mat("#b8803e", { contrast: 1.35 }), BRONZE_D = mat("#7a5226", { contrast: 1.2 }), GOLD = mat("#d8b34a", { contrast: 1.3 });
const KEG = mat("#7a5634"), KEG_B = mat("#6e4c2e"), PITCH = mat("#2e2630", { contrast: 1.5 }), BED = mat("#6a4a2e");
const DOOR_W = mat("#5e4128"), DOOR_R = mat("#8e3a32"), DOOR_C = mat("#3a2c28"), BANNER = mat("#8a2e2a");
const GUN_W = mat("#5f4326"), GUN_S = mat("#8a909c", { contrast: 1.3 }), ROPE = mat("#c8b48a"), ROPE_D = mat("#8a744e"), SACK = mat("#b8a070"), GRAPE = mat("#6c727e", { contrast: 1.2 });
const EARTH = mat("#7c6242"), PAVE = mat("#a09684"), MOSS = mat("#5f8a44");
const DARK = flat("#2a2030"), MOUTH = flat("#1e1a20"), MOUTH_HOT = flat("#6a2a1a", { emis: true }), COALS = flat("#3a2420"), EMBER = flat("#e8703a", { emis: true });
const LAMP = flat("#f4c060", { emis: true }), LAMP_L = flat("#fff0b0", { emis: true }), MARK_R = flat("#c04a3a"), MARK_O = flat("#f08a3a"), FLAME_O = flat("#f08a3a");

// face normals that take the same tone whichever side the sun is baked on
const UP = [0, -0.8, 0.6], FRONT = [0, 0.06, 0.99];
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A flat face (any shape with one span a row) whose tone is worked pixel by pixel:
// fn(x, y) -> tone steps up or down (null leaves the pixel out), or [tone, nx] to turn the
// pixel's normal east or west as well (a wall's lit and shaded ends).
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
      const r = fn ? fn(i + 0.5, py) : 0; if (r == null) continue;
      const b = typeof r === "number" ? r : r[0], v = typeof r === "number" ? 0 : r[1];
      const nn = v ? [v, n[1], Math.sqrt(Math.max(0.05, 1 - v * v - n[1] * n[1]))] : n;
      px._put(i + px.ox, j + px.oy, m, z, nn[0], nn[1], nn[2], { cast: o.cast ?? 1, floor: o.floor || 0, bias: (o.bias || 0) + b, noLine: o.noLine, edge: o.edge });
    }
  }
  return px;
};

// ---- the store's front face -----------------------------------------------------------------
// Stone by stone as tone: courses `ch` high, blocks `bw` long in a running bond; a stone a
// tone up or down (`vary`: rubble a lot, dressed stone hardly), broken mortar under it and
// on its far side (`joint`), a bevel toward the sun. Whole STONES, not pixels, take the
// wall's lit end and its shaded end, so the two bands follow the bond and never read as stripes.
const wall = (px, HW, D, lvl, m, seed, sun) => {
  const ch = lvl === 1 ? 6 : lvl === 2 ? 7 : 8, bw = lvl === 1 ? 9 : lvl === 2 ? 13 : 17;
  const vary = lvl === 1 ? 0.24 : lvl === 2 ? 0.16 : 0.09, joint = lvl === 1 ? 0.7 : lvl === 2 ? 0.8 : 0.94;
  const streak = [0, 1, 2].map((i) => Math.round(-HW + 5 + hash(seed, i, 41) * (2 * HW - 10)));   // rain off the plate's joints
  face(px, box(-HW, D, 2 * HW, 8 - D), m, 0, FRONT, (x, y) => {
    const yy = y - D, c = Math.floor(yy / ch), off = (c & 1) * bw * 0.5 + Math.floor(hash(c, seed) * 3), k = Math.floor((x + off) / bw);
    const fy = yy - c * ch, fx = x + off - k * bw, hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
    const far = sun < 0 ? fx >= bw - 1 : fx < 1, near = sun < 0 ? fx < 1 : fx >= bw - 1;
    let b = 0;
    if (hv < vary) b -= 1; else if (hv > 1 - vary * 1.15) b += 1;
    if ((fy >= ch - 1 || far) && hm < joint) b -= 1;
    else if ((fy < 1 || near) && hv > 0.5) b += 1;
    // which end of the wall this stone belongs to (by its middle)
    const u = (clamp((k + 0.5) * bw - off, -HW, HW) / HW) * sun;
    let nx = 0;
    if (u > 0.4) { nx = sun * 0.25; b = clamp(b, -1, 0); }             // the lit end is never cut up
    else if (u < -0.72) { nx = -sun * 0.78; b = clamp(b, -1, 0); }     // the shaded end stays quiet
    if (yy < 5.5) b -= 1;                                              // under the wall plate
    if (y > 6.5) b -= 1;                                               // it sits IN the ground
    if (lvl >= 2 && yy >= 5.5 && yy < 13 && streak.includes(Math.floor(x)) && hash(Math.floor(y), x, seed) > 0.25) b -= 1;
    return [clamp(b, -2, 1), nx];
  });
};
// level three's dressed corners: pale quoins, long and short, a shadow line under each
const quoins = (px, HW, D, m, sun) => {
  for (const sg of [-1, 1]) for (let i = 0; i < 4; i++) {
    const w = i % 2 ? 6 : 9, x0 = sg > 0 ? HW - w : -HW, y0 = D + 4 + Math.round(i * 7.2);
    const nx = sg === sun ? sun * 0.25 : -sun * 0.6;
    face(px, box(x0, y0, w, 6), m, 0.1, FRONT, (x, y) => [y >= y0 + 5 ? -1 : y < y0 + 1 ? 1 : 0, nx], { cast: 0 });
  }
};

// The magazine door in its arch: planks, the wall's thickness in shadow on the sunward
// jamb, a dressed surround. straps: rows (from the sill) of iron bands; flame: the gold
// (or burning) device of level three.
const magDoor = (px, cx, by, w, h, mS, mD, z, sun, o = {}) => {
  px.part();
  const hw = w / 2, inA = (xx, yy, k) => { const r = hw + k; return Math.abs(xx) <= r && yy <= 0 && yy >= -h - k && (yy >= -h - k + r || xx * xx + (yy + h + k - r) ** 2 <= r * r); };
  for (let j = -h - 3; j < 0; j++) for (let i = -hw - 3; i < hw + 3; i++) {
    const xx = i + 0.5, yy = j + 0.5;
    if (inA(xx, yy, 0)) {
      const reveal = !inA(xx + sun, yy - 1, 0), strap = (o.straps || []).includes(j);
      let bias = 0;
      if (!reveal && !strap && (i + 60) % 3 === 0) bias = -1;                       // the plank joints
      if (!reveal && !strap && xx * sun < -hw + 2.2) bias -= 1;                     // the far jamb, turned from the sun
      px._put(cx + i + px.ox, by + j + px.oy, reveal ? DARK : strap ? IRON : mD, z + 0.2, 0, 0.06, 0.99, { bias, cast: 0 });
    } else if (inA(xx, yy, 2)) {
      const a = Math.atan2(yy + h - hw, xx), vous = o.vous && Math.floor((a + 9) * 2.6) % 2 === 0;
      px._put(cx + i + px.ox, by + j + px.oy, mS, z + 0.1, sun * 0.3, yy < -h + 1 ? -0.5 : 0, 0.8, { bias: (vous ? 1 : 0) + (xx * sun < -hw ? -1 : 0), cast: 0 });
    }
  }
  if (o.ring) px.dot(cx - sun * (hw - 2.5), by - h * 0.45, IRON, z + 0.3, { fix: 4, cast: 0 });
  if (o.flame) {
    // a flame, tip up, two tones: rows from the tip down
    const rows = [[0, 0], [-1, 0], [-1, 1], [-2, 1], [-2, 1], [-1, 0]], y0 = by - h + 6;
    px.part();
    rows.forEach(([a, b], r) => { for (let i = a; i <= b; i++) px._put(cx + i + px.ox, y0 + r + px.oy, o.flame, z + 0.3, 0, 0, 1, { fix: (r >= 2 && r <= 4 && i >= -1 && i <= 0) ? 4 : 3, cast: 0 }); });
  }
};

// the hooded lamp over the magazine door: a bracket, an iron hood, a lit pane
const lamp = (px, cx, y, z) => {
  px.part(); px.rect(cx - 0.5, y, 1, 3, IRON_D, z, { n: FRONT, cast: 0 });
  px.part(); px.rect(cx - 3.5, y + 3, 7, 2, IRON_D, z + 0.1, { n: UP });
  px.rect(cx - 2.5, y + 5, 5, 4, IRON_D, z + 0.1, { n: FRONT });
  px.part(); px.rect(cx - 1.5, y + 5, 3, 3, LAMP, z + 0.2, { cast: 0 }); px.dot(cx - 0.5, y + 6, LAMP_L, z + 0.3, { cast: 0 });
};

// ---- what stands on the ground -------------------------------------------------------------------
// a keg on its end: staves, two iron hoops, its head seen from above; `mark`: the powder mark burnt on it
const keg = (px, x, y, r, h, m, z, mark) => {
  drum(px, { cx: x, top: y - h, bot: y - 1.5, r, r2: r - 0.5, sq: 0.36, m, z, st: STYLES.A, boards: 0.5, course: 99, skew: 0, strings: [[y - h + 1.6, 1.3, IRON], [y - 4.4, 1.3, IRON]] });
  disc(px, { cx: x, y: y - h, r: r - 0.7, sq: 0.36, m: m === PITCH ? IRON_D : OAK_D, z: z + 0.1 });
  if (mark) { px.part(); px.ellipse(x, y - h * 0.5, 1.9, 1.9, mark, z + 0.2, { cast: 0 }); px.dot(x + 1, y - h * 0.5 - 2.6, mark, z + 0.2, { cast: 0 }); }
};
const shot = (px, x, y, r, z) => { px.part(); px.ellipse(x, y - 1, r, r, SHOT, z, { round: 0.95 }); };
// a crate of cartridges: a framed front with one brace, its lid seen from above
const crate = (px, x, y, w, h, m, z) => {
  const x0 = x - w / 2, y0 = y - h;
  face(px, box(x0, y0, w, h), m, z, FRONT, (xx, yy) => {
    const fx = xx - x0, fy = yy - y0;
    if (fx < 1 || fx >= w - 1 || fy >= h - 1 || fy < 1) return fy < 1 ? 1 : -1;
    return Math.abs((fx - 1) / (w - 2) + (fy - 1) / (h - 2) - 1) < 0.1 ? -1 : 0;
  });
  face(px, [[x0 + 1, y0 - 2], [x0 + w - 1, y0 - 2], [x0 + w, y0], [x0, y0]], m, z, UP, null, { same: true });
};
// a bag of grape: a tied sack with the shot bulging through its weave
const sack = (px, x, y, z) => {
  px.part(); px.ellipse(x, y, 4, 4.4, SACK, z, { round: 0.95 });
  px.toneLine(x - 2.5, y + 2.5, x + 2.5, y + 2.5, -1);
  px.dot(x - 2, y - 0.5, GRAPE, z + 0.1, { cast: 0 }); px.dot(x + 1, y + 1.5, GRAPE, z + 0.1, { cast: 0 }); px.dot(x + 0.5, y - 2, GRAPE, z + 0.1, { cast: 0 });
  px.part(); px.rect(x - 1.5, y - 5.6, 3, 1.4, ROPE_D, z + 0.1, { n: FRONT, cast: 0 });
};
// A mortar on its wooden bed, mouth cocked toward the road (east in this picture): a round
// breech, a squat barrel with two bands, the bore seen a little from above.
const mortar = (px, mx, gy, z, m, mBand, mBed, mouth) => {
  face(px, box(mx - 10, gy - 6, 20, 6), mBed, z, FRONT, (x, y) => (y < gy - 5 ? 1 : y >= gy - 1 ? -1 : Math.floor(x - mx + 10) % 7 === 6 ? -1 : 0));
  face(px, [[mx - 9, gy - 8], [mx + 9, gy - 8], [mx + 10, gy - 6], [mx - 10, gy - 6]], mBed, z, UP, null, { same: true });
  const th = 0.35, cs = Math.cos(th), sn = Math.sin(th), cx = mx, cy = gy - 11.2;
  const R = (lx, ly) => [cx + lx * cs - ly * sn, cy + lx * sn + ly * cs];
  const quad = (x0, y0, x1, y1) => [R(x0, y0), R(x1, y0), R(x1, y1), R(x0, y1)];
  px.part();
  const [bx, by] = R(0, 1.6);
  px.ellipse(bx, by, 8.6, 6.8, m, z + 0.5, { round: 0.95, rot: th });
  px.poly(quad(-6.2, -9.2, 6.2, 1), m, z + 0.6, { round: 0.9 });
  px.part();
  px.poly(quad(-6.6, -7, 6.6, -5), mBand, z + 0.7, { round: 0.9, cast: 0 });
  px.poly(quad(-8, 0.8, 8, 2.6), mBand, z + 0.7, { round: 0.9, cast: 0 });
  px.part();
  const [ux, uy] = R(0, -9.4);
  px.ellipse(ux, uy, 6.6, 3, m, z + 0.8, { round: 0.5, rot: th, bias: 1 });
  px.ellipse(ux, uy + 0.2, 4.6, 1.9, mouth, z + 0.9, { rot: th, cast: 0 });
  px.part(); px.ellipse(mx - 0.8, gy - 9.6, 2, 2, IRON, z + 1, { round: 0.95 });           // the trunnion pin
};
// Dragon's Breath's brazier: three legs and an iron bowl of coals (its flame is live)
const brazier = (px, x, y, z) => {
  px.part();
  px.line(x - 4.4, y, x - 1.8, y - 7, IRON_D, z, { cast: 0 }); px.line(x + 4.2, y, x + 1.6, y - 7, IRON_D, z, { cast: 0 }); px.line(x, y + 1, x, y - 7, IRON_D, z, { cast: 0 });
  px.part(); px.poly([[x - 6, y - 11], [x + 6, y - 11], [x + 4, y - 6], [x - 4, y - 6]], IRON_D, z + 0.2, { round: 0.85 });
  px.part(); px.rect(x - 5, y - 12.5, 10, 1.5, COALS, z + 0.3, { cast: 0 });
  for (const dx of [-4, -1, 1, 3]) px.dot(x + dx, y - 12.5, EMBER, z + 0.4, { cast: 0 });
};

// ---- what the paths stand on the deck ------------------------------------------------------------
// the Grand Battery's banner: a pole at the rear corner, red cloth, crossed guns in gold over a ball
const battery = (px, D) => {
  px.part(); px.capsule(-22, D - 6, 1.6, -22, D - 72, 1.4, OAK, -6); px.dot(-22.5, D - 74, GOLD, -5.9, { fix: 4 }); px.dot(-22.5, D - 73, GOLD, -5.9, { fix: 3 });
  wallBanner(px, -13, D - 68, 14, 22, BANNER, GOLD, -6.2, { device: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"], deviceY: 5, fold: -2 });
  px.part(); for (const [dx, dy] of [[-1, 0], [0, 0], [-1, 1], [0, 1]]) px.dot(-13 + dx, D - 68 + 11 + dy, DARK, -5.8, { cast: 0 });
};
// the Long Muskets' rack: two posts and a bar, long guns leaning in it
const rack = (px, D, n) => {
  for (const x of [15, 26]) beam(px, x, D - 6, x, D - 40, 3, OAK, -6, { grain: false });
  beam(px, 12.5, D - 34, 28.5, D - 34, 3, OAK_D, -5.9, { grain: false });
  for (let i = 0; i < n; i++) {
    const gx = 17 + i * 4.4;
    px.part(); px.capsule(gx - 1, D - 8, 1.6, gx, D - 22, 1.3, GUN_W, -5.6 + i * 0.05, { cast: 0 });
    px.part(); px.capsule(gx, D - 22, 1, gx + 1.6, D - 50 - (i % 2) * 4, 0.9, GUN_S, -5.5 + i * 0.05, { cast: 0 });
    px.dot(gx - 0.5, D - 24, IRON_D, -5.4 + i * 0.05, { cast: 0 });                           // the lock
  }
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null;
  const lvl = br ? 3 : level, bomb = br === "a", musket = br === "b", dragon = r4 === "ab";
  const sun = (o.seed || 0) >= 3 ? 1 : -1, seed = ((o.seed || 0) % 3) * 7 + lvl;   // sun: the side of this picture the light comes from
  const D = -18 - 2 * lvl, HW = lvl >= 2 ? 26 : 24;
  const stoneHex = STONE_OF[dragon ? "dragon" : lvl], STONE = mat(stoneHex), STONE_L = mat(tint(stoneHex, 0.22));
  const WOOD = dragon ? CHAR_W : TIMBER, WOOD_D = dragon ? CHAR_WD : TIMBER_D, RAIL = dragon ? CHAR_W : OAK;

  // ---- the trodden ground, a few flags let into it ----
  back.part(); back.ellipse(0, 12, 36, 15, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  for (let i = 0; i < 16; i++) { const a = hash(seed, i, 3) * Math.PI * 2, d = Math.sqrt(hash(seed, i, 5)); back.tone(Math.cos(a) * d * 32, 12 + Math.sin(a) * d * 13, hash(seed, i, 7) > 0.5 ? 1 : -1); }
  for (let i = 0; i < (lvl >= 2 ? 7 : 5); i++) {
    const a = 0.25 + (i / 6) * 2.7 + hash(seed, i, 11) * 0.25, px_ = Math.cos(a) * 29, py_ = 13 + Math.sin(a) * 11;
    back.part(); back.ellipse(px_, py_, 2.6 + hash(seed, i, 13) * 1.6, 1.4, PAVE, -49, { round: 0.3, noLine: true, bias: hash(seed, i, 17) > 0.5 ? 0 : -1, cast: 0 });
  }
  if (dragon) {
    // soot trodden into the yard, and a puddle of spilled pitch
    for (let j = 3; j < 26; j++) for (let i = -34; i < 20; i++) if (((i + 8) / 24) ** 2 + ((j - 14) / 9) ** 2 < 1 - hash(i, j, seed) * 0.35) back.tone(i + 0.5, j + 0.5, -1);
    back.part(); back.ellipse(18, 23, 6.6, 2.2, PITCH, -48, { round: 0.6, cast: 0 }); back.dot(16, 22, PITCH, -47.9, { fix: 4, cast: 0 });
  }

  // ---- behind the men: what the finals raise from the back corners ----
  if (r4 === "aa") battery(back, D);
  if (musket) rack(back, D, r4 === "bb" ? 2 : 3);

  // ---- the deck: the store's plank roof, seen from above ----
  face(back, [[-HW + 3, D - 12], [HW - 3, D - 12], [HW + 1, D], [-HW - 1, D]], WOOD, -2, UP, (x, y) => {
    const r = Math.floor((y - D + 12) / 4), fy = y - D + 12 - r * 4;
    if (fy >= 3) return -1;                                                    // the joint between two boards
    const off = Math.floor(hash(r, seed, 23) * 18), k = Math.floor((x + off + 80) / 21), fx = x + off + 80 - k * 21;
    if (fx < 1) return -1;                                                     // a butt joint
    if (fx >= 2 && fx < 3 && fy >= 1 && fy < 2) return -2;                     // a nail head
    return hash(r, k, seed + 9) > 0.72 ? -1 : 0;                               // a board the weather has got at
  });
  // the back corner post: the pennant's socket
  beam(back, -(HW - 3), D - 7, -(HW - 3), r4 === "aa" ? D - 20 : D - 42, r4 === "aa" ? 4 : 2.6, RAIL, -1, { grain: false });
  if (r4 !== "aa") back.dot(-(HW - 3) - 0.5, D - 43.5, GOLD, -0.9, { fix: 3 });

  // ---- the store's front face ----
  wall(back, HW, D, lvl, STONE, seed, sun);
  if (lvl === 1) ivy(back, sun * (HW - 5), 7, 17, 0.3, { seed: seed + 2, side: -sun, spread: 3.4 });
  if (lvl <= 2) { back.part(); for (let i = 0; i < (lvl === 1 ? 9 : 6); i++) { const mx = -HW + 1 + hash(seed, i, 61) * (2 * HW - 3), my = 6 + (hash(seed, i, 67) > 0.6 ? -1 : 0); back.dot(mx, my, MOSS, 0.3, { cast: 0, bias: i % 3 ? 0 : -1 }); if (i % 2) back.dot(mx + 1, 6, MOSS, 0.3, { cast: 0 }); } }
  if (lvl >= 3) {
    quoins(back, HW, D, STONE_L, sun);
    face(back, box(-HW, D + 2, 2 * HW, 2), STONE_L, 0.1, FRONT, (x, y) => (y >= D + 3 ? -1 : 0), { cast: 0 });   // the lintel course under the plate
  }
  if (dragon) {
    // pitch runs down the stone, a bead at the end of each run
    for (const [dx, h] of [[-18, 12], [-7, 18], [17, 9], [22, 15]]) {
      back.part(); back.rect(dx, D + 2, 2, h, PITCH, 0.4, { n: FRONT, cast: 0 });
      back.ellipse(dx + 1, D + 2 + h, 1.7, 1.7, PITCH, 0.45, { round: 0.95, cast: 0 }); back.dot(dx + (sun < 0 ? 0 : 1), D + 2 + h - 1, PITCH, 0.5, { fix: 4, cast: 0 });
    }
  }
  // the wall plate: the deck's front edge, a heavy timber across the head of the wall
  face(back, box(-HW - 2, D - 2, 2 * HW + 4, 4), WOOD_D, 1, FRONT, (x, y) => (y < D - 1 ? 1 : y >= D + 1 ? -1 : Math.abs(x) > HW ? 1 : Math.floor(x + 80) % 17 === 0 && hash(Math.floor(x), seed) > 0.4 ? -1 : 0));
  // the door: plank at one, banded at two, the red magazine door with its gold flame at three
  magDoor(back, 9, 8, 12, 18, lvl >= 3 ? STONE_L : STONE, lvl >= 3 ? (dragon ? DOOR_C : DOOR_R) : DOOR_W, 0.2, sun, {
    straps: lvl >= 2 ? [-14, -5] : [], ring: lvl === 2, vous: lvl >= 3, flame: lvl >= 3 ? (dragon ? FLAME_O : GOLD) : null,
  });
  if (lvl >= 2) lamp(back, 9.5, D + 3, 0.6);

  // ---- on the ground before the store, back to front ----
  const things = [];
  const kegM = dragon ? PITCH : KEG;
  if (lvl >= 3) {
    things.push([10.8, (z) => keg(back, -29.6, 10.8, 4.8, 12, dragon ? PITCH : KEG_B, z, dragon ? null : MARK_R)]);
    things.push([16.8, (z) => keg(back, -24.8, 16.8, 5.2, 13, kegM, z, dragon ? MARK_O : MARK_R)]);
  } else things.push([14.8, (z) => keg(back, -27.2, 14.8, 5.2, 13, kegM, z, lvl >= 2 ? MARK_R : null)]);
  if (dragon) things.push([19, (z) => brazier(back, 24, 19, z)]);
  else if (r4 === "bb") for (const [x, y] of [[20.4, 13.2], [27.2, 13.6], [23.8, 8.8], [22.4, 18.4]]) things.push([y === 8.8 ? 13.7 : y, (z) => sack(back, x, y - 2, z)]);
  else if (lvl >= 3) things.push([18, (z) => crate(back, 24, 18, 12, 9, TIMBER_D, z)]);
  if (lvl >= 2 && !bomb) {
    const pile = lvl >= 3 ? [[-14, 23.6, 3.2], [-8, 24, 3.2], [-11, 20.8, 3]] : [[-16, 22, 3.2], [-10, 22.4, 3.2], [-13, 19.2, 3]];
    pile.forEach(([x, y, r], i) => things.push([y + (i === 2 ? 4 : 0), (z) => shot(back, x, y, r, z)]));
  }
  if (bomb) {
    const m = dragon ? IRON_D : BRONZE, band = r4 === "aa" ? GOLD : dragon ? IRON : BRONZE_D, bed = dragon ? CHAR_WD : BED, mouth = dragon ? MOUTH_HOT : MOUTH;
    for (const [mx, gy] of r4 === "aa" ? [[-17, 20], [6, 25]] : [[-16, 23]]) things.push([gy, (z) => mortar(back, mx, gy, z, m, band, bed, mouth)]);
    if (!r4) for (const [x, y] of [[3, 25], [8, 25.2]]) things.push([y, (z) => shot(back, x, y, 2.8, z)]);
  }
  things.sort((a, b) => a[0] - b[0]).forEach(([y, draw], i) => draw(3 + i * 1.2));

  // ---- the front rail, over the men's shins ----
  for (const x of lvl === 1 ? [-HW + 2, HW - 2] : [-HW + 2, 0, HW - 2]) beam(front, x, D + 1, x, D - 10, 3, RAIL, 10, { grain: false });
  if (lvl === 1) {
    // a rope, sagging between its two posts
    front.part();
    for (let i = -HW + 3; i < HW - 3; i++) {
      const t = (i + HW - 3) / (2 * HW - 6), y = D - 8.5 + Math.sin(t * Math.PI) * 2.2;
      front._put(i + front.ox, Math.floor(y + front.oy), ROPE, 10.1, 0, -0.5, 0.86, { cast: 0, bias: (i + 60) % 3 === 0 ? -1 : 0 });
      front._put(i + front.ox, Math.floor(y + 1 + front.oy), ROPE_D, 10.1, 0, 0.3, 0.95, { cast: 0 });
    }
  } else beam(front, -HW, D - 8.5, HW, D - 8.5, 3, RAIL, 10.2, { grain: false, bands: lvl >= 3 ? [0.1, 0.9] : null, bandM: IRON });

  // what moves, and what gives light
  const live = [], lights = [];
  if (lvl >= 2) lights.push({ key: "torch", x: 9.5, y: D + 10, r: lvl >= 3 ? 18 : 15, col: "#ffc060", a: lvl >= 3 ? 0.75 : 0.65 });
  if (dragon) { live.push({ kind: "flame", x: 24, y: 7, w: 6, h: 9 }); lights.push({ key: "torch", x: 24, y: 2, r: 26, col: "#ff9040", a: 0.8 }); }
  return {
    live, lights,
    // the two men, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [
      { fig: "bomber", x: -11, y: D - 5, dir: 1, clip: "idle" },
      { fig: "musketeer", x: 13, y: D - 5, dir: 1, clip: "idle", variant: r4 === "ba" ? "sharp" : r4 === "bb" ? "grape" : "plain" },
    ],
    shadow: { rx: 30, ry: 8, dx: 8, dy: 13 },
  };
};

// ---- what the hall stamps live ------------------------------------------------------------------
// The pennant on the rear corner post (the anchor is the pole's foot). The hall file stamps
// it itself, flying AWAY from the store whichever way the store faces: dir -1 flies it west.
const PENS = new Map();
export const PENNANT_N = 8;
export const pennantOf = (col, dir, i) => {
  const key = col + (dir < 0 ? "w" : "e");
  let fs = PENS.get(key);
  if (!fs) PENS.set(key, (fs = pennantFrames(col, { n: PENNANT_N, len: 17, h: 9, pole: 0, dir })));
  return fs[i % fs.length];
};
