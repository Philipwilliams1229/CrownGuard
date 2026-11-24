// Effects concepts, Round 10: the fire wizard's blast, softer, keeping today's outer ring (row fireblast10). See art/briefs/fx-round10.md.
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
const glow = (c, ms, sc = 1) => {
  const k = glowK(ms) * sc, rad = R * sc * (0.55 + 0.45 * cl(ms / REACH)); if (k < 0.04) return;
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

const FX0 = () => ({ type: "boom", x: 0, y: 0, r: 37, ttl: 320, life: 320 });
const fxAt = (e) => ({ ...FX0(), ttl: 320 * (1 - e.p) });
// the outer ring and its wash: ALWAYS the game's own "g" layer, called, never ported
const ground = (c, e) => { const PXu = G.PX || 2; c.save(); c.scale(PXu, PXu); G.drawBlast(c, fxAt(e), "g"); c.restore(); };
const frame = (c, e, air, gsc, under) => {
  const ms = e.p * LIFE, items = [], PXu = G.PX || 2;
  ground(c, e); glow(c, ms, gsc); if (under) under(c, ms);
  addKnights(c, ms, items, glowK(ms) * gsc);
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw();
  air(c, ms, e, PXu);                                                    // everything above the ground, after the actors, as today's "a" layer is
};
const fadeA = (ms, from = 400) => cl((ms - from) / (LIFE - from));

// ---- TODAY: the game's own boom (both layers) -------------------------------------------------------------------------------
const todayAir = (c, ms, e, PXu) => { c.save(); c.scale(PXu, PXu); G.drawBlast(c, fxAt(e), "a"); c.restore(); };
const today = (c, e) => frame(c, e, todayAir, 0.6);

// ---- A: no smoke: today's "a" layer exactly, with only its grey smoke pixels taken out; the fireball burns out to rising sparks -------
const scratch = BR ? document.createElement("canvas") : null;
const noSmoke = (c, ms, e, PXu) => {
  scratch.width = NW.cw; scratch.height = NW.ch; const k = scratch.getContext("2d"); k.imageSmoothingEnabled = false; k.clearRect(0, 0, NW.cw, NW.ch);
  k.save(); k.translate(NW.ax, NW.ay); k.scale(PXu, PXu); G.drawBlast(k, fxAt(e), "a"); k.restore();
  const im = k.getImageData(0, 0, NW.cw, NW.ch), d = im.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 38) d[i + 3] = 0; }   // smoke is grey; flame and embers are warm
  k.putImageData(im, 0, 0); c.drawImage(scratch, -NW.ax, -NW.ay);
  for (let s = 0; s < 9; s++) {                                          // where the fireball sinks (p 0.4-0.6): a few sparks lift off instead
    const t0 = ms - 190 - s * 22; if (t0 < 0 || t0 > 230) continue;
    const x = (H(s, 2) - 0.5) * 22 + Math.sin(t0 * 0.03 + s) * 2, y = -26 - t0 * 0.2 * (0.6 + H(s, 3));
    spark(c, x, y, 1 - t0 / 230, s % 3 === 0);
  }
};

