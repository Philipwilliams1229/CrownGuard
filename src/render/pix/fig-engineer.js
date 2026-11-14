// ============ CREW FIGURE: the siege engineer ============
// The man at the machine: the catapult's winch and the Log Roller's lever, the
// Bladewheel's crank and hand-bar, the Ballista's siege bow. A leather skullcap
// with brass goggles pushed up on it, a brown jerkin, belt and pouch.
//
// HIS HANDS ARE ON THE MACHINE IN EVERY FRAME. A pose names where the handle is
// (`gN`, `gF`: the near and far fist, art px from his feet, facing +x) and the
// arms are solved to it (ik), so the bones keep their length and the fists never
// leave it. Each machine has its own clips, whose grip rides that machine's own
// circle (MACHINES below, the halls' numbers x2):
//   winch / winchIdle / winchLoose / winchRap   the catapult's windlass
//   lever / leverUp / heave / reset             the Log Roller's chock lever
//   wheel / wheelIdle                           the Bladewheel's crank (laid flat)
//   bar / barIdle                               the level-one Bladewheel's hand-bar
//   bow / bowIdle                               the Ballista's siege bow (rocking over the stock)
// A turning clip (winch, wheel, bar) is ONE TURN of the handle in 8 frames:
// frame f is the handle at phase f / 8, 0 = the top, turning forward
// (crankAt(hub, rx, ry, f / 8) in folk-workers.js). The hall picks the frame
// from its own crank angle and draws the handle at the frame's `grip` mark.
// Marks, every frame: grip (the handle: where the hall ends its crank arm, bar
// or lever), fist (the near fist: on the handle but in winchRap, where it raps a peg).
// Looks (o.variant): "engineer" (CREW_FOLK.engineer; also ARCHER_FOLK.crew, the
// same colours) and "stoker" (the Brazier Wheel's man, sooty).
import { mat, flat } from "./pix.js";
import { sampleKeys, HUMAN, scaled, ik } from "./rig.js";

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lighten = (c, t) => mix(c, "#fff3d2", t), darken = (c, t) => mix(c, "#2a1c2c", t);

// today's palettes (folk-kit.js CREW_FOLK.engineer, spiker.js STOKER)
const FOLK = {
  engineer: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018", hair: "#5a3a22" },
  stoker: { skin: "#e8b990", hood: "#3a3028", coat: "#6a3a2a", boots: "#2e2420", trim: "#3a2a20", hair: "#3a2a22" },
};
export const VARIANTS = { engineer: "Siege engineer", stoker: "Furnace stoker" };
const EYE = flat("#2a1c2c"), BRASS = mat("#d8b34a", { contrast: 1.15 }), LENS = flat("#2e3a48"), GLINT = flat("#bfe6f0");
const LOOKS = new Map();
const lookOf = (v) => {
  const key = FOLK[v] ? v : "engineer";
  let L = LOOKS.get(key);
  if (L) return L;
  const p = FOLK[key];
  L = {
    COAT: mat(p.coat), SKIRT: mat(darken(p.coat, 0.14)), SLEEVE: mat(lighten(p.coat, 0.16)), CUFF: mat(darken(p.trim, 0.05)),
    LEGC: mat(lighten(p.boots, 0.1)), BOOT: mat(darken(p.boots, 0.22)), BELT: mat(darken(p.trim, 0.15)), POUCH: mat(lighten(p.trim, 0.12)),
    CAP: mat(darken(p.hood, 0.3)), RIM: mat(lighten(p.hood, 0.3)), STRAP: mat(darken(p.hood, 0.55)),
    SKIN: mat(p.skin), HAIR: mat(p.hair),
  };
  L.LEG = {
    C: { m: L.CAP, floor: 1 }, k: { m: L.CAP, bias: 1, floor: 1 }, c: { m: L.CAP, bias: -1, floor: 1 }, R: { m: L.RIM }, t: { m: L.STRAP, fix: 1 },
    G: { m: BRASS }, g: { m: LENS }, w: { m: GLINT },
    S: { m: L.SKIN }, s: { m: L.SKIN, bias: -1 }, N: { m: L.SKIN, bias: 1 }, e: { m: L.SKIN, fix: 0 }, l: { m: L.SKIN, fix: 0 }, E: { m: EYE },
    H: { m: L.HAIR }, b: { m: L.HAIR, fix: 2 },
  };
  LOOKS.set(key, L);
  return L;
};

