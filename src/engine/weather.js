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
//   "wave"    (fog) each wave, with `chance`, starts thick and holds `hold` s,
//             then burns off over `burn` s; `k` falls with it.
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
import { waveHpMult, waveSpec } from "../data/waves.js";
import { getStats } from "./towers.js";
import { dealDamage } from "./actions.js";
import { posAt, angleAt, TOTAL_LEN } from "./path.js";
import { sfx } from "../audio/sfx.js";

const lerp = (a, b, s) => a + (b - a) * s;
const span = (a0, a1, b0, b1, s) => [lerp(a0, b0, s), lerp(a1, b1, s)];

// ---- the kinds ----
// Fields (all optional but `paint`):
//   rhythm  "squall" (default) | "wave"
//   every, lasts, first, windup, ease   the squall rhythm (s; [min, max] rolled)
//   chance, hold, burn                  the wave rhythm (fog)
//   fx      what it does while it bites — neutral = 1 / false / 0:
//     reach         x every hall's reach (range, mRange, auraRange; towers.js getStats)
//     shotSpeed     x every arrow, bolt, stone, shard in flight (update.js)
//     foeSpeed      x every foe's pace (rain, mud, snow)
//     flierSpeed    x a flier's pace on top of foeSpeed
//     fliersLow     fliers come down low (drawn lower)
//     groundHitsLow while fliers are low, ground-only halls may shoot them
//     noCharge      a cavalry charge (trample) does not ride a blocker down
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
    every: [60, 90], lasts: [12, 15], first: 25, windup: 4, ease: 2.5,
    // (owner, 2026-10-03: low fliers are fair game for ground-only halls)
    fx: { reach: 0.8, shotSpeed: 0.85, flierSpeed: 0.85, fliersLow: true, groundHitsLow: true },
    grade: (s) => ({ every: span(110, 140, 60, 90, s), lasts: span(9, 12, 12, 15, s), first: lerp(50, 25, s),
      fx: { reach: 1 - 0.2 * s, shotSpeed: 1 - 0.15 * s, flierSpeed: 1 - 0.15 * s } }),
    paint: "blizzard", sound: "gust",
  },
  // ---- the Greenwood: MORNING FOG ----
  // Thick as the horn sounds, burning off through the wave. While thick a
  // hall sees only `sight` px: the long-reach halls lose their reach, the
  // close ones don't notice.
  fog: {
    name: "Morning Fog", rhythm: "wave",
    // (tuned 2026-10-03 against the sims: sight 62 / 18 s held / every wave
    // took the Warrens from ~60 to ~280 castle damage — a wall, not a spice)
    chance: 0.85, hold: 8, burn: 28,
    fx: { sight: 85 },
    grade: (s) => ({ chance: 0.35 + 0.5 * s, hold: lerp(3, 8, s), burn: lerp(18, 28, s), fx: { sight: lerp(105, 85, s) } }),
    paint: "fog", sound: "fogbell",
  },
  // ---- the Iron Marches: THUNDERSTORM ----
  // Rain (a modest slow, and a charge bogs down in the mud) and lightning:
  // a flicker and a mark, `boltWarn` ms, then a stroke of magic that dazes
  // everyone caught in it, foes and your own soldiers alike. It falls at
  // RANDOM where the fighters are (owner, 2026-10-04: "too much of a buff"):
  // near a random live foe on the road or a random soldier/hero of yours,
  // jittered `boltJitter` px, so it hits whoever happens to be there. A foe
  // with any magic resistance (mres > 0) or a standing shield takes nothing
  // from it, neither harm nor daze. Your soldiers are hurt (never below 1)
  // and can't strike for `boltDaze` ms.
  storm: {
    name: "Thunderstorm",
    every: [45, 70], lasts: [16, 22], first: 25, windup: 4, ease: 3,
    fx: { foeSpeed: 0.9, noCharge: true },
    boltEvery: [4, 6], boltWarn: 600, boltR: 30, boltJitter: 34, boltDmg: 40, boltStun: 500, boltUnit: 45, boltDaze: 1100,
    grade: (s) => ({ every: span(100, 130, 45, 70, s), lasts: span(10, 14, 16, 22, s), first: lerp(55, 25, s),
      boltEvery: span(7, 10, 4, 6, s), boltDmg: lerp(25, 40, s), fx: { foeSpeed: 1 - 0.1 * s } }),
    tick: (g, w, def, sdt, tms) => strikes(g, w, def, tms, "bolt"),
    paint: "storm", sound: "thunder",
  },
  // ---- the Hollowfen: GRAVE MIST ----
  // Banks of mist drift along the road; a foe inside one can be targeted only
  // from `mistSight` px. Towers have to be spread down the road, not bunched.
  gravemist: {
    name: "Grave Mist",
    every: [50, 75], lasts: [18, 24], first: 25, windup: 4, ease: 3,
    fx: { mistSight: 55 },
    banks: 3, bankR: 60, drift: 16,
    grade: (s) => ({ every: span(100, 130, 50, 75, s), lasts: span(12, 16, 18, 24, s), first: lerp(55, 25, s),
      banks: s < 0.5 ? 1 : s < 0.85 ? 2 : 3, bankR: lerp(46, 60, s) }),
    tick: (g, w, def, sdt, tms) => driftMist(g, w, def, sdt, tms),
    paint: "gravemist", sound: "moan",
  },
  // ---- zone V, the Ashen Reach: ERUPTIONS (no level yet) ----
  // Burning rocks fall on and near the road after a shadow and a whistle
  // (`rockWarn` ms): they hurt the foes they land among, and a hall within
  // `rockHall` px is set burning for `hallBurn` ms (holds its fire, like the
  // frost shroud). Fire halls don't mind.
  eruption: {
    name: "Eruption",
    every: [40, 65], lasts: [14, 18], first: 25, windup: 4, ease: 3,
    fx: {},
    rockEvery: [1.8, 3], rockWarn: 1000, rockR: 30, rockDmg: 110, rockHall: 34, hallBurn: 4500,
    grade: (s) => ({ every: span(90, 120, 40, 65, s), lasts: span(10, 13, 14, 18, s), first: lerp(55, 25, s),
      rockEvery: span(4, 5.5, 1.8, 3, s), rockDmg: lerp(60, 110, s), hallBurn: lerp(3000, 4500, s) }),
    tick: (g, w, def, sdt, tms) => strikes(g, w, def, tms, "rock"),
    paint: "eruption", sound: "rumble",
  },
};

