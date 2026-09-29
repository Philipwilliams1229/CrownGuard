// ============ RENDER: THE RIVER WATCH'S WATER ============
// A River Watch fights from its skiffs, and they go only where the water
// goes: the river their route follows, the pond or mere the hall is moored
// in, or the stretch of sea the coast route covers. So its area of control is
// drawn as that WATER — never a circle round the hall — and each skiff
// carries its own musket reach round it as it rows.
//
// - waterMask(): which art pixel of the board is which water (a river, a
//   pond, the sea) and which is under a bridge deck. Baked once per realm
//   (20-60 ms on a shared headless CPU), in idle time (warmWaterReach) or
//   on first use.
// - drawWatchWater(ctx, g, x, y, tone): the body of water a hall moored at
//   (x, y) rows, tinted (gold when selected, green / red for the build
//   ghost) with a dotted edge creeping along its waterline in the range
//   ring's style. The tint is baked once per body and tone and stamped; the
//   edge is a few hundred ticks off a baked, arc-length-sampled waterline.
//   Drawn with the water, under the bridges, so a deck passes over it.
// - drawSkiffReach(ctx, g, t, built): each live skiff's reach, a turning
//   ring of ticks (the envelope bright, the arcs inside a sister's reach a
//   faint hint); an upgrade armed in the card adds its new reach, and the
//   reach of any skiff it adds at her station. drawSkiffMarks, over the
//   crowd, puts a gold caret over each boat (hollow: a station to come).
// - clipToWater(ctx, x0, y0, x1, y1): clips to the open water in a box, so
//   a wake or a ripple never runs up a bank, round a shore, onto the beach
//   or over a deck. enemies.js (the skiffs) and halls/riverwatch.js use it.
//
// Where the water's edge lies is water.js's business: its river bank
// (riverField's smooth union, edgeOff's wobble, lean and spits) and pond
// shore (pondG) are MIRRORED below so the tint meets the painted waterline
// pixel for pixel. Change the edge there and change it here too (compare
// with skiff-reach-lab.html, zoomed on a bank).

import { W, H, WALL_W, S } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PONDS, RIVERS, COAST, BRIDGES, BRIDGE_HALF, RIVER_ROUTE, seaRoute, seaDepthAt, coastLine } from "../data/terrain.js";
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
const riverRows = (lab, JP, s, r, mw, mh) => {
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
};

// ---- the mask ------------------------------------------------------------------
// One byte per art pixel: 0 dry land, 1..15 a river (its index + 1), 16 + k
// pond k, SEA the sea; DECK set where a bridge is drawn over it.
const POND0 = 16, SEA = 64, DECK = 128, KIND = 127;
let MASK = null;

