// ============ THE CASTLE MARK ============
// The game's one castle symbol, used everywhere a castle stands for the game
// or its walls: the app icon (scripts/make-icons.mjs), the title screen, the
// Castle button and the castle works. It is the battle castle in miniature —
// two square towers under red roofs, the crenellated gatehouse between them
// with its oak gate, and the crown's blue banner flying over it. A pixel
// grid, one letter per art pixel; "." is empty.
export const CASTLE_MARK = [
  "...kk....kBBBk.kk...",
  "..kRRk...kBbk.kRRk..",
  ".kRRRrk..k...kRRRrk.",
  "kRRRRrrk.k..kRRRRrrk",
  "kkkkkkkk.k..kkkkkkkk",
  ".kSSStkkSkkSkkSSStk.",
  ".kSSStkSSSSSSkSSStk.",
  ".kStStkttttttkStStk.",
  ".kSSStkSSSSSSkSSStk.",
  ".kSSStkSSkkSSkSSStk.",
  ".kSSStkSkWWkSkSSStk.",
  ".kSSStkSkWwkSkSSStk.",
  ".kSttTktkWwktkSttTk.",
  ".kkkkkkkkkkkkkkkkkk.",
];
export const CASTLE_PAL = {
  k: "#241a26",                                     // ink
  S: "#c9c2b2", t: "#a19a8a", T: "#7c7566",         // stone, lit to shaded
  R: "#e0574c", r: "#a8363c",                       // roof tiles
  B: "#4e78b0", b: "#8ab8e0",                       // the crown's banner
  W: "#5a3a22", w: "#8a6440",                       // the oak gate
};
