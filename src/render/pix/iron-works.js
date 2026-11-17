// The Iron Marches' works and coast, sculpted (2026-11-17, look B "worked"): the salt pans
// (`irpan`), the feed channel and its sluice (`irsluice`) and the wreck on the strand
// (`irwreck`). Same signature, footprint and anchor as the old painters in scenery-iron.js
// (ctx, x, y, s, o): board units in, art pixels (RES per unit) inside the sculpts. The beds and
// the ditch were already painted pixel by pixel as ground and keep that; what stands on them
// (heaps, planks, the sluice gate, the bridge) and every timber of the wreck is sculpted here
// in pix.js, the one-pixel tinted line, one sun from the upper left. Baked once with the decor.
import { RES } from "../../data/constants.js";
import { REALM } from "../../data/maps.js";
import { darken, lighten, mix, rgba, tuft, hash, PX } from "../paint.js";
import { Pix, mat, toCanvas } from "./pix.js";

const ap = (v) => Math.round(v * PX) / PX;
const U = RES;                                   // art pixels per board unit
const vnoise = (seed, cell, x, y) => {
  const fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const h = (i, j) => hash(seed + i * 131, j * 71 + 3);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
};

const CLAY = "#8a7658", CLAY_LT = "#a8936e", CLAY_DK = "#5c4a3a";
const WOOD = "#6a4a2e", WOOD_LT = "#8a6440", WOOD_DK = "#46301e", IRON = "#4a4e5a";
const SAND = "#c2b89c", GRIT = "#8e8c86";
const PAN = {
  mud: "#5a5244", mudLt: "#6e6552", brine: "#56707c", brineLt: "#7a94a0", glint: "#b4c8d0",
  crust: "#cfc8b8", crustSh: "#aca598", crustPk: "#c8b4aa",
};

let M_ = null;
const M = () => M_ || (M_ = {
  wood: mat(WOOD), woodL: mat(WOOD_LT), woodD: mat(WOOD_DK), iron: mat(IRON),
  plank: mat("#8a6c48"), plankL: mat("#a58660"), grit: mat(mix(GRIT, "#6c7468", 0.35), { contrast: 0.5 }),
  salt: mat("#e0dace", { contrast: 0.7 }), saltK: mat("#d4cbc6", { contrast: 0.8 }), pink: mat("#e0c8c2", { contrast: 0.6 }),
  dw: mat("#8a7e72", { contrast: 0.85 }), dwL: mat("#a89c8a", { contrast: 0.85 }), dwD: mat("#5e5450", { contrast: 0.85 }),
  weed: mat("#4e5a34"), rope: mat("#a89676"),
});

// build a sculpt and stamp it with its foot (0, 0) on (x, gy)
const sculpt = (ctx, x, gy, w, h, build) => {
  const b = new Pix(w, h, w >> 1, h - 12);
  build(b);
  const img = b.resolve({ line: "tint" }), cv = toCanvas(img), q = 1 / RES;
  ctx.drawImage(cv, x - img.ox * q, gy - img.oy * q, img.w * q, img.h * q);
};
const dapple = (ctx, cx, cy, rx, ry, a, seed) => {     // a cast shadow in whole art pixels, a few holes
  const q = 1 / RES;
  ctx.fillStyle = rgba("#2a1c2c", a);
  for (let j = Math.floor((cy - ry) / q); j <= Math.ceil((cy + ry) / q); j++) for (let i = Math.floor((cx - rx) / q); i <= Math.ceil((cx + rx) / q); i++) {
    const u = (i * q + q / 2 - cx) / rx, v = (j * q + q / 2 - cy) / ry;
    if (u * u + v * v > 1 || (hash(i + seed, j) > 0.88 && Math.hypot(u, v) > 0.4)) continue;
    ctx.fillRect(i * q, j * q, q, q);
  }
};

