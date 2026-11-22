// Effects concepts, Round 6: the slow / chill on a foe (row slow6). See art/briefs/fx-round6.md. Owned by the frost artist.
// Painters get (c, e): c is translated to the goblin's feet, 1 unit = 1 art px. Pure canvas, no game imports.
// Every option rides the body's own outline (as Round 5 B's fire does). Nothing over the crown, nothing on the
// ground wider than the feet. LV is the slow strength: 0 (<30%), 1 (30-60%, painted), 2 (>60%); see `grow`.
const TAU = Math.PI * 2;
const ICE = ["#f4fbff", "#cfeeff", "#9ad4f0", "#5fa8d8", "#3a6fb0", "#243e74"];
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const SMOKE = ["#8a7a76", "#6a5c60", "#4a3e44"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const fifth = (a) => Math.ceil(cl(a) * 5 - 1e-6) / 5;
const P = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const fr = (v) => v - Math.floor(v);
// slow strength -> how much of everything: coverage, rim brightness, crystal / glint count
const grow = (lv) => ({ cov: [0.22, 0.34, 0.5][lv], amp: [0.65, 0.9, 1.15][lv], n: [5, 9, 14][lv], ice: [2, 4, 7][lv] });

const MASKS = new WeakMap();
const maskOf = (s) => {
  let m = MASKS.get(s.cv); if (m) return m;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d").getImageData(0, 0, w, h).data, set = new Set();
  let top = 1e9, xl = 1e9, xr = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { const X = x - Math.round(s.ax), Y = y - Math.round(s.ay); set.add(X + "," + Y); top = Math.min(top, Y); xl = Math.min(xl, X); xr = Math.max(xr, X); }
  m = { has: (x, y) => set.has(x + "," + y), set, top, xl, xr, cx: Math.round((xl + xr) / 2), T: -top, list: [...set].map((k) => k.split(",").map(Number)) };
  m.edge = m.list.filter(([x, y]) => !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1));
  MASKS.set(s.cv, m); return m;
};
const frameOf = (e) => Math.floor(e.i * 8 / e.N);
const body = (c, e, v = "") => { const s = e.foe(frameOf(e), v); c.drawImage(s.cv, Math.round(-s.ax), Math.round(-s.ay)); return maskOf(s); };
const isFace = (m, x, y) => x > m.cx + 1 && y < -m.T * 0.55;
const sunEdge = (m, x, y) => (!m.has(x - 1, y) || !m.has(x, y - 1)) ? 1 : 0.45;    // sun is top-left

// the cold rim: 1-px pale line on the lit edges (fifths), a tinted deep-blue line on the shaded ones
const coldRim = (c, m, amp, ph, o = {}) => {
  for (const [x, y] of m.edge) {
    const sun = sunEdge(m, x, y), face = isFace(m, x, y) ? 0.6 : 1, wave = 0.88 + 0.22 * Math.sin(ph + x * 0.8 + y * 0.5);
    const s = fifth(amp * 1.25 * sun * face * wave * (o.k || 1));
    if (sun < 1 && s < 0.5) { P(c, x, y, ICE[4], 0.55); continue; }
    if (s > 0.8) P(c, x, y, ICE[0]); else if (s > 0.6) P(c, x, y, ICE[1]); else if (s > 0.4) P(c, x, y, ICE[2]); else if (s > 0.2) P(c, x, y, ICE[3], 0.85);
  }
};
// a rime crystal: a stepped stem leaving the edge, side prongs on its middle, a bright tip; 4 frames of life
const crystal = (c, x, y, m, age, sz) => {
  const dx = !m.has(x - 1, y) ? -1 : !m.has(x + 1, y) ? 1 : 0, dy = dx ? 0 : !m.has(x, y - 1) ? -1 : 1;
  const len = Math.max(1, Math.round([1, 2, 3, 2][age] * sz)), px = dy ? 1 : 0, py = dx ? 1 : 0;
  for (let j = 1; j <= len; j++) P(c, x + dx * j, y + dy * j, j === len ? ICE[0] : ICE[1]);
  if (len >= 2 && age !== 3) { const j = Math.ceil(len / 2); P(c, x + dx * j + px, y + dy * j + py, ICE[2]); P(c, x + dx * j - px, y + dy * j - py, ICE[2]); }
  if (len >= 3) { P(c, x + dx * len + px, y + dy * len + py, ICE[3]); P(c, x + dx * len - px, y + dy * len - py, ICE[3]); }
};
const crystals = (c, e, m, n, sz) => {
  const pool = m.edge.filter(([x, y]) => y < -1 && !isFace(m, x, y) && (!m.has(x - 1, y) || !m.has(x, y - 1) || !m.has(x + 1, y)));
  for (let k = 0; k < n; k++) {
    const start = Math.floor(H(k, 9) * e.N), age = (e.i - start + e.N) % e.N; if (age > 3) continue;
    const [x, y] = pool[Math.floor(H(k, 4) * pool.length) % pool.length]; crystal(c, x, y, m, age, sz);
  }
};
// a breath puff at the mouth: dithered blob drifting forward, thinning (two a loop)
const breath = (c, e, m, amp) => {
  for (let k = 0; k < 2; k++) {
    const q = fr(e.t * 1 + k / 2) * 1.0; if (q > 0.85) continue;
    const x = m.xr + 1 + q * 9, y = -m.T * 0.7 - q * 3, r = 1.2 + q * 2.6;
    for (let yy = -3; yy <= 3; yy++) for (let xx = -4; xx <= 4; xx++) if ((xx * xx) / 1.6 + yy * yy <= r * r && bay(xx + k * 5, yy) < 0.8 * (1 - q) * amp) { P(c, x + xx + 1, y + yy + 1, ICE[3], 0.5 * (1 - q)); P(c, x + xx, y + yy, q < 0.45 ? ICE[0] : ICE[1], 0.95 * (1 - q * 0.5)); }
  }
};

