// ============ PIX HALL: the Wizard Spire, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/wizard.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B of the concept
// round ("worked"), on the look of the concept sheet's Spire (hall-spire.js): plum-grey stone
// shown stone by stone, a gilt string course, an open crown the mage stands in, lamplit
// arched windows, the mage's banners, and his orb's light on the crown.
//
// THE MAGE DECIDES THE BUILDING. He stands on the hall's centre line, his feet 7 above the
// walk's lip, and the lip is spireH above the anchor (halls/wizard.js spireH / shaftW; the
// engine starts the orb and the lightning from the same numbers, engine/muzzles.js
// staffFrom). This file works those numbers out again (geom) and builds round them.
// Everything is in ART PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y),
// y down: the footing meets the turf at +14, the old lip is DY = -2 spireH, his feet are at
// FEET = DY - 14, and the round deck's centre is 3 behind his feet.
//
// The forms, as today's hall has them: the apprentice's squat tower with a lectern (1), two
// rods for the floating crystals (2), a gilt crescent behind the long-beard and violet
// banners (3); the Pyromancer's warm stone and corner braziers (a), the Inferno Throne's
// pale sandstone, gilded throne-back with five cups, crimson runner and fire-bowls (aa),
// Dragonbreath's sooty stone and horned skulls on posts (ab); the Stormcaller's blue slate,
// copper rod and rune-stones (b), the Tempest Court's two coils (ba), the Thunder
// Sovereign's spiked crown-ring (bb).
//   build({ level, branch, rank4, seed, style })   style: "B" (the game) | "A" | "C"
// What moves is NOT baked: the spec's `live` list (the braziers' and fire-bowls' flames,
// a few sparks), its `lights` (the orb on the crown, east and west of him; the braziers;
// the coils, the crown-ring, the skulls, the throne), and what the hall file still paints
// itself (the mage, his orb, the runes and stars, the crystals, the crown of flames, the
// clouds and bolts, Dragonbreath's ring and smoke, the embers).
import { Pix, mat, flat } from "./pix.js";
import { STYLES, drum, disc, parapet, bandEdge, door, archWindow, wallBanner, ivy, boulder, flameFrames, bookFrames } from "./hall-kit.js";

export const BOX = { w: 104, h: 226, ox: 52, oy: 192 };
export const LABEL = "Wizard Spire";
export const SHEET_DY = -8;      // the concept sheet stands halls on their base line; this one is drawn from the anchor, 8 px above it
const SQ = 0.3;                  // how much the camera squashes a circle: one value for every ring of the hall

// the old painter's palettes, form by form (halls/wizard.js STONE / ORB / TRIM / CLOTH)
const STONE_OF = { base: "#8e889a", a: "#9a7a6c", aa: "#c4a07a", ab: "#6e5c56", b: "#7a8298", ba: "#6e7a94", bb: "#72708e" };
export const ORB_OF = { base: "#b08ad8", a: "#f0903a", aa: "#ff8a2a", ab: "#f8b040", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };
const TRIM_OF = { base: "#d8b34a", a: "#e8a040", aa: "#e8c050", ab: "#c8883a", b: "#8cc8e0", ba: "#a8e0f0", bb: "#e8c14a" };
const CLOTH_OF = { base: "#5a4a8c", a: "#a0402e", aa: "#9a1e22", ab: "#7a2420", b: "#2e5a8a", ba: "#24507a", bb: "#4a3a80" };
const WIN_OF = { arcane: "#ffd070", fire: "#ffa040", storm: "#a8e8ff" };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lightenHex = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));
const darkenHex = (h, k) => hex(rgb(h).map((v) => v * (1 - k)));

