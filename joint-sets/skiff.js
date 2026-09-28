// The River Watch skiff's crew in every frame drawSkiff can show, in play
// order — the joint lab's "skiff" set: the musketeer's shot and reload (the
// Powder Works' figure, stood in the bow, in each branch's colours), the
// oarsman's stroke (catch, drive, finish, recover) and his rest.
import { skiff } from "/src/render/rigs-skiff.js";
const SHOT = ["aim", "kick", "recoil", "port", "ramA", "ramB", "raise"];
const ROW = [["catch", 0], ["drive", 1], ["finish", 2], ["recover", 3], ["rest", "rest"]];
export const CW = 44, CH = 40;
const at = (frame) => (c) => { c.translate(22, 32); skiff(c, { frame }); };
const cell = (note, draw) => ({ note, draw });
export const rows = [
  ["musketeer\n(shot, rowing)", SHOT.map((g, i) => cell(g, at(`base.${g}.${i % 4}`)))],
  ["musketeer\nfireship", SHOT.map((g, i) => cell(g, at(`b.${g}.rest`)))],
  ["oarsman\n(stroke)", ROW.map(([nm, r]) => cell(nm, at(`a.aim.${r}`)))],
];
