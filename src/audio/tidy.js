// ============ TIDY: let go of every sound once it has played ============
// Each note of the score and each sound effect builds a few AudioNodes (oscillators, filters, envelopes) wired
// into the mix. Chrome frees them once they fall silent; WebKit (Safari, and the iOS app's web view) keeps every
// node that is still CONNECTED, and its audio thread works through all of them 344 times a second, sounding or not.
// So on an iPhone the graph grew by ~60-120 nodes a second of battle and was never let go: the owner saw the frame
// rate fall to ~10 on the level after a won one, and closing the game was the only cure (2026-11-25).
//
//   voiced(ctx, (c) => VOICES.flute(c, out, f, t, d, v))   play through a stand-in for ctx that notes every node made;
//                                                           when the last of them that sounds has ended, all are unplugged
//   letGo([osc, gain, ...])                                 the same for nodes made by hand
//
// An OfflineAudioContext (the music lab's WAV renders, the sound sheet) is thrown away whole, so it is left alone.

const LIVE = typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);
const isNode = (n) => typeof AudioNode !== "undefined" && n instanceof AudioNode;
// a node that plays and then ends (oscillator, buffer source): it says when ("ended")
const plays = (n) => typeof n.stop === "function" && "onended" in n;

// dev only: ?untidy turns the unplugging off (the game as it was before this file), so the phone test
// (src/dev/repro.js) can compare the two; TIDY counts the nodes noted and unplugged
const UNTIDY = import.meta.env?.DEV && typeof window !== "undefined" && /[?&]untidy/.test(window.location.search);
// swept: nodes the sweep below had to unplug because their "ended" never came (owner's phone, 2026-11-26: 23,174
// nodes left plugged in after 25 min, the frame rate down to 19); a crash report with swept > 0 says that happened
export const TIDY = { made: 0, unplugged: 0, swept: 0, untidy: UNTIDY };   // (the test may flip untidy before it starts)

const unplug = (nodes) => { TIDY.unplugged += nodes.length; for (const n of nodes) { try { n.disconnect(); } catch { /* already gone */ } } };

// Every group still waiting to be unplugged is HELD here, for two reasons (2026-11-26):
//  - a strong reference, so WebKit can't collect a playing source's JS side and its "ended" listener with it
//    (the node itself stays wired into the audio graph, connected, for good);
//  - a sweep: a group whose "ended" hasn't come SWEEP_S seconds of audio time after it was made (the longest note
//    in any track is 8 s), or SWEEP_WALL_MS of real time (a context that stopped and never restarted), is
//    unplugged anyway. A note that never got to play is simply never heard.
const held = new Set();
const SWEEP_S = 20, SWEEP_WALL_MS = 45000, SWEEP_EVERY_MS = 2000;
let sweeper = null;
function finish(gr, swept) {
  if (gr.over) return;
  gr.over = true;
  held.delete(gr);
  if (swept) TIDY.swept += gr.nodes.length;
  unplug(gr.nodes);
  if (gr.done) { try { gr.done(); } catch { /* the caller's own book-keeping */ } }
}
function sweep() {
  const wall = typeof performance !== "undefined" ? performance.now() : Date.now();
  for (const gr of held) {
    const now = gr.ctx?.currentTime;
    if ((Number.isFinite(now) && now - gr.ct > SWEEP_S) || wall - gr.wall > SWEEP_WALL_MS) finish(gr, true);
  }
  if (!held.size && sweeper) { clearInterval(sweeper); sweeper = null; }
}

// done: called once when the group is unplugged, by its "ended" or by the sweep (sfx.js counts its voices with it)
export function letGo(nodes, done = null) {
  TIDY.made += nodes.length;
  if (TIDY.untidy) { if (done) nodes.filter(plays).forEach((s) => s.addEventListener("ended", done, { once: true })); return; }
  const src = nodes.filter(plays);
  const gr = { nodes, done, over: false };
  // nothing in it ever sounds: unplug it now
  if (!src.length) { finish(gr, false); return; }
  const ctx = src[0].context;
  gr.ctx = ctx; gr.ct = ctx?.currentTime ?? 0;
  gr.wall = typeof performance !== "undefined" ? performance.now() : Date.now();
  held.add(gr);
  if (!sweeper && typeof setInterval === "function") sweeper = setInterval(sweep, SWEEP_EVERY_MS);
  let left = src.length;
  for (const s of src) s.addEventListener("ended", () => { if (--left === 0) finish(gr, false); }, { once: true });
}

// one stand-in per context (so caches keyed on the context, like instruments.js's kit, still hit)
const STAND = new WeakMap();
let into = null;                       // where the nodes made right now are noted
function standIn(ctx) {
  let p = STAND.get(ctx);
  if (p) return p;
  p = new Proxy(ctx, {
    get(t, k) {
      const v = Reflect.get(t, k);
      if (typeof v !== "function") return v;
      if (typeof k === "string" && k.startsWith("create")) return (...a) => { const n = v.apply(t, a); if (into && isNode(n)) into.push(n); return n; };
      return v.bind(t);
    },
  });
  STAND.set(ctx, p);
  return p;
}

export function voiced(ctx, play) {
  if (!LIVE || !ctx || (typeof OfflineAudioContext !== "undefined" && ctx instanceof OfflineAudioContext)) return play(ctx);
  const made = [], was = into;
  into = made;
  try { return play(standIn(ctx)); }
  finally { into = was; if (made.length) letGo(made); }
}
