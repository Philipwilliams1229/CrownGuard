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
export const bakeClip = (fig, name, o = {}) => {
  const key = `${fig.NAME}|${name}|${o.flip ? 1 : 0}|${o.line || "tint"}|${o.variant || ""}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const clip = fig.CLIPS[name], out = [];
  for (let f = 0; f < clip.n; f++) {
    const F = frameAt(clip, f, fig.BONES);
    const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(px, F, o) || {};
    const cv = toCanvas(px.resolve({ flip: o.flip, line: o.line }));
    const glow = info.light && info.light.k > 0.02 ? toCanvas(px.lightLayer(info.light)) : null;
    let fx = null;
    if (fig.fx) {
      const fxp = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
      fig.fx(fxp, F, info, name);
      if (fxp.m.some((m) => m >= 0)) fx = toCanvas(fxp.resolve({ line: "tint" }));
    }
    out.push({ cv, glow, fx, ox: fig.BOX.ox, oy: fig.BOX.oy, ph: F.ph, light: info.light || null, px, rims: new Map() });
  }
  CACHE.set(key, out);
  return out;
};

// the overlay for light falling on a frame from one side: dir points toward
// the light in the SPRITE's own space (+x is the way the figure faces)
export const rimOf = (fr, dir, col) => {
  const key = `${dir[0]},${dir[1]},${col}`;
  let cv = fr.rims.get(key);
  if (!cv) { cv = toCanvas(fr.px.lightLayer({ dir, col, k: 1 })); fr.rims.set(key, cv); }
  return cv;
};
export const clearBakes = () => CACHE.clear();
