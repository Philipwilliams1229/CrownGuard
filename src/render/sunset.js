// ============ THE SUN GOING DOWN (2026-11-22; owner's pick: concept C) ============
// Reusable: any painter with a 0..1 "sun clock" can call it (the Blood Moon now; sunsets and night
// maps elsewhere later, CLAUDE.md wishlist). Nothing here tints the whole board: the sunset is told
// by the WORLD (owner, on a flat orange wash: "someone would think their phone is breaking"):
//   - long shadows: every hall, soldier and ground foe throws a shadow down-right that stretches to
//     ~2.5x as the sun sinks, then draws back in a little and darkens under the moon (owner: "the
//     long shadows should also come back in a bit once the moon goes up")
//   - an amber rim on the figures' sunward edge, strong on the outer line, fading as the moon rises
//     (owner: "a bit more amber, maybe a stronger line on the very outer edge, then have that fade
//     too once the moon rises")
//   - the night (the caller's shade), the lamps and the moon's red come in after.
// Concept and clip: sunset-concepts.html (option C), sunset-anim.html.
import { W } from "../data/constants.js";

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// What each part of the scene does at sun clock u (0 day .. 1 full night).
export const sunCurves = (u) => ({
  amber: sm(0, 0.12, u) * (1 - sm(0.5, 0.85, u)),       // the warm rim and rake: up at once, gone as the red takes over
  red: sm(0.45, 1, u),                                   // the moon's red rake, rim and the undead's eyes
  shade: sm(0.3, 0.95, u),                               // the night's shade (ground and actors)
  lamps: sm(0.3, 0.75, u),                               // torches come up as it gets dark
  len: 1 + 1.5 * sm(0, 0.35, u) - 0.9 * sm(0.45, 0.9, u),// shadow length: 2.5x at sunset, 1.6x under the moon
  shadow: sm(0, 0.15, u) * (0.6 + 0.4 * sm(0.45, 0.9, u)), // shadow strength: darker under the moon (it reads on the dark land)
});

// the sun's key light for the figures' rims (pixrigs LIGHTS): far off to the upper left, low
export const SUN_KEY = { x: -170, y: -20, r: 1500, col: "#ff9a2e" };   // deep amber: the burning line must show on pale bone
export const SUN_RIM = 1.8;      // k > 1: past 1 the OUTER LINE alone is stamped again, hot (rigs.js / crews.js; pix.js lightLayer `line`)

// ---- the long shadows: baked per length and width, art-pixel stepped, dithered at the tip ----
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const SHS = new Map();
const DIR = [0.93, 0.37], PERP = [-0.37, 0.93];          // down-right, away from a sun low at the left
const shadowSprite = (L, wd) => {
  const key = L + "|" + wd;
  let s = SHS.get(key);
  if (s) return s;
  const LA = L * 2, WA = wd * 2, ox = Math.ceil(WA) + 2, oy = Math.ceil(WA) + 2;
  const w = Math.ceil(LA * DIR[0] + ox + WA + 4), h = Math.ceil(LA * DIR[1] + oy + WA + 4);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const rx = i + 0.5 - ox, ry = j + 0.5 - oy, al = rx * DIR[0] + ry * DIR[1], ac = rx * PERP[0] + ry * PERP[1];
    if (al < -WA * 0.6 || al > LA) continue;
    const t = Math.max(0, al / LA), half = WA * (1 - 0.82 * t) * (al < 0 ? Math.sqrt(1 + al / (WA * 0.6)) : 1);
    if (Math.abs(ac) > half) continue;
    if (t > 0.62 && BAYER[(j & 3) * 4 + (i & 3)] < (t - 0.62) * 2.2) continue;
    const o = (j * w + i) * 4;
    d[o] = 22; d[o + 1] = 10; d[o + 2] = 26; d[o + 3] = Math.abs(ac) > half - 1.2 ? 120 : 160;
  }
  c.putImageData(img, 0, 0);
  s = { cv, w, h, ox, oy };
  SHS.set(key, s);
  if (SHS.size > 120) SHS.delete(SHS.keys().next().value);
  return s;
};

// Lay them under everything standing (call it in a ground pass). len: x the base length; a: strength.
export const drawLongShadows = (ctx, g, len, a) => {
  if (a < 0.01) return;
  const pa = ctx.globalAlpha, op = ctx.globalCompositeOperation;
  ctx.globalAlpha = a; ctx.globalCompositeOperation = "source-over";
  const one = (x, y, L0, wd) => {
    if (x < -40 || x > W + 40) return;
    const sp = shadowSprite(Math.max(3, Math.round(L0 * len)), Math.max(1, Math.round(wd)));
    ctx.drawImage(sp.cv, Math.round(x * 2) / 2 - sp.ox / 2, Math.round(y * 2) / 2 - sp.oy / 2, sp.w / 2, sp.h / 2);
  };
  for (const t of g.towers) one(t.x + 2, t.y + 3, 34, 11);
  for (const b of g.bands || []) for (const u of b.units || []) if (u.x != null && !u.dead && !u.gone) one(u.x + 1, u.y + 9, 8, 2.6);
  for (const e of g.enemies) if (!e.dead && !e.flying && !e.submerged && e.x != null) one(e.x + 1.5, e.y + e.size * 0.55, e.size * 0.9, Math.max(1.8, e.size * 0.2));
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = op;
};
