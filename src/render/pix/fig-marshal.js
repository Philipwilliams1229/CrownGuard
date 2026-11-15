// ============ FIGURE: the Lord Marshal (the Iron Kingdom's boss, on foot) ============
// Look "b" of the Iron family at a boss's size: blued plate edged in brass, a crowned great helm
// with a long off-white horsehair plume (the stand-out shape) and a visor slit with pale eyes in it,
// layered spiked pauldrons, an oxblood cape sweeping behind with a brass hem, and the army's
// war-banner on a lance: an oxblood field with the grey tower, swallow-tailed, a brass finial. Facing +x.
// Clips: `idle` (the lance planted, the cape and flag stirring), `walk` (8 frames, the lance carried
// upright), `attack` (the lance reared back over the shoulder, brought down like a blow with the
// banner snapping forward, recover; `hit` is the head going home).
import { mat, flat } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, clamp } from "./rig.js";

export const BONES = scaled(HUMAN, 1.5, { thigh: 11.6, shin: 11, ankle: 3, spine: 16, neck: 2, shN: -3.6, shF: 4, hipN: -1.8, hipF: 2 });
export const BOX = { w: 126, h: 114, ox: 46, oy: 106 };
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e0b088"), EYE = flat("#dde8ff", { emis: true });
const PLATE = mat("#646a78", { contrast: 1.3 }), PLATEK = mat("#3a3e4a", { contrast: 1.15 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#6c7280", { contrast: 1.25 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), CAPE = mat("#6a2226", { contrast: 1.1 }), PAD = mat("#4e4a58"), LEATHER = mat("#4a3020"), WOOD = mat("#5a4028", { contrast: 1.15 });
const BRASS = mat("#c8a040", { contrast: 1.25 }), HOSE = mat("#34363f", { floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 }), PLUME = mat("#e8e0cc", { contrast: 1.15 }), PLUMEK = mat("#b8b0a0");
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the crowned great helm: M plate, W glint, m dark, K brass crown band, Y the crown's points,
// E the eyes in the slit (e shut)
const HEAD = [
  "..Y..Y..Y..Y..Y.",
  "..KKKKKKKKKKKKK.",
  "..MMMMMMMMMMMMM.",
  ".MMWWMMMMMMMMMMM",
  ".MMWMMMMMMMMMMMM",
  ".MMMMMMMMMMMMMMM",
  ".MMMMMMMmmmmmmmM",
  ".MMMMMMmEEmEEmmM",
  ".MMMMMMMmmmmmmmM",
  ".MMMMMMMMMMMMMMM",
  ".MMMMMMMMmMmMMMM",
  ".MMMMMMMMMMMMMMM",
  "..MMMMMMMMMMMMM.",
  "..KKKKKKKKKKKKK.",
  "...mmmmmmmmmmm..",
].map((r) => r.padEnd(16, "."));
const blink = (rows) => rows.map((r) => r.replace(/E/g, "m"));
const LEG = {
  M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATEK }, K: { m: BRASS }, Y: { m: BRASS, bias: 1 }, E: { m: EYE },
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 3.2, k[0], k[1], 2.8, HOSE, z, { bias: b, floor: 1 });
  px.capsule(h[0] * 0.62 + k[0] * 0.38, h[1] * 0.62 + k[1] * 0.38, 3.6, h[0] * 0.18 + k[0] * 0.82, h[1] * 0.18 + k[1] * 0.82, 3.3, PLATE, z + 0.01, { bias: b });
  px.capsule(k[0], k[1], 2.7, an[0], an[1] - 3, 2.3, PLATE, z + 0.02, { bias: b });
  px.ellipse(k[0] + 1, k[1], 3, 2.6, PLATE, z + 0.04, { bias: b, cast: 1 });
  px.dot(k[0] + 1.8, k[1] - 0.8, STEELB, z + 0.05, { fix: 4 });
  px.line(k[0] - 2, k[1] + 0.2, k[0] + 3.6, k[1] + 0.2, BRASS, z + 0.06, { noLine: true });
  px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.8, an[0], an[1], 2.4, PLATEK, z + 0.03, { bias: b });
  px.ellipse(an[0] + 2, an[1] + 1.4, 4, 1.9, PLATEK, z + 0.04, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.4, 2.4), vx2 = cl(lag1.C[0] - lag2.C[0], -2.4, 2.4), vy = cl(C[1] - lag1.C[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]), fl = p.flut || 0;

  // ---- the cape, behind everything: from the shoulders to the calf, streaming back, a brass hem
  const cs = cl(-vx * 1.8 - vx2 * 1.2 + fl, -3.6, 3.6), len = 3;
  px.part(); const cid = px._pid;
  px.poly([[C[0] + 1, C[1] - 4.4], [C[0] - 4.4, C[1] - 4.6], [C[0] - 6.4, C[1] - 1], [C[0] - 7.6 + cs * 0.5, C[1] + 8], [C[0] - 10 + cs, P[1] + 10], [C[0] - 12.6 + cs * 1.4, len, 1], [C[0] - 8 + cs * 1.1, len - 1, 1], [C[0] - 5.8 + cs * 0.8, len + 0.6, 1], [C[0] - 2.6 + cs * 0.4, len - 1.2, 1], [C[0] - 1, P[1] + 4]], CAPE, 0.5, { round: 0.85, cast: 1 });
  px.toneLine(C[0] - 4.4, C[1] - 2, C[0] - 8.4 + cs, len - 2, 1, cid);
  px.toneLine(C[0] - 2, C[1] + 2, C[0] - 5 + cs * 0.7, len - 2, -1, cid);
  px.line(C[0] - 12 + cs * 1.4, len - 0.6, C[0] - 2.8 + cs * 0.4, len - 1.6, BRASS, 0.52, { noLine: true });

  // the far arm and legs
  px.part();
  px.capsule(sF[0], sF[1], 2.7, eF[0], eF[1], 2.6, PAD, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.6, hdF[0], hdF[1], 2.3, PLATE, 1, { bias: -1 });
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // ---- the breastplate, tassets and the surcoat's long dagged skirt, the brass-edged belt
  const hemY = P[1] + 9, hemB = P[0] - 8 - vx * 1.2, hemF = P[0] + 7.6 - vx * 0.8;
  px.part(); const cu = px._pid;
  px.poly([[C[0] - 6.4, C[1] - 3], [C[0] + 6.6, C[1] - 3], [C[0] + 7.8, C[1] + 4], [P[0] + 6, P[1] - 1], [P[0] + 6.2, P[1] + 4], [P[0] - 6.4, P[1] + 4], [P[0] - 6.4, P[1] - 2], [C[0] - 7.6, C[1] + 4]], PLATE, 4, { round: 0.92, cast: 2 });
  px.toneLine(C[0] - 1, C[1] + 1, P[0] - 1, P[1], -1, cu);
  px.part(); const sc = px._pid;
  const hem = [[hemF, hemY - 0.8], [hemF - 3.2, hemY + 2.4], [hemF - 5.6, hemY - 0.6], [hemF - 8.6, hemY + 2.4], [hemF - 11, hemY - 0.6], [hemB + 6.6, hemY + 2.4], [hemB + 4.4, hemY - 0.6], [hemB + 1.6, hemY + 2], [hemB, hemY - 0.8]];
  px.poly([[C[0] - 5, C[1] + 1], [C[0] + 5.2, C[1] + 1], [C[0] + 6.6, C[1] + 5], [P[0] + 5, P[1] - 3], ...hem, [P[0] - 5.2, P[1] - 3], [C[0] - 6.4, C[1] + 5]], OX, 4.02, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.8, P[1] - 2, P[0] + 1.4 - vx * 0.5, hemY - 1.8, -1, sc);
  px.toneLine(P[0] - 3, P[1] - 2, P[0] - 3.4 - vx * 0.8, hemY - 1.8, 1, sc);
  px.line(hemB + 1, hemY - 1.4, hemF - 1, hemY - 1.4, BRASS, 4.04);
  // the breastplate's top and its brass ridge; the great tower on his breast
  px.part();
  px.poly([[C[0] - 6.2, C[1] - 2.8], [C[0] + 6.4, C[1] - 2.8], [C[0] + 7.2, C[1] + 1.8], [C[0] + 2.4, C[1] + 1], [C[0] - 2.4, C[1] + 1.2], [C[0] - 7.2, C[1] + 1.8]], PLATE, 4.06, { round: 0.9, cast: 1 });
  px.line(C[0] + 0.4, C[1] - 2.6, C[0] + 0.6, C[1] + 1, BRASS, 4.08, { noLine: true });
  px.part(); px.rect(C[0] - 1.6, C[1] + 3, 6, 5, GREY, 4.1, { fix: 3 });
  for (const dx of [-1.6, 0.6, 2.8]) px.dot(C[0] + dx, C[1] + 2, GREY, 4.1, { fix: 3 });
  px.rect(C[0] + 0.4, C[1] + 5.6, 1.6, 2.4, OXK, 4.12, { noLine: true });
  // the belt, a great brass buckle, a sword's pommel at the hip
  px.part();
  px.poly([[P[0] - 6.6, P[1] - 5.6], [P[0] + 6.2, P[1] - 5.6], [P[0] + 6.3, P[1] - 3.2], [P[0] - 6.7, P[1] - 3.2]], LEATHER, 4.15, { round: 0.92 });
  px.rect(P[0] + 1.8, P[1] - 5.8, 3, 2.8, BRASS, 4.16, { fix: 3 });
  px.part(); px.line(P[0] - 3.6, P[1] - 4, P[0] - 7.2 - vx * 0.4, P[1] + 5, LEATHER, 4.17, { noLine: true }); px.ellipse(P[0] - 3.4, P[1] - 4.4, 1.5, 1.5, BRASS, 4.18);
  // the gorget, brass edged
  px.part();
  px.poly([[C[0] - 6, C[1] - 4.4], [C[0] + 6.2, C[1] - 4.4], [C[0] + 7, C[1] - 0.4], [C[0] - 6.8, C[1] - 0.2]], PLATE, 5, { round: 0.9, cast: 1 });
  px.line(C[0] - 6.4, C[1] - 0.2, C[0] + 6.6, C[1] - 0.2, BRASS, 5.05, { noLine: true });

  // ---- the head: the plume first (it trails behind the helm), then the great helm
  const tr = cl(-vx * 2.2 - vx2 * 1.4 + fl * 0.8, -3.6, 3.6), dr = cl(-vy * 1.4, -1.6, 2);
  px.part();
  px.poly([[hx - 1, hy - 13.4], [hx + 4.6, hy - 13.6], [hx + 5, hy - 17.4 + dr * 0.3], [hx + 0.4 + tr * 0.1, hy - 21.6 + dr * 0.6], [hx - 6 + tr * 0.6, hy - 22.6 + dr], [hx - 13 + tr, hy - 19.6 + dr * 1.1], [hx - 17.6 + tr * 1.6, hy - 14 + dr * 1.2], [hx - 15.6 + tr * 1.6, hy - 9 + dr], [hx - 10 + tr, hy - 13 + dr * 0.8], [hx - 5, hy - 12.4]], PLUME, 5.8, { round: 0.8, cast: 1 });
  px.toneLine(hx + 1, hy - 14, hx - 11 + tr, hy - 16.4 + dr, -1, px._pid);
  px.part();
  px.stamp(p.blink ? blink(HEAD) : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 14, cast: 2, ball: [8, 6, 8, 7] });
  px.dot(hx + 2, hy - 9, STEELB, 6.1, { fix: 4 });

  // ---- the war-banner: a lance in both fists, the banner behind it (before it only in the strike)
  const ha = p.ha ?? 0.1, hg = p.hg ?? 29, LONG = 66;
  const ux = Math.sin(ha), uy = -Math.cos(ha), vxn = Math.cos(ha), vyn = Math.sin(ha);
  const butt = [hdN[0] - ux * hg, hdN[1] - uy * hg], top = [butt[0] + ux * LONG, butt[1] + uy * LONG];
  const at = (a, b) => [top[0] + ux * a + vxn * b, top[1] + uy * a + vyn * b];
  const front = (p.front || 0) > 0.5, zf = 7;
  px.part();
  px.capsule(butt[0], butt[1], 1.2, top[0], top[1], 1.2, WOOD, zf, { edge: true });
  px.capsule(butt[0], butt[1], 1.5, butt[0] + ux * 2.4, butt[1] + uy * 2.4, 1.5, IRON, zf + 0.01);
  px.capsule(...at(-3.4, 0), 1.7, ...at(-1.4, 0), 1.7, BRASS, zf + 0.04);                                  // the collar
  px.poly([at(-1, 0), at(0.6, 2.6), at(7, 2.4), at(12, 0), at(7, -2.4), at(0.6, -2.6)], STEELB, zf + 0.06, { n: [0.1, 0.1, 0.95] });    // the lance head
  px.line(...at(1, 0), ...at(10.4, 0), IRON, zf + 0.07, { fix: 1, noLine: true });
  // the cross-bar the banner hangs from, and the banner: a swallow-tailed field
  const bar = (b) => at(-5, b);
  px.part();
  px.line(...bar(-1), ...bar(front ? 13 : -14), BRASS, zf + 0.05, { noLine: true });
  const f = cl(-vx * 1.8 - vx2 * 1.2 + fl, -3.4, 3.4), dir = front ? 1 : -1;
  const pt = (a, b) => at(-5 - a, dir * b);
  px.part(); const bid = px._pid;
  px.poly([pt(0.4, 0.6), pt(0.2, 4 + f * 0.1), pt(0.6, 15 + f * 0.8), pt(16 + f * 0.2, 17 + f * 1.4), pt(20, 14 + f * 1.2), pt(15.6, 9.6 + f), pt(21, 5.4 + f * 0.9), pt(17, 0.8 + f * 0.4)], OX, zf + 0.08, { round: 0.5, cast: 1 });
  px.toneLine(...pt(2, 4), ...pt(15, 14 + f), -1, bid);
  px.line(...pt(1, 1.4), ...pt(1, 14 + f * 0.7), BRASS, zf + 0.1, { noLine: true });
  px.line(...pt(17, 0.6), ...pt(20.6, 5.4 + f * 0.9), BRASS, zf + 0.1, { noLine: true });
  px.part();
  const tx = pt(8, 8 + f * 0.5);
  px.rect(tx[0] - 2.6, tx[1] - 2.8, 5.2, 5.6, GREY, zf + 0.12, { fix: 3 });
  for (const dx of [-2.6, -0.6, 1.4]) px.dot(tx[0] + dx, tx[1] - 3.8, GREY, zf + 0.12, { fix: 3 });
  px.rect(tx[0] - 0.6, tx[1] + 0.4, 1.2, 2.4, OXK, zf + 0.13, { noLine: true });

  // the far fist grips the lance low, the near fist above; both arms over the plate
  px.part(); px.ellipse(hdF[0], hdF[1], 2.2, 2.2, PLATEK, zf + 0.3, { bias: -1 });
  const zn = 9;
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 3, eN[0], eN[1], 2.7, PAD, zn, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.7, hdN[0], hdN[1], 2.3, PLATE, zn, { cast: 2 });
  px.ellipse(eN[0], eN[1], 2.7, 2.7, PLATE, zn + 0.05, { cast: 1 });
  px.capsule(eN[0] * 0.28 + hdN[0] * 0.72, eN[1] * 0.28 + hdN[1] * 0.72, 2.6, eN[0] * 0.14 + hdN[0] * 0.86, eN[1] * 0.14 + hdN[1] * 0.86, 2.6, PLATEK, zn + 0.07);
  px.part(); px.ellipse(hdN[0], hdN[1], 2.4, 2.4, PLATEK, zn + 0.2);
  // the pauldrons: two layers, spiked, brass-edged
  px.part();
  for (const [k, dz, dy] of [[1, 0, 0], [0.74, 0.02, 3]]) px.ellipse(sN[0] + 0.4, sN[1] + 0.2 + dy * 0.8, 6.2 * k, 5.2 * k, PLATE, zn + 0.3 + dz, { cast: 1 });
  px.line(sN[0] - 5.4, sN[1] + 2.2, sN[0] + 5.8, sN[1] + 2.2, BRASS, zn + 0.35, { noLine: true });
  px.poly([[sN[0] - 1.2, sN[1] - 4.6], [sN[0] + 1.6, sN[1] - 4.6], [sN[0] + 0.2, sN[1] - 8.6]], STEELB, zn + 0.4, { cast: 0 });
  px.dot(sN[0] + 2.6, sN[1] - 0.6, STEELB, zn + 0.42, { fix: 4 }); px.dot(sN[0] - 3, sN[1] - 0.2, STEELB, zn + 0.42, { fix: 4 });
  return { H: { at }, top };
};

