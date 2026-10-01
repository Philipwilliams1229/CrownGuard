// ============ SOUND OPTIONS ============
// The sound controls, as one block: used in the pause menu and on the title
// screen. Everything lives in audio/settings.js and takes effect at once.
//   - Sound: everything on/off (the old speaker button)
//   - Music: the score on/off, on its own
//   - two sliders: Music and Effects volume
//   - a switch per busy effect (the gold plink, arrows, blows)
import { useReducer, useEffect } from "react";
import { settings, saveSettings, onSettings, SFX_GROUPS } from "../audio/settings.js";
import { sfx } from "../audio/sfx.js";
import "./hud/hud.css";
import "./hud/sandbox.css";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function SoundPanel({ compact = false }) {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => onSettings(bump), []);
  const set = (patch) => { Object.assign(settings, patch); saveSettings(); };
  const slider = (label, key, preview) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="cg-label" style={{ width: compact ? 58 : 66, flexShrink: 0 }}>{label}</span>
      <input type="range" className="sbs-range" aria-label={`${label} volume`} min={0} max={100} step={5}
        value={Math.round(settings[key] * 100)} disabled={settings.muted}
        onChange={(e) => set({ [key]: Number(e.target.value) / 100 })}
        onPointerUp={preview} onKeyUp={preview} />
    </label>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button className={cls("cg-btn", !settings.muted && "is-on")} onClick={() => set({ muted: !settings.muted })}>
          Sound: {settings.muted ? "Off" : "On"}
        </button>
        <button className={cls("cg-btn", settings.music && !settings.muted && "is-on")} disabled={settings.muted}
          onClick={() => set({ music: !settings.music })}>
          Music: {settings.music && !settings.muted ? "On" : "Off"}
        </button>
      </div>
      {slider("Music", "musicVol")}
      {slider("Effects", "vol", () => sfx.play("upgrade", true))}
      <div className="cg-label" style={{ marginTop: 2 }}>Effects</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SFX_GROUPS.map((g) => {
          const on = !settings.off[g.id];
          return (
            <button key={g.id} className={cls("cg-btn cg-btn--slate", on && "is-on")} disabled={settings.muted}
              style={{ flex: "1 1 auto", minHeight: 34, padding: "2px 8px", fontSize: 11 }}
              onClick={() => { set({ off: { ...settings.off, [g.id]: on } }); }}>
              {g.label}: {on ? "On" : "Off"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