// ------------------------------------------------------------------------------------- A: hoarfrost edge
const mkA = (lv) => (c, e) => {
  const g = grow(lv), ph = e.t * TAU, m = body(c, e);
  coldRim(c, m, g.amp, ph);
  // a faint second rim of frost one pixel out on the sunny side, broken (dithered)
  for (const [x, y] of m.edge) if (!m.has(x - 1, y) && !isFace(m, x, y) && bay(x + e.i, y) < 0.42 * g.amp) P(c, x - 1, y, ICE[2], 0.75);
  crystals(c, e, m, g.n, lv === 2 ? 1.9 : 1.5);
  breath(c, e, m, lv === 0 ? 0.6 : 1);
};

// ------------------------------------------------------------------------------------- B: creeping ice
// glaze: lit glass blue on the body below a wobbling line, bright edge where it stops, icicles off the hem and arms
const glaze = (c, e, m, cov, ph, dim) => {
  const T = m.T, line = (x) => -T * cov + Math.round(Math.sin(ph + x * 0.55) * 1.4 + Math.sin(ph * 2 - x * 0.9) * 0.6);
  for (const [x, y] of m.list) {
    const l = line(x); if (y < l) continue;
    const dep = (y - l) / (T * cov + 1), sun = sunEdge(m, x, y) > 0.9 ? 1 : 0;
    const col = y === l ? ICE[0] : y === l + 1 ? ICE[1] : (bay(x, y) < 0.55 - dep * 0.2 + sun * 0.15) ? ICE[2] : ICE[3];
    P(c, x, y, y <= l + 1 ? col : (bay(x, y) < 0.5 ? ICE[2] : ICE[3]), y <= l + 1 ? 1 : (bay(x, y) < 0.5 ? 0.55 : 0.3) * dim);
    if (y > l + 1 && H(x, y) > 0.93) P(c, x, y, ICE[0], 0.9);          // glints in the glass
  }
  return line;
};
const icicles = (c, m, ph, cov, n, dim) => {
  const T = m.T, low = m.edge.filter(([x, y]) => !m.has(x, y + 1) && y > -T * 0.62 && y < 0 && !m.has(x, y + 1));
  const arms = m.edge.filter(([x, y]) => !m.has(x, y + 1) && y <= -T * 0.3 && y > -T * 0.62 && !isFace(m, x, y));
  const spots = [...low.filter((_, i) => i % 3 === 0), ...arms.filter((_, i) => i % 2 === 0)];
  for (let k = 0; k < Math.min(n, spots.length); k++) {
    const [x, y] = spots[Math.floor(k * spots.length / n)], len = 2 + Math.floor(H(k, 3) * 3) + Math.round(Math.sin(ph + k * 2) * 0.6);
    for (let j = 1; j <= len; j++) P(c, x, y + j, j === len ? ICE[2] : j === 1 ? ICE[0] : ICE[1], j === len ? 0.9 * dim : 1);
    if (len >= 3) P(c, x + 1, y + 1, ICE[3], 0.8);
  }
};
// the Round 5 B burn, copied small: hot edge band, smoke, little flames popping (used only for the stack check)
const lick = (c, cx, by, h, w, lean, ph) => {
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round(w * Math.pow(1 - t, 0.75))), mid = cx + lean * t * t * h * 0.35 + Math.sin(ph + t * 3.2) * 1.3 * t;
    for (let q = -hw; q <= hw; q++) { const heat = (1 - Math.abs(q) / (hw + 0.8)) * (1 - t * 0.85), edge = Math.abs(q) === hw && hw > 0 && j > 0; P(c, mid + q, by - j, edge ? FIRE[4] : heat > 0.62 ? FIRE[0] : heat > 0.42 ? FIRE[1] : heat > 0.22 ? FIRE[2] : FIRE[3]); }
  }
};
const burnUnder = (c, e, m) => {
  const t = e.t, ph = t * TAU, T = m.T;
  for (let k = 0; k < 5; k++) { const q = fr(t + k / 5), x = m.xl - 2 - q * 16 + Math.sin(q * 6 + k) * 2, y = -T * 0.55 - q * (T * 0.6), r = 2 + q * 3;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r && bay(xx + k * 3, yy) < 0.75 * (1 - q)) P(c, x + xx, y + yy, SMOKE[q < 0.5 ? 0 : 1], 0.55 * (1 - q * 0.5)); }
  body(c, e);
  for (const [x, y] of m.edge) { const face = isFace(m, x, y), v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H(x, y) - 0.5) * 0.4, s = v * (cl(1 - (-y) / (T + 2)) * 0.5 + 0.5) * (face ? 0.55 : 1); P(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]); }
  const edge = m.list.filter(([x, y]) => !m.has(x, y - 1) && !isFace(m, x, y) && y < 0 && y > -T);
  for (let k = 0; k < 9; k++) { const start = Math.floor(H(k, 7) * e.N), age = (e.i - start + e.N) % e.N; if (age > 3) continue; const [x, y] = edge[Math.floor(H(k, 3) * edge.length) % edge.length]; lick(c, x, y, [4, 7, 9, 4][age], age === 3 || age === 0 ? 1 : 2, -0.3, k + age); }
};
const mkB = (lv) => (c, e) => {
  const g = grow(lv), ph = e.t * TAU, stack = e.ground === "dark";      // the dark-ground column also carries the burn (stack check)
  const m = stack ? (burnUnder(c, e, maskOf(e.foe(frameOf(e)))), maskOf(e.foe(frameOf(e)))) : body(c, e);
  glaze(c, e, m, g.cov, ph, stack ? 1.25 : 1);
  coldRim(c, m, g.amp * 0.7, ph, { k: 1 });
  icicles(c, m, ph, g.cov, g.ice, 1);
  // a few frost flecks creeping just above the line
  for (let k = 0; k < 3 + lv; k++) { const x = m.xl + 3 + Math.floor(H(k, 8) * (m.xr - m.xl - 5)), y = Math.round(-m.T * g.cov - 2 - fr(e.t + k / 4) * 3); if (m.has(x, y + 2)) P(c, x, y, ICE[1], 0.8 * (1 - fr(e.t + k / 4))); }
};

