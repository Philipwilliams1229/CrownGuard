// ============ BUILDING KIT ============
// The parts every hall in the kingdom is assembled from: a trodden footing,
// timber and stone walls, decks and rails, battlements, roofs, posts,
// pennants and the creeping green. All lit from the paint kit's one sun,
// all outline-free, so thirteen towers read as one kingdom's carpentry.
//
// Coordinates are world units; every x is a centre line and every y grows
// downward, so "top" is the smallest y of a part and things stack by
// subtracting their heights.

import { lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, masonry, hash, tuft, lin, rad, part } from "./paint.js";

export const TIMBER = "#8a6238";
export const OAKWOOD = "#6f4a2a";
export const GREY_STONE = "#9a9488";
export const PALE_STONE = "#c8c0ac";

// ---- the ground a hall stands on ---------------------------------------
// Trodden earth and a few flagstones: the grass gives way where people work.
export const pad = (ctx, x, y, r, seed = 0) => {
  soft(ctx, x, y + 2, r * 1.25, r * 0.55, [[0, "rgba(96,74,48,0.4)"], [0.6, "rgba(96,74,48,0.24)"], [1, "rgba(96,74,48,0)"]]);
  for (let i = 0; i < 6; i++) {
    const a = hash(seed, i) * Math.PI * 2, d = r * (0.45 + hash(seed, i + 9) * 0.5);
    const sx = x + Math.cos(a) * d, sy = y + 2 + Math.sin(a) * d * 0.42;
    ball(ctx, sx, sy, 2.4 + hash(seed, i + 3) * 1.6, 1.3, mix("#a89e8c", "#8a7e6c", hash(seed, i + 5)), { hi: 0.4, lo: 0.4 });
  }
};

// ---- walls -------------------------------------------------------------
// Upright planks between corner posts, the whole face shaded across.
export const timberWall = (ctx, x, top, w, h, col = TIMBER) => {
  const x0 = x - w / 2;
  part(ctx, (c) => cylinder(c, x0, top, w, h, col, { r: 1.5, hi: 0.28, lo: 0.5 }));
  ctx.save();
  roundRect(ctx, x0, top, w, h, 1.5);
  ctx.clip();
  const pw = 4.2;
  for (let px = x0 + pw; px < x0 + w; px += pw) {
    ctx.fillStyle = rgba(darken(col, 0.55), 0.35);
    ctx.fillRect(px - 0.5, top, 0.8, h);
    ctx.fillStyle = rgba(lighten(col, 0.4), 0.22);
    ctx.fillRect(px + 0.4, top, 0.7, h);
  }
  // a knot or two
  for (let i = 0; i < Math.floor(w / 9); i++) {
    const kx = x0 + 2 + hash(i, top) * (w - 4), ky = top + 2 + hash(i, w) * (h - 4);
    soft(ctx, kx, ky, 1.1, 0.8, [[0, rgba(darken(col, 0.5), 0.7)], [1, rgba(darken(col, 0.5), 0)]]);
  }
  ctx.restore();
  // corner posts
  part(ctx, (c) => {
    cylinder(c, x0 - 1.2, top - 1, 2.8, h + 2, darken(col, 0.2), { r: 1, hi: 0.3, lo: 0.5 });
    cylinder(c, x0 + w - 1.6, top - 1, 2.8, h + 2, darken(col, 0.2), { r: 1, hi: 0.3, lo: 0.5 });
  });
};

// Dressed stone with a wider footing course and a string course near the top.
export const stoneBody = (ctx, x, top, w, h, col = GREY_STONE) => {
  const x0 = x - w / 2;
  part(ctx, (c) => masonry(c, x0, top, w, h, col, { r: 2, course: 5.5, block: Math.max(6, w / 2.6), hi: 0.3, lo: 0.45 }));
  // string course
  part(ctx, (c) => cylinder(c, x0 - 1, top + 3, w + 2, 2.4, lighten(col, 0.12), { r: 1, hi: 0.35, lo: 0.4 }));
  // footing
  part(ctx, (c) => cylinder(c, x0 - 2, top + h - 5, w + 4, 5, darken(col, 0.12), { r: 1.5, hi: 0.28, lo: 0.45 }));
};

