import { loadImages } from './engine/assetLoader.js';
import { StaticSprite } from './engine/spriteSheet.js';
import { unitSpritePaths, buildingSpritePaths } from './data/assetManifest.js';
import { UNIT_TYPES } from './data/units.js';
import { WAVES_PER_BASE, currencyForWaveClear, EARLY_CLEAR_BONUS_PER_WAVE } from './data/balance.js';
import { getTrinket } from './data/trinkets.js';
import { GameState } from './game/GameState.js';
import { Battle } from './game/Battle.js';
import { BattleRenderer } from './render/BattleRenderer.js';
import { MenuScene } from './render/MenuScene.js';
import {
  updateHud,
  showScreen,
  renderPlanningScreen,
  setBattleStatus,
  showContinueButton,
  bindSpeedButtons,
  renderShopScreen,
  promptModTarget,
  promptRename,
  renderGameOverScreen,
  bindTopLevelButtons,
} from './ui/screens.js';

const startBtn = document.getElementById('btn-start-run');
startBtn.disabled = true;
startBtn.textContent = 'Loading...';

const gameState = new GameState();
let currentBattle = null;
let speedMultiplier = 1;

async function boot() {
  const unitPaths = unitSpritePaths();
  const buildingPaths = buildingSpritePaths();
  const images = await loadImages({ ...unitPaths, ...buildingPaths });

  const sprites = {
    units: {},
    tower: new StaticSprite(images.tower),
    hq: new StaticSprite(images.hq),
  };
  for (const typeId of Object.keys(UNIT_TYPES)) {
    sprites.units[typeId] = new StaticSprite(images[UNIT_TYPES[typeId].sprite]);
  }

  const canvas = document.getElementById('battle-canvas');
  const ctx = canvas.getContext('2d');
  const renderer = new BattleRenderer(ctx, sprites);

  const menuCanvas = document.getElementById('menu-canvas');
  const menuCtx = menuCanvas.getContext('2d');
  const menuScene = new MenuScene(menuCtx, menuCanvas.width, menuCanvas.height, sprites);
  const menuScreenEl = document.getElementById('screen-menu');

  bindSpeedButtons((mult) => {
    speedMultiplier = mult;
  });

  bindTopLevelButtons({
    onStart: startRun,
    onContinueShop: continueToNextBase,
    onRestart: restartRun,
  });

  startBtn.disabled = false;
  startBtn.textContent = 'Start Run';
  showScreen('menu');
  updateHud(gameState);

  let lastTime = performance.now();
  function frame(now) {
    const rawDt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (currentBattle && !currentBattle.finished) {
      currentBattle.update(rawDt * speedMultiplier);
      renderer.draw(currentBattle, gameState);
      updateHud(gameState);
      if (currentBattle.finished) onWaveFinished();
    }
    if (menuScreenEl.classList.contains('active')) {
      menuScene.update(rawDt);
      menuScene.draw();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function startRun() {
    gameState.reset();
    showScreen('planning');
    updateHud(gameState);
    renderPlanningScreen(gameState, launchWave, onRenameUnit);
  }

  function launchWave(selectedUids) {
    currentBattle = new Battle(gameState, selectedUids);
    showScreen('battle');
    setBattleStatus('Wave in progress...');
    showContinueButton(false);
  }

  function onWaveFinished() {
    renderer.draw(currentBattle, gameState);

    if (gameState.livesRemaining() <= 0) {
      setBattleStatus('Your life pool ran out.');
      showContinueButton(true, () => goToGameOver('You lost too many units defending this base.'));
      return;
    }

    const clearBonus = currencyForWaveClear(gameState.waveIndex);
    const coreDestroyed = gameState.base.coreHp <= 0;
    const wavesRemaining = WAVES_PER_BASE - gameState.waveIndex;

    let total = currentBattle.currencyEarned + clearBonus;
    let statusText;
    const coreHp = Math.ceil(gameState.base.coreHp);

    if (coreDestroyed && wavesRemaining > 0) {
      const multiplier = 1 + EARLY_CLEAR_BONUS_PER_WAVE * wavesRemaining;
      total *= multiplier;
      statusText = `Core destroyed on wave ${gameState.waveIndex}/5! +${Math.round(total)} gold (${wavesRemaining} wave${wavesRemaining > 1 ? 's' : ''} skipped, x${multiplier.toFixed(2)} bonus)`;
    } else {
      statusText = `Wave ${gameState.waveIndex} complete — +${Math.round(total)} gold. Core: ${coreHp}/${gameState.base.coreMaxHp} HP`;
    }

    if (gameState.hasTrinket('gilded_standard')) {
      total *= 1 + getTrinket('gilded_standard').param;
    }

    gameState.currency += total;
    setBattleStatus(statusText);

    showContinueButton(true, () => {
      if (coreDestroyed) {
        goToShop();
      } else if (gameState.waveIndex >= WAVES_PER_BASE) {
        goToGameOver('The core survived all 5 waves.');
      } else {
        gameState.waveIndex++;
        showScreen('planning');
        updateHud(gameState);
        renderPlanningScreen(gameState, launchWave, onRenameUnit);
      }
    });
  }

  function goToShop() {
    gameState.basesCleared++;
    gameState.beginShopVisit();
    const rewardText = `Base ${gameState.baseIndex} Cleared!`;
    showScreen('shop');
    updateHud(gameState);
    renderShopScreen(gameState, rewardText, onBuyMod, onRecruitUnit, onBuyTrinket, onRenameUnit);
  }

  function onBuyMod(mod, redraw) {
    if (mod.scope === 'instance') {
      promptModTarget(gameState, mod, (uid) => {
        gameState.applyMod(mod, uid);
        redraw();
        updateHud(gameState);
      });
    } else {
      gameState.applyMod(mod, null);
      redraw();
      updateHud(gameState);
    }
  }

  function onRecruitUnit(offer, redraw) {
    gameState.purchaseUnit(offer);
    redraw();
    updateHud(gameState);
  }

  function onBuyTrinket(trinket, redraw) {
    gameState.purchaseTrinket(trinket);
    redraw();
    updateHud(gameState);
  }

  function onRenameUnit(unit, defaultName, redraw) {
    promptRename(
      unit,
      defaultName,
      (name) => {
        gameState.renameUnit(unit.uid, name);
        redraw();
      },
      () => {
        gameState.renameUnit(unit.uid, '');
        redraw();
      }
    );
  }

  function continueToNextBase() {
    gameState.baseIndex++;
    gameState.startNewBase();
    showScreen('planning');
    updateHud(gameState);
    renderPlanningScreen(gameState, launchWave, onRenameUnit);
  }

  function goToGameOver(reason) {
    gameState.runOver = true;
    renderGameOverScreen(gameState, reason);
    showScreen('gameover');
    updateHud(gameState);
  }

  function restartRun() {
    gameState.reset();
    currentBattle = null;
    showScreen('menu');
    updateHud(gameState);
  }
}

boot().catch((err) => {
  console.error(err);
  startBtn.textContent = 'Failed to load assets (see console)';
});
