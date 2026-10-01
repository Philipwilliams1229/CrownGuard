// ============ RENDER: THE RIVER WATCH'S WATER ============
// A River Watch fights from its skiffs, and they go only where the water
// goes: the river their route follows, the pond or mere the hall is moored
// in, or the stretch of sea the coast route covers. So its area of control is
// drawn as that WATER — never a circle round the hall — and each skiff
// carries its own musket reach round it as it rows.
//
// - waterMask(): which art pixel of the board is which water (a river, a
//   pond, the sea) and which is under a bridge
//   deck. Baked once per realm, a slice at a time in idle moments after the
//   board appears (warmWaterReach), with the bodies and their tints after
//   it, so neither the first skiff nor the first tap pays for it.
// - drawWatchWater(ctx, g, x, y, tone): the body of water a hall moored at
//   (x, y) rows, LIT: each water pixel lifted a fixed step in light toward
//   its own water's shine (so black fen water gains as much as blue, and
//   keeps its hue — never screened with a warm colour, which turned it to
//   mud or ice), with a 1-2 art-px rim along the waterline in the tone
//   (gold selected, green / red for the build ghost) and dotted ticks
//   creeping along it in the range ring's style. Reeds, pads and stones in
//   the water keep their colour; where a body is cut off across open water
//   (a confluence, the sea past the skiffs' lane) the light fades out in
//   steps. The tint is baked once per body and tone and stamped; the edge is
//   a few hundred ticks off a baked, arc-length-sampled waterline. Drawn
//   with the water, under the bridges, so a deck passes over it.
// - drawSkiffReach(ctx, g, t, built): each live skiff's reach, a turning
//   ring of ticks: the fleet's edge bright, each boat's own ring carried on
//   softer through her sisters' reach (the boat under the cursor all
//   bright); an upgrade armed in the card adds its new reach, and the reach
//   of any skiff it adds at her station. No fill: the reach is rings only,
//   the ground stays the ground. drawSkiffMarks, over the crowd, puts a gold
//   caret over each boat (hollow: a station to come). drawWatchStation: the
//   build ghost's first skiff, her station and her reach.
// - fillWet(ctx, x, y, w, h): fills a rect only over the open water (a
//   wake's streak, a ripple, an oar's splash), off the mask's bytes, no clip.
//   clipToWater(ctx, x0, y0, x1, y1): a clip to the open water in a box that
//   stays put (a hall's piles), baked once per box.
//
// Where the water's edge lies is water.js's business: its river bank
// (riverField's smooth union, edgeOff's wobble, lean and spits) and pond
// shore (pondG) are MIRRORED below so the tint meets the painted waterline
// pixel for pixel; the sea's is world.js's (coastLine at each pixel's
// corner, as its tone map hands coastPixel). Change the edge
// there and change it here too (compare with skiff-reach-lab.html, zoomed on
// a bank).

import { W, H, WALL_W, S } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import * as TERRAIN from "../data/terrain.js";
import { PONDS, RIVERS, COAST, BRIDGES, BRIDGE_HALF, RIVER_ROUTE, seaRoute, seaDepthAt, coastLine, stationQ, patrolOf } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { pondAt } from "../engine/actions.js";
import { getStats } from "../engine/towers.js";
import { hash, PX } from "./paint.js";
import { drawBridges } from "./bridge.js";
import { skiffBob } from "./rigs-skiff.js";

// ---- the water's edge, as water.js paints it ----------------------------------

let LATTICE = null;
const vn = (x, y, cell, seed) => {
  const fx = x / cell + seed * 17.31, fy = y / cell + seed * 31.7;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = xi & 255, b = (xi + 1) & 255, c = (yi & 255) << 8, e = ((yi + 1) & 255) << 8;
  return (LATTICE[c + a] * (1 - u) + LATTICE[c + b] * u) * (1 - v) + (LATTICE[e + a] * (1 - u) + LATTICE[e + b] * u) * v;
};
const LX = 0.586, LY = 0.81, REACH = 9.5, MERGE = 12;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smin = (a, b) => { const h = Math.max(MERGE - Math.abs(a - b), 0) / MERGE; return Math.min(a, b) - h * h * MERGE * 0.25; };
const spitK = (n52, side) => {
  const k = (n52 - 0.5) * side - 0.05;
  if (k <= 0) return 0;
  const v = k > 0.2 ? 1 : k * 5;
  return v * v * (3 - 2 * v);
};
const edgeOff = (n42, n90, n52, n13, lat, hw, L) => {
  const side = lat > 0 ? 1 : -1;
  let e = (n42 - 0.5) * 2.0 + (n13 - 0.5) * 2.2 + 0.75;
  if (L > 0 && n13 > 0.35) e += (n13 - 0.35) * (n13 - 0.35) * 6.8 * L;
  e -= (n90 - 0.5) * 3.4 * side;
  e += spitK(n52, side) * Math.min(5.5, hw * 0.34);
  if (e < -0.5) e = -0.5 - 1.6 * (1 - Math.exp((e + 0.5) / 1.6));
  return e > hw * 0.55 ? hw * 0.55 : e;
};
const GEO = { nx: 0, ny: 0, lat: 0, hw: 0 };
const geo = (sg, x, y) => {
  let t = ((x - sg.x1) * sg.vx + (y - sg.y1) * sg.vy) / sg.L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = x - (sg.x1 + sg.vx * t), dy = y - (sg.y1 + sg.vy * t), d = Math.sqrt(dx * dx + dy * dy);
  if (d > 1e-4) { GEO.nx = dx / d; GEO.ny = dy / d; } else { GEO.nx = -sg.ty; GEO.ny = sg.tx; }
  GEO.lat = sg.tx * dy - sg.ty * dx > 0 ? d : -d;
  GEO.hw = sg.hw;
  return GEO;
};
const pastEdge = (x, y) => {
  let best = 99;
  for (const rv of RIVERS) for (const s of rv.segs) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const f = Math.hypot(x - s.x1 - vx * t, y - s.y1 - vy * t) - rv.w / 2;
    if (f < best) best = f;
  }
  return best;
};
// a pond's shore
const pondShape = (p, k) => {
  const rx = p.w / 2, ry = p.h / 2, wallX = W - WALL_W - 9;
  return {
    k, x: p.x, y: p.y, rx, ry, rxE: p.x + rx > wallX ? Math.max(rx * 0.45, wallX - p.x) : rx, m: Math.min(rx, ry),
    s: (((REALM.seed | 0) + Math.round(p.x * 3 + p.y)) % 97 + 97) % 97,
    open: p.t !== "lava" && p.t !== "ice",
  };
};
const ellF = (P, x, y) => {
  const dx = x - P.x, dy = y - P.y, rx = dx > 0 ? P.rxE : P.rx, ry = P.ry;
  const k = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
  const gx = dx / (rx * rx), gy = dy / (ry * ry), gl = Math.sqrt(gx * gx + gy * gy);
  return gl < 1e-6 ? -Math.min(rx, ry) : (k - 1) * k / gl;
};
const pondWob = (P, x, y) => {
  const m = P.m, s = P.s, huge = m > 36, a1 = Math.min(huge ? 7 : 5, 1.8 + m * 0.06);
  const np = vn(x, y, 6, s + 22);
  let e = (vn(x, y, Math.max(14, m * 0.6), s + 21) - 0.5) * a1 * 2 + (np - 0.5) * 0.7 + a1 * 0.35;
  if (huge) e += (vn(x, y, m * 1.2, s + 23) - 0.5) * Math.min(20, (m - 36) * 0.5) * 2;
  const gap = Math.min((x > P.x ? P.rxE : P.rx) - Math.abs(x - P.x), P.ry - Math.abs(y - P.y)), out = gap > 0 ? Math.min(11, 3.5 + gap * 0.7) : 3.5;
  const inn = huge ? 7.5 : 5.5;
  return e > inn ? inn + (e - inn) * 0.25 : e < -out ? -out + (e + out) * 0.25 : e;
};
const pondG = (P, x, y) => { const f = ellF(P, x, y); return f > 14 ? f : f + pondWob(P, x, y); };
const touchesRiver = (P) => {
  for (let q = 0; q < 48; q++) {
    const a = (q / 48) * Math.PI * 2, ca = Math.cos(a);
    if (pastEdge(P.x + ca * (ca > 0 ? P.rxE : P.rx), P.y + Math.sin(a) * P.ry) < 3) return true;
  }
  return false;
};

// ---- the rivers' water, row by row ------------------------------------------------
// riverField's walk (each river's segments in order, the earlier rivers
// folded by a smooth union into A, the latest into B), then riverBody's
// test: past the bank's edge (edgeOff) or inside a joined pond's shore.

