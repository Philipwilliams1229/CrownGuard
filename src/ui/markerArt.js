// ============ THE MAP'S MARKERS ============
// The campaign map's waypoint markers, sculpted pixel by pixel like the star (starArt.js) and drawn
// crisp in the map's SVG overlay (CampaignMap.jsx), at the stars' density (MARK_SC art px a map unit):
// a won level's swallowtail flag (the owner's pick B, 2026-11-26) and the shield on a post that marks a
// level still to fight (a sword when open, a skull for a boss, a padlock while locked). Lit from the
// upper left; a one-pixel tinted outline per part. Pure: each returns { w, h, ax, ay, px } (rows of
// colours or null; ax / ay the foot of the post), cached.

export const MARK_SC = 15 / 6.2;   // art px a map unit, as the map's stars
const SHIELD_SC = 2.1;              // the shield a little coarser, to stand as wide as the old one

const RED = ["#3e1420", "#5a2030", "#7a3440", "#94424e", "#a8505c", "#c46a70", "#dc8a88"];
const RED_INK = "#2e0e18";
const GOLD = ["#4a2c10", "#6e4a18", "#93681f", "#b8902e", "#d8b34a", "#f0d27a", "#fff3d2"];
const GOLD_INK = "#3a200c";
const WOOD = ["#3e2816", "#5e4026", "#84603a", "#a87c4c", "#c49a64"];
const WOOD_INK = "#24160c";
const STONE = ["#5e5850", "#7e7666", "#a49c88", "#c8c0ac", "#ddd6c4"];
const STONE_INK = "#3a342c";
const SLATE = ["#2a2632", "#3a3644", "#4a4656", "#5c5868", "#706c7c", "#86828e", "#9a96a2"];
const SLATE_INK = "#1c1a22";
const STEEL = ["#5a5e6a", "#7e8290", "#a4a8b4", "#c4c8d0", "#e2e4ea", "#f6f7fa"];
const BONE = ["#6e6658", "#9a9282", "#c4bca8", "#e4dcc8", "#f6f0e0"];
const DUSK = ["#1e1420", "#2a1c2c", "#3a2a3a", "#4a3848", "#5c4858", "#6e5a6a", "#806c7c"];
const DUSK_INK = "#140c16";

const LIGHT = (() => { const v = [-0.55, -0.75, 0.9]; const m = Math.hypot(...v); return v.map((x) => x / m); })();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// a light value s (about -1..1) to a ramp step, the darkest steps kept for the outline and creases
const tone = (ramp, s, lo = 1) => ramp[clamp(Math.round(lo + ((s + 0.2) / 1.2) * (ramp.length - 2 - lo)), lo, ramp.length - 2)];

function canvas(W, H) {
  return {
    W, H,
    px: Array.from({ length: H }, () => Array(W).fill(null)),
    part: Array.from({ length: H }, () => Array(W).fill(null)),
  };
}
const put = (g, x, y, col, part) => {
  if (x < 0 || y < 0 || x >= g.W || y >= g.H) return;
  g.px[y][x] = col; g.part[y][x] = part;
};
// the tinted one-pixel line: every empty pixel touching a part takes that part's ink
function outline(g, inks) {
  const out = g.px.map((r) => r.slice());
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    if (g.px[y][x]) continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const p = g.part[y + dy]?.[x + dx];
      if (p && inks[p]) { out[y][x] = inks[p]; break; }
    }
  }
  g.px = out;
}
// an inner line where one part meets another (`a` pixels next to `b` take `col`)
function seam(g, a, b, col, dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
  const mark = [];
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    if (g.part[y][x] !== a) continue;
    if (dirs.some(([dx, dy]) => g.part[y + dy]?.[x + dx] === b)) mark.push([x, y]);
  }
  for (const [x, y] of mark) g.px[y][x] = col;
}
const ball = (g, cx, cy, r, ramp, part) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), s = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
    put(g, x, y, s > 0.93 ? ramp[ramp.length - 1] : tone(ramp, s), part);
  }
};
function inPoly(x, y, v) {
  let c = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i], [xj, yj] = v[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(x, y, v) {
  let d = 1e9;
  for (let i = 0; i < v.length; i++) {
    const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length];
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

// ---- the post and its foot ----
function post(g, x, top, bot, part = "wood") {
  for (let y = top; y < bot; y++) {
    put(g, x, y, WOOD[3], part); put(g, x + 1, y, WOOD[2], part); put(g, x + 2, y, WOOD[1], part);
    if (y % 7 === 3) put(g, x + 1, y, WOOD[1], part);   // the grain
  }
}
function plinth(g, x0, x1, y0, y1) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let c = STONE[2];
    if (y === y0) c = x < x0 + 2 ? STONE[4] : STONE[3];
    else if (x === x1 - 1 || y === y1 - 1) c = STONE[1];
    else if (x === x0) c = STONE[3];
    put(g, x, y, c, "stone");
  }
  put(g, x0 + Math.round((x1 - x0) * 0.62), y0 + 2, STONE[1], "stone");   // a chip
}

