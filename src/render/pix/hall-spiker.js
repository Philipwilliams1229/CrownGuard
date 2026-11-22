// ============ PIX HALL: the Bladewheel, all nine forms ============
// The building the game draws while "New sprites" is on (render/halls/spiker.js asks for it
// through pix/halls.js); the old painter stays under the switch. Treatment B: thin tinted
// line, one sun, stone by stone, firelight on the brick.
//
// THE CREW DECIDES THE BUILDING. The wheelwright stands on open ground before the drum and
// turns a crank bolted to its face; the hall file (halls/spiker.js) owns those numbers
// (crewSpot, CRANK, BAR, the wheel's hub height wy and radius rr) and this file is built
// round them, x2: ART PIXELS, two to a board unit, from the hall's ANCHOR (t.x, t.y), y down.
// It is a NARROW hall: everything on the ground keeps inside FOOT_NARROW (kitB.js), which in
// art pixels is an ellipse rx 26, ry 18 centred (0, 6).
//
// The forms, as today's hall has them: an oak post in a mound ringed with stakes, turned by a
// hand-bar (1); a stone drum with a gearbox on its face (2); a taller, capped drum with iron
// cleats and a whetstone (3). The Razor Gale's windmill mast behind the drum (a), the Steel
// Tempest's steel mast and post, hooped drum and spare blades (aa), the Hamstringer's snares
// staked on the ground (ab). The Brazier Wheel's brick furnace, iron post, grate and coal heap
// (b), the Solar Crown's gilding (ba), the Wildheart Pyre's living, smouldering trunk (bb).
//
// A MACHINE: nothing that turns is baked into the building. The wheel, the windmill's sails
// and the Solar Crown's sun are sprites of their own (wheelPix, sailsPix, sunPix below) that
// the hall file stamps live at the old hub, radius and phases; flames, chains, imps, sparks
// and the crank arm stay painted by the hall file. The spec's `live` has the pennant and the
// furnace's flame; its `lights` the grate ("torch", it flickers) and the fire ring ("ring",
// the hall drives it with the wheel's swell).
import { Pix, mat, flat } from "./pix.js";
import { STYLES, drum, disc, bandEdge, beam, ivy, boulder, hash, WARM } from "./hall-kit.js";

export const BOX = { w: 124, h: 152, ox: 60, oy: 124 };
export const LABEL = "Bladewheel";
const SQ = 0.5;                  // the camera's squash: the wheel's (the hall file's SQ), and so the drum's too
export const PHASES = 4;         // the wheel is baked at this many steps of one blade's turn (the hall file's PHASES)
const R0 = 21;                   // the drum's radius

const S_STONE = mat("#8a8478"), S_LIGHT = mat("#a19b90"), BRICK = mat("#9a5a44"), FCAP = mat("#5a4a44"), FCAP_L = mat("#75635b");
const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48");
const IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), STEEL = mat("#c4c8d0", { contrast: 1.2 }), STEELP = mat("#6a6a74", { contrast: 1.2 });
const GOLD = mat("#d8b34a", { contrast: 1.15 }), GOLD_L = mat("#f0c850", { contrast: 1.15 }), EARTH = mat("#7c6242"), SOOT = mat("#5a4c46"), MOUND = mat("#8a7a5a");
const WHET = mat("#b3a488"), COALM = mat("#2e2a30"), BARK = mat("#6e4c2c"), BARK_D = mat("#523820");
const DARK = flat("#2a1c18"), HOT = flat("#f8c860", { emis: true }), COAL = flat("#e8703a", { emis: true }), EMBER = flat("#e85a2a", { emis: true });
const FLAG_OF = { l2: "#a04a3f", l3: "#a04a3f", b: "#c05a28", ba: "#e8c14a", bb: "#e8703a" };
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// push the tone of every pixel on a ring / inside an ellipse once (kit tone() adds, so no pixel twice)
const ringTone = (px, cx, cy, r, sq, d, pid) => {
  const seen = new Set();
  for (let a = 0; a < Math.PI * 2; a += 0.45 / r) { const i = Math.floor(cx + Math.cos(a) * r), j = Math.floor(cy + Math.sin(a) * r * sq), k = i * 4096 + j; if (seen.has(k)) continue; seen.add(k); px.tone(i + 0.5, j + 0.5, d, pid); }
};
const ringDots = (px, cx, cy, r, sq, m, z, o = {}) => { for (let a = 0; a < Math.PI * 2; a += 0.45 / r) px.dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq, m, z, { n: [0, -0.8, 0.6], cast: 0, ...o }); };
const shade = (px, cx, cy, rx, ry, d, pid) => { for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) px.tone(i + 0.5, j + 0.5, d, pid); };
// an upright round bar (a post, a collar)
const bar = (px, x, top, bot, hw, m, z, o = {}) => { px.part(); px.poly([[x - hw, top], [x + hw, top], [x + hw, bot], [x - hw, bot]], m, z, { round: 0.9, ...o }); };

