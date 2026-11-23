// The overhaul's sway (B3): lone broadleaves and willows only (never pines, never the wood). Three whole-pixel
// poses a tree: 0 (the tree as baked), 1 and 2 (its masses leaning 1 / 2 art px downwind at the crown's top; a
// willow's strands 1.5 / 3 at their tips). The concept's gust: lean = 0.5 - 0.5 cos(2 pi (t / PERIOD - x / 160)),
// a wave crossing the board left to right, each tree a beat apart; the pose is the lean rounded to thirds.
// Poses are baked lazily (BAKES_A_FRAME), the tree holds pose 0 until its pose exists. ~2 extra canvases a tree.
export const PERIOD = 5;
export const BAKES_A_FRAME = 1;
export const LEANS = { broad: [0, 1, 2], willow: [0, 1.5, 3] };
export const swayKind = (plan) => (plan.forest || plan.kind === "pine" ? null : plan.kind === "willow" ? "willow" : "broad");
export function poseAt(x, ph, time) {
  const u = time / PERIOD - x / 160 + ph;
  return Math.round((0.5 - 0.5 * Math.cos(2 * Math.PI * u)) * 2);
}
