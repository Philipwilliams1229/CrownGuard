// ============ RAISING A HALL ============
// The moment a hall is bought, levelled, branched or ascended. The engine
// marks it (actions.js markRaised): t.raised = { at, how, prev } where `at`
// is g.time in seconds, `how` is "build" | "level" | "branch" | "ascend",
// and `prev` the form it had before ({ level, branch, rank4 }, null for a
// new hall). While RAISE_SECS[how] have not passed, draw.js hands the hall
// to drawRaising instead of painting it directly. `paint(t)` paints any form
// of it — pass a copy with other fields to paint the old one, e.g.
// paint({ ...t, ...t.raised.prev }). Visual only: the hall already fights.
//
// One shared treatment for all thirteen halls, Kingdom Rush style:
//   build  — a timber scaffold climbs out of the footing with a plank
//            platform, the hall is laid course by course beneath it (a clip
//            rising from the ground), chips fly off the platform; then the
//            scaffold sinks away and the hall springs up and settles.
//            On water (TOWERS[kind].water) no scaffold: the jetty surges up
//            out of the river with spray, foam rings and loose planks.
//   level  — the old form with a quick scaffold round it and a hammer
//            knocking twice (the hall jolts, chips and a spark), then the new
//            form pops with a squash-and-stretch, chips and a sparkle.
//   branch / ascend — a column of gold light wraps the old form, which
//            trembles and glows; the new form shoots up out of it with a big
//            bounce, still glowing, and a ring of gold motes rolls out round
//            its feet. Ascend is taller, brighter and has more motes.
// The engine's own effects fire alongside (build: a dust ring, knock and
// shake; level: the green ring and burst; branch/ascend: the gold ring,
// burst and white flash) — these parts stay out of their way: nothing here
// is a flat ring or a white bloom.
//
// Rules kept: every offset and scale is snapped to art pixels (a scale only
// ever moves the hall's edges by whole art pixels, and is exactly 1 at
// rest); from 97% of the raise on, the hall is painted plainly, so the hand
// back to draw.js is pixel for pixel. Each hall form is measured once (its
// top and body width, painted off-screen with drawTowerPortrait) so the
// scaffold and the reveal fit a squat catapult and a 70px spire alike.

import { PX, hash } from "./paint.js";
import { TOWERS } from "../data/towers.js";
import { drawTowerPortrait } from "./towers.js";

export const RAISE_SECS = { build: 0.6, level: 0.45, branch: 0.7, ascend: 0.8 };

// ---- small maths -----------------------------------------------------------
const sn = (v) => Math.round(v * PX) / PX;            // snap to the art grid
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p, a, b) => cl((p - a) / (b - a));       // 0..1 across [a, b]
const eo = (u) => 1 - (1 - u) * (1 - u);              // ease out
const backOut = (u, s = 1.6) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2;
// a value along keyframes [[p, v], ...], smoothstepped between them
const keys = (p, ks) => {
  if (p <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (p <= ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb] = ks[i];
      const u = (p - a) / (b - a);
      return va + (vb - va) * u * u * (3 - 2 * u);
    }
  }
  return ks[ks.length - 1][1];
};
const rect = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(sn(x), sn(y), sn(w), sn(h)); };

// ---- palette ---------------------------------------------------------------
const INK = "#241a26";
// fresh-cut scaffold timber, paler than any hall's seasoned oak so it reads apart
const WOOD_HI = "#e8c486", WOOD = "#c49a5c", WOOD_LO = "#94693a";
const STONE = "#a19a8a", STONE_HI = "#c8c0ac";
const GOLD = "#d8b34a", GOLD_HI = "#f4d878", CREAM = "#fff3d2";
const DUST_HI = "#efe4c8", DUST = "#d4c6a6", DUST_LO = "#b3a386";
const FOAM = "#eef6f4", SPRAY = "#a8d0dc";
const CHIP_LO = "#4a3630";

