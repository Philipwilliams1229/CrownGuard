// The overhaul's small life (B3; concept/overhaul2-trees.js LIFE / LIFE2 / ROUTINE / fireflyLoop, copied, summer):
// deer at the wood's edge, rabbits by the lone trees, a squirrel on a lone trunk, robins on lone crowns, butterflies
// over the stand rings' flowers by day; the owl and fireflies at golden hour and under the Blood Moon.
// All ambient: never on the road, never takes a tap, pale calm colours. Each creature has a home and a few frames on
// a slow clock; every 0.5 s it looks for the nearest foe and, within FLEE units, runs (deer into the wood, rabbits
// hop away from the road, robins fly to another tree), coming back once the field near its home has been quiet a while.
// Cost: the sprites are ~30 tiny bakes (~60 KB in all) made on the first frame; per frame a dozen blits.

import { Pix, mat, flat } from "../pix/pix.js";
import { sprite, rng, h2 } from "./treeart.js";
import { DAY } from "../../data/sun.js";

const FLEE = 60, QUIET = 25, TAU = Math.PI * 2;
// the halls standing this frame (trees.js treeFrame hands them in): a deer or rabbit never stands inside a hall's
// footing; one whose spot a hall now covers is simply not there (it has gone off into the grass)
let HALLS = [];
export const setHalls = (h) => { HALLS = h; };
const inHall = (x, y) => { for (const [hx, hy] of HALLS) if (Math.abs(x - hx) < 22 && y > hy - 16 && y < hy + 12) return true; return false; };
const mini = (w, h, foot, build) => sprite(w, h, foot, null, build);
void Pix;

