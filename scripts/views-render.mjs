// A figure's side walk, FRONT and BACK views in rows (no browser): .shots/<tag>.png
//   node scripts/views-render.mjs fig=orc zoom=4 tag=vw_orc   (all frames, whole BOX by default; frames=, rows=0,1,2, variant=, crop=x,y,w,h)
// loads src/render/pix/fig-<fig>.js and fig-<fig>-views.js (exports FRONT and BACK). Made from the
// goblin artist's scratch renderer (2026-11-17).
import zlib from "node:zlib"; import fs from "node:fs";
const ROOT = "/Users/philiplago-williams/Desktop/CrownGuard";
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { Pix } = await import(ROOT + "/src/render/pix/pix.js");
const { frameAt } = await import(ROOT + "/src/render/pix/rig.js");
const T = Date.now();
const side = await import(`${ROOT}/src/render/pix/fig-${q.fig || "goblin"}.js?${T}`);
const V = await import(`${ROOT}/src/render/pix/fig-${q.fig || "goblin"}-views.js?${T}`);
const figs = [[side, side.CLIPS.walk], [V.FRONT, V.FRONT.CLIPS.walk], [V.BACK, V.BACK.CLIPS.walk]].filter((_, i) => !q.rows || q.rows.split(",").includes(String(i)));
const Z = Number(q.zoom) || 5, bg = [0x82, 0xb2, 0x56];
const only = q.frames ? q.frames.split(",").map(Number) : null;
const rows = figs.map(([fig, clip]) => { const out = []; for (let f = 0; f < clip.n; f++) {
  const F = frameAt(clip, f, fig.BONES); const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
  fig.draw(px, F, { variant: q.variant || "" }); out.push(px.resolve({})); } return out; });
const sel = rows.map((r) => (only ? only.map((i) => r[i]) : r));
// default crop: the whole of the biggest BOX of the three views, so feet and weapon tips always show
// (the old 48x48 default cut most figures off at the waist; advisor, 2026-11-18)
const bigW = Math.max(...figs.map(([fg]) => fg.BOX.w)), bigH = Math.max(...figs.map(([fg]) => fg.BOX.h));
const [cx0, cy0, w, h] = q.crop ? q.crop.split(",").map(Number) : [0, 0, bigW, bigH];
const n = sel[0].length, W = n * w * Z, H = sel.length * h * Z, buf = Buffer.alloc(W * H * 4);
const set = (x, y, c, a = 1) => { const k = (y * W + x) * 4; for (let i = 0; i < 3; i++) buf[k + i] = Math.round(buf[k + i] + (c[i] - buf[k + i]) * a); buf[k + 3] = 255; };
const fill = (x, y, ww, hh, c, a) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) set(i, j, c, a); };
sel.forEach((r, j) => r.forEach((img, i) => {
  fill(i * w * Z, j * h * Z, w * Z, h * Z, bg, 1); if ((i + j) % 2) fill(i * w * Z, j * h * Z, w * Z, h * Z, [0, 0, 0], 0.05);
  const bx = figs[j] ? figs[j][0].BOX : { ox: 24, oy: 42 }; // the ground shadow under THIS figure's own feet
  fill((i * w + bx.ox - cx0 - 7) * Z, (j * h + bx.oy - 1 - cy0) * Z, 15 * Z, 2 * Z, [42, 28, 44], 0.28);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x + cx0, sy = y + cy0; if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
    const k = (sy * img.w + sx) * 4; if (!img.data[k + 3]) continue; fill((i * w + x) * Z, (j * h + y) * Z, Z, Z, [img.data[k], img.data[k + 1], img.data[k + 2]], 1); }
}));
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
fs.mkdirSync(ROOT + "/.shots", { recursive: true });
fs.writeFileSync(`${ROOT}/.shots/${q.tag || "gv_tmp"}.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(q.tag || "gv_tmp", W + "x" + H);
