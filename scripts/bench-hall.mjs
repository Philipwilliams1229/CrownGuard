// ============ LONE-HALL BENCH ============
// One hall of one form beside the road, a steady stream of foes walking past
// it, the real engine stepped at fixed timesteps — and what the hall dealt,
// per second that a foe stood in its reach (the tower card's own clock,
// t.formTime). Built for the Powder Works rework (2026-09-29): judge a form
// against its peers on the same road and the same crowd, not by feel.
//
//   node scripts/bench-hall.mjs                         the Powder Works, every form, every mix
//   node scripts/bench-hall.mjs --kind gunpowder --form 3,a,a --mix crowd
//   node scripts/bench-hall.mjs --peers                 the Powder Works finals beside the
//                                                       archer, wizard, catapult, spiker and
//                                                       falconry finals at the same price
//   --mult 3      foe HP multiplier (3 ≈ campaign wave 20; the finals' part of a level)
//   --secs 80     game seconds measured per run (after an 8 s walk-in)
//   --seeds 3     dice per run (lanes, the shrapnel's turn), averaged
//   --at 0.3,0.5,0.7   where along the road the hall stands (averaged)
//   --realm greenwood
//   --kind archer,wizard --forms "1;2;3;3,a;3,b"   any halls, any forms
//   --set frags=10,fragDmg=30   try numbers on the benched forms (towers.js untouched)
//   --json        print the table as JSON too
//
// Two numbers per cell: `dps`, every hit point the stream lost (burns
// included — the hall is alone, so all of it is the hall's), and `card`,
// what the tower card's service record would say (the damage ledger, which
// credits only what carries the hall's id). Both are over t.formTime.
// The crowd mix is ~840 hp a second at x3: a hall that eats the whole stream
// reads ABOVE that (its clock stops while its reach is empty, and its burns
// keep ticking), which is how the old Grand Battery read ~1000.

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const after = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };

const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let rng = mulberry(1);
Math.random = () => rng();

const { selectRealm } = await import("../src/data/maps.js");
const { selectFaction } = await import("../src/data/factions.js");
const { TOWERS } = await import("../src/data/towers.js");
const { TOTAL_LEN, posAt, angleAt } = await import("../src/engine/path.js");
const { updateGame, spawnAt } = await import("../src/engine/update.js");
const { placeTower, upgradeTower, branchTower, ascendTower, buildableAt } = await import("../src/engine/actions.js");

const MULT = Number(after("mult")) || 3;
const SECS = Number(after("secs")) || 80;
const SEEDS = Number(after("seeds")) || 3;
const ATS = (after("at") || "0.3,0.5,0.7").split(",").map(Number);
const REALM = after("realm") || "greenwood";
const WALK_IN = 8;                    // game seconds before the clock starts
const DT = 1 / 30;

// The foe mixes: a cycle of types and the game-ms between heads.
//   crowd — a packed chaff crowd: the splash hall's best day
//   armor — an armored column: plate that halves every physical blow
//   iron  — the Iron Marches: three-pip levies, a chaplain laying wards, an
//           Aegis Magister in the thick of it; every physical blow a pip eats
const MIXES = {
  crowd: { gap: 200, cycle: ["goblin", "goblin", "skeleton", "goblin", "goblin", "orc", "goblin", "skeleton"] },
  armor: { gap: 650, cycle: ["armored", "sergeant", "orc", "armored", "troll", "sergeant"] },
  iron: { gap: 380, cycle: ["levy", "levy", "crossbow", "levy", "sergeant", "levy", "chaplain", "levy", "levy", "crossbow", "levy", "magister"] },
};

const freshGame = () => ({
  run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 1e6, wave: 20, phase: "combat",
  towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
  selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
  cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0,
});

// one run: a hall at `at` of the road, `mix` walking past, `seed` for the dice
function runOnce(kind, form, mixId, at, seed) {
  rng = mulberry(seed * 7919 + Math.round(at * 1000));
  const g = freshGame();
  const d0 = at * TOTAL_LEN, [rx, ry] = posAt(d0), a = angleAt(d0);
  let spot = null;
  for (let r = 52; r < 120 && !spot; r += 3) for (const s of [1, -1]) {
    const x = rx + Math.cos(a + Math.PI / 2) * r * s, y = ry + Math.sin(a + Math.PI / 2) * r * s;
    if (buildableAt(g, x, y, kind)) { spot = [x, y]; break; }
  }
  if (!spot) return null;
  placeTower(g, kind, spot[0], spot[1]);
  const t = g.towers[0];
  const [lv, br, r4] = form;
  for (let l = 1; l < lv; l++) upgradeTower(g, t);
  if (br) branchTower(g, t, br);
  if (r4) ascendTower(g, t, r4);
  t.readyAt = 0; t.raised = null;
  // a log roller rolls down its road: aim it along the road past its foot
  if (TOWERS[kind].branches?.b?.stats?.roller && br === "b") {
    const [fx, fy] = posAt(Math.max(0, d0 - 60));
    t.logAim = Math.atan2(fy - t.y, fx - t.x);
  }
  const mix = MIXES[mixId];
  let next = 0, k = 0;
  let lost = 0, clockOn = false, ledger0 = 0, time0 = 0;
  const end = WALK_IN + SECS;
  while (g.time < end) {
    // the stream: one head every `gap` game-ms, from the top of the road
    while (g.time * 1000 >= next) {
      spawnAt(g, mix.cycle[k % mix.cycle.length], MULT, 0, g.time * 1000);
      k++; next += mix.gap;
    }
    if (!clockOn && g.time >= WALK_IN) { clockOn = true; ledger0 = t.formDmg || 0; time0 = t.formTime || 0; }
    g.phase = "combat"; g.lives = 1e6;
    // every hit point the stream loses this tick (heals and regen aside)
    const pre = clockOn ? g.enemies.map((e) => [e, Math.max(0, e.hp)]) : null;
    updateGame(g, DT);
    if (pre) for (const [e, was] of pre) { const now = Math.max(0, e.hp); if (now < was) lost += was - now; }
  }
  const secs = (t.formTime || 0) - time0;
  return { dps: secs > 0 ? lost / secs : 0, card: secs > 0 ? ((t.formDmg || 0) - ledger0) / secs : 0, secs };
}

