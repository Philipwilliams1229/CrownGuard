// ============ THE TRAPSMITH'S WORK ============
// Everything the trapsmith lays on the road, drawn flush with it, under the
// crowd: road spikes, bear-iron jaws, caltrop beds, pressure mines, and the
// aerostat's tethered balloon bombs. Called by draw.js once per frame.
//
// A late board carries hundreds of these, so every body is painted ONCE,
// art pixel by art pixel (2 per world unit), into a small sprite per kind /
// look / realm, and stamped each frame with one drawImage. Only the live
// bits are drawn per frame: a mine's slow red tell, the balloon's bob and
// its tether, the bomb's fuse spark. The dirt round each trap takes the
// realm's own road colours, so it sits IN the road on any ground.

import { INK_LINE, inkOutline, hash, mix, lighten, darken, rgba } from "./paint.js";
import { REALM } from "../data/maps.js";

// ---- iron, oak and cloth -------------------------------------------------------
const STEEL = { hi: "#eef0f4", lt: "#c4c8d0", md: "#8a909c", dk: "#565c68", dp: "#3a3e48" };
const OAK = { hi: "#d8b07a", lt: "#b8895a", md: "#8a6238", dk: "#5c3f24", dp: "#3e2a1c" };
const BRASS = { hi: "#fff0b0", lt: "#e8c860", md: "#c89a3a", dk: "#8a6228" };
const RUST = "#9a5634";
const GLINT = "#fff3d2";
const SHADE = "rgba(34,22,34,0.34)";
const A = 2;                                    // art pixels per world unit

// ---- a tiny pixel painter (art-pixel coordinates) ------------------------------
const canvas = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  return [cv, c];
};
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const P = (c, x, y, col) => R(c, x, y, 1, 1, col);
// a filled ellipse, row by row, so its edge keeps the pixel grain
const E = (c, cx, cy, rx, ry, col) => {
  c.fillStyle = col;
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const t = (y + 0.5 - cy) / ry; if (Math.abs(t) > 1) continue;
    const hw = rx * Math.sqrt(1 - t * t);
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
    if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
  }
};
// normalised distance of a pixel centre from an ellipse's centre
const inE = (x, y, cx, cy, rx, ry) => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
// a one-pixel line
const L = (c, x0, y0, x1, y1, col) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) P(c, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
};
const h2 = (x, y, s) => hash(x * 7 + s * 131, y * 13 + s * 17);

// ---- the ground a trap sits in ------------------------------------------------
const soil = () => {
  const main = REALM.PATH_MAIN || "#c9a46c", dk = REALM.PATH_DK || "#9e7d4e", edge = REALM.PATH_EDGE || "#74593a";
  return {
    turned: mix(dk, edge, 0.5),               // freshly turned earth, darker than the road
    deep: mix(edge, "#2a1c2c", 0.25),          // the hole's lip and the cracks
    loose: mix(main, dk, 0.6),                // spoil kicked up round it
    crumb: lighten(main, 0.28),                // lit crumbs on top of the spoil
    pebble: REALM.PEBBLE || "#e6cf9c",
  };
};
// a soft contact shadow, dithered at its rim so it has no hard edge
const shadowPix = (c, cx, cy, rx, ry, a = 0.3) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = inE(x, y, cx, cy, rx, ry);
    if (d > 1) continue;
    if (d > 0.72 && (x + y) & 1) continue;
    P(c, x, y, `rgba(34,22,34,${d < 0.55 ? a : a * 0.7})`);
  }
};
// disturbed earth: a ragged patch of turned soil, darker at its heart, with
// crumbs and a pebble or two round its rim
const dirt = (c, cx, cy, rx, ry, seed, dense = 0.9, core = 0.7) => {
  const S = soil();
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = inE(x, y, cx, cy, rx, ry), n = h2(x, y, seed);
    if (d > 1.12) continue;
    if (d > core && n > dense * Math.min(1, (1.14 - d) * 2.4)) {
      if (d < 1.1 && n > 0.93) P(c, x, y, S.crumb);
      continue;
    }
    P(c, x, y, n < 0.18 ? S.deep : n < 0.7 ? S.turned : n < 0.9 ? S.loose : S.crumb);
  }
  for (let i = 0; i < 3; i++) {
    const a = h2(i, seed, 3) * Math.PI * 2, r = 0.85 + h2(seed, i, 5) * 0.35;
    const px = Math.round(cx + Math.cos(a) * rx * r), py = Math.round(cy + Math.sin(a) * ry * r);
    P(c, px, py, S.pebble); P(c, px + 1, py + 1, rgba(S.deep, 0.7));
  }
};
// a few clods thrown over the front edge of a thing, to sink it in the road
const clods = (c, x0, x1, y, seed, n = 4) => {
  const S = soil();
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + (x1 - x0) * h2(i, seed, 9)), yy = y + (h2(seed, i, 11) > 0.5 ? 0 : 1);
    P(c, x, yy, S.loose); P(c, x + 1, yy, S.turned);
    if (h2(i, i, seed) > 0.5) P(c, x, yy - 1, S.crumb);
  }
};

