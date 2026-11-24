// Effects concepts, Round 9: the fire wizard's blast (row fireblast9). See art/briefs/fx-round9.md.
// Painters get (c, e): c is a cell canvas translated to (ax, ay) = the blast's centre, 1 unit = 1 art px, e.p 0..1 over 530 ms.
// Engine timing for all four: the damage front leaves the centre at once and reaches the rim (37 units = 74 art px) at 384 ms; nothing left at 530 ms.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/fx.js")), ...(await import("/src/render/paint.js")), ...(await import("/src/render/rigs.js")) } : {};

const TAU = Math.PI * 2, SQ = 0.7, R = 74, LIFE = 530, REACH = 384;
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // white-gold, gold, orange, red-orange, crimson, violet edge
const INK = "#5a1838", HOT = "#ffd860", MAG = "#a8408c";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => 1 - (1 - cl(t)) * (1 - cl(t));
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const NW = { cw: 220, ch: 190, ax: 110, ay: 112, N: 12 };
const KN = [{ x: -50, y: 20, flip: false, in: true }, { x: 92, y: 20, flip: true, in: false }];
const ell = (x, y) => Math.hypot(x, y / SQ);
const front = (ms) => R * cl(ms / REACH);

// ---- the two knights: flash when the front reaches the one inside, then warm-lit -------------------------------------------------
const tinted = (cv, col, a) => { const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height; const k = t.getContext("2d"); k.drawImage(cv, 0, 0); k.globalCompositeOperation = "source-atop"; k.globalAlpha = a; k.fillStyle = col; k.fillRect(0, 0, t.width, t.height); return t; };
const knight = (c, k, st) => {
  const s = G.rigFrame("knight", "walk", 0, st.flash ? "white" : ""), PXu = G.PX || 2, ax = Math.round(s.ax * PXu), ay = Math.round(s.ay * PXu);
  c.save(); c.translate(k.x, k.y); if (k.flip) c.scale(-1, 1);
  c.globalAlpha = st.flash ? 0.9 : 1; c.drawImage(s.cv, -ax, -ay);
  if (!st.flash && st.lit > 0) { c.globalAlpha = 0.3 * st.lit; c.drawImage(tinted(s.cv, "#ff9a30", 1), -ax, -ay); }
  c.globalAlpha = 1; c.restore();
};
const addKnights = (c, ms, items, gl) => {
  const dt = LIFE / (NW.N - 1);
  for (const k of KN) {
    const d = ell(k.x, k.y), hit = k.in && front(ms) >= d - 1, just = hit && front(ms - dt) < d - 1;
    items.push({ y: k.y, draw: () => knight(c, k, { flash: just, lit: just ? 0 : gl * (hit ? 1 : 0.6) * cl(1.3 - d / (R * 1.5)) }) });
  }
};

// ---- light: a warm dithered pool on the ground, as addLight would give --------------------------------------------------------------
const glowK = (ms) => ms < 60 ? ms / 60 : Math.max(0, 1 - (ms - 60) / (LIFE - 60)) * 0.9;
const glow = (c, ms) => {
  const k = glowK(ms), rad = R * (0.55 + 0.45 * cl(ms / REACH)); if (k < 0.04) return;
  const m = Math.ceil(rad + 2), my = Math.ceil((rad + 2) * SQ);
  for (let y = -my; y <= my; y++) for (let x = -m; x <= m; x++) {
    const d = Math.hypot(x + 0.5, (y + 0.5) / SQ); if (d > rad) continue;
    const st = Math.ceil(cl(k * (1 - d / rad) * 1.4) * 5) / 5;
    if (st > 0 && bay(x & 1023, y & 1023) < st * 0.8) P(c, x, y, st > 0.6 ? "#ffc060" : "#ff8a30", 0.45);
  }
};

