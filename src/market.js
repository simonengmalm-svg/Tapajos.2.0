// src/market.js
import {
  state, TYPES, CONDITIONS,
  pick, randInt, uuid, condFactor, condMaintMult
} from './state.js';
import { updateTop, renderOwned, note } from './ui.js';

/* ============================
   Hjälpare
   ============================ */
const kr = (n) => Number(n || 0).toLocaleString('sv-SE') + ' kr';

// Säkert ”nuvarande år” – funkar med både month (din primära) och year
function YEAR_NOW() {
  const m = Number(state.month ?? NaN);
  const y = Number(state.year  ?? NaN);
  if (Number.isFinite(m) && m > 0) return m;
  if (Number.isFinite(y) && y > 0) return y;
  return 1;
}

/**
 * Pris = slump inom TYPE.price * marknad * lägesfaktor * konditionsfaktor
 * (Enkelt och stabilt mot din TYPE-modell.)
 */
function calcPrice(tid, units, cond, central) {
  const t = TYPES[tid] || {};
  const [pmin, pmax] = t.price || [10_000_000, 20_000_000];
  const base       = randInt(Number(pmin), Number(pmax));
  const marketMul  = Number(state.market ?? 1.0);
  const locMul     = central ? Number(t.centralMult ?? 1.0) : Number(t.suburbMult ?? 1.0);
  const condMul    = Number(condFactor?.(cond) ?? 1.0); // ny=1.0, sliten=0.85, forfallen=0.7
  const priced     = Math.round(base * marketMul * locMul * condMul / 1000) * 1000;
  return Math.max(priced, 0);
}

function makeOffer(tid, cond, central) {
  const t = TYPES[tid] || {};
  const [umin, umax] = t.units || [6, 18];
  const units        = randInt(Number(umin), Number(umax));
  const price        = calcPrice(tid, units, cond, central);

  // lite ekonomi-info för ev. framtida bruk
  const sqm           = Number(t.sqmPerUnit ?? 60) * units;
  const grossRentYr   = sqm * Number(t.rentPerSqmYr ?? 1400);
  const maintYr       = units * Number(t.maintUnit ?? 2000) * Number(condMaintMult?.(cond) ?? 1);

  return {
    id: uuid(),
    tid,
    name: t.name || 'Fastighet',
    units,
    cond,                 // 'ny' | 'sliten' | 'forfallen'
    central: !!central,

    price,
    basePrice: price,

    // referenser/stämpling
    baseUnits: units,
    baseCond: cond,
    baseMarket: Number(state.market ?? 1),
    yearOffered: YEAR_NOW(),

    // ekonomi-info (valfritt)
    rentYr: Math.round(grossRentYr),
    maintYr: Math.round(maintYr),
  };
}

/* ============================
   Generering & årslogik
   ============================ */
export function generateYearMarket(n = 6) {
  if (!Array.isArray(state.marketPool)) state.marketPool = [];
  const tids = Object.keys(TYPES || {});
  const arr = [];
  for (let i = 0; i < n; i++) {
    const tid = tids.length ? pick(tids) : 'miljon';
    const cond = pick(CONDITIONS);        // 'ny' | 'sliten' | 'forfallen'
    const central = Math.random() < 0.5;  // 50% central
    arr.push(makeOffer(tid, cond, central));
  }
  state.marketPool = arr.sort((a, b) => a.price - b.price);
  state.marketYear = YEAR_NOW();
}

export function ensureMarketForThisYear() {
  if (!Array.isArray(state.marketPool)) state.marketPool = [];
  if (typeof state.marketYear !== 'number') state.marketYear = 0;

  const now = YEAR_NOW();
  const needNew = state.marketYear !== now || state.marketPool.length === 0;

  if (needNew) {
    generateYearMarket(6);
    try { note?.(`Nytt marknadsutbud för år ${YEAR_NOW()}.`); } catch {}
  }
}

export function removeOfferById(id) {
  state.marketPool = (state.marketPool || []).filter(o => o.id !== id);
}

/* ============================
   Köp
   ============================ */
