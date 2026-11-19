// Round 5 concepts (frost nova): see art/briefs/fx-round5.md. Owned by the nova artist. Row frostnova5.
// Painters get (c, e): c is a cell canvas translated to (ax, ay) = the nova's centre, 1 unit = 1 art px.
// The ring lies on the ground squashed to SQ 0.55 tall (rings.js). Game modules only in a browser, so Node can read ROWS.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/rings.js")), ...(await import("/src/render/paint.js")) } : {};

const TAU = Math.PI * 2, SQ = 0.55;
const ICE = ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98"];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - (1 - cl(t)) * (1 - cl(t));
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const vn = (x, y, s, seed = 0) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sm = (u) => u * u * (3 - 2 * u);
  const a = H(x0 + seed, y0), b = H(x0 + 1 + seed, y0), cc = H(x0 + seed, y0 + 1), d = H(x0 + 1 + seed, y0 + 1);
  return (a + (b - a) * sm(fx)) * (1 - sm(fy)) + (cc + (d - cc) * sm(fx)) * sm(fy);
};
const line = (c, x0, y0, x1, y1, col) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let er = dx + dy;
  for (let n = 0; n < 300; n++) { P(c, x0, y0, typeof col === "function" ? col(n) : col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
};

const R = 56, NW = { cw: 132, ch: 116, ax: 66, ay: 58, N: 14 };
const GOB = [[-26, 4], [30, 12], [6, -17]];
const frontIce = (p) => R * ease(Math.min(1, p) * 1.25);
const fadeOf = (p, from = 0.72) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from + 0.001)));
const ell = (x, y) => Math.hypot(x, y / SQ);                      // distance in ring space
const ringPx = (c, r, f) => {                                      // f(x, y, d, depth) per pixel of the squashed disc
  const m = Math.ceil(r + 8), my = Math.ceil((r + 8) * SQ);
  for (let y = -my; y <= my; y++) for (let x = -m; x <= m; x++) { const d = ell(x + 0.5, y + 0.5); f(x, y, d, r - d); }
};
const tinted = (s, col, a) => { const t = document.createElement("canvas"); t.width = s.cv.width; t.height = s.cv.height; const k = t.getContext("2d"); k.drawImage(s.cv, 0, 0); k.globalCompositeOperation = "source-atop"; k.globalAlpha = a; k.fillStyle = col; k.fillRect(0, 0, t.width, t.height); return t; };
const gob = (c, e, front, i, lit, flashOf) => {
  const [x, y] = GOB[i], d = ell(x, y), f = (e.i + i * 3) & 7, fl = flashOf ? flashOf(i, x, y) : Math.abs(front - d) < 5 && e.p < 0.9, s = e.foe(fl ? 0 : f, fl ? "white" : "");
  const bx = Math.round(x - s.ax), by = Math.round(y - s.ay);
  if (fl) { const b = e.foe(f, ""); c.drawImage(b.cv, Math.round(x - b.ax), by); c.globalAlpha = 0.7; }
  if (lit && !fl) { const k = cl(1 - Math.abs(front - d) / 30) * (front > d - 6 ? 1 : 0.2); { if (k > 0.25) { c.globalAlpha = 0.75; c.drawImage(tinted(s, "#dff4ff", 1), bx - 1, by); c.globalAlpha = 1; } c.drawImage(tinted(s, "#6aaaf0", 0.08 + 0.2 * k * lit), bx, by); } }
  else c.drawImage(s.cv, bx, by);
  c.globalAlpha = 1;
};
const stage = (c, e, front, under, over, lit = 0, flashOf = null) => {
  under();
  const order = [0, 1, 2].sort((a, b) => GOB[a][1] - GOB[b][1]);
  if (over) over(-1);
  for (const i of order) gob(c, e, front, i, lit, flashOf);
  if (over) over(1);
};

