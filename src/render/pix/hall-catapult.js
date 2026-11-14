// ============ PIX HALL: the Catapult, all nine forms ============
// The machine the game draws while "New sprites" is on (render/halls/catapult.js asks for
// it through pix/halls.js); the old painter stays under the switch. Treatment B of the
// concept round: clean timber with grain, iron bands, rope lashings, the skein, iron-tyred
// spoked wheels, a thin tinted line and one sun.
//
// THE ENGINE AND THE ENGINEER DECIDE THE MACHINE. halls/catapult.js `spec` holds the
// numbers the engine shares (the bed's half-length, the pivot, the arm's length and its
// cocked / stop angles: update.js starts the stone from the same tip), and the engineer's
// fists ride the winch's handle or hold the lever's end (crews.js, fig-engineer.js). `geo`
// below is a copy of that spec and everything is built round it, in ART PIXELS (two to a
// board unit) from the hall's ANCHOR (t.x, t.y), y down, FACING +x (the target is east,
// the engineer stands at the west end). The wheels meet the turf at +14. A hall that faces
// west bakes with `flip` and is drawn mirrored (halls.js), so the sun stays put.
//
// The forms, as today's hall has them: a rope-lashed field engine on plank wheels (1),
// iron-shod with spoked wheels and a standard (2), the full carriage with painted trim
// and a crate of dressed shot (3); the Trebuchet's tall trestle (a), the Earthshaker's
// grey timbers, granite chocks and cracked ground (aa), the Comet Sling's charred frame,
// pitch cauldron and pots (ab); the Log Roller's ramp and spare logs (b), the Iron Drum's
// iron-bound grey ramp and hoops (ba), the Powder Keg Run's kegs and fuse cord (bb).
//   build({ level, branch, rank4, seed, style, game })
// game: true (the hall file) = only what stands still, split in two pictures: BACK behind
// the throwing arm or the log, FRONT (the near frame and wheels, the ramp's near rail) over
// it; no ground pad (the hall file stamps `ground` itself, so the bed can hop without it).
// Without it (the concept sheet, scripts/hall-render.mjs) the whole machine goes into one
// picture with its arm cocked or its log waiting, standing on its pad.
//   What moves is NOT baked: the arm (`arm`, a picture per 6 degree step), the stone
// (`shot`), the counterweight (`weight`), the log (`log`) are small pictures the hall file
// stamps live; ropes, sling, chock, lever, dust and fire stay the hall file's own.
import { Pix, mat, flat } from "./pix.js";
import { beam, wheel, boulder } from "./hall-kit.js";

export const BOX = { w: 104, h: 116, ox: 52, oy: 84 };
export const LABEL = "Catapult";
export const SHEET_DY = -9;      // the concept sheet stands halls on their base line; this one is drawn from the anchor, 9 px above it

const TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48"), TIMBER_D = mat("#5c4028"), WHEEL = mat("#7a5634"), ARM = mat("#9a6c40");
const IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), TYRE = mat("#6c727e", { contrast: 1.2 }), ROPE = mat("#c8b48a"), ROPE_D = mat("#8a744c");
const GRANITE = mat("#8e8c94"), BLOCK = mat("#8a8a94"), RED = mat("#a04a3f"), EARTH = mat("#8a7048"), STRAW = mat("#b8a070"), LEATHER = mat("#6a4a2e");
const POT = mat("#3a3440"), PITCH = flat("#2e2630"), CLAY = mat("#5a4a44"), DARK = flat("#2a2030"), BARK = mat("#6a4a2c"), ENDWOOD = mat("#d8b888");
const KEG = mat("#8a3a2e"), KEG_HOOP = mat("#3a3030"), GILT = mat("#e8d47a"), DRUM = mat("#4e525c"), DRUM_L = mat("#7a808c", { contrast: 1.2 }), SOOT = mat("#4a3c3c");
// a form's timber: the frame, a tone up for what faces the sky, a tone down for the far side
const WOOD_OF = {
  base: [TIMBER, TIMBER_L, TIMBER_D], aa: [mat("#6a5a48"), mat("#847258"), mat("#4c4034")], ab: [mat("#4a3a34"), mat("#5e4a40"), mat("#342828")],
  ba: [mat("#6a6058"), mat("#827868"), mat("#4a443e")],
};
const ARM_OF = { base: ARM, aa: mat("#8a6a48"), ab: mat("#5a4638") };
const FLAG_OF = { base: "#a04a3f", a: "#6a86b0", aa: "#8a8a94", ab: "#d0602a", b: "#a0603a", ba: "#5c626e", bb: "#c05848" };
const D2R = Math.PI / 180;

