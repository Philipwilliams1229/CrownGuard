// Round 21 option C (the plain slow): BOUND IN IRON. See art/briefs/fx-round21.md. Owned by its artist alone.
// A chain is coiled round the legs (two slanted bands of links across the legs, a loose end
// swinging behind the heel), the legs under it have gone leaden (the figure's own shading turned to pewter, fading
// out in fifths at the hip), and small dark weight marks sink down the back. Everything is read from the frame's
// own silhouette and pixels (a per-frame bake, no state between frames).
import { sprite, frameOf, maskOf, bay, fifth, cl, fr, P, LV, isFace } from "./fx-r21-kit.js";
export const note = "Bound in iron: a chain coiled round the shins with a loose end swinging behind the heel, the legs turned leaden grey, and dark weight marks sinking down the back. A light slow is one coil and grey shins; a heavy one is three coils with lead up to the belt and more marks. The frost's mist is pale and drifts outside the body; this is dark, solid and on the legs, so a foe wearing both shows both.";

// pewter iron, a touch violet in the shade so it is neither the frost's blue nor B's warm grey
const IRON = ["#ece8ee", "#b8b2c0", "#847e92", "#565068", "#343046", "#1e1c2c"];
const grow = (lv) => ({ up: [0.2, 0.34, 0.5][lv], coils: [1, 2, 3][lv], n: [1, 2, 3][lv], big: lv === 2, amp: [0.75, 1, 1.15][lv] });

// the frame's own pixels (for the lead's shading), cached per frame canvas
const PIX = new WeakMap();
const lumOf = (s) => { let f = PIX.get(s.cv); if (f) return f; const w = s.cv.width, d = s.cv.getContext("2d").getImageData(0, 0, w, s.cv.height).data, ax = Math.round(s.ax), ay = Math.round(s.ay);
  f = (x, y) => { const i = ((y + ay) * w + x + ax) * 4; return (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255; }; PIX.set(s.cv, f); return f; };
// the silhouette's span on one row (legs and all)
const span = (m, y) => { let a = null, b = null; for (let x = m.xl; x <= m.xr; x++) if (m.has(x, y)) { if (a === null) a = x; b = x; } return a === null ? null : [a, b]; };

// one coil of chain across the legs: a row of links (two pale, one dark) slanting down toward the front, a pixel
// proud of each side, the tinted dark line under it
const coil = (c, m, yb, slope, ph) => {
  const sp = span(m, yb); if (!sp) return null; const [a, b] = sp, mid = (a + b) / 2;
  for (let x = a - 1; x <= b + 1; x++) {
    const y = yb + Math.round((x - mid) * slope), on = (((x + ph) % 3) + 3) % 3;
    P(c, x, y, on === 2 ? IRON[4] : x < mid ? IRON[0] : IRON[1]);
    P(c, x, y + 1, IRON[5], 0.85);
  }
  return [a, b, mid];
};
// a weight mark: a down-pointing chevron two pixels thick, a pale lit left arm (the sun) and an inked right
const chevron = (c, x, y, a, w) => {
  for (let j = 0; j <= w; j++) {
    P(c, x - w + j, y + j - 1, IRON[1], a); P(c, x - w + j, y + j, IRON[3], a); P(c, x - w + j, y + j + 1, IRON[5], a);
    P(c, x + w - j, y + j - 1, IRON[2], a); P(c, x + w - j, y + j, IRON[4], a); P(c, x + w - j, y + j + 1, IRON[5], a);
  }
};

const mk = (lv) => (c, e) => {
  const g = grow(lv), s = sprite(e), m = maskOf(s), lum = lumOf(s), T = m.T, top = Math.round(-T * g.up);
  // weight marks sinking down the back (the left: the goblin faces right), drawn first so the body stays in front
  const y0 = -T * 0.66, y1 = -5, w = g.big ? 3 : 2;
  for (let k = 0; k < g.n; k++) {
    const q = fr(e.i / e.N + k / g.n), yy = Math.round(y0 + (y1 - y0) * q * q);
    const sp = span(m, yy) || [m.xl, m.xr];
    chevron(c, Math.min(sp[0], m.cx - 5) - w - 2 - (k % 2) * 2, yy, q < 0.1 || q > 0.85 ? 0.55 : 1, w);
  }
  c.drawImage(s.cv, Math.round(-s.ax), Math.round(-s.ay));
  // leaden legs: the figure's own light and shade re-toned in pewter, solid at the shins, dithered out in fifths
  for (const [x, y] of m.list) {
    if (y < top || isFace(m, x, y)) continue;
    const k = fifth(cl((y - top + 1) / (T * g.up * 0.45)) * g.amp);
    if (k < 1 && bay(x, y) >= k) continue;
    const l = lum(x, y); P(c, x, y, l > 0.56 ? IRON[2] : l > 0.3 ? IRON[3] : IRON[4]);
  }
  // their outline: a pale line on the sunny edges, the tinted dark line on the shaded ones
  for (const [x, y] of m.edge) { if (y < top + 2) continue; P(c, x, y, (!m.has(x - 1, y) || !m.has(x, y - 1)) ? IRON[2] : IRON[5]); }
  // the chain: coils up the legs, the lowest first, a clear band of the leaden leg between them
  let low = null;
  for (let k = 0; k < g.coils; k++) { const r = coil(c, m, -4 - k * 4, 0.2, k); if (k === 0) low = r; }
  if (low) {
    // the loose end hangs behind the heel: four links, the last two swinging back as each step lands
    const a = low[0], sw = Math.round(Math.sin(e.i / e.N * Math.PI * 4) * 1.2);
    for (let j = 0; j <= 3; j++) { const x = a - 2 - (j > 1 ? Math.max(0, sw) : 0) - (j > 2 ? sw : 0), y = Math.min(0, -4 + j); P(c, x + 1, y, IRON[5], 0.8); P(c, x, y + 1, IRON[5], 0.8); P(c, x, y, j === 2 ? IRON[2] : IRON[0]); }
  }
};
export const paint = mk(LV);
