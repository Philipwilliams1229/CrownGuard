// ============ PIX HALL: the Falconry, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/falconry.js asks for
// it through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, the roost's stone shown stone by stone, a lamp behind the window.
//
// THE MISTRESS DECIDES THE BUILDING. engine/muzzles.js falconPerch() says how high the roost
// is (h) and where her feet are (my); wheelAt() hangs the wheel of birds off the same number,
// and a cast bird leaves her glove from it. So this file reads falconPerch and builds round
// it. Everything is in ART PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y),
// y down: A = -2h is the old roost's top edge, her feet are at FEET = 2 my (A - 4; A - 6 on
// the timber perch), the deck's centre two pixels behind them, and the footing meets the
// turf at +14. The old painter's numbers are kept, x2: the T-perch mast at +24, the gallows
// post at +22 with the cage hung at +37, the lightning rod at -18 (its tip at A - 76, where
// the hall file's crackle starts), the spire at -21 with the golden hawk's eye at
// (-15, A - 53), where the hall file paints the eye that never closes.
//
// The forms, as today's hall has them: a timber perch-scaffold with a ladder (1); a round
// stone roost with a crenellated rim and a perch pole off it (2); a taller roost with a
// hooded bird asleep on a T-perch mast (3); the Royal Aviary's gallows arm and gilded
// birdcage (a); the Skyknight's great nest of branches with its egg, the empty saddle on its
// rack and the lance (aa); the Storm Falcons' blue-grey roost and lightning rod (ab); the
// Warhawk Court's purple hawk banners and gilt rim (b); Kingsight's spire and golden hawk
// (ba); Talon Rain's wine banners and a rim spiked with iron talons (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the pennant (`live`), the lamp behind the window and the two
// lights the hall file drives ("eye", "rod"), and everything the hall file still paints
// itself: the mistress, every bird on the wheel, the glove or the stoop, the eye's glint,
// the rod's crackle, the drifting feather. The hooded bird on the mast and the bird in the
// cage never move (the old roost baked them too), so they are part of the picture.
import { mat, flat } from "./pix.js";
import { falconPerch } from "../../engine/muzzles.js";
import { STYLES, drum, disc, parapet, bandEdge, beam, door, archWindow, wallBanner, ivy, boulder, WARM, hash } from "./hall-kit.js";

export const BOX = { w: 116, h: 200, ox: 56, oy: 172 };
export const LABEL = "Falconry";
const SQ = 0.38;                 // how much the camera squashes a circle: one value for every ring of the hall

