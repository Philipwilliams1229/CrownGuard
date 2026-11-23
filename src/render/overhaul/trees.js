// the overhaul: trees, the wood's edge, sway and small life (B3; art/briefs/overhaul-build-millrace.md, "Trees").
//
// Every DECOR `tree` / `pine` / `willow` (lone pieces and the FOREST's) is drawn in treatment 4, the owner's final look
// (concept/overhaul2-trees.js rounds 5-6, copied into treeart.js): five fills, layer orders, one welded trunk-bough-root
// body with a root flare, no dead limbs. Lone `tree`s are dealt round oak / spreading oak / beech / hawthorn / birches
// by a hash of their place; `willow` is the approved strand willow (its strands trail into the water beside it);
// the wood's trees come from wood.js's shared set. Lit by the level's sun as baked (never mirrored).
//   - Trunks never move: a tree's foot is its DECOR anchor + FOOT. A crown that reaches over the road's lanes
//     (centre nearer than PATH_HALF + 0.9 x its radius) is SHRUNK to 0.85, then 0.72, never moved.
//   - A hall or the build ghost standing behind a crown sees through it: the crown's leaf pixels dithered to half
//     (a checker), its wood kept. Decided each frame (treeFrame), the see-through copy baked once, lazily.
//   - Sway (sway.js): lone broadleaves and willows, three whole-pixel poses, baked lazily.
//   - Stand rings / needle floors under the lone trees go into the ground (treeGroundMarks). Wildlife: life.js.
// EXPORTS for the lead's combined slots (overhaul/wire.js): ownsTree, drawTreeDecor, treeShadowItem, treeGroundMarks,
// treeFrame, treeDrawables, treeOver, treeKey. wire.js registers them (with B4's decor).
// Cost: base sprites bake on the first frame (they are needed by the cast shadows in the ground bake): see STATS.

import { SP, REACH, standRing, h2 } from "./treeart.js";
import { SWAY } from "./treeart.js";
import { woodPlan } from "./wood.js";
import { swayKind, poseAt, LEANS, BAKES_A_FRAME } from "./sway.js";
import { layLife, lifeDrawables, lifeOver, setHalls } from "./life.js";
import { DECOR, forestDepthAt, inRiver } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { PATH_HALF, W, H } from "../../data/constants.js";
import { PTS, nearestOnPath } from "../../engine/path.js";
import { DAY, onDay } from "../../data/sun.js";
import * as SCN from "../scenery.js";

const KINDS = new Set(["tree", "pine", "willow"]);
const FOOT = 10;                 // the trunk's foot below the DECOR anchor, board units (today's sprites stand there too)
const LONE = ["roundoak", "oak", "beech", "hawthorn", "birches"];
export const STATS = { bakes: 0, bakeMs: 0, poses: 0, ghosts: 0, bytes: 0, woodKeys: new Set(), firstFrameMs: 0, shrunk: [] };
if (typeof window !== "undefined") window.__ovhTrees = STATS;   // (labs read it)

