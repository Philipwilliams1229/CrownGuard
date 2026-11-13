// ============ RIG: the puppet's bones and its clips (concept) ============
// A side-on biped (facing +x, turned a quarter toward the viewer, so the
// near shoulder sits a little behind and the far one a little ahead).
// A POSE is a small bag of numbers an animator would think in:
//   rx, drop      the hips: forward of the feet's centre, and sunk (px)
//   rise          the chest lifted (a breath, a reach)
//   lean          the spine off upright (rad, + toward the foe)
//   twist         the shoulders turned (+ brings the near shoulder forward)
//   hx, hy        the head pushed forward / down from where the spine puts it
//   aN, aF        the near and far ARM: [angle, reach, flip]. Angle from
//                 hanging (0) forward and up (PI/2 level, PI overhead; minus
//                 is behind); reach 0..1 of the arm's length. Hands so travel
//                 on arcs about the shoulder, never along a ruler.
//   fN, fF        the near and far FOOT: [x, lift] from the feet's centre
// Bones keep their length: elbows and knees are solved (elbows fold back and
// down, knees forward), so no pose can break an arm.
// Anything else in a pose (a staff's tilt, a glow) rides along and is eased
// with the rest; the figure's costume reads it.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const EASE = {
  lin: (t) => t,
  io: (t) => t * t * (3 - 2 * t),
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  in3: (t) => t * t * t,
  out3: (t) => 1 - (1 - t) ** 3,
  // past the mark and back: the follow-through
  over: (t) => { const s = 1.9; const u = t - 1; return u * u * ((s + 1) * u + s) + 1; },
};

export const HUMAN = { thigh: 8, shin: 7.5, ankle: 2, spine: 10, neck: 1.5, upper: 6.2, fore: 5.8, shN: -2, shF: 2.4, hipN: -1.2, hipF: 1.4 };
export const scaled = (B, k, o = {}) => { const out = {}; for (const key in B) out[key] = B[key] * k; return { ...out, ...o }; };

export const REST = { rx: 0, drop: 0, rise: 0, lean: 0, twist: 0, hx: 0, hy: 0, aN: [0.05, 0.96, 0], aF: [0.12, 0.96, 0], fN: [-1.6, 0], fF: [1.8, 0] };

export const mixPose = (a, b, t) => {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? b[k], y = b[k] ?? a[k];
    if (typeof x === "number" && typeof y === "number") out[k] = lerp(x, y, t);
    else if (Array.isArray(x) && Array.isArray(y)) out[k] = x.map((v, i) => (typeof v === "number" && typeof (y[i] ?? v) === "number" ? lerp(v, y[i] ?? v, t) : (t < 0.5 ? v : y[i])));
    else out[k] = t < 0.5 ? x : y;
  }
  return out;
};

// keys: [{ t, p, e }] with t rising 0..1; the ease named on a key shapes the move INTO it
export const sampleKeys = (keys, ph) => {
  if (ph <= keys[0].t) return { ...REST, ...keys[0].p };
  for (let i = 1; i < keys.length; i++) {
    if (ph <= keys[i].t) {
      const a = keys[i - 1], b = keys[i], u = (ph - a.t) / (b.t - a.t || 1);
      return mixPose({ ...REST, ...a.p }, { ...REST, ...b.p }, (EASE[b.e] || EASE.io)(u));
    }
  }
  return { ...REST, ...keys[keys.length - 1].p };
};

// two bones from a to the target: where the joint between them goes (side +1 / -1 picks the fold)
export const ik = (ax, ay, tx, ty, l1, l2, side) => {
  let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy) || 1e-6;
  const max = (l1 + l2) * 0.999, min = Math.abs(l1 - l2) + 0.01;
  if (d > max) { tx = ax + (dx / d) * max; ty = ay + (dy / d) * max; d = max; dx = tx - ax; dy = ty - ay; }
  if (d < min) d = min;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  // side +1: the joint on the (-uy, ux) side of the limb's line
  return { mid: [ax + ux * a - uy * hgt * side, ay + uy * a + ux * hgt * side], end: [tx, ty] };
};

