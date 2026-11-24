// Effects concepts, Round 20: the burning logs (row logs20). See art/briefs/fx-round20.md. Owned by artist 2.
// TODAY is the game's own painter (src/render/logs.js drawLog, called for real). A, B and C call the same drawLog with
// `burn` off, so the barrel, its roll, the dust, the keg's char stripe, fuse and rising embers stay exactly the game's,
// and only the FLAMES are redrawn, in Dragonbreath's look (src/render/flames.js drawBreath, concept/fx-r18-burn.js
// tongue): one dense mottled mass of gold / orange / deep orange / red-orange clusters stretched along the flame's motion,
// a broken pale core, a darker red 1-px rim (#8a2028 at the root), white-hot where it is born, ragged licks, sparks that
// lift, no smoke, stepped see-through where it thins.
// Motion: a rolling log drags its fire BACK along the road and up, so every flame here streams along d = back + up (from
// the log's heading `a`), curling upward at the tip. The painters are generic in `a`: in the game they would bake per
// heading bucket (as Dragonbreath bakes per aim), per kind (log / keg) and per step of a 16-step loop, anchored on the
// barrel's top ridge (the line today's flames stand on: logs.js ps 0.35), and be stamped with one drawImage.
// The C embers are laid down by distance rolled (as today's flying bits), so they hang in the air behind the log.
// The cell: two road strips with a burning log and a Powder Keg rolling left (down the road, toward the foes) at board
// size, then both enlarged x2 in an inset strip below (the camera following each). In the game only the Powder Keg Run
// burns (logBurn); the burning plain log is shown because logs.js paints `burn` on any barrel.
const BR = typeof document !== "undefined";
const G = BR ? { ...(await import("/src/render/logs.js")) } : {};

const TAU = Math.PI * 2, LOOP = 16, DT = 0.044;                 // 16 frames, 44 ms of game time a frame (the viewer plays 110 ms)
const BFIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // Dragonbreath's tones
const INK = "#8a2028";
const RANK = { [BFIRE[0]]: 0, [BFIRE[1]]: 1, [BFIRE[2]]: 2, [BFIRE[3]]: 3, [BFIRE[4]]: 4, [INK]: 5, [BFIRE[5]]: 5 };
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const per = (i, n) => ((i % n) + n) % n;
const fr1 = (v) => v - Math.floor(v);
const cell = (a, b, n) => H(per(a, n), b);                     // hashed cells, periodic (the loop closes)
const sm = (u) => u * u * (3 - 2 * u);
const ring1 = (n, pos, seed) => { const k = Math.floor(pos), f = pos - k; const a = H(per(k, n), seed), b = H(per(k + 1, n), seed); return a + (b - a) * sm(f); };
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const px = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };

// ---- the barrel's geometry, copied from logs.js drawLog (world units), for the flame roots and the fuse tip ----
const K = 0.55, snap = (v) => Math.round(v * 2) / 2;
const geom = (lg) => {
  const drum = !!lg.stun, keg = !drum && !!lg.blast, R = drum ? 7.5 : keg ? 7.2 : 6.6;
  const a = lg.a, ca = Math.cos(a), sa = Math.sin(a), ux = -sa, uy = ca, vx = -ca, vy = -sa;
  const ue = Math.abs(uy) >= 0.35 ? uy : uy >= 0 ? 0.35 : -0.35, sg = ue > 0 ? 1 : -1;
  const L = lg.w - 1 - K * R * Math.abs(ue), hl = L / 2;
  const dl = Math.atan2(K * vy, 1), M = Math.hypot(1, K * vy), cy = -K * R * vy;
  const X = snap(lg.x), Y = snap(lg.y);
  const toW = (lx, ly) => [X + ux * lx + vx * ly, Y + uy * lx + vy * ly];
  const xo0 = (ps) => -K * (R + R * Math.cos(ps)) * ue, yOf0 = (ps) => cy + R * M * Math.sin(ps - dl);
  // the ridge today's flames stand on (ps 0.35), from end to end, in art px
  const ridge = (lx) => { const [x, y] = toW(lx + xo0(0.35), yOf0(0.35)); return [x * 2, y * 2]; };
  const P0 = ridge(-0.42 * L), P1 = ridge(0.42 * L);
  // the fuse's tip (logs.js: the bung, out along the barrel, curling up)
  const [bx, by] = toW(sg * hl - K * R * ue, cy), ox = ux * sg, oy = uy * sg;
  const tip = [(bx + ox * 2.3) * 2, (by + oy * 2.3 - 5) * 2];
  // the stream: back along the road and up (screen), unit; n = its perpendicular on the upper side
  let dx = vx * 1.0, dy = vy * 1.0 - 0.6; const dn = Math.hypot(dx, dy); dx /= dn; dy /= dn;
  let nx = -dy, ny = dx; if (ny > 0) { nx = -nx; ny = -ny; }
  return { keg, R, ca, sa, vx, vy, P0, P1, tip, d: [dx, dy], n: [nx, ny], X2: X * 2, Y2: Y * 2, L };
};

