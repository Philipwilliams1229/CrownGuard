// ============ HALL: THE FALCONRY ============
// The falcon-mistress on a high roost with her gauntlet up and her birds
// wheeling round her head — the whole wheel behind her and her glove.
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

import { canBake } from "../buildkit.js";
import { readiness, rgba, glow } from "./kitB.js";
import { getStats } from "../../engine/towers.js";
import { wheelAt, falconCount } from "../../engine/muzzles.js";
import * as mistressFig from "../pix/fig-mistress.js";
import { crew, drawCrewPix, crewMark, loopFrame, shotFrame, markOf } from "../pix/crews.js";
import { wheelBird, perchedBird } from "../birds.js";
import * as falconryHall from "../pix/hall-falconry.js";
import { hallPix, drawHallBack, drawHallFront } from "../pix/halls.js";

// the new sprites' falconer (pix/fig-mistress.js); the frame of her `cast` on which the bird leaves
const MISTRESS = crew("mistress", mistressFig);
const CAST_F = Math.round(MISTRESS.CLIPS.cast.hit * (MISTRESS.CLIPS.cast.n - 1));


const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  return { lvl, r4, aviary: t.branch === "a", court: t.branch === "b", nest: r4 === "aa", h: lvl === 1 ? 22 : lvl === 2 ? 28 : t.branch ? 34 : 32 };
};

