// The overhaul water's MOVING parts (B1): flow dashes along lanes, foam working at the feet of cut banks
// and quay walls, the weir's fall and churn, rings opening on slack water.
// buildLive(F, img) runs inside the bake (water.js bakeWater) with the field and the baked overlay; it
// keeps only small lists and sprites. drawLive(ctx, g) runs every frame: blits and fillRects only.
// The water shade: once after a bake (the first live frame) the ground layer is read ONCE over the
// lanes' points to find which lie in a cast shadow (shadows are baked after the water); a dash there
// is drawn in the shaded tones, so a shadow on the river is never lit up by the current.
import { lineAt, probe, hs, vn, clamp } from "./field.js";
import { underBridge } from "../../data/terrain.js";
import { W, H, WALL_W } from "../../data/constants.js";
import { groundLayer } from "../world.js";

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const WA = ["#18384a", "#1f4a5a", "#28606c", "#33787c", "#46908a", "#68aa98", "#96c6ac"].map(hex);
const FOAM = "#f2f4e6", FOAM2 = "#cfe2da";
const TAU = Math.PI * 2;
const vnp = (x, y, s, P) => {   // value noise repeating every P cells along x
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const x0 = ((xi % P) + P) % P, x1 = (x0 + 1) % P;
  const a = hs(x0, yi, s), b = hs(x1, yi, s), c = hs(x0, yi + 1, s), d = hs(x1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

let LIVE = null;
const NA = 16;          // dash headings
const LENS = [6, 9, 12]; // dash lengths, art px
// dash sprites: [tone][len][angle] (tone 0 bright, 1 soft, 2 in shade); 12 x 12 art px each
let DASH = null;
function dashSprites() {
  if (DASH) return DASH;
  const tones = [[WA[6], WA[5], WA[6]], [WA[5], WA[4], WA[5]], [WA[3], WA[2], WA[3]]];
  DASH = tones.map(([hi, lo, core]) => LENS.map((L) => Array.from({ length: NA }, (_, a) => {
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
    const c = cv.getContext("2d"), img = c.createImageData(16, 16), P = img.data;
    const ang = (a / NA) * TAU, cx = Math.cos(ang), cy = Math.sin(ang);
    for (let t = -L / 2; t <= L / 2; t += 0.5) {
      const x = Math.round(8 + cx * t - 0.5), y = Math.round(8 + cy * t - 0.5); if (x < 0 || y < 0 || x > 15 || y > 15) continue;
      const head = t > L / 2 - 1.6, tail = t < -L / 2 + 1.6, col = head && L > 4 ? core : tail ? lo : hi;
      const o = (y * 16 + x) * 4; P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = tail ? 120 : 185;
    }
    c.putImageData(img, 0, 0); return cv;
  })));
  return DASH;
}
// rings on still water: 8 frames, art px
let RINGS = null;
function ringSprites() {
  if (RINGS) return RINGS;
  RINGS = Array.from({ length: 8 }, (_, f) => {
    const S = 20, cv = document.createElement("canvas"); cv.width = S; cv.height = 12;
    const c = cv.getContext("2d"), img = c.createImageData(S, 12), P = img.data;
    const k = f / 8, r = 1.5 + k * 8, al = 0.6 * (1 - k) * (k < 0.1 ? 0.6 : 1), n = Math.max(12, Math.round(r * 6));
    const dot = (x, y, col, a) => { if (x < 0 || y < 0 || x >= S || y >= 12) return; const o = (y * S + x) * 4; P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = Math.max(P[o + 3], Math.round(a * 255)); };
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; dot(Math.round(10 + Math.cos(a) * r), Math.round(6 + Math.sin(a) * r * 0.5), Math.sin(a) > 0 ? hex(FOAM2) : hex(FOAM), Math.sin(a) > 0 ? al : al * 0.7); }
    if (k < 0.5 && r > 4) { const r2 = r * 0.55; for (let i = 0; i < n; i += 2) { const a = (i / n) * TAU; dot(Math.round(10 + Math.cos(a) * r2), Math.round(6 + Math.sin(a) * r2 * 0.5), hex(FOAM2), al * 0.6); } }
    if (f === 0) { dot(10, 5, hex(FOAM), 0.9); dot(9, 6, hex(FOAM2), 0.7); dot(11, 6, hex(FOAM2), 0.7); }
    c.putImageData(img, 0, 0); return cv;
  });
  return RINGS;
}

const fieldAt = (F, x, y) => { const i = Math.floor((x - F.x0) * F.k), j = Math.floor((y - F.y0) * F.k); return i < 0 || j < 0 || i >= F.w || j >= F.h ? -1 : j * F.w + i; };
const lumaOf = (r, g, b) => r * 0.3 + g * 0.59 + b * 0.11;

export function buildLive(F, img) {
  if (!F) { LIVE = null; return; }
  const lanes = [], feet = [], rings = [], weirs = [];
  const IP = img.data, XR = W - WALL_W;
  const pt = {};
  F.bodies.forEach((B, bi) => {
    const hw0 = B.hwMax, flow = B.plan.flow || 1, weir = B.plan.weir;
    const lats = hw0 >= 12 ? [-0.62, -0.32, 0, 0.32, 0.62] : [-0.5, 0, 0.5];
    for (const lat of lats) {
      const n = Math.ceil(B.total), xs = new Float32Array(n), ys = new Float32Array(n), an = new Uint8Array(n), ok = new Uint8Array(n), lum = new Float32Array(n);
      for (let s = 0; s < n; s++) {
        const p = lineAt(B, s, pt), x = p.x - p.uy * lat * p.hw, y = p.y + p.ux * lat * p.hw;
        xs[s] = Math.round(x * 2) / 2; ys[s] = Math.round(y * 2) / 2;
        an[s] = ((Math.round((Math.atan2(p.uy, p.ux) / TAU) * NA) % NA) + NA) % NA;
        if (x < 1 || y < 1 || x > XR - 1 || y > H - 1) continue;
        if (weir != null && s > weir - 4 && s < weir + 26) continue;
        const q = fieldAt(F, x, y); if (q < 0 || F.BODY[q] < 0) continue;
        if (F.D[q] > -(F.FW[q] / 8 + 4)) continue;          // keep off the faces and the edge
        if (underBridge(x, y, 2)) continue;                    // a deck covers it
        ok[s] = 1; const o = q * 4; lum[s] = lumaOf(IP[o], IP[o + 1], IP[o + 2]);
      }
      const v = (24 - 14 * Math.abs(lat) / 0.62) * flow, nd = Math.round(B.total / (lat === 0 ? 20 : 28));
      const dashes = Array.from({ length: nd }, (_, i) => ({ ph: hs(i, Math.round(lat * 100), 7 + bi) * B.total, len: hs(i, 3, 9 + bi) > 0.6 ? 2 : hs(i, 4, 9) > 0.35 ? 1 : 0, tone: Math.abs(lat) < 0.4 && hs(i, 5, 11) > 0.45 ? 0 : 1 }));
      lanes.push({ xs, ys, an, ok, lum, shade: new Uint8Array(n), n, v, dashes });
    }
    // foam at the feet of far faces (cut banks, quay walls) and along their lap
    for (const side of [-1, 1]) for (let s = 0; s < B.total; s += 1.25) {
      const p = lineAt(B, s, pt), px = -p.uy * side, py = p.ux * side;
      const o = probe(p.x + px * (p.hw - 0.4), p.y + py * (p.hw - 0.4));
      if (!o.B || o.B !== B || o.fw < 2 || o.ny > 0.35) continue;
      const r = p.hw - o.fw / 2 - 0.55, x = Math.round((p.x + px * r) * 2) / 2, y = Math.round((p.y + py * r) * 2) / 2;
      if (x < 0 || y < 0 || x > XR || y > H || underBridge(x, y, 2)) continue;
      feet.push({ x, y, s, side, quay: o.kind === "quay" });
    }
    // the weir: 6 frames of its fall and churn over the baked sill
    if (weir != null) {
      let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; const px = [];
      for (let j = 0; j < F.h; j++) for (let i = 0; i < F.w; i++) {
        const q = j * F.w + i; if (F.BODY[q] !== bi || F.D[q] >= 0 || -F.D[q] < F.FW[q] / 8) continue;
        const dw = (F.S[q] - weir) * 2; if (dw < 0 || dw >= 46) continue;
        px.push([i, j, dw]); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j);
      }
      if (px.length) {
        const ww = i1 - i0 + 1, wh = j1 - j0 + 1, ax0 = Math.round(F.x0 * 2), ay0 = Math.round(F.y0 * 2);
        const frames = Array.from({ length: 6 }, (_, f) => {
          const cv = document.createElement("canvas"); cv.width = ww; cv.height = wh;
          const c = cv.getContext("2d"), im = c.createImageData(ww, wh), P = im.data, t = f / 6;
          for (const [i, j, dw] of px) {
            const X = ax0 + i, Y = ay0 + j; let col = null, a = 255;
            if (dw < 5) { const ff = hex(FOAM), f2 = hex(FOAM2), u = ((Math.floor(X / 2 + t * 6 + hs(X, 0, 61) * 3)) % 3) / 3; col = [ff[0] + (f2[0] - ff[0]) * u, ff[1] + (f2[1] - ff[1]) * u, ff[2] + (f2[2] - ff[2]) * u]; if (dw > 3.6 && hs(X, f, 62) > 0.5) col = WA[5]; }
            else {
              // the churn runs off downstream: one period of 15 art px a loop of 6 frames (2.5 px a frame)
              const ua = (dw - t * 15) / 3, ub = (dw - t * 15) / 1.5;
              const fo = vnp(ua, X / 5, 63, 5) * (1 - (dw - 5) / 41) * 1.5 + vnp(ub, X / 2.5, 64, 10) * 0.35;
              if (fo > 0.82) col = hex(FOAM); else if (fo > 0.62) { col = hex(FOAM2); a = 190; } else if (fo > 0.5) { col = WA[5]; a = 150; }
            }
            if (!col) continue;
            const o = ((j - j0) * ww + (i - i0)) * 4; P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = a;
          }
          c.putImageData(im, 0, 0); return cv;
        });
        weirs.push({ x: F.x0 + i0 / F.k, y: F.y0 + j0 / F.k, w: ww / F.k, h: wh / F.k, frames });
      }
    }
  });
  // rings: a few spots of slack water well clear of the banks
  const cand = [];
  for (let j = 0; j < F.h; j += 6) for (let i = 0; i < F.w; i += 6) {
    const q = j * F.w + i; if (F.BODY[q] < 0) continue;
    const e = -F.D[q] - F.FW[q] / 8, kd = F.KIND[q];
    if ((kd === 2 && e > 8 && e < 20) || (kd === 0 && e > 7 && e < 11 && F.Q[q] < 0.75)) {
      const x = F.x0 + (i + 0.5) / F.k, y = F.y0 + (j + 0.5) / F.k;
      if (x > XR - 4 || x < 2 || y < 2 || y > H - 2 || underBridge(x, y, 8)) continue;
      cand.push({ x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, r: hs(i, j, 301) + (kd === 2 ? 0.6 : 0) });
    }
  }
  cand.sort((a, b) => b.r - a.r);
  for (const c of cand) { if (rings.length >= 6) break; if (rings.some((r) => Math.hypot(r.x - c.x, r.y - c.y) < 50)) continue; rings.push({ ...c, per: 3.5 + c.r * 2.5, ph: c.r * 7 }); }
  LIVE = { lanes, feet, rings, weirs, shaded: false, x0: F.x0, y0: F.y0, x1: F.x0 + F.w / F.k, y1: F.y0 + F.h / F.k };
}

