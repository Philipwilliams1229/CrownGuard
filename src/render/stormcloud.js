// ============ STORM CLOUDS ============
// One painter for every storm cloud on the board: Ysolde's Thunderclap
// thunderhead (render/heroes/ysolde.js) and the Wizard Spire's Stormcaller
// finals (render/halls/wizard.js: the Tempest Court's lively grey-blue
// cloud, the Thunder Sovereign's black one).
//
// A cumulonimbus in the house style, shaded pixel by pixel on the art grid
// and baked: a flat, heavy underside (the belly, darkest) with a shadow band
// above it, two rows of billows and a crown of two domes, each billow lit
// from the sun (upper left) in stepped tones with a 1-px checker where two
// tones meet, a cool rim of light on its sunward edge, a dark crease where a
// nearer billow overlaps it; the house ink ring round the whole; ragged
// wisps trailing off both ends and a scrap of scud under the belly (those
// are translucent, so the ink never rings them).
//
// The cloud churns: each billow drifts on its own slow loop, baked as a few
// frames (`frames`, played at `fps`). A cloud can also be baked grown in
// (`grow` 0..1: a low wisp that heaps up into the tower), thinning away
// (`thin` 0..1: billows drift apart and the pixels drop out), and lit from
// inside by lightning (`lit`: a spot in the cloud that burns cool white, the
// tones round it raised). Every variant is a cached sprite, so a frame costs
// one drawImage; keep the keys few (quantize what you pass in).
//
// Coordinates: (x, y) is the middle of the cloud's flat base; the cloud
// rises `h` above it and spans `w`; the belly hangs about h × 0.14 below.

import { PX, hash, INK_LINE, inkOutline, rgb } from "./paint.js";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const KY = 0.86;                                   // billows a little wider than tall
const SUN3 = (() => { const v = [-0.45, -0.62, 0.64], l = Math.hypot(...v); return v.map((c) => c / l); })();
const SUN2 = (() => { const l = Math.hypot(SUN3[0], SUN3[1]); return [SUN3[0] / l, SUN3[1] / l]; })();

// tones, darkest first: 0 belly, 1 shadow band, 2 dark, 3 mid, 4 light,
// 5 lit face, 6 rim. `glow`: the lightning inside, dim → white-hot.
export const CLOUD_PALS = {
  // Ysolde's thunderhead: slate leaning to the board's plum shadows
  storm: {
    tones: ["#1e192d", "#2a2541", "#3a3656", "#4e4b70", "#67688e", "#868cae", "#b6bfd8"],
    glow: ["#5b6fb4", "#9ccbf2", "#eef9ff"], wisp: "#6a6a8e",
  },
  // the Tempest Court's: grey-blue and lively
  tempest: {
    tones: ["#252c3e", "#323c54", "#45536c", "#5d6e88", "#7d90aa", "#a5b7cb", "#d8e6f2"],
    glow: ["#4f9fd2", "#9ee0f6", "#f0fdff"], wisp: "#7a8ca6",
  },
  // the Thunder Sovereign's: black and brooding, its fire gold
  sovereign: {
    tones: ["#1d1828", "#272236", "#332e46", "#433d5a", "#585371", "#757391", "#9da1bf"],
    glow: ["#8a7440", "#e6cc6a", "#fff8d4"], wisp: "#4e4866",
  },
};

