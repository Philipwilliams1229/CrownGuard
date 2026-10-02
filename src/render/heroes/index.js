// ============ THE NEWER HEROES' RENDER HOOKS ============
// Each hero after Sir Aldric and Wren draws its own effects from a file here,
// keyed by its HEROES key (engine side: engine/heroes/). Every hook is optional:
//
//   pose(b, u, time)  the hero's frame when an ability takes over the body:
//       { sheet, frame } (sheet "walk" | "fight" | "sky"; rigs.js), or null
//       for the ordinary choice. render/enemies.js drawBandUnit.
//   under(ctx, g)  marks on the ground, under everyone (consecrated earth,
//       a thunderhead's shadow). draw.js, with the lava pools.
//   fx(ctx, g)  over the board: bolts, rings, flashes. draw.js, after the
//       shots in flight (where Wren's volley is drawn).
//
// g.time is in seconds; the engine's clocks (tms) are g.time * 1000.
import osric from "./osric.js";
import hale from "./hale.js";
import ysolde from "./ysolde.js";

export const HERO_ART = { osric, hale, ysolde };
const ALL = Object.values(HERO_ART);
export const heroPose = (b, u, time) => HERO_ART[b.hero]?.pose?.(b, u, time) || null;
export const drawHeroUnder = (ctx, g) => { for (const h of ALL) if (h.under) h.under(ctx, g); };
export const drawHeroFx = (ctx, g) => { for (const h of ALL) if (h.fx) h.fx(ctx, g); };
