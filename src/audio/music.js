// ============ THE SCORE ============
// Background music, played by a small sequencer over the synthesized
// orchestra in instruments.js. Tracks are text (see notation.js) and live in
// tracks/; this file reads them, keeps time, mixes, and crossfades.
//
//   music.play("greenwood-build")   start a track (no-op if already playing;
//                                    otherwise the old one fades out)
//   music.stop()                    fade to silence
//   music.want                      what the game last asked for
//   music.forget()                  a new battle: tracks start from the top
//
// A looping track that is faded out remembers its place (the start of the
// bar it was in), and picks up from there when it is asked for again: the
// wave music carries on after a boss instead of starting over. forget()
// clears those places; the music already playing carries on.
//
// Like sfx.js it no-ops headless, shares sfx's AudioContext, obeys the
// settings (muted / music off / music volume), pauses with the tab, and
// starts only after the first tap (browsers demand a gesture).
//
// renderTrack() plays a track into an OfflineAudioContext instead, which is
// how the music lab makes WAV samples without anyone having to listen live.

import { sfx } from "./sfx.js";
import { settings, onSettings } from "./settings.js";
import { compileTrack, midiToFreq } from "./notation.js";
import { VOICES, DRUMS } from "./instruments.js";
import { TRACKS } from "./tracks/index.js";

const HEADLESS = typeof window === "undefined" || !(window.AudioContext || window.webkitAudioContext);

const LOOKAHEAD = 0.35;          // seconds of notes scheduled ahead of the clock
const TICK_MS = 60;
const FADE_IN = 0.5;
const FADE_OUT = 1.1;
const MASTER_LEVEL = 0.7;

// ---- the mixing chain, one per context ----------------------------------

function reverbIR(ctx, secs = 1.7) {
  const n = Math.floor(ctx.sampleRate * secs);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  let seed = 987654;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const r = seed / 2147483648 - 1;
      lp += (r - lp) * 0.45;                           // dull the tail like a soft hall
      d[i] = lp * Math.pow(1 - i / n, 2.6);
    }
  }
  return buf;
}

// master -> compressor -> top-end lid -> out;  reverb returns into master
function chain(ctx, dest) {
  const master = ctx.createGain();
  master.gain.value = MASTER_LEVEL;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  const lid = ctx.createBiquadFilter();
  lid.type = "lowpass"; lid.frequency.value = 11500;
  // a soft clip last of all: loud passages round off instead of cracking
  const clip = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4); }
  clip.curve = curve;
  master.connect(comp).connect(lid).connect(clip).connect(dest);
  const verb = ctx.createConvolver();
  verb.buffer = reverbIR(ctx);
  const verbIn = ctx.createGain();
  verbIn.gain.value = 1;
  const wet = ctx.createGain();
  wet.gain.value = 0.9;
  verbIn.connect(verb).connect(wet).connect(master);
  return { master, verbIn };
}

// ---- the sequencer -------------------------------------------------------

function partNodes(ctx, track, c, trackOut) {
  const nodes = {};
  for (const [name, p] of Object.entries(track.parts)) {
    const g = ctx.createGain();
    g.gain.value = p.gain ?? 1;
    let tail = g;
    if (ctx.createStereoPanner && p.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = p.pan;
      g.connect(pan);
      tail = pan;
    }
    tail.connect(trackOut);
    const send = ctx.createGain();
    send.gain.value = p.send ?? 0.18;
    tail.connect(send).connect(c.verbIn);
    nodes[name] = g;
  }
  return nodes;
}

