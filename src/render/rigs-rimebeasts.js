// ============ RIGS: THE RIME CLANS' BEASTS AND MONSTERS (zone IV) ============
// Bespoke bodies for the Rimewater's beasts (art/ZONES-4-5.md). Entries in
// RIMEBEAST_RIGS join RIGS (same shape: { kind, box: { hw, up, down }, p,
// fly?, fightN? }); RIMEBEAST_PAINTERS maps each `kind` to its painter
// (ctx, p) — p.pose ("walk" | "fight") and p.frame, feet (or the waterline)
// at 0,0, facing +x. Frames are baked once and inked by rigs.js.
//
//   rimerider   a clan raider (spangenhelm, braided beard, fur mantle, round
//               shield on his back, a bearded axe) on a great white frost
//               wolf at the gallop. Fight (4): guard, wind-up, the chop,
//               follow-through, the wolf braced then lunging under him.
//   rimewolf    the same wolf alone (the rider's deathSkin, if the engine
//               unseats him as it does the boar rider)
//   frostgiant  the bruiser: blue-grey hide, a frost-white beard and mane, a
//               fur mantle and kilt, a whale's jawbone crusted with ice for a
//               club, trailed at the walk. Fight (4) is the STOMP: guard,
//               the knee and the bone raised, the foot and the bone brought
//               down (ice bursts from the ground), follow-through.
//   icedrake    a lesser drake off the ice cliffs: pale blue-white scales,
//               an icicle crest and spines, finger-boned wings, four-beat
//               flap. Fight (4) is the frost breath: rear, draw in (the
//               throat glows cold), breathe, the breath trailing off.
//   rimejarl    the boss's war-mammoth: a shaggy umber coat rimed white,
//               iron-banded tusks, a teal saddle cloth and a plank howdah
//               hung with shields; the Jarl sits in it. Walk: the lateral
//               amble. Fight (4) is the trample: tusks levelled, rear up and
//               trumpet, forefeet down (ice bursts), the tusk sweep.
//   seaserpent  a long sea-green serpent with an ice-blue frill, drawn at
//               the waterline (the anchor is the water's surface): above it
//               solid, below it a dim refracted body, foam where it cuts the
//               surface. Walk (4): swimming surfaced, humps rolling back.
//               Fight (4): reared guard, the hiss (wind-up), the strike,
//               follow-through. Extra frames on the WALK sheet (frame given
//               as a string): "sub.0-3" submerged (a shadow and fin tips),
//               "surface.0-3" coming up, "dive.0-3" going down.
//   kraken      the sea-beast's head and mantle rising offshore, eyes and
//               beak at the water, arm roots curling at the surface. Walk
//               (4): breathing idle. Fight (4): watch, rear, ROAR, settle.
//               Walk-sheet strings: "rise.0-3" (coming up), "sink.0-3" (the
//               death or a dive).
//   krakenarm   one tentacle standing out of the water, suckers on its
//               inner face. Walk (4): the sway. Fight (4): raised, arched
//               back, SLAM (laid along the ground ahead), dragged back.
//               Walk-sheet strings: "rise.0-3" (bursting up), "grab.0-3"
//               (reach, wrap, squeeze, lift), "sink.0-3".
//
// The extra sheets go through the normal rig cache: the engine (or draw.js)
// calls drawRig(ctx, type, x, y, face, "walk", "surface.2") — rigs.js keys
// a bake by its frame, so any string is its own frame (as the skiff's are).
//
// Colour params keep the generic names (col, belly, mane, wing, skin, cloth,
// cloth2, hair, cape, eyes) so revive() and the white hit-flash reach them.

import { lighten, darken, mix, lin, part, shadow, glow } from "./paint.js";
import { weapon } from "./rigs.js";
import { BEAST_PAINTERS } from "./rigs-beasts.js";
import { rimeJarlRider, RIME_JARL } from "./rigs-rime.js";
import { logJoint } from "./folk-kit.js";

const TAU = Math.PI * 2;
const q = (v) => Math.round(v * 2) / 2;               // snap to the art pixel
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const PI = Math.PI;

// ---- shape kit (as rigs-beasts.js) -------------------------------------------
const curve = (c, pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  c.moveTo(...mid(pts[0], pts[1]));
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n], m = mid(p, pts[(i + 1) % n]);
    if (p[2]) { c.lineTo(p[0], p[1]); c.lineTo(m[0], m[1]); } else c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  c.closePath();
};
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const fillPoly = (c, pts, col) => { c.fillStyle = col; poly(c, pts); c.fill(); };
const tone = (c, x0, y0, x1, y1, col, hi = 0.3, lo = 0.42) => lin(c, x0, y0, x1, y1, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
const taper = (c, pts, ws) => {
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i], r = ws[i] / 2;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (i + 1 < pts.length) {
      const [x2, y2] = pts[i + 1], r2 = ws[i + 1] / 2;
      const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      c.beginPath(); c.moveTo(x + nx * r, y + ny * r); c.lineTo(x2 + nx * r2, y2 + ny * r2); c.lineTo(x2 - nx * r2, y2 - ny * r2); c.lineTo(x - nx * r, y - ny * r); c.closePath(); c.fill();
    }
  }
};
// two-bone reach: bend +1 folds toward -x (an elbow), -1 toward +x (a knee)
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const t = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1))));
  const ang = Math.atan2(dy, dx) + bend * t;
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
const leg = (ctx, pts, ws, col, o = {}) => part(ctx, (c) => {
  c.fillStyle = col; taper(c, pts, ws);
  if (o.hi) { c.fillStyle = o.hi; taper(c, pts.slice(0, -1).map(([x, y], i) => [x - ws[i] * 0.24, y - 0.2]), ws.slice(0, -1).map((w) => w * 0.34)); }
  if (o.extra) o.extra(c, pts);
});
const spike = (c, p, n, h, w = 0.9, lean = 0.45) => {
  const t = [-n[1], n[0]];
  poly(c, [[p[0] + t[0] * w, p[1] + t[1] * w], [p[0] + n[0] * h - h * lean, p[1] + n[1] * h], [p[0] - t[0] * w, p[1] - t[1] * w]]);
  c.fill();
};
// a smooth centreline through a few control points (Catmull-Rom), n samples a span
const spline = (pts, n = 4) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice(0, 2));
  return out;
};
// the unit normal of a centreline at sample i, turned to face up (or down)
const normalAt = (pts, i, up = true) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  let n = [-dy / l, dx / l];
  if ((n[1] < 0) !== up) n = [-n[0], -n[1]];
  return n;
};
const ICE = "#d4f0fc", ICE_LT = "#f4fcff", ICE_DK = "#8ec4dc";
// a cluster of ice spikes bursting out of the ground round (x, 0): the stomp
const iceBurst = (ctx, x, r, k = 1) => part(ctx, (c) => {
  const sp = [[-r, 0.55, -0.5], [-r * 0.45, 0.9, -0.2], [0, 1, 0.05], [r * 0.5, 0.8, 0.3], [r, 0.5, 0.55]];
  for (const [dx, h, lean] of sp) {
    const hh = h * 5.5 * k, bx = x + dx;
    fillPoly(c, [[bx - 1.3, 0.6], [bx + lean * hh * 0.5, -hh], [bx + 1.3, 0.6]], ICE_DK);
    fillPoly(c, [[bx - 1.3, 0.6], [bx + lean * hh * 0.5, -hh], [bx - 0.1, 0.6]], ICE_LT);
  }
}, { ink: null });
// the cracks and frost the stomp leaves on the ground (flat, under the ink)
const frostCracks = (c, x, r) => {
  c.fillStyle = "rgba(214,240,252,0.38)";
  c.beginPath(); c.ellipse(x, 0.3, r, r * 0.3, 0, 0, TAU); c.fill();
};

