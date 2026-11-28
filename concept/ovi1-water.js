// Iron overhaul concept round 1, panel 1: WATER (Ironford's river edges, three humpback bridges, one truly wide river).
// Lab: /ovi1-water.html?scene=today|A|B|C&sun=&realm=&x=&y=&w=&h=&zoom=&save=1&name=...  Notes: concept/ovi1-water.md
// The real engine and draw() run on the real board; the options replace the overhaul's bakeWater / bridge slots with
// the Iron versions below. Nothing under src/ is edited. ?ovh=1 must be in the page URL for an option (it switches the
// overhaul seams on for this Iron board), ?ovh=0 for TODAY.
export async function run(q, body) {
  const scene = q.get("scene") || "today", realmId = q.get("realm") || "ironford", sun = q.get("sun") || "afternoon";
  const MP = await import("/src/data/maps.js"), { selectRealm } = MP;
  const { selectFaction } = await import("/src/data/factions.js");
  const { setWaveWindow } = await import("/src/data/waves.js");
  const T = await import("/src/data/terrain.js");
  const { TOTAL_LEN, posAt, angleAt } = await import("/src/engine/path.js");
  const { updateGame } = await import("/src/engine/update.js");
  const { placeTower, upgradeTower, branchTower, buildableAt, startWave } = await import("/src/engine/actions.js");
  const { draw } = await import("/src/render/draw.js");
  const { setLevelWeather } = await import("/src/engine/weather.js");
  const { setDay } = await import("/src/data/sun.js");
  const OV = await import("/src/render/overhaul/index.js");
  setDay(sun);
  selectRealm(realmId);
  selectFaction("iron");
  setWaveWindow(null);
  if (q.get("weather")) { const [kind, str] = q.get("weather").split(":"); setLevelWeather({ kind, strength: Number(str ?? 1) }); } else setLevelWeather(null);
  const opt = scene === "today" ? null : scene;
  if (opt) await ironWater(opt, { q, MP, T, OV, sun });
  const DT = 1 / 60;
  const g = {
    run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 9999, wave: (Number(q.get("wave")) || 6) - 1, phase: "build",
    towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
    selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null, grounds: [],
    cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0,
  };
  const finish = (t) => { t.readyAt = 0; t.raised = null; };
  const placed = [];
  const spec = q.get("towers") ?? "archer@0.3:3,knight@0.45:2,wizard@0.6:2";
  if (spec && spec !== "0") for (const s of spec.split(",")) {
    const [head, br] = [s], [kd, rest] = head.split("@"), [at, lv] = rest.split(":").map(Number);
    let spot = null;
    for (let tries = 0; tries < 40 && !spot; tries++) {
      const d0 = ((at + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 0.01) % 1) * TOTAL_LEN, [rx, ry] = posAt(d0), a = angleAt(d0);
      for (let r = 24; r < 200 && !spot; r += 3) for (const sd of [1, -1]) {
        const x = rx + Math.cos(a + Math.PI / 2) * r * sd, y = ry + Math.sin(a + Math.PI / 2) * r * sd;
        if (buildableAt(g, x, y, kd)) { spot = [x, y]; break; }
      }
    }
    if (!spot) { placed.push(`${kd}: no spot`); continue; }
    placeTower(g, kd, spot[0], spot[1]); const t = g.towers[g.towers.length - 1];
    for (let l = 1; l < (lv || 1); l++) upgradeTower(g, t);
    finish(t); placed.push(`${kd}@${Math.round(spot[0])},${Math.round(spot[1])}`);
  }
  if (q.get("edgehall")) {
    const { probe } = await import("/src/render/overhaul/field.js"); let best = null;
    for (let x = 20; x < 700; x += 3) for (let y = 20; y < 540; y += 3) { const o = probe(x, y, {}); if (!o.B || o.d < 4 || o.d > 8 || !buildableAt(g, x, y, "archer")) continue; const sc = Math.abs(o.d - 5) + Math.hypot(x - 420, y - 300) * 0.02; if (!best || sc < best.sc) best = { x, y, sc, d: o.d }; }
    if (best) { placeTower(g, "archer", best.x, best.y); const t = g.towers[g.towers.length - 1]; upgradeTower(g, t); upgradeTower(g, t); finish(t); placed.push(`EDGE archer@${best.x},${best.y} ${best.d.toFixed(1)} units from the waterline`); } else placed.push("edgehall: no spot");
  }
  for (let i = 0; i < 30; i++) updateGame(g, DT);
  const hold = () => { g.lives = 9999; if (g.phase === "build") g.buildUntil = null; };
  startWave(g);
  const SECS = Number(q.get("secs") || 8);
  for (let el = 0; el < SECS; el += DT) { updateGame(g, DT); hold(); if (g.phase !== "combat") startWave(g); }
  g.shake = 0;
  const RES = 2, cv = document.createElement("canvas"); cv.width = 840 * RES; cv.height = 560 * RES;
  const t0 = performance.now(); draw(g, cv, { current: null }); const first = performance.now() - t0;
  draw(g, cv, { current: null });
  const crop = (c) => {
    const x = Number(q.get("x") || 0), y = Number(q.get("y") || 0), w = Number(q.get("w") || 840), h = Number(q.get("h") || 560), z = Number(q.get("zoom") || 1);
    const o = document.createElement("canvas"); o.width = Math.round(w * RES * z); o.height = Math.round(h * RES * z);
    const cx = o.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(c, x * RES, y * RES, w * RES, h * RES, 0, 0, o.width, o.height); return o;
  };
  const save = async (name, c) => { await fetch(`/__shot?name=${name}`, { method: "POST", body: c.toDataURL("image/png").slice(22) }); };
  const base = q.get("name") || `${realmId}_${scene}`;
  const info = [`realm ${MP.REALM.id} scene ${scene} sun ${sun} ovhOn ${OV.ovhOn()} halls ${placed.join(" ")} foes ${g.enemies.length} first draw ${first.toFixed(0)} ms`];
  if (q.get("frames")) {
    // a loop: N frames dt ms apart, cropped, laid out as a sprite sheet (cols x rows)
    const N = Number(q.get("frames")), step = Number(q.get("dt") || 100) / 1000, cols = Number(q.get("cols") || 6), rows = Math.ceil(N / cols);
    const fr = [];
    for (let i = 0; i < N; i++) {
      if (i) for (let el = 0; el < step - 1e-9; el += DT) { updateGame(g, Math.min(DT, step - el)); hold(); if (g.phase !== "combat") startWave(g); }
      g.shake = 0; draw(g, cv, { current: null }); fr.push(crop(cv));
    }
    const fw = fr[0].width, fh = fr[0].height, sh = document.createElement("canvas"); sh.width = fw * cols; sh.height = fh * rows;
    fr.forEach((f, i) => sh.getContext("2d").drawImage(f, (i % cols) * fw, Math.floor(i / cols) * fh));
    const fps = Math.round(1000 / Number(q.get("dt") || 100));
    if (q.get("save")) { await save(`ovi1_anim_water_${base}_c${cols}r${rows}_fps${fps}`, sh); await save(`ovi1_anim_water_${base}_still`, fr[0]); }
    info.push(`loop ${N} frames ${fw}x${fh} sheet ${sh.width}x${sh.height}`);
    window.__frames = fr; body.appendChild(fr[Math.floor(N / 2)]);
  } else {
    const out = crop(cv);
    if (q.get("save")) await save(`ovi1_water_${base}`, out);
    body.appendChild(out);
  }
  window.__g = g;
  return info.join("\n");
}