// halls/catapult.js `spec`, in art pixels (x2). Keep the two in step: the engine reads that one.
export const geo = (level, branch) => {
  const HW = 2 * (10.5 + level * 0.5 + (branch ? 0.5 : 0)), lvl = branch ? 3 : level;
  if (branch === "a") return { HW, lvl, treb: true, px: 6, fh: 68, L: 52, butt: 16, cocked: -102 };
  if (branch === "b") return { HW, lvl, roller: true };
  return { HW, lvl, px: 6, fh: 2 * (20 + level), L: 2 * (16 + level), butt: 6, cocked: level === 1 ? -66 : -72 };
};
const WINCH_Y = -14;             // the winch's axle (WINCH_DY x2): the engineer's handle turns round it
const formOf = (o) => { const br = o.branch || null, r4 = o.rank4 ? br + o.rank4 : null; return { level: o.level || 3, br, r4, key: r4 || br || "base" }; };

// ---- small parts ---------------------------------------------------------------------------
const lash = (px, x, y, w, h, z) => { px.part(); px.rect(x - w / 2, y - h / 2, w, h, ROPE, z, { n: [0, -0.2, 0.97], cast: 0 }); px.toneLine(x - w / 2, y + 0.5, x + w / 2 - 1, y + 0.5, -1); };
const rivet = (px, x, y, z) => px.dot(x, y, IRON_L, z, { fix: 4, cast: 0 });
// a plank wheel: a solid disc of three boards on two battens, a wooden hub
const plankWheel = (px, cx, cy, r, m, z) => {
  px.part(); px.ellipse(cx, cy, r * 0.92, r, m, z, { round: 0.45 });
  for (const dy of [-0.38, 0.3]) px.toneLine(cx - r * 0.8, cy + dy * r, cx + r * 0.8, cy + dy * r, -1);
  for (const dx of [-0.5, 0.5]) for (let y = -r * 0.7; y <= r * 0.7; y += 1) px.tone(cx + dx * r, cy + y, 1);
  px.ellipse(cx, cy, 2.2, 2.2, TIMBER_D, z + 0.1, { round: 0.8, cast: 0 }); px.dot(cx - 0.5, cy - 0.5, IRON_L, z + 0.2, { fix: 3, cast: 0 });
};
// a keg standing: staves, two dark hoops, a gilt mark
const keg = (px, x, y, w, h, z, mark = true) => {
  px.part(); px.poly([[x - w / 2 + 1, y - h], [x + w / 2 - 1, y - h], [x + w / 2, y - h * 0.5], [x + w / 2 - 1, y], [x - w / 2 + 1, y], [x - w / 2, y - h * 0.5]], KEG, z, { round: 0.85 });
  for (const k of [0.22, 0.78]) for (let i = -w / 2; i < w / 2; i++) px.dot(x + i + 0.5, y - h * k, KEG_HOOP, z + 0.1, { cast: 0 });
  px.ellipse(x, y - h, w / 2 - 1, 1.6, mat("#a85040"), z + 0.15, { round: 0.2, cast: 0 });
  if (mark) { px.dot(x - 0.5, y - h * 0.5, GILT, z + 0.2, { fix: 3, cast: 0 }); px.dot(x + 0.5, y - h * 0.5 + 1, GILT, z + 0.2, { fix: 3, cast: 0 }); }
};
// a log's end, as the spare ones lie stacked: bark round pale end grain
const logEnd = (px, x, y, r, z) => { px.part(); px.ellipse(x, y, r, r * 0.9, BARK, z, { round: 0.6 }); px.ellipse(x, y, r - 2, r * 0.9 - 1.8, ENDWOOD, z + 0.1, { round: 0.3, cast: 0 }); px.dot(x, y, BARK, z + 0.2, { cast: 0 }); };

// ---- the ground a machine stands on (the hall file stamps it under the hopping bed) ---------------
const groundInto = (px, G, F) => {
  const { HW } = G;
  px.part(); px.ellipse(0, 9, Math.min(36, HW + 9), 10, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 });
  if (F.r4 === "aa") {
    // the Earthshaker has cracked its own ground
    for (const [dx, dy, a] of [[-30, 8, 0.3], [10, 14, -0.4], [-14, 17, 0.1], [4, 7, 0.6], [-24, 14, -0.2]]) {
      px.toneLine(dx, dy, dx + 7, dy + 3 + a * 4, -2); px.toneLine(dx + 7, dy + 3 + a * 4, dx + 12, dy + a * 6, -2); px.toneLine(dx + 12, dy + a * 6, dx + 19, dy + 2 + a * 3, -2);
    }
    for (const [dx, dy] of [[-27, 17], [25, 17], [3, 20]]) boulder(px, dx, dy, 2.6, 2, mat("#8a7e6c"), -40);
  }
  if (F.r4 === "ab") for (let j = -3; j <= 3; j++) for (let i = -9; i <= 9; i++) if ((i / 9) ** 2 + (j / 3) ** 2 < 1 && (i + j) % 2 === 0) px.tone(-(HW - 4) + i, 9 + j, -1);   // soot under the cauldron
};
// the hall file's ground picture: the pad alone, in a box of its own
export const ground = (o = {}, flip = false) => {
  const F = formOf(o), G = geo(F.level, F.br), px = new Pix(84, 34, 42, 6);
  groundInto(px, G, F);
  return px.resolve({ flip });
};