// ---- the shape -------------------------------------------------------------
// The billows, in units about the base's middle (y up is negative). Fixed
// for a (w, h, seed); `z` orders them back (crown) to front (the base row).
const LAYOUTS = new Map();
const layout = (w, h, seed, shape) => {
  const key = `${w}|${h}|${seed}|${shape}`;
  let B = LAYOUTS.get(key);
  if (B) return B;
  B = [];
  const nf = w >= 60 ? 5 : 4;
  const sp = (w * 0.92) / (nf + 0.7);               // spacing: neighbours overlap by a third
  const ph = (i) => [hash(seed, i * 3 + 101) * TAU, hash(seed, i * 3 + 102) * TAU, hash(seed, i * 3 + 103) * TAU];
  // the base row, cut flat by the base
  const rEnd = sp * 0.62;
  for (let i = 0; i < nf; i++) {
    const t = (i / (nf - 1)) * 2 - 1, e = 1 - Math.abs(t);
    const r = sp * (0.62 + 0.16 * e) * (0.92 + 0.16 * hash(seed, i));
    B.push({ x: t * (w / 2 - rEnd) + (hash(seed, i + 60) - 0.5) * r * 0.2, y: -r * 0.42, r, z: 3 + hash(seed, i + 40) * 0.5, tier: 0, p: ph(i) });
  }
  // the middle row, heaped toward the middle
  for (let i = 0; i < nf - 1; i++) {
    const t = ((i + 0.5) / (nf - 1)) * 2 - 1, e = 1 - Math.abs(t);
    const r = Math.max(sp * 0.7, h * (0.3 + 0.1 * e)) * (0.92 + 0.16 * hash(seed, i + 10));
    B.push({ x: t * (w / 2 - rEnd) * 0.78 + (hash(seed, i + 50) - 0.5) * r * 0.25, y: -h * (shape === "twin" ? 0.42 : 0.4 + 0.16 * e) + r * KY * 0.35, r, z: 2 + hash(seed, i + 70) * 0.3, tier: 1, p: ph(i + 10) });
  }
  // the crown: a high dome a little west, a lower one east ("twin": two
  // heads apart, a saddle between them, to frame what stands in front)
  const rt = h * 0.32, west = hash(seed, 20) > 0.35 ? -1 : 1;
  if (shape === "twin") {
    const rh = rt * 1.25;
    for (const sx of [-1, 1]) B.push({ x: sx * w * (0.25 + hash(seed, 23 + sx) * 0.04), y: -h + rh * KY * (sx === west ? 1 : 1.12), r: rh * (sx === west ? 1 : 0.92), z: 1 + (sx > 0 ? 0.2 : 0), tier: 2, p: ph(20 + sx) });
    LAYOUTS.set(key, B);
    return B;
  }
  B.push({ x: west * w * (0.05 + hash(seed, 21) * 0.05), y: -h + rt * KY, r: rt, z: 1, tier: 2, p: ph(20) });
  B.push({ x: -west * w * (0.11 + hash(seed, 22) * 0.05), y: -h * 0.86 + rt * 0.8 * KY, r: rt * 0.8, z: 1.2, tier: 2, p: ph(21) });
  LAYOUTS.set(key, B);
  return B;
};
// the billows at churn frame f, grown in to `grow`, thinned to `thin`
const posed = (w, h, seed, f, F, amp, grow, thin, shape) => {
  const a = (f / F) * TAU;
  const out = [];
  for (const b of layout(w, h, seed, shape)) {
    if (grow < 0.34 && b.tier === 2) continue;
    if (grow < 0.12 && b.tier === 1) continue;
    let x = b.x + Math.sin(a + b.p[0]) * amp, y = b.y + Math.cos(a + b.p[1]) * amp * 0.55, r = b.r + Math.sin(a + b.p[2]) * amp * 0.45;
    // growing: a low flat wisp first, heaping up into the tower
    const g = 0.3 + 0.7 * grow;
    x *= 0.55 + 0.45 * g; y *= g * g; r *= 0.4 + 0.6 * g;
    // thinning: billows drift apart and shrink
    x *= 1 + 0.12 * thin; r *= 1 - 0.22 * thin;
    out.push({ x, y, r, ry: r * KY, z: b.z, tier: b.tier });
  }
  return out.sort((p, q) => q.z - p.z);            // nearest first: the first that holds a pixel owns it
};

