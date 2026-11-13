// ============ PIX RIGS: the new sprites on the board ============
// The pixel sculptor's figures (pix.js, rig.js, fig-*.js) standing in for the
// old rigs, a figure at a time. A type listed in PIX is drawn from its new
// figure wherever the game draws a rig (rigs.js asks hasPix first); every
// other type keeps its old rig, and so does everything when the player turns
// "New sprites" off (Settings > Display).
//
// What the new figures bring, and how the game drives them:
//   - more frames. The old rigs had four walk and four fight frames picked by
//     number. These have 8-frame walks and 11-16 frame attacks, so the board
//     hands over a PHASE instead:
//       "walk"  frame 0..4 (may be fractional: the old four-frame count, kept
//               so every caller can pass what it always passed)
//       "idle"  frame = seconds (a soldier standing; the old rigs stood on walk 0)
//       "atk"   frame 0..1 through the attack clip, from the attack CLOCK
//               (atkFrac below), so the blow lands on the clip's own strike
//       "fight" / "sky"  the old frame numbers 0-3, mapped to the matching
//               moments of the new clip (for callers not yet moved to "atk")
//   - one sun. A figure facing left is drawn from frames baked for that side
//     (the light flipped, then the sprite mirrored), never mirrored light and all.
//   - light. A caster's own glow is a second sprite stamped over him; a fire
//     nearby (LIGHTS, filled by draw.js each frame) stamps a rim overlay on
//     whoever stands in it. "Spell light" in Settings turns both off.
import { prefs } from "../../data/prefs.js";
import { bakeFrame, rimOf } from "./bake.js";
import * as knight from "./fig-knight.js";
import * as archer from "./fig-archer.js";
import * as goblin from "./fig-goblin.js";
import * as orc from "./fig-orc.js";
import * as necro from "./fig-necro.js";

const mk = (NAME, mod) => ({ ...mod, NAME });
// fig     the figure
// atk     the clip a blow plays;  hit: where in it (0..1) the blow lands
// per     gait units (14 px of road each, engine update.js e.gait) to one walk cycle
// legacy  the clip frames that stand for the old four fight frames (melee: guard,
//         wind-up, strike, follow-through; a bowman: full draw, loose, reach, nock)
// sky     the same for the old "sky" sheet (Wren's Arrow Volley)
// fx      draw the clip's own effect layer (a blade's smear). Off where the
//         engine already flies the real thing (Wren's arrow).
// variant a look of the same figure (handed to its draw as o.variant): the bare-headed
//         goblin, the boar without its rider
// casts   things it does ON THE MARCH, each a walk-shaped clip in step with "walk" (same
//         legs, other arms and light) worn while an engine clock says so:
//         { clip, clock, every, lead, hold }: from `lead` ms before e[clock] runs out
//         until `hold` ms after it is reset to e[every]
export const PIX = {
  heroKnight: { fig: mk("knight", knight), atk: "attack", hit: 0.5, legacy: [0, 4, 6, 7], fx: true },
  heroHunter: { fig: mk("archer", archer), atk: "attack", hit: 0.62, legacy: [7, 9, 10, 12], sky: [0, 1, 2, 3], fx: false },
  goblin: { fig: mk("goblin", goblin), atk: "attack", hit: 0.47, per: 2.3, legacy: [0, 4, 5, 6], fx: true },
  orc: { fig: mk("orc", orc), atk: "attack", hit: 0.55, per: 2.4, legacy: [0, 6, 7, 9], fx: true },
  // (his raise: the engine resets raiseCd to raiseEvery when the dead get up, and holds it at 0 while there are none)
  necro: { fig: mk("necro", necro), atk: "strike", hit: 0.54, per: 2.9, legacy: [0, 5, 6, 8], fx: true, casts: [{ clip: "raise", clock: "raiseCd", every: "raiseEvery", lead: -1, hold: 900 }] },
};
export const hasPix = (type) => prefs.newSprites !== false && Object.prototype.hasOwnProperty.call(PIX, type);

// the rig's box for a pix type (world units, as RIGS' boxes are): symmetric about the feet
export const pixBox = (type) => { const { w, h, ox, oy } = PIX[type].fig.BOX; return { hw: Math.max(ox, w - ox) / 2, up: oy / 2, down: (h - oy) / 2 }; };

