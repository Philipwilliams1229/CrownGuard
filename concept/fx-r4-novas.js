// Effects concepts, Round 4 (novas and pools): see art/briefs/fx-round4.md. Owned by the novas artist.
// Rows: firenova, frostnova, pools. Painters get (c, e): c is a cell canvas translated to (ax, ay), 1 unit = 1 art px.
// Game modules are imported only in a browser (top-level await), so Node can still read ROWS.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/rings.js")), ...(await import("/src/render/fx.js")), ...(await import("/src/render/paint.js")) } : {};

const TAU = Math.PI * 2;
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const ICE = ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98"];
const LAVA = ["#fff3d2", "#f8d868", "#f09838", "#d0502e", "#7a2a26", "#3a1e22"];
const ROT = ["#d8e8a0", "#a8c46e", "#76944a", "#4e6634", "#34442a"];
const SPORE = ["#ecdcfa", "#c4a8e0", "#9a7cc0", "#6a548e", "#44365e"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - (1 - cl(t)) * (1 - cl(t));
const P = (c, x, y, col) => { c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); };
const vn = (x, y, s, seed = 0) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sm = (u) => u * u * (3 - 2 * u), a = H(x0 + seed, y0), b = H(x0 + 1 + seed, y0), c = H(x0 + seed, y0 + 1), d = H(x0 + 1 + seed, y0 + 1);
  return (a + (b - a) * sm(fx)) * (1 - sm(fy)) + (c + (d - c) * sm(fx)) * sm(fy);
};
const vor = (x, y, s, seed) => {
  const gx = Math.floor(x / s), gy = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, id = 0, cxp = 0, cyp = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ix = gx + i, iy = gy + j, px = (ix + 0.15 + 0.7 * H(ix, iy + seed)) * s, py = (iy + 0.15 + 0.7 * H(ix + 9, iy + seed)) * s, d = Math.hypot(x - px, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = ix * 57 + iy * 13; cxp = px; cyp = py; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id, cx: cxp, cy: cyp };
};
const line = (c, x0, y0, x1, y1, col) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let er = dx + dy;
  for (let n = 0; n < 200; n++) { P(c, x0, y0, typeof col === "function" ? col(n) : col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
};

// ---------------------------------------------------------------------------------------- the novas
const R = 56, NW = { cw: 132, ch: 116, ax: 66, ay: 58, N: 14 };
const GOB = [[-24, 6], [32, 20], [6, -26]];            // three goblins: feet (x, y); two near, one far
const sortedGob = GOB;
const frontFire = (p) => R * ease(Math.min(1, p) * 1.15);
const frontIce = (p) => R * ease(Math.min(1, p) * 1.25);
const fadeOf = (p, from = 0.72) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from + 0.001)));
// goblins: white while the front is over them (as ringflash.js does)
const gob = (c, e, front, i) => {
  const [x, y] = GOB[i], d = Math.hypot(x, y), fl = Math.abs(front - d) < 5 && e.p < 0.9, s = e.foe(fl ? 0 : (e.i + i * 3) & 7, fl ? "white" : "");
  if (fl) { const b = e.foe((e.i + i * 3) & 7, ""); c.drawImage(b.cv, Math.round(x - b.ax), Math.round(y - b.ay)); c.globalAlpha = 0.7; }
  c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay)); c.globalAlpha = 1;
};
const stage = (c, e, front, under, over) => {          // under: ground; over: (fn(sy)) front things; goblins sorted by y
  under();
  const order = [0, 1, 2].sort((a, b) => GOB[a][1] - GOB[b][1]);
  over(-1);
  for (const i of order) gob(c, e, front, i);
  over(1);
};
const ringPx = (c, r, f) => {                            // f(x, y, d, depth, ang) per pixel in the disc ring
  const m = Math.ceil(r + 6);
  for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) { const d = Math.hypot(x + 0.5, y + 0.5); f(x, y, d, r - d, Math.atan2(y + 0.5, x + 0.5)); }
};

