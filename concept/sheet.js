// ============ THE CONCEPT SHEET (round 2) ============
// For the owner: Dragon's Breath lighting the foes it burns, what that light
// costs on the device in hand, Sir Aldric's faces, Wren's hood, and the cast.
// Decided in round 1: the tinted one-pixel outline, and one sun for both
// facings (a figure drawn facing left is re-lit, never mirrored light and all).
// Runs from the dev server (concept-sheet.html) and, bundled, as one page.
import { FIGS } from "./figures.js";
import { bakeClip, rimOf } from "./bake.js";

// today's rigs: one strip, 8 cells a row (walk 0-3, fight 0-3), native art pixels
const NOW = window.NOW_META;
const nowImg = new Image();
const nowReady = new Promise((ok) => { nowImg.onload = ok; nowImg.onerror = ok; });
nowImg.src = window.NOW_SRC;

const GRASS = "#82b256", GRASS_D = "#76a54e", GRASS_L = "#8fbd60", ROAD = "#c9a56e", ROAD_D = "#b08a58", ROAD_L = "#d6b680", SHADOW = "rgba(42,28,44,0.30)";
const FIRE = "#ffb040";
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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
  if (C[mode] && C[mode].loop) { const c = C[mode]; return [mode, Math.floor(((t % c.ms) / c.ms) * c.n) % c.n]; }
  const a = C[fig.atk], rest = o.rest ?? 700, T = a.ms + rest, u = t % T;
  if (u < a.ms) return [fig.atk, Math.min(a.n - 1, Math.floor((u / a.ms) * a.n))];
  const c = C.idle; return ["idle", Math.floor((((u - a.ms) % c.ms) / c.ms) * c.n) % c.n];
};
const nowPick = (mode, t) => {
  if (mode === "idle") return 0;
  if (mode === "walk") return Math.floor((t % 560) / 140) % 4;
  const u = t % 1400; return u < 700 ? 4 + [0, 1, 1, 2, 3, 3, 0][Math.floor(u / 100)] : 0;
};

// Stamp a concept figure with its feet at (x, y). dir -1: facing left, from the
// frames baked for that side (so the sun does not move). Light is extra stamps:
//   o.light false   leave its own spell's glow off
//   o.rim { from: -1 | 1, col, k }   light from screen-left / -right at strength k
const stamp = (ctx, fig, mode, t, x, y, dir = 1, o = {}) => {
  const [clip, f] = pick(fig, mode, t, o);
  const fr = bakeClip(fig, clip, { flip: dir < 0, variant: o.variant })[f];
  const lit = o.light !== false;
  if (o.sh !== 0) pxEllipse(ctx, x + dir, y, o.sh ?? 8, 2, SHADOW);
  if (fr.light && lit) { const lx = x + dir * fr.light.x, k = fr.light.k; pxEllipse(ctx, lx, y + 1, 15 * k + 4, 3.2 * k + 1, hexA(fr.light.col, 0.16 * k)); pxEllipse(ctx, lx, y + 1, 8 * k + 2, 1.8 * k + 0.6, hexA(fr.light.col, 0.2 * k)); }
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (dir < 0) ctx.scale(-1, 1);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(fr.cv, -fr.ox, -fr.oy);
  if (o.rim && o.rim.k > 0.02) { const a = ctx.globalAlpha; ctx.globalAlpha = a * o.rim.k; ctx.drawImage(rimOf(fr, [o.rim.from * dir, o.rim.up ?? -0.25], o.rim.col), -fr.ox, -fr.oy); ctx.globalAlpha = a; }
  if (lit && fr.glow) ctx.drawImage(fr.glow, -fr.ox, -fr.oy);
  if (o.fx !== false && fr.fx) ctx.drawImage(fr.fx, -fr.ox, -fr.oy);
  ctx.restore();
  return fr;
};
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
const card = (host, w, h, paint, label, sub, o = {}) => {
  const c = el("figure", "card");
  view(c, w, h, paint, { max: 4, room: () => c.clientWidth - 20, ...o });
  c.append(el("figcaption", "", `<b>${label}</b><span>${sub}</span>`));
  host.append(c); return c;
};