// ---- water: the waterline is y = 0 ------------------------------------------
const SEA = "#1e4656", FOAM = "#eef6f8";
// what lies under the surface: painted at full strength on a scratch layer
// with the colours pulled toward the sea, then laid on dim (alpha under the
// ink's threshold, so it is never outlined): a refraction, not a body
const submerged = (ctx, fn, a = 0.34) => {
  const cv = ctx.canvas;
  if (!cv || !cv.width) return;
  const tmp = document.createElement("canvas");
  tmp.width = cv.width; tmp.height = cv.height;
  const t = tmp.getContext("2d");
  t.imageSmoothingEnabled = false;
  t.setTransform(ctx.getTransform());
  t.beginPath(); t.rect(-400, 0.5, 800, 400); t.clip();
  fn(t, (col) => mix(col, SEA, 0.55));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(tmp, 0, 0); ctx.restore();
};
// the part above the surface: a part clipped to y <= 0
const above = (ctx, fn) => part(ctx, (c) => { c.save(); c.beginPath(); c.rect(-400, -400, 800, 400.4); c.clip(); fn(c, (col) => col); c.restore(); });
// foam where a body cuts the surface: a bright collar and a ripple ring
const foam = (ctx, x, w, k = 1) => {
  ctx.fillStyle = "rgba(226,240,246,0.32)";
  ctx.beginPath(); ctx.ellipse(x, 0.6, w * 1.6 * k, 1.6 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = FOAM;
  ctx.beginPath(); ctx.ellipse(x, 0.2, w * 0.62, 0.9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#c4e2ec";
  ctx.fillRect(x - w * 0.62, 0.4, w * 1.24, 0.5);
};
// spray: drops thrown up off the surface
const spray = (ctx, x, w, h, seed = 1) => {
  for (let i = 0; i < 9; i++) {
    const u = ((i * 37 + seed * 11) % 17) / 17 - 0.5, v = ((i * 53 + seed * 7) % 13) / 13;
    ctx.fillStyle = i % 3 ? FOAM : "#bfe0ea";
    const dx = x + u * w * 2, dy = -v * h - 0.5;
    ctx.fillRect(q(dx), q(dy), 1, 1);
  }
};
const rings = (ctx, x, w, k) => {
  ctx.strokeStyle = `rgba(226,240,246,${0.36 * k})`; ctx.lineWidth = 0.5;
  for (const r of [1, 1.7]) { ctx.beginPath(); ctx.ellipse(x, 0.6, w * r, w * r * 0.26, 0, 0, TAU); ctx.stroke(); }
};

// ---- the clan raider, seated ---------------------------------------------------------
// Hip at (0, 0) of the caller's transform, facing +x. pose: lean, the axe
// hand and the haft's angle.
const raider = (ctx, p, k, o = {}) => {
  const skin = p.skin, cloth = p.cloth, fur = p.cloth2, hair = p.hair, steel = "#8e96a2";
  const lean = k.lean;
  // the round shield slung across his back (far side)
  part(ctx, (c) => {
    const sx = -2.6 + lean * 0.4, sy = -4.6;
    c.fillStyle = tone(c, sx - 3.6, sy - 3.6, sx + 3.6, sy + 3.6, p.shcol || "#d8d0bc", 0.25, 0.4);
    c.beginPath(); c.ellipse(sx, sy, 3.3, 3.7, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(sx, sy, 3.3, 3.7, 0, 0, TAU); c.clip();
    c.fillStyle = darken(cloth, 0.05); c.fillRect(sx - 4, sy - 4, 4, 4); c.fillRect(sx, sy, 4, 4);
    c.restore();
    c.fillStyle = steel; c.beginPath(); c.arc(sx, sy, 0.9, 0, TAU); c.fill();
  });
  // far arm, on the scruff (in shade)
  leg(ctx, [[1 + lean, -5.2], [4 + lean * 0.6, -3.2], [5 + lean * 0.6, -2.4]], [1.9, 1.6, 1.6], darken(cloth, 0.3));
  // near leg down the flank: dark breeches, the shin bound in fur
  leg(ctx, [[0.2, -0.8], [3.2, 1.4], [2.4, 4.6]], [3, 2.4, 2.1], darken(cloth, 0.3), {
    extra: (c) => { c.fillStyle = fur; c.fillRect(1.5, 2.4, 2.2, 1.7); c.fillStyle = "#3a2c26"; c.beginPath(); c.ellipse(3.1, 5, 1.6, 1, 0, 0, TAU); c.fill(); },
  });
  // torso: a wool tunic under a mail shirt, a fur mantle over the shoulders
  part(ctx, (c) => {
    const body = [[-2.6, 0.6], [2.4, 0.6], [2.8 + lean * 0.4, -3], [2.4 + lean, -6.2], [lean * 0.8, -7.2], [-2 + lean * 0.8, -6.4], [-2.8, -2.6]];
    curve(c, body);
    c.fillStyle = tone(c, -2.8, -7, 2.8, 0, steel, 0.3, 0.45); c.fill();
    c.save(); curve(c, body); c.clip();
    // mail rings: a stipple of darker rows
    c.fillStyle = darken(steel, 0.35);
    for (let y = -6; y < 0; y += 1) for (let x = -3 + (y & 1) * 0.5; x < 3.4 + lean; x += 1) c.fillRect(x, y, 0.5, 0.5);
    // the tunic's hem and a belt
    c.fillStyle = tone(c, -2.8, -1.6, 2.8, 0.6, cloth, 0.25, 0.4); c.fillRect(-3, -1.4, 7, 2.2);
    c.fillStyle = "#4a3426"; c.fillRect(-3, -2.2, 7, 0.9);
    c.fillStyle = "#c8a050"; c.fillRect(1 + lean * 0.3, -2.2, 0.8, 0.9);
    c.restore();
    // the fur mantle: a ragged collar across the shoulders
    c.fillStyle = tone(c, 0, -8.6, 0, -4.6, fur, 0.2, 0.35);
    const m = lean * 0.85;
    curve(c, [[-2.8 + m, -7.4], [-0.6 + m, -8.4], [2 + m, -8.2], [3.4 + m, -6.8], [2.6 + m, -5.6, 1], [1.8 + m, -6.2], [1 + m, -5.2, 1], [0 + m, -6], [-1 + m, -5, 1], [-1.8 + m, -5.8], [-2.8 + m, -4.6, 1], [-3.4 + m, -6.2]]);
    c.fill();
  });
  // head: spangenhelm with a nasal, a braided beard
  const hx = 1.8 + lean * 1.1, hy = -9.6;
  part(ctx, (c) => {
    // the braid down his back, under everything else
    c.fillStyle = tone(c, hx - 3, hy, hx - 1, hy + 4, hair, 0.25, 0.4);
    taper(c, [[hx - 1.6, hy - 0.4], [hx - 2.6, hy + 1.6], [hx - 3, hy + 3.6]], [1.8, 1.3, 1]);
    // face
    c.fillStyle = tone(c, hx - 2.4, hy - 2.4, hx + 2.4, hy + 2.4, skin, 0.3, 0.35);
    curve(c, [[hx - 2, hy + 0.4], [hx - 1.6, hy - 2], [hx + 0.8, hy - 2.4], [hx + 2.2, hy - 0.8], [hx + 2.6, hy + 0.6, 1], [hx + 1.8, hy + 1.4], [hx - 0.6, hy + 2.2]]); c.fill();
    // the beard, plaited to a point (the Jarl's long and white)
    const bc = hair, bl = 0;
    c.fillStyle = tone(c, hx - 1, hy, hx + 2.5, hy + 4 + bl, bc, 0.25, 0.4);
    curve(c, [[hx - 1, hy + 0.2], [hx + 0.8, hy + 0.9], [hx + 2.5, hy + 0.6], [hx + 2.2, hy + 2], [hx + 1.6, hy + 3.4 + bl, 1], [hx + 0.6, hy + 2.6 + bl * 0.6], [hx - 0.8, hy + 1.8]]); c.fill();
    c.fillStyle = darken(bc, 0.3); c.fillRect(hx + 1.1, hy + 2.3 + bl * 0.5, 1, 0.5);
    // the helm: a conical cap riveted in four plates, a rim band and a nasal
    const hc = steel;
    c.fillStyle = tone(c, hx - 2.6, hy - 5, hx + 2.6, hy, hc, 0.35, 0.4);
    curve(c, [[hx - 2.5, hy - 0.4], [hx - 2.3, hy - 2.6], [hx - 0.4, hy - 4.8, 1], [hx + 1.6, hy - 3.2], [hx + 2.6, hy - 0.8], [hx + 0.2, hy - 1.2]]); c.fill();
    c.fillStyle = darken(hc, 0.3);
    c.fillRect(hx - 2.5, hy - 1.4, 5.1, 0.9);
    c.fillRect(hx + 1.9, hy - 1.4, 0.8, 2.4);            // the nasal
    c.fillStyle = darken(hc, 0.25); c.fillRect(hx - 0.6, hy - 4.3, 0.5, 2.9);
    // the eye under the brim
    c.fillStyle = "#1e1822"; c.fillRect(hx + 1, hy - 0.4, 0.6, 0.7);
  });
  // near arm and the axe: two bones that keep their length, the elbow folding
  // the natural way; one inked part, the fist over the haft
  const sh = [0.4 + lean, -5.8], hand = k.hand;
  weapon(ctx, o.weapon || "axe", hand[0], hand[1], k.ang, p.wcol, o.ws || 1.1);
  const UP = 2.8, FORE = 2.7, el = ik(sh, hand, UP, FORE, 1);
  logJoint(ctx, "arm", sh, el, hand, { lens: [UP, FORE] });
  leg(ctx, [sh, el, hand], [2.1, 1.9, 1.7], darken(steel, 0.08), {
    extra: (c) => { c.fillStyle = mix(skin, "#8a6a52", 0.3); c.beginPath(); c.arc(hand[0], hand[1], 0.95, 0, TAU); c.fill(); c.fillStyle = fur; c.fillRect(el[0] + (hand[0] - el[0]) * 0.55 - 0.8, el[1] + (hand[1] - el[1]) * 0.55 - 0.8, 1.6, 1.6); },
  });
};
// the axe through a ride and a fight (the hand in the rider's own frame)
const RIDER_WALK = (f) => ({ lean: 0.5, hand: [3.3, -4.6], ang: -2.55 + Math.sin((f / 4) * TAU) * 0.1 });
const RIDER_FIGHT = [
  { lean: 0.2, hand: [4.2, -6.6], ang: -1.05 },        // guard: the axe up before him
  { lean: -0.8, hand: [-1.8, -10.1], ang: -2.1 },      // wind-up: the axe up behind his head
  { lean: 1.4, hand: [5.6, -4.2], ang: 0.15 },         // the chop
  { lean: 1, hand: [4.6, -2.6], ang: 0.9 },            // follow-through, the head low
];

// ---- the frost wolf and its rider -------------------------------------------------
// The wolf is the Greenwood's dire wolf body (rigs-beasts.js) in a white
// coat; the seat follows its gait keys (WOLF_RUN / WOLF_FIGHT there).
const WOLF_SEAT = [{ bob: -1.5, arch: -0.4, st: 1 }, { bob: 0, arch: 0.3, st: 0 }, { bob: -1, arch: 1.5, st: -1 }, { bob: 0, arch: 0.6, st: 0 }];
const WOLF_SEAT_FIGHT = [{ bob: 1, arch: 0.8, st: 0 }, { bob: -1.5, arch: -0.3, st: 1.2, dx: 2.5 }];
const WOLF_OF_FIGHT = [0, 0, 1, 1];          // the rider's four fight frames over the wolf's two
const frostwolf = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const wf = fight ? WOLF_OF_FIGHT[f % 4] : f % 4;
  BEAST_PAINTERS.direwolf(ctx, { len: p.len, col: p.col, belly: p.belly, mane: p.mane, eyes: p.eyes, pose: p.pose, frame: wf });
  // rime on the ruff and the brush: a few ice-white points
  const s = (p.len ?? 30) / 30;
  const k = fight ? WOLF_SEAT_FIGHT[wf] : WOLF_SEAT[wf];
  const b = q(k.bob);
  // a breath of frost from the jaws
  ctx.fillStyle = "rgba(230,246,252,0.4)";
  const mx = (21.5 + (k.st || 0) * 0.8 + (k.dx || 0)) * s, my = (-17.4 + b) * s;
  ctx.fillStyle = "rgba(230,246,252,0.34)";
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(mx + 1.6 + i * 2.6, my - 0.8 - i * 0.9, 0.8 + i * 0.3, 0, TAU); ctx.fill(); }
  if (!p.rider) return;
  ctx.save();
  ctx.translate((0.5 + k.st * 0.3 + (k.dx || 0)) * s, (-16 + b - k.arch * 0.8) * s);
  ctx.scale(s * 1.3, s * 1.3);
  raider(ctx, p, fight ? RIDER_FIGHT[f % 4] : RIDER_WALK(f));
  ctx.restore();
};

// ---- the frost giant -------------------------------------------------------------
// A hunched, heavy biped: hips at 15, a barrel of a torso, long arms, a small
// head sunk between the shoulders. Bones: thigh 8.5, shin 8, upper arm and
// forearm 8 each (logged for the joint lab).
const G_THIGH = 8.5, G_SHIN = 8, G_UP = 8, G_FORE = 8;
const GIANT_WALK = [
  { b: 0, lean: 0.6, near: [5, 0], far: [-4, 0], hand: [8.4, -14.6], ang: 2.5, fhand: [-1.6, -15] },
  { b: -1, lean: 0.8, near: [1, 0], far: [0.5, -2.6], hand: [7.2, -15.4], ang: 2.42, fhand: [1, -15.6] },
  { b: 0, lean: 0.6, near: [-4, 0], far: [5, 0], hand: [5.8, -15], ang: 2.36, fhand: [3.6, -15] },
  { b: -1, lean: 0.8, near: [0.5, -2.6], far: [1, 0], hand: [7, -15.4], ang: 2.44, fhand: [1.4, -15.6] },
];
const GIANT_FIGHT = [
  // guard: crouched, both fists on the bone held up across him
  { b: 1, lean: 0.6, near: [6, 0], far: [-5, 0], hand: [10.5, -19], ang: -1.0, two: true },
  // wind-up: the near knee up, the bone up behind his head, leaning back
  { b: 0, lean: -1.5, near: [6.5, -7], far: [-4.5, 0], hand: [-5, -40], ang: -2.4, fhand: [8.5, -24] },
  // the stomp: foot and bone down together, ice bursting from the ground
  { b: 3, lean: 2, near: [7.5, 0], far: [-5, 0], hand: [13, -12], ang: 0.55, two: true, burst: 1 },
  // follow-through: low, the bone on the ground, the ice settling
  { b: 2, lean: 1.5, near: [7.5, 0], far: [-5, 0], hand: [11.5, -13], ang: 0.75, two: true, burst: 0.55 },
];
const giant = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? GIANT_FIGHT[f % 4] : GIANT_WALK[f % 4];
  const skin = p.skin, fur = p.cloth2, kilt = p.cloth, hair = p.hair, bone = p.wcol || "#e6dcc4";
  const b = k.b, L = k.lean;
  const farSkin = darken(skin, 0.28);
  shadow(ctx, 1.5, 0.4, 13, 2.6, 0.32);
  if (k.burst) part(ctx, (c) => frostCracks(c, k.near[0] + 1, 9 * k.burst), { ink: null });
  const hipN = [-0.5, -15 + b], hipF = [1, -15.6 + b];
  const S = [3.5 + L, -28.5 + b], SF = [S[0] - 3, S[1] - 1];
  const dir = [Math.cos(k.ang), Math.sin(k.ang)];
  const grip2 = [k.hand[0] - dir[0] * 2.6, k.hand[1] - dir[1] * 2.6];
  const fhand = k.two ? grip2 : k.fhand;
  // a leg: hip, knee forward, ankle; a fur-bound foot
  const gLeg = (hip, foot, col, hi) => {
    const ank = [foot[0], foot[1] - 1.3];
    const kn = ik(hip, ank, G_THIGH, G_SHIN, -1);
    logJoint(ctx, "leg", hip, kn, ank, { lens: [G_THIGH, G_SHIN] });
    leg(ctx, [hip, kn, ank], [6.2, 5, 4.2], col, {
      hi,
      extra: (c) => {
        // fur wrapping round the shin, then the broad bare foot
        const m = lerp(kn, ank, 0.55);
        c.fillStyle = darken(fur, hi ? 0.05 : 0.3); c.beginPath(); c.ellipse(m[0], m[1], 2.6, 1.8, 0, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.ellipse(ank[0] + 1.4, ank[1] + 0.8, 3.2, 1.3, 0, 0, TAU); c.fill();
        c.fillStyle = darken(col, 0.35); for (const t of [0.8, 2, 3.2]) c.fillRect(ank[0] + 1 + t, ank[1] + 1, 0.6, 0.5);
      },
    });
  };
  const gArm = (sh, hand, col, front) => {
    const el = ik(sh, hand, G_UP, G_FORE, 1);
    logJoint(ctx, "arm", sh, el, hand, { lens: [G_UP, G_FORE] });
    leg(ctx, [sh, el, hand], [5, 4.2, 3.8], col, {
      hi: front ? lighten(col, 0.18) : null,
      extra: (c) => {
        // an iron cuff at the wrist, then the fist
        const w = lerp(el, hand, 0.72);
        c.fillStyle = front ? "#6a727e" : "#4a505a"; c.beginPath(); c.arc(w[0], w[1], 2.1, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(hand[0], hand[1], 2.1, 0, TAU); c.fill();
      },
    });
  };
  // the whale's jaw: a long pale bone thickening to its end, lashed at the
  // grip and crusted with ice at the head
  const club = () => part(ctx, (c) => {
    const P = (d, o = 0) => [k.hand[0] + dir[0] * d - dir[1] * o, k.hand[1] + dir[1] * d + dir[0] * o];
    const pts = [P(-3.6), P(2), P(8, -0.5), P(13, -0.8), P(17, -0.3)];
    c.fillStyle = tone(c, ...P(0, -3), ...P(0, 3), bone, 0.25, 0.4);
    taper(c, pts, [2, 2.4, 3.2, 4.2, 4.6]);
    c.fillStyle = darken(bone, 0.3);
    for (const d of [5, 9, 13]) { const a = P(d, 1), e = P(d + 1.4, 1.2); c.fillRect(Math.min(a[0], e[0]), Math.min(a[1], e[1]), 0.6, 0.6); }
    // rawhide lashing at the grip
    c.fillStyle = "#5a3e2c"; for (const d of [-2.6, -1.2]) { const a = P(d); c.beginPath(); c.arc(a[0], a[1], 1.25, 0, TAU); c.fill(); }
    // the ice crust: shards standing off the head
    for (const [d, o, h] of [[12, -1.6, 2.8], [14.5, -2, 3.4], [17, -1.2, 2.8], [16, 1.6, 2.2], [13.2, 1.8, 1.8]]) {
      const a = P(d, o), tip = P(d + 0.6, o + Math.sign(o) * h);
      fillPoly(c, [[a[0] - 0.9, a[1]], tip, [a[0] + 0.9, a[1]]], ICE);
      fillPoly(c, [[a[0] - 0.9, a[1]], tip, [a[0], a[1] + 0.3]], ICE_LT);
    }
    c.fillStyle = ICE; const e = P(18.4); c.beginPath(); c.arc(e[0], e[1], 1.6, 0, TAU); c.fill();
  });
  const windup = fight && f % 4 === 1;
  // far leg and far arm, in shade
  gLeg(hipF, k.far, farSkin, null);
  if (!k.two) gArm(SF, fhand, farSkin, false);
  if (windup || !fight) club();          // the bone behind him (trailed, or raised behind the head)
  // near leg
  gLeg(hipN, k.near, skin, lighten(skin, 0.15));
  // the torso: a hunched barrel, the hump of the back high behind the head
  part(ctx, (c) => {
    const tor = [[-6.4, -13 + b], [5, -12.4 + b], [9.4 + L * 0.5, -16.6 + b], [11 + L, -22.4 + b], [10 + L, -28 + b], [6.4 + L, -32 + b], [0 + L, -34.6 + b], [-5.6 + L * 0.7, -33 + b], [-10 + L * 0.4, -27 + b], [-8.6 + L * 0.2, -17.6 + b]];
    c.fillStyle = tone(c, -7, -34 + b, 8, -13 + b, skin, 0.3, 0.42);
    curve(c, tor); c.fill();
    c.save(); curve(c, tor); c.clip();
    // the pale belly, the chest's shadow, scars of old fights
    c.fillStyle = mix(skin, "#dce6ee", 0.3);
    c.beginPath(); c.ellipse(5.6 + L * 0.6, -18.6 + b, 5.2, 5.8, -0.3, 0, TAU); c.fill();
    c.fillStyle = darken(skin, 0.25); c.fillRect(3 + L, -25.5 + b, 7, 0.8);
    c.restore();
    // the fur kilt, belted with a rope
    c.fillStyle = tone(c, 0, -17 + b, 0, -8 + b, kilt, 0.25, 0.4);
    curve(c, [[-7, -16.8 + b], [6.6, -16.2 + b], [7.2, -10 + b, 1], [5, -11 + b], [3.6, -9 + b, 1], [2, -10.6 + b], [0.4, -8.6 + b, 1], [-1.4, -10.4 + b], [-3, -8.8 + b, 1], [-4.4, -10.6 + b], [-6.6, -9.4 + b, 1], [-6.6, -12 + b]]); c.fill();
    c.fillStyle = "#4a3426"; c.fillRect(-7, -17 + b, 14, 1.2);
    // the fur mantle on the hump of the shoulders, rimed
    c.fillStyle = tone(c, 0, -36 + b, 0, -27 + b, fur, 0.25, 0.4);
    curve(c, [[-8.6 + L * 0.7, -30.5 + b], [-5 + L, -35 + b], [2 + L, -36 + b], [7.6 + L, -33 + b], [9.6 + L, -29.4 + b, 1], [7.4 + L, -30.2 + b], [6 + L, -28 + b, 1], [4 + L, -29.8 + b], [2 + L, -27.6 + b, 1], [0 + L, -29.6 + b], [-2 + L, -27.4 + b, 1], [-4 + L, -29.4 + b], [-6 + L * 0.6, -27 + b, 1], [-7.4 + L * 0.5, -28.8 + b], [-9.4 + L * 0.4, -26.6 + b, 1]]); c.fill();
    c.fillStyle = ICE_LT;
    for (const [x, y] of [[-3, -34], [0.4, -35], [3.6, -34.2], [-5.4, -32]]) c.fillRect(x + L, y + b, 1, 0.5);
  });
  // head: small, sunk between the shoulders, a frost-white mane and beard
  const hx = 8.8 + L * 1.05, hy = -33.6 + b;
  const head = () => part(ctx, (c) => {
    c.save(); c.translate(hx, hy); c.scale(1.2, 1.2);
    // the mane falling down the back of the neck onto the hump
    c.fillStyle = tone(c, -6, -4, 0, 4, hair, 0.2, 0.4);
    curve(c, [[-1, -3.8], [-4.6, -2.8], [-6.4, 0.6], [-5.6, 3.4, 1], [-4.4, 1.6], [-3.4, 3, 1], [-2.4, 1.2], [-1.4, 0]]); c.fill();
    // face: a heavy brow, a broad nose, a jaw like a stone
    c.fillStyle = tone(c, -3, -3.4, 3, 3, skin, 0.3, 0.38);
    curve(c, [[-2.6, 1], [-2.6, -2.2], [-0.4, -3.6], [2.2, -3], [3, -1.4], [3.8, 0.1, 1], [3.1, 0.9], [2.8, 2.4], [0, 3]]); c.fill();
    c.fillStyle = darken(skin, 0.42); poly(c, [[-0.4, -2], [3.3, -1.7], [3.2, -1], [-0.2, -1.2]]); c.fill();
    c.fillStyle = darken(skin, 0.2); poly(c, [[2.6, -1], [3.9, 0.2], [2.8, 0.7]]); c.fill();
    c.fillStyle = p.eyes || "#bfe8ff"; c.fillRect(1.1, -1, 1.3, 0.7);
    c.fillStyle = "#1e2430"; c.fillRect(2, -1, 0.4, 0.7);
    // the ear
    c.fillStyle = darken(skin, 0.15); c.beginPath(); c.ellipse(-1.4, -0.4, 0.8, 1.2, 0, 0, TAU); c.fill();
    // the beard, frost in it, down onto the chest
    c.fillStyle = tone(c, -1, 0, 3, 6, hair, 0.2, 0.38);
    curve(c, [[-1.2, 0.6], [1, 1.4], [3.2, 1], [3.4, 3], [2.6, 6.4, 1], [1.6, 4.6], [0.6, 6.2, 1], [-0.4, 3.8], [-1.4, 2.6]]); c.fill();
    c.fillStyle = darken(hair, 0.3); c.fillRect(0.4, 3.2, 0.5, 1.6); c.fillRect(1.8, 3, 0.5, 1.8);
    c.fillStyle = ICE_LT; for (const [x, y] of [[0.6, 2.4], [2.4, 3.8], [1.2, 5]]) c.fillRect(x, y, 0.6, 0.6);
    c.fillStyle = darken(skin, 0.55); c.fillRect(2, 1.3, 1.3, 0.5);    // the mouth in the beard
    c.restore();
  });
  head();
  glow(ctx, hx + 2.1, hy - 0.8, 1.5, p.eyes || "#bfe8ff", 0.4);
  // near arm (a raised arm is drawn after the head, the elbow behind its middle)
  if (fight && !windup) club();
  if (k.two) gArm(SF, fhand, farSkin, false);
  gArm(S, k.hand, skin, true);
  if (k.burst) iceBurst(ctx, k.near[0] + 1.4, 7, k.burst);
};

// ---- the ice drake ---------------------------------------------------------------
// A lesser kin of the Greenwood's dragon: light, quick, all neck and tail.
// The flap keys follow the dragon's (wing key, bob, neck and tail sway).
const DRAKE_FLY = [
  { bob: 1, wing: 0, neck: 0, tail: 1, head: 0.05 },
  { bob: -0.5, wing: 1, neck: 0.6, tail: 0, head: 0 },
  { bob: -2, wing: 2, neck: 0, tail: -1, head: -0.05 },
  { bob: -0.5, wing: 3, neck: -0.6, tail: 0, head: 0 },
];
const DRAKE_FIGHT = [
  { bob: -0.5, wing: 0, neck: -1, neckY: -0.5, tail: 0.5, head: -0.1, jaw: 0.12 },                    // rear, watching
  { bob: -1.5, wing: 3, neck: -2.6, neckY: -1.4, tail: 1, head: -0.38, jaw: 0.18, windup: true },      // draw in: the throat glows cold
  { bob: 0.5, wing: 2, neck: 2.6, neckY: 1.4, tail: -1, head: 0.26, jaw: 0.56, breath: 1 },          // the frost breath
  { bob: 0, wing: 1, neck: 1.6, neckY: 0.8, tail: -0.4, head: 0.16, jaw: 0.3, breath: 0.5 },          // trailing off
];
const DWINGS = [
  { E: [-4, -9], W: [4, -21], T: [[12, -26], [-2, -31], [-16, -28], [-28, -18]], B: [-18, 4] },
  { E: [-3, -6], W: [7, -13], T: [[19, -16], [8, -23], [-8, -24], [-24, -17]], B: [-18, 4] },
  { E: [-1, 6], W: [8, 12], T: [[18, 16], [8, 22], [-4, 22], [-16, 14]], B: [-18, 4] },
  { E: [-4, -8], W: [-1, -18], T: [[5, -24], [-7, -26], [-18, -21], [-26, -11]], B: [-18, 4] },
];
const drakeWing = (ctx, R, key, sc, mem, bone, tilt = 0) => part(ctx, (c) => {
  const P = (v) => { const r = rot(v, [0, 0], tilt); return [R[0] + r[0] * sc, R[1] + r[1] * sc]; };
  const E = P(key.E), W = P(key.W), T = key.T.map(P), B = P(key.B);
  const edge = () => {
    c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]);
    let prev = T[0];
    for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
    c.closePath();
  };
  edge(); c.fillStyle = mem; c.fill();
  c.save(); edge(); c.clip();
  c.strokeStyle = lighten(mem, 0.3); c.lineWidth = 5 * sc; c.lineJoin = "round";
  c.beginPath(); c.moveTo(...R); c.lineTo(...E); c.lineTo(...W); c.lineTo(...T[0]); c.stroke();
  c.strokeStyle = darken(mem, 0.28); c.lineWidth = 3.4 * sc;
  let prev = T[0]; c.beginPath(); c.moveTo(...prev);
  for (const n of [...T.slice(1), B]) { const cp = lerp(lerp(prev, n, 0.5), W, 0.44); c.quadraticCurveTo(cp[0], cp[1], n[0], n[1]); prev = n; }
  c.stroke();
  c.restore();
  c.fillStyle = bone; taper(c, [R, E, W], [2.6 * sc, 2 * sc, 1.7 * sc]);
  for (const t of T) taper(c, [W, t], [1.2 * sc, 0.5 * sc]);
  fillPoly(c, [[W[0] - 0.7, W[1] + 0.2], [W[0] + 0.7, W[1] - 2.4], [W[0] + 1, W[1] + 0.3]], ICE_LT);
});
const drake = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? DRAKE_FIGHT[f % 4] : DRAKE_FLY[f % 4];
  const s = (p.len ?? 40) / 40;
  const col = p.col, belly = p.belly, mem = p.wing, far = darken(col, 0.3);
  ctx.save(); ctx.scale(s, s);
  const b = q(k.bob), ns = k.neck, ny = k.neckY || 0, tw = k.tail;
  const key = DWINGS[k.wing];
  // far wing, in shade
  drakeWing(ctx, [0, -24.5 + b], key, 0.5, darken(mem, 0.3), far, -0.28);
  // legs tucked, dangling a beat behind
  const dang = -b * 0.5;
  const claws = (c, pts) => { const [fx, fy] = pts[pts.length - 1]; c.fillStyle = ICE_LT; for (let i = 0; i < 3; i++) poly(c, [[fx - 0.8 + i * 0.8, fy], [fx - 0.2 + i * 0.8, fy + 1.6], [fx + 0.3 + i * 0.8, fy]]), c.fill(); };
  const hind = (o, cl) => leg(ctx, [add(o, [-5, -17 + b]), add(o, [-8.4, -12.6 + b + dang]), add(o, [-6.4, -10.8 + b + dang])], [3.4, 2.2, 1.8], cl, { extra: claws });
  const fore = (o, cl) => leg(ctx, [add(o, [6, -17.6 + b]), add(o, [5, -14.4 + b]), add(o, [7.4, -12.4 + b + dang])], [2.8, 2, 1.6], cl, { extra: claws });
  hind([-2, -1], far); fore([-2, -1], far);
  const TL = [[-8.6, -18.8 + b], [-13.6, -17.4 + b], [-18.6, -16.4 + b + tw * 0.6], [-23.4, -17.4 + b + tw * 1.2], [-27.4, -20 + b + tw * 1.6]];
  const TW = [6.4, 4.6, 3.3, 2.1, 1.2];
  const NK = [[8, -22 + b], [11 + ns * 0.3, -25.6 + b + ny * 0.3], [13 + ns * 0.6, -28.6 + b + ny * 0.6], [15.6 + ns, -30.6 + b + ny]];
  const NW = [6.4, 4.8, 4, 3.6];
  const torso = [[9.6, -21 + b], [8.4, -16.6 + b], [4, -14.8 + b], [-3, -14.8 + b], [-8.4, -16.4 + b], [-10, -19.4 + b], [-7, -22.6 + b], [0, -24.4 + b], [6, -24.8 + b]];
  const bodyTone = (c) => tone(c, 0, -26 + b, 0, -14 + b, col, 0.3, 0.4);
  part(ctx, (c) => {
    // icicle spines down the neck, the back and the tail
    c.fillStyle = ICE;
    for (let i = 0; i < 3; i++) { const pt = lerp(NK[i], NK[i + 1], 0.5), n = normalAt(NK, i, true); spike(c, add(pt, [n[0] * 1.6, n[1] * 1.6]), n, 2.2, 0.8); }
    [[4.4, -24.6, 2.6], [1, -24.2, 3], [-2.4, -23.4, 2.8], [-5.6, -22, 2.4]].forEach(([x, y, h]) => spike(c, [x, y + b + 0.5], [0, -1], h, 1));
    for (let i = 1; i < TL.length - 1; i++) { const n = normalAt(TL, i, true); spike(c, add(TL[i], [n[0] * (TW[i] / 2 - 0.3), n[1] * (TW[i] / 2 - 0.3)]), n, 2 - i * 0.3, 0.8); }
    // tail, ending in a blade of ice
    c.fillStyle = bodyTone(c); taper(c, TL, TW);
    const e = TL[TL.length - 1], pe = TL[TL.length - 2], dl = Math.hypot(e[0] - pe[0], e[1] - pe[1]), d = [(e[0] - pe[0]) / dl, (e[1] - pe[1]) / dl], n = [-d[1], d[0]];
    const S2 = (u, v) => [e[0] + d[0] * u + n[0] * v, e[1] + d[1] * u + n[1] * v];
    fillPoly(c, [S2(-0.4, 0.6), S2(1.2, 2.2), S2(4.6, 0), S2(1.2, -2.2), S2(-0.4, -0.6)], ICE);
    fillPoly(c, [S2(-0.4, 0), S2(1.2, -2.2), S2(4.6, 0)], ICE_LT);
    // torso and neck
    c.fillStyle = bodyTone(c); curve(c, torso); c.fill();
    c.fillStyle = tone(c, 0, -33 + b, 0, -20 + b, col, 0.3, 0.4); taper(c, NK, NW);
    // the pale belly plates
    const throat = NK.map((pt, i) => { const n2 = normalAt(NK, i, false); return add(pt, [n2[0] * NW[i] * 0.24, n2[1] * NW[i] * 0.24]); });
    c.fillStyle = belly; taper(c, throat, NW.map((w) => w * 0.46));
    c.save(); curve(c, torso); c.clip();
    c.fillStyle = belly; curve(c, [[10, -18 + b], [8, -15.4 + b], [3, -14 + b], [-4, -14 + b], [-8, -16 + b], [-4, -17.2 + b], [2, -17.6 + b], [7, -19.4 + b]]); c.fill();
    c.fillStyle = darken(belly, 0.25); for (let x = -5; x <= 8; x += 2.2) c.fillRect(x, -17.6 + b, 0.5, 4);
    // frost-flecked scales on the back
    c.fillStyle = lighten(col, 0.45); for (const [x, y] of [[-6, -20.6], [-3, -22], [0.6, -22.8], [4, -22.6], [-1.4, -20.2], [2.6, -20.6]]) c.fillRect(x, y + b, 0.6, 0.5);
    c.restore();
  });
  // the head: an icicle crest swept back, a long snout, a jaw that opens
  const HB = NK[NK.length - 1], jaw = k.jaw || 0;
  const headXf = (c) => { c.translate(HB[0], HB[1]); c.rotate(k.head || 0); };
  part(ctx, (c) => {
    c.save(); headXf(c);
    c.fillStyle = ICE_DK; taper(c, [[1.6, -2.4], [-1.4, -4.6], [-4.6, -6]], [1.6, 1, 0.4]);
    const hinge = [1.2, 0.7], J = (pt) => rot(pt, hinge, jaw);
    if (jaw) fillPoly(c, [hinge, [8.6, 0.5], J([8.2, 0.8]), J([3, 1.6])], k.windup || k.breath ? "#cfeeff" : "#3a2a3e");
    c.fillStyle = tone(c, 0, 0, 0, 3, col, 0.2, 0.4);
    curve(c, [[0.8, 0.9], J([8.4, 0.7]), J([8, 1.7]), J([4.4, 2.4]), [0.4, 2.2]]); c.fill();
    if (jaw > 0.2) { c.fillStyle = ICE_LT; for (const x of [4, 6, 7.6]) { const t = J([x, 0.9]); poly(c, [[t[0] - 0.4, t[1] + 0.3], [t[0], t[1] - 1], [t[0] + 0.4, t[1] + 0.3]]); c.fill(); } }
    c.fillStyle = tone(c, 0, -4, 0, 1.5, col, 0.32, 0.4);
    curve(c, [[-1.2, -1.2], [0.4, -3.2], [3.2, -3.4, 1], [5, -2.4], [8, -1.6], [9.6, -0.6, 1], [8.8, 0.5], [4.4, 0.7], [1.6, 1.1], [-1, 1.4]]); c.fill();
    c.fillStyle = darken(col, 0.42); poly(c, [[1.8, -2.6], [5.4, -2.1], [5.2, -1.6], [2, -2]]); c.fill();
    c.fillStyle = "#1e2430"; c.fillRect(8.4, -1, 0.7, 0.5);
    c.fillStyle = p.eyes || "#e0f8ff"; c.fillRect(3, -1.9, 1.5, 0.8);
    c.fillStyle = "#1e2430"; c.fillRect(3.9, -1.9, 0.4, 0.8);
    // the near crest: three icicles swept back off the skull
    for (const [x0, y0, x1, y1, w] of [[0.6, -2.8, -4.2, -6.4, 1.8], [2, -3.2, -1.8, -7.6, 1.5], [-0.4, -1.4, -4.8, -3, 1.3]]) {
      c.fillStyle = ICE; taper(c, [[x0, y0], [x1, y1]], [w, 0.3]);
      c.fillStyle = ICE_LT; taper(c, [[x0 - 0.2, y0 - 0.2], [lerp([x0, y0], [x1, y1], 0.6)[0] - 0.2, lerp([x0, y0], [x1, y1], 0.6)[1] - 0.2]], [w * 0.4, 0.2]);
    }
    c.restore();
  });
  // near legs, then the near wing over everything
  hind([0, 0], col); fore([0, 0], col);
  drakeWing(ctx, [2, -23.5 + b], key, 0.6, mem, lighten(col, 0.1));
  // the cold in the throat, then the breath
  const HP = (pt) => { const r = rot(pt, [0, 0], k.head || 0); return [HB[0] + r[0], HB[1] + r[1]]; };
  if (k.windup) {
    glow(ctx, ...lerp(NK[1], NK[2], 0.5), 4, "#9ad8f8", 0.55);
    const m = HP([8.6, 0.8]); glow(ctx, m[0], m[1], 2.2, "#e8faff", 0.8);
  }
  if (k.breath) {
    const bk = k.breath;
    // the gust: a pale fan of mist (never inked) with a bright core of rime in it
    ctx.save(); headXf(ctx); ctx.translate(8.6, 1); ctx.rotate(0.14);
    ctx.fillStyle = `rgba(214,240,252,${0.34 * bk})`;
    curve(ctx, [[0, -0.8], [6 * bk + 3, -3.6], [12 * bk + 3, -5.6], [17 * bk + 2, -3.4], [18 * bk + 2, 1, 1], [16 * bk + 2, 4.6], [10 * bk + 3, 5], [5, 2.8], [0, 1]]); ctx.fill();
    ctx.restore();
    if (bk >= 1) part(ctx, (c) => {
      c.save(); headXf(c); c.translate(8.6, 1); c.rotate(0.14);
      c.fillStyle = tone(c, 0, -3, 0, 3, "#bfe6f8", 0.3, 0.2);
      curve(c, [[0, -0.5], [5, -1.8], [10, -2.6], [13.6, -1.2], [12, 0.6, 1], [14, 2], [9, 2.4], [4, 1.4], [0, 0.6]]); c.fill();
      c.fillStyle = ICE_LT; curve(c, [[0.4, -0.2], [4, -0.8], [8, -0.8], [6, 0.6], [3, 0.8], [0.4, 0.4]]); c.fill();
      c.restore();
    });
    // rime crystals carried on it
    ctx.save(); headXf(ctx); ctx.translate(8.6, 1); ctx.rotate(0.14);
    ctx.fillStyle = ICE_LT;
    for (const [x, y] of [[6, -3], [9, 2.6], [12, -4], [15, 0.6], [17, -2.4], [11, 4]]) if (x < 18 * bk + 1) ctx.fillRect(q(x), q(y), 1, 1);
    ctx.restore();
  }
  const eyeP = HP([3.8, -1.5]);
  glow(ctx, eyeP[0], eyeP[1], 2, p.eyes || "#e0f8ff", 0.5);
  ctx.restore();
};

