// ============ HALL: THE FALCONRY ============
// The falcon-mistress on a high roost with her gauntlet up and her birds
// wheeling round her — the back of the orbit behind her, the front before.
// Before a strike the bird comes down to her glove; on the strike it is
// gone. It GROWS: a timber perch-scaffold at one, a round stone roost with a
// crenellated rim at two, a taller roost with a hooded bird on a T-perch
// mast at three.
//   The Royal Aviary hangs a gilded birdcage off a gallows arm: the
// Skyknight tears the rim out for a great nest of branches and stands empty
// while she rides the war-eagle; the Storm Falcons raise a lightning rod
// that crackles. The Warhawk Court dresses the roost in purple banners and
// a gilt rim: Kingsight crowns a spire with a golden hawk whose eye never
// closes; Talon Rain flies three birds and spikes the rim with iron talons.
//
// Pixel art: the roost is baked per form; birds, the mistress, sparks and
// the eye are stamped or painted live.

import { stoneBody, battlement, GREY_STONE, OAKWOOD, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, ROPE, readiness, foot, padB, skirtB, beam, planks, rope, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import { drawMistress, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetFalconryBakes = () => cache.clear();
const BOX = { left: 36, right: 36, up: 84, down: 18 };
const PURPLE = "#5a4a8c", STORM = "#7a8494";

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  return { lvl, r4, aviary: t.branch === "a", court: t.branch === "b", nest: r4 === "aa", h: lvl === 1 ? 22 : lvl === 2 ? 28 : t.branch ? 34 : 32 };
};
const roostH = (t) => spec(t).h;

const paintRoost = (ctx, t, x, y) => {
  const { lvl, r4, aviary, court, nest, h } = spec(t);
  const stone = r4 === "ab" ? STORM : GREY_STONE;
  padB(ctx, x, y, t.id, { hw: 12 });
  // ---- behind the roost
  if (lvl >= 3 && !t.branch) {
    // the T-perch mast, a hooded bird asleep on it
    beam(ctx, x + 12, y - 2, x + 12, y - h - 18, 2, OAKWOOD, { bands: [0.5] });
    beam(ctx, x + 8, y - h - 17, x + 16, y - h - 17, 1.6, OAKWOOD, { grain: false });
    part(ctx, (c) => { ball(c, x + 14, y - h - 20, 2.2, 2.8, "#7a5a3a", { hi: 0.45, lo: 0.4 }); ball(c, x + 14.6, y - h - 23, 1.5, 1.4, "#8a2f2a", { hi: 0.4, lo: 0.4 }); c.fillStyle = GOLD; c.fillRect(x + 14.2, y - h - 25, 0.8, 1.2); });
  }
  if (r4 === "ab") {
    // the lightning rod, guyed to the rim
    beam(ctx, x - 9, y - h + 2, x - 9, y - h - 32, 1.6, "#6a6a74", { bands: [0.35, 0.7] });
    part(ctx, (c) => { c.fillStyle = "#b08a4a"; c.beginPath(); c.moveTo(x - 10, y - h - 32); c.lineTo(x - 9, y - h - 38); c.lineTo(x - 8, y - h - 32); c.closePath(); c.fill(); });
    part(ctx, (c) => { c.fillStyle = "#b08a4a"; c.fillRect(x - 12, y - h - 24, 6, 1); c.fillRect(x - 11, y - h - 26, 4, 1); });
  }
  if (r4 === "ba") {
    // the spire and its golden hawk
    part(ctx, (c) => cylinder(c, x - 14, y - h - 20, 5, 22, stone, { r: 1.2, hi: 0.32, lo: 0.45 }));
    part(ctx, (c) => {
      const hx = x - 11.5, hy = y - h - 26;
      c.beginPath(); c.moveTo(hx - 4, hy + 6); c.quadraticCurveTo(hx - 4, hy - 3, hx + 1, hy - 4); c.quadraticCurveTo(hx + 5, hy - 3, hx + 6.5, hy); c.lineTo(hx + 3, hy + 1); c.quadraticCurveTo(hx + 3, hy + 5, hx + 2.5, hy + 6); c.closePath();
      c.fillStyle = lin(c, hx - 4, hy - 4, hx + 6, hy + 6, [[0, "#f8e08a"], [0.5, GOLD], [1, "#8a6a2a"]]); c.fill();
      c.fillStyle = "#8a6a2a"; c.fillRect(hx + 4, hy - 0.4, 2.4, 1);
    });
  }
  // ---- the roost itself: timber scaffold at one, stone after
  if (lvl === 1) {
    for (const sgn of [-1, 1]) beam(ctx, x + sgn * 9, y + 2, x + sgn * 7, y - h, 2.6, OAKWOOD, { bands: [0.5] });
    beam(ctx, x - 8.5, y - 3, x + 7.5, y - h + 4, 1.6, darken(OAKWOOD, 0.1), { grain: false });
    beam(ctx, x + 8.5, y - 3, x - 7.5, y - h + 4, 1.6, darken(OAKWOOD, 0.15), { grain: false });
    for (const sgn of [-1, 1]) foot(ctx, x + sgn * 9 + 0.5, y + 2.5, 2.4);
    // the ladder up the front
    beam(ctx, x - 2.4, y + 3, x - 2.4, y - h + 2, 1, OAKWOOD, { grain: false });
    beam(ctx, x + 2.4, y + 3, x + 2.4, y - h + 2, 1, OAKWOOD, { grain: false });
    part(ctx, (c) => { c.fillStyle = lighten(OAKWOOD, 0.2); for (let yy = y; yy > y - h + 3; yy -= 3.4) c.fillRect(x - 2.4, yy, 4.8, 0.8); });
    planks(ctx, x - 11, y - h - 1, 22, 4, "#9a6e42", 3.6, 2);
  } else {
    const w = lvl >= 3 ? 23 : 21;
    stoneBody(ctx, x, y - h, w, h + 8, stone);
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, x - 1.6, y - h + 11, 3.2, 7, 1.2); c.fill(); });
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, x - 1.6, y - 4, 3.4, 7, 1.6); c.fill(); c.fillStyle = OAKWOOD; c.fillRect(x - 1.2, y - 3.2, 2.6, 6.2); });   // the door
    if (court) {
      // hanging banners down the face, a gold hawk on each
      for (const dx of [-7, 5]) part(ctx, (c) => {
        c.beginPath(); c.moveTo(dx + x - 2.4, y - h + 5); c.lineTo(dx + x + 2.4, y - h + 5); c.lineTo(dx + x + 2.4, y - h + 17); c.lineTo(dx + x, y - h + 15); c.lineTo(dx + x - 2.4, y - h + 17); c.closePath();
        c.fillStyle = lin(c, dx + x - 2.4, 0, dx + x + 2.4, 0, [[0, lighten(r4 === "bb" ? "#7a2a4a" : PURPLE, 0.25)], [1, darken(r4 === "bb" ? "#7a2a4a" : PURPLE, 0.3)]]); c.fill();
        c.fillStyle = GOLD; c.fillRect(dx + x - 1.2, y - h + 9, 2.4, 1); c.fillRect(dx + x - 0.4, y - h + 8, 0.8, 3);
      });
    }
  }
  // ---- the rim: battlements, a gilt band, the nest, iron talons
  if (nest) {
    part(ctx, (c) => {
      c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.6; c.lineCap = "round";
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.2; const r1 = 15 + (i % 3) * 2.4; c.beginPath(); c.moveTo(x + Math.cos(a) * 7, y - h - 2 + Math.sin(a) * 2.6); c.lineTo(x + Math.cos(a) * r1, y - h - 5 + Math.sin(a) * 5); c.stroke(); }
      ball(c, x, y - h - 3, 13, 4.6, "#8a6a3a", { hi: 0.4, lo: 0.45 });
      c.strokeStyle = rgba("#4a3018", 0.6); c.lineWidth = 0.7;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x - 11 + i * 5, y - h - 1); c.lineTo(x - 8 + i * 5, y - h - 5); c.stroke(); }
      ball(c, x, y - h - 4.4, 8.4, 2.6, "#d8c8a0", { hi: 0.3, lo: 0.3 });
    });
    part(ctx, (c) => { ball(c, x + 3, y - h - 6.6, 2.6, 3.2, "#e8e0cc", { hi: 0.5, lo: 0.35 }); c.fillStyle = "#a89a7a"; c.fillRect(x + 2, y - h - 8, 0.8, 0.8); c.fillRect(x + 3.6, y - h - 6, 0.8, 0.8); });   // the egg
    // the empty saddle on its rack, and the lance
    beam(ctx, x - 14, y - h + 2, x - 14, y - h - 8, 1.4, OAKWOOD, { grain: false });
    part(ctx, (c) => { c.beginPath(); c.moveTo(x - 18, y - h - 8); c.quadraticCurveTo(x - 14, y - h - 11, x - 10, y - h - 8); c.lineTo(x - 11, y - h - 5.5); c.lineTo(x - 17, y - h - 5.5); c.closePath(); c.fillStyle = lin(c, x - 18, 0, x - 10, 0, [[0, "#b06a3a"], [1, "#6a3a1e"]]); c.fill(); c.fillStyle = GOLD; c.fillRect(x - 16, y - h - 7, 4, 0.8); });
    beam(ctx, x + 13, y - h + 4, x + 17, y - h - 26, 1.3, OAKWOOD, { grain: false });
    part(ctx, (c) => { c.fillStyle = STEEL; c.beginPath(); c.moveTo(x + 16.4, y - h - 26); c.lineTo(x + 17.8, y - h - 31); c.lineTo(x + 18.2, y - h - 25.6); c.closePath(); c.fill(); });
  } else if (lvl === 1) {
    // a plank rail round the platform
    for (const dx of [-10, 10]) beam(ctx, x + dx, y - h, x + dx, y - h - 5, 1.2, OAKWOOD, { grain: false });
    beam(ctx, x - 10.5, y - h - 4.6, x + 10.5, y - h - 4.6, 1.1, OAKWOOD, { grain: false });
  } else {
    battlement(ctx, x, y - h - 1, lvl >= 3 ? 13 : 12, stone, 6);
    if (court) part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(x - 12, y - h + 1.6, 24, 1); });
    if (r4 === "bb") for (const dx of [-11, -5, 1, 7]) part(ctx, (c) => { c.fillStyle = "#4a4e58"; c.beginPath(); c.moveTo(dx + x + 0.6, y - h - 5); c.quadraticCurveTo(dx + x + 3, y - h - 9, dx + x + 1, y - h - 11); c.lineTo(dx + x + 2.6, y - h - 5); c.closePath(); c.fill(); });
    // a perch pole off the rim
    if (!aviary && r4 !== "ba") beam(ctx, x + 13, y - h - 1, x + 16, y - h - 9, 1.2, "#6a4a2e", { grain: false });
  }
  if (aviary && !nest) {
    // the gallows arm and the gilded birdcage
    beam(ctx, x + 11, y - h + 6, x + 11, y - h - 12, 1.8, OAKWOOD, { grain: false });
    beam(ctx, x + 10, y - h - 11, x + 20, y - h - 11, 1.6, OAKWOOD, { grain: false });
    beam(ctx, x + 11, y - h - 5, x + 16, y - h - 11, 1.2, OAKWOOD, { grain: false });
    rope(ctx, x + 18.5, y - h - 11, x + 18.5, y - h - 7, 0, ROPE, 0.6);
    part(ctx, (c) => {
      const cx = x + 18.5, top = y - h - 7;
      c.fillStyle = rgba("#2a2430", 0.35); c.beginPath(); c.moveTo(cx - 4, top + 11); c.lineTo(cx - 4, top + 4); c.quadraticCurveTo(cx - 4, top, cx, top); c.quadraticCurveTo(cx + 4, top, cx + 4, top + 4); c.lineTo(cx + 4, top + 11); c.closePath(); c.fill();
      c.fillStyle = GOLD;
      for (const dx of [-4, -2, 0, 2, 4]) c.fillRect(cx + dx - 0.35, top + (Math.abs(dx) === 4 ? 4 : Math.abs(dx) === 2 ? 1 : 0), 0.7, 11 - (Math.abs(dx) === 4 ? 4 : Math.abs(dx) === 2 ? 1 : 0));
      c.fillRect(cx - 4.4, top + 10.4, 8.8, 1.2); c.fillRect(cx - 4, top + 5, 8, 0.7);
      ball(c, cx - 0.5, top + 8, 1.8, 1.4, "#8a6a4a", { hi: 0.4, lo: 0.4 }); c.fillStyle = "#e8dfc6"; c.fillRect(cx + 0.6, top + 6.8, 1.2, 1);
    });
  }
  skirtB(ctx, x, y, t.id);
};

