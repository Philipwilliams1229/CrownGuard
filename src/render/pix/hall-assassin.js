// ============ PIX HALL: the Assassin's Covert, all nine forms ============
// The tent the game draws while "New sprites" is on (render/halls/assassin.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun from the upper left, canvas as tone (panels, seams, a lit and a shaded side,
// mud and weather at the hem), a valance, lamp light on the cloth.
//
// THE MASTER AND THE TENT'S CENTRE DECIDE THE BUILDING. The hall file stands the hooded master
// in the doorway from level three at (-4, 5) (art pixels, two to a board unit, from the
// hall's ANCHOR, y down) and the blade on watch out front at (20, 18); the engine rings the
// blades' reach round the anchor. So the tent's middle is the anchor, its door is at x -4, and
// nothing is drawn over either man: the whole hall goes in the BACK picture.
//
// Drawn facing right (the door's flap tied back to the right, the knife board on the left, the
// lamp post on the right). The hall file mirrors it to the way of the last strike: it bakes
// with hallPix's flip and draws with dir -1, so the sun stays in the upper left.
//
// The forms, as today's hall has them: a pup tent of hides on two poles (1); a bell tent with
// a scalloped valance, a knife board and a shaded lamp (2); a taller bell tent with the second
// hood in the doorway (3). The Silent Court dresses in plum and gold with a seal over the door
// (a): the Kingslayer flies a black banner of a crown run through with a dagger (aa), the Open
// Contract nails up a notice board (ab). The Nightshade Guild greens its canvas and hangs
// venom vials from the eave (b): the Widow's Kiss sets two vats before the tent (ba), the
// Plague Bearer's ground swells with spore pods (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: the lamp's light (spec `lights`, key "lamp", the hall flickers it),
// and what the hall file paints itself (the blades, their smoke and glint, the vats' bubbles,
// the spores).
import { mat, flat } from "./pix.js";
import { drum, disc, beam, boulder, wallBanner, hash, clamp } from "./hall-kit.js";

export const BOX = { w: 112, h: 142, ox: 56, oy: 108 };
export const LABEL = "Assassin's Covert";

const CANVAS_OF = { l: "#7a6e78", a: "#6a5486", aa: "#4e3e62", ab: "#766e78", b: "#5e7250", ba: "#4c5e44", bb: "#747a4a" };
const POLE = mat("#4a3828"), POLE_L = mat("#6a5038"), PLANK = mat("#6a5038"), PLANK_L = mat("#7a5a3a"), ROOFW = mat("#4a3828");
const STEEL = mat("#c4c8d0", { contrast: 1.2 }), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), LAMPM = mat("#2e2a30", { contrast: 1.3 });
const GOLD = mat("#d8b34a", { contrast: 1.2 }), GOLD_D = mat("#8a6a22"), SILVER = mat("#8a8f9a", { contrast: 1.2 });
const EARTH = mat("#8a7a62"), EARTH_D = mat("#6e604c"), STONE = mat("#8a8478"), STONE_L = mat("#9e988a");
const ROPE = mat("#b8a888"), HILT = mat("#3a2a20"), CRATE = mat("#6a5038"), VATW = mat("#5a4030");
const PARCH = mat("#e8dcb8"), PARCH2 = mat("#f4ecd4"), WAX = flat("#b03a32"), INKY = flat("#6a5a50");
const DARK = flat("#0e0a12"), RING = flat("#c04a3a"), WARM = flat("#ffd070", { emis: true });
const VENOM = mat("#b050c0", { contrast: 1.1 }), VIAL_A = mat("#a8d060"), VIAL_B = mat("#9a6ac0");
const POD_A = mat("#c8d060"), POD_B = mat("#8a9a40"), POD_SPOT = flat("#5a6a28"), POD_HI = flat("#f0f4b0");
const SICK = mat("#8a9a3a"), BANNER_BLACK = mat("#241c2c", { contrast: 0.9 }), BLOOD = mat("#b03a32"), BONE = mat("#e8ecf2");

