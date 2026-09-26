// ============ RENDER: THE COAST ============
// A realm that runs down to the sea along one edge (REALM.coast, see the
// style guide "Coasts on the board"). world.js's tone map lays the sea's
// bands and the beach's sand pixel by pixel; paintShore (called once while
// the ground layer is painted) adds the surf, rocks awash, tideline litter,
// marram grass and driftwood; drawShoreLive (every frame) slides a wash of
// foam up the sand and back.

import { W, H, PATH_HALF, WALL_W } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { nearestOnPath } from "../engine/path.js";
import { COAST, coastLine, seaDepthAt, forestDepthAt } from "../data/terrain.js";
import { lighten, darken, mix, rgba, shadow, tuft, stone, hash } from "./paint.js";

const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// The sea's and the beach's tones for world.js's tone map, once per paint.
export const coastTones = (R) => {
  const wat = R.water || { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" };
  return {
    sea: [lighten(wat.shine, 0.45), mix(wat.shine, wat.edge, 0.35), wat.edge, mix(wat.edge, wat.deep, 0.5), wat.deep, darken(wat.deep, 0.18)].map(hexRGB),
    beach: ["#b09568", "#c9b07a", "#dcc48e", "#e6d29e"].map(hexRGB),
  };
};

// One pixel of the tone map, if it lies in the sea or on the beach: sd is
// how far seaward of the waterline it lies (+ is out to sea), t the turf's
// noise field there, dz the pixel's Bayer dither, (x, y) its world spot.
// Returns [r, g, b], or null for the turf to colour.
export const coastPixel = (tones, sd, t, dz, sandW, x, y) => {
  if (sd + dz * 3 > 0) {
    // out to sea: bands by distance, broken up by the turf's own noise
    const k = sd + (t - 0.5) * 10 + dz * 3;
    return tones.sea[k < 2.5 ? 0 : k < 9 ? 1 : k < 20 ? 2 : k < 34 ? 3 : k < 52 ? 4 : 5];
  }
  if (sd + dz * 5 > -sandW) {
    const k = sd + (t - 0.5) * 6 + dz * 2;
    return tones.beach[k > -4 ? 0 : k > -8 ? 1 : t + dz * 0.1 > 0.5 ? 3 : 2];
  }
  return null;
};

// The sea's surface and the beach's litter, over the tone map: lines of
// surf running parallel to the shore (broken, never a ruled stripe), a few
// rocks awash, shells and weed along the tideline, and the odd driftwood log.
export function paintShore(ctx) {
  const alongX = COAST.edge === "top" || COAST.edge === "bottom";
  const span = alongX ? W : H;
  // a point at u along the edge, `off` px out from the waterline (+ is seaward)
  const at = (u, off) => {
    const v = coastLine(u) - off;
    return COAST.edge === "top" ? [u, v] : COAST.edge === "bottom" ? [u, H - v] : COAST.edge === "left" ? [v, u] : [W - v, u];
  };
  const wat = REALM.water || { shine: "#8cc4d8" };
  const foam = lighten(wat.shine, 0.55);
  ctx.lineCap = "round";
  // surf: three rows of broken swell lines, the nearer the brighter
  [[5, 0.75, 1.6], [16, 0.5, 1.2], [31, 0.32, 1], [50, 0.2, 0.9]].forEach(([off, a, w], row) => {
    ctx.strokeStyle = rgba(foam, a);
    ctx.lineWidth = w;
    for (let u = -10, i = 0; u < span + 10; i++) {
      const len = 14 + hash(row * 97 + i, 3) * 26, gap = 6 + hash(row * 97 + i, 4) * 18;
      if (hash(row * 97 + i, 5) > 0.25) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const uu = u + (len * k) / 6;
          const [x, y] = at(uu, off + Math.sin(uu * 0.09 + row) * 1.5);
          if (seaDepthAt(x, y) < 2) break;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      u += len + gap;
    }
  });
  // rocks awash just offshore, each with a ring of foam
  for (let i = 0; i < 6; i++) {
    const u = 40 + hash(i, 61) * (span - 80), [x, y] = at(u, 12 + hash(i, 62) * 30);
    if (seaDepthAt(x, y) < 8 || x > W - WALL_W - 8) continue;
    const r = 3 + hash(i, 63) * 4;
    ctx.strokeStyle = rgba(foam, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 1, r + 2.5, (r + 2.5) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    stone(ctx, x, y, r, r * 0.7, "#7c7870");
  }
  // the tideline: shells, pebbles and dark weed on the wet sand
  for (let i = 0; i < 70; i++) {
    const u = hash(i, 64) * span, [x, y] = at(u, -3 - hash(i, 65) * (COAST.sand - 6));
    if (nearestOnPath(x, y).d < PATH_HALF + 4 || x > W - WALL_W - 2) continue;
    const kind = hash(i, 66);
    if (kind < 0.35) { ctx.fillStyle = kind < 0.18 ? "#f2e6d0" : "#e8b8a0"; ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1.5, 1); }
    else if (kind < 0.6) stone(ctx, x, y, 1.4, 1, "#a8a090");
    else if (kind < 0.8) { ctx.strokeStyle = rgba("#4a5a34", 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.quadraticCurveTo(x, y - 1.5, x + 3, y + 0.5); ctx.stroke(); }
  }
  // marram grass where the beach climbs into the turf
  const dune = mix(REALM.GRASS_DK, "#9a9660", 0.45), duneTip = mix(REALM.GRASS_LT, "#d8d098", 0.4);
  for (let i = 0; i < 90; i++) {
    const u = hash(i, 69) * span, [x, y] = at(u, -COAST.sand + 1 + hash(i, 70) * 8);
    if (nearestOnPath(x, y).d < PATH_HALF + 6 || x > W - WALL_W - 4 || forestDepthAt(x, y) > -6) continue;
    tuft(ctx, x, y, 0.7 + hash(i, 71) * 0.5, dune, duneTip, i);
  }
  // a driftwood log or two, high on the dry sand
  for (let i = 0; i < 2; i++) {
    const u = 120 + hash(i, 67) * (span - 260), [x, y] = at(u, -COAST.sand * 0.62);
    if (nearestOnPath(x, y).d < PATH_HALF + 14 || x > W - WALL_W - 18) continue;
    shadow(ctx, x + 1, y + 2, 11, 2.2, 0.25);
    ctx.save(); ctx.translate(x, y); ctx.rotate((hash(i, 68) - 0.5) * 0.5);
    ctx.fillStyle = "#8a7258"; ctx.fillRect(-10, -1.6, 20, 3.2);
    ctx.fillStyle = "#a88e70"; ctx.fillRect(-10, -1.6, 20, 1);
    ctx.fillStyle = "#6a5440"; ctx.fillRect(4, -3.4, 1.2, 2); ctx.fillRect(-10, -1.6, 1.2, 3.2);
    ctx.restore();
  }
}

// The sea is never still: a thin wash of foam slides up the wet sand and
// back, out of step along the shore. One stroked line a frame, over the
// baked ground. The waterline is sampled once per realm.
let SHORE = null;
export function drawShoreLive(ctx, g) {
  if (!COAST) return;
  if (!SHORE || SHORE.id !== REALM.id) {
    const alongX = COAST.edge === "top" || COAST.edge === "bottom", span = alongX ? W : H, pts = [];
    for (let u = -8; u <= span + 8; u += 6) {
      const v = coastLine(u);
      if (v < 2) continue;
      pts.push([u, v]);
    }
    SHORE = { id: REALM.id, pts, edge: COAST.edge };
  }
  const place = (u, v) => (SHORE.edge === "top" ? [u, v] : SHORE.edge === "bottom" ? [u, H - v] : SHORE.edge === "left" ? [v, u] : [W - v, u]);
  const t = g.time || 0;
  const foam = lighten((REALM.water || { shine: "#8cc4d8" }).shine, 0.6);
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [k, a, w] of [[0, 0.55, 1.6], [1, 0.28, 1]]) {
    ctx.strokeStyle = rgba(foam, a); ctx.lineWidth = w;
    ctx.beginPath();
    SHORE.pts.forEach(([u, v], i) => {
      // up the sand and back, a slow swell rolling along the shore
      const reach = 2.5 + 3 * Math.sin(t * 1.3 - u * 0.018 - k * 0.9) - k * 4;
      const [x, y] = place(u, v - reach);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}
