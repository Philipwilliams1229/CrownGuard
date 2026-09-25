// ============ RENDER: THE CASTLE ============
// The crown's curtain wall down the right edge of every board, and the crews
// the castle works put on it. Split out of scenery.js so the castle can be
// worked on by itself.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { workTier, bowmenSpots, masonSpots, wallDrums, GATE_TOWER_N, GATE_TOWER_S } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import { REALM } from "../data/maps.js";
import { inRiver } from "../data/terrain.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone,
  blade, tuft, strokePts, blobPath, blobBall, masonry, hash, ellipse, SUN, lin, rad, bakeSprite, PIXEL, part, INK_LINE, inkOutline, STYLE } from "./paint.js";

const CASTLE_STONE = "#a19a8a";
const ROOF = "#a8505c";

// ---- the castle -------------------------------------------------------
// The crown's curtain wall runs the whole right edge of the board, drawn the
// way the old games drew a side wall: its top seen from above, its outer
// face tipped toward us as a strip of coursed stone rising out of the grass.
// Round drums stand on it every 150 units under red cones. Where the road
// arrives a gatehouse juts out of the wall, taller than the curtain, with an
// arch as wide as the road, a portcullis half up in the dark of it, and two
// great drums either side hung with the crown's banners.

// Across the band, left to right (world x): the foot in the grass, the
// battered outer face, the battlemented parapet, the walk the crews stand
// on, the low inner parapet running off the board.
const WALL = { face0: 749, face1: 757, par1: 766, walk1: 790 };
const GATE = { face0: 741, face1: 753 };
const DRUM_X = 776, DRUM_R = 23;
const GATE_X = 776, GATE_R = 25;
const GOLD = "#d8b34a", BANNER = "#34508e";
const MERLON = 15;

const S2 = (v) => Math.round(v * 2) / 2;          // snap to the art pixel
const tone = (c, v) => (v >= 0 ? lighten(c, v) : darken(c, -v));
const box = (c, x, y, w, h, col) => {
  const x0 = S2(x), y0 = S2(y), w2 = S2(x + w) - x0, h2 = S2(y + h) - y0;
  if (w2 <= 0 || h2 <= 0) return;
  c.fillStyle = col;
  c.fillRect(x0, y0, w2, h2);
};

// One piece of the castle painted on its own small layer and given a thin
// ink edge, like paint.js part() but only as big as the piece, so the bake
// stays quick. `bb` is the piece's bounds in world units, with room for ink.
const piece = (c, [x0, y0, x1, y1], fn) => {
  if (!PIXEL || STYLE.inner <= 0 || typeof document === "undefined") { fn(c); return; }
  const m = c.getTransform();
  const dx0 = Math.floor(m.a * x0 + m.e), dy0 = Math.floor(m.d * y0 + m.f);
  const layer = document.createElement("canvas");
  layer.width = Math.ceil(m.a * (x1 - x0)) + 2; layer.height = Math.ceil(m.d * (y1 - y0)) + 2;
  const k = layer.getContext("2d", { willReadFrequently: true });   // it is read straight back for the ink
  k.imageSmoothingEnabled = false;
  k.setTransform(m.a, 0, 0, m.d, m.e - dx0, m.f - dy0);
  fn(k);
  inkOutline(layer, INK_LINE, STYLE.inner);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layer, dx0, dy0); c.restore();
};

// A face of coursed stone tipped toward us: courses run down the board and
// stack left (the foot, damp and mossy) to right (the coping, in the sun).
const outerFace = (c, x0, x1, y0, y1, seed) => piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
  const S1 = CASTLE_STONE;
  box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.48));
  const n = Math.max(2, Math.round((x1 - x0) / 2.75)), cw = (x1 - x0) / n;
  for (let col = 0; col < n; col++) {
    const x = x0 + col * cw, up = col / Math.max(1, n - 1);
    // in the shade of its own height: darkest at the damp foot, catching a
    // little light toward the top
    const base = -0.42 + up * 0.28;
    let y = y0 - hash(seed + col, 1) * 12, i = 0;
    while (y < y1) {
      const len = 7 + Math.floor(hash(seed + col * 31, i + 5) * 4) * 2;
      const a = Math.max(y0, y), b = Math.min(y1, y + len);
      box(k, x + 0.5, a + 0.5, cw - 0.5, b - a - 0.5, tone(S1, base + (hash(seed + col * 7, i * 3 + 2) - 0.5) * 0.1));
      y += len; i++;
    }
  }
  // the vertical mortar seams, half filled with grime, only faint
  k.fillStyle = rgba(darken(S1, 0.3), 0.6);
  for (let col = 1; col < n; col++) for (let y = y0; y < y1; y += 4) if (hash(seed + col, Math.floor(y)) < 0.3) k.fillRect(S2(x0 + col * cw), S2(y), 0.5, 4);
  // moss creeping up from the foot where the damp keeps it
  const moss = mix(REALM.GRASS || "#82b256", "#3e5230", 0.35);
  for (let y = Math.floor(y0); y < y1; y += 2) {
    const h = hash(seed + 99, y);
    if (h < 0.35) continue;
    const up = 1 + Math.floor(hash(seed + 98, y) * hash(seed + 97, y >> 3) * 5);
    box(k, x0, y, up * 1.2, 2, h > 0.86 ? lighten(moss, 0.18) : moss);
  }
});

