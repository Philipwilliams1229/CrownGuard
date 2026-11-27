// ============ PIX HALLS: the new buildings on the board ============
// The pixel sculptor's halls (hall-kit.js, hall-<kind>.js) on the board. A hall file
// (render/halls/<kind>.js) bakes its building here and paints only what moves:
//
//   import * as archerHall from "../pix/hall-archer.js";
//   import { hallPix, drawHallBack, drawHallFront } from "../pix/halls.js";
//   ...
//   const H = typeof document !== "undefined" ? hallPix("archer", archerHall, { level, branch, rank4 }, t.id % 3) : null;
//   if (H) drawHallBack(ctx, H, x, y, time);
//   ...the crew (the building is built round the crew's spots in engine/muzzles.js)...
//   if (H) drawHallFront(ctx, H, x, y, time);
//
// Units: a hall file draws in board units; a pix hall is sculpted in art pixels, two to a
// unit, from the hall's anchor (t.x, t.y). Everything here is a stamp of something baked
// once: the two pictures (BACK behind the crew, FRONT over their shins), the ground shadow,
// each light's overlay, and the frames of what moves (a pennant, a flame). One form bakes in
// a few milliseconds the first time it is drawn (three stonework variants a form, t.id % 3).
import { prefs } from "../../data/prefs.js";
import { lampsOn, nightOn, noteLamp } from "../nightlight.js";
import { stampTorch, torchLate } from "../torchflame.js";
const per7 = (v) => ((v % 7) + 7) % 7;
import { noteHall, hallRim } from "../sunset.js";
import { toCanvas } from "./pix.js";
import { onDay, DAY } from "../../data/sun.js";
import { bakeHall, groundShadow, pennantFrames, flameFrames, sparkFrames, orbFrames, bookFrames } from "./hall-kit.js";
import { release, releaseDeep } from "../release.js";

const BAKES = new Map(), FRAMES = new Map();
// a fire's colour: red-orange to yellow (red high, green above blue); anything else is magic light
const WARM = new Map();
const isWarm = (col) => {
  let w = WARM.get(col);
  if (w === undefined) { const [r, g, b] = [1, 3, 5].map((i) => parseInt(String(col).slice(i, i + 2), 16)); w = r >= 200 && r > b + 60 && g >= b + 20; WARM.set(col, w); }
  return w;
};
export const resetHallBakes = () => { releaseDeep(BAKES); releaseDeep(FRAMES); BAKES.clear(); FRAMES.clear(); };
onDay(resetHallBakes);   // a new sun: every hall is sculpted again from its side
const sprite = (img) => ({ cv: toCanvas(img), ox: img.ox, oy: img.oy });
const framesOf = (key, make) => { let f = FRAMES.get(key); if (!f) FRAMES.set(key, (f = make().map(sprite))); return f; };
// the shadow a hall lays on the turf: rows of whole pixels, in a small picture of its own
const shadowOf = (sh) => {
  if (!sh) return null;
  const rows = groundShadow(sh.rx, sh.ry, sh);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [y, a, b] of rows) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cv = document.createElement("canvas"); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
  const c = cv.getContext("2d"); c.fillStyle = "rgba(42,28,44,0.30)";
  for (const [y, a, b] of rows) c.fillRect(a - x0, y - y0, b - a + 1, 1);
  return { cv, ox: -x0, oy: -y0 };
};

// A hall's baked record. name: the kind (the cache's key); mod: its module ({ BOX, build });
// form: { level, branch, rank4 }; seed: the stonework variant (t.id % 3).
// o.flip: bake it for a hall drawn MIRRORED (a machine that turns to its target: pass the same
// record to drawHallBack / drawHallFront with dir: -1), so the sun stays in the upper left.
export const hallPix = (name, mod, form, seed = 0, o = {}) => {
  const key = `${name}|${form.level}|${form.branch || ""}|${form.rank4 || ""}|${seed}|${o.flip ? 1 : 0}`;
  let H = BAKES.get(key);
  if (H) return H;
  const b = bakeHall(mod.BOX, mod.build({ level: form.level, branch: form.branch || null, rank4: form.rank4 || null, seed, style: "B" }), { flip: !!o.flip });
  H = {
    name, box: mod.BOX, spec: b.spec, back: toCanvas(b.back), front: b.front ? toCanvas(b.front) : null, shadow: shadowOf(b.spec.shadow),
    glows: b.glows.map((g) => ({ key: g.key, back: toCanvas(g.back), front: g.front ? toCanvas(g.front) : null })),
  };
  BAKES.set(key, H);
  return H;
};