const bakeMask = () => {
  if (!LATTICE) { LATTICE = new Float32Array(65536); for (let i = 0; i < 65536; i++) LATTICE[i] = hash(i, 911); }
  const r = PX, mw = W * r, mh = H * r, lab = new Uint8Array(mw * mh);
  const s = ((REALM.seed | 0) % 97 + 97) % 97;
  const ms = { t0: performance.now() };
  const shapes = PONDS.map(pondShape);
  const JP = RIVERS.length ? shapes.filter((P) => P.open && touchesRiver(P)) : [];
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
    }
  }
  ms.ponds = performance.now() - ms.t0;
  // the rivers, merged as water.js merges them (a smooth union), with any
  // pond that runs into one
  if (RIVERS.length) riverRows(lab, JP, s, r, mw, mh);
  ms.rivers = performance.now() - ms.t0 - ms.ponds;
  // the sea: past the waterline (seaDepthAt > 0), wherever nothing else
  // claimed the pixel — the line worked out once per column (or row)
  if (COAST) {
    const e = COAST.edge, along = e === "top" || e === "bottom";
    for (let a = 0, na = along ? mw : mh; a < na; a++) {
      const line = coastLine((a + 0.5) / r);
      if (line <= 0) continue;
      for (let b = 0, nb = along ? mh : mw; b < nb; b++) {
        const c = (b + 0.5) / r, v = e === "top" || e === "left" ? c : (along ? H : W) - c;
        if (line - v <= 0) continue;
        const k = along ? b * mw + a : a * mw + b;
        if (!lab[k]) lab[k] = SEA;
      }
    }
  }
  ms.sea = performance.now() - ms.t0 - ms.ponds - ms.rivers;
  // what the bridges cover: each span drawn on its own and read back
  if (BRIDGES.length && typeof document !== "undefined") {
    for (const b of BRIDGES) {
      const R = (b.d1 - b.d0) / 2 + BRIDGE_HALF + 16;
      const i0 = Math.max(0, Math.floor((b.x - R) * r)), i1 = Math.min(mw, Math.ceil((b.x + R) * r));
      const j0 = Math.max(0, Math.floor((b.y - R - 12) * r)), j1 = Math.min(mh, Math.ceil((b.y + R) * r));
      if (i1 <= i0 || j1 <= j0) continue;
      const cv = document.createElement("canvas");
      cv.width = i1 - i0; cv.height = j1 - j0;
      const c = cv.getContext("2d");
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
    }
  }
  ms.bridges = performance.now() - ms.t0 - ms.ponds - ms.rivers - ms.sea;
  bakeMask.ms = ms;
  return lab;
};

// the mask for the board in play (rebuilt when the realm changes)
export const waterMask = () => {
  if (MASK && MASK.realm === REALM && MASK.rivers === RIVERS && MASK.ponds === PONDS && MASK.coast === COAST && MASK.bridges === BRIDGES && MASK.px === PX) return MASK;
  const has = RIVERS.length || PONDS.length || COAST;
  MASK = { realm: REALM, rivers: RIVERS, ponds: PONDS, coast: COAST, bridges: BRIDGES, px: PX, mw: W * PX, mh: H * PX, lab: has ? bakeMask() : null, bodies: new Map() };
  return MASK;
};
// the one-time bake, done in idle time on a board with water, so the first
// skiff or the first tap on a River Watch doesn't pay for it
let WARM = null;
export const warmWaterReach = () => {
  if (MASK && MASK.realm === REALM && MASK.rivers === RIVERS) return;
  if (WARM === REALM || !(RIVERS.length || PONDS.length || COAST)) return;
  WARM = REALM;
  const go = () => { if (WARM === REALM) waterMask(); };
  if (typeof requestIdleCallback === "function") requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 200);
};

// ---- clipping to the water ----------------------------------------------------------
// Clips ctx to the open water (no deck over it) inside the box, in world
// units. Returns 0 when there is none (draw nothing), 1 when the box is all
// water (no clip was needed), 2 when a clip was set. Wrap in save/restore.
// `portrait`: a painter that also draws stand-ins off the board (a menu's
// portrait of the hall) draws unclipped where the box holds no water at all.
export const clipToWater = (ctx, x0, y0, x1, y1, portrait = false) => {
  const M = waterMask();
  if (!M.lab || waterMask.noClip) return 1;
  const r = M.px, mw = M.mw, lab = M.lab;
  const i0 = Math.max(0, Math.floor(x0 * r)), i1 = Math.min(mw - 1, Math.ceil(x1 * r) - 1);
  const j0 = Math.max(0, Math.floor(y0 * r)), j1 = Math.min(M.mh - 1, Math.ceil(y1 * r) - 1);
  if (i1 < i0 || j1 < j0) return portrait ? 1 : 0;
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
  if (!wet) return portrait ? 1 : 0;
  if (!dry && i0 === Math.floor(x0 * r) && i1 === Math.ceil(x1 * r) - 1 && j0 === Math.floor(y0 * r) && j1 === Math.ceil(y1 * r) - 1) return 1;
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
  ctx.clip(p);
  return 2;
};

