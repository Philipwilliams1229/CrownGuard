// ============ HALL: THE POWDER WORKS ============
// A squat stone powder store with a plank deck on its roof, and the two men
// who never share a job standing up there in the open: the bombardier with
// a lit charge on the rear side, the musketeer braced at the rail on the
// near side, each firing on his own cadence. It GROWS: rubble walls, a rope
// rail and one keg at one; coursed stone, a banded door, a timber rail and a
// pile of shot at two; dressed stone, a red magazine door with a gold flame,
// kegs stacked and a crate of cartridges at three.
//   The Bombard Yard sets a bronze mortar in front of the store: the Grand
// Battery sets TWO under a crossed-guns banner; Dragon's Breath blackens the
// whole store with pitch, iron mortar glowing, pitch kegs, a fire in a
// brazier. The Long Muskets rack spare long guns on the deck: the
// Sharpshooters lay the musket in a forked rest with a brass scope; the
// Grapeshot Crew bore it out into a flared scattergun and heap grape bags.
//
// Pixel art: the ground and the store are baked per form and facing (the
// footprint stays inside kit B's ellipse); the two men are baked frames;
// fuses, flashes, smoke and fire are live.

import { canBake } from "../buildkit.js";
import { rgba, soft, glow } from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import { powderHome, bomberFacing, musketFacing } from "../../engine/muzzles.js";
import * as bomberFig from "../pix/fig-bomber.js";
import * as musketeerFig from "../pix/fig-musketeer.js";
import * as powderHall from "../pix/hall-gunpowder.js";
import { hallPix, drawHallBack, drawHallFront, stampPix } from "../pix/halls.js";
import { toCanvas } from "../pix/pix.js";
import { crew, drawCrewPix, loopFrame, shotFrame, markOf, crewMark } from "../pix/crews.js";

// the two men (pix/crews.js)
const BOMBER = crew("bomber", bomberFig), MUSKETEER = crew("musketeer", musketeerFig);
const PENS = new Map();   // the new store's pennant frames, as stampable pictures
const penOf = (col, dir, i) => {
  const k = col + dir + (i % powderHall.PENNANT_N);
  let p = PENS.get(k);
  if (!p) { const img = powderHall.pennantOf(col, dir, i); PENS.set(k, (p = { cv: toCanvas(img), ox: img.ox, oy: img.oy })); }
  return p;
};
const MUSKET_HIT = Math.round(MUSKETEER.CLIPS.shot.hit * (MUSKETEER.CLIPS.shot.n - 1));   // the frame the shot kicks on


const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "l" + lvl;
  return { lvl, r4, key, bomb: t.branch === "a", musket: t.branch === "b", dragon: r4 === "ab", deckY: -9 - lvl };
};


// where a mortar's mouth ends up, for the live flash
const mouthOf = (mx, gy, f) => [mx + f * 1.6, gy - 10];


const mortarSpots = (s, x, y, f) => s.r4 === "aa" ? [[x - f * 8.5, y + 10], [x + f * 3, y + 12.5]] : s.bomb ? [[x - f * 8, y + 11.5]] : [];



