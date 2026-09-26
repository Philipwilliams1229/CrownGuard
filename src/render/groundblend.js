// ============ WHERE A HALL MEETS THE GROUND ============
// Every hall stands on its own worked pad, and on its own that pad ends in a
// hard line. This paints the realm's own ground back over that line: a few
// clumps round the rim BEHIND the hall (drawn first), and a few more across
// the FRONT of its footing (drawn after), so the base sinks into meadow
// grass, snow drifts, marsh reeds, ash and cinders, or cropped highland turf
// — whatever the board is made of.
//
// The clumps are crisp pixel art in the turf's own manner (world.js paints
// the meadow's tufts with the same pixelTuft below): single-pixel blades
// dark at the root and lit at the tip, lit mounds of snow, pixel cinders.
// Round the back of the rim the pad's edge frays into short blades of the
// realm's grass instead of a soft ring.
//
// It keeps to the rim of the hall's footprint (buildkit FOOT, or kitB
// FOOT_NARROW for a narrow hall) and leaves the middle of the front clear,
// where doors, crews and campfires stand. Baked once per realm, footprint
// and variant, then stamped: a packed board pays one drawImage per layer.

import { REALM } from "../data/maps.js";
import { TOWERS } from "../data/towers.js";
import { bakeSprite, PX, hash, mix, lighten, darken } from "./paint.js";

const FEET = {
  wide: { dy: 3, rx: 18, ry: 13 },
  narrow: { dy: 3, rx: 13, ry: 9 },
};
const VARIANTS = 4;
const BOX = { w: 48, h: 30, ax: 24, ay: 12 };   // the baked patch, anchored on the hall

// which ground this realm is made of, read from its weather and grass
export const groundKind = (r = REALM) => {
  if (r.ambient === "snow") return "snow";
  if (r.ambient === "wisps" || r.ambient === "fireflies") return "marsh";
  if (r.ambient === "dust") return "turf";
  if (r.ambient === "embers" && r.id === "ember") return "ash";
  return "grass";
};

// ---- a clump of grass as pixel blades (shared with world.js) -----------------
// (bx, by) is the root in ART pixels; `cols` runs root to tip (four colours
// read best); put(px, py, col) paints one art pixel, shade(px, py) darkens one
// for the root's shadow. The sun-side blades carry the lit tips, the far
// ones stay darker; the middle ones stand tallest; all lean with the wind.
export const pixelTuft = (put, shade, bx, by, s, seed, cols, o = {}) => {
  const n = o.n ?? 4 + Math.floor(hash(seed, 1) * 3);
  const wind = o.wind ?? 0.22;
  const spread = (o.spread ?? 1.3) * s * 2;
  const half = Math.round((n - 1) * spread * 0.13) + 1;
  if (shade) for (let i = -half; i <= half + 3; i++) shade(bx + i, by + 1);
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((a, b) => hash(seed, a + 60) - hash(seed, b + 60));
  const far = [cols[0], cols[0], cols[1], cols[2]];
  for (const i of order) {
    const h1 = hash(seed, i + 2), h2 = hash(seed, i + 40);
    const side = n > 1 ? i / (n - 1) : 0.5;                       // 0 = the sun side
    // the blades rise from one narrow root and fan out as they grow
    const lean = (side - 0.5) * 2.3 + (h1 - 0.5) * 0.5 + wind;
    const mid = 1 - Math.abs(side - 0.5) * 1.1;
    const len = Math.max(3, Math.round((4 + h2 * 5 + mid * 4) * s * 2 * 0.55));
    const ox = Math.round((i - (n - 1) / 2) * spread * 0.26);
    const c = side < 0.5 ? cols : far;
    for (let k = 0; k < len; k++) {
      const f = k / Math.max(1, len - 1);
      // dark only right at the root, lit toward the tip
      const ci = f < 0.18 ? 0 : f < 0.5 ? 1 : f < 0.84 ? 2 : 3;
      put(bx + ox + Math.round(lean * (0.35 * f + 0.65 * f * f) * len * 0.6), by - k, c[Math.min(c.length - 1, ci)]);
    }
  }
};

