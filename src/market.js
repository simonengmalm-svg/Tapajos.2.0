// ./src/market.js
import { state, TYPES, currentYear, fmt, pick, uuid, randInt } from './state.js';
import { updateTop, renderOwned, note } from './ui.js';

// === Marknadstillstånd (håll samma namn som gamla spelet) ===
state.marketPool = state.marketPool || [];
state.marketYear = state.marketYear || 0;

// --- Pris & offert ---
function priceOf(tid, cond, central) {
  const t = TYPES[tid];
  const [min, max] = t.price;
  const condF = (cond === 'ny' ? 1.0 : cond === 'sliten' ? 0.85 : 0.7);
  const centF = central ? 1.2 : 0.9;
  const base = min + Math.random() * (max - min);
  return Math.round(base * condF * centF * (state.market ?? 1));
}

function makeOffer(tid, cond, central){
  const price = priceOf(tid, cond, central);
  const [umin, umax] = TYPES[tid].units;
  const units = randInt(umin, umax);
  return { id: uuid(), tid, cond, central, price, units };
}

function generateYearMarket(n=4){
  const keys = Object.keys(TYPES);
  const arr = [];
  for (let i=0; i<n; i++){
    const tid = pick(keys);
    const cond = pick(['ny','sliten','forfallen']);
    const central = Math.random() < 0.5;
    arr.push(makeOffer(tid, cond, central));
  }
  state.marketPool = arr.sort((a,b)=>a.price-b.price);
  state.marketYear = currentYear();
}

// Publikt API
export function ensureMarketForThisYear(){
  if (state.marketYear !== currentYear() || !state.marketPool.length){
    generateYearMarket(4);
    note?.(`Nytt marknadsutbud för år ${currentYear()}.`);
  }
}

export function openMarket(){
  ensureMarketForThisYear();
  renderMarket();
}

export function closeMarket(){
  const m = document.getElementById('marketModal');
  if (m) m.style.display = 'none';
}

function removeOfferById(id){
  state.marketPool = state.marketPool.filter(o => o.id !== id);
}

// --- Render ---
export function renderMarket(){
  const offersEl = document.getElementById('offers');   // <== SAMMA ID SOM I GAMLA HTML
  const modal    = document.getElementById('marketModal');
  if (!offersEl || !modal) return;

  offersEl.innerHTML = '';
  if (!state.marketPool.length){
    offersEl.innerHTML = `<div class="meta">Inga fler objekt till salu i år. Tryck “Nästa år”.</div>`;
  } else {
    state.marketPool.forEach(off=>{
      const t = TYPES[off.tid];
      const box = document.createElement('div'); box.className='offer';
      const ic  = document.createElement('div'); ic.className=`small ${t.cls} C-${off.cond}`;

      const left = document.createElement('div');
      left.innerHTML =
        `<div><b>${t.name}</b> ${off.central ? '• Centralt' : '• Förort'} • Lgh: <b>${off.units}</b></div>
         <div class="meta">Skick: ${off.cond==='forfallen'?'förfallen':off.cond}</div>
         <div class="price">Pris: ${fmt(off.price)} kr</div>`;

      const buyCash = document.createElement('button'); buyCash.className='btn mini'; buyCash.textContent='Köp kontant';
      buyCash.onclick = ()=>{
        if ((state.cash ?? 0) < off.price){ alert('Otillräcklig kassa'); return; }
        state.cash -= off.price;
        addOwnedFromOffer(off);
      };

      const buyLoan = document.createElement('button'); buyLoan.className='btn mini alt'; buyLoan.textContent='Köp med lån';
      buyLoan.onclick = ()=>{
        const down = Math.round(off.price * 0.30);
        if ((state.cash ?? 0) < down){ alert('Behöver kontantinsats: ' + fmt(down) + ' kr'); return; }
        state.cash -= down;
        // Enkelt “lånefrö”; full lånelogik kan bo i loans.js om du vill
        addOwnedFromOffer(off, { loanSeed: true, loanDown: down });
      };

      const right = document.createElement('div'); right.style.display='grid'; right.style.gap='6px';
      right.append(buyCash, buyLoan);

      box.append(ic, left, right);
      offersEl.appendChild(box);
    });
  }
  modal.style.display = 'flex';
}

function addOwnedFromOffer(off, extra = {}){
  const b = {
    ...off,
    basePrice: off.price,
    baseCond:  off.cond,
    baseUnits: off.units,
    baseMarket: state.market,
    boughtAtYear: currentYear(),
    ...extra
  };
  // init “sociala” fält (matchar gamla spelet)
  b.sat = Math.floor(60 + (b.cond === 'ny' ? +15 : b.cond === 'sliten' ? -10 : -20) + (b.central ? +5 : 0));
  b.consent = Math.max(0, Math.min(100, Math.floor(b.sat - 10 + (b.cond === 'ny' ? +10 : 0))));
  b.status = (b.consent>=70 && b.sat>=70 && b.cond==='ny') ? 'Klar för ombildning' : (b.sat<40 ? 'Oro i föreningen' : b.sat<60 ? 'Skört läge' : 'Stabilt');
  b.maintMult = 1.0; b.rentBoost = 0; b.valueBoost = 0;
  b.project = null; b.converting = null;
  b.eventsUsed = 0; b.eventsCap = (Math.random()<0.35?2:1);
  b.energyUpgrades = 0; b.energyUpgradesMax = 3;

  state.owned = state.owned || [];
  state.owned.push(b);
  removeOfferById(off.id);
  updateTop?.(); renderOwned?.();
  note?.(`Köpt: ${TYPES[off.tid].name} (${off.units} lgh) för ${fmt(off.price)} kr.`);
}

// Exponera globalt (HTML-knappar använder dessa)
Object.assign(window, { openMarket, closeMarket, ensureMarketForThisYear, renderMarket });
