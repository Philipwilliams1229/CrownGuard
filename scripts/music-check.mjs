// Checks every track in src/audio/tracks: it parses, every pattern fits its
// section, notes stay inside each instrument's useful range, and the key's
// scale is respected (accidentals that are not in `scale` are listed, not
// failed: a passing chromatic note is fine, a wall of them is a typo).
//
//   node scripts/music-check.mjs            all tracks
//   node scripts/music-check.mjs iron-boss  one track
import { compileTrack, midiToFreq } from "../src/audio/notation.js";

// Node has no localStorage/window: music.js is not imported, only the data.
const { TRACKS } = await import("../src/audio/tracks/index.js");

const RANGE = {   // lowest/highest midi that sounds right
  flute: [60, 96], oboe: [58, 91], clarinet: [50, 91], strings: [36, 88], pizz: [36, 84], harp: [36, 100],
  lute: [40, 84], brass: [46, 84], horn: [36, 77], bass: [28, 60], sbass: [28, 62], organ: [36, 96], bell: [60, 108],
  celesta: [60, 108], choir: [48, 79], pad: [36, 84], chip: [48, 100], timpani: [33, 55],
};
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11] };
const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

const only = process.argv[2];
let bad = 0;
for (const [id, track] of Object.entries(TRACKS)) {
  if (only && id !== only) continue;
  try {
    const song = compileTrack(track);
    const secs = song.order.reduce((n, s) => n + song.sections[s].steps, 0) * song.stepSec;
    const problems = [];
    const outside = {};
    let accidentals = 0, total = 0;
    const m = /^([a-g])([#b]?)\s+(\w+)/i.exec(track.key || "");
    const scale = m && SCALES[m[3].toLowerCase()] ? SCALES[m[3].toLowerCase()].map((x) => (x + PC[m[1].toLowerCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 120) % 12) : null;
    for (const [sname, s] of Object.entries(song.sections)) {
      for (const e of s.events) {
        if (e.hit) continue;
        const inst = track.parts[e.part].inst;
        const r = RANGE[inst];
        for (const n of e.notes) {
          const mm = n + (track.parts[e.part].transpose || 0);
          total++;
          if (r && (mm < r[0] || mm > r[1])) outside[`${e.part}(${inst}) midi ${mm}`] = (outside[`${e.part}(${inst}) midi ${mm}`] || 0) + 1;
          if (scale && !scale.includes(((mm % 12) + 12) % 12)) accidentals++;
        }
      }
    }
    for (const [k, v] of Object.entries(outside)) problems.push(`out of range: ${k} x${v}`);
    if (scale && total && accidentals / total > 0.12) problems.push(`${accidentals}/${total} notes are outside ${track.key} — wrong key, or typos`);
    console.log(`${problems.length ? "✗" : "✓"} ${id.padEnd(18)} ${track.bpm} bpm  ${secs.toFixed(0)}s per pass  ${Object.keys(song.sections).join("/")}${accidentals ? `  (${accidentals} accidentals)` : ""}`);
    for (const p of problems) console.log("    " + p);
    if (problems.length) bad++;
  } catch (e) { console.log(`✗ ${id}: ${e.message}`); bad++; }
}
void midiToFreq;
process.exit(bad ? 1 : 0);
