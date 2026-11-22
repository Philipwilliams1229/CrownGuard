// ============ THE OVERHAUL, ROUND 2: BRIDGES (Greenwood only, 2026-11-22) ============
// Brief: art/briefs/overhaul-round2.md + art/briefs/bridges-upscreen-rule.md (the advisor's rule for a
// span running up the screen). Notes: concept/overhaul2-bridges.md. Lab: overhaul2-bridges.html.
//
// Every panel is a REAL Greenwood board: the engine is run, the river widened in the realm's data (the
// engine re-spans its bridges from it), the old span taken out (BRIDGES emptied before the first bake),
// the board drawn by the game's own draw(); then the new span is painted over it in ART pixels (the
// 1680 x 1120 board canvas is 1 px = 1 art px = half a board unit), the figures (the game's pix
// sculpts) laid on the deck at its height, the front layer last. Nothing under src/ is changed.
//
// Every span is ONE SOLID in its own (u along the road, v across, z up) frame, projected screen =
// (x, y - z): across  X = cx + u, Y = cy + v - z;   up the screen  X = cx + v, Y = cy + u - z.
// Kinds: "trestle" (rise 10, ramps 25 onto land, battered 0.4: strips on both flanks), "flat" (today's
// bridge updated: rise 8 cos arch, vertical piles past the deck), "hump" (stone, rise 17, span 106).
// Variants of the trestle: "toll" (truss rails, hut, banners), "farm" (post and rail, plain), "mill"
// (sluice gates on the upstream side, a millrace beam).
// every game module is imported at run time by its plain URL (the lab page's own instances): a module
// pulled in through this file's ?v= URL can come back as a second copy that the board never fills
let selectRealm, REALMS, selectFaction, setWaveWindow, updateGame, placeTower, upgradeTower, buildableAt, draw, setLevelWeather,
  setDay, SUN_POS, PIX, bakeFrame, noteLamp, drawLampPools, drawLampBloom, swapLamps, clearLamps;
let TR = null, DAYR = null;
const loadGame = async () => {
  const [Mp, Fa, Wv, Up, Ac, Dr, Wx, Sn, Px, Bk, Nl] = await Promise.all(["/src/data/maps.js", "/src/data/factions.js", "/src/data/waves.js", "/src/engine/update.js", "/src/engine/actions.js", "/src/render/draw.js", "/src/engine/weather.js", "/src/data/sun.js", "/src/render/pix/pixrigs.js", "/src/render/pix/bake.js", "/src/render/nightlight.js"].map((u) => import(u)));
  ({ selectRealm, REALMS } = Mp); ({ selectFaction } = Fa); ({ setWaveWindow } = Wv); ({ updateGame } = Up);
  ({ placeTower, upgradeTower, buildableAt } = Ac); ({ draw } = Dr); ({ setLevelWeather } = Wx); ({ setDay, SUN_POS } = Sn); DAYR = Sn.DAY;
  ({ PIX } = Px); ({ bakeFrame } = Bk); ({ noteLamp, drawLampPools, drawLampBloom, swapLamps, clearLamps } = Nl);
  TR = await import("/src/data/terrain.js");
};

const CW = 1680, CH = 1120;     // the board canvas, art px

