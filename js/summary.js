import { $, addDays, esc, key, parseKey, plural, todayKey, weekday, WEEKDAYS } from './core.js?v=3.4c';
import { iconHTML } from './icons.js?v=3.4c';
import { count, counts, inLife, isQuant, isStat, state, targetOn } from './storage.js?v=3.4c';
import { closeMenu, holdHeight, menuEl, openOverlay, openPopover, periodSlider } from './ui.js?v=3.4c';
import { queueTips } from './tips.js?v=3.4c';
import { visibleHabits } from './privacy.js?v=3.4c';
import { overWeekday } from './plan.js?v=3.4c';
import { bindTips, compareRange, compareText, keepRange, MONTHS_IN, openHistory, paintBack, rangeDays, rangeLabel, shiftAnchor, startAnchor, WD_NOM } from './history.js?v=3.4c';
export { compareRange, compareText, MONTHS_IN, WD_NOM };

export const WD_DAT = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const LIMITS = { attnPct: 60, obsDays: 21, obsDrop: 15, obsWeekday: 15, obsStreak: 5, trendDays: 3, startDays: 7, rows: 5, overDays: 4, obsMax: 2 };
const pctOf = (a, n) => n ? Math.round(a / n * 100) : null;

let dayCache = null;
export function dayInfo(d) {
  const k = key(d), t = todayKey(), vals = [], open = [];
  if (dayCache?.has(k)) return dayCache.get(k);
  if (k > t) return { vals, open, pending: false };
  for (const h of visibleHabits(state)) {
    if (isStat(h) || !inLife(h, k) || !counts(h, d)) continue;
    const v = Math.min(count(h, d) / targetOn(h, d), 1);
    (k === t && v < 1 ? open : vals).push({ h, v });
  }
  const info = { vals, open, pending: open.length > 0 };
  dayCache?.set(k, info);
  return info;
}
export const isFull = info => !info.pending && info.vals.length > 0 && info.vals.every(x => x.v >= 1);
export function dayKind(info) {
  if (!info.vals.length && !info.open.length) return null;
  if (isFull(info)) return 'full';
  if (info.pending) return null;
  return info.vals.some(x => x.v > 0) ? 'partial' : 'missed';
}

export function periodStats(ds) {
  let done = 0, total = 0, open = 0;
  const kinds = { full: 0, partial: 0, missed: 0 }, per = new Map(), wd = Array.from({ length: 7 }, () => ({ done: 0, n: 0 }));
  for (const d of ds) {
    const info = dayInfo(d), kind = dayKind(info);
    if (kind) kinds[kind]++;
    open += info.open.length;
    for (const { h, v } of info.vals) {
      const ok = v >= 1 ? 1 : 0;
      done += ok; total++;
      const p = per.get(h.id) || { h, done: 0, n: 0 };
      p.done += ok; p.n++;
      per.set(h.id, p);
      wd[weekday(d)].done += ok; wd[weekday(d)].n++;
    }
  }
  return {
    pct: pctOf(done, total), done, total, open, ...kinds, days: kinds.full + kinds.partial + kinds.missed,
    habits: [...per.values()].map(p => ({ h: p.h, done: p.done, n: p.n, pct: pctOf(p.done, p.n) })),
    weekdays: wd.map(w => ({ pct: pctOf(w.done, w.n), n: w.n })),
  };
}

export const trend = (cur, prev) => cur?.pct == null || !prev || prev.pct == null || prev.days < LIMITS.trendDays ? null : cur.pct - prev.pct;

export function heroSub(range, live, n, open) {
  if (!live) return range === 'week' ? 'за всю неделю' : range === 'month' ? 'за весь месяц' : 'за весь год';
  const base = range === 'year' ? 'с 1 января по сегодня' : `за ${n} ${plural(n, 'день', 'дня', 'дней')}`;
  return open ? `${base}, на сегодня осталось ${open}` : base;
}
export const marksText = (done, total) => `${done} из ${total} ${plural(total, 'отметки', 'отметок', 'отметок')}`;
export const kindWords = s => [
  ['full', s.full, plural(s.full, 'полный', 'полных', 'полных')],
  ['partial', s.partial, plural(s.partial, 'частичный', 'частичных', 'частичных')],
  ['missed', s.missed, plural(s.missed, 'пропуск', 'пропуска', 'пропусков')],
];