// ---- the plan for one piece (cached on the piece) ----
const PLANS = new WeakMap();
let REALM_ID = null;
const clearOf = (kind, x, foot, k) => {
  if (!PTS.length) return true;
  const [hc, rc] = REACH[kind] || REACH.oak;
  return nearestOnPath(x, foot - hc * k).d >= PATH_HALF + rc * k * 0.9;
};
// how high a piece stands on the gate's crag (scenery.js treeLift: 0 on the ground, -1 left out of the cave mouth's
// clearing). Asked LIVE, never cached in the plan: the crag's height field exists only once the gate has been drawn.
const liftOf = (p) => (p.forest && typeof SCN.treeLift === "function" ? SCN.treeLift(p.d) : 0);
// the lone trees' sizes (lead, 2026-11-22: "a step up from today", as the approved panels read): broadleaves 1.3 x the
// concept's 0.9, pines 1.2 x, willows 1.25 x; the lane rule then shrinks only the crowns that must
const LONE_K = { broad: 0.9 * 1.3, oak: 0.75 * 1.3, pine: 0.9 * 1.2, willow: 0.9 * 1.25 };
function planOf(d) {
  if (REALM_ID !== REALM.id) { REALM_ID = REALM.id; ALL = null; }
  let p = PLANS.get(d);
  if (p && p.realm === REALM.id) return p;
  p = null;
  if (KINDS.has(d.t)) {
    const x = Math.round(d.x * 2) / 2, foot = Math.round((d.y + FOOT) * 2) / 2, s = d.s || 1;
    if (d.forest || (d.t !== "willow" && forestDepthAt(d.x, d.y) > -6)) p = woodPlan(d);   // (a willow stays a willow)
    else if (d.t === "willow") {
      const wet = inRiver(d.x - 26, foot, 2) ? -1 : inRiver(d.x + 26, foot, 2) ? 1 : 0, seed = (d.x * 7 + d.y) | 0;
      p = { kind: "willow", dk: 0, k: LONE_K.willow * s, seed, o: { wet, form: wet ? 0 : seed % 2 ? 1 : 2 } };
    } else if (d.t === "pine") p = { kind: "pine", dk: 0, k: LONE_K.pine * s, seed: (d.x * 7 + d.y) | 0, o: {} };
    else { const kind = LONE[Math.floor(h2(d.x | 0, d.y | 0, 2) * 5)]; p = { kind, dk: 0, k: (kind === "oak" ? LONE_K.oak : LONE_K.broad) * s, seed: (d.x * 7 + d.y) | 0, o: {} }; }
    p.k = Math.round(p.k * 20) / 20;
    // keep the crown off the lanes: shrink, never move (0.85, then 0.72 of its size)
    if (!clearOf(p.kind, x, foot, p.k)) { const k0 = p.k; for (const q of [0.85, 0.72]) { p.k = Math.round(k0 * q * 100) / 100; if (clearOf(p.kind, x, foot, p.k)) break; } p.shrunk = true; STATS.shrunk.push(`${p.forest ? "wood " : ""}${p.kind}@${Math.round(x)},${Math.round(foot)} ${k0}->${p.k}`); }
    Object.assign(p, { realm: REALM.id, x, foot, lone: !p.forest, d });
    p.key = `${p.kind}|${p.k}|${p.dk}|${p.seed}|${p.o.form ?? ""}|${p.o.wet ?? ""}`;
    p.sw = swayKind(p);
    p.ph = h2(p.seed, 3, 9) * 0.12;
    if (p.forest) STATS.woodKeys.add(p.key);
  }
  PLANS.set(d, p || { realm: REALM.id, none: true });
  return p;
}
export const ownsTree = (d) => { const p = planOf(d); return !!p && !p.none; };

// ---- the bakes (dropped on a new sun) ----
let BASE = new Map(), POSES = new Map(), budget = BAKES_A_FRAME, FRAMES = 0;
onDay(() => { BASE = new Map(); POSES = new Map(); STATS.bytes = 0; LIFE_KEY = ""; });
const bake = (p, lean) => {
  const t0 = performance.now();
  SWAY.at = lean ? () => lean : null;
  let s;
  try { s = SP[p.kind](p.k, p.dk, p.seed, p.o); } finally { SWAY.at = null; }
  STATS.bakes++; STATS.bakeMs += performance.now() - t0; STATS.bytes += s.cv.width * s.cv.height * 4;
  s.sp = { cv: s.cv, hw: s.ax / 2, top: s.ay / 2, bot: (s.cv.height - s.ay) / 2 };
  return s;
};
const baseOf = (p) => { let s = BASE.get(p.key); if (!s) BASE.set(p.key, (s = bake(p, 0))); return s; };
const poseOf = (p, n) => {
  const key = p.key + "~" + n;
  let s = POSES.get(key);
  if (s !== undefined) return s;
  if (budget <= 0) return null;
  budget--; STATS.poses++;
  POSES.set(key, (s = bake(p, LEANS[p.sw][n])));
  return s;
};
// the see-through crown: its leaf pixels on a checker (half of them) cleared; the wood and the rest kept
const ghostOf = (s) => {
  if (s.ghost !== undefined) return s.ghost;
  if (!s.leaf || budget <= 0) return null;
  budget--; STATS.ghosts++;
  const w = s.cv.width, h = s.cv.height, c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d"); x.drawImage(s.cv, 0, 0);
  const img = x.getImageData(0, 0, w, h), dd = img.data;
  for (let j = 0; j < h; j++) for (let i = (j & 1); i < w; i += 2) if (s.leaf[j * w + i]) dd[(j * w + i) * 4 + 3] = 0;
  x.putImageData(img, 0, 0);
  STATS.bytes += w * h * 4;
  return (s.ghost = c);
};

