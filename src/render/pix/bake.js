// ============ BAKE: a figure's clip -> frames (concept) ============
import { Pix, toCanvas } from "./pix.js";
import { frameAt } from "./rig.js";
import { lightRight, onDay } from "../../data/sun.js";

// fig: a figure module ({ BOX, BONES, draw, fx?, CLIPS }).
// o.flip     bake for a sprite drawn mirrored (the sun stays upper-left on screen)
// o.line     outline mode (pix.js resolve; default "tint")
// o.variant  handed to the figure's draw (a face, a costume option)
// Returns one record per frame, every picture in art pixels with the feet at (ox, oy):
//   cv     the figure in sunlight, nothing else
//   glow   an overlay: its OWN spell's light on it (null when it casts none)
//   fx     the spell itself (fireball, sparks, a blade's smear), or null
//   light  { x, y, r, col, k } where its own light sits (for the ground's glow)
//   marks  named points the figure's draw gave ({ tip: [x, y] }, art pixels from the feet, facing +x), or null
// and rimOf(frame, dir, col) gives the overlay for a light off to one side.
// A frame is drawn as stamps: cv, then any overlays at whatever strength the
// moment calls for (globalAlpha), then fx. That is the whole run-time cost of light.
const CACHE = new Map();
// Memory (2026-11-18, a phone crash mid-level): a frame keeps only its canvases, never
// the sculpt buffer it was drawn from (~42 bytes a pixel; every walk of every figure
// held ~420 MB of them). rimOf sculpts the frame again the first time a light falls on
// it. The baked canvases are held to BAKE_BUDGET bytes: past it the clips not asked for
// longest are dropped (and bake again if they come back).
const BAKE_BUDGET = 96 * 1024 * 1024;
let bytes = 0, clock = 0;
const cvBytes = (cv) => (cv ? cv.width * cv.height * 4 : 0);
const recBytes = (r) => { let b = cvBytes(r.cv) + cvBytes(r.glow) + cvBytes(r.fx); for (const c of r.rims.values()) b += cvBytes(c); return b; };
const trim = () => {
  if (bytes <= BAKE_BUDGET) return;
  // oldest-asked first (a Map keeps insertion order; a clip asked for again is moved to the end)
  for (const [key, arr] of CACHE) {
    if (bytes <= BAKE_BUDGET * 0.75) break;
    if (arr.at === clock) continue;        // never the clip being drawn right now
    for (const r of arr) if (r) { bytes -= recBytes(r); r.gone = true; }
    CACHE.delete(key);
  }
};
export const bakeStats = () => ({ clips: CACHE.size, bytes });
// one frame, baked the first time it is asked for (the board asks frame by frame, so
// a figure walking on for the first time costs one small bake, not a whole clip)
export const bakeFrame = (fig, name, f, o = {}) => {
  const key = `${fig.NAME}|${name}|${o.flip ? 1 : 0}|${o.line || "tint"}|${o.variant || ""}`;
  const clip = fig.CLIPS[name];
  let arr = CACHE.get(key);
  if (!arr) CACHE.set(key, (arr = new Array(clip.n)));
  else if (clock - arr.at > 256) { CACHE.delete(key); CACHE.set(key, arr); }   // keep the order roughly by use
  arr.at = ++clock;
  if (arr[f]) return arr[f];
  const F = frameAt(clip, f, fig.BONES);
  const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
  // the figure's draw reads `flip` as "the light is on my right" (hand-set face tones): the level's sun decides (data/sun.js)
  const od = { ...o, flip: lightRight(!!o.flip) };
  const info = fig.draw(px, F, od) || {};
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
  // `remake` sculpts it again for rimOf (the buffer itself is let go)
  const remake = () => { const p = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy); fig.draw(p, F, od); p.resolve({ flip: o.flip, line: o.line }); return p; };
  const rec = (arr[f] = { cv, glow, fx, ox: fig.BOX.ox, oy: fig.BOX.oy, ph: F.ph, light: info.light || own[0] || null, marks: info.marks || null, remake, rims: new Map() });
  bytes += recBytes(rec);
  trim();
  return rec;
};
export const bakeClip = (fig, name, o = {}) => { const out = []; for (let f = 0; f < fig.CLIPS[name].n; f++) out.push(bakeFrame(fig, name, f, o)); return out; };

// the overlay for light falling on a frame from one side: dir points toward
// the light in the SPRITE's own space (+x is the way the figure faces)
export const rimOf = (fr, dir, col, line = false) => {
  const key = `${dir[0]},${dir[1]},${col}${line ? ",L" : ""}`;
  let cv = fr.rims.get(key);
  if (!cv) { cv = toCanvas(fr.remake().lightLayer({ dir, col, k: 1, line })); fr.rims.set(key, cv); if (!fr.gone) bytes += cvBytes(cv); }
  return cv;
};
export const clearBakes = () => { CACHE.clear(); bytes = 0; };
onDay(clearBakes);   // a new sun: every figure is sculpted again from its side
