import { MAP_THEMES } from '../data/mapThemes.js';

// Purely decorative looping animation for the main menu. Deliberately kept
// independent from Battle/BattleRenderer - it has no win/lose state and no
// real combat, just a handful of marchers that spawn, cross the screen, and
// get discarded, so the marcher list never grows unbounded no matter how
// long it's left running.
const THEME_CYCLE = ['grass', 'desert', 'stone'];
const THEME_SECONDS = 9;
const UNIT_SIZE = 46;
const HQ_SIZE = 84;
const SPAWN_MIN = 0.7;
const SPAWN_MAX = 1.3;

export class MenuScene {
  constructor(ctx, width, height, sprites) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.sprites = sprites;
    this.unitTypeIds = Object.keys(sprites.units);
    this.laneY = height / 2;
    this.time = 0;
    this.spawnTimer = 0;
    this.marchers = [];
  }

  update(dt) {
    this.time += dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.marchers.length < 8) {
      this._spawn();
      this.spawnTimer = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    }
    for (const m of this.marchers) {
      m.x += m.speed * dt;
    }
    this.marchers = this.marchers.filter((m) => m.x < this.width + UNIT_SIZE);
  }

  _spawn() {
    const typeId = this.unitTypeIds[Math.floor(Math.random() * this.unitTypeIds.length)];
    this.marchers.push({
      typeId,
      x: -UNIT_SIZE,
      row: (Math.random() - 0.5) * (this.height * 0.35),
      speed: 45 + Math.random() * 35,
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const cycleIndex = ((Math.floor(this.time / THEME_SECONDS) % THEME_CYCLE.length) + THEME_CYCLE.length) % THEME_CYCLE.length;
    const themeId = THEME_CYCLE[cycleIndex];
    const theme = MAP_THEMES[themeId];

    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = theme.groundAlt;
    for (let x = 0; x < this.width; x += 32) {
      for (let y = 0; y < this.height; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) ctx.fillRect(x, y, 32, 32);
      }
    }

    ctx.save();
    ctx.strokeStyle = theme.path;
    ctx.lineWidth = 56;
    ctx.beginPath();
    ctx.moveTo(-20, this.laneY);
    ctx.lineTo(this.width + 20, this.laneY);
    ctx.stroke();
    ctx.restore();

    this.sprites.hq.draw(ctx, this.width - HQ_SIZE + 26, this.laneY - HQ_SIZE / 2, HQ_SIZE, HQ_SIZE);

    for (const m of this.marchers) {
      const sprite = this.sprites.units[m.typeId];
      sprite.draw(ctx, m.x - UNIT_SIZE / 2, this.laneY + m.row - UNIT_SIZE / 2, UNIT_SIZE, UNIT_SIZE);
    }
  }
}
