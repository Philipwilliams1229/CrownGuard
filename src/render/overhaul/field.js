// The overhaul's water FIELD (B1; art/briefs/overhaul-build-millrace.md, "Water and banks").
//
// Bodies of water and the signed distance to their waterline, read straight from terrain's own river
// segments and widths (the waterline is where terrain.js riverPast = 0, so halls, docks and the art
// agree to the pixel). Two ways to ask it:
//   probe(x, y)                      one point, analytic (board units): nearest body, d, s, normal, kind
//   buildField(x0, y0, x1, y1, k)    a raster over a rect at k px a unit (k = 2: one art px), for the
//                                    bake only: freed by the caller as soon as the colour pass is done
// A BODY is { type: "river", ri, segs, total, plan, box }. Lakes and ponds plug in later as other
// types (a `dist(x, y, out)` of their own); probe / buildField loop over bodies() whatever they are.
//
// Edge kinds (owner: one main kind a stretch, little mixing, NO shingle): "cut" (earth face),
// "lip" (grassy lip), "reeds" (reeds and lilies, slack water), "quay" (dressed stone).
// A plan per realm and river: default kind, zones { bank N|S|E|W|*, from, to (units along the river
// from its first point), kind }, weir (units along), flow (dash speed x), faceMax (art px).
// A face lies INSIDE the water band (land stays where the halls stand): side faces <= ~2.7 units,
// north faces <= 6.5.
import { RIVERS, PONDS, BRIDGES } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { W, H } from "../../data/constants.js";

// ---- small kit (shared with the painters) ----
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const hs = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
};
export const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hs(xi, yi, s), b = hs(xi + 1, yi, s), c = hs(xi, yi + 1, s), d = hs(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];

// ---- the plans ----
const PLANS = {
  millrace: [
    // the Foxwater (flows south down the board's middle): grassy lip as its main edge, the east bank cut
    // along its upper reach (the outside of its first bends), the west bank cut round the bend above the
    // race's mouth, one reed bay in the slack opposite, dressed stone either side of the south bridge
    { def: "lip", flow: 1, faceMax: 13, sq: 0.72, zones: [
      { bank: "E", from: -50, to: 300, kind: "cut" },
      { bank: "W", from: 322, to: 392, kind: "cut" },
      { bank: "E", from: 330, to: 425, kind: "reeds" },
      { bank: "*", from: 434, to: 999, kind: "quay" },
    ] },
    // the mill race: a stone-lined channel from the top of the board past its bridge, the weir and the
    // mill; below the mill a turf lip, its north bank cut
    { def: "quay", flow: 1.25, faceMax: 9, sq: 0.6, weir: 215, zones: [
      { bank: "*", from: 322, to: 999, kind: "lip" },
      { bank: "N", from: 322, to: 999, kind: "cut" },
    ] },
  ],
  // the brook running UP the screen (south to north, x ~420): the east bank cut on its upper reach, one
  // reed slack on the west bank, dressed stone round its bridge (s ~460), a weir below the bend
  thornbrook: [
    { def: "lip", flow: 1, faceMax: 13, sq: 0.68, weir: 268, zones: [
      { bank: "E", from: -50, to: 300, kind: "cut" },
      { bank: "W", from: 320, to: 398, kind: "reeds" },
      { bank: "*", from: 410, to: 522, kind: "quay" },
    ] },
  ],
  // the river ACROSS the screen with four up-screen bridges (x 256 / 400 / 544 / 688): the far (north)
  // bank cut all along, a grassy near bank, quays at the second and fourth bridges only, one reed bay
  // between the first two
  wolfrun: [
    { def: "lip", flow: 1, faceMax: 13, sq: 0.68, zones: [
      { bank: "N", from: -400, to: 2000, kind: "cut" },
      { bank: "S", from: 296, to: 362, kind: "reeds" },
      { bank: "*", from: 366, to: 458, kind: "quay" },
      { bank: "*", from: 654, to: 746, kind: "quay" },
    ] },
  ],
};
// a river with no hand plan: a grassy lip, its far (north) bank cut, dressed stone round each bridge
const autoPlan = (B) => {
  const zones = [{ bank: "N", from: -400, to: B.total + 400, kind: "cut" }];
  for (const b of BRIDGES) {
    const o = riverNear(B, b.x, b.y, {}); if (o.d > 12) continue;
    zones.push({ bank: "*", from: o.s - 50, to: o.s + 50, kind: "quay" });
  }
  return { def: "lip", flow: 1, faceMax: 13, sq: 0.68, zones };
};

