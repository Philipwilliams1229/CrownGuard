// ============ PIX HALL: the King's Band, all nine forms ============
// A NEW hall (2026-11-18): it never shoots. Musicians play on a round bandstand and every hall in
// earshot works to the beat (engine/band.js). Treatment B like the other halls: thin tinted line,
// one sun from the upper left, stone and timber as tone, lit torches.
//
// There is no old hall to read crew spots from: THIS file is where the players stand. `layout()`
// gives every form's spots (art px from the hall's ANCHOR, y down; a player's FEET) and
// render/halls/band.js reads the same numbers to stand the real figures.
//
// The forms: a boarded platform with a pennant (1), a stone-footed stand with a rail and bunting (2),
// a raised eight-panelled bandstand before a painted bandshell (3); the Drum Corps' drum-racked stand
// with crown banners (a), the Royal Tattoo's grand stand with standards and torches (aa), Thunder Drums'
// wheeled carriage with a pair of kettledrums (ab); the Heralds' crimson dais (b), the Royal Fanfare's
// gilded dais under a cloth-of-gold canopy (ba), the War Horn's stone platform with its forked stand,
// skulls and beacon (bb).
//   build({ level, branch, rank4, seed, style })
// What moves is NOT baked: pennants and flames are `live`; the kettledrums' skins (jump on the beat) and
// the horn's breath rings are painted by the hall file from `layout().kettles` / `.horn`.
import { mat, flat } from "./pix.js";
import { STYLES, drum, disc, parapet, bandEdge, cone, beam, wheel, wallBanner, boulder, hash } from "./hall-kit.js";

export const BOX = { w: 132, h: 214, ox: 66, oy: 170 };
export const LABEL = "King's Band";
export const SHEET_DY = 0;
const SQ = 0.38;                 // one squash for every ring of the hall

// ---- who stands where (art px from the anchor; y is the deck's centre DY plus an offset) ------
// role: drum | bass | kettle | major | fife | trumpet | horn.   variant: "<role>" blue coats (levels, path a),
// "<role>:b" crimson (path b), "<role>:gold" the drum finals' richer dress.
const FORMS = {
  "1": { R: 26, DY: -8, band: 6, p: [["drum", -10, 4], ["fife", 10, 2]] },
  "2": { R: 28, DY: -11, band: 7, p: [["drum", -16, 4], ["drum", 15, 4], ["fife", 0, -2]] },
  // (owner, 2026-11-18: the three players stand where they did on level 2; the drum major on the
  // ground in front of the stand, past the foot of its stair: y is from the deck, so 42 + DY is the grass)
  "3": { R: 29, DY: -13, band: 8, p: [["bass", -16, 4], ["drum", 15, 4], ["fife", 0, -2], ["major", -14, 42, "ground"]] },
  a: { R: 30, DY: -15, band: 8, p: [["bass", -20, 4], ["major", 0, -4], ["drum", -8, 7], ["drum", 18, 4]] },
  aa: { R: 30, DY: -19, band: 8, v: "gold", p: [["bass", -21, 3], ["drum", -8, -4], ["drum", 9, -4], ["drum", 21, 3], ["major", 0, 7]] },
  ab: { R: 28, DY: -9, band: 7, v: "gold", p: [["drum", -19, -1], ["bass", 19, -1], ["kettle", -7, 3]], kettles: [[3, -20], [10, -20]] },
  b: { R: 29, DY: -12, band: 7, v: "b", p: [["trumpet", -12, 4], ["trumpet", 12, 4]] },
  ba: { R: 30, DY: -15, band: 8, v: "b:gold", p: [["trumpet", -22, 3], ["trumpet", -8, 6], ["trumpet", 8, 6], ["trumpet", 22, 3]] },
  bb: { R: 29, DY: -18, band: 8, v: "b:gold", p: [["horn", -6, 4]], stand: [17, 6] },
};
export const keyOf = (o = {}) => (o.rank4 ? (o.branch || "") + o.rank4 : o.branch || String(o.level || 3));
export const layout = (o = {}) => {
  const key = keyOf(o), F = FORMS[key] || FORMS["3"], { R, DY } = F;
  // a 4th entry "ground": he stands on the grass before the stand, drawn after its front wall
  const players = F.p.map(([role, x, y, on]) => ({ role, x, y: DY + y, variant: F.v ? role + ":" + F.v : role, ground: on === "ground" }));
  // the drum finals dress "gold"; the Heralds (path b) wear crimson; no form mixes them
  return {
    key, R, DY, band: F.band, players,
    kettles: (F.kettles || []).map(([x, y]) => ({ x, y: DY + y, rx: 4.6, ry: 2.1 })),
    horn: F.stand ? { stand: [F.stand[0], DY + F.stand[1]], bell: [-6 + 38.6, DY + 4 - 33.4] } : null,    // the stand's foot (the horn's belly rests 23 right, 26 up from the blower's feet); the mouth, a fallback for marks.bell
  };
};

