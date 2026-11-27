// Giving a dropped canvas's memory back at once (2026-11-27, the phones' "second level after
// launch is slow" reports). WebKit frees a canvas's pixels only when the canvas itself is
// collected, and on iOS that can come long after a cache lets go of it: the old level's bakes
// sit in memory while the new level bakes its own, and every drawing pass slows. Shrinking a
// canvas to 1 x 1 frees its pixels now. Never 0 x 0: drawing a 0-wide canvas throws, while a
// stray draw of a 1 x 1 one only lays down one transparent pixel.
// Call it ONLY on a canvas nothing will draw again (a cache's entry as it is dropped).
// A leaf module: imports nothing.
export const RELEASED = { n: 0, mb: 0 };
const isCanvas = (v) => typeof HTMLCanvasElement !== "undefined" && v instanceof HTMLCanvasElement
  || typeof OffscreenCanvas !== "undefined" && v instanceof OffscreenCanvas;
export const release = (cv) => {
  if (!cv || !isCanvas(cv) || cv.width * cv.height <= 1) return;
  RELEASED.n++; RELEASED.mb += (cv.width * cv.height * 4) / 1048576;
  cv.width = 1; cv.height = 1;
};
// every canvas inside a cache's value: a canvas, an array, a Map / Set, or a plain record of them
// (a few levels deep; typed arrays and other objects are skipped)
export const releaseDeep = (v, depth = 4) => {
  if (!v || depth < 0) return;
  if (isCanvas(v)) return release(v);
  if (typeof v !== "object" || ArrayBuffer.isView(v)) return;
  if (v instanceof Map) { for (const x of v.values()) releaseDeep(x, depth - 1); return; }
  if (v instanceof Set || Array.isArray(v)) { for (const x of v) releaseDeep(x, depth - 1); return; }
  if (Object.getPrototypeOf(v) !== Object.prototype) return;
  for (const k in v) releaseDeep(v[k], depth - 1);
};
