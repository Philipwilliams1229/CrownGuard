// The crash recorder (2026-11-18, after a phone crash mid-level that left no trace).
// Two things, kept in localStorage under cg-* keys (outside the crownguard.* save,
// so they never travel in a save code):
//   cg-crash  the last few errors: where (update / draw / window / promise / screen),
//             the message, a short stack, the build, and where the battle stood
//   cg-beat   a heartbeat the battle writes every ~10 s (level, wave, figure-bake
//             memory). A clean leave (page hidden or closed) removes it. If the next
//             launch still finds one, the page died without leaving: on a phone that
//             is almost always iOS killing it for memory, so that is logged too.
// Settings > Progress shows the log with a Copy button (crashReport()).
const LOG = "cg-crash", BEAT = "cg-beat", KEEP = 12;
const build = () => { try { return typeof __BUILD__ !== "undefined" ? __BUILD__.built ?? String(__BUILD__) : "dev"; } catch { return "?"; } };
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked: nothing to do */ } };

let where = null;            // the battle's last heartbeat, attached to errors
export const noteCrash = (kind, err, extra) => {
  const list = read(LOG) || [];
  list.push({
    at: new Date().toISOString(), build: build(), kind,
    msg: String(err?.message ?? err).slice(0, 300),
    stack: String(err?.stack || "").split("\n").slice(0, 6).join("\n").slice(0, 900),
    ...(where ? { battle: where } : {}), ...(extra || {}),
  });
  write(LOG, list.slice(-KEEP));
};

let lastBeat = 0;
// the game loop calls this every frame; it writes at most every 10 s
export const heartbeat = (now, info) => {
  if (now - lastBeat < 10000) return;
  lastBeat = now;
  where = info;
  const mem = typeof performance !== "undefined" && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : undefined;
  write(BEAT, { at: new Date().toISOString(), build: build(), ...info, ...(mem ? { heapMB: mem } : {}) });
};
// out of battle: no heartbeat (a page left on the title screen is not a crash)
export const quietBeat = () => { if (where) { where = null; lastBeat = 0; try { localStorage.removeItem(BEAT); } catch { /* */ } } };

export const crashReport = () => {
  const list = read(LOG) || [];
  if (!list.length) return "";
  return "CROWNGUARD-CRASH\n" + list.map((e) => JSON.stringify(e)).join("\n");
};
export const crashCount = () => (read(LOG) || []).length;
export const clearCrashes = () => { try { localStorage.removeItem(LOG); } catch { /* */ } };

// once, at launch
export const startCrashLog = () => {
  if (typeof window === "undefined") return;
  const beat = read(BEAT);
  if (beat) {
    noteCrash("unclean-exit", { message: "the page died mid-battle without closing (on a phone: most likely out of memory)" }, { lastBeat: beat });
    try { localStorage.removeItem(BEAT); } catch { /* */ }
  }
  window.addEventListener("error", (e) => noteCrash("window", e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => noteCrash("promise", e.reason));
  // leaving cleanly: the app put away, the tab hidden or closed. iOS may kill a page
  // in the background; that is not a crash while playing, so the beat goes first.
  const leave = () => { try { localStorage.removeItem(BEAT); } catch { /* */ } lastBeat = 0; };
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", () => { if (document.hidden) leave(); });
};