// ---- flame tongues: five silhouettes x three sizes x three flicker frames, chosen per flame by hash --------------------------------
// kind 0 wide-based teardrop, 1 forked two tips, 2 curled lick (leans hard, hooked tip), 3 bulb (fat middle), 4 teardrop with a side flame
// (x, y) = its foot; o: kind, size 0..2, lean -1..1 (the tip sweeps that way), ph 0..1 (flicker phase), t ms, hs height scale, heat 0..1, h / w overrides
const SZ = [[10, 3.4], [16, 5], [24, 7]];
const tongue = (c, x, y, o) => {
  const { kind = 0, size = 1, lean = 0, ph = 0, t = 0, hs = 1, heat = 1, cool = 0 } = o, fr = Math.floor(t / 75 + ph * 3) % 3;
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
        if (u > 0.82 && (size === 2 || cool > 0) && bay(px, yy) < (u - 0.8) * 4.5) col = u > 0.93 ? MAG : FIRE[5];
        if (d > 0.88 || k === 0) col = d > 0.93 || k === 0 ? INK : FIRE[4];
        P(c, px, yy, col);
      }
    }
  }
  P(c, x + lean * h * (kind === 2 ? 0.75 : 0.42) * 0.95, y - h, INK);
};
const hashK = (a, b) => ({ kind: Math.floor(H(a, b) * 5), ph: H(a + 3, b + 1) });
const ember = (c, x, y, r, k = 0.8) => {                                  // a soft orange glow on the ground under flames, stepped and dithered
  const ry = Math.max(1, Math.round(r * SQ));
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx / r, dy / ry); if (d > 1) continue;
    const st = (1 - d) * k * 1.6; if (bay(Math.floor(x) + dx, Math.floor(y) + dy) < Math.min(0.9, st)) P(c, x + dx, y + dy, st > 0.7 ? FIRE[1] : FIRE[2], 0.7);
  }
};
const spark = (c, x, y, a = 1, big = 0) => { P(c, x, y, big ? FIRE[0] : HOT, a); if (big) { P(c, x + 1, y, FIRE[2], a * 0.8); P(c, x, y + 1, FIRE[2], a * 0.8); } };
const flashDisc = (c, ms, last, rad) => {
  if (ms > last) return; const q = ms / last, r = rad * (0.5 + 0.8 * Math.sqrt(q)), fd = q;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
    const d = Math.hypot(x, y * 1.1) / r; if (d > 1 || bay(x, y) < fd * 0.9) continue;
    P(c, x, y - 4, d < 0.45 ? FIRE[0] : d < 0.75 ? FIRE[1] : FIRE[2]);
  }
};
const frame = (c, e, paint) => {
  const ms = e.p * LIFE, items = [];
  glow(c, ms); paint(c, ms, items, e);
  addKnights(c, ms, items, glowK(ms));
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
};
const fadeA = (ms, from = 400) => cl((ms - from) / (LIFE - from));
const kept = (fade, x, y) => fade === 0 || bay(Math.floor(x) & 1023, Math.floor(y) & 1023) > fade;
const sizeAt = (rho) => (rho < 22 ? 0 : rho < 46 ? 1 : 2);

