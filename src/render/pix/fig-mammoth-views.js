// ============ CONCEPT FIGURES: the Rime Jarl's war-mammoth FRONT and BACK ============
// The boss of fig-mammoth.js (approved-style look: umber coat rimed white along the hump, a dark hair
// skirt off the belly, pillar legs on broad pads, a domed skull, a swinging trunk, two iron-banded tusks,
// a teal saddle cloth with a white fur hem, a plank howdah with round shields on its rail, a teal banner;
// the Jarl in mail and a white bear mantle, horned helm, braids, the rimed Dane axe) walking toward the
// camera (FRONT) and away from it (BACK). One drawer, `make(s)`: s = +1 front, -1 back. The near side of
// the side view (the mammoth's right) is SCREEN LEFT in front and SCREEN RIGHT from behind; the Jarl's
// right hand holds the axe. FRONT: the great head, ears, the trunk hanging between two tusks, the Jarl
// above the rail with the axe held up beside him, the banner behind. BACK: the rump, the tail and its
// tuft, the hair skirt, the howdah's back wall with its shields, the Jarl's cape and the back of his helm
// (the axe is hidden by him: nothing stands up beside his head). The "song" cast stays side-on (not here).
// Walk = the side's own clip (same n, ms, pose); legs, bob and seat read the same solved beast.
// Forward is DOWN the screen in FRONT and UP in BACK (FWD 0.24 a px of stride). One sun, upper left.
import { mat, flat } from "./pix.js";
import { solveBeast, QUAD } from "./beast.js";
import { HUMAN } from "./rig.js";
import { CLIPS as SIDE } from "./fig-mammoth.js";

const HIDE = mat("#6e5442", { contrast: 1.1 }), SHAG = mat("#3e2e24", { contrast: 1.15 }), RIMEHAIR = mat("#e8eef0"), TUSK = mat("#ece2c6", { contrast: 1.2 });
const TOENAIL = mat("#d8ccb0"), PADM = mat("#4a382e"), BANDM = mat("#7e8692", { contrast: 1.3 }), BANDD = mat("#4e5560");
const HIDE_D = mat("#4a382b", { contrast: 1.1 }), HIDE_L = mat("#8c6c52", { contrast: 1.1 }), EARM = mat("#5e4636", { contrast: 1.25 }), TRUNKM = mat("#8a6e56", { contrast: 1.15 });
const EYEM = flat("#1e1620"), EYEG = flat("#e0f8ff", { emis: true, line: "#3a86b0" });
const CLOTH = mat("#2f5a58", { contrast: 1.15 }), FURH = mat("#ece8e0"), OAK = mat("#7a5334", { contrast: 1.1 }), OAKD = mat("#4a3426"), BRASS = mat("#c8a040", { contrast: 1.2 });
const SHB = mat("#d8d0bc"), CREAM = mat("#e8e2d0");
const SKIN = mat("#e4ae8a"), TEAL = mat("#2c4e5a"), LEATHER = mat("#4a3426");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#ece8e0"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#4e5560");
const STEEL = mat("#d8e4ec", { contrast: 1.3 }), SILVER = mat("#c8d0d8", { contrast: 1.3 }), WOOD = mat("#6a4a2e"), BLOND = mat("#ece2c4"), BONE = mat("#ece0c4");
const EYE = flat("#2a3a48"), RIME = flat("#f4fcff"), STONE = mat("#7cc8ec", { contrast: 1.3 });

const LEG = { M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, B: { m: SILVER, fix: 3 }, H: { m: BLOND, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: BLOND, fix: 2 }, b: { m: IRON_D, fix: 1 }, h: { m: BLOND, fix: 2, bias: -1 } };
// the Jarl's face: the horned helm's cap, silver brow band, the nasal bar down the middle, eyes, the beard in two plaits
const FRONT_H = [
  "...MMMMMMM...",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  "BBBBBBBBBBBBB",
  "HHSbbSDSbbSHH",
  "HHSEESDSEESHH",
  "HHSSSSDSSSSHH",
  "HHSSSNNNSSSHH",
  ".HRRSSSSSRRH.",
  "..RRRRRRRRR..",
  "...RRRRRRR...",
];
const BLINK_F = FRONT_H.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : r));
const BACK_H = [
  "...MMMMMMM...",
  "..MMMMMMMMM..",
  ".MMMMMmMMMMM.",
  "BBBBBBmBBBBBB",
  "HHMMMMmMMMMHH",
  "HHHMMMmMMMHHH",
  "HHHHHHmHHHHHH",
  "hHHHHHmHHHHHh",
  ".hHHHHmHHHHh.",
  "..hHHHHHHHh..",
  "...hhHHHhh...",
];

