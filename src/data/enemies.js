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
//   summon*        it conjures fresh enemies onto the road as it walks
//   splitInto      [type, count] — cut it down and it comes apart into these
//   deathBurst     {r, dmg, dps, dur} — dies violently: hurts knights in r,
//                  and leaves plague ground that keeps hurting them

export const ENEMIES = {
  // ---- THE GREENWOOD HORDE ----
  goblin: {
    faction: "greenwood", hp: 48, speed: 82, bounty: 6, armor: 0, size: 15,
    name: "Goblin Raider", atk: 10, atkRate: 800, castleDmg: 1,
    // a raiding party is a mix: hooded cutpurses who run ahead, and
    // bare-eared footpads who keep the pace. Picked per spawn.
    variants: [
      { sprite: "goblin", speedMul: 1.15 },
      { sprite: "goblinBare", speedMul: 1 },
    ],
    note: "Fragile foot-thieves, dangerous only in a party — and a party is what they travel in. The hooded ones run ahead.",
  },
  wolf: { faction: "greenwood", hp: 37, speed: 145, bounty: 6, armor: 0, size: 15, name: "Dire Wolf", atk: 12, atkRate: 650, castleDmg: 1, note: "Extremely fast. Slows and stuns bring it to heel." },
  orc: { faction: "greenwood", hp: 118, speed: 62, bounty: 10, armor: 0, size: 18, name: "Orc", atk: 22, atkRate: 900, castleDmg: 2, note: "A heavy bruiser with a big pool of health." },
  armored: { faction: "greenwood", hp: 185, speed: 55, bounty: 14, armor: 0.42, size: 17, name: "Ironclad", atk: 18, atkRate: 900, castleDmg: 2, note: "Half of all physical damage bounces off — magic ignores its armor." },
  troll: { faction: "greenwood", hp: 430, speed: 40, bounty: 26, armor: 0.15, regen: 5, size: 21, name: "Troll", atk: 38, atkRate: 1100, castleDmg: 3, note: "Regenerates health and hits knights hard. Burst it down fast." },
  shaman: { faction: "greenwood", hp: 132, speed: 60, bounty: 16, armor: 0, mres: 0.6, size: 16, name: "Goblin Shaman", atk: 8, atkRate: 1000, castleDmg: 2, heal: 8, healEvery: 3400, note: "Rune-warded — most magic fizzles against him. His chant mends the WHOLE warband. Silence the healer first." },
  necro: { faction: "greenwood", hp: 420, speed: 52, bounty: 45, armor: 0.1, mres: 0.35, size: 20, name: "Necromancer", atk: 16, atkRate: 1100, castleDmg: 3, raiseEvery: 6000, note: "Where he walks, the fallen rise: slain goblins, wolves, and orcs return as half-strength undead. Fell him before the dead outnumber the living." },
  bat: {
    faction: "greenwood", hp: 30, speed: 135, bounty: 4, armor: 0, size: 12,
    name: "Fell Bat", flying: true, atk: 0, atkRate: 0, castleDmg: 1,
    note: "A shrieking scrap of wing and teeth. It flies clean over your knights — but almost anything that hits it, ends it.",
  },
  boarrider: {
    faction: "greenwood", hp: 140, speed: 108, bounty: 13, armor: 0.1, size: 19,
    name: "Boar Rider", atk: 20, atkRate: 800, castleDmg: 2, trample: 1,
    note: "A goblin lancer on an angry boar. The charge flattens the first knight who steps up and thunders on — only the second blocker holds it.",
  },
  hobgoblin: {
    faction: "greenwood", hp: 330, speed: 64, bounty: 32, armor: 0.2, size: 20,
    name: "Hobgoblin Warchief", atk: 30, atkRate: 900, castleDmg: 3,
    bannerRange: 130, bannerSpeed: 0.22, bannerArmor: 0.12,
    note: "The big one with the totem stick. Every goblin, wolf and boar marching near him is faster and harder to kill. Break the totem and the party breaks with it.",
  },
  // MOTHBALLED, not retired: the raft goblin is built, drawn and working —
  // it simply isn't fielded. To bring it back, add ["rafter", 5, 900] to a
  // greenwood wave in factions.js and/or { type: "rafter", cost: 2.4, gap: 620 }
  // to that faction's endless roster. The `swims` engine seam it rides on is
  // shared with the player's river craft and stays live either way.
  rafter: {
    faction: "greenwood", hp: 96, speed: 94, bounty: 9, armor: 0, size: 17,
    name: "Raft Goblin", atk: 10, atkRate: 900, castleDmg: 2, swims: true,
    note: "Where there is a river, they take it — paddling past your whole line to climb out at the bridge. No sword reaches them on the water; only shot does. Where there is no river, they simply run.",
  },
  dragon: { faction: "greenwood", hp: 3800, speed: 34, bounty: 120, armor: 0.3, size: 27, name: "DRAGON", boss: true, flying: true, atk: 0, atkRate: 0, castleDmg: 5, note: "Boss. Flies over the road — knights cannot block it." },

  // ---- THE IRON KINGDOM ----
  // A real army: drilled, shielded, and it shoots back.
  levy: {
    faction: "iron", hp: 54, speed: 78, bounty: 7, armor: 0.1, size: 16,
    name: "Iron Levy", atk: 14, atkRate: 850, castleDmg: 1, guard: 2,
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
  gryphon: {
    faction: "iron", hp: 220, speed: 92, bounty: 24, armor: 0.2, size: 21,
    name: "Gryphon Knight", flying: true, atk: 0, atkRate: 0, castleDmg: 2,
    note: "A knight on a warbred gryphon, armored wing to talon. It sails over every blocker you have, and its plate turns arrows — magic pulls it out of the sky fastest.",
  },
  marshal: {
    faction: "iron", hp: 4200, speed: 48, bounty: 110, armor: 0.35, size: 24,
    name: "LORD MARSHAL", boss: true, atk: 44, atkRate: 1000, castleDmg: 5, trample: 2, trampleEvery: 3200,
    bannerRange: 115, bannerSpeed: 0.3, bannerArmor: 0.2,
    note: "Boss. His banner drives the whole column faster and harder — every soldier near him is quicker and better armored, and he rides down the first two knights that try to hold him. Cut down the banner and the army falters.",
  },

  // ---- THE HOLLOW COURT ----
  // The dead of a drowned kingdom. They come in floods, they keep coming
  // while their callers stand, and killing some of them is its own mistake.
  skeleton: {
    faction: "hollow", hp: 44, speed: 70, bounty: 5, armor: 0, mres: 0.15, size: 15,
    name: "Risen", atk: 9, atkRate: 850, castleDmg: 1,
    note: "A dead soldier walking under someone else's orders. Worth almost nothing, stops almost nothing — and arrives in floods that do not end.",
  },
  ghoul: {
    faction: "hollow", hp: 72, speed: 124, bounty: 8, armor: 0, size: 16,
    name: "Ghoul", atk: 14, atkRate: 700, castleDmg: 1,
    note: "It remembers being hungry, and nothing else. Comes on all fours, fast as a wolf, and does not tire.",
  },
  bonearcher: {
    faction: "hollow", hp: 66, speed: 68, bounty: 10, armor: 0, mres: 0.15, size: 16,
    name: "Barrow Archer", atk: 8, atkRate: 1000, castleDmg: 1,
    rangedAtk: 10, rangedRange: 80, rangedRate: 2000,
    note: "Grave-cold fingers on a yew bow, loosing at your knights from outside sword reach. Dead men need no fletching lessons.",
  },
  wraith: {
    faction: "hollow", hp: 95, speed: 78, bounty: 14, armor: 0, mres: 0.55, size: 17,
    name: "Wraith", flying: true, atk: 0, atkRate: 0, castleDmg: 2,
    note: "A drowned soul that drifts over blades and blockers alike, and most magic passes through it like mist. Plain honest arrows are what it fears.",
  },
  ghast: {
    faction: "hollow", hp: 175, speed: 52, bounty: 16, armor: 0, size: 18,
    name: "Plague Ghast", atk: 16, atkRate: 900, castleDmg: 2,
    deathBurst: { r: 55, dmg: 26, dps: 12, dur: 3500 },
    note: "Swollen with grave-rot. Kill it at arm's length and it bursts — scalding every knight nearby and leaving a pool of filth that keeps eating at them. Kill it FAR from your line, or let the towers do it.",
  },
  crypt: {
    faction: "hollow", hp: 560, speed: 40, bounty: 30, armor: 0.45, mres: 0.25, guard: 2, size: 21,
    name: "Crypt Warden", atk: 34, atkRate: 1000, castleDmg: 3,
    note: "It carries its own sarcophagus lid as a shield: the first two blows from any tower glance off it, and the plate under it turns half of what follows. Patience, and something heavy.",
  },
  gravecaller: {
    faction: "hollow", hp: 230, speed: 55, bounty: 26, armor: 0, mres: 0.4, size: 18,
    name: "Gravecaller", atk: 10, atkRate: 1000, castleDmg: 2,
    summonEvery: 5600, summonType: "skeleton", summonCount: 2,
    note: "A robed thing with a bell. Every toll pulls two more Risen up out of the road itself — the flood has a source, and this is it. Silence the bell.",
  },
  amalgam: {
    faction: "hollow", hp: 790, speed: 36, bounty: 40, armor: 0.2, size: 23,
    name: "Grave Amalgam", atk: 30, atkRate: 1100, castleDmg: 3,
    splitInto: ["ghoul", 3],
    note: "Many dead things stitched into one slow tide of a body. Cutting it down is half the work: it comes apart into three ghouls at a sprint.",
  },
  hollowking: {
    faction: "hollow", hp: 4400, speed: 42, bounty: 130, armor: 0.25, mres: 0.5, immStun: true, size: 26,
    name: "THE HOLLOW KING", boss: true, atk: 40, atkRate: 1000, castleDmg: 5,
    summonEvery: 4400, summonType: "skeleton", summonCount: 2,
    note: "Boss. The drowned crown itself. Stuns break against his will, half your magic drowns in him — and every few heartbeats he calls more dead out of the ground to walk in front of him. The court dies when the King does.",
  },
};