// ---- A: flame bloom: twelve tongues run out along the ground, each a ragged cluster of big flames leaning outward, guttering to sparks ----
const NA = 12;
const bloom = (c, ms, items) => {
  const f = front(ms), fade = fadeA(ms, 330), gut = 1 - cl((ms - 290) / 190);
  flashDisc(c, ms, 170, 20);
  for (let k = 0; k < NA; k++) {
    const a0 = (k / NA) * TAU + H(k, 1) * 0.15, curl = 0.9 + H(k, 2) * 0.5;
    for (let j = 0; j < 3; j++) {
      const rho = f * (0.95 - j * 0.2) * (0.94 + 0.06 * H(k, 9 + j)); if (rho < 8) continue;
      const a = a0 + curl * (rho / R) * 0.9 + (H(k, j + 30) - 0.5) * 0.12, x = Math.cos(a) * rho, y = Math.sin(a) * rho * SQ;
      const sz = Math.max(0, sizeAt(rho) - (j && H(k, j) < 0.5 ? 1 : 0)), o = { ...hashK(k, j), size: sz, lean: cl(Math.cos(a) * 0.9 + (H(k, j + 7) - 0.5) * 0.4, -1, 1), t: ms + k * 40, hs: gut * (0.85 + 0.3 * H(k, j + 11)), heat: 1 - j * 0.12, cool: j ? 0.1 : 0 };
      if (gut < 0.1 || !kept(fade * 0.7, x + j, y)) continue;
      if (j === 0) ember(c, Math.round(x), Math.round(y), 9, 0.7 * gut);
      items.push({ y: y + 1, draw: () => tongue(c, x, y, o) });
    }
    if (ms > 120) for (let s = 0; s < 3; s++) {
      const t0 = ms - 100 - s * 90 - k * 7; if (t0 < 0 || t0 > 260) continue;
      const rho = f * (0.35 + 0.6 * H(k, 20 + s)), a = a0 + curl * (rho / R) * 0.9;
      const x = Math.cos(a) * rho + (H(k, s) - 0.5) * 6, y = Math.sin(a) * rho * SQ - 12 - t0 * 0.09;
      items.push({ y: 99, draw: () => spark(c, x, y, 1 - t0 / 260, s === 0) });
    }
  }
};

// ---- B: fire sigil: a double burning circle with fire runes between and three spokes runs out to the rim, then a full lumpy column of flame ---
const burnLine = (c, x0, y0, x1, y1, ms, fade, seed) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, (y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; if (!kept(fade, x, y)) continue;
    const fl = H(i + Math.floor(ms / 60), seed) < 0.4;
    P(c, x, y, fl ? FIRE[0] : HOT); P(c, x, y + 1, FIRE[3]); if (fl) P(c, x, y - 1, FIRE[2]);
  }
};
const GLYPH = [[[0, 0, .5, 1], [.5, 1, 1, 0]], [[0, 0, 1, .5], [1, .5, 0, 1], [.5, .2, .5, .8]], [[0, 1, 0, 0], [0, 0, 1, .4], [0, .5, 1, 1]], [[0, 0, 1, 1], [0, 1, 1, 0]], [[.5, 0, .5, 1], [0, .4, .5, .15], [1, .4, .5, .15]]];
const sigil = (c, ms, items) => {
  const f = front(ms), fade = fadeA(ms, 420), r1 = f, r2 = f * 0.7;
  const ring = (r, seed) => {
    if (r < 3) return; const n = Math.max(24, Math.round(r * 2.4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r * SQ; if (!kept(fade, x, y)) continue;
      const fl = H(i + Math.floor(ms / 55), seed) < 0.45;
      P(c, x, y, fl ? FIRE[0] : HOT); P(c, x, y + 1, FIRE[3]); P(c, x, y + 2, INK, 0.6);
    }
  };
  ring(r1, 1); ring(r2, 2);
  if (r1 > 10) for (let i = 0; i < 6; i++) {                              // a few small flames on the outer line
    const a = (i / 6) * TAU + 0.3, x = Math.cos(a) * r1, y = Math.sin(a) * r1 * SQ;
    if (kept(fade, x, y)) items.push({ y: y + 1, draw: () => tongue(c, x, y, { ...hashK(i, 5), size: 0, lean: Math.cos(a) * 0.6, t: ms, ph: H(i, 2), hs: 1 - fade }) });
  }
  if (ms > 70) {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU - 1.2; burnLine(c, Math.cos(a) * r2, Math.sin(a) * r2 * SQ, Math.cos(a) * r1, Math.sin(a) * r1 * SQ, ms, fade, 9 + i); }
    for (let i = 0; i < 9; i++) {                                         // the runes: angular marks between the two lines
      const a = (i / 9) * TAU + 0.45, rm = (r1 + r2) / 2, gw = Math.max(3, rm * 0.14), gh = gw * 1.3, cx = Math.cos(a) * rm - gw / 2, cy = Math.sin(a) * rm * SQ - gh * SQ / 2;
      for (const sg of GLYPH[(i * 2 + (i > 4 ? 1 : 0)) % 5]) burnLine(c, cx + sg[0] * gw, cy + sg[1] * gh * SQ, cx + sg[2] * gw, cy + sg[3] * gh * SQ, ms, fade, i);
    }
  }
  if (ms < 90) flashDisc(c, ms, 90, 14);
  const pu = cl((ms - 120) / 90), pd = cl((ms - 330) / 120);               // rises fast (90 ms), then collapses (120 ms)
  if (pu > 0 && pd < 1) {
    const sc = ease(pu) * (1 - pd * pd), wob = Math.sin(ms / 40);
    items.push({ y: 3, draw: () => {
      tongue(c, -9, 2, { kind: 3, ph: 0.1, t: ms, h: 52 * sc, w: 8, lean: -0.15, heat: 0.9 });
      tongue(c, 9, 2, { kind: 3, ph: 0.6, t: ms, h: 46 * sc, w: 8, lean: 0.2, heat: 0.9 });
      tongue(c, 0, 3, { kind: 3, ph: 0.35, t: ms, h: (74 + wob * 4) * sc, w: 13, lean: 0.05, heat: 1, cool: 1 });
      tongue(c, -4, 4, { kind: 1, ph: 0.8, t: ms, h: 40 * sc, w: 6, lean: -0.3, heat: 1 }); tongue(c, 5, 4, { kind: 4, ph: 0.2, t: ms, h: 34 * sc, w: 6, lean: 0.3, heat: 1 });
    } });
  }
  if (ms > 280) for (let s = 0; s < 22; s++) {
    const t0 = ms - 280 - H(s, 1) * 80, life = 190; if (t0 < 0 || t0 > life) continue;
    const x = (H(s, 2) - 0.5) * 30 + Math.sin(t0 * 0.03 + s) * 3, y = -8 - t0 * 0.22 * (0.6 + H(s, 3));
    items.push({ y: 99, draw: () => spark(c, x, y, 1 - t0 / life, s % 4 === 0) });
  }
};

