// The sky set: the Skyknight's war-eagle and the Iron Kingdom's war-gryphon,
// walk (the wingbeat) 0-3, then the fight 0-3, drawn straight through their
// painters so the riders' arms log. The eagle's pass plays fight 0 (the dive)
// → 1 (the strike) → 2 (follow-through) → 3 (the climb); the gryphon's air
// attack plays 0 guard → 1 wind-up → 2 strike → 3 follow-through.
//   /joint-lab.html?set=sky&scale=4&tag=sky_x
import { RIGS } from "/src/render/rigs.js";
import { eagle } from "/src/render/rigs-eagle.js";
import { IRONMOUNT_PAINTERS } from "/src/render/rigs-ironmounts.js";
const PAINT = { eagle, ...IRONMOUNT_PAINTERS };
export const CW = 72, CH = 62;
const cell = (type, pose, frame) => ({
  note: `${pose} ${frame}`,
  draw: (c) => {
    const def = RIGS[type];
    c.translate(CW / 2, def.box.up + 3);
    PAINT[def.kind](c, { ...def.p, pose, frame });
  },
});
const row = (t, pose, n) => [`${t} ${pose}`, Array.from({ length: n }, (_, f) => cell(t, pose, f))];
export const rows = [
  row("eagle", "walk", 4), row("eagle", "fight", 4),
  row("gryphon", "walk", 4), row("gryphon", "fight", 4),
  row("gryphonMount", "fight", 4),
];
