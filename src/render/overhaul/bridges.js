// the overhaul: bridges (see art/briefs/overhaul-build-millrace.md). Registers its OVH slots at load.
//
// Which kind where (Millrace, measured at load from terrain.js BRIDGES, never changed):
//   the Foxwater's across span (the wider river)       -> the TOLL trestle (hut, bar, lanterns, banners)
//   the race's across span                             -> the MILL trestle with its sluice upstream
//   any span running up the screen (the race's skew)   -> the FARM trestle (post and rail, no lamps)
// The engine spans (d0 / d1) stay as they are; each drawn span runs on R units of ramp onto land at
// both ends (bridge-bake.js planSpan), and deckLift / drawnSpans follow the drawn plateau.
//
// Slots: bridgesBack (the back layers, the wakes, lamps noted at night), bridgeFronts (the standing
// pieces sorted with the actors: rails, posts, the hut, the sluice; flames, banners, falls live),
// deckLift (the plateau: walkers, builders), drawnSpans (puddles and floods stay off the ramps too).
// The thrown shadow is baked into each back layer (cast from the span's own members, dithered rim),
// so today's bridge cast is off (OVH.flags.bridgeCast = false); bridgeShadowExtras() is [] for that.
// ovhBridgePiers(): every foot standing in the water, for the water's painter (as bridge.js bridgePiers).
//
// Cost: three spans bake ~0.6 MB (a fresh bake on each sun: onDay drops them); a frame blits ~3
// canvases a span plus a few pixels for wakes, flames, banners and falls.

import { register, OVH } from "./index.js";
import { BRIDGES, RIVERS, riverPast } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { DAY, onDay } from "../../data/sun.js";
import { nightOn, noteLamp } from "../nightlight.js";
import { prefs } from "../../data/prefs.js";
import { planSpan, bakeSpan, LAMP } from "./bridge-bake.js";

OVH.flags.bridgeCast = false;

// ---- the plan: one per realm load (BRIDGES is rebuilt by regenTerrain on every select) -------------
let PLAN = null, PLAN_KEY = null;
const plans = () => {
  const key = BRIDGES.length ? `${REALM.id}|${BRIDGES.map((b) => `${b.x},${b.y},${b.a},${b.d0},${b.d1}`).join(";")}` : REALM && REALM.id;
  if (PLAN && PLAN_KEY === key) return PLAN;
  PLAN_KEY = key;
  PLAN = BRIDGES.map((b) => {
    const up = Math.abs(Math.sin(b.a)) > 0.7;
    const rv = RIVERS.find((r) => riverPast(r, b.x, b.y) < 0);
    const kind = up ? "farm" : rv && rv.w >= 24 ? "toll" : "mill";
    return planSpan(b, kind);
  });
  SPR.clear();
  return PLAN;
};

// ---- the bakes, one per span and sun ---------------------------------------------------------------
const SPR = new Map();
onDay(() => SPR.clear());
const spriteOf = (pl, k) => {
  const key = `${PLAN_KEY}|${k}|${DAY.id}`;
  let s = SPR.get(key);
  if (!s) { s = bakeSpan(pl); SPR.set(key, s); }
  return s;
};
export const bridgeMB = () => { let n = 0; for (const s of SPR.values()) n += s.bytes; return n / 1048576; };

let NOW = 0;
const NIGHT = () => nightOn(NOW) && prefs.spellLight !== false;

// ---- the slots -------------------------------------------------------------------------------------
register("bridgesBack", (ctx, g) => {
  NOW = g.time;
  const P = plans(), night = NIGHT();
  P.forEach((pl, k) => {
    const s = spriteOf(pl, k), B = s.back;
    ctx.drawImage(B.cv, B.x0, B.y0, B.w, B.h);
    // the white water at each foot: an upstream lip and a broken tongue slipping downstream
    const [fx, fy] = pl.flow;
    for (const f of s.feet) {
      const ph = (g.time * 1.1 + f.x * 0.37 + f.y * 0.11) % 1;
      ctx.fillStyle = "rgba(220,236,236,0.7)";
      ctx.fillRect(Math.round((f.x - fx * 1.2) * 2) / 2 - 0.5, Math.round((f.y - fy * 1.2) * 2) / 2, 1, 0.5);
      for (let n = 0; n < 3; n++) {
        const t = (ph + n / 3) % 1, d = 1 + t * 5, a = 0.75 * (1 - t);
        if (a < 0.08) continue;
        ctx.fillStyle = `rgba(238,246,242,${a.toFixed(2)})`;
        ctx.fillRect(Math.round((f.x + fx * d - fy * (n - 1) * 0.5) * 2) / 2, Math.round((f.y + fy * d + fx * (n - 1) * 0.3) * 2) / 2, t < 0.4 ? 1 : 0.5, 0.5);
      }
    }
    if (night) {
      for (const l of s.lamps) noteLamp(l.x, l.y, 13, "#ffb84a", 0.75, 7);
      if (s.hutWin) noteLamp(s.hutWin.x, s.hutWin.y + 2, 9, "#ffb84a", 0.5, 3);
    }
  });
});