// =====================================================================================================
// THE OPTIONS
// =====================================================================================================
import { DAY } from "/src/data/sun.js";
import * as F0 from "/src/render/overhaul/field.js";
const { buildField, bodies, clamp, sstep, hs, vn, bay, HFACE, probe } = F0;

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pal = (...a) => a.map(hex);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// the approved water's ramp (waterlook / overhaul water.js), unchanged: the water's language is not ours to change
const WA = pal("#18384a", "#1f4a5a", "#28606c", "#33787c", "#46908a", "#68aa98", "#96c6ac");
const FOAM = hex("#f2f4e6"), FOAM2 = hex("#cfe2da"), SKY = hex("#a8ccc4");
// Iron's own materials: slate-blue masonry, cold rock, late-autumn moor turf (olive going to straw), rust bracken
const SLATE = pal("#1f2429", "#323941", "#4a535d", "#66717c", "#8794a0", "#b0bcc4");
const WARMST = pal("#3a342e", "#574d42", "#76695a", "#988a74", "#b8a98c", "#d4c8aa");
const ROCK = pal("#1c2024", "#2c3238", "#434a52", "#5d6670", "#7b858e", "#9ca6ac");
const ITURF = pal("#2a3322", "#3a4630", "#4c5a3a", "#66714a", "#848a58", "#a49e6a");
const GRAN = pal("#4a5054", "#697072", "#8a9090", "#aaaea6", "#c8cac0", "#e4e4d8");
const CAST = pal("#4e4a44", "#6e695f", "#8c8678", "#aaa392", "#c6bfab", "#e0d9c4");
const RUST = pal("#4a2a1a", "#6a3c20", "#8a5428", "#a8723a");
const MOSS = hex("#4a5a36"), WEED = hex("#34462e");

const hour = () => {
  const warm = DAY.on ? DAY.warm || 0 : 0, rose = DAY.tone === "rose";
  return { warm, tint: rose ? hex("#6a5a7a") : hex("#7a6a62"), glit: rose ? hex("#ffc0a0") : hex("#ffc870"), hot: hex(DAY.col || "#ffffff"), shadeTint: rose ? hex("#2a2050") : warm > 0.4 ? hex("#2a2050") : hex("#14262e") };
};
const faceTone = (fnx, fny) => {
  const L = DAY.L, l = Math.hypot(L[0], L[1]) || 1, lit = (fnx * L[0] + fny * L[1]) / l;
  return Math.max(1.85, 2.35 + lit * 1.45 + (fny > 0 ? 0.65 * fny : 0));
};

// ---- the edge kinds, Iron's: quay = a dressed-stone embankment wall (A), cut = rock gorge face (B), lip = moor turf,
// reeds = dead reed and bracken margin. `ST` is the option's style table.
const ST = { wall: "slate", wallH: 15, gorge: true, drains: true, apron: 14, bollards: true };

// a masonry wall's face pixel: coursed ashlar, a lit coping, joints, weed and wet at the water, a drain arch now and then
function wallFace(hf, fw, e, X, Y, s, tone, HR) {
  const PALW = ST.wall === "warm" ? WARMST : SLATE;
  if (e < 1.6) return PALW[Math.min(5, Math.round(tone + 1.8))];                      // the coping, lit from above
  if (e < 2.4) return PALW[Math.max(0, Math.round(tone - 1.8))];                      // its shadow line
  const ee = e - 2.4, ch = 3.5, row = Math.floor(ee / ch), off = (row & 1) * 6, blw = 12 + (hs(row, 0, 5) > 0.5 ? 2 : 0), bl = Math.floor((s + off) / blw);
  // a drain arch every ~64 units
  const cell = Math.floor(s / 64), ds = cell * 64 + 14 + hs(cell, 1, 9) * 30;
  if (ST.drains && fw > 10 && hs(cell, 2, 9) > 0.35) {
    const dx = (s - ds) * 2, hh = Math.min(fw - 5, 9);
    if (dx > -5 && dx < 5 && ee > fw - 2.4 - hh - 3 && ee < fw - 2.4 && (ee - (fw - 2.4 - hh - 3)) > Math.sqrt(Math.max(0, 25 - dx * dx)) * 0.0 + (dx * dx) * 0.22 - 0.5) {
      const rim = Math.abs(dx) > 4 || ee < fw - 2.4 - hh - 3 + 1.6; return rim ? PALW[Math.max(0, Math.round(tone - 1.5))] : mul(WA[0], 0.8);
    }
  }
  const joint = ee - row * ch < 0.9 || ((s + off) % blw + blw) % blw < 1;
  let ti = clamp(Math.round(tone + 0.7 + (hs(bl, row, 71) - 0.5) * 1.6 - (hf > 0.6 ? 0.5 : 0)), 1, 5);
  let c = joint ? PALW[Math.max(0, ti - 2)] : PALW[ti];
  if (!joint && hs(bl, row, 72) > 0.9) c = lerp(c, hex("#8a5a34"), 0.35);               // an iron-stained block
  if (hf > 0.7) c = lerp(c, MOSS, hf > 0.88 ? 0.7 : 0.35 * (hf - 0.7) / 0.18);          // weed, wet, at the water
  if (hf > 0.5 && !joint && hs(X, Y, 73) > 0.93) c = lerp(c, hex("#5a7a4a"), 0.5);
  if (HR.warm > 0.4 && tone > 2.6) c = lerp(c, HR.hot, 0.28 * HR.warm);
  return c;
}
// pale granite loaves (the owner's reference: white-grey boulders stepping down to the water): a cell grid, each cell a loaf
// lit on its top-left, a dark gap between; `depth` runs from the water up the bank
function loaf(s, depth, tone, X, Y) {
  const row = Math.floor(depth / 6.4), cs = s / 12 + (row & 1) * 0.5 + (hs(row, 3, 95) - 0.5) * 0.6, col = Math.floor(cs);
  const lx = cs - col, ly = depth / 6.4 - row, r = hs(col, row, 96), rx = (lx - 0.5) / (0.46 + r * 0.1), ry = (ly - 0.58) / 0.5;
  if (rx * rx + ry * ry > 1.1) return null;
  const ti = clamp(Math.round(tone - 0.3 + (1 - ly) * 1.9 - lx * 0.5 + (r - 0.5) * 1.3), 0, 5);
  let c = GRAN[ti]; if (hs(X, Y, 97) > 0.97) c = lerp(c, hex("#9aa65a"), 0.5);           // lichen
  return c;
}
function rockFace(hf, fw, e, X, Y, s, tone, HR) {
  const c = loaf(s, fw - e, tone, X, Y);
  if (!c) return mul(GRAN[0], 0.8);
  return hf > 0.86 ? lerp(c, WEED, 0.45) : c;
}
// (the old slab face, unused)
function rockFaceOld(hf, fw, e, X, Y, s, tone, HR) {
  const rim = 1.2 + vn(s / 5, 1, 81) * 2;
  if (e < rim) return ROCK[Math.min(5, Math.round(tone + 1.2))];
  if (e < rim + 1.6) return ROCK[Math.max(0, Math.round(tone - 1.6))];                  // the overhang's shade
  const band = Math.floor(hf * 3.6 + vn(s / 14, 2, 82) * 1.6), cs = Math.floor(s / (5 + (band & 1) * 3)), cr = Math.floor((e + (cs & 1) * 2) / 3.2);
  const crack = vn(s / 3.5 + band * 7, e / 6, 83);
  let ti = tone + [0.2, -0.3, 0.5, -0.6, 0.1][((band % 5) + 5) % 5] + (hs(cs, cr, 84) - 0.5) * 1.1;
  if (crack > 0.78) ti -= 1.6;                                                          // a crack
  let c = ROCK[clamp(Math.round(ti), 0, 5)];
  if (hs(cs, cr, 85) > 0.86 && fw > 7) c = lerp(c, RUST[hs(cs, cr, 86) > 0.5 ? 2 : 1], 0.45);   // iron-stained
  if (hs(X, Y, 87) > 0.965) c = lerp(c, hex("#9aa65a"), 0.55);                          // lichen
  if (hf > 0.82) c = lerp(c, WEED, hf > 0.92 ? 0.75 : 0.4);
  if (HR.warm > 0.4 && tone > 2.6) c = lerp(c, HR.hot, 0.3 * HR.warm);
  return c;
}

