// ============ HALL: THE ARCHER TOWER ============
// The first hall rebuilt in the kingdom's new carpentry. It GROWS: a timber
// watch-post at level one, a stone storey under it at two, a roofed shooting
// deck at three. The Ranger Company greens it over with a mossy hip roof;
// the Master Longbowman raises a slender slate-capped tower for one great
// archer. The finals dress it: briars and berries, a hawk's perch, a mounted
// siege bow, a dragon's skull.
//
// Anchor (t.x, t.y) is the ground under the tower. archerLayout() says how
// high the deck is and where the crew stands, and the engine reads the same
// numbers, so every arrow leaves the bow that loosed it.

import { archerLayout } from "../../engine/towers.js";
import {
  pad, timberWall, stoneBody, slit, deck, rail, battlement, hipRoof, coneRoof, roofPosts,
  pennant, vine, skirt, TIMBER, OAKWOOD, GREY_STONE,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, rad } from "../buildkit.js";
import { drawArcher, drawCrew, ARCHER_FOLK } from "../folk.js";

const ROOFS = {
  base: "#8e4d3e", a: "#4d7a3c", aa: "#3f6a36", ab: "#5a8ab0", b: "#3f5a7c", bb: "#8e2f2a",
};
const FLAGS = {
  base: "#a04a3f", a: "#5c8a44", aa: "#7cc85c", ab: "#9fc4dc", b: "#4a6a92", ba: "#c4c8d0", bb: "#d8b34a",
};

// The Ballista's siege bow, mounted on the deck.
const ballista = (ctx, x, y, dir, recoil, time) => {
  // carriage: a heavy timber frame on the deck
  cylinder(ctx, x - 7, y - 3, 14, 4, OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 });
  // stock, standing up and leaning the way it aims
  ctx.save();
  ctx.translate(x, y - 3);
  ctx.rotate(dir * 0.18);
  cylinder(ctx, -2.2, -16, 4.4, 17, darken(TIMBER, 0.1), { r: 1.6, hi: 0.3, lo: 0.5 });
  // iron bands
  for (const by of [-14, -6]) cylinder(ctx, -2.8, by, 5.6, 1.8, "#6c727e", { r: 0.8, hi: 0.4, lo: 0.4 });
  // the bow arms: two laminated limbs curving up and out
  for (const side of [-1, 1]) {
    const g = lin(ctx, 0, -14, side * 14, -24, [[0, lighten(OAKWOOD, 0.3)], [1, darken(OAKWOOD, 0.35)]]);
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(side * 2, -13);
    ctx.quadraticCurveTo(side * 9, -14, side * 13, -23);
    ctx.stroke();
  }
  // string, and the loaded bolt riding the recoil
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-13, -23); ctx.lineTo(0, -19 + recoil * 4); ctx.lineTo(13, -23); ctx.stroke();
  const bolt = lin(ctx, -1, 0, 1, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
  ctx.fillStyle = bolt;
  roundRect(ctx, -1, -30 + recoil * 4, 2, 12, 1); ctx.fill();
  ctx.fillStyle = "#c4c8d0";
  ctx.beginPath(); ctx.moveTo(-2, -29 + recoil * 4); ctx.lineTo(0, -33 + recoil * 4); ctx.lineTo(2, -29 + recoil * 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the winch wheel at the foot, turning while it cocks
  const spin = time * 2;
  ball(ctx, x + 8, y - 4, 3.2, 3.2, "#6c727e", { hi: 0.4, lo: 0.5 });
  ctx.strokeStyle = "#3a3e48";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI;
    ctx.beginPath(); ctx.moveTo(x + 8 - Math.cos(a) * 2.6, y - 4 - Math.sin(a) * 2.6); ctx.lineTo(x + 8 + Math.cos(a) * 2.6, y - 4 + Math.sin(a) * 2.6); ctx.stroke();
  }
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
    const g = lin(ctx, hx, hy, hx + side * 8, hy - flap, [[0, "#8a6a44"], [1, "#5a4028"]]);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + side * 4, hy - 2 - flap, hx + side * 8, hy - flap * 0.6); ctx.stroke();
  }
};