// --set dmg=60,frags=8 : try numbers on the benched form without touching
// towers.js (the form's own stats object is patched for its runs, then restored)
const SET = after("set") ? Object.fromEntries(after("set").split(",").map((kv) => { const [k, v] = kv.split("="); return [k, v === "true" ? true : v === "false" ? false : Number(v)]; })) : null;
const statsOf = (kind, [lv, br, r4]) => {
  const d = TOWERS[kind];
  if (!br) return d.levels[lv - 1];
  return r4 ? d.branches[br].rank4[r4].stats : d.branches[br].stats;
};
function bench(kind, form, mixId) {
  const st = statsOf(kind, form), saved = { ...st };
  if (SET) Object.assign(st, SET);
  try { return benchRuns(kind, form, mixId); } finally { for (const k of Object.keys(st)) delete st[k]; Object.assign(st, saved); }
}
function benchRuns(kind, form, mixId) {
  let dps = 0, card = 0, n = 0;
  for (const at of ATS) for (let s = 1; s <= SEEDS; s++) {
    const r = runOnce(kind, form, mixId, at, s);
    if (!r) continue;
    dps += r.dps; card += r.card; n++;
  }
  return n ? { dps: dps / n, card: card / n } : null;
}

const formName = (kind, [lv, br, r4]) => {
  const d = TOWERS[kind];
  if (!br) return `${d.name} L${lv}`;
  const b = d.branches[br];
  return r4 ? b.rank4[r4].name : b.name;
};
const costOf = (kind, [lv, br, r4]) => {
  const d = TOWERS[kind];
  let c = d.cost;
  for (let l = 1; l < lv; l++) c += d.levels[l].cost;
  if (br) c += d.branches[br].cost;
  if (r4) c += d.branches[br].rank4[r4].cost;
  return c;
};
const parseForm = (s) => { const [lv, br, r4] = s.split(","); return [Number(lv) || 1, br || null, r4 || null]; };

const ALL_POWDER = ["1", "2", "3", "3,a", "3,b", "3,a,a", "3,a,b", "3,b,a", "3,b,b"].map(parseForm);
const PEER_KINDS = ["archer", "wizard", "catapult", "spiker", "falconry"];
const finals = (kind) => ["a", "b"].flatMap((br) => ["a", "b"].map((r4) => [3, br, r4]));

let jobs = [];
const KIND = after("kind");
// --forms "1;2;3;3,a;3,b" : several forms of --kind (default: all nine)
const FORMS = after("forms") ? after("forms").split(";").map(parseForm) : after("form") ? [parseForm(after("form"))] : ALL_POWDER;
if (KIND) for (const k of KIND.split(",")) jobs.push(...FORMS.map((f) => [k, f]));
else {
  jobs = ALL_POWDER.map((f) => ["gunpowder", f]);
  if (flag("peers")) for (const k of PEER_KINDS) for (const f of finals(k)) jobs.push([k, f]);
}
const mixes = after("mix") ? after("mix").split(",") : Object.keys(MIXES);

selectRealm(REALM);
selectFaction("greenwood");
console.log(`lone-hall bench — ${REALM}, foe HP ×${MULT}, ${SECS}s a run, ${SEEDS} seeds × ${ATS.length} spots; dps (card) per second a foe is in reach`);
console.log(`${"form".padEnd(24)} ${"cost".padStart(5)}  ${mixes.map((m) => m.padStart(15)).join("")}`);
const out = [];
for (const [kind, form] of jobs) {
  const row = { kind, form: form.filter(Boolean).join(","), name: formName(kind, form), cost: costOf(kind, form) };
  const cells = [];
  for (const m of mixes) {
    const r = bench(kind, form, m);
    row[m] = r ? { dps: Math.round(r.dps), card: Math.round(r.card) } : null;
    cells.push(r ? `${String(Math.round(r.dps)).padStart(6)} (${String(Math.round(r.card)).padStart(5)})` : "—".padStart(15));
  }
  out.push(row);
  console.log(`${row.name.padEnd(24)} ${String(row.cost).padStart(5)}  ${cells.join("")}`);
}
if (flag("json")) console.log(JSON.stringify(out));