// ---- the creatures (frames as the concept drew them) ----
const LIFE = {
  deer(flip = 1) {
    return [[1, 0], [1, 1], [0, 0], [0, 1]].map(([down, ph]) => mini(44, 34, 4, (P) => {
      const fur = mat("#a89478"), pale = mat("#ece2cc"), dkm = flat("#3a2e2c"), f = flip;
      P.part(); P.limb([[-8 * f, -11], [-9 * f, -5], [-8 * f, 0]], [1, 0.8, 0.6], fur, 30); P.limb([[7 * f, -11], [8 * f, -5], [9 * f, 0]], [1, 0.8, 0.6], fur, 30);
      P.part(); P.ellipse(0, -14, 10.5, 4.8, fur, 40); P.ellipse(0, -11.5, 7, 2, pale, 41, { wrap: true });
      P.ellipse(-10 * f, -15, 2.2, 2.6, pale, 42);
      P.part(); P.limb([[-6 * f, -11], [-6 * f, -5], [-5 * f, 0]], [1.1, 0.8, 0.6], fur, 50); P.limb([[6 * f, -11], [6.5 * f, -5], [7 * f, 0]], [1.1, 0.8, 0.6], fur, 50);
      const hx = down ? 17 * f : 12 * f, hy = down ? -3 - ph : -26;
      P.part(); P.limb(down ? [[8 * f, -16], [13 * f, -12], [hx - 1 * f, hy - 1]] : [[8 * f, -16], [hx * 0.95, (hy - 16) / 2 - 2], [hx, hy + 2]], [2.6, 2, 1.6], fur, 55);
      P.part(); P.ellipse(hx + (down ? 0.5 : 2) * f, hy, down ? 2.2 : 3.4, down ? 3.2 : 2.4, fur, 60, { rot: (down ? 0.3 : 0.25) * f }); P.dot(hx + (down ? 1 : 4.5) * f, hy + (down ? 2.5 : 0.5), dkm, 62);
      P.dot(hx + (down ? -0.5 : 1.5) * f, hy - (down ? 0 : 1), dkm, 62);
      const ea = ph && !down ? -1.2 : 0;
      P.part(); P.ellipse(hx - 0.5 * f, hy - 3.5 + ea * 0.5, 1, 2.2, fur, 58, { rot: (0.5 + ea) * f });
    }));
  },
  rabbit(flip = 1) {
    return [0, 1, 2, 3].map((n) => mini(20, 16, 2, (P) => {
      const fur = mat("#a49482"), pale = flat("#f4f0e8"), dk = flat("#3a2e2c"), f = flip;
      const hop = n >= 2, sx = n === 2 ? 1.3 : 1, up = n === 2 ? -3 : n === 3 ? -1 : 0;
      P.part(); P.ellipse(0, -3.5 + up, 4.5 * sx, 3, fur, 40);
      P.dot(-4.6 * f * sx, -4 + up, pale, 45);
      if (hop) { P.part(); P.limb([[-3 * f, -2 + up], [-6 * f * sx, -0.5 + up * 0.3]], [1, 0.7], fur, 38); }
      P.part(); P.ellipse(4 * f, -6.5 + up, 2.4, 2, fur, 50); P.dot(5 * f, -7 + up, dk, 52);
      const lean = n === 1 ? 0.7 : 0;
      P.part(); P.limb([[3.4 * f, -8 + up], [(2.6 - lean) * f, -12 + up]], [0.9, 0.7], fur, 49); P.limb([[4.4 * f, -8 + up], [(4.2 + lean) * f, -12.5 + up]], [0.9, 0.7], fur, 51);
    }));
  },
  // the red squirrel without its trunk (it climbs the tree's own): stretch, tuck, tail up, a look round
  squirrel() {
    return [0, 1, 2, 3].map((n) => mini(26, 40, 2, (P) => {
      const fur = mat("#b8643a"), pale = flat("#f0e4cc"), dk = flat("#2a2226");
      const y = [-14, -18, -22, -22][n], st = n === 0 ? 2 : 0;
      P.part(); P.ellipse(-5, y + st, 2.4, 4 + st * 0.5, fur, 40); P.ellipse(-4.4, y, 1, 2.6, pale, 41, { wrap: true });
      P.part(); P.ellipse(-5, y - 5 - st * 0.5, 2.2, 1.9, fur, 45); P.dot(n === 3 ? -7 : -4, y - 5.5, dk, 46); P.dot(-5.5, y - 7.5, fur, 44);
      P.part(); P.limb(n >= 2 ? [[-6, y + 3], [-10, y - 2], [-9, y - 8]] : [[-6, y + 4], [-8, y + 9], [-7, y + 13]], [1.6, 2.4, 1.6], fur, 35);
    }));
  },
  // a robin: 0 wings up, 1 down, 2 the flare, 3 perched
  bird(flip = 1) {
    return [0, 1, 2, 3].map((n) => mini(16, 12, 2, (P) => {
      const br = mat("#8a6a4a"), red = mat("#e07a3a"), dk = flat("#2a2226"), f = flip, x = 0, y = -3.2;
      P.part(); P.ellipse(x, y, 2.4, 1.8, br, 40); P.ellipse(x + 1 * f, y + 0.6, 1.2, 1.1, red, 41, { wrap: true }); P.dot(x + 2.4 * f, y - 0.4, dk, 42); P.dot(x - 2.6 * f, y + 0.4, br, 40);
      P.part();
      if (n === 0) { P.line(x - 1 * f, y - 1, x - 3 * f, y - 4, br, 45); P.line(x, y - 1, x + 1 * f, y - 4, br, 45); }
      if (n === 1) { P.line(x - 1 * f, y, x - 4 * f, y + 2, br, 45); P.line(x, y, x + 1 * f, y + 2, br, 45); }
      if (n === 2) { P.line(x - 1 * f, y - 1, x - 4 * f, y - 3, br, 45); P.line(x, y - 1, x + 2 * f, y - 3, br, 45); P.dot(x, y + 2, dk, 46); }
      if (n === 3) { P.dot(x, y + 2, dk, 46); P.dot(x + 1 * f, y + 2, dk, 46); }
    }));
  },
  // a tawny owl on its bough: open eyes, blink, head turned, a shuffle
  owl() {
    return [0, 1, 2, 3].map((n) => mini(26, 26, 6, (P) => {
      const bk = mat("#5a4030"), fur = mat("#8a6e50"), face = mat("#c8b090"), eye = flat("#f4d040"), dk = flat("#241a1c");
      P.part(); P.limb([[-12, -4], [0, -5], [12, -3]], [1.6, 1.8, 1.2], bk, 10);
      P.part(); P.ellipse(0, -11 + (n === 3 ? 1 : 0), 4.4 + (n === 3 ? 0.8 : 0), 5.6, fur, 40);
      const hx = n === 2 ? 1 : 0;
      P.part(); P.ellipse(hx, -18, 4, 3.4, fur, 50); P.ellipse(hx, -17.6, 3, 2.4, face, 51, { wrap: true });
      if (n === 1) { P.line(hx - 2, -18, hx - 1, -18, dk, 52); P.line(hx + 1, -18, hx + 2, -18, dk, 52); }
      else if (n === 2) { P.dot(hx + 1, -18, eye, 52); P.dot(hx + 3, -18, eye, 52); }
      else { P.dot(hx - 1.5, -18, eye, 52); P.dot(hx + 1.5, -18, eye, 52); }
      P.dot(hx, -16.8, dk, 52);
      for (const x of [-1.5, 1.5]) P.dot(x, -4.8, flat("#d0a040"), 41);
    }));
  },
};
// a butterfly, art px: wings open / half / shut / half
function bfly(ctx, X, Y, n) {
  const w = "#f4e488", wd = "#c8a848";
  ctx.fillStyle = "#3a3030"; ctx.fillRect(X, Y, 1, 2);
  const px = (dx, dy, c) => { ctx.fillStyle = c; ctx.fillRect(X + dx, Y + dy, 1, 1); };
  if (n === 0) { for (const s of [-1, 1]) { px(s, -1, w); px(2 * s, -1, w); px(s, 0, w); px(2 * s, 1, wd); } }
  else if (n === 1 || n === 3) { for (const s of [-1, 1]) { px(s, -1, w); px(s, 0, wd); } }
  else { px(0, -1, w); px(0, -2, w); }
}

