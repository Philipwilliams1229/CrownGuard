// Effects concepts, Round 20, row torch20: torches and braziers on the buildings, in Dragonbreath's look.
// See art/briefs/fx-round20.md (row 4). Owned by the torches artist; nothing else is edited.
//
// The cell is a real piece of the board by the Greenwood's gate, drawn twice: by DAY (top) and at NIGHT under the full
// Blood Moon (bottom: bloodmoonGround / bloodmoonPaint with the halls' night lamps, as night-halls.html does). Five real
// halls stand on it with their crews, every one with a fire: the King's Band's beacon (bb), the Archer hall's door torch
// (level 2), the Knight hall's two door torches (Crossbow Company), the fire spire's two braziers (Pyromancer) and the
// Brazier Wheel (its furnace and the fire pots round the wheel); then the castle's gate with its pier torches.
// TODAY is the game's own painters, untouched. A / B / C draw the SAME buildings and crews with the game's painters and
// swap only the flames:
//   - pix hall flames (`live` kind "flame", drawn by pix/halls.js from flameFrames): the hall's cached record has its
//     flame entries lifted for the draw (put back after), and the new flame is stamped at each entry's spot and size;
//   - the Brazier Wheel's pot flames (halls/spiker.js `flame`) and the castle's torch flames (castle.js `flame`) are
//     caught on a proxy of the context by their fill colours (nothing else on those pictures uses them) and replaced:
//     the pot flames in place (so the back half still passes behind the wheel), the castle's after the castle.
// Every new flame is a baked sprite per (option, width, height, step, seed): art px, anchored on its base like
// flameFrames, so it can go straight into hall-kit.js. The loop is N steps at the game's 11 a second.
const BR = typeof document !== "undefined";
// (literal import() calls: a variable one is served as a second copy of the module, with its own caches)
const TW = BR ? await import("/src/render/towers.js") : {};
const HP = BR ? await import("/src/render/pix/halls.js") : {};
const CA = BR ? await import("/src/render/castle.js") : {};
const BM = BR ? await import("/src/render/bloodmoon.js") : {};
const NL = BR ? await import("/src/render/nightlight.js") : {};

const N = 12, TAU = Math.PI * 2, FPS = 11;
const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"];   // Dragonbreath's tones
const INK = "#8a2028";                                                              // its tinted rim
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const per = (a, n) => ((a % n) + n) % n;
const cell = (a, b, n) => H(per(a, n), b);                    // hashed cells, periodic in a (seamless loops)
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const px = (c, x, y, col, a = 1) => { if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };

