// Effects concepts, Round 7: the Plague Ghast's burst (row plague7). See art/briefs/fx-round7.md. Owned by the plague artist.
// Painters get (c, e): c is a cell canvas translated to (ax, ay) = the ghast's centre, 1 unit = 1 art px.
// The burst's reach is 55 world units = 110 art px, lying on the ground squashed to SQ 0.55 tall (rings.js).
// Game modules only in a browser, so Node can still read ROWS.
const BR = typeof document !== "undefined";
const G = BR ? {
  ...(await import("/src/render/rings.js")), ...(await import("/src/render/paint.js")),
  ...(await import("/src/render/rigs.js")), ...(await import("/src/render/fx.js")),
} : {};

const TAU = Math.PI * 2, SQ = 0.55, R = 110;                       // reach in art px (55 world units)
const ROT = ["#d8e8a0", "#a8c46e", "#76944a", "#4e6634", "#34442a"];   // the game's rot ramp (fx.js)
const SICK = "#e8f070", SICK2 = "#c8e040", INK = "#2a3820";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - (1 - cl(t)) * (1 - cl(t));
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const ell = (x, y) => Math.hypot(x, y / SQ);
const ringPx = (c, r, f) => {                                      // f(x, y, d, depth) per pixel of the squashed disc
  const m = Math.ceil(r + 6), my = Math.ceil((r + 6) * SQ);
  for (let y = -my; y <= my; y++) for (let x = -m; x <= m; x++) { const d = ell(x + 0.5, y + 0.5); f(x, y, d, r - d); }
};
const fadeOf = (p, from) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from + 0.001)));

const NW = { cw: 250, ch: 180, ax: 125, ay: 106, N: 14 };
const KN = [{ x: -84, y: 26, flip: false, in: true }, { x: 110, y: 26, flip: true, in: false }];   // 48 and ~60 world units out

// ---- figures ---------------------------------------------------------------------------------------
const tinted = (cv, col, a) => { const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height; const k = t.getContext("2d"); k.drawImage(cv, 0, 0); k.globalCompositeOperation = "source-atop"; k.globalAlpha = a; k.fillStyle = col; k.fillRect(0, 0, t.width, t.height); return t; };
const rimOf = (cv, col) => {                                       // a 1-px lit edge on the sprite's RIGHT (the side toward the ghast)
  const t = tinted(cv, col, 1), k = t.getContext("2d"); k.globalCompositeOperation = "destination-out"; k.drawImage(cv, -1, 0); return t;
};
const knight = (c, k, st) => {
  const s = G.rigFrame("knight", "walk", 0, st.flash ? "white" : ""), PXu = G.PX || 2, ax = Math.round(s.ax * PXu), ay = Math.round(s.ay * PXu);
  c.save(); c.translate(k.x, k.y); if (k.flip) c.scale(-1, 1);
  const lit = Math.ceil(cl(st.lit || 0) * 5) / 5;
  if (st.flash) { c.globalAlpha = 0.9; c.drawImage(s.cv, -ax, -ay); }
  else {
    c.drawImage(s.cv, -ax, -ay);
    if (st.sick) { c.globalAlpha = 0.22; c.drawImage(tinted(s.cv, SICK2, 1), -ax, -ay); c.globalAlpha = 1; }
    if (lit > 0) { c.globalAlpha = 0.3 * lit; c.drawImage(tinted(s.cv, SICK2, 1), -ax, -ay); c.globalAlpha = 0.5 + 0.5 * lit; c.drawImage(rimOf(s.cv, SICK), -ax, -ay); }
  }
  c.globalAlpha = 1; c.restore();
  if (st.sick && !st.flash) for (let j = 0; j < 3; j++) P(c, k.x + (k.flip ? 1 : -1) * (3 + j * 4), k.y + 14 + ((st.i + j * 3) % 7), ROT[1]);   // drips off the scalded man
};
const ghast = (c, i, o = {}) => {
  const s = G.rigFrame("ghast", "walk", i & 7, o.white ? "white" : ""), PXu = G.PX || 2, ax = s.ax * PXu, ay = s.ay * PXu, sole = 18 * 0.55 * PXu, sc = o.sc || 1;
  const w = Math.round(s.cv.width * sc), h = Math.round(s.cv.height * sc);
  const dx = Math.round(-ax * sc + (o.jx || 0)), dy = Math.round(sole + (-ay - sole) * sc);
  if (o.white) c.globalAlpha = 0.95;
  c.drawImage(s.cv, dx, dy, w, h);
  if (o.glow) { c.globalAlpha = o.glow; c.drawImage(tinted(s.cv, SICK, 1), dx, dy, w, h); }
  c.globalAlpha = 1;
};
const scaldOf = (fr, p, dt) => (d) => { const a = fr(p), b = fr(Math.max(0, p - dt)); return a >= d && b < d + 2 ? 1 : (fr(Math.max(0, p - 2 * dt)) < d ? 0 : 2); };   // 1 = the front is crossing him, 2 = already passed
const rowKnights = (fr, glowK) => (c, e, items) => {
  const dt = 1 / (e.N - 1);
  for (const k of KN) {
    const d = ell(k.x, k.y), cr = fr(e.p) >= d - 1 && fr(Math.max(0, e.p - dt)) < d + 6 && fr(e.p) < R * 2;
    const hit = k.in && fr(e.p) >= d - 1, justNow = k.in && hit && fr(Math.max(0, e.p - dt)) < d - 1;
    const lit = glowK(e.p) * cl(1.25 - d / (R * 1.35));
    items.push({ y: k.y, draw: () => knight(c, k, { flash: justNow, sick: k.in && hit && !justNow, lit: justNow ? 0 : lit, i: e.i }) });
  }
};
const drawItems = (items) => { items.sort((a, b) => a.y - b.y); for (const it of items) it.draw(); };

