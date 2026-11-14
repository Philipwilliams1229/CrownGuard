// ============ HALL CONCEPT: the Wizard Spire (levels 1-3, treatments A / B / C) ============
// Today's Spire (halls/wizard.js) in the pixel sculptor: plum-grey stone, gilt string
// courses, the mage's purple banners, lamplit arched windows, and the mage on an open
// crown with his live orb. Its light is the point: the orb lights the crown and the
// top of the shaft as an overlay (hall-kit.js wallLight), stronger as he casts.
// A and B keep today's shape; C tapers the shaft under a wide crown, sets a rose
// window in it and stands a slender pinnacle behind him. Concept only.
import { mat, flat } from "./pix.js";
import { STYLES, drum, disc, parapet, bandEdge, cone, beam, door, archWindow, wallBanner, ivy, boulder, WARM } from "./hall-kit.js";

export const BOX = { w: 124, h: 230, ox: 62, oy: 204 };
export const LABEL = "Wizard Spire";
export const ORB = "#b08ad8";

const STONE = mat("#8e889a"), STONE_L = mat("#a8a2b6"), GOLD = mat("#d8b34a", { contrast: 1.15 }), CLOTH = mat("#5a4a8c"), OAK = mat("#5e4128"), IRON = mat("#4a4c56");
const SLATE = mat("#4a3f7a"), EARTH = mat("#7c6242"), PAGE = mat("#e8e0c8"), CRYSTAL = flat("#d8c0f8", { emis: true }), CRYSTAL2 = flat("#b08ad8", { emis: true });
const ROSE = flat("#f4dcff", { emis: true });
const STAR = [".#.", "###", ".#."];
const groundBed = (px, rx, ry) => { px.part(); px.ellipse(0, 1, rx, ry, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 }); };

// a gilt finial standing on the crown's rim: a rod, a collar, a crystal that gives a little light
const finial = (px, x, y, h, z) => {
  px.part(); px.capsule(x, y, 1, x, y - h, 0.8, GOLD, z, { cast: 1 }); px.rect(x - 2, y - h * 0.45, 4, 1.4, GOLD, z + 0.1, { n: [0, -0.5, 0.8] });
  px.part(); px.poly([[x, y - h - 6], [x + 2.4, y - h - 2.5], [x, y - h + 0.5], [x - 2.4, y - h - 2.5]], CRYSTAL2, z + 0.2, { cast: 0 }); px.dot(x - 0.5, y - h - 3.5, CRYSTAL, z + 0.3); px.dot(x - 0.5, y - h - 2.5, CRYSTAL, z + 0.3);
};
// a lectern with an open book (level 1's whole furniture, kept at every level)
const lectern = (px, x, y, z) => {
  px.part(); px.capsule(x, y, 1, x, y - 9, 1, OAK, z); px.rect(x - 2.5, y - 1, 5, 1.6, OAK, z, { n: [0, -0.5, 0.8] });
  px.part(); px.poly([[x - 5, y - 12], [x + 5, y - 13.5], [x + 5, y - 10.5], [x - 5, y - 9]], PAGE, z + 0.2, { n: [0, -0.7, 0.7] }); px.toneLine(x, y - 12.6, x, y - 9.8, -1);
};

// the gilt crescent that stands behind today's level-3 mage: an arc from the far rim up over his hat
const crescent = (px, cx, cy, R, z) => {
  px.part();
  for (let a = 2.25; a <= 5.95; a += 0.035) { const k = (a - 2.25) / 3.7, w = 0.7 + 1.5 * Math.sin(Math.min(1, k * 1.15) * Math.PI) ** 0.6; px.ellipse(cx + Math.cos(a) * R, cy + Math.sin(a) * R, w, w, GOLD, z, { round: 0.85 }); }
  px.part(); px.ellipse(cx + Math.cos(5.98) * R, cy + Math.sin(5.98) * R, 1.7, 1.7, CRYSTAL2, z + 0.1, { cast: 0 }); px.dot(cx + Math.cos(5.98) * R - 0.5, cy + Math.sin(5.98) * R - 0.5, CRYSTAL, z + 0.2);
};

