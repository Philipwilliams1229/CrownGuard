// ============ FIGURE: the Iron Kingdom's crossbowman ============
// Look "b" of the levy's family (the owner's pick for the levy: more gear, wear, one stand-out
// shape). An oxblood hood under an iron kettle, a quilted gambeson with a dagged skirt, wrist
// guards, a belt pouch and a bolt box on the back hip, and the heavy steel-pronged arbalest with
// its stirrup ring: that prod is the stand-out shape. Facing +x.
// Clips: `idle` (the arbalest carried at the ready, nose up), `walk` (8 frames, same carry),
// `shoot` (raise to the cheek, aim, LOOSE at `hit`, the prod snaps and the stock kicks, lower the
// nose, crank the string back, seat the next bolt). `attack` is the same clip.
import { mat, flat } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, clamp, ik } from "./rig.js";
import { stampFace } from "./bowlayers.js";

export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6 });
// the layer rules (bowlayers.js, the bows'), checked at every aim by scripts/pix-audit.mjs: the arbalest (stock, prod,
// string, bolt) is never drawn across the face, and no arm or hand covers an eye. The face sits above the stock and
// below the arms; the eyes sit above everything.
export const MUST = [["stock", "notOver", "face"], ["prod", "notOver", "face"], ["string", "notOver", "face"], ["bolt", "notOver", "face"], ["farHand", "notOver", "eyes"], ["nearArm", "notOver", "eyes"], ["nearHand", "notOver", "eyes"]];
export const BOX = { w: 72, h: 80, ox: 20, oy: 74 };   // taller: the stock rises well above the head at a steep upward aim
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e0b088"), EYE = flat("#2a1c2c"), LIP = flat("#a8685a"), BROW = mat("#4a3426");
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#a8966e"), PADK = mat("#7e6e4c"), LEATHER = mat("#5a3c28"), WOOD = mat("#7a5a38"), WOODK = mat("#4e3820");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#4a4c58", { floor: 1 }), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 });
const CORD = flat("#e8e0c4"), FLETCH = flat("#f0ead8"), BOLT = mat("#8a6a40");