// ---- the jet of fire: eight looping frames, painted once, stamped --------------
// A plume from the staff's mouth down onto the road: hot at the mouth, cooling
// and tearing toward the tip. Drawn to the RIGHT here; the scene flips it.
const JET = { w: 148, h: 72, x0: 6, y0: 12, len: 134, drop: 40 };
const JCOL = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30"].map((h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
const jetY = (t) => JET.y0 + JET.drop * t ** 1.25;
const jetFrames = (() => {
  let frames = null;
  return () => {
    if (frames) return frames;
    frames = [];
    for (let f = 0; f < 8; f++) {
      const cv = el("canvas"); cv.width = JET.w; cv.height = JET.h;
      const c = cv.getContext("2d"), img = c.createImageData(JET.w, JET.h), d = img.data, ph = (f / 8) * Math.PI * 2;
      for (let i = 0; i < JET.w; i++) {
        const t = (i - JET.x0) / JET.len; if (t < 0 || t > 1.04) continue;
        const cy = jetY(t) + (Math.sin(i * 0.3 - ph * 2 + 1.3) + Math.sin(i * 0.13 - ph + 4)) * 2.2 * t;
        const wd = 2 + 14 * t ** 0.75 * (1 - 0.22 * t);
        for (let j = 0; j < JET.h; j++) {
          const u = (j + 0.5 - cy) / wd;
          let heat = (1 - u * u) * (1 - 0.86 * t ** 2.1) + 0.16 * Math.sin(i * 0.55 + j * 0.8 - ph * 3) * t + 0.1 * Math.sin(i * 0.21 - j * 0.5 - ph * 2) * t;
          heat -= u < 0 ? 0 : 0.12 * t;                                   // the underside burns out first
          if (t > 0.78 && rnd(i * 7.3 + j * 13.1 + f * 3.7) < (t - 0.78) * 1.7) continue;   // torn at the tip
          const s = heat > 0.8 ? 0 : heat > 0.6 ? 1 : heat > 0.4 ? 2 : heat > 0.22 ? 3 : heat > 0.1 ? 4 : -1;
          if (s < 0) continue;
          const k = (j * JET.w + i) * 4, col = JCOL[s];
          d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
        }
      }
      // embers thrown off the plume
      for (let e = 0; e < 22; e++) {
        const t = ((e * 0.137 + f / 8) % 1) * 0.95 + 0.05, i = Math.round(JET.x0 + JET.len * t), wd = 2 + 14 * t ** 0.75;
        const j = Math.round(jetY(t) + (rnd(e * 5.1) - 0.6) * wd * 2.4 - t * 6 * rnd(e * 9.3));
        if (i < 0 || j < 0 || i >= JET.w || j >= JET.h) continue;
        const k = (j * JET.w + i) * 4, col = JCOL[e % 3 === 0 ? 1 : 2];
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      frames.push(cv);
    }
    return frames;
  };
})();

// ---- 1. Dragon's Breath ---------------------------------------------------------
// The mage stands beside the road facing left and pours fire down onto it. Foes
// march into it: the glow reaches them first, then the jet itself, and every
// part of them that faces the fire takes its colour. All of that light is
// stamps of overlays baked beforehand, exactly as the game would do it.
const breath = () => {
  const host = $("#breath"), st = { light: true }, W = 336, H = 150, MX = 296, MY = 70;
  seg($("#breath-bar"), [["on", "Firelight on"], ["off", "off"]], (m) => (st.light = m === "on"), "on");
  const mage = FIGS.mage, probe = bakeClip(mage, "breath", { flip: true })[0].light;
  const JX = MX - probe.x - 3, JY = MY + probe.y;                       // the staff's mouth on the scene
  const ground = el("canvas"); ground.width = W; ground.height = H;
  const gc = ground.getContext("2d"); turf(gc, W, H, 5, [84, 132]);
  // the road is scorched where the breath has been falling
  for (let i = 0; i < 46; i++) { const x = 150 + rnd(i * 3.1) * 96, y = 98 + rnd(i * 7.7) * 22; pxEllipse(gc, x, y, 3 + rnd(i) * 9, 1 + rnd(i * 2) * 2.4, i % 3 ? "rgba(58,40,44,0.2)" : "rgba(42,28,36,0.26)"); }
  const foes = [["goblin", 114, 0, 26], ["orc", 108, 140, 17], ["goblin", 124, 210, 26], ["necro", 118, 300, 14], ["goblin", 106, 80, 26]].filter(([n]) => FIGS[n]);
  const SPAN = 300, HOT0 = 150, GLOW0 = 70, END = 236;
  const paint = (ctx, t) => {
    ctx.drawImage(ground, 0, 0);
    const fl = [1, 0.86, 0.94, 0.8, 1, 0.9, 0.78, 0.96][Math.floor(t / 70) % 8];   // the fire's flicker, in steps
    if (st.light) { pxEllipse(ctx, 198, 110, 66 * fl + 8, 13 * fl + 3, hexA(FIRE, 0.13)); pxEllipse(ctx, 204, 110, 44 * fl + 4, 8 * fl + 2, hexA(FIRE, 0.16)); pxEllipse(ctx, 214, 109, 22 * fl, 4 * fl + 1, hexA("#ffe08a", 0.16)); }
    // the jet, flipped to run left from the staff
    const jf = jetFrames()[Math.floor(t / 65) % 8];
    ctx.save(); ctx.translate(JX, JY); ctx.scale(-1, 1); ctx.drawImage(jf, -JET.x0, -JET.y0); ctx.restore();
    const list = [];
    for (const [n, y, off, sp] of foes) {
      const x = (((t / 1000) * sp + off) % SPAN) - 30, fig = FIGS[n];
      if (x > END + 14) continue;
      // how much of the fire reaches him: nothing far off, a glow as he nears, all of it in the jet
      const k = x < GLOW0 ? 0 : x < HOT0 ? 0.55 * ((x - GLOW0) / (HOT0 - GLOW0)) : fl;
      const kq = Math.round(k * 5) / 5;
      const burn = x > END ? clamp(1 - (x - END) / 14, 0, 1) : 1, alpha = burn > 0.75 ? 1 : burn > 0.4 ? 0.66 : 0.33;
      list.push([y, () => {
        stamp(ctx, fig, "walk", t + off * 9, x, y, 1, { sh: n === "orc" ? 11 : n === "necro" ? 9 : 6, alpha, rim: st.light ? { from: 1, col: FIRE, k: kq, up: -0.35 } : null });
        if (x > HOT0 + 6) for (let e = 0; e < 5; e++) {                   // he is alight
          const q = (t / 90 + e * 1.7 + off) % 4, ex = x - 5 + rnd(e * 3.3 + off) * 11 + Math.sin(q * 2 + e) * 1.2, ey = y - 8 - rnd(e * 5.9 + off) * (n === "orc" ? 30 : 20) - q * 2.4;
          ctx.fillStyle = q < 1.4 ? "#fff3d2" : q < 2.6 ? "#f8d868" : "#f0a040"; ctx.fillRect(ex | 0, ey | 0, q < 2 ? 2 : 1, q < 1 ? 2 : 1);
        }
      }]);
    }
    list.push([MY, () => stamp(ctx, mage, "breath", t, MX, MY, -1, { light: st.light })]);
    list.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  };
  view(host, W, H, paint, { max: 4 });
};

// ---- 2. what the light costs, measured here --------------------------------------
// The board's canvas is 1680 x 1120. Stamp 300 marching figures on one that
// size, then the same 300 with a light overlay on every one of them.
const bench = () => {
  const out = $("#bench"), btn = $("#bench-go");
  const run = () => {
    const cv = el("canvas"); cv.width = 1680; cv.height = 1120;
    const ctx = cv.getContext("2d"), N = 300, sprites = [];
    for (const fig of Object.values(FIGS)) for (const fr of bakeClip(fig, "walk", {})) sprites.push([fr, rimOf(fr, [1, -0.35], FIRE)]);
    const pass = (lit) => {
      const times = [];
      for (let it = 0; it < 14; it++) {
        const t0 = performance.now();
        ctx.fillStyle = GRASS; ctx.fillRect(0, 0, 1680, 1120);
        for (let i = 0; i < N; i++) {
          const [fr, rim] = sprites[(i * 7 + it) % sprites.length], x = (rnd(i) * 1600) | 0, y = (60 + rnd(i * 3) * 1000) | 0;
          ctx.drawImage(fr.cv, x, y);
          if (lit) { ctx.globalAlpha = 0.8; ctx.drawImage(rim, x, y); ctx.globalAlpha = 1; }
        }
        ctx.getImageData(0, 0, 1, 1);                                     // make the browser finish the drawing
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return times[times.length >> 1];
    };
    pass(false); pass(true);                                              // warm up
    const a = pass(false), b = pass(true), d = Math.max(0, b - a);
    const f1 = (v) => (v < 10 ? v.toFixed(1) : Math.round(v));
    out.innerHTML = `<div class="fact"><b>${f1(a)} ms</b>300 figures marching, no light.</div><div class="fact"><b>${f1(b)} ms</b>The same 300 with firelight on every one of them at once.</div><div class="fact"><b>+${f1(d)} ms</b>What the light added, out of the 16.7 ms a frame has. A real jet lights 10 to 30 foes, a tenth of this or less.</div>`;
  };
  btn.onclick = run;
  setTimeout(run, 600);
};

// ---- 3. Sir Aldric's face ----------------------------------------------------------
// head and shoulders, large: the face is the question
const bust = (host, fig, variant, label, sub, o = {}) => {
  const W = 38, H = 36, g = el("canvas"); g.width = W; g.height = H; turf(g.getContext("2d"), W, H, 11 + label.length);
  card(host, W, H, (ctx, t) => { ctx.drawImage(g, 0, 0); stamp(ctx, fig, "idle", t, o.dir < 0 ? 22 : 15, o.y ?? 52, o.dir ?? 1, { variant, sh: 0 }); }, label, sub, { max: 7 });
};
const faces = () => {
  const host = $("#faces"), k = FIGS.knight;
  bust(host, k, "r1", "Round 1", "the long moustache read as a flat mouth");
  for (const [v, label] of Object.entries(k.VARIANTS)) bust(host, k, v, `${v.toUpperCase()} · ${label}`, v === "c" ? "your pick: used in the rest of this page" : "&nbsp;");
};

// ---- 4. Wren's hood ------------------------------------------------------------------
const hood = () => {
  const host = $("#hood"), a = FIGS.archer;
  bust(host, a, "", "Wren", "the hunting cap and feather, auburn hair in a ponytail", { y: 53 });
  bust(host, a, "", "Facing left", "re-lit: the sun is still upper left", { y: 53, dir: -1 });
};

// ---- 5. the cast ---------------------------------------------------------------------
const cast = () => {
  const host = $("#cast"), st = { mode: "attack", light: true };
  const bar = $("#cast-bar");
  seg(bar, [["idle", "Idle"], ["walk", "Walk"], ["attack", "Attack"]], (m) => (st.mode = m), st.mode);
  seg(bar, [["on", "Spell light on"], ["off", "off"]], (m) => (st.light = m === "on"), "on");
  for (const fig of Object.values(FIGS)) {
    const { w, h, ox, oy } = fig.BOX, g = el("canvas"); g.width = w; g.height = h + 4;
    turf(g.getContext("2d"), w, h + 4, ox);
    const c = fig.CLIPS, a = c[fig.atk];
    card(host, w, h + 4, (ctx, t) => { ctx.drawImage(g, 0, 0); stamp(ctx, fig, st.mode, t, ox, oy, 1, { light: st.light, sh: fig.NAME === "orc" ? 11 : 8 }); }, fig.label, `walk ${c.walk.n} frames · ${fig.atk} ${a.n} frames`);
  }
};

// ---- 6. the road ------------------------------------------------------------------------
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

// ---- 7. today beside the concept, and at board size ----------------------------------
const compare = () => {
  const host = $("#compare"), st = { mode: "walk" };
  seg($("#compare-bar"), [["walk", "Walk"], ["attack", "Attack"]], (m) => (st.mode = m), st.mode);
  for (const fig of Object.values(FIGS)) {
    const W = 152, H = 86, fy = 76, xa = 40, xb = 106;
    const g = el("canvas"); g.width = W; g.height = H; const gc = g.getContext("2d"); turf(gc, W, H, fig.BOX.ox + 5); gc.fillStyle = "rgba(36,26,38,0.35)"; gc.fillRect(76, 0, 1, H);
    const c = el("figure", "card");
    view(c, W, H, (ctx, t) => { ctx.drawImage(g, 0, 0); pxEllipse(ctx, xa + 1, fy, 8, 2, SHADOW); stampNow(ctx, fig.now, st.mode, t, xa, fy); stamp(ctx, fig, st.mode, t, xb, fy, 1, { fx: false }); }, { max: 4, room: () => c.clientWidth - 20 });
    c.append(el("figcaption", "two", `<span><b>Today</b>${fig.nowLabel || fig.label} · 4 frames</span><span><b>Concept</b>${fig.label} · ${fig.CLIPS.walk.n} / ${fig.CLIPS[fig.atk].n} frames</span>`));
    host.append(c);
  }
};
// The board shows an art pixel at about two thirds of a CSS pixel on an iPad,
// smoothed by the browser; this strip does the same.
const board = () => {
  const host = $("#board"), names = Object.keys(FIGS), W = 60 * names.length + 20, H = 84, g = el("canvas"); g.width = W; g.height = H * 2;
  const gc = g.getContext("2d"); turf(gc, W, H * 2, 9); gc.fillStyle = "rgba(36,26,38,0.25)"; gc.fillRect(0, H, W, 1);
  const cv = el("canvas", "soft"); cv.width = W; cv.height = H * 2; cv.style.width = Math.round(W * 0.667) + "px"; cv.style.height = Math.round(H * 2 * 0.667) + "px";
  const ctx = cv.getContext("2d"); host.append(cv);
  LIVE.push({ cv, ctx, paint: (c, t) => { c.drawImage(g, 0, 0); names.forEach((n, i) => { const fig = FIGS[n], x = 40 + i * 60; pxEllipse(c, x + 1, 70, 8, 2, SHADOW); stampNow(c, fig.now, "walk", t, x, 70); stamp(c, fig, "walk", t, x, 70 + H, 1, {}); }); } });
};

// ---- go ----------------------------------------------------------------------------
const boot = async () => {
  await nowReady;
  for (const part of [breath, bench, faces, hood, cast, road, compare, board]) { try { part(); } catch (e) { console.error(e); } }
  FITS.forEach((f) => f());
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  const tick = (now) => {
    const t = still ? 640 : Math.max(0, now - t0);
    for (const v of LIVE) { if ((v.still || still) && v.done) continue; try { v.paint(v.ctx, t); } catch (e) { console.error(e); } v.done = true; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.documentElement.dataset.ready = "1";
};
boot();
