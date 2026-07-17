import { UNIT_TYPES, createStartingRoster, rollUnitOffers } from '../data/units.js';
import { getMod, rollModOffers } from '../data/mods.js';
import { rollTrinketOffers } from '../data/trinkets.js';
import { STARTING_LIFE_POOL, generateBase, MAX_SPEED_MULTIPLIER } from '../data/balance.js';

const UNIT_OFFER_COUNT = 3;
const TRINKET_OFFER_COUNT = 2;
const THORNBOUND_IDOL_REFLECT = 0.08;

export class GameState {
  constructor() {
    // A UI preference, not run state - deliberately outside reset() so it
    // survives "Play Again" instead of reverting to unchecked every run.
    this.autoBuyRosterMods = false;
    this.reset();
  }

  reset() {
    this.roster = createStartingRoster();
    this.nextUid = this.roster.length + 1;
    this.globalMods = [];
    this.trinkets = [];
    this.currency = 0;
    this.baseIndex = 1;
    this.waveIndex = 1;
    this.livesLost = 0;
    this.lifePoolMax = STARTING_LIFE_POOL;
    this.basesCleared = 0;
    this.totalWavesFought = 0;
    this.totalGoldEarned = 0;
    this.runOver = false;
    this.runOverReason = '';
    this.base = generateBase(this.baseIndex);
    this.purchasedThisVisit = new Set();
    this.shopModOffers = [];
    this.shopUnitOffers = [];
    this.shopTrinketOffers = [];
    this.unitOrder = [];
  }

  startNewBase() {
    this.waveIndex = 1;
    this.livesLost = 0;
    this.base = generateBase(this.baseIndex, this.base.theme);
  }

  beginShopVisit() {
    this.purchasedThisVisit = new Set();
    this.shopModOffers = rollModOffers(Math.random);
    this.shopUnitOffers = rollUnitOffers(Math.random, UNIT_OFFER_COUNT);
    this.shopTrinketOffers = rollTrinketOffers(Math.random, this.trinkets, TRINKET_OFFER_COUNT);
    if (this.autoBuyRosterMods) this.autoPurchaseRosterMods();
  }

  // Buys every affordable roster-wide mod offer rolled this visit, in
  // rolled order, stopping naturally once currency runs out. Respects the
  // normal 1-per-family-per-visit cap via applyMod/canPurchase.
  autoPurchaseRosterMods() {
    for (const mod of this.shopModOffers) {
      if (mod.scope !== 'roster') continue;
      if (this.canPurchase(mod)) this.applyMod(mod, null);
    }
  }

  aliveRoster() {
    return this.roster.filter((u) => u.alive);
  }

  // The player's remembered marching order, persisted across waves and
  // bases. Dead units drop out automatically; newly recruited ones are
  // appended at the end the first time they're seen, then that becomes
  // part of the remembered order too.
  getOrderedAliveUids() {
    const alive = this.aliveRoster();
    const aliveIds = new Set(alive.map((u) => u.uid));
    const ordered = this.unitOrder.filter((uid) => aliveIds.has(uid));
    const orderedSet = new Set(ordered);
    const missing = alive.filter((u) => !orderedSet.has(u.uid)).map((u) => u.uid);
    this.unitOrder = [...ordered, ...missing];
    return this.unitOrder;
  }

  setUnitOrder(orderedUids) {
    this.unitOrder = orderedUids;
  }

  livesRemaining() {
    return this.lifePoolMax - this.livesLost;
  }

  recordUnitLost() {
    this.livesLost++;
  }

  recordWaveFought() {
    this.totalWavesFought++;
  }

  earnCurrency(amount) {
    this.currency += amount;
    this.totalGoldEarned += amount;
  }

  hasTrinket(id) {
    return this.trinkets.includes(id);
  }

  effectiveStats(unit) {
    const type = UNIT_TYPES[unit.typeId];
    const stats = { ...type.baseStats, dodge: 0, reflect: 0, regen: type.baseStats.regen || 0 };
    const modIds = [...unit.instanceMods, ...this.globalMods];
    for (const id of modIds) {
      const mod = getMod(id);
      if (!mod) continue;
      switch (mod.stat) {
        case 'speedPct':
          stats.speed *= 1 + mod.value;
          break;
        case 'hp':
          stats.hp += mod.value;
          break;
        case 'damage':
          stats.damage += mod.value;
          break;
        case 'dodge':
          stats.dodge += mod.value;
          break;
        case 'reflect':
          stats.reflect += mod.value;
          break;
        case 'regen':
          stats.regen += mod.value;
          break;
      }
    }
    if (this.hasTrinket('thornbound_idol')) stats.reflect += THORNBOUND_IDOL_REFLECT;
    stats.dodge = Math.min(stats.dodge, 0.75);
    stats.reflect = Math.min(stats.reflect, 1);
    stats.speed = Math.min(stats.speed, type.baseStats.speed * MAX_SPEED_MULTIPLIER);
    return stats;
  }

  canPurchase(mod) {
    return this.currency >= mod.cost && !this.purchasedThisVisit.has(mod.id);
  }

  applyMod(mod, targetUid) {
    if (!this.canPurchase(mod)) return false;
    if (mod.scope === 'roster') {
      this.globalMods.push(mod.id);
    } else {
      const unit = this.roster.find((u) => u.uid === targetUid && u.alive);
      if (!unit) return false;
      unit.instanceMods.push(mod.id);
    }
    this.currency -= mod.cost;
    this.purchasedThisVisit.add(mod.id);
    return true;
  }

  canRecruit(offer) {
    const limited = offer.tier > 1;
    return this.currency >= offer.cost && !(limited && this.purchasedThisVisit.has(offer.offerId));
  }

  purchaseUnit(offer) {
    if (!this.canRecruit(offer)) return false;
    this.roster.push({
      uid: this.nextUid++,
      typeId: offer.typeId,
      alive: true,
      instanceMods: [...offer.mods],
      customName: null,
    });
    this.currency -= offer.cost;
    if (offer.tier > 1) this.purchasedThisVisit.add(offer.offerId);
    return true;
  }

  renameUnit(uid, name) {
    const unit = this.roster.find((u) => u.uid === uid);
    if (!unit) return;
    const trimmed = (name || '').trim().slice(0, 20);
    unit.customName = trimmed || null;
  }

  purchaseTrinket(trinket) {
    if (this.currency < trinket.cost || this.hasTrinket(trinket.id)) return false;
    this.trinkets.push(trinket.id);
    this.currency -= trinket.cost;
    this.shopTrinketOffers = this.shopTrinketOffers.filter((t) => t.id !== trinket.id);
    return true;
  }
}
