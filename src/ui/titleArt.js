// ============ TITLE VISTA ============
// The picture behind the title screen: dawn over the Greenwood, the crown's
// castle on its hill, the road winding up to its gate, and the forest
// closing in at the edges. Pixel art in the board's own style, painted once
// and cached. Everything is laid out in a 480x270 unit scene, 2 art pixels
// per unit, with the sun low on the left like the game's own light.

import {
  hash, rgb, rgba, lighten, darken, blobBall, ball, cone, inkOutline, bakeSprite, tuft, flower, part, cylinder,
} from "../render/paint.js";
import { ashlar, merlons, footing, torchBracket } from "../render/buildkit.js";

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

// ---- the crown's castle ------------------------------------------------------
// The in-game castle (render/castle.js) seen from the front, looking up the
// hill at it: SQUARE towers with open, battlemented tops (merlons against the
// sky), corbelled parapets, small red-roofed stair turrets keeping a little red
// on the skyline, a tall keep behind, and the gatehouse with its portcullis.
// Ballista arms and a crewman's kettle hat peep between the merlons. What
// moves (flags, the gate's crown banners, torches, smoke, the sentry on the
// wall walk, birds) is drawn live by titleCrowd.js at the anchors in
// CASTLE_LIFE, never baked here.
const ST = "#aca494", ROOF = "#a8505c", STEEL = "#c4c8d0", OAK = "#7a5334";
// sprite size and anchor: the gate's sill (cx, G) sits at scene (360, 172)
const CS = { w: 132, h: 128, cx: 66, g: 124, x: 360, y: 172 };
const G = CS.g, CX = CS.cx, CURTAIN_GAP = 3.8;
// the gate passage: the portcullis hangs `raise` over the sill (a soldier
// walks under it), the passage runs `depth` up the picture to a lit courtyard
// opening `far` wide each side of centre
const PASS = { raise: 12.5, depth: 4, far: 3 };
const sx = (x) => CS.x - CS.cx + x, sy = (y) => CS.y - CS.g + y;   // sprite -> scene

// an arrow loop: a dark slit, a few with torchlight low inside
const slit = (c, x, y, h, lit = true) => part(c, (cc) => {
  cc.fillStyle = "#2a2230"; cc.fillRect(x - 0.9, y, 1.8, h);
  cc.fillRect(x - 0.4, y - 0.5, 0.8, 0.5);
  if (lit) { cc.fillStyle = "#e89a48"; cc.fillRect(x - 0.4, y + h * 0.45, 0.8, h * 0.4); cc.fillStyle = "#ffd070"; cc.fillRect(x - 0.4, y + h * 0.65, 0.8, h * 0.2); }
});

// merlons spread evenly across a parapet [x0, x1], tops `h` over `y`
const crenels = (x0, x1, mw = 4, gap = 2.6) => {
  const n = Math.max(2, Math.round((x1 - x0 - mw) / (mw + gap)) + 1);
  return { x0, x1, mw, step: (x1 - x0 - mw) / (n - 1), n };
};
const crenelRow = (c, cr, y, col, seed, h = 5) =>
  merlons(c, (cr.x0 + cr.x1) / 2, y, (cr.x1 - cr.x0) / 2, col, { step: cr.step, w: cr.mw, h, seed });

// a pyramid roof in shingle rows, the sunward half lit, a gold knop on top
const pyramid = (ctx, x, eave, hw, h, col) => {
  part(ctx, (c) => {
    c.fillStyle = lighten(col, 0.1);
    c.beginPath(); c.moveTo(x - hw, eave); c.lineTo(x, eave - h); c.lineTo(x + 0.3, eave); c.closePath(); c.fill();
    c.fillStyle = darken(col, 0.28);
    c.beginPath(); c.moveTo(x + 0.3, eave); c.lineTo(x, eave - h); c.lineTo(x + hw, eave); c.closePath(); c.fill();
    c.fillStyle = rgba(darken(col, 0.55), 0.55);
    for (let k = 1; k < 4; k++) { const y = eave - (h * k) / 4, w = hw * (1 - k / 4); c.fillRect(x - w, y, w * 2, 0.5); }
    c.fillStyle = rgba("#fff3d2", 0.35); c.fillRect(x - 0.6, eave - h + 1, 0.5, h - 1.5);
    c.fillStyle = darken(col, 0.5); c.fillRect(x - hw, eave - 0.6, hw * 2, 0.6);
  });
  part(ctx, (c) => ball(c, x, eave - h, 1.1, 1.1, "#d8b34a", { hi: 0.5, lo: 0.3 }));
};

