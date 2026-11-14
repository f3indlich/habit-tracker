import { $, addDays, days, ofDays, esc, fmtLong, isToday, key, MONTHS, MONTHS_SHORT, parseKey, plural, reducedMotion, redUi, scheduleOf, schedText, TEST_MODE, TIMES, todayKey, weekday, WEEKDAYS } from './core.js?v=3.4c';
import { setIcon } from './icons.js?v=3.4c';
import { at, count, counts, findHabit, isDue, isStat, statFacts, isWeekly, nextDue, streakText, weekDone, weekQuota, isQuant, state, frac, goalOn, inLife, isSkipped, lifeEnd, lifeStats, NOTE_MAX, noteOf, rawCount, setNote, setSkip, stepDown, stepUp, streak, targetOn } from './storage.js?v=3.4c';
import { askConfirm, closeMenu, countTo, holdHeight, menuEl, numOf, openOverlay, openPopover, toast, periodSlider } from './ui.js?v=3.4c';
import { catName, changeCount } from './render.js?v=3.4c';
import { openForm } from './form.js?v=3.4c';
import { queueTips } from './tips.js?v=3.4c';
import { fmtNum, HIST_RANGES, HIST_STORE, planBar, planStats, unitChanged } from './plan.js?v=3.4c';

export let hist = null;
export const HABIT_HOW = [
  ['Серия', 'Сколько запланированных дней подряд норма выполнена полностью. Дни вне расписания и пропуски цепочку не рвут, сегодняшний день не сгорает до вечера.'],
  ['Рекорд', 'Самая длинная серия за всё время. Не уменьшается после срыва.'],
  ['Всего', 'Сколько всего сделано за всё время: дней для привычек «да/нет», количество — для привычек со счётом.'],
  ['Сделано и норма', 'Для привычек со счётом: всё, что отмечено за период, и в сколько дней норма выполнена полностью. Перевыполнение в один день не закрывает пропуск в другой. Если норма менялась, каждый день сравнивается с нормой того дня.'],
  ['Выполнено', 'Для привычек «да/нет»: в сколько запланированных дней периода привычка выполнена. Пропуски и дни вне расписания не считаются, сегодняшний — после отметки.'],
  ['Сравнение', 'Сравнивается тот же процент, что указан выше: для привычек со счётом — сколько сделано от нормы, для «да/нет» — доля выполненных дней. Берётся то же число дней прошлого периода: в среду неделя сравнивается с понедельником–средой прошлой недели. Не показывается, если в прошлом периоде меньше 3 дней с планом.'],
  ['По дням недели', 'Появляется, когда в периоде хотя бы 21 день с планом.'],
];
export const WD_NOM = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const WD_IN = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
export const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export function compareRange(range, ds, anchor, today = parseKey(todayKey())) {
  const tk = key(today), elapsed = ds.filter(d => key(d) <= tk), prevAll = rangeDays(range, shiftAnchor(range, anchor, -1));
  const live = key(ds[ds.length - 1]) > tk && elapsed.length > 0, n = elapsed.length;
  const prevDs = live ? prevAll.slice(0, n) : prevAll, a = prevDs[0], b = prevDs[prevDs.length - 1];
  let label;
  if (range === 'week') label = !live ? 'неделей раньше' : n === 1 ? `в прошлый ${WD_NOM[0]}` : `${WEEKDAYS[0].toLowerCase()}–${WEEKDAYS[n - 1].toLowerCase()} прошлой недели`;
  else if (range === 'month') label = !live ? `в ${MONTHS_IN[a.getMonth()]}${a.getFullYear() !== today.getFullYear() ? ` ${a.getFullYear()} года` : ''}` : `${n === 1 ? '' : '1–'}${b.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  else label = live ? `за тот же срок ${a.getFullYear()} года` : `в ${a.getFullYear()} году`;
  return { cur: elapsed, prev: prevDs, label, live };
}
export const keepRange = s => s.replace(/(\S)–(\S)/g, '$1\u2060–\u2060$2');
export function compareText(cur, prev, label) {
  if (cur == null || prev == null) return '';
  if (cur > prev) return `▲ Лучше, чем ${label}: ${cur}% против ${prev}%`;
  if (cur < prev) return `▼ Хуже, чем ${label}: ${cur}% против ${prev}%`;
  return `Так же, как ${label}: ${cur}%`;
}
const put = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
const fmtDec = x => (Math.round(x * 10) / 10).toLocaleString('ru-RU');
const daysPct = p => p.plannedDays ? Math.round(p.daysDone / p.plannedDays * 100) : null;
const RING_R = 15.5, RING_C = 2 * Math.PI * RING_R;

export const IC_GOAL = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></svg>';
export const IC_DONE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5.3"/></svg>';
export const IC_FIRE = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.6-4.2-6.6-4.6-11.5-2.6 2-4 4.6-4 7.3-1.1-.6-1.9-1.7-2.1-3.2-1.5 1.8-2.3 4.4-2.3 7.4A6.5 6.5 0 0 0 12 21z"/></svg>';
export const fact = (icon, l, v, sub = '') => `<div class="fact"><span class="fi">${icon}</span><span class="fl">${l}</span>
    <span class="fv">${esc(v)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
export const goalText = g => (g.target > 1 ? `${g.target} ${g.unit || 'раз'} в день` : '1 раз в день') + (g.step > 1 ? ` · по ${g.step} за нажатие` : '');

export const savedRange = () => { try { const v = localStorage.getItem(HIST_STORE); return HIST_RANGES.includes(v) ? v : 'week'; } catch { return 'week'; } };
export function openHistory(id) {
  const h = findHabit(id);
  hist = { id, range: savedRange(), anchor: parseKey(lifeEnd(h)), back: null };
  const past = lifeEnd(h) === todayKey() && startAnchor(hist.range, h.created);
  if (past) Object.assign(hist, { anchor: past.anchor, back: past.start });
  for (const id of ['hTrio', 'hWd', 'hNotes']) $(id)._html = null;
  histSlider.reset();
  const real = hist;
  hist = { ...real, range: 'week', anchor: parseKey(lifeEnd(h)), back: null };
  renderHistory();
  openOverlay($('histOv'));
  fitTitle();
  holdHeight($('hSheet'));
  hist = real;
  if (real.range !== 'week' || real.back) renderHistory();
  queueTips(1000);
}
function fitTitle() {
  const h2 = $('hName'), head = h2.closest('.sheet-head');
  head.classList.remove('h-wrap');
  h2.style.hyphens = 'manual'; h2.style.overflowWrap = 'normal';
  const lh = parseFloat(getComputedStyle(h2).lineHeight) || 20;
  const wrap = h2.clientWidth && (h2.scrollWidth > h2.clientWidth + 1 || h2.offsetHeight > lh * 2 + 2);
  h2.style.hyphens = h2.style.overflowWrap = '';
  head.classList.toggle('h-wrap', !!wrap);
}
$('histOv').addEventListener('click', e => { if (e.target === $('histOv') || e.target.closest('[data-close]')) hist = null; });
$('hEdit').onclick = () => openForm(hist.id);

$('hTabs').onclick = e => {
  const r = e.target.closest('button')?.dataset.r;
  if (!r || !hist || r === hist.range) return;
  hist.range = r;
  hist.anchor = parseKey(lifeEnd(findHabit(hist.id)));
  try { localStorage.setItem(HIST_STORE, r); } catch {}
  renderHistory();
};
export const shiftAnchor = (range, a, dir) => range === 'week' ? addDays(a, 7 * dir)
  : range === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1)
  : new Date(a.getFullYear() + dir, 0, 1);
const PAST = { week: ['Итоги прошлой недели', 'Эта неделя →'], month: ['Итоги прошлого месяца', 'Этот месяц →'], year: ['Итоги прошлого года', 'Этот год →'] };
export function startAnchor(range, first, today = new Date()) {
  if (TEST_MODE && !window.__pastStart || !PAST[range] || !first || key(rangeDays(range, today)[0]) !== key(today)) return null;
  const anchor = shiftAnchor(range, today, -1), ds = rangeDays(range, anchor);
  return first <= key(ds[ds.length - 1]) ? { anchor, start: key(ds[0]) } : null;
}
export function paintBack(box, view, range, ds, onCurrent) {
  const on = !!view.back && view.back === key(ds[0]) && !!PAST[range];
  if (!on) view.back = null;
  box.hidden = !on;
  if (!on) return;
  box.querySelector('span').textContent = PAST[range][0];
  const b = box.querySelector('button');
  b.textContent = PAST[range][1];
  b.onclick = () => { view.back = null; onCurrent(); };
}
export function shiftPeriod(dir) {
  hist.anchor = shiftAnchor(hist.range, hist.anchor, dir);
  renderHistory();
}
const histSlider = periodSlider({
  sheet: $('hSheet'), zone: '#hSheet .pnav, #hPer', track: $('hPerTrack'), prev: $('hPrev'), next: $('hNext'), tabs: $('hTabs'),
  active: () => !!hist, get: () => hist.anchor, set: a => { hist.anchor = a; }, step: (a, s) => shiftAnchor(hist.range, a, s), render: renderHistory, paint: () => paintPeriod(),
});

export function periodDays() {
  return rangeDays(hist.range, hist.anchor);
}
export function period() {
  const ds = periodDays();
  return { kind: hist.range, start: key(ds[0]), end: key(ds[ds.length - 1]) };
}
export function rangeDays(range, a) {
  let start, n;
  if (range === 'week') { start = addDays(a, -weekday(a)); n = 7; }
  else if (range === 'month') { start = new Date(a.getFullYear(), a.getMonth(), 1); n = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate(); }
  else { start = new Date(a.getFullYear(), 0, 1); n = Math.round((new Date(a.getFullYear() + 1, 0, 1) - start) / 864e5); }
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

export const periodLabel = ds => rangeLabel(hist.range, ds);
export function rangeLabel(range, ds) {
  const a = ds[0], b = ds[ds.length - 1];
  if (range === 'year') return `${a.getFullYear()} г.`;
  if (range === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()} г.`;
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.getDate()}${sameMonth ? '' : ' ' + MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()} г.`;
}

export function dayTip(h, d) {
  h = at(h, d);
  const k = key(d), c = count(h, d);
  const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  if (k > todayKey()) return `${date}: ещё впереди`;
  if (k < h.created) return `${date}: привычки ещё не было`;
  if (h.archived && k > h.archived) return `${date}: в архиве`;
  if (isSkipped(h, d)) return `${date}: пропуск`;
  if (!isDue(h, d) && !c) return `${date}: не по расписанию`;
  if (h.target === 1) return `${date}: ${c ? 'выполнено' : 'не выполнено'}`;
  return `${date}: ${c} из ${h.target}${h.unit ? ' ' + h.unit : ''}${c > h.target ? ` (+${c - h.target})` : ''}`;
}

export function renderHistory() {
  const h = findHabit(hist.id);
  if (!h) return;
  const ls = lifeStats(h), cur = h.archived ? 0 : streak(h);
  $('hSheet').style.setProperty('--c', h.color);
  setIcon($('hIcon'), h.icon);
  $('hName').textContent = h.name;
  fitTitle();
  $('hEdit').hidden = !!h.archived;
  const time = TIMES.find(t => t.v === h.time);
  const goal = goalText(h);
  $('hTags').innerHTML = [
    h.archived ? '<span class="tag arch">В архиве</span>' : '',
    `<span class="tag">${esc(h.step > 1 ? `${h.target} ${h.unit || 'раз'} по ${h.step}` : goal)}</span>`,
    scheduleOf(h).type !== 'daily' ? `<span class="tag">${esc(schedText(h)[0].toUpperCase() + schedText(h).slice(1))}</span>` : '',
    `<span class="tag">${time.icon} ${time.v === 'any' ? 'Любое время' : time.label}</span>`,
    h.cat && catName(h.cat) ? `<span class="tag cat">${esc(catName(h.cat))}</span>` : '',
  ].join('');
  requestAnimationFrame(() => $('hTags').classList.toggle('overflow', $('hTags').scrollWidth > $('hTags').clientWidth + 1));
  const today = todayKey(), life = planStats(h, state, h.created, lifeEnd(h), today);
  const unitWord = n => isWeekly(h, parseKey(lifeEnd(h))) ? plural(n, 'неделя', 'недели', 'недель') : plural(n, 'день', 'дня', 'дней');
  const total = isQuant(h) ? life.fact : life.daysDone;
  const totalWord = isQuant(h) ? `${h.unit || 'раз'} всего` : `${plural(total, 'день', 'дня', 'дней')} всего`;
  if (isStat(h)) put($('hTrio'), statTrio(h, cur, unitWord));
  else put($('hTrio'), `<div><b>🔥 ${cur}</b><small>${cur ? `${unitWord(cur)} подряд` : h.archived ? 'в архиве' : 'серии пока нет'}</small></div>`
    + `<div><b>${ls.best}</b><small>рекорд</small></div><div><b${String(Math.round(total)).length > 5 ? ' class="long"' : ''}>${fmtNum(total)}</b><small>${esc(totalWord)}</small></div>`);
  $('hHow').onclick = e => {
    if (menuEl?._anchor === e.currentTarget) return closeMenu();
    openPopover(e.currentTarget, `<div class="pop-title">Как считается</div>${HABIT_HOW.filter(([t]) => t !== (isQuant(h) ? 'Выполнено' : 'Сделано и норма')).map(([t, d]) => `<div class="pop-sec"><b>${t}</b>${d}</div>`).join('')}`, h.color);
  };

  $('hInfo').onclick = e => {
    if (menuEl?._anchor === e.currentTarget) return closeMenu();
    openPopover(e.currentTarget, `<div class="pop-title">Сведения</div><div class="facts">${factsHTML()}</div>`, h.color);
  };
  const factsHTML = () => {
  const ago = k => {
    const n = Math.round((parseKey(todayKey()) - parseKey(k)) / 864e5);
    return n === 0 ? 'сегодня' : n === 1 ? 'вчера' : `${days(n)} назад`;
  };
  const IC_CAL = '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const IC_PEN = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>';
  const IC_REP = '<svg class="ic" viewBox="0 0 24 24"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/></svg>';
  const IC_BOX = '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>';
  const sched = schedText(h);
  return fact(IC_CAL, 'Создана', fmtLong(h.created), ago(h.created)) +
    (h.updated && h.updated !== h.created ? fact(IC_PEN, 'Изменена', fmtLong(h.updated), ago(h.updated)) : '') +
    fact(IC_GOAL, 'Цель', goal) +
    fact(IC_REP, 'Расписание', sched[0].toUpperCase() + sched.slice(1)) +
    fact(IC_BOX.replace('M10 12h4', 'M8 12h8'), 'Категория', catName(h.cat) || 'Без категории') +
    (h.why ? fact(IC_PEN, 'Зачем', h.why) : '') +
    (h.archived ? fact(IC_BOX, 'В архиве', fmtLong(h.archived), ago(h.archived)) : '');
  };

  for (const b of $('hTabs').children) b.setAttribute('aria-pressed', b.dataset.r === hist.range);

  const ds = periodDays();
  $('hLabel').textContent = periodLabel(ds);
  $('hPrev').disabled = key(ds[0]) <= h.created;
  $('hNext').disabled = key(ds[ds.length - 1]) >= lifeEnd(h);
  paintBack($('hBack'), hist, hist.range, ds, () => { hist.anchor = parseKey(lifeEnd(h)); renderHistory(); });
  paintPeriod(h, ds);
}

function statTrio(h, cur, unitWord) {
  const f = statFacts(h), ago = f.last ? Math.round((parseKey(todayKey()) - parseKey(f.last)) / 864e5) : null;
  const last = ago == null ? '<b>—</b><small>ещё не было</small>' : ago === 0 ? '<b>Сегодня</b><small>последний раз</small>' : `<b>${ago}</b><small>${plural(ago, 'день', 'дня', 'дней')} назад</small>`;
  const run = `<b>🔥 ${cur}</b><small>${cur ? `${unitWord(cur)} подряд` : h.archived ? 'в архиве' : 'серии пока нет'}</small>`;
  return `<div>${run}</div><div>${last}</div><div><b>${f.n}</b><small>${plural(f.n, 'раз', 'раза', 'раз')} всего</small></div>`;
}
const fmtDay = k => parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
function paintStatPeriod(h, ds) {
  const f = statFacts(h, key(ds[0]), key(ds[ds.length - 1])), avg = statFacts(h).avg, box = $('hPlan');
  $('hRing').hidden = true;
  box.hidden = false;
  box._id = null;
  box.innerHTML = `<div class="plan-l1"><span class="plan-l1t">${f.n ? `Отмечено <b>${f.n}</b> ${plural(f.n, 'раз', 'раза', 'раз')}` : 'В этом периоде отметок нет'}</span></div>`
    + (f.n ? `<div class="plan-l2"><span>${f.days.length > 12 ? `${f.days.slice(-12).map(fmtDay).join(', ')} и ещё ${f.days.length - 12}` : f.days.map(fmtDay).join(', ')}</span></div>` : '')
    + `<p class="plan-note">${avg ? `В среднем раз в ${avg} ${plural(avg, 'день', 'дня', 'дней')}. ` : ''}Статистическая привычка: только отметки и серия, без сводки и сравнений</p>`;
}

function paintPeriod(h = findHabit(hist.id), ds = periodDays()) {
  if (!h) return;
  if (isStat(h)) {
    paintStatPeriod(h, ds);
    $('hDaysTitle').textContent = hist.range === 'year' ? 'По месяцам' : 'По дням';
    $('hChart').innerHTML = hist.range === 'year' ? yearRows(h, ds) : (hist.range === 'week' ? weekView(h, ds) : monthView(h, ds)) + '<div class="tip"></div>';
    $('hWdWrap').hidden = true;
    paintNotes(h, ds);
    return;
  }
  const today = todayKey(), p = planStats(h, state, key(ds[0]), key(ds[ds.length - 1]), today), quant = isQuant(h);
  const cmp = compareRange(hist.range, ds, hist.anchor), cur = cmp.cur.length ? planStats(h, state, key(cmp.cur[0]), key(cmp.cur[cmp.cur.length - 1]), today) : p;
  const prev = planStats(h, state, key(cmp.prev[0]), key(cmp.prev[cmp.prev.length - 1]), today);
  const share = x => quant ? (x.plan ? Math.round(x.fact / x.plan * 100) : null) : daysPct(x);
  const cv = cur.plannedDays && prev.plannedDays >= 3 ? share(cur) : null, pv = cv == null ? null : share(prev);
  const d = cv == null || pv == null ? null : cv - pv, cmpTxt = keepRange(compareText(d == null ? null : cv, pv, cmp.label));
  if (quant) { $('hRing').hidden = true; renderPlan(h, p, cmpTxt, d); }
  else { $('hPlan').hidden = true; $('hPlan').innerHTML = ''; paintRing(h, ds, p, cmpTxt, d); }
  $('hDaysTitle').textContent = hist.range === 'year' ? 'По месяцам' : 'По дням';
  if (hist.range === 'year') $('hChart').innerHTML = yearRows(h, ds);
  else $('hChart').innerHTML = (hist.range === 'week' ? (quant ? weekBars(h, ds) : weekView(h, ds)) : monthView(h, ds)) + (quant ? chartFoot(h, ds, p) : '') + '<div class="tip"></div>';
  paintWeekdays(h, cmp.cur);
  paintNotes(h, ds);
}

function paintRing(h, ds, p, cmpTxt, d) {
  const box = $('hRing');
  box.hidden = false;
  box.classList.toggle('muted', !p.plannedDays);
  if (!p.plannedDays) { box.innerHTML = '<p class="s-sum">В этом периоде данных нет</p>'; return; }
  const pct = daysPct(p), today = todayKey(), tk = parseKey(today);
  const skips = ds.filter(x => key(x) <= today && inLife(h, key(x)) && isSkipped(h, x)).length;
  const pending = ds.some(x => key(x) === today) && dayState(h, tk) === 'pending';
  const sub = [skips ? `${skips} ${plural(skips, 'пропуск', 'пропуска', 'пропусков')}` : '', pending ? 'сегодня ещё впереди' : ''].filter(Boolean).join(', ');
  box.innerHTML = `<div class="s-ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="s-tr" cx="18" cy="18" r="${RING_R}"/>${pct ? `<circle class="s-pr" cx="18" cy="18" r="${RING_R}" stroke-dasharray="${(pct / 100 * RING_C).toFixed(2)} ${RING_C.toFixed(2)}"/>` : ''}</svg><b>${pct}%</b></div><div class="s-htxt"><p class="s-sum">${p.daysDone} из ${p.plannedDays} ${plural(p.plannedDays, 'дня', 'дней', 'дней')}</p>${sub ? `<p class="s-sub">${sub}</p>` : ''}${cmpTxt ? `<p class="s-cmp${d < 0 ? ' down' : ''}">${cmpTxt}</p>` : ''}</div>`;
}

function weekBars(h, ds) {
  const today = todayKey(), tg = targetOn(h, ds[ds.length - 1]);
  const vals = ds.map(x => key(x) <= today && inLife(h, key(x)) ? count(h, x) : null);
  const n = tg || 1, H = 90, base = Math.round(H * .6), y = v => Math.round(v <= n ? v / n * base : base + (H - base) * (1 - n / v));
  const cols = ds.map((x, i) => {
    const v = vals[i], st = dayState(h, x), t = targetOn(h, x);
    const lab = `<span class="hb-lb${isToday(x) ? ' now' : ''}"><b>${x.getDate()}</b>${WEEKDAYS[weekday(x)]}</span>`;
    if (v == null) return `<div class="hb-c${dayAttrs(h, x)}><i class="hb-bar fut"></i>${lab}</div>`;
    const cls = st === 'skip' ? 'skip' : st === 'off' && !v ? 'off' : v >= t ? 'full' : 'part', over = v > t ? Math.max(3, y(v) - y(t)) : 0;
    return `<div class="hb-c${dayAttrs(h, x)}><i class="hb-bar ${cls}" style="height:${Math.max(v ? 4 : 0, y(v))}px">${over ? `<span class="hb-ov" style="height:${over}px"></span>` : ''}${v ? `<em>${fmtNum(v)}</em>` : ''}</i>${lab}</div>`;
  }).join('');
  return `<div class="hb" style="--h:${H}px"><span class="hb-norm" style="bottom:calc(var(--lb) + ${y(tg)}px)"></span>${cols}</div>${legend(h, tg)}`;
}

function chartFoot(h, ds, p) {
  if (!p.plannedDays) return '';
  const today = todayKey();
  let best = null, ties = 0;
  for (const x of ds) if (key(x) <= today && inLife(h, key(x))) { const c = count(h, x); if (c > 0 && (!best || c > best.c)) { best = { x, c }; ties = 1; } else if (best && c === best.c) ties++; }
  if (ties > 1) best = null;
  return `<div class="h-foot"><span>В среднем <b>${fmtDec(p.fact / p.plannedDays)}</b> в день</span>${best ? `<span>Лучший день: <b>${hist.range === 'week' ? WEEKDAYS[weekday(best.x)].toLowerCase() : best.x.getDate() + ' ' + MONTHS_SHORT[best.x.getMonth()]}, ${fmtNum(best.c)}</b></span>` : ''}</div>`;
}

export function yearRows(h, ds) {
  const y = ds[0].getFullYear(), today = todayKey(), quant = isQuant(h), rows = [];
  for (let m = 11; m >= 0; m--) {
    const a = key(new Date(y, m, 1)), b = key(new Date(y, m + 1, 0));
    if (a > today || b < h.created || (h.archived && a > h.archived)) continue;
    const p = planStats(h, state, a, b, today);
    rows.push({ m, p, pct: daysPct(p), n: statFacts(h, a, b).n, now: a <= today && b >= today });
  }
  if (!rows.length) return '<p class="s-empty">В этом году привычки ещё не было</p>';
  if (isStat(h)) {
    const top = Math.max(1, ...rows.map(r => r.n));
    return `<div class="mrows">${rows.map(r => {
      const val = r.n ? `${r.n} ${plural(r.n, 'раз', 'раза', 'раз')}` : 'нет отметок';
      return `<button type="button" class="mrow${r.now ? ' now' : ''}" data-m="${r.m}" aria-label="${esc(`${MONTHS[r.m]}: ${val}`)}"><b>${MONTHS[r.m]}${r.now ? '<small>идёт</small>' : ''}</b><span class="mbar"><i style="width:${Math.round(r.n / top * 100)}%"></i></span><span class="mv">${val}</span></button>`;
    }).join('')}</div><p class="s-hint">Касание месяца открывает его календарь</p>`;
  }
  const best = rows.length > 1 ? rows.reduce((a, b) => (b.pct ?? -1) > (a.pct ?? -1) ? b : a) : null;
  return `<div class="mrows">${rows.map(r => {
    const tag = r.now ? 'идёт' : r === best && r.pct ? 'лучший' : '';
    const val = r.pct == null ? 'нет плана' : `${r.p.daysDone} из ${r.p.plannedDays} дн.`;
    const sub = r.pct == null ? '' : quant ? `${fmtDec(r.p.fact / r.p.plannedDays)} в день` : `${r.pct}%`;
    return `<button type="button" class="mrow${r.pct != null && r.pct < 60 ? ' low' : ''}${r.now ? ' now' : ''}${tag === 'лучший' ? ' best' : ''}" data-m="${r.m}" aria-label="${esc(`${MONTHS[r.m]}: ${val}${sub ? ', ' + sub : ''}`)}">
      <b>${MONTHS[r.m]}${tag ? `<small>${tag}</small>` : ''}</b><span class="mbar"><i style="width:${r.pct || 0}%"></i></span><span class="mv">${val}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  }).join('')}</div><p class="s-hint">Касание месяца открывает его календарь</p>`;
}

function paintWeekdays(h, ds) {
  const today = todayKey(), wd = Array.from({ length: 7 }, () => ({ n: 0, done: 0 }));
  let total = 0;
  for (const x of ds) {
    if (key(x) > today || !inLife(h, key(x)) || isSkipped(h, x) || !isDue(h, x)) continue;
    const c = count(h, x);
    if (key(x) === today && !c) continue;
    const w = wd[weekday(x)];
    w.n++; total++;
    if (c >= targetOn(h, x)) w.done++;
  }
  $('hWdWrap').hidden = total < 21;
  if (total < 21) return put($('hWd'), '');
  const pct = wd.map(w => w.n ? Math.round(w.done / w.n * 100) : null), known = pct.map((v, i) => ({ v, i })).filter(x => x.v != null);
  const top = known.reduce((a, b) => b.v > a.v ? b : a), bot = known.reduce((a, b) => b.v < a.v ? b : a), spread = top.v - bot.v >= 15;
  put($('hWd'), `<div class="hwd">${pct.map((v, i) => `<div class="${spread && i === top.i ? 'hw-top' : spread && i === bot.i ? 'hw-bot' : ''}" title="${WD_NOM[i]}: ${v ?? 0}%"><em>${v == null ? '—' : v + '%'}</em><span class="wb"><i style="height:${Math.max(4, v || 0)}%"></i></span><small>${WEEKDAYS[i]}</small></div>`).join('')}</div>
    <p class="hwd-t">${spread ? `Лучше всего — ${WD_IN[top.i]}, слабее — ${WD_IN[bot.i]}` : 'Все дни недели примерно одинаково'}</p>`);
}

function paintNotes(h, ds) {
  const today = todayKey(), list = ds.filter(x => key(x) <= today && inLife(h, key(x)) && noteOf(h, x)).reverse().slice(0, 10);
  $('hNotesWrap').hidden = !list.length;
  put($('hNotes'), list.map(x => `<button type="button" class="hn" data-day="${key(x)}"><b>${x.getDate()} ${MONTHS_SHORT[x.getMonth()]}</b><span>${esc(noteOf(h, x))}</span></button>`).join(''));
}

const fmtShort = k => { const d = parseKey(k); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
export function goalSteps(h) {
  const gs = h.goals || [];
  return [{ from: gs.length ? key(addDays(parseKey(gs[gs.length - 1].until), 1)) : h.created, target: h.target, unit: h.unit },
    ...gs.map((g, i) => ({ from: i ? key(addDays(parseKey(gs[i - 1].until), 1)) : h.created, target: g.target, unit: g.unit })).reverse()];
}
export function renderPlan(h, p = planStats(h, state, period().start, period().end, todayKey()), cmpTxt = '', d = null) {
  const box = $('hPlan');
  box.hidden = !isQuant(h);
  if (box.hidden) { box.innerHTML = ''; return; }
  const unit = h.unit ? ' ' + esc(h.unit) : '', steps = h.goals?.length ? goalSteps(h) : null;
  let body;
  if (!p.plannedDays) body = '<p class="plan-empty">В этом периоде данных нет</p>';
  else {
    const pct = Math.round(p.fact / p.plan * 100), bar = planBar(p);
    const markPos = bar.mark == null ? '' : bar.mark > 85 ? 'end' : bar.mark < 15 ? 'start' : 'mid';
    body = `<div class="plan-l1${String(Math.round(Math.max(p.fact, p.plan))).length > 5 ? ' long' : ''}"><span class="plan-l1t">Сделано <b>${fmtNum(p.fact)}</b> из ${fmtNum(p.plan)}${unit}</span> <span class="plan-pct">${pct}%</span></div>
    <div class="plan-meter${bar.mark == null ? '' : ' marked'}">
      ${bar.mark == null ? '' : `<span class="pb-mark pb-${markPos}" style="left:${bar.mark}%"><span>план ${fmtNum(p.plan)}</span></span>`}
      <div class="plan-bar" role="img" aria-label="Сделано ${fmtNum(p.fact)} из ${fmtNum(p.plan)}${p.over ? `, из них сверх нормы ${fmtNum(p.over)}` : ''}"><i class="pb-in" style="width:${bar.inW}%"></i>${p.over ? `<i class="pb-over" style="width:${bar.overW}%"></i>` : ''}</div>
    </div>
    ${p.over ? `<div class="plan-lg"><span><i class="pb-dot pb-in"></i>в норму ${fmtNum(p.credited)}</span><span><i class="pb-dot pb-over"></i>сверх нормы ${fmtNum(p.over)}</span></div>` : ''}
    ${cmpTxt ? `<p class="plan-cmp"><span class="s-cmp${d < 0 ? ' down' : ''}">${cmpTxt}</span></p>` : ''}
    <div class="plan-l2"><span>Норма выполнена в <b>${p.daysDone} из ${p.plannedDays}</b> ${plural(p.plannedDays, 'дня', 'дней', 'дней')}${pct >= 100 && p.daysDone < p.plannedDays ? ', но не во все дни' : ''}</span></div>
    ${unitChanged(h, period().start) ? '<p class="plan-note">Единица измерения менялась — старые и новые числа могут не совпадать по смыслу</p>' : ''}`;
  }
  const per = period().start, was = box._id === h.id && box._per === per ? numOf(box.querySelector('.plan-l1 b')?.textContent ?? '') : null;
  box._id = h.id;
  box._per = per;
  box.innerHTML = body + (steps ? `<details class="plan-goals"><summary>Как менялась норма</summary><ul>${steps.map(s =>
      `<li>с ${fmtShort(s.from)} — ${s.target}${s.unit ? ' ' + esc(s.unit) : ''}</li>`).join('')}</ul></details>` : '');
  const factEl = box.querySelector('.plan-l1 b');
  if (factEl && was != null) countTo(factEl, Math.round(p.fact), '', { from: was, fmt: fmtNum });
}

export function dayState(h, d) {
  const k = key(d), c = count(h, d);
  if (k > todayKey()) return 'future';
  if (k < h.created) return 'before';
  if (h.archived && k > h.archived) return 'after';
  if (isSkipped(h, d)) return 'skip';
  if (c >= targetOn(h, d)) return 'full';
  if (c > 0) return 'part';
  if (!isDue(h, d) || isStat(h)) return 'off';
  return k === todayKey() ? 'pending' : 'miss';
}

export function dayRing(h, d, i, size) {
  const st = dayState(h, d), sw = size > 40 ? 4 : 3, r = size / 2 - sw / 2 - 1, C = 2 * Math.PI * r;
  const share = st === 'full' ? 1 : st === 'part' ? frac(h, d) : 0;
  const c = size / 2;
  return `<div class="dring s-${st}" style="--i:${i}; --C:${C}; width:${size}px; height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>${share
      ? `<circle class="prog" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - share)}"/>` : ''}</svg>
    <span>${d.getDate()}</span></div>`;
}

export function weekView(h, ds) {
  const val = d => {
    const st = dayState(h, d), c = count(h, d), t = targetOn(h, d), multi = t > 1;
    const w = s => `<span class="wk-w">${s}</span>`, of = n => t >= 1000 ? `${n}<span class="wk-t"><wbr>/${t}</span>` : `${n}<wbr>/${t}`;
    return {
      full: multi ? of(c) : w('готово'), part: of(c), skip: w('пропуск'), off: isStat(h) ? '' : w('не в плане'),
      miss: multi ? of(0) : w('нет'), pending: multi ? of(0) : w('сегодня'),
    }[st] || '';
  };
  return `<div class="wk">${ds.map((d, i) => `
    <div class="wk-day${isToday(d) ? ' today' : ''}${dayAttrs(h, d)}>
      <div class="wk-wd">${WEEKDAYS[weekday(d)]}</div>
      ${dayRing(h, d, i, 46)}
      <div class="wk-val s-${dayState(h, d)}">${val(d)}</div>${count(h, d) > targetOn(h, d) && inLife(h, key(d)) ? `<div class="wk-over">+${fmtNum(count(h, d) - targetOn(h, d))}</div>` : ''}
    </div>`).join('')}</div>${legend(h)}`;
}

export function monthView(h, ds) {
  const pad = weekday(ds[0]);
  return `<div class="cal">
    ${WEEKDAYS.map(w => `<div class="cal-wd">${w}</div>`).join('')}
    ${'<div></div>'.repeat(pad)}
    ${ds.map((d, i) => { const c = count(h, d), show = isQuant(h) && inLife(h, key(d)) && key(d) <= todayKey(); return `<div class="cal-day${isToday(d) ? ' today' : ''}${show && c > targetOn(h, d) ? ' over' : ''}${dayAttrs(h, d)}>${dayRing(h, d, i, 38)}${isQuant(h) ? `<em class="cal-n">${show && c ? fmtNum(c) : ''}</em>` : ''}</div>`; }).join('')}
  </div>${legend(h)}`;
}

export function dayAttrs(h, d) {
  const tip = esc(dayTip(h, d));
  if (!inLife(h, key(d))) return `" data-tip="${tip}"`;
  const note = noteOf(h, d);
  return `${note ? ' note' : ''}" data-tip="${tip}" data-day="${key(d)}" role="button" tabindex="0" aria-label="${tip}${note ? ', есть заметка' : ''}"`;
}

