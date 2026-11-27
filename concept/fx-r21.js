// Round 21 of the effects concepts (2026-11-27): a look of its own for the PLAIN slow (traps, caltrops, Hamstringer,
// Earthshaker, Harpooners, the War Horn...), apart from the frost slow (the cold mist, kept). See art/briefs/fx-round21.md.
import { NW } from "./fx-r21-kit.js";
import * as A from "./fx-r21-a.js";
import * as B from "./fx-r21-b.js";
import * as C from "./fx-r21-c.js";
export const ROWS21 = [{
  id: "slow21", label: "The plain slow on a foe (round 21)", group: "Round 21", threeABC: true, ...NW, todayKeys: ["slowmist"],
  get note() { return "A walking goblin, slowed by a trap / caltrop / hamstring (not frost), at the middle strength. TODAY: the game's slow, the frost's cold mist, which every slow wears now and which stays for frost. A (Opus): " + A.note + " B (Opus): " + B.note + " C (Fable): " + C.note; },
  A: (c, e) => A.paint(c, e), B: (c, e) => B.paint(c, e), C: (c, e) => C.paint(c, e),
}];
