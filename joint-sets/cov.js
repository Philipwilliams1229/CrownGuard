// The Covert's blades (src/render/rigs-covert.js) — every walk frame and every
// fight frame of each form, in play order: the joint lab's "cov" set.
//   /joint-lab.html?set=cov&tag=cov_x&scale=4          (&only=assassinUnitAA)
// The fight plays guard → wind-up → strike → follow-through off the blade's
// attack clock (enemies.js fightFrame4) once its rig lists fightN: 4.
import { rigDef } from "/src/render/rigs.js";
import { COVERT_PAINTERS } from "/src/render/rigs-covert.js";

export const CW = 46, CH = 40;
const X = 15, Y = 35;
const TYPES = ["assassinUnit", "assassinUnitA", "assassinUnitB", "assassinUnitAA", "assassinUnitAB", "assassinUnitBA", "assassinUnitBB"];
const NAMES = { assassinUnit: "base", assassinUnitA: "Silent Court", assassinUnitB: "Nightshade", assassinUnitAA: "Kingslayer", assassinUnitAB: "Open Contract", assassinUnitBA: "Widow's Kiss", assassinUnitBB: "Plague Bearer" };
const WALK = ["contact", "passing", "contact", "passing"];
const FIGHT = ["guard", "wind-up", "strike", "follow"];
const q = new URLSearchParams(location.search);
const N = Number(q.get("fights")) || 4;

const cell = (type, pose, frame, note) => ({
  note,
  draw: (c) => {
    const { kind, p } = rigDef(type);
    c.save(); c.translate(X, Y);
    COVERT_PAINTERS[kind](c, { ...p, pose, frame });
    c.restore();
  },
});

export const rows = TYPES.map((t) => [`${t}\n${NAMES[t]}`, [
  ...WALK.map((w, f) => cell(t, "walk", f, `walk ${f} ${w}`)),
  ...Array.from({ length: N }, (_, f) => cell(t, "fight", f, `fight ${f} ${N === 4 ? FIGHT[f] : ["wind-up", "strike"][f]}`)),
]]);