// ================= what turns: sprites the hall file stamps live =================
// The wheel, laid flat and squashed by the camera, its hub at the anchor.
//   s      the hall file's spec(t): { rr, n, fire, r4, lvl, branch } (board units)
//   k      which of PHASES steps of one blade's turn
//   small  the Steel Tempest's second wheel (with the shaft it rides on)
// Everything on it repeats with the blades, so the turn never jumps back.
export const wheelPix = (s, k = 0, small = false) => {
  const { r4, fire } = s, R = 2 * (small ? s.rr * 0.66 : s.rr), n = small ? 8 : s.n, step = (Math.PI * 2) / n, ph = (k / PHASES) * step;
  const len = fire ? 4 : r4 === "aa" ? 14 : 10, ext = Math.ceil(R + len) + 5, eh = Math.ceil(ext * SQ) + 7;
  const px = new Pix(ext * 2, eh * 2 + (small ? 10 : 0), ext, eh);
  const at = (a, r) => [Math.cos(a) * r, Math.sin(a) * r * SQ];
  const tip = mat(r4 === "aa" ? "#e8ecf2" : r4 === "ab" ? "#b8a898" : "#dde2ea", { contrast: 1.25 });
  const face = mat(fire ? "#4a4046" : r4 === "aa" ? "#5a5e6a" : "#4a4e58"), rim = mat(fire ? "#2e282e" : "#2e3038");
  if (small) bar(px, 0, 0, 15, 2.4, STEELP, -1);
  // the rim's edge: the wheel's thickness, below the top face
  px.part(); px.ellipse(0, 3.6, R, R * SQ, rim, 0, { round: 0.7 });
  if (!fire) for (let i = 0; i < n; i++) {
    // blades: flat steel, each catching the sun by where it points
    const a = ph + i * step, ca = Math.cos(a), sa = Math.sin(a), hook = r4 === "ab" ? 0.2 : 0.02;
    const p0 = at(a - 0.17, R - 1.5), p1 = at(a + 0.11, R - 1.5), tp = at(a + hook, R + len);
    px.part(); px.poly([p0, tp, p1], tip, 1 + sa * 0.3, { n: norm([0.5 * ca, -0.55 + 0.35 * sa, 0.6]) });
    if (r4 === "ab") { const b = at(a + 0.3, R + len - 3.5); px.dot(b[0], b[1], mat("#8a4a3a"), 1.4 + sa * 0.3, { cast: 0 }); px.dot(b[0] - sa, b[1] + ca * 0.5, mat("#8a4a3a"), 1.4 + sa * 0.3, { cast: 0 }); }   // the barb
  }
  // the top face: a steel edge, a rib and a bolt to every blade (or fire pot), the dressing ring
  disc(px, { y: 0, r: R, sq: SQ, m: face, z: 2 });
  const pid = px._pid;
  for (let j = -Math.ceil(R * SQ); j <= Math.ceil(R * SQ); j++) for (let i = -Math.ceil(R); i <= Math.ceil(R); i++) {   // the far side from the sun falls away
    const x = i + 0.5, y = j + 0.5;
    if ((x / R) ** 2 + (y / (R * SQ)) ** 2 < 1 && ((x + 4) / R) ** 2 + ((y + 2.5) / (R * SQ)) ** 2 > 1) px.tone(x, y, -1, pid);
  }
  ringTone(px, 0, 0, R - 1.2, SQ, 1, pid);
  for (let i = 0; i < n; i++) {
    const a = ph + i * step, q0 = at(a, R * 0.56), q1 = at(a, R - 3.4), b = at(a, R - 3);
    px.toneLine(q0[0], q0[1], q1[0], q1[1], -1, pid); px.tone(b[0], b[1], 2, pid);
  }
  if (!small && !fire && (s.lvl >= 3 || s.branch)) { if (r4 === "aa") ringDots(px, 0, 0, R * 0.6, SQ, GOLD, 2.2); else ringTone(px, 0, 0, R * 0.6, SQ, 2, pid); }
  if (fire) {
    // fire pots stood round the rim, coals in each (the hall file lights a flame on every one)
    const pot = mat(r4 === "ba" ? "#b08a3a" : "#3a3440", { contrast: 1.15 });
    for (let i = 0; i < n; i++) {
      const a = ph + i * step, [qx, qy] = at(a, R + 1), z = 3 + Math.sin(a) * 0.5;
      px.part(); px.ellipse(qx, qy + 0.4, 4.6, 3.4, pot, z, { round: 0.95 });
      px.ellipse(qx, qy - 1.2, 3, 1.3, COAL, z + 0.05, { cast: 0 }); px.dot(qx - 0.5, qy - 1.5, HOT, z + 0.1, { cast: 0 });
    }
  }
  const hr = R * 0.26;
  px.part(); px.ellipse(0, -1, hr, hr * 0.8, r4 === "aa" || r4 === "ba" ? GOLD : IRON_L, 5, { round: 1 });
  return px.resolve({ line: "tint" });
};

