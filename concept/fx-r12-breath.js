// Effects concepts, Round 12: Dragonbreath's flame (row breath12). See art/briefs/fx-round12.md.
// Cell units are ART pixels, origin = the hall's foot. The engine's wedge (half-angle 0.42, len 69 world units = 138 art px) is kept exactly.
// 16-frame true loop: the aim sweeps 0.3 +- 0.4 rad; every motion below runs on whole multiples of the loop phase.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/paint.js")), ...(await import("/src/render/rigs.js")), ...(await import("/src/render/halls/wizard.js")), ...(await import("/src/render/flames.js")) } : {};

const TAU = Math.PI * 2, N = 16, CONE = 0.42, TANC = Math.tan(CONE);
const NW = { cw: 240, ch: 292, ax: 62, ay: 162, N };
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // the blast round's tones
const INK = "#5a1838", HOT = "#ffd860";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const PXu = () => G.PX || 2;
const Lart = () => 69 * PXu();                                   // the wedge's reach in art px
const phi = (i) => (TAU * i) / N;
const aimAt = (i) => 0.3 + 0.4 * Math.sin(phi(i));
const FL = [0, 1, 2, 1];                                          // flicker frames, period 4 divides 16

// ---- the real hall, staff levelled, breath held -----------------------------------------------------------------------------
const mkT = (ang) => ({ id: 3, kind: "wizard", x: 0, y: 0, level: 3, branch: "a", rank4: "b", cd: 0, aim: "first", lastAim: ang, anim: 1, shotIdx: 0, critIdx: 0, invested: 0, units: [], rally: null, kills: 0, dmgOut: 0, liveTime: 1, breath: { on: 1, ang, len: 69, cone: CONE } });
const hallAt = (c, t, time) => { c.save(); c.scale(PXu(), PXu()); G.drawWizardSpire(c, t, time); c.restore(); };
const mouthOf = (t) => { const m = G.breathMouth(t); return { x: m.x * PXu(), y: m.y * PXu() }; };

// ---- the road and the goblins (world units; one of them stands past the reach) ---------------------------------------------
const road = (c, dark) => {
  const [a, b, d] = dark ? ["#5a4a3a", "#4a3c30", "#6a5846"] : ["#b09468", "#9c8258", "#c4a878"];
  for (let y = 12; y < 62; y++) for (let x = 36; x < NW.cw; x++) {
    const h = H(x * 1.7, y * 0.9); P(c, x - NW.ax, y, h > 0.94 ? b : h < 0.04 ? d : a);
  }
  for (let x = 36; x < NW.cw; x++) { P(c, x - NW.ax, 12, "#6e5636"); P(c, x - NW.ax, 61, "#6e5636"); }
};
const GOB = [[28, 10], [45, 17], [60, 22], [38, 22], [76, 26]];
const tintC = {};
const tinted = (s, col, key) => { const k = key + col; if (tintC[k]) return tintC[k]; const t = document.createElement("canvas"); t.width = s.cv.width; t.height = s.cv.height; const x = t.getContext("2d"); x.drawImage(s.cv, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height); return (tintC[k] = t); };
const gobStat = (ang, g) => {                                      // inside the engine's wedge? how near?
  const x = g[0], y = g[1], s = Math.hypot(x, y), a = Math.atan2(y, x), da = Math.abs(a - ang);
  const inside = s < 69 * 0.98 && s > 17 && da < CONE;
  return { inside, near: inside ? 1 : (s < 82 && da < CONE + 0.25 ? 0.4 : 0) };
};