// the Plague Bearer's pods [dx, dy, r] in board units (the hall's old numbers): kept off the board and the tent's wall
const PODS = [[-10.5, 9.5, 2.4], [-5.5, 12.5, 1.8], [14.5, 3.5, 2], [-8.5, 5.5, 1.3], [1, 13.5, 1.4]];
export const LANTERN = 31;   // the lamp post's x (art px; the hall's light follows it)

const frac = (v) => v - Math.floor(v);
const FRONT = [0.1, 0, 0.99], LIT = [-0.2, -0.1, 0.97];
const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A flat face (any shape with one span a row) whose tone is worked pixel by pixel:
// fn(x, y) -> tone steps (null leaves the pixel out). n: the face's normal.
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

// ---- the ground ------------------------------------------------------------------------------
const yard = (px, seed, r4) => {
  px.part(); px.ellipse(0, 10, 41, 14, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  if (r4 === "bb") { px.part(); px.ellipse(0, 12, 34, 12, SICK, -49, { round: 0.25, noLine: true }); }   // the sickened ground
  for (let i = 0; i < 26; i++) { const a = hash(seed, i, 3) * Math.PI * 2, d = Math.sqrt(hash(seed, i, 5)); px.tone(Math.cos(a) * d * 38, 10 + Math.sin(a) * d * 13, hash(seed, i, 7) > 0.5 ? 1 : -1); }
  for (const [x, y, rx, ry, m] of [[-38, 14, 3, 2.2, STONE], [37, 9, 2.6, 2, STONE_L], [-12, 22, 2.2, 1.6, STONE], [30, 21, 2.4, 1.8, STONE_L]]) boulder(px, x, y, rx, ry, m, -40);
};

// ---- the bell tent (levels 2, 3 and every path) ------------------------------------------------
// A short round wall, a cone of canvas to the pole, a scalloped valance round the eave, seams down
// from the pole; the door is cut after. Worked column by column, a drum lit from the upper left.
const SQ = 0.28, EAVE = -8, BASE = 2;
const eaveY = (x, hw) => EAVE + hw * SQ * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2));
const bell = (px, o) => {
  const { hw, top, col, trim, seed, grime } = o, M = mat(col), MT = trim, floor = o.dark ? 1 : 0;
  px.part();
  for (let i = -Math.ceil(hw); i < Math.ceil(hw); i++) {
    const x = i + 0.5, u = x / hw; if (Math.abs(u) >= 1) continue;
    const ys = Math.sqrt(1 - u * u), yt = top + (EAVE - top) * Math.pow(Math.abs(u), 0.85), ye = EAVE + hw * SQ * ys, yb = BASE + hw * SQ * 1.02 * ys;
    for (let j = Math.floor(yt); j <= Math.ceil(yb); j++) {
      const y = j + 0.5; if (y < yt || y > yb) continue;
      let m = M, bias = 0, nx, ny;
      if (y < ye) {                                                   // the roof cone
        const t = clamp((y - top) / (EAVE - top + hw * SQ * ys), 0.02, 1.4), a = x / (hw * t * 0.96 + 0.5);
        nx = clamp(u * 0.85 - 0.1, -0.92, 0.92); ny = -0.42;
        const panel = Math.floor((a + 1) * 3.5), panelL = Math.floor((x - 1) / (hw * t * 0.96 + 0.5) * 3.5 + 3.5);
        if (panel !== panelL && Math.abs(a) < 1.02) bias -= 1;        // a seam from the pole
        else { const hv = hash(panel, seed, 11); if (hv > 0.86) bias += 1; else if (hv < 0.12) bias -= 1; }   // a sunned or a patched panel
        if (y > ye - 2.5) bias -= 1;                                  // the roof's shadow gathering over the eave
      } else if (y < ye + 3.2 + (frac(x / (hw / 4.5)) < 0.5 ? 1.4 : 0) * (0.6 + 0.4 * Math.cos(frac(x / (hw / 4.5)) * Math.PI * 2))) {   // the valance, scalloped below
        m = MT; nx = clamp(u * 0.9, -0.9, 0.9); ny = 0.05;
        if (frac(x / (hw / 4.5)) < 0.12) bias -= 1;
      } else {                                                        // the wall under it
        nx = clamp(u * 0.95, -0.95, 0.95); ny = 0.1;
        bias -= 1;                                                    // in the valance's shade
        const fold = Math.floor((x + hw) / (hw / 3.2)), foldL = Math.floor((x - 1 + hw) / (hw / 3.2));
        if (fold !== foldL) bias -= 1; else if (hash(fold, seed, 5) > 0.8) bias += 1;
        if (y > yb - 3.2 && hash(i, j, seed) > 0.4) bias -= 1;        // mud splashed on the hem
        if (grime && y > ye + 7 && hash(Math.floor(x / 2), seed, 9) > 0.7 && hash(j, i, 4) > 0.3) bias -= 1;   // a rain streak
      }
      px._put(i + px.ox, j + px.oy, m, 0, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), { bias, cast: 1, floor });
    }
  }
  // the pole's finial rising out of the canvas
  px.part(); beam(px, 0, top + 1, 0, top - 9, 2.2, POLE, 0.3, { grain: false }); px.ellipse(0, top - 10, 2.4, 2.4, o.court ? GOLD : SILVER, 0.4, { round: 0.95, fix: 4 });
  // the door: the cut, and the flap tied back to the right of it
  face(px, [[-11.6, 8.4], [-4.8, -24], [-3.2, -24], [3.6, 8.4]], DARK, 0.5, FRONT, null, { cast: 0, noLine: false });
  face(px, [[-3.2, -24], [3.6, 8.4], [10, 7.2], [7.4, -5], [0, -20]], M, 0.6, [-0.1, 0, 0.99], (x, y) => (x > 5 + (y + 24) * 0.05 ? -1 : frac((x + 4) / 3) < 0.2 ? -1 : y < -17 ? 1 : 0), { floor });
  px.part(); px.rect(7.2, -6, 3, 2, MT, 0.7, { n: LIT, cast: 0 });  // the tie
};

