// ============ SCENERY UNDER THE LEVEL'S SUN (2026-11-22; art/briefs/time-of-day.md, the scenery row) ============
// Trees, rocks, stones, ruins, tents and props on the Greenwood, Iron and Rime boards (and the apron
// beyond them) follow the level's fixed sun (data/sun.js DAY):
//  - the LIT SIDE: under an eastern sun scenery.js drawTree draws each baked piece MIRRORED about its
//    anchor (pix sculpts inside it are baked with the sun's west twin, scenery-gwpix.js mirrorBake), so
//    its painted light and small ground shadow land on the right; a few pieces never mirror (NO_MIRROR).
//  - the WARM EDGE (sunRim): at early / late / sunrise / golden the sunward edge of a baked piece takes
//    two stepped pixels of the sun's colour (DAY.col, x DAY.warm). Baked once per sprite.
//  - the CAST SHADOW (castShadow / paintCastShadows): each piece's own silhouette laid on the ground
//    along DAY.fall, DAY.len per unit of height, whole art pixels, a dithered tip. A round piece (a tree,
//    a rock) spreads its width ACROSS the light, flaring from its foot; a wide one (a wall, a tent, a
//    house) keeps its width along the screen (a sheared copy from its foot line). All the board's
//    shadows are stamped into one mask (overlaps never darken twice), tinted DAY.shade, and baked into
//    the ground layer (world.js groundLayer) once per sun; the apron does the same (apron.js).
// Nothing here runs at noon (DAY.on false): the board is pixel-identical to before.
import { DAY, onDay } from "../data/sun.js";
import { PX } from "./paint.js";

