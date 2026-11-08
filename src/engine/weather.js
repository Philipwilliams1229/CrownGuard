// ============ WEATHER ============
// Battle weather: one signature kind per zone (owner, 2026-10-03), growing
// stronger the further into a chapter you go (data/weather-plan.js). It is a
// small general system: a KIND is one entry in WEATHER_KINDS below — its
// rhythm, what it does to the fight (`fx`, and an optional `tick` for things
// that strike), how it scales with strength (`grade`), its sound, and the
// painter that draws it (render/weatherfx.js PAINTERS) — so a new kind is a
// data entry plus a painter, never a new engine path.
//
// Where a battle's weather comes from (weatherDef, first match wins):
//   1. a Free Play sandbox run: its `weather` setting (data/sandbox.js) —
//      "realm" (the board's own), "none", or a kind at `weatherPower`
//   2. a campaign level: setLevelWeather(weatherFor(lv)) at startLevel
//      (CrownguardGame.jsx; data/weather-plan.js) — null = clear skies
//   3. the realm's own `weather` (maps.js / realms-*.js), e.g. the zone IV
//      test board: weather: { kind: "blizzard" }
// A weather spec is { kind, strength?, ...any field of the kind }: `strength`
// (0..1) runs the kind's `grade`; fields given override everything.
//
// Two rhythms:
//   "squall"  calm -> rising (windup s, drawn only) -> squall (bites, `lasts`
//             s) -> easing (ease s) -> calm for `every` s. First spell at
//             ~`first` s into the level's combat.
//   "fade"    (fog, `fade: true`) thick from the first build phase, thinning
//             with the LEVEL's progress: half as thick a quarter of the way
//             through its waves, gone by halfway, never back (fogTick below).
// The clock runs only in combat and is seeded from the realm's seed and the
// kind, never Math.random, so a sim is the same run with weather on or off
// apart from the weather itself.
//
// State on `g.weather` (the painters read it):
//   { kind, paint, phase, k: 0..1 how hard it is now, bite: true while fx
//     applies, clock, next, until, marks: [telegraphed strikes], banks: [mist
//     banks] }
// The engine reads only WX (below) and canSee(); halls set burning by an
// eruption carry t.fireLeft / t.fireMax (build.js `fights` holds their fire).

import { REALM } from "../data/maps.js";
import { mulberry32, W, WALL_W } from "../data/constants.js";
import { MECH } from "../data/zone-flags.js";
import { SANDBOX } from "../data/sandbox.js";
import { waveHpMult, waveSpec, victoryWave } from "../data/waves.js";
import { getStats } from "./towers.js";
import { dealDamage } from "./actions.js";
import { posAt, angleAt, TOTAL_LEN } from "./path.js";
import { sfx } from "../audio/sfx.js";

const lerp = (a, b, s) => a + (b - a) * s;
// the strength meter's three steps (the level card's pips: Mild, Strong, Fierce)
export const strengthTier = (s) => (s >= 0.85 ? 3 : s >= 0.6 ? 2 : 1);
// the fog's thickness at each step: x the 35% reach cut = 15%, 25%, 35%
const FOG_PEAK = { 1: 15 / 35, 2: 25 / 35, 3: 1 };
// and where it settles once it has thinned (owner, 2026-11-07): a Fierce fog
// never lifts all the way, a light fog that still costs 5% of every reach
const FOG_FLOOR = { 1: 0, 2: 0, 3: 5 / 35 };
const span = (a0, a1, b0, b1, s) => [lerp(a0, b0, s), lerp(a1, b1, s)];

