// ============ HALL: THE TRAPSMITH ============
// An open-fronted smithy with the smith at his anvil out front where you can
// see him, and a rack of hung traps beside it counting his ready charges.
// It GROWS: a canvas lean-to over a stone fire-ring and a stump anvil at
// one, a plank shed with a brick forge and bellows at two, a stone forge
// with a chimney and a shingled roof, a grindstone and powder at three.
//   The Springworks hangs a great cog on the gable and bear-iron jaws on the
// rack: the Guillotine Gate stands a small, gleaming guillotine beside it;
// the Caltrop Field keeps a hopper spilling caltrops over the yard.
//   The Blastworks piles sandbags and bomb-marked kegs and racks round
// mines: the Minefield Doctrine mounts a brass horn and a map board full of
// pins; the Aerostat Yard flies a balloon on a windlass with a bomb slung
// under it.
//
// Pixel art: the smithy is baked per form; the forge glow, sparks, the hung
// traps, the balloon and the smith's frames are live or stamped.

import { canBake } from "../buildkit.js";
import { rope, glint, rgba, soft, glow } from "./kitB.js";
import * as smithFig from "../pix/fig-smith.js";
import { crew, drawCrewPix, loopFrame, crewMark } from "../pix/crews.js";
import * as trapHall from "../pix/hall-trapsmith.js";
import { hallPix, drawHallBack, drawHallFront, stampPix, pixSprite } from "../pix/halls.js";

// the smith: fig-smith.js
const SMITH = crew("smith", smithFig);
const SMITH_HIT = Math.round(smithFig.CLIPS.hammer.hit * smithFig.CLIPS.hammer.n);   // the frame the hammer's face is on the iron

// the guillotine and the windlass stand here; the Doctrine piles its mines here
const GUIL = [12.5], WINCH = [13.5];
const MINES = [[-15, 0.6], [-10.6, 1], [-12.8, -3]];

// The smith's beat: seconds a blow takes, at work and at ease.
const BEAT = { work: [1.0], ease: [2.2] };
// His `hammer` clip is one whole blow (1 s). At work
// (a 1 s beat) it loops; at ease (2.2 s) he strikes once, then rests the hammer on the
// iron and breathes (`idle`) until the next beat. `k` is how far through the frame.
const smithNow = (t, time) => {
  const H = SMITH.CLIPS.hammer, secs = BEAT[t._idle ? "ease" : "work"][0];
  const p = (((time / secs + t.id * 0.37) % 1) + 1) % 1, u = (p * secs * 1000) / H.ms;
  if (u < 1) { const g = u * H.n, f = Math.min(H.n - 1, Math.floor(g)); return { clip: "hammer", f, k: g - f }; }
  return { clip: "idle", f: loopFrame(SMITH, "idle", (u - 1) * H.ms / 1000), k: 0 };
};
const spec = (t) => ({ lvl: t.branch ? 3 : t.level, r4: t.rank4 ? t.branch + t.rank4 : null, spring: t.branch === "a", blast: t.branch === "b" });

export const drawTrapsmith = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const { lvl, r4, spring, blast } = spec(t);
  const bake = canBake();
  // the building: pix/hall-trapsmith.js, built round the smith's old spot
  const H = bake ? hallPix("trapsmith", trapHall, { level: lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3) : null;
  // the forge (or fire ring) glows, the bellows breathing it up
  const br = Math.sin(time * 3 + t.id);
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, k: { forge: 0.8 + 0.2 * br } });   // its own flame; the light on the wall breathes with the bellows
  if (lvl >= 3) for (let i = 0; i < 2; i++) { const k = ((time * 0.45 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, x + 10 + Math.sin(time + i) * 1.5, y - 50 - k * 14, 1.6 + k * 3, 1.6 + k * 3, [[0, `rgba(170,164,160,${0.4 * (1 - k)})`], [1, "rgba(170,164,160,0)"]]); }
  // hung traps on the rack, one per ready charge
  const charges = Math.min(4, t.charges || 0);
  const kind = spring ? "a" : blast ? "b" : "s";
  if (H) {
    // the new traps, at the old hooks (an empty hook is part of the baked rack); the Doctrine's pile the same
    const trap = (k) => pixSprite(`trap|${k}`, () => trapHall.trapPix(k));
    if (r4 !== "ba") { for (let i = 0; i < charges; i++) stampPix(ctx, trap(kind), x - 14.2, y - 18 + i * 5); }
    else for (let i = 0; i < MINES.length; i++) if (i < Math.max(charges, 1)) stampPix(ctx, trap("m"), x + MINES[i][0], y + MINES[i][1] - 2);
  }
  if (r4 === "aa" && Math.sin(time * 1.6 + t.id) > 0.9) glint(ctx, x + GUIL[0] - 1.5, y - 19, 1, 0.95);
  // the balloon of the Aerostat Yard, bobbing on its tether
  if (r4 === "bb") {
    // it rides off the right of the chimney, its bomb clear of the ridge
    const bx = x + 19.5 + Math.sin(time * 0.9 + t.id) * 1.2, by = y - 61 + Math.sin(time * 1.4 + t.id) * 2;
    rope(ctx, x + WINCH[0], y - 5, bx, by + 12, 1, "#5a4a3a", 0.6);
    if (H) stampPix(ctx, pixSprite("trap|balloon", () => trapHall.balloonPix()), bx, by);   // the new balloon, the same bob and tether
    if (Math.sin(time * 9) > 0) { ctx.fillStyle = "#f4c060"; ctx.fillRect(bx + 1.8, by + 16.6, 1, 1); }
  }
  // the hot iron on the anvil (under his hammer and tongs), brighter as it's struck
  const pix = smithNow(t, time);   // the smith's moment
  const struck = pix.clip === "hammer" && pix.f === SMITH_HIT;
  ctx.fillStyle = struck ? "#ffd070" : "#f4a040"; ctx.fillRect(x + 0.5, y - 8.2, 4, 0.9);
  // the smith, hammer on the beat: lift, top, strike, impact, rebound,
  // settle; sparks fly on the impact frame (neither under noFolk)
  const sx = x - 6.5, sy = y + 4;
  if (!t.noFolk) {
    // the smith; the sparks start at his hammer's face (the `strike` mark of the frame it lands on)
    drawCrewPix(ctx, SMITH, sx, sy, 1, pix.clip, pix.f);
    const m = crewMark(SMITH, "hammer", SMITH_HIT, "strike", 1), px = sx + m[0], py = sy + m[1];
    const blow = pix.clip === "hammer" ? pix.f - SMITH_HIT : -1;
    if (blow === 0) {
      glow(ctx, px, py, 3.5 - pix.k, "#ffd070", 0.85);
      for (let i = 0; i < 5; i++) {
        const a = -0.25 - i * 0.62, d = 1.5 + pix.k * 4.5;
        ctx.fillStyle = i % 2 ? "#ffe08a" : "#fff3d2"; ctx.fillRect(px + Math.cos(a) * d * 1.4, py + Math.sin(a) * d, 0.9, 0.9);
      }
    } else if (blow === 1) {
      for (let i = 0; i < 3; i++) {
        const a = -0.5 - i * 0.9, d = 5.5 + pix.k * 2;
        ctx.fillStyle = `rgba(255,224,138,${0.8 - pix.k * 0.6})`; ctx.fillRect(px + Math.cos(a) * d * 1.4, py + Math.sin(a) * d + pix.k * 2.5, 0.8, 0.8);
      }
    }
  }
  if (H) drawHallFront(ctx, H, x, y, time, { id: t.id });   // nothing stands in front of the smith; the hall flies its own pennant
};
