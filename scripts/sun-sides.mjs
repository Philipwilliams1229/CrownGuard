// The time-of-day TRIAL (2026-11-22): what an eastern sun looks like two ways, with no browser.
// One sheet per sun, three scenes stacked: TODAY (sun upper left, as the game is) | A: only the cast
// shadows, the edge light and the colour move | B: A plus the painted light re-sculpted from the
// sun's side (pix.js resolve `sun`).
//   node scripts/sun-sides.mjs sun=morning|sunrise|golden zoom=3 tag=sunsides_morning
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { Pix } = await import(ROOT + "/src/render/pix/pix.js");
const { frameAt } = await import(ROOT + "/src/render/pix/rig.js");
const kit = await import(ROOT + "/src/render/pix/hall-kit.js");
const Z = Number(q.zoom) || 3;

// a sun: where it stands (screen space: x right, y down, z toward the eye), the way shadows fall,
// their length per unit of height, the light's colour and strength, the ground's grade
const SUNS = {
  today: { S: [-0.6, -0.62, 0.5], sh: [0.93, 0.37], K: 0.45, col: null, rim: 0, wash: null, shade: [42, 28, 44, 0.3] },
  morning: { S: [0.6, -0.62, 0.5], sh: [-0.93, 0.37], K: 0.8, col: "#ffe9b8", rim: 0.35, line: 0, wash: [255, 236, 190, 0.07], shade: [40, 34, 66, 0.32] },
  sunrise: { S: [0.92, -0.26, 0.3], sh: [-0.97, 0.24], K: 1.9, col: "#ffa860", rim: 0.75, line: 0.9, wash: [255, 170, 120, 0.2], shade: [44, 30, 84, 0.4] },
  golden: { S: [-0.92, -0.26, 0.3], sh: [0.97, 0.24], K: 1.9, col: "#ff9a2e", rim: 0.75, line: 0.9, wash: [255, 160, 70, 0.2], shade: [36, 24, 70, 0.4] },
};
const sun = SUNS[q.sun || "morning"];
const SW = 440, SH = 235;
const HALLS = [["archer", { level: 3 }, 95], ["wizard", { level: 3 }, 215], ["knight", { level: 3 }, 335]];
const FIGS = [["knight", 60, 1, "idle"], ["mage", 125, 1, "idle"], ["goblin", 215, -1, "walk"], ["orc", 275, -1, "walk"], ["troll", 355, -1, "walk"]];
const HY = 150, FY = 212;

const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mirror = (img) => { const d = new Uint8ClampedArray(img.data.length); for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) for (let c = 0; c < 4; c++) d[(j * img.w + (img.w - 1 - i)) * 4 + c] = img.data[(j * img.w + i) * 4 + c]; return { ...img, data: d, ox: img.w - img.ox }; };