// ---- measuring a form ------------------------------------------------------
// The top of each form (relative to t.y) and its body's half-width, painted
// once off-screen. Falls back to a middling hall if anything goes wrong.
const BOX = new Map();
let mcv = null;
const MW = 150, MH = 160, MX = 75, MY = 124;           // scratch canvas, world units
const measure = (t, form) => {
  const key = `${t.kind}|${form.level}|${form.branch || ""}|${form.rank4 || ""}`;
  let b = BOX.get(key);
  if (b) return b;
  b = { top: -46, hw: 15 };
  try {
    if (!mcv) { mcv = document.createElement("canvas"); mcv.width = MW * PX; mcv.height = MH * PX; }
    const c = mcv.getContext("2d", { willReadFrequently: true });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, mcv.width, mcv.height);
    c.setTransform(PX, 0, 0, PX, 0, 0);
    c.imageSmoothingEnabled = false;
    const f = { ...t, level: form.level, branch: form.branch || null, rank4: form.rank4 || null,
      x: MX, y: MY, raised: null, anim: 0, mAnim: 0, _idle: true, units: [], eagle: null };
    c.save(); drawTowerPortrait(c, f, 0); c.restore();
    const d = c.getImageData(0, 0, mcv.width, mcv.height).data, W = mcv.width, H = mcv.height;
    const bodyRow = (MY - 4) * PX;
    let top = -1, hw = 0;
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      for (let x = 0; x < W; x++) {
        if (d[row + x * 4 + 3] > 80) {
          if (top < 0) top = y;
          if (y < bodyRow) { const dx = Math.abs((x + 0.5) / PX - MX); if (dx > hw) hw = dx; }
        }
      }
    }
    if (top >= 0) b = { top: Math.max(-84, Math.min(-18, top / PX - MY)), hw: Math.max(9, Math.min(22, hw)) };
  } catch (e) { /* keep the fallback */ }
  BOX.set(key, b);
  return b;
};

// ---- the hall itself, scaled about its base ----------------------------------
// Each scale is rounded so the hall's edges move by whole art pixels; at
// (1, 1) it is simply painted.
const paintScaled = (ctx, paint, f, bx, by, sx, sy, hw, hh, dx = 0, dy = 0) => {
  const W2 = hw * 2 * PX, H2 = hh * PX;
  const ex = Math.round((sx - 1) * W2), ey = Math.round((sy - 1) * H2);
  const ox = sn(dx), oy = sn(dy);
  if (!ex && !ey && !ox && !oy) { paint(f); return; }
  ctx.save();
  ctx.translate(bx + ox, by + oy);
  ctx.scale(1 + ex / W2, 1 + ey / H2);
  ctx.translate(-bx, -by);
  paint(f);
  ctx.restore();
};
// the same hall added over itself in light: it glows in its own colours
const paintGlow = (ctx, paint, f, a, draw = () => paint(f)) => {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a;
  draw();
  ctx.restore();
};

// ---- timber ----------------------------------------------------------------
// A pole standing on (x, foot), h tall: ink, a lit left edge, the wood.
const pole = (ctx, x, foot, h) => {
  if (h <= 0.5) return;
  rect(ctx, x - 1, foot - h, 2, h + 0.5, INK);
  rect(ctx, x - 0.5, foot - h + 0.5, 0.5, h - 0.5, WOOD_HI);
  rect(ctx, x, foot - h + 0.5, 0.5, h - 0.5, WOOD_LO);
};
// A ledger across from x0 to x1 at y (its middle).
const ledger = (ctx, x0, x1, y, thick = false) => {
  const h = thick ? 3 : 2;
  rect(ctx, x0 - 0.5, y - h / 2, x1 - x0 + 1, h, INK);
  rect(ctx, x0, y - h / 2 + 0.5, x1 - x0, 0.5, WOOD_HI);
  rect(ctx, x0, y - h / 2 + 1, x1 - x0, h - 1.5, thick ? WOOD : WOOD_LO);
  if (thick) for (let xx = x0 + 3; xx < x1 - 1; xx += 5) rect(ctx, xx, y - 1, 0.5, 2, WOOD_LO);   // plank joints
};
// A diagonal brace, stepped in art pixels.
const brace = (ctx, x0, y0, x1, y1) => {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) * PX));
  ctx.fillStyle = INK;
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.fillRect(sn(x0 + (x1 - x0) * u) - 0.75, sn(y0 + (y1 - y0) * u) - 0.75, 1.5, 1.5); }
  ctx.fillStyle = WOOD;
  for (let i = 1; i < n; i++) { const u = i / n; ctx.fillRect(sn(x0 + (x1 - x0) * u) - 0.25, sn(y0 + (y1 - y0) * u) - 0.25, 0.5, 0.5); }
};

