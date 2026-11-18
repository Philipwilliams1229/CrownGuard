// ============ THE BALLISTA'S CHAIN HARPOON ============
// The Gate Ballista's tier 4 (data/castle.js ballista `pin`): its bolt drags a chain; where it strikes
// a foe (never a boss) the foe is held 2 s, the chain run taut from the bolt in its body to an iron
// stake driven into the road behind it (engine: e.pinUntil, e.pinAnchor, e.pinAt); then the chain
// snaps and its links drop. In flight the chain pays out behind the bolt, sagging, back to the bow
// (engine: the bolt's p.pin with p.ox / p.oy, where it left the bow).
//   drawPinnedChains  ground layer, before the crowd: the stake and the taut chain, then the snap
//   drawHarpoonLines  over the crowd, with the shots: the chain paying out behind a flying bolt

const IRON = "#4a4652", IRON_LT = "#a8a4b0", IRON_DK = "#26222c", RUST = "#7a5040";
const SNAP_MS = 420;

// links along a line from (x0,y0) to (x1,y1), sagging `sag` at the middle: alternate flat and
// upright links, each dark with a lit pixel (one sun upper left)
const chain = (ctx, x0, y0, x1, y1, sag, shake = 0, alpha = 1, drop = 0) => {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 2.6));
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t);
    if (shake) y += Math.sin(i * 1.7 + shake) * 0.5 * Math.sin(t * Math.PI);
    if (drop) { x += Math.sin(i * 2.3) * drop * 0.4; y += drop * (0.6 + 0.4 * Math.sin(i * 1.3)) * (1 - t * 0.3); }
    const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2;
    // (chunky enough to read at board size: a flat link 3 x 1.5, an upright 1.5 x 3, each with an open eye)
    const flat = i % 2 === 0, w = flat ? 3 : 1.5, h = flat ? 1.5 : 3;
    ctx.fillStyle = IRON_DK; ctx.fillRect(rx - w / 2 - 0.5, ry - h / 2 - 0.5, w + 1, h + 1);
    ctx.fillStyle = IRON; ctx.fillRect(rx - w / 2, ry - h / 2, w, h);
    ctx.fillStyle = IRON_LT; ctx.fillRect(rx - w / 2, ry - h / 2, flat ? w - 0.5 : 0.5, flat ? 0.5 : h - 0.5);
  }
  ctx.restore();
};

// the stake: an iron spike driven into the road at a slant, a ring at its head
const stake = (ctx, x, y) => {
  ctx.fillStyle = "rgba(20,16,24,0.35)"; ctx.fillRect(x - 3, y + 1, 7, 1.5);            // its shadow
  ctx.fillStyle = "#6a4a32"; ctx.fillRect(x - 2.5, y, 5, 1.5);                          // turned earth
  ctx.fillStyle = IRON_DK; ctx.fillRect(x - 1, y - 6, 2.5, 7);                           // the spike
  ctx.fillStyle = IRON_LT; ctx.fillRect(x - 1, y - 6, 1, 6);
  ctx.fillStyle = IRON_DK; ctx.fillRect(x - 2.5, y - 9, 5, 3.5);                         // the ring at its head
  ctx.fillStyle = IRON; ctx.fillRect(x - 2, y - 8.5, 4, 2.5);
  ctx.fillStyle = IRON_DK; ctx.fillRect(x - 1, y - 8, 2, 1.5);
  ctx.fillStyle = RUST; ctx.fillRect(x - 2, y - 8.5, 1, 1);
};

export const drawPinnedChains = (ctx, g) => {
  const tms = (g.time || 0) * 1000;
  for (const e of g.enemies) {
    if (e.dead || !e.pinAnchor) continue;
    const [ax, ay] = e.pinAnchor, hx = e.x, hy = e.y - (e.flying ? 10 : 4);
    if (e.pinUntil > tms) {
      // held: the chain taut (a little slack the first moment as the stake bites), the foe straining at it
      const age = tms - (e.pinAt || tms), slack = age < 160 ? 3 * (1 - age / 160) : 0.4;
      stake(ctx, ax, ay);
      chain(ctx, ax, ay - 7, hx, hy, slack, tms / 60);
      // the bolt's head in the body, a glint
      ctx.fillStyle = IRON_DK; ctx.fillRect(Math.round(hx * 2) / 2 - 1.5, Math.round(hy * 2) / 2 - 1.5, 3, 3);
      ctx.fillStyle = IRON_LT; ctx.fillRect(Math.round(hx * 2) / 2 - 1, Math.round(hy * 2) / 2 - 1, 1, 1);
    } else if (tms - e.pinUntil < SNAP_MS) {
      // snapped: the stake stays a moment, the links fall slack to the road and fade
      const k = (tms - e.pinUntil) / SNAP_MS;
      stake(ctx, ax, ay);
      chain(ctx, ax, ay - 7, ax + (hx - ax) * (1 - k) * 0.6, ay - 7 + (hy - ay + 7) * (1 - k) * 0.6, 1, 0, 1 - k, 4 * k);
    } else e.pinAnchor = null;
  }
};

export const drawHarpoonLines = (ctx, g) => {
  for (const p of g.projectiles) {
    if (!p.pin || p.delay > 0 || p.ox == null) continue;
    const len = Math.hypot(p.x - p.ox, p.y - p.oy);
    chain(ctx, p.ox, p.oy, p.x, p.y, Math.min(10, len * 0.06));
  }
};
