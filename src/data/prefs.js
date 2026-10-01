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
// The HUD half works through two flags on <html> (data-no-shake,
// data-no-floats) that hud.css reads, so no component needs to know.

const KEY = "crownguard.prefs.v1";
const DEFAULTS = { shake: true, floats: true };

function load() {
  try {
    const raw = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "{}");
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (typeof raw[k] === "boolean") out[k] = raw[k];
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
