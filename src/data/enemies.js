// ============ ENEMIES ============
// Base stats for every foe in the game, grouped by the faction that fields
// them. Which of these actually march is decided by the chosen faction in
// factions.js; this file is just the bestiary. Wave HP scaling is applied on
// top at spawn time.
//
// Recurring flags:
//   armor / mres   fraction of physical / magic damage shrugged off
//   guard          discrete tower hits absorbed down to a scratch
//   immSlow        slows and chills do nothing
//   immStun        stuns and freezes do nothing
//   trample        melee blocks it can smash through before being held
//   flying         knights cannot block it at all
//   ranged*        it shoots your knights from outside their reach
//   ward*          it hands out `guard` to nearby allies
//   banner*        it buffs the speed and armor of everything around it

export const ENEMIES = {
  // ---- THE GREENWOOD HORDE ----
  goblin: { faction: "greenwood", hp: 48, speed: 82, bounty: 6, armor: 0, size: 15, name: "Goblin", atk: 10, atkRate: 800, castleDmg: 1, note: "Fragile foot soldier — dangerous only in a swarm." },
  wolf: { faction: "greenwood", hp: 37, speed: 145, bounty: 6, armor: 0, size: 15, name: "Dire Wolf", atk: 12, atkRate: 650, castleDmg: 1, note: "Extremely fast. Slows and stuns bring it to heel." },
  orc: { faction: "greenwood", hp: 118, speed: 62, bounty: 10, armor: 0, size: 18, name: "Orc", atk: 22, atkRate: 900, castleDmg: 2, note: "A heavy bruiser with a big pool of health." },
  armored: { faction: "greenwood", hp: 185, speed: 55, bounty: 14, armor: 0.5, size: 17, name: "Ironclad", atk: 18, atkRate: 900, castleDmg: 2, note: "Half of all physical damage bounces off — magic ignores its armor." },
  troll: { faction: "greenwood", hp: 490, speed: 40, bounty: 26, armor: 0.15, regen: 8, size: 21, name: "Troll", atk: 38, atkRate: 1100, castleDmg: 3, note: "Regenerates health and hits knights hard. Burst it down fast." },
  shaman: { faction: "greenwood", hp: 132, speed: 60, bounty: 16, armor: 0, mres: 0.6, size: 16, name: "Goblin Shaman", atk: 8, atkRate: 1000, castleDmg: 2, heal: 12, healEvery: 2600, note: "Rune-warded — most magic fizzles against him. His chant mends the WHOLE warband. Silence the healer first." },
  necro: { faction: "greenwood", hp: 420, speed: 42, bounty: 45, armor: 0.1, mres: 0.35, size: 20, name: "Necromancer", atk: 16, atkRate: 1100, castleDmg: 3, raiseEvery: 6000, note: "Where he walks, the fallen rise: slain goblins, wolves, and orcs return as half-strength undead. Fell him before the dead outnumber the living." },
  dragon: { faction: "greenwood", hp: 3800, speed: 34, bounty: 200, armor: 0.3, size: 27, name: "DRAGON", boss: true, flying: true, atk: 0, atkRate: 0, castleDmg: 5, note: "Boss. Flies over the road — knights cannot block it." },

  // ---- THE IRON KINGDOM ----
  // A real army: drilled, shielded, and it shoots back.
  levy: {
    faction: "iron", hp: 54, speed: 78, bounty: 7, armor: 0.1, size: 16,
    name: "Levy Spearman", atk: 14, atkRate: 850, castleDmg: 1, guard: 2,
    note: "Raised shields turn the first two blows from any tower into a scratch. A hail of small arrows wastes itself here — hit them with something heavy.",
  },
  crossbow: {
    faction: "iron", hp: 62, speed: 74, bounty: 9, armor: 0, size: 16,
    name: "Crossbowman", atk: 8, atkRate: 1000, castleDmg: 1,
    rangedAtk: 11, rangedRange: 78, rangedRate: 1900,
    note: "Shoots your knights down from outside their reach, and never stops walking to do it. Kill them early or your line bleeds out.",
  },
  sergeant: {
    faction: "iron", hp: 170, speed: 60, bounty: 15, armor: 0.4, size: 18,
    name: "Knight-Sergeant", atk: 26, atkRate: 900, castleDmg: 2, immSlow: true,
    note: "Plate over padding, and too disciplined to falter — frost and briars slow him not at all. Magic still bites.",
  },
  cavalier: {
    faction: "iron", hp: 108, speed: 120, bounty: 14, armor: 0.1, size: 19,
    name: "Cavalier", atk: 24, atkRate: 800, castleDmg: 2, trample: 1,
    note: "A charging lance rides the first knight down and gallops on. Only the second blocker holds him.",
  },
  chaplain: {
    faction: "iron", hp: 160, speed: 62, bounty: 18, armor: 0.1, mres: 0.3, size: 16,
    name: "Battle Chaplain", atk: 10, atkRate: 1000, castleDmg: 2,
    wardEvery: 3400, wardHits: 1, wardRange: 82,
    note: "Speaks no healing — he lays a ward on every soldier near him that swallows one blow whole. Chip damage stops working while he lives.",
  },
  ram: {
    faction: "iron", hp: 1150, speed: 30, bounty: 40, armor: 0.35, size: 24,
    name: "Siege Ram", atk: 30, atkRate: 1200, castleDmg: 4, immSlow: true, immStun: true,
    note: "Oak and iron on six wheels. Nothing slows it, nothing stuns it, and it takes four bites out of your gate. There is no trick — kill it.",
  },
  marshal: {
    faction: "iron", hp: 4200, speed: 48, bounty: 180, armor: 0.35, size: 24,
    name: "LORD MARSHAL", boss: true, atk: 44, atkRate: 1000, castleDmg: 5, trample: 2, trampleEvery: 3200,
    bannerRange: 115, bannerSpeed: 0.3, bannerArmor: 0.2,
    note: "Boss. His banner drives the whole column faster and harder — every soldier near him is quicker and better armored, and he rides down the first two knights that try to hold him. Cut down the banner and the army falters.",
  },
};
