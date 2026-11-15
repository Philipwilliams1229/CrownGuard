// ============ PIX HALL: the Sunforge, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/sunforge.js asks for
// it through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, and two materials that want a strong highlight, polished obsidian (cut in
// facets, a glint down each ridge, the dais laid in fitted slabs shown as tone) and gold.
// LIGHT is the hall's whole character: the captive shard lights its own temple, so the spec
// gives a light at the shard the hall file drives with the beam's focus.
//
// THE SHARD DECIDES THE BUILDING. Nobody stands on this hall. The beam leaves the shard at
// (x, y - 16) board units (draw.js; halls/sunforge.js SY), so here SY = -32, and every part
// keeps the old painter's numbers, x2 for art pixels: the horns' feet at +-21.2, their tips
// at +-13 and `top` (-50 / -56 / -62, -66 on a path), the far pair's feet at +-12, the
// pedestal 20 wide and 8 tall, the mirrors' posts at +-32, the corona round the shard, the
// spire's point at -132 and its lens at -80, the crystals where the old ones grew.
// Everything is in ART PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y), y down.
//
// The forms, as today's hall has them: a flat ring dais with a channel of light cut in it
// and two short horns (1); a stepped pedestal and taller horns (2); a second pair of horns
// behind, gold bands, runes in the channel (3); the Solar Lance's warm horns, gilded and
// gold-tipped, and two golden mirrors on posts (a); Noon Eternal's gold sunburst hung behind
// the shard (aa); the Sun Spear's tall spire with a lens ring over it, no mirrors (ab); the
// Moon Prism's blue horns grown into crystal, silver-banded, crystals on the dais rim (b);
// the Gravity Well's violet horns and crystals (ba; its ring of stones turns live); the
// Eclipse (bb; its sun and moon wheel live), told from the Prism by one horn banded in gold
// for the sun and one in silver for the moon.
//   build({ level, branch, rank4, seed, style })
// One picture, BACK: there is no crew to stand in front of.
// What moves is NOT baked: a few twinkles in `live`, the `lights`, and what the hall file
// still paints itself (the shard and its halo, the corona's flare, the light climbing the
// spire, the Well's ring, the Eclipse's pair, the motes, the pulse, the beam).
// Lights the hall drives (drawHallBack `k`): "sun" (the shard: low at rest, rising with the
// focus, flashing with each pulse of the held beam), "chan" (the channel), "corona", "lens",
// "well", and the Eclipse's "sunW" / "sunE" (its little sun, whichever side it is on).
import { Pix, mat, flat } from "./pix.js";
import { STYLES, hash, clamp, drum, disc, mixHex } from "./hall-kit.js";

export const BOX = { w: 100, h: 186, ox: 50, oy: 150 };
export const LABEL = "Sunforge";
const SQ = 0.4;                  // how much the camera squashes a circle: one value for every ring of the hall
const SY = -32;                  // the shard, and where the beam leaves from

// the old painter's palette (halls/sunforge.js OBS / SILVER / CRYSTAL, the horns' colour by form)
const OBS_C = "#3a3246";
const HORN_OF = { base: OBS_C, a: "#4a3a36", aa: "#4a3a36", ab: "#4a3a36", b: "#56648a", ba: "#4a4270", bb: "#56648a" };
const CHAN_OF = { sun: "#e0a040", moon: "#7aa0d8" };
export const LIGHT_OF = { sun: "#f0c050", moon: "#a8c8f0" };
const OBS = mat(OBS_C, { contrast: 1.35 }), OBS_L = mat(mixHex(OBS_C, "#ffffff", 0.1), { contrast: 1.35 }), OBS_D = mat(mixHex(OBS_C, "#1a1420", 0.25), { contrast: 1.3 });
const GOLD = mat("#d8b34a", { contrast: 1.2 }), GOLD_D = mat("#8a6a2a", { contrast: 1.15 }), GOLD_HOT = mat("#f4d070", { contrast: 1.1 }), SUNBURST = mat("#e0a838", { contrast: 1.2 });
const SILVER = mat("#c8d4e4", { contrast: 1.2 }), MIRROR = mat("#f4d878", { contrast: 1.25 }), POST = mat("#7a6446");
const ICE = mat("#9cc4ec", { contrast: 1.2 }), VIOLET = mat("#8a80c0", { contrast: 1.2 });
const GLINT_G = flat("#fff3d2"), GLINT_O = flat("#cfc6e6"), GLINT_W = flat("#ffffff");
const LEAF = mat("#4f8a3c"), LEAF2 = mat("#6aa04a"), PEBBLE = mat("#8a8290");

