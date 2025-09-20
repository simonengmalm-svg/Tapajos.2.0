import { SHEET_CSV_URL, FORM_ACTION, HS_FIELDS, HS_KEY, HS_RAW_KEY, GAME_VERSION } from './config.js';
import { state, fmt } from './state.js';

// CSV helpers
const csvSplit = (line) => {
  const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
  return parts.map(s => {
    s = (s ?? '').trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"');
    return s;
  });
};
const norm = s => (s || '').toString().trim().toLowerCase();

// header-index (tål kolumnordning)
function buildIndex(headerCells) {
  const find = (...patterns) => headerCells.findIndex(h => {
    const x = norm(h);
    return patterns.some(p => p.test(x));
  });
  return {
    ts:     find(/tidst[aä]mpel|timestamp|time/i),
    name:   find(/^name$|namn/i),
    company:find(/^company$|f[öo]retag/i),
    score:  find(/^score$|nettof.*|v[äa]rde|worth|nettof[oö]rmögenhet/i),
    props:  find(/^props?$/i),
    avgSat: find(/^avgsat$|avg.?sat|snittn[oö]jd/i),
    year:   find(/^year$|[aå]r/i),
    ver:    find(/^ver$|version/i),
  };
}

// tidstolkning
function parseTimestamp(tsStr) {
  if (!tsStr) return null;
  const normalized = tsStr.replace(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2})\.(\d{2})\.(\d{2})$/,
    (_m, d, hh, mm, ss) => `${d} ${hh}:${mm}:${ss}`
  );
  let t = Date.parse(normalized);
  if (!Number.isNaN(t)) return t;
  t = Date.parse(normalized.replace(' ', 'T'));
  if (!Number.isNaN(t)) return t;
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [_, y, mo, d, h, mi, s] = m;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  }
  return null;
}

function topPerName(rows) {
  const best = new Map();
  for (const r of rows) {
    const k = norm(r.name);
    const cur = best.get(k);
    if (!cur || r.score > cur.score || (r.score === cur.score && (r.tsMs ?? 0) > (cur.tsMs ?? 0))) {
      best.set(k, r);
    }
  }
  return Array.from(best.values());
}

// Läsning (filtrerar på GAME_VERSION)
export async function hsReadFromSheet() {
  const r = await fetch(`${SHEET_CSV_URL}?_=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HS fetch failed: ${r.status}`);
  const text = await r.text();

  const lines = text.replace(/^\uFEFF/, '').trim().split('\n');
  if (lines.length === 0) {
    localStorage.setItem(HS_RAW_KEY, '[]');
    localStorage.setItem(HS_KEY, '[]');
    return { raw: [], unique: [] };
  }

  const header = csvSplit(lines[0]);
  const ix = buildIndex(header);

  const rawAll = lines.slice(1).map(line => {
    const c = csvSplit(line);
    const get = i => (i >= 0 && i < c.length) ? c[i] : '';

    const tsStr    = get(ix.ts);
    const scoreStr = String(get(ix.score)  || '').replace(/[^\d-]/g, '');
    const propsStr = String(get(ix.props)  || '').replace(/[^\d-]/g, '');
    const avgStr   = String(get(ix.avgSat) || '').replace(/[^\d-]/g, '');
    const yearStr  = String(get(ix.year)   || '').replace(/[^\d-]/g, '');

    return {
      ts:     tsStr,
      tsMs:   parseTimestamp(tsStr),
      name:   get(ix.name) || 'Spelare',
      company:get(ix.company) || '',
      score:  Number(scoreStr) || 0,
      props:  Number(propsStr) || 0,
      avgSat: Number(avgStr)   || 0,
      year:   Number(yearStr)  || 0,
      ver:    (get(ix.ver) || '').toString().trim()
    };
  }).filter(r => r.name && Number.isFinite(r.score));

  const raw = rawAll.filter(r => r.ver === GAME_VERSION);

  try { localStorage.setItem(HS_RAW_KEY, JSON.stringify(raw)); } catch {}
  const unique = topPerName(raw)
    .sort((a,b)=> b.score - a.score || (b.tsMs ?? 0) - (a.tsMs ?? 0))
    .map(x => ({ name: x.name, company: x.company, score: x.score, ts: x.ts, tsMs: x.tsMs }));

  try { localStorage.setItem(HS_KEY, JSON.stringify(unique)); } catch {}

  return { raw, unique };
}

export function getDisplayList() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(HS_KEY) || '[]'); } catch {}
  if (!Array.isArray(list)) list = [];
  const topped = topPerName(list.map(x => ({
    ...x,
    tsMs: (typeof x.tsMs === 'number' && !Number.isNaN(x.tsMs))
            ? x.tsMs
            : (x.ts ? parseTimestamp(x.ts) : null)
  })))
  .sort((a,b)=> b.score - a.score || (b.tsMs ?? 0) - (a.tsMs ?? 0));
  return topped;
}