// ---- flame tongues: five silhouettes, flicker by loop frame ---------------------------------------------------------------
const SZ = [[7, 3.2], [11, 4.6], [16, 6.4]];
const tongue = (c, x, y, o) => {
  const { kind = 0, size = 1, lean = 0, ph = 0, fr = 0, hs = 1, heat = 1 } = o;
  const h = Math.round((o.h || SZ[size][0]) * hs * [1, 0.9, 1.08][fr]), w = (o.w || SZ[size][1]) * (0.6 + 0.4 * Math.sqrt(hs));
  if (h < 2) return;
  for (let k = 0; k < h; k++) {
    const u = k / h, foot = u < 0.1 ? 0.65 + u * 3.5 : 1;
    let lobes;
    if (kind === 0) lobes = [{ c: 0, w: w * (1 - Math.pow(u, 1.3)) * foot }];
    else if (kind === 1) {
      if (u < 0.45) lobes = [{ c: 0, w: w * (1 - u * 0.5) * foot }];
      else { const sp = (u - 0.45) * w * 2.4; lobes = [{ c: -sp, w: Math.max(0.6, w * 0.55 * (1 - (u - 0.45) / 0.55)) }]; if (u < 0.82) lobes.push({ c: sp, w: Math.max(0.6, w * 0.5 * (1 - (u - 0.45) / 0.4)) }); }
    } else if (kind === 2) lobes = [{ c: 0, w: w * 0.8 * (1 - Math.pow(u, 0.9)) * foot }];
    else if (kind === 3) lobes = [{ c: 0, w: w * 1.15 * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.7) * (1 - u * 0.2) * foot }];
    else { lobes = [{ c: 0, w: w * Math.pow(1 - u, 0.8) * foot }]; if (u < 0.62) lobes.push({ c: w * 0.75, w: w * 0.5 * (1 - u / 0.62) }); }
    const off = lean * h * (kind === 2 ? 0.75 : 0.42) * u * u + Math.sin(ph * 6.28 + fr * 2.1 + u * 4) * u * w * (fr ? 0.3 : 0.12);
    for (const lb of lobes) {
      const cx = x + off + lb.c, wr = Math.max(0.8, lb.w), yy = y - k;
      for (let px = Math.floor(cx - wr); px <= Math.ceil(cx + wr); px++) {
        const d = Math.abs(px + 0.5 - cx) / wr; if (d > 1) continue;
        const g = (d * 0.75 + u * 0.95) / (0.5 + 0.65 * heat);
        let col = g < 0.2 ? FIRE[0] : g < 0.42 ? FIRE[1] : g < 0.68 ? FIRE[2] : g < 0.9 ? FIRE[3] : FIRE[4];
        if (d > 0.88 || k === 0) col = d > 0.93 || k === 0 ? INK : FIRE[4];
        P(c, px, yy, col);
      }
    }
  }
  P(c, x + lean * h * (kind === 2 ? 0.75 : 0.42) * 0.95, y - h, INK);
};
const tk = (a, b, i, extra) => ({ kind: Math.floor(H(a, b) * 5), ph: H(a + 3, b + 1), lean: (H(a + 7, b + 2) - 0.5) * 1.1, fr: FL[(i + Math.floor(H(a, b + 9) * 4)) % 4], ...extra });

// ---- the goblins: lit by the pool, the deep ones burning --------------------------------------------------------------------
const gobItem = (c, e, g, k, ang, sc) => {
  const st = gobStat(ang, g), PXv = PXu(), s = G.rigFrame("goblin", "walk", (e.i + k * 3) % 8, ""), ax = Math.round(s.ax * PXv), ay = Math.round(s.ay * PXv);
  const x = g[0] * PXv, y = g[1] * PXv, burn = st.inside && (k === 1 || k === 2);
  return { y, draw: () => {
    c.save(); c.translate(x, y); c.scale(-1, 1); c.drawImage(s.cv, -ax, -ay);
    if (st.near > 0) { c.globalAlpha = 0.34 * st.near * sc; c.drawImage(tinted(s, "#ff9a30", "g" + ((e.i + k * 3) % 8)), -ax, -ay); c.globalAlpha = 1; }
    c.restore();
    if (burn) {
      const Th = e.T || 26;
      tongue(c, x - 4, y - Th * 0.45, { kind: 2, size: 0, lean: -0.5, ph: 0.3 * k, fr: FL[(e.i + k) % 4], h: 7, heat: 1 });
      tongue(c, x + 3, y - Th * 0.75, { kind: 0, size: 0, lean: 0.4, ph: 0.6, fr: FL[(e.i + k + 1) % 4], h: 9, heat: 1 });
      tongue(c, x, y - 1, { kind: 3, size: 0, lean: 0, ph: 0.1, fr: FL[(e.i + k + 2) % 4], h: 6, heat: 0.9 });
    }
  } };
};

