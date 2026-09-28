// The crown's ground troops (src/render/rigs-crown.js) — every walk frame and
// every fight frame of each soldier, in play order: the joint lab's "crown" set.
//   /joint-lab.html?set=crown&tag=crn_x&scale=3        (&only=knight,champion)
import { rigDef } from "/src/render/rigs.js";
import * as CR from "/src/render/rigs-crown.js";

// the rigs are bigger than a crew (the champion's maul goes up past 45 units)
export const CW = 56, CH = 64;
const X = 22, Y = 58;
const TYPES = ["knight", "squire", "paladin", "berserk", "champion", "halberdier", "farmer", "heroKnight", "heroHunter", "bowman"];
const FIGHT = CR.CROWN_FIGHT_FRAMES || {};
const WALK = ["contact", "passing", "contact", "passing"];
const FIGHT4 = CR.CROWN_FIGHT_NAMES || {};

const cell = (type, pose, frame, note) => ({
  note,
  draw: (c) => {
    const { kind, p } = rigDef(type);
    c.save(); c.translate(X, Y);
    CR.CROWN_PAINTERS[kind](c, { ...p, pose, frame });
    c.restore();
  },
});

export const rows = TYPES.map((t) => {
  const n = FIGHT[t] || 2;
  const names = FIGHT4[t] || (n === 4 ? ["guard", "wind-up", "strike", "follow"] : ["wind-up", "strike"]);
  return [`${t}\nwalk 0-3 | fight 0-${n - 1}`, [
    ...WALK.map((w, f) => cell(t, "walk", f, `walk ${f} ${w}`)),
    ...Array.from({ length: n }, (_, f) => cell(t, "fight", f, `fight ${f} ${names[f] || ""}`)),
  ]];
});