const OAK = mat("#5e4128"), OAK_L = mat("#6a4a2e"), GREY_OAK = mat("#4a4e5e"), IRON = mat("#4a4c56"), PAGE = mat("#e8e0c8");
const COPPER = mat("#a8622e", { contrast: 1.15 }), COPPER_L = mat("#d8a04a", { contrast: 1.15 }), STEEL = mat("#c8d4e0", { contrast: 1.2 });
const GILT = mat("#d8b34a", { contrast: 1.15 }), GILT_D = mat("#8a6a2a"), EARTH = mat("#7c6242"), SCORCH = mat("#4e3a30"), ASH = mat("#3a2a2a");
const BONE = mat("#e0d2b0"), HORN = mat("#4a3a34"), DARK = flat("#2a2030"), COAL = flat("#3a2420"), RUNE = mat("#8a90a0"), RUNE_SLOT = flat("#3a4660");
const LEAF = mat("#5a8a4c"), PETAL = mat("#b08ad8");
const STAR = [".#.", "###", ".#."];
const FLAME_DEV = [".#.", "##.", "###", "###", ".#."];
const BOLT_DEV = ["..#", ".#.", "###", ".#.", "#.."];
// Dragonbreath's skull, seen from the front: 22 cells, cell (11, 17) at the skull's centre.
// The sockets (o) sit where the hall file lights them: x -5..-3 and 2..4, y -2..0.
const SKULL = [
  ".h..................h.",
  ".h..................h.",
  ".hh................hh.",
  "..h................h..",
  "..hh..............hh..",
  "...h..............h...",
  "...hh............hh...",
  "....hh..........hh....",
  "....hhh........hhh....",
  ".....hhh......hhh.....",
  "......hhh.BB.hhh......",
  ".......hBBBBBBh.......",
  ".....BBBBBBBBBBBB.....",
  "....BBBBBBBBBBBBBB....",
  "....BBBBBBBBBBBBBB....",
  "....BBoooBBBBoooBB....",
  "....BBoooBBBBoooBB....",
  ".....BoooBBBBoooB.....",
  ".....bBBBBBBBBBBb.....",
  "......bBBBBBBBBb......",
  "......bBBBBBBBBb......",
  ".......BBBBBBBB.......",
  ".......BBBBBBBB.......",
  ".......bBBBBBBb.......",
  "........BnBBnB........",
  "........BBBBBB........",
  "........tbtbtb........",
  "........t.tt.t........",
];

// ---- the numbers the hall file and the engine share (halls/wizard.js spireH, shaftW) ----------
export const geom = ({ level = 3, branch = null, rank4 = null }) => {
  const bodyH = 18 + level * 6 + (branch ? 4 : 0), sw = rank4 ? 24 : branch ? 22 : 16 + level * 2, pw = sw / 2 + 4;
  const DY = -2 * bodyH, r = sw, R = 2 * pw, FEET = DY - 14, deck = FEET - 3, ry = R * SQ;
  // the near wall tops out at his feet in a crenel; its band comes down to the old lip
  return { bodyH, DY, r, R, FEET, deck, wall: Math.round(ry) - 3, band: 8 };
};