// ---- light: a warm dithered pool laid on the road over the wedge ------------------------------------------------------------
const pool = (c, ang, k, wide = 1) => {
  const L = Lart(), cx = Math.cos(ang) * L * 0.64, cy = Math.sin(ang) * L * 0.64, rx = L * 0.52 * wide, ry = L * 0.34 * wide;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (d > 1) continue;
    const st = Math.ceil(cl(k * (1 - d) * 1.5) * 5) / 5;
    if (st > 0 && bay(x & 1023, y & 1023) < st * 0.8) P(c, x, y, st > 0.6 ? "#ffc060" : "#ff8a30", 0.42);
  }
};
const inWedge = (x, y, ang, s0, s1, pad = 0) => { const s = Math.hypot(x, y); if (s < s0 || s > s1) return -1; const da = Math.abs(Math.atan2(y, x) - ang); return da < CONE + pad ? da : -1; };

// ---- the stream: a flame ribbon from the nozzle arcing down to the road -------------------------------------------------------
// o: w0, w1 (half-width at the nozzle / at the end), imp (impact distance as a share of the reach), fan (the last share of the length that opens out)
const stream = (c, M, ang, i, o) => {
  const L = Lart(), I = { x: Math.cos(ang) * L * o.imp, y: Math.sin(ang) * L * o.imp - 3 }, f = phi(i);
  const C = { x: M.x + (I.x - M.x) * 0.72, y: M.y + (I.y - M.y) * 0.1 };
  const K = 44, S = [];
  for (let k = 0; k <= K; k++) {
    const u = k / K, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
    S.push({ u, x: a * M.x + b * C.x + d * I.x, y: a * M.y + b * C.y + d * I.y });
  }
  for (let k = 0; k <= K; k++) {
    const p = S[Math.max(0, k - 1)], q = S[Math.min(K, k + 1)], tx = q.x - p.x, ty = q.y - p.y, tl = Math.hypot(tx, ty) || 1;
    S[k].tx = tx / tl; S[k].ty = ty / tl;
    const wob = Math.sin(S[k].u * 11 - 2 * f) * 1.7 * S[k].u;
    S[k].x += -S[k].ty * wob; S[k].y += S[k].tx * wob;
  }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const s of S) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
  const pad = Math.ceil(o.w1 * 1.7) + 4;
  for (let y = Math.floor(y0 - pad); y <= Math.ceil(y1 + pad); y++) for (let x = Math.floor(x0 - pad); x <= Math.ceil(x1 + pad); x++) {
    const px = x + 0.5, py = y + 0.5;
    let best = 1e9, bk = 0;
    for (let k = 0; k <= K; k++) { const dx = px - S[k].x, dy = py - S[k].y, d2 = dx * dx + dy * dy; if (d2 < best) { best = d2; bk = k; } }
    const s = S[bk], d = Math.sqrt(best), side = (px - s.x) * s.ty - (py - s.y) * s.tx > 0 ? 1 : -1, u = s.u;
    const fanK = u > 1 - o.fan ? (u - (1 - o.fan)) / o.fan : 0;
    const w = o.w0 + (o.w1 - o.w0) * Math.pow(u, o.pw || 1.5) + fanK * fanK * o.w1 * 0.35;
    const tw = 0.5 + 0.5 * (0.55 * Math.sin(u * 22 - 4 * f + side * 2.1) + 0.45 * Math.sin(u * 41 - 7 * f - side * 3.3 + 1.7));
    const we = w * (0.8 + 0.3 * tw), q = d / we;
    if (q > 1) {                                           // licks: ragged tips peeling off, favouring the upper side
      const up = py < s.y ? 0.3 : 0, lim = 1 + 0.5 * cl((tw - 0.5) * 2.2 + up);
      if (q < lim && u > 0.08 && bay(x, y) < 0.75) P(c, x, y, q < lim - 0.18 ? FIRE[4] : FIRE[5], 0.9);
      continue;
    }
    if (u > 0.86 && bay(x, y) > (1 - u) / 0.14) continue;
    const g = q * 0.85 + u * 0.5 - 0.15 + (bay(x, y) - 0.5) * 0.1;
    let col = g < 0.2 ? FIRE[0] : g < 0.42 ? FIRE[1] : g < 0.66 ? FIRE[2] : g < 0.88 ? FIRE[3] : FIRE[4];
    if (q > 0.92) col = INK;
    P(c, x, y, col);
  }
  return { I, S };
};
const impact = (c, I, i, r) => {                                  // the white-gold flare where the stream meets the road
  const rr = r * (0.9 + 0.2 * [0, 1, 0.5, 1][i % 4]);
  for (let y = -rr; y <= rr; y++) for (let x = -rr * 1.4; x <= rr * 1.4; x++) {
    const d = Math.hypot(x / 1.4, y) / rr; if (d > 1 || bay(x + 64, y + 64) < d * d * 0.8) continue;
    P(c, I.x + x, I.y + y, d < 0.4 ? FIRE[0] : d < 0.75 ? FIRE[1] : FIRE[2]);
  }
};
const sparks = (c, ang, i, n, spread, s0 = 0.5, rise = 40) => {   // lift off the far end; each spark lives half the loop (2 cycles a loop)
  const L = Lart();
  for (let k = 0; k < n; k++) {
    const q = ((2 * i) / N + k / n) % 1, a = ang + (H(k, 1) - 0.5) * 2 * CONE * spread, s = L * (s0 + (1 - s0) * 0.95 * H(k, 2));
    const x = Math.cos(a) * s + Math.sin(q * 9 + k) * 2, y = Math.sin(a) * s - 4 - rise * q * (0.6 + 0.5 * H(k, 3));
    if (bay(k, i) < q * q * 0.9) continue;
    P(c, x, y, k % 3 === 0 ? FIRE[0] : HOT); if (k % 3 === 0) { P(c, x + 1, y, FIRE[2], 0.8); P(c, x, y + 1, FIRE[2], 0.8); } else if (q > 0.5) P(c, x, y + 1, FIRE[3], 0.7);
  }
};
const heat = (c, ang, i, dens, s0 = 0.3) => {                      // a dither marking exactly the damage wedge
  const L = Lart();
  for (let y = -Math.ceil(L); y <= Math.ceil(L); y++) for (let x = 0; x <= Math.ceil(L); x++) {
    const da = inWedge(x + 0.5, y + 0.5, ang, L * s0, L * 0.99); if (da < 0) continue;
    const dd = dens * (1 - 0.55 * da / CONE); if (bay(x & 1023, (y + 512) & 1023) < dd) P(c, x, y, dd > 0.3 ? FIRE[2] : FIRE[3], 0.55);
  }
};

