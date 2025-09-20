export const CONDITIONS = ['ny', 'sliten', 'forfallen'];

export const TYPES = {
  landsh: { name: 'Landshövdingehus', sqmPerUnit: 55, rentPerSqmYr: 1400, maintUnit: 2000, price: [8000000, 15000000], units: [6, 18], cls: 'T-landsh',  centralMult: 1.06, suburbMult: 0.98 },
  funkis: { name: 'Funkis',       sqmPerUnit: 62, rentPerSqmYr: 1450, maintUnit: 2300, price: [12000000, 20000000], units: [8, 24], cls: 'T-funkis',  centralMult: 1.08, suburbMult: 0.97 },
  miljon: { name: 'Miljonprogram',sqmPerUnit: 70, rentPerSqmYr: 1350, maintUnit: 2600, price: [25000000, 50000000], units: [24, 80], cls: 'T-miljon',  centralMult: 1.03, suburbMult: 0.96 },
  nyprod: { name: 'Nyproduktion', sqmPerUnit: 70, rentPerSqmYr: 1600, maintUnit: 2900, price: [35000000, 80000000], units: [20, 60], cls: 'T-nyprod',  centralMult: 1.10, suburbMult: 0.98 },
  gamlastan:{name:'Gamla stan',   sqmPerUnit: 52, rentPerSqmYr: 1550, maintUnit: 2700, price: [15000000, 30000000], units: [6, 20],  cls: 'T-gamlastan', centralMult: 1.12, suburbMult: 1.00 }
};

export const state = {
  cash: 10_000_000,
  month: 1,                // 1 år = 1 period
  rate: 0.03,              // styrränta (års)
  market: 1.00,            // marknadsmultipel
  capRate: 0.045,
  owned: [],
  loans: [],
  pendingCash: [],
  player: { name: '', company: '' },
  marketPool: [],
  marketYear: 0
};

// helpers
export const currentYear = () => state.month;
export const fmt  = (n) => new Intl.NumberFormat('sv-SE').format(Math.round(n));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const uuid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : ('id-' + Math.random().toString(36).slice(2));
export const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

export const condFactor     = (c) => (c === 'ny' ? 1.0 : c === 'sliten' ? 0.85 : 0.7);
export const condMaintMult  = (c) => (c === 'forfallen' ? 1.3 : c === 'sliten' ? 1.0 : 0.8);

export function note(msg) {
  const el = document.getElementById('notes');
  if (el) el.textContent = msg;
}

export const barFillClass = (v) => (v >= 70 ? 'good' : v >= 40 ? 'mid' : 'bad');

// se till att spelets state går att nå
window.state = window.state || state;