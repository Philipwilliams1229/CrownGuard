// Effects concepts, Round 18: fire on a foe (row burn18). See art/briefs/fx-round18.md. Owned by artist 2.
// KEEP from the game's statusBurn (src/render/statusfx.js, Round 5 B): the burning OUTLINE (the hot band rolling round the
// figure's own edge pixels, cooler round the face), the GLOW (the stepped ground pool, the warm ring outside the back, the
// warm wash on the lower body), copied line for line below. REDO only the flames that rise off the body, in Dragonbreath's
// look (src/render/flames.js drawBreath / concept/fx-r17-a.js): one dense mottled mass of gold / orange / deep orange /
// red-orange clusters stretched along the flame's motion (here: up), a broken pale core, a darker red tinted 1-px rim, ragged
// licks, no smoke (today's smoke puffs are left out: Dragonbreath has none and the owner rejected smoke along the way).
// Every option is baked the game's way: once per (figure frame canvas, step) into a canvas anchored on the feet, stamped with
// one drawImage, so it can go into statusfx.js as it stands. LOOP steps a loop (today bakes 12 and plays 8 of them, see note).
// The cell: goblin, orc and troll walking at board size (1 art px = 1 px), then the goblin enlarged x2 in an inset.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/paint.js")), ...(await import("/src/render/rigs.js")), ...(await import("/src/render/statusfx.js")) } : {};

const TAU = Math.PI * 2, LOOP = 16;
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];       // statusfx's tones (outline + glow)
const BFIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];      // Dragonbreath's tones (the flames)
const INK = "#8a2028";                                                                  // Dragonbreath's tinted rim
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const px = (c, x, y, col, a = 1) => { if (a <= 0) return; if (a < 1) c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); if (a < 1) c.globalAlpha = 1; };
const FIFTH = (a) => Math.ceil(Math.min(1, Math.max(0, a)) * 5 - 1e-6) / 5;
const fr1 = (v) => v - Math.floor(v);
const cl1 = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const per = (i, n) => ((i % n) + n) % n;
const cell = (a, b, n) => H(per(a, n), b);                    // hashed cells, periodic (seamless loops)

// ---- the figures: the game's own walk frames (art px), their silhouettes read once (statusfx's maskOf, art-px anchors) ----
const fig = (type, f) => { const s = G.rigFrame(type, "walk", ((f % 8) + 8) % 8, ""); return { cv: s.cv, ax: s.ax * G.PX, ay: s.ay * G.PX }; };
const MASKS = new WeakMap();
const maskOf = (s) => {
  let m = MASKS.get(s.cv); if (m) return m;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const ox = Math.round(s.ax), oy = Math.round(s.ay), Gm = new Uint8Array(w * h);
  let top = 1e9, xl = 1e9, xr = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { Gm[y * w + x] = 1; top = Math.min(top, y - oy); xl = Math.min(xl, x - ox); xr = Math.max(xr, x - ox); }
  const has = (x, y) => { x += ox; y += oy; return x >= 0 && y >= 0 && x < w && y < h && Gm[y * w + x] === 1; };
  const list = [], open = [], tops = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Gm[y * w + x]) {
    const X = x - ox, Y = y - oy; list.push([X, Y]);
    if (!has(X - 1, Y) || !has(X + 1, Y) || !has(X, Y - 1) || !has(X, Y + 1)) open.push([X, Y]);
    if (!has(X, Y - 1)) tops.push([X, Y]);
  }
  m = { has, list, open, tops, top, xl, xr, T: Math.max(8, -top), cx: Math.round((xl + xr) / 2) };
  MASKS.set(s.cv, m); return m;
};

// ---- KEPT: the ground pool, the burning outline, the warm ring and the wash (statusfx.js burnBake, verbatim but for LOOP) ----
const glowUnder = (c, m, f, free) => {
  const { cx, xl, xr } = m, t = f / LOOP, ph = t * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2), span = xr - xl;
  const rx = Math.round(span * 0.8 + 16);
  for (let y = -6; y <= 8; y++) for (let x = -rx; x <= rx; x++) {
    const X = cx - 3 + x, r = Math.hypot(x / rx, (y - 1) / 7); if (r > 1) continue;
    const s = FIFTH((1 - r) * 1.6 * amp); if (s <= 0 || (s < 0.4 && bay(X, y) > s * 2.5)) continue;
    free(X, y, r < 0.35 ? FIRE[1] : FIRE[2], s * 0.55);
  }
};
const outlineOver = (c, m, f, isFace) => {
  const { T, cx, has } = m, t = f / LOOP, ph = t * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2);
  for (const [x, y] of m.open) {
    const v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H(x, y) - 0.5) * 0.4;
    const s = v * (cl1(1 - -y / (T + 2)) * 0.5 + 0.5) * (isFace(x, y) ? 0.55 : 1);
    px(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]);
  }
  for (const [x, y] of m.list) { if (has(x - 1, y) || x > cx) continue; px(c, x - 1, y, bay(x + 64, y + 64) < 0.6 * amp ? FIRE[1] : FIRE[2], 0.8); if (bay(x + 66, y + 64) < 0.5 * amp && !has(x - 2, y)) px(c, x - 2, y, FIRE[3], 0.6); }
  for (const [x, y] of m.list) { const k = cl1(1 - -y / (T * 0.7)); if (k > 0 && bay(x + (f & 1), y) < FIFTH(k * 0.35 * amp)) px(c, x, y, FIRE[3], 0.28); }
};

