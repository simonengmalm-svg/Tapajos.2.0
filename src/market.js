// src/market.js
import { state, pick, randInt, uuid, CONDITIONS, TYPES, currentYear } from './state.js';
import { priceOf }   from './economy.js';
import { initSocial } from './social.js';
import { updateTop, renderOwned, note } from './ui.js';

/* ---------------------------
   Datamodell & generatorer
----------------------------*/

export function makeOffer(tid, cond, central){
  const price = priceOf(tid, cond, central);
  const [umin, umax] = TYPES[tid].units;
  const units = randInt(umin, umax);
  return { id: uuid(), tid, cond, central, price, units };
}

export function generateYearMarket(n = 4){
  const keys = Object.keys(TYPES);
  const arr = [];
  for (let i = 0; i < n; i++){
    const tid     = pick(keys);
    const cond    = pick(CONDITIONS);
    const central = Math.random() < 0.5;
    arr.push(makeOffer(tid, cond, central));
  }
  state.marketPool = arr.sort((a,b)=> a.price - b.price);
  state.marketYear = currentYear();
}

export function ensureMarketForThisYear(){
  if (state.marketYear !== currentYear()) generateYearMarket(4);
}

export function removeOfferById(id){
  state.marketPool = (state.marketPool || []).filter(o => o.id !== id);
}

/* ---------------------------
   Affärslogik – köp
----------------------------*/

export function acceptOffer(off, withLoan = false){
  if (!off) return { ok:false, reason:'Objekt saknas' };

  // Kontantinsats = 30% vid lån
  if (withLoan){
    const down = Math.round(off.price * 0.30);
    if ((state.cash || 0) < down) return { ok:false, reason:'Behöver kontantinsats' };

    state.cash = (state.cash || 0) - down;

    const b = { ...off, loanSeed:true };
    initSocial(b);
    b.basePrice  = off.price;
    b.baseCond   = off.cond;
    b.baseMarket = state.market;
    b.baseUnits  = off.units;

    state.owned = state.owned || [];
    state.owned.push(b);
  } else {
    if ((state.cash || 0) < off.price) return { ok:false, reason:'Otillräcklig kassa' };

    state.cash = (state.cash || 0) - off.price;

    const b = { ...off };
    initSocial(b);
    b.basePrice  = off.price;
    b.baseCond   = off.cond;
    b.baseMarket = state.market;
    b.baseUnits  = off.units;

    state.owned = state.owned || [];
    state.owned.push(b);
  }

  removeOfferById(off.id);
  return { ok:true };
}

/* ---------------------------
   UI – modal & rendering
----------------------------*/

function fmtKr(n){ try { return Number(n||0).toLocaleString('sv-SE') + ' kr'; } catch { return String(n) + ' kr'; } }
function byId(id){ return document.getElementById(id); }

function offerRow(off){
  const t = TYPES?.[off.tid];
  const name = t?.name ?? off.tid ?? 'Fastighet';
  const cond = (typeof off.cond === 'number') ? `${off.cond}/10` : (off.cond ?? '-');
  const central = off.central ? 'Ja' : 'Nej';

  return `
    <div class="market-row" data-id="${off.id}" style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#0f1b3a">
      <div>
        <div style="font-weight:700">${name} — ${off.units} lgh</div>
        <div style="opacity:.9">Skick: ${cond} • Central: ${central}</div>
        <div style="margin-top:4px">Pris: <b>${fmtKr(off.price)}</b></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn buy-cash"  data-id="${off.id}" style="padding:8px 10px;border-radius:8px;border:none;background:#ffd500;color:#111;font-weight:700;cursor:pointer">Köp kontant</button>
        <button class="btn buy-loan"  data-id="${off.id}" style="padding:8px 10px;border-radius:8px;border:2px solid #fff;background:transparent;color:#fff;cursor:pointer">Köp med lån</button>
      </div>
    </div>`;
}

function renderMarketList(){
  const list = byId('marketList');
  if (!list) return;

  const pool = state.marketPool || [];
  if (!pool.length){
    list.innerHTML = `<div style="opacity:.85">Inga objekt till salu just nu. Prova nästa år.</div>`;
    return;
  }

  list.innerHTML = pool.map(offerRow).join('');

  // wirea knappar
  list.querySelectorAll('.buy-cash').forEach(btn=>{
    btn.addEventListener('click', () => buy(btn.dataset.id, false), { capture:true });
  });
  list.querySelectorAll('.buy-loan').forEach(btn=>{
    btn.addEventListener('click', () => buy(btn.dataset.id, true), { capture:true });
  });
}

function buy(id, withLoan){
  const off = (state.marketPool || []).find(o => o.id === id);
  if (!off) return;

  const res = acceptOffer(off, withLoan);
  if (!res.ok){
    alert(res.reason || 'Köp misslyckades');
    return;
  }

  note?.(`Köpte ${TYPES?.[off.tid]?.name ?? 'fastighet'} för ${fmtKr(off.price)}${withLoan?' (med lån)':''}.`);
  updateTop?.();
  renderOwned?.();
  renderMarketList();
}

/* ---------------------------
   Modal open/close
----------------------------*/

export function openMarket(){
  ensureMarketForThisYear();

  let m = byId('marketModal');
  if (!m){
    // Om HTML saknar modal (skydd) – skapa enkel modal
    m = document.createElement('div');
    m.id = 'marketModal';
    document.body.appendChild(m);
  }

  // Injecta enkel markup
  m.innerHTML = `
    <div class="market-wrap" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);z-index:9999">
      <div class="market-card" style="width:min(900px,92%);max-height:88vh;overflow:auto;background:#0b1a44;border:2px solid #fff;border-radius:14px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-weight:800;font-size:18px">Fastighetsmarknaden – År ${currentYear?.() ?? state.year ?? ''}</div>
          <button id="marketClose" class="btn close" style="border:none;background:#333;color:#fff;padding:8px 10px;border-radius:8px;cursor:pointer">Stäng</button>
        </div>
        <div id="marketList" style="display:grid;gap:10px"></div>
      </div>
    </div>`;

  // wire close
  m.querySelector('#marketClose')?.addEventListener('click', closeMarket, { capture:true });
  m.addEventListener('click', (e) => {
    if (e.target.classList?.contains('market-wrap')) closeMarket();
  }, { capture:true });

  // render lista
  renderMarketList();

  // visa
  m.style.display = 'block';
  // Esc stänger
  window.addEventListener('keydown', escClose, { once:true, capture:true });
}

function escClose(e){
  if (e.key === 'Escape') closeMarket();
}

export function closeMarket(){
  const m = byId('marketModal');
  if (m) m.style.display = 'none';
}

Object.assign(window, { openMarket, closeMarket });
