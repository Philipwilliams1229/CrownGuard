// ============ WHERE A HALL MEETS THE GROUND ============
// Every hall stands on its own worked pad, and on its own that pad ends in a
// hard line. This paints the realm's own ground back over that line: a few
// clumps round the rim BEHIND the hall (drawn first), and a few more across
// the FRONT of its footing (drawn after), so the base sinks into meadow
// grass, snow drifts, marsh reeds, ash and cinders, or cropped highland turf
// — whatever the board is made of.
//
// It keeps to the rim of the hall's footprint (buildkit FOOT, or kitB
// FOOT_NARROW for a narrow hall) and leaves the middle of the front clear,
// where doors, crews and campfires stand. Baked once per realm, footprint
// and variant, then stamped: a packed board pays one drawImage per layer.

import { REALM } from "../data/maps.js";
import { TOWERS } from "../data/towers.js";
import { bakeSprite, PX, hash, mix, lighten, darken, ball, shadow, blade, tuft, soft, rgba } from "./paint.js";

const FEET = {
  wide: { dy: 3, rx: 18, ry: 13 },
  narrow: { dy: 3, rx: 13, ry: 9 },
};
const VARIANTS = 4;
const BOX = { w: 48, h: 30, ax: 24, ay: 12 };   // the baked patch, anchored on the hall

// which ground this realm is made of, read from its weather and grass
export const groundKind = (r = REALM) => {
  if (r.ambient === "snow") return "snow";
  if (r.ambient === "wisps" || r.ambient === "fireflies") return "marsh";
  if (r.ambient === "dust") return "turf";
  if (r.ambient === "embers" && r.id === "ember") return "ash";
  return "grass";
};

// ---- one clump of each kind of ground ----------------------------------------
const clump = (c, kind, x, y, s, seed, r) => {
  if (kind === "snow") {
    // a low drift banked against the footing: pale on top, blue in its shade
    shadow(c, x + 0.8, y + 0.9, 3.6 * s, 1 * s, 0.12);
    ball(c, x, y - 0.3 * s, 3.6 * s, 1.3 * s, lighten(r.GRASS_LT, 0.15), { hi: 0.35, lo: 0.2 });
    ball(c, x + 1.8 * s, y + 0.1 * s, 2 * s, 0.9 * s, r.GRASS_LT, { hi: 0.3, lo: 0.25 });
    return;
  }
  if (kind === "ash") {
    // cinders and a dry, singed tuft
    for (let i = 0; i < 3; i++) {
      const px = x + (hash(seed, i) - 0.5) * 6 * s, py = y + (hash(seed, i + 3) - 0.3) * 2 * s;
      shadow(c, px + 0.6, py + 0.8, 1.8 * s, 0.8 * s, 0.2);
      ball(c, px, py, (1.2 + hash(seed, i + 6)) * s, (0.8 + hash(seed, i + 6) * 0.5) * s, mix("#5a4c46", "#3a302c", hash(seed, i + 9)), { hi: 0.4, lo: 0.4 });
    }
    tuft(c, x + 1, y, 0.45 * s, "#4a3a2c", "#8a6a44", seed, { n: 3, wind: 0.4 });
    return;
  }
  if (kind === "marsh") {
    // moss hummocks and a few reeds standing up out of them
    ball(c, x, y - 0.4 * s, 3.4 * s, 1.6 * s, r.GRASS_LT, { hi: 0.4, lo: 0.4 });
    const n = 2 + Math.floor(hash(seed, 2) * 2);
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * 1.6 * s, len = (4 + hash(seed, i + 11) * 3.5) * s;
      blade(c, bx, y - 0.5, bx + (hash(seed, i + 4) - 0.4) * 2, y - len, 0.7 * s, darken(r.TUFT, 0.1), lighten(r.GRASS_LT, 0.25), 0.4);
    }
    if (hash(seed, 5) > 0.65) ball(c, x + 1.6 * s, y - 5.5 * s, 0.8 * s, 1.4 * s, "#6a4a30", { hi: 0.4, lo: 0.4 });   // a bulrush head
    return;
  }
  if (kind === "turf") {
    // cropped highland turf: low tufts and a pale pebble
    tuft(c, x, y, 0.42 * s, r.TUFT, r.GRASS_LT, seed, { n: 3 + Math.floor(hash(seed, 3) * 2) });
    if (hash(seed, 8) > 0.45) {
      const px = x + (hash(seed, 9) > 0.5 ? 3 : -3) * s;
      shadow(c, px + 0.6, py0(y) + 0.8, 1.8 * s, 0.7 * s, 0.2);
      ball(c, px, py0(y), 1.5 * s, 1 * s, r.PEBBLE || "#c8c0ac", { hi: 0.5, lo: 0.45 });
    }
    return;
  }
  // meadow grass, now and then a clover leaf at its root
  tuft(c, x, y, 0.55 * s, r.TUFT, r.GRASS_LT, seed, { n: 3 + Math.floor(hash(seed, 3) * 3) });
  if (hash(seed, 8) > 0.6) ball(c, x + 2.5 * s, y + 0.3, 1.3 * s, 0.9 * s, r.GRASS_DK, { hi: 0.3, lo: 0.3 });
};
const py0 = (y) => y + 0.5;