const fireA = (c, e) => {
  const p = e.p, r = frontFire(p), fd = fadeOf(p), rag = (x, y) => (H(x, y) - 0.5) * 1.4;
  stage(c, e, r, () => ringPx(c, r, (x, y, d, dep) => {
    dep += rag(x, y) * 0.5;
    if (dep < -1 || d > r + 1.2 || bay(x, y) >= fd) return;
    if (dep < 0) P(c, x, y, FIRE[4]);
    else if (dep < 1.2) P(c, x, y, FIRE[0]);
    else if (dep < 2.6) P(c, x, y, FIRE[1]);
    else if (dep < 4) P(c, x, y, FIRE[2]);
    else if (dep < 5.6) P(c, x, y, FIRE[3]);
    else if (dep < 13) { const k = 1 - (dep - 5.6) / 7.4; if (H(x, y + 7) < 0.5 * k) P(c, x, y, dep < 9 ? FIRE[4] : FIRE[5]); }
    else if (dep < R && H(x + 3, y) < 0.05) P(c, x, y, FIRE[5]);
  }), () => {});
};

const tongues = (c, r, p, i, side, big, lift = 0) => {
  const n = Math.max(8, Math.round(TAU * r / 4.6)), a0 = 0.3, life = fadeOf(p, 0.7);
  for (let k = 0; k < n; k++) {
    const an = a0 + (k / n) * TAU, sy = Math.sin(an);
    if ((sy < 0 ? -1 : 1) !== side) continue;
    const bx = Math.cos(an) * r, by = sy * r;
    const flick = H(k, i * 0.37 + 3) * 0.6 + 0.4 * Math.sin(i * 1.1 + k * 2.3) * 0.5 + 0.3;
    let h = Math.round((3 + 4 * H(k, 5) + (big ? 3 : 0)) * flick * (0.3 + 0.7 * life) * (p < 0.12 ? 0.6 : 1));
    if (h < 2) continue;
    const sw = Math.round(Math.sin(i * 0.9 + k) * 1);
    for (let j = 0; j < h; j++) {
      const t = j / h, hw = Math.round((1 - t) * (big ? 2.2 : 1.7)), x = bx + sw * t * 2, y = by - j - lift;
      for (let q = -hw; q <= hw; q++) {
        const edge = Math.abs(q) === hw && hw > 0;
        P(c, x + q, y, edge ? (t < 0.5 ? FIRE[3] : FIRE[4]) : t < 0.3 ? FIRE[0] : t < 0.55 ? FIRE[1] : t < 0.8 ? FIRE[2] : FIRE[3]);
      }
    }
  }
};
const embers = (c, r, p, n0, seed) => {
  for (let k = 0; k < n0; k++) {
    const born = H(k, seed) * 0.6; if (p < born) continue;
    const an = H(k, seed + 2) * TAU, d = frontFire(born) * (0.9 + 0.1 * H(k, seed + 5)), t = (p - born) * 9;
    const x = Math.cos(an) * d + Math.sin(t + k) * 2, y = Math.sin(an) * d - 4 - t * 2.2;
    if (t > 7) continue;
    P(c, x, y, t < 2.5 ? FIRE[1] : t < 5 ? FIRE[3] : FIRE[4]);
  }
};
const scorch = (c, r, p, rich) => {
  const fd = fadeOf(p, 0.78);
  ringPx(c, r, (x, y, d, dep) => {
    if (dep < 2 || d > r || bay(x, y) >= fd) return;
    const n = vn(x, y, 4, 11), band = dep < 14 ? 1 - dep / 20 : 0.12;
    if (n < 0.64 * band) P(c, x, y, dep < 6 && n > 0.3 ? FIRE[4] : FIRE[5]);
    else if (rich && dep < 7 && bay(x + 1, y) < 0.25 && n > 0.7) P(c, x, y, FIRE[3]);
  });
};
const coals = (c, r, p) => {
  const fd = fadeOf(p, 0.75);
  ringPx(c, r, (x, y, d, dep) => { if (dep > -0.8 && dep < 1.4 && bay(x, y) < fd) P(c, x, y, ((x + y) & 1) ? FIRE[4] : (H(x, y) < 0.4 ? FIRE[1] : FIRE[3])); });
};
const fireB = (c, e) => {
  const p = e.p, r = frontFire(p);
  stage(c, e, r, () => { scorch(c, r, p, false); coals(c, r, p); },
    (side) => { if (side < 0 || true) { tongues(c, r, p, e.i, side, false); } if (side > 0) embers(c, r, p, 22, 3); });
};
const fireC = (c, e) => {
  const p = e.p, r = frontFire(p), i = e.i;
  stage(c, e, r, () => {
    // light thrown on the ground inside the front
    ringPx(c, r, (x, y, d, dep) => { if (dep > 1 && dep < 26 && H(x, y + 3) < 0.34 * (1 - dep / 26) * fadeOf(p, 0.8)) P(c, x, y, FIRE[2]); });
    scorch(c, r, p, true); coals(c, r, p);
    // core flash
    if (i < 4) { const fr = [8, 6, 4, 2][i]; ringPx(c, fr, (x, y, d, dep) => { if (dep > 0 && d < fr) P(c, x, y * 0.8, d < fr * 0.55 ? FIRE[0] : FIRE[1]); }); ringPx(c, [11, 9, 7, 5][i], (x, y, d, dep) => { if (dep < 1.2 && dep >= 0 && bay(x, y) < 0.6) P(c, x, y * 0.8, FIRE[2]); }); }
  }, (side) => {
    tongues(c, r, p, i, side, true);
    if (side > 0) {
      embers(c, r, p, 30, 7);
      // heat shimmer lingering: pale wavering dashes above the burnt ring
      if (p > 0.45) { const a = cl((p - 0.45) / 0.2) * fadeOf(p, 0.85); for (let k = 0; k < 16; k++) { const an = (k / 16) * TAU + 0.2, x = Math.cos(an) * R * 0.92 + Math.sin(i * 0.8 + k * 2) * 1.6, y = Math.sin(an) * R * 0.92 - 12 - (k % 3) * 3 - ((i + k) % 4); if (bay(k * 3, i) < a) { P(c, x, y, FIRE[0]); P(c, x + 1, y, FIRE[0]); } } }
    }
  });
};

