// ============ THE BUILDERS ============
// The crew that sprints out of the castle gate to raise a new hall: a mason
// with his mallet, a hod carrier with a plank on his shoulder and a setter
// with a dressed stone in his arms. A timelapse: they dash in a straight
// line from the gate (over anything, nothing on the board touches them) to
// their posts round the plot, work in rhythm with the pieces going in, and
// dash straight home again.
//
// Everything keys off the build's plan (buildanim.js buildPlan): when they
// leave, when they arrive, when each piece lands (the mason strikes as each
// one goes in; the hod and the setter feed the odd and the even pieces), the
// working platform's height (the mason stands on it), when he hops off, when
// the rest set off home, and when the last of them is back in the gate.
//
//   the mason   runs to the ladder's foot, climbs to the platform, and
//               strikes each piece home; when the scaffold comes down he
//               jumps off it, lands with a squash and a puff, and runs home
//   the hod     stands at the ladder's foot and heaves a block up to the
//               mason for his pieces — tossing it once the platform is out
//               of reach
//   the setter  picks from the pile and pitches a stone at each piece he
//               feeds, which lands just as the piece swings in
//
// Every frame of every look is baked once (folk.js drawWorker, inked by
// bakeSprite) and mirrored once; per frame this is a few drawImage stamps
// per builder and no allocation beyond the plan's first sight. Positions are
// snapped to art pixels. In water (a River Watch plot, a river or pond or
// the sea on the run) they wade: the stamp is sunk and cut at the waterline,
// with no shadow and a ring of foam; on a bridge's deck they ride up on it.

import { buildPlan, pumpCut } from "./buildanim.js";
import { drawWorker, BUILDER_FOLK, drawBuilderBlock } from "./folk.js";
import { bakeSprite, PX, hash, shadow } from "./paint.js";
import { RIVERS, PONDS, BRIDGES, bridgeLift, seaDepthAt } from "../data/terrain.js";

const ROLES = ["mason", "hod", "setter"];
const LANE = [-7, 0, 7];                // their lanes out of the gate, so the three don't run in one file
const BW = 36, BH = 42, AX = 18, AY = 37; // a worker's sprite box and its feet, world units (the cheer's mallet tops out at -35)
const RUN_FPS = 34;                     // run frames per game second: six to a stride, a timelapse scurry
const CLIMB_RATE = 60;                  // up the ladder, world units per game second
const WADE = 6;                         // how deep they wade at most, world units
const LAND = 0.07;                      // the squash after the mason's jump
const NEAR = 26;                        // within this of his hall the mason sorts in front of it
const STROKE = 0.09;                    // the mallet's quickest beat, game seconds (the hod and the setter take turns on it)

const sn = (v) => Math.round(v * PX) / PX;
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- sprites ---------------------------------------------------------------
const SPR = new Map();
// A worker's baked frame facing `dir` (a mirrored copy of the +x bake).
export const workerSprite = (look, pose, frame, load, dir = 1) => {
  const key = `${look}|${pose}|${frame}|${load ? 1 : 0}|${dir < 0 ? -1 : 1}`;
  let cv = SPR.get(key);
  if (cv) return cv;
  if (dir < 0) {
    const src = workerSprite(look, pose, frame, load, 1);
    cv = document.createElement("canvas"); cv.width = src.width; cv.height = src.height;
    const c = cv.getContext("2d");
    c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(src, 0, 0);
  } else cv = bakeSprite(BW, BH, (c) => drawWorker(c, AX, AY, 1, BUILDER_FOLK[look], pose, frame, { look, load }));
  SPR.set(key, cv);
  return cv;
};
export const WORKER_BOX = { w: BW, h: BH, ax: AX, ay: AY };
// Every frame a build uses, in the order a build needs them. A bake is a
// few milliseconds; builderDrawables bakes the rest of this list a couple
// of milliseconds a frame once a build starts (whatever is needed sooner
// bakes on the spot), and warmBuilders(Infinity) at a quiet moment — a
// level's load — takes the whole cost off the board.
const WARM = [];
for (const look of ROLES) for (let f = 0; f < 6; f++) WARM.push([look, "run", f, true]);
WARM.push(["mason", "stand", 0], ["mason", "climb", 0], ["mason", "climb", 1], ["mason", "climb", 2], ["mason", "climb", 3],
  ["mason", "hammer", 0], ["mason", "hammer", 1], ["mason", "hammer", 2], ["hod", "stand", 0], ["setter", "stand", 0]);
