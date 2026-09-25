// ============ TITLE VISTA ============
// The picture behind the title screen: dawn over the Greenwood, the crown's
// castle on its hill, the road winding up to its gate, and the forest
// closing in at the edges. Pixel art in the board's own style, painted once
// and cached. Everything is laid out in a 480x270 unit scene, 2 art pixels
// per unit, with the sun low on the left like the game's own light.

import {
  hash, rgb, lighten, darken, blobBall, cone, inkOutline, bakeSprite, tuft, flower, part, cylinder,
} from "../render/paint.js";
import { stoneBody, coneRoof, slit, pennant, GREY_STONE } from "../render/buildkit.js";

// merlons along a wall head, inked as one piece (cheaper to bake than one
// piece a merlon, and it reads the same)
const battlement = (ctx, x, y, hw, col, step = 7) => part(ctx, (c) => {
  for (let px = x - hw; px < x + hw - 2; px += step) cylinder(c, px, y - 5, Math.min(4.2, x + hw - px), 6, col, { r: 1, hi: 0.32, lo: 0.42 });
});

const U = 2, SW = 480, SH = 270;
export const VW = SW * U, VH = SH * U;
// The road up to the gate, in scene units, gate first; each stretch is
// painted wider than the last as it nears (see ROAD_W). The title crowd
// (titleCrowd.js) walks these same points, so keep them in step.
export const ROAD = [[360, 172], [346, 184], [322, 194], [300, 206], [270, 218], [240, 232], [214, 250], [198, 272]];
export const ROAD_W = (k) => 3 + (k / ROAD.length) * 14;
// the haystack in the field right of the road, where the militiaman works
export const HAY = [312, 216];
const INK = "#241a26";
// these canvases are read back pixel by pixel, so keep them on the CPU
const RF = { willReadFrequently: true };

