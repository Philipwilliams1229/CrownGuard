// ============ THE NATIVE APP'S GLUE ============
// The iOS app (Capacitor, see capacitor.config.ts and CLAUDE.md "The iOS
// app") runs this same bundle in a web view. Everything native the game asks
// for goes through here, so the web build stays the web build: on the web
// `native` is false and every call below does what a browser tab would.

import { Capacitor } from "@capacitor/core";

export const native = Capacitor.isNativePlatform();

// fn() whenever the player leaves the game: a hidden tab, the home screen,
// another app, and in the app also a call or Control Center pulled over it
// (the app goes inactive without the page being hidden). Returns an undo.
export function onAway(fn) {
  const vis = () => { if (document.hidden) fn(); };
  document.addEventListener("visibilitychange", vis);
  let sub = null, gone = false;
  if (native) {
    import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => { if (!isActive) fn(); }))
      .then((h) => { if (gone) h.remove(); else sub = h; })
      .catch(() => { /* no App plugin: the page's own event still works */ });
  }
  return () => { gone = true; document.removeEventListener("visibilitychange", vis); sub?.remove(); };
}