for (let f = 0; f < 4; f++) WARM.push(["hod", "hand", f], ["setter", "pick", f]);
WARM.push(["mason", "cheer", 0], ["mason", "cheer", 1], ["mason", "jump", 0], ["mason", "jump", 1], ["mason", "jump", 2], ["mason", "land", 0], ["mason", "land", 1]);
for (const look of ROLES) for (let f = 0; f < 6; f++) WARM.push([look, "run", f, false]);
let warmAt = 0;
export const warmBuilders = (ms = 2) => {
  if (warmAt >= WARM.length || typeof document === "undefined") return true;
  const t0 = performance.now();
  while (warmAt < WARM.length && performance.now() - t0 < ms) { const [look, pose, f, load] = WARM[warmAt++]; workerSprite(look, pose, f, !!load, 1); }
  return warmAt >= WARM.length;
};
// ...and on its own, one frame per idle moment a while after the page loads
// (the title screen, a map's first seconds), so the first build is smooth
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 400 }) : (fn) => setTimeout(fn, 40);
  const step = () => { try { if (!warmBuilders(0)) idle(step); } catch (e) { /* baked on demand instead */ } };
  setTimeout(() => idle(step), 2500);
}

// small baked bits: the contact shadow, dust at a footfall, spray, the foam
// ring round a wading shin (back half and front half), a thrown block
const BITS = new Map();
const bit = (key, w, h, draw, ink = false) => {
  let cv = BITS.get(key);
  if (!cv) { cv = bakeSprite(w, h, draw, ink); BITS.set(key, cv); }
  return cv;
};
const DUST_HI = "#efe4c8", DUST = "#d4c6a6", DUST_LO = "#b3a386";
const FOAM = "#eef6f4", SPRAY = "#a8d0dc", SPRAY_LO = "#6fa4b8";
const shadowCv = (big) => bit(`sh${big}`, 12, 4, (c) => shadow(c, 6, 2, big ? 4.6 : 3.2, big ? 1.6 : 1.1, big ? 0.3 : 0.2));
// a pixel cloud of three lumps, thinning out over its four frames
const dustCv = (f, big) => bit(`du${f}${big}`, 10, 10, (c) => {
  const R = (big ? 3.0 : 2.3) * (0.75 + f * 0.14);
  const lumps = [[-0.4, 0.2, 0.62], [0.35, 0.25, 0.55], [0, -0.2, 0.6]];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    let inside = false, lit = 0;
    for (const [lx, ly, lr] of lumps) {
      const dx = ((x + 0.5) / PX - 5) / R - lx, dy = ((y + 0.5) / PX - 5) / R - ly;
      if (Math.hypot(dx, dy) / lr < 1) { inside = true; lit = Math.max(lit, -dx - dy * 1.2); }
    }
    if (!inside || (f >= 2 && hash(x * 7 + f, y * 13) < (f - 1) * 0.32)) continue;
    c.fillStyle = lit > 0.35 ? DUST_HI : lit > -0.3 ? DUST : DUST_LO;
    c.fillRect(x / PX, y / PX, 1 / PX, 1 / PX);
  }
});
// spray thrown up at a splash: droplets on an arc, falling and thinning
const sprayCv = (f) => bit(`sp${f}`, 12, 10, (c) => {
  const a = 1 / PX;
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1, vx = side * (0.8 + hash(i, 3) * 3.2), vy = 2.4 + hash(i, 5) * 3.4;
    const u = 0.35 + f * 0.33, x = 6 + vx * u, y = 8 - vy * u * 1.6 + 2.6 * u * u * 2;
    if (f === 2 && i % 3 === 0) continue;
    c.fillStyle = i % 3 ? FOAM : SPRAY;
    c.fillRect(sn(x), sn(y), a * (i % 4 ? 1 : 2), a * (i % 4 ? 1 : 2));
  }
  c.fillStyle = FOAM; c.fillRect(3, 8, 6, a); c.fillStyle = SPRAY; c.fillRect(4, 8 + a, 4, a);
});
// the foam round a wading figure: the back arc (drawn before it) and the
// front arc (after), with a shimmer frame
const ringCv = (front, f, wide) => bit(`rg${front ? 1 : 0}${f}${wide ? 1 : 0}`, 14, 6, (c) => {
  const rx = wide ? 5.4 : 4.2, ry = wide ? 1.7 : 1.4, a = 1 / PX;
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * Math.PI * 2, s = Math.sin(ang);
    if ((s > 0) !== front) continue;
    if (hash(i + f * 17, 9) < 0.18) continue;                      // a broken, living edge
    const x = 7 + Math.cos(ang) * rx, y = 3 + s * ry;
    c.fillStyle = s > 0.5 ? FOAM : (i + f) % 3 ? FOAM : SPRAY;
    c.fillRect(sn(x), sn(y), a, a);
  }
  if (front) { c.fillStyle = SPRAY_LO; c.fillRect(7 - rx * 0.6, 3 + ry + a, rx * 1.2, a); }   // the wet shadow under the lip
});
const blockCv = () => bit("blk", 8, 7, (c) => drawBuilderBlock(c, 4, 3.5), true);