// one segment's reach along one row
const segRow = (sg, R, ri, sid, y, i0, i1, r, F) => {
  const x1 = sg.x1, y1 = sg.y1, vx = sg.vx, vy = sg.vy, L2 = sg.L2, rr = R.reach * R.reach, hw = R.hw, tag = ri + 1;
  const { FA, FB, SA, SB, RIV } = F;
  for (let i = i0; i <= i1; i++) {
    const x = (i + 0.5) / r;
    let t = ((x - x1) * vx + (y - y1) * vy) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (x1 + vx * t), dy = y - (y1 + vy * t), d2 = dx * dx + dy * dy;
    if (d2 > rr) continue;
    const f = Math.sqrt(d2) - hw;
    if (RIV[i] !== tag) {
      if (FB[i] < 99) { const a = FA[i], b = FB[i]; FA[i] = smin(a, b); if (b < a) SA[i] = SB[i]; }
      FB[i] = f; SB[i] = sid; RIV[i] = tag;
    } else if (f < FB[i]) { FB[i] = f; SB[i] = sid; }
  }
};
// the stretch of a row a segment can reach, into SPAN; false if none
const SPAN = [0, 0];
const spanOf = (sg, R, y, r, mw) => {
  if (y < sg.ya || y > sg.yb) return false;
  let ta = 0, tb = 1;
  if (Math.abs(sg.vy) >= 1e-6) {
    ta = (y - R.reach - sg.y1) / sg.vy; tb = (y + R.reach - sg.y1) / sg.vy;
    if (ta > tb) { const q = ta; ta = tb; tb = q; }
    ta = ta < 0 ? 0 : ta; tb = tb > 1 ? 1 : tb;
    if (ta > tb) return false;
  }
  const xa = sg.x1 + sg.vx * ta, xb = sg.x1 + sg.vx * tb;
  SPAN[0] = Math.max(0, Math.floor((Math.min(xa, xb) - R.reach) * r));
  SPAN[1] = Math.min(mw - 1, Math.ceil((Math.max(xa, xb) + R.reach) * r));
  return true;
};
// The slow noises on water.js's own grid, one unit apart from ITS raster's
// corner and read bilinearly as riverBody reads them, so the edge lands on
// the very same pixels (each node worked out once, when first wanted).
const noiseGrid = (JP, s, r) => {
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const rv of RIVERS) for (const [px, py] of rv.pts) {
    const m = rv.w / 2 + 16;
    bx0 = Math.min(bx0, px - m); by0 = Math.min(by0, py - m); bx1 = Math.max(bx1, px + m); by1 = Math.max(by1, py + m);
  }
  for (const P of JP) { bx0 = Math.min(bx0, P.x - P.rx - 12); by0 = Math.min(by0, P.y - P.ry - 12); bx1 = Math.max(bx1, P.x + P.rx + 12); by1 = Math.max(by1, P.y + P.ry + 12); }
  const x0 = Math.floor(Math.max(bx0, 0) * r) / r, y0 = Math.floor(Math.max(by0, 0) * r) / r;
  const cw = Math.ceil(Math.min(bx1, W) - x0) + 4, ch = Math.ceil(Math.min(by1, H) - y0) + 4;
  return { x0, y0, cw, s, SV: new Float32Array(cw * ch * 4), SD: new Uint8Array(cw * ch), out: new Float32Array(4) };
};
const gridNode = (N, c) => {
  N.SD[c] = 1;
  const o = c * 4, X = N.x0 + (c % N.cw), Y = N.y0 + ((c / N.cw) | 0), s = N.s;
  N.SV[o] = vn(X, Y, 42, s + 11); N.SV[o + 1] = vn(X, Y, 90, s + 13); N.SV[o + 2] = vn(X, Y, 52, s + 15); N.SV[o + 3] = vn(X, Y, 13, s);
};
const noiseAt = (N, x, y) => {
  const gx = x - N.x0, gy = y - N.y0, ia = gx | 0, ja = gy | 0, fx = gx - ia, fy = gy - ja, cw = N.cw, SV = N.SV, SD = N.SD;
  const c00 = ja * cw + ia;
  if (!SD[c00]) gridNode(N, c00);
  if (!SD[c00 + 1]) gridNode(N, c00 + 1);
  if (!SD[c00 + cw]) gridNode(N, c00 + cw);
  if (!SD[c00 + cw + 1]) gridNode(N, c00 + cw + 1);
  const o00 = c00 * 4, o10 = o00 + 4, o01 = o00 + cw * 4, o11 = o01 + 4;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  for (let q = 0; q < 4; q++) N.out[q] = SV[o00 + q] * w00 + SV[o10 + q] * w10 + SV[o01 + q] * w01 + SV[o11 + q] * w11;
  return N.out;
};
// one row's pixels: water or not, and whose
const combineRow = (lab, row, y, lo, hi, r, F, segs, rowJP, N) => {
  const { FA, FB, SA, SB } = F;
  for (let i = lo; i <= hi; i++) {
    const fa = FA[i], fb = FB[i], f = fa < 99 ? smin(fa, fb) : fb;
    const x = (i + 0.5) / r;
    let P = null, gp = 99;
    for (let q = 0; q < rowJP.length; q++) {
      const Q = rowJP[q];
      if (x < Q.x - Q.rx - 12 || x > Q.x + Q.rx + 12) continue;
      const v = pondG(Q, x, y);
      if (v < REACH && v < gp) { gp = v; P = Q; }
    }
    if (f >= REACH && !P) continue;
    let g = 99, river = 0;
    if (fb < 99) {
      const B = geo(segs[SB[i]], x, y);
      let nx = B.nx, ny = B.ny, lat = B.lat, hw = B.hw;
      river = segs[SB[i]].ri + 1;
      if (fa < 99 && Math.abs(fa - fb) < MERGE) {
        // in a confluence: the normal turned between the two rivers' own
        const h = clamp01(0.5 + 0.5 * (fb - fa) / MERGE);
        const bx = nx, by = ny, bl = lat, bh = hw;
        const A = geo(segs[SA[i]], x, y);
        nx = A.nx * h + bx * (1 - h); ny = A.ny * h + by * (1 - h);
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        if (h < 0.5) { lat = bl; hw = bh; } else { lat = A.lat; hw = A.hw; river = segs[SA[i]].ri + 1; }
      } else if (fa < fb) {
        const A = geo(segs[SA[i]], x, y);
        nx = A.nx; ny = A.ny; lat = A.lat; hw = A.hw; river = segs[SA[i]].ri + 1;
      }
      // (the bank stands in at most hw * 0.55 and back at most 2.1: past
      // either, the noise can't change the answer)
      if (!P && f >= 2.2) continue;
      if (!P && f < -hw * 0.55 - 0.05) g = -1;
      else {
        const n = noiseAt(N, x, y);
        g = f + edgeOff(n[0], n[1], n[2], n[3], lat, hw, LX * nx + LY * ny);
      }
    }
    const gr = g;
    if (P) g = g < 99 ? smin(g, gp) : gp;
    const k = row + i;
    if (g >= 0) { if (g < REACH && P) lab[k] = 0; continue; }
    lab[k] = P && gp < gr ? POND0 + P.k : river || (P ? POND0 + P.k : 0);
  }
};

// the rows, a slice at a time (a generator: it yields every ROWS_PER rows)
const ROWS_PER = 48;
function* riverRows(lab, JP, s, r, mw, mh) {
  const segs = [], many = RIVERS.length > 1;
  const rivs = RIVERS.map((rv, ri) => {
    const hw = rv.w / 2, reach = hw + REACH + (many ? MERGE * 0.5 : 0), list = [];
    for (const s2 of rv.segs) {
      const vx = s2.x2 - s2.x1, vy = s2.y2 - s2.y1;
      list.push(segs.length);
      segs.push({ ri, x1: s2.x1, y1: s2.y1, vx, vy, L2: s2.len * s2.len, tx: vx / s2.len, ty: vy / s2.len, hw,
        ya: Math.min(s2.y1, s2.y2) - reach, yb: Math.max(s2.y1, s2.y2) + reach });
    }
    return { hw, reach, list };
  });
  const F = { FA: new Float32Array(mw), FB: new Float32Array(mw), SA: new Uint16Array(mw), SB: new Uint16Array(mw), RIV: new Uint8Array(mw) };
  const N = noiseGrid(JP, s, r);
  for (let j = 0; j < mh; j++) {
    if (j && j % ROWS_PER === 0) yield;
    const y = (j + 0.5) / r;
    const rowJP = JP.length ? JP.filter((P) => y > P.y - P.ry - 12 && y < P.y + P.ry + 12) : JP;
    // this row's reach, cleared, then each river's segments walked in order
    let lo = mw, hi = -1;
    for (const P of rowJP) { lo = Math.min(lo, Math.floor((P.x - P.rx - 12) * r)); hi = Math.max(hi, Math.ceil((P.x + P.rx + 12) * r)); }
    for (const R of rivs) for (const sid of R.list) if (spanOf(segs[sid], R, y, r, mw)) { lo = Math.min(lo, SPAN[0]); hi = Math.max(hi, SPAN[1]); }
    lo = Math.max(0, lo); hi = Math.min(mw - 1, hi);
    if (hi < lo) continue;
    F.FA.fill(99, lo, hi + 1); F.FB.fill(99, lo, hi + 1); F.RIV.fill(0, lo, hi + 1);
    for (let ri = 0; ri < rivs.length; ri++) {
      const R = rivs[ri];
      for (const sid of R.list) if (spanOf(segs[sid], R, y, r, mw)) segRow(segs[sid], R, ri, sid, y, SPAN[0], SPAN[1], r, F);
    }
    combineRow(lab, j * mw, y, lo, hi, r, F, segs, rowJP, N);
  }
}