const frac = (v) => v - Math.floor(v);
const put = (px, x, y, m, z, n, o) => px._put(Math.floor(x + px.ox), Math.floor(y + px.oy), m, z, n[0], n[1], n[2], o || {});

// ---- the ground: a bed of bare earth round the dais, the hall's shadow on it -------------------
const ground = (px, G) => {
  const { seed, moon } = G, cy = 8, rx = 35, ry = 15, M = mat(moon ? mixHex("#7c6242", "#96b4e6", 0.3) : "#7c6242"), FROST = mat("#b4c8e4");
  px.part();
  for (let j = cy - ry; j < cy + ry; j++) for (let i = -rx; i < rx; i++) {
    const x = i + 0.5, y = j + 0.5, d = (x / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d >= 1) continue;
    if (d > 0.78 && hash(i, j, 3) < (d - 0.78) * 4.5) continue;                          // a ragged edge, no line
    const h = hash(i * 1.3, j * 2.1, seed);
    let bias = h > 0.93 ? 1 : h < 0.06 ? -1 : 0;
    if (((x - 9) / 27) ** 2 + ((y - 12) / 9) ** 2 < 1) bias -= 1;                         // the hall's own shadow, cast east
    put(px, x, y, moon && hash(i, j, 9) > 0.8 ? FROST : M, -50, [0, 0, 1], { bias, noLine: true });
  }
  // a few stones and tufts at its rim
  for (const [sx, sy, r] of [[-29, 14, 2.2], [27, 17, 1.8], [-12, 21.5, 1.6]]) { px.part(); px.ellipse(sx, sy - 1, r, r * 0.6, PEBBLE, -45, { round: 0.8 }); }
  if (!moon) for (const [tx, ty] of [[-32, 9], [31, 11], [14, 22], [-21, 19]]) for (let k = 0; k < 3; k++) put(px, tx + k - 1, ty - (k === 1 ? 2 : 1), k === 1 ? LEAF2 : LEAF, -44, [0, -0.5, 0.8], { noLine: true, cast: 0 });
};

// ---- polished stone ----------------------------------------------------------------------------
// A low round step seen from the south and above: its top (centre cy, radius r) and its rim,
// h deep, as ONE part (the arris between them is a change of tone). It is laid in `segs`
// fitted slabs: their joints are tone, broken here and there; a sheen lies on the top's sun
// side and the near arris catches the light, as polished stone does.
//   o.chan { r, m }   a channel cut round the top, filled with light (an emissive material)
const step = (px, cy, r, h, m, z, o = {}) => {
  px.part();
  const ry = r * SQ, segs = o.segs || 10, turn = o.turn || 0, seed = o.seed || 0;
  for (let j = Math.floor(cy - ry) - 1; j <= Math.ceil(cy + ry + h) + 1; j++) for (let i = -Math.ceil(r) - 1; i <= Math.ceil(r); i++) {
    const x = i + 0.5, y = j + 0.5, u = x / r;
    if (Math.abs(u) >= 1) continue;
    const e = ry * Math.sqrt(1 - u * u), dy = y - cy;
    if (dy < -e || dy > e + h) continue;
    let bias = 0;
    if (dy <= e) {                                                                         // the top
      const d = Math.hypot(x, dy / SQ), a = Math.atan2(dy / SQ, x), sa = (a / (Math.PI * 2) + 1) * segs + turn, fr = frac(sa);
      if (o.chan && Math.abs(d - o.chan.r) < 1.25) { put(px, x, y, o.chan.m, z + 0.05, [0, 0, 1], { cast: 0 }); continue; }
      if (o.chan && Math.abs(d - o.chan.r) < 2.5) bias -= 1;                               // the channel's cut edge
      else if (d > (o.chan ? o.chan.r + 2.5 : 3) && Math.min(fr, 1 - fr) * ((Math.PI * 2) / segs) * d < 0.6 && hash(Math.floor(d / 3), Math.floor(sa), seed) < 0.8) bias -= 1;   // a joint between two slabs
      else if (((x + r * 0.42) / (r * 0.3)) ** 2 + ((dy + ry * 0.25) / (ry * 0.4)) ** 2 < 1) bias += 1;                                                                              // the sheen
      if (dy > e - 1.1 && u < 0.45) bias = Math.max(bias, 0) + 1;                          // the near arris, polished
      if (u > 0.82) bias -= 1;
      put(px, x, y, m, z, [0, -0.8, 0.6], { bias: clamp(bias, -1, 1) });
    } else {                                                                               // the rim
      const th = Math.acos(clamp(u, -1, 1)), sa = (th / (Math.PI * 2) + 1) * segs + turn, fr = frac(sa);
      if (Math.min(fr, 1 - fr) * ((Math.PI * 2) / segs) * r * Math.sin(th) < 0.6 && Math.abs(u) < 0.9) bias -= 1;
      if (dy > e + h - 1.3) bias -= 1;                                                     // it sits IN the ground
      if (u > 0.86) bias += 1;                                                             // bounce light on the far edge
      const nx = clamp(u * 0.92 + 0.2, -0.98, 0.98);
      put(px, x, y, m, z, [nx, -0.04, Math.sqrt(Math.max(0.04, 1 - nx * nx))], { bias });
    }
  }
};

