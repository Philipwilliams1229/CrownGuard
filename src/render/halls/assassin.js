// ============ HALL: THE ASSASSIN'S COVERT ============
// A dusk-coloured tent pitched in the grass, its door flap tied back on a
// cut deeper than any night, a knife board by it, and the blade on watch out
// front — who vanishes in a puff of black smoke when the work is on. It
// GROWS: a low lean-to of hides on two poles at one; a bell tent with a
// scalloped valance and a shaded lantern at two; a taller bell tent with a
// weapons rack and a second hood waiting in the doorway at three.
//   The Silent Court dresses in plum and gold and hangs its seal over the
// door: the Kingslayer flies a black banner of a crown run through with a
// dagger; the Open Contract nails a notice board thick with names.
//   The Nightshade Guild greens its canvas and hangs venom vials along the
// eave: the Widow's Kiss sets bubbling poison vats before it; the Plague
// Bearer's ground swells with spore pods that breathe out a sickly haze.
//
// Pixel art: ground and tent bake per form and facing; the watcher is a
// baked frame; smoke, lantern, bubbles and spores are live.

import { canBake } from "../buildkit.js";
import { rgba, soft, glow } from "./kitB.js";
import * as hoodedFig from "../pix/fig-hooded.js";
import * as assHall from "../pix/hall-assassin.js";
import { hallPix, drawHallBack } from "../pix/halls.js";
import { crew, drawCrewPix, loopFrame, fracFrame, markOf } from "../pix/crews.js";

// the new sprites' hooded master (pix/fig-hooded.js): arms folded, a knife in the near hand
const HOODED = crew("hooded", hoodedFig);
// What he is doing on his own clock (seconds, phased by the hall as hoodedFrame's is): the
// same 9.5 s round as the old blade's hand-to-hilt, 0.62 to 0.84 of it; there he turns the
// knife over (`turn`, played by phase), the rest of it he stands folded and breathing.
const watching = (clock) => {
  const c = (((clock / 9.5) % 1) + 1) % 1;
  return c > 0.62 && c < 0.84 ? ["turn", fracFrame(HOODED, "turn", (c - 0.62) / 0.22)] : ["idle", loopFrame(HOODED, "idle", clock)];
};

const VENOM = "#b050c0", SPORE = "#c8d060";
// the Plague Bearer's pods [dx, dy, r]: kept off the knife board and the tent's wall
const PODS = [[-10.5, 9.5, 2.4], [-5.5, 12.5, 1.8], [14.5, 3.5, 2], [-8.5, 5.5, 1.3], [1, 13.5, 1.4]];

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  return { lvl, r4, court: t.branch === "a", guild: t.branch === "b" };
};

// ---- per frame -------------------------------------------------------------------
export const drawAssassin = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), r4 = s.r4;
  const f = Math.cos(t.lastAim || 0) >= 0 ? 1 : -1;   // at rest, still the way of the last strike
  const bake = canBake();
  // the tent (pix/hall-assassin.js), built round the master's doorway; mirrored to the last strike with the sun kept
  const H = bake ? hallPix("assassin", assHall, { level: s.lvl, branch: t.branch, rank4: t.rank4 }, t.id % 3, { flip: f < 0 }) : null;
  if (H) drawHallBack(ctx, H, x, y, time, { id: t.id, dir: f, k: { lamp: 0.75 + 0.25 * Math.sin(time * 3 + t.id) } });
  // (no idle hoods by the tent and no lookout out front: the owner, 2026-11-22, wanted only the working
  // blades, the units drawn with the bands)
  // live: the vats bubble; the pods breathe
  if (r4 === "ba") for (const [vx, vy, i] of [[x - f * 9, y + 6.4, 0], [x - f * 2.5, y + 9.4, 1]]) {
    const k = (time * 1.3 + i * 0.5 + t.id * 0.2) % 1;
    glow(ctx, vx, vy, 3, VENOM, 0.35);
    ctx.fillStyle = k < 0.7 ? "#e8a0f0" : "#c060d0"; ctx.fillRect(vx - 1 + i * 1.5, vy - k * 3 - 0.5, 1, 1);
  }
  if (r4 === "bb") for (let i = 0; i < 4; i++) {
    const k = (time * 0.35 + i * 0.25 + t.id * 0.1) % 1;
    const px = x + f * PODS[i][0] + Math.sin(time * 1.5 + i) * 2;
    glow(ctx, px, y + 2 - k * 16, 1.6 + k * 1.5, SPORE, 0.7 * (1 - k));
  }
};