// ---- the ponds: the approved lakes (concept/overhaul3-lakes.js), fitted INSIDE the engine's pond
// ellipse (its shore never runs past it by more than ~1 unit). A lake body is
// { type: "lake", shape(x, y) (units, < 0 water), kind(x, y, nx, ny), deep (art px to its deepest band),
//   qmax, box, plan, c }. Its kinds: "cut" (far shores), "lip", "reeds" (a bay, the growth, the seeps).
const ell = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const near = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) < r;
// one look per pond kind, laid on the engine's pond (p: { x, y, w, h }). Each shore is the pond's own ellipse
// pulled in and lobed (polar: r(angle) <= 0.98 of the ellipse), so the field is a clean distance near the shore
// and the painted water never leaves the engine's pond.
const polar = (p, r0, lobes) => {
  const cx = p.x, cy = p.y, rx = p.w / 2, ry = p.h / 2;
  return (x, y) => {
    const ux = (x - cx) / rx, uy = (y - cy) / ry, th = Math.atan2(uy, ux);
    let r = r0; for (const [f, a, ph] of lobes) r += a * Math.sin(f * th + ph);
    return (Math.hypot(ux, uy) - Math.min(0.98, r)) * Math.hypot(rx * Math.cos(th), ry * Math.sin(th));
  };
};
const LAKE_KINDS = {
  // the long mere (round 3's look 1, Foxmere): lobed, a cut far shore, a grassy near lip, one reed bay
  mere: (p) => {
    const sh = polar(p, 0.9, [[3, 0.05, 1.1], [5, 0.025, 0.3], [2, 0.04, 2.6]]), bay = [p.x - p.w * 0.36, p.y + p.h * 0.3];
    return { shape: sh, wob: 1.2, wobF: 9, deep: 38, qmax: 0.88,
      kind: (x, y, nx, ny) => (near(x, y, bay[0], bay[1], Math.max(18, p.w * 0.13)) ? "reeds" : ny < -0.05 ? "cut" : "lip") };
  },
  // a small mere with the growth (lilies, rushes) on its east side (pass 5's pond D, Oakmere)
  pondmere: (p) => {
    const sh = polar(p, 0.88, [[3, 0.06, 0.4], [4, 0.035, 1.9]]), gc = [p.x + p.w * 0.4, p.y + p.h * 0.06], gr = Math.max(p.w * 0.2, 14);
    return { shape: sh, wob: 1, wobF: 8, deep: Math.min(34, p.h * 1.5), qmax: 0.8,
      kind: (x, y, nx, ny) => (near(x, y, gc[0], gc[1], gr) ? "reeds" : ny < -0.05 ? "cut" : "lip") };
  },
  // the spring-fed tarn (Bramblewick): lobed, a rocky spit from the south, dark and deep; rushes at the seeps
  // at its two ends, no stream (owner: no culverts)
  tarn: (p) => {
    const rx = p.w / 2, ry = p.h / 2, base = polar(p, 0.86, [[3, 0.09, 0.5], [2, 0.04, 1.7]]);
    const hd = [p.x + rx * 0.28, p.y + ry * 0.95, rx * 0.13, ry * 0.62], seeps = [[p.x + rx * 0.85, p.y - ry * 0.25], [p.x - rx * 0.86, p.y + ry * 0.2]];
    return { shape: (x, y) => Math.max(base(x, y), -ell(x, y, ...hd)), wob: 1.8, wobF: 8, deep: 18, qmax: 0.95,
      kind: (x, y, nx, ny) => (seeps.some((q) => near(x, y, q[0], q[1], 11)) ? "reeds" : near(x, y, hd[0], hd[1] - hd[3] * 0.4, rx * 0.3) ? "cut" : ny < -0.05 ? "cut" : "lip") };
  },
  // the small reed fen: shallow, ringed in reeds, a bed standing out in it
  fen: (p) => {
    const base = polar(p, 0.88, [[4, 0.06, 1], [3, 0.05, 2]]), isl = [p.x + p.w * 0.06, p.y - p.h * 0.04, p.w * 0.05, p.h * 0.07];
    return { shape: (x, y) => Math.max(base(x, y), -ell(x, y, ...isl)), wob: 2, wobF: 12, deep: 30, qmax: 0.5, kind: () => "reeds" };
  },
};
// which look each Greenwood pond takes (VARIETY / pass 5's choices); any other pond: the small mere
const LAKE_PLAN = { foxmere: ["mere", 3], oakmere: ["pondmere", 73], bramblewick: ["tarn", 7], kingstones: ["pondmere", 41], cinderholt: ["fen", 23] };
function lakeBody(p, i) {
  const [kd, seed] = (REALM && LAKE_PLAN[REALM.id]) || [p.w > 120 ? "mere" : "pondmere", 11 + i];
  const L = LAKE_KINDS[kd](p, seed), erx = p.w / 2, ery = p.h / 2;
  const sh = L.shape, wob = L.wob || 0, wf = L.wobF || 9;
  // the engine's ellipse, a unit in: the painted shore never runs past it
  L.shape = (x, y) => Math.max(sh(x, y) + (vn(x / wf, y / wf, 501 + i) - 0.5) * wob * 2, ell(x, y, p.x, p.y, erx, ery) + 1);
  const m = REACH + 4;
  return { type: "lake", li: i, pond: p, ...L, look: kd, plan: { faceMax: 13, sq: L.qmax, flow: 0, zones: [] }, c: [p.x, p.y], hwMax: Math.min(erx, ery), total: 0, segs: [],
    box: [p.x - erx - m, p.y - ery - m, p.x + erx + m, p.y + ery + m] };
}
const DEF_PLAN = { def: "lip", flow: 1, faceMax: 13, sq: 0.7, zones: [] };
// the smooth union of two bodies: a mouth rounds its corners a little (SMIN units)
export const SMIN = 5;
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

