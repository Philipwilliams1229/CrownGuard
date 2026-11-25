// ============ THE LOG ROLLER'S LOGS ============
// Drawn by draw.js for every rolling log in g.logs (engine: update.js).
//
// A log is a real cylinder seen through the board's 3/4 camera: a unit of
// height lifts K units up the screen, so the barrel's cross-section projects
// to an ellipse, its top and its south face show, and the cut end that faces
// south shows as a disc of growth rings. It is painted ROW BY ROW in its own
// frame (x along the barrel, y the way it rolls back): for every art-pixel row
// the front surface angle is solved exactly, then lit from the upper left in
// WORLD space (so the light never turns with the log) and stepped into a few
// tones. Everything on the surface (bark furrows, knots, bands, rivets, staves,
// the char stripe, the cracks on the cut end) sits at a fixed MATERIAL angle
// and turns with `spin`, so it visibly rolls. Dust, chips and embers are laid
// down by distance rolled, so they stay put on the road behind it.
// Cost: ~60-250 fillRects per log; only a few logs are ever alive.
//
// The barrel is solved in its own frame onto a small offscreen picture at one art pixel a pixel,
// which is then resampled into WORLD-aligned art pixels (no rotated, half-blended pixels), given a
// one-pixel outline TINTED from the colour it borders (not a fat black line), and a hard
// stepped shadow.

const INK = "#241a26";
const K = 0.55;                                     // screen lift per unit of height
const LX = -0.45, LY = -0.55, LZ = 0.70;            // toward the sun: upper left, high
const TAU = Math.PI * 2;
const snap = (v) => Math.round(v * 2) / 2;          // one art pixel = half a world unit
const frac = (v) => v - Math.floor(v);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

// ramps run deep (the underside by the road) -> dk -> md -> lt; hi is the glint
const LOG = {
  ramp: ["#3a2430", "#5a3a26", "#7a5334", "#9c6d43"], hi: "#d6a46a", furrow: "#33211c", ridge: "#b07e4e",
  knot: "#2e1c18", stub: "#d9b680", rim: "#4a2e20", sap: ["#e6c690", "#c49c68"], ring: ["#c09058", "#9a7044"], heart: "#7a4e2c", crack: "#4a2c1c",
  dust: "210,188,146", chip: ["#5a3a26", "#9c6d43", "#d9b680"],
};
const DRUM = {
  ramp: ["#1c1c26", "#353945", "#555b69", "#7e8594"], hi: "#dfe3ea", seam: "#20212a",
  band: ["#2a2c36", "#4a4f5c", "#6c7282", "#9aa1b0"], rivet: "#e8ecf2",
  plate: ["#7e8594", "#5a606e"], rim: "#2a2c36", bolt: "#c4c8d0", hub: ["#9aa1b0", "#6c7282"],
  dust: "196,176,138", chip: ["#f8d868", "#fff3d2", "#8a909c"],
};
const KEG = {
  ramp: ["#34201c", "#5c3620", "#83522e", "#a8703e"], hi: "#dca468", seam: "#2e1a16",
  hoop: ["#4a1c1e", "#7a2a28", "#a8403a", "#d06a5c"], char: ["#161218", "#231c20", "#302628", "#3e3230"],
  rim: "#3a2218", head: ["#d0a66e", "#a88050"], board: "#6a4428",
  dust: "120,108,104", chip: ["#fff3d2", "#f8d868", "#f09838"],
};