// a square tower (or wall block) with a corbelled parapet and merlons;
// returns its crenel layout so things can peep between the merlons
const block = (c, x, top, w, bottom, col, seed, o = {}) => {
  const x0 = x - w / 2, lip = o.lip ?? 1.2, band = o.band ?? 5;
  ashlar(c, x0, top + band, w, bottom - top - band, col, seed, { course: 3.6, block: 5.5, moss: o.moss, r: 0.8, lo: 0.5 });
  // corbels under the jutting parapet
  if (lip > 0) part(c, (cc) => {
    for (let px = x0 + 1; px < x0 + w - 1; px += 3.2) {
      cc.fillStyle = darken(col, 0.35); cc.fillRect(px, top + band, 1.8, 1.6);
      cc.fillStyle = darken(col, 0.6); cc.fillRect(px, top + band + 1.6, 1.8, 0.6);
    }
  });
  ashlar(c, x0 - lip, top, w + lip * 2, band, lighten(col, 0.06), seed + 9, { course: 2.5, block: 5, r: 0.5, hi: 0.35 });
  const cr = crenels(x0 - lip, x0 + w + lip, 4, o.gap ?? 2.6);
  if (o.peep) o.peep(cr);
  crenelRow(c, cr, top + 0.5, lighten(col, 0.12), seed);
  return cr;
};

// a ballista standing on a gate tower's deck, facing us: the bow's arms
// and its bolt head showing over the merlons
const ballistaPeep = (c, x, y) => part(c, (cc) => {
  cc.strokeStyle = OAK; cc.lineWidth = 1.1; cc.lineCap = "round";
  cc.beginPath(); cc.moveTo(x - 5, y - 1.8); cc.quadraticCurveTo(x - 2.5, y + 0.6, x, y + 0.4); cc.quadraticCurveTo(x + 2.5, y + 0.6, x + 5, y - 1.8); cc.stroke();
  cc.strokeStyle = "#e8e0c8"; cc.lineWidth = 0.4;
  cc.beginPath(); cc.moveTo(x - 5, y - 1.8); cc.lineTo(x, y + 2); cc.lineTo(x + 5, y - 1.8); cc.stroke();
  cc.fillStyle = darken(OAK, 0.3); cc.fillRect(x - 1, y - 1.2, 2, 5);
  cc.fillStyle = STEEL; cc.beginPath(); cc.moveTo(x, y - 3.4); cc.lineTo(x + 1.3, y - 1.4); cc.lineTo(x, y + 0.2); cc.lineTo(x - 1.3, y - 1.4); cc.closePath(); cc.fill();
});
const kettleHat = (c, x, y) => part(c, (cc) => {
  ball(cc, x, y, 1.9, 1.5, STEEL, { hi: 0.5, lo: 0.45 });
  cc.fillStyle = darken(STEEL, 0.3); cc.fillRect(x - 2.6, y + 0.8, 5.2, 0.7);
});

// the layout, shared with the live layer
const L = {
  keep: [CX, G - 92, 34], keepTurret: [CX + 12, G - 106, 8], chimney: [CX + 1, G - 100],
  rear: [[CX - 33, G - 80, 14], [CX + 33, G - 80, 14]],
  corner: [[13, G - 70, 24], [119, G - 70, 24]], cornerTurret: [[21.5, G - 80, 7], [110.5, G - 80, 7]],
  curtain: [20, 112, G - 48], gateTower: [[CX - 16, G - 64, 12], [CX + 16, G - 64, 12]], gateWall: [CX, G - 56, 22],
  arch: [CX, G - 16, 8],
};

