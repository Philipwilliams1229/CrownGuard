// Effects concepts, Round 8: variations on the Plague Ghast's burst (row burst8). See art/briefs/fx-round8.md.
// Painters get (c, e): c is a cell canvas translated to (ax, ay) = the dying ghast's centre, 1 unit = 1 art px, e.p 0..1 over 900 ms.
// The engine's timing holds for every option: the split at 220 ms, the rim (110 art px = 55 units) reached at 520 ms, nothing left at 900 ms.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/rings.js")), ...(await import("/src/render/paint.js")), ...(await import("/src/render/rigs.js")) } : {};

const TAU = Math.PI * 2, SQ = 0.55, R = 110, LIFE = 900, SWELL = 220, FLY = 300, BODY = -2;
const ROT = ["#d8e8a0", "#a8c46e", "#76944a", "#4e6634", "#34442a"];
const SICK = "#e8f070", SICK2 = "#c8e040";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - (1 - cl(t)) * (1 - cl(t));
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const NW = { cw: 250, ch: 180, ax: 125, ay: 106, N: 14 };
const KN = [{ x: -84, y: 26, flip: false, in: true }, { x: 110, y: 26, flip: true, in: false }];
const ell = (x, y) => Math.hypot(x, y / SQ);

// ---- the two knights (as Round 7): one inside the reach, scalded as the front reaches him, one outside --------------------------
const tinted = (cv, col, a) => { const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height; const k = t.getContext("2d"); k.drawImage(cv, 0, 0); k.globalCompositeOperation = "source-atop"; k.globalAlpha = a; k.fillStyle = col; k.fillRect(0, 0, t.width, t.height); return t; };
const knight = (c, k, st) => {
  const s = G.rigFrame("knight", "walk", 0, st.flash ? "white" : ""), PXu = G.PX || 2, ax = Math.round(s.ax * PXu), ay = Math.round(s.ay * PXu);
  c.save(); c.translate(k.x, k.y); if (k.flip) c.scale(-1, 1);
  if (st.flash) { c.globalAlpha = 0.9; c.drawImage(s.cv, -ax, -ay); }
  else {
    c.drawImage(s.cv, -ax, -ay);
    if (st.sick) { c.globalAlpha = 0.22; c.drawImage(tinted(s.cv, SICK2, 1), -ax, -ay); c.globalAlpha = 1; }
    else if (st.lit > 0) { c.globalAlpha = 0.25 * st.lit; c.drawImage(tinted(s.cv, SICK2, 1), -ax, -ay); }
  }
  c.globalAlpha = 1; c.restore();
  if (st.sick && !st.flash) for (let j = 0; j < 3; j++) P(c, k.x + (k.flip ? 1 : -1) * (3 + j * 4), k.y + 14 + ((st.i + j * 3) % 7), ROT[1]);
};
const front = (ms) => (ms < SWELL ? 0 : R * cl((ms - SWELL) / FLY));      // the damage front, art px: the engine's own timing
const addKnights = (c, e, ms, items, gl) => {
  const dt = LIFE / (NW.N - 1);
  for (const k of KN) {
    const d = ell(k.x, k.y), hit = k.in && front(ms) >= d - 1, justNow = hit && front(ms - dt) < d - 1;
    items.push({ y: k.y, draw: () => knight(c, k, { flash: justNow, sick: hit && !justNow, lit: justNow ? 0 : gl * cl(1.25 - d / (R * 1.35)), i: e.i }) });
  }
};