// ---- the kinds ----
// Fields (all optional but `paint`):
//   first, calm, rollIn, lasts, rollOut   the level clock's rhythm, s, each a
//           [min, max] rolled from a seeded generator per spell: calm before
//           the first spell, calm between, rolling in, holding, rolling out
//   peak    how hard a spell blows at its height (k's ceiling; mild = lighter)
//   startThick  the level opens mid-spell, at its height (the morning fog)
//   fx      what it does while it bites — neutral = 1 / false / 0:
//     reach         x every hall's reach (range, mRange, auraRange; towers.js getStats)
//     shotSpeed     x every arrow, bolt, stone, shard in flight (update.js)
//     foeSpeed      x every foe's pace (rain, mud, snow)
//     flierSpeed    x a flier's pace on top of foeSpeed
//     fliersLow     fliers come down low (drawn lower)
//     groundHitsLow while fliers are low, ground-only halls may shoot them
//     noCharge      the chance (x k) that a cavalry charge bogs down instead of riding a blocker down
//     fire          x every burn and burning pool (rain douses them)
//     misfire       the chance a Powder Works charge lands a dud (x k)
//     charged       0..1, the air full of lightning: a Stormcaller's arcs leap further (towers.js)
//     riverReach    x the River Watch's reach (the rivers run high)
//   soaks   the kind wets the ground: `w.wet` chases k (wetIn / wetOut s),
//           and foeSpeed, noCharge and riverReach follow the wet, not k
//     sight         a hall cannot target a foe further than this from itself
//                   (fog: divided by k, so it opens as the fog burns off)
//     mistSight     a foe inside a mist bank can only be targeted from this close
//   tick(g, w, def, sdt, tms)   while it bites (lightning, rocks, mist banks)
//   grade(s)        fields for strength s (0..1)
//   paint, sound    the painter (render/weatherfx.js) and the sfx as it rises
export const WEATHER_KINDS = {
  // ---- zone IV, the Rimewater ----
  blizzard: {
    name: "Blizzard",
    first: [40, 60], calm: [70, 100], rollIn: [15, 22], lasts: [25, 40], rollOut: [15, 22],
    // (owner, 2026-10-03: low fliers are fair game for ground-only halls)
    fx: { reach: 0.8, shotSpeed: 0.85, flierSpeed: 0.85, fliersLow: true, groundHitsLow: true },
    grade: (s) => ({ first: span(80, 110, 40, 60, s), calm: span(120, 160, 70, 100, s), lasts: span(15, 25, 25, 40, s), peak: lerp(0.7, 1, s),
      fx: { reach: 1 - 0.2 * s, shotSpeed: 1 - 0.15 * s, flierSpeed: 1 - 0.15 * s } }),
    paint: "blizzard", sound: "gust",
  },
  // ---- the Greenwood: MORNING FOG ----
  // (owner, 2026-11-07) The battle opens in the fog at its thickest, from the
  // first build phase, and it thins as the LEVEL goes on (`fade`, fogTick):
  // half as thick a quarter of the way through the level's waves, gone by
  // halfway (15 waves: gone midway through wave 8), and it never comes back.
  // It thins smoothly through each wave's fighting and holds still between
  // waves. Its thickness k is its bite: every hall reaches 35% x k less far.
  // The strength meter's three steps set how thick it gets (`peak`): Mild
  // 15%, Strong 25%, Fierce 35% less reach at the start. A Fierce fog thins
  // only to a light fog (`floor`: 5% less reach) and lingers all level.
  fog: {
    name: "Morning Fog", fade: true, startThick: true,
    fx: { reach: 0.65 },
    peak: 1,
    grade: (s) => ({ peak: FOG_PEAK[strengthTier(s)], floor: FOG_FLOOR[strengthTier(s)] }),
    paint: "fog", sound: "fogbell",
  },
  // ---- the Iron Marches: THUNDERSTORM ----
  // It ROLLS IN (owner, 2026-10-04): after a calm the sky darkens little by
  // little and the rain builds from a few drops to a downpour over `rollIn`
  // s; once it is heavy the lightning begins, sparse at first and building
  // over `boltRamp` s; it holds `lasts` s, then the lightning stops first, the
  // rain eases and the sky lightens over `rollOut` s. A stroke lands at RANDOM
  // near a random live fighter — any foe on the road or a soldier/hero of
  // yours — jittered `boltJitter` px; a foe with magic resistance (mres > 0)
  // or a standing shield takes nothing; your soldiers are hurt (never below
  // 1) and can't strike for `boltDaze` ms. Strokes fall only in combat.
  //
  // THE RAIN BITES (owner, 2026-11-08: "pretty lackluster" — it only slowed
  // foes, which helped you). Two clocks: `k`, how hard it rains NOW, and
  // `w.wet`, how SOAKED the ground is, which chases k (`soaks`: up in
  // `wetIn` s of downpour, lagging the rain, and dries over `wetOut` s;
  // still between waves). The rain changes WHICH halls work, not just how
  // fast foes walk:
  //   by k (the rain falling)
  //     fire       x every burn and every burning pool (lava, fire): doused
  //     misfire    the chance a Powder Works charge lands a dud (damp powder)
  //     charged    a Stormcaller's lightning leaps one foe further (from k
  //                0.5) and its leaps reach up to 25% x k further; Ysolde's
  //                bolts leap once more too
  //   by wet (the ground)
  //     foeSpeed   mud: ground foes march slower (not fliers, not ships)
  //     noCharge   mud: a cavalry charge bogs down
  //     riverReach x the River Watch's reach: the rivers run high
  //   a stroke of lightning runs on through the wet: from where it lands to
  //   up to `boltArcs` x wet more ground foes, each within `boltArcR` of the
  //   last, for `boltArcDmg` of its blow (the shielded and magic-resistant
  //   are passed over).
  storm: {
    name: "Thunderstorm", soaks: true, wetIn: 45, wetOut: 60,
    first: [50, 75], calm: [70, 120], rollIn: [25, 40], lasts: [120, 240], rollOut: [25, 40],
    fx: { foeSpeed: 0.9, noCharge: 1, fire: 0.5, misfire: 0.3, charged: 1, riverReach: 1.15 },
    boltEvery: [10, 14], boltRamp: 30, boltWarn: 600, boltR: 30, boltJitter: 34, boltDmg: 40, boltStun: 500, boltUnit: 45, boltDaze: 1100,
    boltArcs: 3, boltArcR: 70, boltArcDmg: 0.6,
    grade: (s) => ({ first: span(70, 100, 50, 75, s), calm: span(120, 200, 70, 120, s), lasts: span(60, 120, 120, 240, s), peak: lerp(0.65, 1, s),
      boltEvery: span(16, 22, 10, 14, s), boltDmg: lerp(25, 40, s), boltArcs: s < 0.5 ? 2 : 3,
      fx: { foeSpeed: 1 - 0.1 * s, fire: 1 - lerp(0.3, 0.5, s), misfire: lerp(0.15, 0.3, s), riverReach: 1 + lerp(0.1, 0.15, s) } }),
    tick: (g, w, def, sdt, tms) => strikes(g, w, def, tms, "bolt"),
    paint: "storm", sound: "thunder",
  },
  // ---- the Hollowfen: GRAVE MIST ----
  // Banks of mist rise and drift along the road; a foe inside one can be
  // targeted only from `mistSight` px. Towers have to be spread down the road.
  gravemist: {
    name: "Grave Mist",
    first: [45, 70], calm: [70, 100], rollIn: [20, 30], lasts: [30, 50], rollOut: [20, 30],
    fx: { mistSight: 55 },
    banks: 3, bankR: 60, drift: 16,
    grade: (s) => ({ first: span(80, 110, 45, 70, s), calm: span(120, 160, 70, 100, s), lasts: span(20, 30, 30, 50, s),
      banks: s < 0.5 ? 1 : s < 0.85 ? 2 : 3, bankR: lerp(46, 60, s) }),
    tick: (g, w, def, sdt, tms) => driftMist(g, w, def, sdt, tms),
    paint: "gravemist", sound: "moan",
  },
  // ---- zone V, the Ashen Reach: ERUPTIONS (no level yet) ----
  // Burning rocks fall on and near the road after a shadow and a whistle
  // (`rockWarn` ms) while it is at its height: they hurt the foes they land
  // among, and a hall within `rockHall` px is set burning for `hallBurn` ms
  // (holds its fire, like the frost shroud). Fire halls don't mind.
  eruption: {
    name: "Eruption",
    first: [40, 60], calm: [60, 90], rollIn: [15, 25], lasts: [30, 50], rollOut: [15, 22],
    fx: {},
    rockEvery: [2.5, 4], boltRamp: 15, rockWarn: 1000, rockR: 30, rockDmg: 110, rockHall: 34, hallBurn: 4500,
    grade: (s) => ({ first: span(80, 110, 40, 60, s), calm: span(100, 130, 60, 90, s), lasts: span(20, 30, 30, 50, s), peak: lerp(0.7, 1, s),
      rockEvery: span(5, 7, 2.5, 4, s), rockDmg: lerp(60, 110, s), hallBurn: lerp(3000, 4500, s) }),
    tick: (g, w, def, sdt, tms) => strikes(g, w, def, tms, "rock"),
    paint: "eruption", sound: "rumble",
  },
};