// the kettle over an oxblood hood (c); S skin, N nose, b brow, E eye (e shut), l lips, T chin strap
const KETTLE = [
  "......MMMMM.....",
  "....MMMMMMMMM...",
  "...MMWWMMMMMMM..",
  "..MMMWMMMMMMMMM.",
  ".MMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "..ccsSSbbSbbS...",
  "..ccsSSSESSSEN..",
  "..ccsSSSSSSSSN..",
  "..cTTsSSzzSSS...",
  "..ccTsSSllzS....",
  "...ccsSSSSS.....",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, c: { m: OX }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, z: { m: SKIN, fix: 0 }, T: { m: LEATHER },
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
// ---- the aim (art/briefs/aim-contract.md): the variant may end "@<deg>" (+ is down the screen, facing +x).
// In the shoot clip (and the hold before the loose, `p.aimW` 1) the arbalest and BOTH arms that hold it
// turn rigidly about the rear (near) shoulder; every other clip ignores it. No "@": today's pixels.
const aimOf = (v) => { const a = parseFloat(String(v || "").split("@")[1]); return Number.isFinite(a) ? (a * Math.PI) / 180 : 0; };
const rotAbout = (c, pt, th) => { const k = Math.cos(th), n = Math.sin(th), dx = pt[0] - c[0], dy = pt[1] - c[1]; return [c[0] + dx * k - dy * n, c[1] + dx * n + dy * k]; };
const STOCK_L = 25;   // the arbalest's length from butt to nose (draw's L)
const leg = (px, h, k, an, z, b) => {
  px.tag(b < 0 ? "legFar" : "legNear"); px.part();
  px.capsule(h[0], h[1], 2.3, k[0], k[1], 2.0, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 1.9, an[0], an[1] - 2.5, 1.6, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.45 + an[0] * 0.55, k[1] * 0.45 + an[1] * 0.55, 2.0, an[0], an[1], 1.8, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.2, 2.8, 1.5, BOOT, z + 0.03, { bias: b, floor: 1 });
  px.rect(an[0] - 1.6, an[1] - 5.2, 3.6, 1, LEATHER, z + 0.04, { fix: 2, noLine: true });   // the turned boot cuff
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const { p, P, C, N, sN, sF, hN, hF, kN, kF, anN, anF } = sk;
  let { eN, eF, hdN, hdF } = sk;
  const th = aimOf(o.variant) * (p.aimW || 0);
  if (th) {   // both hands turn about the rear shoulder with the stock; the elbows fold the same way
    hdN = rotAbout(sN, hdN, th); hdF = rotAbout(sN, hdF, th);
    eN = ik(sN[0], sN[1], hdN[0], hdN[1], BONES.upper, BONES.fore, 1).mid; eF = ik(sF[0], sF[1], hdF[0], hdF[1], BONES.upper, BONES.fore, 1).mid;
    hdF = ik(sF[0], sF[1], hdF[0], hdF[1], BONES.upper, BONES.fore, 1).end;
  }
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm in its quilted sleeve, behind the body
  px.tag("farArm"); px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.0, PADK, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.7, PADK, 1, { bias: -1 });
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the bolt box on the back hip, fletchings standing out of it
  px.tag("torso"); px.part();
  const bx = P[0] - 7.4 - vx * 0.8, by = P[1] - 0.6;
  px.poly([[bx - 2.4, by - 3], [bx + 2.4, by - 3], [bx + 2.8, by + 3.6], [bx - 2.8, by + 3.6]], LEATHER, 3.5, { round: 0.8, cast: 1 });
  px.rect(bx - 2.4, by - 0.6, 4.8, 0.9, BRASS, 3.52, { noLine: true });
  for (const [dx, h] of [[-1.5, 3.4], [0.2, 4.6], [1.7, 3.8]]) { px.line(bx + dx, by - 3, bx + dx - vx * 0.3, by - 3 - h, BOLT, 3.45, { noLine: true }); px.dot(bx + dx - vx * 0.3, by - 3 - h, FLETCH, 3.46, { fix: 3 }); }

  // the gambeson: quilted padding to the hip, a dagged skirt, stitched in rows
  const hemY = P[1] + 6.0, hemB = P[0] - 5.6 - vx * 1.0, hemF = P[0] + 5.6 - vx * 0.6;
  px.part(); const jk = px._pid;
  const hem = [[hemF, hemY - 0.4], [hemF - 2.2, hemY + 1.8], [hemF - 4.4, hemY - 0.2], [hemF - 6.6, hemY + 1.8], [hemF - 8.8, hemY - 0.2], [hemB + 2.2, hemY + 1.8], [hemB, hemY - 0.4]];
  px.poly([[C[0] - 4.8, C[1] - 2.4], [C[0] + 4.9, C[1] - 2.4], [C[0] + 5.6, C[1] + 3], [P[0] + 4.6, P[1] - 1], ...hem, [P[0] - 4.8, P[1] - 1], [C[0] - 5.8, C[1] + 3]], PAD, 4, { round: 0.92, cast: 2 });
  px.toneLine(C[0] - 1, C[1] + 1, P[0] - 1, P[1], -1, jk);
  px.toneLine(P[0] + 2, P[1] - 3, P[0] + 1.6 - vx * 0.5, hemY - 1.5, -1, jk);
  for (let i = 0; i < 4; i++) { const y = C[1] + 0.6 + i * 2.6; px.line(C[0] - 3.6 + i * 0.1, y, C[0] + 4.2 + i * 0.2, y, PADK, 4.04, { noLine: true }); }
  px.line(hemB + 0.8, hemY - 1.8, hemF - 0.8, hemY - 1.8, PADK, 4.04, { noLine: true });
  // a patch sewn over a mend, and the tower on the breast
  px.part(); px.rect(C[0] - 3.8, C[1] + 5.2, 2.6, 2.6, OXK, 4.08, { fix: 1, noLine: true });
  px.part(); const t0 = [C[0] + 1.4, C[1] + 2.0]; px.rect(t0[0], t0[1], 2, 3, GREY, 4.1, { fix: 3 }); px.dot(t0[0], t0[1] - 1, GREY, 4.1, { fix: 3 }); px.dot(t0[0] + 1, t0[1] - 1, GREY, 4.1, { fix: 3 });
  // the belt, its buckle, a pouch and a dagger
  px.part();
  px.poly([[P[0] - 4.8, P[1] - 4.4], [P[0] + 4.6, P[1] - 4.4], [P[0] + 4.7, P[1] - 2.6], [P[0] - 4.9, P[1] - 2.6]], LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.4, P[1] - 4.4, 2, 2, BRASS, 4.06, { fix: 3 });
  px.part(); px.rect(P[0] + 3.2, P[1] - 2.8, 3.4, 3.6, LEATHER, 4.1, { cast: 1 }); px.dot(P[0] + 4.9, P[1] - 2.2, BRASS, 4.11, { fix: 3 });
  px.part(); px.line(P[0] - 1.6, P[1] - 2.4, P[0] - 3.4 - vx * 0.5, P[1] + 3.4, IRON, 4.1, { noLine: true }); px.dot(P[0] - 1.4, P[1] - 2.6, BRASS, 4.12, { fix: 3 });
  // the hood falls on the shoulders over the gambeson's collar
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 3.2], [C[0] + 5.4, C[1] - 3.2], [C[0] + 6, C[1] + 0.8], [C[0] + 1.6, C[1] + 3.2], [C[0] - 2.4, C[1] + 2.4], [C[0] - 6, C[1] + 1]], OX, 5, { round: 0.9, cast: 1 });

  // the head
  px.part();
  stampFace(px, p.blink ? blink(KETTLE) : KETTLE, hx, hy, LEG, 6, th < -0.6 ? 7.7 : 7.15, { ax: 7, ay: 12, cast: 2, ball: [8, 6, 8, 7] }, "SsNbElzTe", "E", 7.9);   // the face over the stock, under the arms (over them too when the shot is steeply up: the arms rise past the head); the eyes over all
  px.tag("head");
  px.dot(hx + 2, hy - 10.6, BRASS, 6.1, { fix: 3 }); px.dot(hx + 3, hy - 8, STEELB, 6.1, { fix: 4 });

  // ---- the arbalest: a wooden stock under the near hand, the steel prod across its nose
  const ca = (p.ca ?? 0.5) - th, u = [Math.cos(ca), -Math.sin(ca)], w = [-Math.sin(ca), -Math.cos(ca)], gb = p.gb ?? 8, L = 25;
  const butt = [hdN[0] - u[0] * gb, hdN[1] - u[1] * gb], tip = [butt[0] + u[0] * L, butt[1] + u[1] * L];
  const at = (a, b) => [butt[0] + u[0] * a + w[0] * b, butt[1] + u[1] * a + w[1] * b];
  const z = 7;
  px.tag("stock"); px.part();
  px.capsule(...at(0, 0), 1.9, ...at(7, 0), 1.5, WOOD, z, { edge: true });           // the butt and the grip
  px.capsule(...at(7, 0), 1.3, ...at(L, 0), 1.0, WOOD, z, { edge: true });           // the tiller
  px.capsule(...at(L - 4, 0.2), 1.2, ...at(L - 3, 0.2), 1.2, BRASS, z + 0.02);         // the nose cap
  px.capsule(...at(11, 0), 1.35, ...at(13.6, 0), 1.35, IRON, z + 0.03);               // the trigger-box band
  px.tag("prod"); px.part();
  const st = p.str ?? 1, flex = 2.6 * st, ends = [-1, 1].map((s) => at(L - 1 - flex, s * 8.4));
  // the prod, a bowed steel lath, thicker at the middle; the stirrup ring forward of it
  px.capsule(...at(L - 1, 0), 1.5, ...at(L - 1 - flex * 0.5, 4.2), 1.2, IRON, z + 0.05, { edge: true });
  px.capsule(...at(L - 1 - flex * 0.5, 4.2), 1.2, ...ends[1], 0.8, IRON, z + 0.05, { edge: true });
  px.capsule(...at(L - 1, 0), 1.5, ...at(L - 1 - flex * 0.5, -4.2), 1.2, IRON, z + 0.05, { edge: true });
  px.capsule(...at(L - 1 - flex * 0.5, -4.2), 1.2, ...ends[0], 0.8, IRON, z + 0.05, { edge: true });
  px.dot(...ends[0], STEELB, z + 0.07, { fix: 3 }); px.dot(...ends[1], STEELB, z + 0.07, { fix: 3 });
  const ring = at(L + 1.4, 0); px.ellipse(ring[0], ring[1], 1.7, 2.4, IRONK, z + 0.04, { noLine: true });
  // the string: drawn back to the nut when cocked, straight across the prod's ends when loosed
  const nut = at(L - 8 + (1 - st) * 7, 0);
  px.tag("string");
  px.line(...ends[0], ...(st > 0.35 ? nut : at(L - 1, 0)), CORD, z + 0.06, { unlit: true });
  px.line(...ends[1], ...(st > 0.35 ? nut : at(L - 1, 0)), CORD, z + 0.06, { unlit: true });
  // the bolt laid in its groove with a steel head past the nose
  if ((p.bolt ?? 1) > 0.5) {
    px.tag("bolt"); px.part();
    px.line(...at(L - 9, 1.5), ...at(L + 2, 1.5), BOLT, z + 0.1, { noLine: true });
    px.poly([at(L + 2, 1.5), at(L + 0.2, 2.5), at(L + 0.2, 0.5)], STEELB, z + 0.11, { noLine: true });
    px.dot(...at(L - 9, 1.5), FLETCH, z + 0.11, { fix: 3 });
  }

  // the far hand under the tiller (the arm runs behind the body)
  px.tag("farHand"); px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.7, LEATHER, z + 0.2, { bias: -1 });
  // the near arm: a quilted sleeve, a leather wrist guard, the fist on the grip, the trigger finger
  const zn = z + 0.4;
  px.tag("nearArm"); px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.3, eN[0], eN[1], 2.1, PAD, zn, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.8, PAD, zn, { cast: 2 });
  px.capsule(eN[0] * 0.3 + hdN[0] * 0.7, eN[1] * 0.3 + hdN[1] * 0.7, 1.9, eN[0] * 0.14 + hdN[0] * 0.86, eN[1] * 0.14 + hdN[1] * 0.86, 1.9, LEATHER, zn + 0.02);
  px.tag("nearHand"); px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.8, LEATHER, zn + 0.2);
  px.tag(null);
  const muzzle = at(L + 2, 1.5);
  return { C, hand: hdN, muzzle, flash: p.flash || 0, ca, th, marks: { muzzle, hand: hdN } };
};

