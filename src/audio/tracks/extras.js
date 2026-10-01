// ============ THE EXTRAS: title, map, victory, defeat ============
// The four tunes that belong to no battle.
//   title    D major, 96 bpm, 4/4  — a crown-and-castle theme: brass fanfare,
//            flute hook over a rolling harp, a lyrical brass middle, then the
//            hook again with brass below the flute and timpani under it
//   map      G major, 104 bpm, 6/8 — the army on the march: a rolling flute
//            tune, an oboe middle with a clarinet line falling beneath it
//   victory  G major, 140 bpm      — a brass fanfare jingle, plays once
//   defeat   D minor, 66 bpm       — a low, falling lament, plays once

// shift every note in a pattern by n octaves ("e5:4 b5" -> "e4:4 b4")
const oct = (s, n) => s.replace(/(^|[\s+|])([a-g][#b]?)(\d)/g, (_, p, nm, d) => p + nm + (Number(d) + n));
const J = (bars) => bars.join(" | ");
const rep = (s, n) => Array(n).fill(s).join(" | ");

// ---------------------------------------------------------------------------
// TITLE — 2 bars intro + A 8 + B 8 + A2 8 = 26 bars, ~65 s; loops from A
// ---------------------------------------------------------------------------

// harp notes [root, third, fifth, octave] per chord
const TH = {
  D:  ["d4", "f#4", "a4", "d5"], A:  ["a3", "c#4", "e4", "a4"], Bm: ["b3", "d4", "f#4", "b4"],
  G:  ["g3", "b3", "d4", "g4"],  Em: ["e3", "g3", "b3", "e4"],  F:  ["f#3", "a3", "c#4", "f#4"],
};
// eighth-note rolling arpeggio / a 3+3+2+3+2+3 bounce
const arp1 = ([r, t, f, o]) => `${r}:2 ${t} ${f} ${o} ${f} ${t} ${f} ${t}`;
const arp2 = ([r, t, f, o]) => `${r}:3 ${f}:3 ${t}:2 ${o}:3 ${t}:2 ${f}:3`;
const harp1 = (cs) => J(cs.map((c) => arp1(TH[c])));
const harp2 = (cs) => J(cs.map((c) => arp2(TH[c])));

// bouncy bass bar: root, octave, fifth, and a step into the next root
const bs = (r, o, f, a) => `${r}:4 ${o}:2 ${r}:2 ${f}:4 ${o}:2 ${a}:2`;

// horn dyads (root + fifth) for each chord
const THORN = { D: "d3+a3", A: "a2+e3", Bm: "b2+f#3", G: "g2+d3", Em: "e3+b3", F: "f#2+c#3" };
const horn = (cs) => J(cs.map((c) => `${THORN[c]}:16`));

// strings, voice-led a step at a time
const T_PAD_A = ["d4+f#4+a4", "c#4+e4+a4", "d4+f#4+b4", "d4+g4+b4", "d4+f#4+a4", "d4+g4+b4", "e4+g4+b4", "e4+a4+c#5"];
const T_PAD_B = ["d4+f#4+b4", "c#4+f#4+a4", "d4+g4+b4", "d4+f#4+a4", "d4+f#4+b4", "d4+g4+b4", "e4+g4+b4", "e4+a4+c#5"];
const T_PAD_A2 = [...T_PAD_A.slice(0, 6), "e4+a4+c#5", "f#4+a4+d5"];
const pad = (ps) => J(ps.map((p) => `${p}:16`));

// the hook: D-A-Bm-G, D-G-Em-A. The flute sings it; the last note falls from
// A to the D that opens it again.
const T_LEAD_A = J([
  "d5:6 a4:2 d5:4 f#5:4", "e5:6 c#5:2 e5:8", "d5:4 f#5:4 b5:6 a5:2", "g5:6 f#5:2 e5:2 d5:2 b4:4",
  "d5:6 a4:2 d5:4 f#5:4", "g5:6 b5:2 a5:4 g5:4", "g5:4 f#5:4 e5:4 g5:4", "c#6:6 b5:2 a5:8",
]);
// the middle: Bm-F#m-G-D, Bm-G-Em-A, the brass leaning on long notes, with
// a pickup (a4) back into the hook
const T_BRASS_B = [
  "f#5:6 e5:2 d5:4 b4:4", "c#5:6 d5:2 c#5:4 a4:4", "b4:6 d5:2 g5:6 f#5:2", "a5:8 f#5:4 d5:4",
  "d5:4 f#5:4 b5:8", "g5:6 a5:2 b5:4 a5:4", "g5:4 f#5:4 e5:4 g5:4", "c#5:4 e5:4 a5:4 r:2 a4:2",
];
// the hook again, climbing to d6 and landing on the tonic
const T_LEAD_A2 = J([
  "d5:6 a4:2 d5:4 f#5:4", "e5:6 c#5:2 e5:8", "d5:4 f#5:4 b5:4 d6:4", "g5:6 f#5:2 e5:2 d5:2 b4:4",
  "d5:6 a4:2 d5:4 f#5:4", "g5:6 b5:2 a5:4 g5:4", "c#6:4 b5:4 a5:4 e5:4", "d6:12 r:2 a4:2",
]);

const tp = (r) => `${r}:4^ r:4 ${r}:2 ${r}:2 ${r}:4`;
const dA = "k.h.x.h..kh.x.h.";

const title = {
  id: "title",
  title: "The Crown Rises",
  area: "title",
  bpm: 96,
  key: "D major",
  parts: {
    flute:   { inst: "flute",   gain: 1.0,  pan: 0.12,  send: 0.35 },
    brass:   { inst: "brass",   gain: 0.8,  pan: -0.12, send: 0.35 },
    harp:    { inst: "harp",    gain: 0.8,  pan: -0.3,  send: 0.4 },
    strings: { inst: "strings", gain: 0.6,  pan: 0,     send: 0.45 },
    horn:    { inst: "horn",    gain: 0.55, pan: 0.25,  send: 0.35 },
    bass:    { inst: "bass",    gain: 0.8,  pan: 0,     send: 0.05 },
    timp:    { inst: "timpani", gain: 0.5,  pan: 0,     send: 0.3 },
    drums:   { inst: "drums",   gain: 0.5,  pan: 0,     send: 0.1 },
  },
  sections: {
    intro: { bars: 2, play: {
      brass: "d5:4 f#5:4 a5:8 | c#5:4 e5:4 a5:4 r:2 a4:2",
      harp: harp1(["D", "A"]),
      strings: pad(["d4+f#4+a4", "c#4+e4+a4"]),
      horn: horn(["D", "A"]),
      timp: "d2:4^ r:12 | a1:4^ r:4 a1:2 a1:2 a1:2 a1:2",
    } },
    A: { bars: 8, play: {
      flute: T_LEAD_A,
      harp: harp1(["D", "A", "Bm", "G", "D", "G", "Em", "A"]),
      strings: pad(T_PAD_A),
      bass: J([
        bs("d2", "d3", "a2", "b1"), bs("a1", "a2", "e2", "c#2"), bs("b1", "b2", "f#2", "a1"), bs("g1", "g2", "d2", "e2"),
        bs("d2", "d3", "a2", "a1"), bs("g1", "g2", "d2", "f#2"), bs("e2", "e3", "b2", "b1"), bs("a1", "a2", "e2", "c#2"),
      ]),
      drums: rep(dA, 7) + " | k.h.x.h.k.t.m.sS",
    } },
    B: { bars: 8, play: {
      brass: J(T_BRASS_B),
      flute: J([...Array(4).fill("r:16"), ...T_BRASS_B.slice(4).map((b) => oct(b, 1))]),
      harp: harp2(["Bm", "F", "G", "D", "Bm", "G", "Em", "A"]),
      strings: pad(T_PAD_B),
      horn: horn(["Bm", "F", "G", "D", "Bm", "G", "Em", "A"]),
      bass: J([
        bs("b1", "b2", "f#2", "e2"), bs("f#2", "f#3", "c#3", "a1"), bs("g1", "g2", "d2", "e2"), bs("d2", "d3", "a2", "c#2"),
        bs("b1", "b2", "f#2", "a1"), bs("g1", "g2", "d2", "f#2"), bs("e2", "e3", "b2", "b1"), bs("a1", "a2", "e2", "c#2"),
      ]),
      timp: J(["b1:4^ r:12", "r:16", "r:16", "r:16", "b1:4^ r:12", "r:16", "r:16", "a1:4^ r:4 a1:2 a1:2 a1:4"]),
      drums: J(["c.h.s.h..kh.s.h.", ...Array(6).fill("k.h.s.h..kh.s.h."), "k.h.s.h.tttmmmSS"]),
    } },
    A2: { bars: 8, play: {
      flute: T_LEAD_A2,
      brass: oct(T_LEAD_A2, -1),
      harp: harp1(["D", "A", "Bm", "G", "D", "G", "A", "D"]),
      strings: pad(T_PAD_A2),
      horn: horn(["D", "A", "Bm", "G", "D", "G", "A", "D"]),
      bass: J([
        bs("d2", "d3", "a2", "b1"), bs("a1", "a2", "e2", "c#2"), bs("b1", "b2", "f#2", "a1"), bs("g1", "g2", "d2", "e2"),
        bs("d2", "d3", "a2", "a1"), bs("g1", "g2", "d2", "b1"), bs("a1", "a2", "e2", "c#2"), "d2:4 d3:2 d2:2 a2:4 d3:4",
      ]),
      timp: J(["d2", "a1", "b1", "g2", "d2", "g2", "a1", "d2"].map(tp)),
      drums: J(["c.h.S.h..kh.S.h.", ...Array(5).fill("k.h.s.o..kh.s.h."), "k.h.s.h.k.h.s.hh", "k.h.s.h.k.t.m.sS"]),
    } },
  },
  order: ["intro", "A", "B", "A2"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// MAP — 6/8 (12 steps a bar), 2 bars intro + A 8 + B 8 + A2 8, ~45 s
// ---------------------------------------------------------------------------

const MH = {
  G: ["g3", "b3", "d4", "g4"], D: ["a3", "d4", "f#4", "a4"], Em: ["g3", "b3", "e4", "g4"],
  C: ["g3", "c4", "e4", "g4"], Am: ["a3", "c4", "e4", "a4"], Bm: ["b3", "d4", "f#4", "b4"],
};
const MS = {   // the off-beat chords
  G: "b3+d4+g4", D: "a3+d4+f#4", Em: "g3+b3+e4", C: "g3+c4+e4", Am: "a3+c4+e4", Bm: "b3+d4+f#4",
};
const marp = ([r, t, f, o]) => `${r}:2 ${t} ${f} ${o} ${f} ${t}`;
const mharp = (cs) => J(cs.map((c) => marp(MH[c])));
const mstab = (cs) => J(cs.map((c) => `r:2 ${MS[c]}:2 ${MS[c]}:2 r:2 ${MS[c]}:2 ${MS[c]}:2`));
const mpad = (ps) => J(ps.map((p) => `${p}:12`));
const mbs = (rt, o, f, a) => `${rt}:3 ${rt}:1 ${o}:2 ${f}:4 ${a}:2`;

const M_LEAD_A = J([
  "b4:2 d5:2 g5:4 a5:2 b5:2", "a5:6 f#5:2 e5:2 d5:2", "e5:2 g5:2 b5:4 a5:2 g5:2", "g5:6 e5:4 d5:2",
  "b4:2 d5:2 g5:4 a5:2 b5:2", "c6:6 b5:2 a5:2 e5:2", "g5:2 e5:2 c5:2 e5:2 g5:4", "f#5:2 a5:2 d6:6 c6:2",
]);
const M_OBOE_B = J([
  "b5:6 a5:2 g5:2 e5:2", "f#5:6 g5:2 f#5:2 d5:2", "e5:4 g5:2 c6:6", "b5:4 a5:2 g5:6",
  "a5:6 c6:2 b5:2 a5:2", "g5:6 b5:2 a5:2 g5:2", "e5:2 g5:2 c6:4 d6:2 e6:2", "d6:6 c6:2 a5:2 d5:2",
]);
// a clarinet line falling a step a bar beneath the oboe
const M_CLAR_B = J(["g4:12", "f#4:12", "e4:12", "d4:12", "c4:12", "b3:12", "c4:6 e4:6", "d4:6 f#4:6"]);
const M_LEAD_A2 = J([
  "b4:2 d5:2 g5:4 a5:2 b5:2", "a5:6 f#5:2 e5:2 d5:2", "e5:2 g5:2 b5:4 a5:2 g5:2", "g5:6 e5:4 d5:2",
  "b4:2 d5:2 g5:4 a5:2 b5:2", "c6:6 b5:2 a5:2 e5:2", "f#5:2 a5:2 d6:4 c6:2 b5:2", "g5:12",
]);

const map = {
  id: "map",
  title: "The Road Across the Realm",
  area: "map",
  bpm: 104,
  key: "G major",
  meter: 12,
  parts: {
    flute:   { inst: "flute",    gain: 1.0,  pan: 0.12,  send: 0.35 },
    oboe:    { inst: "oboe",     gain: 0.9,  pan: -0.1,  send: 0.35 },
    clar:    { inst: "clarinet", gain: 0.55, pan: 0.3,   send: 0.4 },
    harp:    { inst: "harp",     gain: 0.75, pan: -0.3,  send: 0.4 },
    pizz:    { inst: "pizz",     gain: 0.5,  pan: 0.25,  send: 0.2 },
    strings: { inst: "strings",  gain: 0.55, pan: 0,     send: 0.45 },
    bass:    { inst: "bass",     gain: 0.9,  pan: 0,     send: 0.05 },
    drums:   { inst: "drums",    gain: 0.5,  pan: 0,     send: 0.1 },
  },
  sections: {
    intro: { bars: 2, play: {
      flute: "r:12 | r:8 g4:2 a4:2",
      harp: mharp(["G", "D"]),
      strings: mpad(["d4+g4+b4", "d4+f#4+a4"]),
      drums: "x.....x..... | x.....x.x.x.",
    } },
    A: { bars: 8, play: {
      flute: M_LEAD_A,
      harp: mharp(["G", "D", "Em", "C", "G", "Am", "C", "D"]),
      pizz: mstab(["G", "D", "Em", "C", "G", "Am", "C", "D"]),
      strings: mpad(["d4+g4+b4", "d4+f#4+a4", "e4+g4+b4", "e4+g4+c5", "d4+g4+b4", "e4+a4+c5", "e4+g4+c5", "d4+f#4+a4"]),
      bass: J([
        mbs("g2", "g3", "d3", "e2"), mbs("d2", "d3", "a2", "f#2"), mbs("e2", "e3", "b2", "d2"), mbs("c2", "c3", "g2", "f#2"),
        mbs("g2", "g3", "d3", "b1"), mbs("a1", "a2", "e2", "b1"), mbs("c2", "c3", "g2", "e2"), mbs("d2", "d3", "a2", "f#2"),
      ]),
      drums: rep("k.h.h.x.h.h.", 7) + " | k.h.h.s.s.sS",
    } },
    B: { bars: 8, play: {
      oboe: M_OBOE_B,
      clar: M_CLAR_B,
      harp: mharp(["Em", "Bm", "C", "G", "Am", "Em", "C", "D"]),
      pizz: mstab(["Em", "Bm", "C", "G", "Am", "Em", "C", "D"]),
      strings: mpad(["e4+g4+b4", "d4+f#4+b4", "e4+g4+c5", "d4+g4+b4", "e4+a4+c5", "e4+g4+b4", "e4+g4+c5", "d4+f#4+a4"]),
      bass: J([
        mbs("e2", "e3", "b2", "c2"), mbs("b1", "b2", "f#2", "d2"), mbs("c2", "c3", "g2", "f#2"), mbs("g2", "g3", "d3", "b1"),
        mbs("a1", "a2", "e2", "d2"), mbs("e2", "e3", "b2", "d2"), mbs("c2", "c3", "g2", "e2"), mbs("d2", "d3", "a2", "f#2"),
      ]),
      drums: rep("k.h.h.s.hkh.", 7) + " | k.h.h.s.sssS",
    } },
    A2: { bars: 8, play: {
      flute: M_LEAD_A2,
      oboe: oct(M_LEAD_A2, -1),
      harp: mharp(["G", "D", "Em", "C", "G", "Am", "D", "G"]),
      pizz: mstab(["G", "D", "Em", "C", "G", "Am", "D", "G"]),
      strings: mpad(["d4+g4+b4", "d4+f#4+a4", "e4+g4+b4", "e4+g4+c5", "d4+g4+b4", "e4+a4+c5", "d4+f#4+a4", "d4+g4+b4"]),
      bass: J([
        mbs("g2", "g3", "d3", "e2"), mbs("d2", "d3", "a2", "f#2"), mbs("e2", "e3", "b2", "d2"), mbs("c2", "c3", "g2", "f#2"),
        mbs("g2", "g3", "d3", "b1"), mbs("a1", "a2", "e2", "c2"), mbs("d2", "d3", "a2", "f#2"), mbs("g2", "g3", "d3", "f#2"),
      ]),
      drums: J(["c.h.h.s.hkh.", ...Array(6).fill("k.h.h.s.hkh."), "k.h.h.s.h.k."]),
    } },
  },
  order: ["intro", "A", "B", "A2"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// VICTORY — five bars of G major fanfare, ~8.6 s, once
// ---------------------------------------------------------------------------

// three rising calls (on G, C, D), then the tonic: held, with bells over it
const V_BRASS = "d4:3 d4:1 g4:4 b4:4 d5:4 | e4:3 e4:1 g4:4 c5:4 e5:4 | f#4:3 f#4:1 a4:4 d5:4 f#5:4 | g5:16 _:8 r:8";

const victory = {
  id: "victory",
  title: "Victory!",
  area: "jingle",
  bpm: 140,
  key: "G major",
  level: 0.9,
  loop: false,
  parts: {
    brass:   { inst: "brass",   gain: 0.75, pan: -0.1, send: 0.35 },
    flute:   { inst: "flute",   gain: 0.7,  pan: 0.15, send: 0.35 },
    strings: { inst: "strings", gain: 0.6,  pan: 0,    send: 0.45 },
    horn:    { inst: "horn",    gain: 0.6,  pan: 0.25, send: 0.35 },
    harp:    { inst: "harp",    gain: 0.7,  pan: -0.3, send: 0.45 },
    bell:    { inst: "bell",    gain: 0.75, pan: 0.2,  send: 0.5 },
    bass:    { inst: "bass",    gain: 0.75, pan: 0,    send: 0.05 },
    timp:    { inst: "timpani", gain: 0.5,  pan: 0,    send: 0.3 },
    drums:   { inst: "drums",   gain: 0.5,  pan: 0,    send: 0.1 },
  },
  sections: {
    J: { bars: 5, play: {
      brass: V_BRASS,
      flute: oct(V_BRASS, 1),
      strings: "d4+g4+b4:16 | e4+g4+c5:16 | d4+f#4+a4:16 | d4+g4+b4:16 _:12 r:4",
      horn: "g3+b3+d4:16 | g3+c4+e4:16 | a3+d4+f#4:16 | b3+d4+g4:16 _:12 r:4",
      harp: J([arp1(["g3", "b3", "d4", "g4"]), arp1(["c4", "e4", "g4", "c5"]), arp1(["d4", "f#4", "a4", "d5"]),
               "g3:1 b3 d4 g4 b4 d5 g5 b5 d6 g6 b6:6", "r:16"]),
      bell: "r:16 | r:16 | r:12 a6:2 d7:2 | r:4 g6:2 b6:2 d7:2 g7:6 | r:16",
      bass: "g2:3 g2:1 d3:4 g2:4 d3:4 | c2:3 c2:1 g2:4 c3:4 g2:4 | d2:3 d2:1 a2:4 d3:4 a2:4 | g2:6 r:10 | r:16",
      timp: "g2:4^ r:4 g2:2 g2:2 g2:4 | c2:4^ r:4 c2:2 c2:2 c2:4 | d2:4^ r:4 d2:2 d2:2 d2:1 d2:1 d2:1 d2:1 | g2:8^ r:8 | r:16",
      drums: "k...s...k...s.s. | k...s...k...s.s. | k...s...k.s.ssSS | c............... | ................",
    } },
  },
  order: ["J"],
};

// ---------------------------------------------------------------------------
// DEFEAT — D minor, Dm-Bb-A-Dm in eight-step chords, ~7.3 s, once
// ---------------------------------------------------------------------------

const defeat = {
  id: "defeat",
  title: "Defeat",
  area: "jingle",
  bpm: 66,
  key: "D minor",
  loop: false,
  parts: {
    oboe:    { inst: "oboe",    gain: 1.0,  pan: 0.1, send: 0.45 },
    strings: { inst: "strings", gain: 0.8,  pan: 0,   send: 0.5 },
    horn:    { inst: "horn",    gain: 0.5,  pan: 0.2, send: 0.4 },
    sbass:   { inst: "sbass",   gain: 0.7,  pan: 0,   send: 0.1 },
    bell:    { inst: "bell",    gain: 0.8,  pan: 0.2, send: 0.6 },
    timp:    { inst: "timpani", gain: 0.5,  pan: 0,   send: 0.4 },
  },
  sections: {
    D: { bars: 2, play: {
      // a4 g4 | f4 d4 | c#4 e4 | d4 — the fifth falling home through the leading tone
      oboe: "a4:6 g4:2 f4:6 d4:2 | c#4:6 e4:2 d4:8",
      strings: "d3+f3+a3:8 d3+f3+bb3:8 | c#3+e3+a3:8 d3+f3+a3:8",
      horn: "a3+d4:8 bb3+d4:8 | a3+e4:8 a3+d4:8",
      sbass: "d2:8 bb1:8 | a1:8 d2:8",
      bell: "d6:16 | a5:8 d5:8",
      timp: "d2:8 r:8 | r:8 d2:8",
    } },
  },
  order: ["D"],
};

export default [title, map, victory, defeat];