// ---- the new look: resample the unturned barrel into world-aligned art pixels ----
let OFF = null, OFFC = null, OUT = null, OUTC = null;
const INKRGB = [36, 26, 38];
const roundBox = (lx, ly, hx, hy, r) => {
  const qx = Math.abs(lx) - (hx - r), qy = Math.abs(ly) - (hy - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
function composeNew(ctx, B, OS, X, Y, EXT, a, L, hl, R, drum, ue) {
  const src = B.getImageData(0, 0, OS, OS).data;
  const N = EXT * 4;                                  // the world bitmap: 2 pixels a unit, EXT each side
  if (!OUT || OUT.width < N) { OUT = document.createElement("canvas"); OUT.width = OUT.height = Math.max(N, 96); OUTC = OUT.getContext("2d"); }
  const img = OUTC.createImageData(N, N), d = img.data;
  const th = a + Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
  const mask = new Uint8Array(N * N);
  const half = OS / 2;
  for (let j = 0; j < N; j++) {
    const dy = (j + 0.5) / 2 - EXT;
    for (let i = 0; i < N; i++) {
      const dx = (i + 0.5) / 2 - EXT;
      const lx = dx * c + dy * s, ly = -dx * s + dy * c;
      const u = Math.floor(lx * 2 + half), v = Math.floor(ly * 2 + half);
      const o = (j * N + i) * 4;
      if (u >= 0 && v >= 0 && u < OS && v < OS) {
        const k = (v * OS + u) * 4;
        if (src[k + 3] > 128) { d[o] = src[k]; d[o + 1] = src[k + 1]; d[o + 2] = src[k + 2]; d[o + 3] = 255; mask[j * N + i] = 1; continue; }
      }
      // not the barrel: its shadow, two stepped tones thrown down and to the right
      const sx = dx - 1.5, sy = dy - 2;
      const lx2 = sx * c + sy * s, ly2 = -sx * s + sy * c;
      let al = 0;
      if (roundBox(lx2, ly2, hl + 2, R * 0.95, R * 0.8) <= 0) al += 0.16;
      if (roundBox(lx2, ly2, hl + 0.5, R * 0.6, R * 0.5) <= 0) al += drum ? 0.3 : 0.22;
      if (al > 0) { d[o] = INKRGB[0]; d[o + 1] = INKRGB[1]; d[o + 2] = INKRGB[2]; d[o + 3] = Math.round(al * 255); }
    }
  }
  // the one-pixel line, tinted from the body it borders: half its colour, half the ink
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (mask[j * N + i]) continue;
    let nb = -1;
    if (i > 0 && mask[j * N + i - 1]) nb = (j * N + i - 1) * 4;
    else if (j > 0 && mask[(j - 1) * N + i]) nb = ((j - 1) * N + i) * 4;
    else if (i < N - 1 && mask[j * N + i + 1]) nb = (j * N + i + 1) * 4;
    else if (j < N - 1 && mask[(j + 1) * N + i]) nb = ((j + 1) * N + i) * 4;
    if (nb < 0) continue;
    const o = (j * N + i) * 4;
    d[o] = d[nb] * 0.42 + INKRGB[0] * 0.58; d[o + 1] = d[nb + 1] * 0.42 + INKRGB[1] * 0.58; d[o + 2] = d[nb + 2] * 0.42 + INKRGB[2] * 0.58; d[o + 3] = 255;
  }
  OUTC.putImageData(img, 0, 0);
  ctx.drawImage(OUT, 0, 0, N, N, X - EXT, Y - EXT, N / 2, N / 2);
}

export const drawLog = (ctx, lg, time) => {
  const drum = !!lg.stun, keg = !drum && !!lg.blast;
  const P = drum ? DRUM : keg ? KEG : LOG;
  const R = drum ? 7.5 : keg ? 7.2 : 6.6;           // radius (the keg's is its bulge)
  const id = lg.id || 0;
  // a burning barrel turns to its heading bucket (BURN_NB a turn, under 3 degrees off), so its baked fire fits its outline
  const sil = !!lg._sil, burning = !!lg.burn && !sil;
  const a = burning ? bucketA(lg.a) : lg.a, ca = Math.cos(a), sa = Math.sin(a);
  // local x runs along the barrel (world u), local y points backward (world v)
  const ux = -sa, uy = ca, vx = -ca, vy = -sa;
  // how far the barrel's end turns toward the camera. A log rolling straight up
  // or down the screen would show its ends edge-on; nudge it so a sliver of
  // cut face always shows.
  const ue = Math.abs(uy) >= 0.35 ? uy : uy >= 0 ? 0.35 : -0.35;
  const sg = ue > 0 ? 1 : -1;                        // the end whose cut face we see
  const L = lg.w - 1 - K * R * Math.abs(ue);         // barrel length: drawn span stays ~ lg.w
  const hl = L / 2;
  const vL = vx * LX + vy * LY;                      // the sun, across the barrel
  const dl = Math.atan2(K * vy, 1), M = Math.hypot(1, K * vy);
  const cy = -K * R * vy;                            // the axle's row on screen
  const spinA = lg.spin / (0.09 * R);                // rolled without slipping
  const X = snap(lg.x), Y = snap(lg.y);
  const sp = lg.speed || 118, dist = lg.spin / 0.09;

  // ---- on the road: the dust it leaves behind (the shadow is hard-stepped, in composeNew) ----
  const W = (lx, back, lift) => [X + ux * lx - ca * back, Y + uy * lx - sa * back - lift];
  const dot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(snap(x), snap(y), w, h); };
  if (!sil) {
    const gap = drum ? 4 : 6, life = keg ? 34 : 40;
    for (let k = Math.floor(dist / gap); k >= 0 && dist - k * gap < life; k--) {
      const back = dist - k * gap, age = back / life;
      if (back < R * 0.6) continue;                   // still under the barrel
      const h = hash(k * 3.1 + id * 7.3);
      const [wx, wy] = W((h - 0.5) * (L + 2), back, age * (keg ? 7 : 2.5));
      const s = snap(1 + age * (keg ? 3 : 2.5)), al = (keg ? 0.5 : drum ? 0.5 : 0.42) * (1 - age);
      ctx.fillStyle = `rgba(${P.dust},${al.toFixed(3)})`;
      // a little rounded blob: narrow cap, wide middle, a shade narrower foot
      const hh = snap(s * 0.5);
      ctx.fillRect(snap(wx - s * 0.5), snap(wy - hh - 0.5), s, 0.5);
      ctx.fillRect(snap(wx - s), snap(wy - hh), s * 2, hh);
      ctx.fillRect(snap(wx - s * 0.75), snap(wy), snap(s * 1.5), 0.5);
    }
  }

  // ---- the barrel, in its own frame ----
  // painted unturned onto a small offscreen picture (2 pixels to the unit), resampled below.
  const EXT = Math.ceil(hl + R + K * R + 6), OS = EXT * 4;       // offscreen side in pixels
  if (!OFF || OFF.width < OS) { OFF = document.createElement("canvas"); OFF.width = OFF.height = Math.max(OS, 96); OFFC = OFF.getContext("2d", { willReadFrequently: true }); }
  const B = OFFC;
  B.setTransform(1, 0, 0, 1, 0, 0); B.clearRect(0, 0, OFF.width, OFF.height);
  B.setTransform(2, 0, 0, 2, OS / 2, OS / 2);
  const rr = (x0, x1, y, c) => { const p = snap(x0), q = snap(x1); if (q > p) { B.fillStyle = c; B.fillRect(p, y, q - p, 0.5); } };
  const xo = (rho, ps) => -K * (R + rho * Math.cos(ps)) * ue;     // shear: height leans along the barrel
  const yOf = (rho, ps) => cy + rho * M * Math.sin(ps - dl);
  const front = (ps) => Math.cos(ps - dl);                         // > 0 on the side we see
  const wrap = (ps) => ps - TAU * Math.floor((ps - dl + Math.PI) / TAU);
  // walk the rows of a disc/cylinder of radius rho: fn(y, front angle, back angle)
  const rows = (rho, pad, fn) => {
    const A = rho * M;
    for (let y = Math.floor((cy - A - pad) * 2) / 2; y < cy + A + pad; y += 0.5) {
      const s = Math.max(-1, Math.min(1, (y + 0.25 - cy) / A)), as = Math.asin(s);
      fn(y, dl + as, dl + Math.PI - as);
    }
  };
  // the barrel as slices along its length (the keg bulges: narrower ends)
  const segs = keg ? [[-hl, -hl / 3, R * 0.93], [-hl / 3, hl / 3, R], [hl / 3, hl, R * 0.93]] : [[-hl, hl, R]];
  const endR = segs[sg > 0 ? segs.length - 1 : 0][2];
  const tone = (ps) => {
    // lambert from the sun, and the last sliver down by the road in deep shade
    const b = Math.cos(ps) * LZ + Math.sin(ps) * vL, z = (1 + Math.cos(ps)) * 0.5;
    return z < 0.2 ? 0 : b > 0.5 ? 3 : b > 0.1 ? 2 : 1;
  };
  const psHi = Math.atan2(vL, LZ);                  // where the sun glints
  // 2. the round of the barrel, row by row
  const charA = 1.9;                                  // the keg's scorched stripe (material angle)
  for (const [x0, x1, rho] of segs) {
    rows(rho, 0, (y, pf) => {
      const o = xo(rho, pf), t = tone(pf);
      const th = wrap(pf + spinA);
      const charred = keg && Math.abs(((th - charA) % TAU + TAU + Math.PI) % TAU - Math.PI) < 0.4;
      rr(x0 + o, x1 + o, y, charred ? P.char[t] : P.ramp[t]);
      if (Math.abs(pf - psHi) < 0.13 && !charred) {
        // the glint along the top, broken where the bark or the hoops break it
        if (drum) rr(x0 + o + 0.5, x1 + o - 0.5, y, P.hi);
        else for (let i = 0; i < 4; i++) {
          const g0 = x0 + (x1 - x0) * (i / 4) + hash(i + id) * 1.5;
          rr(g0 + o, g0 + o + (x1 - x0) * 0.16 + hash(i * 5 + id) * 1.5, y, P.hi);
        }
      }
      if (charred && t >= 1 && hash(Math.floor(y * 2) * 7 + x0 + Math.floor(time * 5)) > 0.55) {
        // embers glowing in the char's cracks
        const ex = x0 + 1 + hash(Math.floor(y * 2) + x0 * 3.7 + Math.floor(time * 3) * 13) * (x1 - x0 - 2);
        rr(ex + o, ex + o + 0.5 + (t > 1 ? 0.5 : 0), y, t > 2 ? "#f8d868" : "#e0602e");
      }
    });
  }
  // 3. what turns with the roll
  const at = (rho, th) => { const ps = wrap(th - spinA); return [ps, front(ps)]; };
  if (!drum && !keg) {
    // bark: long furrows broken along the trunk, and lopped branch stubs
    for (let k = 0; k < 11; k++) {
      const [ps, f] = at(R, k * TAU / 11 + hash(k + 40) * 0.35);
      if (f < 0.12) continue;
      const y = snap(yOf(R, ps) - 0.25), o = xo(R, ps), t = tone(ps);
      for (let j = 0; j < 3; j++) {
        const s0 = -hl + 0.5 + hash(k * 3 + j) * (L - 3), s1 = Math.min(hl - 0.5, s0 + 2 + hash(k * 5 + j + 9) * 5);
        rr(s0 + o, s1 + o, y, t >= 2 ? P.ramp[0] : P.furrow);
        if (t >= 2 && f > 0.4) rr(s0 + o + 0.5, s1 + o - 0.5, y - 0.5, t === 3 ? P.hi : P.ridge);
      }
    }
    // loose flakes of lighter bark between the furrows
    for (let k = 0; k < 14; k++) {
      const [ps, f] = at(R, hash(k * 7 + 3) * TAU);
      if (f < 0.3) continue;
      const t = tone(ps); if (t === 0) continue;
      const y = snap(yOf(R, ps) - 0.25), x = -hl + 1 + hash(k * 11 + 1) * (L - 3) + xo(R, ps);
      rr(x, x + 1 + hash(k) * 1.5, y, t === 3 ? P.hi : P.ramp[t + 1]);
    }
    for (const [th, lx, big] of [[0.4, -0.28, 1], [2.5, 0.22, 0], [4.3, -0.05, 1], [5.4, 0.36, 0]]) {
      const [ps, f] = at(R, th);
      if (f < 0.2) continue;
      const y = snap(yOf(R, ps) - 0.25), x = lx * L + xo(R, ps), wd = big ? 2.5 : 1.5;
      if (f > 0.55) {
        rr(x - wd / 2 - 0.5, x + wd / 2 + 0.5, y - 0.5, P.knot);
        rr(x - wd / 2 - 0.5, x + wd / 2 + 0.5, y, P.knot);
        rr(x - wd / 2, x + wd / 2, y - 0.5, big ? P.stub : P.ramp[1]);
        if (big) rr(x - 0.5, x + 0.5, y - 0.5, P.ring[1]);
      } else rr(x - wd / 2, x + wd / 2, y, P.knot);
    }
  } else if (drum) {
    // iron plates: seams along the drum, three raised bands, rivets riding them
    for (let k = 0; k < 5; k++) {
      const [ps, f] = at(R, k * TAU / 5 + 0.3);
      if (f < 0.1) continue;
      const y = snap(yOf(R, ps) - 0.25), o = xo(R, ps);
      rr(-hl + 2.5 + o, -1.25 + o, y, P.seam); rr(1.25 + o, hl - 2.5 + o, y, P.seam);
    }
    const bands = [-hl + 1.25, 0, hl - 1.25];
    rows(R, 0, (y, pf) => {
      const o = xo(R, pf), t = tone(pf), c = P.band[Math.min(3, t + 1)];
      for (const bx of bands) { rr(bx - 1.25 + o, bx + 1.25 + o, y, c); rr(bx + 0.75 + o, bx + 1.25 + o, y, P.band[Math.max(0, t - 1)]); }
    });
    for (let k = 0; k < 8; k++) {
      const [ps, f] = at(R, k * TAU / 8);
      if (f < 0.15) continue;
      const y = snap(yOf(R, ps) - 0.25), o = xo(R, ps);
      for (const bx of bands) { rr(bx - 0.5 + o, bx + o, y, tone(ps) >= 1 ? P.rivet : P.band[3]); rr(bx - 0.5 + o, bx + o, y + 0.5, P.seam); }
    }
  } else {
    // the keg: stave seams, and red-painted hoops over the joins and the chimes
    for (let k = 0; k < 12; k++) {
      const [ps, f] = at(R, k * TAU / 12 + 0.15);
      if (f < 0.15) continue;
      for (const [x0, x1, rho] of segs) {
        const y = snap(yOf(rho, ps) - 0.25), o = xo(rho, ps);
        rr(x0 + 0.5 + o, x1 - 0.5 + o, y, P.seam);
      }
    }
    for (const [bx, rho] of [[-hl + 1, R * 0.93], [-hl / 3, R], [hl / 3, R], [hl - 1, R * 0.93]]) {
      rows(rho, 0, (y, pf) => { const o = xo(rho, pf), t = tone(pf); rr(bx - 0.75 + o, bx + 0.75 + o, y, P.hoop[t]); });
    }
  }
  // 4. the cut end that faces the camera: rings (a boss on the drum, a head on the keg)
  const xe = sg * hl;
  const disc = (rho, c) => {
    const A = rho * M;
    for (let y = Math.floor((cy - A) * 2) / 2; y < cy + A; y += 0.5) {
      const s = (y + 0.25 - cy) / A; if (s <= -1 || s >= 1) continue;
      const as = Math.asin(s);
      const x1 = xe - K * (R + rho * Math.cos(dl + as)) * ue, x2 = xe - K * (R + rho * Math.cos(dl + Math.PI - as)) * ue;
      rr(Math.min(x1, x2), Math.max(x1, x2) + 0.5, y, c);
    }
  };
  const capPt = (rho, ph) => [xe - K * (R + rho * Math.cos(ph)) * ue, cy + rho * M * Math.sin(ph - dl)];
  const capLit = sg * (ux * LX + uy * LY) > -0.1 ? 0 : 1;   // is the cut face turned to the sun?
  if (!drum && !keg) {
    disc(endR, P.rim);
    disc(endR - 0.9, P.sap[capLit]);
    disc(endR * 0.66, P.ring[capLit]);
    disc(endR * 0.56, P.sap[capLit]);
    disc(endR * 0.32, P.ring[capLit]);
    disc(endR * 0.14, P.heart);
    // a check crack from the heart out, spinning with the log
    for (let q = 0.3; q < 0.95; q += 0.16) { const [x, y] = capPt(endR * q, 0.9 - spinA); rr(x - 0.5, x + 0.5, snap(y - 0.25), P.crack); }
  } else if (drum) {
    disc(endR, P.rim);
    disc(endR - 1, P.plate[capLit]);
    disc(endR * 0.34, P.hub[capLit]);
    disc(endR * 0.14, P.rim);
    for (let k = 0; k < 6; k++) { const [x, y] = capPt(endR * 0.68, k * TAU / 6 - spinA); rr(x - 0.25, x + 0.25, snap(y - 0.25), P.bolt); rr(x - 0.25, x + 0.25, snap(y + 0.25), P.rim); }
  } else {
    disc(endR, P.rim);
    disc(endR - 1, P.head[capLit]);
    // the head's boards, turning
    for (const off of [-0.34, 0.34]) for (let q = -0.86; q <= 0.86; q += 0.4 / endR) {
      const ph = 0.6 - spinA, A = endR * off, B = endR * q;
      // a point off the axle: across A*cos + B*sin, height -A*sin + B*cos
      const [x, y] = [xe - K * (R + (-A * Math.sin(ph) + B * Math.cos(ph))) * ue, cy + (A * Math.cos(ph) + B * Math.sin(ph)) - K * (-A * Math.sin(ph) + B * Math.cos(ph)) * vy];
      rr(x - 0.25, x + 0.25, snap(y - 0.25), P.board);
    }
    disc(endR * 0.16, P.rim);                            // the bung, where the fuse goes in
  }
  composeNew(ctx, B, OS, X, Y, EXT, a, L, hl, R, drum, ue);

  // ---- back in the world: fuse and sparks, flames, flying bits ----
  const toW = (lx, ly) => [X + ux * lx + vx * ly, Y + uy * lx + vy * ly];
  if (keg && !sil) {
    // the fuse leaves the bung and curls up and out; its tip spits sparks
    const [bx, by] = toW(xe - K * R * ue, cy);
    const ox = ux * sg, oy = uy * sg;                   // outward along the barrel
    const pts = [[0.5, 0], [1, 0.5], [1.5, 1], [2, 1.5], [2.3, 2], [2.5, 2.5], [2.6, 3], [2.5, 3.5], [2.3, 4]];
    for (const [o, up] of pts) { dot(bx + ox * o - 0.25, by + oy * o - up + 0.5, 1, 0.5, INK); dot(bx + ox * o - 0.25, by + oy * o - up, 1, 0.5, "#8a6a44"); }
    dot(bx + ox * 2.3 - 0.25, by + oy * 2.3 - 4.5, 1, 0.5, "#d0502e");
    const [tx, ty] = [bx + ox * 2.3, by + oy * 2.3 - 5];
    const fl = Math.sin(time * 31 + id) > 0;
    ctx.fillStyle = "rgba(248,200,104,0.35)"; ctx.fillRect(snap(tx - 1.5), snap(ty - 1.5), 3, 3);
    dot(tx - 0.5, ty - 0.5, 1, 1, fl ? "#fff3d2" : "#f8d868");
    for (let i = 0; i < 6; i++) {
      const ph = frac(time * 5 + i / 6 + hash(id + i)), ang = hash(i * 13 + Math.floor(time * 5 + i / 6 + hash(id + i)) * 7) * TAU;
      const d = 0.8 + ph * 3.5;
      dot(tx + Math.cos(ang) * d, ty + Math.sin(ang) * d * 0.8 + ph * ph * 2, 0.5, 0.5, ph < 0.35 ? "#fff3d2" : ph < 0.7 ? "#f8d868" : "#f09838");
    }
  }
  // flying bits, laid down by distance rolled so they hang in the air behind
  if (!sil) {
    const gap = keg ? 4 : drum ? 7 : 8, life = keg ? 0.7 : 0.24;
    for (let k = Math.floor(dist / gap); k >= 0; k--) {
      const back0 = dist - k * gap, t = back0 / sp;
      if (t > life) break;
      if (t < 0.02) continue;
      const h = hash(k * 5.7 + id), lx = (h - 0.5) * L;
      let back, lift;
      if (keg) { back = back0 + 6 * t; lift = 3 + 16 * t; }          // embers rise
      else { back = back0 + 26 * t; lift = drum ? 3 + 16 * t - 70 * t * t : 2 + 34 * t - 150 * t * t; }
      if (lift < 0) continue;
      const [wx, wy] = W(lx + (hash(k + 3) - 0.5) * 3 * t * 10, back, lift);
      const c = P.chip[Math.floor(hash(k * 2.3 + id) * 3)];
      if (keg && Math.sin(time * 20 + k) < -0.3) continue;              // embers twinkle
      dot(wx, wy, keg ? 0.5 : 1, 0.5, c);
      if (!keg && !drum && h > 0.5) dot(wx + 0.5, wy - 0.5, 0.5, 0.5, c);
    }
  }
  // the fire (Round 20 A + the burning outline of a foe on fire): one baked stamp, over everything
  if (burning) stampBurn(ctx, lg, X, Y, a, drum ? "drum" : keg ? "keg" : "log", time);
};