// ---- the sprites, baked once per sun (the creatures are lit by it too) ----
let SPR = null, SPR_DAY = null;
const sprites = () => {
  if (SPR && SPR_DAY === DAY.id) return SPR;
  SPR_DAY = DAY.id;
  return (SPR = { deer: { 1: LIFE.deer(1), "-1": LIFE.deer(-1) }, rabbit: { 1: LIFE.rabbit(1), "-1": LIFE.rabbit(-1) }, squirrel: LIFE.squirrel(), bird: { 1: LIFE.bird(1), "-1": LIFE.bird(-1) }, owl: LIFE.owl() });
};
const blit = (ctx, s, x, y) => ctx.drawImage(s.cv, Math.round(x * 2 - s.ax) / 2, Math.round(y * 2 - s.ay) / 2, s.cv.width / 2, s.cv.height / 2);

// ---- the cast, laid out once per realm from the trees' plans (trees.js hands them in) ----
let CAST = null, CAST_KEY = "";
// env: { lone: [{ x, foot, kind, crownTop, crownX }], front: [{ x, foot, crownMid }], edges: [[x, y, dx, dy]] just outside the
//   wood (dx, dy: the way back into it), clear: (x, y, m) -> bool, road: (x, y) -> distance, away: (x, y, d) -> [x, y] }
export function layLife(key, env) {
  if (CAST && CAST_KEY === key) return CAST;
  CAST_KEY = key;
  const r = rng(4242);
  const C = { deer: [], rabbit: [], squirrel: null, birds: [], bflies: [], owl: null, flies: [] };
  // deer: two at the wood's edge, well apart, grazing just outside the trees
  const edges = env.edges.filter(([x, y]) => env.clear(x, y, 30));
  for (const f of [0.3, 0.75]) { const p = edges[Math.floor(f * edges.length)]; if (p && !C.deer.some((d) => Math.hypot(d.hx - p[0], d.hy - p[1]) < 60)) C.deer.push({ kind: "deer", hx: p[0], hy: p[1], x: p[0], y: p[1], away: [p[0] + p[2], p[1] + p[3]], flip: f < 0.5 ? 1 : -1, ph: r() * 40, state: "home", quietAt: 0 }); }
  // rabbits: by the lone trees' feet, three at most
  for (const t of env.lone) {
    if (C.rabbit.length >= 3) break;
    for (const [dx, dy] of [[16, 5], [-16, 6], [10, 9]]) {
      const x = t.x + dx, y = t.foot + dy;
      if (env.clear(x, y, 14)) { C.rabbit.push({ kind: "rabbit", hx: x, hy: y, x, y, flip: dx > 0 ? -1 : 1, ph: r() * 40, state: "home", quietAt: 0, away: env.away(x, y, 34) }); break; }
    }
  }
  // the squirrel on the first lone broadleaf
  const sq = env.lone.find((t) => t.kind !== "pine" && t.kind !== "willow" && t.kind !== "birches");
  if (sq) C.squirrel = { x: sq.x + 4, y: sq.foot, ph: r() * 40 };
  // robins: perches on lone broadleaf crowns
  const perches = env.lone.filter((t) => t.kind !== "pine").map((t) => [t.crownX, t.crownTop, t.foot, t.x]);
  if (perches.length >= 2) for (let i = 0; i < Math.min(2, perches.length - 1); i++) C.birds.push({ at: i, next: (i + 1) % perches.length, t0: -r() * 8, perch: 9 + r() * 6, flipTo: 1 });
  C.perches = perches;
  // butterflies: over the flowers at the lone trees' stand rings
  for (const t of env.lone) {
    if (C.bflies.length >= 3) break;
    const x = t.x + (C.bflies.length % 2 ? -20 : 20), y = t.foot + 8;
    if (env.clear(x, y, 18)) C.bflies.push({ x, y, ph: r() });
  }
  // the owl: a front-row tree of the wood
  const fr = env.front.filter((t) => env.road(t.x, t.foot) > 50);
  if (fr.length) { const t = fr[Math.floor(fr.length * 0.45)]; C.owl = { x: t.x + 5, y: t.crownMid + 6, sort: t.foot + 0.3 }; }
  // fireflies: along the wood's edge and round the lone trees, off the road
  for (const [x, y] of edges) for (let n = 0; n < 3; n++) { const px = x + (r() - 0.6) * 40, py = y + (r() - 0.5) * 22; if (env.clear(px, py, 4)) C.flies.push([px, py]); }
  for (const t of env.lone) for (let n = 0; n < 5; n++) { const px = t.x + (r() - 0.5) * 50, py = t.foot - 6 - r() * 26; if (env.clear(px, py, 4)) C.flies.push([px, py]); }
  return (CAST = C);
}

