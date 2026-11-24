// Effects concepts, Round 17: Round 16's version 2 (the owner's pick) with the flare a bit more see-through.
// The first strip is Round 16's version 2 as the owner saw it; then two versions.
import { NW } from "./fx-r14-kit.js";
import * as V from "./fx-r16-b.js";
import * as A from "./fx-r17-a.js";
import * as B from "./fx-r17-b.js";
export const ROWS = [{
  id: "breath17", label: "Dragonbreath's flame (round 17): a see-through flare", group: "Round 17", twoAB: true, ...NW,
  today: (c, e) => V.paint(c, e),
  get note() { return "First: Round 16's version 2 as you saw it. Then two versions with the flare a bit see-through. 1: " + A.note + " 2: " + B.note; },
  A: (c, e, d) => A.paint(c, e, d), B: (c, e, d) => B.paint(c, e, d),
}];
