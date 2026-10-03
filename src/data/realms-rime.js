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
//
// Three more test boards for the sea monsters (engine/serpent.js), the same
// road so the sims compare like with like:
//   rimefjord  a meltwater river runs down the board into the sea and under
//              the road's strand: the serpent swims the river, the kraken
//              lies off the strand, longships beach as on the Strand
//   rimeriver  the river and no sea: the serpent swims it; the kraken (and
//              any landing party) never come — two frost giants stand in
//   rimedry    no water at all: neither monster comes (waves.js dryLand)

export default function moreRimeRealms(frostfang) {
  const out = {
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
  const road = out.rimewatch.path;
  const river = { pts: [[7.5, -0.5], [7.3, 3.2], [7.8, 6.4], [7.6, 10.5]], w: 28 };
  out.rimefjord = {
    ...out.rimewatch, id: "rimefjord", name: "Rimewater Fjord", seed: 20261102,
    blurb: "Zone IV's monster board: a meltwater river runs into the sea under the strand. The serpent swims the river; the kraken lies off the shore.",
    rivers: [river], weather: undefined,
  };
  out.rimeriver = {
    ...frostfang, id: "rimeriver", name: "Rime River", tag: "TEST BOARD", tagColor: "#bfe4f2", seed: 20261103,
    blurb: "Zone IV's river board: no sea, so no longships and no kraken; the serpent swims the meltwater.",
    path: road, rivers: [river], ponds: [], decor: [],
    decorRecipe: out.rimewatch.decorRecipe,
  };
  out.rimedry = {
    ...frostfang, id: "rimedry", name: "Rime Fells", tag: "TEST BOARD", tagColor: "#bfe4f2", seed: 20261104,
    blurb: "Zone IV's dry board: no river, no sea — no sea monsters, no landings.",
    path: road, ponds: [], decor: [],
    decorRecipe: out.rimewatch.decorRecipe,
  };
  return out;
}
