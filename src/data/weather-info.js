// ============ WEATHER, IN WORDS ============
// What the campaign card's weather brief (ui/WeatherBrief.jsx) tells a player
// about a level's weather BEFORE the battle: how strong it is, how it opens and
// how often it comes, and what it does. The numbers are read from the graded
// kind (engine/weather.js weatherDefOf), so a retuned kind retells itself;
// only the lore and the advice are written here, one entry per kind.

import { weatherDefOf } from "../engine/weather.js";

const pct = (x) => `${Math.round(x * 100)}%`;
const secs = ([a, b]) => {
  const r = (x) => (x < 20 ? Math.round(x) : Math.round(x / 5) * 5);
  const lo = r(a), hi = r(b);
  if (lo >= 120) return `${+(lo / 60).toFixed(1)}–${+(hi / 60).toFixed(1)} min`;
  return lo === hi ? `${lo} s` : `${lo}–${hi} s`;
};

// strength (0..1) in words
export const strengthWord = (s) => (s >= 0.85 ? "Fierce" : s >= 0.6 ? "Strong" : "Mild");
export const strengthPips = (s) => (s >= 0.85 ? 3 : s >= 0.6 ? 2 : 1);

// the lore and advice, and the line of each effect the kind has
export const WEATHER_INFO = {
  fog: {
    blurb: "A morning fog hangs over the greenwood. The battle opens in it; it burns off as the day wears on, and later banks drift back in.",
    effects: (d) => [`While it is thick, every hall reaches ${pct(1 - d.fx.reach)} less far. Their reach returns as the fog thins.`],
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
    rhythm: `Comes back about every ${secs(d.calm)} of fighting, and lasts ${secs(d.lasts)}`,
    blurb: info.blurb || "", effects: info.effects ? info.effects(d) : [], tip: info.tip || "",
  };
};
