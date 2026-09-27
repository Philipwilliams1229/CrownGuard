// ============ HALL: THE WIZARD SPIRE ============
// A round stone spire with a walk at the top where the mage stands. It
// climbs with him: an apprentice on a squat tower, a staff-bearer between
// two floating crystals, a long-beard before a crescent crest with violet
// banners at his back. Then the elements take it.
//   Pyromancer — warm stone, braziers at the corners, ember-lit windows.
//     Inferno Throne: pale gold sandstone, crimson banners, a red runner to
//       the door between two gilt fire-bowls. A gilded throne-back rises
//       behind the mage, crested with a CROWN OF FIVE FLAMES that counts
//       his shots: one flame per shot since the last firestorm (t.poolIdx
//       0..4), all five blazing when the next fireball is the firestorm,
//       which leaves with a white-gold flash.
//     Dragonbreath: sooty dark stone, a red dragon perched on the back of
//       the spire — wings spread either side, tail hung down the shaft, its
//       neck arched over the mage and its head beside him. It is a
//       flamethrower: while t.breath.on > 0 the jaws gape and glow and the
//       jet (render/flames.js) leaves from breathMouth(t), at the jaws.
//       Between breaths the jaws close and smoke curls from the nostrils.
//   Stormcaller — blue slate, a copper rod behind him, runes that hum.
//     Tempest Court: two tesla coils throwing arcs across the walk and a
//       storm cloud turning overhead.
//     Thunder Sovereign: a great gilt crown-ring raised behind him, a
//       black cloud above that strikes it.
// The mage anticipates each shot — the orb swells as the cooldown runs out
// — then drives his staff at the foe (Dragonbreath's orb follows the
// breath instead: it never fires, it points the dragon).
//
// Three baked layers per form (ground, body, front lip); lights, fire,
// lightning, runes and the mage are live.

import { getStats } from "../../engine/towers.js";
import {
  GREY_STONE, lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, footing, ashlar, archWindow, door, banner, brazier, flame, merlons, rock, posy, pennant,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { drawMage, mageTip, MAGE_FOLK } from "../folk.js";

const CACHE = new Map();
export const resetWizardBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore();
};

const STONE = { base: "#8e889a", a: "#9a7a6c", aa: "#c4a07a", ab: "#6e5c56", b: "#7a8298", ba: "#6e7a94", bb: "#72708e" };
const ORB = { base: "#b08ad8", a: "#f0903a", aa: "#ff8a2a", ab: "#f8b040", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };
const TRIM = { base: "#d8b34a", a: "#e8a040", aa: "#e8c050", ab: "#c8883a", b: "#8cc8e0", ba: "#a8e0f0", bb: "#e8c14a" };
const CLOTH = { base: "#5a4a8c", a: "#a0402e", aa: "#9a1e22", ab: "#7a2420", b: "#2e5a8a", ba: "#24507a", bb: "#4a3a80" };
// the dragon's hide (Dragonbreath)
const DRAKE = { hide: "#b0382a", dark: "#6a1e1a", belly: "#e0a848", horn: "#ecdcb8", wing: "#8a2a24" };
// things that stand on the ground before the footing (see paintBody)
const RUNE_DX = 10.5, BOWL_DX = 9, BOWL_FOOT = 4.5, BOWL_H = 5.5;

const spireH = (t) => 18 + t.level * 6 + (t.branch ? 4 : 0);
const shaftW = (t) => (t.rank4 ? 24 : t.branch ? 22 : 16 + t.level * 2);
const BOX = { left: 34, right: 34, up: 104, down: 18 };
const FRONT = { left: 20, right: 20, up: 80, down: 4 };

// Where Dragonbreath's jet leaves the hall (render/flames.js draws from
// here): the dragon's open jaws, mirrored with the facing — the same
// facing drawWizardSpire uses (cos of the aim, which follows the breath).
export const breathMouth = (t) => {
  const ang = t.breath ? t.breath.ang : t.lastAim || 0;
  return { x: t.x + (Math.cos(ang) >= 0 ? 1 : -1) * JAW.x, y: t.y - spireH(t) + JAW.y };
};

// the element a form belongs to
const elem = (t) => (t.branch === "a" ? "fire" : t.branch === "b" ? "storm" : "arcane");

// A tesla coil: a copper rod ringed with coils, a ball at the top.
const coil = (ctx, x, bottom, h) => {
  part(ctx, (c) => cylinder(c, x - 1.2, bottom - h, 2.4, h, "#b8743a", { r: 1, hi: 0.4, lo: 0.5 }));
  for (let i = 0; i < 3; i++) part(ctx, (c) => cylinder(c, x - 2.6 + i * 0.3, bottom - h * 0.35 - i * 3.2, 5.2 - i * 0.6, 1.6, "#d8a04a", { r: 0.8, hi: 0.5, lo: 0.4 }));
  part(ctx, (c) => ball(c, x, bottom - h - 1.5, 2.4, 2.4, "#c8d4e0", { hi: 0.6, lo: 0.4 }));
};

// The Inferno Throne's back: a gilded arch of radius THRONE_R whose
// centre stands THRONE_Y over the walk's lip; five gilt cups round its
// crest, west to east (the crown of flames lights them in that order).
const THRONE_R = 10, THRONE_Y = 31;
const throneCups = (x, top) => [0, 1, 2, 3, 4].map((i) => {
  const a = Math.PI + (i / 4) * Math.PI, r = THRONE_R - 0.8;
  return [x + Math.cos(a) * r, top - THRONE_Y + Math.sin(a) * r];
});

