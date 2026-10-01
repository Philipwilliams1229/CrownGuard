// ============ INSTRUMENTS ============
// The score's orchestra, synthesized. The target is the sound of a GBA-era
// RPG (Pokemon Ruby/Sapphire): soft sampled-sounding flutes, reeds, strings,
// harp and brass over a bouncy bass and a small, slightly crunchy drum kit —
// NOT bare square-wave chiptune. Each voice is a few oscillators through a
// filter and an envelope, so a whole song costs little.
//
// Every voice is  voice(ctx, out, f, t, d, v)  with `out` an AudioNode to
// play into, f in Hz, t the start (ctx seconds), d the length in seconds,
// v 0..1. Nothing here touches the clock: sfx.js's context or an
// OfflineAudioContext both work, which is how the lab renders WAV samples.

// ---- shared material, one set per context -------------------------------

const cache = new WeakMap();
function kit(ctx) {
  let k = cache.get(ctx);
  if (k) return k;
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  let seed = 12345;                           // seeded: a render is repeatable
  for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
  k = { noise, waves: {} };
  cache.set(ctx, k);
  return k;
}

// A periodic wave from harmonic amplitudes [h1, h2, h3, ...].
function wave(ctx, name, harm) {
  const k = kit(ctx);
  if (!k.waves[name]) {
    const real = new Float32Array(harm.length + 1);
    const imag = new Float32Array(harm.length + 1);
    harm.forEach((a, i) => { imag[i + 1] = a; });
    k.waves[name] = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }
  return k.waves[name];
}

// A pulse wave of the given duty cycle (0.5 = square), built from its series.
function pulse(ctx, duty) {
  const n = 40;
  return wave(ctx, `pulse${duty}`, Array.from({ length: n }, (_, i) => (2 / ((i + 1) * Math.PI)) * Math.sin((i + 1) * Math.PI * duty)));
}

const saw = (ctx) => wave(ctx, "saw", Array.from({ length: 48 }, (_, i) => 1 / (i + 1)));

function osc(ctx, type, f, t, end, detune = 0) {
  const o = ctx.createOscillator();
  if (type && typeof type === "object") o.setPeriodicWave(type); else o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(end);
  return o;
}

// a slow pitch wobble: depth in cents, rate in Hz, blooming in after `delay`
function vibrato(ctx, o, t, end, { cents = 12, rate = 5.4, delay = 0.18 } = {}) {
  const lfo = osc(ctx, "sine", rate, t, end);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(cents, t + delay + 0.25);
  lfo.connect(g).connect(o.detune);
}

// attack / sustain / release around a held note of length d
function adsr(ctx, t, d, { a = 0.01, dec = 0, sus = 1, r = 0.08, peak = 1 }) {
  const g = ctx.createGain();
  const end = t + d;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (dec > 0) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dec);
  g.gain.setValueAtTime(Math.max(0.0001, dec > 0 ? peak * sus : peak), Math.max(t + a + dec, end - 0.001));
  g.gain.exponentialRampToValueAtTime(0.0001, end + r);
  return { g, stop: end + r + 0.02 };
}

// a plucked envelope: instant strike, exponential die-away
function pluckEnv(ctx, t, life, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + life);
  return g;
}

function filt(ctx, type, f, q = 0.7) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

function noiseSrc(ctx, t, len, offset = 0) {
  const s = ctx.createBufferSource();
  s.buffer = kit(ctx).noise;
  s.loop = true;
  s.start(t, offset % 1.5);
  s.stop(t + len);
  return s;
}

// ---- the pitched voices --------------------------------------------------