// ---- the bake ---------------------------------------------------------------
// ground(c) paints the dirt and shadow (never inked), body(c) the object
// (given a one-art-pixel ink rim: two would swallow a thing this small),
// over(c) what lies on top of it (clods, ropes), also un-inked.
const bake = (w, h, ax, ay, { ground, body, over, ink = true, under = false }) => {
  const [cv, c] = canvas(w, h);
  if (ground) ground(c);
  if (body) {
    const [bv, b] = canvas(w, h);
    body(b);
    if (ink) inkOutline(bv, INK_LINE, 1, under ? "under" : null);
    c.drawImage(bv, 0, 0);
  }
  if (over) over(c);
  return { cv, ax, ay, w: w / A, h: h / A };
};
// one bank of sprites per road colour, filled as each look is first needed
const BANKS = new Map();
let bank = null, bankKey = null;
const useBank = () => {
  const k = REALM.PATH_MAIN || "";
  if (k !== bankKey) {
    bankKey = k;
    bank = BANKS.get(k);
    if (!bank) { bank = { spike: [], jaws: [], caltrop: [], mine: [], anchor: null, balloon: null, tell: null, spark: null }; BANKS.set(k, bank); }
  }
  return bank;
};
const put = (ctx, s, x, y) => ctx.drawImage(s.cv, Math.round((x - s.ax / A) * A) / A, Math.round((y - s.ay / A) * A) / A, s.w, s.h);

// ---- road spikes: a plank (or an iron strip) half-sunk across the road, a row
// of iron spikes standing out of it catching the sun
const bakeSpike = (v) => bake(40, 26, 20, 16, {
  ground: (c) => { shadowPix(c, 21.5, 18.5, 16, 3.6, 0.3); dirt(c, 20, 17.5, 17, 5, 11 + v); },
  body: (c) => {
    const iron = v === 2, C = iron ? { hi: STEEL.lt, lt: STEEL.md, md: STEEL.dk, dk: STEEL.dp, dp: "#2a2c34" } : OAK;
    const x0 = 7, x1 = 33;
    // the top face (lit edge along the back), then the south face going into the dirt
    R(c, x0, 12, x1 - x0, 1, C.hi); R(c, x0, 13, x1 - x0, 3, C.lt); R(c, x0, 16, x1 - x0, 1, C.md);
    R(c, x0, 17, x1 - x0, 2, C.dk);
    R(c, x0, 12, 1, 7, C.md); R(c, x1 - 1, 12, 1, 7, C.dk);
    if (iron) {
      for (const rx of [x0 + 2, 14, 20, 26, x1 - 3]) { P(c, rx, 15, STEEL.lt); P(c, rx + 1, 15, STEEL.dp); }
      P(c, 17, 17, RUST); P(c, 18, 17, RUST); P(c, 28, 18, RUST);
    } else {
      // grain, a crack, and the nails that hold the spikes
      for (let x = x0 + 1; x < x1 - 1; x++) if (h2(x, v, 21) > 0.72) P(c, x, 15, C.md);
      L(c, x0 + 3 + v * 4, 14, x0 + 7 + v * 4, 15, C.dk);
      for (const nx of [x0 + 1, x1 - 2]) { P(c, nx, 14, STEEL.dp); P(c, nx, 13, STEEL.lt); }
    }
    // the spikes: a lit face and a shaded face each, a glint on the tip
    const xs = [11, 17, 23, 29];
    xs.forEach((sx, i) => {
      if (v === 1 && i === 2) { P(c, sx, 13, STEEL.dp); P(c, sx + 1, 13, STEEL.dk); P(c, sx, 12, STEEL.md); return; }   // one snapped off
      const hgt = 5 + ((h2(i, v, 31) * 2) | 0);
      const top = 13 - hgt;
      for (let y = top; y <= 13; y++) {
        const k = (y - top) / hgt;
        if (k < 0.25) P(c, sx, y, y === top ? GLINT : STEEL.hi);
        else if (k < 0.6) { P(c, sx, y, STEEL.hi); P(c, sx + 1, y, STEEL.dk); }
        else { P(c, sx - 1, y, STEEL.lt); P(c, sx, y, STEEL.hi); P(c, sx + 1, y, STEEL.dk); }
      }
      if (i === 1 && v !== 2) P(c, sx + 1, top + 3, RUST);
      // its shadow thrown down-right across the plank
      P(c, sx + 2, 14, C.md); P(c, sx + 3, 15, C.md); P(c, sx + 2, 15, C.md);
    });
  },
  over: (c) => { clods(c, 6, 34, 19, v + 5, 7); const S = soil(); for (const ex of [5, 34]) { P(c, ex, 17, S.loose); P(c, ex, 18, S.turned); P(c, ex + (ex < 20 ? 1 : -1), 18, S.loose); } },
});

