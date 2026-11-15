// ============ CREW FIGURE: the build crew (mason, hod carrier, setter) ============
// The three who sprint out of the castle gate to raise a hall (render/builders.js sets every
// timing and position; this file only draws a man in a pose, as the old folk.js drawWorker did).
//   variant "mason"   the cream coif, a long leather apron, a wooden mallet always in the near hand
//           "hod"     a flat brown cap, a short canvas apron; carries a plank out on the shoulder
//           "setter"  a red knitted cap, a canvas bib apron; carries a dressed stone in his arms
// The clips keep the OLD poses' names and frame counts, because builders.js picks a frame by
// number and its timing must not move:
//   run (6, loop)      contact frames are 0 and 3 (the dust kicks up there); runM (the mason, his
//                      mallet carried), runH (the hod, a plank on the shoulder), runS (the setter,
//                      a stone hugged to his belly) are the same stride loaded
//   climb (4)          seen from BEHIND on the ladder, hand over hand
//   hammer (3)         raised, coming down, struck
//   hand (4)           hod: a stone from the knees to the chest, overhead, let go
//   pick (4)           setter: crouched reaching, crouched holding, up with it, tossed
//   jump (3), land (2) the mason's hop from the platform and the squash after it
//   cheer (2)          the mallet held up high
//   stand (1)
// Feet at (0, 0) in art pixels, two to a board unit; BOX is the old sprite box (36 x 42 units,
// feet at 18, 37) so the stamp is the same place. Facing +x; builders.js bakes the left side
// with the light flipped and mirrors it. The stone's own sprite is the `block` clip of `BLOCK`.
import { mat, flat } from "./pix.js";
import { solve, ik, sampleKeys, walkPose, HUMAN, scaled, clamp } from "./rig.js";

export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6, upper: 7.6, fore: 7.2 });
export const BOX = { w: 72, h: 84, ox: 36, oy: 74 };
export const VARIANTS = { mason: "Mason (mallet)", hod: "Hod carrier (plank)", setter: "Setter (dressed stone)" };
const ARM = BONES.upper + BONES.fore;

const EYE = flat("#2a1c2c"), LIP = flat("#b0705a");
const HAFT = mat("#6a4a2e"), MAUL = mat("#b4804a", { contrast: 1.15 }), WOOD = mat("#c49a5c", { contrast: 1.15 }), WOODD = mat("#94693a");
const STONE = mat("#a19a8a", { contrast: 1.2 }), STONED = mat("#7c766a");
const LOOK = {
  mason: { skin: mat("#e8b990"), cap: mat("#e4d8b8"), coat: mat("#8a7a5a"), sleeve: mat("#9a8a68"), apron: mat("#9a643a", { contrast: 1.2 }), hose: mat("#6a5c44"), boot: mat("#3e2a1a", { contrast: 1.2 }), belt: mat("#4a3424"), hair: mat("#5a3a22"), band: mat("#e4d8b8") },
  hod: { skin: mat("#d9a47a"), cap: mat("#6e5434", { contrast: 1.15 }), coat: mat("#9c8a60"), sleeve: mat("#a89868"), apron: mat("#dcd0b4"), hose: mat("#5e5038"), boot: mat("#3a2818", { contrast: 1.2 }), belt: mat("#4a3a2a"), hair: mat("#5a3a22"), band: mat("#8a6c44") },
  setter: { skin: mat("#e8b990"), cap: mat("#b04a38", { contrast: 1.15 }), coat: mat("#76684c"), sleeve: mat("#867858"), apron: mat("#d2c4a2"), hose: mat("#5a4a3a"), boot: mat("#3e2a1a", { contrast: 1.2 }), belt: mat("#4a3a2a"), hair: mat("#a06a38"), band: mat("#d8826c") },
};
for (const k in LOOK) LOOK[k].skinS = LOOK[k].skin;

