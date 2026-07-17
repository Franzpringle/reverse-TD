import { UNIT_TYPES } from '../data/units.js';
import { getMod } from '../data/mods.js';
import { getTrinket } from '../data/trinkets.js';

const els = {
  hudBase: document.getElementById('hud-base'),
  hudWave: document.getElementById('hud-wave'),
  hudLives: document.getElementById('hud-lives'),
  hudGold: document.getElementById('hud-gold'),

  planningWaveNum: document.getElementById('planning-wave-num'),
  rosterList: document.getElementById('roster-list'),
  btnSelectAll: document.getElementById('btn-select-all'),
  btnSelectNone: document.getElementById('btn-select-none'),
  btnLaunchWave: document.getElementById('btn-launch-wave'),

  battleStatus: document.getElementById('battle-status'),
  btnContinueWave: document.getElementById('btn-continue-wave'),

  shopTitle: document.getElementById('shop-title'),
  shopRoster: document.getElementById('shop-roster'),
  activeTrinkets: document.getElementById('active-trinkets'),
  shopUnits: document.getElementById('shop-units'),
  shopTrinkets: document.getElementById('shop-trinkets'),
  shopCards: document.getElementById('shop-cards'),
  btnContinueShop: document.getElementById('btn-continue-shop'),

  gameoverTitle: document.getElementById('gameover-title'),
  gameoverReason: document.getElementById('gameover-reason'),
  gameoverScore: document.getElementById('gameover-score'),
  btnRestart: document.getElementById('btn-restart'),

  modal: document.getElementById('mod-target-modal'),
  modTargetName: document.getElementById('mod-target-name'),
  modTargetList: document.getElementById('mod-target-list'),
  btnCancelModTarget: document.getElementById('btn-cancel-mod-target'),

  renameModal: document.getElementById('rename-modal'),
  renameInput: document.getElementById('rename-input'),
  btnSaveRename: document.getElementById('btn-save-rename'),
  btnClearRename: document.getElementById('btn-clear-rename'),
  btnCancelRename: document.getElementById('btn-cancel-rename'),
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function displayName(unit, type) {
  return escapeHtml(unit.customName || `${type.name} #${unit.uid}`);
}

export function promptRename(unit, defaultName, onSave, onClear) {
  els.renameInput.value = unit.customName || '';
  els.renameInput.placeholder = defaultName;
  els.renameModal.classList.remove('hidden');
  els.renameInput.focus();
  els.renameInput.select();

  const close = () => els.renameModal.classList.add('hidden');
  const save = () => {
    close();
    onSave(els.renameInput.value);
  };

  els.btnSaveRename.onclick = save;
  els.renameInput.onkeydown = (e) => {
    if (e.key === 'Enter') save();
    else if (e.key === 'Escape') close();
  };
  els.btnClearRename.onclick = () => {
    close();
    onClear();
  };
  els.btnCancelRename.onclick = close;
}

export function updateHud(gameState) {
  els.hudBase.textContent = gameState.baseIndex;
  els.hudWave.textContent = gameState.runOver ? '-' : `${gameState.waveIndex}/5`;
  els.hudLives.textContent = `${gameState.livesRemaining()}/${gameState.lifePoolMax}`;
  els.hudGold.textContent = Math.floor(gameState.currency);
}

export function showScreen(name) {
  for (const el of document.querySelectorAll('.screen')) {
    el.classList.toggle('active', el.id === `screen-${name}`);
  }
}

// Order matters here: it's the marching/spawn order for the wave, not just
// which units are included. Deselecting and reselecting a unit sends it to
// the back of the line.
let selectedOrder = [];

function healText(stats) {
  return stats.heal ? `· Heals ${stats.heal.amount} (r${Math.round(stats.heal.radius)}) every ${stats.heal.cooldown}s` : '';
}

export function renderPlanningScreen(gameState, onLaunch, onRename) {
  els.planningWaveNum.textContent = gameState.waveIndex;
  const alive = gameState.aliveRoster();
  const unitsById = new Map(alive.map((u) => [u.uid, u]));
  selectedOrder = alive.map((u) => u.uid);
  let dragUid = null;

  const draw = () => {
    els.rosterList.innerHTML = '';
    const selectedSet = new Set(selectedOrder);
    const unselected = alive.filter((u) => !selectedSet.has(u.uid));
    const displayList = [...selectedOrder.map((uid) => unitsById.get(uid)), ...unselected];

    for (const unit of displayList) {
      const type = UNIT_TYPES[unit.typeId];
      const stats = gameState.effectiveStats(unit);
      const isSelected = selectedSet.has(unit.uid);
      const orderIdx = selectedOrder.indexOf(unit.uid);
      const card = document.createElement('div');
      card.className = 'roster-card' + (isSelected ? ' selected' : '');
      card.draggable = isSelected;
      card.innerHTML = `
        <div class="rc-header">
          ${isSelected ? `<span class="rc-order-badge" title="Spawn order">${orderIdx + 1}</span>` : ''}
          <span class="rc-name">${displayName(unit, type)}</span>
          <button class="rc-rename-btn" draggable="false" title="Rename">Rename</button>
        </div>
        <span class="rc-stats">HP ${Math.round(stats.hp)} · DMG ${Math.round(stats.damage)} · SPD ${Math.round(stats.speed)}
        ${stats.dodge ? `· Dodge ${Math.round(stats.dodge * 100)}%` : ''}
        ${stats.reflect ? `· Reflect ${Math.round(stats.reflect * 100)}%` : ''}
        ${healText(stats)}</span>
        ${unit.instanceMods.length ? `<span class="rc-mods">${unit.instanceMods.map((id) => getMod(id).name).join(', ')}</span>` : ''}
      `;

      card.addEventListener('click', () => {
        if (selectedSet.has(unit.uid)) {
          selectedOrder = selectedOrder.filter((id) => id !== unit.uid);
        } else {
          selectedOrder = [...selectedOrder, unit.uid];
        }
        draw();
      });

      const renameBtn = card.querySelector('.rc-rename-btn');
      renameBtn.addEventListener('click', (e) => e.stopPropagation());
      renameBtn.addEventListener('dragstart', (e) => e.stopPropagation());
      renameBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      renameBtn.addEventListener('click', () => onRename(unit, `${type.name} #${unit.uid}`, draw));

      if (isSelected) {
        card.addEventListener('dragstart', (e) => {
          dragUid = unit.uid;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(unit.uid));
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          dragUid = null;
        });
        card.addEventListener('dragover', (e) => {
          if (dragUid === null || dragUid === unit.uid) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('drag-over');
          if (dragUid === null || dragUid === unit.uid) return;
          const fromIdx = selectedOrder.indexOf(dragUid);
          const toIdx = selectedOrder.indexOf(unit.uid);
          if (fromIdx === -1 || toIdx === -1) return;
          [selectedOrder[fromIdx], selectedOrder[toIdx]] = [selectedOrder[toIdx], selectedOrder[fromIdx]];
          dragUid = null;
          draw();
        });
      }

      els.rosterList.appendChild(card);
    }
    els.btnLaunchWave.disabled = selectedOrder.length === 0;
  };
  draw();

  els.btnSelectAll.onclick = () => {
    selectedOrder = alive.map((u) => u.uid);
    draw();
  };
  els.btnSelectNone.onclick = () => {
    selectedOrder = [];
    draw();
  };
  els.btnLaunchWave.onclick = () => onLaunch([...selectedOrder]);
}

