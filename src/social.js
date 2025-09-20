import { pick, currentYear } from './state.js';
import { ANEKD } from './anekdoter.js';

export function statusOf(b) {
  if (b.consent >= 70 && b.sat >= 70 && b.cond === 'ny') return 'Klar för ombildning';
  if (b.sat < 40)  return 'Oro i föreningen';
  if (b.sat < 60)  return 'Skört läge';
  return 'Stabilt';
}
export const condScore = (b) => (b.cond === 'ny' ? 100 : b.cond === 'sliten' ? 60 : 30);

export function initSocial(b){
  b.sat = Math.floor(60 + (b.cond === 'ny' ? +15 : b.cond === 'sliten' ? -10 : -20) + (b.central ? +5 : 0));
  b.consent = Math.max(0, Math.min(100, Math.floor(b.sat - 10 + (b.cond === 'ny' ? +10 : 0))));
  b.status = statusOf(b);

  b.maintMult = 1.0;
  b.rentBoost = 0;
  b.valueBoost = 0;
  b.project = null;

  b.anekdot = pick(ANEKD[b.tid] || []);
  b.nextRenovTick = 0;
  b.converting = null;

  b.eventYear = currentYear();
  b.eventsUsed = 0;
  b.eventsCap = (Math.random() < 0.35 ? 2 : 1);

  b.energyUpgrades = 0;
  b.energyUpgradesMax = 3;

  b.negYear = currentYear();
  b.negUsed = false;
}