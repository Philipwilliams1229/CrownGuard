// ============ FACTIONS ============
// Who you are fighting. A faction owns the foes it fields, its eighteen
// scripted waves, and the point-costed roster the Endless March draws from
// once the script runs out. Realms decide what the ground looks like;
// factions decide what walks over it.
//
// This is the seam the campaign hangs off: a chapter is a faction plus a
// pool of realms, so the same biome can be marched through twice against
// different armies.
//
// Wave design rules of thumb, learned the hard way:
//   - the first three waves of any script are GRUNT FLOODS: big counts,
//     tight gaps, nothing clever. They teach the ground and feed the bank.
//   - every special walks on stage alone once (a "teaching wave") before it
//     ever appears in a crowd.
//   - every fourth wave or so is a pressure spike; the ones between breathe.
//   - the boss arrives at 18 with an honor guard, never alone.
//
// Each wave entry is [enemyType, count, gapMs between spawns].

export const FACTIONS = {
  greenwood: {
    id: "greenwood",
    name: "The Greenwood Horde",
    tag: "MONSTERS",
    tagColor: "#a8d88c",
    blurb: "Goblins, wolves and trolls out of the deep wood — raiding parties that grow into a war. Numerous, savage, and led by things that raise the dead.",
    types: ["goblin", "wolf", "bat", "orc", "boarrider", "armored", "shaman", "hobgoblin", "troll", "necro", "dragon"],
    // the beast that leads every fifth wave of the Endless March
    endlessBoss: "dragon",
    waves: [
      // I. raiding parties — goblins first, then the wood empties out
      [["goblin", 14, 650]],
      [["goblin", 18, 520]],
      [["goblin", 12, 480], ["wolf", 6, 550]],
      [["bat", 10, 400], ["goblin", 10, 520]],
      [["orc", 10, 850]],
      [["goblin", 16, 420], ["wolf", 10, 450]],
      // II. the horde proper — armor, riders, and the first healers
      [["orc", 10, 800], ["armored", 5, 1000]],
      [["wolf", 20, 380]],
      [["boarrider", 6, 900], ["goblin", 14, 420]],
      [["orc", 12, 750], ["armored", 6, 900], ["shaman", 2, 4500]],
      [["troll", 3, 2200], ["goblin", 16, 400], ["shaman", 2, 5000]],
      [["bat", 14, 320], ["wolf", 12, 400], ["boarrider", 5, 1000], ["rafter", 5, 900]],
      // III. the warchiefs take the field
      [["hobgoblin", 2, 6000], ["orc", 12, 600], ["armored", 6, 800]],
      [["goblin", 30, 260], ["wolf", 14, 340], ["necro", 1, 0]],
      [["troll", 5, 1800], ["armored", 10, 700], ["shaman", 3, 4200]],
      [["boarrider", 8, 700], ["hobgoblin", 2, 5000], ["wolf", 12, 380], ["shaman", 2, 4600]],
      [["troll", 6, 1500], ["orc", 14, 500], ["necro", 2, 6000], ["shaman", 3, 4200]],
      [["goblin", 16, 320], ["hobgoblin", 2, 4000], ["armored", 10, 700], ["necro", 2, 5200], ["shaman", 2, 4200], ["dragon", 1, 0]],
    ],
    roster: [
      { type: "goblin", cost: 1, gap: 480 },
      { type: "bat", cost: 0.8, gap: 320 },
      { type: "wolf", cost: 1.6, gap: 420 },
      { type: "orc", cost: 3, gap: 650 },
      { type: "boarrider", cost: 3.6, gap: 700 },
      { type: "rafter", cost: 2.4, gap: 620 },
      { type: "armored", cost: 4.5, gap: 800 },
      { type: "shaman", cost: 8, gap: 4200, cap: 3 },
      { type: "troll", cost: 9, gap: 1700 },
      { type: "hobgoblin", cost: 11, gap: 5200, cap: 2 },
      { type: "necro", cost: 15, gap: 6500, cap: 2 },
    ],
  },

  iron: {
    id: "iron",
    name: "The Iron Kingdom",
    tag: "AN ARMY",
    tagColor: "#9ab6d8",
    blurb: "Not a horde — a war machine. Shield walls, crossbows that outrange your knights, gryphons overhead, and siege engines nothing can slow.",
    types: ["levy", "crossbow", "cavalier", "sergeant", "gryphon", "chaplain", "ram", "marshal"],
    endlessBoss: "marshal",
    waves: [
      // I. the border levies — shields up, in step
      [["levy", 10, 800]],
      [["levy", 14, 650]],
      [["levy", 10, 600], ["crossbow", 3, 1200]],
      [["crossbow", 7, 850], ["levy", 8, 650]],
      [["cavalier", 5, 1100]],
      [["sergeant", 4, 1100], ["levy", 12, 550]],
      // II. the professional army arrives
      [["levy", 20, 420], ["crossbow", 6, 800]],
      [["gryphon", 4, 1400], ["crossbow", 6, 800]],
      [["sergeant", 7, 900], ["levy", 10, 550], ["chaplain", 1, 0]],
      [["ram", 2, 3000], ["levy", 14, 450], ["crossbow", 5, 850]],
      [["cavalier", 10, 700], ["sergeant", 6, 900], ["chaplain", 2, 5000]],
      [["gryphon", 6, 1100], ["levy", 16, 400], ["ram", 1, 0]],
      // III. the king commits everything
      [["levy", 28, 300], ["cavalier", 8, 600], ["sergeant", 8, 750]],
      [["ram", 4, 2400], ["crossbow", 12, 550], ["chaplain", 3, 4200]],
      [["sergeant", 14, 550], ["chaplain", 3, 3600], ["gryphon", 4, 1200]],
      [["cavalier", 14, 480], ["ram", 3, 2600], ["levy", 18, 360]],
      [["ram", 5, 2000], ["sergeant", 10, 650], ["gryphon", 6, 1000], ["chaplain", 3, 4000]],
      [["levy", 16, 340], ["sergeant", 12, 650], ["chaplain", 3, 2800], ["ram", 4, 2400], ["gryphon", 4, 1100], ["marshal", 1, 0]],
    ],
    roster: [
      { type: "levy", cost: 1.2, gap: 460 },
      { type: "crossbow", cost: 2, gap: 620 },
      { type: "cavalier", cost: 3.2, gap: 700 },
      { type: "sergeant", cost: 5, gap: 850 },
      { type: "gryphon", cost: 5, gap: 1100 },
      { type: "chaplain", cost: 8, gap: 4200, cap: 3 },
      { type: "ram", cost: 12, gap: 2600, cap: 4 },
    ],
  },

  hollow: {
    id: "hollow",
    name: "The Hollow Court",
    tag: "THE DEAD",
    tagColor: "#b08ad8",
    blurb: "The drowned kingdom under the fen has remembered it was a kingdom. Skeletons in floods, wraiths over your blockers, bells that raise more — and some of them are worse dead than alive.",
    types: ["skeleton", "ghoul", "bonearcher", "wraith", "ghast", "crypt", "gravecaller", "amalgam", "hollowking"],
    endlessBoss: "hollowking",
    waves: [
      // I. the fen gives up its dead — floods of chaff
      [["skeleton", 16, 600]],
      [["skeleton", 22, 460]],
      [["skeleton", 14, 420], ["ghoul", 6, 500]],
      [["ghoul", 12, 450]],
      [["skeleton", 18, 380], ["bonearcher", 4, 1100]],
      [["wraith", 5, 1200], ["skeleton", 12, 450]],
      // II. the court's servants — things it is a mistake to kill carelessly
      [["ghoul", 16, 360], ["bonearcher", 6, 900]],
      [["ghast", 4, 1600], ["skeleton", 16, 400]],
      [["crypt", 2, 2600], ["bonearcher", 8, 800]],
      [["skeleton", 30, 260], ["ghoul", 10, 400]],
      [["gravecaller", 2, 6000], ["skeleton", 14, 400], ["wraith", 5, 1100]],
      [["amalgam", 2, 3000], ["ghoul", 14, 380]],
      // III. the court in session
      [["crypt", 3, 2200], ["ghast", 6, 1300], ["bonearcher", 8, 700]],
      [["wraith", 10, 700], ["gravecaller", 2, 5600], ["skeleton", 18, 340]],
      [["amalgam", 3, 2600], ["crypt", 3, 2200], ["gravecaller", 2, 5000]],
      [["skeleton", 36, 220], ["ghoul", 16, 320], ["bonearcher", 10, 600]],
      [["ghast", 8, 1100], ["amalgam", 3, 2400], ["wraith", 8, 800], ["gravecaller", 3, 4600]],
      [["skeleton", 20, 300], ["crypt", 4, 2000], ["gravecaller", 3, 4200], ["amalgam", 2, 2800], ["hollowking", 1, 0]],
    ],
    roster: [
      { type: "skeleton", cost: 0.9, gap: 360 },
      { type: "ghoul", cost: 1.6, gap: 420 },
      { type: "bonearcher", cost: 2.2, gap: 700 },
      { type: "wraith", cost: 3, gap: 900 },
      { type: "ghast", cost: 4, gap: 1400 },
      { type: "crypt", cost: 8, gap: 2200 },
      { type: "gravecaller", cost: 10, gap: 5200, cap: 2 },
      { type: "amalgam", cost: 11, gap: 2600, cap: 2 },
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