const frac = (v) => v - Math.floor(v);
// the walk sheet a marching foe wears just now: "walk", or a cast it is in the middle of
export const marchSheet = (type, e, tms = 0) => {
  for (const c of PIX[type].casts || []) {
    const cd = e[c.clock], every = e[c.every];
    if (cd == null || !every || (e.silencedUntil || 0) > tms) continue;
    if (cd <= c.lead || every - cd < c.hold) return c.clip;
  }
  return "walk";
};
// (sheet, frame) as the game gives them -> [clip, frame index]
const clipFrame = (d, sheet, frame) => {
  const C = d.fig.CLIPS, f = typeof frame === "number" ? frame : 0;
  if (sheet === "idle") { const c = C.idle; return ["idle", Math.floor(frac((f * 1000) / c.ms) * c.n) % c.n]; }
  if (sheet === "atk") { const c = C[d.atk]; return [d.atk, Math.max(0, Math.min(c.n - 1, Math.round(f * (c.n - 1))))]; }
  if (sheet === "sky" && d.sky) return ["sky", d.sky[(f | 0) % d.sky.length]];
  if (sheet === "fight" || sheet === "sky" || sheet === "sweep") return [d.atk, d.legacy[(f | 0) % 4] ?? 0];
  // "walk", a flier's "fly" (its walk clip is its wingbeat), or a marching cast: all loops in step
  const name = C[sheet] && C[sheet].loop ? sheet : "walk", c = C[name]; return [name, Math.floor(frac(f / 4) * c.n) % c.n];
};
// the baked frame record (bake.js) for what the game asked; left: the figure faces left
export const pixRec = (type, sheet, frame, left = false) => {
  const d = PIX[type], [clip, f] = clipFrame(d, sheet, frame);
  return bakeFrame(d.fig, clip, f, { flip: left, variant: d.variant });
};

// Where an attack clip stands, from the attack clock: `until` ms to the next
// blow, `rate` ms between blows. The wind-up is timed so the clip's strike
// lands exactly on the blow, the follow-through plays out after it, and in
// between the figure holds its guard (frame 0). A clip longer than the wait
// between blows is hurried to fit.
export const atkFrac = (type, until, rate) => {
  const d = PIX[type], clip = d.fig.CLIPS[d.atk], r = rate > 0 ? rate : clip.ms;
  const D = Math.min(clip.ms, r * 0.96), pre = d.hit * D, post = (1 - d.hit) * D, since = r - until;
  if (until <= pre) return d.hit * (1 - Math.max(0, until) / pre);
  if (since >= 0 && since < post) return d.hit + (1 - d.hit) * (since / post);
  return 0;
};
// a walk as the old four-frame count (0..4), for a foe from the ground it has covered...
export const walkByGait = (type, gait, id) => frac((gait || 0) / (PIX[type].per || 2.5) + (id || 0) * 0.37) * 4;
// ...and for a soldier from the clock (they march at one pace)
export const walkByTime = (type, time, id) => frac((time * 1000) / PIX[type].fig.CLIPS.walk.ms + (id || 0) * 0.37) * 4;

// ---- light on the board ---------------------------------------------------------
// Whatever burns this frame: draw.js clears the list, adds a light for each
// fire (a Dragonbreath jet is a few along its length), then draws the crowd.
// A light: { x, y, r, col, k } in board units; k its strength 0..1.
export const LIGHTS = [];
export const beginLights = () => { LIGHTS.length = 0; };
export const addLight = (x, y, r, col, k) => { if (k > 0.02) LIGHTS.push({ x, y, r, col, k }); };
// the strongest light reaching a point: { k (in fifths), col, dx } or null
export const lightAt = (x, y) => {
  let best = null, bk = 0;
  for (const L of LIGHTS) {
    const d = Math.hypot(L.x - x, (L.y - y) * 1.3);
    if (d >= L.r) continue;
    // full strength over the inner 40%, falling away to the rim
    const k = L.k * Math.min(1, (1 - d / L.r) / 0.6);
    if (k > bk) { bk = k; best = L; }
  }
  if (!best) return null;
  const k = Math.round(bk * 5) / 5;
  return k > 0 ? { k, col: best.col, dx: best.x - x } : null;
};
// the rim overlay for a frame lit from one side: `toward` +1 the light is ahead of the
// figure (the way it faces), -1 behind it
export const pixRim = (rec, toward, col) => rimOf(rec, [toward, -0.35], col);

// ---- icons ------------------------------------------------------------------------
// A figure standing, cropped to its own pixels (menus frame icons by the rig's
// box, and a pix box has room for a swung sword in it).
const ICONS = new Map();
export const pixIcon = (type) => {
  let ic = ICONS.get(type);
  if (ic) return ic;
  const rec = pixRec(type, "idle", 0), src = rec.cv;
  const d = src.getContext("2d").getImageData(0, 0, src.width, src.height).data;
  let x0 = src.width, x1 = 0, y0 = src.height, y1 = 0;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cv = document.createElement("canvas");
  cv.width = x1 - x0 + 3; cv.height = y1 - y0 + 3;
  cv.getContext("2d").drawImage(src, x0 - 1, y0 - 1, cv.width, cv.height, 0, 0, cv.width, cv.height);
  ic = { cv, w: cv.width / 2, h: cv.height / 2 };
  ICONS.set(type, ic);
  return ic;
};
