import {
  CURRENCY_PER_DAMAGE,
  CURRENCY_PER_KILL,
  CORE_BREACH_DAMAGE_MULT,
  MAX_DYNAMIC_SPEED_BONUS,
  UNIT_SPAWN_INTERVAL,
} from '../data/balance.js';
import { buildPath, buildOffsetPath } from '../engine/path.js';
import { getTrinket } from '../data/trinkets.js';
import { TOWER_MODIFIERS } from '../data/towerModifiers.js';

const ROW_OFFSETS = [-24, -8, 8, 24, -16, 16, 0, -32, 32];

// One Battle instance simulates a single wave. Towers and the core live on
// gameState.base and are mutated in place, so damage persists across all
// waves of a base and only resets when a new base is generated. Currency is
// accumulated locally and only applied to gameState.currency once the wave
// finishes, so callers can apply a multiplier (e.g. early core-kill bonus)
// before it lands in the wallet.
export class Battle {
  constructor(gameState, selectedUids) {
    this.gameState = gameState;
    this.finished = false;
    this.currencyEarned = 0;
    this.events = [];
    this.path = buildPath(gameState.base.path);
    this.tarPatches = [];
    this.lanePaths = new Map();
    for (const row of ROW_OFFSETS) {
      if (!this.lanePaths.has(row)) this.lanePaths.set(row, buildOffsetPath(gameState.base.path, row));
    }

    this.momentumParam = gameState.hasTrinket('fleetfoot_charm') ? getTrinket('fleetfoot_charm').param : 0;
    this.packSpeedParam = gameState.hasTrinket('swarm_banner') ? getTrinket('swarm_banner').param : 0;
    this.hasUndyingLocket = gameState.hasTrinket('undying_locket');
    this.rallyParam = gameState.hasTrinket('vengeful_ashes') ? getTrinket('vengeful_ashes').param : 0;
    this.rallyStacks = 0;
    this.hasSunfireEmber = gameState.hasTrinket('sunfire_ember');
    this.regenParam = gameState.hasTrinket('verdant_charm') ? getTrinket('verdant_charm').param : 0;
    this.armorParam = gameState.hasTrinket('iron_bulwark') ? getTrinket('iron_bulwark').param : 0;
    this.berserkerParam = gameState.hasTrinket('bloodrage_fetish') ? getTrinket('bloodrage_fetish').param : 0;
    this.healBoostParam = gameState.hasTrinket('blessed_chalice') ? getTrinket('blessed_chalice').param : 0;
    this.towerKillBonusParam = gameState.hasTrinket('plunderers_sack') ? getTrinket('plunderers_sack').param : 0;

    this.units = selectedUids.map((uid, i) => {
      const rosterUnit = gameState.roster.find((u) => u.uid === uid);
      const stats = gameState.effectiveStats(rosterUnit);
      const row = ROW_OFFSETS[i % ROW_OFFSETS.length];
      const lanePath = this.lanePaths.get(row);
      const start = lanePath.pointAt(0);
      return {
        rosterUnit,
        stats,
        distance: 0,
        row,
        lanePath,
        x: start.x,
        y: start.y,
        facingLeft: false,
        hp: stats.hp,
        maxHp: stats.hp,
        state: 'pending', // pending | running | dead | breached
        spawnTimer: i * UNIT_SPAWN_INTERVAL,
        animTime: Math.random() * 2,
        usedLastStand: false,
        rootedUntil: 0,
        slowedByTar: false,
        healCooldown: stats.heal ? Math.random() * stats.heal.cooldown : 0,
      };
    });
  }

  get towers() {
    return this.gameState.base.towers;
  }

  activeUnits() {
    return this.units.filter((u) => u.state === 'running');
  }

