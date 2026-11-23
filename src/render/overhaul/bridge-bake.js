// The overhaul's bridges: the BAKE (art/briefs/overhaul-build-millrace.md, "Bridges"; the law for spans
// up the screen: art/briefs/bridges-upscreen-rule.md; the approved look: concept/overhaul2-bridges.js).
//
// Every span is ONE SOLID in its own frame: `u` along the road from the engine span's middle, `v`
// across it (+v to the right of travel), `z` up; drawn as the game draws everything, screen =
// (x, y - z). Only the TOP and the faces whose outward normal looks south show; the trestle's flanks
// are BATTERED (lean out 0.4 of their height), so up the screen they show as true narrow strips on
// both sides. The deck is a PLATEAU: ramps of R units up from the road at each end (drawn on land,
// past the engine's d0 / d1, which never change), level over the water and its abutments.
//
// One bake per span and sun (DAY.id), at most a few hundred KB a span:
//   back   one canvas, drawn under the walkers: the thrown shadow and the gloom on the water, the
//          ramps' earth banks, the trestle's piles, braces, cribs and stringer, the deck, the side
//          rails of an up-screen span
//   front  standing things, each its own small canvas keyed by the ground y of its foot so draw.js
//          sorts it with the actors: an across span's near AND far truss / rail, the bridgehead posts
//          (lanterns, banners), the toll hut and bar, the mill's sluice
//   live   what moves, drawn a frame (bridges.js): wakes at the piles' feet, lantern flames, banner
//          frames, the sluice's falls
//
// Kinds (the plan in bridges.js picks them): toll (Howe pony truss, hut, bar, lanterns, banners),
// mill (truss, lanterns, a sluice upstream), farm (post and rail, plain posts, no lamps; lower).
// No getImageData; the only per-pixel work is here, at the bake.

import { RIVERS, inRiver } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { DAY } from "../../data/sun.js";

const PX = 2;                       // art pixels to a board unit
const INK = [42, 28, 26];

// ---- colour kit -------------------------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = (...h) => h.map(hex);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WOOD = pal("#2a1a14", "#47301c", "#664527", "#865c34", "#a47a48", "#c49a62");
const WOOD_WET = hex("#3c4630");
const EARTH = pal("#3a2618", "#553a24", "#6e4c2e", "#8a6440", "#a07a50");
const IRON = hex("#4c4e58");
const BANNER = pal("#1e3050", "#2e4a74", "#4a6c9c", "#d8b34a");
const ROOF = pal("#4a2626", "#6a3832", "#8a4a3e", "#a45a48");
const STONE = pal("#3e3a40", "#5e5850", "#7e7466", "#9c9080", "#b9ad96", "#d4c9ae");
export const LAMP = hex("#ffd27a");
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (i, j) => BAY[((j & 3) << 2) | (i & 3)];
const hash = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vn = (X, Y, s = 0) => {
  const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// ---- the sun the bake works to ------------------------------------------------------------------
let LV = [-0.6, -0.62, 0.5], WARM = 0, SUNC = [255, 255, 255], SHADE = [42, 28, 44], OFF = [0.45, 0.35], SH_A = 0.3, LOW = false;
const setSun = () => {
  const L = DAY.L || [-0.6, -0.62, 0.5], n = Math.hypot(L[0], L[1], L[2]) || 1;
  LV = [L[0] / n, L[1] / n, L[2] / n];
  WARM = DAY.on ? DAY.warm || 0 : 0;
  SUNC = hex(DAY.col || "#ffffff");
  SHADE = (DAY.shade || [42, 28, 44]).slice(0, 3);
  // the thrown shadow: along the sun's fall, len x height; at noon (and under the Blood Moon) short
  OFF = DAY.on && DAY.len > 0 ? [DAY.fall[0] * DAY.len, DAY.fall[1] * DAY.len] : [0.45, 0.35];
  SH_A = DAY.on && DAY.len > 0 ? (DAY.shade ? DAY.shade[3] : 0.34) + 0.06 * WARM : 0.3;
  LOW = DAY.on && DAY.len >= 1.5;
};
// a face's colour: `ramp` a tone ramp, `base` its tone index for a face square to the light at
// noon-ish, (nx, ny, nz) the face's world normal (x east, y south, z up); dithered between steps
const face = (ramp, base, nx, ny, nz, i, j, k = 2.2) => {
  const d = nx * LV[0] + ny * LV[1] + nz * LV[2];
  let t = base + (d - 0.1) * k;
  t = Math.max(0, Math.min(ramp.length - 1, t));
  const f = Math.floor(t), fr = t - f;
  let c = ramp[Math.min(ramp.length - 1, f + (fr > bay(i, j) ? 1 : 0))];
  if (d > 0.2 && WARM) c = mix(c, SUNC, 0.24 * WARM * Math.min(1, d));
  else if (d < -0.1) c = mix(c, SHADE, (0.14 + 0.18 * WARM) * Math.min(1, -d));
  return c;
};

// ---- the pixel buffer -------------------------------------------------------------------------
// board-unit box [x0, y0] .. [x1, y1]; rgba, the member that owns each pixel (for the tinted line),
// the thrown-shadow mask
const F_NOEMPTY = 1;      // no line where this member meets nothing (a ramp running into the road)
class Buf {
  constructor(x0, y0, x1, y1) {
    this.x0 = Math.floor(x0 * PX) / PX; this.y0 = Math.floor(y0 * PX) / PX;
    this.pw = Math.max(1, Math.ceil((x1 - this.x0) * PX)); this.ph = Math.max(1, Math.ceil((y1 - this.y0) * PX));
    this.d = new Uint8ClampedArray(this.pw * this.ph * 4);
    this.mem = new Uint16Array(this.pw * this.ph);
    this.sh = new Uint8Array(this.pw * this.ph);
    this.flags = [0];
    this.id = 0;
  }
  member(flags = 0) { this.flags.push(flags); return ++this.id; }
  ij(x, y) { return [Math.floor((x - this.x0) * PX), Math.floor((y - this.y0) * PX)]; }
  setPx(i, j, c, m, a = 1) {
    if (i < 0 || j < 0 || i >= this.pw || j >= this.ph) return;
    const p = j * this.pw + i, o = p * 4, d = this.d;
    if (a >= 1 || d[o + 3] === 0) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; this.mem[p] = m; return; }
    d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a;
  }
  // a screen-space rect (board units), for small upright details
  rect(x, y, w, h, c, m) {
    const [i0, j0] = this.ij(x, y), n = Math.max(1, Math.round(w * PX)), k = Math.max(1, Math.round(h * PX));
    for (let j = 0; j < k; j++) for (let i = 0; i < n; i++) this.setPx(i0 + i, j0 + j, c, m);
  }
  shadow(x, y) {
    const [i, j] = this.ij(x, y);
    for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const I = i + di, J = j + dj;
      if (I >= 0 && J >= 0 && I < this.pw && J < this.ph) this.sh[J * this.pw + I] = 1;
    }
  }
  // the tinted one-pixel line: a member's pixel meeting nothing or an earlier member darkens
  outline() {
    const { pw, ph, d, mem, flags } = this, out = new Uint8Array(pw * ph);
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
      const p = j * pw + i; if (!d[p * 4 + 3]) continue;
      const m = mem[p], fl = flags[m] || 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const I = i + di, J = j + dj;
        const q = I < 0 || J < 0 || I >= pw || J >= ph ? -1 : J * pw + I;
        if (q < 0 || !d[q * 4 + 3]) { if (!(fl & F_NOEMPTY)) { out[p] = 1; break; } }
        else if (mem[q] < m && mem[q] !== 0) { out[p] = 1; break; }
      }
    }
    for (let p = 0; p < pw * ph; p++) if (out[p]) {
      const o = p * 4, k = 0.58;
      d[o] += (INK[0] - d[o]) * k; d[o + 1] += (INK[1] - d[o + 1]) * k; d[o + 2] += (INK[2] - d[o + 2]) * k;
    }
  }
  canvas() {
    const cv = document.createElement("canvas"); cv.width = this.pw; cv.height = this.ph;
    cv.getContext("2d").putImageData(new ImageData(this.d, this.pw, this.ph), 0, 0);
    return cv;
  }
  bytes() { return this.pw * this.ph * 4; }
}

