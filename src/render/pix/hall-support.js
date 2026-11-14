// ============ PIX HALL: the Warden Mage's shrine, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/warden.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, dressed stone shown stone by stone, and LIGHT, which is the point of a
// shrine: candles, a rune in the altar, a gem in the keystone, ice that glows from inside.
//
// THE WARDEN DECIDES THE BUILDING. He stands where the old hall stood him (his feet at
// y - 1 board units, half a unit back from x), and the old painter's numbers are kept, x2
// for art pixels: the upper step's half width (altarW 6 / 7 / 8 -> 12 / 14 / 16), the
// pillars at +-20, the arch's springing at -64 (-72 for a final) and its lintel 12 above
// that, the censer's hook under the keystone, the heart at -90, the bell's pivot at -124.
// Everything is in ART PIXELS from the hall's ANCHOR (t.x, t.y), y down.
//
// A NARROW hall: all it puts on the ground keeps inside FOOT_NARROW (kitB.js: rx 13, ry 9
// round y + 3, so here rx 26, ry 18 round +6). The ground, the lower step, the pillars'
// feet and the ground crystals are clipped to it (inFoot); only what rises may leave it.
// It lays no ground shadow of its own for the same reason: the shadow is a tone on its
// own bed of earth.
//
// The forms, as today's hall has them: a two-step altar and a crystal in the grass (1);
// two short fluted pillars with candles (2); the open arch with a gem in its keystone and
// two cloths (3); the Rimecaller's frosted arch, icicles and snow (a); Absolute Zero's
// cluster of ice spires behind short pillars with ice lamps (aa); the Permafrost Heart's
// plinth between crystals (ab; the heart itself beats live); the Lifebinder's greened arch
// (b); Guardian's Grace, a gilded arch with a great ward-shield hung behind him (ba); the
// High Cathedral's gothic wall, rose window, belfry and spire (bb).
//   build({ level, branch, rank4, seed, style })
// Two pictures: BACK (the ground, the steps, everything tall behind the warden) and FRONT
// (the pillars and the arch, which frame him and are drawn over him, as before).
// What moves is NOT baked: the candle flames and twinkles in `live`, the `lights`, and what
// the hall file still paints itself (the warden, the aura, the censer, the halo, the heart,
// the bell, the shards, the snow, the blessings).
// Lights the hall drives (drawHallBack / drawHallFront `k`): "aura" (the rune and the gem:
// dim at rest, full while the aura works), "heart", "rose", "ward", "spire", "lamp". The
// candles are "torch" lights, which flicker on their own.
import { Pix, mat, flat } from "./pix.js";
import { STYLES, hash, clamp, drum, cone, archWindow, wallBanner, ivy, mixHex } from "./hall-kit.js";

export const BOX = { w: 76, h: 208, ox: 38, oy: 184 };
export const LABEL = "Warden Mage";

// the narrow footprint, in art pixels from the anchor
const FOOT = { cy: 6, rx: 26, ry: 18 };
// (a pixel of margin: the outline is drawn one pixel outside whatever is clipped here)
const inFoot = (x, y) => (x / (FOOT.rx - 1.2)) ** 2 + ((y - FOOT.cy) / (FOOT.ry - 1.2)) ** 2 <= 1;

const STONE_OF = { base: "#948c80", a: "#9aa8b0", aa: "#b0c4d0", ab: "#8a9cac", b: "#9a9480", ba: "#c8c0a8", bb: "#b8b0a0" };
const AURA_OF = { base: "#7cd4d4", a: "#7cd4d4", aa: "#b8f0f8", ab: "#8cd8f8", b: "#8ce08c", ba: "#e8d47a", bb: "#f0d060" };
const EARTH_OF = { base: "#7c6242", a: "#8aa0a8", b: "#6a7a42" };
const CLOTH_OF = { base: "#3a6a8a", b: "#4a7a3c", ba: "#e8e0c8", bb: "#6a2a4a" };
const ICE = mat("#a8e4f0", { contrast: 1.15 }), SNOW = mat("#f0faff"), GLINT = flat("#ffffff"), GOLD = mat("#d8b34a", { contrast: 1.15 }), WAX = mat("#e8e0c8");
const LEAF = mat("#4f8a3c"), LEAF2 = mat("#6aa04a"), PINK = flat("#f0a0b8"), YELLOW = flat("#f0d060"), PALE = flat("#e8e4d8"), DARK = flat("#2a2438"), LEAD = flat("#3a3040");
const CREAM = mat("#d6ccac"), SLATE = mat("#5a6a8a");
const PANES = ["#c8383a", "#3a6ac8", "#e8c14a", "#3a9a5a", "#8a4ac8", "#3a6ac8", "#e8c14a", "#c8383a"];

