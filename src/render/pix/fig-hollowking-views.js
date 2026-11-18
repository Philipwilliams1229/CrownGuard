// ============ FIGURE VIEWS: the Hollow King from the FRONT and from BEHIND ============
// fig-hollowking.js walking toward the camera (FRONT, s = +1) and away from it (BACK, s = -1); one
// drawer. He holds the great sword in BOTH hands before him. FRONT: the grip at the chest, the blade
// leaning up and out to his right (screen LEFT, `rs`) clear of the crown, its edge burning teal. BACK:
// the blade is before him, so it is hidden; only the sleeves and nothing standing up beside the head.
// The long violet cape streams behind him: wide slivers at each side in front, the whole of his back
// from behind (gold-edged, torn, weed caught in it). Joint-kit bone limbs (welded tubes). Regal march:
// slow bob, a small sway. Unflipped on the board; one sun upper left. Clips are the side walk's own.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-hollowking.js";

const BONE = mat("#e0d8c4"), ROBE = mat("#3a2e4a", { contrast: 0.95 }), ROBE_D = mat("#2a2236", { contrast: 0.9 }), CAPE = mat("#2a2434", { contrast: 0.9 });
const GOLD = mat("#b89c42", { contrast: 1.15 }), CROWN = mat("#d2b24e", { contrast: 1.2 }), WEED = mat("#4e6a48"), STEEL = mat("#4a5260", { contrast: 1.2 }), HAFT = mat("#2e2a36");
const GAP = flat("#6a604c"), SOCK = flat("#15121a");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), GEM = flat("#9cf4d4", { emis: true, line: "#2f8a72" });
const F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" });

// FRONT: the crowned skull (R crown, G gems, S bone, s shade, e socket, E fire, N nasal, T teeth, j jaw). 13 wide, centre col 6.
const FRONT_H = [
  "..R.R.R.R.R..",
  "..R.RRRRR.R..",
  "..RRRRRRRRR..",
  "..RRGRRRGRR..",
  ".SSSSSSSSSSS.",
  ".SSSSSSSSSSS.",
  ".SSeeSSSeeSS.",
  ".sSeEsSsEeSs.",
  ".sSSSSNSSSSs.",
  "..sSSSSSSSs..",
  "..sSTTTTTSs..",
  "...jTjTjTj...",
  "....jjjjj....",
];
// BACK: the crown from behind, the cracked back of the skull, the neck bones below
const BACK_H = [
  "..R.R.R.R.R..",
  "..R.RRRRR.R..",
  "..RRRRRRRRR..",
  "..RRRRGRRRR..",
  ".SSSSSSSSSSS.",
  ".SSSsSsSSsSS.",
  ".SSSSSsSSSss.",
  ".sSSSSsSSSss.",
  "..sSSsSSSss..",
  "...ssSSSss...",
  ".....SjS.....",
  ".....SjS.....",
  "......j......",
];
for (const g of [FRONT_H, BACK_H]) g.forEach((r) => { if (r.length !== 13) throw new Error("hollowking-views: grid row width " + r.length + " " + r); });
const legend = (eye) => ({ R: { m: CROWN, fix: 2 }, G: { m: GEM, fix: 3 }, S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: SOCK }, e: { m: SOCK }, E: { m: eye } });
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT);

