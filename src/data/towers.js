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
      a: {
        name: "Ranger Company", cost: 210, stats: { dmg: 13, rate: 155, range: 120 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor.",
        rank4: {
          a: { name: "Briar Rangers", cost: 320, stats: { dmg: 13, rate: 150, range: 130, poison: 9, poisonDur: 2600, poisonCap: 36 }, desc: "Arrows dipped in briar venom: every hit stacks a poison that gnaws through armor and regeneration alike." },
          b: { name: "Hawkeye Conclave", cost: 320, stats: { dmg: 15, rate: 160, range: 145, chain: 1, chainRange: 95 }, desc: "Impossible shots — every arrow ricochets off its mark into a second foe nearby." },
        },
      },
      b: {
        name: "Master Longbowman", cost: 210, stats: { dmg: 210, rate: 2100, range: 275, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map.",
        rank4: {
          a: { name: "Ballista", cost: 340, stats: { dmg: 540, rate: 3600, range: 900, pierce: true, bolt: true, targeting: "strongest" }, desc: "A colossal siege bow. Slow, screaming bolts that always hunt the MIGHTIEST enemy on the field — anywhere on the field." },
          b: { name: "Dragonslayer", cost: 340, stats: { dmg: 230, rate: 2000, range: 300, pierce: true, crit: 3, critMult: 3 }, desc: "Forged to fell wyrms: every THIRD shot is a devastating triple-damage heartseeker." },
        },
      },
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
  catapult: {
    name: "Catapult", cost: 120, dtype: "phys", proj: "rock",
    blurb: "Lobs boulders in a high arc — heavy splash at long range, but blind up close.",
    levels: [
      { dmg: 36, rate: 2600, range: 190, minRange: 70, splash: 58 },
      { dmg: 58, rate: 2500, range: 205, minRange: 70, splash: 64, cost: 110, label: "Reinforced Arm" },
      { dmg: 84, rate: 2400, range: 220, minRange: 70, splash: 70, cost: 160, label: "Master Engineers" },
    ],
    branches: {
      a: { name: "Trebuchet", cost: 240, stats: { dmg: 200, rate: 4200, range: 460, minRange: 100, splash: 88 }, desc: "One colossal counterweighted arm. Boulders fall from the sky across nearly the whole field — but its blind circle grows." },
      b: { name: "Scattershot", cost: 240, stats: { dmg: 30, rate: 2300, range: 190, minRange: 60, splash: 42, shots: 3 }, desc: "Hurls a fan of THREE stones every volley, blanketing the road in overlapping blasts. Melts tight packs." },
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