// flame bases need the barrel's geometry outside its frame
const xo0 = (ps, R, ue, K) => -K * (R + R * Math.cos(ps)) * ue;
const yOf0 = (ps, R, cy, M, dl) => cy + R * M * Math.sin(ps - dl);

// ============ A BURNING BARREL (Round 20 A + the burning outline, owner 2026-11-24) ============
// "Logs A ... can you also give them the glowy outline like from foes on fire?" The flames are the
// owner's pick from concept/fx-r20-logs.js (row logs20, A): today's flames (two on a log, three on a
// keg) as clusters of Dragonbreath tongues (flames.js drawBreath's look: one mottled mass of gold,
// orange and red-orange cells stretched along the flame's motion, a broken pale core, a wine-red 1-px
// root rim, ragged licks torn off the tips, a few sparks, no smoke), dragged BACK along the road and
// up, curling up at the tip. Under them, what a foe on fire gets (statusfx.js statusBurn, Round 5 B):
// the barrel's own silhouette edge burns in fire tones rolling round it (hotter low), a warm ring just
// outside on its trailing side, a warm wash low on the barrel and a stepped warm glow on the road
// under it. All of it is baked per (kind, width, heading bucket, step of a BURN_N loop at 12 a second)
// into one canvas anchored on the barrel's ground point and stamped with one drawImage; a burning
// barrel is drawn at its bucket's heading so the outline fits. The silhouette is read once per (kind,
// width, bucket) by painting the barrel unturned-in-spin with `_sil` (no dust, fuse or bits).
// Bakes: at most BURN_PER_FRAME a frame (a missing step shows the last baked one), BURN_BUDGET bytes
// kept, least recently used dropped first. Only the Powder Keg Run carries `logBurn` today.
const BURN_NB = 64, BURN_N = 16, BURN_PER_FRAME = 2, BURN_BUDGET = 12 * 1024 * 1024;
const bucketA = (a) => { const k = Math.round((a / TAU) * BURN_NB); return (k / BURN_NB) * TAU; };
const bucketOf = (a) => ((Math.round((a / TAU) * BURN_NB) % BURN_NB) + BURN_NB) % BURN_NB;
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a"];                              // statusfx's tones (outline, ring, glow)
const BFIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];     // Dragonbreath's tones (the flames)
const BINK = "#8a2028";
const RANK = { [BFIRE[0]]: 0, [BFIRE[1]]: 1, [BFIRE[2]]: 2, [BFIRE[3]]: 3, [BFIRE[4]]: 4, [BINK]: 5, [BFIRE[5]]: 5 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const H2 = (a, b = 0) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const per = (i, n) => ((i % n) + n) % n;
const cellP = (a, b, n) => H2(per(a, n), b);
const FIFTH = (v) => Math.ceil(cl(v) * 5 - 1e-6) / 5;
const pxA = (c, x, y, col, al = 1) => { if (al <= 0) return; c.globalAlpha = al; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };

// the barrel's ridge (where today's flames stood: ps 0.35) and the stream, in art px from the ground point
const flameGeom = (kind, w, a) => {
  const drum = kind === "drum", keg = kind === "keg", R = drum ? 7.5 : keg ? 7.2 : 6.6;
  const ca = Math.cos(a), sa = Math.sin(a), ux = -sa, uy = ca, vx = -ca, vy = -sa;
  const ue = Math.abs(uy) >= 0.35 ? uy : uy >= 0 ? 0.35 : -0.35;
  const L = w - 1 - K * R * Math.abs(ue), dl = Math.atan2(K * vy, 1), M = Math.hypot(1, K * vy), cy = -K * R * vy;
  const ridge = (lx) => { const px = lx + xo0(0.35, R, ue, K), py = yOf0(0.35, R, cy, M, dl); return [(ux * px + vx * py) * 2, (uy * px + vy * py) * 2]; };
  // (rolling across the screen this is exactly the concept's stream; rolling up or down it the flames would stand in a
  // row like candles, or pour down the barrel's front, so they rise more and lean aside a little there)
  const vert = 1 - Math.abs(vx);
  let dx = vx + 0.45 * vert, dy = vy - 0.6 - Math.max(0, vy); const dn = Math.hypot(dx, dy); dx /= dn; dy /= dn;
  let nx = -dy, ny = dx; if (ny > 0) { nx = -nx; ny = -ny; }
  return { keg, vert, ca, sa, vx, vy, ux, uy, R, hl: L / 2, P0: ridge(-0.42 * L), P1: ridge(0.42 * L), d: [dx, dy], n: [nx, ny] };
};
const along = (g, u) => [g.P0[0] + (g.P1[0] - g.P0[0]) * u, g.P0[1] + (g.P1[1] - g.P0[1]) * u];
// the flame buffer: the hottest pixel wins, so overlapping tongues merge into one mass
const putB = (B, x, y, col, al = 1) => {
  x = Math.floor(x); y = Math.floor(y); const k = x * 8192 + y, r = RANK[col] ?? 3, o = B.get(k);
  if (o && (o.r < r || (o.r === r && o.a >= al))) return;
  B.set(k, { x, y, col, a: al, r });
};
// a Dragonbreath tongue along unit d from (rx, ry): h long, w half-width at the root, curling toward n
const tongue = (B, rx, ry, g, h, w, f, sd, curl = 0.32, hot = 0, see = false) => {
  const [dx, dy] = g.d, [nx, ny] = g.n, sway = 0.8;
  const ex = rx + dx * h + nx * curl * h, ey = ry + dy * h + ny * curl * h, pad = w + 3;
  const x0 = Math.floor(Math.min(rx, ex) - pad), x1 = Math.ceil(Math.max(rx, ex) + pad), y0 = Math.floor(Math.min(ry, ey) - pad), y1 = Math.ceil(Math.max(ry, ey) + pad);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const qx = X + 0.5 - rx, qy = Y + 0.5 - ry, s = qx * dx + qy * dy;
    if (s < -w * 0.7 || s > h + 0.5) continue;
    const t = cl(s / h);
    const qc = qx * nx + qy * ny - curl * t * t * h - Math.sin((TAU * 2 * f) / BURN_N + sd + t * 3) * sway * t * (1 + h / 14);
    let hw = w * (t < 0.2 ? 0.72 + 1.4 * t : Math.pow((1 - t) / 0.8, 1.05));
    if (s < 0) hw = w * 0.72 * Math.sqrt(Math.max(0, 1 - (s / (w * 0.7)) ** 2));
    const j = Math.floor(s), rows = Math.floor((j - 2 * f) / 2);
    const rag = cellP(rows, sd * 13 + (qc < 0 ? 0 : 7) + 3, 16);
    const e = hw * (1 + (0.12 + 0.6 * t) * (rag * rag * 1.8 - 0.5)) + 0.35;
    if (Math.abs(qc) > e) continue;
    const q = Math.abs(qc) / Math.max(0.6, e);
    const mot = cellP(rows, Math.floor(qc) + sd * 31 + 50, 16) * 0.6 + cellP(Math.floor((j - 2 * f) / 4), Math.floor(qc / 2) + sd * 17 + 90, 8) * 0.4;
    const hh = (1 - q) * 0.4 + (1 - t) * 0.36 + (mot - 0.5) * 0.75 + hot - 0.05;
    let col = hh > 0.95 ? BFIRE[0] : hh > 0.76 ? BFIRE[1] : hh > 0.54 ? BFIRE[2] : hh > 0.34 ? BFIRE[3] : BFIRE[4];
    if (Math.abs(qc) < 0.8 && t < 0.55 && mot > 0.55 && hw > 1.4) col = t < 0.22 ? BFIRE[0] : BFIRE[1];
    const rim = Math.abs(qc) > e - 1 || s > h - 0.5;
    if (rim) col = hw < 1.3 ? BFIRE[3] : t < 0.22 ? BINK : BFIRE[4];
    else if (Math.abs(qc) > e - 2 && t > 0.45 && bay(X + 64, Y + 64) < 0.5) col = BFIRE[3];
    let al = 1;
    if (see && t > 0.5) { const eq = Math.min(2, Math.floor(((t - 0.5) / 0.5) * 2 + bay(X + 64, Y + 64))); al = rim ? 0.9 : [1, 0.8, 0.6][eq]; }
    putB(B, X, Y, col, al);
  }
};
const sliver = (B, x, y, g, len, age, a0) => {
  for (let j = 0; j < len; j++) putB(B, x + g.d[0] * j * 0.8, y + g.d[1] * j * 0.8 - j * 0.5, j === 0 ? BFIRE[Math.min(4, 2 + age)] : BFIRE[Math.min(4, 3 + (age >> 1))], a0 * (1 - j * 0.15));
};
const flamesA = (B, g, f) => {
  const n = g.keg ? 3 : 2, S = g.keg ? 1.12 : 1, ph = (TAU * f) / BURN_N;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, [rx, ry] = along(g, u + Math.sin(ph + i * 2.1) * 0.03);
    const br = 1 + 0.16 * Math.sin(ph + i * 2.3) + 0.08 * Math.sin(ph * 3 + i);
    const h = Math.round(20 * S * br * (1 - 0.24 * g.vert * [0, 1, 0.5][i])), w = 3.9 * S, [bx, by] = along(g, u + 0.11);
    tongue(B, Math.round(bx), Math.round(by), g, Math.round(h * (0.62 + 0.1 * Math.sin(ph + i * 4))), w * 0.72, f, i + 40, 0.42);
    tongue(B, Math.round(rx), Math.round(ry), g, h, w, f, i + 1, 0.32, 0.06, true);
    const age = per(f + i * 3, 8);
    if (age < 4) sliver(B, rx + g.d[0] * (h + 2 + age * 2) + g.n[0] * 0.4 * h, ry + g.d[1] * (h + 2 + age * 2) + g.n[1] * 0.4 * h - age, g, 3 - (age >> 1), age, 0.85 - age * 0.12);
  }
};

