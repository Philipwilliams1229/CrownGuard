// ============ GAME ACTIONS ============
// Player-driven and economy operations that mutate the game state `g`:
// placement checks, build / upgrade / evolve / sell, wave start & restart,
// and the shared damage helper. Each takes `g` explicitly.

import { W, H, BLOCK_DIST, WALL_W } from "../data/constants.js";
import { CASTLE_WORKS, emptyWorks, workTier } from "../data/castle.js";
import { PTS, nearestOnPath, posAt, TOTAL_LEN } from "./path.js";
import { DECOR, PONDS, inRiver, decorFootprint } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { waveSpec, waveHpMult } from "../data/waves.js";
import { ENEMIES } from "../data/enemies.js";
import { makeTower, syncUnits, getStats } from "./towers.js";
import { recordFavored, favoredFor } from "../data/profile.js";
import { sfx } from "../audio/sfx.js";

export const towerNear = (g, x, y) => g.towers.find((t) => Math.hypot(t.x - x, t.y - y) < 30);

export const buildableAt = (g, x, y, kind = null) => {
  // A hall that floats has the opposite requirement to every other: it MUST
  // stand in running water, and nothing else may.
  const afloat = !!(kind && TOWERS[kind] && TOWERS[kind].water);
  if (x < 18 || x > W - WALL_W || y < 22 || y > H - 16) return false;
  if (nearestOnPath(x, y).d < BLOCK_DIST) return false;
  const [cvx, cvy] = PTS[0];
  if (Math.hypot(x - cvx, y - cvy) < 50) return false;
  for (const d of DECOR) if (Math.hypot(d.x - x, d.y - y) < decorFootprint(d) + 8) return false;
  for (const p of PONDS) if (Math.abs(x - p.x) < p.w / 2 + 14 && Math.abs(y - p.y) < p.h / 2 + 14) return false;
  if (afloat) { if (!inRiver(x, y, 8)) return false; }   // moor it in the river
  else if (inRiver(x, y, 14)) return false;              // no one else builds in it
  if (towerNear(g, x, y)) return false;
  return true;
};

export const startWave = (g) => {
  if (!g || g.phase !== "build") return;
  g.snapshot = {
    wave: g.wave, gold: g.gold, lives: g.lives,
    towers: g.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, level: t.level, branch: t.branch, rank4: t.rank4, invested: t.invested, aim: t.aim,
      kills: t.kills || 0, dmgOut: t.dmgOut || 0, liveTime: t.liveTime || 0 })),
  };
  if (g.buildUntil != null) {
    const rem = Math.max(0, g.buildUntil - g.time);
    const bonus = Math.min(45, Math.ceil(rem * 1.5));
    if (bonus > 0) {
      g.gold += bonus;
      if (g.run) g.run.goldEarned += bonus;
      g.effects.push({ type: "coin", x: W / 2, y: 60, ttl: 1100, text: `Early horn! +${bonus}g`, big: true });
    }
    g.buildUntil = null;
  }
  g.wave += 1;
  g.phase = "combat";
  const mult = waveHpMult(g.wave);
  const queue = [];
  let delay = 400;
  for (const [type, count, gap] of waveSpec(g.wave)) {
    for (let i = 0; i < count; i++) { queue.push({ type, at: delay, mult }); delay += gap; }
    delay += 900;
  }
  g.spawnQueue = queue;
  g.spawnTimer = 0;
  g.livesAtWaveStart = g.lives;      // the Dragon's Hoard pays only clean waves
  // Minefield Doctrine: the smiths seed the road themselves as the horn blows
  if (!g.traps) g.traps = [];
  for (const t of g.towers) {
    if (t.kind !== "trapsmith") continue;
    const st = getStats(t);
    if (!st.autoSeed) continue;
    let seeded = 0;
    for (let tries = 0; tries < 60 && seeded < st.autoSeed && t.charges > 0; tries++) {
      const d = Math.random() * TOTAL_LEN;
      const [px, py] = posAt(d);
      if (Math.hypot(px - t.x, py - t.y) > st.range) continue;
      if (g.traps.some((tr) => Math.hypot(tr.x - px, tr.y - py) < 8)) continue;
      const floats = !!(st.balloon && ((t.layIdx = (t.layIdx || 0) + 1) % st.balloon === 0));
      g.traps.push({ x: px, y: py, byTower: t.id, branch: t.branch, rank4: t.rank4,
        kind: floats ? "balloon" : (st.trapKind || "spike"), sky: floats });
      t.charges -= 1;
      seeded++;
    }
  }
  sfx.play("horn");
  // Announce it on the board. A wave with a boss in it says so by name —
  // there should never be a moment where a dragon arrives unheralded.
  const champion = queue.map((s) => s.type).find((t) => ENEMIES[t]?.boss);
  g.banner = {
    text: champion ? ENEMIES[champion].name.toUpperCase() : `WAVE ${g.wave}`,
    sub: champion ? "the horde has brought its champion" : null,
    boss: !!champion,
    t0: g.time,
  };
};

