// ============ TORCH FLAMES: the small fires on the buildings, in Dragonbreath's look ============
// The owner's pick from Round 20 (row torch20, A; concept/fx-r20-torch.js). A leaf module (no imports).
// Every hall's "flame" (pix/halls.js), the Brazier Wheel's fire pots (halls/spiker.js), the castle's torches and
// braziers (castle.js) and buildkit's `flame` draw through it.
//
// A flame is a small cluster of teardrop tongues (a main one, one or two lower ones beside it, out of phase): gold,
// orange, deep orange and red-orange cells flowing up a pixel a step, a broken pale core, a 1-px rim (wine-dark at the
// root, red higher, broken to orange in places), its tip flickering and now and then letting go of a ragged lick.
//
//   torchSprite(w, h, step, seed)   { cv, ox, oy }: art px, anchored on the base (lowest row y = -1, as flameFrames)
//   torchStep(time, k)              the step now (TORCH_N a loop, 11 a second; k staggers neighbours)
//   stampTorch(ctx, x, y, w, h, time, seed, k)   draw one at (x, y) board units (1 unit = 2 art px), whole art pixels
//   torchLate(ctx, fn) / drawTorchesLate(ctx)    under the Blood Moon a flame is drawn AFTER the night's shade (a fire
//                                   is a light): the painter queues it with the transform it was drawn under, and the
//                                   moon's painter (bloodmoon.js) lays the queue at its end
// Baked once per (width, height, step, seed), at most TORCH_CAP kept (oldest dropped).

export const TORCH_N = 12;
const TORCH_CAP = 700;
const TAU = Math.PI * 2;
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // Dragonbreath's tones
const INK = "#8a2028";                                                              // its tinted rim
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const per = (a, n) => ((a % n) + n) % n;
const cell = (a, b, n) => H(per(a, n), b);                    // hashed cells, periodic in a (seamless loops)
const px = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };

