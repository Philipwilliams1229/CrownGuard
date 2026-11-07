// ============ WEATHER, IN WORDS ============
// What the campaign card's weather brief (ui/WeatherBrief.jsx) tells a player
// about a level's weather BEFORE the battle: how strong it is, how it opens and
// how often it comes, and what it does. The numbers are read from the graded
// kind (engine/weather.js weatherDefOf), so a retuned kind retells itself;
// only the lore and the advice are written here, one entry per kind.

import { weatherDefOf, strengthTier, weatherDef, WX, FORECAST, fogLength } from "../engine/weather.js";

const pct = (x) => `${Math.round(x * 100)}%`;
const secs = ([a, b]) => {
  const r = (x) => (x < 20 ? Math.round(x) : Math.round(x / 5) * 5);
  const lo = r(a), hi = r(b);
  if (lo >= 120) return `${+(lo / 60).toFixed(1)}–${+(hi / 60).toFixed(1)} min`;
  return lo === hi ? `${lo} s` : `${lo}–${hi} s`;
};

// strength (0..1) in words
export const strengthPips = (s) => strengthTier(s);
export const strengthWord = (s) => ["Mild", "Strong", "Fierce"][strengthTier(s) - 1];

// the lore and advice, and the line of each effect the kind has
export const WEATHER_INFO = {
  fog: {
    blurb: "A morning fog hangs over the greenwood. The battle opens in it, and it thins as the day wears on.",
    effects: (d) => [`At its thickest, every hall reaches ${pct((1 - d.fx.reach) * (d.peak ?? 1))} less far. Their reach returns as the fog thins.`],
    rhythm: (d) => d.floor > 0
      ? `Half as thick a quarter of the way through the level, then by halfway a light fog that stays all level (${pct((1 - d.fx.reach) * d.floor)} less reach)`
      : "Half as thick a quarter of the way through the level, gone by halfway, and it does not come back",
    tip: "Build closer to the road while the fog is thick. Knights fight what is in front of them, so they do not mind it.",
    opens: () => "Opens in thick fog",
  },
  storm: {
    blurb: "Dark clouds roll in over the marches, the rain builds to a downpour, and lightning begins to fall.",
    effects: (d) => [
      `Rain slows every foe by ${pct(1 - d.fx.foeSpeed)} and can bog a cavalry charge down in the mud.`,
      `Lightning strikes near a random fighter, friend or foe, about every ${secs(d.boltEvery)} at its height: ${Math.round(d.boltDmg)} magic damage and a brief stun.`,
      "A foe with magic resistance or a standing shield takes nothing. Your soldiers lose a little health and cannot strike for a moment.",
    ],
    tip: "The rain is your friend: foes arrive slower and more spread out. Keep soldiers back from the thick of it while the lightning falls.",
  },
  gravemist: {
    blurb: "Cold banks of grave mist rise out of the fen and drift along the road, hiding what walks in them.",
    effects: (d) => [
      `A foe inside a bank can only be targeted from ${d.fx.mistSight} px.`,
      `${d.banks} bank${d.banks > 1 ? "s" : ""} of mist at a time, drifting along the road.`,
    ],
    tip: "Spread your halls down the road so something is always close, and keep knights where the mist gathers.",
  },
  blizzard: {
    blurb: "A freezing wind off the Rimewater whips the snow across the field.",
    effects: (d) => [
      `Halls reach ${pct(1 - d.fx.reach)} less far and every shot flies ${pct(1 - d.fx.shotSpeed)} slower.`,
      `Fliers come down low and slow ${pct(1 - d.fx.flierSpeed)}; halls that cannot hit the air can shoot them.`,
    ],
    tip: "Build close to the road while it blows, and let ground-only halls take the low fliers.",
  },
  eruption: {
    blurb: "The mountain wakes. Burning rocks fall on the road and around it.",
    effects: (d) => [
      `Rocks land about every ${secs(d.rockEvery)} at the height of an eruption, a shadow and a whistle first: ${Math.round(d.rockDmg)} damage to foes in the blast.`,
      `A hall near a landing is set alight for ${+(d.hallBurn / 1000).toFixed(1)} s and holds its fire. Fire halls don't mind.`,
    ],
    tip: "Watch for the shadows; keep halls a little back from the road's bends where the rocks fall.",
  },
};

