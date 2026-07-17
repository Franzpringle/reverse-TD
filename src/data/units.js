import { tierInfo, pickWeightedTier } from './tiers.js';
import { INSTANCE_MOD_FAMILY_KEYS, buildModCard } from './mods.js';

export const UNIT_TYPES = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Balanced melee fighter. Hits hard when it reaches the core.',
    baseStats: { hp: 40, damage: 8, speed: 55 },
    sprites: { idle: 'warrior_idle', run: 'warrior_run', attack: 'warrior_attack' },
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    description: 'Fragile, moderate core damage.',
    baseStats: { hp: 22, damage: 6, speed: 50 },
    sprites: { idle: 'archer_idle', run: 'archer_run', attack: 'archer_attack' },
  },
  pawn: {
    id: 'pawn',
    name: 'Pawn',
    description: 'Cheap, fast, expendable.',
    baseStats: { hp: 14, damage: 3, speed: 85 },
    sprites: { idle: 'pawn_idle', run: 'pawn_run', attack: 'pawn_run' },
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    description: 'Weak in a fight, but periodically heals nearby allies.',
    baseStats: {
      hp: 26,
      damage: 2,
      speed: 48,
      heal: { amount: 5, radius: 90, cooldown: 1.4 },
    },
    sprites: { idle: 'cleric_idle', run: 'cleric_run', attack: 'cleric_heal' },
  },
};

const RECRUIT_BASE_COST = { warrior: 55, archer: 50, pawn: 32, cleric: 60 };
const RECRUIT_TIER_COST_MULT = { 1: 1, 2: 1.9, 3: 3.4 };
const RECRUIT_TIER_MOD_COUNT = { 1: 0, 2: 1, 3: 2 };

let recruitOfferSeq = 1;

// Recruits are not stronger base units at higher tiers - they're the same
// stock unit type, just already carrying pre-attached instance mods, so
// rarity is about build variety rather than raw power.
export function rollUnitOffers(rand, count = 3) {
  const typeIds = Object.keys(UNIT_TYPES);
  const offers = [];
  for (let i = 0; i < count; i++) {
    const typeId = typeIds[Math.floor(rand() * typeIds.length)];
    const tier = pickWeightedTier(rand);
    const modCount = RECRUIT_TIER_MOD_COUNT[tier];
    const usedFamilies = new Set();
    const mods = [];
    for (let m = 0; m < modCount; m++) {
      let family = INSTANCE_MOD_FAMILY_KEYS[Math.floor(rand() * INSTANCE_MOD_FAMILY_KEYS.length)];
      let guard = 0;
      while (usedFamilies.has(family) && guard < 10) {
        family = INSTANCE_MOD_FAMILY_KEYS[Math.floor(rand() * INSTANCE_MOD_FAMILY_KEYS.length)];
        guard++;
      }
      usedFamilies.add(family);
      mods.push(buildModCard(family, tier).id);
    }
    const t = tierInfo(tier);
    offers.push({
      offerId: `recruit-${recruitOfferSeq++}`,
      typeId,
      tier,
      tierLabel: t.label,
      tierColor: t.color,
      mods,
      cost: Math.round(RECRUIT_BASE_COST[typeId] * RECRUIT_TIER_COST_MULT[tier]),
    });
  }
  return offers;
}

export function createStartingRoster() {
  const composition = [
    ['warrior', 4],
    ['archer', 2],
    ['pawn', 1],
    ['cleric', 1],
  ];
  const roster = [];
  let uid = 1;
  for (const [typeId, count] of composition) {
    for (let i = 0; i < count; i++) {
      roster.push({ uid: uid++, typeId, alive: true, instanceMods: [], customName: null });
    }
  }
  return roster;
}
