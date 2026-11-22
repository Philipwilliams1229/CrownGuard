// ============ GAME PREFERENCES ============
// What the player can switch about the look of a battle (the Settings
// window's Display tab), kept in localStorage. Sound has its own store
// (audio/settings.js).
//
//   shake   the board shakes on big hits (draw.js), and the castle chip
//           shakes when a foe gets through (hud.css .cg-hurt)
//   floats  the floating numbers: the board's coin pops and wall leaks
//           (draw.js), and the sums that float off the gold and castle chips
//           (hud.css .cg-float)
//
//   newSprites  always true now (owner, 2026-11-15: the switch is gone from
//           Settings; a saved false is ignored). The old painters behind it are
//           still in the code, unused, for a later cleanup.
//   spellLight  spells and fires light the redrawn figures near them (one
//           more stamp per lit figure; off for a device that struggles)
//
// The HUD half works through two flags on <html> (data-no-shake,
// data-no-floats) that hud.css reads, so no component needs to know.

const KEY = "crownguard.prefs.v1";
//   fps      how many times a second the battle is drawn: one of FPS_CHOICES (the main
//            loop's pacing in CrownguardGame.jsx; the game's speed is the same at each).
//            An old save's `saver: true` (the 30 switch it replaced) loads as 30.
//   showFps  the small green frame counter in the screen's upper right corner
//            60 is normal, 30 is the Power saver switch (owner, 2026-11-22: a 24 was tried for an
//            afternoon and dropped; a saved 24 loads as 30).
export const FPS_CHOICES = [30, 60];
const DEFAULTS = { shake: true, floats: true, newSprites: true, spellLight: true, showFps: true, fps: 60 };

function load() {
  try {
    const raw = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "{}");
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (typeof DEFAULTS[k] === "boolean" && typeof raw[k] === "boolean") out[k] = raw[k];
    if (FPS_CHOICES.includes(raw.fps)) out.fps = raw.fps; else if (raw.saver === true || raw.fps === 24) out.fps = 30;
    out.newSprites = true;
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export const prefs = load();
const listeners = new Set();

function apply() {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.toggleAttribute("data-no-shake", !prefs.shake);
  el.toggleAttribute("data-no-floats", !prefs.floats);
}
apply();

export function setPrefs(patch) {
  Object.assign(prefs, patch);
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode: fine */ }
  apply();
  for (const fn of listeners) fn(prefs);
}

// subscribe(fn) -> unsubscribe
export function onPrefs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
