// ============ TOWERS ============
// Every tower's cost, per-level stats, and its permanent evolution branches.

export const TOWERS = {
  archer: {
    name: "Archer Tower", cost: 100, dtype: "phys", proj: "arrow",
    blurb: "Quick arrows. Each recruit on the platform looses their own shaft.",
    levels: [
      { dmg: 14, rate: 750, range: 130 },
      { dmg: 26, rate: 700, range: 140, cost: 80, label: "Twin Archers" },
      { dmg: 42, rate: 650, range: 150, cost: 120, label: "Archer Trio" },
    ],
    branches: {
      a: {
        name: "Ranger Company", cost: 210, stats: { dmg: 13, rate: 155, range: 120 }, desc: "Rangers loose a blinding storm of arrows in relay. Melts swarms; struggles vs. heavy armor.",
        rank4: {
          a: { name: "Briar Rangers", cost: 320, stats: { dmg: 13, rate: 150, range: 130, poison: 9, poisonDur: 2600, poisonCap: 36 }, desc: "Arrows dipped in briar venom: every hit stacks a poison that gnaws through armor and regeneration alike." },
          b: { name: "Hawkeye Conclave", cost: 320, stats: { dmg: 15, rate: 160, range: 145, chain: 1, chainRange: 95 }, desc: "Impossible shots — every arrow ricochets off its mark into a second foe nearby." },
        },
      },
      b: {
        name: "Master Longbowman", cost: 210, stats: { dmg: 210, rate: 2100, range: 275, pierce: true }, desc: "One legendary archer. Slow, colossal shots that pierce any armor, from across the map.",
        rank4: {
          a: { name: "Ballista", cost: 340, stats: { dmg: 540, rate: 3600, range: 900, pierce: true, bolt: true, targeting: "strongest" }, desc: "A colossal siege bow. Slow, screaming bolts that always hunt the MIGHTIEST enemy on the field — anywhere on the field." },
          b: { name: "Dragonslayer", cost: 340, stats: { dmg: 230, rate: 2000, range: 300, pierce: true, crit: 3, critMult: 3 }, desc: "Forged to fell wyrms: every THIRD shot is a devastating triple-damage heartseeker." },
        },
      },
    },
  },
  knight: {
    name: "Knight Garrison", cost: 80, dtype: "phys", proj: "units",
    blurb: "A knight marches out to hold an enemy in melee. Upgrades add more swords.",
    levels: [
      { dmg: 16, rate: 800, range: 70, hp: 110, count: 1 },
      { dmg: 21, rate: 760, range: 75, hp: 150, count: 2, cost: 90, label: "Second Sword" },
      { dmg: 28, rate: 720, range: 80, hp: 200, count: 3, cost: 130, label: "Shield Brothers" },
    ],
    branches: {
      a: {
        name: "Paladin Order", cost: 230, stats: { dmg: 36, rate: 800, range: 80, hp: 280, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 7 }, desc: "Three radiant paladins: MAGIC blows that ignore armor, chance to stun, and they mend their own wounds.",
        rank4: {
          a: { name: "Grand Champion", cost: 380, stats: { dmg: 110, rate: 900, range: 85, hp: 950, count: 1, magic: true, stun: 0.35, stunDur: 1100, heal: 18, giant: true }, desc: "The three paladins kneel — and ONE colossal champion rises: a living fortress whose hammer falls like a star." },
          b: { name: "Radiant Basilica", cost: 380, stats: { dmg: 44, rate: 780, range: 85, hp: 340, count: 3, magic: true, stun: 0.25, stunDur: 900, heal: 10, sear: 14 }, desc: "Holy ground follows the paladins' boots — enemies near them smolder in sacred light." },
        },
      },
      b: {
        name: "Berserker Hall", cost: 230, stats: { dmg: 20, rate: 320, range: 80, hp: 150, count: 4 }, desc: "FOUR berserkers with whirling axes. Frailer than knights, but a storm of steel.",
        rank4: {
          a: { name: "Wolf Lodge", cost: 380, stats: { dmg: 24, rate: 300, range: 130, hp: 175, count: 4, unitSpeed: 150, respawnMs: 4000, rider: true }, desc: "Berserkers astride great wolves: faster than anything on the road, and back from the dead in a heartbeat." },
          b: { name: "Blood Frenzy", cost: 380, stats: { dmg: 22, rate: 300, range: 80, hp: 160, count: 4, frenzy: true, lifesteal: 0.6 }, desc: "Every wound they deal feeds them — and the longer they fight, the faster the axes swing." },
        },
      },
    },
  },
  wizard: {
    name: "Wizard Spire", cost: 140, dtype: "magic", proj: "orb",
    blurb: "Arcane blasts splash in an area — strongest at the blast's heart — and ignore armor.",
    levels: [
      { dmg: 20, rate: 1300, range: 120, splash: 55 },
      { dmg: 34, rate: 1250, range: 128, splash: 60, cost: 100, label: "Adept Circle" },
      { dmg: 52, rate: 1200, range: 136, splash: 66, cost: 150, label: "High Sorcery" },
    ],
    branches: {
      a: {
        name: "Pyromancer", cost: 250, stats: { dmg: 46, rate: 1200, range: 140, splash: 90, burn: 14, burnDur: 3000 }, desc: "Fireballs with a huge blast that set enemies ablaze — burning damage over time.",
        rank4: {
          a: { name: "Volcanic Throne", cost: 360, stats: { dmg: 60, rate: 1250, range: 145, splash: 95, burn: 16, burnDur: 3000, poolDps: 26, poolDur: 3200, poolR: 34 }, desc: "Every blast births a pool of living lava that scorches all who wade through it." },
          b: { name: "Wildfire Court", cost: 360, stats: { dmg: 52, rate: 1150, range: 145, splash: 90, burn: 18, burnDur: 3200, burnSpread: true }, desc: "Flames leap hungrily from burning foes to their neighbors — one spark can eat a whole warband." },
        },
      },
      b: {
        name: "Stormcaller", cost: 250, stats: { dmg: 42, rate: 1300, range: 150, arc: 3, arcRange: 95, arcFall: 0.7 }, desc: "Lightning lashes the frontrunner and arcs down the line — no armor, no escape.",
        rank4: {
          a: { name: "Tempest Court", cost: 360, stats: { dmg: 46, rate: 1200, range: 160, arc: 6, arcRange: 110, arcFall: 0.8 }, desc: "The storm dances: bolts leap SIX times, scouring entire columns of the horde." },
          b: { name: "Thunder Sovereign", cost: 360, stats: { dmg: 88, rate: 1500, range: 160, arc: 2, arcRange: 95, arcFall: 0.75, zapStun: 0.3, zapStunDur: 700 }, desc: "Heaven's own hammer: fewer, crueler bolts that can lock victims rigid with shock." },
        },
      },
    },
  },
  catapult: {
    name: "Catapult", cost: 120, dtype: "phys", proj: "rock",
    blurb: "Lobs boulders in a high arc — heavy splash at long range, but blind up close.",
    levels: [
      { dmg: 36, rate: 2600, range: 190, minRange: 70, splash: 58 },
      { dmg: 58, rate: 2500, range: 205, minRange: 70, splash: 64, cost: 110, label: "Reinforced Arm" },
      { dmg: 84, rate: 2400, range: 220, minRange: 70, splash: 70, cost: 160, label: "Master Engineers" },
    ],
    branches: {
      a: {
        name: "Trebuchet", cost: 240, stats: { dmg: 200, rate: 4200, range: 460, minRange: 100, splash: 88 }, desc: "One colossal counterweighted arm. Boulders fall from the sky across nearly the whole field — but its blind circle grows.",
        rank4: {
          a: { name: "Earthshaker", cost: 380, stats: { dmg: 260, rate: 4400, range: 470, minRange: 100, splash: 105, slow: 0.3, slowDur: 1600 }, desc: "Boulders that crack the very road — survivors stagger through the rubble, slowed." },
          b: { name: "Comet Sling", cost: 380, stats: { dmg: 230, rate: 4200, range: 480, minRange: 100, splash: 90, burn: 20, burnDur: 2600, targeting: "strongest" }, desc: "Burning pitch-wrapped stones flung at the MIGHTIEST foe on the field, wherever it hides." },
        },
      },
      b: {
        name: "Scattershot", cost: 240, stats: { dmg: 30, rate: 2300, range: 190, minRange: 60, splash: 42, shots: 3 }, desc: "Hurls a fan of THREE stones every volley, blanketing the road in overlapping blasts. Melts tight packs.",
        rank4: {
          a: { name: "Rockstorm Battery", cost: 380, stats: { dmg: 26, rate: 1500, range: 200, minRange: 60, splash: 40, shots: 5 }, desc: "A drum-fed nightmare: FIVE stones per volley, near-continuous bombardment." },
          b: { name: "Grapeshot", cost: 380, stats: { dmg: 34, rate: 2200, range: 195, minRange: 60, splash: 44, shots: 3, frag: true }, desc: "Each stone bursts on impact into a spray of shrapnel — blasts within blasts." },
        },
      },
    },
  },
  spiker: {
    name: "Bladewheel", cost: 110, dtype: "phys", proj: "spike",
    blurb: "A spinning wheel that flings spikes in EVERY direction. Blind beyond arm's reach — deadly on corners and doubled-back road.",
    levels: [
      { dmg: 12, rate: 900, range: 85, spikes: 8 },
      { dmg: 18, rate: 820, range: 92, spikes: 8, cost: 90, label: "Whetted Steel" },
      { dmg: 26, rate: 740, range: 100, spikes: 10, cost: 140, label: "Twin Rims" },
    ],
    branches: {
      a: {
        name: "Razor Gale", cost: 230, stats: { dmg: 15, rate: 300, range: 105, spikes: 10 }, desc: "The wheel screams — a near-constant storm of steel shreds everything that hugs it.",
        rank4: {
          a: { name: "Steel Tempest", cost: 360, stats: { dmg: 17, rate: 260, range: 115, spikes: 12, spikePierce: 2 }, desc: "Spikes forged to skewer: every sliver punches THROUGH its first victim and into the next." },
          b: { name: "Hamstringer", cost: 360, stats: { dmg: 15, rate: 280, range: 110, spikes: 10, slow: 0.3, slowDur: 1300 }, desc: "Barbed spikes lodge in legs and paws — everything struck hobbles away slowed." },
        },
      },
      b: {
        name: "Brazier Wheel", cost: 230, stats: { dmg: 38, rate: 1500, range: 100, nova: true, magic: true, burn: 10, burnDur: 2400 }, desc: "The rim is set alight: instead of spikes, rhythmic rings of flame scorch everything in reach. MAGIC — ignores armor.",
        rank4: {
          a: { name: "Solar Crown", cost: 360, stats: { dmg: 62, rate: 1450, range: 115, nova: true, magic: true, burn: 15, burnDur: 2800 }, desc: "A captive shard of the sun. Wider, hotter rings that leave deep burns." },
          b: { name: "Wildheart Pyre", cost: 360, stats: { dmg: 44, rate: 1400, range: 105, nova: true, magic: true, burn: 14, burnDur: 2800, burnSpread: true }, desc: "Its fire is ALIVE: flames set by the rings leap hungrily from foe to foe." },
        },
      },
    },
  },
  support: {
    name: "Warden Mage", cost: 110, dtype: "magic", proj: "aura",
    blurb: "A frost-touched mage on an altar — biting cold slows every enemy in the aura.",
    levels: [
      { slow: 0.15, range: 100, rate: 0 },
      { slow: 0.2, range: 110, rate: 0, cost: 80, label: "Deepening Chill" },
      { slow: 0.25, range: 120, rate: 0, cost: 120, label: "Heart of Winter" },
    ],
    branches: {
      a: {
        name: "Rimecaller", cost: 220, stats: { slow: 0.4, range: 135, nova: 10, novaFreeze: 900, novaEvery: 7000 }, desc: "Deep cold thickens the air — and every few heartbeats a frost nova flash-freezes the whole aura.",
        rank4: {
          a: { name: "Absolute Zero", cost: 340, stats: { slow: 0.5, range: 145, colddps: 11, nova: 16, novaFreeze: 1100, novaEvery: 6000 }, desc: "The air itself turns lethal: everything in the aura slows to a crawl and freezes by inches." },
          b: { name: "Permafrost Heart", cost: 340, stats: { slow: 0.38, range: 145, nova: 10, novaFreeze: 900, novaEvery: 6000, brittle: 0.35, brittleDur: 4000 }, desc: "Novas leave foes BRITTLE — frozen flesh takes a third more from every arrow, blade, and stone." },
        },
      },
      b: {
        name: "Lifebinder", cost: 220, stats: { slow: 0.12, heal: 24, range: 135 }, desc: "Warm light within the cold: wounded knights standing in the aura are mended swiftly.",
        rank4: {
          a: { name: "Guardian's Grace", cost: 340, stats: { slow: 0.12, heal: 26, range: 145, shield: true }, desc: "Knights in the light carry a shimmering ward that swallows one blow whole, then slowly reforms." },
          b: { name: "High Cathedral", cost: 340, stats: { slow: 0.12, heal: 30, range: 150, mend: 1 }, desc: "A wave survived is a wall reborn: each cleared wave, the cathedral restores 1 castle HP." },
        },
      },
    },
  },
};