// One curved horn from the dais up round the shard, cut in three facets: the west one full
// in the sun, the east one in shadow, a glint down the ridge between the first two. `sgn`
// its side. The old painter's curve: two quadratics from the foot's two corners, bowed out
// round the shard's height, to the tip.
//   o.base / tip / w   the foot's centre, the tip, the foot's half width (art px)
//   o.dy               the whole horn moved up (the far pair stands 6 higher)
//   o.bands            [k, material] rings along it, k from the shard's height (0) to the tip (1)
//   o.streak           a white streak on its face (the gilded horns' polish)
const horn = (px, sgn, o) => {
  const { base = 21.2, tip = 13, w = 6.8, dy = 0, top, m, z, bands = [], seed = 1 } = o;
  const bx = sgn * base, tx = sgn * tip, cx = sgn * 29, footY = dy + 2, cy = dy + SY;
  const A = [[bx - w, footY], [cx - w * 0.5, cy], [tx - 1.6, top]], B = [[bx + w, footY], [cx + w * 0.5, cy], [tx + 1.6, top - 1]];
  const rowsOf = (P) => {
    const acc = new Map();
    for (let s = 0; s <= 600; s++) { const t = s / 600, q = 1 - t, x = q * q * P[0][0] + 2 * q * t * P[1][0] + t * t * P[2][0], y = q * q * P[0][1] + 2 * q * t * P[1][1] + t * t * P[2][1], j = Math.floor(y), c = acc.get(j); if (c) { c[0] += x; c[1]++; } else acc.set(j, [x, 1]); }
    return (j) => { const c = acc.get(j); return c ? c[0] / c[1] : null; };
  };
  const xa = rowsOf(A), xb = rowsOf(B);
  // the socket it is seated in: a dark print on the dais round its foot
  for (let j = -2; j <= 4; j++) for (let i = -Math.ceil(w) - 2; i <= Math.ceil(w) + 2; i++) if ((i / (w + 2)) ** 2 + ((j - 1.5) / 3.2) ** 2 < 1) px.tone(bx + i + 0.5, footY + j + 0.5, -1);
  px.part();
  const bandAt = (y) => bands.find(([k]) => { const py = Math.round(cy + (top - cy) * k); return y >= py && y < py + 3; });
  for (let j = Math.floor(top) - 1; j < Math.floor(footY); j++) {
    let a = xa(j), b = xb(j);
    if (a == null && b == null) continue;
    if (a == null) a = b - 3.2; if (b == null) b = a + 3.2;
    if (b - a < 2.6) { const c = (a + b) / 2; a = c - 1.3; b = c + 1.3; }
    const y = j + 0.5, mid = (a + b) / 2, half = (b - a) / 2, tt = (footY - y) / (footY - top), band = bandAt(y);
    const grow = band ? 1 : 0;
    for (let i = Math.round(a) - grow; i < Math.round(b) + grow; i++) {
      const x = i + 0.5, u = clamp((x - mid) / half, -1, 1);
      const n = u < -0.3 ? [-0.5, -0.12, 0.86] : u < 0.34 ? [0.1, -0.05, 0.99] : [0.66, 0, 0.75];
      if (band) { const py = Math.round(cy + (top - cy) * band[0]), row = j - py; put(px, x, y, band[1], z + 0.1, n, { bias: row === 0 ? 1 : row === 2 ? -1 : 0, cast: 0 }); continue; }
      let bias = 0;
      const ridge = u >= -0.3 && u < -0.3 + 1.05 / half;
      if (ridge && half > 2 && tt > 0.22 && tt < 0.82 && hash(j, seed) < 0.82) bias += 1;  // the glint down the ridge
      if (tt < 0.07) bias -= 1;                                                            // down in its socket
      if (u > 0.34 && hash(Math.floor(j / 4), seed + 3) < 0.22 && half > 2.4) bias -= 1;   // a chipped flake on the shadow side
      if (o.streak && ridge && tt > 0.4 && tt < 0.6) { put(px, x, y, GLINT_O, z + 0.05, n, { cast: 0 }); continue; }
      put(px, x, y, m, z, n, { bias });
    }
  }
  // the round foot
  for (let j = Math.floor(footY); j < footY + 3; j++) { const d = (j + 0.5 - footY) / 3.2, half = w * Math.sqrt(Math.max(0, 1 - d * d)); for (let i = Math.round(bx - half); i < Math.round(bx + half); i++) { const u = (i + 0.5 - bx) / w; put(px, i + 0.5, j + 0.5, m, z, u < -0.3 ? [-0.5, 0.1, 0.86] : u < 0.34 ? [0.1, 0.1, 0.99] : [0.66, 0.1, 0.74], { bias: -1 }); } }
};

