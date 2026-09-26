// ============ WAVES ============
// The chosen faction's 15 scripted waves, then the ENDLESS MARCH:
// procedurally generated waves that scale forever. Each entry is
// [enemyType, count, gapMs between spawns]. Generation is seeded by wave
// number, so the preview, the actual spawns, and a restarted wave always
// agree. waveHpMult scales enemy HP up over time; waveBonus is the clear
// reward.
//
// Everything here reads from the live FACTION binding, so switching armies
// switches the whole campaign script with it.

import { FACTION } from "./factions.js";
import { SANDBOX } from "./sandbox.js";
import { ENEMIES } from "./enemies.js";

// A campaign level plays a stretch of its faction's WAR rather than the
// whole thing: `{ from, to, count }` means "count waves, climbing from war-
// wave `from` to war-wave `to`". The war is the eighteen scripted waves and
// then generated ones; a level's waves are sampled evenly along it, so a
// ten-wave opener climbs gently through the first eight war-waves and a
// twenty-five-wave finale marches from the seventh to the thirtieth. Free
// Play leaves this null and gets the full script plus the Endless March.
export let WINDOW = null;
export function setWaveWindow(w) { WINDOW = w; }

// Where wave `w` of this level sits in the war. Used for what marches and
// for how hard it hits.
const absWaveF = (w) => (WINDOW ? WINDOW.from + (WINDOW.to - WINDOW.from) * (w - 1) / Math.max(1, WINDOW.count - 1) : w);
const absWave = (w) => Math.round(absWaveF(w));

// How long the marching army's scripted campaign runs before the Endless
// March takes over. A call, not a constant, because the answer changes with
// the faction — and with the level.
export const scriptedWaves = () => (WINDOW ? WINDOW.count : FACTION.waves.length);
// The wave whose clearing wins the run: a level's last, Free Play's end of
// the script — or, in the sandbox, the cap the player set (0 = never).
export const victoryWave = () => (SANDBOX && !WINDOW ? SANDBOX.waves || Infinity : scriptedWaves());

// tiny deterministic RNG (mulberry32) — seeded by wave number so every
// glimpse of a future wave shows the truth
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Waves past the scripted 18: a growing point budget spent on 2-4 warband
// groups, with the faction's champion leading every 5th wave. The budget grew
// when the scripts did — the Endless March should never feel thinner than the
// war that preceded it.
export function genWave(w) {
  // seeded by the ABSOLUTE wave, so a campaign level's twentieth wave and
  // the next level's fifteenth agree when they are the same wave of the war
  const a = absWave(w);
  const rand = mulberry32(a * 7919);
  const past = a - FACTION.waves.length;
  let budget = 78 + past * 16 + past * past * 0.7;
  // an army with no script at all (the sandbox can strike it out) starts
  // generating from the first wave, so it ramps from a first wave's size
  if (!FACTION.waves.length) budget = 12 + a * 5 + a * a * 0.15;
  // a campaign level's generated tail is a campaign wave, not the Endless
  // March: it grows with the war, but it is meant to be held
  // (the crowd swells these counts again on top, so the budget stays lean)
  if (WINDOW) budget = 60 + past * 10 + past * past * 0.3;
  const spec = [];
  // the endless march brings its champion every fifth wave; a campaign
  // level's boss is placed by waveSpec instead
  // (the sandbox sets its own rhythm, and may rotate several champions or
  // have none at all)
  const every = FACTION.bossEvery || 5;
  if (!WINDOW && FACTION.endlessBoss && w % every === 0) {
    const bosses = FACTION.bosses?.length ? FACTION.bosses : [FACTION.endlessBoss];
    spec.push([bosses[Math.floor(w / every) % bosses.length], 1 + Math.floor(Math.max(0, past) / 10), 2600]);
    budget *= 0.55;
  }
  const picks = 2 + Math.floor(rand() * 3);
  const pool = [...FACTION.roster];
  // a campaign wave always carries a body of rank and file — the war never
  // sends a handful of trolls on their own and calls it a wave
  const chaff = WINDOW ? pool.filter((r) => r.cost <= 1.6) : [];
  for (let i = 0; i < picks && budget > 0 && pool.length; i++) {
    const grp = i === 0 && chaff.length
      ? pool.splice(pool.indexOf(chaff[Math.floor(rand() * chaff.length)]), 1)[0]
      : pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const share = i === picks - 1 ? budget : budget * (0.3 + rand() * 0.4);
    let count = Math.max(1, Math.round(share / grp.cost));
    if (grp.cap) count = Math.min(count, grp.cap + Math.floor(past / 10));
    count = Math.min(count, WINDOW ? 50 : 32);
    budget -= count * grp.cost;
    // spawn gaps tighten as the march deepens, but never into a solid wall
    const gap = Math.max(240, Math.round(grp.gap * (1 - Math.min(0.45, past * 0.015))));
    spec.push([grp.type, count, gap]);
  }
  return spec;
}

const BOSSES = new Set(["dragon", "marshal", "hollowking"]);
const ENEMY_BOSS = (t) => !!ENEMIES[t]?.boss;

