// Enkel state
export const state = {};

// Funktion som körs när spelet startas
export function startGame() {
  console.log("startGame() körs ✅");

  state.player = state.player || {};
  state.notes  = state.notes  || [];
  state.owned  = state.owned  || [];

  if (state.cash   == null) state.cash   = 10_000_000;
  if (state.debt   == null) state.debt   = 0;
  if (state.rate   == null) state.rate   = 3.0;
  if (state.market == null) state.market = 1.00;
  if (state.year   == null) state.year   = 1;

  // Visa appen
  const splash = document.getElementById("splash");
  const app    = document.getElementById("appWrap");
  if (splash) splash.style.display = "none";
  if (app)    app.style.display    = "block";

  document.getElementById("cash").textContent    = state.cash.toLocaleString("sv-SE");
  document.getElementById("debtTop").textContent = state.debt.toLocaleString("sv-SE");
  document.getElementById("yearNow").textContent = state.year;
  document.getElementById("market").textContent  = state.market.toFixed(2) + "×";
  document.getElementById("rate").textContent    = state.rate.toFixed(1);
}

// Exponera globalt för HTML onclick
Object.assign(window, { startGame });