const STONE_OF = { base: "#9a9488", a: "#9a9488", aa: "#9a9488", ab: "#7a8494", b: "#9a9488", ba: "#9a9488", bb: "#9a9488" };
const FLAG_OF = { base: "#a06a3a", a: "#3a5a8a", aa: "#3a5a8a", ab: "#7a8494", b: "#5a4a8c", ba: "#5a4a8c", bb: "#7a2a4a" };
const lightenHex = (h, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * k).toString(16).padStart(2, "0")).join("");
const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48"), PLANK = mat("#9a6e42"), PERCH = mat("#6a4a2e");
const IRON = mat("#4a4e58"), IRON_L = mat("#8a909c", { contrast: 1.2 }), ROD = mat("#6a6a74", { contrast: 1.2 }), COPPER = mat("#b08a4a", { contrast: 1.15 }), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const GOLD = mat("#d8b34a", { contrast: 1.15 }), GOLD_L = mat("#f0d27a"), ROPE = mat("#c8b48a"), EARTH = mat("#7c6242");
const HAWK = mat("#7a5a3a"), HAWK_D = mat("#5a4028"), CREAM = mat("#e8dfc6"), HOOD = mat("#8a2f2a"), BEAK = flat("#e8c14a"), DARK = flat("#2a2430"), AMBER = flat("#6a4a1a");
const TWIG = [mat("#6a4a2e"), mat("#8a6a3a"), mat("#a5824a")], LINING = mat("#d8c8a0"), EGG = mat("#e8e0cc"), SPECK = flat("#a89a7a"), LEATHER = mat("#8a5230");
const BANNER_HAWK = ["#...#", "##.##", ".###.", "..#.."];                     // a hawk on the wing, in gold
// the hooded bird asleep on the T-perch: gold plume, red hood, a brown back
const HOODED = [
  "....p....",
  "....pp...",
  "...rrr...",
  "..rrrrr..",
  "..rrrrry.",
  "..rrrr.y.",
  "...ccc...",
  "..bbbbb..",
  ".bbbbbbb.",
  ".bbwbbbb.",
  ".bbwbbbb.",
  ".bbwbbbb.",
  "..bwbbb..",
  "..tbbb...",
  "..tt.....",
];
// Kingsight's golden hawk: a hawk in profile on the spire, facing east. Cells (13..14, 6..7)
// are the eye's socket: the hall file paints the eye itself there, live.
const KING = [
  ".....................",
  "...........GGGG......",
  "..........GGGGGG.....",
  ".........GGGGGGGG....",
  ".........GGGGGGGGG...",
  "........GGGGddddGG...",
  "........GGGGGeeGGYY..",
  "........GGGGGeeGYYYY.",
  ".......GGGGGGGGG.yYY.",
  "......GGGGGGGGGG..y..",
  ".....GGgGGGGGGGG.....",
  "....GGgGGGGGGGGG.....",
  "...GGgGGgGGGGGGG.....",
  "...GgGGgGGGGGGG......",
  "..GGgGGgGGGGGGG......",
  "..GgGGgGGgGGGG.......",
  ".GGgGGgGGGGGG........",
  ".GgGGgGGGGGG.........",
  "GGgGG.GGyGyG.........",
  "Gg.gggggggggggg......",
];

const bed = (px, rx) => { px.part(); px.ellipse(0, 11, rx, 8, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 }); };

// ---- level 1: the timber perch --------------------------------------------------------------
// Four legs, crossed braces, a ladder up the front, a plank deck with a rail round it.
const perchPost = (back, front, G) => {
  const { A } = G, R = 22, r = 18, top = A - 15;
  bed(back, r + 8);
  for (const s of [-1, 1]) { boulder(back, s * (r + 1), 13, 3.6, 2.6, mat("#9a9488"), 2); beam(back, s * (R - 9), A - 4, s * (r - 7), 7, 3, OAK_D, -6, { grain: false }); }   // far legs
  beam(back, -(r - 6), A + 30, r - 6, A + 26, 2, OAK_D, -6.5, { grain: false });
  beam(back, -r + 2, 5, r - 4, A + 10, 3, TIMBER, -3, { seed: 5 }); beam(back, r - 2, 5, -r + 4, A + 10, 3, OAK, -3.2, { seed: 6 });      // cross braces
  for (const s of [-1, 1]) beam(back, s * (R - 6), A + 2, s * r, 12, 5, TIMBER, -2, { seed: s + 3 });                                       // near legs
  for (const dx of [-5, 4]) beam(back, dx, 12, dx, A + 2, 2, TIMBER_L, -1, { grain: false });                                               // the ladder
  for (let y = 6; y > A + 6; y -= 6) beam(back, -5, y, 4, y, 1.2, TIMBER_L, -1.1, { grain: false });
  // the deck: its top in the sun, a thick front edge, joist ends under it
  back.part(); back.poly([[-R + 3, top], [R - 3, top], [R, A - 2], [-R, A - 2]], PLANK, 0, { n: [0, -0.8, 0.6] });
  for (let x = -R + 5; x < R; x += 6) back.toneLine(x + 1, top, x, A - 2, -1);
  back.part(); back.rect(-R, A - 2, R * 2, 6, TIMBER, 0.2, { n: [0, -0.1, 0.99] });
  back.toneLine(-R, A - 2, R, A - 2, 1); back.toneLine(-R, A + 3, R, A + 3, -1);
  for (let x = -R + 4; x <= R - 4; x += 7) { back.tone(x, A, -1); back.tone(x, A + 1, -1); }
  for (let x = -R + 5; x <= R - 6; x += 10) { back.part(); back.rect(x, A + 4, 4, 3, OAK, 0.1, { n: [0, 0, 1] }); }
  // the far rail, behind her knees
  for (const s of [-1, 1]) beam(back, s * (R - 4), top + 1, s * (R - 4), top - 11, 2, OAK, 0.3, { grain: false });
  beam(back, -R + 3, top - 11, R - 3, top - 11, 2, TIMBER, 0.4, { grain: false });
  // a leather lure and its line, hung on the far rail
  back.part(); back.line(R - 9, top - 10, R - 9, top - 5, ROPE, 0.5, { cast: 0 }); back.ellipse(R - 9, top - 3.5, 1.6, 2.2, LEATHER, 0.6, { round: 0.8 });
  // the near rail, over her boots
  for (const s of [-1, 1]) beam(front, s * (R - 1), A + 2, s * (R - 1), A - 11, 3, OAK, 6, { grain: false });
  beam(front, -R, A - 11, R, A - 11, 2, TIMBER, 6.2, { grain: false });
};

