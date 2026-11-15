// ============ CONCEPT FIGURE: the Aegis Magister ============
// The Iron Kingdom's ward-caster, a court battle-mage: a black-iron robe to the ankles lined
// in oxblood, a steel gorget and pauldron edged in brass, a tall oxblood hood with its peak
// swept back over a stern bearded face, a tall staff crowned with a pale-blue crystal cut like
// the shield pip his ward lays. Facing +x. Clips: idle, walk, cast (the staff thrust and the
// aegis flares, three pips bursting off the crystal); `attack` is the same clip.
// The owner's pick of the concept round: style "a" (the old rig's robe, hood, gorget and
// pauldron redrawn) with look "c"'s staff: the pale-blue ward crystal sits in an iron cage under
// a brass cap. Clips: `idle`, `walk` (8 frames), `cast` (the blow: the ward flung out, three
// pips bursting off the crystal), and `ward`: a walk-shaped clip (same legs and body as `walk`)
// worn on the march while the aegis charges, the staff held high with the crystal lit.
import { mat, flat } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const ROBE = mat("#2e3038", { contrast: 0.95, floor: 1 }), OX = mat("#7a2a2c", { contrast: 1.1 }), OXD = mat("#561c20", { floor: 1 }), HOOD = mat("#7a2a2c", { contrast: 1.1 });
const SKIN = mat("#d8a888"), BEARD = mat("#8c96ac"), WOOD = mat("#34363f"), BRASS = mat("#c8a040", { contrast: 1.2 }), IRON = mat("#6c7280", { contrast: 1.25 });
const STEEL = mat("#9aa0ae", { contrast: 1.3 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), BOOT = mat("#202228", { floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 });
const CRYS = mat("#7a9ccc", { contrast: 1.2 }), VOID = flat("#17141a"), SOCK = flat("#2a1c22");
const EYE = flat("#c8e0ff", { emis: true });
const GLOW = flat("#bcd6f2", { emis: true, line: "#4a6a98" }), HOT = flat("#f2f8ff", { emis: true, line: "#9ab6d8" });
const WARD2 = flat("#a8ccf4", { emis: true, line: "#3f5f8c" }), WARD = flat("#7aa8e0", { emis: true, line: "#2f4f7c" }), CORE = flat("#e4f2ff", { emis: true });
const F_CY = flat("#9ab6d8", { emis: true, line: "#3f5f8c" }), F_PALE = flat("#e8f4ff", { emis: true, line: "#9ab6d8" }), F_DEEP = flat("#3f5f8c", { emis: true }), F_BR = flat("#f2d878", { emis: true, line: "#a8803c" });

// The hood and the face in it, facing +x a quarter turned. C hood (c a tone down, K its lit lip),
// I the dark inside; the face is toned by hand (d deep, s shade, S pale, H highlight), e socket,
// E the eye's light, N the nose, m the mouth, B the grey beard.
const HEAD = [
  ".....CCCCCC....",
  "...CCCCCCCCCC..",
  "..CCCCCCCCKKKK.",
  ".CCCCCCKKKIIIIK",
  ".CCCCCKKIIdddddI",
  "CCCCCKKIIdsSSSSK",
  "CCCCCKKIIseeeeeS",
  "CCCCCKKIIseEseEN",
  "CCCCCKKIIsHSSSNN",
  "CCCCCKKIIdsdSSS.",
  "cCCCCKKIIdsSSSS.",
  "cCCCCCKKIIsBBBB.",
  ".cCCCCCKKIIsBB..",
  "..cCCCCCCKKIBB..",
  "..ccCCCCCCCC....",
].map((r) => r.padEnd(16, "."));
const legend = (eye) => ({
  C: { m: HOOD }, c: { m: HOOD, bias: -1 }, K: { m: HOOD, bias: 1 }, I: { m: VOID },
  d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, H: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 3 },
  e: { m: SOCK }, E: { m: eye }, m: { m: SKIN, fix: 0 }, B: { m: BEARD },
});
const LEG = legend(EYE), LEG_DIM = legend(flat("#5a7090", { emis: true }));

