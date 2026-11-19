// Round 5 concepts (raise): see art/briefs/fx-round5.md. Owned by the raise artist.
// Row raise5: the risen goblin climbs out, the violet / green spiral COILS AROUND him: every strand point has an
// angle, and the half with sin(angle) >= 0 (nearer the viewer) is drawn after the figure, the rest before it.
// Painters get (c, e): c is translated to the foot (ax, ay), 1 unit = 1 art pixel. Game modules load only in a browser.
const BR = typeof document !== "undefined";
const GM = BR ? { ...(await import("/src/render/rings.js")), ...(await import("/src/render/paint.js")) } : {};

const TAU = Math.PI * 2;
const VIOLET = ["#e4d0fc", "#b890e8", "#8a64c8", "#5a3a8a", "#2e1e44"];
const GREEN = ["#e8f8c0", "#a8e070", "#7cc85c", "#4a8a3c", "#2e5a2e"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const step = (a, n = 5) => Math.ceil(cl(a) * n) / n;
const px = (c, x, y, col, s = 1, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.round(x - (s > 1 ? s / 2 : 0)), Math.round(y - (s > 1 ? s / 2 : 0)), s, s); c.globalAlpha = 1; };
const U = () => GM.PX || 2;                 // art px per world unit (today's numbers are world units)

// ---- shared: the game's ground layer, the figure rising, today's flash ---------------------------------------------
const LIFE = 1400;
const fxOf = (e) => ({ type: "raise", x: 0, y: 0, life: LIFE, ttl: LIFE * (1 - e.p) });
const ground = (c, e) => { const u = U(); c.save(); c.scale(u, u); GM.drawRingFx(c, fxOf(e), 1, {}, "g"); c.restore(); };
const frac = (e) => cl((e.p - 0.2) / 0.6);
// the risen goblin: bone-pale, clipped at the ground, lifted (today's lab does exactly this); `rim` lights its edges
const figure = (c, e, rim, white) => {
  const s = e.foe(0, white ? "white" : "revived"), dy = Math.round((1 - frac(e)) * (e.T + 4));
  const tc = document.createElement("canvas"); tc.width = e.cw; tc.height = e.ch;
  const t = tc.getContext("2d"); t.imageSmoothingEnabled = false; t.translate(e.ax, e.ay);
  t.save(); t.beginPath(); t.rect(-e.ax, -e.ay, e.cw, e.ay + 1); t.clip(); t.drawImage(s.cv, -s.ax, -s.ay + dy); t.restore();
  if (rim && rim > 0) {
    const w = e.cw, h = e.ch, id = t.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d), gy = e.ay;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      const up = !solid(x, y - 1), lf = !solid(x - 1, y), rt = !solid(x + 1, y), dn = !solid(x, y + 1) && y < gy;
      const near = cl(1 - (gy - y) / 18);                      // light thrown up from the grave: stronger low down
      let col = null, k = 0;
      if (up || lf || rt || dn) { col = ((x + y + e.i) % 3 === 0 || y > gy - 8) ? GREEN[1] : VIOLET[1]; k = 0.55 + 0.45 * near; if (up) col = VIOLET[0]; }
      else if (near > 0.1 && bay(x, y) < near * 0.55 * rim) { col = (x + e.i) % 2 ? GREEN[2] : VIOLET[2]; k = 0.5; }
      if (!col) continue;
      const m = parseInt(col.slice(1), 16), r = m >> 16, g = (m >> 8) & 255, b = m & 255, i = (y * w + x) * 4, kk = k * Math.min(1, rim);
      o[i] = d[i] + (r - d[i]) * kk; o[i + 1] = d[i + 1] + (g - d[i + 1]) * kk; o[i + 2] = d[i + 2] + (b - d[i + 2]) * kk;
    }
    id.data.set(o); t.putImageData(id, 0, 0);
  }
  c.drawImage(tc, -e.ax, -e.ay);
};
// a stepped glow pool lying on the ground (ellipse, dithered between fifths)
const pool = (c, rx, str, inner, outer) => {
  const ry = rx * 0.5;
  for (let y = -Math.ceil(ry) - 1; y <= Math.ceil(ry) + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
    const d = Math.hypot(x / rx, y / ry); if (d >= 1) continue;
    const lv = (1 - d) * 4 * str, f = Math.floor(lv), a = (f + (lv - f > bay(x + 99, y + 99) ? 1 : 0)) / 5;
    if (a <= 0) continue; px(c, x, y + 6, d < 0.45 ? inner : outer, 1, Math.min(0.3, a));
  }
};
// plot a batch of strand points, the half in front (sin an >= 0) or behind
const plot = (c, pts, front) => { for (const q of pts) if ((Math.sin(q.an) >= 0) === front) px(c, q.x, q.y, q.col, q.sz || 1, q.a == null ? 1 : q.a); };

