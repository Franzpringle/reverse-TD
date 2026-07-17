export const MAP_THEMES = {
  grass: {
    id: 'grass',
    name: 'Grassland',
    ground: '#3f6b31',
    groundAlt: '#5a7f43',
    path: 'rgba(120, 92, 56, 0.55)',
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    ground: '#c2a06b',
    groundAlt: '#d4b47e',
    path: 'rgba(139, 90, 43, 0.6)',
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    ground: '#6e7076',
    groundAlt: '#7f8288',
    path: 'rgba(40, 44, 52, 0.6)',
  },
};

const THEME_IDS = Object.keys(MAP_THEMES);

// Avoids repeating whatever theme the previous base used, so consecutive
// bases always read as visually distinct even though the pick is otherwise
// random.
export function rollMapTheme(rand, previousThemeId) {
  const pool = previousThemeId && THEME_IDS.length > 1 ? THEME_IDS.filter((id) => id !== previousThemeId) : THEME_IDS;
  return pool[Math.floor(rand() * pool.length)];
}