// ---- the frame wrapper: ground, pool, hall, items sorted by y, then the air -----------------------------------------------------
const frame = (c, e, o) => {
  const ang = aimAt(e.i), t = mkT(ang), time = 1.2, M = mouthOf(t), items = [];
  road(c, e.ground === "dark");
  if (o.under) o.under(c, ang, e.i, M, items);
  pool(c, ang, o.glow, o.wide || 1);
  hallAt(c, t, time);
  GOB.forEach((g, k) => items.push(gobItem(c, e, g, k, ang, o.glow / 0.45)));
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  if (o.air) o.air(c, ang, e.i, M);
};

// ---- TODAY: the game's own drawBreath ---------------------------------------------------------------------------------------
const today = (c, e) => {
  const ang = aimAt(e.i), t = mkT(ang), time = 1.2, items = [];
  road(c, e.ground === "dark"); pool(c, ang, 0.4); hallAt(c, t, time);
  GOB.forEach((g, k) => items.push(gobItem(c, e, g, k, ang, 0.9))); items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  c.save(); c.scale(PXu(), PXu()); G.drawBreath(c, t, (e.i / N) * 1.76); c.restore();
};

// ---- shared: a lit, lobed blob (billow / curl puff), stretched along `an`; tones are FIRE indices (lit, body, shade) ------------------
const blob = (c, x, y, rx, ry, an, tn, sd, shift = 0, keep = 1) => {
  const m = Math.ceil(Math.max(rx, ry) * 1.4), ca = Math.cos(an), sa = Math.sin(an), X0 = Math.floor(x), Y0 = Math.floor(y), big = Math.max(rx, ry);
  for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) {
    const a0 = (dx + 0.5 - (x - X0)), b0 = (dy + 0.5 - (y - Y0)), a = (a0 * ca + b0 * sa) / rx, b = (-a0 * sa + b0 * ca) / ry;
    const th = Math.atan2(b, a), e = 1 + 0.2 * Math.sin(3 * th + sd) + 0.12 * Math.sin(5 * th - sd * 1.7), d = Math.hypot(a, b) / e;
    if (d > 1) continue;
    const X = X0 + dx, Y = Y0 + dy;
    if (d > 0.92 && bay(X & 1023, Y & 1023) >= (1 - d) * 12) continue;
    const l = -b0 / big * 0.9 - d * 0.25 + 0.1, k = l > 0.3 ? 0 : l < -0.28 ? 2 : 1;
    P(c, X, Y, FIRE[Math.min(4, tn[k] + shift)]);
  }
};