// A slit window with torchlight behind it.
export const slit = (ctx, x, y, h, lit = true) => {
  ctx.fillStyle = "#2a2430";
  roundRect(ctx, x - 1.4, y, 2.8, h, 1.2);
  ctx.fill();
  if (lit) glow(ctx, x, y + h / 2, 3.2, "#ffd070", 0.75);
};

// ---- platforms ---------------------------------------------------------
// A shooting deck: corbels under it, a lip of planks, the floor a shade lighter.
export const deck = (ctx, x, y, hw, col = TIMBER, depth = 6) => {
  soft(ctx, x, y + depth + 2, hw + 2, 3, [[0, "rgba(28,20,30,0.45)"], [1, "rgba(28,20,30,0)"]]);
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = darken(col, 0.3);
    ctx.beginPath();
    ctx.moveTo(x + sgn * (hw - 1), y + depth);
    ctx.lineTo(x + sgn * (hw - 6), y + depth);
    ctx.lineTo(x + sgn * (hw - 6), y + depth + 5);
    ctx.closePath();
    ctx.fill();
  }
  part(ctx, (c) => {
    roundRect(c, x - hw, y, hw * 2, depth, 1.5);
    c.fillStyle = lin(c, 0, y, 0, y + depth, [[0, lighten(col, 0.3)], [0.55, col], [1, darken(col, 0.4)]]);
    c.fill();
    c.save();
    roundRect(c, x - hw, y, hw * 2, depth, 1.5);
    c.clip();
    c.fillStyle = rgba(darken(col, 0.5), 0.3);
    for (let px = x - hw + 4; px < x + hw; px += 4.5) c.fillRect(px, y, 0.7, depth);
    c.restore();
  });
};

// Rail posts and a top rail along the deck's front edge.
export const rail = (ctx, x, y, hw, col = OAKWOOD, n = 5) => {
  part(ctx, (c) => {
    for (let i = 0; i < n; i++) {
      const px = x - hw + 1 + (i / (n - 1)) * (hw * 2 - 2);
      cylinder(c, px - 1.1, y - 6, 2.2, 7, col, { r: 0.9, hi: 0.3, lo: 0.5 });
    }
    c.strokeStyle = lighten(col, 0.1);
    c.lineWidth = 1.4;
    c.lineCap = "round";
    c.beginPath(); c.moveTo(x - hw + 1, y - 5); c.lineTo(x + hw - 1, y - 5); c.stroke();
  });
};

// Stone merlons along a wall head.
export const battlement = (ctx, x, y, hw, col = GREY_STONE, step = 7) => {
  for (let px = x - hw; px < x + hw - 2; px += step) {
    part(ctx, (c) => cylinder(c, px, y - 5, Math.min(4.2, x + hw - px), 6, col, { r: 1, hi: 0.32, lo: 0.42 }));
  }
};