// ---- the span's frame -------------------------------------------------------------------------
export const frameOf = (b) => {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  return {
    c, s,
    at: (u, v, z = 0) => [b.x + u * c - v * s, b.y + u * s + v * c - z],
    gy: (u, v) => b.y + u * s + v * c,
    // a frame direction (along u, along v) as a world direction
    n: (nu, nv) => [nu * c - nv * s, nu * s + nv * c],
  };
};

// ---- painting in the frame ----------------------------------------------------------------------
// every sample of a member: drawn at (u, v, z) and, when it casts, its shadow on the ground plane
const STEP = 0.25;
// the actors' sort keys run y + 9 (soldiers) / y + 10 (foes) from their y: a front piece keyed at the
// ground y of its foot gets the same (bridge.js FRONT_KEY)
const FRONT_KEY = 10.5;
const mkSplat = (B, Fr, cast) => (u, v, z, m, col) => {
  const [x, y] = Fr.at(u, v, z);
  const [i, j] = B.ij(x, y);
  const c = typeof col === "function" ? col(i, j) : col;
  if (c) B.setPx(i, j, c, m);
  if (cast && z > 0.3) { const [gx, gy] = Fr.at(u, v, 0); cast.shadow(gx + OFF[0] * z, gy + OFF[1] * z); }
};

// a box in the frame: its visible upright faces (outward normal looking south), then its top
const block = (P, u0, u1, v0, v1, z0, z1, ramp, base, m) => {
  const { Fr, splat } = P;
  const faces = [[u0, 0, -1, 0], [u1, 0, 1, 0], [v0, 1, 0, -1], [v1, 1, 0, 1]];
  for (const [q, axis, nu, nv] of faces) {
    const [nx, ny] = Fr.n(nu, nv);
    if (ny <= 0.05) continue;
    const a0 = axis === 0 ? v0 : u0, a1 = axis === 0 ? v1 : u1;
    for (let a = a0; a <= a1 + 1e-6; a += STEP) for (let z = z0; z <= z1 + 1e-6; z += STEP) {
      // the sunward edge of a south face is a step lighter (the post's lit corner)
      const edge = (a - a0) / Math.max(0.01, a1 - a0) - 0.5;
      const dirX = axis === 0 ? Fr.n(0, 1)[0] : Fr.n(1, 0)[0];
      splat(axis === 0 ? q : a, axis === 0 ? a : q, z, m, (i, j) => face(ramp, base + 1.4 * edge * dirX * LV[0], nx, ny, 0, i, j));
    }
  }
  for (let u = u0; u <= u1 + 1e-6; u += STEP) for (let v = v0; v <= v1 + 1e-6; v += STEP) splat(u, v, z1, m, (i, j) => face(ramp, base + 0.4, 0, 0, 1, i, j));
};
// a 3-D line of timber `w` thick, colour by tone
const beam = (P, a, b, w, ramp, base, m, n = [0, 1, 0.3]) => {
  const { splat } = P;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), k = Math.ceil(L / STEP) + 1;
  for (let i = 0; i <= k; i++) {
    const f = i / k, u = a[0] + (b[0] - a[0]) * f, v = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
    for (let t = 0; t < w; t += STEP) splat(u, v, z - t, m, (I, J) => face(ramp, base, n[0], n[1], n[2], I, J));
  }
};