// the loose: the string's snap and a thin streak off the nose
export const fx = (px, { ph }, info, clip) => {
  if (!info.muzzle || !(info.flash > 0.1)) return;
  const [x, y] = info.muzzle, k = info.flash, NL = { noLine: true }, F = flat("#fff3d2", { emis: true, line: "#c8ccd8" });
  const c = Math.cos(info.th || 0), n = Math.sin(info.th || 0);   // the streak runs along the aim
  px.line(x + c, y + n, x + c * (5 + 5 * k), y + n * (5 + 5 * k), F, 20, NL);
  px.dot(x + 1, y - 1, F, 20.1, NL);
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), 0]; };
const STAND = { fN: [-2.8, 0], fF: [3.4, 0] };
// b.n: the trigger hand, b.f: the fore hand, b.ca: the stock's rise (rad), b.str: the string, b.bolt
const hold = (b) => { const p = { ...STAND, ...b }, s = solve(p, BONES); p.aN = aim(s.sN, b.n); p.aF = aim(s.sF, b.f); return p; };
const READY = { aimW: 0, n: [9.4, -26.5], f: [16.5, -30.5], ca: 0.66, gb: 8, str: 1, bolt: 1, twist: 0.3, lean: 0.03, flash: 0, blink: 0 };
const AIMPOSE = { aimW: 1, n: [10, -33.5], f: [20, -35.2], ca: 0.03, gb: 8.5, str: 1, bolt: 1, twist: 0.55, lean: 0.02, hx: 1.2, hy: 0.4, rx: -0.2, flash: 0 };

