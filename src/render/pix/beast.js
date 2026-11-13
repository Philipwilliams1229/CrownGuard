// ============ BEAST: the four-legged skeleton and its gaits ============
// rig.js's twin for a side-on QUADRUPED (facing +x, turned a quarter toward the
// viewer, so the far pair of legs stands a little ahead and a pixel up the
// screen). Wolves and boars use it today; horses, hounds and ghouls on all
// fours can: give `solveBeast` their own bones (a copy of QUAD with other numbers).
//
// A POSE is the small bag of numbers an animator thinks in. Lengths in art
// pixels, angles in radians, y is DOWN, the origin the ground under the middle
// of the standing body:
//   rx, drop      the body: forward of where it stands, and sunk
//   pitch         the whole back tipped: + puts the nose DOWN and the rump up
//   arch          the spine's bend, withers to croup: + humps the back (the
//                 gathered half of a gallop, a crouch, a cat's fright), - hollows
//                 and stretches it. The spine is an arc of FIXED length, so a
//                 humped back really does bring shoulders and hips together.
//   neck          the neck's angle: 0 level and straight ahead, + up
//   hx, hy        the skull pushed forward / down from where the neck puts it
//   head, jaw     ride along for the costume (a head is a hand-pixelled grid:
//                 it cannot turn, so the figure picks a grid by these)
//   tail, curl    the tail's root angle (0 straight back and level, + up, - hanging)
//                 and how much more each link turns than the last
//   fNF fFF       the near and far FORE foot,  [x, lift]: x from where that foot
//   fNH fFH       the near and far HIND foot   stands at rest (under its shoulder
//                 or hip, see foreX / hindX), lift off the ground. A foot that is
//                 not told to move stays on its spot while the body moves over it.
// Every leg is two bones solved with rig.js's `ik`, so no pose can break one:
// a HIND leg folds with the hock BACK (hip -> hock -> pad), a FORE leg with the
// wrist ("knee") FORWARD (shoulder -> wrist -> pad). The pad's own height (`paw`)
// sits under the last joint. A foot asked to stand further off than the leg is
// long comes off the ground at the toe, as a real one does at the end of a push.
// Anything else in a pose (hackles, ears, a rider's lance) rides along, eased
// with the rest, for the figure's costume to read.
//
// HOW A FIGURE USES IT. rig.js's `frameAt` solves a biped whatever the clip
// returns, but it keeps the pose itself: `F.sk.p` is the pose just now and
// `F.lag1.p` / `F.lag2.p` the pose one and two beats ago. So a beast's clips
// return beast poses, it exports `BONES = HUMAN` (unused), and its draw begins
//   const { b, b1, b2 } = beastFrames(F, Q);
// `b` is the solved beast (below); b1, b2 the earlier ones, for what trails.
// Draw the FAR legs first and a tone down (`bias: -1`), then tail, body, neck,
// head, and the NEAR legs last, in front.
import { ik, lerp, clamp, EASE } from "./rig.js";

// A wolf-sized set of bones. Copy and change: scaledQuad(QUAD, k, { ... }).
export const QUAD = {
  spine: 22,              // withers to croup, along the backbone
  height: 22,             // the backbone's middle above the ground, standing
  sh: [-1, 5],            // the shoulder joint from the spine's front end: [toward the head along the spine, down from it]
  hip: [1, 4],            // the hip joint from the spine's rear end, the same way
  foreU: 8.5, foreL: 7.5, // shoulder -> wrist -> pad
  hindU: 9.5, hindL: 8,   // hip -> hock -> pad
  paw: 1.5,               // the pad's height: the last joint stands this far off the ground
  neckAt: [1, 2], neck: 8, // the neck's root from the spine's front end; its length to the skull
  tailAt: [-0.5, 1.5], tail: [5, 5, 4],   // the tail's root from the spine's rear end; its links
  far: [1.6, -1],         // the far legs' joints and footfalls: this much ahead and up the screen
  foreX: 1, hindX: -2.5,  // where a standing foot sits from under its joint
};
export const scaledQuad = (Q, k, o = {}) => {
  const out = {};
  for (const key in Q) out[key] = Array.isArray(Q[key]) ? Q[key].map((v) => v * k) : Q[key] * k;
  return { ...out, ...o };
};