// ---- the mangonel and the trebuchet: what stands still -------------------------------------------
const aFrame = (px, G, near, W, z) => {
  const { HW, fh, lvl, treb } = G, [m, mL, mD] = W;
  const ax = G.px, ay = -fh + (near ? 4 : 0), base = near ? -9 : -15;
  const bx = -(HW - (near ? 8 : 10)), fx = HW - (near ? 6 : 8), w = near ? (treb ? 7 : lvl >= 3 ? 6 : 5) : 4;
  const bands = near && (lvl >= 2 || treb) ? [0.3, 0.72] : null, mm = near ? m : mD;
  beam(px, bx, base, ax - 1.6, ay, w, mm, z, { seed: 2, bands, bandM: IRON, grain: near });
  beam(px, fx, base, ax + 1.6, ay, w, mm, z, { seed: 3, bands, bandM: IRON, grain: near });
  // the tie between the legs (and a second rung for the tall trestle)
  for (const k of treb ? [0.42, 0.74] : [0.5]) {
    const cy = base + (ay - base) * k;
    beam(px, bx + (ax - bx) * k - 1, cy, fx + (ax - fx) * k + 1, cy, near ? 4 : 3, near ? mL : mD, z + 0.2, { grain: false });
    if (near && lvl === 1 && !treb) for (const ex of [bx + (ax - bx) * k, fx + (ax - fx) * k]) lash(px, ex, cy, 4, 5, z + 0.3);
  }
  if (!near) return;
  // where the legs meet: the skein the arm turns in, bound with rope at level one, capped in iron after
  px.part(); px.ellipse(ax, ay + 1, 4.4, 4.4, lvl === 1 && !treb ? ROPE : ROPE_D, z + 0.4, { round: 0.7 });
  for (let j = -3; j <= 3; j += 2) px.toneLine(ax - 3, ay + 1 + j, ax + 3, ay + 1 + j, -1);
  if (lvl === 1 && !treb) return;
  px.part(); px.ellipse(ax, ay + 1, 2.2, 2.2, IRON_L, z + 0.5, { round: 0.9, cast: 0 });
};

