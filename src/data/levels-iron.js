// ============ THE IRON MARCHES: ITS LEVELS ============
// The chapter's levels in marching order (see campaign.js for what the
// fields mean). Waypoints on the continent map live in mapLayout.js.
export const IRON_LEVELS = [
      {
        id: "ir1", name: "The King's Road", realm: "kingsroad", short: "King's Road",
        window: { from: 1, to: 8, count: 10 }, gold: 450,
        blurb: "A levy column in step behind raised shields. The first two blows off any tower are wasted — hit them heavy.",
      },
      {
        id: "muster", name: "The Muster", realm: "muster",
        window: { from: 2, to: 11, count: 12 }, gold: 500, labelAbove: true,
        blurb: "The Kingdom's drill field: long straights made for a cavalry charge, and the first gryphons wheeling overhead. Look up.",
      },
      {
        id: "ir2", name: "Stonewatch", realm: "stonewatch",
        window: { from: 3, to: 14, count: 15 }, gold: 600,
        blurb: "Crossbowmen shoot your knights down from outside their reach, and gryphons pass clean over the walls. Nothing here fights fair.",
      },
      {
        id: "ir3", name: "Ironford", realm: "ironford",
        window: { from: 4, to: 17, count: 18 }, gold: 700,
        blurb: "The river eats half your ground, cavaliers ride the first blocker down, and the siege rams come through the ford anyway.",
      },
      {
        id: "ir4", name: "Greyhelm Pass", realm: "greyhelm", short: "Greyhelm",
        window: { from: 5, to: 20, count: 20 }, gold: 750,
        blurb: "Chaplains ward the whole column against chip damage. Break the ward with something that hits once and hits hard.",
      },
      {
        id: "undercliff", name: "Undercliff", realm: "undercliff",
        window: { from: 6, to: 24, count: 22 }, gold: 900,
        blurb: "A shelf of road folded twice under the mountain. Your towers watch three lanes at once — and the Kingdom fills all three.",
      },
      {
        id: "ir5", name: "The Citadel Gate", realm: "citadel", short: "The Citadel",
        window: { from: 7, to: 30, count: 25, boss: true }, gold: 1000,
        blurb: "The last mile. The Lord Marshal's banner drives the army faster and harder — cut down the banner.",
      },
];
