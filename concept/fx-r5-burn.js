// Effects concepts, Round 5: fire on a foe (row burn5). See art/briefs/fx-round5.md. Owned by the fire artist.
// Painters get (c, e): c is a cell canvas translated to (ax, ay) = the goblin's feet, 1 unit = 1 art px.
// Pure canvas code, no game imports (Node can read ROWS).
const TAU = Math.PI * 2;
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const SMOKE = ["#8a7a76", "#6a5c60", "#4a3e44"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const fifth = (a) => Math.ceil(cl(a) * 5 - 1e-6) / 5;       // light strength in fifths
const P = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const fr = (v) => v - Math.floor(v);

// ---- the goblin's silhouette, read from the walk frame being drawn --------------------------------
const MASKS = new WeakMap();
const maskOf = (s) => {
  let m = MASKS.get(s.cv); if (m) return m;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d").getImageData(0, 0, w, h).data, set = new Set();
  let top = 1e9, xl = 1e9, xr = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { const X = x - Math.round(s.ax), Y = y - Math.round(s.ay); set.add(X + "," + Y); top = Math.min(top, Y); xl = Math.min(xl, X); xr = Math.max(xr, X); }
  m = { has: (x, y) => set.has(x + "," + y), set, top, xl, xr, cx: Math.round((xl + xr) / 2), T: -top, list: [...set].map((k) => k.split(",").map(Number)) };
  MASKS.set(s.cv, m); return m;
};
const frameOf = (e) => Math.floor(e.i * 8 / e.N);
const body = (c, e, v = "") => { const s = e.foe(frameOf(e), v); c.drawImage(s.cv, Math.round(-s.ax), Math.round(-s.ay)); return maskOf(s); };

// ---- light: a flickering ground pool, a warm rim on the edges nearest the flames --------------------
const pool = (c, m, amp, dx = 0) => {             // stepped glow on the ground (fifths), dithered rim
  const rx = m.xr - m.xl + 18, ry = 8;
  for (let y = -ry - 1; y <= ry + 2; y++) for (let x = -rx; x <= rx; x++) {
    const r = Math.hypot((x - dx) / rx, (y - 1) / ry); if (r > 1) continue;
    const s = fifth((1 - r) * 1.6 * amp); if (s <= 0 || (s < 0.4 && bay(x, y) > s * 2.5)) continue;
    P(c, x, y, r < 0.35 ? FIRE[1] : FIRE[2], s * 0.55);
  }
};
const rim = (c, m, dir, amp, from = -1e9) => {    // 1-px warm rim on the lit side (dir -1 = left), brighter low down
  for (const [x, y] of m.list) {
    if (y < from) continue;
    const edge = !m.has(x + dir, y) ? 1 : !m.has(x, y + 1 - 2 * (y < -m.T * 0.5 ? 0 : 1)) ? 0.4 : 0;
    if (!edge) continue;
    const low = cl(1 - (-y) / (m.T + 2)) * 0.7 + 0.3, s = fifth(amp * edge * low);
    if (s > 0) P(c, x, y, s > 0.6 ? FIRE[1] : FIRE[2], 0.35 + s * 0.6);
  }
};
const wash = (c, m, amp, ph) => {                  // warm wash on the lower body, dithered (the flames below light it)
  for (const [x, y] of m.list) { const k = cl(1 - (-y) / (m.T * 0.7)); if (k <= 0) continue; if (bay(x + ph, y) < fifth(k * amp)) P(c, x, y, FIRE[3], 0.28); }
};

// ---- a flame shape: teardrop that leans and sways, hot core, tinted dark edge -------------------------
const lick = (c, cx, by, h, w, lean, ph, o = {}) => {
  const k = o.k || 1;
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round(w * Math.pow(1 - t, 0.75) * (1 + 0.15 * Math.sin(ph * 2 + t * 5))));
    const mid = cx + lean * t * t * h * 0.35 + Math.sin(ph + t * 3.2) * 1.3 * t;
    for (let q = -hw; q <= hw; q++) {
      const heat = (1 - Math.abs(q) / (hw + 0.8)) * (1 - t * 0.85), edge = Math.abs(q) === hw && hw > 0 && j > 0;
      const col = edge ? (t < 0.55 ? FIRE[4] : FIRE[3]) : heat > 0.62 ? FIRE[0] : heat > 0.42 ? FIRE[1] : heat > 0.22 ? FIRE[2] : FIRE[3];
      for (let z = 0; z < k; z++) for (let zz = 0; zz < k; zz++) P(c, (mid + q) * 1 + (k > 1 ? Math.round(mid + q) * (k - 1) - (mid + q) * (k - 1) + zz : 0), by - j * k - z, col);
    }
  }
};
const spark = (c, x, y, q) => P(c, x, y, q < 0.35 ? FIRE[1] : q < 0.7 ? FIRE[2] : FIRE[4]);

