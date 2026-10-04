// ============ THE RIMEWATER ============
// Zone IV: the Rime Clans, sea raiders of a frigid northern ocean. Cold and
// open rather than dark: drones and bare fifths (few thirds in the bed), a
// lyre-like lute, low flute and harp over the swell, and one HORN CALL that
// belongs to the Rime alone — up a fifth, up a fourth, then an answer that
// falls back (G-D-G / A-G-D in the build; B-F#-B in the fight; C#-F#-C# for
// the Jarl). The other areas never use the lute or the glassy pad.
//   rime-build  G dorian, a lilting 6/8 sea-swell (80 bpm): lute lyre in
//               open sus2 shapes over a G-D drone, low flute tune, horn call
//   rime-fight  B minor (aeolian), 4/4 at 96: a rowing pulse — quarter-note
//               bass pulling on 1, kick-and-skin-drum, lute heave figure,
//               flute tune answered by the horn call, held horn fifths
//   rime-boss   F# minor with a phrygian G, 4/4 at 120: the Rime Jarl on his
//               war-mammoth — stomping toms and timpani, big horns doubled by
//               brass, choir, harp ice-shards in the bridge
// Loops: each track loops from its first section after the intro.

// shift every note in a pattern by n octaves ("e5:4 b5" -> "e4:4 b4")
const oct = (s, n) => s.replace(/(^|[\s+|])([a-g][#b]?)(\d)/g, (_, p, nm, d) => p + nm + (Number(d) + n));
const J = (bars) => bars.join(" | ");
// lay a function over a list of chord names, one bar each
const per = (table, names, f) => J(names.map((n, i) => f(table[n], i)));

// ---------------------------------------------------------------------------
// 1. RIME BUILD — "The Grey Swell" · G dorian · 6/8 (12 steps a bar) · 80 bpm
// ---------------------------------------------------------------------------
// dr low drone fifth (strings) · pad glassy sus2 above · ly lute [root, fifth,
// octave, ninth] · bs bass [root, fifth, octave] · tp timpani
const WC = {
  Gm: { dr: "g2+d3", pad: "g3+d4+a4",  ly: ["g3", "d4", "g4", "a4"],   bs: ["g2", "d3", "g3"],   tp: "g2" },
  F:  { dr: "f2+c3", pad: "f3+c4+g4",  ly: ["f3", "c4", "f4", "g4"],   bs: ["f2", "c3", "f3"],   tp: "f2" },
  C:  { dr: "c3+g3", pad: "g3+c4+d4",  ly: ["c4", "g4", "c5", "d5"],   bs: ["c2", "g2", "c3"],   tp: "c2" },
  Bb: { dr: "bb2+f3", pad: "f3+bb3+c4", ly: ["bb3", "f4", "bb4", "c5"], bs: ["bb1", "f2", "bb2"], tp: "bb1" },
  Dm: { dr: "d3+a3", pad: "a3+d4+e4",  ly: ["d4", "a4", "d5", "e5"],   bs: ["d2", "a2", "d3"],   tp: "d2" },
};
const wDrone = (c) => `${c.dr}:12`;
const wPad   = (c) => `${c.pad}:12`;
const wLyre  = (c) => { const [r, f, o, n] = c.ly; return `${r}:2 ${f} ${o} ${n} ${o} ${f}`; };   // rise and fall, six eighths
const wBassS = (c) => `${c.bs[0]}:6 ${c.bs[1]}:4 ${c.bs[2]}:2`;                                   // sparse: the swell
const wBassL = (c) => `${c.bs[0]}:4 ${c.bs[1]}:2 ${c.bs[2]}:4 ${c.bs[1]}:2`;                      // the 6/8 lilt, long-short
const wTimp  = (c, i) => (i % 2 ? "r:12" : `${c.tp}:6 r:6`);                                      // a surf-roll every other bar

const W_IN = ["Gm", "Gm"];
const W_A  = ["Gm", "Gm", "F", "Gm", "Bb", "F", "C", "C"];
const W_B  = ["Bb", "C", "Gm", "Gm", "Bb", "C", "Dm", "Dm"];
const W_BR = ["Dm", "C", "Bb", "F"];          // F -> Gm: the bVII-i that opens A again

// the low flute (12 steps a bar)
const W_FLUTE_A = [
  "d5:4 bb4:2 a4:4 g4:2", "a4:4 bb4:2 d5:6", "c5:4 a4:2 f4:4 g4:2", "bb4:4 a4:2 g4:6",
  "f5:4 d5:2 bb4:4 c5:2", "d5:4 c5:2 a4:6", "g4:4 a4:2 c5:4 e5:2", "d5:12",
];
const W_FLUTE_A2 = [...W_FLUTE_A.slice(0, 7), "d5:6 e5:4 f5:2"];   // leans up into the bridge
const W_FLUTE_B = [
  "f5:6 d5:4 f5:2", "g5:6 e5:4 c5:2", "d5:4 bb4:2 g4:4 bb4:2", "a4:6 d5:6",
  "f5:4 g5:2 f5:4 d5:2", "e5:4 g5:2 c6:6", "a5:4 g5:2 f5:4 e5:2", "d5:12",
];
const W_FLUTE_BR = ["a5:6 f5:4 d5:2", "g5:6 e5:4 c5:2", "f5:6 d5:4 bb4:2", "c5:12"];

// the horn call: up a fifth, up a fourth ... and the answer falling back
const W_CALL = "g3:4 d4:2 g4:6";
const W_ANSWER = "a4:4 g4:2 d4:6";
const W_HORN_BR = ["d4:4 a4:2 d5:6", "e4:4 c4:2 g4:6", "bb3:4 f4:2 bb4:6", "a4:4 g4:2 f4:4 g4:2"];

const rimeBuild = {
  id: "rime-build",
  title: "The Grey Swell",
  area: "rime",
  bpm: 80,
  meter: 12,
  key: "G dorian",
  parts: {
    flute:   { inst: "flute",   gain: 1.0,  pan: 0.1,   send: 0.4 },
    horn:    { inst: "horn",    gain: 0.6,  pan: -0.2,  send: 0.5 },
    lute:    { inst: "lute",    gain: 0.75, pan: -0.25, send: 0.35 },
    harp:    { inst: "harp",    gain: 0.35, pan: 0.35,  send: 0.55 },
    pad:     { inst: "pad",     gain: 0.3,  pan: 0.15,  send: 0.6 },
    drone:   { inst: "strings", gain: 0.5,  pan: 0,     send: 0.45 },
    bass:    { inst: "bass",    gain: 0.75, pan: 0,     send: 0.08 },
    timp:    { inst: "timpani", gain: 0.4,  pan: 0,     send: 0.45 },
    drums:   { inst: "drums",   gain: 0.3,  pan: 0,     send: 0.3 },
  },
  sections: {
    intro: { bars: 2, play: {
      horn: `${W_CALL} | ${W_ANSWER}`,
      drone: per(WC, W_IN, wDrone),
      lute: per(WC, W_IN, wLyre),
      timp: "g2:6 r:18",
    } },
    A: { bars: 8, play: {
      flute: J(W_FLUTE_A),
      horn: J(["r:12", "r:12", "r:12", "r:12", "r:12", "r:12", "r:12", W_CALL]),
      lute: per(WC, W_A, wLyre),
      drone: per(WC, W_A, wDrone),
      bass: per(WC, W_A, wBassS),
      timp: per(WC, W_A, wTimp),
      drums: "k...........",
    } },
    B: { bars: 8, play: {
      flute: J(W_FLUTE_B),
      horn: J(["r:12", "r:12", "r:12", W_ANSWER, "r:12", "r:12", "r:12", "r:12"]),
      lute: per(WC, W_B, wLyre),
      harp: per(WC, W_B, (c) => oct(wLyre(c), 1)),
      pad: per(WC, W_B, wPad),
      drone: per(WC, W_B, wDrone),
      bass: per(WC, W_B, wBassL),
      timp: per(WC, W_B, wTimp),
      drums: "k.....x.....",
    } },
    A2: { bars: 8, play: {
      flute: J(W_FLUTE_A2),
      horn: J(["r:12", "r:12", "r:12", W_CALL, "r:12", "r:12", "r:12", W_ANSWER]),
      lute: per(WC, W_A, wLyre),
      harp: per(WC, W_A, (c) => oct(wLyre(c), 1)),
      pad: per(WC, W_A, wPad),
      drone: per(WC, W_A, wDrone),
      bass: per(WC, W_A, wBassL),
      timp: per(WC, W_A, wTimp),
      drums: "k.....x...x.",
    } },
    bridge: { bars: 4, play: {
      flute: J(W_FLUTE_BR),
      horn: J(W_HORN_BR),
      lute: per(WC, W_BR, wLyre),
      pad: per(WC, W_BR, wPad),
      drone: per(WC, W_BR, wDrone),
      bass: per(WC, W_BR, wBassS),
      timp: J(["d2:6 r:6", "r:12", "bb1:6 r:6", "f2:6 f2:2 f2:2 f2:2"]),
      drums: J(["k.....m.....", "k.....m.....", "k.....m..m..", "k..m..m..tm."]),
    } },
  },
  order: ["intro", "A", "B", "A2", "bridge"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// 2. RIME FIGHT — "Longships" · B minor (aeolian) · 4/4 · 96 bpm
// A rowing pulse under the play: the bass pulls on 1, the kick and a skin
// drum (low tom) trade beats, the lute heaves a dotted figure. Background:
// the flute tune sits low and soft; the horn call answers it.
// ---------------------------------------------------------------------------
// st strings · hn horn fifth (the cold bed) · lu lute [low, mid, high] ·
// hp harp [root, fifth, octave, ninth] · bs bass [root, fifth, octave] · tp timpani
const FC = {
  Bm:    { st: "b3+d4+f#4",  hn: "b2+f#3",  lu: ["b3", "f#4", "b4"],  hp: ["b3", "f#4", "b4", "c#5"], bs: ["b1", "f#2", "b2"],  tp: "b1" },
  A:     { st: "a3+c#4+e4",  hn: "a2+e3",   lu: ["a3", "e4", "a4"],   hp: ["a3", "e4", "a4", "b4"],   bs: ["a1", "e2", "a2"],   tp: "a1" },
  G:     { st: "g3+b3+d4",   hn: "g2+d3",   lu: ["g3", "d4", "g4"],   hp: ["g3", "d4", "g4", "a4"],   bs: ["g1", "d2", "g2"],   tp: "g2" },
  D:     { st: "a3+d4+f#4",  hn: "d3+a3",   lu: ["a3", "d4", "a4"],   hp: ["d4", "a4", "d5", "e5"],   bs: ["d2", "a2", "d3"],   tp: "d2" },
  Em:    { st: "g3+b3+e4",   hn: "e3+b3",   lu: ["b3", "e4", "b4"],   hp: ["e4", "b4", "e5", "f#5"],  bs: ["e2", "b2", "e3"],   tp: "e2" },
  "F#m": { st: "a3+c#4+f#4", hn: "f#2+c#3", lu: ["f#3", "c#4", "f#4"], hp: ["f#3", "c#4", "f#4", "a4"], bs: ["f#1", "c#2", "f#2"], tp: "f#2" },
};
const fStr   = (c) => `${c.st}:16`;
const fHorn  = (c) => `${c.hn}:16`;
const fHeave = (c) => { const [l, m, h] = c.lu; return `${l}:3 ${m}:1 ${h}:4 ${m}:3 ${l}:1 ${m}:4`; };   // heave-ho, heave-ho
const fWave  = (c) => { const [a, b, d, e] = c.hp; return `${a}:2 ${b} ${d} ${e} ${d} ${b} ${d} ${b}`; };
const fRow   = (c) => `${c.bs[0]}:4^ ${c.bs[0]}:4 ${c.bs[2]}:4 ${c.bs[1]}:4`;                         // quarters, the pull on 1
const fTimp  = (c) => `${c.tp}:4 r:12`;                                                                 // one stroke a bar

const F_A  = ["Bm", "A", "G", "A", "Bm", "A", "Em", "F#m"];
const F_B  = ["G", "D", "A", "Bm", "G", "D", "Em", "A"];
const F_BR = ["Em", "Em", "F#m", "F#m"];

const R  = "k...m...k...m...";   // the stroke: kick, skin drum, kick, skin drum
const RP = "k...m...k.k.m...";   // ... with a pickup
const RC = "c...m...k...m...";   // ... opened with a soft crash
const RF = "k...m...k...m.tm";   // ... ending in a tom turn

const F_TUNE_A = [
  "b4:4 d5:2 e5:2 f#5:6 e5:2", "e5:4 c#5:4 a4:8", "d5:4 b4:2 d5:2 g5:6 f#5:2", "e5:12 r:4",
  "b4:4 d5:2 e5:2 f#5:4 b5:4", "a5:6 f#5:2 e5:4 c#5:4", "e5:4 g5:2 f#5:2 e5:4 b4:4", "c#5:6 e5:2 f#5:8",
];
const F_TUNE_A2 = [...F_TUNE_A.slice(0, 7), "c#5:6 e5:2 f#5:4 e5:2 c#5:2"];   // steps down into the loop's b4
const F_TUNE_B = [   // the reeds take the relative major
  "g5:6 f#5:2 d5:4 b4:4", "a5:6 f#5:2 d5:8", "e5:4 a5:4 c#6:6 b5:2", "b5:6 a5:2 f#5:8",
  "d6:4 b5:4 g5:4 b5:4", "a5:6 d6:2 a5:4 f#5:4", "g5:4 f#5:2 e5:2 b5:6 a5:2", "a5:4 e5:4 c#5:8",
];
// the horn call lands on bar 5 of A; in the bridge it carries the tune
const F_CALL_A = J(["r:16", "r:16", "r:16", "r:12 b3:3 f#4:1", "b4:12 r:4", "r:16", "r:16", "r:16"]);
const F_CALL_BR = J(["e4:3 b4:1 e5:8 d5:2 b4:2", "b4:6 a4:2 g4:4 e4:4", "c#4:3 f#4:1 c#5:8 b4:2 a4:2", "c#5:6 b4:2 a4:4 c#5:4"]);

const rimeFight = {
  id: "rime-fight",
  title: "Longships",
  area: "rime",
  bpm: 96,
  key: "B minor",
  parts: {
    flute:   { inst: "flute",    gain: 0.6,  pan: 0.1,   send: 0.35 },
    oboe:    { inst: "oboe",     gain: 0.5,  pan: 0.2,   send: 0.3 },
    clar:    { inst: "clarinet", gain: 0.4,  pan: 0.25,  send: 0.3 },
    call:    { inst: "horn",     gain: 0.6,  pan: -0.15, send: 0.45 },
    horn:    { inst: "horn",     gain: 0.35, pan: -0.25, send: 0.4 },
    lute:    { inst: "lute",     gain: 0.5,  pan: -0.3,  send: 0.2 },
    harp:    { inst: "harp",     gain: 0.4,  pan: 0.35,  send: 0.4 },
    strings: { inst: "strings",  gain: 0.45, pan: 0,     send: 0.4 },
    bass:    { inst: "bass",     gain: 0.65, pan: 0,     send: 0.05 },
    timp:    { inst: "timpani",  gain: 0.45, pan: 0,     send: 0.3 },
    drums:   { inst: "drums",    gain: 0.4,  pan: 0,     send: 0.12 },
  },
  sections: {
    intro: { bars: 2, play: {
      call: "b3:3 f#4:1 b4:12 | c#5:4 b4:4 f#4:8",
      horn: "b2+f#3:32",
      lute: per(FC, ["Bm", "Bm"], fHeave),
      bass: per(FC, ["Bm", "Bm"], fRow),
      timp: "b1:4 r:12 | b1:4 r:12",
      drums: "k...m...k...m... | k...m...k.k.m.tm",
    } },
    A: { bars: 8, play: {
      flute: J(F_TUNE_A),
      call: F_CALL_A,
      horn: per(FC, F_A, fHorn),
      lute: per(FC, F_A, fHeave),
      strings: per(FC, F_A, fStr),
      bass: per(FC, F_A, fRow),
      timp: per(FC, F_A, fTimp),
      drums: J([RC, R, R, RP, R, R, R, RF]),
    } },
    B: { bars: 8, play: {
      oboe: J(F_TUNE_B),
      horn: per(FC, F_B, fHorn),
      lute: per(FC, F_B, fHeave),
      harp: per(FC, F_B, fWave),
      strings: per(FC, F_B, fStr),
      bass: per(FC, F_B, fRow),
      timp: per(FC, F_B, fTimp),
      drums: J([RC, RP, R, RP, R, RP, R, RF]),
    } },
    bridge: { bars: 4, play: {
      call: F_CALL_BR,
      lute: per(FC, F_BR, fHeave),
      strings: per(FC, F_BR, fStr),
      bass: per(FC, F_BR, fRow),
      timp: J(["e2:4^ r:12", "e2:4^ r:12", "f#2:4^ r:4 f#2:4 r:4", "f#2:2 f#2:2 f#2:2 f#2:2 f#2:2^ f#2:2^ f#2:2^ f#2:2^"]),
      drums: J(["m.......m.......", "m...m...m...m...", "k...m...k...m...", "k...m...k.m.t.tm"]),
    } },
    A2: { bars: 8, play: {
      flute: J(F_TUNE_A2),
      clar: oct(J(F_TUNE_A2), -1),
      call: F_CALL_A,
      horn: per(FC, F_A, fHorn),
      lute: per(FC, F_A, fHeave),
      harp: per(FC, F_A, fWave),
      strings: per(FC, F_A, fStr),
      bass: per(FC, F_A, fRow),
      timp: per(FC, F_A, fTimp),
      drums: J([RC, R, R, RP, R, R, R, RF]),
    } },
  },
  order: ["intro", "A", "B", "bridge", "A2"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// 3. RIME BOSS — "The Rime Jarl" · F# minor (a phrygian G) · 4/4 · 120 bpm
// The war-mammoth's tread: heavy toms and timpani on every beat, big horns
// with the brass on top, a driving bass, choir in the B half, and harp
// ice-shards over the bridge. The call is the build's, a fifth/fourth leap.
// ---------------------------------------------------------------------------
// st strings · ch choir · lo low horn fifth · br brass dyad (stabs) ·
// hp harp shard [four notes] · bs bass [root, fifth, octave] · tp timpani
const XC = {
  "F#m": { st: "f#3+c#4+f#4", ch: "c#4+f#4+a4", lo: "f#2+c#3", br: "c#4+f#4", hp: ["f#5", "a5", "c#6", "f#6"], bs: ["f#1", "c#2", "f#2"], tp: "f#2" },
  D:     { st: "f#3+a3+d4",   ch: "d4+f#4+a4",  lo: "d2+a2",   br: "d4+a4",   hp: ["d5", "f#5", "a5", "d6"],  bs: ["d2", "a2", "d3"],   tp: "d2" },
  E:     { st: "g#3+b3+e4",   ch: "e4+g#4+b4",  lo: "e2+b2",   br: "e4+b4",   hp: ["e5", "g#5", "b5", "e6"],  bs: ["e2", "b2", "e3"],   tp: "e2" },
  G:     { st: "g3+b3+d4",    ch: "d4+g4+b4",   lo: "g2+d3",   br: "d4+g4",   hp: ["g5", "b5", "d6", "g6"],   bs: ["g1", "d2", "g2"],   tp: "g2" },
  Bm:    { st: "f#3+b3+d4",   ch: "d4+f#4+b4",  lo: "b2+f#3",  br: "b3+f#4",  hp: ["b5", "d6", "f#6", "b6"],  bs: ["b1", "f#2", "b2"],  tp: "b1" },
  "C#m": { st: "g#3+c#4+e4",  ch: "c#4+e4+g#4", lo: "c#3+g#3", br: "c#4+g#4", hp: ["c#5", "e5", "g#5", "c#6"], bs: ["c#2", "g#2", "c#3"], tp: "c#2" },
};
const xStr   = (c) => `${c.st}:16`;
const xChoir = (c) => `${c.ch}:16`;
const xLo    = (c) => `${c.lo}:16`;
const xDrive = (c) => { const [r, f, o] = c.bs; return `${r}:2^ ${r}:2 ${o}:2 ${r}:2 ${r}:2^ ${r}:2 ${f}:2 ${o}:2`; };
const xTread = (c) => `${c.tp}:3^ ${c.tp}:1 r:4 ${c.tp}:4^ r:4`;                 // the mammoth's tread: 1 (with a drag), 3
const xStab  = (c) => `${c.br}:2^ r:6 ${c.br}:2^ r:2 ${c.br}:2 r:2`;
const xShard = (c) => { const [a, b, d, e] = c.hp; return `${a}:1 ${b} ${d} ${e} `.repeat(2) + `${e}:1 ${d} ${b} ${a} `.repeat(2); };

const X_IN = ["F#m", "F#m", "D", "E"];
const X_A  = ["F#m", "F#m", "D", "E", "F#m", "G", "E", "F#m"];
const X_A2 = ["F#m", "F#m", "D", "E", "F#m", "G", "E", "E"];   // ends on E, so the loop lands bVII -> i
const X_B  = ["D", "E", "F#m", "F#m", "D", "E", "Bm", "C#m"];
const X_BR = ["Bm", "G", "E", "E"];

const T1 = "K..mM...K..mM...";   // tread
const T2 = "K..mM..mK.mmM.t.";   // tread, restless
const TC = "C..mM...K..mM...";   // tread with a crash
const TF = "K..mM.mmT.TtMmMM";   // a tom avalanche into the next phrase

const X_HORN_A = [
  "c#4:3 f#4:1 c#5:8 b4:2 a4:2", "a4:4 b4:2 a4:2 f#4:8", "a4:4 f#4:2 a4:2 d5:8", "e5:6 d5:2 b4:4 g#4:4",
  "c#4:3 f#4:1 c#5:8 b4:2 a4:2", "b4:4 d5:4 b4:4 g4:4", "g#4:4 b4:4 e5:6 d5:2", "c#5:8 a4:4 f#4:4",
];
const X_HORN_A2 = [...X_HORN_A.slice(0, 7), "e5:6 d5:2 b4:4 g#4:4"];
const X_BRASS_B = [
  "f#5:6 e5:2 d5:4 a4:4", "g#5:6 f#5:2 e5:4 b4:4", "a5:4 g#5:4 f#5:4 c#5:4", "f#5:8 e5:4 c#5:4",
  "d5:4 f#5:4 a5:8", "b5:6 a5:2 g#5:4 e5:4", "f#5:4 d5:4 b4:4 d5:4", "c#5:4 e5:4 g#5:8",
];
const X_HORN_BR = ["f#4:8 d4:8", "g4:8 b4:8", "g#4:8 b4:8", "e4:4 g#4:4 b4:4 d5:4"];

const rimeBoss = {
  id: "rime-boss",
  title: "The Rime Jarl",
  area: "rime",
  bpm: 120,
  key: "F# minor",   // the G chord's G natural is the phrygian bII: counted, not wrong
  parts: {
    horn:    { inst: "horn",    gain: 0.95, pan: 0.05,  send: 0.35 },
    brass:   { inst: "brass",   gain: 0.6,  pan: -0.1,  send: 0.3 },
    hornlo:  { inst: "horn",    gain: 0.5,  pan: -0.25, send: 0.35 },
    choir:   { inst: "choir",   gain: 0.5,  pan: 0,     send: 0.5 },
    strings: { inst: "strings", gain: 0.5,  pan: 0.15,  send: 0.4 },
    harp:    { inst: "harp",    gain: 0.4,  pan: 0.35,  send: 0.55 },
    bass:    { inst: "bass",    gain: 0.75, pan: 0,     send: 0.05 },
    timp:    { inst: "timpani", gain: 0.65, pan: 0,     send: 0.25 },
    drums:   { inst: "drums",   gain: 0.55, pan: 0,     send: 0.15 },
  },
  sections: {
    intro: { bars: 4, play: {
      strings: "f#2+c#3:64",
      hornlo: "r:32 | " + per(XC, ["D", "E"], xLo),
      horn: "r:32 | c#3:3 f#3:1 c#4:8 b3:2 a3:2 | b3:8 g#3:8",
      choir: "r:32 | " + per(XC, ["D", "E"], xChoir),
      bass: "r:32 | " + per(XC, ["D", "E"], xDrive),
      timp: J(["f#2:4^ r:4 f#2:4^ r:4", "f#2:4^ r:4 f#2:4^ r:4", xTread(XC.D), "e2:2 e2:2 e2:2 e2:2 e2:2^ e2:2^ e2:2^ e2:2^"]),
      drums: J(["M.......M.......", "M.......M...m.m.", T1, TF]),
    } },
    A: { bars: 8, play: {
      horn: J(X_HORN_A),
      hornlo: per(XC, X_A, xLo),
      strings: per(XC, X_A, xStr),
      bass: per(XC, X_A, xDrive),
      timp: per(XC, X_A, xTread),
      drums: J([TC, T1, T1, T2, T1, T1, T2, TF]),
    } },
    B: { bars: 8, play: {
      brass: J(X_BRASS_B),
      horn: oct(J(X_BRASS_B), -1),
      choir: per(XC, X_B, xChoir),
      strings: per(XC, X_B, xStr),
      bass: per(XC, X_B, xDrive),
      timp: per(XC, X_B, xTread),
      drums: J([TC, T1, T2, T1, T1, T2, T1, TF]),
    } },
    bridge: { bars: 4, play: {
      hornlo: J(X_HORN_BR),
      brass: per(XC, X_BR, xStab),
      harp: per(XC, X_BR, xShard),
      choir: per(XC, X_BR, xChoir),
      strings: per(XC, X_BR, xStr),
      bass: per(XC, X_BR, xDrive),
      timp: J([xTread(XC.Bm), xTread(XC.G), "e2:4^ r:4 e2:2 e2:2 e2:2 e2:2", "e2:2 e2:2 e2:2 e2:2 e2:2^ e2:2^ e2:2^ e2:2^"]),
      drums: J(["M.......M.......", "M...m...M...m...", "M.m.M.m.M.m.M.m.", "MmMmTtTtSsSsSSSS"]),
    } },
    A2: { bars: 8, play: {
      horn: J(X_HORN_A2),
      brass: J(X_HORN_A2),
      hornlo: per(XC, X_A2, xLo),
      choir: per(XC, X_A2, xChoir),
      strings: per(XC, X_A2, xStr),
      bass: per(XC, X_A2, xDrive),
      timp: per(XC, X_A2, xTread),
      drums: J([TC, T1, T1, T2, T1, T1, T2, TF]),
    } },
  },
  order: ["intro", "A", "B", "bridge", "A2"],
  loopFrom: 1,
};

export default [rimeBuild, rimeFight, rimeBoss];