// ---------------------------------------------------------------- kit
const CC = new Map();
const C = (h) => { if (typeof h !== "string") return h; let c = CC.get(h); if (!c) CC.set(h, (c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])); return c; };
const mix = (a, b, t) => { a = C(a); b = C(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vn = (X, Y, s = 0) => {
  const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAY[((y & 3) << 2) | (x & 3)];
const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

class Layer {
  constructor() { this.d = new Uint8ClampedArray(CW * CH * 4); }
  p(x, y, c, a = 1) {
    x = Math.round(x); y = Math.round(y);
    if (c == null || x < 0 || y < 0 || x >= CW || y >= CH || a <= 0) return;
    c = C(c); const i = (y * CW + x) * 4, d = this.d;
    if (a >= 1 || d[i + 3] === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a >= 1 ? 255 : Math.max(d[i + 3], a * 255); return; }
    const A0 = d[i + 3] / 255, A1 = A0 + a * (1 - A0), k = a / A1;
    d[i] += (c[0] - d[i]) * k; d[i + 1] += (c[1] - d[i + 1]) * k; d[i + 2] += (c[2] - d[i + 2]) * k; d[i + 3] = A1 * 255;
  }
  r(x, y, w, h, c, a = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c, a); }
  has(x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < CW && y < CH && this.d[(y * CW + x) * 4 + 3] > 0; }
  canvas() { const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH; cv.getContext("2d").putImageData(new ImageData(this.d, CW, CH), 0, 0); return cv; }
}
const line = (L, x0, y0, x1, y1, c, th = 1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1;
  for (let s = 0; s <= n; s++) { const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n; L.r(Math.round(x - (th - 1) / 2), Math.round(y - (th - 1) / 2), th, th, c); }
};

// ---------------------------------------------------------------- palettes and light
const WOOD = ["#2a1a14", "#47301c", "#664527", "#865c34", "#a47a48", "#c49a62"];   // dark .. pale
const WOOD_WET = "#3c4630";
const INK = "#2a1c1a";
const STONE = ["#3e3a40", "#5e5850", "#7e7466", "#9c9080", "#b9ad96", "#d4c9ae"];
const MOSS = ["#4e6a2c", "#6a8a36"];
const EARTH = ["#3a2618", "#553a24", "#6e4c2e", "#8a6440"];
const IRON = "#4c4e58";
const BANNER = ["#1e3050", "#2e4a74", "#4a6c9c", "#d8b34a"];
const LAMP = "#ffd27a";
let S = null;   // the sun of the panel in hand
const sunOf = (id) => {
  const s = SUN_POS[id] || SUN_POS.noon, gold = !!s.len && s.warm > 0.5;
  const sh = s.len ? [s.fall[0] * s.len, s.fall[1] * s.len] : [0.56, 0.44];
  return { id, gold, side: s.side || -1, sh, shade: s.shade, col: C(s.col), warm: s.warm || 0 };
};
// a face's colour under the sun: "top" (deck, coping), "lit" (the sun's side), "sh" (the other)
const F = (c, face = "top") => {
  c = C(c);
  if (face === "lit") c = S.gold ? mix(mix(c, [255, 250, 230], 0.1), S.col, 0.22) : mix(c, [255, 246, 220], 0.1);
  else if (face === "sh") c = S.gold ? mix(c, [S.shade[0], S.shade[1], S.shade[2]], 0.42) : mix(c, [42, 28, 44], 0.2);
  else if (S.gold) c = mix(c, S.col, 0.12);
  return c;
};

// ---------------------------------------------------------------- the board
const DT = 1 / 60;
const newGame = () => ({
  run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 9999, wave: 5, phase: "build",
  towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
  selectedId: null, buildMode: null, hover: null, time: 3.2, shake: 0, snapshot: null,
  cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0, freeplay: true,
});
const ORIG_W = new Map();
const baseBoard = (sc, log) => {
  const R = REALMS[sc.realm];
  if (!ORIG_W.has(sc.realm)) ORIG_W.set(sc.realm, (R.rivers || []).map((r) => r.w));
  (R.rivers || []).forEach((r, i) => { r.w = ORIG_W.get(sc.realm)[i]; });
  if (sc.widen) for (const [i, w] of Object.entries(sc.widen)) R.rivers[i].w = w;
  selectRealm(sc.realm === "greenwood" ? "thornbrook" : "greenwood"); selectRealm(sc.realm); selectFaction("greenwood"); setWaveWindow(null); setLevelWeather(null);
  const spans = TR.BRIDGES.map((b) => ({ ...b }));
  if (!sc.keepOld) TR.BRIDGES.length = 0;
  const g = newGame();
  for (const [kd, x0, y0, lv] of sc.towers || []) {
    let spot = null;
    for (let r = 0; r < 60 && !spot; r += 3) for (let a = 0; a < 6.28 && !spot; a += 0.5) { const x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r; if (buildableAt(g, x, y, kd)) spot = [x, y]; }
    if (!spot) { log.push("no spot " + kd); continue; }
    placeTower(g, kd, spot[0], spot[1]);
    const t = g.towers[g.towers.length - 1];
    for (let l = 1; l < lv; l++) upgradeTower(g, t);
    t.readyAt = 0; t.raised = null;
  }
  for (let i = 0; i < 40; i++) updateGame(g, DT);
  g.enemies.length = 0; g.bands.length = 0; g.effects.length = 0;
  const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
  draw(g, cv, { current: null }); draw(g, cv, { current: null });
  return { cv, spans, g };
};

// the road's own colours, sampled along its centre line away from the span (the bridge is built WITH it)
const roadRamp = (img, pts) => {
  const cols = [];
  for (const [x, y] of pts) for (let j = -40; j <= 40; j += 3) for (let i = -40; i <= 40; i += 3) {
    const X = Math.round(x * 2 + i), Y = Math.round(y * 2 + j);
    if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
    const o = (Y * CW + X) * 4; cols.push([img.data[o], img.data[o + 1], img.data[o + 2]]);
  }
  cols.sort((a, b) => lum(a) - lum(b));
  const q = (f) => cols[Math.min(cols.length - 1, Math.floor(cols.length * f))];
  return [q(0.04), q(0.2), q(0.45), q(0.7), q(0.93)];
};

// ---------------------------------------------------------------- the river's cut bank (light: the water artist owns the water)
// The water lies FACE px below the land: a north bank shows its earth face (facing the camera, south), a
// south bank only its turf lip and a strip of beach; the banks running up the screen a two-pixel face.
const FACE = 7;
const cutBanks = (img, x0, y0, w, h, wet, skip) => {
  const d = img.data, set = (X, Y, c, a = 1) => { const o = (Y * CW + X) * 4; c = C(c); d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a; };
  for (let X = x0; X < x0 + w; X++) for (let Y = y0 + 1; Y < y0 + h - 1; Y++) {
    if (!wet(X, Y) || skip(X, Y)) continue;
    if (!wet(X, Y - 1)) {   // the north bank: its face
      for (let k = 0; k < FACE + 3; k++) {
        const yy = Y + k; if (!wet(X, yy)) break;
        if (k === 0) set(X, yy, F(hash(X, 3, 1) < 0.3 ? "#3e5a26" : "#4a6a2a", "sh"));
        else if (k < FACE - 1) {
          const strata = Math.floor((k + vn(X / 7, 1, 2) * 2) / 2);
          let c = [EARTH[3], EARTH[2], EARTH[2], EARTH[1]][strata & 3];
          if (hash(X, yy, 5) > 0.93) c = STONE[3];
          if (k === 1 && hash(X, 0, 8) < 0.25) c = "#2e3a1c";   // roots
          set(X, yy, F(c, S.side < 0 ? "lit" : "top"));
        } else if (k === FACE - 1) set(X, yy, "#2c2620");
        else set(X, yy, "#14202a", 0.35 - (k - FACE) * 0.1);   // the bank's shade on the water
      }
      Y += FACE + 2;
    } else if (!wet(X, Y + 1)) {   // the south bank: a beach strip and the turf lip
      set(X, Y, hash(X, Y, 3) < 0.5 ? "#b8a27a" : "#a48e66"); if (wet(X, Y - 1)) set(X, Y - 1, "#d8e8e0", 0.5);
      set(X, Y + 1, "#2e3a1c", 0.6);
    } else if (!wet(X - 1, Y)) { set(X, Y, F(EARTH[2], "lit")); set(X + 1, Y, EARTH[1], 0.7); }
    else if (!wet(X + 1, Y)) { set(X, Y, F(EARTH[1], "sh")); set(X - 1, Y, EARTH[0], 0.5); }
  }
};

// ---------------------------------------------------------------- the span's profile
// u, v, z in ART px; u = 0 at the span's centre. Returns { z(u), lo, hi (deck ends), A, B (abutments), kind }.
const profile = (kind, uN, uS) => {
  if (kind === "trestle") {
    const A = uN - 6, B = uS + 6, Z = 20, R = 50;
    return { kind, Z, A, B, lo: A - R, hi: B + R, z: (u) => (u < A - R || u > B + R ? 0 : u < A ? Z * (u - (A - R)) / R : u > B ? Z * (B + R - u) / R : Z), batter: 0.4 };
  }
  if (kind === "flat") {
    const A = uN - 16, B = uS + 16, Z = 16, half = (B - A) / 2, mid = (A + B) / 2;
    return { kind, Z, A, B, lo: A, hi: B, z: (u) => (Math.abs(u - mid) >= half ? 0 : Z * Math.cos(((u - mid) / half) * Math.PI / 2)), batter: 0 };
  }
  // the humpback: rise 17 units, a cos crown over a span of 106 (slope 0.5 at the feet)
  const Z = 34, half = 106, mid = (uN + uS) / 2;
  return { kind, Z, A: uN - 8, B: uS + 8, lo: mid - half, hi: mid + half, z: (u) => (Math.abs(u - mid) >= half ? 0 : Z * Math.cos(((u - mid) / half) * Math.PI / 2)), batter: 0.4 };
};
// bents: a navigation bay of 40 px (20 units) round the deepest water, then every 18 px out to the abutments
const bentsOf = (pr, uN, uS) => {
  const c = (uN + uS) / 2, out = [];
  for (let u = c + 19; u < pr.B - 3; u += 17) out.push(u);
  for (let u = c - 19; u > pr.A + 3; u -= 17) out.push(u);
  return out.sort((a, b) => a - b);
};

// ---------------------------------------------------------------- shared pieces
const lantern = (L, x, y, lit = true) => {   // (x, y) the lantern's foot
  L.r(x - 2, y - 7, 5, 7, INK); L.r(x - 1, y - 6, 3, 5, lit ? LAMP : "#6a5a3a"); if (lit) L.p(x, y - 5, "#fff6d8");
  L.r(x - 3, y - 8, 7, 1, IRON); L.p(x, y - 9, IRON);
};
const postV = (L, x, yFoot, h, w = 4, cap = true) => {   // a squared post in elevation, lit on the sun's side
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const litSide = S.side < 0 ? i === 0 : i === w - 1, shSide = S.side < 0 ? i === w - 1 : i === 0;
    L.p(x + i, yFoot - j, i === -1 ? INK : F(litSide ? WOOD[4] : shSide ? WOOD[2] : WOOD[3], litSide ? "lit" : shSide ? "sh" : "top"));
  }
  for (let j = 0; j < h; j++) { L.p(x - 1, yFoot - j, INK); L.p(x + w, yFoot - j, INK); }
  if (cap) { L.r(x - 1, yFoot - h - 1, w + 2, 2, F(WOOD[5])); L.r(x - 1, yFoot - h - 2, w + 2, 1, INK); }
};
const banner = (L, x, y, h = 16, flip = 1) => {   // hanging from an arm at (x, y)
  line(L, x, y, x + 7 * flip, y, IRON);
  for (let j = 0; j < h; j++) for (let i = 0; i < 6; i++) {
    const xx = x + (flip > 0 ? 1 + i : -6 + i), tail = j > h - 4 && Math.abs(i - 2.5) < (j - (h - 4)) * 0.9;
    if (tail) continue;
    let c = i === 0 || i === 5 ? BANNER[0] : j % 7 === 3 && i > 1 && i < 4 ? BANNER[3] : vn(i, j / 3 + x, 3) > 0.6 ? BANNER[2] : BANNER[1];
    L.p(xx, y + 1 + j, F(c, i < 2 ? "lit" : "top"));
  }
};
const hut = (L, hx, hy, door = "e") => {   // the toll hut: (hx, hy) its south-west foot, 30 x 22 walls, a shingle roof
  const Wd = WOOD;
  for (let j = 0; j < 22; j++) for (let i = 0; i < 30; i++) { const c = i % 6 === 0 ? Wd[2] : j % 5 === 0 ? Wd[3] : Wd[4]; L.p(hx + i, hy - j, F(c, "lit")); }
  L.r(hx, hy - 22, 30, 1, INK); L.r(hx - 1, hy - 22, 1, 23, INK); L.r(hx + 30, hy - 22, 1, 23, INK);
  L.r(hx, hy, 30, 1, "#2a2a20");
  const dx = door === "e" ? hx + 19 : hx + 4;
  L.r(dx, hy - 15, 7, 15, INK); L.r(dx + 1, hy - 14, 5, 14, F(Wd[2])); L.p(dx + 4, hy - 7, "#d8b34a");
  const wx = door === "e" ? hx + 5 : hx + 18;
  L.r(wx, hy - 15, 9, 7, INK); L.r(wx + 1, hy - 14, 7, 5, "#ffcf6a"); L.r(wx + 4, hy - 14, 1, 5, Wd[1]); L.r(wx + 1, hy - 12, 7, 1, Wd[1]);
  for (let j = 0; j < 15; j++) for (let i = -4 + Math.floor(j / 2); i < 34 - Math.floor(j / 2); i++) {
    const edge = j === 14 || i === -4 + Math.floor(j / 2) || i === 33 - Math.floor(j / 2);
    const c = edge ? "#4a2626" : (i + (j >> 1) * 3) % 6 === 0 ? "#6a3832" : (j & 1) ? "#8a4a3e" : "#a45a48";
    L.p(hx + i, hy - 23 - j, F(c, i < 15 ? "lit" : "sh"));
  }
  L.r(hx + 22, hy - 44, 5, 9, F(STONE[3], "lit")); L.r(hx + 22, hy - 45, 5, 1, STONE[5]); L.r(hx + 21, hy - 44, 1, 9, INK);
  return [hx + 5 + 4, hy - 12];   // the window: a lamp for the dusk
};
// a timber pile in elevation from (x, yTop) to (x, yFoot): w px, a wet band at the foot, a strap
const pileV = (L, x, yTop, yFoot, w = 3, wetAt = 1e9) => {
  for (let y = Math.round(yTop); y <= yFoot; y++) for (let i = 0; i < w; i++) {
    const litSide = S.side < 0 ? i === 0 : i === w - 1;
    let c = litSide ? F(WOOD[4], "lit") : i === w - 1 || i === 0 ? F(WOOD[1], "sh") : F(WOOD[3], "top");
    if (y > wetAt - 4) c = mix(c, WOOD_WET, 0.55);
    L.p(x + i, y, c);
  }
};
// the white water at a foot standing in the stream: a tongue downstream (fx, fy) and a lip upstream; ph 0..1 slides it
const wake = (L, x, y, fx, fy, len, ph = 0, wid = 3) => {
  for (let k = 0; k < len; k++) {
    const f = k / len, wd = Math.max(1, Math.round(wid * (1 - f * 0.6))), on = ((k + ph * 6) % 6) < 3.4;
    if (!on && f > 0.25) continue;
    for (let s = -wd; s <= wd; s++) {
      if (hash(k, s, Math.floor(ph * 6)) > 0.9 - f * 0.3) continue;
      const X = x + fx * k - fy * s * (0.5 + f), Y = y + fy * k + fx * s * (0.5 + f) * 0.6;
      L.p(X, Y, Math.abs(s) === wd ? "#9ccad8" : "#eef6f2", 0.9 - f * 0.6);
    }
  }
  for (let s = -wid; s <= wid; s++) L.p(x - fx * 2 - fy * s, y - fy * 2 + fx * s * 0.6, "#dcecec", 0.7);
};

// a plank of the deck at (u, v): boards laid across, staggered butt joints, a lit north arris, the road's
// dust worn into the wheel tracks, earth spilled onto the end planks (e: px from the nearer abutment)
const plank = (u, v, pitch, hw, road, e) => {
  const row = Math.floor(u / pitch), jj = ((u % pitch) + pitch) % pitch, seg = Math.floor((v + 200 + (row % 3) * 23) / 58);
  const hv = hash(row, seg, 3);
  if (Math.abs(v) > hw - 3) return jj < 0.75 ? WOOD[0] : Math.abs(v) > hw - 1 ? WOOD[2] : WOOD[4];   // the kerb timber
  if (jj < 0.75) return WOOD[0];
  if (Math.round(v + 200 + (row % 3) * 23) % 58 === 0) return WOOD[1];   // a butt joint
  let c = jj < 1.75 ? WOOD[5] : hv < 0.3 ? WOOD[3] : hv < 0.8 ? WOOD[4] : mix(WOOD[4], WOOD[5], 0.5);
  if (jj >= 1.75 && hash(Math.round(v / 3), row, 9) > 0.86) c = mix(c, WOOD[2], 0.5);   // grain
  // the tread boards: two runs of planks laid ALONG the road in its wheel tracks, worn to the road's own dust
  const tr = Math.abs(Math.abs(v) - 42);
  if (tr < 8) {
    if (tr > 7) return WOOD[0];
    const k = ((u + (v > 0 ? 17 : 0)) % 44 + 44) % 44;
    if (k < 1) return WOOD[1];
    c = tr > 6 ? WOOD[2] : tr < 1 ? WOOD[3] : hash(Math.floor((u + (v > 0 ? 17 : 0)) / 44), v > 0 ? 1 : 2, 6) < 0.5 ? WOOD[4] : mix(WOOD[4], WOOD[5], 0.5);
    c = mix(c, road[3], 0.28 + 0.2 * (vn(u / 6, v / 3, 5) > 0.55));
    if (e < 10 && vn(v / 4, u / 3, 9) > 0.4 + e * 0.03) c = mix(road[1], road[2], hash(u | 0, v | 0, 4));
    return c;
  }
  if (Math.abs(Math.abs(v) - (hw - 10)) < 0.6 && jj > 2 && jj < 3.2) c = IRON;   // spikes over the stringers
  if (e < 10 && vn(v / 4, u / 3, 9) > 0.4 + e * 0.03) c = mix(road[1], road[2], hash(u | 0, v | 0, 4));
  return c;
};
// the ramp at (u, v): the road itself carried up (its own pixels, read off the board under it), half-buried
// cross timbers every 16 px (their spacing follows the slope), kerb logs continuing the verge
const ramp = (sp, u, v, wide, gx, gy) => {
  const pr = sp.pr, e = u < pr.A ? pr.A - u : u - pr.B, k = ((e % 16) + 16) % 16;
  let c = sp.base(Math.round(gx), Math.round(gy));
  if (Math.abs(v) > wide - 4) { const kk = Math.abs(v) - (wide - 4); return kk < 1 ? WOOD[1] : kk < 2.5 ? WOOD[4] : kk < 3.5 ? WOOD[2] : WOOD[0]; }
  if (k < 2 && e > 6 && Math.abs(v) < wide - 5 && hash(Math.floor(e / 16), Math.floor(v / 9), 5) < 0.8) c = k < 1 ? WOOD[4] : WOOD[2];
  if (e < 3) c = WOOD[1];   // the sill where the earth meets the deck
  return c;
};

// ================================================================ THE SPAN, UP THE SCREEN
// sp: { cx, cy (art px), uN, uS (water's ends along u), kind, variant, flow (+1 east / -1 west), hw }
const spanUp = (sp, U, Fr, road, ph = 0) => {
  const { cx, cy, uN, uS, hw } = sp, pr = sp.pr, z = pr.z, ba = pr.batter;
  const bents = sp.kind === "trestle" ? bentsOf(pr, uN, uS) : [];
  const wet = sp.wet;
  const sideFace = (s) => ((s < 0) === (S.side < 0) ? "lit" : "sh");
  // --- gloom on the water hugging the strips, and the thrown shadow (both on the water / ground only)
  const shade = new Uint8Array(CW * CH);
  for (let u = pr.lo; u <= pr.hi; u += 0.5) {
    const zz = z(u); if (zz <= 0.2) continue;
    const ext = hw + ba * zz + 2;
    for (let v = -ext; v <= ext; v += 0.5) {
      const X = Math.round(cx + v + S.sh[0] * zz), Y = Math.round(cy + u + S.sh[1] * zz);
      if (X >= 0 && Y >= 0 && X < CW && Y < CH) shade[Y * CW + X] = 1;
    }
  }
  const T = S.shade;
  for (let Y = Math.round(cy + pr.lo - 50); Y < cy + pr.hi + 60; Y++) for (let X = Math.round(cx - hw - 120); X < cx + hw + 120; X++) {
    if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
    const u = Y - cy, v = Math.abs(X - cx);
    let a = 0;
    if (shade[Y * CW + X]) a = (S.gold ? 0.5 : 0.34) * (wet(X, Y) ? 1 : 0.7);
    if (wet(X, Y) && u > pr.A && u < pr.B) { const zz = z(u), g = hw + ba * zz + 10 - v; if (g > 0) a = Math.max(a, Math.min(0.5, 0.22 + g * 0.03)); }
    if (a > 0) U.p(X, Y, [T[0] * 0.6, T[1] * 0.6, T[2] * 0.8], a);
  }
  // --- the water at the feet: wakes behind the piles / piers (downstream = the flow's way)
  const footX = (s, u) => cx + s * (hw + ba * z(u) + 1);
  if (sp.kind === "trestle") for (const b of bents) for (const s of [-1, 1]) if (wet(footX(s, b), cy + b)) wake(U, footX(s, b) + (sp.flow === s ? 2 : -2), cy + b + 1, sp.flow, 0.05, s === sp.flow ? 22 : 7, ph, 2);
  if (sp.kind === "flat") for (let u = pr.A + 10; u < pr.B - 6; u += 22) for (const s of [-1, 1]) if (wet(cx + s * (hw + 3), cy + u)) wake(U, cx + s * (hw + 4) + sp.flow * 2, cy + u + 1, sp.flow, 0.05, s === sp.flow ? 14 : 5, ph, 2);
  // --- the far (north) wing walls: SOUTH faces in full elevation at deck height, stepping down outward
  const wing = (uLine, far) => {
    const zz = z(uLine), base = Math.round(cy + uLine);
    for (const s of [-1, 1]) {
      const v0 = hw + (ba ? ba * zz : 3), len = sp.kind === "hump" ? 30 : 26;
      for (let k = 0; k <= len; k++) {
        const h = Math.round(k < len * 0.6 ? zz : zz * 0.55), X = Math.round(cx + s * (v0 + k));
        for (let j = 0; j < h + (far ? 3 : 0); j++) {
          const Y = base - h + j;
          let c;
          if (sp.kind === "hump") { const row = Math.floor(j / 4), jj = j % 4, cs = Math.floor((k + (row & 1) * 4) / 8); c = jj === 3 || (k + (row & 1) * 4) % 8 === 0 ? STONE[1] : hash(cs, row, 7) < 0.4 ? STONE[2] : STONE[3]; if (hash(k, j, 9) > 0.92) c = MOSS[0]; }
          else { const row = Math.floor(j / 4), jj = j % 4; c = jj === 0 ? WOOD[4] : jj === 3 ? WOOD[1] : WOOD[3]; if (((k + row * 5) % 12) < 2 && jj > 0 && jj < 3) c = (k + row * 5) % 12 === 0 ? WOOD[5] : WOOD[2]; }   // squared logs, their ends crossing
          if (j < 2) c = j === 0 ? MOSS[1] : MOSS[0];   // the turf on the fill
          if (j >= h - 2) c = mix(c, WOOD_WET, 0.6);
          if (k === len || (k === Math.round(len * 0.6) && j < zz - h + 2)) c = INK;
          U.p(X, Y, F(c, j < 2 ? "top" : "lit"));
        }
        U.p(X, base - h - 1, INK);
        // the reflection: a darkened mirror on the water
        if (far) for (let j = 1; j <= Math.min(h, 10); j++) if (wet(X, base + 2 + j)) U.p(X, base + 2 + j, "#1c2a38", 0.35 - j * 0.03);
      }
    }
  };
  wing(sp.kind === "flat" ? uN - 3 : pr.A, true);
  // --- the flank strips, both sides: the plane from the deck edge (t 0) to the foot (t 1)
  const plane = (s, u, t) => [cx + s * (hw + ba * z(u) * t), cy + u - z(u) * (1 - t)];
  for (const s of [-1, 1]) {
    const face = sideFace(s);
    if (sp.kind === "trestle") {
      // ramps: crib walls (solid logs) in the strip; the level part: piles, knee braces, X braces, walings
      for (let u = pr.lo; u <= pr.hi; u += 0.5) {
        const zz = z(u); if (zz < 1) continue;
        const crib = u < pr.A || u > pr.B;
        if (!crib) continue;
        for (let t = 0; t <= 1; t += 0.5 / (zz + 1)) {
          const [X, Y] = plane(s, u, t), zv = zz * (1 - t), row = Math.floor(zv / 4), jj = Math.floor(zv) % 4;
          const e = u < pr.A ? pr.A - u : u - pr.B;
          let c;
          if (e < 12) { c = jj === 0 ? WOOD[2] : jj === 3 ? WOOD[4] : WOOD[3]; if (Math.round(u + row * 9) % 22 < 2 && jj > 0) c = jj === 3 ? WOOD[5] : WOOD[1]; }   // the crib box at the abutment
          else { const n = vn(u / 5, t * 3, 31); c = t < 0.15 ? MOSS[1] : n > 0.66 ? "#5e8a2e" : n < 0.3 ? "#3e6224" : "#4c7428"; if (hash(Math.round(u), Math.round(t * 9), 2) > 0.95) c = STONE[3]; }   // a turfed earth bank
          if (t > 0.92) c = EARTH[1];
          U.p(X, Y, F(c, face));
        }
      }
      // the level part: draw member by member
      const ends = [pr.A, ...bents, pr.B];
      for (let i = 0; i < ends.length - 1; i++) {
        const a = ends[i], b = ends[i + 1];
        if (b - a > 30) continue;   // the navigation bay: no X
        for (let k = 0; k <= 60; k++) {
          const f = k / 60, u = a + (b - a) * f;
          for (const [t0, t1] of [[0.12, 0.86], [0.86, 0.12]]) { const [X, Y] = plane(s, u, t0 + (t1 - t0) * f); U.p(X, Y, F(t0 < t1 ? WOOD[4] : WOOD[3], "top")); U.p(X, Y + 1, F(WOOD[1], "sh")); }
        }
      }
      // the waling along the piles, just under the cap
      for (let u = pr.A; u <= pr.B; u += 0.5) { const [X, Y] = plane(s, u, 0.22); U.p(X, Y, F(WOOD[4], face)); U.p(X, Y + 1, F(WOOD[2], face)); }
      for (const b of bents) {
        // the raked outer pile: 3 px, from the cap down to the water, lit on the sun's side, an ink line outside
        for (let t = 0.05; t <= 1.02; t += 0.02) {
          const [X0, Y0] = plane(s, b, t), X = Math.round(X0), Y = Math.round(Y0), w = wet(X, Y + 1);
          const sunL = S.side < 0;   // the sun's side is the west (left)
          U.p(X - 1, Y, w && t > 0.84 ? WOOD_WET : F(sunL ? WOOD[5] : WOOD[2], "top"));
          U.p(X, Y, w && t > 0.84 ? WOOD_WET : F(WOOD[4], "top"));
          U.p(X + 1, Y, w && t > 0.84 ? WOOD_WET : F(sunL ? WOOD[2] : WOOD[5], "top"));
          U.p(X + 2 * s, Y, INK, 0.7);
        }
        // the knee brace: from the pile up to the rail post
        const [kx, ky] = plane(s, b, 0.45), rx = cx + s * hw, ry = cy + b - z(b) - 8;
        line(U, kx, ky, rx, ry, F(WOOD[2], face)); line(U, kx, ky - 1, rx, ry - 1, F(WOOD[4], face));
        // the cap end, standing out past the deck
        for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) U.p(cx + s * (hw + i), cy + b - z(b) - 1 + j, F(i === 6 ? (j === 0 || j === 4 ? WOOD[3] : WOOD[5]) : j === 0 ? WOOD[5] : j === 4 ? WOOD[1] : WOOD[3], i === 6 ? "lit" : face));
        for (let j = -1; j < 5; j++) U.p(cx + s * (hw + 7), cy + b - z(b) - 1 + j, INK);
        U.r(Math.min(cx + s * hw, cx + s * (hw + 6)), cy + b - z(b) - 2, 7, 1, INK); U.p(cx + s * (hw + 3), cy + b - z(b) + 1, IRON);
      }
    } else if (sp.kind === "flat") {
      // vertical piles just past the deck, cap ends past them; the deck's edge beam
      for (let u = pr.A + 10; u < pr.B - 6; u += 22) {
        const zz = z(u), X = cx + s * (hw + 3), Y0 = cy + u - zz;
        pileV(U, X - 1, Y0, cy + u + 1, 3, wet(X, cy + u) ? cy + u + 1 : 1e9);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) U.p(cx + s * (hw + i), Y0 - 1 + j, F(i === 5 ? WOOD[5] : WOOD[3], i === 5 ? "lit" : face));
        U.p(cx + s * (hw + 6), Y0, INK);
      }
    } else {
      // the humpback: a battered stone spandrel; arch mouths over the water; cutwaters at the piers
      const piers = sp.piers, arches = sp.arches;
      for (let u = pr.lo; u <= pr.hi; u += 0.5) {
        const zz = z(u); if (zz < 1) continue;
        for (let t = 0; t <= 1; t += 0.4 / (zz + 1)) {
          const [X, Y] = plane(s, u, t), zv = zz * (1 - t);
          let inArch = null, rim = false;
          for (const A2 of arches) { const q = ((u - A2.c) / A2.a) ** 2 + (zv / A2.h) ** 2; if (q < 1) inArch = A2; else if (q < 1.32 && zv > 0) rim = A2; }
          let c;
          if (inArch) { c = zv < 3 ? "#2a4050" : vn(u / 3, zv / 3, 2) > 0.7 ? "#202632" : "#181c26"; }
          else if (rim) { const ang = Math.atan2(zv / rim.h, (u - rim.c) / rim.a), vs = Math.floor(ang * 8); c = (ang * 8) % 1 < 0.18 ? STONE[1] : vs & 1 ? STONE[4] : STONE[3]; }
          else { const row = Math.floor(zv / 3.5), jj = Math.floor(zv) % 4, cs = Math.floor((u + (row & 1) * 5) / 9); c = jj === 3 || Math.round(u + (row & 1) * 5) % 9 === 0 ? STONE[1] : hash(cs, row, 3) < 0.4 ? STONE[2] : STONE[3]; if (hash(cs, row, 4) > 0.9) c = MOSS[1]; }
          if (t > 0.9 && !inArch) c = mix(c, WOOD_WET, 0.5);
          U.p(X, Y, F(c, inArch ? "top" : face));
        }
      }
      // the cutwaters: a pointed pier nose out on the water, its coping lit, its south face in elevation
      for (const pu of piers) {
        const zz = z(pu), X0 = cx + s * (hw + ba * zz), Y0 = cy + pu, hgt = 10, len = 16;
        for (let k = 0; k <= len; k++) {
          const half = Math.max(0, Math.round(7 * (1 - k / len)));
          for (let j = -half; j <= half; j++) U.p(X0 + s * k, Y0 + j - hgt, F(j === -half ? STONE[5] : STONE[4], "top"));
          for (let j = 0; j < hgt; j++) U.p(X0 + s * k, Y0 + half - hgt + 1 + j, F(j > hgt - 3 ? mix(STONE[2], WOOD_WET, 0.6) : (j % 4 === 3 ? STONE[1] : STONE[3]), "lit"));
          U.p(X0 + s * k, Y0 - half - hgt - 1, INK);
        }
        if (s === sp.flow) wake(U, X0 + s * (len + 2), Y0 + 2, s, 0.03, 26, ph, 3);
      }
    }
  }
  // --- the deck: rows north to south (later rows win); planks across, their spacing set by the slope
  const pitch = sp.kind === "hump" ? 4 : 6;
  for (let u = pr.lo; u <= pr.hi; u += 0.25) {
    const zz = z(u), y0 = Math.round(cy + u - zz), y1 = Math.round(cy + u + 0.25 - z(u + 0.25));
    const slope = (z(u + 1) - z(u - 1)) / 2;   // + rising southward (the far ramp), - falling (the near)
    const step = slope > 0.05 ? -1 : slope < -0.05 ? 1 : 0;   // far ramp darker, near ramp lighter
    const foot = Math.min(u - pr.lo, pr.hi - u), wide = hw + (foot < 24 ? Math.round(8 * (1 - foot / 24)) : 0);   // the road flares into the bridgehead
    const timber = sp.kind === "flat" || (sp.kind === "trestle" && u >= pr.A && u <= pr.B);
    for (let Y = Math.min(y0, y1); Y <= Math.max(y0, y1); Y++) for (let v = -wide; v <= wide; v++) {
      const X = Math.round(cx + v);
      let c;
      if (sp.kind === "hump") {
        const row = Math.floor(u / pitch), jj = ((u % pitch) + pitch) % pitch, cs = Math.floor((v + 40 + (row & 1) * 3) / 6);
        c = jj < 0.6 || Math.round(v + 40 + (row & 1) * 3) % 6 === 0 ? STONE[1] : hash(cs, row, 11) < 0.35 ? STONE[2] : hash(cs, row, 11) < 0.8 ? STONE[3] : STONE[4];
        if (Math.abs(Math.abs(v) - 42) < 5 && hash(cs, row, 13) < 0.6 && jj > 0.6) c = mix(c, road[3], 0.45);   // the wheel ruts carry the road's dust
        if (Math.abs(v) > hw - 4) c = jj < 0.6 ? STONE[2] : STONE[4];   // the kerb setts
      } else if (timber) {
        c = plank(u, v, pitch, hw, road, sp.kind === "trestle" ? Math.min(u - pr.A, pr.B - u) : 99);
      } else {
        c = ramp(sp, u, v, wide, cx + v, cy + u);
      }
      if (sp.kind === "hump") c = mix(c, slope < 0 ? [255, 240, 210] : [40, 30, 60], Math.min(0.3, Math.abs(slope) * 0.6));
      else c = mix(c, step > 0 ? [255, 240, 210] : [40, 30, 50], step === 0 ? 0 : step > 0 ? 0.1 : 0.22);
      U.p(X, Y, F(c, "top"));
    }
    // the lit lip where the slope breaks
    if (sp.kind !== "hump" && (Math.abs(u - pr.A) < 0.13 || Math.abs(u - pr.B) < 0.13)) for (let v = -hw; v <= hw; v++) U.p(cx + v, y0, F(WOOD[5], "lit"));
    if (sp.kind === "hump" && Math.abs(u - (pr.lo + pr.hi) / 2) < 0.13) for (let v = -hw + 3; v <= hw - 3; v++) U.p(cx + v, y0, F(STONE[5], "lit"));
  }
  // --- the rails: edge-on, a 2-px line lifted by their height, post caps as dots
  const RH = sp.kind === "hump" ? 8 : sp.variant === "farm" ? 8 : 10;
  for (const s of [-1, 1]) {
    const uA = sp.kind === "trestle" ? pr.A - 4 : pr.lo + 4, uB = sp.kind === "trestle" ? pr.B + 4 : pr.hi - 4;
    for (let u = uA; u <= uB; u += 0.25) {
      const zz = z(u), X = Math.round(cx + s * (hw - 1)), Y = Math.round(cy + u - zz - RH);
      if (sp.kind === "hump") { for (let i = -1; i <= 1; i++) U.p(X + i * s, Y, F(i === -1 ? STONE[5] : i === 0 ? STONE[4] : STONE[2], i === 1 ? sideFace(s) : "top")); U.p(X + 2 * s, Y, INK); U.p(X - 2 * s, Y, INK); }
      else { U.p(X, Y, F(WOOD[5], "top")); U.p(X + s, Y, F(WOOD[2], sideFace(s))); U.p(X + 2 * s, Y, INK); U.p(X - s, Y, F(WOOD[2], "sh")); }
    }
    // posts: from the deck up to the rail, as dots (a cap) and a short dark run seen past the rail
    const posts = sp.kind === "trestle" ? [pr.A - 4, ...bents, pr.B + 4] : [];
    for (let u = uA; u <= uB && sp.kind === "flat"; u += 22) posts.push(u);
    for (const pu of posts) { const X = Math.round(cx + s * (hw - 1)), Y = Math.round(cy + pu - z(pu) - RH); U.r(X - 1, Y - 1, 3, 3, F(WOOD[5], "top")); U.r(X - 1, Y + 2, 3, 1, INK); U.p(X, Y, F(WOOD[3])); }
  }
  // the south-end posts and lanterns go to the front layer (Fr); the north ones stand behind
  const posts = (L, u, front) => {
    for (const s of [-1, 1]) {
      const X = Math.round(cx + s * (hw + 5)) - 2, Y = Math.round(cy + u);
      if (sp.kind === "hump") { for (let j = 0; j < 22; j++) for (let i = 0; i < 6; i++) L.p(X + i - 1, Y - j, F(j > 19 ? STONE[5] : (j % 5 === 4 ? STONE[1] : i < 2 ? STONE[4] : STONE[2]), i < 2 ? "lit" : "sh")); L.r(X - 2, Y - 22, 8, 1, INK); if (front) lantern(L, X + 2, Y - 23); continue; }
      const tall = sp.variant === "toll" ? 34 : sp.variant === "farm" ? 18 : 26;
      postV(L, X, Y, tall, 4);
      if (sp.variant === "toll") banner(L, X + (s > 0 ? 4 : 0), Y - tall + 4, 14, s);
      if (sp.variant !== "farm") { line(L, X + 2, Y - tall - 2, X + 2 + s * 6, Y - tall - 2, IRON); lantern(L, X + 2 + s * 6, Y - tall + 7); }
      if (sp.lamps) sp.lamps.push([X + 2 + s * 6, Y - tall + 2, front]);
    }
  };
  posts(U, pr.lo - 2, false);
  posts(Fr, pr.hi + 6, true);
};

