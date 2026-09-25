// ============ BANDS ============
// Fighters who are not towers: the militia the crown can call for nothing,
// and the hero who rides with the campaign. They use the garrison's melee
// machinery — rally point, slots, blocking, respawn — with their own stats.

// The militia: two farmers with pitchforks, summoned wherever you tap, who
// hold the road for a while and then go home. Free, on a cooldown.
export const MILITIA = {
  name: "Militia", icon: "🌾",
  blurb: "Two farmers with pitchforks answer the horn wherever you point — free, for a short while, and again when the cooldown ends.",
  count: 2, hp: 95, dmg: 9, rate: 700, range: 60, unitSpeed: 90,
  life: 15000, cooldown: 24000, respawnMs: 999999,
};

// Heroes start every map at level 1 and grow during the battle, up to
// level 20: each level adds health and damage. XP comes from foes that fall
// by or near the hero, and from every scripted wave the realm survives
// (WAVE_XP), so an active hero reaches about level 10 by the end of a
// map's scripted waves and keeps climbing in the Endless March.
export const HEROES = {
  aldric: {
    name: "Sir Aldric", title: "the Steadfast", rig: "heroKnight", icon: "⚔",
    blurb: "A knight of the old order: the hardest blocker on the field, and he only gets harder. Every third blow is a shield-bash that stuns.",
    base: { hp: 280, dmg: 26, rate: 720, range: 100, unitSpeed: 105, respawnMs: 12000, stun: 0.34, stunDur: 900 },
    perLevel: { hp: 42, dmg: 5 },
  },
  wren: {
    name: "Wren", title: "of the Greenwood", rig: "heroHunter", icon: "🏹",
    blurb: "A huntress who holds nothing and kills from a distance. Her arrows pierce armor and hobble what they hit, and she is quick to be back on her feet.",
    base: { hp: 180, dmg: 21, rate: 470, range: 155, unitSpeed: 125, respawnMs: 9000, ranged: true, pierce: true, slow: 0.3, slowDur: 1100 },
    perLevel: { hp: 22, dmg: 4 },
  },
};
export const HERO_MAX_LEVEL = 20;
// xp to the next level: steepening, so a hero parked in the thickest fight
// runs a little ahead of the pack rather than far ahead (sims: level 9-13
// by the end of a map's script, depending on where he stands)
export const heroXpFor = (level) => Math.round(20 + 1.2 * level * level);
// the xp the hero earns for each wave cleared: a whole script is worth ~360
// xp (about level 8-9) whatever its length; kills near him make up the rest
export const waveXp = (scriptedCount) => Math.ceil(360 / Math.max(1, scriptedCount));

// ---- talents ----
// Every level a hero gains in battle banks one TALENT POINT for that hero,
// kept for good in the profile (profile.heroes[key].points) across maps,
// modes and campaigns. Points buy ranks in five talents; each talent has
// five ranks costing TALENT_COSTS. `apply(st, r)` bends the hero's stats
// for rank r; the engine rebuilds the stats every tick, so a rank bought
// mid-battle bites at once.
export const TALENT_COSTS = [10, 12, 15, 20, 25];
export const TALENT_RANKS = TALENT_COSTS.length;
export const HERO_TALENTS = {
  aldric: [
    { id: "bulwark", name: "Bulwark", desc: "+10% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.1 * r)); } },
    { id: "edge", name: "Keen Edge", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "swift", name: "Swift Blade", desc: "Swings 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "bash", name: "Shield Bash", desc: "Stuns more often (+5% a rank) and for longer (+0.15s a rank).", apply: (st, r) => { st.stun = Math.min(0.9, st.stun + 0.05 * r); st.stunDur += 150 * r; } },
    { id: "wind", name: "Second Wind", desc: "Back on his feet 12% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.12 * r)); } },
  ],
  wren: [
    { id: "deadeye", name: "Deadeye", desc: "+8% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.08 * r); } },
    { id: "quick", name: "Quick Draw", desc: "Looses 5% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.05 * r)); } },
    { id: "long", name: "Longbow", desc: "+7% range a rank.", apply: (st, r) => { st.range = Math.round(st.range * (1 + 0.07 * r)); } },
    { id: "hobble", name: "Hobbling Shot", desc: "Slows harder (+5% a rank) and longer (+0.2s a rank).", apply: (st, r) => { st.slow = Math.min(0.7, st.slow + 0.05 * r); st.slowDur += 200 * r; } },
    { id: "split", name: "Split Shot", desc: "A 10% chance a rank to loose a second arrow at another foe.", apply: (st, r) => { st.split = 0.1 * r; } },
  ],
};
// what the next rank of a talent costs, or null when it is maxed
export const talentCost = (rank) => (rank < TALENT_RANKS ? TALENT_COSTS[rank] : null);
// points already sunk into a hero's talents (a reset hands them all back)
export const talentsSpent = (talents) => Object.values(talents || {}).reduce((a, r) => a + TALENT_COSTS.slice(0, r || 0).reduce((x, y) => x + y, 0), 0);

export const heroStats = (key, level, talents = null) => {
  const h = HEROES[key];
  if (!h) return null;
  const l = Math.max(0, level - 1);
  const st = { ...h.base, hp: h.base.hp + h.perLevel.hp * l, dmg: h.base.dmg + h.perLevel.dmg * l, count: 1 };
  if (talents) for (const t of HERO_TALENTS[key] || []) { const r = Math.min(TALENT_RANKS, talents[t.id] || 0); if (r > 0) t.apply(st, r); }
  return st;
};
