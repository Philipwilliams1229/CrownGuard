// ============ THE TINTED ONE-PIXEL LINE, FOR BAKED PIECES ============
// The new style's outline (the owner's pick, "outline C"): not near-black but
// the darkest of the piece's own colour mixed with the ink, so a rusted spike
// has a dark-rust edge and a bone a dark-umber one. `inkTint` is a drop-in
// for paint.js inkOutline: the same arguments (cv, ink, passes, only).
import { INK_LINE } from "./paint.js";

const K = 0.4;                 // how much of the piece's own colour the line keeps

export const inkTint = (cv, ink = INK_LINE, passes = 1, only = null) => {
  const c = cv.getContext("2d");
  const w = cv.width, h = cv.height;
  const img = c.getImageData(0, 0, w, h), d = img.data;
  const ir = parseInt(ink.slice(1, 3), 16), ig = parseInt(ink.slice(3, 5), 16), ib = parseInt(ink.slice(5, 7), 16);
  // ring[i]: 1 = solid body (alpha), 2 = an inked ring pixel (its colour already set)
  let ring = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ring[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(ring);
    const put = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (ring[i]) continue;
      const nb = [];
      if (only === "under") {
        if (y > 0 && ring[i - w]) nb.push(i - w);
        if (y > 0 && x > 0 && ring[i - w - 1] && x < w - 1 && !ring[i + 1]) nb.push(i - w - 1);
        if (y > 0 && x < w - 1 && ring[i - w + 1] && x > 0 && !ring[i - 1]) nb.push(i - w + 1);
      } else {
        if (x > 0 && ring[i - 1]) nb.push(i - 1);
        if (x < w - 1 && ring[i + 1]) nb.push(i + 1);
        if (y > 0 && ring[i - w]) nb.push(i - w);
        if (y < h - 1 && ring[i + w]) nb.push(i + w);
      }
      if (!nb.length) continue;
      let r = 0, g = 0, b = 0;
      for (const j of nb) { r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; }
      r /= nb.length; g /= nb.length; b /= nb.length;
      // the first ring is the tint; a later ring just carries it outward
      if (pass === 0) put.push(i, ir + (r - ir) * K * 0.55, ig + (g - ig) * K * 0.55, ib + (b - ib) * K * 0.55);
      else put.push(i, r, g, b);
      next[i] = 1;
    }
    for (let n = 0; n < put.length; n += 4) {
      const i = put[n];
      d[i * 4] = put[n + 1]; d[i * 4 + 1] = put[n + 2]; d[i * 4 + 2] = put[n + 3]; d[i * 4 + 3] = 235;
    }
    ring = next;
  }
  c.putImageData(img, 0, 0);
  return cv;
};