// ---- A: a crisp, bold stepped front of packed frost with a bright inner line -----------------------------
const rimA = (c, r, p, o = {}) => {
  const fd = fadeOf(p, o.fade || 0.62), th = o.th || 14;
  ringPx(c, r, (x, y, d, dep) => {
    if (dep < -1.2 || d > r + 1.2 || H(x, y) * 0 + bay(x, y) >= fd) return;
    const ed = dep + (H(x, y) - 0.5) * 0.45, step = Math.floor(ed);        // whole-pixel bands along the squashed ring
    if (ed < 0) P(c, x, y, ICE[4]);
    else if (ed < 2) P(c, x, y, ICE[0]);
    else if (ed < 5) P(c, x, y, (x + y) & 1 && ed > 4 ? ICE[2] : ICE[1]);
    else if (ed < th - 2) P(c, x, y, H(x, y + 4) > 0.82 ? ICE[0] : H(x, y + 4) > 0.12 ? ICE[2] : ICE[3]);
    else if (ed < th - 1) P(c, x, y, ICE[0]);                               // the bright inner line
    else if (ed < th) P(c, x, y, ICE[3]);
    else if (ed < th + 14) { const k = 1 - (ed - th) / 14; if (bay(x, y) < 0.55 * k && H(x, y) < 0.7) P(c, x, y, ((x * 3 + y) % 6 === 0) ? ICE[0] : ICE[2]); }
  });
};
const novaA = (c, e) => { const p = e.p, r = frontIce(p); stage(c, e, r, () => rimA(c, r, p), null); };

// ---- B: spikes erupt round the circle in sequence, then shatter into shards ----------------------------
const SP = [];
for (const [rho, n, ph0] of [[0.97, 30, 0], [0.7, 22, 0.5], [0.42, 14, 0.2]]) for (let k = 0; k < n; k++) { const a = ((k + ph0) / n) * TAU - Math.PI / 2; SP.push({ a, rho: R * rho, h: 9 + Math.floor(H(k, rho * 9) * 8), w: 2.2 + H(k, 3) * 1.4, ring: rho, at: 0.06 + 0.5 * (((a + Math.PI / 2) / TAU + 1) % 1) + (rho < 0.9 ? 0.04 : 0) }); }
const spike = (c, x, y, h, w) => {
  for (let j = 0; j < h; j++) { const t = j / h, hw = Math.max(0, Math.round((1 - t) * w)); for (let q = -hw; q <= hw; q++) { const edge = Math.abs(q) === hw && hw > 0; P(c, x + q, y - j, edge ? (q < 0 ? ICE[2] : ICE[4]) : q < 0 ? (t > 0.45 ? ICE[0] : ICE[1]) : q === 0 ? ICE[1] : ICE[2]); } }
  P(c, x, y - h, ICE[0]);
};
const spikesB = (c, e, side, shatterAt) => {
  const p = e.p;
  for (const s of SP) {
    const x = Math.round(Math.cos(s.a) * s.rho), y = Math.round(Math.sin(s.a) * s.rho * SQ);
    if ((y < 0 ? -1 : 1) !== side) continue;
    const age = (p - s.at) * 13; if (age < 0) continue;
    const sh = cl((p - s.at - 0.3 - 0.05 * H(s.a, 1)) / 0.16);
    if (sh <= 0) { spike(c, x, y, Math.round(s.h * (age < 1 ? 0.45 : age < 2 ? 0.85 : age < 3 ? 1.12 : 1)), s.w); continue; }
    if (sh >= 1 && p > s.at + 0.62) continue;
    // shards: the spike's pieces fly outward and fall
    for (let k = 0; k < 5; k++) {
      const ang = s.a + (H(k, s.a) - 0.5) * 1.2, v = 5 + H(k, 8 + s.a) * 9, t = sh;
      const sx = x + Math.cos(ang) * v * t, sy = y - s.h * 0.5 * (1 - k / 6) - Math.sin(t * 2.4) * 5 * (1 - t) + t * t * (10 + k * 3) + Math.sin(ang) * v * t * SQ;
      if (t < 1 || bay(k, Math.floor(p * 14)) < 0.5) { const col = k % 3 === 0 ? ICE[0] : k % 3 === 1 ? ICE[1] : ICE[3]; P(c, sx, sy, col); P(c, sx + 1, sy, ICE[2]); if (k < 2) P(c, sx, sy + 1, col); }
    }
    if (sh > 0.6 && bay(x, y) < 0.7) P(c, x, y, ICE[2]);                    // a pile of ice where it stood
  }
};
const novaB = (c, e) => {
  const p = e.p, r = frontIce(p);
  stage(c, e, r, () => {
    ringPx(c, r, (x, y, d, dep) => { if (dep >= 0 && dep < 1.4 && d <= r && bay(x, y) < fadeOf(p, 0.5)) P(c, x, y, dep < 0.7 ? ICE[0] : ICE[2]); });   // a thin ring front: it still reads as a ring
    // a few short cracks at the feet of each outer spike as it erupts
    for (const s of SP) if (s.ring > 0.9 && p > s.at && p < s.at + 0.2) { const x = Math.cos(s.a) * s.rho, y = Math.sin(s.a) * s.rho * SQ; for (let k = 0; k < 2; k++) { const ang = s.a + (k ? 1 : -1) * 1.9; line(c, x, y, x + Math.cos(ang) * 4, y + Math.sin(ang) * 2.2, ICE[1]); } }
  }, (side) => spikesB(c, e, side, 0.55), 0, (i, x, y) => { const ga = Math.atan2(y / SQ, x), at = 0.06 + 0.5 * (((ga + Math.PI / 2) / TAU + 1) % 1); return Math.abs(e.p - at - 0.02) < 0.034; });
};

