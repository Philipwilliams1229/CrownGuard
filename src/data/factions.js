// ============ FACTIONS ============
// Who you are fighting. A faction owns the foes it fields, its fifteen
// scripted waves, and the point-costed roster the Endless March draws from
// once the script runs out. Realms decide what the ground looks like;
// factions decide what walks over it.
//
// This is the seam the campaign will hang off: a chapter is a faction plus a
// pool of realms, so the same biome can be marched through twice against
// different armies.
//
// Each wave entry is [enemyType, count, gapMs between spawns].

export const FACTIONS = {
  greenwood: {
    id: "greenwood",
    name: "The Greenwood Horde",
    tag: "MONSTERS",
    tagColor: "#a8d88c",
    blurb: "Goblins, wolves and trolls out of the deep wood. Numerous, savage, and led by things that raise the dead.",
    types: ["goblin", "wolf", "orc", "armored", "troll", "shaman", "necro", "dragon"],
    // the beast that leads every fifth wave of the Endless March
    endlessBoss: "dragon",
    waves: [
      [["goblin", 8, 900]],
      [["goblin", 12, 750]],
      [["goblin", 8, 700], ["wolf", 4, 600]],
      [["orc", 8, 950]],
      [["goblin", 10, 550], ["wolf", 7, 500]],
      [["orc", 9, 850], ["armored", 4, 1100]],
      [["wolf", 16, 420]],
      [["orc", 9, 800], ["armored", 5, 1000], ["shaman", 1, 0]],
      [["troll", 2, 2500], ["goblin", 12, 480], ["shaman", 1, 0]],
      [["armored", 10, 800], ["wolf", 8, 450], ["shaman", 2, 4000]],
      [["troll", 4, 2000], ["orc", 10, 650], ["shaman", 2, 5000]],
      [["goblin", 22, 340], ["wolf", 12, 380], ["necro", 1, 0]],
      [["armored", 13, 650], ["troll", 4, 1800], ["shaman", 3, 4000]],
      [["troll", 6, 1500], ["orc", 12, 550], ["wolf", 8, 420], ["necro", 2, 6000], ["shaman", 2, 5000]],
      [["armored", 8, 900], ["shaman", 2, 3000], ["necro", 2, 5000], ["dragon", 1, 0]],
    ],
    roster: [
      { type: "goblin", cost: 1, gap: 500 },
      { type: "wolf", cost: 1.6, gap: 420 },
      { type: "orc", cost: 3, gap: 650 },
      { type: "armored", cost: 4.5, gap: 800 },
      { type: "shaman", cost: 8, gap: 4200, cap: 3 },
      { type: "troll", cost: 9, gap: 1700 },
      { type: "necro", cost: 15, gap: 6500, cap: 2 },
    ],
  },

  iron: {
    id: "iron",
    name: "The Iron Kingdom",
    tag: "AN ARMY",
    tagColor: "#9ab6d8",
    blurb: "Not a horde — a war machine. Shield walls, crossbows that outrange your knights, and siege engines nothing can slow.",
    types: ["levy", "crossbow", "cavalier", "sergeant", "chaplain", "ram", "marshal"],
    endlessBoss: "marshal",
    waves: [
      [["levy", 6, 1000]],
      [["levy", 10, 820]],
      [["levy", 7, 750], ["crossbow", 2, 1300]],
      [["crossbow", 5, 950], ["levy", 5, 750]],
      [["cavalier", 4, 1200]],
      [["sergeant", 3, 1200], ["levy", 9, 650]],
      [["crossbow", 8, 700], ["cavalier", 4, 1200]],
      [["sergeant", 6, 950], ["levy", 8, 600], ["chaplain", 1, 0]],
      [["ram", 1, 0], ["levy", 12, 500], ["crossbow", 4, 900]],
      [["cavalier", 8, 800], ["sergeant", 5, 950], ["chaplain", 1, 0]],
      [["ram", 3, 2800], ["crossbow", 10, 620], ["chaplain", 2, 5000]],
      [["levy", 24, 340], ["cavalier", 8, 650], ["sergeant", 7, 800]],
      [["sergeant", 13, 620], ["chaplain", 3, 3600], ["crossbow", 12, 520]],
      [["ram", 5, 2200], ["cavalier", 12, 560], ["sergeant", 9, 700], ["chaplain", 3, 4200]],
      [["sergeant", 12, 700], ["chaplain", 3, 2800], ["ram", 4, 2600], ["marshal", 1, 0]],
    ],
    roster: [
      { type: "levy", cost: 1.2, gap: 480 },
      { type: "crossbow", cost: 2, gap: 620 },
      { type: "cavalier", cost: 3.2, gap: 700 },
      { type: "sergeant", cost: 5, gap: 850 },
      { type: "chaplain", cost: 8, gap: 4200, cap: 3 },
      { type: "ram", cost: 12, gap: 2600, cap: 4 },
    ],
  },
};

// The army currently marching. Module exports are live bindings, so the engine
// and the panels pick up a change here without being re-wired — the same trick
// selectRealm() uses for terrain.
export let FACTION = FACTIONS.greenwood;

export function selectFaction(id) {
  FACTION = FACTIONS[id] || FACTIONS.greenwood;
  return FACTION;
}