// frost
const rimeSheet = (c, r, p, dense, glaze) => {
  const fd = fadeOf(p, glaze ? 0.96 : 0.78);
  ringPx(c, r, (x, y, d, dep) => {
    if (dep < 0 || d > r || bay(x + 1, y + 2) >= fd) return;
    const n = vn(x, y, 3.5, 5), m = vn(x + 40, y, 7, 2), edge = dep < 4 ? 1 - dep / 4 : 0;
    if (H(x, y) > 0.965) P(c, x, y, ICE[0]);
    else if (n > 0.62 - dense * 0.05 + m * 0.1) P(c, x, y, m > 0.5 ? ICE[1] : ICE[2]);
    else if (n > 0.5 && bay(x, y) < 0.4) P(c, x, y, ICE[2]);
    else if (n < 0.12 && bay(x, y) < 0.5) P(c, x, y, ICE[3]);
  });
};
const iceRim = (c, r, p, thick, tail) => {
  const fd = fadeOf(p, 0.78);
  ringPx(c, r, (x, y, d, dep) => {
    dep += (H(x, y) - 0.5) * 0.5;
    if (dep < -1 || d > r + 1.2 || bay(x, y) >= fd) return;
    if (dep < 0) P(c, x, y, ICE[4]);
    else if (dep < thick * 0.3) P(c, x, y, ICE[0]);
    else if (dep < thick * 0.65) P(c, x, y, ICE[1]);
    else if (dep < thick) P(c, x, y, ICE[2]);
    else if (dep < thick + 1.3) P(c, x, y, ICE[3]);
    else if (tail && dep < thick + tail) { const k = 1 - (dep - thick) / tail; if (bay(x, y) < 0.7 * k) P(c, x, y, ((x * 3 + y) % 5 === 0) ? ICE[0] : ICE[1]); }
  });
};
const SPIKES = [];
for (let k = 0; k < 34; k++) { const rho = Math.sqrt(0.06 + 0.9 * H(k, 91)) * R * 0.96, an = H(k, 92) * TAU; SPIKES.push({ x: Math.cos(an) * rho, y: Math.sin(an) * rho, rho, h: 8 + Math.floor(H(k, 93) * 8), w: 2 + H(k, 94) * 1.4 }); }
for (let k = 0; k < 26; k++) { const an = (k / 26) * TAU + H(k, 95) * 0.15; SPIKES.push({ x: Math.cos(an) * R * 0.95, y: Math.sin(an) * R * 0.95, rho: R * 0.95, h: 10 + Math.floor(H(k, 96) * 8), w: 2.4 + H(k, 97) * 1.4 }); }
const spike = (c, x, y, h, w) => {
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round((1 - t) * w));
    for (let q = -hw; q <= hw; q++) {
      const edge = Math.abs(q) === hw && hw > 0;
      P(c, x + q, y - j, edge ? (q < 0 ? ICE[2] : ICE[4]) : q < 0 ? (t > 0.45 ? ICE[0] : ICE[1]) : q === 0 ? ICE[1] : ICE[2]);
    }
  }
  P(c, x, y - h, ICE[0]); if (h > 3) P(c, x + 1, y - 1, ICE[4]);
};
const spikes = (c, p, side, melt0, bigger) => {
  for (const s of SPIKES) {
    if (((s.y < 0) ? -1 : 1) !== side) continue;
    const pb = (1 - Math.sqrt(Math.max(0, 1 - s.rho / R))) / 1.25;
    const age = (p - pb) * 13;
    if (age < 0) continue;
    const grow = age < 1 ? 0.4 : age < 2 ? 0.8 : age < 3 ? 1.12 : 1;
    const melt = cl((p - melt0 - 0.14 * (s.rho / R) * (1 + H(s.x, s.y) * 0.4)) / 0.3);
    let h = Math.round(s.h * grow * (1 - melt) * (bigger ? 1.25 : 1));
    if (h < 1) { if (melt > 0 && melt < 1 && h < 1 && bay(s.x, s.y) < 0.5) P(c, s.x, s.y, ICE[2]); continue; }
    spike(c, Math.round(s.x), Math.round(s.y), h, s.w);
  }
};
const frostA = (c, e) => { const p = e.p, r = frontIce(p); stage(c, e, r, () => iceRim(c, r, p, 4.5, 10), () => {}); };
const frostB = (c, e) => {
  const p = e.p, r = frontIce(p);
  stage(c, e, r, () => { rimeSheet(c, r, p, 0, false); iceRim(c, r, p, 2.2, 0); }, (side) => spikes(c, p, side, 0.5, false));
};
const frostC = (c, e) => {
  const p = e.p, r = frontIce(p), i = e.i;
  stage(c, e, r, () => {
    // the glaze: a pale cold film that lingers to the end, with slanted light streaks
    ringPx(c, r, (x, y, d, dep) => {
      if (dep < 0 || d > r) return;
      const g = cl((p - 0.35) / 0.25);
      if (bay(x, y) < 0.3 * g * (1 - 0.3 * dep / R)) P(c, x, y, ICE[2]);
      if (g > 0.4 && (x - y + 400) % 11 < 1 && H(x, y) < 0.7) P(c, x, y, ICE[0]);
    });
    rimeSheet(c, r, p, 1, true); iceRim(c, r, p, 3, 6);
    if (i < 4) { const fr = [9, 7, 5, 3][i]; ringPx(c, fr, (x, y, d) => { if (d < fr) P(c, x, y * 0.8, d < fr * 0.5 ? ICE[0] : ICE[1]); }); for (let k = 0; k < 8; k++) { const an = k * TAU / 8, L = fr + 4 - i; line(c, 0, 0, Math.cos(an) * L, Math.sin(an) * L * 0.8, ICE[0]); } }
  }, (side) => { spikes(c, p, side, 0.62, true); if (side > 0) for (let k = 0; k < 14; k++) { const an = H(k, 4) * TAU, d = r * Math.sqrt(H(k, 5)), z = ((p * 12 + k * 1.7) % 9) + 1; P(c, Math.cos(an) * d, Math.sin(an) * d - z, k % 3 ? ICE[0] : ICE[1]); } });
};

