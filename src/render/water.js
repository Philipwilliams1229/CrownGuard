// ============ RENDER: WATER ============
// Still water (ponds, meres, ice, lava) and running water (the rivers), on
// the board and — through drawRiver — in the landscape beyond it (apron.js
// paints rivers running off the board with drawRiver at time 0).
//
// Everything still is painted pixel by pixel ONCE: a river's body (its
// banks, shallows, channel, gravel bars, rocks, logs, snags and rushes) and
// each pond's go into the ground layer through bakeWater(ctx), which world.js
// calls while it paints the ground (after the road). Per frame,
// drawWaterLive(ctx, g) only stamps a few dozen tiny baked marks: the
// current's ripples and glints drifting downstream, foam at the rocks, glints
// on the ponds, lava bubbles.
//
// How a bank reads in the 3/4 camera (sun up-left, looking north):
// - the far (north) bank shows an earth FACE, a sliver in one place and a
//   tall cut in the next, with a dark line under its grass lip, and throws
//   its shadow onto the water below it;
// - the near (south) bank is a mud line, a pebbly lit strip and a broken
//   grass lip catching the light, the water lapping pale against it;
// - banks running up the screen shade by the same rule (the west bank is
//   in shade and shadows the water, the east bank is lit).
// The water's edge is never ruled: a wobble, a slow lean and SPITS (the bank
// jutting into the stream on one side, then the other) make the open water
// snake inside a straight corridor, always inward of rv.w/2 + ~2. Water steps
// shallows → mid → deep → a wandering channel; on black (fen) water the
// steps are set apart harder so all three show. Edges and landmarks are
// keyed to WORLD coordinates, so the board and the apron paint the same
// river across the seam. A pond that runs into a river is painted WITH the
// river, as one water (a smooth union of the two shapes, the river's colours).

import { PONDS, RIVERS } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { W, H, RES, WALL_W, PATH_HALF } from "../data/constants.js";
import { nearestOnPath } from "../engine/path.js";
import { lighten, darken, mix, rgb, hash, PX } from "./paint.js";

const DEFAULT_WATER = { deep: "#3a6a86", edge: "#5590a8", shine: "#a8d8e8" };
const SWAMP_WATER = { deep: "#2c4a3c", edge: "#3d5c44", shine: "#7aa078" };

// ---- noise, dither, light ------------------------------------------------

const LATTICE = new Float32Array(65536);
for (let i = 0; i < 65536; i++) LATTICE[i] = hash(i, 911);
// eased value noise in world units, 0..1
const vn = (x, y, cell, seed) => {
  const fx = x / cell + seed * 17.31, fy = y / cell + seed * 31.7;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = xi & 255, b = (xi + 1) & 255, c = (yi & 255) << 8, e = ((yi + 1) & 255) << 8;
  return (LATTICE[c + a] * (1 - u) + LATTICE[c + b] * u) * (1 - v) + (LATTICE[e + a] * (1 - u) + LATTICE[e + b] * u) * v;
};
// A bank whose outward normal (water → land) is n faces the sun by
// L = LX*nx + LY*ny: its slope runs down toward the water, so it looks the
// way -n points, and the sun stands up and to the left.
const LX = 0.586, LY = 0.81;

const lum = (hex) => { const [r, g, b] = rgb(hex); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const C = (hex, a = 1) => { const [r, g, b] = rgb(hex); return [r, g, b, Math.round(a * 255)]; };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- a raster: an RGBA image in world space at r pixels per unit ---------

const raster = (x0, y0, pw, ph, r) => {
  const img = new ImageData(pw, ph), d = img.data;
  const put = (i, j, c) => {
    if (!c || i < 0 || j < 0 || i >= pw || j >= ph) return;
    const o = (j * pw + i) * 4, a = c[3];
    if (a >= 255 || d[o + 3] === 0) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; return; }
    const sa = a / 255, da = d[o + 3] / 255, oa = sa + da * (1 - sa);
    d[o] = (c[0] * sa + d[o] * da * (1 - sa)) / oa;
    d[o + 1] = (c[1] * sa + d[o + 1] * da * (1 - sa)) / oa;
    d[o + 2] = (c[2] * sa + d[o + 2] * da * (1 - sa)) / oa;
    d[o + 3] = oa * 255;
  };
  const alpha = (i, j) => (i < 0 || j < 0 || i >= pw || j >= ph ? 0 : d[(j * pw + i) * 4 + 3]);
  return { img, d, pw, ph, r, x0, y0, gx: Math.round(x0 * r), gy: Math.round(y0 * r), put, alpha,
    at: (x, y) => [Math.floor((x - x0) * r), Math.floor((y - y0) * r)] };
};
const toCanvas = (R) => {
  const cv = document.createElement("canvas");
  cv.width = R.pw; cv.height = R.ph;
  cv.getContext("2d").putImageData(R.img, 0, 0);
  return cv;
};
// a one-pixel line in raster pixels; col may be a function of t (0 at the start)
const line = (R, x1, y1, x2, y2, col) => {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1) | 0;
  for (let q = 0; q <= n; q++) {
    const t = q / n;
    R.put(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), typeof col === "function" ? col(t) : col);
  }
};
// a lit stone: three tones, the sun on its upper left; `ink` rings its lower
// half, `wet` lays a dark waterline round its foot (raster pixels)
const stonePx = (R, cx, cy, rx, ry, pal, ink, wet) => {
  for (let j = Math.floor(cy - ry - 2); j <= Math.ceil(cy + ry + 2); j++) {
    for (let i = Math.floor(cx - rx - 2); i <= Math.ceil(cx + rx + 2); i++) {
      const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry, q = u * u + v * v;
      if (q > 1) {
        const uo = (i + 0.5 - cx) / (rx + 1), vo = (j + 0.5 - cy) / (ry + 1);
        if (uo * uo + vo * vo <= 1) R.put(i, j, v > -0.35 ? (ink || wet) : null);
        else if (wet && v > 0.2) { const u2 = (i + 0.5 - cx) / (rx + 2), v2 = (j + 0.5 - cy) / (ry + 1.6); if (u2 * u2 + v2 * v2 <= 1) R.put(i, j, wet); }
        continue;
      }
      const lit = -(u * 0.6 + v * 0.8) * 0.75 + (1 - q) * 0.45;
      R.put(i, j, lit > 0.42 ? pal[0] : lit > -0.05 ? pal[1] : pal[2]);
    }
  }
};

// ---- palettes --------------------------------------------------------------

// the ground a bank is cut into, per country (wood: a drowned log or snag,
// lit / mid / dark)
const BANKS = {
  green: { earth: "#8a6844", dark: "#664b33", wet: "#4c3a2c", lit: "#ae8e5c", pebble: "#d4c8a8", peb2: "#a09682", top: "#4a3628", rock: "#a39d90", rush: ["#3f6a30", "#5e8f3c", "#8cbc58"], head: "#6e4a2c", pads: true, wood: ["#a88a64", "#7a5c3e", "#4e3a2a"] },
  iron: { earth: "#72685a", dark: "#544c42", wet: "#3c3632", lit: "#968b76", pebble: "#c2beb2", peb2: "#8e8a80", top: "#38322c", rock: "#8e8c86", rush: ["#3e4a34", "#5a6a48", "#8b976a"], head: "#5a4636", pads: false, wood: ["#968a78", "#6c6052", "#443c34"] },
  fen: { earth: "#4e4232", dark: "#3a3026", wet: "#28221c", lit: "#66583e", pebble: "#9c947e", peb2: "#6e6856", top: "#241e18", rock: "#6c6a60", rush: ["#4a5438", "#6e7448", "#b8ac74"], head: "#5e4030", pads: false, wood: ["#8a8068", "#5c5444", "#36302a"] },
  snow: { earth: "#b8cad8", dark: "#9fb4c6", wet: "#8aa2b6", lit: "#f2f7fa", pebble: "#ffffff", peb2: "#c8d8e4", top: "#7f98ac", rock: "#9aa8b4", rush: ["#5e5440", "#8e7e58", "#cbbd92"], head: "#4e3e30", pads: false, wood: ["#a4968a", "#786c60", "#4c443c"] },
  ash: { earth: "#3a302c", dark: "#2c2422", wet: "#8a3018", lit: "#5c4e48", pebble: "#6e5e56", peb2: "#4a3e3a", top: "#1a1414", rock: "#4a4040", rush: [], head: "#000", pads: false, wood: ["#4a3e38", "#2e2624", "#1a1414"] },
};
const bankKey = () => (REALM.groundArt === "iron" ? "iron" : REALM.groundArt === "fen" || REALM.ambient === "fireflies" ? "fen" : REALM.ambient === "snow" ? "snow" : REALM.ambient === "embers" ? "ash" : "green");
const bankTones = (key) => {
  const B = BANKS[key];
  return {
    ...B,
    c: {
      earth: C(B.earth), dark: C(B.dark), wet: C(B.wet), lit: C(B.lit), pebble: C(B.pebble), peb2: C(B.peb2), top: C(B.top),
      lip: key === "snow" ? C("#ffffff", 0.7) : C("#fff3d2", 0.26), rim: C("#2a1c2c", 0.3), damp: key === "snow" || key === "ash" ? null : C("#2a1c2c", 0.14),
      rock: [C(lighten(B.rock, 0.3)), C(B.rock), C(darken(B.rock, 0.38))],
      pebs: [[C(lighten(B.pebble, 0.2)), C(B.pebble), C(darken(B.pebble, 0.35))], [C(lighten(B.peb2, 0.25)), C(B.peb2), C(darken(B.peb2, 0.4))]],
      ink: C("#241a26", 0.92),
      rush: B.rush.map((c) => C(c)), rushDk: B.rush.length ? C(darken(B.rush[0], 0.3)) : null, head: C(B.head), headLt: C(lighten(B.head, 0.3)),
      wood: B.wood.map((c) => C(c)), grain: C(mix(B.wood[0], "#f0e0b8", 0.45)), mud: [C(lighten(B.lit, 0.12)), C(B.earth), C(B.wet)],
    },
  };
};
// the water's own tones: channel, deep, mid, shallows, shallows over gravel,
// a pebble under the water, the sky in it, foam, the lit lapping edge, the
// dark waterline, a gravel bar's lit and shaded rims, scum — and each again
// in the bank's shadow. On black (fen) water the steps are set apart
// harder, and the shallows lean to peat-brown, so three tones still show.
const T_CHAN = 0, T_DEEP = 1, T_MID = 2, T_SHAL = 3, T_BED = 4, T_PEB = 5, T_REFL = 6, T_FOAM = 7, T_LAP = 8, T_LINE = 9, T_BEDLT = 10, T_BEDDK = 11, T_SCUM = 12, T_SCUMLT = 13;
const waterTones = (wa, B) => {
  const dark = lum(wa.deep) < 0.2;
  const mid = mix(wa.deep, wa.edge, dark ? 0.75 : 0.5);
  const shal = dark ? mix(wa.edge, mix(B.lit, wa.shine, 0.5), 0.3) : wa.edge;
  const bed = mix(shal, B.lit, dark ? 0.36 : 0.26);
  const list = [
    dark ? mix(wa.deep, "#0a120e", 0.42) : darken(wa.deep, 0.14), wa.deep, mid, shal,
    bed, mix(B.pebble, wa.edge, 0.38),
    dark ? mix(mid, "#b4bcb6", 0.3) : mix(mid, wa.shine, 0.3), lighten(wa.shine, 0.42), mix(shal, wa.shine, 0.42), darken(wa.edge, 0.42),
    mix(bed, lighten(B.pebble, 0.15), 0.42), mix(bed, wa.deep, 0.5),
    mix(shal, "#5a7040", 0.32), mix(shal, "#8a9a58", 0.5),
  ];
  const wet = (c, k) => mix(c, wa.edge, k);
  return {
    dark,
    T: list.map((c) => C(c)),
    S: list.map((c, i) => C(i === T_FOAM ? mix(wa.edge, wa.shine, 0.3) : darken(c, 0.3))),
    // stones seen through a little water: the water's colour in them
    pebs: [B.pebble, B.peb2].map((c) => [C(wet(lighten(c, 0.15), 0.3)), C(wet(c, 0.4)), C(wet(darken(c, 0.4), 0.45))]),
  };
};

// ---- one pixel of bank ------------------------------------------------------
// g: how far outside the water's edge (world units, >= 0); n: outward normal;
// cap: the most earth the bank may show (a river's bank budget); spit: a
// spit or point bar here (0..1), whose muddy foot runs wider.
const bankPx = (B, g, nx, ny, x, y, gi, gj, s, r, cap = 9, spit = 0, n21 = -1, n7 = -1) => {
  const L = LX * nx + LY * ny, V = ny < 0 ? -ny : 0, face = V > 0.35;
  const n5 = vn(x, y, 5.5, s + 2);
  let eW;
  // the far bank's earth face: a sliver in one place, a tall cut in the next
  if (face) eW = 0.7 + V * 3.6 * clamp01((n21 < 0 ? vn(x, y, 21, s + 17) : n21) * 1.7 - 0.3) + (n5 - 0.5) * 1.2;
  // the lit strip comes and goes in pieces
  else if (L > 0.1) eW = 0.6 + (n7 < 0 ? vn(x, y, 7, s + 19) : n7) * 2.3 + (n5 - 0.5) * 0.8;
  else eW = 1.2 + (n5 - 0.5) * 1.4;
  eW += spit * 1.6;
  eW = eW > cap ? cap : eW < 0.5 ? 0.5 : eW;
  const px = 1 / r;
  if (g < eW) {
    const speck = hash(gi * 3 + 1, gj * 5 + 2) > 0.87;
    const foot = Math.max(px, (face ? eW * 0.3 : 0) + spit * 1.4);
    if (face) {
      if (g > eW - px) return B.c.top;                   // the shadow under the grass lip
      if (g < foot) return speck ? B.c.peb2 : B.c.wet;   // wet at the foot
      return speck ? B.c.peb2 : B.c.earth;
    }
    if (g < foot) return speck && g > px ? B.c.peb2 : B.c.wet;
    if (L > 0.1) return speck ? B.c.pebble : B.c.lit;
    return speck ? B.c.peb2 : L < -0.25 ? B.c.dark : B.c.earth;
  }
  if (g < eW + Math.max(0.5, px)) {
    if (face || L > 0.1) return vn(x, y, 6, s + 18) > 0.3 ? B.c.lip : null;   // the grass lip catching the sun, broken
    return L < -0.3 ? B.c.rim : null;
  }
  // a little damp, shaded turf back from a shaded bank, gathered in drifts
  if ((face || L < -0.2) && B.c.damp && g < eW + 2.5) {
    const k = 1 - (g - eW) / 2.5;
    if (vn(x, y, 1.7, s + 35) < 0.5 * k + 0.05 && vn(x, y, 9, s + 3) > 0.52) return B.c.damp;
  }
  return null;
};

