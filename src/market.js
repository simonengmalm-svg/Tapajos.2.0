import { state, pick, randInt, uuid, CONDITIONS, TYPES, currentYear } from './state.js';
import { priceOf } from './economy.js';
import { initSocial } from './social.js';

export function makeOffer(tid, cond, central){
  const price = priceOf(tid, cond, central);
  const [umin, umax] = TYPES[tid].units;
  const units = randInt(umin, umax);
  return { id: uuid(), tid, cond, central, price, units };
}

export function generateYearMarket(n=4){
  const keys = Object.keys(TYPES);
  const arr = [];
  for (let i=0;i<n;i++){
    const tid = pick(keys);
    const cond = pick(CONDITIONS);
    const central = Math.random() < 0.5;
    arr.push(makeOffer(tid, cond, central));
  }
  state.marketPool = arr.sort((a,b)=>a.price-b.price);
  state.marketYear = currentYear();
}

export function ensureMarketForThisYear(){
  if (state.marketYear !== currentYear()) generateYearMarket(4);
}

export function removeOfferById(id){
  state.marketPool = state.marketPool.filter(o=>o.id!==id);
}

export function acceptOffer(off, withLoan=false){
  if (!off) return false;
  if (withLoan){
    const down = Math.round(off.price * 0.30);
    if (state.cash < down) return { ok:false, reason: 'Behöver kontantinsats' };
    state.cash -= down;
    const b = { ...off, loanSeed: true };
    initSocial(b);
    b.basePrice=off.price; b.baseCond=off.cond; b.baseMarket=state.market; b.baseUnits=off.units;
    state.owned.push(b);
  } else {
    if (state.cash < off.price) return { ok:false, reason: 'Otillräcklig kassa' };
    state.cash -= off.price;
    const b = { ...off };
    initSocial(b);
    b.basePrice=off.price; b.baseCond=off.cond; b.baseMarket=state.market; b.baseUnits=off.units;
    state.owned.push(b);
  }
  removeOfferById(off.id);
  return { ok:true };
}

// --- lägg till i market.js ---
export function openMarket() {
  ensureMarketForThisYear();
  const m = document.getElementById('marketModal');
  if (m) m.style.display = 'flex';
}

export function closeMarket() {
  const m = document.getElementById('marketModal');
  if (m) m.style.display = 'none';
}
// --- slut på tillägg ---

Object.assign(window, {
  openMarket,
  closeMarket,
});