// a cone of raked salt (art px r wide each side): lit face left, shade right, furrows, a pinkish crust
const heapAt = (ctx, hx, hgy, r, seed) => {
  const m = M();
  dapple(ctx, hx + r * 0.35 / U, hgy + 0.2, r * 0.85 / U, r * 0.2 / U, 0.24, seed);
  sculpt(ctx, hx, hgy, Math.ceil(r * 2) + 16, Math.ceil(r * 1.2) + 24, (b) => {
    b.part(); b.ellipse(0, -r * 0.1, r, r * 0.55, m.salt, 0, { round: 0.95 });
    b.part(); b.ellipse(-r * 0.12, -r * 0.42, r * 0.62, r * 0.46, m.salt, 0.2, { round: 0.95, noLine: true });
    for (let k = 1; k <= 3; k++) b.toneLine(-r * (0.7 - k * 0.1), -k * r * 0.2, r * (0.5 - k * 0.1), -k * r * 0.2 + 1, -1);
    for (let i = 0; i < 4; i++) b.dot(-r * 0.4 + hash(seed, i + 5) * r * 0.9, -r * 0.1 - hash(seed, i + 9) * r * 0.5, m.pink, 0.3, { noLine: true });
  });
};

// ---- Brinewick: a salt bed (ground, painted pixel by pixel) with what stands in it ----------
// v: 0 brine let in (a sluice board in the near bank), 1 crusting, 2 raked up (plank, heaps), 3 drying.
export const saltPanPix = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed, H = (i) => hash(sd, i), m = M();
  const hw = (13 + H(1) * 5) * s, hh = (6.5 + H(2) * 2.5) * s, cx = x + (H(3) - 0.5) * 3 * s, cy = gy - hh;
  const bank = 2.6 * s, rr = (3 + H(5) * 2) * s, skew = (H(4) - 0.5) * 0.14;
  const BK = mix(CLAY, REALM.GRASS_DK, 0.38), BK_LT = mix(CLAY_LT, REALM.GRASS, 0.45), BK_DK = mix(CLAY_DK, REALM.GRASS_DK, 0.35);
  const sdf = (px, py) => {
    const lx = px - cx - (py - cy) * skew, ly = py - cy;
    const qx = Math.abs(lx) - (hw - rr), qy = Math.abs(ly) - (hh - rr);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr
      + (vnoise(sd, 6, px, py) - 0.5) * 1.8 * s + (vnoise(sd + 9, 2, px, py) - 0.5) * 0.7;
  };
  const cr = (px, py) => vnoise(sd + 31, 3.2, px, py), cr2 = (px, py) => vnoise(sd + 57, 1.6, px, py);
  const x0 = ap(cx - hw - 4 * s), x1 = cx + hw + 4 * s, y0 = ap(cy - hh - 3 * s), y1 = cy + hh + 3 * s;
  for (let py = y0; py < y1; py += 0.5) for (let px = x0; px < x1; px += 0.5) {
    const d = sdf(px, py);
    if (d > 1.2) continue;
    const hp = hash(Math.round(px * 2) * 7 + sd, Math.round(py * 2) * 3 + 1);
    let col;
    if (d > 0) {
      if (hp > (1.2 - d) * 0.55) continue;
      col = mix(BK_DK, REALM.GRASS_DK, 0.55);
    } else if (d > -bank) {
      // the bank: a low ridge lit by its slope, outer face out, inner face in, a lit crown between
      const t = -d / bank;
      const gx = sdf(px + 0.5, py) - sdf(px - 0.5, py), gq = sdf(px, py + 0.5) - sdf(px, py - 0.5), gl = Math.hypot(gx, gq) || 1;
      const sgn = t > 0.6 ? -1 : 1, lit = sgn * (gx / gl * -0.6 + gq / gl * -0.8);
      col = t > 0.3 && t <= 0.6 ? mix(BK, BK_LT, 0.55) : lit > 0.3 ? BK_LT : lit < -0.3 ? BK_DK : BK;
      if (hp < 0.07) col = REALM.GRASS_DK; else if (hp > 0.95) col = mix(BK_LT, REALM.GRASS, 0.5);
    } else {
      const f = -d - bank, north = py < cy - (hh - bank) * 0.45;
      const n = cr(px, py), n2 = cr2(px, py);
      if (f < 1 * s + n2 * 0.8) col = hp < 0.5 ? PAN.mud : PAN.mudLt;
      else if (v === 0) {
        col = PAN.brine;
        if (f < 2.2 * s && n > 0.55) col = mix(PAN.crust, PAN.mudLt, 0.4);
        else if (hash(Math.round(py * 2) + sd, Math.floor(px / 3 + (py % 2))) < 0.05) col = PAN.glint;
        else if (n2 > 0.72) col = PAN.brineLt;
      } else if (v === 3) {
        col = mix(PAN.brine, PAN.brineLt, 0.45);
        if (n > 0.6) col = Math.abs(n2 - 0.5) < 0.06 ? PAN.crustSh : n > 0.7 ? PAN.crust : PAN.crustPk;
        else if (hash(Math.round(py * 2) + sd, Math.floor(px / 3)) < 0.04) col = PAN.glint;
      } else {
        col = PAN.crust;
        if (n < 0.24) col = n < 0.2 && hp < 0.06 ? PAN.glint : PAN.brine;
        else if (n < 0.3) col = mix(PAN.crust, PAN.mudLt, 0.55);
        else if (Math.abs(n2 - 0.5) < 0.045) col = PAN.crustSh;
        else if (f < 2.4 * s) col = mix(PAN.crust, PAN.mudLt, 0.3);
        if (v === 2 && col === PAN.crust && Math.round(py * 2) % 3 === 0) col = PAN.crustSh;
        if (v === 1 && col === PAN.crust && n > 0.8) col = PAN.crustPk;
      }
      if (north && f < 2.6 * s) col = darken(col, 0.18);
    }
    ctx.fillStyle = col; ctx.fillRect(px, py, 0.5, 0.5);
  }
  const nb = ap(cy + hh - bank * 0.6);
  if (v === 2) {
    // a plank laid in the bed for the rakers, then the heaps they raked
    const px = cx + hw * 0.1, py = cy - hh * 0.25, pl = hw * 0.55 * U;
    dapple(ctx, px + 0.5, py + 1.6 * s, hw * 0.55, 0.9 * s, 0.22, sd);
    sculpt(ctx, px, py, Math.ceil(pl * 2) + 20, 30, (b) => {
      b.part(); b.poly([[-pl, 0], [pl, -0.5], [pl, 2 * s * 1.4], [-pl, 2 * s * 1.4]], m.plank, 0, { n: [0, -0.4, 0.9] });
      b.toneLine(-pl + 1, 2.2 * s, pl - 1, 2 * s, -1);
      for (const k of [-0.7, 0.1, 0.8]) b.toneLine(pl * k, 0, pl * k + 1, 2.4 * s, -1);
    });
    heapAt(ctx, cx - hw * 0.35, cy + hh * 0.35, 3.6 * s * U, sd + 1);
    heapAt(ctx, cx + hw * 0.15, cy + hh * 0.45, 4.2 * s * U, sd + 2);
  } else if (v === 0) {
    // the sliding board let into the near bank
    sculpt(ctx, cx, nb + 1.5 * s, 40, 34, (b) => {
      const bw = 3 * s * U, bh = 3.6 * s * U;
      b.part(); b.rect(-bw / 2, -bh, bw, bh, m.wood, 0, { n: [0, 0.1, 0.98] });
      b.toneLine(-bw / 2 + 1, -bh * 0.5, bw / 2 - 1, -bh * 0.5, -1);
      b.part(); b.rect(-bw / 2, -bh, bw, 2, m.woodL, 0.2, { n: [0, -0.7, 0.7], noLine: true });
    });
  }
  if (H(7) > 0.35) tuft(ctx, cx - hw + 1, cy + hh + 1, 0.45, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
  if (H(8) > 0.5) tuft(ctx, cx + hw - 2, cy - hh + 1, 0.4, REALM.TUFT, REALM.GRASS_LT, sd + 1, { n: 3 });
};

