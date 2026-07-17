const ROOT = 'Assets/Tiny Swords (Free Pack)/';

export const PLAYER_FACTION = 'Red';
export const ENEMY_FACTION = 'Blue';

export function unitSpritePaths(faction) {
  const dir = `${ROOT}Units/${faction} Units`;
  return {
    warrior_idle: `${dir}/Warrior/Warrior_Idle.png`,
    warrior_run: `${dir}/Warrior/Warrior_Run.png`,
    warrior_attack: `${dir}/Warrior/Warrior_Attack1.png`,
    archer_idle: `${dir}/Archer/Archer_Idle.png`,
    archer_run: `${dir}/Archer/Archer_Run.png`,
    archer_attack: `${dir}/Archer/Archer_Shoot.png`,
    pawn_idle: `${dir}/Pawn/Pawn_Idle.png`,
    pawn_run: `${dir}/Pawn/Pawn_Run.png`,
    cleric_idle: `${dir}/Monk/Idle.png`,
    cleric_run: `${dir}/Monk/Run.png`,
    cleric_heal: `${dir}/Monk/Heal.png`,
  };
}

export function buildingSpritePaths(faction) {
  const dir = `${ROOT}Buildings/${faction} Buildings`;
  return {
    tower: `${dir}/Tower.png`,
    castle: `${dir}/Castle.png`,
  };
}