// ---- the body of water a hall's skiffs row ------------------------------------------
// the engine's choice (update.js, "the River Watch"): moored in a pond or
// mere, a ring round it; off a coast, the coast; otherwise the board's river
// route, which is the FIRST river (RIVER_ROUTE)
export const watchWater = (x, y) => {
  const p = pondAt(x, y);
  if (p) return { id: `p${PONDS.indexOf(p)}`, kind: "pond", pond: p };
  if (seaDepthAt(x, y) > 0) return seaRoute() ? { id: "sea", kind: "sea" } : null;
  // (ri: which river the route follows — the engine rows only the first; a
  // route per river would name the one moored in here)
  return RIVER_ROUTE ? { id: "r0", kind: "river", ri: 0 } : null;
};
// the skiffs' rowing line (the engine's own shapes; a pond's is the same
// ellipse update.js's pondRoute rows)
const POND_RT = new WeakMap();
export const watchRoute = (x, y) => {
  const w = watchWater(x, y);
  if (!w) return null;
  if (w.kind === "sea") return seaRoute();
  if (w.kind === "river") return RIVER_ROUTE;
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

// The tint LIGHTS the water (screen): a flat gold laid over blue water turns
// it grey, its complement, where a pale gold screened over it reads as sun
// on the water — still blue, clearly apart from the water beyond the reach.
const TONES = {
  sel: { rgb: [255, 226, 140], fill: 0.22, rim: 0.45, comp: "screen", tick: "rgba(232,196,90,0.9)" },
  ok: { rgb: [176, 240, 170], fill: 0.2, rim: 0.42, comp: "screen", tick: "rgba(150,232,150,0.85)" },
  bad: { rgb: [244, 146, 130], fill: 0.2, rim: 0.42, comp: "screen", tick: "rgba(232,120,110,0.85)" },
};
const EDGE_IN = 1.5;       // the ticks ride this far in from the waterline
const CASTLE_X = W - WALL_W + 2;   // past here the castle stands over the water

// which pixels belong to a body, its box, and its waterline as runs of
// points one unit apart (only where the water meets dry land — never across
// open water into another body, nor under the castle)
const bodyOf = (M, w) => {
  let B = M.bodies.get(w.id);
  if (B) return B;
  const r = M.px, mw = M.mw, mh = M.mh, lab = M.lab;
  let want;
  if (w.kind === "river") want = w.ri + 1;
  else if (w.kind === "pond") want = POND0 + Number(w.id.slice(1));
  else want = SEA;
  // the sea: only the stretch the coast route runs, as far along the shore
  let uA = -Infinity, uB = Infinity;
  const alongX = !COAST || COAST.edge === "top" || COAST.edge === "bottom";
  if (w.kind === "sea") {
    const rt = seaRoute(), a = rt.at(0), b = rt.at(rt.total), k = alongX ? 0 : 1;
    uA = Math.min(a[k], b[k]) - 14; uB = Math.max(a[k], b[k]) + 14;
  }
  const inBody = (i, j) => {
    if (i < 0 || j < 0 || i >= mw || j >= mh) return false;
    if ((lab[j * mw + i] & KIND) !== want) return false;
    if (w.kind !== "sea") return true;
    const u = ((alongX ? i : j) + 0.5) / r;
    return u >= uA && u <= uB;
  };
  let i0 = mw, i1 = -1, j0 = mh, j1 = -1;
  for (let j = 0; j < mh; j++) for (let i = 0, o = j * mw; i < mw; i++) {
    if ((lab[o + i] & KIND) !== want || !inBody(i, j)) continue;
    if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j;
  }
  if (i1 < 0) { B = { empty: true }; M.bodies.set(w.id, B); return B; }
  const bw = i1 - i0 + 1, bh = j1 - j0 + 1;
  const IN = new Uint8Array(bw * bh);
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) IN[j * bw + i] = inBody(i0 + i, j0 + j) ? 1 : 0;
  const at = (i, j) => (i < 0 || j < 0 || i >= bw || j >= bh ? 0 : IN[j * bw + i]);
  // how near the edge each pixel lies (0 = on it, up to 3), for the rim
  const EDGE = new Uint8Array(bw * bh);
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
    if (!IN[j * bw + i]) continue;
    let d = 9;
    for (let q = 1; q <= 3 && d === 9; q++) {
      // an edge only where dry land lies: a body cut off across open water
      // (the sea's ends, a river running on into another) fades no rim
      const probe = (ii, jj) => { if (at(ii, jj)) return false; const gi = i0 + ii, gj = j0 + jj; if (gi < 0 || gj < 0 || gi >= mw || gj >= mh) return false; return (lab[gj * mw + gi] & KIND) === 0; };
      if (probe(i - q, j) || probe(i + q, j) || probe(i, j - q) || probe(i, j + q)) d = q - 1;
    }
    EDGE[j * bw + i] = d;
  }
  // the waterline: marching squares between pixel centres, each piece
  // turned so the water lies on its left, chained into runs
  const next = new Map();
  // a crossing between two neighbouring pixels (centres at whole numbers):
  // v 1 for the pair (i, j)-(i+1, j), v 0 for (i, j)-(i, j+1)
  const key = (i, j, v) => ((j + 1) * (bw + 2) + (i + 1)) * 2 + v;
  const pos = (k) => { const v = k & 1, c = k >> 1, i = (c % (bw + 2)) - 1, j = Math.floor(c / (bw + 2)) - 1; return v ? [i + 0.5, j] : [i, j + 0.5]; };
  const piece = (ka, kb, ci, cj, ii, jj) => {
    // orient a → b so the inside corner (ii, jj) lies on its left (y down)
    const [ax, ay] = pos(ka), [bx, by] = pos(kb);
    const cr = (bx - ax) * (jj - ay) - (by - ay) * (ii - ax);
    if (cr < 0) next.set(ka, kb); else next.set(kb, ka);
  };
  for (let j = -1; j < bh; j++) for (let i = -1; i < bw; i++) {
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
    if (cross.length === 2) piece(cross[0], cross[1], i, j, corner[0], corner[1]);
    else if (a) { piece(L, T, i, j, i, j); piece(R, Bm, i, j, i + 1, j + 1); }
    else { piece(T, R, i, j, i + 1, j); piece(Bm, L, i, j, i, j + 1); }
  }
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
  for (const k of [...next.keys()]) if (!ends.has(k) && next.has(k)) chains.push(walk(k));
  for (const k of [...next.keys()]) if (next.has(k)) chains.push(walk(k));
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
  }
  B = { x0: i0 / r, y0: j0 / r, w: bw / r, h: bh / r, bw, bh, IN, EDGE, runs, tints: {} };
  M.bodies.set(w.id, B);
  return B;
};

