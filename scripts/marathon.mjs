// ============ THE MARATHON ============
// A long Free Play run through the Endless March with EVERY hall in play:
// a commander builds all thirteen kinds, cycles every branch and final form
// across them, and fights on until the castle falls or --to is reached. It
// watches the engine as it goes — thrown errors, NaN on the road, waves that
// never end, halls that never land a blow — and prints a ledger at the end.
//
//   node scripts/marathon.mjs                       greenwood vs greenwood to wave 180
//   node scripts/marathon.mjs --realm thornbrook --to 120 --endure
//   --endure   the castle cannot fall (castle damage is still counted)
//   --gold N   starting purse (default 400)
//   --every N  print a line every N waves (default 5)

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const REALM_ID = opt("realm", "greenwood"), FACTION_ID = opt("faction", "greenwood");
const TO = Number(opt("to", 180)), GOLD = Number(opt("gold", 400)), EVERY = Number(opt("every", 5));
const ENDURE = flag("endure");

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let rng = mulberry(Number(opt("seed", 20260925)));
Math.random = () => rng();

const { W, H, CASTLE_HP, RALLY_RANGE } = await import("../src/data/constants.js");
const { selectRealm } = await import("../src/data/maps.js");
const { selectFaction } = await import("../src/data/factions.js");
const { setWaveWindow } = await import("../src/data/waves.js");
const { TOWERS } = await import("../src/data/towers.js");
const { TOTAL_LEN, posAt, nearestOnPath, PTS } = await import("../src/engine/path.js");
const { updateGame } = await import("../src/engine/update.js");
const { startWave, placeTower, upgradeTower, branchTower, ascendTower, buildableAt, fieldHero, callMilitia } = await import("../src/engine/actions.js");
const { getStats } = await import("../src/engine/towers.js");

selectRealm(REALM_ID); selectFaction(FACTION_ID); setWaveWindow(null);
const roadPts = []; for (let d = 0; d < TOTAL_LEN; d += 6) roadPts.push(posAt(d));
const coverage = (x, y, r) => { let n = 0; for (const [px, py] of roadPts) if ((px - x) ** 2 + (py - y) ** 2 <= r * r) n++; return n; };
const bestSpot = (g, kind, r) => {
  let best = null, bs = -1;
  for (let y = 28; y < H - 20; y += 10) for (let x = 24; x < W - 24; x += 10) {
    if (!buildableAt(g, x, y, kind)) continue;
    const s = r > 0 ? coverage(x, y, r) : 1 + Math.random();
    if (s > bs) { bs = s; best = [x, y]; }
  }
  return best;
};

// every hall, in a player's order; each kind's copies cycle through all
// four final forms so every one of the 52 gets exercised
const ORDER = ["archer", "knight", "wizard", "support", "catapult", "spiker", "falconry", "gunpowder", "trapsmith", "riverwatch", "goldworks", "assassin", "sunforge"];
const FORMS = [["a", "a"], ["b", "b"], ["a", "b"], ["b", "a"]];
const nth = {};
const g = {
  run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: GOLD, lives: CASTLE_HP, wave: 0, phase: "build",
  towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 4, paused: false,
  selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null, cam: { zoom: 1, x: 0, y: 0 },
  buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0, freeplay: true,
};
const [gx, gy] = PTS[PTS.length - 1];
const hero = fieldHero(g, "aldric", 1, gx - 70, gy + (gy > H / 2 ? -50 : 50));
if (hero) { const [hx, hy] = posAt(TOTAL_LEN - 110); hero.rally = { x: hx, y: hy }; }

const place = (kind) => {
  const r = kind === "knight" || kind === "assassin" ? 110 : TOWERS[kind].levels[0].range || 0;
  const spot = bestSpot(g, kind, Math.min(r, 260));
  if (!spot || g.gold < TOWERS[kind].cost) return false;
  placeTower(g, kind, spot[0], spot[1]);
  const t = g.towers[g.towers.length - 1];
  if (!t || t.kind !== kind) return false;
  t._form = FORMS[(nth[kind] = (nth[kind] || 0) + 1) % 4];
  if (kind === "knight" || kind === "assassin") { const p = nearestOnPath(t.x, t.y); if (p.d <= RALLY_RANGE) t.rally = { x: p.x, y: p.y }; }
  if (kind === "catapult" && t.rally === undefined) t.logAim = Math.random() * Math.PI * 2;
  if (kind === "wizard" || kind === "catapult" || kind === "gunpowder") t.aim = "most";
  return true;
};
const step = (t) => {
  const def = TOWERS[t.kind];
  if (!t.branch && t.level < 3) return [def.levels[t.level].cost, () => upgradeTower(g, t)];
  if (!t.branch) return [def.branches[t._form[0]].cost, () => branchTower(g, t, t._form[0])];
  if (!t.rank4) { const r4 = def.branches[t.branch].rank4?.[t._form[1]]; if (r4) return [r4.cost, () => ascendTower(g, t, t._form[1])]; }
  return null;
};
let noSpot = new Set();
const commander = () => {
  for (let guard = 0; guard < 200; guard++) {
    // first, one of each hall; then upgrade the cheapest step; surplus builds more
    const missing = ORDER.find((k) => !g.towers.some((t) => t.kind === k) && !noSpot.has(k));
    if (missing && g.gold >= TOWERS[missing].cost) { if (!place(missing)) noSpot.add(missing); continue; }
    let best = null;
    for (const t of g.towers) { const s = step(t); if (s && g.gold >= s[0] && (!best || s[0] < best[0])) best = s; }
    if (best) { best[1](); continue; }
    const kind = ORDER[g.towers.length % ORDER.length];
    if (!noSpot.has(kind) && g.gold >= TOWERS[kind].cost + 400) { if (!place(kind)) noSpot.add(kind); continue; }
    break;
  }
};

