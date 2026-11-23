// The overhaul's decor KIT (art/briefs/overhaul-build-millrace.md, B4): the sculpting helpers, materials and pieces
// of the approved farm, COPIED from concept/overhaul2-decor-gw.js (round 3; the concept file is untouched, nothing in
// the game imports concept/). Changes from the concept: no Scene (decor.js places and draws the pieces in the game),
// no grade() (the game's own daylight colours the board), every piece is sculpted under kitSun() (the level's sun, or
// its WEST twin under an eastern sun: decor.js then draws the piece mirrored, so the painted details that assume a
// western light, the gable's shaded east half, the rock rule's shaded east shoulder, land on the right side), and
// a house's windows are lit only while WIN.lit (decor.js bakes a lit twin for late / golden and the night).
// THE ROCK RULE: concept/overhaul2-decor-gw.md. Pieces are in art px about their anchor (feet; y up is negative).
// Nothing here runs at module load except material tables (pix.js mat / flat: a leaf module).
import { Pix, mat, flat, toCanvas } from "../pix/pix.js";
import { DAY } from "../../data/sun.js";
// ---- little helpers ----------------------------------------------------------------------
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const lerp = (a, b, t) => a + (b - a) * t;
// the light the pieces are sculpted under (see the header)
export const SUNM = { twin: true };   // false: the true sun (a piece that is never mirrored, e.g. a fence run)
export const kitSun = () => (DAY.on ? [SUNM.twin ? -Math.abs(DAY.L[0]) : DAY.L[0], DAY.L[1], DAY.L[2]] : null);
// windows lit (the lamp-yellow lower panes) while true; decor.js flips it round a bake
export const WIN = { lit: false };

// one sprite: build(px) sculpts about the anchor (feet, y up is negative); returns a baked canvas
const sprite = (w, h, build, oy = 4) => {
  w = Math.ceil(w); h = Math.ceil(h);
  const px = new Pix(w, h, w >> 1, h - oy);
  build(px);
  const img = px.resolve({ line: "tint", sun: kitSun() }), cv = toCanvas(img);
  grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};
// golden hour / sunrise: warm the baked piece the way the board's grade warms the ground
const grade = () => {};   // (the game's daylight grades the board; kept as a no-op so the copied pieces read as before)
// the lowest opaque row of each column of a baked piece (cached on it)
const bottoms = (spr) => {
  if (spr._bot) return spr._bot;
  const c = spr.cv, w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, b = new Int16Array(w).fill(-1);
  for (let u = 0; u < w; u++) for (let v = h - 1; v >= 0; v--) if (d[(v * w + u) * 4 + 3] > 100) { b[u] = v; break; }
  return (spr._bot = b);
};
const silhouette = (cv, col) => {
  const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
  const c = t.getContext("2d"); c.drawImage(cv, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = col; c.fillRect(0, 0, t.width, t.height);
  return t;
};

// ---- ground work (painted straight onto the board, whole art pixels) -----------------------
const px1 = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
// trodden earth: an ellipse whose rim breaks up into grass, darker where it is wettest
const worn = (ctx, cx, cy, rx, ry, cols, seed = 1, k = 1) => {
  for (let j = -ry - 2; j <= ry + 2; j++) for (let i = -rx - 2; i <= rx + 2; i++) {
    const d = Math.hypot(i / rx, j / ry);
    const n = hash(i + seed * 97, j - seed * 13), n2 = hash((i >> 2) + seed, (j >> 2) - seed);
    const v = d + (n2 - 0.5) * 0.35 + (n - 0.5) * 0.18;
    if (v > 1) continue;
    if (v > 0.82 && n > 0.5 * k) continue;
    const c = v > 0.7 ? cols[0] : n > 0.86 ? cols[2] : n < 0.1 ? cols[3] ?? cols[1] : cols[1];
    px1(ctx, cx + i, cy + j, c);
  }
};
// a footpath along points (canvas px), w wide
const path = (ctx, pts, w, cols, seed = 3) => {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let t = 0; t <= n; t += 1) {
      const x = lerp(ax, bx, t / n), y = lerp(ay, by, t / n), ww = w * (0.8 + 0.4 * hash(t + s * 50, seed));
      for (let j = -ww; j <= ww; j++) for (let i = -ww; i <= ww; i++) {
        const d = Math.hypot(i, j * 1.4) / ww, hh = hash(Math.round(x + i), Math.round(y + j) + seed);
        if (d > 1 || (d > 0.7 && hh > 0.55)) continue;
        px1(ctx, Math.round(x + i), Math.round(y + j), d > 0.65 ? cols[0] : hh > 0.9 ? cols[2] : cols[1]);
      }
    }
  }
};
// a tilled plot: rows of soil and greens, its edge trodden
const plot = (ctx, x0, y0, w, h, soil, leaf, seed = 5) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = j % 4, n = hash(i + seed, j);
    let c = row === 0 ? soil[2] : row === 3 ? soil[0] : soil[1];
    if ((row === 1 || row === 2) && (i + (j >> 2) * 3) % 5 < 3 && n > 0.25) c = row === 1 ? leaf[1] : leaf[0];
    if ((row === 1) && (i % 5 === 1) && n > 0.6) c = leaf[2];
    if ((i === 0 || i === w - 1 || j === 0 || j === h - 1) && n > 0.5) continue;
    px1(ctx, x0 + i, y0 + j, c);
  }
};

// ---- materials ---------------------------------------------------------------------------
const M = {
  stone: mat("#9c9586", { contrast: 1.25 }), stoneD: mat("#827c70", { contrast: 1.2 }), stoneW: mat("#b4a890", { contrast: 1.2 }), moss: mat("#6f8f34"), mossD: mat("#56722c"),
  lichen: mat("#a4a05a"), thatch: mat("#c49a4c"), thatchD: mat("#a07c3c"), timber: mat("#7a5230"), timberD: mat("#5c3c24"),
  plaster: mat("#e6dcc2"), tile: mat("#a6503a"), slate: mat("#6a6c78"), soil: mat("#7a5a3a"), hay: mat("#d6b450"),
  water: flat("#3c6a8a"), dark: flat("#2a2026"), glass: flat("#3a3442"), glow: flat("#ffd27a", { emis: true }),
  iron: mat("#4a4a52"), rope: mat("#b8a070"), white: mat("#ece6d8"), red: mat("#b03a2c"), blue: mat("#3a5a9a"),
  hull: mat("#8a5a34"), granite: mat("#7c7872", { contrast: 1.05 }), graniteD: mat("#5e5a60", { contrast: 1.05 }), heather: mat("#8a5a8a"), canvas: mat("#d8ccae"),
  cloth: mat("#8a2a26"), clothY: mat("#c8a040"), bstone: mat("#7e867a", { contrast: 1.2 }), bstoneD: mat("#636a60", { contrast: 1.15 }), floor: mat("#3c4236"), wet: mat("#4c5a4c"),
  ivy: mat("#4e7a34"), sand: mat("#d8c08a"), wool: mat("#ece4d0"), hen: mat("#e8e0cc"), comb: flat("#c83a2a"),
  bronze: mat("#7a8a5a"), candle: flat("#f4e8c0"), flame: flat("#ffc850", { emis: true }), bone: mat("#e0d8c0"),
  pine: mat("#3c5a3a"), turf: mat("#6a9a3a"), turfD: mat("#5a8030"),
};
const F_FRONT = [0, 0.18, 0.98], F_WEST = [-0.85, 0, 0.53], F_EAST = [0.85, 0.05, 0.52], F_TOP = [-0.12, -0.55, 0.83], F_ROOF = [-0.08, -0.32, 0.94];

