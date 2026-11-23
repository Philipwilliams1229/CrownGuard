// A campaign battle kept between waves (owner, 2026-11-20: "if I close the
// game at wave 16, when I continue all my towers are where I had them, gold
// was the same at the beginning of the wave, and wave 16 was up next").
//
// ONE record on the device: the last unfinished campaign battle. It holds the
// engine's between-waves snapshot (actions.js takeSnapshot: towers, gold,
// lives, hero, barricades, cooldowns, the halls' unbanked XP ledger) plus the
// run's tallies and the weather's clock. It is written by CrownguardGame.jsx
//   - at every horn (the wave's own retry snapshot: the wave as it began),
//   - when a wave is cleared (the build phase that follows),
//   - when the game is hidden or the battle is left during a build phase
//     (so halls bought between waves are kept),
// and cleared when the level is won, lost, or started over. Mid-wave, the
// record is the wave's start, so a closed game replays that wave.
// The key sits under `crownguard.`, so it travels in the save code
// (data/backup.js) and in the iOS app's native mirror (native/keep.js).
//
// The board's LAYOUT (2026-11-22, the overhaul): a realm may carry `layout` (a number, default 0),
// bumped whenever where halls may stand changes (its `blocks`, its scenery). The record keeps the
// layout it was written on; one written on another layout is dropped at load, so a hall kept from
// before can never come back standing inside new no-build ground. (Both lookups run only inside
// these functions: campaign.js imports this file, so nothing here may touch it at module load.)
import { levelById } from "./campaign.js";
import { REALMS } from "./maps.js";
const KEY = "crownguard.checkpoint.v1";
const layoutOf = (levelId) => {
  const lv = levelById(levelId), r = lv && REALMS[lv.realm];
  return (r && r.layout) || 0;
};

export function loadCheckpoint() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!(c && c.levelId && c.snap && Array.isArray(c.snap.towers))) return null;
    if ((c.layout || 0) !== layoutOf(c.levelId)) { clearCheckpoint(); return null; }
    return c;
  } catch { return null; }
}

export function saveCheckpoint(c) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...c, layout: layoutOf(c.levelId), savedAt: Date.now() })); } catch { /* private mode: play on */ }
}

export function clearCheckpoint() {
  try { localStorage.removeItem(KEY); } catch { /* nothing kept */ }
}