// ---- light, swell, splats (the game's own, ported from rings.js gb*) ---------------------------------------------------------------
const glow = (c, rad, k) => {
  if (k < 0.04) return;
  const m = Math.ceil(rad + 2), my = Math.ceil((rad + 2) * SQ);
  for (let y = -my; y <= my; y++) for (let x = -m; x <= m; x++) {
    const d = Math.hypot(x + 0.5, (y + 0.5) / SQ); if (d > rad) continue;
    const st = Math.ceil(cl(k * (1 - d / rad) * 1.5) * 5) / 5;
    if (st > 0 && bay(x & 1023, y & 1023) < st * 0.85) P(c, x, y, st > 0.6 ? SICK : SICK2, 0.5);
  }
};
const glowK = (ms) => { const fadeT = cl((ms - (LIFE - 220)) / 220); return (ms < SWELL ? 0.2 + 0.5 * (ms / SWELL) : Math.max(0, 0.95 - (ms - SWELL) / (LIFE - SWELL))) * (1 - fadeT * 0.5) * 0.9 * (1 - fadeT); };
const swellBlob = (c, ms) => {                                  // today's lumpy swell on the body, then the white flash at the split
  if (ms < SWELL) {
    const q = ms / SWELL, w = ms / 55, grow = 1 + 0.4 * q * q, sx = 11 * grow, sy = 13 * grow, white = q > 0.8;
    const jx = q > 0.25 ? (Math.floor(ms / 28) & 1 ? 1 : -1) * Math.round(q * 1.5) : 0;
    const rad = (an) => 1 + (0.06 + 0.12 * q) * (Math.sin(3 * an + w * 1.3) + 0.8 * Math.sin(5 * an - w * 1.9 + 1) + 0.6 * Math.sin(2 * an + w * 0.8 + 2));
    const m = Math.ceil(Math.max(sx, sy) * 1.5);
    for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
      const an = Math.atan2(y / sy, x / sx), nx = x / sx, ny = y / sy, d = Math.hypot(nx, ny) / rad(an); if (d > 1) continue;
      const l = -(nx * 0.6 + ny * 0.8) / Math.max(0.5, Math.hypot(nx, ny)), nz = H(Math.floor(x / 3) + 5, Math.floor(y / 3) + Math.floor(ms / 90));
      let col;
      if (white) col = d > 0.82 ? SICK2 : (nz < 0.7 ? "#ffffff" : "#fbffc8");
      else if (d > 0.84) col = l > 0.15 ? ROT[0] : l > -0.3 ? ROT[2] : ROT[4];
      else if (nz < 0.3) col = ROT[3];
      else if (nz > 0.86 && q > 0.3) col = SICK2;
      else col = l > 0.35 ? ROT[1] : l > -0.2 ? ROT[2] : ROT[3];
      P(c, x + jx, y + BODY, col);
    }
  } else if (ms - SWELL < 70) {
    const t = ms - SWELL, q = 1 - t / 70, rr = Math.round(12 + 10 * (1 - q));
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y * 1.1); if (d <= rr && H(x, y) < q * 1.1) P(c, x, y + BODY, d < rr * 0.6 ? "#ffffff" : SICK); }
  }
};
const splat = (c, x, y, r) => {
  const ry = Math.max(1, Math.round(r * SQ));
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx / r, dy / ry); if (d > 1) continue;
    P(c, x + dx, y + dy, d > 0.72 ? ROT[3] : (dx + dy * 2 < -r * 0.3 ? ROT[1] : ROT[2]));
  }
  P(c, x - Math.round(r * 0.3), y - Math.round(ry * 0.3), ROT[0]);
  if (r >= 3) P(c, x + r + 1, y + 1, ROT[3]);
};
const gob = (c, x, y, s) => {
  if (s <= 1) { P(c, x, y, ROT[1]); if (s === 1) P(c, x + 1, y, ROT[3]); return; }
  for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) {
    const d = Math.hypot(dx, dy); if (d > s + 0.3) continue;
    const l = -(dx * 0.6 + dy * 0.8) / Math.max(1, s);
    P(c, x + dx, y + dy, d > s - 0.6 ? (l > 0 ? ROT[2] : ROT[4]) : l > 0.4 ? ROT[0] : l > -0.1 ? ROT[1] : ROT[2]);
  }
};
const fadeAt = (ms) => cl((ms - 680) / 220);                    // splats thin out by dither over the last 220 ms
const alive = (fade, x, y) => fade === 0 || bay(x & 1023, y & 1023) > fade;
const landT = (o) => SWELL + (o.d || 0) + o.dur;                // when a thing lands
const durOf = (rho, k = 1) => Math.max(36, FLY * (rho / R) * k);
const pos = (o, u, e0 = ease(u)) => ({ x: Math.cos(o.a) * o.rho * e0, y: BODY * (1 - e0) + Math.sin(o.a) * o.rho * SQ * e0 - 4 * o.h * u * (1 - u) });
const tgt = (o) => [Math.round(Math.cos(o.a) * o.rho), Math.round(Math.sin(o.a) * o.rho * SQ)];

