// ============ CONCEPT FIGURE: the Necromancer ============
// A size above a man: tall, gaunt and stooped in a deep cowl of near-black
// violet, a tattered cape and hem, grave-pale face with witch-lit eyes in the
// hood's shadow, long bony hands, a tall staff whose bone prongs hold a violet
// shard. Three clips: idle, walk, cast (his raise-dead).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const ROBE = mat("#2c2850", { contrast: 0.9 }), COWL = mat("#4a4074"), CAPE = mat("#2c2538", { contrast: 0.9 }), TRIM = mat("#5a4a8c"), SKIN = mat("#c8c0b0"), BONE = mat("#d8d0b8");
const WOOD = mat("#54424a"), BRONZE = mat("#a8803c", { contrast: 1.15 }), CRYS = mat("#b08ad8", { contrast: 1.25 }), BOOT = mat("#2c2430");
const VOID = flat("#17121e"), SOCK = flat("#1c1426");
const EYE = flat("#d6b4ff", { emis: true }), EYE_DIM = flat("#7c5cae", { emis: true }), EYE_HOT = flat("#f3e6ff", { emis: true });
const GLOW = flat("#c39cf4", { emis: true, line: "#6a4aa6" }), HOT = flat("#f6ecff", { emis: true, line: "#b08ad8" });
// the spell's own colours
const F_VIO = flat("#b78cf0", { emis: true, line: "#5d3f9a" }), F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_GOLD = flat("#f2d878", { emis: true, line: "#a8803c" });
const F_CYAN = flat("#8cdcf4", { emis: true, line: "#3a7fa8" }), F_MAG = flat("#e47cd0", { emis: true, line: "#8a3f86" }), F_PALE = flat("#e8fff2", { emis: true, line: "#7ce0b8" }), F_DEEP = flat("#4a2f86", { emis: true });

// The cowl and the face in it, facing +x, a quarter turned. C cloth (c a tone
// down, K a tone up: the lip catching the sun), V the violet lip, I the dark
// inside; the face is toned by hand (d deep, s shade, S pale, H highlight),
// e socket, E the eye's light, m the mouth, N the nose.
const HEAD = [
  ".....CCCCCC....",
  "...CCCCCCCCCC..",
  "..CCCCCCCCKKKK.",
  ".CCCCCCKKVVVVVK",
  ".CCCCCKVVIIIIIV",
  "CCCCCKVIIdddddV",
  "CCCCCKVIdsSSSSV",
  "CCCCCKVIseeeeeS",
  "CCCCCKVIseEseEN",
  "CCCCCKVIsHSSSNN",
  "CCCCCKVIdsdSSS.",
  "cCCCCKVIIdmmmS.",
  ".CCCCCKVIIsSS..",
  ".cCCCCKVVIIs...",
  "..CCCCCCKVVV...",
  "..cCCCCCCCC....",
];
const legend = (eye) => ({
  C: { m: COWL }, c: { m: COWL, bias: -1 }, K: { m: COWL, bias: 1 }, V: { m: TRIM }, I: { m: VOID },
  d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, H: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 3 },
  e: { m: SOCK }, E: { m: eye }, m: { m: SKIN, fix: 0 },
});
const LEG = legend(EYE), LEG_DIM = legend(EYE_DIM), LEG_HOT = legend(EYE_HOT);
const SKULL = [".BBBB", "BBBBB", "BeBBe", ".BBBB", ".bBbB"];
const SKULL_LEG = { B: { m: BONE }, b: { m: BONE, bias: -1 }, e: { m: SOCK } };

export const BOX = { w: 84, h: 90, ox: 34, oy: 82 };
export const BONES = scaled(HUMAN, 1.2, { shN: -2.7, shF: 2.9, upper: 7.9, fore: 7.7 });
const STAFF = 43;                      // the shaft, foot to the collar under the prongs

const edgeX = (a, b, y) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