const NEUTRAL = { reach: 1, shotSpeed: 1, foeSpeed: 1, flierSpeed: 1, fliersLow: false, groundHitsLow: false, noCharge: false, sight: 0, mistSight: 0, mistStamp: -1 };
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
  const kind = WEATHER_KINDS[w.kind];
  if (!kind) return null;
  const gr = w.strength != null && kind.grade ? kind.grade(Math.max(0, Math.min(1, w.strength))) : {};
  return { rhythm: "squall", windup: 4, ease: 3, first: 25, ...kind, ...gr, ...w, fx: { ...kind.fx, ...(gr.fx || {}), ...(w.fx || {}) } };
};

const roll = (w, [a, b]) => a + (b - a) * w.rng();
const seedOf = (kind) => [...kind].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) | 0;

// Advance the weather one frame (update.js calls it every frame, any phase).
export const tickWeather = (g, sdt, tms) => {
  Object.assign(WX, NEUTRAL);
  const def = weatherDef();
  if (!def) { g.weather = null; return; }
  let w = g.weather;
  if (!w || w.kind !== def.kind) {
    w = g.weather = { kind: def.kind, paint: def.paint, phase: "calm", k: 0, bite: false, clock: 0, next: 0, until: 0, gust: -1e9,
      marks: [], banks: [], rng: mulberry32((REALM.seed || 1) * 31 + seedOf(def.kind)) };
    w.next = def.first + roll(w, [0, 10]);
  }
  burnHalls(g, sdt);
  // between waves the weather clears, the clock waits, and the strikes stop
  if (g.phase !== "combat") {
    if (w.phase !== "calm") { w.phase = "easing"; w.bite = false; }
    w.k = Math.max(0, w.k - sdt / (def.ease || 3));
    if (w.k <= 0) w.phase = "calm";
    w.marks.length = 0;
    return;
  }
  w.clock += sdt;
  const t = w.clock;
  if (def.rhythm === "wave") {
    // a fresh wave: thick fog (or not), then it burns off
    if (w.wave !== g.wave) {
      w.wave = g.wave;
      // (seeded by the realm and the wave, so a retried wave has the same morning)
      w.foggy = foggyWave(def, g.wave);   // (the forecast reads the same roll)
      w.t0 = t;
      if (w.foggy) { w.k = 1; w.phase = "squall"; if (def.sound) sfx.play(def.sound); g.squalls = (g.squalls || 0) + 1; }
    }
    if (w.foggy) {
      const age = t - w.t0;
      w.k = age < def.hold ? 1 : Math.max(0, 1 - (age - def.hold) / def.burn);
      w.phase = w.k > 0 ? (age < def.hold ? "squall" : "easing") : "calm";
    } else { w.k = 0; w.phase = "calm"; }
    w.bite = w.k > 0.04;
  } else {
    if (w.phase === "calm" || w.phase === "easing") {
      if (w.phase === "easing") { w.k = Math.max(0, w.k - sdt / def.ease); if (w.k <= 0) w.phase = "calm"; }
      if (t >= w.next - def.windup) { w.phase = "rising"; w.gust = tms; if (def.sound) sfx.play(def.sound); }
    }
    if (w.phase === "rising") {
      w.k = Math.max(w.k, 0.85 * Math.min(1, 1 - (w.next - t) / def.windup));
      if (t >= w.next) { w.phase = "squall"; w.until = t + roll(w, def.lasts); g.squalls = (g.squalls || 0) + 1; w.strikeAt = t + 1; }
    }
    if (w.phase === "squall") {
      w.k = 1;
      if (t >= w.until) { w.phase = "easing"; w.next = t + roll(w, def.every); }
    }
    w.bite = w.phase === "squall";
  }
  if (w.bite) {
    Object.assign(WX, def.fx);
    // fog opens as it thins: a hall sees sight/k
    if (def.fx.sight) WX.sight = def.fx.sight / Math.max(0.05, w.k);
    def.tick?.(g, w, def, sdt, tms);
  }
  // telegraphed strikes land even if the squall has just ended
  landStrikes(g, w, def, tms);
};

