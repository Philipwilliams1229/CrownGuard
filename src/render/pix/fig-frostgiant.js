// ============ FIGURE: the Frost Giant (game type `frostgiant`) ============
// A hill of blue hide and hoarfrost: about 66 px to the crown and very broad. Blue-grey skin, a
// shaggy frost-white mane and a long forked beard, a heavy brow over cold pale eyes, a great
// dingy-white fur mantle round the shoulders (rime on it), a hide kilt hemmed in fur, iron cuffs on
// the wrists, big bare feet bound in fur. For a club he drags the jawbone of a whale, crusted with
// ice at its heavy end, its tooth-sockets in a row down one side.
// Clips: idle (slow breath, the jawbone resting on the ground, a turn of the head), walk (a slow
// heavy tread, the bone trailing behind him and scraping), attack (THE STOMP: both fists haul the
// bone up behind his head and the near-far knee comes up; one step in and the foot and the bone
// come down together, the ground cracking and ice bursting up round them, then he drags it back).
// The engine's `stomp` (dazing soldiers about him) is on its own clock; this is the blow.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled, ik } from "./rig.js";

const SKIN = mat("#7f93ab"), BELLY = mat("#93a7be"), KILT = mat("#5e4a3a"), KILT_D = mat("#43362c"), FUR = mat("#c6c6bc"), FURB = mat("#8a7860"), HAIR = mat("#e6eef2");
const IRON = mat("#6a727e", { contrast: 1.2 }), BONE = mat("#e6dcc4"), BONE_D = mat("#b4a888"), ICE = mat("#cfe9f6", { contrast: 1.2 }), NAIL = mat("#c8c2a0");
const EYE = flat("#bfe8ff", { emis: true }), GLINT = flat("#ffffff", { emis: true }), MOUTH = flat("#241a2c"), FROST = flat("#eaf6ff");
const SMEAR1 = flat("#f4f8ff", { emis: true, line: "#b8c8d8" }), SMEAR2 = flat("#c6d8ea", { emis: true, line: "#98acc0" });
const SNOW = flat("#f2f6fa", { line: "#b8c8d8" }), SNOW2 = flat("#d4e0ec", { line: "#9cb0c4" }), SHARD = flat("#b8dcee", { emis: true, line: "#6a9cc0" }), SHARD2 = flat("#e4f4fc", { emis: true, line: "#88b4d0" });
const CRACK = flat("#3a4e66"), CRACK2 = flat("#d8eaf6");

// The head, facing +x, a quarter turned: a shaggy white mane over the crown and down the back (H, h a
// tone down), a heavy ridge of brow (B) over cold pale eyes (Y, E a glint), a broad nose proud of the
// face (N, its shine L, the nostril n), then the beard (W, w a tone down), forked, with the mouth (X) in it.
const HEAD = [
  "......HHHHHH.....",
  "....HHHHHHHHHH...",
  "...HHHHHHHHHHHH..",
  "..HHHHGGGGGGGGG..",
  "..HHHGGGGGGGGGGGG",
  ".HHHHGBBBBBBGGBBB",
  ".HHHGGgbYBGGGBYBG",
  ".HHhGGGbYYGNNNNYG",
  ".HhhGGGGGGNNLLNNm",
  ".HhhGGGGGgNNNNNNm",
  ".HhhGGWWWWWWWWWWW",
  "..hhGWWWWWWWWWWWw",
  "..hhhWWWWWWWWWWw.",
  "...hhwWWWWWWWWWw.",
  "....hwwWWWWWWWw..",
  ".....wwwWWWWWw...",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 6: ".HHHGGgGGGGGGGGGG", 7: ".HHhGGGGBBGNNNNBG" });
// the roar: the beard parted over a dark mouth, the eyes flaring
const ROAR = swap(HEAD, { 6: ".HHHGGgbYYGGGBYYG", 7: ".HHhGGGbYEGNNNNEG", 10: ".HhhGGWWWXXXXXXWW", 11: "..hhGWWWXXXXXXXXw", 12: "..hhhWWWWXXXXXWw." });
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE }, E: { m: GLINT },
  N: { m: SKIN, fix: 3 }, L: { m: SKIN, fix: 4 }, m: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 0 }, X: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: -1 }, W: { m: HAIR, fix: 3 }, w: { m: HAIR, fix: 2 },
};

