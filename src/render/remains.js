// ============ THE FALLEN, LYING ON THE ROAD ============
// The corpses a necromancer may raise (g.corpses, engine/actions.js) lie
// where they fell for as long as their wave goes on, so they are drawn: a
// small scatter of bones and a skull, flush with the road under the crowd.
// When the wave is cleared they dissolve piece by piece (fadeAt/fadeMs, set
// by update.js dissolveCorpses). Cheap on purpose — up to CORPSE_CAP of them,
// a handful of 1-unit rects each, no sprites.
import { hash } from "./paint.js";

const BONE = "#e6dcbc", BONE_DK = "#a99d7c", SHADE = "rgba(34,22,34,0.3)";

export const drawRemains = (ctx, g) => {
  const cs = g.corpses;
  if (!cs || !cs.length) return;
  const now = g.time * 1000;
  for (const c of cs) {
    const k = Math.max(0.7, Math.min(1.5, (c.size || 14) / 15));
    const x = Math.round(c.x), y = Math.round(c.y + 2), s = hash(Math.round(c.x), Math.round(c.y));
    // a wave's end sets the bones dissolving: each piece drops out, one by one, at its own moment
    const p = c.fadeMs ? Math.max(0, Math.min(1, (now - c.fadeAt) / c.fadeMs)) : 0;
    let n = 0;
    const bit = (fill, rx, ry, w, h) => {
      n++;
      if (p > 0 && hash(x + n * 13, y + n * 7) < p) return;
      ctx.fillStyle = fill;
      ctx.fillRect(rx, ry, w, h);
    };
    bit(SHADE, x - 5 * k, y + 1, 10 * k, 2);
    bit(BONE_DK, x - 4 * k, y - 1, 8 * k, 1);               // spine
    for (let i = -1; i <= 1; i++) bit(BONE, x + i * 2 * k, y - 2 + (i & 1), 1, 3);   // ribs
    bit(BONE, x + (s < 0.5 ? 4 : -6) * k, y - 2, 2, 2);   // the skull
    bit(BONE, x + (s < 0.5 ? -6 : 3) * k, y + 1, 3, 1);   // a stray long bone
  }
};
