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
    // The shaman never walks alone (owner, 2026-09-30): wherever a wave names
    // him he walks amid its biggest group, a healer in the thick of the
    // warband (waves.js gatherEscort). He is not added to waves that lack him.
    escort: { type: "shaman", gather: true, per: 1e9, max: 0, from: 1 },
    waves: [
      // I. raiding parties — goblins first, then the wood empties out
      [["goblin", 14, 650]],
      [["goblin", 18, 520]],
      [["goblin", 12, 480], ["wolf", 6, 550]],
      [["bat", 7, 520], ["goblin", 10, 520]],
      [["orc", 10, 850]],
      [["goblin", 16, 420], ["wolf", 10, 450]],
      // II. the horde proper — armor, riders, and the first healers
      [["orc", 10, 800], ["armored", 5, 1000]],
      [["wolf", 20, 380]],
      [["boarrider", 6, 900], ["goblin", 14, 420]],
      [["orc", 12, 750], ["armored", 6, 900], ["shaman", 2, 4500]],
      [["troll", 3, 2200], ["goblin", 16, 400], ["shaman", 2, 5000]],
      [["bat", 14, 320], ["wolf", 12, 400], ["boarrider", 5, 1000]],
      // III. the warchiefs take the field
      [["hobgoblin", 2, 6000], ["orc", 12, 600], ["armored", 6, 800]],
      [["necro", 1, 0], ["goblin", 30, 260], ["wolf", 14, 340]],
      [["troll", 3, 1800], ["armored", 8, 700], ["shaman", 3, 4200]],
      [["boarrider", 8, 700], ["hobgoblin", 2, 5000], ["wolf", 12, 380], ["troll", 2, 2200]],
      [["necro", 2, 0], ["troll", 4, 1500], ["orc", 12, 500], ["shaman", 3, 4200]],
      [["goblin", 16, 320], ["hobgoblin", 2, 4000], ["armored", 10, 700], ["necro", 2, 5200], ["shaman", 2, 4200], ["dragon", 1, 0]],
    ],
    roster: [
      { type: "goblin", cost: 1, gap: 480 },
      { type: "bat", cost: 0.8, gap: 320 },
      { type: "wolf", cost: 1.6, gap: 420 },
      { type: "orc", cost: 3, gap: 650 },
      { type: "boarrider", cost: 3.6, gap: 700 },
      { type: "armored", cost: 4.5, gap: 800 },
      { type: "shaman", cost: 8, gap: 4200, cap: 3 },
      { type: "troll", cost: 11, gap: 2100, cap: 5 },
      { type: "hobgoblin", cost: 11, gap: 5200, cap: 2 },
      { type: "necro", cost: 15, gap: 6500, cap: 2 },
    ],
  },

  iron: {
    id: "iron",
    // a drilled army, and the second chapter: the player arrives knowing the
    // game, so the Kingdom comes on in bigger, tougher columns from the first
    // wave (retuned 2026-09-27 — the owner held it with a handful of towers).
    // Its ranks still thicken with the war by little more than half as much
    // as the Greenwood's: the size is in the script, not the swell.
    crowdScale: 0.6,
    name: "The Iron Kingdom",
    tag: "AN ARMY",
    tagColor: "#9ab6d8",
    blurb: "Not a horde — a war machine. Shield walls, crossbows that outrange your knights, gryphons overhead, battle-mages who shield whole columns, and siege engines nothing can slow.",
    types: ["levy", "crossbow", "cavalier", "sergeant", "gryphon", "unseated", "chaplain", "magister", "ram", "marshal"],
    endlessBoss: "marshal",
    // An Aegis Magister marches inside any wave that has grown big: one for
    // every `per` heads of rank and file, up to `max`, from war-wave `from`
    // on (waves.js escortOf). They walk in the thick of the biggest group.
    escort: { type: "magister", per: 34, max: 2, from: 4 },
    waves: [
      // I. the border levies — shields up, in step
      [["levy", 18, 600]],
      [["levy", 24, 460]],
      [["levy", 18, 440], ["crossbow", 6, 900]],
      [["crossbow", 10, 700], ["levy", 16, 480]],
      [["cavalier", 8, 900], ["levy", 12, 480]],
      [["sergeant", 6, 950], ["levy", 20, 420]],
      // II. the professional army arrives
      [["levy", 24, 380], ["crossbow", 7, 750]],
      [["gryphon", 5, 1250], ["crossbow", 7, 750], ["levy", 8, 520]],
      [["sergeant", 8, 850], ["levy", 14, 480], ["chaplain", 1, 0]],
      [["ram", 1, 3000], ["levy", 18, 420], ["crossbow", 6, 800]],
      [["cavalier", 12, 620], ["sergeant", 7, 850], ["chaplain", 2, 4800]],
      [["gryphon", 7, 1000], ["levy", 20, 360], ["ram", 1, 0]],
      // III. the king commits everything
      [["levy", 32, 280], ["cavalier", 9, 560], ["sergeant", 9, 700]],
      [["ram", 2, 2400], ["crossbow", 13, 520], ["chaplain", 3, 4200], ["levy", 10, 420]],
      [["sergeant", 15, 520], ["chaplain", 3, 3600], ["gryphon", 5, 1150]],
      [["cavalier", 15, 460], ["ram", 2, 2600], ["levy", 22, 340]],
      [["ram", 3, 2000], ["sergeant", 11, 620], ["gryphon", 6, 1000], ["chaplain", 3, 4000]],
      [["levy", 20, 320], ["sergeant", 12, 650], ["chaplain", 3, 2800], ["ram", 2, 2400], ["gryphon", 5, 1100], ["marshal", 1, 0]],
    ],
    roster: [
      { type: "levy", cost: 1.2, gap: 440 },
      { type: "crossbow", cost: 2, gap: 600 },
      { type: "cavalier", cost: 3.2, gap: 680 },
      { type: "sergeant", cost: 5, gap: 820 },
      { type: "gryphon", cost: 5.4, gap: 1050 },
      { type: "chaplain", cost: 8, gap: 4200, cap: 3 },
      // the rams come as often as ever, but fewer and heavier (2026-09-29)
      { type: "ram", cost: 20, gap: 2600, cap: 2 },
    ],
  },

  hollow: {
    id: "hollow",
    // the dead come in floods: 0.6 of the horde's swell, on top of scripts
    // that are already all chaff (retuned 2026-09-26; 0.65 left the last
    // levels at the very edge of falling on most seeds). The September 29
    // "zombie horde" bump lives in the script's bigger chaff groups and in
    // the early levels' `push` (levels-hollow.js), not in this swell.
    crowdScale: 0.6,
    name: "The Hollow Court",
    tag: "THE DEAD",
    tagColor: "#b08ad8",
    blurb: "The drowned kingdom under the fen has remembered it was a kingdom. Skeletons in floods, wraiths over your blockers, bells that raise more — and some of them are worse dead than alive.",
    types: ["skeleton", "ghoul", "bonearcher", "wraith", "ghast", "crypt", "gravecaller", "amalgam", "hollowking"],
    endlessBoss: "hollowking",
    waves: [
      // I. the fen gives up its dead — a zombie horde: floods, and floods again
      [["skeleton", 26, 400], ["ghoul", 4, 700]],
      [["skeleton", 34, 300], ["ghoul", 6, 500]],
      [["skeleton", 30, 300], ["ghoul", 10, 420], ["bonearcher", 3, 1000]],
      [["ghoul", 16, 340], ["skeleton", 28, 260]],
      [["skeleton", 38, 240], ["bonearcher", 6, 900], ["gravecaller", 1, 0]],
      [["wraith", 3, 1100], ["skeleton", 32, 260], ["ghoul", 12, 360]],
      // II. the court's servants — the bells start ringing, and the flood has a source
      [["ghoul", 22, 300], ["bonearcher", 8, 800], ["skeleton", 26, 260]],
      [["ghast", 5, 1400], ["skeleton", 36, 240], ["gravecaller", 1, 0]],
      [["crypt", 2, 2600], ["bonearcher", 8, 800], ["skeleton", 32, 240]],
      [["skeleton", 54, 170], ["ghoul", 14, 340], ["gravecaller", 1, 0]],
      [["gravecaller", 1, 0], ["skeleton", 28, 280], ["wraith", 3, 1000]],
      [["amalgam", 2, 3000], ["ghoul", 20, 320], ["skeleton", 24, 260]],
      // III. the court in session
      [["crypt", 3, 2200], ["ghast", 5, 1400], ["bonearcher", 8, 700], ["skeleton", 30, 260]],
      [["wraith", 5, 800], ["gravecaller", 1, 0], ["skeleton", 30, 280]],
      [["amalgam", 3, 2600], ["crypt", 3, 2200], ["gravecaller", 1, 0], ["skeleton", 24, 280]],
      [["skeleton", 60, 170], ["ghoul", 20, 300], ["bonearcher", 10, 600]],
      [["ghast", 6, 1200], ["amalgam", 3, 2400], ["wraith", 3, 900], ["gravecaller", 1, 0], ["skeleton", 24, 280]],
      [["skeleton", 30, 260], ["crypt", 3, 2000], ["gravecaller", 1, 0], ["amalgam", 2, 2800], ["hollowking", 1, 0]],
    ],
    roster: [
      { type: "skeleton", cost: 0.9, gap: 360 },
      { type: "ghoul", cost: 1.6, gap: 420 },
      { type: "bonearcher", cost: 2.2, gap: 700 },
      { type: "wraith", cost: 5, gap: 900 },
      { type: "ghast", cost: 4, gap: 1400 },
      { type: "crypt", cost: 8, gap: 2200 },
      { type: "gravecaller", cost: 14, gap: 5200, cap: 1 },
      { type: "amalgam", cost: 13, gap: 2600, cap: 2 },
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
// The Free Play sandbox marches an army of its own making (sandbox.js
// buildArmy): the same shape as a faction, never stored in FACTIONS.
export function setCustomFaction(f) {
  FACTION = f;
  return FACTION;
}
