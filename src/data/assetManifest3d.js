const ROOT = 'Assets/Kenney TD Kit 3D/';

export const TILE_MODEL_PATHS = {
  straight: `${ROOT}tile-straight.glb`,
  corner: `${ROOT}tile-corner-square.glb`,
  spawn: `${ROOT}tile-spawn.glb`,
  end: `${ROOT}tile-end.glb`,
};

export const TOWER_MODEL_PATHS = {
  bottom: `${ROOT}tower-round-bottom-a.glb`,
  middle: `${ROOT}tower-round-middle-a.glb`,
  top: `${ROOT}tower-round-top-a.glb`,
  weapon: `${ROOT}weapon-turret.glb`,
};

export const CORE_MODEL_PATH = `${ROOT}wood-structure-high.glb`;

// Keyed by the same unit typeId used throughout balance.js/units.js, so the
// renderer can look models up directly with no separate mapping table.
export const UNIT_MODEL_PATHS = {
  tank: `${ROOT}enemy-ufo-a.glb`,
  bomber: `${ROOT}enemy-ufo-b.glb`,
  scout: `${ROOT}enemy-ufo-c.glb`,
  medic: `${ROOT}enemy-ufo-d.glb`,
};

export const DECORATION_MODEL_PATHS = {
  tree: `${ROOT}detail-tree.glb`,
  rocks: `${ROOT}detail-rocks.glb`,
};

export function allModelPaths() {
  return {
    ...TILE_MODEL_PATHS,
    ...Object.fromEntries(Object.entries(TOWER_MODEL_PATHS).map(([k, v]) => [`tower_${k}`, v])),
    core: CORE_MODEL_PATH,
    ...Object.fromEntries(Object.entries(UNIT_MODEL_PATHS).map(([k, v]) => [`unit_${k}`, v])),
    ...Object.fromEntries(Object.entries(DECORATION_MODEL_PATHS).map(([k, v]) => [`deco_${k}`, v])),
  };
}