export const BEAST_REST = {
  rx: 0, drop: 0, pitch: 0, arch: 0, neck: 0.35, hx: 0, hy: 0, head: 0, jaw: 0, tail: -0.7, curl: -0.1,
  fNF: [0, 0], fFF: [0, 0], fNH: [0, 0], fFH: [0, 0],
};

// pose -> joints. Returns
//   p            the pose (rest filled in)
//   W, C         the withers and the croup (the spine's two ends);  aW, aC the spine's heading there
//   at(s, f, d)  a point on the spine, s from -0.5 (croup) to 0.5 (withers), pushed f
//                toward the head and d down in the spine's OWN frame there (so a chest
//                hung at at(0.3, 0, 6) turns with the back);  ang(s) the heading at s
//   N0, K        the neck's root and the skull (stamp a head at K, rounded)
//   T0           the tail's root
//   NF FF NH FH  each leg: { j (shoulder or hip), k (wrist or hock), a (the last joint,
//                `paw` above the pad), lift, far }
export const solveBeast = (pose, Q = QUAD) => {
  const p = { ...BEAST_REST, ...pose };
  const L = Q.spine, k = Math.abs(p.arch) < 1e-3 ? 1e-3 : p.arch, R = L / k;
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const mx = p.rx, my = -Q.height + p.drop, sag = R * (1 - Math.cos(k / 2)) * 0.5;
  const ang = (s) => k * s + p.pitch;
  const at = (s, f = 0, d = 0) => {
    const th = k * s, lx = R * Math.sin(th), ly = R * (1 - Math.cos(th)) - sag, a = th + p.pitch;
    return [mx + lx * cp - ly * sp + Math.cos(a) * f - Math.sin(a) * d, my + lx * sp + ly * cp + Math.sin(a) * f + Math.cos(a) * d];
  };
  const W = at(0.5), C = at(-0.5);
  const sx0 = L / 2 + Q.sh[0] + Q.foreX, hx0 = -L / 2 + Q.hip[0] + Q.hindX;
  const leg = (fore, far, f) => {
    const j = fore ? at(0.5, Q.sh[0], Q.sh[1]) : at(-0.5, Q.hip[0], Q.hip[1]);
    const ox = far ? Q.far[0] : 0, oy = far ? Q.far[1] : 0;
    j[0] += ox; j[1] += oy;
    const r = ik(j[0], j[1], (fore ? sx0 : hx0) + f[0] + ox, -Q.paw - f[1] + oy, fore ? Q.foreU : Q.hindU, fore ? Q.foreL : Q.hindL, fore ? -1 : 1);
    return { j, k: r.mid, a: r.end, lift: -r.end[1] - Q.paw + oy, far, fore };
  };
  const N0 = at(0.5, Q.neckAt[0], Q.neckAt[1]);
  const K = [N0[0] + Math.cos(p.neck) * Q.neck + p.hx, N0[1] - Math.sin(p.neck) * Q.neck + p.hy];
  const T0 = at(-0.5, Q.tailAt[0], Q.tailAt[1]);
  return { p, Q, W, C, aW: ang(0.5), aC: ang(-0.5), at, ang, N0, K, T0,
    NF: leg(true, false, p.fNF), FF: leg(true, true, p.fFF), NH: leg(false, false, p.fNH), FH: leg(false, true, p.fFH) };
};

// the beast now and one and two beats ago, from a frame of rig.js's frameAt
export const beastFrames = (F, Q = QUAD) => ({ b: solveBeast(F.sk.p, Q), b1: solveBeast(F.lag1.p, Q), b2: solveBeast(F.lag2.p, Q) });