// ---- light and ground -------------------------------------------------------------------------------
const glow = (c, rad, k) => {                                      // a sickly glow on the ground in fifths, dithered, squashed
  if (k < 0.04) return;
  ringPx(c, rad, (x, y, d) => { if (d > rad) return; const s = Math.ceil(cl(k * (1 - d / rad) * 1.5) * 5) / 5; if (s > 0 && bay(x, y) < s * 0.85) P(c, x, y, s > 0.6 ? SICK : SICK2, 0.5); });
};
const stain = (c, rad, fade, seed = 0) => {                        // wet rot on the ground: blotches, a lit lip, no hard edge
  ringPx(c, rad, (x, y, d) => {
    if (d > rad) return;
    const n = H(Math.floor(x / 2) + seed, Math.floor(y / 2)), m = H(Math.floor(x / 5) + seed, Math.floor(y / 3) + 4);
    if (n >= fade) return;
    if (d > rad - 5) { if (m < 0.55 + 0.3 * (rad - d) / 5) P(c, x, y, ROT[3], 0.9); return; }
    P(c, x, y, m > 0.8 ? ROT[2] : ROT[3], 0.88);
    if (n < 0.05) P(c, x, y, ROT[1], 0.9);
  });
};
const pool = (c, e, from) => {                                     // the game's own pool (fx.js drawGround, kind plague, r 44) handed over to
  const a = cl((e.p - from) / 0.14); if (a <= 0) return;
  c.save(); c.globalAlpha = Math.ceil(a * 4) / 4; c.scale(G.PX || 2, G.PX || 2);
  G.drawGround(c, { kind: "plague", x: 0, y: 0, r: 44, until: 1e6 + 5000 }, 5 + e.i / 4, 1e6); c.restore();
};
const splat = (c, x, y, r, col = ROT[2]) => {                      // a stepped squashed splat: dark lip, mid body, a light spot, one satellite
  const ry = Math.max(1, Math.round(r * SQ));
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx / r, dy / ry); if (d > 1) continue;
    P(c, x + dx, y + dy, d > 0.72 ? ROT[3] : (dx + dy * 2 < -r * 0.3 ? ROT[1] : col));
  }
  P(c, x - Math.round(r * 0.3), y - Math.round(ry * 0.3), ROT[0]);
  if (r >= 3) P(c, x + r + 1, y + 1, ROT[3]);
};
const gob = (c, x, y, s) => {                                      // a gobbet in the air: a lit blob with a dark side
  for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) {
    const d = Math.hypot(dx, dy); if (d > s + 0.3) continue;
    const l = -(dx * 0.6 + dy * 0.8) / Math.max(1, s);
    P(c, x + dx, y + dy, d > s - 0.6 ? (l > 0 ? ROT[2] : ROT[4]) : l > 0.4 ? ROT[0] : l > -0.1 ? ROT[1] : ROT[2]);
  }
};
const dot = (c, x, y, col) => P(c, x, y, col);

