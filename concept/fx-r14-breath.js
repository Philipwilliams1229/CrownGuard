// Effects concepts, Round 14: Dragonbreath's flame after the owner's reference picture (art/briefs/ref/dragonbreath-ref.jpg).
// A and B: Opus artists; C: Fable. Each option lives in its own file. See art/briefs/fx-round14.md.
import { NW, today } from "./fx-r14-kit.js";
import * as A from "./fx-r14-a.js";
import * as B from "./fx-r14-b.js";
import * as C from "./fx-r14-c.js";
export const ROWS = [{
  id: "breath14", label: "Dragonbreath's flame (round 14)", group: "Round 14", threeABC: true, ...NW, today,
  get note() { return "Every cell is the real Dragonbreath spire (staff levelled, breath held, the aim sweeping across the road and back, a 16-frame loop) with five goblins on the road. TODAY: the game's own drawBreath. A (Opus): " + A.note + " B (Opus): " + B.note + " C (Fable): " + C.note; },
  A: (c, e, d) => A.paint(c, e, d), B: (c, e, d) => B.paint(c, e, d), C: (c, e, d) => C.paint(c, e, d),
}];
