// Frame picker: bakes every figure in the PIX table (plus bird-eagle) clip by clip, right-facing, and writes
// one PNG strip per figure+clip(+aim) and a manifest to .shots/frame-picker/ (index.html there is the page that
// reads them; this script rewrites only the strips and manifest.json, and a copy of the page from scripts/frame-picker.html).
//   node scripts/frame-picker.mjs [zoom=3] [only=troll,bowman]
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const Z = Number(q.zoom) || 3, only = q.only ? q.only.split(",") : null, PAD = 4;
const OUT = `${ROOT}/.shots/frame-picker`;
fs.mkdirSync(OUT, { recursive: true });
const { Pix } = await import(ROOT + "/src/render/pix/pix.js");
const { frameAt } = await import(ROOT + "/src/render/pix/rig.js");
const dir = ROOT + "/src/render/pix";
// parse the PIX table (importing pixrigs.js pulls in the browser-side bakers)
const src = fs.readFileSync(dir + "/pixrigs.js", "utf8");
const imports = {};
for (const m of src.matchAll(/import \* as (\w+) from "\.\/([\w-]+)\.js"/g)) imports[m[1]] = m[2];
const entries = [];
for (const line of src.split("\n")) {
  const m = line.match(/^  (\w+): \{ fig: mk\("(\w+)", ([\w.]+)\)(?:, variant: "([\w|]+)")?/);
  if (!m) continue;
  const [, type, , mv, variant] = m, [v0, sub] = mv.split(".");
  if (!imports[v0]) continue;
  entries.push({ type, file: imports[v0], sub, variant: variant || "" });
}
entries.push({ type: "bird-eagle", file: "bird-eagle", variant: "" });
const SHOOT = new Set(["bowman", "fieldbow", "bonearcher", "crossbow", "errantBow", "errantbow", "archer", "musketeer", "heroHunter"]);

// names + groups
let EN = {}, HN = {};
try { EN = (await import(ROOT + "/src/data/enemies.js")).ENEMIES || {}; } catch (e) { console.error("enemies.js:", e.message); }
try { const b = await import(ROOT + "/src/data/bands.js"); for (const [k, h] of Object.entries(b.HEROES || {})) HN[k] = h.name; } catch (e) { console.error("bands.js:", e.message); }
const SOLD = { knight: "Garrison Knight", paladin: "Paladin", squire: "Squire", farmer: "Militia Farmer", yeoman: "Yeoman", errant: "Knight Errant", errantBow: "Errant Crossbowman", errantRider: "Lancer (Errant rider)", champion: "Champion", halberdier: "Gate Halberdier", bowman: "Levy Bowman", assassinUnit: "Covert Blade", assassinUnitA: "Covert Blade (A)", assassinUnitB: "Covert Blade (B)", assassinUnitAA: "Covert Blade (AA)", assassinUnitAB: "Covert Blade (AB)", assassinUnitBA: "Covert Blade (BA)", assassinUnitBB: "Covert Blade (BB)", skiff: "River Skiff", skiffA: "River Skiff (A)", skiffB: "River Skiff (B)" };
const HERO = { heroKnight: "Sir Aldric", heroHunter: "Wren", heroFriar: "Brother Osric", heroCaptain: "Captain Hale", heroStorm: "Ysolde" };
const ODD = { goblinBare: ["Goblin (bare-headed)", "Greenwood horde"], boarMount: ["Boar (riderless)", "Greenwood horde"], cavalierMount: ["Cavalier horse (riderless)", "Iron"], gryphonMount: ["Gryphon (riderless)", "Iron"], wolfrider: ["Wolf-rider (horde)", "Greenwood horde"], berserkerRage: ["Berserker (raging)", "Rime"], rimejarlfoot: ["Rime Jarl (on foot)", "Rime"], rimewolf: ["Rime wolf (riderless)", "Rime"], "bird-eagle": ["War-eagle", "Your soldiers"] };
const nice = (n) => (n === n.toUpperCase() ? n.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase()) : n);
const nameOf = (t) => nice(ODD[t]?.[0] || HERO[t] || HN[t] || SOLD[t] || EN[t]?.name || t);
const groupOf = (t) => {
  if (ODD[t]) return ODD[t][1];
  if (HERO[t]) return "Heroes";
  if (SOLD[t]) return "Your soldiers";
  const f = EN[t]?.faction;
  if (f === "iron") return "Iron"; if (f === "hollow") return "Hollow"; if (f === "rime") return "Rime"; if (f === "greenwood") return "Greenwood horde";
  return "Other";
};

// PNG
const crcT = zlib.crc32;
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crcT(td) >>> 0); return Buffer.concat([len, td, crc]); };
const png = (W, H, rgb) => {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
};
const BG = [0x82, 0xb2, 0x56];