// His head, facing +x: the skullcap (C; k where the sun catches it, c its
// shadow and the tab down to the ear), its rolled rim (R), the goggles' strap
// round the crown (t) and the goggles on the front of it (G brass, g the lens,
// w its glint); a tuft of hair at the nape (H); the face at the front edge, the
// nose proud, a short moustache under it (S skin, s a tone down, b brow and moustache, E eye, N nose, l mouth).
const HEAD = [
  "....kkCCC....",
  "..kkCCCGGGG..",
  ".kCCCCCGgwG..",
  ".tttttttGGGC.",
  ".RRRCCRRRRRRR",
  ".HcCCSSbbSbb.",
  ".HHcCSSSESSE.",
  ".HHsSSSSESSEN",
  "..HsSSSSSSbb.",
  "....sSSSSSl..",
  "......SSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));

export const BOX = { w: 38, h: 56, ox: 15, oy: 53 };
// as tall as the old winch crew (crown ~47 art px), a long workman's body
export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, spine: 12, neck: 1.8, shN: -2.8, shF: 3, hipN: -1.7, hipF: 1.9 });

const leg = (px, L, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 3, k[0], k[1], 2.5, L.LEGC, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.4, an[0], an[1] - 2.4, 2, L.LEGC, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.25 + an[0] * 0.75, k[1] * 0.25 + an[1] * 0.75, 2.1, an[0], an[1] - 0.6, 2, L.BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1, 3.2, 1.5, L.BOOT, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk }, o = {}) => {
  const L = lookOf(o.variant);
  const { p, P, C, N, sN, sF, hN, hF, kN, kF, anN, anF, B } = sk;
  // the fists go to the handle; the elbows are solved (they hang down and back)
  const gN = p.gN || sk.hdN, gF = p.gF || sk.hdF;
  const aN = ik(sN[0], sN[1] + 0.3, gN[0], gN[1], B.upper, B.fore, 1), aF = ik(sF[0], sF[1], gF[0], gF[1], B.upper, B.fore, 1);
  const eN = aN.mid, hdN = aN.end, eF = aF.mid, hdF = aF.end;

  // the far arm, a tone down, behind the body
  px.part();
  px.capsule(sF[0], sF[1], 2.5, eF[0], eF[1], 2.3, L.SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.9, hdF[0], hdF[1], 1.7, L.SKIN, 0.98, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.8, 1.9, L.SKIN, 1.6, { bias: -1 });

  // legs: dark hose and boots, the feet planted wide
  leg(px, L, hF, kF, anF, 2, -1);
  leg(px, L, hN, kN, anN, 3, 0);

  // the jerkin: its skirt to mid-thigh, then the body, belted
  const top = C[1] - 1.8, hy = P[1] + 2.8;
  px.part();
  px.poly([[P[0] - 5.4, P[1] - 3], [P[0] + 5, P[1] - 3], [P[0] + 6.4, hy], [P[0] + 1, hy + 0.9], [P[0] - 6.8, hy]], L.SKIRT, 3.9, { round: 0.9, cast: 1 });
  px.part(); const body = px._pid;
  px.poly([[C[0] - 7, top + 1.8], [C[0] - 4, top], [C[0] + 3.8, top], [C[0] + 6.6, top + 1.8], [C[0] + 6.4, C[1] + 5], [P[0] + 4.8, P[1] - 3.4], [P[0] - 5.2, P[1] - 3.4], [C[0] - 7, C[1] + 5]], L.COAT, 4, { round: 0.92, cast: 2 });
  px.toneLine(C[0] + 3.6, top + 2.4, P[0] + 3, P[1] - 5.6, -1, body);          // the lacing edge
  px.toneLine(C[0] - 4.6, top + 2.6, P[0] + 3.4, P[1] - 6, -1, body);          // a strap across the chest
  px.part();
  px.poly([[P[0] - 5.6, P[1] - 5.2], [P[0] + 5.2, P[1] - 5.2], [P[0] + 5.2, P[1] - 3], [P[0] - 5.6, P[1] - 3]], L.BELT, 4.05, { round: 0.92, bias: -1, floor: 1, cast: 0 });
  px.rect(P[0] + 1.2, P[1] - 5.2, 2, 2.2, BRASS, 4.06, { fix: 3 });
  // a pouch on the belt, behind the hip
  px.part();
  px.poly([[P[0] - 7.2, P[1] - 3.2], [P[0] - 3.4, P[1] - 3.2], [P[0] - 3.6, P[1] + 1.4], [P[0] - 7, P[1] + 1.4]], L.POUCH, 4.1, { round: 0.8 });
  px.dot(P[0] - 5.2, P[1] - 1, BRASS, 4.12, { fix: 3 });

  // the head: whole pixels, so the face never shimmers
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, L.LEG, 6, { ax: 7, ay: 11, cast: 2 });

  // the near arm over it all: the sleeve rolled to the elbow, a bare forearm, the fist on the handle
  px.part();
  px.capsule(eN[0], eN[1], 2, hdN[0], hdN[1], 1.8, L.SKIN, 7.98, { cast: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.8, eN[0], eN[1], 2.5, L.SLEEVE, 8, { cast: 2 });
  px.part(); px.ellipse(hdN[0], hdN[1], 1.9, 2, L.SKIN, 8.2);

  return { marks: { grip: p.grip || gN, fist: hdN, far: hdF } };
};