export const BOX = { w: 110, h: 168, ox: 55, oy: 154 };
const FWD = 0.24, TAU = Math.PI * 2;
const Q = { ...QUAD, spine: 54, height: 70, sh: [-2, 16], hip: [2, 15], foreU: 27, foreL: 25.5, hindU: 27, hindL: 25.5, paw: 3,
  neckAt: [2, -6], neck: 12, tailAt: [-2, 2], tail: [7, 7, 6], far: [3.4, -1.4], foreX: 0, hindX: -1 };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cap = (px, a, b, ra, rb, m, z, o) => px.capsule(a[0], a[1], ra, b[0], b[1], rb, m, z, o);

const make = (s) => (px, F) => {
  const b = solveBeast(F.sk.p, Q), b1 = solveBeast(F.lag1.p, Q), p = b.p, ph = F.ph;
  const by = cl(b.at(0, 0, 0)[1] + 70, -3, 4), wx = cl((b.W[0] - b1.W[0]) * 0.8, -2, 2);
  const nS = -s, fS = s;                                // near side (the side view's) on screen: left in FRONT, right in BACK
  const BID = px.body(1);
  const lf = (f) => cl(f[1], 0, 7), fw = (f) => cl(f[0], -14, 14) * FWD * s;

  // a pillar leg, one welded limb to a broad pad; FRONT the pad face-on with its toenails along the front rim, BACK the heel pad
  const leg = (x, top, f, near, z, M = HIDE) => {
    const l = lf(f), dy = fw(f), foot = [x * 0.96, -2.6 + dy - l * 0.9 + (near ? 0 : s > 0 ? -3.4 : -1)];
    const kn = [x * 1.04, (top[1] + foot[1]) / 2 + 1 + l * 0.2], bias = near ? 0 : -1;
    px.limb([top, kn, [foot[0], foot[1] - 2]], near && s > 0 ? [10.4, 9, 7.6] : [9.6, 8, 6.8], M, z, { bias, cast: 1, weld: near ? 5 : 0, weldRoot: near ? 11 : 0 });
    for (const [t0, t1, dx] of [[0.2, 0.7, -4.4], [0.3, 0.95, 0.2], [0.25, 0.85, 4]]) { const q0 = mix(top, kn, t0), q1 = mix(top, kn, t1); px.toneLine(q0[0] + dx, q0[1], q1[0] + dx, q1[1], -1, BID); }
    px.ellipse(foot[0], foot[1] + 0.2, 8.8, s > 0 ? 3.8 : 3.2, PADM, z + 0.04, { bias, floor: 1 });
    if (s > 0) for (const dx of [-5, -1.7, 1.7, 5]) px.ellipse(foot[0] + dx, foot[1] + 2.2 - (Math.abs(dx) > 3 ? 0.6 : 0), 1.3, 1, TOENAIL, z + 0.06, { fix: near ? 3 : 2 });
    else if (l > 1.5) px.ellipse(foot[0], foot[1] + 2.4, 6.4, 1.8 * cl(l / 3, 0.4, 1), PADM, z + 0.05, { bias: -1, floor: 1 });   // the sole comes up as the heel lifts
  };

  // far legs: FRONT the hinds, a little outside and up; BACK the fores
  if (s > 0) { leg(-20.6, [-20.6, -52 + by], p.fNH, false, 1, HIDE_D); leg(20.6, [20.6, -52 + by], p.fFH, false, 1, HIDE_D); }
  else { leg(-14.6, [-14.6, -52 + by], p.fNF, false, 1); leg(14.6, [14.6, -52 + by], p.fFF, false, 1); }

  // the barrel, the hump, the coat's tone strokes, the rime on its top
  px.part(); const bodyId = BID;
  px.ellipse(0, -64 + by, s > 0 ? 24 : 23, 26, s > 0 ? HIDE_D : HIDE, 4);
  const BM = s > 0 ? HIDE_D : HIDE; px.ellipse(-8, -56 + by, 14, 20, BM, 4.01, { weld: 4 }); px.ellipse(8, -56 + by, 14, 20, BM, 4.01, { weld: 4 });
  for (const dx of [-17, -9, -3, 5, 12, 18]) px.toneLine(dx, -78 + by, dx * 1.06, -50 + by + (dx & 3), -1, bodyId);
  for (const dx of [-12, 1, 9]) px.toneLine(dx, -84 + by, dx, -64 + by, 1, bodyId);
  px.part();
  for (const [x, d] of [[-14, -86], [-8, -90], [-2, -91], [5, -91], [11, -88], [16, -84], [-18, -80], [-5, -87], [8, -85], [19, -78], [-11, -84]]) { px.dot(x, d + by, RIMEHAIR, 4.4, { fix: 3 }); if (d & 1) px.dot(x + 1, d + by + 0.6, RIMEHAIR, 4.4, { fix: 2, noLine: true }); }

  // the skirt of long dark locks hanging off the belly, torn at the hem
  px.part();
  for (let i = 0; i < 10; i++) {
    const x = -19 + i * 4.2, len = 14 + ((i * 7) % 5) * 2.4 - (i === 0 || i === 9 ? 5 : 0), sw = wx * 0.7 + Math.sin(ph * TAU + i) * 0.6, top = -52 + by;
    px.poly([[x - 3, top], [x + 3, top], [x + 1 + sw, top + len], [x - 1.4 + sw * 0.5, top + len + 1]], SHAG, 4.3, { round: 0.6, floor: 1, bias: i % 2 ? -0.6 : 0 });
  }
  px.body(0);

  if (s > 0) {
    // FRONT: the head is drawn last, over the forelegs (frontHead below)
  } else {
    // ---- BACK: the tail with its dark tuft down the middle of the rump; the neck's hump and the dome's crown above the back
    const sw = Math.sin(ph * TAU - 0.6) * 1.6 + wx * 1.4;
    const t = [[0, -62 + by], [sw * 0.3, -50 + by], [sw * 0.7, -38 + by], [sw * 1.1 + 0.6, -27 + by]];
    px.part();
    cap(px, t[0], t[1], 2.4, 2, HIDE, 9, {}); cap(px, t[1], t[2], 2, 1.7, HIDE, 9, {});
    px.part();
    cap(px, t[2], t[3], 2.2, 3.4, SHAG, 9.02, { floor: 1 });
    px.part();
    px.poly([[t[3][0] - 3.2, t[3][1] - 1], [t[3][0] + 3.2, t[3][1] - 1], [t[3][0] + 2.6 + sw * 0.3, t[3][1] + 7], [t[3][0] + sw * 0.4, t[3][1] + 5], [t[3][0] - 2.6, t[3][1] + 7.4]], SHAG, 9.04, { floor: 1 });
    px.body(1); px.part();
    px.ellipse(0, -92 + by * 0.8, 13, 7, HIDE, 4.2, { cast: 1 });                    // the crown of the dome behind the howdah
    px.ellipse(-12.4, -86 + by * 0.8, 3.8, 6.4, HIDE, 4.25, { rot: 0.3, bias: -1, cast: 1 }); px.ellipse(12.4, -86 + by * 0.8, 3.8, 6.4, HIDE, 4.25, { rot: -0.3, bias: -1, cast: 1 });
    px.body(0);
  }

  // ---- the saddle cloth over the back (FRONT its fore edge across the top, BACK its tail edge hanging over the rump)
  px.part(); const clId = px._pid;
  if (s > 0) {
    px.poly([[-24, -83 + by], [24, -83 + by], [24.4, -73 + by], [20, -77.4 + by], [14, -72 + by], [8, -77 + by], [2, -72 + by], [-4, -77 + by], [-10, -72 + by], [-16, -77.4 + by], [-24.4, -73 + by]], FURH, 7.45, { round: 0.8 });
    px.poly([[-22, -90 + by], [22, -90 + by], [24, -82 + by], [-24, -82 + by]], CLOTH, 7.4, { round: 0.5 });
  } else {
    px.poly([[-24, -88 + by], [24, -88 + by], [25, -52 + by], [20, -57 + by], [14, -48 + by], [8, -56 + by], [2, -47 + by], [-4, -56 + by], [-10, -48 + by], [-16, -56 + by], [-22, -50 + by], [-25, -52 + by]], CLOTH, 7.4, { round: 0.5 });
    px.toneLine(-7, -86 + by, -7, -56 + by, -1, clId); px.toneLine(10, -86 + by, 10, -56 + by, -1, clId);
    px.poly([[-25, -62 + by], [25, -62 + by], [25.6, -54 + by], [20, -57.4 + by], [14, -51 + by], [8, -56.4 + by], [2, -50 + by], [-4, -56 + by], [-10, -50 + by], [-16, -56.4 + by], [-22, -52 + by], [-25.4, -54 + by]], FURH, 7.45, { round: 0.8 });
    for (const x of [-18, -8, 2, 12, 20]) { px.dot(x, -70 + by, CREAM, 7.5, { fix: 3 }); px.dot(x + 1, -69 + by, CREAM, 7.5, { fix: 2, noLine: true }); }
  }

  // ---- the banner pole and flag, at the howdah's back (right of him, in both views)
  const px0 = 12, top = -130 + by * 0.6, fl = cl(-wx * 1.6, -3, 3), flu = Math.sin(ph * TAU * 2) * 1.4;
  px.part();
  cap(px, [px0, -90 + by], [px0, top], 1, 0.8, OAKD, s > 0 ? 7.2 : 12.4, { floor: 1 });
  px.dot(px0, top - 1.4, BRASS, 12.5, { fix: 3 });
  px.part(); const fId = px._pid;
  const fz = s > 0 ? 7.25 : 12.45;
  px.poly([[px0, top + 1], [px0 + 10 + fl, top + 2 + flu * 0.6], [px0 + 20 + fl * 2, top + 1 - flu], [px0 + 25 + fl * 2.4, top + 4.6 + flu * 0.5], [px0 + 19 + fl * 2, top + 7.4 - flu * 0.6], [px0 + 10 + fl, top + 9 + flu * 0.4], [px0, top + 10]], CLOTH, fz, { round: 0.7 });
  px.toneLine(px0 + 2, top + 5, px0 + 22 + fl * 2, top + 4, -1, fId);
  px.poly([[px0 + 6 + fl * 0.5, top + 3.8], [px0 + 14 + fl, top + 4 - flu * 0.4], [px0 + 14 + fl, top + 5.4 - flu * 0.4], [px0 + 6 + fl * 0.5, top + 5.4]], CREAM, fz + 0.05, { fix: 3 });

  // ---- the Jarl, seated above the rail (the rail hides his hips)
  const hipY = -86 + by * 0.9, lean = (p.jLean ?? 0.1) * 0.4, sway = Math.sin(ph * TAU * 2) * 0.3;
  const C = [Math.sin(lean) * 16 + sway, hipY - Math.cos(lean) * 16], hx = Math.round(C[0]), hy = Math.round(C[1] - 7);
  const sR = [nS * 8.6, C[1] + 1.6], sL = [fS * 8.6, C[1] + 1.6];
  const hornAt = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2.8], [x0 + dir * 3.8, y0 - 1.2, 2.3], [x0 + dir * 6.8, y0 - 4.4, 1.7], [x0 + dir * 8, y0 - 8.4, 1], [x0 + dir * 7.4, y0 - 12, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };
  if (s < 0) {
    // the cape streaming down his back, the mantle over the shoulders
    const cs = cl(-wx * 1.4, -3, 3);
    px.part(); const cid = px._pid;
    px.poly([[C[0] - 9, C[1] - 1], [C[0] + 9, C[1] - 1], [C[0] + 10, hipY + 2], [C[0] + 7 + cs, hipY + 6], [C[0] - 2 + cs, hipY + 3.4], [C[0] - 8 + cs, hipY + 6], [C[0] - 10, hipY + 2]], TEAL, 9, { round: 0.7, cast: 1 });
    px.toneLine(C[0], C[1] + 2, C[0] + cs * 0.4, hipY + 3, -1, cid);
  } else {
    px.part(); const mid = px._pid;
    px.poly([[C[0] - 8.6, C[1] - 1.6], [C[0] + 8.6, C[1] - 1.6], [C[0] + 9.2, C[1] + 3.6], [C[0] + 7, hipY + 2], [C[0] - 7, hipY + 2], [C[0] - 9.2, C[1] + 3.6]], MAIL, 8.8, { round: 0.85, cast: 1 });
    px.toneLine(C[0] + 2, C[1] + 3, C[0] + 2, hipY, -1, mid);
    for (let yy = C[1] + 2; yy < hipY; yy += 2.8) for (let xx = -6; xx <= 6; xx += 3.2) px.dot(C[0] + xx + (((yy - C[1]) / 2.8 | 0) % 2 ? 1.6 : 0), yy, MAIL_D, 8.85, { noLine: true });
    px.poly([[C[0] - 7.4, hipY - 2.6], [C[0] + 7.4, hipY - 2.6], [C[0] + 7.5, hipY - 0.4], [C[0] - 7.4, hipY - 0.4]], LEATHER, 8.9, { round: 0.9 });
    px.rect(C[0] - 1.6, hipY - 2.5, 3.2, 2.2, SILVER, 8.95, { fix: 3 });
  }
  px.part(); px.ellipse(C[0], C[1] + 0.6, 12, 5, FURW, 9.1, { cast: 1 });
  for (const x of [-10, -7.4, -4.6, -1.6, 1.6, 4.6, 7.4, 10]) px.dot(C[0] + x, C[1] + 4.6 + Math.abs(x) * -0.1 + (x < 0 ? 0 : 0), FURW, 9.1);
  // the far horn, the head, the near horn
  px.part(); hornAt(hx - 5.6, hy - 5.6, -1, 8.7);
  px.part(); hornAt(hx + 5.6, hy - 5.6, 1, 10);
  px.part();
  px.stamp(s > 0 ? (p.blink ? BLINK_F : FRONT_H) : BACK_H, hx, hy, LEG, 9.8, { ax: 6, ay: 9, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  if (s > 0) for (const x of [-3.2, -0.2, 2.8]) px.dot(hx + x, hy - 4.6, STONE, 10.1, { fix: 3 });
  if (s > 0) {
    // the two plaits of the beard, tied in brass, and the arms
    const bs = cl(-wx * 1.2, -2, 2);
    for (const dx of [-2.2, 2.2]) { px.part(); cap(px, [hx + dx, hy + 2], [hx + dx + bs * 0.3, hy + 8], 1.7, 1.5, BLOND, 9.9); px.dot(hx + dx + bs * 0.4, hy + 9, BRASS, 9.95, { fix: 3 }); }
    // his right hand (screen left) holds the Dane axe upright beside him; the left rests on his belt
    const hd = [nS * 11.2, C[1] + 4.6 + sway], tip = [nS * 11.6, C[1] - 17 + sway * 2];
    px.part();
    px.limb([sR, [nS * 11.8, C[1] + 5.4], hd], [2.7, 2.4, 2.1], MAIL, 10.3, { cast: 1 });
    px.part();
    cap(px, [hd[0], hd[1] + 7], tip, 1, 1, WOOD, 10.5, { edge: true });
    const k = 1.4, ax = tip[0], ay = tip[1];
    px.part();
    px.poly([[ax, ay + 0.6], [ax + nS * 1.4, ay - 0.6], [ax + nS * 7.6 * k * 0.8, ay - 4.6 * k], [ax + nS * 8.4 * k * 0.8, ay + 1], [ax + nS * 7 * k * 0.8, ay + 5.6 * k], [ax + nS * 1.4, ay + 4]], STEEL, 10.52, { fix: 2 });
    px.poly([[ax, ay - 1.6], [ax + nS * 3, ay - 3], [ax + nS * 3, ay - 0.4], [ax, ay + 0.6]], IRON_D, 10.54, { fix: 1 });
    for (const [dx, dy] of [[5, -2.8], [7, 0.6], [6, 3.6], [3.2, -1]]) px.dot(ax + nS * dx, ay + dy, RIME, 10.56, { noLine: true });
    px.dot(ax + nS * 0.6, ay + 6, STONE, 10.57, { fix: 3 });
    px.part(); px.ellipse(hd[0], hd[1], 2.2, 2.2, SKIN, 10.7);
    px.toneLine(hd[0] - 1.6, hd[1] - 0.6, hd[0] + 1.6, hd[1] - 0.6, -1, px._pid);
    px.part();
    px.limb([sL, [fS * 11, C[1] + 6.4], [fS * 6, hipY - 3]], [2.7, 2.4, 2.1], MAIL, 10.2, { cast: 1 });
    px.part(); px.ellipse(fS * 6, hipY - 3, 2, 2, SKIN, 10.7);
  } else {
    // from behind: the left hand at his hip; the right (screen right) holds the Dane axe upright at his side as
    // in FRONT, drawn at its true depth (behind his arm and mantle): the haft above his shoulder and the head up beside
    // his helm's horn show, the fist closed round the haft
    // BACK stack (camera behind him: what he carries sits lowest, both arms one z just under the cape and mantle, fists over the weapon)
    px.part(); px.limb([[fS * 9, C[1] + 1.6], [fS * 11.6, C[1] + 6.4], [fS * 11.2, hipY - 2]], [2.7, 2.4, 2.1], MAIL, 8.6, { cast: 0 });
    px.part(); px.ellipse(fS * 11.2, hipY - 2, 1.6, 1.5, SKIN, 8.4);
    const hd = [nS * 16, C[1] + 4.6 + sway], tip = [nS * 16.8, C[1] - 17 + sway * 2];   // outside the banner pole
    px.part(); cap(px, [hd[0], hd[1] + 7], tip, 1, 1, WOOD, 8.2, { edge: false });
    const k = 1.4, ax = tip[0], ay = tip[1];
    px.part();
    px.poly([[ax, ay + 0.6], [ax + nS * 1.4, ay - 0.6], [ax + nS * 7.6 * k * 0.8, ay - 4.6 * k], [ax + nS * 8.4 * k * 0.8, ay + 1], [ax + nS * 7 * k * 0.8, ay + 5.6 * k], [ax + nS * 1.4, ay + 4]], STEEL, 8.22, { fix: 2 });
    px.poly([[ax, ay - 1.6], [ax + nS * 3, ay - 3], [ax + nS * 3, ay - 0.4], [ax, ay + 0.6]], IRON_D, 8.24, { fix: 1 });
    for (const [dx, dy] of [[5, -2.8], [6, 3.6]]) px.dot(ax + nS * dx, ay + dy, RIME, 8.26, { noLine: true });
    px.part(); px.limb([[nS * 9, C[1] + 1.6], [nS * 14, C[1] + 6.4], [hd[0] - nS * 0.3, hd[1]]], [2.7, 2.4, 2.1], MAIL, 8.6, { cast: 0 });
    px.part(); px.ellipse(hd[0], hd[1], 1.8, 1.7, SKIN, 8.4);
    // the braids hang down his back from under the helm
    const bs = cl(-wx * 1.4, -2.4, 2.4);
    for (const dx of [-2, 2]) { px.part(); cap(px, [hx + dx, hy + 5], [hx + dx + bs * 0.3, hy + 12], 1.7, 1.5, BLOND, 9.9); px.dot(hx + dx + bs * 0.4, hy + 13, BRASS, 9.95, { fix: 3 }); }
  }

  // ---- the howdah's rail and the round shields hung along it, in front of his hips (BACK: the back wall)
  px.part(); const rId = px._pid;
  const ry0 = -90 + by * 0.9, ry1 = -78 + by * 0.9;
  px.poly([[-25, ry0], [25, ry0], [25, ry1], [-25, ry1]], OAK, 11, { round: 0.35 });
  px.toneLine(-25, ry0 + 4, 25, ry0 + 4, -1, rId); px.toneLine(-25, ry1 - 1, 25, ry1 - 1, -1, rId);
  if (s < 0) for (const x of [-12, 0, 12]) px.toneLine(x, ry0, x, ry1, -1, rId);
  px.part();
  for (const x of [-25, 25]) cap(px, [x, ry0 - 1], [x, ry1 + 1], 1.8, 1.8, OAKD, 11.1, { floor: 1 });
  [-15, 0, 15].forEach((x, i) => {
    const c = [x, ry1 - 1 + (s < 0 ? 2 : 0)];
    px.part();
    px.ellipse(c[0], c[1], 5.4, 5.4, i % 2 ? SHB : CLOTH, 11.3, { cast: 1 });
    px.poly([[c[0] - 5.4, c[1] - 5.4], [c[0], c[1] - 5.4], [c[0], c[1]], [c[0] - 5.4, c[1]]], i % 2 ? CLOTH : SHB, 11.4, { round: 0, n: [-0.2, -0.2, 0.9], cast: 0 });
    px.poly([[c[0], c[1]], [c[0] + 5.4, c[1]], [c[0] + 5.4, c[1] + 5.4], [c[0], c[1] + 5.4]], i % 2 ? CLOTH : SHB, 11.4, { round: 0, n: [-0.2, -0.2, 0.9], cast: 0 });
    px.ellipse(c[0], c[1], 1.4, 1.4, BANDM, 11.5, { fix: 3 });
  });

  // ---- the near legs last, in front: FRONT the forelegs; BACK the hinds
  px.body(1);
  if (s > 0) { leg(nS * 14.4, [nS * 14.4, -52 + by], p.fNF, true, 12); leg(fS * 14.4, [fS * 14.4, -52 + by], p.fFF, true, 12.2); }
  else { leg(nS * 13.4, [nS * 13.4, -50 + by], p.fNH, true, 12); leg(fS * 13.4, [fS * 13.4, -50 + by], p.fFH, true, 12.2); }
  px.body(0);
  if (s > 0) frontHead(px, p, by, ph, wx, nS);
  return {};
};

// FRONT: the great head walking at us, over the forelegs' tops. Ears a tone darker either side, a lit domed
// forehead, the brow ridge over two small deep-set eyes, shag hanging off the cheeks and the chest, the trunk
// down the middle (creased, lit on its left), the two long tusks curving down, out and up from beside its root.
const frontHead = (px, p, by, ph, wx, nS) => {
  const hy = -64 + by * 0.8, ear = p.ear ?? 0, tpoc = p.tusk ?? 0;
  px.body(0);
  // the chest hair between the forelegs, behind the trunk
  px.part();
  for (let i = 0; i < 6; i++) {
    const x = -8.5 + i * 3.4, top = hy + 12, len = 16 + ((i * 5) % 3) * 3, sw = Math.sin(ph * TAU + i * 0.9) * 0.7 + wx * 0.5;
    px.poly([[x - 2.2, top], [x + 2.2, top], [x + 1 + sw, top + len], [x - 0.6 + sw * 0.6, top + len + 1.4]], SHAG, 12.6, { round: 0.5, floor: 1, bias: i % 2 ? -0.5 : 0 });
  }
  // the ears: broad flaps, a tone darker, the near one flicking
  for (const sd of [-1, 1]) {
    const e = sd === nS ? ear : 0;
    px.part();
    px.ellipse(sd * (20.6 + e * 1.6), hy + 1 - e, 9.4 + e, 12 + e * 1.2, EARM, 13, { rot: -sd * (0.18 + e * 0.25), cast: 1 });
    px.toneLine(sd * 13, hy - 9, sd * 24, hy - 6, 1, px._pid);
    px.toneLine(sd * 15.6, hy - 4, sd * 17.4, hy + 8, -1, px._pid); px.toneLine(sd * 22, hy - 2, sd * 23.4, hy + 7, -1, px._pid);
    for (let k = 0; k < 4; k++) { const x = sd * (14.5 + k * 2.6 + e), y = hy + 10.6 + Math.abs(k - 1.5) * -1.4; px.poly([[x - 1.4, y], [x + 1.4, y], [x + sd * 0.6, y + 5 + (k & 1) * 2]], EARM, 13.03, { floor: 1, bias: -0.6 }); }
  }
  // the skull: a domed forehead (lit upper left), the cheeks, the face narrowing to the trunk's root
  px.part(); const hid = px._pid;
  px.ellipse(0, hy - 3, 15, 15.6, HIDE, 13.5, { cast: 2 });
  for (const sd of [-1, 1]) px.ellipse(sd * 8.6, hy + 6, 6.6, 8, HIDE, 13.505, { weld: 3 });
  px.ellipse(0, hy + 9, 9, 8, HIDE, 13.51, { weld: 3 });
  px.ellipse(-3.4, hy - 9, 8.6, 6.4, HIDE_L, 13.52, { weld: 4, bias: 0.6 });
  for (const [dx, dy] of [[-9, -14], [-4, -17.4], [1, -18], [6, -16.4], [10, -12.6], [-1, -15]]) px.dot(dx, hy + dy, RIMEHAIR, 13.55, { fix: 3 });
  for (const dx of [-3.4, 3.4]) px.toneLine(dx, hy - 12, dx * 1.3, hy - 3, -1, hid);
  // the brow ridge (lit on top, a dark shelf under it) and the deep-set eyes
  for (const sd of [-1, 1]) {
    px.toneLine(sd * 3, hy - 1.4, sd * 11.6, hy - 0.4, 1, hid);
    px.line(sd * 3.4, hy + 0.4, sd * 11.4, hy + 1.2, SHAG, 13.6, { floor: 1, noLine: true });
    px.rect(sd * 7.6 - 1, hy + 2, 2, 1, p.blink ? SHAG : EYEG, 13.65, { fix: 3, noLine: true });
    px.rect(sd * 7.6 - 1, hy + 3, 2, 1, EYEM, 13.65, { noLine: true });
  }
  px.toneLine(-6.2, hy + 6, -2.4, hy + 11, -1, hid); px.toneLine(6.2, hy + 6, 2.4, hy + 11, -1, hid);
  // the cheek shag: dark locks hanging off the jowls over the forelegs' tops
  for (const sd of [-1, 1]) {
    px.part();
    for (let k = 0; k < 3; k++) {
      const x = sd * (10 + k * 2.4), top = hy + 9 + k, len = 11 + k * 2 + ((k + (sd > 0 ? 1 : 0)) & 1) * 2, sw = Math.sin(ph * TAU + k + sd) * 0.6 + wx * 0.6;
      px.poly([[x - 1.8, top], [x + 1.8, top], [x + sd * 0.8 + sw, top + len], [x - sd * 0.4 + sw * 0.5, top + len + 1]], SHAG, 13.4, { round: 0.5, floor: 1, bias: k === 1 ? -0.5 : 0 });
    }
  }
  // the trunk: welded into the face, hanging down the middle, creased, lit on its sunlit (left) side, swaying
  const root = [0, hy + 12], sw = Math.sin(ph * TAU) * 1.6 + wx;
  const tr = [root, [sw * 0.25, root[1] + 7], [sw * 0.55, root[1] + 15], [sw * 0.9, root[1] + 23], [sw * 1.2 + 0.6, root[1] + 30], [sw * 1.4 + 2.2, root[1] + 35], [sw * 1.5 + 4.6, root[1] + 37]];
  px.part(); const tid = px._pid;
  px.limb(tr, [5.4, 5, 4.4, 3.8, 3.2, 2.6, 1.8], TRUNKM, 14, { weld: 4, cast: 2 });
  for (let i = 1; i < tr.length - 2; i++) {
    px.toneLine(tr[i][0] - 2.2, tr[i][1] + 1, tr[i][0] - 2, tr[i][1] + 5, 1, tid);                       // the sunlit side
    px.toneLine(tr[i][0] - 3.6 + i * 0.3, tr[i][1], tr[i][0] + 3.6 - i * 0.3, tr[i][1] + 0.8, -1, tid);
    px.toneLine(tr[i][0] + 1.4, tr[i][1] + 1, tr[i][0] + 2.2, tr[i][1] + 5, -1, tid);    // the creases
  }
  px.dot(tr[6][0], tr[6][1] + 0.4, SHAG, 14.1, { floor: 1, noLine: true });
  // the tusks: from beside the trunk's root, down, out, and up at the tips; big and bright, iron-banded
  for (const sd of [-1, 1]) {
    const o = [sd * 5.6, hy + 10];
    const pts = [o, [sd * 7.6, hy + 17], [sd * 11, hy + 23.4], [sd * 16, hy + 27.4], [sd * 21.4, hy + 27], [sd * 25.4 + sd * tpoc, hy + 22.6 - tpoc * 2], [sd * 27.4 + sd * tpoc, hy + 15.6 - tpoc * 3]];
    const w = [3.6, 3.6, 3.3, 2.9, 2.3, 1.6, 0.8];
    px.part();
    for (let i = 0; i + 1 < pts.length; i++) cap(px, pts[i], pts[i + 1], w[i], w[i + 1], TUSK, 13.8 + i * 0.05, { bias: sd === -1 ? 0.3 : -0.2, cast: 1 });
    for (const i of [1, 3]) {
      const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, r = w[i] + 0.4;
      px.part();
      px.line(a[0] + nx * r, a[1] + ny * r, a[0] - nx * r, a[1] - ny * r, BANDM, 14.2, { fix: 3 });
    }
  }
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "mammoth-front", BOX, BONES: HUMAN, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "mammoth-back", BOX, BONES: HUMAN, draw: make(-1), CLIPS: { walk } };
