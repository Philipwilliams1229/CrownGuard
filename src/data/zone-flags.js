// ============ ZONE MECHANICS' MASTER SWITCHES ============
// Zone IV's three mechanics (landings, weather, the frost shroud) each run
// only where the data asks for them (a realm's `landings` / `weather`, a
// foe's `freezeEvery`). These switches turn a mechanic off everywhere at
// once, so the sims can measure a board with and without it
// (scripts/sim.mjs --no-landings / --no-weather / --no-freeze). The game
// never flips them.
export const MECH = { landings: true, weather: true, freeze: true };
