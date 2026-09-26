// ============ GAME ACTIONS ============
// Player-driven and economy operations that mutate the game state `g`:
// placement checks, build / upgrade / evolve / sell, wave start & restart,
// and the shared damage helper. Each takes `g` explicitly.

import { W, H, BLOCK_DIST, WALL_W, LANE_OFF } from "../data/constants.js";
import { CASTLE_WORKS, emptyWorks, workTier, nextWork } from "../data/castle.js";
import { MILITIA, HEROES, heroStats, heroAbilities, killXp, KILL_NEAR } from "../data/bands.js";
import { PTS, nearestOnPath, posAt, angleAt, TOTAL_LEN } from "./path.js";
import { DECOR, PONDS, inRiver, inSea, seaDepthAt, decorFootprint } from "../data/terrain.js";
import { TOWERS } from "../data/towers.js";
import { waveSpec, waveHpMult, CROWD_WEIGHT } from "../data/waves.js";
import { ENEMIES } from "../data/enemies.js";
import { makeTower, syncUnits, getStats } from "./towers.js";
import { nextId } from "./ids.js";
import { recordFavored, favoredFor } from "../data/profile.js";
import { sfx } from "../audio/sfx.js";

export const towerNear = (g, x, y) => g.towers.find((t) => Math.hypot(t.x - x, t.y - y) < 30);
// How far a hall's footing reaches from its anchor; two halls stand at least
// their two reaches apart (15 + 15 = 30 for most; a Bladewheel is narrower).
const reachOf = (kind) => (TOWERS[kind] && TOWERS[kind].reach) || 15;

// The open water of a pond a boat can use: inside its ellipse, clear of the
// reedy margin; lava pools and frozen tarns don't count.
export const pondAt = (x, y) => PONDS.find((p) => p.t !== "lava" && p.t !== "ice" && p.w >= 50
  && ((x - p.x) / (p.w / 2 - 8)) ** 2 + ((y - p.y) / (p.h / 2 - 6)) ** 2 <= 1);

export const buildableAt = (g, x, y, kind = null) => {
  // A hall that floats has the opposite requirement to every other: it MUST
  // stand in running water, and nothing else may.
  const afloat = !!(kind && TOWERS[kind] && TOWERS[kind].water);
  const clear = (kind && TOWERS[kind] && TOWERS[kind].roadClear) || BLOCK_DIST;
  // (a hall's own footing is ~18 wide, so it stops short of the wall's drums)
  if (x < 18 || x > W - WALL_W - 12 || y < 22 || y > H - 16) return false;
  if (nearestOnPath(x, y).d < clear) return false;
  const [cvx, cvy] = PTS[0];
  if (Math.hypot(x - cvx, y - cvy) < 50) return false;
  for (const d of DECOR) if (Math.hypot(d.x - x, d.y - y) < decorFootprint(d) + 8) return false;
  // A floating hall moors in ANY water — a river, a pond or mere big enough
  // to row in (not lava, not ice), or just off a coast. Everyone else keeps off it.
  if (afloat) { if (!inRiver(x, y, 8) && !pondAt(x, y) && !(seaDepthAt(x, y) > 6)) return false; }
  else {
    for (const p of PONDS) if (Math.abs(x - p.x) < p.w / 2 + 14 && Math.abs(y - p.y) < p.h / 2 + 14) return false;
    if (inRiver(x, y, 14)) return false;
  }
  // the sea takes nothing but the River Watch; the beach is honest ground
  if (!afloat && inSea(x, y, 14)) return false;
  const r = reachOf(kind);
  if (g.towers.some((t) => Math.hypot(t.x - x, t.y - y) < r + reachOf(t.kind))) return false;
  return true;
};