// ---- NEW: a Dragonbreath tongue ------------------------------------------------------------------------------------------------
// Rises from (x0, y0), h tall, w half-width at the root, `lean` px back per px up (negative = behind a right-facing foe).
// One mottled mass: two layers of cells, 1x2 and 2x4 px (stretched along the rise), flowing up 2 px a step and periodic over LOOP;
// a broken pale core; a 1-px rim, tinted wine low and red-orange high; ragged edge cells. put(x, y, col, a, t) applies the
// body / face rules. o: lift (rows cut from the root: the tongue lets go and rises), hot (extra heat), see (see-through tip),
// sway, seed.
const tongue = (put, x0, y0, h, w, lean, f, o = {}) => {
  const sd = o.seed || 0, lift = o.lift || 0, hot = o.hot || 0, sway = o.sway ?? 0.9;
  for (let j = lift; j <= h; j++) {
    const t = j / Math.max(1, h);
    const mid = x0 + lean * j * (0.35 + 0.65 * t) + Math.sin((TAU * 2 * f) / LOOP + sd + t * 3) * sway * t;
    // a full body: rounded at the root, widest a fifth of the way up, drawn to a ragged point
    const hw = w * (t < 0.2 ? 0.72 + 1.4 * t : Math.pow((1 - t) / 0.8, 1.05));
    for (let X = Math.floor(mid - hw - 2); X <= Math.ceil(mid + hw + 2); X++) {
      const d = X + 0.5 - mid, side = d < 0 ? 0 : 1;
      const rag = cell(Math.floor((j - 2 * f) / 2), sd * 13 + side * 7 + 3, 16);
      const e = hw * (1 + (0.12 + 0.6 * t) * (rag * rag * 1.8 - 0.5)) + 0.35;
      if (Math.abs(d) > e) continue;
      const q = Math.abs(d) / Math.max(0.6, e);
      const m1 = cell(Math.floor((j - 2 * f) / 2), Math.floor(d) + sd * 31 + 50, 16), m2 = cell(Math.floor((j - 2 * f) / 4), Math.floor(d / 2) + sd * 17 + 90, 8);
      const mot = m1 * 0.6 + m2 * 0.4;
      const hh = (1 - q) * 0.42 + (1 - t) * 0.38 + (mot - 0.5) * 0.75 + hot + 0.1;
      let col = hh > 0.95 ? BFIRE[0] : hh > 0.76 ? BFIRE[1] : hh > 0.54 ? BFIRE[2] : hh > 0.34 ? BFIRE[3] : BFIRE[4];
      if (Math.abs(d) < 0.8 && t < 0.65 && mot > 0.4 && hw > 1.4) col = t < 0.3 ? BFIRE[0] : BFIRE[1];
      // the rim: red-orange, wine-dark only round the root; a broken second line inside it high up
      const rim = Math.abs(d) > e - 1 || j === h;
      if (rim) col = hw < 1.3 ? BFIRE[3] : t < 0.22 ? INK : BFIRE[4];
      else if (Math.abs(d) > e - 2 && t > 0.45 && bay(X + 64, y0 - j + 64) < 0.5) col = BFIRE[3];
      let a = 1;
      if (o.see && t > 0.5) { const eq = Math.min(2, Math.floor(((t - 0.5) / 0.5) * 2 + bay(X + 64, y0 - j + 64))); a = rim ? 0.9 : [1, 0.8, 0.6][eq]; }
      put(X, y0 - j, col, a, t);
    }
  }
};
// a ragged lick shed off a tip: a short sliver rising and drifting back, cooling as it goes
const sliver = (put, x, y, len, lean, age, a0 = 0.9) => {
  for (let j = 0; j < len; j++) put(x + lean * j, y - j, j === 0 ? BFIRE[2 + Math.min(2, age)] : BFIRE[3 + Math.min(1, age)], a0 * (1 - j * 0.12), 1);
};
const spark = (c, x, y, q, trail) => {
  px(c, x, y, q < 0.3 ? BFIRE[0] : q < 0.6 ? BFIRE[1] : q < 0.85 ? BFIRE[2] : BFIRE[4]);
  if (trail && q < 0.7) px(c, x + 0.6, y + 1, q < 0.35 ? BFIRE[2] : BFIRE[3], 0.7);
};

