// ============ PURSE AND WALL CHIPS ============
// The two numbers a player watches all battle. Each one answers a change:
// gold bumps bright when it comes in and flushes red when it's spent, with
// the sum floating off the chip; the castle shakes and reddens when a foe
// gets through. Changes that land close together are added up, so a swarm
// of kills reads as one "+36", not a flicker of "+3"s.

import { useRef, useState, useEffect } from "react";
import { CoinIcon, HeartIcon } from "./icons.jsx";

// Watch a number; report which way it last moved, a key that changes on
// every move (to restart a CSS animation) and the running sum of a burst.
export function useFlash(value, windowMs = 650) {
  const prev = useRef(value);
  const burst = useRef({ at: 0, sum: 0, id: 0 });
  const [f, setF] = useState({ dir: 0, n: 0, sum: 0, id: 0 });
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (!d) return;
    const now = performance.now(), b = burst.current;
    if (now - b.at < windowMs && Math.sign(b.sum) === Math.sign(d)) b.sum += d;
    else { b.sum = d; b.id++; }
    b.at = now;
    setF((o) => ({ dir: Math.sign(d), n: o.n + 1, sum: b.sum, id: b.id }));
    const t = setTimeout(() => setF((o) => ({ ...o, dir: 0 })), 900);
    return () => clearTimeout(t);
  }, [value, windowMs]);
  return f;
}

export function GoldChip({ gold }) {
  const f = useFlash(gold);
  return (
    <div className="cg-panel cg-chip" aria-label={`${gold} gold`}>
      <CoinIcon size={20} />
      <span key={f.n} className={`cg-num ${f.dir > 0 ? "cg-up" : f.dir < 0 ? "cg-down" : ""}`} style={{ color: "var(--gold-lt)", minWidth: 34 }}>{gold}</span>
      {f.dir !== 0 && (
        <span key={`b${f.id}`} className="cg-float" style={{ color: f.sum > 0 ? "var(--gold-lt)" : "#ff8a78" }}>
          {f.sum > 0 ? `+${f.sum}` : f.sum}
        </span>
      )}
    </div>
  );
}

export function LivesChip({ lives, max, base }) {
  const f = useFlash(lives);
  const color = lives > base ? "var(--gold-lt)" : lives <= 5 ? "#ff7a6a" : lives <= 10 ? "#f0c060" : "var(--cream)";
  return (
    <div key={f.dir < 0 ? `h${f.n}` : "calm"} className={`cg-panel cg-chip ${f.dir < 0 ? "cg-hurt" : ""}`} aria-label={`castle ${lives} of ${max}`}>
      <HeartIcon size={18} />
      <span className={`cg-num ${f.dir > 0 ? "cg-up" : ""}`} style={{ color }}>{lives}</span>
      <span className="cg-display" style={{ fontSize: 13, color: "var(--muted)", marginLeft: -3 }}>/{max}</span>
      {f.dir < 0 && <span key={`b${f.id}`} className="cg-float" style={{ color: "#ff8a78" }}>{f.sum}</span>}
    </div>
  );
}