// A crystal: a six-sided prism with a pointed head. Three facets show, the west one full in
// the sun, the east one in shadow; a white glint where two meet. (x, bot): its foot's middle;
// h: its whole height, point and all; lean: how far the point stands off the foot.
const crystal = (px, x, bot, w, h, lean, m, z) => {
  px.part();
  const hw = w / 2, head = Math.min(h * 0.45, w * 0.9), top = bot - h;
  for (let j = Math.floor(top); j < bot; j++) {
    const y = j + 0.5, t = (bot - y) / h, cx = x + lean * t, half = Math.max(0.5, y < top + head ? (hw * (y - top)) / head : hw);
    for (let i = Math.floor(cx - half); i <= Math.ceil(cx + half); i++) {
      const d = i + 0.5 - cx; if (Math.abs(d) > half) continue;
      const u = d / half, up = y < top + head ? -0.25 : 0;
      put(px, i + 0.5, y, m, z, u < -0.25 ? [-0.6, -0.4 + up, 0.69] : u > 0.3 ? [0.6, up, 0.8] : [0, -0.1 + up, 0.99], { bias: j >= bot - 1 ? -1 : 0 });
    }
  }
  if (h >= 9) for (let k = 0; k < Math.min(3, h / 5); k++) put(px, x + lean * 0.5 - hw * 0.3, bot - h * 0.55 + k, GLINT_W, z + 0.05, [0, 0, 1], { cast: 0 });
};

// a gold ball (a horn's tip, the spire's point), a glint on its sun side
const knob = (px, x, y, rx, ry, z) => { px.part(); px.ellipse(x, y, rx, ry, GOLD, z, { round: 0.95 }); px.dot(x - rx * 0.45, y - ry * 0.45, GLINT_G, z + 0.1, { cast: 0 }); };