// shared frame: ground first (glow, then whatever `ground` paints), then the y-sorted air items with the knights
const frame = (c, e, ground, air) => {
  const ms = e.p * LIFE, items = [];
  glow(c, R * (ms < SWELL ? 0.45 : 0.95), glowK(ms));
  if (ms >= SWELL) ground(c, ms);
  if (ms >= SWELL) air(c, ms, items);
  items.push({ y: BODY + 40, draw: () => swellBlob(c, ms) });
  addKnights(c, e, ms, items, glowK(ms));
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
};

// ---- A: heavy falls close (the sizes the right way round) ---------------------------------------------------------------------------
const GA = [];
for (let k = 0; k < 4; k++) GA.push({ a: (k / 4) * TAU + 0.5 + H(k, 1) * 0.5, rho: R * (0.17 + 0.2 * H(k, 2)), s: 6 - (k & 1), h: 12 + H(k, 3) * 6, big: 1 });
for (let k = 0; k < 8; k++) GA.push({ a: (k / 8) * TAU + 0.2 + H(k, 4) * 0.3, rho: R * (0.46 + 0.26 * H(k, 5)), s: 3 + (k & 1), h: 22 + H(k, 6) * 8 });
for (let k = 0; k < 44; k++) GA.push({ a: (k / 44) * TAU + H(k, 7) * 0.12, rho: R * (0.78 + 0.22 * H(k, 8)), s: k % 4 === 0 ? 2 : 1, h: 30 + H(k, 9) * 16, fleck: 1 });
for (const o of GA) o.dur = durOf(o.rho, o.big ? 1.6 : 1);
const groundA = (c, ms) => {
  const fade = fadeAt(ms);
  for (const o of GA) {
    const [tx, ty] = tgt(o), age = (ms - landT(o)) / 80; if (age < 0) continue;
    if (!alive(fade, tx, ty)) continue;
    if (o.fleck) { P(c, tx, ty, ROT[2]); P(c, tx + 1, ty, ROT[3]); P(c, tx, ty + 1, ROT[3]); if (o.s > 1) { P(c, tx - 1, ty, ROT[2]); P(c, tx + 2, ty + 1, ROT[3]); } if (H(o.a, 4) < 0.6) P(c, tx + Math.round(Math.cos(o.a) * 3), ty + Math.round(Math.sin(o.a) * 2), ROT[3]); }   // a fine spatter
    else splat(c, tx, ty, Math.max(2, Math.round(o.s * (1.2 + 0.9 * ease(age)) + 1)));
  }
};
const airA = (c, ms, items) => {
  for (const o of GA) {
    const u = (ms - landT(o) + o.dur) / o.dur; if (u < 0 || u >= 1) continue;
    const [tx, ty] = tgt(o), q = pos(o, u);
    if (!o.fleck && bay(tx & 1023, ty & 1023) < 0.5) P(c, tx, ty, ROT[4], 0.7);
    items.push({ y: ty + 1, draw: () => gob(c, Math.round(q.x), Math.round(q.y), o.s) });
  }
};