// ---- the mask ------------------------------------------------------------------
// One byte per art pixel: 0 dry land, 1..15 a river (its index + 1), 16 + k
// pond k, SEA the sea; DECK set where a bridge
// is drawn over it. With it, each kind's box (MASK.box: i0, j0, i1, j1).
const POND0 = 16, SEA = 64, DECK = 128, KIND = 127;
let MASK = null;
let STEP = "";   // (the phase in hand, for the warm-up's longest slice)

// The bake, a slice at a time: each yield is a few ms of work.
function* bakeSteps(M) {
  if (!LATTICE) { LATTICE = new Float32Array(65536); for (let i = 0; i < 65536; i++) LATTICE[i] = hash(i, 911); }
  const r = M.px, mw = M.mw, mh = M.mh, lab = M.lab, ms = M.ms;
  let t0 = performance.now();
  const lap = (k) => { const t = performance.now(); ms[k] = (ms[k] || 0) + t - t0; t0 = t; };
  const s = ((REALM.seed | 0) % 97 + 97) % 97;
  const shapes = PONDS.map(pondShape);
  const JP = RIVERS.length ? shapes.filter((P) => P.open && touchesRiver(P)) : [];
  STEP = "m-ponds";
  // ponds on their own (painted first; a river may paint over them)
  for (const P of shapes) {
    if (!P.open || JP.includes(P)) continue;
    const j0 = Math.max(0, Math.floor((P.y - P.ry - 10) * r)), j1 = Math.min(mh - 1, Math.ceil((P.y + P.ry + 10) * r));
    const i0 = Math.max(0, Math.floor((P.x - P.rx - 10) * r)), i1 = Math.min(mw - 1, Math.ceil((P.x + P.rx + 10) * r));
    for (let j = j0; j <= j1; j++) {
      const y = (j + 0.5) / r;
      for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) / r;
        // (well inside the shore's reach the wobble can't lift it out)
        const f = ellF(P, x, y);
        if (f <= 10 && (f < -15 || f + pondWob(P, x, y) < 0)) lab[j * mw + i] = POND0 + P.k;
      }
      if (j % ROWS_PER === ROWS_PER - 1) { lap("ponds"); yield; t0 = performance.now(); }
    }
    lap("ponds"); yield; t0 = performance.now();
  }
  STEP = "m-rivers";
  // the rivers, merged as water.js merges them (a smooth union), with any
  // pond that runs into one
  if (RIVERS.length) {
    const it = riverRows(lab, JP, s, r, mw, mh);
    while (!it.next().done) { lap("rivers"); yield; t0 = performance.now(); }
    lap("rivers");
  }
  STEP = "m-sea";
  // the sea, as world.js paints it: past the waterline read at each
  // pixel's corner (its coastPixel's sd > 0), so the light and its rim
  // start on the foam where the wet sand ends
  if (COAST) {
    const e = COAST.edge, along = e === "top" || e === "bottom";
    for (let a = 0, na = along ? mw : mh; a < na; a++) {
      const line = coastLine(a / r);
      if (line > 0) {
        for (let b = 0, nb = along ? mh : mw; b < nb; b++) {
          const c = b / r;
          if (line - (e === "top" || e === "left" ? c : (along ? H : W) - c) <= 0) continue;
          const k = along ? b * mw + a : a * mw + b;
          if (!lab[k]) lab[k] = SEA;
        }
      }
      if ((a & 255) === 255) { lap("sea"); yield; t0 = performance.now(); }
    }
    lap("sea");
  }
  STEP = "m-bridges";
  // what the bridges cover: each span drawn on its own and read back
  if (BRIDGES.length && typeof document !== "undefined") {
    for (const b of BRIDGES) {
      const R = (b.d1 - b.d0) / 2 + BRIDGE_HALF + 16;
      const i0 = Math.max(0, Math.floor((b.x - R) * r)), i1 = Math.min(mw, Math.ceil((b.x + R) * r));
      const j0 = Math.max(0, Math.floor((b.y - R - 12) * r)), j1 = Math.min(mh, Math.ceil((b.y + R) * r));
      if (i1 <= i0 || j1 <= j0) continue;
      const cv = document.createElement("canvas");
      cv.width = i1 - i0; cv.height = j1 - j0;
      const c = cv.getContext("2d", { willReadFrequently: true });
      c.imageSmoothingEnabled = false;
      c.translate(-i0, -j0);
      c.scale(r, r);
      drawBridges(c, { time: 0 });
      const d = c.getImageData(0, 0, cv.width, cv.height).data;
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
        const k = j * mw + i;
        // (the deck, not its shadow on the water)
        if (lab[k] && d[((j - j0) * cv.width + (i - i0)) * 4 + 3] > 200) lab[k] |= DECK;
      }
      lap("bridges"); yield; t0 = performance.now();
    }
  }
  STEP = "m-boxes";
  // each kind's box, so a body never scans the whole board for itself
  const box = new Int32Array(128 * 4);
  for (let q = 0; q < 128; q++) { box[q * 4] = mw; box[q * 4 + 1] = mh; box[q * 4 + 2] = -1; box[q * 4 + 3] = -1; }
  for (let j = 0; j < mh; j++) {
    const o = j * mw;
    for (let i = 0; i < mw; i++) {
      const v = lab[o + i];
      if (!v) continue;
      const q = (v & KIND) * 4;
      if (i < box[q]) box[q] = i;
      if (i > box[q + 2]) box[q + 2] = i;
      if (j < box[q + 1]) box[q + 1] = j;
      box[q + 3] = j;
    }
    if (j % 120 === 119) { lap("boxes"); yield; t0 = performance.now(); }
  }
  M.box = box;
  lap("boxes");
}

// the mask for the board in play (a new one when the realm changes; its bake
// may still be under way — waterMask() finishes it, maskJob() does not)
const current = () => MASK && MASK.realm === REALM && MASK.rivers === RIVERS && MASK.ponds === PONDS && MASK.coast === COAST && MASK.bridges === BRIDGES && MASK.px === PX;
const maskJob = () => {
  if (current()) return MASK;
  const has = !!(RIVERS.length || PONDS.length || COAST), mw = W * PX, mh = H * PX;
  MASK = { realm: REALM, rivers: RIVERS, ponds: PONDS, coast: COAST, bridges: BRIDGES, px: PX, mw, mh,
    lab: has ? new Uint8Array(mw * mh) : null, box: null, bodies: new Map(), clips: new Map(), ms: {}, done: !has, job: null };
  if (has) MASK.job = bakeSteps(MASK);
  return MASK;
};
const stepMask = (M) => { if (M.done) return true; if (M.job.next().done) { M.done = true; M.job = null; } return M.done; };
export const waterMask = () => {
  const M = maskJob();
  while (!stepMask(M));
  return M;
};
// The mask if it's ready; null while the idle warm-up is still baking it
// (the wakes and a hall's ripples wait a few frames rather than stall one).
// With no warm-up under way (a lab page drawing skiffs on its own), baked now.
const readyMask = () => {
  if (MASK && MASK.done && current()) return MASK;
  if (WARM && !WARM.done && WARM.realm === REALM && WARM.mask === MASK && current()) return null;
  return waterMask();
};