// ---- A: today's plume, cleaned: the same flight from the nozzle to the wedge, billows stretched along it and overlapped into one mass -------
const LAY = [{ n: 46, lat: 0.8, far: 0.97, r: 15, tn: [2, 3, 4] }, { n: 30, lat: 0.5, far: 0.88, r: 11.5, tn: [1, 2, 3] }, { n: 20, lat: 0.2, far: 0.74, r: 9, tn: [0, 1, 2] }];
const flight = (M, G, lat, k) => { const ang = Math.atan2(G.y - M.y, G.x - M.x); return { x: M.x + (G.x - M.x) * k, y: M.y + (G.y - M.y) * k - k * 2 + 0, ang }; };
const plume = (c, M, ang, i, items) => {
  const L = Lart(), ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, sMin = L * 0.3;
  LAY.forEach((ly, li) => {
    for (let k = 0; k < ly.n; k++) {
      const p = ((2 * i) / N + k / ly.n) % 1, hk = k + li * 101;
      const u = H(hk, 1) * 2 - 1, lat = Math.sign(u) * Math.pow(Math.abs(u), 0.8) * ly.lat, sT = sMin + (L * ly.far - sMin) * Math.sqrt(H(hk, 3)), lT = lat * sT * TANC;
      const G = { x: ca * sT + nx * lT, y: sa * sT + ny * lT - 3 }, kk = 1 - Math.pow(1 - p, 1.25), fp = flight(M, G, lat, kk);
      const bow = lat * kk * (1 - kk) * 22, x = fp.x + nx * bow, y = fp.y + ny * bow;
      const r = (1.8 + (ly.r - 1.8) * Math.sqrt(kk)) * (0.85 + 0.3 * H(hk, 7)) * (p > 0.8 ? 1 - (p - 0.8) * 2 : 1), stretch = 1.9 - 0.7 * p;
      const shift = (kk < 0.14 ? -1 : 0) + (p > 0.7 ? 1 : 0);
      blob(c, x, y, r * stretch, r * 0.86, fp.ang, ly.tn, hk, Math.max(-ly.tn[0], shift), 1);
      if (li === 0 && p > 0.22 && p < 0.88 && H(hk, 5) > 0.55) tongue(c, x + (H(hk, 6) - 0.5) * r, y - r * 0.55, { kind: 2, size: 0, lean: (H(hk, 4) - 0.5) * 1.2, ph: H(hk, 8), fr: FL[(i + k) % 4], h: 6 + Math.round(4 * H(hk, 9)), heat: 1 - p * 0.5 });
    }
  });
  for (let k = 0; k < 44; k++) {                                      // the white-gold core line off the nozzle
    const q = k / 44 * 0.42, G = { x: ca * L * 0.62, y: sa * L * 0.62 - 3 }, fp = flight(M, G, 0, q);
    const w = 1.6 - q * 2; P(c, fp.x, fp.y, FIRE[0]); if (w > 0.7) P(c, fp.x, fp.y + 1, FIRE[1]); if (w > 1) P(c, fp.x + 1, fp.y, FIRE[1]);
  }
  blob(c, M.x, M.y, 3.2, 3.2, 0, [0, 0, 1], i);
};
const flick = (c, ang, i, items, n) => {                              // a handful of small varied flickers where the jet touches down
  const L = Lart();
  for (let k = 0; k < n; k++) {
    const s = L * (0.66 + 0.3 * H(k, 21)), a = ang + CONE * 0.8 * (H(k, 22) - 0.5) * 2, x = Math.cos(a) * s, y = Math.sin(a) * s, z = H(k, 23);
    const o = tk(40 + k, k, i, { size: z > 0.55 ? 1 : 0, hs: 0.6 + 0.6 * H(k, 24), lean: (H(k, 25) - 0.5) * 1.3, heat: 0.9 });
    items.push({ y, draw: () => tongue(c, x, y, o) });
  }
};
const optA = {
  glow: 0.5,
  under: (c, ang, i, M, items) => { heat(c, ang, i, 0.3); flick(c, ang, i, items, 4); },
  air: (c, ang, i, M) => { plume(c, M, ang, i); sparks(c, ang, i, 18, 0.9, 0.55, 44); },
};