// ---- dust puffs --------------------------------------------------------------
// Pixel clouds of three lumps, baked per size and frame; later frames thin
// out to a dither and go.
const PUFFS = new Map();
const puffSprite = (r, f) => {
  const key = `${r}|${f}`;
  let cv = PUFFS.get(key);
  if (cv) return cv;
  const n = Math.ceil((2 * r + 2) * PX);
  cv = document.createElement("canvas"); cv.width = n; cv.height = n;
  const c = cv.getContext("2d"), c0 = n / 2, R = r * PX * (0.7 + f * 0.12);
  const lumps = [[-0.35, 0.15, 0.62], [0.3, 0.2, 0.55], [0, -0.22, 0.6]];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let inside = false, lit = 0;
    for (const [lx, ly, lr] of lumps) {
      const dx = (x + 0.5 - c0) / R - lx, dy = (y + 0.5 - c0) / R - ly, d = Math.hypot(dx, dy) / lr;
      if (d < 1) { inside = true; lit = Math.max(lit, -dx - dy * 1.2); }
    }
    if (!inside) continue;
    if (f >= 2 && hash(x * 7 + f, y * 13) < (f - 1) * 0.3) continue;   // thinning away
    c.fillStyle = lit > 0.35 ? DUST_HI : lit > -0.3 ? DUST : DUST_LO;
    c.fillRect(x, y, 1, 1);
  }
  PUFFS.set(key, cv);
  return cv;
};
// a puff at (x, y) over its life u (0..1)
const puff = (ctx, x, y, r, u) => {
  if (u <= 0 || u >= 1) return;
  const cv = puffSprite(r, Math.min(3, Math.floor(u * 4))), s = cv.width / PX;
  ctx.drawImage(cv, sn(x - s / 2), sn(y - s / 2 - u * 3), s, s);
};

// ---- chips -----------------------------------------------------------------
// n bits of wood and stone thrown up out of (x0, y0) at p0, arcing down to
// the ground line and lying a moment. Deterministic per hall and burst.
const chips = (ctx, seed, n, p0, p, dur, x0, y0, spread, ground, o = {}) => {
  const age = (p - p0) * dur;
  if (age < 0 || age > (o.life || 0.34)) return;
  const up = o.up ?? 1, cols = o.cols || [WOOD_HI, WOOD, STONE, STONE_HI];
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed, i * 3 + 1), h2 = hash(seed, i * 3 + 2), h3 = hash(seed, i * 3 + 3);
    const side = h3 < 0.5 ? -1 : 1;
    const vx = side * (18 + h1 * 40) * (o.wide || 1), vy = -(30 + h2 * 55) * up;
    const x = x0 + (h3 - 0.5) * spread + vx * age;
    let y = y0 + vy * age + 0.5 * 320 * age * age;
    if (y > ground) y = ground;
    const s = h2 > 0.6 ? 1 : 0.5;
    // a chip is its colour with a dark lower-right edge, not an inked
    // square: at this size a full outline reads as a black speck
    rect(ctx, x, y, s + 0.5, s + 0.5, CHIP_LO);
    rect(ctx, x, y, s, s, cols[i % cols.length]);
  }
};

