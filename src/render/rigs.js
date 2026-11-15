// ============ RIGS ============
// Every creature on the road and every soldier on the field is a figure from the pixel
// sculptor (pix/pixrigs.js PIX: both facings baked, one sun). This file is the door the board
// draws them through (drawRig, rigFrame, rigDef, rigPixels), plus the old painters of the two
// sea monsters that have no new figure yet (kraken, krakenarm: rigs-rimebeasts.js).
// Sheets: "walk", "fight", and for fliers "fly" (4 frames each).

import { bakeSprite, PX } from "./paint.js";
import { RIMEBEAST_RIGS, RIMEBEAST_PAINTERS } from "./rigs-rimebeasts.js";
import "./rigs-eagle.js";   // registers the eagle in PIX (pix/pixrigs.js)
import { PIX, hasPix, pixBox, pixRec, lightAt, pixRim } from "./pix/pixrigs.js";
import { prefs } from "../data/prefs.js";

// ---- the roster ----------------------------------------------------------------
// Every type with a figure in pix/pixrigs.js is a rig of that figure: its box (world units,
// symmetric about the feet) and four fight frames. The old painters are gone; the sea
// monsters with no new figure yet (the kraken and its arm) keep theirs (rigs-rimebeasts.js).
// Each entry: { box: { hw, up, down }, fightN, fly?, pix? } (the kraken's: kind and p, for its painter)
export const RIGS = {};
const PAINTERS = {};
Object.assign(RIGS, RIMEBEAST_RIGS); Object.assign(PAINTERS, RIMEBEAST_PAINTERS);
// (a flier's walk sheet is its wingbeat, on the clock, not the ground it covers)
const FLIERS = new Set(["bat", "dragon", "gryphon", "gryphonMount", "wraith", "wight", "icedrake", "eagle"]);
for (const type of Object.keys(PIX)) RIGS[type] = { box: pixBox(type), fightN: 4, pix: true, fly: FLIERS.has(type) };

// A raised foe's whole figure is turned to bone: the baked pixels are posterised
// onto a bone ramp (lights ivory, mids dull bone, darks rotted rags), the way a
// skeleton's carved from one stuff, with rib-like bars across the mids and
// the witch-fire eyes left alone. (Done on the finished sprite, so every rig —
// biped, beast, troll — gets it without a line of its own.)
const BONE = [[168, 238, 230, 204], [128, 206, 194, 160], [88, 150, 136, 108]];   // [min luma, r, g, b]
const boneify = (cv) => {
  const c = cv.getContext("2d");
  const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (g > 150 && g > r + 28 && g > b + 8) continue;                       // the witch-fire eyes
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    const x = (i / 4) % cv.width | 0, y = (i / 4 / cv.width) | 0;
    let tone = BONE.find((t) => luma >= t[0]);
    if (tone) {
      // ribs and seams: short dark bars over the mid-bone, in rows, as if the
      // flesh has gone and the ribcage shows through
      if (tone === BONE[1] && y % 4 === 0 && (x >> 1) % 3 !== 0) tone = BONE[2];
      d[i] = tone[1]; d[i + 1] = tone[2]; d[i + 2] = tone[3];
    } else {
      // rags and shadow: kept dark, drained of colour, a touch of grave-green
      const k = Math.max(18, luma * 0.8);
      d[i] = k * 1.0; d[i + 1] = k * 0.95; d[i + 2] = k * 0.8;
    }
  }
  c.putImageData(img, 0, 0);
};

export const hasRig = (type) => !!RIGS[type];
export const rigDef = (type) => RIGS[type];
export { hasPix };