// ---- C: a cold flash and light: the ground and the goblins lit blue as it passes, a glaze left behind -------
const novaC = (c, e) => {
  const p = e.p, r = frontIce(p), i = e.i, fd = fadeOf(p, 0.5);
  stage(c, e, r, () => {
    // cold light on the ground inside the front, strongest just behind it (stepped, dithered)
    ringPx(c, r, (x, y, d, dep) => {
      if (dep < 0 || d > r) return;
      const k = Math.exp(-dep / 20) * 0.9 + 0.08, s = Math.ceil(k * fd * 5) / 5;
      if (s > 0 && bay(x, y) < s * 0.9) P(c, x, y, s > 0.6 ? ICE[3] : ICE[4], 0.6);
    });
    // glaze left behind: pale film with slanted light streaks to the end
    const g = cl((p - 0.3) / 0.25) * (0.5 + 0.5 * fadeOf(p, 0.94));
    ringPx(c, r, (x, y, d, dep) => { if (dep < 3 || d > r) return; if (bay(x, y) < 0.28 * g) P(c, x, y, ICE[2], 0.8); if (g > 0.3 && (x - y * 2 + 600) % 13 < 1 && H(x, y) < 0.7) P(c, x, y, ICE[0], 0.9 * g); });
    rimA(c, r, p, { th: 4, fade: 0.55 });
    // centre flash: a bright squashed disc on the ground, stepped, dithered edge, light falling off outward
    if (i < 6) { const fr = [24, 20, 15, 11, 7, 4][i];
      ringPx(c, fr * 1.6, (x, y, d) => { const k = 1 - d / (fr * 1.6); if (k <= 0) return; if (d < fr * 0.45) P(c, x, y, ICE[0]); else if (d < fr * 0.8) P(c, x, y, bay(x, y) < 0.8 ? ICE[0] : ICE[1]); else if (d < fr) P(c, x, y, ICE[1]); else if (bay(x, y) < k * 0.9) P(c, x, y, d < fr * 1.25 ? ICE[2] : ICE[3], 0.7); });
      if (i < 3) for (let k = 0; k < 10; k++) { const an = (k / 10) * TAU, L = fr + 8; line(c, Math.cos(an) * fr * 0.8, Math.sin(an) * fr * 0.8 * SQ, Math.cos(an) * L, Math.sin(an) * L * SQ, ICE[0]); } }
  }, (side) => { if (side > 0) for (let k = 0; k < 16; k++) { const an = H(k, 4) * TAU, dd = r * Math.sqrt(H(k, 5)), z = ((p * 14 + k * 1.7) % 10) + 1; if (dd > r * 0.2) P(c, Math.cos(an) * dd, Math.sin(an) * dd * SQ - z, k % 3 ? ICE[0] : ICE[1]); } }, 1);
};