// ---- the bake ----------------------------------------------------------------
const CACHE = new Map();
const CAP = 200;
export const resetStormClouds = () => { CACHE.clear(); LAYOUTS.clear(); };
const cached = (key, make) => {
  let sp = CACHE.get(key);
  if (sp) return sp;
  if (CACHE.size >= CAP) { let n = 40; for (const k of CACHE.keys()) { CACHE.delete(k); if (--n <= 0) break; } }
  sp = make();
  CACHE.set(key, sp);
  return sp;
};
const hexA = (c) => rgb(c);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const bakeCloud = (k) => {
  const { w, h, seed, pal: palName, f, F, amp, grow, thin, lit, ink, dark, shape } = k;
  const pal = CLOUD_PALS[palName] || CLOUD_PALS.storm;
  // the ramp: the cloud's seven tones, then the lightning's three
  const R = pal.tones.map(hexA), WS = hexA(pal.wisp), G = pal.glow.map(hexA);
  // lit from inside: the tones washed toward the lightning's, then its own
  const RL = [...R.slice(0, 6).map((t) => t.map((ch, n) => Math.round(ch * 0.55 + G[0][n] * 0.45))), G[1], G[2]];
  const B = posed(w, h, seed, f, F, amp, grow, thin, shape);
  let top = 0, left = 0, right = 0;
  for (const b of B) { top = Math.min(top, b.y - b.ry); left = Math.min(left, b.x - b.r); right = Math.max(right, b.x + b.r); }
  const gh = -top;                                  // the height it stands to now
  const bd = Math.max(1, h * 0.15 * (0.5 + 0.5 * grow) * (1 - 0.5 * thin));
  const wl = w < 60 ? 1 + w * 0.08 : 2 + w * 0.12;  // the wisps' reach past the ends
  const padX = Math.ceil(wl + 3), padT = Math.ceil(amp + 3), padB = Math.ceil(bd + 4);
  const SW = w + padX * 2, SH = Math.ceil(h + padT + padB);
  const cw = Math.ceil(SW * PX), ch = Math.ceil(SH * PX);
  const ax = SW / 2, ay = h + padT;
  const cv = document.createElement("canvas");
  cv.width = cw; cv.height = ch;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.createImageData(cw, ch), d = img.data;
  const u0 = (i) => (i + 0.5) / PX - ax, v0 = (j) => (j + 0.5) / PX - ay;
  // who holds a point (index into B, nearest first, or -1)
  const ownerAt = (u, v) => {
    for (let n = 0; n < B.length; n++) {
      const b = B[n], nx = (u - b.x) / b.r, ny = (v - b.y) / b.ry;
      if (nx * nx + ny * ny <= 1) return n;
    }
    return -1;
  };
  // the belly: one flat slab under the whole base, drawn in at the ends,
  // its lower edge ragged in two-pixel steps
  let i0 = cw, i1 = -1;
  for (let i = 0; i < cw; i++) if (ownerAt(u0(i), -0.05) >= 0) { i0 = Math.min(i0, i); i1 = Math.max(i1, i); }
  const bellyD = new Float32Array(cw);
  for (let i = i0; i <= i1; i++) {
    const e = Math.min(i - i0, i1 - i) / PX;        // units in from the nearer end
    const rag = 0.7 + 0.3 * hash(seed + (i >> 1), 7);
    bellyD[i] = Math.min(bd * rag, e * 0.55);
  }
  const band = Math.max(1, h * 0.12);
  const TH = [-0.55, -0.27, 0.0, 0.28];             // tone steps: below each, tones 1..4; above, 5
  const westX = Math.max(1, w / 2);
  const put = (p, idx) => {
    const col = idx >= 100 ? RL[Math.min(RL.length - 1, idx - 100)] : R[Math.max(0, Math.min(R.length - 1, idx))];
    d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
  };
  // lightning inside lifts the tones round its spot, following the billows'
  // own shading, so the lumps glow from within rather than a disc on top
  const lift = (u, v, idx, shade = 0) => {
    if (!lit) return idx;
    const e = Math.hypot((u - lit.x) / lit.r, (v - lit.y) / (lit.r * 0.45));
    if (e >= 1) return idx;
    if (e < 0.16 && shade >= 0 && idx >= 3) return 107;   // the white-hot heart, on the billows' lit faces
    return 100 + Math.max(0, Math.min(6, Math.min(5, idx) + Math.round((1 - e) * 4 + shade)));
  };
  for (let j = 0; j < ch; j++) {
    const v = v0(j);
    for (let i = 0; i < cw; i++) {
      const u = u0(i), p = (j * cw + i) * 4;
      if (v > 0) {
        if (i < i0 || i > i1 || v > bellyD[i]) continue;
        put(p, lift(u, v, v < 0.55 && (i + j) % 2 === 0 ? 1 : 0));
        continue;
      }
      const n = ownerAt(u, v);
      if (n < 0) {
        // a chink between two base billows, just over the belly: fill it
        if (i >= i0 && i <= i1 && -v < band && bellyD[i] > 0.3) put(p, lift(u, v, 1));
        continue;
      }
      const b = B[n];
      const nx = (u - b.x) / b.r, ny = (v - b.y) / b.ry, d2 = nx * nx + ny * ny, nz = Math.sqrt(Math.max(0, 1 - d2));
      const lam = nx * SUN3[0] + ny * SUN3[1] + nz * SUN3[2];
      const hf = Math.max(0, Math.min(1, -v / gh));
      // each billow lit on its own, the whole heap lit too: bright crown
      // and west side, the low east side sinking into shadow
      let s = lam * 0.42 * Math.min(1, hf * 2.2) + (hf - 0.42) * 1.15 - (u / westX) * 0.14 - dark;
      // a crease where a nearer billow rises in front of this one
      let crease = false;
      for (let m = 0; m < n; m++) {
        const q = B[m];
        if (v > q.y) continue;
        const ex = (u - q.x) / (q.r + 0.65), ey = (v - q.y) / (q.ry + 0.65);
        if (ex * ex + ey * ey <= 1) { crease = true; break; }
      }
      if (crease) s -= 0.34;
      if (-v < band) s -= 0.45;                     // the shadow band over the belly
      let tone = 5;
      for (let t = 0; t < TH.length; t++) if (s < TH[t]) { tone = t + 1; if (TH[t] - s < 0.06 && (i + j) % 2 === 0) tone++; break; }
      // the rim: the sunward edge of a billow, a pixel of cool light
      const edge = (1 - Math.sqrt(d2)) * b.r;
      // (only on the silhouette: inside the heap a crease parts the billows)
      if (!crease && hf > 0.25 && edge < 0.7 && (nx * SUN2[0] + ny * SUN2[1]) / Math.sqrt(d2 || 1) > 0.45
        && ownerAt(u + SUN2[0] * 0.9, v + SUN2[1] * 0.9) < 0) tone = 6;
      put(p, lift(u, v, tone, crease ? -2 : lam > 0.35 ? 1 : 0));
    }
  }
  c.putImageData(img, 0, 0);
  if (ink > 0) inkOutline(cv, INK_LINE, ink);
  // wisps off both ends and scud under the belly: translucent, past the ink
  const im2 = c.getImageData(0, 0, cw, ch), e2 = im2.data;
  const streak = (side, v, len, a0, thick) => {
    const j = Math.floor((v + ay) * PX);
    if (j < 0 || j >= ch) return;
    // from the outermost painted pixel of this row, outward
    let i = side < 0 ? 0 : cw - 1;
    while (i >= 0 && i < cw && e2[(j * cw + i) * 4 + 3] < 200) i -= side;
    if (i < 0 || i >= cw) return;
    i -= side * Math.max(1, ink);                   // start on the ink: the wisp leaves the body
    const L = Math.round(len * PX);
    for (let s = 0; s <= L; s++) {
      const x = i + side * s;
      if (x < 0 || x >= cw) break;
      if (s > 3 && hash(x * 3 + seed, j + f) < 0.1 + 0.45 * (s / L)) continue;   // ragged, thinning out
      const a = Math.round(a0 * (s < L * 0.35 ? 1 : s < L * 0.7 ? 0.68 : 0.4));
      for (let r = 0; r < (s < L * 0.3 ? thick : 1); r++) {
        const p = ((j + r) * cw + x) * 4;
        if (j + r >= ch || (e2[p + 3] >= 200 && s > Math.max(1, ink))) continue;
        e2[p] = WS[0]; e2[p + 1] = WS[1]; e2[p + 2] = WS[2]; e2[p + 3] = a;
      }
    }
  };
  if (grow > 0.2 && thin < 0.6) {
    const breathe = Math.sin((f / F) * TAU + seed) * 0.7;
    for (const side of [-1, 1]) {
      const sd = side < 0 ? 1 : 2;
      streak(side, -bd * 0.3 - 0.4, (wl * (0.85 + 0.15 * hash(seed, sd)) + breathe) * (0.5 + 0.5 * grow), 235, 2);
      streak(side, -h * (0.3 + 0.08 * hash(seed, sd + 4)) * grow, wl * (0.55 + 0.2 * hash(seed, sd + 2)) - breathe * 0.5, 200, 2);
      if (hash(seed, sd + 8) > 0.4) streak(side, -h * 0.52 * grow, wl * 0.35, 150, 1);
    }
    // scud: torn scraps hanging under the belly
    for (let n = 0; n < 3; n++) {
      const cx = Math.floor((ax + (hash(seed, 30 + n) - 0.5) * w * 0.7 + Math.sin((f / F) * TAU + n) * 0.8) * PX);
      const jj = Math.floor((ay + bd + 0.9 + (n % 2) * 0.5) * PX) + Math.max(0, ink - 1);
      const L = Math.round((1.5 + 2.5 * hash(seed, 33 + n)) * PX);
      if (jj >= ch) continue;
      for (let s = 0; s < L; s++) {
        const x = cx + s; if (x < 0 || x >= cw || hash(x, seed + n) < 0.2) continue;
        const p = (jj * cw + x) * 4;
        if (e2[p + 3] >= 200) continue;
        e2[p] = WS[0]; e2[p + 1] = WS[1]; e2[p + 2] = WS[2]; e2[p + 3] = s < L / 2 ? 160 : 100;
      }
    }
  }
  // thinning: an ordered dither eats it, the belly and the edges first
  if (thin > 0) {
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const p = (j * cw + i) * 4;
      if (!e2[p + 3]) continue;
      const low = clamp01((v0(j) + gh * 0.3) / (gh * 0.6));     // 0 high in the cloud, 1 at the belly
      if (BAYER[(j & 3) * 4 + (i & 3)] < thin * (0.55 + 0.45 * low)) e2[p + 3] = 0;
    }
  }
  c.putImageData(im2, 0, 0);
  return { cv, ax, ay, w: cw / PX, h: ch / PX };
};