// ---- bear-iron jaws: the toothed ring laid open, the pan in its middle, a leaf
// spring out to each side, and a chain running off to a stake
const bakeJaws = (v) => bake(46, 32, 20, 15, {
  ground: (c) => {
    shadowPix(c, 21.5, 17.5, 15, 5.2, 0.3);
    dirt(c, 20, 16, 14, 6.5, 41 + v, 0.8);
    dirt(c, 37, 24, 4, 2.4, 47 + v, 0.9);
  },
  body: (c) => {
    const S = v === 1 ? { ...STEEL, lt: "#d8dce2", hi: "#ffffff" } : STEEL;      // the Guillotine's honed iron
    const cx = 20, cy = 14, rx = 10, ry = 5.5;
    // the springs, each a flattened loop of iron out past a hinge
    for (const s of [-1, 1]) {
      const x = s < 0 ? cx - rx - 5 : cx + rx;
      R(c, x, cy - 1, 5, 3, S.md); R(c, x, cy - 1, 5, 1, S.lt); R(c, x + 1, cy, 3, 1, S.dp);
      P(c, s < 0 ? x : x + 4, cy, S.dk);
    }
    // the ring: a south face, the iron, then the hole with its pan
    E(c, cx, cy + 1, rx, ry, S.dp);
    E(c, cx, cy, rx, ry, S.md);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 46; x++) {
      const d = inE(x, y, cx, cy, rx, ry);
      if (d > 1 || d < 0.72) continue;
      const lit = (x + 0.5 - cx) / rx * -0.42 + (y + 0.5 - cy) / ry * -0.58;
      if (lit > 0.45) P(c, x, y, S.lt); else if (lit < -0.45) P(c, x, y, S.dk);
    }
    E(c, cx, cy, rx - 2.6, ry - 1.9, darken(soil().turned, 0.25));
    // teeth round the inside of both jaws, pointing in
    for (let i = 0; i < 9; i++) {
      const x = cx - 6 + i * 1.5 | 0;
      if (i % 2) continue;
      P(c, x, cy - 3, S.hi); P(c, x, cy - 2, S.lt);           // the far jaw's teeth, lit on top
      P(c, x + 1, cy + 3, S.lt); P(c, x + 1, cy + 2, S.hi);   // the near jaw's, pointing up at us
    }
    // the pan: a round plate on a dog bar to the hinge
    L(c, cx - rx + 2, cy, cx - 3, cy, S.dk);
    E(c, cx + 0.5, cy + 0.5, 3, 1.8, S.dp);
    E(c, cx + 0.5, cy, 3, 1.6, S.dk);
    P(c, cx - 1, cy - 1, S.md); P(c, cx, cy - 1, S.md); P(c, cx, cy, S.lt);
    if (v === 1) { P(c, cx + 2, cy, "#a8323a"); P(c, cx + 1, cy, "#d0505a"); }        // a red mark on the pan
    // the hinges
    for (const s of [-1, 1]) { P(c, cx + s * rx - (s > 0 ? 1 : 0), cy - 1, S.hi); P(c, cx + s * rx - (s > 0 ? 1 : 0), cy, S.dp); }
  },
  over: (c) => {
    // the chain: links alternating face-on and edge-on, down to a stake
    const pts = [[31, 16], [33, 18], [34, 20], [36, 21]];
    let k = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let j = 0; j < n; j++, k++) {
        const x = Math.round(x0 + (x1 - x0) * j / n), y = Math.round(y0 + (y1 - y0) * j / n);
        P(c, x, y, k % 2 ? STEEL.dp : STEEL.lt); if (k % 2 === 0) P(c, x + 1, y + 1, SHADE);
      }
    }
    // the stake: an oak peg driven in, its cut top pale, an iron ring round it
    R(c, 36, 21, 3, 3, OAK.md); R(c, 38, 21, 1, 3, OAK.dk);
    R(c, 36, 20, 3, 1, OAK.hi); P(c, 37, 20, OAK.lt);
    R(c, 35, 22, 1, 2, INK_LINE); R(c, 39, 21, 1, 3, INK_LINE); R(c, 36, 19, 3, 1, INK_LINE);
    R(c, 35, 23, 5, 1, STEEL.dk); P(c, 35, 23, STEEL.lt);
    R(c, 36, 24, 4, 1, SHADE);
    clods(c, 12, 28, 20, 51 + v, 4);
    if (v === 1) { P(c, 39, 20, "#a8323a"); P(c, 40, 21, "#d0505a"); }             // a rag on the stake
  },
});

