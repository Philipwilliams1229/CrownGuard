// ============ THE HOLLOWFEN: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
export const HOLLOW_LEVELS = [
      {
        id: "hl1", name: "The Grave Road", realm: "graveroad", short: "Grave Road",
        window: { from: 1, to: 8, count: 10 }, gold: 500,
        blurb: "Across the strait and into the fen, and the dead walking its causeway in floods. They are worth almost nothing — and there are so, so many.",
      },
      {
        id: "hl2", name: "The Sunken Causeway", realm: "sunkencauseway", short: "Causeway",
        window: { from: 2, to: 11, count: 13 }, gold: 600,
        blurb: "Black water either side, wraiths drifting over your blockers, and barrow archers loosing at your knights. The dry ground is all there is.",
      },
      {
        id: "bellmarsh", name: "Bellmarsh", realm: "bellmarsh",
        window: { from: 3, to: 15, count: 16 }, gold: 700,
        blurb: "Every standing stone here rings when struck, and the court has struck them all. Wraiths, ghasts, wardens — the fen's whole household, one after another.",
      },
      {
        id: "hl3", name: "Wightwood", realm: "wightwood", labelAbove: true,
        window: { from: 4, to: 19, count: 20 }, gold: 800,
        blurb: "A drowned forest of white trees. Plague ghasts burst over your line here — kill them far from your knights, or regret it.",
      },
      {
        id: "hl4", name: "The Cairnfields", realm: "cairnfields", short: "Cairnfields", labelAbove: true,
        window: { from: 5, to: 24, count: 23 }, gold: 900,
        blurb: "Every cairn a door, and gravecallers ringing them open. The flood has a source: silence the bells.",
      },
      {
        id: "hl5", name: "The Throne of Dust", realm: "thronedust", short: "Throne of Dust",
        window: { from: 7, to: 30, count: 25, boss: true }, gold: 1000,
        blurb: "The drowned throne itself. Crypt wardens, amalgams that will not stay dead — and the Hollow King, calling his court out of the ground.",
      },
];