// The battlements along the face's top edge: a sunlit coping, and merlons
// standing up off it — bright on top, dark on their south faces — with the
// low crenels between.
const parapet = (c, L, y0, y1, tier, seed, hurt) => {
  const S1 = CASTLE_STONE, x0 = L.face1, x1 = L.par1;
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.5));
    let i = 0;
    for (let y = y0 - hash(seed, 4) * 6; y < y1; y += 6, i++) {
      const v = (hash(seed + 5, i) - 0.5) * 0.08;
      box(k, x0 + 0.5, Math.max(y0, y) + 0.5, 2, 5.5, tone(S1, 0.3 + v));
      box(k, x0 + 3, Math.max(y0, y) + 0.5, x1 - x0 - 3.5, 5.5, tone(S1, -0.16 + v));
    }
  });
  const shade = [];
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    for (let y = y0 + 3; y < y1 - 8; y += MERLON) {
      const h = hash(seed + 11, Math.floor(y));
      if (tier >= 2 && h < (tier >= 3 ? 0.34 : 0.2)) {
        // knocked off: a ragged stump, and its stones down on the walk
        box(k, x0 + 3, y + 4, 3.5, 2, tone(S1, 0.24));
        box(k, x0 + 3, y + 6, 3.5, 1.5, tone(S1, -0.36));
        hurt.push([x1 + 3 + hash(seed, y) * 7, y + 7]);
        continue;
      }
      box(k, x0 + 0.5, y, 2.5, 9, tone(S1, 0.18));
      box(k, x0 + 3, y, x1 - x0 - 3, 6, tone(S1, 0.42 + (h - 0.5) * 0.08));
      box(k, x0 + 3, y, x1 - x0 - 3, 1, tone(S1, 0.55));
      box(k, x0 + 3, y + 6, x1 - x0 - 3, 3, tone(S1, -0.36));
      if (tier >= 1 && h > 0.86) k.clearRect(S2(x1 - 2.5), S2(y), 2.5, 3);   // a chipped corner
      shade.push(y);
    }
  });
  return shade;
};

// The walk: big worn flags sunk between the parapets, the outer parapet's
// shadow along its west edge and each merlon's thrown down-right across it.
const walk = (c, L, y0, y1, seed, shade) => {
  const S1 = CASTLE_STONE, x0 = L.par1, x1 = L.walk1;
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.36));
    let row = 0;
    for (let y = y0 - hash(seed, 8) * 6; y < y1; row++) {
      const h = 7 + Math.floor(hash(seed + 3, row) * 3) * 1.5;
      const off = hash(seed + 4, row) * 8;
      const cuts = [x0, x0 + 8 + off, x1];
      for (let i = 0; i < 2; i++) {
        const v = (hash(seed + row * 3, i + 1) - 0.5) * 0.12;
        box(k, cuts[i] + 0.5, Math.max(y0, y) + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(y1, y + h) - Math.max(y0, y) - 0.5, tone(S1, -0.1 + v));
      }
      y += h;
    }
  });
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(x0, y0, 3, y1 - y0);
  for (const y of shade) c.fillRect(x0 + 3, y + 3, 3, 8);
  // the low inner parapet, and the bailey beyond it off the board
  piece(c, [x1 - 1, y0 - 1, W + 10, y1 + 1], (k) => {
    box(k, x1, y0, W + 8 - x1, y1 - y0, darken(S1, 0.5));
    let i = 0;
    for (let y = y0 - hash(seed, 9) * 8; y < y1; y += 8, i++) {
      const v = (hash(seed + 6, i) - 0.5) * 0.1;
      box(k, x1 + 0.5, Math.max(y0, y) + 0.5, 2, 7.5, tone(S1, -0.14 + v));
      box(k, x1 + 3, Math.max(y0, y) + 0.5, W + 8 - x1 - 3, 7.5, tone(S1, 0.3 + v));
    }
  });
};

// Where the wall stands in the grass: a dark seam, and once the siege has
// told on it, chips of fallen stone.
const wallFoot = (c, x, y0, y1, seed, tier) => {
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(x - 3, y0, 3, y1 - y0);
  c.fillStyle = "rgba(30,22,32,0.14)"; c.fillRect(x - 6, y0, 3, y1 - y0);
};
// a fallen chip of stone: lit top, dark underside
const rubble = (c, x, y, seed) => {
  const w = 2 + Math.floor(hash(seed, 5) * 3) * 0.5;
  box(c, x - w / 2, y - 1, w, 1, lighten(CASTLE_STONE, 0.25));
  box(c, x - w / 2, y, w, 1, darken(CASTLE_STONE, 0.3));
};

// Stone courses wrapped round a drum: the joints crowd together toward its
// edges as the round turns away, lit on the sun side and dark on the other.
const drumCourses = (k, cx, r, y0, y1, col, seed, ch, sag = 1.2) => {
  box(k, cx - r - 1, y0, r * 2 + 2, y1 - y0, darken(col, 0.45));
  const n = Math.max(4, Math.round(r / 3));
  let row = 0;
  for (let y = y0; y < y1; y += ch, row++) {
    const sh = (row % 2) * 0.5;
    for (let j = -1; j <= n; j++) {
      const t0 = Math.max(0, (j + sh) / n), t1 = Math.min(1, (j + 1 + sh) / n);
      if (t1 <= t0) continue;
      const xa = cx - r * Math.cos(Math.PI * t0), xb = cx - r * Math.cos(Math.PI * t1);
      const u = ((xa + xb) / 2 - cx) / r;
      const band = u < -0.34 ? 0.22 : u < 0.36 ? 0.02 : -0.26;
      const dy = Math.sqrt(Math.max(0, 1 - u * u)) * sag;
      box(k, xa + 0.5, y + dy + 0.5, xb - xa - 0.5, ch - 0.5, tone(col, band + (hash(seed + row, j + 9) - 0.5) * 0.12));
    }
  }
};

