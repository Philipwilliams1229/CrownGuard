// ============ THE IRON MARCHES: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
//
// Eleven levels, shaped like the Greenwood's: five twenty-wave levels to
// cross the border, five of twenty-five to push into the heartland, and a
// thirty-wave boss at the Citadel. Each one starts a war-wave deeper than
// the last, and the early `to`s climb gently so each Iron soldier still
// arrives in the level that introduces him (crossbows and cavaliers on the
// King's Road, gryphons at the Muster, rams at Ironford, chaplains at
// Greyhelm). Levels added later (gallowscross, kestrel, coldwater,
// crowstair) have their realms in realms-iron.js.
export const IRON_LEVELS = [
      // five twenty-wave levels to cross the border...
      {
        id: "ir1", name: "The King's Road", realm: "kingsroad", short: "King's Road",
        window: { from: 1, to: 8, count: 20 }, gold: 450,
        blurb: "A levy column in step behind raised shields. The first two blows off any tower are wasted — hit them heavy.",
      },
      {
        id: "muster", name: "The Muster", realm: "muster",
        window: { from: 2, to: 11, count: 20 }, gold: 480, labelAbove: true,
        blurb: "The Kingdom's drill field: long straights made for a cavalry charge, and the first gryphons wheeling overhead. Look up.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { from: 3, to: 13, count: 20 }, gold: 540,
        blurb: "Crossbowmen shoot your knights down from outside their reach, and gryphons pass clean over the walls. Nothing here fights fair.",
      },
      {
        id: "gallowscross", name: "Gallows Cross", realm: "gallowscross", short: "Gallows",
        window: { from: 4, to: 15, count: 20 }, gold: 600,
        blurb: "Knight-sergeants in plate, and frost won't slow them. The road loops back through its own crossroads — build at the cross and make them pay twice.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { from: 5, to: 17, count: 20 }, gold: 700,
        blurb: "The river eats half your ground, cavaliers ride the first blocker down, and the siege rams come through the ford anyway.",
      },
      // ...five of twenty-five into the heartland...
      {
        id: "kestrel", name: "Kestrel Head", realm: "kestrel", short: "Kestrel",
        window: { from: 6, to: 20, count: 25 }, gold: 790,
        blurb: "Gryphons come in off the strait on the sea wind, high over every knight you post. Moor a boat off the beach, and bring magic to pull them down.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm", short: "Greyhelm",
        window: { from: 7, to: 22, count: 25 }, gold: 740,
        blurb: "Chaplains ward the whole column against chip damage. Break the ward with something that hits once and hits hard.",
      },
      {
        id: "coldwater", name: "Coldwater", realm: "coldwater",
        window: { from: 8, to: 25, count: 25 }, gold: 800,
        blurb: "Four bridges, and the siege rams take every one at a walk — nothing slows them, nothing stuns them. A boat moored where the waters meet watches both banks.",
      },
      {
        id: "crowstair", name: "Crowstair", realm: "crowstair",
        window: { from: 9, to: 27, count: 25 }, gold: 860,
        blurb: "Cavaliers take the long traverses at a gallop. Only at the hairpins do two lanes pass in one tower's reach — build there, and post your knights two deep.",
      },
      {
        id: "undercliff", name: "Undercliff", realm: "undercliff",
        window: { from: 9, to: 30, count: 25 }, gold: 1150,
        blurb: "A shelf of road folded twice under the mountain. Your towers watch three lanes at once — and the Kingdom fills all three.",
      },
      // ...and the boss, thirty waves deep
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel", short: "The Citadel",
        window: { from: 11, to: 34, count: 30, boss: true }, gold: 960,
        blurb: "The last mile. The Lord Marshal's banner drives the army faster and harder — cut down the banner.",
      },
];