// ---- one bake: figure-frame canvas x step x option ------------------------------------------------------------------------------
const bake = (m, f, opt) => {
  const { T, cx, xl, xr, has } = m, span = xr - xl, S = cl1(T / 35, 1, 1.7);
  const rx = Math.round(span * 0.8 + 16), x0 = Math.min(xl - 22 - Math.round(T * 0.6), cx - rx - 1), x1 = Math.max(xr + 12, cx + rx + 1);
  const up = Math.round(T * 1.75 + 12), dn = 9, cw = x1 - x0 + 1, ch = up + dn, ax = -x0, ay = up;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ax, ay);
  const free = (x, y, col, a = 1) => { if (!has(x, y)) px(c, x, y, col, a); };
  const isFace = (x, y) => x > cx + 1 && y < -T * 0.55;
  // flames: the face stays clear; over the body only at the root (the lower 30%), elsewhere they pass behind it
  const put = (x, y, col, a, t) => { if (has(x, y) && (t > 0.3 || isFace(x, y))) return; if (isFace(x, y) && y > -T - 1) return; px(c, x, y, col, a); };
  glowUnder(c, m, f, free);
  const t = f / LOOP;
  const spots = m.tops.filter(([x, y]) => !isFace(x, y) && y < 0 && y > -T);
  const rowL = (y) => { for (let x = xl; x <= xr; x++) if (has(x, y)) return x; return cx; };
  if (opt === "B") {
    // B: three tall licks on the back and one at the heel, always burning, streaming back against the walk
    const LK = [[0.08, 0.36, 3.2, 0.2], [0.36, 0.64, 4.2, 1.7], [0.68, 0.58, 3.8, 3.1]];
    LK.forEach(([fy, fh, w, off], k) => {
      const y = -Math.round(T * fy), x = rowL(y) + 2, br = 1 + 0.14 * Math.sin((TAU * f) / LOOP + off) + 0.06 * Math.sin((TAU * 3 * f) / LOOP + off * 2);
      const h = Math.round(T * fh * br), ww = w * Math.pow(S, 0.85), lean = -0.62 - 0.1 * Math.sin((TAU * f) / LOOP + off);
      tongue(put, x, y, h, ww, lean, f, { seed: k + 1, see: true, sway: 1.1 });
      // every eight steps a ragged lick tears off the tip and rises back, cooling
      const age = per(f + k * 3, 8); if (age < 4) { const tipX = x + lean * h + lean * age * 1.6, tipY = y - h - 2 - age * 2; sliver(put, tipX, tipY, 3 - (age >> 1), lean * 0.6, age, 0.85 - age * 0.1); }
    });
    for (let k = 0; k < 3; k++) { const q = fr1(t + k / 3); spark(c, cx - 7 - q * 10 + H(k, 1) * 6, -T * 0.55 - q * 24 * S, q, false); }
  } else {
    // A and C: small tongues pop up at top-edge spots (where today's flames stand), grow, let go at the root and rise off
    const HS = [4, 7, 10, 11, 9, 6], WS = [1.6, 2.4, 3, 3.2, 2.8, 2], LIFE = HS.length;
    let best = null;
    if (spots.length) for (let k = 0; k < 9; k++) {
      const start = Math.floor((k * LOOP) / 9 + H(k, 7) * 1.5) % LOOP, age = (f - start + LOOP) % LOOP;   // spread evenly round the loop
      if (age >= LIFE) continue;
      const [x, y] = spots[Math.floor(H(k, 3) * spots.length) % spots.length];
      const h = Math.round(HS[age] * S * (0.85 + 0.3 * H(k, 5))), lift = age === 4 ? 2 : age === 5 ? Math.round(h * 0.45) : 0;
      const hot = opt === "C" && age < 2 ? 0.18 : age < 2 ? 0.08 : 0;
      // each one a little cluster: a smaller tongue a step behind it, out of phase, so they read as one mass
      tongue(put, x - Math.round(2.5 * Math.sqrt(S)), y + 1, Math.round(h * 0.62), WS[age] * 0.72 * Math.sqrt(S), -0.35, f, { seed: k + 40, lift: Math.max(0, lift - 1), hot });
      tongue(put, x, y + 1, h, WS[age] * Math.sqrt(S), -0.3, f, { seed: k + 1, lift, hot });
      if (age >= 1 && age <= 3 && (!best || h > best.h)) best = { x, y, h, age };
      if (opt === "C" && age < 4) px(c, x, y, BFIRE[0]);          // C: the tongue's root white-hot while it burns
    }
    if (opt === "C") {
      // C: sparks lift off the tongues and the back, drifting back, each with a 1-px trail
      for (let k = 0; k < 8; k++) {
        const q = fr1(t + k / 8 + H(k, 9) * 0.06), [sx, sy] = spots.length ? spots[Math.floor(H(k, 11) * spots.length) % spots.length] : [cx, -T * 0.6];
        spark(c, sx - q * (8 + 6 * H(k, 2)) + Math.sin(q * 5 + k) * 1.6, sy - 3 - q * (T * 0.55 + 12) * S, q, true);
      }
      // C: a white-hot flicker at the hottest point (the root of the tallest tongue): a little star breathing 1 -> 2 -> 1
      if (best) {
        const s = [1, 2, 3, 2][best.age], X = best.x, Y = best.y - 1;
        for (let k = 1; k <= s; k++) { const col = k === s ? BFIRE[1] : BFIRE[0]; px(c, X + k, Y, col); px(c, X - k, Y, col); px(c, X, Y - k - 1, col); }
        px(c, X, Y, "#ffffff"); px(c, X, Y - 1, "#ffffff");
        if (s > 1) { px(c, X + 1, Y - 1, BFIRE[0], 0.8); px(c, X - 1, Y + 1, BFIRE[1], 0.8); }
      }
    } else {
      for (let k = 0; k < 3; k++) { const q = fr1(t + k / 3); spark(c, cx - 6 - q * 8 + H(k, 1) * 6, -T * 0.4 - q * 22, q, false); }
    }
  }
  outlineOver(c, m, f, isFace);
  return { cv, ax, ay };
};
const BAKES = new Map();
const burnOf = (s, f, opt) => { const m = maskOf(s); let per = BAKES.get(s.cv); if (!per) BAKES.set(s.cv, (per = {})); const k = opt + f; return per[k] || (per[k] = bake(m, f, opt)); };

