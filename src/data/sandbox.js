// ============ FREE PLAY: THE SANDBOX ============
// Free Play is a sandbox: pick a battlefield, then shape the war on it.
// Everything a run can be bent by lives in ONE settings object; presets are
// just named bundles of it, and the setup screen (ui/SandboxSetup.jsx) edits
// any field granularly on top of a preset. startSandbox() hands the settings
// to the engine through the live binding SANDBOX (null in the campaign), the
// same trick FACTION and REALM use, so the engine never has to be re-wired.
//
// The engine reads (only when SANDBOX is set):
//   waves.js    — the army (a synthetic faction built here), count/gap/HP
//                 multipliers, boss rhythm, the wave cap, wave-bonus scale
//   update.js   — foe speed, bounty scale, infinite gold, an unbreakable
//                 castle, the build timer
//   actions.js  — sell refund, the tier cap, militia on/off
//   the game    — start gold and wave, lives, which halls the tray offers,
//                 the hero, auto-horn
// A run with any "cheat" on (see isHonest) banks no stars or profile XP.

import { FACTIONS, setCustomFaction, selectFaction } from "./factions.js";
import { ENEMIES } from "./enemies.js";
import { TOWERS } from "./towers.js";

// ---- the settings ----------------------------------------------------------
export const DEFAULTS = {
  preset: "classic",
  realm: "greenwood",

  // THE ENEMY
  army: "greenwood",      // "greenwood" | "iron" | "hollow" | "all" (every army at once)
  script: true,           // march the army's scripted waves before the generated ones
  types: null,            // null = the army's whole roster; else [enemy type, ...] allowed
  bosses: true,           // champions lead every `bossEvery`th generated wave
  bossEvery: 5,
  hpMul: 1,               // foe health x
  speedMul: 1,            // foe pace x
  countMul: 1,            // heads per group x
  gapMul: 1,              // spacing between spawns x (lower = packed tighter)
  crowd: true,            // the war's crowd swell (see waves.js)
  startWave: 1,           // the first wave the horn sounds
  waves: 0,               // 0 = won at the script's end, then endless (no script: never); N = won at wave N

  // THE PURSE
  gold: 250,
  infiniteGold: false,
  bountyMul: 1,           // gold per kill x
  waveBonusMul: 1,        // wave-clear bonus x
  sellRefund: 0.7,        // share of what a hall cost that selling returns

  // THE CASTLE
  lives: 20,
  invincible: false,      // leaks are counted but the castle never falls

  // THE HALLS
  towers: null,           // null = every hall; else [kind, ...] the tray offers
  maxTier: 5,             // 1-3 = up to that level, 4 = branches, 5 = final forms

  // HEROES AND HELP
  hero: true,
  heroLevel: 1,           // 1-20
  militia: true,

  // THE PACE
  autoWaves: false,       // the horn sounds itself (Rush) from the start
  buildTime: 30,          // seconds between waves before the horn sounds anyway
};

// Bounds for every number, for the setup screen's sliders and steppers
// (and for sanitising anything loaded from storage).
export const LIMITS = {
  bossEvery: { min: 1, max: 20, step: 1 },
  hpMul: { min: 0.1, max: 10, step: 0.1 },
  speedMul: { min: 0.3, max: 3, step: 0.1 },
  countMul: { min: 0.2, max: 10, step: 0.1 },
  gapMul: { min: 0.2, max: 3, step: 0.1 },
  startWave: { min: 1, max: 200, step: 1 },
  waves: { min: 0, max: 500, step: 1 },
  gold: { min: 0, max: 100000, step: 50 },
  bountyMul: { min: 0, max: 10, step: 0.1 },
  waveBonusMul: { min: 0, max: 10, step: 0.1 },
  sellRefund: { min: 0, max: 1, step: 0.05 },
  lives: { min: 1, max: 999, step: 1 },
  maxTier: { min: 1, max: 5, step: 1 },
  heroLevel: { min: 1, max: 20, step: 1 },
  buildTime: { min: 3, max: 120, step: 1 },
};

