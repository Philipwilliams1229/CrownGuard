// ============ PRE-BAKING A LEVEL'S RIGS ============
// A rig's frames bake on first sight (rigs.js rigFrame), and a supersampled
// bake (paint.js STYLE.ss) costs about twenty milliseconds a frame, so a
// level pre-bakes the rigs its waves will send, one frame a tick, from the
// moment it starts: the build phase is the player reading the board, and a
// creature then walks out of the wood already drawn. The hero's rig too.
// Whatever this misses (a raised foe, a sandbox summon, a hall's men) still
// bakes on sight, as before. A new level's list replaces the last one's.
import { RIGS, hasRig, rigFrame } from "./rigs.js";
import { CROWN_FIGHT_FRAMES } from "./rigs-crown.js";
import { ENEMIES } from "../data/enemies.js";
import { waveSpec, scriptedWaves } from "../data/waves.js";

const WARM_WAVES = 30;   // Free Play scripts can run long; the first thirty waves' rigs are plenty
let queue = [], timer = 0, gen = 0;

const framesOf = (t) => {
  const n = RIGS[t]?.fightN === 4 || CROWN_FIGHT_FRAMES?.[t] === 4 ? 4 : 2;
  const out = [];
  for (let f = 0; f < 4; f++) out.push([t, "walk", f]);
  for (let f = 0; f < n; f++) out.push([t, "fight", f]);
  return out;
};

// Bake these rigs' walk and fight sheets, one frame a timeout tick.
export const warmRigs = (types) => {
  const seen = new Set();
  queue = [];
  for (const t of types) if (t && !seen.has(t) && hasRig(t)) { seen.add(t); queue.push(...framesOf(t)); }
  const my = ++gen;
  clearTimeout(timer);
  const step = () => {
    if (my !== gen) return;
    const it = queue.shift();
    if (!it) return;
    try { rigFrame(...it); } catch (e) { console.warn("warmRigs", it[0], e.message); }
    if (queue.length) timer = setTimeout(step, 0);
  };
  timer = setTimeout(step, 0);
};

// The rigs a level's waves will send: every group's type, the looks it is
// picked from, what it comes apart into, the skin its death crumbles in,
// what it summons, and the hull a landing party sails in.
export const rosterRigs = () => {
  const out = new Set();
  const add = (t) => { if (t && hasRig(t)) out.add(t); };
  const addType = (t) => {
    const d = ENEMIES[t];
    add(t);
    if (!d) return;
    if (d.variants) for (const v of d.variants) add(v.sprite);
    if (d.splitInto) add(d.splitInto[0]);
    add(d.deathSkin); add(d.summonType);
  };
  const n = Math.min(WARM_WAVES, scriptedWaves() || 0);
  for (let w = 1; w <= n; w++) {
    let spec;
    try { spec = waveSpec(w); } catch { continue; }
    for (const g of spec) { addType(g[0]); if (g.ship) add(g.ship); }
  }
  return [...out];
};