const engineInto = (back, front, G, F, game) => {
  const { HW, fh, lvl, treb } = G, { r4 } = F, W = WOOD_OF[r4] || WOOD_OF.base, [m, mL, mD] = W;
  const shotM = r4 === "aa" ? BLOCK : GRANITE;
  // ---- BACK: the far side of the carriage, the bed's top, the stop, the winch
  for (const s of [-1, 1]) {
    const wx = s * (HW - 10) + 2;
    if (lvl === 1) plankWheel(back, wx, -10, 8, mD, -8); else wheel(back, wx, -10, 9, mD, IRON, -8, { turn: 0.3, spokes: 6 });
  }
  if (lvl >= 3) {
    // a crate of dressed shot behind the bed's front end
    const cx = HW - 6;
    back.part(); back.rect(cx - 9, -29, 18, 13, TIMBER, -7, { n: [0, -0.1, 0.99] });
    back.toneLine(cx - 9, -29, cx + 8, -29, 1); back.toneLine(cx - 8, -18, cx + 7, -27, -1); for (const ex of [cx - 9, cx + 8]) back.toneLine(ex, -28, ex, -17, -1);
    for (const [dx, dy, r] of [[-4.4, -30, 3.8], [3.6, -30, 4], [0, -34, 3.6]]) boulder(back, cx + dx, dy + 2.6, r, r * 0.9, shotM, -6.8);
  } else {
    // a pile of field stones, behind the bed at the front
    const pts = lvl === 1 ? [[0, 0, 4.6], [5, 1, 3.8]] : [[0, 0, 4.6], [5.4, 1, 4.2], [2.6, -4.4, 4], [-4.2, 1.4, 3.4]];
    for (const [dx, dy, r] of pts) boulder(back, HW - 6 + dx, -15 + dy + r * 0.6, r, r * 0.88, GRANITE, -7);
  }
  if (r4 === "ab") {
    // the pitch cauldron on its tripod, over the fire behind the far wheel
    const cx = -(HW - 4);
    for (const dx of [-6, 0, 6]) beam(back, cx + dx, -12, cx + dx * 0.4, -26, 2, TIMBER_D, -7.6, { grain: false });
    back.part(); back.ellipse(cx, -26, 10, 7.2, POT, -7.4, { round: 0.95 });
    back.part(); back.ellipse(cx, -31.4, 8.2, 2.4, IRON_L, -7.3, { round: 0.3 }); back.ellipse(cx, -31.4, 6.6, 1.4, PITCH, -7.2, { cast: 0 });
  }
  aFrame(back, G, false, W, -6);
  // the bed's top, planked
  back.part(); back.poly([[-HW + 2, -18], [HW - 2, -18], [HW, -10], [-HW, -10]], mL, -4, { n: [0, -0.75, 0.66] });
  for (let x = -HW + 6; x < HW - 2; x += 7) back.toneLine(x, -17.5, x - 0.6, -10.5, -1);
  if (!treb) {
    // the stop: a post the arm slams into, braced, a straw sack roped to its head
    const sx = G.px + 14, top = -fh - 14;
    beam(back, sx, -27, HW - 6, -12, 3, mD, -3.4, { grain: false });
    beam(back, sx, -12, sx, top, 5, m, -3, { seed: 5, bands: lvl >= 2 ? [0.25] : null, bandM: IRON });
    back.part(); back.ellipse(sx - 3.4, top + 5.4, 3.6, 5.2, STRAW, -2.6, { round: 0.8 });
    back.toneLine(sx - 6.6, top + 4.5, sx - 0.4, top + 4.5, -1); back.toneLine(sx - 6.6, top + 7.5, sx - 0.4, top + 7.5, -1);
  }
  // the winch at the back of the bed: two cheeks, the drum, rope wound on it, its axle
  const wx = -(HW - 6);
  for (const s of [-1, 1]) beam(back, wx + s * 5.4, -9, wx + s * 5.4, WINCH_Y - 4, 3, mD, -2.4, { grain: false });
  back.part(); back.rect(wx - 4.6, WINCH_Y - 4.4, 9.2, 8.8, TIMBER_D, -2, { n: [0, -0.2, 0.97], round: 0 });
  back.toneLine(wx - 4.6, WINCH_Y - 4.4, wx + 4.4, WINCH_Y - 4.4, 1); back.toneLine(wx - 4.6, WINCH_Y + 3.6, wx + 4.4, WINCH_Y + 3.6, -1);
  back.part(); for (const dy of [-2, 1]) for (let i = -4; i < 4; i++) back.dot(wx + i + 0.5, WINCH_Y + dy + 0.5, ROPE, -1.9, { cast: 0, bias: i > 1 ? -1 : 0 });
  back.dot(wx, WINCH_Y, IRON_L, -1.8, { fix: 4, cast: 0 });

  // ---- the near rail: BACK too (the arm swings over it), shod at the ends from level two
  back.part(); back.rect(-HW, -10, HW * 2, 12, m, 2, { n: [0, -0.1, 0.99] });
  back.toneLine(-HW, -9.6, HW - 1, -9.6, 1); back.toneLine(-HW, 1.4, HW - 1, 1.4, -1);
  for (let x = -HW + 5; x < HW - 4; x += 8) { back.tone(x, -4.5, -1); back.tone(x + 1, -4.5, -1); }
  if (lvl === 1) for (const s of [-1, 1]) lash(back, s * (HW - 3), -4, 4, 13, 2.2);
  else for (const s of [-1, 1]) { back.part(); back.rect(s > 0 ? HW - 4 : -HW, -11, 4, 14, IRON, 2.2, { n: [s * 0.3, -0.2, 0.9], cast: 0 }); rivet(back, s * (HW - 2) - 0.5, -7.5, 2.3); rivet(back, s * (HW - 2) - 0.5, -0.5, 2.3); }
  if (lvl >= 3 && !r4) { back.part(); back.rect(-HW + 6, -3.4, HW * 2 - 12, 2.4, RED, 2.1, { n: [0, -0.1, 0.99], cast: 0 }); }   // the painted trim

  // ---- FRONT: the near frame and the near wheels, over the arm
  aFrame(front, G, true, W, 6);
  for (const s of [-1, 1]) {
    const cx = s * (HW - 8), cy = 3;
    if (lvl === 1) plankWheel(front, cx, cy, 8.8, WHEEL, 8);
    else wheel(front, cx, cy, lvl >= 3 ? 10.8 : 10, r4 === "ab" ? m : TIMBER_L, TYRE, 8, { turn: s * 0.2, spokes: lvl >= 3 ? 8 : 6 });
  }
  if (r4 === "aa") for (const s of [-1, 1]) boulder(front, s * (HW + 5), 13.4, 3.6, 3, BLOCK, 9);          // granite chocks against the rims
  if (r4 === "ab") for (const [dx, dy] of [[0, 0], [7.2, 1.6]]) {                                            // pitch pots ready before the bed
    const x = 5.2 + dx, y = 19.2 + dy;
    front.part(); front.ellipse(x, y, 4.4, 3.6, CLAY, 9, { round: 0.9 }); front.ellipse(x, y - 2.6, 2.8, 1.2, PITCH, 9.1, { cast: 0 });
  }
  void game;
};