const KI_LIP = 0, KI_CUT = 1, KI_REEDS = 2, KI_QUAY = 3;
function paintField(Fd) {
  const { w, h, k, D, S, Q, NX, NY, BODY, KIND, KW, FW } = Fd;
  const out = new ImageData(w, h), P = out.data, HR = hour(), fall = DAY.fall, slen = DAY.on ? DAY.len || 0 : 0;
  const put = (p, c, a = 1) => { const o = p * 4; P[o] = c[0]; P[o + 1] = c[1]; P[o + 2] = c[2]; P[o + 3] = Math.round(a * 255); };
  const ax0 = Math.round(Fd.x0 * 2), ay0 = Math.round(Fd.y0 * 2);
  const PALW = ST.wall === "warm" ? WARMST : SLATE;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = j * w + i, bi = BODY[p]; if (bi < 0) continue;
    const nx = NX[p] / 127, ny = NY[p] / 127, kind = KIND[p], isNear = ny > 0.35, s = S[p] * 2;
    const sh = FW[p] / 8 + (kind === KI_LIP ? 2.4 : isNear && kind === KI_CUT ? 1.6 : isNear && kind === KI_QUAY ? 2 : 0);
    const d = D[p] - sh; if (d > 22) continue;
    const X = ax0 + i, Y = ay0 + j;
    if (d >= 0) {
      // ---- the land side ----
      if (kind === KI_QUAY && !(nx > 0.25 || ny > 0.25)) { if (d < 1.6) put(p, PALW[5]); else if (d < 2.6) put(p, PALW[2], 0.8); }
      else if (kind === KI_QUAY && d < (isNear ? ST.apron * 0.55 : ST.apron) * sstep(0.1, 0.6, KW[p] / 255)) {
        // a paved quay apron: flags in courses, a coping line at the edge, the inner edge dark
        const run = Math.floor((s + (Math.floor(d / 3) & 1) * 5) / 10), jt = ((s + (Math.floor(d / 3) & 1) * 5) % 10 + 10) % 10 < 1, jr = (d % 3) < 0.9;
        let c = PALW[3 + (hs(run, Math.floor(d / 3), 5) > 0.7 ? 1 : 0) - (hs(run, Math.floor(d / 3), 6) > 0.8 ? 1 : 0)];
        if (jt || jr) c = PALW[2]; if (d < 1) c = PALW[5]; if (d > ST.apron * (isNear ? 0.55 : 1) - 1.2) c = lerp(PALW[1], ITURF[2], 0.5);
        if (hs(X, Y, 7) > 0.94) c = lerp(c, hex("#7a8a50"), 0.45);
        const tone = faceTone(-nx, -ny); if (HR.warm > 0.4 && tone > 2.6) c = lerp(c, HR.hot, 0.16 * HR.warm);
        put(p, c);
      } else if (kind === KI_CUT && d < (13 + 13 * vn(s / 16, 5, 91)) * sstep(0.1, 0.5, KW[p] / 255)) {
        // granite tumbled up the bank, 8-20 art px wide, varying; gaps show the turf dark
        const c = loaf(s + 3, d + 1.5, faceTone(-nx, -ny) + (d > 8 ? -0.6 : 0.2), X, Y);
        if (c) put(p, c); else put(p, ITURF[0], 0.55);
      } else if (kind === KI_LIP && d < 3.5) put(p, ITURF[1], (1 - d / 3.5) * 0.42);
      else if (kind === KI_REEDS && d < 5) { const tf = hs(Math.floor(X / 2), Math.floor(Y / 2), 41); put(p, tf > 0.6 ? RUST[2] : tf > 0.3 ? hex("#6a5a30") : ITURF[1], (1 - d / 5) * 0.7); }
      continue;
    }
    // ---- the water side ----
    const e = -d, fw = FW[p] / 8;
    if (e < fw) {
      const tone = faceTone(-nx, -ny), hf = e / fw;
      put(p, kind === KI_QUAY ? wallFace(hf, fw, e, X, Y, s, tone, HR) : kind === KI_CUT ? rockFace(hf, fw, e, X, Y, s, tone, HR) : lerp(ITURF[2], ITURF[0], hf));
      continue;
    }
    const ew = e - fw;
    if (isNear && (kind === KI_CUT || kind === KI_QUAY)) {
      if (kind === KI_QUAY) { if (ew < 2) { put(p, ew < 1 ? PALW[2] : PALW[0]); continue; } }
      else if (ew < 2.2) { put(p, ew < 1 ? ROCK[4] : ew < 1.6 ? ROCK[2] : ROCK[0]); continue; }
    }
    const hard = kind === KI_CUT || kind === KI_QUAY, Bd = Fd.bodies[bi], SQ = Bd.plan.sq || 0.7;
    const qe = clamp(ew / (hard ? 16 : 22), 0, 1);
    const q = Math.min(Q[p], 0.2 + qe * 0.8 * SQ) + (vn(X / 22, Y / 12, 41) - 0.5) * 0.12;
    const idx = 6 - q * 6.2 + (bay(X, Y) - 0.5) * 0.3 + (vn(X / 7, Y / 3, 42) - 0.5) * 0.9;
    let c = WA[clamp(Math.round(idx), 0, 6)];
    const fdot = -(nx * fall[0] + ny * fall[1]);
    const Hs = hard && FW[p] === 0 ? 3 : (kind === KI_QUAY ? HFACE.quay : kind === KI_CUT ? HFACE.cut : 3) * (hard ? 0.15 + 0.85 * sstep(0, 1, KW[p] / 255) : 1);
    const shadeLen = (isNear ? 0 : Math.max(0, -ny) * Hs * 0.45) + Math.max(0, fdot) * Hs * (0.3 + slen * 0.55) + (isNear ? 3.2 : 0);
    let shade = 0;
    if (ew < shadeLen) shade = ew < shadeLen - 1.5 ? 0.66 : 0.8;
    if (kind === KI_LIP && ew < 2.2) { const tf = hs(Math.floor(X / 2), Math.floor(Y / 2), 88); c = ew < 1 + tf * 1.4 ? (tf > 0.72 ? ITURF[3] : tf > 0.35 ? ITURF[2] : lerp(ITURF[1], c, 0.35)) : lerp(mul(c, 0.8), ITURF[0], 0.3); }
    else if (kind === KI_REEDS && ew < 12) { const tf = hs(Math.floor(X / 2), Math.floor(Y / 3), 43); c = lerp(c, ew < 3 && tf > 0.4 ? RUST[1] : hex("#4a4a30"), 0.32 * (1 - ew / 12)); }
    else if (kind === KI_CUT && !isNear && ew < 1.3) c = lerp(c, FOAM2, 0.3);
    else if (kind === KI_QUAY && !isNear && ew < 2.2) c = ew < 1.1 ? WEED : lerp(c, FOAM2, 0.35);
    { const cl = vn(X / 60, Y / 22, 72 + bi); if (cl > 0.66 + bay(X, Y) * 0.08 && ew > 8) c = lerp(c, SKY, 0.16); }
    if (HR.warm > 0) c = lerp(c, HR.tint, 0.12 * HR.warm);
    if (HR.warm > 0.4 && !shade && ew > 5) {
      const g2 = vn(X / 6, Y / 1.4, 80), band = vn(X / 90, Y / 70, 81), sx = clamp(X / (840 * 2), 0, 1), wt = DAY.side < 0 ? 1 - sx : sx;
      if (band > 0.7 - wt * 0.18 && g2 > 0.86 && (Y % 2 === 0)) c = lerp(c, HR.glit, 0.55 * HR.warm);
    }
    if (shade) c = lerp(mul(c, shade), HR.shadeTint, 0.12);
    put(p, c);
  }
  return out;
}