export function streakInfo() {
  const first = visibleHabits(state).map(h => h.created).sort()[0];
  if (!first) return { cur: 0 };
  let run = 0;
  for (let d = parseKey(first), t = todayKey(); key(d) <= t; d = addDays(d, 1)) {
    const info = dayInfo(d);
    if (!info.vals.length || info.pending) continue;
    run = isFull(info) ? run + 1 : 0;
  }
  return { cur: run };
}

export function overDayText(over) {
  if (!over || over.total < LIMITS.overDays) return '';
  const sorted = over.wd.map((n, i) => ({ n, i })).sort((a, b) => b.n - a.n);
  return sorted[0].n > sorted[1].n ? `Чаще всего Вы перевыполняете цель по ${WD_DAT[sorted[0].i]}` : '';
}
export function observations({ streak = 0, cur, prev, over }) {
  const out = [];
  if (streak >= LIMITS.obsStreak) out.push({ icon: '🔥', text: `Уже ${streak} ${plural(streak, 'полный день', 'полных дня', 'полных дней')} подряд` });
  const enough = cur && cur.days >= LIMITS.obsDays;
  if (enough && prev && prev.days >= LIMITS.trendDays) {
    const before = new Map(prev.habits.map(x => [x.h.id, x]));
    const drop = cur.habits.map(x => ({ ...x, was: before.get(x.h.id) })).filter(x => x.was?.n >= LIMITS.trendDays && x.pct <= x.was.pct - LIMITS.obsDrop).sort((a, b) => (a.pct - a.was.pct) - (b.pct - b.was.pct))[0];
    if (drop) out.push({ icon: '📉', text: `«${drop.h.name}» получается реже: ${drop.pct}% дней, а раньше было ${drop.was.pct}%` });
  }
  if (enough) {
    const wd = cur.weekdays.map((w, i) => ({ ...w, i })).filter(w => w.n >= 3 && w.pct != null);
    if (wd.length >= 2) {
      const best = wd.reduce((a, b) => b.pct > a.pct ? b : a), worst = wd.reduce((a, b) => b.pct < a.pct ? b : a);
      if (best.pct - worst.pct >= LIMITS.obsWeekday) out.push({ icon: '⭐', text: `Лучший день недели — ${WD_NOM[best.i]}: ${best.pct}%, слабее всего — ${WD_NOM[worst.i]}: ${worst.pct}%` });
    }
  }
  const od = overDayText(over);
  if (od) out.push({ icon: '🎯', text: od });
  return out.slice(0, LIMITS.obsMax);
}

export function dayCell(d) {
  const info = dayInfo(d), all = [...info.vals, ...info.open], date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  if (!all.length) return { live: false, f: 0, tip: `${date}: нет запланированных привычек` };
  const done = all.filter(x => x.v >= 1).length, miss = all.filter(x => x.v < 1).map(x => x.h.name);
  const rest = !miss.length ? 'всё выполнено' : `${info.pending ? 'ещё не отмечено' : 'не выполнено'}: ${miss.join(', ')}`;
  return { live: true, f: done / all.length, tip: `${date}: ${done} из ${all.length} ${plural(all.length, 'привычки', 'привычек', 'привычек')}, ${rest}` };
}

export const historyDays = () => {
  const first = visibleHabits(state).map(h => h.created).sort()[0];
  if (!first) return 0;
  let n = 0;
  for (let d = parseKey(first), t = todayKey(); key(d) <= t && n < LIMITS.startDays; d = addDays(d, 1)) if (dayInfo(d).vals.length) n++;
  return n;
};

