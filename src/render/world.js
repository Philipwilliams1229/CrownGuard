// ============ RENDER: THE GROUND ============
// The static world — turf, its thousand small details, and the road —
// painted ONCE per realm into a high-resolution layer, then
// blitted every frame. Nothing here moves, so nothing here costs a frame.
//
// The detail is the point: zoomed in, the meadow is blades of grass, clover
// and daisies, and the road is packed earth with pebbles and damp patches.

import { W, H, PATH_HALF, RES, WALL_W, MX, MXR, mulberry32 } from "../data/constants.js";
// the ground's scatter is laid over the board's width before the castle's
// border widened, so every realm's turf looks as it did
const SW = W - (MXR - MX);
import { REALM } from "../data/maps.js";
import { PTS, nearestOnPath } from "../engine/path.js";
import { TUFTS, FLOWERS, SPECKS, PONDS, DECOR, inRiver, FOREST, forestDepthAt, COAST, coastLine, inSea, decorFootprint } from "../data/terrain.js";
import { lighten, darken, mix, rgb, hash, ball, bakeSprite, part, PX } from "./paint.js";
import { IRON_ART } from "./scenery-iron.js";
import { paintShore, drawShoreLive, coastTones, coastPixel } from "./coast.js";
import { paintRoad, drawRoadMarks } from "./road.js";
import { bakeWater } from "./water.js";
import { HOLLOW_ART } from "./scenery-hollow.js";
import { groundKind, pixelTuft, strawOf } from "./groundblend.js";
// a chapter's own ground art, keyed by REALM.groundArt (looked up when the
// ground is painted, never at load — see the import cycle note in scenery.js)
const artFor = (part, key) => IRON_ART[part]?.[key] || HOLLOW_ART[part]?.[key];

let layer = null;
let layerKey = "";

const inPond = (x, y, m = 0) =>
  PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 + m && Math.abs(y - p.y) < p.h / 2 + 6 + m)
  || !!(COAST && inSea(x, y, COAST.sand + m));

// Open turf: off the road, out of the water.
const clear = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && !inPond(x, y, m) && !inRiver(x, y, m) && forestDepthAt(x, y) < -6
  && !(COAST && inSea(x, y, COAST.sand + m));
// Open turf that no tree or rock stands on either (for the ground's own
// small features, which would only hide under them)
const open = (x, y, m) => clear(x, y, m) && !DECOR.some((d) => !d.forest && Math.hypot(d.x - x, (d.y - y) * 1.4) < decorFootprint(d) + m);

// ---- the turf ----
// The meadow is one tone map, not a pile of blotches: warped value noise cut
// into flat grass tones, darkened under trees, along the treeline and at the
// road's edge, and warmed toward the sun. It is painted straight into the
// layer's pixels — one buffer pixel is one art pixel (RES = PX = 2) — as a
// TONE INDEX into the realm's own ramp (7 tones, dark to light) and a
// TEMPERATURE (cool, plain, warm), so every detail laid on after it (blade
// flecks, clover, a fairy ring's dark band) is a step up or down that ramp:
// low-contrast, crisp, and right on meadow, snow, moor or ash alike.
//
// Where two tones meet they break up in short vertical strokes (a grass-
// blade dither, lit at the tip) instead of a screen-door pattern; the big
// swells are lit from the upper left (warm, a touch paler) and fall into
// cool hollows on their far sides.

// value noise on a coarse lattice, eased between its points
const lattice = (seed, cell) => {
  const gw = Math.ceil(W / cell) + 8, gh = Math.ceil(H / cell) + 8;
  const a = new Float32Array(gw * gh);
  for (let i = 0; i < a.length; i++) a[i] = hash(seed, i);
  return { a, gw, gh, cell };
};
const noise = (L, x, y) => {
  const fx = Math.max(0, x / L.cell + 3), fy = Math.max(0, y / L.cell + 3);
  const xi = Math.min(L.gw - 2, fx | 0), yi = Math.min(L.gh - 2, fy | 0);
  let u = Math.min(1, fx - xi), v = Math.min(1, fy - yi);
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const i = yi * L.gw + xi, A = L.a;
  return (A[i] * (1 - u) + A[i + 1] * u) * (1 - v) + (A[i + L.gw] * (1 - u) + A[i + L.gw + 1] * u) * v;
};
const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// the sea and sand (coast.js) keep the ordered dither they were built on
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const SHADY = new Set(["tree", "pine", "snowpine", "willow", "deadtree"]);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

// The blade dither: a 128px tile of short vertical strokes (2-4 px), each
// with its own random value and a lit top, so a tone's edge frays into grass
// blades. Exported for the apron (the landscape past the board), so the seam
// can use the very same pixels: DITH[(py & 127) * 128 + (px & 127)] - range
// about -0.56..0.58.
const DT = 128;
// strokes of `min`..`min+span-1` px down each column (or, `across`, along
// each row), each with its own value and a lit leading end
const strokeTile = (across, min, span, salt) => {
  const a = new Float32Array(DT * DT);
  for (let x = 0; x < DT; x++) {
    let y = -Math.floor(hash(x, salt + 1) * 4), s = 0;
    while (y < DT) {
      const len = min + Math.floor(hash(x * 131 + s, salt + 2) * span);
      const v = hash(x * 131 + s, salt + 3) - 0.5;
      for (let k = 0; k < len; k++) {
        const py = y + k;
        if (py >= 0 && py < DT) a[across ? x * DT + py : py * DT + x] = v + (k === 0 ? 0.08 : k === len - 1 ? -0.06 : 0);
      }
      y += len; s++;
    }
  }
  return a;
};
const DITH_BLADE = strokeTile(false, 2, 3, 900);
export const DITH = DITH_BLADE;
// Snow and ash break up in low WIND STREAKS instead (3-8 px along the rows),
// indexed the same way. turfTones(R).dith names the one a realm uses.
export const DITH_WIND = strokeTile(true, 3, 6, 930);

// Each kind of country's light: what its sunlit swells warm toward and its
// hollows cool toward (and how far), how strongly the swells are modelled,
// and how thick the blade flecks lie. `wind`: its tone edges fray in wind
// streaks, not blades; `lee`: the cool lies only in the lee of the swells
// (blue drifts under the crests), never in every low patch.
const LOOKS = {
  grass: { warm: "#e8d070", cool: "#2a6670", kw: 0.08, kc: 0.13, relief: 1, fleck: 0.34 },
  turf: { warm: "#dcc47c", cool: "#384c64", kw: 0.07, kc: 0.12, relief: 0.9, fleck: 0.3 },
  marsh: { warm: "#c8ba72", cool: "#244650", kw: 0.07, kc: 0.14, relief: 0.8, fleck: 0.3 },
  snow: { warm: "#fff8e8", cool: "#6a86c6", kw: 0.22, kc: 0.1, relief: 1.3, fleck: 0.3, wind: true, lee: true },
  ash: { warm: "#b0a494", cool: "#2e2a3c", kw: 0.06, kc: 0.14, relief: 0.8, fleck: 0.34, wind: true },
};
// the meadow's ramp: tones 1-4 are the tone map's own bands (as they always
// were — the apron matches them), 0 is deep shade, 5-6 are lit blade tips
export const meadowRamp = (R) => [darken(R.GRASS_DK, 0.3), darken(mix(R.GRASS, R.GRASS_DK, 0.85), 0.1), mix(R.GRASS, R.GRASS_DK, 0.4), R.GRASS, mix(R.GRASS, R.GRASS_LT, 0.34), mix(R.GRASS, R.GRASS_LT, 0.74), lighten(R.GRASS_LT, 0.2)];
// the wood's floor: tones 1-3 are the old floor bands, 4-6 leaf litter and
// sun-flecks
const floorRamp = (R) => {
  const f = darken(R.GRASS_DK, 0.52), lit = mix(f, "#8a6a3c", 0.45);
  return [darken(R.GRASS_DK, 0.72), darken(R.GRASS_DK, 0.62), f, mix(f, "#6a5432", 0.3), lit, mix(lit, R.GRASS, 0.4), mix(R.GRASS_DK, R.GRASS, 0.45)];
};
const withTemps = (ramp, L) => {
  const out = [];
  for (const c of ramp) out.push(hexRGB(mix(c, L.cool, L.kc)), hexRGB(c), hexRGB(mix(c, L.warm, L.kw)));
  return out;
};
// The turf's colours for a realm, for anything that must match it (the
// apron beyond the board): its look, and the meadow's and the wood floor's
// ramps as [r, g, b], indexed tone * 3 + temperature (0 cool, 1 plain, 2 warm).
export const turfTones = (R = REALM) => {
  const look = LOOKS[groundKind(R)] || LOOKS.grass;
  return { look, meadow: withTemps(meadowRamp(R), look), floor: withTemps(floorRamp(R), look), dith: look.wind ? DITH_WIND : DITH };
};

// Where the grass sits in shade: under lone trees (thrown down-right), along
// the wood's edge, a little along the road, and less toward the sun.
function shadeField() {
  const SC = 4, SW = Math.ceil(W / SC) + 2, SH = Math.ceil(H / SC) + 2;
  const sh = new Float32Array(SW * SH);
  const near = DECOR.filter((d) => !d.forest);
  // the road's distance on a coarse grid first: a fine sample only asks
  // the road itself when the coarse one says it might be close
  const CC = 16, CW = Math.ceil(W / CC) + 2, CH = Math.ceil(H / CC) + 2;
  const coarse = new Float32Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) coarse[j * CW + i] = nearestOnPath(i * CC, j * CC).d;
  for (let j = 0; j < SH; j++) {
    for (let i = 0; i < SW; i++) {
      const x = i * SC, y = j * SC;
      let v = 0.05 - 0.1 * (x / W * 0.55 + y / H * 0.45);
      const cd = coarse[Math.min(CH - 1, Math.round(y / CC)) * CW + Math.min(CW - 1, Math.round(x / CC))];
      const rd = cd - 12 > PATH_HALF + 16 ? 99 : nearestOnPath(x, y).d - PATH_HALF;
      if (rd < 16) v -= 0.06 * (1 - Math.max(0, rd) / 16);
      if (FOREST) { const fd = forestDepthAt(x, y); if (fd > -40) v -= 0.24 * Math.min(1, (fd + 40) / 40); }
      for (const d of near) {
        const s = d.s || 1, tree = SHADY.has(d.t);
        const r = (tree ? 17 : 10) * s;
        const dx = x - (d.x + (tree ? 7 : 3) * s), dy = (y - (d.y + (tree ? 7 : 8))) * 1.7;
        const q = (dx * dx + dy * dy) / (r * r);
        if (q < 4) v -= (tree ? 0.22 : 0.09) * Math.exp(-q * 1.3);
      }
      sh[j * SW + i] = v;
    }
  }
  return (x, y) => {
    const fx = Math.max(0, x / SC), fy = Math.max(0, y / SC);
    const xi = Math.min(SW - 2, fx | 0), yi = Math.min(SH - 2, fy | 0), u = fx - xi, v = fy - yi, k = yi * SW + xi;
    return (sh[k] * (1 - u) + sh[k + 1] * u) * (1 - v) + (sh[k + SW] * (1 - u) + sh[k + SW + 1] * u) * v;
  };
}

