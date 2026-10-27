import { $, addDays, esc, key, parseKey, plural, todayKey, weekday } from './core.js?v=1.01a';
import { iconHTML } from './icons.js?v=1.01a';
import { count, counts, inLife, state, targetOn } from './storage.js?v=1.01a';
import { addPeriodSwipe, closeMenu, menuEl, openOverlay, openPopover } from './ui.js?v=1.01a';
import { bindTips, calendarHeat, heatmap, IC_I, openHistory, rangeDays, rangeLabel, shiftAnchor } from './history.js?v=1.01a';

export const WD_DAT = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];
export const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export const LIMITS = { attnPct: 60, attnDrop: 10, obsDays: 21, obsDrop: 15, obsWeekday: 15, obsStreak: 5, obsGrowth: 5, stableHigh: 80, trendDays: 3, startDays: 7, rows: 5 };
const pctOf = (sum, n) => n ? Math.round(sum / n * 100) : null;

export function dayInfo(d) {
  const k = key(d), t = todayKey(), vals = [], open = [];
  if (k > t) return { vals, open, pending: false };
  for (const h of state.habits) {
    if (!inLife(h, k) || !counts(h, d)) continue;
    const v = Math.min(count(h, d) / targetOn(h, d), 1);
    (k === t && v < 1 ? open : vals).push({ h, v });
  }
  return { vals, open, pending: open.length > 0 };
}
export const isFull = info => !info.pending && info.vals.length > 0 && info.vals.every(x => x.v >= 1);

export function periodStats(ds) {
  let sum = 0, n = 0, full = 0, days = 0;
  const per = new Map(), wd = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of ds) {
    const info = dayInfo(d);
    if (info.vals.length && !info.pending) days++;
    if (isFull(info)) full++;
    for (const { h, v } of info.vals) {
      sum += v; n++;
      const p = per.get(h.id) || { h, sum: 0, n: 0 };
      p.sum += v; p.n++;
      per.set(h.id, p);
      wd[weekday(d)].sum += v; wd[weekday(d)].n++;
    }
  }
  return {
    pct: pctOf(sum, n), n, full, days,
    habits: [...per.values()].map(p => ({ h: p.h, pct: pctOf(p.sum, p.n), n: p.n })),
    weekdays: wd.map(w => ({ pct: pctOf(w.sum, w.n), n: w.n })),
  };
}

export const trend = (cur, prev) => cur?.pct == null || !prev || prev.pct == null || (prev.days ?? prev.n) < LIMITS.trendDays ? null : cur.pct - prev.pct;
export const fmtTrend = d => d == null ? '' : d > 0 ? `+${d}%` : d < 0 ? `−${-d}%` : '0%';

export function withTrends(cur, prev) {
  const before = new Map(prev.habits.map(x => [x.h.id, x]));
  return cur.habits.map(x => ({ ...x, delta: trend(x, before.get(x.h.id)), prevPct: before.get(x.h.id)?.pct ?? null }));
}
export const needsAttention = x => x.pct < LIMITS.attnPct || (x.delta != null && x.delta <= -LIMITS.attnDrop);
export function habitList(rows, filter) {
  if (filter === 'attn') return rows.filter(needsAttention).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0) || a.pct - b.pct);
  return [...rows].sort((a, b) => b.pct - a.pct || b.n - a.n);
}

export function streakInfo(ds) {
  const first = state.habits.map(h => h.created).sort()[0];
  if (!first) return { cur: 0, best: 0, lastAgo: null };
  const t = todayKey(), from = ds ? key(ds[0]) : first, last = ds ? key(ds[ds.length - 1]) : t, to = last < t ? last : t;
  let run = 0, inRun = 0, best = 0, lastFull = null;
  for (let d = parseKey(first); key(d) <= to; d = addDays(d, 1)) {
    const info = dayInfo(d);
    if (!info.vals.length || info.pending) continue;
    const ok = isFull(info);
    run = ok ? run + 1 : 0;
    if (ok) lastFull = new Date(d);
    if (key(d) >= from) best = Math.max(best, inRun = ok ? inRun + 1 : 0);
  }
  const lastAgo = lastFull ? Math.round((parseKey(to) - parseKey(key(lastFull))) / 864e5) : null;
  return { cur: run, best, lastAgo };
}