// ---- A: a gut-burst -----------------------------------------------------------------------------------
const BA = 0.27;
const GOBS = [];
for (let k = 0; k < 30; k++) { const rim = k < 12; GOBS.push({ a: rim ? (k / 12) * TAU + H(k, 1) * 0.4 : H(k, 2) * TAU, rho: rim ? R * (0.9 + 0.1 * H(k, 3)) : R * (0.2 + 0.65 * H(k, 4)), s: rim ? 4 + (k % 3) : 2 + (k % 3), d: H(k, 5) * 0.12, h: 26 + H(k, 6) * 20 }); }
const frA = (p) => (p < BA ? 0 : R * ease((p - BA) / 0.3));
const gutA = (c, e) => {
  const p = e.p, t = cl((p - BA) / (1 - BA)), fd = 0.3;
  const gl = p < BA ? 0.2 + 0.5 * (p / BA) : Math.max(0.3, 1 - (p - BA) * 1.1);
  glow(c, R * (p < BA ? 0.45 : 0.95), gl * 0.9);
  if (p > BA + 0.02) stain(c, R * 0.9 * ease((p - BA) / 0.4), fadeOf(p, 0.78) * cl((p - BA) / 0.2), 3);
  const items = [];
  // landing marks (where each gobbet will fall) and the splats once it has
  for (const g of GOBS) {
    const u = (t - g.d) / fd, tx = Math.round(Math.cos(g.a) * g.rho), ty = Math.round(Math.sin(g.a) * g.rho * SQ);
    if (u <= 0 || p < BA) continue;
    if (u < 1) {
      if (bay(tx, ty) < 0.5) P(c, tx, ty, ROT[4], 0.7);                                        // a shadow dot where it will land
      const x = Math.round(tx * ease(u)), y = Math.round(ty * ease(u)), z = 4 * g.h * u * (1 - u);
      items.push({ y: ty + 1, draw: () => { gob(c, x, Math.round(y - z), g.s); } });
    } else {
      const age = (t - g.d - fd) / 0.08, r = Math.max(2, Math.round(g.s * (1.2 + 0.9 * ease(age)) + 1));
      if (p < 0.86 || bay(tx, ty) < fadeOf(p, 0.86)) splat(c, tx, ty, r);
    }
  }
  // the ghast: swells and shudders, then goes white and is gone
  if (p < BA) { const q = p / BA; items.push({ y: 0, draw: () => ghast(c, e.i, { sc: 1 + 0.3 * q * q, jx: (e.i & 1 ? 1 : -1) * Math.round(q * 2), glow: 0.1 + 0.25 * q, white: q > 0.85 }) }); if (e.i >= 2) for (let j = 0; j < 3; j++) { const x = (j - 1) * 9, yy = 4 + ((e.i * 3 + j * 5) % 9); items.push({ y: yy, draw: () => P(c, x, yy, ROT[1]) }); } }
  rowKnights(frA, () => gl)(c, e, items);
  drawItems(items);
  pool(c, e, 0.72);
};