// The tone map itself, written straight into a pixel buffer. Returns the
// buffer's painter (G): the lushness field (low = dark, lush grass) for the
// scatter that follows, and pixel tools that step a pixel up or down its
// ramp or set it outright.
function paintToneMap(ctx, look) {
  const R = REALM, seed = R.seed | 0;
  const L1 = lattice(seed + 11, 70), L2 = lattice(seed + 23, 26), L3 = lattice(seed + 37, 9);
  const Wa = lattice(seed + 41, 110), Wb = lattice(seed + 53, 110);
  // pools of sun through the canopy: coarse, warped, frayed at the edge
  const Ld = lattice(seed + 67, 12), Le = lattice(seed + 71, 5);
  const shade = shadeField();
  // the fields are sampled every FS world units and eased between (the
  // finest noise is 9 units across, so nothing is lost)
  const FS = 2, FW = Math.ceil(W / FS) + 2, FH = Math.ceil(H / FS) + 2;
  const field = new Float32Array(FW * FH);
  const swell = new Float32Array(FW * FH);
  const pools = FOREST ? new Float32Array(FW * FH) : null;
  for (let j = 0; j < FH; j++) {
    const y = j * FS;
    for (let i = 0; i < FW; i++) {
      const x = i * FS;
      const wx = (noise(Wa, x, y) - 0.5) * 44, wy = (noise(Wb, x, y) - 0.5) * 44;
      const s = noise(L1, x + wx, y + wy) * 0.56 + noise(L2, x + wx * 0.5, y + wy * 0.5) * 0.3;
      swell[j * FW + i] = s;
      field[j * FW + i] = s + noise(L3, x, y) * 0.14 + shade(x, y);
      if (pools) pools[j * FW + i] = noise(Ld, x + wx * 0.35 + y * 0.3, y + wy * 0.35) * 0.8 + noise(Le, x, y) * 0.2;
    }
  }
  // the sun on the swells: a slope facing up-left (the ground rising toward
  // the lower right) is lit, one facing down-right is in its own shade
  const sun = new Float32Array(FW * FH);
  const gain = 34 * look.relief;
  for (let j = 0; j < FH; j++) {
    const ya = Math.max(0, j - 2) * FW, yb = Math.min(FH - 1, j + 2) * FW;
    for (let i = 0; i < FW; i++) {
      const xa = Math.max(0, i - 2), xb = Math.min(FW - 1, i + 2);
      const gx = (swell[j * FW + xb] - swell[j * FW + xa]) / (4 * FS), gy = (swell[yb + i] - swell[ya + i]) / (4 * FS);
      const v = (gx * 0.42 + gy * 0.58) * gain;
      sun[j * FW + i] = v < -1 ? -1 : v > 1 ? 1 : v;
    }
  }
  const pal = [withTemps(meadowRamp(R), look), withTemps(floorRamp(R), look)];
  const PW = W * RES, PH = H * RES;
  const img = ctx.createImageData(PW, PH);
  const d = img.data;
  const tone = new Uint8Array(PW * PH), temp = new Uint8Array(PW * PH), reg = new Uint8Array(PW * PH);
  const bound = FOREST ? new Float32Array(FOREST.edge === "left" ? PH : PW) : null;
  // the coast: the waterline for every pixel along its edge, then the sea
  // shaded by how far out it lies — foam, shallows, the blue, the deep — and
  // the beach: wet dark sand at the water, pale dry sand above it
  const alongX = COAST && (COAST.edge === "top" || COAST.edge === "bottom");
  const shore = COAST ? new Float32Array(alongX ? PW : PH) : null;
  if (shore) for (let i = 0; i < shore.length; i++) shore[i] = coastLine(i / RES);
  const sandW = COAST ? COAST.sand : 0;
  const tones = COAST ? coastTones(R) : null;
  if (bound) for (let i = 0; i < bound.length; i++) bound[i] = FOREST.edge === "left" ? forestDepthAt(0, i / RES) : forestDepthAt(i / RES, 0);
  const warmth = look.relief * 0.035;
  // per column: where it falls on the field grid (the loop below is the
  // bake's hot spot — 1.9M pixels — so it keeps to lookups and a little sum)
  const colX0 = new Int32Array(PW), colU = new Float32Array(PW);
  for (let px = 0; px < PW; px++) { const fx = px / RES / FS; colX0[px] = fx | 0; colU[px] = fx - (fx | 0); }
  const edgeLeft = FOREST && FOREST.edge === "left";
  const DITH = look.wind ? DITH_WIND : DITH_BLADE, lee = !!look.lee;
  for (let py = 0; py < PH; py++) {
    const y = py / RES, fy = y / FS, y0 = fy | 0, v = fy - y0, row = y0 * FW, drow = (py & 127) * DT, trow = ((py + 71) & 127) * DT;
    const bz = (py & 3) * 4, bRow = bound && edgeLeft ? bound[py] : 0;
    for (let px = 0; px < PW; px++) {
      const u = colU[px], k = row + colX0[px];
      const w01 = (1 - u) * v, w11 = u * v, w00 = (1 - u) - w01, w10 = u - w11;
      const t = field[k] * w00 + field[k + 1] * w10 + field[k + FW] * w01 + field[k + FW + 1] * w11;
      const dz = DITH[drow + (px & 127)];
      const i = py * PW + px, o = i << 2;
      let c;
      if (tones) {
        // the sea and the beach (coast.js) take the pixel when it's theirs
        const x = px / RES;
        const sd = COAST.edge === "top" ? shore[px] - y : COAST.edge === "bottom" ? shore[px] - (H - y) : COAST.edge === "left" ? shore[py] - x : shore[py] - (W - x);
        c = coastPixel(tones, sd, t, BAYER[bz + (px & 3)], sandW, x, y);
      }
      if (c) {
        reg[i] = 2;
      } else {
        const sn = sun[k] * w00 + sun[k + 1] * w10 + sun[k + FW] * w01 + sun[k + FW + 1] * w11;
        const dt = DITH[trow + ((px + 53) & 127)];
        const depth = !bound ? -999 : edgeLeft ? bRow - px / RES : bound[px] - y;
        let tn, r = 0;
        if (depth + dz * 7 > 0) {
          // the wood's floor, with the odd fleck of sun through the canopy
          const tt = t + dz * 0.1;
          tn = tt < 0.36 ? 1 : tt < 0.5 ? 2 : 3;
          if (depth > 6 && tn < 3) {
            const pl = pools[k] * w00 + pools[k + 1] * w10 + pools[k + FW] * w01 + pools[k + FW + 1] * w11 + dt * 0.25 + dz * 0.06;
            if (pl > 0.63) tn += pl > 0.72 ? 2 : 1;
          }
          r = 1;
        } else {
          const tt = t + sn * warmth + dz * 0.07;
          tn = tt < 0.23 ? 1 : tt < 0.36 ? 2 : tt < 0.63 ? 3 : 4;
        }
        const wv = sn + (t - 0.47) * 1.3 + dt * 0.22;
        const tp = (lee ? sn + dt * 0.3 < -0.45 : wv < -0.42) ? 0 : wv > 0.42 ? 2 : 1;
        tone[i] = tn; temp[i] = tp; reg[i] = r;
        c = pal[r][tn * 3 + tp];
      }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  // ---- the pixel tools every detail below paints with ----
  const put = (i, c) => { const o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
  const G = {
    PW, PH, pal, tone, temp, reg,
    lush: (x, y) => field[Math.min(FH - 1, Math.max(0, Math.round(y / FS))) * FW + Math.min(FW - 1, Math.max(0, Math.round(x / FS)))],
    sun: (x, y) => sun[Math.min(FH - 1, Math.max(0, Math.round(y / FS))) * FW + Math.min(FW - 1, Math.max(0, Math.round(x / FS)))],
    // step one pixel up (+) or down (-) its own ramp
    shift(px, py, dt) {
      if (px < 0 || py < 0 || px >= PW || py >= PH) return;
      const i = py * PW + px, r = reg[i];
      if (r > 1) return;
      const n = Math.max(0, Math.min(6, tone[i] + dt));
      tone[i] = n; put(i, pal[r][n * 3 + temp[i]]);
    },
    // cool (0) or warm (2) one pixel without changing its tone
    tint(px, py, tp) {
      if (px < 0 || py < 0 || px >= PW || py >= PH) return;
      const i = py * PW + px, r = reg[i];
      if (r > 1) return;
      temp[i] = tp; put(i, pal[r][tone[i] * 3 + tp]);
    },
    // paint one pixel an outright colour ([r, g, b]); never on the sea or sand
    set(px, py, c) {
      if (px < 0 || py < 0 || px >= PW || py >= PH) return;
      const i = py * PW + px;
      if (reg[i] === 2) return;
      reg[i] = 4 | (reg[i] & 1); put(i, c);
    },
    // the colour a pixel would take a step or two along its ramp
    at(px, py, dt = 0) {
      const i = Math.max(0, Math.min(PH - 1, py)) * PW + Math.max(0, Math.min(PW - 1, px)), r = reg[i] & 1;
      return pal[r][Math.max(0, Math.min(6, tone[i] + dt)) * 3 + temp[i]];
    },
    isTurf(px, py) { return px >= 0 && py >= 0 && px < PW && py < PH && reg[py * PW + px] < 2; },
    flush() { ctx.putImageData(img, 0, 0); },
  };
  return G;
}

// ---- pixel drawing on the turf -----------------------------------------------
const P = (v) => Math.round(v * RES);
// a tiny sprite: rows of characters, each looked up in `map` — a number steps
// that pixel along the ramp, an [r, g, b] paints it outright, "." skips it
const stampRows = (G, px, py, rows, map) => {
  for (let j = 0; j < rows.length; j++) {
    const s = rows[j];
    for (let i = 0; i < s.length; i++) {
      const m = map[s[i]];
      if (m === undefined) continue;
      if (typeof m === "number") G.shift(px + i, py + j, m);
      else G.set(px + i, py + j, m);
    }
  }
};
// a lit pixel ellipse (a stone, a mound): three tones by which way each
// pixel faces, sun from the upper left, and its shadow stepped into the turf
const pixBall = (G, x, y, rx, ry, cols, o = {}) => {
  const cx = P(x), cy = P(y), RX = Math.max(1, rx * RES), RY = Math.max(1, ry * RES);
  const sh = o.shadow ?? -2;
  if (sh) {
    for (let j = -Math.ceil(RY); j <= Math.ceil(RY) + 2; j++) {
      for (let i = -Math.ceil(RX); i <= Math.ceil(RX) + 2; i++) {
        const a = (i - 1.2) / (RX + 0.6), b = (j - 1.2) / (RY + 0.4);
        if (a * a + b * b <= 1 && (i / RX) ** 2 + (j / RY) ** 2 > 1) G.shift(cx + i, cy + j, sh);
      }
    }
  }
  for (let j = -Math.ceil(RY); j <= Math.ceil(RY); j++) {
    for (let i = -Math.ceil(RX); i <= Math.ceil(RX); i++) {
      const a = i / RX, b = j / RY, q = a * a + b * b;
      if (q > 1) continue;
      const lit = -(a * 0.5 + b * 0.75) + (o.cap && b < -0.1 ? 0.6 : 0);
      const c = o.cap && b < (o.capLine ?? -0.15) ? (lit > 0.5 ? o.cap[0] : o.cap[1])
        : lit > 0.42 ? cols[0] : lit > -0.3 || q < 0.35 ? cols[1] : cols[2];
      G.set(cx + i, cy + j, c);
    }
  }
};
// a clump of grass: blades fanned from one root, the sun-side ones lit, a
// little shade stepped into the turf at its foot (groundblend.js draws the
// same clump round the halls' footings)
const pixTuft = (G, x, y, s, seed, cols, o = {}) =>
  pixelTuft((px, py, c) => G.set(px, py, c), (px, py) => G.shift(px, py, -1), P(x), P(y), s, seed, cols, o);

// ---- the ground's features, kind by kind ---------------------------------------
const C = (c) => hexRGB(c);
const SOIL = [C("#3a2a22"), C("#57402e"), C("#735640"), C("#927254")];

// a molehill: a crumbly mound of fresh earth, lit from the upper left, its
// shadow stepped into the turf, and crumbs thrown round it
const molehill = (G, x, y, s, seed) => {
  const cx = P(x), cy = P(y), RX = 3.3 * s * RES, RY = 2.3 * s * RES;
  for (let j = -Math.ceil(RY); j <= Math.ceil(RY) + 2; j++) {
    for (let i = -Math.ceil(RX); i <= Math.ceil(RX) + 2; i++) {
      const a = i / RX, b = j / RY, q = a * a + b * b;
      const qs = ((i - 1.5) / RX) ** 2 + ((j - 1.5) / RY) ** 2;
      if (q > 1) { if (qs <= 1) G.shift(cx + i, cy + j, -2); continue; }
      // the mound's height (a dome) lit from the sun, broken into crumbs
      const lit = -(a * 0.55 + b * 0.8) * (1 - q * 0.3) + (hash(cx + i, cy * 3 + j) - 0.5) * 0.7;
      G.set(cx + i, cy + j, SOIL[lit > 0.55 ? 3 : lit > 0 ? 2 : lit > -0.55 ? 1 : 0]);
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = hash(seed, i) * Math.PI * 2, r = 3.8 + hash(seed, i + 9) * 3;
    const px = P(x + Math.cos(a) * r * s), py = P(y + Math.sin(a) * r * 0.6 * s);
    G.set(px, py, SOIL[hash(seed, i + 20) < 0.55 ? 3 : 2]);
    if (hash(seed, i + 30) < 0.5) G.set(px + 1, py, SOIL[1]);
    G.shift(px + 1, py + 1, -1);
  }
};
// bare earth worn through the turf: a low patch with an uneven edge, the
// turf's lip shading its upper-left side and a pebble or two in it; the
// grass round it frays over the edge
const scuff = (G, x, y, rx, ry, seed, cols) => {
  const cx = P(x), cy = P(y), RX = rx * RES, RY = ry * RES;
  const wobA = hash(seed, 1) * 6.3, wobB = hash(seed, 2) * 6.3;
  for (let j = -Math.ceil(RY) - 2; j <= Math.ceil(RY) + 2; j++) {
    for (let i = -Math.ceil(RX) - 2; i <= Math.ceil(RX) + 2; i++) {
      const a = i / RX, b = j / RY;
      const ang = Math.atan2(b, a), wob = 0.9 + 0.08 * Math.sin(ang * 3 + wobA) + 0.05 * Math.sin(ang * 5 + wobB) + (hash(cx + i, cy + j + seed) - 0.5) * 0.06;
      const q = Math.sqrt(a * a + b * b) / wob;
      if (q > 1.12) continue;
      if (q > 1) { if (a * 0.5 + b * 0.8 > 0.2) G.shift(cx + i, cy + j, 1); continue; }   // the lit lip on the far side
      const n = hash(cx + i, (cy + j) * 7 + seed);
      const edge = q > 0.72 && a * 0.5 + b * 0.8 < -0.25;         // in the lip's shade
      G.set(cx + i, cy + j, edge || n < 0.1 ? cols[2] : n > 0.9 ? cols[0] : cols[1]);
    }
  }
  for (let k = 0; k < 3; k++) {
    const px = cx + Math.round((hash(seed, k + 30) - 0.5) * RX), py = cy + Math.round((hash(seed, k + 33) - 0.3) * RY * 0.8);
    G.set(px, py, C("#d8ccb4")); G.set(px + 1, py, C("#b0a48c")); G.set(px + 1, py + 1, cols[2]);
  }
  // blades fraying over the rim, rooted in the turf just outside it
  for (let k = 0; k < 14; k++) {
    const a = hash(seed, k + 40) * Math.PI * 2;
    const px = cx + Math.round(Math.cos(a) * RX * 1.06), py = cy + Math.round(Math.sin(a) * RY * 1.1);
    if (Math.sin(a) < -0.3) continue;
    const base = G.at(px, py + 3, 0), lean = k & 1;
    G.set(px, py, G.at(px, py + 3, -1)); G.set(px, py - 1, base); G.set(px + lean, py - 2, G.at(px, py + 3, 2));
  }
};
// a small stone half sunk in the turf
const pebble = (G, x, y, r, col, cap) => {
  const c = rgb(col);
  const cols = [rgb(lighten(col, 0.38)), c, rgb(darken(col, 0.38))];
  pixBall(G, x, y, r, r * 0.66, cols, cap ? { cap, capLine: -0.05, shadow: -2 } : { shadow: -2 });
};
// three round leaflets of clover in a Y, each a 2x2 lit from the upper left
// (L lit, m mid, D its shaded corner) round a dark heart; mirrored now and
// then so a colony isn't a row of one stamp
const CLOVER = [["Lm.Lm", "mDdmD", "..Lm.", "..mD."], ["Lm.Lm", "mDdmD", ".Lm..", ".mD.."]];
const cloverLeaf = (G, x, y, cols, flowerC, v = 0) => {
  stampRows(G, P(x) - 2, P(y) - 2, CLOVER[v & 1], { L: cols[0], m: cols[1], D: cols[2], d: cols[3] || cols[2] });
  if (flowerC) stampRows(G, P(x), P(y) - 4, ["fF", "Fd"], { f: flowerC[0], F: flowerC[1], d: flowerC[2] });
};
// wildflowers: a round head (the main flower) or a small star (its kin)
const FLOWER_SMALL = [".L.", "LCP", ".D."];
// a head of five round petals set round a warm eye at fixed places on the
// ring (up, up-right, down-right, down-left, up-left), a notch between each;
// the upper-left petals catch the sun. `r` 2 is the usual head, 3 a
// landmark flower that still reads at 1x
const PETALS = [-90, -18, 54, 126, 198].map((d) => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)]);
const petalHead = (G, cx, cy, col, centre, r = 2) => {
  const lit = rgb(lighten(col, 0.42)), c = rgb(col), dk = rgb(darken(col, 0.3)), eye = rgb(centre), eyeDk = rgb(darken(centre, 0.3));
  const pr = r * 0.95, rad = r * 0.62 + 0.55, B = r + 2;
  for (let j = -B; j <= B; j++) {
    for (let i = -B; i <= B; i++) {
      const d0 = Math.hypot(i, j);
      if (d0 <= r * 0.42) { G.set(cx + i, cy + j, i + j < 0 || r < 3 ? eye : eyeDk); continue; }
      let best = 99, second = 99, bp = null;
      for (const p of PETALS) {
        const q = Math.hypot(i - p[0] * pr, j - p[1] * pr);
        if (q < best) { second = best; best = q; bp = p; } else if (q < second) second = q;
      }
      if (best > rad) continue;
      if (second - best < 0.45 && d0 > r * 0.9) continue;          // the notch between two petals
      const sunny = bp[0] * 0.5 + bp[1] * 0.8 < -0.2;               // an upper-left petal
      const rim = (i - bp[0] * pr) * 0.5 + (j - bp[1] * pr) * 0.8;  // which side of the petal faces the sun
      G.set(cx + i, cy + j, sunny && rim < 0.3 ? lit : !sunny && rim > 0.2 ? dk : c);
    }
  }
};
const flowerHead = (G, x, y, col, big, stemC, centre, seed = 0) => {
  const cx = P(x), cy = P(y);
  const stem = big > 1 ? 6 : big ? 5 : 2;
  // a little shade on the turf, the stem, a leaf
  for (let i = 0; i < (big ? 5 : 2); i++) G.shift(cx + 1 + i, cy + 1, -1);
  for (let k = 0; k < stem; k++) G.set(cx, cy - k, stemC[k === 0 ? 0 : 1]);
  if (big) {
    G.set(cx + 1, cy - 1, stemC[1]); G.set(cx + 2, cy - 2, stemC[2]); G.set(cx - 1, cy - 2, stemC[1]); G.set(cx - 2, cy - 3, stemC[2]);
    petalHead(G, cx, cy - stem - (big > 1 ? 3 : 2), col, centre, big > 1 ? 3 : 2);
  } else {
    stampRows(G, cx - 1, cy - stem - 2, FLOWER_SMALL, { L: rgb(lighten(col, 0.4)), P: rgb(col), D: rgb(darken(col, 0.32)), C: rgb(centre) });
  }
};
const DAISY = [".w.", "wYs", ".s."];
// one mushroom of a fairy ring (or of the wood's floor)
const mushroom = (G, x, y, big, cols) => {
  const cx = P(x), cy = P(y);
  G.shift(cx + 1, cy + 1, -1); G.shift(cx + 2, cy + 1, -1);
  G.set(cx, cy, cols[3]); G.set(cx, cy - 1, cols[3]);
  if (big) stampRows(G, cx - 2, cy - 3, [".LLc.", "LccdD"], { L: cols[0], c: cols[1], d: cols[2], D: cols[2] });
  else stampRows(G, cx - 1, cy - 2, ["Lc.", "ccd"], { L: cols[0], c: cols[1], d: cols[2] });
};

// Every detail of the turf, in the pixel buffer: blade flecks in drifts, the
// odd molehill and scuffed patch, a fairy ring, stones, clover and daisies,
// leaves under the trees, the wood's litter, tufts and wildflowers.
function paintDetail(G, look, kind, rng) {
  const R = REALM, seed = R.seed | 0;
  const chapter = !!R.groundArt;
  const burnt = kind === "grass" && R.ambient === "embers";
  const PW = G.PW, PH = G.PH;
  const drift = lattice(seed + 61, 36);

  // ---- the fleck layer: tiny blades (or wind ripples, or cinders) gathered
  // into drifts, calm open ground between them
  const step = 5;
  if (kind === "snow") {
    // wind-carved ridges, in rows along the one wind (from the west, rising
    // a little to the east), thick in the drifts and gone on open snow: each
    // a lit crest over a blue lee, long or short, low or high, some running
    // into the next
    const tilt = -0.12;
    for (let ry = 0; ry < PH + PW * 0.12; ry += 6) {
      let px = Math.floor(hash(ry, seed + 5) * 24) - 12, run = 0;
      while (px < PW) {
        const h0 = hash(px * 3 + 1, ry * 7 + seed), h3 = hash(px + 11, ry + 3), h4 = hash(px + 1, ry + 4);
        const py = ry + Math.round(px * tilt) + Math.round((hash(px, ry + 9) - 0.5) * 3);
        const len = 5 + Math.floor(Math.pow(h3, 1.4) * 13);
        const dr = G.isTurf(px, py) ? smooth01((noise(drift, px / RES, py / RES) - 0.3) / 0.45) : 0;
        if (h0 < 0.42 * dr * dr && G.isTurf(px + len, py)) {
          // low and long: a crest one pixel proud (two on the longest), its
          // lee — the downwind end — in blue shade
          const ah = len > 11 && h4 < 0.5 ? 2 : 1, sk = 0.6 + h4 * 0.6;
          for (let k = 0; k < len; k++) {
            const f = k / (len - 1), yy = py - Math.round(ah * Math.sin(Math.PI * Math.pow(f, sk)));
            if (k > 0 && k < len - 1) G.shift(px + k, yy, 1);
            if (f > 0.3) { G.shift(px + k, yy + 1, -1); G.tint(px + k, yy + 1, 0); }
          }
          run++;
          // now and then the next ridge carries straight on from this one
          px += len + (run < 3 && hash(px, ry + 17) < 0.3 ? 0 : 3 + Math.floor(hash(px, ry + 13) * 20));
        } else { run = 0; px += 4 + Math.floor(hash(px, ry + 15) * 10); }
      }
    }
  }
  for (let cy = 0; cy < PH && kind !== "snow"; cy += step) {
    for (let cx = 0; cx < PW; cx += step) {
      const h0 = hash(cx * 7 + 3, cy * 13 + seed);
      const px = cx + Math.floor(hash(cx, cy + 71) * step), py = cy + Math.floor(hash(cx + 5, cy + 72) * step);
      if (!G.isTurf(px, py)) continue;
      const x = px / RES, y = py / RES;
      const dr = smooth01((noise(drift, x, y) - 0.28) / 0.5);
      const h3 = hash(px, py + 3), h4 = hash(px + 1, py + 4);
      if (h0 > look.fleck * (0.04 + 1.5 * dr * dr)) continue;
      if (kind === "ash" || burnt) {
        // cinders and pale ash
        if (h3 < 0.55) { G.shift(px, py, burnt ? -1 : -2); if (h4 < 0.5) G.shift(px + 1, py, -1); }
        else if (h3 < 0.85) { G.shift(px, py, 1); G.shift(px + 1, py, 1); }
        else { G.shift(px, py, -1); G.shift(px, py - 1, -1); G.shift(px + (h4 < 0.5 ? 1 : 0), py - 2, 1); }
      } else {
        // a blade or two: a short dark stroke with a lit tip; or just a lit
        // tip catching the sun
        if (h3 < 0.3) { G.shift(px, py, 1); if (h4 < 0.5) G.shift(px + 1, py - 1, 1); continue; }
        const len = 2 + Math.floor(h3 * 2.2), lean = h4 < 0.4 ? 1 : 0;
        for (let k = 0; k < len - 1; k++) G.shift(px, py - k, -1);
        G.shift(px + lean, py - len + 1, 1);
        if (h4 > 0.75) { G.shift(px - 2, py, -1); G.shift(px - 3, py - 1, 1); }
      }
    }
  }

  // the Greenwood's grassy boards get their small features; a chapter with
  // its own turf art (Iron, Fen) keeps just the tone map and the scatter
  const feats = !chapter;
  const placed = [];
  const spot = (m, tries = 60) => {
    for (let t = 0; t < tries; t++) {
      const x = 24 + rng() * (SW - 48), y = 24 + rng() * (H - 48);
      if (!open(x, y, m) || placed.some((p) => Math.hypot(p[0] - x, p[1] - y) < p[2] + m + 12)) continue;
      placed.push([x, y, m]);
      return [x, y];
    }
    return null;
  };

  // ---- a fairy ring: a band of darker, lusher grass and pale caps on it
  if (feats && (kind === "grass" || kind === "marsh") && !burnt) {
    const at = spot(20);
    if (at) {
      const [fx, fy] = at, rx = 9 + rng() * 5, ry = rx * 0.62;
      const cx = P(fx), cy = P(fy), RX = rx * RES * 1.15, RY = ry * RES * 1.15;
      // the ring is never true: its radius wanders (±15%) and it breaks
      // off in a gap or two
      const ph = [rng() * 6.3, rng() * 6.3, rng() * 6.3], gap = [rng() * 6.3, rng() * 6.3], nGap = 1 + (rng() < 0.5 ? 1 : 0);
      const wob = (a) => 1 + 0.09 * Math.sin(a * 2 + ph[0]) + 0.05 * Math.sin(a * 3 + ph[1]) + 0.03 * Math.sin(a * 5 + ph[2]);
      const inGap = (a) => { for (let g = 0; g < nGap; g++) { const d = Math.abs(((a - gap[g] + 9.42) % 6.283) - 3.14); if (d < 0.28 + g * 0.1) return true; } return false; };
      for (let j = -Math.ceil(RY) - 4; j <= Math.ceil(RY) + 4; j++) {
        for (let i = -Math.ceil(RX) - 4; i <= Math.ceil(RX) + 4; i++) {
          const a = Math.atan2(j / RY, i / RX);
          if (inGap(a)) continue;
          const q = Math.hypot(i / RX, j / RY) * 1.15 / wob(a) + (hash(cx + i, cy + j) - 0.5) * 0.08;
          if (q > 0.86 && q < 1.1) G.shift(cx + i, cy + j, -1);
          else if (q <= 0.86 && q > 0.7 && hash(i, j + 5) < 0.35) G.tint(cx + i, cy + j, 2);
        }
      }
      const caps = [C("#fff3d2"), C("#e6d6b4"), C("#b89c78"), C("#d8ccb0")];
      const n = 10 + Math.floor(rng() * 5);
      const list = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.6;
        if (inGap(a) || rng() < 0.15) continue;
        const w = wob(a) * (0.94 + rng() * 0.1);
        list.push([fx + Math.cos(a) * rx * w, fy + Math.sin(a) * ry * w, rng() < 0.3]);
      }
      list.sort((a, b) => a[1] - b[1]).forEach(([x, y, big]) => mushroom(G, x, y, big, caps));
    }
  }

  // ---- molehills and scuffed earth (a thaw patch on snow, soot on ash)
  if (feats) {
    const nMole = kind === "grass" && !burnt ? 1 + Math.floor(rng() * 2) : 0;
    for (let i = 0; i < nMole; i++) {
      const at = spot(16);
      if (!at) continue;
      // the mole's run: a faint raised ridge of turf wandering between a
      // fresh hill and a smaller, older one (lit along its crest)
      const a = rng() * Math.PI * 2, far = 13 + rng() * 6;
      const bx = at[0] + Math.cos(a) * far, by = at[1] + Math.sin(a) * far * 0.6;
      const twoHills = open(bx, by, 6);
      const ex = twoHills ? bx : at[0] + Math.cos(a) * 8, ey = twoHills ? by : at[1] + Math.sin(a) * 5;
      const steps = Math.round(Math.hypot(P(ex) - P(at[0]), P(ey) - P(at[1]))), bend = (rng() - 0.5) * 6;
      for (let k = 0; k <= steps; k++) {
        const f = k / Math.max(1, steps);
        const px = Math.round(P(at[0]) + (P(ex) - P(at[0])) * f - Math.sin(a) * Math.sin(f * Math.PI) * bend);
        const py = Math.round(P(at[1]) + (P(ey) - P(at[1])) * f + Math.cos(a) * Math.sin(f * Math.PI) * bend * 0.6);
        G.shift(px, py - 1, 1); G.shift(px, py, 1); G.shift(px, py + 1, -1);
      }
      molehill(G, at[0], at[1], 1.05 + rng() * 0.25, i * 17 + seed);
      if (twoHills) molehill(G, bx, by, 0.62 + rng() * 0.15, i * 17 + 5 + seed);
    }
    const nScuff = kind === "snow" ? 0 : 2 + Math.floor(rng() * 3);
    const scuffCols = kind === "snow" ? [C("#a8a088"), C("#8a846e"), C("#6a6656")]
      : kind === "ash" ? [C("#5a4c44"), C("#3e3430"), C("#2a2226")]
      : burnt ? [C(mix(R.GRASS_DK, "#6a5c50", 0.5)), C(mix(R.GRASS_DK, "#4a3e36", 0.45)), C(mix(R.GRASS_DK, "#2e2628", 0.4))]
      : kind === "marsh" ? [C("#5a4a36"), C("#44382a"), C("#30281f")]
      : [C("#a4845a"), C("#8a6a48"), C("#6a4e36")];
    for (let i = 0; i < nScuff; i++) {
      const at = spot(12);
      const rx = 4 + rng() * 3.5;
      if (at) scuff(G, at[0], at[1], rx, rx * (0.56 + rng() * 0.1), i * 31 + seed, scuffCols);
    }
  }

  // ---- the moor: heather in low patches, a few sprigs straying from each
  if (feats && kind === "marsh") {
    // a few low cushions, each laid first as a darker, cooler hump in the
    // turf, then crowded with sprigs that touch — lit bells on the sun side,
    // and a few strays at the rim
    const heath = [C("#b08aa0"), C("#80607a"), C("#5e4658"), C(darken(R.GRASS_DK, 0.3)), C("#c8a0b4"), C("#4a3648")];
    const nPatch = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < nPatch; i++) {
      const at = spot(16, 80);
      if (!at) continue;
      const [hx, hy] = at, rx = 10 + rng() * 8, ry = rx * (0.5 + rng() * 0.12);
      const cx = P(hx), cy = P(hy), RX = rx * RES, RY = ry * RES, s1 = rng() * 6.3, s2 = rng() * 6.3;
      const edge = (a) => 0.82 + 0.12 * Math.sin(a * 2 + s1) + 0.07 * Math.sin(a * 3 + s2);
      for (let j = -Math.ceil(RY) - 2; j <= Math.ceil(RY) + 2; j++) {
        for (let k = -Math.ceil(RX) - 2; k <= Math.ceil(RX) + 2; k++) {
          const a = k / RX, b = j / RY, q = Math.hypot(a, b) / edge(Math.atan2(b, a)) + (hash(cx + k, cy + j) - 0.5) * 0.16;
          if (q > 1.12) continue;
          if (!clear((cx + k) / RES, (cy + j) / RES, 1)) continue;
          const lit = -(a * 0.5 + b * 0.8), h = hash(cx + k, (cy + j) * 3 + 7);
          // its shadow on the turf, down-right; then the low mass of the
          // heather itself, lit on its upper-left shoulder
          if (q > 0.96) { if (lit < 0) G.shift(cx + k, cy + j, -1); continue; }
          G.set(cx + k, cy + j, heath[lit > 0.45 && h > 0.3 ? 1 : lit < -0.35 || h < 0.18 ? 5 : 2]);
        }
      }
      const n = Math.round(rx * ry * (0.2 + rng() * 0.08)), list = [];
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, r = (k < n - 5 ? Math.sqrt(rng()) * 0.85 : 1 + rng() * 0.35) * edge(a);
        list.push([hx + Math.cos(a) * rx * r, hy + Math.sin(a) * ry * r, a, r]);
      }
      list.sort((a, b) => a[1] - b[1]).forEach(([x, y, a, r], k) => {
        if (!clear(x, y, 2)) return;
        const px = P(x), py = P(y), lit = Math.cos(a) * 0.5 + Math.sin(a) * 0.8 < -0.2 && r > 0.3;
        // a sprig: dark stems, a crown of bells lit on the sun side
        G.set(px, py, heath[3]); G.set(px + 1, py, heath[3]); G.shift(px + 2, py, -1);
        G.set(px - 1, py - 1, heath[1]); G.set(px, py - 1, heath[1]); G.set(px + 1, py - 1, heath[2]); G.set(px + 2, py - 1, heath[2]);
        G.set(px - 1, py - 2, lit ? heath[4] : heath[0]); G.set(px, py - 2, heath[0]); G.set(px + 1, py - 2, heath[1]);
        if (k & 1) G.set(px, py - 3, lit ? heath[4] : heath[0]);
      });
    }
  }
  // ---- snow: drifted-over hummocks, and a fox's line of prints across it
  if (feats && kind === "snow") {
    for (let i = 0; i < 7; i++) {
      const at = spot(10);
      if (!at) continue;
      const cx = P(at[0]), cy = P(at[1]), RX = (5 + rng() * 5) * RES, RY = RX * (0.45 + rng() * 0.15);
      for (let j = -Math.ceil(RY) - 2; j <= Math.ceil(RY) + 2; j++) {
        for (let k = -Math.ceil(RX) - 2; k <= Math.ceil(RX) + 2; k++) {
          const a = k / RX, b = j / RY, q = a * a + b * b;
          if (q > 1.25) continue;
          // (its light and lee fray in the same wind streaks as the snow)
          const lit = -(a * 0.5 + b * 0.8) + DITH_WIND[((cy + j) & 127) * DT + ((cx + k) & 127)] * 0.3, qq = q + DITH_WIND[((cy + j + 40) & 127) * DT + ((cx + k + 9) & 127)] * 0.25;
          if (qq <= 1 && lit > 0.25) G.shift(cx + k, cy + j, lit > 0.6 ? 2 : 1);
          else if (qq > 0.55 && qq < 1.2 && lit < -0.2) { G.shift(cx + k, cy + j, -1); G.tint(cx + k, cy + j, 0); }
        }
      }
    }
    for (let trail = 0; trail < 2; trail++) {
      let x = 40 + rng() * (SW - 80), y = 40 + rng() * (H - 80), a = rng() * Math.PI * 2;
      for (let k = 0; k < 34; k++) {
        a += (rng() - 0.5) * 0.5;
        x += Math.cos(a) * 3.2; y += Math.sin(a) * 2.2;
        if (!clear(x, y, 2)) continue;
        const side = k & 1 ? 1 : -1, nx = -Math.sin(a) * side * 0.9, ny = Math.cos(a) * side * 0.6;
        const px = P(x + nx), py = P(y + ny);
        G.shift(px, py, -1); G.tint(px, py, 0); G.shift(px + 1, py, -1); G.tint(px + 1, py, 0);
        G.shift(px, py - 1, 1);
      }
    }
  }
  // ---- ash: the ground cracked by the heat, glowing where it runs near fire
  if (feats && kind === "ash") {
    // round each lava pool, a few long cracks radiating from its warm rim,
    // a 1px glowing core with a dark shoulder on its south lip, cooling to
    // a plain crack as they run out; shorter ones at the vents
    const glowC = [C("#ffd88a"), C("#f8a040"), C("#e0662c"), C("#a8381e")], shoulder = C("#241a1c");
    const crack = (px, py, dir, len, heat0) => {
      for (let k = 0; k < len; k++) {
        dir += (rng() - 0.5) * 1.05;
        px += Math.round(Math.cos(dir)); py += Math.round(Math.sin(dir) * 0.75);
        if (!G.isTurf(px, py)) break;
        const h = heat0 * (1 - k / len) * 1.25;
        if (h > 0.3) {
          const gi = h > 1 ? 0 : h > 0.75 ? 1 : h > 0.5 ? 2 : 3;
          G.set(px, py, glowC[gi]); G.set(px, py + 1, shoulder); G.shift(px, py - 1, -1);
          if (h > 0.85) { G.set(px + 1, py, glowC[gi + 1]); G.set(px + 1, py + 1, shoulder); }   // wider where it leaves the fire
        }
        else { G.shift(px, py, -2); G.shift(px, py + 1, 1); }
        if (rng() < 0.08) {
          let bx = px, by = py; const bd = dir + (rng() < 0.5 ? 0.9 : -0.9);
          for (let q = 0; q < 3 + Math.floor(rng() * 4); q++) { bx += Math.round(Math.cos(bd)); by += Math.round(Math.sin(bd) * 0.75); if (h > 0.6 && q < 2) G.set(bx, by, glowC[3]); else G.shift(bx, by, -1); }
        }
      }
    };
    for (const p of PONDS.filter((q) => q.t === "lava")) {
      const n = 4 + Math.floor(rng() * 3), a0 = rng() * 6.3;
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.7;
        const x = p.x + Math.cos(a) * (p.w / 2 + 1), y = p.y + Math.sin(a) * (p.h / 2 + 1);
        if (nearestOnPath(x, y).d < PATH_HALF + 2) continue;
        crack(P(x), P(y), Math.atan2(Math.sin(a) * p.w / p.h, Math.cos(a)), 26 + Math.floor(rng() * 22), 1);
      }
    }
    for (const d of DECOR.filter((q) => q.t === "vent")) {
      for (let k = 0; k < 3; k++) {
        const a = rng() * Math.PI * 2, x = d.x + Math.cos(a) * 6, y = d.y + 2 + Math.sin(a) * 3.5;
        if (clear(x, y, 2)) crack(P(x), P(y), a, 12 + Math.floor(rng() * 10), 0.7);
      }
    }
    // and the cold cracks of the dry ash everywhere else
    for (let i = 0; i < 40; i++) {
      const x = 20 + rng() * (SW - 40), y = 20 + rng() * (H - 40);
      if (clear(x, y, 4)) crack(P(x), P(y), rng() * Math.PI * 2, 8 + Math.floor(rng() * 14), 0);
    }
  }

  // ---- stones: the realm's specks, and a few clusters
  const stoneCol = kind === "snow" ? "#8e98a4" : kind === "ash" || burnt ? "#524846" : mix("#b9ae99", R.GRASS_DK, 0.25);
  const snowCap = kind === "snow" ? [C("#ffffff"), C("#e4ecf4")] : null;
  if (feats) {
    const nCl = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nCl; i++) {
      const at = spot(8);
      if (!at) continue;
      const n = 3 + Math.floor(rng() * 4);
      const list = [];
      for (let k = 0; k < n; k++) list.push([at[0] + (rng() - 0.5) * 12, at[1] + (rng() - 0.5) * 6, (k === 0 ? 1.6 : 0.8) + rng() * 0.9]);
      list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => { if (clear(x, y, 2)) pebble(G, x, y, r, stoneCol, snowCap); });
    }
  }

  // ---- clover, in little colonies rather than evenly sown
  const cloverCols = kind === "snow" ? null : [C(mix(mix(R.GRASS, R.GRASS_LT, 0.45), "#5aa890", 0.16)), C(mix(mix(R.GRASS, R.GRASS_DK, 0.2), "#3a7a68", 0.18)), C(mix(mix(R.GRASS, R.GRASS_DK, 0.7), "#2e6a5e", 0.18)), C(darken(R.GRASS_DK, 0.12))];
  const cloverFl = [C("#fff3d2"), C("#f0dcd8"), C("#c8a8b0")];
  if (cloverCols && !(kind === "ash" || burnt)) {
    for (let i = 0; i < 34; i++) {
      const cx = rng() * SW, cy = rng() * H, n = 3 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) {
        const x = cx + (rng() - 0.5) * 12, y = cy + (rng() - 0.5) * 7;
        if (!clear(x, y, 3)) continue;
        cloverLeaf(G, x, y, cloverCols, feats && kind === "grass" && rng() < 0.12 ? cloverFl : null, k + i);
      }
    }
  }
  for (const sp of SPECKS) {
    if (sp.k > 0.62) pebble(G, sp.x, sp.y, 0.9 + sp.w * 0.32, stoneCol, snowCap);
    else if (sp.k > 0.45 && cloverCols && !(kind === "ash" || burnt)) cloverLeaf(G, sp.x, sp.y, cloverCols, null, Math.round(sp.x));
    else if (sp.k > 0.45) { G.shift(P(sp.x), P(sp.y), -2); G.shift(P(sp.x) + 1, P(sp.y), -1); G.shift(P(sp.x) + 1, P(sp.y) - 1, 1); }
  }

  // ---- what falls under a lone tree: leaves, needles, or twigs and ash
  const LEAF = {
    tree: ["#c8962e", "#b0622c", "#8a8a34", "#d8b44a", "#7a5226"],
    willow: ["#a8b048", "#c8c05a", "#8a9a40"],
    pine: ["#8a5a32", "#6a4a2c", "#a06c3a"],
    snowpine: ["#7a5a3a", "#5a4632"],
    deadtree: ["#2e2624", "#4a3e38", "#8a8078"],
  };
  for (const dc of DECOR) {
    if (dc.forest) continue;
    let set = LEAF[dc.t];
    if (!set && /spruce|irpine|fenwillow/.test(dc.t)) set = LEAF.pine;
    if (!set) continue;
    if (burnt && dc.t === "tree") set = LEAF.deadtree;
    const s = dc.s || 1, cols = set.map(C);
    // gathered in a few drifts about the drip line (thicker down-right, in
    // the tree's shade), not sown evenly
    const n = Math.round((dc.t === "tree" ? 24 : 13) * s * s), seedT = Math.round(dc.x * 3 + dc.y);
    const nDrift = 2 + Math.floor(hash(seedT, 1) * 3);
    for (let k = 0; k < n; k++) {
      const g = k % nDrift;
      const a = (hash(g, seedT + 2) - 0.2) * Math.PI * 1.6 + (hash(k, seedT + 3) - 0.5) * 0.7;
      const gs = (hash(k, seedT + 4) + hash(k, seedT + 5) + hash(k, seedT + 6) - 1.5) * 0.8;   // about gaussian
      const rr = 1 + gs * 0.18;
      const x = dc.x + 3 * s + Math.cos(a) * rr * 13 * s, y = dc.y + 3 + Math.sin(a) * rr * 6.5 * s;
      if (!clear(x, y, 1)) continue;
      const px = P(x), py = P(y), c = cols[k % cols.length];
      G.set(px, py, c);
      if (k % 3 === 0) G.set(px + 1, py, c);
      else if (k % 3 === 1) G.shift(px + 1, py + 1, -1);
    }
  }

  // ---- the wood's floor: leaf litter, roots, moss and toadstools where the
  // grass gives up (a realm whose edge wood isn't green turns it off)
  if (FOREST && R.wood?.hem !== false) {
    const litter = ["#7a5230", "#9a6a34", "#5a4a2c", "#b07c3a", "#6a5a30"].map(C);
    for (let i = 0; i < 1600; i++) {
      const x = rng() * SW, y = rng() * H;
      const dpt = forestDepthAt(x, y);
      if (dpt < -4 || nearestOnPath(x, y).d < PATH_HALF + 2 || inRiver(x, y, 2) || inPond(x, y, 2)) continue;
      const px = P(x), py = P(y), c = litter[i % litter.length];
      G.set(px, py, c);
      if (i % 2) G.set(px + 1, py, c);
      if (i % 5 === 0) G.shift(px, py + 1, -1);
    }
    // moss cushions, bright where the sun gets in
    const moss = [C(mix(R.GRASS_DK, R.GRASS, 0.6)), C(mix(R.GRASS_DK, R.GRASS, 0.2)), C(darken(R.GRASS_DK, 0.3))];
    for (let i = 0; i < 70; i++) {
      const x = rng() * SW, y = rng() * H;
      const dpt = forestDepthAt(x, y);
      if (dpt < 0 || dpt > 60 || nearestOnPath(x, y).d < PATH_HALF + 4 || inRiver(x, y, 3) || inPond(x, y, 3)) continue;
      pixBall(G, x, y, 1.6 + rng() * 1.8, 1 + rng() * 0.8, moss, { shadow: -1 });
    }
    // roots reaching out of the wood
    const root = [C(darken("#6a4a30", 0.1)), C("#8a6440")];
    const span = FOREST.edge === "left" ? H : W;
    for (let u = 6, i = 0; u < span; u += 14 + hash(i, 91) * 16, i++) {
      const bx = FOREST.edge === "left" ? forestDepthAt(0, u) + 1 : u, by = FOREST.edge === "left" ? u : forestDepthAt(u, 0) + 1;
      if (nearestOnPath(bx, by).d < PATH_HALF + 6 || inRiver(bx, by, 4) || inPond(bx, by, 4)) continue;
      let px = P(bx), py = P(by);
      const len = 5 + Math.floor(hash(i, 92) * 9), dir = hash(i, 93) < 0.5 ? -1 : 1;
      for (let k = 0; k < len; k++) {
        G.set(px, py, root[0]); G.set(px, py - 1, root[1]); G.shift(px, py + 1, -1);
        if (FOREST.edge === "left") { px++; if (hash(i * 13 + k, 94) < 0.35) py += dir; }
        else { py++; if (hash(i * 13 + k, 94) < 0.35) px += dir; }
      }
    }
    // a few toadstools at the hem
    const shroom = [C("#f0d8b8"), C("#c85a40"), C("#8a3a2c"), C("#e8dcc4")];
    for (let i = 0; i < 16; i++) {
      const u = rng() * span, out = -2 + rng() * 8;
      const x = FOREST.edge === "left" ? forestDepthAt(0, u) + out : u, y = FOREST.edge === "left" ? u : forestDepthAt(u, 0) + out;
      if (nearestOnPath(x, y).d < PATH_HALF + 6 || inRiver(x, y, 4) || inPond(x, y, 4) || x > W - WALL_W - 8) continue;
      mushroom(G, x, y, rng() < 0.4, shroom);
      if (rng() < 0.6) mushroom(G, x + 2 + rng() * 2, y + 1, false, shroom);
    }
  }

  // ---- grass: the realm's own tufts, then a scatter that gathers where
  // the turf is lush and thins out on the pale, sunny swells
  // (burnt and ash country: dry straw from the realm's own colours, calm on
  // its ground — only the tufts by a dead tree are charred)
  const dry = kind === "ash" || burnt;
  const straw = strawOf(R).map(C);
  const tuftCols = kind === "snow" ? [C("#6e6a5c"), C("#9a947e"), C("#c4bca0"), C("#e2dac4")]
    : dry ? straw
    : kind === "marsh" ? [C(R.TUFT), C(mix(R.GRASS, R.TUFT, 0.3)), C(mix(R.GRASS_LT, "#c8bc88", 0.35)), C(mix(R.GRASS_LT, "#e0d49c", 0.5))]
    : [C(R.TUFT), C(mix(R.TUFT, R.GRASS, 0.55)), C(mix(R.GRASS, R.GRASS_LT, 0.6)), C(lighten(R.GRASS_LT, 0.22))];
  const tuftDk = kind === "snow" || dry ? tuftCols : [C(darken(R.TUFT, 0.15)), C(R.TUFT), C(mix(R.GRASS, R.GRASS_LT, 0.3)), C(R.GRASS_LT)];
  // the realm's own tufts stand taller and catch more sun than the scatter
  const tuftLt = kind === "grass" && !burnt ? [C(mix(R.TUFT, R.GRASS, 0.3)), C(mix(R.GRASS, R.GRASS_LT, 0.35)), C(mix(R.GRASS, R.GRASS_LT, 0.8)), C(lighten(R.GRASS_LT, 0.38))]
    : dry ? [C(mix(R.GRASS_DK, "#6a5438", 0.3)), C(mix(R.GRASS, "#8a7450", 0.4)), C(mix(R.GRASS_LT, "#c8a870", 0.55)), C(mix(R.GRASS_LT, "#ecd8a8", 0.6))]
    : tuftCols;
  const charred = [C("#2e2622"), C("#4a3e36"), C(mix(R.GRASS_LT, "#7e684c", 0.5)), C(mix(R.GRASS_LT, "#a88a60", 0.5))];
  const dead = dry ? DECOR.filter((d) => d.t === "deadtree") : [];
  // grass in the wood's shade is drawn in the floor's own tones
  const floorTuft = (x, y) => { const px = P(x), py = P(y); return [G.at(px, py, -1), G.at(px, py, 0), G.at(px, py, 2), G.at(px, py, 3)]; };
  const blades = [];
  for (const tf of TUFTS) blades.push([tf.x, tf.y, 1 + tf.s * 0.65, true]);
  const keep = kind === "snow" ? 0.35 : dry ? 0.5 : 1;
  for (let i = 0; i < 900; i++) {
    const x = rng() * SW, y = rng() * H;
    if (!clear(x, y, 5)) continue;
    if (rng() > 0.2 + (0.6 - G.lush(x, y)) * 2.6) continue;
    if (rng() > keep) continue;
    blades.push([x, y, 0.5 + rng() * 0.65]);
  }
  blades.sort((a, b) => a[1] - b[1]);
  blades.forEach(([x, y, s, own], i) => {
    if (kind === "snow") {
      // a few stiff dry stalks standing through the snow, unequal, one
      // bowed under its seed head, and a little drift banked at their foot
      const bx = P(x), by = P(y), n = 2 + (hash(i, 5) < 0.6 ? 1 : 0) + (own && hash(i, 6) < 0.5 ? 1 : 0);
      const lt = G.at(bx, by, 2), dk = G.at(bx, by, -1);
      const head = Math.floor(hash(i, 7) * n);
      for (let k = 0; k < n; k++) {
        const sx = bx + k * 2 - (n - 1) + (hash(i, k + 10) < 0.3 ? 1 : 0);
        const hgt = Math.max(3, Math.round((4 + hash(i, k + 20) * 6) * s * (k === head ? 1.25 : 1)));
        const lean = hash(i, k + 30) < 0.5 ? 0 : 1;
        for (let q = 0; q < hgt; q++) {
          const ci = q < 1 ? 0 : q < hgt * 0.5 ? 1 : q < hgt - 1 ? 2 : 3;   // the far stalk a step darker
          G.set(sx + (q > hgt * 0.6 ? lean : 0), by - q, tuftCols[k === n - 1 && ci < 3 ? Math.max(0, ci - 1) : ci]);
        }
        if (k === head) {
          const tx = sx + lean, ty = by - hgt;
          G.set(tx + 1, ty, tuftCols[2]); G.set(tx + 2, ty + 1, tuftCols[1]); G.set(tx + 2, ty + 2, tuftCols[0]); G.set(tx + 1, ty - 1, tuftCols[3]);
        }
      }
      for (let k = -2; k <= 3; k++) G.set(bx + k, by, k < 1 ? lt : G.at(bx + k, by, 1));
      for (let k = -1; k <= 4; k++) G.set(bx + k, by + 1, dk);
      return;
    }
    let cols = own ? tuftLt : i % 4 === 0 ? tuftDk : tuftCols;
    if (dead.length && dead.some((d) => Math.hypot(d.x - x, (d.y - y) * 1.4) < 26 * (d.s || 1))) cols = charred;
    if (FOREST && forestDepthAt(x, y) > -6) cols = floorTuft(x, y);
    pixTuft(G, x, y, s, i, cols, own ? { n: 5 + (i % 3) } : undefined);
  });

  // ---- wildflowers, each with a few smaller ones of its kind nearby; and
  // on the Greenwood's meadows, the odd patch of daisies
  const stemC = kind === "snow" ? [C("#5a7466"), C("#7a9484"), C("#8aa494")] : [C(darken(R.TUFT, 0.1)), C(mix(R.TUFT, R.GRASS, 0.4)), C(mix(R.GRASS, R.GRASS_LT, 0.3))];
  if (feats && kind === "grass" && !burnt) {
    const daisy = { w: C("#fbf6ea"), Y: C("#f0c040"), s: C("#d4d0c8") };
    const nDaisy = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < nDaisy; i++) {
      const cx = 24 + rng() * (SW - 48), cy = 24 + rng() * (H - 48), n = 6 + Math.floor(rng() * 9);
      for (let k = 0; k < n; k++) {
        const x = cx + (rng() - 0.5) * 18, y = cy + (rng() - 0.5) * 9;
        if (!clear(x, y, 4)) continue;
        G.shift(P(x) + 1, P(y) + 1, -1);
        stampRows(G, P(x) - 1, P(y) - 1, DAISY, daisy);
      }
    }
  }
  FLOWERS.forEach((f, i) => {
    const n = Math.floor(hash(i, 8) * 4);
    const [fr, fg, fb] = rgb(f.c);
    const centre = fr > 180 && fg > 150 && fb < 140 ? "#a8642c" : "#f2c744";   // a yellow flower gets a brown eye
    for (let k = 0; k < n; k++) {
      const x = f.x + (hash(i, k + 20) - 0.5) * 14, y = f.y + (hash(i, k + 30) - 0.5) * 8;
      if (clear(x, y, 6)) flowerHead(G, x, y, f.c, false, stemC, centre);
    }
    if (!FOREST || forestDepthAt(f.x, f.y) < -4) flowerHead(G, f.x, f.y, f.c, i < 3 ? 2 : 1, stemC, centre, i);
  });

  // ---- the last glints: sparkle on the snow, embers in the ash
  if (kind === "snow") {
    const white = C("#ffffff");
    for (let i = 0; i < 520; i++) {
      const px = Math.floor(rng() * PW), py = Math.floor(rng() * PH);
      if (!G.isTurf(px, py) || G.tone[py * PW + px] < 3) continue;
      G.set(px, py, white);
      if (i % 9 === 0) { G.shift(px - 1, py, 1); G.shift(px + 1, py, 1); G.shift(px, py - 1, 1); G.shift(px, py + 1, 1); }
    }
  } else if (kind === "ash") {
    const ember = [C("#f0a040"), C("#c8582c"), C("#6a2e24")];
    for (let i = 0; i < 90; i++) {
      const x = rng() * SW, y = rng() * H;
      if (!clear(x, y, 3)) continue;
      const px = P(x), py = P(y);
      G.set(px, py, ember[0]); G.set(px + 1, py, ember[1]); G.set(px, py + 1, ember[2]); G.set(px + 1, py + 1, ember[2]);
    }
  }
}