// ---- rivers -------------------------------------------------------------------

const REACH = 9.5;  // how far past a river's half-width its bank field runs
const PAD = 16;     // room round the water for rushes standing up out of it
const LM = 56;      // one landmark (a rock, a log, a snag, a reed bed) per patch this big

// The field: for every pixel near a river, how far past the water's
// (unwobbled) edge it stands and which stretch of river is nearest. Rivers
// merge by a SMOOTH union, so where one runs into another the inner corners
// round off like a real confluence: `A` holds the rivers painted before,
// `B` the one being painted, and the two are blended at shading time.
const MERGE = 12;
// Each segment's half-width at its two ends. A river of one width has them
// equal; one with a width per point (terrain.js `ws`) carries them on its
// segments — or, for a copy made elsewhere (the apron's longer river), as
// `ws` alongside its points, matched to its segments here.
const HALFS = new WeakMap();
const segHalfs = (rv) => {
  let H2 = HALFS.get(rv);
  if (H2 && H2.n === rv.segs.length) return H2;
  const n = rv.segs.length, a = new Float64Array(n), b = new Float64Array(n);
  // (a copy that carries neither — the apron's river, run on past the board
  // from the board's own points — borrows the board river's widths: its
  // first width before them, its last after)
  let ws = rv.ws;
  if (!ws && !(n && rv.segs[0].hw1 !== undefined)) {
    for (const src of RIVERS) {
      if (!src.ws || src === rv) continue;
      const off = rv.pts.indexOf(src.pts[0]);
      if (off < 0) continue;
      ws = rv.pts.map((_, i) => src.ws[Math.max(0, Math.min(src.ws.length - 1, i - off))]);
      break;
    }
  }
  if (n && rv.segs[0].hw1 !== undefined) rv.segs.forEach((sg, q) => { a[q] = sg.hw1; b[q] = sg.hw2; });
  else if (ws && ws.length === rv.pts.length) {
    let i = 0;
    rv.segs.forEach((sg, q) => {
      const P = rv.pts;
      while (i < P.length - 1 && !(P[i][0] === sg.x1 && P[i][1] === sg.y1 && P[i + 1][0] === sg.x2 && P[i + 1][1] === sg.y2)) i++;
      if (i < P.length - 1) { a[q] = ws[i] / 2; b[q] = ws[i + 1] / 2; i++; } else { a[q] = b[q] = rv.w / 2; i = 0; }
    });
  } else a.fill(rv.w / 2), b.fill(rv.w / 2);
  H2 = { n, a, b };
  HALFS.set(rv, H2);
  return H2;
};
// past one segment's (unwobbled) edge; on a flaring segment the distance is
// squared up to the tapered side's own normal (a river of one width takes
// the plain sum, to the bit)
// how far round each segment the field must be worked: its river's
// half-width plus `extra` — on a river of changing width, the wider of it
// and its neighbours' (each pixel takes the width at the nearest point of
// the line, and at a joint the two segments share one width, so the
// nearest segment of any pixel near the water is always among those worked,
// and a narrow reach above an estuary still scans only its own few px)
const segReach = (rv, HS, extra) => {
  const n = HS.n, out = new Float64Array(n);
  let vary = false;
  for (let q = 0; q < n; q++) if (HS.a[q] !== HS.b[q] || HS.a[q] !== HS.a[0]) vary = true;
  if (!vary) return out.fill(rv.w / 2 + extra);
  for (let q = 0; q < n; q++) {
    let m = Math.max(HS.a[q], HS.b[q]);
    if (q > 0) m = Math.max(m, HS.a[q - 1]);
    if (q < n - 1) m = Math.max(m, HS.b[q + 1]);
    out[q] = m + extra;
  }
  return out;
};
const segF = (d, t, hw, dh, ck) => (dh === 0 ? d - hw : t > 0 && t < 1 ? (d - (hw + dh * t)) * ck : d - (hw + dh * t));
const smin = (a, b) => { const h = Math.max(MERGE - Math.abs(a - b), 0) / MERGE; return Math.min(a, b) - h * h * MERGE * 0.25; };
const riverField = (R, rivers) => {
  const { pw, ph, r, x0, y0 } = R, N = pw * ph;
  const FA = new Float32Array(N).fill(99), FB = new Float32Array(N).fill(99), FD = new Float32Array(N);
  const SA = new Uint16Array(N), SB = new Uint16Array(N), RIV = new Uint8Array(N);
  const LO = new Int32Array(ph).fill(pw), HI = new Int32Array(ph).fill(-1);   // each row's reach
  const segs = [];
  rivers.forEach((rv, ri) => {
    const HS = segHalfs(rv), RCH = segReach(rv, HS, REACH + (rivers.length > 1 ? MERGE * 0.5 : 0));
    // (a river of changing width takes, per pixel, the width at the NEAREST
    // point of its line — so a wide stretch's round end never bulges back
    // over a narrow one; a river of one width is the same either way)
    let vary = false;
    for (let q = 0; q < HS.n; q++) if (HS.a[q] !== HS.b[q] || HS.a[q] !== HS.a[0]) vary = true;
    // the distance down the river, counted from where it first comes onto
    // the board, so the apron's longer copy of the river agrees with it
    let cum = 0, anchor = null;
    for (const s of rv.segs) { if (anchor === null && s.x1 >= 0 && s.y1 >= 0 && s.x1 <= W && s.y1 <= H) anchor = cum; cum += s.len; }
    cum = -(anchor || 0);
    rv.segs.forEach((s, q) => {
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1, sid = segs.length, reach = RCH[q];
      const hw = HS.a[q], dh = HS.b[q] - HS.a[q], ck = 1 / Math.sqrt(1 + (dh / s.len) ** 2);
      segs.push({ x1: s.x1, y1: s.y1, vx, vy, L2: s.len * s.len, tx: vx / s.len, ty: vy / s.len, hw, dh, ck, cum, len: s.len, ri });
      cum += s.len;
      const j0 = Math.max(0, Math.floor((Math.min(s.y1, s.y2) - reach - y0) * r));
      const j1 = Math.min(ph - 1, Math.ceil((Math.max(s.y1, s.y2) + reach - y0) * r));
      const L2 = s.len * s.len, rr = reach * reach, flat = Math.abs(vy) < 1e-6;
      for (let j = j0; j <= j1; j++) {
        const y = y0 + (j + 0.5) / r;
        // only the stretch of this row the segment can reach
        let ta = 0, tb = 1;
        if (!flat) {
          ta = (y - reach - s.y1) / vy; tb = (y + reach - s.y1) / vy;
          if (ta > tb) { const q = ta; ta = tb; tb = q; }
          ta = ta < 0 ? 0 : ta; tb = tb > 1 ? 1 : tb;
          if (ta > tb) continue;
        }
        const xa = s.x1 + vx * ta, xb = s.x1 + vx * tb;
        const i0 = Math.max(0, Math.floor((Math.min(xa, xb) - reach - x0) * r));
        const i1 = Math.min(pw - 1, Math.ceil((Math.max(xa, xb) + reach - x0) * r));
        const row = j * pw;
        if (i0 < LO[j]) LO[j] = i0;
        if (i1 > HI[j]) HI[j] = i1;
        for (let i = i0; i <= i1; i++) {
          const x = x0 + (i + 0.5) / r;
          let t = ((x - s.x1) * vx + (y - s.y1) * vy) / L2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - (s.x1 + vx * t), dy = y - (s.y1 + vy * t), d2 = dx * dx + dy * dy;
          if (d2 > rr) continue;
          const d = Math.sqrt(d2), f = segF(d, t, hw, dh, ck), k = row + i;
          if (RIV[k] !== ri + 1) {
            // this river's first touch here: fold what came before into A
            if (FB[k] < 99) { const a = FA[k], b = FB[k]; FA[k] = smin(a, b); if (b < a) SA[k] = SB[k]; }
            FB[k] = f; SB[k] = sid; RIV[k] = ri + 1; FD[k] = d;
          } else if (vary ? d < FD[k] : f < FB[k]) { FB[k] = f; SB[k] = sid; FD[k] = d; }
        }
      }
    });
  });
  return { FA, FB, SA, SB, segs, LO, HI };
};
// where a pixel stands relative to one stretch of river: the outward normal,
// its place across the stream (signed) and how far down the river it is
const GEO = { nx: 0, ny: 0, lat: 0, u: 0, hw: 0 };
const geo = (sg, x, y) => {
  let t = ((x - sg.x1) * sg.vx + (y - sg.y1) * sg.vy) / sg.L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = x - (sg.x1 + sg.vx * t), dy = y - (sg.y1 + sg.vy * t), d = Math.sqrt(dx * dx + dy * dy);
  if (d > 1e-4) { GEO.nx = dx / d; GEO.ny = dy / d; } else { GEO.nx = -sg.ty; GEO.ny = sg.tx; }
  GEO.lat = sg.tx * dy - sg.ty * dx > 0 ? d : -d;
  GEO.u = sg.cum + t * sg.len;
  GEO.hw = sg.dh === 0 ? sg.hw : sg.hw + sg.dh * t;
  return GEO;
};
// how far a point stands past the water's (unwobbled) edge, over all rivers
const pastEdge = (rivers, x, y) => {
  let best = 99;
  for (const rv of rivers) {
    const HS = segHalfs(rv);
    // (by the nearest point of its line, as riverField)
    let bd = Infinity, bf = 99, vary = false;
    for (let q = 0; q < HS.n; q++) if (HS.a[q] !== HS.b[q] || HS.a[q] !== HS.a[0]) vary = true;
    for (let q = 0; q < rv.segs.length; q++) {
      const s = rv.segs[q], vx = s.x2 - s.x1, vy = s.y2 - s.y1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
      const dh = HS.b[q] - HS.a[q], d = Math.hypot(x - s.x1 - vx * t, y - s.y1 - vy * t);
      const f = segF(d, t, HS.a[q], dh, dh === 0 ? 1 : 1 / Math.sqrt(1 + (dh / s.len) ** 2));
      if (vary ? d < bd : f < bf) { bd = d; bf = f; }
    }
    if (bf < best) best = bf;
  }
  return best;
};

// The water's edge. edgeOff says how far the bank stands in over the water
// at (x, y) (world units; below 0 it stands back past rv.w/2). It is built of
//  - a wobble (lumps and a pixel's jitter), larger on the lit bank, inward;
//  - a slow lean, so no reach runs ruler-straight;
//  - SPITS and point bars: the bank jutting 3-5 units into the stream on one
//    side, then the other, every 50-100 units, so the open water snakes
//    inside a straight corridor.
// Outward it is held to about 2 (halls stand 14 off), and the earth face on
// top of it is capped so the whole bank keeps within about 5 of rv.w/2.
// (The octaves are kept in N42/N13/SPIT for the shading to reuse.)
// The slow octaves (cells 42, 90, 52: swell, lean, spits) come in ready
// made — riverBody keeps them on a coarse grid — as n42, n90, n52.
let N42 = 0, N13 = 0, SPIT = 0;
const spitK = (n52, side) => {
  const k = (n52 - 0.5) * side - 0.05;
  if (k <= 0) return 0;
  const v = k > 0.2 ? 1 : k * 5;
  return v * v * (3 - 2 * v);
};
const spitAt = (x, y, side, s) => spitK(vn(x, y, 52, s + 15), side);
const edgeOff = (n42, n90, n52, n13, lat, hw, L) => {
  N42 = n42; N13 = n13;
  const side = lat > 0 ? 1 : -1;
  let e = (N42 - 0.5) * 2.0 + (N13 - 0.5) * 2.2 + 0.75;
  if (L > 0 && N13 > 0.35) e += (N13 - 0.35) * (N13 - 0.35) * 6.8 * L;
  e -= (n90 - 0.5) * 3.4 * side;
  SPIT = spitK(n52, side);
  e += SPIT * Math.min(5.5, hw * 0.34);
  // (held back smoothly, never with a corner)
  if (e < -0.5) e = -0.5 - 1.6 * (1 - Math.exp((e + 0.5) / 1.6));
  return e > hw * 0.55 ? hw * 0.55 : e;
};
// true when (x, y) lies in one of these ponds' water: a river's bank never
// cuts into it
const inPondWater = (shapes, x, y) => {
  for (const P of shapes) {
    if (Math.abs(x - P.x) > P.rx + 8 || Math.abs(y - P.y) > P.ry + 8) continue;
    if (pondG(P, x, y) < 0) return true;
  }
  return false;
};
// a pond whose shore runs into a river: the two are painted as one water
const touchesRiver = (P, rivers) => {
  for (let q = 0; q < 48; q++) {
    const a = (q / 48) * Math.PI * 2, ca = Math.cos(a);
    if (pastEdge(rivers, P.x + ca * (ca > 0 ? P.rxE : P.rx), P.y + Math.sin(a) * P.ry) < 3) return true;
  }
  return false;
};

// which of these rivers end out in pond P's water (by either end)
const riversEndingIn = (P, rivers) => {
  const out = new Set();
  rivers.forEach((rv, ri) => {
    const a = rv.pts[0], b = rv.pts[rv.pts.length - 1];
    if (pondG(P, a[0], a[1]) < 2 || pondG(P, b[0], b[1]) < 2) out.add(ri);
  });
  return out;
};

