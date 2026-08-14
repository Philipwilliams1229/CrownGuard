// ============ THE PROFILE ============
// Everything that outlives a single battle: all-time tallies, commander XP,
// the stars earned per level, and which permanent skill nodes have been
// bought. One record in localStorage, separate from campaign progress
// (campaign.js) so wiping a campaign doesn't cost you your skill tree.
//
// PERK_MODS is a live binding the engine reads every frame — it is
// recomputed only when a node is bought, never per-tower-per-frame.

import { SKILLS, foldMods, spentOn, nextCost, nodeUnlocked, isMaxed } from "./skills.js";

const KEY = "crownguard.profile.v1";

const EMPTY = () => ({
  xp: 0,
  starsSpent: 0,
  // best star rating per level id — stars are awarded on the DELTA, so
  // replaying a level can only ever top up a worse result
  stars: {},
  // { towerKind: { nodeId: rank } } — rank 1..3, missing means untouched
  perks: {},
  // { towerKind: { branch, rank4: { a: "aa", b: "bb" } } } — the paths the
  // player last chose by hand; Master Builds replay them in one click
  favored: {},
  stats: {
    levelsCleared: 0,   // clears, including repeats
    levelsLost: 0,
    wavesCleared: 0,
    kills: 0,
    goldEarned: 0,
    towersBuilt: 0,
    leaks: 0,           // enemies that reached the castle
    perfect: 0,         // levels finished on a full castle
  },
});

export function loadProfile() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const p = EMPTY();
    const out = {
      ...p, ...raw,
      stars: raw.stars && typeof raw.stars === "object" ? raw.stars : {},
      perks: raw.perks && typeof raw.perks === "object" ? raw.perks : {},
      favored: raw.favored && typeof raw.favored === "object" ? raw.favored : {},
      stats: { ...p.stats, ...(raw.stats || {}) },
    };
    // Skills used to be a flat list of bought nodes; they are ranked now.
    // Rather than guess what an old list is worth, hand every star back and
    // let the player re-spend them on the new trees.
    if (Object.values(out.perks).some((v) => Array.isArray(v))) {
      out.perks = {};
      out.starsSpent = 0;
    }
    return out;
  } catch {
    return EMPTY();
  }
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode — play on */ }
  recomputePerks(p);
  return p;
}

export function resetProfile() {
  return saveProfile(EMPTY());
}

// Remember a path the player chose by hand, so Master Builds can replay it.
// pick is { branch } or { rank4: { [branch]: key } }. Written straight to
// storage, NOT via saveProfile: favored paths can't change perks, and the
// headless sim injects veterancy into PERK_MODS that a recompute from an
// empty polyfilled store would wipe mid-battle.
export function recordFavored(kind, pick) {
  const p = loadProfile();
  const f = p.favored[kind] || (p.favored[kind] = {});
  if (pick.branch) f.branch = pick.branch;
  if (pick.rank4) f.rank4 = { ...(f.rank4 || {}), ...pick.rank4 };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode — play on */ }
}

export const favoredFor = (kind) => loadProfile().favored[kind] || {};

// ---- stars ----

export const starsEarned = (p) => Object.values(p.stars).reduce((a, b) => a + b, 0);
export const starsFree = (p) => starsEarned(p) - p.starsSpent;

// How well a level was held: a full castle is three stars, a bloody win is one.
export const ratingFor = (livesLeft, maxLives) => {
  const frac = livesLeft / maxLives;
  return frac >= 0.99 ? 3 : frac >= 0.6 ? 2 : 1;
};

// ---- commander rank ----
// Flat 1000 XP a rank. The title is flavour; the number is the brag.

export const RANKS = [
  "Recruit", "Squire", "Serjeant", "Captain", "Banneret",
  "Castellan", "Marshal", "Warden of the Realm",
];
export const rankOf = (xp) => Math.floor(xp / 1000);
export const rankName = (xp) => RANKS[Math.min(rankOf(xp), RANKS.length - 1)];
export const rankProgress = (xp) => (xp % 1000) / 1000;

// XP for finishing a level: the waves you held, weighted by how deep in the
// war it sits, plus a bonus for the stars you took.
export const xpFor = (level, waves, stars) =>
  Math.round(waves * 40 * (1 + level.chapterIndex * 0.5 + level.index * 0.15)) + stars * 60;

// ---- banking a finished level ----
// Returns { stars, newStars, xp, rating } so the victory screen can show what
// was just won. `run` is the g.run counter block from the engine.

export function bankLevel(p, level, { livesLeft, maxLives, waves, run, won }) {
  const s = p.stats;
  s.wavesCleared += waves;
  if (run) {
    s.kills += run.kills || 0;
    s.goldEarned += Math.round(run.goldEarned || 0);
    s.towersBuilt += run.towersBuilt || 0;
    s.leaks += run.leaks || 0;
  }
  if (!won) {
    s.levelsLost += 1;
    saveProfile(p);
    return { stars: 0, newStars: 0, xp: 0, rating: 0 };
  }
  s.levelsCleared += 1;
  if (livesLeft >= maxLives) s.perfect += 1;

  const rating = ratingFor(livesLeft, maxLives);
  const had = p.stars[level.id] || 0;
  const newStars = Math.max(0, rating - had);
  p.stars[level.id] = Math.max(had, rating);

  const xp = xpFor(level, waves, rating);
  p.xp += xp;
  saveProfile(p);
  return { stars: rating, newStars, xp, rating };
}

// A Free Play run banks its tallies too — the record is of everything you've
// fought, not just the campaign — but no stars and no XP, since there is no
// level to rate.
export function bankFreeRun(p, { waves, run }) {
  const s = p.stats;
  s.wavesCleared += Math.max(0, waves);
  if (run) {
    s.kills += run.kills || 0;
    s.goldEarned += Math.round(run.goldEarned || 0);
    s.towersBuilt += run.towersBuilt || 0;
    s.leaks += run.leaks || 0;
  }
  return saveProfile(p);
}

// ---- buying a skill node ----

// Take one node up one rank. Refuses if it's already at rank 3, if the node
// above it isn't fully ranked, or if the stars aren't there.
export function buyRank(p, kind, node) {
  const owned = p.perks[kind] || {};
  if (isMaxed(owned, node.id)) return p;
  if (!nodeUnlocked(node, owned)) return p;
  const cost = nextCost(owned, node);
  if (cost == null || starsFree(p) < cost) return p;
  p.perks = { ...p.perks, [kind]: { ...owned, [node.id]: (owned[node.id] || 0) + 1 } };
  p.starsSpent += cost;
  return saveProfile(p);
}

// Refund every rank of one tower — cheap insurance while the trees are still
// being tuned, and the player can re-spec without losing progress.
export function refundTower(p, kind) {
  const back = spentOn(kind, p.perks[kind] || {});
  if (!back) return p;
  p.perks = { ...p.perks, [kind]: {} };
  p.starsSpent = Math.max(0, p.starsSpent - back);
  return saveProfile(p);
}

// ---- what the engine reads ----
// { archer: { dmg: 1.16, rate: 0.92 }, ... } — empty unless nodes are owned.

export let PERK_MODS = {};

export function recomputePerks(p) {
  const out = {};
  for (const kind of Object.keys(SKILLS)) {
    const mods = foldMods(kind, p.perks[kind] || {});
    if (Object.keys(mods).length) out[kind] = mods;
  }
  PERK_MODS = out;
  return PERK_MODS;
}

// Prime the live binding at import time so a battle started straight from a
// reload already fights with the player's permanent upgrades.
recomputePerks(loadProfile());