export function setBattleStatus(text) {
  els.battleStatus.textContent = text;
}

export function showContinueButton(show, onContinue) {
  els.btnContinueWave.classList.toggle('hidden', !show);
  if (show) els.btnContinueWave.onclick = onContinue;
}

export function bindSpeedButtons(onSpeedChange) {
  const buttons = document.querySelectorAll('.speed-btn');
  buttons.forEach((btn) => {
    btn.onclick = () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onSpeedChange(Number(btn.dataset.speed));
    };
  });
  buttons[0].classList.add('active');
}

function renderShopRoster(gameState, onRename, draw) {
  els.shopRoster.innerHTML = '';
  for (const unit of gameState.aliveRoster()) {
    const type = UNIT_TYPES[unit.typeId];
    const stats = gameState.effectiveStats(unit);
    const card = document.createElement('div');
    card.className = 'shop-unit-card';
    card.innerHTML = `
      <div class="rc-header">
        <span class="su-name">${displayName(unit, type)}</span>
        <button class="rc-rename-btn" title="Rename">Rename</button>
      </div>
      <div class="su-stats">
        <span><span class="stat-label">HP</span>${Math.round(stats.hp)}</span>
        <span><span class="stat-label">DMG</span>${Math.round(stats.damage)}</span>
        <span><span class="stat-label">SPD</span>${Math.round(stats.speed)}</span>
        <span><span class="stat-label">Dodge</span>${Math.round(stats.dodge * 100)}%</span>
        <span><span class="stat-label">Reflect</span>${Math.round(stats.reflect * 100)}%</span>
      </div>
      ${stats.heal ? `<div class="su-heal">${healText(stats)}</div>` : ''}
      ${unit.instanceMods.length ? `<div class="su-mods">${unit.instanceMods.map((id) => getMod(id).name).join(', ')}</div>` : ''}
    `;
    card.querySelector('.rc-rename-btn').addEventListener('click', () => onRename(unit, `${type.name} #${unit.uid}`, draw));
    els.shopRoster.appendChild(card);
  }
}