// ---- keeping to the water ------------------------------------------------------------
// Fills the rect (world units) with ctx's fillStyle only over the open water
// (no deck over it): a wake's streak, a ripple, an oar's splash. It reads
// the mask along the rect's own rows — a few hundred bytes a skiff a frame —
// and draws one rect per wet run (rows alike merge); all water, one rect.
const RA = [], RB = [];
export const fillWet = (ctx, x, y, w, h) => {
  if (waterMask.noClip) { ctx.fillRect(x, y, w, h); return; }
  const M = readyMask();
  if (!M) return;   // (a few frames, while the warm-up bakes it)
  if (!M.lab) { ctx.fillRect(x, y, w, h); return; }
  const r = M.px, mw = M.mw, lab = M.lab;
  const i0 = Math.max(0, Math.floor(x * r + 1e-6)), i1 = Math.min(mw, Math.ceil((x + w) * r - 1e-6));
  const j0 = Math.max(0, Math.floor(y * r + 1e-6)), j1 = Math.min(M.mh, Math.ceil((y + h) * r - 1e-6));
  if (i1 <= i0 || j1 <= j0) return;
  let n = 0, top = j0;
  const flush = (jEnd) => {
    const ay = Math.max(y, top / r), by = Math.min(y + h, jEnd / r);
    for (let q = 0; q < n; q += 2) {
      const ax = Math.max(x, RA[q] / r), bx = Math.min(x + w, RA[q + 1] / r);
      if (bx > ax && by > ay) ctx.fillRect(ax, ay, bx - ax, by - ay);
    }
  };
  for (let j = j0; j < j1; j++) {
    const o = j * mw;
    let m = 0, a = -1;
    for (let i = i0; i <= i1; i++) {
      const v = i < i1 ? lab[o + i] : 0, wet = v !== 0 && (v & DECK) === 0;
      if (wet) { if (a < 0) a = i; } else if (a >= 0) { RB[m++] = a; RB[m++] = i; a = -1; }
    }
    if (j > j0) {
      let same = m === n;
      for (let q = 0; same && q < m; q++) if (RB[q] !== RA[q]) same = false;
      if (same) continue;
      flush(j);
    }
    for (let q = 0; q < m; q++) RA[q] = RB[q];
    n = m; top = j;
  }
  flush(j1);
};

// Clips ctx to the open water (no deck over it) inside a box that stays put
// (a hall's piles), in world units; the clip is worked out once per box and
// kept. Returns 0 when there is no water (draw nothing), 1 when the box is
// all water or `portrait` (a menu's stand-in, off the board: no clip), 2 when
// a clip was set. Wrap in save/restore.
export const clipToWater = (ctx, x0, y0, x1, y1, portrait = false) => {
  if (portrait || waterMask.noClip) return 1;
  const M = readyMask();
  if (!M) return 0;   // (a few frames, while the warm-up bakes it)
  if (!M.lab) return 1;
  const r = M.px, I0 = Math.floor(x0 * r), I1 = Math.ceil(x1 * r) - 1, J0 = Math.floor(y0 * r), J1 = Math.ceil(y1 * r) - 1;
  const key = `${I0},${J0},${I1},${J1}`;
  let c = M.clips.get(key);
  if (!c) {
    c = clipOf(M, I0, J0, I1, J1);
    if (M.clips.size > 160) M.clips.clear();   // (a ghost dragged about makes a new box a frame)
    M.clips.set(key, c);
  }
  if (c.v === 2) ctx.clip(c.p);
  return c.v;
};
const clipOf = (M, I0, J0, I1, J1) => {
  const r = M.px, mw = M.mw, lab = M.lab;
  const i0 = Math.max(0, I0), i1 = Math.min(mw - 1, I1), j0 = Math.max(0, J0), j1 = Math.min(M.mh - 1, J1);
  if (i1 < i0 || j1 < j0) return { v: 0 };
  let wet = 0, dry = 0;
  const rows = [];
  for (let j = j0; j <= j1; j++) {
    const row = [], o = j * mw;
    let a = -1;
    for (let i = i0; i <= i1 + 1; i++) {
      const v = i <= i1 ? lab[o + i] : 0, w = v !== 0 && !(v & DECK);
      if (i <= i1) { if (w) wet++; else dry++; }
      if (w && a < 0) a = i;
      else if (!w && a >= 0) { row.push(a, i); a = -1; }
    }
    rows.push(row);
  }
  if (!wet) return { v: 0 };
  if (!dry && i0 === I0 && i1 === I1 && j0 === J0 && j1 === J1) return { v: 1 };
  const p = new Path2D();
  // runs that repeat down the rows go in as one rect
  let prev = null, top = j0;
  const flush = (row, ja, jb) => { if (row) for (let q = 0; q < row.length; q += 2) p.rect(row[q] / r, ja / r, (row[q + 1] - row[q]) / r, (jb - ja) / r); };
  for (let j = j0; j <= j1 + 1; j++) {
    const row = j <= j1 ? rows[j - j0] : null;
    const same = prev && row && row.length === prev.length && row.every((v, q) => v === prev[q]);
    if (same) continue;
    flush(prev, top, j);
    prev = row; top = j;
  }
  return { v: 2, p };
};

// ---- the body of water a hall's skiffs row ------------------------------------------
// The engine's choice (update.js, "the River Watch"): moored in a pond or
// mere, a ring round it; off a coast, the coast; otherwise a river route.
// Today that is the board's FIRST river (RIVER_ROUTE) wherever the hall
// moors; once terrain.js offers a route per river (riverRouteAt(x, y) and
// RIVER_ROUTES), the one it is moored in — read here by name, so the light
// follows the engine the day it changes.
const ROUTE_AT = "riverRouteAt", ROUTES = "RIVER_ROUTES";
const riverRoute = (x, y) => (typeof TERRAIN[ROUTE_AT] === "function" ? TERRAIN[ROUTE_AT](x, y) : RIVER_ROUTE);
// which river a route rows: its own `ri`, or the river nearest its middle
const ROUTE_RIVER = new WeakMap();
const riverOfRoute = (rt) => {
  if (rt.ri != null) return rt.ri;
  let ri = ROUTE_RIVER.get(rt);
  if (ri === undefined) {
    const [mx, my] = rt.at(rt.total / 2);
    let bd = Infinity;
    ri = 0;
    RIVERS.forEach((rv, i) => {
      for (const s2 of rv.segs) {
        const vx = s2.x2 - s2.x1, vy = s2.y2 - s2.y1, t = Math.max(0, Math.min(1, ((mx - s2.x1) * vx + (my - s2.y1) * vy) / (s2.len * s2.len)));
        const d = Math.hypot(mx - s2.x1 - vx * t, my - s2.y1 - vy * t);
        if (d < bd) { bd = d; ri = i; }
      }
    });
    ROUTE_RIVER.set(rt, ri);
  }
  return ri;
};
export const watchWater = (x, y) => {
  const p = pondAt(x, y);
  if (p) return { id: `p${PONDS.indexOf(p)}`, kind: "pond", pond: p };
  if (seaDepthAt(x, y) > 0) { const rt = seaRoute(); return rt ? { id: "sea", kind: "sea", rt } : null; }
  const rt = riverRoute(x, y);
  if (!rt) return null;
  const ri = riverOfRoute(rt);
  return { id: `r${ri}`, kind: "river", ri, rt };
};
// every body a River Watch on this board could row (for the warm-up)
const watchBodies = () => {
  const out = [], routes = Array.isArray(TERRAIN[ROUTES]) ? TERRAIN[ROUTES] : [RIVER_ROUTE];
  for (const rt of routes) {
    if (!rt) continue;
    const ri = riverOfRoute(rt);
    if (!out.some((w) => w.id === `r${ri}`)) out.push({ id: `r${ri}`, kind: "river", ri, rt });
  }
  PONDS.forEach((p, i) => { if (p.t !== "lava" && p.t !== "ice" && p.w >= 50) out.push({ id: `p${i}`, kind: "pond", pond: p }); });
  const sr = seaRoute();
  if (sr) out.push({ id: "sea", kind: "sea", rt: sr });
  return out;
};
// the skiffs' rowing line (the engine's own shapes; a pond's is the same
// ellipse update.js's pondRoute rows)
const POND_RT = new WeakMap();
export const watchRoute = (x, y) => {
  const w = watchWater(x, y);
  if (!w) return null;
  if (w.rt) return patrolOf(w.rt, x, y);   // a river or coast is rowed only PATROL_LEN of it
  const p = w.pond;
  let rt = POND_RT.get(p);
  if (!rt) {
    const rx = Math.max(8, p.w / 2 - 12), ry = Math.max(6, p.h / 2 - 9);
    const total = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    rt = { total, ring: true, at: (q) => { const a = (q / total) * Math.PI * 2; return [p.x + Math.cos(a) * rx, p.y + Math.sin(a) * ry]; } };
    POND_RT.set(p, rt);
  }
  return rt;
};

