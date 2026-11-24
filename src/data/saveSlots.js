// ============ SAVE FILES ============
// Three save files (owner, 2026-11-24: "start fresh games on my phone without
// losing all my campaign progress"). The file in use lives in the ordinary
// keys, so every store reads and writes exactly as it always has; the other
// two wait, packed, inside ONE record, SLOTS. A save from before save files
// is simply File 1 (nothing moves).
//
// Which keys belong to a file: every "crownguard.*" key except the device's
// own settings (DEVICE: sound, display, the Free Play setup, the iOS copy) and
// SLOTS itself. So a NEW progress key is part of each file with no change
// here; a new device-wide setting must be added to DEVICE.
//
// Switching files packs the live keys away, unpacks the chosen file (or none:
// a new game) and reloads, since every store reads its key once at load.
// It is done so that a reload or a crash at any moment loses nothing: the
// first write keeps BOTH files in SLOTS, and settleSlots() (main.jsx, before
// the game's modules load) finishes a switch that was cut off.
//
// The save code (backup.js) carries SLOTS with the rest, so a code is every
// file; a code made before save files restores into the file in use and
// leaves the other two alone (backup.js restoreSave keeps SLOTS then).

export const SLOTS = "crownguard.slots.v1";
export const FILE_COUNT = 3;
const DEVICE = new Set([
  "crownguard.sound.v1", "crownguard.prefs.v1", "crownguard.sandbox.v1", "crownguard.copy", SLOTS,
]);
export const inFile = (k) => k.startsWith("crownguard.") && !DEVICE.has(k);

const fileKeys = () => {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && inFile(k)) out.push(k);
  }
  return out;
};
const packLive = () => {
  const keys = {};
  for (const k of fileKeys()) keys[k] = localStorage.getItem(k);
  return { keys, at: Date.now() };
};
const unpack = (file) => {
  for (const k of fileKeys()) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(file?.keys || {})) if (inFile(k) && typeof v === "string") localStorage.setItem(k, v);
};

// { active: 1..3, files: { "2": { keys, at }, ... } } (only the files NOT in use)
export function readSlots() {
  try {
    const raw = JSON.parse(localStorage.getItem(SLOTS) || "null");
    const active = Number.isInteger(raw?.active) && raw.active >= 1 && raw.active <= FILE_COUNT ? raw.active : 1;
    const files = raw?.files && typeof raw.files === "object" ? raw.files : {};
    return { active, files };
  } catch {
    return { active: 1, files: {} };
  }
}
const writeSlots = (s) => localStorage.setItem(SLOTS, JSON.stringify(s));

// Run once at launch, before any store loads: a switch cut off after its
// first write left the chosen file packed (files[active]); unpack it now.
export function settleSlots() {
  try {
    const s = readSlots();
    const f = s.files[s.active];
    if (!f) return;
    unpack(f);
    delete s.files[s.active];
    writeSlots(s);
  } catch { /* no storage: nothing to settle */ }
}

// Put file n in use (an empty one starts a new game) and reload.
export function switchFile(n) {
  const s = readSlots();
  if (n === s.active || n < 1 || n > FILE_COUNT) return;
  // both files kept; a file never played is unpacked as nothing, so the old one's keys go
  writeSlots({ active: n, files: { ...s.files, [s.active]: packLive(), [n]: s.files[n] || { keys: {} } } });
  settleSlots();
  location.reload();
}

// Wipe file n. The file in use starts a new game (and the page reloads).
export function eraseFile(n) {
  const s = readSlots();
  if (n === s.active) {
    for (const k of fileKeys()) localStorage.removeItem(k);
    location.reload();
    return;
  }
  delete s.files[n];
  writeSlots(s);
}

// What the Save Files box shows for each file: null for an empty one.
const parse = (raw) => { try { return JSON.parse(raw || "null"); } catch { return null; } };
export function fileSummaries(levels) {
  const s = readSlots();
  const out = [];
  for (let n = 1; n <= FILE_COUNT; n++) {
    const keys = n === s.active ? packLive().keys : s.files[n]?.keys;
    const at = n === s.active ? null : s.files[n]?.at ?? null;
    const camp = parse(keys?.["crownguard.campaign.v1"]) || {};
    const prof = parse(keys?.["crownguard.profile.v1"]) || {};
    const ck = parse(keys?.["crownguard.checkpoint.v1"]);
    const cleared = levels.filter((l) => camp.cleared?.[l.id]).length;
    const stars = Object.values(prof.stars || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const xp = Number(prof.xp) || 0;
    const next = levels.find((l) => !camp.cleared?.[l.id]) || null;
    const empty = !cleared && !stars && !xp && !ck;
    out.push({ n, active: n === s.active, empty, cleared, stars, xp, next: next?.name || null, at });
  }
  return out;
}
