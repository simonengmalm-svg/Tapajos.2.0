// src/main.js

// 1) Ladda alla sidomoduler så deras side-effects (window-funktioner, state mm) finns.
import * as config     from './config.js';
import * as stateMod   from './state.js';
import './anekdoter.js';
import * as economy    from './economy.js';
import * as social     from './social.js';
import * as loans      from './loans.js';
import * as eventsMod  from './events.js';
import * as market     from './market.js';
import * as ui         from './ui.js';
import * as hs         from './highscore.js';
import * as game       from './game.js';

// 2) Hjälpare för att hämta funktioner oavsett export-sätt
const pickFn = (...candidates) => candidates.find(fn => typeof fn === 'function');

// Plocka state
const state = stateMod?.state || window.state || { player: {} };

// UI-funktioner
const bindCoreButtonsOnce = pickFn(ui?.bindCoreButtonsOnce, window.bindCoreButtonsOnce);
const showAppHideSplash   = pickFn(ui?.showAppHideSplash,   window.showAppHideSplash);
const renderOwned         = pickFn(ui?.renderOwned,         window.renderOwned);
const updateTop           = pickFn(ui?.updateTop,           window.updateTop);

// Highscore-funktioner
const hsReadFromSheet     = pickFn(hs?.hsReadFromSheet,     window.hsReadFromSheet);
const renderHighscores    = pickFn(hs?.renderHighscores,    window.renderHighscores);
const renderHSBoard       = pickFn(hs?.renderHSBoard,       window.renderHSBoard);
const openHSModal         = pickFn(hs?.openHSModal,         window.openHSModal);
const closeHSModal        = pickFn(hs?.closeHSModal,        window.closeHSModal);

// 3) Init när DOM är redo
window.addEventListener('DOMContentLoaded', async () => {
  // Versionstagg om du har ett element för det
  try {
    const ver = (config?.GAME_VERSION) ?? (window.GAME_VERSION) ?? (state.version) ?? '1.x';
    const verTag = document.getElementById('hsVersionTag');
    if (verTag) verTag.textContent = 'Version ' + ver;
  } catch {}

  // Läs highscore-tavla direkt (tål nätfel)
  try {
    if (hsReadFromSheet) await hsReadFromSheet();
    renderHighscores?.();
    renderHSBoard?.();
  } catch (e) {
    console.warn('[HS] init-läsning misslyckades', e);
  }

  // Binda core-knappar (övriga binds sker i ui.js)
  bindCoreButtonsOnce?.();

  // Highscore close-knapp (om finns)
  const hsClose = document.getElementById('hsClose');
  if (hsClose && !hsClose.dataset.bound) {
    hsClose.addEventListener('click', () => { closeHSModal?.(); });
    hsClose.dataset.bound = '1';
  }

  // Fallback-rendering
  updateTop?.();
  renderOwned?.();
  renderHighscores?.();
  renderHSBoard?.();
});

// 4) Liten debughjälp i konsolen
try {
  window.__tapajos = { state, config, ui, hs, game, market, loans, social, economy, eventsMod };
  console.info('[Tapajos] Main.js init klart');
} catch {}