// ---- light -------------------------------------------------------------------
// A four-point twinkle, arms s art pixels long.
const twinkle = (ctx, x, y, s, col = GOLD_HI) => {
  if (s < 1) return;
  const a = 1 / PX, L = s * a;
  x = sn(x); y = sn(y);
  ctx.fillStyle = col;
  ctx.fillRect(x - L, y, 2 * L + a, a);
  ctx.fillRect(x, y - L, a, 2 * L + a);
  ctx.fillStyle = CREAM;
  ctx.fillRect(x - a, y, 3 * a, a);
  ctx.fillRect(x, y - a, a, 3 * a);
};
// A column of gold light from the ground (yb) up past ytop, half-width w,
// in stepped bands of gold wash, with a stepped pool of light on the ground.
const COLUMN = [[1, [248, 196, 84], 0.2], [0.64, [255, 216, 120], 0.26], [0.3, [255, 240, 190], 0.42]];
const column = (ctx, x, yb, ytop, w, a) => {
  if (w < 0.5 || a <= 0.02) return;
  ctx.save();
  // the pool on the ground, row by row, in two steps
  const rx = w * 1.8, ry = w * 0.7;
  for (let yy = -ry; yy <= ry; yy += 1 / PX) {
    const k = Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)), hw = rx * k;
    ctx.fillStyle = `rgba(255,214,120,${(k > 0.55 ? 0.2 : 0.11) * a})`;
    ctx.fillRect(sn(x - hw), sn(yb + yy), sn(2 * hw), 1 / PX);
  }
  COLUMN.forEach(([k, [r, g, b], al]) => {
    const hw = Math.max(0.5, sn(w * k));
    ctx.fillStyle = `rgba(${r},${g},${b},${al * a})`;
    ctx.fillRect(sn(x - hw), sn(ytop), hw * 2, sn(yb - ytop));
    // the top frays upward in three fading steps
    for (let n = 1; n <= 3; n++) {
      ctx.fillStyle = `rgba(${r},${g},${b},${al * a * (1 - n / 4)})`;
      const hh = Math.max(0.5, sn(hw * (1 - n * 0.22)));
      ctx.fillRect(sn(x - hh), sn(ytop - n * 5), hh * 2, 5);
    }
  });
  ctx.restore();
};

// ======================================================================
// BUILD: a scaffold climbs, the hall is laid under its platform, the
// scaffold sinks away and the hall springs up.
const raiseBuild = (ctx, t, p, dur, time, paint) => {
  const def = TOWERS[t.kind] || {};
  const box = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3), top = t.y + box.top, hh = by - top;
  if (def.water) { raiseWater(ctx, t, p, dur, paint, box); return; }
  const narrow = !!def.roadClear;
  const rx = narrow ? 10 : Math.min(18, Math.max(11, box.hw + 1)), ry = narrow ? 6 : 8;
  const fF = sn(by + ry * 0.7), fB = sn(by - ry * 0.7);         // front / back pole feet
  const xl = sn(x - rx), xr = sn(x + rx);
  const DONE = 0.64;                                               // the hall stands complete
  // the platform, and the line the hall is laid up to
  const y0 = t.y + 17, y1 = top - 1;
  const u = seg(p, 0.05, DONE);
  const yR = sn(y0 + (y1 - y0) * (u * 0.55 + eo(u) * 0.45));
  // the scaffold: grows with the platform, then sinks into the ground
  const sprout = 9 * eo(seg(p, 0, 0.1));
  const hP = Math.max(sprout, fF - yR + 5);
  const sink = p > DONE ? seg(p, DONE + 0.02, DONE + 0.2) ** 2 * (hP + 3) : 0;
  const scaffold = (front) => {
    if (sink >= hP + 2) return;
    const foot = front ? fF : fB;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, foot - 120, 80, 120 + 0.5); ctx.clip();
    ctx.translate(0, sn(sink));
    const h = hP;
    pole(ctx, xl, foot, h); pole(ctx, xr, foot, h);
    for (let k = 13; k < h - 4; k += 13) ledger(ctx, xl, xr, foot - k);
    if (front) {
      if (h > 10) brace(ctx, xl + 1, foot - 1, xr - 1, foot - Math.min(13, h - 2));
      if (p < DONE + 0.02) ledger(ctx, xl - 2, xr + 2, yR, true);   // the working platform
    } else if (p < DONE + 0.02) ledger(ctx, xl, xr, yR - (fF - fB));
    ctx.restore();
  };
  scaffold(false);
  // the hall: laid under the platform, then a spring and settle
  if (p < DONE) {
    if (yR < y0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 60, yR, 120, y0 - yR + 30); ctx.clip();
      paint(t);
      ctx.restore();
    }
  } else {
    const sy = keys(p, [[DONE, 1], [DONE + 0.07, 1.07], [DONE + 0.15, 0.96], [DONE + 0.22, 1.015], [DONE + 0.28, 1]]);
    const sx = keys(p, [[DONE, 1], [DONE + 0.07, 0.96], [DONE + 0.15, 1.035], [DONE + 0.22, 0.995], [DONE + 0.28, 1]]);
    paintScaled(ctx, paint, t, x, by, sx, sy, box.hw, hh);
  }
  scaffold(true);
  // dust where the poles bite, and again as the scaffold goes down
  const s = t.id * 31 + 7;
  puff(ctx, xl - 1, fF + 1, 3, seg(p, 0.0, 0.3));
  puff(ctx, xr + 1, fF + 1, 3, seg(p, 0.03, 0.33));
  puff(ctx, xl - 2, fF + 1, 4, seg(p, DONE + 0.04, DONE + 0.24));
  puff(ctx, xr + 2, fF + 1, 4, seg(p, DONE + 0.06, DONE + 0.26));
  // chips off the platform as the courses go in, a shower as it comes down
  for (let i = 0; i < 3; i++) {
    const p0 = 0.16 + i * 0.16;
    chips(ctx, s + i, 3, p0, p, dur, x, sn(y0 + (y1 - y0) * seg(p0, 0.05, DONE)), rx * 1.6, fF + 3, { life: 0.26 });
  }
  // a Master Build lands finished: a glint of gold on its crown as it settles
  if (t.branch) {
    for (const [a, b, fx, fy] of [[0.02, 0.2, 0.3, 0], [0.08, 0.26, -0.5, 0.3]]) {
      const tu = seg(p, DONE + a, DONE + b);
      if (tu > 0 && tu < 1) twinkle(ctx, x + fx * box.hw, top + 3 + fy * hh, Math.round(Math.sin(tu * Math.PI) * 4));
    }
  }
  chips(ctx, s + 9, 6, DONE, p, dur, x, sn(y1 + 4), rx * 1.4, fF + 4, { life: 0.17, cols: [WOOD_HI, WOOD, WOOD_LO] });
};