// ---- furniture ---------------------------------------------------------------------------------
// a gilt rod on the crown's rim with a collar; `crystal`: a lit stone on it (false: bare, for
// level 2, whose crystals float over the rods, painted by the hall file)
const finial = (px, x, y, h, z, T, crystal) => {
  px.part(); px.capsule(x, y, 1, x, y - h, 0.8, T, z, { cast: 1 }); px.rect(x - 2, y - h * 0.45, 4, 1.4, T, z + 0.1, { n: [0, -0.5, 0.8] });
  if (!crystal) { px.rect(x - 1.5, y - h - 1, 3, 1.4, T, z + 0.1, { n: [0, -0.6, 0.8] }); return; }
  const C2 = flat(crystal, { emis: true }), C1 = flat(lightenHex(crystal, 0.45), { emis: true });
  px.part(); px.poly([[x, y - h - 6], [x + 2.4, y - h - 2.5], [x, y - h + 0.5], [x - 2.4, y - h - 2.5]], C2, z + 0.2, { cast: 0 }); px.dot(x - 0.5, y - h - 3.5, C1, z + 0.3); px.dot(x - 0.5, y - h - 2.5, C1, z + 0.3);
};
// the apprentice's lectern, an open book on it
const lectern = (px, x, y, z) => {
  px.part(); px.capsule(x, y, 1, x, y - 9, 1, OAK_L, z); px.rect(x - 2.5, y - 1, 5, 1.6, OAK_L, z, { n: [0, -0.5, 0.8] });
  px.part(); px.poly([[x - 5, y - 12], [x + 5, y - 13.5], [x + 5, y - 10.5], [x - 5, y - 9]], PAGE, z + 0.2, { n: [0, -0.7, 0.7] }); px.toneLine(x, y - 12.6, x, y - 9.8, -1);
};
// the gilt crescent behind the long-beard: an arc from the far rim up over his hat, a stone at its tip
const crescent = (px, cx, cy, R, z, T, crystal) => {
  px.part();
  for (let a = 2.25; a <= 5.95; a += 0.035) { const k = (a - 2.25) / 3.7, w = 0.7 + 1.5 * Math.sin(Math.min(1, k * 1.15) * Math.PI) ** 0.6; px.ellipse(cx + Math.cos(a) * R, cy + Math.sin(a) * R, w, w, T, z, { round: 0.85 }); }
  const C2 = flat(crystal, { emis: true }), C1 = flat(lightenHex(crystal, 0.45), { emis: true });
  px.part(); px.ellipse(cx + Math.cos(5.98) * R, cy + Math.sin(5.98) * R, 1.7, 1.7, C2, z + 0.1, { cast: 0 }); px.dot(cx + Math.cos(5.98) * R - 0.5, cy + Math.sin(5.98) * R - 0.5, C1, z + 0.2);
};
// a small round post standing on the walk (a brazier's, a skull's)
const post = (px, x, top, bot, rr, S, T, z, seed) => drum(px, { cx: x, top, bot, r: rr, sq: SQ, m: S, z, st: STYLES.A, seed, course: 5, stoneW: 0.9, strings: [[top, 1.6, T]] });
// a fire bowl: a dish in metal `M`, its mouth full of coals (the flame over it is live). (x, y): the mouth's centre
const bowl = (px, x, y, w, M, z) => {
  px.part(); px.poly([[x - w, y - 1], [x + w, y - 1], [x + w - 1.5, y + 3], [x - w + 1.5, y + 3]], M, z, { round: 0.8 });
  px.part(); px.rect(x - w + 1, y - 2, w * 2 - 2, 1.4, COAL, z + 0.1, { cast: 0 });
};
// a tesla coil: a copper rod ringed with three coils, a steel ball at the top (centre (x, ball))
const coil = (px, x, bot, ball, z) => {
  px.part(); px.capsule(x, bot, 1.6, x, ball + 4, 1.3, COPPER, z);
  for (let i = 0; i < 3; i++) { const y = bot - 14 - i * 7, w = 5 - i * 0.7; px.part(); px.poly([[x - w, y], [x + w, y], [x + w, y + 3.4], [x - w, y + 3.4]], COPPER_L, z + 0.1, { round: 0.85 }); }
  px.part(); px.ellipse(x, ball, 4.6, 4.6, STEEL, z + 0.2, { round: 0.95 });
};
// a rune-stone standing on the turf before the footing; its slot is lit by the hall file
const runeStone = (px, x, y, z) => {
  px.part(); px.poly([[x - 3, y + 5], [x - 3.6, y - 1], [x - 1.5, y - 5.4], [x + 1.6, y - 5.4], [x + 3.6, y - 1], [x + 3, y + 5]], RUNE, z, { round: 0.8 });
  px.part(); px.rect(x - 1, y - 3.4, 2, 5, RUNE_SLOT, z + 0.1, { cast: 0 });
};

