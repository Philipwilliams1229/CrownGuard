// Effects concepts, Round 20, row 3 (pools20): fire on the ground, in Dragonbreath's look. See art/briefs/fx-round20.md.
// The Inferno Throne's burning ground (g.grounds kind "fire", r 36, 3.5 s: flames.js drawFireGround / drawFireFront, the owner's
// "burning ground B") on the left and the Hellburner's lava pool (kind "lava", r 26, 2.2 s: fx.js poolSprite, Round 4 B) on the
// right, at today's sizes. KEPT: both beds as today (copied line for line from fireBaseS and poolSprite's lava branch, so the
// variations differ only where asked), the patch plan (flames.js PATCH: where the tongues stand, their sizes and clocks), the
// goblins' own fire (statusfx.js statusBurn, called for real). REDONE: the flames standing on the pools. Today's fire-pool
// tongues are flat three-tone candles with grey smoke behind; the lava pool throws 1-px specks. Here every tongue is one dense
// mottled mass (gold / orange / deep orange / red-orange clusters stretched upward and drifting up), a broken pale core, white-hot
// at its root, ragged sides, a darker red tinted 1-px rim (#8a2028), small licks that tear off its tip, its tip see-through in
// steps. No smoke anywhere.
// Bakeable as the game bakes today: every pixel is a pure function of (pool size, variant, loop step), 16 steps a loop (1.6 s, today's
// fire loop is 8 steps at 5 a second); the tongues rooted in the pool's back half go under a foe, the front half over, as now.
// Painters get (c, e): c is the cell (1 unit = 1 art px, origin top-left), e.i the loop step. Game modules load only in a browser.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/paint.js")), ...(await import("/src/render/fx.js")), ...(await import("/src/render/flames.js")),
  ...(await import("/src/render/statusfx.js")), ...(await import("/src/render/rigs.js")) } : {};