// The cloud's shadow on the ground: its footprint seen from above — as deep
// north to south as three quarters of its breadth, its rim lumpy with the
// billows over it — in three stepped bands, darkest under the heart.
const bakeShadow = (k) => {
  const { w, h, seed, grow, thin, shape } = k;
  const B = posed(w, h, seed, 0, 1, 0, grow, thin, shape);
  let l = 0, r = 0;
  for (const b of B) { l = Math.min(l, b.x - b.r); r = Math.max(r, b.x + b.r); }
  const half = Math.max(4, (r - l) / 2), mid = (l + r) / 2;
  const lobes = B.map((b, n) => ({ x: b.x, y: (hash(seed, n + 120) - 0.5) * half * 0.7, rx: b.r * 1.15, ry: b.r * 0.85 }));
  lobes.push({ x: mid, y: 0, rx: half * 0.88, ry: half * 0.52 });
  const pad = 2, SW = half * 2.3 + pad * 2, SH = half * 1.4 + pad * 2;
  const cw = Math.ceil(SW * PX), ch = Math.ceil(SH * PX), ax = SW / 2, ay = SH / 2;
  const cv = document.createElement("canvas");
  cv.width = cw; cv.height = ch;
  const c = cv.getContext("2d");
  const img = c.createImageData(cw, ch), d = img.data;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const u = (i + 0.5) / PX - ax, v = (j + 0.5) / PX - ay;
    let dep = 0;
    for (const o of lobes) {
      const e = ((u - o.x) / o.rx) ** 2 + ((v - o.y) / o.ry) ** 2;
      if (e < 1) dep = Math.max(dep, 1 - e);
    }
    // the heart: how deep inside the whole footprint
    const core = 1 - (((u - mid) / half) ** 2 + (v / (half * 0.6)) ** 2);
    if (dep <= 0) continue;
    const a = core > 0.55 ? 0.36 : core > 0.15 ? 0.25 : 0.13;
    const p = (j * cw + i) * 4;
    d[p] = 42; d[p + 1] = 28; d[p + 2] = 44; d[p + 3] = Math.round(a * 255);
  }
  c.putImageData(img, 0, 0);
  return { cv, ax, ay, w: cw / PX, h: ch / PX };
};

