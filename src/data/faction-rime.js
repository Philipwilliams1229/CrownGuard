// ============ THE RIME CLANS (zone IV) — TEST FACTION ============
// A stub of zone IV's army (art/ZONES-4-5.md), here to prove the engine's
// three new mechanics: landings (`landings`, engine/rime.js), the frost
// shroud (the Rime Seer's `freezeEvery`) and — on its test board,
// realms-rime.js — the blizzard (engine/weather.js).
//
// NOT in FACTIONS yet: factions.js's selectFaction falls back to
// TEST_FACTIONS, so the sims and lab pages can march it by id ("rime") while
// the Field Guide, the sandbox's army list and every menu that walks FACTIONS
// never see it. When the clans are drawn and the chapter is built, move it
// into FACTIONS (one line) and give it a real script.
//
// Placeholder roster: thrall, huscarl and rime seer are new foes (enemies.js,
// borrowed rigs); the Greenwood's wolf stands in for the wolf-rider, its bat
// for the ice drake, its troll for the frost giant.

export const RIME = {
  id: "rime",
  name: "The Rime Clans",
  tag: "RAIDERS",
  tagColor: "#bfe4f2",
  blurb: "Raiders off the frozen sea: thralls in floods, mailed huscarls, seers who sing frost over your halls — and longships that beach behind your lines.",
  types: ["thrall", "huscarl", "rimeseer", "wolf", "bat", "troll"],
  crowdScale: 0.6,
  // seers walk in the thick of the warband, as the goblins' shamans do
  escort: { type: "rimeseer", gather: true, per: 1e9, max: 0, from: 1 },
  // ---- landings ----
  // war-wave -> the party aboard (waves.js landingsOf). Five of eighteen: the
  // surprise lands mid-wave, never every wave. A board without `landings`
  // marches these groups out of the wood instead.
  landings: {
    5: [["thrall", 7, 260]],
    8: [["thrall", 8, 240], ["huscarl", 1, 0]],
    11: [["thrall", 10, 220], ["huscarl", 2, 600]],
    14: [["thrall", 10, 220], ["huscarl", 3, 500]],
    17: [["thrall", 12, 200], ["huscarl", 3, 500], ["rimeseer", 1, 0]],
  },
  // generated waves (a long level's tail, the Endless March): one in three
  landingGen: { from: 19, chance: 0.33, party: [["thrall", 10, 220], ["huscarl", 3, 500]] },
  landingShip: "longship",
  waves: [
    // I. the first raids
    [["thrall", 14, 620]],
    [["thrall", 18, 500]],
    [["thrall", 12, 480], ["wolf", 6, 550]],
    [["huscarl", 4, 1200], ["thrall", 10, 480]],
    [["thrall", 16, 420], ["rimeseer", 1, 0]],
    [["bat", 8, 500], ["thrall", 14, 420]],
    // II. the clans gather
    [["huscarl", 6, 900], ["thrall", 12, 420], ["rimeseer", 1, 0]],
    [["wolf", 18, 380], ["thrall", 10, 420]],
    [["thrall", 22, 340], ["rimeseer", 2, 0]],
    [["huscarl", 8, 800], ["bat", 10, 400]],
    [["troll", 2, 2400], ["thrall", 18, 360], ["rimeseer", 2, 0]],
    [["bat", 14, 320], ["wolf", 12, 400], ["huscarl", 5, 900]],
    // III. the war-host
    [["huscarl", 10, 700], ["thrall", 20, 320], ["rimeseer", 2, 0]],
    [["troll", 3, 2000], ["thrall", 26, 280], ["wolf", 12, 340]],
    [["huscarl", 12, 600], ["rimeseer", 3, 0], ["bat", 12, 320]],
    [["troll", 3, 1800], ["thrall", 30, 260], ["huscarl", 8, 700]],
    [["huscarl", 14, 560], ["wolf", 16, 320], ["rimeseer", 3, 0]],
    [["troll", 4, 1600], ["thrall", 34, 240], ["huscarl", 12, 560], ["rimeseer", 3, 0]],
  ],
  roster: [
    { type: "thrall", cost: 1, gap: 420 },
    { type: "wolf", cost: 1.2, gap: 380 },
    { type: "bat", cost: 0.9, gap: 340 },
    { type: "huscarl", cost: 4, gap: 800 },
    { type: "rimeseer", cost: 9, gap: 4000, cap: 3 },
    { type: "troll", cost: 9, gap: 2000, cap: 4 },
  ],
};

// Armies the engine can march by id that no menu lists (factions.js).
export const TEST_FACTIONS = { rime: RIME };