// ================================================================ THE SPAN, ACROSS THE SCREEN
const spanAcross = (sp, U, Fr, road, ph = 0) => {
  const { cx, cy, uN, uS, hw } = sp, pr = sp.pr, z = pr.z, ba = pr.batter, wet = sp.wet;
  const bents = sp.kind === "trestle" ? bentsOf(pr, uN, uS) : [];
  const shade = new Uint8Array(CW * CH);
  for (let u = pr.lo; u <= pr.hi; u += 0.5) { const zz = z(u); if (zz <= 0.2) continue; for (let v = -hw - 4; v <= hw + ba * zz + 2; v += 0.5) { const X = Math.round(cx + u + S.sh[0] * zz), Y = Math.round(cy + v + S.sh[1] * zz); if (X >= 0 && Y >= 0 && X < CW && Y < CH) shade[Y * CW + X] = 1; } }
  const T = S.shade;
  for (let Y = Math.round(cy - hw - 60); Y < cy + hw + 90; Y++) for (let X = Math.round(cx + pr.lo - 40); X < cx + pr.hi + 120; X++) {
    if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
    let a = shade[Y * CW + X] ? (S.gold ? 0.5 : 0.34) : 0;
    const u = X - cx;
    if (wet(X, Y) && u > pr.A && u < pr.B && Y > cy - hw - 2 && Y < cy + hw + ba * z(u) + 8) a = Math.max(a, 0.5);
    if (a > 0) U.p(X, Y, [T[0] * 0.6, T[1] * 0.6, T[2] * 0.8], a);
  }
  const RH = sp.variant === "farm" ? 12 : 22;
  // a rail along the row at v, seen in elevation: a truss (toll / mill) or post and rail (farm)
  const rail = (L, v, near) => {
    const face = near ? (S.side < 0 ? "lit" : "lit") : "sh";
    const uA = sp.kind === "trestle" ? pr.A - 6 : pr.lo + 2, uB = sp.kind === "trestle" ? pr.B + 6 : pr.hi - 2;
    const panel = 18, mid = (uA + uB) / 2;
    for (let u = uA; u <= uB; u++) {
      const zz = z(u), base = Math.round(cy + v - zz), X = Math.round(cx + u);
      const rel = u - uA, e0 = Math.min(u - uA, uB - u);
      // the top chord: a heavy timber 3 px, sloping down over the end panels (the end posts lean in)
      const topH = sp.variant === "farm" ? RH : e0 < panel ? Math.round(6 + (RH - 6) * e0 / panel) : RH;
      for (let j = 0; j < 4; j++) L.p(X, base - topH + j, F(j === 0 ? WOOD[5] : j === 1 ? WOOD[4] : j === 2 ? WOOD[3] : WOOD[1], j === 0 ? "top" : face));
      L.p(X, base - topH - 1, INK);
      if (sp.variant === "farm") {
        for (let j = 0; j < 2; j++) L.p(X, base - 6 + j, F(j === 0 ? WOOD[4] : WOOD[1], face));
        if (rel % 22 < 3) for (let j = 0; j < RH; j++) L.p(X, base - j, F(rel % 22 === 0 ? WOOD[4] : rel % 22 === 2 ? WOOD[1] : WOOD[3], face));
        continue;
      }
      // verticals at every panel point (bent lines), diagonals sloping down toward the middle (a Howe truss)
      const k = ((rel % panel) + panel) % panel, pi = Math.floor(rel / panel);
      if (k < 4 && e0 > 2) for (let j = 2; j < topH; j++) { L.p(X, base - j, F(k === 0 ? WOOD[5] : k === 3 ? WOOD[1] : WOOD[3], face)); if ((k === 1 || k === 2) && (j === 4 || j === 5 || j === topH - 4 || j === topH - 3)) L.p(X, base - j, IRON); }
      if (k === 4 && e0 > 2) for (let j = 2; j < topH; j++) L.p(X, base - j, INK, 0.5);
      if (e0 >= panel) {
        const f = (k - 3) / (panel - 3), toMid = u < mid ? f : 1 - f, yy = Math.round(2 + (topH - 4) * (1 - toMid));
        if (k >= 5) for (let j = -2; j <= 0; j++) L.p(X, base - yy + j, F(j === 0 ? WOOD[1] : j === -1 ? WOOD[3] : WOOD[5], face));
      } else if (e0 > 2) {   // the end panel: a raking end post from the deck to the top chord
        const yy = Math.round(e0 * (topH / panel));
        for (let j = -1; j <= 1; j++) L.p(X, base - yy + j, F(j === -1 ? WOOD[5] : j === 1 ? WOOD[1] : WOOD[3], face));
      }
      // the bottom chord: the deck's edge beam
      for (let j = 0; j < 3; j++) L.p(X, base - 2 + j, F(j === 0 ? WOOD[5] : j === 1 ? WOOD[3] : WOOD[1], face));
    }
    if (sp.variant !== "farm") for (const u of [uA, uB]) { const X = Math.round(cx + u) - 2, base = Math.round(cy + v - z(u)); postV(L, X, base, 10, 5); }
  };
  // far rail, behind the deck
  rail(U, -hw, false);
  // the deck: planks run across (along v); their pitch along u stays (the slope shows as lift)
  const timber = (u) => sp.kind === "flat" || (u >= pr.A && u <= pr.B);
  for (let u = pr.lo; u <= pr.hi; u++) {
    const zz = z(u), X = Math.round(cx + u), slope = z(u + 1) - z(u - 1);
    const foot = Math.min(u - pr.lo, pr.hi - u), wide = hw + (foot < 24 ? Math.round(8 * (1 - foot / 24)) : 0);
    for (let v = -wide; v <= wide; v++) {
      const Y = Math.round(cy + v - zz);
      let c;
      if (timber(u)) c = plank(u, v, 6, hw, road, sp.kind === "trestle" ? Math.min(u - pr.A, pr.B - u) : 99);
      else c = ramp(sp, u, v, wide, cx + u, cy + v);
      // the ramp rising to the east (toward the sun at sunrise) lit, the other a step down
      const sl = slope * (S.side < 0 ? -1 : 1);
      if (Math.abs(slope) > 0.1) c = mix(c, sl > 0 ? [255, 240, 210] : [40, 30, 50], sl > 0 ? 0.08 : 0.14);
      U.p(X, Y, F(c, "top"));
    }
  }
  // the near face, in elevation: the stringer, the raked piles (feet at v = hw + 0.4 z), X braces, walings;
  // on the ramps, crib walls of squared logs, their ends notched
  for (let u = pr.lo; u <= pr.hi; u++) {
    const zz = z(u), X = Math.round(cx + u), top = cy + hw - zz, bot = cy + hw + ba * zz;
    if (zz < 0.5) continue;
    if (sp.kind === "flat") {   // the edge beam only; piles below
      for (let j = 0; j < 4; j++) U.p(X, Math.round(top) + j, F(j === 0 ? WOOD[5] : j === 3 ? WOOD[1] : WOOD[3], "lit"));
      continue;
    }
    if (u < pr.A || u > pr.B) {
      for (let Y = Math.round(top); Y <= Math.round(bot); Y++) {
        const zv = (bot - Y) / (1 + ba), row = Math.floor(zv / 4), jj = Math.floor(zv) % 4, e = u < pr.A ? pr.A - u : u - pr.B;
        let c;
        if (e < 12) { c = jj === 0 ? WOOD[2] : jj === 3 ? WOOD[4] : WOOD[3]; if ((u + row * 9) % 22 < 3 && jj > 0) c = jj === 3 ? WOOD[5] : WOOD[1]; if (e > 10) c = INK; }
        else { const n = vn(u / 5, Y / 3, 31); c = n > 0.66 ? "#6a9a34" : n < 0.3 ? "#4a7428" : "#5a8a30"; if (Y - Math.round(top) > 3 && Y > bot - 4) c = "#3e6224"; if (hash(u, Y, 2) > 0.96) c = STONE[3]; }
        if (Y > bot - 2) c = EARTH[1];
        const dt = Y - Math.round(top);
        if (dt < 3) c = dt === 0 ? WOOD[5] : dt === 1 ? WOOD[4] : WOOD[1];   // the kerb log along the ramp's edge
        U.p(X, Y, F(c, "lit"));
      }
      U.p(X, Math.round(bot) + 1, "#2a2a1c");
      continue;
    }
    // the stringer
    for (let j = 0; j < 6; j++) U.p(X, Math.round(top) + j, F(j === 0 ? WOOD[5] : j === 5 ? WOOD[1] : (u % 12 === 0 && j === 2) ? IRON : WOOD[3], "lit"));
    // X braces between bents (none over the navigation bay), and a waling
    const ends = [pr.A, ...bents, pr.B];
    const i = ends.findIndex((b, k) => ends[k + 1] !== undefined && u >= b && u <= ends[k + 1]);
    if (i >= 0 && ends[i + 1] - ends[i] <= 30) {
      const a = ends[i], b = ends[i + 1], f = (u - a) / (b - a), y0 = top + 7, y1 = bot - 3;
      for (const t of [f, 1 - f]) { const Y = Math.round(y0 + (y1 - y0) * t); U.p(X, Y, F(t === f ? WOOD[2] : WOOD[3], "lit")); U.p(X, Y + 1, F(WOOD[1], "sh")); }
    }
    const wy = Math.round(top + 10); U.p(X, wy, F(WOOD[4], "lit")); U.p(X, wy + 1, F(WOOD[2], "lit"));
  }
  // piles
  if (sp.kind === "trestle") for (const b of bents) { const zz = z(b), X = Math.round(cx + b) - 1, top = cy + hw - zz + 6, bot = Math.round(cy + hw + ba * zz); pileV(U, X, top, bot, 3, wet(X + 1, bot) ? bot : 1e9); if (wet(X + 1, bot)) wake(U, X + 1, bot + 2, 0, sp.flow, 18, ph, 2); }
  if (sp.kind === "flat") for (let u = pr.A + 10; u < pr.B - 6; u += 22) { const zz = z(u), X = Math.round(cx + u) - 1, bot = Math.round(cy + hw + 2); pileV(U, X, cy + hw - zz + 3, bot, 3, wet(X + 1, bot) ? bot : 1e9); if (wet(X + 1, bot)) wake(U, X + 1, bot + 2, 0, sp.flow, 12, ph, 2); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) U.p(X + i, cy + hw - zz - 2 + j, F(j === 0 ? WOOD[5] : WOOD[3], "lit")); }
  // the near rail in front of the walkers
  rail(Fr, hw, true);
  // bridgehead posts at each end, both sides
  for (const [u, front] of [[pr.lo - 4, false], [pr.hi + 4, false]]) for (const s of [-1, 1]) {
    const X = Math.round(cx + u) - 2, Y = Math.round(cy + s * (hw + 6));
    const L = s > 0 ? Fr : U, tall = sp.variant === "toll" ? 34 : sp.variant === "farm" ? 18 : 26;
    postV(L, X, Y, tall, 4);
    if (sp.variant === "toll") banner(L, X + 4, Y - tall + 4, 14, 1);
    if (sp.variant !== "farm") { line(L, X + 2, Y - tall - 2, X + 2 - 6, Y - tall - 2, IRON); lantern(L, X - 4, Y - tall + 7); if (sp.lamps) sp.lamps.push([X - 4, Y - tall + 2, s > 0]); }
  }
};