// coursed masonry over a face already drawn: mortar every `ch` rows, staggered joints
const courses = (px, x0, y0, x1, y1, ch = 4, cw = 7, d = -1, seed = 1) => {
  for (let y = y0 + ch; y < y1; y += ch) {
    px.toneLine(x0, y, x1, y, d);
    const off = ((y / ch) | 0) % 2 ? 0 : cw >> 1;
    for (let x = x0 + off + Math.floor(hash(y, seed) * 3); x < x1; x += cw + Math.floor(hash(x, y + seed) * 3)) px.toneLine(x, y - ch + 1, x, y - 1, d);
  }
  for (let k = 0; k < (x1 - x0) * (y1 - y0) / 40; k++) px.tone(lerp(x0, x1, hash(k, seed + 7)), lerp(y0, y1, hash(seed, k + 3)), hash(k, k + seed) > 0.5 ? 1 : -1);
};

// post-and-rail fence: posts driven into the turf (a collar of grass at each), rails pegged on, shadow from its foot
const fence = (pts, seed = 9, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), H0 = o.h ?? 9;
  const x0 = Math.min(...xs) - 7, x1 = Math.max(...xs) + 7, y0 = Math.min(...ys) - H0 - 5, y1 = Math.max(...ys) + 5;
  const ox = Math.round(-x0) + 2, oy = Math.round(-y0) + 2, px = new Pix(Math.ceil(x1 - x0) + 4, Math.ceil(y1 - y0) + 4, ox, oy), R = rng(seed);
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / (o.gap ?? 9)));
    const gate = o.gate && s === o.gate[0];
    for (let k = s ? 1 : 0; k <= n && !o.noPosts; k++) {
      const x = lerp(ax, bx, k / n), y = lerp(ay, by, k / n), lean = (R() - 0.5) * 1;
      px.part().capsule(x, y + 0.5, 1.25, x + lean, y - H0, 1, M.timberD, y * 0.01 + 1);
      px.toneLine(x + lean - 1, y - H0, x + lean, y - H0, 1);
      px.part().ellipse(x, y + 0.2, 1.8, 0.9, V.turfD, y * 0.01 + 2.5, { round: 0.6 }); tufts(px, x - 2.5, x + 2.5, y, R, y * 0.01 + 0.5, y * 0.01 + 2.6, { every: 3, h0: 1, h: 2 });
    }
    if (gate) { const t0 = o.gate[1], t1 = o.gate[2]; for (const hh of [0.3, 0.6, 0.85]) px.part().line(lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * hh, lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.6);
      px.part().line(lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * 0.3, lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * 0.85, M.timber, Math.max(ay, by) * 0.01 + 1.65); }
    for (const hh of o.rails ?? [0.45, 0.8]) {
      if (gate) { const t0 = o.gate[1], t1 = o.gate[2]; px.part().line(ax, ay - H0 * hh, lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.5); px.part().line(lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * hh, bx, by - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.5); continue; }
      px.part().line(ax, ay - H0 * hh, bx, by - H0 * hh + (R() - 0.5), M.timber, Math.max(ay, by) * 0.01 + 1.5);
    }
  }
  const img = px.resolve({ line: "tint", sun: kitSun() }), cv = toCanvas(img); grade(cv);
  const span = Math.max(...xs) - Math.min(...xs);
  return { cv, ox: img.ox, oy: img.oy, foot: span >= 2 ? footOf([...pts].sort((a, b) => a[0] - b[0]), img) : undefined };
};
// one fence post on its own (the posts of a run going up the page each stand at their own foot)
const post = (H0 = 9, seed = 1) => sprite(12, H0 + 10, (px) => { const R = rng(seed); px.part().capsule(0, 0.5, 1.25, (R() - 0.5), -H0, 1, M.timberD, 1); px.toneLine(-1, -H0, 0, -H0, 1); px.part().ellipse(0, 0.2, 1.8, 0.9, V.turfD, 2.5, { round: 0.6 }); tufts(px, -2.5, 2.5, 0, R, 0.5, 2.6, { every: 3, h0: 1, h: 2 }); }, 3);
// a haystack: a stooked dome, a pole through its top
const haystack = (r, seed = 14) => sprite(r * 2 + 12, r * 2 + 16, (px) => {
  const R = rng(seed);
  px.part().ellipse(0, -r * 0.9, r, r * 0.95, M.hay, 2, { round: 1 });
  px.part().ellipse(0, -r * 0.35, r * 1.08, r * 0.45, M.hay, 2.2, { round: 0.8 });
  for (let k = 0; k < r * 6; k++) { const x = (R() - 0.5) * r * 1.8, y = -R() * r * 1.7; px.toneLine(x, y, x + (R() - 0.5), y + 2, R() > 0.5 ? -1 : 1); }
  px.part().line(0, -r * 1.85, 0, -r * 2.2, M.timberD, 4);
  px.toneLine(-r, -r * 0.7, r, -r * 0.6, -1);
  // round 3: it sits on the ground: a flared, darker skirt, straw spilled round the foot, turf against it
  px.part().ellipse(0, -1.2, r * 1.12, 1.8, V.hayD, 2.3, { round: 0.5, n: [0, 0.3, 0.95] });
  for (let x = -r; x <= r; x += 1.5) px.toneLine(x, -2.5, x + (R() - 0.5), -0.2, -1);
  for (let k = 0; k < r * 1.2; k++) { const x = (R() - 0.5) * r * 2.8, y = 0.2 + R() * 1.4; px.part().line(x, y, x + (R() - 0.5) * 3, y - 0.4, V.hay, 2.4, { noLine: true }); }
  tufts(px, -r * 1.3, r * 1.3, 0, R, 1, 2.6, { every: 3, front: 0.4 });
}, 5);
// a well: round stone curb, two posts, a little shingled roof, a bucket
const woodpile = (seed = 20) => sprite(34, 22, (px) => { const R = rng(seed); px.part().rect(-13, -1.5, 26, 1.5, M.timberD, 1.5); tufts(px, -14, 14, 0, R, 1, 6, { every: 3, front: 0.5 }); for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) { const x = -10 + k * 4 + row * 2, y = -2 - row * 3.5; px.part().ellipse(x, y, 2, 1.8, M.timber, 2 + row, { round: 0.9 }); px.dot(x, y, M.wool, 2.1 + row); } }, 3);
// cottage chimney smoke: soft puffs that rise and drift (live: a 4-frame strip)
const smoke = (t = 0) => sprite(30, 46, (px) => {
  for (let k = 0; k < 5; k++) {
    const u = ((k + t * 0.25) % 5) / 5, x = u * 10 + Math.sin(u * 5 + k) * 2, y = -u * 36, r = 1.5 + u * 4;
    px.part().ellipse(x, y, r, r * 0.8, mat("#d8d4cc"), 2 + k * 0.01, { round: 0.8, noLine: u > 0.6 });
  }
}, 4);
// ---- materials in today's vale palette -----------------------------------------------------------------
const V = {
  wood: mat("#6a4a2e"), woodL: mat("#8a6440"), woodD: mat("#46301e"), iron: mat("#4a4e5a"),
  rubble: mat("#968c7a", { contrast: 0.95 }), chim: mat("#b0a694", { contrast: 0.85 }), mason: mat("#8e8672", { contrast: 0.95 }),
  lime: mat("#ece4d0", { contrast: 0.7 }), limeD: mat("#c4b8a0", { contrast: 0.75 }), ochreW: mat("#e4c88e", { contrast: 0.7 }),
  tile: mat("#b45a64", { contrast: 1.1 }), tileE: mat("#8a4252", { contrast: 1.1 }), tileD: mat("#6a2e3e"),
  thatch: mat("#c4a058", { contrast: 1.2 }), thatchE: mat("#a8843e", { contrast: 1.2 }), thatchD: mat("#6e4e26"), thatchM: mat("#8a9a50", { contrast: 0.7 }),
  slate: mat("#6a7078", { contrast: 0.9 }), slateE: mat("#565c66", { contrast: 0.9 }),
  glass: mat("#3a4a6a", { contrast: 0.8 }), glint: flat("#a8bcd4"), gold: flat("#d8b34a"), door: mat("#3e6a66"), doorR: mat("#7a3a34"),
  lamp: flat("#ffd27a", { emis: true }), lampD: flat("#e09a48", { emis: true }), fire: flat("#ff9a3a", { emis: true }), fireL: flat("#fff0a0", { emis: true }),
  moss: mat("#5d8f3a", { contrast: 0.8 }), mossL: mat("#7aa84a", { contrast: 0.6 }), turf: mat("#6a9a3a"), turfD: mat("#56802e"), turfL: mat("#86b448"),
  lichG: mat("#b8c494", { contrast: 0.5 }), lichY: mat("#d4bc52", { contrast: 0.5 }), lichR: mat("#c47e46", { contrast: 0.5 }),
  ivy: mat("#46743a"), ivyL: mat("#5e8e44"), flowerR: flat("#d0483c"), flowerY: flat("#f0d050"), flowerW: flat("#f4f0e4"),
  sky: flat("#bcd6e6"), skyL: flat("#dceaf0"), hole: flat("#2a2226"), soil: mat("#6e5236", { contrast: 0.9 }),
  // the two rock families
  lime1: mat("#aca692", { contrast: 1.05 }), lime2: mat("#8c8572", { contrast: 1.1 }),
  gran1: mat("#8a8890", { contrast: 1.0 }), gran2: mat("#74727c", { contrast: 1.0 }),
  sign: mat("#2c4a7a"), cloth1: mat("#ece6d8"), cloth2: mat("#4a6a9a"), cloth3: mat("#b0483c"), cat: mat("#3a3436"), catG: mat("#c88a4a"),
  deer: mat("#9a6a40"), deerL: mat("#d8c0a0"), wool: mat("#ece4d0"),
  // round 3
  horn: mat("#e8d49a", { contrast: 0.5 }), pane: flat("#f6dc8c"), ironK: mat("#2e2c34", { contrast: 0.8 }), hen: mat("#ece4d0"), henB: mat("#a8643a"), henR: mat("#c88a48"), comb: flat("#d0382a"), beak: flat("#e0b040"), leg: mat("#c8a040"),
  fawn: mat("#a89478"), fawnL: mat("#ece2cc"), yew: mat("#2f4a30", { contrast: 0.9 }), yewL: mat("#3e6038", { contrast: 0.9 }), yewT: mat("#7a4a34"),
  bell: mat("#9a8440"), hay: mat("#d8b858", { contrast: 1.1 }), hayD: mat("#b89440"), peg: mat("#5c3c24"),
};
const SOUTH = [0, 0.12, 0.99];