// the heads, facing +x (13 x 12, stamped on the neck): the near eye and the far eye, a nose
//   C cap / coif, c its peak or fold, d its shade, r hair, B the cuff, S skin, s a tone down, N nose, E eye, e shut, m lips
const HEADS = {
  mason: [
    "....CCCC.....",
    "..CCCCCCCC...",
    ".CCCCCCCCCC..",
    "CCCCCCCCCCCC.",
    "CCCCCcdssss..",
    "CCCCcdSESSE..",
    "CCCCcdSESSEN.",
    "CCCccdSSSSS..",
    ".CCcdsSSmm...",
    ".CCcdsSSSS...",
    "..CCc.ss.....",
    "..cCC........",
  ],
  hod: [
    "....CCCC.....",
    "..CCCCCCCC...",
    ".CCCCCCCCCC..",
    "CCCCCCCCCCCcc",
    "rrrdssssss...",
    "rrrrdSSESSE..",
    "rrrrdSSESSEN.",
    "rrrsdSSSSSS..",
    ".rrsdsSSmm...",
    ".rrssSSSSS...",
    "..rrs.ss.....",
    "...rr........",
  ],
  setter: [
    ".....CCCC....",
    "...CCCCCCCC..",
    "..CCCCCCCCCC.",
    "..CCCCCCCCCC.",
    "rrBBBBBBBBBB.",
    "rrrrdSSESSE..",
    "rrrrdSSESSEN.",
    "rrrsdSSSSSS..",
    ".rrsdsSSmm...",
    ".rrssSSSSS...",
    "..rrs.ss.....",
    "...rr........",
  ],
};
const BLINKS = {};
for (const k in HEADS) BLINKS[k] = HEADS[k].map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const legendOf = (L) => ({
  C: { m: L.cap, fix: 2 }, c: { m: L.cap, fix: 3 }, d: { m: L.cap, fix: 0 }, B: { m: L.band, fix: 2 }, r: { m: L.hair },
  S: { m: L.skin }, s: { m: L.skin, bias: -1 }, N: { m: L.skin, bias: 1 }, e: { m: L.skin, fix: 0 }, E: { m: EYE }, m: { m: LIP },
});
const LEGENDS = {};
for (const k in LOOK) LEGENDS[k] = legendOf(LOOK[k]);

const leg = (px, L, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.4, k[0], k[1], 2.1, L.hose, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.0, an[0], an[1] - 2.8, 1.8, L.hose, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.4 + an[0] * 0.6, k[1] * 0.4 + an[1] * 0.6, 2.1, an[0], an[1], 1.9, L.boot, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.1, 3, 1.6, L.boot, z + 0.03, { bias: b, floor: 1 });
};

// a mallet: a haft from the fist and a heavy head at its far end, `a` the screen angle (0 +x, + down)
const mallet = (px, hd, a, z) => {
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  px.part();
  px.line(hd[0] - ux * 2, hd[1] - uy * 2, hd[0] + ux * 9.6, hd[1] + uy * 9.6, HAFT, z, { fix: 2 });
  const cx = hd[0] + ux * 10.8, cy = hd[1] + uy * 10.8;
  px.poly([[cx - ux * 2.4 + vx * 3.2, cy - uy * 2.4 + vy * 3.2], [cx + ux * 2.4 + vx * 3.2, cy + uy * 2.4 + vy * 3.2], [cx + ux * 2.4 - vx * 3.2, cy + uy * 2.4 - vy * 3.2], [cx - ux * 2.4 - vx * 3.2, cy - uy * 2.4 - vy * 3.2]], MAUL, z + 0.05, { n: [0, -0.3, 0.95] });
};
// a dressed stone, centred at (x, y), 9 x 7 px
const stone = (px, x, y, z) => {
  px.part();
  px.rect(x - 4.5, y - 3.5, 9, 7, STONE, z, { n: [-0.2, -0.35, 0.9], cast: 1 });
  px.rect(x + 2.4, y - 2.5, 2.1, 6, STONED, z + 0.01, { n: [0.4, 0.1, 0.9] });
  px.dot(x - 2, y + 1, STONED, z + 0.02, { fix: 1 }); px.dot(x - 1, y + 1, STONED, z + 0.02, { fix: 1 });   // a tool mark
};
// a plank on the shoulder, centred at (x, y) and tilted `a`, 34 px long
const plank = (px, x, y, a, z) => {
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux, h = 17, w = 2;
  px.part();
  px.poly([[x - ux * h + vx * w, y - uy * h + vy * w], [x + ux * h + vx * w, y + uy * h + vy * w], [x + ux * h - vx * w, y + uy * h - vy * w], [x - ux * h - vx * w, y - uy * h - vy * w]], WOOD, z, { n: [0, -0.5, 0.85], cast: 1 });
  px.line(x - ux * 8 - vx * 0.5, y - uy * 8 - vy * 0.5, x - ux * 2.5 - vx * 0.5, y - uy * 2.5 - vy * 0.5, WOODD, z + 0.01, { fix: 1 });   // grain
  px.line(x + ux * 6, y + uy * 6, x + ux * 11, y + uy * 11, WOODD, z + 0.01, { fix: 1 });
};

