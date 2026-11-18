// ============ CONCEPT: a sprite-stacked goblin (2026-11-17, owner: "I'm interested to see how it would work") ============
// Sprite stacking: a figure built as a pile of thin flat slices, one picture per
// height, drawn bottom to top, each nudged up a little and every one rotated
// to the heading. So the figure turns to ANY angle without a single new drawing.
// Here the slices come from a small voxel model (1 voxel = 1 art pixel) of the
// Greenwood goblin, posed by the goblin's OWN walk skeleton (rig.js solve on
// fig-goblin.js's walk clip): hood, flopping hood point, long ears, red eyes,
// hooked nose, teeth, knife in the near fist, round shield on the far arm.
// Shading is done per heading against one fixed sun (upper left, as the game's),
// then a one-pixel tinted outline round the whole, as the pix figures have.
//   voxelGoblin(ph)                    -> the model at walk phase ph (cached per frame)
//   stackSprite(f, yaw, elev)          -> { cv, ox, oy } the composed figure, feet at (ox, oy)
// yaw: radians, 0 = facing screen right, PI/2 = walking down the screen (toward you).
// elev: the camera's angle above the ground, degrees (90 = straight down).
import { solve } from "/src/render/pix/rig.js";
import * as gob from "/src/render/pix/fig-goblin.js";

// ---- the voxel grid --------------------------------------------------------------
const X0 = -18, X1 = 22, Y0 = -13, Y1 = 13, Z1 = 44;           // x forward, y toward the near side, z up
const NX = X1 - X0, NY = Y1 - Y0, NZ = Z1;
const idx = (x, y, z) => (z * NY + (y - Y0)) * NX + (x - X0);

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const SHADE = hex("#2a1c34"), LIGHT = hex("#fff0c8");
// five tones a material, hue-shifted: shadows lean plum, lights lean cream (as pix.js)
const ramp = (h) => { const c = hex(h); return [mixc(c, SHADE, 0.55), mixc(c, SHADE, 0.3), c, mixc(c, LIGHT, 0.18), mixc(c, LIGHT, 0.38)]; };
const MATS = [
  null,
  ramp("#6aa04f"),   // 1 skin
  ramp("#5a4630"),   // 2 hood
  ramp("#6a4a2a"),   // 3 jerkin
  ramp("#3c2a18"),   // 4 dark leather
  ramp("#8a8a92"),   // 5 steel
  ramp("#8a6238"),   // 6 wood
  [hex("#a02a20"), hex("#c03424"), hex("#d8402e"), hex("#e85a3e"), hex("#ffb070")],   // 7 eye
  ramp("#2c1a22"),   // 8 mouth
  ramp("#ece0c4"),   // 9 bone
];
const SKIN = 1, HOOD = 2, JERK = 3, DARK = 4, STEEL = 5, WOOD = 6, EYE = 7, MOUTH = 8, BONE = 9;

// ---- solids ---------------------------------------------------------------------------
class Model {
  constructor() { this.m = new Uint8Array(NX * NY * NZ); }
  set(x, y, z, mat, over) {
    if (x < X0 || x >= X1 || y < Y0 || y >= Y1 || z < 0 || z >= NZ) return;
    const i = idx(x, y, z);
    if (over || !this.m[i]) this.m[i] = mat;
  }
  // every voxel whose centre lies inside test(x, y, z), over a box
  fill(b, test, mat, over = false) {
    for (let z = Math.max(0, Math.floor(b[4])); z <= Math.min(NZ - 1, Math.ceil(b[5])); z++)
      for (let y = Math.max(Y0, Math.floor(b[2])); y <= Math.min(Y1 - 1, Math.ceil(b[3])); y++)
        for (let x = Math.max(X0, Math.floor(b[0])); x <= Math.min(X1 - 1, Math.ceil(b[1])); x++) {
          const m = test(x + 0.5, y + 0.5, z + 0.5);
          if (m) this.set(x, y, z, typeof m === "number" ? m : mat, over);
        }
  }
  // a capsule from a to b, radius r0 at a easing to r1 at b; mat may be a function of t along it
  capsule(a, b, r0, r1, mat, over) {
    const r = Math.max(r0, r1), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1e-6;
    const box = [Math.min(a[0], b[0]) - r, Math.max(a[0], b[0]) + r, Math.min(a[1], b[1]) - r, Math.max(a[1], b[1]) + r, Math.min(a[2], b[2]) - r, Math.max(a[2], b[2]) + r];
    this.fill(box, (x, y, z) => {
      let t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const q = [a[0] + d[0] * t - x, a[1] + d[1] * t - y, a[2] + d[2] * t - z], rr = r0 + (r1 - r0) * t;
      return q[0] ** 2 + q[1] ** 2 + q[2] ** 2 <= rr * rr ? (typeof mat === "function" ? mat(t) : mat) : 0;
    }, typeof mat === "function" ? 1 : mat, over);
  }
  ellipsoid(c, rx, ry, rz, mat, over, keep) {
    this.fill([c[0] - rx, c[0] + rx, c[1] - ry, c[1] + ry, c[2] - rz, c[2] + rz], (x, y, z) => {
      const u = (x - c[0]) / rx, v = (y - c[1]) / ry, w = (z - c[2]) / rz;
      return u * u + v * v + w * w <= 1 && (!keep || keep(x - c[0], y - c[1], z - c[2])) ? mat : 0;
    }, mat, over);
  }
  // a flat disc: centre c, unit normal n, radius r, thickness th
  disc(c, n, r, th, mat, over) {
    const R = r + th;
    this.fill([c[0] - R, c[0] + R, c[1] - R, c[1] + R, c[2] - R, c[2] + R], (x, y, z) => {
      const p = [x - c[0], y - c[1], z - c[2]], h = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
      const q2 = p[0] ** 2 + p[1] ** 2 + p[2] ** 2 - h * h;
      return Math.abs(h) <= th / 2 && q2 <= r * r ? (typeof mat === "function" ? mat(Math.sqrt(q2) / r, h) : mat) : 0;
    }, 1, over);
  }
}

