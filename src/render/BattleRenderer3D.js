import * as THREE from 'three';
import { CANVAS_W, CANVAS_H } from '../data/balance.js';
import { TOWER_MODIFIERS } from '../data/towerModifiers.js';
import { MAP_THEMES } from '../data/mapThemes.js';
import { DECORATION_THEME_POOLS } from '../data/assetManifest3d.js';
import { cloneModel } from '../engine/modelLoader.js';
import { seededRandom } from '../engine/path.js';

// Canvas-pixel space (the coordinate system every gameplay system already
// works in - path waypoints, tower/unit x,y, tar patch radii) is converted
// to Three.js world units by this single factor, applied only at the very
// last step of rendering. Nothing upstream (Battle.js, balance.js, path.js)
// needed to change for the 3D view - it still simulates in pixel space.
const PIXELS_PER_UNIT = 40;
const TILE_WORLD_SIZE = 1; // native footprint of every Kenney TD Kit tile model
const TOWER_SCALE = 1.7;
const UNIT_SCALE = 0.8;
const CORE_SCALE = 1.9;
const BAR_W = 0.9;
const BAR_H = 0.12;
const DECORATION_COUNT = 16;
const DECORATION_PATH_CLEARANCE = 75;
const DECORATION_STRUCT_CLEARANCE = 95;
const DECORATION_MARGIN = 25;

function px(v) {
  return v / PIXELS_PER_UNIT;
}

function dirOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function oppositeDir(d) {
  return { N: 'S', S: 'N', E: 'W', W: 'E' }[d];
}

// World-space Y rotation that points a model's default +Z forward axis
// toward world direction (dx, dz).
function angleForDir(dx, dz) {
  return Math.atan2(dx, dz);
}

// Best-effort guess at tile-corner-square's default connected sides (East +
// South at rotation 0), rotated in 90 degree steps for the other 3 turn
// shapes. If corners render facing the wrong way once seen in the browser,
// this table is the one place to correct.
const CORNER_ROTATION_BY_SIDES = {
  ES: 0,
  EN: Math.PI / 2,
  NW: Math.PI,
  SW: -Math.PI / 2,
};

function makeBarGroup() {
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, opacity: 0.55, transparent: true, depthTest: false }));
  bg.scale.set(BAR_W, BAR_H, 1);
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd94f4f, depthTest: false }));
  fg.scale.set(BAR_W, BAR_H, 1);
  fg.position.z = 0.001;
  const group = new THREE.Group();
  group.add(bg, fg);
  group.userData.fg = fg;
  group.renderOrder = 10;
  return group;
}

function distToSegment(px_, py_, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px_ - ax) * dx + (py_ - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px_ - cx, py_ - cy);
}

function setBarRatio(group, ratio, color) {
  const fg = group.userData.fg;
  const r = Math.max(0, Math.min(1, ratio));
  fg.scale.x = BAR_W * r;
  fg.position.x = -(BAR_W / 2) * (1 - r);
  if (color) fg.material.color.set(color);
}

export class BattleRenderer3D {
  constructor(canvas, models) {
    this.models = models;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, CANVAS_W / CANVAS_H, 0.1, 500);

    const worldW = px(CANVAS_W);
    const worldH = px(CANVAS_H);
    const cx = worldW / 2;
    const cz = worldH / 2;
    const dist = Math.max(worldW, worldH) * 1.05;
    this.camera.position.set(cx - dist * 0.15, dist * 0.72, cz + dist * 0.62);
    this.camera.lookAt(cx, 0, cz);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(CANVAS_W, CANVAS_H, false);
    this.renderer.shadowMap.enabled = true;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    sun.position.set(cx - 10, 18, cz - 8);
    sun.target.position.set(cx, 0, cz);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -worldW;
    sun.shadow.camera.right = worldW;
    sun.shadow.camera.top = worldH;
    sun.shadow.camera.bottom = -worldH;
    this.scene.add(sun, sun.target);