// ---- the three-quarter figure --------------------------------------------------------------
const side = (px, { sk, lag1 }, o) => {
  const look = o.variant in LOOK ? o.variant : "mason", L = LOOK[look];
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = clamp(C[0] - lag1.C[0], -2.4, 2.4);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm, a tone down
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.0, L.sleeve, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.8, L.sleeve, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.8, L.skin, 1.6, { bias: -1 });
  leg(px, L, hF, kF, anF, 2, -1);
  leg(px, L, hN, kN, anN, 3, 0);

  // the tunic, belted; then the apron over its front
  const hemY = P[1] + 5, hemB = P[0] - 5.8 - vx, hemF = P[0] + 5.6 - vx * 0.6;
  px.part(); const tun = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.8, C[1] + 3.4], [P[0] + 4.6, P[1] - 4], [hemF, hemY], [hemB, hemY], [P[0] - 4.8, P[1] - 4], [C[0] - 5.8, C[1] + 3.4]], L.coat, 4, { round: 0.92, cast: 2, floor: 1 });
  px.toneLine(P[0] + 1.2, P[1] - 2, P[0] + 1 - vx * 0.5, hemY - 1.2, -1, tun);
  if (look === "hod") {
    // the short waist apron
    px.poly([[P[0] - 0.6, P[1] - 4], [P[0] + 5.2, P[1] - 4], [P[0] + 6 - vx * 0.8, P[1] + 5.4], [P[0] - 1.6 - vx * 1.2, P[1] + 5.8]], L.apron, 4.04, { round: 0.9, floor: 1 });
  } else {
    px.poly([[C[0] + 0.4, C[1] + 3], [C[0] + 5.2, C[1] + 3], [hemF + 0.6, hemY + 3.4], [P[0] - 1.4 - vx * 0.5, hemY + 3.4]], L.apron, 4.04, { round: 0.9, floor: 1 });
    px.line(C[0] + 1, C[1] - 1.8, C[0] + 1.6, C[1] + 3, L.belt, 4.07, { fix: 1 });                    // the neck strap
  }
  px.poly([[P[0] - 5, P[1] - 5], [P[0] + 4.8, P[1] - 5], [P[0] + 4.8, P[1] - 3], [P[0] - 5, P[1] - 3]], L.belt, 4.06, { round: 0.92 });
  px.rect(P[0] + 2.4, P[1] + 1.4, 1, 3, HAFT, 4.08, { fix: 1 });                                          // a tool in the apron's loop

  if (p.plank) plank(px, sN[0] + 5, sN[1] - 2.4, p.plank[2] ?? -0.06, 5.2);

  // the head; the mason's coif also wraps his shoulders
  if (look === "mason") {
    px.part();
    px.poly([[C[0] - 5.6, C[1] - 2.8], [C[0] + 5.4, C[1] - 2.8], [C[0] + 6, C[1] + 0.2], [C[0] + 2.4, C[1] + 1.6], [C[0] - 2.6, C[1] + 1.8], [C[0] - 6.2, C[1] + 0.6]], L.cap, 5, { round: 0.9, cast: 1 });
  }
  px.part();
  px.stamp(p.blink ? BLINKS[look] : HEADS[look], hx, hy + (p.hdrop || 0), LEGENDS[look], 6, { ax: 6, ay: 12, cast: 1 });

  if (p.stone) stone(px, p.stone[0], p.stone[1], 7);
  if (p.mal != null && look === "mason") mallet(px, hdN, p.mal, 7.6);

  // the near arm over it all
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.5, eN[0], eN[1], 2.2, L.sleeve, 8, { cast: 1 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.8, L.sleeve, 8, { cast: 1 });
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.8, L.skin, 8.2);
  if (p.open) { px.part(); px.ellipse(hdN[0] + 0.8, hdN[1] - 1.8, 1.1, 1.6, L.skin, 8.3); px.ellipse(hdF[0] + 0.8, hdF[1] - 1.8, 1.1, 1.6, L.skin, 8.3); }
};

