// ============ THE BALLISTA'S CHAIN HARPOON ============
// The Gate Ballista's tier 4 (data/castle.js ballista `pin`, every third bolt; never a boss): the bolt
// flies as any bolt. Where it strikes, it stays in the foe at the angle it flew, and a light chain
// shoots from it to an iron stake in the road behind the foe (SNAP_IN ms), holds taut while the foe
// is pinned (engine: e.pinUntil, e.pinAnchor, e.pinAt, e.pinAng), then SNAPS: it breaks in the
// middle, the stake's half drops to the road, the bolt's half whips back to the foe, links fly off.
//   drawPinnedChains  over the crowd (draw.js, after the figures): the stake, the chain, the bolt

import { drawStuckBolt } from "./fx.js";

const LINK = "#8e8a96", LINK_LT = "#c8c4d0", STAKE = "#4a4652", STAKE_LT = "#a8a4b0";
const SNAP_IN = 140, SNAP_OUT = 380;

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
    } else if (tms - e.pinUntil < SNAP_OUT) {
      // snapped: a flash where it broke, the stake's half falls flat on the road, the bolt's half
      // whips back and goes slack against the foe, three links spin off from the break and fall
      const f = (tms - e.pinUntil) / SNAP_OUT, ease = 1 - (1 - f) * (1 - f);
      const mx = (hx + ax) / 2, my = (hy + ay - 3) / 2;
      stake(ctx, ax, ay, 1 - f * 0.6);
      // the stake's half: from the stake to the break, its free end dropping to the road
      chain(ctx, ax, ay - 3, mx + (ax - mx) * 0.2 * ease, my + (ay + 1 - my) * ease, 0.2, 1 - f * 0.5);
      // the bolt's half: whipped back, the free end flung past the foe then hanging under it
      const wx = hx + (hx - mx) * 0.4 * Math.sin(ease * Math.PI), wy = my + (hy + 6 - my) * ease;
      chain(ctx, hx, hy, wx, wy, 0.5, 1 - f * 0.5);
      if (e.pinAng != null && f < 0.8) drawStuckBolt(ctx, hx, hy, e.pinAng);
      // the links that flew from the break
      ctx.fillStyle = LINK_LT;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.9, sp = 10 + i * 3;
        const lx = mx + Math.cos(a) * sp * f, ly = my + Math.sin(a) * sp * f + 18 * f * f;
        if (f < 0.85) { ctx.fillStyle = LINK; ctx.fillRect(Math.round(lx * 2) / 2 - 0.5, Math.round(ly * 2) / 2 - 0.5, 2, 1.5); ctx.fillStyle = LINK_LT; ctx.fillRect(Math.round(lx * 2) / 2 - 0.5, Math.round(ly * 2) / 2 - 0.5, 1, 0.5); }
      }
      if (f < 0.15) { ctx.fillStyle = "#fff3d2"; ctx.fillRect(mx - 1.5, my - 1.5, 3, 3); ctx.fillRect(mx - 3, my - 0.5, 6, 1); ctx.fillRect(mx - 0.5, my - 3, 1, 6); }
    } else e.pinAnchor = null;
  }
};
