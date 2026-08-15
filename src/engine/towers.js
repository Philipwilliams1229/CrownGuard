// ============ TOWER LOGIC ============
// Resolving a tower's active stats (by level or branch), positioning its
// knight units, keeping the unit roster in sync, and creating new towers.

import { TOWERS } from "../data/towers.js";
import { PERK_MODS } from "../data/profile.js";
import { nextId } from "./ids.js";

// Which stats the permanent skill trees are allowed to touch, and which way
// is "better". `rate` is a reload time, so its multiplier goes DOWN to make a
// tower faster; everything else goes up. A stat the tower doesn't have is
// skipped, so a shared node like "+8% range" is safe on any tower.
const PERK_STATS = ["dmg", "range", "hp", "splash", "slow", "heal", "rate", "income", "trapDmg", "dps"];

// Fold the player's permanent upgrades for this tower kind into its stats.
const withPerks = (kind, st) => {
  const mods = PERK_MODS[kind];
  if (!mods) return st;
  // Kept exact on purpose: rounding here would swallow a +5% rank on a small
  // stat (14 dmg +5% and +10% would both show as 15 and hit the same). The
  // panels round for display instead.
  for (const k of PERK_STATS) {
    if (mods[k] == null || st[k] == null) continue;
    st[k] = st[k] * mods[k];
  }
  return st;
};

// The active stats for a tower: its rank-4 form if ascended, else its branch
// stats if evolved, else its level stats — with permanent upgrades applied.
export const getStats = (t) => {
  const def = TOWERS[t.kind];
  if (t.branch) {
    const b = def.branches[t.branch];
    const src = t.rank4 && b.rank4 ? b.rank4[t.rank4].stats : b.stats;
    return withPerks(t.kind, { ...src, dtype: src.magic ? "magic" : def.dtype });
  }
  return withPerks(t.kind, { ...def.levels[t.level - 1], dtype: def.dtype });
};

// ---- targeting ----
// Every shooting tower carries an aim mode the player can flip at any time.
// "first" is the classic default: whoever is furthest along the road, i.e.
// closest to the castle.
export const AIM_MODES = [
  { id: "first", label: "First", hint: "the foe closest to your castle" },
  { id: "last", label: "Last", hint: "the foe furthest back down the road" },
  { id: "strong", label: "Strong", hint: "the most health left" },
  { id: "weak", label: "Weak", hint: "the least health left — finish them off" },
  { id: "most", label: "Most", hint: "wherever the blast catches the biggest crowd" },
];

// Which modes a given tower may use: "Most" only means something for a tower
// whose shots splash, and towers that hit everything at once (spike rings,
// flame novas) never pick a foe at all.
export const aimModes = (t, st) => {
  // no aim orders for towers that don't pick a foe: knights hold ground,
  // auras and traps don't aim, the sunforge beam swears itself to the
  // mightiest, and the gold works only aims at your purse
  // the Covert takes standing orders no other tower understands
  if (t.kind === "assassin") return ASSASSIN_AIM;
  if (t.kind === "knight" || t.kind === "support" || t.kind === "spiker" || t.kind === "trapsmith" || t.kind === "goldworks" || t.kind === "sunforge") return [];
  return AIM_MODES.filter((m) => m.id !== "most" || st.splash > 0);
};

// The Assassin's law: the foes that keep the rest alive — healers, raisers,
// bell-ringers, banner-lords, ward-chanters — die first, no matter the crowd.
export const isPrey = (e) => !!(e.healAmt || e.raiseEvery || e.summonEvery || e.bannerRange || e.wardEvery);

// Standing orders the Covert can be given. Each names a CLASS of foe to hunt
// before all others; when none is in reach the blades take the frontmost
// instead, so an order never leaves a guildsman idle.
export const PREY_FILTERS = {
  prey: isPrey,
  healer: (e) => !!(e.healAmt || e.wardEvery),
  raiser: (e) => !!(e.raiseEvery || e.summonEvery),
  banner: (e) => !!e.bannerRange,
  brute: (e) => !!(e.boss || e.armor >= 0.3 || e.trampleMax),
};