// A clump of rushes at (x, y) in world units: tapered blades, darker at the
// root, some with a velvet head (the fen's are straw-pale and headless).
const rushPx = (R, B, x, y, sc, seed) => {
  if (!B.c.rush.length) return;
  const [bi, bj] = R.at(x, y), r = R.r;
  const n = 5 + Math.floor(hash(seed, 1) * 4), fen = !B.pads && B.rush[2] === "#b8ac74";
  // their feet in a darker patch of water and mud
  for (let q = -Math.round(3.5 * r * sc); q <= Math.round(3.5 * r * sc); q++) R.put(bi + q, bj + 1, B.c.rushDk);
  for (let b = 0; b < n; b++) {
    const off = (b - (n - 1) / 2) / n;
    const bx = bi + Math.round(off * 7 * r * sc + (hash(seed, b + 2) - 0.5) * r);
    const hh = (6 + hash(seed, b + 10) * 6) * r * sc * (1 - Math.abs(off) * 0.7);
    const lean = Math.round((hash(seed, b + 20) - 0.5) * 2.5 * r + off * 4 * r);
    const tip = hash(seed, b + 30) < 0.5 ? B.c.rush[2] : B.c.rush[1];
    line(R, bx, bj, bx + lean, Math.round(bj - hh), (t) => (t < 0.3 ? B.c.rush[0] : t < 0.72 ? B.c.rush[1] : tip));
    // a second pixel of width at the root, on the shaded side
    line(R, bx + 1, bj, bx + 1 + Math.round(lean * 0.45), Math.round(bj - hh * 0.45), B.c.rushDk);
    if (!fen && b % 3 === 1 && hh > 7 * r) {
      const hx = bx + Math.round(lean * 0.8), hy = Math.round(bj - hh * 0.8);
      for (let q = 0; q < Math.round(2.6 * r); q++) { R.put(hx, hy + q, B.c.headLt); R.put(hx + 1, hy + q, B.c.head); }
    }
  }
};

// A half-sunk log: its broken root end on the bank at (x, y), lying out into
// the stream along (ax, ay), its far end gone under. `wet(i, j)` says which
// raster pixels are water.
const logPx = (R, B, WT, x, y, ax, ay, len, seed, wet) => {
  const r = R.r, th = 1.25 + hash(seed, 1) * 0.45, ring = 1 / r;
  let cx = -ay, cy = ax;
  if (cy > 0) { cx = -cx; cy = -cy; }   // c points up the screen: the lit top of the log
  const sink = len * (0.58 + hash(seed, 2) * 0.16);
  const ex = x + ax * len, ey = y + ay * len, Wd = B.c.wood;
  const [i0, j0] = R.at(Math.min(x, ex) - th - 2, Math.min(y, ey) - th - 2);
  const [i1, j1] = R.at(Math.max(x, ex) + th + 2, Math.max(y, ey) + th + 2);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const X = R.x0 + (i + 0.5) / r, Y = R.y0 + (j + 0.5) / r;
    const a = (X - x) * ax + (Y - y) * ay, b = (X - x) * cx + (Y - y) * cy;
    const rad = th * (1 - 0.2 * clamp01(a / len));
    const da = a < 0 ? a : a > len ? a - len : 0, d = Math.hypot(da, b) - rad;
    if (d >= ring) continue;
    if (a > sink) {
      // under the water: its shape dim through it, a pale lap where it goes under
      if (d < 0 && wet(i, j)) R.put(i, j, a < sink + ring * 1.5 ? WT.T[T_LAP] : d < -rad * 0.35 ? WT.S[T_MID] : WT.S[T_DEEP]);
      continue;
    }
    if (d >= 0) { if (b < rad * 0.45) R.put(i, j, B.c.ink); continue; }   // inked, but not along its lit top
    let c = b > rad * 0.3 ? Wd[0] : b < -rad * 0.35 ? Wd[2] : Wd[1];
    // the bark's grooves, running along it
    if (c !== Wd[2] && hash(Math.round(b * r * 1.5) + 7, Math.floor(a * 0.8) + seed) > 0.78) c = c === Wd[0] ? Wd[1] : Wd[2];
    // the broken root end: pale split wood
    if (a < rad * 0.6 && b > -rad * 0.5) c = a < rad * 0.3 ? B.c.grain : Wd[0];
    R.put(i, j, c);
  }
  // the water lapping along its shaded underside
  const off = th + 1.2 * ring;
  for (let a = 1; a < sink; a += ring) {
    const [i, j] = R.at(x + ax * a - cx * off, y + ay * a - cy * off);
    if (wet(i, j) && hash(seed + i, j) > 0.3) R.put(i, j, WT.T[T_LAP]);
  }
  // a snapped branch stub standing up off it
  if (hash(seed, 3) < 0.7) {
    const a0 = len * (0.22 + hash(seed, 4) * 0.2), sx = x + ax * a0 + cx * th * 0.8, sy = y + ay * a0 + cy * th * 0.8;
    const l = 2.2 + hash(seed, 5) * 1.8, dx = cx * 0.8 + ax * 0.6, dy = cy * 0.8 + ay * 0.6;
    const [p0, q0] = R.at(sx, sy), [p1, q1] = R.at(sx + dx * l, sy + dy * l);
    line(R, p0 + 1, q0 + 1, p1 + 1, q1 + 1, B.c.ink);
    line(R, p0, q0, p1, q1, (t) => (t > 0.6 ? Wd[0] : Wd[1]));
  }
};

// A drowned snag: a dead stump standing out of the water, broken off, one
// forked bare branch; its broken reflection under it and a ripple at its foot.
const snagPx = (R, B, WT, x, y, seed, wet, sc = 1) => {
  const r = R.r * sc, [ci, cj] = R.at(x, y), Wd = B.c.wood, ink = B.c.ink;
  const hwP = Math.round((1.0 + hash(seed, 1) * 0.6) * r), hP = Math.round((3.5 + hash(seed, 2) * 3) * r);
  for (let q = 1; q <= Math.round(hP * 0.7); q++) {
    if (hash(seed + q, 7) > 0.7) continue;
    const w = Math.round(hwP * (1 - q / (hP * 0.9)));
    for (let i = -w; i <= w; i++) if (wet(ci + i, cj + q)) R.put(ci + i, cj + q, WT.S[T_DEEP]);
  }
  const rx = hwP + Math.round(0.9 * r), ry = Math.max(1, Math.round(0.6 * r));
  for (let a = 0; a < 28; a++) {
    const an = (a / 28) * Math.PI * 2, i = Math.round(ci + Math.cos(an) * rx), j = Math.round(cj + Math.sin(an) * ry);
    if (wet(i, j) && hash(seed, a + 20) > 0.25) R.put(i, j, Math.sin(an) > 0 ? WT.T[T_LAP] : WT.T[T_LINE]);
  }
  // the trunk, tapering up to a jagged break; lit on its left, wet at the foot
  for (let q = 0; q <= hP; q++) {
    const w = hwP - Math.floor((q / hP) * hwP * 0.45);
    for (let i = -w; i <= w; i++) {
      const top = hP - Math.round(hash(seed, i + 40) * 1.6 * r);
      if (q > top) continue;
      const u = i / w;
      let c = u < -0.3 ? Wd[0] : u > 0.4 ? Wd[2] : Wd[1];
      if (q < Math.round(0.8 * r)) c = Wd[2];
      else if (hash(i + 3, q + seed) > 0.86) c = c === Wd[0] ? Wd[1] : Wd[2];   // splits in the grain
      R.put(ci + i, cj - q, c);
      if (q === top || q === hP) R.put(ci + i, cj - q - 1, ink);
    }
    R.put(ci - w - 1, cj - q, ink); R.put(ci + w + 1, cj - q, ink);
  }
  const side = hash(seed, 3) < 0.5 ? -1 : 1, bl = (2.5 + hash(seed, 4) * 2.5) * r;
  const bx = ci + side * (hwP + 1), by = cj - Math.round(hP * (0.55 + hash(seed, 5) * 0.25));
  const ex = Math.round(bx + side * bl * 0.8), ey = Math.round(by - bl * 0.7);
  line(R, bx, by + 1, ex, ey + 1, ink);
  line(R, bx, by, ex, ey, Wd[1]);
  const mx = Math.round(bx + side * bl * 0.45), my = Math.round(by - bl * 0.38);
  line(R, mx + 1, my, Math.round(mx + side * bl * 0.1) + 1, Math.round(my - bl * 0.45), ink);
  line(R, mx, my, Math.round(mx + side * bl * 0.1), Math.round(my - bl * 0.45), side < 0 ? Wd[0] : Wd[1]);
};

// A reed island out in a mere: a low hummock of mud, lit on its upper left,
// the water lapping round it, a clump or two of rushes on it.
const islandPx = (R, B, WT, x, y, seed, wet) => {
  const r = R.r, [ci, cj] = R.at(x, y), rx = (3.5 + hash(seed, 1) * 2.5) * r, ry = rx * 0.45;
  for (let a = 0; a < 40; a++) {
    const an = (a / 40) * Math.PI * 2, i = Math.round(ci + Math.cos(an) * (rx + r * 0.8)), j = Math.round(cj + Math.sin(an) * (ry + r * 0.6));
    if (wet(i, j) && hash(seed, a + 50) > 0.3) R.put(i, j, Math.sin(an) > 0 ? WT.T[T_LAP] : WT.T[T_LINE]);
  }
  stonePx(R, ci, cj, rx, ry, B.c.mud, null, null);
  rushPx(R, B, x - (rx / r) * 0.3, y + 0.2, 0.9, seed * 3 + 1);
  if (hash(seed, 2) < 0.7) rushPx(R, B, x + (rx / r) * 0.35, y + 0.5, 0.72, seed * 3 + 2);
};

