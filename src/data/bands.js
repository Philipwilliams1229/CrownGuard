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

// Heroes level with kills. Levels persist through the campaign.
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
export const HERO_MAX_LEVEL = 10;
export const heroXpFor = (level) => 6 + level * 5;   // kills to the next level

// ---- talents ----
// Every level past the first earns the hero one talent point. Each hero has
// five talents of three ranks — fifteen ranks for nine points — so a hero
// at the top of his road is still a choice, not a checklist. `apply(st, r)`
// bends the hero's stats for rank r (1-3); the engine rebuilds the stats
// every tick, so a point spent mid-battle bites at once. Picks are kept in
// the campaign progress (heroes[key].talents) and can be reset for free in
// the War Council.
export const TALENT_RANKS = 3;
export const HERO_TALENTS = {
  aldric: [
    { id: "bulwark", name: "Bulwark", desc: "+15% health a rank.", apply: (st, r) => { st.hp = Math.round(st.hp * (1 + 0.15 * r)); } },
    { id: "edge", name: "Keen Edge", desc: "+12% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.12 * r); } },
    { id: "swift", name: "Swift Blade", desc: "Swings 8% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.08 * r)); } },
    { id: "bash", name: "Shield Bash", desc: "Stuns more often (+8% a rank) and for longer (+0.2s a rank).", apply: (st, r) => { st.stun = Math.min(0.9, st.stun + 0.08 * r); st.stunDur += 200 * r; } },
    { id: "wind", name: "Second Wind", desc: "Back on his feet 20% sooner a rank.", apply: (st, r) => { st.respawnMs = Math.round(st.respawnMs * (1 - 0.2 * r)); } },
  ],
  wren: [
    { id: "deadeye", name: "Deadeye", desc: "+12% damage a rank.", apply: (st, r) => { st.dmg = st.dmg * (1 + 0.12 * r); } },
    { id: "quick", name: "Quick Draw", desc: "Looses 8% faster a rank.", apply: (st, r) => { st.rate = Math.round(st.rate * (1 - 0.08 * r)); } },
    { id: "long", name: "Longbow", desc: "+12% range a rank.", apply: (st, r) => { st.range = Math.round(st.range * (1 + 0.12 * r)); } },
    { id: "hobble", name: "Hobbling Shot", desc: "Slows harder (+7% a rank) and longer (+0.25s a rank).", apply: (st, r) => { st.slow = Math.min(0.7, st.slow + 0.07 * r); st.slowDur += 250 * r; } },
    { id: "split", name: "Split Shot", desc: "A 15% chance a rank to loose a second arrow at another foe.", apply: (st, r) => { st.split = 0.15 * r; } },
  ],
};
// points earned by a hero of this level, and points already spent
export const talentPoints = (level) => Math.max(0, Math.min(HERO_MAX_LEVEL, level) - 1);
export const talentsSpent = (talents) => Object.values(talents || {}).reduce((a, r) => a + (r || 0), 0);
// can one more rank of talent `id` be bought for this hero?
export const canTalent = (key, level, talents, id) => {
  const t = HERO_TALENTS[key]?.find((x) => x.id === id);
  return !!t && (talents?.[id] || 0) < TALENT_RANKS && talentsSpent(talents) < talentPoints(level);
};

export const heroStats = (key, level, talents = null) => {
  const h = HEROES[key];
  if (!h) return null;
  const l = Math.max(0, level - 1);
  const st = { ...h.base, hp: h.base.hp + h.perLevel.hp * l, dmg: h.base.dmg + h.perLevel.dmg * l, count: 1 };
  if (talents) for (const t of HERO_TALENTS[key] || []) { const r = Math.min(TALENT_RANKS, talents[t.id] || 0); if (r > 0) t.apply(st, r); }
  return st;
};