const dusk = (g) => DAY.id === "golden" || !!(g.weather && g.weather.paint === "bloodmoon" && g.weather.k > 0.4);
const moon = (g) => !!(g.weather && g.weather.paint === "bloodmoon" && g.weather.k > 0.4);

// the nearest foe to (x, y), squared; checked every 0.5 s per creature
const nearFoe = (g, x, y) => { let b = 1e9; for (const e of g.enemies || []) { if (e.dead || e.hp <= 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < b) b = d; } return b; };
const LOG = typeof window !== "undefined" ? (window.__ovhLifeLog = []) : [];   // (labs: state changes)
function flee(c, g, t, ax, ay) {
  if (!c.tick || t - c.tick > 0.5 || t < c.tick) {
    c.tick = t;
    const was = c.state;
    queueMicrotask(() => { if (c.state !== was && LOG.length < 200) LOG.push(`${t.toFixed(1)} ${c.kind} ${was}->${c.state} @${Math.round(c.x)},${Math.round(c.y)}`); });
    const d = nearFoe(g, c.hx, c.hy);
    if (d < FLEE * FLEE) { if (c.state === "home") c.state = "run"; c.quietAt = t; }
    else if (d < (FLEE * 1.5) ** 2) c.quietAt = t;
    else if (c.state !== "home" && t - c.quietAt > QUIET) c.state = "back";
  }
  const [tx, ty] = c.state === "home" || c.state === "back" ? [c.hx, c.hy] : [ax, ay];
  const dx = tx - c.x, dy = ty - c.y, L = Math.hypot(dx, dy), dt = Math.min(0.1, Math.max(0, t - (c.last ?? t))); c.last = t;
  const sp = c.state === "run" ? 70 : 22;
  if (L > 0.5) { const s = Math.min(L, sp * dt); c.x += (dx / L) * s; c.y += (dy / L) * s; c.moving = true; if (Math.abs(dx) > 0.5) c.face = dx > 0 ? 1 : -1; }
  else { c.moving = false; if (c.state === "back") c.state = "home"; }
}

