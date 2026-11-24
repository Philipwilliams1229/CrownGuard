// Effects concepts, Round 16: Round 15's variation 1 (the owner's pick) with the flare's foot a tad wider where it meets the road.
// The first strip is Round 15's variation 1 as the owner saw it; then two versions.
import { NW } from "./fx-r14-kit.js";
import * as V1 from "./fx-r15-a.js";
import * as A from "./fx-r16-a.js";
import * as B from "./fx-r16-b.js";
export const ROWS = [{
  id: "breath16", label: "Dragonbreath's flame (round 16): a wider foot", group: "Round 16", twoAB: true, ...NW,
  today: (c, e) => V1.paint(c, e),
  get note() { return "First: Round 15's variation 1 as you saw it. Then two versions with the bottom of the flare a little wider where it meets the road. 1: " + A.note + " 2: " + B.note; },
  A: (c, e, d) => A.paint(c, e, d), B: (c, e, d) => B.paint(c, e, d),
}];