// ---- a flame buffer: the hottest pixel wins, so overlapping tongues merge into one mass (rims inside a body vanish) ----
const buf = () => new Map();
const putB = (B, x, y, col, a = 1) => {
  x = Math.floor(x); y = Math.floor(y); const k = x * 8192 + y, r = RANK[col] ?? 3, o = B.get(k);
  if (o && (o.r < r || (o.r === r && o.a >= a))) return;
  B.set(k, { x, y, col, a, r });
};
const flush = (c, B) => { for (const p of B.values()) px(c, p.x, p.y, p.col, p.a); };

// ---- a Dragonbreath tongue along any axis -----------------------------------------------------------------------------------
// From root (rx, ry) along unit d for h px, half-width w at the root, its centre curling toward n (up) by curl x t^2 x h.
// Cells 2 px long along d and 1 across (and 4 x 2), flowing out from the root 2 px a step, periodic over LOOP.
// o: seed, sway, curl, hot (extra heat), see (stepped see-through tip), lift (rows cut from the root: a lick letting go).
const tongue = (B, rx, ry, g, h, w, f, o = {}) => {
  const [dx, dy] = g.d, [nx, ny] = g.n, sd = o.seed || 0, sway = o.sway ?? 0.8, curl = o.curl ?? 0.32, hot = o.hot || 0, lift = o.lift || 0;
  const ex = rx + dx * h + nx * curl * h, ey = ry + dy * h + ny * curl * h, pad = w + 3;
  const x0 = Math.floor(Math.min(rx, ex) - pad), x1 = Math.ceil(Math.max(rx, ex) + pad), y0 = Math.floor(Math.min(ry, ey) - pad), y1 = Math.ceil(Math.max(ry, ey) + pad);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const qx = X + 0.5 - rx, qy = Y + 0.5 - ry, s = qx * dx + qy * dy;
    if (s < -w * 0.7 || s > h + 0.5 || s < lift) continue;
    const t = cl(s / h);
    const qc = qx * nx + qy * ny - curl * t * t * h - Math.sin((TAU * 2 * f) / LOOP + sd + t * 3) * sway * t * (1 + h / 14);
    // a full body: rounded at the root, widest a fifth along, drawn to a ragged point
    let hw = w * (t < 0.2 ? 0.72 + 1.4 * t : Math.pow((1 - t) / 0.8, 1.05));
    if (s < 0) hw = w * 0.72 * Math.sqrt(Math.max(0, 1 - (s / (w * 0.7)) ** 2));
    const side = qc < 0 ? 0 : 1, j = Math.floor(s);
    const rag = cell(Math.floor((j - 2 * f) / 2), sd * 13 + side * 7 + 3, 16);
    const e = hw * (1 + (0.12 + 0.6 * t) * (rag * rag * 1.8 - 0.5)) + 0.35;
    if (Math.abs(qc) > e) continue;
    const q = Math.abs(qc) / Math.max(0.6, e);
    const m1 = cell(Math.floor((j - 2 * f) / 2), Math.floor(qc) + sd * 31 + 50, 16), m2 = cell(Math.floor((j - 2 * f) / 4), Math.floor(qc / 2) + sd * 17 + 90, 8);
    const mot = m1 * 0.6 + m2 * 0.4;
    const hh = (1 - q) * 0.4 + (1 - t) * 0.36 + (mot - 0.5) * 0.75 + hot - 0.05;
    let col = hh > 0.95 ? BFIRE[0] : hh > 0.76 ? BFIRE[1] : hh > 0.54 ? BFIRE[2] : hh > 0.34 ? BFIRE[3] : BFIRE[4];
    if (Math.abs(qc) < 0.8 && t < 0.55 && mot > 0.55 && hw > 1.4) col = t < 0.22 ? BFIRE[0] : BFIRE[1];     // the broken pale core
    const rim = Math.abs(qc) > e - 1 || s > h - 0.5;
    if (rim) col = hw < 1.3 ? BFIRE[3] : t < 0.22 ? INK : BFIRE[4];
    else if (Math.abs(qc) > e - 2 && t > 0.45 && bay(X + 64, Y + 64) < 0.5) col = BFIRE[3];
    if (s < 0.8 && !rim && hot > 0.1 && mot > 0.4) col = BFIRE[0];                                                         // white-hot where it is born
    let a = 1;
    if (o.see && t > 0.5) { const eq = Math.min(2, Math.floor(((t - 0.5) / 0.5) * 2 + bay(X + 64, Y + 64))); a = rim ? 0.9 : [1, 0.8, 0.6][eq]; }
    putB(B, X, Y, col, a);
  }
};
// a ragged lick torn off a tip: a short sliver drifting on along the stream and up, cooling as it goes
const sliver = (B, x, y, g, len, age, a0 = 0.9) => {
  const [dx, dy] = g.d;
  for (let j = 0; j < len; j++) putB(B, x + dx * j * 0.8, y + dy * j * 0.8 - j * 0.5, j === 0 ? BFIRE[Math.min(4, 2 + age)] : BFIRE[Math.min(4, 3 + (age >> 1))], a0 * (1 - j * 0.15));
};
const spark = (c, x, y, q, trail, tx = 0.7, ty = 1) => {
  px(c, x, y, q < 0.3 ? BFIRE[0] : q < 0.6 ? BFIRE[1] : q < 0.85 ? BFIRE[2] : BFIRE[4]);
  if (trail && q < 0.75) px(c, x + tx, y + ty, q < 0.35 ? BFIRE[2] : BFIRE[3], 0.7);
};
const along = (g, u) => [g.P0[0] + (g.P1[0] - g.P0[0]) * u, g.P0[1] + (g.P1[1] - g.P0[1]) * u];