// ---- the new flame: one baked sprite per (option, width, height, step, seed) -------------------------------------------------
// w: full width at the widest, h: height (art px). Anchor = the base point; the lowest row is y = -1 (as flameFrames).
const SPR = new Map();
const flameSprite = (opt, w, h, f, seed) => {
  const key = `${opt}|${w}|${h}|${f}|${seed}`;
  let s = SPR.get(key); if (s) return s;
  const B = opt === "B", C = opt === "C", tiny = h <= 5;
  const H0 = Math.max(3, Math.round(h * (B ? 1.3 : 1))), W0 = w * (B ? 0.85 : 1), sd = seed * 1.7;
  const cw = Math.ceil(W0) + 14, ch = H0 + 16, ox = Math.floor(cw / 2), oy = ch - 3;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ox, oy);
  const k = TAU * f / N;
  // the height breathes (periodic over the loop), the tip sways: A a small flicker, B a slow lean side to side
  const Hf = Math.max(3, Math.round(H0 * (1 + 0.09 * Math.sin(2 * k + sd) + 0.06 * Math.sin(3 * k + sd * 1.3))));
  const sc = Math.max(0.6, h / 9);
  const sway = (t) => B ? (1.7 * Math.sin(k + sd) + 0.5 * Math.sin(2 * k + sd * 2)) * Math.pow(t, 1.3) * Math.pow(sc, 0.7)
    : (0.85 * Math.sin(k + sd) + 0.35 * Math.sin(3 * k + sd)) * Math.pow(t, 1.4) * sc;
  // one tongue of the mass: xo its root's offset, hs / ws its height / width against the main one, ph its phase
  const body = (xo, hs, ws, sd2, ph) => {
    const Hb = Math.max(2, Math.round(Hf * hs)), Wb = W0 * ws, kb = k + ph;
    for (let j = 0; j <= Hb; j++) {
      const t = j / Hb, mid = xo + sway(t) * (0.6 + 0.4 * hs) + 0.5 + (ph ? 0.4 * Math.sin(kb) * t : 0);
      // a teardrop: rounded at the root, a full belly a third of the way up, then drawn quickly to a ragged point
      const hw = (Wb / 2) * (t < 0.3 ? 0.8 + 0.67 * t : Math.pow((1 - t) / 0.7, 0.72));
      for (let X = Math.floor(mid - hw - 2); X <= Math.ceil(mid + hw + 2); X++) {
        const d = X + 0.5 - mid, side = d < 0 ? 0 : 1;
        const rag = cell(Math.floor((j - f) / 2), sd2 * 13 + side * 7 + 3, 6);
        const e = hw * (1 + (0.1 + 0.6 * t) * (rag * 1.7 - 0.65)) + 0.3;
        if (Math.abs(d) > e) continue;
        const q = Math.abs(d) / Math.max(0.6, e);
        // mottle: two layers of cells stretched along the rise, flowing up a pixel a step
        const m1 = cell(Math.floor((j - f) / 2), Math.floor(d + 8) + sd2 * 31 + 50, 6), m2 = cell(Math.floor((j - f) / 4), Math.floor((d + 8) / 2) + sd2 * 17 + 90, 3);
        const mot = m1 * 0.6 + m2 * 0.4;
        const hh = (1 - q) * 0.42 + (1 - t) * 0.4 + (mot - 0.5) * 0.7 + 0.1 - (hs < 1 ? 0.08 : 0);
        let col = hh > 0.95 ? FIRE[0] : hh > 0.74 ? FIRE[1] : hh > 0.52 ? FIRE[2] : hh > 0.34 ? FIRE[3] : FIRE[4];
        // a broken pale core low in the middle
        if (Math.abs(d) < 0.8 && t < 0.6 && mot > 0.38 && !tiny && hs === 1) col = t < 0.3 ? FIRE[0] : FIRE[1];
        // the rim: wine-dark round the root, red higher, broken to red-orange in places, red-orange on a thin tip
        const rim = Math.abs(d) > e - 1 || j === Hb;
        if (rim) col = hw < 1.2 || j === Hb ? FIRE[3] : t < 0.3 ? INK : cell(Math.floor((j - f) / 2), sd2 * 5 + side * 11 + 40, 6) > 0.62 ? FIRE[3] : FIRE[4];
        let a = 1;
        if (B && t > 0.55) { const eq = Math.min(2, Math.floor(((t - 0.55) / 0.45) * 2 + bay(X + 64, j + 64))); a = rim ? 0.85 : [1, 0.8, 0.6][eq]; }
        // C: white-hot where it is born
        if (C && hs === 1 && j <= (h >= 8 ? 1 : 0) && !rim) col = Math.abs(d) < 0.9 ? "#ffffff" : FIRE[0];
        px(c, X, -1 - j, col, a);
      }
    }
  };
  // a flame of any size is a small cluster: a lower tongue beside the main one (out of phase), so it never reads as a cone
  if (w >= 5 && !tiny) {
    const sideL = H(seed, 21) < 0.5 ? -1 : 1, off = Math.max(1, Math.round(W0 * 0.3));
    body(sideL * off, 0.55, 0.62, seed + 40, 2.1);
    if (w >= 8) body(-sideL * off, 0.4, 0.5, seed + 60, 4.2);
  }
  body(0, 1, 1, seed, 0);
  // a ragged lick tears off the tip now and then and rises, cooling (not on the tiny pot flames)
  if (!tiny) {
    const age = per(f + Math.floor(H(seed, 4) * 6), 6), ages = h >= 12 ? 3 : 2;
    if (age < ages) {
      // it lets go of the tip (one pixel above it), then drifts up and aside, warm, then gone
      const tx = sway(1) + 0.5 + (B ? 1 : 0.6) * age * Math.sign(Math.sin(k + sd) || 1), ty = -Hf - 2 - age;
      const len = h >= 9 ? 2 : 1;
      for (let j = 0; j < len; j++) px(c, tx, ty - j, j ? FIRE[3] : FIRE[2 + (age >> 1)], (B ? 0.8 : 1) - age * 0.15);
    }
  }
  // C: a spark now and then, lifting off the tip with a one-pixel trail, cooling as it goes
  if (C && h >= 6) {
    const ns = h >= 12 ? 2 : 1, life = 7;
    for (let s2 = 0; s2 < ns; s2++) {
      const start = Math.floor(H(seed, 7 + s2) * N), age = per(f - start, N);
      if (age >= life) continue;
      const q = age / life, dir = H(seed, 9 + s2) < 0.5 ? -1 : 1;
      const sx = sway(0.8) + 0.5 + dir * (0.5 + q * 2.5) + Math.sin(q * 5 + seed) * 0.7, sy = -Hf * 0.75 - q * (h * 0.8 + 6);
      px(c, sx, sy, q < 0.3 ? FIRE[0] : q < 0.6 ? FIRE[1] : q < 0.85 ? FIRE[2] : FIRE[4]);
      if (q < 0.7) px(c, sx - dir * 0.6, sy + 1, q < 0.35 ? FIRE[2] : FIRE[3], 0.7);
    }
  }
  s = { cv, ox, oy }; SPR.set(key, s); return s;
};
// stamp a flame sprite with its base at (x, y) in board units (1 unit = 2 art px), on whole art pixels
const stamp = (c, s, x, y) => c.drawImage(s.cv, Math.round((x - s.ox / 2) * 2) / 2, Math.round((y - s.oy / 2) * 2) / 2, s.cv.width / 2, s.cv.height / 2);
let SEEDS = 0;
const newFlame = (c, opt, x, y, w, h, f) => stamp(c, flameSprite(opt, Math.max(2, Math.round(w)), Math.max(3, Math.round(h)), f, per(Math.round(x * 0.37 + y * 0.11), 7) + SEEDS), x, y);

