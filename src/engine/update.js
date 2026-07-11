// ============ MAIN UPDATE STEP ============
// Advances the whole simulation by one frame: spawns, aura effects, enemy
// movement & castle leaks, knight combat, tower firing, projectiles, wave
// clears, the build-phase auto-start horn, and effect/shake decay.
// `dt` is the raw (already clamped) seconds since the last frame.

import { PATH_HALF, RESPAWN_MS, W, BUILD_TIME, CASTLE_HP } from "../data/constants.js";
import { ENEMIES } from "../data/enemies.js";
import { WAVES, waveBonus } from "../data/waves.js";
import { PTS, posAt, angleAt, TOTAL_LEN } from "./path.js";
import { nextId } from "./ids.js";
import { getStats, syncUnits, unitSlots } from "./towers.js";
import { dealDamage, releaseEnemy, startWave } from "./actions.js";

export function updateGame(g, dt) {
  // Tactical half-speed: during combat, while the player is managing — the
  // build drawer is open, a tower is being placed, or a tower is selected —
  // time runs at 50% so there's room to think.
  const managing = g.phase === "combat" && (g.buildMenuOpen || g.buildMode || g.selectedId);
  const speed = g.speed * (managing ? 0.5 : 1);
  const sdt = g.paused ? 0 : dt * speed;
  g.time += sdt;
  const tms = g.time * 1000;
  if (!g.grounds) g.grounds = []; // lingering ground effects (lava pools)

  if (!g.paused && g.phase === "combat") {
    g.spawnTimer += sdt * 1000;
    while (g.spawnQueue.length && g.spawnQueue[0].at <= g.spawnTimer) {
      const s = g.spawnQueue.shift();
      const d = ENEMIES[s.type];
      g.enemies.push({
        id: nextId(), type: s.type, hp: d.hp * s.mult, maxHp: d.hp * s.mult, dist: 0,
        speed: d.speed, armor: d.armor, bounty: d.bounty, regen: d.regen || 0,
        boss: !!d.boss, size: d.size, atk: d.atk, atkRate: d.atkRate, castleDmg: d.castleDmg || 1,
        lane: d.boss ? 0 : (Math.random() - 0.5) * PATH_HALF * 1.15,
        x: PTS[0][0], y: PTS[0][1], face: 1, atkAnim: 0, auraSlow: 0,
        slowUntil: 0, slowPct: 0, burnUntil: 0, burnDps: 0, poisonUntil: 0, poisonDps: 0,
        brittleUntil: 0, brittleAmp: 0, burnSpread: false,
        stunUntil: 0, dead: false, blockedBy: null, engaged: false, meleeCd: 0,
      });
    }
    for (const e of g.enemies) e.auraSlow = 0;
    for (const t of g.towers) if (t.units) for (const u of t.units) u.atkBuff = 0;
    for (const t of g.towers) {
      if (t.kind !== "support") continue;
      const st = getStats(t);
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= st.range) {
          e.auraSlow = Math.max(e.auraSlow, st.slow);
          // Absolute Zero: the aura itself bites, dealing cold damage
          if (st.colddps) dealDamage(g, e, st.colddps * sdt, "magic");
        }
      }
      // Rimecaller frost nova: periodically flash-freeze everything in the aura
      if (st.nova) {
        t.novaCd = (t.novaCd ?? st.novaEvery * 0.5) - sdt * 1000;
        if (t.novaCd <= 0) {
          t.novaCd = st.novaEvery;
          g.effects.push({ type: "frostnova", x: t.x, y: t.y, ttl: 500, r: st.range });
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
            dealDamage(g, e, st.nova, "magic");
            if (!e.dead) {
              e.stunUntil = Math.max(e.stunUntil, tms + st.novaFreeze);
              if (st.brittle) { e.brittleUntil = tms + (st.brittleDur || 4000); e.brittleAmp = st.brittle; }
            }
          }
        }
      }
      if (st.heal || st.buff || st.shield) {
        for (const t2 of g.towers) {
          if (!t2.units) continue;
          for (const u of t2.units) {
            if (u.state === "dead") continue;
            if (Math.hypot(u.x - t.x, u.y - t.y) > st.range) continue;
            if (st.heal && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt); u.healGlow = 250; }
            if (st.buff) u.atkBuff = Math.max(u.atkBuff, st.buff);
            // Guardian's Grace: grant a ward that swallows one blow, then reforms
            if (st.shield && !u.shield && (u.shieldCd || 0) <= 0) u.shield = true;
          }
        }
      }
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * sdt);
      if (e.burnUntil > tms) {
        dealDamage(g, e, e.burnDps * sdt, "magic");
        // Wildfire Court: flames leap from burning foes to nearby unburned ones
        if (e.burnSpread) {
          for (const e2 of g.enemies) {
            if (e2.dead || e2 === e || e2.burnUntil > tms) continue;
            if (Math.hypot(e2.x - e.x, e2.y - e.y) <= 50) {
              e2.burnUntil = tms + 1600;
              e2.burnDps = e.burnDps * 0.8;
            }
          }
        }
      }
      if (!e.dead && e.poisonUntil > tms) dealDamage(g, e, e.poisonDps * sdt, "magic");
      // Volcanic Throne: lava pools scorch anyone standing in them
      if (!e.dead) {
        for (const gr of g.grounds) {
          if (gr.until > tms && Math.hypot(e.x - gr.x, e.y - gr.y) <= gr.r) dealDamage(g, e, gr.dps * sdt, "magic");
        }
      }
      if (e.dead) continue;
      e.atkAnim = Math.max(0, e.atkAnim - sdt * 1000);
      const stunned = e.stunUntil > tms;
      const held = e.blockedBy && e.engaged;
      if (!stunned && !held) {
        const slow = Math.max(e.slowUntil > tms ? e.slowPct : 0, e.auraSlow || 0);
        e.dist += e.speed * (1 - slow) * sdt;
      }
      const [px, py] = posAt(e.dist);
      const a = angleAt(e.dist);
      e.x = px + Math.cos(a + Math.PI / 2) * e.lane;
      e.y = py + Math.sin(a + Math.PI / 2) * e.lane;
      if (!held && Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) >= 0 ? 1 : -1;
      if (e.dist >= TOTAL_LEN) {
        e.dead = true;
        const dmgC = e.castleDmg || 1;
        g.lives -= dmgC;
        g.shake = 5 + dmgC * 2.5;
        g.effects.push({ type: "leak", x: e.x - 10, y: e.y, ttl: 700, text: `-${dmgC}` });
        if (g.lives <= 0) { g.lives = 0; g.phase = "lost"; }
      }
    }
    g.enemies = g.enemies.filter((e) => !e.dead);

    for (const t of g.towers) {
      if (t.kind !== "knight") continue;
      syncUnits(t);
      const st = getStats(t);
      const slots = unitSlots(t);
      t.units.forEach((u, i) => {
        if (u.state === "dead") {
          u.respawn -= sdt * 1000;
          if (u.respawn <= 0) { u.state = "rally"; u.hp = st.hp; u.x = slots[i][0]; u.y = slots[i][1]; u.targetId = null; u.frenzy = 0; u.shield = false; u.shieldCd = 0; }
          return;
        }
        if (st.heal && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + st.heal * sdt);
        u.atkCd -= sdt * 1000;
        u.swing = Math.max(0, u.swing - sdt * 1000);
        u.healGlow = Math.max(0, (u.healGlow || 0) - sdt * 1000);
        u.shieldCd = Math.max(0, (u.shieldCd || 0) - sdt * 1000);

        let target = u.targetId ? g.enemies.find((e) => e.id === u.targetId && !e.dead) : null;
        // tight leash: knights break off quickly once a foe leaves the rally circle
        if (target && Math.hypot(target.x - t.rally.x, target.y - t.rally.y) > st.range + 25) { releaseEnemy(g, target); target = null; u.targetId = null; }
        if (!target && u.targetId) u.targetId = null;

        if (!target) {
          let best = null, bestDist = -1;
          for (const e of g.enemies) {
            if (e.dead || e.boss || e.blockedBy) continue;
            if (Math.hypot(e.x - t.rally.x, e.y - t.rally.y) <= st.range && e.dist > bestDist) { bestDist = e.dist; best = e; }
          }
          if (best) { best.blockedBy = u.id; u.targetId = best.id; u.state = "moving"; target = best; }
        }

        if (target) {
          const dx = target.x - u.x, dy = target.y - u.y;
          const d = Math.hypot(dx, dy);
          if (d > 17) {
            target.engaged = d < 30;
            const sp = (st.unitSpeed || 95) * sdt;
            u.x += (dx / d) * sp; u.y += (dy / d) * sp;
            u.face = dx >= 0 ? 1 : -1;
            u.state = "moving";
          } else {
            target.engaged = true;
            u.state = "fighting";
            u.face = dx >= 0 ? 1 : -1;
            target.face = -u.face;
            if (u.atkCd <= 0) {
              // Blood Frenzy: each hit stacks attack speed and feeds the berserker
              const frenzyMul = st.frenzy ? 1 - Math.min(0.45, (u.frenzy || 0) * 0.06) : 1;
              u.atkCd = st.rate * frenzyMul;
              u.swing = 180;
              const dealt = st.dmg * (1 + (u.atkBuff || 0));
              dealDamage(g, target, dealt, st.magic ? "magic" : "phys", st.magic);
              if (st.frenzy) u.frenzy = (u.frenzy || 0) + 1;
              if (st.lifesteal && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + dealt * st.lifesteal); u.healGlow = 200; }
              g.effects.push({ type: "spark", x: target.x, y: target.y - 6, ttl: 160, gold: !!st.magic || u.atkBuff > 0 });
              if (st.stun && Math.random() < st.stun) target.stunUntil = tms + st.stunDur;
              if (target.dead) { u.targetId = null; u.state = "rally"; }
            }
            if (!target.dead && target.stunUntil <= tms && target.atk > 0) {
              target.meleeCd -= sdt * 1000;
              if (target.meleeCd <= 0) {
                target.meleeCd = target.atkRate;
                target.atkAnim = 200;
                if (u.shield) {
                  // Guardian's Grace: the ward swallows the blow whole
                  u.shield = false; u.shieldCd = 6500;
                  g.effects.push({ type: "flash", x: u.x, y: u.y - 6, ttl: 300 });
                } else {
                  u.hp -= target.atk;
                  g.effects.push({ type: "hit", x: u.x, y: u.y - 10, ttl: 200 });
                }
                if (u.hp <= 0) {
                  u.state = "dead"; u.respawn = st.respawnMs || RESPAWN_MS; u.targetId = null;
                  releaseEnemy(g, target);
                  g.effects.push({ type: "poof", x: u.x, y: u.y, ttl: 400 });
                }
              }
            }
          }
        } else {
          const hx = slots[i][0], hy = slots[i][1];
          const dx = hx - u.x, dy = hy - u.y;
          const d = Math.hypot(dx, dy);
          if (d > 3) { const sp = (st.unitSpeed ? st.unitSpeed * 0.9 : 85) * sdt; u.x += (dx / d) * sp; u.y += (dy / d) * sp; u.face = dx >= 0 ? 1 : -1; u.state = "moving"; }
          else { u.state = "rally"; u.frenzy = 0; }
        }
      });
      // Radiant Basilica: holy ground around each living paladin sears nearby foes
      if (st.sear) {
        for (const u of t.units) {
          if (u.state === "dead") continue;
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - u.x, e.y - u.y) <= 42) dealDamage(g, e, st.sear * sdt, "magic");
          }
        }
      }
    }

    for (const t of g.towers) {
      t.anim = Math.max(0, t.anim - sdt * 4);
      if (t.kind === "knight" || t.kind === "support") continue;
      t.cd -= sdt * 1000;
      if (t.cd > 0) continue;
      const st = getStats(t);
      let target = null, best = -1;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        // default: frontmost enemy in range; "strongest" (Ballista): highest HP
        const metric = st.targeting === "strongest" ? e.hp : e.dist;
        if (d <= st.range && d >= (st.minRange || 0) && metric > best) { best = metric; target = e; }
      }
      if (!target) continue;
      t.cd = st.rate;
      t.anim = 1;
      t.lastAim = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.kind === "archer") {
        const hgt = t.branch === "b" ? 38 : 14 + t.level * 6;
        let offs;
        if (t.branch === "a") {
          const spots = [[-9, -1], [8, -2], [0, -8]];
          t.shotIdx = (t.shotIdx + 1) % 3;
          offs = [spots[t.shotIdx]];
        } else if (t.branch === "b") {
          offs = [[0, -4]];
        } else {
          offs = t.level === 1 ? [[0, -3]] : t.level === 2 ? [[-7, -2], [7, -3]] : [[-9, -1], [9, -2], [0, -8]];
        }
        // Dragonslayer: every st.crit-th shot is a heartseeker at critMult damage
        let dmgMul = 1;
        if (st.crit) {
          t.critIdx = ((t.critIdx || 0) + 1) % st.crit;
          if (t.critIdx === 0) dmgMul = st.critMult || 3;
        }
        const per = t.branch ? st.dmg : Math.round(st.dmg / offs.length);
        offs.forEach(([ox, oy], i) => {
          g.projectiles.push({
            id: nextId(), x: t.x + ox, y: t.y - hgt + oy - 6, targetId: target.id,
            tx: target.x, ty: target.y, speed: st.bolt ? 560 : 460, delay: i * 90,
            dmg: Math.round(per * dmgMul), dtype: st.dtype, pierce: !!st.pierce, splash: 0,
            burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow",
            big: !!st.bolt || dmgMul > 1,
            poison: st.poison || 0, poisonDur: st.poisonDur || 0, poisonCap: st.poisonCap || 0,
            chain: st.chain || 0, chainRange: st.chainRange || 0,
          });
        });
      } else if (t.kind === "catapult") {
        // Rocks lob toward where the target is HEADED — a fixed landing point,
        // no homing. Lead the shot by projecting the enemy along the road for
        // the rock's flight time (fast enemies can dodge; clumps get crushed).
        const rockSpeed = t.branch === "a" ? 270 : 240;
        const d0 = Math.hypot(target.x - t.x, target.y - t.y);
        const slowNow = Math.max(target.slowUntil > tms ? target.slowPct : 0, target.auraSlow || 0);
        const lead = Math.min(target.dist + target.speed * (1 - slowNow) * (d0 / rockSpeed) * 0.85, TOTAL_LEN - 1);
        const [lx, ly] = posAt(lead);
        const la = angleAt(lead);
        const ax = lx + Math.cos(la + Math.PI / 2) * target.lane;
        const ay = ly + Math.sin(la + Math.PI / 2) * target.lane;
        const shots = st.shots || 1;
        for (let i = 0; i < shots; i++) {
          const ox = shots > 1 ? (Math.random() - 0.5) * 46 : 0;
          const oy = shots > 1 ? (Math.random() - 0.5) * 34 : 0;
          const sx = t.x, sy = t.y - 24;
          g.projectiles.push({
            id: nextId(), x: sx, y: sy, sx, sy, targetId: null,
            tx: ax + ox, ty: ay + oy, speed: rockSpeed, delay: i * 130,
            dmg: st.dmg, dtype: st.dtype, pierce: false, splash: st.splash || 0,
            burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
            kind: "rock", frag: !!st.frag,
            total: Math.hypot(ax + ox - sx, ay + oy - sy),
            big: t.branch === "a",
          });
        }
      } else if (st.arc) {
        // Stormcaller: lightning strikes instantly and arcs down the line
        let cur = target, mult = 1;
        const hitIds = new Set();
        const pts = [[t.x, t.y - 34]];
        for (let j = 0; j < st.arc && cur; j++) {
          dealDamage(g, cur, st.dmg * mult, "magic");
          if (st.zapStun && !cur.dead && Math.random() < st.zapStun) cur.stunUntil = tms + (st.zapStunDur || 600);
          hitIds.add(cur.id);
          pts.push([cur.x, cur.y - 6]);
          g.effects.push({ type: "spark", x: cur.x, y: cur.y - 6, ttl: 200, gold: true });
          mult *= st.arcFall ?? 0.7;
          let nxt = null, nd = Infinity;
          for (const e of g.enemies) {
            if (e.dead || hitIds.has(e.id)) continue;
            const dd = Math.hypot(e.x - cur.x, e.y - cur.y);
            if (dd <= (st.arcRange || 90) && dd < nd) { nd = dd; nxt = e; }
          }
          cur = nxt;
        }
        g.effects.push({ type: "bolt", pts, ttl: 220, seed: Math.random() * 10 });
      } else {
        g.projectiles.push({
          id: nextId(), x: t.x, y: t.y - 30, targetId: target.id,
          tx: target.x, ty: target.y, speed: 300, delay: 0,
          dmg: st.dmg, dtype: st.dtype, pierce: !!st.pierce, splash: st.splash || 0,
          burn: st.burn || 0, burnDur: st.burnDur || 0, slow: st.slow || 0, slowDur: st.slowDur || 0,
          poolDps: st.poolDps || 0, poolDur: st.poolDur || 0, poolR: st.poolR || 0,
          burnSpreads: !!st.burnSpread,
          kind: "orb",
        });
      }
    }

    for (const p of g.projectiles) {
      if (p.delay > 0) { p.delay -= sdt * 1000; continue; }
      const target = g.enemies.find((e) => e.id === p.targetId && !e.dead);
      if (target) { p.tx = target.x; p.ty = target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * sdt;
      if (d <= stepLen + 4) {
        p.done = true;
        if (p.splash > 0) {
          g.effects.push({ type: p.kind === "rock" ? (p.mini ? "shrapnelhit" : "dust") : p.burn ? "boom" : p.slow ? "frost" : "arcane", x: p.tx, y: p.ty, ttl: 320, r: p.splash });
          for (const e of g.enemies) {
            if (e.dead) continue;
            const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
            if (dd <= p.splash) {
              dealDamage(g, e, p.dmg * (1 - 0.55 * (dd / p.splash)), p.dtype, p.pierce);
              if (e.dead) continue;
              if (p.burn) { e.burnUntil = tms + p.burnDur; e.burnDps = p.burn; if (p.burnSpreads) e.burnSpread = true; }
              if (p.slow) { e.slowUntil = tms + p.slowDur; e.slowPct = p.slow; }
            }
          }
          // Volcanic Throne: the blast leaves a pool of living lava
          if (p.poolDps) g.grounds.push({ x: p.tx, y: p.ty, r: p.poolR || 32, dps: p.poolDps, until: tms + (p.poolDur || 3000), kind: "lava" });
          // Grapeshot: the stone bursts into a spray of shrapnel
          if (p.frag) {
            g.effects.push({ type: "shrapnel", x: p.tx, y: p.ty, ttl: 420, life: 420 });
            for (let k = 0; k < 3; k++) {
              const ang = Math.random() * Math.PI * 2;
              const rr = 24 + Math.random() * 26;
              const nx = p.tx + Math.cos(ang) * rr, ny = p.ty + Math.sin(ang) * rr * 0.8;
              g.projectiles.push({
                id: nextId(), x: p.tx, y: p.ty, sx: p.tx, sy: p.ty, targetId: null,
                tx: nx, ty: ny, speed: 190, delay: k * 40,
                dmg: Math.max(1, Math.round(p.dmg * 0.4)), dtype: "phys", pierce: false,
                splash: Math.round(p.splash * 0.55), burn: 0, burnDur: 0, slow: 0, slowDur: 0,
                kind: "rock", mini: true, total: Math.hypot(nx - p.tx, ny - p.ty),
              });
            }
          }
        } else if (target) {
          dealDamage(g, target, p.dmg, p.dtype, p.pierce);
          if (p.pierce) g.effects.push({ type: "pierce", x: p.tx, y: p.ty, ttl: 250 });
          // Briar Rangers: each hit stacks poison dps (capped), refreshing duration
          if (p.poison && !target.dead) {
            const cur = target.poisonUntil > tms ? target.poisonDps : 0;
            target.poisonDps = Math.min(p.poisonCap || p.poison, cur + p.poison);
            target.poisonUntil = tms + p.poisonDur;
          }
          // Hawkeye Conclave: the arrow ricochets to one more enemy nearby
          if (p.chain > 0) {
            let next = null, nd = Infinity;
            for (const e of g.enemies) {
              if (e.dead || e.id === p.targetId) continue;
              const dd = Math.hypot(e.x - p.tx, e.y - p.ty);
              if (dd <= p.chainRange && dd < nd) { nd = dd; next = e; }
            }
            if (next) {
              g.projectiles.push({
                id: nextId(), x: p.tx, y: p.ty, targetId: next.id,
                tx: next.x, ty: next.y, speed: 460, delay: 0,
                dmg: Math.max(1, Math.round(p.dmg * 0.6)), dtype: p.dtype, pierce: p.pierce, splash: 0,
                burn: 0, burnDur: 0, slow: 0, slowDur: 0, kind: "arrow",
                poison: p.poison, poisonDur: p.poisonDur, poisonCap: p.poisonCap,
                chain: p.chain - 1, chainRange: p.chainRange,
              });
            }
          }
        }
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
        p.angle = Math.atan2(dy, dx);
      }
    }
    g.projectiles = g.projectiles.filter((p) => !p.done);

    if (!g.spawnQueue.length && g.enemies.length === 0 && g.phase === "combat") {
      g.gold += waveBonus(g.wave);
      g.effects.push({ type: "coin", x: W / 2, y: 40, ttl: 1200, text: `Wave cleared! +${waveBonus(g.wave)}g`, big: true });
      // High Cathedral: each cleared wave rebuilds one castle HP
      if (g.lives < CASTLE_HP && g.towers.some((t) => t.kind === "support" && t.branch === "b" && t.rank4 === "b")) {
        g.lives += 1;
        g.effects.push({ type: "coin", x: W / 2, y: 64, ttl: 1300, text: "The Cathedral mends the walls +1", big: true });
      }
      if (g.wave >= WAVES.length) g.phase = "won";
      else { g.phase = "build"; g.buildUntil = g.time + BUILD_TIME; }
    }
  }

  if (!g.paused && g.phase === "build" && g.buildUntil != null && g.time >= g.buildUntil) {
    startWave(g);
  }

  if (!g.paused) {
    for (const fx of g.effects) fx.ttl -= sdt * 1000;
    g.effects = g.effects.filter((fx) => fx.ttl > 0);
    g.grounds = g.grounds.filter((gr) => gr.until > tms);
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30);
  }
}