export const drawFalconry = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people (nor her birds)
  const x = t.x, y = t.y;
  const st = getStats(t);
  const { lvl, r4, aviary, court, nest, h } = spec(t);
  const bake = canBake();
  const r = readiness(t), anim = t.anim || 0;
  // the building: pix/hall-falconry.js, built round the perch (muzzles.js falconPerch). Its lights: the golden
  // eye pulses with the eye painted here, the rod's lights the stone when it crackles.
  const H = bake ? hallPix("falconry", falconryHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;
  const crackle = r4 === "ab" && Math.sin(time * 5.3 + t.id) > 0.6;
  const hk = { id: t.id, k: { eye: 0.72 + Math.sin(time * 3) * 0.28, rod: crackle ? 1 : 0 } };
  if (H) drawHallBack(ctx, H, x, y, time, hk);
  if (r4 === "ba") {
    // the golden eye that never closes
    const ex = x - 7.5, ey = y - h - 26.4;
    glow(ctx, ex, ey, 4 + Math.sin(time * 3) * 0.8, "#f8d870", 0.8);
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(ex - 0.6, ey - 0.6, 1.2, 1.2);
  }
  if (crackle) {
    // the rod crackles
    const rx = x - 9, ry = y - h - 38;
    ctx.strokeStyle = "rgba(200,230,255,0.95)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2 + Math.sin(time * 40) * 1.5, ry - 3); ctx.lineTo(rx + 1, ry - 5); ctx.lineTo(rx - 1, ry - 8); ctx.stroke();
    glow(ctx, rx, ry, 4, "#b8e0ff", 0.6);
  }
  // at rest she keeps facing the way she last cast (left before her first)
  const dir = Math.cos(t.lastAim || 0) >= 0 ? 1 : -1;
  const my = y - h - 2 + (lvl === 1 ? -1 : 0);
  const kindOf = (b) => r4 === "ab" ? "storm" : (r4 === "ba" && b === 0) ? "king" : "hawk";
  const bird = (bx, by, wing, kind) => {
    wheelBird(ctx, wing, bx, by, kind);      // the falcon (birds.js)
  };
  // her look, and the same two points off her own `glove` mark
  const variant = court ? "court" : aviary ? "royal" : "mews";
  const pixGlove = (g) => [x + g[0], my + g[1]];
  const pixBird = (g) => [x + g[0] + dir * 1, my + g[1] - 3.1];
  if (t.noFolk) {
    // the build lays the roost bare: no mistress, no bird on the glove or the wing
  } else if (nest) {
    // she rides the eagle; only when it is down does she wait here, glove up, whistling for it
    if (t.eagle && t.eagle.respawn > 0) {
      const [gx, gy] = pixGlove(markOf(drawCrewPix(ctx, MISTRESS, x, my, dir, "call", loopFrame(MISTRESS, "call", time, t.id), { variant: "royal" }), "glove", dir));
      if (Math.sin(time * 6) > 0) glow(ctx, gx - dir * 1.4, gy - 2.6, 2, "#ffffff", 0.9);
    }
  } else {
    const birds = falconCount(t, st);
    // her cast (mistressFrame): the glove at her chest; the bird comes down to
    // it and she raises it (present), draws the fist back (the bird mantles),
    // throws the arm out and the bird is away (cast, the stoop's streak off
    // her hand), follows through and settles. Idle: a bird rides the glove
    // now and then while she watches the others wheel.
    const rate = t.castRate || st.rate || 1300, clock = time + t.id * 0.83;   // (bird 0's own clock: update.js flyFalcons)
    const perchedIdle = t._idle && ((time / 11) + t.id * 0.71) % 1 < 0.45;
    // The new falconer, off the same clocks: at ease (t._idle), or ready with nothing to strike
    // (t.cd spent), she stands with the glove at her chest (`idle`); with a cast coming, `cast`
    // is timed to it (shotFrame: t.cd to bird 0's next cast, its rate), its hit frame on the cast.
    let clip = "idle", fr = 0;
    if (t._idle || !(t.cd > 0)) fr = loopFrame(MISTRESS, "idle", time, t.id);
    else { clip = "cast"; fr = shotFrame(MISTRESS, "cast", t.cd, rate); }
    const winding = clip === "cast" && fr > 0 && fr < CAST_F;   // glove presented, then the fist drawn back: the bird is on it
    // a bird cast at a foe is away until it is back on the wheel (update.js
    // sets t.falconsAway; birds.js flies it there from her glove and home)
    const away = new Set((t.falconsAway || []).filter((a) => a.back > time).map((a) => a.b));
    const onGlove = !away.has(0) && (t._idle ? perchedIdle : winding || !(t.cd > 0));
    // The wheel (muzzles.js wheelAt: where a cast bird leaves from and flies
    // home to) crosses its near side at her face's height, so EVERY bird on
    // it is drawn under her, her glove and the bird on it: a near bird passes
    // behind her head and her raised glove, never across her face or hat, and
    // nothing swaps layers mid-pass. (Lift the wheel in wheelAt and it flies
    // over her hat instead; this still holds.)
    for (let b = 0; b < birds; b++) {
      if (away.has(b)) continue;
      if (b === 0 && onGlove) continue;
      const [wx, wy] = wheelAt(t, b, birds, time);
      bird(wx, wy, Math.floor(time * 9 + b * 1.3) % 3, kindOf(b));
      // the Storm Falcons crackle as they fly
      if (r4 === "ab" && Math.sin(time * 7 + wx) > 0.7) { ctx.fillStyle = "#d8f0ff"; ctx.fillRect(wx - 5, wy + 1, 1, 1); }
    }
    const rec = drawCrewPix(ctx, MISTRESS, x, my, dir, clip, fr, { variant });
    if (onGlove) {
      const [px, py] = pixBird(markOf(rec, "glove", dir));
      // the bird mantles, wings half open, as she draws back to cast it
      if (winding && fr >= CAST_F - 2) bird(px, py - 1.5, 2, kindOf(0));
      else perchedBird(ctx, px, py, dir, kindOf(0));
    }
    // the Storm Falcons leave her hand in a crackle of blue
    if (r4 === "ab" && anim > 0.3) { const [sx, sy] = pixBird(crewMark(MISTRESS, "cast", CAST_F, "glove", dir, variant)); glow(ctx, sx + dir * 3, sy + 2, 5 * anim, "#b8e0ff", anim); }
  }
  if (H) drawHallFront(ctx, H, x, y, time, hk);   // the near rim, over her boots (the building flies its own pennant)
  // a drifting feather now and then (the birds', so not under noFolk)
  const fc = ((time / 7) + t.id * 0.53) % 1;
  if (fc < 0.5 && !t.noFolk) { ctx.fillStyle = "#e8dfc6"; ctx.fillRect(x + 10 + Math.sin(fc * 12) * 4, my - 20 + fc * 40, 1.6, 0.8); }
};