// ---- a bed of caltrops: four-pointed irons scattered in turned earth, one
// point of each always standing up and catching the light
// Each caltrop: three legs on the ground (one reaching toward us) and the
// fourth standing straight up, lit on its tip. No ink rim — at this size a
// rim swallows them — just a dark underside and a shadow.
const CAL_LEGS = [
  [[-1, 0, "md"], [-2, 1, "dk"], [1, 0, "md"], [2, 1, "dk"], [0, 1, "dk"], [1, 2, "dk"]],
  [[-1, 0, "md"], [-2, 0, "dk"], [1, 1, "md"], [2, 2, "dk"], [-1, 1, "dk"], [-1, 2, "dk"]],
  [[1, 0, "md"], [2, 0, "dk"], [-1, 1, "md"], [-2, 2, "dk"], [1, 1, "dk"], [1, 2, "dk"]],
];
const CAL_SPOTS = [
  [[0, 0], [-8, -3], [8, -2], [-5, 4], [6, 4], [-12, 1]],
  [[-2, -1], [6, -3], [-9, 1], [4, 4], [11, 1], [-5, -4]],
  [[1, 1], [-7, -2], [9, 2], [-3, -4], [-10, 4], [5, -3]],
];
const bakeCaltrop = (v) => bake(38, 26, 19, 13, {
  ground: (c) => { dirt(c, 19, 14, 15, 6, 61 + v, 0.4, 0); },
  ink: false,
  body: (c) => {
    CAL_SPOTS[v].forEach(([dx, dy], i) => {
      const x = 19 + dx, y = 14 + dy, legs = CAL_LEGS[(i + v) % 3];
      for (const [lx, ly] of legs) P(c, x + lx + 1, y + ly + 1, SHADE);
      P(c, x + 1, y + 1, SHADE); P(c, x + 1, y, SHADE);
      for (const [lx, ly, t] of legs) P(c, x + lx, y + ly, STEEL[t]);
      for (const [lx, ly, t] of legs) if (t === "dk" && ly >= 1) P(c, x + lx, y + ly + 1, rgba(INK_LINE, 0.55));
      P(c, x, y, STEEL.md);
      P(c, x, y - 1, STEEL.lt); P(c, x, y - 2, STEEL.hi); P(c, x, y - 3, GLINT);
      P(c, x - 1, y - 1, rgba(INK_LINE, 0.4)); P(c, x + 1, y - 2, rgba(INK_LINE, 0.4));
      if (h2(i, v, 77) > 0.72) P(c, x - 1, y, RUST);
    });
  },
});