// ---- the new figures behind the old doors ------------------------------------
// A pix frame's looks, made once each: "white" (the hit flash), "revived" (bone).
const lookOf = (rec, variant) => {
  if (!variant) return rec.cv;
  const looks = rec.looks || (rec.looks = {});
  if (looks[variant]) return looks[variant];
  const cv = document.createElement("canvas"); cv.width = rec.cv.width; cv.height = rec.cv.height;
  const c = cv.getContext("2d"); c.drawImage(rec.cv, 0, 0);
  if (variant === "white") { c.globalCompositeOperation = "source-in"; c.fillStyle = "#f4f2ea"; c.fillRect(0, 0, cv.width, cv.height); }
  else if (variant === "revived") boneify(cv);
  return (looks[variant] = cv);
};
// rigFrame's answer for a pix type: the frame set in the rig's symmetric box, as
// every caller that measures or copies a frame expects (icons, the death crumble)
const pixSprite = (type, sheet, frame, variant) => {
  const rec = pixRec(type, sheet, frame), key = "box" + variant;
  if (rec[key]) return rec[key];
  const b = pixBox(type), cv = document.createElement("canvas");
  cv.width = b.hw * 4; cv.height = rec.cv.height;
  cv.getContext("2d").drawImage(lookOf(rec, variant), b.hw * 2 - rec.ox, 0);
  return (rec[key] = { cv, ax: b.hw, ay: b.up });
};
// drawRig's work for a pix type: the frame baked for the way it faces (one sun),
// then whatever light falls on it, its own glow, and its blow's effect
const drawPix = (ctx, type, x, y, dir, sheet, frame, variant, alpha, aim) => {
  const left = dir < 0, rec = pixRec(type, sheet, frame, left, aim), w = rec.cv.width / 2, h = rec.cv.height / 2, ax = rec.ox / 2, ay = rec.oy / 2;
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (left) ctx.scale(-1, 1);
  ctx.drawImage(lookOf(rec, variant), -ax, -ay, w, h);
  if (!variant) {
    if (prefs.spellLight !== false) {
      const L = lightAt(x, y);
      if (L) { const a = ctx.globalAlpha; ctx.globalAlpha = a * L.k; ctx.drawImage(pixRim(rec, (L.dx >= 0 ? 1 : -1) * (left ? -1 : 1), L.col), -ax, -ay, w, h); ctx.globalAlpha = a; }
      if (rec.glow) ctx.drawImage(rec.glow, -ax, -ay, w, h);
    }
    if (rec.fx && PIX[type].fx) ctx.drawImage(rec.fx, -ax, -ay, w, h);
  }
  ctx.restore();
};

const CACHE = new Map();
export const resetRigBakes = () => CACHE.clear();

// A baked frame: { cv, ax, ay } with the anchor (feet, centre) inside it.
export const rigFrame = (type, sheet, frame, variant = "") => {
  if (hasPix(type)) return pixSprite(type, sheet, frame, variant);
  // the old rigs know walk and fight sheets and whole frames: a standing soldier is walk 0
  if (sheet === "idle" || sheet === "atk") { sheet = sheet === "atk" ? "fight" : "walk"; frame = 0; }
  if (typeof frame === "number") frame = Math.floor(frame);
  const key = `${type}|${sheet}|${frame}|${variant}`;
  let sp = CACHE.get(key);
  if (sp) return sp;
  const def = RIGS[type];
  const { hw, up, down } = def.box;
  let p = def.p;
  // "sky": a bowman's fight frames with the aim raised high (Wren's Arrow
  // Volley, rigs-crown.js); any other rig paints it as its fight
  const pose = sheet === "fight" || sheet === "sky" || sheet === "sweep" ? "fight" : "walk";
  const cv = bakeSprite(hw * 2, up + down, (c) => { c.translate(hw, up); PAINTERS[def.kind](c, { ...p, pose, frame, sky: sheet === "sky", sweep: sheet === "sweep" }); });
  // the painter leaves its scale and anchor on the context; flood in pixels
  if (variant === "white") { const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = "#f4f2ea"; c.fillRect(0, 0, cv.width, cv.height); }
  if (variant === "revived") boneify(cv);
  sp = { cv, ax: hw, ay: up };
  CACHE.set(key, sp);
  return sp;
};

export const drawRig = (ctx, type, x, y, dir, sheet, frame, variant = "", alpha = 1, aim = 0) => {
  if (hasPix(type)) { drawPix(ctx, type, x, y, dir, sheet, frame, variant, alpha, aim); return; }
  const { cv, ax, ay } = rigFrame(type, sheet, frame, variant);
  const w = cv.width / PX, h = cv.height / PX;
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  if (dir >= 0) ctx.drawImage(cv, x - ax, y - ay, w, h);
  else { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore(); }
  if (alpha !== 1) ctx.restore();
};

// The pixels of a frame, for the death crumble: [[dx, dy, colour], ...] in
// world units from the anchor, sampled every other art pixel.
export const rigPixels = (type, variant = "") => {
  const key = `${type}|px|${variant}`;
  let px = CACHE.get(key);
  if (px) return px;
  const { cv, ax, ay } = rigFrame(type, "walk", 0, variant);
  const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  px = [];
  for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
    const i = (y * cv.width + x) * 4;
    if (d[i + 3] > 120) px.push([(x - ax * PX) / PX, (y - ay * PX) / PX, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]);
  }
  CACHE.set(key, px);
  return px;
};