const JUST_STARTED = { week: 'Неделя только началась', month: 'Месяц только начался', year: 'Год только начался' };
export const emptyText = (range, ds, today) => key(ds[0]) === today && JUST_STARTED[range] || 'За этот период нет запланированных привычек';
export const habitRows = rows => [...rows].sort((a, b) => a.pct - b.pct || a.h.name.localeCompare(b.h.name, 'ru'));
export const isLow = x => x.pct < LIMITS.attnPct;
export const rowValue = (x, range) => range === 'year' ? `${x.pct}% дней` : `${x.done} из ${x.n} ${plural(x.n, 'дня', 'дней', 'дней')}`;

export const HOW = [
  ['Отметка', 'Одна запланированная привычка в один день. Считаются дни по расписанию, пока привычка создана и не в архиве. Дни с пропуском не считаются. У привычек «несколько раз в неделю» в план попадают дни с отметкой, а если за неделю сделано меньше задуманного, это один невыполненный день в конце недели.'],
  ['Выполнено', 'Отметки, где сделано всё задуманное: 8 из 8 стаканов — выполнено, 5 из 8 — пока нет. Сегодняшние невыполненные привычки не считаются, пока день не закончился.'],
  ['Дни', 'Полный — сделано всё запланированное. Частичный — сделано не всё, но хоть что-то. Пропуск — ничего не сделано.'],
  ['Сравнение', 'С тем же числом дней прошлого периода: в среду неделя сравнивается с понедельником–средой прошлой недели. Не показывается, если в прошлом периоде меньше 3 дней с планом.'],
  ['Привычки', `Сначала идут отстающие: выполненные меньше чем в ${LIMITS.attnPct}% дней. Они отмечены оранжевым.`],
];

export let summaryView = null;
const put = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
const R = 15.5, C = 2 * Math.PI * R, r = 14, c = 2 * Math.PI * r;
const ringSVG = (f, cls = '') => `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="s-tr${cls}" cx="18" cy="18" r="${r}"/>${f > 0 ? `<circle class="s-pr" cx="18" cy="18" r="${r}" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}"/>` : ''}</svg>`;

$('sumOv')._warm = () => {
  if (summaryView || !visibleHabits(state).length) return;
  summaryView = { range: 'week', anchor: new Date(), all: false, back: null };
  try { renderSummary(); } finally { summaryView = null; }
};
export function openSummary() {
  summaryView = { range: summaryView?.range || 'week', anchor: new Date(), all: false, back: null };
  const past = startAnchor(summaryView.range, visibleHabits(state).map(h => h.created).sort()[0]);
  if (past) Object.assign(summaryView, { anchor: past.anchor, back: past.start });
  for (const id of ['sHabits', 'sObs', 'sDays', 'sKinds']) $(id)._html = null;
  sumSlider.reset();
  const real = summaryView;
  summaryView = { ...real, range: 'week', anchor: new Date(), back: null };
  openOverlay($('sumOv'));
  renderSummary();
  holdHeight($('sSheet'));
  summaryView = real;
  if (real.range !== 'week' || real.back) renderSummary();
  queueTips(1000);
}

export function renderSummary() {
  dayCache = new Map();
  try { drawSummary(); } finally { dayCache = null; }
}

