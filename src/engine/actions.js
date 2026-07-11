// ============ GAME ACTIONS ============
// Player-driven and economy operations that mutate the game state `g`:
// placement checks, build / upgrade / evolve / sell, wave start & restart,
// and the shared damage helper. Each takes `g` explicitly.

import { W, H, BLOCK_DIST } from "../data/constants.js";
import { PTS, nearestOnPath } from "./path.js";
import { DECOR } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { WAVES, waveHpMult } from "../data/waves.js";
import { makeTower, syncUnits } from "./towers.js";

export const towerNear = (g, x, y) => g.towers.find((t) => Math.hypot(t.x - x, t.y - y) < 30);

export const buildableAt = (g, x, y) => {
  if (x < 18 || x > W - 18 || y < 22 || y > H - 16) return false;
  if (nearestOnPath(x, y).d < BLOCK_DIST) return false;
  const [cvx, cvy] = PTS[0];
  const [csx, csy] = PTS[PTS.length - 1];
  if (Math.hypot(x - cvx, y - cvy) < 50 || Math.hypot(x - (csx + 6), y - csy) < 62) return false;
  for (const d of DECOR) if (Math.hypot(d.x - x, d.y - y) < 26 * d.s) return false;
  if (towerNear(g, x, y)) return false;
  return true;
};

export const startWave = (g) => {
  if (!g || g.phase !== "build" || g.wave >= WAVES.length) return;
  g.snapshot = {
    wave: g.wave, gold: g.gold, lives: g.lives,
    towers: g.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, level: t.level, branch: t.branch, rank4: t.rank4, invested: t.invested })),
  };
  if (g.buildUntil != null) {
    const rem = Math.max(0, g.buildUntil - g.time);
    const bonus = Math.min(45, Math.ceil(rem * 1.5));
    if (bonus > 0) {
      g.gold += bonus;
      g.effects.push({ type: "coin", x: W / 2, y: 60, ttl: 1100, text: `Early horn! +${bonus}g`, big: true });
    }
    g.buildUntil = null;
  }
  g.wave += 1;
  g.phase = "combat";
  const mult = waveHpMult(g.wave);
  const queue = [];
  let delay = 400;
  for (const [type, count, gap] of WAVES[g.wave - 1]) {
    for (let i = 0; i < count; i++) { queue.push({ type, at: delay, mult }); delay += gap; }
    delay += 900;
  }
  g.spawnQueue = queue;
  g.spawnTimer = 0;
};

export const restartWave = (g) => {
  if (!g || !g.snapshot) return;
  const s = g.snapshot;
  g.wave = s.wave; g.gold = s.gold; g.lives = s.lives;
  g.towers = s.towers.map((td) => makeTower(td.kind, td.x, td.y, td.level, td.branch, td.invested, td.rank4));
  g.enemies = []; g.projectiles = []; g.effects = []; g.spawnQueue = [];
  g.phase = "build"; g.selectedId = null; g.buildMode = null; g.paused = false; g.buildUntil = null;
};

export const placeTower = (g, kind, x, y) => {
  const def = TOWERS[kind];
  if (g.gold < def.cost || !buildableAt(g, x, y)) return;
  g.gold -= def.cost;
  g.towers.push(makeTower(kind, x, y));
  g.buildMode = null;
};

export const upgradeTower = (g, t) => {
  const def = TOWERS[t.kind];
  if (t.branch || t.level >= 3) return;
  const cost = def.levels[t.level].cost;
  if (g.gold < cost) return;
  g.gold -= cost; t.level += 1; t.invested += cost;
  if (t.kind === "knight") { syncUnits(t); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "levelup", x: t.x, y: t.y, ttl: 600 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 700, life: 700, gold: false });
};

export const branchTower = (g, t, key) => {
  const br = TOWERS[t.kind].branches[key];
  if (t.branch || t.level < 3 || g.gold < br.cost) return;
  g.gold -= br.cost; t.branch = key; t.invested += br.cost;
  if (t.kind === "knight") { syncUnits(t); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "evolve", x: t.x, y: t.y, ttl: 900 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 1100, life: 1100, gold: true });
  g.effects.push({ type: "flash", x: t.x, y: t.y - 10, ttl: 450 });
};

// Rank-4 "Final Ascension": a branched tower evolves once more, permanently.
export const ascendTower = (g, t, key) => {
  if (!t.branch || t.rank4) return;
  const r4 = TOWERS[t.kind].branches[t.branch].rank4?.[key];
  if (!r4 || g.gold < r4.cost) return;
  g.gold -= r4.cost; t.rank4 = key; t.invested += r4.cost;
  if (t.kind === "knight") { syncUnits(t); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "evolve", x: t.x, y: t.y, ttl: 900 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 1300, life: 1300, gold: true });
  g.effects.push({ type: "flash", x: t.x, y: t.y - 10, ttl: 550 });
};

export const releaseEnemy = (g, e) => { if (!e) return; e.blockedBy = null; e.engaged = false; };

export const sellTower = (g, t) => {
  if (t.units) for (const u of t.units) { const e = g.enemies.find((x) => x.blockedBy === u.id); releaseEnemy(g, e); }
  g.gold += Math.floor(t.invested * 0.7);
  g.towers = g.towers.filter((x) => x.id !== t.id);
  g.selectedId = null;
};

export const dealDamage = (g, e, amount, dtype, pierce) => {
  let dmg = amount;
  if (dtype === "phys" && !pierce) dmg *= 1 - e.armor;
  e.hp -= dmg;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    g.gold += e.bounty;
    g.effects.push({ type: "coin", x: e.x, y: e.y - 14, ttl: 700, text: `+${e.bounty}` });
    g.effects.push({ type: "poof", x: e.x, y: e.y, ttl: 350 });
  }
};
