// Renders sprite maps to a PNG contact sheet with no browser and no deps:
// rasterize into a raw PPM, then let macOS `sips` turn it into a PNG.
//   node scripts/render-sprites.mjs out.png [name ...]
// With no names, renders every sprite. Frames lay out left to right.

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { SPRITES, KNIGHT_PALS } = await import("../src/sprites/sprites.js");

const [out, ...names] = process.argv.slice(2);
if (!out) {
  console.log("usage: node scripts/render-sprites.mjs out.png [spriteName ...]");
  process.exit(1);
}
const picks = names.length ? names : Object.keys(SPRITES);

const SC = 4, PAD = 8, GAP = 6;
const BG = [105, 135, 78]; // the sheet's meadow green

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// measure
const cells = picks.map((n) => {
  const spr = SPRITES[n];
  if (!spr) { console.error(`no sprite: ${n}`); process.exit(1); }
  const frames = [...spr.frames, ...(spr.fight || [])];
  const px = spr.px || 2;
  const w = frames.reduce((a, f) => a + f[0].length * px * SC + GAP, 0);
  const h = spr.frames[0].length * px * SC;
  return { n, spr, frames, px, w, h };
});
const W = Math.max(...cells.map((c) => c.w)) + PAD * 2;
const H = cells.reduce((a, c) => a + c.h + PAD * 2, 0);

const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) img.set(BG, i * 3);
const put = (x, y, rgb) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  img.set(rgb, (y * W + x) * 3);
};

let cy = PAD;
for (const c of cells) {
  const pal = c.spr.pal || KNIGHT_PALS.base;
  let cx = PAD;
  for (const map of c.frames) {
    for (let r = 0; r < map.length; r++) {
      for (let col = 0; col < map[r].length; col++) {
        const ch = map[r][col];
        if (ch === "." || !(ch in pal)) continue;
        const rgb = hex(pal[ch]);
        for (let dy = 0; dy < c.px * SC; dy++) {
          for (let dx = 0; dx < c.px * SC; dx++) {
            put(cx + col * c.px * SC + dx, cy + r * c.px * SC + dy, rgb);
          }
        }
      }
    }
    cx += map[0].length * c.px * SC + GAP;
  }
  cy += c.h + PAD * 2;
}

const ppm = `${out}.ppm`;
writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), Buffer.from(img)]));
execSync(`sips -s format png ${JSON.stringify(ppm)} --out ${JSON.stringify(out)} >/dev/null`);
unlinkSync(ppm);
console.log(`${out}: ${W}x${H}, ${cells.length} sprites (${cells.map((c) => c.n).join(", ")})`);
