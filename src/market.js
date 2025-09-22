// src/market.js
import {
  state, TYPES, CONDITIONS, currentYear,
  pick, randInt, uuid, condFactor
} from './state.js';
import { updateTop, renderOwned, note } from './ui.js';

// ---------- Hjälp ----------
const kr = (n) => Number(n || 0).toLocaleString('sv-SE') + ' kr';

// Pris = slump i type.price-intervallet * marknad * lägesmult * kond.mult
function calcPrice(tid, cond, central) {
  const t = TYPES[tid] || {};
  const [pmin, pmax] = t.price || [10_000_000, 20_000_000];
  const base = randInt(Number(pmin), Number(pmax));
  const marketMul = Number(state.market ?? 1.0);
  const locMul = central ? Number(t.centralMult ?? 1) : Number(t.suburbMult ?? 1);
  const cMul = condFactor(cond); // från state.js: ny=1.0, sliten=0.85, forfallen=0.7
  const price = Math.round(base * marketMul * locMul * cMul / 1000) * 1000;
  return Math.max(price, 0);
}

function makeOffer(tid, cond, central) {
  const t = TYPES[tid] || {};
  const [umin, umax] = t.units || [6, 18];
  const units = randInt(Number(umin), Number(umax));
  const price = calcPrice(tid, cond, central);
  return {
    id: uuid(),
    tid,
    name: t.name || 'Fastighet',
    units,
    cond,                // 'ny' | 'sliten' | 'forfallen'
    central: !!central,
    price,
    // basfält som UI/ekonomi kan använda senare
    basePrice: price,
    baseCond: cond,
    baseUnits: units,
    baseMarket: Number(state.market ?? 1),
  };
}

// ---------- Utbud / år ----------
export function generateYearMarket(n = 6) {
  const tids = Object.keys(TYPES || {});
  const arr = [];
  for (let i = 0; i < n; i++) {
    const tid = tids.length ? pick(tids) : 'miljon';
    const cond = pick(CONDITIONS);        // 'ny'/'sliten'/'forfallen'
    const central = Math.random() < 0.5;  // 50% central
    arr.push(makeOffer(tid, cond, central));
  }
  state.marketPool = arr.sort((a,b) => a.price - b.price);
  state.marketYear = currentYear(); // din currentYear() = state.month
}

export function ensureMarketForThisYear() {
  if (state.marketYear !== currentYear() || !(state.marketPool || []).length) {
    generateYearMarket(6);
    note?.(`Nytt marknadsutbud för år ${currentYear()}.`);
  }
}

export function removeOfferById(id) {
  state.marketPool = (state.marketPool || []).filter(o => o.id !== id);
}

// ---------- Köp ----------
export function acceptOffer(off, withLoan = false) {
  if (!off) return { ok:false, reason:'Ingen offert' };

  const price = Number(off.price ?? off.basePrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) return { ok:false, reason:'Felaktigt pris' };

  state.cash = Number(state.cash ?? 0);

  if (withLoan) {
    const down = Math.round(price * 0.30); // 30% kontantinsats
    if (state.cash < down) return { ok:false, reason:`Behöver kontantinsats: ${kr(down)}` };
    state.cash -= down;
    // Här kan du lägga till lånlogik (state.loans push, ev. state.debt om du använder det)
  } else {
    if (state.cash < price) return { ok:false, reason:`Otillräcklig kassa: ${kr(price)}` };
    state.cash -= price;
  }

  // Lägg i owned
  const b = {
    id: uuid(),
    tid: off.tid,
    units: off.units,
    cond: off.cond,
    central: !!off.central,
    basePrice: price,
    baseCond: off.cond,
    baseUnits: off.units,
    baseMarket: Number(state.market ?? 1),
    boughtAtYear: currentYear(),
  };
  state.owned = state.owned || [];
  state.owned.push(b);

  // Ta bort från marknaden
  removeOfferById(off.id);

  // UI
  updateTop?.();
  renderOwned?.();

  note?.(`Köpt: ${off.name} (${off.units} lgh) för ${kr(price)}${withLoan ? ' (med lån)' : ''}.`);
  return { ok:true };
}

// ---------- Modal-UI ----------
const $ = (id) => document.getElementById(id);

function renderOffersTo(wrap) {
  const pool = state.marketPool || [];
  if (!pool.length) {
    wrap.innerHTML = `<div class="meta">Inga erbjudanden just nu — prova “Nästa år”.</div>`;
    return;
  }

  wrap.innerHTML = pool.map(o => {
    return `
      <div class="offer" data-id="${o.id}">
        <div class="small ${TYPES[o.tid]?.cls || ''}" title="${o.name}"></div>
        <div>
          <div style="font-weight:800">${o.name} — ${o.units} lgh ${o.central ? '• Central' : ''}</div>
          <div class="meta">Skick: ${o.cond}</div>
          <div class="meta">Pris: <b>${kr(o.price)}</b> • Marknad: ${(state.market ?? 1).toFixed?.(2)}×</div>
        </div>
        <div style="display:grid;gap:6px;justify-items:end">
          <button class="btn mini buy-cash">Köp kontant</button>
          <button class="btn mini alt buy-loan">Köp med lån</button>
        </div>
      </div>
    `;
  }).join('');

  // Wire knappar för varje kort
  wrap.querySelectorAll('.offer').forEach(card => {
    const id = card.getAttribute('data-id');
    const off = (state.marketPool || []).find(o => o.id === id);
    if (!off) return;
    card.querySelector('.buy-cash')?.addEventListener('click', () => {
      const r = acceptOffer(off, false);
      if (!r.ok) alert(r.reason);
      refresh();
    });
    card.querySelector('.buy-loan')?.addEventListener('click', () => {
      const r = acceptOffer(off, true);
      if (!r.ok) alert(r.reason);
      refresh();
    });
  });

  function refresh() {
    // Rita om listan och topp/ägda efter köp
    updateTop?.();
    renderOwned?.();
    renderOffersTo(wrap);
  }
}

export function openMarket() {
  ensureMarketForThisYear();
  const modal = $('#marketModal');
  if (!modal) return console.warn('[market] #marketModal saknas');

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
        <h3 style="margin:0">Fastighetsmarknad — år ${currentYear()}</h3>
        <button class="btn mini" id="marketCloseBtn">Stäng</button>
      </div>
      <div class="offers" id="offersWrap"></div>
    </div>
  `;
  modal.querySelector('#marketCloseBtn')?.addEventListener('click', closeMarket, { once:true });

  const wrap = modal.querySelector('#offersWrap');
  renderOffersTo(wrap);
}

export function closeMarket() {
  const modal = $('#marketModal');
  if (modal) modal.style.display = 'none';
}

// ---------- Globalt för HTML/console ----------
Object.assign(window, {
  openMarket, closeMarket,
  ensureMarketForThisYear, acceptOffer, removeOfferById
});