export const startWave = (g) => {
  if (!g || g.phase !== "build") return;
  g.snapshot = {
    wave: g.wave, gold: g.gold, lives: g.lives,
    towers: g.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, level: t.level, branch: t.branch, rank4: t.rank4, invested: t.invested, aim: t.aim,
      kills: t.kills || 0, dmgOut: t.dmgOut || 0, liveTime: t.liveTime || 0 })),
    // the castle's works and the hero as they stood; the militia goes home
    castle: g.castle ? { ...g.castle } : null,
    castleRanks: g.castleRanks ? { ...g.castleRanks } : null,
    militiaCd: g.militiaCd || 0,
    hero: (() => { const b = g.bands?.find((x) => x.kind === "hero"); return b ? { key: b.hero, level: b.level, xp: b.xp, talents: { ...(b.talents || {}) }, rally: { ...b.rally }, abCd: { ...(b.abCd || {}) } } : null; })(),
  };
  if (g.buildUntil != null) {
    const rem = Math.max(0, g.buildUntil - g.time);
    const bonus = Math.min(25, Math.ceil(rem * 1.0));
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
  const spec = waveSpec(g.wave);
  const ov = spec.overlap || 0;
  for (const [type, count, gap, pay = 1] of spec) {
    const start = delay;
    for (let i = 0; i < count; i++) { queue.push({ type, at: delay, mult, pay }); delay += gap; }
    // the next group sets out before this one is done, deep in the war —
    // but only rank and file stream in together; the trolls, shamans and
    // warchiefs still get a road to themselves, so a wall stays readable
    const o = (CROWD_WEIGHT[type] ?? 0) >= 0.4 ? ov : 0;
    delay = start + (delay - start) * (1 - o) + 900 * (1 - o);
  }
  queue.sort((p, q) => p.at - q.at);
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
      // any of the three lanes, like the smith's own laying (update.js)
      const lo = (Math.floor(Math.random() * 3) - 1) * LANE_OFF, na = angleAt(d) + Math.PI / 2;
      const [rx, ry] = posAt(d);
      const px = rx + Math.cos(na) * lo, py = ry + Math.sin(na) * lo;
      if (Math.hypot(px - t.x, py - t.y) > st.range) continue;
      if (g.traps.some((tr) => Math.hypot(tr.x - px, tr.y - py) < 8)) continue;
      const floats = !!(st.balloon && ((t.layIdx = (t.layIdx || 0) + 1) % st.balloon === 0));
      g.traps.push({ x: px, y: py, a: angleAt(d), byTower: t.id, branch: t.branch, rank4: t.rank4,
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
  if (s.castle) g.castle = { ...s.castle };
  g.castleRanks = s.castleRanks ? { ...s.castleRanks } : g.castleRanks && {};
  g.militiaCd = s.militiaCd || 0;
  // the hero comes back as the wave found him: level, xp, and his abilities
  // still recharging, so a restart can't refill them
  g.bands = [];
  g.volleys = [];
  if (s.hero) {
    const b = fieldHero(g, s.hero.key, s.hero.level, s.hero.rally.x, s.hero.rally.y, s.hero.talents);
    if (b) { b.xp = s.hero.xp; b.abCd = { ...(s.hero.abCd || {}) }; }
  }
  g.phase = "build"; g.selectedId = null; g.buildMode = null; g.rallyFor = null; g.paused = false; g.buildUntil = null;
};

// Mark a tower as just raised or reworked, for the build animation
// (render/buildanim.js): when, how ("build" | "level" | "branch" | "ascend"),
// and the form it had before, so the art can grow out of the old one. Visual
// only — the tower works from the instant it is bought.
const markRaised = (g, t, how, prev = null) => { t.raised = { at: g.time || 0, how, prev }; };
const formOf = (t) => ({ level: t.level, branch: t.branch, rank4: t.rank4 });

export const placeTower = (g, kind, x, y) => {
  const def = TOWERS[kind];
  if (g.gold < def.cost || !buildableAt(g, x, y, kind)) return;
  g.gold -= def.cost;
  g.towers.push(makeTower(kind, x, y));
  markRaised(g, g.towers[g.towers.length - 1], "build");
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
  markRaised(g, g.towers[g.towers.length - 1], "build");
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
  const prevC = formOf(t);
  t.level = 3; t.branch = t.branch || c.branch; t.rank4 = c.rank4;
  markRaised(g, t, "ascend", prevC);
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
  const prevL = formOf(t);
  g.gold -= cost; t.level += 1; t.invested += cost;
  markRaised(g, t, "level", prevL);
  sfx.play("upgrade");
  if (t.kind === "knight") { syncUnits(t, g); for (const u of t.units) if (u.state !== "dead") u.hp = u.maxHp; }
  g.effects.push({ type: "levelup", x: t.x, y: t.y, ttl: 600 });
  g.effects.push({ type: "burst", x: t.x, y: t.y - 12, ttl: 700, life: 700, gold: false });
};

export const branchTower = (g, t, key) => {
  const br = TOWERS[t.kind].branches[key];
  if (t.branch || t.level < 3 || g.gold < br.cost) return;
  const prevB = formOf(t);
  g.gold -= br.cost; t.branch = key; t.invested += br.cost;
  markRaised(g, t, "branch", prevB);
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
  const prevR = formOf(t);
  g.gold -= r4.cost; t.rank4 = key; t.invested += r4.cost;
  markRaised(g, t, "ascend", prevR);
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
    // the hero learns only from deaths: his own kills in full, and a share
    // of any that fall within a few strides of him (bands.js killXp)
    {
      const hb = g.bands?.find((b) => b.kind === "hero");
      const hu = hb?.units[0];
      if (hb && (src === hb || (hu && hu.state !== "dead" && Math.hypot(hu.x - e.x, hu.y - e.y) < KILL_NEAR))) hb.xp = (hb.xp || 0) + killXp(e, src === hb);
    }
    e.dead = true;
    // a transmuter's aura makes every nearby death pay better — in fractions,
    // carried over, so a one-coin goblin in the aura pays 1.25 and not 2
    let pay = e.bounty;
    for (const tw of g.towers) {
      if (tw.kind !== "goldworks" || tw.branch !== "b") continue;
      const stB = getStats(tw);
      if (stB.bountyAura && Math.hypot(tw.x - e.x, tw.y - e.y) <= stB.auraRange) {
        pay = Math.max(pay, e.bounty * (1 + stB.bountyAura));
      }
    }
    g.goldCarry = (g.goldCarry || 0) + pay;
    e.bounty = Math.floor(g.goldCarry);
    g.goldCarry -= e.bounty;
    g.gold += e.bounty;
    sfx.play("crunch");
    sfx.play("coin");
    if (g.run) { g.run.kills += 1; g.run.goldEarned += e.bounty; }
    // A crowd pays a coin or two a head; a "+1" over every goblin would bury
    // the road in numbers. Small purses are tallied and shown as one sum
    // every few kills; a fat one (a troll, a warchief) still shows at once.
    const tms = g.time * 1000;
    if (e.bounty >= 5) g.effects.push({ type: "coin", x: e.x, y: e.y - 14, ttl: 700, text: `+${e.bounty}` });
    else if (e.bounty > 0) {
      const t = g.coinTally || (g.coinTally = { sum: 0, n: 0, t0: tms });
      t.sum += e.bounty; t.n += 1;
      if (t.n >= 6 || tms - t.t0 > 450) {
        g.effects.push({ type: "coin", x: e.x, y: e.y - 14, ttl: 700, text: `+${t.sum}` });
        g.coinTally = { sum: 0, n: 0, t0: tms };
      }
    }
    // death animation: flash white, then crumble into pixels — a mixed-party
    // foe crumbles in the look it actually wore. When the road is already
    // littered with crumbling bodies, the rest just flash and puff: a
    // hundred-goblin rout must not cost a hundred thousand pixels a frame.
    let dying = 0;
    for (const fx of g.effects) if (fx.type === "death" && !fx.lite) dying++;
    g.effects.push({ type: "death", etype: e.sprite || e.type, x: e.x, y: e.y, face: e.face, ttl: 550, life: 550, revived: !!e.revived, lite: dying >= 16 && !e.boss });
    // the fallen linger a moment — a necromancer may call them back (once)
    if (!e.revived && CORPSE_TYPES.has(e.type)) {
      if (!g.corpses) g.corpses = [];
      g.corpses.push({ type: e.type, sprite: e.sprite, x: e.x, y: e.y, dist: e.dist, lane: e.lane, hp0: e.maxHp, until: g.time * 1000 + 12000 });
      if (g.corpses.length > 50) g.corpses.shift();
    }
  }
};


// ---- castle works ----
// The next tier of a work and what it costs, or null when it is complete.
export const nextCastleWork = (g, key) => {
  if (!g || !CASTLE_WORKS[key]) return null;
  return nextWork(g.castle, key, g.castleRanks, !!g.freeplay);
};
// Raise the next tier. The caller has already paid — from the treasury in
// the campaign, from the purse in free play.
export const raiseCastleWork = (g, key) => {
  const next = nextCastleWork(g, key);
  if (!next) return null;
  g.castle = g.castle || emptyWorks();
  const before = workTier(g.castle, key, g.castleRanks)?.hp || 0;
  // an endless rank is the run's own; a tier is the castle's
  if (next.rank) { g.castleRanks = { ...(g.castleRanks || {}), [key]: next.rank }; }
  else g.castle[key] = (g.castle[key] || 0) + 1;
  // a thicker gate is thicker at once
  if ((next.hp || 0) > before) g.lives += next.hp - before;
  const [gx, gy] = PTS[PTS.length - 1];
  g.effects.push({ type: "evolve", x: gx + 10, y: gy, ttl: 900 });
  g.effects.push({ type: "coin", x: gx - 30, y: gy - 30, ttl: 1200, text: `${CASTLE_WORKS[key].name} — ${next.label}` });
  return next;
};
// Free Play: pay from the purse and raise it.
export const buyCastleWork = (g, key) => {
  const next = nextCastleWork(g, key);
  if (!next || g.gold < next.cost) return null;
  g.gold -= next.cost;
  return raiseCastleWork(g, key);
};

// ---- bands ----
// Call the militia to a spot: two farmers, for a while, for nothing.
export const callMilitia = (g, x, y) => {
  if (!g || (g.militiaCd || 0) > 0) return false;
  if (!g.bands) g.bands = [];
  const id = nextId();
  const units = [];
  for (let i = 0; i < MILITIA.count; i++) {
    units.push({ id: nextId(), hp: MILITIA.hp, maxHp: MILITIA.hp, x: x + (i ? 12 : -12), y: y + 6, face: 1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null });
  }
  g.bands.push({ id, kind: "militia", st: { ...MILITIA }, rally: { x, y }, units, life: MILITIA.life });
  g.militiaCd = MILITIA.cooldown;
  g.effects.push({ type: "levelup", x, y, ttl: 500 });
  g.effects.push({ type: "dust", x, y: y + 6, ttl: 400 });
  return true;
};

// Put the hero on the field at the level's start.
export const fieldHero = (g, key, level = 1, x, y, talents = {}, xp = 0) => {
  const h = HEROES[key];
  if (!h || !g) return null;
  if (!g.bands) g.bands = [];
  const st = heroStats(key, level, talents);
  const band = {
    id: nextId(), kind: "hero", hero: key, name: h.name, level, xp, talents: { ...(talents || {}) }, st, rally: { x, y }, home: { x, y },
    units: [{ id: nextId(), hp: st.hp, maxHp: st.hp, x, y, face: -1, atkCd: 0, swing: 0, respawn: 0, state: "rally", targetId: null }],
  };
  g.bands.push(band);
  return band;
};
export const heroBand = (g) => g?.bands?.find((b) => b.kind === "hero") || null;

// ---- the hero's abilities (bands.js HERO_ABILITIES) ----
// Where an ability stands: locked until the hero reaches its level in this
// battle, cooling down, or ready. Seconds left are rounded up for the menu.
export const heroAbilityState = (b, a) => {
  if (!b) return { state: "none" };
  if (b.level < a.unlock) return { state: "locked", unlock: a.unlock };
  const left = (b.abCd && b.abCd[a.id]) || 0;
  if (left > 0) return { state: "cooling", sec: Math.ceil(left / 1000), frac: left / (b.st.abil[a.id]?.cd || a.cd) };
  if (b.units[0].state === "dead") return { state: "down" };
  return { state: "ready" };
};
// The foe a Heartseeker takes: the BIGGEST near the tap — the most health
// it was born with, then the most left — never a flier the arrow can't reach
// (it can: she shoots anything). Null when nothing stands near.
export const heartseekerMark = (g, x, y, pick) => {
  let best = null;
  for (const e of g.enemies) {
    if (e.dead || Math.hypot(e.x - x, e.y - y) > pick) continue;
    if (!best || e.maxHp > best.maxHp || (e.maxHp === best.maxHp && e.hp > best.hp)) best = e;
  }
  return best;
};
// Fire ability `id` (at the map point x, y when it takes aim). True if it went.
export const fireHeroAbility = (g, id, x, y) => {
  const b = heroBand(g);
  if (!b) return false;
  const def = heroAbilities(b.hero).find((a) => a.id === id);
  if (!def || heroAbilityState(b, def).state !== "ready") return false;
  const a = b.st.abil[id];
  const u = b.units[0];
  const tms = g.time * 1000;
  if (id === "slam") {
    for (const e of g.enemies) {
      if (e.dead || e.flying || e.swimming || Math.hypot(e.x - u.x, e.y - u.y) > a.r) continue;
      dealDamage(g, e, a.dmg, "phys", false, false, b.id);
      if (!e.dead && !e.immStun) e.stunUntil = Math.max(e.stunUntil || 0, tms + a.stun);
    }
    g.effects.push({ type: "slam", x: u.x, y: u.y + 4, ttl: 450, r: a.r });
    g.effects.push({ type: "dust", x: u.x, y: u.y + 6, ttl: 420, r: a.r * 0.8 });
    g.shake = Math.max(g.shake, 5);
    sfx.play("rock");
  } else if (id === "charge") {
    // he rides at the spot, as far as his reach allows; the engine carries
    // him there (update.js) and he holds it as his new post
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, a.reach / d);
    const tx = u.x + dx * k, ty = u.y + dy * k;
    releaseEnemy(g, g.enemies.find((e) => e.blockedBy === u.id));
    u.targetId = null;
    u.dash = { tx, ty, hit: [] };
    b.rally = { x: tx, y: ty };
    g.effects.push({ type: "levelup", x: tx, y: ty, ttl: 500 });
    sfx.play("horn");
  } else if (id === "volley") {
    if (!g.volleys) g.volleys = [];
    g.volleys.push({ src: b.id, x, y, r: a.r, dmg: a.dmg, tick: a.tick, next: tms + 250, until: tms + a.dur, t0: tms });
    sfx.play("arrow");
  } else if (id === "heart") {
    const mark = heartseekerMark(g, x, y, a.pick);
    if (!mark) return false;                 // nothing there: keep the arrow
    g.projectiles.push({
      id: nextId(), x: u.x, y: u.y - 14, targetId: mark.id, tx: mark.x, ty: mark.y, speed: 720, delay: 0,
      dmg: a.dmg, dtype: "phys", pierce: true, splash: 0, burn: 0, burnDur: 0, slow: 0, slowDur: 0,
      kind: "arrow", src: b.id, big: true, poison: 0, poisonDur: 0, poisonCap: 0, chain: 0, chainRange: 0,
    });
    g.effects.push({ type: "reticle", x: mark.x, y: mark.y, ttl: 700, target: mark.id });
    sfx.play("bolt");
  } else return false;
  if (!b.abCd) b.abCd = {};
  b.abCd[id] = a.cd;
  return true;
};

