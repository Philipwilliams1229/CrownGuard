// Effects concepts, Round 18, row 1 (artist 1): the Brazier Wheel's flame ring in Dragonbreath's look. See art/briefs/fx-round18.md.
// The cell is the real hall (the Bladewheel at the Brazier Wheel form, the game's own painter) at board scale: the ring runs over
// the hall's whole reach (65 world units = 130 art px), squashed 0.55 on the ground, 450 ms, the front eased as rings.js eases it.
// Goblins stand in reach (four) and out of it (two); each flashes white as the front passes (ringflash.js) and warms as it nears.
// TODAY = the game's own `case "firenova"` (rings.js), drawn in its two layers around the hall and the goblins as draw.js does.
// A/B/C keep the ring, its timing, the scorched ring and the line of coals; only the FLAMES are new. Every flame pixel carries a
// ground depth and is drawn between the goblins and the hall by depth (as Round 17's jet), and opacity is stepped, never smooth.
// Painters get (c, e): c is the cell translated to (ax, ay), 1 unit = 1 art px. Game modules load only in a browser.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/rings.js")), ...(await import("/src/render/halls/spiker.js")), ...(await import("/src/render/paint.js")) } : {};

const TAU = Math.PI * 2, N = 14, LIFE = 450, SQ = 0.55;
const PXu = () => G.PX || 2;
const RW = 65, R = RW * 2;                                              // the Brazier Wheel's reach: world units, art px
const CELL = { cw: 320, ch: 200, ax: 160, ay: 114, N };
// Dragonbreath's tones (concept/fx-r17-a.js), and the ground's soot from rings.js
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];
const INK = "#8a2028", SOOT = "#5a2430", EMBR = "#9a3a30";
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - (1 - cl(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(cl(a) * n) / n;
const per = (a, n) => ((a % n) + n) % n;
const sm = (u) => u * u * (3 - 2 * u);
const P = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const vn = (x, y, s, seed = 0) => {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const a = H(x0 + seed, y0), b = H(x0 + 1 + seed, y0), c = H(x0 + seed, y0 + 1), d = H(x0 + 1 + seed, y0 + 1);
  return (a + (b - a) * sm(fx)) * (1 - sm(fy)) + (c + (d - c) * sm(fx)) * sm(fy);
};
const ring1 = (n, pos, seed) => { const k = Math.floor(pos), f = pos - k, a = H(per(k, n), seed), b = H(per(k + 1, n), seed); return a + (b - a) * sm(f); };

// the ring's clock, exactly as rings.js: the front eased out over 1/1.15 of the life; the fade is draw.js's ttl / 300 in quarter steps
const frontOf = (p) => R * easeOut(p * 1.15);
const fadeOf = (p) => stepA(Math.min(1, (LIFE * (1 - p)) / 300));

// ---- the cell: the real hall and the goblins ---------------------------------------------------------------------------------
const GOB = [[-74, 26], [60, 44], [24, -42], [-30, -58], [-146, 6], [122, -46]];   // feet, art px; the last two stand out of reach
const hallT = (e) => ({ id: 3, kind: "spiker", x: 0, y: 0, level: 3, branch: "b", rank4: null, cd: 0, aim: "first", lastAim: Math.PI, anim: Math.max(0, 1 - e.p * 2), shotIdx: 0, critIdx: 0, invested: 0, units: [], rally: null, kills: 0, dmgOut: 0, liveTime: 1 });
const drawHall = (c, e) => { c.save(); c.scale(PXu(), PXu()); G.drawBladewheel(c, hallT(e), 3 + e.p * 0.45); c.restore(); };
const tintC = {};
const tinted = (s, col, key) => {
  const k = key + col; if (tintC[k]) return tintC[k];
  const t = document.createElement("canvas"); t.width = s.cv.width; t.height = s.cv.height; const x = t.getContext("2d");
  x.drawImage(s.cv, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height); return (tintC[k] = t);
};
const gobItems = (c, e, front, warm) => GOB.map(([x, y], k) => {
  const dg = Math.hypot(x, y / SQ), f = (e.i + k * 3) & 7, d = front - dg;
  const flash = Math.abs(d) < 6 && e.p < 0.9 && front > 4, near = warm && dg < R + 4 ? cl(1 - Math.abs(d) / 16) * fadeOf(e.p) : 0;
  return { y, draw: () => {
    const s = e.foe(f, "");
    c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
    if (near > 0) { c.globalAlpha = Math.ceil(near * 3) / 3 * 0.36; c.drawImage(tinted(s, "#ff9a30", "g" + f), Math.round(x - s.ax), Math.round(y - s.ay)); c.globalAlpha = 1; }
    if (flash) { const w = e.foe(f, "white"); c.globalAlpha = 0.7; c.drawImage(w.cv, Math.round(x - w.ax), Math.round(y - w.ay)); c.globalAlpha = 1; }
  } };
});

// ---- the ground under every option: the scorched ring, the line of coals, the light thrown ahead ----------------------------
// (rings.js's scorch in pixels: soot thick behind the front thinning inward, a red-brown band just inside it, a few char patches)
const groundPx = (c, e, r, fa, o = {}) => {
  const m = Math.ceil(r + 10), myy = Math.ceil((r + 10) * SQ);
  for (let y = -myy; y <= myy; y++) for (let x = -m; x <= m; x++) {
    const dg = Math.hypot(x + 0.5, (y + 0.5) / SQ), dep = r - dg, b = bay(x + 512, y + 512);
    if (dep >= 0) {
      if (dep < 7 ? b < 0.66 * fa : dep < 16 ? b < 0.4 * fa : vn(x, y / SQ, 7, 31) > 0.7 && b < 0.34 * fa) P(c, x, y, SOOT);
      if (dep > 3 && dep < 6 && b < 0.3 * fa) P(c, x, y, EMBR);
      // the coals the flames stand on: a dark-red line with hot hearts (rings.js's coals)
      if (dep < 1.5) { const an = Math.atan2((y + 0.5) / SQ, x + 0.5), k = Math.floor((an + Math.PI) * r / 2.6); P(c, x, y, k % 3 === 0 ? FIRE[1] : k % 3 === 1 ? FIRE[3] : EMBR, 0.9 * fa); }
    } else if (dep > -8 && !o.noGlow) {
      // light thrown on the turf just ahead of the front: two dithered steps
      const st = dep > -3.5 ? 0.5 : 0.25;
      if (b < st * fa) P(c, x, y, FIRE[2], 0.4);
    }
  }
};

// ---- the flame wall: a curtain standing on the ring's ellipse, one mottled mass --------------------------------------------
// Sampled round the ring (theta) and up (h). The top edge is ragged by two periodic noises round the ring (wide swells, narrow
// licks that slide round frame by frame); the tips lean back INWARD against the outward roll (o.lean: inward px per px of height,
// growing toward the tip), which on the ground's squashed circle reads as a lean to the hall at the sides and a foreshortened,
// forward-tilting back half. Body: two layers of cells, stretched up (flames rise) and drifting up by o.rise a frame, coloured in
// Dragonbreath's five tones, a broken pale band just above the coals (the core), the top a 1-px tinted dark-red line, the upper
// part of tall licks a little see-through (o.see, stepped and dithered as Round 17's flare).
const wallPx = (out, e, r, o) => {
  if (r < 4) return;
  const i = e.i, n1 = Math.max(6, Math.round(TAU * r / 10)), n2 = Math.max(10, Math.round(TAU * r / 4.5)), nm = Math.max(12, Math.round(TAU * r / 3));
  const hAt = (th) => {
    const a1 = ring1(n1, th / TAU * n1 + i * 0.15, 11), a2 = ring1(n2, th / TAU * n2 + i * (o.slide || 0.6), 23 + (i >> 1) * 0.37);
    return o.H0 * o.hk * (0.45 + 0.3 * a1 + 0.62 * a2 * a2 * a2 * a2);
  };
  const dth = 0.45 / r, dl = 1.3 / r;
  for (let th = 0; th < TAU; th += dth) {
    const cs = Math.cos(th), sn = Math.sin(th), hg = hAt(th), hl = Math.min(hAt(th - dl), hAt(th + dl)), half = sn >= 0 ? 1 : 0;
    const cu = per(Math.floor(th / TAU * nm), nm), cu2 = per(Math.floor(th / TAU * nm / 2 + 0.5), Math.max(1, nm >> 1));
    const top = Math.ceil(hg);
    for (let h = 0; h <= top; h++) {
      const t = Math.min(1, h / Math.max(1, hg)), L = Math.min(o.lean * h * t, r * 0.3), rr = r - L;   // a small ring leans less, never onto the hall
      const x = Math.round(rr * cs - 0.5), y = Math.round(rr * SQ * sn - h - 0.5), dep = rr * SQ * sn;
      const m1 = H(cu, Math.floor((h + i * o.rise) / 4) + 40), m2 = H(cu2 + 7, Math.floor((h + i * o.rise * 0.7) / 7) + 90), m = m1 * 0.6 + m2 * 0.4;
      let heat = (1 - t) * 0.6 + (m - 0.5) * 0.62 + 0.2;
      if (o.hot && h < 1) heat += 0.5;
      let col = heat > 0.9 ? FIRE[0] : heat > 0.72 ? FIRE[1] : heat > 0.5 ? FIRE[2] : heat > 0.3 ? FIRE[3] : FIRE[4];
      if (t > 0.1 && t < 0.3 && m > 0.52 && m1 > 0.45 && hg > 5) col = m > 0.68 ? FIRE[0] : FIRE[1];          // the broken pale core
      const rim = h >= hg - 1 || h > hl + 0.5;
      if (rim) col = h >= hg - 0.5 || bay(x, y) < 0.6 ? INK : FIRE[4];
      else if (h >= hg - 2 && bay(x, y) < 0.5) col = FIRE[4];
      if (h === 0 && !o.hot) col = m > 0.5 ? FIRE[3] : FIRE[4];                                   // the foot, darker where it meets the coals
      const eh = cl((t - 0.5) / 0.35), eq = Math.min(1, Math.floor(eh * 3 + bay(x, y)) / 3);
      let al = 1 - (1 - (o.see ?? 0.8)) * eq;
      if (rim) al = Math.max(al, 0.92);
      put(out, x, y, col, dep, al * o.fa, o.surf * 2 + half);
    }
    // small ragged licks breaking free above the tallest tongues (a pixel or two, then gone)
    if (o.free && hg > o.H0 * o.hk * 0.95 && H(cu, i + 3) < 0.35) {
      const L = o.lean * hg, x = Math.round((r - L) * cs - 0.5), y = Math.round((r - L) * SQ * sn - hg - 2.5 - (i & 1));
      put(out, x, y, FIRE[3], (r - L) * SQ * sn, o.fa, 9 * 2 + half); put(out, x, y - 1, INK, (r - L) * SQ * sn, o.fa * 0.9, 9 * 2 + half);
    }
  }
};
// flame pixels kept in a map: one pixel per (place, surface, half), the nearest sample winning
const put = (out, x, y, col, dep, a, s) => {
  if (a <= 0) return;
  const k = ((x + 1024) * 2048 + (y + 1024)) * 32 + s, o = out.get(k);
  if (!o || dep > o.dep) out.set(k, { x, y, col, dep, a });
};
// draw the flame pixels and the items (hall, goblins) together, back to front
const compose = (c, out, items) => {
  const px = [...out.values()].sort((a, b) => a.dep - b.dep), its = items.slice().sort((a, b) => a.y - b.y);
  let j = 0;
  for (const p of px) {
    while (j < its.length && its[j].y < p.dep) { c.globalAlpha = 1; its[j++].draw(); }
    c.globalAlpha = Math.round(p.a * 20) / 20; c.fillStyle = p.col; c.fillRect(p.x, p.y, 1, 1);
  }
  c.globalAlpha = 1;
  while (j < its.length) its[j++].draw();
};

// ---- B: burning ground left behind the front, see-through, the scorch showing through it ---------------------------------
const carpet = (out, e, r, fa, W) => {
  const i = e.i, m = Math.ceil(r + 1), myy = Math.ceil((r + 1) * SQ);
  for (let y = -myy; y <= myy; y++) for (let x = -m; x <= m; x++) {
    const dg = Math.hypot(x + 0.5, (y + 0.5) / SQ), d = r - dg;
    if (d < 0 || d > W) continue;
    const k = 1 - d / W, an = Math.atan2((y + 0.5) / SQ, x + 0.5), nm = Math.max(12, Math.round(TAU * r / 4));
    const cu = per(Math.floor((an + Math.PI) / TAU * nm), nm), mm = H(cu, Math.floor((d + i * 2.2) / 3) + 60) * 0.6 + H(cu + 3, Math.floor((d + i * 1.4) / 5) + 70) * 0.4;
    if (k < 0.4 && bay(x + 512, y + 512) > k * 2.2 + (mm - 0.5) * 0.5) continue;   // solid at the front, breaking up in the inner part
    const heat = k * 0.55 + (mm - 0.5) * 0.75 + 0.15;
    const col = heat > 0.78 ? FIRE[1] : heat > 0.52 ? FIRE[2] : heat > 0.3 ? FIRE[3] : heat > 0.12 ? FIRE[4] : INK;
    const al = (k > 0.66 ? 0.8 : k > 0.33 ? 0.65 : 0.5) * fa;
    put(out, x, y, col, y + 0.5 - 40, al, 11 * 2);               // lies on the ground: under everything that stands
  }
};

// ---- C: the white-gold needle of the leading edge, and sparks lifting off the front -------------------------------------
const needle = (c, e, r, fa) => {
  if (r < 4) return;
  const m = Math.ceil(r + 3), myy = Math.ceil((r + 3) * SQ), nm = Math.max(12, Math.round(TAU * r / 5));
  for (let y = -myy; y <= myy; y++) for (let x = -m; x <= m; x++) {
    const dg = Math.hypot(x + 0.5, (y + 0.5) / SQ), d = dg - r;
    if (d < 0 || d > 2.6) continue;
    const an = Math.atan2((y + 0.5) / SQ, x + 0.5), cu = per(Math.floor((an + Math.PI) / TAU * nm + e.i * 0.5), nm);
    if (d < 1.1) { if (H(cu, 5) > 0.14) P(c, x, y, FIRE[0], fa); }
    else if (bay(x + 512, y + 512) < 0.5) P(c, x, y, FIRE[1], 0.8 * fa);
  }
};
const sparks = (c, e, n0) => {
  const p = e.p;
  for (let k = 0; k < n0; k++) {
    const born = H(k, 71) * 0.7; if (p < born) continue;
    const th = H(k, 72) * TAU, d0 = frontOf(born) + 1, age = (p - born) * LIFE, life = 150 + 170 * H(k, 73);
    if (age > life) continue;
    const u = age / life, sp = 0.05 + 0.05 * H(k, 74), cs = Math.cos(th), sn = Math.sin(th);
    const x = d0 * cs - cs * age * 0.012 + Math.sin(age * 0.03 + k) * 1.5, y = d0 * SQ * sn - 8 - age * sp - 6 * H(k, 75);
    const col = u < 0.3 ? FIRE[0] : u < 0.6 ? FIRE[1] : u < 0.85 ? FIRE[2] : FIRE[3];
    P(c, x, y, col); if (u < 0.45) P(c, x, y + 1, u < 0.2 ? FIRE[1] : FIRE[2]);
  }
};

// ---- the three options ------------------------------------------------------------------------------------------------------
// A: the wall of flame as Dragonbreath's mottled mass, today's height, on today's coals
const optA = (c, e) => {
  const r = frontOf(e.p), fa = fadeOf(e.p), out = new Map();
  if (fa > 0) {
    groundPx(c, e, r, fa);
    wallPx(out, e, r, { H0: 25, hk: 0.5 + 0.5 * fa, lean: 0.22, rise: 1.6, slide: 0.6, see: 0.8, fa, surf: 0, free: true });
  }
  compose(c, out, [{ y: 0, draw: () => drawHall(c, e) }, ...gobItems(c, e, r, true)]);
};
// B: a lower, faster rolling front of licks leaning hard back against the roll, burning ground behind it, see-through
const optB = (c, e) => {
  const r = frontOf(e.p), fa = fadeOf(e.p), out = new Map();
  if (fa > 0) {
    groundPx(c, e, r, fa);
    carpet(out, e, r - 1, fa, Math.min(18, r * 0.45));
    wallPx(out, e, r, { H0: 18, hk: 0.55 + 0.45 * fa, lean: 0.7, rise: 3.2, slide: 1.4, see: 0.8, fa, surf: 0, free: false });
  }
  compose(c, out, [{ y: 0, draw: () => drawHall(c, e) }, ...gobItems(c, e, r, true)]);
};
// C: A's wall with a white-gold needle-bright leading edge on the ground, a white-hot foot, and sparks lifting off the front
const optC = (c, e) => {
  const r = frontOf(e.p), fa = fadeOf(e.p), out = new Map();
  if (fa > 0) {
    groundPx(c, e, r, fa);
    needle(c, e, r, fa);
    wallPx(out, e, r, { H0: 24, hk: 0.5 + 0.5 * fa, lean: 0.22, rise: 1.6, slide: 0.6, see: 0.8, fa, surf: 0, free: true, hot: true });
  }
  compose(c, out, [{ y: 0, draw: () => drawHall(c, e) }, ...gobItems(c, e, r, true)]);
  sparks(c, e, 46);
};

// TODAY: the game's own painter, in its two layers round the hall and the goblins (world units inside W)
const today = (c, e) => {
  const fx = { type: "firenova", x: 0, y: 0, r: RW, life: LIFE, ttl: LIFE * (1 - e.p) }, a = Math.min(1, fx.ttl / 300), t = hallT(e), g = { towers: [t] };
  const W = (fn) => { c.save(); c.scale(PXu(), PXu()); fn(); c.restore(); };
  if (fx.ttl > 0) W(() => G.drawRingFx(c, fx, a, g, "g"));
  const its = [{ y: 0, draw: () => drawHall(c, e) }, ...gobItems(c, e, frontOf(e.p), false)].sort((p, q) => p.y - q.y);
  for (const it of its) it.draw();
  if (fx.ttl > 0) W(() => G.drawRingFx(c, fx, a, g, "a"));
};

export const ROWS = [
  { id: "firering18", label: "Brazier Wheel flame ring", group: "Round 18",
    note: "The Brazier Wheel's ring of flame, at its real reach round the real hall, 450 ms as today, goblins in and out of reach. Same ring, same timing, same scorched ring and coals; only the flames are new, in Dragonbreath's look. A: the wall of flame as one mottled mass (gold, orange, red clusters, a pale band low down, a thin dark-red edge on top), today's height, the tall tips a little see-through. B: a lower front that rolls faster, its tongues leaning hard back toward the hall, and burning ground behind it you can see the scorch through. C: A with a white-gold needle-bright line running ahead of the flames on the ground, a white-hot foot, and sparks lifting off the front.",
    ...CELL, today, A: optA, B: optB, C: optC },
];
