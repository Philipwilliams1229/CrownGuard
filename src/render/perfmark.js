// ============ PERFMARK: where a frame's time goes, on the device itself ============
// (2026-11-25, owner: frames fell to ~10 on the level after a won one, on an iPhone only; a restart fixed
// it, muting did not, pausing did not.) A leaf module: draw.js marks its passes with pm("name"), the main
// loop (CrownguardGame.jsx) times the engine and the whole frame, and once a second `PERF.now` holds the
// averages. The frame counter shows them; native/crashlog.js keeps a sample per battle (Settings > Progress
// > Crash reports > Copy), so a slow level can be read off the phone without a Mac.
// Cost: a dozen performance.now() calls a frame.

const acc = Object.create(null);     // section -> ms summed this second
let t = 0;
export const pmStart = () => { t = performance.now(); };
export const pm = (k) => { const n = performance.now(); acc[k] = (acc[k] || 0) + (n - t); t = n; };

// the main loop's half
const W = { frames: 0, upd: 0, draw: 0, js: 0, gapMax: 0, ticks: 0, since: 0 };
export const PERF = { now: null };
export const perfFrame = (now, { painted, upd, draw, js, gap }) => {
  if (!W.since) W.since = now;
  W.ticks++; W.upd += upd; W.js += js; W.gapMax = Math.max(W.gapMax, gap);
  if (painted) { W.frames++; W.draw += draw; }
  if (now - W.since < 1000) return null;
  const secs = (now - W.since) / 1000, f = Math.max(1, W.frames), r1 = (x) => Math.round(x * 10) / 10;
  const parts = {};
  for (const k of Object.keys(acc)) { parts[k] = r1(acc[k] / f); delete acc[k]; }
  PERF.now = {
    fps: Math.round(W.frames / secs),            // frames painted a second
    ticks: Math.round(W.ticks / secs),           // times the loop ran a second (the browser's own frame rate)
    js: r1(W.js / Math.max(1, W.ticks)),         // ms of the game's own code a loop run, all of it
    upd: r1(W.upd / Math.max(1, W.ticks)),       // ...of which the engine
    draw: r1(W.draw / f),                        // ...of which drawing the board, a painted frame
    gapMax: Math.round(W.gapMax),                // the longest wait between two loop runs (ms)
    parts,                                       // the board's passes, ms a painted frame
  };
  Object.assign(W, { frames: 0, upd: 0, draw: 0, js: 0, gapMax: 0, ticks: 0, since: now });
  return PERF.now;
};