// ---- B: a smaller flame: a lumpy puff of flame half today's size and lower, collapsing to a soft glow; fewer embers; no smoke, no rays ---
const puff = (c, cx, cy, r, ms, tones, sd) => {                            // a lumpy ball of flame: stepped tones, lit from above, a 1-px edge
  const m = Math.ceil(r * 1.3);
  for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
    const an = Math.atan2(y, x), e = 1 + 0.2 * Math.sin(3 * an + sd) + 0.13 * Math.sin(5 * an - sd * 1.7) + 0.08 * Math.sin(7 * an + ms / 60), d = Math.hypot(x, y * 1.08) / (r * e); if (d > 1) continue;
    const lit = d - (y < 0 ? 0.12 : -0.08);
    let col = lit < 0.3 ? tones[0] : lit < 0.58 ? tones[1] : lit < 0.82 ? tones[2] : tones[3];
    if (d > 0.9) col = tones[4];
    P(c, cx + x, cy + y, col);
  }
};
const EM = (n, ms, from, vy0, fall, col) => {};
const embersOut = (c, ms, N, up, y0) => {                                  // flung out, falling a little, cooling (today's, fewer, lower)
  for (let i = 0; i < N; i++) {
    const t0 = ms - 20 - H(i, 1) * 40, life = 330; if (t0 < 0 || t0 > life) continue;
    const q = t0 / life, a = H(i, 2) * TAU, d = (14 + 50 * H(i, 3)) * ease(q), x = Math.cos(a) * d, y = y0 + Math.sin(a) * d * SQ * 0.6 - (up ? 16 * q : 20 * q * (1 - q) * 2 - 14 * q * q) - 3;
    const col = q < 0.3 ? FIRE[0] : q < 0.6 ? FIRE[1] : FIRE[3];
    if (q > 0.8 && bay(i, Math.floor(ms / 30)) < (q - 0.8) * 5) continue;
    P(c, x, y, col); P(c, x + 1, y, col); P(c, x, y + 1, q < 0.5 ? FIRE[2] : FIRE[4]); if (i % 3 === 0) P(c, x + 1, y + 1, FIRE[3]);
  }
};
const smallFlame = (c, ms) => {
  const u = ms / LIFE, grow = ms < 70 ? 0.5 + ms / 140 : ms < 200 ? 1 : 1 - cl((ms - 200) / 150) * 0.75, cy = -9 - (ms < 200 ? 0 : (ms - 200) * 0.05);
  const tones = ms < 70 ? [FIRE[0], FIRE[0], FIRE[1], FIRE[2], FIRE[3]] : ms < 160 ? [FIRE[0], FIRE[1], FIRE[2], FIRE[3], FIRE[4]] : ms < 260 ? [FIRE[1], FIRE[2], FIRE[3], FIRE[4], FIRE[5]] : [FIRE[2], FIRE[3], FIRE[4], FIRE[4], FIRE[5]];
  if (ms < 350) puff(c, 0, cy, 12 * grow, ms, tones, 1.3 + Math.floor(ms / 70) * 0.7);
  if (ms >= 200) {                                                          // the soft glow it collapses into: a stepped dither on the ground that thins out
    const k = (1 - cl((ms - 200) / 300)) * 0.9, rad = 15; ember(c, 0, -2, rad, k);
  }
};
const flameB = (c, ms, e, PXu) => { smallFlame(c, ms); embersOut(c, ms, 7, false, -12); };

// ---- C: a flare, not a blast: a white-gold flash at the impact, a small cluster of flame licks curling up, embers drifting UP ----------
const licks = (c, ms, big) => {
  const q = cl((ms - 30) / 90), out = 1 - cl((ms - 250) / 150);
  if (q <= 0 || out <= 0) return;
  const hs = ease(q) * out * 1.35;
  [[-7, 3, 1, -0.5, 0.3], [7, 2, 1, 0.5, 0.7], [0, 1, 2, 0.1, 0.1], [-2, 4, 0, -0.9, 0.5], [3, 4, 0, 0.8, 0.2]].forEach(([x, y, sz, ln, ph], i) => tongue(c, x, y, { kind: [2, 2, 3, 0, 4][i], size: sz, lean: ln, ph, t: ms, hs, heat: 1 - i * 0.05, cool: 0.2 }));
  ember(c, 0, 1, 10, 0.8 * out);
};
const driftUp = (c, ms, N, start) => {
  for (let i = 0; i < N; i++) {
    const t0 = ms - start - H(i, 4) * 130, life = 260; if (t0 < 0 || t0 > life) continue;
    const q = t0 / life, x = (H(i, 5) - 0.5) * 30 + Math.sin(t0 * 0.025 + i) * 3, y = -6 - 40 * q * (0.6 + H(i, 6) * 0.5);
    if (bay(i, Math.floor(ms / 33)) < q * q * 0.8) continue;
    spark(c, x, y, 1, i % 4 === 0); P(c, x, y + 1, FIRE[3], 0.7);
  }
};
const flare = (c, ms, e, PXu) => {
  if (ms < 140) { const q = ms / 140, r = 5 + 8 * Math.sqrt(q); for (let y = -r; y <= r; y++) for (let x = -r - 2; x <= r + 2; x++) { const d = Math.hypot(x / 1.25, y) / r; if (d > 1 || bay(x, y) < q * q * 0.9) continue; P(c, x, y - 7, d < 0.45 ? FIRE[0] : d < 0.78 ? FIRE[1] : FIRE[2]); } }
  licks(c, ms, false); driftUp(c, ms, 14, 90);
};