const q2 = (v) => Math.round(v * 2) / 2;
const snapPx = (v) => Math.round(v * PX) / PX;
const opts = (o) => {
  const F = o.frames || 6;
  const fps = o.fps == null ? 3 : o.fps;
  // a lit cloud holds frame 0 (a flash is too brief to see it churn), so
  // each light spot is one bake, not one per frame
  const f = o.frame != null ? o.frame % F : o.lit ? 0 : Math.floor(((o.time || 0) + (o.seed || 0) * 0.37) * fps) % F;
  return {
    w: Math.round(o.w), h: Math.round(o.h), seed: (o.seed || 0) % 997, pal: o.pal || "storm",
    f: (f + F) % F, F, amp: o.amp == null ? Math.max(0.5, o.h * 0.06) : o.amp,
    grow: o.grow == null ? 1 : Math.round(clamp01(o.grow) * 6) / 6,
    thin: Math.round(clamp01(o.thin || 0) * 6) / 6,
    lit: o.lit ? { x: q2(o.lit.x), y: q2(o.lit.y), r: q2(o.lit.r) } : null,
    ink: o.ink == null ? 2 : o.ink, dark: Math.round((o.dark || 0) * 10) / 10, shape: o.shape || "heap",
  };
};

// Stamp a storm cloud with its base's middle at (x, y). Options: w, h (in
// world units), pal ("storm" | "tempest" | "sovereign"), seed (a small
// integer: keep the variants few), time + fps + frames (the churn), amp
// (how far a billow drifts, units), grow, thin, lit ({x, y, r} about the
// base's middle), dark (0..0.4: deeper tones), ink (ring width, art px),
// shape ("heap": one tower, the default; "twin": two heads apart).
export const stormCloud = (ctx, x, y, o) => {
  const k = opts(o);
  const key = `c|${k.shape}|${k.w}|${k.h}|${k.seed}|${k.pal}|${k.f}|${k.F}|${k.amp}|${k.grow}|${k.thin}|${k.ink}|${k.dark}|${k.lit ? `${k.lit.x},${k.lit.y},${k.lit.r}` : ""}`;
  const sp = cached(key, () => bakeCloud(k));
  ctx.drawImage(sp.cv, snapPx(x - sp.ax), snapPx(y - sp.ay), sp.w, sp.h);
};

