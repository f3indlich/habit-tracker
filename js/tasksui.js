import { $, addDays, COLORS, esc, getPref, isVivid, key, plural, MONTHS, NS, parseKey, reducedMotion, setPref, todayKey, weekday, WEEKDAYS } from './core.js?v=3.4b';
import { IC } from './icons.js?v=3.4b';
import { save, state } from './storage.js?v=3.4b';
import { askConfirm, closeMenu, closeOverlay, flipAfter, openMenu, openOverlay, toast } from './ui.js?v=3.4b';
import { paintTaskMarks, render, sparks, viewDate } from './render.js?v=3.4b';
import { queueTips } from './tips.js?v=3.4b';
import { pushState } from './push.js?v=3.4b';
import { parseQuick } from './taskparse.js?v=3.4b';
import { firstOn, nextOccurrence, normRep, REP_MAX, REP_UNITS, repLabel, WD_SHORT } from './repeat.js?v=3.4b';
import { isPrivate, LONG_MS, LONG_SLOP, shownTasks, unlocked } from './privacy.js?v=3.4b';
import { absRemind, moveLabel, nextWeekend, SOMEDAY, daysBetween, dayLong, dayMarks, dayShort, ghostMarks, INBOX, normInboxName, SECTIONS, SMART, smartFilter, effDay, dayTasks, doneHeading, DUE_REMIND_HOUR, DUE_REMINDS, dueLabel, dueWhen, overdueDay, isOverdue, isRemind, monthEnd, overdueText, newListId, newSubId, newTaskId, normReminds, normSubs, orderOf, nextMonday, pendingToday, remDay, REMIND_DAYS_MAX, remindAt, remindOffset, remindsOf, remindState, remindText, REMINDS_MAX, TASK_LIM, TASK_REMINDS, subStats, taskGroups, taskWhen, tomorrowOf } from './tasks.js?v=3.4b';
import { makeWheel } from './wheel.js?v=3.4b';

export const TASKS_DAY_STORE = NS + '-tasks-day', TASKS_DOTS_STORE = NS + '-tasks-dots', TASKS_LIMIT_STORE = NS + '-tasks-limit', TASKS_FOLD_STORE = NS + '-tasks-fold', TASKS_POS_STORE = NS + '-tasks-pos', TASKS_LIST_STORE = NS + '-tasks-list';
export const TASK_POSITIONS = [['top', 'Над привычками'], ['bottom', 'Под привычками']];
export const LIST_STEP = 20;
export const TASK_LIMITS = [3, 5, 10];
export const SWIPE_BTN = 72, DONE_CAN_ARCHIVE = false;
export const swipeW = n => n * SWIPE_BTN + 14;
export const SWIPE_W = swipeW(3);
const IC_CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_LIST = '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l.8.8L6.3 5M4 12l.8.8 1.5-1.8M4 18l.8.8 1.5-1.8"/></svg>';
const IC_WARN = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.1M12 3.5l9.5 17h-19z"/></svg>';
const IC_BACK = '<svg class="ic" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>';
const IC_FWD = '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
const IC_FLAG = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 21V4.5M6 4.5h11l-2.4 4 2.4 4H6"/></svg>';
const IC_REP = '<svg class="ic" viewBox="0 0 24 24"><path d="M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4"/></svg>';
const IC_BELL = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 21h4"/></svg>';
const IC_MOVE = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4M10 13.5l2.5 2-2.5 2"/></svg>';

const monthOf = k => { const d = parseKey(k); return new Date(d.getFullYear(), d.getMonth(), 1); };

const IC_DOWN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
export const tv = { sel: null, lateOpen: false, wday: null, wkOff: 0, tab: 'list', day: todayKey(), month: monthOf(todayKey()), dayOpen: null, shown: {}, subOpen: new Set(), smart: null, smartShown: 20, shared: null };
export const doneDelay = { ms: 600 };
const pendingDone = new Map();
export const taskHooks = { chips: () => '', render: null, open: null, select: null, leave: null };
export const tasksOf = (s = state) => s.tasks || (s.tasks = []);
export const findTask = id => tasksOf().find(t => t.id === id);
export const visTasks = () => shownTasks(tasksOf());
export const dayOn = () => getPref(TASKS_DAY_STORE, '1') !== '0';
export const dotsOn = () => getPref(TASKS_DOTS_STORE, '1') !== '0';
export const dayFolded = () => getPref(TASKS_FOLD_STORE, '0') === '1';
export const dayLimit = () => { const n = +getPref(TASKS_LIMIT_STORE, '3'); return TASK_LIMITS.includes(n) ? n : 3; };
export const dayPos = () => getPref(TASKS_POS_STORE, 'top') === 'bottom' ? 'bottom' : 'top';

export function touchTasks() {
  save();
  renderDayTasks();
  paintTaskMarks();
}

function metaHTML(t, mode, today) {
  const parts = [];
  if (t.archivedAt) {
    if (t.date) parts.push(`<span>Когда: ${esc(dayShort(t.date, today))}</span>`);
    if (t.due) parts.push(`<span>Срок: ${esc(dayShort(t.due, today))}</span>`);
    return parts.length ? `<span class="t-meta">${parts.join('')}</span>` : '';
  }
  if (mode === 'agenda') mode = 'none-notime';
  if (mode === 'dueday' && !t.done) parts.push(`<span class="t-due late">${IC_FLAG}Срок</span>`);
  const late = !t.done && isOverdue(t, today);
  if (late) { const w = overdueText(t, today); parts.push(`<span class="warn">${esc(mode === 'list' ? w[0].toUpperCase() + w.slice(1) : `Просрочено · ${w}`)}</span>`); }
  else if (mode === 'when' && t.date) parts.push(`<span>${esc(taskWhen(t.date, today))}${t.time ? `, ${t.time}` : ''}</span>`);
  else if (t.time && !t.done && mode !== 'none-notime') parts.push(`<span>${t.time}</span>`);
  if (!t.done && t.due && mode !== 'dueday' && !(late && t.due < today)) { const d = dueLabel(t, today); parts.push(`<span class="t-due${d.tone ? ' ' + d.tone : ''}">${IC_FLAG}${esc(d.text)}</span>`); }
  if (t.rep && !t.done) parts.push(`<span class="t-rep">${IC_REP}<span>${esc(repLabel(t.rep))}</span></span>`);
  return parts.length ? `<span class="t-meta">${parts.join('')}</span>` : '';
}

export function taskActs(t) {
  if (t.done) return DONE_CAN_ARCHIVE ? ['arch', 'del'] : ['del'];
  return t.archivedAt ? ['restore', 'del'] : ['move', 'arch', 'del'];
}
const ACTS = { move: [IC_MOVE, 'Перенести'], arch: [IC.archive, 'В архив'], restore: [IC.reset, 'Вернуть'], del: [IC.trash.replace(' del-ic', ''), 'Удалить'] };
const actsHTML = list => list.map(a => `<button type="button" data-act="${a}"><i aria-hidden="true">${ACTS[a][0]}</i><span>${ACTS[a][1]}</span></button>`).join('');

function subsHTML(t, mode) {
  const s = subStats(t);
  if (!s.total) return '';
  const inner = `<span class="t-sp-n">${s.done} из ${s.total}</span><i class="t-sp" aria-hidden="true"><b style="width:${Math.round(s.done / s.total * 100)}%"></b></i>`;
  const label = `Подзадачи: ${s.done} из ${s.total}`;
  return mode === 'day' ? `<span class="t-subs" role="img" aria-label="${label}">${inner}</span>` : `<button type="button" class="t-subs" data-act="subs" aria-expanded="${tv.subOpen.has(t.id)}" aria-label="${label}">${inner}</button>`;
}
function subListHTML(t, mode) {
  if (mode === 'day' || !t.subs?.length || !tv.subOpen.has(t.id)) return '';
  return `<div class="t-sublist" role="group" aria-label="Подзадачи">${t.subs.map(s => `<button type="button" class="t-subitem${s.done ? ' done' : ''}" data-act="sub" data-id="${esc(t.id)}" data-s="${esc(s.id)}" role="checkbox" aria-checked="${s.done}"><span class="t-sbox">${IC_CHECK}</span><span class="t-subtext">${esc(s.text)}</span></button>`).join('')}</div>`;
}

function rowHTML(t, mode, today) {
  const meta = metaHTML(t, mode, today), bell = !t.done && !t.archivedAt && remindsOf(t).length ? `<span class="t-mbell" role="img" aria-label="Есть напоминание">${IC_BELL}</span>` : '';
  const ind = `<span class="t-ind">${t.note ? `<span class="t-mnote" role="img" aria-label="Есть заметка">${IC.note}</span>` : ''}${bell}</span>`;
  const acts = taskActs(t), sel = tv.sel && mode !== 'day', on = sel && tv.sel.has(t.id), pend = pendingDone.has(t.id);
  const box = sel ? `<button type="button" class="t-box t-selbox" role="checkbox" aria-checked="${on}" aria-label="Выбрать: ${esc(t.text)}">${IC_CHECK}</button>`
    : `<button type="button" class="t-box" role="checkbox" aria-checked="${t.done || pend}" aria-label="${esc(t.text)}">${IC_CHECK}</button>`;
  return `<div class="t-row${t.done ? ' done' : ''}${pend ? ' t-pend' : ''}${sel ? ' t-sel' : ''}${on ? ' on' : ''}" data-id="${esc(t.id)}" style="--sw:${swipeW(acts.length)}px">
    <div class="t-acts">${actsHTML(acts)}</div>

    <div class="t-fg">
      ${box}
      <button type="button" class="t-main"><span class="t-text">${mode === 'agenda' && t.time && !t.done ? `<span class="t-tm">${t.time}</span>` : ''}${t.important && !t.done ? '<span class="t-imp" role="img" aria-label="Важная">!</span>' : ''}${isPrivate(t) ? `<span class="t-lock" role="img" aria-label="Личная">${IC.lock}</span>` : ''}${esc(t.text)}</span>${meta}${ind}</button>${subsHTML(t, mode)}
    </div>
  </div>${subListHTML(t, mode)}`;
}