// The tail's points, root to tip: each link takes its angle a beat later than
// the one before it, and the tip is dragged against the way the root just moved.
// The same chain serves a mane lock or a rein: hand it any `root` and `links`.
export const tailPts = (b, b1, b2, o = {}) => {
  const links = o.links || b.Q.tail, root = o.root || b.T0, src = [b, b1, b2], drag = o.drag ?? 0.5;
  const vx = clamp(b.T0[0] - b1.T0[0], -3, 3), vy = clamp(b.T0[1] - b1.T0[1], -3, 3);
  const pts = [root];
  let [x, y] = root;
  links.forEach((len, i) => {
    const s = src[Math.min(i, 2)], a = s.p.tail + s.p.curl * i;
    x -= Math.cos(a) * len + vx * drag * i * 0.5; y -= Math.sin(a) * len + vy * drag * i;
    pts.push([x, y]);
  });
  return pts;
};

// ---- gaits -----------------------------------------------------------------------
const wrap = (q) => ((q % 1) + 1) % 1;
// One foot's path through a cycle. `c` is the middle of its time on the ground,
// `duty` the share of the cycle it is planted, `D` how far the body travels in a
// cycle: a planted foot slides back at exactly that pace, so it does not skate.
// In the air it swings forward on an eased arc. `kick` [back, up] throws it out
// behind and up early in the swing (a galloping hind leg in the stretched
// flight); `reach` [ahead, up] throws it out ahead late in the swing (the
// forelegs reaching for the ground). The leg's own length is the limit: a foot
// asked for more is simply a straight leg pointing that way.
export const footPath = (ph, c, duty, D, lift, x0 = 0, o = {}) => {
  const q = wrap(ph - c + 0.5) - 0.5, half = duty / 2;
  if (Math.abs(q) <= half) return [x0 - D * q, 0];
  const u = wrap(ph - c - half) / (1 - duty), e = EASE.io(u), s = Math.sin(Math.PI * u);
  const kb = o.kick ? Math.sin(Math.PI * clamp(u / 0.42, 0, 1)) : 0, rf = o.reach ? Math.sin(Math.PI * clamp((u - 0.5) / 0.5, 0, 1)) : 0;
  return [lerp(x0 - D * half, x0 + D * half, e) - (o.kick ? o.kick[0] * kb : 0) + (o.reach ? o.reach[0] * rf : 0),
    Math.pow(s, 0.8) * lift + (o.kick ? o.kick[1] * kb : 0) + (o.reach ? o.reach[1] * rf : 0)];
};

// WALK or TROT. One cycle, phase 0..1; returns the pose's body and feet.
//   travel  art px the body covers in a cycle (tell the game: its `per` follows)
//   trot    the diagonal pairs move together (near fore + far hind, then the others),
//           each planted half the cycle; without it a four-beat walk: near hind,
//           near fore, far hind, far fore, each planted for `duty` (0.62)
// The back sinks at each footfall, the withers and croup see-saw a little, and
// `nod` is what to ADD to the neck so the head bobs against them.
export const walkGait = (ph, o = {}) => {
  const trot = !!o.trot, D = o.travel ?? (trot ? 30 : 22), duty = o.duty ?? (trot ? 0.5 : 0.62), lift = o.lift ?? (trot ? 3.2 : 2.4);
  const c = trot ? { NF: 0, FH: 0, FF: 0.5, NH: 0.5 } : { NH: 0, NF: 0.25, FH: 0.5, FF: 0.75 };
  const bob = o.bob ?? (trot ? 1.2 : 0.6), w = Math.PI * 2;
  const drop = (0.5 + 0.5 * Math.cos(ph * w * 2)) * bob;
  const pitch = trot ? 0 : (o.rock ?? 0.035) * Math.sin(ph * w * 2);
  return {
    drop, pitch, arch: (o.flex ?? 0.05) * Math.sin(ph * w * 2 + 0.6),
    fNF: footPath(ph, c.NF, duty, D, lift, o.foreX ?? 0), fFF: footPath(ph, c.FF, duty, D, lift, o.foreX ?? 0),
    fNH: footPath(ph, c.NH, duty, D, lift, o.hindX ?? 0), fFH: footPath(ph, c.FH, duty, D, lift, o.hindX ?? 0),
    nod: -(o.nod ?? 0.06) * Math.cos(ph * w * 2 - 0.5), g: 0,
  };
};