// One of the dragon's wings (side s), spread behind the walk: a bony arm
// from the shoulder to a clawed wrist, three fingers, membrane scalloped
// between them. Coordinates from the walk's lip (x, top).
const wing = (ctx, x, top, s) => {
  const P = (px, py) => [x + s * px, top + py];
  const root = P(5, -12), wrist = P(17, -35), f = [P(28, -31), P(29, -20), P(23, -11)], tail = P(11, -9);
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...root); c.lineTo(...wrist); c.lineTo(...f[0]);
    const scallop = (a, b) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; c.quadraticCurveTo(m[0] + (wrist[0] - m[0]) * 0.3, m[1] + (wrist[1] - m[1]) * 0.3, b[0], b[1]); };
    scallop(f[0], f[1]); scallop(f[1], f[2]); scallop(f[2], tail);
    c.closePath();
    c.fillStyle = lin(c, x, top - 34, x + s * 26, top - 12, [[0, lighten(DRAKE.wing, 0.3)], [0.5, DRAKE.wing], [1, darken(DRAKE.wing, 0.35)]]); c.fill();
    // the bones
    c.strokeStyle = DRAKE.dark; c.lineCap = "round";
    c.lineWidth = 1.8; c.beginPath(); c.moveTo(...root); c.lineTo(...wrist); c.stroke();
    c.lineWidth = 0.9; for (const p of f) { c.beginPath(); c.moveTo(...wrist); c.lineTo(...p); c.stroke(); }
    // the thumb-claw at the wrist
    c.fillStyle = DRAKE.horn;
    c.beginPath(); c.moveTo(wrist[0] - 1, wrist[1]); c.lineTo(wrist[0] + s * 0.5, wrist[1] - 3.2); c.lineTo(wrist[0] + s * 1.4, wrist[1] + 0.4); c.closePath(); c.fill();
  });
};

// The dragon's neck and head, facing +x, origin at the walk's lip. The
// neck rises from behind the mage's far shoulder, arches over his hat and
// brings the head out ahead of him; `open` gapes the jaws (the jet leaves
// at JAW). The head is drawn at unit size about its own origin, then set
// in place by HEAD (a shift and a scale), so JAW/EYE/NOSE come through hp().
const HEAD = { x: 7, y: -47.5, s: 1.3 };
const hp = (px, py) => ({ x: HEAD.x + px * HEAD.s, y: HEAD.y + py * HEAD.s });
const JAW = hp(13.4, 5.8), DRAKE_EYE = hp(6.2, 0), DRAKE_NOSE = hp(11.8, 1);
const DRAKE_BOX = { w: 48, h: 64, ax: 16, ay: 62 };
// the neck's spine, sampled: [x, y, radius] from its root to the head
const NECK = (() => {
  const seg = [[[-5.5, -11], [-12, -24], [-10, -44], [-3, -48.5]], [[-3, -48.5], [1.5, -51], [6, -50], [9, -45.5]]];
  const out = [];
  seg.forEach((q, si) => {
    for (let i = 0; i < 16; i++) {
      const u = i / 16, v = 1 - u;
      const px = v * v * v * q[0][0] + 3 * v * v * u * q[1][0] + 3 * v * u * u * q[2][0] + u * u * u * q[3][0];
      const py = v * v * v * q[0][1] + 3 * v * v * u * q[1][1] + 3 * v * u * u * q[2][1] + u * u * u * q[3][1];
      const k = (si * 16 + i) / 31;
      out.push([px, py, 3.6 - k * 1.2]);
    }
  });
  return out;
})();
const paintDrake = (ctx, ox, oy, open) => {
  // spines along the neck's outer side
  part(ctx, (c) => {
    c.fillStyle = DRAKE.dark;
    for (let i = 4; i < NECK.length - 3; i += 4) {
      const [px, py, r] = NECK[i], [qx, qy] = NECK[i + 1];
      const L = Math.hypot(qx - px, qy - py) || 1, tx = (qx - px) / L, ty = (qy - py) / L, nx = ty, ny = -tx;   // outward
      c.beginPath(); c.moveTo(ox + px + nx * r * 0.7 - tx * 1.2, oy + py + ny * r * 0.7 - ty * 1.2); c.lineTo(ox + px + nx * (r + 2.4), oy + py + ny * (r + 2.4)); c.lineTo(ox + px + nx * r * 0.7 + tx * 1.4, oy + py + ny * r * 0.7 + ty * 1.4); c.closePath(); c.fill();
    }
  });
  // the neck: scaled rings, gold belly-plates down its inner side
  part(ctx, (c) => {
    for (const [px, py, r] of NECK) ball(c, ox + px, oy + py, r, r, DRAKE.hide, { hi: 0.22, lo: 0.3 });
    for (let i = 1; i < NECK.length - 1; i += 2) {
      const [px, py, r] = NECK[i], [qx, qy] = NECK[i + 1];
      const L = Math.hypot(qx - px, qy - py) || 1, nx = -(qy - py) / L, ny = (qx - px) / L;     // inward
      c.fillStyle = i % 4 === 1 ? DRAKE.belly : darken(DRAKE.belly, 0.2);
      c.fillRect(ox + px + nx * (r - 1.2) - 0.8, oy + py + ny * (r - 1.2) - 0.6, 1.6, 1.2);
    }
  });
  ctx.save();
  ctx.translate(ox + HEAD.x, oy + HEAD.y); ctx.scale(HEAD.s, HEAD.s);
  drakeHead(ctx, open);
  ctx.restore();
};
// The head at unit size: origin at the back of the skull, snout to +x.
const drakeHead = (ctx, open) => {
  // the swept horns, far one first
  part(ctx, (c) => {
    c.fillStyle = darken(DRAKE.horn, 0.18);
    c.beginPath(); c.moveTo(3.4, -2); c.quadraticCurveTo(1.4, -4.8, 0.2, -7.4); c.quadraticCurveTo(3.4, -5.2, 5.4, -2.2); c.closePath(); c.fill();
  });
  part(ctx, (c) => {
    c.fillStyle = DRAKE.horn;
    c.beginPath(); c.moveTo(1.6, -1.4); c.quadraticCurveTo(-1.8, -4, -4.3, -7.5); c.quadraticCurveTo(-0.4, -5.6, 3.6, -2.4); c.closePath(); c.fill();
  });
  // the gaping mouth, lit from within
  if (open) part(ctx, (c) => {
    c.beginPath(); c.moveTo(4.7, 3.8); c.lineTo(13, 3.4); c.lineTo(12.6, 8.4); c.lineTo(4.2, 6.8); c.closePath();
    c.fillStyle = lin(c, 4, 0, 13, 0, [[0, "#6a1e1a"], [0.6, "#d8482a"], [1, "#f8a83a"]]); c.fill();
  });
  // the lower jaw
  part(ctx, (c) => {
    c.beginPath();
    if (open) { c.moveTo(3.7, 4.2); c.lineTo(12.6, 8); c.lineTo(12, 9.4); c.lineTo(4.2, 8); c.lineTo(1.7, 6.2); }
    else { c.moveTo(3.7, 4.2); c.lineTo(12.6, 3.8); c.lineTo(11.8, 5); c.lineTo(4.2, 6); c.lineTo(1.7, 5.4); }
    c.closePath();
    c.fillStyle = lin(c, 0, 4, 0, 8, [[0, DRAKE.hide], [1, darken(DRAKE.hide, 0.35)]]); c.fill();
    c.fillStyle = DRAKE.belly; c.fillRect(4.7, open ? 7.4 : 5.1, 5.5, 0.7);
    if (open) { c.fillStyle = DRAKE.horn; for (const tx of [7.2, 9.6, 11.6]) c.fillRect(tx, 6.4 + (tx - 7.2) * 0.4 - 0.9, 0.7, 0.9); }
  });
  // the skull and upper jaw
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(2.8, -2.6); c.lineTo(6.8, -1.8); c.lineTo(11.8, 0.6); c.lineTo(13.4, 2.2); c.lineTo(13, 3.6);
    c.lineTo(5.2, 4); c.lineTo(2.2, 5.4); c.lineTo(0.2, 3); c.closePath();
    c.fillStyle = lin(c, 0, -3, 0, 5, [[0, lighten(DRAKE.hide, 0.3)], [0.45, DRAKE.hide], [1, darken(DRAKE.hide, 0.4)]]); c.fill();
    // brow ridge, eye, nostril, teeth
    c.fillStyle = DRAKE.dark; c.fillRect(4.6, -1.8, 3.2, 0.8);
    c.fillStyle = "#ffe070"; c.fillRect(5.6, -0.5, 1.4, 1); c.fillStyle = "#241a26"; c.fillRect(6.5, -0.5, 0.5, 1);
    c.fillStyle = "#241a26"; c.fillRect(11.4, 0.7, 0.9, 0.7);
    c.fillStyle = DRAKE.horn; for (const tx of [6.7, 9, 11.2]) c.fillRect(tx, 3.6, 0.7, 1);
  });
};