// ---- on water: the jetty surges up out of the river ----
const raiseWater = (ctx, t, p, dur, paint, box) => {
  const x = sn(t.x), by = sn(t.y + 3), hh = by - (t.y + box.top);
  const wl = sn(t.y + 16);                                        // the cut: the water's face
  const u = seg(p, 0.03, 0.62);
  const off = sn((1 - backOut(u, 1.3)) * (hh + 14));
  const s = t.id * 17 + 3;
  // foam rings rolling out on the water, behind and in front
  const ring = (u2, front) => {
    if (u2 <= 0 || u2 >= 1) return;
    const rx = 12 + 18 * eo(u2), ry = rx * 0.42, n = 26;
    ctx.fillStyle = u2 < 0.6 ? FOAM : SPRAY;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if ((Math.sin(a) > 0) !== front || hash(s, i + Math.floor(u2 * 3) * 40) < u2 * 0.5) continue;
      ctx.fillRect(sn(x + Math.cos(a) * rx), sn(by + 4 + Math.sin(a) * ry), 1, 0.5);
    }
  };
  ring(seg(p, 0.04, 0.5), false); ring(seg(p, 0.3, 0.8), false);
  // planks bobbing out to the sides
  const planks = (front) => {
    const pu = seg(p, 0.08, 0.9);
    if (pu <= 0 || pu >= 1 || (pu > 0.8 && Math.floor(p * 60) % 2)) return;
    [[-1, -0.25], [1, 0.15], [-1, 0.5]].forEach(([side, dy], i) => {
      if ((dy > 0.3) !== front) return;
      const px = x + side * (12 + 13 * eo(pu) + i), py = by + 5 + dy * 8 + Math.sin(pu * 9 + i) * 0.6;
      rect(ctx, px - 2.5, py - 1, 5, 2, INK);
      rect(ctx, px - 2, py - 0.5, 4, 0.5, WOOD_HI);
      rect(ctx, px - 2, py, 4, 0.5, WOOD);
    });
  };
  planks(false);
  // the hall, clipped at the water's face while it comes up
  if (off !== 0 || p < 0.62) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 60, wl - 140, 120, 140); ctx.clip();
    ctx.translate(0, off);
    paint(t);
    ctx.restore();
  } else paint(t);
  // the water pouring off it: a skirt of foam at the cut while it rises
  if (p < 0.66 && off > -3) {
    const a = 1 - seg(p, 0.45, 0.66);
    for (let i = -14; i <= 14; i += 1) {
      if (hash(s + Math.floor(p * 30), i + 50) > 0.55 * a + 0.2) continue;
      rect(ctx, x + i, wl - 1 - hash(s, i + 90) * 2, 1, 0.5, FOAM);
    }
  }
  ring(seg(p, 0.04, 0.5), true); ring(seg(p, 0.3, 0.8), true);
  planks(true);
  // spray thrown up round it
  const age = (p - 0.04) * dur;
  if (age > 0 && age < 0.4) {
    for (let i = 0; i < 12; i++) {
      const h1 = hash(s, i * 5 + 1), h2 = hash(s, i * 5 + 2), side = i % 2 ? 1 : -1;
      const x0 = x + side * (6 + h1 * 10), vx = side * (10 + h1 * 26), vy = -(40 + h2 * 50);
      const yy = wl - 2 + vy * age + 0.5 * 360 * age * age;
      if (yy > wl + 2) continue;
      rect(ctx, x0 + vx * age, yy, h2 > 0.5 ? 1 : 0.5, 0.5, h2 > 0.3 ? FOAM : SPRAY);
    }
  }
};

