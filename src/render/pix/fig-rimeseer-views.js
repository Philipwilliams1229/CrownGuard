// ============ VIEWS: the Rime Seer seen from the FRONT and from BEHIND ============
// fig-rimeseer.js (smoke-grey robe in a white fur hem, the fur-rimmed hood crowned with bone antlers, pale
// braids, frost-blue eyes, the chin rune, rune-stones at the belt, the whalebone staff with its crown of ice)
// walking toward the camera (FRONT, s = +1) and away from it (BACK, s = -1), unmirrored, sun upper left.
// Her LEFT hand holds the staff (the far fist of the side view): screen RIGHT in front, screen LEFT behind.
// Her right hand hangs free, its palm open. The walk reads the side clip's own pose (same n, ms), a slow
// glide: little bob, a small sway over the planted foot, boots peeping under the hem. The casts stay side-on.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-rimeseer.js";

const SKIN = mat("#ecd0bc"), ROBE = mat("#5e5868"), SLEEVE = mat("#6e6878"), FURW = mat("#ece8e0"), FURB = mat("#b8b4b8"), DARK = mat("#2c2832"), HOOD = mat("#46404e");
const BONE = mat("#e6dcc0"), WHALE = mat("#d8d0b8"), HAIR = mat("#e4dcc4"), ICE = mat("#bfe8fa", { contrast: 1.3 }), TEAL = mat("#4e8a92"), BOOT = mat("#4a3a30");
const EYE = flat("#7cc8ec"), RUNE = flat("#5ab4e0"), MOUTH = flat("#7a4a52");
const LEG = {
  h: { m: HOOD }, k: { m: HOOD, bias: -1 }, F: { m: FURW }, f: { m: FURB, bias: -1 }, H: { m: HAIR, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, r: { m: RUNE, fix: 0 }, M: { m: MOUTH },
};
// FRONT: the hood and its fur rim frame a narrow pale face, frost-blue eyes, the rune on the chin. 13 wide, centre col 6.
const FRONT_H = [
  "....hhhhh....",
  "..hhhhhhhhh..",
  ".hhhhhhhhhhh.",
  ".hhhhhhhhhhh.",
  ".HFFfSSSfFFH.",
  ".HFSESSSESFH.",
  ".HFSESNSESFH.",
  ".HFfSSNSSfFH.",
  "..HFfSMSfFH..",
  "...HFSrSFH...",
  "....HFFFH....",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
// BACK: the back of the hood with its seam, a bone stud at the crown, the fur of the nape.
const BACK_H = [
  "....hhhhh....",
  "..hhhhhhhhh..",
  ".hhhhhkhhhhh.",
  ".hhhhhkhhhhh.",
  ".hhhhhkhhhhh.",
  ".hhhhhkhhhhh.",
  ".hhhhhkhhhhh.",
  ".hhhhhkhhhhh.",
  "..hhhhkhhhh..",
  "..FFFFFFFFF..",
  "...FfFFFfF...",
  "....FFFFF....",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;

const make = (s) => (px, F) => {
  const rs = -s, ls = s;                                   // screen side of her right (free hand) and left (staff)
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 0.6 * Math.sin(t * TAU);          // a slight sway over the planted foot
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1] + 1, hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.6);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2), vx = cl((sx - sx1) * 1.3, -2, 2), vx2 = cl((sx1 - sx2) * 1.3, -2, 2);
  const c0 = chestY - 3;

  // ---- the staff in her left hand, beside her: a whalebone shaft, bone rings, a cradle and a crown of ice
  const stx = ls * 11.4 + sx, sfy = -(p.lift || 0) * 0.6 - 0.5, STAFF = 38, top = sfy - STAFF;
  const at = (a, b) => [stx + b * 1, top + 0 - a + STAFF * 0 + 0];   // a up from the tip (+ = above), b across
  const Z0 = s > 0 ? 1.5 : 1.0;
  px.part();
  px.capsule(stx, sfy, 1, stx, top, 1, WHALE, Z0, { edge: s > 0 });
  for (const a of [10, 20, 30]) px.dot(stx, top + a, BONE, Z0 + 0.02, { fix: 3 });
  px.part();
  px.capsule(stx, top + Z0 + 0.1, 1.5, stx, top - 1.4, 1.7, BONE, Z0 + 0.05);
  px.poly([[stx + 0.8, top - 1], [stx + 4.2, top - 4], [stx + 2.6, top - 8.5], [stx + 0.6, top - 6]], BONE, Z0 + 0.06, { fix: 2 });
  px.poly([[stx - 0.8, top - 1], [stx - 4.2, top - 4], [stx - 2.6, top - 8.5], [stx - 0.6, top - 6]], BONE, Z0 + 0.06, { fix: 1 });
  px.part();
  px.poly([[stx - 1.2, top - 1.4], [stx + 1.2, top - 1.4], [stx + Z0 + 0.1, top - 7], [stx, top - 13.5], [stx - Z0 + 0.1, top - 7]], ICE, Z0 + 0.1, { fix: 2 });
  px.poly([[stx + 1.2, top - 2.4], [stx + 4.6, top - 4.4], [stx + 3.6, top - 10], [stx + 1.2, top - 7]], ICE, Z0 + 0.11, { fix: 1 });
  px.poly([[stx - 1.2, top - 2.4], [stx - 4.6, top - 4.4], [stx - 3.6, top - 10], [stx - 1.2, top - 7]], ICE, Z0 + 0.11, { fix: 3 });
  const light = { x: stx, y: top - 5, r: 16 + 24 * (p.glow || 0), col: "#9ad8f2", k: Math.min(p.glow || 0, 0.4 + 0.25 * (p.glow || 0)) };

  // ---- the far arm (her left), a tone down: a wide sleeve out to the staff, a fur cuff, the fist on it
  {
    const back = s < 0, az = back ? 4.3 : 3.2, o = back ? { cast: 0 } : { bias: -1 };
    const sh = [sx + ls * 7.8, c0 + 3], hd = [stx - ls * 0.2, sk.hdF[1] + 0.5], el = [sx + ls * (back ? 10 : 9.4), (sh[1] + hd[1]) / 2 - 0.5], wr = [(el[0] + hd[0]) / 2 + ls * 0.4, (el[1] + hd[1]) / 2 + 2.6];
    px.part();
    px.capsule(sh[0], sh[1], 2.2, el[0], el[1], 2.2, SLEEVE, az, o);
    px.capsule(el[0], el[1], 2.2, wr[0], wr[1], 2.7, SLEEVE, az, o);
    px.capsule(wr[0], wr[1], 1.7, hd[0], hd[1] - 0.6, 1.7, FURW, az + 0.05, o);
    px.part();
    if (back) px.ellipse(hd[0], hd[1] + 0.6, 1.5, 1.5, SKIN, 3.6);
    else { px.ellipse(stx, hd[1], 2.4, 2.1, SKIN, 3.4); px.dot(stx - 2, hd[1] + 0.4, SKIN, 3.45, { bias: -1 }); px.dot(stx + 2, hd[1] + 0.4, SKIN, 3.45, { bias: -1 }); px.line(stx - 2, hd[1] + 1.4, stx + 2, hd[1] + 1.4, SKIN, 3.45, { bias: -1 }); }   // the fist closed over the staff, fingers across it
  }

  // ---- boots peeping under the hem; the stepping foot comes toward us (front) / away (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], fx = hx + side * 2.6, fy = -0.6 + s * f[0] * FWD * 0.7 - lift * 0.9;
    px.part();
    px.capsule(fx, -3.4, 1.7, fx, fy + 0.2, 1.6, BOOT, 3.5, { bias: side === rs ? 0 : -1 });   // the shin, so the boot hangs from the hem
    if (s > 0) px.ellipse(fx + side * 0.2, fy + 0.6, 2.6, 1.6, BOOT, 3.6, { bias: side === rs ? 0 : -1 });
    else px.ellipse(fx, fy + 0.4, 2.3, 1.5, BOOT, 3.6, { bias: side === rs ? 0 : -1 });
  }

  // ---- the robe, belling to a fur hem; the hem swings a beat behind her sway
  const hemY = -2.4, hs = -vx * 0.8 - vx2 * 0.6, hmL = hx - 8.6 + hs, hmR = hx + 8.6 + hs, hm = (t) => hmL + (hmR - hmL) * t;
  px.part(); const robeId = px._pid;
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5.6, c0 + 4], [hx + 5.4, hipY - 1.4], [hmR, hemY - 3], [hmR, hemY], [hmL, hemY], [hmL, hemY - 3], [hx - 5.4, hipY - 1.4], [sx - 5.6, c0 + 4]], ROBE, 4, { round: 0.92, cast: 1 });
  px.toneLine(hx - 2, hipY + 0.6, hm(0.34), hemY - 3.2, -1, robeId);
  px.toneLine(hx + 2.4, hipY + 0.4, hm(0.74), hemY - 3.2, -1, robeId);
  px.poly([[hmL, hemY - 3], [hmR, hemY - 3], [hmR, hemY], [hmL, hemY]], FURW, 4.04, { round: 0.9 });
  for (let t = 0.07; t < 1; t += 0.12) px.dot(hm(t), hemY + 0.6 + ((t * 7) | 0) % 2, FURW, 4.05);
  // a woven teal belt with the rune-stones swinging from it (a hint of them from behind)
  px.poly([[hx - 5.4, hipY - 3.4], [hx + 5.4, hipY - 3.4], [hx + 5.4, hipY - 1.5], [hx - 5.4, hipY - 1.5]], TEAL, 4.05, { round: 0.92 });
  px.part();
  const swing = cl(-vx * 1.2, -1.5, 1.5);
  for (const [x, y, m] of [[2.6, 3.4, BONE], [0.4, 4.4, BONE], [4.2, 4, ICE]]) {
    const xx = (s > 0 ? x : -x * 0.9) + hx - 0.6;
    px.line(xx, hipY - 1.4, xx + swing * 0.4, hipY + y - 1.6, DARK, 4.2);
    px.dot(xx + swing * 0.5, hipY + y, m, 4.25, { fix: 3 });
  }
  if (s > 0) px.dot(hx, hipY - 2.5, BONE, 4.3, { fix: 3 });      // the belt's bone toggle
  else px.toneLine(sx, c0 + 3, hx, hipY - 4, -1, px._pid);        // the back seam
  // the mantle: white fur over the shoulders, shaggy at its edge
  px.part();
  const mz = s > 0 ? 4.4 : 5.2;
  px.ellipse(sx, c0 + 2, 9.4, 4.2, FURW, mz, { cast: 1 });
  for (const x of [-8, -5.4, -2.6, 0, 2.6, 5.4, 8]) px.dot(sx + x, c0 + 5.4 + (Math.abs(x) > 6 ? -1 : 0) + ((x * 2) & 1), FURW, mz);

  // ---- the near arm (her right, free): a wide sleeve and a fur cuff, the palm hanging open
  {
    const back = s < 0, az = back ? 4.3 : 7.9, o = { cast: back ? 0 : 2 };
    const ang = p.aN[0], sh = [sx + rs * 7.8, c0 + 3], hd = [sx + rs * 10.2, hipY + 2 + (back ? -ang * 1.2 : s * ang * 1.6)], el = [sx + rs * 10, (sh[1] + hd[1]) / 2], wr = [(el[0] + hd[0]) / 2, (el[1] + hd[1]) / 2 + 2.4];
    px.part();
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.4, SLEEVE, az, o);
    px.capsule(el[0], el[1], 2.4, wr[0], wr[1], 2.9, SLEEVE, az, o);
    px.capsule(wr[0], wr[1] - 0.4, 2.7, hd[0], hd[1] - 1, 2.8, FURW, az + 0.05, o);
    px.part();
    if (back) px.ellipse(hd[0], hd[1] + 0.6, 1.6, 1.6, SKIN, 3.6); else px.ellipse(hd[0], hd[1] + 0.2, 1.9, 2, SKIN, 8.3);
  }

  // ---- the head: braids, the far antler behind, the hood, antlers over it
  const bs = -vx * 1.4 - vx2 * 1, by = -vy * 0.3;
  if (s > 0) {
    // two pale braids hanging in front over the mantle, ice beads at their ends
    for (const side of [-1, 1]) {
      const b0 = [hx + side * 5.4, hy + 2], b1 = [b0[0] + side * 0.6 + bs * 0.3, b0[1] + 6 + by], b2 = [b1[0] - side * 0.4 + bs * 0.6, b1[1] + 6], b3 = [b2[0] + bs * 0.3, b2[1] + 4.6];
      px.part();
      px.capsule(b0[0], b0[1], 1.5, b1[0], b1[1], 1.4, HAIR, 5, { bias: side === rs ? 0 : -1 }); px.capsule(b1[0], b1[1], 1.4, b2[0], b2[1], 1.2, HAIR, 5); px.capsule(b2[0], b2[1], 1.2, b3[0], b3[1], 0.9, HAIR, 5);
      px.dot(b3[0], b3[1] + 1, ICE, 5.1, { fix: 3 });
    }
  } else {
    for (const side of [-1, 1]) {
      const b0 = [hx + side * 1.4, hy + 5], b1 = [b0[0] + side * 0.6 + bs * 0.3, b0[1] + 7 + by], b2 = [b1[0] + side * 0.2 + bs * 0.6, b1[1] + 7], b3 = [b2[0] + bs * 0.3, b2[1] + 5.6];
      px.part();
      px.capsule(b0[0], b0[1], 1.6, b1[0], b1[1], 1.5, HAIR, 5.4); px.capsule(b1[0], b1[1], 1.5, b2[0], b2[1], 1.3, HAIR, 5.4); px.capsule(b2[0], b2[1], 1.3, b3[0], b3[1], 0.9, HAIR, 5.4);
      px.dot(b3[0], b3[1] + 1, ICE, 5.5, { fix: 3 });
    }
  }
  const antler = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 1.5], [x0 + dir * 2.6, y0 - 3.4, 1.3], [x0 + dir * 4.6, y0 - 7, 1.1], [x0 + dir * 4.2, y0 - 10.8, 0.6]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
    px.capsule(x0 + dir * 2.6, y0 - 3.4, 0.9, x0 + dir * 6.8, y0 - 5.4, 0.5, BONE, z, { cast: 1 });
    px.capsule(x0 + dir * 4.6, y0 - 7, 0.8, x0 + dir * 1.4, y0 - 9.8, 0.4, BONE, z, { cast: 1 });
  };
  px.part(); antler(hx - 3.2, hy - 7.8, -1, 6.5);
  px.part(); antler(hx + 3.2, hy - 7.8, 1, 6.5);
  px.part();
  px.stamp(s > 0 ? (p.blink ? blinkOf(FRONT_H) : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  px.dot(hx, hy - 8.6, ICE, 6.7, { fix: 3 });

  return { light: light.k > 0.05 ? light : null };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "rimeseer-front", BOX: { w: 64, h: 88, ox: 32, oy: 78 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "rimeseer-back", BOX: { w: 64, h: 88, ox: 32, oy: 78 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
