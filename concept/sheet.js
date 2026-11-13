// ============ THE CONCEPT SHEET (round 1) ============
// Lays the concept cast out for the owner: a road scene, the cast in motion,
// today's sprites beside the concepts, and the open choices. Runs from the dev
// server (concept-sheet.html) and, bundled, as one self-contained page.
import { FIGS } from "./figures.js";
import { bakeClip } from "./bake.js";

// today's rigs: one strip, 8 cells a row (walk 0-3, fight 0-3), native art pixels
const NOW = window.NOW_META;
const nowImg = new Image();
const nowReady = new Promise((ok) => { nowImg.onload = ok; nowImg.onerror = ok; });
nowImg.src = window.NOW_SRC;

const GRASS = "#82b256", GRASS_D = "#76a54e", GRASS_L = "#8fbd60", ROAD = "#c9a56e", ROAD_D = "#b08a58", ROAD_L = "#d6b680", SHADOW = "rgba(42,28,44,0.30)";
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// an ellipse in whole pixels (no soft edge)
const pxEllipse = (ctx, cx, cy, rx, ry, style) => {
  ctx.fillStyle = style;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const k = 1 - (dy / (ry + 0.25)) ** 2; if (k <= 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx) - w, Math.round(cy) + dy, w * 2 + 1, 1);
  }
};
const turf = (ctx, w, h, seed = 1, road = null) => {
  ctx.fillStyle = GRASS; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 900; i++) { const x = rnd(i + seed) * w, y = rnd(i * 3 + seed) * h; pxEllipse(ctx, x, y, 8 + rnd(i * 7) * 12, 3 + rnd(i * 5) * 3, i % 2 ? GRASS_D : GRASS_L); }
  if (road) {
    const [y0, y1] = road;
    ctx.fillStyle = ROAD; ctx.fillRect(0, y0, w, y1 - y0);
    for (let x = 0; x < w; x++) { const a = Math.round(Math.sin(x * 0.11 + seed) * 1.2 + rnd(x + seed * 9) * 1.4), b = Math.round(Math.sin(x * 0.09 + 2) * 1.2 + rnd(x + 77) * 1.4); ctx.fillStyle = GRASS_D; ctx.fillRect(x, y0 - 1, 1, 1 + a); ctx.fillStyle = ROAD_D; ctx.fillRect(x, y0 + a, 1, 1); ctx.fillStyle = ROAD_L; ctx.fillRect(x, y1 - 2 - b, 1, 1); ctx.fillStyle = GRASS; ctx.fillRect(x, y1 - 1 - b, 1, 2 + b); }
    for (let i = 0; i < w / 6; i++) { const x = rnd(i * 13 + seed) * w, y = y0 + 4 + rnd(i * 17) * (y1 - y0 - 9); ctx.fillStyle = i % 3 ? ROAD_D : ROAD_L; ctx.fillRect(x | 0, y | 0, 1 + (i % 4 === 0), 1); }
  }
  for (let i = 0; i < (w * h) / 420; i++) { const x = (rnd(i * 5 + seed) * w) | 0, y = (rnd(i * 11 + seed) * h) | 0; if (road && y > road[0] - 3 && y < road[1] + 2) continue; ctx.fillStyle = i % 3 ? "#5f9040" : "#a4cc6c"; ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 1, y + 1, 1, 1); }
};

// ---- timelines ---------------------------------------------------------------
// which frame of which clip at time t (ms): loops play on; an attack plays, then rests in the idle
const pick = (fig, mode, t, o = {}) => {
  const C = fig.CLIPS;
  if (mode === "idle" || mode === "walk") { const c = C[mode]; return [mode, Math.floor(((t % c.ms) / c.ms) * c.n) % c.n]; }
  const a = C[fig.atk], rest = o.rest ?? 700, T = a.ms + rest, u = t % T;
  if (u < a.ms) return [fig.atk, Math.min(a.n - 1, Math.floor((u / a.ms) * a.n))];
  const c = C.idle; return ["idle", Math.floor((((u - a.ms) % c.ms) / c.ms) * c.n) % c.n];
};
const nowPick = (mode, t) => {
  if (mode === "idle") return 0;
  if (mode === "walk") return Math.floor((t % 560) / 140) % 4;
  const u = t % 1400; return u < 700 ? 4 + [0, 1, 1, 2, 3, 3, 0][Math.floor(u / 100)] : 0;
};