// ---- C: fire vortex: three arms of big flames leaning along the spiral over a warm ground glow, a heat shimmer, then embers float up ------
const vortex = (c, ms, items) => {
  const f = front(ms), fade = fadeA(ms, 380), spin = ms / 150;
  flashDisc(c, ms, 110, 14);
  for (let arm = 0; arm < 3; arm++) {
    for (let j = 0; j < 30; j++) {                                        // the heat glow: a soft orange trail on the ground along the whole arm
      const u = (j + 1) / 30, rho = u * f, a = (arm / 3) * TAU + spin + u * 3.4; if (rho < 4) continue;
      const x = Math.cos(a) * rho, y = Math.sin(a) * rho * SQ; if (kept(fade * 0.8, x, y)) ember(c, Math.round(x), Math.round(y), 5 + Math.round(u * 4), 0.75 * (1 - fade));
    }
    for (let j = 0; j < 5; j++) {
      const u = 0.22 + j * 0.19 + H(arm, j) * 0.04, rho = u * f; if (rho < 8) continue;
      const a = (arm / 3) * TAU + spin + u * 3.4, x = Math.cos(a) * rho, y = Math.sin(a) * rho * SQ;
      if (!kept(fade * 0.8, x, y)) continue;
      const o = { ...hashK(arm * 7 + j, 4), size: sizeAt(rho * 1.1), lean: cl(-Math.sin(a) * 0.95, -1, 1), t: ms + arm * 90, hs: (1 - fade * 0.8) * (0.85 + 0.3 * H(arm, j + 5)), heat: 1 - u * 0.4, cool: u * 0.3 };
      items.push({ y: y + 1, draw: () => tongue(c, x, y, o) });
    }
  }
  if (ms > 40 && ms < 400) for (let i = 0; i < 40; i++) {
    const u = H(i, 1), rho = u * f * 0.95, a = H(i, 2) * TAU + spin * 0.7 + u * 3.4 + 1.05, x = Math.cos(a) * rho, y = Math.sin(a) * rho * SQ - 2;
    if (bay(i, Math.floor(ms / 50)) < 0.5) { P(c, x, y, HOT, 0.45); P(c, x + 1, y, HOT, 0.45); P(c, x + 2, y, HOT, 0.25); }
  }
  for (let i = 0; i < 36; i++) {
    const born = (H(i, 4) * 0.8 + 0.1) * REACH * 0.9, t0 = ms - born - 20; if (t0 < 0 || t0 > 280) continue;
    const rho = H(i, 5) * R * (0.9 * cl(born / REACH) + 0.1), a = H(i, 6) * TAU, x = Math.cos(a) * rho + Math.sin(t0 * 0.025 + i) * 2.5, y = Math.sin(a) * rho * SQ - 6 - t0 * 0.12 * (0.6 + H(i, 7));
    items.push({ y: 99, draw: () => spark(c, x, y, 1 - t0 / 280, i % 5 === 0) });
  }
};

