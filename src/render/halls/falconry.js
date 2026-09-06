// ============ HALL: THE FALCONRY ============
// A round stone roost with a crenellated rim, the falcon-mistress standing
// on it with her gauntlet up, and her birds wheeling round her — the back
// of the orbit behind her, the front before. The Aviary flies more birds;
// the Skyknight tears the rim out and builds a great nest of branches for
// the war-eagle, and stands empty while she rides.

import {
  pad, skirt, stoneBody, battlement, GREY_STONE, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";
import { getStats } from "../../engine/towers.js";
import { drawMistress, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetFalconryBakes = () => cache.clear();
const BOX = { left: 34, right: 34, up: 62, down: 18 };

const roostH = (t) => 26 + t.level * 4;

const paintRoost = (ctx, t, x, y) => {
  const lvl = t.level;
  const nest = t.branch === "b" && t.rank4 === "b";
  const h = roostH(t);
  pad(ctx, x, y + 6, 22, t.id);
  shadow(ctx, x + 6, y + 8, 18, 4.5, 0.32);
  stoneBody(ctx, x, y - h, 22, h + 8, GREY_STONE);
  part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, x - 1.6, y - h + 10, 3.2, 7, 1.2); c.fill(); });
  if (nest) {
    // the nest: a wide bowl of branches, wider than the tower
    part(ctx, (c) => {
      c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.6; c.lineCap = "round";
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const r1 = 15 + (i % 3) * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * 8, y - h - 2 + Math.sin(a) * 3); c.lineTo(x + Math.cos(a) * r1, y - h - 6 + Math.sin(a) * 5); c.stroke(); }
      ball(c, x, y - h - 3, 12, 4.5, "#8a6a3a", { hi: 0.4, lo: 0.45 });
      ball(c, x, y - h - 4, 8, 2.6, "#d8c8a0", { hi: 0.3, lo: 0.3 });
    });
  } else {
    battlement(ctx, x, y - h - 1, 12, GREY_STONE, 6);
    // a perch pole off the rim
    part(ctx, (c) => cylinder(c, x + 12, y - h - 12, 1.8, 12, "#6a4a2e", { r: 0.8 }));
  }
  skirt(ctx, x, y + 7, 14, t.id);
};

// one bird, wings up or down
const paintBird = (ctx, cx, cy, up, king) => {
  const body = king ? "#e8dfc6" : "#7a5a3a";
  part(ctx, (c) => ball(c, cx, cy, 2.6, 1.6, body, { hi: 0.45, lo: 0.4 }));
  part(ctx, (c) => ball(c, cx + 2.4, cy - 0.4, 1.3, 1.1, king ? "#d8b34a" : "#e8dfc6", { hi: 0.4, lo: 0.3 }));
  for (const side of [-1, 1]) part(ctx, (c) => { c.strokeStyle = king ? "#c8b898" : "#5a4028"; c.lineWidth = 1.8; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(cx + side * 4, cy - 2 - (up ? 2.5 : -1.5), cx + side * 8, cy - (up ? 2 : -1)); c.stroke(); });
};

export const drawFalconry = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const st = getStats(t);
  const aviary = t.branch === "a", court = t.branch === "b";
  const nest = court && t.rank4 === "b";
  const h = roostH(t);
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`roost|${t.level}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintRoost(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintRoost(ctx, t, x, y);
  if (Math.sin(time * 1.7 + t.id) > -0.4) glow(ctx, x, y - h + 13.5, 3, "#ffd070", 0.7);
  const pal = court ? CREW_FOLK.mistressCourt : CREW_FOLK.mistress;
  const dir = t._idle ? 1 : (Math.cos(t.lastAim) >= 0 ? 1 : -1);
  const my = y - h - 2;
  if (nest) {
    // she rides the eagle; only when it is down does she wait here
    if (t.eagle && t.eagle.respawn > 0) {
      if (bake) stamp(ctx, cache.get("mistress|court", 30, 32, (c) => drawMistress(c, 12, 29, 1, pal)), x, my, 12, 29, dir);
      if (Math.sin(time * 6) > 0) glow(ctx, x + dir * 6, my - 24, 2, "#ffffff", 0.9);
    }
  } else {
    const birds = st.shots >= 3 ? 3 : (aviary || t.level >= 2) ? 2 : 1;
    const striking = t.anim > 0.35;
    const skip = striking ? (t.shotIdx || 0) % birds : -1;
    const perchCyc = t._idle ? ((time / 11) + t.id * 0.71) % 1 : 1;
    const wheel = [];
    for (let b = 0; b < birds; b++) {
      if (b === skip) continue;
      if (b === 0 && perchCyc < 0.45) { wheel.push({ x: x + dir * 8, y: my - 24, front: true, perched: true, king: court && t.rank4 === "a" }); continue; }
      const ang = time * 1.7 + t.id * 0.7 + (b / birds) * Math.PI * 2;
      wheel.push({ x: x + Math.cos(ang) * 17, y: my - 26 + Math.sin(ang) * 6, front: Math.sin(ang) >= 0, king: court && t.rank4 === "a" && b === 0 });
    }
    const bird = (w) => { const up = w.perched ? false : Math.sin(time * 9 + w.x) > 0; const cv = cache.get(`bird|${up ? 1 : 0}|${w.king ? 1 : 0}`, 22, 12, (c) => paintBird(c, 11, 7, up, w.king)); stamp(ctx, cv, w.x, w.y, 11, 7, 1); };
    for (const w of wheel) if (!w.front) bird(w);
    if (bake) stamp(ctx, cache.get(`mistress|${court ? "court" : "mews"}`, 30, 32, (c) => drawMistress(c, 12, 29, 1, pal)), x, my, 12, 29, dir);
    else drawMistress(ctx, x, my, dir, pal);
    for (const w of wheel) if (w.front) bird(w);
  }
  // a drifting feather now and then
  const fc = ((time / 7) + t.id * 0.53) % 1;
  if (fc < 0.5) ball(ctx, x + 10 + Math.sin(fc * 12) * 4, my - 20 + fc * 40, 1.4, 0.8, "#e8dfc6", { hi: 0.3, lo: 0.2 });
  pennant(ctx, x - 11, y - h - 14, 13, court ? "#5a4a8c" : aviary ? "#7a94b8" : "#a06a3a", time, t.id, -1);
};