// ---- the crown on the flag ----
const CROWN = [
  "x...x...x",
  "xx.xxx.xx",
  "xxxxxxxxx",
  "xxxxxxxxx",
  "x.x.x.x.x",
];

// The won level's flag: a swallowtail in the ribbons' red, gold edged, a gold crown on it.
// style: 1 sculpted (still), 2 waving (frames 0..FLAG_FRAMES-1), 3 grand (fringe, cord and tassel,
// a spear-point finial, a stepped plinth). frame: the wave's phase.
export const FLAG_FRAMES = 6;
const FCACHE = new Map();
export function flagPixels(style = 1, frame = 0) {
  const key = `${style}|${frame}`;
  if (FCACHE.has(key)) return FCACHE.get(key);
  const grand = style === 3;
  const W = 36, H = 54, PX = 6, foot = 51;
  const g = canvas(W, H);
  // the cloth: hoist at the post, a wave that grows toward the fly, the fly cut in a V
  const x0 = PX + 3, x1 = grand ? 33 : 32, top = 7, ch = 15, notch = 6;
  const phase = (frame / FLAG_FRAMES) * Math.PI * 2;
  const k = (Math.PI * 2) / 15;
  const amp = (x) => 1.7 * ((x - x0) / (x1 - x0)) ** 0.8;
  const wave = (x) => Math.sin(k * (x - x0) - phase) * amp(x);            // the edge's rise and fall
  const depth = (x) => Math.cos(k * (x - x0) - phase) * amp(x);           // the fold toward / away
  for (let x = x0; x < x1; x++) {
    const xc = x + 0.5, w = wave(xc), dz = -(depth(xc + 0.5) - depth(xc - 0.5));
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5 - top - w) / ch;
      if (v < 0 || v > 1) continue;
      if (xc > x1 - notch * (1 - Math.abs(2 * v - 1))) continue;   // the swallowtail
      // light: the folds facing left catch the sun, the top of the cloth a little more
      const s = clamp(dz * 0.9 + 0.62 - v * 0.35 - ((x - x0) / (x1 - x0)) * 0.12, -1, 1);
      const edge = v < 0.14 || v > 0.86;
      put(g, x, y, edge ? tone(GOLD, s + 0.1, 2) : tone(RED, s, 1), edge ? "gold" : "cloth");
    }
  }
  // the crown, carried by the wave
  const cx0 = x0 + 5;
  CROWN.forEach((row, j) => [...row].forEach((ch2, i) => {
    if (ch2 !== "x") return;
    const x = cx0 + i, y = Math.round(top + 4.5 + j + wave(x + 0.5));
    put(g, x, y, j <= 1 ? (i < 4 ? GOLD[5] : GOLD[4]) : j === 4 ? GOLD[2] : i < 3 ? GOLD[5] : GOLD[4], "crown");
  }));
  seam(g, "cloth", "crown", RED[1]);
  // the hoist's binding: the cloth wraps the post
  for (let y = top; y < top + ch; y++) if (g.px[y][x0]) put(g, x0, y, y % 3 === 0 ? GOLD[3] : RED[2], "cloth");
  // the post, its finial and its foot
  post(g, PX, grand ? 5 : 4, foot - 3);
  if (grand) {
    // a spear point
    for (let y = 0; y < 5; y++) for (let x = PX + 1 - (y > 2 ? 1 : 0); x <= PX + 1 + (y > 2 ? 1 : 0); x++) put(g, x, y, x <= PX + 1 && y < 4 ? STEEL[4] : STEEL[2], "steel");
    put(g, PX, 5, GOLD[4], "gold"); put(g, PX + 1, 5, GOLD[5], "gold"); put(g, PX + 2, 5, GOLD[3], "gold");
    // the gold fringe along the cloth's foot
    for (let x = x0 + 1; x < x1 - 1; x += 2) {
      let yb = -1;
      for (let y = H - 1; y >= 0; y--) if (g.part[y][x] === "gold") { yb = y; break; }
      if (yb > 0 && yb < top + ch + 3) { put(g, x, yb + 1, GOLD[4], "fringe"); put(g, x, yb + 2, GOLD[3], "fringe"); }
    }
    // a cord from the finial, a tassel at its end
    for (let y = 6; y < 22; y++) put(g, PX - 1 - (y > 14 ? 1 : 0), y, y % 2 ? GOLD[4] : GOLD[3], "cord");
    for (let y = 22; y < 26; y++) for (let x = PX - 3; x <= PX - 1; x++) put(g, x, y, y === 22 ? GOLD[5] : x === PX - 3 ? GOLD[4] : GOLD[3], "cord");
    plinth(g, PX - 5, PX + 9, foot - 3, foot);
    plinth(g, PX - 3, PX + 7, foot - 6, foot - 3);
  } else {
    ball(g, PX + 1.5, 3, 2.6, GOLD, "gold");
    plinth(g, PX - 4, PX + 8, foot - 4, foot);
  }
  outline(g, { cloth: RED_INK, gold: GOLD_INK, crown: GOLD_INK, fringe: GOLD_INK, cord: GOLD_INK, wood: WOOD_INK, stone: STONE_INK, steel: "#2a2e38" });
  const res = { w: W, h: H, ax: PX + 1.5, ay: foot, sc: MARK_SC, px: g.px };
  FCACHE.set(key, res);
  return res;
}

