// ============ RENDER: BRIDGES ============
// The spans that carry the road over a river (terrain.js finds them:
// BRIDGES = [{ x, y, a, d0, d1 }], the deck ARCHES by archAt(b, d), and
// draw.js lifts walkers on a deck by bridgeLift). See the style guide,
// "Bridges and boats".
//
// draw.js calls drawBridges(ctx, g) once a frame, after the water, the road's
// live bits and any River Watch skiff passing under a span, and before
// everything that walks.
//
// Each span is BAKED once per board into one pixel sprite (bakeSpan) and
// stamped every frame; only the ripples round its piles are live. The bake
// works in the span's own frame — `u` along the road from mid-span, `v`
// across it (+v to the right of travel), `z` up — the same straight frame
// terrain.js lifts walkers in, so feet land on the planks. The camera looks
// north from above: a point `z` up is drawn `z` higher on the screen, so we
// see the tops of things and every face that looks south.
//
// Three kinds, one per chapter (REALM.bridge.kind):
//   timber — the Greenwood's warm oak trestle on fieldstone abutments
//   fen    — the Hollowfen's grey, mossy, gap-toothed version of it
//   stone  — the Iron Marches' dressed-stone arch bridge with parapets

import { BRIDGES, RIVERS, archAt, inRiver, BRIDGE_HALF, BRIDGE_RISE } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { PX, SUN, INK_LINE, rgb, rgba, hash } from "./paint.js";

// ---- the kinds ---------------------------------------------------------
const KINDS = {
  timber: {
    plank: "#9a7244", plankDk: "#7a5530", beam: "#4a3018", rail: "#6e4c2a",
    stone: "#978d7b", moss: "#6f8c3c", lamp: "#ffd98a", frame: "#3a2c24",
  },
  fen: {
    plank: "#6e6656", plankDk: "#565040", beam: "#3c3428", rail: "#4a4438",
    stone: "#6c6a5a", moss: "#5c6c40", lamp: "#7ce0b8", frame: "#2c2a28", rope: "#9c9072",
  },
  stone: {
    stone: "#a19884", cope: "#bab09a", beam: "#4a3a2c", rail: "#5a4a3a",
    moss: "#62704a", lamp: "#ffcf78", frame: "#2e2a2c",
  },
};
const DEFAULT_BRIDGE = { kind: "timber", ...KINDS.timber };
const DEFAULT_WATER = { deep: "#3a6a86", edge: "#5590a8", shine: "#a8d8e8" };
const paletteOf = (pal) => {
  const r = pal || REALM.bridge || {};
  const kind = KINDS[r.kind] ? r.kind : "timber";
  return { ...KINDS[kind], ...r, kind };
};

// ---- measures (world units) ---------------------------------------------
const HALF = BRIDGE_HALF;   // 35: the deck, rail to rail
const KERB_IN = 32.2;       // the edge beams (or the parapets) run from here out
const KERB_H = 1.2;         // how far the edge beam stands above the planks
const POST_V = 34;          // the line the rail posts stand on
const DROP = 2;             // the water lies this far below the banks
const K = [0.56, 0.44];     // where a thing's shadow falls, per unit of height
const PILE_OUT = 3.4;
const EMB = 0.62;           // an abutment's pitched side: its fall per unit out from the deck       // an up-screen bent's outer pile stands this far past the deck's edge

// ---- colour, as plain numbers (the bake paints pixel by pixel) -----------
const CREAM = [255, 243, 210], PLUM = [42, 28, 44];
const mx = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lt = (a, t) => mx(a, CREAM, t);
const dk = (a, t) => mx(a, PLUM, t);
const css = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;

// ---- the span's frame ------------------------------------------------------
const frameOf = (b) => {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  const half = (b.d1 - b.d0) / 2, mid = (b.d0 + b.d1) / 2;
  // the arch, tabled: the bake asks it at every pixel
  const TAB = new Float32Array(Math.ceil((half + 12) * 2 * 20) + 2);
  for (let k = 0; k < TAB.length; k++) TAB[k] = archAt(b, mid - half - 12 + k / 20);
  const L = (u) => {
    const q = (u + half + 12) * 20;
    if (q <= 0) return TAB[0];
    const k = Math.floor(q);
    if (k >= TAB.length - 1) return TAB[TAB.length - 1];
    return TAB[k] + (TAB[k + 1] - TAB[k]) * (q - k);
  };
  // where (u, v), `z` above the ground there, is drawn
  const at = (u, v, z = 0) => [b.x + u * c - v * s, b.y + u * s + v * c - z];
  // a screen point back onto the deck-like surface z = L(u) + zo
  const onTop = (X, Y, zo, o) => {
    const x = X - b.x, y = Y - b.y;
    let u = x * c + (y + zo + 4) * s;
    if (Math.abs(s) > 1e-6) for (let k = 0; k < 6; k++) u = x * c + (y + L(u) + zo) * s;
    o[0] = u; o[1] = -x * s + (y + L(u) + zo) * c;
    return o;
  };
  // a screen point back onto an upright face standing on the line v = v0
  const onFaceV = (X, Y, v0, o) => {
    const u = (X - b.x + v0 * s) / c;
    o[0] = u; o[1] = u * s + v0 * c - (Y - b.y);
    return o;
  };
  // which spots are water: the sprite's own mask once it has one
  let MS = null;
  const useMask = (S) => { MS = S; };
  const wet = (u, v) => {
    const x = b.x + u * c - v * s, y = b.y + u * s + v * c;
    if (MS) {
      const i = Math.floor((x - MS.x0) * PX), j = Math.floor((y - MS.y0) * PX);
      if (i >= 0 && j >= 0 && i < MS.pw && j < MS.ph) return MS.wet[j * MS.pw + i] === 1;
    }
    return inRiver(x, y, 0);
  };
  // the stretch of a line v = v0 that lies over water
  const wetRun = (v0) => {
    let lo = null, hi = null;
    for (let u = -half; u <= half + 0.01; u += 0.5) if (wet(u, v0)) { if (lo === null) lo = u; hi = u; }
    return lo === null ? null : [lo, hi];
  };
  // the deck's own tilt catches the sun or turns from it: +1, 0 or -1
  const slope = (u) => {
    const d = (L(u + 0.3) - L(u - 0.3)) / 0.6;
    const sh = -d * (c * SUN.x + s * SUN.y);
    return sh > 0.15 ? 2 : sh > 0.05 ? 1 : sh < -0.15 ? -2 : sh < -0.05 ? -1 : 0;
  };
  // the side (+1 / -1) whose outward face looks at the camera, if any
  const near = c > 0.2 ? 1 : c < -0.2 ? -1 : 0;
  // the side that faces the sun (its rail throws a shadow onto the deck)
  const sunSide = (-s * SUN.x + c * SUN.y) > 0 ? 1 : -1;
  return { b, c, s, half, mid, L, at, onTop, onFaceV, wet, wetRun, slope, near, sunSide, useMask };
};

// ---- the bake's canvases -------------------------------------------------
const layerOf = (S) => {
  const cv = document.createElement("canvas");
  cv.width = S.pw; cv.height = S.ph;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  c.setTransform(PX, 0, 0, PX, -S.x0 * PX, -S.y0 * PX);
  return { cv, c };
};
const over = (dst, src, alpha = 1) => {
  dst.c.save();
  dst.c.setTransform(1, 0, 0, 1, 0, 0);
  dst.c.globalAlpha = alpha;
  dst.c.drawImage(src.cv, 0, 0);
  dst.c.restore();
};
// Harden a patch of pixels (every pixel solid or empty, no half-covered
// edges) and ink round what is solid, `passes` art pixels wide.
const INK = rgb(INK_LINE);
// `skip(i, j)` (sprite pixels, offset by ox, oy) leaves a spot bare: the
// deck's ends where the road runs on, a wing wall's end sinking into the turf.
const inkData = (img, passes, skip = null, ox = 0, oy = 0) => {
  const d = img.data, w = img.width, h = img.height, n = w * h;
  let ring = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (d[i * 4 + 3] > 110) { d[i * 4 + 3] = 255; ring[i] = 1; } else d[i * 4 + 3] = 0;
  }
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(ring);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ring[i]) continue;
        if ((x > 0 && ring[i - 1]) || (x < w - 1 && ring[i + 1]) || (y > 0 && ring[i - w]) || (y < h - 1 && ring[i + w])) {
          if (skip && skip(ox + x, oy + y)) continue;
          const k = i * 4;
          d[k] = INK[0]; d[k + 1] = INK[1]; d[k + 2] = INK[2]; d[k + 3] = 235; next[i] = 1;
        }
      }
    }
    ring = next;
  }
};
// Finish the patch `r` of the scratch layer: harden, ink, lay it over B, and
// wipe the scratch clean for the next piece.
const finish = (S, B, r, line) => {
  const L = S.scratch, m = line + 1;
  const x0 = Math.max(0, r[0] - m), y0 = Math.max(0, r[1] - m);
  const w = Math.min(S.pw, r[0] + r[2] + m) - x0, h = Math.min(S.ph, r[1] + r[3] + m) - y0;
  if (w <= 0 || h <= 0) return;
  const img = L.c.getImageData(x0, y0, w, h);
  inkData(img, line, S.bare, x0, y0);
  L.c.putImageData(img, x0, y0);
  B.c.save();
  B.c.setTransform(1, 0, 0, 1, 0, 0);
  B.c.drawImage(L.cv, x0, y0, w, h, x0, y0, w, h);
  B.c.restore();
  L.c.save(); L.c.setTransform(1, 0, 0, 1, 0, 0); L.c.clearRect(x0, y0, w, h); L.c.restore();
};
// the span's own silhouette ink, 2 art pixels, leaving the bare spots bare
const outlineSpan = (S, B, passes) => {
  const img = B.c.getImageData(0, 0, S.pw, S.ph);
  inkData(img, passes, S.bare, 0, 0);
  B.c.putImageData(img, 0, 0);
};
const harden = (cv) => {
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.getImageData(0, 0, cv.width, cv.height);
  inkData(img, 0);
  c.putImageData(img, 0, 0);
};
// Which of the sprite's pixels lie on the water: each river stroked as wide
// as it runs (round joins and ends: exactly the river's own "within w/2 of
// its line" test), read back once.
const wetMask = (S) => {
  const L = layerOf(S), c = L.c;
  c.strokeStyle = "#fff"; c.lineCap = "round"; c.lineJoin = "round";
  for (const rv of RIVERS) {
    c.lineWidth = rv.w;
    c.beginPath();
    rv.pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  const d = c.getImageData(0, 0, S.pw, S.ph).data, m = new Uint8Array(S.pw * S.ph);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return m;
};
// one piece of the span: painted on its own layer, hardened, given a thin
// ink edge, and laid over what came before (so lines fall where parts meet)
let TRK = null;           // while a piece paints: the pixel box it has touched
const track = (m, x, y) => {
  const px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f;
  if (px < TRK[0]) TRK[0] = px; if (py < TRK[1]) TRK[1] = py;
  if (px > TRK[2]) TRK[2] = px; if (py > TRK[3]) TRK[3] = py;
};
const piece = (S, B, draw, line = 1) => {
  if (!S.scratch) S.scratch = layerOf(S);
  const L = S.scratch, c = L.c;
  TRK = [Infinity, Infinity, -Infinity, -Infinity];
  const fr = c.fillRect;
  c.fillRect = function (x, y, w, h) {
    const m = this.getTransform();
    track(m, x, y); track(m, x + w, y); track(m, x, y + h); track(m, x + w, y + h);
    return fr.call(this, x, y, w, h);
  };
  c.save();
  try { draw(c, L); } finally { c.restore(); delete c.fillRect; }
  const t = TRK;
  TRK = null;
  if (t[2] < t[0]) return;
  const x0 = Math.max(0, Math.floor(t[0]) - 1), y0 = Math.max(0, Math.floor(t[1]) - 1);
  const x1 = Math.min(S.pw, Math.ceil(t[2]) + 1), y1 = Math.min(S.ph, Math.ceil(t[3]) + 1);
  if (x1 > x0 && y1 > y0) finish(S, B, [x0, y0, x1 - x0, y1 - y0], line);
};

// A surface painted pixel by pixel. `map(X, Y, o)` names the stone, plank
// or beam a screen point falls on (an id ≥ 0, with its own coordinates in
// o[0], o[1]) or -1; `paint(id, a, b, e, i, j)` colours it, told whether the
// pixel sits on its piece's lower-right edge (e.joint: a dark seam) or its
// upper-left edge (e.lip: a lit lip).
const surfacePiece = (S, B, box, map, paint, line = 1) => {
  if (!S.scratch) S.scratch = layerOf(S);
  const i0 = Math.max(0, Math.floor((box[0] - S.x0) * PX)), i1 = Math.min(S.pw - 1, Math.ceil((box[2] - S.x0) * PX));
  const j0 = Math.max(0, Math.floor((box[1] - S.y0) * PX)), j1 = Math.min(S.ph - 1, Math.ceil((box[3] - S.y0) * PX));
  if (i1 < i0 || j1 < j0) return;
  const bw = i1 - i0 + 1, bh = j1 - j0 + 1;
  const id = new Int32Array(bw * bh).fill(-1), A = new Float32Array(bw * bh), Bv = new Float32Array(bw * bh);
  const o = [0, 0];
  for (let j = 0; j < bh; j++) {
    const Y = S.y0 + (j0 + j + 0.5) / PX;
    for (let i = 0; i < bw; i++) {
      const X = S.x0 + (i0 + i + 0.5) / PX;
      const r = map(X, Y, o);
      if (r >= 0) { const q = j * bw + i; id[q] = r; A[q] = o[0]; Bv[q] = o[1]; }
    }
  }
  const img = S.scratch.c.createImageData(bw, bh), d = img.data;
  const get = (i, j) => (i < 0 || j < 0 || i >= bw || j >= bh ? -1 : id[j * bw + i]);
  const e = { joint: false, lip: false, rim: false };
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      const q = j * bw + i, s = id[q];
      if (s < 0) continue;
      const dn = get(i, j + 1), rt = get(i + 1, j), up = get(i, j - 1), lf = get(i - 1, j);
      e.joint = (dn !== s && dn >= 0) || (rt !== s && rt >= 0);
      e.lip = !e.joint && ((up !== s && up >= 0) || (lf !== s && lf >= 0));
      e.rim = dn < 0 || rt < 0 || up < 0 || lf < 0;
      const col = paint(s, A[q], Bv[q], e, i0 + i, j0 + j);
      if (!col) continue;
      const k = q * 4;
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
  }
  S.scratch.c.putImageData(img, i0, j0);
  finish(S, B, [i0, j0, bw, bh], line);
};