const put = (px, x, y, m, z, n, o) => px._put(Math.floor(x + px.ox), Math.floor(y + px.oy), m, z, n[0], n[1], n[2], o || {});

// ---- stone ---------------------------------------------------------------------------------
// A dressed-stone face, x0..x1 by y0..y1 (whole pixels): the stones are TONE (one a tone up
// or down, broken mortar under and east of each, a bevel on the lit side), the east fifth
// stays quiet. o.clip(x, y): leave a pixel out; o.arris: the top row catches the sun;
// o.ground: the bottom row sits in the earth.
const face = (px, x0, y0, x1, y1, m, z, o = {}) => {
  const { course = 5, block = 7, seed = 1, n = [0, 0, 1] } = o;
  if (!o.same) px.part();
  const cOf = (j) => Math.floor((j - y0) / course), kOf = (i, c) => Math.floor((i - x0) / block + (c & 1) * 0.5 + hash(c, seed) * 0.3);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    if (o.clip && !o.clip(i + 0.5, j + 0.5)) continue;
    const c = cOf(j), k = kOf(i, c);
    const eB = j + 1 < y1 && cOf(j + 1) !== c, eR = i + 1 < x1 && kOf(i + 1, c) !== k, eT = j > y0 && cOf(j - 1) !== c, eL = i > x0 && kOf(i - 1, c) !== k;
    const hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
    let bias = 0;
    if (hv < 0.15) bias -= 1; else if (hv > 0.8) bias += 1;
    if ((eB || eR) && hm < 0.72) bias -= 1; else if ((eT || eL) && hv > 0.5) bias += 1;
    if ((i + 0.5 - x0) / (x1 - x0) > 0.8) bias = clamp(bias, -1, 0);
    if (o.arris && j === y0) bias = 1;
    if (o.ground && j >= y1 - 1) bias -= 1;
    put(px, i + 0.5, j + 0.5, m, z, n, { bias, cast: o.cast ?? 1 });
  }
};
// A slab seen from the south and above: its top in the sun (yTop..yEdge), its front face
// (yEdge..yBot). One part, so the arris between them is a change of tone, never a line.
const slab = (px, x0, x1, yTop, yEdge, yBot, m, z, o = {}) => {
  px.part();
  for (let j = yTop; j < yEdge; j++) for (let i = x0; i < x1; i++) {
    if (o.clip && !o.clip(i + 0.5, j + 0.5)) continue;
    let bias = 0;
    if ((i - x0 + (o.seed || 0) * 3) % (o.block || 9) === 0 && hash(i, o.seed || 0) < 0.6) bias -= 1;      // a joint in the paving
    if (j === yEdge - 1) bias += 1;                                                                        // the worn nosing
    if (i >= x1 - 2) bias -= 1;
    put(px, i + 0.5, j + 0.5, m, z, [0, -0.8, 0.6], { bias: clamp(bias, -1, 1) });
  }
  face(px, x0, yEdge, x1, yBot, m, z, { ...o, same: true, course: o.course || 5, block: o.block || 8 });
};

// A fluted pillar on a square foot, a capital on top (cx: its centre; top: where the shaft
// meets the capital; the foot stands on the ground at the step's end).
const pillar = (px, cx, top, m, mL, z, o = {}) => {
  const bot = 6;
  slab(px, cx - 5, cx + 5, bot - 2, bot, 14, mL, z, { seed: 3, block: 99, course: 9, ground: true, clip: inFoot });                    // the foot
  px.part();
  px.rect(cx - 4, top, 8, bot - top, m, z + 0.1, { round: 0.9, ny: -0.2 });
  for (const dx of [-1.5, 1.5]) px.toneLine(cx + dx, top + 3, cx + dx, bot - 2, -1);                                                    // the flutes
  for (let y = top + 9 + (o.seed || 0) % 5; y < bot - 4; y += 13) px.toneLine(cx - 4, y, cx + 1, y, -1);                               // a drum joint, on the lit side only
  px.toneLine(cx - 4, top + 1, cx + 4, top + 1, -1); px.toneLine(cx - 4, bot - 1, cx + 4, bot - 1, -1);                                 // the capital's and the foot's shadow
  px.part();
  px.rect(cx - 5, top - 3, 10, 4, mL, z + 0.2, { round: 0.85, ny: -0.1 });                                                              // the echinus
  px.rect(cx - 6, top - 6, 12, 1, mL, z + 0.3, { n: [0, -0.85, 0.5] });                                                                 // the abacus, its top in the sun
  px.rect(cx - 6, top - 5, 12, 2, mL, z + 0.3, { n: [0.05, 0, 0.99] });
  px.tone(cx + 5.5, top - 4.5, -1); px.tone(cx + 5.5, top - 3.5, -1);
};

