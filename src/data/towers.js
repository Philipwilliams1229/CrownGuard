// ============ TOWERS ============
// Every tower's cost, per-level stats, and its permanent evolution branches.

export const TOWERS = {
  archer: {
    name: "Archer Tower", cost: 100, dtype: "phys", proj: "arrow",
    blurb: "Quick arrows. Each recruit on the platform looses their own shaft.",
    levels: [
      { dmg: 14, rate: 750, range: 130 },
      { dmg: 26, rate: 700, range: 140, cost: 80, label: "Twin Archers" },
      { dmg: 42, rate: 650, range: 150, cost: 120, label: "Archer Trio" },
    ],
    branches: {
      a: { name: "Ranger Company", cost: 210, stats: { dmg: 13, rate: 155, range: 120 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor." },
      b: { name: "Master Longbowman", cost: 210, stats: { dmg: 210, rate: 2100, range: 275, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map." },
    },
  },
  knight: {
    name: "Knight Garrison", cost: 80, dtype: "phys", proj: "units",
    blurb: "A knight marches out to hold an enemy in melee. Upgrades add more swords.",
    levels: [
      { dmg: 16, rate: 800, range: 100, hp: 110, count: 1 },
      { dmg: 21, rate: 760, range: 105, hp: 150, count: 2, cost: 90, label: "Second Sword" },
      { dmg: 28, rate: 720, range: 110, hp: 200, count: 3, cost: 130, label: "Shield Brothers" },
    ],
    branches: {
      a: { name: "Paladin Order", cost: 230, stats: { dmg: 36, rate: 800, range: 115, hp: 280, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 7 }, desc: "Three radiant paladins: MAGIC blows that ignore armor, chance to stun, and they mend their own wounds." },
      b: { name: "Berserker Hall", cost: 230, stats: { dmg: 20, rate: 320, range: 115, hp: 150, count: 4 }, desc: "FOUR berserkers with whirling axes. Frailer than knights, but a storm of steel." },
    },
  },
  wizard: {
    name: "Wizard Spire", cost: 140, dtype: "magic", proj: "orb",
    blurb: "Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.",
    levels: [
      { dmg: 20, rate: 1300, range: 120, splash: 55 },
      { dmg: 34, rate: 1250, range: 128, splash: 60, cost: 100, label: "Adept Circle" },
      { dmg: 52, rate: 1200, range: 136, splash: 66, cost: 150, label: "High Sorcery" },
    ],
    branches: {
      a: { name: "Pyromancer", cost: 250, stats: { dmg: 46, rate: 1200, range: 140, splash: 90, burn: 14, burnDur: 3000 }, desc: "Fireballs with a huge blast that set enemies ablaze — burning damage over time." },
      b: { name: "Frost Archmage", cost: 250, stats: { dmg: 36, rate: 1150, range: 140, splash: 80, slow: 0.45, slowDur: 2000 }, desc: "Glacial bursts chill everything hit, slowing the horde by 45%." },
    },
  },
  support: {
    name: "Warden Priest", cost: 110, dtype: "magic", proj: "aura",
    blurb: "A priest on an altar rains blessings — every enemy in the aura is slowed.",
    levels: [
      { slow: 0.15, range: 100, rate: 0 },
      { slow: 0.2, range: 110, rate: 0, cost: 80, label: "Consecrated Altar" },
      { slow: 0.25, range: 120, rate: 0, cost: 120, label: "High Sanctum" },
    ],
    branches: {
      a: { name: "Sanctuary of Mending", cost: 220, stats: { slow: 0.12, heal: 22, range: 135 }, desc: "Holy light: a faint slow, but wounded knights standing in it are mended (22 hp/s)." },
      b: { name: "Chronomancer", cost: 220, stats: { slow: 0.4, range: 135 }, desc: "Time thickens — every enemy in the aura is slowed by 40%." },
      c: { name: "Battle Standard", cost: 220, stats: { slow: 0.1, buff: 0.5, range: 135 }, desc: "A war banner: knights fighting in its light strike 50% HARDER. Keeps a slight slow." },
    },
  },
};
