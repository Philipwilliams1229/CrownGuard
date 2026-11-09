// What each of the Covert's standing orders hunts, for the (i) beside it in the
// Targets list (owner, 2026-11-09: "include examples of what each enemy type
// is"). The words say the class; the examples are READ from the roster through
// the same filters the blades obey (engine/towers.js PREY_FILTERS), so a foe
// that gains a heal or a banner shows up under its order with no edit here.

import { ENEMIES } from "../data/enemies.js";
import { PREY_FILTERS } from "../engine/towers.js";

const SAYS = {
  prey: "Foes who strengthen the column without healing it: ward-casters who lay blue shields, seers who freeze your halls, and banner-lords and war-chanters who harden and hasten those around them.",
  healer: "Foes who mend the column around them.",
  raiser: "Foes who bring MORE foes: raisers of the dead and those who call reinforcements.",
  ranged: "Foes who shoot your soldiers from afar: crossbowmen and archers. They stand off your knights, so the blades go to them.",
  first: "The foe nearest your castle.",
  last: "The foe furthest back down the road.",
  strong: "The foe with the most health left.",
  weak: "The foe with the least health left: finish them off.",
};

// the order the chapters come in, so the examples read as the player meets them
const ORDER = ["greenwood", "iron", "hollow", "rime"];
// a boss's name is written in capitals on its card; here it reads as a name
const nameOf = (n) => (n === n.toUpperCase() ? n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : n);

// the roster a filter catches: the blades never reach a flier, a swimmer or a
// neutral sea monster, so those are left out
export const coverExamples = (id) => {
  const f = PREY_FILTERS[id];
  if (!f) return [];
  return Object.values(ENEMIES)
    .filter((d) => !d.flying && !d.swimming && !d.neutral && f({ ...d, healAmt: d.heal || 0, trampleMax: d.trample || 0 }))
    .sort((a, b) => (ORDER.indexOf(a.faction) + 1 || 9) - (ORDER.indexOf(b.faction) + 1 || 9))
    .map((d) => nameOf(d.name));
};

export const coverSays = (id) => SAYS[id] || "";