// ---- water on the way ------------------------------------------------------
// how deep (x, y) is for a wader (0 on dry land) and how far a bridge's deck
// lifts him there
const segDist = (segs, x, y) => {
  let best = Infinity;
  for (const s of segs) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1, L2 = s.len * s.len || 1;
    const u = cl(((x - s.x1) * vx + (y - s.y1) * vy) / L2);
    const d = Math.hypot(x - (s.x1 + vx * u), y - (s.y1 + vy * u));
    if (d < best) best = d;
  }
  return best;
};
const wetAt = (x, y) => {
  if (BRIDGES.length) { const lift = bridgeLift(x, y); if (lift > 0) return [0, lift]; }
  let d = 0;
  for (const rv of RIVERS) if (rv.segs) d = Math.max(d, cl((rv.w / 2 - segDist(rv.segs, x, y) + 1) / 5));
  for (const p of PONDS) {
    if (p.t === "lava" || p.t === "ice") continue;
    const e = ((x - p.x) / (p.w / 2)) ** 2 + ((y - p.y) / (p.h / 2)) ** 2;
    if (e < 1) d = Math.max(d, cl((1 - e) * 3));
  }
  const s = seaDepthAt(x, y);
  if (s > 0) d = Math.max(d, cl(s / 8));
  return [d * WADE, 0];
};
// a leg's water along its straight line, sampled every 3 units once
const profile = (a, b) => {
  const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 3));
  const wet = new Float32Array(n + 1), lift = new Float32Array(n + 1);
  let any = false;
  if (RIVERS.length || PONDS.length || BRIDGES.length || seaDepthAt(a.x, a.y) > -999) {
    for (let i = 0; i <= n; i++) {
      const [d, l] = wetAt(a.x + (b.x - a.x) * (i / n), a.y + (b.y - a.y) * (i / n));
      wet[i] = sn(d); lift[i] = l; if (d || l) any = true;
    }
  }
  return any ? { n, wet, lift } : null;
};

