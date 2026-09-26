// ============ THE SANDBOX'S HANDS ON A LIVE RUN ============
// What the in-battle sandbox panel (ui/SandboxPanel.jsx) can do to the
// field: call up any foe on the spot, sweep the road, hand out gold, and
// skip the war ahead. Only offered in a sandbox run; nothing here pays
// bounty or counts toward the profile.

import { spawnAt } from "./update.js";
import { waveHpMult } from "../data/waves.js";
import { ENEMIES } from "../data/enemies.js";
import { TOTAL_LEN } from "./path.js";

// `n` foes of `type` at the road's mouth (or `at`, a fraction of the road),
// at the current wave's health. They pay no bounty.
export const sandboxSpawn = (g, type, n = 1, at = 0) => {
  if (!g || !ENEMIES[type]) return 0;
  const mult = waveHpMult(Math.max(1, g.wave || 1));
  const tms = g.time * 1000;
  for (let i = 0; i < n; i++) {
    const u = spawnAt(g, type, mult, at * TOTAL_LEN - i * 14, tms);
    u.bounty = 0;
    u.summoned = true;
  }
  // foes on the road during a build phase start the fight
  if (g.phase === "build") { g.phase = "combat"; g.buildUntil = null; }
  return n;
};

// Sweep every foe off the road (no bounty) and empty the spawn queue.
export const sandboxClear = (g) => {
  if (!g) return;
  for (const e of g.enemies) e.dead = true;
  g.enemies = [];
  g.spawnQueue = [];
};

export const sandboxGold = (g, amount) => { if (g) g.gold = Math.max(0, Math.floor(g.gold + amount)); };
export const sandboxLives = (g, amount) => { if (g) g.lives = Math.max(1, Math.floor(g.lives + amount)); };

// Jump the war to wave `w` (the next horn sounds wave w). Only between waves.
export const sandboxSkipTo = (g, w) => {
  if (!g || g.phase !== "build") return false;
  g.wave = Math.max(0, Math.floor(w) - 1);
  return true;
};
