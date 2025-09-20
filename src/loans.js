import { state, uuid } from './state.js';

export function perPeriodRate(){ return state.rate; }
export function termPeriods(){ return 30; }

export function annuityPayment(P,r,n){
  if (r<=0) return Math.round(P/Math.max(1,n));
  const a = P*r / (1 - Math.pow(1+r, -n));
  return Math.round(a);
}

export function createLoan(principal, off){
  const r = perPeriodRate() + 0.015;
  const n = termPeriods();
  const pmt = annuityPayment(principal, r, n);
  const loan = { id: uuid(), principal, balance: principal, rate:r, term:n, remaining:n, payment:pmt, propHint: off?.propHint || '' };
  state.loans.push(loan); return loan;
}

export const totalDebt = () => state.loans.reduce((s,l)=>s+l.balance,0);

export function extraAmort(loanId, amt=200000){
  const loan = state.loans.find(l=>l.id===loanId); if (!loan) return false;
  if (state.cash < amt) return false;
  state.cash -= amt; loan.balance = Math.max(0, loan.balance - amt);
  return true;
}

export function settleLoanOnExit(b, proceeds){
  if (!b.loanId) return proceeds;
  const loan = state.loans.find(l=>l.id===b.loanId); if (!loan) return proceeds;
  const payoff = loan.balance; loan.balance = 0;
  return Math.max(0, proceeds - payoff);
}

Object.assign(window, {
  createLoan,
  extraAmort,
  totalDebt,
  settleLoanOnExit,
});