// ---------------------------------------------------------------------------------------- A: licks
// Five big licks stand on the back and shoulder and at the feet, each swapping between three shapes.
const burnA = (c, e) => {
  const t = e.t, ph = t * TAU, amp = 0.85 + 0.15 * Math.sin(ph * 2);
  const m0 = e.foe(frameOf(e)); const m = maskOf(m0), T = m.T;
  pool(c, m, amp, -6);
  // licks behind the body (back, left): stand on the left edge at several heights, each one swaps shape per frame
  const rowL = (y) => { for (let x = m.xl; x <= m.xr; x++) if (m.has(x, y)) return x; return m.cx; };
  const back = [[0.30, 17, 5, -0.5, 0.0], [0.55, 15, 4, -0.7, 1.9], [0.78, 12, 4, -0.5, 3.4], [0.98, 9, 3, -0.3, 4.8]];
  for (const [fy, h, w, lean, off] of back) { const y = -Math.round(T * fy); lick(c, rowL(y) + 1, y + 2, h + Math.round(3 * Math.sin(ph + off)), w + (Math.sin(ph * 2 + off) > 0.3 ? 1 : 0), lean + 0.25 * Math.sin(ph + off), ph + off); }
  lick(c, m.cx + 3, -Math.round(T * 0.9), 6 + Math.round(2 * Math.sin(ph + 5.5)), 2, -0.2, ph + 5.5);
  body(c, e);
  wash(c, m, 0.45 * amp, e.i & 1);
  rim(c, m, -1, 0.9 * amp);
  // licks in front (low, at the feet and hips; none over the face)
  lick(c, m.xl + 7, 1, 14 + Math.round(3 * Math.sin(ph + 2)), 5, -0.3, ph + 2.4);
  lick(c, m.cx - 1, 1, 10 + Math.round(2.5 * Math.sin(ph + 4)), 4, 0.2, ph + 4.2);
  lick(c, m.xr - 3, 1, 8 + Math.round(2 * Math.sin(ph + 1)), 3, 0.4, ph + 1.1);
  for (let k = 0; k < 4; k++) { const q = fr(t + k / 4); spark(c, m.xl + 1 + H(k, 2) * 8 - q * 5, -T * 0.5 - q * (T * 0.7 + 8), q); }
};

// ---------------------------------------------------------------------------------------- B: the body catches
// The outline itself burns: hot cycling rim on the edge pixels, small flames popping at random spots, smoke behind.
const burnB = (c, e) => {
  const t = e.t, ph = t * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2);
  const m = maskOf(e.foe(frameOf(e))), T = m.T;
  pool(c, m, amp, -3);
  // smoke trailing behind (left), drifting up, dithered puffs
  for (let k = 0; k < 5; k++) {
    const q = fr(t + k / 5), x = m.xl - 2 - q * 16 + Math.sin(q * 6 + k) * 2, y = -T * 0.55 - q * (T * 0.6), r = 2 + q * 3;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r && bay(xx + k * 3, yy) < 0.75 * (1 - q)) P(c, x + xx, y + yy, SMOKE[q < 0.5 ? 0 : 1], 0.55 * (1 - q * 0.5));
  }
  body(c, e);
  // the edge pixels burn: a hot band along the outline, colours rolling round it
  for (const [x, y] of m.list) {
    const open = !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1);
    if (!open) continue;
    const face = x > m.cx + 1 && y < -T * 0.55;                 // the face side stays readable: cooler, thinner
    const v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H(x, y) - 0.5) * 0.4;
    const low = cl(1 - (-y) / (T + 2)) * 0.5 + 0.5;
    const s = v * low * (face ? 0.55 : 1);
    P(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]);
  }
  // second ring of warm pixels just outside on the back side (glow)
  for (const [x, y] of m.list) { if (m.has(x - 1, y) || x > m.cx) continue; P(c, x - 1, y, bay(x, y) < 0.6 * amp ? FIRE[1] : FIRE[2], 0.8); if (bay(x + 2, y) < 0.5 * amp) P(c, x - 2, y, FIRE[3], 0.6); if (bay(x, y + 1) < 0.5) P(c, x + 1, y, FIRE[2], 0.6); }
  wash(c, m, 0.35 * amp, e.i & 1);
  // small flames pop up at random edge spots and go out (three frames each)
  const edge = m.list.filter(([x, y]) => (!m.has(x, y - 1)) && !(x > m.cx + 1 && y < -T * 0.55) && y < 0 && y > -T);
  const slots = 9, F = e.N;
  for (let k = 0; k < slots; k++) {
    const start = Math.floor(H(k, 7) * F), age = (e.i - start + F) % F;
    if (age > 3) continue;
    const [x, y] = edge[Math.floor(H(k, 3) * edge.length) % edge.length];
    const h = [4, 7, 9, 4][age], w = age === 3 || age === 0 ? 1 : 2;
    lick(c, x, y, h, w, -0.3, k + age);
  }
  for (let k = 0; k < 3; k++) { const q = fr(t * 1 + k / 3); spark(c, m.cx - 6 - q * 8 + H(k, 1) * 6, -T * 0.4 - q * 22, q); }
};