// The Solar Lance's mirror: a gold dish on a post, turned in and up to the shard.
const mirror = (px, sgn, z) => {
  const mx = sgn * 32, rot = -sgn * 0.5;
  px.part(); px.ellipse(mx + 1, 11.5, 3.6, 1.6, OBS_D, z - 0.2, { round: 0.5, cast: 0 });                 // its foot, on the earth
  px.part(); px.capsule(mx, 11, 1.7, mx, -14, 1.5, POST, z);
  px.part(); px.ellipse(mx, -20, 4.2, 8.6, GOLD_D, z + 0.1, { rot, round: 0.9 });
  px.part(); px.ellipse(mx - sgn * 1.5, -20, 2.9, 7.4, MIRROR, z + 0.2, { rot, round: 0.7, cast: 0 });
  for (let k = 0; k < 4; k++) put(px, mx - sgn * 1.5 - 1 + k * 0.35, -24 + k, GLINT_G, z + 0.3, [0, 0, 1], { cast: 0 });   // the sun in the dish
};

// Noon Eternal's corona: a gold sunburst of twelve faceted rays (every other one long), a
// polished boss in its middle. The shard hangs before it; the hall file flares it live.
const corona = (px, z) => {
  const R = (i) => (i % 2 ? 18 : i % 4 === 0 ? 30 : 25), P = (i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * R(i), SY + Math.sin(a) * R(i) * 0.95]; };
  px.part();
  for (let i = 0; i < 24; i += 2) {
    const a = (i / 24) * Math.PI * 2, tipP = P(i), l = P((i + 23) % 24), r = P((i + 1) % 24);
    px.poly([[0, SY], l, tipP], SUNBURST, z, { n: [Math.cos(a - 1.3) * 0.6, Math.sin(a - 1.3) * 0.6, 0.8] });   // each ray: two facets meeting on its spine
    px.poly([[0, SY], tipP, r], SUNBURST, z, { n: [Math.cos(a + 1.3) * 0.6, Math.sin(a + 1.3) * 0.6, 0.8] });
  }
  px.part(); px.ellipse(0, SY, 19, 18, GOLD_HOT, z + 0.3, { round: 0.6 });
  for (let a = 0; a < Math.PI * 2; a += 0.05) px.tone(Math.cos(a) * 15.5, SY + Math.sin(a) * 14.6, -1);          // a ring chased in the boss
  for (let k = 0; k < 5; k++) put(px, -11 + k * 0.5, SY - 9 + k, GLINT_G, z + 0.4, [0, 0, 1], { cast: 0 });
};