// ---- the warm edge ----
// cv: a baked sprite (art px). sunLeft: the sun stands to the sprite's own left (as baked).
// The first opaque pixel from the sunward side of each row (and each top-facing pixel of a lit
// crown) is lifted toward DAY.col; the next one half as much. Stepped, no gradient.
export const sunRim = (cv, sunLeft) => {
  if (!DAY.on || !(DAY.warm > 0) || !cv.width) return;
  const c = cv.getContext("2d", { willReadFrequently: true }), w = cv.width, h = cv.height;
  const img = c.getImageData(0, 0, w, h), d = img.data;
  const col = hexRgb(DAY.col), k1 = 0.42 * DAY.warm, k2 = 0.2 * DAY.warm, kt = 0.16 * DAY.warm;
  const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] >= 200;
  const sx = sunLeft ? -1 : 1;
  const lift = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!solid(i, j)) continue;
    let k = 0;
    if (!solid(i + sx, j)) k = k1;
    else if (!solid(i + 2 * sx, j)) k = k2;
    else if (!solid(i, j - 1) && !solid(i + sx, j - 1)) k = kt;      // a top facing the low sun
    if (k) lift[j * w + i] = k;
  }
  for (let q = 0; q < w * h; q++) {
    const k = lift[q];
    if (!k) continue;
    for (let ch = 0; ch < 3; ch++) d[q * 4 + ch] = Math.round(d[q * 4 + ch] + (col[ch] - d[q * 4 + ch]) * k);
  }
  c.putImageData(img, 0, 0);
};
const hexRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ---- the cast shadow of one baked piece ----
// sp: { cv, hw, top, bot } as scenery.js decorSprite bakes it (the anchor at (hw, top) units).
// mirror: drawn mirrored. round: spread across the light (trees, rocks) or sheared along x (walls, houses).
// Returns { cv, x0, y0, foot } in art px: the mask's top-left relative to (anchor x, foot y), and the foot
// line's offset below the anchor (units). Cached per sprite canvas; cleared on a new sun.
let SHADOWS = new WeakMap();
onDay(() => { SHADOWS = new WeakMap(); });
const FORE = 0.55;                    // how the camera squashes the ground: depth on screen per unit across
const across = (fx, fy) => {          // the ground's perpendicular to the fall, as the camera sees it (y down)
  let gx = fx, gy = fy / FORE; const l = Math.hypot(gx, gy) || 1; gx /= l; gy /= l;
  let qx = -gy, qy = gx * FORE;
  if (qy < 0) { qx = -qx; qy = -qy; }
  return [qx, qy];
};
export const castShadow = (sp, mirror, round) => {
  if (!DAY.on || !(DAY.len > 0)) return null;
  const key = (mirror ? "m" : "s") + (round ? "r" : "b");
  let per = SHADOWS.get(sp.cv);
  if (!per) SHADOWS.set(sp.cv, (per = {}));
  if (key in per) return per[key];
  const cv = sp.cv, w = cv.width, h = cv.height;
  const a = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const solid = (i, j) => a[(j * w + i) * 4 + 3] >= 160;
  const ax = Math.round(sp.hw * PX), ay = Math.round(sp.top * PX);
  // the foot: the lowest solid row near the anchor's column (else anywhere), no lower than the sprite allows
  let F = -1, topRow = h;
  for (let j = h - 1; j >= 0 && F < 0; j--) for (let i = Math.max(0, ax - 4); i <= Math.min(w - 1, ax + 4); i++) if (solid(i, j)) { F = j; break; }
  for (let j = 0; j < h && topRow === h; j++) for (let i = 0; i < w; i++) if (solid(i, j)) { topRow = j; break; }
  if (F < 0) for (let j = h - 1; j >= 0 && F < 0; j--) for (let i = 0; i < w; i++) if (solid(i, j)) { F = j; break; }
  const Hmax = F - topRow;
  if (F < 0 || Hmax < 5) return (per[key] = null);
  const L = DAY.len, fx = DAY.fall[0], fy = DAY.fall[1], [qx, qy] = across(fx, fy);
  const hR = Math.max(4, Math.min(16 * PX, Hmax * 0.5));
  // a round piece's footprint: its foot row is the FRONT of a disc as wide as its base, so the shadow is
  // laid round the disc's middle (bw x FORE up the screen) and never shows in front of the base
  let b0 = 1e9, b1 = -1e9;
  for (let j = Math.max(0, F - 2); j <= F; j++) for (let i = 0; i < w; i++) if (solid(i, j)) { b0 = Math.min(b0, i); b1 = Math.max(b1, i); }
  const lift0 = round ? Math.max(0, (b1 - b0 + 1) / 2) * FORE : 0;          // a round piece flares to its width over hR
  const sub = Math.max(2, Math.ceil(L * 1.3) + 1);
  const pts = [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let j = topRow; j <= F; j++) for (let i = 0; i < w; i++) {
    if (!solid(i, j)) continue;
    const u0 = (i + 0.5 - ax) * (mirror ? -1 : 1);
    for (let sh = 0; sh < sub; sh++) {
      const hh = F - j + (sh + 0.5) / sub, frac = hh / Hmax;
      const r = round ? Math.min(1, hh / hR) : 1;
      for (const du of [-0.25, 0.25]) {
        const u = u0 + du;
        const X = Math.floor(round ? u * qx * r + hh * L * fx : u + hh * L * fx);
        const Y = Math.floor(round ? u * qy * r + hh * L * fy - lift0 : hh * L * fy);
        // the tip breaks up: a checker past three quarters of the height, one in four at the very top
        if (frac > 0.74 && ((X + Y) & 1)) continue;
        if (frac > 0.9 && ((X & 1) || (Y & 1))) continue;
        pts.push(X, Y);
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      }
    }
  }
  if (!pts.length) return (per[key] = null);
  const sw = x1 - x0 + 1, shh = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = sw; out.height = shh;
  const oc = out.getContext("2d"), img = oc.createImageData(sw, shh), od = img.data;
  for (let p = 0; p < pts.length; p += 2) { const q = ((pts[p + 1] - y0) * sw + (pts[p] - x0)) * 4; od[q] = od[q + 1] = od[q + 2] = 255; od[q + 3] = 255; }
  oc.putImageData(img, 0, 0);
  return (per[key] = { cv: out, x0, y0, foot: (F + 1 - ay) / PX });
};

