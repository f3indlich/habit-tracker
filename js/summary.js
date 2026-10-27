import { $, addDays, esc, ofDays, key, parseKey, plural, todayKey, weekday, WEEKDAYS } from './core.js?v=1.01a';
import { iconHTML } from './icons.js?v=1.01a';
import { count, counts, inLife, state, targetOn } from './storage.js?v=1.01a';
import { openOverlay } from './ui.js?v=1.01a';
import { barChart, bindTips, calendarHeat, heatmap, openHistory, rangeDays, rangeLabel, shiftAnchor } from './history.js?v=1.01a';

export const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
export const PERIOD = {
  week: { acc: 'неделю', prev: 'к прошлой неделе', same: 'как на прошлой неделе' },
  month: { acc: 'месяц', prev: 'к прошлому месяцу', same: 'как в прошлом месяце' },
  year: { acc: 'год', prev: 'к прошлому году', same: 'как в прошлом году' },
};
export const fmtDelta = d => (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d) + ' п.п.';
const pctOf = x => x.n ? Math.round(x.sum / x.n * 100) : null;

export function dayValues(d) {
  const k = key(d), t = todayKey(), vals = [];
  let pending = false;
  if (k > t) return { vals, pending };
  for (const h of state.habits) {
    if (!inLife(h, k) || !counts(h, d)) continue;
    const v = Math.min(count(h, d) / targetOn(h, d), 1);
    if (k === t && v < 1) { pending = true; continue; }
    vals.push({ h, v });
  }
  return { vals, pending };
}
export const isPerfect = info => !info.pending && info.vals.length > 0 && info.vals.every(x => x.v >= 1);

export function periodStats(ds) {
  let sum = 0, n = 0, perfect = 0, decided = 0;
  const per = new Map(), wd = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of ds) {
    const info = dayValues(d);
    if (info.vals.length && !info.pending) decided++;
    if (isPerfect(info)) perfect++;
    for (const { h, v } of info.vals) {
      sum += v; n++;
      const p = per.get(h.id) || { h, sum: 0, n: 0 };
      p.sum += v; p.n++;
      per.set(h.id, p);
      wd[weekday(d)].sum += v; wd[weekday(d)].n++;
    }
  }
  return {
    pct: pctOf({ sum, n }), n, perfect, decided,
    habits: [...per.values()].map(p => ({ h: p.h, pct: pctOf(p), n: p.n })).sort((a, b) => b.pct - a.pct || b.n - a.n),
    weekdays: wd.map(w => ({ pct: pctOf(w), n: w.n })),
  };
}

export function perfectStreaks(ds) {
  const first = state.habits.map(h => h.created).sort()[0];
  if (!first) return { cur: 0, best: 0 };
  const t = todayKey(), from = ds ? key(ds[0]) : first, last = ds ? key(ds[ds.length - 1]) : t, to = last < t ? last : t;
  let run = 0, inRun = 0, best = 0;
  for (let d = parseKey(first); key(d) <= to; d = addDays(d, 1)) {
    const info = dayValues(d);
    if (!info.vals.length || info.pending) continue;
    const ok = isPerfect(info);
    run = ok ? run + 1 : 0;
    if (key(d) >= from) best = Math.max(best, inRun = ok ? inRun + 1 : 0);
  }
  return { cur: run, best };
}

export function compareText(cur, prev, range) {
  if (cur.pct == null || prev.pct == null) return 'нет данных для сравнения';
  const d = cur.pct - prev.pct;
  return d ? `${fmtDelta(d)} ${PERIOD[range].prev}` : PERIOD[range].same;
}

export function attention(cur, prev, range) {
  const before = new Map(prev.habits.map(x => [x.h.id, x.pct]));
  return cur.habits.filter(x => !x.h.archived).map(x => {
    const p = before.get(x.h.id), delta = p == null ? null : x.pct - p;
    const reason = x.pct < 50 ? `${x.pct}% за ${PERIOD[range].acc}`
      : delta != null && delta <= -15 ? `${fmtDelta(delta)} ${PERIOD[range].prev}` : '';
    return reason ? { ...x, delta, reason } : null;
  }).filter(Boolean).sort((a, b) => a.pct - b.pct).slice(0, 3);
}

export function weakDay(stats) {
  const cand = stats.weekdays.map((w, i) => ({ ...w, i })).filter(w => w.n >= 3);
  if (cand.length < 2 || stats.pct == null) return { text: 'Заметно слабых дней нет', i: -1 };
  const min = cand.reduce((a, b) => b.pct < a.pct ? b : a);
  const diff = stats.pct - min.pct;
  if (diff < 10) return { text: 'Заметно слабых дней нет', i: -1 };
  return { text: `Слабее всего — ${WD_FULL[min.i]}: ${min.pct}%, на ${diff} п.п. ниже среднего`, i: min.i };
}


export let summaryView = null;
const put = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
const tileHTML = (icon, l, v, sub) => `<div class="tile"><div class="l"><span>${icon}</span>${l}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`;

