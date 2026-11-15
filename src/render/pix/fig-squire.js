// ============ FIGURE: Aldric's squire (and the Levy's top-tier knight) ============
// The garrison knight's body in Aldric's red (fig-garrison.js, variant "squire"), a head
// smaller. Same clips as the knight.
import * as g from "./fig-garrison.js";
import { scaled, HUMAN } from "./rig.js";

export const BOX = { w: 80, h: 70, ox: 32, oy: 60 };
export const BONES = scaled(HUMAN, 0.95, { shN: -2.9, shF: 2.9, hipN: -1.25, hipF: 1.45, neck: 1.35 });
export const MUST = g.MUST;
export const CLIPS = g.CLIPS;
export const draw = (px, F, o = {}) => g.draw(px, F, { ...o, variant: "squire" });
export const fx = g.fx;