// ragged edges: [t along the edge, how far the cloth is torn up]
const TAT = [[1, 0.5], [0.86, 4.2], [0.72, 0], [0.56, 5], [0.4, 0.3], [0.27, 4], [0.12, 0], [0, 2.4]];
const CTAT = [[9.5, 4], [7.6, 0.6], [6, 5], [4.2, 0], [2.4, 4.6], [0.6, 0.2], [-0.4, 3]];

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2);
  const vy = cl(C[1] - lag1.C[1], -2, 2);
  // the draught: each trailing thing reads it a beat later than the last
  const gu = lag1.p.gust || 0, gu2 = lag2.p.gust || 0;
  const w1 = (lag1.p.sway || 0) - gu * 1.6, w2 = (lag2.p.sway || 0) - gu2 * 2.2;
  const g = p.glow || 0;

  // ---- the cape, behind it all: from the shoulders down the back, its torn foot trailing
  {
    const d1 = -vx * 1.5 - vx2 * 1.2 + w1 * 0.8, d2 = -vx * 1.0 - vx2 * 2.2 + w2 * 1.6 + vy * 0.6;
    const top = C[1] - 1.6, botY = -4.4 + Math.abs(d2) * 0.3, b0 = P[0] - 13 + d2;
    px.part();
    px.poly([[C[0] - 5, top], [C[0] + 1, top], [P[0] + 1, P[1]], [P[0] - 1, botY],
      ...CTAT.map(([x, dp]) => [b0 + x + (dp < 1 ? d2 * 0.3 : 0), botY - dp]),
      [P[0] - 10.6 + d1 * 0.8 + d2 * 0.3, P[1] + 9], [P[0] - 9.6 + d1, P[1] + 7.4], [P[0] - 9 + d1, P[1] + 3], [C[0] - 6.8 + d1 * 0.3, C[1] + 7]], CAPE, 0.4, { round: 0.9 });
    px.toneLine(P[0] - 7.6 + d1, P[1] + 5, b0 + 4.2 + d2 * 0.3, botY - 4, -1, px._pid);
  }

  // ---- the staff, in the far fist: a dark shaft, a small skull, the shard rising from its crown
  const lift = p.lift || 0, hgt = -hdF[1] - lift;
  const tl = p.sx != null ? Math.atan2(hdF[0] - p.sx, hgt) : (p.staff ?? 0);
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)], lo = hgt / Math.cos(tl);
  const foot = [hdF[0] - d[0] * lo, hdF[1] - d[1] * lo], tip = [foot[0] + d[0] * STAFF, foot[1] + d[1] * STAFF];
  const at = (a, b) => [tip[0] + d[0] * a + nn[0] * b, tip[1] + d[1] * a + nn[1] * b];
  px.part();
  px.capsule(foot[0], foot[1], 0.95, tip[0], tip[1], 0.95, WOOD, 1.5, { edge: true });
  px.part();
  px.capsule(...at(-1.8, 0), 1.4, ...at(-0.4, 0), 1.6, BRONZE, 1.55);
  const orb = at(8.6, 0), T = at(13.4, 0), Bm = at(4.4, 0), Lf = at(8, -2.6), Rt = at(8, 2.6), Md = at(8, 0);
  px.part();
  if (g > 0.6) { px.poly([T, Rt, Bm, Lf], GLOW, 1.6); px.poly([at(12, 0), at(8.2, 1.5), at(6, 0), at(8.2, -1.5)], HOT, 1.62); }
  else if (g > 0.3) { px.poly([T, Rt, Bm, Lf], GLOW, 1.6); px.poly([at(10.6, 0), at(8.2, 0.9), at(6.8, 0), at(8.2, -0.9)], HOT, 1.62); }
  else {
    px.poly([T, Md, Bm, Lf], CRYS, 1.6, { n: [-0.55, -0.45, 0.7] });
    px.poly([T, Rt, Bm, Md], CRYS, 1.6, { n: [0.7, 0.35, 0.62] });
    if (g > 0.2) px.dot(...at(9, -0.6), HOT, 1.62); else px.dot(...at(10, -0.9), CRYS, 1.62, { fix: 4 });
  }
  px.part();
  { const s = at(2.4, 0); px.stamp(SKULL, s[0] - 2, s[1] - 2.5, SKULL_LEG, 1.64, { ball: [2.2, 2, 3, 3] }); }

  // ---- the far arm, a tone down, behind the body; its fist on the staff
  {
    const wr = mix(eF, hdF, 0.78), u = unit(eF, hdF), n = [-u[1], u[0]];
    px.part();
    px.capsule(sF[0], sF[1], 2, eF[0], eF[1], 2, COWL, 1, { bias: -1 });
    px.capsule(eF[0], eF[1], 2, wr[0], wr[1], 2.6, COWL, 1, { bias: -1 });
    px.poly([[wr[0] + n[0] * 2.7, wr[1] + n[1] * 2.7], [wr[0] - n[0] * 2.7, wr[1] - n[1] * 2.7], [wr[0] - n[0] * 2.7 + u[0] * 1.3, wr[1] - n[1] * 2.7 + u[1] * 1.3], [wr[0] + n[0] * 2.7 + u[0] * 1.3, wr[1] + n[1] * 2.7 + u[1] * 1.3]], TRIM, 1.02, { bias: -1 });
    px.part(); px.ellipse(hdF[0], hdF[1], 1.8, 2, SKIN, 1.7, { bias: -1 });
    px.dot(hdF[0] + 0.6, hdF[1] - 0.8, SKIN, 1.72);
  }

  // slippers under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 2, an[1] + 1.4, 2.4, 1.1, BOOT, zz, { fix: 1 + b }); }

  // ---- the robe: narrow shoulders to a torn hem shaped by the feet; it trails the body
  const hemY = -0.8, top = C[1] - 2.2;
  const hemF = Math.max(P[0] + 4.8, Math.max(anN[0], anF[0]) + 3.6) - vx * 0.8 + w1 * 0.35;
  const hemB = Math.min(P[0] - 6, Math.min(anN[0], anF[0]) - 3.6) - vx * 1.3 - vx2 * 0.8 + w1 * 0.6;
  const tipD = -vx * 0.6 - vx2 * 0.8 + w2 * 0.7;
  const wF = [P[0] + 4.2, P[1] - 2], wB = [P[0] - 4.7, P[1] - 2];
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 4.2, top], [C[0] + 4.3, top], [C[0] + 5, C[1] + 3], wF,
    ...TAT.map(([t, dp]) => [hm(t) + (dp < 1 ? tipD : tipD * 0.4), hemY - dp]),
    wB, [C[0] - 5.2, C[1] + 3]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  // folds: creases from the cord to the hem, a lit ridge down the front
  px.toneLine(P[0] - 2.4, P[1] + 2, hm(0.3), hemY - 5, -1, robeId);
  px.toneLine(P[0] - 4, P[1] + 4, hm(0.12), hemY - 5, 1, robeId);
  px.toneLine(P[0] + 3, P[1] + 1, hm(0.84), hemY - 5, 1, robeId);
  px.toneLine(C[0] + 3.4, C[1] + 2, P[0] + 3, P[1] - 4, 1, robeId);
  // the violet seam down the front
  px.line(C[0] + 1.6, top + 4, P[0] + 1.2, P[1] - 2, TRIM, 4.04);
  px.line(P[0] + 1.2, P[1] - 2, hm(0.62), hemY - 5, TRIM, 4.04);
  // the cord and its charms: a bronze disc at the front, finger bones at the back hip
  px.poly([[wB[0] - 0.1, P[1] - 3.3], [wF[0] + 0.2, P[1] - 3.3], [wF[0], P[1] - 1.7], [wB[0], P[1] - 1.7]], BRONZE, 4.05, { round: 0.94, bias: -1 });
  const sw = cl(-vx * 1.1 - vx2 * 0.9 + w1 * 0.6, -1.5, 1.5);
  px.part();
  px.line(P[0] + 2.4, P[1] - 1.6, P[0] + 2.4 + sw * 0.6, P[1] + 0.6, BRONZE, 4.2, { fix: 3 });
  // an amulet on his chest
  px.part();
  px.rect(C[0] + 2.2 + sw * 0.5, C[1] + 3.6, 2, 2, BRONZE, 4.3, { fix: 3 });
  px.dot(C[0] + 3.2 + sw * 0.5, C[1] + 4.6, F_TEAL, 4.31);

  // ---- the near arm: long and thin in a belled sleeve with a violet cuff
  const u = unit(eN, hdN), n = [-u[1], u[0]], wr = mix(eN, hdN, 0.76);
  px.part();
  px.capsule(sN[0], sN[1], 2.4, eN[0], eN[1], 2.3, COWL, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.3, wr[0], wr[1], 3.1, COWL, 8, { cast: 2 });
  {
    const hang = 1.4 + 4.6 * Math.abs(u[0]), a = mix(eN, wr, 0.3);
    px.poly([[a[0], a[1] + 1.4], [wr[0] + u[0] * 1.2, wr[1] + u[1] * 1.2 + 2], [a[0] * 0.3 + wr[0] * 0.7 + w1 * 0.7 - vx * 0.9, Math.max(a[1], wr[1]) + hang - vy * 0.6]], COWL, 7.95, { round: 0.6, cast: 1, bias: -1 });
  }
  px.poly([[wr[0] + n[0] * 3.2, wr[1] + n[1] * 3.2], [wr[0] - n[0] * 3.2, wr[1] - n[1] * 3.2], [wr[0] - n[0] * 3.2 + u[0] * 1.4, wr[1] - n[1] * 3.2 + u[1] * 1.4], [wr[0] + n[0] * 3.2 + u[0] * 1.4, wr[1] + n[1] * 3.2 + u[1] * 1.4]], TRIM, 8.02, { bias: 1 });

  // ---- the cowl: its point trails the head and settles
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const gx = hx - 7, gy = hy - 13, bend = cl(vx * 2.2 + vx2 * 1.6 + w2 * 0.6, -2, 3);
  px.part();
  const dr = cl(-vy * 1.3, -1.2, 1.8);       // the point hangs back as the head rises, flicks up as it drops
  px.poly([[gx + 0.4, gy + 5.5], [gx + 0.6, gy + 1.4], [gx + 1.6 - bend * 0.3, gy - 1.8 + dr * 0.3], [gx - 0.4 - bend * 0.8, gy - 3.6 + dr * 0.7], [gx - 2.6 - bend, gy - 3.4 + Math.abs(bend) * 0.4 + dr],
    [gx - 0.2 - bend * 0.8, gy - 5.4 + dr * 0.7], [gx + 3 - bend * 0.4, gy - 4.6 + dr * 0.3], [gx + 6, gy - 1.6], [gx + 11.5, gy + 1.6], [gx + 11, gy + 4]], COWL, 8.95, { round: 0.85, ny: -0.2 });
  px.stamp(HEAD, hx, hy, p.eye > 0.5 ? LEG_HOT : p.eye < -0.5 ? LEG_DIM : LEG, 9, { ax: 7, ay: 13, ball: [6, 7, 8.5, 9], cast: 1 });

  // ---- the near hand over it all: a narrow palm, three bony fingers (hanging loose; they claw upward
  // as he gathers). Set on whole pixels, its fingers on a few fixed bearings, so it never shimmers.
  {
    const c = p.claw ?? 0.1, f0 = [u[0] * (0.6 - 0.1 * c) + 0.2 * c, u[1] * (0.6 - 0.1 * c) + 0.8 - 1.65 * c];
    const fa = Math.round(Math.atan2(f0[1], f0[0]) / (Math.PI / 8)) * (Math.PI / 8);
    const hb = [Math.round(wr[0] + u[0] * 2.6) + 0.5, Math.round(wr[1] + u[1] * 2.6) + 0.5];
    px.part();
    px.ellipse(hb[0], hb[1], 1.7, 1.5, SKIN, 9.5, { cast: 1 });
    for (let i = -1; i <= 1; i++) {
      const a = fa + i * (0.22 + 0.56 * c), L = 3 + c * 0.8, b = [hb[0] + Math.cos(fa) * 0.8, hb[1] + Math.sin(fa) * 0.8];
      px.line(b[0], b[1], b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L, SKIN, 9.5, { bias: i > 0 ? -1 : 0 });
    }
  }

  const k = cl(g, 0, 1.4);
  return {
    light: k > 0.05 ? { x: orb[0], y: orb[1], r: 22 + 34 * cl(k, 0, 1), col: p.flare > 0.5 ? "#a8f4d0" : "#b388ff", k } : null,
    orb, tip, foot, d, nn, hemB, hemF, feet: [P[0], 0],
  };
};