// ---- the pieces a form adds -------------------------------------------------------------------
const hoodedBird = (px, x, y, z) => {
  px.part();
  px.stamp(HOODED, x, y, { p: { m: GOLD, fix: 3 }, r: { m: HOOD }, y: { m: BEAK }, c: { m: CREAM }, b: { m: HAWK }, w: { m: HAWK_D }, t: { m: HAWK_D } }, z, { ax: 4, ay: 13, ball: [4, 8, 5.5, 8] });
};
// the gilded cage: bars you can see between, a domed top, a bird inside
const cage = (px, cx, top, z) => {
  px.part(); px.ellipse(cx - 1, top + 15.5, 3.4, 3.6, HAWK, z - 0.3, { round: 0.8 }); px.ellipse(cx + 0.5, top + 11.5, 2, 1.9, CREAM, z - 0.25, { round: 0.8, cast: 0 });
  px.dot(cx + 2.5, top + 12, BEAK, z - 0.2, { cast: 0 }); px.dot(cx + 0.5, top + 11, DARK, z - 0.2, { cast: 0 });
  px.part();
  const dome = (dx) => top + 8 * (1 - Math.sqrt(Math.max(0, 1 - (dx / 8.6) ** 2)));
  for (let dx = -8; dx <= 8; dx++) px.dot(cx + dx + 0.5, dome(dx + 0.5), GOLD, z, { cast: 0, bias: dx < 0 ? 1 : 0 });
  for (const dx of [-8, -4, 0, 4, 8]) for (let y = Math.floor(dome(dx + 0.5)); y < top + 20; y++) px.dot(cx + dx + 0.5, y + 0.5, dx < 0 ? GOLD_L : GOLD, z, { cast: 0, noLine: Math.abs(dx) < 8 });
  for (let dx = -7; dx <= 7; dx++) px.dot(cx + dx + 0.5, top + 10.5, GOLD, z, { cast: 0, noLine: true, bias: -1 });
  px.rect(cx - 9, top + 20, 18, 2, GOLD, z + 0.1, { n: [0, -0.4, 0.9] });
  px.dot(cx + 0.5, top - 0.5, GOLD, z, { fix: 3 });
};
// an iron talon: a claw that hooks toward the sun, root at (x, y)
const talon = (px, x, y, z) => {
  px.part();
  px.capsule(x, y, 2.2, x + 2.5, y - 6, 1.8, IRON, z, { cast: 1 });
  px.capsule(x + 2.5, y - 6, 1.8, x + 1.5, y - 11, 1.2, IRON, z, { cast: 1 });
  px.capsule(x + 1.5, y - 11, 1.2, x - 2, y - 15, 0.6, IRON_L, z, { cast: 1 });
};
// the Skyknight's nest: a bowl of woven branches wider than the shaft, lined pale, one egg
const nestOn = (back, G, seed) => {
  const { A } = G, cy = A - 5;
  for (let i = 0; i < 22; i++) {                                              // the branches, splayed up and out all round
    const a = (i / 22) * Math.PI * 2 + 0.2 + (hash(i, seed) - 0.5) * 0.2, r1 = 30 + (i % 3) * 4.8, cs = Math.cos(a), sn = Math.sin(a);
    beam(back, cs * 15, cy + 1 + sn * 5.2, cs * r1, cy - 5 + sn * 10, 2, TWIG[i % 3], sn < 0 ? 2.4 : 3.6, { grain: false });
  }
  back.part(); back.ellipse(0, cy, 27, 10, TWIG[1], 3, { round: 0.75 });
  for (let i = 0; i < 9; i++) back.toneLine(-23 + i * 5.4, cy + 6 - Math.abs(i - 4) * 0.7, -17 + i * 5.4, cy - 1, i % 2 ? -1 : 1);        // the weave
  back.part(); back.ellipse(0, cy - 4, 17.5, 5.6, LINING, 3.2, { round: 0.2, cast: 0 });
  for (let x = -14; x <= 14; x++) back.tone(x + 0.5, cy - 8.5 + Math.abs(x) * 0.08, -1);                                                   // the far lip's shadow
  back.part(); back.ellipse(6, A - 14, 5, 6.2, EGG, 3.6, { round: 0.9 }); back.dot(4.5, A - 16.5, SPECK, 3.7, { cast: 0 }); back.dot(7.5, A - 12.5, SPECK, 3.7, { cast: 0 }); back.dot(5.5, A - 11.5, SPECK, 3.7, { cast: 0 });
  // the empty saddle on its rack, and the lance
  beam(back, -23, A - 3, -23, A - 16, 3, OAK, 3.8, { grain: false });
  back.part(); back.poly([[-31, A - 16], [-28, A - 20], [-23, A - 22], [-18, A - 20], [-15, A - 16], [-17, A - 11], [-29, A - 11]], LEATHER, 4, { round: 0.6, ny: -0.3 });
  back.rect(-27, A - 15, 8, 2, GOLD, 4.1, { n: [0, -0.3, 0.95], cast: 0 });
  beam(back, 21, A - 3, 30, A - 56, 2.6, OAK, 3.8, { grain: false });
  back.part(); back.poly([[28.4, A - 55], [31.8, A - 67], [33, A - 54.4]], STEEL, 3.9, { n: [-0.3, -0.3, 0.9] });
};