// ---- presets -----------------------------------------------------------------
// Each is a patch over DEFAULTS. `honest` presets still bank stars.
export const PRESETS = [
  { id: "classic", name: "Classic", tag: "THE WAR", blurb: "Free Play as it always was: the army's scripted waves, then the Endless March. Stars and XP are banked.", patch: {} },
  { id: "builder", name: "Builder's Yard", tag: "SANDBOX", blurb: "Bottomless coffers, a castle that cannot fall, every hall and every form. Build anything and watch it work.", patch: { infiniteGold: true, invincible: true } },
  { id: "flood", name: "The Flood", tag: "SWARM", blurb: "Three times the bodies at half the health, packed tight. Splash and area damage rule here.", patch: { countMul: 3, hpMul: 0.5, gapMul: 0.5 } },
  { id: "juggernauts", name: "Juggernauts", tag: "TANKS", blurb: "A third as many foes, each three times as hard, walking a touch slower. Single-target killers only need apply.", patch: { countMul: 0.35, hpMul: 3, speedMul: 0.85 } },
  { id: "bossrush", name: "Boss Rush", tag: "CHAMPIONS", blurb: "Every army's champion, every wave, from the first horn. A fat purse to answer them.", patch: { army: "all", script: false, bossEvery: 1, gold: 1500 } },
  { id: "blitz", name: "Blitz", tag: "FAST", blurb: "Foes half again as quick, ten seconds between waves, and the horn blows itself.", patch: { speedMul: 1.5, autoWaves: true, buildTime: 10 } },
  { id: "threecrowns", name: "War of Three Crowns", tag: "ALL ARMIES", blurb: "The Horde, the Iron Kingdom and the Hollow Court on one road, taking turns to lead.", patch: { army: "all", script: false, gold: 400 } },
  { id: "laststand", name: "Last Stand", tag: "HARDCORE", blurb: "One life. Leaner bounties. No militia. Every leak ends it.", patch: { lives: 1, bountyMul: 0.75, militia: false } },
  { id: "chaos", name: "Chaos", tag: "STRESS TEST", blurb: "Every army, five times the crowd, infinite gold and an unbreakable castle. How much can the road hold?", patch: { army: "all", script: false, countMul: 5, gapMul: 0.4, infiniteGold: true, invincible: true } },
];
export const presetById = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

// Settings from a preset, keeping the chosen battlefield.
export const fromPreset = (id, keep = {}) => ({ ...DEFAULTS, ...presetById(id).patch, preset: id, realm: keep.realm ?? DEFAULTS.realm });

// ---- what the choices mean -----------------------------------------------------
// The armies a setting draws from.
export const armiesOf = (s) => (s.army === "all" ? Object.keys(FACTIONS) : [s.army in FACTIONS ? s.army : "greenwood"]);
// Every foe the chosen armies could field (roster, script, champions), for the
// setup screen's toggles. Mothballed foes (the raft goblin) are included —
// the sandbox is where they get to walk again.
export const typesOf = (s) => {
  const out = [];
  for (const id of armiesOf(s)) for (const t of FACTIONS[id].types) if (!out.includes(t)) out.push(t);
  for (const [t, d] of Object.entries(ENEMIES)) if (armiesOf(s).includes(d.faction) && !out.includes(t)) out.push(t);
  return out;
};
export const isBoss = (t) => !!ENEMIES[t]?.boss;
export const allTowers = () => Object.keys(TOWERS);

// A run is "honest" when nothing in it is easier than Classic, so what it
// earns (hero stars, profile XP) can be banked. Harder is fine.
export const isHonest = (s) => !!s && !s.infiniteGold && !s.invincible
  && s.gold <= DEFAULTS.gold && s.lives <= DEFAULTS.lives
  && s.bountyMul <= 1 && s.waveBonusMul <= 1 && s.sellRefund <= DEFAULTS.sellRefund
  && s.hpMul >= 1 && s.speedMul >= 1 && s.heroLevel <= 1 && s.startWave <= 1;

// Clamp every number into its limits and drop unknown types and halls, so a
// stale save can never break a run.
export const sanitize = (raw) => {
  const s = { ...DEFAULTS, ...(raw || {}) };
  for (const [k, { min, max }] of Object.entries(LIMITS)) {
    const v = Number(s[k]);
    s[k] = Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : DEFAULTS[k];
  }
  if (!(s.army in FACTIONS) && s.army !== "all") s.army = DEFAULTS.army;
  if (Array.isArray(s.types)) { s.types = s.types.filter((t) => ENEMIES[t]); if (!s.types.length) s.types = null; } else s.types = null;
  if (Array.isArray(s.towers)) { s.towers = s.towers.filter((k) => TOWERS[k]); if (!s.towers.length) s.towers = null; } else s.towers = null;
  for (const k of ["script", "bosses", "crowd", "infiniteGold", "invincible", "hero", "militia", "autoWaves"]) s[k] = !!s[k];
  return s;
};

