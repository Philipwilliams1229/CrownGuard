// Effects concepts, Round 13: Dragonbreath's flame (row breath13), Fable's design. See art/briefs/fx-round13.md.
// The hall, road, goblins, light and TODAY are Round 12's (concept/fx-r12-breath.js). Cell units are ART pixels, origin = the hall's foot.
// The engine's wedge (half-angle 0.42, len 69 world units = 138 art px) is kept exactly. 16-frame true loop: every motion runs on whole multiples of the loop phase.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/paint.js")), ...(await import("/src/render/rigs.js")), ...(await import("/src/render/halls/wizard.js")), ...(await import("/src/render/flames.js")) } : {};

const TAU = Math.PI * 2, N = 16, CONE = 0.42, TANC = Math.tan(CONE);
const NW = { cw: 240, ch: 292, ax: 62, ay: 162, N };
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // the blast round's tones
const INK = "#8a2028", HOT = "#ffd860";
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

// =================================================================================================================================
// A (Fable): "the breath rolls down the road". Three parts, each one clean shape:
//   1. the GOUT: one tapered blade of flame from the staff's spell ring down to the road just past the hall's foot
//      (white-gold core, gold, orange, a deep red rim line; licks peel off its edges and ride down it);
//   2. the SPLASH where it lands: a low white-gold flare with a few tongues thrown outward;
//   3. the WAVES: broken crescents of fire that leave the splash and roll outward along the ground through the engine's
//      wedge, low (a goblin stands clear above them), each trailing swept-back licks and a hot wake, dying on the far arc.
// The wedge itself is marked by a thin broken ember line on its far arc and faint dotted sides. No smoke; sparks lift.
const frac = (v) => v - Math.floor(v);
const IMP = 0.46, WV = 3;
const impactOf = (ang) => { const L = Lart(); return { x: Math.cos(ang) * L * IMP, y: Math.sin(ang) * L * IMP - 2 }; };
const waveP = (i, k) => ((2 * i) / N + k / WV) % 1;
const waveS = (p) => { const L = Lart(); return L * 0.4 + (L * 0.985 - L * 0.4) * Math.pow(p, 0.9); };

const jet = (c, M, I, i) => {
  const C = { x: M.x + (I.x - M.x) * 0.85, y: M.y + (I.y - M.y) * 0.2 }, K = 48, S = [];
  for (let k = 0; k <= K; k++) { const u = k / K, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; S.push({ u, x: a * M.x + b * C.x + d * I.x, y: a * M.y + b * C.y + d * I.y }); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let k = 0; k <= K; k++) {
    const p = S[Math.max(0, k - 1)], q = S[Math.min(K, k + 1)], tx = q.x - p.x, ty = q.y - p.y, tl = Math.hypot(tx, ty) || 1;
    S[k].tx = tx / tl; S[k].ty = ty / tl; x0 = Math.min(x0, S[k].x); x1 = Math.max(x1, S[k].x); y0 = Math.min(y0, S[k].y); y1 = Math.max(y1, S[k].y);
  }
  const pad = 22;
  for (let y = Math.floor(y0 - pad); y <= Math.ceil(y1 + 2); y++) for (let x = Math.floor(x0 - pad); x <= Math.ceil(x1 + pad); x++) {
    const px = x + 0.5, py = y + 0.5;
    let best = 1e9, bk = 0;
    for (let k = 0; k <= K; k++) { const dx = px - S[k].x, dy = py - S[k].y, d2 = dx * dx + dy * dy; if (d2 < best) { best = d2; bk = k; } }
    const s = S[bk], u = s.u, al = (px - s.x) * s.tx + (py - s.y) * s.ty;
    if (bk === 0 && al < -0.5) continue;
    const d = Math.sqrt(best), side = (px - s.x) * s.ty - (py - s.y) * s.tx > 0 ? 1 : -1;     // +1 = the outer, upper side
    const w = 2 + 9 * Math.pow(u, 1.2);
    const K1 = side > 0 ? 6 : 5, f = frac(u * K1 + (side > 0 ? 0 : 0.37) - (K1 * i) / N), b = f < 0.12 ? f / 0.12 : Math.pow(1 - (f - 0.12) / 0.88, 1.7);
    const amp = (side > 0 ? 0.8 : 0.42) * Math.min(1, u * 3), edge = w * (1 + amp * b);
    if (d > edge) continue;
    const body = w * (1 + 0.14 * amp * b), lickIn = edge - (2.1 + 6 * f * f + 2 * f);          // a lick is a sliver peeling off, its tip upstream and clear of the body
    const inLick = d > body;
    if (inLick && d < lickIn) continue;
    const wav = Math.sin(u * 13 - (TAU * 3 * i) / N) * w * 0.16, dc = Math.abs(d * side - wav), g = d / w, core = w * 0.3 * (1 - u * 0.8) + 0.7;
    let t = dc < core && u < 0.94 ? 0 : dc < core + w * 0.2 ? 1 : g < 0.86 ? 2 : 3;
    if (inLick) t = 3;
    if (d > edge - 1.2 || (!inLick && d > body - 1.1)) t = inLick || lickIn > body + 0.5 || d > edge - 1.2 ? 4 : t;
    P(c, x, y, FIRE[t]);
  }
};