const spire = (back, front, st, F) => {
  const { level, br, r4, key, el, seed, G } = F, { DY, r, R, FEET, deck, wall, band } = G;
  const grown = level >= 3 || !!br, rich = st.stones === 2;
  const S = mat(STONE_OF[key]), SL = mat(lightenHex(STONE_OF[key], 0.17)), T = mat(TRIM_OF[key], { contrast: 1.15 }), C = mat(CLOTH_OF[key]);
  const P = { deck, r: R, sq: SQ, wall, band }, under = bandEdge(P);
  const FB = 14 - (r + 6) * SQ, FT = FB - 4, doorY = Math.round(FT + 1 + r * SQ);     // the footing's bottom and top rings, the door's sill

  // ---- the ground and the footing
  back.part(); back.ellipse(0, FB + 4, r + 10, 8, r4 === "ab" ? SCORCH : EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  if (r4 === "ab") { back.part(); back.ellipse(1, FB + 5, r + 6, 6, ASH, -49, { round: 0.2, noLine: true, vb: -0.1 }); }   // scorched black round the foot
  drum(back, { top: FT, bot: FB, r: r + 5, r2: r + 6, sq: SQ, m: SL, z: -1, st, seed: seed + 4, course: 5, strings: [[FT, 1.5, SL]] });

  // ---- the shaft: a gilt string course on the grown forms; Dragonbreath's is cracked and licked with soot
  const strings = grown ? [[DY + 47, 2, T]] : [];
  const soot = r4 === "ab" ? (x, h) => { const k = Math.sin(x * 0.55 + seed) * 5 + Math.sin(x * 1.3 + seed * 2) * 3; return h > FT - 9 - k ? -1 : 0; } : null;
  drum(back, { top: deck, bot: FT + 1, r, r2: r + 1.5, sq: SQ, m: S, z: 0, st, seed: seed + 13, under, underLen: 5, strings, stain: soot });
  if (r4 === "ab") for (const [x0, y0, n] of [[-r + 6, DY + 30, 7], [r - 9, DY + 52, 6], [-4, DY + 62, 5]]) for (let i = 0; i < n; i++) back.tone(x0 + (i % 2) + Math.floor(i / 3), y0 + i * 1.6, -1);   // cracks
  door(back, 0, doorY, 10, 15, SL, el === "storm" ? GREY_OAK : OAK, el === "storm" ? IRON : T, 2, { vous: rich, mRing: T });
  const glass = st.lit ? flat(WIN_OF[el], { emis: true }) : false;
  archWindow(back, 0, DY + 16, 6, 10, SL, 2, { glow: glass, glass: true, bars: rich && grown });
  if (level >= 2) archWindow(back, 0, DY + 39, 6, 8, SL, 2, { glow: glass, glass: true });
  // the banners, hung under the walk either side of the window (the grown forms)
  if (grown) {
    const dev = el === "fire" ? FLAME_DEV : el === "storm" ? BOLT_DEV : STAR, bx = Math.round(r * 0.6);
    for (const s of [-1, 1]) wallBanner(back, s * bx, Math.ceil(under(bx)) + 3, 8, 22, C, T, 2, { device: dev, deviceY: 5, tail: r4 === "ab" ? "flat" : "point", stripe: true });
  }
  if (st.moss && el !== "fire") ivy(back, -r + 3, doorY - 1, br ? 16 : 26, 3, { seed: seed + 6, side: 1, col: "#5a8a4c", col2: "#3f6a44" });

  // ---- what rises at the BACK of the walk, behind the mage
  const cx = R - 4;                                    // the corners: the old painter's x +- (pw - 2)
  if (!br && level === 1) lectern(back, -(R - 11), deck + 2, 1.5);
  else if (!br && level === 3) crescent(back, 0, FEET - 34, 23, -5, T, ORB_OF.base);
  else if (r4 === "aa") {
    // the throne-back: a gilded arch framing crimson velvet, a gilt sunburst, five cups round its crest
    const ty = DY - 62, tr = 20, V = mat(darkenHex(CLOTH_OF.aa, 0.45));
    const arch = (k) => { const pts = [[-(tr - k), deck - 2]]; for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += Math.PI / 16) pts.push([Math.cos(a) * (tr - k), ty + Math.sin(a) * (tr - k)]); pts.push([tr - k, deck - 2]); return pts; };
    back.part(); back.poly(arch(0), T, -6, { round: 0.35 });
    back.part(); back.poly(arch(4), V, -5.9, { round: 0.25, cast: 0, floor: 1 });
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; back.dot(Math.cos(a) * (tr - 8), ty + Math.sin(a) * (tr - 8), T, -5.8, { fix: 3, cast: 0 }); }
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; bowl(back, Math.cos(a) * 18.4, ty + Math.sin(a) * 18.4 - 2, 4.4, T, -5.5 + i * 0.01); }
  } else if (r4 === "bb") {
    // the crown-ring on its pole: a gilt hoop with eight spikes
    const ry0 = DY - 68, GR = mat("#e8c14a", { contrast: 1.2 });
    back.part(); back.capsule(0, deck - 2, 1.6, 0, ry0 + 20, 1.4, GILT_D, -6.2);
    back.part();
    for (let a = 0; a < Math.PI * 2; a += 0.03) back.ellipse(Math.cos(a) * 20, ry0 + Math.sin(a) * 20, 2.2, 2.2, GR, -6, { round: 0.85 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); back.poly([[c * 20 - s * 3, ry0 + s * 20 + c * 3], [c * 28, ry0 + s * 28], [c * 20 + s * 3, ry0 + s * 20 - c * 3]], GR, -6, { n: [c * 0.5 - 0.2, s * 0.5 - 0.3, 0.75] }); }
  } else if (br === "b" && !r4) {
    // the copper lightning rod at the east corner, two bands and a steel ball
    const x = R - 7;
    back.part(); back.capsule(x, deck - 3, 1.8, x, DY - 67, 1.5, COPPER, -4);
    back.part(); back.rect(x - 2.5, DY - 48, 5, 2, COPPER_L, -3.9, { n: [0, -0.4, 0.9] }); back.rect(x - 2.5, DY - 36, 5, 2, COPPER_L, -3.9, { n: [0, -0.4, 0.9] });
    back.part(); back.ellipse(x, DY - 70, 3.2, 3.2, STEEL, -3.8, { round: 0.95 });
  }
  disc(back, { y: deck, r: R - 1, sq: SQ, m: SL, z: 0.5, lip: wall + 1 });
  // a gilt ring inlaid in the walk, round his feet
  for (let a = 0; a < Math.PI * 2; a += 0.04) back.dot(Math.cos(a) * (R - 9), deck + Math.sin(a) * (R - 9) * SQ, T, 0.6, { n: [0, -0.8, 0.6], cast: 0 });
  parapet(back, front, { ...P, m: S, mTrim: T, st, seed: seed + 3, mer: { n: 12, duty: 0.5, h: level === 1 && !br ? 5 : 6, ph: 0.75 } });

  // ---- the corners of the walk, either side of him
  if (!br && level === 2) for (const s of [-1, 1]) finial(front, s * (R - 3), deck + 4, 9, 12, T, false);
  if (!br && level === 3) for (const s of [-1, 1]) finial(front, s * (R - 3), deck + 4, 14, 12, T, ORB_OF.base);
  if (r4 === "bb") for (const s of [-1, 1]) finial(front, s * (R - 3), deck + 4, 11, 12, T, ORB_OF.bb);
  if (el === "fire" && r4 !== "ab") for (const s of [-1, 1]) {                         // braziers on stone posts (gilded on the throne)
    post(back, s * cx, DY - 34, deck - 1, 3, S, T, 3, seed + s);
    bowl(back, s * cx, DY - 37, r4 ? 5.4 : 4.6, r4 === "aa" ? mat("#b8862a", { contrast: 1.15 }) : IRON, 3.2);
  }
  if (r4 === "ab") for (const s of [-1, 1]) {                                          // horned dragon skulls on posts
    post(back, s * cx, DY - 30, deck - 1, 3.4, S, T, 3, seed + s);
    back.part();
    back.stamp(SKULL, s * cx, DY - 36, { B: { m: BONE }, b: { m: BONE, bias: -1 }, h: { m: HORN }, o: { m: DARK, fix: 0 }, n: { m: DARK, fix: 0 }, t: { m: BONE, fix: 4 } }, 3.4, { ax: 11, ay: 17, ball: [11, 16, 10, 13] });
  }
  if (r4 === "ba") for (const s of [-1, 1]) coil(back, s * cx, deck - 1, DY - 59, 3);

  // ---- the foot: what stands on the open ground before the footing
  if (el === "storm") for (const s of [-1, 1]) runeStone(back, s * 21, 19, 4);
  if (r4 === "aa") {
    // a crimson runner from the door, gilt-edged, between two gilt fire-bowls on squat plinths
    back.part(); back.poly([[-5, doorY], [5, doorY], [7, 25], [-7, 25]], C, 2.4, { n: [0, -0.75, 0.66], cast: 0 });
    for (const s of [-1, 1]) for (let y = doorY; y < 25; y++) back.dot(s * (5.2 + ((y - doorY) / (25 - doorY)) * 1.6) - 0.5, y + 0.5, T, 2.5, { n: [0, -0.75, 0.66], cast: 0 });
    for (const s of [-1, 1]) { post(back, s * 18, 13, 20, 3.6, SL, T, 4, seed + 9 + s); bowl(back, s * 18, 11, 6, T, 4.2); }
  }
  if (!br) { back.part(); for (const [dx, dy, m] of [[0, 0, PETAL], [2, 1, LEAF], [-2, 1, LEAF], [3, -1, PETAL], [-3, 0, PETAL], [1, 2, LEAF]]) back.dot(-r - 13 + dx, 13 + dy, m, 4, { cast: 0, n: [0, -0.6, 0.8] }); }   // a posy by the foot
  for (const s of [-1, 1]) if (!(el === "storm") && r4 !== "aa") boulder(back, s * (r + 7), FB + 7, 3, 2.2, SL, 3);
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const el = br === "a" ? "fire" : br === "b" ? "storm" : "arcane";
  const G = geom({ level, branch: br, rank4: o.rank4 || null }), { DY, R, r, FEET } = G, grown = level >= 3 || !!br;
  spire(back, front, st, { level, br, r4, key, el, seed: (o.seed || 0) * 7 + level, G });
  const orb = ORB_OF[key], cx = R - 4, live = [], lights = [];
  // his orb on the crown: one light east of him and one west, the hall file strengthens the side he faces
  const oy = FEET - (level === 1 && !br ? 32 : 46);
  lights.push({ key: "orb", x: 16, y: oy, r: 62, col: orb }, { key: "orbW", x: -16, y: oy, r: 62, col: orb, k: 0 });
  if (el === "fire" && r4 !== "ab") for (const s of [-1, 1]) {
    live.push({ kind: "flame", x: s * cx, y: DY - 38, w: r4 ? 6 : 5, h: r4 ? 10 : 9 });
    lights.push({ key: "torch", x: s * cx, y: DY - 41, r: 20, col: "#ffa040", a: 0.7 });
  }
  if (r4 === "aa") { for (const s of [-1, 1]) live.push({ kind: "flame", x: s * 18, y: 10, w: 5, h: 8 }); lights.push({ key: "throne", x: 0, y: DY - 70, r: 40, col: "#ff9a3a", k: 0.4 }); }
  if (r4 === "ab") for (const s of [-1, 1]) lights.push({ key: "skull", x: s * cx, y: DY - 37, r: 15, col: "#ff8a2a", a: 0.8, k: 0.6 });
  if (r4 === "ba") for (const s of [-1, 1]) lights.push({ key: "coil", x: s * cx, y: DY - 59, r: 18, col: "#a8f0f8", a: 0.8, k: 0.6 });
  if (r4 === "bb") lights.push({ key: "crown", x: 0, y: DY - 68, r: 34, col: "#f0e070", k: 0.4 });
  // a twinkle or two in the orb's colour, off the stone
  if (grown) for (const [x, y, ph] of [[-R - 5, DY + 22, 0], [R + 6, DY + 44, 3], [-r - 7, -18, 5]]) live.push({ kind: "spark", x, y, col: orb, ph, layer: "front" });
  return {
    live, lights,
    // the mage, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [{ fig: "mage", x: 0, y: FEET, dir: 1, variant: `${br ? 3 : level}|${key}`, orb }],
    shadow: { rx: r + 9, ry: 8, dx: 7, dy: 12 },
  };
};

