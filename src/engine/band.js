// ============ THE KING'S BAND (owner, 2026-11-18) ============
// A hall that never fights: every hall it plays for works to its beat.
// Design and the owner's calls: art/briefs/kings-band.md.
//
//   tempo  attack speed: every clock key below runs (1 + tempo) times as fast
//   reach  every reach key x (1 + reach) (a whole-map reach stays whole-map)
//   might  every damage / payout / mending key x (1 + might)
//   swell  every blast-size key x (1 + swell) (Thunder Drums only)
//
// Path A (the Drum Corps) plays for EVERY hall whose anchor is inside its ring.
// Path B (the King's Heralds) plays only for the `picks` halls the player taps
// (`t.solo`, a list of hall ids; the nearest are taken until he does).
//
// Two bands never add up: each hall keeps the biggest of each number any band
// gives it (the house rule for auras). A band never plays for a band.
// `update.js` lays `t.tune` on every hall each tick (`layBands`); `getStatsClear`
// (engine/towers.js) applies it after the skill trees and before the weather,
// so the tray, the range rings and the sims all read the tuned numbers.
//
// WATCH LIST (owner: "dont leave out those towers ... mark them but include them
// for now"): these halls ARE played for, and are the first to watch in the
// playtest for being too strong when tuned.
export const BAND_WATCH = new Set(["goldworks", "trapsmith", "support", "roller"]);

export const BEAT_MS = 600;   // one beat; the figures play two to a bar (1200 ms)

// the stat keys each kind of buff touches
const TEMPO_KEYS = ["rate", "mRate", "bowRate", "chargeEvery", "novaEvery", "eagleRate", "poolEvery", "groundRate"];
const MIGHT_KEYS = ["dmg", "mDmg", "fragDmg", "bowDmg", "dps", "trapDmg", "logDmg", "logBlastDmg", "groundDmg", "eagleDmg", "income", "heal", "colddps", "nova", "poolDps"];
const REACH_KEYS = ["range", "mRange", "bowRange", "auraRange"];
const SWELL_KEYS = ["splash", "fragReach", "beamSplash", "poolR", "sporeR"];

// which watch-list group a hall falls in (the Log Roller is a catapult form)
export const watchKey = (t, st) => (st?.roller ? "roller" : t.kind);

// A hall's numbers with the band's tune on them (st is a fresh copy: getStatsClear's).
export const tuned = (st, t) => {
  const tu = t?.tune;
  if (!tu) return st;
  if (tu.tempo > 0) for (const k of TEMPO_KEYS) if (st[k] > 0) st[k] /= 1 + tu.tempo;
  if (tu.might > 0) for (const k of MIGHT_KEYS) if (st[k] > 0) st[k] *= 1 + tu.might;
  // a knight's "range" is the circle his men seize in, not a reach
  if (tu.reach > 0 && t.kind !== "knight") for (const k of REACH_KEYS) if (st[k] > 0 && st[k] < 900) st[k] *= 1 + tu.reach;
  if (tu.swell > 0) for (const k of SWELL_KEYS) if (st[k] > 0) st[k] *= 1 + tu.swell;
  st.tuned = tu;
  return st;
};

// Halls a band may play for: built, not a band, not sold.
const playable = (o) => o.kind !== "band";

// The Heralds' halls: the player's taps, kept while they stand in the ring;
// any empty place filled with the nearest hall in the ring.
export const soloOf = (band, st, towers) => {
  const inRing = (o) => playable(o) && Math.hypot(o.x - band.x, o.y - band.y) <= st.range;
  const ids = (band.solo || []).filter((id) => towers.some((o) => o.id === id && inRing(o))).slice(0, st.picks);
  if (ids.length < st.picks) {
    const near = towers.filter((o) => inRing(o) && !ids.includes(o.id))
      .sort((a, b) => Math.hypot(a.x - band.x, a.y - band.y) - Math.hypot(b.x - band.x, b.y - band.y));
    for (const o of near) { if (ids.length >= st.picks) break; ids.push(o.id); }
  }
  return ids;
};

// The player tapped a hall while choosing: make it one of the band's halls.
// Returns true if the tap landed on a hall the band can play for.
export const pickSolo = (band, st, hall) => {
  if (!hall || !playable(hall) || Math.hypot(hall.x - band.x, hall.y - band.y) > st.range) return false;
  const now = band.solo || [];
  if (now.includes(hall.id)) return true;
  // the newest pick pushes out the oldest
  band.solo = [...now, hall.id].slice(-st.picks);
  return true;
};

// Is the drum roll on right now? (Thunder Drums)
export const rolling = (band, st, tms) => !!st.roll && (band.rollUntil || 0) > tms;