// ---- the plan of one span: its profile, its water, its members -----------------------------------
export const SPEC = {
  toll: { Z: 12, R: 26, hw: 26, rail: "truss", RH: 7, post: 13, lamps: true, banners: true, hut: true },
  mill: { Z: 12, R: 26, hw: 26, rail: "truss", RH: 7, post: 11, lamps: true, sluice: true },
  farm: { Z: 9, R: 20, hw: 26, rail: "post", RH: 5, post: 8 },
};
const BATTER = 0.4;
export const planSpan = (b, kind) => {
  const sp = SPEC[kind], Fr = frameOf(b), half = (b.d1 - b.d0) / 2, hw = sp.hw;
  const wetUV = (u, v) => { const [x, y] = Fr.at(u, v, 0); return inRiver(x, y, 0); };
  // the water's run along the span, over the deck's whole width (a skew crossing runs long)
  let uN = Infinity, uS = -Infinity;
  for (let v = -hw; v <= hw; v += 1.5) for (let u = -half - 30; u <= half + 30; u += 0.5) if (wetUV(u, v)) { if (u < uN) uN = u; if (u > uS) uS = u; }
  if (uN === Infinity) { uN = -half + 8; uS = half - 8; }
  const A = uN - 3, B = uS + 3, lo = A - sp.R, hi = B + sp.R, Z = sp.Z, R = sp.R;
  const z = (u) => (u <= lo || u >= hi ? 0 : u < A ? (Z * (u - lo)) / R : u > B ? (Z * (hi - u)) / R : Z);
  const dz = (u) => (u <= lo || u >= hi ? 0 : u < A ? Z / R : u > B ? -Z / R : 0);
  // bents: a navigation bay of 19 units round the water's middle, then every 8.5 out to the cribs
  const uc = (uN + uS) / 2, bents = [];
  for (let u = uc + 9.5; u < B - 2.5; u += 6) bents.push(u);
  for (let u = uc - 9.5; u > A + 2.5; u -= 6) bents.push(u);
  bents.sort((p, q) => p - q);
  // the way the water runs under the span (for the wakes)
  let best = Infinity, flow = [0, 1];
  for (const rv of RIVERS) for (const sg of rv.segs) {
    const dx = sg.x2 - sg.x1, dy = sg.y2 - sg.y1, l2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((b.x - sg.x1) * dx + (b.y - sg.y1) * dy) / l2));
    const d = Math.hypot(sg.x1 + dx * k - b.x, sg.y1 + dy * k - b.y);
    if (d < best) { best = d; flow = [dx / Math.sqrt(l2), dy / Math.sqrt(l2)]; }
  }
  const up = Math.abs(Fr.s) > 0.7;
  return { b, kind, sp, Fr, hw, Z, R, A, B, lo, hi, z, dz, uN, uS, bents, flow, up, wetUV };
};