export function streakNote(st, live) {
  if (!live) return st.cur ? `На конец периода: ${st.cur} ${plural(st.cur, 'день', 'дня', 'дней')} подряд` : 'На конец периода серии не было';
  if (st.cur) return `Сейчас: ${st.cur} ${plural(st.cur, 'день', 'дня', 'дней')} подряд`;
  if (st.lastAgo == null || st.lastAgo < 1) return 'Новая серия начинается сегодня';
  return st.lastAgo === 1 ? 'Последний полный день — вчера' : `Последний полный день — ${st.lastAgo} ${plural(st.lastAgo, 'день', 'дня', 'дней')} назад`;
}

export function periodNames(range, ds, today = new Date()) {
  const a = ds[0], live = key(ds[ds.length - 1]) >= key(today) && key(a) <= key(today), y = a.getFullYear(), ty = today.getFullYear();
  if (range === 'week') return { lead: live ? 'На этой неделе' : `На неделе ${rangeLabel('week', ds)}`, prev: live ? 'на прошлой неделе' : 'неделей раньше' };
  if (range === 'year') return { lead: `В ${y} году`, prev: `в ${y - 1} году` };
  const m = a.getMonth(), pm = (m + 11) % 12, py = m ? y : y - 1;
  return { lead: `В ${MONTHS_IN[m]}${y !== ty ? ` ${y} года` : ''}`, prev: `в ${MONTHS_IN[pm]}${py !== ty ? ` ${py} года` : ''}` };
}

export function summaryParts(range, ds, cur, prev, today = new Date()) {
  const { lead, prev: pn } = periodNames(range, ds, today), d = trend(cur, prev);
  const tail = d == null ? '' : d > 0 ? `, на ${d}% больше, чем ${pn}` : d < 0 ? `, на ${-d}% меньше, чем ${pn}` : `, столько же, сколько ${pn}`;
  return { before: `${lead} Вы выполнили `, num: `${cur.pct}%`, after: ` запланированного${tail}.` };
}
export const summaryText = p => p.before + p.num + p.after;

export function observations({ streak = 0, cur, prev, obsCur, obsPrev }) {
  const out = [], enough = obsCur && obsCur.days >= LIMITS.obsDays;
  const growth = trend(cur, prev);
  if (streak >= LIMITS.obsStreak) out.push({ text: `Полных дней подряд: ${streak}` });
  else if (enough && cur?.days >= LIMITS.obsDays && growth != null && growth >= LIMITS.obsGrowth) out.push({ text: `Выполнение выросло на ${growth}% к прошлому периоду` });
  if (enough && obsPrev) {
    const rows = withTrends(obsCur, obsPrev);
    const drop = rows.filter(x => x.delta != null && x.delta <= -LIMITS.obsDrop).sort((a, b) => a.delta - b.delta)[0];
    if (drop) {
      const anchor = rows.filter(x => x.h.id !== drop.h.id && x.pct >= LIMITS.stableHigh && x.prevPct != null && x.prevPct >= LIMITS.stableHigh).sort((a, b) => b.pct - a.pct)[0];
      out.push({ text: `${drop.h.name}: ${drop.pct}% против ${drop.prevPct}% в прошлом периоде`, hint: anchor ? `Попробуйте делать её сразу после привычки «${anchor.h.name}»` : '' });
    }
  }
  if (enough) {
    const wd = obsCur.weekdays.map((w, i) => ({ ...w, i })).filter(w => w.n >= 3 && w.pct != null);
    if (wd.length >= 2) {
      const best = wd.reduce((a, b) => b.pct > a.pct ? b : a), worst = wd.reduce((a, b) => b.pct < a.pct ? b : a);
      if (best.pct - worst.pct >= LIMITS.obsWeekday) out.push({ text: `Лучше всего по ${WD_DAT[best.i]}: ${best.pct}%, хуже всего по ${WD_DAT[worst.i]}: ${worst.pct}%` });
    }
  }
  return out.slice(0, 3);
}

export function dayCell(d) {
  const info = dayInfo(d), all = [...info.vals, ...info.open], date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  if (!all.length) return { live: false, f: 0, tip: `${date}: нет запланированных привычек` };
  const done = all.filter(x => x.v >= 1).length, miss = all.filter(x => x.v < 1).map(x => x.h.name);
  const f = all.reduce((s, x) => s + x.v, 0) / all.length;
  const rest = !miss.length ? 'всё выполнено' : `${info.pending ? 'ещё не отмечено' : 'не выполнено'}: ${miss.join(', ')}`;
  return { live: true, f, tip: `${date}: ${done} из ${all.length} ${plural(all.length, 'привычки', 'привычек', 'привычек')}, ${rest}` };
}

