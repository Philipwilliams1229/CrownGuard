// ============ RIGS: THE CROWN'S OWN ============
// Bespoke bodies for the player's soldiers. Entries in CROWN_RIGS override
// the generic ones in rigs.js (same shape: { kind, box: { hw, up, down }, p });
// CROWN_PAINTERS maps each new `kind` to its painter (ctx, p) — pose is
// p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-1 fight), feet at 0,0,
// facing +x. Frames are baked once and inked by rigs.js.

export const CROWN_RIGS = {};
export const CROWN_PAINTERS = {};