export const solve = (pose, B = HUMAN) => {
  const p = { ...REST, ...pose };
  const hipH = B.thigh + B.shin + B.ankle - 0.7;
  const P = [p.rx, -hipH + p.drop];
  const sl = Math.sin(p.lean), cl = Math.cos(p.lean);
  const C = [P[0] + sl * B.spine, P[1] - cl * B.spine - p.rise];
  const N = [C[0] + sl * B.neck * 1.5 + p.hx, C[1] - B.neck + p.hy];
  const sN = [C[0] + B.shN + p.twist * 1.6, C[1] + 0.9], sF = [C[0] + B.shF - p.twist * 1.6, C[1] - 0.1];
  const hN = [P[0] + B.hipN, P[1]], hF = [P[0] + B.hipF, P[1]];
  const armLen = B.upper + B.fore;
  const arm = (s, [ang, reach, flip]) => {
    const tx = s[0] + Math.sin(ang) * reach * armLen, ty = s[1] + Math.cos(ang) * reach * armLen;
    const r = ik(s[0], s[1], tx, ty, B.upper, B.fore, flip > 0.5 ? -1 : 1);
    return [r.mid, r.end];
  };
  const leg = (hp, [fx, lift]) => {
    const r = ik(hp[0], hp[1], fx, -B.ankle - lift, B.thigh, B.shin, -1);
    return [r.mid, r.end];
  };
  const [eN, hdN] = arm(sN, p.aN), [eF, hdF] = arm(sF, p.aF);
  const [kN, anN] = leg(hN, p.fN), [kF, anF] = leg(hF, p.fF);
  return { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF, B };
};

// ---- the walk: feet on a real path, the body riding them ------------------------
// One cycle, phase 0..1. Each foot is planted for half the cycle (sliding back
// under the body at the pace of the march) and swings forward on a low arc for
// the other half. The hips sink at each footfall and rise as a leg passes; the
// shoulders counter the hips; the arms swing against the legs.
export const walkPose = (ph, o = {}) => {
  const S = o.stride ?? 5.2, lift = o.lift ?? 2.6, sw = o.swing ?? 0.42, bob = o.bob ?? 1.1;
  const foot = (q) => {
    q = ((q % 1) + 1) % 1;
    if (q < 0.5) return [S - 4 * S * q, 0];
    const u = (q - 0.5) * 2, e = EASE.io(u);
    return [-S + 2 * S * e, Math.sin(Math.PI * u) * lift * (0.75 + 0.25 * Math.sin(Math.PI * u))];
  };
  const a = Math.cos(ph * Math.PI * 2);
  return {
    rx: 0, drop: (0.5 + 0.5 * Math.cos(ph * Math.PI * 4)) * bob, lean: o.lean ?? 0.07,
    twist: -a * 0.45, hx: 0, hy: 0,
    fN: foot(ph), fF: foot(ph + 0.5),
    aN: [-a * sw + 0.05, 0.93, 0], aF: [a * sw + 0.1, 0.93, 0],
  };
};

// A clip: { n frames, ms per loop, loop, pose(ph) } -> the solved skeleton at
// frame f, plus two earlier moments for things that trail (hat points, hems).
export const frameAt = (clip, f, B) => {
  const at = (ph) => {
    if (clip.loop) ph = ((ph % 1) + 1) % 1; else ph = clamp(ph, 0, 1);
    return solve(clip.pose(ph), B);
  };
  const ph = clip.loop ? f / clip.n : f / (clip.n - 1);
  // `at(ph)`: the skeleton at any other moment of the clip (for an effect that must know where a hand WAS)
  return { ph, sk: at(ph), lag1: at(ph - (clip.lag ?? 0.07)), lag2: at(ph - (clip.lag ?? 0.07) * 2), at };
};
