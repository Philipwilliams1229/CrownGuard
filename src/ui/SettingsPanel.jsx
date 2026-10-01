// ============ SETTINGS ============
// The SETTINGS window (the title screen's, and the pause menu's): a row of
// tabs over one panel, and Done. A new tab is one more entry in TABS (an id,
// a name, what it shows, and `home: true` if it belongs on the title screen
// only). It sits outside any <Fit> (a fixed modal inside a transform would
// pin to it).
//   Sound     SoundPanel (audio/settings.js)
//   Display   screen shake, floating numbers (data/prefs.js)
//   Progress  back up / restore the save as a code (data/backup.js), start
//             the campaign over, erase everything. Title screen only: a
//             restore or an erase reloads the page.
import { useState, useReducer, useEffect, useRef } from "react";
import SoundPanel from "./SoundPanel.jsx";
import { prefs, setPrefs, onPrefs } from "../data/prefs.js";
import { makeSaveCode, readSaveCode, restoreSave, eraseAll } from "../data/backup.js";
import { resetProgress } from "../data/campaign.js";
import "./hud/hud.css";
import "./hud/sandbox.css";

const cls = (...a) => a.filter(Boolean).join(" ");
const note = { fontFamily: "var(--body)", fontSize: 11, lineHeight: 1.4, color: "var(--muted)", textShadow: "none" };
const say = { ...note, color: "var(--text)" };

// a switch: one plank that reads its state, with a line under it
function Switch({ label, on, onFlip, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button className={cls("cg-btn", on && "is-on")} style={{ minHeight: 44 }} onClick={onFlip}>
        {label}: {on ? "On" : "Off"}
      </button>
      <div style={note}>{children}</div>
    </div>
  );
}

function DisplayPanel() {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => onPrefs(bump), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Switch label="Screen shake" on={prefs.shake} onFlip={() => setPrefs({ shake: !prefs.shake })}>
        The battlefield shakes on big hits, and the castle's count shakes when a foe gets through.
      </Switch>
      <Switch label="Floating numbers" on={prefs.floats} onFlip={() => setPrefs({ floats: !prefs.floats })}>
        The gold that pops up from a kill, the damage a foe does at the wall, and the sums beside your gold and castle.
      </Switch>
    </div>
  );
}

// Two taps for anything that can't be undone: the first arms the button
// (it turns gold and says so), the second does it. Disarms itself after a while.
function useArm() {
  const [armed, setArmed] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const tap = (id, act) => {
    clearTimeout(timer.current);
    if (armed === id) { setArmed(null); act(); return; }
    setArmed(id);
    timer.current = setTimeout(() => setArmed(null), 5000);
  };
  return { is: (id) => armed === id, tap, clear: () => setArmed(null) };
}

const when = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "an earlier date" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

