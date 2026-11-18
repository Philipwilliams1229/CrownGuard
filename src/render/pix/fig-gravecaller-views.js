// ============ FIGURE VIEWS: the Gravecaller from the FRONT and from BEHIND ============
// The side figure (fig-gravecaller.js) walking toward the camera (FRONT) and away from it (BACK); one
// drawer, `make(s)`: s = +1 front, -1 back. Unflipped on the board; one sun upper left. His RIGHT hand
// (near side of the side view) carries the corpse-candle lantern: SCREEN LEFT in front, screen RIGHT
// from behind (`rs`); the far (left) fist keeps the crook with the handbell (screen side `ls`).
// The walk is the side clip's own (same n, ms, pose): the feet, bob and crook plant come off the solved
// pose, forward is DOWN the screen in FRONT and UP in BACK, foreshortened (FWD). The toll clip (casts)
// stays side-on: no fx here, only the lantern's light.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-gravecaller.js";

const ROBE = mat("#2e3a3c", { contrast: 0.9 }), COWL = mat("#3c4a4a"), TRIM = mat("#4a5a50"), CAPE = mat("#2a2434", { contrast: 0.9 });
const BONE = mat("#d8d0bc"), WOOD = mat("#5a4a3a"), BRONZE = mat("#a8843e", { contrast: 1.15 }), WEED = mat("#4e6a48"), IRON = mat("#3a3c44", { contrast: 1.1 }), BOOT = mat("#242c30");
const VOID = flat("#12161a"), SOCK = flat("#0c1012");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), EYE_DIM = flat("#3a9c86", { emis: true });
const F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" });

// FRONT: the hood's mouth with the skull in it, witch-fire in the sockets (C cloth, K the lit lip, c shade, I dark, B bone)
const FRONT_H = [
  "....CCCCC....",
  "..CCCCCCCCC..",
  ".CCCCCCCCCCC.",
  ".CCKKKKKKKCc.",
  "CCCKIIIIIKcCc",
  "CCKIBBBBBIIKc",
  "CCKIeEBEeIIKc",
  "CCKIBBnBBIIKc",
  "CCKIBTTTBIIKc",
  "cCCKIbTjTbIKC",
  "..CCKjjjIKCC.",
  "..cCCCKKKCCc.",
];
// BACK: the back of the hood, a seam down it, a mended patch, the stitched lip of the cowl; no face
const BACK_H = [
  "....CCCCC....",
  "..CCCKCCCCC..",
  ".CCKKKCCCCCC.",
  ".CKKKKcCCCCc.",
  "CCKKCCcCCCCCc",
  "CCKCCCcCCCCCc",
  "CCCCCCcCCCkCc",
  "CCCCCCcCCkkCc",
  "cCCCCCcCCCCCc",
  ".cCCCCcCCCCc.",
  "..cCCCCCCCc..",
  "...ccCcccc...",
];
for (const g of [FRONT_H, BACK_H]) g.forEach((r) => { if (r.length !== 13) throw new Error("gravecaller-views: grid row width " + r.length); });
const legend = (eye) => ({
  C: { m: COWL }, c: { m: COWL, bias: -1 }, k: { m: COWL, bias: -2 }, K: { m: COWL, bias: 1 }, I: { m: VOID },
  B: { m: BONE, fix: 2 }, b: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: eye }, n: { m: SOCK }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 },
});
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT), LEG_DIM = legend(EYE_DIM);