// The lintel: a low arch from pillar to pillar (it rises 5 at the middle), its top in the
// sun, its voussoirs as tone, the soffit dark. riseAt(x) is exported to the garlands and icicles.
const riseAt = (x) => 5 * (1 - (x / 27) ** 2);
const lintel = (px, LT, m, z, seed, gold) => {
  px.part();
  for (let i = -27; i < 27; i++) {
    const x = i + 0.5, yT = Math.round(LT - riseAt(x));
    for (let d = 0; d < 9; d++) {
      let bias = 0, n = [0, 0, 1], mm = m;
      if (d < 2) n = [0, -0.85, 0.5];
      else {
        const k = Math.floor((i + 30) / 6), hv = hash(k, seed + 2);
        if ((i + 30) % 6 === 0 && hash(k, d > 5 ? 1 : 0, seed) < 0.8) bias -= 1;           // the joints between the voussoirs
        else if (hv > 0.75) bias += 1; else if (hv < 0.18) bias -= 1;
        if (d === 2 && bias < 1) bias += 1;                                                 // the upper arris
        if (d === 8) bias -= 1;                                                             // the soffit
        if (d === 6 && !gold) bias = Math.min(bias, 0) - (hash(i, seed) < 0.85 ? 1 : 0);    // a fascia cut along the arch
        if (x > 17) bias = clamp(bias, -1, 0);
        if (gold && (d === 5 || d === 6)) { mm = GOLD; bias = d === 5 ? 1 : 0; }
      }
      put(px, x, yT + d + 0.5, mm, z, n, { bias });
    }
  }
};
const keystone = (px, LT, mL, gem, z) => {
  px.part();
  px.poly([[-6, LT - 10], [6, LT - 10], [4.5, LT + 5], [-4.5, LT + 5]], mL, z, { n: [-0.15, -0.1, 0.98] });
  px.toneLine(-6, LT - 9.5, 6, LT - 9.5, 1); px.toneLine(4.5, LT - 8, 3.5, LT + 4, -1); px.toneLine(-4, LT + 4.5, 4, LT + 4.5, -1);
  px.part();
  px.ellipse(0, LT - 3, 3, 3, mat(gem, { emis: true }), z + 0.2, { round: 0.9, cast: 0 });
  px.dot(-1.5, LT - 4.5, GLINT, z + 0.3, { cast: 0 });
};

// ---- ice, snow, green ---------------------------------------------------------------------
// A crystal of ice: a six-sided prism with a pointed head. Three facets show, the west one
// full in the sun, the east one in shadow; a white glint where two meet.
const crystal = (px, x, bot, w, h, lean, z, o = {}) => {
  px.part();
  const hw = w / 2, head = Math.min(h * 0.45, w * 0.9), top = bot - h;
  for (let j = Math.floor(top); j < bot; j++) {
    const y = j + 0.5, t = (bot - y) / h, cx = x + lean * t, half = Math.max(0.5, y < top + head ? (hw * (y - top)) / head : hw);
    for (let i = Math.floor(cx - half); i <= Math.ceil(cx + half); i++) {
      const d = i + 0.5 - cx; if (Math.abs(d) > half) continue;
      if (o.clip && !o.clip(i + 0.5, y)) continue;
      const u = d / half, up = y < top + head ? -0.25 : 0;
      const n = u < -0.25 ? [-0.6, -0.4 + up, 0.69] : u > 0.3 ? [0.6, up, 0.8] : [0, -0.1 + up, 0.99];
      put(px, i + 0.5, y, o.m ?? ICE, z, n, { bias: j >= bot - 1 && h > 8 ? -1 : 0, cast: o.cast ?? 1 });
    }
  }
  if (h >= 12) { const gy = bot - h * 0.55; for (let k = 0; k < Math.min(4, h / 6); k++) put(px, x + lean * 0.55 - hw * 0.3, gy + k, GLINT, z + 0.05, [0, 0, 1], { cast: 0 }); }
};
const snow = (px, x, y, z, rx = 5, ry = 2.2) => { px.part(); px.ellipse(x, y, rx, ry, SNOW, z, { round: 0.6, cast: 0 }); };
const posy = (px, x, y, m) => { put(px, x, y, LEAF, -40, [0, 0, 1], { noLine: true, cast: 0 }); put(px, x, y - 1, m, -40, [0, 0, 1], { noLine: true, cast: 0 }); put(px, x + 1, y - 2, m, -40, [0, 0, 1], { noLine: true, cast: 0 }); put(px, x - 1, y - 2, m, -40, [0, 0, 1], { noLine: true, cast: 0 }); };

