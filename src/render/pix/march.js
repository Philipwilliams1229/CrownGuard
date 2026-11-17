// ============ MARCH: a figure's walk up and down the screen (2026-11-17, owner) ============
// The figures are drawn side-on and only ever face left or right, so on a road
// that runs up the board a side stride slid upward like a moonwalk. On those
// stretches the walk is foreshortened instead: the feet step UNDER the body, the
// planted foot slides toward the camera (walking up) or away from it (walking
// down) with the ground, the free foot comes back on a short, high step, and the
// arms and shoulders swing less. Every humanoid walk gets it from its own side
// walk, measured, so no figure file changes: vertWalk(clip, k, dir) is the side
// walk mixed k (0..1) of the way into the up (dir -1) or down (dir +1) walk.
// pixrigs.js adds four of them to every figure whose walk is a two-legged pose
// (fN / fF): walkU / walkUh (up, all and half) and walkD / walkDh. Four-legged
// beasts, riders and fliers keep their walk. march-lab.html shows it on the goblin.
import { EASE, mixPose } from "./rig.js";

const DEPTH = 0.55;   // how much of the side stride shows as depth on screen
const LIFT = 1.3;     // the step back comes higher than the side walk's

export const vertWalk = (clip, k, dir) => {
  // the side walk's own stride, lift and mean arm angles, read off one cycle
  let x0 = Infinity, x1 = -Infinity, lift = 0, mN = 0, mF = 0, n = 16;
  for (let i = 0; i < n; i++) {
    const p = clip.pose(i / n);
    x0 = Math.min(x0, p.fN[0]); x1 = Math.max(x1, p.fN[0]); lift = Math.max(lift, p.fN[1]);
    mN += (p.aN?.[0] ?? 0) / n; mF += (p.aF?.[0] ?? 0) / n;
  }
  const S = Math.max(0.5, (x1 - x0) / 2), D = S * DEPTH, L = Math.max(2.4, lift * LIFT), X = S * 0.16;
  // [x, lift] of a foot at phase q: planted for the first half (as walkPose plants it), stepping the second
  const foot = (q) => {
    q = ((q % 1) + 1) % 1;
    if (q < 0.5) { const s = -D + 4 * D * q; return [X * (1 - 4 * q), -s * dir]; }
    const u = (q - 0.5) * 2, e = EASE.io(u), s = D - 2 * D * e;
    return [-X + 2 * X * e, -s * dir + Math.sin(Math.PI * u) * L];
  };
  const damp = (a, m) => (Array.isArray(a) ? [m + (a[0] - m) * 0.5, ...a.slice(1)] : a);
  const pose = (ph) => {
    const w = clip.pose(ph);
    const v = { ...w, twist: (w.twist ?? 0) * 0.45, lean: (w.lean ?? 0) * 0.7, fN: foot(ph), fF: foot(ph + 0.5), aN: damp(w.aN, mN), aF: damp(w.aF, mF) };
    return k >= 1 ? v : mixPose(w, v, k);
  };
  return { ...clip, pose };
};

// does this figure's walk have two legs to foreshorten?
export const marchesOnFoot = (fig) => {
  const w = fig.CLIPS?.walk;
  if (!w || !w.loop || typeof w.pose !== "function") return false;
  try { const p = w.pose(0); return Array.isArray(p.fN) && Array.isArray(p.fF); } catch { return false; }
};