const SPR = new Map();
export const torchSprite = (w, h, f, seed) => {
  w = Math.max(2, Math.round(w)); h = Math.max(3, Math.round(h)); f = per(f, TORCH_N); seed = per(Math.round(seed), 7);
  const key = w * 1e6 + h * 1e3 + f * 10 + seed;
  let s = SPR.get(key); if (s) return s;
  const tiny = h <= 5, H0 = h, W0 = w, sd = seed * 1.7;
  const cw = W0 + 14, ch = H0 + 16, ox = Math.floor(cw / 2), oy = ch - 3;
  const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
  const c = cv.getContext("2d");
  c.translate(ox, oy);
  const k = TAU * f / TORCH_N;
  // the height breathes (periodic over the loop), the tip flickers side to side
  const Hf = Math.max(3, Math.round(H0 * (1 + 0.09 * Math.sin(2 * k + sd) + 0.06 * Math.sin(3 * k + sd * 1.3))));
  const sc = Math.max(0.6, h / 9);
  const sway = (t) => (0.85 * Math.sin(k + sd) + 0.35 * Math.sin(3 * k + sd)) * Math.pow(t, 1.4) * sc;
  // one tongue of the mass: xo its root's offset, hs / ws its height / width against the main one, ph its phase
  const body = (xo, hs, ws, sd2, ph) => {
    const Hb = Math.max(2, Math.round(Hf * hs)), Wb = W0 * ws, kb = k + ph;
    for (let j = 0; j <= Hb; j++) {
      const t = j / Hb, mid = xo + sway(t) * (0.6 + 0.4 * hs) + 0.5 + (ph ? 0.4 * Math.sin(kb) * t : 0);
      // a teardrop: rounded at the root, a full belly a third of the way up, then drawn quickly to a ragged point
      const hw = (Wb / 2) * (t < 0.3 ? 0.8 + 0.67 * t : Math.pow((1 - t) / 0.7, 0.72));
      for (let X = Math.floor(mid - hw - 2); X <= Math.ceil(mid + hw + 2); X++) {
        const d = X + 0.5 - mid, side = d < 0 ? 0 : 1;
        const rag = cell(Math.floor((j - f) / 2), sd2 * 13 + side * 7 + 3, 6);
        const e = hw * (1 + (0.1 + 0.6 * t) * (rag * 1.7 - 0.65)) + 0.3;
        if (Math.abs(d) > e) continue;
        const q = Math.abs(d) / Math.max(0.6, e);
        // mottle: two layers of cells stretched along the rise, flowing up a pixel a step
        const m1 = cell(Math.floor((j - f) / 2), Math.floor(d + 8) + sd2 * 31 + 50, 6), m2 = cell(Math.floor((j - f) / 4), Math.floor((d + 8) / 2) + sd2 * 17 + 90, 3);
        const mot = m1 * 0.6 + m2 * 0.4;
        const hh = (1 - q) * 0.42 + (1 - t) * 0.4 + (mot - 0.5) * 0.7 + 0.1 - (hs < 1 ? 0.08 : 0);
        let col = hh > 0.95 ? FIRE[0] : hh > 0.74 ? FIRE[1] : hh > 0.52 ? FIRE[2] : hh > 0.34 ? FIRE[3] : FIRE[4];
        // a broken pale core low in the middle
        if (Math.abs(d) < 0.8 && t < 0.6 && mot > 0.38 && !tiny && hs === 1) col = t < 0.3 ? FIRE[0] : FIRE[1];
        // the rim: wine-dark round the root, red higher, broken to red-orange in places, red-orange on a thin tip
        const rim = Math.abs(d) > e - 1 || j === Hb;
        if (rim) col = hw < 1.2 || j === Hb ? FIRE[3] : t < 0.3 ? INK : cell(Math.floor((j - f) / 2), sd2 * 5 + side * 11 + 40, 6) > 0.62 ? FIRE[3] : FIRE[4];
        px(c, X, -1 - j, col);
      }
    }
  };
  // a flame of any size is a small cluster: a lower tongue beside the main one (out of phase), so it never reads as a cone
  if (w >= 5 && !tiny) {
    const sideL = H(seed, 21) < 0.5 ? -1 : 1, off = Math.max(1, Math.round(W0 * 0.3));
    body(sideL * off, 0.55, 0.62, seed + 40, 2.1);
    if (w >= 8) body(-sideL * off, 0.4, 0.5, seed + 60, 4.2);
  }
  body(0, 1, 1, seed, 0);
  // a ragged lick lets go of the tip now and then (one pixel above it), drifts up and aside, warm, then gone
  if (!tiny) {
    const age = per(f + Math.floor(H(seed, 4) * 6), 6), ages = h >= 12 ? 3 : 2;
    if (age < ages) {
      const tx = sway(1) + 0.5 + 0.6 * age * Math.sign(Math.sin(k + sd) || 1), ty = -Hf - 2 - age;
      const len = h >= 9 ? 2 : 1;
      for (let j = 0; j < len; j++) px(c, tx, ty - j, j ? FIRE[3] : FIRE[2 + (age >> 1)], 1 - age * 0.15);
    }
  }
  s = { cv, ox, oy };
  SPR.set(key, s);
  if (SPR.size > TORCH_CAP) SPR.delete(SPR.keys().next().value);
  return s;
};
export const torchStep = (time, k = 0) => per(Math.floor(time * 11 + k), TORCH_N);
export const stampTorch = (ctx, x, y, w, h, time, seed = 0, k = 0) => {
  const s = torchSprite(w, h, torchStep(time, k + seed * 3), seed);
  ctx.drawImage(s.cv, Math.round((x - s.ox / 2) * 2) / 2, Math.round((y - s.oy / 2) * 2) / 2, s.cv.width / 2, s.cv.height / 2);
};

// ---- the night's queue: flames drawn over the shade ----
let LATE = [];
export const torchLate = (ctx, fn) => {
  if (LATE.length >= 256) LATE.shift();
  LATE.push({ m: ctx.getTransform(), a: ctx.globalAlpha, fn });
};
export const drawTorchesLate = (ctx) => {
  if (!LATE.length) return;
  const q = LATE; LATE = [];
  const m0 = ctx.getTransform(), a0 = ctx.globalAlpha, op0 = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over";
  for (const L of q) { ctx.setTransform(L.m); ctx.globalAlpha = L.a; L.fn(ctx); }
  ctx.setTransform(m0); ctx.globalAlpha = a0; ctx.globalCompositeOperation = op0;
};