// ---- the machines (art px from his feet, facing +x: the halls' own numbers x2) ----
//   hub, rx, ry   the handle's circle (ry < rx: a crank laid flat)
//   at            where the handle stops when he rests on it (a phase round it)
//   push          a bar leaned into, not a crank hauled
export const MACHINES = {
  winch: { hub: [8, -28], rx: 3.6, ry: 3.6, at: 0.1 },                 // catapult.js WINCH
  wheel: { hub: [7, -26], rx: 3.8, ry: 2.2, at: 1 / 6 },                // spiker.js CRANK - crewSpot, CRANK_RX / RY
  bar: { hub: [12.8, -26.8], rx: 1.8, ry: 1, at: 1 / 6, push: true },   // spiker.js BAR
  bow: { hub: [10.8, -26.8], rx: 3, ry: 3, at: 11 / 12 },               // drawCrew's own default, as archer.js calls it
};
const LEVER = [11, -26], LEVER_UP = [9.8, -32];                         // catapult.js LEVER; heaved, its end comes up 3 units and back with him
const TAU = Math.PI * 2;
export const gripAt = (m, ph) => { const a = -Math.PI / 2 + ph * TAU; return [m.hub[0] + Math.cos(a) * m.rx, m.hub[1] + Math.sin(a) * m.ry]; };
const far = (g) => [g[0] + 0.9, g[1] - 0.7];                            // the far fist beside the near one
const STANCE = { fN: [-3.6, 0], fF: [3.4, 0] };

