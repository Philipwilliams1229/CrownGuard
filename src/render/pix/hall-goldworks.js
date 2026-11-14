// ============ PIX HALL: the Gold Works, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/goldworks.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, stone by stone as tone, a tiled roof, lit windows, a furnace that lights
// the wall.
//
// It is a HOUSE, not a round tower: a box seen a little from the east, so it shows a lit
// front and a shaded side wall, under a slab (level 1) or a hipped roof (2 and up) with
// the chimney at the back corner. Everything is in ART PIXELS (two to a board unit) from
// the hall's ANCHOR (t.x, t.y), y down, and is set out on the old painter's numbers x2:
// the house's middle at -6, its wall top at -8 - 2 bh, its footing's front edge at +8,
// the furnace mouth at -22..-4, the chimney's middle at +10 (+12 from level 3), where the
// hall file's live smoke rises. The crew stand where they always did (crewSpot below is the
// hall file's, x2); what stands on the ground at or behind their feet goes in BACK, what
// stands nearer than their feet goes in FRONT, as the old painter split it.
//
// The forms, as today's hall has them: a furnace hut with a slate slab and a strongbox (1),
// a tiled roof, a taller chimney, a door and a hanging coin sign (2), a gable over the wall
// and a gilt finial (3); the Royal Mint in pale stone and royal blue with a screw press (a),
// the Dragon's Hoard's mound of gold with a red dragon asleep on it (aa), the Philosopher's
// Stone's pedestal (ab); the Transmuter's copper-green roof, vial shelf and alembic (b), the
// Midas Cannon's gun carriage (ba), Lead to Gold's circle, vat and ingots (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the spec's `live` (pennant, the furnace's flame, sparks on the
// gilt), its `lights` (furnace, the red stone, the vat) and what the hall file still paints
// itself (smoke, glints, bubbles, the floating stone, the gun's recoil, the crew and coins).
// The alembic, the gun and the stone are small pictures of their own (below), stamped live.
import { Pix, mat, flat } from "./pix.js";
import { STYLES, drum, disc, beam, wheel, door, archWindow, ivy, WARM, hash, clamp } from "./hall-kit.js";

export const BOX = { w: 160, h: 160, ox: 80, oy: 124 };
export const LABEL = "Gold Works";

const CX = -6;                   // the house's middle
const DEPTH = 8, SH = 0.5;       // how far the side wall runs east, and how fast it climbs as it goes

const STONE_OF = { base: "#8a7a6a", a: "#c8c0ac", b: "#8a8474" };
const ROOF_OF = { l1: "#5a5e6a", l2: "#a8505c", a: "#3a5a8a", aa: "#8e2f2a", ab: "#5a3a7a", b: "#4a8a72", ba: "#4a8a72", bb: "#3a7a64" };
const FLAG_OF = { base: "#d8b34a", a: "#3a5a8a", aa: "#c04a30", ab: "#8a5ab0", b: "#8ad0a0", ba: "#8ad0a0", bb: "#8ad0a0" };
const tint = (h, k) => "#" + [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16); return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)).toString(16).padStart(2, "0"); }).join("");

const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), STEEL = mat("#c4c8d0", { contrast: 1.2 });
// gilt and brass: their own ramps, wider than stone's, so the highlight snaps
const GOLD = mat("#d8b34a", { contrast: 1.3 }), GOLD_D = mat("#b08a3a", { contrast: 1.2 }), BRASS = mat("#d0a040", { contrast: 1.3 }), COIN = mat("#e0bb48", { contrast: 1.3 });
const SLATE = mat("#5a5e6a"), EARTH = mat("#7c6242"), LEAD = mat("#7a808c", { contrast: 1.2 }), MARBLE = mat("#e8e0d0"), POT = mat("#3a3c46"), SACK = mat("#b89a6a");
const CHEST = mat("#8a3a2a"), BOX_WOOD = mat("#6a4a2e"), CARR = mat("#5a3a24");
const DRAGON = mat("#b8402a"), DRAGON_L = mat("#d86a4a"), DRAGON_H = mat("#c04a30"), BONE = mat("#e8dcc0");
const HOLE = flat("#2a1c18"), HOLE_D = flat("#1a1014"), SOOT = flat("#2a2030"), EMBER = flat("#7a3220", { emis: true });
const FIRE = ["#fff0b0", "#f4c060", "#e8703a"].map((c) => flat(c, { emis: true }));
const GREEN_LIT = flat("#8ad0a0", { emis: true }), BREW = flat("#a8d060", { emis: true }), RUNE = flat("#e8c14a", { noLine: true }), RUNE_L = flat("#f4d878");
const GLASS = mat("#8ad0a0", { contrast: 1.3 }), GLASS_P = mat("#c8dcd0"), AMBER = mat("#e0a060", { contrast: 1.2 }), RUBY = mat("#d8305a", { contrast: 1.35 });