export const historyDays = () => {
  const first = state.habits.map(h => h.created).sort()[0];
  if (!first) return 0;
  let n = 0;
  for (let d = parseKey(first), t = todayKey(); key(d) <= t && n < LIMITS.startDays; d = addDays(d, 1)) if (dayInfo(d).vals.length) n++;
  return n;
};

export const trendWord = d => d == null ? '' : d > 0 ? `выше прошлого периода на ${d}%` : d < 0 ? `ниже прошлого периода на ${-d}%` : 'как в прошлом периоде';
export const rowLabel = x => `${x.h.name}: ${x.pct}%${x.delta == null ? '' : `, ${trendWord(x.delta)}`}`;

export const HOW = [
  ['Запланированный день', 'Привычка по расписанию, уже создана и не в архиве. Дни не по расписанию и дни с пропуском не учитываются.'],
  ['Выполнено', 'Средняя доля выполнения по всем запланированным отметкам. 5 из 8 стаканов — это 62%, больше цели — 100%.'],
  ['Полный день', 'День, когда выполнены все запланированные привычки. Сегодня засчитывается, когда отмечено всё.'],
  ['Серия', 'Полные дни подряд. Дни без запланированных привычек и незаконченный сегодняшний день её не прерывают.'],
  ['Изменение', 'Разница с прошлым периодом такой же длины. Не показывается, если в прошлом периоде меньше 3 запланированных дней.'],
  ['Нужно внимание', 'Привычки ниже 60% или с падением на 10% и больше.'],
];
const TILE_INFO = {
  done: ['Выполнено', 'Сколько из запланированного Вы сделали за период.', HOW[1][1]],
  full: ['Полных дней', 'Дни, когда сделано всё, что было запланировано.', HOW[2][1]],
  streak: ['Лучшая серия', 'Самая длинная череда полных дней за период.', HOW[3][1]],
};

export let summaryView = null;
const put = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
const tileHTML = (k, icon, l, v, sub, sub2 = '') => `<div class="tile"><span class="t-ic" aria-hidden="true">${icon}</span>
  <div class="t-txt"><div class="l">${l}</div><div class="s">${sub}</div>${sub2 ? `<div class="s s2">${sub2}</div>` : ''}</div><div class="v">${v}</div>
  <button class="tile-i" data-k="${k}" aria-label="Что значит «${l}»" aria-haspopup="dialog">${IC_I}</button></div>`;
const arrow = d => d == null ? '<span class="trend" aria-hidden="true"></span>' : `<span class="trend ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}" aria-hidden="true">${d > 0 ? '↑' : d < 0 ? '↓' : '→'} ${fmtTrend(d)}</span>`;

export function openSummary() {
  summaryView = { range: summaryView?.range || 'week', anchor: new Date(), filter: 'best', all: false };
  for (const id of ['sTiles', 'sHabits', 'sObs']) $(id)._html = null;
  openOverlay($('sumOv'));
  renderSummary();
}

export function obsRange(range, ds) {
  if (range !== 'week') return [ds, rangeDays(range, shiftAnchor(range, ds[0], -1))];
  const t = parseKey(todayKey()), end = ds[ds.length - 1] > t ? t : ds[ds.length - 1];
  const four = Array.from({ length: 28 }, (_, i) => addDays(end, i - 27));
  return [four, four.map(d => addDays(d, -28))];
}