const splash = (c, I, i, items) => {
  const fl = FL[i % 4], rx = 17 + fl, ry = 6.5 + fl * 0.5;
  items.push({ y: I.y - 0.5, draw: () => {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = Math.hypot(x / rx, y / ry); if (d > 1) continue;
      if (d > 0.8 && bay((x + 64) & 1023, (y + 64 + i) & 1023) < (d - 0.8) * 5) continue;
      P(c, I.x + x, I.y + y, d < 0.38 ? FIRE[0] : d < 0.66 ? FIRE[1] : d < 0.88 ? FIRE[2] : FIRE[3]);
    }
  } });
  [[-13, 1, 4, -1.1, 1], [12, 2, 2, 1.2, 1], [-5, 3, 0, -0.5, 0], [6, -2, 3, 0.6, 0], [19, 0, 2, 1.3, 0]].forEach((q, k) => {
    const o = { kind: q[2], size: q[4], lean: q[3], ph: 0.2 * k, fr: FL[(i + k) % 4], heat: 1 };
    items.push({ y: I.y + q[1], draw: () => tongue(c, I.x + q[0], I.y + q[1], o) });
  });
};

// the ranks: each surge is a broken line of fire on the road (the fire wizard's inner ring, as an arc of the wedge) with a
// rank of flames standing on it, blown outward; the rank spreads as it runs, shrinks, and dies on the far arc
const RANK = 5;
const ranks = (c, ang, i, items) => {
  for (let k = 0; k < WV; k++) {
    const p = waveP(i, k), s = waveS(p), grow = Math.min(1, 0.35 + p / 0.14), fade = p > 0.68 ? 1 - (p - 0.68) / 0.32 : 1;
    const n = Math.ceil(s * 2 * CONE * 1.5), t0 = p < 0.4 ? 0 : 1;
    for (let j = 0; j <= n; j++) {                                   // the line on the ground
      const a = ang - CONE * 0.95 + (j / n) * CONE * 1.9;
      if (H(Math.floor((a - ang) * 14 + 40), k + 3) < 0.2) continue;
      const x = Math.cos(a) * s, y = Math.sin(a) * s;
      if (fade < 1 && bay(Math.floor(x) & 1023, Math.floor(y + 512) & 1023) > fade * 1.3) continue;
      P(c, x, y, FIRE[t0]); P(c, x - 1, y, FIRE[t0 + 1]); P(c, x - 2, y, FIRE[3], 0.8);
    }
    for (let j = 0; j < RANK; j++) {                              // patches of two to four tongues sharing a root (the burning ground's flames)
      const hk = k * 31 + j, a = ang + CONE * 0.88 * (((j + 0.5) / RANK) * 2 - 1 + (H(hk, 1) - 0.5) * 0.2), sj = s - 1 + (H(hk, 2) - 0.5) * 15;
      const h = (9 + 8 * H(hk, 3)) * grow * (0.3 + 0.7 * fade); if (h < 3.5) continue;
      const x = Math.round(Math.cos(a) * sj), y = Math.round(Math.sin(a) * sj), blow = 0.4 * Math.cos(a), nt = 2 + Math.floor(H(hk, 4) * 2.99), heat = 0.75 + 0.35 * fade;
      const T = [[0, 1, 0, 3], [-3, 0.62, -0.45, 0], [3, 0.72, 0.5, 0], [-1, 0.45, 0.1, 2]].slice(0, nt).reverse();
      items.push({ y: y + 0.3, draw: () => { T.forEach((q, m) => { const hh = h * q[1]; tongue(c, x + q[0] * (0.6 + h / 22), y, { kind: q[3], h: hh, w: 1.6 + hh * 0.27, lean: blow + q[2], ph: H(hk, 6 + m), fr: FL[(i + hk + m) % 4], heat }); }); } });
    }
  }
};