// a sprite that also carries its lights: windows (rects) and lamps (points), art px from the anchor
const spriteL = (w, h, build, oy = 4) => {
  w = Math.ceil(w); h = Math.ceil(h);
  const px = new Pix(w, h, w >> 1, h - oy), lights = [], lamps = [], post = [];
  // paint: pixels laid on AFTER the sculpt resolves (a lantern's 2-px panes are too small to survive the inked edges)
  build(px, { win: (x, y, ww, hh) => lights.push([x, y, ww, hh]), lamp: (x, y, r = 22, col = "#ffb24a") => lamps.push([x, y, r, col]), paint: (x, y, col) => post.push([x, y, col]) });
  const img = px.resolve({ line: "tint", sun: kitSun() }), cv = toCanvas(img);
  if (post.length) { const c = cv.getContext("2d"); for (const [x, y, col] of post) { c.fillStyle = col; c.fillRect(Math.floor(x + img.ox), Math.floor(y + img.oy), 1, 1); } }
  grade(cv);
  return { cv, ox: img.ox, oy: img.oy, lights, lamps };
};

// ---- ROUND 3: everything stands IN the turf ------------------------------------------------------------
// The owner: "This stone fence thing is floating off the ground". Every piece now has a FOOT: grass tufts
// growing against it on both sides (behind at zb, breaking over it in front at zf), and the Scene paints a
// dark earth line under every column whose lowest pixel sits on the ground (Scene2 `contact`), and casts a
// wall's or fence's shadow from its own foot line column by column (spr.foot), not from one anchor row.
const tufts = (px, xl, xr, y, R, zb, zf, o = {}) => {
  const n = Math.max(2, Math.round((xr - xl) / (o.every ?? 4)));
  for (let k = 0; k < n; k++) {
    const x = lerp(xl, xr, (k + R()) / n), front = R() < (o.front ?? 0.55), yy = y + (front ? 0.6 + R() * 0.8 : -0.5 - R() * 1.2);
    const h = (o.h0 ?? 2) + R() * (o.h ?? 2.5), m = R() > 0.5 ? V.turf : V.turfD;
    px.part(); px.line(x, yy, x - 1 - R(), yy - h, m, front ? zf : zb); px.line(x + 1, yy, x + 1.5 + R() * 1.5, yy - h * 0.8, m, front ? zf : zb);
  }
};
// a low turf collar over a foot (the rocks' skirt, for posts and stones)
const collar = (px, xl, xr, y, R, z, k = 1) => {
  for (let x = xl; x <= xr; x += 3) px.part().ellipse(x + R(), y + 0.3, 1.8 + R() * 1.5 * k, 1 + R() * 0.6, R() > 0.5 ? V.turf : V.turfD, z, { round: 0.6 });
};
// the foot line of a polyline sprite: canvas row of the ground for each column (for the shadow and contact)
const footOf = (pts, img) => {
  const at = (x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i + 1 < pts.length; i++) if (x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1)); return pts[pts.length - 1][1]; };
  return (u) => img.oy + at(u - img.ox);
};

// the lantern (round 3: a body you can see at noon): iron cap and ring, a horn-glazed body in a frame, a flame
const lantern = (b, Lt, lx, y, z, r = 20) => {
  lx = Math.round(lx); y = Math.round(y);
  b.part(); b.poly([[lx - 2.5, y + 2], [lx + 2.5, y + 2], [lx + 1, y], [lx - 1, y]], V.iron, z + 0.1, { n: [0, -0.6, 0.8] });
  b.part(); b.rect(lx - 2, y + 2, 4, 6, V.ironK, z + 0.1, { n: [0, 0, 1] });
  b.part(); b.rect(lx - 2.5, y + 8, 5, 1, V.iron, z + 0.12, { n: [0, -0.5, 0.86] });
  // the glass, laid on after: warm horn panes with the flame in them, readable by day
  for (let yy = y + 3; yy < y + 7; yy++) for (const xx of [lx - 1, lx]) Lt.paint(xx, yy, yy === y + 4 ? "#fff4b0" : yy === y + 5 ? (xx === lx - 1 ? "#ffcc5a" : "#f0b048") : "#e8c87a");
  Lt.lamp(lx - 0.5, y + 5, r);
};

