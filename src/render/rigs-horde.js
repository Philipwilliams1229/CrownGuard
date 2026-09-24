// ============ RIGS: THE GREENWOOD HORDE ============
// Bespoke bodies for the Greenwood roster. Entries in HORDE_RIGS override the
// generic ones in rigs.js (same shape: { kind, box: { hw, up, down }, p, fly? });
// HORDE_PAINTERS maps each new `kind` to its painter (ctx, p) — the pose is
// p.pose ("walk" | "fight") and p.frame (0-3 walk, 0-1 fight), feet at 0,0,
// facing +x. Frames are baked once and inked by rigs.js.

export const HORDE_RIGS = {};
export const HORDE_PAINTERS = {};