// ---- every owned piece on the board (for the per-frame tests, the ground marks and the life) ----
let ALL = null, ALL_N = -1;
const allPlans = () => {
  if (ALL && ALL_N === DECOR.length && REALM_ID === REALM.id) return ALL;
  const out = [];
  for (const d of DECOR) { const p = planOf(d); if (p && !p.none) out.push(p); }
  ALL = out; ALL_N = DECOR.length;
  return ALL;
};

// ---- FRAME: which crowns stand in front of a hall or the build ghost; the lazy-bake budget; the halls for the life ----
let GHOST = new Set();
const crownBox = (p, s, lift) => [p.x + (s.lb[0] - s.ax) / 2, p.foot - lift + (s.lb[1] - s.ay) / 2, p.x + (s.lb[2] - s.ax) / 2, p.foot - lift + (s.lb[3] - s.ay) / 2];
export function treeFrame(g) {
  // one lazy bake (a sway pose or a see-through crown, ~4-8 ms) every third frame at most, so no frame jumps much
  budget = (FRAMES++ % 3 === 0) ? BAKES_A_FRAME : 0;
  const t0 = STATS.firstFrameMs ? 0 : performance.now();
  const plans = allPlans();
  GHOST = new Set();
  const halls = [];
  for (const t of g.towers || []) halls.push([t.x, t.y]);
  setHalls(halls.slice());
  if (g.buildMode && g.hover) halls.push([g.hover[0], g.hover[1]]);
  if (halls.length) for (const p of plans) {
    const s = baseOf(p);
    if (!s.lb) continue;
    const B = crownBox(p, s, liftOf(p));
    for (const [hx, hy] of halls) {
      if (hy >= p.foot - 2) continue;                         // a hall in front of the tree needs nothing
      if (hx + 16 > B[0] && hx - 16 < B[2] && hy + 2 > B[1] && hy - 50 < B[3]) { GHOST.add(p); break; }
    }
  }
  if (t0) STATS.firstFrameMs = performance.now() - t0;
}

// ---- FRAME: one piece, in the y-sorted actors ----
export function drawTreeDecor(ctx, d, time) {
  const p = planOf(d);
  if (!p || p.none) return;
  const lift = liftOf(p);
  if (lift < 0) return;                                        // left out of the cave mouth's clearing, as today
  let s = baseOf(p), img = s.cv;
  if (p.sw && time) { const n = poseAt(p.x, p.ph, time); if (n) { const q = poseOf(p, n); if (q) { s = q; img = q.cv; } } }
  if (GHOST.has(p)) { const gh = ghostOf(s) || (s !== baseOf(p) ? ghostOf(baseOf(p)) : null); if (gh) img = gh; }
  ctx.drawImage(img, p.x - s.ax / 2, p.foot - Math.round(lift * 2) / 2 - s.ay / 2, img.width / 2, img.height / 2);
}

// ---- BAKE: the cast shadow (sceneryday.js castShadow reads the sprite's own silhouette) ----
export function treeShadowItem(d) {
  const p = planOf(d);
  if (!p || p.none || typeof document === "undefined") return null;
  const lift = liftOf(p);
  if (lift < 0) return null;
  return { sp: baseOf(p).sp, x: p.x, y: p.foot, lift: Math.round(lift * 2) / 2, mirror: false, round: true };
}

