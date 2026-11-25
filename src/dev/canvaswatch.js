// ============ DEV ONLY: a self-running test of "the level after a won one is slow" ============
// (2026-11-25, owner: ~10 fps on the level after a won one on an iPhone; a restart fixes it.)
// Open the dev server with ?repro on the phone. This module notes every canvas the game makes (so the test can
// say how many are alive and how big), then shows a Start button; dev/repro.js plays the levels and posts
// its numbers to the dev server (POST /__perf, written to .shots/perf.jsonl on the Mac).
// Does nothing without ?repro (or VITE_REPRO=1), and nothing in a build unless it was made with VITE_REPRO=1.

export const WATCH = { on: false, made: 0, madeBytes: 0, freed: 0, refs: [] };

// (VITE_REPRO=1 on the dev server turns it on without the ?repro: a home-screen icon opens the bare address)
if ((import.meta.env.DEV || import.meta.env.VITE_REPRO) && typeof window !== "undefined" && (/[?&]repro/.test(window.location.search) || import.meta.env.VITE_REPRO)) {
  WATCH.on = true;
  const reg = typeof FinalizationRegistry !== "undefined" ? new FinalizationRegistry(() => { WATCH.freed++; }) : null;
  const note = (cv) => {
    WATCH.made++;
    if (typeof WeakRef !== "undefined") WATCH.refs.push(new WeakRef(cv));
    reg?.register(cv, 0);
    return cv;
  };
  const make = document.createElement.bind(document);
  document.createElement = function (tag, o) {
    const el = make(tag, o);
    if (typeof tag === "string" && tag.toLowerCase() === "canvas") note(el);
    return el;
  };
  if (typeof OffscreenCanvas !== "undefined") {
    const OC = OffscreenCanvas;
    // eslint-disable-next-line no-global-assign
    window.OffscreenCanvas = class extends OC { constructor(w, h) { super(w, h); note(this); } };
  }
  window.__cgWatch = WATCH;
  // the test's own imports wait until the game has booted (window.__cg), or they would load the engine's
  // modules out of their order (an import cycle there breaks at load)
  const start = () => { if (!window.__cg) { setTimeout(start, 250); return; } import("./repro.js").then((m) => m.showStart()).catch((e) => console.error("repro failed", e)); };
  start();
}

// the canvases still alive (not yet collected): how many, and their pixel memory in MB
export function canvasStats() {
  let n = 0, bytes = 0, zero = 0;
  const keep = [];
  for (const r of WATCH.refs) {
    const cv = r.deref();
    if (!cv) continue;
    keep.push(r);
    n++;
    const b = cv.width * cv.height * 4;
    if (!b) zero++;
    bytes += b;
  }
  WATCH.refs = keep;
  return { alive: n, aliveMB: Math.round(bytes / 1048576), zeroSized: zero, made: WATCH.made, collected: WATCH.freed };
}
