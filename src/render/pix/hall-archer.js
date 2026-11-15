// ============ PIX HALL: the Archer hall, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/archer.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B of the concept
// round the owner picked ("B, worked"): thin tinted line, one sun, stone by stone, ivy, lit
// windows, a torch that lights the wall.
//
// THE CREW DECIDES THE BUILDING. engine/towers.js archerLayout() says how high the walk is
// (h), how wide the shaft and the walk are (hw, pw) and where each archer's feet are; the
// engine starts every arrow from those numbers, so this file reads them and builds round
// them. Everything is in ART PIXELS (two to a board unit) from the hall's ANCHOR (t.x, t.y),
// y down: the footing meets the turf at +14, the walk's front edge is DY = -2h, an archer
// stands at (2 dx, DY + 6 + 2 dy).
//
// The forms, as today's hall has them: a timber watch-post (1), a stone storey under a
// timber gallery (2), the stone tower (3); the Ranger Company's mossy tower with a
// leaf-thatched awning (a), the Briar Rangers' thorns and venom cauldron (aa), the Hawkeye
// Conclave's hawk mast (ab); the Master Longbowman's slender pale tower between two capped
// pinnacles (b), the Ballista's iron-hooped tower and bolt rack (ba), the Dragonslayer's
// crimson caps and wyrm skull (bb).
//   build({ level, branch, rank4, seed, style })   style: "B" (the game) | "A" | "C" (the concept sheet)
// What moves is NOT baked: the spec's `live` list (pennant, torch flame), its `lights`
// (the torch on the wall), and what the hall file still paints itself (the crew, the siege
// bow below, the hawks, the cauldron's bubbles).
import { Pix, mat, flat } from "./pix.js";
export { SIEGE_AIM } from "./fig-engineer.js";
import { archerLayout } from "../../engine/towers.js";
import { STYLES, drum, disc, parapet, bandEdge, cone, beam, door, loop, archWindow, wallBanner, ivy, boulder, WARM, hash } from "./hall-kit.js";

export const BOX = { w: 104, h: 258, ox: 52, oy: 222 };
export const LABEL = "Archer hall";
export const SHEET_DY = -8;      // the concept sheet stands halls on their base line; this one is drawn from the anchor, 8 px above it
const SQ = 0.38;                 // how much the camera squashes a circle: one value for every ring of the hall

const STONE_OF = { base: "#9a9488", a: "#8f9484", aa: "#83887a", ab: "#98a09c", b: "#bdb5a3", ba: "#8a8782", bb: "#b3a594" };
const FLAG_OF = { base: "#a04a3f", a: "#5c8a44", aa: "#8e2f3a", ab: "#9fc4dc", b: "#3f5a8c", ba: "#6c727e", bb: "#a8302a" };
const lightenHex = (h, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * k).toString(16).padStart(2, "0")).join("");
const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48"), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), ROPE = mat("#b89a64");
const RED = mat("#a04a3f"), GOLD = mat("#d8b34a"), STRAW = mat("#d8b868"), WHITE = mat("#e8e0c8"), EARTH = mat("#7c6242"), EARTH_D = mat("#5a5a3a");
const BONE = mat("#e8dfc6"), HORN = mat("#b8ac8c"), DARK = flat("#2a2030"), COAL = flat("#e8483a", { emis: true }), BERRY = mat("#c8383a"), POT = mat("#3a3a44"), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const DEVICE = {
  base: ["..#..", ".###.", "#.#.#", "..#..", "..#..", ".#.#."],            // an arrow
  a: [".#.", "###", "###", ".#.", ".#."],                                  // an oak leaf
  aa: [".##.", "####", ".##.", "..o.", "..o."],                            // a briar rose
  ab: [".###.", "##o##", ".###."],                                         // an open eye
  b: ["..#..", ".###.", "..#..", "..#..", "..#.."],                        // a longbow shaft
  ba: ["#####", "..#..", "..#..", "..#.."],                                // a bolt
  bb: ["..#..", ".###.", "##.##", "#...#"],                                // a wing
};
const SKULL = [
  "..h..................",
  ".hh..h...............",
  ".hh.hh...............",
  "..hhhBBBB............",
  "...BBBBBBBBB.........",
  "..BBBooBBBBBBBB......",
  "..BBBorBBBBBBBBBBB...",
  "..BBBBBBBBBBBBBBnBB..",
  "...BBBBBBBBBBBBBBBB..",
  "....BbtbtbtbtbtbtB...",
  "....bbbbbbbbbbbbb....",
  ".....bbbbbbbbbbb.....",
];