// The tones. The light is a fixed step up (`lift`, in luma) toward the
// water's own shine — half a hue-keeping brightening, half a mix toward the
// shine (`toward`) — so every water keeps its colour and the dark fen gains
// as much as the blue; the tone's colour lives in the rim (rimA: the
// waterline's own pixel, the one inside it) and the ticks.
const TONES = {
  sel: { lift: 26, toward: 0.5, maxK: 0.55, rim: [240, 204, 98], rimA: [0.85, 0.4], tick: "rgba(232,196,90,0.9)", ring: "rgba(232,196,90,0.9)" },
  ok: { lift: 24, toward: 0.5, maxK: 0.5, rim: [156, 236, 150], rimA: [0.8, 0.35], tick: "rgba(150,232,150,0.85)", ring: "rgba(150,232,150,0.6)" },
  bad: { lift: 20, toward: 0.5, maxK: 0.45, rim: [240, 128, 116], rimA: [0.8, 0.35], tick: "rgba(232,120,110,0.85)", ring: "rgba(232,120,110,0.6)" },
};
const EDGE_IN = 1.5;       // the ticks ride this far in from the waterline
const CASTLE_X = W - WALL_W + 2;   // past here the castle stands over the water
const SEA_REACH = 20;      // the lit sea runs this far past the skiffs' lane
const FEATHER = 16;        // art px: a body cut off across open water fades out over this

// A body: which pixels are its own (IN, in its box), how near dry land each
// lies (EDGE 0 on the waterline .. 3, 9 farther), how near a cut across open
// water (CUT, art px, FEATHER and more if none), and its waterline as runs
// of points one unit apart (only where the water meets dry land — never
// across open water into another body, nor under the castle). Worked out a
// slice at a time (bodySteps), once per body.
function* bodySteps(M, w, B) {
  const r = M.px, mw = M.mw, mh = M.mh, lab = M.lab;
  const want = w.kind === "river" ? w.ri + 1 : w.kind === "pond" ? POND0 + Number(w.id.slice(1)) : SEA;
  let I0 = M.box[want * 4], J0 = M.box[want * 4 + 1], I1 = M.box[want * 4 + 2], J1 = M.box[want * 4 + 3];
  if (I1 < 0) { B.empty = true; return; }
  STEP = "b-band";
  // the sea: the stretch the coast route runs, from the beach out to a
  // little past the skiffs' lane
  let band = null;
  if (w.kind === "sea") {
    const e = COAST.edge, alongX = e === "top" || e === "bottom", rt = w.rt, k = alongX ? 0 : 1;
    const a = rt.at(0), b = rt.at(rt.total);
    const uA = Math.min(a[k], b[k]) - 14, uB = Math.max(a[k], b[k]) + 14;
    const lane = seaDepthAt(...rt.at(rt.total / 2)), reach = lane + SEA_REACH;
    const n = alongX ? mw : mh, line = new Float32Array(n);
    for (let q = 0; q < n; q++) line[q] = coastLine(q / r);
    band = (i, j) => {
      const q = alongX ? i : j, u = (q + 0.5) / r;
      if (u < uA || u > uB) return false;
      const c = (alongX ? j : i) / r;
      return line[q] - (e === "top" || e === "left" ? c : (alongX ? H : W) - c) <= reach;
    };
  }
  const inBody = (i, j) => (lab[j * mw + i] & KIND) === want && (!band || band(i, j));
  // its own pixels and their box
  STEP = "b-scan";
  // (rows a slice: about 20k pixels' worth)
  const per = (w2) => Math.max(4, Math.floor(20000 / Math.max(1, w2)));
  let i0 = mw, i1 = -1, j0 = mh, j1 = -1, pr = per(I1 - I0 + 1);
  for (let j = J0; j <= J1; j++) {
    for (let i = I0; i <= I1; i++) {
      if (!inBody(i, j)) continue;
      if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; j1 = j;
    }
    if ((j - J0) % pr === pr - 1) yield;
  }
  if (i1 < 0) { B.empty = true; return; }
  yield;
  const bw = i1 - i0 + 1, bh = j1 - j0 + 1;
  STEP = "b-in";
  const IN = new Uint8Array(bw * bh);
  let cut = false;
  pr = per(bw);
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) if (inBody(i0 + i, j0 + j)) IN[j * bw + i] = 1;
    if (j % pr === pr - 1) yield;
  }
  yield;
  const at = (i, j) => (i < 0 || j < 0 || i >= bw || j >= bh ? 0 : IN[j * bw + i]);
  // is (gi, gj) — board pixels — water that isn't this body's? (a cut)
  const other = (gi, gj) => gi >= 0 && gj >= 0 && gi < mw && gj < mh && (lab[gj * mw + gi] & KIND) !== 0 && !(at(gi - i0, gj - j0));
  STEP = "b-edge";
  // how near the edge each pixel lies (0 = on it, up to 3), for the rim
  const EDGE = new Uint8Array(bw * bh);
  // an edge only where dry land lies: a body cut off across open water
  // (the sea's ends, a river running on into another) takes no rim
  const probe = (ii, jj) => { if (at(ii, jj)) return false; const gi = i0 + ii, gj = j0 + jj; if (gi < 0 || gj < 0 || gi >= mw || gj >= mh) return false; return (lab[gj * mw + gi] & KIND) === 0; };
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      if (!IN[j * bw + i]) continue;
      let d = 9;
      for (let q = 1; q <= 3 && d === 9; q++) {
        if (probe(i - q, j) || probe(i + q, j) || probe(i, j - q) || probe(i, j + q)) d = q - 1;
      }
      EDGE[j * bw + i] = d;
      if (!cut && (other(i0 + i - 1, j0 + j) || other(i0 + i + 1, j0 + j) || other(i0 + i, j0 + j - 1) || other(i0 + i, j0 + j + 1))) cut = true;
    }
    if (j % pr === pr - 1) yield;
  }
  yield;
  STEP = "b-cut";
  // How near a cut each pixel lies: a chamfer distance (3-4) from every
  // pixel of other water within FEATHER of the box
  let CUT = null;
  if (cut) {
    const P = FEATHER + 1, px0 = Math.max(0, i0 - P), py0 = Math.max(0, j0 - P), px1 = Math.min(mw - 1, i1 + P), py1 = Math.min(mh - 1, j1 + P);
    const pw = px1 - px0 + 1, ph = py1 - py0 + 1, D = new Uint16Array(pw * ph), INF = 60000, pp = per(pw);
    for (let j = 0; j < ph; j++) {
      for (let i = 0; i < pw; i++) D[j * pw + i] = other(px0 + i, py0 + j) ? 0 : INF;
      if (j % pp === pp - 1) yield;
    }
    yield;
    for (let j = 0; j < ph; j++) {
      for (let i = 0, o = j * pw; i < pw; i++) {
        let d = D[o + i];
        if (!d) continue;
        if (i > 0 && D[o + i - 1] + 3 < d) d = D[o + i - 1] + 3;
        if (j > 0) {
          const u = o - pw + i;
          if (D[u] + 3 < d) d = D[u] + 3;
          if (i > 0 && D[u - 1] + 4 < d) d = D[u - 1] + 4;
          if (i < pw - 1 && D[u + 1] + 4 < d) d = D[u + 1] + 4;
        }
        D[o + i] = d;
      }
      if (j % pp === pp - 1) yield;
    }
    yield;
    for (let j = ph - 1; j >= 0; j--) {
      for (let i = pw - 1, o = j * pw; i >= 0; i--) {
        let d = D[o + i];
        if (!d) continue;
        if (i < pw - 1 && D[o + i + 1] + 3 < d) d = D[o + i + 1] + 3;
        if (j < ph - 1) {
          const u = o + pw + i;
          if (D[u] + 3 < d) d = D[u] + 3;
          if (i < pw - 1 && D[u + 1] + 4 < d) d = D[u + 1] + 4;
          if (i > 0 && D[u - 1] + 4 < d) d = D[u - 1] + 4;
        }
        D[o + i] = d;
      }
      if (j % pp === 0) yield;
    }
    CUT = new Uint8Array(bw * bh);
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) CUT[j * bw + i] = Math.min(255, Math.round(D[(j0 + j - py0) * pw + (i0 + i - px0)] / 3));
      if (j % pr === pr - 1) yield;
    }
    yield;
  }
  STEP = "b-march";
  // the waterline: marching squares between pixel centres, each piece
  // turned so the water lies on its left, chained into runs
  const next = new Map();
  // a crossing between two neighbouring pixels (centres at whole numbers):
  // v 1 for the pair (i, j)-(i+1, j), v 0 for (i, j)-(i, j+1)
  const key = (i, j, v) => ((j + 1) * (bw + 2) + (i + 1)) * 2 + v;
  const pos = (k) => { const v = k & 1, c = k >> 1, i = (c % (bw + 2)) - 1, j = Math.floor(c / (bw + 2)) - 1; return v ? [i + 0.5, j] : [i, j + 0.5]; };
  const piece = (ka, kb, ii, jj) => {
    // orient a → b so the inside corner (ii, jj) lies on its left (y down)
    const [ax, ay] = pos(ka), [bx, by] = pos(kb);
    const cr = (bx - ax) * (jj - ay) - (by - ay) * (ii - ax);
    if (cr < 0) next.set(ka, kb); else next.set(kb, ka);
  };
  for (let j = -1; j < bh; j++) {
    if (j % pr === pr - 1) yield;
    for (let i = -1; i < bw; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const n = a + b + c + d;
      if (n === 0 || n === 4) continue;
      // the cell's edges: T (a-b), R (b-c), B (d-c), L (a-d)
      const T = key(i, j, 1), R = key(i + 1, j, 0), Bm = key(i, j + 1, 1), L = key(i, j, 0);
      const cross = [];
      if (a !== b) cross.push(T);
      if (b !== c) cross.push(R);
      if (d !== c) cross.push(Bm);
      if (a !== d) cross.push(L);
      const corner = a ? [i, j] : b ? [i + 1, j] : c ? [i + 1, j + 1] : [i, j + 1];
      if (cross.length === 2) piece(cross[0], cross[1], corner[0], corner[1]);
      else if (a) { piece(L, T, i, j); piece(R, Bm, i + 1, j + 1); }
      else { piece(T, R, i + 1, j); piece(Bm, L, i, j + 1); }
    }
  }
  yield;
  STEP = "b-chain";
  const ends = new Set(next.values());
  const chains = [];
  const walk = (k0) => {
    const pts = [];
    let k = k0;
    while (next.has(k)) {
      pts.push(pos(k));
      const n2 = next.get(k);
      next.delete(k);
      k = n2;
      if (k === k0) { return { pts, closed: true }; }
    }
    pts.push(pos(k));
    return { pts, closed: false };
  };
  for (const k of [...next.keys()]) if (!ends.has(k) && next.has(k)) { chains.push(walk(k)); yield; }
  for (const k of [...next.keys()]) if (next.has(k)) { chains.push(walk(k)); yield; }
  yield;
  STEP = "b-runs";
  // resample each chain a unit apart (world units), ease out the pixel
  // steps, step in off the waterline, and keep only where dry land lies
  // outside
  const runs = [];
  const dryAt = (x, y) => {
    const gi = Math.floor(x * r), gj = Math.floor(y * r);
    if (gi < 0 || gj < 0 || gi >= mw || gj >= mh) return false;
    return (lab[gj * mw + gi] & KIND) === 0;
  };
  for (const ch of chains) {
    const P = ch.pts.map(([px, py]) => [(i0 + px + 0.5) / r, (j0 + py + 0.5) / r]);
    if (ch.closed) P.push(P[0]);
    if (P.length < 4) continue;
    const cum = [0];
    for (let q = 1; q < P.length; q++) cum.push(cum[q - 1] + Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1]));
    const L = cum[cum.length - 1];
    if (L < 10) continue;
    const n = Math.floor(L), xs = new Float32Array(n + 1), ys = new Float32Array(n + 1);
    for (let q = 0, seg = 1; q <= n; q++) {
      while (seg < cum.length - 1 && cum[seg] < q) seg++;
      const f = (q - cum[seg - 1]) / Math.max(1e-6, cum[seg] - cum[seg - 1]);
      xs[q] = P[seg - 1][0] + (P[seg][0] - P[seg - 1][0]) * f; ys[q] = P[seg - 1][1] + (P[seg][1] - P[seg - 1][1]) * f;
    }
    // a light smoothing (two units either way; closed runs wrap)
    const sm = (A) => {
      const out = new Float32Array(A.length);
      for (let q = 0; q <= n; q++) {
        let acc = 0, c = 0;
        for (let o = -2; o <= 2; o++) {
          let qq = q + o;
          if (ch.closed) qq = ((qq % n) + n) % n; else if (qq < 0 || qq > n) continue;
          acc += A[qq]; c++;
        }
        out[q] = acc / c;
      }
      return out;
    };
    const X = sm(xs), Y = sm(ys);
    // in off the edge: the water is on the left
    const DX = new Float32Array(n + 1), DY = new Float32Array(n + 1), ok = new Uint8Array(n + 1);
    for (let q = 0; q <= n; q++) {
      const qa = ch.closed ? ((q - 2) % n + n) % n : Math.max(0, q - 2), qb = ch.closed ? (q + 2) % n : Math.min(n, q + 2);
      let tx = X[qb] - X[qa], ty = Y[qb] - Y[qa];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      const nx = ty, ny = -tx;   // left of the way along, on a y-down board
      DX[q] = X[q] + nx * EDGE_IN; DY[q] = Y[q] + ny * EDGE_IN;
      ok[q] = X[q] < CASTLE_X && (dryAt(X[q] - nx * 1.5, Y[q] - ny * 1.5) || dryAt(X[q] - nx * 3, Y[q] - ny * 3)) ? 1 : 0;
    }
    // split into the stretches along dry land, each keeping its place along
    // the whole waterline so the ticks' march runs on unbroken
    const whole = ch.closed && ok.every((v) => v);
    let a = -1;
    for (let q = 0; q <= n + 1; q++) {
      const on = q <= n && ok[q];
      if (on && a < 0) a = q;
      else if (!on && a >= 0) {
        if (q - a >= 6) runs.push({ x: DX.subarray(a, q), y: DY.subarray(a, q), s0: a, len: q - a, closed: whole, period: whole ? n / Math.max(1, Math.round(n / 20)) : 20 });
        a = -1;
      }
    }
    yield;
  }
  Object.assign(B, { x0: i0 / r, y0: j0 / r, w: bw / r, h: bh / r, i0, j0, bw, bh, IN, EDGE, CUT, runs, tints: {}, kind: w.kind, pond: w.pond || null });
}
// the body, whole (finishing a warm-up's work on it, or all of it now)
const bodyEntry = (M, w) => {
  let B = M.bodies.get(w.id);
  if (!B) { B = { ready: false }; B.job = bodySteps(M, w, B); M.bodies.set(w.id, B); }
  return B;
};
const stepBody = (B) => { if (!B.ready && B.job.next().done) { B.ready = true; B.job = null; } return B.ready; };
const bodyOf = (M, w) => { const B = bodyEntry(M, w); while (!stepBody(B)); return B; };