function renderActiveTrinkets(gameState) {
  els.activeTrinkets.innerHTML = '';
  for (const id of gameState.trinkets) {
    const trinket = getTrinket(id);
    if (!trinket) continue;
    const chip = document.createElement('div');
    chip.className = 'trinket-chip';
    chip.title = trinket.description;
    chip.textContent = trinket.name;
    els.activeTrinkets.appendChild(chip);
  }
}

function renderShopTrinkets(gameState, onBuyTrinket, draw) {
  els.shopTrinkets.innerHTML = '';
  if (gameState.shopTrinketOffers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = gameState.trinkets.length > 0 ? 'No new trinkets this visit.' : 'No trinkets available.';
    els.shopTrinkets.appendChild(empty);
    return;
  }
  for (const trinket of gameState.shopTrinketOffers) {
    const card = document.createElement('div');
    card.className = 'shop-card trinket-card';
    card.innerHTML = `
      <div class="sc-name">${trinket.name}</div>
      <div class="sc-desc">${trinket.description}</div>
      <div class="sc-cost">${trinket.cost} gold</div>
      <button class="btn btn-small">Acquire</button>
    `;
    const btn = card.querySelector('button');
    btn.disabled = gameState.currency < trinket.cost;
    btn.addEventListener('click', () => onBuyTrinket(trinket, draw));
    els.shopTrinkets.appendChild(card);
  }
}

function renderShopUnitOffers(gameState, onRecruit, draw) {
  els.shopUnits.innerHTML = '';
  for (const offer of gameState.shopUnitOffers) {
    const type = UNIT_TYPES[offer.typeId];
    const modNames = offer.mods.map((id) => getMod(id).name).join(', ');
    const limited = offer.tier > 1;
    const purchased = limited && gameState.purchasedThisVisit.has(offer.offerId);
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="sc-name">${type.name}<span class="tier-badge" style="background:${offer.tierColor}">${offer.tierLabel}</span></div>
      <div class="sc-desc">${type.description}${modNames ? `<div class="sc-premods">Comes with: ${modNames}</div>` : ''}</div>
      <div class="sc-scope">${limited ? '1 per visit' : 'No limit'}</div>
      <div class="sc-cost">${offer.cost} gold</div>
      <button class="btn btn-small">${purchased ? 'Recruited' : 'Recruit'}</button>
    `;
    const btn = card.querySelector('button');
    btn.disabled = purchased || !gameState.canRecruit(offer);
    btn.addEventListener('click', () => onRecruit(offer, draw));
    els.shopUnits.appendChild(card);
  }
}

export function renderShopScreen(gameState, rewardText, onBuy, onRecruit, onBuyTrinket, onRename) {
  els.shopTitle.textContent = rewardText;
  const draw = () => {
    renderShopRoster(gameState, onRename, draw);
    renderActiveTrinkets(gameState);
    renderShopUnitOffers(gameState, onRecruit, draw);
    renderShopTrinkets(gameState, onBuyTrinket, draw);
    els.shopCards.innerHTML = '';
    for (const mod of gameState.shopModOffers) {
      const purchased = gameState.purchasedThisVisit.has(mod.id);
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="sc-name">${mod.name}<span class="tier-badge" style="background:${mod.tierColor}">${mod.tierLabel}</span></div>
        <div class="sc-desc">${mod.description}</div>
        <div class="sc-scope">${mod.scope === 'roster' ? 'Whole roster' : 'Single unit'}</div>
        <div class="sc-cost">${mod.cost} gold</div>
        <button class="btn btn-small">${purchased ? 'Purchased' : 'Buy'}</button>
      `;
      const buyBtn = card.querySelector('button');
      buyBtn.disabled = purchased || !gameState.canPurchase(mod);
      buyBtn.addEventListener('click', () => onBuy(mod, draw));
      els.shopCards.appendChild(card);
    }
  };
  draw();
  return draw;
}

export function promptModTarget(gameState, mod, onPick) {
  const alive = gameState.aliveRoster();
  els.modTargetName.textContent = mod.name;
  els.modTargetList.innerHTML = '';
  for (const unit of alive) {
    const type = UNIT_TYPES[unit.typeId];
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = unit.customName || `${type.name} #${unit.uid}`;
    btn.onclick = () => {
      els.modal.classList.add('hidden');
      onPick(unit.uid);
    };
    els.modTargetList.appendChild(btn);
  }
  els.modal.classList.remove('hidden');
  els.btnCancelModTarget.onclick = () => els.modal.classList.add('hidden');
}

export function renderGameOverScreen(gameState, reason) {
  els.gameoverTitle.textContent = gameState.basesCleared > 0 ? 'Run Over' : 'Defeated';
  els.gameoverReason.textContent = reason;
  els.gameoverScore.textContent = `Bases cleared: ${gameState.basesCleared}`;
}

export function bindTopLevelButtons({ onStart, onContinueShop, onRestart }) {
  document.getElementById('btn-start-run').onclick = onStart;
  els.btnContinueShop.onclick = onContinueShop;
  els.btnRestart.onclick = onRestart;
}