const NEUTRAL = { reach: 1, shotSpeed: 1, foeSpeed: 1, flierSpeed: 1, fliersLow: false, groundHitsLow: false, noCharge: 0, sight: 0, mistSight: 0, mistStamp: -1,
  fire: 1, misfire: 0, charged: 0, riverReach: 1 };
// The live multipliers, reset every frame by tickWeather.
export const WX = { ...NEUTRAL };

// Can a hall (or a skiff) at (h.x, h.y) see foe e to target it? Fog limits
// every hall to WX.sight; a foe in a mist bank can only be picked out from
// WX.mistSight. (Melee — knights, blades — fight what is in front of them.)
export const canSee = (h, e) => {
  if (!WX.sight && !WX.mistSight) return true;
  const d = Math.hypot(e.x - h.x, e.y - h.y);
  if (WX.sight && d > WX.sight) return false;
  if (WX.mistSight && e.misted === WX.mistStamp && d > WX.mistSight) return false;
  return true;
};

// ---- where the weather comes from ----
let LEVEL_WEATHER;             // undefined: the realm decides; null: none
export const setLevelWeather = (spec) => { LEVEL_WEATHER = spec; };
const specNow = () => {
  if (SANDBOX) {
    const k = SANDBOX.weather || "realm";
    if (k === "none") return null;
    if (k !== "realm") return { kind: k, strength: SANDBOX.weatherPower ?? 0.7 };
    return REALM && REALM.weather;
  }
  return LEVEL_WEATHER !== undefined ? LEVEL_WEATHER : REALM && REALM.weather;
};
// The weather now, its kind's defaults graded by strength and overridden by
// the spec's own fields (null: none).
export const weatherDef = () => {
  const w = specNow();
  if (!w || !MECH.weather) return null;
  return weatherDefOf(w);
};
// The same, for any spec (the campaign card's weather brief reads it before a
// battle exists): null for an unknown kind.
export const weatherDefOf = (w) => {
  const kind = w && WEATHER_KINDS[w.kind];
  if (!kind) return null;
  const gr = w.strength != null && kind.grade ? kind.grade(Math.max(0, Math.min(1, w.strength))) : {};
  return { ...kind, ...gr, ...w, fx: { ...kind.fx, ...(gr.fx || {}), ...(w.fx || {}) } };
};