const TAU = Math.PI * 2, N = 16;
const PXu = () => G.PX || 2;
const CELL = { cw: 330, ch: 164, ax: 0, ay: 0, N };
const FC = [104, 100], LC = [262, 104];                                 // the fire pool's and the lava pool's middles (art px)
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];       // flames.js (the beds)
const BF = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];         // Dragonbreath's tones (the tongues)
const INK = "#8a2028";
const LAVA = ["#fff3d2", "#f8d868", "#f09838", "#d0502e", "#7a2a26", "#3a1e22"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const per = (a, n) => ((a % n) + n) % n;
const smt = (t) => t * t * (3 - 2 * t);
const P = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const vn = (x, y, s, sd = 0) => { const gx = x / s, gy = y / s, ix = Math.floor(gx), iy = Math.floor(gy), fx = smt(gx - ix), fy = smt(gy - iy);
  const a = H(ix, iy + sd), b = H(ix + 1, iy + sd), c = H(ix, iy + 1 + sd), d = H(ix + 1, iy + 1 + sd); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
const vor = (x, y, s, seed) => {
  const gx = Math.floor(x / s), gy = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, id = 0, cx = 0, cy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ix = gx + i, iy = gy + j, px = (ix + 0.15 + 0.7 * H(ix, iy + seed)) * s, py = (iy + 0.15 + 0.7 * H(ix + 9, iy + seed)) * s, d = Math.hypot(x - px, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = ix * 57 + iy * 13; cx = px; cy = py; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id, cx, cy };
};

// ---- the fire pool's bed: flames.js fireBaseS, line for line (G.set -> P), on the loop step ---------------------------------
const FR = 36 * 2 * 0.93, FRY = FR * 0.59, FV = 1, FSD = 1.3 + FV * 2.1;
const blobEdge = (x, y, R, ry, sd) => { const a = Math.atan2(y / ry, x / R);
  const r = 1 + 0.16 * Math.sin(3 * a + sd) + 0.11 * Math.sin(5 * a + 2 * sd + 1) + 0.06 * Math.sin(9 * a + sd * 3) + (a > 2.2 || a < -2.6 ? 0.1 : 0);
  return Math.hypot(x / R, y / ry) / r; };
const ellA = (c, cx, cy, rx, ry, col, al, dens) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1 || bay(x, y) >= dens) continue; P(c, x, y, col, al); } };
// o.coals: the char heart glows as a bed of coals (B); o.heart: a white-hot heart in the middle (C)
const fireBed = (c, t, o = {}) => {
  const [cx, cy] = FC, R = FR, ry = FRY, sd = FSD, hx = Math.ceil(R * 1.5) + 3, hy = Math.ceil(ry * 1.5) + 3, f8 = t * 8;
  ellA(c, cx, cy, R * 1.1, ry * 1.1, FIRE[2], 0.1 + 0.02 * Math.sin(f8 * 0.8), 0.5); ellA(c, cx, cy, R * 0.66, ry * 0.66, FIRE[2], 0.2 + 0.04 * Math.sin(f8 * 0.8), 0.5);
  for (let y = -hy; y <= hy; y++) for (let x = -hx; x <= hx; x++) {
    const d = blobEdge(x, y, R, ry, sd) + (vn(x, y, 5, 4) - 0.5) * 0.4 + (H(x, y) - 0.5) * 0.12;
    if (d > 1.45) continue;
    if (d < 0.62) {
      if (o.coals) {                                                    // B: the char heart glows as an ember bed, hottest in the middle, breathing
        const deep = cl(1 - d / 0.62), br = vn(x + Math.cos(t * TAU) * 3, y * 1.6 + Math.sin(t * TAU) * 3, 4, 12), g = deep * (0.55 + 0.6 * br) + (H(x, y + 7) - 0.5) * 0.12;
        const b0 = bay(x, y);
        if (g > 0.62) { P(c, cx + x, cy + y, g > 0.8 && b0 < 0.5 ? FIRE[2] : FIRE[3]); continue; }
        if (g > 0.36) { P(c, cx + x, cy + y, b0 < 0.75 ? FIRE[4] : FIRE[3]); continue; }
        if (g > 0.18 && b0 < (g - 0.18) * 3) { P(c, cx + x, cy + y, FIRE[4]); continue; }
        P(c, cx + x, cy + y, vn(x, y, 6, 2) > 0.6 ? "#2a1c20" : "#20161a");
      } else P(c, cx + x, cy + y, vn(x, y, 6, 2) > 0.6 ? "#2a1c20" : "#20161a");
      continue;
    }
    const k = (d - 0.62) / 0.83;
    if (bay(x, y) >= Math.min(1, (1 - k) * 1.25 + 0.05)) continue;
    P(c, cx + x, cy + y, k < 0.25 ? "#2a1c1c" : k < 0.6 ? "#3a2a1e" : "#4a3a28", k < 0.6 ? 0.95 : 0.7);
    if (k > 0.6 && H(x * 3, y) > 0.7) P(c, cx + x, cy + y, "#1e1a16", 0.6);
  }
  const sc = R / 56, walk = (x, y, ang, len, depth, my) => { for (let i = 0; i < len; i++) { ang += (H(my * 7 + i, sd) - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang) * 0.6;
    if (blobEdge(x, y, R, ry, sd) > 0.88) break; const X = Math.round(x), Y = Math.round(y), lit = 0.5 + 0.5 * Math.sin(t * TAU + my * 2.1);
    if ((X + Y) % 2 === 0) { P(c, cx + X, cy + Y - 1, FIRE[4], 0.45); P(c, cx + X + 1, cy + Y, FIRE[4], 0.35); }
    const hot = o.heart ? cl(1 - Math.hypot(X / (R * 0.4), Y / (ry * 0.4))) : 0;
    const dm = o.dimFiss ? 1 : 0;                                       // the web a tone darker so it sits under the flames (same lines)
    P(c, cx + X, cy + Y, hot > 0.4 ? FIRE[0] : lit > 0.75 || hot > 0.1 ? FIRE[1 + dm] : lit > 0.4 ? FIRE[2 + dm] : FIRE[3 + dm]);
    if (depth < 2 && H(my + i, sd + 5) > 0.93) walk(x, y, ang + (H(i, my) > 0.5 ? 0.8 : -0.8), (len * 0.6) | 0, depth + 1, my * 3 + i); } };
  for (let k = 0; k < 8; k++) { const a = H(k, sd + 1) * TAU, dd = 0.08 + 0.35 * H(k, sd + 2); walk(Math.cos(a) * R * dd, Math.sin(a) * ry * dd, H(k, sd + 3) * TAU, ((22 + 20 * H(k, sd + 4)) * Math.max(0.6, sc)) | 0, 0, k); }
  for (let y = -hy; y <= hy; y++) for (let x = -hx; x <= hx; x++) if (blobEdge(x, y, R, ry, sd) < 0.7 && H(x * 2.1, y * 1.7) > 0.985) P(c, cx + x, cy + y, FIRE[(Math.round(t * 8) + x) & 1 ? 2 : 3]);
  if (o.heart) heart(c, cx + 4, cy - 3, R * 0.13, ry * 0.15, t, 5);
};
// C's white-hot heart: a small mottled well of white and gold that breathes, stepping out through orange into the bed
const heart = (c, cx, cy, rx, ry, t, sd) => {
  const br = 0.9 + 0.1 * Math.sin(t * TAU * 2 + sd);
  for (let y = Math.floor(-ry * 1.7); y <= Math.ceil(ry * 1.7); y++) for (let x = Math.floor(-rx * 1.7); x <= Math.ceil(rx * 1.7); x++) {
    const d = Math.hypot((x + 0.5) / rx, (y + 0.5) / ry) / br + (vn(x + Math.cos(t * TAU) * 2, y + Math.sin(t * TAU) * 2, 2.5, sd) - 0.5) * 0.9;
    if (d > 1.7) continue;
    if (d > 1.15 && bay(cx + x, cy + y) > (1.7 - d) * 1.4) continue;
    P(c, cx + x, cy + y, d < 0.45 ? BF[0] : d < 0.8 ? BF[1] : d < 1.15 ? BF[2] : BF[3], d > 1.15 ? 0.8 : 1);
  }
};