// ---- the climb, seen from behind ---------------------------------------------------------
// the figure centred on x = 0, the ladder's rails a hand's width either side of the head
const back = (px, sk, o) => {
  const look = o.variant in LOOK ? o.variant : "mason", L = LOOK[look];
  const { p } = sk, sd = p.cs, mid = p.cm;
  const footUp = mid ? 3.2 : 6.4, handUp = mid ? 45 : 48;
  // legs: one boot on a rung, the other lifted to the next
  for (const s of [-1, 1]) {
    const up = s === sd, fx = s * 3, fy = up ? -footUp : 0, hy = -20.7;
    const kx = s * 3.6, ky = up ? hy + (fy - hy) * 0.55 - 3 : -9;
    px.part();
    px.capsule(s * 2.6, hy, 2.5, kx, ky, 2.1, L.hose, up ? 3 : 2, { floor: 1, bias: up ? 0 : -1 });
    px.capsule(kx, ky, 2.1, fx, fy - 2.4, 1.9, L.hose, up ? 3 : 2, { floor: 1, bias: up ? 0 : -1 });
    px.ellipse(fx, fy - 1.2, 2.5, 2.1, L.boot, up ? 3.1 : 2.1, { floor: 1, bias: up ? 0 : -1 });
    px.ellipse(fx, fy + 0.2, 2.8, 1.2, L.boot, up ? 3.2 : 2.2, { floor: 1, bias: up ? 0 : -1 });
  }
  // the back of the tunic, the belt, the apron's strings and bow
  px.part(); const tun = px._pid;
  px.poly([[-6, -34], [6, -34], [6.6, -26], [5.8, -19.6], [-5.8, -19.6], [-6.6, -26]], L.coat, 4, { round: 0.9, cast: 2, floor: 1 });
  px.toneLine(-1.2, -33, -1.2, -21, -1, tun);
  px.rect(-6, -23, 12, 2.2, L.belt, 4.05, { round: 0.9 });
  if (look !== "hod") { px.line(-5, -33, -1.6, -23, L.apron, 4.03); px.line(5, -33, 1.6, -23, L.apron, 4.03); }   // the bib's straps cross the back
  px.ellipse(0, -22, 2.4, 1.8, L.apron, 4.08, { round: 0.8 });                                                      // the knot
  if (look === "mason") {
    // the mallet stuck through the belt while both hands are on the rungs
    px.part();
    px.line(5.4, -26, 6.8, -16, HAFT, 4.2, { fix: 2 });
    px.rect(5, -16.6, 5.6, 4.6, MAUL, 4.25, { n: [0, -0.3, 0.95] });
  }
  // the head from behind: a nape, the coif or the hair and cap
  px.part();
  px.rect(-1.8, -36.4, 3.6, 3, L.skin, 4.5, { bias: -1 });
  const hy = -41;
  if (look === "mason") {
    px.ellipse(0, hy, 5.4, 5.8, L.cap, 6, { round: 0.95, cast: 1 });
    px.line(0, hy - 5, 0, hy + 4, L.cap, 6.2, { fix: 1 });
    px.rect(-5.2, hy + 2.4, 10.4, 1.4, L.cap, 6.1, { fix: 1 });
  } else {
    px.ellipse(-4.8, hy + 0.8, 1.4, 1.8, L.skin, 5.9, { bias: -1 }); px.ellipse(4.8, hy + 0.8, 1.4, 1.8, L.skin, 5.9, { bias: -1 });   // the ears
    px.ellipse(0, hy + 0.6, 4.8, 5, L.hair, 6, { round: 0.95 });
    px.ellipse(0, hy - 2, 5.2, look === "setter" ? 6 : 4, L.cap, 6.2, { round: 0.95, cast: 1 });
    px.rect(-5.2, hy - 0.8, 10.4, 1.6, look === "setter" ? L.band : L.hair, 6.25, { fix: 2 });
  }
  // arms up to the rails either side of the head, one reaching higher
  for (const s of [-1, 1]) {
    const hi = s === -sd, hx = s * 10.5, hh = hi ? -handUp : -handUp + 5.2;
    const shx = s * 6.2, shy = -32;
    const r = ik(shx, shy, hx, hh, BONES.upper, BONES.fore, s);
    px.part();
    px.capsule(shx, shy, 2.4, r.mid[0], r.mid[1], 2.2, s < 0 ? L.coat : L.sleeve, 7, { cast: 1 });
    px.capsule(r.mid[0], r.mid[1], 2.2, hx, hh, 1.9, s < 0 ? L.coat : L.sleeve, 7, { cast: 1 });
    px.part(); px.ellipse(hx, hh - 0.6, 1.9, 1.9, L.skin, 7.2);
  }
};