function agendaRow(t, today) {
  return rowHTML(t, 'agenda', today);
}
function lateHTML(list, today) {
  if (!list.length) return '';
  const head = `<div class="card t-late-bar"><button type="button" class="t-late-main" data-act="late-toggle" aria-expanded="${tv.lateOpen}">${IC_WARN}<span><b>Просрочено: ${list.length}</b><small>${list.length > 1 ? 'самая старая' : 'срок'} — ${esc(dayShort(overdueDay(list[0], today), today))}</small></span>${IC_DOWN}</button><button type="button" class="t-late-go" data-act="all-today">На сегодня</button></div>`;
  if (!tv.lateOpen) return `<section class="t-group late" data-day="late">${head}</section>`;
  return `<section class="t-group late open" data-day="late">${head}<div class="t-links t-late-links"><button type="button" class="t-link" data-act="all-arch">Всё в архив</button></div><div class="card t-list">${list.slice(0, tv.shown.overdue ||= LIST_STEP).map(t => rowHTML(t, 'list', today)).join('')}</div>${moreBtn('overdue', list.length)}</section>`;
}
function moreBtn(g, total) {
  const rest = total - (tv.shown[g] || LIST_STEP);
  return rest > 0 ? `<button type="button" class="t-more-btn" data-act="more" data-g="${g}">Показать ещё ${Math.min(rest, LIST_STEP)}</button>` : '';
}
function dayHead(k, today) {
  const d = parseKey(k), date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + (d.getFullYear() !== parseKey(today).getFullYear() ? ` ${d.getFullYear()} г.` : '');
  if (k === today) return ['Сегодня', `${WEEKDAYS[weekday(d)].toLowerCase()}, ${date}`];
  if (k === tomorrowOf(today)) return ['Завтра', `${WEEKDAYS[weekday(d)].toLowerCase()}, ${date}`];
  const wd = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  return [wd[0].toUpperCase() + wd.slice(1), date];
}
function agendaHTML(g, today) {
  const out = [], todayOpen = g.today.filter(t => !t.done);
  if (g.today.length) {
    const [a, b] = dayHead(today, today);
    out.push(`<section class="t-group t-dayg" data-day="${today}"><h3 class="sec-h t-dh"><span>${a}</span><small>${esc(b)}</small><span class="cnt">${todayOpen.length}</span></h3><div class="card t-list">${g.today.slice(0, tv.shown.today ||= LIST_STEP).map(t => agendaRow(t, today)).join('')}</div>${moreBtn('today', g.today.length)}</section>`);
  }
  const lim = tv.shown.upcoming ||= LIST_STEP, days = new Map();
  for (const t of g.upcoming) { const k = effDay(t); if (!days.has(k)) days.set(k, []); days.get(k).push(t); }
  let shown = 0, rest = 0;
  for (const [k, list] of days) {
    if (shown >= lim) { rest += list.length; continue; }
    const take = list.slice(0, lim - shown);
    shown += take.length;
    rest += list.length - take.length;
    const [a, b] = dayHead(k, today);
    out.push(`<section class="t-group t-dayg" data-day="${k}"><h3 class="sec-h t-dh"><span>${esc(a)}</span><small>${esc(b)}</small><span class="cnt">${list.length}</span></h3><div class="card t-list">${take.map(t => agendaRow(t, today)).join('')}</div></section>`);
  }
  if (rest) out.push(`<button type="button" class="t-more-btn" data-act="more" data-g="upcoming">Показать ещё ${Math.min(rest, LIST_STEP)}</button>`);
  return out.join('');
}
function oneDayHTML(all, k, today) {
  const list = k === today ? taskGroups(all, today).today : k < today ? dayTasks(all, k, today) : all.filter(t => !t.done && !t.archivedAt && effDay(t) === k).sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);
  const [a, b] = dayHead(k, today), open = list.filter(t => !t.done).length;
  const add = `<button type="button" class="t-addrow" data-act="add" data-k="${k}">${IC.plus}<span>Добавить на этот день</span></button>`;
  const body = list.length ? `<div class="card t-list">${list.map(t => agendaRow(t, today)).join('')}${add}</div>` : `<div class="card t-dayempty"><p>На этот день задач нет</p>${add}</div>`;
  return `<section class="t-group t-dayg t-onlyday" data-day="${k}"><h3 class="sec-h t-dh"><span>${esc(a)}</span><small>${esc(b)}</small><span class="cnt">${open || ''}</span><button type="button" class="t-link t-alldays" data-act="all-days">Все дни</button></h3>${body}</section>`;
}
const isoWeek = d => { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - weekday(d)), y = new Date(t.getFullYear(), 0, 4); return 1 + Math.round((t - y) / 864e5 / 7 - (3 - weekday(y)) / 7); };
const wkStart = (today, wk = tv.wkOff) => { const d = parseKey(today); return addDays(d, wk * 7 - weekday(d)); };
function paintWeekHead(today) {
  const s = wkStart(today), e = addDays(s, 6), m = (d, y) => d.toLocaleDateString('ru-RU', { month: 'long', ...(y ? { year: 'numeric' } : {}) });
  const y = s.getFullYear() !== parseKey(today).getFullYear() || e.getFullYear() !== parseKey(today).getFullYear();
  const txt = s.getMonth() === e.getMonth() ? m(s, y) : `${m(s, false)} – ${m(e, y)}`;
  $('tWkMonth').innerHTML = `<b>${esc((txt[0].toUpperCase() + txt.slice(1)).replace(/ г\.$/, ''))}</b><span>· ${isoWeek(s)} неделя</span>${IC_DOWN}`;
  $('tWkToday').style.visibility = tv.wkOff || (tv.wday && tv.wday !== today) ? 'visible' : 'hidden';
}
{
  const vp = $('tWkVp'), track = $('tWkTrack'), GAP = 16;
  let start = null, dx = 0, dragging = false, pts = [], off = 0, peeks = {}, anim = null, after = null;
  const page = () => $('tWeek').offsetWidth + GAP;
  const move = x => { off = x; track.style.transform = x ? `translateX(${x}px)` : ''; };
  const peek = (s, wk) => {
    if (peeks[s]) return;
    const p = document.createElement('div');
    p.className = 't-week peek';
    p.inert = true;
    p.setAttribute('aria-hidden', 'true');
    p.style.left = s * page() + 'px';
    p.innerHTML = weekHTML(screenTasks(), todayKey(), wk);
    track.append(p);
    peeks[s] = p;
  };
  const clear = () => { Object.values(peeks).forEach(p => p.remove()); peeks = {}; move(0); };
  const flush = () => {
    if (!anim) return;
    const a = anim, f = after;
    anim = after = null;
    a.cancel();
    f();
  };
  const settle = (to, ms, done) => {
    const a = anim = track.animate([{ transform: `translateX(${off}px)` }, { transform: `translateX(${to}px)` }], { duration: ms, easing: 'cubic-bezier(.22, .75, .25, 1)' });
    after = done;
    move(to);
    a.onfinish = () => { if (anim !== a) return; anim = after = null; done(); };
  };
  const land = wk => () => { clear(); tv.wkOff = wk; tv.wday = null; renderList(); };
  const flip = wk => {
    flush();
    if (wk === tv.wkOff) { if (tv.wday) { tv.wday = null; renderList(); } return; }
    if (reducedMotion) return land(wk)();
    const s = wk > tv.wkOff ? 1 : -1;
    peek(s, wk);
    settle(-s * page(), 360, land(wk));
  };
  $('tWkPrev').onclick = () => flip(tv.wkOff - 1);
  $('tWkNext').onclick = () => flip(tv.wkOff + 1);
  $('tWkToday').onclick = () => flip(0);

  vp.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    flush();
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dx = 0; dragging = false; pts = [];
  });
  vp.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) {
        if (Math.abs(my) > 12) start = null;
        return;
      }
      dragging = true;
      try { vp.setPointerCapture(e.pointerId); } catch {}
      if (!reducedMotion) [-1, 1].forEach(s => peek(s, tv.wkOff + s));
    }
    dx = mx;
    pts = [...pts.filter(p => e.timeStamp - p.t < 100), { x: e.clientX, t: e.timeStamp }];
    if (reducedMotion) return;
    const w = page();
    move(Math.max(-w, Math.min(w, dx)));
  });
  const end = e => {
    if (!start) return;
    start = null;
    if (!dragging) return;
    $('tWeekRow')._swiped = true;
    setTimeout(() => { $('tWeekRow')._swiped = false; }, 50);
    const s = dx < 0 ? 1 : -1, w = page(), a = pts[0], b = pts[pts.length - 1];
    const v = a && b && b.t - a.t > 8 ? (b.x - a.x) / (b.t - a.t) : 0;
    const go = e.type === 'pointerup' && (Math.abs(dx) >= w * .25 || (Math.abs(v) > .35 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 24));
    const wk = tv.wkOff + s;
    if (go && reducedMotion) return land(wk)();
    if (go) {
      peek(s, wk);
      settle(-s * w, Math.round(Math.min(340, Math.max(160, (w - Math.abs(off)) / Math.max(Math.abs(v), .9)))), land(wk));
    } else if (off) settle(0, Math.round(Math.min(320, 160 + Math.abs(off))), clear);
    else clear();
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
}
const dotColors = m => [...new Set((m?.l || []).map(id => findList(id)?.color || ''))].slice(0, 3);
const dotB = (c, cls = '') => `<b${cls ? ` class="${cls}"` : ''}${c ? ` style="background:${esc(c)}"` : ''}></b>`;
function openDots(m, k, today) {
  if (!m.n) return '';
  const cs = dotColors(m), late = m.late && k < today ? 'late' : '';
  if (cs.length > 1) return cs.map((c, i) => dotB(i || !late ? c : '', i ? '' : late)).join('');
  return dotB(late ? '' : cs[0], late) + (m.n > 1 ? dotB(cs[0]) : '');
}
function weekDot(m) {
  if (!m?.n) return '<i class="no"></i>';
  const cs = dotColors(m);
  return cs.length > 1 ? `<i class="multi">${cs.map(c => dotB(c)).join('')}</i>` : `<i${cs[0] ? ` style="background:${esc(cs[0])}"` : ''}></i>`;
}
function weekHTML(all, today, wk = tv.wkOff) {
  const marks = dayMarks(all, today), base = wkStart(today, wk);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(base, i), k = key(d), m = marks[k];
    return `<button type="button" class="t-wd${k === today ? ' now' : ''}${tv.wday === k ? ' sel' : ''}" data-wk="${k}" aria-pressed="${tv.wday === k}" aria-label="${esc(dayLong(k, today))}${m?.n ? `, задач: ${m.n}` : ''}"><small>${WEEKDAYS[weekday(d)]}</small><b>${d.getDate()}</b>${weekDot(m)}</button>`;
  }).join('');
}
function groupHTML(title, list, mode, today, extra = {}) {
  if (!list.length) return '';
  const lim = extra.g ? (tv.shown[extra.g] ||= LIST_STEP) : list.length, rest = list.length - lim;
  const more = rest > 0 ? `<button type="button" class="t-more-btn" data-act="more" data-g="${extra.g}">Показать ещё ${Math.min(rest, LIST_STEP)}</button>` : '';
  return `<section class="t-group${extra.cls ? ' ' + extra.cls : ''}">
    <h3 class="sec-h">${extra.icon || ''}<span>${title}</span>${extra.action ? `<span class="cnt t-cnt-late">${list.length}</span>${extra.action}` : `<span class="cnt">${extra.count ?? list.length}</span>`}</h3>
    <div class="card t-list">${list.slice(0, lim).map(t => rowHTML(t, mode, today)).join('')}</div>${more}
  </section>`;
}

function emptyHTML() {
  return `<div class="empty t-empty"><div class="t-empty-ic">${IC_LIST}</div><b>Здесь будут Ваши дела</b><p>Нажмите «+», запишите первое дело и выберите день, когда им заняться. Оно появится на экране этого дня.</p></div>`;
}

function renderList() {
  const today = todayKey(), all = screenTasks(), g = taskGroups(all, today);
  paintListChips();
  $('tWeek').innerHTML = weekHTML(all, today);
  paintWeekHead(today);
  if (tv.wday) { $('tItems').innerHTML = oneDayHTML(all, tv.wday, today); return; }
  $('tItems').innerHTML = !all.length ? (curList() === 'all' ? emptyHTML() : '<p class="t-snone">В этом списке пока нет задач</p>') : [
    lateHTML(g.overdue, today),
    agendaHTML(g, today),
    groupHTML('Без даты', g.nodate, 'none', today, { g: 'nodate' }),
  ].join('');
}

const pad = n => String(n).padStart(2, '0');
const monthKey = (m, d) => `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(d)}`;

export function calHTML(month, sel, marks, today = todayKey(), fold = false) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1), start = addDays(first, -weekday(first));
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i), k = key(d), m = marks[k], own = d.getMonth() === month.getMonth();
    const dots = m?.g && !m.n && !m.due && !m.d ? '<i class="t-dots"><b class="t-ghost"></b></i>' : m ? `<i class="t-dots">${openDots(m, k, today)}${k === today && m.late ? '<b class="late"></b>' : ''}${m.due ? '<b class="t-ring"></b>' : ''}${m.d ? '<b class="done"></b>' : ''}</i>` : '';
    return `<button type="button" class="t-d${own ? '' : ' out'}${k === today ? ' now' : ''}${k === sel ? ' pick' : ''}" data-k="${k}" aria-pressed="${k === sel}" aria-label="${esc(dayLong(k, today))}"><span>${d.getDate()}</span>${dots}</button>`;
  }).join('');
  const wd = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => `<small>${x}</small>`).join('');
  const title = `${MONTHS[month.getMonth()]} ${month.getFullYear()} г.`;
  return `<div class="t-cal-head">${fold ? `<button type="button" class="t-wkmonth up" data-fold aria-label="Свернуть до недели"><b>${title}</b>${IC_DOWN}</button>` : `<b>${title}</b>`}<span><button type="button" class="ghost icon-btn" data-nav="-1" aria-label="Предыдущий месяц">${IC_BACK}</button><button type="button" class="ghost icon-btn" data-nav="1" aria-label="Следующий месяц">${IC_FWD}</button></span></div><div class="t-grid">${wd}${cells}</div>`;
}

export function monthMarks(tasks, today = todayKey(), month = null) {
  const marks = dayMarks(tasks, today);
  if (month) {
    const from = key(new Date(month.getFullYear(), month.getMonth(), 1)), last = key(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    for (const k of Object.keys(ghostMarks(tasks, from, last, today))) (marks[k] ??= { n: 0, late: false }).g = true;
  }
  for (const t of tasks) if (t.done && t.doneAt) (marks[t.doneAt] ??= { n: 0, late: false }).d = true;
  return marks;
}
function renderMonth() {
  const today = todayKey(), all = screenTasks(), list = dayTasks(all, tv.day, today);
  paintListChips();
  $('tCal').innerHTML = calHTML(tv.month, tv.day, monthMarks(all, today, tv.month), today, true);
  $('tMonthHead').innerHTML = `<span>${esc(tv.day === today ? `Сегодня, ${dayLong(tv.day, today)}` : dayLong(tv.day, today))}</span><span class="cnt">${list.length}</span>`;
  $('tMonthItems').innerHTML = list.map(t => rowHTML(t, t.due === tv.day && t.date !== tv.day ? 'dueday' : t.date && t.date !== tv.day ? 'list' : 'none', today)).join('');
}

export function renderTasks() {
  for (const b of $('tTabs').querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.t === tv.tab);
  $('tShared').hidden = !tv.shared;
  if (tv.sel && (tv.shared || (!tv.smart && tv.tab !== 'list'))) exitSelect(false);
  if (tv.shared) {
    for (const id of ['tTabs', 'tsFilters', 'tListView', 'tMonthView', 'tsResults', 'tWkHead', 'tWeekRow']) $(id).hidden = true;
    paintListChips();
    return taskHooks.render?.(tv.shared);
  }
  taskHooks.leave?.();
  const sm = tv.smart && (tv.smart !== 'priv' || unlocked) && (isSection(tv.smart) || !$('tSearch').hidden) ? tv.smart : (tv.smart = null);
  $('tTabs').hidden = !!sm;
  $('tWeekRow').hidden = $('tWkHead').hidden = !!sm || tv.tab !== 'list';
  $('tsFilters').hidden = $('tSearch').hidden;
  $('tLists').hidden = !$('tSearch').hidden;
  if (!$('tSearch').hidden) paintFilters();
  $('tListView').hidden = !sm && tv.tab !== 'list';
  $('tMonthView').hidden = !!sm || tv.tab !== 'month';
  if (sm) renderSmart(); else if (tv.tab === 'list') renderList(); else renderMonth();
  if (!$('tSearch').hidden) renderSearch();
}

export function openTasks() {
  exitSelect(false);
  tv.wday = null;
  tv.wkOff = 0;
  tv.tab = 'list';
  tv.shown = {};
  tv.smart = null;
  tv.shared = null;
  closeSearch();
  tv.day = todayKey();
  tv.month = monthOf(tv.day);
  renderTasks();
  openOverlay($('tasksOv'));
  $('tSheet').scrollTop = 0;
  queueTips(700);
}
$('tasksBtn').onclick = () => openTasks();
function toggleMonth() {
  exitSelect(false);
  tv.smart = null;
  tv.tab = tv.tab === 'month' ? 'list' : 'month';
  renderTasks();
}
$('tWkMonth').onclick = () => toggleMonth();
const IC_SEC = {
  someday: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  done: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arch: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>',
};
const IC_SELECT = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/></svg>';
const IC_MONTH = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>';
const IC_LISTS = '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';
$('tMoreBtn').onclick = () => {
  const all = screenTasks(), today = todayKey(), sm = tv.smart && !tv.shared ? tv.smart : null;
  openMenu($('tMoreBtn'), [
    { header: 'Разделы' },
    ...SECTIONS.map(([id, name]) => {
      const n = smartFilter(id, all, today, { unlocked }).length;
      return { icon: IC_SEC[id], label: name, note: String(n), disabled: !n && sm !== id, run: () => { closeSearch(); setSmart(id); } };
    }),
    '-',
    { icon: IC_SELECT, label: 'Выбрать задачи', disabled: !!tv.shared || (!sm && tv.tab !== 'list'), run: () => enterSelect() },
    { icon: IC_MONTH, label: tv.tab === 'month' ? 'Только неделя' : 'Месяц целиком', disabled: !!sm || !!tv.shared, run: () => toggleMonth() },
    { icon: IC_LISTS, label: listsOf().length ? 'Изменить списки' : 'Создать список', run: () => (listsOf().length ? openListsSheet() : openListEditor()) },
  ]);
};
$('tWeek').onclick = e => {
  const b = e.target.closest('[data-wk]');
  if (!b || $('tWeekRow')._swiped) return;
  tv.wday = tv.wday === b.dataset.wk ? null : b.dataset.wk;
  renderList();
  $('tItems').animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: reducedMotion ? 0 : 220, easing: 'ease-out' });
};
$('tTabs').onclick = e => {
  const b = e.target.closest('button[data-t]');
  if (!b || b.dataset.t === tv.tab) return;
  exitSelect(false);
  tv.tab = b.dataset.t;
  renderTasks();
};
$('tCal').onclick = e => {
  if (e.target.closest('[data-fold]')) return toggleMonth();
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    tv.month = new Date(tv.month.getFullYear(), tv.month.getMonth() + +nav.dataset.nav, 1);
    return renderMonth();
  }
  const c = e.target.closest('[data-k]');
  if (!c) return;
  tv.day = c.dataset.k;
  tv.month = monthOf(tv.day);
  renderMonth();
};