// ---- a crew per build ---------------------------------------------------------
// The strokes: the pieces land far faster than a mallet can swing (a big
// hall sets fifty in a second), so the crew keeps a beat of its own — a
// stroke on a landing at most every STROKE seconds — and each stroke
// remembers the piece it lands with. The plan's cut is made a little at a
// time while the crew is running, so its landings arrive late: the strokes
// are laid again whenever they change (until then, and for a hall with no
// cut at all, a steady knock through the laying).
const strokes = (C) => {
  const P = C.P, lands = P.lands || [];
  if (C.landsOf === lands && C.nLands === lands.length) return;
  C.landsOf = lands; C.nLands = lands.length;
  const beats = C.beats, bp = C.beatPiece;
  beats.length = 0; bp.length = 0;
  for (let i = 0; i < lands.length; i++) if (!beats.length || lands[i] - beats[beats.length - 1] >= STROKE) { beats.push(lands[i]); bp.push(i); }
  if (!beats.length) for (let b = P.lay0 + 0.13; b <= P.lay1 + 1e-6; b += STROKE) { beats.push(b); bp.push(-1); }
};
const CREWS = new WeakMap();
const crewOf = (P, t) => {
  let C = CREWS.get(P);
  if (C) return C;
  const posts = P.posts || [];
  const post = (role, i) => posts.find((p) => p.role === role) || posts[i] || { x: P.x + (i ? 20 : 0), y: sn(t.y + 16), dir: -1 };
  const stag = P.stagger || 0.06;
  const hallFront = sn(t.y + 14.5);
  C = { P, t, beats: [], beatPiece: [], landsOf: null, nLands: -1, hallFront, b: [], out: [], ctx: null, time: 0 };
  strokes(C);
  ROLES.forEach((role, i) => {
    const ps = post(role, i);
    const home = { x: sn(P.gate.x), y: sn(P.gate.y + LANE[i]) };
    const mason = role === "mason";
    // (the hod stands a step further out than the plan's post, clear of the
    // ladder and of the mason going up it)
    const lad = P.ladder ?? ps.x;
    const to = mason ? { x: sn(lad), y: P.fF } : role === "hod" ? { x: sn(Math.max(ps.x, lad + 9)), y: sn(ps.y) } : { x: sn(ps.x), y: sn(ps.y) };
    const from = mason ? { x: sn((P.ladder ?? ps.x) + 5), y: sn(Math.max(t.y + 15, P.fF + 5)) } : to;
    const t0 = P.at + i * stag, t1 = t0 + P.run;
    const back0 = mason ? (P.hop ? P.hop[1] : P.down0 + 0.2) + LAND : P.leave + (i - 1) * stag;
    const B = {
      i, role, look: role, home, to, from, ps, t0, t1, back0, back1: back0 + P.run,
      dirOut: Math.sign(to.x - home.x) || -1, dirBack: Math.sign(home.x - from.x) || 1,
      wetOut: profile(home, to), wetBack: profile(from, home),
      postWet: mason ? 0 : wetAt(to.x, to.y)[0],
      landWet: mason ? wetAt(from.x, from.y)[0] : 0,
      // what this frame shows (filled per frame)
      vis: false, x: 0, y: 0, dir: 1, pose: "stand", frame: 0, load: false, wet: 0, lift: 0, key: 0, shadow: 1,
      dust: 0, dustX: 0, dustY: 0, dust2: 0, dust2X: 0, dust2Y: 0, splash: false,
      fly: 0, flyX: 0, flyY: 0,
    };
    B.item = { y: 0, fn: () => drawBuilder(C, B) };
    C.b.push(B);
  });
  CREWS.set(P, C);
  return C;
};