export const drawArcherTower = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lay = archerLayout(t);
  const { h, hw, pw, big } = lay;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const wood = !t.branch && lvl === 1;
  const deckY = y - h;
  const green = t.branch === "a";

  // ---- the ground it stands on
  pad(ctx, x, y + 6, hw + 12, t.id);
  shadow(ctx, x + 7, y + 8, hw + 9, 4.5, 0.34);

  // ---- the body
  const bodyTop = deckY + 4;
  if (wood) {
    timberWall(ctx, x, bodyTop, hw * 2, y + 8 - bodyTop);
    // a ladder up the front
    ctx.strokeStyle = darken(OAKWOOD, 0.1);
    ctx.lineWidth = 0.9;
    for (let ly = bodyTop + 4; ly < y + 6; ly += 3.2) { ctx.beginPath(); ctx.moveTo(x - 2.4, ly); ctx.lineTo(x + 2.4, ly); ctx.stroke(); }
  } else {
    stoneBody(ctx, x, bodyTop, hw * 2, y + 8 - bodyTop, GREY_STONE);
    if (h >= 32) slit(ctx, x, deckY + 13, 8, !t._idle || Math.sin(time * 1.7 + t.id) > -0.4);
    if (h >= 44) slit(ctx, x, deckY + 30, 7, true);
    // a timber hoarding under the deck at level two and up
    if (!t.branch && lvl >= 2) {
      cylinder(ctx, x - hw - 1, deckY + 5, hw * 2 + 2, 4, darken(TIMBER, 0.15), { r: 1, hi: 0.3, lo: 0.5 });
    }
  }
  skirt(ctx, x, y + 6, hw + 4, t.id);
  // the green: ivy for rangers, briars for the Briar Rangers
  if (green) {
    vine(ctx, x - hw + 1, bodyTop + 6, y - bodyTop - 2, -1, t.id, r4 === "aa" ? "#3c6a34" : "#4f8a3c", r4 === "aa" ? "#c8383a" : null);
    if (r4 === "aa") vine(ctx, x + hw - 1, bodyTop + 10, y - bodyTop - 6, 1, t.id + 3, "#3c6a34", "#c8383a");
  }

  // ---- the deck
  deck(ctx, x, deckY, pw, TIMBER, 6);
  // the rail runs along the back of the deck; the crew stands in front of it
  if (r4 !== "ba") rail(ctx, x, deckY + 1, pw - 2, OAKWOOD, big ? 4 : 5);
  else battlement(ctx, x, deckY + 1, pw - 1, GREY_STONE);

  // ---- roof, on posts, over the deck
  const roofed = (lvl >= 3 || t.branch) && r4 !== "ba";
  const eave = deckY - 24;
  if (roofed) {
    if (t.branch === "b") {
      roofPosts(ctx, x, eave - 2, deckY, pw - 4);
      coneRoof(ctx, x, eave, pw + 1, 18, ROOFS[key] || ROOFS.b);
    } else {
      roofPosts(ctx, x, eave - 2, deckY, pw - 3);
      hipRoof(ctx, x, eave, pw + 3, pw * 0.4, 12, ROOFS[key] || ROOFS.base);
      if (green) {
        // moss on the shingles
        soft(ctx, x - pw * 0.5, eave - 4, pw * 0.5, 3, [[0, "rgba(120,170,80,0.55)"], [1, "rgba(120,170,80,0)"]]);
        soft(ctx, x + pw * 0.35, eave - 7, pw * 0.35, 2.4, [[0, "rgba(120,170,80,0.45)"], [1, "rgba(120,170,80,0)"]]);
      }
      if (r4 === "ab") {
        // a perch pole above the ridge for the hawk
        cylinder(ctx, x - 0.9, eave - 26, 1.8, 15, OAKWOOD, { r: 0.8, hi: 0.3, lo: 0.5 });
        cylinder(ctx, x - 5, eave - 26.5, 10, 1.8, OAKWOOD, { r: 0.8, hi: 0.3, lo: 0.5 });
      }
    }
  }
  // the pennant, at the deck's corner or the roof's ridge
  const flagTop = roofed ? (t.branch === "b" ? eave - 20 : eave - 14) : deckY - 16;
  const flagX = roofed ? x + (t.branch === "b" ? 0 : pw * 0.4) : x + pw - 2;
  pennant(ctx, flagX, flagTop, roofed ? 8 : 15, FLAGS[key] || FLAGS.base, time, t.id, 1);

  // ---- the crew
  const recoil = t.anim > 0.4 ? 1 : 0;
  // at ease they sweep the horizon; in a fight they face what they shoot
  const dir = t._idle ? (Math.sin(time * 0.55 + t.id) >= 0 ? 1 : -1) : (Math.cos(t.lastAim) >= 0 ? 1 : -1);
  const draw = 1 - t.anim;
  if (r4 === "ba") {
    ballista(ctx, x - 2, deckY + 3, dir, recoil, time);
    drawCrew(ctx, x + pw - 5, deckY + 5, -1, ARCHER_FOLK.crew, Math.sin(time * 4 + t.id) * 0.6);
  } else {
    const pal = ARCHER_FOLK[key] || ARCHER_FOLK.base;
    const bowCol = r4 === "bb" ? "#8a2f24" : "#4a3018";
    // back row first, so nobody stands on a comrade's head
    const spots = [...lay.spots].sort((a, b) => a[1] - b[1]);
    for (const [dx, dy] of spots) drawArcher(ctx, x + dx, deckY + 3 + dy, dir, pal, draw, { big, bowCol });
    // someone has a spyglass, and the sun finds it
    if (t._idle && Math.sin(time * 1.3 + t.id * 2.7) > 0.93) glow(ctx, x + dir * (pw - 5), deckY - 12, 2.5, "#ffffff", 0.9);
    if (r4 === "bb") dragonSkull(ctx, x - pw + 4, deckY - 3);
    if (r4 === "ab") hawk(ctx, x, eave - 34, time, t.id);
  }
};