class Sequencer {
  // from: { si, pos } to start partway (section index, steps into it)
  constructor(ctx, c, track, trackOut, startAt, from = null) {
    this.ctx = ctx;
    this.track = track;
    this.song = compileTrack(track);
    this.nodes = partNodes(ctx, track, c, trackOut);
    this.si = 0;                       // index into order
    this.ei = 0;                       // next event in that section
    this.base = startAt;               // ctx time the section started
    if (from && from.si < this.song.order.length) {
      const sec = this.song.sections[this.song.order[from.si]];
      const pos = Math.max(0, Math.min(from.pos, sec.steps - 1));
      this.si = from.si;
      this.base = startAt - pos * this.song.stepSec;
      while (this.ei < sec.events.length && sec.events[this.ei].at < pos) this.ei++;
    }
    this.done = false;
    this.loop = track.loop !== false;
    this.loopFrom = track.loopFrom || 0;
    this.endsAt = null;                // set when a non-looping track runs out
  }

  // where the music is now, rounded back to the start of its bar
  place(now) {
    const { song } = this;
    const sec = song.sections[song.order[this.si]];
    const pos = Math.floor((now - this.base) / song.stepSec / song.meter) * song.meter;
    return { si: this.si, pos: Math.max(0, Math.min(pos, sec.steps - song.meter)) };
  }

  // Schedule every event that starts before `until` (ctx seconds).
  advance(until) {
    const { song, track } = this;
    while (!this.done) {
      const sec = song.sections[song.order[this.si]];
      const ev = sec.events;
      while (this.ei < ev.length) {
        const e = ev[this.ei];
        const time = this.base + e.at * song.stepSec + ((e.at % 2) * (track.swing || 0) * song.stepSec);
        if (time > until) return;
        this.fire(e, time);
        this.ei++;
      }
      const nextBase = this.base + sec.steps * song.stepSec;
      if (nextBase > until) return;
      this.base = nextBase;
      this.ei = 0;
      this.si++;
      if (this.si >= song.order.length) {
        if (!this.loop) { this.done = true; this.endsAt = this.base; return; }
        this.si = Math.min(this.loopFrom, song.order.length - 1);
      }
    }
  }

  fire(e, time) {
    const part = this.track.parts[e.part];
    const out = this.nodes[e.part];
    const vel = e.vel * (part.vel ?? 1);
    if (part.inst === "drums") {
      DRUMS[e.hit]?.(this.ctx, out, time, vel);
      return;
    }
    const voice = VOICES[part.inst];
    if (!voice) return;
    const dur = e.dur * this.song.stepSec * (e.legato ? 1.06 : 0.97);
    for (const m of e.notes) voice(this.ctx, out, midiToFreq(m + (part.transpose || 0)), time, dur, vel);
  }
}

// ---- live playback -------------------------------------------------------

let live = null;                       // { ctx, c, outGain } once started
let current = null;                    // { id, seq, out }
let want = null;
let timer = null;
let unlocked = false;

function enabled() { return !settings.muted && settings.music; }

function musicGain() { return settings.musicVol; }

function ensureLive() {
  if (HEADLESS) return null;
  if (live) return live;
  const a = sfx.audio();
  if (!a) return null;
  const out = a.ctx.createGain();
  out.gain.value = musicGain();
  out.connect(a.ctx.destination);
  live = { ctx: a.ctx, c: chain(a.ctx, out), out };
  return live;
}

function tick() {
  if (!live) return;
  const { ctx } = live;
  if (current && !current.seq.done) current.seq.advance(ctx.currentTime + LOOKAHEAD);
  // (a finished jingle stays as `current`, so a settings change doesn't replay it)
  if ((!current || current.seq.done) && !fading.size && timer) { clearInterval(timer); timer = null; }
}

const fading = new Set();
const warned = new Set();
const places = new Map();             // track id -> { si, pos } where it was faded out

function startTimer() {
  if (!timer) timer = setInterval(tick, TICK_MS);
}

