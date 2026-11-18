// ============ THE BALLISTA'S CHAIN HARPOON ============
// The Gate Ballista's tier 4 (data/castle.js ballista `pin`, every third bolt; never a boss): the bolt
// flies as any bolt. Where it strikes, it stays in the foe at the angle it flew, and a light chain
// shoots from it to an iron stake in the road behind the foe (SNAP_IN ms), holds taut while the foe
// is pinned (engine: e.pinUntil, e.pinAnchor, e.pinAt, e.pinAng), then goes slack and fades.
//   drawPinnedChains  over the crowd (draw.js, after the figures): the stake, the chain, the bolt

import { drawStuckBolt } from "./fx.js";

const LINK = "#8e8a96", LINK_LT = "#c8c4d0", STAKE = "#4a4652", STAKE_LT = "#a8a4b0";
const SNAP_IN = 140, FADE = 360;

// a light chain: single-pixel links, every other one lit, a hair of sag
const chain = (ctx, x0, y0, x1, y1, sag = 0.4, alpha = 1, drop = 0) => {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 1.5));
  ctx.save(); ctx.globalAlpha *= alpha * 0.9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t) + drop * Math.sin(t * Math.PI);
    ctx.fillStyle = i % 2 ? LINK_LT : LINK;
    ctx.fillRect(Math.round(x * 2) / 2 - 0.25, Math.round(y * 2) / 2 - 0.25, 0.75, 0.75);
  }
  ctx.restore();
};
// a small iron stake in the road
const stake = (ctx, x, y, alpha = 1) => {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = "rgba(20,16,24,0.3)"; ctx.fillRect(x - 1.5, y + 0.5, 3, 1);
  ctx.fillStyle = STAKE; ctx.fillRect(x - 0.5, y - 3, 1, 3.5);
  ctx.fillStyle = STAKE_LT; ctx.fillRect(x - 0.5, y - 3, 0.5, 2.5);
  ctx.fillStyle = STAKE; ctx.fillRect(x - 1, y - 4, 2, 1);
  ctx.restore();
};

export const drawPinnedChains = (ctx, g) => {
  const tms = (g.time || 0) * 1000;
  for (const e of g.enemies) {
    if (e.dead || !e.pinAnchor) continue;
    const [ax, ay] = e.pinAnchor, hx = e.x, hy = e.y - (e.flying ? 10 : 6);
    const age = tms - (e.pinAt || tms);
    if (e.pinUntil > tms) {
      // the chain shoots out from the bolt to the stake, then holds taut
      const k = Math.min(1, age / SNAP_IN);
      const ex = hx + (ax - hx) * k, ey = hy + (ay - 3 - hy) * k;
      if (k >= 1) stake(ctx, ax, ay);
      chain(ctx, hx, hy, ex, ey, k < 1 ? 0 : 0.3);
      if (e.pinAng != null) drawStuckBolt(ctx, hx, hy, e.pinAng);
    } else if (tms - e.pinUntil < FADE) {
      // let go: slack, sagging to the road, fading with the stake
      const f = (tms - e.pinUntil) / FADE;
      stake(ctx, ax, ay, 1 - f);
      chain(ctx, hx, hy, ax, ay - 3, 0.3 + 3 * f, 1 - f, 2 * f);
    } else e.pinAnchor = null;
  }
};
