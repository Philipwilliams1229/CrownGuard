// ============ A HALL'S FOOTING ============
// Where a hall may stand follows the SHAPE of its base (owner, 2026-11-18: "smaller
// bases can be built in smaller places, bigger bases take up more space"). Before,
// every hall kept the same 15-unit circle (30 between any two) and the same 48 from
// the road's centre, so two halls one above the other stood far apart while two big
// ones side by side overlapped.
//
// A footing is an ellipse on the ground: as wide as the hall's widest form at ground
// level, reaching `down` in front of its anchor and `up` behind it (data/hallfoot.js,
// measured from the art by scripts/hall-footprints.mjs). The WIDEST form, so an
// upgrade never grows into a neighbour. Rules (buildableAt, engine/actions.js):
//   - two halls' footings keep HALL_GAP apart (an ellipse each, the sum of the axes);
//   - every point of the footing stays off the road (PATH_HALF from its centre line),
//     out of rivers and the sea; a pond is an ellipse grown by the footing;
//   - a scenery piece is a circle of half its footprint (data/terrain.js FOOTPRINT)
//     that the footing, grown by HALL_GAP, may not touch.
import { HALL_FOOT } from "../data/hallfoot.js";

export const HALL_GAP = 2;
const DEFAULT = HALL_FOOT.archer;
const CACHE = new Map();
// { rx, ry, cy }: the ellipse's half-axes and its centre's drop below the anchor
export const footOf = (kind) => {
  let f = CACHE.get(kind);
  if (!f) {
    const m = HALL_FOOT[kind] || DEFAULT;
    CACHE.set(kind, (f = { rx: m.rx, ry: (m.up + m.down) / 2, cy: (m.down - m.up) / 2, up: m.up, down: m.down }));
  }
  return f;
};

// Do two halls' footings (with the gap between them) overlap?
export const footsClash = (ka, xa, ya, kb, xb, yb, gap = HALL_GAP) => {
  const a = footOf(ka), b = footOf(kb);
  const dx = (xa - xb) / (a.rx + b.rx + gap), dy = (ya + a.cy - yb - b.cy) / (a.ry + b.ry + gap);
  return dx * dx + dy * dy < 1;
};

// Is the point (px, py) within the footing (grown by m)?
export const inFoot = (kind, x, y, px, py, m = 0) => {
  const f = footOf(kind);
  const dx = (px - x) / (f.rx + m), dy = (py - y - f.cy) / (f.ry + m);
  return dx * dx + dy * dy < 1;
};

// The footing's rim (16 points) and its middle, for the road and water tests
const RIM = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)]);
export const footPoints = (kind, x, y) => {
  const f = footOf(kind), pts = [[x, y + f.cy]];
  for (const [c, s] of RIM) pts.push([x + c * f.rx, y + f.cy + s * f.ry]);
  return pts;
};
