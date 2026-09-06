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
const absWave = (w) => (WINDOW ? Math.round(WINDOW.from + (WINDOW.to - WINDOW.from) * (w - 1) / Math.max(1, WINDOW.count - 1)) : w);

// How long the marching army's scripted campaign runs before the Endless
// March takes over. A call, not a constant, because the answer changes with
// the faction — and with the level.
export const scriptedWaves = () => (WINDOW ? WINDOW.count : FACTION.waves.length);

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
  // a campaign level's generated tail is a campaign wave, not the Endless
  // March: it grows with the war, but it is meant to be held
  if (WINDOW) budget = 70 + past * 11 + past * past * 0.25;
  const spec = [];
  // the endless march brings its champion every fifth wave; a campaign
  // level's boss is placed by waveSpec instead
  if (!WINDOW && w % 5 === 0) {
    spec.push([FACTION.endlessBoss, 1 + Math.floor(past / 10), 2600]);
    budget *= 0.55;
  }
  const picks = 2 + Math.floor(rand() * 3);
  const pool = [...FACTION.roster];
  for (let i = 0; i < picks && budget > 0 && pool.length; i++) {
    const grp = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const share = i === picks - 1 ? budget : budget * (0.3 + rand() * 0.4);
    let count = Math.max(1, Math.round(share / grp.cost));
    if (grp.cap) count = Math.min(count, grp.cap + Math.floor(past / 10));
    count = Math.min(count, 32);
    budget -= count * grp.cost;
    // spawn gaps tighten as the march deepens, but never into a solid wall
    const gap = Math.max(240, Math.round(grp.gap * (1 - Math.min(0.45, past * 0.015))));
    spec.push([grp.type, count, gap]);
  }
  return spec;
}

const BOSSES = new Set(["dragon", "marshal", "hollowking"]);

// The single source of truth for "what does wave w hold?"
// Free Play: the faction's script, then the Endless March.
// A campaign level: its slice of the script — a level that runs past the
// script's end continues into generated war-waves — with the faction's boss
// held back for the LAST wave of a level that is flagged to have one (the
// chapter's final level), and stripped from anywhere else.
export const waveSpec = (w) => {
  const a = absWave(w);
  const scripted = a <= FACTION.waves.length;
  if (!WINDOW) return w <= scriptedWaves() ? FACTION.waves[a - 1] : genWave(w);
  let spec = scripted ? FACTION.waves[a - 1] : genWave(w);
  spec = spec.filter(([type]) => !BOSSES.has(type));
  if (WINDOW.boss && w === WINDOW.count) spec = [...spec, [FACTION.endlessBoss, 1, 0]];
  return spec;
};

export const waveHpMult = (w) => {
  const a = absWave(w);
  const past = Math.max(0, a - FACTION.waves.length);
  // A campaign level climbs more gently than the Endless March: the march
  // is meant to end, a level is meant to be held.
  if (WINDOW) return 1 + (a - 1) * 0.08 + past * past * 0.004;
  // The march must end — but it was ending by arithmetic rather than by
  // anything the player could answer: at wave 85 the quadratic had outrun
  // every purse on the board. Eased so deep runs are decided by the board.
  return 1 + (a - 1) * 0.10 + past * past * 0.011;
};
// A cleared wave pays. A campaign wave pays less than an endless one: there
// are more of them, and the gold they leave behind is banked to the crown.
export const waveBonus = (w) => (WINDOW ? 30 + absWave(w) * 4 : 55 + absWave(w) * 9);