// One bird, wings up, level or down.
const paintBird = (ctx, cx, cy, wing, kind) => {
  const body = kind === "king" ? "#e8dfc6" : kind === "storm" ? "#6a7488" : "#7a5a3a";
  const wcol = kind === "king" ? "#c8b898" : kind === "storm" ? "#4a5468" : "#5a4028";
  const lift = wing === 2 ? -3 : wing === 1 ? -0.5 : 2;
  for (const side of [-1, 1]) part(ctx, (c) => {
    c.beginPath();
    c.moveTo(cx - 1, cy - 0.4);
    c.quadraticCurveTo(cx + side * 3.4, cy - 1.6 + lift * 0.6, cx + side * 7.4, cy + lift);
    c.lineTo(cx + side * 5.6, cy + lift * 0.4 + 1.2);
    c.quadraticCurveTo(cx + side * 3, cy + 1, cx + 1, cy + 0.6);
    c.closePath();
    c.fillStyle = lin(c, cx, cy - 2, cx, cy + 2, [[0, lighten(wcol, 0.3)], [1, darken(wcol, 0.3)]]); c.fill();
    c.fillStyle = rgba(darken(wcol, 0.5), 0.6); c.fillRect(cx + side * 5.6 - 0.4, cy + lift * 0.8, 0.8, 0.8);
  });
  part(ctx, (c) => ball(c, cx, cy, 2.8, 1.7, body, { hi: 0.45, lo: 0.4 }));
  part(ctx, (c) => { ball(c, cx + 2.6, cy - 0.6, 1.4, 1.2, kind === "king" ? GOLD : "#e8dfc6", { hi: 0.4, lo: 0.3 }); c.fillStyle = "#e8c14a"; c.fillRect(cx + 3.6, cy - 0.4, 0.9, 0.7); c.fillStyle = "#1a1420"; c.fillRect(cx + 2.8, cy - 1.1, 0.6, 0.6); });
  part(ctx, (c) => { c.fillStyle = darken(body, 0.2); c.beginPath(); c.moveTo(cx - 2.2, cy - 0.5); c.lineTo(cx - 5, cy - 0.2); c.lineTo(cx - 2.2, cy + 1); c.closePath(); c.fill(); });   // tail
};