export let day = null;
export function openDay(id, d) {
  const h = findHabit(id);
  if (!h || !inLife(h, key(d))) return;
  day = { id, d };
  renderDay();
  $('dNote').value = noteOf(h, d);
  noteUi();
  openOverlay($('dayOv'));
}
export function renderDay() {
  const h = findHabit(day.id), d = day.d;
  if (!h) return;
  $('dSheet').style.setProperty('--c', h.color);
  setIcon($('dIcon'), h.icon);
  $('dName').textContent = h.name;
  $('dDate').textContent = fmtLong(key(d)) + (isToday(d) ? ' · сегодня' : '');
  const g = goalOn(h, d), c = rawCount(h, d), part = `${c} из ${g.target} ${g.unit || 'раз'}`;
  const [done, sub] = isSkipped(h, d) ? ['Пропуск', '']
    : g.target > 1 && c > g.target ? ['Перевыполнено', `${part} (+${c - g.target})`]
    : c >= g.target ? ['Полностью', g.target > 1 ? part : '']
    : c > 0 ? ['Частично', part]
    : !isDue(h, d) ? ['Не по расписанию', '']
    : [isToday(d) ? 'Пока не выполнено' : 'Не выполнено', g.target > 1 ? part : ''];
  const s = streak(h, key(d));
  $('dFacts').innerHTML = fact(IC_GOAL, 'Цель', goalText(g)) + fact(IC_DONE, 'Выполнение', done, sub) +
    fact(IC_FIRE, 'Серия', s ? streakText(h, s) : 'Нет', s ? 'подряд на этот день' : '');
  markUi(h, d);
}
function markUi(h, d) {
  const g = at(h, d), c = count(h, d), skipped = isSkipped(h, d);
  const skip = skipped || (isDue(h, d) && !c && !isWeekly(h, d))
    ? `<button type="button" class="d-btn" data-m="skip">${skipped ? 'Отменить пропуск' : 'Пропустить день'}</button>` : '';
  if (g.target === 1) {
    $('dMark').innerHTML = `<div class="d-toggle${skipped ? ' off' : ''}"><span id="dDoneLbl">Выполнено</span>
      <button type="button" class="switch" data-m="toggle" role="switch" aria-checked="${c > 0}" aria-labelledby="dDoneLbl"${skipped ? ' disabled' : ''}><span></span></button></div>
      ${skip ? `<div class="d-row">${skip}</div>` : ''}`;
    return;
  }
  const b = planBar({ plan: g.target, fact: c, credited: Math.min(c, g.target), over: Math.max(0, c - g.target) });
  const unit = g.unit || 'раз', step = g.step && g.step > 1 ? g.step : 1;
  $('dMark').innerHTML = `<div class="d-step">
      <button type="button" class="d-rb" data-m="minus" aria-label="Убрать ${step}"${c ? '' : ' disabled'}><svg class="ic" viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>
      <div class="d-val" aria-live="polite"><b>${fmtNum(c)}</b><span>из ${fmtNum(g.target)} ${esc(unit)}</span></div>
      <button type="button" class="d-rb" data-m="plus" aria-label="Добавить ${step}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button>
    </div>
    <div class="plan-bar d-bar"><i class="pb-in" style="width:${b.inW}%"></i><i class="pb-over" style="width:${b.overW}%"></i></div>
    <div class="d-row">${c < g.target ? '<button type="button" class="primary d-btn" data-m="full">Выполнить полностью</button>' : ''}${c ? '<button type="button" class="d-btn" data-m="reset">Сбросить</button>' : ''}</div>
    ${skip ? `<div class="d-row">${skip}</div>` : ''}`;
}
function markChanged() {
  renderDay();
  if (hist) renderHistory();
}
$('dMark').addEventListener('click', e => {
  const m = e.target.closest('[data-m]')?.dataset.m, h = findHabit(day?.id);
  if (!m || !h) return;
  const d = day.d, g = at(h, d), c = count(h, d), past = !isToday(d);
  if (m === 'skip') {
    const was = isSkipped(h, d);
    setSkip(h, d, !was);
    if (past) toast(was ? 'Пропуск отменён' : 'День пропущен', () => {
      if (!findHabit(h.id)) return;
      setSkip(h, d, was);
      if (day?.id === h.id && key(day.d) === key(d)) renderDay();
      if (hist) renderHistory();
    });
  } else {
    const n = { plus: stepUp(g, c), minus: stepDown(g, c), full: g.target, reset: 0, toggle: c ? 0 : 1 }[m];
    changeCount(h, d, n, m === 'reset', past);
  }
  markChanged();
});
function noteUi() {
  const h = findHabit(day.id), v = $('dNote').value;
  $('dNoteDel').hidden = !noteOf(h, day.d);
  $('dNoteCount').textContent = v.length > NOTE_MAX - 100 ? `${v.length} / ${NOTE_MAX}` : '';
}
$('dNote').addEventListener('input', () => {
  const h = findHabit(day?.id);
  if (!h) return;
  const had = !!noteOf(h, day.d);
  setNote(h, day.d, $('dNote').value);
  noteUi();
  if (had !== !!noteOf(h, day.d) && hist) renderHistory();
});
$('dNoteDel').onclick = async () => {
  const h = findHabit(day?.id), was = noteOf(h, day.d), d = day.d;
  if (redUi() && !await askConfirm('Удалить заметку?', 'Текст заметки за этот день будет стёрт.', 'Удалить')) return;
  setNote(h, d, '');
  $('dNote').value = '';
  noteUi();
  if (hist) renderHistory();
  toast('Заметка удалена', () => {
    setNote(h, d, was);
    if (day?.id === h.id && key(day.d) === key(d)) { $('dNote').value = was; noteUi(); }
    if (hist) renderHistory();
  });
};
$('dayOv').addEventListener('click', e => { if (e.target === $('dayOv') || e.target.closest('[data-close]')) day = null; });
$('hChart').addEventListener('click', e => {
  const mr = e.target.closest('[data-m]');
  if (mr && hist) {
    hist.range = 'month';
    try { localStorage.setItem(HIST_STORE, 'month'); } catch {}
    hist.anchor = new Date(periodDays()[0].getFullYear(), +mr.dataset.m, 1);
    hist.back = null;
    return renderHistory();
  }
  const t = e.target.closest('[data-day]');
  if (!t || !hist) return;
  $('hChart')._hideTip?.();
  openDay(hist.id, parseKey(t.dataset.day));
});
$('hNotes').addEventListener('click', e => { const t = e.target.closest('[data-day]'); if (t && hist) openDay(hist.id, parseKey(t.dataset.day)); });
$('hChart').addEventListener('keydown', e => {
  const t = e.target.closest?.('[data-day]');
  if (!t || !hist || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  openDay(hist.id, parseKey(t.dataset.day));
});

export const legend = (h, norm) => norm != null ? `<div class="cal-legend hb-legend">
  <span><i class="lg norm"></i>норма ${fmtNum(norm)}</span><span><i class="lg sq full"></i>есть</span><span><i class="lg sq part"></i>часть</span><span><i class="lg sq over"></i>сверх</span>
</div>` : isStat(h) ? `<div class="cal-legend">
  <span><i class="lg full"></i>отмечено</span>
</div>` : isQuant(h) ? `<div class="cal-legend">
  <span><i class="lg full"></i>норма есть</span><span><i class="lg part"></i>часть нормы</span><span><i class="lg over"></i>сверх нормы</span>
</div>` : `<div class="cal-legend">
  <span><i class="lg full"></i>сделано</span><span><i class="lg miss"></i>не сделано</span><span><i class="lg skip"></i>пропуск</span>
</div>`;

export const TIP_HOLD = 350, TIP_LINGER = 1200, TIP_TAP = 2500;
export function bindTips(box) {
  let on = null, hideT = 0, hold = null, scrub = false;
  const hide = () => {
    clearTimeout(hideT);
    on?.classList.remove('on'); on = null;
    box.querySelector('.tip')?.classList.remove('show');
  };
  const later = ms => { clearTimeout(hideT); hideT = setTimeout(hide, ms); };
  const place = t => {
    const tip = box.querySelector('.tip');
    if (!tip) return;
    if (!t) return hide();
    clearTimeout(hideT);
    if (t !== on) { on?.classList.remove('on'); on = t; t.classList.add('on'); }
    const r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
    tip.textContent = t.dataset.tip;
    const half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(b.width - half, r.left - b.left + r.width / 2)) + 'px';
    tip.style.top = (t.classList.contains('hit') ? 10 : r.top - b.top) + 'px';
    tip.classList.add('show');
    const tr = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth, fix = tr.left < 8 ? 8 - tr.left : tr.right > vw - 8 ? vw - 8 - tr.right : 0;
    if (fix) tip.style.left = parseFloat(tip.style.left) + fix + 'px';
    tip.classList.toggle('noarrow', t.classList.contains('hit'));
    tip.style.setProperty('--ax', Math.round(r.left + r.width / 2 - tip.getBoundingClientRect().left) + 'px');
  };
  const at = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-tip]');
  const inside = t => t && box.contains(t);
  box._hideTip = hide;
  box.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') return place(e.target.closest('[data-tip]'));
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 8) { clearTimeout(hold.t); hold = null; }
  });
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
  box.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    clearTimeout(hold?.t);
    hold = { x: e.clientX, y: e.clientY };
    hold.t = setTimeout(() => { hold = null; scrub = true; document.body.classList.add('tip-scrub'); const t = at(e.clientX, e.clientY); if (inside(t)) place(t); }, TIP_HOLD);
  });
  box.addEventListener('touchmove', e => {
    if (!scrub) return;
    e.preventDefault();
    const p = e.touches[0], t = p && at(p.clientX, p.clientY);
    if (inside(t)) place(t);
  }, { passive: false });
  const up = () => {
    clearTimeout(hold?.t); hold = null;
    if (!scrub) return;
    box._scrubbed = true;
    setTimeout(() => { box._scrubbed = false; }, 60);
    scrub = false;
    document.body.classList.remove('tip-scrub');
    later(TIP_LINGER);
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('click', e => {
    if (box._scrubbed) { e.stopImmediatePropagation(); return; }
    const t = e.target.closest('[data-tip]');
    if (!t || t.closest('[data-day]')) return hide();
    place(t);
    later(TIP_TAP);
  }, true);
  box.closest('.sheet, .page-body, .overlay')?.addEventListener('scroll', hide, { passive: true, capture: true });
  document.addEventListener('pointerdown', e => { if (on && !box.contains(e.target)) hide(); }, true);
}
bindTips($('hChart'));

export function setHist(v) { hist = v; }
