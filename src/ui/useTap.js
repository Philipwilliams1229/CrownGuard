// ============ ONE TAP, ONE ACTION ============
// Little "tap to open" toggles (the wave panel's enemy chips, the weather's
// (i)) once flashed open and shut on a phone's first tap: a finger also sends
// the browser's emulated mouse events (mouseenter, then click), so a chip that
// opened on hover was closed again by the click a moment later, and iOS may
// hold back or repeat the click when the page changes under the finger.
//
// useTap() gives a function that turns a handler into props that run it ONCE
// per tap on every device: a finger or pen runs it when it lifts (if it did not
// slide away, which a scroll does), and the click the browser sends after that
// touch is ignored; a mouse (or the keyboard on a button) runs it on click.
//
//   const tap = useTap();
//   <button {...tap(() => setOpen((o) => !o))}>i</button>
//
// One hook can serve a whole row of chips: there is only one finger to follow.

import { useRef } from "react";

const SLIDE = 10;    // css px a finger may wander and still tap
const ECHO = 700;    // ms after a touch tap in which the browser's click is its echo

export default function useTap() {
  const r = useRef({ id: null, x: 0, y: 0, at: -1e9 });
  return (fn) => ({
    onPointerDown: (e) => {
      if (e.pointerType === "mouse") return;
      const s = r.current;
      s.id = e.pointerId; s.x = e.clientX; s.y = e.clientY;
    },
    onPointerUp: (e) => {
      const s = r.current;
      if (e.pointerType === "mouse" || s.id !== e.pointerId) return;
      s.id = null;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLIDE) return;
      s.at = performance.now();
      fn(e);
    },
    onPointerCancel: () => { r.current.id = null; },
    onClick: (e) => {
      if (performance.now() - r.current.at < ECHO) return;
      fn(e);
    },
  });
}