// The windmill's sails behind the Razor Gale's wheel: four cloth sails on a cross of spars,
// the hub at the anchor; k: which of 3 steps of a quarter turn (the hall file's phases).
export const sailsPix = (r4, k = 0) => {
  const px = new Pix(84, 84, 42, 42), ph = (k / 3) * (Math.PI / 2);
  const cloth = mat(r4 === "aa" ? "#d8dce4" : r4 === "ab" ? "#c8a888" : "#e8dcc0"), frame = r4 === "aa" ? STEELP : OAK;
  for (let i = 0; i < 4; i++) {
    const a = ph + (i / 4) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    px.part();
    px.poly([[ux * 8, uy * 8], [ux * 32, uy * 32], [ux * 32 + vx * 10, uy * 32 + vy * 10], [ux * 10 + vx * 7, uy * 10 + vy * 7]], cloth, 1, { n: [-0.15, -0.25, 0.95], bias: i % 2 ? -1 : 0 });
    for (const q of [0.45, 0.72]) px.toneLine(ux * 32 * q + vx, uy * 32 * q + vy, ux * 32 * q + vx * 8.6, uy * 32 * q + vy * 8.6, -1);   // the lattice under the cloth
    if (r4 === "ab" && i === 1) { px.part(); px.rect(ux * 22 + vx * 4 - 2, uy * 22 + vy * 4 - 2, 5, 4, mat("#a07858"), 1.2, { n: [0, 0, 1], cast: 0 }); }   // a patch
    beam(px, 0, 0, ux * 34, uy * 34, 2.6, frame, 2, { grain: false });
  }
  px.part(); px.ellipse(0, 0, 4.6, 4.6, r4 === "aa" ? GOLD : IRON_L, 3, { round: 1 });
  return px.resolve({ line: "tint" });
};

