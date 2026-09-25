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

export const drawLog = (ctx, lg, time) => {
  const drum = !!lg.stun, keg = !drum && !!lg.blast;
  const P = drum ? DRUM : keg ? KEG : LOG;
  const R = drum ? 7.5 : keg ? 7.2 : 6.6;           // radius (the keg's is its bulge)
  const id = lg.id || 0;
  const a = lg.a, ca = Math.cos(a), sa = Math.sin(a);
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

  // ---- on the road: contact shadow, then the dust it leaves behind ----
  ctx.save();
  ctx.translate(X + 1.5, Y + 2);
  ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = "rgba(36,26,38,0.16)";
  ctx.beginPath(); ctx.roundRect(-hl - 2, -R * 0.95, L + 4, R * 1.9, [R * 0.8]); ctx.fill();
  ctx.fillStyle = drum ? "rgba(36,26,38,0.3)" : "rgba(36,26,38,0.22)";
  ctx.beginPath(); ctx.roundRect(-hl - 0.5, -R * 0.6, L + 1, R * 1.2, [R * 0.5]); ctx.fill();
  ctx.restore();
  const W = (lx, back, lift) => [X + ux * lx - ca * back, Y + uy * lx - sa * back - lift];
  const dot = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(snap(x), snap(y), w, h); };
  {
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
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a + Math.PI / 2);
  const rr = (x0, x1, y, c) => { const p = snap(x0), q = snap(x1); if (q > p) { ctx.fillStyle = c; ctx.fillRect(p, y, q - p, 0.5); } };
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
  // 1. ink: the silhouette, fattened by one world unit (two art pixels)
  for (const [x0, x1, rho] of segs) {
    const capHere = (sg > 0 && x1 === hl) || (sg < 0 && x0 === -hl);
    rows(rho, 1, (y, pf, pb) => {
      let lo = x0 + xo(rho, pf), hi = x1 + xo(rho, pf);
      if (capHere) { if (sg > 0) hi = Math.max(hi, x1 + xo(rho, pb)); else lo = Math.min(lo, x0 + xo(rho, pb)); }
      // only the barrel's true ends get side ink; inner joins would leave tabs
      rr(lo - (x0 === -hl ? 1 : 0), hi + (x1 === hl ? 1 : 0), y, INK);
    });
  }
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
  ctx.restore();

  // ---- back in the world: fuse and sparks, flames, flying bits ----
  const toW = (lx, ly) => [X + ux * lx + vx * ly, Y + uy * lx + vy * ly];
  if (keg) {
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
  if (lg.burn) {
    // flames off the top and the back of the barrel, streaming back as it rolls
    const n = keg ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const lx = ((i + 0.5) / n - 0.5) * L * 0.8 + Math.sin(time * 2 + i) * 0.5, ps = 0.35;
      const [fx, fy] = toW(lx + xo0(ps, R, ue, K), yOf0(ps, R, cy, M, dl));
      const hgt = 5.5 + 2 * Math.sin(time * 9 + i * 2.1) + hash(i + Math.floor(time * 12)) * 2;
      const lean = 0.45;
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < hgt; j += 0.5) {
          const f = j / hgt;
          const wd = pass ? (1 - f) * 2 : (1 - f * 0.85) * (keg ? 3.8 : 3);
          if (pass && f > 0.6) break;
          const wob = Math.sin(time * 14 + j * 0.9 + i * 2) * 0.5 * f;
          const x = fx - ca * j * lean + wob, y = fy - sa * j * lean * 0.5 - j;
          const c = pass ? (f < 0.25 ? "#fff3d2" : "#f8d868") : (f < 0.45 ? "#f09838" : f < 0.8 ? "#d0502e" : "#8a2e2a");
          dot(x - wd / 2, y, snap(Math.max(0.5, wd)), 0.5, c);
        }
      }
    }
  }
  // flying bits, laid down by distance rolled so they hang in the air behind
  {
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
};

// flame bases need the barrel's geometry outside its frame
const xo0 = (ps, R, ue, K) => -K * (R + R * Math.cos(ps)) * ue;
const yOf0 = (ps, R, cy, M, dl) => cy + R * M * Math.sin(ps - dl);
