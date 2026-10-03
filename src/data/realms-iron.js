// ============ MORE IRON REALMS ============
// Battlefields added to the chapter after the first set. maps.js calls this
// with its ironVariant(...) helper (the chapter's ground, palette, water
// and light) and merges what it returns into REALMS, so this file never
// imports maps.js (no import cycle).
//
// Four boards that each ask something the first seven don't:
//   gallowscross — the road crosses ITSELF: one crossroads, walked twice
//   kestrel      — the Marches' north shore: the sea along the top edge
//   coldwater    — two rivers meeting, and four bridges over them
//   crowstair    — a mountainside climbed in long SLANTED traverses
import { addFootprints, coastLineOf, coastSeed } from "./terrain.js";
import { MX, MY, H } from "./constants.js";
// The chapter's own pieces (src/render/scenery-iron.js) block building as
// wide as they stand.
addFootprints({
  irpine: 12, irspruce: 12, ircrag: 11, irheather: 7, irwall: 16, irgibbet: 9, irmile: 6,
  irbeacon: 8, irwagon: 17, irpikes: 10, irtent: 15, irbanner: 6, irtower: 14, irgate: 6, irruin: 14,
  // the fifteen-level boards' pieces (2026-10-03): salt-works, drill yard, the
  // gryphons' rock, the waterfront. The water pieces (irquay, irmoor) stand on
  // the bank and reach out east over the river, so only their shore end counts.
  irpan: 14, irsluice: 7, irsalthouse: 18, irsalt: 9, irboat: 8, irwreck: 9, irquintain: 8, irdummy: 6, irbutts: 13,
  irrack: 11, irmuster: 7, irstack: 11, ireyrie: 12, irquay: 8, irmoor: 5, irtoll: 14,
});

// Hand-placed pieces for a board made by ironVariant: appended to its own
// decor (the camp's gate tower), in grid px like every realm's `decor`.
const withDecor = (realm, list) => ({ ...realm, decor: [...(realm.decor || []), ...list] });
// A ruined drystone wall strung across the moor: pieces every `step` px
// from x0 to x1 along a gently wandering line, a ruined tower now and then,
// left open wherever the road (or a breach) passes. Grid px.
const wallLine = (x0, x1, y, { step = 34, wander = 6, gaps = [], towers = [], seed = 1 } = {}) => {
  const out = [];
  for (let x = x0; x <= x1; x += step) {
    if (gaps.some(([a, b]) => x > a && x < b)) continue;
    const yy = Math.round(y + wander * Math.sin(x * 0.011 + seed) + wander * 0.5 * Math.sin(x * 0.037 + seed * 2.1));
    const tw = towers.some((t) => Math.abs(t - x) < step / 2);
    out.push({ x: Math.round(x), y: yy, t: tw ? "irruin" : "irwall", s: tw ? 1.05 : 1 });
  }
  return out;
};
// Pieces strung along a coast's cliff-top: one every `step` px measured
// along the shore (so a steep headland gets its share) from u0 to u1, each
// standing `back` px inland of the beach, where the grounding pass (which
// keeps decor off the sand) leaves it. Grid px.
const rimLine = (seed, coast, u0, u1, { step = 44, back = 14, types = ["ircrag"] } = {}) => {
  const c = { sand: 22, seed: coastSeed({ seed }), ...coast }, out = [];
  const at = (u) => Math.max(0, coastLineOf(c, u)) + c.sand + back;
  let run = step / 2, pu = u0, pv = at(u0), i = 0;
  for (let u = u0 + 2; u <= u1; u += 2) {
    const v = at(u);
    run += Math.hypot(u - pu, v - pv);
    pu = u; pv = v;
    if (run < step) continue;
    run = 0;
    const vv = v + [0, 9, 3, 12][i % 4];   // staggered, so the line reads as broken rock
    const [x, y] = c.edge === "top" ? [u, vv] : [u, H - vv];
    out.push({ x: Math.round(x - MX), y: Math.round(y - MY), t: types[i % types.length], s: 0.9 + (i % 3) * 0.12 });
    i++;
  }
  return out;
};

// Turn the rim piece nearest each [x, y] (grid px) into something else, so a
// landmark keeps its place on the rim however the coast's line moves.
const swapNearest = (list, swaps) => {
  const out = list.map((d) => ({ ...d }));
  for (const [x, y, with_] of swaps) {
    let bi = -1, bd = Infinity;
    out.forEach((d, i) => { const dd = Math.hypot(d.x - x, d.y - y); if (d.t !== "irheather" && !d.swapped && dd < bd) { bd = dd; bi = i; } });
    if (bi >= 0) out[bi] = { ...out[bi], ...with_, swapped: true };
  }
  return out;
};