export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...READY, rise: 0.8 * b, n: [9.4, -26.5 + 0.4 * b], f: [16.5, -30.5 + 0.3 * b], ca: 0.66 + 0.03 * b, blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }); },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.4, lift: 3, swing: 0.3, bob: 1.2, lean: 0.06 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, ...READY, twist: 0.3 + w.twist * 0.25, n: [9.4, -26.5 + d * 0.8], f: [16.5, -30.5 + d * 0.8 + 0.4 * Math.cos(ph * TAU * 2)], ca: 0.62 + 0.04 * a, lean: 0.06 });
    },
  },
  // raise it to the cheek, settle, LOOSE (hit), the prod snaps and the stock kicks up; lower the nose,
  // crank the string back with the near hand at the stirrup, seat the next bolt, bring it up to the ready
  shoot: {
    n: 16, ms: 1000, loop: false, lag: 0.06, hit: 0.44,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: READY },
      { t: 0.2, e: "io", p: { ...AIMPOSE, ca: 0.3, n: [9.4, -30.5], f: [18, -33], hx: 0.6, twist: 0.45 } },
      { t: 0.34, e: "out", p: AIMPOSE },
      { t: 0.43, e: "io", p: { ...AIMPOSE, hx: 1.3, hy: 0.5 } },
      { t: 0.47, e: "out", p: { ...AIMPOSE, str: 0, bolt: 0, ca: 0.14, rx: -1.4, flash: 1, n: [9, -32], f: [19, -33.5], hx: 0.8, lean: -0.02 } },
      { t: 0.56, e: "io", p: { ...AIMPOSE, str: 0, bolt: 0, ca: 0.1, rx: -0.8, flash: 0.2, n: [9, -31.5], f: [19, -33], hx: 0.4 } },
      { t: 0.68, e: "io", p: { ...READY, str: 0, bolt: 0, ca: -0.75, n: [6, -22], f: [14.5, -18.5], twist: 0.1, drop: 0.6, lean: 0.12, hx: 0.8, hy: 1.4 } },
      { t: 0.8, e: "io", p: { ...READY, str: 1, bolt: 0, ca: -0.9, n: [-1, -22.5], f: [14.5, -18], twist: -0.1, drop: 0.8, lean: 0.14, hx: 0.8, hy: 1.4 } },
      { t: 0.9, e: "io", p: { ...READY, str: 1, bolt: 1, ca: -0.1, n: [8, -25], f: [16, -26], twist: 0.2, drop: 0.3, lean: 0.06, hy: 0.6 } },
      { t: 1, e: "io", p: READY },
    ], ph)),
  },
};
CLIPS.attack = CLIPS.shoot;

// ---- the aim contract: the pivot (rear shoulder) and the muzzle (the bolt's head) at aim 0, art px from the
// feet facing +x, at the frame the game shows at the loose (shoot's `hit`). The engine turns the muzzle with
// rotAbout(pivot, muzzle, aim): the drawn stock and arms turn about the same point, so they agree to the pixel.
export const AIM = (() => {
  const c = CLIPS.shoot, f = Math.round(c.hit * (c.n - 1)), p = c.pose(f / (c.n - 1)), s = solve(p, BONES);
  const ca = p.ca ?? 0.5, u = [Math.cos(ca), -Math.sin(ca)], w = [-Math.sin(ca), -Math.cos(ca)], gb = p.gb ?? 8;
  const butt = [s.hdN[0] - u[0] * gb, s.hdN[1] - u[1] * gb];
  return { pivot: [s.sN[0], s.sN[1]], muzzle: [butt[0] + u[0] * (STOCK_L + 2) + w[0] * 1.5, butt[1] + u[1] * (STOCK_L + 2) + w[1] * 1.5] };
})();
