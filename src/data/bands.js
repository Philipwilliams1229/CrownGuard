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
    base: { hp: 320, dmg: 32, rate: 720, range: 100, unitSpeed: 105, respawnMs: 12000, stun: 0.34, stunDur: 900 },
    perLevel: { hp: 42, dmg: 5 },
  },
  wren: {
    name: "Wren", title: "of the Greenwood", rig: "heroHunter", icon: "🏹",
    blurb: "A huntress who holds nothing and kills from a distance. Her arrows pierce armor, and she is quick to be back on her feet.",
    base: { hp: 190, dmg: 24, rate: 520, range: 150, unitSpeed: 125, respawnMs: 9000, ranged: true, pierce: true },
    perLevel: { hp: 22, dmg: 4 },
  },
};
export const HERO_MAX_LEVEL = 10;
export const heroXpFor = (level) => 6 + level * 5;   // kills to the next level

export const heroStats = (key, level) => {
  const h = HEROES[key];
  if (!h) return null;
  const l = Math.max(0, level - 1);
  return { ...h.base, hp: h.base.hp + h.perLevel.hp * l, dmg: h.base.dmg + h.perLevel.dmg * l, count: 1 };
};
