// ============ FIGURE: the King's Band's winds (fife, herald's trumpet, war-horn) ============
// Three players in one file, the variant's first part says which:
//   "fife" | "trumpet" | "horn"           then optional ":b" (the Heralds' crimson and gold) and/or ":gold"
//   (the finals' richer dress: more braid, a taller plume). No flag = the royal blue coat, gold braid,
//   white cross-belts of the crown's own men (fig-garrison.js navy).
//   fife     a small fife held out to the right at the mouth, two hands, fingers lifting in turn, the cheek puffs on the beat.
//   trumpet  a long straight herald's trumpet raised high before him; a square banner hangs from it (crown blue / gold, or
//            the heralds' crimson); the bell lifts on each beat and the banner swings after it.
//   horn     THE WAR HORN: a big man (broad, a fur mantle, an iron cap) at a huge curved bone-and-brass horn that rests on a
//            forked stand the HALL draws (the stand's fork is under the horn at about (23, -26) art px from his feet, facing
//            +x). The horn does NOT move (its mouthpiece, its belly on the stand): he breathes in on beat 1 (head back, chest
//            up), blows on beat 2 (mouth to the horn, cheeks out, the bell lifts a pixel or two).
// Clips: play (8 frames, 1200 ms, a loop: beat 1 on frame 0, beat 2 on frame 4), idle (6 frames, slow, at ease, the
// instrument lowered; the horn stays on its stand). Every pose is solved INSIDE draw from the role (the clips carry only
// the phase `t`), so one clip serves the three.
//   marks  bell  the instrument's mouth (trumpet bell, horn mouth) for a puff or a ring    mouth  the lips
import { mat, flat } from "./pix.js";
import { solve, ik, HUMAN, scaled } from "./rig.js";

export const BOX = { w: 72, h: 80, ox: 20, oy: 74 };
const KS = { fife: 1.12, trumpet: 1.12, horn: 1.22 };
export const BONES = scaled(HUMAN, 1.12, { shN: -1.4, shF: 2.2 });
const bonesOf = (role) => (role === "horn" ? scaled(HUMAN, KS.horn, { shN: -1.8, shF: 2.8 }) : BONES);

const SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), EYE = flat("#2a1c2c"), BOOT = mat("#3a2e2c"), SHINE = flat("#fff6e0", { emis: true });
const GOLD = mat("#d8b04a", { contrast: 1.2 }), CREAM = mat("#eee6d2", { contrast: 1.1 }), BONE = mat("#e4d8b8", { contrast: 1.15 }), BRASS = mat("#c8a448", { contrast: 1.25 });
const FUR = mat("#7a6a58"), IRON = mat("#8a94a6", { contrast: 1.2 }), WOOD = mat("#7a5a38"), BREECH = mat("#d8d4c4");
const LEG = { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, m: { m: SKIN, fix: 0 }, b: { m: HAIR, fix: 1 }, H: { m: HAIR }, h: { m: HAIR, bias: -1 }, E: { m: EYE } };
// the head, facing +x, a quarter turned (S skin, s a tone down, N nose, E eye, b brow, m mouth, H hair); the hat covers rows 0-2
const HEAD = ["....HHHHHH...", "..HHHHHHHHH..", ".HHHsssssss..", ".HHSSSSSSSSS.", ".HHSSESSSESN.", ".HhSSESSSESNN", ".HHSsSSSSSS..", "..hSSSSSSSS..", "...sSSSSmS...", "....sSSs....."];
const BLINK = HEAD.map((r, i) => (i === 4 ? ".HHSSSSSSSSN." : i === 5 ? ".HhSSeSSSeSNN" : r));