// TODAY: the game's own painter
const todayNova = (type, life, k) => (c, e) => {
  const PXu = G.PX || 1, front = R * ease(Math.min(1, e.p) * k), fx = { type, x: 0, y: 0, r: R / PXu, life, ttl: life * (1 - e.p) };
  const W = (fn) => { c.save(); c.scale(PXu, PXu); fn(); c.restore(); };
  W(() => G.drawRingFx(c, fx, 1, {}, "g"));
  for (const i of [0, 1, 2].sort((a, b) => GOB[a][1] - GOB[b][1])) gob(c, e, front, i);
  W(() => G.drawRingFx(c, fx, 1, {}, "a"));
};

// ---------------------------------------------------------------------------------------- the pools
const PW = { cw: 168, ch: 128, ax: 0, ay: 0, N: 8 };
const LC = [46, 34], PC = [46, 92], SC = [124, 64], PR = 23;
const loopOff = (t, a) => [Math.cos(t * TAU) * a, Math.sin(t * TAU) * a];
const bubble = (c, x, y, ph, rm, K, big) => {
  if (ph < 0.72) {
    const r = Math.max(1, Math.round(rm * Math.min(1, ph / 0.6))), by = y - Math.round(ph * 2);
    if (r <= 1) { P(c, x, by, K[1]); P(c, x - 1, by, K[2]); return; }
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j * 1.1); if (d > r + 0.3) continue; P(c, x + i, by + j, d > r - 1 ? K[3] : K[2]); }
    P(c, x - Math.floor(r / 2), by - Math.floor(r / 2), K[0]); P(c, x - Math.floor(r / 2) + 1, by - Math.floor(r / 2), K[1]);
  } else if (ph < 0.9) {
    const t = (ph - 0.72) / 0.18, rr = rm * (0.8 + t);
    for (let k = 0; k < 6; k++) { const an = k * TAU / 6 + 0.4; P(c, x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6 - (1 - t) * 3, t < 0.5 ? K[0] : K[1]); }
    if (big && t < 0.5) { P(c, x, y, K[1]); }
  }
};
const poolEdge = (nx, ny, x, y, t, seed, breath) => {
  const [ox, oy] = loopOff(t, 4);
  return Math.sqrt(nx * nx + ny * ny) + (vn(x + ox, y + oy, 6, seed) - 0.5) * 0.42 + breath * Math.sin(t * TAU + Math.atan2(ny, nx) * 2 + seed);
};
// kind: "lava" | "plague"; v: 0 A, 1 B, 2 C
const pool = (c, cx, cy, kind, v, e) => {
  const t = e.t, ry = PR * 0.62, K = kind === "lava" ? LAVA : ROT, [ox, oy] = loopOff(t, 2.6), seed = kind === "lava" ? 3 : 8;
  const breath = v === 0 ? 0 : 0.05;
  const gl = v === 2 ? 1.0 : 0;
  // C: glow on the ground nearby
  if (gl) for (let y = -Math.ceil(ry * 1.7); y <= Math.ceil(ry * 1.7); y++) for (let x = -Math.ceil(PR * 1.55); x <= Math.ceil(PR * 1.55); x++) {
    const ed = Math.hypot((x + 0.5) / PR, (y + 0.5) / ry); if (ed < 1 || ed > 1.55) continue;
    if (bay(x, y) < 0.34 * (1.55 - ed) * (0.85 + 0.15 * Math.sin(t * TAU + x * 0.2))) P(c, cx + x, cy + y, kind === "lava" ? FIRE[2] : ROT[1]);
  }
  for (let y = -Math.ceil(ry + 3); y <= Math.ceil(ry + 3); y++) for (let x = -PR - 3; x <= PR + 3; x++) {
    const nx = (x + 0.5) / PR, ny = (y + 0.5) / ry, edge = poolEdge(nx, ny, x, y, t, seed, breath), X = cx + x, Y = cy + y;
    if (edge > 1) continue;
    const up = (x + y) < 0, b = bay(x, y);
    if (kind === "lava") {
      if (edge > 0.9) { P(c, X, Y, v === 0 ? LAVA[5] : (up ? LAVA[4] : LAVA[5])); continue; }
      if (v === 0) {
        if (edge > 0.76) { P(c, X, Y, (up && edge < 0.84) ? LAVA[3] : (b < 0.5 ? LAVA[4] : LAVA[5])); continue; }
        const ch = vn(x + ox * 2, y + oy * 2, 5, 7);
        P(c, X, Y, ch > 0.74 ? (edge < 0.4 ? LAVA[0] : LAVA[1]) : ch > 0.52 ? LAVA[2] : ch > 0.34 ? LAVA[3] : (b < 0.5 ? LAVA[4] : LAVA[3]));
      } else {
        const V = vor(x + ox + 50, y + oy + 50, 9.5, 4), crack = V.d2 - V.d1, ch = vn(x + ox * 2, y + oy * 2, 4, 17), plate = H(V.id, 2) < 0.8;
        if (!plate || crack < 0.9) P(c, X, Y, crack < 0.9 && plate ? (ch > 0.6 ? LAVA[1] : LAVA[2]) : (ch > 0.7 ? LAVA[1] : ch > 0.45 ? LAVA[2] : LAVA[3]));
        else if (crack < 1.8) P(c, X, Y, up ? LAVA[3] : LAVA[4]);
        else { const lit = (x + ox + 50 - V.cx) + (y + oy + 50 - V.cy) < -1.5; P(c, X, Y, lit ? (b < 0.5 ? LAVA[4] : LAVA[3]) : (b < 0.4 ? LAVA[5] : LAVA[4])); }
      }
    } else {
      if (edge > 0.88) { if (b < 0.55) P(c, X, Y, ROT[4]); continue; }
      if (v === 0) {
        const ch = vn(x + ox * 2, y + oy * 2, 4.5, 9);
        P(c, X, Y, edge > 0.78 ? ROT[4] : ch > 0.7 ? ROT[1] : ch > 0.5 ? ROT[2] : edge < 0.5 ? ROT[2] : ROT[3]);
        if (up && edge > 0.7 && edge < 0.8) P(c, X, Y, ROT[1]);
      } else {
        const V = vor(x + ox + 50, y + oy + 50, 7.5, 6), crack = V.d2 - V.d1, scum = H(V.id, 5) < 0.62, ch = vn(x + ox * 2, y + oy * 2, 4, 13);
        if (!scum) P(c, X, Y, ch > 0.55 ? ROT[3] : ROT[4]);
        else if (crack < 1.1) P(c, X, Y, ROT[4]);
        else P(c, X, Y, up && crack < 2.4 ? ROT[0] : (ch > 0.6 ? ROT[1] : ROT[2]));
      }
    }
  }
  // bubbles swell and pop (several sizes); A: small blisters, B/C: many sizes
  const nb = v === 0 ? 4 : 7;
  for (let k = 0; k < nb; k++) {
    const an = H(k, seed + 20) * TAU, d = Math.sqrt(H(k, seed + 30)) * 0.62, rm = v === 0 ? 2 + (k % 2) : 1 + (k % 4) + (k > 4 ? 1 : 0);
    bubble(c, Math.round(cx + Math.cos(an) * PR * d), Math.round(cy + Math.sin(an) * ry * d), (t + H(k, seed + 40)) % 1, rm, K, v > 0 && rm > 2);
  }
  if (kind === "lava") for (let k = 0; k < 3; k++) {    // the odd flame tongue off a molten pool
    const ph = (t * 1 + k / 3) % 1; if (ph > 0.55) continue;
    const an = k * 2.1 + 0.5, x = cx + Math.cos(an) * PR * 0.4, y = cy + Math.sin(an) * ry * 0.4 - ph * 9;
    P(c, x, y, ph < 0.2 ? LAVA[1] : ph < 0.4 ? LAVA[2] : LAVA[3]); if (ph < 0.3) P(c, x, y + 1, LAVA[2]);
  }
  if (v === 2) {
    if (kind === "lava") {   // fissures running out over the ground, glowing
      for (let k = 0; k < 7; k++) {
        const an = k * TAU / 7 + 0.35 + H(k, 61) * 0.3, L = 6 + Math.floor(H(k, 62) * 7), x0 = cx + Math.cos(an) * PR * 0.95, y0 = cy + Math.sin(an) * ry * 0.95;
        let px = x0, py = y0;
        for (let s = 0; s < L; s++) {
          const jx = (H(k, s + 70) - 0.5) * 1.8, nx = px + Math.cos(an) * 1 + jx * 0.4, ny = py + Math.sin(an) * 0.65;
          P(c, nx, ny, s < L - 2 ? (((s + Math.floor(t * 8)) % 4 === 0) ? LAVA[1] : LAVA[2]) : LAVA[3]); P(c, nx, ny + 1, LAVA[5]);
          px = nx; py = ny;
        }
      }
    } else {                  // green mist lifting, drips down the rim
      for (let k = 0; k < 12; k++) { const ph = (t + H(k, 7)) % 1, x = cx + (H(k, 8) - 0.5) * PR * 1.4 + Math.sin((t + k) * TAU) * 1.5, y = cy - ph * 18 - 2; if (bay(k, Math.floor(ph * 8)) < 0.8 * (1 - ph)) { P(c, x, y, ROT[1]); P(c, x + 1, y, ROT[2]); } }
    }
  }
};
const spores = (c, cx, cy, v, e) => {
  const t = e.t, ry = PR * 0.62, [ox, oy] = loopOff(t, 3);
  for (let y = -Math.ceil(ry + 6); y <= Math.ceil(ry + 6); y++) for (let x = -PR - 6; x <= PR + 6; x++) {
    const ed = poolEdge((x + 0.5) / PR, (y + 0.5) / ry, x, y, t, 4, v ? 0.06 : 0); if (ed > 1.05) continue;
    const a = ed < 0.5 ? 0.62 : ed < 0.8 ? 0.42 : 0.2, ch = vn(x + ox * 2, y + oy * 2, 4, 21);
    let a2 = a;
    if (v) { const lob = vn(x + ox, y + oy, 9, 31); a2 = a * (0.55 + lob * 0.9); }
    if (bay(x, y) < a2) P(c, cx + x, cy + y, ch > 0.62 ? SPORE[1] : ch > 0.35 ? SPORE[2] : SPORE[3]);
    if (v && ed > 0.9 && ed < 1.0 && bay(x + 1, y) < 0.3) P(c, cx + x, cy + y, SPORE[4]);
  }
  // motes drifting up (loop), and puffs
  const n = v ? 14 : 7;
  for (let k = 0; k < n; k++) {
    const ph = (t + H(k, 41)) % 1, x = cx + (H(k, 42) - 0.5) * PR * 1.5 + Math.sin((t + k * 0.37) * TAU) * 2, y = cy + (H(k, 43) - 0.5) * ry * 1.3 - ph * (v ? 16 : 9);
    P(c, x, y, ph < 0.5 ? SPORE[0] : SPORE[1]); if (v && k % 2) P(c, x + 1, y, SPORE[2]);
  }
  if (v) for (let k = 0; k < 3; k++) bubble(c, Math.round(cx + (H(k, 51) - 0.5) * PR), Math.round(cy + (H(k, 52) - 0.5) * ry), (t + k / 3) % 1, 2 + (k % 2), SPORE, true);
  if (v === 2) for (let y = -Math.ceil(ry * 1.6); y <= Math.ceil(ry * 1.6); y++) for (let x = -PR * 1.5; x <= PR * 1.5; x++) {
    const ed = Math.hypot((x + 0.5) / PR, (y + 0.5) / ry); if (ed < 1 || ed > 1.5) continue;
    if (bay(x + 3, y) < 0.26 * (1.5 - ed)) P(c, cx + x, cy + y, SPORE[2]);
  }
};
const poolsV = (v) => (c, e) => { pool(c, LC[0], LC[1], "lava", v, e); pool(c, PC[0], PC[1], "plague", v, e); spores(c, SC[0], SC[1], v, e); };
const poolsToday = (c, e) => {
  const PXu = G.PX || 1, d = (kind, x, y, time) => { c.save(); c.translate(x, y); c.scale(PXu, PXu); G.drawGround(c, { kind, x: 0, y: 0, r: PR / PXu, until: 1e9 }, time, 0); c.restore(); };
  d("lava", LC[0], LC[1], 5 + e.i * 0.2); d("plague", PC[0], PC[1], 5 + e.i / 3); d("spores", SC[0], SC[1], 5 + e.i / 3);
};