const roll = (w, [a, b]) => a + (b - a) * w.rng();   // (w: anything with an rng())
const seedOf = (kind) => [...kind].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) | 0;

// ---- the level clock ----
// ONE clock per level, in battle seconds from the first horn: it runs only in
// combat and never jumps at a wave's start or end. Between waves the weather
// FREEZES as it stands (same k, still drawn and animating; strikes wait for
// the next fight), so waiting can't clear it. The spells are a schedule of
// segments { ph, t0, t1 } — calm, rising, squall (its height), easing —
// generated lazily from a seeded generator (w.srng, never shared with the
// strikes), so the forecast can read the future exactly.
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const extend = (w, def, upTo) => {
  const S = w.segs;
  while (!S.length || S[S.length - 1].t1 <= upTo) {
    const last = S[S.length - 1];
    const t0 = last ? last.t1 : 0;
    const next = !last ? (def.startThick ? "squall" : "calm")
      : { calm: "rising", rising: "squall", squall: "easing", easing: "calm" }[last.ph];
    const len = next === "calm" ? roll(w.srng, last ? def.calm : def.first)
      : next === "rising" ? roll(w.srng, def.rollIn) : next === "squall" ? roll(w.srng, def.lasts) : roll(w.srng, def.rollOut);
    S.push({ ph: next, t0, t1: t0 + Math.max(0.01, len), spell: next === "rising" || (!last && next === "squall") ? (w.spells = (w.spells || 0) + 1) : last ? last.spell : 0 });
  }
};
export const segAt = (w, def, t) => {
  extend(w, def, t);
  let i = w.segI || 0;
  while (i > 0 && w.segs[i].t0 > t) i--;
  while (w.segs[i].t1 <= t) i++;
  w.segI = i;
  return w.segs[i];
};
const kAt = (seg, def, t) => {
  const p = (t - seg.t0) / (seg.t1 - seg.t0), peak = def.peak ?? 1;
  return seg.ph === "squall" ? peak : seg.ph === "rising" ? peak * smooth(p) : seg.ph === "easing" ? peak * (1 - smooth(p)) : 0;
};
const ensure = (g, def) => {
  let w = g.weather;
  if (!w || w.kind !== def.kind) {
    const seed = (REALM.seed || 1) * 31 + seedOf(def.kind);
    w = g.weather = { kind: def.kind, paint: def.paint, phase: "calm", k: 0, bite: false, clock: 0, segs: [], segI: 0, gust: -1e9,
      marks: [], banks: [], rng: mulberry32(seed), srng: { rng: mulberry32(seed ^ 0x5eed) } };
  }
  return w;
};

