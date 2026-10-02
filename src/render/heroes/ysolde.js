// ysolde's effects on the board (see ./index.js for the hooks). Her ordinary
// bolt is the house chain lightning (fx.js drawChain, an effect "bolt" with
// `pts`); here are what only she throws: Chain Storm's great bolt
// (effect "ysStorm") and the Thunderclap's thunderhead (g.thunderheads,
// engine/heroes/ysolde.js), plus her pose while she calls them.
// Pixel rules as fx.js: everything stamped on the art grid (PX), alpha in
// hard steps, light from the upper left.
import { PX, hash } from "../paint.js";
import { ringPx } from "../fx.js";
import { stormCloud, stormShadow, stormSpots } from "../stormcloud.js";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const snap = (v) => Math.round(v * PX) / PX;

// the storm's colours: the house bolt's cyan-white (fx.js BOLT_TONES); the
// cloud's own are stormcloud.js CLOUD_PALS.storm
const BOLT = ["#5ab4f0", "#8ad0f8", "#bfeeff", "#ffffff"];

// a square stamp of side s along a line, on the art grid (fx.js stampLine)
const stampLine = (ctx, x0, y0, x1, y1, s) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * PX));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    ctx.rect(snap(x - s / 2), snap(y - s / 2), s, s);
  }
};
// a filled pixel disc (rows of the art grid), added to the current path
const discPath = (ctx, x, y, rx, ry) => {
  const step = 1 / PX;
  for (let dy = -ry; dy <= ry; dy += step) {
    const hw = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
    if (hw < step / 2) continue;
    ctx.rect(snap(x - hw), snap(y + dy), snap(hw * 2) || step, step);
  }
};

// A jagged bolt through `pts`, re-forked every `fr` (so it flickers): the
// segments [x1, y1, x2, y2, fork] to stamp. `amp` the zigzag's reach.
const jag = (pts, sd, fr, amp, forkP = 0.7) => {
  const segs = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const [x1, y1] = pts[s], [x2, y2] = pts[s + 1];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const n = Math.max(2, Math.round(len / 8)), A = Math.min(amp, len * 0.16);
    let px = x1, py = y1;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const j = k === n ? 0 : (hash(sd + fr * 97, s * 31 + k) - 0.5) * 2 * A * Math.sqrt(Math.sin(t * Math.PI));
      const qx = x1 + (x2 - x1) * t + nx * j, qy = y1 + (y2 - y1) * t + ny * j;
      segs.push([px, py, qx, qy, 0]);
      if (k < n && hash(sd + fr * 53, s * 17 + k) > forkP) {
        const side = hash(sd + fr, s * 7 + k) > 0.5 ? 1 : -1;
        let bx = qx, by = qy, ba = Math.atan2(y2 - y1, x2 - x1) + side * (0.5 + 0.7 * hash(sd, k + s * 5));
        for (let b = 0; b < 4; b++) {
          const L = 4 + 5 * hash(sd + fr * 11, s * 13 + k * 3 + b);
          const ex = bx + Math.cos(ba) * L, ey = by + Math.sin(ba) * L;
          segs.push([bx, by, ex, ey, 1 + b]);
          bx = ex; by = ey; ba += (hash(sd + b, fr + k) - 0.5) * 1.3;
        }
      }
      px = qx; py = qy;
    }
  }
  return segs;
};
// stamp a bolt's segments in four layers, thick glow to white core. `w` its
// weight (1 the ordinary bolt's, more for the great ones), `p` its age 0..1.
const strokeBolt = (ctx, segs, w, p) => {
  const a0 = ctx.globalAlpha;
  const layer = (col, a, main, fork, coreOnly) => {
    ctx.globalAlpha = a0 * a;
    ctx.fillStyle = col; ctx.beginPath();
    for (const [x1, y1, x2, y2, f] of segs) {
      if (f && coreOnly) continue;
      const s = f ? Math.max(0.5, fork - (f - 1) * 0.4) : main;
      stampLine(ctx, x1, y1, x2, y2, s);
    }
    ctx.fill();
  };
  const fade = p < 0.35 ? 1 : stepA(1 - (p - 0.35) / 0.65);
  layer(BOLT[0], 0.3 * fade, 6 * w, 3 * w);
  layer(BOLT[1], 0.6 * fade, 3.5 * w, 1.8 * w);
  layer(BOLT[2], fade, 2 * w, 1, false);
  if (p < 0.7) layer(BOLT[3], 1, 1 * w, 0.5, true);
  ctx.globalAlpha = a0;
};
// a crack of light where a great bolt bites: a white star with long rays
// (a little longer up and down), shrinking to a spark, a ring blown out
const crack = (ctx, x, y, p, size = 1) => {
  if (p >= 1) return;
  const a0 = ctx.globalAlpha;
  const L = (9 - 6 * p) * size, s = p < 0.3 ? 1.5 : 1;
  ctx.fillStyle = BOLT[2]; ctx.beginPath();
  for (const [dx, dy, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 0.8], [0, -1, 1.25], [0.7, 0.7, 0.45], [-0.7, 0.7, 0.45], [0.7, -0.7, 0.45], [-0.7, -0.7, 0.45]]) {
    stampLine(ctx, x, y, x + dx * L * k, y + dy * L * k, s);
  }
  ctx.fill();
  ctx.fillStyle = BOLT[3]; ctx.beginPath();
  discPath(ctx, x, y, 2.2 * (1 - p) + 0.6, 2.2 * (1 - p) + 0.6);
  stampLine(ctx, x - L * 0.5, y, x + L * 0.5, y, 1);
  stampLine(ctx, x, y - L * 0.6, x, y + L * 0.4, 1);
  ctx.fill();
  if (p < 0.6) {
    ctx.globalAlpha = a0 * stepA(1 - p / 0.6);
    ringPx(ctx, x, y, (4 + 10 * p) * size, (4 + 10 * p) * size, 1, BOLT[1]);
  }
  ctx.globalAlpha = a0;
};

