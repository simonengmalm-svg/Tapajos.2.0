// ./src/main.js
// Ladda modulerna så både named-exports och window.* finns
import * as config      from './config.js';      // valfritt
import * as stateMod    from './state.js';
import './anekdoter.js';                         // valfritt
import * as economy     from './economy.js';     // valfritt
import * as social      from './social.js';      // valfritt
import * as loans       from './loans.js';       // valfritt
import * as eventsMod   from './events.js';      // valfritt
import * as market      from './market.js';
import * as ui          from './ui.js';
import * as hs          from './highscore.js';
import * as game        from './game.js';

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

window.addEventListener('DOMContentLoaded', async () => {
  // Läs ev. HS (tål nätfel)
  try { if (hsReadFromSheet) await hsReadFromSheet(); } catch {}
  renderHighscores?.(); renderHSBoard?.();

  // Knyt knappar
  bindCoreButtonsOnce?.();

  // Förbered UI om någon landar direkt i appen
  updateTop?.(); renderOwned?.();
});

// Lite debughjälp
try { window.__tapajos = { state, ui, hs, game, market, loans, social, economy, eventsMod, config }; } catch {}
