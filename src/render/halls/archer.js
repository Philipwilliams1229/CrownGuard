// ============ HALL: THE ARCHER TOWER ============
// The first hall rebuilt in the kingdom's new carpentry. It GROWS: a timber
// watch-post at level one, a stone storey under it at two, a roofed shooting
// deck at three. The Ranger Company greens it over with a mossy hip roof;
// the Master Longbowman raises a slender slate-capped tower for one great
// archer. The finals dress it: briars and berries, a hawk's perch, a mounted
// siege bow, a dragon's skull.
//
// Pixel art: the stone and timber of each form is baked once into an inked
// sprite; the crew, the pennant, the torchlight and the hawk are stamped or
// painted live over it. archerLayout() says how high the deck is and where
// the crew stands, and the engine reads the same numbers, so every arrow
// leaves the bow that loosed it.

import { archerLayout } from "../../engine/towers.js";
import {
  pad, timberWall, stoneBody, slit, deck, rail, battlement,
  pennant, vine, skirt, TIMBER, OAKWOOD, GREY_STONE,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { drawArcher, drawCrew, ARCHER_FOLK } from "../folk.js";

const ROOFS = {
  base: "#8e4d3e", a: "#4d7a3c", aa: "#3f6a36", ab: "#5a8ab0", b: "#3f5a7c", bb: "#8e2f2a",
};
const FLAGS = {
  base: "#a04a3f", a: "#5c8a44", aa: "#7cc85c", ab: "#9fc4dc", b: "#4a6a92", ba: "#c4c8d0", bb: "#d8b34a",
};

// ---- sprites ---------------------------------------------------------
const CACHE = new Map();
export const resetArcherBakes = () => CACHE.clear();
const baked = (key, w, h, draw) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw); CACHE.set(key, sp); }
  return sp;
};
// stamp a baked sprite anchored at (ax, ay) inside it, facing `dir`
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.drawImage(cv, -ax, -ay, w, h);
  ctx.restore();
};