// ---- where each one is, and doing what ----
// a straight dash from a to b over [t0, t0 + run]
const dash = (C, B, a, b, t0, time, dir, load, wp, lane) => {
  const P = C.P, u = cl((time - t0) / P.run);
  B.x = sn(a.x + (b.x - a.x) * u); B.y = sn(a.y + (b.y - a.y) * u);
  B.dir = dir; B.pose = "run"; B.load = load;
  const s = time - t0, ph = B.i * 2 + lane;
  B.frame = Math.floor(s * RUN_FPS + ph) % 6;
  if (wp) { const k = Math.round(u * wp.n); B.wet = wp.wet[k]; B.lift = wp.lift[k]; } else { B.wet = 0; B.lift = 0; }
  // the last two footfalls (the contact frames) kick up dust, or spray in water
  const k = Math.floor((s * RUN_FPS + ph) / 3);
  for (let j = 0; j < 2; j++) {
    const sf = (3 * (k - j) - ph) / RUN_FPS, age = s - sf;
    const on = sf >= 0 && age < 0.16 && time < t0 + P.run + 0.05;
    const uf = cl(sf / P.run), fx = sn(a.x + (b.x - a.x) * uf - dir * 2), fy = sn(a.y + (b.y - a.y) * uf);
    if (j === 0) { B.dust = on ? age : 0; B.dustX = fx; B.dustY = fy; } else { B.dust2 = on ? age : 0; B.dust2X = fx; B.dust2Y = fy; }
  }
  B.splash = B.wet > 1;
  if (B.lift) B.dust = B.dust2 = 0;                 // no dust off the planks
};
// the beat window this worker feeds: the next beat of his parity after `time`
const nextBeat = (beats, time, parity) => {
  for (let k = 0; k < beats.length; k++) if (beats[k] > time && (parity < 0 || k % 2 === parity)) return k;
  return -1;
};
const place = (C, B, time) => {
  const P = C.P, t = C.t;
  B.vis = true; B.load = false; B.dust = B.dust2 = 0; B.fly = 0; B.splash = false; B.lift = 0; B.wet = 0; B.shadow = 1;
  if (time < B.t0) { B.vis = false; return; }
  if (time < B.t1) {
    dash(C, B, B.home, B.to, B.t0, time, B.dirOut, true, B.wetOut, 0);
    B.key = B.role === "mason" && Math.hypot(B.x - B.to.x, B.y - B.to.y) < NEAR ? Math.max(B.y, C.hallFront) : B.y;
    return;
  }
  if (time >= B.back0) {
    if (time >= B.back1) { B.vis = false; return; }
    dash(C, B, B.from, B.home, B.back0, time, B.dirBack, false, B.wetBack, 1);
    B.key = B.role === "mason" && Math.hypot(B.x - B.from.x, B.y - B.from.y) < NEAR ? Math.max(B.y, C.hallFront) : B.y;
    return;
  }
  // a skid at the post
  const since = time - B.t1;
  if (since < 0.16 && !B.postWet) { B.dust = since + 0.02; B.dustX = sn(B.to.x + B.dirOut * 1.5); B.dustY = B.to.y; }
  if (B.role === "mason") return mason(C, B, time);
  B.x = B.to.x; B.y = B.to.y; B.key = B.y; B.wet = B.postWet; B.splash = false;
  if (B.role === "hod") hod(C, B, time); else setter(C, B, time);
};

// the mason: the ladder, the platform, the strokes, the jump
const mason = (C, B, time) => {
  const P = C.P, beats = C.beats;
  const hop0 = P.hop ? P.hop[0] : P.down0, hop1 = P.hop ? P.hop[1] : P.down0 + 0.2;
  B.key = Math.max(C.hallFront, B.to.y);
  const px = sn(B.ps.x ?? B.to.x), dir = B.ps.dir || -1;
  if (time < hop0) {
    const yP = P.platformY(time);
    const c0 = B.t1 + 0.05;                          // a look up first: the ladder is going up
    const climbT = Math.max(0.06, (B.to.y - yP) / CLIMB_RATE);
    if (time < c0 + climbT) {
      const u = cl((time - c0) / climbT), y = sn(B.to.y + (yP - B.to.y) * u);
      B.x = sn(B.to.x + 0.5); B.y = y; B.dir = 1; B.shadow = 0;
      if (time < c0) { B.pose = "stand"; B.frame = 0; B.dir = dir; B.shadow = 1; B.y = B.to.y; return; }
      B.pose = "climb"; B.frame = Math.floor((B.to.y - y) / 1.5) % 4;
      return;
    }
    B.x = px; B.y = yP; B.dir = dir; B.shadow = 0;
    // strokes: struck on each beat, lifted after it, raised, and brought down into the next
    const k = nextBeat(beats, time, -1);
    const last = k < 0 ? beats[beats.length - 1] : k > 0 ? beats[k - 1] : -Infinity;
    const next = k < 0 ? Infinity : beats[k], I = next - last;
    const since = time - last, to = next - time;
    B.pose = "hammer";
    if (since < Math.min(0.05, I * 0.3)) B.frame = 2;
    else if (to < Math.min(0.035, I * 0.22)) B.frame = 1;
    else if (since < Math.min(0.09, I * 0.55)) B.frame = 1;
    else B.frame = 0;
    if (k < 0 && since >= 0.06) {
      // all in: at ease while the person goes in, then a cheer
      const ch = P.personAt - 0.04;
      if (time >= ch) { B.pose = "cheer"; B.frame = Math.floor((time - ch) * 14) % 2; }
      else { B.pose = "stand"; B.frame = 0; }
    }
    return;
  }
  if (time < hop1) {
    // the hop: a crouch on the platform, then an arc down to the ground
    const y0 = P.platformY(hop0), span = hop1 - hop0, u0 = 0.18;
    const u = (time - hop0) / span;
    B.dir = Math.sign(B.from.x - px) || 1;
    if (u < u0) { B.x = px; B.y = y0; B.pose = "jump"; B.frame = 0; B.shadow = 0; return; }
    const v = (u - u0) / (1 - u0);
    const h = 7 + (B.from.y - y0) * 0.15;
    B.x = sn(px + (B.from.x - px) * v);
    B.y = sn(y0 + (B.from.y - y0) * v - h * 4 * v * (1 - v));
    B.pose = "jump"; B.frame = v < 0.45 ? 1 : 2;
    B.shadow = v > 0.35 ? 2 : 0;
    B.gy = sn(P.fF + (B.from.y - P.fF) * v);         // his shadow runs along the ground under him
    return;
  }
  // landed: a squash and a puff (or a splash)
  const since = time - hop1;
  B.x = B.from.x; B.y = B.from.y; B.pose = "land"; B.frame = since < LAND * 0.55 ? 0 : 1;
  B.dir = B.dirBack; B.wet = B.landWet; B.key = Math.max(B.y, C.hallFront);
  if (B.wet > 1) { B.splash = true; B.dust = since + 0.001; B.dustX = B.x; B.dustY = B.y; }
  else { B.dust = since + 0.001; B.dustX = sn(B.x - 3); B.dustY = B.y; B.dust2 = since + 0.001; B.dust2X = sn(B.x + 4); B.dust2Y = B.y; }
};