const smooth = (t) => t * t * (3 - 2 * t);
const vnoise = (x, s, seed) => {
  const g = x / s, i = Math.floor(g), f = smooth(g - i);
  return hash(i, seed) * (1 - f) + hash(i + 1, seed) * f;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const crisp = (cv) => {
  const c = cv.getContext("2d", RF), im = c.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  c.putImageData(im, 0, 0);
  return cv;
};
// a full-scene layer drawn in units, hardened, maybe edged in ink
const layer = (draw, ink = 0) => {
  const cv = mk(VW, VH), c = cv.getContext("2d", RF);
  c.scale(U, U);
  draw(c);
  crisp(cv);
  if (ink) inkOutline(cv, INK, ink);
  return cv;
};

// ---- the sky: dawn, banded and dithered --------------------------------
const SKY = [[0, "#1c2450"], [0.3, "#33427a"], [0.55, "#5d5f96"], [0.74, "#a07898"], [0.87, "#e0a07c"], [1, "#f6cf8e"]].map(([t, c]) => [t, rgb(c)]);
const skyAt = (t) => {
  for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) {
    const [t0, a] = SKY[i - 1], [t1, b] = SKY[i], k = (t - t0) / (t1 - t0);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return SKY[SKY.length - 1][1];
};
function paintSky(ctx) {
  const img = ctx.createImageData(VW, VH), d = img.data, HZ = 176 * U, BANDS = 12;
  const PAL = Array.from({ length: BANDS + 1 }, (_, k) => skyAt(k / BANDS).map(Math.round));
  for (let y = 0; y < VH; y++) {
    const tb = Math.min(1, y / HZ) * BANDS - 0.5;
    for (let x = 0; x < VW; x++) {
      // quantise into bands, dithered across each step
      const c = PAL[Math.min(BANDS, Math.max(0, Math.floor(tb + bayer(x, y))))], i = (y * VW + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  // the sun and its halo
  const SX = 118 * U, SY = 150 * U, R = 40 * U;
  for (let y = SY - R; y < SY + R; y++) for (let x = SX - R; x < SX + R; x++) {
    const r = Math.hypot(x - SX, (y - SY) * 1.1) / U, i = (y * VW + x) * 4;
    if (r < 15) { const c = r < 13 ? [255, 238, 186] : [255, 222, 160]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    else if (r < 34 + bayer(x, y) * 6) {
      const k = r < 22 ? 0.55 : 0.28;
      d[i] += (255 - d[i]) * k; d[i + 1] += (214 - d[i + 1]) * k; d[i + 2] += (150 - d[i + 2]) * k;
    }
  }
  // a few stars still out in the west
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(hash(k, 3) * VW), y = Math.floor(hash(k, 4) * 70 * U);
    const i = (y * VW + x) * 4, on = hash(k, 5) > 0.7 ? 255 : 200;
    d[i] = on; d[i + 1] = on; d[i + 2] = 230;
  }
  ctx.putImageData(img, 0, 0);
}

// ---- clouds: long wisps lit from beneath by the low sun -----------------
function paintClouds(ctx) {
  const cv = layer((c) => {
    c.fillStyle = "#fff";
    const banks = [[70, 58, 60], [190, 40, 46], [300, 78, 70], [420, 50, 50], [150, 96, 40], [40, 110, 34], [380, 112, 44]];
    for (const [cx, cy, w] of banks) for (let k = 0; k < 6; k++) {
      const x = cx + (hash(cx, k) - 0.5) * w * 1.3, y = cy + (hash(cy, k) - 0.5) * 5;
      c.beginPath(); c.ellipse(x, y, w * (0.25 + hash(k, cx) * 0.25), 3.4 + hash(k, cy) * 3.4, 0, 0, Math.PI * 2); c.fill();
    }
  });
  const c = cv.getContext("2d", RF), im = c.getImageData(0, 0, VW, VH), d = im.data;
  const rim = rgb("#ffd6a0"), warm = rgb("#e3a08e"), mid = rgb("#a883a6"), top = rgb("#7e70a2");
  const on = (x, y) => y >= 0 && y < VH && d[(y * VW + x) * 4 + 3] > 0;
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const i = (y * VW + x) * 4;
    if (!d[i + 3]) continue;
    const col = !on(x, y + 2) ? rim : !on(x, y + 6) ? warm : !on(x, y - 4) ? top : mid;
    out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2];
  }
  c.putImageData(new ImageData(out, VW, VH), 0, 0);
  ctx.drawImage(cv, 0, 0);
}

// ---- ranges: peaks lit on their sunward (west) faces ---------------------
function paintRange(ctx, peaks, base, cols, snow = 0) {
  const img = ctx.getImageData(0, 0, VW, VH), d = img.data;
  const [lit, mid, dk, sn, snDk] = cols.map(rgb), rim = rgb(lighten(cols[0], 0.3));
  for (let x = 0; x < VW; x++) {
    const ux = x / U;
    let best = 1e9, bp = null;
    for (const p of peaks) {
      const y = p[1] + Math.abs(ux - p[0]) * p[2] + (vnoise(ux, 5, p[0]) - 0.5) * 3;
      if (y < best) { best = y; bp = p; }
    }
    const top = Math.round(best * U);
    for (let y = Math.max(0, top); y < base * U; y++) {
      const i = (y * VW + x) * 4, uy = y / U;
      const west = ux < bp[0] - (uy - bp[1]) * 0.12;
      let c = west ? lit : (ux - bp[0]) < (uy - bp[1]) * 0.5 ? mid : dk;
      if (y - top < 2 && west) c = rim;
      if (snow && uy < bp[1] + snow + (vnoise(ux, 3, 9) - 0.5) * 4) c = west ? sn : snDk;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---- rolling ground: a shaded band under a wavy top line ----------------
function paintHills(ctx, topAt, cols, seed, strips = false) {
  const img = ctx.getImageData(0, 0, VW, VH), d = img.data;
  const [lit, mid, dk] = cols.map(rgb), rim = rgb(lighten(cols[0], 0.2)), fleck = rgb(darken(cols[1], 0.18));
  for (let x = 0; x < VW; x++) {
    const ux = x / U, top = Math.round(topAt(ux) * U);
    const slope = topAt(ux + 2) - topAt(ux - 2), wob = Math.sin(ux / 23 + seed) * 4;
    for (let y = Math.max(0, top); y < VH; y++) {
      const i = (y * VW + x) * 4, depth = (y - top) / U;
      const v = -slope * 0.7 + (bayer(x, y) - 0.5) * 0.45;
      let c = v > 0.4 ? lit : v < -0.4 ? dk : mid;
      // fields in strips that follow the fall of the ground
      if (strips && depth > 4) {
        const band = Math.floor((depth + wob) / 9);
        if (band % 3 === 1) c = c === dk ? mid : lit;
      }
      if (depth < 1.5) c = rim;
      else if (((Math.imul(x, 73856093) ^ Math.imul(y + seed, 19349663)) >>> 0) % 997 < 15) c = fleck;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---- sprites --------------------------------------------------------------
const pineS = (h, col) => bakeSprite(h * 0.6, h + 2, (c) => {
  c.fillStyle = "#4a3424"; c.fillRect(h * 0.3 - 0.6, h - 2, 1.2, 4);
  cone(c, h * 0.3, h * 0.36, h * 0.28, h * 0.62, col, { scallops: 3, sag: 1.2, hi: 0.4, lo: 0.5 });
  cone(c, h * 0.3, h * 0.12, h * 0.22, h * 0.5, col, { scallops: 3, sag: 1, hi: 0.45, lo: 0.45 });
  cone(c, h * 0.3, 0, h * 0.14, h * 0.34, col, { scallops: 2, sag: 0.8, hi: 0.5, lo: 0.4 });
});
const oakS = (r, col, seed) => bakeSprite(r * 2.6, r * 2.8, (c) => {
  c.fillStyle = "#5a3e28"; c.fillRect(r * 1.3 - r * 0.14, r * 1.6, r * 0.28, r * 1.2);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + seed, d = r * 0.5;
    blobBall(c, r * 1.3 + Math.cos(a) * d, r * 1.25 + Math.sin(a) * d * 0.7, r * 0.72, r * 0.64, col, seed * 10 + k, { hi: 0.55, lo: 0.6 });
  }
  blobBall(c, r * 1.2, r * 1.05, r * 0.8, r * 0.72, col, seed * 10 + 9, { hi: 0.6, lo: 0.55 });
});

// a haystack: a golden dome, lit from the upper left, shadow down-right
const hayS = () => bakeSprite(20, 14, (c) => {
  c.fillStyle = "rgba(42,28,44,0.35)"; c.beginPath(); c.ellipse(11, 12, 8, 1.8, 0, 0, Math.PI * 2); c.fill();
  blobBall(c, 9, 8, 7.4, 4.6, "#d8b860", 7, { hi: 0.6, lo: 0.5 });
  blobBall(c, 8.6, 5.2, 4.8, 3.4, "#e0c070", 8, { hi: 0.65, lo: 0.45 });
  c.fillStyle = "#a88a40"; for (const [x, y] of [[5, 9], [9, 10], [12, 8], [7, 6]]) c.fillRect(x, y, 1.6, 0.5);
});

// The crown's castle, in the game's own masonry: curtain wall, two drum
// towers, a tall keep with the royal banner, torchlight in the slits.
const castleS = () => bakeSprite(132, 120, (c) => {
  const cx = 66, G = 118, roof = "#a8505c", st = GREY_STONE;
  // rear towers behind the keep
  for (const x of [40, 92]) {
    stoneBody(c, x, 44, 16, G - 44 - 20, darken(st, 0.08));
    battlement(c, x, 44, 9, darken(st, 0.05), 5.5);
    coneRoof(c, x, 42, 9, 20, darken(roof, 0.12));
  }
  // the keep
  stoneBody(c, cx, 30, 34, G - 30 - 18, st);
  battlement(c, cx, 30, 18, st, 6);
  coneRoof(c, cx, 28, 17, 26, roof);
  slit(c, cx - 7, 44, 7); slit(c, cx + 7, 44, 7); slit(c, cx, 58, 8);
  pennant(c, cx, -2, 14, "#d8b34a", 1.1, 0, 1);
  // curtain wall and gate
  stoneBody(c, cx, 70, 104, G - 70, st);
  battlement(c, cx, 70, 52, st, 7);
  c.fillStyle = "#2a2230";
  c.beginPath(); c.moveTo(cx - 9, G); c.lineTo(cx - 9, G - 20); c.arc(cx, G - 20, 9, Math.PI, 0); c.lineTo(cx + 9, G); c.closePath(); c.fill();
  c.fillStyle = "#7a5334"; for (let k = -7; k <= 7; k += 3.5) c.fillRect(cx + k - 0.6, G - 26, 1.2, 22);
  c.fillRect(cx - 9, G - 15, 18, 1.2); c.fillRect(cx - 9, G - 9, 18, 1.2);
  // the crown's colours hung either side of the gate
  for (const x of [cx - 26, cx + 26]) part(c, (cc) => {
    cc.fillStyle = "#a8505c"; cc.beginPath();
    cc.moveTo(x - 5, 74); cc.lineTo(x + 5, 74); cc.lineTo(x + 5, 96); cc.lineTo(x, 92); cc.lineTo(x - 5, 96); cc.closePath(); cc.fill();
    cc.fillStyle = "#c46a70"; cc.fillRect(x - 5, 74, 3, 20);
    cc.fillStyle = "#d8b34a"; cc.fillRect(x - 5, 74, 10, 2);
    // the crown, in gold thread
    cc.fillRect(x - 3, 83.5, 6, 2.4); cc.fillRect(x - 3, 80.5, 1.4, 3); cc.fillRect(x - 0.7, 79.5, 1.4, 4); cc.fillRect(x + 1.6, 80.5, 1.4, 3);
  });
  // drum towers at the corners
  for (const x of [14, 118]) {
    stoneBody(c, x, 50, 24, G - 50, st);
    battlement(c, x, 50, 13, st, 6);
    coneRoof(c, x, 48, 13, 24, roof);
    slit(c, x, 64, 7); slit(c, x, 88, 7);
    pennant(c, x, 16, 10, "#a8505c", 2.3 + x, x, x < cx ? -1 : 1);
  }
});

// ---- the scene -------------------------------------------------------------
// Painted in stages, like the map, so it can be spread over a few frames.
let VISTA = null;
export function titleVista() {
  if (VISTA) return VISTA;
  const g = paintVista();
  let r;
  do r = g.next(); while (!r.done);
  return (VISTA = r.value);
}
export function titleVistaAsync(done) {
  if (VISTA) { done(VISTA); return () => {}; }
  const g = paintVista();
  let alive = true;
  const step = () => {
    if (!alive) return;
    if (VISTA) { done(VISTA); return; }
    const r = g.next();
    if (r.done) { VISTA = r.value; done(VISTA); } else setTimeout(step, 0);
  };
  setTimeout(step, 0);
  return () => { alive = false; };
}
function* paintVista() {
  const cv = mk(VW, VH), ctx = cv.getContext("2d", RF);
  ctx.imageSmoothingEnabled = false;
  paintSky(ctx);
  yield;
  paintClouds(ctx);
  yield;
  // far snowy range, then a nearer blue one
  paintRange(ctx, [[20, 120, 0.9], [78, 104, 0.8], [150, 126, 0.85], [212, 96, 0.75], [276, 118, 0.9], [330, 100, 0.8], [402, 112, 0.85], [470, 98, 0.8]],
    180, ["#8c86b8", "#6e6a9c", "#5a5688", "#f4dce0", "#b8a8c8"], 10);
  paintRange(ctx, [[0, 150, 0.6], [60, 140, 0.55], [128, 152, 0.6], [196, 138, 0.5], [262, 150, 0.6], [318, 142, 0.5], [390, 148, 0.55], [456, 140, 0.5]],
    190, ["#6a7aa0", "#56648a", "#48547a"]);
  yield;
  // distant green hills, hazy, with a line of pines
  paintHills(ctx, (x) => 168 + Math.sin(x / 40) * 5 + Math.sin(x / 17 + 1) * 2, ["#86a886", "#6f9274", "#5c7e66"], 3);
  const farPine = pineS(10, "#44685a");
  for (let x = -4; x < SW; x += 5 + hash(x, 1) * 5) {
    const y = 168 + Math.sin(x / 40) * 5 + Math.sin(x / 17 + 1) * 2 + 3;
    if (hash(x, 2) < 0.35) continue;
    ctx.drawImage(farPine, Math.round((x - 3) * U), Math.round((y - 11) * U));
  }
  yield;
  // the castle's hill and the near fields
  const hillTop = (x) => 200 + Math.sin(x / 30) * 3 - 30 * Math.exp(-(((x - 360) / 78) ** 2));
  paintHills(ctx, hillTop, ["#8cc05a", "#6ea24a", "#548a3c"], 5, true);
  // the road up to the gate, wider as it nears
  const road = ROAD;
  ctx.drawImage(layer((c) => {
    c.lineCap = c.lineJoin = "round";
    for (let k = 0; k < road.length - 1; k++) {
      c.strokeStyle = "#d4b47a"; c.lineWidth = ROAD_W(k);
      c.beginPath(); c.moveTo(...road[k]); c.lineTo(...road[k + 1]); c.stroke();
    }
  }, 1), 0, 0);
  // a haystack in the field, forked up by the militiaman who works it
  ctx.drawImage(hayS(), Math.round((HAY[0] - 9) * U), Math.round((HAY[1] - 12) * U));
  // the castle on its hill
  ctx.globalAlpha = 0.35;
  ctx.drawImage(layer((c) => {
    c.fillStyle = "#2a1c2c"; c.beginPath(); c.ellipse(366, 175, 64, 6, 0, 0, Math.PI * 2); c.fill();
  }), 0, 0);
  ctx.globalAlpha = 1;
  yield;
  const castle = castleS();
  ctx.drawImage(castle, Math.round((360 - 66) * U), Math.round((174 - 120) * U));
  yield;
  // woods closing in on both sides, darker toward the viewer
  const woods = [];
  for (let k = 0; k < 26; k++) {
    const left = k < 16, x = left ? -10 + hash(k, 7) * 120 : 400 + hash(k, 7) * 90, y = 196 + hash(k, 8) * 70;
    if (!left && x < 420 && y < 220) continue;
    woods.push([x, y, k]);
  }
  woods.sort((a, b) => a[1] - b[1]);
  for (const [x, y, k] of woods) {
    const near = (y - 196) / 70;
    if (hash(k, 9) < 0.45) {
      const h = Math.round(22 + near * 30), s = pineS(h, near > 0.5 ? "#2f5a3c" : "#3a6a44");
      ctx.drawImage(s, Math.round((x - h * 0.3) * U), Math.round((y - h) * U));
    } else {
      const r = Math.round(10 + near * 14), s = oakS(r, near > 0.5 ? "#3f7a34" : "#4f8a3e", k);
      ctx.drawImage(s, Math.round((x - r * 1.3) * U), Math.round((y - r * 2.6) * U));
    }
  }
  // the foreground grass: tufts and a few flowers
  ctx.drawImage(layer((c) => {
    for (let k = 0; k < 70; k++) {
      const x = hash(k, 11) * SW, y = 236 + hash(k, 12) * 34;
      tuft(c, x, y, 1.1 + hash(k, 13) * 0.8, "#3f6e2e", "#8ac050", k);
    }
    for (let k = 0; k < 18; k++) flower(c, hash(k, 14) * SW, 244 + hash(k, 15) * 24, ["#f2ead4", "#e8c65a", "#d86a6a"][k % 3], k, 1.2);
  }), 0, 0);
  // birds, heading home
  ctx.fillStyle = "#2a2440";
  for (const [x, y] of [[196, 62], [206, 68], [188, 72], [214, 58]]) {
    ctx.fillRect(x * U - 3, y * U, 3, 1); ctx.fillRect(x * U, y * U - 1, 1, 1); ctx.fillRect(x * U + 1, y * U, 3, 1);
  }
  return cv;
}