// ---- the stone roost --------------------------------------------------------------------------
const MUTES = [[13, 26], [16, 17], [-17, 22], [-9, 15]];                             // [x, how far down]
const MER = { n: 10, duty: 0.54, h: 7, ph: 0.77 };                            // a crenel at the middle of the front: her boots show in it
const roost = (back, front, G, st, F) => {
  const { lvl, A, r, R, deck } = G, { br, r4, key, seed } = F;
  const aviary = br === "a", court = br === "b", nest = r4 === "aa", rich = st.stones === 2;
  const S = mat(STONE_OF[key]), SL = mat(lightenHex(STONE_OF[key], 0.16));
  const P = { deck, r: R, sq: SQ, wall: 6, band: 8 }, ry = R * SQ;
  const under = nest ? (x) => A - 4 + 10 * Math.sqrt(Math.max(0, 1 - (x / 28) ** 2)) : bandEdge(P);
  bed(back, r + 9);
  drum(back, { top: 0, bot: 3, r: r + 5, r2: r + 6, sq: SQ, m: SL, z: -1, st, seed: seed + 4, course: 5, strings: [[0, 1.5, SL]] });
  // the shaft: a string course over the door from level 3, a copper band on the Storm Falcons'
  drum(back, {
    top: deck, bot: 1, r, r2: r + 1.5, sq: SQ, m: S, z: 0, st, seed: seed + 7, course: 6, under, underLen: 5,
    strings: lvl >= 3 ? [[-31, 2, r4 === "ab" ? COPPER : SL]] : [], stain: (x, h) => (Math.abs(x) < 2 && h > A + 30 && h < A + 36 ? -1 : MUTES.some(([mx, len]) => Math.abs(x - mx) < 1 && h > deck + 10 && h < deck + 12 + len) ? 1 : 0),
  });
  door(back, 0, 9, 10, 17, SL, OAK, IRON, 2, { vous: rich });
  // the window, a lamp behind it
  if (st.lit) archWindow(back, 0, A + 22, 5, 12, SL, 2, { glow: WARM, frame: true }); else { back.part(); back.rect(-2, A + 22, 4, 13, DARK, 2.2, { cast: 0 }); }
  if (court) {
    // hanging banners down the face, a gold hawk on each
    const cloth = mat(r4 === "bb" ? "#7a2a4a" : "#5a4a8c");
    for (const dx of [-14, 11]) wallBanner(back, dx, Math.ceil(under(dx)) + 2, 10, 22, cloth, GOLD, 2, { device: BANNER_HAWK, deviceY: 6 });
  }
  if (st.moss) {
    if (nest) { ivy(back, -r + 3, 9, 38, 3, { seed: seed + 9, side: 1, spread: 3.2 }); ivy(back, r - 3, 9, 26, 3, { seed: seed + 3, side: -1 }); }
    else if (aviary && r4 !== "ab") ivy(back, -r + 3, 9, 30, 3, { seed: seed + 9, side: 1 });
    else if (!br) ivy(back, r - 4, 9, lvl >= 3 ? 30 : 18, 3, { seed: seed + 9, side: -1 });
  }
  if (nest) { nestOn(back, G, seed); return; }

  // ---- the deck and its rim
  disc(back, { y: deck, r: R - 1, sq: SQ, m: SL, z: 0.5, lip: 7 });
  parapet(back, front, { ...P, m: S, mTrim: court ? GOLD : SL, st, seed: seed + 3, mer: MER });
  if (r4 === "bb") {
    // Talon Rain: an iron talon on every merlon (the front ones only out at the sides, clear of her legs)
    const step = (Math.PI * 2) / MER.n;
    for (let k = 0; k < MER.n; k++) {
      const a = (k + MER.duty / 2 - MER.ph) * step, x = R * Math.sin(a), cs = Math.cos(a);
      if (cs < -0.15 && Math.abs(x) > 5) talon(back, x - 1, deck - 13 + ry * cs + 1, 1.5);
      else if (cs > 0.15 && Math.abs(x) > 13) talon(front, x - 1, deck - 13 + ry * cs + 1, 10.5);
    }
  }
  // ---- what stands on the deck, behind and beside her
  if (!br && lvl >= 3) {
    // the T-perch mast, a hooded bird asleep on it
    beam(back, 24, deck, 24, A - 44, 3, OAK, 2, { bands: [0.4], bandM: ROPE, grain: false });
    beam(back, 16, A - 42, 34, A - 42, 2.4, OAK, 2.1, { grain: false });
    hoodedBird(back, 29, A - 43, 2.5);
  }
  if (r4 === "ab") {
    // the lightning rod: iron, copper bands, a copper point and two cross pieces
    beam(back, -18, deck - 4, -18, A - 64, 2.6, ROD, 2, { bands: [0.35, 0.7], bandM: COPPER, grain: false });
    back.part(); back.poly([[-20.5, A - 64], [-18, A - 76], [-15.5, A - 64]], GOLD, 2.1, { n: [0, 0, 1] });
    back.rect(-24, A - 48, 12, 2, COPPER, 2.1, { n: [0, -0.4, 0.9] }); back.rect(-22, A - 53, 8, 2, COPPER, 2.1, { n: [0, -0.4, 0.9] });
  }
  if (aviary) {
    // the gallows arm on the deck's east side, the gilded cage hung from it clear of the wall
    beam(back, 22, deck - 2, 22, A - 25, 3.6, OAK, 2, { grain: false });
    beam(back, 19, A - 23, 41, A - 23, 3, OAK, 2.1, { grain: false });
    beam(back, 22, A - 11, 32, A - 22, 2, OAK_D, 1.9, { grain: false });
    back.part(); back.line(37, A - 21, 37, A - 15, ROPE, 12, { cast: 0 });
    cage(back, 37, A - 14, 12);
  }
  if (r4 === "ba") {
    // the spire on the deck's west side and its golden hawk
    drum(back, { cx: -21, top: A - 40, bot: deck - 5, r: 5, sq: SQ, m: S, z: 2, st: STYLES.A, seed: seed + 21, course: 5, stoneW: 0.8, strings: [[A - 40, 2, SL], [A - 22, 1.5, GOLD]] });
    back.part();
    back.stamp(KING, -29, A - 60, { G: { m: GOLD }, g: { m: GOLD, bias: -1 }, d: { m: GOLD, bias: -2 }, e: { m: AMBER, fix: 0 }, Y: { m: GOLD_L }, y: { m: GOLD_L, bias: -1 } }, 3, { ball: [10, 10, 12, 12] });
  }
  // a perch pole off the rim, a short bar at its tip
  if (!aviary && r4 !== "ba") {
    beam(back, R - 2, deck + 4, R + 7, deck - 13, 2, PERCH, 2.2, { grain: false });
    beam(back, R + 3, deck - 13, R + 11, deck - 13, 2, PERCH, 2.3, { grain: false });
  }
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], br = o.branch || null, lvl = br ? 3 : o.level || 3, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const { h, my } = falconPerch({ level: lvl, branch: br, x: 0, y: 0 });
  const A = -2 * h, FEET = 2 * my;
  const G = { lvl, A, FEET, deck: FEET - 2, r: lvl >= 3 ? 23 : 21, R: lvl >= 3 ? 26 : 24 };
  const post = lvl === 1, nest = r4 === "aa";
  if (post) perchPost(back, front, G); else roost(back, front, G, st, { br, r4, key, seed: (o.seed || 0) * 7 + lvl });
  // what moves: the pennant on the rim's west side (east for Kingsight, whose spire stands west)
  const live = [], lights = [];
  if (post) live.push({ kind: "pennant", x: -21, y: A - 9, col: FLAG_OF[key], pole: 9, len: 12, dir: -1 });
  else if (nest) live.push({ kind: "pennant", x: 29, y: A - 46, col: FLAG_OF[key], pole: 0, len: 12, dir: -1 });   // a pennon on the lance
  else if (r4 === "ba") live.push({ kind: "pennant", x: 23, y: A - 14, col: FLAG_OF[key], pole: 15, len: 13 });
  else live.push({ kind: "pennant", x: -24, y: A - 14, col: FLAG_OF[key], pole: 15, len: 13, dir: -1 });
  if (!post) lights.push({ key: "torch", x: 0, y: A + 28, r: 13, col: "#ffc060", a: 0.6 });        // the lamp behind the window, on the stone round it
  if (r4 === "ba") lights.push({ key: "eye", x: -15, y: A - 53, r: 17, col: "#f8d870", a: 0.8 });   // the golden eye (the hall file pulses it)
  if (r4 === "ab") lights.push({ key: "rod", x: -18, y: A - 74, r: 24, col: "#b8e0ff" });           // the rod's crackle (the hall file fires it)
  return {
    live, lights,
    // the mistress, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: nest ? [] : [{ fig: "mistress", x: 0, y: FEET, dir: 1, clip: "idle", variant: br === "b" ? "court" : br === "a" ? "royal" : "mews" }],
    shadow: { rx: post ? 24 : G.r + 11, ry: 8, dx: 7, dy: 14 },
  };
};