// Advance the weather one frame (update.js calls it every frame, any phase).
export const tickWeather = (g, sdt, tms) => {
  Object.assign(WX, NEUTRAL);
  const def = weatherDef();
  if (!def) { g.weather = null; return; }
  const w = ensure(g, def);
  burnHalls(g, sdt);
  const combat = g.phase === "combat";
  if (def.fade) { fogTick(g, w, def, sdt, combat); return; }
  if (combat) w.clock += sdt;            // between waves the clock (and so the weather) stands still
  else w.marks.length = 0;               // no one is fighting: a gathering stroke never falls
  const seg = segAt(w, def, w.clock);
  const was = w.phase;
  w.phase = seg.ph;
  w.seg = seg;
  w.k = kAt(seg, def, w.clock);
  if (w.phase === "rising" && was !== "rising") { w.gust = tms; if (def.sound && combat) sfx.play(def.sound); g.squalls = (g.squalls || 0) + 1; }
  if (w.phase === "squall" && was !== "squall") w.strikeAt = w.clock + 1;
  // the ground soaks as it rains and dries after, only while there is fighting
  if (def.soaks) {
    const wet = w.wet || 0;
    if (combat) w.wet = w.k > wet ? Math.min(w.k, wet + sdt / (def.wetIn || 25)) : Math.max(w.k, wet - sdt / (def.wetOut || 45));
    else w.wet = wet;
  }
  w.bite = w.k > 0.02 || w.wet > 0.02;
  if (w.bite) applyFx(def, w.k, def.soaks ? w.wet : w.k);
  // strikes (lightning, rocks) only at the spell's height, in combat; mist
  // banks drift while there is mist and a fight
  if (def.tick && (def.paint === "gravemist" ? w.k > 0.02 : w.phase === "squall") && (combat || def.paint === "gravemist")) def.tick(g, w, def, combat ? sdt : 0, tms);
  if (def.paint === "gravemist" && w.k <= 0.02) w.banks.length = 0;
  // telegraphed strikes land even if the height has just passed
  landStrikes(g, w, def, tms);
};
// ---- the fading fog ----
// Its thickness follows the level's progress p (waves done, plus how far the
// wave in hand has got, out of the level's waves): 1 at the start, 0.5 at
// p 0.25, 0 at p 0.5, scaled between the kind's `floor` (0, or a Fierce
// fog's light fog that stays) and its `peak`. How far a wave has got is its
// spawn clock over the time its last foe needs to come out of the wood and
// walk the road; a wave cleared sooner leaves the rest to be caught up early
// in the next. `w.fogP` eases toward that ONLY in combat (3 s), so the fog
// never jumps at a horn and waiting between waves can't thin it. A retried
// wave puts it back where that wave began. No set length (an open Free Play
// run): 20 waves.
const FOG_EASE = 3;          // s, how fast the drawn progress follows the wave's
export const fogLength = () => { const n = victoryWave(); return Number.isFinite(n) && n > 0 ? n : 20; };
export const fogThickness = (p) => Math.max(0, Math.min(1, 1 - 2 * p));
const fogTick = (g, w, def, sdt, combat) => {
  const N = fogLength(), n = g.wave || 0;
  if (w.fogWave == null || n < w.fogWave) w.fogP = Math.max(0, n - (combat ? 1 : 0)) / N;   // a new battle, or a retried wave
  if (n !== w.fogWave) {
    // a new wave: how long its foes take to come out and walk the road
    let last = 0;
    for (const q of g.spawnQueue || []) last = Math.max(last, q.at || 0);
    w.fogSpan = last + (TOTAL_LEN / 55) * 1000;
    w.fogWave = n;
  }
  w.marks.length = 0;
  if (combat && n > 0) {
    const f = Math.min(1, (g.spawnTimer || 0) / Math.max(1000, w.fogSpan || 1));
    const target = (n - 1 + f) / N;
    if (target > w.fogP) w.fogP += (target - w.fogP) * Math.min(1, sdt / FOG_EASE);
  }
  const r = fogThickness(w.fogP), peak = def.peak ?? 1, floor = Math.min(peak, def.floor || 0);
  w.thick = r;                           // 0..1 of the way from its floor to its peak (the painter's sun)
  w.k = floor + (peak - floor) * r;
  w.phase = r >= 0.999 ? "squall" : r > 0 ? "easing" : floor > 0 ? "lingering" : "calm";
  w.bite = w.k > 0.02;
  if (w.bite) applyFx(def, w.k);
};

