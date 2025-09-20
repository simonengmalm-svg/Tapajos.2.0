// src/ui.js
import { state, TYPES, currentYear } from './state.js';

// Små hjälpare
const $  = (id) => document.getElementById(id);
const qc = (sel) => document.querySelector(sel);

// --------------------------------------
// 1) Visa appen och göm splash
// --------------------------------------
export function showAppHideSplash() {
  // Spara spelarnamn om fält finns
  const name = $('#startName')?.value?.trim();
  if (name) {
    state.player = state.player || {};
    state.player.name = name;
  }

  // Visa appyta / göm splash
  const splash = $('#splash');
  const app    = $('#app');
  if (splash) splash.style.display = 'none';
  if (app)    app.style.display    = 'block';

  // Initial render
  updateTop();
  renderOwned();
}

// --------------------------------------
// 2) Rendera ägda fastigheter
// --------------------------------------
export function renderOwned() {
  const wrap = $('#ownedList') || $('#owned') || qc('[data-owned-list]');
  if (!wrap) return;

  // Töm
  wrap.innerHTML = '';

  if (!state.owned || state.owned.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Du äger inga fastigheter ännu.';
    wrap.appendChild(p);
    return;
  }

  // Skapa kort för varje fastighet
  state.owned.forEach((b) => {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'card-title';

    const tinfo = TYPES?.[b.tid];
    const name  = tinfo?.name || b.tid || 'Fastighet';
    title.textContent = `${name} – ${b.units ?? '?'} st lgh`;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const cond  = (typeof b.cond === 'number') ? `${b.cond}/10` : (b.cond ?? '-');
    const price = (b.basePrice ?? b.price ?? 0).toLocaleString('sv-SE') + ' kr';
    meta.textContent = `Skick: ${cond} • Pris: ${price} • Central: ${b.central ? 'Ja' : 'Nej'}`;

    const chips = document.createElement('div');
    chips.className = 'chips';

    // Exempelchippar
    if (b.converting) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = `Ombildning pågår (${b.converting.duration} kvar)`;
      chips.appendChild(c);
    }
    if (b.loanSeed || b.loanId) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = 'Lån kopplat';
      chips.appendChild(c);
    }

    // Enkla “bars” för status (om CSS finns), valfritt
    const bars = document.createElement('div');
    bars.className = 'bars';
    bars.style.display = 'flex';
    bars.style.flexDirection = 'column';
    bars.style.gap = '6px';

    bars.appendChild(mkBarRow('Nöjdhet', percentClamp(b?.sat ?? 0)));
    bars.appendChild(mkBarRow('Skick',    percentClamp(toPercent(b?.cond, 10))));

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(chips);
    card.appendChild(bars);
    wrap.appendChild(card);
  });
}

// --------------------------------------
// 3) Topp-panel (kassa, år mm)
// --------------------------------------
export function updateTop() {
  // Kassa
  const cashEl = $('#cash') || qc('[data-cash]');
  if (cashEl) cashEl.textContent = (state.cash ?? 0).toLocaleString('sv-SE') + ' kr';

  // År
  const yearEl = $('#year') || qc('[data-year]');
  if (yearEl) yearEl.textContent = String(currentYear?.() ?? state.year ?? '-');

  // Ägda antal
  const ownedEl = $('#ownedCount') || qc('[data-owned-count]');
  if (ownedEl) ownedEl.textContent = String(state.owned?.length ?? 0);

  // Meddelanden (om du har badge)
  const noteBadge = $('#noteBadge') || qc('[data-note-badge]');
  if (noteBadge && Array.isArray(state.notes)) {
    noteBadge.textContent = String(state.notes.length);
    noteBadge.style.display = state.notes.length ? 'inline-flex' : 'none';
  }
}

// --------------------------------------
// 4) Notera meddelanden i UI
// --------------------------------------
export function note(msg) {
  state.notes = state.notes || [];
  if (msg) state.notes.push({ t: Date.now(), msg });

  const list = $('#notes') || qc('[data-notes]');
  if (!list) return;

  // (Re)render lista
  list.innerHTML = '';
  state.notes.slice(-50).forEach((n) => {
    const li = document.createElement('div');
    li.className = 'note';
    const d = new Date(n.t);
    li.textContent = `[${d.toLocaleTimeString('sv-SE')}] ${n.msg}`;
    list.appendChild(li);
  });
}

// --------------------------------------
// 5) Koppla knappar/formulär EN gång
// --------------------------------------
export function bindCoreButtonsOnce() {
  // Startform/knapp (IDs kan du justera i index.html)
  const startForm = $('#startForm');
  const startBtn  = $('#btnStart');

  const startHandler = (e) => {
    e?.preventDefault?.();
    showAppHideSplash();
  };

  if (startForm && !startForm.dataset.wired) {
    startForm.addEventListener('submit', startHandler);
    startForm.dataset.wired = '1';
  }
  if (startBtn && !startBtn.dataset.wired) {
    startBtn.addEventListener('click', startHandler);
    startBtn.dataset.wired = '1';
  }

  // Marknadsknapp (om du har en knapp som öppnar marknad)
  const marketBtn = $('#btnMarket');
  if (marketBtn && !marketBtn.dataset.wired) {
    marketBtn.addEventListener('click', () => {
      if (typeof window.openMarket === 'function') window.openMarket();
    });
    marketBtn.dataset.wired = '1';
  }
}

// --------------------------------------
// Helpers för bars
// --------------------------------------
function mkBarRow(label, pct = 0) {
  const row = document.createElement('div');
  row.className = 'bar-row';

  const l = document.createElement('div');
  l.className = 'bar-label';
  l.textContent = label;

  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.width = `${percentClamp(pct)}%`;
  bar.appendChild(fill);

  row.appendChild(l);
  row.appendChild(bar);
  return row;
}

function percentClamp(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function toPercent(value, max) {
  if (max <= 0) return 0;
  return (Number(value || 0) / max) * 100;
}

// --------------------------------------
// Lägg (valfritt) på window för äldre anrop
// --------------------------------------
Object.assign(window, {
  bindCoreButtonsOnce,
  showAppHideSplash,
  renderOwned,
  updateTop,
  note,
});
