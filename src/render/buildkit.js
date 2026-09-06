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

export { lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, masonry, hash, lin, rad };
