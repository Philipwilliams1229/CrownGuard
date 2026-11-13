// ============ BAKE: a figure's clip -> frames (concept) ============
import { Pix, toCanvas } from "./pix.js";
import { frameAt } from "./rig.js";

// fig: a figure module ({ BOX, BONES, draw, fx?, CLIPS }).
// o.flip   bake for a sprite drawn mirrored (the sun stays upper-left on screen)
// o.line   outline mode (pix.js resolve)
// o.light  false: leave the spell's light off the body
// o.fx     false: leave the spell itself (fireball, sparks) out
// Returns [{ cv, ox, oy, ph }] — cv in art pixels, (ox, oy) the feet.
const CACHE = new Map();
export const bakeClip = (fig, name, o = {}) => {
  const key = `${fig.NAME}|${name}|${o.flip ? 1 : 0}|${o.line || "tint"}|${o.light === false ? 0 : 1}|${o.fx === false ? 0 : 1}|${o.variant || ""}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const clip = fig.CLIPS[name], out = [];
  for (let f = 0; f < clip.n; f++) {
    const F = frameAt(clip, f, fig.BONES);
    const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(px, F, o) || {};
    const lights = info.light && o.light !== false ? [info.light] : [];
    const img = px.resolve({ flip: o.flip, line: o.line, lights });
    const cv = toCanvas(img);
    if (fig.fx && o.fx !== false) {
      const fxp = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
      fig.fx(fxp, F, info, name);
      cv.getContext("2d").drawImage(toCanvas(fxp.resolve({ line: "tint" })), 0, 0);
    }
    out.push({ cv, ox: fig.BOX.ox, oy: fig.BOX.oy, ph: F.ph, light: info.light || null });
  }
  CACHE.set(key, out);
  return out;
};
export const clearBakes = () => CACHE.clear();