// ---- A (and C's flames): today's flames, two on a log and three on a keg, each a little cluster of mottled tongues ----------
const flamesA = (B, g, f, opt) => {
  const n = g.keg ? 3 : 2, S = g.keg ? 1.12 : 1;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const [rx, ry] = along(g, u + Math.sin((TAU * f) / LOOP + i * 2.1) * 0.03);
    const br = 1 + 0.16 * Math.sin((TAU * f) / LOOP + i * 2.3) + 0.08 * Math.sin((TAU * 3 * f) / LOOP + i);
    const h = Math.round(20 * S * br), w = 3.9 * S;
    const hot = opt === "C" ? 0.16 : 0.06;
    // a smaller tongue beside it, out of phase, so the pair reads as one mass
    const [bx, by] = along(g, u + 0.11);
    tongue(B, Math.round(bx), Math.round(by), g, Math.round(h * (0.62 + 0.1 * Math.sin((TAU * f) / LOOP + i * 4))), w * 0.72, f, { seed: i + 40, curl: 0.42 });
    tongue(B, Math.round(rx), Math.round(ry), g, h, w, f, { seed: i + 1, hot, see: true });
    // every eight steps a ragged lick tears off the tip and drifts back, cooling
    const age = per(f + i * 3, 8);
    if (age < 4) { const tx = rx + g.d[0] * (h + 2 + age * 2) + g.n[0] * 0.4 * h, ty = ry + g.d[1] * (h + 2 + age * 2) + g.n[1] * 0.4 * h - age; sliver(B, tx, ty, g, 3 - (age >> 1), age, 0.85 - age * 0.12); }
  }
};