export const VOICES = {
  // breathy, round, a little vibrato — the overworld's lead
  flute(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.045, r: 0.1, peak: 0.34 * v });
    const o = osc(ctx, wave(ctx, "flute", [1, 0.28, 0.1, 0.05]), f, t, stop);
    vibrato(ctx, o, t, stop, { cents: 14, rate: 5.2, delay: 0.2 });
    o.connect(g);
    const br = noiseSrc(ctx, t, d + 0.1, f);
    const bf = filt(ctx, "bandpass", f * 2.2, 1.4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.05 * v, t + 0.03);
    bg.gain.exponentialRampToValueAtTime(0.012 * v, t + 0.14);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
    br.connect(bf).connect(bg).connect(g);
    g.connect(out);
  },

  // nasal, reedy: strong 2nd-5th harmonics through a formant bump
  oboe(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.05, r: 0.09, peak: 0.26 * v });
    const o = osc(ctx, wave(ctx, "oboe", [0.6, 1, 0.85, 0.6, 0.4, 0.22, 0.12, 0.06]), f, t, stop);
    vibrato(ctx, o, t, stop, { cents: 16, rate: 5.6, delay: 0.25 });
    const pk = filt(ctx, "peaking", 1350, 1.2); pk.gain.value = 5;
    o.connect(filt(ctx, "lowpass", 4200)).connect(pk).connect(g).connect(out);
  },

  // hollow, woody — odd harmonics
  clarinet(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.04, r: 0.08, peak: 0.28 * v });
    const o = osc(ctx, wave(ctx, "clar", [1, 0, 0.55, 0, 0.3, 0, 0.14, 0, 0.07]), f, t, stop);
    vibrato(ctx, o, t, stop, { cents: 9, rate: 5, delay: 0.3 });
    o.connect(filt(ctx, "lowpass", 2600)).connect(g).connect(out);
  },

  // the ensemble: three detuned saws, a slow swell, a lid on the top end
  strings(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.16, r: 0.32, peak: 0.12 * v });
    const lp = filt(ctx, "lowpass", 2100, 0.5);
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2300, t + 0.3);
    for (const c of [-10, 0, 10]) {
      const o = osc(ctx, saw(ctx), f, t, stop, c);
      vibrato(ctx, o, t, stop, { cents: 6, rate: 5.1, delay: 0.35 });
      o.connect(lp);
    }
    lp.connect(g).connect(out);
  },

  // short, dry, bouncy
  pizz(ctx, out, f, t, d, v) {
    const g = pluckEnv(ctx, t, Math.min(0.5, 0.12 + d * 0.5), 0.3 * v);
    const lp = filt(ctx, "lowpass", 3400, 0.8);
    lp.frequency.setValueAtTime(3400, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.16);
    const o = osc(ctx, saw(ctx), f, t, t + 0.6);
    o.connect(lp).connect(g).connect(out);
  },

  // a plucked string with a long, glassy tail
  harp(ctx, out, f, t, d, v) {
    const g = pluckEnv(ctx, t, 1.4, 0.32 * v);
    const o = osc(ctx, wave(ctx, "harp", [1, 0.5, 0.28, 0.14, 0.07, 0.03]), f, t, t + 1.5);
    const lp = filt(ctx, "lowpass", 5000);
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(1200, t + 0.6);
    o.connect(lp).connect(g).connect(out);
  },

  // a rounder, woodier pluck than the harp (lute, mandolin, hammered strings)
  lute(ctx, out, f, t, d, v) {
    const g = pluckEnv(ctx, t, 0.8, 0.3 * v);
    const o = osc(ctx, wave(ctx, "lute", [1, 0.8, 0.55, 0.3, 0.2, 0.1]), f, t, t + 0.9);
    const lp = filt(ctx, "lowpass", 3000);
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.35);
    o.connect(lp).connect(g).connect(out);
  },

  // trumpet-ish: a bright swell as the lip catches
  brass(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.045, dec: 0.12, sus: 0.8, r: 0.1, peak: 0.2 * v });
    const lp = filt(ctx, "lowpass", 2600, 0.9);
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(3000, t + 0.07);
    lp.frequency.exponentialRampToValueAtTime(1700, t + 0.3);
    for (const c of [-5, 5]) {
      const o = osc(ctx, saw(ctx), f, t, stop, c);
      vibrato(ctx, o, t, stop, { cents: 8, rate: 5.3, delay: 0.3 });
      o.connect(lp);
    }
    lp.connect(g).connect(out);
  },

  // French horn: the same, rounder and slower
  horn(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.09, dec: 0.2, sus: 0.85, r: 0.18, peak: 0.22 * v });
    const lp = filt(ctx, "lowpass", 1400, 0.7);
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 0.14);
    for (const c of [-6, 6]) {
      const o = osc(ctx, saw(ctx), f, t, stop, c);
      vibrato(ctx, o, t, stop, { cents: 7, rate: 4.9, delay: 0.35 });
      o.connect(lp);
    }
    lp.connect(g).connect(out);
  },

  // the picked bass: a saw with a closing filter over a sine under it
  bass(ctx, out, f, t, d, v) {
    const life = Math.min(0.55, 0.14 + d * 0.8);
    const g = pluckEnv(ctx, t, life, 0.5 * v);
    const lp = filt(ctx, "lowpass", 900, 1);
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.2);
    osc(ctx, saw(ctx), f, t, t + life + 0.05).connect(lp).connect(g);
    osc(ctx, "sine", f, t, t + life + 0.05).connect(g);
    g.connect(out);
  },

  // a held synth bass (sustains for the whole note)
  sbass(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.012, dec: 0.1, sus: 0.7, r: 0.06, peak: 0.34 * v });
    osc(ctx, pulse(ctx, 0.3), f, t, stop).connect(filt(ctx, "lowpass", 700, 1.1)).connect(g);
    osc(ctx, "sine", f, t, stop).connect(g);
    g.connect(out);
  },

  organ(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.03, r: 0.12, peak: 0.16 * v });
    const o = osc(ctx, wave(ctx, "organ", [1, 0.7, 0.35, 0.5, 0, 0.25, 0, 0.18]), f, t, stop);
    vibrato(ctx, o, t, stop, { cents: 7, rate: 6.2, delay: 0.1 });
    o.connect(g).connect(out);
  },

  // glockenspiel / bells: inharmonic partials, left to ring
  bell(ctx, out, f, t, d, v) {
    for (const [r, a, life] of [[1, 1, 1.6], [2.76, 0.45, 1.0], [5.4, 0.2, 0.6]]) {
      const g = pluckEnv(ctx, t, life, 0.17 * v * a);
      osc(ctx, "sine", f * r, t, t + life + 0.05).connect(g).connect(out);
    }
  },

  // celesta / music box: bell-like but shorter and purer
  celesta(ctx, out, f, t, d, v) {
    for (const [r, a, life] of [[1, 1, 0.9], [4, 0.28, 0.35], [6.1, 0.1, 0.2]]) {
      const g = pluckEnv(ctx, t, life, 0.2 * v * a);
      osc(ctx, "sine", f * r, t, t + life + 0.05).connect(g).connect(out);
    }
  },

  // "ah": detuned saws through two vowel formants
  choir(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.28, r: 0.4, peak: 0.12 * v });
    const mix = ctx.createGain();
    for (const c of [-12, 0, 12]) {
      const o = osc(ctx, saw(ctx), f, t, stop, c);
      vibrato(ctx, o, t, stop, { cents: 10, rate: 5, delay: 0.4 });
      o.connect(mix);
    }
    for (const [ff, q, a] of [[700, 6, 1], [1150, 8, 0.6], [2600, 8, 0.2]]) {
      const bp = filt(ctx, "bandpass", ff, q);
      const bg = ctx.createGain(); bg.gain.value = a;
      mix.connect(bp).connect(bg).connect(g);
    }
    g.connect(out);
  },

  // a slow synth pad, glassy at the top
  pad(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.5, r: 0.7, peak: 0.12 * v });
    const lp = filt(ctx, "lowpass", 1500, 0.6);
    for (const c of [-14, 0, 14]) osc(ctx, "triangle", f, t, stop, c).connect(lp);
    osc(ctx, saw(ctx), f / 2, t, stop).connect(lp);
    lp.connect(g).connect(out);
  },

  // the one piece of honest chiptune: a 25% pulse for sparkle and echoes
  chip(ctx, out, f, t, d, v) {
    const { g, stop } = adsr(ctx, t, d, { a: 0.006, dec: 0.08, sus: 0.6, r: 0.05, peak: 0.12 * v });
    osc(ctx, pulse(ctx, 0.25), f, t, stop).connect(g).connect(out);
  },

  // a tuned drum: pitch falls onto the note
  timpani(ctx, out, f, t, d, v) {
    const g = pluckEnv(ctx, t, 1.1, 0.7 * v);
    const o = osc(ctx, "sine", f * 1.35, t, t + 1.2);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    o.connect(g).connect(out);
    const n = noiseSrc(ctx, t, 0.08, f);
    const ng = pluckEnv(ctx, t, 0.07, 0.25 * v);
    n.connect(filt(ctx, "lowpass", 600)).connect(ng).connect(out);
  },
};