// ---- B: streaked splatter (a hard splash: tails point back toward the centre) ------------------------------------------------------
const GB2 = [];
for (let k = 0; k < 11; k++) GB2.push({ a: (k / 11) * TAU + H(k, 1) * 0.35, rho: R * (0.9 + 0.1 * H(k, 2)), s: 4 + (k & 1), h: 14 + H(k, 3) * 8 });
for (let k = 0; k < 9; k++) GB2.push({ a: (k / 9) * TAU + 0.3 + H(k, 4) * 0.4, rho: R * (0.35 + 0.4 * H(k, 5)), s: 3 + (k % 3 === 0 ? 1 : 0), h: 14 + H(k, 6) * 10 });
for (const o of GB2) o.dur = durOf(o.rho, 0.95);
const streak = (c, x, y, o, age) => {
  const dx = Math.cos(o.a), dy = Math.sin(o.a) * SQ, L = Math.round((7 + o.s * 3) * (0.5 + 0.5 * ease(age)) * (0.6 + 0.4 * o.rho / R)), r = Math.max(3, o.s);
  for (let k = L; k >= 1; k--) {                                // the tail, wide near the blob, thinning to a dotted end
    const w = k < L * 0.6 ? 1 : 0, px = x - dx * k, py = y - dy * k;
    if (k > L * 0.6 && H(k, o.a * 9) < 0.45) continue;
    P(c, px, py, k < 4 ? ROT[2] : ROT[3]); if (w) { P(c, px, py + 1, ROT[3]); P(c, px + 1, py, ROT[3]); }
  }
  const rx = r + 1, ry = Math.max(1, Math.round(r * 0.55));       // the blob: longer along the throw
  for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) { const d = Math.hypot(xx / rx, yy / ry); if (d > 1) continue; P(c, x + xx, y + yy, d > 0.7 ? ROT[3] : (xx + yy * 2 < -1 ? ROT[1] : ROT[2])); }
  P(c, x - 1, y - 1, ROT[0]); P(c, x + Math.round(dx * (rx + 2)), y + Math.round(dy * (rx + 2)), ROT[3]); P(c, x + Math.round(dx * (rx + 5)), y + Math.round(dy * (rx + 4)) - 1, ROT[3]);
};
const groundB = (c, ms) => { const fade = fadeAt(ms); for (const o of GB2) { const [tx, ty] = tgt(o), age = (ms - landT(o)) / 90; if (age >= 0 && alive(fade, tx, ty)) streak(c, tx, ty, o, age); } };
const airB = (c, ms, items) => {
  for (const o of GB2) {
    const u = (ms - landT(o) + o.dur) / o.dur; if (u < 0 || u >= 1) continue;
    const q = pos(o, u), q0 = pos(o, Math.max(0, u - 0.12));
    items.push({ y: tgt(o)[1] + 1, draw: () => {
      for (let n = 1; n <= 6; n++) { const f = n / 6, px = q.x + (q0.x - q.x) * f, py = q.y + (q0.y - q.y) * f; if (bay(Math.floor(px) + n, Math.floor(py)) < 0.9 - f * 0.6) P(c, px, py, f < 0.5 ? ROT[1] : ROT[3]); }   // a streak behind it
      gob(c, Math.round(q.x), Math.round(q.y), o.s);
    } });
  }
};