// =====================================================================================================
// THE HUMPBACK BRIDGES: a tiny ray-caster. Each span is ONE SOLID in its own frame (u along the road, v across,
// z up), BATTERED (the flanks lean out 0.4 of their height, so up the screen they read as true narrow strips on both
// sides: art/briefs/bridges-upscreen-rule.md). Screen = (x, y - z); a pixel's ray runs y = Y + z. Baked once per span,
// two layers: back (everything under the walkers) and front (the south parapet / the gate tower, sorted with actors).
// =====================================================================================================
const ROAD = pal("#4a4438", "#675f4e", "#82796a", "#9a907c", "#b0a58e", "#c8bda4");
const BR = { WIDTH: 70, KINDS: {} };

// which solid at (u, v, z)? returns 0 empty, else a material code: 1 masonry, 2 timber, 3 pier, 4 tower, 5 slab (road under a gate)
function makeSolid(sp) {
  const U = sp.U, Wd = sp.W, Hc = sp.Hc, k = sp.up ? 0.8 : 0.5;
  const zd = (u) => (Math.abs(u) >= U / 2 ? 0 : Hc * Math.cos((u / U) * Math.PI));
  const archAt = (u) => {                         // the vault's roof height at u (null outside every arch)
    for (const a of sp.arches) { const f = (u - a.c) / a.ua; if (Math.abs(f) < 1) { const r = Math.min(a.Ha * Math.sqrt(1 - f * f), zd(u) - 3.0); return r > 0.2 ? r : null; } }
    return null;
  };
  const ruinAt = (u) => (sp.ruin && Math.abs(u - sp.ruin.c) < sp.ruin.ua);
  const zt = sp.ruin ? sp.ruin.zt : 0;
  const solid = (u, v, z) => {
    if (z <= 0.05) return 0;
    const au = Math.abs(u), av = Math.abs(v);
    // the gate tower (fortified kind): a block astride the road at one end, the gate a vault through it
    if (sp.tower) {
      const T = sp.tower, tu = u - T.c, tv = v;
      if (Math.abs(tu) <= T.du / 2 + (sp.up ? 0 : 0.4 * Math.max(0, T.h - z)) && Math.abs(tv) <= T.dv / 2 + 0.12 * Math.max(0, T.h - z)) {
        const ga = Math.abs(tv) < T.gw / 2 && z < T.gh - (Math.abs(tv) / (T.gw / 2)) ** 2 * 3.2;   // the gate's arch
        if (z <= 0.5) return 5;                                                                    // the road under it
        if (ga) return 0;
        if (z > T.h) {                                                                             // battlements ring + the walk's floor
          if (z > T.h + 2.4) return 0;
          const edge = Math.abs(tu) > T.du / 2 - 2.2 || Math.abs(tv) > T.dv / 2 - 2.2;
          if (!edge) return z <= T.h + 0.4 ? 4 : 0;
          const along = Math.abs(tu) > T.du / 2 - 2.2 ? tv : tu;
          return (Math.floor((along + 40) / 3.4) & 1) || z < T.h + 1.2 ? 4 : 0;
        }
        // a slit window on the south face (u+ face for the up span, v+ face for the across span) and the east, west faces' shade
        return 4;
      }
    }
    if (au > U / 2 + 0.01) return 0;
    const top = zd(u);
    // the timber patch: a lower deck on trestles where the arch fell
    if (ruinAt(u)) {
      const ru = sp.ruin;
      if (av <= Wd / 2 && z > zt - 1.1 && z <= zt) return 2;
      // trestle legs (posts) at the bays' ends and the middle, raked a little
      for (const pu of [ru.c - ru.ua * 0.6, ru.c, ru.c + ru.ua * 0.6]) for (const pv of [-Wd / 2 + 2.5, -Wd * 0.18, Wd * 0.18, Wd / 2 - 2.5]) {
        const lean = (z / Math.max(1, zt)) * (pv > 0 ? 0.8 : -0.8);
        if (z <= zt && Math.abs(u - pu) < 0.75 && Math.abs(v - (pv + lean)) < 0.8) return 2;
      }
      // a knee brace between the outer legs under the deck, and the rail posts and rail
      if (av > Wd / 2 - 1.4 && av <= Wd / 2 && z > zt && z <= zt + 2.6 && (Math.abs(((u - ru.c) % 5.5 + 5.5) % 5.5) < 0.9 || z > zt + 2.0)) return 2;
      return 0;
    }
    // masonry: |v| within the battered half width
    const hw = Wd / 2 + k * Math.max(0, top - z);
    if (av > hw) {
      // cutwaters: the pier noses that stand out in the water before and after the piers
      if (sp.piers && z <= sp.pierH) for (const pu of sp.piers) { const e = av - hw; if (e < 5.5 && Math.abs(u - pu) < 2.8 * (1 - e / 5.8)) return 3; }
      return 0;
    }
    // the parapet: a wall along both edges, 2.2 high, set back 0.5 so its coping reads
    if (z > top) {
      if (av >= Wd / 2 - 2.2 && z <= top + 2.4 && !(sp.ruin && ruinAt(u))) return z > top + 1.6 && av > Wd / 2 - 1.2 ? 1 : 1;
      return 0;
    }
    // the vault: void under the deck through the whole width
    const ar = archAt(u); if (ar != null && z < ar) return 0;
    // a ruined end: the fallen arch's broken teeth
    if (sp.ruin) {
      const edge = Math.abs(Math.abs(u - sp.ruin.c) - sp.ruin.ua);
      if (edge < 2.6 && z > top - 1 - hs(Math.floor(v / 3), Math.floor(u), 9) * 3.2) return 0;
    }
    return 1;
  };
  return { solid, zd, archAt, ruinAt, zt };
}