// ---- the drum kit -------------------------------------------------------
// A little crunchy and a little dull on purpose: sampled drums at 8-bit.

export const DRUMS = {
  k(ctx, out, t, v) {
    const g = pluckEnv(ctx, t, 0.22, 0.95 * v);
    const o = osc(ctx, "sine", 150, t, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    o.connect(g).connect(out);
    const c = noiseSrc(ctx, t, 0.02);
    c.connect(filt(ctx, "lowpass", 1800)).connect(pluckEnv(ctx, t, 0.015, 0.25 * v)).connect(out);
  },
  s(ctx, out, t, v) {
    const n = noiseSrc(ctx, t, 0.2);
    n.connect(filt(ctx, "bandpass", 1900, 0.9)).connect(pluckEnv(ctx, t, 0.15, 0.55 * v)).connect(out);
    const o = osc(ctx, "triangle", 210, t, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    o.connect(pluckEnv(ctx, t, 0.09, 0.4 * v)).connect(out);
  },
  h(ctx, out, t, v) {
    noiseSrc(ctx, t, 0.06, 0.4).connect(filt(ctx, "highpass", 7200)).connect(pluckEnv(ctx, t, 0.04, 0.22 * v)).connect(out);
  },
  o(ctx, out, t, v) {
    noiseSrc(ctx, t, 0.3, 0.9).connect(filt(ctx, "highpass", 6500)).connect(pluckEnv(ctx, t, 0.24, 0.2 * v)).connect(out);
  },
  t(ctx, out, t, v) { tom(ctx, out, t, v, 210, 120); },
  m(ctx, out, t, v) { tom(ctx, out, t, v, 150, 80); },
  c(ctx, out, t, v) {
    noiseSrc(ctx, t, 1.4, 0.2).connect(filt(ctx, "highpass", 3200)).connect(pluckEnv(ctx, t, 1.2, 0.3 * v)).connect(out);
  },
  x(ctx, out, t, v) {
    osc(ctx, "triangle", 1750, t, t + 0.06).connect(pluckEnv(ctx, t, 0.04, 0.3 * v)).connect(out);
    noiseSrc(ctx, t, 0.03).connect(filt(ctx, "highpass", 3000)).connect(pluckEnv(ctx, t, 0.02, 0.15 * v)).connect(out);
  },
};

function tom(ctx, out, t, v, hi, lo) {
  const o = osc(ctx, "sine", hi, t, t + 0.4);
  o.frequency.exponentialRampToValueAtTime(lo, t + 0.2);
  o.connect(pluckEnv(ctx, t, 0.32, 0.7 * v)).connect(out);
}

export const INSTRUMENT_NAMES = [...Object.keys(VOICES), "drums"];