const FWD = 0.4, TAU = Math.PI * 2, BL = 24;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;
  const { sk, ph, lag1, lag2 } = F, p = sk.p;
  const lurch = rs * 0.8 * Math.sin(ph * TAU), hx = Math.round(lurch * 0.6);
  const hipY = sk.P[1], chestY = sk.C[1], L = hipY - chestY, hy = Math.round(sk.N[1]);
  const y = (t) => chestY + L * t;
  const vx = cl((Math.sin(ph * TAU) - Math.sin((ph - 0.09) * TAU)) * 1.2, -2, 2), vx2 = cl((Math.sin((ph - 0.09) * TAU) - Math.sin((ph - 0.18) * TAU)) * 1.2, -2, 2);
  const pulse = 0.5 + 0.5 * Math.sin(ph * 2 * TAU), rw = 5.4, bob = 0.5 * Math.cos(ph * TAU);
  const gripY = chestY + 15 + bob * 0.5, grip = [rs * 2.6 + hx, gripY];

  // ---- the cape. FRONT: behind him, a violet wing out past each shoulder and flank. BACK: all of his back, over everything.
  {
    px.part(); const cid = px._pid;
    if (s > 0) {
      px.poly([[hx - 6.4, chestY - 1.6], [hx + 6.4, chestY - 1.6], [hx + 10 + vx, hipY + 2], [hx + 12 + vx * 1.5, -5 + vx], [hx + 5, -8], [hx - 5, -8], [hx - 12 + vx * 1.5, -5 - vx], [hx - 10 + vx, hipY + 2]], CAPE, 0.4, { round: 0.9, floor: 1 });
      px.line(hx - 6.4, chestY - 1.6, hx - 10.4 + vx, hipY + 2, GOLD, 0.42, { fix: 1 });
    } else {
      const d = vx * 1.5 + vx2 * 0.8, TT = [[1, 0.4], [0.86, 4.2], [0.72, 0], [0.56, 5], [0.42, 0.2], [0.28, 4], [0.14, 0], [0, 2.4]];
      const hem = TT.map(([t, dp]) => [hx + 11 - t * 22 + (dp < 1 ? d : d * 0.4), -4.5 - dp]);
      px.poly([[hx - 6.6, chestY - 1.8], [hx + 6.6, chestY - 1.8], [hx + 8.4, hipY - 4], [hx + 11, hipY + 6], ...hem, [hx - 11, hipY + 6], [hx - 8.4, hipY - 4]], CAPE, 5.4, { round: 0.9, floor: 1, cast: 1 });
      px.toneLine(hx - 4, hipY + 4, hx - 5.4, -8, -1, cid);
      px.toneLine(hx + 4, hipY + 4, hx + 5, -8, 1, cid);
      px.part();
      px.line(hx - 6.6, chestY - 1.6, hx + 6.6, chestY - 1.6, GOLD, 5.45, { fix: 2 });              // the gold-edged collar of the cape
      px.line(hx - 6.6, chestY - 1.6, hx - 11, hipY + 6, GOLD, 5.45, { fix: 1 });
      px.dot(hx, chestY - 0.4, CROWN, 5.5, { fix: 2 });
      for (const [dx, t] of [[-5, 0.7], [3.4, 1.0], [-1, 1.5]]) px.dot(hx + dx, y(t), WEED, 5.5, { fix: 1 });
    }
  }

  // ---- legs: thigh and shin bones, a knobbed knee, a long foot
  const feet = [[p.fF || [2.8, 0], ls, 2, -1], [p.fN || [-2.6, 0], rs, 3, 0]];
  for (const [f, side, z, b] of feet) {
    const lf = f[1], ax = hx + side * 3 + lurch * 0.2, ay = -2.8 + s * f[0] * FWD - lf * 0.9;
    const hp = [hx + side * 2.6, hipY + 1], kn = [(hp[0] + ax) / 2 + side * 1.1, (hp[1] + ay) / 2 - lf * 0.4];
    px.body(1);
    px.limb([hp, kn, [ax, ay]], [1.5, 1.3, 1.2], BONE, z + lf * 0.04, { bias: b });
    px.ellipse(kn[0], kn[1], 1.8, 1.7, BONE, z + 0.02 + lf * 0.04, { bias: b, weld: 1.5 });
    if (s > 0) px.ellipse(ax + side * 0.2, ay + 1.7, 1.7, 1.4, BONE, z + 0.04 + lf * 0.04, { bias: b, weld: 1.5 });       // the toe toward us
    else {
      px.ellipse(ax, ay + 1.3, 1.5, 1.3, BONE, z + 0.04, { bias: b, weld: 1.5 });
      if (lf > 0.8) px.ellipse(ax, ay + 2.6, 1.3, 1.3 * cl(lf / 2.4, 0.3, 1), BONE, z + 0.05, { bias: -2, weld: 1.5 });      // the heel as it lifts
    }
    px.body(0);
  }

  // ---- the robe: a tattered skirt and a gold-edged front panel, the hem swinging a beat behind
  {
    const tipD = -vx * 0.8 - vx2 * 0.8, base = hipY + 8;
    px.part(); const rid = px._pid;
    const hem = [[5.8, 2], [4.4, 6], [3.2, 1], [1.6, 5.4], [0, 0.6], [-1.6, 5], [-3.2, 1.4], [-4.6, 6.4], [-5.9, 2]].map(([x, dp]) => [hx + x + tipD * (dp < 3 ? 0.4 : 0.8), base + dp]);
    px.poly([[hx - 5.2, hipY - 2.4], [hx + 5.2, hipY - 2.4], [hx + 6.2, hipY + 4], ...hem, [hx - 6.2, hipY + 4]], ROBE, 4, { round: 0.85, floor: 1, cast: 1 });
    px.toneLine(hx - 2.6, hipY + 1, hx - 4, base + 2, -1, rid);
    px.toneLine(hx + 3, hipY + 1, hx + 4.4, base + 2, 1, rid);
    px.part();
    if (s > 0) {
      px.poly([[hx - 1.8, hipY - 1], [hx + 1.8, hipY - 1], [hx + 2.6 + tipD * 0.5, base + 5], [hx + 1 + tipD * 0.8, base + 3.4], [hx - 0.4 + tipD, base + 6], [hx - 1.8 + tipD, base + 4]], ROBE_D, 4.1, { round: 0.8, floor: 1 });
      px.line(hx - 1.8, hipY - 1, hx - 1.8 + tipD, base + 3.6, GOLD, 4.15, { fix: 2 }); px.line(hx + 1.8, hipY - 1, hx + 2.6 + tipD * 0.5, base + 4, GOLD, 4.15, { fix: 1 });
    }
    px.part();
    for (let i = 0; i < 5; i++) px.dot(hx - 4.4 + i * 2.2 + tipD * 0.3, base + 2.4 + (i % 2) * 2, WEED, s > 0 ? 4.2 : 4.2, { fix: 1 });
  }

  // ---- the pelvis, the spine and the rib cage. FRONT: the witch-fire heart burning between the ribs
  px.body(1);
  px.ellipse(hx, hipY - 0.6, 4.4, 2.5, BONE, 4.3, { floor: 1 });
  px.capsule(hx, y(0.04), 1.1, hx, hipY - 1, 1.1, BONE, 3.9, { bias: -1 });
  px.poly([[hx - rw, y(-0.1)], [hx + rw, y(-0.1)], [hx + rw + 0.4, y(0.3)], [hx + rw - 1, y(0.62)], [hx + 3.6, y(0.78)], [hx - 3.6, y(0.78)], [hx - rw + 1, y(0.62)], [hx - rw - 0.4, y(0.3)]], BONE, s > 0 ? 4.5 : 4.2, { round: 0.7, floor: 1 });
  if (s > 0) for (const t of [0.1, 0.26, 0.42, 0.58]) { px.line(hx - rw + 0.8, y(t), hx + rw - 0.8, y(t) + 0.2, GAP, 4.6); }
  else { px.line(hx, y(-0.04), hx, y(0.76), BONE, 4.65, { fix: 3 }); for (const t of [0.12, 0.3, 0.48, 0.64]) px.line(hx - rw + 1, y(t), hx + rw - 1, y(t) + 0.2, GAP, 4.6); }
  px.body(0);
  px.part();
  px.rect(hx - 4.8, hipY - 3, 9.6, 1.6, GOLD, 4.4, { fix: 2 });
  px.dot(hx + (s > 0 ? 0 : 2.2), hipY - 2.2, GEM, 4.45, { fix: 3 });
  if (s > 0) { px.part(); const h = [hx, y(0.4)]; px.ellipse(h[0], h[1], 1.8, 2.2, F_TEAL, 4.7, { noLine: true }); px.dot(h[0], h[1] - (pulse > 0.5 ? 0.6 : 0), F_PALE, 4.75, { noLine: true }); }

  // ---- the mantle over the shoulders: a gold-edged collar, verdigris fittings, weed
  px.part(); const mid = px._pid;
  px.poly([[hx - rw - 3, chestY - 1.4], [hx - rw - 2, chestY + 1.6], [hx - rw, chestY + 3.6], [hx - 2.4, chestY + 2.4], [hx + 2.4, chestY + 2.4], [hx + rw, chestY + 3.6], [hx + rw + 2, chestY + 1.6], [hx + rw + 3, chestY - 1.4], [hx + 3, chestY - 3], [hx - 3, chestY - 3]], ROBE, s > 0 ? 5 : 5.6, { round: 0.8, floor: 1, edge: true, cast: 1 });
  px.line(hx - rw - 2.6, chestY - 0.8, hx - rw - 0.6, chestY + 3, GOLD, 5.1, { fix: 2 }); px.line(hx + rw + 2.6, chestY - 0.8, hx + rw + 0.6, chestY + 3, GOLD, 5.1, { fix: 2 });
  if (s > 0) for (const x of [-3.4, 0, 3.4]) px.dot(hx + x, chestY + 2.4, CROWN, 5.2, { fix: 2 });
  px.part();
  px.poly([[hx + 3, chestY + 1], [hx + 6, chestY + 2], [hx + 7.4, chestY + 5 - vx], [hx + 5, chestY + 6.4 - vx * 1.4], [hx + 3.4, chestY + 4]], WEED, s > 0 ? 5.3 : 5.8, { round: 0.7, floor: 1 });

  // ---- the great sword (FRONT only: before him it is hidden by his body from behind)
  const sleeveHand = (sh, hd, z, bias) => {
    const el = [(sh[0] + hd[0]) / 2 + (sh[0] - hd[0]) * 0.25 + (sh[0] > hx ? 2 : -2), (sh[1] + hd[1]) / 2 + 1.2];
    px.body(1);
    px.limb([sh, el, hd], [2.2, 2.0, 1.2], ROBE, z, { floor: 1, weld: 2, weldRoot: 3, bias });
    const fm = [el[0] * 0.3 + hd[0] * 0.7, el[1] * 0.3 + hd[1] * 0.7];
    px.capsule(fm[0], fm[1], 1.8, hd[0], hd[1], 1.2, BONE, z + 0.05, { wrap: true, bias });
    px.ellipse(el[0], el[1], 2.0, 1.9, ROBE, z + 0.02, { floor: 1, weld: 2, bias });
    px.line(el[0] - 1.6, el[1] + 2, el[0] + 1.4, el[1] + 2.4, GOLD, z + 0.08, { fix: 2 });
    px.ellipse(hd[0], hd[1], 1.7, 1.6, BONE, z + 0.2, { weld: 1.5, bias });
    px.body(0);
  };
  {
    const k = s > 0 ? 0.5 : 0.17, bz = s > 0 ? 0 : -6.6, dirx = rs * k, tipv = [grip[0] + rs * (BL * k + 1), grip[1] - BL - 4];
    const ln = Math.hypot(tipv[0] - grip[0], tipv[1] - grip[1]), u = [(tipv[0] - grip[0]) / ln, (tipv[1] - grip[1]) / ln], nrm = [-u[1], u[0]];
    const at2 = (f, q) => [grip[0] + u[0] * f + nrm[0] * q, grip[1] + u[1] * f + nrm[1] * q];
    px.part();
    px.capsule(...at2(-4.4, 0), 0.9, ...at2(1.6, 0), 0.9, HAFT, 8.1 + bz);
    px.ellipse(...at2(-5, 0), 1.3, 1.3, GOLD, 8.12 + bz, { fix: 2 });
    px.line(...at2(1.8, -2.8), ...at2(1.8, 2.8), GOLD, 8.14 + bz, { fix: 2 });
    px.dot(...at2(1.8, -3.1), CROWN, 8.15 + bz, { fix: 2 }); px.dot(...at2(1.8, 3.2), CROWN, 8.15 + bz, { fix: 2 });
    px.part();
    px.poly([at2(2.4, -1.6), at2(2.4, 1.6), at2(BL - 2.4, 1.4), at2(BL, 0.1), at2(BL - 2.4, -1.2)], STEEL, 8.2 + bz, { fix: 3 });
    px.line(...at2(3, 0.3), ...at2(BL - 3, 0.2), STEEL, 8.22 + bz, { fix: 1 });
    px.line(...at2(2.6, -1.5), ...at2(BL - 1.6, -0.9), F_TEAL, 8.3 + bz, { noLine: true });
    px.dot(...at2(BL - 1.2, -0.3), F_PALE, 8.35 + bz, { noLine: true });
    // flames lick along the edge, a beat each frame
    for (let i = 0; i < 4; i++) { const t = 4 + i * 5, hh = (i + Math.floor(ph * 8)) % 2, pt = at2(t, -1.8); px.dot(pt[0], pt[1] - hh, i % 2 ? F_TEAL : F_PALE, 8.4 + bz, { noLine: true }); }
  }
  // both arms reach the grip: from behind only the sleeves show at his sides, the hands before him unseen
  if (s > 0) {
    sleeveHand([hx + ls * 5.4, chestY + 1.2], [grip[0] - rs * 0.4, grip[1] + 0.6], 8.3, -1);
    sleeveHand([hx + rs * 5.4, chestY + 1.2], grip, 8.4, 0);
  } else {
    for (const side of [-1, 1]) {
      const sh = [hx + side * 5.8, chestY + 1.2], hd = [hx + side * 7, chestY + 11];
      px.body(1);
      px.limb([sh, [hx + side * 8.4, chestY + 6.4], hd], [2.3, 2.1, 1.7], ROBE, 5.9, { floor: 1, weld: 2, weldRoot: 3 });
      px.ellipse(hx + side * 8.4, chestY + 6.4, 2.1, 1.9, ROBE, 5.92, { floor: 1, weld: 2 });
      px.body(0);
      px.line(hx + side * 8.4 - 1.6, chestY + 8.4, hx + side * 8.4 + 1.4, chestY + 8.8, GOLD, 5.98, { fix: 2 });
    }
  }
  // the near shoulder cap over the sleeve root
  px.part();
  for (const side of [-1, 1]) px.ellipse(hx + side * 5.8, chestY + 0.6, 2.2, 1.9, ROBE, s > 0 ? 8.3 : 5.95, { floor: 1 });

  // ---- the crowned skull; a trailing weed from the crown
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy - 1, p.eye > 0.5 ? LEG_HOT : LEG, 6, { ax: 6, ay: 12, ball: [6.5, 8, 6.4, 6.8], cast: 1 });
  px.part();
  px.dot(hx - 6, hy - 8 + (vx > 0.5 ? 1 : 0), WEED, 6.2, { fix: 1 }); px.dot(hx - 6, hy - 7, WEED, 6.2, { fix: 1 });

  return { light: { x: hx, y: y(0.4), r: 26, col: "#7ce0b8", k: (0.3 + 0.12 * pulse) * (s > 0 ? 1 : 0.5) }, feet: [hx, 0] };
};

const walk = { ...SIDE.walk };
const BOX = { w: 80, h: 98, ox: 40, oy: 88 };
export const FRONT = { NAME: "hollowking-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "hollowking-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
