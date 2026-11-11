window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
tv.lateOpen = true;
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const ids = l => l.map(t => t.id).join();
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };
const openForm = async t => { openTaskForm(t); await until(() => $('tFormOv')._shown); };
const closeForm = async () => { $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden); };
const pressed = box => [...box.querySelectorAll('[aria-pressed=true]')].map(b => b.textContent).join();
const pick = async (btn, v) => { btn.click(); await until(() => $('tPickOv')._shown); $('tpList').querySelector(`[data-v="${v}"]`).click(); await until(() => $('tPickOv').hidden); };
const opts = () => [...$('tpList').querySelectorAll('.tf-lbl')].map(x => x.textContent).join();
const optOn = () => $('tpList').querySelector('[aria-checked=true] .tf-lbl')?.textContent;

{
  const n = normTasks([A('a', { due: shift(5), dueRemind: 1 }), A('b', { due: '2026-02-30', dueRemind: 1 }), A('c', { dueRemind: 0 }), A('d', { due: shift(2), dueRemind: 2 }), A('e', { due: shift(2), dueRemind: 3 })], T);
  ok('due and its reminder are kept when valid', n[0].due === shift(5) && n[0].dueRemind === 1);
  ok('impossible due date is dropped with its reminder', !('due' in n[1]) && !('dueRemind' in n[1]));
  ok('due reminder needs a due date', !('dueRemind' in n[2]));
  ok('only 0, 1 and 3 days are allowed', !('dueRemind' in n[3]) && n[4].dueRemind === 3);
  ok('effective day is the date, else the due', effDay(A('x', { date: shift(3), due: shift(1) })) === shift(3) && effDay(A('y', { due: shift(1) })) === shift(1) && effDay(A('z')) === null);
  ok('overdue by date', isOverdue(A('x', { date: shift(-1) }), T));
  ok('overdue by due even with a later date', isOverdue(A('x', { date: shift(4), due: shift(-1) }), T) && overdueText(A('x', { date: shift(4), due: shift(-1) }), T) === 'срок ' + dayShort(shift(-1), T));
  ok('reason by date', overdueText(A('x', { date: shift(-2), due: shift(-1) }), T) === dayShort(shift(-2), T));
  ok('due today is not overdue', !isOverdue(A('x', { due: T }), T));
  ok('soon window is 2 days', DUE_SOON_DAYS === 2 && dueSoon(A('x', { due: shift(2) }), T) && !dueSoon(A('x', { due: shift(3) }), T) && dueSoon(A('x', { due: T }), T));
  ok('finished and archived are never soon', !dueSoon(A('x', { due: T, done: true, doneAt: T }), T) && !dueSoon(A('x', { due: T, archivedAt: T }), T));
  const L = (n2) => dueLabel(A('x', { due: shift(n2) }), T);
  ok('labels', L(0).text === 'Срок сегодня' && L(1).text === 'Срок завтра' && L(2).text === 'Срок послезавтра' && L(3).text === 'Срок через 3 дня' && L(5).text === 'Срок через 5 дней' && L(20).text === 'Срок ' + dayShort(shift(20), T), [L(3).text, L(20).text]);
  ok('label colors', L(0).tone === 'late' && L(-1).tone === 'late' && L(1).tone === 'soon' && L(3).tone === 'soon' && L(4).tone === '');
  const list = [A('d1', { due: shift(1) }), A('d2', { date: shift(5), due: shift(2) }), A('d3', { due: shift(6) }), A('nd'), A('late', { date: shift(3), due: shift(-1) }), A('t', { date: T })];
  const g = taskGroups(list, T);
  ok('task with only a due is not in no date', ids(g.nodate) === 'nd');
  ok('due soon goes to today, once', ids(g.today) === 't,d1,d2' && !g.upcoming.some(t => t.id === 'd1' || t.id === 'd2'), ids(g.today));
  ok('later due sits in upcoming by its due', ids(g.upcoming) === 'd3');
  ok('overdue by due is in overdue', ids(g.overdue) === 'late');
  ok('badge counts due soon and overdue', pendingToday(list, T) === 4);
  const m = dayMarks(list, T);
  ok('calendar: dot on the effective day and a ring on the due day', m[shift(6)].n === 1 && m[shift(6)].due && m[shift(5)].n === 1 && m[shift(2)].due && !m[shift(2)].n);
  ok('future day list includes tasks due that day once', ids(dayTasks(list, shift(2), T)) === 'd2' && ids(dayTasks([A('w', { date: shift(2), due: shift(2) })], shift(2), T)) === 'w');
  ok('deadline constants', DUE_REMIND_HOUR === 9 && DUE_REMINDS.map(x => x[0]).join() === ',0,1,3');
}

