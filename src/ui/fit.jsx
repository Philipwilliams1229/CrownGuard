// ============ FITTING THE SCREEN ============
// One system for every screen size, from a phone on its side to a desktop:
//
//  - useViewport(): the live size of the visible screen, plus `short` (a
//    phone on its side: under 500px tall) and `scale`, the size the HUD and
//    menus are drawn at. The game was laid out for an iPad mini on its side
//    (1133x744) at scale 1; smaller screens draw the same UI smaller, never
//    below MIN_SCALE so words stay readable and taps stay hittable.
//  - <Fit>: fills its parent and shrinks its child, whole, until it fits
//    without scrolling. Menus that must never scroll (the title screen, the
//    pause menu) sit inside one.
//
// Scaling uses transform: scale(), never CSS zoom: every browser agrees on
// transforms, and a transform leaves layout sizes (offsetHeight) honest, so
// the child can be measured at its natural size and then shrunk.

import { useState, useEffect, useLayoutEffect, useRef } from "react";

export const MIN_SCALE = 0.72;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The UI scale for a screen of w x h CSS pixels.
export function uiScale(w, h) {
  return clamp(Math.min(h / 700, w / 1100), MIN_SCALE, 1);
}

function readViewport() {
  if (typeof window === "undefined") return { w: 1133, h: 744 };
  const vv = window.visualViewport;
  // the visual viewport is what's actually showing (it excludes Safari's bars)
  return { w: Math.round(vv?.width || window.innerWidth), h: Math.round(vv?.height || window.innerHeight) };
}

export function useViewport() {
  const [vp, setVp] = useState(readViewport);
  useEffect(() => {
    const on = () => setVp((o) => { const n = readViewport(); return n.w === o.w && n.h === o.h ? o : n; });
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
      window.visualViewport?.removeEventListener("resize", on);
    };
  }, []);
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  return {
    ...vp,
    scale: uiScale(vp.w, vp.h),
    short: vp.h < 500,                // a phone on its side
    narrow: vp.w < 560,               // a phone held upright
    landscape: vp.w > vp.h,
    touch: !!coarse,
  };
}

// <Fit> fills its parent (give the parent a size) and scales its one child
// down until the child's natural height AND width fit inside. The child is
// laid out at width = parent width / scale, so text reflows into the extra
// room rather than being squeezed. `max` caps growth (default: never grow).
// `align` places the scaled child: "center" (default) or "top". A child too
// tall to fit even at `min` is drawn at `min` and the box scrolls — the one
// escape hatch, for long pickers on the smallest screens.
export function Fit({ children, max = 1, min = 0.4, align = "center", style, innerStyle, deps = [] }) {
  const outer = useRef(null), inner = useRef(null);
  const [s, setS] = useState(1);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    let raf = 0;
    const fit = () => {
      const ow = o.clientWidth, oh = o.clientHeight;
      if (!ow || !oh) return;
      // settle in a few passes: the width we lay out at depends on the scale
      let k = 1;
      for (let n = 0; n < 4; n++) {
        i.style.width = `${ow / k}px`;
        const nh = i.offsetHeight, nw = i.scrollWidth;
        const next = clamp(Math.min(max, oh / nh, ow / nw), min, max);
        if (Math.abs(next - k) < 0.005) { k = next; break; }
        k = next;
      }
      i.style.width = `${ow / k}px`;
      const tooTall = i.offsetHeight * k > oh + 1;
      setS((old) => (Math.abs(old - k) < 0.001 ? old : k));
      setOver(tooTall);
    };
    fit();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(o);
    // content that grows or shrinks (fonts arriving, a new line) refits too
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    mo.observe(i, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready?.then(() => { raf = requestAnimationFrame(fit); });
    return () => { ro.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, min, ...deps]);
  const top = align === "top" || over;
  return (
    <div ref={outer} className={over ? "cg-scroll" : undefined} style={{ position: "relative", width: "100%", height: "100%", overflowX: "hidden", overflowY: over ? "auto" : "hidden", ...style }}>
      <div ref={inner} style={{
        position: "absolute", left: "50%", top: top ? 0 : "50%",
        transform: `translate(-50%, ${top ? "0" : "-50%"}) scale(${s})`,
        transformOrigin: top ? "50% 0" : "50% 50%",
        boxSizing: "border-box", ...innerStyle,
      }}>
        {children}
      </div>
    </div>
  );
}