// ---- the pup tent of level one -----------------------------------------------------------------
// Two poles and a ridge, the canvas pegged down either side, seen corner-on: its long side
// falling away to the left behind the front gable.
const leanTo = (px, o) => {
  const { col, seed, dark } = o, M = mat(col), floor = dark ? 1 : 0, A = [0, -30], B = [-10, -35];
  // the far slope, running back from the front gable (it faces the sun)
  face(px, [A, B, [-30, -2], [-22, 6]], M, -1, [-0.5, -0.4, 0.75], (x, y) => {
    let b = 1;
    const k = (x - A[0]) / (-30 - A[0]);
    if (frac(k * 3) < 0.07) b -= 1;                                   // seams running down the slope
    if (y > 1 - (x + 22) * 0.2 && hash(Math.floor(x), seed, 3) > 0.4) b -= 1;   // mud at the hem
    return b;
  }, { floor });
  // the front gable: a triangle of canvas with the door cut in it
  face(px, [[-22, 6], A, [22, 6]], M, 0, FRONT, (x, y) => {
    let b = x < -8 ? 0 : x < 8 ? -1 : -2;
    if (y > 1.5 && hash(Math.floor(x), seed, 5) > 0.45) b -= 1;       // mud
    if (Math.abs(x) < 1 && y < -10) b -= 1;
    if (hash(Math.floor((x + 30) / 6), Math.floor((y + 40) / 6), seed) > 0.9) b += 1;   // a patch
    return b;
  }, { floor, edge: true });
  face(px, [[-8, 6], [0, -22], [8, 6]], DARK, 0.5, FRONT, null, { cast: 0 });
  face(px, [[0.8, -22], [8, 6], [12, 5.2]], M, 0.6, [-0.1, 0, 0.99], (x) => (x > 7 ? -1 : 0), { floor });
  px.part(); px.line(-22, 6, 0, -30, o.trim, 0.2, { n: LIT, cast: 0 }); px.line(22, 6, 0, -30, o.trim, 0.2, { cast: 0 });   // the binding on the gable's edge
  // the poles, crossed at the top; the ridge between them
  beam(px, 0, -30, -10, -35, 2.4, POLE, 0.8, { grain: false });
  for (const [x, y] of [[0, -30], [-10, -35]]) { beam(px, x - 3.2, y - 4, x + 3.2, y + 3, 2.2, POLE, 0.9, { grain: false }); beam(px, x + 3.2, y - 4, x - 3.2, y + 3, 2.2, POLE_L, 0.95, { grain: false }); }
  // guy ropes to pegs
  for (const sg of [-1, 1]) { px.part(); px.line(sg * 3, -28, sg * 29, 10, ROPE, 1, { cast: 0 }); px.dot(sg * 29, 10, POLE, 1.1); px.dot(sg * 29, 11, POLE, 1.1); }
};