// ---- B: streaked flame: A's flight and mass, every billow a stretched teardrop of flame pointing along its flight (hot core, licking tail) ----
const streak = (c, x, y, len, wid, an, sd, shift, tn) => {
  const ca = Math.cos(an), sa = Math.sin(an), m = Math.ceil(len * 1.1), X0 = Math.floor(x), Y0 = Math.floor(y), head = len * 0.35;
  for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) {
    const a0 = dx + 0.5 - (x - X0), b0 = dy + 0.5 - (y - Y0), a = a0 * ca + b0 * sa, b = -a0 * sa + b0 * ca;
    let w, off = 0;
    if (a >= 0) { if (a > head) continue; w = wid * Math.sqrt(1 - (a / head) * (a / head)); }
    else { if (a < -len) continue; const tq = -a / len; w = wid * Math.pow(1 - tq, 1.1); off = Math.sin(a * 0.45 + sd) * wid * 0.55 * tq; }
    const q = Math.abs(b - off) / Math.max(0.7, w); if (q > 1) continue;
    const tq = a < 0 ? -a / len : 0, g = q * 0.75 + tq * 0.55 - 0.1 + (bay((Math.floor(x) + dx) & 1023, (Math.floor(y) + dy) & 1023) - 0.5) * 0.08;
    let i = g < 0.2 ? 0 : g < 0.42 ? 1 : g < 0.68 ? 2 : g < 0.9 ? 3 : 4;
    P(c, X0 + dx, Y0 + dy, FIRE[Math.max(0, Math.min(4, i + shift))]);
  }
};
const plumeB = (c, M, ang, i) => {
  const L = Lart(), ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, sMin = L * 0.3;
  [{ n: 40, lat: 0.8, far: 0.97, r: 9, s: 0 }, { n: 26, lat: 0.5, far: 0.88, r: 7.5, s: -1 }, { n: 16, lat: 0.2, far: 0.74, r: 6, s: -1 }].forEach((ly, li) => {
    for (let k = 0; k < ly.n; k++) {
      const p = ((2 * i) / N + k / ly.n) % 1, hk = k + li * 101;
      const u = H(hk, 1) * 2 - 1, lat = Math.sign(u) * Math.pow(Math.abs(u), 0.8) * ly.lat, sT = sMin + (L * ly.far - sMin) * Math.sqrt(H(hk, 3)), lT = lat * sT * TANC;
      const G = { x: ca * sT + nx * lT, y: sa * sT + ny * lT - 3 }, kk = 1 - Math.pow(1 - p, 1.25), fp = flight(M, G, lat, kk);
      const bow = lat * kk * (1 - kk) * 22;
      let x = fp.x + nx * bow, y = fp.y + ny * bow, an = fp.ang;
      const curlK = cl((p - 0.72) / 0.28);                                  // at the far end the streaks turn up into rolling tongues
      if (curlK > 0) { const up = -Math.PI / 2 + (H(hk, 12) - 0.5) * 1.1, d = Math.atan2(Math.sin(up) - Math.sin(an), Math.cos(up) - Math.cos(an)); an = an + (((up - an + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * curlK; y -= curlK * curlK * 20; x += Math.sin(curlK * 3 + hk) * 3 * curlK; }
      const wid = (1 + (ly.r - 1) * Math.sqrt(kk)) * (0.8 + 0.4 * H(hk, 7)) * (1 - 0.4 * curlK), len = wid * (3.4 + 2 * p) * (1 + 0.3 * curlK);
      streak(c, x, y, len, wid, an, hk, (kk < 0.14 ? -1 : 0) + (p > 0.72 ? 1 : 0), ly.s);
    }
  });
  for (let k = 0; k < 44; k++) {
    const q = k / 44 * 0.42, G = { x: ca * L * 0.62, y: sa * L * 0.62 - 3 }, fp = flight(M, G, 0, q), w = 1.6 - q * 2;
    P(c, fp.x, fp.y, FIRE[0]); if (w > 0.7) P(c, fp.x, fp.y + 1, FIRE[1]); if (w > 1) P(c, fp.x + 1, fp.y, FIRE[1]);
  }
  blob(c, M.x, M.y, 3.2, 3.2, 0, [0, 0, 1], i);
};
const optB = {
  glow: 0.55,
  under: (c, ang, i, M, items) => { heat(c, ang, i, 0.3); flick(c, ang, i, items, 4); },
  air: (c, ang, i, M) => { plumeB(c, M, ang, i); sparks(c, ang, i, 22, 0.9, 0.55, 50); },
};

// ---- C: A exactly, plus a fire spell ring at the staff the jet pours through, and a broken arc of fire on the wedge's far edge -----------
const ringAt = (c, M, i, front) => {
  const r = 16, tilt = 0.62, f = phi(i);
  for (let band = 0; band < 2; band++) {
    const rr = r + band * 3.5, n = Math.round(rr * 9);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + (band ? -f : f);
      if ((Math.sin(a) >= 0) !== front) continue;
      if (H(Math.floor(a * 3.1) + band * 5, 9) < 0.13) continue;
      const x = Math.floor(M.x + Math.sin(a) * rr * tilt), y = Math.floor(M.y + Math.cos(a) * rr), col = band ? (front ? FIRE[2] : FIRE[3]) : (front ? FIRE[0] : FIRE[2]);
      P(c, x - 1, y, band ? FIRE[4] : FIRE[3]); P(c, x, y, col); P(c, x + 1, y, col); P(c, x, y + 1, band ? FIRE[3] : FIRE[2]); P(c, x + 1, y + 1, band ? FIRE[3] : FIRE[2]);
      if (front && !band && k % 9 === 0) P(c, x, y - 1, FIRE[0]);
    }
  }
  if (front) for (let k = 0; k < 6; k++) { const a = f * 2 + k * 1.05, x = M.x + Math.sin(a) * (r + 7) * tilt, y = M.y + Math.cos(a) * (r + 7); P(c, x, y, FIRE[0]); P(c, x + 1, y, FIRE[1]); P(c, x, y + 1, FIRE[2]); }
};
const arc = (c, ang, i) => {                                           // the far edge: gold / orange / red-orange, 2 px, broken, with small licks
  const L = Lart(), s = L * 0.99, n = Math.round(s * CONE * 2 * 1.5);
  for (let k = 0; k <= n; k++) {
    const a = ang - CONE * 0.97 + (k / n) * CONE * 1.94, x = Math.cos(a) * s, y = Math.sin(a) * s;
    if (H(k * 0.37, 3) < 0.18) continue;
    P(c, x, y, FIRE[2]); P(c, x, y - 1, FIRE[1]); P(c, x, y + 1, FIRE[3]); P(c, x + 1, y, FIRE[2]); P(c, x + 1, y - 1, FIRE[1]);
    if (H(k, 8 + (i >> 1)) > 0.6) { P(c, x, y - 2, FIRE[2]); P(c, x, y - 3, FIRE[3]); P(c, x + 1, y - 2, FIRE[3], 0.9); }
  }
};
const optC = {
  glow: optA.glow,
  under: (c, ang, i, M, items) => { optA.under(c, ang, i, M, items); arc(c, ang, i); ringAt(c, M, i, false); },
  air: (c, ang, i, M) => { optA.air(c, ang, i, M); ringAt(c, M, i, true); },
};

export const ROWS = [{
  id: "breath12", label: "Dragonbreath's flame (round 12)", group: "Round 12", ...NW, today,
  note: "Every cell is the real Dragonbreath Wizard Spire (staff levelled, breath held, the aim sweeping 0.5 rad each way across the road, a 16-frame loop) with five goblins on the road (the right-hand one stands past the reach and is not lit; the two deeper ones burn). The damage wedge is the engine's own (half-angle 0.42, 69 units). No smoke anywhere; a dithered heat wedge on the road and a few small flickers where the jet touches down. TODAY: the game's own drawBreath (not built to loop, so it jumps at the seam). A, today cleaned: today's plume (billows flying from the nozzle out over the wedge) with each billow stretched along its flight and overlapped into one flame mass, a white-gold core line off the nozzle, licking tips along the upper edge, and a warm far end (orange to red-orange, thinning to sparks; the grey smoke is gone). B, streaked flame: A's flight and mass, but every billow is a stretched teardrop of flame pointing along its flight with a hot core and a licking tail, so it reads as a fast flamethrower jet; at the far end the streaks curl up into rolling flame tongues and break into sparks. C, A with a magic touch: A exactly, plus a bright fire spell ring (about 15 px) at the staff that the jet pours through, and a thin broken arc of fire (gold / orange / red-orange, 2 px) on the wedge's far edge. Light: warm dithered pool, goblins in the wedge lit.",
  A: (c, e) => frame(c, e, optA), B: (c, e) => frame(c, e, optB), C: (c, e) => frame(c, e, optC),
}];