// the kind's fx at strength k: multipliers ease from 1, chances scale, flags
// switch at half strength, fog's sight opens as it thins. A kind that soaks
// the ground drives the mud and the rivers by `wet` instead of k.
const BY_WET = new Set(["foeSpeed", "riverReach"]);
const applyFx = (def, k, wet = k) => {
  const fx = def.fx;
  for (const key of ["reach", "shotSpeed", "foeSpeed", "flierSpeed", "fire", "riverReach"]) if (fx[key] != null) WX[key] = 1 + (fx[key] - 1) * (BY_WET.has(key) ? wet : k);
  if (fx.noCharge) WX.noCharge = fx.noCharge * wet;
  if (fx.misfire) WX.misfire = fx.misfire * k;
  if (fx.charged) WX.charged = fx.charged * k;
  if (fx.fliersLow) WX.fliersLow = k > 0.5;
  if (fx.groundHitsLow) WX.groundHitsLow = k > 0.5;
  if (fx.sight) WX.sight = k > 0.04 ? fx.sight / k : 0;
  if (fx.mistSight && k > 0.4) WX.mistSight = fx.mistSight;
};

// ---- strikes: lightning and falling rocks ----
// While the squall bites, every `boltEvery` / `rockEvery` s a strike is
// marked (w.marks: { kind, x, y, r, at, t0 }) and lands `boltWarn` /
// `rockWarn` ms later. Never at the castle.
const NO_CLOSER = 40;     // px short of the wall's face
const strikes = (g, w, def, tms, kind) => {
  const every = kind === "bolt" ? def.boltEvery : def.rockEvery;
  if (w.clock < (w.strikeAt ?? 0)) return;
  // sparse at first, building over `boltRamp` s of the spell's height
  const ramp = Math.min(1, (w.clock - (w.seg?.t0 ?? 0)) / (def.boltRamp || 1));
  w.strikeAt = w.clock + roll(w, every) * (1 + 1.5 * (1 - ramp));
  w.def = def;
  const pt = kind === "bolt" ? boltPoint(g, w) : rockPoint(g, w);
  if (!pt) return;
  const warn = kind === "bolt" ? def.boltWarn : def.rockWarn;
  w.marks.push({ kind, x: pt[0], y: pt[1], r: kind === "bolt" ? def.boltR : def.rockR, t0: tms, at: tms + warn });
  if (kind === "rock") sfx.play("whistle");
};
const roadOK = (x) => x < W - WALL_W - NO_CLOSER;
// lightning: a random point near a random live fighter — a foe on the road,
// or one of your soldiers or the hero (not a boat on the water), jittered
const boltPoint = (g, w) => {
  const live = [];
  for (const e of g.enemies) if (!e.dead && !e.ship && !e.swimming && roadOK(e.x)) live.push(e);
  for (const h of [...g.towers, ...(g.bands || [])]) {
    if (h.kind === "riverwatch") continue;
    for (const u of h.units || []) if (u.state !== "dead" && roadOK(u.x)) live.push(u);
  }
  if (!live.length) return null;
  for (let tries = 0; tries < 4; tries++) {
    const f = live[Math.floor(w.rng() * live.length)];
    const a = w.rng() * Math.PI * 2, r = w.rng() * (w.def?.boltJitter ?? 34);
    const x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r * 0.7;
    if (roadOK(x)) return [x, y];
  }
  return null;
};
// a falling rock: anywhere along the road (a little off it now and then),
// leaning toward where the foes are
const rockPoint = (g, w) => {
  for (let tries = 0; tries < 6; tries++) {
    const live = g.enemies.filter((e) => !e.dead && !e.ship);
    let d;
    if (live.length && w.rng() < 0.6) d = live[Math.floor(w.rng() * live.length)].dist + (w.rng() - 0.3) * 80;
    else d = TOTAL_LEN * (0.08 + 0.84 * w.rng());
    d = Math.max(20, Math.min(TOTAL_LEN - 30, d));
    const [x, y] = posAt(d), a = angleAt(d) + Math.PI / 2, off = (w.rng() - 0.5) * 70;
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (roadOK(px)) return [px, py];
  }
  return null;
};
const landStrikes = (g, w, def, tms) => {
  if (!w.marks.length) return;
  const keep = [];
  for (const m of w.marks) {
    if (m.at > tms) { keep.push(m); continue; }
    const mult = waveHpMult(Math.max(1, g.wave));
    if (m.kind === "bolt") {
      for (const e of g.enemies) {
        if (e.dead || e.ship || Math.hypot(e.x - m.x, e.y - m.y) > m.r) continue;
        // the magic-resistant and the shielded shrug it off entirely
        if ((e.mres || 0) > 0 || e.guard > 0) continue;
        dealDamage(g, e, def.boltDmg * mult, "magic", false, false, null);
        if (!e.dead && !e.immStun) e.stunUntil = Math.max(e.stunUntil, tms + def.boltStun);
      }
      // the stroke runs on through the wet ground: from where it fell to the
      // nearest ground foe within boltArcR, then on from him, up to boltArcs
      // x wet leaps (the shielded and the magic-resistant are passed over)
      const leaps = Math.round((def.boltArcs || 0) * (w.wet ?? 0));
      let fx0 = m.x, fy0 = m.y;
      const struck = new Set();
      for (let j = 0; j < leaps; j++) {
        let nxt = null, nd = def.boltArcR || 70;
        for (const e of g.enemies) {
          if (e.dead || e.ship || e.swimming || e.flying || struck.has(e) || (e.mres || 0) > 0 || e.guard > 0) continue;
          if (Math.hypot(e.x - m.x, e.y - m.y) <= m.r && j === 0) continue;      // the stroke itself had him
          const dd = Math.hypot(e.x - fx0, e.y - fy0);
          if (dd < nd) { nd = dd; nxt = e; }
        }
        if (!nxt) break;
        struck.add(nxt);
        g.effects.push({ type: "wxarc", x0: fx0, y0: fy0, x1: nxt.x, y1: nxt.y, ttl: 360, life: 360, seed: (g.bolts || 0) * 7 + j });
        dealDamage(g, nxt, def.boltDmg * mult * (def.boltArcDmg ?? 0.6), "magic", false, false, null);
        if (!nxt.dead && !nxt.immStun) nxt.stunUntil = Math.max(nxt.stunUntil, tms + def.boltStun);
        fx0 = nxt.x; fy0 = nxt.y;
        g.boltArcs = (g.boltArcs || 0) + 1;
      }
      // your own soldiers and the hero are dazed too, and singed — never killed
      for (const h of [...g.towers, ...(g.bands || [])]) for (const u of h.units || []) {
        if (u.state === "dead" || Math.hypot(u.x - m.x, u.y - m.y) > m.r) continue;
        u.hp = Math.max(1, u.hp - def.boltUnit);
        u.atkCd = Math.max(u.atkCd || 0, def.boltDaze);
        u.dazedUntil = tms + def.boltDaze;
      }
      g.effects.push({ type: "wxbolt", x: m.x, y: m.y, ttl: 420, life: 420, r: m.r });
      g.shake = Math.max(g.shake, 3);
      sfx.play("crack");
      g.bolts = (g.bolts || 0) + 1;
    } else {
      for (const e of g.enemies) {
        if (e.dead || e.ship || e.flying || Math.hypot(e.x - m.x, e.y - m.y) > m.r) continue;
        dealDamage(g, e, def.rockDmg * mult, "magic", false, false, null);
      }
      for (const t of g.towers) {
        if (Math.hypot(t.x - m.x, t.y - m.y) > def.rockHall || burnsAnyway(t)) continue;
        t.fireLeft = t.fireMax = Math.max(t.fireLeft || 0, def.hallBurn);
        g.hallsBurned = (g.hallsBurned || 0) + 1;
      }
      g.effects.push({ type: "wxrock", x: m.x, y: m.y, ttl: 600, life: 600, r: m.r });
      g.effects.push({ type: "scorch", x: m.x, y: m.y, ttl: 4000, life: 4000, r: m.r * 0.7, seed: (m.x * 7 + m.y) % 6 });
      g.shake = Math.max(g.shake, 4);
      sfx.play("boom");
      g.rocks = (g.rocks || 0) + 1;
    }
  }
  w.marks = keep;
};