const spire = (back, front, st, level) => {
  const bold = st.bold, deck = [0, -62, -82, -97][level], r = bold ? 19 : 24, P = { deck, r: bold ? 34 : 31, sq: 0.3, wall: 5, band: bold ? 12 : 8 };
  groundBed(back, 33, 10);
  if (bold) drum(back, { top: -5, bot: 0, r: 34, r2: 35, m: STONE, z: -2, st, seed: 8, course: 5, strings: [[-5, 1.5, STONE_L]] });   // C: a second, wider step
  drum(back, { top: -9, bot: -3, r: bold ? 31 : 29, r2: bold ? 32 : 30, m: STONE_L, z: -1, st, seed: 4, course: 5, strings: [[-9, 1.5, STONE_L]] });
  const strings = level === 1 ? [[-34, 2, GOLD]] : level === 2 ? [[-34, 2, GOLD]] : bold ? [[-30, 2, GOLD], [-52, 2, GOLD]] : [[-34, 2, GOLD], [-58, 2, GOLD]];
  drum(back, { top: deck, bot: -8, r, r2: bold ? 28 : r + 1.5, m: STONE, z: 0, st, seed: 13, under: bandEdge(P), underLen: bold ? 7 : 5, strings });
  door(back, 0, -5, 10, 15, STONE_L, OAK, GOLD, 2, { vous: st.stones === 2, mRing: GOLD });
  const glow = st.lit ? WARM : false;
  if (level >= 2) archWindow(back, 0, level === 3 && bold ? -48 : -51, 6, 9, STONE_L, 2, { glow, glass: true, bars: st.stones === 2 });
  if (level === 1) archWindow(back, 0, -30 - 14, 6, 8, STONE_L, 2, { glow, glass: true });
  if (level === 3 && !bold) archWindow(back, 0, deck + 23, 6, 8, STONE_L, 2, { glow, glass: true, bars: st.stones === 2 });
  if (level === 3 && bold) {                                                    // C: a rose window, gilt-rimmed
    const RY = -64;
    back.part(); back.ellipse(0, RY, 8, 8, GOLD, 2, { round: 0.6 }); back.ellipse(0, RY, 6, 6, st.lit ? ROSE : IRON, 2.1, { round: 0, cast: 0 });
    for (let a = 0; a < 4; a++) { const cs = Math.cos((a * Math.PI) / 4), sn = Math.sin((a * Math.PI) / 4); back.line(-cs * 5.5, RY - sn * 5.5, cs * 5.5, RY + sn * 5.5, GOLD, 2.2, { cast: 0 }); }
    back.ellipse(0, RY, 1.6, 1.6, GOLD, 2.3, { cast: 0 });
  }
  if (level >= 2) for (const s of [-1, 1]) wallBanner(back, s * (bold ? 11 : 13), deck + P.band + 12, 6, level === 3 ? 22 : 16, CLOTH, GOLD, 2, { device: level === 3 ? STAR : null, deviceY: 5, tail: "point", stripe: true });
  if (st.moss && !bold) ivy(back, -22, -8, 26, 3, { seed: 6, side: 1, col: "#5a8a4c", col2: "#3f6a44" });
  for (const s of [-1, 1]) boulder(back, s * 30, 6, 3, 2.2, STONE_L, 3);
  // C: a slender pinnacle on the crown's far rim, behind his shoulder
  if (bold && level === 3) { drum(back, { cx: -21, top: deck - 34, bot: deck - 6, r: 5, m: STONE, z: -6, st: STYLES.A, seed: 31, strings: [[deck - 34, 2, GOLD]] }); cone(back, { cx: -21, y: deck - 34, r: 7.5, h: 28, m: SLATE, z: -5.5, st, rows: 5 }); back.part(); back.ellipse(-21, deck - 64, 1.6, 1.6, GOLD, -5); }
  disc(back, { y: deck, r: P.r - 1, m: STONE_L, z: 0.5, lip: 6 });
  parapet(back, front, { ...P, m: STONE, mTrim: GOLD, st, mer: { n: 12, duty: 0.5, h: level === 1 ? 5 : 6, ph: 0.25 } });
  if (level >= 2) for (const s of [-1, 1]) finial(front, s * (P.r - 3), deck + 4, level === 3 ? 15 : 10, 12);
  const mx = 3, my = deck + 3, live = [];
  if (level < 3) lectern(back, -15, deck + 1, 0.8);
  else { if (!bold) crescent(back, mx - 3, deck - 31, 23, -5); live.push({ kind: "book", x: -34, y: deck - 22, layer: "front" }); }
  if (level >= 2) for (const [x, y, ph] of [[-P.r - 5, deck - 14, 0], [P.r + 6, deck + 6, 3], [-20, -40, 5], [24, -66, 2]].slice(0, level === 3 ? 4 : 2)) live.push({ kind: "spark", x, y, col: ORB, ph, layer: "front" });
  return {
    crew: [{ fig: "mage", x: mx, y: my, dir: 1, variant: `${level}|base`, orb: ORB }],
    live,
    lights: [{ key: "orb", x: mx + 16, y: my - 46, r: 62, col: ORB }],
    shadow: { rx: bold ? 35 : 33, ry: 10, dx: 8, dy: 3 },
  };
};

export const build = (o = {}) => (back, front) => spire(back, front, STYLES[o.style || "B"], o.level || 3);
void beam;