// ---- materials ---------------------------------------------------------------------------------
const lightenHex = (h, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * k).toString(16).padStart(2, "0")).join("");
const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), TIMBER_L = mat("#a37a48"), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 }), ROPE = mat("#b89a64");
const GOLD = mat("#d8b34a"), GOLD_L = mat("#ecd070"), CREAM = mat("#e8e0c8"), BLUE = mat("#2f56a0"), BLUE_D = mat("#284a8c"), CRIM = mat("#a8302a"), CRIM_D = mat("#7e2020");
const EARTH = mat("#7c6242"), BONE = mat("#e8dfc6"), DARK = flat("#2a2030"), COPPER = mat("#b8703a"), COPPER_L = mat("#d89458");
const STONE = { "2": "#9a9fa8", "3": "#a3a8b0", a: "#8e96a8", aa: "#9aa2b4", ab: "#8a6a44", b: "#b0a290", ba: "#c0b098", bb: "#7c7a78" };
const bed = (px, rx) => { px.part(); px.ellipse(0, 5, rx, 8, EARTH, -50, { round: 0.25, noLine: true, vb: -0.1 }); };

// the platform every form stands on: its body, its deck, and the rail round it (far half behind the
// crew, near half over their shins). o: { foot, deckM, rail, trim, strings, boards, planks, posts, st, seed }
const platform = (back, front, G, o) => {
  const { DY, R, band } = G, st = o.st, under = bandEdge({ deck: DY, r: R, sq: SQ, band });
  bed(back, R + 7);
  drum(back, { top: DY, bot: 3, r: R - 1, r2: R, sq: SQ, m: o.foot, z: 0, st: o.footSt || st, seed: o.seed + 3, course: o.course || 5, stoneW: o.stoneW || 0.44, boards: o.boards, strings: o.strings || [], under, underLen: 4 });
  disc(back, { y: DY, r: R - 1, sq: SQ, m: o.deckM, z: 0.5, lip: 3, planks: o.planks || 0 });
  parapet(back, front, { deck: DY, r: R, sq: SQ, m: o.rail, mTrim: o.trim || o.rail, st: o.railSt || STYLES.A, seed: o.seed + 5, rail: true, boards: o.railBoards ?? 0.16, wall: 1, band, mer: { n: o.posts || 12, duty: 0.18, h: o.postH || 7, ph: 0.4 } });
};
// a stout pole with a crossbar and a hanging banner, behind the crew
const standard = (back, x, DY, top, bw, bh, cloth, trim, z = -7) => {
  beam(back, x, DY - 2, x, DY - top, 3, OAK, z, { grain: false });
  beam(back, x - bw / 2 - 1, DY - top + 2, x + bw / 2 + 1, DY - top + 2, 2, GOLD, z + 0.1, { grain: false });
  wallBanner(back, x, DY - top + 4, bw, bh, cloth, trim, z + 0.2, { tail: "point", stripe: true, fold: 2 });
};
// a little gold crown (a band and five points)
const crown = (px, x, y, z) => { px.part(); px.rect(x - 4, y, 8, 2.5, GOLD, z, { n: [0, -0.3, 0.9] }); for (const dx of [-4, -2, 0, 2, 4]) px.dot(x + dx - 0.5, y - 1 - (dx === 0 ? 1 : 0), GOLD_L, z + 0.05, { cast: 0 }); px.dot(x - 0.5, y + 0.5, CRIM, z + 0.1, { cast: 0 }); };
// a torch on a post: the flame is live, the light is baked
const torchPost = (back, x, DY, top) => { beam(back, x, DY - 2, x, DY - top, 3, IRON, -7, { grain: false }); back.part(); back.rect(x - 3, DY - top - 3, 6, 3, IRON_L, -6.9, { n: [0, -0.5, 0.8] }); };

