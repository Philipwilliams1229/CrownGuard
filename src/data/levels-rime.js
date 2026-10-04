// ============ THE RIMEWATER: ITS LEVELS ============
// Zone IV (owner, 2026-10-04): the Rime Clans' frigid sea country, north
// across the water from the Hollowfen. Fifteen levels in marching order on
// the same shape as the other chapters: seven twenty-wave levels, seven of
// twenty-five, and a thirty-wave boss (the Rime Jarl). Waypoints live in
// mapLayout.js; the boards are in realms-rime-a/b/c.js (five each).
// More water than any chapter: nine coastal boards (seven of them beach a
// longship mid-level — `landings` on the realm), three rivers, two meres and
// one dry board. Weather is the blizzard (weather-plan.js, by place in the
// chapter). Windows and gold are a first pass, to be tuned on the sims.
export const RIME_LEVELS = [
      // seven twenty-wave levels to make landfall...
      { id: "frostwake", name: "Frostwake Strand", realm: "frostwake", short: "Frostwake",
        window: { from: 1, to: 12, count: 20 }, gold: 450,
        blurb: "Landfall on the Rimewater's black shore. Thralls come up the strand in floods — and the first longship beaches behind your line." },
      { id: "skerryway", name: "The Skerry Way", realm: "skerryway", short: "Skerry Way",
        window: { from: 2, to: 14, count: 20 }, gold: 500,
        blurb: "A road from skerry to skerry along a shore of broken ice." },
      { id: "icefjord", name: "Ice-Fjord", realm: "icefjord",
        window: { from: 3, to: 15, count: 20 }, gold: 550,
        blurb: "A meltwater river runs down the fjord, and something long swims in it." },
      { id: "whalebone", name: "Whalebone Bay", realm: "whalebone", short: "Whalebone",
        window: { from: 4, to: 16, count: 20 }, gold: 600,
        blurb: "A whaling bay ribbed with old bones; the raiders' ships run in on the tide." },
      { id: "frostmere", name: "Frostmere", realm: "frostmere",
        window: { from: 5, to: 17, count: 20 }, gold: 650,
        blurb: "Black meres in the snowfields, too deep to freeze." },
      { id: "runestead", name: "Runestead", realm: "runestead",
        window: { from: 5, to: 18, count: 20 }, gold: 650,
        blurb: "A rune-stone field on the high snow, far from any water." },
      { id: "wolfsound", name: "Wolfsound", realm: "wolfsound",
        window: { from: 6, to: 20, count: 20 }, gold: 700,
        blurb: "A sound where the wolf-riders muster and the longships shelter." },
      // ...seven twenty-five-wave levels into the north...
      { id: "glacierfoot", name: "Glacier Foot", realm: "glacierfoot", short: "Glacier Foot",
        window: { from: 6, to: 22, count: 25 }, gold: 800,
        blurb: "Where the glacier calves into its river." },
      { id: "sealrocks", name: "The Seal Rocks", realm: "sealrocks", short: "Seal Rocks",
        window: { from: 7, to: 24, count: 25 }, gold: 850,
        blurb: "Rocks and seal-haunts off a raider beach." },
      { id: "saltreach", name: "Saltreach", realm: "saltreach",
        window: { from: 8, to: 26, count: 25 }, gold: 900,
        blurb: "A long reach of salt-white shore under the ice cliffs." },
      { id: "bergwater", name: "Bergwater", realm: "bergwater",
        window: { from: 8, to: 27, count: 25 }, gold: 950,
        blurb: "A lake choked with stranded bergs." },
      { id: "drakesfell", name: "Drakesfell", realm: "drakesfell",
        window: { from: 9, to: 29, count: 25 }, gold: 1000,
        blurb: "The fells where the ice drakes nest, and a river out of them." },
      { id: "krakenfirth", name: "Kraken Firth", realm: "krakenfirth", short: "Kraken Firth",
        window: { from: 9, to: 30, count: 25 }, gold: 1100,
        blurb: "A firth no fisher will sail; the kraken keeps it." },
      { id: "skaldhold", name: "Skaldhold", realm: "skaldhold",
        window: { from: 10, to: 31, count: 25 }, gold: 1150,
        blurb: "The skalds' hold on the sea cliffs, and the last landing before the Jarl's fjord." },
      // ...and the boss, thirty waves deep
      { id: "jarlsfjord", name: "The Jarl's Fjord", realm: "jarlsfjord", short: "Jarl's Fjord",
        window: { from: 11, to: 34, count: 30, boss: true }, gold: 1300,
        blurb: "The Rime Jarl's own fjord. His war-mammoth, his huscarls, and every ship he has." },
];
