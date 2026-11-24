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
import { woodPlan, WOOD_MAX } from "./wood.js";
import { swayKind, poseAt, LEANS, BAKES_A_FRAME } from "./sway.js";
import { layLife, lifeDrawables, lifeOver, setHalls } from "./life.js";
import { DECOR, PONDS, COAST, FOREST, forestDepthAt, inRiver, inSea } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { PATH_HALF, W, H, WALL_W } from "../../data/constants.js";
import { sunCurves, SUN_DIR, SUN_SHEAR } from "../sunset.js";
import { PTS, nearestOnPath } from "../../engine/path.js";
import { DAY, onDay } from "../../data/sun.js";
import * as SCN from "../scenery.js";

const KINDS = new Set(["tree", "pine", "willow"]);
const FOOT = 10;                 // the trunk's foot below the DECOR anchor, board units (today's sprites stand there too)
const LONE = ["roundoak", "oak", "beech", "hawthorn", "birches"];
export const STATS = { bakes: 0, bakeMs: 0, poses: 0, ghosts: 0, bytes: 0, woodKeys: new Set(), firstFrameMs: 0, shrunk: [] };
if (typeof window !== "undefined") window.__ovhTrees = STATS;   // (labs read it)

// ---- the plan for one piece (cached on the piece) ----
const PLANS = new WeakMap(), WOOD = new Map();
let REALM_ID = null;
// a crown must clear the road's lanes (its centre PATH_HALF + 0.9 x its radius off the road) and the castle's wall
// (its right edge short of the wall face, W - WALL_W: the wall is drawn over anything behind it)
const WALL_X = W - WALL_W - 2;
const wallOk = (kind, x, k) => { const rc = (REACH[kind] || REACH.oak)[1]; return !(x + rc * k * 1.15 > WALL_X && x < WALL_X + 40); };
const laneOk = (kind, x, foot, k) => {
  if (!PTS.length) return true;
  const [hc, rc] = REACH[kind] || REACH.oak;
  return nearestOnPath(x, foot - hc * k).d >= PATH_HALF + rc * k * 0.9;
};
const clearOf = (kind, x, foot, k) => wallOk(kind, x, k) && laneOk(kind, x, foot, k);
// standing water a willow's strands may trail into: a river or a pond (never the sea: its surf is today's painter)
const wetAt = (x, y) => inRiver(x, y, 2) || PONDS.some((p) => ((x - p.x) / (p.w / 2 + 2)) ** 2 + ((y - p.y) / (p.h / 2 + 2)) ** 2 < 1);
// how high a piece stands on the gate's crag (scenery.js treeLift: 0 on the ground, -1 left out of the cave mouth's
// clearing). Asked LIVE, never cached in the plan: the crag's height field exists only once the gate has been drawn.
const liftOf = (p) => (p.forest && typeof SCN.treeLift === "function" ? SCN.treeLift(p.d) : 0);
// the lone trees' sizes (lead, 2026-11-22: "a step up from today", as the approved panels read): broadleaves 1.3 x the
// concept's 0.9, pines 1.2 x, willows 1.25 x; the lane rule then shrinks only the crowns that must
const LONE_K = { broad: 0.9 * 1.3, oak: 0.75 * 1.3, pine: 0.9 * 1.2, willow: 0.9 * 1.25 };
function planOf(d) {
  if (REALM_ID !== REALM.id) { REALM_ID = REALM.id; ALL = null; WOOD.clear(); STATS.woodKeys = new Set(); STATS.shrunk = []; }
  let p = PLANS.get(d);
  if (p && p.realm === REALM.id) return p;
  p = null;
  if (KINDS.has(d.t)) {
    const x = Math.round(d.x * 2) / 2, foot = Math.round((d.y + FOOT) * 2) / 2, s = d.s || 1;
    if (d.forest || (d.t !== "willow" && forestDepthAt(d.x, d.y) > -6)) p = woodPlan(d);   // (a willow stays a willow)
    else if (d.t === "willow") {
      const wet = wetAt(d.x - 26, foot) ? -1 : wetAt(d.x + 26, foot) ? 1 : 0, seed = (d.x * 7 + d.y) | 0;
      p = { kind: "willow", dk: 0, k: LONE_K.willow * s, seed, o: { wet, form: wet ? 0 : seed % 2 ? 1 : 2 } };
    } else if (d.t === "pine") p = { kind: "pine", dk: 0, k: LONE_K.pine * s, seed: (d.x * 7 + d.y) | 0, o: {} };
    else { const kind = LONE[Math.floor(h2(d.x | 0, d.y | 0, 2) * 5)]; p = { kind, dk: 0, k: (kind === "oak" ? LONE_K.oak : LONE_K.broad) * s, seed: (d.x * 7 + d.y) | 0, o: {} }; }
    p.k = Math.round(p.k * 20) / 20;
    // keep the crown off the lanes and the castle wall: shrink, never move (the lanes to 0.72 at most, the wall further)
    // the lanes shrink a crown to 0.72 at most; the castle wall to 0.8 at most, and a crown still over the wall's
    // face is drawn IN FRONT of it (treeOverCastle: its part past the face again after the castle), since a tree
    // standing west of the wall stands in front of it
    if (!clearOf(p.kind, x, foot, p.k)) { const k0 = p.k; for (const q of [0.85, 0.8, 0.72]) { if (q === 0.72 && laneOk(p.kind, x, foot, p.k)) break; p.k = Math.round(k0 * q * 100) / 100; if (laneOk(p.kind, x, foot, p.k) && (q <= 0.8 || wallOk(p.kind, x, p.k))) break; } p.shrunk = true; STATS.shrunk.push(`${p.forest ? "wood " : ""}${p.kind}@${Math.round(x)},${Math.round(foot)} ${k0}->${p.k}`); }
    Object.assign(p, { realm: REALM.id, x, foot, lone: !p.forest, d });
    p.key = `${p.kind}|${p.k}|${p.dk}|${p.seed}|${p.o.form ?? ""}|${p.o.wet ?? ""}`;
    p.sw = swayKind(p);
    p.wall = !wallOk(p.kind, x, p.k) && x < WALL_X;
    p.ph = h2(p.seed, 3, 9) * 0.12;
    if (p.forest) {
      // the wood's bakes stay bounded (WOOD_MAX a board): past the cap a new look borrows the nearest one already
      // dealt of the same kind, never a bigger one (a crown kept off the lanes stays off them)
      if (!WOOD.has(p.key) && WOOD.size >= WOOD_MAX) {
        let best = null;
        for (const q of WOOD.values()) if (q.kind === p.kind && (!best || (q.k <= p.k ? (best.k > p.k || q.k > best.k) : (best.k > p.k && q.k < best.k)))) best = q;
        if (best) Object.assign(p, { k: best.k, dk: best.dk, seed: best.seed, key: best.key });
      }
      if (!WOOD.has(p.key)) WOOD.set(p.key, { kind: p.kind, k: p.k, dk: p.dk, seed: p.seed, key: p.key });
      STATS.woodKeys.add(p.key);
    }
  }
  PLANS.set(d, p || { realm: REALM.id, none: true });
  return p;
}
export const ownsTree = (d) => { const p = planOf(d); return !!p && !p.none; };