export function addTask(text, date, note = '', extra = {}) {
  text = text.trim().slice(0, TASK_LIM.text);
  if (!text) return null;
  const list = tasksOf();
  if (list.filter(t => !t.done && !t.archivedAt).length >= TASK_LIM.total) { toast(`Можно вести до ${TASK_LIM.total} задач`); return null; }
  const now = Date.now(), t = { id: newTaskId(), text, done: false, createdAt: now, updatedAt: now };
  if (date) t.date = date;
  if (note.trim()) t.note = note.slice(0, TASK_LIM.note);
  Object.assign(t, extra);
  list.push(t);
  touchTasks();
  return t;
}
export function completeRepeat(t, today = todayKey()) {
  const next = nextOccurrence(t.rep, t.date || today, today);
  if (!next || (t.rep.until && next > t.rep.until)) return null;
  const was = { date: t.date, due: t.due, subs: t.subs?.map(s => ({ ...s })), doneCount: t.doneCount, lastDone: t.lastDone, archivedAt: t.archivedAt };
  shiftTask(t, next);
  t.doneCount = (t.doneCount || 0) + 1;
  t.lastDone = today;
  touchTasks();
  toast(`Следующий раз: ${dayShort(next, today)}`, () => undoRepeat(t, was));
  return next;
}
function shiftTask(t, next) {
  const by = t.date ? daysBetween(next, t.date) : 0;
  if (t.due) t.due = key(addDays(parseKey(t.due), by));
  t.date = next;
  if (t.subs) t.subs = t.subs.map(s => ({ ...s, done: false }));
  delete t.archivedAt;
  t.updatedAt = Date.now();
}
function undoRepeat(t, was) {
  t = findTask(t.id);
  if (!t) return;
  for (const k of ['date', 'due', 'subs', 'doneCount', 'lastDone', 'archivedAt']) { if (was[k] === undefined) delete t[k]; else t[k] = was[k]; }
  t.updatedAt = Date.now();
  touchTasks();
}
export function skipRepeat(t, today = todayKey()) {
  if (!t?.rep) return null;
  const next = nextOccurrence(t.rep, t.date || today, today);
  if (!next) return null;
  const was = { date: t.date, due: t.due, subs: t.subs?.map(s => ({ ...s })), doneCount: t.doneCount, lastDone: t.lastDone, archivedAt: t.archivedAt };
  shiftTask(t, next);
  touchTasks();
  toast(`Пропущено. Следующий раз: ${dayShort(next, today)}`, () => undoRepeat(t, was));
  return next;
}
function markPending(id, on) {
  for (const row of document.querySelectorAll(`.t-row[data-id="${CSS.escape(id)}"]`)) {
    row.classList.toggle('t-pend', on);
    row.querySelector('.t-box')?.setAttribute('aria-checked', on);
  }
}
function finishHome(t, from) {
  const was = t.done;
  toggleTask(t, from);
  if (was || !t.done) return;
  toast('Задача выполнена', () => { const cur = findTask(t.id); if (cur?.done) toggleTask(cur); });
}
function collapseHome(id, then) {
  const rows = [...$('dayTasks').querySelectorAll(`.t-row[data-id="${CSS.escape(id)}"]`)];
  if (reducedMotion || !rows.length || $('dayTasks').hidden) return then();
  let left = rows.length;
  for (const row of rows) {
    row.style.overflow = 'hidden';
    row.animate({ height: [row.offsetHeight + 'px', '0px'], opacity: [1, 0] }, { duration: 240, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }).onfinish = () => { if (!--left) then(); };
  }
}
export function tapDone(t, from) {
  if (pendingDone.has(t.id)) { clearTimeout(pendingDone.get(t.id)); pendingDone.delete(t.id); return markPending(t.id, false); }
  const home = !!from?.closest?.('#dayTasks') && key(viewDate) >= todayKey();
  if (t.done || !doneDelay.ms) return home ? finishHome(t, from) : toggleTask(t, from);
  markPending(t.id, true);
  if (from && !reducedMotion && isVivid()) sparks(from, 'var(--good)');
  navigator.vibrate?.(8);
  pendingDone.set(t.id, setTimeout(() => {
    pendingDone.delete(t.id);
    const cur = findTask(t.id);
    if (!cur || cur.done) return markPending(t.id, false);
    if (!home) return toggleTask(cur);
    collapseHome(t.id, () => { const x = findTask(t.id); if (x && !x.done) finishHome(x); else renderDayTasks(); });
  }, doneDelay.ms));
}
export function toggleTask(t, from) {
  if (!t.done && t.rep && completeRepeat(t)) { if (from && !reducedMotion && isVivid()) sparks(from, 'var(--good)'); return; }
  const was = t.done;
  t.done = !was;
  if (t.done) { t.doneAt = todayKey(); delete t.archivedAt; } else delete t.doneAt;
  t.updatedAt = Date.now();
  if (t.done && from && !reducedMotion && isVivid()) sparks(from, 'var(--good)');
  touchTasks();
}
export async function deleteTask(t) {
  if (t.rep && !(await askConfirm('Удалить повторяющуюся задачу?', 'Задача и её повтор будут удалены.', 'Удалить'))) return;
  const list = tasksOf(), i = list.indexOf(t);
  if (i < 0) return;
  list.splice(i, 1);
  touchTasks();
  toast('Задача удалена', () => {
    if (findTask(t.id)) return;
    tasksOf().splice(Math.min(i, tasksOf().length), 0, { ...t, updatedAt: Date.now() });
    touchTasks();
  });
}
const snapTasks = list => list.map(t => [t, JSON.parse(JSON.stringify(t))]);
function undoSnap(snap) {
  for (const [old, was] of snap) {
    const t = findTask(old.id);
    if (!t) continue;
    for (const k of Object.keys(t)) delete t[k];
    Object.assign(t, was, { updatedAt: Date.now() });
  }
  touchTasks();
}
export function moveTasks(list, v, today = todayKey()) {
  const some = v === SOMEDAY, clear = some || !v;
  list = list.filter(t => t && !t.done && !(clear && t.rep));
  if (!list.length) return 0;
  const snap = snapTasks(list), now = Date.now();
  let late = false;
  for (const t of list) {
    if (clear) {
      for (const k of ['date', 'time', 'reminds', 'rep', ...(some ? ['due', 'dueRemind'] : [])]) delete t[k];
      if (some) t.someday = true; else delete t.someday;
    } else {
      t.date = v;
      delete t.someday;
      if (t.due && v > t.due) late = true;
    }
    delete t.archivedAt;
    t.updatedAt = now;
  }
  touchTasks();
  const n = list.length, base = some ? 'Отложено: когда-нибудь' : !v ? 'Дата убрана' : `Перенесено ${moveLabel(v, today)}`;
  toast(base + (n > 1 ? ` · ${n} ${plural(n, 'задача', 'задачи', 'задач')}` : '') + (late ? ' · позже срока' : ''), () => undoSnap(snap));
  return n;
}
export function openMove(list, done = null) {
  const one = list.length === 1 ? list[0] : null;
  pickDate(one ? (one.someday ? SOMEDAY : one.date) : null, v => { moveTasks(list, v); done?.(); }, 'move', { rep: list.some(t => t.rep) });
}
export function allToToday() {
  const today = todayKey(), now = Date.now(), moved = screenTasks().filter(t => isOverdue(t, today)).map(t => [t.id, t.date, t.due]);
  for (const [id] of moved) {
    const t = findTask(id);
    if (t.date && t.date < today) t.date = today;
    if (t.due && t.due < today) t.due = today;
    t.updatedAt = now;
  }
  touchTasks();
  if (moved.length) toast('Перенесено на сегодня', () => {
    for (const [id, d, due] of moved) {
      const t = findTask(id);
      if (!t) continue;
      if (d === undefined) delete t.date; else t.date = d;
      if (due === undefined) delete t.due; else t.due = due;
      t.updatedAt = Date.now();
    }
    touchTasks();
  });
}
export function archiveTask(t) {
  t.archivedAt = todayKey();
  t.updatedAt = Date.now();
  touchTasks();
  toast('Задача в архиве', () => restoreTask(t));
}
export function restoreTask(t) {
  t = findTask(t.id);
  if (!t) return;
  delete t.archivedAt;
  t.updatedAt = Date.now();
  touchTasks();
}
export function archiveOverdue() {
  const today = todayKey(), now = Date.now(), moved = screenTasks().filter(t => isOverdue(t, today));
  for (const t of moved) { t.archivedAt = today; t.updatedAt = now; }
  touchTasks();
  if (moved.length) toast('Просроченные задачи в архиве', () => {
    for (const x of moved) { const t = findTask(x.id); if (t) { delete t.archivedAt; t.updatedAt = Date.now(); } }
    touchTasks();
  });
}

let openRow = null;
const settleRow = row => setTimeout(() => { if (!row.classList.contains('open')) row.classList.remove('swiping'); }, 320);
const closeRow = () => {
  if (!openRow) return;
  openRow.classList.add('swiping');
  openRow.classList.remove('open');
  settleRow(openRow);
  openRow = null;
};
document.addEventListener('pointerdown', e => { if (openRow && !openRow.contains(e.target)) closeRow(); }, true);

function bindList(box) {
  let s = null;
  box.addEventListener('pointerdown', e => {
    const fg = e.target.closest('.t-fg');
    if (!fg || e.button !== 0 || e.target.closest('.t-box') || (tv.sel && box.id !== 'dayTasks')) return;
    const row = fg.parentElement;
    const w = swipeW(row.querySelectorAll('.t-acts button').length);
    if (s?.lp) clearTimeout(s.lp);
    s = { x: e.clientX, y: e.clientY, id: e.pointerId, fg, row, w, base: row.classList.contains('open') ? -w : 0, dx: 0, drag: false, t: e.timeStamp, px: e.clientX, v: 0 };
    const c = s;
    if (box.id !== 'dayTasks' && !row.classList.contains('open') && canOrder(findTask(row.dataset.id))) c.lp = setTimeout(() => startOrder(c), ORDER_MS);
  });
  const startOrder = c => {
    if (s !== c || c.drag) return;
    const peers = orderPeers(c.row);
    if (peers.length < 2) return;
    c.ord = { peers, y0: c.y, from: peers.indexOf(c.row) };
    c.row.classList.add('t-lifted');
    box.querySelectorAll('.t-sublist').forEach(x => x.remove());
    try { c.fg.setPointerCapture(c.id); } catch {}
    navigator.vibrate?.(15);
  };
  const moveOrder = (c, y) => {
    const o = c.ord, row = c.row;
    let dy = y - o.y0, i = o.peers.indexOf(row);
    const next = o.peers[i + 1], prev = o.peers[i - 1];
    if (next && dy > next.offsetHeight / 2) { next.after(row); o.peers.splice(i, 2, next, row); o.y0 += next.offsetHeight; dy = y - o.y0; }
    else if (prev && dy < -prev.offsetHeight / 2) { prev.before(row); o.peers.splice(i - 1, 2, row, prev); o.y0 -= prev.offsetHeight; dy = y - o.y0; }
    row.style.transform = `translateY(${dy}px)`;
  };
  const endOrder = (c, ok) => {
    const o = c.ord, row = c.row, t = findTask(row.dataset.id), i = o.peers.indexOf(row);
    row.classList.remove('t-lifted');
    row.style.transform = '';
    box._swiped = true;
    setTimeout(() => { box._swiped = false; }, 50);
    if (!ok || i === o.from || !t) return renderTasks();
    placeTask(t, findTask(o.peers[i - 1]?.dataset.id), findTask(o.peers[i + 1]?.dataset.id));
  };
  box.addEventListener('touchmove', e => { if (s?.ord) e.preventDefault(); }, { passive: false });
  box.addEventListener('contextmenu', e => { if (s?.lp || s?.ord) e.preventDefault(); });
  box.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    if (s.ord) return moveOrder(s, e.clientY);
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (s.lp && Math.hypot(mx, my) > 10) { clearTimeout(s.lp); s.lp = 0; }
    if (!s.drag) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) { if (Math.abs(my) > 12) s = null; return; }
      s.drag = true;
      s.fg.classList.add('dragging');
      s.row.classList.add('swiping');
      try { s.fg.setPointerCapture(e.pointerId); } catch {}
      if (openRow && openRow !== s.row) closeRow();
    }
    const now = e.timeStamp;
    if (now > s.t) { s.v = (e.clientX - s.px) / (now - s.t); s.t = now; s.px = e.clientX; }
    s.dx = Math.max(-s.w, Math.min(0, s.base + mx));
    s.fg.style.transform = `translateX(${s.dx}px)`;
  });
  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const c = s;
    s = null;
    if (c.lp) clearTimeout(c.lp);
    if (c.ord) return endOrder(c, e.type === 'pointerup');
    if (!c.drag) return;
    c.fg.classList.remove('dragging');
    c.fg.style.transform = '';
    const flick = Math.abs(c.v) > .45 && e.timeStamp - c.t < 80 ? Math.sign(c.v) : 0;
    const open = e.type === 'pointerup' && (flick ? flick < 0 : c.dx < -c.w / 2);
    c.row.classList.toggle('open', open);
    settleRow(c.row);
    openRow = open ? c.row : openRow === c.row ? null : openRow;
    box._swiped = true;
    setTimeout(() => { box._swiped = false; }, 50);
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('click', e => {
    if (box._swiped) return;
    const selRow = tv.sel && box.id !== 'dayTasks' && e.target.closest('.t-row');
    if (selRow) return toggleSel(selRow.dataset.id);
    const act = e.target.closest('[data-act]');
    if (act) return listAct(act);
    const row = e.target.closest('.t-row');
    if (!row) return;
    const t = findTask(row.dataset.id);
    if (!t) return;
    if (row.classList.contains('open') && !e.target.closest('.t-acts')) return closeRow();
    const box2 = e.target.closest('.t-box');
    if (box2) return tapDone(t, box2);
    if (e.target.closest('.t-main')) openTaskForm(t);
  });
}