// stamp an art-pixel picture with its anchor at (x, y) board units; dir -1 mirrors it (bake it with flip for one sun)
export const stampPix = (ctx, s, x, y, dir = 1) => {
  const w = s.cv.width / 2, h = s.cv.height / 2;
  if (dir >= 0) { ctx.drawImage(s.cv, x - s.ox / 2, y - s.oy / 2, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(s.cv, -s.ox / 2, -s.oy / 2, w, h); ctx.restore();
};
// a one-off picture a hall bakes for itself (a machine in two states): cached by key
export const pixSprite = (key, make) => { let s = FRAMES.get("one|" + key); if (!s) FRAMES.set("one|" + key, (s = sprite(make()))); return s; };

// one of a hall's box-sized pictures, mirrored about the anchor when dir < 0
const lay = (ctx, cv, H, x, y, dir) => {
  const B = H.box;
  if (dir >= 0) { ctx.drawImage(cv, x - B.ox / 2, y - B.oy / 2, B.w / 2, B.h / 2); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -B.ox / 2, -B.oy / 2, B.w / 2, B.h / 2); ctx.restore();
};
const FLICK = [1, 0.84, 0.94, 0.78, 1, 0.9, 0.74, 0.96];
const live = (ctx, H, x, y, time, layer, id, dir = 1) => {
  for (const l of H.spec.live || []) {
    if ((l.layer || "back") !== layer) continue;
    let fr, dy = 0;
    if (l.kind === "pennant") { const fs = framesOf(`pen|${l.col}|${l.len}|${l.pole}|${l.h || 0}|${l.dir || 1}|${l.swallow ? 1 : 0}`, () => pennantFrames(l.col, l)); fr = fs[Math.floor(time * 9 + id * 3) % fs.length]; }
    else if (l.kind === "flame") {
      // the owner's Round 20 A (render/torchflame.js); under the Blood Moon drawn over the night's shade (a fire is a light)
      const fx = x + (dir < 0 ? -1 : 1) * l.x / 2, fy = y + l.y / 2, fw = l.w || 5, fh = l.h || 9, sd = per7(Math.round(l.x) * 7 + Math.round(l.y) * 3 + id);
      if (nightOn(time)) torchLate(ctx, (c) => stampTorch(c, fx, fy, fw, fh, time, sd, id));
      else stampTorch(ctx, fx, fy, fw, fh, time, sd, id);
      continue;
    }
    else if (l.kind === "spark") { if (prefs.spellLight === false) continue; const fs = framesOf(`spark|${l.col}`, () => sparkFrames(l.col)); fr = fs[Math.floor(time * 7 + (l.ph || 0) + id) % fs.length]; }
    else if (l.kind === "orb") { const fs = framesOf(`orb|${l.col}`, () => orbFrames(l.col)); fr = fs[Math.floor(time * 8) % fs.length]; }
    else if (l.kind === "book") { fr = framesOf("book", () => bookFrames())[0]; dy = Math.round(Math.sin(time * 1.9 + id) * 1.6) / 2; }
    if (fr) stampPix(ctx, fr, x + (dir < 0 ? -1 : 1) * l.x / 2, y + l.y / 2 + dy);     // a mirrored hall moves its flag across; the flag still flies with the wind
  }
};
// light on the stone: each baked overlay at its strength now. o.k: { key: 0..1 } for lights the
// hall drives itself (a caster's orb); a torch flickers on its own. "Spell light" off = none.
const glows = (ctx, H, x, y, time, side, o, id, dir = 1) => {
  if (prefs.spellLight === false) return;
  for (const g of H.glows) {
    if (!g[side]) continue;
    const k = o.k && o.k[g.key] != null ? o.k[g.key] : g.key === "torch" ? FLICK[Math.floor(time * 12 + id) % 8] : 1;
    if (k < 0.04) continue;
    const a = ctx.globalAlpha; ctx.globalAlpha = a * Math.min(1, k);
    lay(ctx, g[side], H, x, y, dir);
    ctx.globalAlpha = a;
  }
};

// Everything BEHIND the crew: the ground shadow, the building, its flags and flames, light on it.
//   o.id   the tower's id (staggers flags and flicker between neighbours)
//   o.k    light strengths the hall sets (see glows)
//   o.dir  -1: the hall drawn mirrored (bake it with hallPix's flip)
export const drawHallBack = (ctx, H, x, y, time, o = {}) => {
  const id = o.id || 0, dir = o.dir < 0 ? -1 : 1;
  // at night (render/nightlight.js) each torch / lamp of the hall is a light on the board
  // Every light the hall carries (owner, 2026-11-22): warm ones (torches, lanterns, forges, furnaces, fires)
  // as warm pools, magic ones (orbs, crystals, coils) in their own colour, smaller and softer; reach capped
  // so a big torch matches the rest (the River Watch's beacon was a huge square of light)
  // the Covert stays dark: assassins don't light their camp (owner, 2026-11-22)
  if (lampsOn(time) && prefs.spellLight !== false && H.name !== "assassin") for (const l of H.spec.lights || []) {
    const on = o.k && o.k[l.key] != null ? o.k[l.key] : l.k ?? 1;
    if (on < 0.05) continue;
    const warm = isWarm(l.col);
    noteLamp(x + dir * l.x / 2, y + l.y / 2, Math.min(l.r, warm ? 24 : 18) / 2, l.col, (l.a ?? 0.7) * Math.min(1, on + 0.3) * (warm ? 1 : 0.75), -l.y / 2, !warm);
  }
  if (H.shadow && !DAY.on) stampPix(ctx, H.shadow, x, y);   // under a fixed sun the hall throws its own cast shadow (render/dayshadows.js)
  lay(ctx, H.back, H, x, y, dir);
  noteHall(H, x, y, dir, time, ctx.globalAlpha); hallRim(ctx, H, x, y, dir, "back", time);   // the setting sun (render/sunset.js)
  live(ctx, H, x, y, time, "back", id, dir);
  glows(ctx, H, x, y, time, "back", o, id, dir);
};
// What stands IN FRONT of the crew: the near parapet or rail, light on it, front-layer live pieces.
export const drawHallFront = (ctx, H, x, y, time, o = {}) => {
  const id = o.id || 0, dir = o.dir < 0 ? -1 : 1;
  if (H.front) { lay(ctx, H.front, H, x, y, dir); hallRim(ctx, H, x, y, dir, "front", time); }
  glows(ctx, H, x, y, time, "front", o, id, dir);
  live(ctx, H, x, y, time, "front", id, dir);
};