function fadeAndDrop(cur) {
  const { ctx } = live;
  const t = ctx.currentTime;
  if (cur.seq.loop && !cur.seq.done) places.set(cur.id, cur.seq.place(t));
  cur.out.gain.cancelScheduledValues(t);
  cur.out.gain.setValueAtTime(cur.out.gain.value, t);
  cur.out.gain.linearRampToValueAtTime(0, t + FADE_OUT);
  fading.add(cur);
  cur.seq.done = true;
  setTimeout(() => { try { cur.out.disconnect(); } catch { /* gone */ } fading.delete(cur); }, (FADE_OUT + 0.3) * 1000);
}

function begin(id) {
  const track = TRACKS[id];
  const lv = ensureLive();
  if (!track || !lv) return;
  const { ctx } = lv;
  if (ctx.state === "suspended" && unlocked) ctx.resume();
  const out = ctx.createGain();
  const t0 = ctx.currentTime + 0.06;
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.linearRampToValueAtTime(track.level ?? 1, t0 + FADE_IN);
  out.connect(lv.c.master);
  let seq;
  try { seq = new Sequencer(ctx, lv.c, track, out, t0, places.get(id)); } catch (e) { console.warn("music:", e.message); return; }
  current = { id, seq, out };
  seq.advance(ctx.currentTime + LOOKAHEAD);
  startTimer();
}

function apply() {
  if (HEADLESS) return;
  const live2 = live;
  if (live2) live2.out.gain.value = enabled() ? musicGain() : 0;
  if (!enabled() || !unlocked || document.hidden) {
    // silent: stop anything running; remembered `want` restarts it later
    if (current) { if (live) fadeAndDrop(current); current = null; }
    return;
  }
  if (want && (!current || current.id !== want)) {
    if (current) fadeAndDrop(current);
    current = null;
    begin(want);
  }
}

function unlock() {
  if (unlocked || HEADLESS) return;
  unlocked = true;
  sfx.audio();
  apply();
}

if (!HEADLESS) {
  onSettings(apply);
  for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, unlock, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { live?.ctx.suspend?.(); }
    else { live?.ctx.resume?.(); apply(); }
  });
}

export const music = {
  // Ask for a track. null stops the music.
  play(id) {
    if (id && !TRACKS[id]) {
      if (!warned.has(id)) { warned.add(id); console.warn(`music: no track "${id}"`); }
      return;
    }
    if (id === want) return;          // already asked for (a finished jingle stays finished)
    want = id;
    if (!id) { this.stop(); return; }
    apply();
  },
  stop() {
    want = null;
    if (current && live) fadeAndDrop(current);
    current = null;
  },
  // a new battle: every track starts from the top next time it is asked for
  forget() { places.clear(); },
  get want() { return want; },
  get playing() { return current?.id || null; },
  ids: () => Object.keys(TRACKS),
  info: (id) => TRACKS[id],
  setVolume(v) { settings.musicVol = Math.max(0, Math.min(1, v)); apply(); },
  unlock,
};

// handy in the console and for tests: window.__music.want / .playing
if (!HEADLESS) window.__music = music;

// ---- offline rendering (the lab's samples) -------------------------------

// One pass through the track's order, plus a tail. Returns an AudioBuffer.
export async function renderTrack(id, { sampleRate = 32000, passes = 1, tail = 3.5 } = {}) {
  const track = TRACKS[id];
  if (!track) throw new Error(`no track "${id}"`);
  const song = compileTrack(track);
  const steps = song.order.reduce((n, s) => n + song.sections[s].steps, 0);
  const seconds = steps * song.stepSec * passes + tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const c = chain(ctx, ctx.destination);
  const out = ctx.createGain();
  out.gain.value = track.level ?? 1;
  out.connect(c.master);
  const seq = new Sequencer(ctx, c, { ...track, loop: passes > 1 }, out, 0.05);
  seq.advance(seconds - tail);
  return ctx.startRendering();
}

// AudioBuffer -> 16-bit WAV bytes
export function wavBytes(buf) {
  const ch = buf.numberOfChannels, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); data.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVEfmt ");
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, "data"); data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i]));
    data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
  }
  return new Uint8Array(data.buffer);
}