// the blow's streak, down the lance head
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.46 || ph > 0.62 || !info.H) return;
  const { at } = info.H;
  px.poly([at(0, 4), at(-30, 3.4), at(-8, 0.6)], SMEAR2, 20, { noLine: true });
  px.poly([at(0, 3), at(-22, 2.6), at(-8, 1)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), 0]; };
const STAND = { fN: [-3.4, 0], fF: [4, 0] };
// b.n: the near fist on the lance, b.ha / b.hg: its lean and how far the butt is below the fist;
// the far fist rides the shaft `gap` below the near one
const hold = (b) => {
  const p = { ...STAND, ...b }, s = solve(p, BONES), gap = b.gap ?? 10, ha = b.ha ?? 0.1;
  const f = [b.n[0] - Math.sin(ha) * gap, b.n[1] + Math.cos(ha) * gap];
  p.aN = aim(s.sN, b.n); p.aF = aim(s.sF, f);
  return p;
};
const REST = { n: [13, -42], ha: 0.12, hg: 30, twist: 0.3, lean: 0.03, flut: 0, front: 0, blink: 0 };

export const CLIPS = {
  idle: {
    n: 8, ms: 2600, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...REST, rise: 0.9 * b, n: [13, -42 + 0.4 * b], hg: 33, flut: 1.4 * Math.sin(ph * TAU), blink: ph > 0.62 && ph < 0.72 ? 1 : 0 }); },
  },
  walk: {
    n: 8, ms: 960, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 6.4, lift: 3.2, swing: 0.26, bob: 1.5, lean: 0.07 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, ...REST, twist: 0.3 + w.twist * 0.2, n: [13, -42 + d * 0.8], ha: 0.12 + 0.03 * a, flut: a * 1.6, lean: 0.07 });
    },
  },
  // the lance reared back over the shoulder, the banner trailing; then driven down and forward
  // like a blow (the banner snaps ahead of it); held a beat; recover
  attack: {
    n: 14, ms: 1050, loop: false, lag: 0.06, hit: 0.5,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: REST },
      { t: 0.22, e: "io", p: { ...REST, n: [6, -47], ha: -0.4, hg: 27, rx: -1, lean: -0.05, twist: -0.2, drop: 0.3, flut: 1.4 } },
      { t: 0.4, e: "out", p: { ...REST, n: [-1, -52], ha: -0.95, hg: 24, rx: -2.6, lean: -0.15, twist: -0.8, drop: 0.8, hy: -0.4, fF: [4, 0], flut: 2.6, gap: 8 } },
      { t: 0.5, e: "in3", p: { ...REST, n: [17, -42], ha: 1.65, hg: 18, front: 1, rx: 3.4, lean: 0.27, twist: 0.9, drop: 2, hx: 0.9, fF: [9, 0], flut: -2.4, gap: -5 } },
      { t: 0.64, e: "out", p: { ...REST, n: [18.5, -38], ha: 1.95, hg: 18, front: 1, rx: 3.8, lean: 0.3, twist: 0.9, drop: 2.2, hx: 0.9, fF: [9, 0], flut: -1.2, gap: -3 } },
      { t: 0.84, e: "io", p: { ...REST, n: [14, -41], ha: 0.7, hg: 28, rx: 1.2, lean: 0.1, twist: 0.5, drop: 0.6, fF: [5, 0], flut: 1.4 } },
      { t: 1, e: "io", p: REST },
    ], ph)),
  },
};