// A red cone roof on a round tower, seen from above and to the south: the
// eaves an ellipse, the cone rising off it to a gold finial. Lit facets
// toward the sun, shingle courses round it. `broken` burns its top away.
const coneRoof = (c, cx, base, rx, ry, h, broken, seed) => {
  const apex = base - h;
  // the silhouette: the eaves ellipse and the cone's two tangents off it
  const ty = base - (ry * ry) / h, tx = rx * Math.sqrt(Math.max(0, 1 - (ry / h) ** 2));
  piece(c, [cx - rx - 3, apex - 3, cx + rx + 3, base + ry + 3], (k) => {
    k.save();
    if (broken) {
      const cut = apex + h * 0.5;
      k.beginPath(); k.moveTo(cx - rx - 2, base + ry + 2); k.lineTo(cx - rx - 2, cut + 3);
      for (let i = 0; i <= 8; i++) k.lineTo(cx - rx + (i / 8) * rx * 2, cut + (i % 2 ? -2.5 : 2) + hash(seed, i) * 2.5);
      k.lineTo(cx + rx + 2, base + ry + 2); k.closePath(); k.clip();
    }
    k.beginPath(); k.moveTo(cx, apex); k.lineTo(cx - tx, ty); k.lineTo(cx + tx, ty); k.closePath();
    k.ellipse(cx, base, rx, ry, 0, 0, Math.PI * 2);
    k.fillStyle = ROOF; k.fill("nonzero");
    k.save(); k.clip("nonzero");
    // a lit flank, a dark flank, each a fan from the apex
    k.fillStyle = lighten(ROOF, 0.26);
    k.beginPath(); k.moveTo(cx, apex); k.lineTo(cx - rx * 0.3, base + ry + 1); k.lineTo(cx - rx - 2, base + ry + 1); k.lineTo(cx - rx - 2, apex); k.closePath(); k.fill();
    k.fillStyle = darken(ROOF, 0.3);
    k.beginPath(); k.moveTo(cx, apex); k.lineTo(cx + rx * 0.42, base + ry + 1); k.lineTo(cx + rx + 2, base + ry + 1); k.lineTo(cx + rx + 2, apex); k.closePath(); k.fill();
    // shingle courses: the front halves of smaller ellipses up the cone
    k.lineWidth = 0.6; k.strokeStyle = darken(ROOF, 0.38);
    for (const t of [0.4, 0.7]) { k.beginPath(); k.ellipse(cx, apex + h * t, rx * t, ry * t, 0, 0, Math.PI); k.stroke(); }
    k.strokeStyle = lighten(ROOF, 0.42);
    k.beginPath(); k.moveTo(cx - 0.4, apex + 1); k.lineTo(cx - rx * 0.62, base + ry * 0.5); k.stroke();
    // the eaves: a dark hem along the front
    k.lineWidth = 1.2; k.strokeStyle = darken(ROOF, 0.45);
    k.beginPath(); k.ellipse(cx, base - 0.4, rx - 0.6, ry - 0.6, 0, 0.1, Math.PI - 0.1); k.stroke();
    k.restore();
    if (broken) { k.fillStyle = "rgba(34,22,24,0.6)"; k.beginPath(); k.ellipse(cx, apex + h * 0.56, rx * 0.5, ry * 0.45, 0, 0, Math.PI * 2); k.fill(); }
    k.restore();
  });
  if (broken) {
    for (let i = 0; i < 4; i++) box(c, cx - rx * 0.45 + i * rx * 0.3, apex + h * 0.5 - 5 - hash(seed, i + 20) * 3, 1.2, 7 + hash(seed, i + 30) * 3, "#2e2224");
    return apex + h * 0.5;
  }
  ball(c, cx, apex - 0.5, 1.9, 1.9, GOLD, { hi: 0.5, lo: 0.35 });
  return apex;
};

// A banner of the crown hung down a south face: blue, a gold hem and a gold
// crown, cut to a swallowtail. It tatters as the castle suffers.
const banner = (c, x, y, w, len, tier, seed) => {
  const L = tier >= 3 ? len * 0.6 : tier >= 2 ? len * 0.82 : len;
  piece(c, [x - 2, y - 2, x + w + 2, y + len + 2], (k) => {
    k.beginPath(); k.moveTo(x, y); k.lineTo(x + w, y);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const u = 1 - i / steps, px = x + w * u;
      const notch = Math.abs(u - 0.5) < 0.22 ? 3.5 * (1 - Math.abs(u - 0.5) / 0.22) : 0;
      k.lineTo(px, y + L - notch - (tier >= 2 ? hash(seed, i) * 3 : 0));
    }
    k.closePath();
    k.fillStyle = lin(k, x, 0, x + w, 0, [[0, lighten(BANNER, 0.22)], [0.5, BANNER], [1, darken(BANNER, 0.32)]]);
    k.fill();
    k.save(); k.clip();
    box(k, x, y, 1, L, GOLD);
    box(k, x + w - 1, y, 1, L, darken(GOLD, 0.25));
    k.restore();
    const cx = x + w / 2, cy = y + Math.min(L * 0.42, 7);
    box(k, cx - 2.5, cy, 5, 1.5, GOLD);
    for (const dx of [-2.5, -0.5, 1.5]) box(k, cx + dx, cy - 2, 1, 2, dx < 0 ? lighten(GOLD, 0.3) : GOLD);
    if (tier >= 3) { k.fillStyle = "rgba(30,20,24,0.45)"; k.fillRect(x, y + L * 0.5, w, L * 0.5); }
  });
  piece(c, [x - 3, y - 3, x + w + 3, y + 1], (k) => {
    box(k, x - 1.5, y - 1.5, w + 3, 1.5, GOLD);
    box(k, x - 1.5, y - 1.5, 1.2, 1.5, lighten(GOLD, 0.35));
  });
};