// the shine a body's light leans toward: its own palette's (water.js
// pondPalette, the river's REALM.water, coast.js's sea)
const shineOf = (B) => {
  const wat = REALM.water;
  if (B.kind === "pond" && B.pond && B.pond.t === "swamp") return REALM.groundArt === "fen" && wat ? wat.shine : "#7aa078";
  return wat ? wat.shine : B.kind === "sea" ? "#8cc4d8" : "#a8d8e8";
};
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// a cut's fade, in three steps, the steps broken on one-unit blocks
const cutStep = (d, gi, gj) => {
  if (d >= FEATHER) return 1;
  const e = d + (hash((gi >> 1) * 7 + 3, (gj >> 1) * 13 + 5) - 0.5) * 5;
  return e < 5 ? 1 / 3 : e < 10.5 ? 2 / 3 : 1;
};
// (the scratch the ground is copied into to be read: reading the live ground
// canvas itself back could make Chrome keep it off the GPU)
let SCRATCH = null;
const readGround = (ground, x, y, w, h) => {
  if (!SCRATCH) SCRATCH = document.createElement("canvas");
  SCRATCH.width = w; SCRATCH.height = h;
  const c = SCRATCH.getContext("2d", { willReadFrequently: true });
  c.clearRect(0, 0, w, h);
  c.drawImage(ground, x, y, w, h, 0, 0, w, h);
  return c.getImageData(0, 0, w, h).data;
};