// ---- the goblin, posed --------------------------------------------------------------------
const MODELS = new Map();
export const WALK_N = gob.CLIPS.walk.n, WALK_MS = gob.CLIPS.walk.ms;

export const voxelGoblin = (f) => {
  if (MODELS.has(f)) return MODELS.get(f);
  const clip = gob.CLIPS.walk, B = gob.BONES, ph = f / clip.n;
  const at = (q) => solve(clip.pose(((q % 1) + 1) % 1), B);
  const sk = at(ph), lag = at(ph - 0.1);
  const M = new Model();
  // the 2D skeleton (x forward, y down) -> 3D (x forward, y to the near side, z up)
  const up = (p) => [p[0], -p[1]];
  const from = (base3, base2, p2) => [base3[0] + (p2[0] - base2[0]), base3[1], base3[2] - (p2[1] - base2[1])];
  const P = up(sk.P), C = up(sk.C), N = up(sk.N);

  // legs: bandy, bare, big flat feet
  for (const [side, h, k, an] of [[-2.3, sk.hF, sk.kF, sk.anF], [2.3, sk.hN, sk.kN, sk.anN]]) {
    const H = [P[0], side, P[1]], K = from(H, h, k), A = from(H, h, an);
    K[1] += side * 0.25;                                  // bandy: the knees bow out
    M.capsule(H, K, 2.1, 1.75, SKIN);
    M.capsule(K, A, 1.65, 1.3, SKIN);
    M.capsule([A[0] - 0.5, A[1], A[2] - 0.6], [A[0] + 3.4, A[1], A[2] - 0.9], 1.2, 1.0, SKIN);
  }
  // the jerkin: a hunched barrel from the hips to the shoulders, a belt round it
  const belt = (t) => (t < 0.16 ? DARK : JERK);
  M.capsule([P[0], 0, P[1] + 0.6], [C[0], 0, C[1] - 0.4], 4.5, 4.4, belt);
  M.ellipsoid([C[0] - 0.6, 0, C[1] - 0.6], 4.8, 5.2, 3.6, JERK);   // shoulders, wider than deep
  // hem tatters
  for (const [dx, dy] of [[-3, 2], [1, -3], [3, 1], [-1, -2], [2, 3]]) M.set(Math.round(P[0] + dx), dy, Math.round(P[1] - 1.5), JERK);

  // arms: shoulders out at the sides, the 2D arm's swing kept
  const arm = (side, s2, e2, h2) => {
    const S = [C[0] - 0.4, side, C[1] - 0.8], E = from(S, s2, e2), Hd = from(S, s2, h2);
    M.capsule(S, E, 1.6, 1.5, SKIN);
    M.capsule(E, Hd, 1.5, 1.4, SKIN);
    const w0 = E.map((v, i) => v + (Hd[i] - v) * 0.6), w1 = E.map((v, i) => v + (Hd[i] - v) * 0.76);
    M.capsule(w0, w1, 1.7, 1.7, DARK, true);
    M.ellipsoid(Hd, 1.8, 1.8, 1.8, SKIN);
    return { S, E, Hd };
  };
  const near = arm(5.2, sk.sN, sk.eN, sk.hdN), far = arm(-5.2, sk.sF, sk.eF, sk.hdF);
  // the knife, locked to the near fist (fig-goblin's grip, 40 degrees up the forearm)
  {
    const fa = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])), ka = fa - 0.7 + (sk.p.knife ? 0 : 0);
    const d = [Math.sin(ka), 0, Math.cos(ka)], h = near.Hd;
    M.capsule([h[0] + d[0] * 1.4, h[1] + 0.4, h[2] + d[2] * 1.4], [h[0] + d[0] * 9, h[1] + 0.4, h[2] + d[2] * 9], 0.9, 0.35, STEEL, true);
    M.capsule([h[0] - d[0] * 2.2, h[1] + 0.4, h[2] - d[2] * 2.2], [h[0] + d[0] * 1, h[1] + 0.4, h[2] + d[2] * 1], 0.8, 0.8, DARK, true);
  }
  // the round shield on the far arm, its face turned forward and out
  {
    const h = far.Hd, n = [0.8, -0.6, 0], l = Math.hypot(...n); n[0] /= l; n[1] /= l;
    const c = [h[0] + n[0] * 1.6, h[1] + n[1] * 1.6, h[2] + 0.4];
    M.disc(c, n, 5, 1.6, (r) => (r > 0.8 ? DARK : WOOD), true);
    M.ellipsoid([c[0] + n[0] * 1.1, c[1] + n[1] * 1.1, c[2]], 1.4, 1.4, 1.4, STEEL, true);
  }

  // the head: big, low on the hunched shoulders, a quarter forward
  const hc = [N[0] + 1.6, 0, N[1] + 5.2], rx = 5.3, ry = 4.9, rz = 5.6;
  M.ellipsoid(hc, rx, ry, rz, SKIN);
  // the hood: a shell over the crown and the back, the face left bare
  M.ellipsoid(hc, rx + 1.1, ry + 1.1, rz + 1.1, HOOD, true, (x, y, z) => (x < 1.6 || z > 2.4) && !(x > 1.6 && z < 2.4) && (x * x / (rx * rx) + y * y / (ry * ry) + z * z / (rz * rz)) > 0.82);
  // its point flops back a beat behind the head
  const sway = Math.max(-2, Math.min(2.6, (N[0] - up(lag.N)[0]) * 3)), bob = (N[1] - up(lag.N)[1]) * 2;
  M.capsule([hc[0] - 1.5, 0, hc[2] + 4.6], [hc[0] - 5.5 - sway, 0, hc[2] + 8.4 - bob * 0.5], 3, 1.6, HOOD);
  M.capsule([hc[0] - 5.5 - sway, 0, hc[2] + 8.4 - bob * 0.5], [hc[0] - 9.5 - sway * 1.6, 0, hc[2] + 7.6 - bob], 1.6, 0.6, HOOD);
  // the face, on the forward side
  const fx = hc[0] + rx - 0.6;
  M.capsule([fx - 0.2, -3.4, hc[2] + 1.8], [fx - 0.2, 3.4, hc[2] + 1.8], 0.9, 0.9, SKIN, true);          // heavy brow
  // red eyes, two pixels tall, set proud of the face so they show from the side too
  const surf = (y) => hc[0] + rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
  for (const y of [-3, -2, 1, 2]) for (const dz of [0, -1]) for (const dx of [0, -1]) M.set(Math.floor(surf(y + 0.5)) + dx, y, Math.round(hc[2] + 0.4) + dz, EYE, true);
  M.capsule([fx - 0.6, 0, hc[2] - 0.4], [fx + 2.4, 0, hc[2] - 1.2], 1.1, 0.7, SKIN, true);              // hooked nose
  M.capsule([fx + 2.2, 0, hc[2] - 1.2], [fx + 2.4, 0, hc[2] - 2.2], 0.7, 0.5, SKIN, true);
  for (let y = -3; y <= 2; y++) for (const dx of [0, -1]) M.set(Math.floor(surf(y + 0.5)) + dx - 1, y, Math.round(hc[2] - 3), MOUTH, true);   // the grin
  for (const y of [-3, -1, 1, 2]) M.set(Math.floor(surf(y + 0.5)) - 1, y, Math.round(hc[2] - 2), BONE, true);                          // odd teeth
  // long ears, back and up, bouncing a beat behind the head
  for (const s of [-1, 1]) {
    const root = [hc[0] - 0.6, s * (ry - 0.2), hc[2] + 0.6], tip = [hc[0] - 9 - sway, s * (ry + 4.5), hc[2] + 3.4 - bob];
    M.capsule(root, [root[0] - 3, s * (ry + 1.8), root[2] + 1.4], 1.6, 1.1, SKIN);
    M.capsule([root[0] - 3, s * (ry + 1.8), root[2] + 1.4], tip, 1.1, 0.35, SKIN);
  }

  // normals from the occupancy round each voxel (radius 3), for the shading at any heading
  const n = new Float32Array(NX * NY * NZ * 3), m = M.m;
  for (let z = 0; z < NZ; z++) for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = idx(x, y, z);
    if (!m[i]) continue;
    let gx = 0, gy = 0, gz = 0;
    for (let dz = -3; dz <= 3; dz++) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const X = x + dx, Y = y + dy, Z = z + dz;
      const full = X >= X0 && X < X1 && Y >= Y0 && Y < Y1 && Z >= 0 && Z < NZ && m[idx(X, Y, Z)];
      if (!full) { gx += dx; gy += dy; gz += dz; }
    }
    const l = Math.hypot(gx, gy, gz) || 1;
    n[i * 3] = gx / l; n[i * 3 + 1] = gy / l; n[i * 3 + 2] = gz / l;
  }
  const rec = { m, n };
  MODELS.set(f, rec);
  return rec;
};

