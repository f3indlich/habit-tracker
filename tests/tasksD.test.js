window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const SECRET = 'ZZZ_TASK_SECRET', NOTE = 'ZZZ_TASK_NOTE', SUB = 'ZZZ_TASK_SUB';
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const P = (id, extra = {}) => A(id, { text: SECRET + id, note: NOTE, subs: [{ id: 's', text: SUB, done: false }], private: true, ...extra });
const leaks = () => {
  const out = [], hit = s => [SECRET, NOTE, SUB].some(x => String(s).includes(x));
  if (hit(document.body.textContent)) out.push('text');
  if (hit(document.body.innerHTML)) out.push('html');
  if (hit(document.title)) out.push('title');
  for (const el of document.querySelectorAll('[aria-label], [title]')) if (hit(el.getAttribute('aria-label') || '') || hit(el.title || '')) out.push('attr');
  for (const el of document.querySelectorAll('input, textarea')) if (hit(el.value)) out.push('value');
  return out;
};
const data = () => ({ habits: [{ id: 'h', name: 'Вода', icon: 'water', color: '#3b82f6', created: shift(-9) }], log: {}, tasks: [
  A('a', { date: T }), P('p1', { date: T }), P('p2', { date: shift(-2) }), P('p3', { date: shift(2) }), P('p4'), P('p5', { date: T, done: true, doneAt: T }), P('p6', { date: shift(-3), done: true, doneAt: shift(-3) }), P('p7', { date: shift(3), archivedAt: T }),
] });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const reset = () => { lockNow(); localStorage.removeItem(LOCK_STORE); };
const cell = (box, k) => box.querySelector(`[data-k="${k}"]`);

reset();
{
  ok('private flag survives normalize only as true', normTasks([A('x', { private: true }), A('y', { private: 'да' })], T).map(t => t.private === true).join() === 'true,false' && !('private' in normTasks([A('y', { private: 1 })], T)[0]));
  ok('locked: shown tasks skip private ones', shownTasks(data().tasks).every(t => !t.private) && shownTasks(data().tasks).length === 1);
  show(data());
  ok('home block: no private tasks', $('dayTasks').querySelectorAll('.t-row').length === 1 && !$('dayTasks').textContent.includes(SECRET));
  ok('home block counter counts only regular tasks', $('dayTasks').querySelector('.cnt').textContent === '1');
  ok('badge counts only regular tasks', $('tasksBadge').textContent === '1' && $('tasksBtn').getAttribute('aria-label') === 'Задачи, на сегодня: 1');
  const todayDay = [...$('days').children].find(b => b.classList.contains('today'));
  ok('week strip has no late mark from private overdue', !todayDay.classList.contains('late-tasks'));
  const future = [...$('days').children].find(b => b._k === shift(2));
  if (future) ok('week strip has no dot for a private future task', !future.classList.contains('has-tasks'));
  openTasks(); await until(() => $('tasksOv')._shown);
  ok('list has no private groups or rows', !$('tItems').querySelector('.t-group.late') && ![...$('tItems').querySelectorAll('.sec-h span')].some(s => ['Предстоящие', 'Без даты'].includes(s.textContent)) && $('tItems').querySelectorAll('.t-row').length === 1);
  ok('no finished or archive groups made of private tasks', !$('tItems').querySelector('[data-act=done-toggle]') && !$('tItems').querySelector('[data-act=arch-toggle]'));
  ok('group counters ignore private tasks', [...$('tItems').querySelectorAll('.cnt')].map(c => c.textContent).join() === '1');
  $('tTabs').querySelector('[data-t=month]').click();
  ok('month has no dots for private days', !cell($('tCal'), shift(2))?.querySelector('.t-dots') && !cell($('tCal'), shift(-3))?.querySelector('.t-dots b.done') && !cell($('tCal'), T).querySelector('.t-dots b.late, .t-dots b.done'));
  tv.day = shift(2); renderTasks();
  ok('month day list hides private tasks', !$('tMonthItems').querySelector('.t-row') && $('tMonthHead').querySelector('.cnt').textContent === '0');
  $('tTabs').querySelector('[data-t=list]').click();
  ok('locked page leaks nothing', !leaks().length, leaks());
  $('tItems').querySelector('[data-act=all-today]')?.click();
  ok('mass actions do not touch hidden tasks', findTask('p2').date === shift(-2));
  ok('date sheet hides private dots', (() => { pickDate(T, () => {}); const ok2 = !cell($('tdCal'), shift(2))?.querySelector('.t-dots'); closeOverlay($('tDateOv')); return ok2; })());
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  ok('locked form has no private switch', !$('tfPriv') && $('tfPrivSlot').hidden !== true && !$('tfPrivSlot').children.length);
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  ok('title does not change', document.title === 'Трекер привычек' || !document.title.includes(SECRET));
}