export const ASSASSIN_AIM = [
  { id: "prey", label: "Support", hint: "healers, bells and banners — anything that props the rest up" },
  { id: "healer", label: "Healers", hint: "chant-singers and ward-casters, before anything else" },
  { id: "raiser", label: "Raisers", hint: "necromancers and bell-ringers, before anything else" },
  { id: "banner", label: "Banners", hint: "banner-lords and warchiefs, before anything else" },
  { id: "brute", label: "Armor", hint: "the armored and the mighty — bosses, plate, chargers" },
  { id: "first", label: "First", hint: "no orders — whoever is closest to your castle" },
];

// The class a tower's standing order names, or null when it hunts by position.
export const orderFilter = (t) => PREY_FILTERS[t && t.aim] || null;

// Which foe a blade goes for, by its tower's standing order. Priority-class
// foes outrank everything; a Kingslayer's order reaches the whole field.
export const pickPrey = (g, t, st) => {
  const mode = t.aim && (PREY_FILTERS[t.aim] || t.aim === "first") ? t.aim : "prey";
  const filter = PREY_FILTERS[mode] || null;
  const cx = t.rally ? t.rally.x : t.x, cy = t.rally ? t.rally.y : t.y;
  let best = null, bestScore = -Infinity;
  for (const e of g.enemies) {
    if (e.dead || e.flying) continue;             // blades don't reach the sky
    const marked = filter ? filter(e) : false;
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (d > st.range && !(marked && st.preyAnywhere)) continue;
    // a named class outranks the field; otherwise take the frontmost
    const score = marked ? 2e9 + e.hp : e.dist;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
};

// Some evolutions hunt by decree — the Ballista and Comet Sling always take
// the mightiest foe, and the player can't talk them out of it.
export const forcedAim = (st) => (st.targeting === "strongest" ? "strong" : null);

// How many foes a splash of radius r centred on `e` would also catch.
const crowdAt = (g, e, r) => {
  let n = 0;
  for (const o of g.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= r) n++;
  return n;
};

// The foe a tower shoots this volley, or null if nothing is in reach.
// Each mode is a score to maximise, so the scan stays a single pass.
export const pickTarget = (g, t, st) => {
  const mode = forcedAim(st) || t.aim || "first";
  const min = st.minRange || 0;
  let best = null, bestScore = -Infinity;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    if (d > st.range || d < min) continue;
    let score;
    if (mode === "last") score = -e.dist;
    else if (mode === "strong") score = e.hp;
    else if (mode === "weak") score = -e.hp;
    // crowd first, then the frontmost of equally crowded spots
    else if (mode === "most") score = crowdAt(g, e, st.splash) * 1e6 + e.dist;
    else score = e.dist;
    // a falconer's bird takes the sky before anything on the ground
    if (st.airMult && e.flying) score += 1e9;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
};

// World positions where a garrison's knights stand, around its rally flag.
export const unitSlots = (t) => {
  const n = getStats(t).count || 1;
  const base = [[0, -11], [-14, 3], [14, 3], [0, 15]];
  return base.slice(0, n).map(([dx, dy]) => [t.rally.x + dx, t.rally.y + dy]);
};

// Ensure a garrison has the right number of knight units, and refresh their max HP.
// Pass `g` when enemies may be engaged, so trimmed units release their foes.
export const syncUnits = (t, g) => {
  const st = getStats(t);
  const n = st.count || 1;
  if (!t.units) t.units = [];
  if (t.units.length > n) {
    // count shrank (e.g. Grand Champion): living units stay, extras stand down
    t.units.sort((a, b) => (a.state === "dead") - (b.state === "dead"));
    for (const u of t.units.slice(n)) {
      const e = g?.enemies.find((x) => x.blockedBy === u.id);
      if (e) { e.blockedBy = null; e.engaged = false; }
    }
    t.units.length = n;
  }
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
    id: nextId(), kind, x, y, level, branch, rank4, cd: 0, aim: "first",
    invested: invested ?? TOWERS[kind].cost, lastAim: -Math.PI / 2, anim: 0, shotIdx: 0, critIdx: 0,
  };
  if (kind === "knight") {
    // knights muster just south of their hall by default
    t.rally = { x, y: y + 28 };
    syncUnits(t);
  }
  if (kind === "assassin") {
    // the covert's blades muster in the grass a little downroad of the tent
    t.rally = { x, y: y + 30 };
    t.aim = "prey";
    syncUnits(t);
  }
  if (kind === "trapsmith") { t.charges = 1; t.chargeCd = 0; }   // one trap ready at ribbon-cutting
  if (kind === "sunforge") { t.ramp = 1; t.beamId = null; }
  return t;
};
