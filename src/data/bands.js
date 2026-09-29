// ============ BANDS ============
// Fighters who are not towers: the militia the crown can call for nothing,
// and the hero who rides with the campaign. They use the garrison's melee
// machinery — rally point, slots, blocking, respawn — with their own stats.

// The militia: two farmers with pitchforks, summoned wherever you tap, who
// hold the road for a while and then go home. Free, on a cooldown.
export const MILITIA = {
  name: "Militia", icon: "",
  blurb: "Two farmers with pitchforks answer the horn wherever you point — free, for a short while, and again when the cooldown ends.",
  count: 2, hp: 95, dmg: 9, rate: 700, range: 60, unitSpeed: 90,
  life: 15000, cooldown: 24000, respawnMs: 999999,
};

// Heroes start every map at level 1 and grow during the battle, up to
// level 20: each level adds health and damage, and makes their abilities
// hit harder. XP comes ONLY from kills — full for the hero's own, a share
// for foes that fall within a few strides — weighted by the foe's bounty,
// so an active hero reaches about level 9-10 by the end of a map's scripted
// waves (measure with scripts/sim.mjs --hero-at) and keeps climbing in the
// Endless March. At the end of a WON map's scripted waves the hero's level
// is paid out as HERO STARS (profile.js bankHeroStars), which buy talents
// and ability upgrades on the Home Screen only — never mid-battle.
export const HEROES = {
  aldric: {
    name: "Sir Aldric", title: "the Steadfast", rig: "heroKnight", icon: "",
    blurb: "A knight of the old order: the hardest blocker on the field, and he only gets harder. Every third blow is a shield-bash that stuns.",
    base: { hp: 280, dmg: 26, rate: 720, range: 100, unitSpeed: 105, respawnMs: 12000, stun: 0.34, stunDur: 900 },
    perLevel: { hp: 42, dmg: 5 },
  },
  wren: {
    name: "Wren", title: "of the Greenwood", rig: "heroHunter", icon: "",
    blurb: "A huntress who holds nothing and kills from a distance. Her arrows pierce armor and hobble what they hit, and she is quick to be back on her feet.",
    base: { hp: 180, dmg: 21, rate: 470, range: 155, unitSpeed: 125, respawnMs: 9000, ranged: true, pierce: true, slow: 0.3, slowDur: 1100 },
    perLevel: { hp: 22, dmg: 4 },
  },
};
export const HERO_MAX_LEVEL = 20;
// THE RETINUE: a hero who climbs high enough is joined on the field by a
// follower at each level in `at` — Sir Aldric by squires who hold the road
// beside him as knights do, Wren by archers who shoot from behind her. They
// march wherever the hero is sent, fall and come back after respawnMs, and
// their kills near the hero still teach him (killXp's share). They belong to
// the battle, like the hero's level: every map starts without them.
export const HERO_RETINUE = {
  aldric: { name: "Squire", rig: "squire", at: [10, 20], joins: "a squire rides to his side!",
    st: { hp: 380, dmg: 30, rate: 760, range: 80, unitSpeed: 105, respawnMs: 10000 } },
  wren: { name: "Archer", rig: "bowman", at: [10, 20], joins: "an archer takes up the bow beside her!",
    st: { hp: 170, dmg: 24, rate: 760, range: 150, unitSpeed: 115, respawnMs: 9000, ranged: true } },
};
// how many followers a hero at `level` has on the field
export const retinueAt = (key, level) => (HERO_RETINUE[key]?.at || []).filter((l) => level >= l).length;
// xp to the next level: each level asks a quarter more than the one before
// (owner, 2026-09-29: "they need more for each level up"), so a hero parked
// in the thickest fight runs a little ahead of the pack rather than far
// ahead, and a long map's flood of kills buys fewer and fewer levels. The
// Citadel's thirty waves took a hero to 18 on the old quadratic curve
// (20 + 1.2 L^2); on this one the same kills make about 14-15, a 20-wave map
// ends about 9-10 (was 10-12), and 20 is for the Endless March.
export const HERO_XP_FIRST = 30, HERO_XP_GROWTH = 1.25;
export const heroXpFor = (level) => Math.round(HERO_XP_FIRST * HERO_XP_GROWTH ** (level - 1));
// the xp one death teaches the hero: a foe's bounty is the measure of how
// much of a fight it was; his own kills count KILL_OWN times a nearby one
export const KILL_XP = 0.17, KILL_OWN = 2, KILL_NEAR = 90;
export const killXp = (e, own) => Math.max(1, Math.round((e.bounty || 1) * KILL_XP * (own ? KILL_OWN : 1)));