// one turn of a handle: the body drives it from the hips, leading it a little,
// forward over the top, hanging back as it comes round underneath
const turning = (m, ph) => {
  const a = -Math.PI / 2 + ph * TAU, g = gripAt(m, ph), fwd = Math.cos(a + 0.45), low = Math.max(0, Math.sin(a + 0.2));
  const k = Math.min(1, m.rx / 3.6);
  const b = m.push ? { rx: 2.6, lean: 0.2, drop: 1, twist: 1.2 } : { rx: 0.5, lean: 0.04, drop: 0.3, twist: 1.3 };
  return {
    ...STANCE, fN: [m.push ? -4 : -3.6, 0],
    rx: b.rx + 1.3 * fwd * k, drop: b.drop + 0.8 * low * k, lean: b.lean + 0.1 * fwd * k, twist: b.twist + 0.25 * fwd * k,
    hx: 0.4 * fwd * k, hy: 0.5 * low * k, gN: g, gF: far(g), grip: g,
  };
};
// at ease, the hands where the handle stopped: a breath, the weight easing back and home
const resting = (g, ph, o = {}) => {
  const b = Math.sin(ph * TAU), b2 = Math.sin(ph * TAU - 1.1);
  return {
    ...STANCE, rx: (o.rx ?? 0.2) + 0.35 * b2, drop: -0.35 - 0.1 * b, rise: 0.45 + 0.45 * b, lean: (o.lean ?? 0) - 0.015 * b, twist: o.twist ?? 1.2,
    gN: g, gF: far(g), grip: g, blink: ph > 0.56 && ph < 0.7 ? 1 : 0,
  };
};
const hold = (g, o = {}) => ({ ...STANCE, rx: 0.2, drop: -0.35, rise: 0.45, lean: 0, twist: 1.2, gN: g, gF: far(g), grip: g, ...o });