// ---- the bake ------------------------------------------------------------------------------------
export const bakeSpan = (pl) => {
  setSun();
  const { b, Fr, hw, Z, A, B, lo, hi, z, dz, bents, up, sp, kind, wetUV } = pl;
  const RD = roadTones(), TURF = turfTones();
  // the back buffer: the whole span, its banks, rails and its thrown shadow
  const pts = [];
  for (const u of [lo - 4, hi + 4]) for (const v of [-hw - 14, hw + 14]) for (const zz of [0, Z + sp.RH + 4]) { pts.push(Fr.at(u, v, zz)); const g = Fr.at(u, v, 0); pts.push([g[0] + OFF[0] * (Z + sp.RH + 2), g[1] + OFF[1] * (Z + sp.RH + 2)]); }
  const bx = (k, f) => f(...pts.map((p) => p[k]));
  const BK = new Buf(bx(0, Math.min) - 2, bx(1, Math.min) - 2, bx(0, Math.max) + 2, bx(1, Math.max) + 2);
  const P = { Fr, B: BK, splat: mkSplat(BK, Fr, BK) };
  const nearS = (s) => s * Fr.c;        // > 0: the flank on side s faces the camera (south)
  const sides = [-1, 1].sort((p, q) => nearS(p) - nearS(q));
  const fronts = [], lamps = [], banners = [], feet = [], falls = [];
  let hutWin = null;

  // the level part's own shadow on its ramps at a low sun: walk from a ramp point toward the sun and
  // see whether the deck (or the higher ramp) stands above the ray (cheap: the plateau is z(u) only)
  const tu = -(OFF[0] * Fr.c + OFF[1] * Fr.s), tv = -(-OFF[0] * Fr.s + OFF[1] * Fr.c), tl = Math.hypot(OFF[0], OFF[1]);
  const inDeckShade = (u, v, zz) => {
    if (!(DAY.on && DAY.len > 0.5) || tl < 0.01) return false;
    for (let t = 0.6; t <= Z + 1; t += 0.6) {          // t: the height the ray to the sun has gained
      const U = u + tu * t, V = v + tv * t;
      if (Math.abs(V) > hw + 1 || U < lo || U > hi) return false;
      if (z(U) > zz + t + 0.3) return true;
    }
    return false;
  };

  // -- the ramps' side faces: cribbing (logs laid flat, battered like the flanks), grass at the foot
  for (const s of sides) {
    const m = BK.member();
    const [nx, ny] = Fr.n(0, s);
    for (const [u0, u1] of [[lo, A + 1], [B - 1, hi]]) for (let u = u0; u <= u1; u += STEP) {
      const top = z(u); if (top < 0.4) continue;
      for (let zz = 0; zz <= top; zz += STEP) {
        const v = s * (hw + BATTER * (top - zz) * 0.8);
        P.splat(u, v, zz, m, (i, j) => {
          const course = ((zz + 0.3) % 1.4 + 1.4) % 1.4;
          let c = face(WOOD, course < 0.4 ? 1.5 : 2.9 + (hash(Math.floor(u / 6), Math.floor(zz / 1.4), 8) - 0.5) * 0.8, nx * 0.9, ny * 0.9, BATTER, i, j, 2.8);
          if (((u % 6) + 6) % 6 < 0.6) c = face(WOOD, 4.2, nx, ny, 0.3, i, j);            // a tie log's end
          if (zz < 1.2 + vn(u / 2, s, 4) * 1.4) c = face(TURF, 1.6 + vn(u, zz, 6) * 1.6, nx * 0.6, ny * 0.6, 0.8, i, j);   // grass at the foot
          return c;
        });
      }
    }
  }

  // -- the trestle's flanks: X braces, piles, waling, cribs, stringer, cap ends (farther flank first)
  const ends = [A + 1.5, ...bents, B - 1.5];
  for (const s of sides) {
    const [nx, ny] = Fr.n(0, s);
    const nb = [nx * 0.9, ny * 0.9, BATTER];
    const fv = (zz) => s * (hw + BATTER * (Z - zz));       // the battered flank's line at height zz
    // X braces between bents (none over the navigation bay)
    const mX = BK.member();
    for (let k = 0; k < ends.length - 1; k++) {
      const a = ends[k], c2 = ends[k + 1]; if (c2 - a > 12) continue;
      beam(P, [a, fv(Z * 0.88), Z * 0.88], [c2, fv(Z * 0.1), Z * 0.1], 0.6, WOOD, 1.9, mX, nb);
      beam(P, [a, fv(Z * 0.1), Z * 0.1], [c2, fv(Z * 0.88), Z * 0.88], 0.6, WOOD, 1.7, mX, nb);
    }
    // the piles: raked outer posts, lit on the sun's side, wet at the foot
    for (const u of bents) {
      const m = BK.member();
      for (let zz = -0.6; zz <= Z; zz += STEP) for (let du = -0.9; du <= 0.9; du += STEP) {
        P.splat(u + du, fv(zz), zz, m, (i, j) => {
          const sideLit = (du * Fr.n(1, 0)[0]) * -LV[0] > 0.25;     // the edge toward the sun
          let c = face(WOOD, sideLit ? 4.4 : Math.abs(du) > 0.6 ? 2 : 3.2, nx * 0.9, ny * 0.9, BATTER, i, j, 2.8);
          if (zz < 1.4 && wetUV(u, fv(0))) c = mix(c, WOOD_WET, 0.6);
          return c;
        });
      }
      const [fx, fy] = Fr.at(u, fv(0), 0);
      if (wetUV(u, fv(0))) feet.push({ x: fx, y: fy, r: 0.9 });
      // the cap's end, past the deck
      block(P, u - 0.8, u + 0.8, s > 0 ? hw : -hw - 2.2, s > 0 ? hw + 2.2 : -hw, Z - 1.6, Z - 0.2, WOOD, 3.6, BK.member());
    }
    // the waling along the bents
    beam(P, [A + 1, fv(Z * 0.72), Z * 0.72], [B - 1, fv(Z * 0.72), Z * 0.72], 0.9, WOOD, 3.6, BK.member(), nb);
    // the crib at each abutment: logs laid flat, their battered face
    for (const [c0, c1] of [[A, A + 3], [B - 3, B]]) {
      const m = BK.member();
      for (let u = c0; u <= c1; u += STEP) for (let zz = -0.5; zz <= Z - 1.2; zz += STEP) {
        P.splat(u, fv(zz), zz, m, (i, j) => {
          const course = ((zz + 0.6) % 1.6 + 1.6) % 1.6;
          let c = face(WOOD, course < 0.45 ? 1.6 : 3, nx * 0.9, ny * 0.9, BATTER, i, j, 2.8);
          if (Math.abs(u - c0) < 0.4 || Math.abs(u - c1) < 0.4) c = face(WOOD, 4.2, nx, ny, 0.3, i, j);   // log ends
          if (zz < 1.2 && wetUV(u, fv(0))) c = mix(c, WOOD_WET, 0.55);
          return c;
        });
      }
    }
    // the stringer: the deck's edge face, the whole length, ramps too
    const mS = BK.member();
    for (let u = lo + 2; u <= hi - 2; u += STEP) { const top = z(u); if (top < 1.6) continue; for (let zz = top - 1.6; zz <= top; zz += STEP) P.splat(u, s * hw, zz, mS, (i, j) => face(WOOD, zz > top - 0.5 ? 3.8 : 2.4, nx, ny, 0.1, i, j, 2.8)); }
  }
  // up the screen, the FAR bank's crib wing walls face south in full elevation, stepping down outward
  if (up) {
    const far = Fr.s > 0 ? A + 1 : B - 1, dir = Fr.s > 0 ? 1 : -1;     // its south face looks along +u (or -u)
    const [nx, ny] = Fr.n(dir, 0);
    for (const s of [-1, 1]) {
      const m = BK.member(), v0 = hw + BATTER * Z * 0.2, len = 6;
      for (let k = 0; k <= len; k += STEP) {
        const h = Z * (k < 2 ? 0.9 : k < 4 ? 0.62 : 0.34);           // three steps down, outward
        for (let zz = -0.8; zz <= h; zz += STEP) P.splat(far, s * (v0 + k), zz, m, (i, j) => {
          const course = ((zz + 0.8) % 1.5 + 1.5) % 1.5;
          let c = face(WOOD, course < 0.4 ? 2 : 3.6, nx, ny, 0, i, j);
          if (Math.abs(k - 2) < 0.3 || Math.abs(k - 4) < 0.3 || k > len - 0.3) c = face(WOOD, 4.4, nx, ny, 0.3, i, j);   // log ends at each step
          if (zz > h - 0.7) c = face(TURF, 3.2, 0, 0, 1, i, j);          // turf on its top
          if (zz < 1.2 && wetUV(far, s * (v0 + k))) c = mix(c, WOOD_WET, 0.6);
          return c;
        });
        const [fx, fy] = Fr.at(far, s * (v0 + k), 0);
        if (k > 1 && k < len - 1 && Math.round(k * 4) % 12 === 0 && wetUV(far, s * (v0 + k))) feet.push({ x: fx, y: fy + 0.5, r: 1.2, wall: true });
      }
    }
  }

  // -- the deck: timber the whole way, planks across, ramps too (drawn in depth order)
  const mD = BK.member(F_NOEMPTY);
  // up the screen: the near ramp lightest, the level mid, the far ramp a step darker (the rule)
  const farRampU = (u) => (Fr.s > 0 ? u < A : u > B), nearRampU = (u) => (Fr.s > 0 ? u > B : u < A);
  const deckCol = (u, v, i, j) => {
    const dzu = dz(u), [nx, ny] = Fr.n(-dzu, 0), nz = 1, zz = z(u);
    const onRamp = u < A || u > B, foot = onRamp ? (u < A ? u - lo : hi - u) : 99;
    let tb = up ? (farRampU(u) ? -0.7 : nearRampU(u) ? 0.35 : 0) : 0;
    const pitch = 1.5, row = Math.floor(u / pitch), jj = ((u % pitch) + pitch) % pitch;
    const av = Math.abs(v);
    let c;
    if (av > hw - 1.5) c = face(WOOD, jj < 0.38 ? 1.6 : av > hw - 0.5 ? 2.4 : 4.2 + tb, nx, ny, nz, i, j);   // the kerb beam
    else {
      // the running tracks: two runs of boards along the road in the wheel tracks, worn to its dust
      const tr = Math.abs(av - 19);
      if (tr < 3.2) {
        const k = ((u + (v > 0 ? 8.5 : 0)) % 14 + 14) % 14;
        if (tr > 2.8 || k < 0.45) c = mix(WOOD[1], WOOD[2], 0.4);
        else {
          c = face(WOOD, (tr > 2.3 ? 2.6 : 3.7) + tb + (hash(Math.floor((u + (v > 0 ? 8.5 : 0)) / 14), v > 0 ? 1 : 2, 6) - 0.5) * 0.8, nx, ny, nz, i, j);
          c = mix(c, RD[2], 0.22 + 0.22 * (vn(u / 3, v / 1.5, 5) > 0.55));
        }
      } else if (jj < 0.38) c = mix(WOOD[0], WOOD[2], 0.35);                 // the gap between planks
      else {
        // a plank: its own tone, a staggered butt joint, grain, nail rows over the stringers
        const seg = Math.floor((v + 200 + (row % 3) * 9) / 17), hv = hash(row, seg, 3);
        if (Math.round(v + 200 + (row % 3) * 9) % 17 === 0) c = mix(WOOD[1], WOOD[2], 0.5);
        else {
          c = face(WOOD, (jj < 0.9 ? 4.6 : hv < 0.12 ? 2.5 : hv < 0.4 ? 3.3 : hv < 0.88 ? 3.85 : 4.5) + tb, nx, ny, nz, i, j);
          if (jj >= 0.9 && hash(Math.round(v / 1.5), row, 9) > 0.84) c = mix(c, WOOD[2], 0.5);   // grain
          if ((Math.abs(av - 9.5) < 0.3 || Math.abs(av - (hw - 3.5)) < 0.3) && jj > 0.95 && jj < 1.3) c = IRON;   // nails
        }
      }
    }
    // earth spilled onto the planks at each end, the road's own dust
    if (foot < 6 && vn(v / 2, u / 1.5, 9) > 0.35 + foot * 0.1) c = mix(RD[1], RD[2], hash(i, j, 4));
    if (onRamp && inDeckShade(u, v, zz)) c = mix(c, SHADE.map((x) => x * 0.6), SH_A);
    return c;
  };
  // (the ramp's foot fades into the road over its first 1.2 units of rise: no hard edge)
  const splatD = mkSplat(BK, Fr, null), splatC = P.splat;
  const deckAt = (u, v) => { const zz = z(u); if (zz < 0.15) return; (zz < 2 ? splatD : splatC)(u, v, zz, mD, (i, j) => (zz < 1.2 && bay(i, j) > zz / 1.2 ? null : deckCol(u, v, i, j))); };
  if (up) {
    const us = []; for (let u = lo; u <= hi; u += STEP) us.push(u);
    if (Fr.s < 0) us.reverse();
    for (const u of us) for (let v = -hw; v <= hw; v += STEP) deckAt(u, v);
  } else {
    const vs = []; for (let v = -hw; v <= hw; v += STEP) vs.push(v);
    if (Fr.c < 0) vs.reverse();
    for (const v of vs) for (let u = lo; u <= hi; u += STEP) deckAt(u, v);
  }
  // a 1-px lit lip where the ramp breaks onto the level (the rule's height cue)
  const mL = BK.member();
  for (const ub of [A, B]) for (let v = -hw + 1.5; v <= hw - 1.5; v += STEP) P.splat(ub, v, Z + 0.05, mL, (i, j) => (hash(i, j, 2) > 0.15 ? mix(WOOD[5], SUNC, 0.2 * WARM) : null));

  // -- the rails
  const rampRail = (Q, Bf, v, nx, ny, RH) => {
    // a low post and rail down each ramp, following it
    const mR = Bf.member();
    for (const [u0, u1] of [[lo + 4, A - 1], [B + 1, hi - 4]]) {
      const n = Math.max(1, Math.round((u1 - u0) / 5.5));
      for (let k = 0; k <= n; k++) { const u = u0 + ((u1 - u0) * k) / n; for (let du = -0.45; du <= 0.45; du += STEP) for (let zz = z(u); zz <= z(u) + RH + 0.5; zz += STEP) Q.splat(u + du, v, zz, mR, (i, j) => face(WOOD, zz > z(u) + RH ? 4.8 : du * Fr.n(1, 0)[0] * -LV[0] > 0.1 ? 4 : 2.8, nx, ny, 0, i, j, 2.8)); }
      for (let u = u0; u <= u1; u += STEP) for (let zz = RH - 0.8; zz <= RH; zz += STEP) Q.splat(u, v, z(u) + zz, mR, (i, j) => face(WOOD, zz > RH - 0.3 ? 4.6 : 3.4, nx, ny, 0.4, i, j));
    }
  };
  const railOf = (s, Bf) => {
    const Q = Bf === BK ? P : { Fr, B: Bf, splat: mkSplat(Bf, Fr, BK) };
    const v = s * (hw + 0.6), [nx, ny] = Fr.n(0, s);       // the truss sits just outside the deck
    if (sp.rail === "truss" && !up) {
      // a Howe pony truss: a kick board, chords, verticals with iron straps, diagonals sloping to the middle
      const u0 = A - 1, u1 = B + 1, RH = sp.RH, panel = (u1 - u0) / Math.max(2, Math.round((u1 - u0) / 4.5));
      const topZ = (u) => { const e = Math.min(u - u0, u1 - u); return Z + (e < panel ? RH * (0.55 + 0.45 * (e / panel)) : RH); };
      const mC = Bf.member();
      for (let u = u0; u <= u1; u += STEP) {
        for (let zz = Z - 0.2; zz <= Z + 1.8; zz += STEP) Q.splat(u, v, zz, mC, (i, j) => face(WOOD, zz > Z + 1.4 ? 3.4 : 2.3, nx, ny, 0, i, j, 2.8));
        const tz = topZ(u);
        for (let zz = tz - 1.2; zz <= tz; zz += STEP) Q.splat(u, v, zz, mC, (i, j) => face(WOOD, zz > tz - 0.4 ? 4.6 : 3, nx, ny, 0.3, i, j, 2.8));
      }
      const mV = Bf.member(), mid = (u0 + u1) / 2;
      for (let u = u0; u <= u1 + 0.01; u += panel) {
        const end = u < u0 + 0.1 || u > u1 - 0.1, tz = end ? topZ(u) + 2.2 : topZ(u);    // tall end posts
        for (let du = -0.45; du <= 0.45; du += STEP) for (let zz = Z + 1.8; zz <= tz; zz += STEP) Q.splat(u + du, v, zz, mV, (i, j) => (Math.abs(zz - Z - 2.2) < 0.3 || Math.abs(zz - topZ(u) + 1.6) < 0.3 ? IRON : face(WOOD, du * Fr.n(1, 0)[0] * -LV[0] > 0.1 ? 4 : 2.7, nx, ny, 0, i, j, 2.8)));
        if (Math.abs(u - mid) > 0.6 && u + panel <= u1 + 0.01 && u >= u0) {
          const ua = u, ub = u + panel, hiU = Math.abs(ua - mid) > Math.abs(ub - mid) ? ua : ub, loU = hiU === ua ? ub : ua;
          beam(Q, [hiU, v, topZ(hiU) - 1.1], [loU, v, Z + 2.2], 0.7, WOOD, 2.9, mV, [nx, ny, 0]);
        }
      }
      rampRail(Q, Bf, v, nx, ny, 4);
    } else {
      // post and rail (the farm; and every rail up the screen, seen edge-on as a 2-px line)
      const u0 = A - 1, u1 = B + 1, RH = up ? Math.min(sp.RH, 5) : sp.RH;
      const mR = Bf.member();
      const posts = []; for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.max(2, Math.round((u1 - u0) / (up ? 7 : 5)))) posts.push(u);
      for (const u of posts) for (let du = -0.4; du <= 0.4; du += STEP) for (let dv = -0.4; dv <= 0.4; dv += STEP) for (let zz = z(u); zz <= z(u) + RH + 0.4; zz += STEP) Q.splat(u + du, v + dv, zz, mR, (i, j) => face(WOOD, zz > z(u) + RH ? 4.8 : 3, nx, ny, 0, i, j));
      const mT = Bf.member();
      for (let u = u0; u <= u1; u += STEP) for (const rz of [RH - 0.7, RH * 0.5]) for (let zz = rz; zz <= rz + 0.7; zz += STEP) for (let dv = -0.3; dv <= 0.3; dv += STEP)
        Q.splat(u, v + dv, z(u) + zz, mT, (i, j) => face(WOOD, rz > RH * 0.6 ? 4.2 : 3.4, nx, ny, 0.4, i, j));
      // up the screen, each bent's knee brace from the pile to the rail
      if (up) for (const u of bents) beam(Q, [u, s * (hw + BATTER * Z * 0.45), Z * 0.55], [u, v, Z + RH * 0.8], 0.6, WOOD, 3, mT, [nx, ny, BATTER]);
      rampRail(Q, Bf, v, nx, ny, Math.min(RH, 4));
    }
  };
  // a front group: a small buffer of its own, keyed by the ground y of its foot
  const group = (boxPts, key, paint, extra = {}) => {
    const xs = boxPts.map((p) => p[0]), ys = boxPts.map((p) => p[1]);
    const G = new Buf(Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) + 2, Math.max(...ys) + 2);
    paint(G);
    G.outline();
    fronts.push({ G, key: key + FRONT_KEY, ...extra });
  };
  const railBox = (s) => [Fr.at(lo, s * hw, 0), Fr.at(hi, s * hw, 0), Fr.at(lo, s * hw, Z + sp.RH + 5), Fr.at(hi, s * hw, Z + sp.RH + 5)];
  if (up) for (const s of sides) railOf(s, BK);
  else for (const s of sides) group(railBox(s), Fr.gy(0, s * (hw + 1.5)), (G) => railOf(s, G));

  // -- the bridgehead posts (lanterns on the toll's and the mill's, banners on the toll's far pair)
  const postAt = (u, s, withLamp, withBanner) => {
    const v = s * (hw + 2.6), h = sp.post;
    group([Fr.at(u, v - 4, 0), Fr.at(u, v + 4, 0), Fr.at(u - 4, v, h + 6), Fr.at(u + 4, v, h + 6)], Fr.gy(u, v), (G) => {
      const Q = { Fr, B: G, splat: mkSplat(G, Fr, BK) };
      block(Q, u - 0.8, u + 0.8, v - 0.8, v + 0.8, 0, h, WOOD, 3, G.member());
      block(Q, u - 1.1, u + 1.1, v - 1.1, v + 1.1, h, h + 0.7, WOOD, 4, G.member());
      const [x, y] = Fr.at(u, v, h + 0.7);
      if (withLamp) {
        const m = G.member(), lit = LOW || DAY.id === "sunrise";
        G.rect(x - 1.25, y - 3.75, 2.5, 3.5, INK, m); G.rect(x - 0.75, y - 3.25, 1.5, 2.5, lit ? LAMP : hex("#6a5a3a"), m);
        if (lit) G.rect(x - 0.25, y - 2.75, 0.5, 0.5, hex("#fff6d8"), m);
        G.rect(x - 1.75, y - 4.25, 3.5, 0.5, IRON, m); G.rect(x - 0.25, y - 4.75, 0.5, 0.5, IRON, m);
        lamps.push({ x, y: y - 2, lit });
      }
      if (withBanner) {
        // an iron arm toward the road, the banner hanging from it (its cloth is live: bridges.js)
        const [ax, ay] = Fr.at(u, v - s * 3.6, h - 0.8);
        const m = G.member();
        const n = 8; for (let k = 0; k <= n; k++) G.rect(x + (ax - x) * (k / n) - 0.25, y - 0.4 + (ay - y + 0.4) * (k / n), 0.5, 0.5, IRON, m);
        banners.push({ x: ax, y: ay + 0.5, flip: ax < x ? -1 : 1 });
      }
    });
  };
  const ln = lo - 1.5, ls = hi + 1.5;
  if (kind === "toll") { for (const s of [-1, 1]) { postAt(ln, s, true, s < 0); postAt(ls, s, true, s < 0); } }
  else if (kind === "mill") { postAt(ln, -1, true, false); postAt(ln, 1, false, false); postAt(ls, -1, false, false); postAt(ls, 1, true, false); }
  else for (const s of [-1, 1]) { postAt(ln, s, false, false); postAt(ls, s, false, false); }

  // -- the toll hut beside the far end of the eastern ramp, and the raised bar
  if (sp.hut) {
    const u0 = hi - 6, u1 = hi + 5, v1 = -(hw + 10), v0 = v1 - 9, H = 7, ridge = 5.5;
    group([Fr.at(u0, v0, H + ridge + 3), Fr.at(u1, v1, 0), Fr.at(u1, v0, H + ridge + 3), Fr.at(u0, v1, 0)], Fr.gy((u0 + u1) / 2, v1), (G) => {
      const Q = { Fr, B: G, splat: mkSplat(G, Fr, BK) };
      // walls: boards with battens, the south face lit by the sun's side edge
      const mW = G.member(), [nx, ny] = Fr.n(0, 1);
      for (let u = u0; u <= u1; u += STEP) for (let zz = 0; zz <= H; zz += STEP) Q.splat(u, v1, zz, mW, (i, j) => {
        const bt = ((u - u0) % 3 + 3) % 3 < 0.5;
        return face(WOOD, bt ? 2.5 : zz < 0.6 ? 2 : 3.6, nx, ny, 0, i, j);
      });
      block(Q, u0, u1, v0, v1, 0, H, WOOD, 3, G.member());
      for (let u = u0; u <= u1; u += STEP) for (let zz = 0; zz <= H; zz += STEP) Q.splat(u, v1, zz, mW, (i, j) => face(WOOD, ((u - u0) % 3 + 3) % 3 < 0.5 ? 2.4 : zz < 0.6 ? 1.8 : 3.5, nx, ny, 0, i, j));
      const mO = G.member();
      // the door (east) and the window (west), on the south face
      const [dx, dy] = Fr.at(u0 + 7, v1, 0), [wx, wy] = Fr.at(u0 + 2, v1, 0);
      G.rect(dx, dy - 5, 2.5, 5, INK, mO); G.rect(dx + 0.5, dy - 4.5, 1.5, 4.5, WOOD[2], mO); G.rect(dx + 1.5, dy - 2.5, 0.5, 0.5, BANNER[3], mO);
      const litW = LOW || DAY.id === "sunrise";
      G.rect(wx, wy - 5.5, 3.5, 2.5, INK, mO); G.rect(wx + 0.5, wy - 5, 2.5, 1.5, litW ? hex("#ffcf6a") : hex("#3a4250"), mO); G.rect(wx + 1.5, wy - 5, 0.5, 1.5, WOOD[1], mO);
      hutWin = { x: wx + 1.75, y: wy - 4.25, lit: litW };
      // the shingle roof: a gable along u, the north slope then the south
      const vm = (v0 + v1) / 2, mR = G.member();
      for (const sd of [-1, 1]) for (let u = u0 - 1; u <= u1 + 1; u += STEP) for (let t = 0; t <= 1; t += 0.02) {
        const v = vm + sd * t * ((v1 - v0) / 2 + 1), zz = H + ridge * (1 - t);
        Q.splat(u, v, zz, mR, (i, j) => {
          const row = Math.floor(t * 9), sh = ((u + row * 1.3) % 2.2 + 2.2) % 2.2 < 0.35;
          const c = face(ROOF, sh ? 0.8 : row & 1 ? 2 : 2.8, 0, sd * 0.7, 0.7, i, j, 2.6);
          return t > 0.95 ? ROOF[0] : c;
        });
      }
      block(Q, u0 + 7.5, u0 + 9, vm - 2.5, vm - 1, H + 1, H + ridge + 2, STONE, 3, G.member());   // the chimney
    });
    // the bar: a post on the near side and a pole raised over the road
    const u = hi + 0.5, v = hw + 2.6;
    group([Fr.at(u - 10, v, 16), Fr.at(u + 3, v, 0)], Fr.gy(u, v) + 0.1, (G) => {
      const Q = { Fr, B: G, splat: mkSplat(G, Fr, BK) };
      block(Q, u - 0.7, u + 0.7, v - 0.7, v + 0.7, 0, 6, WOOD, 3, G.member());
      const m = G.member();
      beam(Q, [u, v - 0.2, 6], [u - 7, v - 3, 13.5], 0.6, WOOD, 4, m, [0, 1, 0.5]);
      for (let k = 0; k < 6; k++) beam(Q, [u - k * 1.15, v - 0.2 - k * 0.45, 6.3 + k * 1.25], [u - k * 1.15 - 0.55, v - 0.4 - k * 0.45, 6.9 + k * 1.25], 0.6, k & 1 ? [hex("#e8e0c8")] : [hex("#a8322c")], 0, m);
    });
  }

  // -- the mill's sluice: three gates across the race upstream of the deck, falls under them
  if (sp.sluice && !up) {
    const upV = -Math.sign(pl.flow[1] * Fr.c || 1);     // upstream across the span (the race runs south: north)
    const vg = upV * (hw + Z + 7);
    let g0 = Infinity, g1 = -Infinity;
    for (let u = lo; u <= hi; u += 0.5) if (wetUV(u, vg)) { g0 = Math.min(g0, u); g1 = Math.max(g1, u); }
    if (g0 < g1) {
      g0 -= 1; g1 += 1;
      const gates = 3, gw = (g1 - g0) / gates;
      group([Fr.at(g0 - 2, vg, 14), Fr.at(g1 + 2, vg, 14), Fr.at(g0 - 2, vg - upV * 2, -1), Fr.at(g1 + 2, vg + upV * 5, -1)], Fr.gy(0, vg) + 0.2, (G) => {
        const Q = { Fr, B: G, splat: mkSplat(G, Fr, BK) };
        const vf = vg - upV * 0.6;                    // the gates' downstream face
        const [nx, ny] = Fr.n(0, -upV);
        // the gates, raised a little so the race pours under them
        const mG = G.member();
        for (let k = 0; k < gates; k++) for (let u = g0 + k * gw + 0.6; u <= g0 + (k + 1) * gw - 0.6; u += STEP) for (let zz = 1.6; zz <= 6; zz += STEP)
          Q.splat(u, vf, zz, mG, (i, j) => (Math.abs(zz - 2.4) < 0.3 || Math.abs(zz - 5.2) < 0.3 ? IRON : face(WOOD, ((zz - 1.6) % 1.1) < 0.3 ? 1.8 : 3.2, nx, ny, 0, i, j)));
        // the posts, the walk beam and its handrail
        for (let k = 0; k <= gates; k++) { const u = g0 + k * gw; block(Q, u - 0.6, u + 0.6, vg - 0.7, vg + 0.7, -0.8, 8.5, WOOD, 2.8, G.member()); }
        block(Q, g0 - 0.6, g1 + 0.6, vg - 0.9, vg + 0.9, 6.8, 7.6, WOOD, 3.6, G.member());
        const mH = G.member();
        for (let u = g0; u <= g1; u += STEP) for (let zz = 10; zz <= 10.6; zz += STEP) Q.splat(u, vg + upV * 0.6, zz, mH, (i, j) => face(WOOD, 4, nx, ny, 0.4, i, j));
        // the winding wheels over each gate, and the rack rods down to it
        const mWh = G.member();
        for (let k = 0; k < gates; k++) {
          const uc = g0 + (k + 0.5) * gw, [cx, cy] = Fr.at(uc, vf, 9);
          for (let a = 0; a < 6.283; a += 0.12) G.rect(cx + Math.cos(a) * 1.4 - 0.25, cy + Math.sin(a) * 1.4 - 0.25, 0.5, 0.5, IRON, mWh);
          for (let a = 0; a < 3.14; a += 0.785) for (let r = -1.2; r <= 1.2; r += 0.5) G.rect(cx + Math.cos(a) * r - 0.25, cy + Math.sin(a) * r - 0.25, 0.5, 0.5, WOOD[2], mWh);
          const [rx, ry] = Fr.at(uc, vf, 6); G.rect(rx - 0.25, cy, 0.5, ry - cy, IRON, mWh);
          // the fall under this gate: its box for the live sheet (bridges.js)
          const [ax, ay] = Fr.at(g0 + k * gw + 0.8, vf, 1.6), [bx2, by2] = Fr.at(g0 + (k + 1) * gw - 0.8, vf - upV * 3, 0);
          falls.push({ x0: Math.min(ax, bx2), x1: Math.max(ax, bx2), y0: Math.min(ay, by2), y1: Math.max(ay, by2) });
        }
      });
    }
  }

  // -- the gloom on the water under and beside the level part, then the shadow, under everything
  BK.outline();
  const sh = BK.sh, d = BK.d, pw = BK.pw, ph = BK.ph, SHC = SHADE.map((v) => v * 0.6);
  const out = new Uint8ClampedArray(pw * ph * 4);
  const inv = { c: Fr.c, s: Fr.s };
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const p = j * pw + i, x = BK.x0 + (i + 0.5) / PX, y = BK.y0 + (j + 0.5) / PX;
    const wet = inRiver(x, y, 0);
    let a = 0;
    if (sh[p]) {
      let ring = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const I = i + di, J = j + dj; if (I < 0 || J < 0 || I >= pw || J >= ph || !sh[J * pw + I]) ring = 1; }
      a = ring ? (bay(i, j) < 0.7 ? SH_A * 0.9 : 0) : SH_A;
      if (!wet) a *= 0.72;
    }
    if (wet) {
      const dx = x - b.x, dy = y - b.y, u = dx * inv.c + dy * inv.s, v = -dx * inv.s + dy * inv.c;
      if (u > A && u < B) { const gap = hw + BATTER * Z + 4 - Math.abs(v); if (gap > 0) a = Math.max(a, Math.min(0.42, 0.18 + gap * 0.025)); }
    }
    const o = p * 4;
    if (d[o + 3]) { out[o] = d[o]; out[o + 1] = d[o + 1]; out[o + 2] = d[o + 2]; out[o + 3] = 255; }
    else if (a > 0) { out[o] = SHC[0]; out[o + 1] = SHC[1]; out[o + 2] = SHC[2]; out[o + 3] = Math.round(a * 255); }
  }
  BK.d = out;
  const back = { cv: BK.canvas(), x0: BK.x0, y0: BK.y0, w: BK.pw / PX, h: BK.ph / PX };
  let bytes = BK.bytes();
  const front = fronts.map((f) => { bytes += f.G.bytes(); return { cv: f.G.canvas(), x0: f.G.x0, y0: f.G.y0, w: f.G.pw / PX, h: f.G.ph / PX, key: f.key }; });
  return { back, front, lamps, banners: banners.map((bn) => ({ ...bn, frames: bannerFrames(bn.flip) })), feet, falls, hutWin, bytes };
};