// face normals under the one sun (upper left): the front wall sits at the stone's own tone,
// the east wall a tone down, anything that looks at the sky a tone up
const N_FRONT = [0.05, 0.06, 0.99], N_SIDE = [0.85, 0, 0.5], N_UP = [0, -0.85, 0.5], N_ROOF = [0, -0.25, 0.97], N_HIP = [0.8, -0.2, 0.56];
const put = (px, x, y, m, z, n, o) => px._put(Math.floor(x + px.ox), Math.floor(y + px.oy), m, z, n[0], n[1], n[2], o || {});

// ---- flat masonry -------------------------------------------------------------------------
// A wall face w x h with its top left at (x0, y0), the stonework as TONE: a stone a tone up or
// down, broken mortar under and east of it, a bevel on the lit side.
//   sh      shear: the face climbs as it runs east (the side wall)      shade  the quiet, shadowed side
//   eave    rows under an overhang that lie in its shadow               quoin  dressed blocks at both ends
//   soot    (x, y) => extra tone (the stain over the furnace)           lip    a sunlit top edge (a plinth)
//   calm    no stone a tone down (a narrow stack: one dark stone reads as a hole)
const face = (px, x0, y0, w, h, m, z, o = {}) => {
  px.part();
  const { seed = 1, course = 5, sw = 9, n = N_FRONT, sh = 0, shade = false, plain = false, eave = 0 } = o;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const c = Math.floor(j / course), off = (c & 1) * sw * 0.5 + Math.floor(hash(c, seed) * 3), k = Math.floor((i + off) / sw);
    const fy = j - c * course, fx = i + off - k * sw, hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
    let bias = 0;
    const q = o.quoin ? ((c & 1) ? 4 : 7) : 0;
    if (q && (i < q || i >= w - q)) bias = fy === course - 1 ? -1 : 1;
    else if (plain) bias = 0;
    else if (shade) { if (fy === course - 1 && hm < 0.6) bias -= 1; }
    else {
      if (hv < 0.14 && !o.calm) bias -= 1; else if (hv > 0.68) bias += 1;
      if ((fy === course - 1 || fx >= sw - 1) && hm < 0.72) bias -= 1;
      else if ((fy === 0 || fx < 1) && hv > 0.45 && hv <= 0.68) bias += 1;
    }
    if (o.lip && j === 0) bias = 1;
    if (j < eave) bias -= 1;
    if (j < eave - 3) bias -= 1;
    if (j >= h - 1) bias -= 1;
    if (o.soot) bias += o.soot(x0 + i + 0.5, y0 + j + 0.5);
    put(px, x0 + i + 0.5, y0 + j + 0.5 - Math.floor(i * sh), m, z, n, { bias: clamp(bias, -2, 1), cast: o.cast ?? 1 });
  }
};

// A hipped roof seen a little from the east: the front slope in the sun, the east hip in
// shade, tiles as tone (each course laps the next, a tile here and there a tone off).
//   xl..xr the front eave at height E; the ridge 2 rw long, `h` above, its middle at cr
const hipRoof = (px, o) => {
  const { xl, xr, E, h, rw, cr, m, z, seed = 1 } = o, T = E - h;
  px.part(); px.poly([[xl, E], [xr, E], [cr + rw, T], [cr - rw, T]], m, z, { n: N_ROOF });
  const pid = px._pid;
  let row = 0;
  for (let y = E - 4; y > T + 1; y -= 4, row++) {
    px.toneLine(xl - 2, y + 0.5, xr + 2, y + 0.5, -1, pid);
    for (let x = xl + (row & 1) * 3; x < xr; x += 6) {
      const hv = hash(row, Math.round(x), seed + 13), d = hv > 0.84 && x < cr + 4 ? 1 : hv < 0.14 ? -1 : 0;
      if (d) for (let a = 0; a < 4; a++) for (let b = 1; b <= 2; b++) px.tone(x + a + 0.5, y + b + 0.5, d, pid);
    }
  }
  px.toneLine(xl, E - 0.5, xr, E - 0.5, -1, pid);                       // the eave's edge
  px.toneLine(cr - rw, T + 0.5, cr + rw, T + 0.5, 1, pid);              // the ridge takes the sun
  // the east hip, from the front corner back to the far corner and up to the ridge's end
  const A = [xr, E], B = [xr + DEPTH, E - DEPTH * SH], C = [cr + rw, T];
  px.part(); px.poly([A, B, C], m, z - 0.1, { n: N_HIP });
  const hp = px._pid;
  for (let s = 4 / h; s < 0.95; s += 4 / h) px.toneLine(A[0] + (C[0] - A[0]) * s, A[1] + (C[1] - A[1]) * s, B[0] + (C[0] - B[0]) * s, B[1] + (C[1] - B[1]) * s, -1, hp);
};

