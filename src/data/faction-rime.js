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
// The full roster (enemies.js, "THE RIME CLANS"): thralls, huscarls, rime
// seers, berserkers, wolf-riders (`rimerider`), skalds, frost giants, ice
// drakes, the Rime Jarl (the boss, on his war-mammoth) and the sea monsters —
// the sea serpent and the kraken — NEUTRAL hazards that strike friend and foe
// near the water (engine/serpent.js), left out on a board with no water
// (waves.js dryLand). Every one is cold-hardy (`frostProof`): the Frost
// Altar's chill does nothing to them.
export const RIME = {
  id: "rime",
  name: "The Rime Clans",
  tag: "RAIDERS",
  tagColor: "#bfe4f2",
  preview: true,   // in Free Play's army list, never in "Every Army"
  blurb: "Raiders off the frozen sea: thralls in floods, mailed huscarls, seers who sing frost over your halls — and longships that beach behind your lines.",
  types: ["thrall", "huscarl", "rimeseer", "berserker", "rimerider", "skald", "frostgiant", "icedrake", "seaserpent", "kraken", "rimejarl"],
  crowdScale: 0.6,
  // seers walk in the thick of the warband, as the goblins' shamans do; so do
  // skalds, whose chant should carry over the most raiders (waves.js gatherMore)
  escort: { type: "rimeseer", gather: true, per: 1e9, max: 0, from: 1 },
  gather: ["skald"],
  // the Endless March's champion: the Jarl (the sea monsters are neutral
  // hazards, never champions)
  endlessBoss: "rimejarl",
  bosses: ["rimejarl"],
  // ---- landings ----
  // war-wave -> the party aboard (waves.js landingsOf). Five of eighteen: the
  // surprise lands mid-wave, never every wave. A board without `landings`
  // gets no landing party at all.
  landings: {
    5: [["thrall", 7, 260]],
    8: [["thrall", 8, 240], ["huscarl", 1, 0]],
    11: [["thrall", 10, 220], ["huscarl", 2, 600]],
    14: [["thrall", 10, 220], ["huscarl", 3, 500]],
    17: [["thrall", 12, 200], ["huscarl", 3, 500], ["berserker", 2, 400]],
  },
  // generated waves (a long level's tail, the Endless March): one in three
  landingGen: { from: 19, chance: 0.33, party: [["thrall", 10, 220], ["huscarl", 3, 500]] },
  landingShip: "longship",
  waves: [
    // I. the first raids
    [["thrall", 14, 620]],
    [["thrall", 18, 500]],
    [["thrall", 12, 480], ["rimerider", 5, 600]],
    [["huscarl", 4, 1200], ["thrall", 10, 480]],
    [["thrall", 16, 420], ["rimeseer", 1, 0]],
    [["icedrake", 6, 550], ["seaserpent", 1, 0], ["thrall", 14, 420]],
    // II. the clans gather
    [["huscarl", 6, 900], ["thrall", 12, 420], ["rimeseer", 1, 0], ["skald", 1, 0]],
    [["rimerider", 12, 420], ["berserker", 6, 600], ["thrall", 8, 420]],
    [["thrall", 22, 340], ["rimeseer", 2, 0], ["skald", 1, 0]],
    [["huscarl", 8, 800], ["seaserpent", 1, 0], ["icedrake", 10, 400]],
    [["frostgiant", 2, 2400], ["thrall", 18, 360], ["rimeseer", 2, 0]],
    [["thrall", 20, 340], ["kraken", 1, 0], ["berserker", 8, 500]],
    // III. the war-host
    [["huscarl", 10, 700], ["seaserpent", 1, 0], ["thrall", 20, 320], ["rimeseer", 2, 0], ["skald", 1, 0]],
    [["frostgiant", 3, 2000], ["thrall", 26, 280], ["rimerider", 12, 340]],
    [["huscarl", 12, 600], ["rimeseer", 3, 0], ["icedrake", 12, 320], ["berserker", 8, 500]],
    [["frostgiant", 3, 1800], ["seaserpent", 2, 7000], ["thrall", 30, 260], ["huscarl", 8, 700]],
    [["huscarl", 12, 560], ["kraken", 1, 0], ["rimerider", 14, 320], ["rimeseer", 2, 0], ["skald", 1, 0]],
    [["frostgiant", 4, 1600], ["thrall", 34, 240], ["huscarl", 12, 560], ["rimeseer", 3, 0], ["berserker", 10, 450], ["skald", 2, 0]],
  ],
  roster: [
    { type: "thrall", cost: 1, gap: 420 },
    { type: "rimerider", cost: 1.5, gap: 380 },
    { type: "icedrake", cost: 1.2, gap: 360 },
    { type: "berserker", cost: 2, gap: 520 },
    { type: "huscarl", cost: 4, gap: 800 },
    { type: "skald", cost: 8, gap: 3000, cap: 2 },
    { type: "rimeseer", cost: 9, gap: 4000, cap: 3 },
    { type: "frostgiant", cost: 9, gap: 2000, cap: 4 },
  ],
};

// Armies the engine can march by id that no menu lists (factions.js).
export const TEST_FACTIONS = { rime: RIME };