// once a bake: which lane points lie in a baked cast shadow
function findShade() {
  LIVE.shaded = true;
  let gl; try { gl = groundLayer(); } catch (e) { return; }
  if (!gl) return;
  const R = gl.width / W, x0 = Math.max(0, Math.floor(LIVE.x0 * R)), y0 = Math.max(0, Math.floor(LIVE.y0 * R));
  const x1 = Math.min(gl.width, Math.ceil(LIVE.x1 * R)), y1 = Math.min(gl.height, Math.ceil(LIVE.y1 * R));
  if (x1 <= x0 || y1 <= y0) return;
  const D = gl.getContext("2d").getImageData(x0, y0, x1 - x0, y1 - y0).data, ww = x1 - x0;
  for (const L of LIVE.lanes) for (let s = 0; s < L.n; s++) {
    if (!L.ok[s]) continue;
    const i = Math.floor(L.xs[s] * R) - x0, j = Math.floor(L.ys[s] * R) - y0; if (i < 0 || j < 0 || i >= ww || j >= y1 - y0) continue;
    const o = (j * ww + i) * 4, lu = lumaOf(D[o], D[o + 1], D[o + 2]);
    if (lu < L.lum[s] * 0.9) L.shade[s] = 1;
  }
}

let LAST_MS = 0;
export const liveStats = () => ({ ms: LAST_MS, lanes: LIVE ? LIVE.lanes.length : 0, feet: LIVE ? LIVE.feet.length : 0 });
export function drawLive(ctx, g) {
  if (!LIVE) return;
  const T0 = performance.now();
  if (!LIVE.shaded) findShade();
  const D = dashSprites(), time = g.time || 0;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  // the current: dashes travelling down each lane
  for (const L of LIVE.lanes) {
    for (const d of L.dashes) {
      const s = Math.floor((((d.ph + time * L.v) % L.n) + L.n) % L.n);
      if (!L.ok[s]) continue;
      const t = L.shade[s] ? 2 : d.tone;
      ctx.drawImage(D[t][d.len][L.an[s]], L.xs[s] - 4, L.ys[s] - 4, 8, 8);
    }
  }
  // the weir: its fall and churn, 12 frames a second
  for (const wr of LIVE.weirs) ctx.drawImage(wr.frames[Math.floor(time * 12) % 6], wr.x, wr.y, wr.w, wr.h);
  // rings on slack water
  const RS = ringSprites();
  for (const r of LIVE.rings) {
    const u = (((time + r.ph) / r.per) % 1 + 1) % 1; if (u >= 0.6) continue;
    ctx.drawImage(RS[Math.floor((u / 0.6) * 8)], r.x - 5, r.y - 3, 10, 6);
  }
  // foam working at the feet of the faces, scrolling downstream (10 steps a second)
  const tq = Math.floor(time * 10) / 10;
  ctx.fillStyle = FOAM;
  for (const f of LIVE.feet) {
    const cell = Math.floor((f.s - tq * (f.quay ? 9 : 6)) / 1.25);
    const h = hs(cell, f.side, f.quay ? 41 : 43);
    if (h > (f.quay ? 0.78 : 0.62)) ctx.fillRect(f.x, f.y, h > 0.85 ? 1 : 0.5, 0.5);
  }
  ctx.fillStyle = FOAM2;
  for (const f of LIVE.feet) {
    const cell = Math.floor((f.s - tq * 6) / 2.5), h = hs(cell, f.side, 47);
    if (h > 0.7) ctx.fillRect(f.x + 0.5, f.y + 0.5, 0.5, 0.5);
  }
  ctx.imageSmoothingEnabled = sm;
  LAST_MS = LAST_MS * 0.9 + (performance.now() - T0) * 0.1;
}

export const liveMB = () => {
  if (!LIVE) return 0;
  let b = 144 * 16 * 16 * 4 + 8 * 20 * 12 * 4;
  for (const L of LIVE.lanes) b += L.n * 16;
  for (const wr of LIVE.weirs) b += wr.frames.length * wr.w * wr.h * 16;
  return b / 1048576;
};