// ---- B: a gas cloud -----------------------------------------------------------------------------------
const BB = 0.12;
const PUFFS = [];
for (let k = 0; k < 56; k++) { const rim = k < 16; const rho = rim ? R * (0.88 + 0.1 * H(k, 1)) : R * (0.1 + 0.8 * Math.sqrt(H(k, 2))); PUFFS.push({ a: rim ? (k / 16) * TAU + H(k, 9) * 0.3 : H(k, 3) * TAU, rho, s: rim ? 14 + H(k, 4) * 5 : 11 + H(k, 5) * 8, lift: 2 + H(k, 6) * 9, late: H(k, 7) * 0.08, rim }); }
const frB = (p) => (p < BB ? 0 : R * ease((p - BB) / 0.4));
const puff = (c, x, y, s, fade, k, core, noedge) => {
  const sy = Math.round(s * 0.8);
  for (let dy = -sy; dy <= sy; dy++) for (let dx = -s; dx <= s; dx++) {
    const nx = dx / s, ny = dy / sy, d2 = nx * nx + ny * ny; if (d2 > 1) continue;
    if (fade < 1 && H(Math.floor((x + dx) / 2), Math.floor((y + dy) / 2) + k * 7) >= fade) continue;
    const edge = !noedge && d2 > 1 - 1.8 / s, l = -(nx * 0.6 + ny * 0.8), lump = H(Math.floor((x + dx) / 5), Math.floor((y + dy) / 4) + k) * 0.18;
    let col = l + lump > 0.45 ? ROT[0] : l + lump > 0.0 ? ROT[1] : l + lump > -0.45 ? ROT[2] : ROT[3];
    if (edge) col = l > 0.1 ? ROT[1] : l > -0.3 ? ROT[3] : ROT[4];
    else if (core && d2 < 0.5 && l < 0.3 && H(Math.floor((x + dx) / 3), Math.floor((y + dy) / 3) + k) < 0.55) col = d2 < 0.2 ? SICK : SICK2;   // the sickly light inside
    P(c, x + dx, y + dy, col);
  }
};
const cloudLayer = () => { const cv = document.createElement("canvas"); cv.width = NW.cw; cv.height = NW.ch; const k = cv.getContext("2d"); k.translate(NW.ax, NW.ay); return { cv, k }; };
const outlineLayer = (L) => {                                      // one tinted line round the whole mass, lit on top-left
  const w = NW.cw, h = NW.ch, im = L.k.getImageData(0, 0, w, h), d = im.data, src = new Uint8ClampedArray(d), A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  const hex = (h6) => [parseInt(h6.slice(1, 3), 16), parseInt(h6.slice(3, 5), 16), parseInt(h6.slice(5, 7), 16)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!A(x, y)) continue;
    const up = !A(x, y - 1) || !A(x - 1, y), dn = !A(x, y + 1) || !A(x + 1, y); if (!up && !dn) continue;
    const col = hex(dn ? ROT[4] : ROT[1]), i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  L.k.putImageData(im, 0, 0);
};
const gasB = (c, e) => {
  const p = e.p, fade = fadeOf(p, 0.55), gl = p < BB ? 0.3 : Math.max(0.3, 1 - (p - BB) * 0.9);
  glow(c, R * (p < BB ? 0.4 : 1), gl * 0.9);
  if (p > BB) stain(c, R * 0.92 * ease((p - BB) / 0.35), fadeOf(p, 0.7), 5);
  const items = [], puffs = [];
  for (const q of PUFFS) {
    const tb = BB + 0.34 * (q.rho / R) * 0.9 + q.late, a = p - tb; if (p < BB || a < -0.1) continue;
    const mv = ease((p - BB) / (tb - BB + 0.14)), gr = ease((p - BB) / (tb - BB + 0.2)), s = Math.max(2, Math.round(q.s * gr * (p > 0.55 ? Math.max(0.35, 1 - (p - 0.55) * 1.6) : 1)));
    const x = Math.round(Math.cos(q.a) * q.rho * mv), yb = Math.round(Math.sin(q.a) * q.rho * SQ * mv), y = Math.round(yb - s * 0.5 - q.lift * (1 - 0.4 * (p > 0.6 ? (p - 0.6) * 2.5 : 0)) * ease(a * 6 + 0.2));
    puffs.push({ yb: yb + (q.rim ? 0 : 0.5), draw: (k) => puff(k, x, y, s, 1, q.rim ? 1 : 2, q.rho < R * 0.62, true) });
  }
  puffs.sort((a, b) => a.yb - b.yb);
  const back = cloudLayer(), front = cloudLayer();
  for (const q of puffs) q.draw(q.yb < 20 ? back.k : front.k);
  outlineLayer(back); outlineLayer(front);
  const la = Math.max(0.25, Math.ceil(fade * 4) / 4);
  items.push({ y: -999, draw: () => { c.globalAlpha = la; c.drawImage(back.cv, -NW.ax, -NW.ay); c.globalAlpha = 1; } });
  items.push({ y: 20, draw: () => { c.globalAlpha = la; c.drawImage(front.cv, -NW.ax, -NW.ay); c.globalAlpha = 1; } });
  if (p < BB + 0.04) items.push({ y: 0, draw: () => ghast(c, e.i, { sc: 1.12, white: p > 0.07, glow: 0.3 }) });
  rowKnights(frB, () => gl)(c, e, items);
  drawItems(items);
  pool(c, e, 0.66);
};