// ---- D: molten splash: a hot ring runs out ahead, the globs land on it and spread into flat glowing pools that dim and crust at the edge ---
const GD = [];
for (let k = 0; k < 12; k++) GD.push({ a: (k / 12) * TAU + H(k, 1) * 0.5, rho: R * (0.3 + 0.7 * ((k % 6) / 5)), s: 3 + (k % 3 === 0 ? 1 : 0), h: 20 + H(k, 3) * 14, sd: k });
for (const o of GD) { o.land = 40 + (REACH - 40) * (o.rho / R); o.tx = Math.round(Math.cos(o.a) * o.rho); o.ty = Math.round(Math.sin(o.a) * o.rho * SQ); }
const pool = (c, x, y, r, sd, cool) => {                                 // a flat irregular blob: bright middle, darker rim, a 1-px crust line that creeps in as it cools; no speckle
  const ry = Math.max(1, Math.round(r * SQ));
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) {
    const an = Math.atan2(dy / SQ, dx), edge = 1 + 0.16 * Math.sin(3 * an + sd) + 0.1 * Math.sin(5 * an + sd * 2), d = Math.hypot(dx / r, dy / ry) / edge; if (d > 1) continue;
    let col = d < 0.3 - cool * 0.3 ? FIRE[1] : d < 0.62 - cool * 0.2 ? FIRE[2] : FIRE[3];
    if (d > 0.88 - cool * 0.25) col = d > 0.96 ? INK : FIRE[4];
    P(c, x + dx, y + dy, col);
  }
};
const molten = (c, ms, items) => {
  const fade = fadeA(ms, 420), f = front(ms); flashDisc(c, ms, 120, 18);
  if (ms > 10 && ms < 470) {                                             // the wave: a thin hot ring runs ahead of the pools to the rim, then cools and fades
    const q = cl((ms - REACH) / 100), n = Math.round(f * 2.6);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * f, y = Math.sin(a) * f * SQ; if (bay(i, Math.floor(ms / 40)) < 0.9 - q) { P(c, x, y, q < 0.3 ? FIRE[0] : FIRE[1], 1 - q); P(c, x, y + 1, FIRE[3], 1 - q); } }
  }
  if (ms < 200) { const q = ms / 200; for (let i = 0; i < 3; i++) items.push({ y: 2, draw: () => tongue(c, (i - 1) * 5, 1, { kind: i === 1 ? 3 : 0, size: 1, lean: (i - 1) * 0.3, t: ms, ph: i * 0.3, hs: 1 - q * 0.7 }) }); }
  for (const o of GD) {
    const u = (ms - 20) / (o.land - 20);
    if (u > 0 && u < 1) {
      const e0 = ease(u), x = Math.cos(o.a) * o.rho * e0, y = Math.sin(o.a) * o.rho * SQ * e0 - 4 * o.h * u * (1 - u) - 2 * (1 - e0);
      items.push({ y: o.ty + 1, draw: () => {
        for (let n = 1; n <= 4; n++) { const uu = Math.max(0, u - n * 0.05), ee = ease(uu), tx = Math.cos(o.a) * o.rho * ee, ty = Math.sin(o.a) * o.rho * SQ * ee - 4 * o.h * uu * (1 - uu); P(c, tx, ty, n < 3 ? FIRE[2] : FIRE[4], 1 - n * 0.2); }
        const s = o.s - 1; for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) { const d = Math.hypot(dx, dy); if (d <= s + 0.4) P(c, x + dx, y + dy, d > s - 0.3 ? FIRE[3] : d > s * 0.4 ? FIRE[2] : FIRE[0]); }
      } });
    } else if (u >= 1) {
      const age = ms - o.land, r = Math.round(o.s * (1.3 + 0.9 * ease(age / 70))) + 1, cool = cl(age / 300);
      if (!kept(fade * 0.9 + cool * 0.1, o.tx, o.ty)) continue;
      items.push({ y: o.ty - 3, draw: () => {
        pool(c, o.tx, o.ty, r, o.sd, cool);
        if (age < 130) for (let d = 0; d < 5; d++) { const dd = age / 130, a = o.a + (d - 2) * 0.7, x = o.tx + Math.cos(a) * 9 * ease(dd), y = o.ty + Math.sin(a) * 6 * ease(dd) - 4 * 7 * dd * (1 - dd) - 1; P(c, x, y, FIRE[2]); P(c, x + 1, y, FIRE[1]); }
        if (age < 300) tongue(c, o.tx, o.ty, { kind: o.sd % 5, size: 0, lean: Math.cos(o.a) * 0.4, ph: H(o.sd, 2), t: ms, hs: 1 - age / 300 });
      } });
    }
  }
};