// ---- BAKE: the stand rings under the lone trees (an evergreen's is a needle floor), into the ground ----
export function treeGroundMarks(ctx) {
  ctx.save(); ctx.scale(0.5, 0.5);
  // at noon (no cast shadows) every crown lays a small pool of shade round its foot, stepped: a solid core and a
  // checker rim (today's trees painted one into their own sprite; the overhaul's sprites carry none)
  if (!DAY.on) for (const p of allPlans()) {
    if (liftOf(p)) continue;
    const s = baseOf(p), cw = s.lb ? (s.lb[2] - s.lb[0]) / 2 : 20, rx = Math.round(cw * (p.kind === "pine" ? 0.75 : 0.62)), ry = Math.max(3, Math.round(rx * 0.36));
    const cx = Math.round(p.x * 2), cy = Math.round(p.foot * 2) + 1;
    ctx.fillStyle = "rgba(24,40,22,0.42)";
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      const d = Math.hypot(i / rx, j / ry);
      if (d > 1 || (d > 0.72 && ((i + j) & 1))) continue;
      ctx.fillRect(cx + i, cy + j, 1, 1);
    }
  }
  for (const p of allPlans()) {
    if (!p.lone) continue;
    const [, rc] = REACH[p.kind] || REACH.oak, ever = p.kind === "pine";
    standRing(ctx, Math.round(p.x * 2), Math.round(p.foot * 2) - 2, Math.round(rc * 2 * p.k * (ever ? 1.15 : 0.95)), p.seed * 7, ever);
  }
  ctx.restore();
}
export const treeKey = () => "b3.3";

// ---- the life ----
let LIFE_KEY = "";
const lifeCast = () => {
  const plans = allPlans();
  const key = REALM.id + "|" + plans.length;
  const clear = (x, y, m) => x > 14 && y > 14 && x < W - 90 && y < H - 14 && (!PTS.length || nearestOnPath(x, y).d > PATH_HALF + m) && !inRiver(x, y, 4) && forestDepthAt(x, y) < -8;
  const edge = (y) => { for (let x = 0; x < 420; x += 2) if (forestDepthAt(x, y) < -14) return x > 0 ? x : null; return null; };
  const lone = plans.filter((p) => p.lone).map((p) => { const s = baseOf(p); return { x: p.x, foot: p.foot, kind: p.kind, crownTop: s.lb ? p.foot + (s.lb[1] - s.ay) / 2 + 1 : p.foot - 30, crownX: s.lb ? p.x + ((s.lb[0] + s.lb[2]) / 2 - s.ax) / 2 + 2 : p.x }; });
  const front = plans.filter((p) => p.forest && p.dk === 0 && p.kind !== "pine").map((p) => { const s = baseOf(p); return { x: p.x, foot: p.foot, crownMid: s.lb ? p.foot + ((s.lb[1] + s.lb[3]) / 2 - s.ay) / 2 : p.foot - 30 }; });
  LIFE_KEY = key;
  const road = (x, y) => (PTS.length ? nearestOnPath(x, y).d : 999);
  // a frightened creature's refuge: straight away from the nearest road, as far as the ground stays clear
  const away = (x, y, dist) => {
    if (!PTS.length) return [x, y + dist];
    const n = nearestOnPath(x, y), ux = (x - n.x) / (n.d || 1), uy = (y - n.y) / (n.d || 1);
    for (let k = dist; k > 6; k -= 6) { const ax = x + ux * k, ay = y + uy * k; if (clear(ax, ay, 10)) return [ax, ay]; }
    return [x, y];
  };
  return layLife(key, { lone, front, edge, clear, road, away });
};
export function treeDrawables(list, ctx, g) { lifeDrawables(list, ctx, g, lifeCast()); }
export function treeOver(ctx, g) { lifeOver(ctx, g, lifeCast()); }