// ---- watchmen --------------------------------------------------------
const issues = new Map();
const note = (k, msg) => { if (!issues.has(k)) issues.set(k, { msg, n: 0, first: g.wave }); issues.get(k).n++; };
const DT = 1 / 30;
let bled = 0, maxFoes = 0, worstTick = 0, sumTick = 0, nTick = 0;
const t0 = Date.now();
console.log(`marathon: ${REALM_ID} vs ${FACTION_ID}, to wave ${TO}${ENDURE ? " (endure)" : ""}, purse ${GOLD}`);
while (g.wave < TO && g.phase !== "lost") {
  try { commander(); } catch (e) { note("commander:" + e.message, e.stack.split("\n")[1]); }
  if (ENDURE) g.lives = 999;
  const before = g.lives;
  startWave(g);
  const foes = g.spawnQueue.length, gt0 = g.time;
  let ticks = 0, idle = 0;
  while (g.phase === "combat" && ticks < 30 * 60 * 8) {
    const a = performance.now();
    try { updateGame(g, DT); } catch (e) { note("engine:" + e.message, (e.stack || "").split("\n").slice(1, 3).join(" | ")); }
    const d = performance.now() - a; sumTick += d; nTick++; if (d > worstTick) worstTick = d;
    ticks++;
    if (g.enemies.length > maxFoes) maxFoes = g.enemies.length;
    if (ticks % 30 === 0) {
      for (const e of g.enemies) {
        if (!Number.isFinite(e.hp) || !Number.isFinite(e.x) || !Number.isFinite(e.y)) note("nan-enemy:" + e.type, `hp ${e.hp} x ${e.x}`);
      }
      if (!Number.isFinite(g.gold)) note("nan-gold", String(g.gold));
      for (const t of g.towers) for (const u of t.units || []) if (!Number.isFinite(u.x) || !Number.isFinite(u.hp)) note("nan-unit:" + t.kind, `${u.x} ${u.hp}`);
    }
    // nothing left alive and nothing left to spawn, yet the wave will not close
    if (g.phase === "combat" && !g.spawnQueue.length && !g.enemies.some((e) => !e.dead)) {
      if (++idle === 30 * 5) note("wave-not-closing", `wave ${g.wave}: 5s with the road empty`);
    } else idle = 0;
    if (MILITIA(ticks)) { const [mx, my] = posAt(TOTAL_LEN - 150); callMilitia(g, mx, my); }
  }
  if (ticks >= 30 * 60 * 8) note("wave-timeout", `wave ${g.wave} ran 8 sim-minutes with ${g.enemies.filter((e) => !e.dead).length} alive`);
  if (g.phase === "won") g.phase = "build";          // March On into the endless
  const leak = ENDURE ? 999 - g.lives : before - g.lives;
  bled += Math.max(0, leak);
  if (g.wave % EVERY === 0 || g.phase === "lost") {
    console.log(`w${String(g.wave).padStart(3)} foes ${String(foes).padStart(4)} peak ${String(maxFoes).padStart(4)}  leak ${String(leak).padStart(3)}  lives ${ENDURE ? "-" : g.lives}  gold ${String(Math.round(g.gold)).padStart(7)}  towers ${g.towers.length}  ${Math.round(g.time - gt0)}s  tick ${(sumTick / Math.max(1, nTick)).toFixed(2)}/${worstTick.toFixed(1)}ms`);
    maxFoes = 0; worstTick = 0; sumTick = 0; nTick = 0;
  }
}
function MILITIA(ticks) { return (g.militiaCd || 0) <= 0 && ticks % 15 === 0 && g.enemies.some((e) => !e.dead && e.dist > TOTAL_LEN * 0.5); }

console.log(`\nended at wave ${g.wave} (${g.phase === "lost" ? "castle fell" : "stopped"}), castle damage ${bled}, gold ${Math.round(g.gold)}, ${((Date.now() - t0) / 1000).toFixed(0)}s real`);
console.log("\nledger (final form: damage / kills):");
const byKind = {};
for (const t of g.towers) {
  const k = `${t.kind}${t.level}${t.branch || ""}${t.rank4 || ""}`;
  console.log(`  ${k.padEnd(16)} ${String(Math.round((t.dmgOut || 0) / 1000)).padStart(6)}k  ${String(t.kills || 0).padStart(6)} kills  ${t.paidTotal ? "paid " + t.paidTotal : ""}`);
  (byKind[t.kind] ||= { d: 0, k: 0, n: 0 }); byKind[t.kind].d += t.dmgOut || 0; byKind[t.kind].k += t.kills || 0; byKind[t.kind].n++;
}
console.log("\nby hall:");
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].d - a[1].d)) console.log(`  ${k.padEnd(11)} x${v.n}  ${String(Math.round(v.d / 1000)).padStart(7)}k dmg  ${String(v.k).padStart(6)} kills`);
if (noSpot.size) console.log("\nno legal spot for:", [...noSpot].join(", "));
console.log(issues.size ? "\nISSUES:" : "\nno engine issues");
for (const [k, v] of issues) console.log(`  [${v.n}x from w${v.first}] ${k} — ${v.msg}`);
