// ============ PIX: the pixel sculptor (concept, November 2026) ============
// A sprite is SCULPTED pixel by pixel instead of drawn as vector shapes and
// hardened: every part writes material, depth and a surface normal into small
// buffers, and one resolve pass turns them into pixel art the way a pixel
// artist would shade it:
//   - each material owns a five-tone ramp, hue-shifted (shadows lean plum,
//     lights lean warm cream), so no tone is a plain darker copy of another
//   - light comes from the upper left; a sprite that will be mirrored is baked
//     with the light flipped, so the sun stays put whichever way a figure faces
//   - parts in front drop a one- or two-pixel shadow on what lies behind
//   - a ONE-pixel outline, inked in the local material's own dark (lighter on
//     the sunward side), instead of a uniform two-pixel ring
//   - a second light (a spell, a torch) can be laid over any frame from the
//     stored normals: the rim of every part facing it takes its colour
// Coordinates are art pixels from the sprite's anchor (the feet), y down.
// No dependencies: the lab page and the published concept sheet share it.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- colour: OKLab ramps -------------------------------------------------------
export const hex2rgb = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const l2s = (c) => { c = clamp(c, 0, 1); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const rgb2lab = ([r, g, b]) => {
  r = s2l(r); g = s2l(g); b = s2l(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const lab2rgb = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [l2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), l2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), l2s(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
};
const PLUM = [Math.cos(5.35), Math.sin(5.35)], WARM = [Math.cos(1.4), Math.sin(1.4)];
export const INK = hex2rgb("#241a26");
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);

// five fill tones (0 deep shadow .. 2 the colour itself .. 4 highlight) and two line tones
export const ramp = (base, o = {}) => {
  const k = o.contrast ?? 1, [L, a, b] = rgb2lab(hex2rgb(base));
  const mk = (dL, cs, sh, dir) => lab2rgb([clamp(L + dL, 0.1, 0.985), a * cs + dir[0] * sh, b * cs + dir[1] * sh]);
  const c = [mk(-0.235 * k, 0.92, 0.05, PLUM), mk(-0.115 * k, 1.04, 0.028, PLUM), mk(0, 1, 0, PLUM), mk(0.085 * k, 0.96, 0.022, WARM), mk(0.17 * k, 0.72, 0.04, WARM)];
  const dark = lab2rgb([clamp(L * 0.5 - 0.02, 0.17, 0.4), a * 0.75 + PLUM[0] * 0.03, b * 0.75 + PLUM[1] * 0.03]);
  const lit = lab2rgb([clamp(L * 0.62, 0.22, 0.5), a * 0.85 + PLUM[0] * 0.025, b * 0.85 + PLUM[1] * 0.025]);
  return { c, line: mix3(dark, INK, 0.45), lineLit: mix3(lit, INK, 0.25) };
};

export const MATS = [];
const KEYS = new Map();
// a shaded material (memoised, so figures may ask for it on every frame)
export const mat = (base, o = {}) => {
  const key = base + JSON.stringify(o);
  if (KEYS.has(key)) return KEYS.get(key);
  MATS.push({ ...ramp(base, o), emis: !!o.emis, base });
  KEYS.set(key, MATS.length - 1);
  return MATS.length - 1;
};
// a flat colour that takes no light (eyes, glows); emis: it also gives light (never rim-lit, soft line)
export const flat = (base, o = {}) => {
  const key = "flat" + base + JSON.stringify(o);
  if (KEYS.has(key)) return KEYS.get(key);
  const c = hex2rgb(base), r = ramp(base);
  MATS.push({ c: [c, c, c, c, c], line: o.line ? hex2rgb(o.line) : r.line, lineLit: o.line ? hex2rgb(o.line) : r.lineLit, flat: true, emis: !!o.emis, base });
  KEYS.set(key, MATS.length - 1);
  return MATS.length - 1;
};

// ---- the buffers ---------------------------------------------------------------
const F_EDGE = 1, F_NOLINE = 2;
const TH = [0.06, 0.5, 0.86];          // light value -> tones 1 | 2 | 3 | 4

export class Pix {
  constructor(w, h, ox, oy) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    const n = w * h;
    this.m = new Int16Array(n).fill(-1);
    this.z = new Float32Array(n).fill(-1e9);
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n);
    this.bias = new Float32Array(n); this.vb = new Float32Array(n);
    this.fix = new Int8Array(n).fill(-1);
    this.pid = new Int16Array(n); this.cast = new Uint8Array(n); this.flag = new Uint8Array(n);
    this.floor = new Uint8Array(n);
    this._pid = 0;
  }
  // start a new part: shapes of one part never shadow or line each other
  part() { this._pid++; return this; }
  _put(i, j, m, z, nx, ny, nz, o) {
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return;
    const k = j * this.w + i;
    if (z < this.z[k]) return;
    this.m[k] = m; this.z[k] = z; this.nx[k] = nx; this.ny[k] = ny; this.nz[k] = nz;
    this.bias[k] = o.bias || 0; this.vb[k] = o.vb || 0; this.fix[k] = o.fix ?? -1;
    this.pid[k] = this._pid; this.cast[k] = o.cast ?? 1;
    this.floor[k] = o.floor || 0;      // the darkest tone shadows may push this pixel to (dark cloth: floor 1, or a shadow reads as a hole)
    this.flag[k] = (o.edge ? F_EDGE : 0) | (o.noLine ? F_NOLINE : 0);
  }
  // a limb: a capsule from a (radius ra) to b (radius rb), round in section
  capsule(ax, ay, ra, bx, by, rb, m, z, o = {}) {
    const R = Math.max(ra, rb) + 1, x0 = Math.floor(Math.min(ax, bx) - R + this.ox), x1 = Math.ceil(Math.max(ax, bx) + R + this.ox);
    const y0 = Math.floor(Math.min(ay, by) - R + this.oy), y1 = Math.ceil(Math.max(ay, by) + R + this.oy);
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-6, rnd = o.round ?? 1;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const px = i + 0.5 - this.ox, py = j + 0.5 - this.oy;
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
      const cx = ax + dx * t, cy = ay + dy * t, r = ra + (rb - ra) * t;
      const vx = px - cx, vy = py - cy, d = Math.hypot(vx, vy);
      if (d > r) continue;
      const nx = (vx / r) * rnd, ny = (vy / r) * rnd;
      this._put(i, j, m, z, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), o);
    }
    return this;
  }
  // a ball or an egg (o.rot turns it)
  ellipse(cx, cy, rx, ry, m, z, o = {}) {
    const R = Math.max(rx, ry) + 1, cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0), rnd = o.round ?? 1;
    for (let j = Math.floor(cy - R + this.oy); j <= Math.ceil(cy + R + this.oy); j++) for (let i = Math.floor(cx - R + this.ox); i <= Math.ceil(cx + R + this.ox); i++) {
      const px = i + 0.5 - this.ox - cx, py = j + 0.5 - this.oy - cy;
      const u = (px * cs + py * sn) / rx, v = (-px * sn + py * cs) / ry;
      if (u * u + v * v > 1) continue;
      const nx = (u * cs - v * sn) * rnd, ny = (u * sn + v * cs) * rnd;
      this._put(i, j, m, z, nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), o);
    }
    return this;
  }
  // a polygon. o.round: bulge it like a cylinder across each row (0..1);
  // o.n: one flat normal for the whole face; o.ny: a tilt up (-) or down (+)
  poly(pts, m, z, o = {}) {
    let y0 = 1e9, y1 = -1e9;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const rnd = o.round ?? 0, n = o.n, tilt = o.ny ?? 0;
    for (let j = Math.floor(y0 + this.oy); j <= Math.ceil(y1 + this.oy); j++) {
      const py = j + 0.5 - this.oy, xs = [];
      for (let a = 0; a < pts.length; a++) {
        const p = pts[a], q = pts[(a + 1) % pts.length];
        if ((p[1] <= py && q[1] > py) || (q[1] <= py && p[1] > py)) xs.push(p[0] + ((py - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      const lo = xs[0], hi = xs[xs.length - 1], mid = (lo + hi) / 2, half = Math.max(0.5, (hi - lo) / 2);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        for (let i = Math.ceil(xs[s] - 0.5 + this.ox); i <= Math.floor(xs[s + 1] - 0.5 + this.ox); i++) {
          const px = i + 0.5 - this.ox;
          let nx, ny, nz;
          if (n) [nx, ny, nz] = n;
          else { nx = clamp(((px - mid) / half) * rnd, -0.98, 0.98); ny = tilt; nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)); }
          this._put(i, j, m, z, nx, ny, nz, o);
        }
      }
    }
    return this;
  }
  rect(x, y, w, h, m, z, o = {}) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, z, o); }
  // a one-pixel line (bowstrings, blade edges, trim); o.n as for poly
  line(ax, ay, bx, by, m, z, o = {}) {
    let i0 = Math.floor(ax + this.ox), j0 = Math.floor(ay + this.oy);
    const i1 = Math.floor(bx + this.ox), j1 = Math.floor(by + this.oy);
    const dx = Math.abs(i1 - i0), dy = -Math.abs(j1 - j0), sx = i0 < i1 ? 1 : -1, sy = j0 < j1 ? 1 : -1;
    let err = dx + dy;
    const [nx, ny, nz] = o.n || [0, 0, 1];
    for (;;) {
      this._put(i0, j0, m, z, nx, ny, nz, o);
      if (i0 === i1 && j0 === j1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; i0 += sx; }
      if (e2 <= dx) { err += dx; j0 += sy; }
    }
    return this;
  }
  dot(x, y, m, z, o = {}) { const [nx, ny, nz] = o.n || [0, 0, 1]; this._put(Math.floor(x + this.ox), Math.floor(y + this.oy), m, z, nx, ny, nz, o); return this; }
  // push the tone of what is already there (folds, seams, wear): d in tone steps
  tone(x, y, d, pid = 0) {
    const i = Math.floor(x + this.ox), j = Math.floor(y + this.oy);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return this;
    const k = j * this.w + i;
    if (this.m[k] >= 0 && (!pid || this.pid[k] === pid)) this.bias[k] += d;
    return this;
  }
  toneLine(ax, ay, bx, by, d, pid = 0) {
    const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    let li = null, lj = null;
    for (let s = 0; s <= n; s++) {
      const x = ax + ((bx - ax) * s) / (n || 1), y = ay + ((by - ay) * s) / (n || 1);
      const i = Math.floor(x + this.ox), j = Math.floor(y + this.oy);
      if (i === li && j === lj) continue;
      li = i; lj = j; this.tone(x, y, d, pid);
    }
    return this;
  }
  // A hand-pixelled piece (a head, an emblem): rows of characters, each
  // looked up in `legend` -> { m, bias?, fix?, vb? }. The piece is lit as a
  // ball about its middle (o.ball: [cx, cy, rx, ry] in grid cells) unless a
  // cell is fixed. (x, y) is where grid cell (o.ax, o.ay) lands; whole pixels.
  stamp(rows, x, y, legend, z, o = {}) {
    const gx = Math.round(x) - (o.ax || 0), gy = Math.round(y) - (o.ay || 0);
    const [bx, by, brx, bry] = o.ball || [rows[0].length / 2, rows.length / 2, rows[0].length / 2, rows.length / 2];
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === "." || ch === " ") continue;
      const e = legend[ch];
      if (!e) continue;
      let nx = clamp((c + 0.5 - bx) / brx, -0.95, 0.95), ny = clamp((r + 0.5 - by) / bry, -0.95, 0.95);
      const l = Math.hypot(nx, ny); if (l > 0.95) { nx *= 0.95 / l; ny *= 0.95 / l; }
      this._put(gx + c + Math.floor(this.ox), gy + r + Math.floor(this.oy), e.m, z + (e.dz || 0), nx, ny, Math.sqrt(1 - nx * nx - ny * ny), { ...o, ...e });
    }
    return this;
  }

  // ---- resolve: buffers -> pixels ------------------------------------------------
  // o.flip   light from the upper RIGHT (bake this for a sprite drawn mirrored)
  // o.line   "tint" (1px, local dark, lighter sunward) | "ink" (1px ink) | "ink2" (the old 2px ring) | "none"
  // o.lights [{ x, y, r, col: "#hex", k }] extra lights laid over the frame
  resolve(o = {}) {
    const { w, h } = this, n = w * h, f = o.flip ? -1 : 1, mode = o.line || "tint";
    const L = [-0.6 * f, -0.62, 0.5], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    const out = new Uint8ClampedArray(n * 4), lv = new Int8Array(n);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, m = this.m[k];
      if (m < 0) continue;
      let t;
      if (this.fix[k] >= 0) t = this.fix[k];
      else {
        const v = this.nx[k] * L[0] + this.ny[k] * L[1] + this.nz[k] * L[2] + this.vb[k];
        t = 1 + (v > TH[0]) + (v > TH[1]) + (v > TH[2]) + Math.round(this.bias[k]);
        // what stands in front and toward the sun drops its shadow here
        for (let s = 1; s <= 2; s++) {
          const qi = i - f * s, qj = j - s;
          if (qi < 0 || qi >= w || qj < 0) break;
          const q = qj * w + qi;
          if (this.m[q] >= 0 && this.pid[q] !== this.pid[k] && this.z[q] > this.z[k] + 0.2 && this.cast[q] >= s) { t -= 1; break; }
        }
        // a part that asks for an edge darkens whatever it lies on, all round
        const nb = [k - 1, k + 1, k - w, k + w];
        for (const q of nb) if (q >= 0 && q < n && this.m[q] >= 0 && (this.flag[q] & F_EDGE) && this.pid[q] !== this.pid[k] && this.z[q] > this.z[k] + 0.2) { t -= 1; break; }
      }
      lv[k] = clamp(t, this.fix[k] >= 0 ? 0 : this.floor[k], 4);
      const c = MATS[m].c[lv[k]];
      out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; out[k * 4 + 3] = 255;
    }
    // the outline
    const ring = new Uint8Array(n);
    if (mode !== "none") {
      const solid = new Uint8Array(n);
      for (let k = 0; k < n; k++) solid[k] = this.m[k] >= 0 && !(this.flag[k] & F_NOLINE) ? 1 : 0;
      const pass = (src, passCol) => {
        const add = [];
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const k = j * w + i;
          if (src[k]) continue;
          // the filled neighbour that owns this line pixel: right/below first (then this pixel is on the sunward side)
          const R = i + 1 < w && src[k + 1] ? k + 1 : -1, B = j + 1 < h && src[k + w] ? k + w : -1;
          const Lf = i > 0 && src[k - 1] ? k - 1 : -1, T = j > 0 && src[k - w] ? k - w : -1;
          const sun = f > 0 ? (R >= 0 ? R : B) : (Lf >= 0 ? Lf : B), any = sun >= 0 ? sun : R >= 0 ? R : Lf >= 0 ? Lf : T >= 0 ? T : B;
          if (any < 0) continue;
          add.push([k, any, sun >= 0 && T < 0 && (f > 0 ? Lf < 0 : R < 0)]);
        }
        for (const [k, q, lit] of add) {
          const M = this.m[q] >= 0 ? MATS[this.m[q]] : null;
          const c = passCol || !M ? INK : lit ? M.lineLit : M.line;
          out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; out[k * 4 + 3] = 255;
          src[k] = 2; ring[k] = 1;
        }
      };
      pass(solid, mode === "tint" ? null : INK);
      if (mode === "ink2") pass(solid, INK);
    }
    this._ring = ring;
    // extra lights: each is an overlay (lightLayer) laid over the frame
    for (const lt of o.lights || []) {
      if (!lt.k) continue;
      const ov = this.lightLayer(lt).data;
      for (let k = 0; k < n; k++) { const a = ov[k * 4 + 3] / 255; if (a) for (let c = 0; c < 3; c++) out[k * 4 + c] += (ov[k * 4 + c] - out[k * 4 + c]) * a; }
    }
    return { data: out, w, h, ox: this.ox, oy: this.oy };
  }

  // One extra light as an OVERLAY of its own: the light's colour, with a
  // stepped alpha wherever a part faces it (and on the outline that side).
  // Stamped over the resolved frame it lights the figure; at run time its
  // strength is just the stamp's alpha. This is how the game would do spell
  // light: one more baked sprite per frame, one more stamp per lit figure.
  //   { x, y, r, col, k }      a point light, in sprite pixels (a staff's crystal)
  //   { dir: [dx, dy], col, k } light from far off, no falloff (a jet of fire
  //                            off to one side); dir points TOWARD the light
  // Call resolve() first (it finds the outline).
  lightLayer(lt) {
    const { w, h } = this, n = w * h, out = new Uint8ClampedArray(n * 4), col = hex2rgb(lt.col), hot = mix3(col, [255, 250, 235], 0.32);
    const far = !!lt.dir, wrap = lt.wrap ?? (far ? 0.14 : 0.42), K = lt.k ?? 1, ring = this._ring;
    let ux = 0, uy = 0;
    if (far) { const l = Math.hypot(lt.dir[0], lt.dir[1]) || 1; ux = lt.dir[0] / l; uy = lt.dir[1] / l; }
    const A = [0, 61, 128, 199];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, m = this.m[k], lined = ring && ring[k];
      if (!lined && (m < 0 || MATS[m].emis)) continue;
      let dx = ux, dy = uy, fall = 1;
      if (!far) { dx = lt.x + this.ox - (i + 0.5); dy = lt.y + this.oy - (j + 0.5); const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; fall = clamp(1 - d / lt.r, 0, 1); }
      let s = 0;
      if (lined) {
        // the line is lit where the body lies on its far side from the light
        const bi = i - Math.round(dx), bj = j - Math.round(dy);
        if (bi < 0 || bj < 0 || bi >= w || bj >= h || this.m[bj * w + bi] < 0) continue;
        const g = fall * K; s = g > 0.6 ? 3 : g > 0.35 ? 2 : g > 0.15 ? 1 : 0;
      } else {
        const e = Math.max(0, (this.nx[k] * dx + this.ny[k] * dy) * 0.82 + this.nz[k] * wrap);
        const g = e * fall * K * 1.9; s = g > 0.72 ? 3 : g > 0.42 ? 2 : g > 0.2 ? 1 : 0;
      }
      if (!s) continue;
      const c = s === 3 && !lined ? hot : col;
      out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; out[k * 4 + 3] = A[s];
    }
    return { data: out, w, h, ox: this.ox, oy: this.oy };
  }
}

// a resolved frame -> a canvas
export const toCanvas = (img) => {
  const cv = document.createElement("canvas");
  cv.width = img.w; cv.height = img.h;
  cv.getContext("2d").putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  return cv;
};