// ---- the shield on a post: a level still to fight ----
// kind: "open" (a sword), "boss" (a skull), "shut" (a padlock), "bossShut". style 3 adds gold studs.
const SCACHE = new Map();
export function shieldPixels(style = 1, kind = "open") {
  const key = `${style}|${kind}`;
  if (SCACHE.has(key)) return SCACHE.get(key);
  const lit = kind === "open" || kind === "boss", boss = kind === "boss" || kind === "bossShut";
  const W = 32, H = 46, cx = 16, foot = 44;
  const g = canvas(W, H);
  // the heater: a flat top, straight shoulders, curving to a point
  const pts = [];
  const L = 3, R = 29, T = 2, S = 15, B = 33;
  pts.push([L, T], [R, T], [R, S]);
  for (let i = 1; i <= 12; i++) { const t = i / 12; pts.push([R - (R - cx) * (1 - Math.cos(t * Math.PI / 2)), S + (B - S) * Math.sin(t * Math.PI / 2)]); }
  for (let i = 11; i >= 0; i--) { const t = i / 12; pts.push([L + (cx - L) * (1 - Math.cos(t * Math.PI / 2)), S + (B - S) * Math.sin(t * Math.PI / 2)]); }
  const rimRamp = lit ? GOLD : SLATE, field = !lit ? SLATE : boss ? DUSK : RED;
  const rimW = style === 3 ? 3 : 2.2;
  // the post first, behind
  post(g, cx - 1, 28, foot - 2);
  for (let y = foot - 2; y < foot; y++) for (let x = cx - 3; x <= cx + 3; x++) put(g, x, y, y === foot - 2 ? STONE[3] : x > cx + 1 ? STONE[1] : STONE[2], "stone");
  // the face: a gentle dome, the rim a bevel that catches the light on its upper left
  const r = 10;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + 0.5, Y = y + 0.5;
    if (!inPoly(X, Y, pts)) continue;
    const e = edgeDist(X, Y, pts);
    const hgt = (xx, yy) => { const d = inPoly(xx, yy, pts) ? edgeDist(xx, yy, pts) : 0; return d < rimW ? d * 0.9 : rimW * 0.9 + Math.sqrt(clamp((d - rimW) / r, 0, 1)) * 2.2; };
    const dd = 0.6;
    const gx = (hgt(X + dd, Y) - hgt(X - dd, Y)) / (2 * dd), gy = (hgt(X, Y + dd) - hgt(X, Y - dd)) / (2 * dd);
    let nx = -gx, ny = -gy, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    const s = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    if (e < rimW) put(g, x, y, s > 0.95 && lit ? rimRamp[6] : tone(rimRamp, (s - 0.55) * 2.2 + (lit ? 0 : 0.35), 2), "rim");
    else {
      // the field: lit toward the upper left, a soft shade toward the point
      const f = (lit ? 0.95 : 0.7) - (X - L) / (R - L) * 0.4 - (Y - T) / (B - T) * 0.25 + (s - 0.85) * 1.2;
      put(g, x, y, tone(field, f, 2), "field");
    }
  }
  seam(g, "field", "rim", field[1], [[0, -1], [-1, 0]]);
  if (style === 3) for (const [sx, sy] of [[L + 2, T + 1], [R - 3, T + 1], [cx - 1, B - 3], [L + 1, S], [R - 2, S]]) {
    put(g, sx, sy, lit ? GOLD[6] : SLATE[6], "rim"); put(g, sx + 1, sy, lit ? GOLD[4] : SLATE[4], "rim");
    put(g, sx, sy + 1, lit ? GOLD[4] : SLATE[4], "rim"); put(g, sx + 1, sy + 1, lit ? GOLD[2] : SLATE[2], "rim");
  }
  // the charge
  if (boss) {
    const bone = lit ? BONE : ["#3a3844", "#4e4c58", "#66646e", "#7e7c86", "#94929a"];
    ball(g, cx, 14, 5.4, bone, "charge");
    for (let y = 17; y < 22; y++) for (let x = cx - 3; x <= cx + 2; x++) put(g, x, y, x < cx - 1 ? bone[3] : x > cx + 1 ? bone[1] : bone[2], "charge");
    const hole = lit ? "#1a0e18" : "#16141c";
    for (const [ex, ey] of [[cx - 4, 13], [cx - 3, 13], [cx - 4, 14], [cx - 3, 14], [cx + 1, 13], [cx + 2, 13], [cx + 1, 14], [cx + 2, 14], [cx, 17], [cx - 1, 17]]) put(g, ex, ey, hole, "charge");
    for (const tx of [cx - 3, cx - 1, cx + 1]) put(g, tx, 21, hole, "charge");
  } else if (lit) {
    // a sword, point down: a lit blade, a gold cross-guard and pommel
    for (let y = 9; y < 27; y++) { put(g, cx - 1, y, STEEL[4], "charge"); put(g, cx, y, STEEL[2], "charge"); }
    put(g, cx - 1, 27, STEEL[3], "charge"); put(g, cx, 27, STEEL[1], "charge"); put(g, cx - 1, 28, STEEL[2], "charge");
    for (let x = cx - 5; x <= cx + 4; x++) { put(g, x, 8, x < cx ? GOLD[5] : GOLD[4], "charge"); put(g, x, 9, GOLD[2], "charge"); }
    for (let y = 5; y < 8; y++) { put(g, cx - 1, y, WOOD[3], "charge"); put(g, cx, y, WOOD[1], "charge"); }
    ball(g, cx - 0.0, 4.3, 1.7, GOLD, "charge");
  } else {
    // a padlock
    const lock = ["#4a4656", "#625e6e", "#7e7a88", "#9a96a2", "#b4b0bc"];
    for (let y = 9; y < 15; y++) for (const x of [cx - 4, cx - 3, cx + 2, cx + 3]) put(g, x, y, x < cx ? lock[3] : lock[1], "charge");
    for (let x = cx - 3; x <= cx + 2; x++) { put(g, x, 8, lock[3], "charge"); put(g, x, 7, x < cx ? lock[4] : lock[2], "charge"); }
    for (let y = 15; y < 23; y++) for (let x = cx - 6; x <= cx + 5; x++) put(g, x, y, y === 15 ? lock[4] : x < cx - 3 ? lock[3] : x > cx + 3 ? lock[1] : lock[2], "charge");
    for (let y = 17; y < 21; y++) { put(g, cx - 1, y, "#1c1a22", "charge"); put(g, cx, y, y === 17 ? "#1c1a22" : lock[1], "charge"); }
  }
  seam(g, "field", "charge", field[0]);
  outline(g, { rim: lit ? GOLD_INK : SLATE_INK, field: lit ? (boss ? DUSK_INK : RED_INK) : SLATE_INK, wood: WOOD_INK, stone: STONE_INK, charge: "#1e1620" });
  const res = { w: W, h: H, ax: cx, ay: foot, sc: SHIELD_SC, px: g.px };
  SCACHE.set(key, res);
  return res;
}
