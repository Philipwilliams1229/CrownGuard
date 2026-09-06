// ============ SHARED UI STYLE ============
// The chunky pixel-panel look, in one place so the game shell, the home
// page, and the pause menu all stay in step.

export const FONT = "Verdana, Geneva, sans-serif";

export const btn = {
  fontFamily: FONT, cursor: "pointer", border: "2px solid #10131a",
  background: "#3a4150", color: "#e8e0c8", borderRadius: 0,
  padding: "10px 12px", fontSize: 13, textAlign: "left", minHeight: 40,
  boxShadow: "inset -2px -2px 0 #262b36, inset 2px 2px 0 #545c6e",
};

export const panel = {
  background: "#2c313c", border: "3px solid #10131a", borderRadius: 0, padding: 10,
  boxShadow: "inset 0 0 0 2px #454c5a",
};

export const disabled = { opacity: 0.45, cursor: "not-allowed" };

export const overlayPanel = {
  background: "rgba(38,42,52,0.97)", border: "3px solid #10131a", boxSizing: "border-box",
};

// The gold CROWNGUARD wordmark. `size` is the font size in px.
export const title = (size) => ({
  margin: 0, fontSize: size, letterSpacing: size * 0.18, color: "#d8b34a",
  textShadow: "2px 2px 0 #10131a", fontFamily: FONT, fontWeight: "bold",
});