// stamp a concept frame with its feet at (x, y); dir -1 draws it facing left, lit for that side
const stamp = (ctx, fig, mode, t, x, y, dir = 1, o = {}) => {
  const [clip, f] = pick(fig, mode, t, o);
  const fr = bakeClip(fig, clip, { flip: dir < 0 && o.rebake !== false, line: o.line, light: o.light, fx: o.fx })[f];
  pxEllipse(ctx, x + dir, y, o.sh ?? 8, 2, SHADOW);
  if (fr.light && o.light !== false) { const lx = x + dir * fr.light.x, k = fr.light.k; pxEllipse(ctx, lx, y + 1, 15 * k + 4, 3.2 * k + 1, hexA(fr.light.col, 0.16 * k)); pxEllipse(ctx, lx, y + 1, 8 * k + 2, 1.8 * k + 0.6, hexA(fr.light.col, 0.2 * k)); }
  if (dir >= 0) ctx.drawImage(fr.cv, Math.round(x) - fr.ox, Math.round(y) - fr.oy);
  else { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(fr.cv, -fr.ox, -fr.oy); ctx.restore(); }
};
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const stampNow = (ctx, type, mode, t, x, y) => {
  const m = NOW.types[type]; if (!m || !nowImg.width) return;
  const c = nowPick(mode, t);
  ctx.drawImage(nowImg, c * NOW.cw, m.row * NOW.ch, NOW.cw, NOW.ch, Math.round(x) - m.ax, Math.round(y) - m.ay, NOW.cw, NOW.ch);
};

