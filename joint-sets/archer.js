// The archer halls' bowmen and the castle's wall bowmen, every frame they
// can show, in play order — the joint lab's "archer" set.
//   /joint-lab.html?set=archer&tag=x
import * as F from "/src/render/folk.js";
import { bakeSprite } from "/src/render/paint.js";
const A = F.ARCHER_FOLK, W = F.WALL_FOLK;
const X = 16, Y = 42;
const cell = (note, draw) => ({ note, draw });
const frames = (pal, o = {}, names) => names.map((n) => cell(n, (c) => F.drawArcherFrame(c, X, Y, 1, pal, n, o)));
const SHOT = ["loose", "follow", "reach", "bring", "set", "d1", "d2", "anchor"];
const IDLE = ["rest", "rest1", "lift", "test0", "test1"];
export const CW = 40;
export const rows = [
  ["archer\nthe shot", frames(A.base, {}, SHOT)],
  ["archer\nat ease", frames(A.base, {}, IDLE)],
  ["longbowman\nthe shot (big)", frames(A.b, { big: true, bowCol: "#3a2a1e" }, SHOT)],
  ["dragonslayer\n(big, red bow)", frames(A.bb, { big: true, bowCol: "#8a2f24", fletch: "#d8b34a" }, ["loose", "reach", "bring", "anchor", "rest", "test1"])],
  // the castle wall: pose + draw as castle.js asks for them, facing the road,
  // clipped to the wall's own sprite box (workFrame 30 x 36, anchor 17, 33)
  ["wall bowman (castle.js\nbox; bones drawn offset)", [
    ["loose", 0, { pose: "loose" }], ["draw 0", 0], ["draw 1/3", 1 / 3], ["draw 2/3", 2 / 3], ["draw 1", 1],
    ["rest", 0, { pose: "rest" }], ["reach", 0, { pose: "reach" }], ["big draw 0", 0, { big: true, bowCol: "#3a3a44" }], ["big draw 1/3", 1 / 3, { big: true, bowCol: "#3a3a44" }], ["big draw 1", 1, { big: true, bowCol: "#3a3a44" }],
  ].map(([note, d, o]) => cell(note, (c) => c.drawImage(bakeSprite(30, 36, (cc) => F.drawArcher(cc, 17, 33, -1, W.bowman, d, o || {})), 22 - 17, Y - 33, 30, 36)))],
];