function foldDay() {
  const box = $('dayTasks'), folding = !dayFolded();
  flipAfter(box, () => { setPref(TASKS_FOLD_STORE, folding ? '1' : '0'); renderDayTasks(); });
  if (!folding && !reducedMotion) box.querySelectorAll('.t-row, .t-more, .t-addrow').forEach(el => el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' }));
}

function listAct(el) {
  const a = el.dataset.act, t = el.closest('.t-row') ? findTask(el.closest('.t-row').dataset.id) : el.dataset.id ? findTask(el.dataset.id) : null;
  if (a === 'subs' && t) { if (tv.subOpen.has(t.id)) tv.subOpen.delete(t.id); else tv.subOpen.add(t.id); return renderTasks(); }
  if (a === 'sub' && t) return toggleSub(t, el.dataset.s);
  if (a === 'smart-more') { tv.smartShown += LIST_STEP; return renderTasks(); }
  if (a === 'more') { tv.shown[el.dataset.g] = (tv.shown[el.dataset.g] || LIST_STEP) + LIST_STEP; return renderList(); }
  if (a === 'all-today') return allToToday();
  if (a === 'all-arch') return archiveOverdue();
  if (a === 'late-toggle') { tv.lateOpen = !tv.lateOpen; return renderList(); }
  if (a === 'all-days') { tv.wday = null; return renderList(); }
  if (a === 'move' && t) { closeRow(); return openMove([t]); }
  if (a === 'arch' && t) { closeRow(); return archiveTask(t); }
  if (a === 'restore' && t) { closeRow(); return restoreTask(t); }
  if (a === 'add') return openTaskForm(null, el.dataset.k);
  if (a === 'day-fold') return foldDay();
  if (a === 'day-more') { tv.dayOpen = key(viewDate); return renderDayTasks(); }
  if (a === 'del' && t) { closeRow(); return deleteTask(t); }
}
for (const id of ['tItems', 'tMonthItems', 'dayTasks']) bindList($(id));

const CAL_SVG = '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/>';
const IC_D = {
  today: `<svg class="ic" viewBox="0 0 24 24">${CAL_SVG}<circle cx="12" cy="15" r="1.4"/></svg>`,
  tom: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 4.5v2.5M5.9 7.4l1.7 1.7M18.1 7.4l-1.7 1.7M3.5 15.5H6M18 15.5h2.5M8 15.5a4 4 0 0 1 8 0M3.5 19.5h17"/></svg>',
  wknd: '<svg class="ic" viewBox="0 0 24 24"><path d="M5.5 11V8.5a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 2.5 2.5V11M4 12a1.5 1.5 0 0 1 3 0v2h10v-2a1.5 1.5 0 0 1 3 0v6H4zM6 18v2M18 18v2"/></svg>',
  week: IC_MOVE,
  month: `<svg class="ic" viewBox="0 0 24 24">${CAL_SVG}<path d="M15.5 16.5h.01"/></svg>`,
  someday: '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="4.5" rx="1.3"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/></svg>',
  none: `<svg class="ic" viewBox="0 0 24 24">${CAL_SVG}<path d="M4.5 4.5l15 15"/></svg>`,
};
const PICK_TITLE = { when: 'Когда сделать', due: 'Срок', until: 'Повторять до', move: 'Перенести' };
const ds = { sel: null, month: monthOf(todayKey()), cb: null, mode: 'when', rep: false };
export const pickDayText = (k, today = todayKey()) => `${WEEKDAYS[weekday(parseKey(k))]}, ${dayShort(k, today)}`;
function pickOpts(today) {
  const tom = tomorrowOf(today);
  if (ds.mode === 'due' || ds.mode === 'until') return [[IC_D.today, 'Сегодня', today], [IC_D.tom, 'Завтра', tom], [IC_D.week, 'Через неделю', key(addDays(parseKey(today), 7))], [IC_D.month, 'Конец месяца', monthEnd(today)], null, [IC_D.none, ds.mode === 'due' ? 'Без срока' : 'Без ограничения', '']];
  const mon = nextMonday(today), week = mon === tom ? key(addDays(parseKey(mon), 7)) : mon;
  const out = [[IC_D.today, 'Сегодня', today], [IC_D.tom, 'Завтра', tom], [IC_D.wknd, 'Выходные', nextWeekend(today)], [IC_D.week, 'Следующая неделя', week]];
  if (!ds.rep) out.push(null, [IC_D.someday, 'Когда-нибудь', SOMEDAY], [IC_D.none, 'Без даты', '']);
  return out;
}
function renderPick() {
  const today = todayKey(), cur = ds.sel || '';
  $('tdTitle').textContent = PICK_TITLE[ds.mode] || PICK_TITLE.when;
  $('tdQuick').innerHTML = pickOpts(today).map(o => !o ? '<div class="tf-div" role="separator"></div>'
    : `<button type="button" class="tf-row tf-opt" data-v="${o[2]}" aria-pressed="${cur === o[2]}"><span class="tf-ic">${o[0]}</span><span class="tf-lbl">${o[1]}</span>${o[2] && o[2] !== SOMEDAY ? `<em>${esc(pickDayText(o[2], today))}</em>` : ''}${IC_CHECK}</button>`).join('');
  $('tdCal').innerHTML = calHTML(ds.month, cur && cur !== SOMEDAY ? cur : null, dayMarks(visTasks(), today), today);
}
export function pickDate(sel, cb, mode = 'when', opts = {}) {
  closeMenu();
  ds.mode = mode === true ? 'due' : mode || 'when';
  ds.rep = !!opts.rep;
  ds.sel = sel || null;
  ds.month = monthOf(sel && sel !== SOMEDAY ? sel : todayKey());
  ds.cb = cb;
  renderPick();
  openOverlay($('tDateOv'));
}
function pickDone(v) {
  const cb = ds.cb;
  ds.cb = null;
  closeOverlay($('tDateOv'));
  cb?.(v || null);
}
$('tdQuick').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (b) pickDone(b.dataset.v);
};
$('tdCal').onclick = e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { ds.month = new Date(ds.month.getFullYear(), ds.month.getMonth() + +nav.dataset.nav, 1); return renderPick(); }
  const c = e.target.closest('[data-k]');
  if (c) pickDone(c.dataset.k);
};

function selRows() { return [...$('tItems').querySelectorAll('.t-row.t-sel')]; }
function selTasks() { return [...(tv.sel || [])].map(findTask).filter(Boolean); }
export function enterSelect() {
  if (tv.shared) return;
  closeRow();
  closeSearch();
  tv.sel = new Set();
  document.body.classList.add('t-selecting');
  renderTasks();
  paintSel();
  $('tSelDone').focus({ preventScroll: true });
}
export function exitSelect(render = true) {
  if (!tv.sel) return;
  tv.sel = null;
  document.body.classList.remove('t-selecting');
  paintSel();
  if (render) renderTasks();
}
function toggleSel(id) {
  if (!tv.sel || !findTask(id)) return;
  if (tv.sel.has(id)) tv.sel.delete(id); else tv.sel.add(id);
  const on = tv.sel.has(id);
  for (const row of $('tItems').querySelectorAll(`.t-row[data-id="${CSS.escape(id)}"]`)) {
    row.classList.toggle('on', on);
    row.querySelector('.t-selbox')?.setAttribute('aria-checked', on);
  }
  paintSel();
}
function paintSel() {
  const n = tv.sel?.size || 0, sel = !!tv.sel;
  $('tTitle').textContent = sel ? (n ? `Выбрано: ${n}` : 'Выбор') : 'Задачи';
  $('tSelAll').hidden = $('tSelDone').hidden = !sel;
  $('tSelBar').hidden = !sel;
  if (!sel) return;
  const open = selRows().filter(r => !r.classList.contains('done'));
  $('tSelAll').textContent = open.length && open.every(r => tv.sel.has(r.dataset.id)) ? 'Снять' : 'Все';
  const list = selTasks(), act = list.filter(t => !t.done);
  for (const b of $('tSelBar').querySelectorAll('button')) b.disabled = !(b.dataset.s === 'del' ? list.length : act.length);
  $('tSelBar').querySelector('[data-s=list]').hidden = !listsOf().length;
}
$('tSelDone').onclick = () => exitSelect();
$('tSelAll').onclick = () => {
  const open = selRows().filter(r => !r.classList.contains('done')), all = open.length && open.every(r => tv.sel.has(r.dataset.id));
  for (const r of open) { if (all) tv.sel.delete(r.dataset.id); else tv.sel.add(r.dataset.id); }
  renderTasks();
  paintSel();
};
$('tasksOv')._guard = () => { if (!tv.sel) return true; exitSelect(); return false; };
function selDone(snap, text) {
  touchTasks();
  exitSelect();
  toast(text, () => undoSnap(snap));
}
$('tSelBar').onclick = async e => {
  const b = e.target.closest('[data-s]');
  if (!b || b.disabled || !tv.sel) return;
  const list = selTasks(), act = list.filter(t => !t.done), n = act.length, today = todayKey(), now = Date.now();
  const cnt = k => `${k} ${plural(k, 'задача', 'задачи', 'задач')}`;
  if (b.dataset.s === 'move') return openMove(act, () => exitSelect());
  if (b.dataset.s === 'list') {
    const cur = new Set(act.map(t => t.list || ''));
    return openPick('В список', [{ v: '', label: 'Без списка' }, ...listsOf().map(l => ({ v: l.id, label: l.name }))].map(x => ({ ...x, on: cur.size === 1 && cur.has(x.v) })), v => {
      const snap = snapTasks(act);
      for (const t of act) { if (v) t.list = v; else delete t.list; t.updatedAt = now; }
      selDone(snap, `${cnt(n)} · ${v ? findList(v)?.name || 'список' : 'без списка'}`);
    }, b);
  }
  if (b.dataset.s === 'done') {
    const snap = snapTasks(act);
    for (const t of act) {
      const next = t.rep ? nextOccurrence(t.rep, t.date || today, today) : null;
      if (next && !(t.rep.until && next > t.rep.until)) { shiftTask(t, next); t.doneCount = (t.doneCount || 0) + 1; t.lastDone = today; }
      else { t.done = true; t.doneAt = today; delete t.archivedAt; t.updatedAt = now; }
    }
    return selDone(snap, `Выполнено: ${cnt(n)}`);
  }
  if (b.dataset.s === 'arch') {
    const snap = snapTasks(act);
    for (const t of act) { t.archivedAt = today; t.updatedAt = now; }
    return selDone(snap, `В архиве: ${cnt(n)}`);
  }
  if (b.dataset.s === 'del') {
    const k = list.length;
    if (!(await askConfirm(`Удалить ${cnt(k).replace(/задача$/, 'задачу')}?`, 'Сразу после удаления их можно вернуть кнопкой «Отменить».', 'Удалить'))) return;
    const all = tasksOf(), gone = list.map(t => [t, all.indexOf(t)]).filter(x => x[1] >= 0).sort((x, y) => x[1] - y[1]);
    for (const [t] of [...gone].reverse()) all.splice(all.indexOf(t), 1);
    touchTasks();
    exitSelect();
    toast(`Удалено: ${cnt(k)}`, () => {
      const cur = tasksOf();
      for (const [t, i] of gone) if (!findTask(t.id)) cur.splice(Math.min(i, cur.length), 0, { ...t, updatedAt: Date.now() });
      touchTasks();
    });
  }
};