{
  unlocked = true; render();
  ok('unlocked: home shows private tasks with a lock', $('dayTasks').querySelectorAll('.t-row').length >= 3 && !!$('dayTasks').querySelector('.t-row[data-id=p1] .t-lock[aria-label="Личная"]'));
  ok('unlocked: badge counts them', $('tasksBadge').textContent === '3');
  openTasks(); await until(() => $('tasksOv')._shown);
  ok('unlocked: list shows all groups', !!$('tItems').querySelector('.t-group.late') && !!$('tItems').querySelector('[data-act=done-toggle]') && !!$('tItems').querySelector('[data-act=arch-toggle]'));
  ok('regular task has no lock', !$('tItems').querySelector('.t-row[data-id=a] .t-lock'));
  openTaskForm(findTask('a')); await until(() => $('tFormOv')._shown);
  ok('unlocked form offers the private switch', !!$('tfPriv') && $('tfPriv').getAttribute('aria-checked') === 'false' && $('tfPrivSlot').textContent.includes('Личная'));
  $('tfPrivSlot').querySelector('.tf-priv').click();
  ok('switch turns on', $('tfPriv').getAttribute('aria-checked') === 'true');
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('task becomes private', findTask('a').private === true);
  openTaskForm(findTask('p1')); await until(() => $('tFormOv')._shown);
  ok('private task opens with the switch on', $('tfPriv').getAttribute('aria-checked') === 'true' && $('tfText').value === SECRET + 'p1');
  lockNow();
  ok('locking closes the private task form and clears it', $('tFormOv').hidden && !$('tfText').value && !$('tfNote').value && !$('tfSubs').querySelector('input'));
  ok('locking hides everything again', !leaks().length && $('tasksBadge').hidden, leaks());
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  unlocked = true; render();
  openTaskForm(findTask('a')); await until(() => $('tFormOv')._shown);
  $('tfPrivSlot').querySelector('.tf-priv').click();
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('switch off makes it regular again', !('private' in findTask('a')));
  lockNow();
  deleteTask(findTask('a'));
  ok('toasts do not name tasks', $('toastText').textContent === 'Задача удалена');
  ok('no leaks after toasts', !leaks().length);
}

{
  const src = await (await fetch((window.__serverSrc || 'supabase/functions/send-reminders/index.ts') + '?x=' + Date.now())).text();
  const S = new parent.Function(src.replace(/^import .*$/mg, '').replace(/if \(typeof Deno[\s\S]*$/, '') + '\nreturn { taskReminders, taskPayload };')();
  const K = (id, x = {}) => ({ id, text: 'Дело ' + id, date: '2026-10-17', time: '14:30', remind: 0, done: false, ...x });
  const at = (tasks) => S.taskReminders({ tasks }, 'UTC', new Date('2026-10-17T14:30:00Z'));
  const one = S.taskPayload(at([K('p', { private: true, text: SECRET })]));
  ok('private task push is neutral', one.title === 'Трекер привычек' && one.body === 'Пора заглянуть в приложение' && one.tag === 'task-private' && !one.ids.length && !JSON.stringify(one).includes(SECRET), one);
  const mixed = S.taskPayload(at([K('p', { private: true, text: SECRET }), K('a')]));
  ok('mixed push shows only the regular task with its done button', mixed.title === 'Дело a' && mixed.ids.join() === 'task:a' && !JSON.stringify(mixed).includes(SECRET), mixed);
  const mixed2 = S.taskPayload(at([K('p', { private: true, text: SECRET }), K('a'), K('b')]));
  ok('count uses only regular tasks', mixed2.title === 'Задачи: 2' && mixed2.body === 'Дело a, Дело b' && !JSON.stringify(mixed2).includes(SECRET), mixed2);
  const keys = at([K('p', { private: true }), K('a')]).map(r => r.key);
  ok('dedup keys keep their shape', keys.join() === 'task:p#2026-10-17#14:30#0,task:a#2026-10-17#14:30#0');
}

{
  const x = '<img src=x onerror=alert(1)>';
  unlocked = true;
  show({ habits: [], log: {}, tasks: [A('x', { text: x, date: T, private: true })] });
  openTasks(); await until(() => $('tasksOv')._shown);
  ok('private rows are escaped', !document.querySelector('#tItems img, #dayTasks img') && !!$('tItems').querySelector('.t-lock'));
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  reset();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