// A square stack: a lit front, a shaded east side, a dark flue; `cap`: a band of darker stone round its head.
const chimney = (px, cx, top, bot, m, mCap, z, cap, seed) => {
  face(px, cx - 6, top, 12, bot - top, m, z, { course: 4, sw: 6, seed, eave: cap ? 6 : 0, calm: true });
  face(px, cx + 6, top, 4, bot - top, m, z - 0.1, { sh: SH, shade: true, n: N_SIDE, course: 4, seed });
  const hw = cap ? 8 : 6, t = cap ? top - 1 : top;
  if (cap) {
    px.part(); px.rect(cx - 8, t, 16, 5, mCap, z + 0.3, { n: N_FRONT }); px.toneLine(cx - 8, t + 0.5, cx + 8, t + 0.5, 1); px.toneLine(cx - 8, t + 4.5, cx + 8, t + 4.5, -1);
    px.poly([[cx + 8, t], [cx + 12, t - 2], [cx + 12, t + 3], [cx + 8, t + 5]], mCap, z + 0.2, { n: N_SIDE });
  }
  px.part(); px.poly([[cx - hw, t], [cx + hw, t], [cx + hw + 4, t - 2], [cx - hw + 4, t - 2]], cap ? mCap : m, z + 0.4, { n: N_UP });
  px.poly([[cx - hw + 3, t - 0.2], [cx + hw - 1, t - 0.2], [cx + hw + 1, t - 1.4], [cx - hw + 5, t - 1.4]], SOOT, z + 0.5, { cast: 0 });
};

// The furnace mouth: a round arch of dressed stones, the wall's thickness in shadow up and
// to the left, and (lit) a bed of coals; its iron door stands swung open at its west jamb.
const mouth = (px, cx, by, hw, h, mS, z, lit) => {
  px.part();
  const inA = (xx, yy, k) => { const r = hw + k; return Math.abs(xx) <= r && yy <= 0 && yy >= -h - k && (yy >= -h - k + r || xx * xx + (yy + h + k - r) ** 2 <= r * r); };
  for (let j = -h - 3; j < 0; j++) for (let i = -hw - 3; i <= hw + 3; i++) {
    const xx = i + 0.5, yy = j + 0.5;
    if (inA(xx, yy, 0)) {
      let m = !inA(xx - 1, yy - 1, 0) || !inA(xx - 2, yy - 2, 0) ? HOLE_D : HOLE;
      if (lit) {
        const hv = hash(i, j, 7);
        if (yy > -3) m = hv > 0.3 ? FIRE[1] : FIRE[2];
        else if (yy > -5) m = hv > 0.55 ? FIRE[2] : hv > 0.2 ? EMBER : m;
        else if (yy > -9 && m === HOLE && hv > 0.45) m = EMBER;
      }
      put(px, cx + xx, by + yy, m, z + 0.2, [0, 0, 1], { cast: 0 });
    } else if (inA(xx, yy, 2)) {
      const a = Math.atan2(yy + h - hw, xx), vous = yy < -h + hw && Math.floor((a + 9) * 2.4) % 2 === 0;
      put(px, cx + xx, by + yy, mS, z + 0.1, [-0.35, yy < -h + 1 ? -0.5 : 0, 0.8], { bias: (vous ? 1 : 0) + (xx > hw ? -1 : 0), cast: 0 });
    }
  }
  // the door leaf, seen nearly edge on
  px.part(); px.rect(cx - hw - 4, by - h + 1, 4, h - 2, IRON, z + 0.4, { n: [-0.5, -0.1, 0.86] });
  px.toneLine(cx - hw - 4, by - h + 5.5, cx - hw, by - h + 5.5, -1); px.toneLine(cx - hw - 4, by - 5.5, cx - hw, by - 5.5, -1);
  px.dot(cx - hw - 2.5, by - h * 0.5, IRON_L, z + 0.5, { fix: 4, cast: 0 });
};

// ---- what stands on the ground -------------------------------------------------------------
const stack = (px, x, y, n, z) => {                                       // a stack of coin, n high
  const h = Math.round(n * 2.2);
  px.part(); px.poly([[x - 4.5, y - h], [x + 4.5, y - h], [x + 4.5, y], [x - 4.5, y]], COIN, z, { round: 0.9 });
  const pid = px._pid;
  for (let k = 2; k < h; k += 2) px.toneLine(x - 4.5, y - k + 0.5, x + 4.5, y - k + 0.5, -1, pid);
  px.part(); px.ellipse(x, y - h, 4.5, 1.7, COIN, z + 0.1, { round: 0.2, vb: 0.3, cast: 0 });
  px.dot(x - 2.5, y - h - 0.5, COIN, z + 0.2, { fix: 4, cast: 0 });
};
const crate = (px, x, y, w, h, m, z, o = {}) => {                         // a bound box, its foot's middle at (x, y)
  px.part(); px.rect(x - w / 2, y - h, w, h, m, z, { n: N_FRONT });
  const pid = px._pid;
  px.toneLine(x - w / 2, y - h + 0.5, x + w / 2, y - h + 0.5, 1, pid); px.toneLine(x - w / 2, y - 0.5, x + w / 2, y - 0.5, -1, pid);
  px.toneLine(x - w / 2 + 0.5, y - h, x - w / 2 + 0.5, y, 1, pid); px.toneLine(x + w / 2 - 0.5, y - h, x + w / 2 - 0.5, y, -1, pid);
  if (o.lid) { px.part(); px.poly([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 + 2, y - h - 3], [x - w / 2 + 2, y - h - 3]], m, z - 0.1, { n: N_UP }); }
  if (o.band) { px.part(); px.rect(x - w / 2, y - h + 2, w, 2, GOLD, z + 0.1, { n: N_FRONT, cast: 0 }); }
  px.part(); px.rect(x - 1.5, y - h + (o.band ? 3 : 1), 3, 3, GOLD, z + 0.2, { n: N_FRONT, cast: 0 }); px.dot(x - 1, y - h + (o.band ? 3.5 : 1.5), GOLD, z + 0.3, { fix: 4, cast: 0 });
};
const ingot = (px, x, y, m, z) => {
  px.part(); px.poly([[x - 4.8, y], [x + 4.8, y], [x + 3.6, y - 4.4], [x - 3.6, y - 4.4]], m, z, { n: [-0.15, -0.3, 0.94] });
  px.toneLine(x - 3.6, y - 3.9, x + 3.6, y - 3.9, 1); px.toneLine(x - 4.8, y - 0.5, x + 4.8, y - 0.5, -1);
};