// The Sun Spear's spire: a tall obsidian needle behind the shard, two facets meeting on a
// ridge, three gold bands, a gold lens ring round it with the lens in it, a gold point.
const spire = (px, z) => {
  px.part();
  px.poly([[-6, -4], [-2.4, -124], [0, -132], [0, -4]], OBS, z, { n: [-0.5, -0.12, 0.86] });
  px.poly([[0, -4], [0, -132], [2.4, -124], [6, -4]], OBS, z, { n: [0.66, 0, 0.75] });
  for (let y = -118; y < -12; y++) if (hash(y, 7) < 0.7) px.tone(-0.5, y + 0.5, 1);                               // the glint down its ridge
  // the lens ring's far half, behind the needle
  px.part(); for (let a = Math.PI; a < Math.PI * 2; a += 0.04) px.ellipse(Math.cos(a) * 10, -80 + Math.sin(a) * 3.6, 1.2, 1.2, GOLD_D, z - 0.2, { round: 0.6 });
  px.part();
  for (const py of [-60, -88, -108]) { const hw = 6 - (3.6 * (-4 - py)) / 120 + 0.8; px.rect(-hw, py, hw * 2, 3, GOLD, z + 0.1, { round: 0.85, cast: 0 }); px.dot(-hw + 1.5, py + 0.5, GLINT_G, z + 0.15, { cast: 0 }); }
  px.part(); px.ellipse(0, -80, 4.8, 4.8, mat("#fff0b0", { emis: true }), z + 0.3, { round: 0.9, cast: 0 }); px.dot(-1.5, -81.5, GLINT_W, z + 0.4, { cast: 0 }); px.dot(-2.5, -80.5, GLINT_W, z + 0.4, { cast: 0 });
  // the ring's near half, before it
  px.part(); for (let a = 0; a <= Math.PI; a += 0.04) px.ellipse(Math.cos(a) * 10, -80 + Math.sin(a) * 3.6, 1.3, 1.3, GOLD, z + 0.5, { round: 0.8, cast: 0 });
  knob(px, 0, -132, 2.8, 3.6, z + 0.2);
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const st = STYLES[o.style || "B"], br = o.branch || null, level = br ? 3 : o.level || 3, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const seed = (o.seed || 0) * 7 + level, sun = br === "a", moon = br === "b";
  const top = -2 * (22 + level * 3 + (br ? 2 : 0));                                       // the horns' tips (halls/sunforge.js ph)
  const chan = CHAN_OF[moon ? "moon" : "sun"], CHAN = flat(chan, { emis: true }), RUNE = flat(mixHex(chan, "#ffffff", 0.4), { emis: true });
  const HORN = mat(HORN_OF[key], { contrast: 1.35 }), HORN_FAR = mat(mixHex(HORN_OF[key], "#1a1420", 0.25), { contrast: 1.3 });
  const live = [], lights = [];

  ground(back, { seed, moon });
  // what stands tall BEHIND the shard
  if (r4 === "ab") spire(back, -10);
  if (r4 === "aa") corona(back, -10);

  // ---- the dais: two low rings of fitted obsidian, a channel of light cut round the upper one
  step(back, 5, 30, 3, OBS, 0, { segs: 12, seed, turn: 0.5 });
  step(back, 2, 24, 3, OBS_L, 0.4, { segs: 8, seed: seed + 2, chan: { r: 13.6, m: CHAN } });
  if (level >= 3) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, x = Math.cos(a) * 20.5, y = 2 + Math.sin(a) * 20.5 * SQ; put(back, x, y, RUNE, 0.5, [0, 0, 1], { cast: 0 }); put(back, x + 1, y, RUNE, 0.5, [0, 0, 1], { cast: 0 }); }   // runes round the channel
  lights.push({ key: "chan", x: 0, y: 2, r: 30, col: chan, a: 0.7 });

  // ---- the far horns (from three), a tone under the near pair
  if (level >= 3) for (const s of [-1, 1]) horn(back, s, { base: 12, tip: 8, w: 4.8, dy: -6, top: top + 6, m: HORN_FAR, z: 1, seed: seed + s });

  // ---- the pedestal (from two): a short drum, the channel's light running down its face
  if (level >= 2) {
    drum(back, { top: -8, bot: 0, r: 10, sq: SQ, m: OBS, z: 2, st, seed: seed + 5, course: 4, stoneW: 0.8 });
    disc(back, { y: -8, r: 10, sq: SQ, m: OBS_L, z: 2.1 });
    for (let a = 0; a < Math.PI * 2; a += 0.1) back.tone(Math.cos(a) * 6, -8 + Math.sin(a) * 6 * SQ, -1);       // a ring cut in its top, under the shard
    for (let y = -4; y < 4; y++) for (const x of [-1, 0]) put(back, x + 0.5, y + 0.5, CHAN, 2.2, [0, 0, 1], { cast: 0 });
    back.tone(-1.5, -4.5, -1); back.tone(1.5, -4.5, -1);
  }

  // ---- the near horns: obsidian, gilded, or grown into crystal
  const bandsOf = (s) => (sun ? [[0.2, GOLD], [0.55, GOLD], [0.85, GOLD]] : r4 === "bb" ? [[0.15, SILVER], [0.5, s < 0 ? GOLD : SILVER]] : moon ? [[0.15, SILVER]] : level >= 3 ? [[0.3, GOLD], [0.75, GOLD]] : []);
  for (const s of [-1, 1]) {
    horn(back, s, { top, m: HORN, z: 3, seed: seed + 3 + s, bands: bandsOf(s), streak: sun });
    if (sun) knob(back, s * 13, top - 2.4, 3, 3.6, 3.3);
    if (moon) crystal(back, s * 15, top + 16, 6, 17, -s * 1.6, ICE, 3.4);
  }
  // the Moon Prism's crystal clusters on the dais rim, before the horns' feet
  if (moon) for (const [x, y, w, h, l] of [[-24, 7, 5.2, 13, -1.2], [-17, 11.5, 4, 9, 0.6], [18, 11, 4.8, 12, 1], [25, 7, 3.6, 8, 0]]) crystal(back, x, y, w, h, l, r4 === "ba" ? VIOLET : ICE, 4 + y * 0.01);
  // the Solar Lance's mirrors, just off the dais
  if (sun && r4 !== "ab") for (const s of [-1, 1]) mirror(back, s, 5);

  // ---- light: the shard on its own temple, and what else shines
  const L = LIGHT_OF[moon ? "moon" : "sun"];
  lights.push({ key: "sun", x: 0, y: SY, r: 64, col: L });
  if (r4 === "aa") lights.push({ key: "corona", x: 0, y: SY, r: 46, col: "#ffb838", k: 0.5 });
  if (r4 === "ab") lights.push({ key: "lens", x: 0, y: -80, r: 34, col: "#fff0b0", a: 0.9, k: 0.6 });
  if (r4 === "ba") lights.push({ key: "well", x: 0, y: SY, r: 44, col: "#9a70d8", a: 0.8, k: 0.5 });
  if (r4 === "bb") lights.push({ key: "sunW", x: -18, y: -76, r: 40, col: "#f4c050", a: 0.9, k: 0.5 }, { key: "sunE", x: 18, y: -76, r: 40, col: "#f4c050", a: 0.9, k: 0 });
  // a twinkle or two off the gold, or off the crystal
  if (sun) live.push({ kind: "spark", x: -13, y: top - 4, col: "#fff3d2", ph: 0 }, { kind: "spark", x: 13, y: top - 4, col: "#fff3d2", ph: 4 });
  if (sun && r4 !== "ab") live.push({ kind: "spark", x: 30, y: -23, col: "#fff3d2", ph: 2 });
  if (moon) live.push({ kind: "spark", x: -14, y: top + 4, col: "#e8f4ff", ph: 1 }, { kind: "spark", x: 18, y: 3, col: "#e8f4ff", ph: 5 }, { kind: "spark", x: -24, y: -2, col: "#e8f4ff", ph: 3 });
  if (level >= 3 && !br) live.push({ kind: "spark", x: -25, y: SY + (top - SY) * 0.3, col: "#fff3d2", ph: 2 });

  return { live, lights, crew: [], shadow: { rx: 30, ry: 9, dx: 9, dy: 11 } };
};

