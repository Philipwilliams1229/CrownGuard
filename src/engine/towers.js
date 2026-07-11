// ============ TOWER LOGIC ============
// Resolving a tower's active stats (by level or branch), positioning its
// knight units, keeping the unit roster in sync, and creating new towers.

import { TOWERS } from "../data/towers.js";
import { nextId } from "./ids.js";

// The active stats for a tower: its rank-4 form if ascended, else its branch
// stats if evolved, else its level stats.
export const getStats = (t) => {
  const def = TOWERS[t.kind];
  if (t.branch) {
    const b = def.branches[t.branch];
    const src = t.rank4 && b.rank4 ? b.rank4[t.rank4].stats : b.stats;
    return { ...src, dtype: src.magic ? "magic" : def.dtype };
  }
  return { ...def.levels[t.level - 1], dtype: def.dtype };
};

// World positions where a garrison's knights stand, around its rally flag.
export const unitSlots = (t) => {
  const n = getStats(t).count || 1;
  const base = [[0, -11], [-14, 3], [14, 3], [0, 15]];
  return base.slice(0, n).map(([dx, dy]) => [t.rally.x + dx, t.rally.y + dy]);
};

// Ensure a garrison has the right number of knight units, and refresh their max HP.
export const syncUnits = (t) => {
  const st = getStats(t);
  const n = st.count || 1;
  if (!t.units) t.units = [];
  while (t.units.length < n) {
    const slots = unitSlots(t);
    const i = t.units.length;
    t.units.push({ id: nextId(), hp: st.hp, maxHp: st.hp, x: slots[i][0], y: slots[i][1], state: "rally", targetId: null, atkCd: 0, respawn: 0, face: 1, swing: 0, healGlow: 0, atkBuff: 0, shield: false, shieldCd: 0, frenzy: 0 });
  }
  for (const u of t.units) { u.maxHp = st.hp; if (u.state !== "dead") u.hp = Math.min(u.hp, u.maxHp); }
};

// Build a fresh tower object; knights also muster a rally point south of the hall.
export const makeTower = (kind, x, y, level = 1, branch = null, invested = null, rank4 = null) => {
  const t = {
    id: nextId(), kind, x, y, level, branch, rank4, cd: 0,
    invested: invested ?? TOWERS[kind].cost, lastAim: -Math.PI / 2, anim: 0, shotIdx: 0, critIdx: 0,
  };
  if (kind === "knight") {
    // knights muster just south of their hall by default
    t.rally = { x, y: y + 28 };
    syncUnits(t);
  }
  return t;
};
