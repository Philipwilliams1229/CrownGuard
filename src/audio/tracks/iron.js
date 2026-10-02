// ============ THE IRON MARCHES ============
// Grey stone, cold highlands, disciplined columns. Brass and reeds over low
// strings, a marching snare and timpani. Three tracks: a solemn build (D
// dorian), a driving fight (E minor) and the Lord Marshal's boss theme
// (C minor). Written bar by bar; the helpers below only lay out repeated
// bar patterns (every bar is exactly 16 steps).

const J = (bars) => bars.join(" | ");
// shift every note in a pattern by whole octaves (n = +1 / -1): doublings
const oct = (src, n) => src.replace(/\b([a-g][#b]?)(\d)/g, (_, p, o) => p + (Number(o) + n));
// lay a function over a list of chord names, one bar each
const per = (table, names, f) => J(names.map((n) => f(table[n])));

// =========================================================================
// 1. iron-build — "Marshalling the Line" · D dorian · 86 bpm
// =========================================================================
// s strings voicing · h harp [root, fifth, third, top] · b bass [root, fifth, octave] · t timpani
const BC = {
  Dm: { s: "a3+d4+f4",  h: ["d3", "a3", "d4", "f4"],  b: ["d2", "a2", "d3"],  t: "d2" },
  C:  { s: "g3+c4+e4",  h: ["c3", "g3", "c4", "e4"],  b: ["c2", "g2", "c3"],  t: "c2" },
  G:  { s: "g3+b3+d4",  h: ["g2", "d3", "g3", "b3"],  b: ["g2", "d3", "g3"],  t: "g2" },
  Am: { s: "a3+c4+e4",  h: ["a2", "e3", "a3", "c4"],  b: ["a2", "e3", "a3"],  t: "a2" },
  F:  { s: "a3+c4+f4",  h: ["f2", "c3", "f3", "a3"],  b: ["f2", "c3", "f3"],  t: "f2" },
  Bb: { s: "bb3+d4+f4", h: ["bb2", "f3", "bb3", "d4"], b: ["bb1", "f2", "bb2"], t: "bb1" },
  A:  { s: "a3+c#4+e4", h: ["a2", "e3", "a3", "c#4"], b: ["a2", "e3", "a3"],  t: "a2" },
};
const bPad   = (c) => `${c.s}:16`;
const bHarpQ = (c) => `${c.h[0]}:4 ${c.h[2]}:4 ${c.h[3]}:4 ${c.h[2]}:4`;                       // rolling quarters
const bHarpE = (c) => `${c.h[0]}:2 ${c.h[1]}:2 ${c.h[2]}:2 ${c.h[3]}:2 ${c.h[2]}:2 ${c.h[1]}:2 ${c.h[2]}:2 ${c.h[1]}:2`; // eighth arpeggio
const bBassA = (c) => `${c.b[0]}:4 ${c.b[1]}:4 ${c.b[2]}:4 ${c.b[1]}:4`;
const bBassB = (c) => `${c.b[0]}:4 ${c.b[2]}:2 ${c.b[2]}:2 ${c.b[1]}:4 ${c.b[2]}:2 ${c.b[1]}:2`;
const bTimp  = (c) => `${c.t}:4^ r:4 ${c.t}:4 r:4`;

const B_INTRO = ["Dm", "C"];
const B_A = ["Dm", "C", "Dm", "Am", "Dm", "C", "G", "C"];
const B_B = ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C"];
const B_BR = ["Bb", "C", "A", "A"];

const mA = "k.x.s.x.k.x.s.x.", mA4 = "k.x.s.x.k.x.s.ss";
const mB = "k.h.s.h.k.h.s.h.", mB4 = "k.h.s.h.k.h.ssss";

const A_LEAD = [
  "d5:6 e5:2 f5:4 a5:4", "g5:6 f5:2 e5:4 c5:4", "d5:6 f5:2 a5:4 d6:4", "c6:6 b5:2 a5:8",
  "d5:6 e5:2 f5:4 a5:4", "g5:6 a5:2 g5:4 e5:4", "d6:6 c6:2 b5:4 g5:4", "e6:6 d6:2 c6:8",
];
const B_LEAD = [
  "a5:4 c6:4 f6:6 e6:2", "g6:4 e6:4 c6:8", "d6:6 c6:2 a5:4 f5:4", "bb5:4 d6:4 f6:8",
  "a5:4 c6:4 f6:6 g6:2", "g6:4 a6:2 g6:2 e6:4 c6:4", "bb5:4 d6:4 f6:4 g6:4", "g6:6 f6:2 e6:8",
];
const BR_LEAD = ["d6:8 f6:8", "e6:8 g6:8", "e6:4 c#6:4 a5:8", "e6:6 c#6:2 a5:8"];

const IRON_BUILD = {
  id: "iron-build",
  title: "Marshalling the Line",
  area: "iron",
  bpm: 86,
  key: "D dorian",
  parts: {
    oboe:    { inst: "oboe",    gain: 1.0,  pan: 0.1,   send: 0.3 },
    flute:   { inst: "flute",   gain: 0.85, pan: -0.1,  send: 0.35 },
    horn:    { inst: "horn",    gain: 0.6,  pan: -0.2,  send: 0.35 },
    strings: { inst: "strings", gain: 0.6,  pan: 0,     send: 0.4 },
    harp:    { inst: "harp",    gain: 0.6,  pan: 0.3,   send: 0.35 },
    bass:    { inst: "bass",    gain: 0.85, pan: 0,     send: 0.05 },
    timp:    { inst: "timpani", gain: 0.5,  pan: 0,     send: 0.3 },
    drums:   { inst: "drums",   gain: 0.45, pan: 0,     send: 0.1 },
  },
  sections: {
    intro: { bars: 2, play: {
      oboe: "r:16 | r:8 a4:4 c5:4",
      strings: per(BC, B_INTRO, bPad),
      harp: per(BC, B_INTRO, bHarpQ),
      timp: per(BC, B_INTRO, bTimp),
      drums: "................ | x.x.x.x.x.x.x.x.",
    } },
    A: { bars: 8, play: {
      oboe: J(A_LEAD),
      horn: J(["a4:8 f4:8", "g4:8 e4:8", "a4:8 f4:8", "e4:8 a4:8", "f4:8 a4:8", "g4:8 c5:8", "b4:8 g4:8", "e4:8 g4:8"]),
      strings: per(BC, B_A, bPad),
      harp: per(BC, B_A, bHarpQ),
      bass: per(BC, B_A, bBassA),
      timp: per(BC, B_A, bTimp),
      drums: J([mA, mA, mA, mA4, mA, mA, mA, mA4]),
    } },
    B: { bars: 8, play: {
      flute: J(B_LEAD),
      horn: J(["a4:16", "g4:16", "f4:16", "f4:16", "a4:16", "g4:16", "f4:16", "e4:16"]),
      strings: per(BC, B_B, bPad),
      harp: per(BC, B_B, bHarpE),
      bass: per(BC, B_B, bBassB),
      timp: per(BC, B_B, bTimp),
      drums: J([mB, mB, mB, mB4, mB, mB, mB, mB4]),
    } },
    bridge: { bars: 4, play: {
      oboe: J(BR_LEAD),
      flute: oct(J(BR_LEAD), -1),
      horn: J(["f4:16", "e4:16", "e4:16", "e4:16"]),
      strings: per(BC, B_BR, bPad),
      harp: per(BC, B_BR, bHarpE),
      bass: per(BC, B_BR, bBassB),
      timp: J([bTimp(BC.Bb), bTimp(BC.C), "a2:4^ r:4 a2:2 a2:2 a2:2 a2:2", "a2:2 a2:2 a2:2 a2:2 a2:2^ a2:2^ a2:2^ a2:2^"]),
      drums: J([mA, mA, "k.x.s.s.k.s.s.s.", "k.s.s.s.ssssSSSS"]),
    } },
  },
  order: ["intro", "A", "B", "bridge"],
  loopFrom: 1,
};

// =========================================================================
// 2. iron-fight — "The Iron Host Marches" · E minor · 96 bpm
// A steady, unhurried march under the play (owner, 2026-10-02: normal waves
// sit in the background; only the boss theme drives).
// =========================================================================
// s strings · p pizz stab triad · b bass [root, fifth, octave] · t timpani
const FC = {
  Em: { s: "g3+b3+e4",  p: "e4+g4+b4",   b: ["e2", "b2", "e3"],  t: "e2" },
  C:  { s: "g3+c4+e4",  p: "e4+g4+c5",   b: ["c2", "g2", "c3"],  t: "c2" },
  D:  { s: "a3+d4+f#4", p: "d4+f#4+a4",  b: ["d2", "a2", "d3"],  t: "d2" },
  G:  { s: "g3+b3+d4",  p: "d4+g4+b4",   b: ["g2", "d3", "g3"],  t: "g2" },
  Am: { s: "a3+c4+e4",  p: "e4+a4+c5",   b: ["a2", "e3", "a3"],  t: "a2" },
  B:  { s: "b3+d#4+f#4", p: "d#4+f#4+b4", b: ["b1", "f#2", "b2"], t: "b1" },
};
const fPad    = (c) => `${c.s}:16`;
const fOstA   = (c) => `${c.b[0]}:4 ${c.b[2]}:4 ${c.b[0]}:4 ${c.b[1]}:4`;                          // marching quarters
const fOstB   = (c) => `${c.b[0]}:6 ${c.b[0]}:2 ${c.b[2]}:4 ${c.b[1]}:4`;
const fQuarter = (c) => `${c.b[0]}:4 ${c.b[0]}:4 ${c.b[0]}:4 ${c.b[0]}:4`;
const fOff    = (c) => `r:2 ${c.p}:2 r:2 ${c.p}:2 r:2 ${c.p}:2 r:2 ${c.p}:2`;       // upbeat stabs
const fGallop = (c) => `${c.p}:3 ${c.p}:3 ${c.p}:2 ${c.p}:3 ${c.p}:3 ${c.p}:2`;      // 3+3+2
const fTimp   = (c) => `${c.t}:4 r:12`;                                                  // one stroke a bar

const F_INTRO = ["Em", "Em"];
const F_A = ["Em", "Em", "C", "D", "Em", "Em", "C", "B"];
const F_B = ["C", "G", "D", "Em", "C", "G", "Am", "B"];
const F_BR = ["Em", "Em", "C", "B"];

const fMain = "k...s...k...s...", fCrash = "c...s...k...s...";
const fFill1 = "k...s...k...s.s.", fFill2 = "k...s...k.s.s.ss";
const fMainB = "k...s...k.k.s...";

const FA_LEAD = [
  "e5:3 e5:1 g5:4 b5:4 g5:4", "e5:3 e5:1 g5:4 a5:2 g5:2 e5:4", "c5:3 c5:1 e5:4 g5:4 e5:4", "d5:3 d5:1 f#5:4 a5:4 f#5:4",
  "g5:3 g5:1 b5:4 g5:4 e5:4", "e5:3 e5:1 g5:4 b5:4 c6:4", "c6:4 b5:2 a5:2 g5:4 e5:4", "b4:4 d#5:4 f#5:4 a5:4",
];
const FA2_LEAD = [
  "e5:3 e5:1 g5:4 b5:4 g5:4", "e5:3 e5:1 g5:4 a5:4 b5:4", "c5:3 c5:1 e5:4 g5:4 e5:4", "d5:3 d5:1 f#5:4 a5:4 f#5:4",
  "g5:3 g5:1 b5:4 g5:4 e5:4", "e5:3 e5:1 g5:4 b5:4 c6:4", "c6:4 b5:2 a5:2 g5:4 e5:4", "b4:4 d#5:4 f#5:4 b5:4",
];
const FB_LEAD = [
  "c5:4 e5:4 g5:6 a5:2", "b5:6 a5:2 g5:4 d5:4", "a5:6 f#5:2 d5:4 f#5:4", "g5:4 b5:4 e5:8",
  "c5:4 e5:4 g5:6 c6:2", "b5:6 g5:2 d5:4 g5:4", "a5:4 g5:2 e5:2 c5:4 e5:4", "d#5:4 f#5:4 b5:8",
];
const F_DESCANT = ["e6:16", "d6:8 b5:8", "c6:8 e6:8", "d6:8 a5:8", "g6:8 e6:8", "b5:8 e6:8", "g6:8 e6:8", "f#6:16"];
const FBR_OBOE = ["b5:6 a5:2 g5:4 e5:4", "g5:6 f#5:2 e5:8", "e5:4 g5:4 c6:4 e6:4", "f#5:4 b5:4 d#6:4 f#6:4"];

const IRON_FIGHT = {
  id: "iron-fight",
  title: "The Iron Host Marches",
  area: "iron",
  bpm: 96,
  key: "E minor",
  parts: {
    lead:    { inst: "brass",   gain: 0.75, pan: 0.05,  send: 0.25 },
    oboe:    { inst: "oboe",    gain: 0.45, pan: 0.2,   send: 0.3 },
    horn:    { inst: "horn",    gain: 0.45, pan: -0.2,  send: 0.3 },
    pizz:    { inst: "pizz",    gain: 0.4,  pan: 0.3,   send: 0.2 },
    strings: { inst: "strings", gain: 0.55, pan: 0,     send: 0.4 },
    bass:    { inst: "bass",    gain: 0.75, pan: 0,     send: 0.05 },
    timp:    { inst: "timpani", gain: 0.45, pan: 0,     send: 0.25 },
    drums:   { inst: "drums",   gain: 0.4,  pan: 0,     send: 0.08 },
  },
  sections: {
    intro: { bars: 2, play: {
      lead: "r:16 | r:8 e5:2 g5:2 b5:4",
      strings: "g3+b3+e4:32",
      bass: "r:16 | " + fOstA(FC.Em),
      timp: "r:16 | e2:4^ r:4 e2:4 r:4",
      drums: "s.......s.......|s...s...s.s.s.s.",
    } },
    A: { bars: 8, play: {
      lead: J(FA_LEAD),
      pizz: per(FC, F_A, fOff),
      strings: per(FC, F_A, fPad),
      bass: per(FC, F_A, fOstA),
      timp: per(FC, F_A, fTimp),
      drums: J([fCrash, fMain, fMain, fFill1, fMain, fMain, fMain, fFill2]),
    } },
    B: { bars: 8, play: {
      lead: J(FB_LEAD),
      horn: oct(J(FB_LEAD), -1),
      pizz: per(FC, F_B, fOff),
      strings: per(FC, F_B, fPad),
      bass: per(FC, F_B, fOstB),
      timp: per(FC, F_B, fTimp),
      drums: J([fCrash, fMainB, fMainB, fFill1, fMainB, fMainB, fMainB, fFill2]),
    } },
    bridge: { bars: 4, play: {
      oboe: J(FBR_OBOE),
      horn: J(["b3:16", "b3:16", "c4:16", "b3:16"]),
      strings: per(FC, F_BR, fPad),
      bass: per(FC, F_BR, fQuarter),
      timp: J(["e2:4^ r:12", "e2:4^ r:12", "c2:4^ r:4 c2:4 r:4", "b1:2 b1:2 b1:2 b1:2 b1:2^ b1:2^ b1:2^ b1:2^"]),
      drums: J(["k...x...k...x...", "k...x...k...x...", "k...x...k.x.x...", "k...s...s.s.s.tm"]),
    } },
    A2: { bars: 8, play: {
      lead: J(FA2_LEAD),
      horn: oct(J(FA2_LEAD), -1),
      oboe: J(F_DESCANT),
      pizz: per(FC, F_A, fOff),
      strings: per(FC, F_A, fPad),
      bass: per(FC, F_A, fOstA),
      timp: per(FC, F_A, fTimp),
      drums: J([fCrash, fMain, fMain, fFill1, fMain, fMain, fMain, fFill2]),
    } },
  },
  order: ["intro", "A", "B", "bridge", "A2"],
  loopFrom: 1,
};

// =========================================================================
// 3. iron-boss — "The Lord Marshal" · C minor · 124 bpm
// =========================================================================
// s strings · c choir · b bass [root, fifth, octave] · t timpani
const XC = {
  Cm: { s: "g3+c4+eb4",  c: "g4+c5+eb5",  b: ["c2", "g2", "c3"],    t: "c2" },
  Ab: { s: "ab3+c4+eb4", c: "eb4+ab4+c5", b: ["ab1", "eb2", "ab2"], t: "ab2" },
  Bb: { s: "bb3+d4+f4",  c: "f4+bb4+d5",  b: ["bb1", "f2", "bb2"],  t: "bb1" },
  G:  { s: "g3+b3+d4",   c: "g4+b4+d5",   b: ["g1", "d2", "g2"],    t: "g2" },
  Fm: { s: "ab3+c4+f4",  c: "f4+ab4+c5",  b: ["f2", "c3", "f3"],    t: "f2" },
  Db: { s: "ab3+db4+f4", c: "f4+ab4+db5", b: ["db2", "ab2", "db3"], t: "db2" },
  Eb: { s: "bb3+eb4+g4", c: "g4+bb4+eb5", b: ["eb2", "bb2", "eb3"], t: "eb2" },
};
const xStr   = (c) => `${c.s}:16`;
const xChoir = (c) => `${c.c}:16`;
const xTres  = (c) => `${c.b[0]}:3 ${c.b[2]}:3 ${c.b[0]}:2 ${c.b[0]}:3 ${c.b[2]}:3 ${c.b[0]}:2`;   // relentless 3+3+2
const xPulse = (c) => `${c.b[0]}:2 ${c.b[0]}:2 ${c.b[2]}:2 ${c.b[0]}:2 ${c.b[0]}:2 ${c.b[0]}:2 ${c.b[2]}:2 ${c.b[0]}:2`;
const xSlow  = (c) => `${c.b[0]}:4 r:4 ${c.b[2]}:4 r:4`;
const xTimp  = (c) => `${c.t}:4^ r:4 ${c.t}:4 r:2 ${c.t}:2`;
const xTimp2 = (c) => `${c.t}:3^ ${c.t}:3 ${c.t}:2 ${c.t}:3^ ${c.t}:3 ${c.t}:2`;
const xTimpB = (c) => `${c.t}:4^ r:4 ${c.t}:2 ${c.t}:2 ${c.t}:4`;

const X_INTRO = ["Cm", "Cm", "Ab", "G"];
const X_A = ["Cm", "Ab", "Bb", "G", "Cm", "Fm", "Db", "G"];
const X_B = ["Eb", "Bb", "Fm", "Cm", "Ab", "Eb", "G", "G"];
const X_BR = ["Cm", "Cm", "Ab", "G"];

const xBd = "K.h.h.k.S.h.h.h.", xBdFill = "K.h.h.k.S.h.mmtt", xBdCrash = "c.h.h.k.S.h.h.h.";
const xBdB = "K.o.h.k.S.o.h.k.";

const XA_LEAD = [
  "c5:6 eb5:2 g5:4 c6:4", "ab5:6 g5:2 eb5:4 c5:4", "bb4:4 d5:4 f5:4 bb5:4", "b4:6 c5:2 d5:8",
  "c5:6 eb5:2 g5:4 c6:4", "ab5:4 c6:4 ab5:4 f5:4", "f5:6 ab5:2 f5:4 db5:4", "g5:6 f5:2 d5:4 b4:4",
];
const XA2_LEAD = [
  "c5:6 eb5:2 g5:4 c6:4", "ab5:6 g5:2 eb5:4 c5:4", "bb4:4 d5:4 f5:4 bb5:4", "b4:6 c5:2 d5:8",
  "c5:6 eb5:2 g5:4 c6:4", "ab5:4 c6:4 c6:4 ab5:4", "f5:4 ab5:4 db5:4 f5:4", "g5:6 f5:2 d5:4 b4:4",
];
const XB_LEAD = [
  "bb4:4 eb5:4 g5:6 f5:2", "d5:4 f5:4 bb5:8", "c6:6 bb5:2 ab5:4 f5:4", "g5:6 f5:2 eb5:4 c5:4",
  "eb5:4 ab5:4 c6:8", "bb5:6 g5:2 eb5:4 g5:4", "b4:4 d5:4 g5:4 b5:4", "b5:8 g5:4 d5:4",
];

const IRON_BOSS = {
  id: "iron-boss",
  title: "The Lord Marshal",
  area: "iron",
  bpm: 124,
  key: "C minor",
  parts: {
    lead:    { inst: "brass",   gain: 1.0,  pan: 0.05,  send: 0.3 },
    horn:    { inst: "horn",    gain: 0.7,  pan: -0.25, send: 0.3 },
    choir:   { inst: "choir",   gain: 0.6,  pan: 0,     send: 0.5 },
    strings: { inst: "strings", gain: 0.55, pan: 0.1,   send: 0.4 },
    bell:    { inst: "bell",    gain: 0.5,  pan: 0.3,   send: 0.5 },
    bass:    { inst: "bass",    gain: 0.9,  pan: 0,     send: 0.05 },
    timp:    { inst: "timpani", gain: 0.6,  pan: 0,     send: 0.3 },
    drums:   { inst: "drums",   gain: 0.55, pan: 0,     send: 0.1 },
  },
  sections: {
    intro: { bars: 4, play: {
      lead: "r:16 | r:16 | r:16 | r:8 g4:4 b4:4",
      horn: "r:16 | r:16 | eb4:16 | d4:16",
      choir: "g4+c5+eb5:32 | eb4+ab4+c5:16 | g4+b4+d5:16",
      strings: "g3+c4+eb4:32 | ab3+c4+eb4:16 | g3+b3+d4:16",
      bell: "c6:16 | r:16 | ab5:16 | g5:16",
      bass: "r:16 | r:16 | " + xSlow(XC.Ab) + " | " + xSlow(XC.G),
      timp: J(["c2:4^ r:12", "c2:4^ r:4 c2:4 r:4", "ab2:4^ r:4 ab2:4 r:4", "g2:4^ r:4 g2:2 g2:2 g2:4"]),
      drums: J(["................", "................", "................", "k...k...k.k.mmtt"]),
    } },
    A: { bars: 8, play: {
      lead: J(XA_LEAD),
      horn: oct(J(XA_LEAD), -1),
      choir: per(XC, X_A, xChoir),
      strings: per(XC, X_A, xStr),
      bass: per(XC, X_A, xTres),
      timp: per(XC, X_A, xTimp),
      drums: J([xBdCrash, xBd, xBd, xBdFill, xBd, xBd, xBd, xBdFill]),
    } },
    B: { bars: 8, play: {
      lead: J(XB_LEAD),
      horn: oct(J(XB_LEAD), -1),
      choir: per(XC, X_B, xChoir),
      strings: per(XC, X_B, xStr),
      bass: per(XC, X_B, xPulse),
      timp: per(XC, X_B, xTimpB),
      drums: J([xBdCrash, xBdB, xBdB, xBdFill, xBdB, xBdB, xBdB, xBdFill]),
    } },
    bridge: { bars: 4, play: {
      horn: J(["g4:12 f4:4", "eb4:8 d4:8", "eb4:12 c4:4", "d4:12 b3:4"]),
      choir: "g4+c5+eb5:32 | eb4+ab4+c5:16 | g4+b4+d5:16",
      strings: "g3+c4+eb4:32 | ab3+c4+eb4:16 | g3+b3+d4:16",
      bell: "c6:16 | r:16 | ab5:16 | g5:8 b5:8",
      bass: per(XC, X_BR, xSlow),
      timp: J(["c2:4^ r:12", "c2:4^ r:4 c2:4 r:4", "ab2:4^ r:4 ab2:2 ab2:2 ab2:2 ab2:2", "g2:2 g2:2 g2:2 g2:2 g2:2^ g2:2^ g2:2^ g2:2^"]),
      drums: J(["m.......m.......", "m...m...m...m...", "m.m.m.m.m.m.m.m.", "SSSSSSSSSSSSTTMM"]),
    } },
    A2: { bars: 8, play: {
      lead: J(XA2_LEAD),
      horn: oct(J(XA2_LEAD), -1),
      choir: per(XC, X_A, xChoir),
      strings: per(XC, X_A, xStr),
      bell: J(["c6:16", "r:16", "ab5:16", "r:16", "c6:16", "r:16", "db6:16", "d6:16"]),
      bass: per(XC, X_A, xTres),
      timp: per(XC, X_A, xTimp2),
      drums: J([xBdCrash, xBd, xBd, xBdFill, xBd, xBd, xBd, xBdFill]),
    } },
  },
  order: ["intro", "A", "B", "bridge", "A2"],
  loopFrom: 1,
};

export default [IRON_BUILD, IRON_FIGHT, IRON_BOSS];