export function openSummary() {
  summaryView = { range: summaryView?.range || 'week', anchor: new Date() };
  for (const id of ['sTiles', 'sRank', 'sAttn']) $(id)._html = null;
  openOverlay($('sumOv'));
  renderSummary();
}

export function renderSummary() {
  const { range } = summaryView, ds = rangeDays(range, summaryView.anchor);
  const cur = periodStats(ds), prev = periodStats(rangeDays(range, shiftAnchor(range, summaryView.anchor, -1))), st = perfectStreaks(ds), live = key(ds[ds.length - 1]) >= todayKey();
  for (const b of $('sTabs').children) b.setAttribute('aria-pressed', b.dataset.r === range);
  $('sLabel').textContent = rangeLabel(range, ds);
  const first = state.habits.map(h => h.created).sort()[0];
  $('sPrev').disabled = !first || key(ds[0]) <= first;
  $('sNext').disabled = key(ds[ds.length - 1]) >= todayKey();

  put($('sTiles'),
    tileHTML('📊', 'За период', cur.pct == null ? '—' : cur.pct + '%', compareText(cur, prev, range)) +
    tileHTML('⭐', 'Идеальные дни', cur.perfect, cur.decided ? `из ${ofDays(cur.decided)}` : 'нет данных') +
    tileHTML('🔥', 'Серия', st.cur, `${plural(st.cur, 'идеальный день', 'идеальных дня', 'идеальных дней')} подряд ${live ? 'на сегодня' : 'на конец периода'}`) +
    tileHTML('🏆', 'Лучшая серия', st.best, st.best ? `${plural(st.best, 'идеальный день', 'идеальных дня', 'идеальных дней')} подряд за ${PERIOD[range].acc}` : `нет идеальных дней за ${PERIOD[range].acc}`));

  const dayCell = d => {
    const info = dayValues(d), n = info.vals.length;
    const f = n ? info.vals.reduce((s, x) => s + x.v, 0) / n : 0;
    const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    return { live: n > 0, f, tip: n ? `${date}: ${Math.round(f * 100)}%${isPerfect(info) ? ' · идеальный день' : ''}` : `${date}: нет запланированных привычек` };
  };
  (range === 'year' ? heatmap : calendarHeat)($('sHeat'), ds, dayCell);
  $('sFutLg').hidden = range === 'year' || key(ds[ds.length - 1]) <= todayKey();

  put($('sRank'), cur.habits.length ? cur.habits.map(x => `
    <button type="button" class="rank-row" data-id="${esc(x.h.id)}" style="--c:${x.h.color}">
      <span class="hicon">${iconHTML(x.h.icon)}</span><span class="rk-name">${esc(x.h.name)}</span>
      <span class="rk-bar"><i style="width:${x.pct}%"></i></span><span class="rk-pct">${x.pct}%</span>
    </button>`).join('') : '<p class="s-empty">В этот период данных нет</p>');

  const att = attention(cur, prev, range);
  put($('sAttn'), att.length ? att.map(x => `
    <button type="button" class="attn-row" data-id="${esc(x.h.id)}" style="--c:${x.h.color}">
      <span class="hicon">${iconHTML(x.h.icon)}</span><span class="at-text"><b>${esc(x.h.name)}</b><small>${esc(x.reason)}</small></span>
    </button>`).join('') : `<p class="s-empty">${cur.habits.length ? 'Все привычки в порядке' : 'В этот период данных нет'}</p>`);

  const weak = weakDay(cur);
  barChart($('sWeek'), cur.weekdays.map((w, i) => ({
    value: w.pct || 0, active: w.n > 0, label: WEEKDAYS[i],
    tip: w.n ? `${WD_FULL[i][0].toUpperCase() + WD_FULL[i].slice(1)}: ${w.pct}%` : `${WD_FULL[i][0].toUpperCase() + WD_FULL[i].slice(1)}: нет данных`,
  })), { yMax: 100, ticks: [0, 50, 100], fmt: v => v + '%' });
  if (weak.i >= 0) $('sWeek').querySelectorAll('.bar')[cur.weekdays.slice(0, weak.i).filter(w => w.n > 0 && w.pct > 0).length]?.classList.add('weak');
  $('sWeekNote').textContent = weak.text;
}

$('sTabs').onclick = e => {
  const r = e.target.closest('button')?.dataset.r;
  if (!r || !summaryView || r === summaryView.range) return;
  summaryView.range = r;
  renderSummary();
};
$('sPrev').onclick = () => { summaryView.anchor = shiftAnchor(summaryView.range, summaryView.anchor, -1); renderSummary(); };
$('sNext').onclick = () => { summaryView.anchor = shiftAnchor(summaryView.range, summaryView.anchor, 1); renderSummary(); };
for (const id of ['sRank', 'sAttn']) $(id).onclick = e => { const b = e.target.closest('[data-id]'); if (b) openHistory(b.dataset.id); };
bindTips($('sHeat'));
bindTips($('sWeek'));
const ring = $('heroProg').closest('.hero-ring');
ring.onclick = openSummary;
ring.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSummary(); } };