// A bird at rest on the glove, wings folded.
const paintPerched = (ctx, cx, cy, kind) => {
  const body = kind === "king" ? "#e8dfc6" : kind === "storm" ? "#6a7488" : "#7a5a3a";
  part(ctx, (c) => { ball(c, cx, cy, 2.2, 3, body, { hi: 0.45, lo: 0.4 }); c.fillStyle = darken(body, 0.3); c.fillRect(cx - 2, cy + 1.5, 1.4, 3); });
  part(ctx, (c) => { ball(c, cx + 0.8, cy - 3.2, 1.5, 1.4, kind === "king" ? GOLD : "#e8dfc6", { hi: 0.4, lo: 0.3 }); c.fillStyle = "#e8c14a"; c.fillRect(cx + 2, cy - 3.2, 0.9, 0.7); c.fillStyle = "#1a1420"; c.fillRect(cx + 1.2, cy - 3.8, 0.6, 0.6); });
};

export const drawFalconry = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const st = getStats(t);
  const { lvl, r4, aviary, court, nest, h } = spec(t);
  const bake = canBake();
  const r = readiness(t), anim = t.anim || 0;
  if (bake) stamp(ctx, cache.get(`roost|${t.level}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintRoost(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintRoost(ctx, t, x, y);
  if (lvl >= 2 && Math.sin(time * 1.7 + t.id) > -0.4) glow(ctx, x, y - h + 14.5, 3, "#ffd070", 0.7);
  if (r4 === "ba") {
    // the golden eye that never closes
    const ex = x - 8.5, ey = y - h - 26.4;
    glow(ctx, ex, ey, 4 + Math.sin(time * 3) * 0.8, "#f8d870", 0.8);
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(ex - 0.6, ey - 0.6, 1.2, 1.2);
  }
  if (r4 === "ab" && Math.sin(time * 5.3 + t.id) > 0.6) {
    // the rod crackles
    const rx = x - 9, ry = y - h - 38;
    ctx.strokeStyle = "rgba(200,230,255,0.95)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2 + Math.sin(time * 40) * 1.5, ry - 3); ctx.lineTo(rx + 1, ry - 5); ctx.lineTo(rx - 1, ry - 8); ctx.stroke();
    glow(ctx, rx, ry, 4, "#b8e0ff", 0.6);
  }
  const pal = court ? CREW_FOLK.mistressCourt : aviary ? ROYAL : CREW_FOLK.mistress;
  const dir = t._idle ? 1 : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  const my = y - h - 2 + (lvl === 1 ? -1 : 0);
  const kindOf = (b) => r4 === "ab" ? "storm" : (r4 === "ba" && b === 0) ? "king" : "hawk";
  const bird = (bx, by, wing, kind) => {
    const cv = bake ? cache.get(`bird|${wing}|${kind}`, 22, 14, (c) => paintBird(c, 11, 7, wing, kind)) : null;
    if (cv) stamp(ctx, cv, bx, by, 11, 7, 1); else paintBird(ctx, bx, by, wing, kind);
  };
  const mistress = (key) => {
    if (bake) stamp(ctx, cache.get(`mistress|${key}`, 30, 32, (c) => drawMistress(c, 12, 29, 1, pal)), x, my, 12, 29, dir);
    else drawMistress(ctx, x, my, dir, pal);
  };
  if (nest) {
    // she rides the eagle; only when it is down does she wait here
    if (t.eagle && t.eagle.respawn > 0) {
      mistress("court");
      if (Math.sin(time * 6) > 0) glow(ctx, x + dir * 6, my - 24, 2, "#ffffff", 0.9);
    }
  } else {
    const birds = r4 === "bb" ? 3 : st.shots >= 3 ? 3 : (aviary || lvl >= 2) ? 2 : 1;
    // the strike: one bird is away; just before it, one sits on the glove
    const striking = anim > 0.3;
    const onGlove = !striking && (t._idle ? ((time / 11) + t.id * 0.71) % 1 < 0.45 : r > 0.8);
    const skip = striking ? (t.shotIdx || 0) % birds : -1;
    const wheel = [];
    for (let b = 0; b < birds; b++) {
      if (b === skip) continue;
      if (b === 0 && onGlove) continue;
      const ang = time * 1.7 + t.id * 0.7 + (b / birds) * Math.PI * 2;
      wheel.push({ x: x + Math.cos(ang) * 18, y: my - 28 + Math.sin(ang) * 6, front: Math.sin(ang) >= 0, kind: kindOf(b), wing: Math.floor(time * 9 + b * 1.3) % 3 });
    }
    for (const w of wheel) if (!w.front) bird(w.x, w.y, w.wing, w.kind);
    mistress(court ? "court" : aviary ? "royal" : "mews");
    if (onGlove) {
      const cv = bake ? cache.get(`perched|${kindOf(0)}`, 12, 12, (c) => paintPerched(c, 6, 8, kindOf(0))) : null;
      if (cv) stamp(ctx, cv, x + dir * 9, my - 24.5, 6, 8, dir);
      // the bird mantles, wings half open, as the strike comes
      if (!t._idle && r > 0.93) bird(x + dir * 9, my - 26, 2, kindOf(0));
    }
    for (const w of wheel) if (w.front) bird(w.x, w.y, w.wing, w.kind);
    if (striking) {
      // the stoop: a streak off the glove toward the field
      ctx.strokeStyle = `rgba(255,243,210,${anim * 0.8})`; ctx.lineWidth = 1.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + dir * 9, my - 26); ctx.lineTo(x + dir * (14 + (1 - anim) * 20), my - 22 + (1 - anim) * 14); ctx.stroke();
      if (r4 === "ab") glow(ctx, x + dir * 12, my - 24, 5 * anim, "#b8e0ff", anim);
    }
    if (r4 === "ab") for (const w of wheel) if (Math.sin(time * 7 + w.x) > 0.7) { ctx.fillStyle = "#d8f0ff"; ctx.fillRect(w.x - 5, w.y + 1, 1, 1); }
  }
  // a drifting feather now and then
  const fc = ((time / 7) + t.id * 0.53) % 1;
  if (fc < 0.5) { ctx.fillStyle = "#e8dfc6"; ctx.fillRect(x + 10 + Math.sin(fc * 12) * 4, my - 20 + fc * 40, 1.6, 0.8); }
  const pc = court ? (r4 === "bb" ? "#7a2a4a" : PURPLE) : aviary ? (r4 === "ab" ? STORM : "#3a5a8a") : "#a06a3a";
  if (r4 === "ba") pennant(ctx, x + 12, y - h - 14, 13, pc, time, t.id, 1);
  else pennant(ctx, x - 12, y - h - (lvl === 1 ? 10 : 14), lvl === 1 ? 11 : 13, pc, time, t.id, -1);
};

const ROYAL = { skin: "#e8b990", hood: "#2a3a5a", coat: "#3a5a8a", boots: "#2a2a30", trim: "#d8b34a" };