// ---------------------------------------------------------------------------------------- C: the column
// One tall flame column wraps him: its far wall behind the body, a near wall at the low front; sparks spiral up.
const column = (c, m, ph, side, amp) => {              // side -1: far wall (behind), +1: near wall (in front)
  const T = m.T, hw = Math.round((m.xr - m.xl) / 2) + (side < 0 ? 3 : 2), topH = T + 9;
  const cx = m.cx;
  for (let j = 0; j < topH; j++) {
    const t = j / topH, w = Math.round(hw * (1 - Math.pow(t, 1.5)) * (1 + 0.08 * Math.sin(ph + t * 6)));
    for (let q = -w; q <= w; q++) {
      const x = cx + q + Math.round(Math.sin(ph + t * 4.5) * 1.6 * t), y = -j;
      const raggedTop = (t > 0.55 && H(x, y + Math.floor(ph * 3)) < (t - 0.55) * 2.2) || (side < 0 && Math.abs(q) > w * 0.7 && bay(x, y) > 0.7);
      if (raggedTop) continue;
      if (side > 0) { const strand = Math.abs(q - Math.round(Math.sin(ph + t * 5) * 3) - (j % 2 ? 0 : 0)) < 2 || Math.abs(q + 6 - Math.round(Math.sin(ph + 2 + t * 5) * 2)) < 2; if (!(t < 0.62 && strand) || Math.abs(q) < 3) continue; }
      const edge = Math.abs(q) >= w - 0.5, d = (1 - Math.abs(q) / (w + 0.8)) * (1 - t * 0.7);
      const col = edge ? FIRE[4] : side < 0 ? (d > 0.5 ? FIRE[2] : d > 0.25 ? FIRE[3] : FIRE[4]) : (d > 0.55 ? FIRE[1] : d > 0.3 ? FIRE[2] : FIRE[3]);
      P(c, x, y, col);
    }
  }
};
const burnC = (c, e) => {
  const t = e.t, ph = t * TAU, amp = 0.85 + 0.15 * Math.sin(ph * 2);
  const m = maskOf(e.foe(frameOf(e))), T = m.T, hw = Math.round((m.xr - m.xl) / 2) + 8;
  pool(c, m, amp * 1.05, 0);
  column(c, m, ph, -1, amp);
  // inner hot core of the far wall
  for (let j = 2; j < T + 4; j++) { const w = Math.max(0, Math.round((hw - 6) * (1 - (j / (T + 6)) ** 1.6) * 0.55)); for (let q = -w; q <= w; q++) P(c, m.cx + q - 1 + Math.round(Math.sin(ph + j * 0.2) * 1.2), -j, q * q < w * w * 0.3 ? FIRE[1] : FIRE[2]); }
  // far-side sparks (behind)
  const sp = (front) => { for (let k = 0; k < 10; k++) { const q = fr(t + k / 10), a = q * TAU * 1.5 + k * 1.3, ok = Math.sin(a) >= 0; if (ok !== front) continue; spark(c, m.cx + Math.cos(a) * (hw - 1 - q * 4), -2 - q * (T + 12) + Math.sin(a) * 2, q); } };
  sp(false);
  body(c, e);
  rim(c, m, -1, 0.95 * amp); rim(c, m, 1, 0.35 * amp, -m.T * 0.4);
  wash(c, m, 0.4 * amp, e.i & 1);
  column(c, m, ph + 1.2, 1, amp);
  sp(true);
};

