// ============ SKILL TREES ============
// Permanent, account-wide upgrades bought with the stars you earn clearing
// campaign levels. These are NOT the in-battle upgrades in towers.js — those
// are bought with gold and die with the level. These persist forever and
// apply to every tower of that kind, in every battle, from the moment it is
// placed.
//
// Every node is worth +5% per rank and holds THREE ranks, each dearer than
// the last, and deeper tiers cost more than shallow ones. The first rank of
// an opener is a single star; the last rank of a capstone is eight. A node
// has to be taken to rank 3 before the node below it opens.
//
// That prices a whole tower at 50 stars against a campaign that yields 30 —
// deliberately. Early ranks come fast, the tail is a grind, and finishing a
// tree is a goal that outlives the current two chapters.
//
// Each tower's tree:
//   tier 1  two openers, no prerequisites
//   tier 2  two nodes, each needing its opener at rank 3
//   tier 3  one capstone lifting two stats at once, needing both tier-2 nodes
//
// `per` is the gain per rank, applied in engine/towers.js getStats():
//   dmg/range/hp/splash/slow/heal   +5% a rank
//   rate                            reload time, so it goes DOWN 5% a rank
// A stat the tower doesn't have is skipped, so a shared node like "+5% range"
// is safe to hand to any tower.

export const RANKS = 3;
// what each rank costs, by the node's tier: [rank1, rank2, rank3]
export const RANK_COSTS_BY_TIER = {
  1: [1, 2, 3],   //  6 a node
  2: [2, 3, 5],   // 10 a node
  3: [4, 6, 8],   // 18 for the capstone
};
export const rankCosts = (node) => RANK_COSTS_BY_TIER[node.tier] || RANK_COSTS_BY_TIER[1];

// Stats where a smaller number is the better number.
const LOWER_IS_BETTER = new Set(["rate"]);

const P = 0.05; // one rank, everywhere

export const SKILLS = {
  archer: {
    name: "Archer Tower",
    blurb: "Volume of fire. Every rank here is more arrows in the air.",
    nodes: [
      { id: "a1", tier: 1, name: "Seasoned Fletchers", per: { dmg: P }, desc: "+5% arrow damage a rank." },
      { id: "a2", tier: 1, name: "Tall Platforms", per: { range: P }, desc: "+5% range a rank." },
      { id: "a3", tier: 2, name: "Quick Nock", needs: ["a1"], per: { rate: P }, desc: "Loose 5% faster a rank." },
      { id: "a4", tier: 2, name: "Bodkin Points", needs: ["a2"], per: { dmg: P }, desc: "A further +5% damage a rank." },
      { id: "a5", tier: 3, name: "Master of the Butts", needs: ["a3", "a4"], per: { dmg: P, rate: P }, desc: "+5% damage AND 5% faster a rank — the finest archers in the realm." },
    ],
  },
  knight: {
    name: "Knight Garrison",
    blurb: "The line that holds. Tougher knights buy every other tower time.",
    nodes: [
      { id: "k1", tier: 1, name: "Boiled Leather", per: { hp: P }, desc: "+5% knight health a rank." },
      { id: "k2", tier: 1, name: "Drill Yard", per: { dmg: P }, desc: "+5% knight damage a rank." },
      { id: "k3", tier: 2, name: "Plate & Mail", needs: ["k1"], per: { hp: P }, desc: "A further +5% health a rank." },
      { id: "k4", tier: 2, name: "Longer Leash", needs: ["k2"], per: { range: P }, desc: "+5% reach a rank — they hold a wider stretch of road." },
      { id: "k5", tier: 3, name: "Oathsworn", needs: ["k3", "k4"], per: { hp: P, dmg: P }, desc: "+5% health AND +5% damage a rank. They do not break." },
    ],
  },
  wizard: {
    name: "Wizard Spire",
    blurb: "Magic ignores armour. Sharpen it and nothing stays armoured.",
    nodes: [
      { id: "w1", tier: 1, name: "Deeper Study", per: { dmg: P }, desc: "+5% spell damage a rank." },
      { id: "w2", tier: 1, name: "Wider Focus", per: { splash: P }, desc: "+5% blast radius a rank." },
      { id: "w3", tier: 2, name: "Ley Tap", needs: ["w1"], per: { rate: P }, desc: "Cast 5% faster a rank." },
      { id: "w4", tier: 2, name: "Far Sight", needs: ["w2"], per: { range: P }, desc: "+5% range a rank." },
      { id: "w5", tier: 3, name: "Archmage", needs: ["w3", "w4"], per: { dmg: P, splash: P }, desc: "+5% damage AND +5% blast a rank." },
    ],
  },
  catapult: {
    name: "Catapult",
    blurb: "Siege answers siege. Heavier stones, thrown further.",
    nodes: [
      { id: "c1", tier: 1, name: "Heavier Stones", per: { dmg: P }, desc: "+5% impact damage a rank." },
      { id: "c2", tier: 1, name: "Truer Ranging", per: { range: P }, desc: "+5% range a rank." },
      { id: "c3", tier: 2, name: "Greased Winch", needs: ["c1"], per: { rate: P }, desc: "Reload 5% faster a rank." },
      { id: "c4", tier: 2, name: "Shattering Shot", needs: ["c2"], per: { splash: P }, desc: "+5% blast radius a rank." },
      { id: "c5", tier: 3, name: "Master Engineer", needs: ["c3", "c4"], per: { dmg: P, range: P }, desc: "+5% damage AND +5% range a rank." },
    ],
  },
  spiker: {
    name: "Bladewheel",
    blurb: "It never aims and never misses. Just make it hurt more.",
    nodes: [
      { id: "s1", tier: 1, name: "Honed Edges", per: { dmg: P }, desc: "+5% spike damage a rank." },
      { id: "s2", tier: 1, name: "Long Arms", per: { range: P }, desc: "+5% reach a rank." },
      { id: "s3", tier: 2, name: "Oiled Bearings", needs: ["s1"], per: { rate: P }, desc: "Spins 5% faster a rank." },
      { id: "s4", tier: 2, name: "Weighted Blades", needs: ["s2"], per: { dmg: P }, desc: "A further +5% damage a rank." },
      { id: "s5", tier: 3, name: "Whirling Death", needs: ["s3", "s4"], per: { dmg: P, rate: P }, desc: "+5% damage AND 5% faster a rank. Stand clear." },
    ],
  },
  support: {
    name: "Warden Mage",
    blurb: "Slows, chills and mending. Force multipliers for the whole line.",
    nodes: [
      { id: "u1", tier: 1, name: "Biting Cold", per: { slow: P }, desc: "+5% slowing power a rank." },
      { id: "u2", tier: 1, name: "Broad Ward", per: { range: P }, desc: "+5% aura radius a rank." },
      { id: "u3", tier: 2, name: "Deep Frost", needs: ["u1"], per: { slow: P, dmg: P }, desc: "A further +5% slow a rank, and +5% damage where it deals any." },
      { id: "u4", tier: 2, name: "Kind Hands", needs: ["u2"], per: { heal: P }, desc: "+5% mending on your knights a rank." },
      { id: "u5", tier: 3, name: "Winter's Warden", needs: ["u3", "u4"], per: { slow: P, heal: P }, desc: "+5% slow AND +5% mending a rank." },
    ],
  },
};