// ---- A: today's spiral, split --------------------------------------------------------------------------------------
// the same maths as rings.js (10 strands, 3 trails, angle t*10 + i*TAU/10, radius 11 * (1 - 0.65 t), rise 30 world units)
// today's ribbon, in art px: dots 3 / trail 2 / highlight 1, violet two thirds of the strands, green the rest, three trails close together.
// opts: n strands, dt, p0 (time base), an(t, i), rad(t) art px, rise art px, cols [violet, green]
const ribbon = (o) => {
  const out = [];
  for (let i = 0; i < o.n; i++) for (let tr = 0; tr < 3; tr++) {
    const t = o.p * (o.k || 1.4) - i * o.dt - tr * 0.025; if (t < 0 || t > 1) continue;
    const an = o.an(t, i), rad = o.rad(t), x = Math.cos(an) * rad, y = Math.sin(an) * rad * 0.45 - t * o.rise + 4;
    const g = o.green(i);
    out.push({ x, y, an, col: tr ? VIOLET[3] : g ? GREEN[2] : VIOLET[1], sz: tr ? 2 : 3, a: tr ? 0.8 : 1 });
    if (!tr && !g) out.push({ x: x - 0.5, y: y - 0.5, an, col: VIOLET[0], sz: 1 });
    if (!tr && g && i % 2) out.push({ x: x - 0.5, y: y - 0.5, an, col: GREEN[0], sz: 1 });
  }
  return out;
};
const RAD = (t) => 19 - 4 * t;                    // clears the goblin (half-width 13.5) by 3+, a little wider low
const spiralA = (e) => ribbon({ p: e.p, n: 10, dt: 0.05, an: (t, i) => t * 10 + i * (TAU / 10), rad: RAD, rise: 44, green: (i) => i % 3 === 0 });
const flash = (c, e, p0 = 0, p1 = 0.3) => {            // a stepped violet ring at the foot as the grave opens
  if (e.p > p1) return; const k = cl((e.p - p0) / (p1 - p0)), r = 6 + k * 16;
  for (let a = 0; a < TAU; a += 0.09) px(c, Math.cos(a) * r, Math.sin(a) * r * 0.5 + 4, k < 0.5 ? VIOLET[1] : VIOLET[2], 1, step(1 - k, 4));
};
const A = (c, e) => {
  ground(c, e); flash(c, e);
  const s = spiralA(e); plot(c, s, false);
  figure(c, e, 0);
  plot(c, s, true);
  if (e.i % 2 === 0) px(c, Math.sin(e.p * 14) * 6 * U() / 2, -12 * U() - e.p * 14 * U(), VIOLET[1], 2);   // the spark above
};

// ---- B: richer: three strands, thick at the foot, a witch-fire ring, motes ----------------------------------------------
const spiralB = (e) => {
  const u = U(), p = e.p, out = [];
  for (let s = 0; s < 3; s++) out.push(...ribbon({ p: e.p, k: 1.5, n: 7, dt: 0.07, an: (t, i) => t * 9 + s * (TAU / 3) + i * 0.45, rad: (t) => RAD(t) - (s === 1 ? 2 : 0), rise: 44 + s * 3, green: () => s === 1 }));
  for (let k = 0; k < 10; k++) {                       // motes spun off the top: they leave along the tangent
    const q = ((p * 1.6 - k * 0.07) % 1 + 1) % 1; if (p < 0.4 || p * 1.6 - k * 0.07 < 0) continue;
    const an = k * 2.4 + p * 9, t = 0.9, rad = RAD(t) + q * 12;
    out.push({ x: Math.cos(an) * rad, y: Math.sin(an) * rad * 0.45 - t * 44 - q * 18 + 2 * u, an, col: k % 2 ? GREEN[0] : VIOLET[0], sz: 1, a: step(1 - q, 4) });
  }
  return out;
};
const witchRing = (e) => {                             // the ring the strands rise from: dashes of witch-fire, turning
  const u = U(), out = [], r = 19, a0 = e.p * 3, k = cl(e.p / 0.18);
  const n = 34;
  for (let j = 0; j < n; j++) {
    const an = a0 + j * TAU / n, on = (j + Math.floor(e.i / 2)) % 3 !== 0, lvl = H(j, e.i >> 1);
    if (!on) continue;
    out.push({ x: Math.cos(an) * r, y: Math.sin(an) * r * 0.45 + 6, an, col: j % 2 ? GREEN[2] : VIOLET[1], sz: 1, a: step(k * (0.7 + 0.3 * lvl), 4) });
    if (j % 4 === 0) out.push({ x: Math.cos(an) * (r + 2), y: Math.sin(an) * (r + 2) * 0.45 + 6 - 1, an, col: GREEN[0], sz: 1, a: step(k, 4) });
  }
  return out;
};
const B = (c, e) => {
  ground(c, e); flash(c, e);
  const sp = spiralB(e), wr = witchRing(e);
  plot(c, wr, false); plot(c, sp, false);
  figure(c, e, 0);
  plot(c, wr, true); plot(c, sp, true);
};