{
  show({ habits: [{ id: 'h', name: 'Вода', icon: 'water', color: '#3b82f6', created: shift(-5) }], log: {}, tasks: [A('s', { due: shift(1) }), A('f', { date: shift(9), due: shift(12) }), A('o', { date: shift(4), due: shift(-2) }), A('w', { date: T })] });
  const home = $('dayTasks');
  ok('home block shows due soon with a flag label', !!home.querySelector('.t-row[data-id=s] .t-due.soon') && home.querySelector('.t-row[data-id=s] .t-due').textContent === 'Срок завтра');
  ok('home block shows the due reason for overdue', home.querySelector('.t-row[data-id=o] .warn').textContent === 'Просрочено · срок ' + dayShort(shift(-2), T));
  ok('badge counts due soon', $('tasksBadge').textContent === '3');
  await openPage();
  const row = id => $('tItems').querySelector(`.t-row[data-id="${id}"]`);
  ok('far due is grey', !!row('f').querySelector('.t-due') && !row('f').querySelector('.t-due').classList.contains('soon') && !row('f').querySelector('.t-due').classList.contains('late') && row('f').querySelector('.t-due').textContent === 'Срок ' + dayShort(shift(12), T));
  ok('soon due is orange, today and past are red', getComputedStyle(row('s').querySelector('.t-due')).color !== getComputedStyle(row('f').querySelector('.t-due')).color);
  ok('overdue group says why', row('o').querySelector('.warn').textContent === 'Срок ' + dayShort(shift(-2), T));
  $('tTabs').querySelector('[data-t=month]').click();
  const cell = k => $('tCal').querySelector(`[data-k="${k}"]`);
  if (parseKey(shift(12)).getMonth() === parseKey(T).getMonth()) ok('month shows a ring on the due day', !!cell(shift(12)).querySelector('.t-dots b.t-ring'));
  tv.day = shift(12); tv.month = new Date(parseKey(shift(12)).getFullYear(), parseKey(shift(12)).getMonth(), 1); renderTasks();
  ok('day of due lists the task marked as due', $('tMonthItems').querySelectorAll('.t-row').length === 1 && $('tMonthItems').querySelector('.t-row[data-id=f] .t-due').textContent === 'Срок');
  $('tMonthItems').querySelector('.t-row[data-id=f] .t-box').click();
  ok('check works from the due day row', findTask('f').done);
  toggleTask(findTask('f'));
  $('tTabs').querySelector('[data-t=list]').click();
  await closePage();
}

{
  show({ habits: [], log: {}, tasks: [A('e', { date: shift(5) })] });
  await openForm(findTask('e'));
  ok('date row is called When', $('tfDate').querySelector('.tf-lbl').textContent === 'Когда');
  ok('due row shows Not set without a box', $('tfDueVal').textContent === 'Не задан' && !visible($('tfDueClear')) && !visible($('tfDueRemBtn')));
  ok('due controls have labels and size', $('tfDueClear').getAttribute('aria-label') === 'Сбросить срок' && $('tfDue').getBoundingClientRect().height >= 44);
  $('tfDue').click(); await until(() => $('tDateOv')._shown);
  ok('due sheet has its quick choices', $('tdTitle').textContent === 'Срок' && [...$('tdQuick').querySelectorAll('.tf-lbl')].map(b => b.textContent).join() === 'Сегодня,Завтра,Через неделю,Конец месяца,Без срока');
  $('tdQuick').querySelector(`[data-v="${shift(1)}"]`).click(); await until(() => $('tDateOv').hidden);
  ok('picked due is shown with reset', $('tfDueVal').textContent.startsWith('Завтра') && visible($('tfDueClear')) && visible($('tfDueRemBtn')));
  ok('due earlier than when shows a hint', visible($('tfDueLate')) && $('tfDueLate').textContent === 'Срок раньше даты: задача сразу окажется просроченной.');
  $('tfDueRemBtn').click(); await until(() => $('tPickOv')._shown);
  ok('reminder options', opts() === 'Нет,В день срока,За день,За 3 дня' && optOn() === 'Нет' && $('tpTitle').textContent === 'Напомнить о сроке');
  $('tpList').querySelector('[data-v="1"]').click(); await until(() => $('tPickOv').hidden);
  ok('reminder choice shows the 09:00 hint', $('tfDueRemVal').textContent === 'За день' && $('tfDueHint').textContent === 'Напоминание придёт в 09:00.');
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('due and reminder are saved', findTask('e').due === shift(1) && findTask('e').dueRemind === 1);
  await openForm(findTask('e'));
  ok('due comes back', $('tfDueVal').textContent.startsWith('Завтра') && $('tfDueRemVal').textContent === 'За день');
  $('tfDueClear').click();
  ok('reset brings Not set back and hides the reminder', $('tfDueVal').textContent === 'Не задан' && !visible($('tfDueRemBtn')) && !visible($('tfDueLate')));
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('reset removes due and reminder', !('due' in findTask('e')) && !('dueRemind' in findTask('e')));
  $('tfDate').click(); await until(() => $('tDateOv')._shown);
  ok('when sheet keeps its own title', $('tdTitle').textContent === 'Когда сделать' && !!$('tdQuick').querySelector('[data-v=""]'));
  closeOverlay($('tDateOv')); await until(() => $('tDateOv').hidden);
}