// ---- the board window: by the Greenwood's gate (the road comes in at y 256) -----------------------------------------------
const X0 = 492, X1 = 800, Y0 = 152, Y1 = 264, RH = (Y1 - Y0) * 2, GAP = 4;
const FEET = 228;
const HALLS = [
  { kind: "band", name: "band", draw: "drawBandTower", x: 520, form: { level: 3, branch: "b", rank4: "b" }, id: 5 },
  { kind: "archer", name: "archer", draw: "drawArcherTower", x: 570, form: { level: 2 }, id: 3 },
  { kind: "knight", name: "knight", draw: "drawGarrison", x: 614, form: { level: 3, branch: "b", rank4: "b" }, id: 4 },
  { kind: "wizard", name: "wizard", draw: "drawWizardSpire", x: 660, form: { level: 3, branch: "a" }, id: 6 },
  { kind: "spiker", name: "spiker", draw: "drawBladewheel", x: 706, form: { level: 3, branch: "b" }, id: 7 },
];
const tower = (h) => ({ id: h.id, kind: h.kind, x: h.x, y: FEET, level: h.form.level, branch: h.form.branch || null, rank4: h.form.rank4 || null,
  cd: 0, aim: "first", lastAim: Math.PI, anim: 0, shotIdx: 0, critIdx: 0, invested: 0, units: [], rally: null,
  kills: 0, dmgOut: 0, liveTime: 1, _idle: true, charges: 3, ramp: 2, mAnim: 0, eagle: null });
