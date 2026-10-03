// ============ ZONE IV TEST BOARD (the Rimewater) ============
// One coastal board to prove zone IV's engine mechanics before the chapter's
// fifteen boards are designed: a longship landing spot (`landings`,
// engine/rime.js) and blizzards (`weather`, engine/weather.js). It wears the
// Frostfang Pass's snow ground until the Rimewater's own ground is drawn.
// maps.js merges it into REALMS (passing in the Frostfang realm, so this file
// never imports maps.js). It is in no chapter and no Free Play list: the sims
// (`node scripts/sim.mjs --free rimewatch rime`) and lab pages
// (rim-lab.html) reach it by id.
//
//   rimewatch  THE STRAND   the road comes down from the fells and walks a
//                           frozen strand with the sea at its back, then
//                           climbs to the gate; longships beach on the strand
//                           behind whatever guards its head

export default function moreRimeRealms(frostfang) {
  return {
    rimewatch: {
      ...frostfang,
      id: "rimewatch",
      name: "Rimewatch Strand",
      tag: "TEST BOARD",
      tagColor: "#bfe4f2",
      blurb: "Zone IV's test board: a frozen strand with the black sea behind it. Longships beach on the strand; squalls blow in off the ice.",
      seed: 20261101,
      path: [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      // the sea along the bottom edge, a strip of frozen shingle, then the snow
      coast: { edge: "bottom", from: 60, to: 720, depth: 118, sand: 24 },
      ponds: [],
      decor: [],
      decorRecipe: { count: 22, types: ["snowpine", "snowpine", "icerock", "crystal", "snowpine"] },
      // ---- zone IV mechanics ----
      // the party joins the road at the strand's far end, behind its head
      landings: [{ at: [8.5, 6.4], from: "bottom" }],
      // a squall every 60-90 s of battle (weather.js WEATHER_KINDS.blizzard)
      weather: { kind: "blizzard" },
    },
  };
}