export function acceptOffer(off, withLoan = false) {
  if (!off) return { ok: false, reason: 'Ingen offert' };

  const price = Number(off.price ?? off.basePrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) return { ok:false, reason:'Felaktigt pris' };

  state.cash = Number(state.cash ?? 0);

  if (withLoan) {
    const down = Math.round(price * 0.30); // 30% kontantinsats
    if (state.cash < down) return { ok:false, reason:`Behöver kontantinsats: ${kr(down)}` };
    state.cash -= down;

    // (frivilligt) lägg en enkel lånepost för framtida logik
    try {
      state.loans = state.loans || [];
      state.loans.push({
        id: uuid(),
        principal: Math.round(price - down),
        rate: Number(state.rate ?? 0.03),
        year: YEAR_NOW(),
        propRef: off.id,
      });
    } catch {}
  } else {
    if (state.cash < price) return { ok:false, reason:`Otillräcklig kassa: ${kr(price)}` };
    state.cash -= price;
  }

  // Lägg i owned
  const bought = {
    id: uuid(),
    tid: off.tid,
    units: off.units,
    cond: off.cond,
    central: !!off.central,

    basePrice: price,
    baseCond: off.cond,
    baseUnits: off.units,
    baseMarket: Number(state.market ?? 1),

    rentYr: off.rentYr,
    maintYr: off.maintYr,

    boughtAtYear: YEAR_NOW(),
    loanSeed: !!withLoan,
  };
  state.owned = state.owned || [];
  state.owned.push(bought);

  // Ta bort från marknaden
  removeOfferById(off.id);

  // UI
  updateTop?.();
  renderOwned?.();

  note?.(`Köpt: ${off.name} (${off.units} lgh) för ${kr(price)}${withLoan ? ' (med lån)' : ''}.`);
  return { ok: true };
}

/* ============================
   Modal / UI
   ============================ */
const $ = (id) => document.getElementById(id);

function offerCard(o) {
  const type = TYPES[o.tid] || {};
  return `
    <div class="offer" data-id="${o.id}">
      <div class="small ${type.cls || ''}" title="${o.name}"></div>
      <div>
        <div style="font-weight:800">${o.name} — ${o.units} lgh ${o.central ? '• Central' : ''}</div>
        <div class="meta">Skick: ${o.cond}</div>
        <div class="meta">Hyra (brutto/år): ${kr(o.rentYr ?? 0)} • Drift/Underhåll: ${kr(o.maintYr ?? 0)}</div>
        <div class="meta">Pris: <b>${kr(o.price)}</b> • Marknad: ${(state.market ?? 1).toFixed?.(2)}×</div>
      </div>
      <div style="display:grid;gap:6px;justify-items:end">
        <button class="btn mini buy-cash">Köp kontant</button>
        <button class="btn mini alt buy-loan">Köp med lån</button>
      </div>
    </div>
  `;
}

function renderOffersInto(container) {
  const pool = state.marketPool || [];
  if (!pool.length) {
    container.innerHTML = `<div class="meta">Inga erbjudanden just nu — prova “Nästa år”.</div>`;
    return;
  }
  container.innerHTML = pool.map(offerCard).join('');

  // Wire knappar
  container.querySelectorAll('.offer').forEach(card => {
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
    updateTop?.();
    renderOwned?.();
    renderOffersInto(container);
  }
}

export function openMarket() {
  ensureMarketForThisYear();
  if (!Array.isArray(state.marketPool) || state.marketPool.length === 0) {
    // sista säkerhetsnätet
    generateYearMarket(6);
  }

  const modal = $('#marketModal');
  if (!modal) return console.warn('[market] #marketModal saknas i DOM');

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
        <h3 style="margin:0">Fastighetsmarknad — år ${YEAR_NOW()}</h3>
        <button class="btn mini" id="marketCloseBtn">Stäng</button>
      </div>
      <div class="offers" id="offersWrap"></div>
    </div>
  `;

  modal.querySelector('#marketCloseBtn')?.addEventListener('click', closeMarket, { once:true });
  const wrap = modal.querySelector('#offersWrap');
  renderOffersInto(wrap);
}

export function closeMarket() {
  const modal = $('#marketModal');
  if (modal) modal.style.display = 'none';
}

/* ============================
   Bootstrap: säkerställ utbud vid laddning
   ============================ */
try {
  if (!Array.isArray(state.marketPool) || state.marketPool.length === 0) {
    generateYearMarket(6);
    console.info('[market] bootstrapped pool =', state.marketPool.length, 'år =', YEAR_NOW());
  }
} catch (e) {
  console.warn('[market] bootstrap failed', e);
}

/* ============================
   Exponera globalt
   ============================ */
Object.assign(window, {
  openMarket,
  closeMarket,
  ensureMarketForThisYear,
  acceptOffer,
  removeOfferById,
});
