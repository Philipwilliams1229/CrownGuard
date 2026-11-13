// ============ BAKE: a figure's clip -> frames (concept) ============
import { Pix, toCanvas } from "./pix.js";
import { frameAt } from "./rig.js";

// fig: a figure module ({ BOX, BONES, draw, fx?, CLIPS }).
// o.flip     bake for a sprite drawn mirrored (the sun stays upper-left on screen)
// o.line     outline mode (pix.js resolve; default "tint")
// o.variant  handed to the figure's draw (a face, a costume option)
// Returns one record per frame, every picture in art pixels with the feet at (ox, oy):
//   cv     the figure in sunlight, nothing else
//   glow   an overlay: its OWN spell's light on it (null when it casts none)
//   fx     the spell itself (fireball, sparks, a blade's smear), or null
//   light  { x, y, r, col, k } where its own light sits (for the ground's glow)
// and rimOf(frame, dir, col) gives the overlay for a light off to one side.
// A frame is drawn as stamps: cv, then any overlays at whatever strength the
// moment calls for (globalAlpha), then fx. That is the whole run-time cost of light.
const CACHE = new Map();
// one frame, baked the first time it is asked for (the board asks frame by frame, so
// a figure walking on for the first time costs one small bake, not a whole clip)
export const bakeFrame = (fig, name, f, o = {}) => {
  const key = `${fig.NAME}|${name}|${o.flip ? 1 : 0}|${o.line || "tint"}|${o.variant || ""}`;
  const clip = fig.CLIPS[name];
  let arr = CACHE.get(key);
  if (!arr) CACHE.set(key, (arr = new Array(clip.n)));
  if (arr[f]) return arr[f];
  const F = frameAt(clip, f, fig.BONES);
  const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
  const info = fig.draw(px, F, o) || {};
  const cv = toCanvas(px.resolve({ flip: o.flip, line: o.line }));
  // its own light: one (info.light) or several (info.lights), each laid into the one glow overlay
  const own = (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02);
  let glow = null;
  if (own.length) { glow = toCanvas(px.lightLayer(own[0])); for (const l of own.slice(1)) glow.getContext("2d").drawImage(toCanvas(px.lightLayer(l)), 0, 0); }
  let fx = null;
  if (fig.fx) {
    const fxp = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    fig.fx(fxp, F, info, name);
    if (fxp.m.some((m) => m >= 0)) fx = toCanvas(fxp.resolve({ line: "tint" }));
  }
  return (arr[f] = { cv, glow, fx, ox: fig.BOX.ox, oy: fig.BOX.oy, ph: F.ph, light: info.light || own[0] || null, px, rims: new Map() });
};
export const bakeClip = (fig, name, o = {}) => { const out = []; for (let f = 0; f < fig.CLIPS[name].n; f++) out.push(bakeFrame(fig, name, f, o)); return out; };

// the overlay for light falling on a frame from one side: dir points toward
// the light in the SPRITE's own space (+x is the way the figure faces)
export const rimOf = (fr, dir, col) => {
  const key = `${dir[0]},${dir[1]},${col}`;
  let cv = fr.rims.get(key);
  if (!cv) { cv = toCanvas(fr.px.lightLayer({ dir, col, k: 1 })); fr.rims.set(key, cv); }
  return cv;
};
export const clearBakes = () => CACHE.clear();
