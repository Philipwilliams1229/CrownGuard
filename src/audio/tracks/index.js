// Every track in the game, by id. Each area's file default-exports an ARRAY
// of tracks (see ../notation.js for the shape); this file only gathers them.
// Ids are "<area>-build", "<area>-fight", "<area>-boss" (area: greenwood,
// iron, hollow, rime), plus the extras: "title", "map", "victory", "defeat".
import greenwood from "./greenwood.js";
import iron from "./iron.js";
import hollow from "./hollow.js";
import rime from "./rime.js";
import extras from "./extras.js";

export const TRACKS = {};
for (const t of [...greenwood, ...iron, ...hollow, ...rime, ...extras]) TRACKS[t.id] = t;
