// NOTE: the app icon (public/icon-512.png, icon-192.png, apple-touch-icon.png)
// is now painted by /icon-lab.html from the title screen's own castle
// (open it with the dev server running, ?save=1 writes .shots/icon-*.png, then
// copy those into public/). This older script, built on the small castle mark
// (src/ui/castleMark.js, still the UI's little castle icon), is kept for reference.
// Paints the app icon — the game's castle mark (src/ui/castleMark.js) on a
// dawn sky over a green hill — as raw pixels, then lets macOS turn them into
// PNGs. No image library needed. Every castle in the game's UI is the same
// mark, so the icon on the home screen matches the one on the title screen.
//   node scripts/make-icons.mjs
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { CASTLE_MARK, CASTLE_PAL } from "../src/ui/castleMark.js";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PAL = Object.fromEntries(Object.entries(CASTLE_PAL).map(([k, v]) => [k, hex(v)]));

const paint = (N) => {
  const img = new Uint8Array(N * N * 3);
  const put = (x, y, [r, g, b]) => { if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 3; img[i] = r; img[i + 1] = g; img[i + 2] = b; };
  const gw = CASTLE_MARK[0].length, gh = CASTLE_MARK.length;
  // the castle fills ~64% of the width (inside the 80% safe zone of a
  // maskable icon), on whole art pixels so it stays crisp
  const px = Math.max(1, Math.floor((N * 0.64) / gw));
  const cw = gw * px, ch = gh * px;
  const x0 = Math.round((N - cw) / 2), y0 = Math.round(N * 0.56 - ch / 2);
  const hillTop = y0 + ch - px;           // the castle stands on the brow of the hill
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // a dawn sky: deep blue above, warming to rose at the horizon
      const t = y / N;
      let col = [36 + t * 90, 44 + t * 40, 88 + t * 10];
      // the hill: a broad green brow, lit from the upper left
      const brow = hillTop + ((x - N / 2) / (N / 2)) ** 2 * N * 0.08;
      if (y >= brow) {
        const d = (y - brow) / N;
        col = [110 - d * 60 - (x / N) * 16, 164 - d * 70 - (x / N) * 20, 78 - d * 30];
        if (y - brow < px) col = [150, 196, 98];
      }
      put(x, y, col.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
    }
  }
  // the castle, one block per art pixel
  CASTLE_MARK.forEach((row, gy) => {
    for (let gx = 0; gx < gw; gx++) {
      const c = PAL[row[gx]];
      if (!c) continue;
      for (let yy = 0; yy < px; yy++) for (let xx = 0; xx < px; xx++) put(x0 + gx * px + xx, y0 + gy * px + yy, c);
    }
  });
  return img;
};

for (const [name, N] of [["icon-192", 192], ["icon-512", 512], ["apple-touch-icon", 180]]) {
  const img = paint(N);
  const ppm = `public/${name}.ppm`;
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${N} ${N}\n255\n`), Buffer.from(img)]));
  execSync(`sips -s format png ${ppm} --out public/${name}.png >/dev/null`);
  unlinkSync(ppm);
  console.log(`wrote public/${name}.png`);
}