// ---- props at the tower's foot (today's places: the butt front-left, the barrel or the cauldron front-right)
const butt = (px, x, y, z) => {
  px.part();
  beam(px, x - 5, y, x - 2, y - 14, 2, OAK, z, { same: true, grain: false }); beam(px, x + 5, y, x + 2, y - 14, 2, OAK, z, { same: true, grain: false });
  px.part();
  px.ellipse(x, y - 15, 7.5, 7.8, STRAW, z + 1, { round: 0.5 });
  px.ellipse(x, y - 15, 5, 5.2, WHITE, z + 1.1, { round: 0.2, cast: 0 });
  px.ellipse(x, y - 15, 2.8, 3, RED, z + 1.2, { round: 0.2, cast: 0 });
  px.dot(x - 0.5, y - 15.5, GOLD, z + 1.3, { fix: 4 });
  px.part(); px.line(x + 1, y - 18, x + 8, y - 20, OAK, z + 1.4, { cast: 0 }); px.dot(x + 8.5, y - 20.5, WHITE, z + 1.5, { fix: 4 }); px.dot(x + 9.5, y - 20.5, WHITE, z + 1.5, { fix: 3 });
};
const barrel = (px, x, y, z) => {
  drum(px, { cx: x, top: y - 13, bot: y - 2, r: 6, r2: 5.4, sq: 0.36, m: TIMBER, z, st: STYLES.A, boards: 0.5, course: 99, strings: [[y - 11.5, 1.3, IRON], [y - 5, 1.3, IRON]] });
  disc(px, { cx: x, y: y - 13, r: 5.2, sq: 0.36, m: OAK_D, z: z + 0.1 });
  px.part();
  for (const [dx, h] of [[-2.5, 8], [0, 10], [2.5, 7], [-1, 6]]) { px.line(x + dx, y - 13, x + dx + 0.6, y - 13 - h, OAK, z + 0.3, { cast: 0 }); px.dot(x + dx + 0.6, y - 14 - h, WHITE, z + 0.4, { fix: 4 }); px.dot(x + dx + 0.6, y - 13 - h, RED, z + 0.4); }
};
const cauldron = (px, x, y, z, seed) => {
  for (let i = 0; i < 3; i++) boulder(px, x - 5 + i * 5, y + (i === 1 ? 1 : 0), 2.6, 2, mat("#8a8478"), z);
  px.part(); px.ellipse(x, y - 7.5, 7.4, 6.6, POT, z + 1, { round: 0.95 });
  px.part(); px.ellipse(x, y - 12.5, 7, 2.2, IRON_L, z + 1.2, { round: 0.3 }); px.ellipse(x, y - 12.5, 5.4, 1.3, flat("#8ce05a", { emis: true }), z + 1.3, { cast: 0 });
  void seed;
};
const torch = (px, x, y) => { px.part(); px.line(x, y + 8, x, y + 2, IRON, 3, { cast: 1 }); px.rect(x - 2, y, 4, 2, IRON, 3, { n: [0, -0.5, 0.8] }); };
const bed = (px, rx, m = EARTH) => { px.part(); px.ellipse(0, 11, rx, 8, m, -50, { round: 0.25, noLine: true, vb: -0.1 }); };