// ---- C: a spray burst (a quick dark splash, fine droplets across almost flat, a few chunks tumbling) -----------------------------
const GC = [], CH = [];
for (let k = 0; k < 96; k++) { const rim = k < 40; GC.push({ a: (k / 96) * TAU * 2.4 + H(k, 1) * 0.5, rho: R * (rim ? 0.92 + 0.08 * H(k, 2) : 0.3 + 0.62 * H(k, 3)), s: k % 11 === 0 ? 1 : 0, h: 3 + H(k, 4) * 9, d: H(k, 5) * 28 }); }
for (const o of GC) o.dur = durOf(o.rho, 0.82);
for (let k = 0; k < 4; k++) CH.push({ a: (k / 4) * TAU + 0.5 + H(k, 6) * 0.6, rho: R * (0.22 + 0.2 * H(k, 7)), s: 5 - (k & 1), h: 16 + H(k, 8) * 6, d: 0 });
for (const o of CH) o.dur = durOf(o.rho, 1.5);
const dark = (c, ms) => {                                       // the quick dark splash at the centre: a ragged starburst that spreads, then thins
  const t = ms - SWELL, q = cl(t / 90), fd = cl((t - 150) / 220); if (q <= 0 || fd >= 1) return;
  const r = 6 + 20 * ease(q);
  for (let y = -Math.ceil(r * SQ) - 1; y <= Math.ceil(r * SQ) + 1; y++) for (let x = -Math.ceil(r) - 2; x <= Math.ceil(r) + 2; x++) {
    const an = Math.atan2(y / SQ, x), d = Math.hypot(x, y / SQ), spike = r * (0.62 + 0.55 * Math.pow(Math.abs(Math.sin(an * 4.5 + 0.7)), 2.5) * (0.6 + 0.8 * H(Math.round(an * 4.5 / Math.PI), 3)));
    if (d > spike || !alive(fd, x, y)) continue;
    P(c, x, y, d > spike - 2 ? ROT[4] : (d > spike * 0.55 ? ROT[3] : ROT[2]));
    if (d < spike * 0.3 && H(x, y) < 0.3) P(c, x, y, ROT[1]);
  }
};
const groundC = (c, ms) => {
  dark(c, ms);
  const fade = fadeAt(ms);
  for (const o of GC) {                                         // a droplet's dot: short-lived, gone 130 ms after it lands
    const age = ms - landT(o) - o.d; if (age < 0 || age > 130) continue;
    const [tx, ty] = tgt(o); if (bay(tx + 1, ty) < 1 - age / 130) { P(c, tx, ty, age < 40 ? ROT[1] : ROT[3]); P(c, tx + 1, ty, ROT[3]); if (o.s) { P(c, tx, ty + 1, ROT[2]); P(c, tx + 2, ty, ROT[3]); } }
  }
  for (const o of CH) { const [tx, ty] = tgt(o), age = (ms - landT(o)) / 80; if (age >= 0 && alive(fade, tx, ty)) splat(c, tx, ty, Math.max(2, Math.round(o.s * (1.1 + 0.8 * ease(age))))); }
};
const airC = (c, ms, items) => {
  for (const o of GC) {
    const u = (ms - SWELL - o.d) / o.dur; if (u < 0 || u >= 1) continue;
    const q = pos(o, u, u), q1 = pos(o, Math.max(0, u - 0.06), Math.max(0, u - 0.06));
    items.push({ y: tgt(o)[1] + 1, draw: () => { P(c, q.x, q.y, ROT[0]); P(c, q.x + 1, q.y, ROT[1]); P(c, q.x, q.y + 1, ROT[2]); P(c, q.x + 1, q.y + 1, ROT[3]); P(c, q1.x, q1.y, ROT[3], 0.8); P(c, q1.x - 1, q1.y, ROT[3], 0.5); } });
  }
  for (const o of CH) {
    const u = (ms - SWELL) / o.dur; if (u < 0 || u >= 1) continue;
    const q = pos(o, u), tum = Math.floor(u * 9);
    items.push({ y: tgt(o)[1] + 1, draw: () => { gob(c, Math.round(q.x), Math.round(q.y), o.s); P(c, q.x + (tum & 1 ? 2 : -2), q.y - 2 + (tum & 2 ? 1 : 0), ROT[0]); } });   // a glint that turns as it tumbles
  }
};