const castleS = () => bakeSprite(CS.w, CS.h, (c) => {
  const back = darken(ST, 0.1), rear = darken(ST, 0.2);
  // the keep: chimney and stair turret on its deck, then its body
  const [kx, kt, kw] = L.keep;
  part(c, (cc) => cylinder(cc, L.chimney[0] - 2, L.chimney[1], 4, kt - L.chimney[1] + 2, darken(ST, 0.05), { r: 0.5, hi: 0.35, lo: 0.5 }));
  part(c, (cc) => { cc.fillStyle = "#3a3038"; cc.fillRect(L.chimney[0] - 2.4, L.chimney[1] - 0.6, 4.8, 1.4); });
  const [tx, tt, tw] = L.keepTurret;
  ashlar(c, tx - tw / 2, tt, tw, kt - tt + 4, back, 31, { course: 3.2, block: 4, r: 0.5 });
  slit(c, tx, tt + 3.5, 4, false);
  pyramid(c, tx, tt + 0.5, tw / 2 + 1.4, 11, ROOF);
  // the royal standard's pole (its flag flies live)
  part(c, (cc) => cylinder(cc, kx - 10.8, G - 122, 1.4, 32, "#6a4a2e", { r: 0.6, hi: 0.3, lo: 0.5 }));
  block(c, kx, kt, kw, G - 30, back, 3, { lip: 1.4 });
  slit(c, kx - 7, kt + 13, 6); slit(c, kx + 7, kt + 13, 6, false);
  slit(c, kx, kt + 26, 7, false);
  // rear towers either side of the keep
  for (const [x, t, w] of L.rear) { block(c, x, t, w, G - 30, rear, 40 + x, { lip: 1 }); slit(c, x, t + 12, 5, x > CX); }
  // the corner towers' stair turrets, behind their parapets
  for (const [x, t, w] of L.cornerTurret) {
    ashlar(c, x - w / 2, t, w, 16, back, 50 + x, { course: 3.2, block: 4, r: 0.5 });
    pyramid(c, x, t + 0.5, w / 2 + 1.3, 10, ROOF);
  }
  // the curtain wall, its merlons against the keep's foot
  const [c0, c1, ct] = L.curtain;
  block(c, (c0 + c1) / 2, ct, c1 - c0, G, darken(ST, 0.07), 11, { lip: 0.8, moss: 0.5, gap: CURTAIN_GAP });
  // the gatehouse: the wall over the gate, then its two towers (ballistae up top)
  const [gx, gt, gw] = L.gateWall;
  block(c, gx, gt, gw, G, darken(ST, 0.04), 21, { lip: 1 });
  for (const [x, t, w] of L.gateTower) {
    block(c, x, t, w, G, ST, 60 + x, { lip: 1.4, moss: 0.6, peep: () => ballistaPeep(c, x, t - 4.2) });
    slit(c, x, t + 32, 6);
  }
  // the arch, its ring of voussoirs, the dark passage and the portcullis
  const [ax, ay, ar] = L.arch;
  part(c, (cc) => {
    cc.fillStyle = "#e0d8c4";
    cc.beginPath(); cc.moveTo(ax - ar - 2, G); cc.lineTo(ax - ar - 2, ay); cc.arc(ax, ay, ar + 2, Math.PI, 0); cc.lineTo(ax + ar + 2, G); cc.closePath(); cc.fill();
    cc.fillStyle = darken(ST, 0.45);
    for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; cc.fillRect(ax + Math.cos(a) * (ar + 1) - 0.25, ay + Math.sin(a) * (ar + 1) - 0.25, 0.5, 0.5); }
    cc.fillStyle = "#1e1822";
    cc.beginPath(); cc.moveTo(ax - ar, G); cc.lineTo(ax - ar, ay); cc.arc(ax, ay, ar, Math.PI, 0); cc.lineTo(ax + ar, G); cc.closePath(); cc.fill();
    // down the passage: its floor running in to the courtyard, lit by the
    // morning at the far end
    const fw = PASS.far, fy = G - PASS.depth;
    cc.fillStyle = "#2e2428"; cc.fillRect(ax - ar + 1.2, fy - 7, 1.2, 7); cc.fillRect(ax + ar - 2.4, fy - 7, 1.2, 7);
    cc.fillStyle = "#5a4642"; cc.fillRect(ax - fw, fy - 5, fw * 2, 5);                 // the courtyard's far wall
    cc.fillStyle = "#7a6052"; cc.fillRect(ax - fw, fy - 5, fw * 0.8, 5);
    cc.fillStyle = "#e8b878"; cc.fillRect(ax - fw, fy - 1.5, fw * 2, 1.5);             // sunlit flags
    cc.fillStyle = "#ffe0a0"; cc.fillRect(ax - fw, fy - 1.5, fw, 0.5);
    cc.fillStyle = "#3a2e30";
    cc.beginPath(); cc.moveTo(ax - ar, G); cc.lineTo(ax - fw, fy); cc.lineTo(ax + fw, fy); cc.lineTo(ax + ar, G); cc.closePath(); cc.fill();
    cc.fillStyle = "#5a4640";
    for (let k = 1; k < 4; k++) { const t = k / 4, y = fy + (G - fy) * t, w = fw + (ar - fw) * t; cc.fillRect(ax - w, y, w * 2, 0.5); }
    cc.fillStyle = rgba("#e8b878", 0.35); cc.fillRect(ax - fw, fy, fw * 2, 1);
  });
  // the portcullis, raised to a man's height over the sill: bars, cross
  // bands, iron teeth along its foot, and the chains it hangs from
  part(c, (cc) => {
    const pb = G - PASS.raise;
    cc.save(); cc.beginPath(); cc.moveTo(ax - ar, pb); cc.lineTo(ax - ar, ay); cc.arc(ax, ay, ar, Math.PI, 0); cc.lineTo(ax + ar, pb); cc.closePath(); cc.clip();
    for (let px = ax - ar + 1.6; px < ax + ar; px += 2.6) { cc.fillStyle = "#3e424c"; cc.fillRect(px - 0.5, ay - ar, 1, pb - ay + ar); cc.fillStyle = "#6a707c"; cc.fillRect(px - 0.5, ay - ar, 0.5, pb - ay + ar); }
    for (let py = ay - ar + 2; py < pb - 1; py += 2.8) { cc.fillStyle = "#4a4e5a"; cc.fillRect(ax - ar, py, ar * 2, 0.8); }
    cc.fillStyle = "#34363e"; cc.fillRect(ax - ar, pb - 1.2, ar * 2, 1.2);
    cc.restore();
    for (let px = ax - ar + 1.6; px < ax + ar; px += 2.6) {
      cc.fillStyle = "#8a909c";
      cc.beginPath(); cc.moveTo(px - 0.7, pb); cc.lineTo(px + 0.7, pb); cc.lineTo(px, pb + 1.6); cc.closePath(); cc.fill();
    }
    for (const x of [ax - ar + 0.6, ax + ar - 0.6]) for (let y = ay - ar + 3; y < pb - 1; y += 1.4) { cc.fillStyle = y % 2.8 < 1.4 ? "#8a909c" : "#4a4e5a"; cc.fillRect(x - 0.4, y, 0.8, 1); }
  });
  // torches at the gate (their flames burn live)
  for (const x of [ax - ar - 3.6, ax + ar + 3.6]) torchBracket(c, x, G - 17);
  // the corner towers, a crewman's hat between the merlons of one
  for (const [x, t, w] of L.corner) {
    block(c, x, t, w, G, ST, 70 + x, { lip: 1.6, moss: 0.8, peep: (cr) => { if (x > CX) kettleHat(c, cr.x0 + cr.mw + cr.step * 1 + (cr.step - cr.mw) / 2, t - 2.6); } });
    slit(c, x, t + 16, 7, false); slit(c, x, t + 38, 7, x < CX);
  }
  // the footing course the whole castle stands on, broken by the gate
  footing(c, (1 + ax - ar - 2) / 2, G, (ax - ar - 2 - 1) / 2 - 2, darken(ST, 0.14), 5, 4.5);
  footing(c, (ax + ar + 2 + 131) / 2, G, (131 - ax - ar - 2) / 2 - 2, darken(ST, 0.14), 9, 4.5);
});