// ---- one clump of each kind of ground ----------------------------------------
// painted in art pixels on the patch's canvas (world units scaled by PX)
const dotter = (c) => (px, py, col) => { c.fillStyle = col; c.fillRect(px / PX, py / PX, 1 / PX, 1 / PX); };
const SHADE = "rgba(28,20,30,0.2)";
// a lit pixel ellipse: three tones by which way each pixel faces
const pixMound = (put, cx, cy, rx, ry, cols, shadowCol) => {
  const RX = Math.max(1, rx), RY = Math.max(1, ry);
  if (shadowCol) {
    for (let j = 0; j <= Math.ceil(RY) + 1; j++) for (let i = -Math.ceil(RX) + 1; i <= Math.ceil(RX) + 2; i++) {
      const a = (i - 1.5) / RX, b = (j - 1) / RY;
      if (a * a + b * b <= 1 && (i / RX) ** 2 + (j / RY) ** 2 > 1) put(cx + i, cy + j, shadowCol);
    }
  }
  for (let j = -Math.ceil(RY); j <= Math.ceil(RY); j++) for (let i = -Math.ceil(RX); i <= Math.ceil(RX); i++) {
    const a = i / RX, b = j / RY, q = a * a + b * b;
    if (q > 1) continue;
    const lit = -(a * 0.5 + b * 0.8);
    put(cx + i, cy + j, lit > 0.4 ? cols[0] : lit > -0.3 || q < 0.3 ? cols[1] : cols[2]);
  }
};

