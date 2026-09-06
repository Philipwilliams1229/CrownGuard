// ============ HEADLESS SIM ============
// Runs whole campaign levels (or free-play runs) with no browser: a scripted
// commander places and upgrades towers each build phase, then the real engine
// fights the real waves at fixed timesteps. Reports leaks, lives and gold per
// wave so balance changes can be judged in seconds.
//
//   node scripts/sim.mjs --level gw3          one level
//   node scripts/sim.mjs --all                every campaign level
//   node scripts/sim.mjs --free ember iron    free play: realm + faction
//   node scripts/sim.mjs --all --quiet        one line per level
//
// The commander is deliberately a decent player, not a perfect one: it values
// road coverage, keeps a knight post near the front, mixes physical and magic,
// and spends its gold every build phase.

// profile.js expects a browser; give it an empty pantry to read from
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const after = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

// Deterministic runs: the engine reaches for Math.random (lanes, scatter of
// grapeshot). Seed it so two sims of the same build agree.
const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEED = Number(after("seed")) || 20260808;
let rng = mulberry(SEED);
Math.random = () => rng();

const { W, H, CASTLE_HP, RALLY_RANGE } = await import("../src/data/constants.js");
const { selectRealm, REALMS } = await import("../src/data/maps.js");
const { selectFaction, FACTIONS } = await import("../src/data/factions.js");
const { setWaveWindow, scriptedWaves } = await import("../src/data/waves.js");
const { TOWERS } = await import("../src/data/towers.js");
const { TOTAL_LEN, posAt, nearestOnPath } = await import("../src/engine/path.js");
const { updateGame } = await import("../src/engine/update.js");
const { startWave, placeTower, upgradeTower, branchTower, ascendTower, buildableAt, fieldHero, callMilitia, heroBand } = await import("../src/engine/actions.js");
const { PTS } = await import("../src/engine/path.js");
// --hero aldric|wren|none : who rides with the commander (default: Sir Aldric,
// because a real player always has one). --no-militia skips the free farmers.
const HERO = after("hero") || "aldric";
const MILITIA_ON = !flag("no-militia");
const { CHAPTERS, LEVELS, towerUnlocked } = await import("../src/data/campaign.js");
// which halls the commander may raise on this level: everything earned by
// clearing the levels before it (free play: everything)
let UNLOCKED = null;
const setUnlocksFor = (levelId) => {
  if (!levelId) { UNLOCKED = null; return; }
  const cleared = {};
  for (const l of LEVELS) { if (l.id === levelId) break; cleared[l.id] = true; }
  UNLOCKED = new Set(Object.keys(TOWERS).filter((k) => towerUnlocked(k, { cleared })));
};
const { recomputePerks } = await import("../src/data/profile.js");
const { SKILLS } = await import("../src/data/skills.js");

// ---- veterancy --------------------------------------------------------
// A player who has marched this deep has stars in the trees. Model that:
// rank `t1` in both tier-1 nodes of every tower, `t2` in both tier-2s.
const applyVeterancy = (t1, t2 = 0) => {
  const perks = {};
  for (const [kind, tree] of Object.entries(SKILLS)) {
    perks[kind] = {};
    for (const n of tree.nodes) {
      if (n.tier === 1 && t1 > 0) perks[kind][n.id] = Math.min(3, t1);
      if (n.tier === 2 && t2 > 0) perks[kind][n.id] = Math.min(3, t2);
    }
  }
  recomputePerks({ perks });
};

// ---- the commander ----------------------------------------------------

// Sample the road once per realm: points every 6px, used to score coverage.
let roadPts = [];
const sampleRoad = () => {
  roadPts = [];
  for (let d = 0; d < TOTAL_LEN; d += 6) roadPts.push(posAt(d));
};

// How much road a tower at (x,y) with reach r would command.
const coverage = (x, y, r) => {
  let n = 0;
  for (const [px, py] of roadPts) {
    const dx = px - x, dy = py - y;
    if (dx * dx + dy * dy <= r * r) n++;
  }
  return n;
};

// The best legal build spot for reach r — densest road coverage wins, with a
// slight pull toward the middle of the road's length so defence layers.
const bestSpot = (g, r, frontBias = 0) => {
  let best = null, bs = -1;
  for (let y = 28; y < H - 20; y += 12) {
    for (let x = 24; x < W - 24; x += 12) {
      if (!buildableAt(g, x, y)) continue;
      let score = coverage(x, y, r);
      if (frontBias) {
        // early road is worth more to a knight post: leaks die at the gate
        const [sx, sy] = posAt(TOTAL_LEN * frontBias);
        score -= Math.hypot(x - sx, y - sy) * 0.05;
      }
      if (score > bs) { bs = score; best = [x, y]; }
    }
  }
  return best;
};