function dayHTML(d, tk, label) {
  const k = key(d), fut = k > tk, info = fut ? null : dayCell(d);
  const tip = fut ? `${d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}: ещё впереди` : info.tip;
  const cls = `s-d${fut ? ' fut' : ''}${k === tk ? ' now' : ''}${!fut && !info.live ? ' none' : ''}${!fut && info.f >= 1 ? ' full' : ''}`;
  return `<div class="${cls}" data-tip="${esc(tip)}">${label ? `<small>${label}</small>` : ''}<span class="s-r">${ringSVG(fut ? 0 : info.f, fut ? ' fut' : '')}<b>${d.getDate()}</b></span></div>`;
}
function daysHTML(range, ds, tk) {
  if (range === 'week') return `<div class="s-wk">${ds.map((d, i) => dayHTML(d, tk, WEEKDAYS[i])).join('')}</div>`;
  if (range === 'month') return `<div class="s-cal">${WEEKDAYS.map(w => `<small>${w}</small>`).join('')}${'<i></i>'.repeat(weekday(ds[0]))}${ds.map(d => dayHTML(d, tk)).join('')}</div>`;
  const y = ds[0].getFullYear(), first = visibleHabits(state).map(h => h.created).sort()[0], rows = [];
  for (let m = 11; m >= 0; m--) {
    const a = new Date(y, m, 1), b = new Date(y, m + 1, 0);
    if (key(a) > tk || !first || key(b) < first) continue;
    const st = periodStats(rangeDays('month', a));
    rows.push({ m, st, now: key(a) <= tk && key(b) >= tk });
  }
  if (!rows.length) return '<p class="s-empty">В этом году привычек ещё не было</p>';
  const best = rows.length > 1 ? rows.reduce((a, b) => (b.st.pct ?? -1) > (a.st.pct ?? -1) ? b : a) : null;
  return `<div class="mrows">${rows.map(r => {
    const p = r.st.pct, tag = r.now ? 'идёт' : r === best && p ? 'лучший' : '';
    const val = p == null ? 'нет плана' : `${p}%`, sub = p == null ? '' : marksText(r.st.done, r.st.total);
    return `<button type="button" class="mrow${p != null && p < LIMITS.attnPct ? ' low' : ''}${r.now ? ' now' : ''}${tag === 'лучший' ? ' best' : ''}" data-m="${r.m}" aria-label="${esc(`${MONTHS_NOM[r.m]}: ${val}${sub ? ', ' + sub : ''}`)}">
      <b>${MONTHS_NOM[r.m]}${tag ? `<small>${tag}</small>` : ''}</b><span class="mbar"><i style="width:${p || 0}%"></i></span><span class="mv">${val}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  }).join('')}</div><p class="s-hint">Касание месяца открывает его календарь</p>`;
}

function drawSummary() {
  const { range } = summaryView, ds = rangeDays(range, summaryView.anchor), today = todayKey();
  for (const b of $('sTabs').children) b.setAttribute('aria-pressed', b.dataset.r === range);
  $('sLabel').textContent = rangeLabel(range, ds);
  const first = visibleHabits(state).map(h => h.created).sort()[0];
  $('sPrev').disabled = !first || key(ds[0]) <= first;
  $('sNext').disabled = key(ds[ds.length - 1]) >= today;
  paintBack($('sBack'), summaryView, range, ds, () => { summaryView.anchor = new Date(); renderSummary(); });

  const cmp = compareRange(range, ds, summaryView.anchor), cur = periodStats(cmp.cur), prev = periodStats(cmp.prev);
  const hd = historyDays(), starting = hd < LIMITS.startDays, empty = !starting && cur.pct == null && !cur.open;
  $('sBody').hidden = starting || empty;
  $('sHero').classList.toggle('muted', starting || empty);
  if (starting || empty) {
    const left = LIMITS.startDays - hd;
    $('sSum').textContent = starting ? `Сводка появится через ${left} ${plural(left, 'день', 'дня', 'дней')}` : emptyText(range, ds, today);
    return;
  }
  const pct = cur.pct ?? 0, d = trend(cur, prev);
  $('sRing').innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="s-tr" cx="18" cy="18" r="${R}"/>${pct ? `<circle class="s-pr" cx="18" cy="18" r="${R}" stroke-dasharray="${(pct / 100 * C).toFixed(2)} ${C.toFixed(2)}"/>` : ''}</svg><b>${pct}%</b>`;
  $('sSum').textContent = cur.total ? marksText(cur.done, cur.total) : JUST_STARTED[range];
  $('sSub').textContent = heroSub(range, cmp.live, cmp.cur.length, cur.open);
  $('sCmp').textContent = keepRange(compareText(d == null ? null : cur.pct, prev?.pct, cmp.label));
  $('sCmp').hidden = d == null;
  $('sCmp').className = `s-cmp${d < 0 ? ' down' : ''}`;
  put($('sKinds'), kindWords(cur).map(([k, n, w]) => `<span class="s-k ${k}"><i></i><b>${n}</b> ${w}</span>`).join(''));

  $('sDaysTitle').textContent = range === 'year' ? 'По месяцам' : 'По дням';
  put($('sDays'), daysHTML(range, ds, today) + (range === 'year' ? '' : '<div class="tip"></div>'));

  const quant = visibleHabits(state).filter(h => isQuant(h) && !isStat(h)), live = cmp.live || key(ds[ds.length - 1]) === today;
  const obs = observations({ streak: live ? streakInfo().cur : 0, cur, prev, over: overWeekday(quant, state, key(cmp.cur[0]), key(cmp.cur[cmp.cur.length - 1]), today) });
  $('sObsWrap').hidden = !obs.length;
  put($('sObs'), obs.map(o => `<li><span aria-hidden="true">${o.icon}</span><span>${esc(o.text)}</span></li>`).join(''));

  const list = habitRows(cur.habits), shown = summaryView.all ? list : list.slice(0, LIMITS.rows);
  put($('sHabits'), !list.length ? '<p class="s-empty">В этот период отметок нет</p>'
    : shown.map(x => `<button type="button" class="hab-row${isLow(x) ? ' low' : ''}" data-id="${esc(x.h.id)}" style="--c:${esc(x.h.color)}" aria-label="${esc(`${x.h.name}: ${rowValue(x, range)}, ${x.pct}%`)}">
      <span class="hicon">${iconHTML(x.h.icon)}</span><span class="hr-name">${esc(x.h.name)}</span><span class="hr-val">${rowValue(x, range)}</span>
      <span class="hr-bar" aria-hidden="true"><i style="width:${x.pct}%"></i></span></button>`).join(''));
  const rest = list.length - LIMITS.rows;
  $('sMore').hidden = rest <= 0;
  $('sMore').textContent = summaryView.all ? 'Свернуть' : `Ещё ${rest} ${plural(rest, 'привычка', 'привычки', 'привычек')}`;
}

