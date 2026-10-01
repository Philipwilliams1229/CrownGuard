// ============ MUSIC NOTATION ============
// Tracks are written as text, so a song can be read, edited and checked
// without a score editor. Pure functions only — no Web Audio in here, so the
// Node checker (scripts/music-check.mjs) can import it.
//
// A MELODIC part is a string of tokens. Barlines "|" are ignored (they are
// only for the eye), and so is whitespace.
//
//   c5:2     a note: name a-g, optional # or b, octave 0-8 (c4 = middle C),
//            ":" and its length in STEPS (a step is a 16th note)
//   c5       no length -> the last length used in this part (starts at 4)
//   r:4      a rest
//   c3+g3+e4:8   a chord: notes joined with "+"
//   _:4      hold: extends the note before it by 4 more steps (a tie)
//   after the length:  ^ accent   ' staccato (half length)   ~ legato
//
//   "e5:2 g5 a5:4 | r:4 g5:8"   -> e5 (2 steps), g5 (2), a5 (4), rest (4), g5 (8)
//
// A DRUM part is one character per step (a 16th), "|" and spaces ignored:
//   k kick   s snare   h closed hat   o open hat   t high tom   m low tom
//   c crash  x rim click   . rest      K S H = the same, louder
//
// A part's pattern may be shorter than its section; it repeats to fill it
// (so a two-bar bass line can sit under an eight-bar section). Its length
// must divide the section's bar count.

export const NAMES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

// "c#4" -> midi 61
export function noteToMidi(name) {
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note "${name}"`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + acc;
}

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// -> [{ at, dur, notes: [midi...], vel }] with `at`/`dur` in steps, and the
// total length of the pattern in steps.
export function parseMelodic(src, where = "part") {
  const events = [];
  let at = 0;
  let last = 4;
  const toks = String(src).replace(/\|/g, " ").trim().split(/\s+/).filter(Boolean);
  for (const tok of toks) {
    const m = /^([^:]+?)(?::(\d+))?([\^'~]*)$/.exec(tok);
    if (!m) throw new Error(`${where}: bad token "${tok}"`);
    const [, body, lenS, mods] = m;
    const len = lenS ? Number(lenS) : last;
    if (len < 1) throw new Error(`${where}: zero length in "${tok}"`);
    last = len;
    if (body === "r") { at += len; continue; }
    if (body === "_") {
      const prev = events[events.length - 1];
      if (!prev) throw new Error(`${where}: "_" with nothing to hold`);
      prev.dur += len;
      at += len;
      continue;
    }
    let notes;
    try { notes = body.split("+").map(noteToMidi); } catch (e) { throw new Error(`${where}: ${e.message} in "${tok}"`); }
    events.push({
      at, dur: mods.includes("'") ? Math.max(1, len / 2) : len, notes,
      vel: mods.includes("^") ? 1 : 0.78, legato: mods.includes("~"),
    });
    at += len;
  }
  return { events, steps: at };
}

const DRUM_CHARS = "kshotmcx";
export function parseDrums(src, where = "drums") {
  const events = [];
  const s = String(src).replace(/[|\s]/g, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ".") continue;
    const lower = ch.toLowerCase();
    if (!DRUM_CHARS.includes(lower)) throw new Error(`${where}: unknown drum "${ch}" at step ${i}`);
    events.push({ at: i, hit: lower, vel: ch !== lower ? 1 : 0.7 });
  }
  return { events, steps: s.length };
}

// A track, flattened: per section, every part's events laid out over the
// section's whole length. Throws (with a readable path) on any mistake.
//   track.meter  steps per bar (default 16 = 4/4; 12 = 3/4 or 6/8)
export function compileTrack(track) {
  const meter = track.meter || 16;
  const out = { meter, sections: {}, order: track.order, stepSec: 60 / track.bpm / 4 };
  if (!track.order?.length) throw new Error(`${track.id}: empty order`);
  for (const [sname, sec] of Object.entries(track.sections)) {
    const total = sec.bars * meter;
    const events = [];
    for (const [pname, src] of Object.entries(sec.play || {})) {
      const part = track.parts[pname];
      if (!part) throw new Error(`${track.id}/${sname}: no part "${pname}" declared`);
      const where = `${track.id}/${sname}/${pname}`;
      const parsed = part.inst === "drums" ? parseDrums(src, where) : parseMelodic(src, where);
      if (parsed.steps === 0) continue;
      if (total % parsed.steps !== 0) {
        throw new Error(`${where}: pattern is ${parsed.steps} steps (${(parsed.steps / meter).toFixed(2)} bars), which does not divide the section's ${sec.bars} bars`);
      }
      for (let base = 0; base < total; base += parsed.steps) {
        for (const e of parsed.events) events.push({ ...e, at: base + e.at, part: pname });
      }
    }
    events.sort((a, b) => a.at - b.at);
    out.sections[sname] = { steps: total, events };
  }
  for (const s of track.order) if (!out.sections[s]) throw new Error(`${track.id}: order names missing section "${s}"`);
  return out;
}
