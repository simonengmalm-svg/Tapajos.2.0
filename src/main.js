// ./src/main.js

// 1) Ladda alla sidomoduler så deras side-effects (t.ex. window-funktioner, state mm) finns.
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

// 2) Hjälpare för att hämta funktioner oavsett export-sätt (named export eller window.*)
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
    if (renderHighscores) renderHighscores();
    if (renderHSBoard)    renderHSBoard();
  } catch (e) {
    console.warn('[HS] init-läsning misslyckades', e);
  }

  // Binda alla core-knappar (övriga knappar bindas inne i ui.js)
  if (bindCoreButtonsOnce) bindCoreButtonsOnce();

  // Start-knappen: läs profil, spara (om kryssad), göm splash & rendera UI
  const startBtn = document.getElementById('startBtn');
  if (startBtn && !startBtn.dataset.bound) {
    startBtn.addEventListener('click', () => {
      const nameInp  = document.getElementById('startName');
      const compInp  = document.getElementById('startCompany');
      const remember = document.getElementById('rememberProfile');

      const name    = (nameInp?.value || '').trim() || 'Spelare';
      const company = (compInp?.value || '').trim();

      state.player = { name, company };

      if (remember?.checked) {
        try { localStorage.setItem('tapajos-profile-v1', JSON.stringify({ name, company })); } catch {}
      }

      if (showAppHideSplash) showAppHideSplash();
      if (updateTop)   updateTop();
      if (renderOwned) renderOwned();
      // Valfritt: rendera HS i end-modal listan direkt
      if (renderHighscores) renderHighscores();
      if (renderHSBoard)    renderHSBoard();
    });
    startBtn.dataset.bound = '1';
  }

  // Highscore-knappar på splash/topbar
  const hsBtn1 = document.getElementById('openHS');
  if (hsBtn1 && !hsBtn1.dataset.bound) {
    hsBtn1.addEventListener('click', async () => {
      try { if (hsReadFromSheet) await hsReadFromSheet(); } catch {}
      if (openHSModal) openHSModal();
    });
    hsBtn1.dataset.bound = '1';
  }

  const hsBtn2 = document.getElementById('openHSStart');
  if (hsBtn2 && !hsBtn2.dataset.bound) {
    hsBtn2.addEventListener('click', async () => {
      try { if (hsReadFromSheet) await hsReadFromSheet(); } catch {}
      if (openHSModal) openHSModal();
    });
    hsBtn2.dataset.bound = '1';
  }

  const hsClose = document.getElementById('hsClose');
  if (hsClose && !hsClose.dataset.bound) {
    hsClose.addEventListener('click', () => { if (closeHSModal) closeHSModal(); });
    hsClose.dataset.bound = '1';
  }

  // Fallback: om någon går direkt till spelet
  if (updateTop)   updateTop();
  if (renderOwned) renderOwned();
  if (renderHighscores) renderHighscores();
  if (renderHSBoard)    renderHSBoard();
});

// 4) Liten debughjälp i konsolen
try {
  window.__tapajos = {
    state,
    config,
    ui, hs, game, market, loans, social, economy, eventsMod
  };
  console.info('[Tapajos] Main.js init klart');
} catch {}