// ---- C: a bold blast ----------------------------------------------------------------------------------
const BC = 0.1;
const frC = (p) => (p < BC ? 0 : R * ease((p - BC) / 0.34));
const SPR = [];
for (let k = 0; k < 40; k++) SPR.push({ a: H(k, 1) * TAU, f: 0.3 + 0.65 * H(k, 2), s: k % 4 === 0 ? 4 : k % 3 === 0 ? 3 : k % 2 ? 2 : 1, h: 8 + H(k, 3) * 24, ph: H(k, 4) * 0.3 });
const blastC = (c, e) => {
  const p = e.p, r = frC(p), flash = e.i & 1;
  const gl = p < BC ? 0.3 : Math.max(0.3, 1 - (p - BC) * 1.1);
  glow(c, R * 1.0, gl * 0.9 * (p < BC ? 0.4 : 1));
  if (p >= BC) {
    // the stain the ring leaves: filled as the front passes
    ringPx(c, r, (x, y, d, dep) => {
      if (dep < 2 || d > r) return; const n = H(Math.floor(x / 3), Math.floor(y / 2) + 9), f = fadeOf(p, 0.72);
      if (H(Math.floor(x / 2), Math.floor(y / 2) + 3) < 0.9 * f) P(c, x, y, n > 0.8 ? ROT[2] : ROT[3], 0.88);
    });
    // the ring: a hard, crowned band
    const fd = fadeOf(p, 0.6), th = p < 0.5 ? 8 : 5;
    ringPx(c, r, (x, y, d, dep) => {
      const an = Math.atan2(y / SQ, x), ed = dep + 1.5 * Math.sin(an * 22 + p * 6) * (p < 0.5 ? 1 : 0.5);
      if (ed < -1.6 || ed > th + 14 || r < 2) return;
      if (ed < -0.2) { if (bay(x, y) < fd + 0.1) P(c, x, y, ROT[4]); }
      else if (ed < 0.8) { if (bay(x, y) < fd + 0.1) P(c, x, y, flash ? "#ffffff" : "#fbffc8"); }
      else if (ed < 2.4) { if (bay(x, y) < fd) P(c, x, y, SICK); }
      else if (ed < th - 1) { if (bay(x, y) < fd) P(c, x, y, ed < 3.8 ? ROT[0] : ed < 5.6 ? ROT[1] : ROT[2]); }
      else if (ed < th) { if (bay(x, y) < fd) P(c, x, y, ROT[3]); }
      else if (bay(x, y) < 0.5 * (1 - (ed - th) / 14) * fd && H(x, y) < 0.7) P(c, x, y, ROT[2], 0.7);
    });
    // the reach left marked: a ring of dots at 55 that lingers
    if (p > 0.3) for (let k = 0; k < 44; k++) { const an = (k / 44) * TAU; if (bay(k, 2) < fadeOf(p, 0.5) * cl((p - 0.3) / 0.1)) P(c, Math.cos(an) * R, Math.sin(an) * R * SQ, k % 4 === 0 ? SICK : ROT[1]); }
  }
  const items = [];
  // a column of rot from the ghast at the burst, then the spray behind the front
  if (p >= BC && p < BC + 0.22) for (let j = 0; j < 10; j++) { const u = (p - BC) / 0.22, an = j * 0.63, x = Math.round(Math.cos(an) * 14 * u), z = 40 * u * (1 - u * 0.7) * (0.5 + 0.5 * H(j, 7)); items.push({ y: 4, draw: () => { P(c, x, Math.round(-z + 6 * u), j % 2 ? ROT[0] : ROT[1]); P(c, x + 1, Math.round(-z + 6 * u), ROT[2]); } }); }
  if (p >= BC) for (const q of SPR) {
    const rr = Math.min(r * q.f, R * 0.98), a0 = p - BC - q.ph * 0.2; if (a0 < 0 || rr < 6) continue;
    const x = Math.round(Math.cos(q.a) * rr), yb = Math.round(Math.sin(q.a) * rr * SQ), lf = fadeOf(p, 0.45 + q.ph);
    if (lf <= 0) continue;
    const z = Math.round(q.h * Math.sin(Math.min(1, a0 * 2.2) * Math.PI * 0.9) + 1);
    items.push({ y: yb + 1, draw: () => {
      if (bay(x, yb) < lf) { if (q.s >= 2) { gob(c, x, yb - z, q.s); } else { P(c, x, yb - z, ROT[0]); P(c, x + 1, yb - z, ROT[2]); } }
    } });
  }
  if (p < BC + 0.04) items.push({ y: 0, draw: () => ghast(c, e.i, { sc: p > 0.05 ? 1.25 : 1.1, white: p > 0.05, glow: 0.3 }) });
  rowKnights(frC, () => gl)(c, e, items);
  drawItems(items);
  pool(c, e, 0.74);
};