const BLACKCLIFF_COAST = { edge: "top", from: 140, to: 670, depth: 124, sand: 12, ease: 240 };

export default function moreIronRealms(ironVariant) {
  return {
    // ---- Gallows Cross ----
    // The column comes in along the middle of the board, loops north round
    // the gibbet field and comes back down straight through its own
    // crossroads. A tower at the cross shoots at the same army twice.
    gallowscross: ironVariant(
      "gallowscross", "Gallows Cross",
      "An old hanging crossroads on the border heath. The Kingdom's road loops round the gibbet and runs back through its own crossing — one army, both roads.",
      20260931,
      [[0.9, 5], [9, 5], [9, 2], [4, 2], [4, 8], [12, 8], [12, 3], [13.7, 3]],
      { decorRecipe: { count: 14, types: ["irgibbet", "ircrag", "irwall", "irheather", "irtower", "irmile"] } },
    ),

    // ---- Kestrel Head ----
    // The Marches run down to the grey strait here. The road comes in along
    // the cliff-top, then turns its back on the sea and winds inland; the
    // sea along the top edge will float a River Watch.
    kestrel: ironVariant(
      "kestrel", "Kestrel Head",
      "A beacon on the headland over the grey strait. The road runs the cliff-top in the wind, then turns inland — and the sea will float a River Watch, if you moor one.",
      20260932,
      [[0.9, 2.6], [6, 2.6], [6, 5.2], [2, 5.2], [2, 8], [9, 8], [9, 3.2], [12, 3.2], [12, 6.2], [13.7, 6.2]],
      {
        coast: { edge: "top", from: 150, depth: 92, sand: 24 },
        light: { tint: "210,226,240", amount: 0.14, vignette: 0.3 },
        decorRecipe: { count: 13, types: ["ircrag", "ircrag", "irbeacon", "irspruce", "irwall", "irbanner"] },
      },
    ),

    // ---- Coldwater ----
    // The Coldwater comes down from the north and the Greywater in from the
    // west, and they meet mid-board. The road has to bridge them four times;
    // water walls in three sides of every build.
    coldwater: ironVariant(
      "coldwater", "Coldwater",
      "Where the Coldwater takes in the Greywater. Two rivers, four bridges, and the column crossing every one of them — moor a River Watch at the meeting of the waters.",
      20260933,
      [[0.9, 3], [4, 3], [4, 8.5], [12.5, 8.5], [12.5, 4], [7, 4], [7, 1.2], [13.7, 1.2]],
      {
        rivers: [
          // the Greywater: in from the west, running on under the Coldwater
          // so the main stream (drawn after it) covers the join. Listed
          // first, it is also the reach the River Watch's skiffs patrol.
          { pts: [[-0.5, 6.4], [3.5, 6.3], [7, 6.1], [9.75, 5.6]], w: 26 },
          // the Coldwater: north edge to south edge, the main stream
          { pts: [[10.3, -0.5], [10.1, 2.6], [9.7, 5.6], [9.9, 10.5]], w: 32 },
        ],
        decorRecipe: { count: 12, types: ["irspruce", "ircrag", "irpine", "irtower", "irwall"] },
      },
    ),

    // ---- Crowstair ----
    // The mountain road the Kingdom cut down from the heights: three long
    // slanting traverses joined by hairpins. At each hairpin two traverses
    // run close; out at their far ends they are a long way apart.
    crowstair: ironVariant(
      "crowstair", "Crowstair",
      "The mountain road down from the heights, cut in three long slanting traverses. At every hairpin two of them run shoulder to shoulder — at the far ends, nothing reaches both.",
      20260934,
      [[0.9, 0.8], [12.3, 2.2], [12.3, 4.7], [1.8, 6.1], [1.8, 8.6], [13.7, 8.9]],
      {
        light: { tint: "212,222,238", amount: 0.14, vignette: 0.38 },
        decorRecipe: { count: 18, types: ["ircrag", "ircrag", "irspruce", "ircrag", "irpine", "irtower"] },
      },
    ),


    // ---- added when the chapter grew to fifteen (2026-10-03) ----
    // brinewick  the sea-dyke: the road's long straight runs along the beach
    // ironmouth  the estuary: two battles on two banks, one long bridge
    // wardenmoor the drill run: a down-and-up lane pair, a ruined wall across
    // blackcliff the cove: the road rings a bay under the cliffs

    // ---- Brinewick ----
    // The salt-pans on the south shore. The column drops off the headland to
    // the beach and marches the sea-dyke, the longest straight on the board,
    // with the surf on its right hand: a tower there finds land on one side
    // only. Then it climbs back past the salt-works to the gate.
    brinewick: withDecor(ironVariant(
      "brinewick", "Brinewick",
      "The Kingdom's salt-pans on the south shore. The road drops to the beach and runs the sea-dyke flat out, the surf on one hand — half of every tower's reach lands in the sea.",
      20261021,
      [[0.9, 1.4], [3.4, 1.4], [3.4, 6.3], [10.6, 6.3], [10.6, 2.2], [13.7, 2.2]],
      {
        coast: { edge: "bottom", from: 160, depth: 128, sand: 26 },
        light: { tint: "224,232,240", amount: 0.13, vignette: 0.24 },
        scatter: { patches: 34, tufts: 26, flowers: 8, flowerCols: ["#eeeadc", "#b87ab0", "#e8cc5a"] },
        decorRecipe: { count: 26, types: ["irheather", "ircrag", "irheather", "irwall", "irheather"] },
      },
    ), [
      // a beacon on the headland where the road comes down to the shore
      { x: 96, y: 372, t: "irbeacon", s: 1 },
      // the salt-works: a field of earthen beds (brine let in, crusting, raked
      // up, drying) of a few sizes, sharing banks, fed by a channel with its
      // sluice gate on the sea side; the salt-house boiling it down, salt
      // waiting for the cart
      { x: 302, y: 145, t: "irpan", s: 1.15, v: 1 },
      { x: 339, y: 141, t: "irpan", s: 1, v: 0 },
      { x: 376, y: 147, t: "irpan", s: 1.2, v: 3 },
      { x: 415, y: 142, t: "irpan", s: 1.05, v: 1 },
      { x: 318, y: 165, t: "irpan", s: 1.1, v: 2 },
      { x: 356, y: 168, t: "irpan", s: 1.2, v: 0 },
      { x: 396, y: 164, t: "irpan", s: 1.05, v: 1 },
      { x: 433, y: 167, t: "irpan", s: 1, v: 2 },
      { x: 356, y: 200, t: "irsluice", s: 1 },
      { x: 244, y: 170, t: "irsalthouse", s: 1.1 },
      { x: 260, y: 210, t: "irsalt", s: 1, v: 1 },
      { x: 394, y: 214, t: "irsalt", s: 0.95, v: 2 },
      { x: 432, y: 212, t: "irsalt", s: 1, v: 0 },
      { x: 462, y: 186, t: "irwagon", s: 0.95, v: 2 },
      // boats hauled up on the strand below the headland
      { x: 171, y: 434, t: "irboat", s: 1, v: 2 },
      { x: 166, y: 454, t: "irboat", s: 1, v: 1 },
    ]),

    // ---- Ironmouth ----
    // The Iron river comes down from the north and opens into its estuary
    // across the south of the board. The column winds through the west bank,
    // takes the one long bridge over the mouth, and climbs the east bank to
    // the gate: two battles, the water between them, and a long stretch of
    // road no knight can stand on.
    ironmouth: withDecor(ironVariant(
      "ironmouth", "Ironmouth",
      "Where the Iron river opens to the sea. One long bridge over the mouth, a battle on either bank, and on the span itself nowhere for a knight to stand.",
      20261022,
      [[0.9, 1.4], [4.8, 1.4], [4.8, 4.4], [1.9, 4.4], [1.9, 7.6], [10.4, 7.6], [10.4, 2.8], [13.7, 2.8]],
      {
        rivers: [
          // the Iron river, one water from the hills to the sea: narrow under
          // the northern spruce, ~92 wide where the long bridge spans it, then
          // flaring past the bridge into its estuary (a width per point, ws)
          {
            pts: [[7.9, -0.5], [7.4, 1.6], [7.6, 3.6], [7.2, 5.0], [7.05, 6.3], [7.1, 7.6], [7.2, 8.45], [7.55, 9.4], [8.0, 10.5]],
            w: 92, ws: [38, 44, 54, 64, 78, 92, 104, 220, 420],
          },
        ],
        light: { tint: "212,224,238", amount: 0.12, vignette: 0.3 },
        decorRecipe: { count: 24, types: ["irspruce", "ircrag", "irpine", "irwall", "irheather", "irspruce", "irheather"] },
      },
    ), [
      // the bridge-tower on the east bank
      { x: 600, y: 420, t: "irtower", s: 1 },
      // the waterfront on the west bank below the bridge: a long wharf with a
      // barge made fast and a boat tied at its end, the toll-house at its head
      { x: 288, y: 478, t: "irquay", s: 1.2, v: 0 },
      { x: 278, y: 440, t: "irtoll", s: 1 },
      // a beacon on the east bank looking out to sea
      { x: 520, y: 470, t: "irbeacon", s: 0.95 },
      // a stand of spruce and pine on the east bank's high ground
      { x: 520, y: 34, t: "irspruce", s: 1.1 },
      { x: 556, y: 62, t: "irpine", s: 1 },
      { x: 592, y: 26, t: "irspruce", s: 1.2 },
      { x: 628, y: 58, t: "irspruce", s: 0.95 },
      { x: 600, y: 96, t: "irheather", s: 1 },
    ]),

    // ---- Warden Moor ----
    // The wardens' drill run: the road goes straight down the moor and
    // straight back up it, two lanes a short field apart from top to bottom.
    // That one strip sees both the whole way — and the old wall that crosses
    // the moor runs through it, a ruined tower standing on the best ground.
    wardenmoor: withDecor(ironVariant(
      "wardenmoor", "Warden Moor",
      "The bare moor behind the eastern peaks, where the wardens drill. The road runs down the moor and straight back up, and only the strip between sees both — an old ruined wall runs through it.",
      20261023,
      [[0.9, 1.4], [5.6, 1.4], [5.6, 8.5], [8.0, 8.5], [8.0, 1.4], [11.6, 1.4], [11.6, 6.2], [13.7, 6.2]],
      {
        light: { tint: "206,214,232", amount: 0.13, vignette: 0.36 },
        decorRecipe: { count: 38, types: ["irheather", "ircrag", "irheather", "ircrag", "irspruce"] },
      },
    ), [
      // the old wall, broken only where the road goes through it
      ...wallLine(-8, 650, 262, { gaps: [[241, 345], [356, 460], [529, 633]], towers: [128, 502], seed: 2 }),
      // a milecastle in the drill strip
      { x: 350, y: 262, t: "irruin", s: 1.1 },
      // the wardens' drill camp, below the last lane
      { x: 496, y: 412, t: "irtent", s: 1 },
      { x: 560, y: 436, t: "irtent", s: 0.95 },
      { x: 618, y: 404, t: "irbanner", s: 1 },
      { x: 612, y: 470, t: "irpikes", s: 1 },
      // the drill yard: a weapons rack by the tents, practice men and a pell,
      // the quintain, the butts against the castle wall, the muster post
      { x: 454, y: 396, t: "irrack", s: 1 },
      { x: 480, y: 474, t: "irdummy", s: 1, v: 1 },
      { x: 512, y: 488, t: "irdummy", s: 1, v: 0 },
      { x: 544, y: 498, t: "irdummy", s: 1, v: 2 },
      { x: 576, y: 488, t: "irdummy", s: 1, v: 3 },
      { x: 660, y: 428, t: "irquintain", s: 1 },
      { x: 662, y: 490, t: "irbutts", s: 1.1 },
      { x: 656, y: 372, t: "irmuster", s: 1 },
    ]),

    // ---- Blackcliff ----
    // A deep cove bites into the cliffs along the top of the board. The road
    // comes in on the western headland, rings the cove along the cliff-top
    // and climbs the eastern headland to the gate, with one dip south past
    // the gryphons' crag. Inside the ring only a ledge of cliff-top is left
    // to build on, but a boat in the cove reaches every side of it.
    blackcliff: withDecor(ironVariant(
      "blackcliff", "Blackcliff",
      "Black sea-cliffs on the Marches' eastern shore. The road rings a deep cove where the gryphons nest — inside the ring there's only a ledge to build on, but a boat in the cove reaches every side.",
      20261024,
      [[0.9, 1.0], [2.4, 1.0], [2.4, 3.6], [5.9, 3.6], [5.9, 7.0], [8.5, 7.0], [8.5, 3.6], [11.6, 3.6], [11.6, 1.3], [13.7, 1.3]],
      {
        coast: BLACKCLIFF_COAST,
        light: { tint: "204,214,232", amount: 0.15, vignette: 0.38 },
        decorRecipe: { count: 27, types: ["ircrag", "irheather", "irspruce", "ircrag", "irpine"] },
      },
    ), [
      // the cliff-top round the cove: black stacks whitened by the gulls, and
      // on the one mid-way along the cove's head, the gryphons' eyrie
      ...swapNearest(rimLine(20261024, BLACKCLIFF_COAST, 196, 618, { step: 40, back: 14, types: ["irstack", "irstack", "irheather"] }), [
        [372, 90, { t: "ireyrie", s: 1.2, v: 0 }],
        [504, 42, { t: "ireyrie", s: 0.9, v: 3 }],   // a second nest, its gryphon away: eggs
      ]),
      // the bones of a ship on the cove's sand
      { x: 426, y: 100, t: "irwreck", s: 1 },
      // a beacon on the eastern headland, watching the cove
      { x: 632, y: 34, t: "irbeacon", s: 0.95 },
    ]),
  };
}