// ---- abilities ----
// Two per hero, fired by the player from the hero's menu. The first is ready
// from the start of every map; the second wakes at `unlock` (a level reached
// IN that battle). `aim`: "none" fires at once round the hero, "ground" asks
// for a spot on the map, "foe" for a foe near the tap. Numbers grow with the
// hero's level (`perLevel`) and with the ability's own upgrade line on the
// Home Screen (the talent of the same id).
export const HERO_ABILITIES = {
  aldric: [
    { id: "slam", name: "Shield Slam", aim: "none", unlock: 1, cd: 25000, icon: "slam",
      desc: "Slams the ground round him: damages and stuns every foe on foot nearby.",
      base: { dmg: 60, r: 62, stun: 1400 }, perLevel: { dmg: 12 } },
    { id: "charge", name: "Valiant Charge", aim: "ground", unlock: 5, cd: 40000, icon: "charge",
      desc: "Charges to the spot you tap, trampling and throwing back everything in his path, and holds there.",
      base: { dmg: 90, knock: 26, reach: 280, width: 22 }, perLevel: { dmg: 16 } },
  ],
  wren: [
    { id: "volley", name: "Arrow Volley", aim: "ground", unlock: 1, cd: 30000, icon: "volley",
      desc: "Arrows rain on the spot you tap for three seconds, hitting everything there — fliers too.",
      base: { dmg: 14, r: 56, dur: 3000, tick: 300 }, perLevel: { dmg: 2.5 } },
    { id: "heart", name: "Heartseeker", aim: "foe", unlock: 5, cd: 45000, icon: "heart",
      desc: "One great armor-piercing shot at the BIGGEST foe near where you tap — made for bosses.",
      base: { dmg: 280, pick: 80 }, perLevel: { dmg: 48 } },
  ],
};
export const heroAbilities = (key) => HERO_ABILITIES[key] || [];

// ---- talents: bought with hero stars on the Home Screen ----
// Five stat talents and one upgrade line per ability, five ranks each at
// TALENT_COSTS. `apply(st, r)` bends the hero's stats (and `st.abil`, the
// ability numbers) for rank r.
export const TALENT_COSTS = [5, 6, 8, 10, 13];
export const TALENT_RANKS = TALENT_COSTS.length;
// an ability line: +12% damage and 8% off the cooldown a rank, plus `more`
const abilityLine = (id, name, extra, more) => ({
  id, name, ability: true,
  desc: `${name}: +12% damage and 8% faster to recharge a rank${extra ? `; ${extra}` : ""}.`,
  apply: (st, r) => { const a = st.abil[id]; a.dmg *= 1 + 0.12 * r; a.cd = Math.round(a.cd * (1 - 0.08 * r)); if (more) more(a, r); },
});
export const HERO_TALENTS = {
  aldric: [
    { id: "bulwark", name: "Bulwark", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "edge", name: "Keen Edge", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "swift", name: "Swift Blade", desc: "Swings 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "bash", name: "Shield Bash", desc: "Stuns more often (+5% a rank) and for longer (+0.15s a rank).", apply: (st, r) => { st.stun = Math.min(0.9, st.stun + 0.05 * r); st.stunDur += 150 * r; } },
    { id: "wind", name: "Second Wind", desc: "Back on his feet 12% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.12 * r)); } },
    abilityLine("slam", "Shield Slam", "a wider ring and a longer stun", (a, r) => { a.r += 5 * r; a.stun += 150 * r; }),
    abilityLine("charge", "Valiant Charge", "throws foes further back", (a, r) => { a.knock += 5 * r; }),
  ],
  wren: [
    { id: "deadeye", name: "Deadeye", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "quick", name: "Quick Draw", desc: "Looses 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "long", name: "Longbow", desc: "+7% range a rank.", apply: (st, r) => { st.range = Math.round(st.range * (1 + 0.07 * r)); } },
    { id: "hobble", name: "Hobbling Shot", desc: "Slows harder (+5% a rank) and longer (+0.2s a rank).", apply: (st, r) => { st.slow = Math.min(0.7, st.slow + 0.05 * r); st.slowDur += 200 * r; } },
    { id: "split", name: "Split Shot", desc: "A 10% chance a rank to loose a second arrow at another foe.", apply: (st, r) => { st.split = 0.1 * r; } },
    abilityLine("volley", "Arrow Volley", "a wider rain", (a, r) => { a.r += 5 * r; }),
    abilityLine("heart", "Heartseeker", null),
  ],
};
// what the next rank of a talent costs, or null when it is maxed
export const talentCost = (rank) => (rank < TALENT_RANKS ? TALENT_COSTS[rank] : null);
// stars already sunk into a hero's talents (a reset hands them all back)
export const talentsSpent = (talents) => Object.values(talents || {}).reduce((a, r) => a + TALENT_COSTS.slice(0, r || 0).reduce((x, y) => x + y, 0), 0);

export const heroStats = (key, level, talents = null) => {
  const h = HEROES[key];
  if (!h) return null;
  const l = Math.max(0, level - 1);
  const st = { ...h.base, hp: h.base.hp + h.perLevel.hp * l, dmg: h.base.dmg + h.perLevel.dmg * l, count: 1 };
  // the abilities, grown with the level; their upgrade lines bend them below
  st.abil = {};
  for (const a of heroAbilities(key)) {
    const n = { ...a.base, cd: a.cd };
    for (const [k, v] of Object.entries(a.perLevel || {})) n[k] = (n[k] || 0) + v * l;
    st.abil[a.id] = n;
  }
  if (talents) for (const t of HERO_TALENTS[key] || []) { const r = Math.min(TALENT_RANKS, talents[t.id] || 0); if (r > 0) t.apply(st, r); }
  return st;
};