const FWD = 0.4, TAU = Math.PI * 2, STAFF = 36;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAT = [[1, 0.4], [0.84, 3.6], [0.7, 0], [0.54, 4.4], [0.4, 0.2], [0.26, 3.4], [0.12, 0], [0, 2]];

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;                         // screen side of his right (lantern) and left (crook) hand
  const { sk, ph, lag1, lag2 } = F, p = sk.p;
  const sway = Math.sin(ph * TAU), w1 = lag1.p.sway || 0;
  const sx = sway * 0.5;
  const hipY = sk.P[1], chestY = sk.C[1], hy = Math.round(sk.N[1]), hx = Math.round(sx * 0.6);
  const vy = cl(sk.C[1] - lag1.C[1], -2, 2), vy2 = cl(lag1.C[1] - lag2.C[1], -2, 2);
  const vx = cl((Math.sin(ph * TAU) - Math.sin((ph - 0.09) * TAU)) * 1.2, -2, 2), vx2 = cl((Math.sin((ph - 0.09) * TAU) - Math.sin((ph - 0.18) * TAU)) * 1.2, -2, 2);
  const top = chestY - 2.2, hemY = -0.8;

  // ---- the cape: FRONT, the bruise-violet showing wide behind each shoulder and below the hem; BACK, it covers him
  {
    px.part(); const cid = px._pid;
    if (s > 0) {
      px.poly([[sx - 6.6, top + 0.6], [sx + 6.6, top + 0.6], [sx + 9.4 + vx, hipY + 3], [sx + 10.4 + vx * 1.5, -2 + vx], [sx + 5, -4], [sx - 5, -4], [sx - 10.4 + vx * 1.5, -2 - vx], [sx - 9.4 + vx, hipY + 3]], CAPE, 0.4, { round: 0.9 });
    } else {
      const d = vx * 1.4 + vx2 * 0.8;
      const hem = TAT.map(([t, dp]) => [sx + 9.6 - t * 19.2 + (dp < 1 ? d : d * 0.4), -1.6 - dp - 1.6]);
      px.poly([[sx - 6.2, top + 0.4], [sx + 6.2, top + 0.4], [sx + 7.4, hipY - 2], [sx + 9.4, hipY + 6], ...hem, [sx - 9.4, hipY + 6], [sx - 7.4, hipY - 2]], CAPE, 5.4, { round: 0.9, cast: 1 });
      px.toneLine(sx - 3.4, hipY + 6, sx - 4.6, -6, -1, cid);
      px.toneLine(sx + 3.4, hipY + 6, sx + 4.4, -6, 1, cid);
      px.part();
      px.line(sx - 6.2, top + 0.6, sx + 6.2, top + 0.6, TRIM, 5.45, { fix: 2 });   // the clasp cord at the nape
      px.dot(sx, top + 2, BRONZE, 5.5, { fix: 2 });
    }
  }

  // ---- the crook: planted beside him; from the front it stands on the screen side of his left hand
  const lift = p.lift || 0, plant = p.sx != null ? (p.sx - 7) * 0.14 : 0;
  const cx = hx + ls * 9.4 + sx * 0.3, base = -0.6 + s * plant - lift * 0.5, tipY = base - STAFF;
  const hook = (dx, dy) => [cx + ls * dx, tipY + dy];
  px.part(); const crookId = px._pid;
  px.capsule(cx, base, 0.95, cx, tipY, 0.95, WOOD, s > 0 ? 6.4 : 1.5, { edge: true });
  px.capsule(cx, tipY, 0.95, ...hook(-1.6, -2.2), 0.9, WOOD, s > 0 ? 6.4 : 1.5, { edge: true });
  px.capsule(...hook(-1.6, -2.2), 0.9, ...hook(-3.8, -0.6), 0.8, WOOD, s > 0 ? 6.4 : 1.5, { edge: true });
  px.line(cx, tipY + 6, cx, tipY + 2, BRONZE, s > 0 ? 6.45 : 1.52, { fix: 3 });
  // the bell hangs from the hook's end, swinging a little toward and away
  {
    const hk = hook(-3.8, -0.6), ring = (p.ring || 0), bx = hk[0] + ring * 0.8, by = hk[1] + 4 - Math.abs(ring) * 0.3, zz = s > 0 ? 6.5 : 1.6;
    px.part();
    px.line(hk[0], hk[1], bx, by - 1.4, IRON, zz - 0.05, { noLine: true });
    px.poly([[bx - 1.2, by - 1.6], [bx + 1.2, by - 1.6], [bx + 1.8, by + 0.4], [bx + 2.8, by + 2.4], [bx - 2.8, by + 2.4], [bx - 1.8, by + 0.4]], BRONZE, zz, { round: 0.7 });
    px.dot(Math.round(bx), Math.round(by) + 3, IRON, zz + 0.02, { fix: 1 });
  }

  // ---- slippers under the hem: forward is down the screen in front, up in back
  for (const [f, side, z] of [[p.fF || [2, 0], ls, 2], [p.fN || [-1.8, 0], rs, 3]]) {
    const lf = f[1], fx = hx + side * 3 + sx * 0.4, fy = -1.2 + s * f[0] * FWD - lf * 0.9;
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1, 2.4, 1.3, BOOT, z, { fix: 1 });
    else {
      px.ellipse(fx, fy + 0.8, 1.9, 1.2, BOOT, z, { fix: 1 });
    }
  }

  // ---- the robe: narrow shoulders flaring to a ragged hem, its foot lifting with each step
  const tipD = -vx * 0.6 - vx2 * 0.8, wF = hipY - 2, hw = 9.2;
  const lifted = (p.fN ? p.fN[1] : 0) - (p.fF ? p.fF[1] : 0);        // which foot is up lifts that side of the hem
  px.part(); const robeId = px._pid;
  const hem = TAT.map(([t, dp], i) => [sx + hw - t * hw * 2 + (dp < 1 ? tipD : tipD * 0.4), hemY - dp - Math.max(0, (rs > 0 ? lifted : -lifted)) * (t < 0.5 ? 0 : 0.35) * 0 + (i % 2 ? 0 : 0)]);
  px.poly([[sx - 6.4, top], [sx + 6.4, top], [sx + 7, chestY + 4], [sx + 6.4, hipY - 1], [sx + hw + 0.4, hemY - 1], ...hem, [sx - hw - 0.4, hemY - 1], [sx - 6.4, hipY - 1], [sx - 7, chestY + 4]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(sx - 3, hipY + 2, sx - 4.6, hemY - 5, -1, robeId);
  px.toneLine(sx + 3.6, hipY + 2, sx + 5.6, hemY - 5, 1, robeId);
  px.part();
  if (s > 0) {
    // the front panel in dull green trim down the middle, bog-stain up from the hem
    px.line(sx, top + 5, sx, hemY - 4, TRIM, 4.04);
    px.line(sx - 0.2, hipY + 2, sx - 2.8, hemY - 5, TRIM, 4.04); px.line(sx + 0.2, hipY + 2, sx + 2.8, hemY - 5, TRIM, 4.04);
  } else {
    px.line(sx, top + 3, sx, hipY - 3, TRIM, 4.04, { fix: 0 });            // the back seam of the robe
    px.line(sx - 2, hipY - 3, sx - 5.4, hemY - 4, TRIM, 4.04, { fix: 0 });
  }
  px.part();
  for (let i = 0; i < 7; i++) px.dot(sx - hw + 1.4 + i * 2.5, hemY - 1.2 - (i % 2) * 1.6, WEED, s > 0 ? 4.1 : 5.6, { fix: 1 });
  // the rope belt, finger bones swinging from it
  const sw = cl(-vx * 1.1 - vx2 * 0.9 + w1 * 0.6, -1.5, 1.5);
  px.part();
  px.poly([[sx - 5.8, hipY - 3.4], [sx + 5.8, hipY - 3.4], [sx + 6, hipY - 1.7], [sx - 6, hipY - 1.7]], WOOD, s > 0 ? 4.5 : 5.7, { round: 0.94, bias: -1 });
  if (s > 0) {
    px.part();
    for (let i = 0; i < 3; i++) px.line(sx - 3.6 + ls * 0.4 + i * 1.8, hipY - 1.6, sx - 3.6 + ls * 0.4 + i * 1.8 + sw * 0.5, hipY + 1 + (i % 2) * 1.2, BONE, 4.6, { fix: 3 });
    px.dot(sx + 1.4, hipY - 2.6, BRONZE, 4.6, { fix: 2 });
  } else {
    px.part(); px.dot(sx + 1.4, hipY - 2.6, BRONZE, 5.75, { fix: 2 });
  }

  // ---- the arms: belled sleeves. Right (lantern) hangs, left (crook) is up on the shaft.
  const fistN = [hx + rs * 8, sk.hdN[1] + 1], fistF = [cx + ls * (s > 0 ? 0 : 0), clamp(sk.hdF[1], chestY + 5, hipY)];
  const arm = (sh, el, hd, z, bias) => {
    px.part();
    px.capsule(sh[0], sh[1], 2, el[0], el[1], 1.9, COWL, z, { bias, cast: 2 });
    px.capsule(el[0], el[1], 1.9, hd[0], hd[1] - 0.6, 2.5, COWL, z, { bias, cast: 2 });
    px.part(); px.ellipse(hd[0], hd[1] + 0.4, 1.6, 1.6, BONE, z + 0.4, { bias });
  };
  const shN = [hx + rs * 6.6, chestY + 0.4], shF = [hx + ls * 6.6, chestY + 0.4];
  const elN = [hx + rs * 8.8, (chestY + fistN[1]) / 2 + 0.6], elF = [hx + ls * 8.4, (chestY + fistF[1]) / 2 + 0.6];
  const nearZ = s > 0 ? 8 : 5.8;
  arm(shF, elF, [cx, fistF[1]], nearZ, -1);
  arm(shN, elN, fistN, nearZ, 0);
  // the cuff trim
  px.part(); px.line(fistN[0] - 2.4, fistN[1] - 2.4, fistN[0] + 2.4, fistN[1] - 2.4, TRIM, nearZ + 0.1, { fix: 1 });
  // the lantern: a chain, an iron cage, a teal flame; it sways a beat behind the stride
  const lsw = (lag1.p.sway || 0) * 0.5 + vx * -0.6, lx = fistN[0] + lsw, ly = fistN[1] + 5.6, flick = p.flick || 0;
  px.part();
  px.line(fistN[0], fistN[1] + 1, lx, ly - 2.4, IRON, 8.45, { noLine: true });
  px.rect(lx - 2, ly - 2.4, 4, 1, IRON, 8.5, { fix: 1 }); px.rect(lx - 2, ly + 2.4, 4, 1, IRON, 8.5, { fix: 1 });
  px.rect(lx - 1.5, ly - 1.4, 3, 3.8, F_TEAL, 8.48, { noLine: true });
  px.dot(Math.round(lx), Math.round(ly) - (flick ? 0 : 1), F_PALE, 8.55, { noLine: true });
  px.line(lx - 2, ly - 1.4, lx - 2, ly + 2.4, IRON, 8.52, { fix: 1, noLine: true }); px.line(lx + 2, ly - 1.4, lx + 2, ly + 2.4, IRON, 8.52, { fix: 1, noLine: true });

  // ---- the hood's point, behind the head, trailing a beat behind the stride; then the head
  const bend = cl(vx * 2 + vx2 * 1.4, -2, 3), gx = hx + (s > 0 ? 5 : -5), gy = hy - 15.5;
  px.part();
  px.poly([[hx - 3.6, hy - 8], [hx + 3.6, hy - 8], [hx + 2.6 + bend * 0.3, hy - 13], [gx + bend, gy - 1.6], [hx + (s > 0 ? 1 : -1) * 0.6, gy + 3.2], [hx - 2, hy - 10.6]], COWL, 8.95, { round: 0.85, ny: -0.2 });
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, p.eye > 0.5 ? LEG_HOT : p.eye < -0.5 ? LEG_DIM : LEG, 9, { ax: 6, ay: 11, ball: [6, 6.5, 7, 7.5], cast: 1 });

  const tk = p.toll || 0;
  return { light: { x: lx, y: ly, r: 16 + 10 * tk, col: "#7ce0b8", k: 0.3 + 0.3 * tk }, feet: [hx, 0] };
};
const clamp = cl;

const walk = { ...SIDE.walk };
const BOX = { w: 56, h: 74, ox: 28, oy: 66 };
export const FRONT = { NAME: "gravecaller-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "gravecaller-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