export const draw = (px, F, o = {}) => (F.sk.p.back ? back(px, F.sk, o) : side(px, F, o));

// ---- poses -----------------------------------------------------------------------------------
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.2, 0.97), flip]; };
const FEET = { fN: [-2.8, 0], fF: [3.2, 0] };
// b: rx, lean, drop..., n / f the near and far hand [x, y] from the feet; the rest rides along
const hold = (b) => {
  const p = { ...FEET, ...b }, s = solve(p, BONES);
  p.aN = aim(s.sN, b.n, b.nf || 0);
  p.aF = aim(s.sF, b.f, b.ff || 0);
  return p;
};
const TAU = Math.PI * 2;
// one stride, six frames; the carried things ride the hands
const runAt = (f, kind) => {
  const ph = f / 6, w = walkPose(ph, { stride: 7.2, lift: 4.4, swing: 0.5, bob: 1.6, lean: 0.34 }), a = Math.cos(ph * TAU), d = w.drop, sw = Math.sin(ph * TAU);
  const base = { ...w, twist: w.twist * 0.5 };
  if (kind === "mason") return hold({ ...base, n: [12.5, -27 + d - a * 0.6], f: [7 - a * 7, -24 + d + Math.abs(sw) * 3], mal: -0.35 - a * 0.1 });
  if (kind === "plank") return hold({ ...base, lean: 0.2, n: [10, -37 + d], f: [4 - a * 8, -24 + d + Math.abs(sw) * 3], plank: [0, 0, -0.06 + a * 0.012] });
  if (kind === "stone") return hold({ ...base, lean: 0.14, n: [13, -22 + d], f: [14.5, -25 + d], stone: [14, -21.5 + d] });
  // light: arms pumping against the legs, the forearms folded
  return hold({ ...base, n: [10 + a * -6, -26 + d + Math.max(0, -a) * 5], nf: 0, f: [6 + a * 6, -26 + d + Math.max(0, a) * 5] });
};
const runClip = (kind) => ({ n: 6, ms: 700, loop: true, lag: 0.12, pose: (ph) => runAt(Math.round(ph * 6) % 6, kind) });
const STAND_ARMS = { n: [6, -19], f: [-5, -18.5] };
const HIPS = { fN: [-2.8, 0], fF: [3, 0] };

const K = (keys) => ({ n: keys.length, ms: 400, loop: false, lag: 0.05, pose: (ph) => hold(keys[Math.round(ph * (keys.length - 1))]) });