// Two army doctrines, the way a player adapts to what marches:
//   swarm — storms of small hits + poison; eats hordes, struggles vs wards
//   burst — few colossal blows; cracks shields, wards and champions
const PLANS = {
  swarm: {
    build: ["archer", "knight", "wizard", "archer", "catapult", "support", "wizard", "archer", "knight", "catapult", "spiker", "wizard"],
    branch: { archer: "a", knight: "a", wizard: "a", catapult: "b", spiker: "a", support: "a" },
    ascend: { archer: "a", knight: "b", wizard: "b", catapult: "a", spiker: "a", support: "a" },
  },
  burst: {
    build: ["archer", "knight", "wizard", "catapult", "archer", "support", "wizard", "catapult", "knight", "archer", "wizard", "catapult"],
    branch: { archer: "b", knight: "a", wizard: "b", catapult: "a", spiker: "b", support: "a" },
    ascend: { archer: "b", knight: "a", wizard: "b", catapult: "b", spiker: "a", support: "b" },
  },
};
let PLAN = PLANS.swarm;

// The cheapest step a tower could take right now: [cost, do-it]. Nothing
// affordable (or the tower is finished) comes back null.
const nextStep = (g, t) => {
  const def = TOWERS[t.kind];
  if (!t.branch && t.level < 3) {
    const cost = def.levels[t.level].cost;
    return [cost, () => upgradeTower(g, t)];
  }
  if (!t.branch && t.level >= 3) {
    const key = PLAN.branch[t.kind];
    return [def.branches[key].cost, () => branchTower(g, t, key)];
  }
  if (t.branch && !t.rank4 && def.branches[t.branch].rank4) {
    const key = PLAN.ascend[t.kind];
    const r4 = def.branches[t.branch].rank4[key];
    if (r4) return [r4.cost, () => ascendTower(g, t, key)];
  }
  return null;
};

// Place the plan's next tower with a player's touches: knights rally ON the
// road, splash towers watch for the thickest crowd.
const placeNext = (g) => {
  const wanted = PLAN.build.filter((k) => !UNLOCKED || UNLOCKED.has(k));
  const next = wanted[g.towers.length];
  if (!next || g.gold < TOWERS[next].cost) return false;
  const r = next === "knight" ? 120 : TOWERS[next].levels[0].range;
  const spot = bestSpot(g, r, next === "knight" ? 0.35 : 0);
  if (!spot) return false;
  placeTower(g, next, spot[0], spot[1]);
  const t = g.towers[g.towers.length - 1];
  if (t.kind === "knight") {
    const p = nearestOnPath(t.x, t.y);
    if (p.d <= RALLY_RANGE) t.rally = { x: p.x, y: p.y };
  }
  if (t.kind === "wizard" || t.kind === "catapult") t.aim = "most";
  return true;
};

const commander = (g) => {
  let acted = true;
  while (acted) {
    acted = false;
    // 1. a working core first: the first four towers go up before any polish
    if (g.towers.length < 4) {
      if (placeNext(g)) { acted = true; continue; }
      break;
    }
    // 2. then CONCENTRATE: take the cheapest upgrade step available anywhere
    let best = null;
    for (const t of g.towers) {
      const step = nextStep(g, t);
      if (step && g.gold >= step[0] && (!best || step[0] < best[0])) best = step;
    }
    if (best) { best[1](); acted = true; continue; }
    // 3. only fat surplus buys breadth — a new tower plus change for its levels
    const wantedNext = PLAN.build.filter((k) => !UNLOCKED || UNLOCKED.has(k))[g.towers.length];
    if (wantedNext && g.gold >= TOWERS[wantedNext].cost + 250) {
      if (placeNext(g)) acted = true;
    }
  }
};

// ---- one run ----------------------------------------------------------

const freshGame = (gold) => ({
  run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 },
  gold, lives: CASTLE_HP, wave: 0, phase: "build",
  towers: [], enemies: [], projectiles: [], effects: [],
  spawnQueue: [], spawnTimer: 0, speed: 4, paused: false,
  selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
  cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false,
  bands: [], militiaCd: 0,
});

const DT = 1 / 30;