// ---- roofs -------------------------------------------------------------
// A hipped roof of shingles: wide at the eaves, a short ridge, lit from above.
export const hipRoof = (ctx, x, eave, hw, ridgeHW, h, col) => {
  soft(ctx, x, eave + 2, hw, 2.5, [[0, "rgba(28,20,30,0.5)"], [1, "rgba(28,20,30,0)"]]);
  part(ctx, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(x - hw - 1, eave);
  ctx.quadraticCurveTo(x - hw * 0.7, eave - h * 0.55, x - ridgeHW, eave - h);
  ctx.lineTo(x + ridgeHW, eave - h);
  ctx.quadraticCurveTo(x + hw * 0.7, eave - h * 0.55, x + hw + 1, eave);
  ctx.closePath();
  const g = lin(ctx, x - hw, eave - h, x + hw * 0.6, eave, [[0, lighten(col, 0.4)], [0.45, col], [1, darken(col, 0.45)]]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let ry = eave - 2.5; ry > eave - h; ry -= 3.2) {
    ctx.fillStyle = rgba(darken(col, 0.5), 0.2);
    ctx.fillRect(x - hw - 2, ry, hw * 2 + 4, 0.9);
    ctx.fillStyle = rgba(lighten(col, 0.5), 0.14);
    ctx.fillRect(x - hw - 2, ry - 0.9, hw * 2 + 4, 0.8);
  }
  ctx.restore();
  });
  // ridge beam
  part(ctx, (c) => cylinder(c, x - ridgeHW - 1, eave - h - 1.2, ridgeHW * 2 + 2, 2.2, darken(col, 0.25), { r: 1, hi: 0.35, lo: 0.4 }));
};

// A pointed cap, for slender towers.
export const coneRoof = (ctx, x, eave, hw, h, col) => {
  soft(ctx, x, eave + 2, hw, 2.5, [[0, "rgba(28,20,30,0.5)"], [1, "rgba(28,20,30,0)"]]);
  part(ctx, (c) => cone(c, x, eave - h, hw + 1, h, col, { scallops: 3, sag: 2, hi: 0.42, lo: 0.5 }));
  part(ctx, (c) => ball(c, x, eave - h, 1.7, 1.7, "#d8b34a", { hi: 0.5, lo: 0.3 }));
};

// Posts carrying a roof down to a deck.
export const roofPosts = (ctx, x, top, bottom, hw, col = OAKWOOD) => {
  for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * hw - 1.3, top, 2.6, bottom - top, col, { r: 1, hi: 0.3, lo: 0.5 }));
};

// ---- dressings ---------------------------------------------------------
export const pennant = (ctx, x, top, len, col, time, phase = 0, dir = 1) => {
  cylinder(ctx, x - 0.8, top, 1.6, len, OAKWOOD, { r: 0.8, hi: 0.3, lo: 0.5 });
  const wv = Math.sin(time * 5 + phase) * 1.4;
  ctx.beginPath();
  ctx.moveTo(x + dir * 0.8, top);
  ctx.quadraticCurveTo(x + dir * 5, top - 0.5 + wv * 0.5, x + dir * (9 + wv), top + 1.5);
  ctx.quadraticCurveTo(x + dir * 5, top + 3.5 + wv * 0.5, x + dir * 0.8, top + 5);
  ctx.closePath();
  const g = lin(ctx, x, 0, x + dir * 9, 0, [[0, lighten(col, 0.25)], [1, darken(col, 0.2)]]);
  ctx.fillStyle = g;
  ctx.fill();
};

// A climbing briar: a woody stem up the wall with leaves and the odd berry.
export const vine = (ctx, x, top, h, side, seed = 0, leaf = "#3f7a34", berry = null) => {
  ctx.strokeStyle = "#4a3a22";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, top + h);
  for (let i = 1; i <= 4; i++) {
    const yy = top + h - (i / 4) * h;
    ctx.quadraticCurveTo(x + side * (i % 2 ? 3 : -2), yy + h / 8, x + side * (i % 2 ? 1.5 : -1), yy);
  }
  ctx.stroke();
  for (let i = 0; i < Math.floor(h / 4); i++) {
    const yy = top + h - (i + 0.5) * 4;
    const lx = x + side * (i % 2 ? 3.2 : -2.4) + (hash(seed, i) - 0.5) * 1.5;
    ball(ctx, lx, yy, 2, 1.5, i % 3 ? leaf : lighten(leaf, 0.15), { hi: 0.4, lo: 0.35 });
    if (berry && i % 4 === 1) ball(ctx, lx + side * 1.2, yy + 1.5, 0.9, 0.9, berry, { hi: 0.6, lo: 0.3 });
  }
};