// ------------------------------------------------------------------------------------- C: cold mist
const mkC = (lv) => (c, e) => {
  const g = grow(lv), t = e.t, ph = t * TAU, m = maskOf(e.foe(frameOf(e))), T = m.T;
  // a faint pool at the feet, no wider than the feet
  const rx = Math.round((m.xr - m.xl) / 2) - 1;
  for (let y = -1; y <= 4; y++) for (let x = -rx; x <= rx; x++) { const r = Math.hypot(x / rx, (y - 1.5) / 3.2); if (r > 1) continue; if (bay(x + e.i, y) < fifth((1 - r) * 0.9 * g.amp) * 0.8) P(c, x + m.cx, y, r < 0.5 ? ICE[1] : ICE[2], 0.5); }
  body(c, e);
  // the mist: soft dithered vapour 1-4 px out, heavier on the back (left) and low, density rolling down; the face side stays clear
  const out = new Map();
  for (const [x, y] of m.edge) for (let dx = -4; dx <= 2; dx++) for (let dy = -2; dy <= 4; dy++) { const X = x + dx, Y = y + dy; if (m.has(X, Y)) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)) + (dx && dy ? 0.5 : 0); if (d > 4) continue; const k = X + "," + Y; if (!out.has(k) || out.get(k)[2] > d) out.set(k, [X, Y, d]); }
  for (const [X, Y, d] of out.values()) {
    if (isFace(m, X, Y) || Y < -T + 2) continue;
    const back = X < m.cx ? 1 : 0.55, lowK = 0.5 + 0.5 * cl(1 - (-Y) / T), dens = 0.55 + 0.45 * Math.sin(Y * 0.5 - ph * 2 + X * 0.3);
    if (bay(X + e.i, Y) < dens * back * lowK * g.amp * (1.25 - d * 0.22)) P(c, X, Y, d < 2 ? ICE[0] : d < 3.2 ? ICE[1] : ICE[2], 0.8 - d * 0.14);
  }
  // wide wisps trail behind the walk (left) and sink, 2-3 px puffs thinning out
  for (let k = 0; k < g.n + 4; k++) {
    const q = fr(t + H(k, 2)), p0 = m.edge[Math.floor(H(k, 5) * m.edge.length) % m.edge.length]; if (isFace(m, p0[0], p0[1]) || p0[0] > m.cx + 3) continue;
    const x = p0[0] - 2 - q * 11 + Math.sin(q * 5 + k) * 1.5, y = Math.min(2, p0[1] + q * 13), r = 1 + q * 1.8;
    for (let yy = -2; yy <= 2; yy++) for (let xx = -3; xx <= 3; xx++) if ((xx * xx) / 2 + yy * yy <= r * r && bay(xx + k, yy + e.i) < 0.85 * (1 - q)) P(c, x + xx, y + yy, q < 0.4 ? ICE[0] : q < 0.7 ? ICE[1] : ICE[2], 0.75 * (1 - q * 0.6));
  }
  // glints on the edge: a plus that blinks for two frames
  for (let k = 0; k < 2 + lv; k++) { const start = Math.floor(H(k, 6) * e.N), age = (e.i - start + e.N) % e.N; if (age > 2) continue; const [x, y] = m.edge[Math.floor(H(k, 1) * m.edge.length) % m.edge.length]; if (isFace(m, x, y)) continue;
    P(c, x, y, ICE[0]); if (age === 1) { P(c, x - 1, y, ICE[1]); P(c, x + 1, y, ICE[1]); P(c, x, y - 1, ICE[1]); P(c, x, y + 1, ICE[1]); } }
  coldRim(c, m, g.amp * 0.22, ph);
};