export const HFACE = { cut: 13, quay: 11 };   // a face's full height, art px (a north face)
export const REACH = 5;                        // how far onto the land the field runs, units

// ---- bodies, per realm (cached on RIVERS' identity) ----
let CACHE = { key: null, list: [] };
const keyOf = () => `${REALM && REALM.id}|${RIVERS.length}|${RIVERS[0] && RIVERS[0].pts.length}|${RIVERS[0] && RIVERS[0].segs[0] && RIVERS[0].segs[0].x1}|${PONDS.length}|${PONDS[0] && PONDS[0].x}|${BRIDGES.length}`;
export function bodies() {
  const key = keyOf();
  if (CACHE.key === key && CACHE.rv === RIVERS[0] && CACHE.pd === PONDS[0]) return CACHE.list;
  const plans = (REALM && PLANS[REALM.id]) || [];
  const list = RIVERS.map((rv, ri) => {
    let c0 = 0, mx = 0;
    const segs = rv.segs.map((s) => {
      const hw1 = s.hw1 ?? rv.w / 2, hw2 = s.hw2 ?? rv.w / 2;
      const o = { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, len: s.len || 1e-6, c0, hw1, hw2, ux: (s.x2 - s.x1) / (s.len || 1), uy: (s.y2 - s.y1) / (s.len || 1) };
      c0 += s.len; mx = Math.max(mx, hw1, hw2); return o;
    });
    // a river that runs off the board runs on straight past its end (the land beyond, apron.js, sees it
    // carry on instead of stopping in a round cap)
    const off = (x, y) => x < 0 || y < 0 || x > W || y > H;
    const f = segs[0], l = segs[segs.length - 1], EXT = 300;
    if (f && off(f.x1, f.y1)) { f.x1 -= f.ux * EXT; f.y1 -= f.uy * EXT; f.len += EXT; f.c0 -= EXT; }
    if (l && off(l.x2, l.y2)) { l.x2 += l.ux * EXT; l.y2 += l.uy * EXT; l.len += EXT; }
    // each segment's bend: the signed turn over its neighbours (radians), for the point bars inside bends
    const hd = segs.map((q) => Math.atan2(q.uy, q.ux));
    segs.forEach((q, i) => { let t = 0; for (let k = Math.max(1, i - 4); k <= Math.min(segs.length - 1, i + 4); k++) { let a = hd[k] - hd[k - 1]; a = Math.atan2(Math.sin(a), Math.cos(a)); t += a; } q.bend = t; });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of segs) { x0 = Math.min(x0, s.x1, s.x2); y0 = Math.min(y0, s.y1, s.y2); x1 = Math.max(x1, s.x1, s.x2); y1 = Math.max(y1, s.y1, s.y2); }
    const m = mx + REACH + 2;
    const B = { type: "river", ri, rv, segs, total: c0, hwMax: mx, plan: null, box: [x0 - m, y0 - m, x1 + m, y1 + m] };
    B.plan = plans[ri] || autoPlan(B);
    return B;
  });
  // lava and other non-water ponds are not ours
  PONDS.forEach((p, i) => { if (p.t !== "lava") list.push(lakeBody(p, i)); });
  CACHE = { key, rv: RIVERS[0], pd: PONDS[0], list };
  return list;
}

