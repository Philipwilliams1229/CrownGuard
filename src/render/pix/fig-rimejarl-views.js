// ============ VIEWS: the Rime Jarl on foot seen from the FRONT and from BEHIND ============
// fig-rimejarl.js (ring mail under a white bear mantle, the sea-teal cape, the horned iron helm banded in
// silver and set with frost-blue stones, the white-blond beard in two braids, the two-handed Dane axe furred
// with rime) walking toward the camera (FRONT, s = +1) and away from it (BACK, s = -1), unmirrored, sun upper
// left. FRONT: the axe stands upright at his RIGHT side (screen LEFT), both fists on the haft, the blade
// above the shoulder. BACK: the axe is hidden by his body; only the butt of the haft shows below the right fist
// at the hip, angled forward and down. The teal cape fills his back. A slow lord's plod, a heavy roll.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, axeAngle } from "./fig-rimejarl.js";
import { carry, damp } from "./carry.js";

const SKIN = mat("#e4ae8a"), TEAL = mat("#2c4e5a"), WOOL = mat("#4a5a60"), LEATHER = mat("#4a3426");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#ece8e0"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#4e5560");
const STEEL = mat("#d8e4ec", { contrast: 1.3 }), SILVER = mat("#c8d0d8", { contrast: 1.3 }), WOOD = mat("#6a4a2e"), BLOND = mat("#ece2c4"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040");
const EYE = flat("#2a3a48"), RIME = flat("#f4fcff"), STONE = mat("#7cc8ec", { contrast: 1.3 });
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, B: { m: SILVER, fix: 3 }, H: { m: BLOND, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: BLOND, fix: 2 },
};
// FRONT: the horned helm, silver band, nasal bar, two cold eyes, the moustache and the beard in two braids. 13 wide, centre col 6.
const FRONT_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMmMMMMMmMM.",
  ".BBBBBBBBBBB.",
  ".HMSSSDSSSMH.",
  ".HMSESDSESMH.",
  ".HMSESDSESMH.",
  ".HHSSSDSSSHH.",
  ".HHRSSSSSRHH.",
  "..HRRRRRRRH..",
  "..HRRRRRRRH..",
  "...HRRRRRH...",
  "....RR.RR....",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
// BACK: the dome of the helm with its ridge and rivets, the silver band, the hair falling to the shoulders.
const BACK_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMmMMMMMmMM.",
  ".BBBBBBBBBBB.",
  ".MMMMMDMMMMM.",
  ".MmMMMDMMMmM.",
  ".HMMMMDMMMMH.",
  ".HHHHHHHHHHH.",
  ".HHHHHRHHHHH.",
  "..HHHHHHHHH..",
  "..HHHRHHHHH..",
  "...HHHHHHH...",
  "....HHHHH....",
];