// ================================================================ the mill's sluice (the "mill" variant, up the screen)
const sluiceAcross = (sp, U, ph) => {   // the river runs down the screen: the gates stand in a row north of the deck, south faces in elevation
  const { cx, cy, uN, uS, hw } = sp, Yg = cy - hw - 64, hgt = 22, gates = 3, gw = (uS - uN + 4) / gates;
  for (let Y = Yg - 70; Y < Yg; Y++) for (let X = cx + uN - 6; X <= cx + uS + 6; X++) if (sp.wet(X, Y)) U.p(X, Y, "#284a5c", 0.4 + 0.12 * (vn(X / 8, Y / 3, 3) > 0.6));   // the millpond, still
  for (let gi = 0; gi < gates; gi++) {
    const xa = Math.round(cx + uN - 2 + gi * gw), xb = Math.round(xa + gw);
    for (let X = xa; X <= xb; X++) for (let j = 0; j < hgt; j++) {   // the gate leaf: planks, iron bands
      const edge = X - xa < 3 || xb - X < 3;
      let c = edge ? (X - xa === 0 || xb - X === 0 ? WOOD[1] : WOOD[4]) : j % 6 === 0 ? WOOD[2] : (X - xa) % 7 === 0 ? WOOD[2] : WOOD[3];
      if (!edge && (j === 5 || j === hgt - 6)) c = IRON;
      if (j > hgt - 4) c = mix(c, WOOD_WET, 0.6);
      U.p(X, Yg - hgt + j + 4, F(c, "lit"));
    }
    // the rack and winding wheel above each gate
    const mx = (xa + xb) >> 1;
    for (let j = 0; j < 12; j++) { U.p(mx, Yg - hgt - j, F(IRON)); U.p(mx + 1, Yg - hgt - j, F(WOOD[1])); }
    for (let a = 0; a < 36; a++) { const t = (a / 36) * Math.PI * 2; U.p(mx + Math.cos(t) * 5, Yg - hgt - 10 + Math.sin(t) * 5, F(WOOD[1])); }
    U.p(mx, Yg - hgt - 10, F(WOOD[5]));
    // the fall under the gate and the white water running down to the deck
    for (let k = 0; k < 30; k++) for (let X = xa + 3; X < xb - 2; X++) if (((k + ph * 6 + X * 0.3) % 5) < 3 && hash(X, k, Math.floor(ph * 6)) < 0.85 - k * 0.025) U.p(X, Yg + 5 + k, k < 4 ? "#ffffff" : "#d8ecf0", 0.9 - k * 0.025);
  }
  // the walk plank along the top
  for (let X = Math.round(cx + uN - 8); X <= cx + uS + 8; X++) for (let j = 0; j < 4; j++) U.p(X, Yg - hgt - 1 + j, F(j === 0 ? WOOD[5] : j === 3 ? WOOD[1] : WOOD[3], j === 0 ? "top" : "lit"));
};
const sluice = (sp, U, ph) => {
  const { cx, cy, uN, uS, hw } = sp, up = -sp.flow;   // the gates stand on the upstream side
  const X0 = cx + up * (hw + 26), y0 = cy + uN - 2, y1 = cy + uS + 2, hgt = 18;
  // still water above the gates: a calmer, darker sheet; white water falling below each gate
  for (let Y = Math.round(y0); Y <= y1; Y++) for (let k = 0; k < 70; k++) { const X = X0 + up * (3 + k); if (sp.wet(X, Y)) U.p(X, Y, "#284a5c", 0.35 + 0.15 * (vn(X / 10, Y / 4, 3) > 0.6)); }
  const gates = 3, gh = (y1 - y0) / gates;
  for (let gi = 0; gi < gates; gi++) {
    const ga = y0 + gi * gh;
    // the posts (south faces) and the gate leaf, a winding wheel on top
    for (let j = 0; j < Math.round(gh); j++) for (let i = 0; i < 4; i++) U.p(X0 - 2 + i, ga + j - hgt, F(i === 0 ? WOOD[4] : i === 3 ? WOOD[1] : WOOD[3], "top"));
    for (let j = 0; j < hgt; j++) for (let i = 0; i < 3; i++) U.p(X0 - 1 + i, ga + gh - 2 - hgt + j + 2, F(j % 5 === 0 ? WOOD[2] : WOOD[3], "lit"));
    const wy = ga + gh / 2 - hgt - 4;
    for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; U.p(X0 + Math.cos(t) * 2, wy + Math.sin(t) * 5, F(IRON)); }
    U.p(X0, wy, F(WOOD[5]));
    // the fall below the gate
    for (let k = 0; k < 18; k++) for (let j = 2; j < gh - 2; j++) if (((k + ph * 6 + j) % 5) < 3 && hash(k, j, Math.floor(ph * 6)) < 0.8 - k * 0.035) U.p(X0 - up * (2 + k), ga + j, k < 3 ? "#ffffff" : "#d8ecf0", 0.9 - k * 0.04);
  }
  // the walk plank along the top of the gates
  for (let Y = Math.round(y0); Y <= y1; Y++) for (let i = -3; i <= 3; i++) U.p(X0 + i, Y - hgt - 1, F(Math.abs(i) === 3 ? WOOD[1] : WOOD[4], "top"));
};

