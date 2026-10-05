// The Knights Errant's mounted knight (src/render/rigs-ironmounts.js errantRider,
// beside the Iron cavalier it shares a painter with): the rider's arms measured
// frame by frame. The horse's legs are not logged.
//   /joint-lab.html?set=errant&tag=errant_x&scale=3
import { rigDef } from "/src/render/rigs.js";
import { IRONMOUNT_PAINTERS } from "/src/render/rigs-ironmounts.js";
import { bakeSprite } from "/src/render/paint.js";

export const CW = 80, CH = 64;
const X = 34, Y = 56;
const WALK = ["gallop 0", "gallop 1", "gallop 2", "gallop 3"];
const cell = (type, pose, frame, note) => ({
  note,
  draw: (c) => {
    const { kind, p } = rigDef(type);
    c.save(); c.translate(X, Y);
    IRONMOUNT_PAINTERS[kind](c, { ...p, pose, frame, log: true });
    c.restore();
  },
});
export const rows = [
  ["errantRider\nwalk 0-3 | fight 0-3", [
    ...WALK.map((w, f) => cell("errantRider", "walk", f, w)),
    ...["guard", "wind-up (rear)", "strike", "follow"].map((w, f) => cell("errantRider", "fight", f, `fight ${f} ${w}`)),
  ]],
  ["cavalier\nwalk 0-3 | fight 0-1", [
    ...WALK.map((w, f) => cell("cavalier", "walk", f, w)),
    ...["rear", "strike"].map((w, f) => cell("cavalier", "fight", f, `fight ${f} ${w}`)),
  ]],
];
