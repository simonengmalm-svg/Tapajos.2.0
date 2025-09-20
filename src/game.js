import { state, currentYear, note } from './state.js';
import { generateYearMarket } from './market.js';
import { effectiveRent, effectiveMaint, valuation } from './economy.js';
import { statusOf } from './social.js';
import { totalDebt, annuityPayment } from './loans.js';
import { rollEvent } from './events.js';
import { saveHighscore } from './highscore.js';
import { fmt } from './state.js';
import { TYPES } from './state.js';

export function ensureYearCounters(b){
  const cy = currentYear();
  if (b.eventYear !== cy){ b.eventYear = cy; b.eventsUsed = 0; b.eventsCap = (Math.random()<0.35?2:1); }
  if (b.negYear !== cy){ b.negYear = cy; b.negUsed = false; }
}

export function updateTopbar(){
  const cashEl = document.getElementById('cash');
  const marketEl = document.getElementById('market');
  const rateEl = document.getElementById('rate');
  const debtTopEl = document.getElementById('debtTop');
  if (cashEl)    cashEl.textContent = fmt(state.cash);
  if (marketEl)  marketEl.textContent = state.market.toFixed(2) + '×';
  if (rateEl)    rateEl.textContent = (state.rate*100).toFixed(1);
  if (debtTopEl) debtTopEl.textContent = fmt(totalDebt());
  const y = document.getElementById('yearNow'); if (y) y.textContent = Math.min(15, currentYear());
}

export function nextPeriod(){
  state.month++;

  // likvider
  if (Array.isArray(state.pendingCash) && state.pendingCash.length){
    const y = state.month; let total=0, rest=[], labels=[];
    for (const p of state.pendingCash){ if (p.year <= y){ total += p.amount; labels.push(p.label||'Likvid'); } else rest.push(p); }
    state.pendingCash = rest;
    if (total>0){ state.cash += total; note(`Inkommande likvid: ${fmt(total)} kr${labels.length? ' ('+labels.join(', ')+')' : ''}`); }
  }

  // marknadsdrift
  const drift = (Math.random()-0.5)*0.06;
  state.market = Math.max(0.85, Math.min(1.25, state.market*(1+drift)));

  // styrränta driver mot capRate-baserat mål
  {
    const target = Math.max(0.005, Math.min(0.12, 0.03 + 0.8*(state.capRate - 0.045)));
    const alpha  = 0.25;
    const noise  = (Math.random()-0.5)*0.003;
    const next   = state.rate + alpha*(target - state.rate) + noise;
    state.rate   = Math.max(0.005, Math.min(0.12, next));
  }

  // nytt utbud
  generateYearMarket(4);

  // räkna fastigheter
  let rent=0, maint=0, interest=0, amort=0;
  for (let i=state.owned.length-1; i>=0; i--){
    const b = state.owned[i];
    ensureYearCounters(b);

    if (b.converting){ b.converting.duration--; if (b.converting.duration<=0){ completeBRF(i,b); continue; } }
    if (b.project){
      b.project.duration--;
      if (b.project.duration<=0){
        if (b.project.name==='Vindskonvertering'){
          const add=b.project.addUnits||0;
          b.units=(b.units||b.baseUnits||0)+add;
          b.rentBoost=(b.rentBoost||0)+0.05;
          b.valueBoost=(b.valueBoost||0)+0.05;
          b.sat=Math.min(100,b.sat+6); b.consent=Math.min(100,b.consent+3);
        }
        b.project=null;
      }
    }

    rent  += effectiveRent(b)*12;
    maint += effectiveMaint(b)*12;

    if (Math.random()<0.12 && b.cond!=='forfallen'){ b.cond = (b.cond==='ny'?'sliten':'forfallen'); b.sat=Math.max(0,b.sat-6); }
    b.sat = Math.max(0, Math.min(100, Math.round(b.sat + (b.cond==='ny'?+1: b.cond==='sliten'?0:-1))));
    b.consent = Math.max(0, Math.min(100, Math.round(b.consent + (b.sat - 50)/200 )));
    b.status = statusOf(b);
  }

  // lån – mjuk justering
  state.loans.forEach(l=>{
    if (l.balance<=0) return;
    if (!Number.isFinite(l.remaining)) l.remaining = Math.max(1, (l.term||30));
    const target = (Number(state.rate)||0.03)+0.015;
    const alpha  = 0.35;
    l.rate = Math.max(0.005, Math.min(0.12, l.rate + alpha*(target - l.rate)));
    const rem = Math.max(1, Math.round(l.remaining));
    const newPayment = annuityPayment(l.balance, l.rate, rem);
    const prevPay = l.payment || newPayment;
    l.payment = Math.max(prevPay*0.85, Math.min(prevPay*1.15, newPayment));
    const int = Math.round(l.balance * l.rate);
    let princ = Math.min(l.payment - int, l.balance); if (princ<0) princ = 0;
    l.balance = Math.max(0, l.balance - princ);
    if (princ>0 && l.remaining>0) l.remaining -= 1;
    interest += int; amort += princ;
  });

  const pnl = rent - maint - interest - amort;
  state.cash += pnl;

  const pnlEl=document.getElementById('pnl');
  const rentEl=document.getElementById('rent');
  const maintEl=document.getElementById('maint');
  if (pnlEl) pnlEl.textContent = fmt(pnl) + ' kr';
  if (rentEl) rentEl.textContent = fmt(rent) + ' kr';
  if (maintEl) maintEl.textContent = fmt(maint) + ' kr';
  const intEl=document.getElementById('interest'); if (intEl) intEl.textContent = fmt(interest)+' kr';
  const amoEl=document.getElementById('amort');    if (amoEl) amoEl.textContent = fmt(amort)+' kr';
  const debEl=document.getElementById('debt');     if (debEl) debEl.textContent = fmt(totalDebt()) + ' kr';

  updateTopbar();
  rollEvent();

  if (currentYear() > 15) endGame();
}

export function calcNetWorth(){
  const propVal = state.owned.reduce((s,b)=> s + valuation(b), 0);
  return Math.round(state.cash + propVal - totalDebt());
}
export function summarizeEnd(){
  const worth = calcNetWorth();
  const props = state.owned.length;
  const avgSat = props ? Math.round(state.owned.reduce((s,b)=>s+b.sat,0)/props) : 0;
  return { worth, props, avgSat, year: Math.min(15, currentYear()) };
}

// Exponera summarizeEnd globalt för highscore-modulen
window.summarizeEnd = summarizeEnd;

export function endGame(){
  const s = summarizeEnd();
  const sumEl = document.getElementById('endSummary');
  if (sumEl){
    sumEl.innerHTML = `Nettoförmögenhet: <b>${fmt(s.worth)}</b> kr<br>
                       Fastigheter: <b>${s.props}</b> • Snittnöjdhet: <b>${s.avgSat}%</b>`;
  }
  // autosave
  saveHighscore();
  const end = document.getElementById('endModal');
  if (end) end.style.display='flex';
}

// Hjälp
function completeBRF(i,b){
  const premium = 1.35;
  state.cash += Math.round(valuation(b) * premium);
  state.owned.splice(i,1);
  note('Ombildning klar. Likvid insatt.');
}

Object.assign(window, {
  startGame,
  nextPeriod,
  updateTop,        // om den definieras här hos dig
});