$('sTabs').onclick = e => {
  const v = e.target.closest('button')?.dataset.r;
  if (!v || !summaryView || v === summaryView.range) return;
  summaryView.range = v;
  summaryView.all = false;
  if (summaryView.back) Object.assign(summaryView, { anchor: new Date(), back: null });
  renderSummary();
};
const sumSlider = periodSlider({
  sheet: $('sSheet'), zone: '#sSheet .pnav, #sHero, #sDays', track: $('sPerTrack'), prev: $('sPrev'), next: $('sNext'), tabs: $('sTabs'),
  active: () => !!summaryView, get: () => summaryView.anchor, set: a => { summaryView.anchor = a; }, step: (a, s) => shiftAnchor(summaryView.range, a, s), render: renderSummary,
});
$('sDays').addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  summaryView.range = 'month';
  summaryView.anchor = new Date(rangeDays('year', summaryView.anchor)[0].getFullYear(), +b.dataset.m, 1);
  summaryView.back = null;
  renderSummary();
});
$('sMore').onclick = () => { summaryView.all = !summaryView.all; renderSummary(); };
$('sHabits').onclick = e => { const b = e.target.closest('[data-id]'); if (b) openHistory(b.dataset.id); };
$('sHow').onclick = e => {
  if (menuEl?._anchor === e.currentTarget) return closeMenu();
  openPopover(e.currentTarget, `<div class="pop-title">Как считается</div>${HOW.map(([t, d]) => `<div class="pop-sec"><b>${t}</b>${d}</div>`).join('')}`);
};
bindTips($('sDays'));
const ring = $('heroProg').closest('.hero-ring');
ring.onclick = openSummary;
ring.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSummary(); } };