// A fire hall (any form with a burn, a breath, hot shot or a lava pool) is
// never set burning by a falling rock — it lives with fire already.
const burnsAnyway = (t) => {
  const st = getStats(t);
  return !!(st.burn || st.mBurn || st.igniteBurn || st.logBurn || st.fragBurn || st.breath || st.poolDps);
};
// halls set burning cool off; between waves they are put out
const burnHalls = (g, sdt) => {
  for (const t of g.towers) {
    if (!(t.fireLeft > 0)) continue;
    t.fireLeft = g.phase === "combat" ? Math.max(0, t.fireLeft - sdt * 1000) : 0;
  }
};

// ---- grave mist ----
// Banks centred on the road, drifting slowly toward the gate and wrapping
// back to the wood; each frame every foe inside one is marked (e.misted).
const driftMist = (g, w, def, sdt, tms) => {
  const n = def.banks || 1;
  if (w.banks.length !== n || w.banksFor !== w.seg?.spell) {
    w.banksFor = w.seg?.spell;
    w.banks = Array.from({ length: n }, (_, i) => ({ d: TOTAL_LEN * ((i + 0.3 + w.rng() * 0.5) / n), r: def.bankR, x: 0, y: 0 }));
  }
  WX.mistStamp = tms;
  for (const b of w.banks) {
    b.d = (b.d + def.drift * sdt) % TOTAL_LEN;
    [b.x, b.y] = posAt(b.d);
    b.r = def.bankR;
  }
  if (w.k <= 0.4) return;            // thin mist hides no one (applyFx agrees)
  for (const e of g.enemies) {
    if (e.dead) continue;
    for (const b of w.banks) {
      const dx = e.x - b.x, dy = (e.y - b.y) * 1.3;
      if (dx * dx + dy * dy <= b.r * b.r) { e.misted = tms; break; }
    }
  }
};

