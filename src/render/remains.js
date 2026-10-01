// ============ THE FALLEN, LYING ON THE ROAD ============
// The corpses a necromancer may raise (g.corpses, engine/actions.js) never
// fade now, so they are drawn: a small scatter of bones and a skull where each
// fell, flush with the road under the crowd. Cheap on purpose — up to
// CORPSE_CAP of them, a handful of 1-unit rects each, no sprites.
import { hash } from "./paint.js";

const BONE = "#e6dcbc", BONE_DK = "#a99d7c", SHADE = "rgba(34,22,34,0.3)";

export const drawRemains = (ctx, g) => {
  const cs = g.corpses;
  if (!cs || !cs.length) return;
  for (const c of cs) {
    const k = Math.max(0.7, Math.min(1.5, (c.size || 14) / 15));
    const x = Math.round(c.x), y = Math.round(c.y + 2), s = hash(Math.round(c.x), Math.round(c.y));
    ctx.fillStyle = SHADE;
    ctx.fillRect(x - 5 * k, y + 1, 10 * k, 2);
    ctx.fillStyle = BONE_DK;
    ctx.fillRect(x - 4 * k, y - 1, 8 * k, 1);               // spine
    ctx.fillStyle = BONE;
    for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 2 * k, y - 2 + (i & 1), 1, 3);   // ribs
    ctx.fillRect(x + (s < 0.5 ? 4 : -6) * k, y - 2, 2, 2);   // the skull
    ctx.fillRect(x + (s < 0.5 ? -6 : 3) * k, y + 1, 3, 1);   // a stray long bone
  }
};