// the barrel's silhouette (art px from its ground point), painted once per (kind, width, bucket)
let SIL = null, SILC = null;
const silOf = (kind, w, a) => {
  const S = 200, o = S / 2;
  if (!SIL) { SIL = document.createElement("canvas"); SIL.width = SIL.height = S; SILC = SIL.getContext("2d", { willReadFrequently: true }); }
  SILC.setTransform(1, 0, 0, 1, 0, 0); SILC.clearRect(0, 0, S, S); SILC.setTransform(2, 0, 0, 2, 0, 0);
  drawLog(SILC, { id: 0, a, w, spin: 0, x: o / 2, y: o / 2, speed: 118, burn: 0, blast: kind === "keg" ? 1 : 0, stun: kind === "drum" ? 1 : 0, _sil: true }, 0);
  SILC.setTransform(1, 0, 0, 1, 0, 0);
  const d = SILC.getImageData(0, 0, S, S).data, set = new Set(), list = [];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 200) {
    const X = x - o, Y = y - o; set.add(X * 8192 + Y); list.push([X, Y]);
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  const has = (x, y) => set.has(x * 8192 + y);
  const open = list.filter(([x, y]) => !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1));
  return { has, list, open, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

const burnBake = (m, g, f) => {
  const ph = (f / BURN_N) * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2), Hm = Math.max(8, m.y1 - m.y0);
  const PAD = 44, ox = PAD - m.x0, oy = PAD - m.y0, cw = m.x1 - m.x0 + PAD * 2, ch = m.y1 - m.y0 + PAD * 2;
  const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
  const c = cv.getContext("2d"); c.translate(ox, oy);
  const { has } = m;
  // 1. the ground glow: a stepped warm pool round the barrel's footprint on the road (fifths, dithered rim), never over it
  const au = (g.hl + 4) * 2 + 12, av = g.R * 2 + 12, rr = Math.ceil(Math.max(au, av));
  for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
    if (has(x, y)) continue;
    const r = Math.hypot((x * g.ux + y * g.uy) / au, (x * g.vx + y * g.vy) / av); if (r > 1) continue;
    const s = FIFTH((1 - r) * 1.6 * amp); if (s <= 0 || (s < 0.4 && bay(x + 64, y + 64) > s * 2.5)) continue;
    pxA(c, x, y, r < 0.35 ? FIRE[1] : FIRE[2], s * 0.55);
  }
  // 2. the edge pixels burn: a hot band, colours rolling round it, hotter low
  for (const [x, y] of m.open) {
    const v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H2(x, y) - 0.5) * 0.4;
    const s = v * (cl(1 - (m.y1 - y) / (Hm + 2)) * 0.5 + 0.5);
    pxA(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]);
  }
  // 3. a warm ring just outside, on the trailing side (where the fire is dragged)
  const sx = Math.max(-1, Math.min(1, Math.round(g.vx * 1.4))), sy = Math.max(-1, Math.min(1, Math.round(g.vy * 1.4)));
  for (const [x, y] of m.list) {
    if (has(x + sx, y + sy) || (x - m.cx) * g.vx + (y - m.cy) * g.vy < 0) continue;
    pxA(c, x + sx, y + sy, bay(x + 64, y + 64) < 0.6 * amp ? FIRE[1] : FIRE[2], 0.8);
    if (bay(x + 66, y + 64) < 0.5 * amp && !has(x + 2 * sx, y + 2 * sy)) pxA(c, x + 2 * sx, y + 2 * sy, FIRE[3], 0.6);
  }
  // 4. a warm wash low on the barrel, dithered
  for (const [x, y] of m.list) { const k = cl(1 - (m.y1 - y) / (Hm * 0.7)); if (k > 0 && bay(x + (f & 1) + 64, y + 64) < FIFTH(k * 0.35 * amp)) pxA(c, x, y, FIRE[3], 0.28); }
  // 5. the flames (Round 20 A) and a few sparks lifting off them
  const B = new Map(); flamesA(B, g, f);
  for (const p of B.values()) pxA(c, p.x, p.y, p.col, p.a);
  for (let k = 0; k < 3; k++) {
    const q = frac(f / BURN_N + k / 3), [rx, ry] = along(g, 0.2 + 0.6 * H2(k, 4));
    pxA(c, rx + g.d[0] * (8 + q * 22) + Math.sin(q * 6 + k) * 1.5, ry + g.d[1] * (8 + q * 22) - q * 14, q < 0.3 ? BFIRE[0] : q < 0.6 ? BFIRE[1] : q < 0.85 ? BFIRE[2] : BFIRE[4]);
  }
  return { cv, ox, oy, bytes: cw * ch * 4 };
};