// ---- the war-mammoth and the Jarl ---------------------------------------------------
// A lateral amble (each foot in turn, hind then fore on a side) on pillar legs
// with a shaggy hair skirt; a domed head, a trunk that swings, tusks that sweep
// forward and up, banded in iron. On its back a teal saddle cloth and a plank
// howdah hung with round shields; the Jarl sits in it, the howdah's near rail
// and shields drawn over his hips (so any standing figure can sit there).
// Leg roots: fore near 12, fore far 9.6, hind near -14, hind far -11.6; the
// feet are [dx from the root, lift].
const MAM_WALK = [
  { b: 0, fn: [4, 0], ff: [-3, 0], hn: [0.5, -3.2], hf: [3, 0] },
  { b: -0.5, fn: [1, 0], ff: [1.5, -3.2], hn: [4, 0], hf: [0, 0] },
  { b: 0, fn: [-3, 0], ff: [4, 0], hn: [1, 0], hf: [0.5, -3.2] },
  { b: -0.5, fn: [1.5, -3.2], ff: [1, 0], hn: [-3, 0], hf: [4, 0] },
];
const MAM_FIGHT = [
  // tusks levelled, braced, the trunk tucked
  { b: 0.5, rear: 0, head: 0.12, trunk: "tuck", fn: [5, 0], ff: [3, 0], hn: [-2, 0], hf: [0, 0] },
  // rear up and trumpet
  { b: 0, rear: -0.2, head: -0.1, trunk: "up", fn: [6, -9], ff: [4, -7], hn: [-1, 0], hf: [1, 0] },
  // forefeet down: the ice bursts
  { b: 1.5, rear: 0, head: 0.18, trunk: "down", fn: [5, 0], ff: [2, 0], hn: [-1, 0], hf: [1, 0], burst: 1 },
  // the tusk sweep
  { b: 0.8, rear: 0.03, head: -0.16, trunk: "curl", fn: [4, 0], ff: [2, 0], hn: [-1, 0], hf: [1, 0], burst: 0.5 },
];
const TRUNKS = {
  hang: (sw) => [[29, -40], [31, -32], [31.4 + sw, -24], [30.4 + sw, -16.4], [32 + sw, -12], [34 + sw, -13]],
  tuck: () => [[29, -40], [30.4, -31.6], [29.6, -24], [27.6, -18.4], [25.6, -17.6], [24.6, -19.4]],
  up: () => [[29, -42], [33.4, -47.4], [36, -54.4], [35, -60.4], [32.4, -62.6], [31, -61]],
  down: () => [[29, -40], [33, -33], [36.4, -26.4], [38.6, -19.6], [41, -17.4], [42.4, -18.6]],
  curl: () => [[29, -40], [32.6, -34], [33.4, -27], [31, -22.6], [28, -23.4], [28.6, -26.6]],
};
const MAM_LEN = 6;
const mammoth = (ctx, p) => {
  const fight = p.pose === "fight", f = p.frame || 0;
  const k = fight ? MAM_FIGHT[f % 4] : MAM_WALK[f % 4];
  const s = (p.len ?? 60) / 60;
  const col = p.col, shag = p.mane, pale = p.belly, cape = p.cape, fur = p.cloth2, iron = "#6c727e", tusk = "#ece2c6", oak = "#7a5334";
  const far = darken(col, 0.3);
  const b = k.b, rear = k.rear || 0;
  shadow(ctx, 2, 0.6 * s, 30 * s, 4 * s, 0.34);
  if (k.burst) part(ctx, (c) => frostCracks(c, (12 + k.fn[0]) * s, 12 * k.burst * s), { ink: null });
  ctx.save(); ctx.scale(s, s);
  const pivot = [-14, 0];
  const R = (pt) => rot([pt[0], pt[1] + b], pivot, rear);
  const pillar = (root, foot, colr, near) => {
    const top = R(root), ft = [root[0] + foot[0], foot[1]];
    const kn = ik(top, [ft[0], ft[1] - 1.5], 12.6, 12.6, -1);
    leg(ctx, [top, kn, [ft[0], ft[1] - 1.5]], [10.4, 8.6, 8], colr, {
      hi: near ? lighten(colr, 0.12) : null,
      extra: (c) => {
        // shaggy locks down the shin, then the broad pad and its nails
        c.fillStyle = darken(colr, 0.22);
        for (const t of [0.15, 0.45]) { const m = lerp(kn, ft, t); c.fillRect(m[0] - 2.6, m[1], 0.6, 2.4); c.fillRect(m[0] + 0.6, m[1] + 0.8, 0.6, 2.2); }
        c.fillStyle = darken(colr, 0.15); c.beginPath(); c.ellipse(ft[0] + 0.4, ft[1] - 0.6, 5, 1.6, 0, 0, TAU); c.fill();
        c.fillStyle = near ? "#d8ccb0" : "#a89c84"; for (const x of [-2.4, 0.2, 2.8]) { c.beginPath(); c.ellipse(ft[0] + x + 0.6, ft[1] - 0.9, 1, 0.7, 0, 0, TAU); c.fill(); }
      },
    });
    return ft;
  };
  // far legs, in shade, then the near legs: the coat's hanging hair falls over their tops
  pillar([-11.6, -24], k.hf, far, false);
  const ffFoot = pillar([9.6, -25], k.ff, far, false);
  pillar([-14, -24], k.hn, col, true);
  const fnFoot = pillar([12, -25], k.fn, col, true);
  // the body, the head and all that rides it turn about the hind feet when it rears
  ctx.save();
  ctx.translate(pivot[0], pivot[1]); ctx.rotate(rear); ctx.translate(-pivot[0], -pivot[1]);
  ctx.translate(0, b);
  const headPiv = [17, -44];
  const HX = (c) => { c.translate(headPiv[0], headPiv[1]); c.rotate(k.head || 0); c.translate(-headPiv[0], -headPiv[1]); };
  // far tusk, behind everything of the head
  const tuskPts = [[27, -35], [31, -28], [37, -25], [42, -28], [44.4, -34], [42.6, -38.4]];
  const tuskW = [3.6, 3.2, 2.8, 2.2, 1.5, 0.8];
  part(ctx, (c) => { c.save(); HX(c); c.translate(-2.4, -1.4); c.fillStyle = darken(tusk, 0.3); taper(c, tuskPts, tuskW); c.restore(); });
  // the long tail, a tuft at its end
  part(ctx, (c) => {
    c.strokeStyle = darken(col, 0.2); c.lineWidth = 1.6; c.lineCap = "round";
    c.beginPath(); c.moveTo(-25, -34); c.quadraticCurveTo(-29, -30, -28.4, -24 + (fight ? 0 : f % 2)); c.stroke();
    fillPoly(c, [[-29.8, -25 + (fight ? 0 : f % 2)], [-27, -25], [-28.4, -20.6]], shag);
  });
  // the body: a great hump over the shoulders falling to the rump, the
  // shaggy coat hanging in a fringe along the belly
  const body = [[20, -36], [19.4, -25], [15, -19.6], [11, -16.4, 1], [9, -18.4], [6.6, -15.4, 1], [4, -17.6], [1.4, -15, 1], [-1.6, -17.4], [-4.4, -15, 1], [-7, -17.4], [-10, -15.2, 1], [-12.6, -17.6], [-15.6, -15.8, 1], [-18, -18.6], [-23, -23], [-25.6, -31], [-23, -40], [-15, -47], [-4, -52.4], [6, -54.6], [13.4, -52.6], [18, -46]];
  part(ctx, (c) => {
    c.fillStyle = tone(c, -10, -56, 6, -16, col, 0.28, 0.42);
    curve(c, body); c.fill();
    c.save(); curve(c, body); c.clip();
    // the long dark hair of the flank and belly, in hanging locks
    c.fillStyle = shag;
    curve(c, [[22, -30], [16, -17], [-20, -17], [-26, -26], [-22, -27, 1], [-19, -24, 1], [-16, -27.4, 1], [-12.6, -24.4, 1], [-9, -27.6, 1], [-5.4, -24.6, 1], [-1.6, -27.6, 1], [2, -24.6, 1], [5.6, -27.6, 1], [9, -24.6, 1], [12.6, -27.6, 1], [16, -25, 1], [19, -29.6, 1]]); c.fill();
    c.fillStyle = darken(shag, 0.3);
    for (let x = -20; x < 18; x += 3.6) c.fillRect(x, -22, 0.6, 4.4);
    // rime on the hump: the frost-white tips of the coat
    c.fillStyle = pale;
    for (const [x, y] of [[-12, -47], [-6, -50.4], [0, -52.4], [6, -53], [11, -51.6], [-17, -43], [-21, -37], [-8.6, -48.2], [3, -51.6]]) c.fillRect(x, y, 1.4, 0.6);
    c.restore();
  });
  // the saddle cloth and its fur hem, the girth strap under the belly
  part(ctx, (c) => {
    c.fillStyle = tone(c, -12, -54, 12, -28, cape, 0.25, 0.42);
    curve(c, [[-14, -48.4, 1], [-4, -53.4], [8, -54.8], [14.4, -51.6, 1], [15, -36, 1], [-14.4, -36.6, 1]]); c.fill();
    c.fillStyle = "#e8e2d0"; for (let x = -12; x < 13; x += 3) poly(c, [[x, -42], [x + 1.5, -43.6], [x + 3, -42], [x + 1.5, -40.4]]), c.fill();
    c.fillStyle = tone(c, 0, -38, 0, -34, fur, 0.2, 0.35);
    curve(c, [[-15, -37.6], [15.6, -37], [15.4, -34, 1], [13.6, -35.2], [12, -33.4, 1], [10, -35], [8, -33.2, 1], [6, -35], [4, -33.2, 1], [2, -35], [0, -33.2, 1], [-2, -35], [-4, -33.2, 1], [-6, -35], [-8, -33.2, 1], [-10, -35], [-12, -33.2, 1], [-14, -35], [-15.4, -33.6, 1]]); c.fill();
    c.fillStyle = "#4a3426"; c.fillRect(2, -34, 2.2, 15);
  });
  // the head: domed, the ear small and flat, the eye deep in the hair
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 16, -60, 32, -34, col, 0.3, 0.42);
    curve(c, [[15.6, -51], [19, -58.6], [24.6, -59.6], [29.6, -54], [31.4, -46], [30.6, -38.6], [26.4, -33.4], [19.6, -35.4]]); c.fill();
    c.fillStyle = pale; for (const [x, y] of [[20, -58], [23.4, -59], [26.6, -57.4]]) c.fillRect(x, y, 1.4, 0.6);
    c.fillStyle = darken(col, 0.25); c.beginPath(); c.ellipse(19.6, -43.6, 2.4, 3.4, 0.2, 0, TAU); c.fill();      // the ear
    c.fillStyle = shag; poly(c, [[17, -40], [22, -38], [24, -33], [21.6, -34.6], [20.4, -31.6], [19, -34.4], [17, -33]]); c.fill();   // throat hair
    c.fillStyle = "#1e1620"; c.beginPath(); c.ellipse(25.4, -46.4, 0.9, 0.8, 0, 0, TAU); c.fill();
    c.fillStyle = darken(col, 0.4); c.fillRect(24, -48.2, 3, 0.6);
    c.restore();
  });
  // the trunk, ringed with creases
  const tr = (k.trunk ? TRUNKS[k.trunk]() : TRUNKS.hang(f % 2 ? 0.8 : -0.6));
  const trp = spline(tr, 3), trw = trp.map((_, i) => 6.4 - (i / (trp.length - 1)) * 4.2);
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 26, -60, 40, -12, col, 0.25, 0.4); taper(c, trp, trw);
    c.fillStyle = darken(col, 0.3);
    for (let i = 2; i < trp.length - 1; i += 2) { const n = normalAt(trp, i, true); const w = trw[i] * 0.42; c.fillRect(trp[i][0] - Math.abs(n[1]) * w, trp[i][1] - Math.abs(n[0]) * w, Math.max(0.5, Math.abs(n[1]) * w * 2), Math.max(0.5, Math.abs(n[0]) * w * 2)); }
    c.restore();
  });
  // the near tusk, banded in iron
  part(ctx, (c) => {
    c.save(); HX(c);
    c.fillStyle = tone(c, 26, -40, 44, -24, tusk, 0.2, 0.32); taper(c, tuskPts, tuskW);
    c.fillStyle = iron; for (const i of [1, 2]) { const [x, y] = tuskPts[i]; c.beginPath(); c.ellipse(x, y, 1.1, tuskW[i] * 0.62, 0.5 + i * 0.4, 0, TAU); c.fill(); }
    c.restore();
  });
  // the howdah: a plank box lashed on, a banner pole at its back
  const seat = [1.6, -57];
  part(ctx, (c) => {
    c.strokeStyle = darken(oak, 0.3); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-9.6, -57); c.lineTo(-9.6, -75); c.stroke();
    c.fillStyle = tone(c, -24, -76, -10, -66, cape, 0.25, 0.4);
    const fl = fight ? 0 : (f % 2) * 0.8;
    curve(c, [[-9.6, -75.4, 1], [-21, -73.4 + fl], [-24.4, -72 - fl, 1], [-21, -70.6 + fl], [-9.6, -69, 1]]); c.fill();
    c.fillStyle = "#e8e2d0"; c.fillRect(-18, -73.2 + fl * 0.5, 4, 1);
    c.fillStyle = "#d8b34a"; c.beginPath(); c.arc(-9.6, -75.6, 0.9, 0, TAU); c.fill();
    // the box's back wall and floor (the Jarl sits in front of it)
    c.fillStyle = tone(c, -10, -61, 10, -53, oak, 0.25, 0.4); c.fillRect(-10.4, -61, 20.6, 5);
    c.fillStyle = darken(oak, 0.3); for (const x of [-5, 0, 5]) c.fillRect(x, -61, 0.5, 5);
  });
  ctx.restore();
  // the Jarl, then the howdah's near rail and shields over his hips
  const sw = rot([seat[0], seat[1] + b], pivot, rear);
  jarlSeat(ctx, p, sw, fight, f, 1 / s);
  part(ctx, (c) => {
    c.save(); c.translate(pivot[0], pivot[1]); c.rotate(rear); c.translate(-pivot[0], -pivot[1]); c.translate(0, b);
    c.fillStyle = tone(c, -11, -58, 11, -51, oak, 0.28, 0.42); c.fillRect(-11, -57.4, 22.4, 5.4);
    c.fillStyle = darken(oak, 0.35); c.fillRect(-11, -55, 22.4, 0.6);
    c.fillStyle = "#4a3426"; for (const x of [-11, 10.8]) c.fillRect(x, -58.4, 1.2, 8);
    c.restore();
  });
  part(ctx, (c) => {
    c.save(); c.translate(pivot[0], pivot[1]); c.rotate(rear); c.translate(-pivot[0], -pivot[1]); c.translate(0, b);
    for (const [x, i] of [[-6.4, 0], [0.6, 1], [7.6, 2]]) {
      const cy = -54.4;
      c.fillStyle = tone(c, x - 3, cy - 3, x + 3, cy + 3, i % 2 ? "#d8d0bc" : cape, 0.25, 0.4);
      c.beginPath(); c.arc(x, cy, 3, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(x, cy, 3, 0, TAU); c.clip();
      c.fillStyle = i % 2 ? cape : "#d8d0bc"; c.fillRect(x - 3, cy - 3, 3, 3); c.fillRect(x, cy, 3, 3);
      c.restore();
      c.fillStyle = iron; c.beginPath(); c.arc(x, cy, 0.9, 0, TAU); c.fill();
    }
    c.restore();
  });
  if (k.burst) { iceBurst(ctx, fnFoot[0] + 1, 7, k.burst); iceBurst(ctx, ffFoot[0] - 2, 5, k.burst * 0.7); }
  ctx.restore();
};
// The Jarl in the howdah: his figure is rigs-rime.js's (rimeJarlRider, hips
// at the seat, drawn at his own size — `inv` undoes the mammoth's scale).
// His colours ride in the mammoth's skin / cloth / cloth2 / hair, so revive()
// reaches them; his cape, frost stones and beard keep RIME_JARL's.
const jarlSeat = (ctx, p, at, fight, f, inv) => {
  ctx.save(); ctx.translate(at[0], at[1]); ctx.scale(inv, inv);
  rimeJarlRider(ctx, { skin: p.skin, cloth: p.cloth, cloth2: p.cloth2, hair: p.hair, eyes: RIME_JARL.eyes }, fight, f % 4);
  ctx.restore();
};