// ---- small live pieces the hall file stamps itself (pix/halls.js pixSprite) --------------------
// one frame of a flame of the crown of flames (the hall file lights one per shot): size 0 small .. 2 the firestorm's
export const crownFlame = (size, f) => flameFrames([{ w: 4, h: 7 }, { w: 5, h: 10 }, { w: 7, h: 14 }][size])[f % 6];
// level two's floating crystal, in the orb's colour: a lit lozenge with a bright facet
export const crystal = (col = ORB_OF.base) => {
  const px = new Pix(9, 15, 4, 7), C2 = flat(col, { emis: true }), C1 = flat(lightenHex(col, 0.5), { emis: true }), C3 = flat(darkenHex(col, 0.25), { emis: true });
  for (let j = -6; j <= 6; j++) { const w = Math.round(3 * (1 - Math.abs(j) / 6.5)); for (let i = -w; i <= w; i++) px._put(i + 4, j + 7, i < 0 && j < 2 ? C1 : i > 0 && j > 0 ? C3 : C2, 1, 0, 0, 1, {}); }
  return px.resolve({ line: "tint" });
};
// the tome that hangs open by the spire between battles, bound in the form's cloth
export const tome = (key = "base") => bookFrames(CLOTH_OF[key] || CLOTH_OF.base)[0];