// Paint every river in `rivers` over the view [x0, y0, x1, y1] (world units)
// at r pixels per unit, with any pond it runs into. Returns the baked body
// and where the rocks stand.
const riverBody = (rivers, wa, view, r) => {
  if (!rivers.length) return null;
  const key = bankKey(), fen = key === "fen";
  const B = bankTones(key), WT = waterTones(wa || DEFAULT_WATER, B), dark = WT.dark;
  const s = ((REALM.seed | 0) % 97 + 97) % 97;
  // a pond the river runs into is painted here, with it, as one water
  const shapes = PONDS.map(pondShape);
  const JP = shapes.filter((P) => P.kind !== "lava" && P.kind !== "ice" && touchesRiver(P, rivers));
  const loose = shapes.filter((P) => !JP.includes(P));
  JP.forEach(pondPrep);
  // a river that ends out in a pond's water gives way to the pond a little
  // inside its shore: its channel, current and bank dressing stop there
  JP.forEach((P) => { P.ends = riversEndingIn(P, rivers); });
  const endPonds = JP.filter((P) => P.ends.size);
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const rv of rivers) for (const [x, y] of rv.pts) {
    const m = rv.w / 2 + PAD;
    bx0 = Math.min(bx0, x - m); by0 = Math.min(by0, y - m); bx1 = Math.max(bx1, x + m); by1 = Math.max(by1, y + m);
  }
  for (const P of JP) {
    bx0 = Math.min(bx0, P.x - P.rx - 12); by0 = Math.min(by0, P.y - P.ry - 12);
    bx1 = Math.max(bx1, P.x + P.rx + 12); by1 = Math.max(by1, P.y + P.ry + 12);
  }
  const x0 = Math.floor(Math.max(bx0, view[0]) * r) / r, y0 = Math.floor(Math.max(by0, view[1]) * r) / r;
  const x1 = Math.ceil(Math.min(bx1, view[2]) * r) / r, y1 = Math.ceil(Math.min(by1, view[3]) * r) / r;
  const pw = Math.round((x1 - x0) * r), ph = Math.round((y1 - y0) * r);
  if (pw < 2 || ph < 2) return null;
  const R = raster(x0, y0, pw, ph, r);
  const { FA, FB, SA, SB, segs, LO, HI } = riverField(R, rivers);
  const T = WT.T, S = WT.S, pebbles = [], D = R.d, px1 = 1 / r;
  // the water's tone per pixel first (+1, and +32 in the bank's shadow), so
  // a second pass can give the gravel bars their lit and shaded rims
  const TB = new Uint8Array(pw * ph);
  // the slow noises (swell, lean, spits, gravel bars, the face's height) on
  // a grid one unit apart, filled as they're wanted and read bilinearly:
  // they change too slowly for it to show, and the bake runs twice as fast
  const cw = Math.ceil(pw / r) + 3, chh = Math.ceil(ph / r) + 3;
  const NV = 7, SV = new Float32Array(cw * chh * NV);
  const rowSpan = (j) => {
    const y = y0 + (j + 0.5) / r;
    let lo = LO[j], hi = HI[j];
    for (const P of JP) if (y > P.y - P.ry - 12 && y < P.y + P.ry + 12) { lo = Math.min(lo, Math.floor((P.x - P.rx - 12 - x0) * r)); hi = Math.max(hi, Math.ceil((P.x + P.rx + 12 - x0) * r)); }
    return [Math.max(0, lo), Math.min(pw - 1, hi)];
  };
  const SD = new Uint8Array(cw * chh);
  const fill = (c) => {
    SD[c] = 1;
    const o = c * NV, X = x0 + (c % cw), Y = y0 + ((c / cw) | 0);
    SV[o] = vn(X, Y, 42, s + 11); SV[o + 1] = vn(X, Y, 90, s + 13); SV[o + 2] = vn(X, Y, 52, s + 15);
    SV[o + 3] = vn(X, Y, 30, s + 5); SV[o + 4] = vn(X, Y, 21, s + 17); SV[o + 5] = vn(X, Y, 13, s); SV[o + 6] = vn(X, Y, 7, s + 19);
  };
  for (let j = 0; j < ph; j++) {
    const y = y0 + (j + 0.5) / r, gj = R.gy + j;
    const rowJP = JP.length ? JP.filter((P) => y > P.y - P.ry - 12 && y < P.y + P.ry + 12) : JP;
    const [lo, hi] = rowSpan(j);
    for (let i = lo; i <= hi; i++) {
      const k = j * pw + i, fa = FA[k], fb = FB[k], f = fa < 99 ? smin(fa, fb) : fb;
      const x = x0 + (i + 0.5) / r;
      let P = null, gp = 99, pnx = 0, pny = 1, pNP = 0.5;
      for (const Q of rowJP) {
        if (x < Q.x - Q.rx - 12 || x > Q.x + Q.rx + 12) continue;
        const v = pondG(Q, x, y);
        if (v < REACH && v < gp) { gp = v; P = Q; pnx = ELL.nx; pny = ELL.ny; pNP = NP; }
      }
      if (f >= REACH && !P) continue;
      const gi = R.gx + i;
      let nx = 0, ny = 1, lat = 0, u = 0, hw = 10, e = 0, g = 99, rivI = -1;
      const gx = x - x0, gy = y - y0, ia = gx | 0, ja = gy | 0, fx = gx - ia, fy = gy - ja;
      const c00 = ja * cw + ia;
      if (!SD[c00]) fill(c00);
      if (!SD[c00 + 1]) fill(c00 + 1);
      if (!SD[c00 + cw]) fill(c00 + cw);
      if (!SD[c00 + cw + 1]) fill(c00 + cw + 1);
      const o00 = c00 * NV, o10 = o00 + NV, o01 = o00 + cw * NV, o11 = o01 + NV;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      const n42 = SV[o00] * w00 + SV[o10] * w10 + SV[o01] * w01 + SV[o11] * w11;
      const n90 = SV[o00 + 1] * w00 + SV[o10 + 1] * w10 + SV[o01 + 1] * w01 + SV[o11 + 1] * w11;
      const n52 = SV[o00 + 2] * w00 + SV[o10 + 2] * w10 + SV[o01 + 2] * w01 + SV[o11 + 2] * w11;
      const n13 = SV[o00 + 5] * w00 + SV[o10 + 5] * w10 + SV[o01 + 5] * w01 + SV[o11 + 5] * w11;
      if (fb < 99) {
        ({ nx, ny, lat, u, hw } = geo(segs[SB[k]], x, y));
        rivI = segs[SB[k]].ri;
        if (fa < 99 && Math.abs(fa - fb) < MERGE) {
          // in a confluence: turn the normal between the two rivers' own
          const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (fb - fa) / MERGE));
          const bx = nx, by = ny, bl = lat, bu = u, bh = hw;
          const A = geo(segs[SA[k]], x, y);
          nx = A.nx * h + bx * (1 - h); ny = A.ny * h + by * (1 - h);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l; ny /= l;
          if (h < 0.5) { lat = bl; u = bu; hw = bh; } else { lat = A.lat; u = A.u; hw = A.hw; rivI = segs[SA[k]].ri; }
        } else if (fa < fb) { ({ nx, ny, lat, u, hw } = geo(segs[SA[k]], x, y)); rivI = segs[SA[k]].ri; }
        e = edgeOff(n42, n90, n52, n13, lat, hw, LX * nx + LY * ny);
        g = f + e;
      }
      const gr = g;
      let pwt = 0;
      if (P) {
        // the pond's shore and the river's bank meet in a smooth curve
        if (g < 99) {
          pwt = clamp01(0.5 + 0.5 * (g - gp) / MERGE);
          g = smin(g, gp);
          nx = pnx * pwt + nx * (1 - pwt); ny = pny * pwt + ny * (1 - pwt);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l; ny /= l;
        } else { pwt = 1; g = gp; nx = pnx; ny = pny; }
      }
      if (g >= 0) {
        if (g < REACH && (P || !loose.length || !inPondWater(loose, x, y))) {
          const n21 = SV[o00 + 4] * w00 + SV[o10 + 4] * w10 + SV[o01 + 4] * w01 + SV[o11 + 4] * w11;
          const n7 = SV[o00 + 6] * w00 + SV[o10 + 6] * w10 + SV[o01 + 6] * w01 + SV[o11 + 6] * w11;
          const c = bankPx(B, g, nx, ny, x, y, gi, gj, s, r, 5 + (e < 0 ? e : 0) + pwt * 4, SPIT * (1 - pwt), n21, n7);
          if (c) { if (c[3] === 255) { const o = k * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; } else R.put(i, j, c); }
        }
        continue;
      }
      const dp = -g, L = LX * nx + LY * ny, V = ny < 0 ? -ny : 0;
      let t, shade;
      if (P && (gp + (vn(x, y, 6, s + 33) - 0.5) * 6 < gr || P.ends.size && P.ends.has(rivI) && gp < -1.5 + (vn(x, y, 3, s + 36) - 0.5) * 2.5)) {
        // the pond's own water (its bands, its glare, its scum)
        shade = dp < (L < 0 ? -L : 0) * 3.2 + V * 0.7 + (pNP - 0.5) * 1.6;
        t = pondTone(P, x, y, dp, -ellField(P, x, y).f, L, shade, gi, gj, r);
        if (t === T_BED && dp > 1 && hash(gi * 5 + 1, gj * 3 + 2) > 0.982) pebbles.push(i, j);
      } else {
        // the bank on the sun's side throws its shadow onto the water
        shade = dp < (L < 0 ? -L : 0) * 3.0 + V * 0.6 + (N13 - 0.5) * 1.4;
        // gravel bars, mostly along the lit bank: each its own width, so it
        // tapers to a point at both ends
        const n30 = SV[o00 + 3] * w00 + SV[o10 + 3] * w10 + SV[o01 + 3] * w01 + SV[o11 + 3] * w11;
        const bars = clamp01((n30 - 0.5) * 4) * (L > 0 ? 1 : 0.3);
        let bw = bars > 0.06 ? 0.3 + bars * 4.4 : 0;
        let sh = Math.max(2.0 + (N42 - 0.5) * 1.6 + SPIT * 1.4, bw + 0.8), mw = dark ? 3.4 : 2.4;
        // wide water (an estuary, a broad reach: half-width past 30) shelves
        // gently: its gravel bars, shallows and middle water run wider in
        // proportion, in slow drifts, so it never reads as one deep slab
        const wd = hw > 30 ? hw - 30 : 0;
        if (wd > 0) {
          const k = 0.55 + vn(x, y, 34, s + 37) * 0.9;
          if (bw > 0) bw *= 1 + wd * 0.025 * k;
          sh = Math.max(sh + wd * 0.1 * k, bw + 0.8);
          mw += wd * 0.08 * k;
        }
        if (dp < px1) t = L > 0.12 ? (vn(x, y, 3, s + 7) > 0.46 ? T_FOAM : T_LAP) : T_LINE;
        else if (dp < bw) {
          t = T_BED;
          if (bars > 0.5 && dp > 1.2 && hash(gi * 5 + 1, gj * 3 + 2) > 0.975) pebbles.push(i, j);
        } else if (dp < sh) t = T_SHAL;
        else if (dp < sh + mw + (vn(x, y, 2.4, s + 34) - 0.5) * 1.4) t = T_MID;
        else {
          // the channel wanders inside the banks; the sky lies on it in streaks
          const mean = (vn(u, hw, 64, s + 8) - 0.5) * hw * 0.9;
          t = Math.abs(lat - mean) < hw * (dark ? 0.34 : 0.26) ? T_CHAN : T_DEEP;
          if (vn(u, lat * 12, 20, s + 9) > 0.8) t = T_REFL;
        }
      }
      TB[k] = t + 1 + (shade ? 32 : 0);
    }
  }
  // the water's colours; a gravel bar stands up out of the stream, lit on
  // its upper-left rim and shaded on its lower-right one
  const bedAt = (v) => v && (v & 31) - 1 === T_BED;
  const edgeAt = (v) => { const t = (v & 31) - 1; return t === T_LAP || t === T_LINE || t === T_FOAM; };
  for (let j = 0; j < ph; j++) {
    for (let i = 0; i < pw; i++) {
      const k = j * pw + i, v = TB[k];
      if (!v) continue;
      let t = (v & 31) - 1;
      if (t === T_BED) {
        const ul = i > 0 && j > 0 ? TB[k - pw - 1] : 0, dr = i < pw - 1 && j < ph - 1 ? TB[k + pw + 1] : 0;
        if (ul && !bedAt(ul) && !edgeAt(ul)) t = T_BEDLT;
        else if (dr && !bedAt(dr) && !edgeAt(dr)) t = T_BEDDK;
      }
      const c = (v & 32 ? S : T)[t], o = k * 4;
      D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
    }
  }
  // pebbles on the gravel
  for (let q = 0; q < pebbles.length; q += 2) {
    const sz = (0.55 + hash(pebbles[q], pebbles[q + 1]) * 0.5) * r;
    stonePx(R, pebbles[q], pebbles[q + 1], sz * 1.3, sz, WT.pebs[(q >> 1) % 2], null, null);
  }
  // The landmarks: one per LM-unit patch of the world the river runs
  // through (so the board and the landscape beyond it agree), on alternating
  // banks and preferring the bank a spit juts from. The Greenwood and the
  // Marches get a boulder with its foam, a bed of rushes, a drift log or
  // pebbles; the fen a half-sunk log, a drowned snag or a reed bed.
  const rocks = [], stand = [];
  const nearRoad = (x, y, m) => nearestOnPath(x, y).d < PATH_HALF + m;
  const inside = (x, y, m) => x > x0 + m && x < x1 - m && y > y0 + m && y < y1 - m;
  const wetAt = (x, y, lo, hi) => { const pe = pastEdge(rivers, x, y); return pe >= lo && pe <= hi; };
  const seen = new Set();
  for (const rv of rivers) {
    const HS = segHalfs(rv);
    rv.segs.forEach((sg, sq) => {
      const tx = (sg.x2 - sg.x1) / sg.len, ty = (sg.y2 - sg.y1) / sg.len, hw1 = HS.a[sq], dh = HS.b[sq] - hw1;
      for (let dd = 0; dd < sg.len; dd += 4) {
        const cx = sg.x1 + tx * dd, cy = sg.y1 + ty * dd, hw = dh === 0 ? hw1 : hw1 + dh * (dd / sg.len);
        const ci = Math.floor(cx / LM), cj = Math.floor(cy / LM), key = ci * 4096 + cj;
        if (seen.has(key)) continue;
        seen.add(key);
        if (cx > W - WALL_W - 14 && cx < W + 40 && cy > -20 && cy < H + 20) continue;   // under the castle
        const h = hash(ci * 31 + s, cj * 17 + 5), h2 = hash(ci * 13 + s, cj * 29 + 7), h3 = hash(ci * 7 + s, cj * 11 + 3);
        let side = (ci + cj) & 1 ? 1 : -1;
        if (spitAt(cx + ty * side * hw, cy - tx * side * hw, -side, s) > spitAt(cx - ty * side * hw, cy + tx * side * hw, side, s) + 0.3) side = -side;
        const nx = -ty * side, ny = tx * side;
        const at = (l, along = 0) => [cx + nx * l + tx * along, cy + ny * l + ty * along];
        // where this bank's water really ends (spits and all), as a lat
        const edge = (along = 0) => {
          const [x, y] = at(hw, along);
          return hw - edgeOff(vn(x, y, 42, s + 11), vn(x, y, 90, s + 13), vn(x, y, 52, s + 15), vn(x, y, 13, s), side, hw, LX * nx + LY * ny);
        };
        const kind = fen ? (h < 0.3 ? "log" : h < 0.58 ? "snag" : h < 0.94 ? "reeds" : "")
          : h < 0.27 && hw >= 12 ? "rock" : h < 0.36 ? "log" : h < 0.74 ? "reeds" : h < 0.9 ? "pebbles" : "";
        if (kind === "rock") {
          const lat = (h2 - 0.5) * hw * 0.7, x = cx - ty * lat, y = cy + tx * lat;
          if (inside(x, y, 6) && !nearRoad(x, y, 14) && pastEdge(rivers, x, y) <= -hw * 0.45) stand.push({ k: "rock", x, y, tx, ty, s: 1.05 + h2 * 0.45, seed: key });
        } else if (kind === "log") {
          const [x, y] = at(edge() + 0.6), dir = h3 < 0.75 ? 1 : -1;
          let ax = -nx * 0.5 + tx * 0.86 * dir, ay = -ny * 0.5 + ty * 0.86 * dir;
          const l = Math.hypot(ax, ay);
          ax /= l; ay /= l;
          const len = Math.min(9 + h2 * 6, hw * 1.15);
          if (inside(x, y, len + 4) && !nearRoad(x, y, 12 + len * 0.6) && wetAt(x, y, -8, 2.5)) stand.push({ k: "log", x, y, ax, ay, len, seed: key });
        } else if (kind === "snag") {
          const [x, y] = at(edge() - 2.6 - h2 * 2.2);
          if (inside(x, y, 12) && !nearRoad(x, y, 12) && wetAt(x, y, -hw, -2.5)) stand.push({ k: "snag", x, y, seed: key });
        } else if (kind === "reeds") {
          const n = fen ? 2 + (h2 > 0.45 ? 1 : 0) : 1 + (h2 > 0.55 ? 1 : 0);
          for (let q = 0; q < n; q++) {
            const along = (q - (n - 1) / 2) * 5.5 + (hash(key, q + 5) - 0.5) * 2;
            const [x, y] = at(edge(along) - 0.4 + hash(key, q + 1) * 1.2, along);
            if (!inside(x, y, 14) || nearRoad(x, y, 10) || !wetAt(x, y, -8, 2.5)) continue;
            stand.push({ k: "rushes", x, y, sc: 0.8 + hash(key, q + 9) * 0.35, seed: key * 5 + q });
          }
        }
        // pebbles in the shallows: this bank's landmark, or now and then the other bank's
        if (kind === "pebbles" || h3 < 0.28) {
          const [x, y] = at((kind === "pebbles" ? 1 : -1) * (hw - 2.2 - h2 * 1.6));
          if (inside(x, y, 4) && !nearRoad(x, y, 8) && wetAt(x, y, -4.5, -1)) stand.push({ k: "pebbles", x, y, seed: key });
        }
      }
    });
  }
  // (nothing of a river's own stands out in the pond it ends in)
  if (endPonds.length) for (let q = stand.length - 1; q >= 0; q--) if (endPonds.some((P) => pondG(P, stand[q].x, stand[q].y) < 1)) stand.splice(q, 1);
  stand.sort((a, b) => a.y - b.y);
  const wet = (i, j) => i >= 0 && j >= 0 && i < pw && j < ph && TB[j * pw + i] !== 0;
  for (const o of stand) {
    const [ci, cj] = R.at(o.x, o.y);
    if (o.k === "rock") {
      const rx = 3.2 * o.s * r, ry = 2.3 * o.s * r;
      // foam round its waterline, heaped on the upstream side, and a wake
      // trailing downstream in two pale lines
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
        const up = -(ca * o.tx + sa * o.ty);
        const rr = 1 + (up > 0 ? up * 0.6 : 0) + (hash(o.seed, a + 40) - 0.5) * 0.8;
        if (hash(o.seed, a) < 0.2 + (up < 0 ? -up * 0.5 : 0)) continue;
        R.put(Math.round(ci + ca * (rx + r * rr)), Math.round(cj + sa * (ry + r * rr * 0.8)), up > -0.2 ? T[T_FOAM] : T[T_LAP]);
      }
      for (const sd of [-1, 1]) {
        const bx = ci - o.ty * sd * rx * 0.9, by = cj + o.tx * sd * ry * 0.9;
        const len = (7 + hash(o.seed, sd + 50) * 5) * r, spread = 0.35;
        line(R, Math.round(bx), Math.round(by), Math.round(bx + (o.tx - o.ty * sd * spread) * len), Math.round(by + (o.ty + o.tx * sd * spread) * len * 0.8),
          (t) => (t < 0.45 ? T[T_LAP] : hash(o.seed, Math.round(t * 20)) < 0.5 ? null : T[T_REFL]));
      }
      stonePx(R, ci, cj, rx, ry, B.c.rock, B.c.ink, null);
      // wet dark stone at the waterline
      for (let q = -Math.round(rx * 0.7); q <= Math.round(rx * 0.7); q++) R.put(ci + q, Math.round(cj + ry - 1), B.c.rock[2]);
      rocks.push({ x: o.x, y: o.y, tx: o.tx, ty: o.ty, rx: rx / r, ry: ry / r, seed: o.seed });
    } else if (o.k === "pebbles") {
      const n = 2 + Math.floor(hash(o.seed, 3) * 3);
      for (let q = 0; q < n; q++) {
        const px = ci + Math.round((hash(o.seed, q + 4) - 0.5) * 7 * r), py = cj + Math.round((hash(o.seed, q + 8) - 0.5) * 2.4 * r);
        const sz = (0.7 + hash(o.seed, q + 12) * 0.7) * r;
        stonePx(R, px, py, sz * 1.3, sz, WT.pebs[q % 2], null, S[T_SHAL]);
      }
    } else if (o.k === "log") logPx(R, B, WT, o.x, o.y, o.ax, o.ay, o.len, o.seed, wet);
    else if (o.k === "snag") snagPx(R, B, WT, o.x, o.y, o.seed, wet, 1.2);
    else rushPx(R, B, o.x, o.y, o.sc, o.seed);
  }
  return { cv: toCanvas(R), x: x0, y: y0, w: pw / r, h: ph / r, rocks };
};

