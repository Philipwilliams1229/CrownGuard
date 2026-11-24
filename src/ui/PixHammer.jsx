// ============ PixHammer ============
// The Masons' button icon (owner, 2026-11-24: "a hammer in the new style"): a mason's hammer
// sculpted with the pixel sculptor (render/pix/pix.js), so it shades and lines like the game's
// figures: one-pixel tinted line, light from the upper left. Baked once.

import { useRef, useEffect } from "react";
import { Pix, mat, toCanvas } from "../render/pix/pix.js";

const SUN = [-0.6, -0.62, 0.5];   // a fixed upper-left light: the tray is not on the board
let BAKED = null;
const bake = () => {
  if (BAKED) return BAKED;
  const S = 18, p = new Pix(S, S, 1, 1);
  const WOOD = mat("#9a6c40"), GRIP = mat("#5b3a26"), IRON = mat("#8c929c", { contrast: 1.15 }), BAND = mat("#6f747e");
  // the haft, lower left up to the head, with a leather grip at its foot
  p.part().capsule(2.2, 13.6, 1.25, 9.6, 6.2, 1.05, WOOD, 0);
  p.capsule(2.2, 13.6, 1.4, 4.6, 11.2, 1.35, GRIP, 0.5, { wrap: true });
  // the head across the haft's top: a square face to the lower right, a tapering peen up left
  const d = [0.7071, -0.7071], q = [0.7071, 0.7071], c = [10.4, 5.4];
  const at = (s, t) => [c[0] + q[0] * s + d[0] * t, c[1] + q[1] * s + d[1] * t];
  p.part().poly([at(-5.6, -0.9), at(-5.6, 0.9), at(-1.5, 2.3), at(3.2, 2.3), at(3.2, -2.3), at(-1.5, -2.3)], IRON, 2);
  p.part().poly([at(3.2, -2.7), at(3.2, 2.7), at(4.8, 2.7), at(4.8, -2.7)], IRON, 2.2);
  // the eye's iron band where the haft goes through
  p.capsule(...at(-0.4, -2.2), 0.6, ...at(-0.4, 2.2), 0.6, BAND, 2.4, { wrap: true });
  const img = p.resolve({ sun: SUN });
  BAKED = toCanvas(img);
  return BAKED;
};

export default function PixHammer({ box = 26 }) {
  const ref = useRef(null);
  const cv = typeof document === "undefined" ? null : bake();
  useEffect(() => {
    const c = ref.current;
    if (!c || !cv) return;
    const x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(cv, 0, 0);
  }, [cv]);
  return <canvas ref={ref} width={18} height={18} style={{ width: box, height: box, imageRendering: "pixelated", flexShrink: 0 }} />;
}