// ---- the throwing arm (live: the hall file stamps one picture per 6 degree step) -----------------
// Drawn about its pivot at (cx, cy), `deg` from straight up, positive toward the target.
const armInto = (px, cx, cy, deg, G, F, z) => {
  const a = deg * D2R, ux = Math.sin(a), uy = -Math.cos(a), { lvl, treb, L, butt } = G;
  const m = ARM_OF[F.r4] || ARM_OF.base, w = treb ? 7 : lvl >= 3 ? 7 : 6;
  const bands = treb ? [0.3, 0.55, 0.85] : lvl === 1 ? null : lvl === 2 ? [0.5, 0.85] : [0.35, 0.62, 0.88];
  const tx = cx + ux * L, ty = cy + uy * L, bx = cx - ux * butt, by = cy - uy * butt;
  beam(px, bx, by, tx, ty, w, m, z, { seed: 4, bands, bandM: IRON });
  if (treb) {
    // the short end's pin (the counterweight hangs from it) and the tip's release hook
    px.part(); px.ellipse(bx, by, 3.4, 3.4, IRON_L, z + 0.3, { round: 0.9 });
    px.part(); px.ellipse(tx, ty, 2.8, 2.8, IRON, z + 0.3, { round: 0.9 });
    return;
  }
  if (lvl === 1) for (const fr of [0.3, 0.7]) lash(px, cx + ux * L * fr, cy + uy * L * fr, 5, 5, z + 0.2);
  // the cup: a leather sling-bucket at one, iron after, its hollow turned to the sky
  px.part(); px.ellipse(tx, ty, 6.2, 5.8, lvl === 1 ? LEATHER : IRON, z + 0.4, { round: 0.9 });
  px.ellipse(tx - uy * 1.8, ty + ux * 1.8 - 0.8, 3.8, 2.4, DARK, z + 0.5, { cast: 0 });
};
const formKey = (o) => `${o.level || 3}|${o.branch || ""}|${o.rank4 || ""}`;
export const armKey = (o, deg, flip) => `catarm|${formKey(o)}|${deg}|${flip ? 1 : 0}`;
export const arm = (o, deg, flip = false) => {
  const F = formOf(o), G = geo(F.level, F.br), R = G.L + 10, px = new Pix(R * 2, R * 2, R, R);
  armInto(px, 0, 0, deg, G, F, 0);
  return px.resolve({ flip });
};
// the stone in the cup or the sling's pouch (its middle is the picture's anchor)
const shotR = (F, G) => (F.r4 === "aa" ? 6 : G.treb ? 5.2 : 5);
export const shot = (o, flip = false) => {
  const F = formOf(o), G = geo(F.level, F.br), r = shotR(F, G), px = new Pix(18, 18, 9, 9);
  px.part(); px.ellipse(0, 0, r, r * 0.92, F.r4 === "aa" ? BLOCK : GRANITE, 0, { round: 0.95 }); px.tone(-1.5, 1.5, -1); px.tone(2, -1, -1);
  return px.resolve({ flip });
};
// the trebuchet's counterweight, which always hangs plumb from its pin at (x, y)
const weightInto = (px, x, y, F, z) => {
  px.part(); px.rect(x - 6, y, 2, 8, IRON, z, { n: [0, 0, 1], cast: 0 }); px.rect(x + 4, y, 2, 8, IRON, z, { n: [0, 0, 1], cast: 0 });
  if (F.r4 === "aa") {
    // a carved granite block, iron-hooped, a mason's rune cut in its face
    px.part(); px.poly([[x - 15, y + 6], [x + 15, y + 6], [x + 16, y + 9], [x + 16, y + 32], [x + 14, y + 34], [x - 14, y + 34], [x - 16, y + 32], [x - 16, y + 9]], BLOCK, z + 0.1, { round: 0.5 });
    px.part(); for (const hy of [10, 28]) px.rect(x - 16, y + hy, 32, 3, IRON, z + 0.2, { n: [0, -0.3, 0.95], cast: 0 });
    for (const [dx, dy] of [[0, 15], [0, 17], [0, 19], [0, 21], [0, 23], [-2, 17], [2, 17], [-3, 19], [3, 19]]) px.tone(x + dx, y + dy, -2);
    return;
  }
  // a planked box heaped with stones
  const m = (WOOD_OF[F.r4] || WOOD_OF.base)[0];
  px.part(); px.rect(x - 12, y + 6, 24, 20, m, z + 0.1, { n: [0, -0.1, 0.99] });
  px.toneLine(x - 12, y + 6, x + 11, y + 6, 1); px.toneLine(x - 9, y + 15.5, x + 8, y + 15.5, -1); px.toneLine(x - 12, y + 25.5, x + 11, y + 25.5, -1);
  px.part(); for (const sx of [x - 12, x + 9]) { px.rect(sx, y + 6, 3, 20, IRON, z + 0.2, { n: [0, 0, 1], cast: 0 }); rivet(px, sx + 1, y + 9, z + 0.3); rivet(px, sx + 1, y + 22, z + 0.3); }
  for (const [dx, r] of [[-5, 4], [2, 4.4], [7, 3.4]]) boulder(px, x + dx, y + 8, r, r * 0.86, GRANITE, z + 0.05);
};
export const weight = (o, flip = false) => {
  const F = formOf(o), px = new Pix(44, 44, 22, 5);
  weightInto(px, 0, 0, F, 0);
  return px.resolve({ flip });
};