// a body's centre line at s (units along it): { x, y, ux, uy, hw }
export function lineAt(B, s, out = {}) {
  const segs = B.segs; let i = 0;
  while (i < segs.length - 1 && segs[i].c0 + segs[i].len < s) i++;
  const sg = segs[i], t = clamp((s - sg.c0) / sg.len, 0, 1);
  out.x = sg.x1 + (sg.x2 - sg.x1) * t; out.y = sg.y1 + (sg.y2 - sg.y1) * t; out.ux = sg.ux; out.uy = sg.uy;
  out.hw = sg.hw1 + (sg.hw2 - sg.hw1) * t;
  return out;
}

// nearest point of one river: fills out { d (units, < 0 in the water), bd, hw, s, nx, ny (toward land), side }
function riverNear(B, x, y, out) {
  let bd = 1e9, bs = 0, bx = 0, by = 0, bhw = 0, bux = 1, buy = 0;
  for (const sg of B.segs) {
    const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1, t = clamp(((x - sg.x1) * vx + (y - sg.y1) * vy) / (sg.len * sg.len), 0, 1);
    const px = sg.x1 + vx * t, py = sg.y1 + vy * t, ex = x - px, ey = y - py, dd = Math.sqrt(ex * ex + ey * ey);
    if (dd < bd) { bd = dd; bs = sg.c0 + t * sg.len; bx = ex; by = ey; bhw = sg.hw1 + (sg.hw2 - sg.hw1) * t; bux = sg.ux; buy = sg.uy; }
  }
  const side = Math.sign(bux * by - buy * bx) || 1;
  out.bd = bd; out.hw = bhw; out.d = bd - bhw; out.s = bs; out.side = side; out.ux = bux; out.uy = buy;
  if (bd > 1e-3) { out.nx = bx / bd; out.ny = by / bd; } else { out.nx = -buy * side; out.ny = bux * side; }
  return out;
}

// nearest shore of a lake: the same fields as riverNear (s runs round the shore, by angle)
function lakeNear(B, x, y, out) {
  const d = B.shape(x, y), e = 0.5, gx = B.shape(x + e, y) - B.shape(x - e, y), gy = B.shape(x, y + e) - B.shape(x, y - e), l = Math.hypot(gx, gy) || 1;
  out.d = d; out.nx = gx / l; out.ny = gy / l; out.side = 1; out.hw = B.hwMax; out.bd = 0; out.ux = -out.ny; out.uy = out.nx;
  out.s = (Math.atan2((y - B.c[1]) / (B.pond.h || 1), (x - B.c[0]) / (B.pond.w || 1)) + Math.PI) * (B.pond.w + B.pond.h) / 4;
  return out;
}
const nearOf = (B, x, y, out) => (B.type === "lake" ? lakeNear(B, x, y, out) : riverNear(B, x, y, out));

// the compass bank a land normal faces from
export const bankOf = (nx, ny) => (Math.abs(ny) >= Math.abs(nx) ? (ny < 0 ? "N" : "S") : (nx < 0 ? "W" : "E"));

// the edge kind on a bank at s; kw 0..1 = how far inside its zone (faces taper over a zone's ends)
const KO = { kind: "lip", kw: 1 };
export function kindAt(B, s, side, bank, x = 0, y = 0, nx = 0, ny = 0) {
  if (B.type === "lake") { KO.kind = B.kind(x, y, nx, ny); KO.kw = 1; return KO; }
  const P = B.plan, sj = s + (vn(s / 9, side * 3, 11) - 0.5) * 10;
  let kind = P.def, kw = 1;
  for (const z of P.zones) if ((z.bank === "*" || z.bank === bank) && sj >= z.from && sj < z.to) { kind = z.kind; kw = clamp(Math.min(sj - z.from + 2, z.to - sj + 2) / 22, 0, 1); }
  // a zone that begins at the river's own start has no taper there
  KO.kind = kind; KO.kw = kw; return KO;
}