// ---- strikes: lightning and falling rocks ----
// While the squall bites, every `boltEvery` / `rockEvery` s a strike is
// marked (w.marks: { kind, x, y, r, at, t0 }) and lands `boltWarn` /
// `rockWarn` ms later. Never at the castle.
const NO_CLOSER = 40;     // px short of the wall's face
const strikes = (g, w, def, tms, kind) => {
  const every = kind === "bolt" ? def.boltEvery : def.rockEvery;
  if (w.clock < (w.strikeAt ?? 0)) return;
  w.strikeAt = w.clock + roll(w, every);
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
  if (w.banks.length !== n || w.banksFor !== w.until) {
    w.banksFor = w.until;
    w.banks = Array.from({ length: n }, (_, i) => ({ d: TOTAL_LEN * ((i + 0.3 + w.rng() * 0.5) / n), r: def.bankR, x: 0, y: 0 }));
  }
  WX.mistStamp = tms;
  for (const b of w.banks) {
    b.d = (b.d + def.drift * sdt) % TOTAL_LEN;
    [b.x, b.y] = posAt(b.d);
    b.r = def.bankR;
  }
  for (const e of g.enemies) {
    if (e.dead) continue;
    for (const b of w.banks) {
      const dx = e.x - b.x, dy = (e.y - b.y) * 1.3;
      if (dx * dx + dy * dy <= b.r * b.r) { e.misted = tms; break; }
    }
  }
};

// ---- the forecast (the wave preview, ui/WeatherForecast.jsx) ----
// What weather wave `n` will bring, or null for a clear wave:
//   { kind, text, sure }
// Fog is exact: it reads the same per-wave roll tickWeather makes. A timed
// kind (storm, mist, blizzard, eruption) is `sure` when its next spell rises
// before the wave's last foe is out of the wood (the wave certainly lasts
// that long), and "likely" (sure: false) when it would rise within the time
// a foe takes to walk the road after that (likelyAfter); otherwise nothing.
export const FORECAST = { fog: "Morning fog", storm: "Storm rolling in", gravemist: "Grave mist", blizzard: "Blizzard", eruption: "Eruptions" };
const LIKELY = { fog: "Fog likely", storm: "Storm likely", gravemist: "Grave mist likely", blizzard: "Blizzard likely", eruption: "Eruptions likely" };
// the last foe out of the wood still has the road to walk (~55 px/s)
const likelyAfter = () => Math.max(20, TOTAL_LEN / 55);
export const foggyWave = (def, n) => mulberry32((REALM.seed || 1) * 7 + n * 7919)() < def.chance;
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
  const now = n === g.wave && g.phase === "combat";
  if (def.rhythm === "wave") return foggyWave(def, n) ? { kind: def.kind, text: FORECAST[def.kind] || def.name, sure: true } : null;
  const w = g.weather;
  if (now && w && (w.bite || w.phase === "rising")) return { kind: def.kind, text: FORECAST[def.kind] || def.name, sure: true };
  const clock = w ? w.clock : 0, rise = (w ? w.next : def.first) - def.windup;
  const left = spawnSpan(n) - (now ? (g.spawnTimer || 0) / 1000 : 0);
  if (rise <= clock + Math.max(0, left)) return { kind: def.kind, text: FORECAST[def.kind] || def.name, sure: true };
  if (rise <= clock + Math.max(0, left) + likelyAfter()) return { kind: def.kind, text: LIKELY[def.kind] || def.name, sure: false };
  return null;
};