export const BOX = { w: 180, h: 116, ox: 80, oy: 108 };
export const BONES = scaled(HUMAN, 1.5, { thigh: 9.8, shin: 9.2, ankle: 3, spine: 31, neck: 0, upper: 20, fore: 20, shN: -11.5, shF: 10.5, hipN: -5.2, hipF: 5.2 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the jawbone: 0 = straight up, PI/2 level before him, minus = behind him. CL from the fist to the middle of
// its heavy end. Its end never sinks into the ground: asked to, it lies ON it (that is how it drags and rests).
const CL = 29, FLOOR = 5;
const clubOf = (sk) => {
  let a = sk.p.club ?? -1.9;
  const h = sk.hdN, c = (h[1] + FLOOR) / CL;
  if (c > -1 && h[1] - Math.cos(a) * CL > -FLOOR) a = (Math.sin(a) >= 0 ? 1 : -1) * Math.acos(Math.min(1, c));
  const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  return (f, s = 0) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, hdN, hN, hF, kN, kF, anN, anF, B } = sk;
  const vx = cl(N[0] - lag1.N[0], -3, 3), vy = cl(N[1] - lag1.N[1], -3, 3);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -3, 3), vy2 = cl(lag1.N[1] - lag2.N[1], -3, 3);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const K = clubOf(sk), g2 = p.grip2 || 0;

  // the far arm, a tone down: it hangs to the knee, or reaches across to the bone
  const tgt = mix(sk.hdF, K(9, 0), g2), fa = ik(sF[0], sF[1], tgt[0], tgt[1], B.upper, B.fore, 1), eF = fa.mid, hdF = fa.end;
  const fz = 1;
  px.part();
  px.capsule(sF[0], sF[1] + 1, 5.8, eF[0], eF[1], 4.8, SKIN, fz, { bias: -1 });
  px.capsule(eF[0], eF[1], 4.6, hdF[0], hdF[1], 5.1, SKIN, fz, { bias: -1 });
  const cu = mix(eF, hdF, 0.7);
  px.capsule(cu[0], cu[1], 5.2, hdF[0], hdF[1], 5.2, IRON, fz + 0.05, { bias: -1, floor: 1 });
  px.part();
  px.ellipse(hdF[0], hdF[1] + 0.4, 4.8, 4.4, SKIN, g2 > 0.5 ? 8.25 : fz + 0.1, { bias: -1 });

  // two legs like pillars, bare feet bound in fur: fur wrapped round the shin, pale nails
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 6, kn[0], kn[1], 4.8, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 4.6, an[0], an[1], 3.8, SKIN, z, { bias: b });
    const w0 = mix(kn, an, 0.5);
    px.capsule(w0[0] - 0.2, w0[1], 4.8, an[0], an[1] - 0.6, 4.4, FURB, z + 0.03, { bias: b });
    px.capsule(an[0] - 2.4, an[1] + 0.6, 3, an[0] + 8, an[1] + 1.3, 2.3, SKIN, z + 0.03, { bias: b });
    px.capsule(an[0] - 1, an[1] - 0.4, 2.4, an[0] + 3.4, an[1] + 0.4, 2.2, FURB, z + 0.04, { bias: b });
    for (const x of [5.6, 7.8, 9.8]) px.dot(an[0] + x, an[1] + 2.2, NAIL, z + 0.04, { fix: b ? 2 : 3 });
  }

  // the hide kilt, its ragged hem hung with fur, a beat behind the hips
  const kh = P[1] + 10, kf = P[0] + 10.6 - bx * 1.4 - bx2 * 0.8, kb = P[0] - 10.6 - bx * 1.8 - bx2 * 1.2, km = (t) => kb + (kf - kb) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[P[0] - 10, P[1] - 2], [P[0] + 10.2, P[1] - 2], [kf, kh - 1.6], [km(0.9), kh + 1.4], [km(0.78), kh - 1], [km(0.62), kh + 2.2], [km(0.48), kh - 0.4], [km(0.32), kh + 1.8], [km(0.16), kh - 0.6], [kb, kh - 2.4]], KILT, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(P[0] + 3, P[1] + 1, km(0.66), kh - 1, -1, kiltId);
  px.toneLine(P[0] - 4, P[1] + 1, km(0.3), kh - 1.4, -1, kiltId);
  for (const t of [0.12, 0.26, 0.42, 0.58, 0.74, 0.88]) px.dot(km(t), kh + 0.8 + (t * 10 % 2), FURB, 3.65, { fix: 3 });

  // the trunk: a broad barrel of chest under a hump of shoulder, the far shoulder showing past the head
  px.part();
  px.ellipse(sF[0] - 2, sF[1] + 1.6, 7.6, 7, SKIN, 3.9, { bias: -1 });
  px.part(); const bodyId = px._pid;
  px.poly([[C[0] - 13, C[1] + 2], [C[0] - 9, C[1] - 4.4], [C[0] + 6, C[1] - 4.4], [C[0] + 12.6, C[1] + 1], [C[0] + 14, C[1] + 9], [mix(C, P, 0.5)[0] + 13, mix(C, P, 0.5)[1]],
    [P[0] + 11, P[1] - 6], [P[0] + 9.6, P[1] + 0.6], [P[0] - 9.4, P[1] + 0.6], [P[0] - 11, P[1] - 8], [mix(C, P, 0.5)[0] - 13, mix(C, P, 0.5)[1]], [C[0] - 14, C[1] + 9]], SKIN, 4, { round: 0.92, cast: 1 });
  px.ellipse(C[0] - 4, C[1] - 2.4, 10, 6.6, SKIN, 4, { cast: 1 });
  px.toneLine(C[0] + 3, C[1] + 12.4, C[0] + 12.6, C[1] + 11.4, -1, bodyId);       // under the chest
  const bl = mix(C, P, 0.7);
  px.part(); const bellyId = px._pid;
  px.ellipse(bl[0] + 4, bl[1] + 0.6, 9.6, 8.2, BELLY, 4.05, { cast: 1 });
  px.toneLine(bl[0] - 2, bl[1] + 7, bl[0] + 9, bl[1] + 7.6, -1, bellyId);
  // the belt: hide and a bone toggle
  px.part();
  px.capsule(P[0] - 10, P[1] - 1.6, 1.4, P[0] + 10.2, P[1] - 1.4, 1.4, KILT_D, 4.08);
  px.rect(P[0] + 4.4, P[1] - 4, 3, 4.4, BONE, 4.12, { fix: 3 });
  px.dot(P[0] + 5.4, P[1] - 2.6, KILT_D, 4.14, { fix: 1 });

  // the head, sunk between the shoulders
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  // the beard's braid and tail, a beat behind the head
  const sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2.5, 2.5);
  px.part();
  px.capsule(hx + 6, hy + 2.4, 2.6, hx + 6 - sway * 0.4, hy + 7.6 - hop * 0.3, 2.4, HAIR, 5.2);
  px.capsule(hx + 6 - sway * 0.4, hy + 7.6 - hop * 0.3, 2.4, hx + 5.4 - sway * 0.9, hy + 12.4 - hop * 0.5, 1.6, HAIR, 5.2);
  px.dot(hx + 5.2 - sway, hy + 14, ICE, 5.3, { fix: 3 });
  px.part();
  px.stamp(p.blink ? BLINK : p.roar > 0.5 ? ROAR : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 13, ball: [8.5, 8, 9, 9], cast: 1 });
  // frost on the brow and in the beard, and a few icicles hanging from it
  for (const [x, y] of [[-0.5, -8.6], [2, -9.2], [5.6, -7.8], [8.2, -4.6]]) px.dot(hx + x, hy + y, FROST, 6.2, { noLine: true });
  px.dot(hx + 8, hy + 2, ICE, 6.3, { fix: 3 }); px.dot(hx + 5, hy + 3.4, ICE, 6.3, { fix: 3 });
  // two tufts of mane flicking behind the head
  px.part();
  px.capsule(hx - 5.6, hy - 9.6, 1.6, hx - 8.4 - sway * 0.7, hy - 4.6 - hop * 0.4, 1.1, HAIR, 6.15);
  px.capsule(hx - 3.6, hy - 12, 1.4, hx - 8 - sway * 0.5, hy - 9 - hop * 0.3, 1, HAIR, 6.15);

  // the mantle: a huge shaggy fur across the shoulders, its tufts hanging, rime on it
  px.part();
  px.ellipse(C[0] + 0.4, C[1] + 0.8, 14.6, 6.4, FUR, 4.4, { cast: 1 });
  for (const x of [-12, -9, -6, -3, 0, 3, 6, 9, 12]) px.dot(C[0] + 0.4 + x, C[1] + 6.6 - Math.abs(x) * 0.12 + ((x & 1) ? 1 : 0), FUR, 4.4);
  for (const x of [-10, -5, 0, 5, 10]) px.dot(C[0] + x, C[1] + 8.4 + (x & 1), FURB, 4.42, { fix: 2 });
  for (const [x, y] of [[-8, -1.6], [-3, -2.6], [2, -2.4], [7, -0.8], [11, 2]]) px.dot(C[0] + x, C[1] + y, FROST, 4.46, { noLine: true });
  // the string of knuckle-bones across the chest
  px.part();
  const nk = [[2.4, 5.4], [4.8, 7.4], [7.4, 8.4], [10, 8.2], [12, 6.6]];
  for (let i = 0; i < nk.length; i++) px.dot(C[0] + nk[i][0], C[1] + nk[i][1], i % 2 ? BONE : KILT_D, 4.5, { fix: i % 2 ? 3 : 1 });

  // the jawbone: a long whale's jaw, bone-white, a hooked heavy end crusted with ice, the tooth-sockets in a row down it
  px.part(); const clubId = px._pid;
  px.capsule(...K(-4), 1.7, ...K(12), 2.3, BONE, 8.1, { edge: true });
  px.capsule(...K(12), 2.4, ...K(CL), 4.6, BONE, 8.1, { edge: true });
  px.capsule(...K(CL - 6, 3.2), 2.2, ...K(CL + 3, 5.2), 2.6, BONE, 8.09, { edge: true });         // the hook of the jaw
  px.ellipse(...K(CL + 3.6), 3, 3, BONE_D, 8.12, { fix: 2 });
  for (const f of [15, 18, 21, 24, 27]) px.dot(...K(f, -2.1), BONE_D, 8.14, { fix: 0 });           // the tooth-sockets
  px.toneLine(...K(14, 1.4), ...K(26, 2.4), -1, clubId);
  // the ice crust on the heavy end
  px.part();
  px.poly([K(CL - 8, -3.4), K(CL - 2, -5.4), K(CL + 4, -4.2), K(CL + 5, -1), K(CL - 5, -0.6)], ICE, 8.2, { round: 0.6, cast: 0, fix: 3 });
  for (const [f, s] of [[CL - 5, 4.4], [CL - 1, 5], [CL + 3, 4.6]]) px.poly([K(f - 1.2, s), K(f + 1.2, s), K(f + 0.2, s + 3.4)], ICE, 8.2, { fix: 3 });
  px.dot(...K(CL - 4, -4.6), FROST, 8.3, { noLine: true });

  // the near arm over it all: a boulder of shoulder in fur, a forearm thicker than the arm, an iron cuff, a fist like a ham
  // (hauled up over his head the arm passes BEHIND it, so the face stays open)
  const az = (p.nb || 0) > 0.5 ? 5.5 : 7.9;
  px.part();
  px.capsule(sN[0], sN[1] + 2, 6.2, eN[0], eN[1], 5, SKIN, az, { cast: 1 });
  px.capsule(eN[0], eN[1], 4.8, hdN[0], hdN[1], 5.6, SKIN, az, { cast: 1, edge: true });
  const wc = mix(eN, hdN, 0.7);
  px.capsule(wc[0], wc[1], 5.4, hdN[0], hdN[1], 5.4, IRON, az + 0.05, { cast: 1, floor: 1 });
  px.part(); const shId = px._pid;
  px.ellipse(sN[0] - 0.6, sN[1] + 0.4, 9, 7.8, FUR, 8, { cast: 1 });
  for (const x of [-7, -4.4, -1.8, 0.8, 3.4]) px.dot(sN[0] + x, sN[1] + 7.6 + ((x * 2 | 0) & 1), FUR, 8);
  for (const [x, y] of [[-4.6, -4.6], [-1, -5.8], [2.4, -4.6], [-6.4, -2]]) px.dot(sN[0] + x, sN[1] + y, FROST, 8.05, { noLine: true });
  // ice crystals standing on the shoulder
  px.poly([[sN[0] - 5.4, sN[1] - 5.2], [sN[0] - 3.4, sN[1] - 5.8], [sN[0] - 4.6, sN[1] - 11.2]], ICE, 8.1, { fix: 3 });
  px.poly([[sN[0] - 2.6, sN[1] - 6], [sN[0] - 0.4, sN[1] - 6], [sN[0] - 0.8, sN[1] - 9.6]], ICE, 8.1, { fix: 2 });
  px.toneLine(sN[0] - 5, sN[1] + 6.4, sN[0] + 4, sN[1] + 6.6, -1, shId);
  px.part();
  px.ellipse(hdN[0], hdN[1] + 0.4, 5.2, 4.8, SKIN, 8.3, { edge: true });
  px.dot(hdN[0] + 2.4, hdN[1] - 1, SKIN, 8.31, { fix: 1 }); px.dot(hdN[0] + 3, hdN[1] + 1.4, SKIN, 8.31, { fix: 1 });

  return { head: K(CL + 2, 0) };
};

