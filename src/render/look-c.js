// ============ RENDER: LOOK C ("bolder") FOR THE TURF ============
// A treatment on each chapter's OWN colours, never a palette of its own: every
// colour keeps its hue (the dark ones lean cool, the lit ones warm, by `hue`
// degrees), gains `sat` saturation, and sits `spread` times farther from the
// ramp's middle tone in lightness (`dark` pulls the whole ramp down a little).
// world.js (the board), groundblend.js (the halls' footings) and apron.js (the
// landscape past the board) all read it, so they keep matching. No imports
// from the render files: groundblend and world import each other's neighbours.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// by groundKind (groundblend.js)
export const LOOK_C = {
  grass: { sat: 1.38, spread: 1.4, hue: 14, dark: 0.04 },
  turf: { sat: 1.2, spread: 1.26, hue: 8, dark: 0.015 },
  marsh: { sat: 1.32, spread: 1.32, hue: 8 },
  snow: { sat: 1.7, spread: 1.5, hue: 0 },
  ash: { sat: 1.1, spread: 1.2, hue: 0 },
};
const toHSL = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const fromHSL = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1)), m = l - c / 2;
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return "#" + [r + m, g + m, b + m].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")).join("");
};
// a ramp (hex, dark to light, `mid` the index that stays put) in look C
export const punchRamp = (ramp, k, mid) => {
  if (!k) return ramp;
  const l0 = toHSL(hexRGB(ramp[mid]))[2];
  return ramp.map((c) => {
    const [h, s, l] = toHSL(hexRGB(c)), dl = l - l0;
    const l2 = clamp01(l0 + dl * k.spread - (k.dark || 0));
    return fromHSL([h + Math.max(-1, Math.min(1, dl * 2.2)) * k.hue, clamp01(s * k.sat), l2]);
  });
};
// the tuft colours (root to tip) of a kind of country in look C; the board's
// scatter and the apron's both go through it
export const punchCols = (cols, kind) => punchRamp(cols, LOOK_C[kind] || LOOK_C.grass, 1);
// which of the meadow's tones a pixel takes at field value tt: the bands the
// board has always had, and, where `look.patch`, a deep patch (0) and a lit
// one (5) at the two ends, so the tone map reads as patches and not a haze
export const toneOf = (tt, patch) => patch
  ? (tt < 0.13 ? 0 : tt < 0.23 ? 1 : tt < 0.36 ? 2 : tt < 0.63 ? 3 : tt < 0.77 ? 4 : 5)
  : (tt < 0.23 ? 1 : tt < 0.36 ? 2 : tt < 0.63 ? 3 : 4);

// Look C for leaves: push a green away from grey (richer), toward a warm yellow-green.
// Here (a leaf module) so scenery.js and scenery-vale.js, which import each other, can
// both use it at load without a cycle.
export const rich = (c, k = 1.28) => {
  const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (r + g + b) / 3;
  const f = (v) => Math.max(0, Math.min(255, Math.round(m + (v - m) * k)));
  const h = (v) => Math.min(255, v).toString(16).padStart(2, "0");
  return `#${h(f(r) + 2)}${h(f(g) + 3)}${h(f(b))}`;
};