// ---- the feed channel: a cut up from the shore, a plank bridge, the sluice gate ----------
export const sluicePix = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, L = 34 * s, m = M();
  const BK = mix(CLAY, REALM.GRASS_DK, 0.38), BK_DK = mix(CLAY_DK, REALM.GRASS_DK, 0.35), BK_LT = mix(CLAY_LT, REALM.GRASS, 0.45);
  const midx = (py) => x + Math.sin((gy - py) * 0.09 + sd) * 1.6 * s;
  for (let py = ap(gy - L); py < gy + 1; py += 0.5) {
    const mx = midx(py), w = (2.2 + vnoise(sd, 5, mx, py) * 0.8) * s;
    for (let px = ap(mx - w - 2 * s); px < mx + w + 2 * s; px += 0.5) {
      const d = Math.abs(px - mx) - w, hp = hash(Math.round(px * 2) + sd, Math.round(py * 2));
      let col;
      if (d > 1.2 * s) { if (hp > 0.45) continue; col = mix(BK_DK, REALM.GRASS_DK, 0.55); }
      else if (d > 0) col = px < mx ? BK_DK : BK_LT;
      else if (d > -0.8) col = PAN.mud;
      else col = hash(Math.round(py * 2) + sd, Math.floor(px * 2)) < 0.06 ? PAN.glint : hp < 0.3 ? PAN.brineLt : PAN.brine;
      ctx.fillStyle = col; ctx.fillRect(px, py, 0.5, 0.5);
    }
  }
  // the plank bridge: its shade falls on the water below it, two planks end-lapped on sleepers
  const by = gy - L * 0.45, bx = midx(by);
  ctx.fillStyle = rgba("#1c2a34", 0.34);
  for (let i = 0; i < Math.round(8 * s * U); i++) ctx.fillRect(bx - 3.5 * s + i * 0.5 + 0.5, by + 3.6 * s, 0.5, 1);
  sculpt(ctx, bx, by, Math.ceil(12 * s * U) + 24, 40, (b) => {
    const hw = 5 * s * U, th = 1.7 * s * U;
    for (const k of [-0.62, 0.62]) { b.part(); b.rect(hw * k - 1.5, -1, 3, th * 2 + 3, m.woodD, 0, { n: [0, 0, 1] }); }
    for (let k = 0; k < 2; k++) {
      const yy = k * th * 1.05;
      b.part(); b.rect(-hw, yy, hw * 2, th, k ? m.plank : m.plankL, 0.5 + k * 0.1, { n: [0, -0.35, 0.9] });
      b.toneLine(-hw + 1, yy + th * 0.55, hw - 1, yy + th * 0.55, -1);
      b.toneLine(hw * (k ? 0.3 : -0.35), yy, hw * (k ? 0.3 : -0.35), yy + th, -1);
      b.dot(-hw + 2, yy + 1, m.iron, 0.7, { noLine: true }); b.dot(hw - 3, yy + 1, m.iron, 0.7, { noLine: true });
    }
  });
  // the sluice gate: two posts with capped heads, the lifting board between, its iron rack and bar
  const gx = midx(gy - 2);
  dapple(ctx, gx + 2 * s, gy + 0.3, 7 * s, 0.9 * s, 0.24, sd + 4);
  sculpt(ctx, gx, gy, 60, 70, (b) => {
    const ph = 9 * s * U, pw = 2 * s * U;
    for (const px of [-5 * s * U, 3 * s * U]) { b.part(); b.rect(px, -ph, pw, ph, m.woodD, 0, { n: [px > 0 ? 0.3 : -0.3, 0, 0.95] }); b.toneLine(px + pw * 0.5, -ph + 2, px + pw * 0.5, -3, -1); }
    b.part(); b.rect(-5.5 * s * U, -10 * s * U, 11 * s * U, 1.5 * s * U, m.wood, 0.4, { n: [0, -0.5, 0.85] });
    b.part(); b.rect(-3 * s * U, -6 * s * U, 6 * s * U, 5 * s * U, m.plank, 0.2, { n: [0, 0.05, 1] });
    for (let k = 1; k < 3; k++) b.toneLine(-3 * s * U, -6 * s * U + k * 1.7 * s * U, 3 * s * U - 1, -6 * s * U + k * 1.7 * s * U, -1);
    b.part(); b.rect(-1, -13 * s * U, 2, 7 * s * U, m.iron, 0.6, { noLine: true });
    b.part(); b.rect(-2 * s * U, -13 * s * U, 4 * s * U, 2, m.iron, 0.7, { noLine: true });
    for (let k = 0; k < 3; k++) b.dot(-1 + (k % 2), -12 * s * U + k * 3 * s * U, m.woodL, 0.8, { noLine: true });
  });
  tuft(ctx, x - 6 * s, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
  tuft(ctx, x + 6 * s, gy - L * 0.7, 0.45, REALM.TUFT, REALM.GRASS_LT, sd + 3, { n: 3 });
};

