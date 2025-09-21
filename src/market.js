// src/market.js
import { state, pick, randInt, uuid, CONDITIONS, TYPES, currentYear } from './state.js';
import { priceOf } from './economy.js';
import { initSocial } from './social.js';
import { updateTop, renderOwned, note } from './ui.js';

// ----- Datadel -----
export function makeOffer(tid, cond, central){
  const price = priceOf(tid, cond, central);
  const [umin, umax] = TYPES[tid].units;
  const units = randInt(umin, umax);
  return { id: uuid(), tid, cond, central, price, units };
}

export function generateYearMarket(n=4){
  const keys = Object.keys(TYPES);
  const arr = [];
  for (let i = 0; i < n; i++){
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
  state.marketPool = (state.marketPool || []).filter(o => o.id !== id);
}

export function acceptOffer(off, withLoan=false){
  if (!off) return { ok:false, reason:'Ingen offert' };
  if (withLoan){
    const down = Math.round(off.price * 0.30);
    if ((state.cash ?? 0) < down) return { ok:false, reason:'Behöver kontantinsats' };
    state.cash = (state.cash ?? 0) - down;
    const b = { ...off, loanSeed: true };
    initSocial(b);
    b.basePrice=off.price; b.baseCond=off.cond; b.baseMarket=state.market; b.baseUnits=off.units;
    state.owned = state.owned || [];
    state.owned.push(b);
  } else {
    if ((state.cash ?? 0) < off.price) return { ok:false, reason:'Otillräcklig kassa' };
    state.cash = (state.cash ?? 0) - off.price;
    const b = { ...off };
    initSocial(b);
    b.basePrice=off.price; b.baseCond=off.cond; b.baseMarket=state.market; b.baseUnits=off.units;
    state.owned = state.owned || [];
    state.owned.push(b);
  }
  removeOfferById(off.id);
  return { ok:true };
}

// ----- UI-del -----
const $ = (id) => document.getElementById(id);
function fmt(n){ try { return Number(n||0).toLocaleString('sv-SE'); } catch { return String(n); } }

function renderOffers(){
  ensureMarketForThisYear();
  const modal = $('#marketModal');
  if (!modal) return;

  const pool = state.marketPool || [];
  const wrap = document.createElement('div');
  wrap.className = 'box';
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
      <h3 style="margin:0">Fastighetsmarknad – År ${currentYear?.() ?? state.year ?? 1}</h3>
      <button class="btn" id="mktClose">Stäng</button>
    </div>
    ${pool.length ? `
      <div class="offers" id="offerList"></div>
    ` : `
      <div class="meta">Inga fler erbjudanden i år.</div>
    `}
  `;

  modal.innerHTML = ''; // rensa
  modal.appendChild(wrap);

  const list = wrap.querySelector('#offerList');
  if (list){
    pool.forEach(off=>{
      const tinfo = TYPES?.[off.tid];
      const card = document.createElement('div');
      card.className = 'offer';
      const condLabel = (typeof off.cond === 'number') ? `${off.cond}/10` : String(off.cond ?? '-');
      const needDown = Math.round(off.price * 0.30);

      const canCash = (state.cash ?? 0) >= off.price;
      const canLoan = (state.cash ?? 0) >= needDown;

      card.innerHTML = `
        <div class="small T-${tinfo?.code || off.tid} C-${(off.cond>=8?'ny':off.cond>=5?'sliten':'forfallen')}"></div>
        <div>
          <div style="font-weight:800">${tinfo?.name ?? off.tid} • ${off.units} lgh</div>
          <div class="meta">Skick: ${condLabel} • Central: ${off.central ? 'Ja' : 'Nej'}</div>
          <div class="meta">Pris: <b>${fmt(off.price)}</b> kr</div>
        </div>
        <div style="display:grid;gap:6px">
          <button class="btn mini" data-act="cash" data-id="${off.id}" ${canCash ? '' : 'disabled title="Otillräcklig kassa"'}>Köp kontant</button>
          <button class="btn mini" data-act="loan" data-id="${off.id}" ${canLoan ? '' : `disabled title="Behöver ${fmt(needDown)} i kontantinsats"`}>Köp med lån</button>
        </div>
      `;
      list.appendChild(card);
    });

    // klickhanterare på listan
    list.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const id  = btn.getAttribute('data-id');
      const off = (state.marketPool || []).find(o => o.id === id);
      if (!off) return;

      const res = acceptOffer(off, act === 'loan');
      if (!res.ok){
        note?.(res.reason || 'Köp misslyckades.');
        return;
      }

      note?.(`Köpt: ${TYPES?.[off.tid]?.name ?? off.tid} (${off.units} lgh) för ${fmt(off.price)} kr` + (act==='loan' ? ' (med lån)' : ''));
      updateTop?.();
      renderOwned?.();            // 🔑 rendera korten direkt
      renderOffers();             // rita om listan (offerten tas bort)
    }, { once: true }); // one-time listener; renderOffers binder om vid omritning
  }

  // stäng-knapp
  wrap.querySelector('#mktClose')?.addEventListener('click', closeMarket);
}

export function openMarket(){
  const modal = $('#marketModal');
  if (!modal) return;
  renderOffers();
  modal.style.display = 'flex';
}

export function closeMarket(){
  const modal = $('#marketModal');
  if (modal) modal.style.display = 'none';
}

// Exponera globalt för knappar i HTML
Object.assign(window, { openMarket, closeMarket });
