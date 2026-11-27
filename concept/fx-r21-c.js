// Round 21 option C (the plain slow): BOUND IN IRON. See art/briefs/fx-round21.md. Owned by its artist alone.
// A chain of big links is wound diagonally round both shins (the legs keep their own colours, only a light shade
// under the chain), and its loose end trails on the road behind the heel to a small iron weight, dragged along in
// jerks as each step lands. Read from the frame's own silhouette (a per-frame bake, no state between frames).
import { sprite, maskOf, bay, P, LV } from "./fx-r21-kit.js";
export const note = "Bound in iron: a chain of big links wound round the shins, its loose end trailing on the road behind the heel to a small iron weight that is dragged along in jerks. A light slow is one turn of chain and a bare trailing end; a heavy one is three turns and a bigger weight. The frost's mist is pale and drifts round the whole body; this is dark iron on the legs and the road behind, so a foe wearing both shows both.";

// pewter iron, a touch violet in the shade so it is neither the frost's blue nor B's warm grey
const IRON = ["#ece8ee", "#b8b2c0", "#847e92", "#565068", "#343046", "#1e1c2c"];
const grow = (lv) => ({ coils: [1, 2, 3][lv], ball: [0, 1, 2][lv], shade: [0.25, 0.4, 0.5][lv] });
// the silhouette's span on one row (legs and all)
const span = (m, y) => { let a = null, b = null; for (let x = m.xl; x <= m.xr; x++) if (m.has(x, y)) { if (a === null) a = x; b = x; } return a === null ? null : [a, b]; };

// one turn of chain across the legs: links 2 px square, lit and dark by turns so each one reads, slanting down
// toward the front, a pixel proud of each side, the tinted dark line under it
const coil = (c, m, yb, slope, ph) => {
  const sp = span(m, yb); if (!sp) return null; const [a, b] = sp, mid = (a + b) / 2;
  for (let x = a - 1; x <= b + 1; x++) {
    const y = yb + Math.round((x - mid) * slope), lit = (((x - a + 1 + ph) >> 1) & 1) === 0, first = ((x - a + 1 + ph) & 1) === 0;
    P(c, x, y - 1, lit ? (first ? IRON[0] : IRON[1]) : IRON[3]);
    P(c, x, y, lit ? IRON[2] : IRON[4]);
    P(c, x, y + 1, IRON[5], 0.9);
  }
  return [a, b, mid];
};
// the dragged weight: a stepped iron block, lit top-left, its ring at the top right where the chain joins
const WEIGHT = [[" 01 ", "0123", "1234", " 34 "], [" 001 ", "01123", "11234", "12344", " 344 "]];
const weight = (c, x, y, k) => { const g = WEIGHT[k - 1], h = g.length;
  for (let j = 0; j < h; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] !== " ") P(c, x + i, y - h + 1 + j, IRON[+g[j][i]]);
  for (let i = 1; i < g[0].length; i++) P(c, x + i, y + 1, IRON[5], 0.7);
  return g[0].length; };

const mk = (lv) => (c, e) => {
  const g = grow(lv), s = sprite(e), m = maskOf(s);
  c.drawImage(s.cv, Math.round(-s.ax), Math.round(-s.ay));
  const y0 = -3, top = y0 - (g.coils - 1) * 4 - 2;
  // a light shade on the legs under the chain: their own colours stay
  for (const [x, y] of m.list) if (y >= top && bay(x, y) < g.shade) P(c, x, y, IRON[5], 0.45);
  let low = null;
  for (let k = 0; k < g.coils; k++) { const r = coil(c, m, y0 - k * 4, 0.28, k * 2); if (k === 0) low = r; }
  if (!low) return;
  // the loose end: down off the lowest turn behind the heel, then along the road; it goes slack and snaps taut
  const a = low[0], drag = [0, 0, 1, 2, 2, 1][e.i % 6], len = 6 + drag, hx = a - 2;
  let yy = y0 - 1; const pts = [];
  for (let j = 0; j <= len; j++) { const x = hx - j; yy = Math.min(0, yy + (j < 3 ? 1 : 0) + (j >= 3 && drag < 2 && j === 4 ? -0 : 0)); pts.push([x, yy]); }
  pts.forEach(([x, y], j) => { P(c, x, y + 1, IRON[5], 0.8); P(c, x, y, ((j >> 1) & 1) ? IRON[3] : (j & 1 ? IRON[1] : IRON[0])); if (y < 0 || ((j >> 1) & 1) === 0) P(c, x, y - 1, ((j >> 1) & 1) ? IRON[4] : IRON[2], y < 0 ? 0 : 1); });
  if (g.ball) { const w = g.ball + 3; weight(c, hx - len - w, 0, g.ball); }
};
export const paint = mk(LV);
