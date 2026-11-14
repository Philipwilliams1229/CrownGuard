// ============ PIX HALLS: the new buildings on the board ============
// The pixel sculptor's halls (hall-kit.js, hall-<kind>.js) standing in for the old painters
// (render/halls/<kind>.js), a hall at a time, the way crews.js brought in the new crews. A
// hall file keeps its old painting and adds the new one beside it:
//
//   import * as archerHall from "../pix/hall-archer.js";
//   import { hallOn, hallPix, drawHallBack, drawHallFront } from "../pix/halls.js";
//   ...
//   const H = hallOn() ? hallPix("archer", archerHall, { level, branch, rank4 }, t.id % 3) : null;
//   if (H) drawHallBack(ctx, H, x, y, time); else { ...the old ground, body and their live lights... }
//   ...the crew, exactly as before (the building is built round the crew's old spots)...
//   if (H) drawHallFront(ctx, H, x, y, time); else { ...the old front rail, the old pennant... }
//
// Units: a hall file draws in board units; a pix hall is sculpted in art pixels, two to a
// unit, from the hall's anchor (t.x, t.y). Everything here is a stamp of something baked
// once: the two pictures (BACK behind the crew, FRONT over their shins), the ground shadow,
// each light's overlay, and the frames of what moves (a pennant, a flame). One form bakes in
// a few milliseconds the first time it is drawn (three stonework variants a form, t.id % 3).
// "New sprites" off (Settings > Display) = the old halls, untouched.
import { prefs } from "../../data/prefs.js";
import { toCanvas } from "./pix.js";
import { bakeHall, groundShadow, pennantFrames, flameFrames, sparkFrames, orbFrames, bookFrames } from "./hall-kit.js";

export const hallOn = () => typeof document !== "undefined" && prefs.newSprites !== false;

const BAKES = new Map(), FRAMES = new Map();
export const resetHallBakes = () => { BAKES.clear(); FRAMES.clear(); };
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
export const hallPix = (name, mod, form, seed = 0) => {
  const key = `${name}|${form.level}|${form.branch || ""}|${form.rank4 || ""}|${seed}`;
  let H = BAKES.get(key);
  if (H) return H;
  const b = bakeHall(mod.BOX, mod.build({ level: form.level, branch: form.branch || null, rank4: form.rank4 || null, seed, style: "B" }));
  H = {
    box: mod.BOX, spec: b.spec, back: toCanvas(b.back), front: b.front ? toCanvas(b.front) : null, shadow: shadowOf(b.spec.shadow),
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

const FLICK = [1, 0.84, 0.94, 0.78, 1, 0.9, 0.74, 0.96];
const live = (ctx, H, x, y, time, layer, id) => {
  for (const l of H.spec.live || []) {
    if ((l.layer || "back") !== layer) continue;
    let fr, dy = 0;
    if (l.kind === "pennant") { const fs = framesOf(`pen|${l.col}|${l.len}|${l.pole}|${l.h || 0}|${l.dir || 1}`, () => pennantFrames(l.col, l)); fr = fs[Math.floor(time * 9 + id * 3) % fs.length]; }
    else if (l.kind === "flame") { const fs = framesOf(`flame|${l.w || 0}|${l.h || 0}`, () => flameFrames(l)); fr = fs[Math.floor(time * 11 + id) % fs.length]; }
    else if (l.kind === "spark") { if (prefs.spellLight === false) continue; const fs = framesOf(`spark|${l.col}`, () => sparkFrames(l.col)); fr = fs[Math.floor(time * 7 + (l.ph || 0) + id) % fs.length]; }
    else if (l.kind === "orb") { const fs = framesOf(`orb|${l.col}`, () => orbFrames(l.col)); fr = fs[Math.floor(time * 8) % fs.length]; }
    else if (l.kind === "book") { fr = framesOf("book", () => bookFrames())[0]; dy = Math.round(Math.sin(time * 1.9 + id) * 1.6) / 2; }
    if (fr) stampPix(ctx, fr, x + l.x / 2, y + l.y / 2 + dy);
  }
};
// light on the stone: each baked overlay at its strength now. o.k: { key: 0..1 } for lights the
// hall drives itself (a caster's orb); a torch flickers on its own. "Spell light" off = none.
const glows = (ctx, H, x, y, time, side, o, id) => {
  if (prefs.spellLight === false) return;
  for (const g of H.glows) {
    if (!g[side]) continue;
    const k = o.k && o.k[g.key] != null ? o.k[g.key] : g.key === "torch" ? FLICK[Math.floor(time * 12 + id) % 8] : 1;
    if (k < 0.04) continue;
    const a = ctx.globalAlpha; ctx.globalAlpha = a * Math.min(1, k);
    ctx.drawImage(g[side], x - H.box.ox / 2, y - H.box.oy / 2, H.box.w / 2, H.box.h / 2);
    ctx.globalAlpha = a;
  }
};

// Everything BEHIND the crew: the ground shadow, the building, its flags and flames, light on it.
//   o.id   the tower's id (staggers flags and flicker between neighbours)
//   o.k    light strengths the hall sets (see glows)
export const drawHallBack = (ctx, H, x, y, time, o = {}) => {
  const id = o.id || 0, B = H.box;
  if (H.shadow) stampPix(ctx, H.shadow, x, y);
  ctx.drawImage(H.back, x - B.ox / 2, y - B.oy / 2, B.w / 2, B.h / 2);
  live(ctx, H, x, y, time, "back", id);
  glows(ctx, H, x, y, time, "back", o, id);
};
// What stands IN FRONT of the crew: the near parapet or rail, light on it, front-layer live pieces.
export const drawHallFront = (ctx, H, x, y, time, o = {}) => {
  const id = o.id || 0, B = H.box;
  if (H.front) ctx.drawImage(H.front, x - B.ox / 2, y - B.oy / 2, B.w / 2, B.h / 2);
  glows(ctx, H, x, y, time, "front", o, id);
  live(ctx, H, x, y, time, "front", id);
};