// ---- D: a swarm of flies -------------------------------------------------------------------------------
const BD = 0.1;
const frD = (p) => (p < BD ? 0 : R * ease((p - BD) / 0.4));
const FLIES = [];
for (let k = 0; k < 44; k++) { const rim = k < 20; FLIES.push({ a: H(k, 1) * TAU, sp: (k % 2 ? 1 : -1) * (3.2 + H(k, 2) * 1.6), rho: rim ? R * (0.92 + 0.08 * H(k, 3)) : R * (0.25 + 0.6 * H(k, 4)), z0: 20 + H(k, 5) * 26, land: 0.6 + H(k, 6) * 0.22, rim, late: H(k, 7) * 0.05 }); }
const flyPos = (f, p) => {
  const t = Math.max(0, p - BD - f.late), rho = f.rho * ease(t / 0.4), an = f.a + f.sp * (t * 1.9);
  const down = ease((t - 0.18) / (f.land - BD - 0.18 + 0.3)), z = Math.max(1, f.z0 * (1 - down) + 2 + Math.sin(t * 60 + f.a * 9) * 1.2);
  return { x: Math.cos(an) * rho, yb: Math.sin(an) * rho * SQ, z };
};
const swarmD = (c, e) => {
  const p = e.p, gl = p < BD ? 0.3 : Math.max(0.28, 0.95 - (p - BD) * 1.0), items = [];
  glow(c, R * (p < BD ? 0.4 : 1), gl * 0.85);
  // splats where flies have dropped to the ground, then a stain joining them
  if (p > BD + 0.1) stain(c, R * 0.9 * ease((p - BD - 0.05) / 0.5), fadeOf(p, 0.74) * cl((p - BD - 0.1) / 0.3) * 0.6, 8);
  for (const f of FLIES) if (p > f.land + BD * 0.5 + f.late) { const q = flyPos(f, f.land + BD * 0.5 + f.late), x = Math.round(q.x), y = Math.round(q.yb); if (p < 0.86 || bay(x, y) < fadeOf(p, 0.86)) splat(c, x, y, f.rim ? 3 : 2); }
  // the reach: a ring of dots dropped as the rim flies arrive, left in the dirt
  if (p > BD + 0.38) for (let k = 0; k < 40; k++) { const an = (k / 40) * TAU; if (bay(k, 3) < fadeOf(p, 0.6) * cl((p - BD - 0.38) / 0.06)) P(c, Math.cos(an) * R, Math.sin(an) * R * SQ, k % 4 ? ROT[2] : ROT[1]); }
  if (p >= BD) {
    // a small puff of rot at the burst
    if (p < BD + 0.26) { const u = (p - BD) / 0.26; for (let j = 0; j < 3; j++) { const x = Math.round((j - 1) * 9 * u), s = Math.max(2, Math.round((7 - j) * (1 - u * 0.5))), y = Math.round(-6 - 14 * u - j * 2); items.push({ y: 3, draw: () => puff(c, x, y, s, 1 - u * 0.4, j) }); } }
    for (const f of FLIES) {
      const q = flyPos(f, p), lift = cl((p - (f.land + BD * 0.5 + 0.1)) / 0.12);
      if (lift >= 1 && p > 0.9) continue;
      const x = Math.round(q.x), yb = Math.round(q.yb), y = Math.round(yb - q.z - lift * 34 * lift);
      items.push({ y: yb + 1, draw: () => {
        const fl = (e.i + f.a * 5) & 1;
        if (q.z > 4 && bay(x, yb) < 0.7) P(c, x, yb, ROT[4], 0.55);                              // its shadow
        for (let n = 1; n <= 2; n++) { const q2 = flyPos(f, p - n * 0.018), tx = Math.round(q2.x), ty = Math.round(q2.yb - q2.z); if (bay(tx + n, ty) < 0.6 - n * 0.2) P(c, tx, ty, "#3a4030", 0.7); }   // a smear of path behind it
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) P(c, x + ox, y + oy, ox + oy === 0 ? "#4a5040" : "#1c2018");
        const wy = fl ? -2 : -1; P(c, x - 1, y + wy, "#e4f4e4"); P(c, x - 2, y + wy + 1, "#b8d0c8"); P(c, x + 2, y + wy, "#e4f4e4"); P(c, x + 3, y + wy + 1, "#b8d0c8");
      } });
    }
  }
  if (p < BD + 0.02) items.push({ y: 0, draw: () => ghast(c, e.i, { sc: 1.1, white: p > 0.05, glow: 0.3, jx: e.i & 1 ? 1 : -1 }) });
  rowKnights(frD, () => gl)(c, e, items);
  drawItems(items);
  pool(c, e, 0.74);
};

