// src/ui.js
import { state, TYPES, currentYear } from './state.js';

// små hjälpare
const $  = (id) => document.getElementById(id);
const qc = (sel) => document.querySelector(sel);

// -----------------------------
// Visa appen / göm splash
// -----------------------------
export function showAppHideSplash() {
  const name = $('#startName')?.value?.trim();
  if (name) {
    state.player = state.player || {};
    state.player.name = name;
  }
  const splash = $('#splash');
  const app    = $('#appWrap');     // <- matchar din HTML
  if (splash) splash.style.display = 'none';
  if (app)    app.style.display    = 'block';

  updateTop();
  renderOwned();
}

// -----------------------------
// Rendera ägda fastigheter
// -----------------------------
export function renderOwned() {
  const wrap = $('#props');         // <- matchar din HTML
  if (!wrap) return;
  wrap.innerHTML = '';

  const owned = state.owned || [];
  if (!owned.length) {
    const p = document.createElement('p');
    p.textContent = 'Du äger inga fastigheter ännu.';
    wrap.appendChild(p);
    return;
  }

  owned.forEach((b) => {
    const card = document.createElement('div');
    card.className = 'prop-card';

    const tinfo = TYPES?.[b.tid];
    const title = document.createElement('div');
    title.className = 'prop-title';
    title.textContent = `${tinfo?.name ?? 'Fastighet'} — ${b.units ?? '?'} lgh`;

    const meta = document.createElement('div');
    meta.className = 'prop-meta';
    const price = (b.basePrice ?? b.price ?? 0).toLocaleString('sv-SE') + ' kr';
    const cond  = (typeof b.cond === 'number') ? `${b.cond}/10` : (b.cond ?? '-');
    meta.textContent = `Skick: ${cond} • Pris: ${price} • Central: ${b.central ? 'Ja' : 'Nej'}`;

    card.appendChild(title);
    card.appendChild(meta);
    wrap.appendChild(card);
  });
}

// -----------------------------
// Uppdatera toppbar
// -----------------------------
export function updateTop() {
  $('#cash')?.replaceChildren(document.createTextNode((state.cash ?? 0).toLocaleString('sv-SE')));
  $('#debtTop')?.replaceChildren(document.createTextNode((state.debt ?? 0).toLocaleString('sv-SE')));
  $('#yearNow')?.replaceChildren(document.createTextNode(String(currentYear?.() ?? state.year ?? '-')));
  $('#market')?.replaceChildren(document.createTextNode((state.market ?? 1).toFixed?.(2) + '×'));
  $('#rate')?.replaceChildren(document.createTextNode(String(state.rate ?? 0)));
}

// -----------------------------
// Notiser
// -----------------------------
export function note(msg) {
  state.notes = state.notes || [];
  if (msg) state.notes.push({ t: Date.now(), msg });

  const list = $('#notes');
  if (!list) return;
  list.innerHTML = state.notes.length
    ? state.notes.slice(-50).map(n => {
        const d = new Date(n.t).toLocaleTimeString('sv-SE');
        return `<div class="note">[${d}] ${n.msg}</div>`;
      }).join('')
    : '—';
}

// -----------------------------
// Knyt knappar EN gång
// -----------------------------
export function bindCoreButtonsOnce() {
  const startBtn   = $('#startBtn');     // <- matchar din HTML
  const hsBtn      = $('#openHS');
  const hsBtnTop   = $('#openHSStart');
  const nextBtn    = $('#next');
  const marketBtn  = $('#openMarket');   // <- matchar din HTML

  if (startBtn && !startBtn.dataset.wired) {
    startBtn.addEventListener('click', (e) => { e.preventDefault(); showAppHideSplash(); });
    startBtn.dataset.wired = '1';
  }

  if (marketBtn && !marketBtn.dataset.wired) {
    marketBtn.addEventListener('click', () => {
      if (typeof window.openMarket === 'function') window.openMarket();
    });
    marketBtn.dataset.wired = '1';
  }

  // (valfritt) koppla highscore/next om du har globala handlers
  if (hsBtn && !hsBtn.dataset.wired) {
    hsBtn.addEventListener('click', () => window.openHS?.());
    hsBtn.dataset.wired = '1';
  }
  if (hsBtnTop && !hsBtnTop.dataset.wired) {
    hsBtnTop.addEventListener('click', () => window.openHS?.());
    hsBtnTop.dataset.wired = '1';
  }
  if (nextBtn && !nextBtn.dataset.wired) {
    nextBtn.addEventListener('click', () => window.tickYear?.());
    nextBtn.dataset.wired = '1';
  }
}

// -----------------------------
// (valfritt) exponera globalt
// -----------------------------
Object.assign(window, {
  bindCoreButtonsOnce,
  showAppHideSplash,
  renderOwned,
  updateTop,
  note,
});