export const skillNode = (kind, id) => SKILLS[kind]?.nodes.find((n) => n.id === id) || null;

// `owned` is { nodeId: rank } — 0 or missing means untouched.
export const rankOf = (owned, id) => owned?.[id] || 0;
export const isMaxed = (owned, id) => rankOf(owned, id) >= RANKS;

// What the NEXT rank of a node costs, or null if it's already at rank 3.
export const nextCost = (owned, node) => {
  const r = rankOf(owned, node.id);
  return r >= RANKS ? null : rankCosts(node)[r];
};

// A node opens once every node it needs is at FULL rank.
export const nodeUnlocked = (node, owned) => (node.needs || []).every((r) => isMaxed(owned, r));

// Stars sunk into one tower — shown on its tab, and refunded in full.
export const spentOn = (kind, owned) =>
  (SKILLS[kind]?.nodes || []).reduce((sum, n) => {
    const costs = rankCosts(n);
    let s = 0;
    for (let i = 0; i < rankOf(owned, n.id); i++) s += costs[i];
    return sum + s;
  }, 0);

// The whole tree's price, for the "x / 48" on the tab.
export const treeCost = (kind) =>
  (SKILLS[kind]?.nodes || []).reduce((sum, n) => sum + rankCosts(n).reduce((a, b) => a + b, 0), 0);

// Fold a tower's ranks into one set of multipliers. Ranks add rather than
// compound, so rank 3 of a +5% node reads as exactly +15%.
export function foldMods(kind, owned) {
  const out = {};
  for (const n of SKILLS[kind]?.nodes || []) {
    const r = rankOf(owned, n.id);
    if (!r) continue;
    for (const [k, v] of Object.entries(n.per)) {
      const step = LOWER_IS_BETTER.has(k) ? 1 - v * r : 1 + v * r;
      out[k] = (out[k] || 1) * step;
    }
  }
  return out;
}

// "+15% damage · 15% faster" — what a node is actually giving right now.
export function modSummary(node, rank) {
  if (!rank) return "";
  const label = { dmg: "damage", range: "range", hp: "health", splash: "blast", slow: "slow", heal: "mending", rate: "faster" };
  return Object.entries(node.per)
    .map(([k, v]) => `${k === "rate" ? "" : "+"}${Math.round(v * rank * 100)}% ${label[k] || k}`)
    .join(" · ");
}