export function renderSummary() {
  const { range } = summaryView, ds = rangeDays(range, summaryView.anchor), today = todayKey();
  for (const b of $('sTabs').children) b.setAttribute('aria-pressed', b.dataset.r === range);
  $('sLabel').textContent = rangeLabel(range, ds);
  const first = state.habits.map(h => h.created).sort()[0];
  $('sPrev').disabled = !first || key(ds[0]) <= first;
  $('sNext').disabled = key(ds[ds.length - 1]) >= today;

  const cur = periodStats(ds), prev = periodStats(rangeDays(range, shiftAnchor(range, summaryView.anchor, -1)));
  const starting = historyDays() < LIMITS.startDays, empty = !starting && cur.pct == null;
  $('sBody').hidden = starting || empty;
  $('sSum').classList.toggle('muted', starting || empty);
  if (starting || empty) {
    $('sSum').textContent = starting ? 'Сводка появится через несколько недель отметок' : 'За этот период нет запланированных привычек';
    return;
  }
  const parts = summaryParts(range, ds, cur, prev);
  $('sSum').replaceChildren(parts.before, Object.assign(document.createElement('b'), { textContent: parts.num }), parts.after);

  const live = key(ds[ds.length - 1]) >= today, st = streakInfo(ds);
  put($('sTiles'),
    tileHTML('done', '✅', 'Выполнено', cur.pct + '%', 'из запланированного') +
    tileHTML('full', '📅', 'Полных дней', `${cur.full}<small> из ${cur.days}</small>`, 'всё запланированное сделано') +
    tileHTML('streak', '🔥', 'Лучшая серия', st.best, 'дней подряд без пропусков', esc(streakNote(st, live))));

  (range === 'year' ? heatmap : calendarHeat)($('sHeat'), ds, dayCell);
  $('sFutLg').hidden = range === 'year' || key(ds[ds.length - 1]) <= today;

  const [oc, op] = obsRange(range, ds);
  const obs = observations({ streak: live ? st.cur : 0, cur, prev, obsCur: periodStats(oc), obsPrev: periodStats(op) });
  $('sObsWrap').hidden = !obs.length;
  put($('sObs'), obs.map(o => `<li>${esc(o.text)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</li>`).join(''));

  const rows = withTrends(cur, prev), list = habitList(rows, summaryView.filter);
  for (const b of $('sFilter').children) b.setAttribute('aria-pressed', b.dataset.f === summaryView.filter);
  const shown = summaryView.all ? list : list.slice(0, LIMITS.rows);
  put($('sHabits'), !list.length ? `<p class="s-empty">${summaryView.filter === 'attn' ? 'Все привычки выполняются стабильно' : 'В этот период данных нет'}</p>`
    : shown.map(x => `<button type="button" class="hab-row" data-id="${esc(x.h.id)}" style="--c:${esc(x.h.color)}" aria-label="${esc(rowLabel(x))}">
      <span class="hicon">${iconHTML(x.h.icon)}</span><span class="hr-name">${esc(x.h.name)}</span>
      <span class="hr-bar" aria-hidden="true"><i style="width:${x.pct}%"></i></span><span class="hr-pct">${x.pct}%</span>${arrow(x.delta)}</button>`).join(''));
  $('sMore').hidden = list.length <= LIMITS.rows;
  $('sMore').textContent = summaryView.all ? 'Свернуть' : `Показать все (${list.length})`;
}

$('sTabs').onclick = e => {
  const r = e.target.closest('button')?.dataset.r;
  if (!r || !summaryView || r === summaryView.range) return;
  summaryView.range = r;
  renderSummary();
};
$('sPrev').onclick = () => { summaryView.anchor = shiftAnchor(summaryView.range, summaryView.anchor, -1); renderSummary(); };
$('sNext').onclick = () => { summaryView.anchor = shiftAnchor(summaryView.range, summaryView.anchor, 1); renderSummary(); };
$('sFilter').onclick = e => {
  const f = e.target.closest('button')?.dataset.f;
  if (!f || f === summaryView.filter) return;
  summaryView.filter = f; summaryView.all = false;
  renderSummary();
};
$('sMore').onclick = () => { summaryView.all = !summaryView.all; renderSummary(); };
$('sHabits').onclick = e => { const b = e.target.closest('[data-id]'); if (b) openHistory(b.dataset.id); };
$('sTiles').onclick = e => {
  const b = e.target.closest('.tile-i');
  if (!b) return;
  if (menuEl?._anchor === b) return closeMenu();
  const [title, lead, how] = TILE_INFO[b.dataset.k];
  openPopover(b, `<div class="pop-title">${title}</div><p class="pop-lead">${lead}</p><div class="pop-sec"><b>Как считается</b>${how}</div>`);
};
$('sHow').onclick = e => {
  if (menuEl?._anchor === e.currentTarget) return closeMenu();
  openPopover(e.currentTarget, `<div class="pop-title">Как считается</div>${HOW.map(([t, d]) => `<div class="pop-sec"><b>${t}</b>${d}</div>`).join('')}`);
};
bindTips($('sHeat'));
const ring = $('heroProg').closest('.hero-ring');
ring.onclick = openSummary;
ring.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSummary(); } };
addPeriodSwipe($('sSheet'), '#sSheet .pnav, #sSum, #sTiles, #sHeat', $('sPrev'), $('sNext'));