// ---- D: a magic touch: C plus a faint, smaller ring of fire inside the outer one, a little behind it, and a thin pale wisp at the end -----
const innerRing = (c, ms) => {
  const msb = ms - 70, q = cl(msb / REACH); if (q <= 0) return;
  const r = R * 0.6 * ease(q) , fa = ms > 330 ? 1 - cl((ms - 330) / 150) : 1, th = 2, n = Math.round(r * 3.2);
  const tones = q < 0.4 ? [FIRE[1], FIRE[2]] : [FIRE[2], FIRE[3]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU; if (H(Math.floor(a * 9), 6) < 0.18) continue;                    // a broken line of fire, not a solid band
    if (bay(i, Math.floor(ms / 45)) > 0.95 * fa) continue;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * SQ; P(c, x, y, tones[0]); P(c, x, y + 1, tones[1]); if (a > 0.1 && a < Math.PI - 0.1) P(c, x, y + 2, FIRE[4], 0.6);
  }
};
const wisp = (c, ms) => {
  if (ms < 380) return; const q = (ms - 380) / (LIFE - 380);
  for (let i = 0; i < 12; i++) { const y = -10 - q * 26 - i * 2.4, x = Math.sin(i * 0.8 + q * 5) * (2 + i * 0.35); if (bay(i, Math.floor(ms / 40)) < 0.55 - q * 0.45) P(c, x, y, i < 6 ? "#d6cec8" : "#aea4a2", 0.7 * (1 - q)); }
};
const magic = (c, ms, e, PXu) => { flare(c, ms, e, PXu); wisp(c, ms); };

export const ROWS = [{
  id: "fireblast10", label: "Fire wizard's blast, softer (round 10)", group: "Round 10", ...NW, today,
  note: "The Pyromancer / Inferno Throne fireball with TODAY's outer fire ring kept exactly: every option calls the game's own drawBlast boom 'g' layer (ring, wash, cinders, timing), so the ring is identical in all five rows; only what stands above the ground changes (and the knight's white flash as the front reaches him is the same). TODAY is the full boom: starburst, cauliflower fireball, grey smoke. A, no smoke: today's fireball and embers exactly (taken from the game's own 'a' layer with the grey smoke pixels removed), then a few sparks lift off where the fireball used to sink into smoke. B, a smaller flame: no smoke and no starburst, a lumpy puff of flame half today's size and lower that collapses into a soft glow, seven embers instead of fourteen. C, a flare, not a blast: a white-gold flash at the point of impact for about 140 ms, a small cluster of curling flame licks, embers drifting up and fading; the ring does the talking. D, a magic touch: C plus a faint broken inner ring of fire a little behind the outer one, and a thin pale wisp of smoke at the very end. Light is a warm pool scaled to each option's flame.",
  A: (c, e) => frame(c, e, noSmoke, 1), B: (c, e) => frame(c, e, flameB, 0.65), C: (c, e) => frame(c, e, flare, 0.45), D: (c, e) => frame(c, e, magic, 0.5, innerRing),
}];
