// ============ SHARED UI STYLE ============
// The chunky pixel-panel look, in one place so the game shell, the home
// page, and the pause menu all stay in step. The battle HUD's fuller skin
// (oak frames, parchment, gold) is ui/hud/hud.css, built on these colours.

export const FONT = "Verdana, Geneva, sans-serif";
// the pixel face for headings and labels (loaded in index.html): Silkscreen,
// whose C, O, S, 5 and 8 stay distinct even at 10px
export const DISPLAY = "'Silkscreen', Verdana, Geneva, sans-serif";

// the HUD palette: ink rims, plum-slate panels, oak, parchment and gold
export const INK = "#241a26";
export const SLATE = { face: "#2e2633", lt: "#4a3e50", dk: "#1b141e", btn: "#4a3e50", btnLt: "#62546a" };
export const GOLD = { face: "#d8b34a", lt: "#f0d27a", dk: "#8a6a24" };
export const CREAM = "#f2e6c4";

export const btn = {
  fontFamily: FONT, cursor: "pointer", border: `2px solid ${INK}`,
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
  textShadow: `2px 2px 0 ${INK}`, fontFamily: DISPLAY, fontWeight: "bold",
});
