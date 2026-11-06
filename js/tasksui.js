import { $, addDays, esc, getPref, isIOS, isStandalone, isVivid, key, MONTHS, NS, parseKey, reducedMotion, setPref, todayKey, weekday } from './core.js?v=3.0';
import { IC } from './icons.js?v=3.0';
import { save, state } from './storage.js?v=3.0';
import { askConfirm, closeMenu, closeOverlay, openOverlay, toast } from './ui.js?v=3.0';
import { render, sparks, viewDate } from './render.js?v=3.0';
import { queueTips } from './tips.js?v=3.0';
import { pushState } from './push.js?v=3.0';
import { dayLong, dayMarks, dayShort, dayTasks, doneHeading, isOverdue, newTaskId, nextMonday, pendingToday, TASK_LIM, TASK_REMINDS, taskGroups, taskIcs, taskWhen, tomorrowOf } from './tasks.js?v=3.0';

export const TASKS_DAY_STORE = NS + '-tasks-day', TASKS_DOTS_STORE = NS + '-tasks-dots', TASKS_LIMIT_STORE = NS + '-tasks-limit', TASKS_FOLD_STORE = NS + '-tasks-fold';
export const TASK_LIMITS = [3, 5, 10];
export const SWIPE_W = 124, SWIPE_W3 = 180;
const DONE_STEP = 5;
const IC_CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_LIST = '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l.8.8L6.3 5M4 12l.8.8 1.5-1.8M4 18l.8.8 1.5-1.8"/></svg>';
const IC_MOVE = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M10 15h5M13 13l2 2-2 2"/></svg>';
const IC_WARN = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.1M12 3.5l9.5 17h-19z"/></svg>';
const IC_BACK = '<svg class="ic" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>';
const IC_FWD = '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
const IC_BELL = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 21h4"/></svg>';
const IC_CAL_ADD = '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5"/></svg>';
const IC_DOWN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';

const monthOf = k => { const d = parseKey(k); return new Date(d.getFullYear(), d.getMonth(), 1); };

export const tv = { tab: 'list', day: todayKey(), month: monthOf(todayKey()), doneOpen: false, doneShown: DONE_STEP, archOpen: false, archShown: DONE_STEP, dayOpen: null };
export const tasksOf = (s = state) => s.tasks || (s.tasks = []);
export const findTask = id => tasksOf().find(t => t.id === id);
export const dayOn = () => getPref(TASKS_DAY_STORE, '1') !== '0';
export const dotsOn = () => getPref(TASKS_DOTS_STORE, '1') !== '0';
export const dayFolded = () => getPref(TASKS_FOLD_STORE, '0') === '1';
export const dayLimit = () => { const n = +getPref(TASKS_LIMIT_STORE, '3'); return TASK_LIMITS.includes(n) ? n : 3; };

export function touchTasks() {
  save();
  render();
}

function metaHTML(t, mode, today) {
  if (t.archivedAt) return `<span class="t-meta"><span>Срок: ${esc(dayShort(t.date, today))}</span></span>`;
  const parts = [];
  if (!t.done && isOverdue(t, today)) parts.push(`<span class="warn">${esc(mode === 'list' ? dayShort(t.date, today) : `Просрочено · ${dayShort(t.date, today)}`)}</span>`);
  else if (mode === 'when' && t.date) parts.push(`<span>${esc(taskWhen(t.date, today))}${t.time ? `, ${t.time}` : ''}</span>`);
  else if (t.time && !t.done) parts.push(`<span>${t.time}</span>`);
  if (!t.done && t.remind != null) parts.push(`<span class="t-mbell" aria-label="Есть напоминание">${IC_BELL}</span>`);
  return parts.length ? `<span class="t-meta">${parts.join('')}</span>` : '';
}

function actsHTML(t, today) {
  const move = `<button type="button" data-act="move">${IC_MOVE}<span>Перенести</span></button>`, del = `<button type="button" data-act="del">${IC.trash}<span>Удалить</span></button>`;
  if (t.archivedAt) return `<button type="button" data-act="restore">${IC.reset}<span>Вернуть</span></button>${del}`;
  return isOverdue(t, today) ? `${move}<button type="button" data-act="arch">${IC.archive}<span>В архив</span></button>${del}` : move + del;
}