// The tint for one body and tone, baked once. Given the board's baked ground
// (the same art-pixel grid), the water under it is lit here once, screen by
// hand, and stamped plainly after; otherwise a tint the stamp screens live.
const tintOf = (B, tone, ground) => {
  const key = ground ? tone + "|lit" : tone;
  if (B.tints[key]) return B.tints[key];
  const T = TONES[tone], cv = document.createElement("canvas");
  cv.width = B.bw; cv.height = B.bh;
  const c = cv.getContext("2d"), img = c.createImageData(B.bw, B.bh), d = img.data;
  const under = ground ? ground.getContext("2d").getImageData(Math.round(B.x0 * PX), Math.round(B.y0 * PX), B.bw, B.bh).data : null;
  const [sr, sg, sb] = T.rgb;
  for (let k = 0; k < B.IN.length; k++) {
    if (!B.IN[k]) continue;
    const e = B.EDGE[k], a = e === 0 ? T.rim : e === 1 ? T.rim * 0.8 : e === 2 ? (T.fill + T.rim) * 0.5 : T.fill, o = k * 4;
    if (under) {
      // screen: the water plus the light it hasn't got, a share of it
      d[o] = under[o] + a * sr * (1 - under[o] / 255);
      d[o + 1] = under[o + 1] + a * sg * (1 - under[o + 1] / 255);
      d[o + 2] = under[o + 2] + a * sb * (1 - under[o + 2] / 255);
      d[o + 3] = 255;
    } else { d[o] = sr; d[o + 1] = sg; d[o + 2] = sb; d[o + 3] = Math.round(a * 255); }
  }
  c.putImageData(img, 0, 0);
  B.tints[key] = { cv, lit: !!under };
  return B.tints[key];
};