// A squat round tower straddling the wall, seen from above and to the south:
// its footing ring bulges out past both faces of the wall, a short curved
// body faces us, and on top either a battlemented platform or a red cone.
// Returns where its flag or apex and its arrow slits are, for the live
// pennant and torchlight, and where smoke would rise from it.
const drumTower = (c, cx, foot, r, hgt, o) => {
  const S1 = CASTLE_STONE, top = foot - hgt, ry = r * 0.36;
  // its shadow falls down and to the right, across the walk and the wall
  c.fillStyle = "rgba(30,22,32,0.3)";
  ellipse(c, cx + 5, foot + 3, r + 3, ry + 2.5); c.fill();
  // the battered footing, a ring wider than the body
  const fr = r + 2.5;
  piece(c, [cx - fr - 2, foot - 9, cx + fr + 2, foot + ry + 4], (k) => {
    k.save(); k.beginPath(); k.rect(cx - fr, foot - 6, fr * 2, 6); k.ellipse(cx, foot, fr, ry + 1, 0, 0, Math.PI); k.clip();
    drumCourses(k, cx, fr, foot - 6, foot + ry + 1, darken(S1, 0.08), o.seed + 5, 3.5);
    k.restore();
  });
  // the body: a short band of curved courses facing south
  piece(c, [cx - r - 2, top - ry - 2, cx + r + 2, foot + ry], (k) => {
    k.save(); k.beginPath(); k.rect(cx - r, top, r * 2, hgt - 5); k.ellipse(cx, foot - 5, r, ry, 0, 0, Math.PI); k.clip();
    drumCourses(k, cx, r, top, foot - 5 + ry, S1, o.seed, 3.8, ry * 0.35);
    k.restore();
  });
  const slits = [];
  for (const u of o.slits || [-0.45, 0.3]) {
    const sx = cx + u * r, sy = top + ry * Math.sqrt(1 - u * u) + hgt * 0.4;
    box(c, sx - 1.5, sy - 3.5, 3, 7, darken(S1, 0.2));
    box(c, sx - 1, sy - 3, 2, 6, "#1e1620");
    box(c, sx - 1.5, sy + 3, 3, 1, lighten(S1, 0.35));
    slits.push([sx, sy]);
  }
  if (o.tier >= 2) soot(c, cx, top + ry * 0.6, r, hgt * (o.tier >= 3 ? 0.7 : 0.4), o.seed);
  if (o.cone) {
    // a corbelled eave ring, and the cone on it
    const rr = r + 1;
    piece(c, [cx - rr - 2, top - ry - 3, cx + rr + 2, top + ry + 4], (k) => {
      k.save(); k.beginPath(); k.ellipse(cx, top, rr, ry + 0.6, 0, 0, Math.PI * 2); k.rect(cx - rr, top, rr * 2, 2.5); k.ellipse(cx, top + 2.5, rr, ry + 0.6, 0, 0, Math.PI); k.clip();
      drumCourses(k, cx, rr, top - ry - 1, top + ry + 3.5, lighten(S1, 0.08), o.seed + 11, 3, 0.4);
      k.restore();
    });
    const apex = coneRoof(c, cx, top - 1, r + 2, ry * 0.8, o.cone, o.broken, o.seed);
    return { flag: o.flag === false ? null : [cx, apex], smoke: [cx, apex], slits, top };
  }
  // a battlemented top: a sunlit rim round a sunken floor, merlons standing on it
  const N = Math.round(r / 2.3) * 2;
  const merl = [];
  for (let j = 0; j < N; j++) {
    const a = (Math.PI * 2 * (j + 0.5)) / N;
    const gone = o.tier >= 2 && hash(o.seed + 3, j) < (o.tier >= 3 ? 0.4 : 0.2);
    merl.push([cx + Math.cos(a) * (r - 1.6), top + Math.sin(a) * (ry - 0.8), Math.sin(a), gone]);
  }
  const drawMerl = (k, list) => {
    for (const [mx, my, s, gone] of list) {
      if (gone) { box(k, mx - 2, my - 0.5, 4, 1.5, tone(S1, -0.1)); continue; }
      box(k, mx - 2, my - 3.5, 4, 2.5, tone(S1, 0.4 - (s < 0 ? 0.08 : 0)));
      box(k, mx - 2, my - 1, 4, 2, tone(S1, -0.3));
    }
  };
  piece(c, [cx - r - 3, top - ry - 6, cx + r + 3, top + ry + 3], (k) => {
    k.fillStyle = tone(S1, 0.28);
    ellipse(k, cx, top, r, ry); k.fill();
    // the floor, down inside the parapet, the parapet's shadow across its far side
    k.fillStyle = tone(S1, -0.12);
    ellipse(k, cx, top + 0.6, r - 3.2, ry - 1.8); k.fill();
    k.fillStyle = tone(S1, -0.26);
    ellipse(k, cx - 0.8, top - 0.2, r - 3.6, ry - 2.6); k.fill();
    k.fillStyle = tone(S1, -0.12);
    ellipse(k, cx + 0.6, top + 1.2, r - 4.6, ry - 3); k.fill();
    drawMerl(k, merl.filter((m) => m[2] < 0));
    drawMerl(k, merl.filter((m) => m[2] >= 0));
  });
  return { flag: [cx + r * 0.25, top - 1], smoke: [cx, top], slits, top };
};

// The stone is baked once per damage tier into an inked sprite; the road's
// dark under the gatehouse, torchlight, pennants, smoke and fire are painted live.
let CASTLE = { key: "", cv: null, x0: 0, y0: 0, w: 0, h: 0, slits: [], flags: [], torches: [], burn: [] };

