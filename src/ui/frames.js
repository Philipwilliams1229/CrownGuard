// ============ FRAMES ============
// The dressed-up look of the title screen and the campaign map: oak frames
// with a gold bead, parchment cards, wood and gold buttons. Built on the
// plain pixel-panel style in theme.js.

import { btn } from "./theme.js";

const INK = "#10131a";
export const WOOD = { face: "#6b4a2e", lt: "#8a6440", dk: "#43301e", deep: "#2e2016" };
export const PARCH = { face: "#ead9aa", lt: "#f6ead0", dk: "#c9b27a", ink: "#3b2a1c", red: "#8e3a3a" };

// a plank of oak: the everyday button on these screens
export const woodBtn = {
  ...btn, background: WOOD.face, color: "#f2e6c4", minHeight: 44,
  boxShadow: `inset -2px -2px 0 ${WOOD.dk}, inset 2px 2px 0 ${WOOD.lt}`,
};
// beaten gold: the one thing to press
export const goldBtn = {
  ...btn, background: "#b8902e", color: "#2e2016", fontWeight: "bold", minHeight: 44,
  boxShadow: "inset -3px -3px 0 #7e5f1c, inset 3px 3px 0 #ecc85c",
};
// a wood frame with a gold bead inside it, for anything framed
export const frame = {
  border: `3px solid ${INK}`,
  boxShadow: `inset 0 0 0 3px ${WOOD.face}, inset 0 0 0 5px ${WOOD.dk}, inset 0 0 0 6px #d8b34a, inset 0 0 0 8px ${INK}`,
};