// ---- the lava pool's bed: fx.js poolSprite's lava branch, line for line (crust, cracks, bubbles), on the loop step -----------
const LR = 24 * 2, LRY = LR * 0.62;
const lavaBubble = (c, x, y, ph, rm, big) => {
  const K = LAVA;
  if (ph < 0.72) {
    const r = Math.max(1, Math.round(rm * Math.min(1, ph / 0.6))), by = y - Math.round(ph * 2);
    if (r <= 1) { P(c, x, by, K[1]); P(c, x - 1, by, K[2]); return; }
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j * 1.1); if (d > r + 0.3) continue; P(c, x + i, by + j, d > r - 1 ? K[3] : K[2]); }
    P(c, x - Math.floor(r / 2), by - Math.floor(r / 2), K[0]); P(c, x - Math.floor(r / 2) + 1, by - Math.floor(r / 2), K[1]);
  } else if (ph < 0.9) {
    const u = (ph - 0.72) / 0.18, rr = rm * (0.8 + u);
    for (let k = 0; k < 6; k++) { const an = (k * TAU) / 6 + 0.4; P(c, x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6 - (1 - u) * 3, u < 0.5 ? K[0] : K[1]); }
    if (big && u < 0.5) P(c, x, y, K[1]);
  }
};
const lavaBed = (c, t, o = {}) => {
  const [cx, cy] = LC, R = LR, ry = LRY, seed = 3, ox = Math.cos(t * TAU) * 2.6, oy = Math.sin(t * TAU) * 2.6;
  const edgeOf = (x, y) => { const nx = (x + 0.5) / R, ny = (y + 0.5) / ry, jx = Math.cos(t * TAU) * 4, jy = Math.sin(t * TAU) * 4;
    return Math.sqrt(nx * nx + ny * ny) + (vn(x + jx, y + jy, 6, seed) - 0.5) * 0.42 + 0.05 * Math.sin(t * TAU + Math.atan2(ny, nx) * 2 + seed); };
  const mx = Math.ceil(R + 5), my = Math.ceil(ry + 5);
  for (let y = -my; y <= my; y++) for (let x = -mx; x <= mx; x++) {
    const edge = edgeOf(x, y); if (edge > 1) continue;
    const X = cx + x, Y = cy + y, up = x + y < 0, b = bay(x & 1023, y & 1023);
    if (edge > 0.9) { P(c, X, Y, up ? LAVA[4] : LAVA[5], 235 / 255); continue; }
    const V = vor(x + ox + 50, y + oy + 50, 9.5, 4), crack = V.d2 - V.d1, ch = vn(x + ox * 2, y + oy * 2, 4, 17);
    // C: the plates melt away toward a white-hot welling in the middle
    const melt = o.heart ? cl(1 - Math.hypot(x / (R * 0.34), y / (ry * 0.34))) : 0, plate = H(V.id, 2) < 0.8 - melt * 1.2;
    if (!plate || crack < 0.9) P(c, X, Y, crack < 0.9 && plate ? (ch > 0.6 ? LAVA[1] : LAVA[2]) : (ch > 0.7 - melt * 0.5 ? LAVA[1] : ch > 0.45 - melt * 0.4 ? LAVA[2] : LAVA[3]));
    else if (crack < 1.8) P(c, X, Y, up ? LAVA[3] : LAVA[4], 245 / 255);
    else { const lit = (x + ox + 50 - V.cx) + (y + oy + 50 - V.cy) < -1.5; P(c, X, Y, lit ? (b < 0.5 ? LAVA[4] : LAVA[3]) : (b < 0.4 ? LAVA[5] : LAVA[4]), 245 / 255); }
  }
  if (o.heart) heart(c, cx + 1, cy, R * 0.16, ry * 0.16, t, 8);
  const nb = Math.max(5, Math.round(R / 3.2));
  for (let k = 0; k < nb; k++) {
    const an = H(k, seed + 20) * TAU, d = Math.sqrt(H(k, seed + 30)) * 0.62, rm = 1 + (k % 4) + (k > 4 ? 1 : 0);
    lavaBubble(c, Math.round(cx + Math.cos(an) * R * d), Math.round(cy + Math.sin(an) * ry * d), (t * 2 + H(k, seed + 40)) % 1, rm, rm > 2);
  }
};