// Grass growing back around a footing.
export const skirt = (ctx, x, y, hw, seed = 0) => {
  for (let i = 0; i < 4; i++) {
    const sx = x - hw + hash(seed, i) * hw * 2, sy = y + 1 + hash(seed, i + 7) * 3;
    tuft(ctx, sx, sy, 0.6, "#4f7a34", "#8ab848", seed + i, { n: 3 });
  }
};

export { lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, masonry, hash, lin, rad, part };

// ---- baked sprites -----------------------------------------------------
// Every hall keeps a cache of baked pieces keyed by form. `stamp` draws one
// anchored at (ax, ay) inside it, mirrored when `dir` is negative.
import { bakeSprite, PX } from "./paint.js";
export const spriteCache = () => {
  const m = new Map();
  return {
    get: (key, w, h, draw) => { let cv = m.get(key); if (!cv) { cv = bakeSprite(w, h, draw); m.set(key, cv); } return cv; },
    clear: () => m.clear(),
  };
};
export const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore();
};
export const canBake = () => typeof document !== "undefined";

// ============ THE FINER KIT ============
// The second generation of parts, for halls that want to read as built
// things at a glance: ground that holds a building down, coursed stone with
// every block its own tone, planks with grain and nails, cloth that hangs,
// fire that lives in iron. Same sun, same plum shadows, same ink.

import { blobBall, flower as wildflower } from "./paint.js";

// ---- grounding -----------------------------------------------------------
// Baked on its OWN, un-inked (bakeSprite(..., false)), under the hall: a
// trodden apron, the shadow the hall throws down and to the right, and a
// tight dark line right where stone meets turf. Stones in it ink themselves.
export const groundBed = (ctx, x, y, hw, seed = 0, o = {}) => {
  const earth = o.earth ?? "#7c6242";
  const r = hw + (o.spread ?? 9);
  soft(ctx, x, y + 1, r, r * 0.34, [[0, rgba(earth, 0.36)], [0.62, rgba(earth, 0.24)], [1, rgba(earth, 0)]]);
  // the cast shadow, thrown away from the sun
  soft(ctx, x + hw * 0.45 + 3, y + 2.5, hw + 7, 5 + hw * 0.08, [[0, "rgba(34,24,38,0.36)"], [0.7, "rgba(34,24,38,0.22)"], [1, "rgba(34,24,38,0)"]]);
  // the contact: darkest right under the footing
  soft(ctx, x + 1, y + 0.5, hw + 2.5, 3, [[0, "rgba(30,20,32,0.55)"], [0.8, "rgba(30,20,32,0.4)"], [1, "rgba(30,20,32,0)"]]);
  // flagstones and gravel kicked out of the work
  const n = o.stones ?? 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.8, d = r * (0.62 + hash(seed, i + 9) * 0.34);
    const sx = x + Math.cos(a) * d, sy = y + 1.5 + Math.sin(a) * d * 0.34;
    if (sy < y - 1) continue;                         // the back ones hide behind the hall anyway
    const big = hash(seed, i + 3) > 0.55;
    part(ctx, (c) => ball(c, sx, sy, big ? 2.6 : 1.5, big ? 1.4 : 0.9, mix("#b0a48e", "#8a7e6a", hash(seed, i + 5)), { hi: 0.45, lo: 0.45 }));
  }
};

