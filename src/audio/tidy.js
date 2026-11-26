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
export const TIDY = { made: 0, unplugged: 0, untidy: UNTIDY };   // (the test may flip untidy before it starts)

const unplug = (nodes) => { TIDY.unplugged += nodes.length; for (const n of nodes) { try { n.disconnect(); } catch { /* already gone */ } } };

export function letGo(nodes) {
  TIDY.made += nodes.length;
  if (TIDY.untidy) return;
  const src = nodes.filter(plays);
  // nothing in it ever sounds: unplug it now
  if (!src.length) { unplug(nodes); return; }
  let left = src.length;
  for (const s of src) s.addEventListener("ended", () => { if (--left === 0) unplug(nodes); }, { once: true });
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