// ---- the yard's props ----------------------------------------------------------------------------
// a plank knife board on a post, blades stuck in it
const knifeBoard = (px, bx, gy, n) => {
  px.part(); px.ellipse(bx, gy, 4.4, 1.5, EARTH_D, 1.8, { cast: 0, noLine: true, round: 0.3 });
  beam(px, bx, gy, bx, gy - 22, 2.4, POLE, 2, { grain: false });
  face(px, box(bx - 6, gy - 24, 12, 14), PLANK, 2.2, [-0.1, -0.1, 0.98], (x, y) => (frac((x - bx + 6) / 4) < 0.2 ? -1 : y < gy - 23 ? 1 : 0), { edge: true });
  px.part(); for (let a = 0; a < 6.3; a += 0.45) px.dot(bx + Math.cos(a) * 3.4, gy - 17 + Math.sin(a) * 3.4, RING, 2.4, { cast: 0 });
  for (let i = 0; i < n; i++) {
    const kx = bx - 5 + i * 3.3, ky = gy - 22 + (i % 2) * 4;
    px.part(); px.rect(kx, ky, 1.6, 6, STEEL, 2.5, { n: LIT, cast: 1 });
    px.rect(kx - 0.2, ky - 3, 2, 3, HILT, 2.5, { n: LIT, cast: 0 });
  }
};
// The Open Contract's notice board: two posts, a little roof, names pinned in rows
const noticeBoard = (px, bx, gy, seed) => {
  px.part(); px.ellipse(bx, gy, 8, 2, EARTH_D, 1.8, { cast: 0, noLine: true, round: 0.3 });
  for (const sg of [-1, 1]) beam(px, bx + sg * 6, gy, bx + sg * 6, gy - 30, 2.6, POLE, 2, { grain: false });
  face(px, box(bx - 8, gy - 27, 16, 16), PLANK_L, 2.2, [-0.1, -0.1, 0.98], (x, y) => (frac((x - bx + 8) / 5) < 0.2 ? -1 : y < gy - 26 ? 1 : 0), { edge: true });
  face(px, [[bx - 11, gy - 29], [bx, gy - 35], [bx + 11, gy - 29]], ROOFW, 2.4, [0, -0.5, 0.86], (x, y) => (y > gy - 31 ? -1 : 0), { edge: true });
  for (let i = 0; i < 5; i++) {
    const sx = Math.round(bx - 6.8 + (i % 3) * 4.6 + hash(seed, i) * 1), sy = Math.round(gy - 26 + Math.floor(i / 3) * 7 + hash(seed, i + 3) * 1.6);
    px.part(); px.rect(sx, sy, 4.4, 5.6, i % 2 ? PARCH : PARCH2, 2.5, { n: LIT, cast: 1 });
    px.rect(sx + 0.8, sy + 1.6, 2.8, 0.8, INKY, 2.6, { n: LIT, cast: 0 }); px.rect(sx + 0.8, sy + 3.2, 2, 0.8, INKY, 2.6, { n: LIT, cast: 0 });
    px.dot(sx + 3, sy + 4.6, WAX, 2.6, { cast: 0 }); px.dot(sx + 3.6, sy + 4.6, WAX, 2.6, { cast: 0 });
  }
  px.part(); px.rect(bx + 5.2, gy - 24, 1.6, 6.4, STEEL, 2.7, { n: LIT, cast: 1 }); px.rect(bx + 5, gy - 27, 2, 2.8, HILT, 2.7, { n: LIT, cast: 0 });   // the knife that pins the latest
};
// the lamp post of level two and up: a closed, shaded lamp on an arm toward the tent
const lampPost = (px, lx, gy) => {
  px.part(); px.ellipse(lx, gy, 3.4, 1.2, EARTH_D, 1.8, { cast: 0, noLine: true, round: 0.3 });
  beam(px, lx, gy, lx, gy - 34, 2.4, POLE, 2, { grain: false });
  beam(px, lx + 1, gy - 33, lx - 8, gy - 33, 2, POLE, 2.1, { grain: false });
  px.part(); px.rect(lx - 8.8, gy - 32, 5.6, 7, LAMPM, 2.3, { n: LIT, cast: 1 });           // the lamp's body
  px.rect(lx - 9.6, gy - 33.5, 7.2, 1.6, IRON_L, 2.4, { n: [0, -0.5, 0.86], cast: 0 });     // its shade
  px.rect(lx - 7, gy - 30, 2.4, 3.2, WARM, 2.5, { cast: 0 });                                // the lit pane
};
// a wooden vat of venom on the ground
const vat = (px, vx, gy, w, h) => {
  const r = w / 2;
  px.part(); px.ellipse(vx + 1, gy, r + 1.5, 1.8, EARTH_D, 1.8, { cast: 0, noLine: true, round: 0.3 });
  drum(px, { cx: vx, top: gy - h, bot: gy - 1, r, r2: r - 0.5, sq: 0.36, m: VATW, z: 3, boards: 0.5, course: 99, strings: [[gy - h + 2, 1.4, IRON], [gy - 3.5, 1.4, IRON]] });
  disc(px, { cx: vx, y: gy - h, r, sq: 0.36, m: mat("#3a2a24"), z: 3.1 });
  disc(px, { cx: vx, y: gy - h + 0.4, r: r - 1.8, sq: 0.36, m: VENOM, z: 3.2 });
};
// a swollen spore pod, lit on its crown, spotted
const pod = (px, x, gy, r, seed) => {
  px.part(); px.ellipse(x, gy - r * 1.7, r * 2, r * 1.9, hash(seed, 1) > 0.5 ? POD_A : POD_B, 3 + gy * 0.01, { round: 0.95 });
  px.dot(x - r * 0.6, gy - r * 1.4, POD_SPOT, 3.5 + gy * 0.01, { cast: 0 }); px.dot(x + r * 0.6, gy - r * 2.2, POD_SPOT, 3.5 + gy * 0.01, { cast: 0 });
  px.dot(x - 0.8, gy - r * 3.5, POD_HI, 3.5 + gy * 0.01, { cast: 0 });
};
// the Kingslayer's banner: black cloth on a tall pole behind the tent, a crown with a dagger through it
const kingBanner = (px) => {
  beam(px, -14, -6, -14, -92, 3, POLE, -20, { grain: false });
  px.part(); px.ellipse(-14, -94.5, 2.4, 2.4, GOLD, -19.9, { round: 0.95, fix: 4 });
  beam(px, -14.5, -90, -33, -90, 2, POLE_L, -19.8, { grain: false });
  wallBanner(px, -23.5, -89, 16, 26, BANNER_BLACK, GOLD, -19, { stripe: false, device: [
    ".#.#.#.", ".#####.", ".#####.", "...o...", "...o...", "...o...", "...o...", "..###..", "...o...", "...o...", "...#...",
  ], deviceY: 5, tail: "point" });
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "l";
  const lvl = br ? 3 : level, court = br === "a", guild = br === "b", seed = (o.seed || 0) * 7 + lvl;
  const col = CANVAS_OF[key], dark = r4 === "aa" || r4 === "ba";
  const trim = court ? GOLD : guild ? mat("#8a6aa8") : mat("#6a5a80");
  const hw = lvl === 2 ? 25 : 27, top = lvl === 2 ? -44 : -52;

  yard(back, seed, r4);
  if (r4 === "aa") kingBanner(back);
  if (lvl >= 3 && !r4 && !br) {                                       // the weapons rack behind the tent
    beam(back, -24, -12, -24, -30, 2.4, POLE, -9, { grain: false }); beam(back, -12, -12, -12, -30, 2.4, POLE, -9, { grain: false }); beam(back, -26, -26, -10, -26, 2, POLE_L, -8.9, { grain: false });
  }
  if (lvl === 1) leanTo(back, { col, seed, dark, trim });
  else bell(back, { hw, top, col, trim, seed, dark, court, grime: !court });
  // the house's sign: a gold seal over the door, or venom vials hung from the eave
  if (court) { back.part(); back.ellipse(-4, -32, 3.6, 3.6, GOLD, 1, { round: 0.95, fix: 3 }); back.rect(-5.6, -33.2, 3.2, 2.4, GOLD_D, 1.1, { n: LIT, cast: 0 }); }
  if (guild) for (let i = 0; i < 4; i++) {
    const vx = Math.round(-hw * 0.75 + i * hw * 0.5), vy = Math.round(eaveY(vx, hw) + 5);
    back.part(); back.line(vx, vy, vx, vy + 2, SILVER, 1, { cast: 0 }); back.ellipse(vx, vy + 4.6, 2.4, 2.8, i % 2 ? VIAL_A : VIAL_B, 1.1, { round: 0.95, fix: i % 2 ? 3 : 2 });
  }
  // on the ground in front: every prop stands clear of the tent's wall
  if (r4 === "ab") noticeBoard(back, -27, 12, seed); else knifeBoard(back, -30, 12, lvl + 1);
  // (no lamp post: the Covert keeps no light, owner 2026-11-22)
  if (r4 === "ba") { vat(back, -18, 22, 12, 9); vat(back, -5, 26, 9.2, 7.2); }
  if (r4 === "bb") for (const [dx, dy, r] of PODS) pod(back, dx * 2, dy * 2, r, dx);
  if (guild && !r4) {                                                 // the poisoner's bench with a pestle bowl
    back.part(); back.ellipse(-10, 24, 7, 2, EARTH_D, 1.8, { cast: 0, noLine: true, round: 0.3 });
    face(back, box(-16, 17.5, 12, 7), CRATE, 3, FRONT, (x, y) => (y < 18.5 ? 1 : frac((x + 20) / 4) < 0.15 ? -1 : 0), { edge: true });
    back.part(); back.ellipse(-10, 17.4, 3.2, 1.6, IRON, 3.2, { round: 0.9 }); back.ellipse(-10, 17.2, 2, 0.9, VENOM, 3.3, { cast: 0 });
  }

  const lights = [];
  return {
    live: [], lights,
    // the people, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [],   // (the idle hoods by the tent are gone, owner 2026-11-22: only the working blades)
    shadow: { rx: 36, ry: 9, dx: 7, dy: 9 },
  };
};
