// Effects concepts, Round 15: three Opus variations on Round 14's B (the owner's pick). See art/briefs/fx-round15.md.
// The first strip is Round 14's B as the owner saw it (in the "today" slot); then the variations.
import { NW } from "./fx-r14-kit.js";
import * as B14 from "./fx-r14-b.js";
import * as A from "./fx-r15-a.js";
import * as B from "./fx-r15-b.js";
import * as C from "./fx-r15-c.js";
export const ROWS = [{
  id: "breath15", label: "Dragonbreath's flame (round 15): variations on B", group: "Round 15", threeABC: true, ...NW,
  today: (c, e) => B14.paint(c, e),
  get note() { return "Every cell is the real Dragonbreath spire (staff levelled, breath held, the aim sweeping across the road and back, a 16-frame loop) with five goblins on the road. First: Round 14's B as you saw it. Then three variations, each with a wider stem and no lit trail on the road. 1: " + A.note + " 2: " + B.note + " 3: " + C.note; },
  A: (c, e, d) => A.paint(c, e, d), B: (c, e, d) => B.paint(c, e, d), C: (c, e, d) => C.paint(c, e, d),
}];
