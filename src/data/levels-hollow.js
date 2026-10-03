// ============ THE HOLLOWFEN: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
// Fifteen levels: seven twenty-wave levels to learn the fen, seven of
// twenty-five to hold it, and a thirty-wave boss (the four added 2026-10-03
// take windows between their neighbours').
// `push` (see waves.js) thickens the rank and file of the early levels: the
// player comes here from the Iron Marches with strong towers, and the fen is
// meant to feel like a zombie horde from its first wave (Sept 29 pass).
export const HOLLOW_LEVELS = [
      // seven twenty-wave levels to learn the fen...
      {
        id: "hl1", name: "The Grave Road", realm: "graveroad", short: "Grave Road",
        window: { from: 1, to: 12, count: 20, push: 2.0 }, gold: 400,
        blurb: "Across the strait and into the fen, and the dead walking its causeway in floods. They are worth almost nothing — and there are so, so many.",
      },
      {
        id: "saltgrave", name: "Saltgrave Strand", realm: "saltgrave", short: "Saltgrave",
        window: { from: 2, to: 14, count: 20, push: 1.8 }, gold: 450,
        blurb: "The fen's grey shore, where the strait gives back what it drowned. Ghouls run ahead of the Risen now, and barrow archers stand on the strand to loose at your knights.",
      },
      {
        id: "hl2", name: "The Sunken Causeway", realm: "sunkencauseway", short: "Causeway",
        window: { from: 3, to: 16, count: 20, push: 1.6 }, gold: 500,
        blurb: "Black water either side, wraiths drifting over your blockers, and barrow archers loosing at your knights. The dry ground is all there is.",
      },
      {
        id: "bellmarsh", name: "Bellmarsh", realm: "bellmarsh",
        window: { from: 4, to: 17, count: 20, push: 1.5 }, gold: 550,
        blurb: "Every standing stone here rings when struck, and the court has struck them all. Wraiths, ghasts, wardens — the fen's whole household, one after another.",
      },
      {
        id: "stillmere", name: "The Stillmere", realm: "stillmere", short: "Stillmere",
        window: { from: 5, to: 20, count: 20, push: 1.4 }, gold: 550,
        blurb: "Three shores of a mere so still it shows no stars, and hardly a tower's width of dry ground along any of them. Moor a River Watch on the black water — it sees the whole road.",
      },
      {
        id: "lanternfen", name: "The Lantern Fen", realm: "lanternfen", short: "Lantern Fen",
        window: { from: 5, to: 20, count: 20, push: 1.35 }, gold: 550,
        blurb: "Corpse-lights dance over the creek where it runs out to the western sea. Follow them and drown; the dead follow them anyway, and the creek doesn't stop them.",
      },
      {
        id: "abbeymere", name: "Abbeymere", realm: "abbeymere",
        window: { from: 6, to: 21, count: 20, push: 1.3 }, gold: 550,
        blurb: "An abbey the fen drowned to the bell-tower. Its mere fills the cloister, and the dead monks walk the road around it to vespers that never end.",
      },
      // ...seven twenty-five-wave levels to hold it...
      {
        id: "hl3", name: "Wightwood", realm: "wightwood", labelAbove: true,
        window: { from: 6, to: 23, count: 25, push: 1.2 }, gold: 600,
        blurb: "A drowned forest of white trees. Plague ghasts burst over your line here — kill them far from your knights, or regret it.",
      },
      {
        id: "drownholm", name: "Drownholm", realm: "drownholm",
        window: { from: 7, to: 25, count: 25 }, gold: 750,
        blurb: "A village the fen took back, and six bridges over the Weepwater's two arms. Crypt wardens take them like doors they own; the islands between are all the ground you get.",
      },
      {
        id: "barrowdowns", name: "The Barrowdowns", realm: "barrowdowns", short: "Barrowdowns",
        window: { from: 7, to: 26, count: 25 }, gold: 800,
        blurb: "The high downs at the fen's northern edge, the old kings' barrows shoulder to shoulder. Dry ground at last — and every mound on it is open.",
      },
      {
        id: "hl4", name: "The Cairnfields", realm: "cairnfields", short: "Cairnfields", labelAbove: true,
        // gold 750 → 850 (Sept 2026, provisional): a new hall now holds its fire
        // while it is built, and the sim's wave-16 emergency build lost the map;
        // 850 wins it on all six seeds tried. The owner will check it in playtest.
        window: { from: 8, to: 27, count: 25 }, gold: 850,
        blurb: "Every cairn a door, and gravecallers ringing them open. The flood has a source: silence the bells.",
      },
      {
        id: "reedmaze", name: "The Reedmaze", realm: "reedmaze", short: "Reedmaze",
        window: { from: 9, to: 29, count: 25 }, gold: 700,
        blurb: "A road that loses itself in the reeds, and a bog pool in every pocket between its lanes. Grave amalgams wade through it all; find the dry islands and fight from those.",
      },
      {
        id: "lichgate", name: "The Lichgate", realm: "lichgate", short: "Lichgate",
        window: { from: 9, to: 30, count: 25 }, gold: 1150,
        blurb: "The crypt hill under the throne, the one dry ground in the fen. The shortest road in the chapter, and the court marching it at a run — everything rides on the field inside the hook.",
      },
      {
        id: "deadweir", name: "The Dead Weir", realm: "deadweir", short: "Dead Weir",
        window: { from: 10, to: 31, count: 25 }, gold: 1100,
        blurb: "The Blackwater pours over a weir the drowned kingdom built. Its sluices are the last bridges before the throne, and the court crosses them in force.",
      },
      // ...and the boss, thirty waves deep
      {
        id: "hl5", name: "The Throne of Dust", realm: "thronedust", short: "Throne of Dust",
        window: { from: 11, to: 34, count: 30, boss: true }, gold: 1200,
        blurb: "The drowned throne itself. Crypt wardens, amalgams that will not stay dead — and the Hollow King, calling his court out of the ground.",
      },
];