const bake = (fig, clipName, variant) => {
  const clip = fig.CLIPS[clipName], out = [];
  for (let f = 0; f < clip.n; f++) {
    const F = frameAt(clip, f, fig.BONES);
    const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(px, F, { flip: false, variant }) || {};
    const img = px.resolve({ flip: false, lights: (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02) });
    if (fig.fx) {
      const fxp = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
      fig.fx(fxp, F, info, clipName);
      const o = fxp.resolve({ line: "tint" });
      for (let k = 0; k < o.w * o.h; k++) if (o.data[k * 4 + 3]) for (let c = 0; c < 4; c++) img.data[k * 4 + c] = o.data[k * 4 + c];
    }
    out.push(img);
  }
  return out;
};
const ext = (imgs, e) => {
  for (const img of imgs) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) if (img.data[(j * img.w + i) * 4 + 3]) { e[0] = Math.min(e[0], i); e[1] = Math.min(e[1], j); e[2] = Math.max(e[2], i); e[3] = Math.max(e[3], j); }
};
const strip = (imgs, box, fig) => {
  const [x0, y0, x1, y1] = box, w = x1 - x0 + 1, h = y1 - y0 + 1, cw = w * Z, ch = h * Z, W = cw * imgs.length, buf = Buffer.alloc(W * ch * 3);
  for (let c = 0; c < imgs.length; c++) {
    const img = imgs[c];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const ax = x0 + Math.floor(x / Z), ay = y0 + Math.floor(y / Z);
      let col = BG;
      const dx = (ax - fig.BOX.ox) / 8, dy = (ay - fig.BOX.oy) / 1.4;
      if (dx * dx + dy * dy <= 1) col = [col[0] * 0.72 + 42 * 0.28, col[1] * 0.72 + 28 * 0.28, col[2] * 0.72 + 44 * 0.28];
      if (ax >= 0 && ay >= 0 && ax < img.w && ay < img.h) { const k = (ay * img.w + ax) * 4; if (img.data[k + 3]) col = [img.data[k], img.data[k + 1], img.data[k + 2]]; }
      const o = (y * W + c * cw + x) * 3; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2];
    }
  }
  return { file: png(W, ch, buf), cellW: cw, cellH: ch };
};

const manifest = [], failed = [];
let bytes = 0;
for (const e of entries) {
  if (only && !only.includes(e.type)) continue;
  try {
    let mod = await import(`${dir}/${e.file}.js`);
    const fig = e.sub ? mod[e.sub] : mod;
    if (!fig?.CLIPS || !fig.draw) throw new Error("no CLIPS/draw");
    const aims = SHOOT.has(e.type) ? ["", "@-40", "@40"] : [""];
    const jobs = [];
    for (const clipName of Object.keys(fig.CLIPS)) {
      for (const a of aims) {
        if (a && !/shoot|loose|fire|attack/.test(clipName) ) continue;
        if (a && clipName !== (e.type.startsWith("hero") ? "attack" : "shoot") && !fig.CLIPS.shoot) continue;
        if (a && fig.CLIPS.shoot && clipName !== "shoot") continue;
        jobs.push({ clipName, aim: a, imgs: bake(fig, clipName, (e.variant || "") + a) });
      }
    }
    const box = [1e9, 1e9, -1, -1];
    for (const j of jobs) ext(j.imgs, box);
    box[0] = Math.max(0, box[0] - PAD); box[1] = Math.max(0, box[1] - PAD); box[2] = Math.min(fig.BOX.w - 1, box[2] + PAD); box[3] = Math.min(fig.BOX.h - 1, box[3] + PAD);
    for (const j of jobs) {
      const s = strip(j.imgs, box, fig), file = `${e.type}_${j.clipName}${j.aim ? "_a" + j.aim.slice(1) : ""}.png`;
      fs.writeFileSync(`${OUT}/${file}`, s.file); bytes += s.file.length;
      manifest.push({ fig: e.type, name: nameOf(e.type), group: groupOf(e.type), clip: j.clipName, aim: j.aim ? j.aim.slice(1) : "", file, cellW: s.cellW, cellH: s.cellH, n: j.imgs.length });
    }
  } catch (err) { failed.push(e.type + ": " + String(err.message).split("\n")[0]); }
}
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
if (fs.existsSync(`${ROOT}/scripts/frame-picker.html`)) fs.writeFileSync(`${OUT}/index.html`, fs.readFileSync(`${ROOT}/scripts/frame-picker.html`, "utf8").replace("/*MANIFEST*/[]", () => JSON.stringify(manifest)));
console.log(`${manifest.length} strips, ${new Set(manifest.map((m) => m.fig)).size} figures, ${(bytes / 1e6).toFixed(1)} MB at zoom ${Z}; ${failed.length} failed`);
for (const f of failed) console.log("  FAILED", f);