// ---- level 1: the watch-post -------------------------------------------------------------
const watchPost = (back, front, G, st) => {
  const { DY, R, r } = G, top = DY - 16, rich = st.stones === 2;
  bed(back, r + 8);
  for (const s of [-1, 1]) { boulder(back, s * (r + 1), 13, 3.6, 2.6, mat("#9a9488"), 2); beam(back, s * (R - 10), DY + 12, s * (r - 8), 8, 3, OAK_D, -6, { grain: false }); }   // far legs
  beam(back, -(r - 6), DY + 40, r - 6, DY + 36, 2, OAK_D, -6.5, { grain: false });
  beam(back, -r + 2, 6, r - 2, DY + 24, 3, TIMBER, -3, { seed: 5 }); beam(back, r - 2, 6, -r + 2, DY + 24, 3, TIMBER, -3.2, { seed: 6 });           // cross braces
  beam(back, -r - 1, DY + 32, r + 1, DY + 32, 3, TIMBER_L, -2.5, { seed: 7 });                                                                        // the girt
  for (const s of [-1, 1]) beam(back, s * (R - 4), DY + 10, s * r, 12, 5, TIMBER, -2, { seed: s + 3 });                                               // near legs
  for (const dx of [-5, 4]) beam(back, dx, 12, dx, DY + 8, 2, TIMBER_L, -1, { grain: false });                                                        // the ladder
  for (let y = 6; y > DY + 12; y -= 6) beam(back, -5, y, 4, y, 1.2, TIMBER_L, -1.1, { grain: false });
  if (rich) for (const [x, y] of [[-r - 1, DY + 32], [r + 1, DY + 32], [0, DY + 54]]) { back.part(); back.rect(x - 2, y - 2, 4, 4, ROPE, -1.5, { n: [0, -0.2, 0.97] }); back.toneLine(x - 2, y, x + 2, y, -1); }
  // the deck: its top in the sun, a thick front edge, joist ends under it
  back.part(); back.poly([[-R + 2, top], [R - 2, top], [R, DY + 4], [-R, DY + 4]], TIMBER_L, 0, { n: [0, -0.8, 0.6] });
  for (let x = -R + 5; x < R; x += 6) back.toneLine(x, top, x - 1, DY + 4, -1);
  back.part(); back.rect(-R, DY + 4, R * 2, 6, TIMBER, 0.2, { n: [0, -0.1, 0.99] });
  back.toneLine(-R, DY + 4, R, DY + 4, 1); back.toneLine(-R, DY + 9, R, DY + 9, -1);
  for (let x = -R + 4; x <= R - 4; x += 7) { back.tone(x, DY + 6, -1); back.tone(x, DY + 7, -1); }
  for (let x = -R + 5; x <= R - 6; x += 10) { back.part(); back.rect(x, DY + 10, 4, 4, OAK, 0.1, { n: [0, 0, 1] }); }
  // the near rail, over his shins
  for (let i = 0; i < 4; i++) { const x = -R + 3 + (i / 3) * (R * 2 - 6); beam(front, x, DY + 10, x, DY - 3, 3, OAK, 6, { grain: false }); }
  beam(front, -R, DY - 4, R, DY - 4, 3, TIMBER, 6.2, { grain: false });
  butt(back, -17, 27, 4);
};