// shade one pixel of the solid: material, face (top / S / E / W / N), hit point
function shadeHit(sp, S, hit, HR, front) {
  const { X, Y, z, u, v, mat, face } = hit;
  const along = sp.up ? (face === "S" || face === "N" ? X : Y) : (face === "S" || face === "N" ? X : Y);
  const tone = (face === "top" ? 3.35 : face === "S" ? faceTone(0, 1) : faceTone(face === "E" ? 1 : -1, 0) - 0.2);
  let c;
  if (mat === 2) {                                   // weathered timber (a patch is paler than the stone's age)
    const grain = vn(u * 1.1, v * 1.1, 13);
    const WD = pal("#2a1c14", "#4a3220", "#6a4a2c", "#8a6a3e", "#a88854", "#c8a870");
    c = WD[clamp(Math.round(tone + (grain - 0.5) * 1.5 - 0.4), 1, 5)];
    if (face === "top" && Math.floor((sp.up ? v : u) * 2 / 5) % 2 === 0) c = lerp(c, WD[1], 0.35);   // plank joints
    return c;
  }
  if (face === "top") {
    // paving: staggered flags in the span's own (u, v) so the pitch opens and closes with the slope
    // the road's own larger flags (14 x 20 art px, staggered), a lighter crown band, darker ramps
    const uu = u * 2, vv = v * 2, row = Math.floor(uu / 14), off = (row & 1) * 10, col = Math.floor((vv + off) / 20);
    const joint = ((uu % 14) + 14) % 14 < 1 || (((vv + off) % 20) + 20) % 20 < 1;
    const au = Math.abs(u), crown = au < 5 ? 0.7 * (1 - au / 5) : 0, ramp = clamp(au / (sp.U / 2) - 0.55, 0, 1) * 1.6;
    let ti = tone + (hs(col, row, 61) - 0.5) * 1.1 + hit.slope + crown - ramp;
    c = ROAD[clamp(Math.round(ti), 1, 5)]; if (joint) c = ROAD[Math.max(0, clamp(Math.round(ti), 1, 5) - 2)];
    if (mat === 1 && hit.parapet) c = (hit.parapetTop ? SLATE[5] : SLATE[4]);     // the coping
    if (hs(Math.floor(uu / 2), Math.floor(vv / 2), 62) > 0.96) c = lerp(c, hex("#6a5a3a"), 0.4);  // a worn patch
    if (mat === 5) c = mul(c, 0.55);
    if (mat === 4) c = CAST[clamp(Math.round(tone + 0.4), 1, 5)];
  } else {
    // masonry faces: rubble courses in (along, z); the tower's dressed ashlar is paler and neater
    const tw = mat === 4, ch = tw ? 3.0 : 2.2, a2 = along * 2, z2 = z * 2, row = Math.floor(z2 / (ch * 2)), off = (row & 1) * (tw ? 6 : 5), blw = tw ? 14 : 9 + (hs(row, 1, 4) > 0.5 ? 3 : 0), bl = Math.floor((a2 + off) / blw);
    const joint = ((z2 % (ch * 2)) + ch * 2) % (ch * 2) < 1 || (((a2 + off) % blw) + blw) % blw < 1;
    const PALW = tw ? CAST : (sp.warm ? WARMST : SLATE);
    let ti = tone + (hs(bl, row, 71) - 0.5) * (tw ? 1.0 : 1.9) - (z < 1.6 ? 0.6 : 0);
    c = PALW[clamp(Math.round(ti), 1, 5)]; if (joint) c = PALW[Math.max(0, clamp(Math.round(ti), 1, 5) - 2)];
    if (!joint && hs(bl, row, 72) > 0.94) c = lerp(c, hex("#8a5a34"), 0.3);
    if (z < 1.8) c = lerp(c, MOSS, 0.5 * (1 - z / 1.8));                       // the wet foot
    // voussoirs: a lit ring round each arch mouth, stones radial, a keystone
    if (hit.vous) { const t = hit.vous; c = (Math.floor(t.ang * 9) % 2 === 0) ? PALW[clamp(Math.round(tone + 1.1), 1, 5)] : PALW[clamp(Math.round(tone + 0.2), 1, 5)]; if (t.key) c = PALW[5]; }
    if (hit.slit) c = mul(SLATE[0], 0.7);
  }
  return c;
}