export const BOX = { w: 104, h: 102, ox: 22, oy: 93 };
export const MUST = [["nearArm", "notOver", "eyes"]];
export const BONES = scaled(HUMAN, 1.2, { shN: -2.7, shF: 2.9, upper: 7.9, fore: 7.7 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

// the pip: a little heater of crystal, drawn at a point with a size and a material (it points DOWN
// the staff). Used for the crystal, the charms, the focus and the burst.
const pipPts = (x, y, s) => [[x - 2.6 * s, y - 3 * s], [x + 2.6 * s, y - 3 * s], [x + 2.6 * s, y + 0.4 * s], [x, y + 3.6 * s], [x - 2.6 * s, y + 0.4 * s]];

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2), vy = cl(C[1] - lag1.C[1], -2, 2);
  const g = p.glow || 0, STAFF = 58;
  const sw1 = cl(-vx * 1.1 - vx2 * 0.8, -2, 2);

  // ---- the staff, in the far fist
  const lift = p.lift || 0, hgt = -hdF[1] - lift;
  const tl = p.staff ?? 0;
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)], lo = hgt / Math.cos(tl);
  const foot = [hdF[0] - d[0] * lo, hdF[1] - d[1] * lo], tip = [foot[0] + d[0] * STAFF, foot[1] + d[1] * STAFF];
  const at = (a, b) => [tip[0] + d[0] * a + nn[0] * b, tip[1] + d[1] * a + nn[1] * b];
  px.part();
  px.capsule(foot[0], foot[1], 0.95, tip[0], tip[1], 0.95, WOOD, 1.5, { edge: true });
  px.capsule(foot[0], foot[1], 1.2, foot[0] + d[0] * 2.4, foot[1] + d[1] * 2.4, 1.2, IRON, 1.55);     // the iron shoe
  px.part();
  px.capsule(...at(-2.4, 0), 1.4, ...at(-0.4, 0), 1.7, BRASS, 1.55);                                       // the collar
  const cs = 1.35, ce = at(8.4 * cs + 1, 0);                                           // the crystal's centre
  {
    // the iron cage: two prongs rising round the stone to a brass cap
    px.part();
    px.line(...at(0, -3.4), ...at(6, -4.6), IRON, 1.6); px.line(...at(6, -4.6), ...at(15, -3.4), IRON, 1.6);
    px.line(...at(0, 3.4), ...at(6, 4.6), IRON, 1.6); px.line(...at(6, 4.6), ...at(15, 3.4), IRON, 1.6);
    px.ellipse(...at(16, 0), 1.6, 1.3, BRASS, 1.62, { cast: 1 });
  }
  px.part();
  {
    const cp = pipPts(0, 0, 1).map(([a, b]) => [a, b]);
    // map the pip into staff space: its flat top toward the staff's tip
    const pts = [[-2.6, 3.2], [2.6, 3.2], [2.6, -0.2], [0, -3.6], [-2.6, -0.2]].map(([b, a]) => at(8.4 * cs + a * cs * 1.15, b * cs * 1.1)).map((q, i) => q);
    const hot = g > 0.8 ? WARD2 : WARD;
    px.poly(pts, hot, 1.6, {});
    { px.poly([[-1.1, 1.4], [1.1, 1.4], [1.1, -0.2], [0, -1.6], [-1.1, -0.2]].map(([b, a]) => at(8.4 * cs + a * cs * 1.15 + 0.4, b * cs * 1.1)), CORE, 1.61); }
  }
  // ---- the far arm, a tone down, behind the body; its fist on the staff
  {
    const wr = mix(eF, hdF, 0.78), u = unit(eF, hdF), n = [-u[1], u[0]];
    px.part();
    px.capsule(sF[0], sF[1], 2, eF[0], eF[1], 2, ROBE, 1, { bias: -1, floor: 1 });
    px.capsule(eF[0], eF[1], 2, wr[0], wr[1], 2.5, ROBE, 1, { bias: -1, floor: 1 });
    px.poly([[wr[0] + n[0] * 2.7, wr[1] + n[1] * 2.7], [wr[0] - n[0] * 2.7, wr[1] - n[1] * 2.7], [wr[0] - n[0] * 2.7 + u[0] * 1.3, wr[1] - n[1] * 2.7 + u[1] * 1.3], [wr[0] + n[0] * 2.7 + u[0] * 1.3, wr[1] + n[1] * 2.7 + u[1] * 1.3]], OXD, 1.02, { bias: -1 });
    px.part(); px.ellipse(hdF[0], hdF[1], 1.8, 2, SKIN, 1.7, { bias: -1 });
  }

  // boots under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 2, an[1] + 1.4, 2.6, 1.2, BOOT, zz, { fix: 1 + b }); }

  // ---- the robe: narrow shoulders to a straight hem shaped by the feet, an oxblood lining in the front slit
  const hemY = -0.6, top = C[1] - 2.4;
  const hemF = Math.max(P[0] + 5.2, Math.max(anN[0], anF[0]) + 3.8) - vx * 0.8, hemB = Math.min(P[0] - 6, Math.min(anN[0], anF[0]) - 3.8) - vx * 1.3 - vx2 * 0.8;
  const wF = [P[0] + 4.4, P[1] - 2], wB = [P[0] - 4.9, P[1] - 2], hm = (t) => hemB + (hemF - hemB) * t;
  const dag = [[1, 0], [0, 0]];
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 4.4, top], [C[0] + 4.5, top], [C[0] + 5.2, C[1] + 3], wF, ...dag.map(([t, dp]) => [hm(t), hemY - dp]), wB, [C[0] - 5.4, C[1] + 3]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(P[0] - 2.4, P[1] + 2, hm(0.3), hemY - 5, -1, robeId);
  px.toneLine(P[0] - 4, P[1] + 4, hm(0.12), hemY - 5, 1, robeId);
  px.toneLine(P[0] + 3, P[1] + 1, hm(0.84), hemY - 5, 1, robeId);
  px.toneLine(C[0] + 3.4, C[1] + 2, P[0] + 3, P[1] - 4, 1, robeId);
  // the front slit's oxblood lining, a long wedge from the belt to the hem
  px.part();
  px.poly([[P[0] + 1.2, P[1] - 1.4], [P[0] + 4.2, P[1] - 1.4], [hm(0.96), hemY - 0.8], [hm(0.74), hemY - 0.8]], OX, 4.03, { round: 0.8 });
  // the belt
  px.part();
  px.poly([[wB[0] - 0.1, P[1] - 3.6], [wF[0] + 0.2, P[1] - 3.6], [wF[0], P[1] - 1.9], [wB[0], P[1] - 1.9]], IRON, 4.05, { round: 0.94, bias: -1 });
  px.rect(P[0] + 1, P[1] - 3.6, 2.2, 1.8, BRASS, 4.06, { fix: 3 });
  px.part(); px.rect(C[0] + 2.4, C[1] + 3.6, 2, 2, BRASS, 4.3, { fix: 3 });          // the rank brooch
  // the gorget: a steel collar over the shoulders (a stand-up flare in c)
  px.part();
  px.poly([[C[0] - 5.6, C[1] - 3.2], [C[0] + 5.4, C[1] - 3.2], [C[0] + 6.2, C[1] + 1], [C[0] + 2.6, C[1] + 2.6], [C[0] - 2.6, C[1] + 2.4], [C[0] - 6, C[1] + 1.2]], STEEL, 5, { round: 0.9, cast: 1 });
  px.line(C[0] - 5.6, C[1] + 1.4, C[0] + 5.8, C[1] + 1.4, BRASS, 5.05, { noLine: true });

  // ---- the near arm: a belled robe sleeve, an oxblood cuff, the open hand
  const u = unit(eN, hdN), n = [-u[1], u[0]], wr = mix(eN, hdN, 0.76);
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1], 2.4, eN[0], eN[1], 2.3, ROBE, 8.6, { cast: 2, floor: 1 });
  px.capsule(eN[0], eN[1], 2.3, wr[0], wr[1], 3, ROBE, 8.6, { cast: 2, floor: 1 });
  px.poly([[wr[0] + n[0] * 3.2, wr[1] + n[1] * 3.2], [wr[0] - n[0] * 3.2, wr[1] - n[1] * 3.2], [wr[0] - n[0] * 3.2 + u[0] * 1.6, wr[1] - n[1] * 3.2 + u[1] * 1.6], [wr[0] + n[0] * 3.2 + u[0] * 1.6, wr[1] + n[1] * 3.2 + u[1] * 1.6]], OX, 8.62, { bias: 1 });
  // the pauldron: a steel cap on the near shoulder, brass-edged (b studs it)
  px.part();
  px.ellipse(sN[0] + 0.4, sN[1] - 0.2, 4.4, 3.8, STEEL, 8.7, { cast: 1 });
  px.line(sN[0] - 3.6, sN[1] + 2, sN[0] + 4.4, sN[1] + 2, BRASS, 8.72, { noLine: true });
  px.part(); px.ellipse(wr[0] + u[0] * 2.4, wr[1] + u[1] * 2.4, 1.9, 1.7, SKIN, 8.9, { cast: 1 });
  px.tag(null);
  if ((p.palm || 0) > 0.3) { const h = [wr[0] + u[0] * 4.4, wr[1] + u[1] * 4.4]; px.part(); px.poly(pipPts(h[0], h[1] - 2, 0.7), GLOW, 9, { cast: 0 }); }

  // ---- the hood: its peak sweeps back and trails the head
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const gx = hx - 7, gy = hy - 13, bend = cl(vx * 2.2 + vx2 * 1.6 + (p.sway || 0) * 0.6, -2, 3), dr = cl(-vy * 1.3, -1.2, 1.8);
  px.part();
  px.poly([[gx + 0.4, gy + 5.5], [gx + 0.6, gy + 1.4], [gx + 1.8 - bend * 0.3, gy - 1.8 + dr * 0.3], [gx - 0.8 - bend * 0.8, gy - 3.8 + dr * 0.7], [gx - 4.2 - bend, gy - 3.6 + Math.abs(bend) * 0.4 + dr],
    [gx - 0.6 - bend * 0.8, gy - 5.8 + dr * 0.7], [gx + 3 - bend * 0.4, gy - 4.8 + dr * 0.3], [gx + 6, gy - 1.6], [gx + 11.5, gy + 1.6], [gx + 11, gy + 4]], HOOD, 7.95, { round: 0.85, ny: -0.2 });
  stampFace(px, p.eye < -0.5 ? HEAD.map((r) => r) : HEAD, hx, hy, p.eye < -0.5 ? LEG_DIM : LEG, 8, 8, { ax: 7, ay: 13, ball: [6, 7, 8.5, 9], cast: 1 }, "sSNEeHB");
  const k = cl(g, 0, 1.4);
  return {
    light: k > 0.05 ? { x: ce[0], y: ce[1], r: 20 + 26 * cl(k, 0, 1), col: "#9ab6d8", k: k * 0.4 } : null,
    orb: ce, tip, foot, d, nn, hemB, hemF, feet: [P[0], 0], pdir: unit(eN, hdN),
  };
};

