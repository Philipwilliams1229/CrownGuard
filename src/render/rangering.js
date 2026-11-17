// ============ RANGE RINGS IN THE PIXEL STYLE ============
// A hall's reach on the board is a TRUE CIRCLE of its exact radius (the engine's
// reach: never squashed like a ground effect). Drawn as a hard art-pixel ring:
// a one-pixel line of the ring's own colour, lit on the upper left and shaded on
// the lower right (one sun), a soft edge pixel outside and a highlight inside, and
// a Bayer-dithered band fading inward from the line so the middle stays clear.
// Never anti-aliased. Bakes once per (radius in art pixels, colour, fill) and
// blits; only the marching dashes (a few dozen pixels) are placed each frame,
// which is the ring's gentle live motion. The build ghost's footprint is a
// stepped, rounded pixel plate with a tinted rim (`drawPlate`).
// Art pixel = 0.5 world unit (paint.js PX = 2).

const AP = 2;                                   // art pixels per world unit
const INK_RGB = [43, 42, 51];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

const KINDS = new Map();
const kindOf = (color) => {
  let k = KINDS.get(color);
  if (k) return k;
  const m = color.match(/[\d.]+/g).map(Number);
  const base = [m[0], m[1], m[2]];
  k = {
    base, lite: mix(base, [255, 244, 200], 0.28), dark: mix(base, INK_RGB, 0.58),
    rim: mix(base, INK_RGB, 0.85),
    liteCss: css(mix(base, [255, 250, 215], 0.45)),
  };
  KINDS.set(color, k);
  return k;
};

const CACHE = new Map();
const bake = (rp, color, fill) => {
  const key = rp + "|" + color + "|" + fill;
  let hit = CACHE.get(key);
  if (hit) return hit;
  if (CACHE.size > 60) CACHE.clear();
  const k = kindOf(color);
  const pad = 3, size = rp * 2 + pad * 2 + 1, c0 = rp + pad;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const cx = cv.getContext("2d");
  const img = cx.createImageData(size, size), d = img.data;
  const bw = Math.max(6, Math.min(22, Math.round(rp * 0.22)));
  const put = (x, y, rgb, a) => {
    const i = (y * size + x) * 4;
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a;
  };
  const line = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - c0, dy = y - c0, dist = Math.sqrt(dx * dx + dy * dy), dd = dist - rp;
    const lit = dist > 0 ? -(dx + dy) / (dist * 1.4142) : 0;     // +1 upper left
    if (Math.abs(dd) <= 0.5) {
      put(x, y, lit > 0.35 ? k.lite : lit < -0.35 ? k.dark : k.base, 255);
      line.push([x, y, Math.atan2(dy, dx), dx, dy]);
    } else if (dd > 0.5 && dd <= 1.5) {
      put(x, y, k.rim, lit < -0.2 ? 235 : 150);                    // the tinted shade line, heavier lower right
    } else if (dd < -0.5 && dd >= -1.5) {
      if (lit > 0.45) put(x, y, k.lite, 130);                     // the lit edge, upper left
      else put(x, y, k.base, 70);
    } else if (fill > 0 && dd < -1.5 && -dd <= bw) {
      const f = 1 - (-dd - 1.5) / bw;                             // 1 at the line, 0 inward
      if (f * f * 0.85 * fill > (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16) put(x, y, k.base, 150);
    }
  }
  cx.putImageData(img, 0, 0);
  line.sort((a, b) => a[2] - b[2]);
  hit = { cv, c0, line, n: line.length, rp };
  CACHE.set(key, hit);
  return hit;
};

// A ring at (cx, cy) world, radius in world units. `spin` is the old radians-style
// turning phase (positive and negative turn opposite ways); `fill` scales the
// dithered inner band (0 = none).
export const drawRangeRing = (ctx, cx, cy, radius, color, spin, fill = 1) => {
  const rp = Math.round(radius * AP);
  if (rp < 3) return;
  const b = bake(rp, color, Math.round(fill * 100) / 100);
  const ox = Math.round(cx * AP), oy = Math.round(cy * AP);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(b.cv, (ox - b.c0) / AP, (oy - b.c0) / AP, b.cv.width / AP, b.cv.height / AP);
  // marching dashes: five pixels lit of every fourteen, drifting round the line
  const period = 14, on = 5, ph = Math.floor(spin * rp * 0.15);
  const k = kindOf(color);
  ctx.fillStyle = k.liteCss;
  const u = 1 / AP;
  ctx.beginPath();
  for (let i = 0; i < b.n; i++) {
    if ((((i + ph) % period) + period) % period >= on) continue;
    const p = b.line[i];
    ctx.rect((ox + p[3]) / AP, (oy + p[4]) / AP, u, u);
    const ix = Math.round(p[3] * (rp - 1) / rp), iy = Math.round(p[4] * (rp - 1) / rp);
    ctx.rect((ox + ix) / AP, (oy + iy) / AP, u, u);
  }
  ctx.fill();
  ctx.restore();
};

// ---- the build ghost's footprint: a stepped rounded plate with a tinted rim ----
const PLATES = new Map();
const plate = (ok) => {
  let hit = PLATES.get(ok);
  if (hit) return hit;
  const color = ok ? "rgba(150,232,150,1)" : "rgba(232,120,110,1)";
  const k = kindOf(color), N = 80, cut = 5;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const cx = cv.getContext("2d");
  const img = cx.createImageData(N, N), d = img.data;
  const inside = (x, y, inset) => {
    // a rounded square, corners cut in steps
    const lo = inset, hi = N - 1 - inset;
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const ex = Math.min(x - lo, hi - x), ey = Math.min(y - lo, hi - y);
    return ex + ey >= cut - inset * 0 && (ex >= cut || ey >= cut || ex + ey >= cut);
  };
  const put = (i, rgb, a) => { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a; };
  const stud = (x, y) => { const m = (v) => Math.min(v, N - 1 - v); return m(x) >= 6 && m(x) <= 7 && m(y) >= 6 && m(y) <= 7; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    if (!inside(x, y, 0)) continue;
    const litSide = x + y < N - 1;
    if (!inside(x, y, 1)) put(i, k.rim, 245);                          // the tinted outline
    else if (!inside(x, y, 3)) put(i, litSide ? k.lite : k.dark, 245); // a two-pixel bevel: lit top / left, shaded bottom / right
    else if (!inside(x, y, 4)) put(i, k.rim, 170);                     // the groove under the bevel
    else if (stud(x, y)) put(i, k.lite, 235);                          // corner studs
    else put(i, k.base, (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16 < 0.5 ? 120 : 70);
  }
  cx.putImageData(img, 0, 0);
  hit = cv;
  PLATES.set(ok, hit);
  return hit;
};

// the plate under the ghost: 40 world units square, centred on (cx, cy)
export const drawPlate = (ctx, cx, cy, ok) => {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(plate(ok), cx - 20, cy - 20, 40, 40);
  ctx.restore();
};