// ---- the ground: a bed of swept earth, the hall's shadow on it, the warden's rune ring ------
const ground = (px, G) => {
  const { rx, seed, ice, white } = G, cy = 10, ry = 10, M = mat(G.earth), FROST = mat(white ? "#eef8fc" : "#d6e8ee"), core = white ? 0.8 : 0.5;
  px.part();
  for (let j = cy - ry; j < cy + ry; j++) for (let i = -rx; i < rx; i++) {
    const x = i + 0.5, y = j + 0.5, d = (x / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d >= 1 || !inFoot(x, y)) continue;
    if (d > 0.8 && hash(i, j, 3) < (d - 0.8) * 4) continue;                              // a ragged edge, no line
    const h = hash(i * 1.3, j * 2.1, seed);
    let bias = h > 0.93 ? 1 : h < 0.06 ? -1 : 0;
    if (((x - 7) / 19) ** 2 + ((y - 13) / 6) ** 2 < 1) bias -= 1;                        // the hall's own shadow, cast east
    const frost = ice && (d < core || hash(i, j, 9) > (d - core) * 2.4);
    put(px, x, y, frost ? FROST : M, -50, [0, 0, 1], { bias, noLine: true });
  }
  if (G.ring) {
    const RUNE = flat(mixHex(G.aura, G.earth, ice ? 0.15 : 0.4));
    for (let a = 0.1; a < Math.PI - 0.1; a += 0.04) { if (Math.floor(a * 10) % 4 === 3) continue; put(px, Math.cos(a) * 21, 11 + Math.sin(a) * 7.5, RUNE, -49, [0, 0, 1], { noLine: true, cast: 0 }); }
  }
  for (const [sx, sy, r] of [[-Math.min(rx - 5, 19), 15, 2.4], [Math.min(rx - 8, 17), 17, 2], [-6, 19, 1.8]]) if (!ice && inFoot(Math.abs(sx) + r, sy)) { px.part(); px.ellipse(sx, sy - 1, r, r * 0.6, mat("#a89c88"), -45, { round: 0.8, cast: 1 }); }   // a few stones at its rim
};