// ---- the Log Roller: a sloped plank ramp, deep enough to hold a log end-on -----------------------
// halls/catapult.js RAMP x2: the near edge runs from A (high, at the back) down to B (the lip, on
// the field); the far edge is the near one moved by (sk, -d).
const RAMP = (HW) => ({ ax: -(HW - 6), ay: -30, bx: HW + 2, by: -2, d: 22, sk: -6 });
const rampY = (R, x) => R.ay + ((x - R.ax) / (R.bx - R.ax)) * (R.by - R.ay);
const logR = (F) => (F.r4 === "ba" ? 14.8 : 14);
// where the waiting log's near end sits (halls/catapult.js logSpot x2)
const logAt = (HW, F) => { const R = RAMP(HW), rr = logR(F), lx = R.ax + 18; return [lx, rampY(R, lx) - R.d * 0.35 - rr * 0.8, rr]; };

const rampInto = (back, front, G, F) => {
  const { HW } = G, { r4 } = F, R = RAMP(HW), W = r4 === "ba" ? WOOD_OF.ba : WOOD_OF.base, [m, mL, mD] = W, bandM = r4 === "ba" ? IRON_L : IRON;
  // ---- BACK: what is stacked behind, the far rail and its post, the bed, the hauling winch
  if (r4 === "bb") for (const [dx, dy] of [[0, 0], [12, 0], [6, -10]]) keg(back, HW - 12 + dx, -18 + dy, 10.8, 13, -8 + dy * -0.01);
  else if (r4 === "ba") for (const dx of [0, 6]) {                                           // spare iron hoops leaning there
    back.part();
    for (let t = 0; t < 40; t++) { const a = (t / 40) * Math.PI * 2; back.dot(HW - 10 + dx + Math.cos(a) * 5.6, -30 + Math.sin(a) * 9.6, IRON_L, -8 + dx * 0.01, { bias: Math.sin(a) > 0.3 ? -1 : 0 }); }
  } else for (const [dx, dy] of [[0, 0], [14, 0], [7, -11]]) logEnd(back, HW - 14 + dx, -24 + dy, 6.4, -8 + dy * -0.01);
  beam(back, R.ax + R.sk, R.ay - R.d, R.ax + R.sk, -18, 5, mD, -6.2, { grain: false });
  beam(back, R.ax + R.sk, R.ay - R.d, R.bx + R.sk, R.by - R.d, 4, mD, -6, { grain: false, bands: r4 === "ba" ? [0.25, 0.6] : null, bandM });
  back.part(); back.poly([[R.ax, R.ay], [R.bx, R.by], [R.bx + R.sk, R.by - R.d], [R.ax + R.sk, R.ay - R.d]], mL, -4, { n: [0.2, -0.7, 0.68] });
  for (let k = 1; k < 4; k++) { const o = k / 4; back.toneLine(R.ax + R.sk * o, R.ay - R.d * o, R.bx + R.sk * o - 1, R.by - R.d * o, -1); }
  for (let k = 1; k < 5; k++) { const x = R.ax + (R.bx - R.ax) * (k / 5), y = rampY(R, x); for (const o of [0.12, 0.62]) { back.tone(x + R.sk * o, y - R.d * o - 1, -1); } }   // nail heads
  if (r4 === "ba") for (const k of [0.3, 0.7]) {                                             // iron runners across the bed
    const x = R.ax + (R.bx - R.ax) * k, y = rampY(R, x);
    back.part(); for (let o = 0.04; o < 0.98; o += 0.04) { back.dot(x + R.sk * o, y - R.d * o, IRON_L, -3.8, { cast: 0 }); back.dot(x + R.sk * o + 1, y - R.d * o, IRON, -3.8, { cast: 0 }); }
  }
  const wx = R.ax - 4, wy = R.ay - 8;
  back.part(); back.rect(wx - 4.8, wy - 4.8, 9.6, 9.6, TIMBER_D, -2, { n: [0, -0.2, 0.97] });
  back.toneLine(wx - 4.8, wy - 4.8, wx + 4, wy - 4.8, 1); back.toneLine(wx - 4.8, wy + 4, wx + 4, wy + 4, -1);
  back.part(); for (const dy of [-2, 1]) for (let i = -4; i < 4; i++) back.dot(wx + i + 0.5, wy + dy + 0.5, r4 === "ba" ? IRON_L : ROPE, -1.9, { cast: 0, bias: i > 1 ? -1 : 0 });
  // ---- FRONT: the ramp's near side and rail, the trestle under its high end, the lip on the field
  front.part(); front.poly([[R.ax, R.ay], [R.bx, R.by], [R.bx, R.by + 5], [R.ax, R.ay + 6]], mD, 5, { n: [0, 0.1, 0.99] });
  beam(front, R.ax, R.ay - 1, R.bx, R.by - 1, 5, m, 6, { seed: 6, bands: r4 === "ba" ? [0.2, 0.5, 0.8] : [0.5], bandM });
  const p2 = R.ax + (R.bx - R.ax) * 0.4;
  beam(front, R.ax + 1, -6, p2, rampY(R, p2) + 6, 3, mD, 5.4, { grain: false });
  for (const x of [R.ax + 1, p2]) beam(front, x, rampY(R, x) + 4, x, 6, 5, m, 6.2, { seed: 7 + x, bands: r4 === "ba" ? [0.5] : null, bandM });
  if (r4 !== "ba") lash(front, R.ax + 1, rampY(R, R.ax + 1) + 6, 7, 4, 6.4);
  front.part(); front.ellipse(R.bx - 2, R.by + 5, 7.2, 2.6, mat("#8a7a5a"), 6.6, { round: 0.6 });
  if (r4 === "bb") {                                                                         // a coil of fuse cord
    front.part(); for (let t = 0; t < 26; t++) { const a = (t / 26) * Math.PI * 2; front.dot(6 + Math.cos(a) * 4.6, 14 + Math.sin(a) * 2.4, mat("#6a5a3a"), 7, { bias: Math.sin(a) > 0 ? -1 : 0 }); }
    front.dot(11, 13, mat("#6a5a3a"), 7); front.dot(12, 12, mat("#6a5a3a"), 7);
  }
};