const TOWERS = BR ? HALLS.map(tower) : [];
const scratch = BR ? mk(64, 64).getContext("2d") : null;
// the hall's cached record (pix/halls.js), baked by one draw if it isn't yet
const recOf = (h, i) => {
  const t = TOWERS[i];
  try { return HP.hallPix(h.name, null, h.form, t.id % 3); } catch { TW[h.draw](scratch, t, 1); return HP.hallPix(h.name, null, h.form, t.id % 3); }
};

// a context proxy that lifts the castle's and the Brazier Wheel's own flames, drawing the new one instead
const RECT_FL = new Set(["#f0903a", "#d8582a", "#ffe08a", "#f8b048"]);      // castle.js flame
const POT_FL = new Set(["#f0903a", "#f4c040", "#f07030"]), POT_CORE = new Set(["#ffe08a", "#fff8d8"]);   // halls/spiker.js flame
const catcher = (ctx, onPot, rects) => {
  let path = [];
  const fn = {
    fillRect: (x, y, w, h) => { if (rects && RECT_FL.has(ctx.fillStyle)) { rects.push({ x, y, w, h, m: ctx.getTransform() }); return; } ctx.fillRect(x, y, w, h); },
    beginPath: () => { path = []; ctx.beginPath(); },
    moveTo: (x, y) => { path.push([x, y]); ctx.moveTo(x, y); },
    quadraticCurveTo: (a, b, x, y) => { path.push([x, y]); ctx.quadraticCurveTo(a, b, x, y); },
    fill: (...a) => {
      if (onPot && path.length === 3 && POT_FL.has(ctx.fillStyle)) { const [p0, p1, p2] = path; const s = (p2[0] - p0[0]) / 2.6; onPot((p0[0] + p2[0]) / 2, p0[1], s, p0[1] - p1[1]); return; }
      if (onPot && path.length === 2 && POT_CORE.has(ctx.fillStyle)) return;
      ctx.fill(...a);
    },
  };
  return new Proxy(ctx, {
    get(t, k) { if (fn[k]) return fn[k]; const v = t[k]; return typeof v === "function" ? v.bind(t) : v; },
    set(t, k, v) { t[k] = v; return true; },
  });
};
// the castle's flames, gathered from their rows: one flame per cluster (base, centre, width, height in units)
const flamesOfRects = (rects) => {
  const out = [];
  for (const r of rects) {
    let g = out.find((o) => o.m.e === r.m.e && o.m.f === r.m.f && Math.abs(o.x - r.x) < 5 && Math.abs(o.y - r.y) < 9);
    if (!g) out.push((g = { m: r.m, x: r.x, y: r.y, rs: [] }));
    g.rs.push(r);
  }
  return out.map((g) => {
    const bot = Math.max(...g.rs.map((r) => r.y)), top = Math.min(...g.rs.map((r) => r.y));
    const row = g.rs.filter((r) => r.y === bot), l = Math.min(...row.map((r) => r.x)), rr = Math.max(...row.map((r) => r.x + r.w));
    return { m: g.m, x: (l + rr) / 2, y: bot + 1, w: (rr - l) * 2, h: (bot + 1 - top) * 2 };
  });
};