function rowHTML(t, mode, today) {
  return `<div class="t-row${t.done ? ' done' : ''}${isOverdue(t, today) ? ' t3' : ''}" data-id="${esc(t.id)}">
    <div class="t-acts">${actsHTML(t, today)}</div>
    <div class="t-fg">
      <button type="button" class="t-box" role="checkbox" aria-checked="${t.done}" aria-label="${esc(t.text)}">${IC_CHECK}</button>
      <button type="button" class="t-main"><span class="t-text">${esc(t.text)}${t.note ? `<span class="t-mnote" aria-label="Есть заметка">${IC.note}</span>` : ''}</span>${metaHTML(t, mode, today)}</button>
    </div>
  </div>`;
}

const groupHTML = (title, list, mode, today, extra = {}) => !list.length ? '' : `<section class="t-group${extra.cls ? ' ' + extra.cls : ''}">
    <h3 class="sec-h">${extra.icon || ''}<span>${title}</span>${extra.action || `<span class="cnt">${extra.count ?? list.length}</span>`}</h3>
    <div class="card t-list">${list.map(t => rowHTML(t, mode, today)).join('')}</div>
  </section>`;

function doneHTML(done, today) {
  if (!done.length) return '';
  const head = `<button type="button" class="t-done-head" data-act="done-toggle" aria-expanded="${tv.doneOpen}"><span>Выполненные</span><span class="cnt">${done.length}</span>${IC_DOWN}</button>`;
  if (!tv.doneOpen) return `<section class="t-group">${head}</section>`;
  const shown = done.slice(0, tv.doneShown), days = [...new Set(shown.map(t => t.doneAt))];
  const body = days.map(k => `<h4 class="t-done-day">${esc(doneHeading(k, today))}</h4><div class="card t-list">${shown.filter(t => t.doneAt === k).map(t => rowHTML(t, 'none', today)).join('')}</div>`).join('');
  const more = done.length > tv.doneShown ? `<button type="button" class="t-more-btn" data-act="done-more">Показать ещё ${done.length - tv.doneShown}</button>` : '';
  return `<section class="t-group open">${head}${body}${more}</section>`;
}

function archiveHTML(list, today) {
  if (!list.length) return '';
  const head = `<button type="button" class="t-done-head" data-act="arch-toggle" aria-expanded="${tv.archOpen}"><span>Архив</span><span class="cnt">${list.length}</span>${IC_DOWN}</button>`;
  if (!tv.archOpen) return `<section class="t-group">${head}</section>`;
  const more = list.length > tv.archShown ? `<button type="button" class="t-more-btn" data-act="arch-more">Показать ещё ${list.length - tv.archShown}</button>` : '';
  return `<section class="t-group open">${head}<div class="card t-list">${list.slice(0, tv.archShown).map(t => rowHTML(t, 'none', today)).join('')}</div>${more}</section>`;
}

function emptyHTML() {
  return `<div class="empty t-empty"><div class="t-empty-ic">${IC_LIST}</div><b>Здесь будут Ваши дела</b><p>Нажмите «+», запишите первое дело и выберите день, когда им заняться. Оно появится на экране этого дня.</p></div>`;
}

function renderList() {
  const today = todayKey(), all = tasksOf(), g = taskGroups(all, today);
  $('tItems').innerHTML = !all.length ? emptyHTML() : [
    groupHTML('Просрочено', g.overdue, 'list', today, { cls: 'late', icon: IC_WARN, action: '<span class="t-links"><button type="button" class="t-link" data-act="all-arch">В архив</button><button type="button" class="t-link" data-act="all-today">Всё на сегодня</button></span>' }),
    groupHTML('Сегодня', g.today, 'none', today, { count: g.today.filter(t => !t.done).length }),
    groupHTML('Предстоящие', g.upcoming, 'when', today),
    groupHTML('Без даты', g.nodate, 'none', today),
    doneHTML(g.done, today),
    archiveHTML(g.archived, today),
  ].join('');
}