// ---- TODAY: the game's own boom ----------------------------------------------------------------------------------------------------
const today = (c, e) => {
  const PXu = G.PX || 2, ms = e.p * LIFE, items = [];
  const fx = { type: "boom", x: 0, y: 0, r: 37, ttl: 320 * (1 - e.p), life: 320 };
  c.save(); c.scale(PXu, PXu); G.drawBlast(c, fx, "g"); c.restore();
  addKnights(c, ms, items, glowK(ms) * 0.6);
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  c.save(); c.scale(PXu, PXu); G.drawBlast(c, fx, "a"); c.restore();
};

export const ROWS = [{
  id: "fireblast9", label: "Fire wizard's blast (round 9)", group: "Round 9", ...NW, today,
  note: "The Pyromancer / Inferno Throne fireball at TRUE scale (reach 37 units = 74 art px, 0.7 tall), 530 ms: a damage front leaves the centre and reaches the rim at 384 ms, nothing is left at 530 ms. One knight inside the reach (flashes as the front reaches him) and one outside. TODAY is the game's boom, shared with the bombardier's shell. All flames are real tongues: five silhouettes (teardrop, forked, curled lick, bulb, teardrop with a side flame) in three sizes with three flicker frames, white-gold core to crimson edge, violet tip on the biggest. A: flame bloom, a white-gold flash, then twelve tongues run out along the ground as ragged clusters of big flames leaning outward over an ember glow, guttering into sparks; no smoke. B: fire sigil, a double burning circle with nine fire runes between the lines and three spokes runs out to the rim, then a full lumpy column of flame rises fast and collapses into rising sparks. C: fire vortex, three spiral arms of big flames leaning along the spin over a warm glow on the ground, a heat shimmer, then embers float up. D: molten splash, a thin hot ring runs out ahead, twelve globs of liquid fire land on it (the farthest on the rim at 384 ms) and spread into flat glowing pools that dim and crust at the edge. All lit with a warm pool on the ground and the near knight.",
  A: (c, e) => frame(c, e, bloom), B: (c, e) => frame(c, e, sigil), C: (c, e) => frame(c, e, vortex), D: (c, e) => frame(c, e, molten),
}];