// the flame in a lantern: a 4-frame flicker, each lamp on its own beat
const flame = (ctx, l, t) => {
  const k = Math.floor(t * 8 + l.x * 0.37) & 3, x = Math.round(l.x * 2) / 2, y = Math.round(l.y * 2) / 2;
  ctx.fillStyle = "#ffd27a"; ctx.fillRect(x - 0.75, y - 1.25, 1.5, 2.5);
  ctx.fillStyle = "#fff6d8"; ctx.fillRect(x - 0.25, y - (k === 2 ? 0.75 : 0.25), 0.5, k === 2 ? 1 : 0.5);
  if (k === 1) { ctx.fillStyle = "#ffb048"; ctx.fillRect(x - 0.75, y - 1.25, 0.5, 0.5); }
  if (k === 3) { ctx.fillStyle = "#ffe6a8"; ctx.fillRect(x + 0.25, y - 1.25, 0.5, 0.5); }
};
// a sluice's fall: white sheets pouring down, the churn at the foot
const fall = (ctx, f, t) => {
  const w = f.x1 - f.x0, h = f.y1 - f.y0, off = (t * 10) % 1.5;
  ctx.fillStyle = "rgba(170,214,222,0.45)"; ctx.fillRect(f.x0, f.y0, w, h);
  ctx.fillStyle = "rgba(244,250,246,0.75)";
  for (let x = f.x0; x < f.x1 - 0.25; x += 0.5) {
    const ph = (off + ((x * 7.3) | 0) % 3 * 0.5) % 1.5;
    for (let y = f.y0 + ph; y < f.y1; y += 1.5) ctx.fillRect(x, y, 0.5, 0.5);
  }
  const k = Math.floor(t * 6) % 3;
  ctx.fillStyle = "rgba(244,250,246,0.85)";
  for (let x = f.x0 - 0.5; x < f.x1 + 0.5; x += 0.5) if ((((x * 2) | 0) + k) % 3) ctx.fillRect(x, f.y1 + (((x * 4) | 0) % 2) * 0.5, 0.5, 0.5);
};

register("bridgeFronts", (list, ctx) => {
  const P = plans(), t = NOW, night = NIGHT();
  P.forEach((pl, k) => {
    const s = SPR.get(`${PLAN_KEY}|${k}|${DAY.id}`) || spriteOf(pl, k);
    for (const f of s.front) list.push({ y: f.key, fn: () => {
      ctx.drawImage(f.cv, f.x0, f.y0, f.w, f.h);
      // the live bits that hang on this piece (found by position: they were noted while it was baked)
      for (const l of s.lamps) if (inBox(f, l.x, l.y)) { if (l.lit || night) flame(ctx, l, t); }
      for (const bn of s.banners) if (inBox(f, bn.x, bn.y)) {
        const cv = bn.frames[Math.floor(t * 4 + bn.x * 0.13) & 3];
        ctx.drawImage(cv, bn.flip < 0 ? bn.x - cv.width / 2 + 0.5 : bn.x - 0.5, bn.y, cv.width / 2, cv.height / 2);
      }
      for (const fl of s.falls) if (inBox(f, (fl.x0 + fl.x1) / 2, fl.y0)) fall(ctx, fl, t);
      if (s.hutWin && night && inBox(f, s.hutWin.x, s.hutWin.y)) { ctx.fillStyle = "#ffcf6a"; ctx.fillRect(s.hutWin.x - 1.25, s.hutWin.y - 0.75, 2.5, 1.5); }
    } });
  });
});
const inBox = (f, x, y) => x >= f.x0 && x <= f.x0 + f.w && y >= f.y0 && y <= f.y0 + f.h;

// the plateau: a figure at (x, y) on a drawn deck (ramps included) is raised by its profile
register("deckLift", (x, y) => {
  for (const pl of plans()) {
    const b = pl.b, dx = x - b.x, dy = y - b.y, u = dx * pl.Fr.c + dy * pl.Fr.s, v = -dx * pl.Fr.s + dy * pl.Fr.c;
    if (u > pl.lo && u < pl.hi && Math.abs(v) < pl.hw + 3) return pl.z(u);
  }
  return 0;
});

// the decks as drawn, ramps and all: [{ x, y, a, d0, d1 }] (centre moved along the road)
register("drawnSpans", () => plans().map((pl) => {
  const b = pl.b, m = (pl.lo + pl.hi) / 2, mid = (b.d0 + b.d1) / 2;
  return { ...b, x: b.x + m * pl.Fr.c, y: b.y + m * pl.Fr.s, d0: mid + pl.lo, d1: mid + pl.hi };
}));

// the thrown shadow is baked into the back layers: nothing for the ground layer's cast
export const bridgeShadowExtras = () => [];
// every foot standing in the water: [{ x, y, r, kind: "pile" | "wall", bridge }] on the ground plane
export const ovhBridgePiers = () => {
  const out = [];
  plans().forEach((pl, k) => { for (const f of spriteOf(pl, k).feet) out.push({ x: f.x, y: f.y, r: f.r, kind: f.wall ? "wall" : "pile", bridge: k }); });
  return out;
};
// where the toll hut stands (for the lead's build blocks): [{ x, y, rx, ry }] board units
export const bridgeBlocks = () => plans().filter((pl) => pl.sp.hut).map((pl) => {
  const [x, y] = pl.Fr.at(pl.hi - 0.5, -(pl.hw + 14.5), 0);
  return { x, y, rx: 9, ry: 7 };
});
export { LAMP };
