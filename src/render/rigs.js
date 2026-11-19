// ============ RIGS ============
// Every creature on the road and every soldier on the field is a figure from the pixel
// sculptor (pix/pixrigs.js PIX: both facings baked, one sun). This file is the door the board
// draws them through (drawRig, rigFrame, rigDef, rigPixels), plus the old painters of the two
// sea monsters that have no new figure yet (kraken, krakenarm: rigs-rimebeasts.js).
// Sheets: "walk", "fight", and for fliers "fly" (4 frames each).

import { bakeSprite, PX } from "./paint.js";
import { netify } from "./netlook.js";
import { RIMEBEAST_RIGS, RIMEBEAST_PAINTERS } from "./rigs-rimebeasts.js";
import "./rigs-eagle.js";   // registers the eagle in PIX (pix/pixrigs.js)
import { PIX, hasPix, pixBox, pixRec, lightAt, pixRim, isViewSheet } from "./pix/pixrigs.js";
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

// A raised foe's whole figure is turned to a corpse: the baked pixels keep their light and shade
// but are drained onto a sallow bone ramp (ivory lights, grey-green shadows), cloth and leather
// keep a hint of their old colour as rotted rags, the outline stays dark, the witch-fire eyes
// stay lit in dark sockets, and the ribs show only across the chest. (Done on the finished
// sprite, so every rig gets it; it measures the figure once per frame: outline, eyes, torso.)
const BONE_LO = [46, 52, 40], BONE_MID = [160, 156, 124], BONE_HI = [236, 228, 192];
const boneify = (cv) => {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height;
  const img = c.getImageData(0, 0, W, H), d = img.data, n = W * H;
  const solid = new Uint8Array(n), eye = new Uint8Array(n);
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (d[i + 3] < 8) continue;
    solid[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < x0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  // the eyes: the figures draw them as a few bright warm pixels in the head, in the figure's top part
  for (let p = 0; p < n; p++) {
    if (!solid[p]) continue;
    const i = p * 4, y = (p / W) | 0;
    if (y < y0 + bh * 0.45 && ((d[i] > 165 && d[i] > d[i + 1] + 60 && d[i] > d[i + 2] + 60) || (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 90))) eye[p] = 1;   // red, orange or yellow
  }
  // each eye gets its OWN hollow: eye pixels are grouped by column, and a socket grows from a
  // group's box out to the sides and down, never across to its neighbour (the bone between stays light)
  const sr = bh > 80 ? 1 : 2;
  const sock = new Uint8Array(n), cheek = new Uint8Array(n);
  const cols = [];
  for (let p = 0; p < n; p++) if (eye[p]) cols.push(p);
  const groups = [];
  cols.sort((a, b) => (a % W) - (b % W));
  for (const p of cols) {
    const x = p % W, y = (p / W) | 0, g = groups[groups.length - 1];
    if (g && x - g.x1 <= 2) { g.x1 = x; if (y < g.y0) g.y0 = y; if (y > g.y1) g.y1 = y; }
    else groups.push({ x0: x, x1: x, y0: y, y1: y });
  }
  groups.forEach((g, gi) => {
    const L = gi > 0 ? 0 : sr, R = gi < groups.length - 1 ? 0 : sr;   // never toward the other eye
    for (let yy = g.y0; yy <= g.y1 + sr; yy++) for (let xx = g.x0 - L; xx <= g.x1 + R; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx; if (solid[q] && !eye[q]) sock[q] = 1;
    }
  });
  // the ribcage: a torso band of an upright figure (not the beasts: they are long, not tall)
  const upright = bh > bw * 1.05 && H < 100;   // (a troll's chest is mostly arm: no ribs)
  const rt = y0 + bh * 0.38, rb = y0 + bh * 0.66, rcx = (x0 + x1) / 2, rhw = bw * 0.2;
  for (let p = 0; p < n; p++) {
    if (!solid[p]) continue;
    const i = p * 4, x = p % W, y = (p / W) | 0;
    if (eye[p]) { d[i] = 150; d[i + 1] = 255; d[i + 2] = 110; continue; }   // the witch-fire eye
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    // edge of the figure: kept dark as the outline
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !solid[p - 1] || !solid[p + 1] || !solid[p - W] || !solid[p + W];
    // how coloured the pixel was: skin and cloth are, steel and bone mostly are not
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0 ? (mx - mn) / mx : 0;
    let t = Math.min(1, Math.max(0, (luma - 36) / 175));              // 0 dark .. 1 light
    t = Math.round(t * 5) / 5;                                        // five steps: shading stays, noise goes
    let R, G, B;
    if (t < 0.5) { const k = t / 0.5; R = BONE_LO[0] + (BONE_MID[0] - BONE_LO[0]) * k; G = BONE_LO[1] + (BONE_MID[1] - BONE_LO[1]) * k; B = BONE_LO[2] + (BONE_MID[2] - BONE_LO[2]) * k; }
    else { const k = (t - 0.5) / 0.5; R = BONE_MID[0] + (BONE_HI[0] - BONE_MID[0]) * k; G = BONE_MID[1] + (BONE_HI[1] - BONE_MID[1]) * k; B = BONE_MID[2] + (BONE_HI[2] - BONE_MID[2]) * k; }
    // rags: coloured cloth and leather keep a quarter of their own hue, dimmed (skin green is dropped)
    const skin = g > r && g >= b;
    if (sat > 0.22 && !skin) { const m = 0.28; R = R * (1 - m) + r * 0.7 * m * 1.6 * 0.6; G = G * (1 - m) + g * 0.7 * m * 1.6 * 0.6; B = B * (1 - m) + b * 0.7 * m * 1.6 * 0.6; R *= 0.78; G *= 0.78; B *= 0.78; }
    else if (skin && sat > 0.18) { R *= 0.97; G *= 0.97; B *= 0.9; }  // sallow, gone off
    if (edge || luma < 40) { R = Math.min(R, 34); G = Math.min(G, 40); B = Math.min(B, 32); }
    if (sock[p]) { R = 22; G = 26; B = 22; }
    else if (cheek[p]) { R *= 0.62; G *= 0.68; B *= 0.6; }
    else if (upright && y > rt && y < rb && Math.abs(x - rcx) < rhw && t > 0.2) {
      const row = (y - rt) / 6 | 0;                                   // ribs: dark gaps, rows 3 art px apart, short at the ends
      const ph = ((y - rt) % 6);
      if (ph < 2 && Math.abs(x - rcx) < rhw - Math.abs(row - 2) * 2) { R *= 0.55; G *= 0.6; B *= 0.52; }
    }
    d[i] = R; d[i + 1] = G; d[i + 2] = B;
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
  else if (variant === "net") { const big = netify(cv); if (big) return (looks[variant] = big); }   // (a net may spill past the frame: netify's canvas carries `.pad`)
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
  const left = dir < 0 && !isViewSheet(sheet), rec = pixRec(type, sheet, frame, left, aim), w = rec.cv.width / 2, h = rec.cv.height / 2, ax = rec.ox / 2, ay = rec.oy / 2;
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (left) ctx.scale(-1, 1);
  const look = lookOf(rec, variant), pad = (look.pad || 0) / 2;
  ctx.drawImage(look, -ax - pad, -ay - pad, look.width / 2, look.height / 2);
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
  if (variant === "net") { const big = netify(cv, PX); if (big) { sp = { cv: big, ax: hw + (big.pad || 0) / PX, ay: up + (big.pad || 0) / PX }; CACHE.set(key, sp); return sp; } }
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