  update(dt) {
    if (this.finished) return;

    for (const unit of this.units) {
      if (unit.state !== 'pending') continue;
      unit.spawnTimer -= dt;
      if (unit.spawnTimer <= 0) unit.state = 'running';
    }

    for (const patch of this.tarPatches) {
      patch.remaining -= dt;
    }
    this.tarPatches = this.tarPatches.filter((p) => p.remaining > 0);

    const activeList = this.activeUnits();
    const activeCount = activeList.length;

    for (const unit of activeList) {
      unit.animTime += dt;

      const regenRate = this.regenParam + (unit.stats.regen || 0);
      if (regenRate > 0 && unit.hp < unit.maxHp) {
        unit.hp = Math.min(unit.maxHp, unit.hp + regenRate * dt);
      }

      if (unit.rootedUntil > 0) {
        unit.rootedUntil = Math.max(0, unit.rootedUntil - dt);
      } else {
        let speedMult = 1;
        if (this.momentumParam > 0 && this.path.totalLength > 0) {
          speedMult += this.momentumParam * (unit.distance / this.path.totalLength);
        }
        if (this.packSpeedParam > 0) {
          speedMult += this.packSpeedParam * Math.max(0, activeCount - 1);
        }
        speedMult = Math.min(speedMult, 1 + MAX_DYNAMIC_SPEED_BONUS);

        const tarCfg = TOWER_MODIFIERS.tar_trap;
        unit.slowedByTar = this.tarPatches.some((p) => Math.hypot(unit.x - p.x, unit.y - p.y) <= p.radius);
        if (unit.slowedByTar) speedMult *= tarCfg.slowMultiplier;

        unit.distance = Math.min(this.path.totalLength, unit.distance + unit.stats.speed * speedMult * dt);

        const pos = unit.lanePath.pointAt(unit.distance);
        const tangent = this.path.tangentAt(unit.distance);
        unit.x = pos.x;
        unit.y = pos.y;
        if (tangent.dx < -0.15) unit.facingLeft = true;
        else if (tangent.dx > 0.15) unit.facingLeft = false;
      }

      if (unit.distance >= this.path.totalLength) {
        this._breachCore(unit);
        continue;
      }

      if (unit.stats.heal) {
        unit.healCooldown -= dt;
        if (unit.healCooldown <= 0) {
          this._healNearbyAllies(unit);
          unit.healCooldown = unit.stats.heal.cooldown;
        }
      }
    }

    for (const tower of this.towers) {
      if (!tower.alive) continue;
      tower.cooldown -= dt;
      if (tower.cooldown <= 0) {
        const target = this._nearestUnitInRange(tower);
        if (target) {
          if (tower.modifier === 'chain_lightning') this._towerChainAttack(tower, target);
          else this._towerAttackUnit(tower, target);
          tower.cooldown = tower.attackCooldown;
        }
      }
      if (tower.modifier === 'frost_nova') {
        tower.novaTimer -= dt;
        if (tower.novaTimer <= 0) {
          this._towerFrostNova(tower);
          tower.novaTimer = TOWER_MODIFIERS.frost_nova.novaCooldown;
        }
      }
      if (tower.modifier === 'tar_trap') {
        tower.trapTimer -= dt;
        if (tower.trapTimer <= 0) {
          this._towerDropTar(tower);
          tower.trapTimer = TOWER_MODIFIERS.tar_trap.trapCooldown;
        }
      }
    }

    if (this.gameState.aliveRoster().length === 0 || this.gameState.livesRemaining() <= 0) {
      this.finished = true;
      return;
    }

    const stillPending = this.units.some((u) => u.state === 'pending');
    if (!stillPending && this.activeUnits().length === 0) {
      this.finished = true;
    }
  }

