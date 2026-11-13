// Node twin of concept-strip.html (same bake steps as concept/bake.js): renders a concept
// figure's frames to .shots/<tag>.png with no browser. ext=1 prints each clip's pixel extents
// (for sizing a figure's BOX).
//   node scripts/concept-render.mjs fig=goblin clips=idle,walk zoom=10 frames=0,2,4 crop=x,y,w,h bg=grass flip=1 tag=cptg_x
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { Pix } = await import(ROOT + "/concept/pix.js");
const { frameAt } = await import(ROOT + "/concept/rig.js");
const fig = await import(`${ROOT}/concept/fig-${q.fig}.js?${Date.now()}`);
const clips = (q.clips || Object.keys(fig.CLIPS).join(",")).split(",");
const Z = Number(q.zoom) || 5, bg = { grass: [0x82, 0xb2, 0x56], road: [0xc8, 0xa4, 0x6c], dark: [0x2a, 0x2e, 0x3a] }[q.bg || "grass"];
const only = q.frames ? q.frames.split(",").map(Number) : null;
const bake = (name) => {
  const clip = fig.CLIPS[name], out = [];
  for (let f = 0; f < clip.n; f++) {
    const F = frameAt(clip, f, fig.BONES);
    const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(px, F, { variant: q.variant || "" }) || {};
    const img = px.resolve({ flip: !!q.flip, line: q.line, lights: info.light ? [info.light] : [] });
    if (fig.fx) {
      const fxp = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
      fig.fx(fxp, F, info, name);
      const o = fxp.resolve({ line: "tint" });
      for (let k = 0; k < o.w * o.h; k++) if (o.data[k * 4 + 3]) for (let c = 0; c < 4; c++) img.data[k * 4 + c] = o.data[k * 4 + c];
    }
    // extents, for box checks
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) if (img.data[(j * img.w + i) * 4 + 3]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    out.push({ img, ext: [x0, y0, x1, y1] });
  }
  return out;
};
const rows = clips.map(bake);
if (q.ext) for (const [ci, r] of rows.entries()) {
  const e = r.reduce((a, f) => [Math.min(a[0], f.ext[0]), Math.min(a[1], f.ext[1]), Math.max(a[2], f.ext[2]), Math.max(a[3], f.ext[3])], [1e9, 1e9, -1, -1]);
  console.log(clips[ci], "extent x", e[0], "..", e[2], " y", e[1], "..", e[3], " box", fig.BOX.w, fig.BOX.h, " feet", fig.BOX.ox, fig.BOX.oy, " height", fig.BOX.oy - e[1]);
}
const sel = rows.map((r) => (only ? only.map((i) => r[i]).filter(Boolean) : r));
const [cx0, cy0, w, h] = q.crop ? q.crop.split(",").map(Number) : [0, 0, fig.BOX.w, fig.BOX.h];
const n = Math.max(...sel.map((r) => r.length));
const W = n * w * Z, H = sel.length * h * Z, buf = Buffer.alloc(W * H * 4);
const set = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; for (let i = 0; i < 3; i++) buf[k + i] = Math.round(buf[k + i] + (c[i] - buf[k + i]) * a); buf[k + 3] = 255; };
const fill = (x, y, ww, hh, c, a) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) set(i, j, c, a); };
sel.forEach((r, j) => r.forEach((f, i) => {
  fill(i * w * Z, j * h * Z, w * Z, h * Z, bg, 1);
  if ((i + j) % 2) fill(i * w * Z, j * h * Z, w * Z, h * Z, [0, 0, 0], 0.05);
  // the ground shadow, clipped to its cell
  const sx0 = Math.max(0, fig.BOX.ox - cx0 - 7), sx1 = Math.min(w, fig.BOX.ox - cx0 + 8), sy0 = Math.max(0, fig.BOX.oy - cy0 - 1), sy1 = Math.min(h, fig.BOX.oy - cy0 + 1);
  if (sx1 > sx0 && sy1 > sy0) fill((i * w + sx0) * Z, (j * h + sy0) * Z, (sx1 - sx0) * Z, (sy1 - sy0) * Z, [42, 28, 44], 0.28);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + cx0, sy = y + cy0;
    if (sx < 0 || sy < 0 || sx >= f.img.w || sy >= f.img.h) continue;
    const k = (sy * f.img.w + sx) * 4;
    if (!f.img.data[k + 3]) continue;
    fill((i * w + x) * Z, (j * h + y) * Z, Z, Z, [f.img.data[k], f.img.data[k + 1], f.img.data[k + 2]], 1);
  }
}));
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
fs.mkdirSync(`${ROOT}/.shots`, { recursive: true });
const out = `${ROOT}/.shots/${q.tag || "cpt_tmp"}.png`;
fs.writeFileSync(out, png);
console.log(out, W + "x" + H);