// the ground crew's rhythm: the last stretch before each of their beats is
// spent on a four-step move ending in the throw; before that they wait
const cycle = (C, B, time, parity) => {
  const P = C.P, beats = C.beats;
  const k = nextBeat(beats, time, parity);
  if (k < 0) return null;
  const prev = k >= 2 ? beats[k - 2] : B.t1;
  const I = beats[k] - Math.max(prev, B.t1);
  const s = cl(I / 0.36);
  const F = Math.max(0.03, Math.min(0.1, I * 0.35));
  const dt = beats[k] - time;
  const step = dt < F ? 3 : dt < F + 0.05 * s ? 2 : dt < F + 0.1 * s ? 1 : dt < F + 0.16 * s ? 0 : -1;
  return { k, step, u: 1 - dt / F, F };
};
const hod = (C, B, time) => {
  const P = C.P;
  B.dir = B.ps.dir || -1; B.pose = "stand"; B.frame = 0;
  const c = cycle(C, B, time, 1);
  if (!c || c.step < 0) return;
  B.pose = "hand"; B.frame = c.step;
  if (c.step === 3) {
    // the block goes up to the mason's hands (a toss once he's up high)
    const M = C.b[0], yP = P.platformY(time), mx = sn(M.ps.x ?? P.ladder), mdir = M.ps.dir || -1;
    const sx = B.x + B.dir * 2.8, sy = B.y + B.wet - 25.4, tx = mx + mdir * 3, ty = yP - 17;
    const u = cl(c.u), h = Math.max(3, (sy - ty) * 0.35);
    B.fly = 1; B.flyX = sn(sx + (tx - sx) * u); B.flyY = sn(sy + (ty - sy) * u - h * 4 * u * (1 - u));
  }
};
const setter = (C, B, time) => {
  const P = C.P;
  B.dir = B.ps.dir || 1; B.pose = "stand"; B.frame = 0;
  const c = cycle(C, B, time, 0);
  if (!c || c.step < 0) return;
  B.pose = "pick"; B.frame = c.step;
  if (c.step < 2) B.dir = -(B.ps.dir || 1);          // turned to the pile
  if (c.step === 3) {
    // a stone pitched at the piece he feeds, arriving as it swings in
    const pi = C.beatPiece[c.k], pc = pi >= 0 && P.pieces ? P.pieces[pi] : null;
    const tx = pc ? pc.cx : P.x, ty = pc ? pc.y + pc.h * 0.5 - 5 : P.platformY(time) - 4;
    const sx = B.x + B.dir * 7, sy = B.y + B.wet - 18;
    const u = cl(c.u), h = 6 + Math.max(0, sy - ty) * 0.25;
    B.fly = 1; B.flyX = sn(sx + (tx - sx) * u); B.flyY = sn(sy + (ty - sy) * u - h * 4 * u * (1 - u));
  }
};

