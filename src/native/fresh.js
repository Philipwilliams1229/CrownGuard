// ============ OPEN THE NEWEST BUILD ============
// GitHub Pages lets a browser reuse the page for 10 minutes, and an iPhone's
// home-screen web app does just that: reopened right after a push, it ran the
// old build (owner, 2026-11-07). So at launch, on the web only, ask for the
// deployed build's stamp (version.json, written by vite.config.js's build and
// fetched past every cache) and, if it is newer than the build running, load
// the page again from a fresh address (?v=<built>) that no cache holds. Once
// per new build (sessionStorage), so a stale CDN can never loop it; offline or
// slow (2 s), the game just starts. The iOS app carries its own copy and the
// dev server is always fresh: neither asks.
import { native } from "./app.js";

const TRIED = "cg-fresh";
export const freshen = async () => {
  if (native || import.meta.env.DEV || typeof __BUILD__ === "undefined") return false;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2000);
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store", signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) return false;
    const live = await r.json();
    if (!(live.built > __BUILD__.built)) return false;
    if (sessionStorage.getItem(TRIED) === String(live.built)) return false;
    sessionStorage.setItem(TRIED, String(live.built));
    const url = new URL(location.href);
    url.searchParams.set("v", String(live.built));
    location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
};
