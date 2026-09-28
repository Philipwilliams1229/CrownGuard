// The gunners' crews in every frame the halls show, in play order — the
// joint lab's "gunners" set: the bombardier's throw (and the alchemist's),
// the musketeer's shot and reload with each gun, the falcon-mistress's
// cast, the hooded blade's watch and vanish.
import * as F from "/src/render/folk.js";
const C = F.CREW_FOLK;
const ALCH = { skin: "#e8b990", hood: "#2e4a3a", coat: "#3a6a4e", boots: "#2a2a30", trim: "#d8b34a" };
const X = 18, Y = 42;
const cell = (note, draw) => ({ note, draw });
const THROW = ["hold", "breath", "back", "cock", "whip", "release", "follow", "recover"];
const SHOT = ["aim", "kick", "recoil", "port", "ramA", "ramB", "raise"];
const CAST = ["carry", "glance", "present", "draw", "cast", "follow"];
const WATCH = ["fold", "foldB", "reach", "hilt", "crouch"];
// the branch fittings, as the powder works paints them (halls/gunpowder.js)
const LONG = { len: 13.5 }, GRAPE = { len: 8 };
export const CW = 40;
export const rows = [
  ["bomber\n(throw)", THROW.map((k) => cell(k, (c) => F.drawBomber(c, X, Y, 1, C.bomber, k)))],
  ["alchemist\n(throw)", THROW.map((k) => cell(k, (c) => F.drawBomber(c, X, Y, 1, ALCH, k, { vial: true })))],
  ["musketeer\n(shot)", SHOT.map((k) => cell(k, (c) => F.drawMusketeer(c, X - 4, Y, 1, C.musketeer, k)))],
  ["musketeer\nlong gun", SHOT.map((k) => cell(k, (c) => F.drawMusketeer(c, X - 6, Y, 1, C.musketeer, k, LONG)))],
  ["musketeer\ngrapeshot", SHOT.map((k) => cell(k, (c) => F.drawMusketeer(c, X - 4, Y, 1, C.musketeer, k, GRAPE)))],
  ["mistress\n(cast)", CAST.map((k) => cell(k, (c) => F.drawMistress(c, X, Y, 1, C.mistress, k)))],
  ["mistress\ncourt", CAST.map((k) => cell(k, (c) => F.drawMistress(c, X, Y, 1, C.mistressCourt, k)))],
  ["hooded\n(watch)", WATCH.map((k) => cell(k, (c) => F.drawHooded(c, X, Y, 1, C.blade, k)))],
];
