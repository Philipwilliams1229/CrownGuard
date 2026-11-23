// The overhaul's wood edge (B3): today's FOREST trees (DECOR pieces with `forest`, on Millrace the wood down the
// left edge) drawn in treatment 4, the concept's layered wood: a dark cool roof deep in, a mid row, a bright front
// row. Every tree keeps its own position (its trunk = today's, so footprints and the y-sort are unchanged); its look
// is dealt from a small shared set so the whole wood is at most WOOD_MAX distinct bakes:
//   kind   "tree" -> round oak (half), spreading oak, beech; "pine" -> pine
//   depth  forestDepthAt: 0 front (<= 16 in), 1 mid (<= 46), 2 roof; deeper = smaller, cooler, darker leaves
//   slot   two seeds per kind and depth (two fills / layer orders / flares)
// A crown that would reach over the road's lanes is shrunk (0.85, then 0.72) and that is one more look.
import { forestDepthAt } from "../../data/terrain.js";
import { h2 } from "./treeart.js";

const SPI = { roundoak: 0, oak: 1, beech: 2, pine: 3 };
const KD = [1.08, 0.85, 0.72];   // the front row a step up (lead, 2026-11-22), the mid row and roof as the concept
export const WOOD_MAX = 24;
export function woodPlan(d) {
  const dep = forestDepthAt(d.x, d.y), dk = dep > 46 ? 2 : dep > 16 ? 1 : 0;
  const hv = h2(Math.round(d.x), Math.round(d.y), 9);
  const kind = d.t === "pine" ? "pine" : hv < 0.5 ? "roundoak" : hv < 0.75 ? "oak" : "beech";
  const slot = h2(Math.round(d.x), Math.round(d.y), 13) < 0.5 ? 0 : 1;
  const k = KD[dk] * (kind === "oak" ? 0.8 : 1);
  return { kind, dk, k, seed: 100 + SPI[kind] * 17 + dk * 5 + slot, o: {}, forest: true };
}
