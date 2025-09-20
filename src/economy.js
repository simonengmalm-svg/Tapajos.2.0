import { TYPES, state, condFactor, condMaintMult } from './state.js';

export function priceOf(tid, cond, central) {
  const [min, max] = TYPES[tid].price;
  const condF = condFactor(cond);
  const centF = central ? 1.2 : 0.9;
  const base = min + Math.random() * (max - min);
  return Math.round(base * condF * centF * state.market);
}

export function baseMonthlyPerUnit(t) {
  if (typeof t.rentUnit === 'number' && t.rentUnit > 0) return t.rentUnit;
  const sqm  = t.sqmPerUnit  || 65;
  const krYr = t.rentPerSqmYr|| 1400;
  return Math.round((sqm * krYr) / 12);
}

export function effectiveRent(b) {
  const t = TYPES[b.tid];
  const units   = (b.units || b.baseUnits || 10);
  const basePU  = baseMonthlyPerUnit(t);
  const condF   = condFactor(b.cond);
  const locF    = b.central ? (t.centralMult || 1.06) : (t.suburbMult || 0.98);
  const boostF  = 1 + (b.rentBoost || 0);
  return Math.round(basePU * condF * locF * boostF * units);
}

export function effectiveMaint(b) {
  const t = TYPES[b.tid];
  const mult = (b.maintMult || 1) * condMaintMult(b.cond);
  return Math.round(t.maintUnit * mult * (b.units || b.baseUnits || 10));
}

export function valuation(b) {
  const base = (b.basePrice || priceOf(b.tid, b.cond, b.central));
  const fCond = condFactor(b.cond) / condFactor(b.baseCond || b.cond);
  const fMkt  = state.market / (b.baseMarket || 1.0);
  const baseVal = Math.round(base * fCond * fMkt * (1 + (b.valueBoost || 0)));

  const t = TYPES[b.tid];
  const units = b.units || b.baseUnits || 10;
  const condMult = condMaintMult(b.cond);

  const baseMaintAnnual   = t.maintUnit * units * condMult * 12;
  const withEnergyAnnual  = baseMaintAnnual * (b.maintMult || 1.0);
  const savingsAnnual     = Math.max(0, baseMaintAnnual - withEnergyAnnual);
  const energyUpliftValue = Math.round(savingsAnnual / (state.capRate || 0.045));

  const baseUnits   = b.baseUnits ?? units;
  const extraUnits  = Math.max(0, units - baseUnits);
  const basePerUnit = baseMonthlyPerUnit(t);
  const locF        = b.central ? (t.centralMult || 1.06) : (t.suburbMult || 0.98);
  const condF       = condFactor(b.cond);
  const annualNetPerUnit =
    (basePerUnit * (1 + (b.rentBoost || 0)) * condF * locF * 12)
    - (t.maintUnit * (b.maintMult || 1) * condMult * 12);
  const unitUpliftValue = Math.round(Math.max(0, annualNetPerUnit * extraUnits) / (state.capRate || 0.045));

  return baseVal + energyUpliftValue + unitUpliftValue;
}