// ---- B: one continuous sheet along the top of the log, broken into licks at its trailing edge, see-through there ----------
const flamesB = (B, g, f) => {
  const [dx, dy] = g.d, [nx, ny] = g.n, [ax, ay] = g.P0, Ex = g.P1[0] - ax, Ey = g.P1[1] - ay;
  const det = Ex * dy - Ey * dx, Lr = Math.hypot(Ex, Ey), Lb = g.keg ? 23 : 21, lobes = g.keg ? 4 : 3, curl = 0.3;
  const reach = Lb * 1.5 + 4;
  const xs = [ax, ax + Ex, ax + dx * reach + nx * reach * 0.4, ax + Ex + dx * reach + nx * reach * 0.4], ys = [ay, ay + Ey, ay + dy * reach + ny * reach * 0.4, ay + Ey + dy * reach + ny * reach * 0.4];
  const x0 = Math.floor(Math.min(...xs) - 4), x1 = Math.ceil(Math.max(...xs) + 4), y0 = Math.floor(Math.min(...ys) - 4), y1 = Math.ceil(Math.max(...ys) + 4);
  const ph = (TAU * f) / LOOP;
  const lenAt = (u) => {
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * cl(u, 0, 1))), 0.45);
    const lobe = Math.pow(Math.abs(Math.sin(Math.PI * (u * lobes + 0.15 * Math.sin(ph + u * 5)))), 0.7);
    const flick = ring1(LOOP, f + u * 9, 77) * 0.35 + 0.15 * Math.sin(ph * 2 + u * 11);
    return Lb * (0.35 + 0.75 * env) * (0.45 + 0.55 * lobe + flick);
  };
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    let rx = X + 0.5 - ax, ry = Y + 0.5 - ay;
    let u = (rx * dy - ry * dx) / det, s = (Ex * ry - Ey * rx) / det;
    if (u < -0.08 || u > 1.08 || s < -2 || s > reach) continue;
    // the curl: the far part of the sheet rises; solve once more with the centre shifted up
    let Ls = Math.max(3, lenAt(u)), t = cl(s / Ls);
    rx -= nx * curl * t * t * Ls; ry -= ny * curl * t * t * Ls;
    u = (rx * dy - ry * dx) / det; s = (Ex * ry - Ey * rx) / det;
    if (u < -0.08 || u > 1.08 || s < -2) continue;
    Ls = Math.max(3, lenAt(u)); t = s / Ls;
    // the ends of the ridge round off; ragged tips, 1-2 px bands along the ridge
    const ul = u * Lr, endIn = Math.min(ul, Lr - ul);
    if (endIn < -1.5 + Math.max(0, -s) * 0.5) continue;
    const j = Math.floor(s), band = Math.floor(ul / 3);
    const rag = cell(Math.floor((j - 2 * f) / 2) + band * 3, 23, 16);
    const tipT = 1 + (rag - 0.5) * 0.3;
    if (t > tipT || (s < 0 && endIn < 1)) continue;
    const lq = Math.abs(fr1(u * lobes + 0.15 * Math.sin(ph + u * 5)) - 0.5) * 2;     // 0 in a lick's middle, 1 between licks
    const m1 = cell(Math.floor((j - 2 * f) / 2), Math.floor(ul / 2) + 50, 16), m2 = cell(Math.floor((j - 2 * f) / 4), Math.floor(ul / 3) + 90, 8);
    const mot = m1 * 0.6 + m2 * 0.4;
    const hh = (1 - lq) * 0.18 + (1 - t) * 0.46 + (mot - 0.5) * 0.8 + 0.02;
    let col = hh > 0.95 ? BFIRE[0] : hh > 0.76 ? BFIRE[1] : hh > 0.54 ? BFIRE[2] : hh > 0.34 ? BFIRE[3] : BFIRE[4];
    if (s < 0.6) { if (s < -0.6 && mot < 0.5) continue; col = mot > 0.7 ? BFIRE[0] : mot > 0.35 ? BFIRE[1] : BFIRE[2]; }                               // the born line along the ridge, white-hot and gold
    const rim = t > tipT - 1.2 / Ls || endIn < 0;
    if (rim) col = t < 0.25 ? INK : Ls < 6 ? BFIRE[3] : BFIRE[4];
    let a = 1;
    if (t > 0.45) { const eq = Math.min(2, Math.floor(((t - 0.45) / 0.55) * 2.4 + bay(X + 64, Y + 64))); a = rim ? 0.85 : [1, 0.8, 0.6][eq]; }
    putB(B, X, Y, col, a);
  }
  // licks torn off the longest tips, drifting on and cooling
  for (let i = 0; i < lobes; i++) {
    const age = per(f + i * 5, 8); if (age >= 4) continue;
    const u = (i + 0.5) / lobes, [rx, ry] = along(g, u), Ls = lenAt(u) * 1.1;
    const tx = rx + dx * (Ls + age * 2) + nx * curl * Ls, ty = ry + dy * (Ls + age * 2) + ny * curl * Ls - age;
    sliver(B, tx, ty, g, 3 - (age >> 1), age, 0.8 - age * 0.12);
  }
};