// ---- the wreck on the strand: keel, ribs, a few strakes, stem post, her mast on the sand ----
// A chain of capsules along a quadratic curve: a bent timber, tapering a to b, depth z.
const bent = (b, p0, c, p1, ra, rb, mt, z, n = 6) => {
  let px = p0[0], py = p0[1];
  for (let i = 1; i <= n; i++) {
    const t = i / n, w = 1 - t, qx = w * w * p0[0] + 2 * w * t * c[0] + t * t * p1[0], qy = w * w * p0[1] + 2 * w * t * c[1] + t * t * p1[1];
    b.capsule(px, py, ra + (rb - ra) * ((i - 1) / n), qx, qy, ra + (rb - ra) * t, mt, z, { round: 0.95, limb: false });
    px = qx; py = qy;
  }
};
export const wreckPix = (ctx, x, y, s, o) => {
  const sd = o.seed, m = M(), k = U * s;
  const ax = -15 * k, ay = -14 * k, bx = 21 * k, by = -31 * k;                       // the keel's ends, art px from the foot
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, sx = uy, sy = -ux;
  const K = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
  const wx = (px) => x + px / U, wy = (py) => y + py / U;
  // the wash: foam caught on her seaward side
  for (let i = 0; i < 16; i++) {
    const [kx, ky] = K(hash(sd, i + 400)), off = (7 + hash(sd, i + 420) * 6) * k;
    ctx.fillStyle = `rgba(240,244,246,${0.18 + hash(sd, i + 440) * 0.18})`;
    ctx.fillRect(ap(wx(kx + sx * off)), ap(wy(ky + sy * off)), ap(2 + hash(sd, i + 460) * 3), 0.5);
  }
  dapple(ctx, x + 5 * s, y - 16 * s, 17 * s, 5 * s, 0.2, sd);
  sculpt(ctx, x, y, Math.ceil(150 * s) + 20, Math.ceil(125 * s) + 20, (b) => {
    // the landward frames: stubs, mostly buried
    for (let i = 0; i < 7; i++) {
      const t = 0.08 + i * 0.13, [kx, ky] = K(t), l = (1.5 + hash(sd, i + 30) * 2) * k;
      b.part(); bent(b, [kx, ky], [kx - sx * l, ky - sy * l + 1], [kx - sx * l * 1.4 + ux, ky - sy * l * 1.4 - 1.5 * k], 1.7, 1.1, m.dwD, 0.2, 3);
    }
    // the keel
    b.part(); b.capsule(ax, ay, 2.6, bx, by, 2.4, m.dw, 0.6, { round: 0.95, limb: false });
    b.toneLine(ax + 2, ay - 1, bx - 2, by - 1, 1);
    for (let i = 1; i < 5; i++) { const [kx, ky] = K(i / 5); b.dot(kx, ky + 0.5, m.iron, 0.8, { noLine: true }); }
    // the seaward ribs, up from the keel and leaning to the land
    const frames = [];
    for (let i = 0; i < 7; i++) {
      const t = 0.1 + i * 0.13, [kx, ky] = K(t), taper = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      const w = (4 + taper * 4) * k, h = (4 + taper * 8 - hash(sd, i) * 3) * k, broken = hash(sd, i + 50) < 0.3;
      const c1 = [kx + sx * w * 1.1, ky + sy * w * 1.1 + 1];
      const e = [kx + sx * w * 0.7 - sx * h * 0.15 + ux * 1.2 * k, ky + sy * w * 0.4 - h * (broken ? 0.55 : 1)];
      frames.push({ k: [kx, ky], c1, e, broken });
    }
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i];
      b.part(); bent(b, f.k, f.c1, f.e, 2.2, f.broken ? 1.5 : 1.2, i % 2 ? m.dw : m.dwL, 1 + i * 0.05, 7);
      if (f.broken) { b.dot(f.e[0], f.e[1] - 1, m.dwL, 1.5, { noLine: true }); b.dot(f.e[0] + 1, f.e[1], m.dwL, 1.5, { noLine: true }); }
    }
    // strakes still fast at her stern, running along the first frames
    for (let kk = 0; kk < 3; kk++) {
      const q = 0.35 + kk * 0.22, n = kk === 2 ? 2 : 3;
      const pt = (f) => [f.k[0] + (f.e[0] - f.k[0]) * q + (f.c1[0] - f.k[0]) * q * (1 - q) * 1.2, f.k[1] + (f.e[1] - f.k[1]) * q + (f.c1[1] - f.k[1]) * q * (1 - q) * 1.2];
      for (let i = 0; i < n; i++) {
        const p = pt(frames[i]), p2 = pt(frames[i + 1]);
        b.part(); b.capsule(p[0], p[1], 2, p2[0], p2[1], 2, kk % 2 ? m.dw : m.dwL, 1.6 + kk * 0.1, { round: 0.7, limb: false });
      }
    }
    // the stem post, raking up out of the wash
    b.part(); bent(b, [bx, by], [bx + 2 * k, by - 5 * k], [bx + 1 * k, by - 11 * k], 2.4, 1.8, m.dwL, 1.8, 7);
    b.dot(bx + 1 * k, by - 11 * k - 2, m.dwL, 2, { noLine: true });
    // her mast, broken off and lying on the sand landward of her; a yard and a hank of rope beside it
    const m0 = [ax + 4 * k - 7 * k * uy, ay + 8 * k], m1 = [ax + 30 * k, ay - 3 * k];
    b.part(); b.capsule(m0[0], m0[1], 3, m1[0], m1[1], 2.6, m.dw, 0.8, { round: 0.95, limb: false });
    b.toneLine(m0[0] + 2, m0[1] - 1.5, m1[0] - 2, m1[1] - 1.5, 1);
    b.part(); b.poly([[m1[0] - 1, m1[1] - 2.6], [m1[0] + 3.5 * k, m1[1] - 1 * k], [m1[0] + 1.5 * k, m1[1]], [m1[0] + 3 * k, m1[1] + 1.4 * k], [m1[0] - 1, m1[1] + 2.6]], m.dwL, 0.9, { n: [0, -0.2, 0.95] });
    const bandx = m0[0] + 7 * k; b.part(); b.rect(bandx, m0[1] - 3.6, 2, 7, m.iron, 1, { noLine: true });
    const yx = ax + 14 * k, yy = ay + 6 * k;
    b.part(); b.capsule(yx - 9 * k, yy + 5.5 * k, 1.6, yx + 7 * k, yy - 0.5 * k, 1.6, m.dwD, 0.7, { round: 0.9, limb: false });
    b.part(); b.ellipse(yx + 6 * k, yy + 2 * k, 3.2 * k, 1.8 * k, m.rope, 0.9, { round: 0.2, noLine: true });
    b.part(); b.ellipse(yx + 6 * k, yy + 2 * k, 1.6 * k, 0.8 * k, m.dwD, 1, { noLine: true });
    b.part(); bent(b, [yx + 4.5 * k, yy + 2 * k], [yx + 2 * k, yy + 4 * k], [yx - 1 * k, yy + 2.5 * k], 0.7, 0.7, m.rope, 0.9, 4);
  });
  // drifted sand over her landward side and the keel's roots, weed at the roots (the beach: no ink)
  for (let i = 0; i < 9; i++) {
    const [kx, ky] = K(i / 8), r = (2.2 + hash(sd, i + 70) * 1.8) * s;
    const mx = wx(kx - sx * 1.5 * k), my = wy(ky - sy * 1.5 * k + 1), ang = Math.atan2(uy, ux);
    ctx.fillStyle = darken(SAND, 0.07); ctx.beginPath(); ctx.ellipse(mx + 0.5, my + 0.5, r, r * 0.4, ang, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix(SAND, "#b0a68a", hash(sd, i + 90) * 0.6); ctx.beginPath(); ctx.ellipse(mx, my, r * 0.85, r * 0.32, ang, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    const [kx, ky] = K(0.1 + i * 0.13);
    ctx.fillStyle = i % 2 ? "#4e5a34" : "#3e4a2c";
    ctx.fillRect(ap(wx(kx + sx * 2 * k)), ap(wy(ky + sy * 2 * k)), 1, 0.5); ctx.fillRect(ap(wx(kx + sx * 2.5 * k) + 0.5), ap(wy(ky + sy * 2.5 * k) - 0.5), 0.5, 0.5);
  }
  sculpt(ctx, x + 18 * s, y + 3 * s, 24, 22, (b) => { b.part(); b.ellipse(0, -1, 3 * s, 2 * s, m.grit, 0, { round: 0.9 }); });
};
