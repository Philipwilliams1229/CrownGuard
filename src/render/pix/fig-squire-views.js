// ============ CONCEPT FIGURES: Aldric's squire (and the Levy's top-tier knight) from the FRONT and BEHIND ============
// The garrison knight's views (fig-garrison-views.js `knightViews`) in the squire's red: a plain
// shield with the cream chevron, no cross on the tabard, a red plume. The squire's own bones.
import { knightViews, knightLook } from "./fig-garrison-views.js";
import { CLIPS, BONES, BOX } from "./fig-squire.js";
const set = knightViews({ NAME: "squire", BOX, BONES, walk: CLIPS.walk, W: 1, look: knightLook("squire") });
export const FRONT = set.FRONT, BACK = set.BACK;