const clump = (c, kind, x, y, s, seed, r) => {
  const put = dotter(c), shade = (px, py) => put(px, py, SHADE);
  const bx = Math.round(x * PX), by = Math.round(y * PX);
  if (kind === "snow") {
    // a low drift banked against the footing: lit on top, blue in its lee,
    // and a dry stalk through it now and then
    const hi = lighten(r.GRASS_LT, 0.45), mid = lighten(r.GRASS_LT, 0.12), lo = mix(r.GRASS, "#6a86c6", 0.22);
    pixMound(put, bx, by, 7 * s, 2.6 * s, [hi, mid, lo], "rgba(60,80,130,0.22)");
    pixMound(put, bx + Math.round(4 * s), by + 1, 4 * s, 1.8 * s, [hi, mid, lo], null);
    if (hash(seed, 7) > 0.55) pixelTuft(put, null, bx - 2, by - 1, 0.55 * s, seed, ["#6e6a5c", "#9a947e", "#c4bca0", "#e2dac4"], { n: 2, spread: 1.1, wind: 0.4 });
    return;
  }
  if (kind === "ash") {
    // cinders and a dry, singed tuft
    for (let i = 0; i < 3; i++) {
      const px = bx + Math.round((hash(seed, i) - 0.5) * 12 * s), py = by + Math.round((hash(seed, i + 3) - 0.3) * 4 * s);
      const col = mix("#5a4c46", "#3a302c", hash(seed, i + 9));
      pixMound(put, px, py, (1.6 + hash(seed, i + 6) * 1.6) * s, (1.1 + hash(seed, i + 6)) * s, [lighten(col, 0.3), col, darken(col, 0.35)], SHADE);
    }
    pixelTuft(put, shade, bx + 2, by, 0.5 * s, seed, ["#2e2622", "#54463a", "#7e684c", "#a88a60"], { n: 3, wind: 0.4 });
    return;
  }
  if (kind === "marsh") {
    // a moss hummock and a few reeds standing up out of it, now and then a
    // bulrush head
    const moss = r.GRASS_LT;
    pixMound(put, bx, by - 1, 6 * s, 2.8 * s, [lighten(moss, 0.25), moss, darken(moss, 0.3)], SHADE);
    const n = 2 + Math.floor(hash(seed, 2) * 2);
    const reed = [darken(r.TUFT, 0.1), r.TUFT, mix(r.GRASS_LT, "#c8bc88", 0.35), lighten(r.GRASS_LT, 0.3)];
    for (let i = 0; i < n; i++) {
      const rx = bx + Math.round((i - (n - 1) / 2) * 3 * s), len = Math.round((8 + hash(seed, i + 11) * 7) * s);
      const lean = (hash(seed, i + 4) - 0.4) * 3;
      for (let k = 0; k < len; k++) put(rx + Math.round(lean * (k / len) ** 2), by - 2 - k, reed[Math.min(3, Math.floor((k / len) * 4))]);
    }
    if (hash(seed, 5) > 0.65) {
      const hx = bx + Math.round(3 * s), hy = by - Math.round(10 * s);
      for (let k = 0; k < 4; k++) { put(hx, hy + k, k === 0 ? "#8a6444" : "#5a3a24"); put(hx + 1, hy + k, k < 2 ? "#6a4a30" : "#4a2e1c"); }
      put(hx, hy - 1, reed[2]);
    }
    return;
  }
  const cols = [r.TUFT, mix(r.TUFT, r.GRASS, 0.55), mix(r.GRASS, r.GRASS_LT, 0.6), lighten(r.GRASS_LT, 0.22)];
  if (kind === "turf") {
    // cropped highland turf: low straw-tipped tufts and a pale pebble
    pixelTuft(put, shade, bx, by, 0.42 * s, seed, [cols[0], cols[1], mix(r.GRASS_LT, "#c8bc88", 0.4), mix(r.GRASS_LT, "#e0d49c", 0.5)], { n: 3 + Math.floor(hash(seed, 3) * 2) });
    if (hash(seed, 8) > 0.45) {
      const px = bx + Math.round((hash(seed, 9) > 0.5 ? 6 : -6) * s), pc = r.PEBBLE || "#c8c0ac";
      pixMound(put, px, by + 1, 2.6 * s, 1.8 * s, [lighten(pc, 0.3), pc, darken(pc, 0.35)], SHADE);
    }
    return;
  }
  // meadow grass, now and then a clover leaf or a daisy at its root
  pixelTuft(put, shade, bx, by, 0.55 * s, seed, cols, { n: 4 + Math.floor(hash(seed, 3) * 3) });
  if (hash(seed, 8) > 0.6) {
    const cx = bx + Math.round(5 * s), cy = by + 1, lf = [mix(r.GRASS, r.GRASS_LT, 0.25), mix(r.GRASS, r.GRASS_DK, 0.5), darken(r.GRASS_DK, 0.2)];
    [[1, 0], [0, 2], [2, 2]].forEach(([i, j]) => { put(cx + i, cy + j, lf[0]); put(cx + i + 1, cy + j, lf[1]); put(cx + i, cy + j + 1, lf[1]); put(cx + i + 1, cy + j + 1, lf[2]); });
  } else if (hash(seed, 8) < 0.12) {
    const cx = bx - Math.round(5 * s), cy = by;
    put(cx, cy - 1, "#fbf6ea"); put(cx - 1, cy, "#fbf6ea"); put(cx + 1, cy, "#d4d0c8"); put(cx, cy + 1, "#d4d0c8"); put(cx, cy, "#f0c040");
  }
};

// Where the clumps go round the rim: the back layer takes the far sides, the
// front layer the near quarters — never the middle of the front.
const BACK_ANGLES = [188, 206, 334, 352];
const FRONT_ANGLES = [6, 26, 154, 174];   // the footing's corners only: yard props stand in x ± 9