const EDGE_SPEED = 9;      // units a second the edge's ticks creep along the waterline
// The water a hall moored at (x, y) rows, tinted and edged. tone: "sel"
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
  if (part !== "edge") {
    const tint = tintOf(B, tone, ground && ground.width === W * PX && ground.height === H * PX ? ground : null);
    const sm = ctx.imageSmoothingEnabled, op = ctx.globalCompositeOperation;
    ctx.imageSmoothingEnabled = false;
    if (!tint.lit && TONES[tone].comp) ctx.globalCompositeOperation = TONES[tone].comp;
    ctx.drawImage(tint.cv, B.x0, B.y0, B.w, B.h);
    ctx.globalCompositeOperation = op;
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

// a turning ring of ticks (draw.js's rangeRing), bright where it is the edge
// of the fleet's reach and faint where a sister boat's reach covers it
// (faint null: those left out)
const FAINT = [];
const ringTicks = (ctx, cx, cy, radius, spin, others, bright, faint) => {
  const ticks = Math.max(24, Math.round((Math.PI * 2 * radius) / 5));
  ctx.fillStyle = bright;
  FAINT.length = 0;
  for (let i = 0; i < ticks; i++) {
    if (i % 4 >= 2) continue;
    const ang = (i / ticks) * Math.PI * 2 + spin;
    const x = S(cx + Math.cos(ang) * radius) - 1, y = S(cy + Math.sin(ang) * radius) - 1;
    let inside = false;
    for (let q = 0; q < others.length; q++) { const o = others[q]; if ((x + 1 - o[0]) ** 2 + (y + 1 - o[1]) ** 2 < (o[2] - 2) ** 2) { inside = true; break; } }
    if (!inside) ctx.fillRect(x, y, 3, 3);
    else if (faint && i % 8 < 2) FAINT.push(x, y);   // (inside: half as many, a hint of her own ring)
  }
  if (!faint || !FAINT.length) return;
  ctx.fillStyle = faint;
  for (let q = 0; q < FAINT.length; q += 2) ctx.fillRect(FAINT[q], FAINT[q + 1], 3, 3);
};
// the boat marked: a small gold caret over her crew, bobbing with her (art
// pixels, half a unit each; a hollow one where a new skiff would take station)
const CARET = [[-6, 6], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1], [0, 0]];   // rows, top down: [from, to] across
const caret = (ctx, x, y, hollow) => {
  const cx = Math.round(x * 2), cy = Math.round(y * 2);
  ctx.fillStyle = "#241a26";
  CARET.forEach(([a, b], r) => ctx.fillRect((cx + a - 1) / 2, (cy + r - 1) / 2, (b - a + 3) / 2, 1));
  ctx.fillRect(cx / 2 - 0.5, (cy + CARET.length) / 2, 1.5, 0.5);
  CARET.forEach(([a, b], r) => {
    if (hollow && r > 0 && r < CARET.length - 1) {
      ctx.fillStyle = "#f0cc62";
      ctx.fillRect((cx + a) / 2, (cy + r) / 2, 0.5, 0.5); ctx.fillRect((cx + b) / 2, (cy + r) / 2, 0.5, 0.5);
      return;
    }
    ctx.fillStyle = r === 0 ? "#fff3d2" : "#f0cc62";
    ctx.fillRect((cx + a) / 2, (cy + r) / 2, (b - a + 1) / 2, 0.5);
  });
};
// Over the crowd (draw.js calls it after the actors): the selected hall's
// skiffs, each marked, and where the new ones an armed upgrade adds would sit.
export const drawSkiffMarks = (ctx, g, t, built) => {
  if (!built || !t.units) return;
  const lift = Math.round(Math.sin(g.time * 3) * 2) / 2;   // (a slow float on top of her own bob)
  for (const u of t.units) if (u.state !== "dead") caret(ctx, u.x, u.y - (u.hp < u.maxHp ? 34 : 29) + skiffBob(g.time, u.id) + lift, false);
  for (const [x, y] of newStations(g, t)) caret(ctx, x, y - 29 + lift, true);
};
// where the skiffs an armed upgrade adds would take station
const newStations = (g, t) => {
  if (!g.upPreview || g.upPreview.id !== t.id) return [];
  const st = getStats(t), st2 = getStats({ ...t, ...g.upPreview.form }), n2 = st2.count || 1;
  if (n2 <= (st.count || 1)) return [];
  const rt = watchRoute(t.x, t.y), out = [];
  if (rt) for (let i = t.units ? t.units.length : 0; i < n2; i++) out.push(rt.at((rt.total * (i + 1)) / (n2 + 1)));
  return out;
};

