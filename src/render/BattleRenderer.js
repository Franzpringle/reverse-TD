import { CANVAS_W, CANVAS_H } from '../data/balance.js';
import { TOWER_MODIFIERS } from '../data/towerModifiers.js';

const UNIT_SIZE = 56;
const TOWER_SIZE = 72;
const HQ_SIZE = 140;

export class BattleRenderer {
  constructor(ctx, sprites) {
    this.ctx = ctx;
    this.sprites = sprites;
  }

  draw(battle, gameState) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    this._drawGround(ctx);
    this._drawPath(ctx, gameState.base.path);
    this._drawCore(ctx, gameState.base);

    for (const tower of battle.towers) {
      this._drawTower(ctx, tower);
    }

    for (const unit of battle.units) {
      if (unit.state !== 'running') continue;
      this._drawUnit(ctx, unit);
    }
  }

  _drawGround(ctx) {
    ctx.fillStyle = '#3f6b31';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#5a7f43';
    for (let x = 0; x < CANVAS_W; x += 32) {
      for (let y = 0; y < CANVAS_H; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) ctx.fillRect(x, y, 32, 32);
      }
    }
  }

  _drawPath(ctx, waypoints) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 92, 56, 0.55)';
    ctx.lineWidth = 60;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) ctx.lineTo(waypoints[i].x, waypoints[i].y);
    ctx.stroke();
    ctx.restore();
  }

  _drawCore(ctx, base) {
    const sprite = this.sprites.hq;
    const x = base.corePos.x - HQ_SIZE / 2;
    const y = base.corePos.y - HQ_SIZE / 2;
    sprite.draw(ctx, x, y, HQ_SIZE, HQ_SIZE);
    this._drawBar(ctx, x, y - 12, HQ_SIZE, base.coreHp, base.coreMaxHp, '#4fa8e8');
    this._label(ctx, x + HQ_SIZE / 2, y - 18, 'HQ', '#f2e6c9');
  }

  _drawTower(ctx, tower) {
    const x = tower.x - TOWER_SIZE / 2;
    const y = tower.y - TOWER_SIZE / 2;
    const sprite = this.sprites.tower;
    ctx.save();
    if (!tower.alive) ctx.globalAlpha = 0.25;
    sprite.draw(ctx, x, y, TOWER_SIZE, TOWER_SIZE);
    ctx.restore();
    if (tower.alive) {
      const mod = tower.modifier ? TOWER_MODIFIERS[tower.modifier] : null;
      this._drawBar(ctx, x, y - 10, TOWER_SIZE, tower.hp, tower.maxHp, '#4fa8e8');
      this._rangeCircle(ctx, tower.x, tower.y, tower.range, mod ? mod.color : 'rgba(79, 168, 232, 0.15)');
      if (mod) {
        this._label(ctx, tower.x, y - 10, mod.label, mod.color);
        if (tower.modifier === 'frost_nova') this._drawNovaPulse(ctx, tower);
      }
    }
  }

  _drawNovaPulse(ctx, tower) {
    const cfg = TOWER_MODIFIERS.frost_nova;
    const phase = 1 - Math.max(0, tower.novaTimer) / cfg.novaCooldown;
    if (phase <= 0 || phase >= 1) return;
    const radius = tower.range * phase;
    const alpha = 0.5 * (1 - phase);
    ctx.save();
    ctx.strokeStyle = `rgba(127, 216, 232, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _rangeCircle(ctx, x, y, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawUnit(ctx, unit) {
    const type = unit.rosterUnit.typeId;
    const sprite = this.sprites.units[type];
    const x = unit.x - UNIT_SIZE / 2;
    const y = unit.y - UNIT_SIZE / 2;
    if (unit.rootedUntil > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(127, 216, 232, 0.35)';
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y + UNIT_SIZE / 2 - 4, UNIT_SIZE / 2.2, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (unit.stats.heal) this._drawHealPulse(ctx, unit);
    sprite.draw(ctx, x, y, UNIT_SIZE, UNIT_SIZE, unit.facingLeft);
    this._drawBar(ctx, x, y - 8, UNIT_SIZE, unit.hp, unit.maxHp, '#d94f4f');
  }

  _drawHealPulse(ctx, unit) {
    const cfg = unit.stats.heal;
    const phase = 1 - Math.max(0, unit.healCooldown) / cfg.cooldown;
    if (phase <= 0 || phase >= 1) return;
    const radius = cfg.radius * phase;
    const alpha = 0.45 * (1 - phase);
    ctx.save();
    ctx.strokeStyle = `rgba(122, 214, 120, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawBar(ctx, x, y, w, value, max, color) {
    const h = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, value / max), h);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeRect(x, y, w, h);
  }

  _label(ctx, cx, y, text, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, y - 4);
    ctx.restore();
  }
}