// ---- a tongue in Dragonbreath's look ----------------------------------------------------------------------------------------
// Root (x0, y0) on the ground, height h, half-width w at its belly, t the loop (0..1), sd its seed. The body is a stack of rows:
// a profile that swells just above the root and tapers to a tip that leans with a slow sway; each side ragged by its own noise
// rolling UP the flame (2 rows a step, periodic over the loop); colours from a heat (middle and low = hot) broken by mottled cells
// (2x2 and 2x4, stretched upward, rolling up with the ragged edge), so it reads as one dense flickering mass with a broken pale
// core, white-hot at the root. Then the 1-px tinted rim on every open side, licks torn off the tip, the top part see-through in
// steps (o.see: alpha of the upper third, half of it dithered away above). Pixels go into `out` (a Map) so a patch shares one rim.
const SPD = 48;                                                          // rows the pattern rolls up per loop (3 a step)
const tongue = (out, x0, y0, h, w, t, sd, o = {}) => {
  if (h < 3) return;
  const s = Math.round(t * SPD), cyc = 1 + (sd & 1), lean = o.lean ?? 1;
  const tipX = (p) => (Math.sin(TAU * t * cyc + sd * 2.3 + p * 2.4) * 1.3 + Math.sin(TAU * t * cyc * 2 + sd * 1.7 + p * 4.5) * 0.55) * p * p * lean * (h / 12);
  for (let j = 0; j < h; j++) {
    const p = j / h, q = j - s, prof = p < 0.22 ? 1.25 - p * 1.2 : Math.pow(Math.cos(((p - 0.22) / 0.78) * (Math.PI / 2)), 1.5) * 0.99;   // flared root (neighbours merge), pointed tip
    const rl = H(per(q, SPD), sd * 3 + 1), rr = H(per(q, SPD), sd * 3 + 2), rl2 = H(per(q >> 2, SPD / 4), sd * 3 + 5), rr2 = H(per(q >> 2, SPD / 4), sd * 3 + 6);
    const hwL = Math.max(0.5, w * prof * (0.7 + 0.25 * rl + 0.35 * rl2)), hwR = Math.max(0.5, w * prof * (0.7 + 0.25 * rr + 0.35 * rr2)), mid = tipX(p);
    for (let dx = -Math.ceil(hwL + 1); dx <= Math.ceil(hwR + 1); dx++) {
      const rel = dx - mid, hw = rel < 0 ? hwL : hwR, d = Math.abs(rel) / hw;
      if (d > 1) continue;
      const X = Math.round(x0 + dx), Y = y0 - j;
      // mottled clusters stretched up the flame: 1-2 px wide, 3-5 tall, rolling up with it
      const m = 0.55 * H(per(X, 128), per(Math.floor(q / 4), SPD / 4) + sd * 31) + 0.45 * H(per(X >> 1, 64) + 99, per(Math.floor((q + 1) / 3), SPD / 3) + sd * 17);
      const heat = (1 - Math.pow(d, 1.4)) * (1 - 0.75 * p) + (m - 0.5) * 0.7 - 0.08 + (o.hot || 0);
      let col = heat > 0.74 && m > 0.5 ? BF[0] : heat > 0.56 ? BF[1] : heat > 0.38 ? BF[2] : heat > 0.18 ? BF[3] : BF[4];
      if (j <= 1 && d < 0.3) col = BF[0];                                // white-hot where it is born
      else if (j <= 2 && d < 0.5 && col !== BF[0]) col = BF[1];
      let a = 1;
      if (o.see != null && p > 0.55) { a = p > 0.8 ? o.see * 0.75 : o.see; if (p > 0.8 && bay(X, Y) > 0.6) continue; }
      if (o.body != null && j > 2) a = Math.min(a, p < 0.3 ? o.body : o.body * 0.85);
      out.set(X + "," + Y, { x: X, y: Y, col, a });
    }
  }
  // licks: two or three flecks torn off the tip, rising and leaning, gone before they reach the top of their climb
  for (let k = 0; k < (o.licks ?? 3); k++) {
    const ph = (t * cyc * 2 + H(k, sd + 50)) % 1; if (ph > 0.7) continue;
    const y = y0 - h * (0.72 + 0.12 * H(k, sd + 51)) - ph * (h * 0.45 + 3), x = x0 + tipX(1) * (1 + ph * 0.6) + (H(k, sd + 52) - 0.5) * w * 1.4;
    const col = ph < 0.25 ? BF[1] : ph < 0.5 ? BF[2] : BF[3], X = Math.round(x), Y = Math.round(y), a = o.see != null ? o.see : 1;
    out.set(X + "," + Y, { x: X, y: Y, col, a });
    if (ph < 0.4) out.set(X + "," + (Y + 1), { x: X, y: Y + 1, col: BF[3], a });
  }
};
// the rim: the tinted dark-red line on every open side of a patch's pixels (4-neighbours), drawn under the flame
const LRIM = "#4a1420";                                                // the lava flames' rim: a step darker than INK, solid
const paintPatch = (c, out, rimCol) => {
  const rim = new Map();
  for (const p of out.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (p.x + dx) + "," + (p.y + dy);
    if (out.has(k)) continue;
    const r = rim.get(k); if (!r || r.a < p.a) rim.set(k, { x: p.x + dx, y: p.y + dy, a: p.a * (dy === 1 ? 0.6 : 0.9) });
  }
  for (const r of rim.values()) P(c, r.x, r.y, rimCol || INK, rimCol ? Math.max(0.8, r.a) : Math.round(r.a * 10) / 10);
  for (const p of out.values()) P(c, p.x, p.y, p.col, Math.round(p.a * 20) / 20);
};

