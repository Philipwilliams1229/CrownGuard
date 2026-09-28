// The foes' rigs (and the Covert's blades), walk 0-3 then fight 0-1, drawn
// straight through their painters so their joints log. ?only=<type> picks.
import { RIGS } from "/src/render/rigs.js";
import { HORDE_RIGS, HORDE_PAINTERS } from "/src/render/rigs-horde.js";
import { IRON_RIGS, IRON_PAINTERS } from "/src/render/rigs-iron.js";
import { HOLLOW_RIGS, HOLLOW_PAINTERS } from "/src/render/rigs-hollow.js";
import { COVERT_PAINTERS } from "/src/render/rigs-covert.js";
const PAINT = { ...HORDE_PAINTERS, ...IRON_PAINTERS, ...HOLLOW_PAINTERS, ...COVERT_PAINTERS };
export const CW = 56, CH = 60;
const FX = 28, FY = 52;
const types = Object.keys(RIGS).filter((k) => PAINT[RIGS[k].kind] && (k in HORDE_RIGS || k in IRON_RIGS || k in HOLLOW_RIGS || k.startsWith("assassinUnit")));
const cell = (type, pose, frame) => ({
  note: `${pose} ${frame}`,
  draw: (c) => {
    const def = RIGS[type];
    const s = Math.min(1, 44 / (def.box.up + def.box.down));
    c.translate(FX, FY); c.scale(s, s);
    PAINT[def.kind](c, { ...def.p, pose, frame });
  },
});
export const rows = types.map((t) => [t, [0, 1, 2, 3].map((f) => cell(t, "walk", f)).concat([0, 1].map((f) => cell(t, "fight", f)))]);