function runOnce({ realm, faction, window: win, gold, waves, vet = 0 }, quiet, planName) {
  rng = mulberry(SEED);              // same dice for every level
  PLAN = PLANS[planName];
  selectRealm(realm);
  selectFaction(faction);
  setWaveWindow(win || null);
  applyVeterancy(Math.min(3, vet), Math.max(0, vet - 3));
  sampleRoad();
  const g = freshGame(gold);
  // the hero waits before the gate, like the game puts him; the commander
  // parks him a little up the road so he meets what the towers let through
  const [gx, gy] = PTS[PTS.length - 1];
  if (HERO !== "none") {
    const b = fieldHero(g, HERO, 1, gx - 70, gy + (gy > H / 2 ? -50 : 50));
    const [hx, hy] = posAt(TOTAL_LEN - 110);
    if (b) b.rally = { x: hx, y: hy };
  }
  const total = waves ?? scriptedWaves();
  let ticks = 0;
  const MAX_TICKS = 30 * 60 * 60; // one simulated hour — a stuck run bails out

  while (g.phase !== "lost" && !g.victory && ticks < MAX_TICKS) {
    if (g.phase === "build") {
      commander(g);
      const livesBefore = g.lives;
      startWave(g);
      // fight the whole wave
      while (g.phase === "combat" && ticks < MAX_TICKS) {
        updateGame(g, DT); ticks++;
        // the militia horn, blown at the road's last bend whenever it's ready
        // and something is on the road worth blowing it for
        if (MILITIA_ON && (g.militiaCd || 0) <= 0 && g.enemies.some((e) => !e.dead && e.dist > TOTAL_LEN * 0.5)) {
          const [mx, my] = posAt(TOTAL_LEN - 150);
          callMilitia(g, mx, my);
        }
      }
      if (!quiet) {
        const leaked = livesBefore - g.lives;
        const mark = leaked === 0 ? "  " : leaked <= 2 ? "! " : "!!";
        const hb0 = heroBand(g);
        console.log(`  ${mark} wave ${String(g.wave).padStart(2)}/${total}  leaked ${String(leaked).padStart(2)}  lives ${String(g.lives).padStart(2)}  gold ${Math.round(g.gold)}${hb0 ? `  hero L${hb0.level} k${hb0.kills || 0} ${hb0.units[0].state}` : ""}`);
      }
    } else {
      updateGame(g, DT);
      ticks++;
    }
  }

  const result = g.victory ? "WON" : g.phase === "lost" ? "LOST" : "STUCK";
  const hb = heroBand(g);
  const towers = g.towers.map((t) => `${t.kind}${t.level}${t.branch || ""}${t.rank4 || ""}`).join(" ") + (hb ? ` + ${hb.name} L${hb.level}` : "");
  return { result, wave: g.wave, total, lives: g.lives, leaked: CASTLE_HP - g.lives, towers, plan: planName };
}

// A level gets a real player's persistence: the faction's natural doctrine
// first, and if the castle falls, the other doctrine. Best attempt counts.
function runLevel(opts, quiet) {
  const first = opts.faction === "iron" ? "burst" : "swarm";
  const second = first === "burst" ? "swarm" : "burst";
  let r = runOnce(opts, quiet, first);
  if (r.result !== "WON") {
    const r2 = runOnce(opts, quiet, second);
    if (r2.result === "WON" || r2.lives > r.lives || (r2.lives === r.lives && r2.wave > r.wave)) r = r2;
  }
  const { name } = opts;
  console.log(`${r.result === "WON" ? "✔" : "✘"} ${name} [${r.plan}]: ${r.result} — wave ${r.wave}/${r.total}, lives ${r.lives}/${CASTLE_HP} (leaked ${r.leaked}), army: ${quiet ? r.towers.split(" + ")[0].split(" ").length + " towers" + (r.towers.includes(" + ") ? " + " + r.towers.split(" + ")[1] : "") : r.towers}`);
  return { name, ...r };
}

// ---- CLI --------------------------------------------------------------

const quiet = flag("quiet");
const results = [];

if (flag("all")) {
  for (const lv of LEVELS) {
    const idx = LEVELS.findIndex((l) => l.id === lv.id);
    setUnlocksFor(lv.id);
    results.push(runLevel({
      realm: lv.realm, faction: lv.chapter.faction, window: lv.window,
      gold: lv.gold, name: `${lv.id} ${lv.name}`, vet: Math.floor(idx / 2),
    }, quiet));
  }
  const won = results.filter((r) => r.result === "WON").length;
  console.log(`\n==== ${won}/${results.length} levels held ====`);
  for (const r of results) {
    if (r.result !== "WON") console.log(`  FELL: ${r.name} at wave ${r.wave}/${r.total}`);
    else if (r.leaked > 6) console.log(`  BLED: ${r.name} leaked ${r.leaked}`);
  }
} else if (flag("free")) {
  const realm = after("free") || "greenwood";
  const factionArg = args[args.indexOf("--free") + 2];
  const faction = factionArg && !factionArg.startsWith("--") ? factionArg : (REALMS[realm]?.id === realm ? "greenwood" : "greenwood");
  runLevel({ realm, faction, window: null, gold: 400, name: `free ${realm} vs ${faction}` }, quiet);
} else if (after("level")) {
  const lv = LEVELS.find((l) => l.id === after("level"));
  if (!lv) { console.error(`no such level: ${after("level")} — ids are ${LEVELS.map((l) => l.id).join(", ")}`); process.exit(1); }
  const idx = LEVELS.findIndex((l) => l.id === lv.id);
  setUnlocksFor(lv.id);
  runLevel({
    realm: lv.realm, faction: lv.chapter.faction, window: lv.window,
    gold: lv.gold, name: `${lv.id} ${lv.name}`, vet: Math.floor(idx / 2),
  }, quiet);
} else {
  console.log("usage: node scripts/sim.mjs --level <id> | --all [--quiet] | --free <realm> [faction]");
  console.log(`levels: ${LEVELS.map((l) => l.id).join(", ")}`);
}
