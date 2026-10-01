// ============ GREENWOOD VALE ============
// Warm, sunny, a little pastoral: flute over harp and a bouncing bass.

const C = "c4+e4+g4", G = "b3+d4+g4", Am = "a3+c4+e4", F = "a3+c4+f4";

// one bar of eighth-note harp arpeggio from a chord's root, 3rd, 5th
const arp = (r, t, f, o) => `${r}:2 ${t} ${f} ${o} ${f} ${t} ${f} ${t}`;

const A_HARP = [arp("c4", "e4", "g4", "c5"), arp("b3", "d4", "g4", "b4"), arp("a3", "c4", "e4", "a4"), arp("a3", "c4", "f4", "a4"),
                arp("c4", "e4", "g4", "c5"), arp("b3", "d4", "g4", "b4"), arp("a3", "c4", "f4", "a4"), arp("b3", "d4", "g4", "b4")];
const B_HARP = [arp("a3", "c4", "e4", "a4"), arp("a3", "c4", "f4", "a4"), arp("c4", "e4", "g4", "c5"), arp("b3", "d4", "g4", "b4"),
                arp("a3", "c4", "e4", "a4"), arp("a3", "c4", "f4", "a4"), arp("b3", "d4", "g4", "b4"), arp("c4", "e4", "g4", "c5")];

const stab = (c) => `r:4 ${c}:2 r:6 ${c}:2 r:2`;
const A_CH = [C, G, Am, F, C, G, F, G];
const B_CH = [Am, F, C, G, Am, F, G, C];
const A_ROOT = ["c2", "g2", "a2", "f2", "c2", "g2", "f2", "g2"];
const B_ROOT = ["a2", "f2", "c2", "g2", "a2", "f2", "g2", "c2"];
const bassBar = (r) => { const o = r[0] + (Number(r[1]) + 1); return `${r}:4 ${o}:4 ${r}:4 ${o}:4`; };

// ---- helpers shared by the fight and boss themes ---------------------------