// ---- pressure mines: an iron casing sunk under its plate in a heap of turned
// earth, with a trigger stud on top and a red tell that blinks slowly.
// look 0/1: the Blastworks' iron mine; 2: the Minefield Doctrine's powder keg;
// 3: the Aerostat Yard's, rimmed in brass.
const MINE_TELL = { 0: [14, 8], 1: [14, 8], 2: [17, 3], 3: [14, 8] };
const bakeMine = (look, v) => bake(30, 24, 14, 13, {
  ground: (c) => {
    shadowPix(c, 15.5, 14.5, 11, 4.8, 0.3);
    dirt(c, 14, 13.5, 12, 5.6, 81 + v + look * 5, 0.95);
    // the spoil heap, thrown up behind and to one side, lit on its top-left
    const S = soil(), hx = v ? 5 : 23, hy = 9;
    E(c, hx + 0.5, hy + 1, 4.5, 2.6, S.deep);
    E(c, hx, hy + 0.5, 4, 2.3, S.turned);
    E(c, hx - 0.5, hy, 2.8, 1.5, S.loose);
    P(c, hx - 2, hy - 1, S.crumb); P(c, hx - 1, hy - 1, S.crumb); P(c, hx + 1, hy + 1, S.deep);
  },
  body: (c) => {
    const cx = 14, cy = 12;
    if (look === 2) {
      // a powder keg on its side, sunk to its hoops, its fuse out of the bung
      const x0 = 8, x1 = 22;
      const rows = [[8, OAK.hi, 1], [9, OAK.lt, 0], [10, OAK.lt, 0], [11, OAK.md, 0], [12, OAK.md, 0], [13, OAK.dk, 0], [14, OAK.dk, 0], [15, OAK.dp, 1]];
      for (const [y, col, inset] of rows) R(c, x0 + inset, y, x1 - x0 - inset * 2, 1, col);
      for (let x = x0 + 2; x < x1 - 1; x += 3) P(c, x, 11, OAK.dk);                 // stave seams
      for (const hx of [x0 + 3, x1 - 4]) {                                            // red-painted hoops
        for (let y = 8; y <= 15; y++) P(c, hx, y, y < 10 ? "#e07868" : y < 13 ? "#b8483e" : "#7a2a2a");
      }
      // the near end: end grain in rings
      E(c, x0, 11.5, 2, 4, OAK.dk);
      E(c, x0 - 0.5, 11.5, 1.6, 3.4, OAK.hi);
      R(c, x0 - 1, 10, 1, 3, OAK.md); P(c, x0 - 1, 11, OAK.dk);
      // the bung and the fuse
      P(c, 15, 8, OAK.dp); P(c, 16, 8, OAK.dk);
      P(c, 15, 7, "#4a3a2a"); P(c, 16, 6, "#4a3a2a"); P(c, 16, 5, "#4a3a2a"); P(c, 17, 4, "#4a3a2a");
      return;
    }
    const brass = look === 3;
    const rim = brass ? BRASS : STEEL;
    // the casing's south face above the dirt, the rim, a dark groove, the plate
    const rx = 7.2, ry = 3.8;
    E(c, cx, cy + 1.5, rx, ry, STEEL.dp);
    E(c, cx, cy, rx, ry, rim.md);
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 8; x <= cx + 8; x++) {
      const d = inE(x, y, cx, cy, rx, ry);
      if (d > 1 || d < 0.68) continue;
      const lit = (x + 0.5 - cx) / rx * -0.42 + (y + 0.5 - cy) / ry * -0.58;
      if (lit > 0.3) P(c, x, y, rim.lt); else if (lit < -0.3) P(c, x, y, rim.dk);
    }
    E(c, cx, cy, 4.9, 2.4, STEEL.dp);
    E(c, cx, cy, 4.1, 1.9, STEEL.dk);
    P(c, cx - 3, cy - 1, STEEL.md); P(c, cx - 2, cy - 1, STEEL.md);
    // rivets round the rim
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.5, x = Math.round(cx - 0.5 + Math.cos(a) * 6), y = Math.round(cy - 0.5 + Math.sin(a) * 3);
      P(c, x, y, Math.sin(a) < 0.2 ? rim.hi : rim === STEEL ? STEEL.dp : BRASS.dk);
    }
    // the trigger: three prongs round a stud, the tell's dark lamp on the tallest
    R(c, cx - 1, cy - 1, 2, 2, STEEL.md); P(c, cx - 1, cy - 1, STEEL.hi);
    P(c, cx - 2, cy - 1, STEEL.lt); P(c, cx - 2, cy - 2, STEEL.hi);
    P(c, cx + 1, cy - 1, STEEL.dk); P(c, cx + 1, cy - 2, STEEL.lt);
    R(c, cx, cy - 3, 1, 2, STEEL.lt);
    P(c, cx, cy - 4, "#7d2f1a");
  },
  over: (c) => {
    clods(c, 6, 21, 16, 91 + v + look, 5);
    const S = soil();
    if (look !== 2) { P(c, 9, 13, S.loose); P(c, 10, 14, S.turned); P(c, 8, 13, S.crumb); P(c, 11, 14, S.loose); P(c, 19, 14, S.loose); }
    if (look === 2) { for (let x = 7; x < 23; x++) if (h2(x, 3, 7) > 0.35) P(c, x, 15 + (h2(x, 5, 7) > 0.6 ? 1 : 0), h2(x, 9, 7) > 0.7 ? S.crumb : S.loose); }
  },
});

