// ============ FIGURE VIEWS: the Crypt Warden from the FRONT and from BEHIND ============
// fig-crypt.js walking toward the camera (FRONT, s = +1) and away from it (BACK, s = -1); one drawer.
// His RIGHT hand carries the flanged mace on the shoulder: SCREEN LEFT in front, screen RIGHT from
// behind (`rs`); his LEFT arm carries the sarcophagus lid before him (screen side `ls`): seen face-on
// beside the body in front, its rough back peeking past him from behind. Joint-kit build (bone limbs
// as welded tubes, steel wrapped over them). Same height and build as the side; heavy plod: a slow bob
// and a lurch over the planted foot. Unflipped; one sun upper left. Clips stay the side walk's own.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-crypt.js";

const BONE = mat("#e0d8c4"), STEEL = mat("#5e665e", { contrast: 1.15 }), STEEL_D = mat("#464e4a", { contrast: 1.1 }), ROT = mat("#4a3a5e", { contrast: 0.9 });
const BRONZE = mat("#a08a44", { contrast: 1.15 }), VERD = mat("#5a9a80", { contrast: 1.0 }), WEED = mat("#4e6a48"), STONE = mat("#a39a86", { contrast: 1.05 }), MOSS = mat("#5c7a40"), HAFT = mat("#4a3c2c"), IRON = mat("#6c7280", { contrast: 1.25 });
const SOCK = flat("#15121a"), HOLE = flat("#1a1620");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" });

// FRONT skull in its open bascinet: C steel cap, B bronze brim, S bone (s a tone down), e socket, E the witch-fire,
// N nasal hole, T teeth, j jaw. 13 wide, centre column 6.
const FRONT_H = [
  "...CCCCCCC...",
  "..CCCCCCCCC..",
  ".CCCCCCCCCCC.",
  ".BBBBBBBBBBB.",
  ".sSSSSSSSSSs.",
  ".sSeeSSSeeSs.",
  ".sSeEsSsEeSs.",
  "..sSSSNSSSs..",
  "..sSSSSSSSs..",
  "..sSTTTTTSs..",
  "...jTjTjTj...",
  "....jjjjj....",
];
// BACK: the bascinet's back plate, a seam and rivets, the bronze band, the bone neck below
const BACK_H = [
  "...CCCCCCC...",
  "..CCCCCCCCC..",
  ".CCCCCcCCCCC.",
  ".CCCCCcCCCCC.",
  ".BBBBBBBBBBB.",
  ".CCCCCcCCCCC.",
  ".CcCCCcCCCcC.",
  "..CCCCcCCCC..",
  "...sCCcCCs...",
  "....sSjSs....",
  ".....SjS.....",
  ".....sjs.....",
];
for (const g of [FRONT_H, BACK_H]) g.forEach((r) => { if (r.length !== 13) throw new Error("crypt-views: grid row width " + r.length); });
const legend = (eye) => ({ C: { m: STEEL }, c: { m: STEEL_D }, B: { m: BRONZE, fix: 2 }, S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: SOCK }, e: { m: SOCK }, E: { m: eye } });
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT);

const FWD = 0.4, TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// BACK depth stack (views-artist.md, "The BACK stack"): in BACK higher z lies further BEHIND him. The torso-layer numbers
// the FRONT uses are remapped: held things / the lid 1.0, legs 2-3, torso 4.0, back gear (pauldrons, weed) 5.0+, head 6.0.
const ZI = { capsule: 7, limb: 3, ellipse: 5, poly: 2, line: 5, dot: 3, rect: 5, stamp: 4 };
const bz = (z) => (z <= 1.9 ? 1.0 : z < 5 ? z : z < 5.9 ? 4 + (z - 5) * 0.1 : z < 7 ? 5 + (z - 5.9) * 0.5 : 5.2);
const backOf = (p) => new Proxy(p, { get: (t, k) => (k in ZI ? (...a) => { a[ZI[k]] = bz(a[ZI[k]]); return t[k](...a); } : typeof t[k] === "function" ? t[k].bind(t) : t[k]) });