export const CLIPS = {
  stand: { n: 1, ms: 2000, loop: true, lag: 0.1, pose: () => hold({ ...HIPS, ...STAND_ARMS, n: [7, -18], mal: 1.3, lean: 0.03, twist: 0.2 }) },
  // the run, by what is carried (builders.js picks the clip from the look and whether he is loaded):
  // run = nothing in hand, runM = the mason's mallet, runH = the hod's plank, runS = the setter's stone
  run: runClip("light"),
  runM: runClip("mason"),
  runH: runClip("plank"),
  runS: runClip("stone"),
  // hammer: the fist ahead of the brow with the head up clear of the cap; the stroke coming down; struck
  hammer: K([
    { ...HIPS, rx: -0.6, lean: -0.12, twist: -0.1, n: [9, -46], f: [7, -24], mal: -1.85 },
    { ...HIPS, rx: 0, lean: 0.1, twist: 0.4, n: [13, -34], f: [8, -26], mal: -0.95, drop: 0.3 },
    { fN: [-1.6, 0], fF: [4.4, 0], rx: 0.8, lean: 0.3, twist: 0.7, drop: 1.2, n: [13, -23], f: [6, -24], mal: 0.45 },
  ]),
  // the hod: the stone from the knees, up to the chest, overhead, let go
  hand: K([
    { fN: [-2.2, 0], fF: [3.6, 0], rx: -1, drop: 5, lean: 0.5, n: [11, -9], f: [14, -11], stone: [12.5, -9.5] },
    { ...HIPS, drop: 0.8, lean: 0.1, n: [9, -26], f: [13, -28], stone: [11, -26.5] },
    { fN: [-1.4, 1.2], fF: [3.4, 1.2], drop: 0, lean: -0.18, rise: 1, n: [12, -46], f: [9.5, -47], stone: [11, -52] },
    { fN: [-1.4, 1.2], fF: [3.4, 1.2], drop: 0, lean: -0.14, rise: 1, n: [13.5, -47], f: [10.5, -48], open: 1 },
  ]),
  // the setter: crouched reaching, crouched holding, up with it, tossed
  pick: K([
    { fN: [-3.6, 0], fF: [3.4, 0], rx: -1.4, drop: 6.2, lean: 0.62, n: [11, -3], f: [14, -4] },
    { fN: [-3.6, 0], fF: [3.4, 0], rx: -1.4, drop: 5.8, lean: 0.55, n: [10.5, -6], f: [13.5, -7], stone: [12.5, -5.5] },
    { ...HIPS, drop: 0.3, lean: 0.06, n: [9, -22], f: [12.5, -23], stone: [11, -22] },
    { fN: [-1.8, 0], fF: [4.4, 0], rx: 0.8, drop: 0.6, lean: 0.24, n: [14, -43], f: [12, -45], open: 1 },
  ]),
  // the mason's hop: crouched with the mallet swung back, up, falling
  jump: K([
    { fN: [-2.2, 0], fF: [2.8, 0], rx: -0.8, drop: 4.4, lean: 0.4, n: [-7, -10], f: [-10, -10], mal: 2.3 },
    { fN: [-2.6, 3.8], fF: [2.2, 5], drop: -1, lean: 0.02, n: [13, -46], f: [-8, -45], mal: -1.9 },
    { fN: [-1.4, 1], fF: [2.2, 1.6], drop: 0, lean: -0.04, n: [14, -40], f: [-12, -38], mal: -1.4 },
  ]),
  land: K([
    { fN: [-3.4, 0], fF: [3.8, 0], rx: 0.6, drop: 6, lean: 0.5, n: [13, -22], f: [-6, -12], mal: 0.2 },
    { fN: [-3, 0], fF: [3.4, 0], rx: 0.3, drop: 2.6, lean: 0.22, n: [10, -22], f: [-7, -14], mal: 0.6 },
  ]),
  cheer: K([
    { ...HIPS, drop: 0.6, lean: -0.06, n: [13, -46], f: [-7, -44], mal: -1.75 },
    { fN: [-1.6, 1.2], fF: [3, 1.2], drop: -0.6, lean: -0.06, n: [13, -47], f: [-8, -46], mal: -1.75 },
  ]),
  // seen from behind; the pose carries which foot is up (cs) and whether the climber is mid-rung (cm)
  climb: {
    n: 4, ms: 600, loop: false,
    pose: (ph) => { const f = Math.round(ph * 3); return { ...FEET, back: 1, cs: f < 2 ? 1 : -1, cm: f % 2, lean: 0, aN: [0, 0.9, 0], aF: [0, 0.9, 0] }; },
  },
};

// ---- the stone as it flies (the hod's toss, the setter's pitch): a 8 x 7 unit sprite ------------
export const BLOCK = {
  NAME: "crew-block",
  BONES, BOX: { w: 16, h: 14, ox: 8, oy: 7 },
  draw: (px) => { stone(px, 0, 0, 1); },
  CLIPS: { fly: { n: 1, ms: 1000, loop: true, pose: () => ({}) } },
};
