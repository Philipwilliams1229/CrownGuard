// ============ THE IRON MARCHES: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
//
// Fifteen levels: seven twenty-wave levels to cross the border, seven of
// twenty-five to push into the heartland, and a thirty-wave boss at the
// Citadel (the four added 2026-10-03 take windows between their
// neighbours'). Each one starts a war-wave deeper than the last, and the early `to`s climb gently so each Iron soldier still
// arrives in the level that introduces him (crossbows and cavaliers on the
// King's Road, gryphons at the Muster, rams at Ironford, chaplains at
// Greyhelm). Levels added later (gallowscross, kestrel, coldwater,
// crowstair, and 2026-10's brinewick, ironmouth, wardenmoor, blackcliff)
// have their realms in realms-iron.js.
export const IRON_LEVELS = [
      // seven twenty-wave levels to cross the border...
      {
        id: "ir1", name: "The King's Road", realm: "kingsroad", short: "King's Road",
        window: { from: 1, to: 8, count: 20 }, gold: 400,
        blurb: "A levy column in step behind raised shields that only steel can break: each swallows a physical blow whole, and magic can't pass them. Strip them with quick arrows, or hit the whole column at once.",
      },
      {
        id: "muster", name: "The Muster", realm: "muster",
        window: { from: 2, to: 11, count: 20 }, gold: 450, labelAbove: true,
        blurb: "The Kingdom's drill field: long straights made for a cavalry charge, and the first gryphons wheeling overhead. Look up.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { from: 3, to: 13, count: 20 }, gold: 560,
        blurb: "Crossbowmen shoot your knights down from outside their reach, and gryphons pass clean over the walls. Nothing here fights fair.",
      },
      {
        id: "brinewick", name: "Brinewick", realm: "brinewick",
        window: { from: 3, to: 14, count: 20 }, gold: 600,
        blurb: "The Kingdom's salt-pans on the south shore. The road drops to the beach and runs the sea-dyke flat out, surf on one hand — half of every tower's reach lands in the sea. Moor a boat beside it.",
      },
      {
        id: "ironmouth", name: "Ironmouth", realm: "ironmouth",
        window: { from: 4, to: 14, count: 20 }, gold: 620,
        blurb: "Where the Iron river opens to the sea. A battle on either bank, one long bridge between them, and on the span itself nowhere for a knight to stand — the rams cross it untouched.",
      },
      {
        id: "gallowscross", name: "Gallows Cross", realm: "gallowscross", short: "Gallows",
        window: { from: 4, to: 15, count: 20 }, gold: 640,
        blurb: "Knight-sergeants in plate, and frost won't slow them. The road loops back through its own crossroads — build at the cross and make them pay twice.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { from: 5, to: 17, count: 20 }, gold: 850,
        blurb: "The river eats half your ground, cavaliers ride the first blocker down, and the siege rams come through the ford anyway.",
      },
      // ...seven of twenty-five into the heartland...
      {
        id: "kestrel", name: "Kestrel Head", realm: "kestrel", short: "Kestrel",
        window: { from: 6, to: 20, count: 25 }, gold: 960,
        blurb: "Gryphons come in off the strait on the sea wind, high over every knight you post. Moor a boat off the beach, and bring magic to pull them down.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm", short: "Greyhelm",
        window: { from: 7, to: 22, count: 25 }, gold: 800,
        blurb: "Chaplains walk inside the column mending everyone near them, so chip damage means nothing. Burst the column down faster than they can pray — or kill the chaplain first.",
      },
      {
        id: "coldwater", name: "Coldwater", realm: "coldwater",
        window: { from: 8, to: 25, count: 25 }, gold: 1040,
        blurb: "Four bridges, and the siege rams take every one at a walk — nothing slows them, nothing stuns them. A boat moored where the waters meet watches both banks.",
      },
      {
        id: "crowstair", name: "Crowstair", realm: "crowstair",
        window: { from: 9, to: 27, count: 25 }, gold: 1100,
        blurb: "Cavaliers take the long traverses at a gallop. Only at the hairpins do two lanes pass in one tower's reach — build there, and post your knights two deep.",
      },
      {
        id: "wardenmoor", name: "Warden Moor", realm: "wardenmoor", short: "Warden Moor",
        window: { from: 9, to: 28, count: 25 }, gold: 1150,
        blurb: "The bare moor where the wardens drill. The road runs down the moor and straight back up at a gallop; only the strip between sees both lanes, and the old ruined wall runs right through it.",
      },
      {
        id: "blackcliff", name: "Blackcliff", realm: "blackcliff", labelAbove: true,
        window: { from: 9, to: 29, count: 25 }, gold: 1350,
        blurb: "Black sea-cliffs where the gryphons nest. The road rings a deep cove: inside it there's only a ledge of cliff-top to build on, but a boat in the cove reaches every side.",
      },
      {
        id: "undercliff", name: "Undercliff", realm: "undercliff",
        window: { from: 9, to: 30, count: 25 }, gold: 1600,
        blurb: "A shelf of road folded twice under the mountain. Your towers watch three lanes at once — and the Kingdom fills all three.",
      },
      // ...and the boss, thirty waves deep
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel", short: "The Citadel",
        window: { from: 10, to: 34, count: 30, boss: true }, gold: 1400,
        blurb: "The last mile. The Lord Marshal's banner drives the army faster and harder — cut down the banner.",
      },
];