// Where the live bits go, in scene units (see titleCrowd.js).
const curtainCr = crenels(L.curtain[0] - 0.8, L.curtain[1] + 0.8, 4, CURTAIN_GAP);
export const CASTLE_LIFE = {
  gate: [CS.x, CS.y],
  // the gate's opening under the raised portcullis, and the passage floor's
  // far end: walkers going in are clipped to this and fade into the dark
  passage: { x0: sx(L.arch[0] - L.arch[2]), x1: sx(L.arch[0] + L.arch[2]), top: sy(G - PASS.raise + 1.4), sill: CS.y, far: sy(G - PASS.depth) },
  standard: [sx(L.keep[0] - 10.1), sy(G - 121)],                       // the royal standard, top of its pole
  pennants: [...L.cornerTurret.map(([x, t]) => [sx(x), sy(t - 10.3)]), [sx(L.keepTurret[0]), sy(L.keepTurret[1] - 11.3)]],
  banners: L.gateTower.map(([x, t]) => [sx(x), sy(t + 7.4)]),            // the crown banners on the gate towers
  torches: [sx(L.arch[0] - L.arch[2] - 3.6), sx(L.arch[0] + L.arch[2] + 3.6)].map((x) => [x, sy(G - 22.8)]),
  chimney: [sx(L.chimney[0]), sy(L.chimney[1] - 0.5)],
  // the wall walk: the sentry walks [x0, x1] with his feet hidden behind
  // the parapet top at `y`; he shows only in the gaps between merlons
  walk: {
    x0: sx(L.corner[0][0] + 15), x1: sx(L.gateTower[0][0] - 8.5), y: sy(L.curtain[2] + 0.5), top: sy(L.curtain[2] + 0.5 - 5),
    gaps: Array.from({ length: curtainCr.n - 1 }, (_, i) => [sx(curtainCr.x0 + i * curtainCr.step + curtainCr.mw), sx(curtainCr.x0 + (i + 1) * curtainCr.step)]),
  },
  // merlon tops where birds settle
  perches: [
    [sx(L.corner[0][0] - 11.6), sy(L.corner[0][1] - 4.6)], [sx(L.corner[1][0] + 11.6), sy(L.corner[1][1] - 4.6)],
    [sx(L.gateTower[1][0] + 5.4), sy(L.gateTower[1][1] - 4.6)], [sx(L.keep[0] - 16.4), sy(L.keep[1] - 4.6)],
  ],
};