// The gatehouse: a block of stone straddling the wall where the road
// arrives, a little broader than the road. From up here we see its
// battlemented top and its south face; the road runs east in under its west
// edge, into the shadow of the passage, the portcullis's teeth hanging over
// the mouth. Tipped the same way as the curtain, so its west face shows as
// a slanting strip beside the mouth.
const GH = 40, HS = 14;                  // half its length N-S, and its height
const gatehouse = (c, gy, tier, hurt, out) => {
  const S1 = CASTLE_STONE, x0 = GATE.face0, x1 = GATE.face1, yN = gy - GH, yS = gy + GH;
  const tN = yN - HS, tS = yS - HS, lean = (x1 - x0) / HS;
  const E = W + 8;
  wallFoot(c, x0, yN, yS, 41, tier);
  // the west face, leaning back from its foot to its top edge
  piece(c, [x0 - 1, tN - 1, x1 + 1, yS + 1], (k) => {
    k.save();
    k.beginPath(); k.moveTo(x0, yN); k.lineTo(x1, tN); k.lineTo(x1, tS); k.lineTo(x0, yS); k.closePath(); k.clip();
    box(k, x0 - 1, tN - 1, x1 - x0 + 2, yS - tN + 2, darken(S1, 0.48));
    const n = 4, cw = (x1 - x0) / n;
    for (let col = 0; col < n; col++) {
      const x = x0 + col * cw, dz = (col * cw) / lean, up = col / (n - 1);
      let y = yN - dz - 6 - hash(43 + col, 1) * 8, i = 0;
      while (y < yS) {
        const len = 7 + Math.floor(hash(43 + col * 31, i + 5) * 4) * 2;
        box(k, x + 0.5, y + 0.5, cw - 0.5, len - 0.5, tone(S1, -0.4 + up * 0.28 + (hash(43 + col * 7, i * 3 + 2) - 0.5) * 0.1));
        y += len; i++;
      }
    }
    k.restore();
  });
  // the mouth of the passage: the road runs in under the face into the dark
  const m0 = gy - PATH_HALF + 2, m1 = gy + PATH_HALF - 2, mz = 10;
  piece(c, [x0 - 1, m0 - mz - 2, x1 + 1, m1 + 2], (k) => {
    k.beginPath(); k.moveTo(x0, m0); k.lineTo(x0 + mz * lean, m0 - mz); k.lineTo(x0 + mz * lean, m1 - mz); k.lineTo(x0, m1); k.closePath();
    k.fillStyle = lin(k, x0, 0, x0 + mz * lean, 0, [[0, "rgba(22,15,22,0.55)"], [0.5, "rgba(22,15,22,0.82)"], [1, "rgba(16,11,16,0.97)"]]);
    k.fill();
  });
  // the portcullis wound up into the lintel: only its bottom rail and a row
  // of iron teeth show, hanging over the mouth
  const px = x0 + (mz - 1.5) * lean;
  box(c, px - 0.5, m0 - mz + 0.5, 1.5, m1 - m0 - 1, "#3e424c");
  for (let y = m0 - mz + 2.5; y < m1 - mz; y += 3.5) {
    box(c, px - 1.5, y, 1.5, 1.5, "#6a707c");
    box(c, px - 2.5, y + 1, 1, 1.5, "#9aa0ac");
  }
  // the top: flags, a portcullis groove and murder holes over the passage,
  // and battlements round the rim
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => {
    box(k, x1, tN, E - x1, tS - tN, darken(S1, 0.34));
    let row = 0;
    for (let y = tN; y < tS; row++) {
      const h = 7 + Math.floor(hash(61, row) * 3) * 1.5, off = hash(62, row) * 7;
      const cuts = [x1, x1 + 9 + off, x1 + 21 + off * 0.5, E];
      for (let i = 0; i < 3; i++) box(k, cuts[i] + 0.5, y + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(tS, y + h) - y - 0.5, tone(S1, 0.08 + (hash(63 + row, i) - 0.5) * 0.2));
      y += h;
    }
    box(k, x1 + 11, m0 - HS, 2, m1 - m0, darken(S1, 0.55));
    for (const dy of [-12, 0, 12]) box(k, x1 + 15, gy - HS + dy - 1.5, 3, 3, darken(S1, 0.6));
  });
  // the backs of the merlons along its north rim
  piece(c, [x1 + 6, tN - 4, E + 1, tN + 4], (k) => {
    box(k, x1 + 7, tN, E - x1 - 7, 1.5, tone(S1, 0.22));
    for (let x = x1 + 12; x < E - 4; x += 10) { box(k, x, tN - 3, 6, 2.5, tone(S1, 0.38)); box(k, x, tN - 0.5, 6, 2, tone(S1, -0.28)); }
  });
  // the royal standard's pole, stepped in a socket on the top
  box(c, 795, tS - 9, 3, 2, darken(S1, 0.5));
  out.flags.push([796.5, tS - 8, 2]);
  const L = { face1: x1, par1: x1 + 7 };
  const shade = parapet(c, L, tN, tS - 5, tier, 47, hurt);
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(L.par1, tN, 3, tS - tN - 5);
  for (const y of shade) c.fillRect(L.par1 + 3, y + 3, 3, 8);
  // the battlements along its south rim, merlons standing up off a coping
  piece(c, [x1 - 1, tS - 10, E + 1, tS + 1], (k) => {
    box(k, x1, tS - 5, E - x1, 5, darken(S1, 0.45));
    box(k, x1 + 0.5, tS - 4.5, E - x1, 1.5, tone(S1, 0.3));
    box(k, x1 + 0.5, tS - 3, E - x1, 2.5, tone(S1, -0.12));
    for (let x = x1 + 1; x < E - 4; x += 10) {
      if (tier >= 2 && hash(71, x) < (tier >= 3 ? 0.35 : 0.2)) { hurt.push([x + 2, tS - 12]); continue; }
      box(k, x, tS - 9, 6, 5, tone(S1, 0.4));
      box(k, x, tS - 4, 6, 3.5, tone(S1, -0.3));
    }
  });
  // the south face, in its own shade, with a slit and the crown's banners
  piece(c, [x0 - 1, tS - 1, E + 1, yS + 1], (k) => {
    k.save();
    k.beginPath(); k.moveTo(x0, yS); k.lineTo(x1, tS); k.lineTo(E, tS); k.lineTo(E, yS); k.closePath(); k.clip();
    box(k, x0 - 1, tS - 1, E - x0 + 2, yS - tS + 2, darken(S1, 0.55));
    let row = 0;
    for (let y = tS; y < yS; y += 4, row++) {
      let x = x0 - hash(81, row) * 9, i = 0;
      while (x < E) {
        const len = 7 + Math.floor(hash(82 + row, i) * 3) * 2;
        box(k, x + 0.5, y + 0.5, len - 0.5, 3.5, tone(S1, -0.32 - (row === 2 ? 0.08 : 0) + (hash(83 + row, i) - 0.5) * 0.1));
        x += len; i++;
      }
    }
    k.restore();
  });
  box(c, 771, tS + 2.5, 2, 6, "#1e1620");
  box(c, 770.5, tS + 8.5, 3, 1, tone(S1, 0.1));
  banner(c, 757, tS + 1.5, 8, 16, tier, 5);
  banner(c, 784, tS + 1.5, 8, 16, tier, 6);
  // the torches on brackets either side of the mouth
  for (const y of [m0 - 5, m1 + 5]) {
    const tx = x0 + 6 * lean, ty = y - 6;
    box(c, tx - 2, ty + 1, 3, 1.5, "#3a3440");
    box(c, tx - 1.25, ty - 3, 1.5, 4.5, "#6a4a2e");
    out.torches.push([tx - 0.5, ty - 3]);
  }
  if (tier >= 1) crackAcross(c, x0 + 0.5, yN + 6, 7, 70);
  if (tier >= 2) { crackAcross(c, x0 + 0.5, yS - 4, 8, 71); crack(c, 796, tS + 1, 10, 72); }
  return { tN, tS };
};