// ---- painting one ----
const stamp = (ctx, cv, x, y, w, h) => ctx.drawImage(cv, x, y, w, h);
const drawBuilder = (C, B) => {
  const ctx = C.ctx, time = C.time;
  const lift = B.lift, x = B.x, y = sn(B.y - lift), wet = B.wet;
  const ring = Math.floor(time * 12 + B.i) % 2;
  // dust (or spray) left at the footfalls, behind the runner
  const puff = (age, px, py, big) => {
    if (age <= 0 || age >= 0.16) return;
    const f = Math.min(3, Math.floor(age / 0.04));
    if (B.splash) { const cv = sprayCv(Math.min(2, Math.floor(age / 0.055))); stamp(ctx, cv, px - 6, py - 9, 12, 10); return; }
    stamp(ctx, dustCv(f, big ? 1 : 0), px - 5, sn(py - 6 - age * 12), 10, 10);
  };
  if (!B.splash) {
    puff(B.dust, B.dustX, B.dustY - lift, B.pose === "land");
    puff(B.dust2, B.dust2X, B.dust2Y - lift, B.pose === "land");
  }
  const cv = workerSprite(B.look, B.pose, B.frame, B.load, B.dir);
  if (wet > 0.5) {
    // wading: the back of the foam ring, the figure sunk and cut at the
    // waterline, the front of the ring over it
    const wide = B.pose === "run" || B.pose === "land";
    stamp(ctx, ringCv(false, ring, wide), x - 7, y - 3, 14, 6);
    const keep = AY - wet;
    ctx.drawImage(cv, 0, 0, cv.width, Math.round(keep * PX), x - AX, y + wet - AY, BW, sn(keep));
    stamp(ctx, ringCv(true, ring, wide), x - 7, y - 3, 14, 6);
  } else {
    if (B.shadow) {
      const gy = B.shadow === 2 ? B.gy : y;
      stamp(ctx, shadowCv(B.shadow === 1 ? 1 : 0), x - 5, gy - 1.6, 12, 4);
    }
    stamp(ctx, cv, x - AX, y - AY, BW, BH);
  }
  if (B.splash) {
    // spray is thrown up in front of a wader
    puff(B.dust, B.dustX, B.dustY, false);
    puff(B.dust2, B.dust2X, B.dust2Y, false);
  }
  if (B.fly) stamp(ctx, blockCv(), B.flyX - 4, B.flyY - 3.5, 8, 7);
};

// Drawables ({ y, fn }) for tower t's builders at `time`, for draw.js's
// y-sorted pass (keyed by their feet; the mason at his post sorts in front of
// the hall and its scaffold). Empty once the crew is home. The array and its
// items are reused from frame to frame: use them before the next call.
export const builderDrawables = (ctx, t, time) => {
  const P = buildPlan(t);
  if (!P || time < P.at || time >= P.home) return EMPTY;
  if (warmAt < WARM.length) warmBuilders(2);
  const C = crewOf(P, t);
  C.ctx = ctx; C.time = time;
  // the hall finishes its cut once the pieces are due (buildanim pumpCut);
  // a due cut is finished here instead, so this frame's strokes have it
  if (P.job && time >= P.lay0 - 0.03) pumpCut(P, time);
  strokes(C);
  C.out.length = 0;
  for (const B of C.b) {
    place(C, B, time);
    if (!B.vis) continue;
    B.item.y = B.key;
    C.out.push(B.item);
  }
  return C.out;
};
const EMPTY = [];