export const restartWave = (g) => {
  if (!g || !g.snapshot) return;
  const s = g.snapshot;
  g.wave = s.wave; g.gold = s.gold; g.lives = s.lives;
  g.towers = s.towers.map((td) => {
    const t = makeTower(td.kind, td.x, td.y, td.level, td.branch, td.invested, td.rank4);
    t.aim = td.aim || "first";  // a retried wave keeps the orders you gave
    t.kills = td.kills || 0; t.dmgOut = td.dmgOut || 0; t.liveTime = td.liveTime || 0;
    return t;
  });
  g.enemies = []; g.projectiles = []; g.effects = []; g.spawnQueue = []; g.corpses = []; g.traps = []; g.logs = [];
  g.phase = "build"; g.selectedId = null; g.buildMode = null; g.rallyFor = null; g.paused = false; g.buildUntil = null;
};

export const placeTower = (g, kind, x, y) => {
  const def = TOWERS[kind];
  if (g.gold < def.cost || !buildableAt(g, x, y, kind)) return;
  g.gold -= def.cost;
  g.towers.push(makeTower(kind, x, y));
  if (g.run) g.run.towersBuilt += 1;
  g.buildMode = null;
  sfx.play("place");
  // it lands: a ring of dust off the footings and a knock through the ground
  g.effects.push({ type: "dust", x, y: y + 10, ttl: 380, r: 26 });
  g.shake = Math.max(g.shake, 3);
};

// ---- Master Builds ----
// One click, one finished tower. The plan replays the paths the player last
// chose by hand (per kind, per branch), defaulting to the first of each.
export const masterPlan = (kind, lockBranch = null) => {
  const def = TOWERS[kind];
  const fav = favoredFor(kind);
  const branch = lockBranch || (def.branches[fav.branch] ? fav.branch : "a");
  const br = def.branches[branch];
  const keys = br.rank4 ? Object.keys(br.rank4) : [];
  const pick = fav.rank4?.[branch];
  const rank4 = keys.length ? (keys.includes(pick) ? pick : keys[0]) : null;
  const cost = def.cost + def.levels[1].cost + def.levels[2].cost + br.cost + (rank4 ? br.rank4[rank4].cost : 0);
  return { branch, rank4, cost, name: rank4 ? br.rank4[rank4].name : br.name };
};

// The cheapest possible full build — the "money has gotten crazy" threshold
// past which the Master Builds toggle first shows itself.
export const MASTER_MIN = Math.min(...Object.keys(TOWERS).map((k) => {
  const def = TOWERS[k];
  const br = def.branches.a;
  const r4 = br.rank4 ? br.rank4[Object.keys(br.rank4)[0]].cost : 0;
  return def.cost + def.levels[1].cost + def.levels[2].cost + br.cost + r4;
}));

// Every final form a tower can be bought as, in menu order: each branch's
// two ascensions (or the branch itself where no ascension exists).
export const masterPlans = (kind) => {
  const def = TOWERS[kind];
  const out = [];
  for (const bk of Object.keys(def.branches)) {
    const br = def.branches[bk];
    const base = def.cost + def.levels[1].cost + def.levels[2].cost + br.cost;
    if (br.rank4) {
      for (const rk of Object.keys(br.rank4)) out.push({ branch: bk, rank4: rk, cost: base + br.rank4[rk].cost, name: br.rank4[rk].name });
    } else {
      out.push({ branch: bk, rank4: null, cost: base, name: br.name });
    }
  }
  return out;
};