// ---- THE CROWD ----
// Past the opening waves the war gets bigger, not just tougher: every wave
// brings MORE of its rank and file, packed tighter on the road — the Bloons
// feeling of a screen filling up. `crowd(a)` is the swell at war-wave `a`;
// each type feels it by its WEIGHT (chaff swarms, brutes thicken a little,
// captains and bosses never multiply). A swollen group pays less a head, so
// the purse grows far slower than the horde does: more to kill, not more to
// spend.
export const CROWD_WEIGHT = {
  goblin: 1, bat: 0.8, wolf: 0.9, orc: 0.6, boarrider: 0.5, armored: 0.45, rafter: 0.6,
  shaman: 0.1, troll: 0.1, hobgoblin: 0, necro: 0,
  levy: 1, crossbow: 0.7, sergeant: 0.45, cavalier: 0.4, gryphon: 0.35, chaplain: 0.15, ram: 0.1,
  skeleton: 1, ghoul: 0.9, bonearcher: 0.7, wraith: 0.5, ghast: 0.4, crypt: 0.35, gravecaller: 0.1, amalgam: 0.2,
};
// A faction may swell less (`crowdScale` in factions.js): the Greenwood is
// a horde and swells fully; the Iron Kingdom and the Hollow Court both swell
// at 0.6 (tuned with the sims so each chapter bleeds about as much
// as the Greenwood does at the same depth).
// Capped at 6x: deep in the Endless March a group of 32 already becomes ~190,
// and the road (and an iPad) has only so much room.
export const crowd = (a) => Math.min(6, 1 + Math.max(0, a - 3) * 0.12 * (FACTION.crowdScale ?? 1));
const swell = (spec, a, warm = 1) => spec.map(([type, count, gap]) => {
  const k = 1 + (crowd(a) - 1) * warm * (CROWD_WEIGHT[type] ?? 0);   // a may be fractional
  if (k <= 1.001 || BOSSES.has(type)) return [type, count, gap, 1];
  const n = Math.round(count * k);
  // the stream tightens as it thickens, so a wave runs longer but not
  // proportionally longer — and never into a solid wall
  const g2 = Math.max(90, Math.round(gap / Math.pow(k, 0.9)));
  // pay per head falls almost as fast as the heads multiply
  return [type, n, g2, Math.pow(count / n, 1)];
});

// The single source of truth for "what does wave w hold?"
// Free Play: the faction's script, then the Endless March.
// A campaign level: its slice of the script — a level that runs past the
// script's end continues into generated war-waves — with the faction's boss
// held back for the LAST wave of a level that is flagged to have one (the
// chapter's final level), and stripped from anywhere else.
// Each entry comes back as [type, count, gapMs, payMul].
export const waveSpec = (w) => {
  const a = absWave(w);
  const scripted = a <= FACTION.waves.length;
  if (!WINDOW) {
    const sp = swell(w <= scriptedWaves() ? FACTION.waves[a - 1] : genWave(w), a);
    sp.overlap = overlap(a);
    return SANDBOX ? sandboxShape(sp) : sp;
  }
  // two waves of a level can land on the same war-wave; the later one comes
  // thicker, because the crowd reads the level's true (fractional) position
  let spec = scripted ? FACTION.waves[a - 1] : genWave(w);
  spec = spec.filter(([type]) => !BOSSES.has(type));
  // every level opens on its own ground: the swell comes in over its first
  // few waves, so a fresh purse never meets a full-grown horde on wave one
  spec = swell(spec, absWaveF(w), Math.min(1, 0.35 + 0.13 * (w - 1)));
  if (WINDOW.boss && w === WINDOW.count) spec = [...spec, [FACTION.endlessBoss, 1, 0, 1]];
  spec.overlap = overlap(a);
  return spec;
};

// The sandbox's hand on a wave: more or fewer heads per group, packed
// tighter or looser. Champions never multiply. A group that rounds to zero
// keeps one head, so a wave is never empty.
const sandboxShape = (sp) => {
  const out = sp.map(([type, count, gap, pay = 1]) => {
    if (BOSSES.has(type) || ENEMY_BOSS(type)) return [type, count, Math.round(gap * SANDBOX.gapMul), pay];
    const n = Math.max(1, Math.round(count * SANDBOX.countMul));
    return [type, n, Math.max(60, Math.round(gap * SANDBOX.gapMul)), pay];
  });
  // an army of champions only still has to send something on the off-beats
  if (!out.length && FACTION.bosses?.length) out.push([FACTION.bosses[0], 1, 0, 1]);
  out.overlap = sp.overlap;
  return out;
};

// How far a wave's groups march side by side instead of one after another:
// 0 = each group waits for the last to finish (the teaching waves), 0.5 =
// the next group sets out when the last is only halfway out of the wood. Deep
// in the war the whole warband comes down the road at once.
export const overlap = (a) => Math.max(0, Math.min(0.5, (a - 5) / 14));

export const waveHpMult = (w) => (SANDBOX && !WINDOW ? SANDBOX.hpMul : 1) * baseHpMult(w);
const baseHpMult = (w) => {
  const a = absWave(w);
  const past = Math.max(0, a - FACTION.waves.length);
  // A campaign level climbs more gently than the Endless March: the march
  // is meant to end, a level is meant to be held.
  // The horde grows by NUMBERS more than by hide (see the crowd, above).
  if (WINDOW) return 1 + (a - 1) * 0.06 + past * past * 0.006;
  // The march must end — but it was ending by arithmetic rather than by
  // anything the player could answer: at wave 85 the quadratic had outrun
  // every purse on the board. Eased so deep runs are decided by the board.
  return 1 + (a - 1) * 0.10 + past * past * 0.011;
};
// A cleared wave pays. A campaign wave pays less than an endless one: there
// are more of them, and the gold they leave behind is banked to the crown.
// (the endless bonus stops climbing at wave 60: 595 a wave from there on)
export const waveBonus = (w) => (WINDOW ? 24 + absWave(w) * 3 : Math.round((SANDBOX ? SANDBOX.waveBonusMul : 1) * (55 + Math.min(60, absWave(w)) * 9)));
