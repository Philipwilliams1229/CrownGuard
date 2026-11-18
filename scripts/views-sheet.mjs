// The views contact sheet (2026-11-18, the advisor's study): every figure with views switched on, its
// side walk, FRONT and BACK in rows, BOARD SIZE FIRST (one art pixel to one screen pixel, the size the
// player sees: look there before anything else), then the same frames at `zoom`. Frames that
// scripts/views-check.mjs fails are boxed in red, and its faults are listed under the figure.
// Writes .shots/views-sheet/index.html + one PNG a figure. Open the page in the built-in browser,
// or Read a PNG.
//   node scripts/views-sheet.mjs [only=goblin,orc] [fails=1] [zoom=3]
//   fails=1 shows only the figures the checker fails or warns on (it runs the checker itself)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { listTypes, loadFig, bakeRec, png, ROOT } from "./lib/views-cases.mjs";
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const Z = Number(q.zoom) || 3, OUT = ROOT + "/.shots/views-sheet";
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(OUT + "/" + f);

// the checker's verdicts
const jf = OUT + "/check.json";
try { execFileSync("node", [ROOT + "/scripts/views-check.mjs", "quiet=1", "json=" + jf].concat(q.only ? ["only=" + q.only] : []), { stdio: "ignore" }); } catch { /* exit 1 = faults found */ }
const verdict = Object.fromEntries(JSON.parse(fs.readFileSync(jf, "utf8")).map((r) => [r.type, r]));
// the frames a fault names: "FRONT face: ... #3 ..." -> FRONT frame 3
const marked = (R) => {
  const m = { FRONT: new Set(), BACK: new Set() };
  for (const s of R ? R.fail : []) {
    const v = s.match(/^(FRONT|BACK)/); if (!v) continue;
    const fr = [...s.matchAll(/#(\d+)/g)].map((x) => +x[1]);
    const all = /in (\d+)\/(\d+) frames/.exec(s);
    if (all && +all[1] === +all[2]) for (let i = 0; i < +all[2]; i++) m[v[1]].add(i); else fr.forEach((i) => m[v[1]].add(i));
  }
  return m;
};

const only = q.only ? new Set(q.only.split(",")) : null;
const BG = [0x82, 0xb2, 0x56], RED = [0xe0, 0x20, 0x30];
const cards = [];
for (const t of listTypes()) {
  if (only && !only.has(t.type) && !only.has(t.name)) continue;
  const R = verdict[t.type];
  if (q.fails && !(R && (R.fail.length || R.warn.length))) continue;
  const { side, views } = await loadFig(t.name), mk = marked(R);
  const rows = [["side", side], ["FRONT", views.FRONT], ["BACK", views.BACK]].map(([vn, fig]) => {
    const out = []; for (let f = 0; f < fig.CLIPS.walk.n; f++) out.push(bakeRec(fig, "walk", f, t.variant).img);
    return { vn, out, ox: fig.BOX.ox, oy: fig.BOX.oy };
  });
  // one cell size for all three rows, feet on one line
  let L = 0, Rt = 0, U = 0, D = 0;
  for (const r of rows) for (const img of r.out) for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3]) {
    L = Math.max(L, r.ox - x); Rt = Math.max(Rt, x - r.ox + 1); U = Math.max(U, r.oy - y); D = Math.max(D, y - r.oy + 1);
  }
  L = Math.ceil(L) + 2; Rt = Math.ceil(Rt) + 2; U = Math.ceil(U) + 2; D = Math.ceil(D) + 2;
  const cw = L + Rt, ch = U + D, n = rows[0].out.length;
  // the board-size block, a gap, the zoomed block
  const gap = 8, W1 = cw * n, W = Math.max(W1, cw * n * Z), H = ch * 3 + gap + ch * 3 * Z, buf = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) { buf[k * 4] = 0x2a; buf[k * 4 + 1] = 0x2e; buf[k * 4 + 2] = 0x36; buf[k * 4 + 3] = 255; }
  const put = (X, Y, c) => { if (X < 0 || Y < 0 || X >= W || Y >= H) return; const o = (Y * W + X) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; };
  const cell = (r, i, x0, y0, z) => {
    const bad = r.vn !== "side" && mk[r.vn].has(i);
    for (let y = 0; y < ch * z; y++) for (let x = 0; x < cw * z; x++) put(x0 + x, y0 + y, BG);
    if (bad) for (let s = 0; s < cw * z; s++) for (const t2 of [0, 1]) { put(x0 + s, y0 + t2, RED); put(x0 + s, y0 + ch * z - 1 - t2, RED); }
    if (bad) for (let s = 0; s < ch * z; s++) for (const t2 of [0, 1]) { put(x0 + t2, y0 + s, RED); put(x0 + cw * z - 1 - t2, y0 + s, RED); }
    const img = r.out[i];
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const k = (y * img.w + x) * 4; if (!img.data[k + 3]) continue;
      const X = L + Math.round(x - r.ox), Y = U + Math.round(y - r.oy);
      if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue;
      for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) put(x0 + X * z + b, y0 + Y * z + a, [img.data[k], img.data[k + 1], img.data[k + 2]]);
    }
  };
  rows.forEach((r, ri) => r.out.forEach((_, i) => { cell(r, i, i * cw, ri * ch, 1); cell(r, i, i * cw * Z, ch * 3 + gap + ri * ch * Z, Z); }));
  fs.writeFileSync(`${OUT}/${t.type}.png`, png(W, H, buf));
  cards.push({ t, R, W, H });
  console.log((R && R.fail.length ? "FAIL " : R && R.warn.length ? "warn " : " ok  ") + t.type);
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
fs.writeFileSync(OUT + "/index.html", `<!doctype html><meta charset="utf-8"><title>Views contact sheet</title>
<style>body{background:#1c1f25;color:#dde;font:13px system-ui;margin:16px}h2{font-size:15px;margin:22px 0 4px}
img{image-rendering:pixelated;display:block;margin:4px 0}.f{color:#ff7a7a}.w{color:#e8c860}.n{color:#8a90a0}</style>
<h1>Views contact sheet</h1><p>Each figure: side, FRONT, BACK at BOARD SIZE first (what the player sees), then x${Z}. Red boxes: frames the checker fails.</p>
${cards.map(({ t, R, W, H }) => `<h2>${esc(t.type)}${t.type !== t.name ? ` (${esc(t.name)})` : ""}</h2>
${R ? R.fail.map((s) => `<div class="f">FAIL ${esc(s)}</div>`).join("") + R.warn.map((s) => `<div class="w">warn ${esc(s)}</div>`).join("") + R.unchecked.map((s) => `<div class="n">NOT CHECKED ${esc(s)}</div>`).join("") : ""}
<img src="${t.type}.png" width="${W}" height="${H}">`).join("\n")}`);
console.log(cards.length, "figures ->", OUT + "/index.html");