// ---- Chain Storm -----------------------------------------------------------
// A great bolt from her staff through every foe it leapt to, twice the weight
// of her ordinary one, re-forked every 40 ms, a crack of light at each foe.
// The leaps light one after another (35 ms apart, a quick ripple down the
// line), then the whole stroke holds and fades.
const drawStorm = (ctx, fx) => {
  const life = fx.life || 520, age = life - fx.ttl, p = age / life;
  if (p >= 1 || !fx.pts || fx.pts.length < 2) return;
  const k = life / 520, lit = Math.min(fx.pts.length, 2 + Math.floor(age / (35 * k)));
  const pts = fx.pts.slice(0, lit);
  const sd = Math.floor((fx.seed || 0) * 1000), fr = Math.floor(age / (40 * k));
  strokeBolt(ctx, jag(pts, sd, fr, 10, 0.6), 1.6, p);
  // a second, thinner strand beside it for the first moments: a storm, not a spark
  if (p < 0.45) strokeBolt(ctx, jag(pts, sd + 7, fr + 3, 7, 0.85), 0.7, p + 0.3);
  for (let i = 1; i < pts.length; i++) {
    const q = clamp01((age - (i - 1) * 35 * k) / (300 * k));
    crack(ctx, pts[i][0], pts[i][1], q, 1.2);
  }
  // the staff's crystal blazes as it lets go
  if (p < 0.4) crack(ctx, fx.pts[0][0], fx.pts[0][1], p / 0.4 * 0.7 + 0.3, 0.7);
};

