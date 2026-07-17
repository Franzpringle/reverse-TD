import { TOWER_TYPE } from './towers.js';
import { buildPath, seededRandom } from '../engine/path.js';
import { TOWER_MODIFIER_THRESHOLD_BASE, TOWER_MODIFIERS, rollTowerModifier } from './towerModifiers.js';
import { rollMapTheme } from './mapThemes.js';

export const CANVAS_W = 900;
export const CANVAS_H = 440;
export const LANE_Y = 220;
export const SPAWN_X = 40;
export const CORE_X = 820;

const PATH_Y_MIN = 90;
const PATH_Y_MAX = 350;
const TOWER_OFFSET = 95;

export const WAVES_PER_BASE = 5;
export const STARTING_LIFE_POOL = 6;

export const CURRENCY_PER_DAMAGE = 0.4;
export const CURRENCY_PER_KILL = 15;
export const CORE_BREACH_DAMAGE_MULT = 2;
export const EARLY_CLEAR_BONUS_PER_WAVE = 0.25;

export const MAX_SPEED_MULTIPLIER = 1.6;
// Separate cap on top of MAX_SPEED_MULTIPLIER for dynamic, in-battle speed
// effects (trinkets like momentum/pack bonuses), so those can't stack their
// way back into "extremely fast" units either.
export const MAX_DYNAMIC_SPEED_BONUS = 0.35;

// Seconds between each unit peeling off from the spawn point in a wave,
// instead of the whole wave appearing at once.
export const UNIT_SPAWN_INTERVAL = 0.35;

export function currencyForWaveClear(waveIndex) {
  return 15 + waveIndex * 5;
}

function clampPathY(y) {
  return Math.max(PATH_Y_MIN, Math.min(PATH_Y_MAX, y));
}

function generateWaypoints(baseIndex, rand) {
  const start = { x: SPAWN_X, y: LANE_Y };
  const end = { x: CORE_X, y: LANE_Y };
  if (baseIndex <= 1) return [start, end];

  const bendCount = Math.min(2 + Math.floor((baseIndex - 1) / 2), 5);
  const amplitude = 90;

  const points = [start];
  let lastSign = 0;
  for (let i = 1; i <= bendCount; i++) {
    const t = i / (bendCount + 1);
    const x = SPAWN_X + (CORE_X - SPAWN_X) * t;
    let sign = rand() < 0.5 ? -1 : 1;
    if (sign === lastSign) sign = -sign;
    lastSign = sign;
    const y = LANE_Y + sign * amplitude * (0.55 + rand() * 0.45);
    points.push({ x, y: clampPathY(y) });
  }
  points.push(end);
  return points;
}

export function generateBase(baseIndex, previousThemeId = null) {
  const coreMaxHp = 150 + (baseIndex - 1) * 70;
  const towerCount = 1 + Math.floor((baseIndex - 1) / 2);
  const towerHp = TOWER_TYPE.baseStats.hp + (baseIndex - 1) * 4;
  const towerDamage = TOWER_TYPE.baseStats.damage + Math.floor((baseIndex - 1) / 2);
  const modifiersActive = baseIndex >= TOWER_MODIFIER_THRESHOLD_BASE;

  const rand = seededRandom(baseIndex * 7919 + 13);
  const waypoints = generateWaypoints(baseIndex, rand);
  const path = buildPath(waypoints);

  const marginFrac = 0.12;
  const towers = [];
  for (let i = 0; i < towerCount; i++) {
    const t = towerCount === 1 ? 0.5 : marginFrac + ((1 - 2 * marginFrac) * i) / (towerCount - 1);
    const dist = t * path.totalLength;
    const point = path.pointAt(dist);
    const tangent = path.tangentAt(dist);
    const perp = { x: -tangent.dy, y: tangent.dx };
    const side = i % 2 === 0 ? 1 : -1;
    const modifier = modifiersActive ? rollTowerModifier(rand) : null;
    towers.push({
      id: `tower-${baseIndex}-${i}`,
      x: point.x + perp.x * TOWER_OFFSET * side,
      y: point.y + perp.y * TOWER_OFFSET * side,
      hp: towerHp,
      maxHp: towerHp,
      damage: towerDamage,
      range: TOWER_TYPE.baseStats.range,
      attackCooldown: TOWER_TYPE.baseStats.attackCooldown,
      cooldown: 0,
      alive: true,
      modifier,
      novaTimer: modifier === 'frost_nova' ? rand() * TOWER_MODIFIERS.frost_nova.novaCooldown : null,
    });
  }

  const theme = rollMapTheme(rand, previousThemeId);

  return {
    baseIndex,
    coreHp: coreMaxHp,
    coreMaxHp,
    corePos: waypoints[waypoints.length - 1],
    path: waypoints,
    towers,
    theme,
  };
}