// GALLOP. A real one: the hinds land and drive (far then near), the body flies
// STRETCHED (spine hollow, forelegs reaching, hinds thrown out behind), the
// fores land and pull the body over them, and it flies GATHERED (back humped,
// all four feet bunched under the belly, the hinds swinging through ahead of
// where the fores left).
//   travel  art px a cycle (a planted foot slides travel x duty)
//   duty    the share of the cycle each foot is down (0.24; a heavy beast 0.3)
//   beats   when each foot is at the middle of its stance: { hF, hN, fF, fN }.
//           The default is a hound's double-flight gallop (two moments in the
//           air), set so that of eight frames 0 is the hinds driving, 2 the
//           stretched flight, 4 the fores loaded and 6 the gathered flight. A horse or a boar has ONE, the gathered one: bring the fores
//           up behind the hinds (say { hF: 0, hN: 0.12, fF: 0.3, fN: 0.44 })
//           and pass `double: false`.
//   flex    how far the spine bends between the two (rad);  flexBias adds a set to it
//   rock    the see-saw: nose down as the fores take the weight, up as the hinds drive
//   bob     how far the body sinks in a stance
//   kick, reach   [x, up]: the hinds thrown back in the stretched flight, the fores thrown ahead
// Returns the body and feet, `nod` (ADD it to the neck: the head counter-bobs,
// staying level while the shoulders pitch) and `g` (+1 gathered .. -1 stretched,
// for ears, tails and riders).
export const gallop = (ph, o = {}) => {
  const D = o.travel ?? 90, duty = o.duty ?? 0.24, lift = o.lift ?? 5, w = Math.PI * 2;
  const bt = { hF: -0.04, hN: 0.04, fF: 0.46, fN: 0.54, ...(o.beats || {}) };
  const foreOff = bt.fN + duty / 2, hindOn = bt.hF + 1 - duty / 2, gph = wrap((foreOff + hindOn) / 2);
  const g = Math.cos(w * (ph - gph));
  const hindC = (bt.hF + bt.hN) / 2, foreC = (bt.fF + bt.fN) / 2;
  const pitch = (o.rock ?? 0.1) * 0.5 * (Math.cos(w * (ph - foreC)) - Math.cos(w * (ph - hindC)));
  const dbl = o.double ?? true, bob = o.bob ?? 2;
  const drop = dbl ? bob * 0.5 * (1 - Math.cos(2 * w * (ph - gph))) : bob * 0.5 * (1 - g);
  const fx0 = o.foreX ?? 3, hx0 = o.hindX ?? 3, hk = { kick: o.kick ?? [8, 4] }, fr = { reach: o.reach ?? [6, 2] };
  return {
    drop, pitch, arch: (o.flex ?? 0.5) * g + (o.flexBias ?? 0),
    fFH: footPath(ph, bt.hF, duty, D, lift, hx0, hk), fNH: footPath(ph, bt.hN, duty, D, lift, hx0, hk),
    fFF: footPath(ph, bt.fF, duty, D, lift, fx0, fr), fNF: footPath(ph, bt.fN, duty, D, lift, fx0, fr),
    nod: pitch * (o.nod ?? 1.1) + g * 0.08, g,
  };
};

// how hard each leg is stretched in a solved beast (1 = dead straight; over 1 the
// foot was pulled off its mark): a lab check, not for drawing
export const reachOf = (b) => {
  const out = {};
  for (const key of ["NF", "FF", "NH", "FH"]) {
    const l = b[key], Q = b.Q, f = l.fore, len = f ? Q.foreU + Q.foreL : Q.hindU + Q.hindL;
    const p = b.p["f" + key], ox = l.far ? Q.far[0] : 0, oy = l.far ? Q.far[1] : 0;
    const tx = (f ? Q.spine / 2 + Q.sh[0] + Q.foreX : -Q.spine / 2 + Q.hip[0] + Q.hindX) + p[0] + ox, ty = -Q.paw - p[1] + oy;
    out[key] = Math.hypot(tx - l.j[0], ty - l.j[1]) / len;
  }
  return out;
};