// a hen you can read at board size: plump body, cocked tail, head with comb and beak, two legs
const hen3 = (t = 0, seed = 22, col = V.hen) => sprite(18, 16, (px) => {
  const peck = Math.sin(t * 2.2 + seed * 1.7) > 0.35, f = seed % 2 ? 1 : -1;
  px.part(); px.line(-0.5 * f, -2.5, -1 * f, 0, V.leg, 1); px.line(1.5 * f, -2.5, 1.5 * f, 0, V.leg, 1);
  px.part(); px.ellipse(0.5 * f, -4.5, 3.8, 2.7, col, 2, { round: 0.9 });
  px.poly([[2.5 * f, -5.5], [5.5 * f, -9.5], [6.5 * f, -7], [5 * f, -4], [3 * f, -3]], col, 2.05, { round: 0.6 });
  px.toneLine(-1 * f, -4, 2.5 * f, -3.5, -1); px.toneLine(5 * f, -8, 5.5 * f, -6, -1);
  const hx = (peck ? -4 : -3) * f, hy = peck ? -2.5 : -7.5;
  px.part(); px.ellipse(hx, hy, 1.7, 1.6, col, 2.3, { round: 0.9 });
  if (!peck) px.capsule(-2 * f, -6, 1.3, hx, hy, 1.3, col, 2.2, { round: 0.9 });
  px.dot(hx, hy - 2, V.comb, 2.5); px.dot(hx + 1 * f, hy - 2, V.comb, 2.5); px.dot(hx - 1 * f, hy + 1, V.comb, 2.5);
  px.dot(hx - 2 * f, hy, V.beak, 2.5); px.dot(hx - 0.5 * f, hy - 0.5, V.hole, 2.6, { noLine: true });
}, 3);
// ROCKS, by THE ROCK RULE: stacked loaves, a lit top plane, a south face, a shaded east shoulder
// ======================================================================================================
// one block (a loaf): its south foot on y0 from xl to xr, a south face h tall, a top plane d deep
const block = (px, xl, xr, y0, h, d, fam, mt, z, R, o = {}) => {
  const w = xr - xl, gran = fam === "granite", b = Math.max(1, Math.min(gran ? 5 : 3, w * (gran ? 0.22 : 0.12), h * 0.45));
  const yt = y0 - h, back = yt - d, ins = gran ? w * 0.1 : w * 0.04;
  // the top plane: a rounded quad receding up the screen, narrower at the back (it is seen from the south)
  const top = [[xl + b * 0.6, yt + 0.5], [xr - b * 0.6, yt + 0.5], [xr - ins - b * 0.3, back + b * 0.6], [xr - ins - b * 1.2, back], [xl + ins + b * 1.2, back], [xl + ins + b * 0.3, back + b * 0.6]];
  px.part().poly(top, o.topM ?? mt, z, { round: gran ? 0.45 : 0.25, ny: -0.7 });
  // the south face: an octagon with bevelled corners, bulged so its west half takes the light and its east falls away
  const sf = [[xl, yt + b], [xl + b, yt], [xr - b, yt], [xr, yt + b], [xr, y0 - b * 0.7], [xr - b, y0], [xl + b, y0], [xl, y0 - b * 0.7]];
  px.part().poly(sf, mt, z + 0.02, { round: gran ? 0.78 : 0.6, ny: gran ? 0.14 : 0.24 });
  // the lit shoulder along the front edge of the top, and a dark line along the foot
  px.toneLine(xl + b, yt, xr - b - 1, yt, 1);
  px.toneLine(xl + b * 0.5, yt - 1, xl + w * 0.45, yt - 1, 1);
  // bedding: limestone has straight beds every 3-6 px with a lit lip above each; granite a curved joint or two
  if (!gran) {
    for (let y = yt + 3 + Math.floor(R() * 2); y < y0 - 2; y += 3 + Math.floor(R() * 3)) {
      const xa = xl + 1 + R() * 2, xb = xr - 1 - R() * 2;
      px.toneLine(xa, y, xb, y + (R() - 0.5), -1); px.toneLine(xa + 1, y - 1, xa + (xb - xa) * (0.3 + R() * 0.4), y - 1, 1);
      if (R() > 0.75) { const vx = xl + w * (0.2 + R() * 0.6); px.toneLine(vx, y + 1, vx + (R() - 0.5), Math.min(y0 - 1, y + 3 + R() * 3), -1); }
    }
    // grikes across the top plane (the clints between them)
    for (let k = 0; k < w / 14; k++) { const x = xl + w * (0.2 + R() * 0.6); px.toneLine(x, yt - 1, x + 2 + R() * 3, back + 1, -1); }
  } else {
    const jy = yt + h * (0.35 + R() * 0.3);
    for (let x = xl + 2; x < xr - 2; x++) px.tone(x, jy + Math.sin((x - xl) / w * Math.PI) * 1.5, -1);
    for (let k = 0; k < Math.max(1, w / 22); k++) { const vx = xl + w * (0.25 + R() * 0.5); px.toneLine(vx, yt + 1, vx + (R() - 0.5) * 2, jy, -1); }
    // granite's speckle
    for (let k = 0; k < w * h / 7; k++) px.tone(xl + R() * w, yt + R() * h, R() > 0.5 ? 1 : -1);
  }
  // weathering pits and a crack or two running down from the beds
  for (let k = 0; k < w * (h + d) / 30; k++) px.tone(xl + R() * w, back + R() * (h + d), R() > 0.6 ? 1 : -1);
  if (o.moss !== false && w > 11) {
    // moss on the top plane (thickest at the back, the damp north), lichen on the lit top and upper south face
    for (let k = 0; k < Math.max(1, w / 12); k++) px.ellipse(xl + w * (0.2 + R() * 0.6), back + d * (0.2 + R() * 0.4), 1.5 + R() * w * 0.12, 1 + R() * 1.5, R() > 0.4 ? V.moss : V.mossL, z + 0.1, { wrap: true, round: 0.5 });
    const L = [V.lichG, V.lichY, V.lichG, V.lichR, V.lichG];
    for (let k = 0; k < Math.max(1, w / 16); k++) { const lx = xl + w * (0.08 + R() * 0.6), ly = R() > 0.5 ? back + d * R() : yt + 1 + R() * h * 0.35; px.ellipse(lx, ly, 1 + R() * 1.6, 0.6 + R() * 0.8, L[k % 5], z + 0.12, { wrap: true }); }
    // grass in the joints
    for (let k = 0; k < Math.max(1, w / 16); k++) { const gx = xl + w * (0.15 + R() * 0.7), gy = yt + 2 + R() * h * 0.6; px.part().line(gx, gy, gx + (R() - 0.5) * 2, gy - 2 - R() * 2, V.turf, z + 0.15); }
  }
  return { yt, back };
};
// a whole rock or rock group of size s (its width in art px) from a family; returns a sprite
const ROCKS = new Map();
const rockMass = (s, fam = "limestone", seed = 1, o = {}) => {
  const key = `${s}|${fam}|${seed}|${JSON.stringify(o)}|${DAY.id}`;
  if (ROCKS.has(key)) return ROCKS.get(key);
  const R = rng(seed), gran = fam === "granite", m1 = gran ? V.gran1 : V.lime1, m2 = gran ? V.gran2 : V.lime2;
  const tall = o.tall ?? (gran ? 0.62 : 0.5), flatK = o.flat ?? 1;
  const spr = sprite(s * 1.3 + 30, s * 1.05 + 40, (px) => {
    // the plan (THE ROCK RULE): one main loaf, wider than tall; bigger rocks add a lower side block in front, a
    // taller mass BEHIND (its foot up the slope, so it rises over the main top), and on a landmark a cap and a
    // low front slab. Horizontal, never a pyramid: the highest point sits behind the middle.
    const H = (gran ? 0.34 : 0.26) * flatK * (o.tall ?? 1), Dp = gran ? 0.22 : 0.25, blocks = [];   // [xl, xr, y0, h, d, z]
    const J = () => 0.85 + R() * 0.3;
    if (s < 20) blocks.push([-s / 2, s / 2, 0, Math.max(2, s * H * 1.1 * J()), Math.max(2, s * Dp), 3]);
    else {
      const mx = -s * 0.08 + (R() - 0.5) * s * 0.08, mw = s * 0.72;
      const h = s * H * J(), d = s * Dp * J();
      blocks.push([mx - mw / 2, mx + mw / 2, 0, h, d, 3]);
      blocks.push([mx + mw * 0.3, mx + mw * 0.3 + s * 0.42, 2, h * 0.6 * J(), d * 0.7, 3.5]);
      if (s >= 34) { const bw = s * 0.5, bx = mx - mw * 0.12 + (R() - 0.5) * s * 0.1; blocks.push([bx - bw / 2, bx + bw / 2, -d * 0.75, h * 1.25 * J(), d * 0.8, 2]); }
      if (s >= 60) {
        blocks.push([mx - mw / 2 - s * 0.12, mx - mw / 2 + s * 0.2, 3, h * 0.45, d * 0.6, 3.6]);
        blocks.push([mx + mw * 0.02, mx + mw * 0.02 + s * 0.3, -h - d * 0.45, h * 0.5 * J(), d * 0.55, 3.2]);
      }
    }
    blocks.sort((a, b) => a[5] - b[5]);
    blocks.forEach(([xl, xr, y0, h, d, z], i) => block(px, xl, xr, y0, h, d, fam, gran ? (i % 3 === 1 ? m2 : m1) : m2, z + i * 0.01, R, gran ? o : { ...o, topM: m1 }));
    // the foot: a skirt of taller turf breaking over the lower edge, pebbles, so it sits IN the ground
    if (o.skirt !== false) {
      for (let k = 0; k < s / 3.5; k++) { const x = (R() - 0.5) * s * 1.05; px.part().ellipse(x, -0.5 + R(), 2 + R() * 2.5, 1.2 + R() * 0.8, R() > 0.5 ? V.turf : V.turfD, 9, { round: 0.6 }); }
      for (let k = 0; k < s / 5; k++) { const x = (R() - 0.5) * s * 1.05; px.part().line(x, 0, x + (R() - 0.5) * 2, -2 - R() * 3, R() > 0.5 ? V.turfL : V.turf, 9.5); }
    }
    for (let k = 0; k < (o.pebbles ?? Math.min(4, 1 + s / 20)); k++) { const x = (R() > 0.5 ? 1 : -1) * (s * 0.45 + 2 + R() * 8), ps = 1 + R() * 1.4; px.part().ellipse(x, -ps * 0.5, ps, ps * 0.7, R() > 0.5 ? m1 : m2, 8, { round: 0.9 }); }
  }, 6);
  spr.contact = s * 0.5;
  ROCKS.set(key, spr);
  return spr;
};
// ======================================================================================================
// BUILDINGS in today's style, a level-1 hall's size
// ======================================================================================================
const beam2 = (b, x, y, w, h, z, mt) => { b.part(); b.rect(x, y, w, h, mt, z, { n: [0, 0, 1] }); if (w >= 3 && h > 2) { b.toneLine(x, y, x, y + h - 1, 1); b.toneLine(x + w - 1, y, x + w - 1, y + h - 1, -1); } };
const spar2 = (b, ax, ay, bx, by, r, z, mt) => { b.part(); b.capsule(ax, ay, r, bx, by, r, mt, z, { round: 0.8, limb: false }); };
const courses2 = (b, x0, y0, w, h, ch, seed) => {
  let y = y0, row = 0;
  while (y < y0 + h - 1) {
    const c = Math.max(3, Math.min(ch + (hash(seed, row) < 0.4 ? 1 : 0), y0 + h - y));
    if (y > y0) b.toneLine(x0, y, x0 + w - 1, y, -1);
    for (let vx = x0 + (row % 2 ? 3 : 7) + Math.floor(hash(seed + 1, row) * 3), last = x0; vx < x0 + w - 2; vx += 6 + Math.floor(hash(seed + 5, vx + row) * 6)) {
      b.toneLine(vx, y, vx, y + c - 1, -1);
      const r = hash(seed + vx, row);
      if (r < 0.26) b.toneLine(last + 1, y + 1, vx - 1, y + 1, 1); else if (r > 0.86) b.toneLine(last + 1, y + c - 1, vx - 1, y + c - 1, -1);
      last = vx;
    }
    y += c; row++;
  }
};
const win2 = (b, Lt, x, y, w, h, z, o = {}) => {
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 2, V.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, V.glass, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  if (o.lit !== false && WIN.lit) for (let yy = y + Math.floor(h / 2); yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) b.dot(xx, yy, yy === y + Math.floor(h / 2) ? V.lampD : V.lamp, z + 0.15, { noLine: true, cast: 0 });
  b.toneLine(x, y, x + Math.floor(w / 2) - 1, y, 1);
  b.part(); b.rect(x + Math.floor(w / 2), y, 1, h, V.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.floor(h / 2) - 1, w, 1, V.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x, y, V.glint, z + 0.3, { noLine: true, cast: 0 });
  if (o.shutter) { b.part(); b.rect(x - 3, y - 1, 2, h + 2, o.shutter, z + 0.1, { n: [0, 0, 1] }); b.part(); b.rect(x + w + 1, y - 1, 2, h + 2, o.shutter, z + 0.1, { n: [0, 0, 1] }); }
  if (o.box) { b.part(); b.rect(x - 1, y + h + 1, w + 2, 2, V.wood, z + 0.3, { n: [0, -0.3, 0.95] }); for (let xx = x - 1; xx < x + w + 1; xx++) b.dot(xx, y + h, hash(xx, y) > 0.5 ? V.flowerR : hash(xx, y + 1) > 0.5 ? V.flowerY : V.ivyL, z + 0.35, { noLine: true }); }
  if (o.lit !== false) Lt.win(x, y + Math.floor(h / 2), w, Math.ceil(h / 2));
};
const door2 = (b, x, y, w, h, z, mt) => {
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 1, V.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, mt, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  for (let k = 1; k < 3; k++) b.toneLine(x + Math.round((w * k) / 3), y, x + Math.round((w * k) / 3), y + h - 1, -1);
  b.toneLine(x, y, x, y + h - 1, 1);
  b.part(); b.rect(x, y + Math.round(h * 0.28), w, 1, V.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.round(h * 0.7), w, 1, V.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x + w - 2, y + Math.round(h * 0.5), V.gold, z + 0.3, { noLine: true, cast: 0 });
};
// a wall lantern on an iron bracket at (x, y): the flame is a lamp
const wallLamp = (b, Lt, x, y, z, flip = 1, r = 20) => {
  // an iron arm out of the wall with a brace under it, the lantern hung from its tip
  b.part(); b.line(x, y, x + 4 * flip, y, V.iron, z); b.line(x, y + 2, x + 2 * flip, y, V.iron, z);
  lantern(b, Lt, x + 4 * flip, y + 0.5, z, r);
};
// the roof of a gable house seen from the gable end: two slopes running back up the page (vale-pix's gable)
const gable2 = (b, hw, eaveY, apexY, D, mtL, mtR, over = 3) => {
  const lE = [-hw - over, eaveY + 2], ap_ = [0, apexY - 2], rE = [hw + over, eaveY + 2];
  b.part(); b.poly([lE, ap_, [0, apexY - 2 - D], [lE[0], lE[1] - D]], mtL, 1, { n: [-0.5, -0.4, 0.76] });
  b.part(); b.poly([ap_, rE, [rE[0], rE[1] - D], [0, apexY - 2 - D]], mtR, 1, { n: [0.62, -0.32, 0.72] });
  return { lE, apex: ap_, rE };
};
// THE HOUSE: the vale cottage's language at a hall's size.
//   o.hw half width, o.wall (to the eave), o.apex (eave to ridge), o.D (roof depth), o.roof "tile" | "thatch" | "slate",
//   o.frame timber framing, o.jetty (an upper storey at wall1 that overhangs 2 px), o.walls "lime" | "rubble" | "boards",
//   o.door [x, w, h, mat], o.windows [[x, y, w, h, {shutter, box, lit}]], o.chim (x of the stack, or false), o.sign, o.lamps
const house = (o) => {
  const hw = o.hw, eave = -o.wall, apex = eave - o.apex, D = o.D, sd = o.seed ?? 3, jt = o.jetty ? 2 : 0;
  const W = hw * 2 + 70, H = o.wall + o.apex + D + 34;
  return spriteL(W, H, (b, Lt) => {
    const R = rng(sd), wallM = o.walls === "rubble" ? V.rubble : o.walls === "boards" ? V.wood : o.walls === "ochre" ? V.ochreW : V.lime;
    // the stack on the ridge, partway back
    if (o.chim !== false) {
      const cx = Math.round(o.chim ?? hw * 0.25), dd = Math.round(D * 0.45), ry = apex - 2 - dd, ch = 14 + (o.chimH ?? 0);
      b.part(); b.rect(cx - 3, ry - ch, 7, ch + 2, V.chim, 1.6, { n: [0, 0, 1] }); courses2(b, cx - 3, Math.round(ry - ch), 7, ch, 3, 5);
      b.toneLine(cx - 3, ry - ch, cx - 3, ry, 1); b.toneLine(cx + 3, ry - ch, cx + 3, ry, -1);
      b.part(); b.rect(cx - 4, ry - ch - 2, 9, 2, V.mason, 1.7, { n: [0, -0.4, 0.9] });
      b.part(); b.rect(cx - 1, ry - ch - 4, 3, 2, V.tileD, 1.75, { n: [0, 0, 1] });
    }
    // the gable wall
    const gw = hw + jt;
    if (o.jetty) {
      b.part(); b.rect(-hw, -o.jetty, hw * 2, o.jetty, wallM, 0.2, { n: [0.1, 0, 0.99] });
      b.part(); b.poly([[-gw, -o.jetty - 3], [-gw, eave], [0, apex], [gw, eave], [gw, -o.jetty - 3]], wallM, 0.2, { n: [0.1, 0, 0.99] });
      beam2(b, -gw - 1, -o.jetty - 3, gw * 2 + 2, 3, 0.35, V.woodD);
      for (let x = -gw; x < gw; x += 4) b.dot(x + 1, -o.jetty, V.woodD, 0.36);
    } else { b.part(); b.poly([[-hw, 0], [-hw, eave], [0, apex], [hw, eave], [hw, 0]], wallM, 0.2, { n: [0.1, 0, 0.99] }); }
    if (o.walls === "rubble") courses2(b, -hw, Math.round(eave), hw * 2, Math.round(-eave), 4, sd);
    if (o.walls === "boards") for (let y = eave + 2; y < 0; y += 2) b.toneLine(-hw, y, hw - 1, y, -1);
    // the gable end's east half in the shade of the roof's lip
    for (let xx = Math.floor(gw * 0.65); xx < gw; xx++) b.toneLine(xx, -2, xx, eave + 2 + Math.floor((xx / gw) * 3), -1);
    // limewash worn at the foot to rubble, moss in the splash zone
    if (!o.walls || o.walls === "lime" || o.walls === "ochre") {
      for (let i = 0; i < hw * 1.2; i++) { const bx = -hw + R() * hw * 2, by = -1 - R() * 5; b.dot(bx, by, R() < 0.55 ? V.limeD : V.rubble, 0.3, { noLine: true, cast: 0 }); }
      for (let xx = -hw; xx < hw; xx++) if (hash(xx, 77 + sd) < 0.5) b.dot(xx, -1, V.moss, 0.3, { noLine: true, cast: 0 });
    }
    // timber framing: corner posts, sill, the girt at the eave, studs and braces, the gable's collar and king post
    if (o.frame) {
      const top = o.jetty ? -o.jetty : eave;
      for (const x of [-hw, hw - 3]) beam2(b, x, top, 3, -top, 0.32, V.woodD);
      beam2(b, -hw, -3, hw * 2, 2, 0.32, V.woodD);
      if (!o.jetty) beam2(b, -hw, eave - 1, hw * 2, 3, 0.33, V.woodD);
      for (const u of o.studs ?? [-0.45, 0.45]) beam2(b, Math.round(u * hw) - 1, top, 2, -top - 3, 0.31, V.woodD);
      if (o.braces !== false) { spar2(b, -hw + 2, -4, -hw + hw * 0.4, top + 2, 0.8, 0.31, V.woodD); spar2(b, hw - 3, -4, hw - hw * 0.4, top + 2, 0.8, 0.31, V.woodD); }
      if (o.jetty) { for (const x of [-gw, gw - 3]) beam2(b, x, eave, 3, -o.jetty - 3 - eave, 0.32, V.woodD); beam2(b, -gw, eave - 1, gw * 2, 3, 0.33, V.woodD); for (const u of [-0.5, 0, 0.5]) beam2(b, Math.round(u * gw) - 1, eave, 2, -o.jetty - 3 - eave, 0.31, V.woodD); spar2(b, -gw + 2, -o.jetty - 4, -gw * 0.5, eave + 2, 0.8, 0.31, V.woodD); spar2(b, gw - 3, -o.jetty - 4, gw * 0.5, eave + 2, 0.8, 0.31, V.woodD); }
      const cy = eave - Math.round(o.apex * 0.42), cw = Math.round(gw * 0.58);
      beam2(b, -cw, cy, cw * 2, 2, 0.33, V.woodD); beam2(b, -1, apex + 2, 2, cy - apex - 2, 0.33, V.woodD);
      spar2(b, -1, cy + 1, -cw + 2, eave, 0.7, 0.32, V.woodD); spar2(b, 1, cy + 1, cw - 2, eave, 0.7, 0.32, V.woodD);
    }
    // the rubble plinth
    b.part(); b.rect(-hw - 1, -4, hw * 2 + 2, 4, V.rubble, 0.25, { n: [0, 0.1, 0.99] }); courses2(b, -hw - 1, -4, hw * 2 + 2, 4, 4, sd + 9);
    // round 3: the plinth sits in the turf (tufts behind the corners, breaking over its foot in front)
    tufts(b, -hw - 3, hw + 3, 0, R, 0.05, 2, { every: 3.5, front: 0.7, h: 2 });
    // door, windows, the gable window
    if (o.door !== false) { const [dx, dw, dh, dm] = o.door ?? [4, 8, 13, V.door]; door2(b, dx, -dh - 1, dw, dh, 0.5, dm); b.part(); b.rect(dx - 2, -1, dw + 4, 1, V.mason, 0.55, { n: [0, -0.5, 0.86] }); }
    for (const [x, y, w, h, wo] of o.windows ?? []) win2(b, Lt, x, y, w, h, 0.5, wo ?? {});
    if (o.gableWin !== false) win2(b, Lt, -3, Math.round(apex + o.apex * 0.38), 6, 6, 0.5, { lit: o.gableLit ?? true });
    // the roof
    const mL = o.roof === "tile" ? V.tile : o.roof === "slate" ? V.slate : V.thatch, mR = o.roof === "tile" ? V.tileE : o.roof === "slate" ? V.slateE : V.thatchE;
    const rf = gable2(b, gw, eave, apex, D, mL, mR, o.roof === "thatch" ? 4 : 3);
    for (let d = 2; d < D; d += o.roof === "thatch" ? 2 : 3) for (const [a, e, lit] of [[rf.lE, rf.apex, true], [rf.apex, rf.rE, false]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i < n; i++) {
        const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t - d, r = hash(sd + d, i);
        if (o.roof === "thatch") { const run = hash(sd + d * 7, Math.floor(i / (3 + (d % 3)))) ; if (run < 0.62) b.tone(X, Y, -1); if (lit && run > 0.7 && r > 0.35) b.tone(X, Y - 1, 1); if (!lit && run < 0.3) b.tone(X, Y - 1, -1); }
        else { b.tone(X, Y, -1); if ((i + (d % 6 ? 0 : 2)) % 4 === 0) b.tone(X, Y - 1, -1); if (lit && r > 0.85) b.tone(X, Y + 1, 1); }
      }
    }
    // ridge, the verge's lip along the eaves
    spar2(b, 0, apex - 2, 0, apex - 2 - D, 1.3, 1.4, o.roof === "tile" ? V.tileD : o.roof === "slate" ? V.slateE : V.thatchD);
    b.toneLine(-1, apex - 3, -1, apex - 2 - D, 1);
    // a thatched ridge is bound with hazel liggers: a cross-hatch along the ridge roll and a cut lower edge
    if (o.roof === "thatch") for (let d = 0; d < D; d += 4) { b.dot(-2, apex - 3 - d, V.thatchD, 1.45, { noLine: true }); b.dot(-1, apex - 4 - d, V.thatchD, 1.45, { noLine: true }); b.dot(1, apex - 4 - d, V.thatchD, 1.45, { noLine: true }); b.dot(2, apex - 3 - d, V.thatchD, 1.45, { noLine: true }); }
    for (const [a, e] of [[rf.lE, rf.apex], [rf.apex, rf.rE]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i <= n; i++) { const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t; b.dot(X, Y, o.roof === "tile" ? V.tileD : o.roof === "slate" ? V.slateE : V.thatchD, 1.3, { n: [0, 0.4, 0.9] }); if (o.roof === "thatch" && hash(sd, i + 300) < 0.45) b.dot(X, Y + 1, V.thatch, 1.3, { n: [0, 0.4, 0.9], noLine: true, cast: 0 }); }
    }
    // moss and weathering on the roof, thicker toward the back
    for (let k = 0; k < D * 0.6; k++) { const s = R() > 0.5 ? 1 : -1, t = 0.4 + R() * 0.6, d = R() * D; const X = s * (gw + 3) * t, Y = eave + 2 - (eave - apex) * (1 - t) - d; if (R() < 0.3 + d / D * 0.5) b.dot(X, Y, o.roof === "thatch" ? V.thatchM : V.mossL, 1.35, { noLine: true, cast: 0 }); }
    // lights and the little things round the door
    for (const [x, y, f] of o.lamps ?? []) wallLamp(b, Lt, x, y, 0.6, f ?? 1);
    if (o.butt) { const x = -hw - 4; b.part(); b.ellipse(x, -4, 3.5, 4.5, V.wood, 0.7, { round: 0.9 }); b.toneLine(x - 3, -6, x + 3, -6, -1); b.toneLine(x - 3, -2, x + 3, -2, -1); b.part(); b.ellipse(x, -8.5, 3.5, 1.2, V.glass, 0.75); }
    if (o.bench) { const x = o.bench; b.part(); b.rect(x, -5, 12, 2, V.woodL, 0.7, { n: [0, -0.5, 0.86] }); b.part(); b.rect(x + 1, -3, 2, 3, V.woodD, 0.69); b.part(); b.rect(x + 9, -3, 2, 3, V.woodD, 0.69); }
    if (o.barrels) for (let k = 0; k < o.barrels; k++) { const x = hw + 5 + k * 7; b.part(); b.ellipse(x, -4.5, 3.2, 4.5, V.wood, 0.7 + k * 0.01, { round: 0.9 }); b.toneLine(x - 3, -6, x + 3, -6, -1); b.toneLine(x - 3, -3, x + 3, -3, -1); }
    if (o.sign) {
      // the hanging sign: a post, an arm, a board painted with a crown (the Crown and Goblin)
      const sx = o.sign, top = eave - 6;
      b.part(); b.rect(sx, top, 2, -top, V.woodD, 0.9, { n: [0, 0, 1] }); b.part(); b.rect(sx - 12, top, 14, 2, V.woodD, 0.92, { n: [0, -0.4, 0.9] });
      b.part(); b.line(sx - 10, top + 2, sx - 10, top + 4, V.iron, 0.93); b.part(); b.line(sx - 3, top + 2, sx - 3, top + 4, V.iron, 0.93);
      b.part(); b.rect(sx - 12, top + 4, 11, 9, V.sign, 0.95, { n: [0, 0, 1] }); b.toneLine(sx - 12, top + 4, sx - 2, top + 4, 1);
      b.dot(sx - 9, top + 7, V.gold, 0.97); b.dot(sx - 7, top + 6, V.gold, 0.97); b.dot(sx - 5, top + 7, V.gold, 0.97); b.part(); b.rect(sx - 9, top + 8, 5, 2, V.gold, 0.97, { n: [0, 0, 1], noLine: true });
      wallLamp(b, Lt, sx + 2, top + 6, 0.98, 1);
    }
    if (o.forge) {
      // the smithy's open front: the forge's glow deep inside, an anvil on its block before it
      const [fx, fw, fh] = o.forge;
      b.part(); b.rect(fx, -fh, fw, fh - 1, V.hole, 0.45, { n: [0, 0, 1] }); beam2(b, fx - 1, -fh - 2, fw + 2, 2, 0.55, V.woodD);
      b.part(); b.rect(fx + 3, -9, 8, 5, V.rubble, 0.5, { n: [0, 0, 1] }); b.part(); b.ellipse(fx + 7, -9, 3, 1.5, V.fire, 0.52); b.dot(fx + 7, -10, V.fireL, 0.53);
      for (let k = 0; k < 4; k++) b.dot(fx + 2 + k * 3, -fh + 2 + (k % 2), V.lampD, 0.5, { noLine: true });
      Lt.win(fx + 2, -12, 10, 6); Lt.lamp(fx + 7, -9, 30, "#ff8a30");
      const ax = fx + fw + 5; b.part(); b.rect(ax - 2, -5, 4, 5, V.wood, 0.8); b.part(); b.poly([[ax - 5, -7], [ax + 4, -7], [ax + 2, -5], [ax - 3, -5]], V.iron, 0.85, { n: [0, -0.5, 0.86] }); b.part(); b.poly([[ax + 4, -7], [ax + 7, -6.5], [ax + 4, -6]], V.iron, 0.86);
    }
  }, 8);
};
// a hen house / byre lean-to: low, slate or thatch
const henhouse = (seed = 4) => house({ hw: 9, wall: 9, apex: 6, D: 12, roof: "thatch", walls: "boards", door: [-2, 4, 5, V.hole], windows: [], gableWin: false, chim: false, seed });
// the well: a round curb, posts, a little tiled roof, the bucket on its rope, a lantern on the post
const well2 = (t = 0) => spriteL(40, 48, (px, Lt) => {
  px.part().ellipse(0, -10, 10, 4.5, V.hole, 2.8);
  px.part().poly([[-11, -9], [11, -9], [11, -1], [-11, -1]], V.rubble, 3, { round: 0.95 }); px.part().ellipse(0, -1, 11, 3, V.rubble, 2.9, { round: 0.6 });
  courses2(px, -11, -9, 22, 8, 3, 4);
  px.part().ellipse(0, -9.5, 11, 4, V.mason, 3.1, { n: [0, -0.6, 0.8] }); px.part().ellipse(0, -9.5, 8, 2.6, V.hole, 3.2);
  beam2(px, -11, -28, 2, 19, 4, V.woodD); beam2(px, 9, -28, 2, 19, 4, V.woodD);
  px.part().line(-9, -21, 9, -21, V.woodL, 4.2); px.part().ellipse(-10, -21, 1.5, 1.5, V.iron, 4.3);
  px.part().poly([[-14, -26], [14, -26], [10, -35], [-10, -35]], V.tile, 5, { n: [-0.1, -0.5, 0.86] }); for (let y = -28; y > -35; y -= 2) px.toneLine(-13, y, 13, y, -1);
  px.part().rect(-11, -36, 22, 1.5, V.tileD, 5.1);
  const sw = Math.sin(t * 1.6) * 1.6;
  px.part().line(0, -21, sw, -14, V.woodL, 4.3); px.part().rect(-2 + sw, -14, 4, 4, V.wood, 4.4, { round: 1 }); px.toneLine(-2 + sw, -12, 2 + sw, -12, -1);
  // the lantern hung off the west post
  wallLamp(px, Lt, -11, -22, 4.5, -1);
  const R = rng(15); tufts(px, -13, 13, 0, R, 2, 6, { every: 3, front: 0.75 });
  px.part().ellipse(9, -0.5, 3.5, 1.6, V.mason, 3.05, { round: 0.6 });
}, 4);
// a lantern on a tall post (the fingerpost's, the yard's)
const lampPost = (h = 22) => spriteL(22, h + 14, (px, Lt) => {
  const R = rng(h); px.part().ellipse(0, -1, 3.2, 2, V.rubble, 1.8, { round: 0.7 });
  px.part().capsule(0, 0, 1.3, 0, -h, 1.1, V.woodD, 2); px.part(); px.line(0, -h, 5, -h, V.iron, 2.2); px.line(1, -h + 3, 4, -h, V.iron, 2.2);
  lantern(px, Lt, 5, -h + 0.5, 2.3, 22); collar(px, -3, 3, 0, R, 2.6); tufts(px, -5, 5, 0, R, 1.5, 2.7, { every: 2.5 });
}, 3);
const fingerpost2 = (t = 0) => spriteL(40, 44, (px, Lt) => {
  px.part().capsule(0, 0, 1.4, 0, -30, 1.3, V.woodD, 2);
  px.part().poly([[1, -27], [14, -27], [16, -25], [14, -23], [1, -23]], V.woodL, 3, { n: [0, 0, 1] }); px.part().poly([[-1, -20], [-13, -20], [-15, -18], [-13, -16], [-1, -16]], V.woodL, 3, { n: [0, 0, 1] });
  px.toneLine(3, -25, 12, -25, -1); px.toneLine(-3, -18, -11, -18, -1);
  px.part().ellipse(0, -31, 2, 1.3, V.woodD, 3);
  px.part(); px.line(0, -15, -5, -15, V.iron, 3.2); px.line(-1, -12, -3, -15, V.iron, 3.2); lantern(px, Lt, -5, -14.5, 3.25, 20);
  // footed in a cairn of field stones, turf grown over it
  const R = rng(17); for (const [x, y, r] of [[-3, -0.5, 2.6], [3, -0.5, 2.4], [0, -1.8, 2.2], [5.5, 0, 1.6]]) px.part().ellipse(x, y, r, r * 0.7, R() > 0.5 ? V.rubble : V.mason, 2.5 + x * 0.01, { round: 0.85 });
  collar(px, -6, 6, 0.3, R, 2.8); tufts(px, -8, 8, 0, R, 1.5, 2.9, { every: 2.5 });
}, 4);
const shrine2 = () => spriteL(36, 52, (px, Lt) => {
  px.part().rect(-7, -26, 14, 26, V.mason, 2, { n: SOUTH }); courses2(px, -7, -26, 14, 26, 3, 5);
  px.part().poly([[-4, -6], [4, -6], [4, -18], [0, -22], [-4, -18]], V.hole, 2.3);
  px.part().ellipse(0, -12, 2, 4, V.lime, 2.6); px.part().ellipse(0, -16.5, 1.5, 1.5, V.lime, 2.65);
  px.part().poly([[-10, -25], [10, -25], [0, -35]], V.tile, 3, { n: [-0.1, -0.5, 0.86] }); px.part().line(0, -35, 0, -39, V.iron, 3.2); px.part().line(-2, -37.5, 2, -37.5, V.iron, 3.2);
  for (const x of [-3, 3]) { px.dot(x, -7, V.lime, 2.7); px.dot(x, -8, V.fireL, 2.75); px.dot(x, -9, V.lamp, 2.75); }
  Lt.lamp(0, -8, 16);
  px.part().rect(-9, -2.5, 18, 3, V.mason, 2.4, { n: [0, -0.4, 0.9] }); courses2(px, -9, -2.5, 18, 3, 3, 8); px.toneLine(-9, 0, 8, 0, -1);
  px.part().ellipse(-11, -1.5, 3, 2, V.rubble, 2.5); for (let k = 0; k < 5; k++) px.dot(-7 + k * 3, -3, k % 2 ? V.flowerR : V.flowerY, 3);
  const R = rng(16); tufts(px, -13, 12, 0.5, R, 1.5, 3.2, { every: 2.5, front: 0.65 });
}, 4);
const campfire = (t = 0) => spriteL(20, 22, (px, Lt) => {
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; px.part().ellipse(Math.cos(a) * 6, -2 + Math.sin(a) * 2.4, 2, 1.5, V.rubble, 1 + Math.sin(a), { round: 0.9 }); }
  for (let k = 0; k < 3; k++) px.part().capsule(-4 + k * 3, -2, 1.1, -1 + k, -5, 0.9, V.woodD, 1.5);
  const f = [6, 8, 7, 5][t % 4];
  px.part().ellipse(0, -2 - f * 0.4, 3, f * 0.55, V.fire, 2); px.part().ellipse(0, -2 - f * 0.25, 1.5, f * 0.3, V.fireL, 2.1);
  Lt.lamp(0, -5, 34, "#ff9a3a");
}, 3);
const washing = (t = 0) => spriteL(56, 30, (px) => {
  px.part().capsule(-22, 0, 1, -22, -18, 1, V.woodD, 2); px.part().capsule(22, 0, 1, 22, -18, 1, V.woodD, 2);
  px.part().line(-22, -17, 22, -16, V.woodL, 2.1);
  const R = rng(5); for (const x of [-22, 22]) { collar(px, x - 2, x + 2, 0, R, 2.5); tufts(px, x - 4, x + 4, 0, R, 1.5, 2.6, { every: 2.5 }); }
  const cols = [V.cloth1, V.cloth2, V.cloth1, V.cloth3];
  for (let k = 0; k < 4; k++) { const x = -18 + k * 10, sw = Math.sin(t * 1.5 + k) * 1.5; px.part().poly([[x, -16.5], [x + 7, -16.3], [x + 7 + sw, -8 - (k % 2) * 2], [x + sw, -9]], cols[k], 2.2, { round: 0.3 }); }
}, 3);
const cat = (t = 0) => sprite(14, 14, (px) => {
  px.part().ellipse(0, -3, 2.5, 3, V.cat, 2, { round: 0.9 }); px.part().ellipse(-1.5, -6.5, 1.8, 1.6, V.cat, 2.2);
  px.dot(-3, -8, V.cat, 2.3); px.dot(-1, -8, V.cat, 2.3); px.dot(-2, -6.5, V.lichY, 2.4);
  const tl = [0, 1, 2, 1][t % 4]; px.part().limb([[2, -1], [4, -2 - tl * 0.5], [4 + tl * 0.6, -5 - tl]], 0.8, V.cat, 1.9);
}, 2);
export { hash, rng, lerp, sprite, spriteL, bottoms, silhouette, px1, worn, path, plot, M, V, courses, fence, post, haystack, woodpile, smoke,
  tufts, collar, footOf, lantern, hen3, block, rockMass, ROCKS, house, henhouse, well2, lampPost, washing, cat, campfire, shrine2 };