// ======================================================================
// LEVEL: a scaffold and a hammer round the old form, then the new pops.
const raiseLevel = (ctx, t, p, dur, time, paint) => {
  const def = TOWERS[t.kind] || {};
  const prev = { ...t, ...(t.raised.prev || {}) };
  const bo = measure(t, prev), bn = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3);
  const water = !!def.water, narrow = !!def.roadClear;
  const rx = narrow ? 10 : Math.min(18, Math.max(11, bo.hw + 1)), fF = sn(by + (narrow ? 4 : 5.5));
  const xl = sn(x - rx), xr = sn(x + rx);
  const SW = 0.4;                                                   // the switch to the new form
  const s = t.id * 23 + 11;
  // the scaffold: two front poles and a ledger, springing up; sinks at the switch
  const hS = Math.min(-bo.top * 0.55, 28) * eo(seg(p, 0, 0.16));
  const sink = seg(p, SW, SW + 0.14) ** 2 * (hS + 3);
  const knocks = [0.15, 0.29];
  const knockAt = knocks.find((k) => p >= k && p < k + 0.05);
  const scaffold = () => {
    if (water || hS < 1 || sink >= hS + 2) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, fF - 80, 80, 80.5); ctx.clip();
    ctx.translate(0, sn(sink));
    pole(ctx, xl, fF, hS); pole(ctx, xr, fF, hS);
    if (hS > 8) ledger(ctx, xl - 1, xr + 1, fF - hS + 3, true);
    if (hS > 12) brace(ctx, xl + 1, fF - 1, xr - 1, fF - hS + 5);
    ctx.restore();
  };
  if (p < SW) {
    paintScaled(ctx, paint, prev, x, by, 1, 1, bo.hw, by - (t.y + bo.top), 0, knockAt !== undefined ? 0.5 : 0);
    scaffold();
    // the hammer, at the right-hand pole's top, knocking twice
    const hx = water ? x + bo.hw + 3 : xr + 3, hy = water ? sn(by - (by - t.y - bo.top) * 0.45) : fF - hS + 1;
    if (hS > 6) hammer(ctx, hx, hy, knockAt !== undefined ? 1 : p < 0.1 ? 0.5 : 0);
    for (const k of knocks) {
      if (p >= k && p < k + 0.07) twinkle(ctx, hx - 4, hy + 2, p < k + 0.035 ? 3 : 2, CREAM);
      chips(ctx, s + k * 100, 3, k, p, dur, hx - 4, hy + 2, 2, fF + 3, { life: 0.2, wide: 0.7 });
    }
  } else {
    const sy = keys(p, [[SW, 0.86], [SW + 0.1, 1.1], [SW + 0.22, 0.95], [SW + 0.34, 1.03], [SW + 0.44, 1]]);
    const sx = keys(p, [[SW, 1.1], [SW + 0.1, 0.94], [SW + 0.22, 1.04], [SW + 0.34, 0.99], [SW + 0.44, 1]]);
    paintScaled(ctx, paint, t, x, by, sx, sy, bn.hw, by - (t.y + bn.top));
    scaffold();
    chips(ctx, s + 5, 7, SW, p, dur, x, by - 6, rx * 1.6, fF + 3, { life: 0.2, wide: 1.2 });
    if (!water) { puff(ctx, xl - 1, fF + 1, 3, seg(p, SW, SW + 0.4)); puff(ctx, xr + 1, fF + 1, 3, seg(p, SW + 0.03, SW + 0.43)); }
    // a sparkle on the new top, and one lower on the far side
    const topY = t.y + bn.top;
    const tw1 = seg(p, SW + 0.12, SW + 0.42), tw2 = seg(p, SW + 0.22, SW + 0.52);
    if (tw1 > 0 && tw1 < 1) twinkle(ctx, x + bn.hw * 0.35, topY + 3, Math.round(Math.sin(tw1 * Math.PI) * 4));
    if (tw2 > 0 && tw2 < 1) twinkle(ctx, x - bn.hw * 0.6, topY + (by - topY) * 0.4, Math.round(Math.sin(tw2 * Math.PI) * 3));
  }
};
// A mallet in art pixels, its head at (x, y) and the handle running out to
// the right: pose 0 raised, 0.5 coming down, 1 struck.
const hammer = (ctx, x, y, pose) => {
  const ang = pose >= 1 ? -0.2 : pose > 0 ? 0.5 : 1.05;         // the head's lift above the grip
  const ca = Math.cos(ang), sa = Math.sin(ang), a = 1 / PX;
  // swinging about the grip: the grip stays put, the head arcs
  const gx = x + 8, gy = y + 1.5;
  const hx = gx - ca * 8, hy = gy - sa * 8;
  const pts = [];
  for (let i = 0; i <= 15; i++) pts.push([gx - ca * i * a, gy - sa * i * a, i < 5 ? WOOD_LO : WOOD]);
  for (let i = -4; i <= 4; i++) for (let j = -2; j <= 3; j++) {
    pts.push([hx - ca * j * a - sa * i * a, hy - sa * j * a + ca * i * a, i < -2 ? "#dde0e6" : i > 2 ? "#6a6e78" : "#a4a8b2"]);
  }
  ctx.fillStyle = INK;
  for (const [px, py] of pts) ctx.fillRect(sn(px) - a, sn(py) - a, 3 * a, 3 * a);
  for (const [px, py, c] of pts) { ctx.fillStyle = c; ctx.fillRect(sn(px), sn(py), a, a); }
};

