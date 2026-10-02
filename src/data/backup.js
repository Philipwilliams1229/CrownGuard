// ============ SAVE BACKUP ============
// The whole save, as one line of text the player can copy to another device
// (the Settings window's Progress tab). A save is every localStorage key the
// game owns: "crownguard.*" (campaign, profile, sandbox, sound, prefs, hero)
// and "cg-type". A new key under "crownguard." is carried with no change here.
//
// The code is HEAD + base64 of { game, v, at, keys: { key: raw string } }.
// Restoring replaces this device's save whole; the caller reloads the page,
// since every store reads its key once at load.

const HEAD = "CROWNGUARD-SAVE:";
const own = (k) => k.startsWith("crownguard.") || k === "cg-type";

function ownKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && own(k)) out.push(k);
  }
  return out;
}

const toB64 = (s) => { let bin = ""; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
const fromB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));

export function makeSaveCode() {
  const keys = {};
  for (const k of ownKeys()) keys[k] = localStorage.getItem(k);
  return HEAD + toB64(JSON.stringify({ game: "crownguard", v: 1, at: new Date().toISOString(), keys }));
}

// Read a pasted code: { at, keys } or throw an Error with a message fit to
// show the player. Forgiving about what comes with it: a share sheet's title
// or a note's text before it, invisible characters a phone's paste slips in,
// the code pasted twice, a changed case in the head, or the head left off.
export function readSaveCode(text) {
  const t = String(text || "").replace(/[\s\u200B-\u200D\u2060\uFEFF]+/g, "");
  if (!t) throw new Error("Paste a save code first.");
  const at = t.toUpperCase().indexOf(HEAD);
  const rest = at >= 0 ? t.slice(at + HEAD.length) : t;
  const next = rest.toUpperCase().indexOf("CROWNGUARD");   // a second copy's head
  const body = (next >= 0 ? rest.slice(0, next) : rest).match(/^[A-Za-z0-9+/]+=*/);
  let data;
  try { data = JSON.parse(fromB64(body[0])); } catch {
    throw new Error(at >= 0 ? "That code is damaged: copy the whole of it and try again." : "That isn't a Crownguard save code.");
  }
  if (!data || data.game !== "crownguard" || !data.keys || typeof data.keys !== "object") throw new Error("That isn't a Crownguard save code.");
  const keys = {};
  for (const [k, v] of Object.entries(data.keys)) if (own(k) && typeof v === "string") keys[k] = v;
  if (!Object.keys(keys).length) throw new Error("That save code is empty.");
  return { at: data.at, keys };
}

export function restoreSave(save) {
  for (const k of ownKeys()) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(save.keys)) localStorage.setItem(k, v);
}

// Everything the game remembers, gone: progress, stars, settings.
export function eraseAll() {
  for (const k of ownKeys()) localStorage.removeItem(k);
}
