// Effects concepts, Round 21 (2026-11-27): the PLAIN slow (traps, caltrops, Hamstringer, Earthshaker, Harpooners,
// the War Horn, logs...) gets its own look, apart from the frost slow (today's cold mist, which the owner keeps).
// Shared cell kit: helpers copied from concept/fx-r6-slow.js (pure canvas, no game imports). See art/briefs/fx-round21.md.
export const NW = { cw: 80, ch: 78, ax: 40, ay: 58, N: 12 };
export const TAU = Math.PI * 2;
export const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
export const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const fifth = (a) => Math.ceil(cl(a) * 5 - 1e-6) / 5;
export const fr = (v) => v - Math.floor(v);
export const P = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
// the slow's three strengths in the game: under 30%, 30-60% (paint this one), over 60%
export const LV = 1;
// the figure's silhouette, read from the frame drawn: has(x,y), list, edge, top T, xl/xr, cx (in art px from the feet)
const MASKS = new WeakMap();
export const maskOf = (s) => {
  let m = MASKS.get(s.cv); if (m) return m;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d").getImageData(0, 0, w, h).data, set = new Set();
  let top = 1e9, xl = 1e9, xr = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { const X = x - Math.round(s.ax), Y = y - Math.round(s.ay); set.add(X + "," + Y); top = Math.min(top, Y); xl = Math.min(xl, X); xr = Math.max(xr, X); }
  m = { has: (x, y) => set.has(x + "," + y), set, top, xl, xr, cx: Math.round((xl + xr) / 2), T: -top, list: [...set].map((k) => k.split(",").map(Number)) };
  m.edge = m.list.filter(([x, y]) => !m.has(x - 1, y) || !m.has(x + 1, y) || !m.has(x, y - 1) || !m.has(x, y + 1));
  MASKS.set(s.cv, m); return m;
};
// the goblin's walk frame for this cell (8 walk frames over the loop's N cells)
export const frameOf = (e) => Math.floor(e.i * 8 / e.N);
// draw the goblin at the feet (optionally at an offset) and return its mask
export const body = (c, e, v = "", f = frameOf(e), dx = 0, dy = 0) => { const s = e.foe(f, v); c.drawImage(s.cv, Math.round(-s.ax + dx), Math.round(-s.ay + dy)); return maskOf(s); };
export const sprite = (e, f = frameOf(e), v = "") => e.foe(f, v);
// the goblin faces RIGHT; its face is the upper right of the silhouette
export const isFace = (m, x, y) => x > m.cx + 1 && y < -m.T * 0.55;
export const sunEdge = (m, x, y) => (!m.has(x - 1, y) || !m.has(x, y - 1)) ? 1 : 0.45;    // one sun, top-left
