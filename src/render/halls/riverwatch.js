// ============ HALL: THE RIVER WATCH ============
// The only hall moored in running water: a plank jetty on driven piles with
// the watchman standing out on it, and the watch lantern burning against the
// current. Its skiffs are units and row the river themselves. It GROWS: a
// bare jetty and a mooring post at one, a rail, a bell and a keg at two, a
// stilted watch hut at the back at three.
//   The Harbour Patrol builds a boathouse with a skiff's nose in it and oars
// racked: the Crown Navy raises a mast with a crow's nest and the admiral's
// long pennant and faces the jetty in stone; the Harpooners mount a great
// harpoon gun on the end. The Fireship Wharf stacks pitch and keeps a
// cauldron smoking: the Hellburner lights a beacon over powder kegs; the
// Chain Boom winds a capstan whose chain runs down into the water.
//
// Pixel art: the whole jetty is baked per form; water ripples, the lantern,
// smoke and the watchman's habits are live.

import { canBake } from "../buildkit.js";
import { glint, rgba, soft, shadow } from "./kitB.js";
import { clipToWater } from "../waterreach.js";
import * as standerFig from "../pix/fig-stander.js";
import * as riverHall from "../pix/hall-riverwatch.js";
import { hallPix, drawHallBack } from "../pix/halls.js";
import { crew, drawCrewPix, loopFrame, fracFrame, markOf } from "../pix/crews.js";

// the new sprites' watchman (pix/fig-stander.js, the "watch" looks: a coat a branch)
const WATCHMAN = crew("stander", standerFig);

const BEACON = -5, CAPSTAN = 7;   // the Hellburner's beacon post and the Chain Boom's capstan (x offsets; live art follows them)
const spec = (t) => {
  const lvl = t.branch ? 3 : t.level;
  return { lvl, r4: t.rank4 ? t.branch + t.rank4 : null, hw: 9.5 + lvl * 0.5 + (t.branch ? 1 : 0) };   // the deck keeps inside the footprint
};

// The watchman's habits, as [clip, phase 0..1, the time the stretch
// began]: `glass` over the stretch the glass is up, `glance` (a hand to his brim) where he
// glances up and out, `watch` (standing easy) between.
const watchClip = (t, time) => {
  const [secs, open] = t._idle ? [6, 0.4] : [3, 0.6];
  const c = time / secs + t.id * 0.3, u = ((c % 1) + 1) % 1, began = (Math.floor(c) - t.id * 0.3) * secs;
  if (u < open) return ["glass", u / open, began];
  const v = (((time / 9 + t.id * 0.41) % 1) + 1) % 1;
  return v < 0.18 ? ["glance", v / 0.18, began] : ["watch", 0, began];
};

export const drawRiverwatchHall = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const { lvl, r4, hw } = spec(t);
  const bake = canBake();
  // ripples where the piles stand, and the current dragging past — kept to
  // the water (a hall moored in a narrow brook would ring its banks; the
  // clip is worked out once per hall). A menu's portrait stands off the
  // board (no hall moors within 18 of its edge): no clip.
  ctx.save();
  if (clipToWater(ctx, x - hw - 12, y + 3, x + hw + 12, y + 13, x < 18 || y < 22)) {
    ctx.strokeStyle = "rgba(226,240,246,0.45)"; ctx.lineWidth = 0.8;
    for (const dx of [-hw + 2, 0, hw - 2]) { const r = 3 + ((((time * 6 + dx) % 5) + 5) % 5); ctx.beginPath(); ctx.ellipse(x + dx, y + 7.5, r, r * 0.35, 0, 0, 7); ctx.stroke(); }
    if (r4 === "bb") { const r = 2 + ((time * 4) % 4); ctx.beginPath(); ctx.ellipse(x + CAPSTAN, y + 10, r, r * 0.35, 0, 0, 7); ctx.stroke(); }
  }
  ctx.restore();
  // the new jetty (pix/hall-riverwatch.js): the building, its pennant, beacon flame and cauldron
  // fire, the lantern's light on the boards; the ripples above, the smoke and the watchman stay
  // as they were. t.noFolk draws it too (the watchman is the only crew, and he is skipped).
  const H = bake ? hallPix("riverwatch", riverHall, { level: t.level, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;
  const lit = 0.7 + 0.3 * Math.sin(time * 3 + t.id);
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, k: { lamp: lit } });
  // the watch lantern
  const lx = x - hw + 2;
  // fire and smoke
  if (t.branch === "b" && r4 !== "bb") {
    for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i / 3 + t.id * 0.13) % 1); soft(ctx, x + hw - 5 + Math.sin(time + i * 2) * 2, y - 14 - k * 16, 2 + k * 3.5, 2 + k * 3.5, [[0, `rgba(58,50,56,${0.45 * (1 - k)})`], [1, "rgba(58,50,56,0)"]]); }
  }
  if (r4 === "ba") {
    const bx = x + BEACON;
    for (let i = 0; i < 2; i++) { const k = ((time * 0.4 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, bx + k * 6, y - 56 - k * 16, 3 + k * 4, 3 + k * 4, [[0, `rgba(58,50,56,${0.4 * (1 - k)})`], [1, "rgba(58,50,56,0)"]]); }
  }
  // the watchman out on the boards: now and then he raises a glass to the
  // river — up to his chest, to his eye, a sweep up the far bank, down again
  // — and between times stands easy, breathing, shifting his weight,
  // glancing about (baked frames; the glass is in his hands, so none of it
  // under noFolk)
  const wx = x - 1.5, wy = y - 4.5;
  if (t.noFolk) { /* no watchman yet, nor his glass */ }
  else {
    // the new sprites: the glass is in the figure. He is the one crew figure who looks
    // about at rest (he never aims): he turns as today, but only as a stretch begins, so
    // never with the glass at his eye.
    const [clip, ph, began] = watchClip(t, time);
    const d = Math.sin(began * 0.4 + t.id) >= 0 ? 1 : -1;
    shadow(ctx, wx + d, wy + 0.4, 5, 1.8, 0.3);
    const f = clip === "watch" ? loopFrame(WATCHMAN, "watch", time, t.id) : fracFrame(WATCHMAN, clip, ph);
    const rec = drawCrewPix(ctx, WATCHMAN, wx, wy, d, clip, f, { variant: t.branch ? "watch|" + t.branch : "watch" });
    // the lens catches the light while it is on the river
    const lens = clip === "glass" && ph > 0.2 && ph < 0.84 && Math.sin(time * 5 + t.id) > 0.55 ? markOf(rec, "lens", d) : null;
    if (lens) glint(ctx, wx + lens[0], wy + lens[1], 0.7, 0.9);
  }
  // the jetty flies its own pennants; the admiral's gold crown glints
  if (H && r4 === "aa" && Math.sin(time * 1.3 + t.id) > 0.9) glint(ctx, lx, y - 58, 1, 0.9);
  // the alarm bell swings when there is work on the water
  if (lvl >= 2 && !t.branch && !t._idle && Math.sin(time * 8) > 0.6) glint(ctx, x + hw - 1, y - 14, 0.8, 0.8);
};