// ---- the wood's hem: bushes and ferns crowding the treeline ----------------
// Both are drawn pixel by pixel into baked sprites, one per size, and set
// down 1:1 on whole art pixels (a baked sprite is never scaled).
// paint a sprite's art pixels straight into its buffer (a fillRect each
// made the hem a visible share of a cold bake); colours as "#rrggbb" or
// "rgba(r,g,b,a)", the translucent ones only ever laid on bare canvas
const COLS = new Map();
const colOf = (c) => {
  let v = COLS.get(c);
  if (!v) {
    if (c[0] === "#") v = [...rgb(c), 255];
    else { const n = c.match(/[\d.]+/g).map(Number); v = [n[0], n[1], n[2], Math.round((n[3] ?? 1) * 255)]; }
    COLS.set(c, v);
  }
  return v;
};
const pixelsOn = (c, fn) => {
  const w = c.canvas.width, h = c.canvas.height, img = c.getImageData(0, 0, w, h), d = img.data;
  fn((px, py, col) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const o = (py * w + px) * 4, v = colOf(col);
    d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3];
  });
  c.putImageData(img, 0, 0);
};
// a stepped contact shadow, thrown down-right
const pixShadow = (put, cx, cy, rx, ry) => {
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const q = (i / rx) ** 2 + (j / ry) ** 2;
    if (q <= 1) put(cx + i, cy + j, q < 0.45 ? "rgba(28,20,30,0.26)" : "rgba(28,20,30,0.16)");
  }
};
// A low bush: three or four leafy clumps, each inked along its underside
// like the trees behind it, its rim notched with leaves, its face broken
// into stepped leaf-scales lit from the upper left; berries or blossom on
// two of its three looks. Baked once per tint, look and size.
const BUSHES = new Map();
const BUSH_W = [22, 27, 32];
const bushSprite = (leaf, v, size) => {
  const key = `${leaf}|${v}|${size}`;
  if (BUSHES.has(key)) return BUSHES.get(key);
  const w = BUSH_W[size], h = Math.round(w * 0.74);
  const T = [lighten(leaf, 0.4), lighten(leaf, 0.2), leaf, darken(leaf, 0.2), darken(leaf, 0.4)];
  const cv = bakeSprite(w, h, (c) => {
    const AW = w * PX, AH = h * PX, base = AH - 7;
    pixelsOn(c, (put) => pixShadow(put, Math.round(AW * 0.56), base + 2, Math.round(AW * 0.4), 4));
    const cl = [[0.5, 0.36, 0.3, 0.3], [0.27, 0.54, 0.22, 0.26], [0.73, 0.54, 0.22, 0.25]];
    if (size > 0) cl.push([0.52, 0.66, 0.19, 0.19]);
    cl.forEach(([fx, fy, frx, fry], i) => part(c, (cc) => pixelsOn(cc, (put) => {
      const sd = v * 31 + i * 7 + size;
      const cx = Math.round(AW * fx + (hash(sd, 1) - 0.5) * 4), cy = Math.round(AH * fy), rx = AW * frx, ry = AH * fry;
      const lob = hash(sd, 2) * 6.3;
      const inside = (i2, j2) => {
        const a = i2 / rx, b = j2 / ry, ang = Math.atan2(b, a);
        const rim = 1 + 0.09 * Math.sin(ang * 5 + lob) + (hash(cx + i2, cy + j2 + sd) - 0.5) * 0.2;
        return a * a + b * b <= rim * rim;
      };
      const tone = (i2, j2) => { const lt = -((i2 / rx) * 0.55 + (j2 / ry) * 0.85); return lt > 0.62 ? 1 : lt > 0.02 ? 2 : lt > -0.55 ? 3 : 4; };
      for (let j = -Math.ceil(ry) - 1; j <= Math.ceil(ry) + 1; j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
        if (inside(i, j)) put(cx + i, cy + j, T[tone(i, j)]);
      }
      // leaf-scales: a lit pixel over a small darker cup, the scale's tone
      // set by where it sits on the clump
      const nS = Math.round(rx * ry * 0.22);
      for (let k = 0; k < nS; k++) {
        const i = Math.round((hash(sd, k + 10) * 2 - 1) * rx * 0.85), j = Math.round((hash(sd, k + 50) * 2 - 1) * ry * 0.85);
        if (!inside(i, j) || !inside(i, j + 1)) continue;
        const t = tone(i, j);
        put(cx + i, cy + j, T[Math.max(0, t - 1)]);
        const cup = T[Math.min(3, t + 1)];
        if (inside(i - 1, j + 1)) put(cx + i - 1, cy + j + 1, cup);
        put(cx + i, cy + j + 1, cup);
        if (inside(i + 1, j + 1)) put(cx + i + 1, cy + j + 1, cup);
      }
      // a few leaf tips standing proud of the rim on the sun side
      for (let k = 0; k < 4; k++) {
        const ang = Math.PI * (1.05 + hash(sd, k + 90) * 0.6), i = Math.round(Math.cos(ang) * (rx + 1)), j = Math.round(Math.sin(ang) * (ry + 1));
        put(cx + i, cy + j, T[1]); put(cx + i + 1, cy + j, T[2]);
      }
    }), { ink: "under" }));
    // berries (red) or blossom (cream) on two of the three looks
    if (v > 0) pixelsOn(c, (put) => {
      const col = v === 1 ? ["#f08a6a", "#c8403c", "#7a2230"] : ["#ffffff", "#f4ead2", "#c8b8a0"];
      for (let i = 0; i < 3 + size * 2; i++) {
        const x = Math.round(AW * (0.2 + hash(v * 7 + size, i + 20) * 0.6)), y = Math.round(AH * (0.3 + hash(v * 7 + size, i + 25) * 0.35));
        put(x, y, col[0]); put(x + 1, y, col[1]); put(x, y + 1, col[1]); put(x + 1, y + 1, col[2]);
      }
    });
  });
  BUSHES.set(key, cv);
  return cv;
};
// A fern: fronds fanning from one root, each a 2-px rachis (lit along its
// top) that rises up and out, then droops, with leaflets 1-3 px long either
// side, shrinking to the tip — lit above, a darker tone beneath, no ink ring
// (only a touch of ink at the root). Four sizes, three looks.
const FERNS = new Map();
const FERN_S = [0.62, 0.76, 0.9, 1.05];
const fernSprite = (col, sunC, v, size) => {
  const key = `${col}|${sunC}|${v}|${size}`;
  if (FERNS.has(key)) return FERNS.get(key);
  const s = FERN_S[size];
  const lt = mix(col, sunC, 0.42), hi = lighten(mix(col, sunC, 0.75), 0.12), dk = darken(col, 0.22), dd = darken(col, 0.42);
  const cv = bakeSprite(28, 23, (c) => pixelsOn(c, (put) => {
    const rx = 28, ry = 34;
    pixShadow(put, rx + 3, ry + 1, Math.round(15 * s), 3);
    const n = 5 + (v % 3), fr = [];
    for (let i = 0; i < n; i++) {
      const side = i / (n - 1) - 0.5;
      const a0 = -Math.PI / 2 + side * 2.5 + (hash(v, i) - 0.5) * 0.3;
      const len = (19 + hash(v, i + 7) * 7) * s * (1 - Math.abs(side) * 0.25);
      fr.push([a0, len, Math.abs(side)]);
    }
    fr.sort((p, q) => p[2] - q[2]);                     // the upright fronds stand behind
    for (const [a0, len, out] of fr) {
      const droop = 0.3 + out * 0.5, pts = [];
      for (let k = 0; k <= Math.round(len); k++) {
        const g = k / len;
        pts.push([rx + Math.cos(a0) * len * g, ry + Math.sin(a0) * len * g + g * g * len * droop]);
      }
      for (let k = 0; k < pts.length; k++) {
        const [x, y] = pts[k], g = k / (pts.length - 1);
        const [x2, y2] = pts[Math.min(pts.length - 1, k + 1)], [x0, y0] = pts[Math.max(0, k - 1)];
        let tx = x2 - x0, ty = y2 - y0; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const X = Math.round(x), Y = Math.round(y);
        // leaflets either side, angled toward the tip: the upper row lit,
        // the lower row in the frond's own shade
        if (g > 0.1 && g < 0.94) {
          const L = Math.max(1, Math.min(3, Math.round((1 - g) * 3.6 * s + 0.6))) - (k & 1);
          let nx = -ty, ny = tx;
          if (ny > 0) { nx = -nx; ny = -ny; }                     // (nx, ny) points up-screen
          for (const up of [1, -1]) {
            const dx = nx * up * 0.8 + tx * 0.55, dy = ny * up * 0.8 + ty * 0.55;
            for (let q = 1; q <= L; q++) {
              const lx = Math.round(x + dx * q), ly = Math.round(y + dy * q);
              put(lx, ly, up > 0 ? (q === L ? hi : lt) : (out > 0.3 && g < 0.5 && q === 1 ? dd : dk));
            }
          }
        }
        // the rachis: two pixels, the upper (or sunward) one lit
        if (Math.abs(tx) > Math.abs(ty)) { put(X, Y, g < 0.2 ? col : lt); put(X, Y + 1, g < 0.2 ? dk : col); }
        else { put(X, Y, g < 0.2 ? col : lt); put(X + 1, Y, dk); }
      }
    }
    put(rx - 1, ry + 1, dd); put(rx, ry + 1, dd); put(rx + 1, ry + 1, dd); put(rx + 2, ry + 1, dd);
  }), false);
  FERNS.set(key, cv);
  return cv;
};