// The log, end-on: its near end at (cx, cy), the length of it running back up the ramp.
const logInto = (px, cx, cy, F, z) => {
  const { r4 } = F, iron = r4 === "ba", rr = logR(F), ry = rr * 0.85, dx = -6, dy = -20;
  const body = iron ? DRUM : BARK, face = iron ? DRUM_L : ENDWOOD;
  // the length: a round back, lit along its top
  px.part();
  for (let s = 20; s >= 1; s--) { const k = s / 20; px.ellipse(cx + dx * k, cy + dy * k, rr, ry, body, z - 0.2 + (1 - k) * 0.15, { round: 0.85, cast: 0 }); }
  for (const k of [-0.5, 0.05, 0.5]) px.toneLine(cx + k * rr + dx * 0.9, cy + dy * 0.9 - ry * (1 - Math.abs(k) * 0.5) + 2, cx + k * rr + dx * 0.3, cy + dy * 0.3 - ry * (1 - Math.abs(k) * 0.5) + 2, -1);
  if (iron) for (let t = 0; t <= 24; t++) { const a = Math.PI + (t / 24) * Math.PI; px.tone(cx + dx * 0.5 + Math.cos(a) * (rr - 0.6), cy + dy * 0.5 + Math.sin(a) * (ry - 0.6), -2); px.tone(cx + dx * 0.5 + Math.cos(a) * (rr - 0.6), cy + dy * 0.5 + Math.sin(a) * (ry - 0.6) + 1, -2); }   // a hoop round its middle
  // the near end
  px.part(); px.ellipse(cx, cy, rr, ry, body, z, { round: 0.5 });
  px.ellipse(cx, cy, rr - 2.6, ry - 2.2, face, z + 0.1, { round: 0.25, cast: 0 });
  if (iron) {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; px.dot(cx + Math.cos(a) * (rr - 5.2), cy + Math.sin(a) * (ry - 4.6), DRUM, z + 0.2, { fix: 0, cast: 0 }); }
    px.ellipse(cx, cy, 3.4, 3, DRUM, z + 0.2, { round: 0.9, cast: 0 }); px.dot(cx - 1, cy - 1, IRON_L, z + 0.3, { fix: 4, cast: 0 });
  } else {
    for (const k of [0.36, 0.66]) for (let t = 0; t < 36; t++) { const a = (t / 36) * Math.PI * 2; if (t % 9 === 4) continue; px.tone(cx + 0.6 + Math.cos(a) * (rr - 2.6) * k, cy + 0.4 + Math.sin(a) * (ry - 2.2) * k, -1); }
    px.dot(cx + 0.5, cy + 0.5, BARK, z + 0.2, { cast: 0 });
    px.toneLine(cx + 2, cy - 1, cx + rr - 4, cy - 3, -1);                                    // a check in the end grain
  }
  if (r4 === "bb") {
    // kegs lashed along its back
    for (const k of [-6.4, 6.4]) keg(px, cx + k + dx * 0.5, cy - ry + 3 + dy * 0.5, 10, 12, z + 0.4, false);
    px.part(); for (let i = -rr + 1; i < rr - 1; i++) px.dot(cx + i + dx * 0.5, cy - ry - 3 + dy * 0.5, ROPE, z + 0.5, { cast: 0 });
  }
};
export const log = (o, flip = false) => {
  const F = formOf(o), px = new Pix(52, 66, 28, 50);
  logInto(px, 0, 0, F, 0);
  return px.resolve({ flip });
};