// the stomp: one crescent behind the bone's end on its fast frame, then the ground it broke:
// cracks running out along the ground, ice shards thrown up, a low roll of snow
const T0 = 8 / 15, HIT = 9 / 15;       // the last held frame, and the frame the bone lands on (of 16)
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const { ph } = F;
  if (ph > HIT - 0.01 && ph < HIT + 0.02) {
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) {
      const prog = 1 - 0.42 * (i / n), K = clubOf(F.at(T0 + (HIT - T0) * Math.cbrt(prog)));
      pts.push([K(CL + 6, 0), K(CL - 16, 0)]);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const t = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      px.poly([pts[i][0], pts[i + 1][0], mix(pts[i + 1][1], pts[i + 1][0], t1 ** 1.3), mix(pts[i][1], pts[i][0], t ** 1.3)], t < 0.4 ? SMEAR1 : SMEAR2, 20 - t, { noLine: true });
    }
  }
  if (ph >= HIT - 0.005 && ph < HIT + 0.32) {
    const t = (ph - HIT) / 0.32, K = clubOf(F.at(HIT)), [x, y0] = K(CL + 2, 0), y = Math.min(-1, y0 + 4);
    // the ground cracking: dark seams with a bright lip, running out both ways from the bone
    const reach = 6 + 36 * Math.sqrt(Math.min(1, t * 1.6));
    for (const [s, dy, k] of [[1, 0, 1], [-1, 0.6, 0.8], [1, 1.2, 0.55], [-1, 1.6, 0.4]]) {
      const x1 = x + s * reach * k, mid = x + s * reach * k * 0.5;
      px.line(x, -0.6 + dy, mid, -1.4 + dy, CRACK, 19, { noLine: true }); px.line(mid, -1.4 + dy, x1, -0.4 + dy * 0.5, CRACK, 19, { noLine: true });
      px.line(x, -1.6 + dy, mid, -2.2 + dy, CRACK2, 19.1, { noLine: true });
    }
    // ice shards thrown up and out, tumbling back down
    for (let i = 0; i < 11; i++) {
      const dir = (i - 5) * 0.34 + 0.05, sp = 9 + ((i * 37) % 5) * 2.6;
      const cx = x + Math.sin(dir) * sp * t * 1.5, cy = Math.min(0, y - Math.cos(dir) * sp * t * 3 + 30 * t * t);
      if (i % 3 === 0) px.poly([[cx - 1, cy], [cx + 1, cy], [cx, cy - 4]], SHARD, 20, { noLine: false }); else px.dot(cx, cy, i % 3 === 1 ? SHARD2 : SNOW, 20, { noLine: i % 2 === 0 });
    }
    // a low roll of snow along the ground, thinning as it goes
    if (t < 0.85) {
      const r = 2.6 + 3.2 * Math.sqrt(t), fade = t > 0.45;
      for (const [s, k] of [[-1, 1], [1, 1], [-1, 0.5], [1, 0.5]]) {
        const dx = s * (3 + 12 * Math.sqrt(t)) * k, rr = r * (k < 1 ? 0.8 : 1) * (fade ? 0.7 : 1);
        px.ellipse(x + dx, -1.2 - rr * 0.4 - t * 3 * k, rr * 1.5, rr * 0.75, k < 1 || fade ? SNOW2 : SNOW, 19.5 + k, { noLine: true });
      }
    }
  }
};