// ---- build ----------------------------------------------------------------------------------------
export const build = (o = {}) => (back, front) => {
  const st = STYLES[o.style || "B"], key = keyOf(o), L = layout(o), { R, DY, band } = L, seed = (o.seed || 0) * 7 + (key.length || 1);
  const live = [], lights = [];
  const sx = (n) => STONE[key] || STONE["2"];
  const S = mat(sx()), SL = mat(lightenHex(sx(), 0.16));
  const base = { st, seed };

  if (key === "1") {
    // a low round platform of boards on timber legs, a pennant on a pole
    platform(back, front, L, { ...base, foot: TIMBER, footSt: STYLES.A, boards: 0.5, course: 99, deckM: TIMBER_L, planks: 5, rail: OAK, trim: TIMBER, strings: [[DY + 1, 1.4, OAK]] });
    for (let i = 0; i < 4; i++) { const x = -R + 5 + i * ((R * 2 - 10) / 3); boulder(back, x, 14 - (i === 0 || i === 3 ? 2 : 0), 3, 2, mat("#9a9488"), 2); }
    live.push({ kind: "pennant", x: R - 5, y: DY - 2, col: "#284a8c", pole: 40, len: 13 });
  } else if (key === "2") {
    // a stone foot under a timber rail; bunting strung from a pole to the pennant pole
    platform(back, front, L, { ...base, foot: S, deckM: TIMBER_L, planks: 5, rail: TIMBER, trim: OAK, course: 5, strings: [[DY + 1, 1.6, SL]] });
    const lx = -(R - 5), rx = R - 5, top = DY - 54;
    beam(back, lx, DY - 2, lx, top, 3, OAK, -7, { grain: false });
    back.part(); back.ellipse(lx, top - 1, 1.8, 1.8, GOLD, -6.9, { round: 0.9 });
    const cols = [BLUE, CREAM, GOLD];
    for (let i = 0; i < 12; i++) {
      const t = (i + 0.5) / 12, x = lx + (rx - lx) * t, y = top + 2 + Math.sin(t * Math.PI) * 6 + (1 - t) * 0.5;
      back.part(); back.poly([[x - 2.2, y], [x + 2.2, y], [x, y + 4.6]], cols[i % 3], -6.9, { cast: 0 });
    }
    back.part(); for (let i = 0; i <= 30; i++) { const t = i / 30; back.dot(lx + (rx - lx) * t, top + 1.5 + Math.sin(t * Math.PI) * 6, ROPE, -6.95, { cast: 0 }); }
    live.push({ kind: "pennant", x: rx, y: DY - 2, col: "#284a8c", pole: 49, len: 13 });
  } else if (key === "3") {
    // the raised bandstand: eight boarded panels, a stair at the front
    platform(back, front, L, { ...base, foot: TIMBER, footSt: STYLES.A, boards: Math.PI / 4, course: 99, deckM: TIMBER_L, planks: 5, rail: OAK, trim: GOLD, posts: 8, strings: [[DY + 1, 1.6, GOLD], [DY + 12, 1.4, OAK]] });
    // no canopy (owner, 2026-11-18: "messed up roof ... take it off, it looks too crowded")
    // the stair, two treads down the front, clear of the players
    for (const [w, y, h] of [[10, 8, 5], [7, 2.5, 5.5]]) { front.part(); front.rect(-w, DY + 11 + y - 1, w * 2, h, TIMBER_L, 12 + (w < 8 ? 0.2 : 0), { n: [0, -0.5, 0.85] }); front.toneLine(-w, DY + 11 + y + h - 1, w, DY + 11 + y + h - 1, -1); }
    // a bandshell (owner's pick B, 2026-11-18, of three flair options): a painted half-shell behind the players, blue with gold sun-rays and a crown at its crest
    const cy = DY - 2, rx = R + 1, ry = 72;
    back.part();
    const arc = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * (i / 24); arc.push([-Math.cos(a) * rx, cy - Math.sin(a) * ry]); }
    back.poly(arc, BLUE_D, -7.5, { n: [0, 0.2, 0.98] });
    for (let k = 1; k < 8; k++) { const a = Math.PI * (k / 8); back.part(); back.line(-Math.cos(a) * 6, cy - Math.sin(a) * 8, -Math.cos(a) * (rx - 2), cy - Math.sin(a) * (ry - 2), k % 2 ? GOLD : GOLD_L, -7.4, { cast: 0 }); }
    back.part(); for (let i = 0; i <= 48; i++) { const a = Math.PI * (i / 48); back.dot(-Math.cos(a) * rx, cy - Math.sin(a) * ry, GOLD, -7.3, { cast: 0 }); }
    back.part(); back.ellipse(0, cy - 2, 7, 5, GOLD_L, -7.35, { round: 0.9 });
    crown(back, 0, cy - ry + 1, -7.2);
    live.push({ kind: "pennant", x: 0, y: cy - ry - 4, col: "#284a8c", pole: 8, len: 12 });
  } else if (key === "a" || key === "aa") {
    const gild = key === "aa";
    platform(back, front, L, { ...base, foot: S, deckM: SL, rail: S, trim: GOLD, course: 5, strings: [[DY + 1, 1.8, GOLD], [DY + band + 6, 1.4, gild ? GOLD : SL]], railSt: st });
    // drums racked round the band: blue shells, gold hoops
    const n = gild ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = (-0.95 + (1.9 * i) / (n - 1)) * 1.25, x = R * Math.sin(a) * 0.96, y = DY + R * SQ * Math.cos(a) + band * 0.5 + 1;
      front.part(); front.ellipse(x, y, 3.8, 3.1, BLUE_D, 11, { round: 0.7 }); front.part(); front.ellipse(x, y - 1.6, 3.5, 1.3, CREAM, 11.1, { cast: 0 });
      front.dot(x - 2.5, y + 0.6, GOLD, 11.2, { fix: 3 }); front.dot(x + 2.5, y + 0.6, GOLD, 11.2, { fix: 3 });
    }
    if (!gild) {
      standard(back, -(R - 3), DY, 50, 12, 24, BLUE_D, GOLD);
      standard(back, R - 3, DY, 50, 12, 24, BLUE_D, GOLD);
    } else {
      live.push({ kind: "pennant", x: -(R - 3), y: DY - 2, col: "#284a8c", pole: 62, len: 16, h: 9 }, { kind: "pennant", x: R - 3, y: DY - 2, col: "#d8b34a", pole: 62, len: 16, h: 9 });
      for (const sgn of [-1, 1]) {
        const x = sgn * 14, top = 60;
        torchPost(back, x, DY - 6, top);
        live.push({ kind: "flame", x, y: DY - 6 - top - 3 });
        lights.push({ key: sgn < 0 ? "torchL" : "torchR", x, y: DY - 6 - top - 5, r: 24, col: "#ffa040", a: 0.7 });
      }
      // a gilt cornice on the rail, and standards' tassels
      for (let i = 0; i < 6; i++) { const x = -R + 5 + i * ((R * 2 - 10) / 5); back.dot(x, DY - 12 + (i % 2), GOLD_L, -6.8, { fix: 3, cast: 0 }); }
    }
  } else if (key === "ab") {
    // the wheeled carriage: a low timber bed on two big wheels, the kettledrums' bowls at the front (their skins are live)
    platform(back, front, L, { ...base, foot: TIMBER, footSt: STYLES.A, boards: 0.45, course: 99, deckM: TIMBER_L, planks: 5, rail: OAK, trim: GOLD, posts: 10, postH: 5, strings: [[DY + 1, 1.5, IRON], [DY + 10, 1.4, IRON]] });
    for (const sgn of [-1, 1]) {
      wheel(front, sgn * 22, DY + 17, 10, TIMBER, IRON, 12, { sq: 0.8, turn: sgn * 0.3, spokes: 8 });
      front.part(); front.rect(sgn * 22 - 1, DY + 13, 2, 8, IRON, 12.2, { cast: 0 });
    }
    // the kettles: far half of the rim behind the player, bowl, legs and near rim over his shins
    for (const k of L.kettles) {
      const { x, y, rx, ry } = k;
      back.part(); back.ellipse(x, y - 0.5, rx + 1, ry + 1, COPPER, -5, { round: 0.7, cast: 0 });
      front.part(); for (let s = -1; s <= 1; s += 2) front.line(x + s * 3, y + 3, x + s * 4.5, y + 10, IRON, 12, { cast: 0 });
      front.part(); front.ellipse(x, y + 3.6, rx, 5.4, COPPER, 12.3, { round: 0.95 });
      front.part(); front.rect(x - rx - 1, y + 0.5, (rx + 1) * 2, 1.2, GOLD, 12.6, { cast: 0 });
      front.dot(x - 2, y + 4, COPPER_L, 12.7, { fix: 4 });
    }
    // a pennant on the carriage's tail
    live.push({ kind: "pennant", x: R - 8, y: DY - 3, col: "#d8b34a", pole: 46, len: 14 });
  } else if (key === "b" || key === "ba") {
    const gild = key === "ba";
    platform(back, front, L, { ...base, foot: S, deckM: gild ? GOLD : SL, rail: gild ? GOLD : OAK, trim: GOLD, course: 5, strings: [[DY + 1, 1.8, GOLD]], railSt: st });
    // the crimson valance hung from the rim over the near half of the band, scalloped
    for (let i = -Math.floor(R); i < Math.floor(R); i++) {
      const x = i + 0.5, u = x / R; if (Math.abs(u) > 0.96) continue;
      const yTop = DY + R * SQ * Math.sqrt(1 - u * u) + 1.5, drop = band - 2 + 1.5 * Math.sin((x / 4.2) * Math.PI) ;
      for (let y = yTop; y < yTop + drop; y++) {
        const edge = y > yTop + drop - 1.4;
        front.dot(x, y, edge || y < yTop + 1 ? GOLD : CRIM, 11, { bias: edge ? 0 : (Math.floor(x / 4.2) % 2 ? -1 : 0), cast: 0, n: [u * 0.5, 0, 0.85] });
      }
    }
    if (!gild) {
      standard(back, -(R - 3), DY, 54, 11, 26, CRIM, GOLD);
      standard(back, R - 3, DY, 54, 11, 26, CRIM, GOLD);
    } else {
      // cloth-of-gold canopy on four posts: back pair behind the players, side pair in front of nothing
      // (owner, 2026-11-18: the same as the Full Company's: lower, posts on the deck, no wider than it;
      // the long side banners that hung outside the stand are gone)
      const roofY = DY - 64, CR = R - 2;
      for (const x of [-14, 14]) beam(back, x, DY - 9, x, roofY + 2, 3, GOLD, -7, { grain: false });
      for (const x of [-(R - 4), R - 4]) beam(front, x, DY + 4, x, roofY + 4, 3, GOLD, 11, { grain: false });
      cone(back, { cx: 0, y: roofY, r: CR, h: 13, sq: 0.3, m: GOLD, z: -6, st, rows: 5, seed });
      back.part(); back.ellipse(0, roofY - 14, 2, 2, CRIM, -5.9, { round: 0.9 });
      for (let x = -(CR - 1); x <= CR - 1; x += 5) { const u = x / CR, y = roofY + CR * 0.3 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.5, c = (Math.round(x / 5) & 1) ? CRIM : GOLD_L; back.part(); back.poly([[x - 2.5, y], [x + 2.5, y], [x, y + 4]], c, -5.8, { cast: 0 }); }
    }
  } else if (key === "bb") {
    platform(back, front, L, { ...base, foot: S, deckM: mat("#8a8884"), rail: S, trim: SL, course: 6, stoneW: 0.55, strings: [[DY + 1, 1.8, SL]], railSt: st });
    // skulls and runes carved along the band
    const SK = ["..bbb..", ".bbbbb.", ".bDbDb.", ".bbbbb.", "..bbb..", "..t.t.."];
    for (const a of [-0.95, -0.38, 0.38, 0.95]) {
      const x = R * Math.sin(a) * 0.97 - 3, y = DY + R * SQ * Math.cos(a) + 1.5;
      front.part();
      SK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "b") front.dot(x + i, y + j, BONE, 11, { cast: 0 }); else if (ch === "D") front.dot(x + i, y + j, DARK, 11, { fix: 0 }); else if (ch === "t") front.dot(x + i, y + j, BONE, 11, { fix: 4, cast: 0 }); }));
    }
    for (const a of [-0.65, 0, 0.65]) { const x = R * Math.sin(a) * 0.97, y = DY + R * SQ * Math.cos(a) + band - 3; front.part(); front.dot(x, y, SL, 11.5, { fix: 4 }); front.dot(x, y + 1, SL, 11.5, { fix: 4 }); front.dot(x + 1, y + 1, SL, 11.5, { fix: 4 }); front.dot(x - 1, y + 2, SL, 11.5, { fix: 4 }); }
    // the forked stand the horn rests on: a post and two prongs, behind the blower
    const [fx, fy] = L.horn.stand;
    beam(back, fx, fy, fx, fy - 24, 3, OAK_D, -3, { grain: false });
    beam(back, fx, fy - 22, fx - 4, fy - 31, 2, OAK_D, -2.9, { grain: false }); beam(back, fx, fy - 22, fx + 4, fy - 31, 2, OAK_D, -2.9, { grain: false });
    back.part(); back.rect(fx - 4, fy - 11, 8, 2, IRON, -2.8, { cast: 0 });
    // the beacon: a stone pillar at the back left carrying an iron bowl; the flame is live and lights the stone
    const bx = -21, by = DY - 8;
    drum(back, { cx: bx, top: by - 30, bot: by, r: 5, r2: 6, sq: SQ, m: S, z: -7, st, seed: seed + 9, course: 5, stoneW: 0.7, strings: [[by - 30, 2, SL]] });
    back.part(); back.ellipse(bx, by - 33, 8, 3, IRON, -6.5, { round: 0.6 }); back.ellipse(bx, by - 32, 6, 2, flat("#e8483a", { emis: true }), -6.4, { cast: 0 });
    live.push({ kind: "flame", x: bx, y: by - 33, w: 9, h: 15 });
    lights.push({ key: "beacon", x: bx, y: by - 38, r: 32, col: "#ffa040", a: 0.8 });
    live.push({ kind: "pennant", x: R - 5, y: DY - 2, col: "#a8302a", pole: 48, len: 13 });
  }

  return {
    live, lights,
    crew: L.players.map((p) => ({ fig: FIG[p.role], x: p.x, y: p.y, dir: 1, clip: "play", variant: p.variant })),
    shadow: { rx: R + 9, ry: 8, dx: 6, dy: 13 },
  };
};
// the figure each role is drawn with in the lab pages (stand-ins until fig-drummer.js / fig-herald.js exist)
const FIG = { drum: "drummer", bass: "drummer", kettle: "drummer", major: "drummer", fife: "herald", trumpet: "herald", horn: "herald" };
