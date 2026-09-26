// ============ MORE HOLLOW REALMS ============
// Battlefields added to the chapter after the first set. maps.js calls this
// with its hollowVariant(...) helper (the chapter's ground, palette, water
// and light) and merges what it returns into REALMS, so this file never
// imports maps.js (no import cycle).
export default function moreHollowRealms(hollowVariant) {
  return {};
}