// ---- Thunderclap -------------------------------------------------------------
// The thunderhead hangs CLOUD_H above the spot. It gathers from a wisp to a
// full cloud over `delay` (the engine's game-time clock; the look follows
// it), flickering more and more; then breaks — a stroke to the ground, a
// flash, a ring of light across the struck circle — and thins away.
const CLOUD_H = 62;
const thGather = (th, tms) => clamp01((tms - th.t0) / Math.max(1, th.at - th.t0));
// the thunderhead's make: its size from the struck circle (buckets of 8, so
// a few baked sizes serve every rank of "a wider storm"), one of three
// shapes (seeded by where it stands), and where it sways
const thSpec = (th) => {
  if (th._spec) return th._spec;
  const w = Math.max(64, Math.round((th.r * 1.55) / 8) * 8), h = Math.round(w * 0.36);
  const seed = 1 + Math.floor(hash(Math.round(th.x), Math.round(th.y)) * 2);
  th._spec = { w, h, seed, spots: stormSpots(w, h, seed, 2), sd: Math.round(th.x * 7 + th.y * 13) };
  return th._spec;
};
// where its base's middle stands at a moment: it sways a little while it
// gathers, then drifts off east and up as it thins
const thBase = (th, tms, after) => {
  const { sd } = thSpec(th);
  return [th.x + Math.sin(tms / 520 + sd) * 0.8 + after * 7, th.y - CLOUD_H + 2 - 5 * after];
};
const drawCloud = (ctx, th, tms) => {
  const p = thGather(th, tms);
  const k = th.k || 1;
  const after = th.broke ? (tms - th.broke) / (900 * k) : 0;   // 0..1 as it thins
  if (after >= 1) return;
  const { w, h, seed, spots, sd } = thSpec(th);
  const [cx, cy] = thBase(th, tms, after);
  const g = th.broke ? 1 : p;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (th.broke ? stepA(1 - after * 0.85, 4) : stepA(0.55 + 0.45 * p, 4));
  // the light inside: a flicker in its belly, quicker as it ripens; at the
  // break, a band of light right through it where the stroke leaves
  let lit = null;
  const q = th.broke ? (tms - th.broke) / (420 * k) : 1;
  if (th.broke && q < 0.35) {
    lit = { x: (hash(sd, 1) - 0.5) * th.r * 0.4, y: -h * 0.2, r: h * (q < 0.15 ? 1.5 : 1) };
  } else if (!th.broke && p > 0.3) {
    const slot = Math.floor(tms / 70);
    if (hash(sd + slot, 3) < 0.2 + 0.6 * p) {
      const s = spots[Math.floor(hash(sd + slot, 5) * spots.length)], gg = 0.3 + 0.7 * Math.round(g * 6) / 6;
      lit = { x: s.x * (0.55 + 0.45 * gg), y: s.y * gg * gg, r: s.r * (0.6 + 0.4 * gg) * (p > 0.7 ? 1.2 : 1) };
    }
  }
  stormCloud(ctx, cx, cy, {
    // while it gathers each stage of growth is its own churn frame (fewer
    // bakes; the growing is the motion), then it churns as it thins
    w, h, pal: "storm", seed, frames: 4, amp: 1.4,
    frame: th.broke ? Math.floor(tms / 140) : Math.round(g * 6),
    grow: g, thin: clamp01((after - 0.12) / 0.88), dark: th.broke ? 0.15 : 0.3 * p, lit,
  });
  // now and then a thread of light runs along under it as it ripens
  if (!th.broke && p > 0.4) {
    const slot = Math.floor(tms / 70);
    if (hash(sd + slot, 3) < 0.2 + 0.6 * p && hash(sd + slot, 7) < 0.5) {
      const x1 = cx + (hash(sd + slot, 8) - 0.5) * w * 0.7, x2 = x1 + (hash(sd + slot, 9) - 0.5) * w * 0.5;
      ctx.globalAlpha = a0;
      strokeBolt(ctx, jag([[x1, cy + 5], [x2, cy + 7 + hash(sd + slot, 10) * 4]], sd + slot, 0, 3, 0.9), 0.45, 0.2);
    }
  }
  ctx.globalAlpha = a0;
};
const drawBreak = (ctx, th, tms) => {
  if (!th.broke) return;
  const k = th.k || 1, age = tms - th.broke;
  const q = age / (420 * k);
  if (q >= 1) return;
  const sd = Math.round(th.x * 7 + th.y * 13);
  const fr = Math.floor(age / (45 * k));
  // the stroke: cloud to ground, heavy, with a forked second strand
  const top = [th.x + (hash(sd, 1) - 0.5) * th.r * 0.4, th.y - CLOUD_H + 2 + thSpec(th).h * 0.12];
  strokeBolt(ctx, jag([top, [th.x, th.y - 2]], sd, fr, 9, 0.55), 1.9, q);
  if (q < 0.5) strokeBolt(ctx, jag([[top[0] + 8, top[1]], [th.x + (hash(sd, 2) - 0.5) * th.r, th.y - 2]], sd + 5, fr, 7, 0.75), 0.8, q + 0.25);
  // the ground blooms white where it struck, for a blink
  if (q < 0.3) {
    const a0 = ctx.globalAlpha, f = q / 0.3;
    ctx.globalAlpha = a0 * stepA(1 - f) * 0.7;
    ctx.fillStyle = BOLT[2]; ctx.beginPath(); discPath(ctx, th.x, th.y, th.r * (0.35 + 0.4 * f), th.r * (0.3 + 0.35 * f)); ctx.fill();
    ctx.globalAlpha = a0 * stepA(1 - f);
    ctx.fillStyle = BOLT[3]; ctx.beginPath(); discPath(ctx, th.x, th.y - 1, th.r * 0.18, th.r * 0.14); ctx.fill();
    ctx.globalAlpha = a0;
  }
  crack(ctx, th.x, th.y - 2, q, 1.8);
  // a little crack of light on each foe it struck
  if (th.hits) for (const [x, y] of th.hits) crack(ctx, x, y, clamp01(q * 1.6), 0.6);
};