export function renderHighscores() {
  const box = document.getElementById('hsList'); if (!box) return;
  const top = getDisplayList().slice(0, 10);
  box.innerHTML = top.length
    ? '<ol>' + top.map(it => {
        const dateStr = it.tsMs ? new Date(it.tsMs).toLocaleDateString('sv-SE') : '';
        const comp = it.company ? ` — <span class="meta">${it.company}</span>` : '';
        return `<li><b>${fmt(it.score)}</b> kr — ${it.name}${comp} <span class="meta">(${dateStr})</span></li>`;
      }).join('') + '</ol>'
    : `Inga resultat sparade ännu (v${GAME_VERSION}).`;
}

export function renderHSBoard() {
  const host = document.getElementById('hsBoard'); if (!host) return;
  const top = getDisplayList().slice(0, 10);
  if (!top.length) {
    host.innerHTML = `<div class="meta" style="padding:8px 4px">Inga resultat sparade ännu (v${GAME_VERSION}).</div>`;
    return;
  }
  host.innerHTML = top.map((it, i) => {
    const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : '⬤';
    const dateStr = it.tsMs ? new Date(it.tsMs).toLocaleDateString('sv-SE') : '';
    const safeName = (it.name || 'Spelare').toString().slice(0, 24);
    const comp = it.company ? `<div class="hs-company">${it.company}</div>` : '';
    return `
      <div class="hs-row">
        <div class="hs-rank"><span class="hs-medal">${medal}</span></div>
        <div class="hs-name">${safeName}${comp}</div>
        <div class="hs-score">${fmt(Math.round(it.score))} kr</div>
        <div class="hs-date">${dateStr}</div>
      </div>`;
  }).join('');
}

function postToGoogleForm(formAction, params) {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.name = 'hs_hidden_iframe';
      iframe.style.display = 'none';

      const form = document.createElement('form');
      form.action = formAction;
      form.method = 'POST';
      form.target = 'hs_hidden_iframe';
      form.style.display = 'none';

      for (const [k, v] of params.entries()) {
        const inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = k;
        inp.value = v;
        form.appendChild(inp);
      }

      let settled = false;
      const done = (ok = true) => { if (!settled) { settled = true; ok ? resolve() : reject(new Error('Form submit failed')); } };
      const tId = setTimeout(() => { done(true); }, 2500);
      iframe.addEventListener('load', () => { clearTimeout(tId); done(true); });

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    } catch (e) { reject(e); }
  });
}

export async function refreshHighscoresSafe(){
  try {
    try { localStorage.removeItem(HS_KEY);     } catch {}
    try { localStorage.removeItem(HS_RAW_KEY); } catch {}
    await hsReadFromSheet();
  } catch (e) {
    console.warn('[HS] Kunde inte läsa CSV efter spar: ', e);
  } finally {
    try { renderHighscores(); } catch {}
    try { renderHSBoard();   } catch {}
  }
}

export async function saveHighscore(){
  const s = window.summarizeEnd ? window.summarizeEnd() : null;
  const name    = (state?.player?.name    || 'Spelare').slice(0, 64);
  const company = (state?.player?.company || '').slice(0, 128);
  if (!s) return;

  const p = new URLSearchParams();
  p.append(HS_FIELDS.name,    name);
  p.append(HS_FIELDS.company, company);
  p.append(HS_FIELDS.worth,   String(s.worth));
  p.append(HS_FIELDS.props,   String(s.props));
  p.append(HS_FIELDS.avgSat,  String(s.avgSat));
  p.append(HS_FIELDS.year,    String(s.year));
  p.append(HS_FIELDS.ver,     GAME_VERSION);

  try {
    await postToGoogleForm(FORM_ACTION, p);
    await new Promise(res => setTimeout(res, 2800));
    await refreshHighscoresSafe();
  } catch (e) {
    console.error('Kunde inte spara till Google Form', e);
    alert('Hoppsan! Kunde inte spara highscore just nu.');
  }
}

// ---- Lägg till i highscore.js ----
export function openHSModal() {
  const m = document.getElementById('hsModal');
  if (m) m.style.display = 'block';
}

export function closeHSModal() {
  const m = document.getElementById('hsModal');
  if (m) m.style.display = 'none';
}

// koppla stäng-knappen om den finns
document.getElementById('hsClose')?.addEventListener('click', closeHSModal);
// -----------------------------------

Object.assign(window, {
  openHS: openHSModal,   // <— praktiskt alias för dina knappar
  openHSModal,
  closeHSModal,
  renderHighscores,
  renderHSBoard,
  saveHighscore,
  refreshHighscoresSafe,
});
