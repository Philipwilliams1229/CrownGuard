// ============ THE STAR ============
// The campaign's gold star, sculpted at any size (owner's pick, 2026-11-26: "B1 fuller" from the star
// concepts): a rounded dome lit from the upper left like the rest of the game, a cream shine on the
// crown of the dome, a one-pixel tinted outline. An unearned star is the same star SUNK into slate
// (its light turned round, so it reads as an empty socket). Pure: `starPixels(n, lit)` returns
// { w, h, px } (rows of colours or null), cached per size; the HUD's StarIcon (hud/icons.jsx) draws it
// as an SVG grid, the campaign map's marker stars (mapArt.js) as a canvas.

const GOLD = ["#4a2c10", "#6e4a18", "#93681f", "#b8902e", "#d8b34a", "#f0d27a", "#fff3d2"]; // dark .. shine
const GOLD_INK = "#3a200c";
const SLATE = ["#1f1924", "#2a2230", "#342a3a", "#3e3346", "#4a3e52", "#5a4d60", "#6a5c70"];
const SLATE_INK = "#17111a";

// the game's sun: upper left, and toward the viewer
const LIGHT = (() => { const v = [-0.55, -0.75, 0.9]; const m = Math.hypot(...v); return v.map((x) => x / m); })();

function starPoly(cx, cy, R, r) {
  const v = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    v.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return v;
}
function inPoly(x, y, v) {
  let c = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i], [xj, yj] = v[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(x, y, v) {
  let d = 1e9;
  for (let i = 0; i < v.length; i++) {
    const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

const CACHE = new Map();
// n: the star's width in art pixels (odd reads best); the grid is n + 2 square with its outline
export function starPixels(n, lit = true) {
  const key = `${n}|${lit ? 1 : 0}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const ramp = lit ? GOLD : SLATE, ink = lit ? GOLD_INK : SLATE_INK;
  const W = n + 2, H = n + 2;
  const cx = 1 + n / 2, cy = 1 + n / 2 + n * 0.06;
  const R = n / 2 + 0.35, r = R * 0.52;
  const v = starPoly(cx, cy, R, r);
  const SS = 4;
  const face = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let k = 0;
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) if (inPoly(x + (i + 0.5) / SS, y + (j + 0.5) / SS, v)) k++;
    face[y][x] = k / (SS * SS) >= 0.5;
  }
  // the dome: height rises from the edge and rounds over the middle
  const height = (xx, yy) => {
    const e = edgeDist(xx, yy, v) * (inPoly(xx, yy, v) ? 1 : -1);
    const t = Math.max(0, Math.min(1, e / (r * 1.05)));
    return (1 - (1 - t) * (1 - t)) * r * 1.15;
  };
  const px = Array.from({ length: H }, () => Array(W).fill(null));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!face[y][x]) continue;
    const X = x + 0.5, Y = y + 0.5, dd = 0.6;
    const gx = (height(X + dd, Y) - height(X - dd, Y)) / (2 * dd), gy = (height(X, Y + dd) - height(X, Y - dd)) / (2 * dd);
    let nx = -gx, ny = -gy, nz = 1;
    const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    if (!lit) { nx = -nx; ny = -ny; }   // sunk: the socket's walls catch the light from the other side
    let s = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    s += Math.max(0, s - 0.7) * 2.2;     // the shine on the crown of the dome
    if (edgeDist(X, Y, v) < 0.9) s -= 0.15;
    const f = Math.max(0, Math.min(1, (s + 0.15) / 1.1)) * 3.4 + 1.6;
    let t = Math.min(5, Math.floor(f) + (f - Math.floor(f) > 0.5 ? 1 : 0));
    if (lit && s > 1.02) t = 6;
    px[y][x] = ramp[t];
  }
  // a cream catch-light on the lit side
  if (lit) {
    const gx = Math.round(cx - n * 0.16), gy = Math.round(cy - n * 0.12);
    const g = n >= 15 ? [[0, 0], [1, 0], [0, 1]] : [[0, 0]];
    for (const [a, b] of g) if (face[gy + b]?.[gx + a]) px[gy + b][gx + a] = ramp[6];
  }
  // the one-pixel tinted outline
  const out = px.map((row) => row.slice());
  const solid = (x, y) => !!face[y]?.[x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out[y][x] = ink;
  }
  const res = { w: W, h: H, px: out };
  CACHE.set(key, res);
  return res;
}

// the art size for a star drawn `size` CSS px across: one art pixel a CSS pixel on small icons, two on
// the victory card's big ones (so they stay as chunky as the rest of the game's pixels)
export const starArtSize = (size) => {
  const n = size >= 28 ? Math.round(size / 2) : Math.max(9, Math.round(size));
  return n % 2 ? n : n + 1;
};