// ---- the sparks: A and B a few lifting off the flames; C many, thrown off behind, laid by distance rolled ------------------
const sparksFew = (c, g, f) => {
  for (let k = 0; k < 3; k++) {
    const q = fr1(f / LOOP + k / 3), [rx, ry] = along(g, 0.2 + 0.6 * H(k, 4));
    spark(c, rx + g.d[0] * (8 + q * 22) + Math.sin(q * 6 + k) * 1.5, ry + g.d[1] * (8 + q * 22) - q * 14, q, false);
  }
};
const embersC = (c, g, lg) => {
  const dist = lg.spin / 0.09, gap = 1.5, sp = lg.speed;
  for (let k = Math.floor(dist / gap); k >= 0; k--) {
    const back = dist - k * gap, age = back / sp;                 // seconds since it was thrown
    if (age > 0.42) break;
    if (age < 0.015) continue;
    const h = H(k * 3.7, lg.id), u = 0.08 + 0.84 * h, [rx, ry] = along(g, u);
    const q = age / 0.42;
    // thrown off the flames: left behind on the road (world-fixed, `back`), carried on a little, rising, with a wobble
    const drift = 6 + 26 * H(k, 2) * Math.sqrt(q), rise = 6 + 40 * q * (0.6 + 0.6 * H(k, 5)) - 22 * q * q * (H(k, 8) > 0.7 ? 1 : 0);
    const x = rx - g.ca * back * 2 + g.d[0] * drift + Math.sin(age * 30 + k) * 1.2, y = ry - g.sa * back * 2 + g.d[1] * drift * 0.4 - rise;
    if (H(k, 9) < 0.18 && per(k + Math.floor(age * 60), 3) === 0) continue;       // a few twinkle
    const big = H(k, 6) > 0.6, qq = 0.25 + q * 0.75;               // born gold, not white: it must read on a pale road
    spark(c, x, y, qq, big, -g.d[0] * 0.8 + 0.2, 1);
    if (big && q < 0.5) px(c, x + 1, y, BFIRE[3], 0.9);
  }
};
// C: the keg's fuse a white-hot spitting point (over today's tip, which stays underneath)
const fuseC = (c, g, f, time) => {
  const [tx, ty] = [Math.round(g.tip[0]), Math.round(g.tip[1])];
  const pulse = per(f, 4) < 2;
  const rr = pulse ? 3 : 2;
  for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) { const r = Math.abs(xx) + Math.abs(yy); if (r > rr || r === 0) continue; if (r === rr && bay(xx + 8, yy + 8) > 0.5) continue; px(c, tx + xx, ty + yy, r === 1 ? BFIRE[0] : r === 2 ? BFIRE[1] : BFIRE[3], r === 1 ? 1 : r === 2 ? 0.9 : 0.6); }
  px(c, tx, ty, "#ffffff"); px(c, tx, ty - 1, "#ffffff"); if (pulse) { px(c, tx + 1, ty, "#ffffff"); px(c, tx - 1, ty - 1, BFIRE[0]); }
  // spits: short white streaks flung out and falling, a new pair each step
  for (let k = 0; k < 7; k++) {
    const life = 5, age = per(f + k * 3, life), seed = Math.floor((f + k * 3) / life) * 7 + k;
    const ang = -Math.PI / 2 + (H(seed, 3) - 0.5) * 3.2, v = 2.4 + H(seed, 5) * 2;
    const d = 1.5 + age * v, sx = tx + Math.cos(ang) * d, sy = ty + Math.sin(ang) * d + age * age * 0.6;
    const col = age === 0 ? "#ffffff" : age === 1 ? BFIRE[0] : age === 2 ? BFIRE[1] : age === 3 ? BFIRE[2] : BFIRE[3];
    px(c, sx, sy, col); if (age < 3) px(c, sx - Math.cos(ang), sy - Math.sin(ang), age < 1 ? BFIRE[0] : BFIRE[2], 0.85);
  }
};