// ---- the tall things behind the warden -------------------------------------------------------
const spires = (back) => {
  const list = [[-17, 44, 8, -3], [17, 48, 8, 3], [-10, 76, 10, -2], [10, 68, 10, 2], [0, 92, 12, 0], [-22, 26, 6, -2], [22, 30, 6, 2]];
  for (const [x, h, w, lean] of list) crystal(back, x, -2, w, h, lean, -10 + (100 - h) * 0.03);
};
const heartPlinth = (back, S, SL, seed) => {
  for (const s of [-1, 1]) crystal(back, s * 15, -2, 7, 32, s * 4, -9);
  face(back, -10, -72, 10, -4, S, -8, { course: 7, block: 8, seed });
  slab(back, -13, 13, -78, -75, -70, SL, -7.5, { seed: seed + 2, block: 99, course: 9 });
  back.toneLine(-10, -69.5, 10, -69.5, -1);
  for (const s of [-1, 1]) crystal(back, s * 15, -70, 7, 26, s * 3.5, -7.8);
  snow(back, -6, -77, -7.2, 4, 1.6); snow(back, 7, -76.5, -7.2, 3, 1.4);
};
const wardShield = (back) => {
  const sy = -68, kite = (k) => [[-18 + k, sy + k], [18 - k, sy + k], [18 - k, sy + 20], [15 - k, sy + 32 - k * 0.5], [8 - k * 0.6, sy + 41 - k], [0, sy + 46 - k * 1.4], [-8 + k * 0.6, sy + 41 - k], [-15 + k, sy + 32 - k * 0.5], [-18 + k, sy + 20]];
  back.part(); back.poly(kite(0), GOLD, -6, { round: 0.5, ny: -0.1 });
  // two facets meeting on a ridge down the middle: the west one takes the sun
  const half = (pts, w) => pts.filter((p) => (w ? p[0] <= 0 : p[0] >= 0));
  back.part(); back.poly([...half(kite(2.2), true), [0, sy + 2.2]], CREAM, -5.9, { n: [-0.3, -0.2, 0.93], cast: 0 });
  back.poly([[0, sy + 2.2], ...half(kite(2.2), false)], CREAM, -5.9, { n: [0.3, -0.1, 0.95], cast: 0 });
  for (let y = sy + 4; y < sy + 18; y += 1) if (hash(y, 4) > 0.5) back.tone(-14.5, y, 1);
  back.part(); back.rect(-1.5, sy + 6, 3, 31, GOLD, -5.8, { n: [-0.1, -0.1, 0.98], cast: 0 }); back.rect(-11, sy + 15, 22, 3, GOLD, -5.8, { n: [-0.1, -0.3, 0.94], cast: 0 });
  back.toneLine(0.5, sy + 6, 0.5, sy + 36, -1); back.toneLine(-11, sy + 17.5, 11, sy + 17.5, -1);
};
const cathedral = (back, S, SL, SW, st, seed) => {
  const top = -80, apex = -112;
  face(back, -24, top, 24, 0, SW, -9, { course: 8, block: 11, seed });
  face(back, -26, apex, 26, top, SW, -9, { course: 8, block: 11, seed: seed + 3, clip: (x, y) => y > apex + (Math.abs(x) * (top - apex)) / 26 });
  for (let i = -26; i < 26; i++) { const y = apex + (Math.abs(i + 0.5) * (top - apex)) / 26; put(back, i + 0.5, y, SL, -8.9, [0, -0.85, 0.5], { bias: i < 0 ? 1 : -1 }); put(back, i + 0.5, y + 1, SL, -8.9, [0, -0.85, 0.5], { bias: i < 0 ? 0 : -1 }); }   // the coping
  // the rose window: a wheel of coloured panes in a ring of dressed stone, lit from inside
  const ry = -60;
  back.part();
  for (let j = -18; j < 18; j++) for (let i = -18; i < 18; i++) {
    const x = i + 0.5, y = j + 0.5, d = Math.hypot(x, y);
    if (d > 18) continue;
    if (d > 15) { put(back, x, ry + y, SL, -8.5, [(x / 18) * 0.5, (y / 18) * 0.5 - 0.1, 0.85], { bias: d > 17 ? 0 : d < 16 ? -1 : 0, cast: 0 }); continue; }
    const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2), sec = Math.floor(a / (Math.PI / 4)), off = Math.abs(a / (Math.PI / 4) - sec - 0.5), arc = (0.5 - off) * (Math.PI / 4) * d;
    let m;
    if (d < 3.2) m = flat("#f8e8a0", { emis: true });
    else if (arc < 0.6 || Math.abs(d - 8.5) < 0.6 || d < 4.2) m = LEAD;
    else m = flat(d < 8.5 ? mixHex(PANES[sec], "#fff3d2", 0.3) : PANES[sec], { emis: true });
    put(back, x, ry + y, m, -8.4, [0, 0, 1], { cast: 0 });
  }
  // the belfry on the gable (the bell hangs live in its arch), a slate spire, a gilt cross
  drum(back, { top: -132, bot: -107, r: 11, sq: 0.3, m: S, z: -8, st, seed: seed + 5, course: 5, stoneW: 0.6, strings: [[-132, 2, SL]] });
  archWindow(back, 0, -128, 12, 19, SL, -7.6, { frame: true });
  cone(back, { y: -132, r: 13, h: 28, sq: 0.3, m: SLATE, z: -7, st, rows: 5, seed });
  back.part(); back.rect(-1, -174, 2, 16, GOLD, -6.9, { n: [-0.2, -0.2, 0.95] }); back.rect(-4, -169, 8, 2, GOLD, -6.9, { n: [-0.2, -0.4, 0.9] });
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const seed = (o.seed || 0) * 7 + level, ice = br === "a", life = br === "b";
  const pw = 2 * (r4 ? 8 : br || level >= 2 ? 7 : 6), PX0 = 20;                    // altarW, pillarX
  const pillars = level >= 2 || !!br, arch = (level >= 3 || !!br) && r4 !== "aa" && r4 !== "ab";
  const ptop = arch ? -2 * (r4 ? 36 : 32) : -24, LT = ptop - 12;                   // archH; the lintel's ends
  const col = STONE_OF[key], S = mat(col), SL = mat(mixHex(col, "#ffffff", 0.16)), SD = mat(mixHex(col, "#2a1c2c", 0.06));
  const aura = AURA_OF[key], gem = ice ? "#a8e4f0" : r4 === "ba" ? "#e8c14a" : r4 === "bb" ? "#f0d060" : life ? "#8ce08c" : "#8ce8f0";
  const live = [], lights = [];

  // ---- BACK: the ground, what stands tall behind him, the altar's two steps
  ground(back, { rx: pw + 11, seed, ice, white: r4 === "aa", earth: EARTH_OF[br || "base"], ring: pillars, aura });
  if (r4 === "ab") for (let i = 0; i < 6; i++) {                                    // frost roots cracking out from the heart
    const a = (i / 6) * Math.PI * 2 + 0.3; let x = Math.cos(a) * 12, y = 12 + Math.sin(a) * 5;
    for (let k = 0; k < 3; k++) { const nx = x + Math.cos(a + hash(i, k) - 0.5) * 5, ny = y + Math.sin(a + hash(i, k) - 0.5) * 2.4; if (inFoot(nx, ny)) back.line(x, y, nx, ny, flat("#f4fdff"), -48, { noLine: true, cast: 0 }); x = nx; y = ny; }
  }
  if (life) for (const [i, [fx, fy]] of [[-17, 18], [17, 18.5], [-8, 21.5], [9, 22]].entries()) posy(back, fx, fy, i % 2 ? YELLOW : PALE);
  if (r4 === "aa") spires(back);
  else if (r4 === "ab") heartPlinth(back, S, SL, seed);
  else if (r4 === "ba") wardShield(back);
  else if (r4 === "bb") cathedral(back, S, SL, mat(mixHex(col, "#3a2c3c", 0.2)), st, seed);   // the wall a tone under the pillars before it

  slab(back, -pw - 8, pw + 8, 1, 9, 14, SD, 0.3, { seed, ground: true, clip: inFoot, arris: true });       // the lower step
  slab(back, -pw, pw, -10, 0, 5, S, 0.6, { seed: seed + 1, arris: true, block: 7 });                        // the upper step: he stands on it
  // the rune inlaid in the upper step's face: it glows with the aura
  const RUNE = flat(mixHex(aura, "#ffffff", 0.45), { emis: true });
  for (let j = 1; j <= 3; j++) for (let i = -5; i <= 5; i++) back.tone(i + 0.5, j + 0.5, -1);                // the inlay's dark bed
  for (let i = -3; i <= 3; i++) put(back, i + 0.5, 2.5, RUNE, 0.7, [0, 0, 1], { cast: 0 });
  for (const j of [1, 3]) put(back, 0.5, j + 0.5, RUNE, 0.7, [0, 0, 1], { cast: 0 });
  for (const s of [-1, 1]) put(back, s * 5 + 0.5, 2.5, RUNE, 0.7, [0, 0, 1], { cast: 0 });
  lights.push({ key: "aura", x: 0, y: 2, r: 12, col: aura, a: 0.5 });
  if (ice) {                                                                        // snow drifted on the treads
    for (let i = 0; i < 5; i++) snow(back, -pw - 4 + (i * (pw * 2 + 8)) / 4, 7 + (i % 2), 1 + i * 0.01, i % 2 ? 4 : 5.5);
    snow(back, -pw + 3, -1, 0.8, 4, 1.6); snow(back, pw - 4, -1.5, 0.8, 3.4, 1.4);
  }
  if (life) {
    ivy(back, -pw - 3, 12, 12, 2, { seed: seed + 1, side: 1, spread: 2 }); ivy(back, pw + 3, 12, 10, 2, { seed: seed + 4, side: -1, spread: 2 });
    for (const [fx, fy] of [[pw + 4, 6], [pw + 6, 10], [-pw - 6, 8]]) back.dot(fx, fy, YELLOW, 2.2, { cast: 0 });
  }
  if (!br && level === 1) {                                                         // a crystal out in the grass
    crystal(back, 16, 19, 5, 12, 1.5, 3, { clip: inFoot });
    lights.push({ key: "aura", x: 16, y: 11, r: 9, col: aura, a: 0.6 });
    live.push({ kind: "spark", x: 15, y: 9, col: aura, ph: 3 });
  }

  // ---- FRONT: the pillars and the arch that frames him
  if (pillars) {
    for (const s of [-1, 1]) {
      const cx = s * PX0;
      pillar(front, cx, ptop, S, SL, 2, { seed: seed + s });
      if (!arch && r4) {                                                            // an ice lamp on the capital
        crystal(front, cx, ptop - 5, 6, 16, 0, 2.6);
        live.push({ kind: "spark", x: cx - 1, y: ptop - 15, col: "#a8e4f0", ph: s + 2, layer: "front" });
        lights.push({ key: "lamp", x: cx, y: ptop - 14, r: 14, col: "#a8e4f0", a: 0.8 });
      } else if (!arch) {                                                           // a candle, its flame live
        front.part(); front.rect(cx - 2, ptop - 13, 4, 8, WAX, 2.6, { round: 0.7 }); front.dot(cx - 0.5, ptop - 14, DARK, 2.7, { cast: 0 });
        front.tone(cx + 1.5, ptop - 10, -1); front.tone(cx + 1.5, ptop - 9, -1);     // a run of wax
        live.push({ kind: "flame", x: cx, y: ptop - 13, w: 3, h: 6, layer: "front" });
        lights.push({ key: "torch", x: cx, y: ptop - 17, r: 17, col: "#ffa040", a: 0.7 });
      }
      if (ice) { snow(front, cx, ptop - 6.5, 2.5, 5, 1.6); if (r4) snow(front, cx + 1, 4.5, 2.4, 4, 1.4); }
      if (life) {
        ivy(front, cx + s * 2, 5, 3 - ptop, 3, { seed: seed + 5 + s, side: -s, spread: 2.2 });
        ivy(front, cx - s * 3, 5, (3 - ptop) * 0.55, 3, { seed: seed + 9 + s, side: s, spread: 1.6, col: "#5a9a44" });
        for (let i = 0; i < 5; i++) { front.part(); front.ellipse(cx + s * (3.5 - (i % 2) * 1.5), -2 - i * ((-ptop - 8) / 5) - hash(i, s + 2, seed) * 5, 2.6, 2, i % 2 ? LEAF : LEAF2, 3.05 + i * 0.01, { round: 0.8 }); }   // clumps of leaf down its outer side
        for (let i = 0; i < 4; i++) front.dot(cx + s * 2 + (hash(i, s, seed) - 0.5) * 6, -6 - i * ((-ptop - 14) / 4) - hash(i, seed) * 4, i % 2 ? PINK : YELLOW, 3.2, { cast: 0 });
      }
    }
    if (ice) for (const s of [-1, 1]) {                                             // frost grown up out of the ground before each pillar
      crystal(front, s * 15, 18.5, 5, 13, s * 2, 3.4, { clip: inFoot });
      crystal(front, s * 10, 18, 4, 9, s * 2.4, 3.3, { clip: inFoot });
    }
  }
  if (arch) {
    lintel(front, LT, S, 2.4, seed, r4 === "ba" || r4 === "bb");
    keystone(front, LT, SL, gem, 2.8);
    lights.push({ key: "aura", x: 0, y: LT - 3, r: 24, col: gem, a: 0.8 });
    if (ice) {
      front.part();
      for (let i = 0; i < 7; i++) {                                                 // icicles along the soffit
        const x = Math.round(-PX0 + 3 + (i * (PX0 * 2 - 6)) / 6), len = 4 + Math.round(hash(seed, i) * 7), y0 = Math.round(LT - riseAt(x)) + 8;
        for (let d = 0; d < len; d++) { put(front, x + 0.5, y0 + d + 0.5, ICE, 2.5, [-0.3, 0, 0.95], { bias: d === len - 1 ? 1 : 0, cast: 0 }); if (d < len * 0.4) put(front, x + 1.5, y0 + d + 0.5, ICE, 2.5, [0.5, 0, 0.85], { cast: 0 }); }
      }
      for (let i = 0; i < 4; i++) { const x = -PX0 + 4 + (i * (PX0 * 2 - 8)) / 3; snow(front, x, LT - riseAt(x) - 0.5, 2.6 + i * 0.01, i % 2 ? 4.4 : 6, 2); }
      live.push({ kind: "spark", x: -13, y: LT + 12, col: "#e8fbff", ph: 1, layer: "front" }, { kind: "spark", x: 9, y: LT + 14, col: "#e8fbff", ph: 5, layer: "front" });
    } else {
      // cloth hung from the lintel's ends
      for (const s of [-1, 1]) wallBanner(front, s * (PX0 + 1), LT + 10, 6, 18, mat(CLOTH_OF[r4] || CLOTH_OF[br || "base"]), GOLD, 3, { tail: "point" });
    }
    if (life) {                                                                     // a garland of leaves over the arch, flowers in it
      for (let i = 0; i < 11; i++) { const x = -25 + i * 5; if (Math.abs(x) < 6) continue; front.part(); front.ellipse(x, LT - riseAt(x) + 1 + (i % 2), 3.6, 2.6, i % 2 ? LEAF : LEAF2, 2.6 + i * 0.01, { round: 0.8 }); }
      for (const [i, x] of [-21, -12, 11, 20].entries()) front.dot(x, LT - riseAt(x) + (i % 2), i % 2 ? PINK : YELLOW, 3, { cast: 0 });
    }
  }

  // the lights the tall things give
  if (r4 === "aa") { lights.push({ key: "spire", x: 0, y: -52, r: 46, col: "#c8f4ff", a: 0.7 }); live.push({ kind: "spark", x: -3, y: -78, col: "#e8fbff", ph: 0 }, { kind: "spark", x: 9, y: -50, col: "#e8fbff", ph: 3 }, { kind: "spark", x: -11, y: -58, col: "#e8fbff", ph: 6 }); }
  if (r4 === "ab") { lights.push({ key: "heart", x: 0, y: -90, r: 38, col: "#6ad0f8", a: 0.9 }); live.push({ kind: "spark", x: -18, y: -88, col: "#e8fbff", ph: 2 }, { kind: "spark", x: 18, y: -24, col: "#e8fbff", ph: 5 }); }
  if (r4 === "ba") lights.push({ key: "ward", x: 0, y: -44, r: 36, col: "#f8e8a0", a: 0.7 });
  if (r4 === "bb") lights.push({ key: "rose", x: 0, y: -60, r: 36, col: "#f8e8a0", a: 0.7 });

  return {
    live, lights, shadow: null,
    // the warden, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [{ fig: "priest", x: -1, y: -2, dir: 1, variant: key }],
  };
};