const tf = { id: null, date: null, someday: false, time: null, reminds: [], base: '', arch: false, closed: false, touched: false, parsed: null, subs: [], priv: false, imp: false, due: null, dueRemind: null, rep: null, skip: false };
const tfSnap = () => JSON.stringify([$('tfText').value, $('tfNote').value, tf.date, tf.someday, tf.time, tf.reminds, tf.subs.filter(s => s.text.trim()).map(s => [s.text.trim(), s.done]), tf.priv, tf.imp, $('tfList').value, tf.due, tf.dueRemind, tf.rep]);
export function taskRemindHint(st = pushState()) {
  if (st === 'on' || st === 'off') return '';
  if (st === 'ios') return 'Напоминание придёт только в приложении, установленном на экран «Домой».';
  return 'Чтобы напоминание пришло, включите уведомления в Настройках.';
}
const DUE_HINT = () => `Напоминание придёт в ${String(DUE_REMIND_HOUR).padStart(2, '0')}:00.`;
function paintTfDue() {
  $('tfDueVal').textContent = tf.due ? taskWhen(tf.due) : 'Не задан';
  $('tfDueRow').classList.toggle('empty', !tf.due);
  $('tfDueClear').hidden = !tf.due;
  $('tfDueRemBtn').hidden = !tf.due;
  $('tfDueRemVal').textContent = DUE_REMINDS.find(x => x[0] === tf.dueRemind)?.[1] || 'Нет';
  $('tfDueLate').hidden = !(tf.due && tf.date && tf.due < tf.date);
  $('tfDueHint').textContent = tf.due && tf.dueRemind !== null ? DUE_HINT() : '';
}
const remLate = r => !tf.closed && remindState(tf.date, tf.time, r) === 'missed';
function paintTfDate() {
  paintTfDue();
  paintTfRep();
  if (tf.date || tf.due) tf.someday = false;
  $('tfDateVal').textContent = tf.date ? taskWhen(tf.date) : tf.someday ? 'Когда-нибудь' : 'Без даты';
  $('tfTimeRow').hidden = !tf.date;
  $('tfTimeRow').classList.toggle('empty', !tf.time);
  if (document.activeElement !== $('tfTime') || !tf.time) $('tfTime').value = tf.time || '';
  $('tfTimeClear').hidden = !tf.time;
  tf.reminds = tf.date ? normReminds(tf.reminds, tf.time) : [];
  $('tfRemRow').hidden = !tf.date;
  $('tfRems').innerHTML = tf.reminds.map((r, i) => `<div class="tf-row tf-rem${remLate(r) ? ' late' : ''}" role="listitem"><button type="button" class="tf-rem-pick" data-i="${i}"><span class="tf-ic">${IC_BELL}</span><span class="tf-lbl">${esc(remindText(tf.date, tf.time, r))}</span></button><button type="button" class="ghost icon-btn tf-x" data-del="${i}" aria-label="Удалить напоминание">${IC_X}</button></div>`).join('');
  const n = tf.reminds.length;
  $('tfRemAdd').hidden = n >= REMINDS_MAX;
  $('tfRemAdd').classList.toggle('tf-more', n > 0);
  $('tfRemAddLbl').textContent = n ? 'Ещё напоминание' : 'Напоминание';
  $('tfRemAddVal').textContent = n ? '' : 'Нет';
  $('tfRemHint').textContent = n ? taskRemindHint() : '';
  $('tfRemLate').hidden = !tf.reminds.some(remLate);
}
export function openTaskForm(t = null, date = null) {
  closeMenu();
  tf.id = t?.id || null;
  tf.date = t ? t.date || null : date;
  tf.someday = !!t?.someday;
  tf.time = t?.time || null;
  tf.reminds = [...remindsOf(t)];
  tf.due = t?.due || null;
  tf.rep = t?.rep ? { ...t.rep, wd: t.rep.wd && [...t.rep.wd] } : null;
  tf.repStat = t?.doneCount ? [t.doneCount, t.lastDone] : null;
  tf.repDone = !!t?.done;
  tf.dueRemind = t?.dueRemind ?? null;
  tf.closed = !!t && (t.done || !!t.archivedAt);
  $('tfTitle').textContent = t ? 'Задача' : 'Новая задача';
  $('tfSubmit').textContent = t ? 'Сохранить' : 'Добавить';
  $('tfDelete').hidden = !t;
  $('tfArchive').hidden = !t || t.done;
  $('tfArchive').textContent = t?.archivedAt ? 'Вернуть' : 'В архив';
  $('tfText').value = t?.text || '';
  $('tfNote').value = t?.note || '';
  $('tfText').removeAttribute('aria-invalid');
  tf.touched = false;
  tf.subs = (t?.subs || []).map(s => ({ ...s }));
  tf.priv = isPrivate(t);
  tf.imp = !!t?.important;
  paintImp();
  paintListSelect(t ? t.list || '' : findList(curList()) ? curList() : '');
  syncTaskPriv();
  paintSubs();
  paintTfDate();
  paintTfParse();
  tf.base = tfSnap();
  openOverlay($('tFormOv'));
  fitTitle();
  $('tfSubs').querySelectorAll('.t-sin').forEach(fit);
  if (!t) setTimeout(() => $('tfText').focus({ preventScroll: true }), 60);
}
function fit(el) {
  if (window.CSS?.supports?.('field-sizing', 'content') || !el.offsetParent) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
const fitTitle = () => fit($('tfText'));
$('tFormOv')._guard = () => tfSnap() === tf.base || askConfirm('Закрыть без сохранения?', tf.id ? 'Изменения в задаче не сохранятся.' : 'Новая задача не будет добавлена.', 'Закрыть');
$('tfText').addEventListener('input', () => {
  const el = $('tfText');
  el.removeAttribute('aria-invalid');
  if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/\s*[\r\n]+\s*/g, ' ');
  fitTitle();
});
$('tfText').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  e.preventDefault();
  $('tForm').requestSubmit();
});
function paintTfParse() {
  fitTitle();
  const r = !tf.id && !tf.touched && $('tfText').value.trim() ? parseQuick($('tfText').value, new Date(), listsOf()) : null;
  tf.parsed = r && r.found.length ? r : null;
  $('tfParse').hidden = !tf.parsed;
  $('tfParseText').textContent = tf.parsed ? quickLabel(tf.parsed) : '';
}
$('tfText').addEventListener('input', paintTfParse);
$('tfParseOk').onclick = () => {
  const r = tf.parsed;
  if (!r) return;
  $('tfText').value = r.text;
  if (r.date) tf.date = r.date;
  else if (r.rep) tf.date = firstOn(r.rep, todayKey());
  else if (r.due || r.someday) tf.date = null;
  if (r.someday) tf.someday = true;
  if (r.due) tf.due = r.due;
  if (r.rep) tf.rep = r.rep;
  if (r.time) { tf.time = r.time; if (!tf.reminds.length) tf.reminds = [0]; }
  if (r.important) { tf.imp = true; paintImp(); }
  if (r.list && findList(r.list)) paintListSelect(r.list);
  tf.touched = true;
  paintTfDate();
  paintTfParse();
  $('tfText').focus({ preventScroll: true });
};
export function splitPaste(text) {
  const lines = String(text).split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
  return { first: lines[0] || '', rest: lines.slice(1) };
}
$('tfText').addEventListener('paste', e => {
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!/[\r\n]/.test(text)) return;
  e.preventDefault();
  const { first, rest } = splitPaste(text), el = $('tfText'), a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
  el.value = (el.value.slice(0, a) + first + el.value.slice(b)).slice(0, TASK_LIM.text);
  el.setSelectionRange(Math.min(a + first.length, el.value.length), Math.min(a + first.length, el.value.length));
  el.removeAttribute('aria-invalid');
  paintTfParse();
  if (!rest.length) return;
  const note = $('tfNote');
  note.value = (note.value.trim() ? note.value.replace(/\s+$/, '') + '\n' + rest.join('\n') : rest.join('\n')).slice(0, TASK_LIM.note);
  toast('Остальное перенесено в заметку');
});
$('tfDue').onclick = () => pickDate(tf.due, d => {
  tf.due = d;
  if (!d) tf.dueRemind = null;
  tf.touched = true;
  paintTfParse();
  paintTfDate();
}, true);
$('tfDueClear').onclick = () => {
  tf.due = null;
  tf.dueRemind = null;
  paintTfDate();
  $('tfDue').focus({ preventScroll: true });
};
$('tfDueRemBtn').onclick = () => openPick('Напомнить о сроке', DUE_REMINDS.map(([v, l]) => ({ v: v ?? '', label: l, on: tf.dueRemind === v })), v => {
  tf.dueRemind = v === '' ? null : +v;
  paintTfDue();
}, $('tfDueRemBtn'));
$('tfDate').onclick = () => pickDate(tf.someday ? SOMEDAY : tf.date, d => {
  tf.someday = d === SOMEDAY;
  tf.date = tf.someday ? null : d;
  if (tf.someday) { tf.due = null; tf.dueRemind = null; }
  if (!d) tf.rep = null;
  tf.touched = true;
  paintTfParse();
  if (!d) { tf.time = null; tf.reminds = []; }
  paintTfDate();
});
$('tfTime').addEventListener('input', e => {
  const v = e.target.value || null;
  tf.touched = true;
  paintTfParse();
  if (v && !tf.time && !tf.reminds.length) tf.reminds = [0];
  if (!v) tf.reminds = tf.reminds.filter(r => !isRemind(r));
  tf.time = v;
  paintTfDate();
});
$('tfTimeClear').onclick = e => {
  e.preventDefault();
  tf.time = null;
  tf.reminds = tf.reminds.filter(r => !isRemind(r));
  paintTfDate();
  $('tfTime').focus({ preventScroll: true });
};
$('tfRems').onclick = e => {
  const del = e.target.closest('[data-del]'), pick = e.target.closest('[data-i]');
  if (del) {
    const i = +del.dataset.del;
    tf.reminds.splice(i, 1);
    paintTfDate();
    const rows = $('tfRems').querySelectorAll('.tf-rem-pick');
    return (rows[Math.min(i, rows.length - 1)] || $('tfRemAdd')).focus({ preventScroll: true });
  }
  if (pick) openRemSheet(+pick.dataset.i);
};
$('tfRemAdd').onclick = () => openRemSheet(null);

const pk = { cb: null, back: null };
export function openPick(title, items, cb, back = null) {
  pk.cb = cb;
  pk.back = back;
  $('tpTitle').textContent = title;
  $('tpList').innerHTML = items.map(x => `<button type="button" class="tf-row tf-opt" role="radio" data-v="${esc(x.v)}" aria-checked="${!!x.on}"><span class="tf-lbl">${esc(x.label)}</span>${IC_CHECK}</button>`).join('');
  openOverlay($('tPickOv'));
  ($('tpList').querySelector('[aria-checked=true]') || $('tpList').firstElementChild)?.focus({ preventScroll: true });
}
$('tpList').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  const cb = pk.cb, back = pk.back;
  pk.cb = null;
  closeOverlay($('tPickOv'));
  cb?.(b.dataset.v);
  back?.focus({ preventScroll: true });
};