function ProgressPanel({ onCampaignReset }) {
  const arm = useArm();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);   // { text, bad }
  const box = { width: "100%", boxSizing: "border-box", resize: "none", padding: "6px 8px", fontFamily: "var(--body)", fontSize: 11,
    color: "var(--text)", background: "var(--slate-dk)", border: "2px solid var(--ink)", userSelect: "text", WebkitUserSelect: "text" };

  const copy = async () => {
    const c = makeSaveCode();
    setCode(c);
    try { await navigator.clipboard.writeText(c); setCopied("Copied. Paste it into Notes or a message to keep it, or to move it."); }
    catch { setCopied("Select the code below and copy it."); }
  };
  const share = async () => {
    const c = code || makeSaveCode();
    setCode(c);
    try { await navigator.share({ title: "Crownguard save", text: c }); } catch { /* closed the sheet: fine */ }
  };
  const restore = () => {
    let save;
    try { save = readSaveCode(paste); } catch (e) { arm.clear(); setMsg({ text: e.message, bad: true }); return; }
    if (!arm.is("restore")) setMsg({ text: `A save from ${when(save.at)}. Tap Restore again to replace everything on this device with it.` });
    arm.tap("restore", () => {
      try { restoreSave(save); } catch { setMsg({ text: "This device wouldn't store the save (private browsing?).", bad: true }); return; }
      location.reload();
    });
  };
  const head = (t) => <div className="cg-label" style={{ marginTop: 2 }}>{t}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {head("Back up")}
      <div style={note}>Your progress is kept on this device only. A save code carries all of it (levels, stars, heroes, settings) to another device.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="cg-btn" style={{ flex: 1, minHeight: 44 }} onClick={copy}>Copy save code</button>
        {typeof navigator !== "undefined" && navigator.share && <button className="cg-btn" style={{ flex: 1, minHeight: 44 }} onClick={share}>Share…</button>}
      </div>
      {copied && <div style={say}>{copied}</div>}
      {code && <textarea readOnly rows={3} value={code} style={box} onFocus={(e) => e.target.select()} aria-label="Your save code" />}

      {head("Restore")}
      <textarea rows={3} value={paste} placeholder="Paste a save code here" style={box} aria-label="Paste a save code"
        onChange={(e) => { setPaste(e.target.value); setMsg(null); arm.clear(); }} />
      <button className={cls("cg-btn", arm.is("restore") && "cg-btn--gold")} style={{ minHeight: 44 }} disabled={!paste.trim()} onClick={restore}>
        {arm.is("restore") ? "Tap again to restore" : "Restore"}
      </button>
      {msg && <div style={{ ...say, color: msg.bad ? "#ff8a78" : "var(--text)" }}>{msg.text}</div>}

      {head("Start over")}
      <button className={cls("cg-btn", arm.is("campaign") && "cg-btn--gold")} style={{ minHeight: 44 }}
        onClick={() => arm.tap("campaign", () => { onCampaignReset(resetProgress()); setMsg({ text: "The campaign starts fresh. Your stars and heroes are kept." }); })}>
        {arm.is("campaign") ? "Tap again to start over" : "Start the campaign over"}
      </button>
      <div style={note}>Forgets every level held, the castle works and the treasury. Stars, xp and heroes stay.</div>
      <button className={cls("cg-btn cg-btn--slate", arm.is("erase") && "cg-btn--gold")} style={{ minHeight: 44 }}
        onClick={() => arm.tap("erase", () => { eraseAll(); location.reload(); })}>
        {arm.is("erase") ? "Tap again to erase it all" : "Erase everything"}
      </button>
      <div style={note}>Everything this device remembers: the campaign, stars, xp, heroes and settings. Copy a save code first if you may want it back.</div>
    </div>
  );
}

const TABS = [
  { id: "sound", name: "Sound", Body: SoundPanel },
  { id: "display", name: "Display", Body: DisplayPanel },
  { id: "progress", name: "Progress", Body: ProgressPanel, home: true },
];

// onCampaignReset(progress): given on the title screen, which then shows the
// Progress tab; the fresh progress is handed back so the screen can redraw.
export default function SettingsPanel({ onClose, onCampaignReset }) {
  const tabs = TABS.filter((t) => !t.home || onCampaignReset);
  const [tab, setTab] = useState(tabs[0].id);
  const { Body } = tabs.find((t) => t.id === tab);
  return (
    <div onClick={onClose} className="cg-hud" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(22,14,26,0.8)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
      padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>
      <div onClick={(e) => e.stopPropagation()} className="cg-frame cg-pop" style={{ width: 380, maxWidth: "100%", maxHeight: "100%", boxSizing: "border-box", padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="cg-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "var(--gold)", textAlign: "center", textShadow: "2px 2px 0 var(--ink)" }}>SETTINGS</div>
        <div className="sbs-tabs" role="tablist" style={{ flexShrink: 0 }}>
          {tabs.map((t) => (
            <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={cls("cg-btn cg-btn--slate sbs-tab", tab === t.id && "is-on")} style={{ minHeight: 44 }}>
              {t.name}
            </button>
          ))}
        </div>
        {/* only the tab's own panel scrolls; the title, the tabs and Done stay put */}
        <div className="cg-panel" role="tabpanel" style={{ padding: 12, flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", touchAction: "pan-y", scrollbarWidth: "thin" }}>
          <Body onCampaignReset={onCampaignReset} />
        </div>
        <button className="cg-btn cg-btn--gold" style={{ minHeight: 44, flexShrink: 0 }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
