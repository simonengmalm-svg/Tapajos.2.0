// src/game.js
import { state, currentYear } from './state.js';
import { showAppHideSplash, updateTop, renderOwned, note } from './ui.js';
import { ensureMarketForThisYear } from './market.js';

let saveHighscore, refreshHighscoresSafe;
try {
  const hs = await import('./highscore.js');
  saveHighscore = hs.saveHighscore;
  refreshHighscoresSafe = hs.refreshHighscoresSafe;
} catch { /* highscore valfri */ }

// Starta spelet
export function startGame() {
  state.player = state.player || {};
  state.notes  = state.notes  || [];
  state.owned  = state.owned  || [];

  if (state.cash   == null) state.cash   = 10_000_000;
  if (state.debt   == null) state.debt   = 0;
  if (state.rate   == null) state.rate   = 3.0;
  if (state.market == null) state.market = 1.00;
  if (state.year   == null) state.year   = 1;

  showAppHideSplash();
  ensureMarketForThisYear();
  updateTop();
  renderOwned();
  note?.('Välkommen! Ditt äventyr börjar nu.');
}

// Nästa år/period
export function nextPeriod() {
  state.year = Number(state.year || 1) + 1;

  // (här kan du lägga ekonomi/underhåll)

  ensureMarketForThisYear();
  updateTop();
  renderOwned();

  if (state.year >= 16) endGame();
}

function fmt(n) {
  try { return Number(n || 0).toLocaleString('sv-SE'); }
  catch { return String(n); }
}

function summarizeEnd() {
  const owned = state.owned || [];
  const worth = owned.reduce((sum, b) => {
    const base = (b.basePrice ?? b.price ?? 0);
    return sum + Number(base || 0);
  }, 0);

  const avgSat = owned.length
    ? Math.round(owned.reduce((s, b) => s + Number(b?.sat ?? 0), 0) / owned.length)
    : 0;

  return {
    worth,
    props: owned.length,
    avgSat,
    year: currentYear?.() ?? state.year ?? 1,
  };
}

export function endGame() {
  const s = summarizeEnd();

  const sumEl = document.getElementById('endSummary');
  if (sumEl) {
    sumEl.innerHTML =
      `Nettoförmögenhet: <b>${fmt(s.worth)}</b> kr<br>` +
      `Fastigheter: <b>${s.props}</b> • Snittnöjdhet: <b>${s.avgSat}%</b>`;
  }

  try {
    saveHighscore?.();
    setTimeout(() => refreshHighscoresSafe?.(), 500);
  } catch (e) {
    console.error('Kunde inte spara highscore:', e);
    alert('Hoppsan! Kunde inte spara highscore just nu.');
  }

  document.getElementById('endModal')?.style && (document.getElementById('endModal').style.display = 'flex');
  note?.('Spelet är slut – bra spelat!');
}

// (exempel) hjälpfunktion
function completeBRF(i, b) {
  const premium = 1.35;
  const valuation = (x) => (x?.basePrice ?? x?.price ?? 0);
  const cashIn = Math.round(valuation(b) * premium);

  state.cash = (state.cash || 0) + cashIn;
  const idx = (state.owned || []).indexOf(b);
  if (idx >= 0) state.owned.splice(idx, 1);

  note?.('Ombildning klar. Likvid insatt.');
  updateTop();
  renderOwned();
}

// Globala hooks (för knappar)
Object.assign(window, {
  startGame,
  nextPeriod,
  updateTop,
});