// The tint for one body and tone, baked once from the board's baked ground
// (the same art-pixel grid) and stamped plainly after; a slice at a time.
// Without the ground (a lab drawing it alone), a thin shine and the rim.
function* tintSteps(B, tone, ground, out) {
  STEP = "t-tint";
  const T = TONES[tone], cv = document.createElement("canvas");
  cv.width = B.bw; cv.height = B.bh;
  const c = cv.getContext("2d"), img = c.createImageData(B.bw, B.bh), d = img.data;
  const under = ground ? readGround(ground, B.i0, B.j0, B.bw, B.bh) : null;
  const [sr, sg, sb] = hexRgb(shineOf(B)), ys = 0.299 * sr + 0.587 * sg + 0.114 * sb;
  const [rr, rg, rb] = T.rim, bw = B.bw, castleI = Math.floor(CASTLE_X * PX) - B.i0, tpr = Math.max(4, Math.floor(30000 / bw));
  for (let j = 0; j < B.bh; j++) {
    for (let i = 0; i < bw; i++) {
      const k = j * bw + i;
      if (!B.IN[k]) continue;
      const o = k * 4, e = B.EDGE[k];
      const f = B.CUT ? cutStep(B.CUT[k], B.i0 + i, B.j0 + j) : 1;
      const ra = i < castleI ? (e === 0 ? T.rimA[0] : e === 1 ? T.rimA[1] : 0) * f : 0;
      if (!under) {
        const a = ra || (T.lift / 160) * f;
        if (ra) { d[o] = rr; d[o + 1] = rg; d[o + 2] = rb; } else { d[o] = sr; d[o + 1] = sg; d[o + 2] = sb; }
        d[o + 3] = Math.round(a * 255);
        continue;
      }
      const R = under[o], G = under[o + 1], Bl = under[o + 2], yc = 0.299 * R + 0.587 * G + 0.114 * Bl;
      // only the water's own tones: reeds, pads, stones awash and the sand
      // are warmer than any water and keep their colour
      const cool = clamp01((Bl - R + 3) / 9);
      let nr = R, ng = G, nb = Bl;
      const wgt = cool * f * (yc < ys + 12 ? 1 : 0);
      if (wgt > 0) {
        // a fixed step up in light: half kept in its own hue (scaled), half
        // leaning to the shine
        const sc = Math.min(2, (yc + T.lift) / Math.max(14, yc));
        const km = Math.min(T.maxK, T.lift / Math.max(10, ys - yc));
        const tr = R * sc * (1 - T.toward) + (R + (sr - R) * km) * T.toward;
        const tg = G * sc * (1 - T.toward) + (G + (sg - G) * km) * T.toward;
        const tb = Bl * sc * (1 - T.toward) + (Bl + (sb - Bl) * km) * T.toward;
        nr = R + (tr - R) * wgt; ng = G + (tg - G) * wgt; nb = Bl + (tb - Bl) * wgt;
      }
      if (ra) { nr += (rr - nr) * ra; ng += (rg - ng) * ra; nb += (rb - nb) * ra; }
      if (nr === R && ng === G && nb === Bl) continue;
      d[o] = Math.min(255, Math.round(nr)); d[o + 1] = Math.min(255, Math.round(ng)); d[o + 2] = Math.min(255, Math.round(nb)); d[o + 3] = 255;
    }
    if (j % tpr === tpr - 1) yield;
  }
  c.putImageData(img, 0, 0);
  out.cv = cv; out.lit = !!under;
}
const tintEntry = (B, tone, ground) => {
  const key = ground ? tone + "|lit" : tone;
  let t = B.tints[key];
  if (!t) { t = { ready: false }; t.job = tintSteps(B, tone, ground, t); B.tints[key] = t; }
  return t;
};
const stepTint = (t) => { if (!t.ready && t.job.next().done) { t.ready = true; t.job = null; } return t.ready; };
const tintOf = (B, tone, ground) => { const t = tintEntry(B, tone, ground); while (!stepTint(t)); return t; };

// The one-time work, done in idle moments once a board with water is up —
// the mask, then every body a River Watch could row, then their gold and
// green tints — a few ms a slice (Safari has no requestIdleCallback), so
// the first skiff, the first tap on a hall and the first ghost pay nothing.
let WARM = null;
function* warmSteps(M, ground) {
  while (!stepMask(M)) yield;
  if (!M.lab) return;
  const list = watchBodies();
  for (const w of list) { const B = bodyEntry(M, w); while (!stepBody(B)) yield; yield; }
  if (!ground) return;
  for (const tone of ["sel", "ok"]) for (const w of list) {
    const B = bodyOf(M, w);
    if (B.empty) continue;
    const t = tintEntry(B, tone, ground);
    while (!stepTint(t)) yield;
    yield;
  }
}
export const warmWaterReach = (ground = null) => {
  if (WARM && WARM.realm === REALM && WARM.rivers === RIVERS && WARM.mask === MASK) return;
  if (!(RIVERS.length || PONDS.length || COAST)) { WARM = null; return; }   // stops the last board's pump
  const M = maskJob();
  const job = { realm: REALM, rivers: RIVERS, mask: M, steps: warmSteps(M, ground && ground.width === W * PX ? ground : null), done: false };
  WARM = job;
  const pump = () => {
    if (WARM !== job || job.done) return;
    const t0 = performance.now();
    let fin = false;
    do { if (job.steps.next().done) { fin = true; break; } } while (performance.now() - t0 < 5);
    const dt = performance.now() - t0;
    job.slices = (job.slices || 0) + 1; job.work = (job.work || 0) + dt;
    if (dt > (job.maxSlice || 0)) { job.maxSlice = dt; job.maxStep = STEP; }
    if (fin) job.done = true; else setTimeout(pump, 16);
  };
  setTimeout(pump, 300);
};

const EDGE_SPEED = 9;      // units a second the edge's ticks creep along the waterline
// The water a hall moored at (x, y) rows, lit and edged. tone: "sel"
// (selected), "ok" / "bad" (the build ghost). part "tint" goes down with the
// water (pass the board's baked ground to have it lit once and stamped),
// part "edge" over the water's live marks and the shore's wash; both by
// default. Returns false if there is no such water.
export const drawWatchWater = (ctx, g, x, y, tone, part = "both", ground = null) => {
  const M = waterMask();
  if (!M.lab) return false;
  const w = watchWater(x, y);
  if (!w) return false;
  const B = bodyOf(M, w);
  if (B.empty) return false;
  // a river's or the coast's light stops where the patrol does (terrain.js
  // patrolOf): clipped to a sausage of circles along the stretch they row
  const pr = w.rt ? patrolOf(w.rt, x, y) : null;
  const cut = pr && pr !== w.rt;
  if (cut) {
    const rad = S(w.kind === "sea" ? 42 : 24);
    ctx.save();
    ctx.beginPath();
    for (let q = 0; q <= pr.total + 0.5; q += 8) {
      const [px, py] = pr.at(q);
      ctx.moveTo(S(px) + rad, S(py));
      ctx.arc(S(px), S(py), rad, 0, Math.PI * 2);
    }
    ctx.clip();
  }
  const drawn = drawBody(ctx, g, B, tone, part, ground);
  if (cut) ctx.restore();
  return drawn;
};
const drawBody = (ctx, g, B, tone, part, ground) => {
  if (part !== "edge") {
    const tint = tintOf(B, tone, ground && ground.width === W * PX && ground.height === H * PX ? ground : null);
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tint.cv, B.x0, B.y0, B.w, B.h);
    ctx.imageSmoothingEnabled = sm;
  }
  if (part === "tint") return true;
  // the edge: two ticks on, two off, five units apart, creeping along
  ctx.fillStyle = TONES[tone].tick;
  const off = (g.time * EDGE_SPEED) % 20;
  for (const R of B.runs) {
    const per = R.period, gap = per / 4, n = R.len;
    const base = R.closed ? off * per / 20 : off;
    // the first on-tick at or after this run's start, counted along the whole line
    let m = Math.floor((R.s0 - base) / per);
    for (;; m++) {
      const s = base + m * per;
      if (s - R.s0 >= n) break;
      for (let q = 0; q < 2; q++) {
        const i = Math.floor(s + q * gap - R.s0);
        if (i < 0 || i >= n) continue;
        ctx.fillRect(S(R.x[i]) - 1, S(R.y[i]) - 1, 3, 3);
      }
    }
  }
  return true;
};

// ---- the skiffs' own reach -------------------------------------------------------------