// ---- D: bounce and burst, then a crisp ring of droplets drawn at the reach ------------------------------------------------------
const GD = [];
for (let k = 0; k < 10; k++) GD.push({ a: (k / 10) * TAU + H(k, 1) * 0.4, rho: R * (0.34 + 0.34 * H(k, 2)), s: 4 + (k & 1), h: 24 + H(k, 3) * 10, kids: 5 });
for (const o of GD) { o.dur = durOf(o.rho, 0.9); o.kid = []; for (let j = 0; j < o.kids; j++) { const ka = o.a + (j - 2) * 0.42 + H(o.a, j) * 0.2, hop = 11 + 8 * H(j, o.a); o.kid.push({ ka, hop, hh: 7 + 6 * H(o.a, j + 4) }); } }
const KID_MS = 150, RING_AT = SWELL + FLY;
const RING = []; for (let k = 0; k < 48; k++) RING.push({ a: (k / 48) * TAU + 0.02, big: k % 4 === 0 });
const kidAt = (o, kd, ms) => { const u = (ms - landT(o)) / KID_MS; if (u < 0 || u >= 1) return null; const [tx, ty] = tgt(o); return { x: tx + Math.cos(kd.ka) * kd.hop * ease(u), y: ty + Math.sin(kd.ka) * kd.hop * SQ * ease(u) - 4 * kd.hh * u * (1 - u), u }; };
const groundD = (c, ms) => {
  const fade = fadeAt(ms);
  for (const o of GD) {
    const [tx, ty] = tgt(o), age = (ms - landT(o)) / 80; if (age < 0) continue;
    if (alive(fade, tx, ty)) splat(c, tx, ty, Math.max(2, Math.round(o.s * (0.9 + 0.5 * ease(age)))));
    for (const kd of o.kid) { const u = (ms - landT(o)) / KID_MS; if (u >= 1) { const x = Math.round(tx + Math.cos(kd.ka) * kd.hop), y = Math.round(ty + Math.sin(kd.ka) * kd.hop * SQ); if (alive(fade, x, y)) { P(c, x, y, ROT[3]); P(c, x + 1, y, ROT[2]); P(c, x, y + 1, ROT[3]); P(c, x + 1, y + 1, ROT[4]); } } }
  }
  if (ms >= RING_AT - 10) for (const r of RING) {               // the reach, marked: a ring of dots snapped on at the rim, a flash first, then fading
    const x = Math.round(Math.cos(r.a) * R), y = Math.round(Math.sin(r.a) * R * SQ), age = ms - RING_AT;
    if (!alive(fade, x, y)) continue;
    P(c, x, y, age < 60 ? SICK : ROT[1]); P(c, x + 1, y, age < 60 ? SICK2 : ROT[2]); P(c, x, y + 1, ROT[3]); if (r.big) P(c, x + 1, y + 1, ROT[3]);
  }
};
const airD = (c, ms, items) => {
  for (const o of GD) {
    const u = (ms - landT(o) + o.dur) / o.dur, [tx, ty] = tgt(o);
    if (u >= 0 && u < 1) { if (bay(tx & 1023, ty & 1023) < 0.5) P(c, tx, ty, ROT[4], 0.7); const q = pos(o, u); items.push({ y: ty + 1, draw: () => gob(c, Math.round(q.x), Math.round(q.y), o.s) }); }
    for (const kd of o.kid) { const q = kidAt(o, kd, ms); if (q) items.push({ y: q.y + 6, draw: () => { P(c, q.x, q.y, ROT[0]); P(c, q.x + 1, q.y, ROT[1]); P(c, q.x, q.y + 1, ROT[2]); P(c, q.x + 1, q.y + 1, ROT[3]); } }); }
  }
  if (ms > RING_AT - 70 && ms < RING_AT) for (const r of RING) { const u = (ms - (RING_AT - 70)) / 70, x = Math.cos(r.a) * R, y = Math.sin(r.a) * R * SQ - 12 * (1 - u) * (1 - u) * 0 - 10 * (1 - u); items.push({ y: y + 1, draw: () => { P(c, x, y, ROT[0]); P(c, x + 1, y, ROT[1]); P(c, x, y + 1, ROT[2]); } }); }   // the ring's drops fall in the last 70 ms
};

// ---- TODAY: the game's own plagueburst as it is now ------------------------------------------------------------------------------
const today = (c, e) => {
  const PXu = G.PX || 2, ms = e.p * LIFE, items = [];
  const fx = { type: "plagueburst", x: 0, y: 0, r: 55, life: LIFE, ttl: LIFE * (1 - e.p), swell: SWELL, fly: FLY, face: 1 };
  c.save(); c.scale(PXu, PXu); G.drawRingFx(c, fx, 1, {}, "g"); c.restore();
  addKnights(c, e, ms, items, glowK(ms));
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  c.save(); c.scale(PXu, PXu); G.drawRingFx(c, fx, 1, {}, "a"); c.restore();
};

export const ROWS = [{
  id: "burst8", label: "Plague Ghast burst (round 8)", group: "Round 8", ...NW, today,
  note: "Variations on the Plague Ghast's burst at TRUE scale (reach 55 units = 110 art px, 0.55 tall), 900 ms, the engine's timing kept: the swell and white flash at 220 ms, the rim reached at 520 ms, nothing left at 900 ms. One knight inside the reach (48 units, scalded as the front reaches him) and one outside. TODAY is the game as it is: gobbets biggest at the rim. A: heavy falls close, the sizes the right way round: five big gobbets drop near the middle on short low arcs, nine middling ones mid-way, and only a fine spatter of flecks reaches the rim. B: streaked splatter, fewer, each splat a blob with a tail pointing back toward the centre, and the gobbets in flight leave a streak. C: a spray burst, a quick dark ragged splash at the centre, 96 fine droplets flung almost flat to the rim that vanish a moment after landing, and four chunks that tumble a short way. D: gobbets bounce and burst into five droplets each as they land, then a crisp ring of droplets snaps onto the rim at 520 ms (the reach), and all of it fades.",
  A: (c, e) => frame(c, e, groundA, airA), B: (c, e) => frame(c, e, groundB, airB), C: (c, e) => frame(c, e, groundC, airC), D: (c, e) => frame(c, e, groundD, airD),
}];