// one scene: mode "today" | "A" | "B"
const scene = async (mode) => {
  const u = mode === "today" ? SUNS.today : sun, paint = mode === "B" ? u.S : SUNS.today.S;
  const lay = new Float32Array(SW * SH * 4);                       // the standing things, alpha kept (for their shadows)
  const base = new Int16Array(SW * SH).fill(-1);                   // each pixel's ground line
  const put = (img, ax, ay, by, alpha = 1) => {
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const k = (j * img.w + i) * 4, a = (img.data[k + 3] / 255) * alpha; if (!a) continue;
      const x = Math.round(ax - img.ox) + i, y = Math.round(ay - img.oy) + j;
      if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
      const o = (y * SW + x) * 4;
      for (let c = 0; c < 3; c++) lay[o + c] += (img.data[k + c] - lay[o + c]) * a;
      lay[o + 3] = Math.max(lay[o + 3], a); if (by != null && alpha === 1) base[y * SW + x] = by;
    }
  };
  // a figure: sculpted with the sun in ITS space (x flips with the way it faces), then its edge light
  const figure = async (name, x, y, dir, clipName, variant, frame = 0) => {
    const fig = await import(`${ROOT}/src/render/pix/fig-${name}.js`);
    const clip = fig.CLIPS[clipName] || fig.CLIPS.idle || fig.CLIPS.walk, F = frameAt(clip, Math.min(clip.n - 1, frame), fig.BONES);
    const p = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy), S = [paint[0] * dir, paint[1], paint[2]];
    const info = fig.draw(p, F, { flip: S[0] > 0, variant: variant || "" }) || {};
    let img = p.resolve({ sun: S, lights: (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02) });
    const overs = [];
    if (u.rim) { overs.push([p.lightLayer({ dir: [u.S[0] * dir, u.S[1]], col: u.col, k: 1 }), u.rim]); if (u.line) overs.push([p.lightLayer({ dir: [u.S[0] * dir, u.S[1]], col: u.col, k: 1, line: true }), u.line]); }
    const m = (im) => (dir < 0 ? mirror(im) : im);
    put(m(img), x, y, y);
    for (const [ov, a] of overs) put(m(ov), x, y, null, a);
    return { img, info };
  };
  for (const [name, form, x] of HALLS) {
    const hall = await import(`${ROOT}/src/render/pix/hall-${name}.js`);
    const build = hall.build({ ...form, style: "B", seed: 0 });
    const baked = kit.bakeHall(hall.BOX, build, { sun: paint }), sp = baked.spec;
    // the same hall again, kept as buffers, for the sun's edge light on its stone
    const b2 = kit.newPix(hall.BOX), f2 = kit.newPix(hall.BOX); build(b2, f2); b2.resolve({ sun: paint }); const hasF = f2.m.some((v) => v >= 0); if (hasF) f2.resolve({ sun: paint });
    const rim = (px) => (u.rim ? [[px.lightLayer({ dir: [u.S[0], u.S[1]], col: u.col, k: 1 }), u.rim * 0.8], ...(u.line ? [[px.lightLayer({ dir: [u.S[0], u.S[1]], col: u.col, k: 1, line: true }), u.line]] : [])] : []);
    put(baked.back, x, HY, HY);
    for (const [ov, a] of rim(b2)) put(ov, x, HY, null, a);
    for (const g of baked.glows) put(g.back, x, HY, null, 0.8 * (sp.lights.find((l) => l.key === g.key).k ?? 1));
    for (const l of (sp.live || []).filter((l) => (l.layer || "back") === "back")) { if (l.kind === "pennant") put(kit.pennantFrames(l.col, l)[0], x + l.x, HY + l.y, HY); else if (l.kind === "flame") put(kit.flameFrames(l)[0], x + l.x, HY + l.y, HY); }
    for (const c of [...(sp.crew || [])].sort((a, b) => a.y - b.y)) {
      const r = await figure(c.fig, x + c.x, HY + c.y, c.dir || 1, c.clip || "idle", c.variant, c.frame ?? 0);
      for (let k = 0; k < base.length; k++) if (base[k] === Math.round(HY + c.y)) base[k] = HY;      // the crew stand ON the hall: their shadow falls with its
      if (c.orb && r.info.marks && r.info.marks.tip) put(kit.orbFrames(c.orb)[0], x + c.x + (c.dir || 1) * r.info.marks.tip[0], HY + c.y + r.info.marks.tip[1], null);
    }
    if (baked.front) { put(baked.front, x, HY, HY); if (hasF) for (const [ov, a] of rim(f2)) put(ov, x, HY, null, a); }
    for (const g of baked.glows) if (g.front) put(g.front, x, HY, null, 0.8 * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  }
  for (const [name, x, dir, clip] of FIGS) await figure(name, x, FY, dir, clip, "", 2);

  // the ground: turf and a strip of road, graded by the hour
  const out = new Float32Array(SW * SH * 3);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const road = y > 186 && y < 226, c = road ? [0xc8, 0xa4, 0x6c] : [0x82, 0xb2, 0x56], k = (y * SW + x) * 3; out[k] = c[0]; out[k + 1] = c[1]; out[k + 2] = c[2]; }
  for (let i = 0; i < (SW * SH) / 200; i++) { const x = (rnd(i) * SW) | 0, y = (rnd(i * 3 + 1) * SH) | 0, road = y > 186 && y < 226, c = road ? (i % 2 ? [0xb8, 0x94, 0x60] : [0xd6, 0xb4, 0x7c]) : i % 3 ? [0x76, 0xa5, 0x4e] : [0x8f, 0xbd, 0x60]; for (let d = 0; d < 2; d++) if (y + d < SH) { const k = ((y + d) * SW + x) * 3; out[k] = c[0]; out[k + 1] = c[1]; out[k + 2] = c[2]; } }
  if (u.wash) for (let k = 0; k < SW * SH; k++) for (let c = 0; c < 3; c++) out[k * 3 + c] = out[k * 3 + c] * (1 - u.wash[3]) + (out[k * 3 + c] * u.wash[c] / 255) * u.wash[3] * 1.0 + 0;
  // the cast shadows: each standing pixel thrown along the ground by its height
  const shd = new Uint8Array(SW * SH), run = Math.ceil(u.K) + 1;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const k = y * SW + x; if (lay[k * 4 + 3] < 0.5 || base[k] < 0) continue;
    const hgt = Math.max(0, base[k] - y), gy = Math.max(y, base[k]);
    const sx = Math.round(x + u.sh[0] * u.K * hgt), sy = Math.round(gy + u.sh[1] * u.K * hgt);
    for (let d = 0; d < run; d++) { const X = sx + (u.sh[0] > 0 ? -d : d); if (X >= 0 && X < SW && sy >= 0 && sy < SH) shd[sy * SW + X] = 1; }
  }
  for (let k = 0; k < SW * SH; k++) {
    if (shd[k]) for (let c = 0; c < 3; c++) out[k * 3 + c] += (u.shade[c] - out[k * 3 + c]) * u.shade[3];
    const a = lay[k * 4 + 3]; if (a) for (let c = 0; c < 3; c++) out[k * 3 + c] += (lay[k * 4 + c] - out[k * 3 + c]) * a;
  }
  return out;
};

const modes = ["today", "A", "B"], GAP = 4, W = SW, H = SH * 3 + GAP * 2, buf = new Float32Array(W * H * 3).fill(20);
for (const [i, m] of modes.entries()) { const s = await scene(m); buf.set(s, i * (SH + GAP) * W * 3); }
const OW = W * Z, OH = H * Z, raw = Buffer.alloc((OW * 4 + 1) * OH);
for (let y = 0; y < OH; y++) { const row = y * (OW * 4 + 1); raw[row] = 0; const sy = Math.floor(y / Z); for (let x = 0; x < OW; x++) { const k = (sy * W + Math.floor(x / Z)) * 3, o = row + 1 + x * 4; raw[o] = buf[k]; raw[o + 1] = buf[k + 1]; raw[o + 2] = buf[k + 2]; raw[o + 3] = 255; } }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.mkdirSync(`${ROOT}/.shots`, { recursive: true });
const file = `${ROOT}/.shots/${q.tag || "sunsides_" + (q.sun || "morning")}.png`;
fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(file, OW + "x" + OH);