// ======================================================================
// BRANCH / ASCEND: a column of gold light takes the old form; the new one
// shoots up out of it and a ring of gold motes rolls out round its feet.
const raiseGrand = (ctx, t, p, dur, time, paint) => {
  const grand = t.raised.how === "ascend";
  const prev = { ...t, ...(t.raised.prev || {}) };
  const bo = measure(t, prev), bn = measure(t, t);
  const x = sn(t.x), by = sn(t.y + 3), hhN = by - (t.y + bn.top), hhO = by - (t.y + bo.top);
  const SW = grand ? 0.44 : 0.42;
  const s = t.id * 29 + (grand ? 5 : 1);
  const W0 = grand ? 15 : 12;
  const colTop0 = t.y + Math.min(bo.top, bn.top) - (grand ? 22 : 14);
  // the column: grows round the old form, then narrows away upward
  const cw = p < SW ? W0 * eo(seg(p, 0, SW * 0.7)) : W0 * (1 - eo(seg(p, SW, SW + 0.34)));
  const colTop = p < SW ? colTop0 : colTop0 - 40 * eo(seg(p, SW, SW + 0.34));
  const colA = p < SW ? 0.7 + 0.3 * seg(p, SW * 0.5, SW) : 1;
  // the ring of motes: behind the hall first, the front half after it
  const motes = (front) => {
    const mu = seg(p, SW, grand ? 0.95 : 0.93);
    if (mu <= 0 || mu >= 1) return;
    const n = grand ? 14 : 10, r = 8 + (grand ? 26 : 21) * eo(mu), rot = mu * 1.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot, sa = Math.sin(a);
      if ((sa > 0) !== front) continue;
      const mx = x + Math.cos(a) * r, my = by + sa * r * 0.45 - mu * (6 + hash(s, i) * 10);
      if (mu > 0.7 && hash(s, i + 40 + Math.floor(mu * 12)) < (mu - 0.7) * 3) continue;
      const tw = (i + Math.floor(mu * 10)) % 4 === 0;
      if (tw) twinkle(ctx, mx, my, 2);
      else { rect(ctx, mx - 0.5, my - 0.5, 1.5, 1.5, "#8a6420"); rect(ctx, mx - 0.5, my - 0.5, 1, 1, i % 3 ? GOLD : GOLD_HI); }
    }
  };
  // light rising in the column
  const risers = () => {
    if (cw < 2) return;
    const n = grand ? 7 : 5, span = by - colTop;
    for (let i = 0; i < n; i++) {
      const k = ((time * (grand ? 70 : 55) + hash(s, i + 70) * span) % span);
      const mx = x + (hash(s, i + 80) - 0.5) * cw * 1.2, my = by - k;
      rect(ctx, mx, my, 0.5, i % 2 ? 1 : 1.5, i % 3 ? GOLD_HI : CREAM);
    }
  };
  motes(false);
  if (p < SW) {
    // the old form trembles and brightens in the light
    const shake = p > SW * 0.4 ? (Math.floor(time * 40) % 2 ? 0.5 : -0.5) : 0;
    const draw = () => paintScaled(ctx, paint, prev, x, by, 1, 1, bo.hw, hhO, shake, 0);
    draw();
    const g = Math.floor(seg(p, SW * 0.25, SW) * 4) / 4 * (grand ? 0.34 : 0.28);
    paintGlow(ctx, paint, prev, g + (Math.floor(time * 24) % 2 ? 0.06 : 0), draw);
  } else {
    // the new form shoots up out of it and bounces, glowing as it comes
    const big = grand ? 1.22 : 1.16;
    const sy = keys(p, [[SW, 0.3], [SW + 0.12, big], [SW + 0.22, 0.91], [SW + 0.32, 1.05], [SW + 0.42, 0.985], [SW + 0.48, 1]]);
    const sx = keys(p, [[SW, 0.7], [SW + 0.12, 0.9], [SW + 0.22, 1.08], [SW + 0.32, 0.98], [SW + 0.42, 1.01], [SW + 0.48, 1]]);
    const draw = () => paintScaled(ctx, paint, t, x, by, sx, sy, bn.hw, hhN);
    draw();
    paintGlow(ctx, paint, t, Math.floor((1 - seg(p, SW, SW + 0.3)) * 4) / 4 * 0.36, draw);
  }
  column(ctx, x, by + 4, colTop, cw, colA);
  risers();
  motes(true);
  // sparkles on the new crown
  if (p > SW) {
    const topY = t.y + bn.top;
    const sp = [[0.1, 0.3, 0, 0], [0.18, 0.4, -0.55, 0.25], [0.26, 0.46, 0.5, 0.4]];
    if (grand) sp.push([0.14, 0.4, 0.8, 0.1], [0.3, 0.5, -0.3, 0.55]);
    for (const [a, b, fx, fy] of sp) {
      const u = seg(p, SW + a, SW + b);
      if (u > 0 && u < 1) twinkle(ctx, x + fx * bn.hw, topY + 2 + fy * hhN, Math.round(Math.sin(u * Math.PI) * (grand ? 5 : 4)));
    }
  }
};

// ======================================================================
let WARNED = false;
export const drawRaising = (ctx, t, time, paint) => {
  const r = t.raised, dur = RAISE_SECS[r && r.how] || 0.6;
  const p = r ? cl((time - r.at) / dur) : 1;
  // the last moments are the hall itself, so the hand back is seamless
  if (p >= 0.97 || typeof document === "undefined") { paint(t); return; }
  ctx.save();
  try {
    if (r.how === "build") raiseBuild(ctx, t, p, dur, time, paint);
    else if (r.how === "level") raiseLevel(ctx, t, p, dur, time, paint);
    else raiseGrand(ctx, t, p, dur, time, paint);
  } catch (err) {
    if (!WARNED) { WARNED = true; console.error("raise failed", t.kind, err); }
    ctx.restore(); ctx.save();
    paint(t);
  }
  ctx.restore();
};