const rm = { i: null, quick: null, days: [] };
const pad2 = n => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, h) => ({ v: h, label: pad2(h) }));
const MINS = Array.from({ length: 12 }, (_, m) => ({ v: m * 5, label: pad2(m * 5) }));
const wDay = makeWheel($('trmDay'), () => remWheel());
const wH = makeWheel($('trmH'), () => remWheel());
const wM = makeWheel($('trmM'), () => remWheel());
function remWheel() {
  rm.quick = null;
  paintRemSheet();
}
function remDays() {
  const today = todayKey(), last = tf.date, first = [key(addDays(parseKey(last), -REMIND_DAYS_MAX)), last < today ? last : today].sort()[1];
  const out = [];
  for (let d = first; d <= last; d = key(addDays(parseKey(d), 1))) out.push({ v: d, label: remDay(d, today) });
  return out;
}
function setWheels(at) {
  const k = key(at);
  wDay.set(Math.max(0, rm.days.findIndex(x => x.v === k)));
  wH.set(at.getHours());
  wM.set(Math.round(at.getMinutes() / 5) % 12);
}
const wheelRemind = () => absRemind(daysBetween(tf.date, wDay.value()), `${pad2(wH.value())}:${pad2(wM.value())}`);
const sheetRemind = () => rm.quick ?? wheelRemind();
function paintRemSheet() {
  $('trmQuick').hidden = !tf.time;
  $('trmQuick').innerHTML = tf.time ? TASK_REMINDS.filter(x => x[0] !== null).map(([v, l]) => `<button type="button" class="t-chip" data-q="${v}" aria-pressed="${rm.quick === v}">${esc(l)}</button>`).join('') : '';
  $('trmLate').hidden = !remLate(sheetRemind());
}
function defaultRemind() {
  if (tf.time) return TASK_REMINDS.map(x => x[0]).find(v => v !== null && !tf.reminds.includes(v)) ?? 15;
  if (tf.date > todayKey()) return absRemind(0, '09:00');
  const now = new Date(), m = Math.min(23 * 60 + 55, Math.ceil((now.getHours() * 60 + now.getMinutes() + 60) / 5) * 5);
  return absRemind(0, `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
}
function openRemSheet(i) {
  if (!tf.date) return;
  rm.i = i;
  const r = i == null ? defaultRemind() : tf.reminds[i];
  rm.quick = isRemind(r) ? r : null;
  rm.days = remDays();
  $('trmTitle').textContent = i == null ? 'Новое напоминание' : 'Напоминание';
  $('trmDel').hidden = i == null;
  openOverlay($('tRemOv'));
  wDay.fill(rm.days);
  wH.fill(HOURS);
  wM.fill(MINS);
  setWheels(remindAt(tf.date, tf.time, r) || remindAt(tf.date, null, absRemind(0, '09:00')));
  paintRemSheet();
  ($('trmQuick').querySelector('[aria-pressed=true]') || $('trmDay')).focus({ preventScroll: true });
}
$('trmQuick').onclick = e => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  rm.quick = +b.dataset.q;
  const at = remindAt(tf.date, tf.time, rm.quick);
  if (at) setWheels(at);
  paintRemSheet();
};
$('trmOk').onclick = () => {
  const r = sheetRemind(), off = remindOffset(tf.time, r);
  if (tf.reminds.some((x, n) => n !== rm.i && remindOffset(tf.time, x) === off)) return toast('Такое напоминание уже есть');
  if (rm.i == null) tf.reminds.push(r); else tf.reminds[rm.i] = r;
  closeOverlay($('tRemOv'));
  paintTfDate();
  ($('tfRemAdd').hidden ? $('tfRems').querySelector('.tf-rem-pick') : $('tfRemAdd'))?.focus({ preventScroll: true });
};
$('trmDel').onclick = () => {
  if (rm.i != null) tf.reminds.splice(rm.i, 1);
  closeOverlay($('tRemOv'));
  paintTfDate();
  $('tfRemAdd').focus({ preventScroll: true });
};
$('tfDelete').onclick = () => {
  const t = findTask(tf.id);
  tf.base = tfSnap();
  closeOverlay($('tFormOv'));
  if (t) deleteTask(t);
};
$('tfArchive').onclick = () => {
  tf.arch = true;
  $('tForm').requestSubmit();
};
$('tForm').onsubmit = e => {
  e.preventDefault();
  const arch = tf.arch, skip = tf.skip;
  tf.arch = false;
  tf.skip = false;
  const text = $('tfText').value.trim().slice(0, TASK_LIM.text), note = $('tfNote').value.slice(0, TASK_LIM.note);
  if (!text) { $('tfText').setAttribute('aria-invalid', 'true'); $('tfText').focus(); return toast('Введите текст задачи'); }
  const t = tf.id ? findTask(tf.id) : null;
  tf.base = tfSnap();
  closeOverlay($('tFormOv'));
  if (tf.id && !t) return;
  const target = tf.id ? t : addTask(text, tf.date, note);
  if (!target) return;
  if (target.date !== (tf.date || undefined)) delete target.archivedAt;
  target.text = text;
  if (note.trim()) target.note = note; else delete target.note;
  const subs = subsToSave(target);
  if (subs.length) target.subs = subs; else delete target.subs;
  if (unlocked) { if (tf.priv) target.private = true; else delete target.private; }
  if (tf.imp) target.important = true; else delete target.important;
  const lid = $('tfList').value;
  if (lid && findList(lid)) target.list = lid; else delete target.list;
  if (tf.date) target.date = tf.date; else delete target.date;
  if (tf.date && tf.time) target.time = tf.time; else delete target.time;
  const rems = tf.date ? normReminds(tf.reminds, tf.time) : [];
  if (rems.length) target.reminds = rems; else delete target.reminds;
  delete target.remind;
  if (tf.due) target.due = tf.due; else delete target.due;
  if (tf.someday && !tf.date && !tf.due) target.someday = true; else delete target.someday;
  const rep = tf.date ? normRep(tf.rep) : null;
  if (rep) target.rep = rep; else delete target.rep;
  if (tf.due && tf.dueRemind !== null) target.dueRemind = tf.dueRemind; else delete target.dueRemind;
  target.updatedAt = Date.now();
  touchTasks();
  if (skip && target.rep) skipRepeat(target);
  if (arch && target.archivedAt) restoreTask(target);
  else if (arch && !target.done) archiveTask(target);
};

export function quickLabel(r, today = todayKey()) {
  const parts = [];
  if (r?.date) parts.push((r.date === today ? 'Сегодня' : r.date === tomorrowOf(today) ? 'Завтра' : taskWhen(r.date, today)) + (r.time ? `, ${r.time} · напоминание в срок` : ''));
  if (r?.due) parts.push(`Срок: ${dueWhen(r.due, today)}`);
  if (r?.rep) parts.push(`Повтор: ${repLabel(r.rep).toLowerCase()}`);
  if (r?.someday) parts.push('Когда-нибудь');
  if (r?.listName) parts.push(`Список: ${r.listName}`);
  if (r?.important) parts.push('Важная');
  return parts.join(' · ');
}
export function parseLines(text) {
  return String(text ?? '').split(/\r\n|\r|\n/).map(line => {
    let s = line.trim().replace(/^(?:[-•*]\s+|\d{1,3}[.)]\s+)/, ''), done = false;
    const m = /^\[([ xXхХ]?)\]\s*/.exec(s);
    if (m) { done = !!m[1].trim(); s = s.slice(m[0].length); }
    return { text: s.trim(), done };
  }).filter(x => x.text);
}

const IC_X = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const subRow = (s, i) => `<div class="t-sub" role="listitem" data-i="${i}"><button type="button" class="t-sbox" role="checkbox" aria-checked="${s.done}" aria-label="Подзадача выполнена">${IC_CHECK}</button><textarea class="t-sin" rows="1" maxlength="${TASK_LIM.sub}" enterkeyhint="next" autocomplete="off" aria-label="Подзадача ${i + 1}"></textarea><button type="button" class="ghost icon-btn t-sdel" aria-label="Удалить подзадачу">${IC_X}</button></div>`;
function paintSubs(focus = -1) {
  const box = $('tfSubs');
  box.innerHTML = tf.subs.map(subRow).join('');
  box.querySelectorAll('.t-sin').forEach((inp, i) => { inp.value = tf.subs[i].text; fit(inp); });
  $('tfSubAdd').hidden = tf.subs.length >= TASK_LIM.subs;
  if (focus >= 0) box.querySelectorAll('.t-sin')[focus]?.focus();
}
function reindexSubs() {
  $('tfSubs').querySelectorAll('.t-sub').forEach((row, i) => { row.dataset.i = i; row.querySelector('.t-sin').setAttribute('aria-label', `Подзадача ${i + 1}`); });
  $('tfSubAdd').hidden = tf.subs.length >= TASK_LIM.subs;
}
const newSub = (text = '') => ({ id: newSubId(), text, done: false });
function insertSubs(at, texts) {
  const room = TASK_LIM.subs - tf.subs.length, list = texts.slice(0, Math.max(0, room)).map(x => newSub(x.slice(0, TASK_LIM.sub)));
  tf.subs.splice(at, 0, ...list);
  if (texts.length > list.length) toast(`В задаче может быть до ${TASK_LIM.subs} подзадач`);
  return list.length;
}
const subIndex = el => +el.closest('.t-sub').dataset.i;
$('tfSubs').addEventListener('input', e => {
  const el = e.target;
  if (!el.classList.contains('t-sin')) return;
  if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/\s*[\r\n]+\s*/g, ' ');
  tf.subs[subIndex(el)].text = el.value;
  fit(el);
});
$('tfSubs').addEventListener('click', e => {
  const box = e.target.closest('.t-sbox'), del = e.target.closest('.t-sdel');
  if (box) {
    const s = tf.subs[subIndex(box)];
    s.done = !s.done;
    box.setAttribute('aria-checked', s.done);
  } else if (del) {
    const i = subIndex(del);
    tf.subs.splice(i, 1);
    del.closest('.t-sub').remove();
    reindexSubs();
    const next = $('tfSubs').querySelectorAll('.t-sin')[Math.min(i, tf.subs.length - 1)];
    (next || $('tfSubAdd')).focus();
  }
});
$('tfSubs').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.classList.contains('t-sin') || e.isComposing) return;
  e.preventDefault();
  const i = subIndex(e.target);
  if (!e.target.value.trim()) return;
  if (insertSubs(i + 1, [''])) paintSubs(i + 1);
});
$('tfSubs').addEventListener('focusout', e => {
  const inp = e.target;
  if (!inp.classList?.contains('t-sin') || inp.value.trim()) return;
  const row = inp.closest('.t-sub');
  if (e.relatedTarget && row.contains(e.relatedTarget)) return;
  tf.subs.splice(+row.dataset.i, 1);
  row.remove();
  reindexSubs();
});
$('tfSubs').addEventListener('paste', e => {
  const inp = e.target;
  if (!inp.classList?.contains('t-sin')) return;
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!/[\r\n]/.test(text.trim())) return;
  e.preventDefault();
  const lines = parseLines(text).map(x => x.text);
  if (!lines.length) return;
  const i = subIndex(inp), cur = tf.subs[i], a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? inp.value.length;
  cur.text = (inp.value.slice(0, a) + lines[0] + inp.value.slice(b)).slice(0, TASK_LIM.sub);
  const n = insertSubs(i + 1, lines.slice(1));
  paintSubs(i + n);
});
$('tfSubAdd').onclick = () => {
  const last = tf.subs.at(-1);
  if (last && !last.text.trim()) return paintSubs(tf.subs.length - 1);
  if (insertSubs(tf.subs.length, [''])) paintSubs(tf.subs.length - 1);
};
function subsToSave(t) {
  const subs = normSubs(tf.subs), others = tasksOf().reduce((n, x) => n + (x === t ? 0 : x.subs?.length || 0), 0), room = Math.max(0, TASK_LIM.subsTotal - others);
  if (subs.length > room) toast(`Во всех задачах может быть до ${TASK_LIM.subsTotal} подзадач`);
  return subs.slice(0, room);
}
export function toggleSub(t, sid) {
  const s = (t.subs || []).find(x => x.id === sid);
  if (!s) return;
  s.done = !s.done;
  t.updatedAt = Date.now();
  touchTasks();
  const st = subStats(t);
  if (s.done && st.done === st.total && !t.done) toast('Все подзадачи выполнены', () => { const cur = findTask(t.id); if (cur && !cur.done) toggleTask(cur); }, 'Завершить задачу');
}

function syncTaskPriv() {
  const slot = $('tfPrivSlot');
  if (!unlocked) { slot.innerHTML = ''; return; }
  if (!slot.firstChild) slot.innerHTML = `<div class="tf-row tf-priv"><span class="tf-ic">${IC.lock}</span><span class="tf-lbl"><b id="tfPrivLbl">Личная</b><small>Видна, только когда личное открыто</small></span><button type="button" class="switch" id="tfPriv" role="switch" aria-labelledby="tfPrivLbl"><span></span></button></div>`;
  slot.firstChild.classList.toggle('on', tf.priv);
  $('tfPriv').setAttribute('aria-checked', tf.priv);
}
$('tfPrivSlot').onclick = e => {
  if (!e.target.closest('.tf-priv') || !unlocked) return;
  tf.priv = !tf.priv;
  syncTaskPriv();
};
export function tasksLocked() {
  if (tf.priv || isPrivate(findTask(tf.id))) {
    tf.base = tfSnap();
    if ($('tFormOv')._shown) { closeOverlay($('tFormOv')); $('tFormOv').hidden = true; }
    $('tfText').value = '';
    $('tfNote').value = '';
    tf.subs = [];
    tf.id = null;
    tf.priv = false;
    paintSubs();
    $('tfParse').hidden = true;
  }
  syncTaskPriv();
}

export const listsOf = (s = state) => s.taskLists || (s.taskLists = []);
export const findList = id => listsOf().find(l => l.id === id);
export function curList() {
  const v = getPref(TASKS_LIST_STORE, 'all');
  return v === 'all' || v === 'inbox' || findList(v) ? v : 'all';
}
export const inList = (t, v = curList()) => v === 'all' || (v === 'inbox' ? !t.list : t.list === v);
export const screenTasks = () => { const v = curList(); return visTasks().filter(t => inList(t, v)); };
const IC_PLUS_S = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
function paintListChips() {
  const lists = listsOf(), v = curList(), box = $('tLists'), lc = findList(v)?.color;
  if (lc) $('tasksOv').style.setProperty('--list-c', lc); else $('tasksOv').style.removeProperty('--list-c');
  const sec = !tv.shared && isSection(tv.smart) ? tv.smart : null, vis = visTasks().filter(t => !t.done && !t.archivedAt);
  const open = id => vis.filter(t => inList(t, id)).length;
  const chip = (id, label, color) => { const n = open(id); return `<button type="button" class="t-chip" data-l="${esc(id)}" aria-pressed="${!sec && v === id}">${color ? `<i class="t-ldot" style="--c:${esc(color)}"></i>` : ''}<span>${esc(label)}</span>${n ? `<span class="cnt">${n}</span>` : ''}</button>`; };
  const secName = sec && SECTIONS.find(x => x[0] === sec)[1];
  const secTab = sec ? `<button type="button" class="t-chip t-chip-on" data-sec="${sec}" aria-pressed="true" aria-label="${secName}, закрыть раздел">${IC_SEC[sec]}<span>${secName}</span><span class="cnt">${smartList(sec).length}</span><span class="t-x" aria-hidden="true">${IC_X}</span></button>` : '';
  box.innerHTML = secTab + chip('all', 'Все') + (lists.length ? chip('inbox', inboxName()) + lists.map(l => chip(l.id, l.name, l.color)).join('') : '')
    + taskHooks.chips(tv.shared)
    + `<button type="button" class="t-chip t-chip-add" data-l="+" aria-label="Создать список">${IC_PLUS_S}</button>`;
  if (tv.shared) box.querySelectorAll('[data-l][aria-pressed]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  const on = box.querySelector('[aria-pressed=true]');
  if (on && (on.offsetLeft < box.scrollLeft || on.offsetLeft + on.offsetWidth > box.scrollLeft + box.clientWidth)) box.scrollLeft = on.offsetLeft - 16;
  fadeTabs();
}
function fadeTabs() {
  const box = $('tLists');
  box.classList.toggle('fade', box.scrollLeft + box.clientWidth < box.scrollWidth - 2);
}
$('tLists').addEventListener('scroll', fadeTabs, { passive: true });
const isSection = id => SECTIONS.some(x => x[0] === id);
$('tLists').onclick = e => {
  if (e.target.closest('[data-sec]')) return setSmart(null);
  const sl = e.target.closest('[data-sl]');
  if (sl) return taskHooks.select?.(sl.dataset.sl);
  const b = e.target.closest('[data-l]');
  if (!b) return;
  if (b.dataset.l === '+') return openListEditor();
  if (b.dataset.l === 'shared') return taskHooks.open?.();
  tv.shared = null;
  if (isSection(tv.smart)) tv.smart = null;
  setPref(TASKS_LIST_STORE, b.dataset.l);
  tv.shown = {};
  renderTasks();
};
function touchLists() {
  save();
  renderTasks();
  paintListsSheet();
}
const COLOR_NAMES = ['синий', 'голубой', 'бирюзовый', 'зелёный', 'жёлтый', 'оранжевый', 'красный', 'розовый', 'фиолетовый', 'серый'];
const listOpen = id => visTasks().filter(t => !t.done && !t.archivedAt && (id ? t.list === id : !t.list)).length;
const listInitial = l => esc(([...l.name.trim()][0] || '•').toUpperCase());
const listRow = l => {
  const n = listOpen(l.id);
  return `<div class="tl-row" data-id="${esc(l.id)}">
    <button type="button" class="tl-open" aria-label="Изменить список «${esc(l.name)}»${n ? `, открытых задач: ${n}` : ''}"><span class="tl-dot" style="--c:${esc(l.color)}">${listInitial(l)}</span><span class="tl-nm">${esc(l.name)}</span><span class="tl-cnt">${n || ''}</span>${IC_FWD}</button>
    <button type="button" class="ghost icon-btn tl-drag" aria-label="Переместить список «${esc(l.name)}»" title="Перетащите, чтобы изменить порядок (или стрелки ↑ ↓)">${IC.grip}</button>
  </div>`;
};
function paintListsSheet() {
  if (!$('tListsOv')._shown) return;
  const lists = listsOf(), full = lists.length >= TASK_LIM.lists;
  $('tlInbox').textContent = listOpen('') || '';
  $('tlInboxName').textContent = inboxName();
  $('tlInboxBtn').setAttribute('aria-label', `Изменить список «${inboxName()}»`);
  $('tlItems').innerHTML = lists.length ? lists.map(listRow).join('') : '<p class="tl-empty">Списков пока нет</p>';
  $('tlAdd').disabled = full;
  $('tlHint').textContent = full ? `Это предел — ${TASK_LIM.lists} списков. Удалите ненужный, чтобы добавить новый.` : `Касание открывает список. Порядок меняется перетаскиванием за ⋮⋮. До ${TASK_LIM.lists} списков.`;
}
export function openListsSheet() {
  openOverlay($('tListsOv'));
  paintListsSheet();
}
export function addList(name = 'Новый список', color) {
  const lists = listsOf();
  if (lists.length >= TASK_LIM.lists) { toast(`Можно завести до ${TASK_LIM.lists} списков`); return null; }
  const used = new Set(lists.map(l => l.color)), l = { id: newListId(), name: name.trim().slice(0, TASK_LIM.listName) || 'Список', color: COLORS.includes(color) ? color : COLORS.find(c => !used.has(c)) || COLORS[0], updatedAt: Date.now() };
  lists.push(l);
  save();
  renderTasks();
  paintListsSheet();
  return l;
}
export async function deleteList(id) {
  const l = findList(id);
  if (!l) return false;
  const n = tasksOf().filter(t => t.list === id).length;
  const yes = await askConfirm('Удалить список?', n ? `Задачи из списка «${l.name}» перейдут ${inboxTo()}.` : `Список «${l.name}» пустой.`, 'Удалить');
  if (!yes) return false;
  const now = Date.now();
  for (const t of tasksOf()) if (t.list === id) { delete t.list; t.updatedAt = now; }
  listsOf().splice(listsOf().indexOf(l), 1);
  if (getPref(TASKS_LIST_STORE, 'all') === id) setPref(TASKS_LIST_STORE, 'all');
  save();
  renderDayTasks();
  touchLists();
  return true;
}
function moveList(id, to) {
  const lists = listsOf(), i = lists.findIndex(l => l.id === id);
  if (i < 0 || to < 0 || to >= lists.length || to === i) return false;
  lists.splice(to, 0, lists.splice(i, 1)[0]);
  touchLists();
  return true;
}
$('tlAdd').onclick = () => openListEditor();
$('tlInboxBtn').onclick = () => openListEditor('inbox');
$('tlItems').addEventListener('click', e => {
  const b = e.target.closest('.tl-open');
  if (b) openListEditor(b.closest('.tl-row').dataset.id);
});
{
  const box = $('tlItems');
  let d = null;
  box.addEventListener('pointerdown', e => {
    const h = e.target.closest('.tl-drag');
    if (!h || e.button !== 0) return;
    e.preventDefault();
    const row = h.closest('.tl-row'), rows = [...box.querySelectorAll('.tl-row')];
    d = { id: e.pointerId, row, rows, y0: e.clientY, from: rows.indexOf(row), to: rows.indexOf(row), h: row.offsetHeight };
    try { h.setPointerCapture(e.pointerId); } catch {}
    row.classList.add('dragging');
  });
  box.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    d.to = Math.max(0, Math.min(d.rows.length - 1, d.from + Math.round(dy / d.h)));
    d.row.style.transform = `translateY(${dy}px)`;
    d.rows.forEach((r, i) => {
      if (r === d.row) return;
      const s = d.from < d.to && i > d.from && i <= d.to ? -d.h : d.from > d.to && i < d.from && i >= d.to ? d.h : 0;
      r.style.transform = s ? `translateY(${s}px)` : '';
    });
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const { row, rows, from, to } = d;
    d = null;
    for (const r of rows) r.style.transform = '';
    row.classList.remove('dragging');
    if (from !== to) moveList(row.dataset.id, to);
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('keydown', e => {
    const h = e.target.closest('.tl-drag');
    if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = h.closest('.tl-row').dataset.id, i = listsOf().findIndex(l => l.id === id);
    if (moveList(id, i + (e.key === 'ArrowUp' ? -1 : 1))) box.querySelector(`.tl-row[data-id="${CSS.escape(id)}"] .tl-drag`)?.focus();
  });
}

const tle = { id: null, color: COLORS[0] };
$('tleColors').innerHTML = COLORS.map((c, i) => `<button type="button" role="radio" class="tle-c" data-c="${c}" style="--c:${c}" aria-label="${COLOR_NAMES[i] || c}" aria-checked="false"></button>`).join('');
function paintListEditor() {
  const name = $('tleName').value;
  $('tlePv').style.setProperty('--c', tle.color || 'var(--muted)');
  $('tleCount').textContent = `${[...name].length} / ${TASK_LIM.listName}`;
  $('tleOk').disabled = !name.trim();
  for (const b of $('tleColors').children) { const on = b.dataset.c === tle.color; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; }
}
export function openListEditor(id = null) {
  const inbox = id === 'inbox', l = id && !inbox ? findList(id) : null;
  $('tleColorsLbl').hidden = $('tleColors').hidden = inbox;
  if (inbox) {
    tle.id = 'inbox';
    tle.color = null;
    $('tleTitle').textContent = 'Список';
    $('tleName').value = inboxName();
    $('tleHint').hidden = false;
    $('tleHint').textContent = 'Сюда попадают задачи без списка. Название можно поменять, а удалить этот список нельзя.';
    $('tleDelWrap').hidden = true;
    paintListEditor();
    return openOverlay($('tListOv'));
  }
  $('tleHint').textContent = 'Цвет списка виден в чипах, у задач и точками в календаре.';
  if (!l && listsOf().length >= TASK_LIM.lists) { toast(`Можно завести до ${TASK_LIM.lists} списков`); return; }
  const used = new Set(listsOf().map(x => x.color));
  tle.id = l ? l.id : null;
  tle.color = l ? l.color : COLORS.find(c => !used.has(c)) || COLORS[0];
  $('tleTitle').textContent = l ? 'Список' : 'Новый список';
  $('tleName').value = l ? l.name : '';
  $('tleHint').hidden = !!l;
  $('tleDelWrap').hidden = !l;
  if (l) {
    const n = tasksOf().filter(t => t.list === l.id).length;
    $('tleDelNote').textContent = n ? `${n} ${plural(n, 'задача', 'задачи', 'задач')} ${plural(n, 'перейдёт', 'перейдут', 'перейдут')} ${inboxTo()}` : 'В списке нет задач';
  }
  paintListEditor();
  openOverlay($('tListOv'));
  if (!l) $('tleName').focus();
}
$('tleName').addEventListener('input', paintListEditor);
$('tleColors').addEventListener('click', e => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  tle.color = b.dataset.c;
  paintListEditor();
});
$('tleColors').addEventListener('keydown', e => {
  const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!k) return;
  e.preventDefault();
  tle.color = COLORS[(COLORS.indexOf(tle.color) + k + COLORS.length) % COLORS.length];
  paintListEditor();
  $('tleColors').querySelector(`[data-c="${tle.color}"]`)?.focus();
});
$('tleForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('tleName').value.trim().slice(0, TASK_LIM.listName);
  if (!name) return;
  if (tle.id === 'inbox') {
    const v = normInboxName(name);
    if (v) state.inboxName = v; else delete state.inboxName;
    save();
    renderTasks();
    closeOverlay($('tListOv'));
    return paintListsSheet();
  }
  const l = tle.id && findList(tle.id);
  if (l) {
    l.name = name;
    l.color = tle.color;
    l.updatedAt = Date.now();
    save();
    renderTasks();
  } else if (!addList(name, tle.color)) return;
  closeOverlay($('tListOv'));
  paintListsSheet();
});
$('tleDel').onclick = async () => {
  if (await deleteList(tle.id)) closeOverlay($('tListOv'));
};
function listMenu(b) {
  const id = b.dataset.l;
  if (id === 'inbox') return openMenu(b, [{ icon: IC.edit, label: 'Переименовать', run: () => openListEditor('inbox') }, { icon: IC_LIST, label: 'Все списки', run: openListsSheet }]);
  openMenu(b, [
    { icon: IC.edit, label: 'Изменить список', run: () => openListEditor(id) },
    { icon: IC_LIST, label: 'Все списки', run: openListsSheet },
    '-',
    { icon: IC.trash, label: 'Удалить список', danger: true, run: () => deleteList(id) },
  ]);
}
{
  const box = $('tLists');
  let lp = null, fired = false;
  const cancel = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
  const listChip = t => { const b = t.closest?.('.t-chip[data-l]'); return b && (b.dataset.l === 'inbox' || findList(b.dataset.l)) ? b : null; };
  box.addEventListener('pointerdown', e => {
    const b = listChip(e.target);
    fired = false;
    if (!b || e.button !== 0) return;
    cancel();
    lp = { id: e.pointerId, x: e.clientX, y: e.clientY, b };
    lp.t = setTimeout(() => { const c = lp.b; lp = null; fired = true; navigator.vibrate?.(15); listMenu(c); }, LONG_MS);
  });
  box.addEventListener('pointermove', e => { if (lp && e.pointerId === lp.id && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > LONG_SLOP) cancel(); });
  for (const t of ['pointerup', 'pointercancel', 'scroll']) box.addEventListener(t, cancel);
  box.addEventListener('contextmenu', e => {
    const b = listChip(e.target);
    if (!b) return;
    e.preventDefault();
    if (fired) return;
    cancel();
    fired = true;
    listMenu(b);
  });
  box.addEventListener('click', e => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}

const ORDER_MS = 500;
export const canOrder = t => !!t && !t.done && !t.archivedAt && !t.time && !t.important;
function orderPeers(row) {
  const t = findTask(row.dataset.id);
  return [...row.parentElement.querySelectorAll(':scope > .t-row')].filter(r => { const x = findTask(r.dataset.id); return canOrder(x) && (x.date || '') === (t.date || ''); });
}
export function placeTask(t, prev, next) {
  const v = prev && next ? (orderOf(prev) + orderOf(next)) / 2 : prev ? orderOf(prev) + 1 : next ? orderOf(next) - 1 : orderOf(t);
  t.ord = v;
  t.updatedAt = Date.now();
  touchTasks();
}

let sqTimer = 0;
const fold = s => String(s).toLowerCase().replace(/ё/g, 'е');
export function searchTasks(q, list = visTasks()) {
  const f = fold(q.trim());
  if (!f) return null;
  const hit = t => fold(t.text).includes(f) || fold(t.note || '').includes(f) || (t.subs || []).some(s => fold(s.text).includes(f));
  const found = list.filter(hit);
  return { active: found.filter(t => !t.done && !t.archivedAt), done: found.filter(t => t.done), archived: found.filter(t => !t.done && t.archivedAt) };
}
export function markInto(el, text, q) {
  const f = fold(q.trim()), src = String(text), low = fold(src);
  el.textContent = '';
  if (!f) { el.textContent = src; return; }
  let pos = 0;
  for (let i = low.indexOf(f); i >= 0; i = low.indexOf(f, pos)) {
    if (i > pos) el.append(src.slice(pos, i));
    const m = document.createElement('mark');
    m.textContent = src.slice(i, i + f.length);
    el.append(m);
    pos = i + f.length;
  }
  if (pos < src.length) el.append(src.slice(pos));
}
function snippet(t, q) {
  const f = fold(q.trim());
  if (fold(t.text).includes(f)) return null;
  if (t.note && fold(t.note).includes(f)) {
    const i = fold(t.note).indexOf(f), a = Math.max(0, i - 30);
    return ['Заметка: ', (a ? '…' : '') + t.note.slice(a, i + f.length + 60).replace(/\s+/g, ' ')];
  }
  const s = (t.subs || []).find(x => fold(x.text).includes(f));
  return s ? ['Подзадача: ', s.text] : null;
}
function renderSearch() {
  const q = $('tsText').value, res = searchTasks(q, tv.smart ? smartList(tv.smart) : visTasks()), box = $('tsResults');
  box.replaceChildren();
  $('tsResults').hidden = !res;
  $('tListView').hidden = !!res || (!tv.smart && tv.tab !== 'list');
  $('tMonthView').hidden = !!res || !!tv.smart || tv.tab !== 'month';
  if (!res) return;
  const groups = [['Активные', res.active], ['Выполненные', res.done], ['Архив', res.archived]].filter(g => g[1].length);
  if (!groups.length) {
    const p = document.createElement('p');
    p.className = 't-snone';
    p.textContent = 'Ничего не найдено';
    box.append(p);
    return;
  }
  for (const [title, list] of groups) {
    const sec = document.createElement('section'), h = document.createElement('h3'), card = document.createElement('div');
    sec.className = 't-group';
    h.className = 'sec-h';
    h.innerHTML = '<span></span><span class="cnt"></span>';
    h.firstChild.textContent = title;
    h.lastChild.textContent = list.length;
    card.className = 'card t-list';
    for (const t of list.slice(0, 50)) {
      const b = document.createElement('button'), name = document.createElement('span');
      b.type = 'button';
      b.className = 't-sres' + (t.done ? ' done' : '');
      b.dataset.id = t.id;
      name.className = 't-sname';
      markInto(name, t.text, q);
      b.append(name);
      const sn = snippet(t, q);
      if (sn) {
        const small = document.createElement('small'), body = document.createElement('span');
        small.append(sn[0]);
        markInto(body, sn[1], q);
        small.append(body);
        b.append(small);
      }
      card.append(b);
    }
    sec.append(h, card);
    box.append(sec);
  }
}
export function openSearch() {
  exitSelect(false);
  if (tv.shared) { tv.shared = null; renderTasks(); }
  $('tSearch').hidden = false;
  $('tSearchBtn').setAttribute('aria-expanded', 'true');
  $('tsText').value = '';
  renderTasks();
  $('tsText').focus({ preventScroll: true });
}
export function closeSearch() {
  clearTimeout(sqTimer);
  const was = !$('tSearch').hidden;
  $('tSearch').hidden = true;
  $('tSearchBtn').setAttribute('aria-expanded', 'false');
  if (tv.smart && !isSection(tv.smart)) tv.smart = null;
  renderTasks();
  if (was && !reducedMotion) $('tasksOv').querySelectorAll('.page-head > :not(.t-search)').forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }));
  $('tsText').value = '';
  renderSearch();
}
$('tSearchBtn').onclick = () => ($('tSearch').hidden ? openSearch() : closeSearch());
$('tsClose').onclick = () => { closeSearch(); $('tSearchBtn').focus({ preventScroll: true }); };
$('tsText').addEventListener('input', () => { clearTimeout(sqTimer); sqTimer = setTimeout(renderSearch, 150); });
$('tsText').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); $('tSearchBtn').focus({ preventScroll: true }); } });
$('tsResults').addEventListener('click', e => {
  const b = e.target.closest('.t-sres'), t = b && findTask(b.dataset.id);
  if (t && (!isPrivate(t) || unlocked)) openTaskForm(t);
});

function paintImp() {
  $('tfImp').setAttribute('aria-checked', tf.imp);
}
$('tfImpRow').onclick = () => { tf.imp = !tf.imp; paintImp(); };
function paintListSelect(v) {
  const lists = listsOf(), sel = $('tfList');
  $('tfListRow').hidden = !lists.length;
  sel.replaceChildren(new Option(inboxName(), ''), ...lists.map(l => new Option(l.name, l.id)));
  sel.value = lists.some(l => l.id === v) ? v : '';
}

const repBase = () => tf.date || todayKey();
function repPreset(v) {
  const d = parseKey(repBase());
  if (v === 'd') return { m: 'cal', n: 1, u: 'd' };
  if (v === 'w') return { m: 'cal', n: 1, u: 'w', wd: [weekday(d)] };
  if (v === 'mo') return { m: 'cal', n: 1, u: 'mo', md: d.getDate() };
  return null;
}
function repPresetOf(rep) {
  if (!rep) return '';
  if (rep.m !== 'cal' || rep.n !== 1 || rep.until) return 'custom';
  const d = parseKey(repBase());
  if (rep.u === 'd') return 'd';
  if (rep.u === 'w' && (!rep.wd || (rep.wd.length === 1 && rep.wd[0] === weekday(d)))) return 'w';
  if (rep.u === 'mo' && (!rep.md || rep.md === d.getDate())) return 'mo';
  return 'custom';
}
function paintTfRep() {
  $('tfRepVal').textContent = repText();
  $('tfSkip').hidden = !tf.id || !tf.rep || tf.repDone;
  const st = tf.repStat;
  $('tfRepStat').hidden = !st;
  $('tfRepStat').textContent = st ? `Выполнено ${st[0]} ${plural(st[0], 'раз', 'раза', 'раз')}${st[1] ? `, последний раз ${dayShort(st[1])}` : ''}` : '';
}
function setRep(rep) {
  tf.rep = rep;
  if (rep && !tf.date) tf.date = todayKey();
  paintTfDate();
}
const REP_OPTS = [['', 'Нет'], ['d', 'Каждый день'], ['w', 'Каждую неделю'], ['mo', 'Каждый месяц']];
const repText = () => !tf.rep ? 'Нет' : repLabel(tf.rep) + (tf.rep.until ? ` до ${dayShort(tf.rep.until)}` : '');
$('tfRepBtn').onclick = () => {
  const cur = repPresetOf(tf.rep);
  const items = REP_OPTS.map(([v, label]) => ({ v, label, on: cur === v }));
  if (cur === 'custom') items.push({ v: 'custom', label: repText(), on: true });
  items.push({ v: 'other', label: 'Другое…' });
  openPick('Повтор', items, v => {
    if (v === 'other') return openRepSheet();
    if (v !== 'custom') setRep(repPreset(v));
  }, $('tfRepBtn'));
};
$('tfSkip').onclick = () => {
  tf.skip = true;
  $('tForm').requestSubmit();
};

const rs = { m: 'cal', n: 1, u: 'w', wd: [], md: 1, last: false, until: null };
const UNIT_LIMIT = { d: 'Для дней — от 1 до 365', w: 'Для недель — от 1 до 52', mo: 'Для месяцев — от 1 до 24', y: 'Для лет — от 1 до 10' };
function rsRep() {
  const n = Number($('trN').value);
  const rep = { m: rs.m, n: Number.isInteger(n) ? n : 0, u: rs.u };
  if (rs.m === 'cal' && rs.u === 'w') rep.wd = [...rs.wd];
  if (rs.m === 'cal' && rs.u === 'mo') rep.md = rs.last ? 'last' : rs.md;
  if (rs.until) rep.until = rs.until;
  return rep;
}
function paintRepSheet() {
  for (const b of $('trMode').querySelectorAll('button')) b.setAttribute('aria-checked', b.dataset.m === rs.m);
  $('trEvery').textContent = rs.m === 'after' ? 'Через' : 'Каждые';
  $('trUnit').innerHTML = REP_UNITS.map(([u, l]) => `<button type="button" role="radio" data-u="${u}" aria-checked="${u === rs.u}">${l}</button>`).join('');
  $('trWd').hidden = !(rs.m === 'cal' && rs.u === 'w');
  $('trWd').innerHTML = WD_SHORT.map((l, i) => `<button type="button" class="t-chip" data-wd="${i}" aria-pressed="${rs.wd.includes(i)}" aria-label="${['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][i]}"><span>${l[0].toUpperCase() + l[1]}</span></button>`).join('');
  $('trMd').hidden = !(rs.m === 'cal' && rs.u === 'mo');
  $('trMd').innerHTML = `<button type="button" role="radio" data-md="day" aria-checked="${!rs.last}">${rs.md}-го числа</button><button type="button" role="radio" data-md="last" aria-checked="${rs.last}">Последний день месяца</button>`;
  $('trUntilVal').textContent = rs.until ? dayShort(rs.until) : 'Не задано';
  $('trUntilClear').hidden = !rs.until;
  const rep = normRep(rsRep());
  $('trPreview').textContent = rep ? repLabel(rep) + (rep.until ? `, до ${dayShort(rep.until)}` : '') : '';
}
function openRepSheet() {
  const d = parseKey(repBase()), r = tf.rep;
  Object.assign(rs, { m: r?.m || 'cal', n: r?.n || 1, u: r?.u || 'w', wd: r?.wd ? [...r.wd] : [weekday(d)], md: typeof r?.md === 'number' ? r.md : d.getDate(), last: r?.md === 'last', until: r?.until || null });
  $('trN').value = rs.n;
  $('trErr').hidden = true;
  paintRepSheet();
  openOverlay($('tRepOv'));
}
$('trMode').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; rs.m = b.dataset.m; paintRepSheet(); };
$('trUnit').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; rs.u = b.dataset.u; $('trErr').hidden = true; paintRepSheet(); };
$('trWd').onclick = e => {
  const b = e.target.closest('[data-wd]');
  if (!b) return;
  const i = +b.dataset.wd;
  rs.wd = rs.wd.includes(i) ? rs.wd.filter(x => x !== i) : [...rs.wd, i].sort((a, x) => a - x);
  paintRepSheet();
};
$('trMd').onclick = e => { const b = e.target.closest('[data-md]'); if (!b) return; rs.last = b.dataset.md === 'last'; paintRepSheet(); };
$('trN').addEventListener('input', () => { $('trErr').hidden = true; paintRepSheet(); });
$('trN').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('trOk').click(); } });
$('trUntil').onclick = () => pickDate(rs.until, d => { rs.until = d; paintRepSheet(); }, 'until');
$('trUntilClear').onclick = () => { rs.until = null; paintRepSheet(); $('trUntil').focus({ preventScroll: true }); };
$('trOk').onclick = () => {
  const raw = $('trN').value.trim(), n = Number(raw), err = $('trErr');
  if (!/^\d+$/.test(raw) || n < 1 || n > REP_MAX[rs.u]) { err.textContent = UNIT_LIMIT[rs.u]; err.hidden = false; return $('trN').focus(); }
  if (rs.m === 'cal' && rs.u === 'w' && !rs.wd.length) { err.textContent = 'Выберите хотя бы один день недели'; err.hidden = false; return; }
  const rep = normRep(rsRep());
  if (!rep) return;
  closeOverlay($('tRepOv'));
  setRep(rep);
};

export const inboxName = () => state.inboxName || INBOX;
const inboxTo = () => state.inboxName ? `в «${state.inboxName}»` : `во «${INBOX}»`;
export const smartList = id => smartFilter(id, screenTasks(), todayKey(), { unlocked });
export function setSmart(id) {
  exitSelect(false);
  tv.smart = id;
  if (id) tv.shared = null;
  tv.smartShown = LIST_STEP;
  renderTasks();
}
function paintFilters() {
  const all = screenTasks(), today = todayKey();
  $('tsFilters').innerHTML = SMART.filter(([id]) => id !== 'priv' || unlocked).map(([id, name]) => {
    const n = smartFilter(id, all, today, { unlocked }).length, on = tv.smart === id;
    return `<button type="button" class="t-chip t-chip-sec" data-f="${id}" aria-pressed="${on}"${n || on ? '' : ' disabled'}><span>${esc(name)}</span><span class="cnt">${n}</span></button>`;
  }).join('');
}
$('tsFilters').onclick = e => {
  const b = e.target.closest('[data-f]');
  if (b) setSmart(tv.smart === b.dataset.f ? null : b.dataset.f);
};
function smartDayOf(id, t, today) {
  if (id === 'done') return t.doneAt;
  if (id === 'someday' || id === 'arch') return '';
  if (id === 'due') return t.due;
  return effDay(t);
}
function renderSmart() {
  const today = todayKey(), id = tv.smart, list = smartList(id), sec = isSection(id);
  paintListChips();
  if (!list.length) { $('tItems').innerHTML = `<p class="t-snone">${sec ? 'Здесь пока пусто' : 'Таких задач нет'}</p>`; return; }
  const shown = list.slice(0, tv.smartShown), groups = [];
  for (const t of shown) {
    const k = smartDayOf(id, t, today) || '';
    if (!groups.length || groups.at(-1).k !== k) groups.push({ k, items: [] });
    groups.at(-1).items.push(t);
  }
  const head = k => !k ? 'Без даты' : id === 'done' ? doneHeading(k, today) : taskWhen(k, today);
  const rest = list.length - shown.length, plain = id === 'someday' || id === 'arch';
  $('tItems').innerHTML = groups.map(g => `<section class="t-group">${plain ? '' : `<h3 class="sec-h"><span>${esc(head(g.k))}</span><span class="cnt">${g.items.length}</span></h3>`}<div class="card t-list">${g.items.map(t => rowHTML(t, 'none', today)).join('')}</div></section>`).join('')
    + (rest > 0 ? `<button type="button" class="t-more-btn" data-act="smart-more">Показать ещё ${Math.min(rest, LIST_STEP)}</button>` : '');
}

export function doneTaskFromPush(id) {
  const t = findTask(id);
  if (t && !t.done) toggleTask(t);
}

export function renderDayTasks() {
  const today = todayKey(), k = key(viewDate), box = $('dayTasks');
  syncSettings();
  const left = pendingToday(visTasks(), today), badge = $('tasksBadge');
  badge.hidden = !left;
  badge.textContent = left > 9 ? '9+' : left;
  $('tasksBtn').setAttribute('aria-label', left ? `Задачи, на сегодня: ${left}` : 'Задачи');
  if ($('tasksOv')._shown) renderTasks();
  const raw = dayOn() ? dayTasks(visTasks(), k, today) : [], list = k >= today ? raw.filter(t => !t.done) : raw;
  const allDone = !list.length && k === today && raw.length > 0;
  const anchor = dayPos() === 'bottom' ? $('archive') : $('futureNote');
  if (box.nextElementSibling !== anchor) anchor.before(box);
  box.hidden = !list.length && !allDone;
  closeRow();
  if (allDone) { box.innerHTML = `<div class="card t-alldone" role="status">${IC_CHECK}<span>Все задачи на сегодня выполнены</span></div>`; return; }
  if (!list.length) { box.innerHTML = ''; return; }
  const limit = dayLimit(), all = tv.dayOpen === k, shown = all ? list : list.slice(0, limit), rest = list.length - shown.length;
  const done = list.filter(t => t.done).length;
  const fold = dayFolded(), head = `<button type="button" class="t-day-head" data-act="day-fold" aria-expanded="${!fold}">${IC_LIST}<span class="sec-t">Задачи</span><span class="cnt">${k >= today && done === 0 ? list.length : `${done} из ${list.length}`}</span>${IC_DOWN}</button>`;
  box.innerHTML = `<div class="card t-list">${head}${fold ? '' : `${shown.map(t => rowHTML(t, 'day', today)).join('')}
      ${rest > 0 ? `<button type="button" class="t-more" data-act="day-more">Ещё ${rest}</button>` : ''}
      ${k > today ? `<button type="button" class="t-addrow" data-act="add" data-k="${k}">${IC.plus}<span>Добавить на этот день</span></button>` : ''}`}
    </div>`;
}

function syncSettings() {
  $('tDaySwitch').setAttribute('aria-checked', dayOn());
  $('tDotsSwitch').setAttribute('aria-checked', dotsOn());
  const n = dayLimit();
  $('tLimitSeg').innerHTML = TASK_LIMITS.map(v => `<button type="button" role="radio" aria-checked="${v === n}" data-v="${v}">${v}</button>`).join('');
  const pos = dayPos();
  $('tPosSeg').innerHTML = TASK_POSITIONS.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === pos}" data-v="${v}">${l}</button>`).join('');
}
$('tPosSeg').onclick = e => {
  const v = e.target.closest('[data-v]')?.dataset.v;
  if (!v) return;
  setPref(TASKS_POS_STORE, v);
  render();
};
$('tDaySwitch').onclick = () => { setPref(TASKS_DAY_STORE, dayOn() ? '0' : '1'); render(); };
$('tDotsSwitch').onclick = () => { setPref(TASKS_DOTS_STORE, dotsOn() ? '0' : '1'); render(); };
$('tLimitSeg').onclick = e => {
  const v = e.target.closest('[data-v]')?.dataset.v;
  if (!v) return;
  setPref(TASKS_LIMIT_STORE, v);
  render();
};