// the Royal Mint's screw press, on its own block before the door (its foot's middle at (x, y))
const press = (px, x, y, z) => {
  px.part(); px.rect(x - 9, y - 10, 18, 10, SLATE, z, { n: N_FRONT }); px.poly([[x - 9, y - 10], [x + 9, y - 10], [x + 11, y - 13], [x - 7, y - 13]], SLATE, z, { n: N_UP });
  px.toneLine(x - 9, y - 0.5, x + 9, y - 0.5, -1);
  px.part(); px.rect(x - 3, y - 13, 6, 2, COIN, z + 0.2, { n: N_UP, cast: 0 });                     // a blank on the die
  beam(px, x - 8, y - 11, x - 8, y - 34, 4, IRON, z + 0.3, { grain: false }); beam(px, x + 8, y - 11, x + 8, y - 34, 4, IRON, z + 0.3, { grain: false });
  beam(px, x - 10, y - 34, x + 10, y - 34, 5, SLATE, z + 0.5, { grain: false });
  px.part(); px.rect(x - 1.6, y - 42, 3.2, 24, STEEL, z + 0.4, { n: [-0.2, 0, 0.98] });               // the screw and its thread
  for (let k = 0; k < 11; k++) px.toneLine(x - 1.6, y - 41.5 + k * 2, x + 1.6, y - 40.5 + k * 2, -1);
  px.part(); px.rect(x - 6, y - 18, 12, 3, IRON, z + 0.45, { n: N_FRONT });                           // the platen
  beam(px, x - 14, y - 41, x + 14, y - 43, 2.8, IRON, z + 0.6, { grain: false });                     // the fly bar and its weights
  px.part(); px.ellipse(x - 15, y - 41, 3.2, 3.2, IRON, z + 0.7, { round: 0.9 }); px.ellipse(x + 15, y - 43, 3.2, 3.2, IRON, z + 0.7, { round: 0.9 });
};