// ---- many shadows into one mask, laid on a ground canvas ----
// ctx: drawing in world units. items: [{ sp, x, y, mirror, round, lift }]. rect: the world rect the
// mask covers, k: its pixels per unit (PX on the board: every art pixel whole).
export const paintCastShadows = (ctx, items, x0, y0, x1, y1, k = PX) => {
  if (!DAY.on || !(DAY.len > 0) || !items.length) return 0;
  const mw = Math.ceil((x1 - x0) * k), mh = Math.ceil((y1 - y0) * k);
  if (mw < 1 || mh < 1) return 0;
  const mask = document.createElement("canvas");
  mask.width = mw; mask.height = mh;
  const m = mask.getContext("2d");
  m.imageSmoothingEnabled = false;
  let n = 0;
  for (const it of items) {
    if (it.pre) {   // a shadow already laid out in world space (spawn, bridges): { pre: { cv, x, y } } at PX
      const P = it.pre;
      if (k === PX) m.drawImage(P.cv, Math.round((P.x - x0) * k), Math.round((P.y - y0) * k));
      else m.drawImage(P.cv, (P.x - x0) * k, (P.y - y0) * k, P.cv.width * k / PX, P.cv.height * k / PX);
      n++;
      continue;
    }
    const s = castShadow(it.sp, it.mirror, it.round);
    if (!s) continue;
    // the foot on the art-pixel grid, then the mask's corner from it
    const fxw = Math.round(it.x * PX), fyw = Math.round((it.y - (it.lift || 0) + s.foot) * PX);
    const X = (fxw + s.x0) / PX, Y = (fyw + s.y0) / PX;
    if (X > x1 || Y > y1 || X + s.cv.width / PX < x0 || Y + s.cv.height / PX < y0) continue;
    if (k === PX) m.drawImage(s.cv, Math.round((X - x0) * k), Math.round((Y - y0) * k));
    else m.drawImage(s.cv, (X - x0) * k, (Y - y0) * k, s.cv.width * k / PX, s.cv.height * k / PX);
    n++;
  }
  m.globalCompositeOperation = "source-in";
  const [r, g, b, a] = DAY.shade;
  m.fillStyle = `rgb(${r},${g},${b})`;
  m.fillRect(0, 0, mw, mh);
  const pa = ctx.globalAlpha, ps = ctx.imageSmoothingEnabled;
  ctx.globalAlpha = pa * a;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mask, x0, y0, mw / k, mh / k);
  ctx.globalAlpha = pa;
  ctx.imageSmoothingEnabled = ps;
  return n;
};

