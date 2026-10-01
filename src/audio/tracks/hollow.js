// ============ HOLLOW COURT ============
// The third chapter: barrows, fens, drowned villages. Haunted and
// melancholy rather than merely loud — celesta and bells over a choir,
// a clarinet in the mist, then organ and tolling brass for the Hollow King.
//   hollow-build  A harmonic minor, a slow 3/4 waltz of the dead (84 bpm)
//   hollow-fight  E minor (D# borrowed for the B chord), strings ostinato under an organ hook (128)
//   hollow-boss   D harmonic minor, a grand dirge in 4/4 (112)

// shift every note in a pattern by n octaves ("e5:4 b5" -> "e4:4 b4")
const oct = (s, n) => s.replace(/(^|[\s+|])([a-g][#b]?)(\d)/g, (_, p, nm, d) => p + nm + (Number(d) + n));
const J = (bars) => bars.join(" | ");
const rep = (s, n) => Array(n).fill(s).join(" | ");

// ---------------------------------------------------------------------------
// 1. HOLLOW BUILD — a ghostly waltz (3/4: 12 steps a bar)
// ---------------------------------------------------------------------------

// chord -> choir voicing, harp arpeggio notes, pizzicato bass (root, fifth)
const BW = {
  Am: { ch: "a3+c4+e4", arp: ["a3", "e4", "a4", "c5"], bs: ["a2", "e3"] },
  Dm: { ch: "a3+d4+f4", arp: ["d4", "f4", "a4", "d5"], bs: ["d3", "a3"] },
  F:  { ch: "a3+c4+f4", arp: ["f3", "c4", "f4", "a4"], bs: ["f2", "c3"] },
  E:  { ch: "g#3+b3+e4", arp: ["e3", "b3", "e4", "g#4"], bs: ["e2", "b2"] },
  C:  { ch: "g3+c4+e4", arp: ["c4", "e4", "g4", "c5"], bs: ["c3", "g3"] },
};
const wChoir = (cs) => J(cs.map((c) => `${BW[c].ch}:12`));
const wHarp = (cs) => J(cs.map((c) => { const [a, b, d, e] = BW[c].arp; return `${a}:2 ${b} ${d} ${e} ${d} ${b}`; }));
const wBass = (cs) => J(cs.map((c) => `${BW[c].bs[0]}:4 r:4 ${BW[c].bs[1]}:4`));

const W_A = ["Am", "Am", "Dm", "Am", "F", "E", "Am", "E"];
const W_B = ["Dm", "Am", "F", "C", "Dm", "F", "E", "E"];
const W_BR = ["Dm", "E", "Am", "E"];

const W_LEAD_A = J([
  "e5:4 a5:8", "g#5:4 a5:4 b5:4", "d6:4 c6:4 a5:4", "e5:12",
  "f5:4 a5:4 c6:4", "e6:8 d6:4", "c6:4 b5:4 a5:4", "g#5:8 r:4",
]);
const W_LEAD_A2 = J([
  "e5:4 a5:6 b5:2", "g#5:4 a5:4 b5:4", "d6:4 c6:4 a5:4", "e5:8 a5:4",
  "f5:4 a5:4 c6:4", "e6:6 d6:2 c6:4", "b5:4 c6:4 a5:4", "g#5:4 b5:4 e6:4",
]);
const W_LEAD_B = J([
  "d5:4 f5:4 a5:4", "c6:8 b5:4", "a5:4 c6:4 f6:4", "e6:4 d6:4 c6:4",
  "d6:4 c6:4 a5:4", "c6:4 a5:4 f5:4", "g#5:4 b5:4 e6:4", "d6:4 b5:4 g#5:4",
]);
const W_CLAR_B = J([
  "a4:12", "c5:8 b4:4", "a4:12", "g4:8 e4:4",
  "f4:12", "a4:8 c5:4", "b4:12", "g#4:8 b4:4",
]);
const W_LEAD_BR = J(["f6:4 a5:4 d6:4", "e6:4 b5:4 g#5:4", "a5:8 c6:4", "b5:4 g#5:4 e5:4"]);

const buildParts = {
  lead:  { inst: "celesta",  gain: 1.0,  pan: 0.15,  send: 0.5 },
  bell:  { inst: "bell",     gain: 0.5,  pan: -0.2,  send: 0.6 },
  choir: { inst: "choir",    gain: 0.55, pan: 0,     send: 0.55 },
  harp:  { inst: "harp",     gain: 0.5,  pan: -0.3,  send: 0.45 },
  bass:  { inst: "pizz",     gain: 0.8,  pan: 0,     send: 0.15 },
  clar:  { inst: "clarinet", gain: 0.55, pan: 0.3,   send: 0.5 },
  timp:  { inst: "timpani",  gain: 0.45, pan: 0,     send: 0.35 },
  drums: { inst: "drums",    gain: 0.35, pan: 0.1,   send: 0.4 },
};

const hollowBuild = {
  id: "hollow-build",
  title: "The Quiet Barrows",
  area: "hollow",
  bpm: 84,
  meter: 12,
  key: "A harmonic minor",
  level: 1.9,                       // sparse and quiet by nature; lifted to sit with the others
  parts: buildParts,
  sections: {
    intro: { bars: 2, play: {
      choir: wChoir(["Am", "Am"]),
      harp: wHarp(["Am", "Am"]),
      bell: "a4:12 r:12",
    } },
    A: { bars: 8, play: {
      lead: W_LEAD_A,
      choir: wChoir(W_A),
      bass: wBass(W_A),
      bell: "a4:12 r:36",
      timp: "a2:4 r:20",
    } },
    B: { bars: 8, play: {
      lead: W_LEAD_B,
      clar: W_CLAR_B,
      choir: wChoir(W_B),
      harp: wHarp(W_B),
      bass: wBass(W_B),
      bell: "e4:12 r:36",
      drums: "....x...x...",
    } },
    A2: { bars: 8, play: {
      lead: W_LEAD_A2,
      clar: oct(W_LEAD_A, -1),
      choir: wChoir(W_A),
      harp: wHarp(W_A),
      bass: wBass(W_A),
      bell: "a4:12 r:36",
      timp: "a2:4 r:20",
      drums: "....x...x...",
    } },
    bridge: { bars: 4, play: {
      lead: W_LEAD_BR,
      choir: wChoir(W_BR),
      bass: wBass(W_BR),
      bell: "d4:12 r:36",
      timp: "d2:4 r:20",
    } },
  },
  order: ["intro", "A", "B", "A2", "bridge"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// 2. HOLLOW FIGHT — the dead are walking (4/4)
// ---------------------------------------------------------------------------

// chord -> strings, choir (inverted, to sit below), ostinato (root, fifth,
// octave), bass (root, octave), timpani
const FC = {
  Em: { st: "e4+g4+b4",  ch: "b3+e4+g4",  os: ["e3", "b3", "e4"], bs: ["e2", "e3"], tp: "e2" },
  D:  { st: "d4+f#4+a4", ch: "a3+d4+f#4", os: ["d3", "a3", "d4"], bs: ["d2", "d3"], tp: "d2" },
  C:  { st: "c4+e4+g4",  ch: "g3+c4+e4",  os: ["c3", "g3", "c4"], bs: ["c2", "c3"], tp: "c2" },
  B:  { st: "b3+d#4+f#4", ch: "f#3+b3+d#4", os: ["b2", "f#3", "b3"], bs: ["b1", "b2"], tp: "b1" },
  Am: { st: "c4+e4+a4",  ch: "a3+c4+e4",  os: ["a2", "e3", "a3"], bs: ["a1", "a2"], tp: "a1" },
};
const fOst = (cs) => J(cs.map((c) => { const [r, f, o] = FC[c].os; return `${r}:2 ${o} ${f} ${o} ${r} ${o} ${f} ${o}`; }));
const fStr = (cs) => J(cs.map((c) => `${FC[c].st}:6 ${FC[c].st}:6 ${FC[c].st}:4`));
const fChoir = (cs) => J(cs.map((c) => `${FC[c].ch}:16`));
const fBass = (cs) => J(cs.map((c) => { const [r, o] = FC[c].bs; return `${r}:2 ${r} ${o} ${r} ${r} ${r} ${o} ${r}`; }));
const fTimp = (cs) => J(cs.map((c) => `${FC[c].tp}:4 r:4 ${FC[c].tp}:4 r:4`));

const F_A = ["Em", "D", "C", "B", "Em", "D", "Am", "B"];
const F_B = ["C", "D", "Em", "Am", "C", "D", "B", "B"];
const F_BR = ["Am", "Am", "B", "B"];

const F_LEAD_A = J([
  "e5:6 g5:2 b5:4 a5:4", "f#5:6 a5:2 f#5:4 d5:4", "e5:6 g5:2 c6:4 b5:4", "d#5:4 f#5:4 b5:6 a5:2",
  "e5:6 g5:2 b5:4 e6:4", "d6:6 b5:2 a5:4 f#5:4", "c6:4 b5:4 a5:4 e5:4", "d#5:4 f#5:4 a5:4 b5:4",
]);
const F_LEAD_A2 = J([
  "e5:6 g5:2 b5:4 a5:4", "f#5:6 a5:2 f#5:4 d5:4", "e5:6 g5:2 c6:4 b5:4", "d#5:4 f#5:4 b5:6 a5:2",
  "e5:6 g5:2 b5:4 e6:4", "d6:6 b5:2 a5:4 f#5:4", "c6:4 b5:4 a5:4 c6:4", "f#6:8 d#6:4 b5:4",
]);
const F_LEAD_B = J([
  "g5:4 e5:4 c6:8", "a5:4 f#5:4 d6:8", "b5:6 g5:2 e6:8", "c6:4 b5:4 a5:8",
  "g5:4 c6:4 e6:8", "f#6:6 e6:2 d6:4 a5:4", "b5:4 d#6:4 f#6:8", "e6:4 d#6:4 b5:8",
]);
const F_CLAR_BR = J(["a5:8 c6:4 b5:4", "a5:8 e6:4 d6:4", "d#6:8 f#6:4 e6:4", "d#6:4 e6:4 f#6:4 d#6:4"]);

const N = "K.h.S.h.k.h.S.h.";          // an ordinary bar
const V = "K.h.S.h.k.hkS.o.";          // a bar with a pickup
const CR = "C.hkS.h.k.h.S.h.";         // a bar that opens with the crash
const FILL = "K.h.S.h.k.hsSmtM";       // a bar that ends in a tom run

const fightParts = {
  lead:  { inst: "organ",    gain: 0.85, pan: 0.1,   send: 0.3 },
  clar:  { inst: "clarinet", gain: 0.6,  pan: 0.3,   send: 0.35 },
  ost:   { inst: "pizz",     gain: 0.65, pan: -0.25, send: 0.2 },
  str:   { inst: "strings",  gain: 0.7,  pan: 0.2,   send: 0.35 },
  choir: { inst: "choir",    gain: 0.6,  pan: 0,     send: 0.5 },
  bass:  { inst: "bass",     gain: 0.9,  pan: 0,     send: 0.05 },
  timp:  { inst: "timpani",  gain: 0.6,  pan: 0,     send: 0.2 },
  drums: { inst: "drums",    gain: 0.6,  pan: 0,     send: 0.12 },
};

const hollowFight = {
  id: "hollow-fight",
  title: "The Dead Walk",
  area: "hollow",
  bpm: 128,
  key: "E minor",   // with the B chord's D# borrowed from the harmonic scale
  parts: fightParts,
  sections: {
    intro: { bars: 2, play: {
      ost: fOst(["Em", "Em"]),
      str: fStr(["Em", "Em"]),
      bass: fBass(["Em", "Em"]),
      timp: fTimp(["Em", "Em"]),
      drums: "x...x...x...x... | x...x...x.x.m.mM",
    } },
    A: { bars: 8, play: {
      lead: F_LEAD_A,
      ost: fOst(F_A),
      str: fStr(F_A),
      bass: fBass(F_A),
      timp: fTimp(F_A),
      drums: J([CR, N, N, V, N, N, N, FILL]),
    } },
    B: { bars: 8, play: {
      lead: F_LEAD_B,
      clar: oct(F_LEAD_B, -1),
      ost: fOst(F_B),
      str: fStr(F_B),
      choir: fChoir(F_B),
      bass: fBass(F_B),
      timp: fTimp(F_B),
      drums: J([CR, N, N, V, N, N, N, FILL]),
    } },
    A2: { bars: 8, play: {
      lead: F_LEAD_A2,
      clar: oct(F_LEAD_A, -1),
      ost: fOst(F_A),
      str: fStr(F_A),
      choir: fChoir(F_A),
      bass: fBass(F_A),
      timp: fTimp(F_A),
      drums: J([CR, N, N, V, N, N, N, FILL]),
    } },
    bridge: { bars: 4, play: {
      clar: F_CLAR_BR,
      ost: fOst(F_BR),
      str: fStr(F_BR),
      choir: fChoir(F_BR),
      bass: fBass(F_BR),
      timp: J([`a1:4 r:4 a1:4 r:4`, `a1:4 r:4 a1:4 r:4`, "b1:2 b1 b1 b1 b1 b1 b1 b1", "b1:2 b1 b1 b1 b1 b1 b1 b1"]),
      drums: J(["M...m...M...m...", "M...m...M...m...", "M.m.M.m.M.m.M.m.", "SsSsSsSsSsSsSSSS"]),
    } },
  },
  order: ["intro", "A", "B", "A2", "bridge"],
  loopFrom: 1,
};

// ---------------------------------------------------------------------------
// 3. HOLLOW BOSS — the Hollow King (4/4, a slow regal march)
// ---------------------------------------------------------------------------

// chord -> organ voicing (low), choir voicings (first, inverted), brass stab,
// bass (root, octave), timpani
const BC = {
  Dm: { og: "d3+a3+d4+f4",  c1: "d4+f4+a4",  c2: "f4+a4+d5",  br: "a3+d4+f4",  bs: ["d2", "d3"],  tp: "d2" },
  Bb: { og: "bb2+f3+bb3+d4", c1: "d4+f4+bb4", c2: "f4+bb4+d5", br: "bb3+d4+f4", bs: ["bb1", "bb2"], tp: "f2" },
  Gm: { og: "g2+d3+g3+bb3", c1: "d4+g4+bb4", c2: "g4+bb4+d5", br: "g3+bb3+d4", bs: ["g1", "g2"],  tp: "g2" },
  A:  { og: "a2+e3+a3+c#4", c1: "e4+a4+c#5", c2: "a4+c#5+e5", br: "a3+c#4+e4", bs: ["a1", "a2"],  tp: "a2" },
  F:  { og: "f2+c3+f3+a3",  c1: "c4+f4+a4",  c2: "c4+f4+a4",  br: "a3+c4+f4",  bs: ["f2", "f3"],  tp: "f2" },
};
const bOrgan = (cs) => J(cs.map((c) => `${BC[c].og}:16`));
const bChoir = (cs, k) => J(cs.map((c) => `${BC[c][k]}:16`));
const bBass = (cs) => J(cs.map((c) => { const [r, o] = BC[c].bs; return `${r}:6 ${r}:2 ${o}:4 ${r}:4`; }));
const bTimp = (cs) => J(cs.map((c) => `${BC[c].tp}:4^ r:4 ${BC[c].tp}:4 r:2 ${BC[c].tp}:2`));
const bStab = (cs) => J(cs.map((c) => `${BC[c].br}:4^ r:4 ${BC[c].br}:2 r:2 ${BC[c].br}:2 r:2`));

const B_A = ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "A", "A"];
const B_B = ["Bb", "F", "Gm", "Dm", "Bb", "Gm", "A", "A"];
const B_BR = ["Gm", "Bb", "A", "A"];
const B_IN = ["Dm", "Dm", "Gm", "A"];

const B_HORN_A = J([
  "d4:6 f4:2 a4:8", "bb4:6 a4:2 f4:8", "g4:6 bb4:2 d5:8", "e5:6 c#5:2 a4:8",
  "a4:4 d5:4 f5:8", "f5:4 e5:4 d5:8", "c#5:4 d5:4 e5:8", "e5:6 d5:2 c#5:8",
]);
const B_HORN_A2 = J([
  "d4:4 a4:4 d5:8", "bb4:6 a4:2 f4:8", "g4:6 bb4:2 d5:8", "e5:6 c#5:2 a4:8",
  "a4:4 d5:4 f5:8", "f5:4 e5:4 d5:8", "c#5:4 d5:4 e5:8", "e5:6 d5:2 c#5:8",
]);
const B_HORN_B = J([
  "f4:4 bb4:4 d5:8", "c5:6 a4:2 f4:8", "g4:4 bb4:4 d5:8", "a4:6 f4:2 d4:8",
  "d5:6 f5:2 d5:4 bb4:4", "bb4:4 d5:4 bb4:4 g4:4", "e5:4 a4:4 c#5:4 e5:4", "e5:8 d5:4 c#5:4",
]);
const B_HORN_BR = J(["d5:8 bb4:8", "f4:8 bb4:8", "c#5:8 e5:8", "e5:8 d5:4 c#5:4"]);

const BD = "M...x...m...x.x.";          // the march
const BDF = "M...x...m.m.t.tT";         // march with a tom turn
const BB = "K...S...K.k.S...";          // the full march
const BBC = "C...S...K.k.S...";          // ... opened with a crash
const BBF = "K...S...K.s.SsSS";         // ... ending in a snare run

const bossParts = {
  horn:  { inst: "horn",    gain: 1.0,  pan: 0.1,   send: 0.35 },
  brass: { inst: "brass",   gain: 0.45, pan: -0.15, send: 0.3 },
  organ: { inst: "organ",   gain: 0.55, pan: 0,     send: 0.35 },
  choir: { inst: "choir",   gain: 0.65, pan: 0,     send: 0.55 },
  bass:  { inst: "bass",    gain: 0.9,  pan: 0,     send: 0.05 },
  timp:  { inst: "timpani", gain: 0.75, pan: 0,     send: 0.25 },
  bell:  { inst: "bell",    gain: 0.55, pan: 0.25,  send: 0.6 },
  drums: { inst: "drums",   gain: 0.6,  pan: 0,     send: 0.2 },
};

const hollowBoss = {
  id: "hollow-boss",
  title: "The Hollow King",
  area: "hollow",
  bpm: 112,
  key: "D harmonic minor",
  parts: bossParts,
  sections: {
    intro: { bars: 4, play: {
      organ: bOrgan(B_IN),
      choir: "r:32 | " + bChoir(["Gm", "A"], "c1"),
      bass: "r:32 | " + bBass(["Gm", "A"]),
      bell: "d4:16 | d4:16 | g4:16 | a4:16",
      timp: "d2:2 r:14 | d2:2 r:14 | " + bTimp(["Gm", "A"]),
    } },
    A: { bars: 8, play: {
      horn: B_HORN_A,
      organ: bOrgan(B_A),
      choir: bChoir(B_A.slice(0, 4), "c1") + " | " + bChoir(B_A.slice(4), "c2"),
      bass: bBass(B_A),
      timp: bTimp(B_A),
      bell: "d4:16 r:16 a4:16 r:16",
      drums: J([BD, BD, BD, BD, BD, BD, BD, BDF]),
    } },
    B: { bars: 8, play: {
      horn: B_HORN_B,
      brass: bStab(B_B),
      organ: bOrgan(B_B),
      choir: bChoir(["Bb", "F", "Gm", "Dm", "Bb", "Gm", "A", "A"], "c1"),
      bass: bBass(B_B),
      timp: bTimp(B_B),
      bell: "bb4:16 r:48",
      drums: J([BBC, BB, BB, BB, BB, BB, BB, BBF]),
    } },
    A2: { bars: 8, play: {
      horn: B_HORN_A2,
      brass: B_HORN_A2,
      organ: bOrgan(B_A),
      choir: bChoir(B_A, "c2"),
      bass: bBass(B_A),
      timp: bTimp(B_A),
      bell: "d4:16 r:16 a4:16 r:16",
      drums: J([BBC, BB, BB, BB, BB, BB, BB, BBF]),
    } },
    bridge: { bars: 4, play: {
      horn: B_HORN_BR,
      organ: bOrgan(B_BR),
      choir: bChoir(B_BR, "c1"),
      bass: bBass(B_BR),
      timp: bTimp(B_BR),
      bell: "g4:16 | bb4:16 | a4:16 | a4:16",
      drums: J(["M...x...m...x...", "M...x...m...x...", "M...m...M...m...", "SsSsSsSsSsSsSSSS"]),
    } },
  },
  order: ["intro", "A", "B", "A2", "bridge"],
  loopFrom: 1,
};

export default [hollowBuild, hollowFight, hollowBoss];
