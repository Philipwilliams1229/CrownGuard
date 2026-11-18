// ============ VIEWS: the Troll seen from the FRONT and from BEHIND ============
// The troll of fig-troll.js (colours, gear, build, the sunk head, the pale pot belly) walking
// toward the camera (FRONT) and away from it (BACK), unmirrored, sun upper left. One drawer, `make(s)`:
// s = +1 front, -1 back. His RIGHT fist holds the tree-limb club (screen LEFT in front, screen RIGHT
// from behind); it trails beside him, its head dragging at the ground. The walk is the side clip's own
// (same n, ms, pose): feet, bob and arm swing are read from the solved pose, so views switch mid-stride.
// A plod: a wide, heavy side-to-side roll over the planted foot, the long arms swinging a little.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-troll.js";
import { carry, damp } from "./carry.js";

const SKIN = mat("#7a8a5a"), BELLY = mat("#8f9a6a"), HIDE = mat("#5a4a3a"), HIDE_D = mat("#40342a"), HAIR = mat("#3a3a2a"), MOSS = mat("#5c7c34");
const WOOD = mat("#6e5234"), BARK = mat("#54402a"), CUT = mat("#b09460"), BONE = mat("#ece0c4"), NAIL = mat("#c8c2a0");
const NOSE = mat("#9c8c62"), EYE = flat("#e8c14a"), MOUTH = flat("#2c1a22");
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE },
  N: { m: NOSE, fix: 3 }, L: { m: NOSE, fix: 4 }, m: { m: NOSE, fix: 2 }, n: { m: NOSE, fix: 0 }, l: { m: SKIN, fix: 3 }, T: { m: BONE, fix: 3 }, X: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: -1 },
};
// halves (cols 0..7, col 7 the centre) mirrored to 15 wide
const mir = (halves) => halves.map((h0) => { const h = h0[0] + h0[0] + h0; return h + h.slice(0, 9).split("").reverse().join(""); });
const put = (rows, r, c, str) => rows.map((row, i) => i === r ? row.slice(0, c) + str + row.slice(c + str.length) : row);
// FRONT: lank hair framing a low brow, small yellow eyes under one slab of brow, the great bulb of a nose
// (shine L, nostrils n), the underbite with two blunt tusks standing up from it (T).
const FRONT_H = mir([
  "....HHHH", "..HHHHHH", ".HHHHGGG", ".HHGGGGG", ".hGBBBBB", ".hGGbYYG", ".hGGGGNN", ".hGGGNLN",
  ".hGGGNNN", ".hGGGGnN", ".hGGGGGG", ".hGGGTXX", ".gGGTTlX", ".gGGGGGG", "..gGGGGG", "....gggg",
]);
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
// lopsided (owner: wider, less symmetrical): his right-hand eye (screen right) small and low under a dropped brow,
// the nose bent a pixel to that side, the right tusk broken to a stub
let FRONT_X = put(FRONT_H, 4, 13, "GGGG");
FRONT_X = put(FRONT_X, 5, 10, "GG"); FRONT_X = put(FRONT_X, 5, 12, "bB");
FRONT_X = put(FRONT_X, 6, 10, "NY"); FRONT_X = put(FRONT_X, 9, 8, "GnNn");
FRONT_X = put(FRONT_X, 11, 11, "G"); FRONT_X = put(FRONT_X, 12, 12, "G");
const FRONT_BL = swap(FRONT_X, { 5: FRONT_X[5].replace(/Y/g, "G"), 6: FRONT_X[6].replace(/Y/g, "B") });
// BACK: a wet mop of lank hair to the shoulders, strands (h) in it, the tips of the ears, a bare nape.
const BACK_H = mir([
  "....HHHH", "..HHHHHH", ".HHHHHHH", "HHHhHHHH", "HHHHHhHH", "HHhHHHHH", "HHHHHHhH", "HHHhHHHH",
  ".HHhHHHH", ".HhHHHHh", ".hHHHhHH", "..hHHhGG", "..gGGGGG", "...gGGGG", "....gggg", "........",
]);

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;