// the Dragon's Hoard: a mound of coin heaped before the house (the old painter's two curves x2)
const QB = (p0, p1, p2, t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
const hoard = (px, z) => {
  const top = new Map();
  for (let t = 0; t <= 1; t += 0.004) for (const [a, b, c] of [[[-34, 13], [-30, -12], [-14, -14]], [[-14, -14], [-2, -12], [8, 13]]]) { const [x, y] = QB(a, b, c, t), xi = Math.floor(x); if (!top.has(xi) || y < top.get(xi)) top.set(xi, y); }
  px.part();
  for (const [xi, ty] of top) for (let j = Math.floor(ty); j < 13; j++) {
    const row = Math.floor(j / 2), cell = Math.floor(xi / 3 + (row & 1) * 0.5), hv = hash(cell, row, 5), nx = clamp((xi + 13) / 24, -0.9, 0.9) * 0.75;
    const o = { bias: hv > 0.78 ? 1 : hv < 0.2 ? -1 : 0 };
    if (hash(xi, j, 9) > 0.975 && xi < -4) o.fix = 4;
    if (j >= 11) o.bias -= 1;
    put(px, xi + 0.5, j + 0.5, COIN, z, [nx, -0.42, Math.sqrt(1 - nx * nx - 0.18)], o);
  }
};
// the dragon, curled asleep on it, head on its tail (facing west, snoring toward the hall file's smoke)
const dragon = (px, z) => {
  px.part(); px.poly([[-26, -18], [-16, -31], [-9, -18]], DRAGON_L, z - 0.1, { n: [-0.3, -0.3, 0.9] });                                   // the folded wing
  px.toneLine(-16, -30, -19, -18, -1); px.toneLine(-16, -30, -13, -18, -1);
  px.part(); px.ellipse(-18, -16, 12, 7.2, DRAGON, z, { round: 0.9 });
  for (let i = 0; i < 5; i++) px.dot(-25 + i * 4, -22.5 + Math.abs(i - 2) * 0.8, DRAGON_L, z + 0.05, { fix: 4, cast: 0 });                 // the spine's scales
  px.part(); px.capsule(-7, -14, 2.4, -3, -9, 2, DRAGON, z + 0.1); px.capsule(-3, -9, 2, -12, -8, 1.4, DRAGON, z + 0.1); px.capsule(-12, -8, 1.4, -20, -9, 1, DRAGON, z + 0.1);   // the tail, wrapped round to the chin
  px.part(); px.ellipse(-28, -14.6, 5.6, 4.4, DRAGON_H, z + 0.3, { round: 0.9 }); px.ellipse(-32.5, -13, 3, 2.4, DRAGON_H, z + 0.3, { round: 0.9 });
  px.line(-30.5, -15, -28, -15, HOLE_D, z + 0.4, { cast: 0 });                                                                             // a shut eye
  px.dot(-34.5, -13.5, HOLE_D, z + 0.4, { cast: 0 });
  px.part(); px.line(-29, -18, -28, -21, BONE, z + 0.35, { cast: 0 }); px.line(-26, -18, -24.5, -20.5, BONE, z + 0.35, { cast: 0 });       // horns
};

// where the hall file stands the crew (its crewSpot, x2): the clerk, or the Transmuter's alchemist
const crewSpot = (r4, mint, alch) => (alch ? (r4 ? [-2, 17] : [22, 16]) : r4 === "aa" ? [14, 16] : mint ? [4, 19] : [22, 14]);

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], br = o.branch || null, lvl = br ? 3 : o.level || 1, r4 = br && o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const mint = br === "a", alch = br === "b", seed = (o.seed || 0) * 7 + lvl, rich = st.stones === 2;
  const stone = STONE_OF[br || "base"], S = mat(stone), SL = mat(tint(stone, 0.16)), SD = mat(tint(stone, -0.14)), SC = mat(tint(stone, -0.22));
  const roofCol = r4 ? ROOF_OF[r4] : br ? ROOF_OF[br] : lvl >= 2 ? ROOF_OF.l2 : ROOF_OF.l1, RF = mat(roofCol);
  const bh = 14 + lvl * 3, HW = lvl >= 3 ? 22 : 20, L = CX - HW, R = CX + HW, wy = -8 - 2 * bh, E = wy + 2;
  const cc = lvl >= 3 ? 12 : 10, ctop = -2 * (4 + bh + 14 + lvl * 2);        // the chimney: the hall file's smoke rises from (cc, ctop)
  const [, cy] = crewSpot(r4, mint, alch), lay = (fy) => (fy <= cy ? back : front), live = [], lights = [];

  // ---- the ground it stands on
  back.part(); back.ellipse(0, 12, 38, 12, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  if (r4 === "bb") {
    // the transmutation circle, gold on the ground: two rings and six studs
    back.part();
    for (let a = 0; a < Math.PI * 2; a += 0.012) for (const [rx, ry] of [[34, 15], [28, 12]]) put(back, Math.cos(a) * rx, 8 + Math.sin(a) * ry, RUNE, -49, [0, 0, 1], { noLine: true, cast: 0 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, sx = Math.round(Math.cos(a) * 31), sy = Math.round(8 + Math.sin(a) * 13.6); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) put(back, sx + dx + 0.5, sy + dy + 0.5, Math.abs(dx) + Math.abs(dy) < 2 ? RUNE_L : RUNE, -48.9, [0, 0, 1], { noLine: true, cast: 0 }); }
  }

  // ---- the chimney, at the back corner
  chimney(back, cc, ctop, lvl === 1 ? wy - 4 : E - 8, SD, SC, lvl === 1 ? 1.6 : -3, lvl >= 2, seed + 3);

  // ---- the house: the front wall, the east wall, the footing
  const soot = r4 === "aa" ? null : (x, y) => (y < -24 && y > -28 && Math.abs(x + 13) < 8 - (-24 - y) * 1.6 ? -1 : 0);
  const wst = rich ? {} : { plain: true };
  face(back, L, wy, HW * 2, -1 - wy, S, 0, { ...wst, seed, eave: 7, quoin: lvl >= 2, soot });
  face(back, R, wy, DEPTH, -1 - wy, S, -0.5, { ...wst, seed: seed + 9, sh: SH, shade: true, n: N_SIDE, eave: 7 });
  face(back, L - 2, -1, HW * 2 + 4, 9, SD, 0.3, { seed: seed + 5, sw: 11, lip: true, plain: !rich });
  face(back, R + 2, -1, DEPTH, 9, SD, 0.2, { seed: seed + 6, sh: SH, shade: true, n: N_SIDE, sw: 11 });

  // ---- the roof: a slate slab at one, a hipped and tiled roof after
  if (lvl === 1) {
    back.part(); back.poly([[L - 4, wy - 3], [R + 4, wy - 3], [R + 4 + DEPTH, wy - 7], [L - 4 + DEPTH, wy - 7]], RF, 1, { n: N_UP });
    back.part(); back.rect(L - 4, wy - 3, HW * 2 + 8, 6, RF, 1.2, { n: N_FRONT });
    back.toneLine(L - 4, wy - 2.5, R + 4, wy - 2.5, 1); back.toneLine(L - 4, wy + 2.5, R + 4, wy + 2.5, -1);
    for (let x = L + 4; x < R; x += 11) { back.tone(x, wy - 1.5, -1); back.tone(x, wy - 0.5, -1); back.tone(x, wy + 0.5, -1); }       // the slabs' joints
    back.part(); back.poly([[R + 4, wy - 3], [R + 4 + DEPTH, wy - 7], [R + 4 + DEPTH, wy - 1], [R + 4, wy + 3]], RF, 1.1, { n: N_SIDE });
  } else {
    hipRoof(back, { xl: L - 4, xr: R + 4, E, h: lvl >= 3 ? 24 : 18, rw: lvl >= 3 ? 6 : 10, cr: CX + 4, m: RF, z: 1, seed });
    if (lvl >= 3) {
      // a stone gable standing on the eave, a small lit window in it, its own verges in the roof's colour
      back.part(); back.poly([[CX - 10, E], [CX, wy - 14], [CX + 10, E]], SL, 1.5, { n: N_FRONT });
      beam(back, CX - 11.5, E, CX, wy - 15.5, 3, RF, 1.7, { grain: false }); beam(back, CX + 11.5, E, CX, wy - 15.5, 3, RF, 1.65, { grain: false, bias: -1 });
      archWindow(back, CX, wy - 8, 4, 6, SL, 1.6, { glow: st.lit ? (alch ? GREEN_LIT : WARM) : false, frame: false });
      // the gilt finial on the ridge; the Mint crowns it
      const fx = CX + 4, fy = wy - 26;
      back.part(); back.rect(fx - 1, fy + 2, 2, 3, GOLD_D, 2, { n: N_FRONT }); back.ellipse(fx, fy, 3.2, 3.2, GOLD, 2.1, { round: 0.95 }); back.dot(fx - 1.5, fy - 1.5, GOLD, 2.2, { fix: 4, cast: 0 });
      if (mint) {
        back.part(); back.rect(fx - 4, fy - 7, 8, 4, GOLD, 2.1, { n: N_FRONT });
        for (const dx of [-4, -1, 2]) back.rect(fx + dx, fy - 10.6, 2, 3.6, GOLD, 2.1, { n: N_FRONT });
        back.toneLine(fx - 4, fy - 3.5, fx + 4, fy - 3.5, -1); back.dot(fx - 3.5, fy - 10.5, GOLD, 2.2, { fix: 4, cast: 0 }); back.dot(fx - 0.5, fy - 5.5, RUBY, 2.2, { fix: 3, cast: 0 });
      }
      live.push({ kind: "spark", x: fx - 2, y: fy - 2, col: "#ffe9a0", ph: 0 });
    }
  }

  // ---- the openings: the furnace mouth, the window, a door from level 2
  mouth(back, -13, -4, 9, 18, SL, 2, r4 !== "aa");
  archWindow(back, 6, wy + 9, 6, 10, SL, 2, { glow: st.lit ? (alch ? GREEN_LIT : WARM) : false, bars: true });
  if (lvl >= 2) door(back, 6, -1, 8, 14, SL, OAK, IRON, 2, { vous: rich, mRing: mint ? GOLD : IRON_L });
  if (r4 !== "aa") {
    live.push({ kind: "flame", x: -13, y: -6, w: 8, h: 10 });
    lights.push({ key: "furnace", x: -13, y: -12, r: 27, col: "#ff9a40", a: 0.85 });
  }
  if (lvl >= 2 && !alch) {
    // the hanging coin sign, on an oak bracket at the front corner
    beam(back, R - 1, wy + 6, R + 13, wy + 6, 2.4, OAK, 3, { grain: false });
    back.part(); back.line(R + 10, wy + 7, R + 10, wy + 9, IRON, 3, { cast: 0 });
    back.part(); back.ellipse(R + 10, wy + 15, 5.6, 5.6, GOLD, 3.1, { round: 0.75 }); back.ellipse(R + 10, wy + 15, 3.4, 3.4, GOLD_D, 3.2, { round: 0.2, cast: 0 });
    back.rect(R + 9, wy + 12.5, 2, 5, GOLD, 3.3, { n: N_FRONT, cast: 0 }); back.dot(R + 7.5, wy + 11.5, GOLD, 3.4, { fix: 4, cast: 0 });
  }
  if (alch) {
    // a shelf of vials on the wall, under the window
    beam(back, 0, wy + 28.5, 15, wy + 28.5, 2.4, OAK, 2.5, { grain: false });
    for (const [vx, col] of [[2, "#8ad0a0"], [7, "#c05a8a"], [11.5, "#7ab0e0"]]) { back.part(); back.rect(vx, wy + 22, 3, 5.3, flat(col, { emis: true }), 2.6, { cast: 0 }); back.rect(vx + 1, wy + 20, 1, 2, GLASS_P, 2.6, { n: N_FRONT, cast: 0 }); back.dot(vx + 0.5, wy + 23.5, flat("#f4fff8"), 2.7, { cast: 0 }); }
  }
  if (st.moss && !mint) ivy(back, R + 5, -4, lvl === 1 ? 12 : 24, 3, { seed: seed + 9, side: -1, spread: 2, col: alch ? "#5a8a4c" : "#4f8a3c" });

  // ---- the trade, set out on the ground before the house
  if (mint && !r4) press(back, 20, 14, 4);
  if (r4 === "aa") {
    hoard(back, 4); dragon(back, 5);
    live.push({ kind: "spark", x: -6, y: -4, col: "#ffe9a0", ph: 3 }, { kind: "spark", x: -24, y: 2, col: "#ffe9a0", ph: 6 });
  }
  if (r4 === "ab") {
    // the pedestal the stone floats over: pale marble, a gilt band
    drum(back, { cx: 22, top: -2, bot: 13, r: 8, sq: 0.3, m: MARBLE, z: 4, st: STYLES.A, course: 99, strings: [[3, 2, GOLD]] });
    drum(back, { cx: 22, top: -6, bot: -2, r: 10, sq: 0.3, m: MARBLE, z: 4.1, st: STYLES.A, course: 99 });
    disc(back, { cx: 22, y: -6, r: 10, sq: 0.3, m: MARBLE, z: 4.2 });
    lights.push({ key: "stone", x: 22, y: -19, r: 24, col: "#e04070", a: 0.7 });
  }
  if (r4 === "ba") {
    // the Midas gun's carriage (the hall file lays the barrel on it, and kicks it back)
    back.part(); back.rect(6, -2, 24, 10, CARR, 4, { n: N_FRONT }); back.poly([[6, -2], [30, -2], [32, -5], [8, -5]], CARR, 4, { n: N_UP });
    back.toneLine(6, 7.5, 30, 7.5, -1); back.toneLine(6, 2.5, 30, 2.5, -1);
    back.part(); back.rect(8, -1, 2, 8, BRASS, 4.1, { n: N_FRONT, cast: 0 }); back.rect(26, -1, 2, 8, BRASS, 4.1, { n: N_FRONT, cast: 0 });
    wheel(back, 12, 10, 6, OAK, BRASS, 4.5, { spokes: 6 }); wheel(back, 26, 10, 6, OAK, BRASS, 4.5, { spokes: 6 });
  }
  if (r4 === "bb") {
    // the vat, round-bellied iron on three stones, its brew giving light
    for (const dx of [-7, 0, 7]) { back.part(); back.ellipse(20 + dx, 15.5, 2.6, 1.8, SD, 3.9, { round: 0.8 }); }
    back.part(); back.ellipse(20, 7, 12, 9, POT, 4, { round: 0.95 });
    const pid = back._pid; back.toneLine(8, 5.5, 32, 5.5, 1, pid); back.toneLine(8, 6.5, 32, 6.5, -1, pid);
    back.part(); back.ellipse(20, 0.5, 10.4, 3.4, IRON_L, 4.2, { round: 0.3 }); back.ellipse(20, 0.5, 8.6, 2.2, BREW, 4.3, { cast: 0 });
    lights.push({ key: "vat", x: 20, y: -3, r: 18, col: "#a8e060", a: 0.6 });
  }

  // ---- the takings and wares, behind or in front of the crew's feet as the old painter had them
  const stacks = r4 === "aa" || r4 === "bb" ? 0 : Math.min(5, lvl + (mint ? 2 : 0));
  const spots = alch ? [[-23, 22.6, 4], [-14, 25.6, 6], [-6, 27, 3]] : [[-24, 17, 4], [-15, 20.4, 6], [-28.6, 13.2, 3], [-20, 23.6, 5], [-7, 23, 7]];
  for (const [sx, sy, n] of spots.slice(0, stacks).sort((a, b) => a[1] - b[1])) stack(lay(sy), Math.round(sx), Math.round(sy), n, 5 + sy * 0.01);
  if (lvl === 1) crate(lay(19), 6, 19, 12, 9, BOX_WOOD, 5.2);                                           // the strongbox
  if (mint && !r4) {                                                                                    // a sack of fresh coin at the press's foot
    const p = lay(24);
    p.part(); p.ellipse(20, 19.2, 4.6, 4.8, SACK, 5.3, { round: 0.9 }); p.rect(18.4, 13.6, 3.2, 1.6, mat("#8a6e44"), 5.4, { n: N_FRONT, cast: 0 });
    p.dot(25.5, 23.5, COIN, 5.3, { fix: 3 }); p.dot(27.5, 22.5, COIN, 5.3, { fix: 4 });
  }
  if (r4 === "aa") {                                                                                    // a chest spilled at the hoard's foot
    const p = lay(17);
    crate(p, -2, 17, 14, 10, CHEST, 5.2, { band: true, lid: true });
    for (const [dx, dy] of [[-11, 16], [-13, 14], [7, 16]]) p.dot(dx, dy, COIN, 5.3, { fix: dx < 0 ? 4 : 3 });
  }
  if (r4 === "bb") for (let i = 0; i < 5; i++) {                                                        // the ingots, turning from lead to gold
    const far = i >= 3, ix = far ? -11 + (i - 3) * 10 : -16 + i * 10, iy = far ? 20.6 : 25;
    ingot(lay(iy), ix, Math.round(iy), i >= 2 ? GOLD : LEAD, 5 + iy * 0.01 - (far ? 0.2 : 0));
  }

  // ---- what moves: the pennant at the roof's west end
  if (lvl >= 2) live.push({ kind: "pennant", x: lvl >= 3 ? -24 : -22, y: lvl >= 3 ? -58 : -47, col: FLAG_OF[key], pole: lvl >= 3 ? 21 : 20, len: 13, dir: -1 });
  const [kx, ky] = crewSpot(r4, mint, alch);
  return {
    live, lights,
    // the crew, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [alch ? { fig: "bomber", x: kx, y: ky, dir: -1, variant: "alch" } : { fig: "stander", x: kx, y: ky, dir: -1, variant: "clerk" }],
    shadow: { rx: HW + 13, ry: 7, dx: 5, dy: 12 },
  };
};