// ================================================================ figures
const figOf = (type, view) => (view ? (PIX[type].views || {})[view] || PIX[type].fig : PIX[type].fig);
const drawFig = (ctx, f) => {
  const m = figOf(f.type, f.view), clip = f.clip || "walk", n = m.CLIPS[clip].n;
  const rec = bakeFrame(m, clip, (f.f || 0) % n, { flip: !f.view && !!f.left });
  const x = Math.round(f.x), y = Math.round(f.y - (f.z || 0));
  ctx.fillStyle = `rgba(${S.shade[0]},${S.shade[1]},${S.shade[2]},${S.gold ? 0.4 : 0.3})`;
  const len = S.gold ? 8 : 0, dir = S.sh[0] > 0 ? 1 : -1;
  for (let j = -2; j <= 2; j++) { const w = Math.round(7 * Math.sqrt(1 - (j * j) / 6.5)); ctx.fillRect(x - w + (S.gold ? dir * len : 0), y + j, w * 2, 1); }
  ctx.save(); ctx.translate(x, y); if (!f.view && f.left) ctx.scale(-1, 1); ctx.drawImage(rec.cv, -rec.ox, -rec.oy); ctx.restore();
};

// ================================================================ scenes
// crop in board units; spans: which BRIDGES entry (by its x, y) gets which kind; figs in board units, or
// { span: k, u, v } (art px, the span's own frame)
export const SCENES = {
  across: { realm: "millrace", widen: { 0: 40, 1: 30 }, crop: [318, 300, 420, 260], view: "across",
    towers: [["archer", 445, 552, 3], ["wizard", 690, 400, 2]], flow: 1 },
  brook: { realm: "thornbrook", widen: { 0: 36 }, crop: [250, 300, 420, 260], view: "across",
    towers: [["archer", 560, 390, 3], ["wizard", 300, 520, 2]], flow: 1 },
  up: { realm: "wolfrun", widen: { 0: 40 }, crop: [96, 196, 400, 266], view: "up",
    towers: [["archer", 330, 236, 3]], hutAt: [1, 1], flow: 1 },
  mill: { realm: "millrace", widen: { 0: 40, 1: 34 }, crop: [130, 0, 400, 250], view: "across", towers: [["archer", 250, 230, 2]], flow: 1 },
};