// ---- the stone forms ------------------------------------------------------------------------
const tower = (back, front, G, st, F) => {
  const { DY, R, r, lay } = G, { level, br, r4, key, seed } = F, bold = st.bold && !br && level === 3;
  const green = br === "a", master = br === "b", rich = st.stones === 2;
  const S = mat(STONE_OF[key]), SL = mat(lightenHex(STONE_OF[key], 0.16));
  const deck = DY + 1, band = master ? 8 : 9, P = { deck, r: R, sq: SQ, wall: 6, band };
  const under = bandEdge(P), bandLow = deck + band + R * SQ;                 // the band's lowest point, on the centre line
  bed(back, r + 9, r4 === "aa" ? EARTH_D : EARTH);
  drum(back, { top: master ? -2 : 0, bot: 3, r: r + 5, r2: r + 6, sq: SQ, m: SL, z: -1, st, seed: seed + 4, course: 5, strings: [[master ? -2 : 0, 1.5, SL]] });

  if (!br && level === 2) {
    // a stone storey under a timber gallery
    const loftBot = DY + 34;
    drum(back, { top: loftBot, bot: 1, r, r2: r + 1.5, sq: SQ, m: S, z: 0, st: { ...st, moss: 1 }, seed: seed + 11 });
    drum(back, { top: deck, bot: loftBot, r: r + 2, sq: SQ, m: TIMBER, z: 0.1, st: STYLES.A, boards: 0.2, course: 99, seed, strings: [[loftBot - 3, 3, OAK]], under, underLen: 4 });
    door(back, 0, 9, 10, 16, SL, OAK, IRON, 2, { vous: rich });
    back.part(); back.ellipse(11, bandLow + 7, 5.6, 5.6, RED, 3, { round: 0.6 });                                                // a round shield on the boards
    for (let i = -3; i <= 3; i++) { back.dot(11 + i + 0.5, bandLow + 7.5, WHITE, 3.1, { cast: 0 }); back.dot(11.5, bandLow + 7 + i + 0.5, WHITE, 3.1, { cast: 0 }); }
    back.part(); back.rect(-12, bandLow + 2, 4, 9, DARK, 2.2, { cast: 0 }); back.rect(-13, bandLow + 11, 6, 1, OAK, 2.3, { n: [0, -0.7, 0.7] });   // a shutter slit
    if (st.moss) ivy(back, r - 3, 8, 22, 3, { seed: seed + 4, side: -1 });
    disc(back, { y: deck, r: R - 1, sq: SQ, m: TIMBER_L, z: 0.5, lip: 5, planks: 5 });
    parapet(back, front, { ...P, m: TIMBER, mTrim: OAK, st: STYLES.A, rail: true, boards: 0.16, wall: 1, mer: { n: 14, duty: 0.2, h: 9, ph: 0.4 } });
    barrel(back, 16, 27, 4);
    return;
  }

  // the shaft
  const hoops = r4 === "ba" ? [[DY + 30, 4, IRON], [DY + 74, 4, IRON]] : rich && !master ? [[DY + 56, 2, SL]] : rich ? [[DY + 48, 2, SL], [DY + 80, 2, SL]] : [];
  drum(back, {
    top: deck, bot: 1, r, r2: bold ? r + 5 : r + 1.5, sq: SQ, m: S, z: 0, st, seed: seed + 7, course: master ? 5 : 6, stoneW: master ? 0.5 : 0.44,
    under, underLen: 5, strings: hoops, stain: (x, h) => (Math.abs(x) < 2 && h > DY + 66 && h < DY + 74 ? -1 : 0),
  });
  if (r4 === "ba") for (const [hy] of hoops) for (let a = -1.2; a <= 1.2; a += 0.3) back.dot(Math.sin(a) * r, hy + 1.5 + r * SQ * Math.cos(a), IRON_L, 0.3, { fix: 4, cast: 0 });   // rivets
  const dw = master ? 10 : 12, dh = master ? 18 : 19;
  door(back, 0, 9, dw, dh, SL, OAK, IRON, 2, { vous: rich });
  if (bold) { back.part(); back.poly([[-9, 9], [9, 9], [11, 13], [-11, 13]], SL, 2.5, { n: [0, -0.8, 0.6] }); }
  torch(back, master ? -10 : -13, -22);
  // arrow loops; in B there is lamplight behind them
  const slits = r4 === "bb" ? [DY + 78] : master ? [DY + 50, DY + 72] : [DY + 52];
  for (const sy of slits) { if (st.lit) archWindow(back, 0, sy, 3, 11, SL, 2, { glow: WARM, frame: true }); else loop(back, -1.5, sy, 11, SL, 2); }
  if (st.lit && !master) archWindow(back, -(r - 10), DY + 38, 5, 7, SL, 2, { glow: WARM });
  // the banner on the shaft, hung clear of the walk's shadow
  const bcol = { base: "#a04a3f", a: "#3f6a34", aa: "#4a2a3a", ab: "#5a86a8", b: "#3f5a8c", ba: "#3e4048", bb: "#8e2a26" }[key];
  wallBanner(back, green ? 2 : 0, Math.ceil(bandLow) + 2, 12, master ? 20 : 22, mat(bcol), r4 === "ab" ? WHITE : GOLD, 2, { device: DEVICE[key], deviceY: 5, stripe: !green, tail: br ? "point" : undefined, fold: 3 });
  if (r4 === "bb") {                                                             // the wyrm's skull, under the banner
    back.part();
    back.stamp(SKULL, -1, DY + 60, { B: { m: BONE }, b: { m: BONE, bias: -1 }, h: { m: HORN }, o: { m: DARK, fix: 0 }, n: { m: DARK, fix: 0 }, r: { m: COAL }, t: { m: BONE, fix: 4 } }, 2.6, { ax: 8, ay: 6, ball: [9, 5, 12, 8] });
  }
  if (st.moss) {
    if (green) { ivy(back, -r + 3, 9, 2 * (lay.h - 12), 3, { seed: seed + 9, side: 1, col: r4 === "aa" ? "#3c6a34" : "#4f8a3c", spread: 3.4 }); ivy(back, r - 3, 9, 2 * (lay.h - 20), 3, { seed: seed + 3, side: -1, col: r4 === "aa" ? "#3c6a34" : "#4f8a3c" }); }
    else if (!master) ivy(back, r - 4, 9, 34, 3, { seed: seed + 9, side: -1 });
    else if (r4 !== "ba") ivy(back, -r + 3, 9, 20, 3, { seed: seed + 2, side: 1, spread: 2 });
    if (r4 === "aa") for (let i = 0; i < 7; i++) back.dot(-r + 4 + ((i * 7) % 9), 4 - i * 9, BERRY, 3.2, { fix: 3, cast: 0 });
  }

  // ---- what stands at the BACK of the walk, behind the crew
  if (bold) {                                                                    // C (the concept sheet only): a capped stair turret
    const tx = R - 5, tt = deck - 34;
    drum(back, { cx: tx, top: tt, bot: DY + 50, r: 9, sq: SQ, m: S, z: -3, st, seed: 21, course: 5, stoneW: 0.6, strings: [[tt + 6, 2, SL]] });
    cone(back, { cx: tx, y: tt, r: 12, h: 25, sq: SQ, m: mat("#3f5a8c"), z: -2, st, rows: 5 });
  }
  if (green) {
    // a leaf-thatched awning on two poles, sloping up and away behind their heads
    const roof = r4 === "aa" ? "#3f5e30" : r4 === "ab" ? "#4d7a52" : "#4d7a3c", RF = mat(roof), RF2 = mat(lightenHex(roof, 0.18));
    for (const s of [-1, 1]) beam(back, s * (R - 6), DY - 8, s * (R - 6), DY - 50, 4, OAK, -7, { grain: false });
    if (r4 === "ab") {                                                           // the hawk's mast, its perch bar and crow's nest
      beam(back, 0, DY - 44, 0, DY - 116, 4, OAK, -8, { grain: false });
      beam(back, -14, DY - 100, 14, DY - 100, 3, TIMBER_L, -7.6, { grain: false });
      back.part(); back.rect(-8, DY - 88, 16, 8, TIMBER, -7.5, { n: [-0.2, -0.1, 0.97] }); back.toneLine(-8, DY - 85, 8, DY - 85, -1); back.toneLine(-8, DY - 88, 8, DY - 88, 1);
      wallBanner(back, -11, DY - 97, 6, 13, mat("#9fc4dc"), WHITE, -7.4, { tail: "point" });
    }
    // the thatch: a dark slab under courses of leaf clumps, each course lapping the one below, a ragged eave
    back.part();
    back.poly([[-R - 2, DY - 28], [-R + 4, DY - 54], [R - 4, DY - 54], [R + 2, DY - 28]], mat(lightenHex(roof, -0.0)), -6, { n: [-0.25, -0.55, 0.8], bias: -1 });
    for (let row = 0; row < 5; row++) {
      const y = DY - 51 + row * 5.6, half = R - 5 + row * 1.4;
      for (let x = -half + (row % 2) * 3; x <= half; x += 6) { const hv = hash(row, Math.round(x), seed + 31); back.part(); back.ellipse(x + (hv - 0.5) * 2, y, 3.9, 3, hv > 0.62 ? RF2 : RF, -5.9 + row * 0.02, { round: 0.85, cast: 1 }); }
    }
    if (r4 === "aa") for (let i = 0; i < 5; i++) back.dot(-R + 6 + i * ((R * 2 - 12) / 4), DY - 29 + (i % 2), BERRY, -5, { fix: 3, cast: 0 });
    disc(back, { y: deck, r: R - 1, sq: SQ, m: TIMBER_L, z: 0.5, lip: 5, planks: 5 });
    parapet(back, front, { ...P, m: TIMBER, mTrim: OAK_D, st: STYLES.A, rail: true, boards: 0.16, wall: 1, mer: { n: 14, duty: 0.24, h: 9, ph: 0.4 } });
    if (r4 === "aa") for (let i = 0; i < 5; i++) { const x = -R + 6 + i * ((R * 2 - 12) / 4), y = deck - 6 + R * SQ * Math.sqrt(Math.max(0, 1 - (x / R) ** 2)); beam(front, x, y, x + (i < 2 ? -4 : i > 2 ? 4 : 0), y - 15, 2, mat("#5a4028"), 11, { grain: false }); }   // briar stakes
  } else {
    if (master && r4 === "ba") {
      // an iron-bound back wall racked with bolts
      back.part(); back.poly([[-R + 5, DY - 44], [R - 5, DY - 44], [R - 3, DY - 9], [-R + 3, DY - 9]], S, -7, { n: [0.1, -0.1, 0.98] });
      for (let x = -R + 6; x < R - 6; x += 10) { back.part(); back.rect(x, DY - 52, 6, 8, S, -7, { n: [0.1, -0.2, 0.97] }); back.toneLine(x, DY - 52, x + 6, DY - 52, 1); }
      for (let y = DY - 36; y < DY - 12; y += 8) back.toneLine(-R + 5, y, R - 5, y, -1);
      back.part(); back.rect(-R + 6, DY - 24, R * 2 - 12, 2.4, IRON, -6.5, { n: [0, -0.4, 0.9] });
      for (let i = 0; i < 5; i++) { const x = -16 + i * 8; back.part(); back.line(x, DY - 14, x + 1, DY - 38, OAK, -6.4, { cast: 0 }); back.poly([[x - 1, DY - 38], [x + 1.5, DY - 45], [x + 4, DY - 38]], STEEL, -6.3, { n: [-0.3, -0.3, 0.9] }); }
    } else if (master) {
      // two slender pinnacles at the far corners, capped in slate (crimson with a gilt spike for the Dragonslayer)
      const cap = mat(r4 === "bb" ? "#a8302a" : "#4a6a92"), tipM = r4 === "bb" ? GOLD : STEEL;
      for (const s of [-1, 1]) {
        const px = s * (R - 6);
        drum(back, { cx: px, top: DY - 46, bot: DY - 10, r: 5, sq: SQ, m: S, z: -7, st: STYLES.A, seed: seed + s * 5, course: 5, stoneW: 0.8, strings: [[DY - 46, 2, SL]] });
        if (r4 !== "bb") { back.part(); back.rect(px - 1, DY - 34, 2, 6, DARK, -6.8, { cast: 0 }); }
        cone(back, { cx: px, y: DY - 46, r: 7.5, h: 26, sq: SQ, m: cap, z: -6.5, st, rows: 5, seed: seed + s });
        back.part(); back.line(px, DY - 72, px, DY - 80, tipM, -6.4, { cast: 0 }); back.ellipse(px, DY - 73, 1.6, 1.6, tipM, -6.3, { round: 0.9 });
      }
    }
    disc(back, { y: deck, r: R - 1, sq: SQ, m: SL, z: 0.5, lip: 7 });
    parapet(back, front, { ...P, m: S, mTrim: SL, st, seed: seed + 3, mer: { n: master ? 10 : bold ? 12 : 14, duty: 0.56, h: master ? 6 : 7, ph: 0.22 } });
  }

  // ---- the foot of the tower: the butt (rangers), the arrow barrel, the venom cauldron
  if (green) butt(back, -17, 27, 4);
  if (green && r4 !== "aa") barrel(back, 16, 27, 4);
  if (r4 === "aa") cauldron(back, 15, 26, 4, seed);
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "base";
  const lay = archerLayout({ level, branch: br, rank4: o.rank4 || null });
  const G = { lay, DY: -2 * lay.h, R: 2 * lay.pw, r: 2 * lay.hw };
  const F = { level, br, r4, key, seed: (o.seed || 0) * 7 + level };
  const { DY, R } = G, post = !br && level === 1, master = br === "b";
  if (post) watchPost(back, front, G, st); else tower(back, front, G, st, F);
  // what moves: the standard, the door torch and its light on the wall
  const flag = FLAG_OF[key], live = [];
  const bold = st.bold && !br && level === 3;
  if (bold) live.push({ kind: "pennant", x: R - 5, y: DY - 58, col: flag, pole: 5, len: 13 });
  else if (!br) live.push({ kind: "pennant", x: R - 6, y: post ? DY + 4 : DY - 12, col: flag, pole: post ? 37 : level === 2 ? 33 : 49, len: 13 });
  else if (master && r4 !== "ba") live.push({ kind: "pennant", x: -(R - 6), y: DY - 78, col: flag, pole: 0, len: 12, dir: -1 });
  else if (r4 === "ba") live.push({ kind: "pennant", x: R - 6, y: DY - 52, col: flag, pole: 9, len: 13 });
  else if (r4 !== "ab") live.push({ kind: "pennant", x: R - 6, y: DY - 50, col: flag, pole: 9, len: 13 });
  const lights = [];
  if (!post && !(level === 2 && !br)) { const tx = master ? -10 : -13; live.push({ kind: "flame", x: tx, y: -22 }); lights.push({ key: "torch", x: tx, y: -25, r: 19, col: "#ffa040", a: 0.75 }); }
  return {
    live, lights,
    // the crew, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: lay.spots.map(([dx, dy]) => ({ fig: "bowman", x: 2 * dx, y: DY + 6 + 2 * dy, dir: 1, variant: lay.big ? `${key}|long` : key })),
    shadow: { rx: G.r + (post ? 6 : 11), ry: 8, dx: 7, dy: 14 },
  };
};

