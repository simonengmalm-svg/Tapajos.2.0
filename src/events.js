import * as market from './market.js';
import { state, pick, randInt } from './state.js';
import { TYPES } from './state.js';
import { effectiveRent, effectiveMaint } from './economy.js';
import { statusOf } from './social.js';

export const EVENTS = [
  { id:'water', name:'Vattenläcka', prob:0.18,
    pick:(st)=> st.owned.length ? randInt(0, st.owned.length-1) : null,
    text:(b)=>`Vattenläcka i ${TYPES[b.tid].name}. Risk för följdskador och missnöje.`,
    actions:(i)=>{ const b=state.owned[i]; const cost=Math.round(60000*((b.units||b.baseUnits||10)/10));
      return [
        { label:`Åtgärda nu`, run:()=>{ if(state.cash<cost){alert('Otillräcklig kassa.');return;} state.cash-=cost; b.sat=Math.min(100,b.sat+4); b.status=statusOf(b); closeEvent(); } },
        { label:'Vänta (risk)', run:()=>{ if(Math.random()<0.6){ b.cond = (b.cond==='ny'?'sliten':'forfallen'); b.sat=Math.max(0,b.sat-10); } closeEvent(); } }
      ];
    }
  },
  { id:'union', name:'Hyresgästföreningsärende', prob:0.14,
    pick:(st)=> st.owned.length ? randInt(0, st.owned.length-1) : null,
    text:(b)=>`Missnöjda hyresgäster driver ärende i ${TYPES[b.tid].name}.`,
    actions:(i)=>{ const b=state.owned[i]; const comp=5000;
      return [
        { label:`Kompensation`, run:()=>{ const tot=Math.round(comp*(b.units||b.baseUnits||10)); if(state.cash<tot){alert('Otillräcklig kassa.');return;} state.cash-=tot; b.sat=Math.min(100,b.sat+10); b.consent=Math.min(100,b.consent+6); closeEvent(); } },
        { label:'Ta förhandling', run:()=>{ closeEvent(); document.getElementById('negModal')?.style && (document.getElementById('negModal').style.display='flex'); } }
      ];
    }
  },
  { id:'market', name:'Marknadschock', prob:0.12,
    pick:()=>null,
    text:()=> 'Rörelser på kapitalmarknaden påverkar värderingar.',
    actions:()=>{ const d=(Math.random()<0.5?-1:+1)*(0.02+Math.random()*0.04);
      return [{ label: d>0 ? `Boom` : `Nedgång`,
        run:()=>{ state.market = Math.max(0.80, Math.min(1.35, state.market*(1+d))); closeEvent(); } }];
    }
  },
  { id:'press', name:'Positiv press', prob:0.12,
    pick:(st)=> st.owned.length ? randInt(0, st.owned.length-1) : null,
    text:(b)=>`Lokaltidningen hyllar ${TYPES[b.tid].name}.`,
    actions:(i)=>{ const b=state.owned[i];
      return [{ label:'Härligt', run:()=>{ b.valueBoost=(b.valueBoost||0)+0.03; b.sat=Math.min(100,b.sat+5); closeEvent(); } }];
    }
  },
  { id:'policy', name:'Policyförändring', prob:0.10,
    pick:()=>null,
    text:()=> 'Regelförändring påverkar direktavkastningskravet.',
    actions:()=>{ const shift=(Math.random()<0.5?-1:+1)*0.005;
      return [{ label: shift<0 ? `Lägre cap rate` : `Högre cap rate`,
        run:()=>{ state.capRate=Math.max(0.02, Math.min(0.08, state.capRate+shift)); closeEvent(); } }];
    }
  }
];

export function openEvent(ev, idx){
  const m=document.getElementById('eventModal'); if(!m) return;
  const title=document.getElementById('evTitle'); const text=document.getElementById('evText'); const acts=document.getElementById('evActions');
  title.textContent=ev.name;
  const b = (idx!=null && state.owned[idx]) ? state.owned[idx] : null;
  text.textContent = b ? ev.text(b) : (typeof ev.text==='function'?ev.text():'');
  acts.innerHTML='';
  ev.actions(idx).forEach(a=>{ const btn=document.createElement('button'); btn.className='btn mini'; btn.textContent=a.label; btn.onclick=a.run; acts.appendChild(btn); });
  m.style.display='flex';
}
export function closeEvent(){ const m=document.getElementById('eventModal'); if(m) m.style.display='none'; }

export function rollEvent(){
  const baseP = 0.35; if (Math.random() > baseP) return;
  const pool = EVENTS.filter(e=> Math.random()<e.prob);
  const ev = pool.length ? pick(pool) : pick(EVENTS);
  const target = (typeof ev.pick==='function') ? ev.pick(state) : null;
  if (target===null && ev.pick) return;
  openEvent(ev, target);
}

Object.assign(window, {
  openEvent,
  closeEvent,
  rollEvent,
});