// ---- the patches: today's PATCH plan (flames.js), each ONE joined mass of fire on its own clock ---------------------------------
// A patch is a broad mottled body (a low dome as wide as today's cluster) whose top rises into a few licks of different heights
// and widths (never two alike), the whole mass leaning together with a slow sway, its top edge ragged and rolling up. Colours
// as the tongue: hot low and in the middle, a broken pale core, white-hot at the root, the tinted rim round the whole mass.
const PATCH = [[-12, -4, 0.0, 1.3, 4], [10, 7, 0.3, 1.1, 3], [24, -6, 0.62, 0.8, 3], [-30, 8, 0.8, 0.7, 2], [2, -14, 0.45, 0.8, 2]];   // flames.js, verbatim
const PEAKS = [[1, 0.0, 1.0], [0.62, -1, 0.8], [0.8, 1, 0.65], [0.45, -0.4, 0.55]];   // [height, side, width] of each lick, by rank
const patchMass = (out, rx, ry, Hh, W, n, t, sd, o) => {
  if (Hh < 4) return;
  const s = Math.round(t * SPD), cyc = 1 + (sd & 1), lean = o.lean ?? 1, np = Math.max(1, Math.min(4, n - (n > 2 ? 1 : 0)));
  const pk = [];                                                         // the licks: shuffled by the seed so neighbours differ
  for (let k = 0; k < np; k++) { const q = PEAKS[(k + sd) % 4];
    pk.push({ x: (q[1] * 0.5 + (H(sd, k + 11) - 0.5) * 0.3) * W, h: q[0] * (0.85 + 0.3 * H(sd, k + 12)) * Hh, w: Math.max(1.8, q[2] * W * 0.36), ph: H(sd, k + 13) * TAU }); }
  const sway = (j, x) => (Math.sin(TAU * t * cyc + sd * 2.3 + j * 0.18) * 1.4 + Math.sin(TAU * t * cyc * 2 + sd + j * 0.4) * 0.5) * Math.pow(j / Hh, 2) * lean * (Hh / 12);
  const topOf = (x, j) => {
    let tp = Hh * 0.34 * Math.pow(Math.max(0, 1 - (x / W) ** 2), 1.4);  // the body: a dome falling away to its sides
    for (const q of pk) { const lx = x - q.x - Math.sin(TAU * t * cyc + q.ph) * 0.8 * (j / Hh); const v = q.h * Math.exp(-((lx / q.w) ** 2) * 1.6); if (v > tp) tp = v; }
    return tp;
  };
  for (let j = 0; j < Hh * 1.1; j++) {
    const q = j - s, rag = (H(per(q, SPD), sd * 3 + 1) - 0.5) * 1.6 + (H(per(q >> 2, SPD / 4), sd * 3 + 5) - 0.5) * 2;
    for (let dx = -Math.ceil(W + 3); dx <= Math.ceil(W + 3); dx++) {
      const x = dx - sway(j, dx), tp = topOf(x + rag * 0.5, j) + (H(per(dx + 64, 128), per(q >> 1, SPD / 2) + sd) - 0.5) * 2.2;
      if (j >= tp || tp < 1.5) continue;
      const X = Math.round(rx + dx), Y = ry - j, p = j / Math.max(tp, 1), d = Math.min(1, Math.abs(x) / (W + 1));
      const m = 0.55 * H(per(X, 128), per(Math.floor(q / 4), SPD / 4) + sd * 31) + 0.45 * H(per(X >> 1, 64) + 99, per(Math.floor((q + 1) / 3), SPD / 3) + sd * 17);
      const heat = (1 - Math.pow(d, 1.5)) * 0.62 + (1 - p) * 0.42 - 0.1 * (j / Hh) + (m - 0.5) * 0.75 + (o.hot || 0);
      let col = heat > 0.82 && m > 0.5 ? BF[0] : heat > 0.62 ? BF[1] : heat > 0.44 ? BF[2] : heat > 0.26 ? BF[3] : BF[4];
      if (j === 0 && d < 0.16) col = BF[0]; else if (j <= 2 && d < 0.3 && col !== BF[0]) col = BF[1];   // white-hot only at the very root
      let a = 1;
      if (o.see != null && p > 0.6) { a = p > 0.82 ? o.see * 0.75 : o.see; if (p > 0.82 && bay(X, Y) > 0.6) continue; }
      if (o.body != null && j > 2) a = Math.min(a, p < 0.3 ? o.body : o.body * 0.85);
      out.set(X + "," + Y, { x: X, y: Y, col, a });
    }
  }
  // licks torn off the tallest lick's tip
  const top = pk[0];
  for (let k = 0; k < (o.licks ?? 3); k++) {
    const ph = (t * cyc * 2 + H(k, sd + 50)) % 1; if (ph > 0.7) continue;
    const j = top.h * (0.8 + 0.1 * H(k, sd + 51)) + ph * (top.h * 0.4 + 3), X = Math.round(rx + top.x + sway(Math.min(j, Hh), 0) * (1 + ph * 0.5) + (H(k, sd + 52) - 0.5) * top.w * 1.6), Y = Math.round(ry - j);
    const a = o.see != null ? o.see : 1;
    out.set(X + "," + Y, { x: X, y: Y, col: ph < 0.25 ? BF[1] : ph < 0.5 ? BF[2] : BF[3], a });
    if (ph < 0.4) out.set(X + "," + (Y + 1), { x: X, y: Y + 1, col: BF[3], a });
  }
};
const firePatches = (t, o) => {
  const sc = FR / 56, [cx, cy] = FC, list = [];
  PATCH.forEach(([x, y, ph, sz, n], k) => {
    y = Math.round(y * sc);
    const env = Math.pow(Math.sin(((t + ph + FV * 0.21) % 1) * Math.PI), 0.7); if (env < 0.12) return;
    const out = new Map(), rx = cx + Math.round(x * sc), ry = cy + y;
    const Hh = Math.round((9 + 14 * H(k, 4 + FV)) * sz * env * 1.55 * 1.15 * sc * (o.hk || 1)), W = ((n - 1) / 2 * 5 + 4) * sc * (o.wk || 1);
    patchMass(out, rx, ry, Hh, W, n, t, k * 7 + 3, o);
    list.push({ y: ry, draw: (c) => paintPatch(c, out) });
  });
  return list;
};
// the lava pool's flames: today throws three 1-px specks rising off it; here four small tongues standing up out of the cracks,
// each lit and dying on its own clock (2-3 times a loop), leaning and tearing licks off
const LT = [[-16, -4], [9, -9], [20, 5], [-5, 9], [-26, 6]];
const lavaTongues = (t, o) => LT.map(([x, y], k) => {
  const cyc = 2 + (k & 1), ph = (t * cyc + H(k, 61)) % 1, env = ph < 0.65 ? Math.sin((ph / 0.65) * Math.PI) : 0;
  const out = new Map(), rx = LC[0] + x, ry = LC[1] + y, h = Math.round((13 + 8 * H(k, 62)) * env * (o.hk || 1));
  if (h >= 3) tongue(out, rx, ry, h, Math.max(2, h * 0.27) * (o.wk || 1), t, 40 + k, { ...o, licks: 2, hot: (o.hot || 0) + 0.14 });
  return { y: ry, draw: (c) => paintPatch(c, out, LRIM) };   // a darker rim so they stand off the orange crust
});