// Its shadow on the ground, centred on (x, y) (the caller nudges it down
// and right, away from the sun). Same w, h, seed, grow, thin as the cloud.
export const stormShadow = (ctx, x, y, o) => {
  const k = opts({ ...o, lit: null });
  const key = `s|${k.shape}|${k.w}|${k.h}|${k.seed}|${k.grow}|${k.thin}`;
  const sp = cached(key, () => bakeShadow(k));
  ctx.drawImage(sp.cv, snapPx(x - sp.ax), snapPx(y - sp.ay), sp.w, sp.h);
};

// Where lightning can light the cloud from inside: a few spots low in its
// body (about the base's middle, units), each { x, y, r }. Quantized, so a
// lit cloud is one of a few cached sprites.
export const stormSpots = (w, h, seed, n = 3) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out.push({ x: q2(t * w * 0.28 + (hash(seed, i + 80) - 0.5) * w * 0.1), y: q2(-h * (0.22 + 0.2 * hash(seed, i + 90))), r: q2(h * (0.42 + 0.12 * hash(seed, i + 95))) });
  }
  return out;
};

// A pixel bolt from (x0, y0) to (x1, y1), stamped on the art grid: a soft
// halo, a bright body, a white core; re-kinked on `fr`. `w` its weight,
// cols [halo, body, core].
export const stormBolt = (ctx, x0, y0, x1, y1, fr, cols, w = 1, kinks = 4, amp = 2) => {
  const pts = [[x0, y0]];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  for (let i = 1; i < kinks; i++) {
    const t = i / kinks, j = (hash(fr, i * 7 + 3) - 0.5) * 2 * amp;
    pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
  }
  pts.push([x1, y1]);
  const a0 = ctx.globalAlpha;
  const layer = (col, s, a) => {
    ctx.globalAlpha = a0 * a; ctx.fillStyle = col; ctx.beginPath();
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * PX));
      for (let q = 0; q <= n; q++) {
        const px = ax + ((bx - ax) * q) / n, py = ay + ((by - ay) * q) / n;
        ctx.rect(snapPx(px - s / 2), snapPx(py - s / 2), s, s);
      }
    }
    ctx.fill();
  };
  layer(cols[0], 3 * w, 0.35);
  layer(cols[1], 1.5 * w, 1);
  layer(cols[2], 0.5 * Math.max(1, w), 1);
  ctx.globalAlpha = a0;
};
