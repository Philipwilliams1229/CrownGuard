// ============ RENDER: ONE LOOK FOR ALL WATER (2026-11-22, the scenery and water upgrade) ============
// The water ramp a chapter's rivers, ponds and sea all share, so they match where they meet
// (water.js paints rivers and ponds, coast.js the sea). Pure colour maths: no canvases, no state
// beyond a small cache keyed on the realm and the sun (DAY.v).
//
// EXPORTS (keep them stable; ask the river agent / the lead for additions):
//   waterKind(R = REALM)      "vale" | "iron" | "fen" | "rime" | "ash": which country's water
//   waterPal(R = REALM)       { deep, edge, shine } hex: REALM.water or the default (as water.js reads it)
//   DEPTH_N                   7: steps of the depth ramp
//   lookOf(pal, kind)         the same look for any { deep, edge, shine } (a pond's own palette)
//   waterLook(R = REALM)      the shared look, cached per palette + kind + sun:
//     .kind, .pal             as above
//     .dark                   true for black (fen) water: steps set apart harder
//     .ramp[0..6]             [r,g,b] from 0 the shallowest (the bed showing through: sand, pebble,
//                             peat) to 6 the deepest channel (darker, cooler, more saturated)
//     .rampHex[0..6]          the same as hex
//     .bed                    [r,g,b] the bed itself (sand / gravel / peat / grey shingle)
//     .lee                    [r,g,b] water in a bank's shade (the near bank's lee)
//     .rim                    [r,g,b] the lit rim of the far side (shallow water catching the sky)
//     .foam, .foamDk          [r,g,b] bright foam, its shaded underside
//     .glint, .glintHot       [r,g,b] a sun glint and its hot core: they warm with DAY.warm, to a pale
//                             gold at most (never DAY.col's orange)
//     .shallowsLit[0..1]      [r,g,b] sunlit shallows over sand (the beach's first water and a river's
//                             mouth / silt fan use these, so the two agree where they meet)
//     .sky                    [r,g,b] the sky's streak in open water (the old "shine" streak)
//   depthStep(k, i, j)        k 0..1 (0 shallow, 1 deep) -> a ramp index 0..6, its band edges dithered
//                             on a 4x4 ordered screen over ART pixels (i, j) so two painters fed the
//                             same k at the same pixel give the same step; `jit` (optional, in steps,
//                             about -0.5..0.5) replaces the ordered screen with your own organic jitter
//                             (water.js passes slow noise + a little per-pixel hash: no screen-door)
//   BAYER4(i, j)              0..1 ordered-dither threshold
//   rampAt(L, k, i, j)        the ramp colour [r,g,b] for depth k at pixel (i, j): L.ramp[depthStep(...)]
//   sunward(nx, ny)           -1..1: how much a slope with screen normal (nx, ny) faces the sun now
//                             (noon: up-left), for glints and lit rims on the sunward side
//   warmMix(c, k)             [r,g,b] c pulled toward the sun's colour by DAY.warm x k
//
// Depth convention for the sea agent: use k = 1 - exp(-d / 34) for d units from the shoreline
// (water.js does the same for a river's distance from its bank, scaled by the half-width), so the
// first band of each reads the same width where a river runs into the sea or a mere.
import { REALM } from "../data/maps.js";
import { DAY } from "../data/sun.js";
import { lighten, darken, mix, rgb } from "./paint.js";

const DEF = { deep: "#3a6a86", edge: "#5590a8", shine: "#a8d8e8" };
const SWAMP = { deep: "#2c4a3c", edge: "#3d5c44", shine: "#7aa078" };

export const waterKind = (R = REALM) => (R.groundArt === "fen" || R.ambient === "fireflies" ? "fen"
  : R.groundArt === "rime" || R.ambient === "snow" ? "rime"
  : R.groundArt === "iron" ? "iron" : R.ambient === "embers" ? "ash" : "vale");
export const waterPal = (R = REALM) => R.water || (waterKind(R) === "fen" ? SWAMP : DEF);

// the bed showing through the shallows, per country
const BEDS = { vale: "#c4a874", iron: "#9e9684", fen: "#4e4230", rime: "#8c9aa2", ash: "#4a3c36" };