const FWD = 0.5, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F) => {
  const rs = -s, ls = s;                                        // screen side of his right (axe) and left
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 1.1 * Math.sin(t * TAU);               // a heavy roll over the planted foot
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1] + 1, hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.6), g = p.glow || 0;
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.3, -2.5, 2.5);
  const c0 = chestY - 4;
  const cs = cl(-vx * 1.4 - vx2 * 1, -3, 3);
  const horn = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2.6], [x0 + dir * 4, y0 - 1.6, 2.2], [x0 + dir * 7, y0 - 5, 1.6], [x0 + dir * 8.2, y0 - 9.4, 1], [x0 + dir * 7.4, y0 - 13, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };

  // ---- the cape: in FRONT behind him (teal wings past the arms, a fur hem); from BEHIND it fills his back, over the mail
  {
    const hem = hipY + 9, cz = s > 0 ? 0.5 : 5, w = s > 0 ? 12.6 : 9.6;
    px.part(); const cid = px._pid;
    px.poly([[sx - 7, c0 - 0.6], [sx + 7, c0 - 0.6], [sx + (s > 0 ? 10.6 : 9.6), c0 + 6], [hx + w + cs, hem - 2], [hx + w + 0.4 + cs, hem], [hx - w + cs, hem], [hx - w - 0.4 + cs, hem - 2], [sx - (s > 0 ? 10.6 : 9.6), c0 + 6]], TEAL, cz, { round: 0.85, cast: 1 });
    px.toneLine(sx - 4, c0 + 6, hx - 6 + cs, hem - 1, -1, cid);
    px.toneLine(sx + 4, c0 + 6, hx + 6 + cs, hem - 1, -1, cid);
    if (s < 0) px.toneLine(sx, c0 + 1, hx + cs * 0.5, hem - 2, -1, cid);
    px.poly([[hx - w - 0.2 + cs, hem - 2.2], [hx + w + 0.2 + cs, hem - 2.2], [hx + w + 0.4 + cs, hem], [hx - w + cs, hem]], FURW, cz + 0.02, { round: 0.9 });
  }

  // ---- legs: wool wraps, greaves, fur cuffs, big boots; the stepping foot comes toward us (front) / away (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1, fx = hx + side * 4.4, fy = -2 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 3.2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.8, (hp[1] + fy) / 2 - lift * 0.5], w0 = [(kn[0] + fx) / 2, (kn[1] + fy) / 2];
    px.part();
    px.capsule(hp[0], hp[1], 3.4, kn[0], kn[1], 2.8, WOOL, z, { bias: b });
    px.capsule(kn[0], kn[1], 2.7, fx, fy, 2.3, WOOL, z, { bias: b });
    px.capsule(w0[0], w0[1], 2.6, fx, fy, 2.4, LEATHER, z + 0.03, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.5, 3.1, 1.8, LEATHER, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 1.2, 2.7, 1.6, LEATHER, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 3, 2.4, 2.1 * cl(lift / 2.6, 0.3, 1), LEATHER, z + 0.45, { bias: -2 });
    }
    px.capsule(w0[0] - 2.6, w0[1] - 0.2, 1.3, w0[0] + 2.6, w0[1] + 0.2, 1.3, FURW, z + 0.05, { bias: b });
  }

  // ---- the hauberk to the knee: ring mail, a leather belt with a silver buckle
  const hem = hipY + 5.6, hs = -vx * 0.7 - vx2 * 0.5;
  px.part(); const mId = px._pid;
  px.poly([[sx - 6.6, c0], [sx + 6.6, c0], [sx + 7.2, c0 + 5], [hx + 6.8, hipY - 2.4], [hx + 7.6 + hs, hem], [hx - 7.6 + hs, hem], [hx - 6.8, hipY - 2.4], [sx - 7.2, c0 + 5]], MAIL, 4, { round: 0.92, ny: -0.1, cast: 1 });
  px.toneLine(hx + 0.4, hipY + 0.2, hx + 0.2 + hs, hem - 0.6, -1, mId);
  for (let yy = c0 + 5; yy < hem - 1; yy += 2.8) for (let xx = -5; xx <= 5; xx += 3.2) { const sh = ((yy - c0) / 2.8 | 0) % 2 ? 1.6 : 0; px.dot(hx + xx + sh, yy, MAIL_D, 4.08, { noLine: true }); }
  px.poly([[hx - 6.8, hipY - 3.6], [hx + 6.8, hipY - 3.6], [hx + 6.9, hipY - 1.2], [hx - 6.8, hipY - 1.2]], LEATHER, 4.2, { round: 0.9 });
  if (s > 0) px.rect(hx - 1.5, hipY - 3.4, 3, 2.4, SILVER, 4.25, { fix: 3 });
  // ---- the white bear mantle, deep and shaggy
  px.part();
  const mz = s > 0 ? 4.4 : 5.2;
  px.ellipse(sx, c0 + 2.4, 12, 5, FURW, mz, { cast: 1 });
  for (const x of [-10, -7.4, -4.6, -1.8, 1.8, 4.6, 7.4, 10]) px.dot(sx + x, c0 + 6.6 + (Math.abs(x) > 8 ? -1 : 0) + ((x * 2) & 1), FURW, mz);
  for (const x of [-6, -2, 2, 6]) px.dot(sx + x, c0 + 8.4 + (x & 1), FURW, mz);

  // ---- the axe and his arms
  let handR;
  const armTo = (side, sh, hd, el, z, m, cast) => {
    px.capsule(sh[0], sh[1], 3, el[0], el[1], 2.8, m, z, { cast });
    px.capsule(el[0], el[1], 2.8, hd[0], hd[1], 2.4, m, z, { cast });
  };
  // ONE axe pose (carry.js): the side walk's angle (axeAngle: forearm + GRIP), damped to its mean, raised ~30 degrees forward at the
  // side view's chest-high hand; FRONT and BACK are projections of it. The head is never foreshortened (orc pilot's A()).
  const hd0 = [sx + rs * 12.4, sk.hdN[1] + 0.6], L = 26;
  const C = carry(damp(axeAngle(sk), 0.53), s, { rs, hand: hd0, len: L, butt: 6, K: 0.5, splay: 0.3, zTop: 8.2 });
  const zT = C.zTip, zB = C.zButt, tipAt = C.at(L, 0), pr = [-C.dir[1], C.dir[0]];
  const A = (f, o) => (f < L - 6.5 ? C.at(f, rs * o) : [tipAt[0] + C.dir[0] * (f - L) + pr[0] * rs * o, tipAt[1] + C.dir[1] * (f - L) + pr[1] * rs * o]);
  const drawAxe = () => {
    const k = 1.55;
    px.part(); px.tag("weapon");
    px.capsule(...A(-6, 0), 1, ...A(0, 0), 1, WOOD, zB, { edge: s > 0 });
    px.capsule(...A(0, 0), 1, ...A(L + 1, 0), 1, WOOD, zT, { edge: s > 0 });
    px.part();
    px.poly([A(L - 2.2 * k, 0.4), A(L - 3.6 * k, 3.4 * k), A(L - 1 * k, 4.8 * k), A(L + 1.8 * k, 3.4 * k), A(L + 1.8 * k, 0.4)], STEEL, zT + 0.02, { fix: 2 });
    px.poly([A(L - 3.6 * k, 3.4 * k), A(L - 1 * k, 4.8 * k), A(L + 1.8 * k, 3.4 * k), A(L + 1 * k, 2.6 * k), A(L - 1 * k, 3.4 * k)], STEEL, zT + 0.03, { fix: 4 });
    px.poly([A(L - 1.6, -0.4), A(L + 1.2, -0.4), A(L + 1.6, -4.6)], IRON_D, zT + 0.01, { fix: 1 });
    px.poly([A(L - 2.8, -0.8), A(L + 2, -0.8), A(L + 2, 1), A(L - 2.8, 1)], IRON_D, zT + 0.04, { fix: 1 });
    if (s > 0) for (const [f, o] of [[L - 4, 4.6], [L - 1.6, 5.4], [L + 1.4, 4.2]]) px.dot(...A(f, o), RIME, zT + 0.06, { noLine: true });
    px.tag(null);
  };
  if (s > 0) {
    drawAxe();
    const hr = hd0, hl = A(-8.5, 0);
    px.part(); px.tag("nearArm");
    armTo(rs, [sx + rs * 8.6, c0 + 4], hr, [sx + rs * 13, c0 + 12], 7.9, MAIL, 2);
    px.tag(null);
    px.part(); px.ellipse(hr[0], hr[1], 2.6, 2.6, SKIN, 8.3);
    px.part();
    armTo(ls, [sx + ls * 8.6, c0 + 4], hl, [sx + ls * 3.4, c0 + 15], 7.9, MAIL, 2);
    const cu = mix([sx + ls * 3.4, c0 + 15], hl, 0.7); px.capsule(cu[0], cu[1], 2.6, hl[0], hl[1], 2.5, FURW, 7.95);
    px.part(); px.ellipse(hl[0], hl[1], 2.4, 2.4, SKIN, 8.3);
    handR = hr;
  } else {
    // from behind (the BACK stack): both arms hang at his sides, over the mail and under the mantle and cape; the axe is the same
    // pose, forward of him: the haft rises past his shoulder at z 1.0 (the arm and cape hide it to the shoulder)
    const hd = hd0, el = [sx + rs * 12.8, c0 + 12], shd = [sx + rs * 9, c0 + 4];
    drawAxe();
    px.part(); px.tag("nearArm");
    armTo(rs, shd, hd, el, 4.3, MAIL, 0);
    const cu = mix(el, hd, 0.7); px.capsule(cu[0], cu[1], 2.6, hd[0], hd[1], 2.5, FURW, 4.35);
    px.tag(null);
    px.part(); px.ellipse(hd[0], hd[1] + 0.8, 1.6, 1.6, SKIN, 3.6);
    const hl = [sx + ls * 11.2, hipY - 2.4 - Math.max(0, p.aF[0] - 0.7) * 2], elL = [sx + ls * 11.8, c0 + 12];
    px.part();
    armTo(ls, [sx + ls * 9, c0 + 4], hl, elL, 4.3, MAIL, 0);
    px.part(); px.ellipse(hl[0], hl[1] + 0.8, 1.6, 1.6, SKIN, 3.6);
    handR = hd;
  }

  // ---- the head: two braids in front (or the hair hanging behind), the far horn, the helm, the near horn
  const bs = -vx * 1.2 - vx2 * 0.8, by = -vy * 0.3;
  if (s > 0) {
    for (const dx of [-2.4, 2.4]) {
      const b0 = [hx + dx, hy + 4.4], b1 = [b0[0] + dx * 0.15 + bs * 0.3, b0[1] + 5 + by], b2 = [b1[0] + bs * 0.6, b1[1] + 5];
      px.part();
      px.capsule(b0[0], b0[1], 1.9, b1[0], b1[1], 1.7, BLOND, 6.2); px.capsule(b1[0], b1[1], 1.7, b2[0], b2[1], 1.3, BLOND, 6.2);
      px.dot(b2[0], b2[1] + 1, BRASS, 6.3, { fix: 3 });
    }
  }
  px.part(); horn(hx - 4, hy - 8.4, -1, 6.5);
  px.part(); horn(hx + 4, hy - 8.4, 1, 6.5);
  px.part();
  px.stamp(s > 0 ? (p.blink ? blinkOf(FRONT_H) : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  const hot = g > 0.6;
  px.part();
  if (s > 0) for (const x of [-3.2, 0, 3.2]) px.dot(hx + x, hy - 5.4, STONE, 6.7, { fix: 3 });
  else px.dot(hx, hy - 5.4, STONE, 6.7, { fix: 3 });
  px.dot(hx, hy - 10, STONE, 6.7, { fix: 3 });

  const k = cl(g, 0, 1.4);
  return { light: k > 0.05 ? { x: hx, y: hy - 5, r: 18 + 24 * cl(k, 0, 1), col: "#9ad8f2", k: Math.min(k, 0.45) } : null, hand: handR };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "rimejarl-front", BOX: { w: 84, h: 124, ox: 42, oy: 114 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "rimejarl-back", BOX: { w: 84, h: 124, ox: 42, oy: 114 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