// one row of the cell: the board window, day or night, today's flames or an option's
const drawRow = (c, opt, f, time, night, dark) => {
  const fresh = opt !== "today";
  // at night the new flames go on AFTER the shade (a fire is a light: it is not darkened by the night); the pot flames stay
  // in place, half of them pass behind the wheel
  const late = [], put = (fn) => (night ? late.push(fn) : fn());
  const g = { time, towers: TOWERS, bands: [], enemies: [], weather: null };
  const w = { k: 1, phase: "squall", paint: "bloodmoon", kind: "bloodmoon" };
  CA.drawCastleGround(c, time, 1);
  if (night) BM.bloodmoonGround(c, g, w);
  // the halls, left to right (one ground line), each with its crew
  HALLS.forEach((h, i) => {
    const t = TOWERS[i];
    if (!fresh) { TW[h.draw](c, t, time); return; }
    const R = recOf(h, i), keep = R.spec.live, fl = (keep || []).filter((l) => l.kind === "flame");
    R.spec.live = (keep || []).filter((l) => l.kind !== "flame");
    const cx = catcher(c, (x, y, s, hh) => newFlame(c, opt, x, y + 0.5, s * 2.6 * 2 * 0.8, hh * 2 * 1.15, f), null);
    try { TW[h.draw](cx, t, time); } finally { R.spec.live = keep; }
    for (const l of fl) put(() => newFlame(c, opt, t.x + l.x / 2, t.y + l.y / 2, l.w || 5, l.h || 9, f));
  });
  // the castle: its torches lifted and drawn new
  const rects = fresh ? [] : null;
  CA.drawCastle(fresh ? catcher(c, null, rects) : c, time, 1);
  if (fresh) for (const fl of flamesOfRects(rects)) put(() => { c.save(); c.setTransform(fl.m); newFlame(c, opt, fl.x, fl.y, fl.w, fl.h, f); c.restore(); });
  if (night) BM.bloodmoonPaint(c, g, w);
  for (const fn of late) fn();
};

const scene = (opt) => (c, e) => {
  const f = per(e.i, N), dark = e.ground === "dark";
  const tDay = 20 + f / FPS, tNight = 120 + f / FPS;
  // DAY on top, NIGHT below, each the same window of the board at 1 art px a pixel
  const row = (top, night, time) => {
    c.save(); c.beginPath(); c.rect(0, top, e.cw, RH); c.clip();
    c.translate(-X0 * 2, top - Y0 * 2); c.scale(2, 2);
    drawRow(c, opt, f, time, night, dark);
    c.restore();
  };
  row(0, false, tDay);
  // the night: a pass on a scratch canvas first, so the lamps' pools (one frame late) are this frame's
  NL.clearLamps();
  const sc = mk(e.cw, RH), sx = sc.getContext("2d"); sx.translate(-X0 * 2, -Y0 * 2); sx.scale(2, 2);
  drawRow(sx, opt, f, tNight, true, dark);
  row(RH + GAP, true, tNight);
  NL.clearLamps();
  c.fillStyle = "#14171d"; c.fillRect(0, RH, e.cw, GAP);
};

export const ROWS = [{
  id: "torch20", label: "Torches and braziers (round 20)", group: "Round 20", cw: (X1 - X0) * 2, ch: RH * 2 + GAP, ax: 0, ay: 0, N,
  note: "A piece of the board by the gate at board size, by day (top) and at night under the blood moon (bottom), with the King's Band's beacon, the Archer hall's door torch, the Knight hall's two door torches, the fire spire's two braziers, the Brazier Wheel's furnace and fire pots, and the castle gate's torches. Only the flames change; the buildings, crews and their light are today's. At night the new flames are drawn over the night's shade (a fire is a light), where today's are darkened with the buildings, so they keep their colours in the dark (the Brazier Wheel's little pot flames stay under it). A: each flame a small mottled tongue in Dragonbreath's colours (gold, orange and red clusters rising through it), a pale broken core, a dark red edge, its tip flickering and now and then tearing off a ragged lick. B: a taller, narrower lick that leans slowly from side to side, its upper part see-through. C: A with a white-hot base where the fire is born and a spark now and then lifting off the tip.",
  today: scene("today"), A: scene("A"), B: scene("B"), C: scene("C"),
}];