// ---- canvases that keep whole-pixel zoom --------------------------------------
const LIVE = [], FITS = [];
addEventListener("resize", () => FITS.forEach((f) => f()));
const view = (host, w, h, paint, o = {}) => {
  const cv = el("canvas", "px"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  host.append(cv);
  const fit = () => { const room = (o.room ? o.room() : host.clientWidth) || w; const z = Math.max(o.min ?? 1, Math.min(o.max ?? 6, Math.floor(room / w))); cv.style.width = w * z + "px"; cv.style.height = h * z + "px"; };
  FITS.push(fit); fit();
  LIVE.push({ cv, ctx, paint, still: o.still, done: false });
  return cv;
};
const seg = (host, names, on, cur) => {
  const box = el("div", "seg");
  names.forEach(([id, label]) => { const b = el("button", id === cur ? "on" : "", label); b.type = "button"; b.onclick = () => { [...box.children].forEach((c) => c.classList.toggle("on", c === b)); on(id); }; box.append(b); });
  host.append(box); return box;
};

// ---- 1. the road ---------------------------------------------------------------
const road = () => {
  const host = $("#road"), W = 336, H = 132, ground = el("canvas"); ground.width = W; ground.height = H;
  turf(ground.getContext("2d"), W, H, 3, [70, 112]);
  const foes = [["goblin", 100, 0, 30], ["orc", 88, 150, 19], ["goblin", 94, 230, 30], ["necro", 104, 330, 15], ["goblin", 86, 60, 30]].filter(([n]) => FIGS[n]);
  const paint = (ctx, t) => {
    ctx.drawImage(ground, 0, 0);
    const list = [];
    for (const [n, y, off, sp] of foes) { const x = ((t / 1000) * sp + off) % (W + 90) - 45; list.push([y, () => stamp(ctx, FIGS[n], "walk", t + off * 9, x, y, 1, { sh: n === "orc" ? 11 : n === "necro" ? 9 : 6 })]); }
    list.push([52, () => stamp(ctx, FIGS.archer, "attack", t + 300, 214, 52, -1, { rest: 900 })]);
    list.push([60, () => stamp(ctx, FIGS.mage, "attack", t, 292, 60, -1, { rest: 1500 })]);
    list.push([126, () => stamp(ctx, FIGS.knight, "attack", t + 500, 262, 126, -1, { rest: 1100, sh: 9 })]);
    list.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  };
  view(host, W, H, paint, { max: 4 });
};

// ---- 2. the cast ---------------------------------------------------------------
const cast = () => {
  const host = $("#cast"), st = { mode: "attack", light: true };
  const bar = $("#cast-bar");
  seg(bar, [["idle", "Idle"], ["walk", "Walk"], ["attack", "Attack"]], (m) => (st.mode = m), st.mode);
  seg(bar, [["on", "Spell light on"], ["off", "off"]], (m) => (st.light = m === "on"), "on");
  for (const fig of Object.values(FIGS)) {
    const card = el("figure", "card"), { w, h, ox, oy } = fig.BOX, g = el("canvas"); g.width = w; g.height = h + 4;
    turf(g.getContext("2d"), w, h + 4, ox);
    view(card, w, h + 4, (ctx, t) => { ctx.drawImage(g, 0, 0); stamp(ctx, fig, st.mode, t, ox, oy, 1, { light: st.light, sh: fig.NAME === "orc" ? 11 : 8 }); }, { max: 4, room: () => card.clientWidth - 20 });
    const c = fig.CLIPS, a = c[fig.atk];
    card.append(el("figcaption", "", `<b>${fig.label}</b><span>walk ${c.walk.n} frames · ${fig.atk} ${a.n} frames</span>`));
    host.append(card);
  }
};

// ---- 3. today beside the concept ------------------------------------------------
const compare = () => {
  const host = $("#compare"), st = { mode: "walk" };
  seg($("#compare-bar"), [["walk", "Walk"], ["attack", "Attack"]], (m) => (st.mode = m), st.mode);
  for (const fig of Object.values(FIGS)) {
    const W = 152, H = 86, fy = 76, xa = 40, xb = 114;
    const g = el("canvas"); g.width = W; g.height = H; const gc = g.getContext("2d"); turf(gc, W, H, fig.BOX.ox + 5); gc.fillStyle = "rgba(36,26,38,0.35)"; gc.fillRect(76, 0, 1, H);
    const c = el("figure", "card");
    view(c, W, H, (ctx, t) => { ctx.drawImage(g, 0, 0); pxEllipse(ctx, xa + 1, fy, 8, 2, SHADOW); stampNow(ctx, fig.now, st.mode, t, xa, fy); stamp(ctx, fig, st.mode, t, xb - 8, fy, 1, { fx: false }); }, { max: 4, room: () => c.clientWidth - 20 });
    c.append(el("figcaption", "two", `<span><b>Today</b>${fig.nowLabel || fig.label} · 4 frames</span><span><b>Concept</b>${fig.label} · ${fig.CLIPS.walk.n} / ${fig.CLIPS[fig.atk].n} frames</span>`));
    host.append(c);
  }
};

// ---- 4. at board size ------------------------------------------------------------
// The board shows an art pixel at about two thirds of a CSS pixel on an iPad,
// smoothed by the browser; this strip does the same.
const board = () => {
  const st = { line: "tint" };
  seg($("#board-bar"), [["ink2", "Outline A"], ["ink", "B"], ["tint", "C"]], (m) => (st.line = m), st.line);
  const host = $("#board"), names = Object.keys(FIGS), W = 60 * names.length + 20, H = 84, g = el("canvas"); g.width = W; g.height = H * 2;
  const gc = g.getContext("2d"); turf(gc, W, H * 2, 9); gc.fillStyle = "rgba(36,26,38,0.25)"; gc.fillRect(0, H, W, 1);
  const cv = el("canvas", "soft"); cv.width = W; cv.height = H * 2; cv.style.width = Math.round(W * 0.667) + "px"; cv.style.height = Math.round(H * 2 * 0.667) + "px";
  const ctx = cv.getContext("2d"); host.append(cv);
  LIVE.push({ cv, ctx, paint: (c, t) => { c.drawImage(g, 0, 0); names.forEach((n, i) => { const fig = FIGS[n], x = 40 + i * 60; pxEllipse(c, x + 1, 70, 8, 2, SHADOW); stampNow(c, fig.now, "walk", t, x, 70); stamp(c, fig, "walk", t, x, 70 + H, 1, { line: st.line }); }); } });
};

// ---- 5. frames -------------------------------------------------------------------
const frames = () => {
  const host = $("#frames"), fig = FIGS.knight, n = fig.CLIPS.walk.n, cw = 44, H = 62;
  const a = el("figure", "card wide"), b = el("figure", "card wide");
  view(a, cw * 4, H, (ctx) => { ctx.fillStyle = GRASS; ctx.fillRect(0, 0, cw * 4, H); for (let i = 0; i < 4; i++) { if (i % 2) { ctx.fillStyle = GRASS_D; ctx.fillRect(i * cw, 0, cw, H); } pxEllipse(ctx, i * cw + 21, 54, 8, 2, SHADOW); stampNow(ctx, fig.now, "walk", i * 140 + 1, i * cw + 20, 54); } }, { max: 3, still: true, room: () => a.clientWidth - 20 });
  view(b, cw * n, H, (ctx) => { ctx.fillStyle = GRASS; ctx.fillRect(0, 0, cw * n, H); const fr = bakeClip(fig, "walk", {}); for (let i = 0; i < n; i++) { if (i % 2) { ctx.fillStyle = GRASS_D; ctx.fillRect(i * cw, 0, cw, H); } pxEllipse(ctx, i * cw + 21, 54, 8, 2, SHADOW); ctx.drawImage(fr[i].cv, i * cw + 20 - fr[i].ox, 54 - fr[i].oy); } }, { max: 3, still: true, room: () => b.clientWidth - 20 });
  a.append(el("figcaption", "", "<b>Today</b><span>a walk is 4 drawings</span>"));
  b.append(el("figcaption", "", `<b>Concept</b><span>${n} drawings, each a true in-between: the feet follow a path, the hips sink at each footfall, cape and plume trail</span>`));
  host.append(a, b);
};

// ---- 6. the choices ---------------------------------------------------------------
const choices = () => {
  const still = (host, label, sub, paint, w = 60, h = 64) => { const c = el("figure", "card"); view(c, w, h, paint, { max: 4, room: () => c.clientWidth - 20, still: !paint.live }); c.append(el("figcaption", "", `<b>${label}</b><span>${sub}</span>`)); host.append(c); };
  const bg = (ctx, w, h) => { ctx.fillStyle = GRASS; ctx.fillRect(0, 0, w, h); };
  const k = FIGS.knight, m = FIGS.mage;
  // outline weights
  const lines = $("#lines");
  for (const [mode, label, sub] of [["ink2", "A · Two-pixel ink ring", "what the game has today"], ["ink", "B · One-pixel ink", "the same dark line, half the weight"], ["tint", "C · One-pixel, tinted", "each line takes its own material's dark, lighter toward the sun"]])
    still(lines, label, sub, (ctx) => { bg(ctx, 60, 64); pxEllipse(ctx, 27, 58, 8, 2, SHADOW); const f = bakeClip(k, "idle", { line: mode })[0]; ctx.drawImage(f.cv, 26 - f.ox, 58 - f.oy); });
  // the sun
  const sun = $("#sun");
  for (const [dir, rebake, label, sub] of [[1, true, "Facing right", "sun from the upper left"], [-1, false, "Mirrored, as today", "the sun jumps to the right"], [-1, true, "Facing left, re-lit", "the sun stays where it is"]])
    still(sun, label, sub, (ctx) => { bg(ctx, 60, 64); const f = bakeClip(k, "idle", { flip: dir < 0 && rebake })[0]; pxEllipse(ctx, 30 + dir, 58, 8, 2, SHADOW); ctx.save(); ctx.translate(30, 58); ctx.scale(dir, 1); ctx.drawImage(f.cv, -f.ox, -f.oy); ctx.restore(); });
  // spell light
  const lit = $("#lit");
  for (const [on, label, sub] of [[false, "Spell light off", "the fireball is only a picture beside him"], [true, "Spell light on", "hat, beard, sleeve and the ground take the fire's colour"]]) {
    const p = (ctx, t) => { bg(ctx, 88, 70); stamp(ctx, m, "attack", t, 26, 62, 1, { light: on, rest: 500 }); }; p.live = true;
    still(lit, label, sub, p, 88, 70);
  }
};

// ---- go ----------------------------------------------------------------------------
const boot = async () => {
  await nowReady;
  road(); cast(); compare(); board(); frames(); choices();
  FITS.forEach((f) => f());
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.max(0, now - t0);
    for (const v of LIVE) { if (v.still && v.done) continue; try { v.paint(v.ctx, t); } catch (e) { console.error(e); } v.done = true; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.documentElement.dataset.ready = "1";
};
boot();
