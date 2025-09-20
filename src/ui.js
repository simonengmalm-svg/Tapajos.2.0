import { state, fmt, barFillClass } from './state.js';
import { TYPES } from './state.js';
import { effectiveRent, effectiveMaint, valuation } from './economy.js';
import { totalDebt } from './loans.js';
import { condScore } from './social.js';

export function updateTop(){
  const cashEl = document.getElementById('cash');
  const marketEl = document.getElementById('market');
  const rateEl = document.getElementById('rate');
  const debtTopEl = document.getElementById('debtTop');
  if (cashEl)    cashEl.textContent = fmt(state.cash);
  if (marketEl)  marketEl.textContent = state.market.toFixed(2) + '×';
  if (rateEl)    rateEl.textContent = (state.rate*100).toFixed(1);
  if (debtTopEl) debtTopEl.textContent = fmt(totalDebt());
  const y = document.getElementById('yearNow'); if (y) y.textContent = Math.min(15, state.month);
}

function bar(val) {
  const v = Math.max(0, Math.min(100, Math.round(val)));
  const wrap = document.createElement('div');
  wrap.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'fill ' + barFillClass(v);
  fill.style.width = v + '%';
  wrap.appendChild(fill);
  return wrap;
}

function mkBarRow(label, value) {
  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '120px 1fr';
  row.style.alignItems = 'center';
  row.style.gap = '10px';
  const lbl = document.createElement('div');
  lbl.textContent = label;
  lbl.className = 'meta';
  row.append(lbl, bar(value));
  return row;
}

export function renderOwned(){
  const propsEl = document.getElementById('props');
  if (!propsEl) return;
  propsEl.innerHTML = '';

  if (!state.owned.length){
    propsEl.innerHTML = '<div class="meta">Du äger inga fastigheter ännu. Klicka på “Fastighetsmarknad”.</div>';
    return;
  }

  state.owned.forEach((b) => {
    const t = TYPES[b.tid];

    const card = document.createElement('div');
    card.className = 'card';

    const icon = document.createElement('div');
    icon.className = `icon ${t.cls} C-${b.cond}`;

    const condTxt = (b.cond === 'forfallen') ? 'förfallen' : b.cond;

    const text = document.createElement('div');
    text.innerHTML =
      `<div class="row"><b>${t.name}</b> ${b.central ? '• Centralt' : '• Förort'} • Lgh: <b>${b.units || b.baseUnits || '?'}</b></div>
       <div class="meta">Skick: ${condTxt} • ${b.anekdot || ''}</div>
       <div class="meta">Hyra/år ~ ${fmt(effectiveRent(b)*12)} kr • Drift/år ~ ${fmt(effectiveMaint(b)*12)} kr</div>
       <div class="price">Värde ~ ${fmt(valuation(b))} kr</div>`;

    const chips = document.createElement('div');
    chips.className = 'chips';

    if (b.status){
      const chip  = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = b.status;
      chips.appendChild(chip);
    }

    if (b.project){
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = `Projekt: ${b.project.name} (${b.project.duration} kvar)`;
      chips.appendChild(c);
    }
    if (b.converting){
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = `Ombildning pågår (${b.converting.duration} kvar)`;
      chips.appendChild(c);
    }
    if (b.loanId){
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = `Lån kopplat`;
      chips.appendChild(c);
    }

    const bars = document.createElement('div');
    bars.style.display = 'flex';
    bars.style.flexDirection = 'column';
    bars.style.gap = '6px';
    bars.append(mkBarRow('Nöjdhet', b.sat));
    bars.append(mkBarRow('Skick',   condScore(b)));

    card.append(icon, text, chips, bars);
    propsEl.appendChild(card);
  });
}

Object.assign(window, {
  bindCoreButtonsOnce,
  showAppHideSplash,
  renderOwned,
  updateTop,        // om den ligger i ui.js hos dig
  note,             // om andra vill anropa denna
});