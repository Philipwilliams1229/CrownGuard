// ============ ENEMIES ============
// Base stats for every foe in the game, grouped by the faction that fields
// them. Which of these actually march is decided by the chosen faction in
// factions.js; this file is just the bestiary. Wave HP scaling is applied on
// top at spawn time.
//
// Recurring flags:
//   armor / mres   fraction of physical / magic damage shrugged off
//   guard          physical blows swallowed whole, one per point (the blue pips);
//                  while any stand, magic, burns and poison do nothing
//   immSlow        slows and chills do nothing
//   immStun        stuns and freezes do nothing
//   trample        melee blocks it can smash through before being held
//   crush          no one holds it: a knight (militia, squire, gate guard) who
//                  steps in front of it dies, and it rolls on; the hero keeps clear
//   flying         knights cannot block it at all
//   ranged*        it shoots your knights from outside their reach
//   ward*          it hands out `guard` to nearby allies (wardFx: its look)
//   healPct        a healer: every `healEvery` ms mends allies within `healRange`
//                  by healPct of their max health (capped at `healCap` x sqrt(wave mult))
//   packRange      it marches at the pace of the soldiers within this reach,
//                  so it stays embedded in its company instead of drifting
//   roadBlock      a wall across the whole road (all three lanes): nothing
//                  behind it can pass while it lives. Value = its half-length
//   mounted        horses ride round a siege ram (the wall never holds them)
//   escort         [type, base, perWave, gap] groups always sent in its wake
//   single         only one of its kind may be on the road at a time
//   holyOnly       physical damage passes through it — only magic hurts it
//                  (less `mres`): wizards, fire, the Paladin tree's blows
//   raisesOnKill   a knight it kills rises again as one of its kind
//   firstWave      not fielded before this wave of a campaign level; `standIn` (x2)
//                  takes its place until then (the answer to it — a Paladin hall —
//                  takes gold to reach)
//   summonAhead    its summoned foes rise in front of it, not behind
//   swarms         bunches up: stops beside any friendly soldier within this reach
//                  and claws at it, however many are already on him
//   haunts         flies, but knights can still reach out and fight it
//   banner*        it buffs the speed and armor of everything around it
//   summon*        it conjures fresh enemies onto the road as it walks (summonFirst: ms to
//                  its first toll — 0 = the instant it spawns; default a beat in)
//   splitInto      [type, count] — cut it down and it comes apart into these
//                  (splitDrop: they fall from where it flew, where it died;
//                  deathSkin: the rig its death crumbles in; splitChance: the
//                  odds it happens at all, default always — a leak or a raised
//                  body never splits one that has a chance)
//   summonAtStart  its summoned foes stream out of the wood at the start of the
//                  road, not around it (the Warchief's horn)
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
  armored: { faction: "greenwood", hp: 185, speed: 47, bounty: 14, armor: 0.42, size: 17, name: "Ironclad", atk: 18, atkRate: 900, castleDmg: 2, note: "Half of all physical damage bounces off — magic ignores its armor." },
  troll: { faction: "greenwood", hp: 430, speed: 40, bounty: 26, armor: 0.15, regen: 5, size: 21, name: "Troll", atk: 38, atkRate: 1100, castleDmg: 3, note: "Regenerates health and hits knights hard. Burst it down fast." },
  shaman: { faction: "greenwood", hp: 132, speed: 60, bounty: 16, armor: 0, mres: 0.6, size: 16, name: "Goblin Shaman", atk: 8, atkRate: 1000, castleDmg: 2, heal: 8, healEvery: 3400, packRange: 95, note: "Rune-warded — most magic fizzles against him. His chant mends the WHOLE warband. Silence the healer first." },
  necro: { faction: "greenwood", hp: 700, speed: 44, bounty: 45, armor: 0.1, mres: 0.35, size: 20, name: "Necromancer", atk: 16, atkRate: 1100, castleDmg: 3, raiseEvery: 3800, note: "Where he walks, the fallen rise: slain goblins, wolves, orcs, ironclads and trolls return as half-strength undead. Fell him before the dead outnumber the living." },
  bat: {
    faction: "greenwood", hp: 24, speed: 135, bounty: 4, armor: 0, size: 12,
    name: "Fell Bat", flying: true, atk: 0, atkRate: 0, castleDmg: 1,
    note: "A shrieking scrap of wing and teeth. It flies clean over your knights — but almost anything that hits it, ends it.",
  },
  boarrider: {
    faction: "greenwood", hp: 140, speed: 108, bounty: 13, armor: 0.1, size: 19,
    name: "Boar Rider", atk: 20, atkRate: 800, castleDmg: 2, trample: 1,
    // half the time the lancer leaps clear as the boar goes down and marches on
    // as a goblin (owner, 2026-10-03); the other half he falls with it
    splitInto: ["goblin", 1], splitDrop: true, splitChance: 0.5, deathSkin: "boarMount",
    note: "A goblin lancer on an angry boar. The charge flattens the first knight who steps up and thunders on — only the second blocker holds it. Fell the boar and the lancer, one time in two, leaps clear and marches on as a goblin.",
  },
  hobgoblin: {
    faction: "greenwood", hp: 330, speed: 64, bounty: 32, armor: 0.2, size: 20,
    name: "Hobgoblin Warchief", atk: 30, atkRate: 900, castleDmg: 3,
    bannerRange: 130, bannerSpeed: 0.22, bannerArmor: 0.12,
    // he never marches alone (waves.js partyOf) and keeps the pace of his party;
    // every 20 s his horn calls 25 more goblins out of the wood at the start of
    // the road (owner, 2026-10-03). Silence or kill him to stop the horn.
    packRange: 110,
    summonEvery: 20000, summonFirst: 12000, summonType: "goblin", summonCount: 25, summonAtStart: true,
    note: "The big one with the totem stick. Every goblin, wolf and boar marching near him is faster and harder to kill, and he marches in the thick of a goblin party. Every twenty seconds his horn calls twenty-five more goblins out of the wood. Break the totem and the party breaks with it.",
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
  // A real army: drilled, shielded, and it shoots back. The chapter after
  // the Greenwood, so it asks more from the first wave (retuned 2026-09-27:
  // tougher bodies, bigger columns, three-blow shields, battle-mages).
  levy: {
    faction: "iron", hp: 60, speed: 78, bounty: 7, armor: 0.1, size: 16,
    name: "Iron Levy", atk: 15, atkRate: 850, castleDmg: 1, guard: 3,
    note: "Three raised shields: only steel breaks them. Each swallows one physical blow whole, however big it was, and while any stand, magic and fire do nothing. Strip them with quick arrows and blades, or with something that hits the whole column at once.",
  },
  crossbow: {
    faction: "iron", hp: 72, speed: 74, bounty: 9, armor: 0, size: 16,
    name: "Crossbowman", atk: 9, atkRate: 1000, castleDmg: 1,
    rangedAtk: 12, rangedRange: 82, rangedRate: 1800,
    note: "Shoots your knights down from outside their reach, and never stops walking to do it. Kill them early or your line bleeds out.",
  },
  sergeant: {
    faction: "iron", hp: 185, speed: 60, bounty: 15, armor: 0.4, size: 18,
    name: "Knight-Sergeant", atk: 28, atkRate: 900, castleDmg: 2, immSlow: true,
    note: "Plate over padding, and too disciplined to falter — frost and briars slow him not at all. Magic still bites.",
  },
  cavalier: {
    faction: "iron", hp: 120, speed: 120, bounty: 14, armor: 0.1, size: 19,
    name: "Cavalier", atk: 25, atkRate: 800, castleDmg: 2, trample: 1, mounted: true,
    note: "A charging lance rides the first knight down and gallops on. Only the second blocker holds him. Horses ride round a siege ram, so the cavalry surge comes first and the ram and its column follow.",
  },
  chaplain: {
    faction: "iron", hp: 175, speed: 62, bounty: 18, armor: 0.1, mres: 0.3, size: 16,
    name: "Battle Chaplain", atk: 10, atkRate: 1000, castleDmg: 2,
    // a healer, not a warder (owner, 2026-09-29): every few seconds a pulse
    // mends everyone within reach by a share of their health, capped so a
    // ram or a marshal is not healed like a levy
    healPct: 0.16, healCap: 40, healEvery: 2800, healRange: 95, packRange: 95,
    note: "A field chaplain: every few seconds his prayer mends every soldier near him — a sixth of their health, a little for the mighty. Chip damage means nothing while he lives, and he keeps pace with the column so he is never far from it. Silence him, or burst the column down faster than he can mend it.",
  },
  // The Kingdom's battle-mage. He marches inside the big columns (never on
  // his own: waves.js adds him to any wave big enough to need him) and throws
  // three shields over everything close around him on a slow beat (his aura
  // was 140 wide until shields turned all magic; 80 now, about a chaplain's).
  magister: {
    faction: "iron", hp: 200, speed: 58, bounty: 30, armor: 0, mres: 0.3, size: 17,
    name: "Aegis Magister", atk: 12, atkRate: 1000, castleDmg: 2,
    wardEvery: 8000, wardHits: 3, wardRange: 80, packRange: 95, wardFx: "aegis",
    note: "A court battle-mage who marches inside the big columns. Every eight seconds he throws his aegis over himself and the company around him — three blue shields on every soldier, each swallowing a physical blow whole, and no magic or fire gets through while one stands. Strip his shields with quick arrows and blades, then kill him before the next aegis (he keeps the column's pace, so he never strays from the soldiers he shields); or break them with steel that hits many at once.",
  },
  // Fewer and far heavier since 2026-09-29 (owner: "higher health, higher
  // physical damage resistance, squashes knights dead — this is where the
  // mages come in"): steel barely dents it, magic takes it whole.
  ram: {
    // speed 30 -> 46 with the wall: the whole army walks at the ram's pace, and
    // at 30 the crowd behind it arrived in one lump and doubled the sim's bleed
    faction: "iron", hp: 2300, speed: 46, bounty: 60, armor: 0.6, mres: 0, size: 34,
    name: "Siege Ram", atk: 32, atkRate: 1200, castleDmg: 4, immSlow: true, immStun: true, crush: true,
    roadBlock: 50,
    // it never marches bare: [type, base count, more per war-wave, gap ms]
    escort: [["levy", 5, 0.6, 420], ["crossbow", 3, 0.35, 760]],
    note: "A shed of oak and iron wide as the whole road: nothing marches past it, and the army walks in its lee, knights and crossbows piling up behind. Nothing slows it, nothing stuns it, arrows and blades barely dent it, and any knight who steps in front of it is crushed. Magic burns straight through the oak — this is the mages' work. Kill it, and the column pours through.",
  },
  gryphon: {
    faction: "iron", hp: 190, speed: 88, bounty: 22, armor: 0.2, size: 21,
    name: "Gryphon Knight", flying: true, atk: 0, atkRate: 900, castleDmg: 2,
    // bring the beast down and its knight falls with it, and walks on
    splitInto: ["unseated", 1], splitDrop: true, deathSkin: "gryphonMount",
    // nothing on the road can touch it, but it fights in the air: any in
    // reach of a war-eagle break off to lance her, and a flight gangs up
    airAtk: 60, airReach: 52,
    note: "A knight on a warbred gryphon, armored wing to talon. It sails over every blocker you have, and its plate turns arrows. It hunts your war-eagles in the air, and a flight of them will gang up on one. Bring it down and the knight on its back drops to the road and marches on.",
  },
  unseated: {
    faction: "iron", hp: 100, speed: 66, bounty: 8, armor: 0.3, size: 17,
    name: "Unseated Knight", atk: 22, atkRate: 900, castleDmg: 1,
    note: "Thrown from a gryphon brought down under him. He shakes off the fall, picks up sword and shield, and marches on for the gate on foot — where, at last, your knights can reach him.",
  },
  marshal: {
    faction: "iron", hp: 5000, speed: 48, bounty: 110, armor: 0.35, size: 24,
    name: "LORD MARSHAL", boss: true, atk: 64, atkRate: 1000, castleDmg: 5, trample: 2, trampleEvery: 3200,
    bannerRange: 115, bannerSpeed: 0.3, bannerArmor: 0.2,
    note: "Boss. His banner drives the whole column faster and harder — every soldier near him is quicker and better armored, and he rides down the first two knights that try to hold him. Cut down the banner and the army falters.",
  },

  // ---- THE HOLLOW COURT ----
  // The dead of a drowned kingdom. They come in floods, they keep coming
  // while their callers stand, and killing some of them is its own mistake.
  skeleton: {
    faction: "hollow", hp: 44, speed: 70, bounty: 5, armor: 0, mres: 0.4, size: 15,
    name: "Risen", atk: 9, atkRate: 850, castleDmg: 1,
    note: "A dead soldier walking under someone else's orders, and half the fire and lightning thrown at it goes through the bones. Worth almost nothing, stops almost nothing — and arrives in floods that do not end.",
  },
  ghoul: {
    faction: "hollow", hp: 72, speed: 138, bounty: 8, armor: 0, size: 16,
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
    faction: "hollow", hp: 95, speed: 78, bounty: 18, armor: 0, mres: 0.25, size: 17,
    name: "Wraith", flying: true, minGap: 1500, firstWave: 5, standIn: "ghoul", holyOnly: true, raisesOnKill: true, haunts: true, swarms: 34, atk: 23, atkRate: 900, castleDmg: 2,
    note: "A drowned soul that drifts over the road and lays its cold hands on your knights. Arrows, bolts, stones and plain steel all pass through it: only magic hurts it — wizards, fire, and the Paladin's holy blows, the one kind of knight that can. They bunch up on a soldier, all clawing at once, and whoever they kill rises again as another wraith, so keep your ordinary knights back.",
  },
  ghast: {
    faction: "hollow", hp: 175, speed: 84, bounty: 16, armor: 0, size: 18,
    name: "Plague Ghast", atk: 16, atkRate: 900, castleDmg: 2,
    deathBurst: { r: 55, dmg: 26, dps: 12, dur: 3500 },
    note: "Swollen with grave-rot, and sent ahead of the court at a shambling run to fall on your knights. Kill it at arm's length and it bursts — scalding every knight nearby and leaving a pool of filth that keeps eating at them. Kill it FAR from your line, or let the towers do it.",
  },
  crypt: {
    faction: "hollow", hp: 560, speed: 40, bounty: 30, armor: 0.45, mres: 0.25, guard: 2, size: 21,
    name: "Crypt Warden", atk: 34, atkRate: 1000, castleDmg: 3,
    note: "It carries its own sarcophagus lid as a shield: the first two physical blows glance off it, magic and fire can't touch it while the lid is up, and the plate under it turns half of what follows. Patience, and something heavy.",
  },
  gravecaller: {
    faction: "hollow", hp: 380, speed: 55, bounty: 34, armor: 0, mres: 0.65, size: 18,
    name: "Gravecaller", atk: 10, atkRate: 1000, castleDmg: 2,
    summonEvery: 5000, summonFirst: 0, summonAhead: true, summonType: "skeleton", summonCount: 10,
    note: "A robed thing with a bell, warded against most magic. The first toll rings the moment he leaves the wood, then every five seconds: each pulls ten more Risen up out of the road itself, in front of him, to meet your line — the flood has a source, and this is it. Silence the bell.",
  },
  amalgam: {
    faction: "hollow", hp: 1050, speed: 36, bounty: 42, armor: 0.2, size: 23,
    name: "Grave Amalgam", atk: 30, atkRate: 1100, castleDmg: 3,
    splitInto: ["ghoul", 3],
    note: "Many dead things stitched into one slow tide of a body. Cutting it down is half the work: it comes apart into three ghouls at a sprint.",
  },
  hollowking: {
    faction: "hollow", hp: 4400, speed: 42, bounty: 130, armor: 0.25, mres: 0.5, immStun: true, size: 26,
    name: "THE HOLLOW KING", boss: true, atk: 40, atkRate: 1000, castleDmg: 5,
    summonEvery: 10000, summonFirst: 0, summonType: "skeleton", summonCount: 50,
    note: "Boss. The drowned crown itself. Stuns break against his will, half your magic drowns in him — and every few heartbeats he calls more dead out of the ground to walk in front of him. The court dies when the King does.",
  },

  // ---- THE RIME CLANS (zone IV, art/ZONES-4-5.md) ----
  // Fielded only by the test faction in data/faction-rime.js, which no level
  // marches yet. Numbers are first guesses; looks are borrowed rigs
  // (render/rimefx.js aliases, each only until rigs-rime.js /
  // rigs-rimebeasts.js draws the real one). The clans' own flags:
  //   frostProof  cold-hardy (owner, 2026-10-03: "make freeze towers that slow
  //             enemies ineffective in zone 4"): the Frost Altar's chill (its
  //             aura slow, every form), its frost nova's freeze (and the
  //             Permafrost brittleness that rides on it) and Absolute Zero's
  //             cold damage do nothing. The nova's own blast still lands, and
  //             every non-frost slow (spikes, traps, caltrops, harpoons, the
  //             Earthshaker's cracked road, the Moon Prism's beam) still bites.
  //             Every Rime foe has it; no other foe does (update.js support loop)
  //   freezeEvery / freezeRange / freezeFor / freezeFirst   the frost shroud:
  //             every freezeEvery ms it ices the nearest built hall within
  //             freezeRange px for freezeFor ms (engine/rime.js)
  //   ship      a longship: sails in off the sea edge carrying a landing party,
  //             a target while it sails, never on the road (engine/rime.js)
  //   rage      { speed, atk } the berserker: at 0 health left he is
  //             (1 + speed)x as quick and (1 + atk)x as heavy a hitter,
  //             in proportion to his wounds on the way (engine/rime.js)
  //   stomp     { every, r, dmg, daze } the frost giant: while soldiers are
  //             within r he stamps every `every` ms: dmg to each and their
  //             blows held back `daze` ms (engine/rime.js)
  //   callLanding { every, first, party }  the Rime Jarl's war-horn: a longship
  //             puts in at one of the board's beaches with `party` aboard — at
  //             most one landing a wave (none if the wave already had its own),
  //             and none at all on a board with no beach (engine/rime.js)
  //   sea       a sea monster, moved by engine/serpent.js, never on the road,
  //             NEUTRAL (strikes friend and foe, never the castle, never holds
  //             a wave open): "serpent" (swims a river, else the coast,
  //             surfacing to strike), "kraken" (roams the coast, else the
  //             river, surfacing to send up its arms), "arm" (one tentacle)
  //   water     what the board must have for it to come at all: "any" (a river
  //             or a coast) or "coast"; `dry: [type, n]` marches n of that type
  //             a head in its place on a board without it (waves.js dryLand);
  //             no `dry` and it is simply left out
  thrall: {
    faction: "rime", hp: 54, speed: 72, bounty: 6, armor: 0.1, size: 16, frostProof: true,
    name: "Thrall", atk: 12, atkRate: 850, castleDmg: 1,
    note: "The raiding rank and file: axe, buckler and nothing to lose. They come in floods — and some of them come by sea. Cold-hardy: frost won't slow him.",
  },
  huscarl: {
    faction: "rime", hp: 290, speed: 50, bounty: 16, armor: 0.35, guard: 1, size: 18, frostProof: true,
    name: "Huscarl", atk: 26, atkRate: 1000, castleDmg: 2,
    note: "A mailed house-warrior behind a great round shield: the first blow glances off it, and the mail turns a third of what follows. Cold-hardy: frost won't slow him.",
  },
  rimeseer: {
    faction: "rime", hp: 210, speed: 54, bounty: 22, armor: 0, mres: 0.4, size: 17, frostProof: true,
    name: "Rime Seer", atk: 8, atkRate: 1000, castleDmg: 2, packRange: 95,
    freezeEvery: 9000, freezeFirst: 3000, freezeRange: 130, freezeFor: 4500,
    note: "She sings frost over the nearest hall in her reach: an ice shell that holds its fire for a few seconds. A burning, stunned or silenced seer cannot sing. Cold-hardy: frost won't slow her.",
  },
  longship: {
    faction: "rime", hp: 520, speed: 0, bounty: 30, armor: 0.25, size: 30, frostProof: true,
    name: "Longship", ship: true, atk: 0, atkRate: 0, castleDmg: 0,
    note: "A raiders' longship running in for the beach. Hole it before it grounds: a battered hull lands fewer raiders, and a sunk one lands none.",
  },
  berserker: {
    faction: "rime", hp: 150, speed: 66, bounty: 13, armor: 0, size: 17, frostProof: true,
    name: "Berserker", atk: 18, atkRate: 800, castleDmg: 2,
    // wounded, he only gets worse: at a sliver of health he runs ~1.8x and hits ~2.2x
    rage: { speed: 0.8, atk: 1.2 },
    note: "Bare-chested and bear-mad. Every wound drives him faster and makes him hit harder — half dead, he is twice the man he was. Kill him in one go, or keep him far from your knights. Cold-hardy: frost won't slow him.",
  },
  rimerider: {
    faction: "rime", hp: 125, speed: 112, bounty: 12, armor: 0.1, size: 19, frostProof: true,
    name: "Wolf-Rider", atk: 20, atkRate: 750, castleDmg: 2, trample: 1,
    // as the boar rider: half the time the rider leaps clear of his fallen wolf
    // and marches on as a thrall (the mount crumbles alone in the `rimewolf` rig)
    splitInto: ["thrall", 1], splitDrop: true, splitChance: 0.5, deathSkin: "rimewolf",
    note: "A raider on a frost wolf, fast as the wind off the ice. The charge bowls over the first knight who steps up — only the second holds him. Fell the wolf and, one time in two, the rider leaps clear and marches on afoot. Cold-hardy: frost won't slow him.",
  },
  skald: {
    faction: "rime", hp: 170, speed: 58, bounty: 18, armor: 0.1, mres: 0.25, size: 17, frostProof: true,
    name: "Skald", atk: 10, atkRate: 1000, castleDmg: 2,
    // his war-chant is a banner of song: the warband around him marches
    // quicker (the Marshal's banner seam, speed only); he walks amid the
    // biggest group (faction `gather`) and keeps its pace
    bannerRange: 110, bannerSpeed: 0.25, bannerArmor: 0, packRange: 95,
    note: "A war-poet with a horn and a hundred verses. While he chants, every raider around him marches a quarter faster, and he keeps to the thick of the warband. Silence him, or kill him first. Cold-hardy: frost won't slow him.",
  },
  frostgiant: {
    faction: "rime", hp: 520, speed: 38, bounty: 30, armor: 0.2, size: 22, frostProof: true, immSlow: true,
    name: "Frost Giant", atk: 44, atkRate: 1200, castleDmg: 3,
    stomp: { every: 5200, r: 52, dmg: 22, daze: 1800 },
    note: "A hill of blue hide and hoarfrost with a tree for a club. When soldiers crowd him he stamps: every knight near him is hurt and dazed, his blows held back for a heartbeat. Nothing slows him. Cold-hardy: frost won't slow him.",
  },
  icedrake: {
    faction: "rime", hp: 105, speed: 96, bounty: 10, armor: 0.15, size: 17, frostProof: true,
    name: "Ice Drake", flying: true, atk: 0, atkRate: 0, castleDmg: 1,
    note: "A lesser drake off the ice cliffs, scaled like a frozen lake. It sails over every knight you have; arrows skid off its scales a little. Cold-hardy: frost won't slow it.",
  },
  rimejarl: {
    faction: "rime", hp: 6200, speed: 36, bounty: 120, armor: 0.3, mres: 0.2, size: 30, frostProof: true,
    name: "THE RIME JARL", boss: true, atk: 60, atkRate: 1100, castleDmg: 5, immSlow: true, immStun: true,
    // on his war-mammoth: rides down soldiers as the Marshal does, and gathers
    // for another charge every few seconds
    trample: 3, trampleEvery: 3000,
    // the mammoth's rider sings frost over halls like a seer, wider and longer
    freezeEvery: 11000, freezeFirst: 6000, freezeRange: 150, freezeFor: 5000,
    // and his horn calls a longship in (where there is a beach)
    callLanding: { every: 26000, first: 12000, party: [["thrall", 10, 220], ["huscarl", 2, 520]] },
    note: "Boss. The lord of the clans on a war-mammoth. He rides down any three knights who stand in his way and gathers for another charge; his song freezes the halls he passes; and his horn calls a longship to the beach behind your lines. Nothing slows or stuns the mammoth. Cold-hardy: frost won't slow him.",
  },
  // ---- the sea monsters (engine/serpent.js) ----
  // NEUTRAL hazards (owner, 2026-10-04): they strike whatever is near the
  // water, friend or foe, never hurt the castle (castleDmg 0) and never hold
  // a wave open; a foe they kill pays nothing, killing one pays its bounty
  seaserpent: {
    faction: "rime", hp: 900, speed: 54, bounty: 40, armor: 0.25, mres: 0.15, size: 24, frostProof: true,
    name: "Sea Serpent", atk: 0, atkRate: 0, castleDmg: 0, immSlow: true,
    sea: "serpent", water: "any",
    // the swim: `reach` px from the water to its prey; `rise` ms of ripples
    // before it breaks the surface, `up` ms above water (strikes every
    // `strikeRate` ms while it is, the first the moment it rises), `dive` ms
    // going down, `rest` ms submerged before it may rise again
    reach: 80, rise: 500, up: 2600, dive: 450, rest: 4200, strikeRate: 1250,
    maul: 40,          // a bite (x sqrt wave mult) on the creature it holds
    coil: 3500,        // a hall it coils round holds its fire this long
    note: "A grey coil under the meltwater, and no one's ally. It swims the river (or runs the coast), unseen and out of reach of everything but the River Watch's boats — then rises beside whatever stands near the water, raider or knight, to seize and maul it, or coils round a hall. Held, a knight hacks back; while it is up, every hall in reach can hit it. At the water's end it slips away. Cold-hardy: frost won't slow it.",
  },
  kraken: {
    faction: "rime", hp: 9000, speed: 30, bounty: 150, armor: 0.2, mres: 0.2, size: 34, frostProof: true,
    name: "THE KRAKEN", atk: 0, atkRate: 0, castleDmg: 0, immSlow: true, immStun: true,
    sea: "kraken", water: "any",
    // it roams the water (the coast first, else the river) mostly submerged;
    // with a creature within `reach` and its `rest` over it surfaces for up to
    // `up` ms, sending up a tentacle every `armEvery` ms (up to `armMax` at
    // once) at the creatures within `armSpan`. A tentacle cut down tears
    // `armBlow` of the body's max health away
    reach: 120, up: 15000, rest: 7000, armEvery: 900, armMax: 4, armSpan: 140, armBlow: 0.04,
    note: "Something vast under the black water, and no one's ally. It roams the sea or the river unseen, then surfaces where anything stands near the shore and sends up three or four arms at once: each seizes a raider or a soldier and crushes it slowly while it hacks to break free. Cut an arm down and it lets go — and the beast feels it. Killing the body is a feat. Cold-hardy: frost won't slow it.",
  },
  krakenarm: {
    faction: "rime", hp: 130, speed: 0, bounty: 6, armor: 0.1, size: 18, frostProof: true,
    name: "Kraken Arm", atk: 0, atkRate: 0, castleDmg: 0, immSlow: true,
    sea: "arm",
    // bursts up (`rise` ms, untouchable) at the waterline, or up to `inland`
    // px ashore, within `reach` of its mark; seizes the creature and squeezes
    // it (`grip` x sqrt wave mult every `gripRate` ms) till one of them dies;
    // with no creature in reach it smashes a hall (`smash` ms) and sinks;
    // it sinks after `armLife` ms whatever happens
    reach: 46, inland: 40, rise: 600, grip: 12, gripRate: 900, smash: 2600, armLife: 12000,
    note: "One arm of the kraken, thick as a mast. It seizes whatever it can reach — raider or soldier — and crushes it slowly; a knight caught in it hacks to break free. Every arm cut down wounds the beast. Cold-hardy: frost won't slow it.",
  },
};