// The brief for a spec ({ kind, strength } or null for clear skies): null when
// there is nothing to tell.
export const briefOf = (spec) => {
  const d = spec && weatherDefOf(spec);
  if (!d) return null;
  const info = WEATHER_INFO[d.kind] || {};
  const s = spec.strength ?? 0.7;
  return {
    kind: d.kind, name: d.name, strength: s, word: strengthWord(s), pips: strengthPips(s),
    opens: info.opens ? info.opens(d) : d.startThick ? "Opens in thick fog" : `First spell ${secs(d.first)} into the fight`,
    rhythm: info.rhythm ? info.rhythm(d) : `Comes back about every ${secs(d.calm)} of fighting, and lasts ${secs(d.lasts)}`,
    blurb: info.blurb || "", effects: info.effects ? info.effects(d) : [], tip: info.tip || "",
  };
};

// ---- the weather RIGHT NOW (the battle's wave panel, ui/WeatherForecast.jsx) ----
// How hard it blows at this moment (g.weather), what that does to the fight
// (read from the live multipliers WX, so every number is the one the engine is
// using), and what comes next on the level's clock. null with no weather.
const about = (s) => (s < 20 ? `${Math.max(1, Math.round(s))} s` : s < 90 ? `${Math.round(s / 5) * 5} s` : `${+(s / 60).toFixed(1)} min`);
const less = (m) => Math.round((1 - m) * 100);
export const nowOf = (g) => {
  const def = weatherDef(), w = g && g.weather;
  if (!def || !w) return null;
  const words = FORECAST[def.kind] || {};
  const peak = def.peak ?? 1, k = w.k || 0;
  // its strength now, against the strongest it can blow
  const level = Math.round(Math.min(1, k) * 100);
  let title;
  if (def.fade) title = k <= 0.02 ? "Fog gone" : (w.thick ?? 1) >= 0.999 ? words.height : w.phase === "lingering" ? words.lingering : words.easing;
  else title = { calm: "Calm", rising: words.rising, squall: words.height, easing: words.easing }[w.phase] || def.name;
  // what it does at this moment (WX holds the multipliers the engine applies)
  const lines = [];
  if (w.bite) {
    if (WX.reach < 0.995) lines.push(`Every hall reaches ${less(WX.reach)}% less far.`);
    if (WX.shotSpeed < 0.995) lines.push(`Every shot flies ${less(WX.shotSpeed)}% slower.`);
    if (WX.foeSpeed < 0.995) lines.push(`Foes march ${less(WX.foeSpeed)}% slower.`);
    if (WX.flierSpeed < 0.995) lines.push(`Fliers are ${less(WX.flierSpeed)}% slower.`);
    if (WX.fliersLow) lines.push(WX.groundHitsLow ? "Fliers come down low: halls that cannot hit the air can shoot them." : "Fliers come down low.");
    if (WX.noCharge > 0.01) lines.push(`A cavalry charge bogs down in the mud ${Math.round(WX.noCharge * 100)}% of the time.`);
    if (WX.mistSight) lines.push(`A foe inside a bank of mist can only be targeted from ${WX.mistSight} px${w.banks?.length ? ` (${w.banks.length} bank${w.banks.length > 1 ? "s" : ""} on the road)` : ""}.`);
    if (w.phase === "squall" && def.boltEvery) lines.push(`Lightning strikes near a fighter about every ${secs(def.boltEvery)}.`);
    if (w.phase === "squall" && def.rockEvery) lines.push(`Burning rocks fall about every ${secs(def.rockEvery)}.`);
  }
  if (!lines.length) lines.push("No effect on the fight right now.");
  // what comes next
  let next = "";
  if (def.fade) {
    const N = fogLength(), half = Math.ceil(N / 4), gone = Math.ceil(N / 2), r = w.thick ?? (k / peak);
    const end = def.floor > 0 ? `down to a light fog by wave ${gone}, which stays` : `gone by wave ${gone}`;
    next = r <= 0 ? (def.floor > 0 ? "A light fog lingers for the rest of the level." : "It will not return this level.")
      : r > 0.5 ? `About half as thick by wave ${half}, and ${end}.`
        : `${end[0].toUpperCase()}${end.slice(1)}.`;
  } else if (w.seg && w.clock != null) {
    const left = Math.max(0, w.seg.t1 - w.clock);
    next = { calm: `The next spell begins in about ${about(left)} of fighting.`, rising: `At full strength in about ${about(left)}.`,
      squall: `It passes in about ${about(left)} of fighting.`, easing: `Clear in about ${about(left)}.` }[w.phase] || "";
    if (next) next += g.phase === "combat" ? "" : " Its clock stands still between waves.";
  }
  return { kind: def.kind, title, level, lines, next };
};