// The Ballista's siege bow, mounted on the deck.
export const ballista = (ctx, x, y, dir, recoil) => {
  cylinder(ctx, x - 7, y - 3, 14, 4, OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 });
  ctx.save();
  ctx.translate(x, y - 3);
  ctx.rotate(dir * 0.18);
  cylinder(ctx, -2.2, -16, 4.4, 17, darken(TIMBER, 0.1), { r: 1.6, hi: 0.3, lo: 0.5 });
  for (const by of [-14, -6]) cylinder(ctx, -2.8, by, 5.6, 1.8, "#6c727e", { r: 0.8, hi: 0.4, lo: 0.4 });
  for (const side of [-1, 1]) {
    ctx.strokeStyle = lin(ctx, 0, -14, side * 14, -24, [[0, lighten(OAKWOOD, 0.3)], [1, darken(OAKWOOD, 0.35)]]);
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 2, -13);
    ctx.quadraticCurveTo(side * 9, -14, side * 13, -23);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-13, -23); ctx.lineTo(0, -19 + recoil * 4); ctx.lineTo(13, -23); ctx.stroke();
  ctx.fillStyle = lin(ctx, -1, 0, 1, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
  roundRect(ctx, -1, -30 + recoil * 4, 2, 12, 1); ctx.fill();
  ctx.fillStyle = "#c4c8d0";
  ctx.beginPath(); ctx.moveTo(-2, -29 + recoil * 4); ctx.lineTo(0, -33 + recoil * 4); ctx.lineTo(2, -29 + recoil * 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ball(ctx, x + 8, y - 4, 3.2, 3.2, "#6c727e", { hi: 0.4, lo: 0.5 });
};

// A bleached dragon skull, mounted as a trophy.
const dragonSkull = (ctx, x, y) => {
  ball(ctx, x, y, 5, 3.8, "#e8dfc6", { hi: 0.4, lo: 0.4 });
  ball(ctx, x + 3.5, y + 1.2, 3, 2.2, "#e8dfc6", { hi: 0.4, lo: 0.4 });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(x - 1.2, y - 0.6, 1.3, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 2.2, y - 0.4, 1.1, 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d6ccb0";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - 3.5, y - 2.5); ctx.quadraticCurveTo(x - 6, y - 6, x - 4.5, y - 8.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 1.5, y - 3); ctx.quadraticCurveTo(x + 3, y - 6.5, x + 1.5, y - 8.5); ctx.stroke();
};

// A hawk on the wing, wheeling over the tower.
const hawk = (ctx, x, y, time, id) => {
  const ang = time * 1.6 + id;
  const hx = x + Math.cos(ang) * 20, hy = y + Math.sin(ang) * 6;
  const flap = Math.sin(time * 9 + id) * 2.5;
  const face = Math.cos(ang + Math.PI / 2) >= 0 ? 1 : -1;
  shadow(ctx, hx + 6, y + 36, 5, 1.6, 0.18);
  ball(ctx, hx, hy, 2.6, 1.6, "#7a5a3a", { hi: 0.45, lo: 0.4 });
  ball(ctx, hx + face * 2.4, hy - 0.4, 1.3, 1.1, "#e8dfc6", { hi: 0.4, lo: 0.3 });
  for (const side of [-1, 1]) {
    ctx.strokeStyle = lin(ctx, hx, hy, hx + side * 8, hy - flap, [[0, "#8a6a44"], [1, "#5a4028"]]);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + side * 4, hy - 2 - flap, hx + side * 8, hy - flap * 0.6); ctx.stroke();
  }
};

// ---- the still stone and timber of one form ---------------------------
// Painted with the ground anchor at (x, y).
const paintBody = (ctx, t, x, y) => {
  const lay = archerLayout(t);
  const { h, hw, pw, big } = lay;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const wood = !t.branch && lvl === 1;
  const deckY = y - h;
  const green = t.branch === "a";
  const seed = t.id;

  pad(ctx, x, y + 6, hw + 12, seed);
  shadow(ctx, x + 7, y + 8, hw + 9, 4.5, 0.34);
  const bodyTop = deckY + 4;
  if (wood) {
    timberWall(ctx, x, bodyTop, hw * 2, y + 8 - bodyTop);
    ctx.strokeStyle = darken(OAKWOOD, 0.1);
    ctx.lineWidth = 0.9;
    for (let ly = bodyTop + 4; ly < y + 6; ly += 3.2) { ctx.beginPath(); ctx.moveTo(x - 2.4, ly); ctx.lineTo(x + 2.4, ly); ctx.stroke(); }
  } else {
    stoneBody(ctx, x, bodyTop, hw * 2, y + 8 - bodyTop, GREY_STONE);
    if (h >= 32) slit(ctx, x, deckY + 13, 8, false);
    if (h >= 44) slit(ctx, x, deckY + 30, 7, false);
    if (!t.branch && lvl >= 2) cylinder(ctx, x - hw - 1, deckY + 5, hw * 2 + 2, 4, darken(TIMBER, 0.15), { r: 1, hi: 0.3, lo: 0.5 });
  }
  skirt(ctx, x, y + 6, hw + 4, seed);
  if (green) {
    vine(ctx, x - hw + 1, bodyTop + 6, y - bodyTop - 2, -1, seed, r4 === "aa" ? "#3c6a34" : "#4f8a3c", r4 === "aa" ? "#c8383a" : null);
    if (r4 === "aa") vine(ctx, x + hw - 1, bodyTop + 10, y - bodyTop - 6, 1, seed + 3, "#3c6a34", "#c8383a");
  }
  // what stands at the BACK of the deck, behind the crew: the level-three
  // read, without ever roofing the archers in
  const grown = lvl >= 3 || !!t.branch;
  if (grown && t.branch === "a") {
    // rangers: a lean-to awning at the back, sloping up and away, mossed over
    const roof = ROOFS[key] || ROOFS.a;
    part(ctx, (c) => {
      c.beginPath();
      c.moveTo(x - pw + 1, deckY - 9);
      c.lineTo(x - pw + 3, deckY - 24);
      c.lineTo(x + pw - 3, deckY - 24);
      c.lineTo(x + pw - 1, deckY - 9);
      c.closePath();
      c.fillStyle = lin(c, x - pw, deckY - 24, x + pw * 0.6, deckY - 9, [[0, lighten(roof, 0.35)], [0.45, roof], [1, darken(roof, 0.4)]]);
      c.fill();
      c.fillStyle = rgba(darken(roof, 0.5), 0.25);
      for (let ry = deckY - 12; ry > deckY - 24; ry -= 3) c.fillRect(x - pw + 2, ry, pw * 2 - 4, 0.9);
    });
    for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * (pw - 3) - 1.2, deckY - 24, 2.4, 25, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
    soft(ctx, x - pw * 0.4, deckY - 20, pw * 0.4, 2.5, [[0, "rgba(120,170,80,0.55)"], [1, "rgba(120,170,80,0)"]]);
    if (r4 === "ab") part(ctx, (c) => { cylinder(c, x - 0.9, deckY - 40, 1.8, 17, OAKWOOD, { r: 0.8 }); cylinder(c, x - 5, deckY - 40.5, 10, 1.8, OAKWOOD, { r: 0.8 }); });
  } else if (grown && t.branch === "b") {
    // the master's tower: two slender pinnacles at the back corners
    for (const sgn of [-1, 1]) {
      const px = x + sgn * (pw - 3);
      part(ctx, (c) => cylinder(c, px - 2, deckY - 18, 4, 19, GREY_STONE, { r: 1.2, hi: 0.32, lo: 0.45 }));
      part(ctx, (c) => cone(c, px, deckY - 27, 3.4, 9, ROOFS[key] || ROOFS.b, { scallops: 2, sag: 1, hi: 0.4, lo: 0.5 }));
    }
  } else if (grown) {
    // the finished tower: a crenellated back parapet
    battlement(ctx, x, deckY - 1, pw - 2, GREY_STONE, 6);
  }
  deck(ctx, x, deckY, pw, TIMBER, 6);
  if (r4 !== "ba") rail(ctx, x, deckY + 1, pw - 2, OAKWOOD, big ? 4 : 5);
  else battlement(ctx, x, deckY + 1, pw - 1, GREY_STONE);
  if (r4 === "bb") dragonSkull(ctx, x - pw + 4, deckY - 3);
};

// The sprite box around the anchor: how far the art reaches each way.
const BOX = { left: 36, right: 36, up: 126, down: 16 };

export const drawArcherTower = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lay = archerLayout(t);
  const { h, pw, big } = lay;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const deckY = y - h;

  // ---- the still part, baked; the crew stands in front of it
  const canBake = typeof document !== "undefined";
  if (canBake) {
    const cv = baked(`lower|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBody(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up));
    stamp(ctx, cv, x, y, BOX.left, BOX.up);
  } else paintBody(ctx, t, x, y);

  // ---- torchlight in the slits
  if (!(lvl === 1 && !t.branch)) {
    if (h >= 32 && (!t._idle || Math.sin(time * 1.7 + t.id) > -0.4)) glow(ctx, x, deckY + 17, 3.2, "#ffd070", 0.75);
    if (h >= 44) glow(ctx, x, deckY + 33.5, 3.2, "#ffd070", 0.75);
  }
  // ---- the crew, from baked frames
  const recoil = t.anim > 0.4 ? 1 : 0;
  const dir = t._idle ? (Math.sin(time * 0.55 + t.id) >= 0 ? 1 : -1) : (Math.cos(t.lastAim) >= 0 ? 1 : -1);
  const draw = 1 - t.anim;
  if (r4 === "ba") {
    const bcv = baked(`ballista|${recoil}`, 40, 44, (c) => ballista(c, 18, 40, 1, recoil));
    stamp(ctx, bcv, x - 2, deckY + 3, 18, 40, dir);
    // the winch's spokes turn while it cocks
    const spin = time * 2, wx = x - 2 + dir * 8, wy = deckY - 1;
    ctx.strokeStyle = "#3a3e48";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * Math.PI;
      ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 2.6, wy - Math.sin(a) * 2.6); ctx.lineTo(wx + Math.cos(a) * 2.6, wy + Math.sin(a) * 2.6); ctx.stroke();
    }
    const work = Math.round((Math.sin(time * 4 + t.id) + 1) * 1.5);   // 0..3
    const ccv = baked(`crew|${work}`, 28, 30, (c) => drawCrew(c, 12, 27, 1, ARCHER_FOLK.crew, (work - 1.5) * 0.4));
    stamp(ctx, ccv, x + pw - 5, deckY + 5, 12, 27, -1);
  } else {
    const pal = ARCHER_FOLK[key] || ARCHER_FOLK.base;
    const bowCol = r4 === "bb" ? "#8a2f24" : "#4a3018";
    const step = Math.round(draw * 3);                                   // four frames of the draw
    const fcv = baked(`archer|${key}|${big ? 1 : 0}|${step}`, 34, 32, (c) => drawArcher(c, 12, 29, 1, pal, step / 3, { big, bowCol }));
    const spots = [...lay.spots].sort((a, b) => a[1] - b[1]);
    for (const [dx, dy] of spots) stamp(ctx, fcv, x + dx, deckY + 3 + dy, 12, 29, dir);
    if (t._idle && Math.sin(time * 1.3 + t.id * 2.7) > 0.93) glow(ctx, x + dir * (pw - 5), deckY - 12, 2.5, "#ffffff", 0.9);
  }
  // ---- the standard, flying from the back corner of the deck
  const grown = lvl >= 3 || !!t.branch;
  pennant(ctx, x + pw - 2, deckY - (grown ? 30 : 16), grown ? 29 : 15, FLAGS[key] || FLAGS.base, time, t.id, 1);
  if (r4 === "ab") hawk(ctx, x, deckY - 48, time, t.id);
};