// ---- the stack: slices drawn bottom to top, each turned to the heading ---------------------------
const SPRITES = new Map();
const SUN = [-0.55, 0.45, 0.7];          // world: from the left, a little toward you, high (the game's upper-left sun)
export const STACK_YAWS = 32;            // headings baked (every 11.25 degrees)

export const stackSprite = (f, yaw, elev = 35) => {
  const yb = ((Math.round((yaw / (Math.PI * 2)) * STACK_YAWS) % STACK_YAWS) + STACK_YAWS) % STACK_YAWS;
  const key = `${f}|${yb}|${elev}`;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const a = (yb / STACK_YAWS) * Math.PI * 2, e = (elev * Math.PI) / 180;
  const squash = Math.sin(e), lift = Math.cos(e);
  // the sun in the model's own frame (the model turned by a)
  const ca = Math.cos(a), sa = Math.sin(a);
  const L = [SUN[0] * ca + SUN[1] * sa, -SUN[0] * sa + SUN[1] * ca, SUN[2]];
  const { m, n } = voxelGoblin(f);
  const W = 96, H = 96, ox = 48, oy = 70;
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d"); ctx.imageSmoothingEnabled = false;
  const sl = document.createElement("canvas"); sl.width = NX; sl.height = NY;
  const sc = sl.getContext("2d");
  for (let z = 0; z < NZ; z++) {
    const img = sc.createImageData(NX, NY);
    let any = false;
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const i = idx(x, y, z), mt = m[i];
      if (!mt) continue;
      any = true;
      const lam = n[i * 3] * L[0] + n[i * 3 + 1] * L[1] + n[i * 3 + 2] * L[2];
      const t = lam > 0.55 ? 4 : lam > 0.22 ? 3 : lam > -0.12 ? 2 : lam > -0.45 ? 1 : 0;
      const c = MATS[mt][t], o = ((y - Y0) * NX + (x - X0)) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    if (!any) continue;
    sc.putImageData(img, 0, 0);
    // the slice: turned to the heading, the ground plane squashed by the camera, lifted by its height
    ctx.setTransform(1, 0, 0, 1, ox, oy - z * lift);
    ctx.scale(1, squash);
    ctx.rotate(a);
    ctx.drawImage(sl, X0, Y0);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the hard pixel look: alpha snapped, then a one-pixel outline in the neighbour's own dark
  const im = ctx.getImageData(0, 0, W, H), d = im.data, src = new Uint8ClampedArray(d);
  for (let i = 0; i < W * H; i++) d[i * 4 + 3] = src[i * 4 + 3] > 110 ? 255 : 0;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && src[(y * W + x) * 4 + 3] > 110;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (solid(x, y)) continue;
    let nb = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dy)) { nb = ((y + dy) * W + x + dx) * 4; break; }
    if (nb < 0) continue;
    const o = (y * W + x) * 4;
    d[o] = src[nb] * 0.32 + 14; d[o + 1] = src[nb + 1] * 0.28 + 8; d[o + 2] = src[nb + 2] * 0.32 + 18; d[o + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const rec = { cv: out, ox, oy };
  SPRITES.set(key, rec);
  return rec;
};