const W = MACHINES.winch, W0 = gripAt(W, W.at), PEG = [W.hub[0] + 2.8, W.hub[1] - 3.6];
const LEV = { rx: 1.2, lean: 0.05 }, LEV_UP = { rx: 0.8, lean: -0.05 };
export const CLIPS = {
  // ---- the catapult's winch
  winch: { n: 8, ms: 690, loop: true, pose: (ph) => turning(W, ph) },
  winchIdle: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(W0, ph) },
  // the release: braced on the handle (HOLD: he waits here, loaded), he knocks it back and
  // the bed kicks; thrown upright he watches the stone go, then comes down to the handle again
  winchLoose: {
    n: 12, ms: 700, loop: false, hit: 0.4,
    pose: (ph) => sampleKeys([
      { t: 0, p: hold(W0) },
      { t: 0.3, e: "io", p: hold(W0, { rx: 1.6, drop: 1.9, rise: 0, lean: 0.13, twist: 1.3, hy: 0.6 }) },
      { t: 0.4, e: "in3", p: hold(gripAt(W, 0.86), { rx: -1, drop: 0.2, rise: 0.6, lean: -0.15, twist: 0.9, hx: -0.5, hy: -0.6 }) },
      { t: 0.58, e: "out", p: hold(gripAt(W, 0.8), { rx: -1.6, drop: 0, rise: 1.3, lean: -0.2, twist: 0.8, hx: -0.8, hy: -1 }) },
      { t: 0.82, e: "io", p: hold(gripAt(W, 0.95), { rx: -0.4, drop: 0.3, rise: 0.6, lean: -0.06, twist: 1, hy: -0.4 }) },
      { t: 1, e: "io", p: hold(W0) },
    ], ph),
  },
  // at ease, now and then: the near fist lifts and raps a peg home on the drum (the hall
  // sparks on the hit); the far fist stays on the handle
  winchRap: {
    n: 8, ms: 620, loop: false, hit: 0.58,
    pose: (ph) => sampleKeys([
      { t: 0, p: hold(W0) },
      { t: 0.4, e: "io", p: hold(W0, { gN: [PEG[0] - 0.4, PEG[1] - 7], rx: 0.9, lean: -0.04, rise: 0.9, twist: 1.4, hy: -0.4 }) },
      { t: 0.58, e: "in3", p: hold(W0, { gN: PEG, rx: 1.4, lean: 0.06, drop: 1, rise: 0.2, twist: 1.35, hy: 0.4 }) },
      { t: 0.74, e: "out", p: hold(W0, { gN: [PEG[0] + 0.4, PEG[1] - 1.8], rx: 1.2, lean: 0.04, twist: 1.3 }) },
      { t: 1, e: "io", p: hold(W0) },
    ], ph),
  },
  // ---- the Log Roller's lever (its end in his fists: low while the chock is set, up once it is knocked out)
  lever: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(LEVER, ph, LEV) },
  leverUp: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(LEVER_UP, ph, LEV_UP) },
  // crouched over the lever (HOLD), he heaves it up and hangs back on it as the log goes
  heave: {
    n: 12, ms: 800, loop: false, hit: 0.36,
    pose: (ph) => sampleKeys([
      { t: 0, p: hold(LEVER, LEV) },
      { t: 0.26, e: "io", p: hold(LEVER, { rx: 2.4, drop: 2.6, rise: 0, lean: 0.17, twist: 1.3, hy: 0.8 }) },
      { t: 0.36, e: "in3", p: hold([LEVER_UP[0] - 0.3, LEVER_UP[1] - 0.5], { rx: 0.6, drop: 0.4, rise: 0.8, lean: -0.15, twist: 1.2, hx: -0.5, hy: -0.5 }) },
      { t: 0.56, e: "out", p: hold([LEVER_UP[0] - 0.8, LEVER_UP[1] - 1.2], { rx: 0, drop: 1, rise: 0.4, lean: -0.22, twist: 1.1, hx: -0.8, hy: -0.8 }) },
      { t: 0.84, e: "io", p: hold(LEVER_UP, { rx: 0.6, drop: 0.5, lean: -0.08 }) },
      { t: 1, e: "io", p: hold(LEVER_UP, LEV_UP) },
    ], ph),
  },
  // the next log is up: he leans the lever down and sets the chock
  reset: {
    n: 6, ms: 520, loop: false,
    pose: (ph) => sampleKeys([
      { t: 0, p: hold(LEVER_UP, LEV_UP) },
      { t: 0.6, e: "in", p: hold([LEVER[0], LEVER[1] + 0.8], { rx: 2.2, drop: 1.8, rise: 0, lean: 0.14, twist: 1.3, hy: 0.6 }) },
      { t: 1, e: "out", p: hold(LEVER, LEV) },
    ], ph),
  },
  // ---- the Bladewheel's crank (laid flat) and the level-one hand-bar
  wheel: { n: 8, ms: 790, loop: true, pose: (ph) => turning(MACHINES.wheel, ph) },
  wheelIdle: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(gripAt(MACHINES.wheel, MACHINES.wheel.at), ph) },
  bar: { n: 8, ms: 790, loop: true, pose: (ph) => turning(MACHINES.bar, ph) },
  barIdle: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(gripAt(MACHINES.bar, MACHINES.bar.at), ph, { rx: 2.2, lean: 0.14 }) },
  // ---- the Ballista's siege bow: the hands rock over the stock, back to front and home
  bow: {
    n: 8, ms: 1047, loop: true,
    pose: (ph) => {
      const u = 0.5 - 0.5 * Math.cos(ph * TAU), m = MACHINES.bow, a = Math.PI + u * Math.PI, g = [m.hub[0] + Math.cos(a) * m.rx, m.hub[1] + Math.sin(a) * m.ry];
      const fwd = Math.cos(a + 0.45);
      return { ...STANCE, rx: 0.9 + 1.1 * fwd, drop: 0.3, lean: 0.05 + 0.09 * fwd, twist: 1.2 + 0.2 * fwd, hx: 0.3 * fwd, gN: g, gF: far(g), grip: g };
    },
  },
  bowIdle: { n: 8, ms: 2600, loop: true, pose: (ph) => resting(gripAt(MACHINES.bow, MACHINES.bow.at), ph, { rx: 0.8 }) },
};
// the contract's plain idle: standing by at the winch
CLIPS.idle = CLIPS.winchIdle;
