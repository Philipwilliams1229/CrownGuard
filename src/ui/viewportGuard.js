// Keeps taps where the finger is on an iPad home-screen app.
//
// iOS/iPadOS 26 (the WebKit bug 301108 family): a home-screen app with the
// see-through status bar can slip into a hidden scroll offset one status bar
// tall (32 px on an iPad mini) — after a turn to portrait and back, a swipe
// that nudges the page (index.html lets html/body be 100lvh and unclipped
// there, see art/STYLE-GUIDE.md), or a return from the background. The
// fixed #root still paints flush with the glass, but the browser hit-tests
// against the shifted page, so every tap lands a status bar off: the owner
// had to touch below what they meant. Whenever the page or the visual
// viewport is found off its origin, scroll it back to 0,0.
//
// Left alone while the on-screen keyboard is up (it offsets the visual
// viewport on purpose: Settings > Progress takes a pasted save code).

const editing = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
};

function reset() {
  const vv = window.visualViewport;
  if (editing()) return;
  if (vv && window.innerHeight - vv.height > 150) return; // the keyboard is up
  const off = Math.abs(window.scrollX) >= 1 || Math.abs(window.scrollY) >= 1
    || (vv && (Math.abs(vv.offsetTop) >= 1 || Math.abs(vv.offsetLeft) >= 1))
    || document.body.getBoundingClientRect().top <= -1;
  if (!off) return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// iOS settles a turn of the device over a few frames, so look again shortly after
let timer = 0;
function soon() {
  reset();
  requestAnimationFrame(reset);
  clearTimeout(timer);
  timer = setTimeout(reset, 350);
}

export function guardViewport() {
  window.addEventListener("scroll", reset, { passive: true });
  window.addEventListener("resize", soon);
  window.addEventListener("orientationchange", soon);
  window.addEventListener("pageshow", soon);
  window.addEventListener("focusout", () => setTimeout(soon, 50));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) soon(); });
  screen.orientation?.addEventListener?.("change", soon);
  const vv = window.visualViewport;
  if (vv) { vv.addEventListener("resize", soon); vv.addEventListener("scroll", reset); }
  soon();
}
