// ============ CARRY: one weapon pose, seen from the side, the front and behind (2026-11-18) ============
// Owner: "make it so weapons always stay in the same positions throughout the three [views]".
// The advisor's recipe (art/briefs/views-artist.md, "One weapon pose"): a weapon has ONE 3D pose,
// read from the side walk clip; FRONT and BACK are projections of it, never a new carry.
//   a     the side view's weapon angle from straight up, radians, + = forward (the side files'
//         own convention, d = [sin a, -cos a]); damp the walk's swing before passing it
//   view  +1 FRONT (walking at us: forward is down the screen and nearer), -1 BACK
//   o.rs  the weapon hand's screen side (+1 / -1), o.hand [x, y] the fist on screen,
//         o.len fist to tip, o.butt fist to butt, o.K forward-to-screen factor (0.5),
//         o.splay outboard yaw (rad), o.maxSplay (0.5), o.minShow (0.35: the least fraction of
//         len that must show before splay is added), o.floorY (clamp to the ground), o.upright
//         (0.35 rad: below this the weapon is exactly upright in all three views)
// Returns:
//   at(f, s)  a screen point f along the weapon from the fist (f < 0: butt side), s across it
//             (along is foreshortened, across is not, so a side file's head polygon keeps its width)
//   dir       the unit screen direction of the tip side, fore its length factor (0..1)
//   near      true when the tip side is nearer the camera than the fist
//   zTip, zButt  BACK: far side 1.0, near side 4.6 (over the arms, under back gear);
//             FRONT: o.zTop (default 8.2) near, o.zUnder (default 1.5) far
//   splayUsed, cls ("upright" | "raised" | "level" | "low" | "behind")
// Artists still draw the fist, the occluders and the head; this fixes direction, length and depth.
export const DAMP = 0.35;
export const damp = (aFrame, aMean, k = DAMP) => aMean + k * (aFrame - aMean);

export const carry = (a, view, o = {}) => {
  const rs = o.rs ?? 1, hand = o.hand ?? [0, 0], K = o.K ?? 0.5, upright = o.upright ?? 0.35;
  const maxSplay = o.maxSplay ?? 0.5, minShow = o.minShow ?? 0.35;
  let u = Math.cos(a), f = Math.sin(a);
  if (Math.abs(a) <= upright) { u = 1; f = 0; }
  // the screen vector for a splay: forward splits into outboard (x) and toward/away (y)
  const vec = (sp) => {
    const fx = f * Math.sin(sp), fz = f * Math.cos(sp);
    return [rs * fx, -u + view * K * fz];
  };
  let splay = o.splay ?? 0, v = vec(splay), fore = Math.hypot(v[0], v[1]);
  // too little shows (end-on): yaw it outboard until it reads, up to maxSplay
  while (fore < minShow && splay < maxSplay - 1e-6) { splay = Math.min(maxSplay, splay + 0.05); v = vec(splay); fore = Math.hypot(v[0], v[1]); }
  let dir = fore > 1e-6 ? [v[0] / fore, v[1] / fore] : [0, -1];
  if (fore < minShow) fore = minShow;
  const near = view * f > 1e-6;
  const zTip = view < 0 ? (near ? 4.6 : 1.0) : (near ? (o.zTop ?? 8.2) : (o.zUnder ?? 1.5));
  const zButt = view < 0 ? (near ? 1.0 : 4.6) : (near ? (o.zUnder ?? 1.5) : (o.zTop ?? 8.2));
  const deg = (a * 180) / Math.PI;
  const cls = Math.abs(a) <= upright ? "upright" : deg < 0 ? "behind" : deg < 60 ? "raised" : deg <= 100 ? "level" : "low";
  const at = (fAlong, s = 0) => {
    let x = hand[0] + dir[0] * fAlong * fore - dir[1] * s, y = hand[1] + dir[1] * fAlong * fore + dir[0] * s;
    if (o.floorY != null && y > o.floorY) y = o.floorY;
    return [x, y];
  };
  return { at, dir, fore, near, zTip, zButt, splayUsed: splay, cls };
};