// ---- TODAY: the game's own painters (rings.js plagueburst, fx.js pool) at the same cell ------------------
const todayPlague = (c, e) => {
  const PXu = G.PX || 2, bp = 0.07, p = e.p, items = [];
  const burst = p >= bp ? { type: "plagueburst", x: 0, y: 0, r: 55, life: 1400, ttl: 1400 * (1 - (p - bp) / (1 - bp)) * 1 } : null;
  const W = (fn) => { c.save(); c.scale(PXu, PXu); fn(); c.restore(); };
  if (p >= bp) { c.save(); c.scale(PXu, PXu); G.drawGround(c, { kind: "plague", x: 0, y: 0, r: 44, until: 1e6 + 5000 }, 5 + e.i / 4, 1e6); c.restore(); }
  if (burst) W(() => G.drawRingFx(c, burst, 1, {}, "g"));
  if (p < bp) items.push({ y: 0, draw: () => ghast(c, e.i) });
  const fr = (q) => (q < bp ? 0 : R * Math.min(1, ease((q - bp) / (1 - bp)) * 1.2));
  for (const k of KN) { const d = ell(k.x, k.y); items.push({ y: k.y, draw: () => knight(c, k, { flash: k.in && fr(p) >= d - 1 && fr(p - 1 / 13) < d - 1, sick: false, lit: 0, i: e.i }) }); }
  drawItems(items);
  if (burst) W(() => G.drawRingFx(c, burst, 1, {}, "a"));
};

export const ROWS = [{
  id: "plague7", label: "Plague Ghast burst (round 7)", group: "Round 7", ...NW, today: todayPlague,
  note: "The Plague Ghast's death burst at TRUE scale (reach 55 world units = 110 art px, 0.55 tall), 1400 ms: the ghast at the centre, a knight just inside the reach (48 units, scalded: a white flash as the wave reaches him, then sickly green with drips) and one just outside (60, untouched, only the light reaches him). All four options end by handing over to the game's own pool (44), faded in from about 70% of the effect; the game lays that pool at the very moment of death, so these would need it held back (or drawn under the stain) in the engine. Light painted as addLight would: a dithered sickly glow on the ground and a 1-px lit rim on the knights' near sides, in fifths. A: gut-burst, the ghast swells and shudders, then splits and throws gobbets in arcs (a dot marks each landing), splats join into the stain; a ring of big splats lands on the rim. B: gas cloud, lumpy stepped puffs roll out to the reach with sickly light inside, then thin and settle. C: bold blast, a hard crowned ring (flashing white and yellow) races to the reach, a spray behind it, a stain left and a ring of dots to mark 55. D: a swarm of flies bursts from the ghast, spirals out (half reach the rim), drops to land as splats, then lifts away.",
  A: gutA, B: gasB, C: blastC, D: swarmD,
}];