    this.groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(worldW + 6, worldH + 6),
      new THREE.MeshStandardMaterial({ color: 0x3f6b31 })
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(cx, -0.01, cz);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.pathGroup = new THREE.Group();
    this.towerGroup = new THREE.Group();
    this.unitGroup = new THREE.Group();
    this.tarGroup = new THREE.Group();
    this.coreGroup = new THREE.Group();
    this.decoGroup = new THREE.Group();
    this.scene.add(this.pathGroup, this.towerGroup, this.unitGroup, this.tarGroup, this.coreGroup, this.decoGroup);

    this._builtPathRef = null;
    this._towerMeshes = new Map(); // tower.id -> { group, hpBar }
    this._unitMeshes = new Map(); // rosterUnit.uid -> { group, hpBar, model }
    this._currentBattle = null;
    this._tarMeshPool = [];
  }

  draw(battle, gameState) {
    const base = gameState.base;
    if (base.path !== this._builtPathRef) {
      this._rebuildBase(base);
      this._builtPathRef = base.path;
    }
    if (battle !== this._currentBattle) {
      this._currentBattle = battle;
      this._resetUnits();
    }

    this._updateTowers(battle.towers);
    this._updateUnits(battle.units);
    this._updateTarPatches(battle.tarPatches);
    if (this._coreBar) setBarRatio(this._coreBar, base.coreHp / base.coreMaxHp, '#4fa8e8');

    this.renderer.render(this.scene, this.camera);
  }

  _rebuildBase(base) {
    for (const child of [...this.pathGroup.children]) this.pathGroup.remove(child);
    for (const child of [...this.coreGroup.children]) this.coreGroup.remove(child);
    for (const child of [...this.decoGroup.children]) this.decoGroup.remove(child);
    this._towerMeshes.forEach(({ group, hpBar }) => {
      this.towerGroup.remove(group);
      this.towerGroup.remove(hpBar);
    });
    this._towerMeshes.clear();
    // coreGroup was just fully cleared above, which also drops the old core's
    // hp bar - _coreBar just needs its stale reference dropped to match.
    this._coreBar = null;

    const theme = MAP_THEMES[base.theme] || MAP_THEMES.grass;
    this.groundMesh.material.color.set(theme.ground);

    this._layPathTiles(base.path);
    this._placeCore(base.corePos, base.path);
    this._scatterEnvironment(base);
  }

  _layPathTiles(waypoints) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const dirX = dx / len;
      const dirY = dy / len;
      const steps = Math.max(1, Math.round(len / (PIXELS_PER_UNIT * TILE_WORLD_SIZE)));
      const stepLen = len / steps;
      const worldStep = px(stepLen);
      const angle = angleForDir(dirX, dirY);
      for (let s = 0; s < steps; s++) {
        const dist = stepLen * (s + 0.5);
        const isFirst = i === 0 && s === 0;
        const isLast = i === waypoints.length - 2 && s === steps - 1;
        const template = isFirst ? this.models.spawn : isLast ? this.models.end : this.models.straight;
        const tile = cloneModel(template);
        tile.position.set(px(a.x + dirX * dist), 0, px(a.y + dirY * dist));
        tile.rotation.y = angle;
        tile.scale.z = worldStep / TILE_WORLD_SIZE;
        this._enableShadows(tile);
        this.pathGroup.add(tile);
      }
    }

    for (let i = 1; i < waypoints.length - 1; i++) {
      const a = waypoints[i - 1];
      const b = waypoints[i];
      const c = waypoints[i + 1];
      const inDir = dirOf(b.x - a.x, b.y - a.y);
      const outDir = dirOf(c.x - b.x, c.y - b.y);
      if (inDir === outDir) continue;
      const enterSide = oppositeDir(inDir);
      const key = [enterSide, outDir].sort().join('');
      const rotation = CORNER_ROTATION_BY_SIDES[key] ?? 0;
      const corner = cloneModel(this.models.corner);
      corner.position.set(px(b.x), 0.001, px(b.y));
      corner.rotation.y = rotation;
      this._enableShadows(corner);
      this.pathGroup.add(corner);
    }
  }

  // The core is built from the same modular keep pieces as the attack
  // towers (square variant, so it reads as visually distinct from the round
  // turrets), stacked one tier taller and capped with a roof - it should
  // look like the thing under siege, not just another prop.
  _placeCore(corePos, waypoints) {
    const group = new THREE.Group();
    const bottom = cloneModel(this.models.core_bottom);
    const middle = cloneModel(this.models.core_middle);
    middle.position.y = 0.6;
    const top = cloneModel(this.models.core_top);
    top.position.y = 1.2;
    const roof = cloneModel(this.models.core_roof);
    roof.position.y = 1.7;
    group.add(bottom, middle, top, roof);
    this._enableShadows(group);

    const last = waypoints[waypoints.length - 1];
    const prev = waypoints[waypoints.length - 2];
    const facing = angleForDir(last.x - prev.x, last.y - prev.y);
    group.rotation.y = facing;
    group.scale.setScalar(CORE_SCALE);
    group.position.set(px(corePos.x), 0, px(corePos.y));
    this.coreGroup.add(group);

    const bar = makeBarGroup();
    bar.scale.setScalar(2.2);
    bar.position.set(px(corePos.x), 2.3 * CORE_SCALE, px(corePos.y));
    this.coreGroup.add(bar);
    this._coreBar = bar;
  }

  // Scatters theme-appropriate props (trees/rocks/crystals/dirt) around the
  // battlefield, away from the path and any tower/core footprint. Seeded off
  // baseIndex (with a different offset than balance.js's own path/tower
  // seed) so a given base's scenery is stable across re-renders instead of
  // reshuffling every time draw() rebuilds it.
  _scatterEnvironment(base) {
    const rand = seededRandom(base.baseIndex * 65537 + 101);
    const pool = DECORATION_THEME_POOLS[base.theme] || DECORATION_THEME_POOLS.grass;
    const waypoints = base.path;
    const structures = [...base.towers.map((t) => ({ x: t.x, y: t.y })), base.corePos, waypoints[0]];

    let placed = 0;
    let attempts = 0;
    while (placed < DECORATION_COUNT && attempts < DECORATION_COUNT * 12) {
      attempts++;
      const x = DECORATION_MARGIN + rand() * (CANVAS_W - DECORATION_MARGIN * 2);
      const y = DECORATION_MARGIN + rand() * (CANVAS_H - DECORATION_MARGIN * 2);

      let clear = true;
      for (let i = 0; i < waypoints.length - 1 && clear; i++) {
        if (distToSegment(x, y, waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y) < DECORATION_PATH_CLEARANCE) clear = false;
      }
      if (clear) {
        for (const s of structures) {
          if (Math.hypot(x - s.x, y - s.y) < DECORATION_STRUCT_CLEARANCE) { clear = false; break; }
        }
      }
      if (!clear) continue;

      placed++;
      const key = pool[Math.floor(rand() * pool.length)];
      const template = this.models[`deco_${key}`];
      if (!template) continue;
      const prop = cloneModel(template);
      prop.scale.setScalar(0.8 + rand() * 0.5);
      prop.rotation.y = rand() * Math.PI * 2;
      prop.position.set(px(x), 0, px(y));
      this._enableShadows(prop);
      this.decoGroup.add(prop);
    }
  }

  _updateTowers(towers) {
    const seen = new Set();
    for (const tower of towers) {
      seen.add(tower.id);
      let entry = this._towerMeshes.get(tower.id);
      if (!entry) entry = this._buildTower(tower);
      entry.group.visible = tower.alive;
      entry.hpBar.visible = tower.alive;
      if (tower.alive) {
        setBarRatio(entry.hpBar, tower.hp / tower.maxHp, '#4fa8e8');
      }
    }
    for (const [id, entry] of this._towerMeshes) {
      if (!seen.has(id)) {
        this.towerGroup.remove(entry.group);
        this._towerMeshes.delete(id);
      }
    }
  }

  _buildTower(tower) {
    const group = new THREE.Group();
    const bottom = cloneModel(this.models.tower_bottom);
    const middle = cloneModel(this.models.tower_middle);
    middle.position.y = 0.6;
    const top = cloneModel(this.models.tower_top);
    top.position.y = 1.2;
    const weapon = cloneModel(this.models.tower_weapon);
    weapon.position.y = 1.55;
    group.add(bottom, middle, top, weapon);
    this._enableShadows(group);

    const mod = tower.modifier ? TOWER_MODIFIERS[tower.modifier] : null;
    if (mod) {
      const glow = new THREE.PointLight(new THREE.Color(mod.color), 1.2, 3);
      glow.position.y = 1.8;
      group.add(glow);
    }

    group.scale.setScalar(TOWER_SCALE);
    group.position.set(px(tower.x), 0, px(tower.y));
    this.towerGroup.add(group);

    const hpBar = makeBarGroup();
    hpBar.position.set(px(tower.x), TOWER_SCALE * 1.05, px(tower.y));
    this.towerGroup.add(hpBar);

    const entry = { group, hpBar };
    this._towerMeshes.set(tower.id, entry);
    return entry;
  }

  _resetUnits() {
    for (const { group, hpBar } of this._unitMeshes.values()) {
      this.unitGroup.remove(group);
      this.unitGroup.remove(hpBar);
    }
    this._unitMeshes.clear();
  }

  _updateUnits(units) {
    const seen = new Set();
    for (const unit of units) {
      if (unit.state !== 'running') continue;
      const uid = unit.rosterUnit.uid;
      seen.add(uid);
      let entry = this._unitMeshes.get(uid);
      if (!entry) entry = this._buildUnit(unit);

      entry.group.position.set(px(unit.x), 0, px(unit.y));
      const bob = Math.sin(unit.animTime * 6) * 0.05;
      entry.group.position.y = 0.15 + bob;
      const facing = unit.facingLeft ? -Math.PI / 2 : Math.PI / 2;
      entry.group.rotation.y = facing;
      entry.group.visible = true;

      const tint = unit.rootedUntil > 0 ? '#7fd8e8' : unit.slowedByTar ? '#8a6a3a' : '#d94f4f';
      setBarRatio(entry.hpBar, unit.hp / unit.maxHp, tint);
      entry.hpBar.position.set(px(unit.x), 1.1, px(unit.y));
    }
    for (const [uid, entry] of this._unitMeshes) {
      if (!seen.has(uid)) {
        this.unitGroup.remove(entry.group);
        this.unitGroup.remove(entry.hpBar);
        this._unitMeshes.delete(uid);
      }
    }
  }

  _buildUnit(unit) {
    const typeId = unit.rosterUnit.typeId;
    const template = this.models[`unit_${typeId}`] || this.models.unit_tank;
    const model = cloneModel(template);
    model.scale.setScalar(UNIT_SCALE);
    this._enableShadows(model);
    const group = new THREE.Group();
    group.add(model);
    this.unitGroup.add(group);

    const hpBar = makeBarGroup();
    this.unitGroup.add(hpBar);

    const entry = { group, hpBar };
    this._unitMeshes.set(unit.rosterUnit.uid, entry);
    return entry;
  }

  _updateTarPatches(patches) {
    while (this._tarMeshPool.length < patches.length) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1, 20),
        new THREE.MeshBasicMaterial({ color: 0x3a2a14, transparent: true, opacity: 0.5 })
      );
      mesh.rotation.x = -Math.PI / 2;
      this.tarGroup.add(mesh);
      this._tarMeshPool.push(mesh);
    }
    this._tarMeshPool.forEach((mesh, i) => {
      const patch = patches[i];
      if (!patch) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.set(px(patch.x), 0.005, px(patch.y));
      const r = px(patch.radius);
      mesh.scale.set(r, r, 1);
      mesh.material.opacity = Math.min(0.6, 0.3 + 0.3 * (patch.remaining / TOWER_MODIFIERS.tar_trap.trapDuration));
    });
  }

  _enableShadows(obj) {
    obj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }
}
