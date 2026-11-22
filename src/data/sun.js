// ============ THE TIME OF DAY (2026-11-22, owner request) ============
// A level is fought under ONE fixed sun (the Hollowfen keeps its moving sunset into the blood moon,
// render/sunset.js + bloodmoon.js). Seven positions across the sky, from sunrise low in the EAST (the
// right of the screen, over the castle) to golden hour low in the WEST (the left, over the wood).
// The lower the sun: longer cast shadows, warmer light, a hotter edge on everything facing it.
// LOOK ONLY: nothing in the engine reads this. A leaf module (no imports).
//
// "noon" is the game as it always was (the sun high in the upper left): every painter must leave
// its pictures pixel-identical at noon, so the Hollowfen, Free Play's default and old labs don't move.
//
// What each field is for (all in SCREEN space: x right, y down):
//   side    +1 the sun stands in the east (right), -1 in the west (left)
//   elev    1 high .. 0 on the horizon
//   L       where the light stands for the sculptor ([x, y, z], z toward the eye): pix.js resolve
//   fall    unit vector: the way a cast shadow runs along the ground
//   len     shadow length, x the caster's height (0 at noon: only the small baked ground shadows)
//   col     the light's colour (the edge light on figures, halls, stone)
//   warm    0 plain daylight .. 1 the full sunrise / golden-hour treatment
//   rim     strength of the edge light on the sunward side (0 none)
//   shade   [r, g, b, a] the cast shadows' colour and strength
//   tone    "rose" (sunrise: pink-gold light, blue-violet shadows) | "amber" (golden hour) | null
export const SUN_POS = {
  sunrise:   { name: "Sunrise",        side: 1,  elev: 0.12, L: [0.92, -0.26, 0.3],  fall: [-0.97, 0.24], len: 2.3, col: "#ffa868", warm: 1,    rim: 1,    shade: [44, 30, 84, 0.42], tone: "rose" },
  early:     { name: "Early morning",  side: 1,  elev: 0.35, L: [0.8, -0.45, 0.4],   fall: [-0.95, 0.31], len: 1.5, col: "#ffd49a", warm: 0.5,  rim: 0.55, shade: [42, 32, 76, 0.38], tone: "rose" },
  morning:   { name: "Morning",        side: 1,  elev: 0.6,  L: [0.6, -0.62, 0.5],   fall: [-0.93, 0.37], len: 0.9, col: "#fff0cc", warm: 0.15, rim: 0.2,  shade: [40, 34, 66, 0.34], tone: null },
  noon:      { name: "Midday",         side: -1, elev: 1,    L: [-0.6, -0.62, 0.5],  fall: [0.93, 0.37],  len: 0,   col: "#ffffff", warm: 0,    rim: 0,    shade: [42, 28, 44, 0.3],  tone: null },
  afternoon: { name: "Afternoon",      side: -1, elev: 0.6,  L: [-0.6, -0.62, 0.5],  fall: [0.93, 0.37],  len: 0.9, col: "#fff0cc", warm: 0.15, rim: 0.2,  shade: [40, 34, 66, 0.34], tone: null },
  late:      { name: "Late afternoon", side: -1, elev: 0.35, L: [-0.8, -0.45, 0.4],  fall: [0.95, 0.31],  len: 1.5, col: "#ffc880", warm: 0.5,  rim: 0.55, shade: [40, 28, 72, 0.38], tone: "amber" },
  golden:    { name: "Golden hour",    side: -1, elev: 0.12, L: [-0.92, -0.26, 0.3], fall: [0.97, 0.24],  len: 2.3, col: "#ff9a2e", warm: 1,    rim: 1,    shade: [36, 24, 70, 0.42], tone: "amber" },
};
export const SUN_ORDER = ["sunrise", "early", "morning", "noon", "afternoon", "late", "golden"];

// ---- the sun now ----
// DAY is the live sun: read its fields where you paint. DAY.v goes up at every change, so a cache may
// key on it; or register a clearer with onDay (called AFTER the fields change). DAY.on is false at noon.
export const DAY = { id: "noon", v: 0, on: false, ...SUN_POS.noon };
const LISTEN = [];
export const onDay = (fn) => { LISTEN.push(fn); };
export const setDay = (id) => {
  const p = SUN_POS[id] ? id : "noon";
  if (p === DAY.id) return;
  Object.assign(DAY, SUN_POS[p], { id: p, on: p !== "noon" });
  DAY.v++;
  for (const fn of LISTEN) { try { fn(DAY); } catch (e) { console.error("onDay", e); } }
};
// the sun in a SPRITE's own space, for the sculptor: null at noon (the sculptor's own default).
// mirrored: the sprite will be drawn mirrored on the board (bake it with the light on the other side)
export const spriteSun = (mirrored) => (DAY.on ? [mirrored ? -DAY.L[0] : DAY.L[0], DAY.L[1], DAY.L[2]] : null);
// is the light on the sprite's own RIGHT? (what a figure's draw reads as `flip`: hand-set face tones)
export const lightRight = (mirrored) => (DAY.on ? (DAY.side > 0) !== !!mirrored : !!mirrored);

// ---- which level gets which sun ----
// By a level's place in its chapter (LEVELS entry: { chapter: { id, levels }, index }). A level may
// set its own: `sun: "golden"` in its campaign entry. The Hollowfen has none (its own sunset and moon),
// and any level whose weather is the blood moon stays at noon.
// The lead's first plan (owner: "fixed per level, I propose"), 15 levels a chapter:
//   Greenwood: a day's march, dawn to dusk, the Goblin Warrens at golden hour.
//   Iron Marches: starts in the afternoon, a second day; the Citadel Gate at sunrise (the sun behind the castle).
//   Rimewater: the low northern sun: mostly sunrise / golden, never high for long.
export const SUN_PLAN = {
  greenwood: ["morning", "sunrise", "early", "morning", "noon", "noon", "afternoon", "afternoon", "late", "morning", "early", "noon", "afternoon", "late", "golden"],
  iron:      ["afternoon", "late", "golden", "sunrise", "early", "morning", "noon", "afternoon", "late", "golden", "early", "morning", "afternoon", "late", "sunrise"],
  rime:      ["early", "sunrise", "morning", "late", "golden", "early", "afternoon", "sunrise", "late", "morning", "golden", "early", "late", "sunrise", "golden"],
};
export const sunFor = (lv) => {
  if (!lv) return "noon";
  if (lv.sun && SUN_POS[lv.sun]) return lv.sun;
  const ch = lv.chapter || {}, plan = SUN_PLAN[ch.id];
  if (!plan) return "noon";
  return plan[Math.min(plan.length - 1, lv.index ?? 0)] || "noon";
};