const paintGround = (ctx, t, x, y) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, y + 7, shaftW(t) / 2 + 1, t.id, { earth: r4 === "ab" ? "#5a4234" : "#7c6242" });
  // the dragon's lair is scorched black round the foot
  if (r4 === "ab") soft(ctx, x, y + 6, 17, 7, [[0, "rgba(40,24,24,0.45)"], [0.7, "rgba(40,24,24,0.25)"], [1, "rgba(40,24,24,0)"]]);
  ctx.restore();
};

const paintBody = (ctx, t, x, y) => {
  const lvl = t.level, br = t.branch;
  const r4 = t.rank4 ? br + t.rank4 : null;
  const key = r4 || br || "base";
  const el = elem(t);
  const bodyH = spireH(t), sw = shaftW(t), hw = sw / 2;
  const top = y - bodyH;             // the walk's lip
  const base = y + 7;
  const stone = STONE[key] || STONE.base;
  const trim = TRIM[key] || TRIM.base;
  const cloth = CLOTH[key] || CLOTH.base;
  const seed = t.id * 5 + lvl;
  const pw = hw + 4;

  // ---- BACK: what rises behind the mage, above the walk
  if (lvl >= 3 || br) {
    if (!br) {
      // a crescent crest on a stone upright: the moon he studies
      part(ctx, (c) => cylinder(c, x - 2, top - 28, 4, 20, stone, { r: 1, hi: 0.35, lo: 0.5 }));
      part(ctx, (c) => {
        c.beginPath(); c.arc(x, top - 33, 7, 0.15 * Math.PI, 0.85 * Math.PI, true); c.arc(x - 1.2, top - 34.5, 5.6, 0.8 * Math.PI, 0.2 * Math.PI, false); c.closePath();
        c.fillStyle = lin(c, x - 7, 0, x + 7, 0, [[0, lighten(trim, 0.35)], [0.5, trim], [1, darken(trim, 0.4)]]); c.fill();
      });
    } else if (r4 === "aa") {
      // the throne-back: a gilded arch framing crimson velvet, a gilt cup
      // at each of five points round its crest (their crown of flames is live)
      const tr = THRONE_R, ty = top - THRONE_Y;
      part(ctx, (c) => {
        c.beginPath(); c.moveTo(x - tr, top - 6); c.lineTo(x - tr, ty); c.arc(x, ty, tr, Math.PI, 0); c.lineTo(x + tr, top - 6); c.closePath();
        c.fillStyle = lin(c, x - tr, 0, x + tr, 0, [[0, "#fff0a8"], [0.3, trim], [0.75, darken(trim, 0.25)], [1, darken(trim, 0.5)]]); c.fill();
        c.beginPath(); c.moveTo(x - tr + 2, top - 6); c.lineTo(x - tr + 2, ty); c.arc(x, ty, tr - 2, Math.PI, 0); c.lineTo(x + tr - 2, top - 6); c.closePath();
        const velvet = darken(cloth, 0.45);
        c.fillStyle = lin(c, x - tr, 0, x + tr, 0, [[0, lighten(velvet, 0.3)], [0.5, velvet], [1, darken(velvet, 0.4)]]); c.fill();
        // a gilt sunburst on the velvet, round the mage's head
        c.fillStyle = rgba(trim, 0.8);
        for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; c.fillRect(x + Math.cos(a) * (tr - 4) - 0.5, ty + Math.sin(a) * (tr - 4) - 0.5, 1, 1); }
      });
      for (const [cx, cy] of throneCups(x, top)) part(ctx, (c) => {
        c.beginPath(); c.moveTo(cx - 2.2, cy - 1.6); c.lineTo(cx + 2.2, cy - 1.6); c.quadraticCurveTo(cx + 1.8, cy + 0.6, cx, cy + 0.8); c.quadraticCurveTo(cx - 1.8, cy + 0.6, cx - 2.2, cy - 1.6); c.closePath();
        c.fillStyle = lin(c, cx - 2, 0, cx + 2, 0, [[0, "#fff0a8"], [0.5, trim], [1, darken(trim, 0.45)]]); c.fill();
        c.fillStyle = "#3a2420"; c.fillRect(cx - 1.6, cy - 2, 3.2, 0.8);
      });
    } else if (r4 === "ab") {
      // the dragon's wings, spread behind the walk (its neck and head are
      // stamped live, so they turn with the aim)
      for (const s of [-1, 1]) wing(ctx, x, top, s);
    } else if (r4 === "ba") {
      for (const s of [-1, 1]) coil(ctx, x + s * (pw - 2), top - 6, 22);
    } else if (r4 === "bb") {
      // the crown-ring on its pole
      part(ctx, (c) => cylinder(c, x - 1.2, top - 32, 2.4, 26, "#8a6a2a", { r: 1 }));
      part(ctx, (c) => {
        c.strokeStyle = lin(c, x - 10, 0, x + 10, 0, [[0, "#f8e08a"], [0.5, "#d8b34a"], [1, "#8a6a2a"]]);
        c.lineWidth = 2.2;
        c.beginPath(); c.ellipse(x, top - 34, 10, 10, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = "#d8b34a";
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const px = x + Math.cos(a) * 10, py = top - 34 + Math.sin(a) * 10;
          c.beginPath(); c.moveTo(px - Math.sin(a) * 1.4, py + Math.cos(a) * 1.4); c.lineTo(px + Math.cos(a) * 3.6, py + Math.sin(a) * 3.6); c.lineTo(px + Math.sin(a) * 1.4, py - Math.cos(a) * 1.4); c.closePath(); c.fill();
        }
      });
    } else if (el === "storm") {
      // the copper lightning rod
      part(ctx, (c) => cylinder(c, x + pw - 4, top - 34, 2, 28, "#b8743a", { r: 1, hi: 0.4, lo: 0.5 }));
      part(ctx, (c) => { ball(c, x + pw - 3, top - 35, 1.8, 1.8, "#e0e8f0", { hi: 0.6, lo: 0.4 }); c.fillStyle = "#d8a04a"; c.fillRect(x + pw - 4.5, top - 24, 3, 1); c.fillRect(x + pw - 4.5, top - 18, 3, 1); });
    }
    // the back corners: braziers for fire (gilded on the throne; the
    // dragon's wings stand there instead)
    if (el === "fire" && r4 !== "ab") for (const s of [-1, 1]) {
      part(ctx, (c) => cylinder(c, x + s * (pw - 2) - 1.6, top - 14, 3.2, 9, stone, { r: 1, hi: 0.35, lo: 0.5 }));
      brazier(ctx, x + s * (pw - 2), top - 13, r4 ? 0.9 : 0.75, r4 === "aa" ? "#b8862a" : undefined);
    }
  } else if (lvl === 2) {
    // two pedestals for the floating crystals
    for (const s of [-1, 1]) part(ctx, (c) => { cylinder(c, x + s * (pw - 2) - 1.6, top - 12, 3.2, 7, stone, { r: 1, hi: 0.35, lo: 0.5 }); c.fillStyle = trim; c.fillRect(x + s * (pw - 2) - 2, top - 12.5, 4, 1.2); });
  } else {
    // the apprentice's lectern, an open book on it
    part(ctx, (c) => { c.fillStyle = "#6a4a2e"; c.fillRect(x - pw + 3, top - 12, 1.4, 7); c.fillStyle = "#5a3f26"; c.fillRect(x - pw + 1, top - 13, 5.5, 1.5); });
    part(ctx, (c) => { c.fillStyle = "#e8e0c8"; c.fillRect(x - pw + 1, top - 15, 2.6, 2); c.fillRect(x - pw + 3.9, top - 15, 2.6, 2); });
  }

  // ---- the walk: floor seen from above, then the shaft under it
  part(ctx, (c) => {
    roundRect(c, x - pw, top - 10, pw * 2, 9, 2);
    c.fillStyle = lighten(stone, 0.15); c.fill();
    c.fillStyle = rgba(darken(stone, 0.6), 0.45);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 3, 2.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(trim, 0.7);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 5, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = lighten(stone, 0.15);
    c.beginPath(); c.ellipse(x, top - 5.5, pw - 6, 1.3, 0, 0, Math.PI * 2); c.fill();
  });
  footing(ctx, x, base, hw + 1, darken(stone, 0.05), seed, r4 ? 6 : 5);
  ashlar(ctx, x - hw, top + 3, sw, base - 5 - top - 3, stone, seed, { course: 4, block: 5.5, band: lvl >= 3 || br ? 5 : 0, moss: el === "fire" ? 0 : 0.5, cracks: r4 === "ab" });
  if (r4 === "ab") {
    // soot licked up the stone from the dragon's fires
    ((c) => {
      c.fillStyle = "rgba(30,20,22,0.35)";
      for (let k = 0; k < 4; k++) {
        const sx = x - hw + 2 + k * (sw - 4) / 3 + (hash(seed, k) - 0.5) * 2, sh = 6 + hash(seed + 3, k) * 8;
        c.beginPath(); c.moveTo(sx - 1.6, base - 5); c.quadraticCurveTo(sx - 1.2, base - 5 - sh * 0.6, sx, base - 5 - sh); c.quadraticCurveTo(sx + 1.2, base - 5 - sh * 0.6, sx + 1.6, base - 5); c.closePath(); c.fill();
      }
    })(ctx);
  }
  // the lip under the walk, in the trim colour, with a corbel ring
  part(ctx, (c) => cylinder(c, x - pw, top - 1.5, pw * 2, 4.5, darken(stone, 0.1), { r: 1.2, hi: 0.35, lo: 0.5 }));
  part(ctx, (c) => cylinder(c, x - pw + 0.5, top - 1.5, pw * 2 - 1, 1.2, trim, { r: 0.6, hi: 0.45, lo: 0.4 }));
  for (let cx = x - pw + 2; cx <= x + pw - 4; cx += 4) part(ctx, (c) => {
    c.fillStyle = lin(c, cx, 0, cx + 3, 0, [[0, lighten(stone, 0.2)], [0.5, stone], [1, darken(stone, 0.4)]]);
    c.beginPath(); c.moveTo(cx, top + 3); c.lineTo(cx + 3, top + 3); c.lineTo(cx + 2.3, top + 6); c.lineTo(cx + 0.7, top + 6); c.closePath(); c.fill();
  });

  // ---- windows and door; their light is live
  const winY = top + 8;
  archWindow(ctx, x, winY, 4, 7, lighten(stone, 0.2));
  if (bodyH >= 30) archWindow(ctx, x, winY + 12, 3.2, 5, lighten(stone, 0.2));
  door(ctx, x, base - 5, 5, 7.5, el === "storm" ? "#4a4e5e" : "#5e4128");

  // ---- cloth: violet (or the element's) banners hung from the lip
  if (lvl >= 3 || br) {
    for (const s of [-1, 1]) {
      banner(ctx, x + s * (hw - 2.5), top + 4, 4, 11, cloth, trim, (c, cx, cy) => {
        c.fillStyle = trim;
        if (el === "fire") { c.beginPath(); c.moveTo(cx - 1.2, cy + 1.5); c.quadraticCurveTo(cx - 1.5, cy - 1, cx, cy - 2.8); c.quadraticCurveTo(cx + 1.5, cy - 1, cx + 1.2, cy + 1.5); c.closePath(); c.fill(); }
        else if (el === "storm") { c.fillRect(cx, cy - 2.5, 1, 2); c.fillRect(cx - 1, cy - 0.5, 1, 1.5); c.fillRect(cx - 0.2, cy + 0.8, 1, 2); }
        else { c.fillRect(cx - 0.5, cy - 2, 1, 4); c.fillRect(cx - 2, cy - 0.5, 4, 1); }
      }, { point: r4 !== "ab" });
    }
  }
  if (r4 === "ab") {
    // the dragon's tail, hung over the lip and down the shaft's east side
    const tx0 = x + hw + 1.5;
    part(ctx, (c) => {
      c.lineCap = "round";
      const path = () => { c.beginPath(); c.moveTo(x + pw - 5, top - 3); c.bezierCurveTo(tx0 + 3.5, top - 1, tx0 + 2, top + 9, tx0, top + 14); c.quadraticCurveTo(tx0 - 1.5, top + 19, tx0 + 0.5, top + 23); };
      c.strokeStyle = DRAKE.hide; c.lineWidth = 2.6; path(); c.stroke();
      c.strokeStyle = lighten(DRAKE.hide, 0.25); c.lineWidth = 0.8; c.save(); c.translate(-0.6, 0); path(); c.stroke(); c.restore();
      // the spade at its tip
      c.fillStyle = DRAKE.dark;
      c.beginPath(); c.moveTo(tx0 + 0.5, top + 22); c.lineTo(tx0 + 2.8, top + 25); c.lineTo(tx0 + 0.6, top + 28.5); c.lineTo(tx0 - 1.6, top + 25); c.closePath(); c.fill();
      // spines down its back
      c.fillStyle = DRAKE.dark;
      for (const [sx, sy] of [[tx0 + 3.6, top + 2], [tx0 + 3.2, top + 7], [tx0 + 1.8, top + 12]]) { c.beginPath(); c.moveTo(sx - 0.6, sy - 1.2); c.lineTo(sx + 1.6, sy); c.lineTo(sx - 0.6, sy + 1.2); c.closePath(); c.fill(); }
    });
  }

  // ---- the foot
  // (everything below stands on the open ground in FRONT of the footing,
  // its foot clearly below the footing's front edge, with its own shadow)
  if (el === "storm") {
    // rune-stones set before the foot's corners; they hum live
    for (const s of [-1, 1]) {
      shadow(ctx, x + s * RUNE_DX + 0.5, base + 4.8, 2.6, 0.9, 0.4);
      rock(ctx, x + s * RUNE_DX, base + 2.4, 1.8, 2.6, "#8a90a0", seed + s);
    }
  }
  if (r4 === "aa") {
    // a crimson runner from the door, and two gilt fire-bowls on squat
    // plinths flanking it (their fire is live)
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 2.4, base - 5); c.lineTo(x + 2.4, base - 5); c.lineTo(x + 3.2, base + 5.5); c.lineTo(x - 3.2, base + 5.5); c.closePath();
      c.fillStyle = lin(c, x - 3, 0, x + 3, 0, [[0, lighten(cloth, 0.25)], [0.5, cloth], [1, darken(cloth, 0.35)]]); c.fill();
      c.fillStyle = trim; c.fillRect(x - 2.6, base - 3, 0.8, 8.5); c.fillRect(x + 1.8, base - 3, 0.8, 8.5);
    }, { ink: "under" });
    for (const s of [-1, 1]) {
      const px = x + s * BOWL_DX, py = base + BOWL_FOOT;
      shadow(ctx, px + 0.6, py, 3, 1, 0.45);
      part(ctx, (c) => cylinder(c, px - 1.8, py - BOWL_H + 1.5, 3.6, BOWL_H - 1.5, darken(stone, 0.08), { r: 1, hi: 0.35, lo: 0.5 }));
      part(ctx, (c) => {
        c.beginPath(); c.moveTo(px - 3.2, py - BOWL_H - 1.5); c.lineTo(px + 3.2, py - BOWL_H - 1.5); c.quadraticCurveTo(px + 2.6, py - BOWL_H + 1.6, px, py - BOWL_H + 1.8); c.quadraticCurveTo(px - 2.6, py - BOWL_H + 1.6, px - 3.2, py - BOWL_H - 1.5); c.closePath();
        c.fillStyle = lin(c, px - 3, 0, px + 3, 0, [[0, "#fff0a8"], [0.45, trim], [1, darken(trim, 0.45)]]); c.fill();
        c.fillStyle = "#3a2420"; c.fillRect(px - 2.6, py - BOWL_H - 2, 5.2, 0.9);
      });
    }
  }
  if (!br) posy(ctx, x - hw, base + 4, "#b08ad8", seed);
};

