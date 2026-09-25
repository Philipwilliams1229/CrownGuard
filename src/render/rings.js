// ============ AREA EFFECTS: NOVAS, WAVES AND MARKS ============
// The rings and bursts towers, heroes and some foes throw across the field:
// the Warden's frost nova and ward wave, the Bladewheel's flame ring, the
// shaman's heal wave, the Covert's silence and shadowstep, the Gold Works'
// Midas touch, the bell-ringer's toll, plague bursts, the necromancer's
// raising, the hero's Shield Slam and Heartseeker mark. draw.js calls
// drawRingFx for every effect; it returns true when it drew one. `a` is the
// effect's fade (ttl / 300, capped at 1); `g` the game (for live targets).

import { S, CELL } from "../data/constants.js";
import { ringPx } from "./fx.js";

export const drawRingFx = (ctx, fx, a, g) => {
  switch (fx.type) {
    case "frostnova": {
        // expanding ring of biting cold
        const prog = 1 - fx.ttl / 500;
        const r = prog * fx.r;
        ctx.strokeStyle = `rgba(124,212,212,${a * 0.9})`;
        ctx.lineWidth = 3;
        ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(200,236,244,${a})`;
        for (let i = 0; i < 8; i++) {
          const ang = i * 0.785 + 0.3;
          ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.9), CELL, CELL);
        }
      return true;
    }
    case "firenova": {
        // the Brazier Wheel's expanding ring of flame
        const prog = 1 - fx.ttl / 450;
        const r = prog * fx.r;
        ctx.strokeStyle = `rgba(216,118,58,${a * 0.9})`;
        ctx.lineWidth = 3;
        ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(232,193,74,${a})`;
        for (let i = 0; i < 8; i++) {
          const ang = i * 0.785 + 0.5;
          ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.9) - CELL, CELL, CELL * 2);
        }
      return true;
    }
    case "slam": {
        // Shield Slam: a ring of torn earth thrown out from the hero's feet
        const prog = 1 - fx.ttl / 450;
        const r = prog * fx.r;
        ctx.lineWidth = 3;
        ringPx(ctx, fx.x, fx.y, r, r * 0.62, 2.5, `rgba(176,140,92,${a * 0.95})`);
        ringPx(ctx, fx.x, fx.y, r * 0.8, r * 0.5, 1, `rgba(255,243,210,${a * 0.8})`);
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(122,96,62,${a})`;
        for (let i = 0; i < 10; i++) {
          const ang = i * 0.628 + 0.2;
          ctx.fillRect(S(fx.x + Math.cos(ang) * r), S(fx.y + Math.sin(ang) * r * 0.62 - prog * 6), CELL * 2, CELL * 2);
        }
      return true;
    }
    case "reticle": {
        // Heartseeker's mark: a closing ring and cross on the chosen foe
        const e = g.enemies.find((en) => en.id === fx.target && !en.dead);
        const x = e ? e.x : fx.x, y = e ? e.y - 8 : fx.y - 8;
        const r = 8 + (fx.ttl / 700) * 14;
        ringPx(ctx, x, y, r, r, 1.2, `rgba(224,72,64,${Math.min(1, fx.ttl / 250)})`);
        ctx.fillStyle = `rgba(224,72,64,${Math.min(1, fx.ttl / 250)})`;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(S(x + dx * (r + 2)) - 1, S(y + dy * (r + 2)) - 1, CELL * 2, CELL * 2);
      return true;
    }
    case "healwave": {
        // the shaman's mending chant washing outward
        const prog = 1 - fx.ttl / 550;
        const r = prog * fx.r;
        ctx.strokeStyle = `rgba(140,224,140,${a * 0.8})`;
        ctx.lineWidth = 2;
        ringPx(ctx, fx.x, fx.y, r, r, 1.5, ctx.strokeStyle);
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(190,232,176,${a})`;
        for (let i = 0; i < 4; i++) {
          const ang = i * 1.57 + 0.8;
          const px2 = S(fx.x + Math.cos(ang) * r), py2 = S(fx.y + Math.sin(ang) * r * 0.85);
          ctx.fillRect(px2 - CELL, py2, CELL * 3, CELL);
          ctx.fillRect(px2, py2 - CELL, CELL, CELL * 3);
        }
      return true;
    }
    case "silence": {
        // the stolen voice: a chant-note crossed out, rising off the silenced
        const rise = (1 - fx.ttl / 900) * 8;
        ctx.fillStyle = `rgba(200,204,214,${a})`;
        ctx.fillRect(S(fx.x) + 2, S(fx.y) - rise - 5, 2, 6);
        ctx.fillRect(S(fx.x), S(fx.y) - rise, 4, 3);
        ctx.strokeStyle = `rgba(224,82,72,${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(S(fx.x) - 3, S(fx.y) - rise + 4); ctx.lineTo(S(fx.x) + 7, S(fx.y) - rise - 7); ctx.stroke();
      return true;
    }
    case "shadowstep": {
        // the Covert at work: a ripple of shadow crosses, a blade-cross lands
        const life = fx.life || 380;
        const prog = 1 - fx.ttl / life;
        const step = Math.min(1, prog * 2.2);
        const hx = fx.x1 + (fx.x2 - fx.x1) * step;
        const hy = fx.y1 + (fx.y2 - fx.y1) * step;
        ctx.fillStyle = `rgba(30,26,44,${0.55 * a})`;
        for (let gi = 0; gi < 3; gi++) {
          const gt = Math.max(0, step - gi * 0.16);
          ctx.fillRect(S(fx.x1 + (fx.x2 - fx.x1) * gt) - 2, S(fx.y1 + (fx.y2 - fx.y1) * gt) - 3, 4, 6);
        }
        if (step >= 1) {
          // the cross of the cut, gold for marked prey, steel for the rest
          const flash = Math.max(0, 1 - (prog - 0.45) * 3);
          ctx.strokeStyle = fx.prey ? `rgba(232,193,74,${flash})` : `rgba(222,214,196,${flash})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(S(fx.x2) - 5, S(fx.y2) - 5); ctx.lineTo(S(fx.x2) + 5, S(fx.y2) + 5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(S(fx.x2) + 5, S(fx.y2) - 5); ctx.lineTo(S(fx.x2) - 5, S(fx.y2) + 5); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(30,26,44,${0.8 * a})`;
          ctx.fillRect(S(hx) - 2, S(hy) - 4, 5, 8);
        }
      return true;
    }
    case "midas": {
        // the golden mistake: a ring of mint-light and rising coins
        const prog = 1 - fx.ttl / fx.life;
        ctx.strokeStyle = `rgba(232,193,74,${a})`;
        ctx.lineWidth = 2;
        ringPx(ctx, fx.x, fx.y, prog * 26, prog * 26, 1.5, ctx.strokeStyle);
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const ang = i * 1.26 + 0.4;
          ctx.fillStyle = i % 2 ? `rgba(240,216,133,${a})` : `rgba(216,179,74,${a})`;
          ctx.fillRect(S(fx.x + Math.cos(ang) * prog * 18), S(fx.y + Math.sin(ang) * prog * 12 - prog * 14), 3, 3);
        }
      return true;
    }
    case "toll": {
        // the gravecaller's bell: two witch-purple rings, one chasing the other
        const prog = 1 - fx.ttl / 550;
        ctx.strokeStyle = `rgba(176,138,216,${a * 0.8})`;
        ctx.lineWidth = 2;
        ringPx(ctx, fx.x, fx.y, prog * fx.r, prog * fx.r, 1.5, ctx.strokeStyle);
        if (prog > 0.3) {
          ctx.strokeStyle = `rgba(124,224,184,${a * 0.5})`;
          ringPx(ctx, fx.x, fx.y, (prog - 0.3) * fx.r, (prog - 0.3) * fx.r, 1.5, ctx.strokeStyle);
        }
        ctx.lineWidth = 1;
      return true;
    }
    case "plagueburst": {
        // a ghast going up: a burst ring of rot with gobbets flung outward
        const prog = 1 - fx.ttl / 500;
        const r = prog * fx.r;
        ctx.fillStyle = `rgba(112,138,70,${a * 0.3})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), r, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(140,168,88,${a * 0.85})`;
        ctx.lineWidth = 3;
        ringPx(ctx, fx.x, fx.y, r, r, 2, ctx.strokeStyle);
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(196,220,130,${a})`;
        for (let i = 0; i < 7; i++) {
          const ang = i * 0.9 + 0.4;
          const rr = r * (0.5 + (i % 3) * 0.25);
          const fall = prog * prog * 18;
          ctx.fillRect(S(fx.x + Math.cos(ang) * rr), S(fx.y + Math.sin(ang) * rr * 0.7 + fall - prog * 10), i % 2 ? CELL : CELL + 1, CELL + 1);
        }
      return true;
    }
    case "wardwave": {
        // a chaplain's ward washing out over the column — cold blue, not green
        const prog = 1 - fx.ttl / 550;
        const r = prog * fx.r;
        ctx.strokeStyle = `rgba(150,190,235,${a * 0.85})`;
        ctx.lineWidth = 2;
        ringPx(ctx, fx.x, fx.y, r, r, 1.5, ctx.strokeStyle);
        ctx.lineWidth = 1;
        // little shield glyphs riding the wavefront
        ctx.fillStyle = `rgba(210,228,245,${a})`;
        for (let i = 0; i < 4; i++) {
          const ang = i * 1.57 + 0.4;
          const px2 = S(fx.x + Math.cos(ang) * r), py2 = S(fx.y + Math.sin(ang) * r * 0.85);
          ctx.fillRect(px2 - CELL, py2 - CELL, CELL * 3, CELL * 2);
          ctx.fillRect(px2, py2 + CELL, CELL, CELL);
        }
      return true;
    }
    case "raise": {
        // grave-light: witch-fire motes rising as a corpse claws back up
        const prog = 1 - fx.ttl / fx.life;
        ctx.fillStyle = `rgba(176,138,216,${a * 0.4})`;
        ctx.beginPath(); ctx.arc(S(fx.x), S(fx.y), 12 * (1 - prog * 0.5), 0, 7); ctx.fill();
        for (let i = 0; i < 5; i++) {
          const rise = prog * (14 + (i % 3) * 8);
          ctx.fillStyle = i % 2 ? `rgba(124,200,92,${a})` : `rgba(176,138,216,${a})`;
          ctx.fillRect(S(fx.x - 8 + i * 4), S(fx.y + 2 - rise), CELL, CELL * 2);
        }
      return true;
    }
    default: return false;
  }
};