// ---- D: a snowflake grows on the ground: six arms with branches, then small flakes bloom, then melts --------
const flake = (c, cx, cy, L, grow, fd, thick) => {
  for (let a = 0; a < 6; a++) {
    const an = (a / 6) * TAU + Math.PI / 6, ca = Math.cos(an), sa = Math.sin(an), reach = L * grow;
    if (fd <= 0.02) continue;
    line(c, cx, cy, cx + ca * reach, cy + sa * reach * SQ, (n) => (bay(n, a) < fd ? (n % 4 === 0 ? ICE[0] : ICE[1]) : ICE[3]));
    if (thick) line(c, cx + 1, cy, cx + ca * reach + 1, cy + sa * reach * SQ, (n) => (bay(n, a + 3) < fd ? ICE[2] : ICE[3]));
    for (let b = 1; b <= (thick ? 4 : 2); b++) {
      const at = (b / (thick ? 4.4 : 2.6)) * reach; if (at > reach - 2) continue;
      const bl = (L * 0.28 * (1 - b / 5.5)) * grow, bx = cx + ca * at, by = cy + sa * at * SQ;
      for (const s of [-1, 1]) { const ba = an + s * (Math.PI / 3), ex = bx + Math.cos(ba) * bl, ey = by + Math.sin(ba) * bl * SQ; line(c, bx, by, ex, ey, (n) => (bay(n, b + a) < fd ? ICE[1] : ICE[3])); P(c, ex, ey, ICE[0]); }
    }
    P(c, cx + ca * reach, cy + sa * reach * SQ, ICE[0]);
  }
};
const novaD = (c, e) => {
  const p = e.p, r = frontIce(p), fd = fadeOf(p, 0.7);
  stage(c, e, r, () => {
    // frost sheet only where the flake has reached, a thin ring front at its tips
    ringPx(c, r, (x, y, d, dep) => { if (dep < 0 || d > r) return; if (bay(x, y) < 0.16 * fd && vn(x, y, 3, 7) > 0.5) P(c, x, y, ICE[2]); if (dep < 1.4 && bay(x, y) < fd) P(c, x, y, dep < 0.7 ? ICE[0] : ICE[1]); });
    flake(c, 0, 0, R * 0.98, ease(Math.min(1, p / 0.7) * 1.25), fd, true);
    // smaller flakes bloom at the rim between the arms once the front passes
    for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU, d = R * 0.62, bx = Math.cos(an) * d, by = Math.sin(an) * d * SQ, g = cl((p - 0.3 - 0.04 * k) / 0.25); if (g > 0) flake(c, Math.round(bx), Math.round(by), 11, g, fd, false); }
    // six bright points orbiting the rim: motes of frost
    if (p < 0.85) for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + p * 2.2; P(c, Math.cos(an) * r, Math.sin(an) * r * SQ, ICE[0]); }
  }, null);
};

// TODAY: the game's own painter at the same cell
const todayNova = (c, e) => {
  const PXu = G.PX || 1, front = frontIce(e.p), fx = { type: "frostnova", x: 0, y: 0, r: R / PXu, life: 500, ttl: 500 * (1 - e.p) };
  const W = (fn) => { c.save(); c.scale(PXu, PXu); fn(); c.restore(); };
  W(() => G.drawRingFx(c, fx, 1, {}, "g"));
  for (const i of [0, 1, 2].sort((a, b) => GOB[a][1] - GOB[b][1])) gob(c, e, front, i, 0);
  W(() => G.drawRingFx(c, fx, 1, {}, "a"));
};

export const ROWS = [{
  id: "frostnova5", label: "Frost nova (round 5)", group: "Round 5", ...NW, today: todayNova,
  note: "Frost nova at 0.55 tall, about 500 ms, over three goblins. A: a crisper, bolder stepped front of packed frost with a bright inner line. B: spikes erupt round the circle in sequence, then shatter into shards. C: a cold flash, the ground and goblins lit blue as the front passes, a glaze left behind. D: a snowflake of frost grows across the ground, small flakes bloom, then it melts.",
  A: novaA, B: novaB, C: novaC, D: novaD,
}];