{
  show({ habits: [], log: {}, tasks: [] });
  await openPage();
  $('tqText').value = 'сдать отчёт до пятницы'; $('tqText').dispatchEvent(new Event('input', { bubbles: true }));
  const r = parseQuick('сдать отчёт до пятницы');
  ok('quick chip shows the due', $('tqChipText').textContent === 'Срок: ' + dueWhen(r.due), $('tqChipText').textContent);
  $('tQuick').requestSubmit();
  ok('quick add with due only has no when', state.tasks.at(-1).due === r.due && !('date' in state.tasks.at(-1)) && state.tasks.at(-1).text === 'сдать отчёт');
  await closePage();
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  $('tfText').value = 'оплатить счёт дедлайн завтра'; $('tfText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('form chip offers the due', $('tfParseText').textContent === 'Срок: завтра');
  $('tfParseOk').click();
  ok('apply sets the due', $('tfDueVal').textContent.startsWith('Завтра') && $('tfText').value === 'оплатить счёт');
  await closeForm();
}

{
  const src = await (await fetch((window.__serverSrc || 'supabase/functions/send-reminders/index.ts') + '?x=' + Date.now())).text();
  const S = new parent.Function(src.replace(/^import .*$/mg, '').replace(/if \(typeof Deno[\s\S]*$/, '') + '\nreturn { taskDueReminders, duePayload };')();
  const K = (id, x = {}) => ({ id, text: 'Дело ' + id, due: '2026-10-20', dueRemind: 0, done: false, ...x });
  const at = (iso, tasks, tz = 'UTC') => S.taskDueReminders({ tasks }, tz, new Date(iso)).map(r => r.id).join();
  ok('due reminder at 09:00 on the due day', at('2026-10-20T09:00:00Z', [K('a')]) === 'a' && at('2026-10-20T09:29:00Z', [K('a')]) === 'a');
  ok('not before 09:00 or after the window', at('2026-10-20T08:59:00Z', [K('a')]) === '' && at('2026-10-20T09:30:00Z', [K('a')]) === '');
  ok('one and three days before', at('2026-10-19T09:05:00Z', [K('a', { dueRemind: 1 })]) === 'a' && at('2026-10-17T09:05:00Z', [K('a', { dueRemind: 3 })]) === 'a' && at('2026-10-20T09:05:00Z', [K('a', { dueRemind: 3 })]) === '');
  ok('time zone is used', at('2026-10-20T06:10:00Z', [K('a')], 'Europe/Moscow') === 'a');
  ok('finished, archived and bad values are skipped', at('2026-10-20T09:05:00Z', [K('a', { done: true }), K('b', { archivedAt: '2026-10-19' }), K('c', { dueRemind: 2 }), K('d', { due: 'x' }), K('e', { dueRemind: undefined })]) === '');
  const r1 = S.taskDueReminders({ tasks: [K('a')] }, 'UTC', new Date('2026-10-20T09:05:00Z'));
  ok('dedup key', r1[0].key === 'task-due:a#2026-10-20#0');
  ok('text on the due day', S.duePayload(r1).title === 'Срок задачи: Дело a' && S.duePayload(r1).ids.join() === 'task:a');
  const r3 = S.taskDueReminders({ tasks: [K('a', { dueRemind: 3 })] }, 'UTC', new Date('2026-10-17T09:05:00Z'));
  const r2 = S.taskDueReminders({ tasks: [K('a', { dueRemind: 1 })] }, 'UTC', new Date('2026-10-19T09:05:00Z'));
  ok('text before the due', S.duePayload(r3).title === 'Срок через 3 дня: Дело a' && S.duePayload(r2).title === 'Срок через 1 день: Дело a');
  const p = S.duePayload(S.taskDueReminders({ tasks: [K('a', { private: true, text: 'ZZZ_SECRET' })] }, 'UTC', new Date('2026-10-20T09:05:00Z')));
  ok('private due is neutral', p.title === 'Трекер привычек' && !p.ids.length && !JSON.stringify(p).includes('ZZZ'));
  const mix = S.duePayload(S.taskDueReminders({ tasks: [K('a', { private: true, text: 'ZZZ_SECRET' }), K('b'), K('c')] }, 'UTC', new Date('2026-10-20T09:05:00Z')));
  ok('several due reminders count only regular ones', mix.title === 'Сроки задач: 2' && !JSON.stringify(mix).includes('ZZZ'));
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, due: shift(1) }), A('y', { text: x, date: shift(3), due: shift(-1) })] });
  await openPage();
  ok('rows with due are escaped', !document.querySelector('#tItems img, #dayTasks img'));
  await openForm(findTask('x'));
  ok('form with due is escaped', !document.querySelector('#tFormOv img'));
  await closeForm();
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
