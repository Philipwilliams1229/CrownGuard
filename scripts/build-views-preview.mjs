// The views preview (owner, 2026-11-17: "a preview thingy ... animated first, side, front, back,
// then the frames, for all that youve done ... a way to give you feedback right on it").
// Bakes every PIX type whose figure has front / back views switched on (VIEWS_ON in
// src/render/pix/pixrigs.js) into one sprite strip a type: three rows (side, front, back) of
// the walk's frames, each cell the same size with the feet on one line, and writes
// scratchpad/views-preview/ (index.html + sheets/<type>.png + figs.json). Publish that folder
// as the private Artifact "Crownguard Front and Back Views" (publish_files); the page keeps
// the owner's notes in its db collection "feedback" (read them with db_list).
//   node scripts/build-views-preview.mjs [only=goblin,orc]
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const OUT = ROOT + "/scratchpad/views-preview";
fs.mkdirSync(OUT + "/sheets", { recursive: true });
const { Pix } = await import(ROOT + "/src/render/pix/pix.js");
const { frameAt } = await import(ROOT + "/src/render/pix/rig.js");

// the PIX table, read as text (importing pixrigs.js pulls in the browser-side bakers)
const src = fs.readFileSync(ROOT + "/src/render/pix/pixrigs.js", "utf8");
const on = new Set(JSON.parse("[" + src.match(/VIEWS_ON = new Set\(\[([^\]]*)\]\)/)[1] + "]"));
const types = [];
for (const line of src.split("\n")) {
  const m = line.match(/^\s+(\w+): \{ fig: mk\("(\w+)", (\w+)\)/);
  if (!m || !on.has(m[2])) continue;
  const v = line.match(/variant: "([^"]*)"/);
  types.push({ type: m[1], name: m[2], variant: v ? v[1] : "" });
}
// readable names and groups
const GROUP = (t) => (/^hero/.test(t) ? "Heroes" : /^(knight|paladin|squire|farmer|yeoman|errant|errantBow|errantRider|champion|halberdier|bowman|assassin)/.test(t) ? "The crown's soldiers"
  : /^(goblin|goblinBare|orc|armored|troll|shaman|hobgoblin|wolf|boarrider|boarMount|necro)$/.test(t) ? "The Greenwood horde"
  : /^(levy|magister|crossbow|sergeant|chaplain|marshal|cavalier|cavalierMount|loosehorse|unhorsed|unseated)$/.test(t) ? "The Iron Kingdom"
  : /^(skeleton|bonearcher|ghoul|ghast|gravecaller|hollowking|amalgam|crypt|wolfrider|rafter)$/.test(t) ? "The Hollow Court" : "The Rime Clans");
const NICE = { heroKnight: "Sir Aldric", heroHunter: "Wren", heroFriar: "Brother Osric", heroCaptain: "Captain Hale", heroStorm: "Ysolde", knight: "Garrison knight",
  armored: "Ironclad", hobgoblin: "Hobgoblin warchief", goblinBare: "Goblin (bare-headed)", boarrider: "Boar rider", boarMount: "Boar (riderless)", necro: "Necromancer",
  bowman: "Field bowman", errantBow: "Errant crossbowman", errantRider: "Lancer", assassinUnit: "Covert blade", assassinUnitA: "Covert blade (path A)",
  assassinUnitB: "Covert blade (path B)", assassinUnitAA: "Kingslayer", assassinUnitAB: "Open Contract", assassinUnitBA: "Widow's Kiss", assassinUnitBB: "Plague Bearer",
  cavalierMount: "Cavalier's horse (riderless)", loosehorse: "Loose horse", unseated: "Unhorsed knight (gryphon)", skeleton: "Risen", bonearcher: "Barrow archer",
  ghast: "Plague ghast", hollowking: "Hollow King", amalgam: "Grave amalgam", crypt: "Crypt warden", rimejarlfoot: "Rime Jarl (on foot)", rimejarl: "Rime Jarl on the war-mammoth",
  frostgiant: "Frost giant", rimeseer: "Rime seer", berserkerRage: "Berserker (raging)", rimerider: "Rime rider", rimewolf: "Rime wolf (riderless)", wolfrider: "Wolf rider",
  magister: "Aegis Magister", chaplain: "Battle Chaplain", marshal: "Lord Marshal", unhorsed: "Unhorsed knight", crossbow: "Crossbowman", sergeant: "Sergeant" };
const nice = (t) => NICE[t] || t[0].toUpperCase() + t.slice(1);

const bake = (fig, clipName, variant) => {
  const clip = fig.CLIPS[clipName], out = [];
  for (let f = 0; f < clip.n; f++) {
    const F = frameAt(clip, f, fig.BONES);
    const px = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(px, F, { variant }) || {};
    const lights = (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02);
    out.push({ img: px.resolve({ lights }), ox: fig.BOX.ox, oy: fig.BOX.oy });
  }
  return out;
};
const png = (W, H, buf) => {
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

const figs = [];
const only = q.only ? new Set(q.only.split(",")) : null;
for (const t of types) {
  if (only && !only.has(t.type)) continue;
  try {
    const side = await import(`${ROOT}/src/render/pix/fig-${t.name}.js`);
    const V = await import(`${ROOT}/src/render/pix/fig-${t.name}-views.js`);
    const rows = [bake(side, "walk", t.variant), bake(V.FRONT, "walk", t.variant), bake(V.BACK, "walk", t.variant)];
    // trim each row to its pixels, then one cell size for all, feet on one line
    let L = 0, R = 0, U = 0, Dn = 0;
    for (const row of rows) for (const fr of row) {
      const { img, ox, oy } = fr;
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3]) {
        L = Math.max(L, ox - x); R = Math.max(R, x - ox + 1); U = Math.max(U, oy - y); Dn = Math.max(Dn, y - oy + 1);
      }
    }
    L += 2; R += 2; U += 2; Dn += 3;
    const cw = L + R, ch = U + Dn, n = rows[0].length, W = cw * n, H = ch * 3, buf = Buffer.alloc(W * H * 4);
    rows.forEach((row, r) => row.forEach(({ img, ox, oy }, i) => {
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const k = (y * img.w + x) * 4; if (!img.data[k + 3]) continue;
        const X = i * cw + L + (x - ox), Y = r * ch + U + (y - oy); if (X < i * cw || X >= (i + 1) * cw || Y < r * ch || Y >= (r + 1) * ch) continue;
        const o = (Y * W + X) * 4; buf[o] = img.data[k]; buf[o + 1] = img.data[k + 1]; buf[o + 2] = img.data[k + 2]; buf[o + 3] = 255;
      }
    }));
    fs.writeFileSync(`${OUT}/sheets/${t.type}.png`, png(W, H, buf));
    figs.push({ type: t.type, name: nice(t.type), group: GROUP(t.type), cw, ch, n, feet: U, ms: side.CLIPS.walk.ms });
    console.log("ok", t.type);
  } catch (e) { console.log("SKIP", t.type, e.message.split("\n")[0]); }
}
const ORDER = ["Heroes", "The crown's soldiers", "The Greenwood horde", "The Iron Kingdom", "The Hollow Court", "The Rime Clans"];
figs.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
fs.writeFileSync(`${OUT}/figs.json`, JSON.stringify(figs));
fs.copyFileSync(ROOT + "/scripts/views-preview.html", OUT + "/index.html");
console.log(figs.length, "figures ->", OUT);