const make = (s) => (px0, F, o = {}) => {
  const px = s > 0 ? px0 : backOf(px0);
  const rs = -s, ls = s;
  const { sk, ph, lag1, lag2 } = F, p = sk.p;
  const a = Math.cos(ph * TAU), lurch = rs * 0.9 * Math.sin(ph * TAU);          // sways over the planted foot (near foot planted 0..0.5)
  const hipY = sk.P[1], chestY = sk.C[1], L = hipY - chestY;
  const hx = Math.round(lurch * 0.6), cx = lurch * 0.8;
  const vx = cl((Math.sin(ph * TAU) - Math.sin((ph - 0.09) * TAU)) * 1.2, -2, 2);
  const y = (t) => chestY + L * t;
  const hy = Math.round(sk.N[1]);
  const handY = chestY + 12 + s * (p.aN ? p.aN[0] - 0.9 : 0) * 8;               // the fists ride a little higher / lower with the stride

  // ---- the lid on the far (left) arm. FRONT: its carved face before him; BACK: its rough back, mostly hid behind him
  {
    const c = [ls * (s > 0 ? 11 : 10.6) + cx, handY + (s > 0 ? 3 : 0)], lw = 5.2, lh = s > 0 ? 9.6 : 11.4, z = s > 0 ? 7.6 : 1.6;
    px.part(); const sid = px._pid;
    px.poly([[c[0] - lw, c[1] - lh + 1.6], [c[0] - lw + 1.6, c[1] - lh], [c[0] + lw - 1.6, c[1] - lh], [c[0] + lw, c[1] - lh + 1.6], [c[0] + lw, c[1] + lh - 1.2], [c[0] + lw - 1.4, c[1] + lh], [c[0] - lw + 1.4, c[1] + lh], [c[0] - lw, c[1] + lh - 1.2]], STONE, z, { round: 0.5, floor: 1, edge: s > 0 });
    px.toneLine(c[0] - lw + 1, c[1] - lh + 2, c[0] - lw + 1, c[1] + lh - 2, -1, sid);
    px.part();
    if (s > 0) {
      px.line(c[0], c[1] - 6, c[0], c[1] + 5, STEEL_D, z + 0.1, { fix: 0 }); px.line(c[0] - 2.4, c[1] - 2.8, c[0] + 2.4, c[1] - 2.8, STEEL_D, z + 0.1, { fix: 0 });
      for (const [dx, dy] of [[-3, 7], [-2, 8], [-1, 7], [2, -8], [3, -9]]) px.dot(c[0] + dx, c[1] + dy, MOSS, z + 0.15, { fix: 1 });
      px.dot(c[0] + 2.8, c[1] + 4.6, STEEL_D, z + 0.15, { fix: 0 });
    } else {
      px.line(c[0] - 2, c[1] - 7, c[0] + 1, c[1] - 1, STEEL_D, z + 0.1, { fix: 0 }); px.line(c[0] + 1, c[1] - 1, c[0] - 1, c[1] + 6, STEEL_D, z + 0.1, { fix: 0 });   // a chisel crack
      for (const [dx, dy] of [[-3, -8], [-2, -7], [3, 6], [2, 7], [3, 8]]) px.dot(c[0] + dx, c[1] + dy, MOSS, z + 0.15, { fix: 1 });
    }
  }
  // far arm: bone, vambrace, gauntlet at the lid's edge. FRONT it is hidden mostly behind the lid; BACK it hangs at his side (z 4.3, fist 3.6)
  if (s > 0) {
    const sh = [hx + ls * 7.2, chestY + 1.4], hd = [ls * 8.4 + cx, handY], el = [ls * 9.4 + cx * 0.6, (sh[1] + hd[1]) / 2 + 0.6];
    px.body(1);
    px.limb([sh, el, hd], [1.7, 1.8, 1.6], BONE, 6.9, { bias: -1 });
    px.capsule(el[0], el[1], 1.9, hd[0], hd[1], 1.6, STEEL_D, 6.95, { bias: -1, wrap: true });
    px.ellipse(hd[0], hd[1], 1.7, 1.6, STEEL_D, 7.0, { bias: -1, weld: 1.5 });
    px.body(0);
  } else {
    const sh = [hx + ls * 7.6, chestY + 1.4], el = [hx + ls * 8.8, chestY + 7.4], hd = [hx + ls * 8.8, chestY + 12.4 + ls * Math.cos(ph * TAU) * 1.0];
    px0.body(1);
    px0.limb([sh, el, [hd[0], hd[1] - 1]], [1.8, 1.9, 1.8], BONE, 4.3, { cast: 0 });
    px0.capsule(el[0], el[1], 2.0, hd[0], hd[1] - 1.2, 1.8, STEEL_D, 4.35, { cast: 0, wrap: true });
    px0.body(0);
    px0.part(); px0.ellipse(hd[0], hd[1], 1.6, 1.5, STEEL_D, 3.6);
  }

  // ---- legs: bone, a steel greave over the shin, a bronze-capped knee, a sabaton. Forward is down the screen in FRONT
  const feet = [[p.fF || [2.8, 0], ls, s > 0 ? 3 : 2, STEEL_D, s > 0 ? -1 : 0], [p.fN || [-2.6, 0], rs, s > 0 ? 4 : 3, STEEL, 0]];
  for (const [f, side, z, st, b] of feet) {
    const lf = f[1], ax = hx + side * 3.4 + cx * 0.2, ay = -2.8 + s * f[0] * FWD - lf * 0.9;
    const hp = [hx + side * 2.9, hipY + 1], kn = [(hp[0] + ax) / 2 + side * 1.2, (hp[1] + ay) / 2 - lf * 0.4];
    px.body(1);
    px.limb([hp, kn, [ax, ay]], [1.9, 2.3, 2.0], BONE, z + lf * 0.04, { bias: b });
    px.capsule(kn[0], kn[1], 2.4, ax, ay, 2.0, st, z + 0.01 + lf * 0.04, { bias: b, wrap: true });
    px.ellipse(kn[0], kn[1], 2.7, 2.5, st, z + 0.02 + lf * 0.04, { bias: b, weld: 2 });
    px.body(0);
    px.dot(kn[0] + (s > 0 ? 0 : 0), kn[1] - 0.2, BRONZE, z + 0.07, { fix: 2 });
    px.part();
    if (s > 0) px.ellipse(ax + side * 0.4, ay + 1.9, 2.5, 1.7, st, z + 0.4 + lf * 0.04, { bias: b, floor: 1 });          // the sabaton, toe toward us
    else {
      px.ellipse(ax, ay + 1.5, 2.1, 1.5, st, z + 0.4, { bias: b, floor: 1 });
      if (lf > 0.8) px.ellipse(ax, ay + 3.4, 1.9, 1.9 * cl(lf / 2.4, 0.3, 1), STEEL_D, z + 0.45, { bias: -2 });          // the sole shows as the heel comes up
    }
  }

  // ---- the skirt of lames and the rotten tabard strip, its hem a beat behind
  px.part();
  px.poly([[hx - 6.4, hipY - 2.2], [hx + 6.4, hipY - 2.2], [hx + 7, hipY + 4.2], [hx + 3.6, hipY + 4.6], [hx + 1.8, hipY + 3.4], [hx, hipY + 4.8], [hx - 1.8, hipY + 3.4], [hx - 3.6, hipY + 4.6], [hx - 7, hipY + 4.2]], STEEL_D, 5, { round: 0.75, floor: 1, cast: 1 });
  for (const yy of [hipY - 0.2, hipY + 1.8]) px.line(hx - 6.2, yy, hx + 6.2, yy + 0.1, STEEL, 5.1, { fix: 0 });
  if (s > 0) for (const x of [-3.2, 0, 3.2]) px.dot(hx + x, hipY - 1.2, BRONZE, 5.15, { fix: 2 });
  px.part();
  const sw = -vx * 1.2;
  px.poly([[hx - 1.6, hipY + 2], [hx + 1.6, hipY + 2], [hx + 2.2 + sw, hipY + 9.4], [hx + 0.8 + sw * 1.4, hipY + 8], [hx - 0.4 + sw, hipY + 10.4], [hx - 1.6 + sw, hipY + 8.4]], ROT, s > 0 ? 5.2 : 5.3, { round: 0.8, floor: 1 });

  // ---- the spine and the breastplate. FRONT: stove in over the heart, ribs and teal fire behind the hole
  px.body(1);
  px.capsule(hx, y(0.04), 1.1, hx, hipY - 1, 1.1, BONE, 3.9, { bias: -1 });
  px.body(0);
  px.part(); const bid = px._pid;
  const rw = 6.6;
  px.poly([[hx - rw + 0.2, y(-0.04)], [hx + rw - 0.4, y(-0.04)], [hx + rw + 0.6, y(0.3)], [hx + rw - 0.8, y(0.62)], [hx + 5.6, y(0.86)], [hx - 5.6, y(0.86)], [hx - rw + 0.8, y(0.62)], [hx - rw - 0.6, y(0.3)]], STEEL, 5.5, { round: 0.65, floor: 1, edge: true, cast: 1 });
  if (s > 0) {
    px.line(hx - rw + 1.4, y(0.1), hx - rw + 1.4, y(0.74), STEEL, 5.52, { fix: 4 });
    const hh = [hx + 0.8, y(0.4) + 0.4];
    px.part();
    px.ellipse(hh[0], hh[1], 2.8, 3.2, HOLE, 5.6, { noLine: true });
    px.line(hh[0] - 2.2, hh[1] - 1.4, hh[0] + 2.2, hh[1] - 1.2, BONE, 5.65, { fix: 1 }); px.line(hh[0] - 2.2, hh[1] + 0.4, hh[0] + 2.2, hh[1] + 0.6, BONE, 5.65, { fix: 1 });
    px.dot(hh[0] + 0.4, hh[1] + 1.8, F_TEAL, 5.7, { noLine: true }); px.dot(hh[0] - 0.6, hh[1] - 0.4, F_TEAL, 5.7, { noLine: true }); px.dot(hh[0] + 0.4, hh[1] + 0.6, F_PALE, 5.72, { noLine: true });
    px.part();
    for (const [dx, t] of [[-3.6, 0.16], [4.2, 0.66], [-4.4, 0.62], [3.4, 0.22]]) px.dot(hx + dx, y(t), VERD, 5.8, { fix: 1 });
    for (const [dx, t] of [[-4.6, 0.1], [4.4, 0.12], [-4.2, 0.78], [4.2, 0.78]]) px.dot(hx + dx, y(t), BRONZE, 5.8, { fix: 2 });
  } else {
    // the back: a plain plate, a ridged spine, a bronze strap and its buckle, verdigris at the seams
    px.line(hx, y(0.02), hx, y(0.84), STEEL_D, 5.55, { fix: 0 });
    px.line(hx - rw + 0.6, y(0.2), hx + rw - 0.6, y(0.46), BRONZE, 5.6, { fix: 2 });
    px.dot(hx + 1.2, y(0.33), BRONZE, 5.65, { fix: 3 });
    px.part();
    for (const [dx, t] of [[-4, 0.14], [3.6, 0.6], [-3.4, 0.7], [4.2, 0.2]]) px.dot(hx + dx, y(t), VERD, 5.8, { fix: 1 });
    for (const t of [0.1, 0.5, 0.8]) { px.dot(hx - 2.4, y(t), BRONZE, 5.8, { fix: 2 }); px.dot(hx + 2.4, y(t), BRONZE, 5.8, { fix: 2 }); }
  }
  px.part();
  px.line(hx - rw + 0.4, y(0.02), hx + rw - 0.4, y(0.02), STEEL_D, 5.85, { fix: 0 });
  // drowned weed hung from the shoulders, trailing a beat behind
  px.part();
  for (const side of [-1, 1]) px.poly([[hx + side * 3, y(0.0)], [hx + side * (rw + 1.4), y(0.02)], [hx + side * (rw + 2), y(0.34 + (side > 0 ? 0.1 : 0)) - vx * 1.4 * side], [hx + side * (rw - 0.6), y(0.24) - vx * 0.8 * side], [hx + side * 3.6, y(0.14)]], WEED, 6.1, { round: 0.7, floor: 1 });

  // ---- the shoulders: pauldrons over the arm roots (his right, mace side, larger and nearer in front)
  for (const [side, big, z] of [[ls, 3.8, 5.9], [rs, 4.4, 8.5]]) {
    px.part();
    const sx2 = hx + side * 7.4, sy2 = chestY - 0.1;
    px.ellipse(sx2, sy2, big, 3.2, side === rs ? STEEL : STEEL_D, z, { floor: 1, cast: 1 });
    px.line(sx2 - big + 0.8, sy2 + 0.6, sx2 + big - 0.8, sy2 + 0.8, STEEL, z + 0.05, { fix: 0 });
    if (side === rs) px.dot(sx2 - 0.6, sy2 - 1.6, STEEL, z + 0.1, { fix: 4 });
  }

  // ---- the head: the bascinet and the skull in it
  px.part();
  px0.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy - 1, p.eye > 0.5 ? LEG_HOT : LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5.2, 6.5, 5.8], cast: 1 });

  // ---- the mace: out of his right fist. FRONT up over the shoulder; BACK z 1.0, the haft past the fist and the head past the hip
  {
    const hd = [rs * 8.4 + cx, handY], sh = [hx + rs * 7.4, chestY];
    const el = [rs * 10 + cx * 0.6, (sh[1] + hd[1]) / 2 + 0.6];
    const Z = s > 0 ? 8.8 : 1.0, top = s > 0 ? [rs * 12.2 + cx, chestY - 12] : [rs * 11.4 + cx, handY + 10], bot = s > 0 ? [rs * 7.8 + cx, handY + 4] : [rs * 8.6 + cx, handY - 2];
    const hc = s > 0 ? [top[0] + rs * 0.6, top[1] - 2.6] : [top[0] + rs * 0.8, top[1] + 2.6];
    px0.part();
    px0.capsule(bot[0], bot[1], 0.9, top[0], top[1], 0.9, HAFT, Z);
    px0.ellipse(bot[0], bot[1], 1.2, 1.2, BRONZE, Z + 0.02, { fix: 2 });
    px0.part();
    px0.ellipse(hc[0], hc[1], 2.7, 2.7, IRON, Z + 0.1);
    for (const an of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) px0.line(hc[0] + Math.cos(an) * 2.2, hc[1] + Math.sin(an) * 2.2, hc[0] + Math.cos(an) * 4.4, hc[1] + Math.sin(an) * 4.4, IRON, Z + 0.15, { fix: an === 0 ? 4 : 2 });
    px0.dot(hc[0] - 0.6, hc[1] - 0.6, STEEL, Z + 0.2, { fix: 4 });
    px0.body(1); px0.tag("nearArm");
    if (s > 0) {
      px0.limb([[sh[0], sh[1] + 1], el, hd], [1.9, 1.9, 1.7], BONE, 7.9, { weld: 1.5, weldRoot: 3 });
      px0.capsule(el[0], el[1], 2.0, hd[0], hd[1], 1.7, STEEL, 7.95, { wrap: true });
      px0.ellipse(hd[0], hd[1], 1.9, 1.8, STEEL, 9.4, { weld: 1.5 });
    } else {
      const shb = [hx + rs * 7.6, chestY + 1.4], elb = [hx + rs * 8.8, chestY + 7.4], hdb = [hx + rs * 8.8, chestY + 12.4 - rs * Math.cos(ph * TAU) * 0 + -rs * Math.cos(ph * TAU) * 1.0];
      px0.limb([shb, elb, [hdb[0], hdb[1] - 1]], [1.8, 1.9, 1.8], BONE, 4.3, { cast: 0 });
      px0.capsule(elb[0], elb[1], 2.0, hdb[0], hdb[1] - 1.2, 1.8, STEEL, 4.35, { cast: 0, wrap: true });
      px0.ellipse(hdb[0], hdb[1], 1.7, 1.6, STEEL, 3.6);
    }
    px0.tag(null); px0.body(0);
  }
  return { light: { x: hx + 0.8, y: y(0.4) + 0.4, r: 16, col: "#7ce0b8", k: s > 0 ? 0.22 : 0.08 }, feet: [hx, 0] };
};

const walk = { ...SIDE.walk };
const BOX = { w: 76, h: 100, ox: 38, oy: 90 };
export const FRONT = { NAME: "crypt-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "crypt-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