const paintCastleStone = (ctx, gx, gy, tier) => {
  const out = { slits: [], flags: [], torches: [], burn: [] };
  const hurt = [];
  const yN = gy - GH, yS = gy + GH;
  // the curtain, north of the gate and south of it
  for (const [y0, y1, seed] of [[-14, yN, 11], [yS, H + 14, 29]]) {
    if (y1 <= y0) continue;
    wallFoot(ctx, WALL.face0, y0, y1, seed, tier);
    outerFace(ctx, WALL.face0, WALL.face1, y0, y1, seed);
    const shade = parapet(ctx, WALL, y0, y1, tier, seed, hurt);
    walk(ctx, WALL, y0, y1, seed, shade);
  }
  // where a river runs under the wall, a culvert: a low arch with an iron
  // grate across it, the water sliding into the dark
  let run = null;
  for (let y = -10; y <= H + 10; y++) {
    const wet = inRiver(WALL.face0 - 1, y) && Math.abs(y - gy) > 60;
    if (wet && run === null) run = y;
    if (!wet && run !== null) { culvert(ctx, run, y); run = null; }
  }
  if (tier >= 1) {
    for (let i = 0; i < tier * 3; i++) {
      const y = 20 + hash(i, 51) * (H - 40);
      if (Math.abs(y - gy) < 50) continue;
      crackAcross(ctx, WALL.face0 + 0.5, y, WALL.face1 - WALL.face0 + 1, i + 60);
    }
  }
  // the towers, evenly down the wall, and one at each end of the gatehouse:
  // the north one standing behind it, the south one far enough down the
  // wall that nothing of it rises over the gate
  const things = [];
  for (const foot of wallDrums(gy)) things.push({ cx: DRUM_X, foot, r: DRUM_R, hgt: 14, seed: foot });
  things.push({ cx: GATE_X, foot: gy + GATE_TOWER_N, r: GATE_R, hgt: 16, seed: 7, gate: -1, cone: 28 });
  things.push({ cx: GATE_X, foot: gy + GATE_TOWER_S, r: GATE_R, hgt: 16, seed: 9, gate: 1, cone: 28, flag: false });
  things.push({ house: true, foot: yS });
  things.sort((a, b) => a.foot - b.foot);
  // the fire takes the north gate tower's roof first, and one drum after it
  const drums = things.filter((t) => !t.house && !t.gate);
  const torched = tier >= 3 ? [things.find((t) => t.gate === -1), drums[0]].filter(Boolean) : [];
  // the stones of fallen merlons lie on the walk, under anything standing over it
  const fallen = () => { for (const [x, y] of hurt.splice(0)) for (let i = 0; i < 3; i++) rubble(ctx, x + (hash(x, i) - 0.5) * 7, y + (hash(y, i) - 0.5) * 6, x + y + i); };
  fallen();
  for (const t of things) {
    if (t.house) { gatehouse(ctx, gy, tier, hurt, out); fallen(); continue; }
    const burnt = torched.includes(t);
    const res = drumTower(ctx, t.cx, t.foot, t.r, t.hgt, { ...t, tier, broken: burnt });
    if (res.flag && !(burnt && t.cone)) out.flags.push([...res.flag, t.gate ? 1 : 0]);
    out.slits.push(...res.slits);
    if (tier >= 2 && (t.gate === -1 || burnt)) out.burn.push(res.smoke);
    if (tier >= 1) crack(ctx, t.cx - t.r * 0.5 + hash(t.seed, 3) * t.r, res.top + t.r * 0.36 + 1, t.hgt * (0.3 + tier * 0.12), t.seed);
  }
  return out;
};

// A culvert through the curtain for a river: arch ring, dark mouth, grate.
const culvert = (c, ya, yb) => {
  const S1 = CASTLE_STONE, x0 = WALL.face0, cy = (ya + yb) / 2, ry = (yb - ya) / 2 + 1;
  const mouth = (k, rx, r2) => {
    k.beginPath(); k.moveTo(x0, cy - r2); k.lineTo(x0 + 1.5, cy - r2);
    k.ellipse(x0 + 1.5, cy, rx, r2, 0, -Math.PI / 2, Math.PI / 2); k.lineTo(x0, cy + r2); k.closePath();
  };
  piece(c, [x0 - 2, cy - ry - 5, x0 + 12, cy + ry + 5], (k) => {
    mouth(k, 7.5, ry + 3.5);
    k.fillStyle = lighten(S1, 0.18); k.fill();
    mouth(k, 4.5, ry);
    k.fillStyle = "rgba(18,14,20,0.62)"; k.fill();
    k.save(); k.clip();
    for (let y = cy - ry + 2.5; y < cy + ry - 1; y += 3.5) box(k, x0, y, 7, 1, "#4a4e5a");
    box(k, x0 + 3, cy - ry, 1, ry * 2, "#3a3e48");
    k.restore();
  });
};

// A crack up a face: a jagged dark line with a sunlit lip on its left.
const crack = (c, x, y, len, seed) => {
  let px = x;
  for (let d = 0; d < len; d += 1.5) {
    px += (hash(seed, d * 2) - 0.5) * 2;
    box(c, px - 0.5, y + d, 1, 1.5, "rgba(40,28,34,0.8)");
    box(c, px - 1, y + d, 0.5, 1.5, "rgba(255,243,210,0.25)");
  }
};
// ...and one across the tipped face, running from foot to top edge.
const crackAcross = (c, x, y, len, seed) => {
  let py = y;
  for (let d = 0; d < len; d += 1) {
    py += (hash(seed, d * 3) - 0.5) * 2.2;
    box(c, x + d, py - 0.5, 1, 1.2, "rgba(40,28,34,0.8)");
    box(c, x + d, py - 1, 1, 0.5, "rgba(255,243,210,0.22)");
  }
};
// smoke-black licked up a drum from under its roof: a dither of soot that
// thins out as it goes down
const soot = (c, cx, top, r, depth, seed) => {
  c.fillStyle = "rgba(40,28,34,0.55)";
  for (let y = top; y < top + depth; y += 0.5) for (let x = cx - r; x < cx + r; x += 0.5) {
    const i = Math.round(x * 2), j = Math.round(y * 2);
    if ((i + j) % 2) continue;
    const fall = 1 - (y - top) / depth, wob = 0.6 + 0.4 * Math.sin(x * 0.7 + seed);
    if (hash(i + seed, j) < fall * fall * wob * 0.8) c.fillRect(x, y, 0.5, 0.5);
  }
};

