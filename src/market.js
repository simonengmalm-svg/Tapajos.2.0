// ./src/ui.js
import { state, TYPES, currentYear } from './state.js';

const $ = (id) => document.getElementById(id);

export function showAppHideSplash() {
  const name = $('#startName')?.value?.trim();
  const company = $('#startCompany')?.value?.trim();
  const remember = $('#rememberProfile');

  state.player = state.player || {};
  if (name) state.player.name = name;
  if (company) state.player.company = company;
  if (remember?.checked) {
    try { localStorage.setItem('tapajos-profile-v1', JSON.stringify({ name, company })); } catch {}
  }

  $('#splash')?.style && ($('#splash').style.display = 'none');
  $('#appWrap')?.style && ($('#appWrap').style.display = 'block');

  updateTop(); renderOwned();
}

export function renderOwned() {
  const wrap = $('#props'); if (!wrap) return;
  wrap.innerHTML = '';
  const owned = state.owned || [];
  if (!owned.length) {
    wrap.innerHTML = '<div class="meta">Du äger inga fastigheter ännu. Klicka på “Fastighetsmarknad”.</div>';
    return;
  }
  owned.forEach(b => {
    const tinfo = TYPES?.[b.tid];
    const card = document.createElement('div');
    card.className = 'prop-card';
    const condTxt = (typeof b.cond==='string' && b.cond==='forfallen') ? 'förfallen' : (b.cond ?? '-');
    const price   = (b.basePrice ?? b.price ?? 0).toLocaleString('sv-SE');

    card.innerHTML = `
      <div class="prop-title">${tinfo?.name ?? 'Fastighet'} — ${b.units ?? b.baseUnits ?? '?'} lgh</div>
      <div class="prop-meta">Skick: ${typeof b.cond==='number' ? `${b.cond}/10` : condTxt}
        • Pris: ${price} kr
        • Central: ${b.central ? 'Ja' : 'Nej'}</div>`;
    wrap.appendChild(card);
  });
}

export function updateTop() {
  $('#cash')   ?.replaceChildren(document.createTextNode((state.cash   ?? 0).toLocaleString('sv-SE')));
  $('#debtTop')?.replaceChildren(document.createTextNode((state.debt   ?? 0).toLocaleString('sv-SE')));
  $('#yearNow')?.replaceChildren(document.createTextNode(String(currentYear?.() ?? state.month ?? 1)));
  $('#market') ?.replaceChildren(document.createTextNode(((state.market ?? 1)).toFixed?.(2) + '×'));
  $('#rate')   ?.replaceChildren(document.createTextNode(String((state.rate ?? 0)*100)));
}

export function note(msg){
  state.notes = state.notes || [];
  if (msg) state.notes.push({ t: Date.now(), msg });
  const list = $('#notes'); if (!list) return;
  list.innerHTML = state.notes.length
    ? state.notes.slice(-50).map(n=>{
        const d=new Date(n.t).toLocaleTimeString('sv-SE');
        return `<div class="note">[${d}] ${n.msg}</div>`
      }).join('')
    : '—';
}

// 👉 BIND ALLA KÄRNKNAPPAR, inkl. top-knapp för marknaden
export function bindCoreButtonsOnce() {
  const nextBtn   = $('#next');
  const marketBtn = $('#openMarket');
  const marketTop = $('#openMarketTop');
  const hsBtn1    = $('#openHS');
  const hsBtn2    = $('#openHSStart');
  const hsClose   = $('#hsClose');

  if (nextBtn && !nextBtn.dataset.wired)  { nextBtn.addEventListener('click', ()=> window.nextPeriod?.()); nextBtn.dataset.wired = '1'; }
  if (marketBtn && !marketBtn.dataset.wired){ marketBtn.addEventListener('click', ()=> window.openMarket?.()); marketBtn.dataset.wired = '1'; }
  if (marketTop && !marketTop.dataset.wired){ marketTop.addEventListener('click', ()=> window.openMarket?.()); marketTop.dataset.wired = '1'; }
  if (hsBtn1 && !hsBtn1.dataset.wired)   { hsBtn1.addEventListener('click', ()=> window.openHSModal?.()); hsBtn1.dataset.wired = '1'; }
  if (hsBtn2 && !hsBtn2.dataset.wired)   { hsBtn2.addEventListener('click', ()=> window.openHSModal?.()); hsBtn2.dataset.wired = '1'; }
  if (hsClose && !hsClose.dataset.wired) { hsClose.addEventListener('click', ()=> window.closeHSModal?.()); hsClose.dataset.wired = '1'; }
}

Object.assign(window, { bindCoreButtonsOnce, showAppHideSplash, renderOwned, updateTop, note });