const J = (bars) => bars.join(" | ");                                   // bars -> one pattern
const oct = (src, d) => src.replace(/([a-g][#b]?)(\d)/g, (_, n, o) => n + (Number(o) + d));   // shift octaves
const up = (n) => n.slice(0, -1) + (Number(n.slice(-1)) + 1);          // the same note, an octave higher
const rest = (bars) => `r:${bars * 16}`;                                // silence for n bars
const fill16 = (n, vel = "") => `${n}:1${vel} `.repeat(16);             // a bar of repeated sixteenths (a roll)
// a drum bar list: grooves in turn, the last bar a fill, a crash on the very first step
const drumBars = (bars, grooves, fill) => {
  const out = [];
  for (let i = 0; i < bars - 1; i++) out.push(grooves[i % grooves.length]);
  out.push(fill);
  out[0] = "C" + out[0].slice(1);
  return out.join("|");
};

// ---- greenwood-fight: Raiders on the Road ------------------------------------
// C major again, but 144 bpm and driven: octave-pumping bass, a bouncing pizzicato
// ostinato (3+3+2), an oboe tune that hammers a repeated-note hook (G G C B C E),
// and brass that thickens the second half of each section.
// Form: intro(2) A(8) B(8) A2(8) bridge(8) = 34 bars, loops from A.

const F_CH = {   // pad = held chord, pz = [low, mid, high] for the ostinato, sp = chip sparkle [a, b, c]
  C:  { pad: "c4+e4+g4", pz: ["g4", "c5", "e5"], sp: ["c6", "e6", "g6"] },
  G:  { pad: "b3+d4+g4", pz: ["g4", "b4", "d5"], sp: ["b5", "d6", "g6"] },
  Am: { pad: "a3+c4+e4", pz: ["a4", "c5", "e5"], sp: ["a5", "c6", "e6"] },
  Em: { pad: "b3+e4+g4", pz: ["g4", "b4", "e5"], sp: ["g5", "b5", "e6"] },
  F:  { pad: "a3+c4+f4", pz: ["a4", "c5", "f5"], sp: ["a5", "c6", "f6"] },
  Dm: { pad: "a3+d4+f4", pz: ["a4", "d5", "f5"], sp: ["a5", "d6", "f6"] },
};
const F_A = ["C", "G", "Am", "Em", "F", "C", "Dm", "G"];
const F_B = ["Am", "F", "C", "G", "Am", "F", "G", "G"];
const F_R = ["Dm", "Em", "F", "G", "Dm", "Em", "F", "G"];

// bass: root and its octave pumping in eighths, the last two eighths walk to the next root
const pump = (r, x, y) => `${r}:2 ${up(r)}:2 ${r}:2 ${up(r)}:2 ${r}:2 ${up(r)}:2 ${x}:2 ${y}:2`;
const gallop = (r, x) => `${r}:2 ${r}:1 ${r}:1 ${up(r)}:2 ${r}:2 ${r}:2 ${r}:1 ${r}:1 ${up(r)}:2 ${x}:2`;
const F_BASS_A = [["c2", "e2", "d2"], ["g2", "d3", "b2"], ["a2", "c3", "g2"], ["e2", "g2", "a2"],
                  ["f2", "a2", "g2"], ["c2", "g2", "e2"], ["d2", "a2", "f2"], ["g2", "d3", "b2"]];
const F_BASS_A2 = [...F_BASS_A.slice(0, 7), ["g2", "b2", "a2"]];          // the last bar leans into the bridge
const F_BASS_B = [["a2", "c3", "g2"], ["f2", "a2", "g2"], ["c2", "e2", "d2"], ["g2", "d3", "b2"],
                  ["a2", "c3", "g2"], ["f2", "c3", "a2"], ["g2", "b2", "d3"], ["g2", "b2", "c3"]];
const F_BASS_R = [["d2", "a2"], ["e2", "b2"], ["f2", "c3"], ["g2", "d3"], ["d2", "a2"], ["e2", "b2"], ["f2", "c3"], ["g2", "b2"]];

const osti = ([a, b, c]) => `${a}:3 ${c}:3 ${b}:2 ${a}:3 ${c}:3 ${b}:2`;                       // 3+3+2, twice
const osti8 = ([a, b, c]) => `${a}:2 ${c}:2 ${b}:2 ${c}:2 ${a}:2 ${c}:2 ${b}:2 ${c}:2`;         // plain eighths
const run16 = ([a, b, c]) => `${a}:1 ${b}:1 ${c}:1 ${b}:1 `.repeat(4);                          // sixteenth runs
const sparkle = ([a, b, c]) => `r:2 ${a}:2' r:2 ${b}:2' r:2 ${a}:2' r:2 ${c}:2'`;               // off-beat chip glints

const fCh = (names, fn) => J(names.map((n) => fn(F_CH[n])));
const fPad = (names) => fCh(names, (c) => `${c.pad}:16`);

// the oboe tune, one string per bar (16 steps each)
const F_TUNE_A = [
  "g5:3 g5:1 c6:4 b5:2 c6:2 e6:4",         // C   the hook: two taps, then up
  "d6:6 b5:2 g5:4 b5:4",                   // G   answer falls through the chord
  "a5:3 a5:1 c6:4 e6:2 d6:2 c6:4",         // Am  the hook again, a step down
  "b5:6 g5:2 e5:4 g5:2 a5:2",              // Em  and into the F
  "a5:3 a5:1 c6:4 f6:4 e6:2 d6:2",         // F
  "c6:6 e6:2 g6:4 e6:4",                   // C   the peak
  "d6:3 d6:1 f6:4 e6:2 d6:2 c6:4",         // Dm
  "d6:4 b5:4 g5:4 r:4",                    // G   half close, room for the fill
];
const F_TUNE_A2 = F_TUNE_A.map((b, i) => (i === 1 ? "d6:3 d6:1 g6:4 f6:2 e6:2 d6:4" : i === 7 ? "d6:2 e6:2 d6:2 b5:2 g5:4 r:4" : b));
const F_TUNE_B = [
  "e6:6 c6:2 a5:4 c6:4",                   // Am  singing, longer notes
  "a5:6 c6:2 f6:8",                        // F
  "e6:6 d6:2 c6:4 g5:4",                   // C
  "g5:4 b5:4 d6:8",                        // G   climbs and holds
  "e6:6 c6:2 a5:4 c6:4",                   // Am
  "a5:4 c6:4 f6:6 e6:2",                   // F
  "d6:6 b5:2 g5:4 d5:4",                   // G
  "g5:4 b5:4 d6:4 r:4",                    // G
];
const F_TUNE_R = [
  "a5:4 f5:2 a5:2 d6:8",                   // Dm  each bar climbs a step
  "b5:4 g5:2 b5:2 e6:8",                   // Em
  "c6:4 a5:2 c6:2 f6:8",                   // F
  "d6:4 b5:2 d6:2 g6:8",                   // G
  "f6:6 e6:2 d6:4 f6:4",                   // Dm
  "e6:6 d6:2 b5:4 e6:4",                   // Em
  "f6:6 e6:2 c6:4 a5:4",                   // F
  "d6:4 b5:4 g5:4 r:4",                    // G
];

// the drum bars (16 steps)
const F_G1 = "K.hhS.hhK.hkS.hh", F_G2 = "K.hhS.hhK.hhS.hk";
const F_FILL = "K.h.S.h.SsSsttmm", F_FILL2 = "SsSsSsSsSSttmmKK";

// ---- greenwood-boss: The Wyrm Wakes ------------------------------------------
// C minor, 132 bpm. Timpani and a chugging synth bass under a brass hook that
// rises, falls and leans on the dominant; horns double it lower, an oboe joins
// at the unison, choir hangs chords above shivering strings.
// Form: intro(4) A(8) B(8) A2(8) bridge(8) = 36 bars, loops from A.

const D_CH = {   // choir = held chord, tr = tremolo note for the strings, pulse = brass dyad
  Cm: { choir: "c4+eb4+g4", tr: "g4", pulse: "c4+g4" },
  Ab: { choir: "c4+eb4+ab4", tr: "eb4", pulse: "ab3+eb4" },
  Fm: { choir: "c4+f4+ab4", tr: "c5", pulse: "f3+c4" },
  G:  { choir: "b3+d4+g4", tr: "d4", pulse: "g3+d4" },
  Bb: { choir: "bb3+d4+f4", tr: "f4", pulse: "bb3+f4" },
  Eb: { choir: "eb4+g4+bb4", tr: "bb4", pulse: "eb4+bb4" },
  Gm: { choir: "bb3+d4+g4", tr: "d4", pulse: "g3+d4" },
};
const D_A = ["Cm", "Ab", "Fm", "G", "Cm", "Ab", "Bb", "G"];
const D_B = ["Eb", "Bb", "Cm", "Gm", "Ab", "Eb", "Fm", "G"];
const D_R = ["Ab", "Bb", "Cm", "Cm", "Ab", "Bb", "G", "G"];
const dCh = (names, fn) => J(names.map((n) => fn(D_CH[n])));
const dChoir = (names) => dCh(names, (c) => `${c.choir}:16`);
const trem = (n) => `${n}:1^ ${n}:1 ${n}:1 ${n}:1 `.repeat(4);      // shivering sixteenths, pulse on each beat
const trem8 = (n) => `${n}:2^ ${n}:2 `.repeat(4);                    // calmer eighths
const chug = (r) => `${r}:2^ ${r}:2' ${up(r)}:2' ${r}:2' ${r}:2^ ${r}:2' ${up(r)}:2' ${r}:2'`;
const sustain = (r) => `${r}:6 ${r}:2 ${up(r)}:4 ${r}:4`;
const tim = (t) => `${t}:6 ${t}:2 ${t}:6 ${t}:2`;                     // hits on 1, the & of 2, 3, the & of 4
const D_BASS_A = ["c2", "ab1", "f2", "g2", "c2", "ab1", "bb1", "g1"];
const D_BASS_B = ["eb2", "bb1", "c2", "g1", "ab1", "eb2", "f2", "g2"];
const D_BASS_R = ["ab1", "bb1", "c2", "c2", "ab1", "bb1", "g1", "g1"];
const D_TIM_A = ["c2", "ab2", "f2", "g2", "c2", "ab2", "bb1", "g2"];
const D_TIM_B = ["eb2", "bb1", "c2", "g2", "ab2", "eb2", "f2", "g2"];
const D_TIM_R = ["ab2", "bb2", "c3", "c3", "ab2", "bb2", "g2", "g2"];

// the hook: every bar 16 steps
const D_HOOK = [
  "c5:4 c5:2 eb5:2 g5:6 f5:2",             // Cm  two taps and up an arpeggio
  "ab5:4 g5:2 f5:2 eb5:8",                 // Ab  and down the stairs
  "f5:4 f5:2 ab5:2 c6:6 bb5:2",            // Fm  the same tap, a fourth higher: the top
  "g5:6 f5:2 d5:4 b4:4",                   // G   falls to the leading tone
  "c5:4 c5:2 eb5:2 g5:6 f5:2",             // Cm
  "eb5:4 f5:2 g5:2 ab5:8",                 // Ab  this time it climbs
  "f5:4 d5:2 f5:2 bb5:4 g5:2 f5:2",        // Bb
  "g5:4 b5:6 g5:2 r:4",                    // G   hangs on the dominant
];
const D_TUNE_B = [
  "bb4:6 g4:2 bb4:4 eb5:4",                // Eb  a lament in the relative major
  "d5:6 c5:2 bb4:4 d5:4",                  // Bb
  "eb5:6 d5:2 c5:4 eb5:4",                 // Cm
  "d5:8 f5:4 g5:4",                        // Gm
  "c5:4 eb5:4 ab5:8",                      // Ab  reaching
  "g5:6 f5:2 eb5:4 g5:4",                  // Eb
  "ab5:4 c6:4 bb5:4 ab5:4",                // Fm  the climax
  "g5:8 f5:2 d5:2 b4:4",                   // G   falls back to the tonic
];
const D_TUNE_R = [
  "ab5:6 g5:2 ab5:4 c6:4",                 // Ab  the oboe screams over the pulse
  "bb5:6 ab5:2 bb5:4 d6:4",                // Bb
  "eb6:8 d6:4 c6:4",                       // Cm
  "g5:4 c6:4 eb6:4 g6:4",                  // Cm  up the arpeggio
  "eb6:6 c6:2 ab5:4 c6:4",                 // Ab
  "f6:6 d6:2 bb5:4 d6:4",                  // Bb
  "g5:2 b5:2 d6:4 g6:8",                   // G   the top, held
  "g6:6 f6:2 d6:4 r:4",                    // G   room for the roll
];
const D_FILL = "S.s.S.s.SsSsttmm", D_FILL2 = "SsSsSsSsSSSSmmmm";

export default [
  {
    id: "greenwood-build",
    title: "Vale Road (calm)",
    area: "greenwood",
    bpm: 108,
    key: "C major",
    parts: {
      lead:  { inst: "flute",   gain: 1.0, pan: 0.1, send: 0.3 },
      harp:  { inst: "harp",    gain: 0.8, pan: -0.25, send: 0.35 },
      pizz:  { inst: "pizz",    gain: 0.55, pan: 0.3, send: 0.2 },
      pad:   { inst: "strings", gain: 0.6, pan: 0, send: 0.4 },
      bass:  { inst: "bass",    gain: 0.9, pan: 0, send: 0.05 },
      drums: { inst: "drums",   gain: 0.55, pan: 0, send: 0.1 },
    },
    sections: {
      intro: { bars: 2, play: {
        harp: A_HARP[0] + " | " + A_HARP[1],
        pad: `${C}:16 | ${G}:16`,
      } },
      A: { bars: 8, play: {
        lead: [
          "e5:4 g5:4 c6:6 b5:2", "a5:4 g5:4 d5:8", "e5:4 a5:4 c6:4 b5:2 a5:2", "g5:6 f5:2 a5:8",
          "e5:4 g5:4 c6:4 d6:4", "e6:6 d6:2 b5:4 g5:4", "a5:4 c6:4 a5:4 f5:4", "g5:8 b5:4 d6:4",
        ].join(" | "),
        harp: A_HARP.join(" | "),
        pizz: A_CH.map(stab).join(" | "),
        pad: A_CH.map((c) => `${c}:16`).join(" | "),
        bass: A_ROOT.map(bassBar).join(" | "),
        drums: "k.h.x.h.k.h.x.h.",
      } },
      B: { bars: 8, play: {
        lead: [
          "c6:4 b5:2 a5:2 e5:8", "c6:4 a5:4 f5:8", "g5:4 e5:4 g5:4 c6:4", "b5:6 a5:2 g5:8",
          "c6:4 e6:4 d6:4 c6:4", "a5:6 c6:2 f6:8", "d6:4 b5:4 g5:4 b5:4", "c6:12 r:4",
        ].join(" | "),
        harp: B_HARP.join(" | "),
        pizz: B_CH.map(stab).join(" | "),
        pad: B_CH.map((c) => `${c}:16`).join(" | "),
        bass: B_ROOT.map(bassBar).join(" | "),
        drums: "k.h.x.h.k.h.x.h.",
      } },
    },
    order: ["intro", "A", "B"],
    loopFrom: 1,
  },
  {
    id: "greenwood-fight",
    title: "Raiders on the Road",
    area: "greenwood",
    bpm: 144,
    key: "C major",
    parts: {
      lead:    { inst: "oboe",    gain: 1.0,  pan: 0.1,   send: 0.25 },
      brass:   { inst: "brass",   gain: 0.62, pan: -0.15, send: 0.2 },
      strings: { inst: "strings", gain: 0.5,  pan: 0,     send: 0.4 },
      pizz:    { inst: "pizz",    gain: 0.55, pan: -0.3,  send: 0.15 },
      chip:    { inst: "chip",    gain: 0.3,  pan: 0.35,  send: 0.3 },
      bass:    { inst: "bass",    gain: 0.9,  pan: 0,     send: 0.05 },
      drums:   { inst: "drums",   gain: 0.55, pan: 0,     send: 0.1 },
    },
    sections: {
      intro: { bars: 2, play: {
        brass: J(["c5:6 e5:2 g5:8", "b4:4 d5:4 g5:4 b5:4"]),
        strings: fPad(["C", "G"]),
        pizz: fCh(["C", "G"], (c) => osti(c.pz)),
        bass: J(F_BASS_A.slice(0, 2).map(([r, x, y]) => pump(r, x, y))),
        drums: F_G1 + "|" + F_FILL2,
      } },
      A: { bars: 8, play: {
        lead: J(F_TUNE_A),
        brass: rest(4) + " " + oct(J(F_TUNE_A.slice(4)), -1),
        strings: fPad(F_A),
        pizz: fCh(F_A, (c) => osti(c.pz)),
        bass: J(F_BASS_A.map(([r, x, y]) => pump(r, x, y))),
        drums: drumBars(8, [F_G1, F_G2], F_FILL),
      } },
      B: { bars: 8, play: {
        lead: J(F_TUNE_B),
        brass: rest(4) + " " + oct(J(F_TUNE_B.slice(4)), -1),
        strings: fPad(F_B),
        pizz: fCh(F_B, (c) => osti8(c.pz)),
        chip: fCh(F_B, (c) => sparkle(c.sp)),
        bass: J(F_BASS_B.map(([r, x, y]) => pump(r, x, y))),
        drums: drumBars(8, [F_G2, F_G1], F_FILL),
      } },
      A2: { bars: 8, play: {
        lead: J(F_TUNE_A2),
        brass: oct(J(F_TUNE_A2), -1),
        strings: fPad(F_A),
        pizz: fCh(F_A, (c) => osti(c.pz)),
        chip: fCh(F_A, (c) => sparkle(c.sp)),
        bass: J(F_BASS_A2.map(([r, x, y]) => pump(r, x, y))),
        drums: drumBars(8, [F_G1, F_G2], F_FILL),
      } },
      bridge: { bars: 8, play: {
        lead: J(F_TUNE_R),
        brass: rest(4) + " " + oct(J(F_TUNE_R.slice(4)), -1),
        strings: fPad(F_R),
        pizz: fCh(F_R, (c) => run16(c.pz)),
        bass: J(F_BASS_R.map(([r, x]) => gallop(r, x))),
        drums: ["C.h.S.h.K.hkS.h.", F_G1, F_G2, F_G1, F_G2, F_G1, F_G2, F_FILL2].join("|"),
      } },
    },
    order: ["intro", "A", "B", "A2", "bridge"],
    loopFrom: 1,
  },
  {
    id: "greenwood-boss",
    title: "The Wyrm Wakes",
    area: "greenwood",
    bpm: 132,
    key: "C minor",
    parts: {
      brass:   { inst: "brass",   gain: 0.58, pan: 0.05,  send: 0.25 },
      horn:    { inst: "horn",    gain: 0.4,  pan: -0.2,  send: 0.3 },
      reed:    { inst: "oboe",    gain: 0.29, pan: 0.2,   send: 0.25 },
      choir:   { inst: "choir",   gain: 0.27, pan: 0,     send: 0.5 },
      strings: { inst: "strings", gain: 0.24, pan: 0.25,  send: 0.35 },
      timp:    { inst: "timpani", gain: 0.44, pan: 0,     send: 0.25 },
      bass:    { inst: "sbass",   gain: 0.46, pan: 0,     send: 0.05 },
      drums:   { inst: "drums",   gain: 0.27, pan: 0,     send: 0.12 },
    },
    sections: {
      intro: { bars: 4, play: {
        choir: "c4+eb4+g4:32 | c4+eb4+g4:16 | b3+d4+g4:16",
        strings: J([trem8("g4"), trem8("g4"), trem8("g4"), trem("d4")]),
        timp: J(["c2:4 r:12", "c2:4 r:4 c2:4 r:4", "c2:2 c2:2 c2:2 c2:2 c2:2 c2:2 g2:2 g2:2", fill16("g2")]),
        horn: rest(2) + " g3:8 c4:4 eb4:4 | g4:8 f4:4 d4:4",
        bass: rest(2) + " " + chug("c2") + " | " + chug("g1"),
        drums: "C" + ".".repeat(31) + "|K.m.K.m.K.m.K.m.|" + D_FILL2,
      } },
      A: { bars: 8, play: {
        brass: J(D_HOOK),
        horn: rest(4) + " " + oct(J(D_HOOK.slice(4)), -1),
        choir: dChoir(D_A),
        strings: J(D_A.map((n, i) => (i < 4 ? trem8 : trem)(D_CH[n].tr))),
        timp: J(D_TIM_A.map((t, i) => (i === 7 ? fill16(t) : tim(t)))),
        bass: J(D_BASS_A.map(chug)),
        drums: drumBars(8, ["K.h.S.h.K.hkS.h.", "K.m.S.t.K.m.S.tt"], D_FILL),
      } },
      B: { bars: 8, play: {
        brass: J(D_TUNE_B),
        horn: "eb3+bb3:16 | bb2+f3:16 | c3+g3:16 | g2+d3:16 " + oct(J(D_TUNE_B.slice(4)), -1),
        choir: dChoir(D_B),
        strings: J(D_B.map((n) => trem8(D_CH[n].tr))),
        timp: J(D_TIM_B.map((t, i) => (i === 7 ? fill16(t) : `${t}:8 ${t}:4 ${t}:2 ${t}:2`))),
        bass: J(D_BASS_B.map(sustain)),
        drums: drumBars(8, ["K...x...S...x...", "K.k.x...S...x..."], D_FILL),
      } },
      A2: { bars: 8, play: {
        brass: J(D_HOOK),
        reed: J(D_HOOK),
        horn: oct(J(D_HOOK), -1),
        choir: dChoir(D_A),
        strings: J(D_A.map((n) => trem(D_CH[n].tr))),
        timp: J(D_TIM_A.map((t, i) => (i === 7 ? fill16(t) : tim(t)))),
        bass: J(D_BASS_A.map(chug)),
        drums: drumBars(8, ["K.h.S.h.K.hkS.h.", "K.m.S.t.K.m.S.tt"], D_FILL2),
      } },
      bridge: { bars: 8, play: {
        reed: J(D_TUNE_R),
        brass: J(D_R.map((n) => { const d = D_CH[n].pulse; return `${d}:3^ ${d}:3 ${d}:2 ${d}:3 ${d}:3 ${d}:2`; })),
        horn: "ab2+eb3:16 | bb2+f3:16 | c3+g3:16 | c3+g3:16 | ab2+eb3:16 | bb2+f3:16 | g2+d3:16 | g2+d3:16",
        choir: dChoir(D_R),
        strings: J(D_R.map((n) => trem(D_CH[n].tr))),
        timp: J(D_TIM_R.map((t, i) => (i < 4 ? `${t}:4 ${t}:2 ${t}:2 ${t}:4 ${t}:2 ${t}:2` : i < 7 ? `${t}:2 `.repeat(8) : fill16(t)))),
        bass: J(D_BASS_R.map(chug)),
        drums: ["C.m.S.m.K.m.S.m.", "K.m.S.m.K.m.S.m.", "K.m.S.m.K.m.S.m.", "K.m.S.m.K.m.S.m.",
                "K.hmS.hmK.hmS.hm", "K.hmS.hmK.hmS.hm", "K.hmS.hmK.hmS.hm", D_FILL2].join("|"),
      } },
    },
    order: ["intro", "A", "B", "A2", "bridge"],
    loopFrom: 1,
  },
];
