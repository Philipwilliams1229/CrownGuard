// The Rime Clans' beasts (rigs-rimebeasts.js) that carry jointed limbs: the
// wolf rider's axe arm, the frost giant's arms and legs, and the Jarl on his
// war-mammoth (his arms are rigs-rime.js's rimeJarlRider). Walk 0-3, then the
// four-frame fight, drawn straight through their painters so the joints log.
//   /joint-lab.html?set=rmb&scale=3&tag=rmb_x
import { RIGS } from "/src/render/rigs.js";
import { RIMEBEAST_PAINTERS } from "/src/render/rigs-rimebeasts.js";
export const CW = 96, CH = 92;
const cell = (type, pose, frame) => ({
  note: `${pose} ${frame}`,
  draw: (c) => {
    const def = RIGS[type];
    const s = Math.min(1, (CH - 6) / (def.box.up + def.box.down));
    c.translate(CW / 2, CH - 4 - def.box.down * s); c.scale(s, s);
    RIMEBEAST_PAINTERS[def.kind](c, { ...def.p, pose, frame });
  },
});
const row = (t, pose, n) => [`${t}\n${pose}`, Array.from({ length: n }, (_, f) => cell(t, pose, f))];
export const rows = ["rimerider", "frostgiant", "rimejarl"].flatMap((t) => [row(t, "walk", 4), row(t, "fight", 4)]);
