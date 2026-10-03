// ============ THE WEATHER PLAN ============
// One signature weather per zone, MORE PREVALENT THE FURTHER INTO AN AREA
// YOU TRAVEL (owner, 2026-10-03; art/ZONES-4-5.md). The kinds themselves are
// in engine/weather.js; this file only says which chapter gets which, and how
// strong it is at each level.
//
// By a level's place in its chapter (index 0 .. n-1):
//   the first third            none
//   the middle third           rare and mild   strength 0.35 -> 0.55
//   the last third             often, strong   strength 0.70 -> 0.90
//   the chapter's boss level   the most        strength 1
// A kind turns strength into its rhythm and bite (`grade` in weather.js):
// longer calms and softer effects when mild, frequent and hard when strong.
//
// A level entry in campaign.js may override: `weather: false` (clear skies),
// or its own spec, e.g. `weather: { kind: "storm", strength: 0.6 }` (any
// field of the kind may be given too).

export const CHAPTER_WEATHER = {
  greenwood: "fog",          // the Greenwood's morning fog
  iron: "storm",             // the Iron Marches' thunderstorms
  hollow: "gravemist",       // the Hollowfen's grave mist
  rime: "blizzard",          // zone IV, the Rimewater
  ash: "eruption",           // zone V, the Ashen Reach
};

export const weatherStrength = (index, count, boss) => {
  if (boss) return 1;
  const p = count > 1 ? index / (count - 1) : 1;
  if (p < 1 / 3) return 0;
  if (p < 2 / 3) return 0.35 + 0.2 * ((p - 1 / 3) * 3);
  return 0.7 + 0.2 * Math.min(1, (p - 2 / 3) * 3);
};

// The weather spec for a campaign level (LEVELS entry: { chapter, index,
// window, weather? }): null for clear skies, undefined to let the realm
// decide (a chapter the plan doesn't name).
export const weatherFor = (lv) => {
  if (!lv) return undefined;
  if (lv.weather === false) return null;
  if (lv.weather && typeof lv.weather === "object") return lv.weather;
  const ch = lv.chapter || {};
  const kind = CHAPTER_WEATHER[ch.id] || CHAPTER_WEATHER[ch.faction];
  if (!kind) return undefined;
  const s = weatherStrength(lv.index ?? 0, ch.levels ? ch.levels.length : 1, !!lv.window?.boss);
  return s > 0 ? { kind, strength: +s.toFixed(3) } : null;
};