// ---- the aerostat's balloon: ground (stake, dirt, the balloon's shadow) and
// air (a patched cloth envelope under netting, rigging down to a bomb)
const bakeAnchor = () => bake(30, 16, 12, 8, {
  ground: (c) => {
    shadowPix(c, 18, 10, 8, 3, 0.22);                  // the balloon's own shadow, down-right
    dirt(c, 12, 9, 5, 2.6, 101, 0.9);
  },
  body: (c) => {
    R(c, 11, 6, 3, 4, OAK.md); R(c, 13, 6, 1, 4, OAK.dk);
    R(c, 11, 5, 3, 1, OAK.hi);
    R(c, 11, 8, 3, 1, STEEL.dk); P(c, 11, 8, STEEL.lt);
  },
  over: (c) => { P(c, 14, 10, SHADE); P(c, 15, 10, SHADE); clods(c, 9, 15, 10, 103, 2); },
});
const RED = "#c05848", CREAM = "#e6d2a4", PATCH = "#8a7a52";
const bakeBalloon = () => bake(24, 40, 12, 38, {
  body: (c) => {
    const cx = 12, cy = 11, rx = 8.5, ry = 9.5;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const ny = (y + 0.5 - cy) / ry;
      // a pear: rounder on top, tapering to the mouth
      const wk = ny > 0 ? 1 - ny * ny * 0.45 : 1;
      const nx = (x + 0.5 - cx) / (rx * wk);
      if (nx * nx + ny * ny > 1) continue;
      const u = nx / Math.sqrt(Math.max(0.001, 1 - ny * ny));
      const gore = Math.floor((Math.asin(Math.max(-1, Math.min(1, u))) / Math.PI + 0.5) * 6);
      let col = gore % 2 ? CREAM : RED;
      if (x >= 13 && x <= 16 && y >= 6 && y <= 9) col = PATCH;                 // a patch, stitched on
      const lit = -0.42 * nx - 0.58 * ny;
      col = lit > 0.5 ? lighten(col, 0.35) : lit < -0.35 ? darken(col, 0.3) : col;
      if (col && x >= 13 && x <= 16 && y >= 6 && y <= 9 && (x === 13 || x === 16 || y === 6 || y === 9) && (x + y) % 2) col = "#4a3a2a";
      // netting over the lower half
      if (ny > -0.1 && ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0)) col = mix(col, "#3a2a22", 0.45);
      P(c, x, y, col);
    }
    P(c, 7, 5, GLINT); P(c, 8, 4, GLINT);
    // the load ring at the mouth
    R(c, 10, 20, 5, 1, OAK.lt); R(c, 10, 21, 5, 1, OAK.dk);
    // the bomb: black iron, a band, and its fuse
    E(c, 12, 33, 4, 4, STEEL.dp);
    E(c, 11.5, 32.5, 3, 3, "#4a4e58");
    P(c, 10, 31, STEEL.md); P(c, 11, 30, STEEL.lt); P(c, 10, 30, STEEL.md);
    R(c, 8, 33, 8, 1, "#2a2c34");
    R(c, 11, 28, 2, 1, STEEL.dk);
    P(c, 13, 27, "#4a3a2a"); P(c, 14, 26, "#4a3a2a");
  },
  over: (c) => {
    // rigging from the ring down to the bomb's collar
    L(c, 10, 22, 11, 28, "#6a5238"); L(c, 14, 22, 12, 28, "#6a5238");
  },
});
// the lit tell, baked once: a red bead in a soft pixel halo
const bakeTell = () => bake(7, 7, 3, 3, {
  ink: false,
  body: (c) => {
    E(c, 3.5, 3.5, 3.5, 3, "rgba(255,70,50,0.2)");
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P(c, 3 + dx, 3 + dy, "rgba(255,80,56,0.55)");
    P(c, 3, 3, "#ff5a40");
  },
});
const bakeSpark = () => bake(5, 5, 2, 2, {
  ink: false,
  body: (c) => { P(c, 2, 2, GLINT); P(c, 1, 2, "#f8d868"); P(c, 2, 1, "#f8d868"); P(c, 3, 2, "rgba(240,152,56,0.8)"); P(c, 2, 3, "rgba(240,152,56,0.8)"); },
});