const LOOKS = new Map();
const lookOf = (variant) => {
  let L = LOOKS.get(variant);
  if (L) return L;
  const [role = "fife", ...fl] = (variant || "fife").split(":"), b = fl.includes("b"), gold = fl.includes("gold");
  const coat = b ? "#a0303a" : "#3a5474", hem = b ? "#762230" : "#28405c";
  L = {
    role, b, gold,
    COAT: mat(coat, { contrast: 1.1 }), HEM: mat(hem), SLEEVE: mat(b ? "#8c2832" : "#344c6a"), DARK: mat(hem),
    TRIM: GOLD, BANNER: mat(b ? "#a0303a" : "#3a5474", { contrast: 1.1 }), BDK: mat(hem),
    PLUME: mat(gold ? (b ? "#f0e4b0" : "#f4f0e4") : b ? "#e8d48a" : "#eee6d2"),
  };
  LOOKS.set(variant, L);
  return L;
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const beat = (t) => { const q = (t * 2) % 1; return Math.exp(-q * 4.5); };   // 1 on each beat, easing off through it
// the pose of the body for a role (the clips only carry t / idle)
const rolePose = (role, t, idle) => {
  const h = idle ? 0 : beat(t), br = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (idle ? 1 : 0)), second = !idle && t >= 0.5;
  if (role === "horn") {
    const inh = idle ? 0 : t < 0.5 ? Math.sin((t / 0.5) * Math.PI * 0.5) : 0;   // beat 1: breathing in, building
    const base = { lean: 0.1, twist: 0.2, drop: 0, rise: 0, hx: 0, hy: 0, fN: [-2.4, 0], fF: [3, 0] };
    if (idle) return { ...base, lean: 0.03, rx: -3, hx: -0.5, rise: 0.4 * br, hy: 0.6 };
    if (second) return { ...base, lean: 0.13, rx: 0.5 + h * 0.5, drop: 0.4 * (1 - h), rise: 0.2 };
    return { ...base, lean: 0.06 - inh * 0.05, rx: -1.8 - inh * 1.6, rise: 0.4 + inh * 1.4, hy: -inh * 0.8, hx: -0.4 * inh };
  }
  if (idle) return { lean: 0.02, rx: 0, rise: 0.5 * br, hy: 0.3 * br, fN: [-2, 0], fF: [2.4, 0], twist: 0.1 };
  return { lean: role === "trumpet" ? -0.03 - 0.025 * h : 0.03, rx: 0, drop: 0.7 * h, rise: 0.3 * (1 - h), hy: -0.3 * h, twist: 0.15, fN: [-2, 0], fF: [2.4, 0] };
};
const solveRole = (role, t, idle) => solve({ ...rolePose(role, t, idle) }, bonesOf(role));
// the horn's fixed line, art px from the feet: mouthpiece -> belly on the stand -> bell
const HORN = [[7.5, -33.2], [12.5, -31.2], [19, -27.4], [27, -25.2], [34, -27.3], [38.6, -33.4]];
// the head's lips for a skeleton: where the mouthpiece meets them
const lips = (sk) => [Math.round(sk.N[0]) + 2.8, Math.round(sk.N[1]) + 0.3];

const armTo = (sk, near, tgt) => {
  const s = near ? sk.sN : sk.sF, r = ik(s[0], s[1], tgt[0], tgt[1], sk.B.upper, sk.B.fore, 1);
  return { s, e: r.mid, h: r.end };
};