// A wider course of big rough stones the whole hall sits on. `hw` is the
// wall's half-width; the footing juts a little past it and is `h` tall.
export const footing = (ctx, x, y, hw, col = GREY_STONE, seed = 0, h = 5) => {
  const x0 = x - hw - 2, w = hw * 2 + 4;
  part(ctx, (c) => {
    roundRect(c, x0, y - h, w, h, 1.5);
    c.fillStyle = lin(c, x0, 0, x0 + w, 0, [[0, lighten(col, 0.18)], [0.5, darken(col, 0.08)], [1, darken(col, 0.42)]]);
    c.fill();
    c.save(); roundRect(c, x0, y - h, w, h, 1.5); c.clip();
    let bx = x0 - hash(seed, 1) * 4, k = 0;
    while (bx < x0 + w) {
      const bw = 5 + hash(seed, k + 2) * 5;
      const t = hash(seed, k + 30);
      if (t < 0.35) { c.fillStyle = rgba(darken(col, 0.3), 0.45); c.fillRect(bx, y - h, bw, h); }
      else if (t > 0.72) { c.fillStyle = rgba(lighten(col, 0.25), 0.4); c.fillRect(bx, y - h, bw, h); }
      c.fillStyle = rgba(lighten(col, 0.55), 0.45); c.fillRect(bx + 0.5, y - h, bw - 1, 0.5);
      c.fillStyle = rgba(darken(col, 0.7), 0.7); c.fillRect(bx + bw - 0.5, y - h, 0.5, h);
      bx += bw; k++;
    }
    c.restore();
  });
};

// ---- stone -----------------------------------------------------------------
// Coursed ashlar: laid from the bottom up in staggered blocks, each stone a
// touch lighter or darker than its neighbours, a sunlit lip on every top
// edge, crisp one-pixel mortar, and the whole face shaded across its width.
// o: course (block height), block (mean width), moss (green creeping up
// from the foot, 0..1), cracks, r (corner radius), band (a dressed string
// course every n courses).
export const ashlar = (ctx, x0, top, w, h, col, seed = 0, o = {}) => {
  const ch = o.course ?? 4.5, bw0 = o.block ?? 7, r = o.r ?? 1.5;
  part(ctx, (c) => {
    cylinder(c, x0, top, w, h, col, { r, hi: o.hi ?? 0.3, lo: o.lo ?? 0.55 });
    c.save();
    roundRect(c, x0, top, w, h, r);
    c.clip();
    const mortar = rgba(darken(col, 0.72), 0.62);
    let row = 0;
    for (let cy = top + h; cy > top - 0.01; cy -= ch, row++) {
      const y0 = Math.max(top, cy - ch), bh = cy - y0;
      let bx = x0 - (row % 2 ? bw0 * 0.5 : 0) - hash(seed, row) * 2, k = 0;
      while (bx < x0 + w) {
        const bw = Math.round(bw0 * (0.7 + hash(seed + row * 7, k) * 0.6) * 2) / 2;
        const tn = hash(seed * 3 + row, k + 11);
        if (tn < 0.28) { c.fillStyle = rgba(darken(col, 0.35), 0.4); c.fillRect(bx, y0, bw, bh); }
        else if (tn > 0.78) { c.fillStyle = rgba(lighten(col, 0.4), 0.32); c.fillRect(bx, y0, bw, bh); }
        c.fillStyle = rgba(lighten(col, 0.6), 0.42);
        c.fillRect(bx + 0.5, y0 + 0.5, bw - 1.5, 0.5);                  // the sunlit lip
        c.fillStyle = mortar;
        c.fillRect(bx + bw - 0.5, y0, 0.5, bh);                         // the head joint
        if (o.cracks && hash(seed + 5, row * 13 + k) > 0.93 && bw > 5) {
          c.fillRect(bx + 2, y0 + 1, 0.5, 1); c.fillRect(bx + 2.5, y0 + 2, 0.5, 1); c.fillRect(bx + 2, y0 + 3, 0.5, Math.max(0, bh - 3));
        }
        bx += bw; k++;
      }
      c.fillStyle = mortar;
      c.fillRect(x0, y0, w, 0.5);                                         // the bed joint
      if (o.band && row % o.band === o.band - 1) {
        c.fillStyle = rgba(lighten(col, 0.3), 0.55); c.fillRect(x0, y0, w, 1);
        c.fillStyle = rgba(darken(col, 0.6), 0.55); c.fillRect(x0, y0 + 1, w, 0.5);
      }
    }
    // moss and damp creeping up from the ground
    if (o.moss) {
      for (let i = 0; i < Math.ceil(w / 3.5); i++) {
        const mx = x0 + (i + hash(seed, i + 40)) * 3.5, mh = (1.5 + hash(seed, i + 60) * 5) * o.moss;
        c.fillStyle = rgba(i % 3 ? "#5f8a3c" : "#79a24a", 0.8);
        c.fillRect(Math.round(mx * 2) / 2, top + h - mh, 1.5, mh);
      }
    }
    c.restore();
  });
};