// ---- the Ballista's siege bow (drawn live by the hall: loaded, or loosed) ---------------------
// Today's geometry x2, so the bolt still leaves the nose the engine knows: a banded stock on a
// yoked post, tipped up 0.2 rad, a steel stave round the nose, the string hauled back to the
// nut, a bolt in the groove. Facing +x; `flip` bakes it for the mirrored draw (one sun).
export const SIEGE_BOX = { w: 100, h: 104, ox: 44, oy: 70 };   // taller: the nose dips below the deck at a steep downward aim
// the winch hub on the stock (art px from the bow's origin), at an aim: the hall spins its spokes there
export const siegeHub = (aim = 0) => { const k = Math.cos(-0.2), n = Math.sin(-0.2), x = -26 * k - n, y = -26 * n + k - 24, r = (aim * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r); return aim ? [x * c - (y + 24) * sn, x * sn + (y + 24) * c - 24] : [x, y]; };
// aim: degrees, + down the screen (engine/aim.js): the stock, stave, string, bolt and winch pitch about the stock's
// mounting point (0, -24) while the base and the yoke stay put
export const siegeBow = (loosed, flip = false, aim = 0) => {
  const px = new Pix(SIEGE_BOX.w, SIEGE_BOX.h, SIEGE_BOX.ox, SIEGE_BOX.oy), cs = Math.cos(-0.2), sn = Math.sin(-0.2);
  const ar = (aim * Math.PI) / 180, ac = Math.cos(ar), as = Math.sin(ar);
  const T = (x, y) => { const bx = x * cs - y * sn, by = x * sn + y * cs; return aim ? [bx * ac - by * as, bx * as + by * ac - 24] : [bx, by - 24]; }, STR = flat("#f2ead4", { line: "#6a5a48" });
  px.part(); px.rect(-5, -18, 10, 18, OAK, 0, { n: [-0.2, -0.1, 0.97] }); px.rect(-5, -8, 10, 2, IRON, 0.1, { n: [0, 0, 1], cast: 0 }); px.rect(-8, -3, 16, 3, IRON, 0.1, { n: [0, -0.5, 0.8] });
  px.part(); px.rect(-7, -25, 3, 8, IRON, 0.2, { n: [0, 0, 1] }); px.rect(4, -25, 3, 8, IRON, 0.2, { n: [0, 0, 1] }); px.rect(-7, -19, 14, 2.4, IRON, 0.2, { n: [0, -0.4, 0.9] });   // the yoke
  const a = T(-28, 0), b = T(30, 0);
  beam(px, a[0], a[1], b[0], b[1], 8, TIMBER, 1, { bands: [0.1, 0.42, 0.78], bandM: IRON, seed: 3 });
  const nut = -12 + loosed * 32, n0 = T(nut, -1);
  // the stave, arching round the nose (a quadratic through the old control points), and its string
  px.part();
  let tipA = null, tipB = null;
  for (let u = 0; u <= 1.001; u += 0.04) { const qx = (1 - u) * (1 - u) * 21 + 2 * (1 - u) * u * 37 + u * u * 21, qy = (1 - u) * (1 - u) * -23 + u * u * 23, p = T(qx, qy); px.ellipse(p[0], p[1], 2.3, 2.3, IRON_L, 2, { round: 0.9 }); if (u < 0.02) tipA = p; tipB = p; }
  px.part(); px.line(tipA[0], tipA[1], n0[0], n0[1], STR, 1.6, { cast: 0 }); px.line(n0[0], n0[1], tipB[0], tipB[1], STR, 2.4, { cast: 0 });
  if (loosed < 0.5) {                                                                 // the bolt in the groove
    const s0 = T(nut, -5), s1 = T(nut + 44, -5), h1 = T(nut + 52, -5);
    px.part(); px.line(s0[0], s0[1], s1[0], s1[1], OAK, 2.6, { cast: 0 }); px.line(s0[0], s0[1] + 1, s1[0], s1[1] + 1, OAK, 2.6, { cast: 0, bias: -1 });
    px.poly([[s1[0], s1[1] - 3], [h1[0], h1[1] + 0.5], [s1[0], s1[1] + 4]], STEEL, 2.7, { n: [-0.3, -0.4, 0.86] });
    px.dot(s0[0] + 1, s0[1] - 1, RED, 2.8); px.dot(s0[0] + 3, s0[1] - 1.5, RED, 2.8); px.dot(s0[0] + 1, s0[1] + 2, RED, 2.8); px.dot(s0[0] + 3, s0[1] + 1.5, RED, 2.8);
  }
  const w = T(-26, 1);
  px.part(); px.ellipse(w[0], w[1], 6.6, 6.6, OAK_D, 3, { round: 0.85 }); px.ellipse(w[0], w[1], 1.4, 1.4, IRON_L, 3.1, { cast: 0 });
  return px.resolve({ flip });
};