// ---- the roster -----------------------------------------------------------------------
const FROSTWOLF = { len: 32, col: "#dfe5ea", belly: "#f6f3ea", mane: "#8aa6bc", eyes: "#8ad8f0" };
const RAIDER = { skin: "#e8bea0", cloth: "#2f5a58", cloth2: "#cbbfa6", hair: "#d8b860", shcol: "#d8d0bc", wcol: "#c4c8d0" };
export const RIMEBEAST_RIGS = {
  rimerider: { kind: "rbFrostwolf", fightN: 4, box: { hw: 27, up: 46, down: 4 }, p: { ...FROSTWOLF, ...RAIDER, rider: true } },
  rimewolf: { kind: "rbFrostwolf", box: { hw: 27, up: 31, down: 4 }, p: { ...FROSTWOLF } },
  icedrake: { kind: "rbDrake", fly: true, fightN: 4, box: { hw: 42, up: 44, down: 4 }, p: { len: 40, col: "#9cc2d8", belly: "#eef4f4", wing: "#7eaccc", eyes: "#e8fbff" } },
  rimejarl: { kind: "rbMammoth", fightN: 4, box: { hw: 46, up: 82, down: 6 }, p: { len: 54, col: "#6e5442", belly: "#e8eef0", mane: "#3e2e24", cape: "#2f5a58", skin: RIME_JARL.skin, cloth: RIME_JARL.cloth, cloth2: RIME_JARL.cloth2, hair: RIME_JARL.hair, wcol: RIME_JARL.wcol } },
  frostgiant: { kind: "rbGiant", fightN: 4, box: { hw: 34, up: 58, down: 4 }, p: { skin: "#7f93ab", cloth: "#5e4a3a", cloth2: "#8a7860", hair: "#e4ecf0", eyes: "#bfe8ff", wcol: "#e6dcc4" } },
};
export const RIMEBEAST_PAINTERS = { rbFrostwolf: frostwolf, rbGiant: giant, rbDrake: drake, rbMammoth: mammoth };