// how far (x, y) lies outside the painted road's edge (negative: on it)
const offRoad = (x, y) => {
  let best = 1e9;
  for (let k = 0; k < ROAD.length - 1; k++) {
    const [x0, y0] = ROAD[k], [x1, y1] = ROAD[k + 1], dx = x1 - x0, dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - x0 - dx * t, y - y0 - dy * t) - ROAD_W(k) / 2);
  }
  return best;
};

// The threshold: setts laid in rows, fanning from the gate's sill down into
// the dirt road, with a darker kerb of edge stones.
const THRESHOLD = [[349, 171.2], [371, 171.2], [371.5, 173.6], [366, 177], [356, 181.5], [348, 184], [343, 183], [343.5, 179.5], [347.5, 175]];
function paintThreshold(c) {
  const edge = () => { c.beginPath(); THRESHOLD.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  c.save(); edge(); c.clip();
  c.fillStyle = "#6e6454"; c.fillRect(330, 168, 50, 20);
  for (let row = 0, y = 171.2; y < 185; row++, y += 1.5) {
    for (let x = 340 + (row % 2) * 1.3, k = 0; x < 376; x += 2.6, k++) {
      const t = hash(row * 31 + k, 7);
      c.fillStyle = t < 0.3 ? "#a89e88" : t > 0.75 ? "#d0c8b2" : "#bdb39c";
      c.fillRect(x, y, 2.1, 1.05);
      c.fillStyle = "#e4dcc8"; c.fillRect(x, y, 1.6, 0.35);
    }
  }
  c.restore();
  edge(); c.strokeStyle = "#8a806c"; c.lineWidth = 0.9; c.stroke();
}
// The bank: soil and a lip of turf along the castle's foot (not across the
// threshold), tufts leaning on the stones, rubble at the corners.
function paintBank(c) {
  const x0 = sx(0), x1 = sx(CS.w), gy = CS.y;
  for (let x = x0 - 2; x < x1 + 2; x += 0.5) {
    if (x > 347 && x < 373) continue;
    const top = gy - 0.6 - (hash(Math.floor(x * 2), 3) > 0.75 ? 0.5 : 0) - Math.max(0, Math.sin(x / 7)) * 0.6;
    c.fillStyle = "#5a4430"; c.fillRect(x, top - 0.5, 0.5, 0.5);
    c.fillStyle = "#86ba56"; c.fillRect(x, top, 0.5, gy + 3 - top);
    c.fillStyle = "#a4d070"; c.fillRect(x, top, 0.5, 0.5);
  }
  for (let k = 0; k < 12; k++) {
    const x = x0 + 2 + hash(k, 21) * (CS.w - 4);
    if (x > 344 && x < 376) continue;
    tuft(c, x, gy + 1 + hash(k, 22), 0.35 + hash(k, 23) * 0.25, "#3f6e2e", "#8ac050", k + 90, { n: 3 });
  }
  for (const [x, y, r] of [[x0 + 1, gy + 1.2, 1.6], [x0 + 4, gy + 2, 1.1], [x1 - 2, gy + 1.4, 1.7], [x1 - 5.5, gy + 2.2, 1], [344.5, gy + 1, 1.2], [375.5, gy + 1.2, 1.3], [377.5, gy + 2.2, 0.8]]) {
    blobBall(c, x, y, r, r * 0.75, "#8e8878", Math.round(x * 3), { hi: 0.45, lo: 0.5 });
  }
}

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
  // the hill rises to a level top under the castle, so it stands IN the
  // ground rather than on the slope
  const hillTop = (x) => Math.min(
    200 + Math.sin(x / 30) * 3 - 30 * Math.exp(-(((x - 360) / 78) ** 2)),
    170.5 + Math.max(0, Math.abs(x - 362) - 70) ** 2 * 0.05);
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
    c.fillStyle = "#2a1c2c"; c.beginPath(); c.ellipse(366, 174, 70, 5, 0, 0, Math.PI * 2); c.fill();
  }), 0, 0);
  ctx.globalAlpha = 1;
  yield;
  const castle = castleS();
  ctx.drawImage(castle, Math.round(sx(0) * U), Math.round(sy(0) * U));
  // bedding it in: the cobbled threshold running up into the gate, an earth
  // bank over the footing's foot, grass and a little rubble creeping on it
  ctx.drawImage(layer(paintThreshold, 1), 0, 0);
  ctx.drawImage(layer(paintBank), 0, 0);
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
    // (never on the road, where the walkers go)
    for (let k = 0; k < 70; k++) {
      const x = hash(k, 11) * SW, y = 236 + hash(k, 12) * 34;
      if (offRoad(x, y) < 4) continue;
      tuft(c, x, y, 1.1 + hash(k, 13) * 0.8, "#3f6e2e", "#8ac050", k);
    }
    for (let k = 0; k < 18; k++) {
      const x = hash(k, 14) * SW, y = 244 + hash(k, 15) * 24;
      if (offRoad(x, y) < 3) continue;
      flower(c, x, y, ["#f2ead4", "#e8c65a", "#d86a6a"][k % 3], k, 1.2);
    }
  }), 0, 0);
  // birds, heading home
  ctx.fillStyle = "#2a2440";
  for (const [x, y] of [[196, 62], [206, 68], [188, 72], [214, 58]]) {
    ctx.fillRect(x * U - 3, y * U, 3, 1); ctx.fillRect(x * U, y * U - 1, 1, 1); ctx.fillRect(x * U + 1, y * U, 3, 1);
  }
  return cv;
}
