// ============ SAVES ON A PHONE ============
// The game keeps everything in localStorage and reads it synchronously all
// over (campaign, profile, castle, settings: data/backup.js lists them). In
// the iOS app that storage lives in the web view's data, which iOS may clear
// when the phone runs low on space. So the app keeps a COPY of all of it in
// native Preferences (UserDefaults on iOS: never cleared, and in the phone's
// iCloud backup), refreshed a second after every change and whenever the
// player leaves the app, and puts it back at launch if the web view's
// storage was wiped.
//
// A wipe is told from "the player erased everything" by a stamp key: set at
// the first launch, never removed by the game, taken by a wipe with the rest.
// At launch: stamp there -> localStorage is the truth (the copy follows it);
// no stamp but a copy -> the copy is put back. Settings' Erase and Restore
// remove keys one by one and reload, so the stamp stands and nothing erased
// comes back.
//
// The web build never keeps a copy (keepSaves returns at once). main.jsx
// waits for keepSaves before it imports the game, since every store reads
// its key once, when its module loads.

import { native, onAway } from "./app.js";

export const STAMP = "cg-keep";              // not "crownguard.*": a save code never carries it
const COPY = "crownguard.copy";              // the Preferences key (its own store, not localStorage)
const WAIT = 1000;                           // ms after a change before the copy is refreshed
const READ_WAIT = 3000;                      // ms the launch waits for the copy at most

const allOf = (ls) => {
  const keys = {};
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k != null && k !== STAMP) keys[k] = ls.getItem(k);
  }
  return keys;
};

// The whole mechanism, on any Storage and any async { get, set } store, so a
// test can drive it (scripts/keep-test.mjs). Resolves once the save is in
// localStorage; returns { flush, stop }.
export async function startKeeping(store, ls, away = () => () => {}) {
  const proto = Object.getPrototypeOf(ls);
  const set = proto.setItem, remove = proto.removeItem, clear = proto.clear;
  if (ls.getItem(STAMP) == null) {
    let copy = null;
    // (a store that never answers must not hold the game's launch for ever)
    const late = new Promise((r) => setTimeout(() => r(null), READ_WAIT));
    try { copy = JSON.parse(await Promise.race([store.get(), late])); } catch { /* no copy, or a bad one */ }
    if (copy && copy.keys && typeof copy.keys === "object") {
      for (const [k, v] of Object.entries(copy.keys)) {
        if (typeof v === "string" && ls.getItem(k) == null) set.call(ls, k, v);
      }
    }
    set.call(ls, STAMP, String(Date.now()));
  }

  let last = null, timer = 0;
  const flush = () => {
    clearTimeout(timer);
    timer = 0;
    const body = JSON.stringify({ v: 1, keys: allOf(ls) });
    if (body === last) return Promise.resolve();
    last = body;
    return Promise.resolve().then(() => store.set(body)).catch(() => { last = null; });
  };
  const soon = () => { if (!timer) timer = setTimeout(flush, WAIT); };

  // every write the game makes goes through these three
  proto.setItem = function (k, v) { set.call(this, k, v); if (this === ls) soon(); };
  proto.removeItem = function (k) { remove.call(this, k); if (this === ls) soon(); };
  proto.clear = function () { clear.call(this); if (this === ls) { set.call(ls, STAMP, String(Date.now())); soon(); } };
  const undoAway = away(flush);

  flush();
  return {
    flush,
    stop() {
      clearTimeout(timer);
      undoAway();
      proto.setItem = set;
      proto.removeItem = remove;
      proto.clear = clear;
    },
  };
}

export async function keepSaves() {
  if (!native) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const store = {
      get: () => Preferences.get({ key: COPY }).then((r) => r.value),
      set: (value) => Preferences.set({ key: COPY, value }),
    };
    await startKeeping(store, window.localStorage, onAway);
  } catch (e) {
    console.warn("keepSaves: the save copy is off", e);   // the game still runs on localStorage
  }
}
