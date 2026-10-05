// ============ SHARED UI STYLE ============
// The chunky pixel-panel look, in one place so the game shell, the home
// page, and the pause menu all stay in step. The battle HUD's fuller skin
// (oak frames, parchment, gold) is ui/hud/hud.css, built on these colours.

import { FONTS } from "./fonts.js";

// The faces, from fonts.js (the one place a font family is named; it sets
// the CSS variables these read). FONT, DISPLAY, TITLE, HEAD and NUM are the
// variables themselves, so hud.css can find their elements (a type option
// with `caps` sets the DISPLAY and TITLE ones in capitals); MARK, MENU and
// MAP are family stacks (MAP goes into SVG attributes, which can't read
// variables).
export const FONT = "var(--body)";         // long text, blurbs
export const DISPLAY = "var(--display)";   // headings and labels
export const TITLE = "var(--title)";       // screen and card titles
export const HEAD = "var(--head)";         // the campaign map's heads
export const MARK = FONTS.mark;            // the CROWNGUARD wordmark
export const MENU = FONTS.menu;            // the menu buttons (btn below)
export const MAP = FONTS.map;              // the campaign map's labels
// anything with digits, for inline styles. It carries no font-size-adjust:
// the War Council's numbers were written with `fontSizeAdjust: 0.58` as a
// number, which React sends as "0.58px" (ignored), so they have always shown
// Press Start 2P at full size; kept so. hud.css's .cg-num does apply it.
export const NUM = { fontFamily: "var(--numeric)", fontWeight: 400 };

// what the stars screen is called (it was the "War Council"): the title menu's button and the screen's heading
export const COUNCIL_NAME = "SKILLS & HEROES";

// the HUD palette: ink rims, plum-slate panels, oak, parchment and gold
export const INK = "#241a26";
export const SLATE = { face: "#2e2633", lt: "#4a3e50", dk: "#1b141e", btn: "#4a3e50", btnLt: "#62546a" };
export const GOLD = { face: "#d8b34a", lt: "#f0d27a", dk: "#8a6a24" };
export const CREAM = "#f2e6c4";

export const btn = {
  fontFamily: MENU, cursor: "pointer", border: `2px solid ${INK}`,
  background: SLATE.btn, color: CREAM, borderRadius: 0,
  padding: "10px 12px", fontSize: 13, textAlign: "left", minHeight: 40,
  boxShadow: `inset -2px -2px 0 ${SLATE.face}, inset 2px 2px 0 ${SLATE.btnLt}`,
};

export const panel = {
  background: SLATE.face, border: `3px solid ${INK}`, borderRadius: 0, padding: 10,
  boxShadow: `inset 2px 2px 0 ${SLATE.lt}, inset -2px -2px 0 ${SLATE.dk}`,
};

export const disabled = { opacity: 0.45, cursor: "not-allowed", filter: "grayscale(0.7)" };

export const overlayPanel = {
  background: "rgba(46,38,51,0.97)", border: `3px solid ${INK}`, boxSizing: "border-box",
};

// The gold CROWNGUARD wordmark. `size` is the font size in px.
export const title = (size) => ({
  margin: 0, fontSize: size, letterSpacing: size * 0.14, color: GOLD.face,
  textShadow: `2px 2px 0 ${INK}`, fontFamily: TITLE, fontWeight: "bold",
});