// ---- per frame: the standing creatures, y-sorted with the actors ----
export function lifeDrawables(list, ctx, g, C) {
  if (!C) return;
  const S = sprites(), t = g.time || 0, f = Math.floor(t * 10) % 40;
  for (const c of C.deer) {
    flee(c, g, t, c.away[0], c.away[1]);
    // graze (head down, chewing), look up, an ear flick; running: head up, bounding
    const lf = Math.floor(t * 10 + c.ph) % 40, n = c.moving ? 2 + ((Math.floor(t * 8) & 1)) : lf < 16 ? ((lf >> 2) & 1) : lf < 28 ? 2 : lf < 31 ? 3 : lf < 34 ? 2 : 0;
    const fl = c.moving ? (c.face || c.flip) : c.flip, s = S.deer[fl][n], bob = c.moving && (Math.floor(t * 8) & 1) ? -1 : 0;
    if (!inHall(c.x, c.y)) list.push({ y: c.y + 1, fn: () => blit(ctx, s, c.x, c.y + bob) });
  }
  for (const c of C.rabbit) {
    flee(c, g, t, c.away[0], c.away[1]);
    const lf = Math.floor(t * 10 + c.ph) % 40, n = c.moving ? 2 + (Math.floor(t * 9) & 1) : lf >= 10 && lf < 16 ? 1 : 0;
    const s = S.rabbit[c.moving ? (c.face || c.flip) : c.flip][n];
    if (!inHall(c.x, c.y)) list.push({ y: c.y + 1, fn: () => blit(ctx, s, c.x, c.y) });
  }
  if (C.squirrel) {
    const c = C.squirrel, lf = Math.floor(t * 10 + c.ph) % 80;   // an 8 s routine: half of it round the back of the trunk
    const near = nearFoe(g, c.x, c.y) < FLEE * FLEE;
    if (!near && lf < 32) {
      const R = lf < 16 ? { n: (lf >> 1) & 1, dy: -4 * (lf >> 2) } : lf < 26 ? { n: 2, dy: -12 } : { n: 3, dy: -12 };
      const s = S.squirrel[R.n];
      list.push({ y: c.y + 0.4, fn: () => blit(ctx, s, c.x, c.y + R.dy / 2) });
    }
  }
  if (C.owl && dusk(g)) {
    const o = C.owl, lf = Math.floor(t * 10) % 60, n = lf === 14 || lf === 15 ? 1 : lf >= 20 && lf < 32 ? 2 : lf === 36 || lf === 37 ? 3 : 0;
    list.push({ y: o.sort, fn: () => blit(ctx, S.owl[n], o.x, o.y) });
  }
  // robins perched (in flight they are drawn over everything, lifeOver)
  for (const b of C.birds) {
    birdState(b, C, g, t);
    if (b.fly) continue;
    const P = C.perches[b.at], s = S.bird[b.flipTo][b.hop ? 2 : 3];
    list.push({ y: P[2] + 0.5, fn: () => blit(ctx, s, P[0], P[1] + 1) });
  }
  // butterflies over the flowers (by day), hidden while a foe is near
  if (!dusk(g)) for (const c of C.bflies) {
    if (nearFoe(g, c.x, c.y) < 50 * 50) continue;
    const tt = t + c.ph * 4, dx = Math.round(13 * Math.sin(TAU * (tt / 4 + c.ph))), dy = Math.round(-9 - 5 * Math.sin(TAU * (tt / 2 + c.ph * 2))), n = Math.floor(tt * 10) % 4;
    list.push({ y: c.y, fn: () => { ctx.save(); ctx.scale(0.5, 0.5); bfly(ctx, Math.round(c.x * 2) + dx, Math.round(c.y * 2) + dy, n); ctx.restore(); } });
  }
  void f;
}
// a robin's day: perched a while, a short flight to the next perch; a foe under its tree sends it off at once
function birdState(b, C, g, t) {
  const P = C.perches;
  if (b.fly) {
    const u = (t - b.fly.t0) / b.fly.dur;
    if (u >= 1 || u < 0) { b.at = b.fly.to; b.fly = null; b.t0 = t; b.perch = 8 + h2(b.at, Math.floor(t), 3) * 8; }
    return;
  }
  const P0 = P[b.at];
  b.hop = Math.floor(t * 10) % 50 === 0;
  const scared = nearFoe(g, P0[3], P0[2]) < FLEE * FLEE;
  if (t < b.t0) b.t0 = t;
  if (t - b.t0 > b.perch || scared) {
    let to = (b.at + 1 + Math.floor(h2(b.at, Math.floor(t), 9) * (P.length - 1))) % P.length;
    if (to === b.at) to = (to + 1) % P.length;
    const Q = P[to];
    b.flipTo = Q[0] >= P0[0] ? 1 : -1;
    b.fly = { from: b.at, to, t0: t, dur: Math.max(1.2, Math.hypot(Q[0] - P0[0], Q[1] - P0[1]) / 90) };
  }
}