// ---- timber ----------------------------------------------------------------
// Planks, upright (or laid flat with `o.flat`), each its own shade, with a
// dark seam, a line of grain, and a pair of nail heads at the ends.
export const planks = (ctx, x0, top, w, h, col = TIMBER, seed = 0, o = {}) => {
  const pw = o.pw ?? 3.5;
  part(ctx, (c) => {
    cylinder(c, x0, top, w, h, col, { r: o.r ?? 1, hi: 0.28, lo: 0.5 });
    c.save();
    roundRect(c, x0, top, w, h, o.r ?? 1);
    c.clip();
    const span = o.flat ? h : w;
    for (let i = 0, p = 0; p < span; p += pw, i++) {
      const tn = hash(seed, i + 3);
      const shade = tn < 0.3 ? rgba(darken(col, 0.3), 0.4) : tn > 0.75 ? rgba(lighten(col, 0.25), 0.35) : null;
      c.fillStyle = shade || "rgba(0,0,0,0)";
      if (o.flat) {
        const py = top + p;
        if (shade) c.fillRect(x0, py, w, pw);
        c.fillStyle = rgba(darken(col, 0.7), 0.7); c.fillRect(x0, py + pw - 0.5, w, 0.5);
        c.fillStyle = rgba(darken(col, 0.35), 0.55); c.fillRect(x0 + 2 + hash(seed, i) * (w - 8), py + pw * 0.45, 3 + hash(seed, i + 7) * 4, 0.5);
        c.fillStyle = "#3a2c28"; c.fillRect(x0 + 1, py + 1, 0.5, 0.5); c.fillRect(x0 + w - 1.5, py + 1, 0.5, 0.5);
      } else {
        const px = x0 + p;
        if (shade) c.fillRect(px, top, pw, h);
        c.fillStyle = rgba(darken(col, 0.7), 0.7); c.fillRect(px + pw - 0.5, top, 0.5, h);
        c.fillStyle = rgba(darken(col, 0.35), 0.55); c.fillRect(px + pw * 0.4, top + 1.5 + hash(seed, i) * (h - 6), 0.5, 2 + hash(seed, i + 7) * 3);
        if (o.nails !== false) { c.fillStyle = "#3a2c28"; c.fillRect(px + 1, top + 1, 0.5, 0.5); c.fillRect(px + 1, top + h - 1.5, 0.5, 0.5); }
      }
    }
    c.restore();
  });
};

// A squared beam between two points (braces, legs, rafters).
export const beam = (ctx, x0, y0, x1, y1, w, col = OAKWOOD) => part(ctx, (c) => {
  c.strokeStyle = lin(c, x0 - w, y0, x0 + w, y0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = w;
  c.lineCap = "butt";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
});

// ---- apertures ---------------------------------------------------------------
// An arched window in a dressed surround; its light is painted live.
export const archWindow = (ctx, x, top, w, h, col = PALE_STONE, glass = "#2a2438") => {
  part(ctx, (c) => {
    c.fillStyle = lin(c, x - w / 2 - 1, 0, x + w / 2 + 1, 0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.35)]]);
    c.beginPath(); c.moveTo(x - w / 2 - 1, top + h + 0.5); c.lineTo(x - w / 2 - 1, top + w / 2); c.arc(x, top + w / 2, w / 2 + 1, Math.PI, 0); c.lineTo(x + w / 2 + 1, top + h + 0.5); c.closePath(); c.fill();
  });
  ctx.fillStyle = glass;
  ctx.beginPath(); ctx.moveTo(x - w / 2, top + h); ctx.lineTo(x - w / 2, top + w / 2); ctx.arc(x, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, top + h); ctx.closePath(); ctx.fill();
};

