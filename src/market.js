// src/market.js
import { state, TYPES, currentYear } from './state.js';
import { updateTop, renderOwned, note } from './ui.js';

// ---------- Hjälp ----------
const kr = (n) => Number(n || 0).toLocaleString('sv-SE') + ' kr';
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rid = () => Math.random().toString(36).slice(2, 10);

// Safe access till en typ
function getType(tid) {
  return TYPES?.[tid] || { name: 'Fastighet', ppu: 12_000, minU: 6, maxU: 40 };
}

// Grundmodell: pris ≈ ppu * units * marknad * kond.faktor
function calcPrice({ tid, units, cond, central }) {
  const t = getType(tid);
  const ppu = Number(t.ppu ?? 12_000);            // pris per lägenhet som default
  const m = Number(state.market ?? 1);
  const k = 0.9 + (Number(cond ?? 5) / 10) * 0.4; // 0.9–1.3 ungefär
  const c = central ? 1.15 : 1.0;
  return Math.round(ppu * Number(units || 1) * m * k * c / 1000) * 1000;
}

// ---------- Offertgenerering ----------
// Du kan tweaka typkatalogen här om dina TYPES saknar fält.
function randomOffer() {
  // Välj en tid nyckel slumpat
  const tids = Object.keys(TYPES || {});
  const tid = tids.length ? tids[rnd(0, tids.length - 1)] : 'miljon';
  const t = getType(tid);

  const units = rnd(Number(t.minU ?? 6), Number(t.maxU ?? 60));
  const cond  = rnd(4, 9);
  const central = Math.random() < 0.35;

  const off = {
    id: rid(),
    tid,
    name: t.name || 'Fastighet',
    units,
    cond,
    central,
  };
  off.price = calcPrice(off);
  off.basePrice = off.price;
  return off;
}

function generateOffers(n = 6) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(randomOffer());
  return arr;
}

// ---------- Publika API:n ----------

// Skapa nytt utbud om året ändrats eller saknas
export function ensureMarketForThisYear() {
  const y = Number(currentYear?.() ?? state.year ?? 1);
  state.marketYear = state.marketYear ?? 0;
  state.offers = state.offers || [];

  if (state.marketYear !== y || !state.offers.length) {
    state.offers = generateOffers(6);
    state.marketYear = y;
    note?.(`Nytt marknadsutbud för år ${y}.`);
  }
}

// Ta bort offert efter köp
export function removeOfferById(id) {
  if (!id) return;
  state.offers = (state.offers || []).filter(o => o.id !== id);
  // Uppdatera om modalen är öppen
  if (document.getElementById('marketModal')?.style?.display === 'flex') {
    renderMarket();
  }
}

// Själva köpet
export function acceptOffer(off, withLoan = false) {
  if (!off) return { ok: false, reason: 'Ingen offert' };

  const price = Number(off.price ?? off.basePrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) return { ok:false, reason:'Felaktigt pris' };

  state.cash = Number(state.cash ?? 0);

  if (withLoan) {
    // 30% kontantinsats, resten får du bygga ut som lånlogik
    const down = Math.round(price * 0.30);
    if (state.cash < down) return { ok:false, reason: `Kontantinsats saknas (${kr(down)})` };
    state.cash -= down;
    // TODO: lägg till lånepost / ränta / amort (state.debt += price - down)
  } else {
    if (state.cash < price) return { ok:false, reason: `Otillräcklig kassa (${kr(price)})` };
    state.cash -= price;
  }

  // Skapa det vi äger
  const bought = {
    ...off,
    price,
    basePrice: price,
    baseUnits: Number(off.units || 0),
    baseCond: Number(off.cond ?? 5),
    baseMarket: Number(state.market ?? 1),
    boughtAtYear: Number(currentYear?.() ?? state.year ?? 1),
    loanSeed: !!withLoan,
  };

  state.owned = state.owned || [];
  state.owned.push(bought);

  // Plocka bort från utbudet
  removeOfferById(off.id);

  // UI
  updateTop?.();
  renderOwned?.();

  const tname = getType(off.tid).name || off.name || 'Fastighet';
  note?.(`Köpt: ${tname} (${off.units ?? '?'} lgh) för ${kr(price)}${withLoan ? ' (med lån)' : ''}.`);

  return { ok: true };
}

// ---------- Modal / UI ----------

export function openMarket() {
  ensureMarketForThisYear();

  const modal = document.getElementById('marketModal');
  if (!modal) return console.warn('[market] marketModal saknas i DOM');

  // Bygg innehållet
  modal.innerHTML = `
    <div class="box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
        <h3 style="margin:0">Fastighetsmarknad — år ${currentYear?.() ?? state.year ?? 1}</h3>
        <button class="btn mini" id="marketCloseBtn">Stäng</button>
      </div>
      <div class="offers" id="offersWrap"></div>
    </div>
  `;

  renderMarket(); // fyll korten

  // Stäng
  modal.style.display = 'flex';
  modal.querySelector('#marketCloseBtn')?.addEventListener('click', closeMarket, { once:true });
}

export function closeMarket() {
  const modal = document.getElementById('marketModal');
  if (modal) modal.style.display = 'none';
}

// Rendera alla offers i modalen
export function renderMarket() {
  const wrap = document.getElementById('offersWrap');
  if (!wrap) return;
  const offers = state.offers || [];

  if (!offers.length) {
    wrap.innerHTML = `<div class="meta">Inga erbjudanden just nu — prova “Nästa år”.</div>`;
    return;
  }

  wrap.innerHTML = offers.map(o => {
    const t = getType(o.tid);
    const condTxt = (typeof o.cond === 'number') ? `${o.cond}/10` : (o.cond ?? '-');
    return `
      <div class="offer" data-id="${o.id}">
        <div class="small ${o.tid || ''}" title="${t.name || ''}"></div>
        <div>
          <div style="font-weight:800">${t.name ?? 'Fastighet'} — ${o.units ?? '?'} lgh</div>
          <div class="meta">Skick: ${condTxt} • Lägen: ${o.units ?? '-'} • Central: ${o.central ? 'Ja' : 'Nej'}</div>
          <div class="meta">Marknadsfaktor: ${(state.market ?? 1).toFixed?.(2)}×</div>
        </div>
        <div style="display:grid;gap:6px;justify-items:end">
          <div style="font-weight:900">${kr(o.price)}</div>
          <button class="btn mini buy-cash">Köp kontant</button>
          <button class="btn mini alt buy-loan">Köp med lån</button>
        </div>
      </div>
    `;
  }).join('');

  // Wire:a knappar
  wrap.querySelectorAll('.offer').forEach(card => {
    const id = card.getAttribute('data-id');
    const off = (state.offers || []).find(o => o.id === id);
    if (!off) return;

    card.querySelector('.buy-cash')?.addEventListener('click', () => {
      const r = acceptOffer(off, false);
      if (!r.ok) alert(r.reason);
    });

    card.querySelector('.buy-loan')?.addEventListener('click', () => {
      const r = acceptOffer(off, true);
      if (!r.ok) alert(r.reason);
    });
  });
}

// ---------- Exportera globalt (för knappar i HTML / andra moduler) ----------
Object.assign(window, {
  openMarket,
  closeMarket,
  ensureMarketForThisYear,
  acceptOffer,
  removeOfferById,
});
