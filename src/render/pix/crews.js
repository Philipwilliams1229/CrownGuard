// ============ PIX CREWS: the new sprites on the halls ============
// The pixel sculptor's figures (pix.js, rig.js, fig-*.js) standing in for the
// halls' old crews (render/folk-*.js), a hall at a time. A hall keeps its old
// call and adds a new one beside it:
//
//   import * as smithFig from "../pix/fig-smith.js";
//   import { crew, crewOn, drawCrewPix, loopFrame, shotFrame, markOf } from "../pix/crews.js";
//   const SMITH = crew("smith", smithFig);
//   ...
//   if (crewOn()) { const rec = drawCrewPix(ctx, SMITH, x, y, dir, "hammer", f, { variant }); ... }
//   else drawSmith(ctx, x, y, dir, pal, ...);          // "New sprites" off: the old crew, untouched
//
// Units: a hall draws in board units and a figure is sculpted in art pixels,
// TWO to a unit (as the board's new foes and heroes are). (x, y) is where the
// figure's feet stand, exactly as the old draw calls took it.
//
// What a crew figure module gives (the same contract as every fig-*.js, plus two things):
//   CLIPS[name].hit   on a shot clip: where in it (0..1) the shot LEAVES (the loose, the
//                     strike, the throw). shotFrame() lands that frame on the engine's shot.
//   draw() returning  { marks: { tip: [x, y], ... } }: named points in art pixels from the
//                     feet, facing +x (a staff head, a bow hand, a muzzle, a glove), for
//                     whatever the hall draws there itself (an orb, a flash, a bird).
// One sun: a crew facing left is drawn from frames baked for that side and then
// mirrored (drawCrewPix does it; never mirror a right-facing bake by hand).
import { prefs } from "../../data/prefs.js";
import { bakeFrame } from "./bake.js";
import { lightAt, pixRim } from "./pixrigs.js";

// a hall's handle on its figure (the name keys the frame cache: one per figure module)
export const crew = (name, mod) => ({ ...mod, NAME: "crew-" + name });
// are the new crews drawn? (Settings > Display > New sprites)
export const crewOn = () => prefs.newSprites !== false;

const frac = (v) => v - Math.floor(v);
// a looping clip's frame from the clock: `seconds` of game time, `id` staggers neighbours
export const loopFrame = (fig, clip, seconds, id = 0) => { const c = fig.CLIPS[clip]; return Math.floor(frac((seconds * 1000) / c.ms + id * 0.37) * c.n) % c.n; };
// a frame from a phase 0..1 through a clip (clamped)
export const fracFrame = (fig, clip, f) => { const c = fig.CLIPS[clip]; return Math.max(0, Math.min(c.n - 1, Math.round(f * (c.n - 1)))); };
// A shot clip's frame from the hall's shot clock: `until` ms to the next shot (t.cd),
// `rate` ms between shots. The clip is timed so its `hit` frame shows on the very frame
// the shot leaves, and the follow-through plays out after it. Before a shot the figure
// winds up to the frame BEFORE the hit and waits there (drawn, staff raised, match at the
// touch-hole) for as long as the hall has no one to shoot. A clip longer than the wait
// between shots is hurried to fit. `o.rest` (0..1): a clip phase to stand at instead of 0
// in the dead time between the follow-through and the next wind-up.
export const shotFrame = (fig, clip, until, rate, o = {}) => {
  const c = fig.CLIPS[clip], hit = c.hit ?? 0.5, r = rate > 0 ? rate : c.ms, n1 = c.n - 1;
  const D = Math.min(c.ms, r * 0.96), pre = hit * D, post = (1 - hit) * D, since = r - Math.max(0, until);
  const hitF = Math.round(hit * n1);
  if (until > 0 && since >= 0 && since < post) return Math.min(n1, hitF + Math.round((n1 - hitF) * (since / post)));
  if (until <= pre) return Math.max(0, Math.round((hitF - 1) * (1 - Math.max(0, until) / pre)));
  return fracFrame(fig, clip, o.rest || 0);
};

// the baked frame (bake.js record: cv, glow, fx, light, marks, ...)
export const crewRec = (fig, clip, f, left = false, variant = "") => bakeFrame(fig, clip, f, { flip: left, variant });

// Draw a crew figure with its feet at (x, y) board units, facing dir (+1 east, -1 west).
//   f          the clip's frame index (loopFrame / shotFrame / fracFrame)
//   o.variant  the figure's look (a form's colours, a level's costume): a string its draw reads
//   o.glow     strength 0..1 of its own spell light (default 1; "Spell light" off = none)
//   o.fx       false to leave out the clip's own effect layer (when the hall draws the real thing)
//   o.alpha    the figure's opacity
// Returns the frame's record, for markOf().
export const drawCrewPix = (ctx, fig, x, y, dir, clip, f, o = {}) => {
  const left = dir < 0, rec = crewRec(fig, clip, f, left, o.variant || "");
  const w = rec.cv.width / 2, h = rec.cv.height / 2, ax = rec.ox / 2, ay = rec.oy / 2;
  ctx.save();
  if (o.alpha != null && o.alpha !== 1) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y); if (left) ctx.scale(-1, 1);
  ctx.drawImage(rec.cv, -ax, -ay, w, h);
  if (prefs.spellLight !== false) {
    const L = lightAt(x, y);
    if (L) { const a = ctx.globalAlpha; ctx.globalAlpha = a * L.k; ctx.drawImage(pixRim(rec, (L.dx >= 0 ? 1 : -1) * (left ? -1 : 1), L.col), -ax, -ay, w, h); ctx.globalAlpha = a; }
    const g = o.glow ?? 1;
    if (rec.glow && g > 0.02) { const a = ctx.globalAlpha; ctx.globalAlpha = a * Math.min(1, g); ctx.drawImage(rec.glow, -ax, -ay, w, h); ctx.globalAlpha = a; }
  }
  if (rec.fx && o.fx !== false) ctx.drawImage(rec.fx, -ax, -ay, w, h);
  ctx.restore();
  return rec;
};

// a named point of a drawn frame, in board units from the feet, turned the way it faces:
//   const [mx, my] = markOf(rec, "tip", dir);  orbX = x + mx, orbY = y + my
export const markOf = (rec, key, dir = 1) => { const m = rec.marks && rec.marks[key]; return m ? [(dir < 0 ? -1 : 1) * m[0] / 2, m[1] / 2] : null; };
// the same without drawing (a point the hall needs before it draws the figure)
export const crewMark = (fig, clip, f, key, dir = 1, variant = "") => markOf(crewRec(fig, clip, f, dir < 0, variant), key, dir);