// is the ground at (X, Y) in the span's thrown shadow? (the sun's own long shadow: DAY.fall x DAY.len a unit of height)
function castShadow(solid, local, X, Y, sp, L) {
  const f = DAY.fall, len = DAY.len || 1;
  for (let z = 0.8; z < sp.top; z += 0.9) { const [u, v] = local(X - f[0] * len * z, Y - f[1] * len * z); if (solid(u, v, z)) return true; }
  return false;
}
// bake one layer of one span: returns { cv, x0, y0, w, h } (world units)
function bakeSpan(sp, layer) {
  const { solid, zd, archAt } = sp.solidFns || (sp.solidFns = makeSolid(sp));
  const HR = hour(), L = DAY.L, ll = Math.hypot(L[0], L[1]) || 1;
  const ex = sp.up ? sp.W / 2 + 12 : sp.U / 2 + 14, ey = sp.up ? sp.U / 2 + 10 : sp.W / 2 + 12, top = sp.top + 6;
  const x0 = Math.floor(sp.cx - ex), x1 = Math.ceil(sp.cx + ex), y0 = Math.floor(sp.cy - ey - top), y1 = Math.ceil(sp.cy + ey);
  const w = (x1 - x0) * 2, h = (y1 - y0) * 2, im = new ImageData(w, h), P = im.data;
  const local = (X, Y) => (sp.up ? [Y - sp.cy, X - sp.cx] : [X - sp.cx, Y - sp.cy]);   // [u, v]
  const isFront = (u, v, z, m) => (sp.up ? m === 4 : (m === 1 || m === 2) && v > 0 && z > zd(u) - 0.01 && Math.abs(v) >= sp.W / 2 - 1.8 && !sp.ruinHere?.(u)) || m === 4 && layer === "front";
  const S = (X, y, z) => { const [u, v] = local(X, y); return solid(u, v, z); };
  const E = 0.34;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const X = x0 + (px + 0.5) / 2, Y = y0 + (py + 0.5) / 2;
    let hit = null, passedVoid = false;
    for (let z = top; z >= 0; z -= 0.25) {
      const y = Y + z, [u, v] = local(X, y), m = solid(u, v, z);
      if (!m) { const ar = archAt(u); if (z < top - 1 && ar != null && z < ar && Math.abs(v) < sp.W / 2 + 7) passedVoid = true; continue; }
      hit = { X, Y: y, z, u, v, mat: m }; break;
    }
    let col = null, alpha = 255;
    if (hit) {
      const { X: hx, Y: hy, z: hz } = hit, up = !S(hx, hy, hz + E), south = !S(hx, hy + E, hz), north = !S(hx, hy - E, hz), east = !S(hx + E, hy, hz), west = !S(hx - E, hy, hz);
      hit.face = up ? "top" : south ? "S" : east ? "E" : west ? "W" : north ? "N" : "top";
      // surface slope (screen-space normal of the top) and the parapet / voussoir / slit tags
      hit.slope = 0;
      if (hit.face === "top") { const dzx = (zd(local(hx + 0.5, hy)[0]) - zd(local(hx - 0.5, hy)[0])), dzy = (zd(local(hx, hy + 0.5)[0]) - zd(local(hx, hy - 0.5)[0])); const nx = sp.up ? 0 : -dzx, ny = sp.up ? -dzy : 0; hit.slope = (nx * L[0] + ny * L[1]) / ll * 2.6; }
      hit.parapet = hit.face === "top" && hit.mat === 1 && Math.abs(hit.v) >= sp.W / 2 - 2.2 && hit.z > zd(hit.u) + 0.5; hit.parapetTop = true;
      // voussoirs: the stones ringing an arch mouth (the face that holds the opening: a v-face across, the flank of an up span)
      if (hit.face !== "top" && hit.mat === 1 && hit.z < zd(hit.u) - 0.2) {
        const near = (du, dz) => { const [uu, vv] = [hit.u + du, hit.v]; return !solid(uu, vv, hit.z + dz) && (dz !== 0 || true) && archAt(uu) != null && hit.z + dz < archAt(uu); };
        const roof = near(0, -1.5), sideL = near(-1.5, 0), sideR = near(1.5, 0);
        if (roof || sideL || sideR) {
          let best = null; for (const a of sp.arches) if (!best || Math.abs(hit.u - a.c) < Math.abs(hit.u - best.c)) best = a;
          const ang = Math.atan2(hit.z / best.Ha, (hit.u - best.c) / best.ua);
          hit.vous = { ang: ang / 0.33, key: Math.abs(hit.u - best.c) < 0.8 && roof };
        }
      }
      if (sp.tower && hit.mat === 4 && (hit.face === "S" || hit.face === "E" || hit.face === "W")) {
        const T = sp.tower, tu = hit.u - T.c, lat = sp.up ? hit.v : hit.v;
        if (Math.abs(lat - 9) < 0.7 && hit.z > T.gh * 0.55 && hit.z < T.gh * 0.55 + 4 && hit.face === (sp.up ? "S" : "S")) hit.slit = true;
        if (Math.abs(lat + 9) < 0.7 && hit.z > T.gh * 0.55 && hit.z < T.gh * 0.55 + 4 && hit.face === "S") hit.slit = true;
      }
      col = shadeHit(sp, S, hit, HR);
      // the vault's mouth is dark: anything of the ceiling the ray found inside a vault (a face of the solid under a deck)
      if (hit.face === "top" && sp.tower && hit.mat === 5) col = mul(col, 0.8);
      const keep = layer === "front" ? (sp.up ? hit.mat === 4 : (hit.mat === 4 || (hit.mat === 1 && hit.v > 0 && hit.z > zd(hit.u) - 0.2 && hit.v >= sp.W / 2 - 1.8) || (hit.mat === 2 && hit.v > 0 && hit.z > sp.solidFns.zt + 0.2)))
                                       : (sp.up ? hit.mat !== 4 : !(hit.mat === 4 || (hit.mat === 1 && hit.v > 0 && hit.z > zd(hit.u) - 0.2 && hit.v >= sp.W / 2 - 1.8) || (hit.mat === 2 && hit.v > 0 && hit.z > sp.solidFns.zt + 0.2)));
      if (!keep) col = null;
    } else if (layer === "back" && DAY.on && !passedVoid && castShadow(solid, local, X, Y, sp, L)) {
      col = [14, 18, 34]; alpha = 82;
    } else if (passedVoid && layer === "back") {
      // water under the arch: a gloom over what is there (the lit end of a short tunnel peeks as a paler sliver)
      col = [12, 24, 36]; alpha = 120;
    }
    if (col) { const o = (py * w + px) * 4; P[o] = col[0]; P[o + 1] = col[1]; P[o + 2] = col[2]; P[o + 3] = alpha; }
  }
  if (layer === "front" && sp.tower && sp.up) {
    const T = sp.tower, fy = sp.cy + T.c + T.du / 2, put = (xw, yw, c, a = 255) => { const i = Math.floor((xw - x0) * 2), j = Math.floor((yw - y0) * 2); if (i < 0 || j < 0 || i >= w || j >= h) return; const o = (j * w + i) * 4; P[o] = c[0]; P[o + 1] = c[1]; P[o + 2] = c[2]; P[o + 3] = a; };
    const at = (v, z) => [sp.cx + v, fy - z + 0.05];
    for (const sd of [-1, 1]) {            // two torches in iron brackets, lit
      const [tx, ty] = at(sd * (T.gw / 2 + 3.5), 8);
      for (let k = 0; k < 4; k++) put(tx, ty + k * 0.5, [40, 30, 26]);
      for (const [dx, dy, c] of [[0, -0.5, [255, 214, 120]], [0, -1, [255, 150, 50]], [-0.5, -0.5, [255, 150, 50]], [0.5, -0.5, [255, 150, 50]], [0, -1.5, [255, 236, 170]], [0, -2, [230, 90, 40]]]) put(tx + dx, ty + dy, c);
      for (let a = -2; a <= 2; a += 0.5) for (let b = -2; b <= 2; b += 0.5) if (Math.hypot(a, b) < 2.4 && !(Math.abs(a) < 0.6 && b < 0.2 && b > -2.2)) { const i = Math.floor((tx + a - x0) * 2), j = Math.floor((ty + b - 1 - y0) * 2); if (i >= 0 && j >= 0 && i < w && j < h) { const o = (j * w + i) * 4; if (P[o + 3]) { P[o] = Math.min(255, P[o] + 34); P[o + 1] = Math.min(255, P[o + 1] + 20); P[o + 2] += 4; } } }
    }
    // a banner above the gate: crimson cloth, gold edge, swallow-tail, hung from a bar
    for (let bz = 0; bz < 7; bz++) for (let bv = -3.5; bv < 3.5; bv += 0.5) {
      if (bz > 4.5 && Math.abs(bv) < (bz - 4.5) * 1.6) continue;
      const [bx, by] = at(bv, T.gh + 2.5 + (6 - bz)), edge = Math.abs(bv) > 3.1 || bz < 0.5;
      put(bx, by, edge ? [214, 168, 70] : (Math.abs(bv) < 0.5 ? [196, 60, 52] : [168, 38, 36]));
    }
    for (let bv = -4; bv <= 3.5; bv += 0.5) put(sp.cx + bv, fy - T.gh - 9.2, [52, 38, 28]);
  }
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").putImageData(im, 0, 0);
  return { cv, x0, y0, w: w / 2, h: h / 2 };
}