export const draw = (px, { sk: sk0, lag1: l1, lag2: l2, ph }, o = {}) => {
  const idle = !!sk0.p.idle, t = sk0.p.t ?? 0, L = lookOf(o.variant), role = L.role;
  let sk = solveRole(role, t, idle);
  if (role === "horn") {   // the horn is fixed: put the lips on its mouthpiece (blowing), or just short of it
    const want = idle ? [HORN[0][0] - 3.6, HORN[0][1] + 1.2] : [HORN[0][0] - (t < 0.5 ? 1.2 + 3 * (1 - Math.sin((t / 0.5) * Math.PI * 0.5)) * 0.6 : 0), HORN[0][1]];
    const m = lips(sk), P0 = rolePose(role, t, idle);
    sk = solve({ ...P0, rx: (P0.rx || 0) + want[0] - m[0], rise: (P0.rise || 0) - (want[1] - m[1]) }, bonesOf(role));
  }
  const lag = solveRole(role, t - 0.05, idle), lag2 = solveRole(role, t - 0.1, idle);
  const { P, C, N, hN, hF, kN, kF, anN, anF } = sk, B = sk.B;
  const h = idle ? 0 : beat(t), second = !idle && t >= 0.5;
  const vx = cl((C[0] - lag.C[0]) * 2, -2, 2);
  const big = role === "horn", W = big ? 1.22 : 1;
  const hx = Math.round(N[0]), hy = Math.round(N[1]), mouth = lips(sk);

  // ---- the instrument and the hands' places ----
  let hands, inst = null;
  if (role === "fife") {
    const st = idle ? [P[0] + 7, P[1] - 7.5] : mouth, th = idle ? -0.45 : -0.1 - 0.03 * h;
    inst = { st, th, len: idle ? 11 : 13 };
    const at = (u) => [st[0] + Math.cos(th) * inst.len * u, st[1] - Math.sin(th) * inst.len * u];
    hands = [at(idle ? 0.55 : 0.5), at(idle ? 0.3 : 0.78)];   // [near, far]
    inst.at = at;
  } else if (role === "trumpet") {
    const st = idle ? [P[0] + 6.5, P[1] - 5.8] : mouth, th = idle ? -0.95 : 0.55 + 0.1 * h + (second ? 0.02 : 0), len = 25;
    inst = { st, th, len };
    const at = (u) => [st[0] + Math.cos(th) * len * u, st[1] - Math.sin(th) * len * u];
    hands = idle ? [at(0.14), at(0.3)] : [at(0.3), at(0.14)];
    inst.at = at;
  } else {
    hands = idle ? [[P[0] + 6.2, P[1] - 8.2], [P[0] + 3.6, P[1] - 8.6]] : [[14.2, -29.6], [11, -31.8]];
  }
  const aN = armTo(sk, true, hands[0]), aF = armTo(sk, false, hands[1]);
  const bellLift = big ? (second ? 1.8 * h + 0.2 : 0) : 0;

  const sleeve = (a, z, bias) => {
    px.capsule(a.s[0], a.s[1], 2.1 * W, a.e[0], a.e[1], 2.0 * W, L.SLEEVE, z, { bias, cast: bias ? 0 : 2 });
    px.capsule(a.e[0], a.e[1], 2.0 * W, a.h[0], a.h[1], 1.7 * W, L.SLEEVE, z, { bias });
    px.ellipse(a.h[0], a.h[1], 1.7, 1.7, SKIN, z + 0.02, { bias });
    px.ellipse(a.h[0] - (a.h[0] - a.e[0]) * 0.18, a.h[1] - (a.h[1] - a.e[1]) * 0.18, 2.1 * W, 1.2, L.TRIM, z + 0.01);   // gold cuff
  };

  // far arm
  px.part(); sleeve(aF, 1, -1);

  // legs: boots under white breeches
  const leg = (hp, k, an, z, bi) => {
    px.part();
    px.capsule(hp[0], hp[1], 2.5 * W, k[0], k[1], 2.1 * W, BREECH, z, { bias: bi });
    px.capsule(k[0], k[1], 2.1 * W, an[0], an[1], 1.8 * W, BOOT, z, { bias: bi });
    px.ellipse(an[0] + 1.6, an[1] + 0.8, 3.1, 1.5, BOOT, z + 0.03, { bias: bi });
  };
  leg(hF, kF, anF, 2, -1); leg(hN, kN, anN, 3, 0);

  // the body: a long coat to the knee, belts, braid
  const hyc = P[1] + 5.2, hemF = P[0] + 5.8 * W - vx * 0.7, hemB = P[0] - 5.8 * W - vx * 1.1;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.8 * W, C[1] - 1.6], [C[0] + 5 * W, C[1] - 1.6], [C[0] + 6.1 * W, C[1] + 3.5], [P[0] + 5 * W, P[1] - 2], [hemF, hyc], [hemF - 2.4, hyc + 0.8], [P[0] - vx, hyc], [hemB + 2.6, hyc + 0.8], [hemB, hyc], [P[0] - 5 * W, P[1] - 2], [C[0] - 6.1 * W, C[1] + 3.5]], L.COAT, 4, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hyc - 0.6, -1, coat);
  px.line(hemB + 1, hyc - 0.6, hemF - 1, hyc - 0.6, L.TRIM, 4.2);
  if (!L.b) { px.line(C[0] - 3.4, C[1] - 0.8, P[0] + 3.4, P[1] - 2.6, CREAM, 4.25); px.line(C[0] + 3.6, C[1] - 0.8, P[0] - 3.4, P[1] - 2.6, CREAM, 4.25); }
  else { px.line(C[0] + 0.8, C[1] - 1, C[0] + 0.8, hyc - 1.5, L.TRIM, 4.25); px.line(C[0] - 3.2, C[1] + 1, C[0] + 4.6, C[1] + 1, L.TRIM, 4.25); }
  if (L.gold) { for (let i = 0; i < 3; i++) px.line(C[0] - 2.8, C[1] + 1 + i * 2.4, C[0] + 3.2, C[1] + 1 + i * 2.4, L.TRIM, 4.27); }
  px.poly([[P[0] - 5 * W, P[1] - 3.4], [P[0] + 5 * W, P[1] - 3.4], [P[0] + 5.1 * W, P[1] - 1.6], [P[0] - 5.1 * W, P[1] - 1.6]], mat("#4a3426"), 4.3, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 2, 1.8, BRASS, 4.32, { fix: 3 });
  // the collar, a gold-edged stand
  px.poly([[C[0] - 3.4, C[1] - 2.8], [C[0] + 3.6, C[1] - 2.8], [C[0] + 4.4, C[1] - 0.4], [C[0] - 4.4, C[1] - 0.4]], L.COAT, 4.35, { round: 0.8 });
  px.line(C[0] - 3.4, C[1] - 2.8, C[0] + 3.6, C[1] - 2.8, L.TRIM, 4.36);
  if (big) {   // the fur mantle over the shoulders, ragged at its hem
    px.part();
    px.poly([[C[0] - 6.8, C[1] - 2.4], [C[0] + 6.6, C[1] - 2.4], [C[0] + 7.6, C[1] + 3.8], [C[0] + 4.8, C[1] + 5.6], [C[0] + 2, C[1] + 4.4], [C[0] - 1, C[1] + 6], [C[0] - 3.8, C[1] + 4.4], [C[0] - 7.6, C[1] + 5]], FUR, 4.4, { round: 0.85, cast: 2 });
    px.dot(C[0] - 4, C[1] + 1, mat("#5a4c3c"), 4.41); px.dot(C[0] + 2.4, C[1] + 2.4, mat("#9a8a74"), 4.41); px.dot(C[0] + 5, C[1] + 0.2, mat("#5a4c3c"), 4.41);
  }

  // ---- the instrument, behind the near arm and in front of the face edge ----
  let bell = null;
  const tube = (st, th, len, r0, r1, M, z) => {
    const e = [st[0] + Math.cos(th) * len, st[1] - Math.sin(th) * len];
    px.capsule(st[0], st[1], r0, e[0], e[1], r1, M, z, { edge: true });
    return e;
  };
  if (role === "fife") {
    px.part();
    const { st, th, len, at } = inst, e = tube(st, th, len, 0.8, 1.0, WOOD, 7);
    px.line(...at(0.3), ...at(0.3), BRASS, 7.05); px.line(...at(0.95), ...at(0.95), BRASS, 7.05); px.dot(st[0], st[1], BRASS, 7.05);
    // fingers lifting in turn: three holes, one dot shows light as it lifts
    const f = Math.floor((t * 8) % 3);
    if (!idle) for (let i = 0; i < 3; i++) { const p = at(0.55 + 0.12 * i); px.dot(p[0], p[1] - (i === f ? 1.6 : 0.2), i === f ? SKIN : EYE, 7.3, { fix: i === f ? 0 : 3 }); }
    bell = e;
    if (!idle) { px.part(); const c = h; px.ellipse(hx + 2.4, hy - 1.2, 0.6 + 1.0 * c, 0.5 + 0.9 * c, SKIN, 6.6, { bias: 0 }); }
  } else if (role === "trumpet") {
    px.part();
    const { st, th, len, at } = inst;
    const e = tube(st, th, len * 0.9, 0.8, 1.1, BRASS, 7);
    // the bell: a flare out of the tube's end
    const bn = [st[0] + Math.cos(th) * len, st[1] - Math.sin(th) * len], nx = -Math.sin(th), ny = -Math.cos(th);
    px.poly([[e[0] + nx * 1.2, e[1] + ny * 1.2], [bn[0] + nx * 3.4, bn[1] + ny * 3.4], [bn[0] - nx * 3.4, bn[1] - ny * 3.4], [e[0] - nx * 1.2, e[1] - ny * 1.2]], BRASS, 7.02, { round: 0.6 });
    px.line(bn[0] + nx * 3.4, bn[1] + ny * 3.4, bn[0] - nx * 3.4, bn[1] - ny * 3.4, GOLD, 7.06);
    px.dot(...at(0.3), GOLD, 7.05); px.dot(...at(0.6), GOLD, 7.05);
    bell = bn;
    // the banner: a square of the livery on two cords from the tube, swinging after the bell
    const sw = cl((lag.hdN[1] - sk.hdN[1]) * 0.4 + (idle ? 0 : -h * 1.1), -2, 2), a = at(0.5), c = at(0.72);
    const bx = (a[0] + c[0]) / 2, by = (a[1] + c[1]) / 2 + 1.2, bw = 11, bh = 11;
    px.part();
    px.line(a[0], a[1], a[0] + sw * 0.2, a[1] + 2.2, GOLD, 6.9); px.line(c[0], c[1], c[0] + sw * 0.2, c[1] + 2.2, GOLD, 6.9);
    const BP = (x, y) => [x + sw * (y / bh) * 0.9, y];
    const q = [BP(bx - bw / 2, by + 2), BP(bx + bw / 2, by + 2), BP(bx + bw / 2 - 0.4, by + bh), BP(bx, by + bh - 2.2), BP(bx - bw / 2 + 0.4, by + bh)];
    px.poly(q.map(([x, y]) => [x, y]), L.BANNER, 6.95, { round: 0.5, cast: 2 });
    px.line(bx - bw / 2, by + 2, bx + bw / 2, by + 2, GOLD, 6.97);
    px.line(bx - bw / 2 + 0.6 + sw * 0.15, by + 3.6, bx + bw / 2 - 0.6 + sw * 0.15, by + 3.6, L.BDK, 6.97);
    // the crown's mark: a small gold crown on the field (a diamond on the heralds' crimson)
    const mx = bx + sw * 0.3, my = by + 6;
    px.rect(mx - 2, my, 4, 1.4, GOLD, 6.98, { fix: 3 }); px.dot(mx - 2, my - 1.2, GOLD, 6.98, { fix: 3 }); px.dot(mx, my - 1.6, GOLD, 6.98, { fix: 3 }); px.dot(mx + 1.6, my - 1.2, GOLD, 6.98, { fix: 3 });
  } else {
    // the war-horn: a fixed bone tube, bound in brass, its bell lifting a little on the blow
    px.part();
    const pts = HORN.map(([x, y], i) => [x, y - (i >= 3 ? bellLift * ((i - 2) / 3) ** 1.5 : 0)]);
    const rs = [0.9, 1.4, 2, 2.5, 3.1, 4.2];
    for (let i = 0; i < 5; i++) px.capsule(pts[i][0], pts[i][1], rs[i], pts[i + 1][0], pts[i + 1][1], rs[i + 1], BONE, 7, { edge: true });
    const m = pts[5], bw = rs[5];
    px.ellipse(m[0], m[1], 2.4, bw, BRASS, 7.06);   // the bell's rim, seen edge-on
    px.ellipse(m[0] + 0.6, m[1], 1.4, bw - 1.8, mat("#4a3a2a"), 7.08);   // the dark throat
    for (const i of [0, 2, 4]) { const a = pts[i], b2 = pts[i + 1], mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2; px.ellipse(mx, my, 1.3, rs[i] + 0.9, BRASS, 7.07); }
    px.dot(pts[0][0] - 1, pts[0][1], BRASS, 7.1);   // the brass mouthpiece
    // runes cut along the belly
    for (let i = 0; i < 3; i++) px.dot(pts[2][0] + 2 + i * 2.6, pts[2][1] + 3.2 - (i === 1 ? 1 : 0) + i * 0.3, mat("#8a7a58"), 7.12, { fix: 3 });
    bell = m;
  }

  // ---- the head, its hat and the lips on the mouthpiece ----
  px.part();
  px.stamp(HEAD, hx, hy, LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5, 7, 7], cast: 2 });
  if (role !== "fife" || idle) {}
  px.part();
  const by0 = hy - 5.6, cx = hx + 0.2;
  if (role === "fife") {   // a low shako: a tall cap with a brass plate and a pom
    px.poly([[cx - 5.2, by0], [cx + 5.6, by0], [cx + 5.2, by0 - 6.4], [cx - 5, by0 - 6.4]], L.COAT, 6.4, { round: 0.85 });
    px.line(cx - 5, by0 - 0.6, cx + 5.4, by0 - 0.6, L.TRIM, 6.42); px.rect(cx + 0.4, by0 - 4.6, 2.4, 2.4, BRASS, 6.45, { fix: 3 });
    px.poly([[cx + 5.6, by0], [cx + 8.2, by0 + 0.4], [cx + 5.6, by0 + 1.1]], L.DARK, 6.41);   // the peak
    px.ellipse(cx - 0.6, by0 - 7.8, 1.5, 2.1, L.PLUME, 6.5);
    if (L.gold) px.capsule(cx - 0.6, by0 - 8, 1, cx - 3.4 - vx * 0.5, by0 - 12, 1.2, L.PLUME, 6.5);
  } else if (role === "trumpet") {   // a herald's soft cap with a long streaming feather
    px.poly([[cx - 5.6, by0 + 0.4], [cx + 5.8, by0 + 0.4], [cx + 5, by0 - 3.4], [cx + 1, by0 - 5], [cx - 4, by0 - 3.6]], L.COAT, 6.4, { round: 0.9 });
    px.line(cx - 5.4, by0 - 0.2, cx + 5.6, by0 - 0.2, L.TRIM, 6.44);
    const fl = vx * 1.6 + (idle ? 0 : h * 0.8);
    px.capsule(cx - 2, by0 - 3.6, 1.1, cx - 6 - fl, by0 - 7.6, 0.9, L.PLUME, 6.5);
    px.capsule(cx - 6 - fl, by0 - 7.6, 0.9, cx - 10 - fl * 1.6, by0 - 5.8, 0.4, L.PLUME, 6.5);
    if (L.gold) px.capsule(cx - 1, by0 - 4, 1, cx - 4 - fl, by0 - 11, 0.9, L.TRIM, 6.5);
  } else {   // an iron cap with a nasal bar and a small horn each side
    px.poly([[cx - 5.6, by0 + 0.6], [cx + 5.8, by0 + 0.6], [cx + 5, by0 - 3.6], [cx + 1, by0 - 6], [cx - 4, by0 - 4]], IRON, 6.4, { round: 0.9 });
    px.line(cx - 5.4, by0 - 0.2, cx + 5.6, by0 - 0.2, BRASS, 6.44);
    px.line(cx + 4.4, by0 + 0.4, cx + 4.6, by0 + 3.6, IRON, 6.45);
    px.capsule(cx + 1, by0 - 4.4, 1.3, cx + 3.2, by0 - 8.4, 0.5, BONE, 6.5, { edge: true });
    px.capsule(cx - 3, by0 - 3.4, 1.1, cx - 6.4, by0 - 6.6, 0.4, BONE, 6.3, { edge: true });
    if (L.gold) px.capsule(cx - 0.4, by0 - 5.6, 1, cx - 3 - vx, by0 - 10.6, 1.1, L.PLUME, 6.5);
  }

  // the near arm, in front of it all
  px.part(); sleeve(aN, 8, 0);
  px.part();
  if (big) px.ellipse(aN.s[0] - 0.2, aN.s[1] - 0.6, 3.6, 3, FUR, 8.1, { cast: 2 });
  else px.ellipse(aN.s[0] - 0.2, aN.s[1] - 0.4, 3, 2.5, L.TRIM, 8.1);   // an epaulette

  return { marks: { bell: bell || mouth, mouth }, hand: aN.h };
};

const play = (ph) => ({ t: ph });
export const CLIPS = {
  play: { n: 8, ms: 1200, loop: true, lag: 0.05, pose: (ph) => ({ t: ph, idle: 0 }) },
  idle: { n: 6, ms: 3000, loop: true, lag: 0.05, pose: (ph) => ({ t: ph, idle: 1 }) },
};