export const ROWS = [
  { id: "firenova", label: "Fire nova", group: "Round 4", note: "Brazier Wheel, about 450 ms, a ring of fire rolling out over two goblins (and a third further off). A: a thick stepped front with a short tail. B: a rolling flame wall, a scorched ring left behind, embers. C: B plus a core flash at the centre, light thrown on the ground, heat shimmer lingering.", ...NW, today: todayNova("firenova", 450, 1.15), A: fireA, B: fireB, C: fireC },
  { id: "frostnova", label: "Frost nova", group: "Round 4", note: "Frost nova, about 500 ms. A: a thick stepped front with a frost tail. B: a rime sheet under the feet, ice spikes snapping up at the front, then melting. C: B plus a cold flash at the centre and a glaze that lingers to the end.", ...NW, today: todayNova("frostnova", 500, 1.25), A: frostA, B: frostB, C: frostC },
  { id: "pools", label: "Lava, plague and spore pools", group: "Round 4", note: "Lava (top left), plague (bottom left) and spore haze (right), looping. A: a richer 8-frame bake. B: broken crust, bubbles that swell and pop, a creeping edge. C: B plus fissures and glow on the ground nearby.", ...PW, today: poolsToday, A: poolsV(0), B: poolsV(1), C: poolsV(2) },
];