// ---------------------------------------------------------------------------------------- D: scorched
// Chunky cartoon fire (2x2 pixel flames) at the feet and hips, and the body chars from the feet with glowing cracks.
const chunk = (c, cx, by, h, w, ph, lean) => {         // blocky flame on a 2-px grid
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round(w * Math.pow(1 - t, 0.8))), mid = cx + Math.round(lean * t * t * h * 0.3 + Math.sin(ph + t * 3) * 1.5 * t);
    for (let q = -hw; q <= hw; q++) {
      const edge = Math.abs(q) === hw, heat = (1 - Math.abs(q) / (hw + 1)) * (1 - t * 0.8);
      const col = edge ? FIRE[4] : heat > 0.5 ? FIRE[1] : heat > 0.25 ? FIRE[2] : FIRE[3];
      c.fillStyle = col; c.fillRect(mid * 2 - (mid * 2 & 1) + q * 2, by - j * 2 - 2, 2, 2);
    }
  }
};
const burnD = (c, e) => {
  const t = e.t, ph = t * TAU, amp = 0.85 + 0.15 * Math.sin(ph * 2);
  const s0 = e.foe(frameOf(e)), m = maskOf(s0), T = m.T;
  pool(c, m, amp, 0);
  chunk(c, 0, 0, 6, 4, ph + 0.5, -0.5);                  // cx/2 grid: x*2
  body(c, e);
  // charring: soot up from the feet, ragged edge, glowing cracks that breathe
  const line = (x) => -T * (0.46 + 0.1 * Math.sin(x * 0.5 + 1)) - (H(x, 1) - 0.5) * 3;
  for (const [x, y] of m.list) {
    const l = line(x); if (y < l) continue;
    const dep = (y - l) / (T * 0.5), soot = fifth(0.45 + dep * 0.5);
    if (bay(x, y) < soot) P(c, x, y, "#2a1e22", 0.78);
    else P(c, x, y, "#4a3030", 0.5);
    if (H(x, y + 5) > 0.88) { const g = 0.5 + 0.5 * Math.sin(ph * 2 + H(x, y) * 6); if (g > 0.35) P(c, x, y, g > 0.8 ? FIRE[1] : FIRE[3]); }
  }
  // edge of the char glows
  for (const [x, y] of m.list) { const l = Math.round(line(x)); if (y === l && bay(x, y) < 0.7 * amp) P(c, x, y, FIRE[2]); }
  rim(c, m, -1, 0.8 * amp);
  // cartoon flames in front: low at the hips and one on the shoulder behind, 2-px blocks
  chunk(c, Math.round((m.xl + 3) / 2), -Math.round(T * 0.4), 5 + (e.i % 3 === 0 ? 1 : 0), 3, ph + 2, -0.6);
  chunk(c, Math.round((m.cx - 2) / 2), 2, 5, 3, ph + 3.5, 0.2);
  chunk(c, Math.round((m.xr - 3) / 2), 2, 4, 2, ph + 5, 0.5);
  chunk(c, Math.round((m.xl + 2) / 2), -Math.round(T * 0.8), 3, 2, ph + 1, -0.8);
  for (let k = 0; k < 5; k++) { const q = fr(t + k / 5); P(c, m.cx - 6 + H(k, 4) * 12 + Math.sin(q * 5 + k) * 2, -T * 0.3 - q * 22, q < 0.5 ? FIRE[1] : FIRE[3]); }
  for (let k = 0; k < 2; k++) { const q = fr(t + k / 2); for (let a = 0; a < 3; a++) P(c, m.xl - 1 + Math.sin(q * 6 + k) * 2 - a, -T - 2 - q * 12 - a, SMOKE[a], 0.5 * (1 - q)); }
};

export const ROWS = [{
  id: "burn5", label: "Fire on a foe (round 5)", group: "Round 5", cw: 80, ch: 78, ax: 40, ay: 58, N: 12, todayKeys: ["burn"],
  note: "A: big licks. B: the body's outline burns. C: one flame column. D: chunky cartoon fire + charring. Each throws a ground pool and a warm rim.",
  A: burnA, B: burnB, C: burnC, D: burnD,
}];