// ---- the bakes (dropped on a new sun) ----
let BASE = new Map(), POSES = new Map(), budget = BAKES_A_FRAME, FRAMES = 0, AFTER_GROUND = false;
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
// the lazy (in-battle) bakes: count, total ms, worst single, and the frame each happened in (labs read STATS)
const lazy = (t0) => { const ms = performance.now() - t0; STATS.lazyN = (STATS.lazyN || 0) + 1; STATS.lazyMs = (STATS.lazyMs || 0) + ms; STATS.lazyWorst = Math.max(STATS.lazyWorst || 0, ms); STATS.lazyLast = FRAMES; lazyMsFrame += ms; };
const baseOf = (p) => { let s = BASE.get(p.key); if (!s) BASE.set(p.key, (s = bake(p, 0))); return s; };
// ---- the derived bakes (2026-11-23: no re-sculpt in battle) ----
// A base sprite is split ONCE into its wood (everything that is not leaf) and its leaves (the leaf mask: leaf pixels
// and the outline beside them), in the loading moment for every tree that sways (warmTrees), else when first needed.
// A sway pose is then the wood as it stands plus the leaves shifted by whole pixels, row band by row band: a broadleaf's
// crown leans most at its top (lean x height^1.3 from the crown's foot), a willow's strands most at their tips (the
// lower they hang, the further they swing), so the trunk never moves. A see-through crown is the wood plus the leaves
// with every other pixel cleared on a checker. Both are a few drawImage calls (~0.2-1 ms), no pixel reads.
const splitOf = (s) => {
  if (s.wood) return s;
  const w = s.cv.width, h = s.cv.height, src = s.cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h);
  const W0 = new ImageData(w, h), L0 = new ImageData(w, h), d = src.data;
  for (let k = 0, q = 0; k < w * h; k++, q += 4) {
    const T = s.leaf && s.leaf[k] ? L0.data : W0.data;
    T[q] = d[q]; T[q + 1] = d[q + 1]; T[q + 2] = d[q + 2]; T[q + 3] = d[q + 3];
  }
  const mk = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").putImageData(img, 0, 0); return c; };
  s.wood = mk(W0); s.leaves = mk(L0);
  STATS.bytes += w * h * 8;
  return s;
};
// the checker (one art pixel on, one off), made once
let CHECK = null;
const checker = () => {
  if (CHECK) return CHECK;
  const c = document.createElement("canvas"); c.width = 2; c.height = 2;
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1);
  return (CHECK = c);
};
// a new canvas the size of the base: the wood, then the leaves (shifted per row band by shift(row) whole pixels)
const derive = (s, shift, see) => {
  const w = s.cv.width, h = s.cv.height, c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.drawImage(s.wood, 0, 0);
  let leaves = s.leaves;
  if (see) {   // the leaves on a checker: drawn to a scratch, every other pixel punched out
    const t = document.createElement("canvas"); t.width = w; t.height = h;
    const tx = t.getContext("2d"); tx.drawImage(s.leaves, 0, 0);
    tx.globalCompositeOperation = "destination-out"; tx.fillStyle = tx.createPattern(checker(), "repeat"); tx.fillRect(0, 0, w, h);
    leaves = t;
  }
  if (!shift) { x.drawImage(leaves, 0, 0); return c; }
  for (let j0 = 0; j0 < h;) {
    const d0 = shift(j0);
    let j1 = j0 + 1;
    while (j1 < h && shift(j1) === d0) j1++;
    x.drawImage(leaves, 0, j0, w, j1 - j0, d0, j0, w, j1 - j0);
    j0 = j1;
  }
  return c;
};
// the lean of a pose as a row function: broadleaves lean from the crown's foot up (lean x u^1.3, u 0 at the foot of
// the leaves, 1 at their top); a willow's strands swing from the arch down (0.8 x lean x u^1.4, u 0 at the arch)
const leanRows = (p, s, lean) => {
  const [, y0, , y1] = s.lb || [0, 0, 0, s.cv.height];
  if (p.kind === "willow") { const arch = y0 + (y1 - y0) * 0.12; return (j) => (j <= arch ? 0 : Math.round(lean * 0.8 * Math.pow(Math.min(1, (j - arch) / Math.max(1, y1 - arch)), 1.4))); }
  return (j) => (j >= y1 ? 0 : Math.round(lean * Math.pow(Math.min(1, (y1 - j) / Math.max(1, y1 - y0)), 1.3)));
};
// one derived bake a frame at most, ~2 ms of it at most, none in the frame right after the ground bake
const BAKE_MS = 2;
let lazyMsFrame = 0;
const mayBake = () => budget > 0 && lazyMsFrame < BAKE_MS;
const poseOf = (p, n) => {
  const key = p.key + "~" + n;
  let s = POSES.get(key);
  if (s !== undefined) return s;
  if (!mayBake()) return null;
  const b = baseOf(p);
  if (!b.leaf) { POSES.set(key, b); return b; }
  budget--; STATS.poses++;
  const t0 = performance.now();
  splitOf(b);
  const sh = leanRows(p, b, LEANS[p.sw][n]);
  s = { cv: derive(b, sh), ax: b.ax, ay: b.ay, base: b, shift: sh };
  STATS.bytes += s.cv.width * s.cv.height * 4;
  POSES.set(key, s);
  lazy(t0);
  return s;
};
// the see-through crown of a base sprite or a pose: the same leaves on a checker
const ghostOf = (s) => {
  if (s.ghost !== undefined) return s.ghost;
  const b = s.base || s;
  if (!b.leaf || !mayBake()) return null;
  budget--; STATS.ghosts++;
  const t0 = performance.now();
  splitOf(b);
  s.ghost = derive(b, s.shift || null, true);
  STATS.bytes += b.cv.width * b.cv.height * 4;
  lazy(t0);
  return s.ghost;
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
// ---- the Blood Moon (render/bloodmoon.js): the land takes SHADE_GROUND 0.85 of the night's shade in the ground pass,
// everything standing (halls, figures, today's trees: all drawn among the actors) only SHADE_ACTORS 0.5 of it, laid
// over the finished picture. Today's trees were darker blue-greens, so under that same 0.5 they sat low; the
// overhaul's brighter summer leaves stood out. So an owned tree takes TREE_NIGHT more of the shade on itself (its own
// silhouette in the night's colour over it, k-continuous), and the lone trees and the wood's front row lay a long
// moon shadow like the halls' (sunset.js SUN_DIR / SUN_SHEAR x the curve's len, its strength), under the actors.
let MOON = null;
const TREE_NIGHT = 0.32, NIGHT_RGB = "rgb(22,10,26)";
const SIL = new WeakMap();
const silOf = (cv) => {
  let s = SIL.get(cv);
  if (s) return s;
  s = document.createElement("canvas"); s.width = cv.width; s.height = cv.height;
  const x = s.getContext("2d"); x.drawImage(cv, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = NIGHT_RGB; x.fillRect(0, 0, s.width, s.height);
  SIL.set(cv, s);
  return s;
};
function moonShadows(ctx) {
  const L = SUN_SHEAR * MOON.len, pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * MOON.shadow * 0.55;
  for (const p of allPlans()) {
    if (p.dk) continue;
    const lift = liftOf(p);
    if (lift < 0) continue;
    const s = baseOf(p);
    ctx.save();
    ctx.translate(p.x, p.foot - Math.round(lift * 2) / 2);
    ctx.transform(1, 0, -L * SUN_DIR[0], -L * SUN_DIR[1], 0, 0);
    ctx.drawImage(silOf(s.cv), -s.ax / 2, -s.ay / 2, s.cv.width / 2, s.cv.height / 2);
    ctx.restore();
  }
  ctx.globalAlpha = pa;
}
const crownBox = (p, s, lift) => [p.x + (s.lb[0] - s.ax) / 2, p.foot - lift + (s.lb[1] - s.ay) / 2, p.x + (s.lb[2] - s.ax) / 2, p.foot - lift + (s.lb[3] - s.ay) / 2];
function treeFrame0(g) {
  // one lazy bake (a sway pose or a see-through crown, ~4-8 ms) every third frame at most, so no frame jumps much
  budget = FRAMES++ === 0 || AFTER_GROUND ? 0 : BAKES_A_FRAME;
  AFTER_GROUND = false; lazyMsFrame = 0;
  const w = g.weather;
  MOON = w && w.paint === "bloodmoon" && w.k > 0.01 ? sunCurves(Math.min(1, w.k)) : null;
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
// the crowns that reach over the castle wall's face, as drawn this frame (image, x, y), for treeOverCastle
const LAST = new Map();
// FRAME, right after the castle is drawn (draw.js drawCastle / drawCastleWorks): the part of each such crown past the
// wall's face, again, so the tree stands in front of the wall instead of being cut by it
function treeOverCastle0(ctx) {
  if (!LAST.size) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(WALL_X, -50, W - WALL_X + 50, H + 100); ctx.clip();
  for (const [img, X, Y] of LAST.values()) {
    ctx.drawImage(img, X, Y, img.width / 2, img.height / 2);
    if (MOON && MOON.shade > 0.01) { const pa = ctx.globalAlpha; ctx.globalAlpha = pa * MOON.shade * TREE_NIGHT; ctx.drawImage(silOf(img), X, Y, img.width / 2, img.height / 2); ctx.globalAlpha = pa; }
  }
  ctx.restore();
  LAST.clear();
}
function drawTreeDecor0(ctx, d, time) {
  const p = planOf(d);
  if (!p || p.none) return;
  const lift = liftOf(p);
  if (lift < 0) return;                                        // left out of the cave mouth's clearing, as today
  let s = baseOf(p), img = s.cv;
  if (p.sw && time) { const n = poseAt(p.x, p.ph, time); if (n) { const q = poseOf(p, n); if (q) { s = q; img = q.cv; } } }
  if (GHOST.has(p)) { const gh = ghostOf(s) || (s !== baseOf(p) ? ghostOf(baseOf(p)) : null); if (gh) img = gh; }
  const X = p.x - s.ax / 2, Y = p.foot - Math.round(lift * 2) / 2 - s.ay / 2;
  if (p.wall) LAST.set(p, [img, X, Y]);
  ctx.drawImage(img, X, Y, img.width / 2, img.height / 2);
  if (MOON && MOON.shade > 0.01) {
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * MOON.shade * TREE_NIGHT;
    ctx.drawImage(silOf(img), X, Y, img.width / 2, img.height / 2);
    ctx.globalAlpha = pa;
  }
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
// Every base sprite is baked HERE, in the level's loading moment (the ground bake), so no tree is missing from the
// first visible frame; only sway poses and see-through crowns stay lazy. warmTrees() does the same for any caller.
export function warmTrees() { for (const p of allPlans()) { const b = baseOf(p); if (p.sw && b.leaf) splitOf(b); } }
export function treeGroundMarks(ctx) {
  warmTrees();
  AFTER_GROUND = true;
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
export const treeKey = () => "b3.4";

// ---- the life ----
let LIFE_KEY = "";
const lifeCast = () => {
  const plans = allPlans();
  const key = REALM.id + "|" + plans.length;
  // a creature's ground: on the board short of the castle band, off the road, out of every water (rivers, ponds, the
  // sea AND its beach: no deer on the sand), and out of the wood
  const clear = (x, y, m) => x > 14 && y > 14 && x < W - WALL_W - 14 && y < H - 14 && (!PTS.length || nearestOnPath(x, y).d > PATH_HALF + m)
    && !inRiver(x, y, 4) && !wetAt(x, y) && !(COAST && inSea(x, y, (COAST.sand || 0) + 8)) && forestDepthAt(x, y) < -8;
  // the wood's edge, as points just outside it, and the way back in (the wood stands on the left or the top edge)
  const top = FOREST && FOREST.edge === "top", edges = [];
  if (FOREST) for (let u = 70; u < (top ? W - WALL_W - 40 : H - 60); u += 23) {
    for (let v = 0; v < 420; v += 2) {
      const x = top ? u : v, y = top ? v : u;
      if (forestDepthAt(x, y) < -14) { if (v > 0) edges.push(top ? [x, y + 12, 0, -26] : [x + 12, y, -26, 4]); break; }
    }
  }
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
  return layLife(key, { lone, front, edges, clear, road, away });
};
function treeDrawables0(list, ctx, g) {
  if (MOON && MOON.shadow > 0.01) list.push({ y: -1e9, fn: () => moonShadows(ctx) });   // first among the actors: on the land
  lifeDrawables(list, ctx, g, lifeCast());
}
function treeOver0(ctx, g) { lifeOver(ctx, g, lifeCast()); }



// labs: `b3prof=1` in the URL sums this module's frame time (bakes excluded) into STATS.frameMs / STATS.frames
const PROF_ON = typeof location !== "undefined" && /[?&]b3prof=1/.test(location.search);
const timed = (f) => (PROF_ON ? (...a) => { const t0 = performance.now(), b0 = STATS.bakeMs; try { return f(...a); } finally { STATS.frameMs = (STATS.frameMs || 0) + performance.now() - t0 - (STATS.bakeMs - b0); } } : f);
// (the first 30 frames are left out: they carry the one-off bakes of creatures, silhouettes and see-through crowns)
export const treeFrame = timed((g) => { STATS.frames = (STATS.frames || 0) + 1; if (STATS.frames === 31) { STATS.frameMs = 0; } treeFrame0(g); });
export const drawTreeDecor = timed(drawTreeDecor0);
export const treeDrawables = timed(treeDrawables0);
export const treeOver = timed(treeOver0);
export const treeOverCastle = timed(treeOverCastle0);
// labs only: one pose of a tree two ways, the old re-sculpt and the derived one (for the before / after check)
export function labPose(kind, k, seed, n, o = {}) {
  const p = { kind, k, dk: 0, seed, o, sw: kind === "willow" ? "willow" : "broad", key: "lab|" + kind + "|" + seed };
  const b = bake(p, 0), lean = LEANS[p.sw][n];
  const t0 = performance.now(); const old = bake(p, lean).cv; const oldMs = performance.now() - t0;
  const t1 = performance.now(); splitOf(b); const neu = derive(b, leanRows(p, b, lean)); const newMs = performance.now() - t1;
  return { old, neu, oldMs, newMs };
}