// ---- the goblins: walking through, two of them burning (the game's statusBurn, Round 18 A) ----------------------------------
const GOB = [[86, 114, true], [152, 84, false], [266, 110, true]];
const foe = (f) => { const s = G.rigFrame("goblin", "walk", per(f, 8), ""); return { cv: s.cv, ax: s.ax * PXu(), ay: s.ay * PXu() }; };
const scratch = BR ? document.createElement("canvas").getContext("2d") : null;
const gobItems = (e) => GOB.map(([x, y, burn], k) => ({ y, draw: (c) => {
  const f = e.i + k * 3, s = foe(f);
  c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
  if (!burn) return;
  const X = PXu(), fe = { x: x / X, id: k + 1, face: 1, size: 15, _rf: { skin: "goblin", ps: "walk", pf: per(f, 8) } }, time = 5 + e.i * 0.1;
  for (let w = 0; w < 6; w++) G.statusBurn(scratch, fe, time + w * 1e-6, y / X, 15);   // warm the bake (the game spreads it over frames)
  c.save(); c.scale(X, X); G.statusBurn(c, fe, time + 7e-6, y / X, 15); c.restore();
} }));
const compose = (c, items) => { for (const it of items.sort((a, b) => a.y - b.y)) it.draw(c); };

// ---- sparks lifting off (C): gold points climbing out of the flames, drifting, cooling to red, a loop -------------------------
const sparks = (c, t, cx, cy, R, ry, n, sd) => {
  for (let k = 0; k < n; k++) {
    const cyc = 1 + (k % 2), ph = (t * cyc + H(k, sd)) % 1, an = H(k, sd + 1) * TAU, d = Math.sqrt(H(k, sd + 2)) * 0.7;
    const x = cx + Math.cos(an) * R * d + Math.sin(ph * TAU + k) * 2 + ph * 4 * (H(k, sd + 3) - 0.5), y = cy + Math.sin(an) * ry * d - 6 - ph * (22 + 16 * H(k, sd + 4));
    P(c, x, y, ph < 0.3 ? BF[0] : ph < 0.6 ? BF[1] : ph < 0.85 ? BF[2] : BF[3], ph > 0.85 ? 0.6 : 1);
    if (ph < 0.45) P(c, x, y + 1, ph < 0.2 ? BF[1] : BF[2]);           // a short streak while it is young and fast
  }
};

