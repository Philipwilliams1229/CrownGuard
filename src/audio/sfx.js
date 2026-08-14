// ============ SOUND ============
// Every sound in the game, synthesized live — no audio files. Oscillators,
// filtered noise and envelopes, in the same spirit as the pixel art: small,
// hand-made, and readable at a glance.
//
// Design rules:
//   - the AudioContext is created lazily on the first play after a user
//     gesture (browsers demand it), and everything no-ops headless so the
//     sim harness can import the engine without ears.
//   - busy sounds are GATED: an archer volley may ask for forty twangs a
//     second and receive maybe eight. Each sound carries its own window.
//   - every note gets a little random pitch drift, so repetition doesn't
//     turn into a machine gun.
//
// Volume and mute persist in localStorage. The HUD's speaker button and the
// sound lab (/sound.html) both talk to this module.

const HEADLESS = typeof window === "undefined" || !(window.AudioContext || window.webkitAudioContext);

const KEY = "crownguard.sound.v1";

const store = (() => {
  try {
    const raw = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "{}");
    return { muted: !!raw.muted, vol: typeof raw.vol === "number" ? raw.vol : 0.5 };
  } catch {
    return { muted: false, vol: 0.5 };
  }
})();

let ctx = null;
let master = null;
let voices = 0;                 // live sources, for the safety cap
const lastAt = {};              // per-sound gate timestamps

function boot() {
  if (HEADLESS) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = store.muted ? 0 : store.vol;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ muted: store.muted, vol: store.vol })); } catch { /* fine */ }
}

// A sound may fire again only after its window has passed.
function gate(name, ms) {
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (lastAt[name] && now - lastAt[name] < ms) return false;
  lastAt[name] = now;
  return true;
}

const drift = (f, pct = 0.06) => f * (1 + (Math.random() * 2 - 1) * pct);

// ---- building blocks ---------------------------------------------------