// ---- the scene ---------------------------------------------------------------------------------------------------------------
const CW = 400, CH = 340;
const ROADS = [[40, "log"], [114, "keg"]];          // road centre rows (art px)
const road = (c, yc, dark) => {
  const T = dark ? ["#2e271f", "#3a3127", "#443a2e", "#4e4335", "#584b3c"] : ["#8a6a48", "#a07c54", "#b48e62", "#c4a072", "#d2b084"];
  for (let y = yc - 34; y <= yc + 34; y++) for (let x = 0; x < CW; x++) {
    const edge = 31 + Math.round((H(Math.floor(x / 3), yc + (y < yc ? 1 : 2)) - 0.5) * 3);
    const dy = Math.abs(y - yc); if (dy > edge) continue;
    const n = H(Math.floor(x / 2) * 1.7, Math.floor(y / 2) * 2.3) * 0.6 + H(x * 0.9, y * 1.3) * 0.4;
    let k = dy > edge - 1 ? 0 : dy > edge - 3 ? 1 : n > 0.82 ? 3 : n < 0.14 ? 1 : 2;
    if (dy < 8 && n > 0.6) k = 3; if (n > 0.965) k = 4;
    c.fillStyle = T[k]; c.fillRect(x, y, 1, 1);
  }
};
const logOf = (kind, x, f) => {
  const keg = kind === "keg", sp = keg ? 132 : 118, d = (f + 3) * DT * sp;
  return { id: keg ? 7 : 3, a: Math.PI, w: keg ? 24 : 22, speed: sp, spin: d * 0.09, x, y: 0, burn: 10, blast: keg ? 48 : 0, stun: 0, _d: d };
};
const paint = (c, lg, f, opt, time) => {
  const on = { ...lg, burn: opt === "today" ? lg.burn : 0 };
  c.save(); c.scale(2, 2); G.drawLog(c, on, time); c.restore();
  if (opt === "today") return;
  const g = geom(lg), B = buf();
  if (opt === "B") flamesB(B, g, f); else flamesA(B, g, f, opt);
  flush(c, B);
  if (opt === "C") { embersC(c, g, lg); if (g.keg) fuseC(c, g, f, time); } else sparksFew(c, g, f);
};
const scene = (opt) => (c, e) => {
  const f = e.i, time = 3 + f * DT;
  // board size: each rolls left along its road strip, the camera still
  for (const [yc, kind] of ROADS) {
    road(c, yc, e.ground === "dark");
    const lg0 = logOf(kind, 0, f), x = (kind === "keg" ? 178 : 168) - lg0._d * 1;       // world units: starts at the right, rolls left
    const lg = { ...logOf(kind, x, f), y: (yc + 8) / 2 };
    paint(c, lg, f, opt, time);
  }
  // the inset: each enlarged x2 (nearest neighbour), the camera following it
  const top = 152;
  c.fillStyle = "rgba(20,23,29,0.55)"; c.fillRect(0, top - 2, CW, 2);
  [["log", 0], ["keg", 200]].forEach(([kind, ox]) => {
    const ow = 100, oh = 92, off = mk(ow, oh), o = off.getContext("2d");
    o.fillStyle = e.ground === "dark" ? "#3c4535" : "#7eab54"; o.fillRect(0, 0, ow, oh);
    road(o, 60, e.ground === "dark");
    const lg = { ...logOf(kind, 19, f), y: 33 };
    paint(o, lg, f, opt, time);
    c.save(); c.imageSmoothingEnabled = false; c.drawImage(off, ox, top, ow * 2, oh * 2); c.restore();
    if (ox) { c.fillStyle = "rgba(20,23,29,0.55)"; c.fillRect(ox - 1, top, 2, CH - top); }
  });
};

export const ROWS = [{
  id: "logs20", label: "The burning logs (round 20)", group: "Round 20", cw: CW, ch: CH, ax: 0, ay: 0, N: LOOP,
  note: "A burning log (top road) and the Powder Keg (second road) rolling left down the road at board size, then both enlarged twice below. Every option keeps today's barrel, roll, dust, the keg's fuse and its rising embers exactly, and redraws only the flames in Dragonbreath's look, with no smoke; the flames are dragged back along the road and curl up at the tips, as fire on something rolling fast would be. A: today's flames (two on a log, three on the keg) as mottled tongues streaming back: gold, orange and red clusters, a pale core, a dark red edge, ragged bits tearing off the tips. B: one sheet of flame along the whole top of the barrel, white-hot where it starts, breaking into licks at its trailing edge, where it goes see-through. C: A plus a stream of embers and sparks thrown off behind, hanging in the air over the road, and the keg's fuse a white-hot point spitting sparks.",
  today: scene("today"), A: scene("A"), B: scene("B"), C: scene("C"),
}];