// ---- over everything: robins in flight, fireflies at dusk ----
export function lifeOver(ctx, g, C) {
  if (!C) return;
  const S = sprites(), t = g.time || 0;
  for (const b of C.birds) {
    if (!b.fly) continue;
    const A = C.perches[b.fly.from], B = C.perches[b.fly.to], u = Math.min(1, Math.max(0, (t - b.fly.t0) / b.fly.dur));
    const e = u * u * (3 - 2 * u), x = A[0] + (B[0] - A[0]) * e, y = A[1] + (B[1] - A[1]) * e - Math.sin(u * Math.PI) * 18;
    blit(ctx, S.bird[b.flipTo][u > 0.9 ? 2 : Math.floor(t * 12) & 1], x, y);
  }
  if (dusk(g) && C.flies.length) {
    ctx.save(); ctx.scale(0.5, 0.5); ctx.globalCompositeOperation = "lighter";
    const r = rng(77), k1 = moon(g) ? 0.8 : 1;
    for (const [bx, by] of C.flies) {
      const ax = 3 + r() * 6, ay = 2 + r() * 3, p1 = r(), p2 = r(), p3 = r(), per = r() < 0.5 ? 2 : 4, on = 0.28 + r() * 0.12, k0 = (0.6 + r() * 0.4) * k1;
      const x = Math.round(bx * 2 + ax * Math.sin(TAU * (t / 4 + p1))), y = Math.round(by * 2 + ay * Math.sin(TAU * (t / 2 + p2)));
      if (nearFoe(g, bx, by) < 30 * 30) continue;
      const bl = (t / per + p3) % 1; if (bl >= on) continue;
      const k = (bl < 0.07 || bl > on - 0.07 ? 0.45 : 1) * k0;
      ctx.fillStyle = `rgba(150,170,40,${0.26 * k})`; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.fillStyle = `rgba(190,220,80,${0.6 * k})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillStyle = `rgba(250,255,170,${0.95 * k})`; ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
}