// ---- the current: tiny marks drifting downstream ----------------------------

// A river's centreline sampled every 2 units, for the marks to ride.
const SAMPLERS = new WeakMap();
const samplerOf = (rv) => {
  let S = SAMPLERS.get(rv);
  if (S) return S;
  let total = 0;
  for (const sg of rv.segs) total += sg.len;
  const n = Math.max(2, Math.ceil(total / 2) + 1);
  const X = new Float32Array(n), Y = new Float32Array(n), TX = new Float32Array(n), TY = new Float32Array(n), HW = new Float64Array(n);
  const HS = segHalfs(rv);
  let si = 0, acc = 0;
  for (let q = 0; q < n; q++) {
    const d = Math.min(total, q * 2);
    while (si < rv.segs.length - 1 && acc + rv.segs[si].len < d) { acc += rv.segs[si].len; si++; }
    const sg = rv.segs[si], t = Math.max(0, Math.min(1, (d - acc) / sg.len));
    X[q] = sg.x1 + (sg.x2 - sg.x1) * t; Y[q] = sg.y1 + (sg.y2 - sg.y1) * t;
    TX[q] = (sg.x2 - sg.x1) / sg.len; TY[q] = (sg.y2 - sg.y1) / sg.len;
    const dh = HS.b[si] - HS.a[si];
    HW[q] = dh === 0 ? HS.a[si] : HS.a[si] + dh * t;
  }
  // the samples out in the water of a pond this river ends in (no current there)
  let wet = null;
  const ends = PONDS.map(pondShape).filter((P) => P.kind !== "lava" && P.kind !== "ice" && riversEndingIn(P, [rv]).size);
  if (ends.length) { wet = new Uint8Array(n); for (let q = 0; q < n; q++) if (ends.some((P) => pondG(P, X[q], Y[q]) < 0)) wet[q] = 1; }
  S = { n, X, Y, TX, TY, HW, total, wet };
  SAMPLERS.set(rv, S);
  return S;
};

// The marks, baked at 16 headings: a ripple (a long dash with a short one
// braided beside it), a glint of sun, a pair of foam flecks. 7x7 units each.
const MARKS = new Map();
const MARK_SZ = 7;
const markSprite = (wa, type, b) => {
  const key = `${wa.deep}${wa.edge}${wa.shine}|${type}|${b}`;
  let cv = MARKS.get(key);
  if (cv) return cv;
  const n = MARK_SZ * PX, c0 = n / 2 - 0.5;
  cv = document.createElement("canvas");
  cv.width = cv.height = n;
  const c = cv.getContext("2d");
  const a = (b / 16) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
  const dot = (al, ac, col) => { c.fillStyle = col; c.fillRect(Math.round(c0 + ca * al - sa * ac), Math.round(c0 + sa * al + ca * ac), 1, 1); };
  const main = mix(wa.edge, wa.shine, 0.62), soft = mix(wa.deep, wa.shine, 0.42);
  if (type === 0) {
    for (let k = -3; k <= 2; k++) dot(k, 0, main);
    for (let k = -5; k <= -3; k++) dot(k, 2, soft);
  } else if (type === 1) {
    // (a sun-cream glint; on the fen's black water only the moon's grey)
    for (let k = -1; k <= 1; k++) dot(k, 0, lum(wa.deep) < 0.2 ? mix(wa.shine, "#fff3d2", 0.45) : "#fff3d2");
    dot(0, -1, lighten(wa.shine, 0.5));
    dot(-3, 1, main);
  } else {
    dot(0, 0, lighten(wa.shine, 0.45));
    dot(-3, 1, lighten(wa.shine, 0.2));
    dot(-2, 1, main);
  }
  MARKS.set(key, cv);
  return cv;
};
const snapH = (v) => Math.round(v * PX) / PX;

// the marks on one river at `time`; `clip` = [x0, y0, x1, y1] keeps them to
// what can be seen
const drawCurrent = (ctx, rv, time, wa, clip) => {
  const S = samplerOf(rv);
  if (S.total < 20) return;
  const n = Math.max(4, Math.round(S.total / 17));
  const ga = ctx.globalAlpha;
  for (let i = 0; i < n; i++) {
    const kind = hash(i, 5), type = kind < 0.64 ? 0 : kind < 0.84 ? 2 : 1;
    const P = 3.2 + hash(i, 1) * 3, tt = time + hash(i, 2) * P, cyc = Math.floor(tt / P), u = tt / P - cyc;
    const bank = type === 2;
    const speed = bank ? 7 + hash(i, 6) * 4 : 15 + hash(i, 7) * 8;
    let d = hash(i * 7 + cyc, 3) * S.total + u * P * speed;
    if (d >= S.total) d -= S.total;
    const q = Math.min(S.n - 1, Math.round(d / 2)), hw = S.HW[q];
    if (S.wet && S.wet[q]) continue;
    const lat0 = bank ? (hash(i * 7 + cyc, 4) < 0.5 ? -1 : 1) * (hw - 3.2) : (hash(i * 7 + cyc, 4) * 2 - 1) * Math.max(1, hw - 6);
    const lat = lat0 + Math.sin(u * 6.283 + i) * (bank ? 0.4 : 1.4);
    const tx = S.TX[q], ty = S.TY[q];
    const x = S.X[q] - ty * lat, y = S.Y[q] + tx * lat;
    if (clip && (x < clip[0] || y < clip[1] || x > clip[2] || y > clip[3])) continue;
    // fade in and out in three steps, never a smooth blend
    const f = u < 0.12 || u > 0.88 ? 0.34 : u < 0.24 || u > 0.76 ? 0.67 : 1;
    const b = ((Math.round(Math.atan2(ty, tx) / (Math.PI * 2) * 16) % 16) + 16) % 16;
    ctx.globalAlpha = ga * f * (type === 0 ? 0.85 : type === 1 ? 1 : 0.75);
    ctx.drawImage(markSprite(wa, type, b), snapH(x) - MARK_SZ / 2, snapH(y) - MARK_SZ / 2, MARK_SZ, MARK_SZ);
  }
  ctx.globalAlpha = ga;
};

// foam working round the rocks: a few pale flecks that come and go
const FOAMS = new Map();
const foamSprite = (wa, v) => {
  const key = wa.shine + v;
  let cv = FOAMS.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = cv.height = 10 * PX;
  const c = cv.getContext("2d"), n = 10 * PX;
  const col = lighten(wa.shine, 0.45), col2 = mix(wa.edge, wa.shine, 0.5);
  for (let k = 0; k < 7; k++) {
    const a = hash(v, k) * Math.PI * 2, rr = 0.36 + hash(v, k + 9) * 0.1;
    c.fillStyle = k % 3 ? col : col2;
    c.fillRect(Math.round(n / 2 + Math.cos(a) * n * rr), Math.round(n / 2 + Math.sin(a) * n * rr * 0.72), 1, 1);
  }
  FOAMS.set(key, cv);
  return cv;
};
const drawRockFoam = (ctx, rocks, time, wa) => {
  for (const k of rocks) {
    const v = Math.floor(time * 2.5 + hash(k.seed, 1) * 4) % 3;
    ctx.drawImage(foamSprite(wa, v), snapH(k.x - 5 + k.tx), snapH(k.y - 5 + k.ty * 0.8), 10, 10);
  }
};

// The world rectangle a context can paint into (its canvas through the
// inverse of its transform), and how many canvas pixels a world unit gets.
const viewOf = (ctx) => {
  const T = ctx.getTransform(), I = T.inverse(), cw = ctx.canvas.width, ch = ctx.canvas.height;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[0, 0], [cw, 0], [0, ch], [cw, ch]]) {
    const x = I.a * px + I.c * py + I.e, y = I.b * px + I.d * py + I.f;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { rect: [x0, y0, x1, y1], scale: Math.hypot(T.a, T.b) };
};

// A river, whole: its body (painted once and kept, per river and view) and
// the current on it at `time`. The board bakes its rivers through
// bakeWater instead; this is for the landscape beyond it and the lab pages.
const BODIES = new WeakMap();
export const drawRiver = (ctx, rv, time, water) => {
  const wa = water || DEFAULT_WATER;
  const { rect, scale } = viewOf(ctx);
  const cells = (rect[2] - rect[0]) * (rect[3] - rect[1]);
  const r = scale < 1.4 || cells > 2.5e6 ? 1 : 2;
  const key = `${rect.map(Math.round).join(",")}|${r}|${wa.deep}|${REALM.id}`;
  let body = BODIES.get(rv);
  if (!body || body.key !== key) {
    body = riverBody([rv], wa, rect, r);
    if (body) body.key = key;
    BODIES.set(rv, body || { key });
  }
  if (body && body.cv) {
    const sm = ctx.imageSmoothingEnabled;
    if (r === 2 && Math.abs(scale - 2) < 0.01) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(body.cv, body.x, body.y, body.w, body.h);
    ctx.imageSmoothingEnabled = sm;
    drawRockFoam(ctx, body.rocks, time, wa);
  }
  drawCurrent(ctx, rv, time, wa, rect);
};

// ---- ponds -----------------------------------------------------------------------

// ice and lava tones
const ICE = ["#7c9fb4", "#a4c2d2", "#c4dbe6", "#e0eef4", "#f8fcfd"].map((c) => C(c));
const ICE_S = ["#6c8aa2", "#8eaabc", "#a8c0d0", "#c0d4e0", "#d8e6ee"].map((c) => C(c));
const ICE_CRACK = C("#58798e"), ICE_CRACK_LT = C("#ffffff", 0.85);
const LAVA = ["#4a1a16", "#86281a", "#c8461c", "#ee8430", "#fcc45a", "#fff0b8"].map((c) => C(c));
const CRUST = [C("#2e201e"), C("#4a302a"), C("#7a4c36")];
const HEAT = [C("#e0602a", 0.2), C("#e0602a", 0.1)];

const pondPalette = (p) => {
  if (p.t === "swamp") {
    // the fen's meres keep its black water, with a little of the weed's green in it
    const w = REALM.groundArt === "fen" && REALM.water;
    return w ? { deep: mix(w.deep, SWAMP_WATER.deep, 0.3), edge: mix(w.edge, SWAMP_WATER.edge, 0.3), shine: w.shine } : SWAMP_WATER;
  }
  return REALM.water || DEFAULT_WATER;
};