// the spell itself: motes drawn up the staff into the shard, a rune ring turning at his feet
// with grave-light rising off it, and the burst when the shard flares
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "cast" || !info.orb) return;
  const [ox, oy] = info.orb, { d, nn, foot } = info, [cx] = info.feet;
  const COLS = [F_VIO, F_TEAL, F_VIO, F_GOLD, F_VIO, F_CYAN, F_MAG];
  const NL = { noLine: true };
  // motes spiralling up round the staff, each with a short tail
  if (ph > 0.1 && ph < 0.66) {
    const k = (ph - 0.1) / 0.56;
    const at = (u, i) => { const a = u * 7 + i * 2.1, r = (1 - u) * 6.5 + 1.2, h = 5 + u * 46; return [foot[0] + d[0] * h + nn[0] * Math.cos(a) * r, foot[1] + d[1] * h + nn[1] * Math.cos(a) * r + Math.sin(a) * r * 0.3, Math.sin(a)]; };
    for (let i = 0; i < 8; i++) {
      const u = (k * 1.7 + i / 8) % 1;
      if (u > k * 1.25 + 0.1) continue;
      const [x, y, zz] = at(u, i), [tx, ty] = at(Math.max(0, u - 0.045), i), c = COLS[i % COLS.length];
      px.dot(tx, ty, c, 19.5, NL);
      px.dot(x, y, c, 20 + zz);
    }
  }
  // the shard's gleam while it is held high
  if (ph > 0.45 && ph < 0.64) {
    const L = Math.round(ph * 15) % 2 ? 7.5 : 6;
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2, c = Math.cos(a), sn = Math.sin(a); px.line(ox + c * 4.6, oy + 0.6 + sn * 6, ox + c * L, oy + 0.6 + sn * (L + 1.6), F_VIO, 20.4, NL); }
  }
  // the rune ring: a dashed round turning on the ground, lit pixels over a dark under-line
  if (ph > 0.2 && ph < 0.93) {
    const k = cl((ph - 0.2) / 0.27, 0, 1) * cl((0.93 - ph) / 0.1, 0, 1), turn = ph * 26, rx = 5 + 11 * k, ry = 1.4 + 2.8 * k;
    const n = Math.round(rx * 5.2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = cx + 0.5 + Math.cos(a) * rx, y = 0.4 + Math.sin(a) * ry;
      if (Math.sin(a) < 0.25 && x > info.hemB - 6 && x < info.hemF + 1) continue;
      if (Math.abs(x - foot[0]) < 1.6 && Math.sin(a) < 0 && foot[1] > -3) continue;
      const q = (i + turn) % 9;
      if (q >= 6) continue;
      px.dot(x, y + 1, F_DEEP, 19.8, NL);
      px.dot(x, y, q < 1 || ph > 0.62 && ph < 0.76 ? F_PALE : q < 4 ? F_VIO : F_TEAL, 20, NL);
    }
    // grave-light rising off the ring
    for (let i = 0; i < 6; i++) {
      const u = (ph * 3.4 + i * 0.37) % 1, a = i * 1.9 + 0.5, x = cx + Math.cos(a) * rx * 0.92 + Math.sin(u * 5 + i) * 1.1, y = -1 + Math.sin(a) * ry - u * (6 + 9 * k);
      if (k < 0.35 || u > 0.86) continue;
      if (Math.sin(a) < 0 && x > info.hemB - 5 && x < info.hemF + 1) continue;
      px.dot(x, y, u < 0.3 ? F_PALE : F_TEAL, 20, NL); px.dot(x, y + 1, F_TEAL, 20, NL); if (u < 0.55) px.dot(x, y + 2, F_DEEP, 19.9, NL);
    }
  }
  // the flare: a star of light off the shard, then a ring of sparks thrown wide and falling
  if (ph >= 0.64 && ph < 0.9) {
    const t = (ph - 0.64) / 0.26;
    if (t < 0.25) {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, c = Math.cos(a), sn = Math.sin(a), L = i % 2 ? 7.5 : 11;
        px.line(ox + c * 4, oy + sn * 4, ox + c * L, oy + sn * L, i % 2 ? F_TEAL : F_PALE, 20.5, NL);
        if (!(i % 2)) px.dot(ox + c * (L + 1.5), oy + sn * (L + 1.5), F_TEAL, 20.5, NL);
      }
      px.ellipse(ox, oy, 4.3, 4.3, F_PALE, 21);
    } else {
      const r = 5 + t * 14;
      for (let i = 0; i < 12; i++) {
        if (t > 0.5 && i % 2) continue;
        const a = (i / 12) * Math.PI * 2 + 0.26, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r * 0.85 + t * t * 7;
        if (t < 0.5) px.dot(ox + Math.cos(a) * (r - 2), oy + Math.sin(a) * (r - 2) * 0.85, i % 2 ? F_GOLD : F_TEAL, 19.5, NL);
        if (t < 0.8 || i % 4 === 0) px.dot(x, y, i % 3 === 0 ? F_GOLD : i % 3 === 1 ? F_TEAL : F_VIO, 20, t > 0.7 ? NL : {});
      }
    }
  }
};

