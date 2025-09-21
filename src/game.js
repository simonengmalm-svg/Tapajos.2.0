// Minimal state och start – allt på plats
export const state = {};

export function startGame() {
  try {
    console.log('startGame() körs ✅');

    state.player = state.player || {};
    state.notes  = state.notes  || [];
    state.owned  = state.owned  || [];

    if (state.cash   == null) state.cash   = 10_000_000;
    if (state.debt   == null) state.debt   = 0;
    if (state.rate   == null) state.rate   = 3.0;
    if (state.market == null) state.market = 1.00;
    if (state.year   == null) state.year   = 1;

    // Visa appen / göm splash
    const splash = document.getElementById('splash');
    const app    = document.getElementById('appWrap');
    if (splash) splash.style.display = 'none';
    if (app)    app.style.display    = 'block';

    // Rendera top
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
    set('cash',    Number(state.cash||0).toLocaleString('sv-SE'));
    set('debtTop', Number(state.debt||0).toLocaleString('sv-SE'));
    set('yearNow', String(state.year||1));
    set('market',  (Number(state.market||1).toFixed(2)) + '×');
    set('rate',    (Number(state.rate||0).toFixed(1)));

    // Enkel “du har inga fastigheter”-text
    const props = document.getElementById('props');
    if (props) props.textContent = 'Du äger inga fastigheter ännu.';

  } catch (e) {
    console.error('startGame fel:', e);
    alert('Kunde inte starta spelet: ' + e.message);
  }
}

// exponera globalt (för inline onclick och nödbindning)
Object.assign(window, { startGame });