// the pad's edge fraying into the realm's ground: short blades (or snow, or
// ash) standing over the rim of the footing, sparse and uneven
const fray = (c, F, kind, variant) => {
  const r = REALM, put = dotter(c);
  const cx = BOX.ax * PX, cy = (BOX.ay + F.dy + 1) * PX, RX = (F.rx + 3) * PX, RY = (F.ry * 0.62 + 2.4) * PX;
  const tones = kind === "snow" ? [lighten(r.GRASS_LT, 0.3), r.GRASS_LT, lighten(r.GRASS_LT, 0.5)]
    : kind === "ash" ? [r.GRASS_DK, r.GRASS, r.GRASS_LT]
    : [mix(r.GRASS_DK, r.TUFT, 0.4), r.GRASS, mix(r.GRASS, r.GRASS_LT, 0.6)];
  for (let i = -Math.ceil(RX); i <= Math.ceil(RX); i++) {
    const h = hash(variant * 977 + i, 31);
    if (h > 0.42) continue;
    const a = i / RX;
    if (Math.abs(a) >= 1) continue;
    // where this column crosses the rim, near side and far side
    const yy = Math.sqrt(1 - a * a) * RY;
    for (const side of [-1, 1]) {
      if (side > 0 && Math.abs(a) < 0.62) continue;           // leave the front's middle clear
      const py = Math.round(cy + side * yy + (hash(variant + i, 33) - 0.5) * 2);
      const len = 2 + Math.floor(hash(variant * 31 + i, 35 + side) * 3);
      // snow lies in low wind-streaks along the rim; everything else stands up in blades
      if (kind === "snow") for (let k = 0; k < len; k++) put(Math.round(cx + i) + k, py, k === 0 ? tones[0] : tones[2]);
      else for (let k = 0; k < len; k++) put(Math.round(cx + i), py - k, k === len - 1 ? tones[2] : k === 0 ? tones[0] : tones[1]);
    }
  }
};

const paintPatch = (c, F, kind, variant, front) => {
  const r = REALM;
  const cx = BOX.ax, cy = BOX.ay;
  const angles = front ? FRONT_ANGLES : BACK_ANGLES;
  if (!front) fray(c, F, kind, variant);
  angles.forEach((deg, i) => {
    const seed = variant * 31 + i * 7 + (front ? 100 : 0);
    if (hash(seed, 1) < 0.18) return;   // a gap here and there
    const a = ((deg + (hash(seed, 2) - 0.5) * 12) * Math.PI) / 180;
    const k = 0.88 + hash(seed, 3) * 0.14;
    const x = cx + Math.cos(a) * F.rx * k;
    const y = cy + F.dy + Math.sin(a) * F.ry * k * (front ? 0.62 : 0.75);
    const s = (F.rx < 16 ? 0.62 : 0.75) * (kind === "grass" || kind === "turf" ? 1.25 : 1);
    clump(c, kind, x, y, s * (0.85 + hash(seed, 4) * 0.3), seed, r);
  });
};

const cache = new Map();
const patch = (fp, variant, front) => {
  const kind = groundKind();
  const key = `${REALM.id}|${kind}|${fp}|${variant}|${front ? "f" : "b"}|${PX}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = bakeSprite(BOX.w, BOX.h, (c) => paintPatch(c, FEET[fp], kind, variant, front), false);
    cache.set(key, cv);
  }
  return cv;
};

// which footprint a hall's ground keeps to; halls afloat get no turf
const footOf = (t) => (TOWERS[t.kind] && TOWERS[t.kind].water ? null : TOWERS[t.kind] && TOWERS[t.kind].roadClear ? "narrow" : "wide");

export const drawGroundBlend = (ctx, t, front) => {
  if (typeof document === "undefined") return;
  const fp = footOf(t);
  if (!fp) return;
  const cv = patch(fp, Math.abs(Math.round(t.x * 7 + t.y * 13)) % VARIANTS, front);
  ctx.drawImage(cv, Math.round((t.x - BOX.ax) * PX) / PX, Math.round((t.y - BOX.ay) * PX) / PX, cv.width / PX, cv.height / PX);
};