const READY = { lean: 0.07, hx: 1.5, hy: 0.6, aF: [0.95, 0.72, 0], aN: [0.38, 0.8, 0], fN: [-1.8, 0], fF: [2, 0], staff: 0.05, lift: 0, glow: 0.12, claw: 0.1, sway: 0, eye: 0, flare: 0, gust: 0 };
const TAU = Math.PI * 2;
export const CLIPS = {
  // his blow, for when a soldier reaches him (the game: he "strikes back hard"): the staff
  // drawn back and up, the crystal waking, then driven at the man with a step in
  strike: {
    n: 12, ms: 900, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.3, e: "out", p: { ...READY, rx: -1.4, lean: -0.02, aF: [0.55, 0.7, 0], aN: [0.9, 0.7, 0], staff: -0.26, lift: 3, glow: 0.4, claw: 0.6, eye: 1 } },
      { t: 0.42, e: "io", p: { ...READY, rx: -1.8, lean: -0.05, aF: [0.46, 0.72, 0], aN: [1, 0.72, 0], staff: -0.34, lift: 3.6, glow: 0.55, claw: 0.7, eye: 1 } },
      { t: 0.54, e: "in3", p: { ...READY, rx: 2.2, drop: 1, lean: 0.3, hx: 2.6, hy: 1.4, aF: [1.25, 1, 0], aN: [-0.4, 0.85, 0], fF: [5, 0], staff: 0.9, lift: 7, glow: 0.95, claw: 0.3, eye: 1, gust: 0.6 } },
      { t: 0.66, e: "out", p: { ...READY, rx: 2.6, drop: 1.2, lean: 0.34, hx: 2.8, hy: 1.6, aF: [1.15, 1, 0], aN: [-0.55, 0.85, 0], fF: [5, 0], staff: 1.05, lift: 7, glow: 0.6, eye: 1 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.12,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...READY, rise: 0.7 * u, aF: [0.95, 0.72 - 0.02 * u, 0], aN: [0.38 + 0.04 * b, 0.8, 0], sway: Math.sin(ph * TAU + 0.8), glow: 0.14 + 0.2 * Math.max(0, Math.sin(ph * TAU - 1.2)), eye: ph > 0.7 && ph < 0.8 ? -1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 960, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 3.6, lift: 1.6, swing: 0.1, bob: 0.8, lean: 0.15 }), a = Math.cos(ph * TAU);
      // the staff's foot: planted while the body passes it, then swung on ahead
      const q = ph, pl = 0.62, sx = q < pl ? 17.6 - 14.4 * q : 17.6 - 14.4 * pl + (14.4 * pl) * (0.5 - 0.5 * Math.cos(((q - pl) / (1 - pl)) * Math.PI));
      const lift = q < pl ? 0 : Math.sin(((q - pl) / (1 - pl)) * Math.PI) * 2.4;
      return { ...w, hx: 1.6, hy: 0.8, aF: [0.97 + 0.1 * Math.cos((ph - 0.08) * TAU), 0.72, 0], aN: [0.36 - a * 0.12, 0.8, 0], sx, lift, glow: 0.1, claw: 0.15 };
    },
  },
  cast: {
    n: 16, ms: 1400, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      // anticipation: he sinks and draws in, the free hand curling
      { t: 0.133, e: "out", p: { ...READY, drop: 0.9, lean: 0.17, hx: 1.7, hy: 1.3, aF: [0.5, 0.66, 0], aN: [0.7, 0.62, 0], staff: 0.06, glow: 0.25, claw: 0.55 } },
      // gather: the hand rises clawed before him, the shard wakes
      { t: 0.333, e: "io", p: { ...READY, drop: 0.3, lean: 0.07, aF: [0.74, 0.74, 0], aN: [1.5, 0.78, 0], staff: -0.03, lift: 1.5, glow: 0.5, claw: 1 } },
      // the staff thrust high
      { t: 0.467, e: "out", p: { ...READY, rx: -0.8, rise: 1.2, lean: -0.05, hx: 0.6, hy: -0.6, aF: [2.02, 0.88, 0], aN: [1.3, 0.86, 0], staff: -0.08, lift: 13, glow: 0.9, claw: 1, eye: 1, sway: 0.6 } },
      // held there, still climbing a little
      { t: 0.6, e: "io", p: { ...READY, rx: -1, rise: 1.7, lean: -0.08, hx: 0.5, hy: -0.9, aF: [2.1, 0.91, 0], aN: [1.18, 0.9, 0], staff: -0.1, lift: 14.5, glow: 1, claw: 1, eye: 1, sway: -0.6 } },
      // the flare: a last jab upward, the free hand thrown out at the ground before him
      { t: 0.667, e: "in3", p: { ...READY, rx: 0.5, rise: 2.2, lean: 0.05, hx: 1, hy: -0.2, aF: [2.2, 0.97, 0], aN: [1.0, 1, 0], staff: 0, lift: 16.5, glow: 1.35, claw: 0, eye: 1, flare: 1, gust: 1 } },
      { t: 0.733, e: "out", p: { ...READY, rx: 0.9, rise: 1.2, drop: 0.4, lean: 0.11, hx: 1.3, hy: 0.4, aF: [2.05, 0.93, 0], aN: [0.84, 0.98, 0], staff: 0.04, lift: 14.5, glow: 0.95, claw: 0, eye: 1, flare: 1, gust: 0.7 } },
      // he draws the staff back down
      { t: 0.9, e: "io", p: { ...READY, rx: 0.3, drop: 0.8, lean: 0.14, hx: 1.6, hy: 1, aF: [1.0, 0.74, 0], aN: [0.42, 0.86, 0], staff: 0.06, lift: 0, glow: 0.3, claw: 0.1, gust: -0.25 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
