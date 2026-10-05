// ============ TOWER XP ============
// Every hall TYPE keeps its own experience, earned by using it. The first
// three levels of any hall are open to everyone; the PATHS (tier 4) and the
// FINAL forms (tier 5) are earned: a hall type that has fought enough gives
// up its later upgrades, on every map from then on.
//
// What earns XP (all of it filed under the hall's kind, so selling a hall or
// raising ten of them never loses or multiplies it by itself):
//   - a kill the hall makes: 1 XP + a tenth of the foe's bounty (xpForKill)
//   - the Warden Mage, which kills little itself: a quarter of that for
//     every foe that dies inside its aura (once a kill, however many Mages
//     stand)
//   - the Gold Works: 0.3 XP for every gold of wage it pays
//   - DUTY_XP for every wave cleared with at least one of the kind standing,
//     so a hall that holds the line without a kill of its own still learns
//
// The ledger for the battle in hand is `g.towerXp` (kept with the retry-wave
// snapshot); it is banked into the profile (`profile.towerXp`, one record
// for the whole save, travelling in the save code) when the battle ends,
// win or lose, but while it runs the gate reads banked + ledger, so a hall
// can ripen mid-battle. Free Play (the sandbox) opens every tier and earns
// nothing, and so does the Endless March after a level is won (`g.victory`; a
// campaign level's own waves are what teach); UNLOCK_ALL (campaign.js) opens everything for testing.
//
// Numbers are PROVISIONAL, pending the owner's playtest: see CLAUDE.md.

import { SANDBOX } from "./sandbox.js";
import { TOWERS } from "./towers.js";
import { UNLOCK_ALL } from "./campaign.js";
import { bankedTowerXp, TIER_XP } from "./profile.js";

export { TIER_XP };

// TIER_XP (profile.js, re-exported above): the XP a hall type needs before
// tier 4 (the two paths) and tier 5 (the four finals) may be bought. Tiers
// 1-3 (the base hall and its two levels) never ask for any.
export const DUTY_XP = 6;
export const ASSIST_SHARE = 0.25;    // the Warden Mage's share of a kill's XP
export const WAGE_SHARE = 0.3;       // the Gold Works' XP per gold of wage
// A kill is worth 1 XP and a tenth of the foe's bounty on top, so a troll or
// a champion teaches more than a goblin, but a swarm does not drown the rest.
export const xpForKill = (bounty) => 1 + Math.max(0, bounty || 0) * 0.1;

// the headless sims switch the gate off (they model a veteran's build orders)
export const XP_RULES = { gate: true };

export const gateOn = (g) => XP_RULES.gate && !SANDBOX && !UNLOCK_ALL && !g?.freeplay;

// XP a hall type has: banked in the profile plus what this battle has added
export const towerXpOf = (kind, g) => bankedTowerXp(kind) + Math.floor(g?.towerXp?.[kind] || 0);

// Is `tier` (4 paths, 5 finals) open to this hall type? { open, need, have }
export const tierGate = (kind, tier, g) => {
  if (tier < 4 || !gateOn(g)) return { open: true, need: 0, have: 0 };
  const need = TIER_XP[tier] || 0;
  const have = towerXpOf(kind, g);
  return { open: have >= need, need, have };
};

// Add to this battle's ledger. A no-op in the sandbox (and a freeplay game).
export const addTowerXp = (g, kind, n) => {
  if (!g || SANDBOX || g.freeplay || g.victory || !(n > 0) || !TOWERS[kind]) return;   // no XP in Free Play or the Endless March
  const led = g.towerXp || (g.towerXp = {});
  led[kind] = (led[kind] || 0) + n;
};
