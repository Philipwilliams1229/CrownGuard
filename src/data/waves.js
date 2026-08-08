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

// A campaign level plays a SLICE of its faction's script rather than all
// fifteen waves: `{ start, count }` means "waves start+1 .. start+count of the
// script, renumbered 1..count for the player". Free Play leaves this null and
// gets the full script plus the Endless March, exactly as before.
export let WINDOW = null;
export function setWaveWindow(w) { WINDOW = w; }

// Where wave `w` of this level sits in the faction's full fifteen. Used for
// difficulty scaling, so a level that opens at script wave 10 hits like it.
const absWave = (w) => (WINDOW ? WINDOW.start + w : w);

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
  const rand = mulberry32(w * 7919);
  const past = w - scriptedWaves();
  let budget = 78 + past * 16 + past * past * 0.7;
  const spec = [];
  if (w % 5 === 0) {
    spec.push([FACTION.endlessBoss, 1 + Math.floor(past / 10), 2600]);
    budget *= 0.55;
  }
  const picks = 2 + Math.floor(rand() * 3);
  const pool = [...FACTION.roster];
  for (let i = 0; i < picks && budget > 0 && pool.length; i++) {
    const grp = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const share = i === picks - 1 ? budget : budget * (0.3 + rand() * 0.4);
    let count = Math.max(1, Math.round(share / grp.cost));
    if (grp.cap) count = Math.min(count, grp.cap + Math.floor(past / 8));
    count = Math.min(count, 32);
    budget -= count * grp.cost;
    // spawn gaps tighten as the march deepens, but never into a solid wall
    const gap = Math.max(240, Math.round(grp.gap * (1 - Math.min(0.45, past * 0.015))));
    spec.push([grp.type, count, gap]);
  }
  return spec;
}

// The single source of truth for "what does wave w hold?"
export const waveSpec = (w) => (w <= scriptedWaves() ? FACTION.waves[absWave(w) - 1] : genWave(w));

export const waveHpMult = (w) => {
  const a = absWave(w);
  const past = Math.max(0, a - FACTION.waves.length);
  return 1 + (a - 1) * 0.10 + past * past * 0.013; // endless waves steepen
};
export const waveBonus = (w) => 55 + absWave(w) * 9;