// the toll's banner, four frames stirring in the breeze (a fold travels down the cloth, the hem sways)
const bannerFrames = (flip) => {
  const out = [];
  for (let f = 0; f < 4; f++) {
    const w = 4, h = 8, cv = document.createElement("canvas"); cv.width = (w + 2) * PX; cv.height = h * PX;
    const c = cv.getContext("2d"), ph = (f / 4) * Math.PI * 2;
    for (let j = 0; j < h * PX; j++) for (let i = 0; i < w * PX; i++) {
      const sw = Math.round(Math.sin(ph - j * 0.32) * 1.4 * (j / (h * PX)));
      const tail = j > h * PX - 4 && Math.abs(i - (w * PX - 1) / 2) < (j - (h * PX - 4)) * 0.9;
      if (tail) continue;
      const fold = Math.sin(ph - j * 0.5 + i * 0.6) > 0.55;
      let col = i === 0 || i === w * PX - 1 ? BANNER[0] : j % 7 === 3 && i > 1 && i < w * PX - 2 ? BANNER[3] : fold ? BANNER[2] : BANNER[1];
      if (WARM && i < 3) col = mix(col, SUNC, 0.2 * WARM);
      c.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      c.fillRect(1 + i + sw, j, 1, 1);
    }
    out.push(cv);
  }
  return out;
};

// the area's road, as tones darkest first (the bridge is built WITH the road: its ramps are the road)
const roadTones = () => {
  const R = REALM || {}, main = hex(R.PATH_MAIN || "#c9a46c"), dk = hex(R.PATH_DK || "#9e7d4e"), edge = hex(R.PATH_EDGE || "#7a6040");
  const sat = (c, k) => { const l = (c[0] + c[1] + c[2]) / 3; return c.map((x) => Math.max(0, Math.min(255, x + (x - l) * k * 2))); };
  return [sat(mix(dk, edge, 0.3), 0.14), sat(mix(main, dk, 0.5), 0.16), sat(main, 0.16), sat(mix(main, [255, 255, 255], 0.12), 0.14), sat(mix(main, [255, 255, 255], 0.24), 0.1)];
};
const turfTones = () => {
  const R = REALM || {}, g = hex(R.GRASS || "#82b256"), dk = hex(R.GRASS_DK || "#628f3d"), lt = hex(R.GRASS_LT || "#a4d06c");
  return [mix(dk, [30, 40, 26], 0.45), dk, mix(dk, g, 0.5), g, lt];
};
