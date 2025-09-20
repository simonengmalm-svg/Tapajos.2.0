// src/game.js
import { state, currentYear } from './state.js';
import { showAppHideSplash, updateTop, renderOwned, note } from './ui.js';
import { ensureMarketForThisYear } from './market.js';

export function startGame() {
  // Grundinit
  state.player = state.player || {};
  state.notes  = state.notes  || [];
  state.owned  = state.owned  || [];

  // Defaults första gången
  if (state.cash   == null) state.cash   = 10_000_000;
  if (state.debt   == null) state.debt   = 0;
  if (state.rate   == null) state.rate   = 3.0;
  if (state.market == null) state.market = 1.00;
  if (state.year   == null) state.year   = 1;

  // Visa appen och göm splash
  showAppHideSplash?.();

  // Initiera marknaden & rendera UI
  ensureMarketForThisYear?.();
  updateTop?.();
  renderOwned?.();
  note?.('Välkommen! Ditt äventyr börjar nu.');
}

export function nextPeriod() {
  state.year = Number(state.year || 1) + 1;
  ensureMarketForThisYear?.();
  updateTop?.();
  renderOwned?.();
  if (state.year >= 16) endGame();
}

function fmt(n) { try { return Number(n||0).toLocaleString('sv-SE'); } catch { return String(n); } }

function summarizeEnd() {
  const owned = state.owned || [];
  const worth = owned.reduce((sum, b) => sum + Number((b.basePrice ?? b.price ?? 0) || 0), 0);
  const avgSat = owned.length ? Math.round(owned.reduce((s, b) => s + Number(b?.sat ?? 0), 0) / owned.length) : 0;
  return { worth, props: owned.length, avgSat, year: currentYear?.() ?? state.year ?? 1 };
}

export function endGame() {
  const s = summarizeEnd();
  const sumEl = document.getElementById('endSummary');
  if (sumEl) {
    sumEl.innerHTML =
      `Nettoförmögenhet: <b>${fmt(s.worth)}</b> kr<br>` +
      `Fastigheter: <b>${s.props}</b> • Snittnöjdhet: <b>${s.avgSat}%</b>`;
  }
  const end = document.getElementById('endModal');
  if (end?.style) end.style.display = 'flex';
  note?.('Spelet är slut – bra spelat!');
}

// Exponera globalt
Object.assign(window, { startGame, nextPeriod });


export function startGame() {
  // ... din nuvarande init (showAppHideSplash(), ensureMarketForThisYear(), updateTop(), renderOwned() osv.)
}

Object.assign(window, { startGame });
window.startGame = startGame; // extra säkerhet för vissa bundlers