// ---- the forecast (the wave preview, ui/WeatherForecast.jsx) ----
// What the weather is doing as wave `n` begins, and whether a spell will
// roll in during it: { kind, stage, text, sure } — stage "clear" | "brewing"
// | "rising" | "height" | "easing". Exact: the clock stands still between
// waves, so the weather the next wave opens with is the weather now; and the
// schedule is deterministic. "brewing" (sure) means the next spell starts
// rolling in before the wave's last foe is out of the wood (the wave surely
// lasts that long); "likely" (sure: false) when it would start within about
// one road-walk after that; otherwise "Clear".
export const FORECAST = {
  fog:       { brewing: "Fog drifting in", rising: "Fog rolling in", height: "Thick fog", easing: "Fog lifting", lingering: "Light fog", likely: "Fog likely" },
  storm:     { brewing: "Storm brewing", rising: "Storm rolling in", height: "Storm overhead", easing: "Storm passing", likely: "Storm likely" },
  gravemist: { brewing: "Mist gathering", rising: "Mist rising", height: "Grave mist", easing: "Mist thinning", likely: "Mist likely" },
  blizzard:  { brewing: "Snow coming", rising: "Wind rising", height: "Blizzard", easing: "Blizzard easing", likely: "Snow likely" },
  eruption:  { brewing: "The mountain rumbles", rising: "Ash falling", height: "Eruptions", easing: "Eruptions dying down", likely: "Eruptions likely" },
};
// the last foe out of the wood still has the road to walk (~55 px/s)
const likelyAfter = () => Math.max(20, TOTAL_LEN / 55);
// about how long wave n takes to come out of the wood, s (startWave's queue, roughly)
const spawnSpan = (n) => {
  const spec = waveSpec(n) || [];
  const ov = spec.overlap || 0;
  let ms = 400;
  for (const g of spec) if (g.amid == null && g.clock == null && g.landing == null) ms += ((g[1] - 1) * g[2] + 900) * (1 - ov * 0.5);
  return ms / 1000;
};
export const forecast = (g, n) => {
  const def = weatherDef();
  if (!def || !g || n < 1) return null;
  const w = ensure(g, def), words = FORECAST[def.kind] || {};
  const say = (stage, sure = true) => ({ kind: def.kind, stage, text: stage === "clear" ? "Clear" : words[stage] || def.name, sure });
  if (def.fade) {
    // the fog as wave n opens: where the level's progress will stand then
    const r = fogThickness(Math.max(w.fogP || 0, (n - 1) / fogLength()));
    return say(r >= 0.999 ? "height" : r > 0 ? "easing" : def.floor > 0 ? "lingering" : "clear");
  }
  const seg = segAt(w, def, w.clock);
  if (seg.ph === "rising") return say("rising");
  if (seg.ph === "squall") return say("height");
  if (seg.ph === "easing") return say("easing");
  const now = n === g.wave && g.phase === "combat";
  const left = Math.max(0, spawnSpan(n) - (now ? (g.spawnTimer || 0) / 1000 : 0));
  if (seg.t1 <= w.clock + left) return say("brewing");
  if (seg.t1 <= w.clock + left + likelyAfter()) return say("likely", false);
  return say("clear");
};
