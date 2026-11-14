// Renders the tower-building CONCEPTS (src/render/pix/hall-*.js) to .shots/<tag>.png with
// no browser: each hall on turf with its ground shadow, its crew (the new figures) between
// its back and front pictures, frame 0 of whatever moves, its torch light laid on.
//   node scripts/hall-render.mjs hall=archer styles=A,B,C levels=3 zoom=4 tag=hc_archer
//   node scripts/hall-render.mjs hall=archer styles=B forms=1,2,3,a,aa,ab,b,ba,bb zoom=3 tag=hc_forms   (seed=0|1|2)
//   crew=0 (no figures)  glow=0.8 (torch / spell light strength)  bg=grass|road|dark
//   crop=x,y,w,h (art px inside the hall's BOX)  line=tint|ink|ink2
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { Pix } = await import(ROOT + "/src/render/pix/pix.js");
const { frameAt } = await import(ROOT + "/src/render/pix/rig.js");
const kit = await import(ROOT + "/src/render/pix/hall-kit.js");
const hall = await import(`${ROOT}/src/render/pix/hall-${q.hall || "archer"}.js`);
const styles = (q.styles || "A,B,C").split(","), levels = (q.levels || "3").split(",").map(Number);
const Z = Number(q.zoom) || 4, GLOW = q.glow == null ? 0.8 : Number(q.glow);
const bg = { grass: [0x82, 0xb2, 0x56], road: [0xc8, 0xa4, 0x6c], dark: [0x2a, 0x2e, 0x3a] }[q.bg || "grass"];
const B = hall.BOX, [cx0, cy0, cw, ch] = q.crop ? q.crop.split(",").map(Number) : [0, 0, B.w, B.h];
// forms=1,2,3,a,aa,ab,b,ba,bb : the game's nine forms (a level, a path, a final) instead of levels=
const formOf = (f) => (/^\d$/.test(f) ? { level: Number(f) } : { level: 3, branch: f[0], rank4: f[1] || null });
const cells = [];
if (q.forms) for (const f of q.forms.split(",")) for (const st of styles) cells.push([formOf(f), st]);
else for (const lv of levels) for (const st of styles) cells.push([{ level: lv }, st]);
const cols = Number(q.cols) || (q.forms ? Math.min(cells.length, 9) : styles.length), rowsN = Math.ceil(cells.length / cols);
const W = cols * cw, H = rowsN * ch, buf = new Float32Array(W * H * 3);
for (let k = 0; k < W * H; k++) { buf[k * 3] = bg[0]; buf[k * 3 + 1] = bg[1]; buf[k * 3 + 2] = bg[2]; }
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// a little turf texture so the outline is judged against something real
if ((q.bg || "grass") === "grass") for (let i = 0; i < (W * H) / 260; i++) { const x = (rnd(i) * W) | 0, y = (rnd(i * 3 + 1) * H) | 0, c = i % 3 ? [0x76, 0xa5, 0x4e] : [0x8f, 0xbd, 0x60]; for (let d = 0; d < 2; d++) if (y + d < H) { const k = ((y + d) * W + x) * 3; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; } }
const px1 = (x, y, c, a) => { if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const k = (y * W + x) * 3; for (let i = 0; i < 3; i++) buf[k + i] += (c[i] - buf[k + i]) * a; };
// lay a resolved picture with its anchor at (ax, ay) in the sheet, clipped to its cell
const lay = (img, ax, ay, clip, alpha = 1) => {
  for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
    const k = (j * img.w + i) * 4, a = (img.data[k + 3] / 255) * alpha; if (!a) continue;
    const x = Math.round(ax - img.ox) + i, y = Math.round(ay - img.oy) + j;
    if (x < clip[0] || y < clip[1] || x >= clip[0] + clip[2] || y >= clip[1] + clip[3]) continue;
    px1(x, y, [img.data[k], img.data[k + 1], img.data[k + 2]], a);
  }
};
const figs = {};
const crewFrame = async (c) => {
  const fig = figs[c.fig] || (figs[c.fig] = await import(`${ROOT}/src/render/pix/fig-${c.fig}.js`));
  const name = c.clip || "idle", clip = fig.CLIPS[name], f = Math.min(clip.n - 1, c.frame ?? 0), F = frameAt(clip, f, fig.BONES);
  const p = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy), left = c.dir < 0;
  const info = fig.draw(p, F, { flip: left, variant: c.variant || "" }) || {};
  const img = p.resolve({ flip: left, lights: (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02) });
  img.marks = info.marks || null; img.light = info.light || null;
  if (left) { const d = new Uint8ClampedArray(img.data.length); for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) for (let ch2 = 0; ch2 < 4; ch2++) d[(j * img.w + (img.w - 1 - i)) * 4 + ch2] = img.data[(j * img.w + i) * 4 + ch2]; return { ...img, data: d, ox: img.w - img.ox }; }
  return img;
};
let t0 = performance.now(), bakeMs = [];
for (const [ci, [lv, st]] of cells.entries()) {
  const ox = (ci % cols) * cw, oy = Math.floor(ci / cols) * ch, clip = [ox, oy, cw, ch], ax = ox + B.ox - cx0, ay = oy + B.oy - cy0;
  const tb = performance.now();
  const baked = kit.bakeHall(B, hall.build({ ...lv, style: st, seed: Number(q.seed) || 0, ...(q.opt ? JSON.parse(q.opt) : {}) }), { line: q.line });
  bakeMs.push(performance.now() - tb);
  const sp = baked.spec, sh = sp.shadow;
  if (sh) for (const [y, x0, x1] of kit.groundShadow(sh.rx, sh.ry, sh)) for (let x = x0; x <= x1; x++) { const X = ax + x, Y = ay + y; if (X >= ox && X < ox + cw && Y >= oy && Y < oy + ch) px1(X, Y, [42, 28, 44], 0.3); }
  lay(baked.back, ax, ay, clip);
  const livesOf = (layer) => (sp.live || []).filter((l) => (l.layer || "back") === layer);
  const drawLive = (l) => {
    if (l.kind === "pennant") lay(kit.pennantFrames(l.col, l)[Number(q.f) || 0], ax + l.x, ay + l.y, clip);
    else if (l.kind === "flame") lay(kit.flameFrames(l)[Number(q.f) || 0], ax + l.x, ay + l.y, clip);
    else if (l.kind === "book") lay(kit.bookFrames()[0], ax + l.x, ay + l.y, clip);
    else if (l.kind === "spark") lay(kit.sparkFrames(l.col)[2], ax + l.x, ay + l.y, clip);
    else if (l.img) lay(l.img, ax + l.x, ay + l.y, clip);
  };
  livesOf("back").forEach(drawLive);
  for (const g of baked.glows) lay(g.back, ax, ay, clip, GLOW * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  if (q.crew !== "0") for (const c of [...(sp.crew || [])].sort((a, b) => a.y - b.y)) {
    const im = await crewFrame({ ...c, clip: q.clip || c.clip, frame: q.cf != null ? Number(q.cf) : c.frame });
    lay(im, ax + c.x, ay + c.y, clip);
    if (c.orb && im.marks && im.marks.tip) lay(kit.orbFrames(c.orb)[0], ax + c.x + c.dir * im.marks.tip[0], ay + c.y + im.marks.tip[1], clip);
  }
  if (baked.front) lay(baked.front, ax, ay, clip);
  for (const g of baked.glows) if (g.front) lay(g.front, ax, ay, clip, GLOW * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  livesOf("front").forEach(drawLive);
}
console.log("bake ms per hall:", bakeMs.map((v) => v.toFixed(1)).join(" "), " total", (performance.now() - t0).toFixed(0));
// zoom and write
const OW = W * Z, OH = H * Z, raw = Buffer.alloc((OW * 4 + 1) * OH);
for (let y = 0; y < OH; y++) { const row = y * (OW * 4 + 1); raw[row] = 0; const sy = Math.floor(y / Z); for (let x = 0; x < OW; x++) { const k = (sy * W + Math.floor(x / Z)) * 3, o = row + 1 + x * 4; raw[o] = buf[k]; raw[o + 1] = buf[k + 1]; raw[o + 2] = buf[k + 2]; raw[o + 3] = 255; } }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.mkdirSync(`${ROOT}/.shots`, { recursive: true });
const out = `${ROOT}/.shots/${q.tag || "hc_tmp"}.png`;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(out, OW + "x" + OH);
