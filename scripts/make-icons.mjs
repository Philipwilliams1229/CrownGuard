// Paints the app icon — a gold crown on the kingdom's slate — as raw pixels,
// then lets macOS turn them into PNGs. No image library needed.
//   node scripts/make-icons.mjs
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";

const paint = (N) => {
  const img = new Uint8Array(N * N * 3);
  const put = (x, y, [r, g, b]) => { const i = (y * N + x) * 3; img[i] = r; img[i + 1] = g; img[i + 2] = b; };
  const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const cx = N / 2, cy = N * 0.55;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // slate ground with a soft warm vignette
      const d = Math.hypot(x - N / 2, y - N / 2) / (N / 2);
      let col = [50 - d * 14, 56 - d * 16, 70 - d * 20];
      // the crown: a band, three points, three jewels
      const bandTop = cy + N * 0.02, bandBot = cy + N * 0.22;
      const halfW = N * 0.3;
      const inBand = y >= bandTop && y <= bandBot && Math.abs(x - cx) <= halfW;
      // points: triangles rising from the band
      let inPoint = false;
      for (const [px, ph] of [[cx - halfW * 0.72, N * 0.24], [cx, N * 0.34], [cx + halfW * 0.72, N * 0.24]]) {
        const top = bandTop - ph;
        if (y >= top && y <= bandTop) {
          const k = (y - top) / ph;
          if (Math.abs(x - px) <= k * halfW * 0.36 + 1) inPoint = true;
        }
      }
      const gem = inCircle(x, y, cx, cy + N * 0.12, N * 0.05) || inCircle(x, y, cx - halfW * 0.72, bandTop - N * 0.24, N * 0.035)
        || inCircle(x, y, cx + halfW * 0.72, bandTop - N * 0.24, N * 0.035) || inCircle(x, y, cx, bandTop - N * 0.34, N * 0.04);
      if (inBand || inPoint) {
        // lit from the upper left
        const lit = 1 - ((x - (cx - halfW)) / (halfW * 2)) * 0.45 - ((y - (bandTop - N * 0.34)) / (N * 0.56)) * 0.25;
        col = [232 * lit, 196 * lit, 84 * lit];
      }
      if (gem) col = inCircle(x, y, cx, cy + N * 0.12, N * 0.05) ? [176, 58, 74] : [236, 236, 244];
      put(x, y, col.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
    }
  }
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
