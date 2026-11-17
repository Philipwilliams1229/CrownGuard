// ============ PIXEL RINGS FOR THE HALLS ============
// The halls' live rings and arcs (the catapult's swing smear, the Bladewheel's
// flash ring, the dock's ripples, the orb's ring, the Warden's pulse, the
// Sunforge's halo) used to stroke smooth canvas ellipses beside pixel-art
// buildings. These draw the same shapes as a stepped ring of art pixels:
// every point of the (squashed, optionally tilted) ellipse is snapped to the
// art grid (1 / PX world units) and filled as one path of unit squares, so
// the edge is hard and a ring never double-lights where its pixels overlap.
// `style` is any fillStyle (halls use rgba(...) with the fade baked in).
// `th` is the line's width in art pixels (1 = the hall's own thin line).
// Only placement is done each frame, a few dozen squares a ring, so there
// is nothing to bake; the same helper serves any hall that needs a ring.

import { PX } from "../paint.js";

// An arc of an ellipse centred (x, y), radii rx / ry, tilted by `rot`, from
// parametric angle a0 to a1 (radians, a0 < a1; a full turn by default).
export const pxArc = (ctx, x, y, rx, ry, style, o = {}) => {
  if (rx < 0.3 || ry < 0.15) return;
  const a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2, rot = o.rot || 0, th = o.th || 1;
  const sz = th / PX, cr = Math.cos(rot), sr = Math.sin(rot);
  const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const n = Math.max(8, Math.ceil(per * (a1 - a0) / (Math.PI * 2) * PX * 1.5));
  const seen = new Set();
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const px = Math.round((x + ex * cr - ey * sr) * PX - th / 2), py = Math.round((y + ex * sr + ey * cr) * PX - th / 2);
    const key = px * 100003 + py;
    if (seen.has(key)) continue;
    seen.add(key);
    ctx.rect(px / PX, py / PX, sz, sz);
  }
  ctx.fill();
};

// A circle seen straight on (the Warden's pulse sits flat, so it is round).
export const pxRing = (ctx, x, y, r, style, th = 1) => pxArc(ctx, x, y, r, r, style, { th });