// One oscillator with an attack/decay envelope and optional pitch slide.
function tone({ type = "square", f = 440, to = null, dur = 0.15, gain = 0.2, attack = 0.005, delay = 0, curve = "exp" }) {
  if (!ctx || voices > 28) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, f), t);
  if (to != null) {
    if (curve === "exp") o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    else o.frequency.linearRampToValueAtTime(Math.max(20, to), t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  voices++;
  o.onended = () => { voices--; };
  o.start(t);
  o.stop(t + dur + 0.02);
}

// A burst of filtered noise: the game's thuds, booms and squelches.
let noiseBuf = null;
function noise({ dur = 0.2, gain = 0.2, type = "lowpass", from = 2000, to = 300, q = 0.8, delay = 0 }) {
  if (!ctx || voices > 28) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(from, t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(master);
  voices++;
  src.onended = () => { voices--; };
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

// A bell: a fundamental and two inharmonic partials, left to ring.
function bell(f, dur = 1.1, gain = 0.2) {
  for (const [ratio, amt] of [[1, 1], [2.76, 0.5], [5.4, 0.22]]) {
    tone({ type: "sine", f: f * ratio, dur: dur * (1 - ratio * 0.09), gain: gain * amt, attack: 0.002 });
  }
}

// ---- the library -------------------------------------------------------
// Each entry: the synth recipe, and how often it may fire (gate ms).

const LIB = {
  // building & economy
  place:     { ms: 90,  fn: () => { noise({ dur: 0.1, gain: 0.3, from: 900, to: 150 }); tone({ type: "sine", f: 130, to: 55, dur: 0.16, gain: 0.4 }); } },
  upgrade:   { ms: 90,  fn: () => { tone({ f: drift(440), dur: 0.07, gain: 0.16 }); tone({ f: drift(660), dur: 0.1, gain: 0.16, delay: 0.07 }); } },
  evolve:    { ms: 200, fn: () => { tone({ f: 523, dur: 0.22, gain: 0.14 }); tone({ f: 659, dur: 0.22, gain: 0.12 }); tone({ type: "triangle", f: 1046, dur: 0.3, gain: 0.1, delay: 0.08 }); } },
  ascend:    { ms: 300, fn: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ f, dur: 0.12, gain: 0.13, delay: i * 0.07 })); bell(1568, 0.7, 0.08); } },
  sell:      { ms: 150, fn: () => { tone({ f: 988, dur: 0.06, gain: 0.15 }); tone({ f: 740, dur: 0.09, gain: 0.13, delay: 0.06 }); } },
  coin:      { ms: 80,  fn: () => { tone({ f: drift(1976, 0.03), dur: 0.05, gain: 0.07 }); tone({ f: drift(2637, 0.03), dur: 0.07, gain: 0.06, delay: 0.045 }); } },

  // the horn and the tide
  horn:      { ms: 400, fn: () => { for (const f of [196, 294]) { tone({ type: "sawtooth", f: f * 0.995, dur: 0.55, gain: 0.1, attack: 0.12 }); tone({ type: "sawtooth", f: f * 1.005, dur: 0.55, gain: 0.1, attack: 0.12 }); } } },
  bossHorn:  { ms: 900, fn: () => { for (const f of [98, 147]) { tone({ type: "sawtooth", f, dur: 1.0, gain: 0.14, attack: 0.2 }); } noise({ dur: 0.9, gain: 0.1, from: 400, to: 60 }); } },
  waveClear: { ms: 900, fn: () => { [392, 494, 587].forEach((f, i) => tone({ f, dur: 0.09, gain: 0.14, delay: i * 0.08 })); tone({ f: 784, dur: 0.28, gain: 0.13, delay: 0.24 }); tone({ type: "triangle", f: 988, dur: 0.28, gain: 0.09, delay: 0.24 }); } },
  won:       { ms: 2000, fn: () => { [262, 330, 392, 523].forEach((f, i) => { tone({ f, dur: 0.16, gain: 0.14, delay: i * 0.13 }); tone({ type: "triangle", f: f * 2, dur: 0.16, gain: 0.08, delay: i * 0.13 }); }); bell(1046, 1.2, 0.1); } },
  lost:      { ms: 2000, fn: () => { tone({ type: "sawtooth", f: 220, to: 208, dur: 0.5, gain: 0.14 }); tone({ type: "sawtooth", f: 175, to: 165, dur: 0.7, gain: 0.14, delay: 0.45 }); noise({ dur: 1.0, gain: 0.06, from: 500, to: 60, delay: 0.4 }); } },
  leak:      { ms: 250, fn: () => { tone({ f: 220, dur: 0.08, gain: 0.2 }); tone({ f: 220, dur: 0.08, gain: 0.2, delay: 0.11 }); tone({ type: "sine", f: 110, to: 60, dur: 0.2, gain: 0.3, delay: 0.02 }); } },

  // towers at work
  arrow:     { ms: 50,  fn: () => { tone({ type: "triangle", f: drift(880), to: 240, dur: 0.07, gain: 0.1 }); } },
  bolt:      { ms: 160, fn: () => { tone({ type: "triangle", f: drift(440), to: 110, dur: 0.16, gain: 0.2 }); noise({ dur: 0.08, gain: 0.1, type: "highpass", from: 1200, to: 2400 }); } },
  catapult:  { ms: 200, fn: () => { tone({ type: "sawtooth", f: 90, to: 45, dur: 0.18, gain: 0.12 }); noise({ dur: 0.22, gain: 0.08, type: "bandpass", from: 300, to: 900, q: 1.2 }); } },
  rock:      { ms: 90,  fn: () => { noise({ dur: 0.28, gain: 0.25, from: 1600, to: 120 }); tone({ type: "sine", f: 90, to: 40, dur: 0.22, gain: 0.3 }); } },
  boom:      { ms: 90,  fn: () => { noise({ dur: 0.32, gain: 0.26, from: 2800, to: 160 }); tone({ type: "sine", f: 110, to: 42, dur: 0.26, gain: 0.3 }); } },
  frost:     { ms: 110, fn: () => { [1245, 1568, 1865].forEach((f, i) => tone({ type: "triangle", f: drift(f, 0.02), dur: 0.14, gain: 0.07, delay: i * 0.02 })); noise({ dur: 0.1, gain: 0.04, type: "highpass", from: 5000, to: 8000 }); } },
  arcane:    { ms: 110, fn: () => { tone({ type: "sine", f: 500, to: 900, dur: 0.09, gain: 0.12 }); tone({ type: "sine", f: 900, to: 300, dur: 0.14, gain: 0.12, delay: 0.08 }); } },
  zap:       { ms: 90,  fn: () => { tone({ type: "sawtooth", f: drift(1900), to: 180, dur: 0.11, gain: 0.13 }); noise({ dur: 0.06, gain: 0.09, type: "highpass", from: 3800, to: 6000 }); } },
  spike:     { ms: 140, fn: () => { tone({ type: "square", f: drift(2100), to: 1500, dur: 0.05, gain: 0.06 }); noise({ dur: 0.04, gain: 0.05, type: "highpass", from: 4000, to: 7000 }); } },
  nova:      { ms: 300, fn: () => { [1568, 1976, 2349].forEach((f, i) => tone({ type: "sine", f, dur: 0.4, gain: 0.06, delay: i * 0.03 })); noise({ dur: 0.3, gain: 0.05, type: "highpass", from: 4500, to: 9000 }); } },
  firenova:  { ms: 300, fn: () => { noise({ dur: 0.3, gain: 0.2, from: 2400, to: 200 }); tone({ type: "sawtooth", f: 160, to: 60, dur: 0.24, gain: 0.14 }); } },

  // steel on steel
  clink:     { ms: 90,  fn: () => { tone({ type: "triangle", f: drift(2400, 0.1), dur: 0.03, gain: 0.09 }); noise({ dur: 0.025, gain: 0.06, type: "highpass", from: 5000, to: 8000 }); } },
  tink:      { ms: 120, fn: () => { tone({ type: "triangle", f: drift(3200, 0.05), dur: 0.05, gain: 0.1 }); } },
  hit:       { ms: 100, fn: () => { noise({ dur: 0.05, gain: 0.12, from: 1100, to: 300 }); } },
  crunch:    { ms: 70,  fn: () => { noise({ dur: 0.09, gain: 0.14, from: 1300, to: 220 }); } },
  enemyBolt: { ms: 120, fn: () => { tone({ type: "triangle", f: drift(660), to: 220, dur: 0.08, gain: 0.08 }); } },

  // the uncanny
  toll:      { ms: 500, fn: () => bell(311, 1.3, 0.2) },
  raise:     { ms: 250, fn: () => { tone({ type: "sawtooth", f: 110, to: 330, dur: 0.3, gain: 0.08 }); tone({ type: "sine", f: 220, to: 440, dur: 0.3, gain: 0.06 }); } },
  plague:    { ms: 200, fn: () => { noise({ dur: 0.3, gain: 0.2, type: "bandpass", from: 700, to: 120, q: 3 }); tone({ type: "sine", f: 140, to: 55, dur: 0.26, gain: 0.2 }); } },
  chant:     { ms: 400, fn: () => { tone({ type: "sine", f: 523, dur: 0.18, gain: 0.08 }); tone({ type: "sine", f: 659, dur: 0.22, gain: 0.07, delay: 0.1 }); } },
  ward:      { ms: 400, fn: () => { tone({ type: "triangle", f: 880, dur: 0.14, gain: 0.08 }); tone({ type: "triangle", f: 1109, dur: 0.2, gain: 0.07, delay: 0.08 }); } },
};

// ---- public face -------------------------------------------------------

export const sfx = {
  // Play a named sound (respecting its gate). Safe to call from anywhere,
  // any number of times, headless or not. `force` skips the gate — the
  // sound lab uses it so rapid clicks always answer.
  play(name, force = false) {
    if (HEADLESS || store.muted) return;
    const s = LIB[name];
    if (!s || (!force && !gate(name, s.ms))) return;
    if (!boot()) return;
    s.fn();
  },
  names: () => Object.keys(LIB),
  get muted() { return store.muted; },
  setMuted(m) {
    store.muted = !!m;
    if (master) master.gain.value = store.muted ? 0 : store.vol;
    save();
  },
  get volume() { return store.vol; },
  setVolume(v) {
    store.vol = Math.max(0, Math.min(1, v));
    if (master && !store.muted) master.gain.value = store.vol;
    save();
  },
};