// the aegis: three pips burst off the crystal and fan forward, a ring of ward-light at his feet
export const fx = (px, { ph }, info, clip) => {
  if (!info.orb) return;
  const [ox, oy] = info.orb, [cx] = info.feet, NL = { noLine: true };
  if (clip === "ward") {
    // the aegis gathering on the march: three motes turning round the crystal, a spark rising
    for (let i = 0; i < 3; i++) {
      const a = ph * TAU * 1.5 + i * 2.094, x = ox + Math.cos(a) * 6.4, y = oy + 1 + Math.sin(a) * 2.6, back = Math.sin(a) < 0;
      px.dot(x, y, back ? F_DEEP : i ? F_CY : F_PALE, back ? 19.6 : 20.2, NL);
    }
    const u = (ph * 2) % 1; px.dot(ox + 0.4, oy - 6 - u * 5, u < 0.5 ? F_PALE : F_CY, 20.3, NL);
    return;
  }
  if (clip !== "cast") return;
  // motes drawn up the staff before the cast
  if (ph > 0.12 && ph < 0.5) {
    const k = (ph - 0.12) / 0.38;
    for (let i = 0; i < 6; i++) {
      const u = (k * 1.5 + i / 6) % 1, a = u * 6 + i * 2.2, r = (1 - u) * 5 + 1;
      const h = 4 + u * 44, x = info.foot[0] + info.d[0] * h + info.nn[0] * Math.cos(a) * r, y = info.foot[1] + info.d[1] * h + Math.sin(a) * r * 0.3;
      px.dot(x, y, i % 2 ? F_CY : F_PALE, 20, NL);
    }
  }
  if (ph >= 0.5 && ph < 0.92) {
    const t = (ph - 0.5) / 0.42;
    if (t < 0.22) {
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a), L = i % 2 ? 7 : 11; px.line(ox + c * 3.6, oy + s * 3.6, ox + c * L, oy + s * L, i % 2 ? F_CY : F_PALE, 20.5, NL); }
      px.ellipse(ox, oy, 3.8, 3.8, F_PALE, 21);
    }
    // three pips fan out and settle
    const dirs = [[-0.35, -0.32], [0.2, 0.1], [0.5, 0.5]];
    for (let i = 0; i < 3; i++) {
      const e = 1 - (1 - cl(t * 1.3, 0, 1)) ** 2, X = ox + 3 + (3 + 9 * e) * (1 + 0.2 * i), Y = oy + [-5, 0, 6][i] * (0.4 + 0.6 * e) + 2 * e;
      if (t > 0.85 && i !== 1) continue;
      px.poly(pipPts(X, Y, 1.05 - 0.2 * t), t < 0.45 ? F_PALE : F_CY, 20.2);
    }
    // the ward ring
    const k = cl(t * 1.5, 0, 1) * cl((1 - t) * 3, 0, 1), rx = 6 + 16 * k, ry = 1.6 + 3.4 * k, n = Math.round(rx * 4.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = cx + 0.5 + Math.cos(a) * rx, y = 0.4 + Math.sin(a) * ry;
      if (Math.sin(a) < 0.2 && x > info.hemB - 5 && x < info.hemF + 1) continue;
      const q = (i + ph * 22) % 8; if (q >= 5) continue;
      px.dot(x, y + 1, F_DEEP, 19.8, NL); px.dot(x, y, q < 1 ? F_PALE : F_CY, 20, NL);
    }
  }
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const READY = { lean: 0.04, hx: 1.2, hy: 0.4, aF: [0.9, 0.7, 0], aN: [0.3, 0.8, 0], fN: [-1.8, 0], fF: [2, 0], staff: 0.05, lift: 0, glow: 0.12, palm: 0, sway: 0, eye: 0 };
// the march `walk` and `ward` are both built on: ONE call, so their legs and body are the same frame for frame
const march = (ph) => walkPose(ph, { stride: 4.6, lift: 2.4, swing: 0.3, bob: 0.9, lean: 0.07 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...READY, rise: 0.7 * u, aN: [0.34 + 0.04 * b, 0.8, 0], sway: Math.sin(ph * TAU + 0.8), glow: 0.14 + 0.16 * Math.max(0, Math.sin(ph * TAU - 1.2)), eye: ph > 0.74 && ph < 0.82 ? -1 : 0 };
    },
  },
  // the march: the staff swung forward and planted with each stride like a walking staff, the near hand loose
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU), st = 0.5 + 0.5 * Math.cos(ph * TAU * 2 + 0.6);
      return { ...READY, ...w, hx: 1.4, hy: 0.5, aF: [0.9 + 0.09 * Math.cos((ph - 0.08) * TAU), 0.74, 0], aN: [0.36 - a * 0.14, 0.8, 0], lift: 2.4 * st, staff: 0.05 + 0.04 * a, sway: Math.sin(ph * TAU) * 0.8, glow: 0.12 };
    },
  },
  // the aegis charging on the march: the walk's legs, the staff lifted and held high with the stone lit, the near palm out
  ward: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = march(ph), b = Math.sin(ph * TAU);
      return { ...READY, ...w, hx: 0.8, hy: -0.2, rise: 0.5, aF: [1.75, 0.86, 0], aN: [1.25 + 0.05 * b, 0.82, 0], lift: 10 + 0.6 * b, staff: -0.06, glow: 0.85 + 0.2 * b, palm: 1, sway: b * 0.7, eye: 1 };
    },
  },
  // the blow: his aegis flung out. Gather (staff drawn up), the thrust (foot lifts as the head drives forward), the burst, settle
  cast: {
    n: 14, ms: 1000, loop: false, lag: 0.07, hit: 0.54,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.14, e: "out", p: { ...READY, drop: 0.6, lean: 0.1, aF: [0.6, 0.68, 0], aN: [0.7, 0.66, 0], staff: 0.02, glow: 0.3 } },
      { t: 0.34, e: "io", p: { ...READY, rx: -1, rise: 0.8, lean: -0.04, hx: 0.6, aF: [1.5, 0.82, 0], aN: [1.2, 0.8, 0], staff: -0.12, lift: 6, glow: 0.6, palm: 1 } },
      { t: 0.46, e: "io", p: { ...READY, rx: -1.4, rise: 1.2, lean: -0.08, hx: 0.3, hy: -0.4, aF: [1.9, 0.9, 0], aN: [1.4, 0.82, 0], staff: -0.2, lift: 9, glow: 0.85, palm: 1, eye: 1 } },
      { t: 0.54, e: "in3", p: { ...READY, rx: 2.2, drop: 1, lean: 0.24, hx: 2.2, hy: 1, aF: [1.35, 1, 0], aN: [1.5, 0.95, 0], fF: [5, 0], staff: 0.7, lift: 15, glow: 1.3, palm: 1, eye: 1 } },
      { t: 0.66, e: "out", p: { ...READY, rx: 2.6, drop: 1.1, lean: 0.28, hx: 2.4, hy: 1.2, aF: [1.3, 1, 0], aN: [1.45, 0.95, 0], fF: [5, 0], staff: 0.78, lift: 14, glow: 0.8, eye: 1 } },
      { t: 0.86, e: "io", p: { ...READY, rx: 0.8, drop: 0.4, lean: 0.12, aF: [1.0, 0.74, 0], aN: [0.7, 0.8, 0], staff: 0.3, lift: 4, glow: 0.35 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