const GUARD = { rx: -3, drop: 2, lean: 0.24, twist: 0, hx: 7, hy: 0, rise: 0, aN: [-0.08, 0.97, 0], aF: [0.2, 0.95, 0], fN: [-6, 0], fF: [6.5, 0], club: -1.9, grip2: 0, roar: 0, nb: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2800, loop: true,
    lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.2);
      // half way through the breath he turns his head to look along the road
      const tilt = ph >= 0.5 && ph < 0.78 ? 1 : 0;
      return {
        ...GUARD, rise: 2 * u, rx: -3 + 0.8 * s, hx: 7 + tilt * 1.4, hy: 0.6 * (1 - u) + tilt * 0.6, lean: 0.24 - 0.02 * b,
        aN: [-0.08 - 0.012 * b, 0.97 - 0.02 * u, 0], aF: [0.2 + 0.03 * s, 0.95, 0],
        blink: ph >= 0.1 && ph < 0.2 ? 1 : 0,
      };
    },
  },
  walk: {
    n: 8, ms: 1400, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.8, lift: 2.4, swing: 0.22, bob: 2.4, lean: 0.2 }), a = Math.cos(ph * TAU), c2 = Math.cos(ph * TAU * 2);
      return {
        ...w, rx: -3, drop: w.drop + 1.4, lean: 0.24 - 0.04 * c2, twist: -a * 1.4, hx: 7, hy: 0.6 * (0.5 + 0.5 * c2), rise: 0,
        aN: [-0.1 - a * 0.1, 0.96, 0], aF: [0.1 + a * 0.3, 0.95, 0], club: -1.9, grip2: 0, roar: 0, nb: 0,
      };
    },
  },
  attack: {
    n: 16, ms: 1150, loop: false, lag: 0.05,
    // the near arm and the bone each turn ONE way through the clip (up from behind, over the top, down before him,
    // round past his leg to trail again), so their angles run on past a full turn and no ease unwinds them
    pose: (ph) => {
      const p = sampleKeys([
        { t: 0, p: GUARD },
        // he sinks and takes the weight: the bone leaves the ground behind him
        { t: 0.12, e: "io", p: { ...GUARD, rx: -2, drop: 4, lean: 0.34, aN: [-0.3, 0.9, 0], aF: [0.5, 0.8, 0], club: -1.5 } },
        { t: 0.24, e: "io", p: { ...GUARD, rx: -3.6, drop: 2.6, lean: 0.14, twist: -0.3, aN: [-1.25, 0.46, 0], aF: [1.2, 0.7, 0], club: -1.1, grip2: 0.4, fF: [6.5, 3] } },
        // the heave: bone up behind his head in both fists, the front knee hauled up to stamp
        { t: 0.38, e: "out", p: { ...GUARD, rx: -5, drop: 0.6, rise: 2, lean: -0.1, twist: -0.6, hx: 6, hy: -1, aN: [2.9 - TAU, 0.5, 0], nb: 1, fF: [6.5, 9], club: -0.95, grip2: 1 } },
        // ... held there, still tipping back, roaring
        { t: T0, e: "io", p: { ...GUARD, rx: -6, drop: 0.2, rise: 2.8, lean: -0.16, twist: -0.8, hx: 5.6, hy: -1.4, aN: [3.02 - TAU, 0.53, 0], nb: 1, fF: [6.8, 11], club: -1.25, grip2: 1, roar: 1 } },
        // the stomp, in one frame: foot and bone come down together
        { t: HIT, e: "in3", p: { ...GUARD, rx: 2, drop: 4.8, lean: 0.4, twist: 1.5, hx: 8, hy: 1.6, aN: [0.3 - TAU, 0.76, 0], fF: [11, 0], club: 2.0, grip2: 1, roar: 1 } },
        // the recoil: the ground shakes him, he sinks behind it
        { t: 0.67, e: "out", p: { ...GUARD, rx: 2.6, drop: 5.8, lean: 0.44, twist: 1.6, hx: 8.4, hy: 2.2, aN: [0.36 - TAU, 0.72, 0], fF: [11, 0], club: 1.84, grip2: 1, roar: 1 } },
        { t: 0.76, e: "io", p: { ...GUARD, rx: 2.2, drop: 4.8, lean: 0.4, twist: 1.5, hx: 8, hy: 1.8, aN: [0.3 - TAU, 0.76, 0], fF: [11, 0], club: 2.0, grip2: 1 } },
        // he straightens, dragging the bone back to his feet
        { t: 0.9, e: "io", p: { ...GUARD, rx: -1, drop: 2.6, lean: 0.3, twist: 0.4, hy: 0.6, aN: [0.1 - TAU, 0.62, 0], fF: [8.4, 0.8], club: 2.9, grip2: 0 } },
        { t: 1, e: "out", p: { ...GUARD, aN: [-0.08 - TAU, 0.97, 0], club: -1.9 + TAU } },
      ], ph);
      // the blow comes back up his arms
      if (ph > HIT + 0.01 && ph < 0.8) { const k = (0.8 - ph) / 0.2, s = Math.sin(ph * 110); p.hx += s * 0.8 * k; p.twist += s * 0.3 * k; }
      return p;
    },
  },
};
void ik;