// build(o) -> (back, front) => spec     o: { level, branch, rank4, seed, style, game }
// style "A" and "C" (the concept sheet's other treatments) draw as "B", the owner's pick.
export const build = (o = {}) => (back, front) => {
  const F = formOf(o), G = geo(F.level, F.br), { HW } = G, game = !!o.game;
  const fr = game ? front : back;                       // the sheet's one picture: the near parts go in by depth
  if (!game) groundInto(back, G, F);
  if (G.roller) rampInto(back, fr, G, F); else engineInto(back, fr, G, F, game);
  if (!game) {
    // the sheet's machine, loaded and waiting: the arm cocked with its stone, or the log behind its chock
    if (G.roller) {
      const [lx, ly, rr] = logAt(HW, F), R = RAMP(HW);
      logInto(back, lx, ly, F, 3);
      const cx = lx + rr + 3, cy = rampY(R, cx) - 4;
      back.part(); back.rect(cx - 3, cy - 6, 6, 7, TIMBER_D, 5.6, { n: [-0.3, -0.2, 0.9] });
    } else {
      const px = G.px, py = -G.fh + 2, a = G.cocked * D2R, ux = Math.sin(a), uy = -Math.cos(a), tx = px + ux * G.L, ty = py + uy * G.L;
      armInto(back, px, py, G.cocked, G, F, 4);
      const stone = (x, y) => { back.part(); back.ellipse(x, y, shotR(F, G), shotR(F, G) * 0.92, F.r4 === "aa" ? BLOCK : GRANITE, 4.8, { round: 0.95 }); };
      if (G.treb) {
        back.part(); back.line(tx, ty, tx, ty + 14, ROPE, 4.6, { cast: 0 }); back.ellipse(tx, ty + 14, 4.4, 3.2, LEATHER, 4.7, { round: 0.8 });
        stone(tx, ty + 10.4);
        weightInto(back, px - ux * G.butt, py - uy * G.butt, F, 9);
      } else stone(tx - uy, ty - 4.4);
      back.part(); back.line(-(HW - 6), WINCH_Y, px + ux * G.L * 0.4, py + uy * G.L * 0.4, ROPE, 3.6, { cast: 0 });
    }
  }
  // what moves: the standard at the front of the bed, the Comet Sling's fire under its cauldron
  const live = [], lights = [];
  if (F.level >= 2 || F.br) live.push({ kind: "pennant", x: HW - 2, y: -16, col: FLAG_OF[F.key], pole: G.treb ? 49 : 29, len: 12, h: 7, layer: "front" });
  if (F.r4 === "ab") { live.push({ kind: "flame", x: -(HW - 4), y: -12, w: 5, h: 7 }); lights.push({ key: "torch", x: -(HW - 4), y: -18, r: 22, col: "#ffa040", a: 0.8 }); }
  return {
    live, lights,
    // the engineer, for the pages that stand figures on a hall themselves (the game's hall file draws its own)
    crew: [{ fig: "engineer", x: -(HW + 2), y: 14, dir: 1, clip: G.roller ? "lever" : "winchIdle", variant: "engineer", crank: G.roller ? null : [-(HW - 6), WINCH_Y] }],
    shadow: { rx: Math.min(34, HW + 8), ry: 7, dx: 6, dy: 13 },
  };
};