export const DEPTH_N = 7;
const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
// saturate a hex by k (0 = as is)
const sat = (hex, k) => {
  const [r, g, b] = rgb(hex), m = (r + g + b) / 3;
  const f = (v) => Math.max(0, Math.min(255, Math.round(m + (v - m) * (1 + k))));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
const hex3 = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER4 = (i, j) => (B4[((j & 3) << 2) | (i & 3)] + 0.5) / 16;

export const sunward = (nx, ny) => {
  // the light's screen direction (toward the sun), from DAY.L
  const lx = DAY.L[0], ly = DAY.L[1], n = Math.hypot(lx, ly) || 1;
  return (nx * lx + ny * ly) / n;
};
export const warmMix = (c, k = 1) => {
  const w = (DAY.warm || 0) * k;
  if (w <= 0) return c;
  const s = rgb(DAY.col || "#ffffff");
  return [c[0] + (s[0] - c[0]) * w, c[1] + (s[1] - c[1]) * w, c[2] + (s[2] - c[2]) * w].map(Math.round);
};

const paleGold = (c, k) => {
  const w = (DAY.warm || 0) * k;
  return w <= 0 ? c : [c[0] + (255 - c[0]) * w, c[1] + (236 - c[1]) * w, c[2] + (176 - c[2]) * w].map(Math.round);
};
const CACHE = new Map();
export const waterLook = (R = REALM) => lookOf(waterPal(R), waterKind(R));
export const lookOf = (pal, kind = "vale") => {
  const key = `${kind}|${pal.deep}|${pal.edge}|${pal.shine}|${DAY.v}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  if (CACHE.size > 24) CACHE.clear();
  const dark = lum(rgb(pal.deep)) < 0.2;
  const bedHex = BEDS[kind] || BEDS.vale;
  // shallow end: the edge colour with the bed showing through it; deep end: the deep, cooler and
  // a little more saturated (dark water instead pulled apart in absolute steps)
  const sh0 = mix(mix(pal.edge, bedHex, dark ? 0.42 : 0.56), "#fff0c8", dark ? 0.04 : 0.2);
  const sh1 = mix(mix(pal.edge, bedHex, dark ? 0.24 : 0.34), "#fff0c8", dark ? 0 : 0.1);
  const mid = mix(pal.edge, pal.deep, 0.35);
  const mid2 = sat(mix(pal.edge, pal.deep, 0.68), dark ? 0 : 0.12);
  const deep = sat(darken(pal.deep, dark ? 0 : 0.1), dark ? 0.05 : 0.32);
  const deep2 = dark ? mix(pal.deep, "#060a08", 0.4) : sat(mix(darken(pal.deep, 0.28), "#182a62", 0.2), 0.34);
  const steps = [sh0, sh1, pal.edge, mid, mid2, deep, deep2];
  const ramp = steps.map((h) => rgb(h));
  const foam = kind === "fen" ? mix(lighten(pal.shine, 0.4), "#d4d4bc", 0.3) : mix(lighten(pal.shine, 0.66), "#fff6e0", 0.3);
  const glint = mix(lighten(pal.shine, 0.5), "#ffffff", kind === "fen" ? 0.2 : 0.45);
  const L = {
    kind, pal, dark, rampHex: steps, ramp,
    bed: rgb(bedHex),
    lee: rgb(dark ? mix(pal.deep, "#000000", 0.4) : mix(darken(pal.deep, 0.28), "#2a2450", 0.18)),
    rim: warmMix(rgb(mix(pal.edge, pal.shine, 0.42)), 0.35),
    foam: warmMix(rgb(foam), 0.3), foamDk: rgb(mix(foam, pal.edge, 0.45)),
    // (glints warm only to a pale gold, never the sun's orange: at golden hour they read as embers)
    glint: paleGold(rgb(glint), 0.55), glintHot: paleGold(rgb(kind === "fen" ? lighten(glint, 0.2) : "#ffffff"), 0.35),
    // the sunlit shallows of the sea and a river's mouth over sand: brighter than ramp[0..1]
    shallowsLit: [rgb(mix(mix(pal.shine, bedHex, 0.3), "#fff3d2", dark ? 0 : 0.12)), rgb(mix(pal.edge, pal.shine, dark ? 0.3 : 0.48))],
    sky: rgb(mix(mid, pal.shine, dark ? 0.25 : 0.32)),
  };
  L.leeHex = hex3(L.lee); L.rimHex = hex3(L.rim); L.foamHex = hex3(L.foam); L.glintHex = hex3(L.glint);
  CACHE.set(key, L);
  return L;
};

export const depthStep = (k, i, j, jit) => {
  const v = (k < 0 ? 0 : k > 1 ? 1 : k) * (DEPTH_N - 1) + (jit === undefined ? (BAYER4(i, j) - 0.5) * 0.9 : jit);
  const s = Math.round(v);
  return s < 0 ? 0 : s > DEPTH_N - 1 ? DEPTH_N - 1 : s;
};
export const rampAt = (L, k, i, j) => L.ramp[depthStep(k, i, j)];