// A turning ring of ticks (draw.js's rangeRing), each tick with a unit of
// shadow down and right so it holds on bright grass and pale sand as well
// as on the fen. Where it is the edge of the fleet's reach, bright; where a
// sister boat's reach covers it, smaller ticks in a softer tone (null:
// those left out), so each boat's own ring still reads whole — but not
// where a sister lying close covers it (others[q][3]): boats bunched round
// a pond have near enough the same ring, and a sheaf of them is only noise.
const SOFT = [];
const TICK_SHADE = "rgba(36,26,38,0.5)", SOFT_SHADE = "rgba(36,26,38,0.28)";
const ringTicks = (ctx, cx, cy, radius, spin, others, bright, soft) => {
  const ticks = Math.max(24, Math.round((Math.PI * 2 * radius) / 5));
  SOFT.length = 0;
  const ON = [];
  for (let i = 0; i < ticks; i++) {
    if (i % 4 >= 2) continue;
    const ang = (i / ticks) * Math.PI * 2 + spin;
    const x = S(cx + Math.cos(ang) * radius) - 1, y = S(cy + Math.sin(ang) * radius) - 1;
    let inside = false, near = false;
    for (let q = 0; q < others.length; q++) { const o = others[q]; if ((x + 1 - o[0]) ** 2 + (y + 1 - o[1]) ** 2 < (o[2] - 2) ** 2) { inside = true; if (o[3]) { near = true; break; } } }
    if (!inside) ON.push(x, y);
    else if (soft && !near) SOFT.push(x, y);
  }
  ctx.fillStyle = TICK_SHADE;
  for (let q = 0; q < ON.length; q += 2) ctx.fillRect(ON[q] + 1, ON[q + 1] + 1, 3, 3);
  if (soft && SOFT.length) {
    ctx.fillStyle = SOFT_SHADE;
    for (let q = 0; q < SOFT.length; q += 2) ctx.fillRect(SOFT[q] + 1.5, SOFT[q + 1] + 1.5, 2, 2);
    ctx.fillStyle = soft;
    for (let q = 0; q < SOFT.length; q += 2) ctx.fillRect(SOFT[q] + 0.5, SOFT[q + 1] + 0.5, 2, 2);
  }
  ctx.fillStyle = bright;
  for (let q = 0; q < ON.length; q += 2) ctx.fillRect(ON[q], ON[q + 1], 3, 3);
};
const RING = "rgba(236,200,92,0.95)", RING_SOFT = "rgba(236,200,92,0.6)", RING_NEW = "rgba(255,236,150,1)";
// the boat marked: a small caret over her crew, bobbing with her (art
// pixels, half a unit each; a hollow one where a new skiff would take station)
const CARET = [[-6, 6], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1], [0, 0]];   // rows, top down: [from, to] across
const CARET_GOLD = ["#fff3d2", "#f0cc62"];
const CARET_PICK = ["#ffffff", "#58c8f0"];
const caret = (ctx, x, y, hollow, cols = CARET_GOLD) => {
  const cx = Math.round(x * 2), cy = Math.round(y * 2);
  ctx.fillStyle = "#241a26";
  CARET.forEach(([a, b], r) => ctx.fillRect((cx + a - 1) / 2, (cy + r - 1) / 2, (b - a + 3) / 2, 1));
  ctx.fillRect(cx / 2 - 0.5, (cy + CARET.length) / 2, 1.5, 0.5);
  CARET.forEach(([a, b], r) => {
    if (hollow && r > 0 && r < CARET.length - 1) {
      ctx.fillStyle = cols[1];
      ctx.fillRect((cx + a) / 2, (cy + r) / 2, 0.5, 0.5); ctx.fillRect((cx + b) / 2, (cy + r) / 2, 0.5, 0.5);
      return;
    }
    ctx.fillStyle = r === 0 ? cols[0] : cols[1];
    ctx.fillRect((cx + a) / 2, (cy + r) / 2, (b - a + 1) / 2, 0.5);
  });
};
// a boat's crew and hull, roughly (x ± 15, from 22 above her waterline to 6 below)
const onBoat = (x, y, bx, by) => Math.abs(x - bx) < 16 && y > by - 23 && y < by + 7;
// Over the crowd (draw.js calls it after the actors): the selected hall's
// skiffs, each marked, and where the new ones an armed upgrade adds would
// sit. A caret that would sit on a sister's crew (boats bunched at their
// stations) is left out: the boat still shows, and a caret on the wrong
// crew would name the wrong boat.
export const drawSkiffMarks = (ctx, g, t, built) => {
  if (!built || !t.units) return;
  const lift = Math.round(Math.sin(g.time * 3) * 2) / 2;   // (a slow float on top of her own bob)
  const boats = t.units.filter((u) => u.state !== "dead");
  const marks = boats.map((u) => [u.x, u.y - (u.hp < u.maxHp ? 34 : 29) + skiffBob(g.time, u.id) + lift, false]);
  // the skiff being given orders in the tray (g.skiffPick, her place in t.units) wears a bright blue caret
  const picked = g.skiffPick != null ? t.units[g.skiffPick] : null;
  for (const [x, y] of newStations(g, t)) marks.push([x, y - 29 + lift, true]);
  marks.forEach(([x, y, hollow], i) => {
    for (let q = 0; q < boats.length; q++) if (q !== i && onBoat(x, y + 3, boats[q].x, boats[q].y)) return;
    caret(ctx, x, y, hollow, picked && boats[i] === picked ? CARET_PICK : CARET_GOLD);
  });
};
// where the skiffs an armed upgrade adds would take station
const newStations = (g, t) => {
  if (!g.upPreview || g.upPreview.id !== t.id) return [];
  const st = getStats(t), st2 = getStats({ ...t, ...g.upPreview.form }), n2 = st2.count || 1;
  if (n2 <= (st.count || 1)) return [];
  const rt = watchRoute(t.x, t.y), out = [];
  if (rt) for (let i = t.units ? t.units.length : 0; i < n2; i++) out.push(rt.at(stationQ(rt, i, n2)));   // clear of the bridges, as the engine places them
  return out;
};

// Each live skiff's musket reach while her hall is selected, following her
// as she rows: the fleet's edge bright, each boat's own ring carried on
// softer inside her sisters' reach, and the boat under the cursor (a mouse)
// all bright. With an upgrade armed in the card, the reach it would buy
// (and a mark where each skiff it adds would take station). No fill.
export const drawSkiffReach = (ctx, g, t, built) => {
  const st = getStats(t);
  const boats = built && t.units ? t.units.filter((u) => u.state !== "dead") : [];
  const spin = g.time * 0.5;
  const R = st.range;
  let st2 = null;
  if (g.upPreview && g.upPreview.id === t.id) st2 = getStats({ ...t, ...g.upPreview.form });
  const R2 = st2 && st2.range && Math.abs(st2.range - R) > 0.5 ? st2.range : 0;
  const extra = built ? newStations(g, t) : [];
  if (!boats.length && !extra.length) return;
  // the boat under the cursor, if any
  let focus = -1;
  if (g.hover && !g.buildMode) {
    let bd = 24 * 24;
    boats.forEach((u, i) => { const d = (u.x - g.hover[0]) ** 2 + (u.y - 10 - g.hover[1]) ** 2; if (d < bd) { bd = d; focus = i; } });
  }
  boats.forEach((u, i) => {
    if (i === focus) return;
    const others = [];
    boats.forEach((v, q) => { if (q !== i) others.push([v.x, v.y, R, Math.hypot(v.x - u.x, v.y - u.y) < R * 0.55]); });
    ringTicks(ctx, u.x, u.y, R, spin + i * 0.7, others, RING, RING_SOFT);
  });
  if (focus >= 0) ringTicks(ctx, boats[focus].x, boats[focus].y, R, spin + focus * 0.7, [], RING, null);
  if (R2 || extra.length) {
    const r2 = R2 || R;
    const all = [...boats.map((u) => [u.x, u.y]), ...extra];
    const discs2 = all.map(([x, y]) => [x, y, r2]);
    all.forEach(([x, y], i) => {
      const isNew = i >= boats.length;
      if (!R2 && !isNew) return;
      ringTicks(ctx, x, y, r2, -g.time * 0.8 + i * 0.7, discs2.filter((_, q) => q !== i), RING_NEW, null);
    });
  }
};

// The build ghost's first skiff: where she takes station on the water the
// hall would moor in (level 1 rows one boat, at the middle of her route) and
// her reach, faint in the ghost's tone.
const GHOST_CARET = { ok: ["#e4f8dc", "#96e896"], bad: ["#fbe0d8", "#e8786e"] };
export const drawWatchStation = (ctx, g, x, y, tone) => {
  const rt = watchRoute(x, y);
  if (!rt) return;
  const [sx, sy] = rt.at(stationQ(rt, 0, 1));   // never under a bridge, as the engine places her
  ringTicks(ctx, sx, sy, TOWERS.riverwatch.levels[0].range, g.time * 0.5, [], TONES[tone].ring, null);
  caret(ctx, sx, sy - 10 + Math.round(Math.sin(g.time * 3) * 2) / 2, true, GHOST_CARET[tone] || CARET_GOLD);
};

// (the lab's timings for the last bake, ms)
waterMask.parts = () => { const m = MASK && MASK.ms; return m && Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toFixed(1)])); };
// (the lab's look at a body: its box and waterline runs)
waterMask.body = (x, y) => { const M = waterMask(), w = M.lab && watchWater(x, y); return w ? bodyOf(M, w) : null; };
// (the lab's hand on the tones while they're tuned: waterMask.tune("sel", {...}))
waterMask.tune = (tone, o) => { Object.assign(TONES[tone], o); if (MASK) for (const B of MASK.bodies.values()) if (B.tints) B.tints = {}; };
// (the lab: is the idle warm-up done, and how did it go: slices, ms of work, the longest slice)
waterMask.warmed = () => !!(WARM && WARM.done);
waterMask.warmStats = () => WARM && { done: WARM.done, slices: WARM.slices || 0, work: +(WARM.work || 0).toFixed(1), maxSlice: +(WARM.maxSlice || 0).toFixed(1), in: WARM.maxStep };
