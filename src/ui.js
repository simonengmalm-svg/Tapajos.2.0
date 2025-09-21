// ./src/ui.js
import { state, TYPES, currentYear } from './state.js';

const $ = (id) => document.getElementById(id);

// Visa appen / göm splash
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

  const splash = $('#splash'); const app = $('#appWrap');
  if (splash) splash.style.display = 'none';
  if (app)    app.style.display    = 'block';

  updateTop(); renderOwned();
}

// Render “mina fastigheter”
export function renderOwned() {
  const wrap = $('#props'); if (!wrap) return;
  wrap.innerHTML = '';
  const owned = state.owned || [];
  if (!owned.length) {
    const p = document.createElement('p'); p.textContent = 'Du äger inga fastigheter ännu.';
    wrap.appendChild(p); return;
  }
  owned.forEach(b => {
    const card = document.createElement('div');
    card.className = 'prop-card';
    const tinfo = TYPES?.[b.tid];
    card.innerHTML = `
      <div class="prop-title">${tinfo?.name ?? 'Fastighet'} — ${b.units ?? '?'} lgh</div>
      <div class="prop-meta">Skick: ${typeof b.cond==='number'? `${b.cond}/10` : (b.cond??'-')}
        • Pris: ${(b.basePrice ?? b.price ?? 0).toLocaleString('sv-SE')} kr
        • Central: ${b.central ? 'Ja':'Nej'}</div>`;
    wrap.appendChild(card);
  });
}

// Toppbaren
export function updateTop() {
  $('#cash')   ?.replaceChildren(document.createTextNode((state.cash   ?? 0).toLocaleString('sv-SE')));
  $('#debtTop')?.replaceChildren(document.createTextNode((state.debt   ?? 0).toLocaleString('sv-SE')));
  $('#yearNow')?.replaceChildren(document.createTextNode(String(currentYear?.() ?? state.year ?? '-')));
  $('#market') ?.replaceChildren(document.createTextNode(((state.market ?? 1)).toFixed?.(2) + '×'));
  $('#rate')   ?.replaceChildren(document.createTextNode(String(state.rate ?? 0)));
}

// Notiser
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

// Knyt kärnknappar (Start binds redan inline – vi drar inte i den)
export function bindCoreButtonsOnce() {
  const nextBtn   = $('#next');
  const marketBtn = $('#openMarket');
  const hsBtn1    = $('#openHS');
  const hsBtn2    = $('#openHSStart');
  const hsClose   = $('#hsClose');

  if (nextBtn && !nextBtn.dataset.wired) {
    nextBtn.addEventListener('click', ()=> window.nextPeriod?.());
    nextBtn.dataset.wired = '1';
  }
  if (marketBtn && !marketBtn.dataset.wired) {
    marketBtn.addEventListener('click', ()=> window.openMarket?.());
    marketBtn.dataset.wired = '1';
  }
  if (hsBtn1 && !hsBtn1.dataset.wired) {
    hsBtn1.addEventListener('click', ()=> window.openHSModal?.());
    hsBtn1.dataset.wired = '1';
  }
  if (hsBtn2 && !hsBtn2.dataset.wired) {
    hsBtn2.addEventListener('click', ()=> window.openHSModal?.());
    hsBtn2.dataset.wired = '1';
  }
  if (hsClose && !hsClose.dataset.wired) {
    hsClose.addEventListener('click', ()=> window.closeHSModal?.());
    hsClose.dataset.wired = '1';
  }
}

Object.assign(window, { bindCoreButtonsOnce, showAppHideSplash, renderOwned, updateTop, note });
