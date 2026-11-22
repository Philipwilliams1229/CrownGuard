// ============ THE TIME OF DAY, on the board (2026-11-22; data/sun.js has the sun) ============
// The one seam draw.js calls. Each half lives in its own file with its own owner
// (art/briefs/time-of-day.md): dayshadows.js (cast shadows of halls, soldiers, foes),
// daygrade.js (the hour's colour on the land, the edge light on figures).
// The castle (castle.js) and the scenery read DAY themselves.
// Nothing here runs at noon (DAY.on false) or while the blood moon is up (its own sunset).
import { DAY } from "../data/sun.js";
import { drawDayShadows } from "./dayshadows.js";
import { dayGradeGround, dayGradeOver, dayKeyLights } from "./daygrade.js";

const live = (g) => DAY.on && !(g.weather && g.weather.paint === "bloodmoon");
// the ground pass: after the road, bridges, traps and remains; before anything that stands
export const dayGround = (ctx, g) => { if (!live(g)) return; dayGradeGround(ctx, g); drawDayShadows(ctx, g); };
// after everything standing (figures, halls, scenery, castle), before the ambient specks and the weather
export const dayOver = (ctx, g) => { if (live(g)) dayGradeOver(ctx, g); };
// with the frame's other lights (pixrigs addLight): the sun's edge light on every figure
export const dayLights = (g, add) => { if (live(g)) dayKeyLights(g, add); };