export const placeMasterTower = (g, kind, x, y, pick = null) => {
  const def = TOWERS[kind];
  let plan = masterPlan(kind);
  if (pick && def.branches[pick.branch]) {
    const br = def.branches[pick.branch];
    const rank4 = br.rank4 ? (br.rank4[pick.rank4] ? pick.rank4 : Object.keys(br.rank4)[0]) : null;
    plan = {
      branch: pick.branch, rank4,
      cost: def.cost + def.levels[1].cost + def.levels[2].cost + br.cost + (rank4 ? br.rank4[rank4].cost : 0),
      name: rank4 ? br.rank4[rank4].name : br.name,
    };
  }
  if (g.gold < plan.cost || !buildableAt(g, x, y, kind)) return;
  g.gold -= plan.cost;
  g.towers.push(makeTower(kind, x, y, 3, plan.branch, plan.cost, plan.rank4));
  // a master purchase is as deliberate as a hand-built one — remember it
  recordFavored(kind, { branch: plan.branch, ...(plan.rank4 ? { rank4: { [plan.branch]: plan.rank4 } } : {}) });
  if (g.run) g.run.towersBuilt += 1;
  g.buildMode = null;
  sfx.play("ascend");
  g.effects.push({ type: "dust", x, y: y + 10, ttl: 380, r: 26 });
  g.effects.push({ type: "evolve", x, y, ttl: 900 });
  g.effects.push({ type: "burst", x, y: y - 12, ttl: 1300, life: 1300, gold: true });
  g.effects.push({ type: "flash", x, y: y - 10, ttl: 550 });
  g.shake = Math.max(g.shake, 4);
};

// Everything a standing tower still lacks, bought in one stroke. A chosen
// branch is respected; whatever is unchosen follows the favored plan.
export const completionCost = (t) => {
  const def = TOWERS[t.kind];
  const plan = masterPlan(t.kind, t.branch);
  let cost = 0;
  for (let l = t.level; l < 3; l++) cost += def.levels[l].cost;
  if (!t.branch) cost += def.branches[plan.branch].cost;
  if (!t.rank4 && plan.rank4) cost += def.branches[plan.branch].rank4[plan.rank4].cost;
  return { ...plan, cost };
};

export const completeTower = (g, t) => {
  if (t.rank4) return;
  const c = completionCost(t);
  if (g.gold < c.cost) return;
  g.gold -= c.cost; t.invested += c.cost;
  t.level = 3; t.branch = t.branch || c.branch; t.rank4 = c.rank4;
  sfx.play("ascend");
  if (t.kind === "knight") { syncUnits(t, g); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "evolve", x: t.x, y: t.y, ttl: 900 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 1300, life: 1300, gold: true });
  g.effects.push({ type: "flash", x: t.x, y: t.y - 10, ttl: 550 });
};

export const upgradeTower = (g, t) => {
  const def = TOWERS[t.kind];
  if (t.branch || t.level >= 3) return;
  const cost = def.levels[t.level].cost;
  if (g.gold < cost) return;
  g.gold -= cost; t.level += 1; t.invested += cost;
  sfx.play("upgrade");
  if (t.kind === "knight") { syncUnits(t, g); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "levelup", x: t.x, y: t.y, ttl: 600 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 700, life: 700, gold: false });
};

export const branchTower = (g, t, key) => {
  const br = TOWERS[t.kind].branches[key];
  if (t.branch || t.level < 3 || g.gold < br.cost) return;
  g.gold -= br.cost; t.branch = key; t.invested += br.cost;
  recordFavored(t.kind, { branch: key });
  sfx.play("evolve");
  if (t.kind === "knight") { syncUnits(t, g); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
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
  recordFavored(t.kind, { rank4: { [t.branch]: key } });
  sfx.play("ascend");
  if (t.kind === "knight") { syncUnits(t, g); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "evolve", x: t.x, y: t.y, ttl: 900 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 1300, life: 1300, gold: true });
  g.effects.push({ type: "flash", x: t.x, y: t.y - 10, ttl: 550 });
};

export const releaseEnemy = (g, e) => { if (!e) return; e.blockedBy = null; e.engaged = false; };

export const sellTower = (g, t) => {
  if (t.units) for (const u of t.units) { const e = g.enemies.find((x) => x.blockedBy === u.id); releaseEnemy(g, e); }
  if (t.eagle) releaseEnemy(g, g.enemies.find((x) => x.blockedBy === t.eagle.id));
  g.gold += Math.floor(t.invested * 0.7);
  sfx.play("sell");
  g.towers = g.towers.filter((x) => x.id !== t.id);
  g.selectedId = null;
};

// which of the fallen a necromancer can call back
const CORPSE_TYPES = new Set(["goblin", "wolf", "orc"]);

