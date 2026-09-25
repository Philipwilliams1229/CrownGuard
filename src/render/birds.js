// ============ THE FALCONRY'S BIRDS ============
// A falcon's stoop: out from the roost on a curve, down hard onto its mark,
// and a beating climb home. Drawn from the "talon" effect (x1,y1 -> x2,y2,
// ttl/life) the engine pushes on every strike; `a` is the effect's fade.
// The Skyknight's war-eagle is a rig ("eagle" in rigs.js).

import { S } from "../data/constants.js";

export const drawStoop = (ctx, fx, a) => {
  // the stoop is a curve, not a line: out wide, down hard, and home again
  const life = fx.life || 520;
  const prog = 1 - fx.ttl / life;
  const side = ((Math.round(fx.x1 + fx.y1)) & 2) - 1;
  const cx = (fx.x1 + fx.x2) / 2 + side * 26;
  const cy = (fx.y1 + fx.y2) / 2 - 14;
  const bez = (t2) => {
    const u = 1 - t2;
    return [u * u * fx.x1 + 2 * u * t2 * cx + t2 * t2 * fx.x2,
            u * u * fx.y1 + 2 * u * t2 * cy + t2 * t2 * fx.y2];
  };
  const out = Math.min(1, prog / 0.5);
  const back = Math.max(0, (prog - 0.5) / 0.5);
  const tt = back > 0 ? 1 - back * back * (3 - 2 * back) : out * out;
  const lift = back > 0 ? Math.sin(back * Math.PI) * 9 : 0;
  const [hx, hy] = bez(tt);
  // ghost wingbeats trailing the flight
  for (let gi = 1; gi <= 2; gi++) {
    const gtt = back > 0 ? Math.min(1, tt + gi * 0.09) : Math.max(0, tt - gi * 0.09);
    const [gx, gy] = bez(gtt);
    ctx.fillStyle = `rgba(232,226,212,${(0.28 - gi * 0.11) * a})`;
    ctx.fillRect(S(gx) - 2, S(gy) - lift - 1, 5, 2);
  }
  if (out === 1 && back < 0.2) {
    ctx.fillStyle = `rgba(224,184,85,${0.9 - back * 4})`;
    ctx.fillRect(S(fx.x2) - 2, S(fx.y2) - 2, 5, 5);
  }
  const bx = S(hx), by = S(hy) - lift;
  const ink = `rgba(16,19,26,${Math.min(1, a + 0.2)})`;
  ctx.fillStyle = ink;
  if (back === 0) {
    // wings swept for the dive
    ctx.fillRect(bx - 2, by - 3, 2, 3); ctx.fillRect(bx + 1, by - 3, 2, 3);
    ctx.fillRect(bx - 1, by - 1, 3, 3);
  } else {
    // the climb home, wings beating
    const upstroke = Math.sin(prog * 26) > 0;
    if (upstroke) { ctx.fillRect(bx - 4, by - 2, 3, 2); ctx.fillRect(bx + 2, by - 2, 3, 2); }
    else { ctx.fillRect(bx - 5, by, 3, 2); ctx.fillRect(bx + 3, by, 3, 2); }
    ctx.fillRect(bx - 1, by - 1, 3, 3);
  }
  ctx.fillStyle = `rgba(160,130,88,${a})`; ctx.fillRect(bx - 1, by, 2, 1);
  ctx.fillStyle = `rgba(232,226,212,${a})`; ctx.fillRect(bx - 1, by + 1, 2, 1);
};