// ---- today: the game's own painters, called for real ------------------------------------------------------------------------
const today = (c, e) => {
  const X = PXu(), time = 5 + e.i * 0.1, tms = 0;
  const fire = { kind: "fire", x: FC[0] / X, y: FC[1] / X, r: 36, until: 1e9, born: -1e9 }, lava = { kind: "lava", x: LC[0] / X, y: LC[1] / X, r: 26, until: 1e9 };
  c.save(); c.scale(X, X); G.drawGround(c, fire, time, tms); G.drawGround(c, lava, time, tms); c.restore();
  compose(c, gobItems(e));
  c.save(); c.scale(X, X); G.drawFireFront(c, fire, time, tms); c.restore();
};

// ---- the three options -------------------------------------------------------------------------------------------------------
const run = (c, e, o) => {
  const t = e.i / N;
  fireBed(c, t, { dimFiss: true, ...o.bed }); lavaBed(c, t, o.bed);
  compose(c, [...firePatches(t, o.fl), ...lavaTongues(t, o.fl), ...gobItems(e)]);
  if (o.sparks) { sparks(c, t, FC[0], FC[1], FR * 0.8, FRY * 0.8, 14, 71); sparks(c, t, LC[0], LC[1], LR * 0.6, LRY * 0.6, 6, 83); }
};
// A: today's beds and flame plan; every tongue redrawn as a mottled mass with a pale broken core, red rim and licks, tips see-through
const optA = (c, e) => run(c, e, { fl: { see: 0.8, licks: 3 } });
// B: lower, wider, see-through flames (the whole body at 80%, the top half less), so the glowing bed (a bed of breathing coals
// in the fire pool's heart) shows through them
const optB = (c, e) => run(c, e, { bed: { coals: true }, fl: { hk: 0.7, wk: 1.3, body: 0.8, see: 0.6, licks: 2, lean: 0.7 } });
// C: A + sparks lifting off both pools and a white-hot heart in each (the fire pool's fissures run white near it; the lava's
// plates melt away round a white-gold welling)
const optC = (c, e) => run(c, e, { bed: { heart: true }, fl: { see: 0.8, licks: 3, hot: 0.06 }, sparks: true });

export const ROWS = [
  { id: "pools20", label: "Fire on the ground: burning ground and lava pools", group: "Round 20",
    note: "Left, the Inferno Throne's burning ground; right, the Hellburner's lava pool; both at today's size, looping, goblins walking through (two of them burning as they do now). The ground under the flames keeps today's shape (its bright cracks a tone darker so they sit under the flames); only the flames standing on it are redrawn in Dragonbreath's look. Each clump of fire is now ONE joined mass: a broad mottled body of gold, orange and red rising into a few licks of different heights that lean together and sway, a broken pale core, white-hot only where it leaves the ground, a dark red edge, little licks tearing off the top, its tip see-through. No smoke. The lava pool's sparks become a few small flames standing out of its cracks, with a pale core and a darker edge so they stand off the orange crust. A: today's flames in the same places, sizes and rhythm, in the new look. B: the same clumps lower, wider and see-through, with the burning ground glowing as a bed of embers beneath them. C: A plus sparks lifting off both pools and a small white-hot heart in the middle of each.",
    ...CELL, today, A: optA, B: optB, C: optC },
];