  _nearestUnitInRange(tower) {
    let best = null;
    let bestDist = Infinity;
    for (const unit of this.units) {
      if (unit.state !== 'running') continue;
      const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y);
      if (dist <= tower.range && dist < bestDist) {
        best = unit;
        bestDist = dist;
      }
    }
    return best;
  }

  _towerChainAttack(tower, primaryTarget) {
    const cfg = TOWER_MODIFIERS.chain_lightning;
    const candidates = this.units
      .filter((u) => u.state === 'running')
      .map((u) => ({ u, dist: Math.hypot(tower.x - u.x, tower.y - u.y) }))
      .filter((e) => e.dist <= tower.range)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, cfg.chainCount);

    candidates.forEach((entry, idx) => {
      const falloff = cfg.chainFalloff[idx] ?? cfg.chainFalloff[cfg.chainFalloff.length - 1];
      this._towerAttackUnit(tower, entry.u, falloff);
    });

    if (candidates.length > 1) {
      this.events.push({ type: 'chain', from: tower, targets: candidates.map((c) => c.u) });
    }
  }

  _towerFrostNova(tower) {
    const cfg = TOWER_MODIFIERS.frost_nova;
    this.events.push({ type: 'novaPulse', x: tower.x, y: tower.y, radius: tower.range });
    if (this.hasSunfireEmber) return;
    for (const unit of this.units) {
      if (unit.state !== 'running') continue;
      const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y);
      if (dist > tower.range) continue;
      if (Math.random() < unit.stats.dodge) {
        this.events.push({ type: 'dodge', x: unit.x, y: unit.y });
        continue;
      }
      unit.rootedUntil = Math.max(unit.rootedUntil, cfg.rootDuration);
      this.events.push({ type: 'rooted', x: unit.x, y: unit.y });
    }
  }

  _towerDropTar(tower) {
    const target = this._nearestUnitInRange(tower);
    if (!target) return;
    const cfg = TOWER_MODIFIERS.tar_trap;
    this.tarPatches.push({ x: target.x, y: target.y, radius: cfg.trapRadius, remaining: cfg.trapDuration });
    this.events.push({ type: 'tarDropped', x: target.x, y: target.y, radius: cfg.trapRadius });
  }

  _healNearbyAllies(healer) {
    const cfg = healer.stats.heal;
    const amount = cfg.amount * (1 + this.healBoostParam);
    let healedAny = false;
    for (const unit of this.units) {
      if (unit === healer || unit.state !== 'running') continue;
      if (Math.hypot(unit.x - healer.x, unit.y - healer.y) > cfg.radius) continue;
      if (unit.hp >= unit.maxHp) continue;
      unit.hp = Math.min(unit.maxHp, unit.hp + amount);
      healedAny = true;
      this.events.push({ type: 'heal', x: unit.x, y: unit.y });
    }
    if (healedAny) this.events.push({ type: 'healPulse', x: healer.x, y: healer.y, radius: cfg.radius });
  }

  _towerAttackUnit(tower, unit, damageMult = 1) {
    if (Math.random() < unit.stats.dodge) {
      this.events.push({ type: 'dodge', x: unit.x, y: unit.y });
      return;
    }
    const rawDmg = tower.damage * damageMult;
    const dmg = this.armorParam > 0 ? Math.max(1, rawDmg - this.armorParam) : rawDmg;
    unit.hp -= dmg;

    if (unit.stats.reflect > 0) {
      const reflected = dmg * unit.stats.reflect;
      tower.hp -= reflected;
      this._earnCurrency(reflected * CURRENCY_PER_DAMAGE);
      if (tower.hp <= 0 && tower.alive) {
        tower.alive = false;
        this._earnCurrency(CURRENCY_PER_KILL + this.towerKillBonusParam);
        this.events.push({ type: 'towerDestroyed', towerId: tower.id });
      }
    }

    if (unit.hp <= 0) {
      if (this.hasUndyingLocket && !unit.usedLastStand) {
        unit.hp = 1;
        unit.usedLastStand = true;
        this.events.push({ type: 'lastStand', x: unit.x, y: unit.y });
      } else {
        unit.state = 'dead';
        unit.rosterUnit.alive = false;
        this.gameState.recordUnitLost();
        if (this.rallyParam > 0) this.rallyStacks++;
        this.events.push({ type: 'death', x: unit.x, y: unit.y });
      }
    }
  }

  _breachCore(unit) {
    unit.state = 'breached';
    const rallyMult = 1 + this.rallyParam * this.rallyStacks;
    const berserkerMult = this.berserkerParam > 0 && unit.hp < unit.maxHp * 0.5 ? 1 + this.berserkerParam : 1;
    const dmg = unit.stats.damage * CORE_BREACH_DAMAGE_MULT * rallyMult * berserkerMult;
    this.gameState.base.coreHp = Math.max(0, this.gameState.base.coreHp - dmg);
    this._earnCurrency(dmg * CURRENCY_PER_DAMAGE);
    this.events.push({ type: 'breach', x: unit.x, y: unit.y });
  }

  _earnCurrency(amount) {
    this.currencyEarned += amount;
  }
}