export default {
  // Chain Storm: her strike frame held a blink; Thunderclap: the staff raised
  // overhead (the "sky" sheet, which falls back to her fight frames on a rig
  // that has none), frames 0-3 across the gathering
  pose(b, u, time) {
    const c = u.cast;
    if (!c) return null;
    const tms = time * 1000;
    if (tms >= c.until || tms < c.t0) return null;
    if (c.kind === "thunder") return { sheet: "sky", frame: Math.min(3, Math.floor(((tms - c.t0) / (c.until - c.t0)) * 4)) };
    if (c.kind === "storm") return { sheet: "fight", frame: 1 };   // held at the thrust the bolt leaves from
    return null;
  },

  // the thunderhead's shadow on the ground, darkening as it gathers, and a
  // pale ring of the circle it will strike; gone in a few steps after
  under(ctx, g) {
    const list = g.thunderheads;
    if (!list || !list.length) return;
    const tms = g.time * 1000, a0 = ctx.globalAlpha;
    for (const th of list) {
      const p = thGather(th, tms), k = th.k || 1;
      const after = th.broke ? (tms - th.broke) / (600 * k) : 0;
      if (after >= 1) continue;
      // the cloud's own footprint (stormcloud.js), nudged down-right away
      // from the sun, darkening as it gathers and drifting off with it
      const { w, h, seed } = thSpec(th);
      const [cx] = thBase(th, tms, th.broke ? (tms - th.broke) / (900 * k) : 0);
      ctx.globalAlpha = a0 * stepA((0.35 + 0.65 * p) * (1 - after), 4);
      stormShadow(ctx, cx + 3, th.y + 2, { w, h, seed, grow: th.broke ? 1 : p, thin: after });
      ctx.globalAlpha = a0;
      if (!th.broke) {
        ctx.globalAlpha = a0 * (0.35 + 0.35 * stepA(p));
        ringPx(ctx, th.x, th.y, th.r, th.r * 0.92, 1, BOLT[1]);
        ctx.globalAlpha = a0;
      } else {
        // the struck circle flares and fades
        ctx.globalAlpha = a0 * stepA(1 - after);
        ringPx(ctx, th.x, th.y, th.r * (0.8 + 0.2 * after), th.r * 0.92 * (0.8 + 0.2 * after), 2, BOLT[2]);
        ctx.globalAlpha = a0;
      }
    }
  },

  fx(ctx, g) {
    const tms = g.time * 1000;
    for (const fx of g.effects) if (fx.type === "ysStorm") drawStorm(ctx, fx);
    const list = g.thunderheads;
    if (!list || !list.length) return;
    for (const th of list) { drawCloud(ctx, th, tms); drawBreak(ctx, th, tms); }
  },
};
