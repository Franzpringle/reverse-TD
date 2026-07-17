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

// The core/HQ is built from the same modular "castle keep" pieces as the
// attack towers (just the square variant, stacked taller, at a bigger
// scale), rather than the plain wood-structure prop - it should visually
// read as the thing under siege, not a shed.
export const CORE_MODEL_PATHS = {
  bottom: `${ROOT}tower-square-bottom-a.glb`,
  middle: `${ROOT}tower-square-middle-a.glb`,
  top: `${ROOT}tower-square-top-a.glb`,
  roof: `${ROOT}tower-square-roof-a.glb`,
};

// Keyed by the same unit typeId used throughout balance.js/units.js, so the
// renderer can look models up directly with no separate mapping table.
export const UNIT_MODEL_PATHS = {
  tank: `${ROOT}enemy-ufo-a.glb`,
  bomber: `${ROOT}enemy-ufo-b.glb`,
  scout: `${ROOT}enemy-ufo-c.glb`,
  medic: `${ROOT}enemy-ufo-d.glb`,
};

// Scattered around the battlefield for scenery, away from the path/towers/
// core. Grouped by map theme id (see data/mapThemes.js) so grass bases lean
// wooded, desert bases lean dry/rocky, stone bases lean bare rock.
export const DECORATION_MODEL_PATHS = {
  tree: `${ROOT}detail-tree.glb`,
  treeLarge: `${ROOT}detail-tree-large.glb`,
  rocks: `${ROOT}detail-rocks.glb`,
  rocksLarge: `${ROOT}detail-rocks-large.glb`,
  crystal: `${ROOT}detail-crystal.glb`,
  crystalLarge: `${ROOT}detail-crystal-large.glb`,
  dirt: `${ROOT}detail-dirt.glb`,
  dirtLarge: `${ROOT}detail-dirt-large.glb`,
};

export const DECORATION_THEME_POOLS = {
  grass: ['tree', 'tree', 'tree', 'treeLarge', 'rocks', 'rocksLarge'],
  desert: ['rocks', 'rocks', 'rocksLarge', 'dirt', 'dirtLarge', 'crystal'],
  stone: ['rocks', 'rocksLarge', 'crystal', 'crystalLarge', 'dirt'],
};

export function allModelPaths() {
  return {
    ...TILE_MODEL_PATHS,
    ...Object.fromEntries(Object.entries(TOWER_MODEL_PATHS).map(([k, v]) => [`tower_${k}`, v])),
    ...Object.fromEntries(Object.entries(CORE_MODEL_PATHS).map(([k, v]) => [`core_${k}`, v])),
    ...Object.fromEntries(Object.entries(UNIT_MODEL_PATHS).map(([k, v]) => [`unit_${k}`, v])),
    ...Object.fromEntries(Object.entries(DECORATION_MODEL_PATHS).map(([k, v]) => [`deco_${k}`, v])),
  };
}
