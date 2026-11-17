// ============ MARCH: which way a walker is heading, and how he turns (2026-11-17, owner) ============
// Two things the board reads to make a march look right, kept by the DRAWING (the
// engine is untouched; the fields start with _ and nothing else reads them):
//
// vertOf(o)   how much of a walker's heading runs up (-1) or down (+1) the screen,
//             eased over the last ~6 px of ground so a corner of the road blends
//             from the side walk into the foreshortened one (pix/march.js,
//             pixrigs.js vertSheet) instead of snapping.
//
// turnOf(o, face, tms)   the SQUEEZE TURN: when a figure's facing flips, its picture
//             narrows to a sliver, mirrors while thin, and widens the other way over
//             TURN_MS, instead of mirroring in one frame. Provisional (owner: "we may
//             end up reverting the squeeze"): SQUEEZE = false puts back the plain flip.
//             drawTurned(ctx, x, feet, sx, fn) draws fn squeezed about the feet.
export const SQUEEZE = true;
export const TURN_MS = 200, SLIVER = 0.3;

export const vertOf = (o) => {
  if (o._mx === undefined) { o._mx = o.x; o._my = o.y; o._mv = 0; return 0; }
  const dx = o.x - o._mx, dy = o.y - o._my, d = Math.hypot(dx, dy);
  if (d > 24) { o._mx = o.x; o._my = o.y; return o._mv; }          // a jump (rising, a throw): no heading in it
  if (d > 0.6) { o._mv += (dy / d - o._mv) * Math.min(1, d / 6); o._mx = o.x; o._my = o.y; }
  return o._mv;
};

export const turnOf = (o, face, tms) => {
  face = face < 0 ? -1 : 1;
  if (!SQUEEZE) return { face, sx: 1 };
  if (o._tw === undefined) { o._tw = face; return { face, sx: 1 }; }
  if (face !== o._tw) { o._tf = o._tw; o._tw = face; o._ta = tms; }
  const u = o._ta === undefined ? 1 : (tms - o._ta) / TURN_MS;
  if (u >= 1 || u < 0) return { face, sx: 1 };
  return { face: u < 0.5 ? o._tf : face, sx: Math.max(SLIVER, Math.abs(Math.cos(Math.PI * u))) };
};

export const drawTurned = (ctx, x, feet, sx, fn) => {
  if (sx >= 1) { fn(); return; }
  ctx.save(); ctx.translate(x, feet); ctx.scale(sx, 1); ctx.translate(-x, -feet);
  fn();
  ctx.restore();
};