// `tick` marks the slow bleed of fire, poison and standing in lava — it is
// passed so that shields can tell a blow from a burn.
// `srcId` is the tower that owns this damage, so a long run can be read back
// as a ledger: who actually earned their footprint and who was decoration.
export const dealDamage = (g, e, amount, dtype, pierce, tick, srcId) => {
  let dmg = amount;
  // Raised shields and chaplain wards swallow one discrete blow apiece, whole,
  // however big it was. A hail of small arrows is exactly what they're for —
  // and exactly why one heavy stone beats twenty needles here.
  if (!tick && e.guard > 0) {
    e.guard -= 1;
    e.guardFlash = g.time * 1000 + 300;
    dmg = Math.min(dmg, 1);
    sfx.play("tink");
  }
  const tmsD = g.time * 1000;
  // a falconer's mark: everything hits the marked harder
  if (e.markUntil > tmsD) dmg *= 1 + (e.markAmp || 0);
  // a marshal's banner hardens everything marching under it; marks and
  // alchemy strip it back off
  const shred = (e.markUntil > tmsD ? e.markShredAmt || 0 : 0) + (e.shredAura || 0);
  const armor = Math.min(0.85, Math.max(0, e.armor - shred + (e.bannerArmor || 0)));
  if (dtype === "phys" && !pierce) dmg *= 1 - armor;
  // rune wards: magic fizzles against warded foes
  if (dtype === "magic") dmg *= 1 - (e.mres || 0);
  // Permafrost brittleness: frozen-through flesh takes extra physical damage
  if (dtype === "phys" && e.brittleUntil > g.time * 1000) dmg *= 1 + (e.brittleAmp || 0.35);
  // credit the ledger before the body falls, so the killing blow counts
  const credited = Math.max(0, Math.min(dmg, e.hp));
  const src = srcId != null && g._towerById ? g._towerById.get(srcId) : null;
  if (src) src.dmgOut = (src.dmgOut || 0) + credited;
  e.hp -= dmg;
  // brief white flash on solid hits (DoT ticks are too small to strobe)
  if (dmg >= 3) e.hitFlash = g.time * 1000 + 110;
  if (e.hp <= 0 && !e.dead) {
    if (src) src.kills = (src.kills || 0) + 1;
    e.dead = true;
    // a transmuter's aura makes every nearby death pay better
    let pay = e.bounty;
    for (const tw of g.towers) {
      if (tw.kind !== "goldworks" || tw.branch !== "b") continue;
      const stB = getStats(tw);
      if (stB.bountyAura && Math.hypot(tw.x - e.x, tw.y - e.y) <= stB.auraRange) {
        pay = Math.max(pay, Math.ceil(e.bounty * (1 + stB.bountyAura)));
      }
    }
    e.bounty = pay;
    g.gold += e.bounty;
    sfx.play("crunch");
    sfx.play("coin");
    if (g.run) { g.run.kills += 1; g.run.goldEarned += e.bounty; }
    g.effects.push({ type: "coin", x: e.x, y: e.y - 14, ttl: 700, text: `+${e.bounty}` });
    // death animation: flash white, then crumble into pixels — a mixed-party
    // foe crumbles in the look it actually wore
    g.effects.push({ type: "death", etype: e.sprite || e.type, x: e.x, y: e.y, face: e.face, ttl: 550, life: 550, revived: !!e.revived });
    // the fallen linger a moment — a necromancer may call them back (once)
    if (!e.revived && CORPSE_TYPES.has(e.type)) {
      if (!g.corpses) g.corpses = [];
      g.corpses.push({ type: e.type, sprite: e.sprite, x: e.x, y: e.y, dist: e.dist, lane: e.lane, hp0: e.maxHp, until: g.time * 1000 + 12000 });
      if (g.corpses.length > 50) g.corpses.shift();
    }
  }
};


// ---- castle works ----
// Buy the next tier of a work on the castle. Returns the tier bought, or null.
export const buyCastleWork = (g, key) => {
  if (!g || !CASTLE_WORKS[key]) return null;
  g.castle = g.castle || emptyWorks();
  const n = g.castle[key] || 0;
  const next = CASTLE_WORKS[key].tiers[n];
  if (!next || g.gold < next.cost) return null;
  g.gold -= next.cost;
  g.castle[key] = n + 1;
  // a thicker gate is thicker at once
  const before = workTier({ ...g.castle, [key]: n }, key)?.hp || 0;
  if ((next.hp || 0) > before) g.lives += next.hp - before;
  const [gx, gy] = PTS[PTS.length - 1];
  g.effects.push({ type: "evolve", x: gx + 10, y: gy, ttl: 900 });
  g.effects.push({ type: "coin", x: gx - 30, y: gy - 30, ttl: 1200, text: `${CASTLE_WORKS[key].name} — ${next.label}` });
  return next;
};