const pondSeed = (p) => (((REALM.seed | 0) + Math.round(p.x * 3 + p.y)) % 97 + 97) % 97;
// A pond's shape: its ellipse — held back from the castle wall on its east
// side, so no rim or glow runs into the stone — its seed and its kind. (A
// copy: the terrain's own pond, which the game plays on, is never touched.)
const pondShape = (p) => {
  const rx = p.w / 2, ry = p.h / 2, wallX = W - WALL_W - 9;
  return {
    p, x: p.x, y: p.y, rx, ry, rxE: p.x + rx > wallX ? Math.max(rx * 0.45, wallX - p.x) : rx,
    m: Math.min(rx, ry), big: p.w >= 80, s: pondSeed(p),
    kind: p.t === "lava" ? "lava" : p.t === "ice" ? "ice" : p.t === "swamp" ? "swamp" : "clear",
  };
};
// how far past the ellipse (before wobble) a point stands, and the outward normal
const ELL = { f: 0, nx: 0, ny: 0 };
const ellField = (P, x, y) => {
  const dx = x - P.x, dy = y - P.y, rx = dx > 0 ? P.rxE : P.rx, ry = P.ry;
  const k = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
  const gx = dx / (rx * rx), gy = dy / (ry * ry), gl = Math.sqrt(gx * gx + gy * gy);
  if (gl < 1e-6) { ELL.f = -Math.min(rx, ry); ELL.nx = 0; ELL.ny = 1; return ELL; }
  ELL.f = (k - 1) * k / gl; ELL.nx = gx / gl; ELL.ny = gy / gl;
  return ELL;
};
// The shore's wobble (> 0 pulls it in over the water): a swell and a pixel's
// jitter, and on a great mere a slow octave that makes real bays and points.
// Held to about 6 in (boats moor inside the ellipse shrunk by 8/6); out,
// to 3.5 where the ellipse meets its bounding box (scatter keeps 6 off the
// box) and further toward the box's corners. The fine octave is kept in NP.
let NP = 0;
const pondWob = (P, x, y) => {
  const m = P.m, s = P.s, huge = m > 36, a1 = Math.min(huge ? 7 : 5, 1.8 + m * 0.06);
  NP = vn(x, y, 6, s + 22);
  let e = (vn(x, y, Math.max(14, m * 0.6), s + 21) - 0.5) * a1 * 2 + (NP - 0.5) * 0.7 + a1 * 0.35;
  if (huge) e += (vn(x, y, m * 1.2, s + 23) - 0.5) * Math.min(20, (m - 36) * 0.5) * 2;
  const gap = Math.min((x > P.x ? P.rxE : P.rx) - Math.abs(x - P.x), P.ry - Math.abs(y - P.y)), out = gap > 0 ? Math.min(11, 3.5 + gap * 0.7) : 3.5;
  const inn = huge ? 7.5 : 5.5;
  return e > inn ? inn + (e - inn) * 0.25 : e < -out ? -out + (e + out) * 0.25 : e;
};
// past the shore (wobbled): < 0 in the water. Leaves the normal in ELL.
const pondG = (P, x, y) => { const f = ellField(P, x, y).f; return f > 14 ? f : f + pondWob(P, x, y); };
// the point on the shore along the ray at angle a, moved `off` outward (< 0: in)
const shoreAt = (P, a, off) => {
  const ca = Math.cos(a), sa = Math.sin(a), rx = ca > 0 ? P.rxE : P.rx, l = Math.hypot(ca * rx, sa * P.ry);
  let k = 0.55;
  for (; k < 1.35; k += 0.01) if (pondG(P, P.x + ca * rx * k, P.y + sa * P.ry * k) >= 0) break;
  return [P.x + ca * rx * k + (ca * rx / l) * off, P.y + sa * P.ry * k + (sa * P.ry / l) * off];
};

// A pond's bands and the sky lying on it, worked out once.
const pondPrep = (P) => {
  if (P.dashes) return P;
  const { s, rx, ry, m, big } = P, huge = m > 36;
  P.huge = huge;
  // a great mere's shallows and middle water run wide
  P.sh0 = huge ? 3 + m * 0.035 : 2.2 + (big ? 1.5 : 0.6);
  P.midW = huge ? 3 + m * 0.045 : 3;
  P.deepF = 8 + P.sh0 + 1.1 + P.midW + 0.7;   // past this (unwobbled) depth only the depth matters
  // the sky on the open water: a glare of stacked dashes on the sun's side,
  // shortening downward (on a great mere a long one, broken in pieces: the
  // moon on black water), and a few lone dashes further out
  const dashes = [];
  const glare = (gx, gy, len, rows, broken) => {
    const th = broken ? 1 : 1 / PX;   // (a great mere's glare two art pixels thick, so it reads at 1x)
    for (let q = 0; q < rows; q++) {
      const l = len * (1 - q / rows), xa = gx + q * len * 0.12 + (hash(s, q + 100) - 0.5) * 2, yy = Math.round((gy + q * (broken ? 2.5 : 1.5)) * PX) / PX;
      if (!broken) { dashes.push([yy, xa, xa + l, th, T_REFL]); continue; }
      for (let a = xa, n = 0; a < xa + l; n++) {
        const piece = 2.5 + hash(s, q * 17 + n + 120) * l * 0.3;
        dashes.push([yy, a, Math.min(xa + l, a + piece), th, q === 0 ? (hash(s, n + 160) < 0.6 ? T_FOAM : T_LAP) : q === 1 ? T_LAP : T_REFL]);
        a += piece + 1.5 + hash(s, q * 17 + n + 140) * 3;
      }
    }
  };
  if (huge) {
    glare(P.x - rx * 0.46, P.y - ry * 0.46, Math.min(56, rx * 0.34), 4, true);
    glare(P.x + rx * 0.14, P.y - ry * 0.04, 16, 2, true);
  } else {
    glare(P.x - rx * 0.5, P.y - ry * 0.42, big ? 16 : Math.max(5, rx * 0.34), 3, false);
    if (big) glare(P.x + rx * 0.05, P.y + ry * 0.05, 10, 3, false);
  }
  for (let q = 0; q < (huge ? 8 : big ? 5 : 2); q++) {
    const x = P.x + (hash(s, q + 110) - 0.4) * rx * 1.1, y = P.y + (hash(s, q + 111) - 0.35) * ry * 1.1;
    dashes.push([Math.round(y * PX) / PX, x, x + 2 + hash(s, q + 112) * (big ? 5 : 3), 1 / PX, T_REFL]);
  }
  // (filed by art-pixel row, so a pixel only looks at its own row's dashes)
  const rows = new Map();
  for (const [dy, xa, xb, th, t] of dashes) {
    for (let k = Math.round(dy * PX); k < Math.round((dy + th) * PX); k++) {
      if (!rows.has(k)) rows.set(k, []);
      rows.get(k).push(xa, xb, t);
    }
  }
  P.dashes = rows;
  return P;
};
// the sky's tone at (x, y) on a pond's open water, or -1
const inDash = (P, x, y) => {
  const row = P.dashes.get(Math.floor(y * PX));
  if (row) for (let q = 0; q < row.length; q += 3) if (x > row[q] && x < row[q + 1]) return row[q + 2];
  return -1;
};
// The tone of one pixel of clear or swamp water: dp its depth past the
// (wobbled) shore, df past the plain ellipse.
const pondTone = (P, x, y, dp, df, L, shade, gi, gj, r) => {
  const s = P.s;
  if (dp < 1 / r) return L > 0.12 ? (vn(x, y, 3, s + 7) > 0.46 ? T_FOAM : T_LAP) : T_LINE;
  const sh = P.sh0 + (vn(x, y, 9, s + 6) - 0.5) * 2.2;
  let t;
  if (dp < sh) t = P.kind === "clear" && L > 0.2 && vn(x, y, 20, s + 8) > 0.55 ? T_BED : T_SHAL;
  else if (dp < sh + P.midW + (vn(x, y, 2.4, s + 34) - 0.5) * 1.4) t = T_MID;
  else {
    t = df > P.m * 0.5 + (vn(x, y, 14, s + 9) - 0.5) * P.m * 0.4 ? T_CHAN : T_DEEP;
    const sky = shade ? -1 : inDash(P, x, y);
    if (sky >= 0) t = sky;
  }
  // scum on the still swamp, gathered along the shore
  if (P.kind === "swamp" && dp > 1 && dp < sh + 2.5 && vn(x, y, 6, s + 13) > 0.63) t = hash(gi, gj * 5 + 1) > 0.88 ? T_SCUMLT : T_SCUM;
  return t;
};