// The Solar Crown's gilded sun on its staff, the sun's middle at the anchor (it rides 36
// above the wheel's hub and bobs; the staff runs down to the hub).
export const sunPix = () => {
  const px = new Pix(52, 66, 26, 26);
  bar(px, 0, 4, 37, 1.8, GOLD, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, l = i % 2 ? 17 : 21, ca = Math.cos(a), sa = Math.sin(a);
    px.part(); px.poly([[Math.cos(a - 0.22) * 9, Math.sin(a - 0.22) * 9], [ca * l, sa * l], [Math.cos(a + 0.22) * 9, Math.sin(a + 0.22) * 9]], i % 2 ? GOLD : GOLD_L, 1, { n: norm([ca * 0.5, sa * 0.5 - 0.15, 0.75]) });
  }
  px.part(); px.ellipse(0, 0, 10, 10, GOLD_L, 2, { round: 0.9 });
  const F = flat("#8a5a20");
  for (const [x, y] of [[-4, -3], [-3, -3], [-4, -2], [-3, -2], [2, -3], [3, -3], [2, -2], [3, -2], [-3, 3], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 3]]) px.dot(x + 0.5, y + 0.5, F, 2.2, { cast: 0 });   // a sun's face
  return px.resolve({ line: "tint" });
};

// ================= what stands still: the building =================
// the furnace grate: an iron frame, bars, coals glowing behind them
const grate = (px, cx, y0, w, h) => {
  px.part(); px.rect(cx - w / 2 - 1.5, y0 - 1.5, w + 3, h + 3, IRON, 2, { n: [-0.2, -0.3, 0.93], cast: 0 });
  px.rect(cx - w / 2, y0, w, h, DARK, 2.1, { cast: 0 });
  for (let i = 0; i < w; i++) for (let j = 0; j < 5; j++) { const hv = hash(i, j, 3); if (j < 2 || hv > 0.3 + j * 0.15) px.dot(cx - w / 2 + i + 0.5, y0 + h - 0.5 - j, j === 0 || hv > 0.7 ? HOT : j < 3 ? COAL : EMBER, 2.2, { cast: 0 }); }
  for (let i = 0; i < 4; i++) { const bx = cx - w / 2 + 1.5 + i * ((w - 3) / 3); px.line(bx, y0, bx, y0 + h - 1, IRON, 2.3, { cast: 0 }); }
};
// the Wildheart Pyre's post: a living trunk, roots over the brick, leaves still sprouting, embers in the bark
const trunk = (px, top, foot0, seed) => {
  px.part();
  px.poly([[-13, foot0 + 3], [-7, foot0 - 8], [-8.5, top + 9], [-9, top], [9, top], [8, top + 9], [6.5, foot0 - 9], [15, foot0 + 3]], BARK, 3, { round: 0.85 });
  const pid = px._pid;
  px.toneLine(-2, foot0 - 1, -3, top + 6, -1, pid); px.toneLine(3, foot0 - 3, 2, top + 11, -1, pid); px.toneLine(-5.5, foot0 - 10, -5, top + 14, 1, pid);
  for (const [x, y] of [[-1.5, foot0 - 7], [-2.5, foot0 - 15], [3.5, foot0 - 12], [1.5, top + 8]]) px.dot(x, y, hash(x, y, seed) > 0.5 ? COAL : EMBER, 3.1, { cast: 0 });   // it smoulders
  beam(px, -8, foot0, -19, foot0 + 8, 4, BARK, 3.1, { grain: false }); beam(px, 9, foot0 + 1, 20, foot0 + 9, 4, BARK_D, 3.1, { grain: false });
  for (const [dx, dy, col] of [[-13, -14, "#5a8a3a"], [-16, -8, "#4a7a34"], [14, -18, "#8a7a2a"], [17, -12, "#5a8a3a"], [12, -24, "#a0602a"], [-11, -21, "#4a7a34"]]) { px.part(); px.ellipse(dx, foot0 + dy, 4.6, 3.2, mat(col), 3.3, { round: 0.9 }); }
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style }
export const build = (o = {}) => (back) => {
  const st = STYLES[o.style || "B"], level = o.level || 3, br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null, key = r4 || br || "l" + level;
  const gale = br === "a", fire = br === "b", post1 = !br && level === 1, tall = level >= 3 || !!br, seed = (o.seed || 0) * 7 + level;
  // the hall file's spec(t), the same numbers (board units): the wheel's radius, blades, hub height
  const s = { lvl: level, r4, gale, fire, branch: br, rr: 8 + level + (br ? 1.5 : 0), n: fire ? 8 : br ? 12 : 4 + level * 2, wy: 22 + level + (br ? 2 : 0) };
  const WY = -2 * s.wy, T = tall ? -24 : -18;                      // the hub; the drum's top
  const top = WY + 2, foot0 = post1 ? 1 : T;                       // the post: from under the wheel down to the cap (or the mound)

  back.part(); back.ellipse(0, 6, 24, 12, fire ? SOOT : EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });   // trodden earth (soot round the furnace)

  // the windmill's mast and its brace stand behind the drum
  if (gale) {
    // (both feet behind the drum: at the ground nothing may show past the narrow footprint)
    beam(back, 15, -4, 22, -88, 6, r4 === "aa" ? STEELP : OAK, -5, { bands: [0.3, 0.7], bandM: r4 === "aa" ? GOLD : IRON, seed: 4, grain: r4 !== "aa" });
    beam(back, 20.5, -4, 23, -74, 4.4, r4 === "aa" ? IRON : OAK_D, -5.2, { grain: false });
  }

  if (post1) {
    // a mound ringed with stakes: the far ones behind it, the near ones before it
    const stake = (i, z) => {
      const a = (i / 7) * Math.PI * 2 + 0.3, sx = Math.cos(a) * 20, sy = -1 + Math.sin(a) * 7.6, ln = Math.cos(a) * 2.2;   // sharpened, leaning out
      back.part(); back.poly([[sx - 2.2, sy + 3], [sx - 1.8 + ln, sy - 9], [sx + ln, sy - 14], [sx + 1.8 + ln, sy - 9], [sx + 2.2, sy + 3]], z < 0 ? OAK : TIMBER, z, { round: 0.85 });
      back.tone(sx + ln, sy - 12.5, 1); back.tone(sx + ln - 0.6, sy - 10.5, 1);
    };
    for (let i = 0; i < 7; i++) if (Math.sin((i / 7) * Math.PI * 2 + 0.3) < 0) stake(i, -1);
    back.part(); back.ellipse(0, 2, 16, 6.4, MOUND, 0, { round: 0.8 });
    for (const [x, y] of [[-9, 0], [6, -2], [11, 3], [-3, 5]]) back.tone(x, y, -1);
    for (let i = 0; i < 7; i++) if (Math.sin((i / 7) * Math.PI * 2 + 0.3) >= 0) stake(i, 1);
  } else {
    // the footing: a stone drum (capped and cleated from level three), a brick furnace for fire
    const wall = fire ? BRICK : S_STONE, capM = fire ? FCAP : S_LIGHT;
    const hoops = r4 === "aa" ? [[-12, 2.4, IRON]] : fire ? [] : tall && st.stones === 2 ? [[-9, 1.6, S_LIGHT]] : [];
    if (tall) {
      const cap = { deck: T, band: 4, r: R0 + 2, sq: SQ };
      drum(back, { top: T + 4, bot: -0.5, r: R0, r2: R0 + 1, sq: SQ, m: wall, z: 0, st, seed: seed + 7, course: fire ? 4 : 5, stoneW: fire ? 0.3 : 0.46, under: bandEdge(cap), underLen: 2.5, strings: hoops });
      drum(back, { top: T, bot: T + 4, r: R0 + 2, sq: SQ, m: capM, z: 0.4, st: STYLES.A, seed, course: 99, strings: r4 === "ba" ? [[T + 1.2, 1.6, GOLD]] : [] });
      disc(back, { y: T, r: R0 + 1.5, sq: SQ, m: fire ? FCAP_L : S_LIGHT, z: 0.6 });
      if (!fire) for (const dx of [-21, -3, 15]) { const u = (dx + 1.5) / (R0 + 2), fy = T + (R0 + 2) * SQ * Math.sqrt(Math.max(0, 1 - u * u)); back.part(); back.rect(dx, fy - 1, 3, 5.4, r4 === "aa" ? STEELP : IRON, 0.8, { n: [0, -0.2, 0.97] }); }   // iron cleats
    } else {
      drum(back, { top: T, bot: -0.5, r: R0, r2: R0 + 1.5, sq: SQ, m: wall, z: 0, st, seed: seed + 7, course: 5, stoneW: 0.46 });
      disc(back, { y: T, r: R0 - 0.6, sq: SQ, m: S_LIGHT, z: 0.6 });
    }
    // the wheel's shadow lies on the cap
    shade(back, 5, T + 3, s.rr * 1.5, s.rr * 0.62, -1, back._pid);
    if (fire) grate(back, 8, -11, 14, 13);
    else if (st.moss && !tall) ivy(back, 17, 8, 9, 3, { seed: seed + 4, side: -1, spread: 2 });   // the taller drums keep that corner for the whetstone
  }

  // the post, standing ON the cap (or in the mound), its iron collars
  if (r4 === "bb") trunk(back, top, foot0, seed);
  else {
    const wood = !fire && r4 !== "aa";
    bar(back, 0, top, foot0 + 1.5, 4.8, fire ? IRON : r4 === "aa" ? STEELP : TIMBER, 3);
    if (wood) { const pid = back._pid; back.toneLine(-1.5, top + 4, -1.5, foot0 - 3, -1, pid); back.toneLine(2.5, top + 9, 2.5, foot0 - 8, -1, pid); }
    const collars = br ? 3 : level, cm = r4 === "ba" ? GOLD : fire || r4 === "aa" ? IRON_L : IRON;
    for (let i = 0; i < collars; i++) bar(back, 0, foot0 - 6 - i * 8, foot0 - 1.6 - i * 8, 6.6, cm, 3.2);
    if (post1) bar(back, 0, -14.5, -10.5, 6, IRON, 3.2);          // the socket the hand-bar runs through
  }

  // the gearbox bolted to the drum's face, the crank's hub on it (the arm and handle are live)
  if (!post1) {
    back.part(); back.rect(-15, -9, 14, 10.5, fire ? mat("#4a4a52") : OAK, 5, { n: [-0.25, -0.1, 0.96] });
    back.toneLine(-15, -8.5, -1.5, -8.5, 1); back.toneLine(-15, 0.5, -1.5, 0.5, -1); back.toneLine(-15, -4.5, -1.5, -4.5, fire ? 1 : -1);
    for (const [x, y] of [[-14, -7], [-3, -7], [-14, -1], [-3, -1]]) back.dot(x, y, IRON_L, 5.1, { cast: 0 });
    back.part(); back.ellipse(-8, -10, 4.4, 4.4, IRON_L, 5.3, { round: 0.95 }); back.dot(-8.5, -10.5, IRON, 5.4, { cast: 0 });
  }

  // a lantern hung from an iron bracket on the drum's face, right of the gearbox (levels 2 up; the furnace has its grate)
  if (!post1 && !fire) {
    const ly = T + 3;
    back.part(); back.rect(10, ly - 2, 1, 4, IRON, 5, { cast: 0 }); back.rect(8, ly + 1, 5, 1, IRON, 5.1, { cast: 0 });
    back.rect(8, ly + 2, 1, 5, IRON, 5.1, { cast: 0 }); back.rect(12, ly + 2, 1, 5, IRON, 5.1, { cast: 0 }); back.rect(8, ly + 7, 5, 1, IRON, 5.1, { cast: 0 });
    back.rect(9, ly + 2, 3, 5, WARM, 5.2, { cast: 0 });
  }

  // dressings on the ground before the drum, each inside the narrow footprint
  if (tall && !fire) {
    // a whetstone on its frame, for the blades
    beam(back, 14, 17, 17, 6, 2.4, OAK, 6, { grain: false }); beam(back, 20, 17, 17, 6, 2.4, OAK_D, 6, { grain: false });
    back.part(); back.ellipse(17, 6, 5.2, 5.6, WHET, 6.2, { round: 0.55 });
    ringTone(back, 17, 6, 4.2, 1.08, -1, back._pid); back.rect(16, 5, 2, 2, IRON, 6.3, { n: [0, 0, 1], cast: 0 });
    back.part(); back.line(18, 6, 21, 3, IRON, 6.4, { cast: 0 }); back.dot(21.5, 2.5, IRON_L, 6.4, { cast: 0 });   // its handle
  }
  if (fire) {
    // the coal heap, an ember or two in it
    boulder(back, 14, 15.6, 3.2, 2.8, COALM, 6); boulder(back, 11, 18.4, 4.2, 3.4, COALM, 6.1); boulder(back, 17, 17.6, 3, 2.6, COALM, 6.2);
    back.dot(12.5, 16.5, EMBER, 6.3, { cast: 0 }); back.dot(16.5, 16, COAL, 6.3, { cast: 0 });
  }
  if (r4 === "ab") for (const [dx, dy] of [[-3, 21.6], [8.4, 20]]) {
    // snares staked on the ground
    back.part(); ringDots(back, dx, dy, 5.4, 0.4, IRON_L, 6, { n: [0, 0, 1] });
    for (const a of [0.6, 2.5, 3.9, 5.4]) back.dot(dx + Math.cos(a) * 5.4, dy + Math.sin(a) * 2.2 - 1, STEEL, 6.1, { cast: 0 });
    back.part(); back.rect(dx + 4.4, dy - 6, 2, 6.5, OAK, 6.2, { n: [-0.3, 0, 0.95] });
  }
  if (r4 === "aa") for (const [dx, b] of [[6, 17], [10.5, 18]]) {
    // spare steel blades stood in the ground
    back.part(); back.poly([[dx, b], [dx, b - 18], [dx + 1, b - 21], [dx + 2, b - 18], [dx + 2, b]], STEEL, 6, { n: [-0.4, -0.2, 0.9] });
    back.rect(dx - 1.5, b - 6, 5, 2, IRON_L, 6.1, { n: [0, -0.5, 0.86], cast: 0 });
  }

  // what moves: the pennant on a tall pole behind the wheel (the mast takes its place on the
  // Gale line), the furnace's flame; light: the grate on the brick, the fire ring on the post
  const live = [], lights = [], R = 2 * s.rr;
  if (gale) live.push({ kind: "machine", x: 22, y: -84, get img() { return sailsPix(r4, 0); } });
  else if (!post1) { const flagTop = WY - R * SQ - (fire ? 17 : 14); live.push({ kind: "pennant", x: 19, y: T - 3, col: FLAG_OF[key], pole: Math.round(T - 3 - flagTop - 7), len: 12 }); }
  if (!post1 && !fire) lights.push({ key: "lamp", x: 10.5, y: T + 5, r: 13, col: "#ffcf70", a: 0.55 });
  if (fire) {
    live.push({ kind: "flame", x: 8, y: 1, w: 5, h: 7 });
    lights.push({ key: "torch", x: 8, y: -4, r: 22, col: "#ffa040", a: 0.85 });
    lights.push({ key: "ring", x: 0, y: WY + 6, r: 34, col: r4 === "ba" ? "#ffd060" : "#ff9040", a: 0.7, k: 0.6 });
  }
  // the lab pages (hall-render.mjs) lay these on; the game's hall file stamps its own, turning
  live.push({ kind: "machine", x: 0, y: WY, get img() { return wheelPix(s, 0); } });
  if (r4 === "aa") live.push({ kind: "machine", x: 0, y: WY - 14, get img() { return wheelPix(s, 2, true); } });
  if (r4 === "ba") live.push({ kind: "machine", x: 0, y: WY - 36, get img() { return sunPix(); } });
  const [cdx, cdy] = post1 ? [-9.5, 6.8] : [-7.5, 8];              // the hall file's crewSpot
  return {
    live, lights,
    crew: [{ fig: "engineer", x: 2 * cdx, y: 2 * cdy, dir: 1, clip: post1 ? "barIdle" : "wheelIdle", variant: fire ? "stoker" : "engineer" }],
    shadow: { rx: post1 ? 17 : 20, ry: 7, dx: 3, dy: 7 },
  };
};