// a face's width at the waterline, art px (0 for a near bank we look down onto, or an edge with no face)
export function facePx(B, kind, kw, nx, ny) {
  const H = HFACE[kind]; if (!H || ny > 0.35) return 0;
  // a lake's cut shore: a face only where it looks at us, easing to nothing as the shore turns (no wedge ends)
  if (B.type === "lake") return H * sstep(0.05, -0.55, ny);
  const w = H * (Math.max(0, -ny) + Math.abs(nx) * 0.42);
  return Math.min(w, B.plan.faceMax || 13) * (0.15 + 0.85 * sstep(0, 1, kw));
}

// ---- one point, analytic ----
const NB = {}, P1 = {};
// the union of every body at (x, y): fills `o` and returns it; o.B null if no body is near
export function probe(x, y, o = P1, skipFace = false) {
  const L = bodies(); o.B = null; o.d = 99;
  for (const B of L) {
    const b = B.box; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    nearOf(B, x, y, NB);
    const du = o.B ? smin(o.d, NB.d, SMIN * 2) : NB.d;
    if (NB.d < o.d) { o.B = B; o.d = NB.d; o.s = NB.s; o.nx = NB.nx; o.ny = NB.ny; o.side = NB.side; o.hw = NB.hw; o.bd = NB.bd; o.ux = NB.ux; o.uy = NB.uy; }
    o.d = du;
  }
  if (!o.B || skipFace) return o;
  const k = kindAt(o.B, o.s, o.side, bankOf(o.nx, o.ny), x, y, o.nx, o.ny);
  o.kind = k.kind; o.kw = k.kw;
  o.fw = o.d < 0 ? facePx(o.B, k.kind, k.kw, o.nx, o.ny) : 0;
  // no face where the "land" behind it is another body's water (a mouth, a confluence)
  if (o.fw > 0 && L.length > 1 && o.B.type !== "lake") {
    const e = -o.d, lx = x + o.nx * (e + 0.6), ly = y + o.ny * (e + 0.6);
    for (const B of L) if (B !== o.B) { const b = B.box; if (lx < b[0] || lx > b[2] || ly < b[1] || ly > b[3]) continue; if (nearOf(B, lx, ly, NB).d < 0) { o.fw = 0; break; } }
  }
  return o;
}
// signed distance to the waterline (units, negative in the water; 99 far from any)
export const waterDist = (x, y) => probe(x, y, P1, true).d;
// open water (visible water, not a bank face): the hour's glints may lie here
const P2 = {};
export const openWater = (x, y) => { const o = probe(x, y, P2); return !!o.B && o.d < 0 && -o.d * 2 > o.fw + 1; };