// ---- the captive shard (drawn live by the hall: it turns, and bobs) ----------------------------
// A lozenge of light in a dark setting, its anchor at its middle: `wi` 0..3 is how far round
// it has turned (edge-on to full face: half width 2.5 + wi board units, as the old one).
export const shard = (moon, wi = 3) => {
  const hw = 5 + wi * 2, px = new Pix(hw * 2 + 8, 40, hw + 4, 20);
  const base = CHAN_OF[moon ? "moon" : "sun"], col = LIGHT_OF[moon ? "moon" : "sun"], core = moon ? "#eef6ff" : "#fff4d0";
  const SET = flat("#241a26"), C0 = flat(base, { emis: true }), C0D = flat(mixHex(base, "#241a26", 0.28), { emis: true }), C1 = flat(col, { emis: true }), C2 = flat(core, { emis: true });
  const inside = (x, y, a, b) => Math.abs(x) / a + Math.abs(y) / b <= 1;
  for (let j = -18; j < 18; j++) for (let i = -hw - 3; i < hw + 3; i++) {
    const x = i + 0.5, y = j + 0.5;
    if (!inside(x, y, hw + 2, 16.5)) continue;
    const m = !inside(x, y, hw, 14) ? SET : inside(x, y, hw * 0.3 + 0.6, 6) ? C2 : inside(x, y, hw * 0.6 + 0.4, 10) ? C1 : x + y * 0.35 > 0 ? C0D : C0;   // the east facets a tone under the west
    px._put(i + px.ox, j + px.oy, m, 1, 0, 0, 1, { noLine: true });
  }
  return px.resolve({ line: "none" });
};