// Where the clumps go round the rim: the back layer takes the far sides, the
// front layer the near quarters — never the middle of the front.
const BACK_ANGLES = [188, 206, 334, 352];
const FRONT_ANGLES = [6, 26, 154, 174];   // the footing's corners only: yard props stand in x ± 9

const paintPatch = (c, F, kind, variant, front) => {
  const r = REALM;
  const cx = BOX.ax, cy = BOX.ay;
  const angles = front ? FRONT_ANGLES : BACK_ANGLES;
  if (!front) {
    // feather the edge of the worked pad into the realm's own ground
    soft(c, cx, cy + F.dy + 1, F.rx + 4, F.ry * 0.62 + 3, [[0, rgba(r.GRASS, 0)], [0.72, rgba(r.GRASS, 0)], [0.86, rgba(r.GRASS, 0.32)], [1, rgba(r.GRASS, 0)]]);
  }
  angles.forEach((deg, i) => {
    const seed = variant * 31 + i * 7 + (front ? 100 : 0);
    if (hash(seed, 1) < 0.18) return;   // a gap here and there
    const a = ((deg + (hash(seed, 2) - 0.5) * 12) * Math.PI) / 180;
    const k = 0.88 + hash(seed, 3) * 0.14;
    const x = cx + Math.cos(a) * F.rx * k;
    const y = cy + F.dy + Math.sin(a) * F.ry * k * (front ? 0.62 : 0.75);
    const edgeK = 1;
    const s = (F.rx < 16 ? 0.62 : 0.75) * edgeK * (kind === "grass" || kind === "turf" ? 1.25 : 1);
    clump(c, kind, x, y, s * (0.85 + hash(seed, 4) * 0.3), seed, r);
  });
};

const cache = new Map();
const patch = (fp, variant, front) => {
  const kind = groundKind();
  const key = `${REALM.id}|${kind}|${fp}|${variant}|${front ? "f" : "b"}|${PX}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = bakeSprite(BOX.w, BOX.h, (c) => paintPatch(c, FEET[fp], kind, variant, front), false);
    cache.set(key, cv);
  }
  return cv;
};

// which footprint a hall's ground keeps to; halls afloat get no turf
const footOf = (t) => (TOWERS[t.kind] && TOWERS[t.kind].water ? null : TOWERS[t.kind] && TOWERS[t.kind].roadClear ? "narrow" : "wide");

export const drawGroundBlend = (ctx, t, front) => {
  if (typeof document === "undefined") return;
  const fp = footOf(t);
  if (!fp) return;
  const cv = patch(fp, Math.abs(Math.round(t.x * 7 + t.y * 13)) % VARIANTS, front);
  ctx.drawImage(cv, t.x - BOX.ax, t.y - BOX.ay, cv.width / PX, cv.height / PX);
};