// A pennant on a pole, flying toward the field: columns of cloth, each a
// beat behind the one before, so the wave runs down it.
const pennant = (ctx, x, y, time, k, col, big = false) => {
  const P = big ? 24 : 15, L = big ? 16 : 10, F = big ? 8 : 5;
  box(ctx, x - 1, y - P, 2, P, INK_LINE);
  box(ctx, x - 0.5, y - P + 0.5, 1, P - 1, "#8a6a44");
  const rows = [];
  for (let i = 0; i < L; i++) {
    const w = Math.round(Math.sin(time * 6 - i * 0.8 + k) * (0.5 + i * 0.12) * 2) / 2;
    const h = Math.max(1, S2(F * (1 - (i / L) * 0.8) + 0.5));
    rows.push([x - 1 - i, y - P + 0.5 + (F - h) / 2 + w, h]);
  }
  ctx.fillStyle = INK_LINE;
  for (const [cx, cy, h] of rows) ctx.fillRect(S2(cx) - 0.5, S2(cy) - 0.5, 1.5, h + 1);
  for (const [cx, cy, h] of rows) {
    ctx.fillStyle = col; ctx.fillRect(S2(cx), S2(cy), 1, h);
    ctx.fillStyle = lighten(col, 0.35); ctx.fillRect(S2(cx), S2(cy), 1, 0.5);
    // the royal standard carries a gold stripe down its middle
    if (big && h > 3) { ctx.fillStyle = GOLD; ctx.fillRect(S2(cx), S2(cy + h / 2 - 0.5), 1, 1); }
  }
};

// A pixel flame: a tapering stack of rows, red at the rim, yellow at the
// heart, its tip licking side to side on the frame.
const flame = (ctx, x, y, h, w, time, k) => {
  const f = Math.floor(time * 10 + k * 5) % 3;
  const hh = h * [1, 1.18, 0.88][f];
  for (let r = 0; r < hh; r += 1) {
    const u = r / hh, ww = Math.max(1, S2(w * Math.pow(1 - u, 0.8)));
    const sx = S2(x + Math.sin(f * 2.1 + r * 0.9 + k) * u * 1.2 - ww / 2);
    ctx.fillStyle = u > 0.72 ? "#f0903a" : "#d8582a";
    ctx.fillRect(sx, S2(y - r - 1), ww, 1);
    if (ww > 1.5 && u < 0.7) { ctx.fillStyle = u < 0.35 ? "#ffe08a" : "#f8b048"; ctx.fillRect(sx + 0.5, S2(y - r - 1), ww - 1, 1); }
  }
};
// A torch on the gatehouse, and its light on the stone.
const torch = (ctx, x, y, time, k, dark) => {
  glow(ctx, x, y - 2, dark ? 13 : 7, "#ffb050", dark ? 0.42 : 0.3);
  flame(ctx, x, y + 0.5, 5, 3, time, k);
};

export const drawCastle = (ctx, time, hpPct) => {
  const [gx, gy] = PTS[PTS.length - 1];
  const tier = hpPct < 0.25 ? 3 : hpPct < 0.5 ? 2 : hpPct < 0.75 ? 1 : 0;
  const dire = tier >= 3, bad = tier >= 2;
  // the road darkening as it runs in under the arch
  ctx.fillStyle = lin(ctx, gx - 24, 0, GATE.face0 + 4, 0, [[0, "rgba(16,12,16,0)"], [1, "rgba(16,12,16,0.42)"]]);
  ctx.fillRect(gx - 24, gy - PATH_HALF + 3, GATE.face0 + 4 - (gx - 24), PATH_HALF * 2 - 6);
  // the stone
  const key = `${gx}|${gy}|${tier}|${W}|${H}|${REALM.id}`;
  if (CASTLE.key !== key && typeof document !== "undefined") {
    const x0 = 724, y0 = -14, w = W + 10 - x0, h = H + 28;
    let info = null;
    const cv = bakeSprite(w, h, (c) => { c.translate(-x0, -y0); info = paintCastleStone(c, gx, gy, tier); });
    CASTLE = { key, cv, x0, y0, w, h, ...info };
  }
  if (CASTLE.cv) ctx.drawImage(CASTLE.cv, CASTLE.x0, CASTLE.y0, CASTLE.w, CASTLE.h);
  else return;
  const dark = (REALM.light?.amount ?? 0) >= 0.15;
  // torchlight in the slits, and the gate's torches
  if (!dire) for (const [cx, cy] of CASTLE.slits) if (Math.sin(time * 1.9 + cx * 0.3 + cy * 0.7) > -0.5) glow(ctx, cx, cy, dark ? 5 : 3.5, "#ffd070", 0.7);
  CASTLE.torches.forEach(([x, y], i) => torch(ctx, x, y, time, i, dark));
  // pennants on the towers still standing: gold on the wall, the crown's blue at the gate
  CASTLE.flags.forEach(([x, y, gate], i) => pennant(ctx, x, y - 1.5, time, i * 1.7, gate ? BANNER : GOLD, gate === 2));
  // smoke from the hurt drums, and fire where the roofs are gone
  if (bad) {
    // billows of smoke, lit on their sunward side, leaning off toward the field
    for (const [bx, by] of CASTLE.burn) for (let i = 3; i >= 0; i--) {
      const prog = ((time * 14 + i * 10.5 + bx) % 42) / 42;
      const smx = bx + Math.sin(time * 2 + i * 3) * 2 - prog * 12;
      const a = Math.min(1, (1 - prog) * 1.6) * (dire ? 0.85 : 0.6);
      const r = 3.5 + prog * 8;
      soft(ctx, smx, by - 5 - prog * 40, r, r * 0.85, [[0, `rgba(158,150,150,${a})`], [0.5, `rgba(96,88,92,${a})`], [0.95, `rgba(96,88,92,${a * 0.45})`], [1, "rgba(96,88,92,0)"]], -0.4, -0.45);
    }
  }
  if (dire) {
    for (const [bx, by] of CASTLE.burn) {
      glow(ctx, bx, by, 14, "#ff9040", 0.35);
      for (let i = 0; i < 3; i++) flame(ctx, bx - 7 + i * 7, by + 2, 8 + (i % 2) * 4, 5, time, i * 1.3 + bx);
    }
  }
};

