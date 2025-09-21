// ./src/main.js
// Ladda modulerna så både named-exports och window.* finns
import * as config    from './config.js';
import * as stateMod  from './state.js';
import './anekdoter.js';
import * as economy   from './economy.js';
import * as social    from './social.js';
import * as loans     from './loans.js';
import * as eventsMod from './events.js';
import * as market    from './market.js';
import * as ui        from './ui.js';
import * as hs        from './highscore.js';
import * as game      from './game.js'; // säkerställer att startGame läggs på window

// Hjälpare att plocka fn oavsett export-sätt
const pickFn = (...c) => c.find(fn => typeof fn === 'function');

// Plocka state
const state = stateMod?.state || window.state || (window.state = {});

// UI-funktioner
const bindCoreButtonsOnce = pickFn(ui?.bindCoreButtonsOnce, window.bindCoreButtonsOnce);
const updateTop           = pickFn(ui?.updateTop,           window.updateTop);
const renderOwned         = pickFn(ui?.renderOwned,         window.renderOwned);

// Highscore
const hsReadFromSheet     = pickFn(hs?.hsReadFromSheet,     window.hsReadFromSheet);
const renderHighscores    = pickFn(hs?.renderHighscores,    window.renderHighscores);
const renderHSBoard       = pickFn(hs?.renderHSBoard,       window.renderHSBoard);

// Robust fallback om något annat missar att binda startknappen
function wireStartFallback() {
  const btn = document.getElementById('startBtn');
  if (!btn || btn.dataset._wiredFallback) return;

  const fallback = () => {
    const s = document.getElementById('splash');
    const a = document.getElementById('appWrap');
    if (s) s.style.display = 'none';
    if (a) a.style.display = 'block';
    console.warn('[fallback] startGame saknas – visade appen ändå');
  };

  // fånga i capturing-fas för att slå igenom ev. overlays
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    (window.startGame || fallback)();
  }, { capture: true });

  btn.dataset._wiredFallback = '1';
}

window.addEventListener('DOMContentLoaded', async () => {
  // Läs ev. highscore (tål nätfel)
  try { if (hsReadFromSheet) await hsReadFromSheet(); } catch {}
  renderHighscores?.();
  renderHSBoard?.();

  // Knyt knappar via UI
  bindCoreButtonsOnce?.();

  // Extra – binda start om något gick snett i UI
  wireStartFallback();

  // Förbered UI om någon landar direkt i appen
  updateTop?.();
  renderOwned?.();

  // Liten sanity-logg
  try {
    console.info('[main] startGame typ:', typeof window.startGame);
  } catch {}
});

// Debughjälp i konsolen
try {
  window.__tapajos = { state, ui, hs, game, market, loans, social, economy, eventsMod, config };
} catch {}