// ---- C: A's spiral plus light: pool on the grave, rim on the bones, a flash when he stands ---------------------------------
const C = (c, e) => {
  const u = U(), glow = cl(e.p / 0.25) * (e.p > 0.85 ? cl(1 - (e.p - 0.85) / 0.15 * 0.6) : 1), fl = 0.86 + 0.14 * Math.sin(e.i * 2.1);
  ground(c, e);
  pool(c, 34 * u / 2 * 1.1, glow * fl, GREEN[1], VIOLET[2]);
  flash(c, e);
  const s = spiralA(e); plot(c, s, false);
  const stood = e.p >= 0.82 && e.p < 0.93;
  figure(c, e, glow * (e.p > 0.9 ? 0.7 : 1));
  if (stood) {                                         // the flash as he stands: a white-violet ring and a bright bone frame
    const k = cl((e.p - 0.82) / 0.11), r = 8 + k * 26;
    c.globalAlpha = 0.6 * (1 - k); figure(c, e, 0, true); c.globalAlpha = 1;
    for (let a = 0; a < TAU; a += 0.07) px(c, Math.cos(a) * r, Math.sin(a) * r * 0.5 + 4, k < 0.4 ? VIOLET[0] : VIOLET[1], 1, step(1 - k, 4));
  }
  plot(c, s, true);
};

// ---- D: soul-fire pours DOWN into the grave, the runes wake, then the spiral lifts him -----------------------------------
const GLYPH = ["010111010", "111010111", "101111101", "110011011", "011110011"];    // 3 x 3 sign-marks, 5 of them
const runes = (c, e) => {                              // lying on the ground: under the figure (ground effects stay under)
  const u = U(), n = 7, rx = 15 * u, a0 = -e.p * 1.2;
  for (let j = 0; j < n; j++) {
    const an = a0 + j * TAU / n, lit = cl(e.p * 6 - j * 0.5 + 0.2), gx = Math.round(Math.cos(an) * rx) - 1, gy = Math.round(Math.sin(an) * rx * 0.45) + 5;
    const g = GLYPH[j % 5], on = lit > 0.5, col = on ? (j % 2 ? GREEN[1] : VIOLET[1]) : VIOLET[3];
    for (let q = 0; q < 9; q++) if (g[q] === "1") px(c, gx + (q % 3), gy + ((q / 3) | 0), col, 1, step(Math.max(0.35, lit), 4));
    if (on && lit < 1) px(c, gx + 1, gy - 2, VIOLET[0], 1);
  }
  const k = cl(e.p / 0.15);                            // a thin dashed ring joining them
  for (let a = 0; a < TAU; a += 0.17) px(c, Math.cos(a + a0) * rx * 0.9, Math.sin(a + a0) * rx * 0.9 * 0.45 + 6, VIOLET[3], 1, step(k, 4));
};
const streams = (e) => {
  const u = U(), p = e.p, out = [];
  const down = cl(1 - (p - 0.28) / 0.2);               // the pour: strong to p .28, gone by .48
  if (down > 0) for (let s = 0; s < 3; s++) for (let i = 0; i < 12; i++) {
    const t = cl(p * 2.2 - i * 0.05 + s * 0.03 - 0.0); if (t <= 0) continue; if (t >= 1) continue;   // t 0 = top, 1 = the grave
    const an = -t * 7 + s * TAU / 3, rad = (11 - t * 3) * u;
    out.push({ x: Math.cos(an) * rad, y: Math.sin(an) * rad * 0.45 - (1 - t) * 30 * u + 6, an, col: i % 3 === 0 ? GREEN[0] : GREEN[2], sz: i % 4 === 0 ? 2 : 1, a: step(down, 4) });
  }
  if (p > 0.28) for (let s = 0; s < 3; s++) out.push(...ribbon({ p: p - 0.28, k: 1.9, n: 7, dt: 0.07, an: (t, i) => t * 9 + s * (TAU / 3) + i * 0.45, rad: (t) => RAD(t) - (s === 1 ? 2 : 0), rise: 44, green: () => s !== 2 }));
  return out;
};
const D = (c, e) => {
  ground(c, e); runes(c, e);
  if (e.p >= 0.18 && e.p < 0.4) { const k = cl((e.p - 0.18) / 0.22), r = 4 + k * 14;   // the soul-fire lands: a green splash ring
    for (let a = 0; a < TAU; a += 0.1) px(c, Math.cos(a) * r, Math.sin(a) * r * 0.5 + 5, GREEN[1], 1, step(1 - k, 4)); }
  const s = streams(e); plot(c, s, false);
  figure(c, e, cl((e.p - 0.3) / 0.2) * 0.8);
  plot(c, s, true);
};

export const ROWS = [{
  id: "raise5", label: "Raising the dead, round 5", group: "Round 5", todayKeys: ["raise"],
  note: "The violet / green spiral now coils AROUND the risen goblin: each turn's back half is drawn before him, its front half after. A = today's spiral split; B = three strands, a witch-fire ring, motes; C = A plus a grave light, bone rim-light and a flash when he stands; D = soul-fire pours down into the grave, runes wake, the spiral lifts him.",
  cw: 84, ch: 96, ax: 42, ay: 76, N: 12, A, B, C, D,
}];
