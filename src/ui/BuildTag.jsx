// The version stamp in the title screen's corner, so a refresh that picked up
// new work can be told from one that did not: "5 Oct · Build 3 · 16:42", the
// day's own build count (vite.config.js: commits made today, a * for work not
// yet committed) and the time of the latest change. A production build shows
// when it was built; the dev server reads it fresh on page load (the time is
// the newest source edit or commit) and adds when this page loaded.
import { useState, useEffect } from "react";

const hm = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const hms = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const day = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const LOADED = Date.now();

export default function BuildTag({ style }) {
  const baked = typeof __BUILD__ !== "undefined" ? __BUILD__ : null;
  const [dev, setDev] = useState(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let live = true;
    fetch("/__version", { cache: "no-store" }).then((r) => r.json()).then((j) => live && setDev(j)).catch(() => {});
    return () => { live = false; };
  }, []);
  const b = import.meta.env.DEV ? dev : baked;
  if (!b) return null;
  const at = import.meta.env.DEV ? Math.max(b.edited || 0, b.committed || 0) : b.built;
  return (
    <div aria-hidden="true" style={{ pointerEvents: "none", lineHeight: 1.5, color: "#d8c8a0", textShadow: "1px 1px 0 #101322", ...style }}>
      <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 1, color: "#f2cf4a", opacity: 0.95 }}>{day(at)} · Build {b.today}{b.dirty ? "*" : ""} · {hm(at)}</div>
      <div style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.7 }}>v{b.version} · {b.hash}{import.meta.env.DEV ? ` · loaded ${hms(LOADED)}` : ""}</div>
    </div>
  );
}