// the road under the breath: a quiet dither over exactly the damage wedge, hotter in each crescent's wake
const floor13 = (c, ang, i) => {
  const L = Lart(), ws = []; for (let k = 0; k < WV; k++) { const p = waveP(i, k); ws.push([waveS(p), p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1]); }
  for (let y = -Math.ceil(L); y <= Math.ceil(L); y++) for (let x = 0; x <= Math.ceil(L); x++) {
    const da = inWedge(x + 0.5, y + 0.5, ang, L * 0.27, L * 0.985); if (da < 0) continue;
    const s = Math.hypot(x + 0.5, y + 0.5);
    let dd = 0.16 * (1 - 0.5 * da / CONE);
    for (const [sw, fd] of ws) if (s < sw && s > sw - 26) dd += 0.5 * fd * (1 - (sw - s) / 26) * (1 - 0.4 * da / CONE);
    const st = Math.min(4, Math.ceil(dd * 6)) / 6;
    if (bay(x & 1023, (y + 512) & 1023) < st) P(c, x, y, st > 0.45 ? FIRE[2] : FIRE[3], 0.6);
  }
};

// the wedge's edge: a thin broken ember line on the far arc (it flares as a crescent arrives), faint dotted sides
const edge13 = (c, ang, i) => {
  const L = Lart(), s = L * 0.99, n = Math.round(s * CONE * 2 * 1.5);
  let hit = 0; for (let k = 0; k < WV; k++) { const p = waveP(i, k); if (p > 0.82) hit = Math.max(hit, (p - 0.82) / 0.18); else if (p < 0.1) hit = Math.max(hit, 1 - p / 0.1); }
  for (let k = 0; k <= n; k++) {
    const a = ang - CONE * 0.98 + (k / n) * CONE * 1.96, x = Math.cos(a) * s, y = Math.sin(a) * s;
    if (H(Math.floor(k / 5), 3) < 0.22) continue;
    P(c, x, y, hit > 0.5 ? FIRE[1] : FIRE[2]); P(c, x, y + 1, FIRE[3]); if (hit > 0.5) P(c, x, y - 1, FIRE[2], 0.9);
  }
  for (const sg of [-1, 1]) for (let r = L * 0.3; r < L * 0.97; r += 1) {
    if ((Math.floor(r) % 5) > 1) continue;
    const a = ang + sg * CONE; P(c, Math.cos(a) * r, Math.sin(a) * r, FIRE[3], 0.75);
  }
};

const fable = (c, e) => {
  const ang = aimAt(e.i), t = mkT(ang), time = 1.2, M = mouthOf(t), I = impactOf(ang), items = [];
  road(c, e.ground === "dark");
  pool(c, ang, 0.45, 1);
  floor13(c, ang, e.i); edge13(c, ang, e.i);
  hallAt(c, t, time);
  GOB.forEach((g, k) => items.push(gobItem(c, e, g, k, ang, 1)));
  items.push({ y: I.y - 1, draw: () => jet(c, M, I, e.i) });
  splash(c, I, e.i, items); ranks(c, ang, e.i, items);
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  sparks(c, ang, e.i, 14, 0.9, 0.45, 40);
};

export const ROWS = [{
  id: "breath13", label: "Dragonbreath's flame (round 13, Fable)", group: "Round 13", oneCol: true, ...NW, today,
  note: "Every cell is the real Dragonbreath spire (staff levelled, breath held, the aim sweeping across the road and back, a 16-frame loop) with five goblins on the road; the right-hand one stands past the reach and is untouched. TODAY: the game's own drawBreath (not built to loop, so it jumps at the seam). A (Fable), the breath rolls down the road: instead of one big mass hanging in the air over the foes, the fire is split into what happens in the air and what happens on the ground. In the air: ONE clean blade of flame from the spell ring at the staff, white-gold down its middle, gold, orange, a deep red line round it, slivers of flame peeling off its edges and riding down it; it lands on the road just past the hall's foot, so it never crosses the goblins. On the ground: where it lands, surges of fire leave one after another and run outward through the damage wedge to its far edge, each a thin broken line of fire on the road (the fire wizard's inner ring, as an arc) carrying a rank of small flame patches (two to four rounded tongues sharing a root, as on the Inferno Throne's burning ground). The flames are knee-high and sorted with the figures, so every goblin stays readable, standing in the fire; the road glows in each surge's wake. The wedge is the engine's own (half-angle 0.42, 69 units), marked only by a thin broken ember line on its far arc and faint dotted sides. No smoke anywhere; a few sparks lift off. Bottom strip: the same on dark ground.",
  A: fable,
}];