// ------------------------------------------------------------------------------------- D: chilled colours + crawling flakes
// the figure's own colours dithered toward blue (face kept lighter), a frosted rim, snowflake glints crawling the outline
const mkD = (lv) => (c, e) => {
  const g = grow(lv), t = e.t, ph = t * TAU, s = e.foe(frameOf(e)), m = maskOf(s), T = m.T;
  const tmp = document.createElement("canvas"); tmp.width = s.cv.width; tmp.height = s.cv.height; const tc = tmp.getContext("2d");
  tc.drawImage(s.cv, 0, 0); tc.globalCompositeOperation = "source-atop";
  const ox = Math.round(s.ax), oy = Math.round(s.ay);
  for (const [x, y] of m.list) { const k = isFace(m, x, y) ? 0.4 : 1, lowK = 0.7 + 0.3 * cl(1 - (-y) / T), a = fifth(0.34 * g.amp * k * lowK); if (bay(x, y) < a) { tc.fillStyle = "#5f94d0"; tc.globalAlpha = 0.5; tc.fillRect(x + ox, y + oy, 1, 1); } }
  tc.globalAlpha = 1; c.drawImage(tmp, -ox, -oy);
  coldRim(c, m, g.amp * 0.85, ph);
  // glints crawling round the outline, each with a short fading trail
  const cx = m.cx, cy = -T * 0.5, ring = m.edge.map(([x, y]) => [x, y, Math.atan2((y - cy) * 0.8, x - cx)]).sort((a, b) => a[2] - b[2]);
  const flakes = lv + 2;
  for (let k = 0; k < flakes; k++) {
    const a0 = fr(t + k / flakes) * ring.length;
    for (let j = 0; j < 5; j++) { const [x, y] = ring[((Math.floor(a0) - j * 2) % ring.length + ring.length) % ring.length]; if (isFace(m, x, y)) continue; P(c, x, y, j === 0 ? ICE[0] : j < 3 ? ICE[1] : ICE[2], 1 - j * 0.18); }
    const [hx, hy] = ring[Math.floor(a0) % ring.length]; if (!isFace(m, hx, hy)) { P(c, hx - 1, hy, ICE[1]); P(c, hx + 1, hy, ICE[1]); P(c, hx, hy - 1, ICE[1]); P(c, hx, hy + 1, ICE[1]); }
  }
  crystals(c, e, m, Math.max(2, g.n - 4), 0.8);
};

export const ROWS = [{
  id: "slow6", label: "Slow / chill on a foe (round 6)", group: "Round 6", bdLabel: "B, burning too (fire + frost)", cw: 80, ch: 78, ax: 40, ay: 58, N: 12, todayKeys: ["slow"],
  note: "A: hoarfrost edge + rime crystals + breath. B: creeping ice from the feet (glaze, icicles); the DARK-ground column also carries the Round 5 B burn under it (stack check). C: cold mist hugging the outline. D: chilled colours + snowflake glints crawling the outline. All on the body, none over the crown; painted at the middle slow level.",
  A: mkA(1), B: mkB(1), C: mkC(1), D: mkD(1),
}];