export const runScene = async (name, q) => {
  await loadGame();
  const log = [];
  const [scn, kind = "trestle", variant = "toll"] = name.split(".");
  const sc = SCENES[scn];
  const sunId = q.get("sun") || "noon", dusk = q.get("dusk") === "1", ph = Number(q.get("ph") || 0);
  setDay(dusk ? "golden" : sunId); S = sunOf(dusk ? "golden" : sunId);
  const { cv, spans, g } = baseBoard({ ...sc, keepOld: kind === "today", widen: kind === "today" ? null : sc.widen }, log);
  const ctx = cv.getContext("2d");
  const [bx0, by0, bw, bh] = q.get("crop") ? q.get("crop").split(/[,_]/).map(Number) : sc.crop;
  if (kind !== "today") {
    const img = ctx.getImageData(0, 0, CW, CH);
    // a low sun: the board warmed (amber at golden hour, rose at sunrise), as the game's grade does
    if (S.gold) { const d = img.data, rose = S.id === "sunrise"; for (let o = 0; o < d.length; o += 4) { d[o] = Math.min(255, d[o] * 1.04 + 6); d[o + 1] = d[o + 1] * (rose ? 0.92 : 0.95); d[o + 2] = d[o + 2] * (rose ? 0.9 : 0.8) + (rose ? 8 : 0); } }
    const wetC = new Map();
    const wet = (X, Y) => { const k = (Y << 12) | X; let w = wetC.get(k); if (w === undefined) { w = TR.inRiver(X / 2, Y / 2); wetC.set(k, w); } return w; };
    // the spans in this crop, by view
    const mine = spans.filter((b) => b.x > bx0 - 20 && b.x < bx0 + bw + 20 && b.y > by0 - 20 && b.y < by0 + bh + 20 && (sc.view === "up" ? Math.abs(Math.cos(b.a)) < 0.3 : Math.abs(Math.cos(b.a)) > 0.7));
      const SP = mine.map((b, k) => {
      const up = sc.view === "up", cx = b.x * 2, cy = b.y * 2;
      let uN = 1e9, uS = -1e9;
      for (let u = -140; u <= 140; u++) if (wet(up ? cx : cx + u, up ? cy + u : cy)) { uN = Math.min(uN, u); uS = Math.max(uS, u); }
      const kd = q.get("hump") && k === Number(q.get("hump")) ? "hump" : kind;
      const sp = { cx, cy, uN, uS, hw: kd === "flat" ? 62 : 60, kind: kd, variant: kd === "trestle" ? (q.get("v" + k) || variant) : kd, flow: sc.flow || 1, wet, lamps: [] };
      sp.pr = profile(kd, uN, uS);
      if (kd === "hump") {   // three arches: the middle over the deepest water (the skiff's), two smaller
        const c = (uN + uS) / 2, wid = uS - uN;
        sp.arches = [{ c, a: wid * 0.24, h: 26 }, { c: c - wid * 0.42, a: wid * 0.15, h: 17 }, { c: c + wid * 0.42, a: wid * 0.15, h: 17 }];
        sp.piers = [c - wid * 0.27, c + wid * 0.27];
      }
      log.push(`span ${k} ${kd}/${sp.variant} @${b.x | 0},${b.y | 0} water u ${uN}..${uS} (${((uS - uN) / 2) | 0} units) deck ${sp.pr.lo | 0}..${sp.pr.hi | 0}`);
      return sp;
    });
    // keep the cut bank off the decks
    const skip = (X, Y) => SP.some((sp) => (sc.view === "up" ? Math.abs(X - sp.cx) < sp.hw + 40 && Y > sp.cy + sp.pr.lo - 30 && Y < sp.cy + sp.pr.hi : Math.abs(Y - sp.cy) < sp.hw + 30 && X > sp.cx + sp.pr.lo && X < sp.cx + sp.pr.hi));
    S.side = SUN_POS[S.id].side || -1;
    cutBanks(img, bx0 * 2, by0 * 2, bw * 2, bh * 2, wet, () => false);
    // the road's colours, from the road just past the crop's spans
    const rpts = [];
    for (const sp of SP) for (const k of [-1, 1]) rpts.push(sc.view === "up" ? [sp.cx / 2, (sp.cy + (k < 0 ? sp.pr.lo - 50 : sp.pr.hi + 50)) / 2] : [(sp.cx + (k < 0 ? sp.pr.lo - 50 : sp.pr.hi + 50)) / 2, sp.cy / 2]);
    const road = roadRamp(img, rpts);
    const B0 = new Uint8ClampedArray(img.data);
    for (const sp of SP) sp.base = (X, Y) => { const o = (Y * CW + X) * 4; return [B0[o], B0[o + 1], B0[o + 2]]; };
    ctx.putImageData(img, 0, 0);
    const U = new Layer(), Fr = new Layer(), Hut = new Layer();
    const lamps = [];
    for (const sp of SP) {
      if (sp.variant === "mill") (sc.view === "up" ? sluice : sluiceAcross)(sp, U, ph);
      (sc.view === "up" ? spanUp : spanAcross)(sp, U, Fr, road, ph);
      lamps.push(...sp.lamps);
    }
    // the toll hut beside the first toll span's bridgehead
    const tsp = SP.find((s) => s.variant === "toll");
    if (tsp) {
      const w = sc.view === "up" ? hut(Hut, tsp.cx + tsp.hw + 22, tsp.cy + tsp.pr.hi - 4, "w") : hut(Hut, tsp.cx + tsp.pr.lo - 66, tsp.cy - tsp.hw - 10, "e");
      lamps.push([w[0], w[1], false, true]);
      // the toll bar, raised, beside the road
      const bx = sc.view === "up" ? tsp.cx + tsp.hw + 14 : tsp.cx + tsp.pr.lo - 30, by = sc.view === "up" ? tsp.cy + tsp.pr.hi + 22 : tsp.cy - tsp.hw - 8;
      postV(Hut, bx - 2, by, 10, 4);
      line(Hut, bx, by - 8, bx + (sc.view === "up" ? -14 : 18), by - 34, F(WOOD[5]), 2); line(Hut, bx + 1, by - 9, bx + (sc.view === "up" ? -13 : 19), by - 35, "#c84a3a", 1);
    }
    // a River Watch skiff slipping out from under the strip through the navigation bay (drawn first: the strip covers its bow)
    if (sc.view === "up" && SP[1] && q.get("skiff") !== "0") { const sp = SP[1], c = (sp.uN + sp.uS) / 2; try { const m = PIX.skiff.fig, cl = m.CLIPS.idle ? "idle" : Object.keys(m.CLIPS)[0]; drawFig(ctx, { type: "skiff", x: sp.cx + sp.hw + 4, y: sp.cy + c + 10, z: 0, clip: cl }); } catch (e) { log.push("skiff: " + e.message); } }
    ctx.drawImage(U.canvas(), 0, 0);
    ctx.drawImage(Hut.canvas(), 0, 0);
    // the walkers: on the deck at its height, or on the road
    const figs = [];
    const onSpan = (k, u, v, type, o = {}) => { const sp = SP[k]; if (!sp) return; const up = sc.view === "up"; figs.push({ type, x: up ? sp.cx + v : sp.cx + u, y: up ? sp.cy + u : sp.cy + v, z: sp.pr.z(u), ...o }); };
    const ff = (q.get("figs") || "1") !== "0";
    if (ff && sc.view === "across") {
      [["goblin", -150, -18, 1], ["goblin", -100, 22, 3], ["orc", -40, 0, 2], ["goblin", 10, -24, 5], ["goblin", 40, 20, 6], ["goblin", 85, -6, 0], ["goblin", 150, 18, 4]].forEach(([t, u, v, f]) => onSpan(0, u, v, t, { f }));
      [["knight", 230, -20, 1], ["knight", 250, 14, 3]].forEach(([t, u, v, f]) => onSpan(0, u, v, t, { f, left: true }));
    }
    if (ff && sc.view === "up") {
      // span 0: the road runs SOUTH (front views); span 1: NORTH (back views)
      [["goblin", -150, -16, 1], ["goblin", -80, 20, 3], ["goblin", -20, -10, 5], ["orc", 40, 8, 2], ["goblin", 110, -22, 6], ["goblin", 170, 18, 0]].forEach(([t, u, v, f]) => onSpan(0, u, v, t, { f, view: "front" }));
      [["goblin", 150, 14, 2], ["goblin", 70, -18, 4], ["goblin", 0, 16, 1], ["goblin", -60, -8, 6], ["orc", -130, 10, 3]].forEach(([t, u, v, f]) => onSpan(1, u, v, t, { f, view: "back" }));
      [["knight", -230, -18, 1], ["knight", -230, 18, 4]].forEach(([t, u, v, f]) => onSpan(1, u, v, t, { f, view: "front" }));
    }
    figs.sort((a, b) => a.y - b.y);
    for (const f of figs) drawFig(ctx, f);
    ctx.drawImage(Fr.canvas(), 0, 0);
    // dusk: the game's night look (nightlight.js): the board darkened, lamps as pools and bloom
    if (dusk) {
      const im = ctx.getImageData(bx0 * 2 - 10, by0 * 2 - 10, bw * 2 + 20, bh * 2 + 20), d = im.data;
      for (let o = 0; o < d.length; o += 4) { const l = (d[o] + d[o + 1] + d[o + 2]) / 3; d[o] = d[o] * 0.34 + l * 0.06 + 8; d[o + 1] = d[o + 1] * 0.36 + l * 0.06 + 10; d[o + 2] = d[o + 2] * 0.52 + l * 0.08 + 30; }
      ctx.putImageData(im, bx0 * 2 - 10, by0 * 2 - 10);
      clearLamps();
      for (const [x, y, , win] of lamps) noteLamp(x / 2, y / 2, win ? 4 : 7, LAMP, win ? 0.45 : 0.6, win ? 6 : 16);
      for (const t of g.towers) noteLamp(t.x, t.y - 26, 7, "#ffb050", 0.5, 14);
      swapLamps();
      for (const [x, y, , win] of lamps) noteLamp(x / 2, y / 2, win ? 4 : 7, LAMP, win ? 0.45 : 0.6, win ? 6 : 16);
      ctx.save(); ctx.scale(2, 2); drawLampPools(ctx, 0.4); drawLampBloom(ctx, 0.4); ctx.restore();
      // the lamps' light on the water below them: a broken column of glints
      for (const [x, y] of lamps) for (let k = 0; k < 40; k++) { const Y = y + 18 + k * 2, X = x + Math.round((hash(k, x, 4) - 0.5) * 6); if (wet(X, Y) && hash(k, y, 5) < 0.6 - k * 0.012) { ctx.fillStyle = `rgba(255,200,120,${0.55 - k * 0.012})`; ctx.fillRect(X - 1, Y, 3, 1); } }
    }
  }
  // crop and upscale x2 (at most 1680 x 1120)
  const out = document.createElement("canvas"); out.width = bw * 4; out.height = bh * 4;
  const oc = out.getContext("2d"); oc.imageSmoothingEnabled = false;
  oc.drawImage(cv, bx0 * 2, by0 * 2, bw * 2, bh * 2, 0, 0, bw * 4, bh * 4);
  const label = q.get("label");
  if (label) { oc.font = "bold 24px monospace"; const w = oc.measureText(label).width; oc.fillStyle = "rgba(20,16,24,0.82)"; oc.fillRect(10, 10, w + 20, 36); oc.fillStyle = "#fff3d2"; oc.fillText(label, 20, 36); }
  return { canvas: out, log };
};