// ---- the cell: three foes at board size, the goblin enlarged x2 in an inset on the right ----------------------------------------
const FOES = [["goblin", 32], ["orc", 92], ["troll", 172]];
const INSET = { x: 300, from: 250, scale: 2 };
const one = (c, type, i, opt) => {
  const s = fig(type, i), f = i % LOOP;
  c.drawImage(s.cv, -Math.round(s.ax), -Math.round(s.ay));
  if (opt === "today") {
    const e = { x: 0, y: 0, id: 0, face: 1, size: 15, type, _rf: { skin: type, ps: "walk", pf: ((i % 8) + 8) % 8 } };
    c.save(); c.scale(G.PX, G.PX); G.statusBurn(c, e, (i + 0.5 + 8 * one.k++) / 12, 0, 20); c.restore();
    return;
  }
  const b = burnOf(s, f, opt); c.drawImage(b.cv, -b.ax, -b.ay);
};
one.k = 0;
const scene = (opt) => (c, e) => {
  for (const [type, x] of FOES) { c.save(); c.translate(x, 0); one(c, type, e.i, opt); c.restore(); }
  // the inset: a divider, then the goblin and its fire painted at 1x and blown up x2 (nearest neighbour)
  c.fillStyle = "rgba(20,23,29,0.55)"; c.fillRect(INSET.from - 2, -e.ay, 2, e.ch);
  const ow = 120, oh = 90, oxx = 56, oyy = 80, off = mk(ow, oh), o = off.getContext("2d");
  o.translate(oxx, oyy); one(o, "goblin", e.i, opt);
  c.save(); c.beginPath(); c.rect(INSET.from, -e.ay, e.cw - INSET.from, e.ch); c.clip(); c.imageSmoothingEnabled = false;
  c.drawImage(off, INSET.x - oxx * INSET.scale, -oyy * INSET.scale, ow * INSET.scale, oh * INSET.scale); c.restore();
};

export const ROWS = [{
  id: "burn18", label: "Fire on a foe (round 18)", group: "Round 18", cw: 360, ch: 172, ax: 0, ay: 156, N: LOOP,
  note: "Goblin, orc and troll at board size, the goblin enlarged twice on the right. Every option keeps today's burning outline and glow exactly and redraws only the flames, in Dragonbreath's look, with no smoke. A: today's little flames popping up along the top of the body, now as small mottled tongues (gold, orange and red clusters, a pale core, a dark red edge) that grow, let go and rise off. B: fewer, taller licks that always burn on the back and heel and stream back against the walk, see-through at their tips, tearing off ragged bits. C: A plus sparks lifting off with little trails and a white-hot flicker at the root of the biggest tongue.",
  today: scene("today"), A: scene("A"), B: scene("B"), C: scene("C"),
}];
