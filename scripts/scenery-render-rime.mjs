// Renders the RIMEWATER scenery CONCEPT (concept/scenery-rime.js: snow, spruce, rocks, strand in three looks) with no browser:
//   node scripts/scenery-render-rime.mjs            -> .shots/scx_rime_a.png, scx_rime_b.png, scx_rime_c.png (zoom 3), scx_rime_sheet.png
//   zoom=3 only=b
// scx_rime_sheet.png: the three side by side at zoom 2 with labels, and a 1x strip of the three under them.
import zlib from "node:zlib";
import fs from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const q = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const { renderScene, W, H } = await import(ROOT + "/concept/scenery-rime.js");
const Z = Number(q.zoom) || 3;
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const png = (rgba, w, h) => {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
// a canvas with nearest-neighbour blit and a 3x5 label font
const canvas = (w, h, bg) => { const c = { w, h, d: new Uint8ClampedArray(w * h * 4) }; for (let k = 0; k < w * h; k++) { c.d[k * 4] = bg[0]; c.d[k * 4 + 1] = bg[1]; c.d[k * 4 + 2] = bg[2]; c.d[k * 4 + 3] = 255; } return c; };
const blit = (c, img, x0, y0, z) => { for (let y = 0; y < img.h * z; y++) for (let x = 0; x < img.w * z; x++) { const s = (Math.floor(y / z) * img.w + Math.floor(x / z)) * 4, X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) continue; const o = (Y * c.w + X) * 4; for (let i = 0; i < 4; i++) c.d[o + i] = img.rgba[s + i]; } };
const FONT = { A: "010101111101101", B: "110101110101110", C: "011100100100011", L: "100100100100111", E: "111100110100111", N: "110101101101101", W: "101101101111101", O: "010101101101010", R: "110101110110101", K: "101101110101101", D: "110101101101110", X: "101101010101101", 1: "010110010010111", " ": "000000000000000", "-": "000000111000000", T: "111010010010010", Y: "101101010010010", ":": "000010000010000", I: "111010010010111", M: "101111111101101" };
const text = (c, s, x0, y0, z, col = [240, 232, 214]) => { let x = x0; for (const ch of s) { const g = FONT[ch] || FONT[" "]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) { const o = ((y0 + j * z + b) * c.w + x + i * z + a) * 4; c.d[o] = col[0]; c.d[o + 1] = col[1]; c.d[o + 2] = col[2]; } x += 4 * z; } };
fs.mkdirSync(`${ROOT}/.shots`, { recursive: true });
const which = q.only ? q.only.split(",") : ["a", "b", "c"], scenes = {}, t0 = performance.now();
for (const k of which) {
  scenes[k] = await renderScene(k);
  const big = canvas(W * Z, H * Z, [0, 0, 0]); blit(big, scenes[k], 0, 0, Z);
  fs.writeFileSync(`${ROOT}/.shots/scx_rime_${k}.png`, png(big.d, big.w, big.h));
}
console.log("rendered", which.join(","), (performance.now() - t0).toFixed(0), "ms");
if (which.length === 3) {
  const S = 2, pad = 10, head = 22, bg = [34, 30, 40];
  const wToday = fs.existsSync(`${ROOT}/.shots/scx_rime_today.png`);
  const sw = 3 * W * S + 4 * pad, sh = head + H * S + pad + 12 + H + pad + 8;
  const c = canvas(sw, sh, bg);
  ["a", "b", "c"].forEach((k, i) => { const x = pad + i * (W * S + pad); text(c, `${k.toUpperCase()} ${scenes[k].label.toUpperCase()}`, x, 6, 2); blit(c, scenes[k], x, head, S); });
  text(c, "1X", pad, head + H * S + pad - 2, 1);
  ["a", "b", "c"].forEach((k, i) => blit(c, scenes[k], pad + i * (W + pad), head + H * S + pad + 8, 1));
  fs.writeFileSync(`${ROOT}/.shots/scx_rime_sheet.png`, png(c.d, c.w, c.h));
  console.log(`${ROOT}/.shots/scx_rime_sheet.png`, c.w + "x" + c.h);
}