function paintTurf(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x5eed5eed) >>> 0);
  const kind = groundKind(R);
  const look = LOOKS[kind] || LOOKS.grass;
  const G = paintToneMap(ctx, look);
  paintDetail(G, look, kind, rng);
  G.flush();
  if (COAST) paintShore(ctx);

  // the wood's hem: bushes and ferns crowding the treeline (a realm whose
  // edge wood isn't green turns it off with wood.hem: false) — staggered in
  // and out, in ones, pairs and trios, with gaps, never three ferns in a row
  if (FOREST && REALM.wood?.hem !== false) {
    const edgeLeft = FOREST.edge === "left", span = edgeLeft ? H : W;
    const leaf = mix(R.GRASS_DK, "#3f7a40", 0.5), fern = mix(R.GRASS_DK, "#3f8a3c", 0.35);
    const at = (u, out) => (edgeLeft ? [forestDepthAt(0, u) + out, u] : [u, forestDepthAt(u, 0) + out]);
    const items = [];
    let run = 0, out = 1;
    for (let u = 3, i = 0; u < span; u += 6 + hash(i, 71) * 10, i++) {
      if (hash(i, 70) < 0.28) { run = 0; continue; }
      let isFern = hash(i, 73) >= 0.52;
      if (isFern && run >= 2) isFern = false;
      run = isFern ? run + 1 : 0;
      out = 1 + ((out - 1 + 4 + hash(i, 72) * 6) % 13);   // each one stepped in or out from the last
      const [x, y] = at(u + (hash(i, 78) - 0.5) * 5, out);
      items.push([x, y, i, isFern, isFern ? 1 + Math.floor(hash(i, 79) * 3) : Math.floor(hash(i, 76) * 3)]);
      // now and then a fern brings a smaller one or two along, set in or
      // out from it so they never stand in a column
      if (isFern && hash(i, 80) < 0.4) {
        for (let q = 1; q <= (hash(i, 81) < 0.4 ? 2 : 1); q++) {
          const dOut = (out > 7 ? -1 : 1) * (q === 1 ? 5 + hash(i, 84 + q) * 4 : 10 + hash(i, 84 + q) * 3);
          const [cx, cy] = at(u + (q === 1 ? 1 : -1) * (5 + hash(i, 82 + q) * 5), Math.max(1, out + dOut));
          items.push([cx, cy, i * 7 + q, true, Math.floor(hash(i, 86 + q) * 2)]);
        }
      }
    }
    const ok = ([x, y]) => !(nearestOnPath(x, y).d < PATH_HALF + 12 || inPond(x, y, 4) || inRiver(x, y, 6) || x > W - WALL_W - 8 || y > H - 4);
    const snapW = (v) => Math.round(v * PX) / PX;
    items.filter(ok).sort((a, b) => a[1] - b[1]).forEach(([x, y, i, isFern, size]) => {
      if (isFern) {
        const cv = fernSprite(fern, R.GRASS_LT, Math.floor(hash(i, 77) * 3), size);
        ctx.drawImage(cv, snapW(x - 14), snapW(y - 17), cv.width / PX, cv.height / PX);
      } else {
        const v = Math.floor(hash(i, 75) * 3), cv = bushSprite((v + size) & 1 ? lighten(leaf, 0.1) : leaf, v, size);
        const bw = BUSH_W[size], bh = cv.height / PX;
        ctx.drawImage(cv, snapW(x - bw * 0.5), snapW(y - bh + 5), cv.width / PX, bh);
      }
    });
  }
}

