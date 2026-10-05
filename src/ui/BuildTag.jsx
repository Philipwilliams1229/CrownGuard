// The version stamp in the title screen's corner, so a refresh that picked up
// new work can be told from one that did not. A production build shows what
// vite.config.js baked in (version, build number, hash, date); the dev server
// shows the same read fresh on page load plus when the newest source edit was
// and when this page loaded.
import { useState, useEffect } from "react";

const clock = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const LOADED = Date.now();

const tag = (b) => `v${b.version} · build ${b.build} · ${b.hash}${b.dirty ? "*" : ""}`;

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
  const when = import.meta.env.DEV
    ? ` · edited ${clock(b.edited)} · loaded ${clock(LOADED)}`
    : ` · ${new Date(b.built).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  return <div aria-hidden="true" style={{ pointerEvents: "none", fontSize: 9, letterSpacing: 0.5, color: "#d8c8a0", opacity: 0.7, textShadow: "1px 1px 0 #101322", ...style }}>{tag(b)}{when}</div>;
}