const pad = n => String(n).padStart(2, '0');
const monthKey = (m, d) => `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(d)}`;

export function calHTML(month, sel, marks, today = todayKey()) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1), start = addDays(first, -weekday(first));
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i), k = key(d), m = marks[k], own = d.getMonth() === month.getMonth();
    const dots = m ? `<i class="t-dots">${m.n ? `<b class="${m.late && k < today ? 'late' : ''}"></b>` : ''}${m.n > 1 ? '<b></b>' : ''}${k === today && m.late ? '<b class="late"></b>' : ''}</i>` : '';
    return `<button type="button" class="t-d${own ? '' : ' out'}${k === today ? ' now' : ''}${k === sel ? ' pick' : ''}" data-k="${k}" aria-pressed="${k === sel}" aria-label="${esc(dayLong(k, today))}"><span>${d.getDate()}</span>${dots}</button>`;
  }).join('');
  const wd = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => `<small>${x}</small>`).join('');
  return `<div class="t-cal-head"><b>${MONTHS[month.getMonth()]} ${month.getFullYear()} г.</b><span><button type="button" class="ghost icon-btn" data-nav="-1" aria-label="Предыдущий месяц">${IC_BACK}</button><button type="button" class="ghost icon-btn" data-nav="1" aria-label="Следующий месяц">${IC_FWD}</button></span></div><div class="t-grid">${wd}${cells}</div>`;
}

function renderMonth() {
  const today = todayKey(), list = dayTasks(tasksOf(), tv.day, today);
  $('tCal').innerHTML = calHTML(tv.month, tv.day, dayMarks(tasksOf(), today), today);
  $('tMonthHead').innerHTML = `<span>${esc(tv.day === today ? `Сегодня, ${dayLong(tv.day, today)}` : dayLong(tv.day, today))}</span><span class="cnt">${list.length}</span>`;
  $('tMonthItems').innerHTML = list.map(t => rowHTML(t, t.date && t.date !== tv.day ? 'list' : 'none', today)).join('');
}

export function renderTasks() {
  for (const b of $('tTabs').querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.t === tv.tab);
  $('tListView').hidden = tv.tab !== 'list';
  $('tMonthView').hidden = tv.tab !== 'month';
  if (tv.tab === 'list') renderList(); else renderMonth();
}