// The cached ground for the realm currently loaded. Rebuilt whenever the
// road changes underneath it (a new realm) — and only then.
export function groundLayer() {
  const key = `${REALM.id}|${PTS.length}|${PTS[0]}|${PTS[PTS.length - 1]}|${RES}|${PATH_HALF}`;
  if (layer && key === layerKey) return layer;
  layer = document.createElement("canvas");
  layer.width = W * RES;
  layer.height = H * RES;
  const ctx = layer.getContext("2d");
  ctx.scale(RES, RES);
  paintTurf(ctx);
  const art = REALM.groundArt, kit = () => ({ clear, rng: mulberry32((REALM.seed ^ 0x6a7d) >>> 0), SW });
  if (artFor("turf", art)) artFor("turf", art)(ctx, kit());
  paintRoad(ctx);
  if (artFor("road", art)) artFor("road", art)(ctx, kit());
  bakeWater(ctx);
  layerKey = key;
  return layer;
}

// The living parts of the ground, every frame over the cached layer: the
// sea's wash on a coast (coast.js) and the road's chevrons (road.js).
export function drawRoadLive(ctx, g) {
  drawShoreLive(ctx, g);
  drawRoadMarks(ctx, g);
}

// a spare export for the lab pages: paint one lit ball where they ask
export { ball };