// ---- per frame -------------------------------------------------------------------
export const drawGunpowder = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), dY = y + s.deckY;
  // the store stands one way for good (toward the road it watches); the two
  // men each face their own last shot and hold it, firing or not
  const f = powderHome(t), fb = bomberFacing(t), fm = musketFacing(t);
  const bake = canBake();
  // the store (render/pix/hall-gunpowder.js): built facing east, baked mirrored (seed + 3) and drawn
  // mirrored for a store that faces west, so the sun stays upper left. It brings its own ground,
  // shadow, brazier flame and lamp light. The two men, the muzzle and the hand are painted here.
  const H = bake ? hallPix("gunpowder", powderHall, { level: s.lvl, branch: t.branch, rank4: t.rank4 }, (t.id % 3) + (f < 0 ? 3 : 0), { flip: f < 0 }) : null;
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, dir: f });
  const anim = t.anim || 0, mA = t.mAnim || 0;
  // the pennant at the rear corner (the Battery flies its banner instead)
  if (H) {
    if (s.r4 !== "aa") { const col = s.dragon ? powderHall.FLAG_OF.dragon : s.musket ? powderHall.FLAG_OF.b : s.bomb ? powderHall.FLAG_OF.a : powderHall.FLAG_OF.base; stampPix(ctx, penOf(col, -f, Math.floor(time * 9 + t.id * 3)), x - f * ((s.lvl >= 2 ? 26 : 24) - 3) / 2, y + (-18 - 2 * s.lvl - 38) / 2); }
  }
  // Dragon's Breath: the brazier burns, the pitch smokes
  if (s.dragon) {
    for (let i = 0; i < 2; i++) { const k = (time * 0.5 + i * 0.5 + t.id * 0.13) % 1; soft(ctx, x + f * 12 + Math.sin(time + i) * 1.5, y - 3 - k * 16, 2 + k * 3, 2 + k * 3, [[0, `rgba(52,44,50,${0.4 * (1 - k)})`], [1, "rgba(52,44,50,0)"]]); }
  }
  // ---- the bombardier, rear side: the charge at his belt with its fuse
  // sputtering, then the throw (bomberFrame: wind-up, whip, release, follow-
  // through, a fresh charge); the fuse's glow rides on the charge in his hand
  const st = getStats(t), clock = time + t.id * 0.93;
  const bx = x - f * 5.5, by = dY - 2.5;
  if (!t.noFolk) {
    // the bombardier (pix/fig-bomber.js): between waves he stands with the charge at his
    // chest; in a fight his throw runs off the same clock (t.cd; a lab's bare t.anim stands
    // in for it), cocked and waiting while there is no one to throw at. The fuse's live
    // glow rides on his "fuse" mark (there only while a lit charge is in his hand).
    const until = t.cd > 0 ? t.cd : anim > 0 ? st.rate - ((1 - anim) / 4) * 1000 : 0;
    const clip = t._idle ? "idle" : "throw";
    const rec = drawCrewPix(ctx, BOMBER, bx, by, fb, clip, t._idle ? loopFrame(BOMBER, "idle", clock, t.id) : shotFrame(BOMBER, "throw", until, st.rate));
    const fz = markOf(rec, "fuse", fb);
    if (fz) {
      const fuse = s.dragon ? "#f08a3a" : "#ffe08a";
      const fx = bx + fz[0], fy = by + fz[1];
      const fl = Math.sin(time * 26 + t.id) > 0;
      glow(ctx, fx, fy, fl ? 2.6 : 1.8, fuse, 0.85);
      ctx.fillStyle = fl ? "#fff3d2" : fuse; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
    }
  }
  // ---- the musketeer, near side: the shot drives the gun, his shoulder and
  // head back and the barrel up (kick, recoil), then he loads (port, the rod)
  // and comes back to the aim; flash at the muzzle wherever it is, smoke
  // left hanging where it was fired
  const gun = s.r4 === "ba" ? "sharp" : s.r4 === "bb" ? "grape" : "plain";
  const mRate = st.mRate || 2600;
  const mx = x + f * 6.5, my = dY - 2.5;
  let tipX = mx, tipY = my, mAng = 0, smokeX = mx, smokeY = my, glintAt = null;
  if (!t.noFolk) {
    {
      // the new musketeer (pix/fig-musketeer.js; the gun is his variant, the Sharpshooters'
      // rest with it): at the port between waves; in a fight the shot runs off his own clock
      // (t.mCd; a lab's bare t.mAnim stands in), reloading after it and resting at the aim.
      // The flash rides his "muzzle" mark along muzzle - bore; the smoke hangs where the
      // kick frame's muzzle was; the idle glint sits at "bore".
      const until = t.mCd > 0 ? t.mCd : mA > 0 ? mRate - ((1 - mA) / 3.2) * 1000 : 0;
      const clip = t._idle ? "idle" : "shot";
      const mVar = t.mDeg && !t._idle ? `${gun}@${t.mDeg}` : gun;   // his gun turns to his last mark (engine: t.mDeg, aim.js)
      const rec = drawCrewPix(ctx, MUSKETEER, mx, my, fm, clip, t._idle ? loopFrame(MUSKETEER, "idle", time, t.id + 5) : shotFrame(MUSKETEER, "shot", until, mRate, { rest: 1 }), { variant: mVar });
      const m = rec.marks.muzzle, b = rec.marks.bore, at = crewMark(MUSKETEER, "shot", MUSKET_HIT, "muzzle", fm, mVar);
      tipX = mx + fm * m[0] / 2; tipY = my + m[1] / 2; mAng = Math.atan2(m[1] - b[1], m[0] - b[0]);
      smokeX = mx + at[0]; smokeY = my + at[1];
      glintAt = [mx + fm * b[0] / 2, my + b[1] / 2];
    }
    if (mA > 0.7) {
      const k = (mA - 0.7) / 0.3, ca = Math.cos(mAng), sa = Math.sin(mAng);
      glow(ctx, tipX + fm * ca * 2, tipY + sa * 2, 5 + k * 3, "#f4c060", 0.8 * k);
      ctx.fillStyle = "#fff3d2";
      const rays = gun === "grape" ? [-0.4, -0.13, 0.13, 0.4] : [0];
      for (const a of rays) {
        const L = 3 + k * 3, rc = Math.cos(mAng + a), rs = Math.sin(mAng + a);
        for (let i = 1; i <= 3; i++) ctx.fillRect(tipX + fm * rc * i * L / 3 - 0.6, tipY + rs * i * L / 3 - 0.6, 1.2, 1.2);
      }
    }
    if (mA > 0.1) {
      const p = 1 - mA, sx = smokeX, sy = smokeY;
      for (let i = 0; i < (gun === "grape" ? 3 : 2); i++) soft(ctx, sx + fm * (3 + p * 7 + i * 3), sy - p * 4 - i * 1.5 + (gun === "grape" ? (i - 1) * 2 : 0), 2.5 + p * 4, 2.2 + p * 3, [[0, `rgba(214,210,200,${0.6 * mA})`], [1, "rgba(214,210,200,0)"]]);
    }
  }
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id, dir: f });
  // the mortars bark with the throw: a flash and a ball of smoke at each mouth
  if (s.bomb && anim > 0.4) mortarSpots(s, x, y, f).forEach(([ox, gy], i) => {
    const [ux, uy] = mouthOf(ox, gy, f), k = (anim - 0.4) / 0.6, p = 1 - k;
    if (k > 0.6) glow(ctx, ux, uy, 4 + k * 2, s.dragon ? "#f08a3a" : "#f4c060", 0.8 * k);
    soft(ctx, ux + f * p * 3, uy - 2 - p * 8 - i, 3 + p * 4, 3 + p * 3, [[0, s.dragon ? `rgba(50,40,44,${0.7 * k})` : `rgba(210,206,196,${0.7 * k})`], [1, "rgba(200,196,186,0)"]]);
  });
  if (s.dragon) mortarSpots(s, x, y, f).forEach(([ox, gy]) => { const [ux, uy] = mouthOf(ox, gy, f); glow(ctx, ux, uy + 0.5, 2.2, "#f08a3a", 0.5 + 0.25 * Math.sin(time * 6 + t.id)); });
  // idle: the musketeer's barrel catches the sun
  if (!t.noFolk && t._idle && Math.sin(time * 1.7 + t.id) > 0.9) {
    if (glintAt) glow(ctx, glintAt[0], glintAt[1], 1.8, "#ffffff", 0.85);
  }
};