// Each live skiff's musket reach while her hall is selected, following her
// as she rows; with an upgrade armed in the card, the reach it would buy
// (and a mark where each skiff it adds would take station).
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
  // the fleet's reach laid down once, however many discs overlap
  ctx.fillStyle = "rgba(216,179,74,0.08)";
  ctx.beginPath();
  for (const u of boats) { ctx.moveTo(u.x + R, u.y); ctx.arc(u.x, u.y, R, 0, Math.PI * 2); }
  ctx.fill();
  const discs = boats.map((u) => [u.x, u.y, R]);
  boats.forEach((u, i) => {
    ringTicks(ctx, u.x, u.y, R, spin + i * 0.7, discs.filter((_, q) => q !== i), "rgba(232,196,90,0.9)", "rgba(232,196,90,0.13)");
  });
  if (R2 || extra.length) {
    const r2 = R2 || R;
    const all = [...boats.map((u) => [u.x, u.y]), ...extra];
    const discs2 = all.map(([x, y]) => [x, y, r2]);
    if (R2) {
      ctx.fillStyle = "rgba(250,220,120,0.06)";
      ctx.beginPath();
      for (const [x, y] of all) { ctx.moveTo(x + r2, y); ctx.arc(x, y, r2, 0, Math.PI * 2); }
      ctx.fill();
    }
    all.forEach(([x, y], i) => {
      const isNew = i >= boats.length;
      if (!R2 && !isNew) return;
      ringTicks(ctx, x, y, r2, -g.time * 0.8 + i * 0.7, discs2.filter((_, q) => q !== i), "rgba(255,236,150,1)", null);
    });
  }
};
// (the lab's timings for the last bake, ms)
waterMask.parts = () => { const m = bakeMask.ms; return m && { ponds: +m.ponds.toFixed(1), rivers: +m.rivers.toFixed(1), sea: +m.sea.toFixed(1), bridges: +m.bridges.toFixed(1) }; };
// (the lab's look at a body: its box and waterline runs)
waterMask.body = (x, y) => { const M = waterMask(), w = M.lab && watchWater(x, y); return w ? bodyOf(M, w) : null; };
// (the lab's hand on the tones while they're tuned: waterMask.tune("sel", {...}))
waterMask.tune = (tone, o) => { Object.assign(TONES[tone], o); if (MASK) for (const B of MASK.bodies.values()) if (B.tints) B.tints = {}; };