// ---- the raster, for the bake ----
// D (art px, + land), S (units along), Q (0..1 depth across the channel, max over bodies: no seam at a
// mouth), NX / NY (land normal x 127), BODY (index, -1 none), FW (face width art px, Uint8 x 8).
export function buildField(x0, y0, x1, y1, k, only = null) {
  const L = bodies().filter((B) => !only || only.includes(B));
  const w = Math.max(1, Math.ceil((x1 - x0) * k)), h = Math.max(1, Math.ceil((y1 - y0) * k)), N = w * h;
  const D = new Float32Array(N).fill(99), S = new Float32Array(N), Q = new Float32Array(N);
  const NX = new Int8Array(N), NY = new Int8Array(N), BODY = new Int8Array(N).fill(-1), SIDE = new Int8Array(N);
  const ART = 2;   // D is kept in art px whatever k is
  const Db = new Float32Array(N);
  L.forEach((B, bi) => {
    Db.fill(99);
    const SQ = B.plan.sq || 0.7;
    if (B.type === "lake") {
      // a lake: its shape's distance, the normal from its slope, depth from the shore to `deep` art px
      const NO = {}, bx = B.box;
      const ia = Math.max(0, Math.floor((bx[0] - x0) * k)), ib = Math.min(w - 1, Math.ceil((bx[2] - x0) * k));
      const ja = Math.max(0, Math.floor((bx[1] - y0) * k)), jb = Math.min(h - 1, Math.ceil((bx[3] - y0) * k));
      for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) {
        const x = x0 + (i + 0.5) / k, y = y0 + (j + 0.5) / k, p = j * w + i;
        const d0 = B.shape(x, y); if (d0 > REACH + 1) continue;
        lakeNear(B, x, y, NO);
        const d = d0 * ART;
        if (d < 0) { const q = clamp(-d / B.deep, 0, 1) * B.qmax; if (q > Q[p]) Q[p] = q; }
        Db[p] = d;
        if (d < D[p]) { S[p] = NO.s; BODY[p] = bi; SIDE[p] = 1; NX[p] = Math.round(NO.nx * 127); NY[p] = Math.round(NO.ny * 127); }
      }
    }
    for (const sg of B.segs) {
      const m = Math.max(sg.hw1, sg.hw2) + REACH + 1;
      const ia = Math.max(0, Math.floor((Math.min(sg.x1, sg.x2) - m - x0) * k)), ib = Math.min(w - 1, Math.ceil((Math.max(sg.x1, sg.x2) + m - x0) * k));
      const ja = Math.max(0, Math.floor((Math.min(sg.y1, sg.y2) - m - y0) * k)), jb = Math.min(h - 1, Math.ceil((Math.max(sg.y1, sg.y2) + m - y0) * k));
      const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1, l2 = sg.len * sg.len;
      for (let j = ja; j <= jb; j++) {
        const y = y0 + (j + 0.5) / k;
        for (let i = ia; i <= ib; i++) {
          const x = x0 + (i + 0.5) / k, t = clamp(((x - sg.x1) * vx + (y - sg.y1) * vy) / l2, 0, 1);
          const ex = x - (sg.x1 + vx * t), ey = y - (sg.y1 + vy * t), dd = Math.sqrt(ex * ex + ey * ey);
          const hw = sg.hw1 + (sg.hw2 - sg.hw1) * t, d = (dd - hw) * ART, p = j * w + i;
          if (d < 0) {
            // the shallow stream profile (concept pass 5c): deepest along the line but never the two darkest
            // steps (SQ); a pale point bar on the inside of each bend
            const side = Math.sign(sg.ux * ey - sg.uy * ex) || 1, lat = dd / hw;
            const inside = side * sg.bend > 0 ? clamp(Math.abs(sg.bend) / 0.45, 0, 1) : 0;
            const q = clamp((1 - lat) * 1.4, 0, 1) * (1 - 0.65 * inside * sstep(0.1, 0.75, lat)) * SQ;
            if (q > Q[p]) Q[p] = q;
          }
          if (d >= Db[p]) continue;
          Db[p] = d;
          if (d < D[p]) {
            S[p] = sg.c0 + t * sg.len; BODY[p] = bi;
            const side = Math.sign(sg.ux * ey - sg.uy * ex) || 1; SIDE[p] = side;
            if (dd > 1e-3) { NX[p] = Math.round((ex / dd) * 127); NY[p] = Math.round((ey / dd) * 127); }
            else { NX[p] = Math.round(-sg.uy * side * 127); NY[p] = Math.round(sg.ux * side * 127); }
          }
        }
      }
    }
    if (bi === 0) D.set(Db);
    else for (let p = 0; p < N; p++) { const a = D[p], b2 = Db[p]; if (a < 50 && b2 < 50) D[p] = smin(a, b2, SMIN * ART * 2); else if (b2 < a) D[p] = b2; }
  });
  // the kind and the face width per pixel (water side), a face only where the land behind it is land
  const KIND = new Uint8Array(N), KW = new Uint8Array(N), FW = new Uint8Array(N);
  const KINDS = ["lip", "cut", "reeds", "quay"], KI = { lip: 0, cut: 1, reeds: 2, quay: 3 };
  for (let p = 0; p < N; p++) {
    const bi = BODY[p]; if (bi < 0 || D[p] > 10) continue;
    const B = L[bi], nx = NX[p] / 127, ny = NY[p] / 127;
    const kd = kindAt(B, S[p], SIDE[p], bankOf(nx, ny), x0 + ((p % w) + 0.5) / k, y0 + (((p / w) | 0) + 0.5) / k, nx, ny);
    KIND[p] = KI[kd.kind] ?? 0; KW[p] = Math.round(kd.kw * 255);
    if (D[p] < 0) {
      let fw = facePx(B, kd.kind, kd.kw, nx, ny);
      if (fw > 0 && B.type !== "lake") {
        const e = -D[p] / ART, i = p % w, j = (p / w) | 0;
        const li = Math.round(i + nx * (e + 0.6) * k), lj = Math.round(j + ny * (e + 0.6) * k);
        if (li >= 0 && lj >= 0 && li < w && lj < h && D[lj * w + li] < 0) fw = 0;
      }
      FW[p] = Math.min(255, Math.round(fw * 8));
    }
  }
  return { x0, y0, k, w, h, D, S, Q, NX, NY, BODY, SIDE, KIND, KW, FW, KINDS, bodies: L };
}
