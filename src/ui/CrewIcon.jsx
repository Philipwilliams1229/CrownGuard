// ============ CrewIcon ============
// A castle crewman's pixel figure as a small icon (the tray's Masons button: the mason who
// works on the wall, render/pix/fig-mason.js), framed tight by his own pixels, as EnemyIcon
// does for foes. Baked once per figure and clip frame.

import { useRef, useEffect } from "react";
import { crew, drawCrewPix } from "../render/pix/crews.js";
import * as masonFig from "../render/pix/fig-mason.js";

const FIGS = { mason: () => crew("mason", masonFig) };
const BAKED = new Map();
// the figure drawn at 2 canvas px a board px, then cropped to its own pixels
const bake = (kind, clip, frame) => {
  const key = `${kind}|${clip}|${frame}`;
  if (BAKED.has(key)) return BAKED.get(key);
  const fig = FIGS[kind]();
  const cv = document.createElement("canvas"); cv.width = 96; cv.height = 96;
  const x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
  x.save(); x.scale(2, 2); drawCrewPix(x, fig, 24, 44, 1, clip, frame); x.restore();
  const d = x.getImageData(0, 0, 96, 96).data;
  let x0 = 96, y0 = 96, x1 = -1, y1 = -1;
  for (let y = 0; y < 96; y++) for (let i = 0; i < 96; i++) if (d[(y * 96 + i) * 4 + 3] > 40) { x0 = Math.min(x0, i); y0 = Math.min(y0, y); x1 = Math.max(x1, i); y1 = Math.max(y1, y); }
  const out = x1 < 0 ? { cv, w: 1, h: 1, sx: 0, sy: 0 } : { cv, w: x1 - x0 + 1, h: y1 - y0 + 1, sx: x0, sy: y0 };
  BAKED.set(key, out);
  return out;
};

export default function CrewIcon({ kind = "mason", clip = "work", frame = 0, box = 26 }) {
  const ref = useRef(null);
  const b = typeof document === "undefined" ? null : bake(kind, clip, frame);
  const w = b ? b.w : box, h = b ? b.h : box, scale = box / Math.max(w, h);
  useEffect(() => {
    const c = ref.current;
    if (!c || !b) return;
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, w, h);
    x.drawImage(b.cv, b.sx, b.sy, w, h, 0, 0, w, h);
  }, [b, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", flexShrink: 0 }} />;
}
