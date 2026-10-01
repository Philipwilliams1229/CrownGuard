// ============ SOUND SETTINGS ============
// One small store for everything the player can set about sound, kept in
// localStorage. sfx.js (effects) and music.js (the score) both read it, and
// the pause menu writes it. Old saves ({ muted, vol }) load unchanged: `vol`
// is still the effects volume.
//
//   muted     everything off (the old Sound button)
//   vol       effects volume 0..1
//   musicVol  music volume 0..1
//   music     the score on/off, on its own
//   off       effects switched off one by one: { coin: true, ... }

const KEY = "crownguard.sound.v1";

// Menu switches: a label, and the effect names it silences.
export const SFX_GROUPS = [
  { id: "coin",   label: "Gold plink",        names: ["coin", "payout"] },
  { id: "arrows", label: "Arrows & bolts",    names: ["arrow", "bolt", "enemyBolt"] },
  { id: "hits",   label: "Blows & clanks",    names: ["hit", "crunch", "clink", "tink", "spike", "stab"] },
];

const DEFAULTS = { muted: false, vol: 0.5, musicVol: 0.5, music: true, off: {} };

function load() {
  try {
    const raw = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "{}");
    const num = (v, d) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);
    return {
      muted: !!raw.muted,
      vol: num(raw.vol, DEFAULTS.vol),
      musicVol: num(raw.musicVol, DEFAULTS.musicVol),
      music: raw.music === undefined ? true : !!raw.music,
      off: raw.off && typeof raw.off === "object" ? { ...raw.off } : {},
    };
  } catch {
    return { ...DEFAULTS, off: {} };
  }
}

export const settings = load();
const listeners = new Set();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: fine */ }
  for (const fn of listeners) fn(settings);
}

// subscribe(fn) -> unsubscribe
export function onSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Is a named effect switched off by one of the menu groups?
export function effectOff(name) {
  for (const g of SFX_GROUPS) if (settings.off[g.id] && g.names.includes(name)) return true;
  return false;
}