// ---------------------------------------------------------------------------------------------------
// the span plans, the slots, the bake
// ---------------------------------------------------------------------------------------------------
async function liveModule() {
  // the game's approved live water (flow dashes, foam at the faces' feet, rings), with its bridge-pier import cut to
  // OUR piers (a blob copy: the same field.js / world.js instances, nothing under src/ edited)
  let src = await (await fetch("/src/render/overhaul/waterlive.js")).text();
  src = src.replace(/from "(\/[^"]+)"/g, (m, p) => `from "${location.origin}${p}"`);
  src = src.replace(/import \{ ovhBridgePiers \} from "[^"]+";/, 'const ovhBridgePiers = () => (globalThis.__OVI1_PIERS ? globalThis.__OVI1_PIERS() : []);');
  return import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
}
const boardRect = () => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const B of bodies()) { x0 = Math.min(x0, B.box[0]); y0 = Math.min(y0, B.box[1]); x1 = Math.max(x1, B.box[2]); y1 = Math.max(y1, B.box[3]); }
  return [Math.max(-2, Math.floor(x0)), Math.max(-2, Math.floor(y0)), Math.min(842, Math.ceil(x1)), Math.min(562, Math.ceil(y1))];
};
const toCanvas = (img) => { const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; cv.getContext("2d").putImageData(img, 0, 0); return cv; };
const setPx = (Fd, img, X, Y, c, a = 255) => { const i = Math.round(X) - Math.round(Fd.x0 * 2), j = Math.round(Y) - Math.round(Fd.y0 * 2); if (i < 0 || j < 0 || i >= Fd.w || j >= Fd.h) return; const o = (j * Fd.w + i) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = a; };
// a boulder standing in the water: a loaf lit from the sun's side, a shaded east shoulder, foam at its south foot
function boulder(Fd, img, X, Y, rx, ry, seed) {
  const tl = DAY.side < 0 ? 1 : -1;
  for (let dy = -ry - 1; dy <= ry + 1; dy++) for (let dx = -rx - 1; dx <= rx + 1; dx++) {
    const r = Math.hypot(dx / (rx + 0.5), dy / (ry + 0.5)); if (r > 1 + (hs(dx, dy, seed) - 0.5) * 0.25) continue;
    const lit = (-dy / ry) * 0.6 + (-dx * tl / rx) * 0.5, ti = clamp(Math.round(2.4 + lit * 2 + (hs(dx, dy, seed + 1) - 0.5) * 0.8), 0, 5);
    setPx(Fd, img, X + dx, Y + dy, r > 0.82 ? ROCK[Math.max(0, ti - 2)] : ROCK[ti]);
  }
  for (let dx = -rx - 1; dx <= rx + 1; dx++) if (hs(dx, 1, seed + 2) > 0.3) setPx(Fd, img, X + dx, Y + ry + 1, hs(dx, 2, seed + 3) > 0.5 ? FOAM : FOAM2);
}
// static dressing along a body: bollards and a stair on a quay, boulders in a gorge, mid-stream rocks in the wide river
function dress(Fd, img, optId) {
  for (const [bi, B] of Fd.bodies.entries()) {
    if (B.type !== "river") continue;
    const o = {};
    for (let s = 14; s < B.total; s += optId === "C" ? 34 : 46) {
      F0.lineAt(B, s, o);
      const cell = Math.floor(s / 46);
      if (optId === "A") {
        for (const side of [1, -1]) {
          const nx = -o.uy * side, ny = o.ux * side, k = probe(o.x + nx * (o.hw + 4), o.y + ny * (o.hw + 4), {}); if (!k.B || k.kind !== "quay" || hs(cell, side, 12) < 0.45) continue;
          // a bollard on the paved apron: an iron post with a lit cap, a ring
          const bx = (o.x + nx * (o.hw + 5.2)) * 2, by = (o.y + ny * (o.hw + 5.2)) * 2;
          for (const [dx, dy, c] of [[0, 0, SLATE[3]], [0, 1, SLATE[1]], [0, 2, SLATE[0]], [-1, 1, SLATE[2]], [1, 1, SLATE[0]], [0, -1, SLATE[5]]]) setPx(Fd, img, bx + dx, by + dy, c);
        }
      } else if (optId === "B") {
        for (const side of [1, -1]) if (hs(cell, side, 14) > 0.3) {
          const nx = -o.uy * side, ny = o.ux * side, t = o.hw - 2.2 + hs(cell, side, 15) * 1.2; boulder(Fd, img, (o.x + nx * t) * 2, (o.y + ny * t) * 2, 3 + Math.floor(hs(cell, side, 16) * 3), 2 + Math.floor(hs(cell, side, 17) * 2), cell * 7 + side);
        }
      } else if (optId === "C" && hs(cell, 3, 18) > 0.62) {
        const t = (hs(cell, 4, 19) - 0.5) * o.hw * 0.9;   // rocks and a shoal standing mid-river
        const bx = (o.x - o.uy * t) * 2, by = (o.y + o.ux * t) * 2; boulder(Fd, img, bx, by, 2 + Math.floor(hs(cell, 5, 20) * 3), 2, cell * 5);
        for (let q = 0; q < 8; q++) if (hs(cell, q, 21) > 0.35) setPx(Fd, img, bx + 3 + q + o.ux * 2, by + 2 + o.uy * 2 + (q & 1), FOAM2);   // its wake trails downstream
      }
    }
  }
}
const STATE = { Fd: null, live: null, sp: [], opt: null };
function bakeIron(ctx) {
  STATE.live.buildLive(null);
  if (!bodies().length) return;
  const [x0, y0, x1, y1] = boardRect(), Fd = buildField(x0, y0, x1, y1, 2), img = paintField(Fd);
  dress(Fd, img, STATE.opt);
  if (STATE.opt === "C" && STATE.realm === "coldwater") for (const [cx, cy, sg] of [[499, 338, -1], [499, 396, 1]]) for (let k = 0; k < 7; k++) {   // the T-junction's inside corners: a shoal of rocks and pale shallows rounds them
    const a = k * 0.5 * sg, X = (cx + 3 + Math.cos(a) * 5 * (k % 2 ? 1 : 0.6)) * 2, Y = (cy + sg * (k * 1.3) + Math.sin(a) * 2) * 2;
    boulder(Fd, img, X, Y, 2 + (k % 3), 2, 300 + k * 3 + sg);
  }
  for (const sp of STATE.sp) if (sp.ruin) for (const sg of [-1, 1]) for (const [dv, du] of [[-1, 1.2], [1, 0.4], [-0.45, 1.9], [0.5, 2.4]]) {
    const u = sp.ruin.c + sg * (sp.ruin.ua + du), v = (dv * (sp.W / 2 + 5)) + (dv < 0 ? -2 : 2), X = (sp.up ? sp.cx + v : sp.cx + u) * 2, Y = (sp.up ? sp.cy + u : sp.cy + v) * 2;
    boulder(Fd, img, X, Y, 3 + (du > 1 ? 1 : 0), 2, Math.floor(u * 3 + v));
  }
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(toCanvas(img), x0, y0, Fd.w / 2, Fd.h / 2); ctx.imageSmoothingEnabled = sm;
  STATE.live.buildLive(Fd, img);
}

