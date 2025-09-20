// src/ui.js
import { state, TYPES, currentYear } from './state.js';

const $  = (id) => document.getElementById(id);

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
  const app    = $('#appWrap');
  if (splash) splash.style.display = 'none';
  if (app)    app.style.display    = 'block';

  updateTop();
  renderOwned();
}

// -----------------------------
// Rendera fastigheter
// -----------------------------
export function renderOwned() {
  const wrap = $('#props');
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
    const card  = document.createElement('div');
    card.className = 'prop-card';

    const tinfo = TYPES?.[b.tid];
    const title = document.createElement('div');
    title.className = 'prop-title';
    title.textContent = `${tinfo?.name ?? 'Fastighet'} — ${b.units ?? '?'} lgh`;

    const meta  = document.createElement('div');
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
// Topbar
// -----------------------------
export function updateTop() {
  $('#cash')   ?.replaceChildren(document.createTextNode((state.cash ?? 0).toLocaleString('sv-SE')));
  $('#debtTop')?.replaceChildren(document.createTextNode((state.debt ?? 0).toLocaleString('sv-SE')));
  $('#yearNow')?.replaceChildren(document.createTextNode(String(currentYear?.() ?? state.year ?? '-')));
  $('#market') ?.replaceChildren(document.createTextNode(((state.market ?? 1)).toFixed?.(2) + '×'));
  $('#rate')   ?.replaceChildren(document.createTextNode(String(state.rate ?? 0)));
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
// Knyt knappar (robust)
// -----------------------------
export function bindCoreButtonsOnce() {
  const startBtn  = $('#startBtn');
  const marketBtn = $('#openMarket');
  const hsBtn1    = $('#openHS');
  const hsBtn2    = $('#openHSStart');
  const nextBtn   = $('#next');

  // START
  console.log('[UI] binding startBtn…', !!startBtn);
  if (startBtn && !startBtn.dataset.wired) {
    startBtn.type = 'button';
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[UI] startBtn clicked');
      if (typeof window.startGame === 'function') window.startGame();
      else showAppHideSplash();
    });
    startBtn.dataset.wired = '1';
  }

  // MARKNAD
  if (marketBtn && !marketBtn.dataset.wired) {
    marketBtn.type = 'button';
    marketBtn.addEventListener('click', () => window.openMarket?.());
    marketBtn.dataset.wired = '1';
  }

  // HIGHSCORE
  const wireHS = (btn) => {
    if (!btn || btn.dataset.wired) return;
    btn.type = 'button';
    btn.addEventListener('click', () => window.openHS?.());
    btn.dataset.wired = '1';
  };
  wireHS(hsBtn1);
  wireHS(hsBtn2);

  // NEXT YEAR
  if (nextBtn && !nextBtn.dataset.wired) {
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => window.nextPeriod?.());
    nextBtn.dataset.wired = '1';
  }

  // Fallback: event delegation (om något missas)
  if (!document.body.dataset.tapajosDelegation) {
    document.addEventListener('click', (e) => {
      const start = e.target?.closest?.('#startBtn');
      if (start) {
        e.preventDefault();
        (window.startGame || showAppHideSplash)?.();
      }
    });
    document.body.dataset.tapajosDelegation = '1';
  }
}

// (valfritt) exponera globalt
Object.assign(window, {
  bindCoreButtonsOnce,
  showAppHideSplash,
  renderOwned,
  updateTop,
  note,
});