const BURNS = new Map();                // "kind|w|bucket" -> { m, g, steps: [], last }
let burnBytes = 0, bakedAt = -1, bakedN = 0, burnBakes = 0, burnMs = 0;
export const logBurnStats = () => ({ keys: BURNS.size, bytes: burnBytes, bakes: burnBakes, ms: burnMs });
const dropOldest = () => { const k = BURNS.keys().next().value, e = BURNS.get(k); BURNS.delete(k); for (const s of e.steps) if (s) burnBytes -= s.bytes; };
function stampBurn(ctx, lg, X, Y, a, kind, time) {
  if (time !== bakedAt) { bakedAt = time; bakedN = 0; }
  const key = kind + "|" + lg.w + "|" + bucketOf(a);
  let e = BURNS.get(key);
  if (e) { BURNS.delete(key); BURNS.set(key, e); }
  else {
    if (bakedN >= BURN_PER_FRAME) return;            // over this frame's budget: the fire comes in a frame later
    bakedN++; const t0 = performance.now();
    e = { m: silOf(kind, lg.w, a), g: flameGeom(kind, lg.w, a), steps: [], last: -1 };
    burnMs += performance.now() - t0; BURNS.set(key, e);
  }
  const f = per(Math.floor(time * 12 + (lg.id || 0) * 5), BURN_N);
  let s = e.steps[f];
  if (!s && bakedN < BURN_PER_FRAME) {
    bakedN++; const t0 = performance.now(); s = e.steps[f] = burnBake(e.m, e.g, f); burnMs += performance.now() - t0; burnBakes++;
    burnBytes += s.bytes; while (burnBytes > BURN_BUDGET && BURNS.size > 1 && BURNS.keys().next().value !== key) dropOldest();
  }
  if (!s && e.last >= 0) s = e.steps[e.last];       // not baked yet: the last step shown stands in
  if (!s) return;
  if (e.steps[f]) e.last = f;
  ctx.drawImage(s.cv, X - s.ox / 2, Y - s.oy / 2, s.cv.width / 2, s.cv.height / 2);
}