// ---- small pictures the hall file stamps live ---------------------------------------------------
// The Transmuter's alembic on its iron stand before the wall, and its retort. Its anchor is
// the hall's own (stamp it at t.x, t.y): it stands in front of the furnace's live flame.
export const alembic = () => {
  const px = new Pix(40, 52, 38, 30), ax = -24, ay = 16;
  for (const dx of [-7, 7]) beam(px, ax + dx, ay, ax + dx, ay - 16, 2.4, IRON, 0, { grain: false });
  px.part(); px.rect(ax - 9, ay - 18, 18, 3.4, IRON, 0.1, { n: N_UP }); px.toneLine(ax - 9, ay - 15, ax + 9, ay - 15, -1);
  px.part(); px.rect(ax - 2.4, ay - 41, 4.8, 10, GLASS_P, 0.4, { n: [-0.2, 0, 0.98] });                                 // the neck
  beam(px, ax, ay - 40, ax + 13, ay - 32, 2, GLASS_P, 0.5, { grain: false });                                           // the arm
  px.part(); px.ellipse(ax, ay - 26, 8.4, 8.4, GLASS, 0.6, { round: 0.95 });                                            // the bulb
  px.dot(ax - 3.5, ay - 30.5, GLASS, 0.7, { fix: 4, cast: 0 }); px.dot(ax - 2.5, ay - 30.5, GLASS, 0.7, { fix: 4, cast: 0 }); px.dot(ax - 3.5, ay - 29.5, GLASS, 0.7, { fix: 4, cast: 0 });
  px.part(); px.ellipse(ax + 14, ay - 29.2, 4.4, 4, AMBER, 0.6, { round: 0.95 }); px.dot(ax + 12.5, ay - 30.5, AMBER, 0.7, { fix: 4, cast: 0 });   // the retort it drips into
  return px.resolve();
};
// The Midas Cannon's gilded barrel (the hall file slides it back on the shot). Its anchor is
// the old gun's: (t.x + 7 - kick, t.y - 2); it points east and a little up, as the engine's muzzle point has it.
export const gun = () => {
  const px = new Pix(46, 24, 12, 16);
  beam(px, -4, 0, 24, -6, 8, BRASS, 1, { bands: [0.1, 0.55, 0.92], bandM: GOLD_D, grain: false });
  px.part(); px.ellipse(-4.8, 0.4, 4.8, 4.8, GOLD_D, 1.2, { round: 0.95 }); px.dot(-7, -1.5, GOLD, 1.3, { fix: 4, cast: 0 });
  px.part(); px.ellipse(25.2, -6.2, 2.2, 3.6, HOLE_D, 1.3, { rot: -0.21, cast: 0 });
  for (let k = 0; k < 4; k++) px.dot(2 + k * 5, -3.6 - k * 1.07, GOLD, 1.25, { fix: 4, cast: 0 });                       // the sun down its back
  return px.resolve();
};
// The Philosopher's Stone (the hall file floats it over the pedestal): a cut red stone.
export const stone = () => {
  const px = new Pix(14, 16, 7, 8);
  px.part(); px.poly([[-3, -6], [3, -6], [5.6, -2], [5.6, 2], [3, 6], [-3, 6], [-5.6, 2], [-5.6, -2]], RUBY, 0, { round: 0.85, ny: -0.2 });
  px.toneLine(-3, -2, 3, -2, 1); px.toneLine(-5, 2.5, 5, 2.5, -1); px.toneLine(0.5, 3, 0.5, 6, -1);
  px.dot(-2.5, -4.5, RUBY, 0.1, { fix: 4, cast: 0 }); px.dot(-1.5, -4.5, flat("#fff3d2"), 0.1, { cast: 0 }); px.dot(-2.5, -3.5, flat("#fff3d2"), 0.1, { cast: 0 });
  return px.resolve();
};