// ---- remembered between visits -------------------------------------------------
const KEY = "crownguard.sandbox.v1";
export const loadSandbox = () => { try { return sanitize(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return { ...DEFAULTS }; } };
export const saveSandbox = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

// What "infinite" gold holds at: more than anything costs, less than
// anything that overflows a label. The HUD shows ∞ instead.
export const INFINITE_GOLD = 999999;

// ---- the live binding ------------------------------------------------------------
// null outside a sandbox run (the campaign), so the engine's reads cost nothing.
export let SANDBOX = null;

// The army the settings describe, as a faction the wave code can march:
// the chosen armies' scripts (filtered to the allowed types) one after
// another, their rosters merged and filtered, and their champions taking
// turns at the head of the generated waves.
export const buildArmy = (s) => {
  const ids = armiesOf(s);
  const allow = s.types ? new Set(s.types) : null;
  const ok = (t) => !allow || allow.has(t);
  const bosses = [];
  for (const id of ids) { const b = FACTIONS[id].endlessBoss; if (b && ok(b) && s.bosses) bosses.push(b); }
  // champions the player allowed that no army leads with still take a turn
  if (s.bosses && allow) for (const t of allow) if (isBoss(t) && !bosses.includes(t)) bosses.push(t);
  // the scripts, with disallowed groups struck out and champions held back
  // for the boss rhythm (a script's own final wave keeps its champion)
  let waves = [];
  if (s.script) {
    for (const id of ids) for (const wv of FACTIONS[id].waves) {
      const kept = wv.filter(([t]) => ok(t) && (s.bosses || !isBoss(t)));
      if (kept.length) waves.push(kept);
    }
  }
  // the roster the Endless March buys from: the armies' own, filtered, plus
  // any allowed foe no roster lists (priced from its bounty), minus champions
  const roster = [];
  for (const id of ids) for (const r of FACTIONS[id].roster) if (ok(r.type) && !roster.some((q) => q.type === r.type)) roster.push(r);
  if (allow) for (const t of allow) {
    if (isBoss(t) || roster.some((q) => q.type === t)) continue;
    const d = ENEMIES[t];
    roster.push({ type: t, cost: Math.max(0.8, d.bounty / 6), gap: Math.max(320, Math.round(3000 / Math.max(1, d.speed / 30))) });
  }
  // never an empty army: fall back to the cheapest foe of the first army
  if (!roster.length && !waves.length && !bosses.length) roster.push(FACTIONS[ids[0]].roster[0]);
  const lead = FACTIONS[ids[0]];
  return {
    id: "sandbox", name: ids.length > 1 ? "Every Army" : lead.name, tag: "SANDBOX", tagColor: lead.tagColor, blurb: lead.blurb,
    types: typesOf(s).filter(ok),
    waves, roster,
    endlessBoss: bosses[0] || null,
    bosses, bossEvery: s.bossEvery,
    // one army swells as it always does; many swell like the gentlest of them
    crowdScale: s.crowd ? Math.min(...ids.map((id) => FACTIONS[id].crowdScale ?? 1)) : 0,
  };
};

// May a hall be raised to this tier? (1-3 levels, 4 a branch, 5 a final
// form.) Always yes outside the sandbox. The tower card asks this too.
export const tierOpen = (tier) => !SANDBOX || tier <= SANDBOX.maxTier;
// May the tray offer this hall?
export const hallOpen = (kind) => !SANDBOX || !SANDBOX.towers || SANDBOX.towers.includes(kind);

// Arm the sandbox for a run: remember the settings and march the army.
export const startSandbox = (raw) => {
  SANDBOX = sanitize(raw);
  setCustomFaction(buildArmy(SANDBOX));
  return SANDBOX;
};
// Leave the sandbox (the campaign calls this before a level).
export const endSandbox = (factionId = "greenwood") => {
  SANDBOX = null;
  selectFaction(factionId);
};
// Change a setting mid-run (the in-battle panel). Army-shaping fields rebuild
// the army; the rest are read live by the engine.
export const tweakSandbox = (patch) => {
  if (!SANDBOX) return null;
  SANDBOX = sanitize({ ...SANDBOX, ...patch });
  if (["army", "types", "script", "bosses", "bossEvery", "crowd"].some((k) => k in patch)) setCustomFaction(buildArmy(SANDBOX));
  return SANDBOX;
};