// ---- the Permafrost Heart (drawn live by the hall: it beats) -----------------------------------
// A heart of blue ice, its anchor at the old heart's centre (x, y - 45 board units): darker
// ice outside, a pale core, two glints. step 0..3 = how far the beat has swelled it.
export const heart = (step = 0) => {
  const px = new Pix(36, 34, 18, 16), k = 10.6 * (1 + step * 0.05);
  const OUT = mat("#3a90c8", { emis: true }), CORE = mat("#8ce0f8", { emis: true }), inside = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0;
  px.part();
  for (let j = -16; j < 18; j++) for (let i = -18; i < 18; i++) {
    const x = (i + 0.5) / k, y = 0.1 - (j + 0.5 - 2) / k;
    if (!inside(x, y)) continue;
    const core = inside(x / 0.72, (y - 0.06) / 0.72), nx = clamp(x / 1.25, -0.9, 0.9), ny = clamp(-(y - 0.1) / 1.25, -0.9, 0.9);
    px._put(i + 18, j + 16, core ? CORE : OUT, core ? 1 : 0, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), { cast: 0 });
  }
  const g = Math.round(-0.52 * k);
  px.dot(g, 2 - 0.5 * k, GLINT, 2, { cast: 0 }); px.dot(g + 1, 2 - 0.5 * k, GLINT, 2, { cast: 0 }); px.dot(g, 3 - 0.5 * k, GLINT, 2, { cast: 0 }); px.dot(g + 2, 5 - 0.5 * k, GLINT, 2, { cast: 0 });
  return px.resolve({ line: "tint" });
};