// The low gilt balustrade along the front of the walk.
const paintFront = (ctx, t, x, y) => {
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const bodyH = spireH(t), pw = shaftW(t) / 2 + 4, top = y - bodyH;
  const stone = STONE[key] || STONE.base, trim = TRIM[key] || TRIM.base;
  part(ctx, (c) => cylinder(c, x - pw + 0.5, top - 4.5, pw * 2 - 1, 1.6, darken(stone, 0.05), { r: 0.8, hi: 0.35, lo: 0.5 }));
  for (const s of [-1, 1]) part(ctx, (c) => {
    cylinder(c, x + s * (pw - 1.5) - 1.5, top - 6, 3, 5, stone, { r: 0.8, hi: 0.35, lo: 0.5 });
    ball(c, x + s * (pw - 1.5), top - 6.5, 1.5, 1.2, trim, { hi: 0.5, lo: 0.4 });
  });
};

export const drawWizardSpire = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  // (a dragon still breathing out its last gout is not idle, whatever the
  // foes in reach say: the jet leaves its jaws until it gutters)
  const idle = t._idle && !(t.branch === "a" && t.rank4 === "b" && t.breath && t.breath.on > 0);
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const el = elem(t);
  const bodyH = spireH(t), sw = shaftW(t), hw = sw / 2, pw = hw + 4;
  const top = y - bodyH, base = y + 7;
  const orbCol = ORB[key] || ORB.base;
  const canBake = typeof document !== "undefined";
  const form = `${lvl}|${t.branch}|${t.rank4}`, v = t.id % 3, tv = { ...t, id: v };
  const grown = lvl >= 3 || !!t.branch;

  // runes orbit the spire from level two; the back half hides behind stone
  const runes = [];
  if (lvl >= 2 || t.branch) {
    const runeCol = el === "fire" ? "#f8c070" : el === "storm" ? "#a8f0f8" : "#c8a8f0";
    for (let i = 0; i < 6; i++) {
      const ang = time * 0.9 + (i / 6) * Math.PI * 2;
      runes.push({ rx: x + Math.cos(ang) * (hw + 6), ry: y - bodyH / 2 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0, col: runeCol, i });
    }
    for (const r of runes) if (!r.front) rune(ctx, r);
  }
  if (canBake) {
    stamp(ctx, baked(`ground|${form}|${v}`, BOX.left + BOX.right, 40, (c) => paintGround(c, tv, BOX.left, 14), false), x, y, BOX.left, 14);
    stamp(ctx, baked(`spire|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBody(c, tv, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  } else paintBody(ctx, t, x, y);
  // the dragon on Dragonbreath's back: neck and head stamped live so they
  // face the aim, jaws open while it breathes
  const aimDir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const dir = idle ? (Math.sin(time * 0.5 + t.id) >= 0 ? 1 : -1) : aimDir;
  const on = r4 === "ab" && !idle && t.breath ? t.breath.on : 0;
  if (r4 === "ab") {
    const open = on > 0.15;
    if (canBake) stamp(ctx, baked(`drake|${open}`, DRAKE_BOX.w, DRAKE_BOX.h, (c) => paintDrake(c, DRAKE_BOX.ax, DRAKE_BOX.ay, open)), x, top, DRAKE_BOX.ax, DRAKE_BOX.ay, dir);
    else { ctx.save(); ctx.translate(x, top); ctx.scale(dir, 1); paintDrake(ctx, 0, 0, open); ctx.restore(); }
  }

  // ---- lights in the stone
  const winCol = el === "fire" ? "#ffa040" : el === "storm" ? "#a8e8ff" : "#ffd070";
  const breath = 0.6 + 0.25 * Math.sin(time * 1.7 + t.id);
  glow(ctx, x, top + 13, 4, winCol, breath);
  if (bodyH >= 30) glow(ctx, x, top + 23, 3, winCol, breath * 0.8);
  if (el === "storm") for (const s of [-1, 1]) {
    const on = 0.4 + 0.5 * Math.max(0, Math.sin(time * 3 + s * 1.3 + t.id));
    glow(ctx, x + s * RUNE_DX, base + 2, 3, "#8ce8f0", on);
    ctx.fillStyle = rgba("#e8fcff", on); ctx.fillRect(x + s * RUNE_DX - 0.5, base + 0.8, 1, 2.5);
  }
  // ---- fire at the corners and round the foot
  if (el === "fire" && grown && r4 !== "ab") for (const s of [-1, 1]) flame(ctx, x + s * (pw - 2), top - 19.5, r4 ? 0.9 : 0.7, time, t.id + s * 3);
  if (r4 === "aa") {
    for (const s of [-1, 1]) flame(ctx, x + s * BOWL_DX, base + BOWL_FOOT - BOWL_H - 2, 0.8, time, t.id + 7 + s * 2);
    // the crown of flames counts the shots to the firestorm: one flame lit
    // per shot since the last (t.poolIdx), all five when the next is it;
    // on the firestorm itself all five flare and die back
    const storm = !idle && (t.poolIdx || 0) === 0 && t.anim > 0.05;
    const lit = idle ? 5 : storm ? 5 : (t.poolIdx || 0) + 1;
    const ready = !idle && lit === 5;
    if (ready) glow(ctx, x, top - THRONE_Y - 4, THRONE_R + 8, "#ff9a3a", storm ? 0.25 + t.anim * 0.35 : 0.22 + 0.08 * Math.sin(time * 6));
    throneCups(x, top).forEach(([cx, cy], i) => {
      if (i < lit) flame(ctx, cx, cy - 1.8, idle ? 0.75 : storm ? 0.9 + t.anim * 0.6 : ready ? 1.1 : 0.8, time, t.id + i * 5);
      else { glow(ctx, cx, cy - 2, 2.4, "#d8482a", 0.35); ctx.fillStyle = "#d8482a"; ctx.fillRect(cx - 1, cy - 2.4, 2, 0.8); }
    });
  }

  // ---- the mage: idle between waves, gathering power as the cooldown
  // runs out, driving the staff at the foe on the shot
  const level = t.branch ? 3 : lvl;
  const pal = MAGE_FOLK[key] || MAGE_FOLK.base;
  const my = top - 7;
  const st = getStats(t);
  const rate = st.rate || 1000;
  // (Dragonbreath never fires an orb: its glow follows the breath)
  const charge = idle ? 0 : r4 === "ab" ? on : Math.max(0, Math.min(1, 1 - (t.cd || 0) / rate));
  // the Inferno Throne's fifth shot is the firestorm: its orb swells for it
  const stormNext = r4 === "aa" && !idle && (t.poolIdx || 0) === 4;
  const stormGone = r4 === "aa" && !idle && (t.poolIdx || 0) === 0 && t.anim > 0.05;
  const pose = idle ? "idle" : t.anim > 0.35 ? "cast" : "charge";
  const mcv = canBake ? baked(`mage|${key}|${level}|${pose}`, 34, 40, (c) => drawMage(c, 14, 37, 1, pal, level, { pose })) : null;
  // star-charms from level three; the back arc passes behind the mage
  const stars = [];
  if (grown && !t.noFolk) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.7 + i * 2.09 + t.id;
      stars.push({ cx: x + Math.cos(ang) * 15, cy: my - 14 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0 });
    }
  }
  const star = (s) => { ctx.fillStyle = orbCol; ctx.fillRect(s.cx - 0.5, s.cy - 2, 1.2, 4.5); ctx.fillRect(s.cx - 2.2, s.cy - 0.3, 4.5, 1.2); };
  for (const s of stars) if (!s.front) star(s);
  // level two's crystals float over their pedestals
  if (lvl === 2 && !t.branch) for (const s of [-1, 1]) {
    const cy = top - 17 + Math.sin(time * 2 + s + t.id) * 1.2, cx = x + s * (pw - 2);
    glow(ctx, cx, cy, 4, orbCol, 0.35);
    ctx.fillStyle = orbCol; ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 1.6, cy); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 1.6, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(cx - 0.6, cy - 1.5, 0.8, 1.5);
  }
  if (!t.noFolk) { if (mcv) stamp(ctx, mcv, x, my, 14, 37, dir); else drawMage(ctx, x, my, dir, pal, level, { pose }); }
  if (canBake) stamp(ctx, baked(`front|${form}`, FRONT.left + FRONT.right, FRONT.up + FRONT.down, (c) => paintFront(c, tv, FRONT.left, FRONT.up)), x, y, FRONT.left, FRONT.up);
  else paintFront(ctx, t, x, y);

  // ---- the orb at the staff tip: small at rest, swelling with the charge,
  // a flash and a ring as it flies
  const [tx, ty] = mageTip(level, pose);
  const bob = pose === "cast" ? 0 : Math.sin(time * 2.5 + t.id) * 1.2;
  const orbX = x + dir * tx, orbY = my + ty + bob - (level >= 2 ? 1 : 0);
  const rBase = level >= 3 ? 3.4 : level === 2 ? 2.8 : 2.3;
  if (!t.noFolk) {
    const rOut = r4 === "ab" ? 1.6 + on * 0.6 : (rBase * (idle ? 0.8 : 0.75 + charge * 0.45) + (t.anim > 0.4 ? 0.8 : 0)) * (stormNext || stormGone ? 1.35 : 1);
    const oc = stormNext || stormGone ? "#ffc850" : orbCol;
    glow(ctx, orbX, orbY, rOut * (2 + charge), oc, 0.3 + charge * 0.25);
    ball(ctx, orbX, orbY, rOut, rOut, oc, { hi: 0.6, lo: 0.3 });
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(orbX - rOut * 0.45, orbY - rOut * 0.5, 1, 1);
    // motes spiral in while it gathers
    if (!idle && charge > 0.45 && t.anim < 0.2) {
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + i * 2.1, d = (1 - charge) * 14 + 3;
        ctx.fillStyle = rgba(orbCol, 0.9);
        ctx.fillRect(orbX + Math.cos(a) * d - 0.5, orbY + Math.sin(a) * d * 0.7 - 0.5, 1, 1);
      }
    }
    if (t.anim > 0.05 && r4 !== "ab") {
      glow(ctx, orbX, orbY, rOut * (stormGone ? 2.2 : 1.2), "#fffaf0", t.anim);
      ctx.strokeStyle = rgba(oc, t.anim * 0.7);
      ctx.lineWidth = stormGone ? 1.8 : 1.2;
      ctx.beginPath(); ctx.arc(orbX, orbY, rOut + (1 - t.anim) * (stormGone ? 22 : 12), 0, 7); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  for (const s of stars) if (s.front) star(s);
  for (const r of runes) if (r.front) rune(ctx, r);

  // ---- storms: static round the Stormcaller, arcs between the Tempest's
  // coils, a thundercloud over the Sovereign that strikes his crown
  if (el === "storm") {
    if (!t.noFolk && (Math.sin(time * 11 + t.id) > 0.55 || t.anim > 0.5)) {
      const ang = time * 5 + t.id;
      zig(ctx, orbX + Math.cos(ang) * 4, orbY + Math.sin(ang) * 4, orbX + Math.cos(ang) * 10, orbY + Math.sin(ang) * 8 + 4, time, "#f8f0a0", 1);
    }
    if (r4 === "ba") {
      const a0 = x - pw + 2, a1 = x + pw - 2, ay = top - 29.5;
      glow(ctx, a0, ay, 4, "#a8f0f8", 0.5); glow(ctx, a1, ay, 4, "#a8f0f8", 0.5);
      if (Math.sin(time * 9 + t.id) > -0.3 || t.anim > 0.3) zig(ctx, a0, ay, a1, ay, time * 1.3, "#e8fcff", 1.2);
      cloud(ctx, x, top - 44, time, t.id, "#8a94a8", 0.9);
    }
    if (r4 === "bb") {
      cloud(ctx, x, top - 54, time, t.id, "#4a4a62", 1.2);
      const strike = ((time * 0.7 + t.id * 0.3) % 1) < 0.08 || t.anim > 0.6;
      if (strike) {
        zig(ctx, x + 2, top - 50, x, top - 44, time * 3, "#fff8c0", 1.4);
        glow(ctx, x, top - 34, 12, "#f0e070", 0.45);
      } else glow(ctx, x, top - 34, 8, "#f0e070", 0.15 + 0.1 * Math.sin(time * 3));
    }
  }
  // the dragon: a furnace glow in its jaws and eye while it breathes;
  // between breaths, smoke curls from its nostrils
  if (r4 === "ab") {
    const jx = x + dir * JAW.x, jy = top + JAW.y;
    glow(ctx, x + dir * DRAKE_EYE.x, top + DRAKE_EYE.y, 2 + on * 2, "#ffd040", 0.35 + on * 0.4);
    if (on > 0) {
      glow(ctx, jx - dir * 2, jy, 4 + on * 5, "#ff9a3a", on * 0.6);
      glow(ctx, jx, jy, 2 + on * 2, "#fff0a8", on * 0.8);
    } else for (let i = 0; i < 2; i++) {
      const t2 = (time * 5 + i * 9 + t.id * 2) % 18;
      soft(ctx, x + dir * (DRAKE_NOSE.x + t2 * 0.35) + Math.sin(time * 2 + i) * 0.8, top + DRAKE_NOSE.y - t2 * 0.9, 1 + t2 / 7, 1 + t2 / 7, [[0, `rgba(90,80,84,${Math.max(0, 0.4 - t2 * 0.022)})`], [1, "rgba(90,80,84,0)"]]);
    }
  }
  // embers up both final forms
  if (r4 === "ab" || r4 === "aa") for (let i = 0; i < 4; i++) {
    const ey = base - ((time * 24 + i * 13 + t.id * 7) % (bodyH + 30));
    const ex = x - hw - 6 + i * (sw + 12) / 3 + Math.sin(time * 3 + i) * 3;
    ctx.fillStyle = i % 2 ? "#ffd070" : "#ff8a2a";
    ctx.fillRect(ex, ey, 1, 1);
  }
  // between battles a tome hangs open by the spire, pages flicking
  if (idle && !t.noFolk && ((time / 9) + t.id * 0.37) % 1 < 0.45) {
    const ty2 = top - 22 + Math.sin(time * 1.6) * 2;
    ctx.fillStyle = "#d8ceb4";
    ctx.fillRect(x + 12, ty2, 3.5, 4.5); ctx.fillRect(x + 16, ty2, 3.5, 4.5);
    ctx.fillStyle = "#a89c7c";
    ctx.fillRect(x + 15.4 + (Math.sin(time * 7) > 0.6 ? 0.6 : 0), ty2, 0.8, 4.5);
  }
};

// A glowing rune: a little lit glyph, three strokes.
const rune = (ctx, r) => {
  ctx.fillStyle = rgba(r.col, r.front ? 0.95 : 0.5);
  ctx.fillRect(r.rx - 0.5, r.ry - 1.5, 1, 3);
  ctx.fillRect(r.rx - 1.5, r.ry - (r.i % 2 ? 1.5 : -0.5), 2, 1);
};

// A jagged bolt between two points, re-kinked a few times a second.
const zig = (ctx, x0, y0, x1, y1, time, col, w) => {
  const k = Math.floor(time * 14);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i < 5; i++) {
    const f = i / 5;
    ctx.lineTo(x0 + (x1 - x0) * f + (hash(k, i) - 0.5) * 4, y0 + (y1 - y0) * f + (hash(k, i + 9) - 0.5) * 4);
  }
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.lineWidth = 1;
};

// A little storm cloud, lumps turning slowly.
const cloud = (ctx, x, y, time, id, col, s = 1) => {
  for (let i = 0; i < 5; i++) {
    const a = time * 0.6 + i * 1.26 + id;
    ball(ctx, x + Math.cos(a) * 6 * s, y + Math.sin(a) * 1.6 * s, (4 + (i % 2)) * s, 3 * s, col, { hi: 0.3, lo: 0.4 });
  }
  ball(ctx, x, y - 1, 5 * s, 3.4 * s, lighten(col, 0.1), { hi: 0.35, lo: 0.35 });
};