// ---- the castle works ---------------------------------------------------
// What the crown has paid for stands on the wall in plain sight: bowmen on
// the walk each side of the gate, ballistae on the great drums, halberdiers
// at the portcullis and masons at their scaffold. Figures are baked once
// per pose and stamped; the ballista's recoil and the bowmen's draw follow
// the works' own cooldowns.
const WORKS = new Map();
const workFrame = (key, w, h, fn) => {
  let cv = WORKS.get(key);
  if (!cv && typeof document !== "undefined") { cv = bakeSprite(w, h, fn); WORKS.set(key, cv); }
  return cv;
};
export const drawCastleWorks = (ctx, g) => {
  const works = g.castle;
  if (!works) return;
  const [gx, gy] = PTS[PTS.length - 1];
  const time = g.time;
  const cd = g.castleCd || {};
  // the masons first: farthest from the gate, and nothing stands in front of them
  const guild = workTier(works, "masons");
  if (guild) {
    // the far ends of the walk, unless the bowmen stand there already — then
    // they're at work on the footings of the drums farthest from the gate
    const want = guild.mend > 1 ? 2 : 1;
    const bowTier = workTier(works, "archers");
    const taken = new Set(bowTier ? bowmenSpots(gy, bowTier.count) : []);
    const spots = masonSpots(gy, 99).filter((y) => !taken.has(y)).slice(0, want);
    const drums = wallDrums(gy).sort((a, b) => Math.abs(b - gy) - Math.abs(a - gy));
    for (const y of drums) if (spots.length < want) spots.push(y + 12);
    for (let k = 0; k < spots.length; k++) {
      const y = spots[k] + 6;
      cylinder(ctx, W - 40, y - 2, 20, 3, "#8a6a40", { r: 1, hi: 0.3, lo: 0.5 });
      cylinder(ctx, W - 36, y - 10, 7, 6, "#6e6a60", { r: 1.5, hi: 0.3, lo: 0.5 });
      ctx.fillStyle = "#d8d0c0"; ctx.fillRect(W - 35, y - 10, 5, 1.2);
      const fr = Math.floor(((time * 2 + k) % 2));
      const cv = workFrame(`mason|${fr}`, 30, 36, (c) => drawMason(c, 12, 33, 1, WALL_FOLK.mason, fr));
      if (cv) ctx.drawImage(cv, W - 24 - 12, y - 33 - 2, 30, 36);
    }
  }
  const bows = workTier(works, "archers");
  if (bows) {
    const big = !!bows.pierce;
    const spots = bowmenSpots(gy, bows.count);
    for (let i = 0; i < spots.length; i++) {
      const y = spots[i] + 8;
      // each bowman draws on his own beat; the one who just loosed is slack
      const phase = ((time * 1000 / bows.rate) + i / bows.count) % 1;
      const fr = Math.round(Math.min(1, phase * 1.6) * 3);
      const cv = workFrame(`bow|${big ? 1 : 0}|${fr}`, 30, 36, (c) => drawArcher(c, 17, 33, -1, WALL_FOLK.bowman, fr / 3, { big, bowCol: big ? "#3a3a44" : undefined }));
      // shoulder to shoulder they'd hide each other: every other man stands a step back
      if (cv) ctx.drawImage(cv, W - 20 - 17 + (Math.round(spots[i] / 24) % 2 ? 4 : -1), y - 33, 30, 36);
    }
  }
  const bal = workTier(works, "ballista");
  if (bal) {
    const spots = bal.twin ? [gy - 30, gy + 2] : [gy - 12];
    for (let k = 0; k < spots.length; k++) {
      const y = spots[k] + 12;
      const left = cd.ballista ?? 0;
      const recoil = Math.max(0, 1 - (bal.rate - left) / 400);
      const fr = Math.round(recoil * 2);
      const cv = workFrame(`bal|${fr}`, 44, 48, (c) => ballista(c, 22, 44, -1, fr / 2));
      if (cv) ctx.drawImage(cv, gx + 26 - 22, y - 44, 44, 48);
      if (bal.burn) glow(ctx, gx + 16, y - 24, 3.5, "#ffa040", 0.5 + 0.3 * Math.sin(time * 9 + k));
    }
  }
  const guard = workTier(works, "guards");
  if (guard) {
    // they stand on the gatehouse top either side of the passage, facing the road
    const cv = workFrame(`guard`, 28, 42, (c) => drawHalberdier(c, 16, 40, -1, WALL_FOLK.guard));
    for (const y of [gy - 34, gy + 22]) if (cv) ctx.drawImage(cv, GATE.face1 + 9 - 16, y - 40, 28, 42);
    if (guard.oil) {
      // the cauldron on the gatehouse rim over the passage, and its steam
      const cx = GATE.face1 + 6, cy = gy - 8;
      cylinder(ctx, cx - 5, cy - 4, 10, 8, "#3a3a44", { r: 2, hi: 0.35, lo: 0.5 });
      ctx.fillStyle = "#c86a2a"; ctx.fillRect(cx - 3, cy - 3, 6, 1.5);
      for (let i = 0; i < 2; i++) {
        const pr = ((time * 0.6 + i * 0.5) % 1);
        soft(ctx, cx + Math.sin(time * 3 + i) * 2, cy - 7 - pr * 10, 2.5 + pr * 3, 2 + pr * 2, [[0, `rgba(230,225,215,${(1 - pr) * 0.4})`], [1, "rgba(230,225,215,0)"]]);
      }
    }
  }
};
export const resetWorksBakes = () => WORKS.clear();

export const resetCastleBakes = () => { CASTLE.key = ""; WORKS.clear(); };