// An iron-strapped plank door under a round head.
export const door = (ctx, x, bottom, w, h, col = "#5e4128") => part(ctx, (c) => {
  c.beginPath(); c.moveTo(x - w / 2, bottom); c.lineTo(x - w / 2, bottom - h + w / 2); c.arc(x, bottom - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, bottom); c.closePath();
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, lighten(col, 0.25)], [0.5, col], [1, darken(col, 0.45)]]);
  c.fill();
  c.fillStyle = rgba(darken(col, 0.7), 0.7);
  for (let px = x - w / 2 + 2; px < x + w / 2 - 0.5; px += 2) c.fillRect(px, bottom - h + 1.5, 0.5, h - 1.5);
  c.fillStyle = "#4a4c56";
  c.fillRect(x - w / 2, bottom - h * 0.72, w, 1); c.fillRect(x - w / 2, bottom - h * 0.3, w, 1);
  c.fillStyle = "#d8b34a"; c.fillRect(x + w / 2 - 2, bottom - h * 0.5, 1, 1);
});

// ---- cloth -------------------------------------------------------------------
// A banner hanging from a rod: straight sides, a swallowtail (or a point,
// `o.point`), a trim along the hem, a fold or two, and whatever device
// `emblem(c, cx, cy)` paints on it.
export const banner = (ctx, x, top, w, h, col, trim = "#d8b34a", emblem = null, o = {}) => {
  part(ctx, (c) => {
    const x0 = x - w / 2, x1 = x + w / 2, bot = top + h;
    c.beginPath();
    c.moveTo(x0, top); c.lineTo(x1, top); c.lineTo(x1, bot);
    if (o.point) c.lineTo(x, bot + w * 0.45);
    else { c.lineTo(x, bot - w * 0.4); }
    c.lineTo(x0, bot);
    c.closePath();
    c.fillStyle = lin(c, x0, 0, x1, 0, [[0, lighten(col, 0.28)], [0.5, col], [1, darken(col, 0.4)]]);
    c.fill();
    c.save(); c.clip();
    c.fillStyle = rgba(darken(col, 0.5), 0.35); c.fillRect(x - w * 0.18, top, 0.5, h + 4);   // a fold
    c.fillStyle = trim; c.fillRect(x0, top + 1, w, 1);
    c.fillStyle = rgba(trim, 0.9);
    if (o.point) { c.beginPath(); c.moveTo(x0, bot - 1.2); c.lineTo(x, bot + w * 0.45 - 1.2); c.lineTo(x1, bot - 1.2); c.lineTo(x1, bot); c.lineTo(x, bot + w * 0.45); c.lineTo(x0, bot); c.closePath(); c.fill(); }
    c.restore();
    if (emblem) emblem(c, x, top + h * 0.45);
  });
  // the rod, a hair wider than the cloth
  part(ctx, (c) => cylinder(c, x - w / 2 - 1.5, top - 1, w + 3, 1.6, "#5a3f26", { r: 0.8, hi: 0.3, lo: 0.4 }));
};