const MINE_LOOK = (tr) => (tr.rank4 === "a" ? 2 : tr.rank4 === "b" ? 3 : 0);

export const drawTraps = (ctx, g) => {
  const traps = g.traps;
  if (!traps || !traps.length || typeof document === "undefined") return;
  const t = g.time || 0;
  const B = useBank();
  for (const tr of traps) {
    const tx = tr.x, ty = tr.y;
    const kind = tr.kind || (tr.sky ? "balloon" : tr.branch === "b" ? "mine" : "jaws");
    const seed = hash(Math.round(tx * 2), Math.round(ty * 2));
    if (kind === "spike") {
      const v = (seed * 3) | 0;
      put(ctx, B.spike[v] || (B.spike[v] = bakeSpike(v)), tx, ty);
    } else if (kind === "mine") {
      const look = MINE_LOOK(tr), i = look * 2 + (seed < 0.5 ? 0 : 1);
      put(ctx, B.mine[i] || (B.mine[i] = bakeMine(look, i & 1)), tx, ty);
      // the tell: a slow blink, each mine on its own beat
      if ((t * 0.6 + seed) % 1 < 0.22) {
        const at = MINE_TELL[look];
        put(ctx, B.tell || (B.tell = bakeTell()), tx + (at[0] - 14) / A, ty + (at[1] - 13) / A);
      }
    } else if (kind === "caltrop") {
      const v = (seed * 3) | 0;
      put(ctx, B.caltrop[v] || (B.caltrop[v] = bakeCaltrop(v)), tx, ty);
    } else if (kind === "balloon") {
      // only its stake and shadow here; the balloon itself flies in the sky
      // pass (drawTrapBalloons), over the crowd it waits for
      put(ctx, B.anchor || (B.anchor = bakeAnchor()), tx, ty);
    } else {
      const v = tr.rank4 === "a" && tr.branch === "a" ? 1 : 0;
      put(ctx, B.jaws[v] || (B.jaws[v] = bakeJaws(v)), tx, ty);
    }
  }
};

// The aerostat's balloons, drawn by draw.js AFTER everything that walks or
// flies, so a flier passing its stake goes under the bomb, not over it.
export const drawTrapBalloons = (ctx, g) => {
  const traps = g.traps;
  if (!traps || !traps.length || typeof document === "undefined") return;
  const t = g.time || 0;
  const B = useBank();
  for (const tr of traps) {
    const kind = tr.kind || (tr.sky ? "balloon" : tr.branch === "b" ? "mine" : "jaws");
    if (kind !== "balloon") continue;
    const tx = tr.x, ty = tr.y;
    const seed = hash(Math.round(tx * 2), Math.round(ty * 2));
    {
      // it rides the wind on its tether: a slow bob, the rope straight down
      const ph = seed * 6.28;
      const bx = Math.round(tx * A) / A;
      const by = Math.round((ty - 10 + Math.sin(t * 1.7 + ph) * 1.3) * A) / A;
      ctx.fillStyle = "#4a3a2a";
      const mid = Math.round((by + ty - 2.5) * 0.5 * A) / A;
      ctx.fillRect(bx, by, 0.5, mid - by);
      ctx.fillRect(bx + 0.5, mid, 0.5, ty - 2 - mid);
      put(ctx, B.balloon || (B.balloon = bakeBalloon()), bx, by);
      if (Math.sin(t * 9 + ph * 3) > -0.2) put(ctx, B.spark || (B.spark = bakeSpark()), bx + 1, by - 6);
    }
  }
};