const POND_BODIES = new Map();
const pondBody = (p) => {
  const P = pondPrep(pondShape(p));
  // a pond that runs into a river is painted with the river (riverBody), in
  // its colours; its own body holds only what stands in it
  const joined = RIVERS.length > 0 && P.kind !== "lava" && P.kind !== "ice" && touchesRiver(P, RIVERS);
  const pal = joined ? REALM.water || DEFAULT_WATER : pondPalette(p);
  const key = `${p.x}|${p.y}|${p.w}|${p.h}|${p.t || ""}|${REALM.id}|${pal.deep}|${joined ? "j" : ""}`;
  let body = POND_BODIES.get(key);
  if (body) return body;
  if (POND_BODIES.size > 12) POND_BODIES.clear();
  const { kind, s, rx, ry, m, big, huge } = P, r = PX;
  const M = kind === "lava" ? 14 : 10, TOP = 16;
  const x0 = Math.floor((p.x - rx - M) * r) / r, y0 = Math.floor((p.y - ry - M - TOP) * r) / r;
  const x1 = Math.ceil((p.x + rx + M) * r) / r, y1 = Math.ceil((p.y + ry + M) * r) / r;
  const pw = Math.round((x1 - x0) * r), ph = Math.round((y1 - y0) * r);
  const R = raster(x0, y0, pw, ph, r);
  const B = bankTones(joined ? bankKey() : kind === "ice" ? "snow" : kind === "lava" ? "ash" : kind === "swamp" && bankKey() === "green" ? "fen" : bankKey());
  const WT = waterTones(pal, B), T = WT.T, S = WT.S;
  const WM = new Uint8Array(pw * ph);   // which pixels are water, for the dressing
  const pebbles = [];
  if (!joined) for (let j = 0; j < ph; j++) {
    const y = y0 + (j + 0.5) / r, gj = R.gy + j;
    for (let i = 0; i < pw; i++) {
      const x = x0 + (i + 0.5) / r, gi = R.gx + i;
      const { f, nx, ny } = ellField(P, x, y);
      if (f > M) continue;
      const k = j * pw + i;
      if (f < -P.deepF && (kind === "clear" || kind === "swamp")) {
        // out in the middle only the depth matters
        let t = -f > m * 0.5 + (vn(x, y, 14, s + 9) - 0.5) * m * 0.4 ? T_CHAN : T_DEEP;
        const sky = inDash(P, x, y);
        if (sky >= 0) t = sky;
        WM[k] = 1;
        R.put(i, j, T[t]);
        continue;
      }
      const g = f + pondWob(P, x, y);
      if (g >= 0) {
        let c = bankPx(B, g, nx, ny, x, y, gi, gj, s, r);
        // (the ice's dark waterline comes and goes under the snow)
        if (kind === "ice" && c === B.c.wet && vn(x, y, 4, s + 47) < 0.45) c = B.c.lit;
        if (kind === "lava" && !c && g < 9 && x < W - WALL_W - 1) {
          // the ground about it warmed by the glow, in two ragged steps
          const eW = 3.5 + (vn(x, y, 6, s + 30) - 0.5) * 2, cl = (vn(x, y, 1.8, s + 31) - 0.5) * 2;
          c = g < eW + 2.5 + cl ? HEAT[0] : g < eW + 6 + cl * 1.4 ? HEAT[1] : null;
        }
        R.put(i, j, c);
        continue;
      }
      WM[k] = 1;
      const dp = -g, L = LX * nx + LY * ny, V = ny < 0 ? -ny : 0;
      const shade = dp < (L < 0 ? -L : 0) * 3.2 + V * 0.7 + (NP - 0.5) * 1.6;
      if (kind === "ice") {
        // frost at the rim (thick and thin, broken), pale ice, clear dark ice
        // in the middle where it is thickest, and the sun's sheen laid
        // across it in diagonal bands
        let t;
        if (dp < 0.45 + vn(x, y, 5, s + 45) * 1.1 && vn(x, y, 4, s + 46) > 0.3) t = 3;
        else if (dp < 3 + (vn(x, y, 6, s + 40) - 0.5) * 2) t = 2;
        else {
          const cl = vn(x, y, 16, s + 41);
          t = cl < 0.36 && dp > m * 0.35 ? 0 : cl < 0.5 ? 1 : 2;
          const band = ((x * 0.8 - y * 1.3 + 400) % 23), on = hash(Math.floor((x * 1.3 + y * 0.8) / 5), s + 43) > 0.4 && vn(x, y, 12, s + 42) > 0.42;
          if (!shade && on && band < 1.1) t = 4;
          else if (!shade && on && band < 1.7) t = 3;
          if (hash(gi, gj * 3 + 11) > 0.985) t = 3;
        }
        // snow blown out onto the ice, drifted against the shore
        const drift = vn(x, y, 7, s + 44);
        if (dp < 7 && drift > 0.6 - (7 - dp) * 0.02) t = drift > 0.66 - (7 - dp) * 0.02 ? 4 : 3;
        R.put(i, j, (shade ? ICE_S : ICE)[t]);
        continue;
      }
      if (kind === "lava") {
        // a cooling skin at the edge, crust plates adrift, and bright veins
        // of the melt running between them, hottest in the middle (the
        // veins' noise turned off the grid and warped, so none runs straight)
        const core = 1 - Math.exp(-dp / Math.max(4, m * 0.35));
        const wx = x * 0.8 + y * 0.6 + (vn(x, y, 8, s + 53) - 0.5) * 7, wy = y * 0.8 - x * 0.6 + (vn(x, y, 8, s + 54) - 0.5) * 7;
        const vein = Math.max(0, 1 - Math.abs(vn(wx, wy, 11, s + 50) - 0.5) * 7);
        const vein2 = Math.max(0, 1 - Math.abs(vn(wy, -wx, 5.5, s + 51) - 0.5) * 9) * 0.6;
        const heat = core * 0.62 + Math.max(vein, vein2) * 0.42;
        const plate = vn(x, y, 7.5, s + 52);
        let c;
        if (dp < 1 / r) c = CRUST[0];
        else if (dp < 1.6) c = LAVA[0];
        else if (plate > 0.64 && heat < 0.78) {
          // a crust plate: a hot rim where the melt licks it, lit on its
          // upper left, dark on its lower right
          c = plate < 0.668 ? LAVA[heat > 0.35 ? 4 : 3] : vn(x - 1.3, y - 1.3, 7.5, s + 52) < 0.672 ? CRUST[2] : vn(x + 1.1, y + 1.1, 7.5, s + 52) < 0.672 ? CRUST[0] : hash(gi, gj + 5) > 0.9 ? CRUST[0] : CRUST[1];
        } else c = LAVA[heat < 0.3 ? 1 : heat < 0.48 ? 2 : heat < 0.66 ? 3 : heat < 0.86 ? 4 : 5];
        R.put(i, j, c);
        continue;
      }
      // clear water and swamp
      const t = pondTone(P, x, y, dp, -f, L, shade, gi, gj, r);
      if (t === T_BED && dp > 1 && hash(gi * 5 + 1, gj * 3 + 2) > 0.982) pebbles.push(i, j);
      R.put(i, j, (shade ? S : T)[t]);
    }
  }
  for (let q = 0; q < pebbles.length; q += 2) {
    const sz = (0.55 + hash(pebbles[q], pebbles[q + 1]) * 0.5) * r;
    stonePx(R, pebbles[q], pebbles[q + 1], sz * 1.3, sz, WT.pebs[(q >> 1) % 2], null, null);
  }
  // ice: cracks running in from the rim, each a dark line with a lit lip on
  // its upper-left side, bending a little but never doubling back
  if (kind === "ice") {
    const nC = 3 + (big ? 2 : 0);
    for (let q = 0; q < nC; q++) {
      const a0 = (q / nC + hash(s, q + 60) * 0.25) * Math.PI * 2;
      let x = p.x + Math.cos(a0) * rx * 0.88, y = p.y + Math.sin(a0) * ry * 0.88;
      const h0 = Math.atan2((p.y - y) / 0.7, p.x - x) + (hash(s, q + 61) - 0.5) * 0.7;
      const len = (8 + hash(s, q + 63) * 14) * r;
      let a = h0;
      for (let k = 0; k < len; k++) {
        a += (hash(q * 97 + k, s + 64) - 0.5) * 0.22;
        a = Math.max(h0 - 0.3, Math.min(h0 + 0.3, a));
        x += Math.cos(a) / r; y += Math.sin(a) * 0.7 / r;
        if (k > 4 && ellField(P, x, y).f > -1.5) break;
        const [ci, cj] = R.at(x, y);
        if (!WM[cj * pw + ci]) continue;
        R.put(ci, cj, ICE_CRACK);
        if (WM[(cj - 1) * pw + ci - 1]) R.put(ci - 1, cj - 1, ICE_CRACK_LT);
        if (k === Math.round(len * 0.7) && len > 18 * r) {
          // a branch, splitting off at a shallow angle
          const b0 = a + (hash(q, s + 65) < 0.5 ? 1 : -1) * 0.5;
          let bx = x, by = y, ba = b0;
          for (let kk = 0; kk < len * 0.3; kk++) {
            ba += (hash(q * 31 + kk, s + 66) - 0.5) * 0.2;
            ba = Math.max(b0 - 0.25, Math.min(b0 + 0.25, ba));
            bx += Math.cos(ba) / r; by += Math.sin(ba) * 0.7 / r;
            if (ellField(P, bx, by).f > -2) break;
            const [bi, bj] = R.at(bx, by);
            if (WM[bj * pw + bi]) R.put(bi, bj, ICE_CRACK);
          }
        }
      }
    }
  }
  // reeds at the shore, lily pads, stones in the shallows; on a swamp mere
  // drowned snags and reed islands. (The fen lays its own lily pads.)
  if (kind === "clear" || kind === "swamp") {
    const stuff = [];
    const wetP = joined
      ? (i, j) => pondG(P, x0 + (i + 0.5) / r, y0 + (j + 0.5) / r) < 0
      : (i, j) => i >= 0 && j >= 0 && i < pw && j < ph && WM[j * pw + i] === 1;
    const clearOfRiver = (x, y) => !joined || pastEdge(RIVERS, x, y) > 3;
    const nR = huge ? 5 : big ? 3 : 1 + (hash(s, 70) < 0.5 ? 1 : 0);
    for (let q = 0; q < nR; q++) {
      // the first clump stands on the north-west shore, the rest wander
      const a = q === 0 ? -2.3 + (hash(s, 71) - 0.5) * 0.5 : hash(s, q + 72) * Math.PI * 2;
      const [x, y] = shoreAt(P, a, -0.8);
      if (nearestOnPath(x, y).d < PATH_HALF + 12 || !clearOfRiver(x, y)) continue;
      stuff.push({ k: "rushes", x, y, seed: s * 7 + q });
    }
    if (B.pads && kind === "clear" || kind === "swamp" && REALM.groundArt !== "fen") {
      const nP = big ? 4 : 1 + Math.floor(hash(s, 80) * 2);
      for (let q = 0; q < nP; q++) {
        const a = hash(s, q + 81) * Math.PI * 2, d = 0.55 + hash(s, q + 82) * 0.3;
        const x = p.x + Math.cos(a) * rx * d, y = p.y + Math.sin(a) * ry * d;
        if (pondG(P, x, y) < -3 && clearOfRiver(x, y)) stuff.push({ k: "pad", x, y, seed: s * 11 + q });
      }
    }
    if (kind === "clear") {
      const nS = big ? 4 : 2;
      for (let q = 0; q < nS; q++) {
        const a = -0.2 + hash(s, q + 90) * 2.6;   // on the lit, southern shore
        const [x, y] = shoreAt(P, a, -2.6);
        if (clearOfRiver(x, y)) stuff.push({ k: "pebbles", x, y, seed: s * 13 + q });
      }
    }
    if (kind === "swamp" && big) {
      const nS = huge ? 3 : 1, nI = huge ? 2 : 0;
      for (let q = 0; q < nS + nI; q++) {
        const a = hash(s, q + 150) * Math.PI * 2, d = 0.3 + hash(s, q + 151) * 0.42;
        const x = p.x + Math.cos(a) * rx * d, y = p.y + Math.sin(a) * ry * d;
        if (pondG(P, x, y) > -7 || !clearOfRiver(x, y)) continue;
        stuff.push({ k: q < nS ? "snag" : "island", x, y, seed: s * 17 + q });
      }
    }
    stuff.sort((a, b) => a.y - b.y);
    const padC = [C("#6a9a48"), C("#4e7a36"), C("#3a5a2a")], bloom = C("#f4ece4"), heart = C("#e8c050");
    for (const o of stuff) {
      const [ci, cj] = R.at(o.x, o.y);
      if (o.k === "rushes") rushPx(R, B, o.x, o.y, big ? 1 : 0.85, o.seed);
      else if (o.k === "snag") snagPx(R, B, WT, o.x, o.y, o.seed, wetP, huge ? 1.5 : 1.25);
      else if (o.k === "island") islandPx(R, B, WT, o.x, o.y, o.seed, wetP);
      else if (o.k === "pebbles") {
        for (let q = 0; q < 3; q++) {
          const sz = (0.7 + hash(o.seed, q) * 0.6) * r;
          stonePx(R, ci + Math.round((hash(o.seed, q + 3) - 0.5) * 6 * r), cj + Math.round((hash(o.seed, q + 6) - 0.5) * 2 * r), sz * 1.3, sz, WT.pebs[q % 2], null, S[T_SHAL]);
        }
      } else {
        // a lily pad: a lit disc with its notch, a dark rim below; now and
        // then a flower
        const pr = (1.6 + hash(o.seed, 1) * 1.1) * r, notch = hash(o.seed, 2) * Math.PI * 2;
        for (let j = -Math.ceil(pr); j <= Math.ceil(pr); j++) {
          for (let i = -Math.ceil(pr * 1.3); i <= Math.ceil(pr * 1.3); i++) {
            const u = i / (pr * 1.3), v = j / (pr * 0.75), q = u * u + v * v;
            if (q > 1) continue;
            const an = Math.atan2(v, u);
            if (Math.abs(((an - notch + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35 && q > 0.1) continue;
            R.put(ci + i, cj + j, q > 0.6 && v > 0 ? padC[2] : u + v < -0.4 ? padC[0] : padC[1]);
          }
        }
        if (hash(o.seed, 3) < 0.35) { R.put(ci, cj - 1, bloom); R.put(ci - 1, cj - 1, bloom); R.put(ci + 1, cj - 1, bloom); R.put(ci, cj - 2, bloom); R.put(ci, cj - 1, heart); }
      }
    }
  }
  body = { cv: toCanvas(R), x: x0, y: y0, w: pw / r, h: ph / r, kind, pal, s, joined };
  POND_BODIES.set(key, body);
  return body;
};

// ---- ponds that overlap: one water ---------------------------------------------
// Loose ponds (clear or swamp, not run into a river) whose shores cross are
// painted together, as the rivers are: one raster, the shores joined by a
// smooth union, so no pond's bank is drawn over its neighbour's water. The
// tones read one pond's noise (the group's first) and every member's glare;
// each member still dresses its own shore, where that shore is still a shore.
const PMERGE = 8;
const psmin = (a, b) => { const h = Math.max(PMERGE - Math.abs(a - b), 0) / PMERGE; return Math.min(a, b) - h * h * PMERGE * 0.25; };
const overlaps = (A, B) => {
  if (Math.abs(A.x - B.x) > A.rx + B.rx + 8 || Math.abs(A.y - B.y) > A.ry + B.ry + 8) return false;
  for (let q = 0; q < 64; q++) {
    const a = (q / 64) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    if (ellField(B, A.x + ca * (ca > 0 ? A.rxE : A.rx), A.y + sa * A.ry).f < 4) return true;
    if (ellField(A, B.x + ca * (ca > 0 ? B.rxE : B.rx), B.y + sa * B.ry).f < 4) return true;
  }
  return false;
};
// the board's loose ponds in groups (a lone pond is a group of one)
const pondGroups = () => {
  const loose = PONDS.filter((p) => !pondBody(p).joined);
  const shapes = loose.map(pondShape), grp = loose.map((_, i) => i);
  const root = (i) => (grp[i] === i ? i : (grp[i] = root(grp[i])));
  for (let i = 0; i < loose.length; i++) for (let j = i + 1; j < loose.length; j++) {
    const a = shapes[i], b = shapes[j];
    if (a.kind !== b.kind || (a.kind !== "clear" && a.kind !== "swamp")) continue;
    if (overlaps(a, b)) grp[root(j)] = root(i);
  }
  const out = new Map();
  loose.forEach((p, i) => { const k = root(i); if (!out.has(k)) out.set(k, []); out.get(k).push(p); });
  return [...out.values()];
};
const GROUP_BODIES = new Map();
const groupBody = (ps) => {
  const Ps = ps.map((p) => pondPrep(pondShape(p))), P0 = Ps[0], kind = P0.kind, pal = pondPalette(ps[0]);
  const key = ps.map((p) => `${p.x}|${p.y}|${p.w}|${p.h}|${p.t || ""}`).join(";") + `|${REALM.id}|${pal.deep}`;
  let body = GROUP_BODIES.get(key);
  if (body) return body;
  if (GROUP_BODIES.size > 6) GROUP_BODIES.clear();
  const r = PX, M = 10, TOP = 16;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const P of Ps) { bx0 = Math.min(bx0, P.x - P.rx - M); by0 = Math.min(by0, P.y - P.ry - M - TOP); bx1 = Math.max(bx1, P.x + P.rx + M); by1 = Math.max(by1, P.y + P.ry + M); }
  const x0 = Math.floor(bx0 * r) / r, y0 = Math.floor(by0 * r) / r, x1 = Math.ceil(bx1 * r) / r, y1 = Math.ceil(by1 * r) / r;
  const pw = Math.round((x1 - x0) * r), ph = Math.round((y1 - y0) * r);
  const R = raster(x0, y0, pw, ph, r);
  const B = bankTones(kind === "swamp" && bankKey() === "green" ? "fen" : bankKey());
  const WT = waterTones(pal, B), T = WT.T, S = WT.S;
  // the tones' own noise is the first pond's, its glare every member's
  const TP = { ...P0, dashes: new Map() };
  for (const P of Ps) for (const [k, v] of P.dashes) TP.dashes.set(k, [...(TP.dashes.get(k) || []), ...v]);
  const WM = new Uint8Array(pw * ph), pebbles = [];
  const wetAt = (x, y) => { let g = 99; for (const P of Ps) { const v = pondG(P, x, y); g = g === 99 ? v : psmin(g, v); } return g; };
  for (let j = 0; j < ph; j++) {
    const y = y0 + (j + 0.5) / r, gj = R.gy + j;
    for (let i = 0; i < pw; i++) {
      const x = x0 + (i + 0.5) / r, gi = R.gx + i;
      // each member's shore, joined smoothly; the normal turned between the two nearest
      let g = 99, nx = 0, ny = 1, df = -99, np = 0.5, best = 99, m = P0.m;
      for (const P of Ps) {
        const f = ellField(P, x, y).f;
        if (f > M + 6) continue;
        const qx = ELL.nx, qy = ELL.ny, v = f > 14 ? f : f + pondWob(P, x, y);
        if (g === 99) { g = v; nx = qx; ny = qy; }
        else {
          const h = clamp01(0.5 + 0.5 * (g - v) / PMERGE);
          g = psmin(g, v);
          nx = qx * h + nx * (1 - h); ny = qy * h + ny * (1 - h);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l; ny /= l;
        }
        if (v < best) { best = v; np = NP; m = P.m; }
        if (-f > df) df = -f;
      }
      if (g === 99 || g > M) continue;
      const k = j * pw + i;
      if (g >= 0) { R.put(i, j, bankPx(B, g, nx, ny, x, y, gi, gj, P0.s, r)); continue; }
      WM[k] = 1;
      const dp = -g, L = LX * nx + LY * ny, V = ny < 0 ? -ny : 0;
      const shade = dp < (L < 0 ? -L : 0) * 3.2 + V * 0.7 + (np - 0.5) * 1.6;
      TP.m = m;
      const t = pondTone(TP, x, y, dp, df, L, shade, gi, gj, r);
      if (t === T_BED && dp > 1 && hash(gi * 5 + 1, gj * 3 + 2) > 0.982) pebbles.push(i, j);
      R.put(i, j, (shade ? S : T)[t]);
    }
  }
  for (let q = 0; q < pebbles.length; q += 2) {
    const sz = (0.55 + hash(pebbles[q], pebbles[q + 1]) * 0.5) * r;
    stonePx(R, pebbles[q], pebbles[q + 1], sz * 1.3, sz, WT.pebs[(q >> 1) % 2], null, null);
  }
  // each member's dressing (as pondBody lays it), where its shore is still
  // a shore and its water still open
  const wetP = (i, j) => i >= 0 && j >= 0 && i < pw && j < ph && WM[j * pw + i] === 1;
  const openShore = (x, y) => wetAt(x, y) > -2.5 || !Ps.some((Q) => pondG(Q, x, y) < -3);
  const stuff = [];
  for (const P of Ps) {
    const { s, rx, ry, big, huge, p } = P;
    const others = Ps.filter((Q) => Q !== P);
    const shore = (x, y) => !others.some((Q) => pondG(Q, x, y) < 1);
    const nR = huge ? 5 : big ? 3 : 1 + (hash(s, 70) < 0.5 ? 1 : 0);
    for (let q = 0; q < nR; q++) {
      const a = q === 0 ? -2.3 + (hash(s, 71) - 0.5) * 0.5 : hash(s, q + 72) * Math.PI * 2;
      const [x, y] = shoreAt(P, a, -0.8);
      if (nearestOnPath(x, y).d < PATH_HALF + 12 || !shore(x, y)) continue;
      stuff.push({ k: "rushes", x, y, seed: s * 7 + q, big });
    }
    if (B.pads && kind === "clear" || kind === "swamp" && REALM.groundArt !== "fen") {
      const nP = big ? 4 : 1 + Math.floor(hash(s, 80) * 2);
      for (let q = 0; q < nP; q++) {
        const a = hash(s, q + 81) * Math.PI * 2, d = 0.55 + hash(s, q + 82) * 0.3;
        const x = p.x + Math.cos(a) * rx * d, y = p.y + Math.sin(a) * ry * d;
        if (wetAt(x, y) < -3) stuff.push({ k: "pad", x, y, seed: s * 11 + q });
      }
    }
    if (kind === "clear") {
      for (let q = 0; q < (big ? 4 : 2); q++) {
        const a = -0.2 + hash(s, q + 90) * 2.6;
        const [x, y] = shoreAt(P, a, -2.6);
        if (shore(x, y)) stuff.push({ k: "pebbles", x, y, seed: s * 13 + q });
      }
    }
    if (kind === "swamp" && big) {
      const nS = huge ? 3 : 1, nI = huge ? 2 : 0;
      for (let q = 0; q < nS + nI; q++) {
        const a = hash(s, q + 150) * Math.PI * 2, d = 0.3 + hash(s, q + 151) * 0.42;
        const x = p.x + Math.cos(a) * rx * d, y = p.y + Math.sin(a) * ry * d;
        if (wetAt(x, y) > -7 || !openShore(x, y)) continue;
        stuff.push({ k: q < nS ? "snag" : "island", x, y, seed: s * 17 + q, huge });
      }
    }
  }
  stuff.sort((a, b) => a.y - b.y);
  const padC = [C("#6a9a48"), C("#4e7a36"), C("#3a5a2a")], bloom = C("#f4ece4"), heart = C("#e8c050");
  for (const o of stuff) {
    const [ci, cj] = R.at(o.x, o.y);
    if (o.k === "rushes") rushPx(R, B, o.x, o.y, o.big ? 1 : 0.85, o.seed);
    else if (o.k === "snag") snagPx(R, B, WT, o.x, o.y, o.seed, wetP, o.huge ? 1.5 : 1.25);
    else if (o.k === "island") islandPx(R, B, WT, o.x, o.y, o.seed, wetP);
    else if (o.k === "pebbles") {
      for (let q = 0; q < 3; q++) {
        const sz = (0.7 + hash(o.seed, q) * 0.6) * r;
        stonePx(R, ci + Math.round((hash(o.seed, q + 3) - 0.5) * 6 * r), cj + Math.round((hash(o.seed, q + 6) - 0.5) * 2 * r), sz * 1.3, sz, WT.pebs[q % 2], null, S[T_SHAL]);
      }
    } else {
      const pr = (1.6 + hash(o.seed, 1) * 1.1) * r, notch = hash(o.seed, 2) * Math.PI * 2;
      for (let j = -Math.ceil(pr); j <= Math.ceil(pr); j++) {
        for (let i = -Math.ceil(pr * 1.3); i <= Math.ceil(pr * 1.3); i++) {
          const u = i / (pr * 1.3), v = j / (pr * 0.75), q = u * u + v * v;
          if (q > 1) continue;
          const an = Math.atan2(v, u);
          if (Math.abs(((an - notch + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35 && q > 0.1) continue;
          R.put(ci + i, cj + j, q > 0.6 && v > 0 ? padC[2] : u + v < -0.4 ? padC[0] : padC[1]);
        }
      }
      if (hash(o.seed, 3) < 0.35) { R.put(ci, cj - 1, bloom); R.put(ci - 1, cj - 1, bloom); R.put(ci + 1, cj - 1, bloom); R.put(ci, cj - 2, bloom); R.put(ci, cj - 1, heart); }
    }
  }
  body = { cv: toCanvas(R), x: x0, y: y0, w: pw / r, h: ph / r };
  GROUP_BODIES.set(key, body);
  return body;
};

// The live bits on a pond: glints drifting with the wind, a swamp bubble,
// the ice twinkling, lava bubbling.
const TWINKLE = new Map();
const twinkleSprite = (col, big) => {
  const key = col + big;
  let cv = TWINKLE.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = cv.height = 7;
  const c = cv.getContext("2d");
  c.fillStyle = col;
  c.fillRect(3, 3, 1, 1);
  c.fillRect(2, 3, 3, 1); c.fillRect(3, 2, 1, 3);
  if (big) { c.globalAlpha = 0.6; c.fillRect(1, 3, 5, 1); c.fillRect(3, 1, 1, 5); c.globalAlpha = 0.35; c.fillRect(0, 3, 7, 1); c.fillRect(3, 0, 1, 7); }
  TWINKLE.set(key, cv);
  return cv;
};
// a bubble in 4 frames: a bump, a dome with its light, a ring, a spatter
const BUBBLES = new Map();
const bubbleSprite = (lava, f) => {
  const key = `${lava}|${f}`;
  let cv = BUBBLES.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = cv.height = 8;
  const c = cv.getContext("2d");
  const [dk, md, lt] = lava ? ["#86281a", "#ee8430", "#fff0b8"] : ["#1e2a24", "#4a6a58", "#9ab8a0"];
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  if (f === 0) { px(3, 4, 2, 1, md); px(3, 5, 2, 1, dk); }
  else if (f === 1) { px(2, 3, 4, 2, md); px(2, 5, 4, 1, dk); px(3, 3, 1, 1, lt); }
  else if (f === 2) { px(1, 3, 1, 2, md); px(6, 3, 1, 2, md); px(2, 2, 4, 1, lt); px(2, 5, 4, 1, md); }
  else { px(0, 2, 1, 1, lt); px(7, 2, 1, 1, md); px(2, 0, 1, 1, md); px(5, 1, 1, 1, lt); px(3, 5, 2, 1, dk); }
  BUBBLES.set(key, cv);
  return cv;
};
const pondLive = (ctx, p, time, body) => {
  const rx = p.w / 2, ry = p.h / 2, s = body.s, ga = ctx.globalAlpha;
  const inside = (u, v) => u * u + v * v < 1;
  if (body.kind === "clear" || body.kind === "swamp") {
    const wa = body.pal, n = body.kind === "swamp" ? 2 : p.w >= 80 ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const P = 4 + hash(i, s + 1) * 3, tt = time + hash(i, s + 2) * P, cyc = Math.floor(tt / P), u = tt / P - cyc;
      const a = hash(i * 5 + cyc, s + 3) * Math.PI * 2, d = Math.sqrt(hash(i * 5 + cyc, s + 4)) * 0.62;
      const x = p.x + Math.cos(a) * rx * d + u * P * 2.5, y = p.y + Math.sin(a) * ry * d;
      if (!inside((x - p.x) / (rx * 0.8), (y - p.y) / (ry * 0.75))) continue;
      ctx.globalAlpha = ga * (u < 0.15 || u > 0.85 ? 0.34 : u < 0.3 || u > 0.7 ? 0.67 : 1) * 0.85;
      const type = hash(i, s + 5) < 0.3 ? 1 : 0;
      ctx.drawImage(markSprite(wa, type, 0), snapH(x) - MARK_SZ / 2, snapH(y) - MARK_SZ / 2, MARK_SZ, MARK_SZ);
    }
    if (body.kind === "swamp") {
      // now and then a bubble rises out of the muck
      const P = 3.4, tt = time + hash(s, 6) * P, cyc = Math.floor(tt / P), u = tt / P - cyc;
      if (u < 0.36) {
        const a = hash(cyc, s + 7) * Math.PI * 2, d = 0.3 + hash(cyc, s + 8) * 0.4;
        const f = Math.min(3, Math.floor(u / 0.09));
        ctx.globalAlpha = ga * 0.8;
        ctx.drawImage(bubbleSprite(false, f), snapH(p.x + Math.cos(a) * rx * d) - 2, snapH(p.y + Math.sin(a) * ry * d) - 2, 4, 4);
      }
    }
  } else if (body.kind === "ice") {
    for (let i = 0; i < 2; i++) {
      const w = Math.sin(time * (1.1 + i * 0.37) + i * 2.1 + p.x);
      if (w < 0.72) continue;
      const x = p.x + (hash(i, s + 20) - 0.55) * rx * 0.9, y = p.y + (hash(i, s + 21) - 0.6) * ry * 0.7;
      ctx.drawImage(twinkleSprite("#ffffff", w > 0.9), snapH(x) - 1.75, snapH(y) - 1.75, 3.5, 3.5);
    }
  } else if (body.kind === "lava") {
    const n = Math.max(3, Math.round(p.w * p.h / 500));
    for (let i = 0; i < n; i++) {
      const P = 1.4 + hash(i, s + 30) * 1.4, tt = time + hash(i, s + 31) * P, cyc = Math.floor(tt / P), u = tt / P - cyc;
      if (u > 0.62) continue;
      const a = hash(i * 7 + cyc, s + 32) * Math.PI * 2, d = Math.sqrt(hash(i * 7 + cyc, s + 33)) * 0.62;
      const f = Math.min(3, Math.floor(u / 0.155));
      ctx.drawImage(bubbleSprite(true, f), snapH(p.x + Math.cos(a) * rx * d) - 2, snapH(p.y + Math.sin(a) * ry * d) - 2, 4, 4);
    }
  }
  ctx.globalAlpha = ga;
};

// Still water, whole: the baked body stamped, then its live bits. (The board
// bakes the body into the ground and draws only the live bits.)
export const drawPond = (ctx, p, time) => {
  const body = pondBody(p);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(body.cv, body.x, body.y, body.w, body.h);
  ctx.imageSmoothingEnabled = sm;
  pondLive(ctx, p, time, body);
};

// ---- the board ----------------------------------------------------------------------

// The board's rivers, baked together (so where two meet they merge), with
// the rocks the current foams round.
const BOARD = { key: "", rocks: [] };
const boardKey = () => `${REALM.id}|${RIVERS.length}|${RIVERS[0]?.pts.length}|${PONDS.length}|${REALM.water?.deep}`;

// Painted once into the ground layer (world.js groundLayer, after the road
// and the chapter's road art): every pond and every river, still.
export const bakeWater = (ctx) => {
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const late = PONDS.map(pondBody).filter((b) => b.joined);
  // loose ponds, a group of overlapping ones painted as one water
  for (const ps of pondGroups()) {
    const b = ps.length > 1 ? groupBody(ps) : pondBody(ps[0]);
    ctx.drawImage(b.cv, b.x, b.y, b.w, b.h);
  }
  BOARD.key = boardKey();
  BOARD.rocks = [];
  const body = riverBody(RIVERS, REALM.water, [0, 0, W, H], RES);
  if (body) {
    ctx.drawImage(body.cv, body.x, body.y, body.w, body.h);
    BOARD.rocks = body.rocks;
  }
  // a pond painted with its river: what stands in it goes over the water
  for (const b of late) ctx.drawImage(b.cv, b.x, b.y, b.w, b.h);
  ctx.imageSmoothingEnabled = sm;
};

// Every frame, over the baked ground: the ponds' live bits, then the
// current on each river and the foam at its rocks.
const CLIP = [0, 0, W - WALL_W + 2, H];
export const drawWaterLive = (ctx, g) => {
  for (const p of PONDS) pondLive(ctx, p, g.time, pondBody(p));
  if (!RIVERS.length) return;
  const wa = REALM.water || DEFAULT_WATER;
  if (BOARD.key === boardKey()) drawRockFoam(ctx, BOARD.rocks, g.time, wa);
  for (const rv of RIVERS) drawCurrent(ctx, rv, g.time, wa, CLIP);
};