// ---- big pieces drawn in place (the spawn's camp and gate, the bridges): shadows laid out in world space ----
// A world-space mask helper: points in art px of the board (0..W*PX), kept as a tight canvas.
const maskOf = (pts) => {
  if (!pts.length) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let p = 0; p < pts.length; p += 2) { const X = pts[p], Y = pts[p + 1]; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data;
  for (let p = 0; p < pts.length; p += 2) { const q = ((pts[p + 1] - y0) * w + (pts[p] - x0)) * 4; d[q] = d[q + 1] = d[q + 2] = d[q + 3] = 255; }
  c.putImageData(img, 0, 0);
  return { cv, x: x0 / PX, y: y0 / PX };
};
const tipOff = (frac, X, Y) => (frac > 0.74 && ((X + Y) & 1)) || (frac > 0.9 && ((X & 1) || (Y & 1)));
// paint `draw(ctx)` (world units) into a board-sized scratch at PX and read its solid pixels
const scratchOf = (draw, W, H) => {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(W * PX); cv.height = Math.ceil(H * PX);
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false; c.scale(PX, PX);
  draw(c);
  return { w: cv.width, h: cv.height, a: c.getImageData(0, 0, cv.width, cv.height).data };
};
// Standing things (tents, a palisade, gate posts): each column's solid RUNS stand on their own lowest
// pixel; a pixel h above its run's foot falls h x len along the light. A sheared copy, run by run.
export const columnCast = (draw, W, H, maxH = 90) => {
  if (!DAY.on || !(DAY.len > 0)) return null;
  const S = scratchOf(draw, W, H), L = DAY.len, fx = DAY.fall[0], fy = DAY.fall[1], sub = Math.max(2, Math.ceil(L * 1.3) + 1);
  const pts = [];
  for (let i = 0; i < S.w; i++) {
    let j = S.h - 1;
    while (j >= 0) {
      while (j >= 0 && S.a[(j * S.w + i) * 4 + 3] < 160) j--;
      if (j < 0) break;
      const foot = j;
      while (j >= 0 && S.a[(j * S.w + i) * 4 + 3] >= 160 && foot - j < maxH * PX) j--;
      const top = j + 1, Hr = foot - top + 1;
      if (Hr < 4) continue;
      for (let jj = top; jj <= foot; jj++) for (let sh = 0; sh < sub; sh++) {
        const hh = foot - jj + (sh + 0.5) / sub, X = Math.floor(i + 0.5 + hh * L * fx), Y = Math.floor(foot + hh * L * fy);
        if (tipOff(hh / Hr, X, Y)) continue;
        pts.push(X, Y);
      }
    }
  }
  return maskOf(pts);
};
// Low things on legs (a bridge deck over the water): the whole silhouette lifted `hb` units, its shadow
// the silhouette slid along the light from 0 to hb x len (short: a deck stands low).
export const liftCast = (draw, W, H, hb) => {
  if (!DAY.on || !(DAY.len > 0)) return null;
  const S = scratchOf(draw, W, H), L = DAY.len, fx = DAY.fall[0], fy = DAY.fall[1];
  const steps = Math.max(1, Math.ceil(hb * L * PX));
  const pts = [];
  for (let j = 0; j < S.h; j++) for (let i = 0; i < S.w; i++) {
    if (S.a[(j * S.w + i) * 4 + 3] < 160) continue;
    // only the far edge needs stepping: interior pixels slide over each other
    const edge = S.a[(j * S.w + i + Math.sign(fx || 1)) * 4 + 3] < 160 || S.a[((j + 1) * S.w + i) * 4 + 3] < 160;
    if (!edge) { pts.push(Math.floor(i + hb * L * PX * fx), Math.floor(j + hb * L * PX * fy)); continue; }
    for (let t = 1; t <= steps; t++) pts.push(Math.floor(i + 0.5 + t * fx), Math.floor(j + 0.5 + t * fy));
  }
  return maskOf(pts);
};
// A mound with a height field (the gate's crag): every ground point q stands hAt(q) high and throws its
// top hAt(q) x len along the light; a pixel p is in shadow if some q behind it along the light stands
// tall enough to reach it. Box: the mound's ground [x0, y0, x1, y1] (world units), top: its height.
export const heightCast = (hAt, x0, y0, x1, y1, top) => {
  if (!DAY.on || !(DAY.len > 0) || !hAt) return null;
  const L = DAY.len, fx = DAY.fall[0], fy = DAY.fall[1], g = 1 / PX;
  const gw = Math.ceil((x1 - x0) * PX), gh = Math.ceil((y1 - y0) * PX), Z = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) Z[j * gw + i] = Math.max(0, hAt(x0 + (i + 0.5) * g, y0 + (j + 0.5) * g) || 0);
  const zAt = (x, y) => { const i = Math.floor((x - x0) * PX), j = Math.floor((y - y0) * PX); return i < 0 || j < 0 || i >= gw || j >= gh ? 0 : Z[j * gw + i]; };
  const reach = L * top, pts = [];
  const X0 = Math.floor(Math.min(x0, x0 + fx * reach) * PX), X1 = Math.ceil(Math.max(x1, x1 + fx * reach) * PX);
  const Y0 = Math.floor(Math.min(y0, y0 + fy * reach) * PX), Y1 = Math.ceil(Math.max(y1, y1 + fy * reach) * PX);
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
    const px = (X + 0.5) * g, py = (Y + 0.5) * g;
    for (let t = 0.5; t <= reach; t += 0.5) {
      const z = zAt(px - fx * t, py - fy * t);
      if (z > 0.6 && z * L >= t) { if (!tipOff(t / (z * L), X, Y)) pts.push(X, Y); break; }
    }
  }
  return maskOf(pts);
};