// the screen box round a set of (u, v, z) points
const boxOf = (F, pts, pad = 1) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [u, v, z] of pts) {
    const [x, y] = F.at(u, v, z);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
};
const spanBox = (F, v0, v1, z0, z1, uPad = 0) => {
  const pts = [];
  for (let u = -F.half - uPad; u <= F.half + uPad + 0.01; u += 2) {
    const l = F.L(u);
    pts.push([u, v0, l + z0], [u, v1, l + z0], [u, v0, l + z1], [u, v1, l + z1]);
  }
  return boxOf(F, pts, 1.5);
};

// ---- boxes: posts, stones, pillars -------------------------------------
const poly = (c, pts, col) => {
  if (TRK) { const m = c.getTransform(); for (const [x, y] of pts) track(m, x, y); }
  c.fillStyle = col;
  c.beginPath();
  pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
};
// An upright block, plan (u0..u1) x (v0..v1), from z0 up to z1: every side
// that looks south, then the top. `side(t)` colours a side by how much it
// turns toward the sun (t from -1 to 1).
const block = (c, F, u0, u1, v0, v1, z0, z1, top, side, lu = 0, lv = 0) => {
  // (lu, lv): how far its top stands off plumb, for a post that leans
  const P = (u, v, z) => (z === z1 ? F.at(u + lu, v + lv, z) : F.at(u, v, z));
  const sides = [
    [u0, v1, u1, v1, F.c, -F.s * SUN.x + F.c * SUN.y],     // the +v side
    [u0, v0, u1, v0, -F.c, F.s * SUN.x - F.c * SUN.y],     // the -v side
    [u1, v0, u1, v1, F.s, F.c * SUN.x + F.s * SUN.y],      // the +u side
    [u0, v0, u0, v1, -F.s, -F.c * SUN.x - F.s * SUN.y],    // the -u side
  ];
  for (const [ua, va, ub, vb, look, sun] of sides) {
    if (look <= 0.15) continue;
    poly(c, [P(ua, va, z1), P(ub, vb, z1), P(ub, vb, z0), P(ua, va, z0)], side(sun));
  }
  poly(c, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
};

// ---- the shadow the span throws, and the gloom under it ------------------
// Two firm tones on the water: the gloom right under the deck's edges (a
// broad band on the side away from the sun, a narrow one on the sun side)
// and, lighter, the shadow the deck and its rails throw down-right, widest
// mid-span. On the turf and the road only a light plum veil. On a span that
// runs up the screen a broken line of shine lies on the water just past the
// gloom on both sides, so the river plainly runs on under the deck.
const shadowLayer = (F, S, P, posts, water) => {
  const T = layerOf(S), c = T.c;       // the shadow thrown
  const U = layerOf(S), cu = U.c;      // the gloom under the edges
  c.fillStyle = "#1c1026"; c.strokeStyle = "#1c1026";
  c.lineCap = "butt"; c.lineJoin = "round";
  const drop = (u, v) => (F.wet(u, v) ? DROP : 0);
  const sh = (u, v, h) => {
    const [x, y] = F.at(u, v, 0), d = drop(u, v);
    return [x + K[0] * (h + d), y + K[1] * (h + d) + d];
  };
  const tall = P.kind === "stone" ? 5 : 3.2;
  // the deck, lifted by the arch: its outline thrown down-right
  const pts = [];
  for (let u = -F.half; u <= F.half + 0.01; u += 1) pts.push(sh(u, HALF + 0.4, F.L(u) + tall));
  for (let u = F.half; u >= -F.half - 0.01; u -= 1) pts.push(sh(u, -HALF - 0.4, F.L(u) + tall));
  poly(c, pts, "#1c1026");
  // the rails (timber) and the posts, thrown further
  if (P.kind !== "stone") {
    for (const sd of [-1, 1]) {
      const line = [];
      for (let u = -F.half + 2; u <= F.half - 2 + 0.01; u += 1) line.push(sh(u, sd * POST_V, F.L(u) + 6.6));
      c.lineWidth = 1.1;
      c.beginPath(); line.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    }
  }
  for (const p of posts) {
    const a = sh(p.u, p.v, F.L(p.u) + (p.z0 || 0)), b = sh(p.u, p.v, F.L(p.u) + p.h);
    c.lineWidth = p.w;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  harden(T.cv);
  // the gloom right under both edges, on the water
  // (on the side away from the sun it widens with the deck's height: a lens)
  const shadeSd = -F.sunSide, wideOf = (sd, u) => (sd === shadeSd ? 1.6 + 0.2 * F.L(u) : 1.2);
  cu.fillStyle = "#000";
  for (const sd of [-1, 1]) {
    for (let u = -F.half; u < F.half; u += 0.5) {
      const wide = wideOf(sd, u + 0.25);
      if (!F.wet(u + 0.25, sd * (HALF + 0.6))) continue;
      const [x0, y0] = F.at(u, sd * (HALF - 0.3), -DROP), [x1, y1] = F.at(u + 0.5, sd * (HALF + wide), -DROP);
      cu.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.max(0.5, Math.abs(x1 - x0)), Math.max(0.5, Math.abs(y1 - y0)));
    }
  }
  harden(U.cv);
  const deep = rgb(water.deep), shine = rgb(water.shine || "#a8d8e8");
  const band = dk(deep, 0.66), thrown = dk(deep, 0.44);
  const tc = T.c, img = tc.getImageData(0, 0, S.pw, S.ph), d = img.data;
  const ud = cu.getImageData(0, 0, S.pw, S.ph).data;
  const onWater = (i, j) => { const jw = j - DROP * PX; return jw >= 0 && S.wet[jw * S.pw + i] === 1; };
  for (let j = 0; j < S.ph; j++) {
    for (let i = 0; i < S.pw; i++) {
      const k = (j * S.pw + i) * 4;
      const inT = d[k + 3] > 0, inU = ud[k + 3] > 0;
      if (!inT && !inU) continue;
      if (onWater(i, j)) {
        const col = inU ? band : thrown;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = inU ? 240 : 205;
      } else if (inT) { d[k] = 28; d[k + 1] = 16; d[k + 2] = 38; d[k + 3] = 62; }
      else d[k + 3] = 0;
    }
  }
  // the shine past the gloom, in broken dashes, one art pixel high
  if (!F.near) {
    for (const sd of [-1, 1]) {
      const col = sd === shadeSd ? mx(thrown, shine, 0.3) : lt(mx(deep, shine, 0.75), 0.1);
      for (let u = -F.half; u < F.half; u += 0.5) {
        // (clear of the span's ink, which stands a unit out from its edge)
        const off = Math.max(wideOf(sd, u) + 0.3, 1.9);
        if (hash(Math.floor((u + 80) / 2.5), sd + 11) > 0.6 || hash(Math.floor(u * 2), sd + 3) > 0.85) continue;
        const [x, y] = F.at(u, sd * (HALF + off), -DROP);
        const i = Math.floor((x - S.x0) * PX), j = Math.floor((y - S.y0) * PX);
        if (i < 0 || j < 0 || i >= S.pw || j >= S.ph || !onWater(i, j)) continue;
        // not out on the sunlit water past the thrown shadow's edge
        const k = (j * S.pw + i) * 4;
        if (sd === shadeSd && d[k + 3] < 200) continue;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
  }
  tc.putImageData(img, 0, 0);
  return T;
};

// ---- rails, posts and newels (timber and fen) ------------------------------
// where the posts stand along each side: a newel at each end, posts between
const postsOf = (F) => {
  const end = F.half - 1.9;
  const n = Math.max(2, Math.round((end * 2) / 10.5));
  const us = [];
  for (let k = 0; k <= n; k++) us.push(-end + (2 * end * k) / n);
  return us;
};

// ---- the span, baked ------------------------------------------------------
const bakeSpan = (b, pal) => {
  const F = frameOf(b);
  const P = paletteOf(pal);
  const water = REALM.water || DEFAULT_WATER;
  const fen = P.kind === "fen", stone = P.kind === "stone";
  // the sprite's box: the deck and its walls, the tallest post, the shadow
  const probe = [];
  for (const u of [-F.half - 10, 0, F.half + 10]) {
    for (const v of [-50, 50]) for (const z of [-4, F.L(u) + 16]) probe.push([u, v, z]);
    for (const v of [-50, 50]) probe.push([u + K[0] * 30, v + K[1] * 30, -6]);
  }
  const bb = boxOf(F, probe, 2);
  const x0 = Math.floor(bb[0]), y0 = Math.floor(bb[1]);
  const w = Math.ceil(bb[2]) - x0, h = Math.ceil(bb[3]) - y0;
  const S = { x0, y0, w, h, pw: Math.ceil(w * PX), ph: Math.ceil(h * PX) };
  S.wet = wetMask(S);
  F.useMask(S);
  const B = layerOf(S);     // the span itself (inked)
  const ripples = [];

  const plank = rgb(P.plank || "#8a7050"), plankDk = rgb(P.plankDk || "#6a5440"), beam = rgb(P.beam), rail = rgb(P.rail);
  const stoneC = rgb(P.stone), moss = rgb(P.moss);
  const road = rgb(REALM.PATH_MAIN || "#c9a46c"), roadDk = rgb(REALM.PATH_DK || "#9e7d4e");
  const deep = rgb(water.deep);
  const voidC = dk(deep, 0.62), underWater = dk(deep, 0.34);
  const stoneT = [lt(stoneC, 0.12), stoneC, dk(stoneC, 0.1), mx(stoneC, moss, fen ? 0.3 : 0.12)];

  // each span its own: which corner carries a lantern (if any), and in the
  // Hollowfen which bits have rotted away
  const R = (k) => hash(((b.x | 0) * 7 + k * 13) | 0, ((b.y | 0) * 3 + k * 5) | 0);
  // the rail posts and newels (timber), or the end pillars (stone)
  const posts = [];
  const us = postsOf(F);
  // the lantern: mostly on the north side (the west, up the screen)
  let lampSide = (F.c * 1 + (-F.s) * 0.5) > 0 ? -1 : 1;
  if (R(11) < 0.3) lampSide = -lampSide;
  const lampOn = R(9) < (fen ? 0.6 : 0.8), lampEnd = R(10) < 0.6 ? 1 : -1;
  // the fen's rot: a post gone from one side, a post or two leaning out
  const missing = fen && us.length > 3 ? { sd: R(12) < 0.5 ? 1 : -1, k: 1 + Math.floor(R(13) * (us.length - 2)) } : null;
  if (!stone) {
    for (const sd of [-1, 1]) us.forEach((u, k) => {
      const newel = k === 0 || k === us.length - 1;
      if (!newel && missing && sd === missing.sd && k === missing.k) return;
      const lean = fen && !newel && R(20 + k * 2 + (sd > 0 ? 1 : 0)) < 0.2 ? 0.6 + R(40 + k) * 0.5 : 0;
      posts.push({ u, v: sd * POST_V, h: newel ? 10.4 : 6.8, w: newel ? 3.6 : 2.2, newel, sd, k, lean,
        lamp: lampOn && newel && (lampEnd > 0 ? k > 0 : k === 0) && sd === lampSide });
    });
  } else {
    for (const sd of [-1, 1]) for (const e of [-1, 1]) {
      posts.push({ u: e * (F.half - 2.7), v: sd * 33.6, h: 8.8, w: 5.4, newel: true, sd, e, lamp: lampOn && e === lampEnd && sd === lampSide });
    }
  }

  // ---- bare spots: where the road runs on at each end the deck meets it
  // with a dark sill, not a line of ink
  S.bareList = [];
  S.bare = (i, j) => {
    const X = S.x0 + (i + 0.5) / PX, Y = S.y0 + (j + 0.5) / PX;
    for (const f of S.bareList) if (f(X, Y)) return true;
    return false;
  };
  const ground = (X, Y) => { const x = X - b.x, y = Y - b.y; return [x * F.c + y * F.s, -x * F.s + y * F.c]; };
  S.bareList.push((X, Y) => { const [u, v] = ground(X, Y); return Math.abs(u) > F.half - 0.4 && Math.abs(v) < 33.2; });

  // ---- the wing walls: at each corner where the deck's side meets the bank,
  // a short retaining wall runs along the bank on its land side, its face to
  // the water and its outer end sinking into the turf
  const wing = [], cornerPiles = [];
  // walking in along the line v = vv from `from` toward `to`: the first wet spot
  const edgeFrom = (e, vv, from, to) => {
    for (let u = from; e * u >= e * to; u -= e * 0.5) if (F.wet(u, vv)) return u + e * 0.25;
    return null;
  };
  for (const e of [-1, 1]) {
    for (const sd of [-1, 1]) {
      const v1 = sd * (HALF + 0.8);
      // the side is wet right out to the deck's end: the bank crosses the end
      // instead, and a pile (a pier, in stone) holds the corner
      if (F.wet(e * (F.half - 0.5), v1)) { cornerPiles.push({ e, sd }); continue; }
      const ub = edgeFrom(e, v1, e * (F.half - 0.5), 0);
      if (ub === null) continue;
      // the bank's own run, read off the water a few steps further out
      let tu = 0, tv = sd;
      const far = edgeFrom(e, sd * (HALF + 6.8), e * (F.half + 16), -e * 6);
      if (far !== null) tu = Math.max(-1.4, Math.min(1.4, (far - ub) / 6));
      let dl = Math.hypot(tu, tv); tu /= dl; tv /= dl;
      // the land side: the perpendicular that points toward this end
      let nu = tv, nv = -tu;
      if (nu * e < 0) { nu = -nu; nv = -nv; }
      const T = stone ? 3 : 2.8;
      // a little flare toward the land
      let du = tu + nu * 0.2, dv = tv + nv * 0.2;
      dl = Math.hypot(du, dv); du /= dl; dv /= dl;
      let au = ub + nu * (T / 2 + 0.1), av = sd * (HALF - 0.8) + nv * (T / 2 + 0.1);
      au = Math.max(-(F.half - 1), Math.min(F.half - 1, au));
      // beside an up-screen span it retains the embankment, so its top runs
      // from the deck's height down into the turf
      const zD = F.near ? 0 : Math.max(0, F.L(au) - 0.6);
      const len = Math.max(stone ? 9.5 : 7.5 + hash(e + 3, sd + (b.x | 0)) * 2, zD / EMB + 2.5);
      wing.push({ A: [au, av], dir: [du, dv], n: [nu, nv], len, T, zA: Math.max(stone ? 2.8 : 2.2, zD), zB: 0.1, e, sd });
    }
  }
  const [, byC] = F.at(0, 0);
  const wingBehind = wing.filter((q) => F.at(q.A[0], q.A[1])[1] < byC);
  const wingFront = wing.filter((q) => F.at(q.A[0], q.A[1])[1] >= byC);
  const grass = [rgb(REALM.GRASS_DK || "#628f3d"), rgb(REALM.GRASS || "#82b256"), rgb(REALM.GRASS_LT || "#a4d06c")];
  for (const q of wing) {
    // its outer end goes into the turf bare
    const [au, av] = q.A, [du, dv] = q.dir;
    S.bareList.push((X, Y) => {
      const [u, v] = ground(X, Y + 0.3);
      const w = (u - au) * du + (v - av) * dv, ac = (u - au) * -dv + (v - av) * du;
      return w > q.len - 1.8 && w < q.len + 2.5 && Math.abs(ac) < q.T / 2 + 2;
    });
  }
  const drawWing = (list) => {
    for (const q of list) {
      wingWall(S, B, F, q, stoneT, moss, P.kind, deep, grass);
      // the water laps at its face
      const fu = q.A[0] - q.n[0] * (q.T / 2 + 0.3) + q.dir[0] * 2.5, fv = q.A[1] - q.n[1] * (q.T / 2 + 0.3) + q.dir[1] * 2.5;
      const [rx, ry] = F.at(fu, fv, -DROP);
      if (F.wet(fu - q.n[0] * 0.6, fv - q.n[1] * 0.6)) ripples.push({ x: rx, y: ry + 0.5, w: 2.5, seed: q.A[1] * 0.3 + q.e });
    }
  };

  // ---- the bents under a span that runs up the screen (timber / fen): a row
  // of piles across the stream, capped by a beam whose ends stand out past
  // the deck on both sides. Their south faces, standing from the water up to
  // the deck, are what shows the span's height from this camera.
  const bents = [];
  if (!stone && !F.near) {
    const ra = F.wetRun(HALF + 2.1), rb = F.wetRun(-HALF - 2.1);
    const lo = Math.min(ra ? ra[0] : 99, rb ? rb[0] : 99) + 3.2, hi = Math.max(ra ? ra[1] : -99, rb ? rb[1] : -99) - 3.2;
    if (hi >= lo - 6) {
      const n = hi - lo < 6 ? 0 : Math.max(1, Math.round((hi - lo) / 15));
      for (let k = 0; k <= n; k++) bents.push(n ? lo + ((hi - lo) * k) / n : (lo + hi) / 2);
    }
    for (const cp of cornerPiles) bents.push(cp.e * (F.half - 2));
  }
  // the shadow side (away from the sun): its piles stand in the deck's shadow
  const shadeSd = -F.sunSide;
  const deckBents = [...new Set(bents.map((u) => Math.round(u * 4) / 4))];
  // ---- cutwaters on the stone piers ------------------------------------------
  const piersOf = (v0) => {
    let run = F.wetRun(v0);
    if (!run) return { run: null, piers: [] };
    run = [Math.max(run[0], -F.half + 4.5), Math.min(run[1], F.half - 4.5)];
    if (run[1] - run[0] < 4) return { run: null, piers: [] };
    // one pier mid-stream (mid-span if the stream allows), where the deck is highest
    const wide = run[1] - run[0] > (F.near ? 24 : 18);
    const up = run[0] + 7 < 0 && run[1] - 7 > 0 ? 0 : (run[0] + run[1]) / 2;
    return { run, piers: wide ? [up] : [] };
  };

  // ======== back to front ========
  // the embankments: beside an up-screen span, where it runs over the land,
  // the ground is banked up to the deck on both sides. A slope is the one
  // thing the camera sees the height of: lit on the sun side, in shade on
  // the other, broadest at the bank, dying away at the deck's ends.
  if (!F.near) {
    const road2 = rgb(REALM.PATH_DK || "#9e7d4e");
    const zE = (u, v) => Math.max(0, F.L(u) - (Math.abs(v) - HALF) * EMB);
    const box = spanBox(F, -HALF - 1 - BRIDGE_RISE / EMB, HALF + 1 + BRIDGE_RISE / EMB, -0.5, 8.5);
    surfacePiece(S, B, box, (X, Y, o) => {
      const x = X - b.x, y = Y - b.y;
      let z = 2, u = 0, v = 0;
      for (let k = 0; k < 7; k++) {
        u = x * F.c + (y + z) * F.s; v = -x * F.s + (y + z) * F.c;
        z = zE(u, v);
      }
      if (Math.abs(u) > F.half || Math.abs(v) < HALF - 0.3 || z < 0.2 || F.wet(u, v)) return -1;
      o[0] = u; o[1] = z;
      // pitched stone in courses along the slope: dressed for the stone
      // kind, rough fieldstone for the timber ones
      const d = Math.abs(v) - HALF;
      const row = Math.floor(d / (stone ? 1.5 : 1.3));
      const blk = Math.floor((u + 60 + (row & 1) * 1.3 + (stone ? 0 : hash(row, 7) * 1.1)) / (stone ? 3.2 : 2.3 + hash(row, 8) * 0.8));
      return 10 + (row * 64 + blk) * 2 + (v > 0 ? 1 : 0);
    }, (id, u, z, e, i, j) => {
      const sd = id & 1 ? 1 : -1, lit = sd === F.sunSide;
      let col = stoneT[Math.floor(hash(id, 33) * 3)];
      col = lit ? lt(col, 0.05) : dk(col, 0.26);
      // its toe grows over with the turf it sinks into
      if (z < 0.75 && hash(i, j >> 1) < 0.75 - z * 0.6) return hash(i * 3, j) < 0.5 ? grass[1] : (lit ? grass[2] : grass[0]);
      if (!stone && fen && hash(id, 9) < 0.3 && hash(i, j) < 0.5) col = mx(col, moss, 0.6);
      if (e.joint) return dk(col, 0.34);
      if (e.lip) return lt(col, lit ? 0.14 : 0.08);
      return col;
    }, 0);
    // its toe goes into the turf with no line
    S.bareList.push((X, Y) => {
      const [u, v] = ground(X, Y);
      return Math.abs(v) > HALF + 0.6 && Math.abs(u) < F.half + 1 && !F.wet(u, v) && Math.abs(v) < HALF + 2 + BRIDGE_RISE / EMB;
    });
  }
  drawWing(wingBehind);

  // the bents, the far ones (up the screen) first
  const bentOrder = deckBents.map((u) => ({ u, y: F.at(u, 0)[1] })).sort((p, q) => p.y - q.y);
  for (const { u } of bentOrder) {
    for (const sd of [-1, 1]) {
      const vp = sd * (HALF + PILE_OUT);
      const wetFoot = F.wet(u, vp);
      posts.push({ u, v: vp, h: 0.4, z0: -F.L(u), w: 2.2, pile: true });
      bentPile(S, B, F, u, sd, P, sd === shadeSd, deep, wetFoot);
      if (wetFoot) {
        const [rx, ry] = F.at(u, vp, -DROP);
        ripples.push({ x: rx, y: ry + 1.2, w: 2.6, seed: u * 0.37 + sd });
      }
    }
  }

  // stone: the far side's cutwaters of a span across the screen (their tops
  // show above its parapet); the near side's and an up-screen span's come
  // after the deck
  const cope = rgb(P.cope || "#bab09a");

  // ---- the face that looks at the camera ----------------------------------
  if (F.near) {
    const sd = F.near, v0 = sd * HALF;
    const run = F.wetRun(v0 + sd * 0.6);
    const zTop = (u) => F.L(u) + (stone ? 5 : KERB_H);
    const bottom = (u) => (F.wet(u, v0 + sd * 0.6) ? -DROP : 0);
    const box = spanBox(F, v0, v0, -DROP - 1, stone ? 6 : 2);
    if (!stone) {
      // timber: the edge beam and the stringer below it, then the dark under
      // the deck with the trestle piles and their bracing, and fieldstone
      // abutments at each bank
      const vlo = run ? run[0] + 2.4 : 0, vhi = run ? run[1] - 2.4 : 0;
      const piles = [];
      if (run && vhi - vlo > 6) {
        const n = Math.max(1, Math.round((vhi - vlo) / 9));
        for (let k = 1; k < n + 1; k++) piles.push(vlo + ((vhi - vlo) * k) / (n + 1));
      }
      const edgesU = [vlo, ...piles, vhi];
      const braces = [];
      for (let k = 0; k < edgesU.length - 1; k++) {
        const ua = edgesU[k] + (k === 0 ? 0 : 1.1), ub = edgesU[k + 1] - (k === edgesU.length - 2 ? 0 : 1.1);
        const za = zTop(ua) - 3.8, zb2 = zTop(ub) - 3.8;
        if (Math.min(za, zb2) + DROP < 4.2 || ub - ua < 3) continue;
        braces.push([ua, za, ub, -DROP + 0.6], [ua, -DROP + 0.6, ub, zb2]);
      }
      const onLine = (u, z, [ua, za, ub, zb2]) => {
        if (u < ua || u > ub) return false;
        const t = (u - ua) / (ub - ua), zl = za + (zb2 - za) * t;
        return Math.abs(z - zl) < 0.55;
      };
      surfacePiece(S, B, box, (X, Y, o) => {
        F.onFaceV(X, Y, v0, o);
        const u = o[0], z = o[1];
        if (u < -F.half || u > F.half) return -1;
        const zt = zTop(u);
        if (z > zt || z < bottom(u)) return -1;
        if (z > zt - KERB_H) return 1;
        if (z > zt - 3.8) return 2;
        if (run && u > vlo && u < vhi) {
          for (let k = 0; k < piles.length; k++) if (Math.abs(u - piles[k]) < 1.1) return 10 + k;
          for (let k = 0; k < braces.length; k++) if (onLine(u, z, braces[k])) return 40 + (k >> 1);
          return z < -DROP + 0.9 ? 4 : 3;
        }
        // fieldstone courses
        const row = Math.floor((z + DROP) / 1.9);
        const blk = Math.floor((u + 60 + hash(row, 3) * 3) / 3.3);
        return 200 + ((row * 37 + blk) & 1023);
      }, (id, u, z, e, i, j) => {
        if (id === 1) return e.lip || z > zTop(u) - 0.5 ? lt(mx(rail, plank, 0.4), 0.22) : mx(rail, plank, 0.3);
        if (id === 2) {
          let col = mx(beam, rail, 0.45);
          if (e.joint) return dk(beam, 0.3);
          // a bolt head every few paces
          const q = ((u + 60) % 6);
          if (q < 0.5 && Math.abs(z - (zTop(u) - 2.5)) < 0.3) return lt(col, 0.3);
          if (z < zTop(u) - 3.3) col = dk(col, 0.2);
          if (fen && hash(i >> 1, j) < 0.1) col = mx(col, moss, 0.4);
          return col;
        }
        if (id === 3) return voidC;
        if (id === 4) return underWater;
        if (id >= 10 && id < 40) {
          const c0 = mx(rail, beam, 0.35);
          if (e.lip) return lt(c0, 0.2);
          if (e.joint || e.rim) return dk(c0, 0.35);
          if (z < -DROP + 1.2) return mx(dk(c0, 0.3), moss, 0.4);
          return c0;
        }
        if (id >= 40 && id < 200) return dk(mx(beam, rail, 0.4), 0.15);
        // fieldstone
        let col = stoneT[Math.floor(hash(id, 17) * 3)];
        col = dk(col, 0.12);                      // a south face, turned from the sun
        if (z < -DROP + 0.9) col = mx(dk(col, 0.2), moss, 0.3);
        if (e.joint) return dk(col, 0.42);
        if (e.lip) return lt(col, 0.16);
        return col;
      });
      // the piles' wet feet
      for (const u of piles) {
        const [rx, ry] = F.at(u, v0, -DROP);
        ripples.push({ x: rx, y: ry + 0.6, w: 2.4, seed: u * 0.53 });
      }
      if (run) {
        for (const u of [vlo, vhi]) { const [rx, ry] = F.at(u, v0, -DROP); ripples.push({ x: rx, y: ry + 0.6, w: 1.6, seed: u }); }
      }
    } else {
      stoneFace(S, B, F, P, sd, v0, piersOf(v0 + sd * 0.6), stoneT, moss, voidC, underWater, ripples);
    }
  }

  // ---- the deck ------------------------------------------------------------
  const deckBox = spanBox(F, -HALF, HALF, -1, stone ? 6 : 2);
  if (!stone) {
    const n = Math.max(4, Math.round((F.half * 2) / 4.6));
    const pitch = (F.half * 2) / n;
    // the Hollowfen's rot, different on every span: a plank end or two broken
    // off, one plank gone for a stretch mid-span with the water showing
    // through, a green patch plank, ragged plank ends along the edges
    const broken = [];
    if (fen) {
      const k1 = Math.floor(n * (0.12 + R(1) * 0.3)), k2 = Math.floor(n * (0.55 + R(2) * 0.3));
      broken.push({ k: k1, sd: R(3) < 0.5 ? 1 : -1, at: 23.5 + R(4) * 5 });
      if (R(5) < 0.7) broken.push({ k: k2, sd: R(6) < 0.5 ? 1 : -1, at: 25 + R(7) * 4 });
    }
    const gapK = fen && R(19) < 0.6 ? Math.max(1, Math.min(n - 2, Math.floor(n / 2 + (R(14) - 0.5) * 4))) : -1;
    const gapV0 = (R(15) - 0.5) * 34 - 4, gapV1 = gapV0 + 6 + R(16) * 4;
    let patchK = fen ? Math.floor(R(17) * n) : -1;
    if (patchK === gapK) patchK = (patchK + 2) % n;
    const HOLE = 100000;
    const tones = fen
      ? [lt(plank, 0.08), plank, mx(plank, plankDk, 0.5), plankDk, mx(plank, moss, 0.18)]
      : [lt(plank, 0.05), plank, mx(plank, plankDk, 0.3), mx(plank, plankDk, 0.55)];
    const worn = lt(mx(plank, road, fen ? 0.12 : 0.28), fen ? 0.06 : 0.1);
    const gap = dk(beam, 0.4);
    surfacePiece(S, B, deckBox, (X, Y, o) => {
      F.onTop(X, Y, 0, o);
      const u = o[0], v = o[1], av = Math.abs(v);
      if (u < -F.half || u > F.half || av > (fen ? HALF + 0.2 : 33.4)) return -1;
      const k = Math.min(n - 1, Math.floor((u + F.half) / pitch));
      if (av > (fen ? 33.1 + hash(k, 5 + (b.x | 0)) * 2 : 32.5 + hash(k, 5) * 0.9)) return -1;
      for (const br of broken) {
        if (br.k === k && v * br.sd > br.at + (hash(k, Math.floor(u * 4)) - 0.5) * 1.6) return HOLE;
      }
      if (k === gapK && v > gapV0 + (hash(Math.floor(u * 4), 3) - 0.5) * 1.4 && v < gapV1 + (hash(Math.floor(u * 4), 4) - 0.5) * 1.4) return HOLE;
      return k;
    }, (id, u, v, e, i, j) => {
      const av = Math.abs(v);
      if (id === HOLE) {
        // looking down through the gap: the stringers, and the dark water
        if (Math.abs(av - 27) < 0.9 || Math.abs(av - 9) < 0.9) return Math.abs(av - 27) < 0.35 || Math.abs(av - 9) < 0.35 ? mx(beam, rail, 0.4) : beam;
        return voidC;
      }
      const f = u + F.half - id * pitch;
      let col = tones[Math.floor(hash(id, 11 + (b.x | 0)) * tones.length)];
      if (id === patchK) col = lt(mx(col, moss, 0.34), 0.06);
      // the sills at each end are heavier timbers, darker
      if (id === 0 || id === n - 1) col = mx(col, beam, 0.35);
      // the arch: the half that rises toward the sun is lit, the half that
      // falls toward the camera turned from it, a whole tone each way
      const sl = F.slope(u);
      if (sl) col = sl > 0 ? lt(col, sl > 1 ? 0.2 : 0.11) : dk(col, sl < -1 ? 0.2 : 0.11);
      // the worn track down the middle, paler where feet and wheels go
      if (av < 21) col = mx(col, worn, av < 14 ? 0.34 : 0.17);
      if (Math.abs(av - 11.5) < 1.2 && !fen) col = dk(col, 0.07);
      // grain: a faint streak along some planks, and the odd knot
      const g = f / pitch;
      if ((Math.abs(g - 0.34) < 0.07 || Math.abs(g - 0.7) < 0.06) && hash(id * 7 + Math.floor((v + 40) / 5.5), 3) < 0.45) col = dk(col, 0.08);
      const kv = (hash(id, 78) - 0.5) * 52;
      if (hash(id, 77) < 0.35 && Math.abs(v - kv) < 0.7 && Math.abs(g - 0.5) < 0.12) col = dk(col, 0.28);
      // nails where the planks cross the two outer stringers, a few planks
      // bare, the rest a pixel off here and there
      if (hash(id, 91 + (b.x | 0)) > 0.22) {
        const sv = v > 0 ? 1 : 2, nv = 27 + (hash(id, 92 + sv) - 0.5) * 1.2;
        const ng = (hash(id, 94 + sv) - 0.5) * 0.18;
        if (Math.abs(av - nv) < 0.28 && (Math.abs(g - 0.3 - ng) < 0.1 || (hash(id, 96 + sv) < 0.7 && Math.abs(g - 0.72 - ng) < 0.1))) col = dk(col, 0.42);
      }
      // the road's dust carried onto each end, in drifts
      const dust = (Math.abs(u) - (F.half - 6)) / 6;
      if (dust > 0) {
        col = mx(col, road, 0.1 * dust);
        const cu = Math.floor(u * 1.1), cv = Math.floor(v * 0.55);
        if (hash(cu, cv + 5) < dust * 0.3) col = mx(col, hash(cu, cv) < 0.6 ? road : roadDk, 0.42);
      }
      // moss on the fen's plank ends, where feet never go
      if (fen && av > 25 && hash(id, 31) < 0.6 && hash(i * 3, j * 5) < (av - 25) / 7) col = hash(i, j * 7) < 0.5 ? moss : lt(moss, 0.12);
      // the end sill's outer edge: a dark line where the road runs on, broken by dust
      if (Math.abs(u) > F.half - 0.5 && hash(Math.floor(v * 2), 7 + (b.x | 0)) > 0.3) return dk(beam, 0.05);
      if (e.joint) return gap;
      if (e.lip) return lt(col, sl > 0 ? 0.26 : 0.13);
      return col;
    });
    // the edge beams, standing a little proud of the planks
    const kerbTop = lt(mx(rail, plank, 0.35), 0.1);
    for (const sd of [-1, 1]) {
      // its inner face shows on the far side
      if (-sd * F.c > 0.2) {
        surfacePiece(S, B, spanBox(F, sd * KERB_IN, sd * KERB_IN, -0.5, KERB_H + 0.5), (X, Y, o) => {
          F.onFaceV(X, Y, sd * KERB_IN, o);
          const u = o[0], z = o[1];
          if (u < -F.half || u > F.half) return -1;
          const l = F.L(u);
          return z >= l && z <= l + KERB_H ? 0 : -1;
        }, () => dk(kerbTop, 0.3), 0);
      }
    }
    for (const sdk of [-1, 1]) surfacePiece(S, B, spanBox(F, sdk * KERB_IN, sdk * HALF, KERB_H - 1, KERB_H + 1), (X, Y, o) => {
      F.onTop(X, Y, KERB_H, o);
      const u = o[0], v = o[1], av = Math.abs(v);
      if (u < -F.half || u > F.half || av < KERB_IN || av > (fen ? 33.3 : HALF)) return -1;
      return (v > 0 ? 50 : 0) + Math.floor((u + F.half) / 22);
    }, (id, u, v, e, i, j) => {
      const av = Math.abs(v);
      let col = kerbTop;
      if (Math.abs(av - 33.6) < 0.25 && hash(id, Math.floor(u / 3)) < 0.6) col = dk(col, 0.12);
      if (Math.abs(u) > F.half - 0.6) col = dk(col, 0.2);
      if (F.slope(u) < 0) col = dk(col, 0.08);
      if (fen && hash(i * 5, j * 3) < 0.16) col = mx(col, moss, 0.6);
      if (e.joint) return dk(col, 0.35);
      if (e.lip) return lt(col, 0.2);
      return col;
    });
  } else {
    stoneDeck(S, B, F, P, deckBox, stoneT);
  }

  // the rail (or parapet) on the sun side throws its shadow across the deck
  deckShadow(S, B, F, P, posts);

  if (stone) {
    for (const sd of F.near ? [F.near] : [-1, 1]) {
      for (const up of piersOf(sd * HALF + sd * 0.6).piers) cutwater(S, B, F, up, sd, stoneT, moss, ripples, cope, deep);
    }
  }

  drawWing(wingFront);

  // everything above is one silhouette: ink it (bare where the road runs on)
  outlineSpan(S, B, 2);

  // ---- rails and posts / pillars and lamps (thin ink of their own) ---------
  const RL = layerOf(S);
  if (!stone) railsTimber(S, RL, F, P, posts, fen, b, R);
  else pillarsStone(S, RL, F, P, posts, stoneT);
  over(B, RL);

  // ---- all together: the shadow under, the span over ------------------------
  const G = layerOf(S);
  over(G, shadowLayer(F, S, P, posts, water));
  over(G, B);
  // the witch-light's glow (the fen's lanterns): two hard rings, no blur
  const lamp = posts.find((p) => p.lamp);
  let lampAt = null;
  if (lamp) {
    const z = F.L(lamp.u) + lamp.h + (stone ? 2.4 : 1.6);
    lampAt = F.at(lamp.u, lamp.v, z);
    if (fen) {
      // two stepped diamonds of light hugging the lantern, no round halo
      for (const [r, a] of [[3.5, 0.1], [2, 0.12]]) {
        G.c.fillStyle = rgba(P.lamp, a);
        const cx = Math.round(lampAt[0] * 2) / 2, cy = Math.round(lampAt[1] * 2) / 2;
        for (let dy = -r; dy <= r; dy += 0.5) {
          const hw = r - Math.abs(dy);
          if (hw > 0) G.c.fillRect(cx - hw, cy + dy - 0.25, hw * 2, 0.5);
        }
      }
    }
  }
  // a ripple's dashes show only where no part of the span stands over them
  const bd = B.c.getImageData(0, 0, S.pw, S.ph).data;
  const clear = (x, y) => {
    const i = Math.floor((x - x0) * PX), j = Math.floor((y - y0) * PX);
    return i < 0 || j < 0 || i >= S.pw || j >= S.ph || bd[(j * S.pw + i) * 4 + 3] === 0;
  };
  const seen = [];
  for (const r of ripples) {
    const L0 = clear(r.x - r.w / 2 - 1.5, r.y + 0.25) && clear(r.x - r.w / 2 - 0.5, r.y + 0.25);
    const R0 = clear(r.x + r.w / 2 + 0.5, r.y + 0.25) && clear(r.x + r.w / 2 + 1.5, r.y + 0.25);
    if (L0 || R0) seen.push({ ...r, l: L0, r: R0 });
  }
  return { cv: G.cv, x0, y0, w: S.pw / PX, h: S.ph / PX, px: PX, ripples: seen, shine: water.shine, lampAt, lamp: P.lamp, fen };
};

// ---- a wing wall, pixel by pixel ------------------------------------------
// q = { A: [u, v] where it starts under the deck's corner, dir: its run along
// the bank in (u, v), n: toward the land, len, T: thickness, zA → zB: its
// top, level for a stretch and then sinking into the turf }. Its top and the
// faces that look south, in coursed stone: rough fieldstone for the timber
// kinds, dressed blocks for the stone kind. The face toward the water stands
// in it on a dark wet foot; the outer end is left bare, under a grass tuft.
const wingWall = (S, B, F, q, stoneT, moss, kind, deep, grass) => {
  const [au, av] = q.A, [du, dv] = q.dir, pu = -dv, pv = du;
  const ztop = (w) => {
    const t = Math.max(0, Math.min(1, (w - q.len * 0.3) / (q.len * 0.7)));
    return q.zA + (q.zB - q.zA) * t;
  };
  const dressed = kind === "stone";
  // `across` runs along (pu, pv); the water lies on the side away from n
  const ws = pu * q.n[0] + pv * q.n[1] > 0 ? -1 : 1;
  const corner = (w, side) => [au + du * w + pu * side * q.T / 2, av + dv * w + pv * side * q.T / 2];
  const faces = [];
  const addFace = (p1, p2, nu, nv, w1, w2, water) => {
    const ny = nu * F.s + nv * F.c;
    if (ny < 0.12) return;
    const [x1] = F.at(p1[0], p1[1]), [x2] = F.at(p2[0], p2[1]);
    if (Math.abs(x2 - x1) < 0.6) return;
    faces.push({ p1, p2, x1, x2, w1, w2, bot: water ? -DROP : -0.2, water, len: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) });
  };
  // the water face stands in the river (where the river reaches it), the land face on the turf
  const mid = corner(q.len * 0.3, ws);
  const inWater = F.wet(mid[0] - q.n[0] * 1.2, mid[1] - q.n[1] * 1.2);
  addFace(corner(0, ws), corner(q.len, ws), pu * ws, pv * ws, 0, q.len, inWater);
  addFace(corner(0, -ws), corner(q.len, -ws), -pu * ws, -pv * ws, 0, q.len, false);
  const pts = [];
  for (const w of [0, q.len]) for (const sdd of [-1, 1]) { const [u, v] = corner(w, sdd); pts.push([u, v, ztop(w) + 0.5], [u, v, -DROP - 0.5]); }
  const box = boxOf(F, pts, 1);
  const x0 = F.b.x, y0 = F.b.y;
  const wetLine = mx(dk(deep, 0.5), moss, 0.2);
  surfacePiece(S, B, box, (X, Y, o) => {
    // the top: a sloping plane, found by a few rounds of guess-and-correct
    const x = X - x0, y = Y - y0;
    let z = q.zA, u = 0, v = 0;
    for (let k = 0; k < 6; k++) {
      u = x * F.c + (y + z) * F.s; v = -x * F.s + (y + z) * F.c;
      z = ztop((u - au) * du + (v - av) * dv);
    }
    const w = (u - au) * du + (v - av) * dv, across = (u - au) * pu + (v - av) * pv;
    if (w >= 0 && w <= q.len && Math.abs(across) <= q.T / 2) {
      o[0] = w; o[1] = across;
      if (dressed) return 30 + Math.floor(w / 3.2);
      return 10 + Math.floor((w + (across > 0.3 ? 1.1 : 0)) / (2.1 + hash(Math.floor(w / 2.1), 5) * 0.8)) + (across > 0.3 ? 40 : 0);
    }
    // the faces
    for (let f = 0; f < faces.length; f++) {
      const fc = faces[f], t = (X - fc.x1) / (fc.x2 - fc.x1);
      if (t < 0 || t > 1) continue;
      const pu2 = fc.p1[0] + (fc.p2[0] - fc.p1[0]) * t, pv2 = fc.p1[1] + (fc.p2[1] - fc.p1[1]) * t;
      const [, gy] = F.at(pu2, pv2, 0);
      const zz = gy - Y, wf = fc.w1 + (fc.w2 - fc.w1) * t;
      if (zz > ztop(wf) || zz < fc.bot) continue;
      o[0] = t * fc.len; o[1] = zz;
      if (fc.water && zz < -DROP + 0.5) return 99;
      const row = Math.floor((zz + DROP) / (dressed ? 1.6 : 1.5));
      return 100 + f * 200 + row * 24 + Math.floor((t * fc.len + (row & 1) * 1.5 + hash(row, f) * (dressed ? 0 : 1.2)) / (dressed ? 3.4 : 2.6));
    }
    return -1;
  }, (id, a2, b2, e, i, j) => {
    if (id === 99) return wetLine;
    const top = id < 100;
    let col = stoneT[Math.floor(hash(id, 41) * 3)];
    if (top) {
      col = lt(col, dressed && id >= 30 ? 0.2 : 0.12);
      if (!dressed && hash(id, 9) < 0.35 && hash(i, j) < 0.55) col = hash(i, j * 3) < 0.5 ? moss : lt(moss, 0.12);
    } else {
      col = dk(col, 0.16);
      if (b2 < -DROP + 1.1) col = mx(dk(col, 0.25), moss, 0.35);
    }
    if (e.joint) return dk(col, 0.4);
    if (e.lip) return lt(col, 0.14);
    return col;
  });
  // a tuft of the bank's grass over the end, where the wall goes into the turf
  const [ex, ey] = F.at(au + du * (q.len - 0.7), av + dv * (q.len - 0.7), ztop(q.len - 0.7));
  const gx = Math.round(ex * 2) / 2, gy = Math.round(ey * 2) / 2;
  const T = [
    "..2..2..",
    ".21.121.",
    "1101011.",
    ".000000.",
    "..3333..",
  ];
  const cols = [grass[0], grass[1], grass[2], dk(grass[0], 0.4)];
  B.c.save();
  for (let r = 0; r < T.length; r++) for (let k = 0; k < T[r].length; k++) {
    const ch = T[r][k];
    if (ch === ".") continue;
    B.c.fillStyle = css(cols[+ch]);
    B.c.fillRect(gx - 2 + k * 0.5, gy - 2 + r * 0.5, 0.5, 0.5);
  }
  B.c.restore();
};

// A pile of a bent standing beside an up-screen deck, the bent's cap beam
// across its head standing out past the deck's edge. `shade`: it stands in
// the deck's shadow.
const bentPile = (S, B, F, u, sd, P, shade, deep, wetFoot) => {
  const rail = rgb(P.rail), beam = rgb(P.beam), moss = rgb(P.moss);
  const wood = mx(rail, beam, 0.3);
  const l = F.L(u), zb = wetFoot ? -DROP : 0, zt = l - 2.4;
  const vp = sd * (HALF + PILE_OUT);
  const lh = (a, q) => [Math.min(a, q), Math.max(a, q)];
  const face = shade ? dk(wood, 0.16) : wood;
  const us = u + 1.1 * (F.s >= 0 ? 1 : -1);          // the bent's south face
  piece(S, B, (c) => {
    // a knee brace from the pile up to under the deck's edge, in the bent's
    // own plane, so it faces the camera
    const kz0 = Math.max(zb + 0.6, zt - 4.2);
    if (zt - kz0 > 1.5) {
      poly(c, [F.at(us, sd * (HALF + PILE_OUT - 1), kz0 + 1.1), F.at(us, sd * (HALF + PILE_OUT - 1), kz0),
        F.at(us, sd * (HALF - 0.5), zt - 0.3), F.at(us, sd * (HALF + 0.6), zt)], css(dk(face, 0.12)));
    }
    const [va, vb] = lh(vp - 1.1, vp + 1.1);
    block(c, F, u - 1.1, u + 1.1, va, vb, zb, zt, css(face), (sun) => css(sun > 0.1 ? lt(face, 0.12) : face));
    faceEdges(c, F, u, vp, 1.1, zb, zt, lt(face, shade ? 0.12 : 0.24), dk(face, 0.3));
    // the damp, green-dark foot, and the wet line where it meets the water
    const band = (z0, z1, col) => poly(c, [F.at(us, va, z1), F.at(us, vb, z1), F.at(us, vb, z0), F.at(us, va, z0)], css(col));
    band(zb, zb + 1.3, mx(dk(face, 0.3), moss, 0.4));
    if (wetFoot) band(zb, zb + 0.5, mx(dk(deep, 0.5), moss, 0.2));
    // the cap: the bent's beam end, standing out past the deck's edge and the pile
    const [ca, cb] = lh(sd * (HALF - 1.5), sd * (HALF + PILE_OUT + 1.6));
    block(c, F, u - 1.2, u + 1.2, ca, cb, zt - 0.1, l - 0.4, css(lt(wood, shade ? 0.14 : 0.3)),
      (sun) => css(sun > 0.1 ? lt(wood, 0.12) : dk(wood, shade ? 0.14 : 0.04)));
  });
};

// ---- the stone kind's pieces -------------------------------------------------
// The paving: the Iron road's flags carried over the span, kerbed, the ruts
// running on across it; then the parapets' coping and inner faces.
const stoneDeck = (S, B, F, P, box, stoneT) => {
  const main = rgb(REALM.PATH_MAIN || "#a69c86"), dkP = rgb(REALM.PATH_DK || "#847a66");
  const tones = [lt(main, 0.05), main, mx(main, dkP, 0.14), mx(main, [142, 150, 152], 0.12), mx(main, [176, 154, 116], 0.12)];
  const kerbT = [mx(main, [208, 204, 192], 0.3), mx(main, [184, 180, 170], 0.2), mx(main, dkP, 0.1)];
  const KERB = 27.5, PAR = 31.4;
  // courses laid across the road
  const courses = [];
  for (let u = -F.half, k = 0; u < F.half; k++) {
    const len = 5.2 + hash(k, (F.b.x | 0) + 1) * 3.4;
    const br = [];
    for (let v = -KERB + (hash(k, 2) - 0.5) * 6; v < KERB; v += 7 + hash(k, br.length + 5) * 6) br.push(v);
    br.push(KERB);
    courses.push({ u0: u, u1: Math.min(F.half, u + len), br });
    u += len;
  }
  const courseAt = (u) => { for (let k = 0; k < courses.length; k++) if (u < courses[k].u1) return k; return courses.length - 1; };
  surfacePiece(S, B, box, (X, Y, o) => {
    F.onTop(X, Y, 0, o);
    const u = o[0], v = o[1], av = Math.abs(v);
    if (u < -F.half || u > F.half || av > PAR) return -1;
    if (av >= KERB) return 5000 + (v > 0 ? 500 : 0) + Math.floor((u + F.half) / 8.5);
    const k = courseAt(u), br = courses[k].br;
    let j = 0;
    while (j < br.length - 1 && br[j] <= v) j++;
    return k * 32 + j;
  }, (id, u, v, e, i, j) => {
    const av = Math.abs(v);
    const kerb = id >= 5000;
    let col = kerb ? kerbT[Math.floor(hash(id, 7) * 3)] : tones[Math.floor(hash(id, 7) * 5)];
    // the ruts: two flat steps, like the road's
    const re = Math.abs(av - 11.5 - (hash(Math.floor((u + 60) / 7), 3) - 0.5) * 0.6);
    if (!kerb && re < 2.4) col = dk(col, re < 1.1 ? 0.12 : 0.05);
    if (!kerb && av < 4) col = lt(col, 0.03);
    const sl = F.slope(u);
    if (sl) col = sl > 0 ? lt(col, sl > 1 ? 0.15 : 0.08) : dk(col, sl < -1 ? 0.15 : 0.08);
    const hp = hash(i * 7 + j * 13, 3);
    if (hp < 0.05) col = dk(col, 0.05); else if (hp > 0.98) col = lt(col, 0.05);
    if (e.joint) return dk(col, kerb ? 0.3 : 0.2);
    if (e.lip) return lt(col, kerb ? 0.14 : 0.07);
    return col;
  });
  const cope = rgb(P.cope);
  const stoneC = rgb(P.stone);
  for (const sd of [-1, 1]) {
    // the far parapet's inner face, looking south across the deck
    if (-sd * F.c > 0.2) {
      const v0 = sd * PAR;
      surfacePiece(S, B, spanBox(F, v0, v0, -0.5, 5.5), (X, Y, o) => {
        F.onFaceV(X, Y, v0, o);
        const u = o[0], z = o[1];
        if (u < -F.half || u > F.half) return -1;
        const l = F.L(u);
        if (z < l || z > l + 5) return -1;
        const row = Math.floor((z - l) / 1.7);
        return row * 64 + Math.floor((u + 60 + (row & 1) * 2.2) / 4.4);
      }, (id, u, z, e) => {
        let col = dk(stoneT[Math.floor(hash(id, 23) * 3)], 0.14);
        if (e.joint) return dk(col, 0.35);
        if (e.lip) return lt(col, 0.12);
        return col;
      });
    }
  }
  // the coping along the parapets' tops
  surfacePiece(S, B, spanBox(F, -HALF, HALF, 4, 6), (X, Y, o) => {
    F.onTop(X, Y, 5, o);
    const u = o[0], v = o[1], av = Math.abs(v);
    if (u < -F.half || u > F.half || av < PAR || av > HALF) return -1;
    return (v > 0 ? 500 : 0) + Math.floor((u + F.half + (v > 0 ? 2 : 0)) / 5.6);
  }, (id, u, v, e) => {
    let col = mx(cope, stoneC, hash(id, 3) * 0.4);
    if (F.slope(u) < 0) col = dk(col, 0.06);
    if (e.joint) return dk(col, 0.34);
    if (e.lip) return lt(col, 0.22);
    return col;
  });
};

// The face of a stone span that looks at the camera: the parapet, a string
// course at deck level, the spandrel's ashlar, and the arch (or two) with a
// ring of voussoirs and a keystone, springing from the water.
const stoneFace = (S, B, F, P, sd, v0, { run, piers }, stoneT, moss, voidC, underWater, ripples) => {
  const shineC = rgb((REALM.water || DEFAULT_WATER).shine || "#a8d8e8");
  const arches = [];
  if (run) {
    if (piers.length) {
      const up = piers[0];
      arches.push([run[0] - 0.5, up - 2.2], [up + 2.2, run[1] + 0.5]);
    } else arches.push([run[0] - 1, run[1] + 1]);
  }
  const RING = 2.1;
  const A = arches.map(([a0, a1]) => {
    const uc = (a0 + a1) / 2, r = (a1 - a0) / 2;
    const rise = Math.max(2.5, Math.min(r * 0.98, F.L(uc) - 1.3 - RING + DROP - 0.2));
    return { uc, r, rise, nv: Math.max(7, Math.round((Math.PI * (r + rise) / 2) / 1.9) | 1) };
  });
  const bottom = (u) => (F.wet(u, v0 + sd * 0.6) ? -DROP : 0);
  surfacePiece(S, B, spanBox(F, v0, v0, -DROP - 1, 6), (X, Y, o) => {
    F.onFaceV(X, Y, v0, o);
    const u = o[0], z = o[1];
    if (u < -F.half || u > F.half) return -1;
    const l = F.L(u);
    if (z > l + 5 || z < bottom(u)) return -1;
    if (z > l + 4.3) return 1;                              // the coping's lip
    if (z > l - 0.1) {                                      // the parapet
      const row = Math.floor((z - l + 0.1) / 1.45);
      return 100 + row * 64 + Math.floor((u + 60 + (row & 1) * 2.4) / 4.8);
    }
    if (z > l - 1.3) return 2;                              // the string course
    for (let k = 0; k < A.length; k++) {
      const a = A[k], du = (u - a.uc) / a.r;
      if (Math.abs(du) < 1) {
        const zi = -DROP + a.rise * Math.sqrt(1 - du * du);
        if (z < zi) return z < -DROP + 0.8 ? 4 : 3;        // the opening
        const dx = (u - a.uc) / (a.r + RING), ze = -DROP + (a.rise + RING) * Math.sqrt(Math.max(0, 1 - dx * dx));
        if (z < ze) {
          const ang = Math.atan2(z + DROP, (u - a.uc) * (a.rise / a.r));
          const q = Math.floor((ang / Math.PI) * a.nv);
          return q === (a.nv >> 1) ? 60 + k : 20 + k * 20 + q; // the keystone, or a voussoir
        }
      } else if (Math.abs(u - a.uc) < a.r + RING) {
        const dx = (u - a.uc) / (a.r + RING), ze = -DROP + (a.rise + RING) * Math.sqrt(Math.max(0, 1 - dx * dx));
        if (z < ze) {
          const ang = Math.atan2(z + DROP, (u - a.uc) * (a.rise / a.r));
          return 20 + k * 20 + Math.floor((ang / Math.PI) * a.nv);
        }
      }
    }
    const row = Math.floor((z + DROP) / 1.7);
    return 1000 + row * 64 + Math.floor((u + 60 + (row & 1) * 2.5) / 5);
  }, (id, u, z, e, i, j) => {
    let col;
    if (id === 3) return voidC;
    if (id === 4) return z > -DROP + 0.4 && hash(Math.floor((u + 60) * 1.2), 5) < 0.55 ? mx(underWater, shineC, 0.45) : underWater;
    const l = F.L(u);
    if (id === 1) col = lt(rgb(P.cope), 0.08);                             // the coping's lip
    else if (id === 2) col = z < l - 0.95 ? dk(stoneT[1], 0.38) : lt(stoneT[0], 0.06); // string course, its shadow under
    else if (id >= 60 && id < 100) col = lt(stoneT[0], 0.22);             // keystone
    else if (id >= 20 && id < 60) col = lt(stoneT[1], (id & 1) ? 0.13 : 0.03); // voussoirs
    else col = dk(stoneT[Math.floor(hash(id, 29) * 3)], id < 1000 ? 0.12 : 0.2); // parapet / spandrel, out of the sun
    if (z < -DROP + 0.9 && id !== 1 && id !== 2) col = mx(dk(col, 0.25), moss, 0.35);
    if (id === 2) return e.lip || z > l - 0.45 ? lt(col, 0.2) : col;
    if (e.joint) return dk(col, 0.36);
    if (e.lip) return lt(col, 0.14);
    return col;
  });
  for (const a of A) {
    for (const u of [a.uc - a.r * 0.55, a.uc + a.r * 0.4]) {
      const [rx, ry] = F.at(u, v0, -DROP);
      ripples.push({ x: rx, y: ry + 0.6, w: 3, seed: u * 0.7 });
    }
  }
};

// A cutwater: a pointed stone nose on a pier, standing out from the span's
// side into the stream and carried up as a refuge flush with the coping.
// Coursed blocks, each face one flat tone (the lit face and the shaded one),
// a damp green foot and a wet line where it stands in the river.
const cutwater = (S, B, F, up, sd, stoneT, moss, ripples, cope, deep) => {
  const v0 = sd * HALF, out = sd * 4.4;
  // on the face of an across span it stops as a starling where the arches
  // spring, so the pier plainly carries them; beside an up-screen span it
  // rises to the coping as a refuge, the span's height standing on the water
  const zt = F.near ? -DROP + 3.4 : F.L(up) + 5;
  const t = stoneT[1];
  const A = [up - 2.8, v0 - sd * 0.3], Bp = [up + 2.8, v0 - sd * 0.3], N = [up, v0 + out];
  const cu = (A[0] + Bp[0] + N[0]) / 3, cv = (A[1] + Bp[1] + N[1]) / 3;
  const faces = [];
  for (const [p, q] of [[A, N], [N, Bp]]) {
    let nu = q[1] - p[1], nv = -(q[0] - p[0]);
    if (nu * (cu - (p[0] + q[0]) / 2) + nv * (cv - (p[1] + q[1]) / 2) > 0) { nu = -nu; nv = -nv; }
    const nx = nu * F.c - nv * F.s, ny = nu * F.s + nv * F.c;
    if (ny < 0.05) continue;                                       // turned from the camera
    const [x1] = F.at(p[0], p[1]), [x2] = F.at(q[0], q[1]);
    if (Math.abs(x2 - x1) < 0.6) continue;
    const lit = (nx * SUN.x + ny * SUN.y) / Math.hypot(nx, ny) > -0.3;
    faces.push({ p, q, x1, x2, lit, len: Math.hypot(q[0] - p[0], q[1] - p[1]) });
  }
  const pts = [];
  for (const p of [A, N, Bp]) pts.push([p[0], p[1], zt + 0.5], [p[0], p[1], -DROP - 0.5]);
  const inTri = (u, v) => {
    const s1 = (N[0] - A[0]) * (v - A[1]) - (N[1] - A[1]) * (u - A[0]);
    const s2 = (Bp[0] - N[0]) * (v - N[1]) - (Bp[1] - N[1]) * (u - N[0]);
    const s3 = (A[0] - Bp[0]) * (v - Bp[1]) - (A[1] - Bp[1]) * (u - Bp[0]);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
  const wetLine = mx(dk(deep, 0.5), moss, 0.2);
  surfacePiece(S, B, boxOf(F, pts, 1), (X, Y, o) => {
    // the refuge's coping on top
    const x = X - F.b.x, y = Y - F.b.y;
    const u = x * F.c + (y + zt) * F.s, v = -x * F.s + (y + zt) * F.c;
    if (inTri(u, v)) { o[0] = u; o[1] = v; return 1; }
    for (let f = 0; f < faces.length; f++) {
      const fc = faces[f], tt = (X - fc.x1) / (fc.x2 - fc.x1);
      if (tt < 0 || tt > 1) continue;
      const pu = fc.p[0] + (fc.q[0] - fc.p[0]) * tt, pv = fc.p[1] + (fc.q[1] - fc.p[1]) * tt;
      const z = F.at(pu, pv, 0)[1] - Y;
      if (z > zt || z < -DROP) continue;
      o[0] = tt * fc.len; o[1] = z;
      if (z < -DROP + 0.45) return 2;
      const row = Math.floor((z + DROP) / 1.8);
      return 100 + f * 400 + row * 16 + Math.floor((tt * fc.len + (row & 1) * 1.4 + 0.3) / 2.8);
    }
    return -1;
  }, (id, a, z, e) => {
    if (id === 2) return wetLine;
    if (id === 1) return e.lip ? lt(cope, 0.24) : e.joint ? dk(cope, 0.2) : lt(cope, 0.1);
    const fc = faces[Math.floor((id - 100) / 400)];
    let col = fc.lit ? dk(t, 0.04) : dk(t, 0.26);
    const hv = hash(id, 57);
    if (hv < 0.3) col = dk(col, 0.05); else if (hv > 0.8) col = lt(col, 0.04);
    if (z < -DROP + 1.1) col = mx(dk(col, 0.22), moss, 0.35);
    if (e.joint) return dk(col, 0.3);
    if (e.lip) return lt(col, fc.lit ? 0.12 : 0.07);
    return col;
  });
  const [rx, ry] = F.at(up, v0 + out, -DROP);
  ripples.push({ x: rx, y: ry + 0.8, w: 2.5, seed: up * 0.9 + sd });
};

// The sun-side rail or parapet laid in shadow across the deck.
const deckShadow = (S, B, F, P, posts) => {
  const sd = F.sunSide;
  const T = layerOf(S), c = T.c;
  // the deck's inside, as a clip
  c.beginPath();
  for (let u = -F.half; u <= F.half + 0.01; u += 1) { const [x, y] = F.at(u, -KERB_IN, F.L(u)); u === -F.half ? c.moveTo(x, y) : c.lineTo(x, y); }
  for (let u = F.half; u >= -F.half - 0.01; u -= 1) { const [x, y] = F.at(u, KERB_IN, F.L(u)); c.lineTo(x, y); }
  c.closePath();
  c.clip();
  c.fillStyle = "#1c1026"; c.strokeStyle = "#1c1026";
  // a point `h` above the deck at (u, v), its shadow on the deck
  const sh = (u, v, h) => {
    const [x, y] = F.at(u, v, F.L(u));
    return [x + K[0] * h, y + K[1] * h];
  };
  if (P.kind === "stone") {
    const pts = [];
    for (let u = -F.half; u <= F.half + 0.01; u += 1) pts.push(F.at(u, sd * 31.4, F.L(u)));
    for (let u = F.half; u >= -F.half - 0.01; u -= 1) pts.push(sh(u, sd * 31.4, 5));
    poly(c, pts, "#1c1026");
  } else {
    const line = [];
    for (let u = -F.half + 2; u <= F.half - 2 + 0.01; u += 1) line.push(sh(u, sd * POST_V, 6.6));
    c.lineWidth = 1.1; c.lineCap = "butt";
    c.beginPath(); line.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    const mid = [];
    for (let u = -F.half + 2; u <= F.half - 2 + 0.01; u += 1) mid.push(sh(u, sd * POST_V, 3.4));
    c.lineWidth = 0.8;
    c.beginPath(); mid.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
  for (const p of posts) {
    if (p.sd !== sd || p.pile) continue;
    const a = F.at(p.u, p.v, F.L(p.u)), b2 = sh(p.u, p.v, p.h);
    c.lineWidth = p.w;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b2[0], b2[1]); c.stroke();
  }
  harden(T.cv);
  over(B, T, 0.3);
};

// ---- timber rails: posts, two rails between them, newels, a lantern -------
const railsTimber = (S, R, F, P, posts, fen, b, Rh) => {
  const rail = rgb(P.rail), beam = rgb(P.beam), moss = rgb(P.moss);
  const railTop = lt(rail, 0.28), railFace = rail, railDk = dk(rail, 0.25);
  const rope = P.rope ? rgb(P.rope) : null;
  const zR = 6.2, zM = 3.2;
  // the fen's rot: a whole section of railing gone on one side (the near
  // side of an across span, so the silhouette breaks), the rails sagging
  const nearSd = F.near || (Rh(14) < 0.5 ? 1 : -1);
  const nNear = posts.filter((p) => !p.pile && p.sd === nearSd).length;
  const gone = fen && nNear > 3 ? 1 + Math.floor(Rh(18) * (nNear - 3)) : -1;
  const sagOf = (k, sd, top) => (fen ? (top ? 0.35 : 0.2) + hash(k * 5 + 1, sd + 9 + (b.x | 0)) * (top ? 0.8 : 0.4) : 0);
  // back to front: the far side first, and down the screen within a side
  const sides = F.near ? [-F.near, F.near] : [-1, 1];
  for (const sd of sides) {
    const row = posts.filter((p) => p.sd === sd && !p.pile).sort((a, q) => F.at(a.u, a.v)[1] - F.at(q.u, q.v)[1]);
    const byU = [...row].sort((a, q) => a.u - q.u);
    // rails first when the posts stand in front of them (the near side of an
    // across span); after, when the rails pass in front (up-screen spans)
    // the two rails between posts k and k + 1
    const segRails = (c, k) => {
      const ua = byU[k].u + (byU[k].newel ? 1.8 : 1.1), ub = byU[k + 1].u - (byU[k + 1].newel ? 1.8 : 1.1);
      if (fen && sd === nearSd && k === gone) {
        // the gone section: a stub of the top rail hanging from its post
        const p = byU[k];
        const [x, y] = F.at(p.u + 1.2, sd * POST_V, F.L(p.u) + zR);
        c.fillStyle = css(railFace);
        c.save(); c.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2); c.rotate(0.6 * (F.c < -0.2 ? -1 : 1));
        c.fillRect(0, -0.7, 4, 1.3);
        c.restore();
        return;
      }
      for (const [zr, th] of [[zR, 1.4], [zM, 1]]) {
        railRun(c, F, ua, ub, sd * POST_V, zr, th, css(railTop), css(railFace), sagOf(k, sd, zr === zR));
      }
    };
    const postBody = (c, p) => {
      const l = F.L(p.u), r = p.w / 2;
      // a leaning post tips outward, where the camera can see it tip
      const lean = p.lean || 0;
      const lu = F.near ? lean * (hash(p.k, sd + 5) < 0.5 ? 1 : -1) : 0, lv = F.near ? 0 : lean * sd;
      const u0 = p.u - r, u1 = p.u + r, v0 = p.v - r, v1 = p.v + r;
      const side = (sun) => css(sun > 0.1 ? lt(rail, 0.1) : railFace);
      if (!p.newel) {
        block(c, F, u0, u1, v0, v1, l, l + p.h, css(railTop), side, lu, lv);
        if (!lean) faceEdges(c, F, p.u, p.v, r, l, l + p.h, lt(rail, 0.14), railDk);
      } else {
        block(c, F, u0, u1, v0, v1, l - 0.5, l + p.h - 1, css(lt(rail, 0.18)), side);
        faceEdges(c, F, p.u, p.v, r, l - 0.5, l + p.h - 1, lt(rail, 0.16), railDk);
      }
      if (rope) {
        // rope lashing where the top rail meets the post
        const [rx, ry] = F.at(p.u, p.v, l + zR + 0.2);
        c.fillStyle = css(rope);
        c.fillRect(Math.round((rx - r - 0.25) * 2) / 2, Math.round(ry * 2) / 2, p.w + 0.5, 0.5);
        c.fillStyle = css(dk(rope, 0.3));
        c.fillRect(Math.round((rx - r - 0.25) * 2) / 2, Math.round(ry * 2) / 2 + 0.5, p.w + 0.5, 0.5);
      }
    };
    const postCap = (c, p) => {
      const l = F.L(p.u), r = p.w / 2;
      const u0 = p.u - r, u1 = p.u + r, v0 = p.v - r, v1 = p.v + r;
      if (!p.newel) {
        // up the screen the posts read by their caps along the rail
        const lv = (p.lean || 0) * sd;
        if (!F.near) block(c, F, u0 - 0.2, u1 + 0.2, v0 - 0.2 + lv, v1 + 0.2 + lv, l + p.h - 0.7, l + p.h + 0.1, css(lt(rail, 0.34)), () => css(lt(rail, 0.05)));
        return;
      }
      // a cap, broader than the post, and a knob
      block(c, F, u0 - 0.5, u1 + 0.5, v0 - 0.5, v1 + 0.5, l + p.h - 1, l + p.h, css(lt(rail, 0.34)), (sun) => css(sun > 0.1 ? lt(rail, 0.16) : dk(rail, 0.06)));
      if (!p.lamp) block(c, F, p.u - 0.9, p.u + 0.9, p.v - 0.9, p.v + 0.9, l + p.h, l + p.h + 1.1, css(lt(rail, 0.42)), (sun) => css(sun > 0.1 ? lt(rail, 0.24) : lt(rail, 0.06)));
      if (fen && hash(Math.round(p.u * 3), sd + 3) < 0.7) {
        const [mx0, my0] = F.at(p.u, p.v, l + p.h);
        c.fillStyle = css(moss);
        c.fillRect(Math.round((mx0 - 1.5) * 2) / 2, Math.round((my0 - 0.5) * 2) / 2, 2, 1);
      }
    };
    if (F.near) {
      // across the screen: the rails run behind their posts
      piece(S, R, (c) => { for (let k = 0; k < byU.length - 1; k++) segRails(c, k); });
      for (const p of row) { piece(S, R, (c) => { postBody(c, p); postCap(c, p); }); if (p.lamp) lantern(S, R, F, P, p); }
    } else {
      // up the screen: the posts, one rail along their tops, then the caps,
      // all one piece so the railing reads as one run of timber
      piece(S, R, (c) => {
        for (const p of row) postBody(c, p);
        for (let k = 0; k < byU.length - 1; k++) {
          if (fen && sd === nearSd && k === gone) continue;
          railRun(c, F, byU[k].u, byU[k + 1].u, sd * POST_V, zR, 1.6, css(railTop), css(railFace), sagOf(k, sd, true) * 0.6);
          // the rail's shaded side, a pixel down its east edge
          const ua = byU[k].u, ub = byU[k + 1].u, vs = sd * POST_V - Math.sign(F.s) * 0.55;
          const pts = [];
          for (let u = ua; u <= ub + 0.01; u += 1) pts.push(F.at(Math.min(u, ub), vs, F.L(Math.min(u, ub)) + zR));
          c.fillStyle = css(dk(railTop, 0.22));
          for (let q = 0; q < pts.length - 1; q++) c.fillRect(Math.round(pts[q][0] * 2) / 2 - 0.25, Math.min(pts[q][1], pts[q + 1][1]), 0.5, Math.abs(pts[q + 1][1] - pts[q][1]) + 0.5);
        }
        for (const p of row) postCap(c, p);
      });
      for (const p of row) if (p.lamp) lantern(S, R, F, P, p);
    }
  }
};
// a lit column down the left of a post's south face and a dark one down its right
const faceEdges = (c, F, u, v, r, z0, z1, lit, dark) => {
  let pts;
  if (F.c > 0.2) pts = [F.at(u - r, v + r, z1), F.at(u + r, v + r, z1)];
  else if (F.c < -0.2) pts = [F.at(u + r, v - r, z1), F.at(u - r, v - r, z1)];
  else if (F.s > 0.2) pts = [F.at(u + r, v + r, z1), F.at(u + r, v - r, z1)];
  else pts = [F.at(u - r, v - r, z1), F.at(u - r, v + r, z1)];
  const xl = Math.min(pts[0][0], pts[1][0]), xr = Math.max(pts[0][0], pts[1][0]);
  const y = Math.max(pts[0][1], pts[1][1]), hgt = z1 - z0;
  c.fillStyle = css(lit); c.fillRect(Math.round(xl * 2) / 2, Math.round(y * 2) / 2, 0.5, hgt);
  c.fillStyle = css(dark); c.fillRect(Math.round(xr * 2) / 2 - 0.5, Math.round(y * 2) / 2, 0.5, hgt);
};
// a rail beam from ua to ub along the line v, riding the arch at height zr
const railRun = (c, F, ua, ub, v, zr, th, top, face, sag = 0) => {
  if (ub <= ua) return;
  const step = 1;
  const topPts = [], botPts = [];
  const zAt = (u) => F.L(u) + zr - sag * Math.sin(Math.PI * (u - ua) / (ub - ua));
  for (let u = ua; u <= ub + 0.01; u += step) {
    const uu = Math.min(u, ub);
    topPts.push([uu, zAt(uu)]);
  }
  if (topPts[topPts.length - 1][0] < ub) topPts.push([ub, zAt(ub)]);
  // its top
  const tp = [];
  for (const [u, z] of topPts) tp.push(F.at(u, v - th / 2, z));
  for (let k = topPts.length - 1; k >= 0; k--) tp.push(F.at(topPts[k][0], v + th / 2, topPts[k][1]));
  // its face, when one looks south
  if (Math.abs(F.c) > 0.2) {
    const vf = v + (F.c > 0 ? th / 2 : -th / 2);
    for (const [u, z] of topPts) botPts.push(F.at(u, vf, z));
    for (let k = topPts.length - 1; k >= 0; k--) botPts.push(F.at(topPts[k][0], vf, topPts[k][1] - th));
    poly(c, botPts, face);
  }
  poly(c, tp, top);
};

// A lantern on a newel: an iron frame round lit glass, a little roof.
const lantern = (S, R, F, P, p) => {
  const l = F.L(p.u) + p.h + (P.kind === "stone" ? 0.8 : 0);
  const glass = rgb(P.lamp), frame = rgb(P.frame);
  // one step toward the camera, whichever way the span lies
  const [su, sv] = F.c > 0.2 ? [0, 1] : F.c < -0.2 ? [0, -1] : F.s > 0 ? [1, 0] : [-1, 0];
  piece(S, R, (c) => {
    // the foot, the glass (its flame bright at the heart), the roof, a finial
    block(c, F, p.u - 1.2, p.u + 1.2, p.v - 1.2, p.v + 1.2, l, l + 0.7, css(lt(frame, 0.22)), () => css(frame));
    block(c, F, p.u - 1, p.u + 1, p.v - 1, p.v + 1, l + 0.7, l + 3.6, css(lt(glass, 0.3)), () => css(glass));
    const [gx, gy] = F.at(p.u + su, p.v + sv, l + 2.3);
    c.fillStyle = css(lt(glass, 0.7));
    c.fillRect(Math.round((gx - 0.5) * 2) / 2, Math.round((gy - 0.5) * 2) / 2, 1, 1.5);
    block(c, F, p.u - 1.5, p.u + 1.5, p.v - 1.5, p.v + 1.5, l + 3.6, l + 4.3, css(lt(frame, 0.28)), () => css(frame));
    block(c, F, p.u - 0.45, p.u + 0.45, p.v - 0.45, p.v + 0.45, l + 4.3, l + 5.1, css(lt(frame, 0.3)), () => css(frame));
  });
};

// ---- stone pillars at the four corners, one with an iron lamp -------------
const pillarsStone = (S, R, F, P, posts, stoneT) => {
  const order = [...posts].sort((a, q) => F.at(a.u, a.v)[1] - F.at(q.u, q.v)[1]);
  for (const p of order) {
    piece(S, R, (c) => {
      const l = F.L(p.u), r = p.w / 2;
      const t = stoneT[1];
      const side = (sun) => css(sun > 0.1 ? t : dk(t, 0.22));
      block(c, F, p.u - r, p.u + r, p.v - r, p.v + r, l - 0.4, l + p.h - 1.2, css(lt(t, 0.12)), side);
      // a course line round the shaft
      const [cx0, cy0] = F.at(p.u - r, p.v + r * Math.sign(F.c || 1), l + p.h * 0.45);
      const [cx1] = F.at(p.u + r, p.v + r * Math.sign(F.c || 1), l + p.h * 0.45);
      if (Math.abs(F.c) > 0.2) { c.fillStyle = css(dk(t, 0.4)); c.fillRect(Math.min(cx0, cx1), Math.round(cy0 * 2) / 2, Math.abs(cx1 - cx0), 0.5); }
      // the cap, and a small pyramid on it
      block(c, F, p.u - r - 0.5, p.u + r + 0.5, p.v - r - 0.5, p.v + r + 0.5, l + p.h - 1.2, l + p.h, css(lt(rgb(P.cope), 0.12)), (sun) => css(sun > 0.1 ? rgb(P.cope) : dk(rgb(P.cope), 0.2)));
      if (!p.lamp) {
        const [ax, ay] = F.at(p.u, p.v, l + p.h + 1.6);
        const [bx, by] = F.at(p.u - r * 0.8, p.v, l + p.h);
        const [cx2, cy2] = F.at(p.u + r * 0.8, p.v, l + p.h);
        poly(c, [[ax, ay], [bx, by], [cx2, cy2]], css(lt(rgb(P.cope), 0.2)));
        poly(c, [[ax, ay], [(bx + cx2) / 2 + 0.2, by], [cx2, cy2]], css(dk(rgb(P.cope), 0.12)));
      }
    });
    if (p.lamp) lantern(S, R, F, P, p);
  }
};

// ---- per frame -------------------------------------------------------------
// Baked spans are kept for the realm in play (a restart of the same board
// finds them ready); baking another realm's spans lets the old ones go.
const CACHE = new Map();
const spriteOf = (b, pal) => {
  const key = [REALM.id, PX, b.x, b.y, b.a, b.d0, b.d1, pal ? JSON.stringify(pal) : ""].join("|");
  if (b._spr && b._spr.key === key) return b._spr;
  let spr = CACHE.get(key);
  if (!spr) {
    for (const k of CACHE.keys()) if (!k.startsWith(REALM.id + "|")) CACHE.delete(k);
    spr = bakeSpan(b, pal);
    spr.key = key;
    CACHE.set(key, spr);
  }
  b._spr = spr;
  return spr;
};

// One span: its baked sprite, then the water lapping round its feet.
export const drawBridge = (ctx, b, time, _posAt, _angleAt, pal) => {
  const s = spriteOf(b, pal);
  ctx.drawImage(s.cv, s.x0, s.y0, s.w, s.h);
  // ripples: a pair of short bright dashes either side of each foot, sliding
  // outward and fading, each on its own beat
  const r0 = rgb(s.shine || "#a8d8e8");
  for (const r of s.ripples) {
    const ph = (time * 0.8 + r.seed) % 1;
    if (ph > 0.75) continue;
    const off = Math.floor(ph * 4) * 0.5;
    const a = 0.55 * (1 - ph / 0.75);
    ctx.fillStyle = `rgba(${r0[0]},${r0[1]},${r0[2]},${a.toFixed(2)})`;
    const x = Math.round(r.x * 2) / 2, y = Math.round(r.y * 2) / 2 + (ph > 0.4 ? 0.5 : 0);
    if (r.l) ctx.fillRect(x - r.w / 2 - off - 1, y, 1 + (ph < 0.3 ? 0.5 : 0), 0.5);
    if (r.r) ctx.fillRect(x + r.w / 2 + off, y, 1, 0.5);
  }
  // the fen's witch-light breathes
  if (s.fen && s.lampAt) {
    const f = 0.5 + 0.5 * Math.sin(time * 3.1 + b.x);
    if (f > 0.55) {
      ctx.fillStyle = rgba(s.lamp, 0.35 * (f - 0.55));
      ctx.fillRect(Math.round(s.lampAt[0] * 2) / 2 - 1.5, Math.round(s.lampAt[1] * 2) / 2 - 1.5, 3, 3);
    }
  }
};

// Every span on the board, once a frame.
export const drawBridges = (ctx, g) => {
  for (const b of BRIDGES) drawBridge(ctx, b, g.time);
};

// Bake every span of the realm in play ahead of its first frame (about 20-35
// ms a span here): call it where the board's ground layer is baked, when a
// realm is selected, so the two one-time costs don't stack on frame one.
export const bakeBridges = () => {
  for (const b of BRIDGES) spriteOf(b);
};

export { DEFAULT_BRIDGE };
