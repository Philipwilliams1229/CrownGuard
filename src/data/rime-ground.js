// ============ THE RIMEWATER'S GROUND ============
// The helper every Rimewater board is made with (realms-rime-a/b/c.js): the
// chapter's ground, palette, water, light and spawn on top of the Frostfang
// Pass's snow until the Rimewater's own ground and scenery are drawn
// (scenery-rime.js). maps.js builds it from REALMS.frostfang and hands it
// to the three board files, so none of them imports maps.js.
//   rimeVariant(id, name, tag, blurb, seed, path, extra)
// `extra` overrides anything (coast, rivers, ponds, landings, decor...).
// Weather comes from the chapter's plan (weather-plan.js: the blizzard, by
// the level's place in the chapter); a board need not set it.
export const makeRimeVariant = (frostfang) => (id, name, tag, blurb, seed, path, extra = {}) => ({
  ...frostfang,
  id, name, tag, blurb, seed, path,
  tagColor: "#bfe4f2",
  ambient: "snow",
  // the cold sea: black-green, white-capped
  water: { deep: "#1f3a4a", edge: "#2c5266", shine: "#9cc8dc" },
  bridge: { kind: "stone", stone: "#9aa4ac", cope: "#c4ccd2", moss: "#6c7c84", lamp: "#ffd88a" },
  decor: [],
  decorRecipe: { count: 20, types: ["snowpine", "snowpine", "icerock", "crystal", "snowpine"] },
  ponds: [],
  weather: undefined,
  ...extra,
});