// ---- fire and iron -------------------------------------------------------------
// An iron bowl on three legs, baked; its fire is `flame()`, live.
export const brazier = (ctx, x, y, s = 1, iron = "#4a4c56") => {
  part(ctx, (c) => {
    c.strokeStyle = darken(iron, 0.2); c.lineWidth = 1 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(x - 2.5 * s, y); c.lineTo(x - 1 * s, y - 4 * s); c.moveTo(x + 2.5 * s, y); c.lineTo(x + 1 * s, y - 4 * s); c.moveTo(x, y + 0.5); c.lineTo(x, y - 4 * s); c.stroke();
  });
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 3.6 * s, y - 6.5 * s); c.lineTo(x + 3.6 * s, y - 6.5 * s); c.quadraticCurveTo(x + 3 * s, y - 3.5 * s, x, y - 3.4 * s); c.quadraticCurveTo(x - 3 * s, y - 3.5 * s, x - 3.6 * s, y - 6.5 * s); c.closePath();
    c.fillStyle = lin(c, x - 4 * s, 0, x + 4 * s, 0, [[0, lighten(iron, 0.35)], [0.5, iron], [1, darken(iron, 0.4)]]);
    c.fill();
    c.fillStyle = "#3a2420"; c.fillRect(x - 3 * s, y - 7 * s, 6 * s, 1 * s);
  });
};

// A living flame: a flickering tongue in three hard tones over a warm
// glow. `s` scales it; `seed` desynchronises neighbours.
export const flame = (ctx, x, y, s, time, seed = 0, cols = ["#fff0a8", "#f8a83a", "#d8482a"]) => {
  const f = Math.sin(time * 11 + seed * 1.7) * 0.5 + Math.sin(time * 17.3 + seed) * 0.5;
  const hgt = (5 + f * 1.2) * s, lean = Math.sin(time * 5 + seed) * 0.8 * s;
  glow(ctx, x, y - hgt * 0.4, 5.5 * s, cols[1], 0.32);
  const tongue = (w, h, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w, y - h * 0.55, x + lean, y - h);
    ctx.quadraticCurveTo(x + w, y - h * 0.55, x + w, y);
    ctx.closePath();
    ctx.fill();
  };
  tongue(2.4 * s, hgt, cols[2]);
  tongue(1.6 * s, hgt * 0.72, cols[1]);
  tongue(0.8 * s, hgt * 0.42, cols[0]);
};

// A torch in an iron bracket on a wall (baked); light it with `flame`.
export const torchBracket = (ctx, x, y) => part(ctx, (c) => {
  c.fillStyle = "#4a4c56"; c.fillRect(x - 1.5, y, 3, 1); c.fillRect(x - 0.5, y - 2, 1, 3);
  c.fillStyle = "#6a4a2e"; c.fillRect(x - 0.75, y - 5, 1.5, 4);
  c.fillStyle = "#3a2420"; c.fillRect(x - 1.25, y - 6, 2.5, 1.5);
});

// A wildflower or two at a hall's foot, for charm.
export const posy = (ctx, x, y, col, seed = 0) => { wildflower(ctx, x, y, col, seed, 0.6); };

// Rough merlons with a coping, varied a hair each so they read as laid stone.
export const merlons = (ctx, x, y, hw, col = GREY_STONE, o = {}) => {
  const step = o.step ?? 6, mw = o.w ?? 4, mh = o.h ?? 5, seed = o.seed ?? 0;
  for (let px = x - hw, i = 0; px <= x + hw - mw + 0.01; px += step, i++) {
    const hh = mh + (hash(seed, i) > 0.6 ? 0.5 : 0);
    part(ctx, (c) => {
      cylinder(c, px, y - hh, mw, hh + 1, col, { r: 0.8, hi: 0.35, lo: 0.5 });
      c.fillStyle = rgba(lighten(col, 0.55), 0.6); c.fillRect(px + 0.5, y - hh, mw - 1, 0.5);
    });
  }
};

// A lump of rock with a wandering edge (for footings and rubble).
export const rock = (ctx, x, y, rx, ry, col, seed = 0) => part(ctx, (c) => blobBall(c, x, y, rx, ry, col, seed, { hi: 0.45, lo: 0.5 }));
