// ============ WEATHER ============
// A realm may have weather that comes and goes in battle (zone IV's
// blizzards first; rain, fog, gusts, ash-fall, lightning later). It is a
// small general system: a KIND is one entry in WEATHER_KINDS below — its
// rhythm, its wind-up, what it does to the fight while it bites (`fx`), and
// the painter that draws it (render/weatherfx.js) — so a new kind is a data
// entry plus a painter, never a new engine path.
//
// A realm opts in with `weather` (maps.js / realms-*.js):
//   weather: { kind: "blizzard" }                          the kind's defaults
//   weather: { kind: "blizzard", every: [70, 95], lasts: [10, 13], first: 30,
//              fx: { reach: 0.85 } }                      any field overridden
// Realms without `weather` are untouched: WX stays at its neutral values.
//
// The clock runs only in combat (squalls between waves would do nothing but
// hide the board) and is seeded from the realm's seed, never Math.random, so
// a sim is the same run with weather on or off apart from the weather itself.
//
// State on `g.weather` (draw.js / the painters read it, nothing else should):
//   { kind, phase: "calm" | "rising" | "squall" | "easing", k: 0..1 how hard
//     it is blowing now (painters scale with it), bite: true while `fx`
//     applies, clock: combat seconds, next / until: clock marks, gust: the
//     moment the wind last got up }
// The live multipliers are WX (below): the engine reads WX, never g.weather.

import { REALM } from "../data/maps.js";
import { mulberry32 } from "../data/constants.js";
import { MECH } from "../data/zone-flags.js";
import { sfx } from "../audio/sfx.js";

// Each kind:
//   every   [min, max] s of calm between spells (rolled each time)
//   lasts   [min, max] s a spell bites
//   first   s into the level's first combat before the first spell may rise
//   windup  s the weather builds (drawn, not yet biting) before it bites
//   ease    s it takes to clear after the bite ends (drawn only)
//   fx      what it does while it bites — every key optional, neutral = 1/false:
//     reach        x every tower's reach (range, mRange, auraRange; engine/towers.js getStats)
//     shotSpeed    x the speed of every arrow, bolt, stone, shard in flight (update.js)
//     foeSpeed     x every foe's pace on the road (mud, deep snow)
//     flierSpeed   x a flier's pace on top of foeSpeed (headwinds)
//     fliersLow    fliers come down low (drawn lower; see groundHitsLow)
//     groundHitsLow  while fliers are low, ground-only halls may shoot them too
//     sight        (reserved for fog) foes beyond this many px of a hall are hidden to it
//   paint   which painter draws it (render/weatherfx.js PAINTERS)
//   sound   the sfx played as it rises (audio/sfx.js)
export const WEATHER_KINDS = {
  blizzard: {
    name: "Blizzard",
    every: [60, 90], lasts: [12, 15], first: 25, windup: 4, ease: 2.5,
    fx: { reach: 0.8, shotSpeed: 0.85, flierSpeed: 0.85, fliersLow: true, groundHitsLow: false },
    paint: "blizzard",
    sound: "gust",
  },
  // Later kinds are entries like these (not built yet):
  // rain:   { every: [50, 80], lasts: [15, 20], fx: { foeSpeed: 0.85, shotSpeed: 0.95 }, paint: "rain" }
  // fog:    { every: [70, 100], lasts: [14, 18], fx: { sight: 90 }, paint: "fog" }
  // gale:   { every: [40, 60], lasts: [6, 9], fx: { flierSpeed: 1.3, shotSpeed: 0.8 }, paint: "gale" }
  // ash:    { every: [60, 90], lasts: [12, 15], fx: { reach: 0.85 }, paint: "ash" }
  // A kind that strikes things (lightning on the road) would add an `onTick(g, w, sdt, tms)`
  // hook here, called while it bites; tickWeather calls it if present.
};

const NEUTRAL = { reach: 1, shotSpeed: 1, foeSpeed: 1, flierSpeed: 1, fliersLow: false, groundHitsLow: false, sight: 0 };
// The live multipliers. Reset every frame by tickWeather, so a new level
// (or a realm with no weather) always starts neutral.
export const WX = { ...NEUTRAL };

// The realm's weather, merged over its kind's defaults (null: none).
export const weatherDef = () => {
  const w = REALM && REALM.weather;
  if (!w || !MECH.weather) return null;
  const kind = WEATHER_KINDS[w.kind];
  if (!kind) return null;
  return { ...kind, ...w, fx: { ...kind.fx, ...(w.fx || {}) } };
};

const roll = (w, [a, b]) => a + (b - a) * w.rng();

// Advance the weather one frame (update.js calls it every frame, any phase).
export const tickWeather = (g, sdt, tms) => {
  Object.assign(WX, NEUTRAL);
  const def = weatherDef();
  if (!def) { g.weather = null; return; }
  let w = g.weather;
  if (!w || w.kind !== def.kind) {
    w = g.weather = { kind: def.kind, paint: def.paint, phase: "calm", k: 0, bite: false, clock: 0, next: 0, until: 0, gust: -1e9, rng: mulberry32((REALM.seed || 1) * 31 + 7) };
    w.next = def.first + roll(w, [0, 10]);
  }
  // between waves the weather clears and the clock waits
  if (g.phase !== "combat") {
    if (w.phase !== "calm") { w.phase = "easing"; w.bite = false; }
    w.k = Math.max(0, w.k - sdt / def.ease);
    if (w.k <= 0) w.phase = "calm";
    return;
  }
  w.clock += sdt;
  const t = w.clock;
  if (w.phase === "calm" || w.phase === "easing") {
    if (w.phase === "easing") { w.k = Math.max(0, w.k - sdt / def.ease); if (w.k <= 0) w.phase = "calm"; }
    if (t >= w.next - def.windup) {
      w.phase = "rising";
      w.gust = tms;
      if (def.sound) sfx.play(def.sound);
    }
  }
  if (w.phase === "rising") {
    w.k = Math.max(w.k, 0.85 * Math.min(1, 1 - (w.next - t) / def.windup));
    if (t >= w.next) { w.phase = "squall"; w.until = t + roll(w, def.lasts); g.squalls = (g.squalls || 0) + 1; }
  }
  if (w.phase === "squall") {
    w.k = 1;
    if (t >= w.until) { w.phase = "easing"; w.next = t + roll(w, def.every); }
  }
  w.bite = w.phase === "squall";
  if (w.bite) {
    Object.assign(WX, def.fx);
    def.onTick?.(g, w, sdt, tms);
  }
};
