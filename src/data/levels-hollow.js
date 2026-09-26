// ============ THE HOLLOWFEN: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
// Eleven levels, shaped like the Greenwood's: five twenty-wave levels to
// learn the fen, five of twenty-five to hold it, and a thirty-wave boss.
export const HOLLOW_LEVELS = [
      // five twenty-wave levels to learn the fen...
      {
        id: "hl1", name: "The Grave Road", realm: "graveroad", short: "Grave Road",
        window: { from: 1, to: 12, count: 20 }, gold: 400,
        blurb: "Across the strait and into the fen, and the dead walking its causeway in floods. They are worth almost nothing — and there are so, so many.",
      },
      {
        id: "saltgrave", name: "Saltgrave Strand", realm: "saltgrave", short: "Saltgrave",
        window: { from: 2, to: 14, count: 20 }, gold: 450,
        blurb: "The fen's grey shore, where the strait gives back what it drowned. Ghouls run ahead of the Risen now, and barrow archers stand on the strand to loose at your knights.",
      },
      {
        id: "hl2", name: "The Sunken Causeway", realm: "sunkencauseway", short: "Causeway",
        window: { from: 3, to: 16, count: 20 }, gold: 500,
        blurb: "Black water either side, wraiths drifting over your blockers, and barrow archers loosing at your knights. The dry ground is all there is.",
      },
      {
        id: "bellmarsh", name: "Bellmarsh", realm: "bellmarsh",
        window: { from: 4, to: 17, count: 20 }, gold: 550,
        blurb: "Every standing stone here rings when struck, and the court has struck them all. Wraiths, ghasts, wardens — the fen's whole household, one after another.",
      },
      {
        id: "stillmere", name: "The Stillmere", realm: "stillmere", short: "Stillmere",
        window: { from: 5, to: 20, count: 20 }, gold: 550,
        blurb: "Three shores of a mere so still it shows no stars, and hardly a tower's width of dry ground along any of them. Moor a River Watch on the black water — it sees the whole road.",
      },
      // ...five twenty-five-wave levels to hold it...
      {
        id: "hl3", name: "Wightwood", realm: "wightwood", labelAbove: true,
        window: { from: 6, to: 23, count: 25 }, gold: 600,
        blurb: "A drowned forest of white trees. Plague ghasts burst over your line here — kill them far from your knights, or regret it.",
      },
      {
        id: "drownholm", name: "Drownholm", realm: "drownholm",
        window: { from: 7, to: 25, count: 25 }, gold: 750,
        blurb: "A village the fen took back, and six bridges over the Weepwater's two arms. Crypt wardens take them like doors they own; the islands between are all the ground you get.",
      },
      {
        id: "hl4", name: "The Cairnfields", realm: "cairnfields", short: "Cairnfields", labelAbove: true,
        window: { from: 8, to: 27, count: 25 }, gold: 750,
        blurb: "Every cairn a door, and gravecallers ringing them open. The flood has a source: silence the bells.",
      },
      {
        id: "reedmaze", name: "The Reedmaze", realm: "reedmaze", short: "Reedmaze",
        window: { from: 9, to: 29, count: 25 }, gold: 700,
        blurb: "A road that loses itself in the reeds, and a bog pool in every pocket between its lanes. Grave amalgams wade through it all; find the dry islands and fight from those.",
      },
      {
        id: "lichgate", name: "The Lichgate", realm: "lichgate", short: "Lichgate",
        window: { from: 9, to: 30, count: 25 }, gold: 950,
        blurb: "The crypt hill under the throne, the one dry ground in the fen. The shortest road in the chapter, and the court marching it at a run — everything rides on the field inside the hook.",
      },
      // ...and the boss, thirty waves deep
      {
        id: "hl5", name: "The Throne of Dust", realm: "thronedust", short: "Throne of Dust",
        window: { from: 11, to: 34, count: 30, boss: true }, gold: 1000,
        blurb: "The drowned throne itself. Crypt wardens, amalgams that will not stay dead — and the Hollow King, calling his court out of the ground.",
      },
];