// the span plans: kind per bridge (plain | fort | ruin), measured from the river at each span
function planSpans(env, kinds, wideK) {
  const { T } = env, o = {}, out = [];
  T.BRIDGES.forEach((b, i) => {
    const up = Math.abs(Math.sin(b.a)) > 0.7, k = kinds[i] || "plain";
    const pr = probe(b.x, b.y, o), hw = pr.B ? pr.hw : 17;
    const clear = hw * 2, n = clear > 48 ? 3 : 1, ua = n === 1 ? hw + 3 : (clear / 3) / 2 + 2;
    const U = Math.max(b.d1 - b.d0, n === 1 ? 2 * ua + 22 : n * 2 * ua + (n - 1) * 5 + 22);
    const Hc = n === 1 ? 10 : 11.5, Ha = Hc - 3.6;
    const arches = [], piers = [];
    for (let a = 0; a < n; a++) { const c = (a - (n - 1) / 2) * (2 * ua + 5); arches.push({ c, ua, Ha: n === 1 ? Ha : Ha - (a === 1 ? 0 : 0.8) }); }
    for (let a = 0; a < n - 1; a++) piers.push((a - (n - 2) / 2) * (2 * ua + 5));
    const sp = { cx: b.x, cy: b.y, up, U, W: 60, Hc, arches, piers: n > 1 ? piers : null, pierH: 3.4, kind: k, hw, warm: false, top: Hc + 6 };
    if (k === "ruin") { const m = arches[Math.floor(n / 2)]; sp.ruin = { c: m.c, ua: Math.min(m.ua - 3, 15), zt: Hc - 3.2 }; }
    if (k === "fort") { sp.tower = up ? { c: -(U / 2 + 9), du: 17, dv: 54, h: 26, gw: 26, gh: 15 } : { c: U / 2 + 11, du: 22, dv: 44, h: 18, gw: 28, gh: 12 }; sp.top = 26 + 8; }
    out.push(sp);
  });
  return out;
}

export async function ironWater(opt, env) {
  const { q, MP, T, OV } = env, id = MP.REALM.id;
  STATE.live = await liveModule(); STATE.opt = opt; STATE.realm = MP.REALM.id; globalThis.__OVI1 = STATE;
  // today's seams stay for everything but water and bridges (the meadow, trees and farm are the Greenwood's, not ours)
  for (const n of ["ground", "groundMarks", "owns", "drawDecor", "shadowItem", "shadowExtras", "drawables", "over", "apronGround", "overCastle", "frame"]) OV.register(n, null);
  OV.OVH.flags.hem = true; OV.OVH.flags.butterflies = true; OV.OVH.flags.bridgeCast = false;
  OV.register("key", () => `ovi1${opt}${DAY.id}${id}`);
  const B = bodies(), wide = opt === "C" ? 2.2 : 1.25;
  if (wide !== 1) for (const b of B) if (b.type === "river") { for (const sg of b.segs) { sg.hw1 *= wide; sg.hw2 *= wide; } b.hwMax *= wide; const m = (wide - 1) * b.hwMax / wide; b.box = [b.box[0] - m, b.box[1] - m, b.box[2] + m, b.box[3] + m]; }
  // edge plans: one main kind a stretch
  const at = (b) => { const r = probe(b.x, b.y, {}); return { s: r.s, B: r.B }; };
  const spans = T.BRIDGES.map(at);
  B.forEach((b, bi) => {
    if (b.type !== "river") return;
    const near = spans.filter((s) => s.B === b).map((s) => s.s), P = { def: "lip", flow: 1, faceMax: 13, sq: 0.68, zones: [] };
    if (opt === "A") { P.def = "quay"; P.faceMax = 24; P.sq = 0.7; }
    if (opt === "B") { P.def = "cut"; P.faceMax = 26; P.sq = 0.75; }
    if (opt === "C") { P.def = "lip"; P.faceMax = 15; P.sq = 0.8; for (const s of near) P.zones.push({ bank: "S", from: s - 90, to: s + 90, kind: "quay" }); P.zones.push({ bank: "N", from: -500, to: 140, kind: "reeds" }); }
    b.plan = P;
  });
  HFACE.quay = opt === "A" ? 22 : 14; HFACE.cut = opt === "B" ? 24 : 14;
  ST.wall = opt === "A" ? "slate" : "warm";
  // the bridges
  const defKinds = { A: { 0: "plain", 1: "plain", 2: "plain" }, B: { 0: "plain", 1: "fort", 2: "plain" }, C: { 0: "ruin", 1: "plain", 2: "plain" } }[opt];
  const kinds = { ...defKinds }; const bk = q.get("bk"); if (bk) for (const p of bk.split(",")) { const [i, k] = p.split(":"); kinds[+i] = { plain: "plain", fort: "fort", ruin: "ruin" }[k]; }
  STATE.sp = planSpans(env, kinds);
  const SPR = new Map(); let lastDay = null;
  const sprite = (i, layer) => { const key = `${i}${layer}${DAY.id}`; if (!SPR.has(key)) SPR.set(key, bakeSpan(STATE.sp[i], layer)); return SPR.get(key); };
  globalThis.__OVI1_PIERS = () => STATE.sp.flatMap((sp) => (sp.piers || []).flatMap((pu) => [1, -1].map((sgn) => ({ x: sp.up ? sp.cx + sgn * (sp.W / 2 + 3) : sp.cx + pu, y: sp.up ? sp.cy + pu : sp.cy + sgn * (sp.W / 2 + 3), r: 2.2 }))));
  OV.register("bakeWater", bakeIron);
  OV.register("waterLive", (ctx, g) => STATE.live.drawLive(ctx, g));
  OV.register("bridgesBack", (ctx, g) => { STATE.sp.forEach((sp, i) => { const s = sprite(i, "back"); ctx.drawImage(s.cv, s.x0, s.y0, s.w, s.h); }); });
  OV.register("bridgeFronts", (list, ctx) => {
    STATE.sp.forEach((sp, i) => {
      const s = sprite(i, "front");
      // an across span's south parapet sorts at its ground line; the up span's gate tower at its south face
      const key = sp.up ? (sp.tower ? sp.cy + sp.tower.c + sp.tower.du / 2 : sp.cy) : sp.cy + sp.W / 2;
      list.push({ y: key, fn: () => ctx.drawImage(s.cv, s.x0, s.y0, s.w, s.h) });
    });
  });
  OV.register("deckLift", (x, y) => { for (const sp of STATE.sp) { const { zd } = sp.solidFns || (sp.solidFns = makeSolid(sp)); const u = sp.up ? y - sp.cy : x - sp.cx, v = sp.up ? x - sp.cx : y - sp.cy; if (Math.abs(u) < sp.U / 2 && Math.abs(v) < sp.W / 2 + 3) { if (sp.ruin && Math.abs(u - sp.ruin.c) < sp.ruin.ua) return sp.ruin.zt; return zd(u); } } return 0; });
  OV.register("drawnSpans", () => STATE.sp.map((sp) => ({ x: sp.cx, y: sp.cy, a: sp.up ? Math.PI / 2 : 0, d0: -sp.U / 2, d1: sp.U / 2 })));
  OV.register("openWater", () => false);
  OV.register("apronRiver", () => {});
}