const make = (s) => (px, F) => {
  const rs = -s, ls = s;                         // screen side of his right (club hand) and left
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 1.3 * Math.sin(t * TAU); // rolls over the planted foot
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 1.8;
  const hx = Math.round(sx * 0.6);
  const vy = cl(sk.N[1] - F.lag1.N[1], -3, 3), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -3, 3);
  const vx = cl((sx - sx1) * 1.4, -3, 3), vx2 = cl((sx1 - sx2) * 1.4, -3, 3);

  // ---- legs: short, bowed, big flat feet with pale nails; the lifted foot comes toward us (front) / away (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1;
    const fx = hx + side * 7.2, fy = -2.6 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 6.2, hipY + 1], kn = [hx + side * 9.2, (hp[1] + fy) / 2 - lift * 0.4];
    px.part();
    px.capsule(hp[0], hp[1], 6, kn[0], kn[1], 5.2, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 5, fx, fy, 4, SKIN, z, { bias: b });
    px.part();
    if (s > 0) {
      px.ellipse(fx + side * 0.6, fy + 1.4, 5.6, 3.1, SKIN, z + 0.4, { bias: b });
      for (const x of [-3.2, -0.4, 2.4]) px.dot(fx + side * 0.6 + x, fy + 3.4, NAIL, z + 0.45, { fix: b ? 2 : 3 });
    } else {
      px.ellipse(fx, fy + 0.8, 4.6, 2.7, SKIN, z + 0.4, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.8, 4.3, 2 * cl(lift / 2.4, 0.3, 1), SKIN, z + 0.45, { bias: -2 });   // the sole as the heel comes up
    }
  }

  // ---- the hide rags: a ragged kilt, the hem a beat behind the hips
  const kh = hipY + 8, sh = -vx * 1.2 - vx2 * 0.8, kl = hx - 11 + sh, kr = hx + 11 + sh, km = (t) => kl + (kr - kl) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[hx - 10.4, hipY - 2], [hx + 10.6, hipY - 2], [kr, kh - 1.6], [km(0.9), kh + 1.4], [km(0.78), kh - 1], [km(0.64), kh + 2.2], [km(0.5), kh - 0.4], [km(0.36), kh + 1.8], [km(0.22), kh - 0.6], [km(0.1), kh + 1], [kl, kh - 2.4]], HIDE, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(hx + 3, hipY + 1, km(0.62), kh - 1, -1, kiltId);
  px.toneLine(hx - 4, hipY + 1, km(0.3), kh - 1.4, -1, kiltId);

  // ---- the trunk: a slab of chest on sloping shoulders; from behind the great hump of back
  px.body(1); const BID = px._pid;
  const c0 = chestY - 3, my = (c0 + hipY) / 2;
  px.poly([[sx - 16, c0 + 3], [sx - 11, c0 - 3.4], [sx + 11, c0 - 3.4], [sx + 16, c0 + 3], [sx + 16.4, c0 + 10], [hx + 14.6, my + 5], [hx + 12.6, hipY - 6], [hx + 10.6, hipY + 0.6], [hx - 10.6, hipY + 0.6], [hx - 12.6, hipY - 6], [hx - 14.6, my + 5], [sx - 16.4, c0 + 10]], SKIN, 4, { round: 0.92 });
  if (s > 0) {
    const bl = [hx + sx * 0.2, hipY - 11];
    px.ellipse(bl[0], bl[1], 11.4, 9.6, BELLY, 4.05, { wrap: true });
    px.dot(bl[0] + 1, bl[1] + 1.4, NOSE, 4.06, { fix: 0 });                       // the navel
    px.toneLine(bl[0] - 7, bl[1] + 8.4, bl[0] + 7, bl[1] + 8.6, -1, BID);
    px.toneLine(sx - 2, c0 + 11, sx - 7, c0 + 10, -1, BID); px.toneLine(sx + 2, c0 + 11, sx + 7, c0 + 10, -1, BID);   // under the chest
  } else {
    px.ellipse(sx, c0 + 5, 12.6, 9, SKIN, 4.05, { weld: 4 });                      // the hump
    px.toneLine(sx - 5, c0 + 1, sx + 5, c0 + 0.6, 1, BID);
    px.toneLine(sx, c0 + 3, hx, hipY - 8, -1, BID);                                 // the spine's furrow
    px.toneLine(hx - 8, hipY - 12, hx + 8, hipY - 12, -1, BID);
  }
  px.body(0);
  px.part();
  px.capsule(hx - 10.6, hipY - 1.6, 1.1, hx + 10.8, hipY - 1.4, 1.1, HIDE_D, 4.08);   // the hide rope at the waist
  if (s < 0) { px.dot(hx - 3, c0 + 6, MOSS, 4.1, { fix: 2 }); px.dot(hx + 6, c0 + 4, MOSS, 4.1, { fix: 3 }); px.dot(hx + 7, c0 + 5, MOSS, 4.1, { fix: 2 }); }

  // ---- the string of bones round his neck: a swag across the chest (front); only the knot of it behind
  px.part();
  if (s > 0) {
    for (let i = 0; i <= 8; i++) { const t = i / 8, x = sx - 9 + t * 18, y = c0 + 2.6 + 5.4 * (1 - (2 * t - 1) ** 2) * 0.9 + 0.8; px.dot(x, y, i % 2 ? BONE : HIDE_D, 4.3, { fix: i % 2 ? 3 : 1 }); }
    px.rect(sx - 1, c0 + 8, 2, 3, BONE, 4.3, { fix: 3 }); px.dot(sx, c0 + 11.4, BONE, 4.3, { fix: 2 });
  } else {
    px.dot(sx - 1, c0 + 1, HIDE_D, 4.3, { fix: 1 }); px.dot(sx + 1, c0 + 1.8, BONE, 4.3, { fix: 3 });
  }

  // ---- the arms: boulders of shoulder, forearms thicker than the upper arm, fists like hams. The club's fist is rs.
  const armOf = (side, ang, club) => {
    const sh = [sx + side * 18, c0 + 4.4], hd = [sx + side * 21.4, hipY + 7 + s * ang * 3.2], el = [sx + side * 20.2, (sh[1] + hd[1]) / 2 - 0.5];
    const near = club, b = s > 0 && !near ? -1 : 0;
    // BACK stack (higher z = further behind him): arms 4.3 both, shoulder boulders 5.0, fists 3.6; no cast, no far-arm bias
    const za = s > 0 ? 7.9 : 4.3, zs = s > 0 ? 8 : 5, zf = s > 0 ? 8.3 : 3.6, ca = s > 0 ? 1 : 0;
    px.part();
    px.capsule(sh[0], sh[1], 6, el[0], el[1], 5.3, SKIN, za, { bias: b, cast: ca });
    px.capsule(el[0], el[1], 5.3, hd[0], hd[1], 5.8, SKIN, za, { bias: b, cast: ca });
    px.part(); const sid = px._pid;
    px.ellipse(sh[0] + side * 0.4, sh[1] - 0.6, 7.6, 7, SKIN, zs, { bias: b, cast: 1, edge: s < 0 });
    px.toneLine(sh[0] - 4.6, sh[1] + 6.6, sh[0] + 4.6, sh[1] + 6.8, -1, sid);
    if (near) {   // the moss on his right shoulder
      for (const [x, y, t] of [[-3.6, -5.6, 3], [-2.4, -5.8, 2], [-1.2, -5.2, 3], [-4.6, -4.4, 2], [-3.4, -4.4, 3], [-2.2, -4.4, 2], [0.2, -5.8, 2], [1.4, -5.4, 3]]) px.dot(sh[0] + x, sh[1] + y, MOSS, zs + 0.01, { fix: t });
    } else { px.dot(sh[0] + 2.4, sh[1] + 1.6, SKIN, zs + 0.01, { fix: 4 }); px.dot(sh[0] + 2.4, sh[1] + 2.6, SKIN, zs + 0.01, { fix: 0 }); }
    px.part();
    px.ellipse(hd[0], hd[1] + 0.4, 5.2, 4.8, SKIN, zf, { bias: b });
    if (s > 0) { px.dot(hd[0] - 1.6, hd[1] - 1.2, SKIN, 8.31, { fix: 1 }); px.dot(hd[0] + 1.4, hd[1] - 1.4, SKIN, 8.31, { fix: 1 }); }
    return hd;
  };
  armOf(ls, p.aF[0], false);
  const fist = armOf(rs, p.aN[0], true);

  // ---- the club: ONE pose (carry.js). The side walk points it FORWARD and low (about 95-106 degrees from straight up,
  // fig-troll.js clubOf: forearm direction + GRIP -1.2 + wrist), not dragged. FRONT: it comes toward us, its round head on the
  // ground in front of his right foot, drawn over the shin. BACK: it runs away from us behind his arm and leg (z 1.0), the head
  // splayed out past his hip so it clears the leg. The head (full size) is never foreshortened; only the haft is.
  const CLUB_L = 27, CLUB_B = 3.6, GRIP = -1.2;
  const aSide = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])) + GRIP + cl(p.wrist || 0, -0.35, 0.35);
  const C = carry(damp(aSide, 1.75), s, { rs, hand: fist, len: CLUB_L + 3.4, butt: CLUB_B, K: 0.5, splay: s > 0 ? -0.5 : 0.4, floorY: 0, zTop: 8.2, minShow: 0.3 });
  const Z = s > 0 ? 8.2 : 1.0, o = s > 0 ? { edge: true } : { cast: 0 };
  px.part(); const cid = px._pid;
  if (s > 0) { const bt = C.at(-CLUB_B); px.capsule(bt[0], bt[1], 1.8, fist[0], fist[1], 2.2, WOOD, 8.2, o); }
  const h0 = C.at(11), hs = C.at(0);
  px.capsule(hs[0], hs[1], 2.4, h0[0], h0[1], 2.5, WOOD, Z, o);
  px.part();
  // the head at full size: from the end of the shortened haft, CL - 11 px along the screen direction, widening to 5
  let he = C.head(11, CLUB_L - 11), ce = C.head(11, CLUB_L - 11 + 3.4);
  const sink = Math.max(0, he[1] - 0.5);          // lies ON the ground, never under it
  he = [he[0], he[1] - sink]; ce = [ce[0], ce[1] - sink];
  px.capsule(h0[0], h0[1], 2.6, he[0], he[1], 5, BARK, Z, o);
  px.ellipse(ce[0], ce[1], 2.6, 2.6, CUT, Z + 0.02, { fix: 3, cast: s > 0 ? 1 : 0 });
  const st = C.head(11, 6, 3.4), st2 = C.head(11, 8.4, 6);
  px.capsule(st[0], st[1] - sink * 0.5, 1.5, st2[0], st2[1] - sink * 0.5, 1.2, BARK, Z - 0.01, o);
  px.toneLine(...C.head(11, 4, -1.4), ...C.head(11, 12, -2.6), -1, cid);

  // ---- the head, sunk between the shoulders; ears out to the sides, flapping a beat behind
  const ey = cl(-vy * 1.3 - vy2 * 0.9, -2.5, 2.5);
  for (const side of [-1, 1]) {
    px.part(); const eid = px._pid;
    const r = side, wob = ey * 0.8 + (side === rs ? vx * 0.6 : -vx * 0.6), rt = (xx, yy) => [hx + r * xx, hy + yy];
    px.poly([rt(9, -6.6), rt(9.4, -2.4), rt(13.4, -1.4 + wob * 0.4), rt(17.6, -3.2 + wob), rt(13.4, -7 + wob * 0.4)], SKIN, s > 0 ? 8.2 : 5.5, { bias: s > 0 ? -1 : 0, round: 0.6, cast: 1 });
    px.toneLine(...rt(10, -4.4), ...rt(14.4, -4.2 + wob * 0.8), -1, eid);
  }
  px.part();
  const blink = p.blink || false;
  px.stamp(s > 0 ? (blink ? FRONT_BL : FRONT_X) : BACK_H, hx, hy, LEG, s > 0 ? 6 : 6.4, { ax: 9, ay: 13, ball: [9.5, 8, 10, 9], cast: 1 });
  if (s < 0) {
    px.part();
    px.capsule(hx - 3, hy - 4, 1, hx - 4.4 - vx * 0.5, hy + 4.6, 0.7, HAIR, 6.5);
    px.capsule(hx + 3.4, hy - 4, 1, hx + 4.6 - vx * 0.5, hy + 5.2, 0.7, HAIR, 6.5);
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "troll-front", BOX: { w: 136, h: 112, ox: 68, oy: 104 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "troll-back", BOX: { w: 136, h: 112, ox: 68, oy: 104 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
