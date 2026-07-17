// Starting at this base, every tower rolls one of these modifiers instead of
// being a plain single-target attacker. Introduced as an endless-mode
// difficulty cliff - up to this point the game is about out-scaling flat
// tower stats, past it towers introduce genuinely new threat types that
// stat-stacking alone doesn't trivially answer.
export const TOWER_MODIFIER_THRESHOLD_BASE = 11;

export const TOWER_MODIFIERS = {
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    label: 'CHAIN',
    color: '#e8d24f',
    description: 'Every attack arcs to nearby units instead of hitting just one.',
    chainCount: 3,
    chainFalloff: [1, 0.65, 0.45],
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Frost Nova',
    label: 'FROST',
    color: '#7fd8e8',
    description: 'Periodically pulses a freezing aura that roots units caught in range (dodge% resists).',
    novaCooldown: 3.2,
    rootDuration: 1.2,
  },
  tar_trap: {
    id: 'tar_trap',
    name: 'Tar Trap',
    label: 'TAR',
    color: '#c99a4f',
    description: 'Periodically drops a patch of tar on the path that slows any unit standing in it. Not dodgeable - it\'s terrain, not an attack.',
    trapCooldown: 3.5,
    trapDuration: 5,
    trapRadius: 55,
    slowMultiplier: 0.5,
  },
};

const MODIFIER_IDS = Object.keys(TOWER_MODIFIERS);

export function rollTowerModifier(rand) {
  return MODIFIER_IDS[Math.floor(rand() * MODIFIER_IDS.length)];
}