export function openTasks() {
  tv.tab = 'list';
  tv.day = todayKey();
  tv.month = monthOf(tv.day);
  renderTasks();
  openOverlay($('tasksOv'));
  $('tSheet').scrollTop = 0;
  queueTips(700);
}
$('tasksBtn').onclick = () => openTasks();
$('tTabs').onclick = e => {
  const b = e.target.closest('button[data-t]');
  if (!b || b.dataset.t === tv.tab) return;
  tv.tab = b.dataset.t;
  renderTasks();
};
$('tCal').onclick = e => {
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

export function addTask(text, date, note = '') {
  text = text.trim().slice(0, TASK_LIM.text);
  if (!text) return null;
  const list = tasksOf();
  if (list.filter(t => !t.done && !t.archivedAt).length >= TASK_LIM.total) { toast(`Можно вести до ${TASK_LIM.total} задач`); return null; }
  const now = Date.now(), t = { id: newTaskId(), text, done: false, createdAt: now, updatedAt: now };
  if (date) t.date = date;
  if (note.trim()) t.note = note.slice(0, TASK_LIM.note);
  list.push(t);
  touchTasks();
  return t;
}
export function toggleTask(t, from) {
  const was = t.done;
  t.done = !was;
  if (t.done) { t.doneAt = todayKey(); delete t.archivedAt; } else delete t.doneAt;
  t.updatedAt = Date.now();
  if (t.done && from && !reducedMotion && isVivid()) sparks(from, 'var(--good)');
  touchTasks();
}
export function moveTask(t, date) {
  if (date) t.date = date; else { delete t.date; delete t.time; delete t.remind; }
  delete t.archivedAt;
  t.updatedAt = Date.now();
  touchTasks();
}
export function deleteTask(t) {
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
export function allToToday() {
  const today = todayKey(), now = Date.now(), moved = tasksOf().filter(t => isOverdue(t, today)).map(t => [t, t.date]);
  for (const [t] of moved) { t.date = today; t.updatedAt = now; }
  touchTasks();
  if (moved.length) toast('Перенесено на сегодня', () => {
    for (const [t, d] of moved) if (findTask(t.id)) { t.date = d; t.updatedAt = Date.now(); }
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
  if (!findTask(t.id)) return;
  delete t.archivedAt;
  t.updatedAt = Date.now();
  touchTasks();
}
export function archiveOverdue() {
  const today = todayKey(), now = Date.now(), moved = tasksOf().filter(t => isOverdue(t, today));
  for (const t of moved) { t.archivedAt = today; t.updatedAt = now; }
  touchTasks();
  if (moved.length) toast('Просроченные задачи в архиве', () => {
    for (const t of moved) if (findTask(t.id)) { delete t.archivedAt; t.updatedAt = Date.now(); }
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
    if (!fg || e.button !== 0 || e.target.closest('.t-box')) return;
    const row = fg.parentElement;
    const w = row.classList.contains('t3') ? SWIPE_W3 : SWIPE_W;
    s = { x: e.clientX, y: e.clientY, id: e.pointerId, fg, row, w, base: row.classList.contains('open') ? -w : 0, dx: 0, drag: false, t: e.timeStamp, px: e.clientX, v: 0 };
  });
  box.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
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
    const act = e.target.closest('[data-act]');
    if (act) return listAct(act);
    const row = e.target.closest('.t-row');
    if (!row) return;
    const t = findTask(row.dataset.id);
    if (!t) return;
    if (row.classList.contains('open') && !e.target.closest('.t-acts')) return closeRow();
    const box2 = e.target.closest('.t-box');
    if (box2) return toggleTask(t, box2);
    if (e.target.closest('.t-main')) openTaskForm(t);
  });
}

function foldDay() {
  const box = $('dayTasks'), from = box.offsetHeight;
  setPref(TASKS_FOLD_STORE, dayFolded() ? '0' : '1');
  renderDayTasks();
  if (reducedMotion) return;
  box.style.overflow = 'hidden';
  box.animate({ height: [from + 'px', box.offsetHeight + 'px'] }, { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' }).onfinish = () => { box.style.overflow = ''; };
  box.querySelectorAll('.t-row, .t-more, .t-addrow').forEach(el => el.animate({ opacity: [0, 1] }, { duration: 260, easing: 'ease-out' }));
}

function listAct(el) {
  const a = el.dataset.act, t = el.closest('.t-row') ? findTask(el.closest('.t-row').dataset.id) : null;
  if (a === 'done-toggle') { tv.doneOpen = !tv.doneOpen; tv.doneShown = DONE_STEP; return renderList(); }
  if (a === 'done-more') { tv.doneShown += DONE_STEP * 2; return renderList(); }
  if (a === 'arch-toggle') { tv.archOpen = !tv.archOpen; tv.archShown = DONE_STEP; return renderList(); }
  if (a === 'arch-more') { tv.archShown += DONE_STEP * 2; return renderList(); }
  if (a === 'all-today') return allToToday();
  if (a === 'all-arch') return archiveOverdue();
  if (a === 'arch' && t) { closeRow(); return archiveTask(t); }
  if (a === 'restore' && t) { closeRow(); return restoreTask(t); }
  if (a === 'add') return openTaskForm(null, el.dataset.k);
  if (a === 'day-fold') return foldDay();
  if (a === 'day-more') { tv.dayOpen = key(viewDate); return renderDayTasks(); }
  if (a === 'del' && t) { closeRow(); return deleteTask(t); }
  if (a === 'move' && t) { closeRow(); return pickDate(t.date || null, d => moveTask(t, d)); }
}
for (const id of ['tItems', 'tMonthItems', 'dayTasks']) bindList($(id));

const ds = { sel: null, month: monthOf(todayKey()), cb: null };
function renderPick() {
  const today = todayKey(), tom = tomorrowOf(today), mon = nextMonday(today);
  $('tdQuick').innerHTML = [['Сегодня', today], ['Завтра', tom], ['В понедельник', mon], ['Без даты', '']].map(([l, v]) => `<button type="button" class="t-chip" data-v="${v}" aria-pressed="${(ds.sel || '') === v}"><span>${l}</span></button>`).join('');
  $('tdCal').innerHTML = calHTML(ds.month, ds.sel, dayMarks(tasksOf(), today), today);
  $('tdOk').textContent = ds.sel ? `Выбрать: ${dayShort(ds.sel, today)}` : 'Выбрать: без даты';
}
export function pickDate(sel, cb) {
  closeMenu();
  ds.sel = sel || null;
  ds.month = monthOf(sel || todayKey());
  ds.cb = cb;
  renderPick();
  openOverlay($('tDateOv'));
}
$('tdQuick').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  ds.sel = b.dataset.v || null;
  if (ds.sel) ds.month = monthOf(ds.sel);
  renderPick();
};
$('tdCal').onclick = e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { ds.month = new Date(ds.month.getFullYear(), ds.month.getMonth() + +nav.dataset.nav, 1); return renderPick(); }
  const c = e.target.closest('[data-k]');
  if (!c) return;
  ds.sel = c.dataset.k;
  ds.month = monthOf(ds.sel);
  renderPick();
};
$('tdOk').onclick = () => {
  const cb = ds.cb;
  ds.cb = null;
  closeOverlay($('tDateOv'));
  cb?.(ds.sel);
};

const tf = { id: null, date: null, time: null, remind: null, base: '', arch: false, cal: false, calAt: null };
const tfSnap = () => JSON.stringify([$('tfText').value, $('tfNote').value, tf.date, tf.time, tf.remind]);
export function taskRemindHint(st = pushState()) {
  if (st === 'on' || st === 'off') return '';
  if (st === 'ios') return 'Напоминание придёт только в приложении, установленном на экран «Домой».';
  return 'Чтобы напоминание пришло, включите уведомления в Настройках.';
}
function paintTfDate() {
  $('tfDateVal').textContent = tf.date ? taskWhen(tf.date) : 'Без даты';
  $('tfTimeRow').hidden = !tf.date;
  $('tfRemRow').hidden = !tf.time;
  if (document.activeElement !== $('tfTime') || !tf.time) $('tfTime').value = tf.time || '';
  $('tfTimeClear').hidden = !tf.time;
  $('tfRem').innerHTML = TASK_REMINDS.map(([v, l]) => `<button type="button" class="t-chip" role="radio" data-v="${v ?? ''}" aria-pressed="${tf.remind === v}" aria-checked="${tf.remind === v}"><span>${l}</span></button>`).join('');
  $('tfRemHint').textContent = tf.time && tf.remind !== null ? taskRemindHint() : '';
  $('tfCalRow').hidden = !tf.date;
  $('tfCal').classList.toggle('done', !!tf.calAt);
  $('tfCal').innerHTML = tf.calAt ? `${IC_CHECK}<span>Файл открыт ${esc(dayShort(tf.calAt))}</span><small>Ещё раз</small>` : `${IC_CAL_ADD}<span>Добавить в календарь</span>`;
  $('tfCalNote').hidden = !tf.calAt;
}
export async function openTaskFile(t) {
  const name = `task-${t.date}.ics`, type = 'text/calendar;charset=utf-8', text = taskIcs(t);
  t.calAt = todayKey();
  t.updatedAt = Date.now();
  touchTasks();
  const file = new File([text], name, { type: 'text/calendar' });
  if (isStandalone() && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (err) { if (err.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  if (!isIOS) a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
export function openTaskForm(t = null, date = null) {
  closeMenu();
  tf.id = t?.id || null;
  tf.date = t ? t.date || null : date;
  tf.time = t?.time || null;
  tf.remind = t?.remind ?? null;
  tf.calAt = t?.calAt || null;
  $('tfTitle').textContent = t ? 'Задача' : 'Новая задача';
  $('tfSubmit').textContent = t ? 'Сохранить' : 'Добавить';
  $('tfDelete').hidden = !t;
  $('tfArchive').hidden = !t || !(t.archivedAt || isOverdue(t));
  $('tfArchive').textContent = t?.archivedAt ? 'Вернуть' : 'В архив';
  $('tfText').value = t?.text || '';
  $('tfNote').value = t?.note || '';
  $('tfText').removeAttribute('aria-invalid');
  paintTfDate();
  tf.base = tfSnap();
  openOverlay($('tFormOv'));
  if (!t) setTimeout(() => $('tfText').focus({ preventScroll: true }), 60);
}
$('tFormOv')._guard = () => tfSnap() === tf.base || askConfirm('Закрыть без сохранения?', tf.id ? 'Изменения в задаче не сохранятся.' : 'Новая задача не будет добавлена.', 'Закрыть');
$('tfText').addEventListener('input', () => $('tfText').removeAttribute('aria-invalid'));
$('tfDate').onclick = () => pickDate(tf.date, d => {
  tf.date = d;
  if (!d) { tf.time = null; tf.remind = null; }
  paintTfDate();
});
$('tfTime').addEventListener('input', e => {
  const v = e.target.value || null;
  if (v && !tf.time) tf.remind = 0;
  if (!v) tf.remind = null;
  tf.time = v;
  paintTfDate();
});
$('tfTimeClear').onclick = e => {
  e.preventDefault();
  tf.time = null;
  tf.remind = null;
  paintTfDate();
};
$('tfRem').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  tf.remind = b.dataset.v === '' ? null : +b.dataset.v;
  paintTfDate();
};
$('tfDelete').onclick = () => {
  const t = findTask(tf.id);
  tf.base = tfSnap();
  closeOverlay($('tFormOv'));
  if (t) deleteTask(t);
};
$('tfCal').onclick = () => {
  tf.cal = true;
  $('tForm').requestSubmit();
};
$('tfArchive').onclick = () => {
  tf.arch = true;
  $('tForm').requestSubmit();
};
$('tForm').onsubmit = e => {
  e.preventDefault();
  const arch = tf.arch, cal = tf.cal;
  tf.arch = false;
  tf.cal = false;
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
  if (tf.date) target.date = tf.date; else delete target.date;
  if (tf.date && tf.time) target.time = tf.time; else delete target.time;
  if (tf.date && tf.time && tf.remind !== null) target.remind = tf.remind; else delete target.remind;
  target.updatedAt = Date.now();
  touchTasks();
  if (arch && target.archivedAt) restoreTask(target);
  else if (arch && isOverdue(target)) archiveTask(target);
  if (cal && target.date) openTaskFile(target);
};

export function doneTaskFromPush(id) {
  const t = findTask(id);
  if (t && !t.done) toggleTask(t);
}

export function renderDayTasks() {
  const today = todayKey(), k = key(viewDate), box = $('dayTasks');
  syncSettings();
  const left = pendingToday(tasksOf(), today), badge = $('tasksBadge');
  badge.hidden = !left;
  badge.textContent = left > 9 ? '9+' : left;
  $('tasksBtn').setAttribute('aria-label', left ? `Задачи, на сегодня: ${left}` : 'Задачи');
  if ($('tasksOv')._shown) renderTasks();
  const list = dayOn() ? dayTasks(tasksOf(), k, today) : [];
  box.hidden = !list.length;
  closeRow();
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
}
$('tDaySwitch').onclick = () => { setPref(TASKS_DAY_STORE, dayOn() ? '0' : '1'); render(); };
$('tDotsSwitch').onclick = () => { setPref(TASKS_DOTS_STORE, dotsOn() ? '0' : '1'); render(); };
$('tLimitSeg').onclick = e => {
  const v = e.target.closest('[data-v]')?.dataset.v;
  if (!v) return;
  setPref(TASKS_LIMIT_STORE, v);
  render();
};
