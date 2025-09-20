// src/game.js
import { state, currentYear } from './state.js';
import { showAppHideSplash, updateTop, renderOwned, note } from './ui.js';
import { ensureMarketForThisYear } from './market.js';

// (valfritt) om du har sparfunktioner i highscore.js, annars ignoreras de
let saveHighscore, refreshHighscoresSafe;
try {
  const hs = await import('./highscore.js');
  saveHighscore = hs.saveHighscore;
  refreshHighscoresSafe = hs.refreshHighscoresSafe;
} catch {
  // highscore-modul saknas eller exporteras ej – inga problem, vi kör ändå
}

/* -------------------------------------------------------
   Init / Start
------------------------------------------------------- */
export function startGame() {
  // Grundsäker init av state
  state.player = state.player || {};
  state.notes  = state.notes  || [];
  state.owned  = state.owned  || [];

  // rimliga defaults om de saknas
  if (state.cash == null) state.cash = 10_000_000;
  if (state.debt == null) state.debt = 0;
  if (state.rate == null) state.rate = 3.0;
  if (state.market == null) state.market = 1.00;
  if (state.year  == null) state.year = 1;

  // Visa app, göm splash
  showAppHideSplash();

  // Se till att marknaden för året finns
  ensureMarketForThisYear();

  // Första render
  updateTop();
  renderOwned();

  note?.('Välkommen! Ditt äventyr börjar nu.');
}

/* -------------------------------------------------------
   Spel-loop (enkel): Nästa period/år
------------------------------------------------------- */
export function nextPeriod() {
  // öka år och uppdatera ev. marknad
  state.year = Number(state.year || 1) + 1;

  // (Här kan du lägga ekonomi/underhåll/hyresintäkter mm om du vill)
  // t.ex. state.cash += someIncome - someCosts;

  ensureMarketForThisYear();
  updateTop();
  renderOwned();

  // enkel sluttrigg: avsluta efter 15 år
  if (state.year >= 16) endGame();
}

/* -------------------------------------------------------
   Avslut / summering
------------------------------------------------------- */
function fmt(n) {
  try { return Number(n || 0).toLocaleString('sv-SE'); }
  catch { return String(n); }
}

// En väldigt enkel summering – byt gärna mot din riktiga beräkning
function summarizeEnd() {
  const owned = state.owned || [];
  const worth = owned.reduce((sum, b) => {
    const base = (b.basePrice ?? b.price ?? 0);
    return sum + Number(base || 0);
  }, 0);

  const avgSat = owned.length
    ? Math.round(
        owned.reduce((s, b) => s + Number(b?.sat ?? 0), 0) / owned.length
      )
    : 0;

  return {
    worth,                // “nettoförmögenhet” (förenklad)
    props: owned.length,  // antal fastigheter
    avgSat,               // nöjdhet (0–100)
    year: currentYear?.() ?? state.year ?? 1,
  };
}

export function endGame() {
  const s = summarizeEnd();

  // skriv sammanfattning i modalen om den finns
  const sumEl = document.getElementById('endSummary');
  if (sumEl) {
    sumEl.innerHTML =
      `Nettoförmögenhet: <b>${fmt(s.worth)}</b> kr<br>` +
      `Fastigheter: <b>${s.props}</b> • Snittnöjdhet: <b>${s.avgSat}%</b>`;
  }

  // försök spara highscore om funktionen finns
  try {
    saveHighscore?.();
    // ge CW för Google Forms/Sheets etc. en chans att hinna klart
    setTimeout(() => refreshHighscoresSafe?.(), 500);
  } catch (e) {
    console.error('Kunde inte spara highscore:', e);
    alert('Hoppsan! Kunde inte spara highscore just nu.');
  }

  // visa slutmodal
  const end = document.getElementById('endModal');
  if (end) end.style.display = 'flex';

  note?.('Spelet är slut – bra spelat!');
}

/* -------------------------------------------------------
   Hjälp: ev. BRF-ombildning etc. (stubbar – valfritt)
------------------------------------------------------- */
// Exempel på en enkel åtgärd du kan anropa från event
function completeBRF(i, b) {
  // Den här är en “stub” – byt mot din riktiga logik vid behov
  const premium = 1.35;
  const valuation = (x) => (x?.basePrice ?? x?.price ?? 0);
  const cashIn = Math.round(valuation(b) * premium);

  state.cash += cashIn;
  // ta bort “b” ur owned om det ska säljas vid ombildning
  const idx = (state.owned || []).indexOf(b);
  if (idx >= 0) state.owned.splice(idx, 1);

  note?.('Ombildning klar. Likvid insatt.');
  updateTop();
  renderOwned();
}

/* -------------------------------------------------------
   Globala hooks (för äldre anrop/HTML-knappar)
------------------------------------------------------- */
Object.assign(window, {
  startGame,
  nextPeriod,
  updateTop,
});
