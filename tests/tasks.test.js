window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };
const habit = { id: 'h', name: 'Вода', icon: 'water', color: '#3b82f6', created: shift(-30) };
const texts = el => [...el.querySelectorAll('.t-text')].map(x => x.textContent);

{
  const n = normTasks([
    A('a', { date: T }), A('a', { text: 'Дубль' }), { id: 'b', text: '   ' }, 'мусор', null,
    A('c', { date: 'завтра', note: 'x'.repeat(2000), text: 'y'.repeat(500) }),
    A('d', { done: true }), A('e', { done: true, doneAt: shift(-TASK_LIM.doneDays - 1) }), A('f', { done: 'да', doneAt: T }),
  ], T);
  ok('normalize drops junk and keeps valid', n.length === 5 && n[0].id === 'a' && n[1].text === 'Дубль' && n[1].id !== 'a', n);
  ok('normalize limits text and note, drops bad date', n[2].text.length === TASK_LIM.text && n[2].note.length === TASK_LIM.note && !('date' in n[2]), n[2]);
  ok('done without date of completion gets today', n[3].done && n[3].doneAt === T);
  ok('old finished tasks are cleaned up', !n.some(t => t.id === 'e'));
  ok('only true counts as done', n[4].done === false && !('doneAt' in n[4]));
  const many = Array.from({ length: TASK_LIM.total + 5 }, (_, i) => A('m' + i, i < 3 ? { done: true, doneAt: T } : {}));
  const cut = normTasks(many, T);
  ok('total limit keeps active tasks first', cut.length === TASK_LIM.total && cut.every(t => !t.done), cut.length);
  const tm = normTasks([A('t1', { date: T, time: '14:30', remind: 15 }), A('t2', { time: '14:30', remind: 15 }), A('t3', { date: T, time: '99:99', remind: 15 }), A('t4', { date: T, time: '09:00', remind: 43201 }), A('t5', { date: T, remind: 0 })], T);
  ok('time and reminder are kept when valid', tm[0].time === '14:30' && tm[0].remind === 15);
  ok('time needs a date', !('time' in tm[1]) && !('remind' in tm[1]));
  ok('bad time is dropped with its reminder', !('time' in tm[2]) && !('remind' in tm[2]));
  ok('unknown reminder is dropped, time stays', tm[3].time === '09:00' && !('remind' in tm[3]));
  ok('reminder needs a time', !('remind' in tm[4]));
  ok('reminder at the time itself survives', normTasks([A('z', { date: T, time: '10:00', remind: 0 })], T)[0].remind === 0);
  ok('state without tasks gets an empty list', Array.isArray(normalize({ habits: [], log: {} }).tasks));
}

{
  const list = [A('o2', { date: shift(-1) }), A('o1', { date: shift(-5) }), A('t', { date: T }), A('u2', { date: shift(9) }), A('u1', { date: shift(1) }), A('n'),
    A('dt', { date: shift(-2), done: true, doneAt: T }), A('dy', { done: true, doneAt: shift(-1) })];
  const g = taskGroups(list, T);
  ok('overdue sorted from the oldest', g.overdue.map(t => t.id).join() === 'o1,o2');
  ok('today has active tasks and finished today', g.today.map(t => t.id).join() === 't,dt');
  ok('upcoming sorted by date', g.upcoming.map(t => t.id).join() === 'u1,u2');
  ok('no date group', g.nodate.map(t => t.id).join() === 'n');
  ok('finished sorted from the newest', g.done.map(t => t.id).join() === 'dt,dy');
  ok('day today: overdue, then today, then finished', dayTasks(list, T, T).map(t => t.id).join() === 'o1,o2,t,dt');
  ok('future day: only its active tasks', dayTasks(list, shift(1), T).map(t => t.id).join() === 'u1');
  ok('past day: its tasks and finished that day', dayTasks(list, shift(-1), T).map(t => t.id).join() === 'o2,dy');
  ok('overdue is not shown on another past day', !dayTasks(list, shift(-3), T).length);
  const timed = [A('n1', { date: T }), A('t2', { date: T, time: '18:00' }), A('t1', { date: T, time: '09:00' })];
  ok('tasks with time go first, by time', dayTasks(timed, T, T).map(t => t.id).join() === 't1,t2,n1');
  const m = dayMarks(list, T);
  ok('marks count active tasks by date', m[T].n === 1 && m[shift(1)].n === 1 && !m[shift(1)].late && m[shift(-1)].late && !m[shift(-2)]);
  ok('today is marked late when something is overdue', m[T].late === true);
  ok('badge counts today and overdue', pendingToday(list, T) === 3);
  ok('dates read naturally', taskWhen(T, T) === 'Сегодня' && taskWhen(shift(1), T).startsWith('Завтра, '));
  const mon = parseKey(nextMonday(T));
  ok('next Monday is ahead and a Monday', weekday(mon) === 0 && key(mon) > T && key(mon) <= shift(7));
}

{
  const b = [A('k'), A('del'), A('both')], l = [{ ...A('k', { text: 'Локально', updatedAt: 5 }) }, A('both', { done: true, doneAt: T, updatedAt: 5 }), A('new-l')];
  const r = [{ ...A('k', { date: T, updatedAt: 3 }) }, A('del'), A('both', { text: 'С сервера', updatedAt: 9 }), A('new-r')];
  const m = mergeTasks(b, l, r), by = id => m.find(t => t.id === id);
  ok('merge keeps tasks added on both devices', !!by('new-l') && !!by('new-r'));
  ok('merge keeps deletion', !by('del'));
  ok('merge joins fields changed on different devices', by('k').text === 'Локально' && by('k').date === T, by('k'));
  ok('merge joins done and text', by('both').done === true && by('both').text === 'С сервера', by('both'));
  const edited = mergeTasks([A('x')], [A('x', { text: 'Изменено', updatedAt: 7 })], []);
  ok('edit beats deletion on another device', edited.length === 1);
  const st = mergeStates({ habits: [], log: {}, tasks: [] }, { habits: [], log: {}, tasks: [A('l')] }, { habits: [], log: {}, tasks: [A('r')] });
  ok('state merge includes tasks', st.tasks.length === 2);
  const local = { tasks: [A('mine')] }, oldRemote = normalize({ habits: [], log: {} });
  ok('remote from an old app version keeps local tasks', keepTasksFromOldApp({ habits: [], log: {} }, oldRemote, local).tasks[0].id === 'mine');
  ok('remote from a new version is taken as is', keepTasksFromOldApp({ habits: [], log: {}, tasks: [] }, oldRemote, local).tasks.length === 0);
  const wiped = normalize(mergeStates({ habits: [], log: {}, tasks: local.tasks }, { habits: [], log: {}, tasks: local.tasks }, keepTasksFromOldApp({ habits: [], log: {} }, oldRemote, local)));
  ok('old app version cannot erase tasks', wiped.tasks.length === 1, wiped.tasks);
}

{
  show({ habits: [habit], log: {}, tasks: [] });
  ok('no block on the day screen without tasks', $('dayTasks').hidden && $('tasksBadge').hidden);
  $('tasksBtn').click(); await wait(450);
  ok('button opens the section', $('tasksOv')._shown && !$('tListView').hidden && $('tMonthView').hidden);
  ok('empty section invites to add', $('tItems').textContent.includes('Здесь будут Ваши дела'));
  ok('section has no separate add field', !$('tAddText') && !$('tAdd') && $('fab').getAttribute('aria-label') === 'Новая задача');
  const add = async (text, v) => {
    $('fab').click(); await wait(420);
    if (v !== undefined) { $('tfDate').click(); await wait(420); $('tdQuick').querySelector(`[data-v="${v}"]`).click(); $('tdOk').click(); await wait(420); }
    $('tfText').value = text; $('tfSubmit').click(); await wait(420);
  };
  $('fab').click(); await wait(420);
  ok('plus opens the task card for today', $('tFormOv')._shown && $('tfTitle').textContent === 'Новая задача' && $('tfDateVal').textContent === 'Сегодня');
  $('tfSubmit').click(); await wait(30);
  ok('empty text adds nothing', !state.tasks.length && $('tFormOv')._shown);
  closeOverlay($('tFormOv')); await wait(420);
  await add('Позвонить маме');
  ok('task is added for today by default', state.tasks.length === 1 && state.tasks[0].text === 'Позвонить маме' && state.tasks[0].date === T);
  await add('Забрать посылку', shift(1));
  ok('tomorrow in the date sheet works', state.tasks[1].date === shift(1));
  await add('Разобрать балкон', '');
  ok('no date works', !('date' in state.tasks[2]));
  ok('groups are rendered', [...$('tItems').querySelectorAll('.sec-h span:first-of-type')].map(x => x.textContent).join() === 'Сегодня,Предстоящие,Без даты', $('tItems').textContent);
  ok('list saved to storage', JSON.parse(localStorage.getItem(STORE)).tasks.length === 3);

  const row = () => $('tItems').querySelector('.t-row');
  row().querySelector('.t-box').click(); await wait(30);
  ok('check marks the task done', state.tasks[0].done && state.tasks[0].doneAt === T && row().classList.contains('done') && row().querySelector('.t-box').getAttribute('aria-checked') === 'true');
  row().querySelector('.t-box').click(); await wait(30);
  ok('second check returns it', !state.tasks[0].done && !('doneAt' in state.tasks[0]));
  ok('marking tasks does not touch the habit ring', dayProgress(new Date()).total === 1 && dayProgress(new Date()).done === 0);

  row().querySelector('.t-main').click(); await wait(420);
  ok('text opens the task card', $('tFormOv')._shown && $('tfText').value === 'Позвонить маме' && !$('tfDelete').hidden && $('tfTitle').textContent === 'Задача');
  $('tfText').value = 'Позвонить маме вечером'; $('tfNote').value = 'Про отпуск';
  $('tfDate').click(); await wait(420);
  ok('date button opens date sheet above the card', $('tDateOv')._shown && shownOverlays().pop() === $('tDateOv') && $('tdOk').textContent.startsWith('Выбрать: '));
  ok('calendar has 42 days and marks the current date', $('tdCal').querySelectorAll('.t-d').length === 42 && $('tdCal').querySelector('.t-d.pick').dataset.k === T);
  const h0 = $('tdCal').offsetHeight;
  $('tdCal').querySelector('[data-nav="1"]').click(); await wait(20);
  ok('month switch keeps the sheet height', $('tdCal').offsetHeight === h0, [h0, $('tdCal').offsetHeight]);
  $('tdQuick').querySelector(`[data-v="${shift(1)}"]`).click(); await wait(20);
  ok('quick date selects and updates the button', $('tdCal').querySelector('.t-d.pick')?.dataset.k === shift(1) && $('tdOk').textContent.includes(dayShort(shift(1), T)));
  $('tdOk').click(); await wait(420);
  ok('date comes back to the card', $('tfDateVal').textContent.startsWith('Завтра'));
  $('tForm').requestSubmit(); await wait(420);
  const t0 = state.tasks[0];
  ok('card saves all fields', t0.text === 'Позвонить маме вечером' && t0.note === 'Про отпуск' && t0.date === shift(1) && !$('tFormOv')._shown, t0);
  ok('note is marked in the list', !!$('tItems').querySelector('.t-mnote'));

  const rowOf = id => $('tItems').querySelector(`.t-row[data-id="${id}"]`);
  rowOf(t0.id).querySelector('.t-main').click(); await wait(420);
  $('tfText').value = ''; $('tForm').requestSubmit(); await wait(30);
  ok('card does not save empty text', $('tFormOv')._shown && $('tfText').getAttribute('aria-invalid') === 'true' && t0.text.length > 0);
  $('tfText').value = t0.text; await wait(10);
  closeOverlay($('tFormOv')); await wait(420);

  rowOf(t0.id).querySelector('.t-main').click(); await wait(420);
  ok('time and reminder rows show for a task with date', !$('tfTimeRow').hidden && $('tfRemRow').hidden);
  $('tfTime').value = '14:30'; $('tfTime').dispatchEvent(new Event('input', { bubbles: true })); await wait(20);
  const remOn = () => $('tfRem').querySelector('[aria-pressed=true]').dataset.v;
  ok('setting a time turns the reminder on at that time', !$('tfRemRow').hidden && remOn() === '0' && !$('tfTimeClear').hidden, remOn());
  $('tfRem').querySelector('[data-v="60"]').click(); await wait(20);
  ok('reminder choice is shown', remOn() === '60');
  $('tForm').requestSubmit(); await wait(420);
  ok('card saves time and reminder', findTask(t0.id).time === '14:30' && findTask(t0.id).remind === 60, findTask(t0.id));
  ok('list shows the time and a bell', rowOf(t0.id).querySelector('.t-meta').textContent.includes('14:30') && !!rowOf(t0.id).querySelector('.t-mbell'), rowOf(t0.id).querySelector('.t-meta').textContent);
  rowOf(t0.id).querySelector('.t-main').click(); await wait(420);
  ok('card restores time and reminder', $('tfTime').value === '14:30' && remOn() === '60');
  $('tfRem').querySelector('[data-v=""]').click(); await wait(20);
  ok('reminder can be turned off', remOn() === '' && $('tfRemHint').textContent === '');
  $('tfRem').querySelector('[data-v="0"]').click(); await wait(20);
  ok('hint explains when notifications are off', $('tfRemHint').textContent.length > 0 === (taskRemindHint() !== ''));
  ok('hint text by state', taskRemindHint('on') === '' && taskRemindHint('off') === '' && taskRemindHint('ios').includes('Домой') && taskRemindHint('denied').includes('Настройках'));
  $('tfTimeClear').click(); await wait(20);
  ok('clearing the time removes the reminder', $('tfRemRow').hidden && $('tfTime').value === '');
  $('tfTime').value = '14:30'; $('tfTime').dispatchEvent(new Event('input', { bubbles: true })); await wait(20);
  $('tfDate').click(); await wait(420);
  $('tdQuick').querySelector('[data-v=""]').click(); await wait(20);
  $('tdOk').click(); await wait(420);
  ok('removing the date removes time and reminder', $('tfTimeRow').hidden && $('tfRemRow').hidden);
  $('tfDate').click(); await wait(420);
  $('tdQuick').querySelector(`[data-v="${shift(1)}"]`).click(); $('tdOk').click(); await wait(420);
  $('tfTime').value = '14:30'; $('tfTime').dispatchEvent(new Event('input', { bubbles: true })); await wait(20);
  $('tfRem').querySelector('[data-v="60"]').click();
  $('tForm').requestSubmit(); await wait(420);
  openTaskForm(findTask(t0.id)); await wait(420);
  $('tfDate').click(); await wait(420);
  $('tdQuick').querySelector(`[data-v="${T}"]`).click(); $('tdOk').click(); await wait(420);
  $('tForm').requestSubmit(); await wait(420);
  ok('new date in the card keeps time and reminder', findTask(t0.id).date === T && findTask(t0.id).time === '14:30' && findTask(t0.id).remind === 60, findTask(t0.id));
  findTask(t0.id).date = shift(1); touchTasks();
  const pushed = addTask('Из уведомления', T);
  markDoneFromPush('task:' + pushed.id); await wait(20);
  ok('done button in a notification marks the task', findTask(pushed.id).done && findTask(pushed.id).doneAt === T);
  markDoneFromPush('task:' + pushed.id); await wait(20);
  ok('second press does not undo it', findTask(pushed.id).done);
  markDoneFromPush('task:нет-такой'); await wait(20);
  deleteTask(findTask(pushed.id)); await wait(20);

  const r1 = rowOf(t0.id), fg = r1.querySelector('.t-fg'), bx = fg.getBoundingClientRect();
  const fire = (type, x, y = bx.top + 10) => fg.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 7, clientX: x, clientY: y }));
  fire('pointerdown', bx.right - 20); fire('pointermove', bx.right - 90); fire('pointermove', bx.right - 180); fire('pointerup', bx.right - 180); await wait(350);
  ok('swipe left opens the actions', r1.classList.contains('open') && Math.round(fg.getBoundingClientRect().left - r1.getBoundingClientRect().left) === -SWIPE_W, fg.getBoundingClientRect().left);
  ok('swipe does not open the card', !$('tFormOv')._shown);
  const before = state.tasks.length;
  r1.querySelector('[data-act=del]').click(); await wait(30);
  ok('delete removes the task', state.tasks.length === before - 1 && !findTask(t0.id));
  $('toastUndo').click(); await wait(30);
  ok('undo returns the deleted task', !!findTask(t0.id) && state.tasks.length === before && findTask(t0.id).note === 'Про отпуск');

  state.tasks.push(A('late1', { date: shift(-3) }), A('late2', { date: shift(-1) })); touchTasks(); await wait(20);
  ok('overdue group is first', $('tItems').querySelector('.t-group').classList.contains('late') && texts($('tItems').querySelector('.t-group')).length === 2);
  $('tItems').querySelector('[data-act=all-today]').click(); await wait(30);
  ok('all overdue moved to today', findTask('late1').date === T && findTask('late2').date === T && !$('tItems').querySelector('.t-group.late'));
  $('toastUndo').click(); await wait(30);
  ok('moving overdue can be undone', findTask('late1').date === shift(-3) && findTask('late2').date === shift(-1));

  for (let i = 0; i < 8; i++) state.tasks.push(A('dn' + i, { done: true, doneAt: shift(-i) }));
  touchTasks(); await wait(20);
  ok('finished group is folded', !!$('tItems').querySelector('.t-done-head') && !$('tItems').querySelector('.t-done-day'));
  ok('done today stays only in today', $('tItems').querySelectorAll('[data-id=dn0]').length === 1 && $('tItems').querySelector('.t-done-head .cnt').textContent === '7');
  $('tItems').querySelector('.t-done-head').click(); await wait(20);
  ok('finished group opens by days', $('tItems').querySelectorAll('.t-done-day').length === 5 && $('tItems').querySelector('.t-more-btn').textContent === 'Показать ещё 2', $('tItems').querySelectorAll('.t-done-day').length);
  $('tItems').querySelector('.t-more-btn').click(); await wait(20);
  ok('show more reveals the rest', $('tItems').querySelectorAll('.t-done-day').length === 7 && !$('tItems').querySelector('.t-more-btn'));
  $('tItems').querySelector('.t-done-head').click(); await wait(20);

  $('tTabs').querySelector('[data-t=month]').click(); await wait(30);
  ok('month tab shows the calendar', !$('tMonthView').hidden && $('tListView').hidden && $('tCal').querySelectorAll('.t-d').length === 42 && !!$('tCal').querySelector('.t-d.now.pick'));
  ok('days with tasks have dots', !!$('tCal').querySelector(`[data-k="${shift(1)}"] .t-dots b`) && !!$('tCal').querySelector(`[data-k="${T}"] .t-dots b.late`));
  $('tCal').querySelector(`[data-k="${shift(1)}"]`).click(); await wait(30);
  ok('picking a day shows its tasks', texts($('tMonthItems')).includes(t0.text) && $('tMonthHead').textContent.includes(dayLong(shift(1), T)));
  $('fab').click(); await wait(420);
  ok('add on a day opens a new task with that date', $('tFormOv')._shown && $('tfTitle').textContent === 'Новая задача' && $('tfDelete').hidden && $('tfDateVal').textContent.startsWith('Завтра'));
  $('tfText').value = 'Из календаря'; $('tForm').requestSubmit(); await wait(420);
  ok('task from the calendar is saved', state.tasks.at(-1).text === 'Из календаря' && state.tasks.at(-1).date === shift(1) && texts($('tMonthItems')).includes('Из календаря'));
  closeOverlay($('tasksOv')); await wait(420);
}

{
  show({ habits: [habit], log: {}, tasks: [A('l', { date: shift(-2) }), A('a', { date: T }), A('b', { date: T }), A('c', { date: T }), A('d', { date: T, done: true, doneAt: T }), A('f', { date: shift(1) })] });
  await wait(30);
  const box = $('dayTasks');
  ok('day block shows up to the limit', !box.hidden && box.querySelectorAll('.t-row').length === 3 && texts(box)[0] === 'Дело l', texts(box));
  ok('overdue is marked on the day', box.querySelector('.t-meta .warn').textContent.startsWith('Просрочено · '));
  ok('counter shows done of all', box.querySelector('.cnt').textContent === '1 из 5', box.querySelector('.cnt').textContent);
  ok('badge counts what is left', $('tasksBadge').textContent === '4' && !$('tasksBadge').hidden);
  ok('more button shows the rest', box.querySelector('.t-more').textContent === 'Ещё 2');
  box.querySelector('.t-more').click(); await wait(20);
  ok('more opens all of them', box.querySelectorAll('.t-row').length === 5 && !box.querySelector('.t-more'));
  ok('block goes before the habits', box.compareDocumentPosition($('sections')) & Node.DOCUMENT_POSITION_FOLLOWING);
  const today = () => [...$('days').children].find(b => b.classList.contains('today'));
  const tomorrow = [...$('days').children][weekday(new Date()) + 1];
  ok('week strip marks days with tasks', today().classList.contains('has-tasks') && today().classList.contains('late-tasks'));
  if (tomorrow) ok('tomorrow in the strip is open and marked', !tomorrow.disabled && tomorrow.classList.contains('has-tasks'));
  ok('tasks do not change the ring', dayProgress(new Date()).total === 1);
  box.querySelector('.t-row[data-id=a] .t-box').click(); await wait(30);
  ok('check works from the day screen', findTask('a').done && $('tasksBadge').textContent === '3');
  box.querySelector('.t-row[data-id=b] .t-main').click(); await wait(420);
  ok('card opens from the day screen', $('tFormOv')._shown && $('tfText').value === 'Дело b');
  closeOverlay($('tFormOv')); await wait(420);

  $('tDaySwitch').click(); await wait(20);
  ok('setting hides the block', box.hidden && getPref(TASKS_DAY_STORE, '') === '0' && $('tDaySwitch').getAttribute('aria-checked') === 'false');
  $('tDaySwitch').click(); await wait(20);
  ok('setting returns the block', !box.hidden);
  $('tDotsSwitch').click(); await wait(20);
  ok('setting hides the dots', !today().classList.contains('has-tasks'));
  $('tDotsSwitch').click(); await wait(20);
  tv.dayOpen = null;
  $('tLimitSeg').querySelector('[data-v="5"]').click(); await wait(20);
  ok('limit setting works', box.querySelectorAll('.t-row').length === 5 && $('tLimitSeg').querySelector('[aria-checked=true]').dataset.v === '5');
  setPref(TASKS_LIMIT_STORE, '3'); render();
}

{
  const fut = addDays(new Date(), 8), fk = key(fut);
  show({ habits: [habit], log: {}, tasks: [A('z', { date: fk })] });
  $('next').click(); await wait(450);
  ok('next week can be opened', key(viewDate) > T && !$('todayBtn').hidden, key(viewDate));
  viewDate = fut; render(); await wait(30);
  const card = document.querySelector('.habit[data-id=h]'), box = $('dayTasks');
  ok('future day shows its tasks', texts(box).join() === 'Дело z' && !!box.querySelector('[data-act=add]'));
  ok('future hero speaks about the day ahead', $('heroMsg').textContent === 'День ещё впереди');
  ok('habit check is off on future days', card.querySelector('.check').disabled && card.classList.contains('future'));
  ok('future day hides habits behind a note', !$('futureNote').hidden && $('sections').hidden && !card.offsetParent);
  ok('note says when habits can be marked and how many are planned', $('fnTitle').textContent === 'Время привычек ещё не пришло' && $('fnText').textContent.includes('Запланировано: 1.'));
  ok('hero has no percent on a future day', $('heroPct').textContent === '—' && getComputedStyle(document.querySelector('.hero-n')).display === 'none');
  ok('tasks stay visible on a future day', !box.hidden && !!box.offsetParent);
  $('fnToggle').click(); await wait(20);
  ok('link shows the habits', !$('sections').hidden && !!card.offsetParent && $('fnToggle').textContent === 'Скрыть привычки');
  viewDate = addDays(fut, 1); render(); await wait(20);
  ok('next future day starts hidden again', $('sections').hidden && $('fnToggle').textContent === 'Показать привычки');
  setReorder(true); await wait(20);
  ok('reorder mode shows the habits', !$('sections').hidden);
  setReorder(false); await wait(20);
  ok('after reorder the note is back', $('sections').hidden);
  viewDate = fut; render(); await wait(20);
  changeCount(findHabit('h'), fut, 1); await wait(20);
  ok('habits cannot be marked in the future', !state.log[fk]);
  $('todayBtn').click(); await wait(450);
  ok('today button returns from the future', key(viewDate) === T && !document.querySelector('.habit[data-id=h]').classList.contains('future'));
  ok('today has no note and a percent', $('futureNote').hidden && !$('sections').hidden && $('heroPct').textContent.endsWith('%') && getComputedStyle(document.querySelector('.hero-n')).display !== 'none');
  ok('habit check works again today', !document.querySelector('.habit[data-id=h] .check').disabled);
}

{
  const big = Array.from({ length: 40 }, (_, i) => A('w' + i, { date: T, text: 'Очень длинный текст задачи без пробелов'.repeat(3) }));
  show({ habits: [], log: {}, tasks: big });
  $('tasksBtn').click(); await wait(420);
  const sheet = $('tSheet');
  ok('long texts do not widen the page', sheet.scrollWidth <= sheet.clientWidth + 1 && $('tItems').scrollWidth <= $('tItems').clientWidth + 1, [sheet.scrollWidth, sheet.clientWidth]);
  closeOverlay($('tasksOv')); await wait(420);
  show({ habits: [], log: {}, tasks: [A('s', { text: '<img src=x onerror=alert(1)>', date: T })] });
  ok('text is escaped', !$('dayTasks').querySelector('img') && texts($('dayTasks'))[0].startsWith('<img'));
  show({ habits: [], log: {} });
}
{
  const list = () => [A('o1', { date: shift(-5), time: '09:00', remind: 15 }), A('o2', { date: shift(-2) }), A('a1', { date: shift(-7), archivedAt: shift(-1) }), A('a2', { date: shift(-9), archivedAt: T }), A('t', { date: T }), A('n')];
  const g = taskGroups(list(), T);
  ok('archived tasks are not in overdue or other groups', g.overdue.map(t => t.id).join() === 'o1,o2' && g.today.map(t => t.id).join() === 't' && g.nodate.map(t => t.id).join() === 'n' && !g.done.length);
  ok('archive is sorted from the newest', g.archived.map(t => t.id).join() === 'a2,a1');
  ok('archived task is not overdue', !isOverdue(list()[2], T) && isOverdue(list()[0], T));
  ok('archived task leaves the badge', pendingToday(list(), T) === 3);
  ok('archived task leaves the marks', !dayMarks(list(), T)[shift(-7)] && !!dayMarks(list(), T)[shift(-5)]);
  ok('archived task leaves its past day and today', !dayTasks(list(), shift(-7), T).length && !dayTasks(list(), T, T).some(t => t.archivedAt));
  const n = normTasks([A('k', { date: shift(-3), archivedAt: T }), A('fut', { date: shift(3), archivedAt: T }), A('nod', { archivedAt: T }), A('d', { date: shift(-3), archivedAt: T, done: true, doneAt: T }), A('bad', { date: shift(-3), archivedAt: 'вчера' })], T);
  ok('archive mark survives normalize', n[0].archivedAt === T);
  ok('archive mark is kept for any open task', n.find(t => t.id === 'fut').archivedAt === T && n.find(t => t.id === 'nod').archivedAt === T, n);
  ok('archive mark needs an open task and a valid date', ['d', 'bad'].every(id => !('archivedAt' in n.find(t => t.id === id))), n);
  ok('old archived tasks are kept', normTasks([A('old', { date: shift(-900), archivedAt: shift(-800) })], T).length === 1);
  const many = [...Array.from({ length: TASK_LIM.total }, (_, i) => A('m' + i)), A('z', { date: shift(-3), archivedAt: T })];
  ok('total limit drops the archive before active tasks', normTasks(many, T).every(t => !t.archivedAt));
  const merged = mergeTasks([A('m', { date: shift(-3) })], [A('m', { date: shift(-3), archivedAt: T, updatedAt: 5 })], [A('m', { date: shift(-3) })]);
  ok('archive mark syncs between devices', merged[0].archivedAt === T, merged);

  show({ habits: [habit], log: {}, tasks: list() });
  await wait(20);
  openTasks(); await wait(30);
  const box = $('tItems'), head = box.querySelector('.t-done-head[data-act=arch-toggle]');
  ok('archive is folded with its count', head && head.getAttribute('aria-expanded') === 'false' && head.querySelector('.cnt').textContent === '2' && !box.querySelector('.t-row[data-id=a1]'));
  head.click(); await wait(20);
  const ra = box.querySelector('.t-row[data-id=a1]');
  ok('archived row has return and delete', ra && !!ra.querySelector('[data-act=restore]') && !!ra.querySelector('[data-act=del]') && !ra.querySelector('[data-act=move]'));
  ok('archived row shows the old date as When', ra.querySelector('.t-meta').textContent === 'Когда: ' + dayShort(shift(-7), T));
  const ro = box.querySelector('.t-row[data-id=o1]');
  ok('overdue row has archive and delete', [...ro.querySelectorAll('.t-acts button')].map(b => b.dataset.act).join() === 'arch,del');
  ok('two actions fit their width', Math.round(ro.getBoundingClientRect().right - ro.querySelector('.t-acts button').getBoundingClientRect().left) <= SWIPE_W);
  ok('every action has a visible icon', [...ro.querySelectorAll('.t-acts button')].every(b => getComputedStyle(b.querySelector('svg')).display !== 'none'));
  ok('current rows can be archived too', [...box.querySelectorAll('.t-row[data-id=t] .t-acts button')].map(b => b.dataset.act).join() === 'arch,del');
  ro.querySelector('[data-act=arch]').click(); await wait(20);
  const o1 = findTask('o1');
  ok('swipe action archives with today', o1.archivedAt === T && !box.querySelector('.t-group.late .t-row[data-id=o1]'));
  $('toastUndo').click(); await wait(20);
  ok('undo returns the task', !('archivedAt' in findTask('o1')) && !!box.querySelector('.t-group.late .t-row[data-id=o1]'));
  box.querySelector('[data-act=all-arch]').click(); await wait(20);
  ok('all overdue go to the archive', ['o1', 'o2'].every(id => findTask(id).archivedAt === T) && !box.querySelector('.t-group.late'));
  ok('all to archive leaves the rest', !('archivedAt' in findTask('t')) && !('archivedAt' in findTask('n')));
  $('toastUndo').click(); await wait(20);
  ok('undo returns all of them', !('archivedAt' in findTask('o1')) && !('archivedAt' in findTask('o2')) && findTask('a1').archivedAt === shift(-1));
  box.querySelector('.t-row[data-id=a1] [data-act=restore]').click(); await wait(20);
  ok('return puts it back in overdue', !('archivedAt' in findTask('a1')) && !!box.querySelector('.t-group.late .t-row[data-id=a1]'));
  box.querySelector('.t-row[data-id=a2] .t-box').click(); await wait(20);
  ok('finishing an archived task moves it to finished', findTask('a2').done && !('archivedAt' in findTask('a2')));

  findTask('a1').archivedAt = T; render(); await wait(20);
  openTaskForm(findTask('t'));
  ok('form offers archive for a current task', !$('tfArchive').hidden && $('tfArchive').textContent === 'В архив');
  closeOverlay($('tFormOv')); await wait(420);
  openTaskForm(findTask('o2'));
  ok('form offers archive for an overdue task', !$('tfArchive').hidden && $('tfArchive').textContent === 'В архив');
  $('tfText').value = 'Новый текст';
  $('tfArchive').click(); await wait(420);
  ok('archive from the form keeps the edit', findTask('o2').archivedAt === T && findTask('o2').text === 'Новый текст');
  openTaskForm(findTask('o2'));
  ok('form offers return for an archived task', !$('tfArchive').hidden && $('tfArchive').textContent === 'Вернуть');
  $('tfArchive').click(); await wait(420);
  ok('return from the form works', !('archivedAt' in findTask('o2')));
  openTaskForm(findTask('a1'));
  $('tfDate').click(); await wait(420);
  [...$('tdQuick').querySelectorAll('button')].find(b => b.textContent === 'Завтра').click();
  $('tdOk').click(); await wait(420);
  $('tfSubmit').click(); await wait(420);
  ok('new date in the form takes the task out of the archive', !('archivedAt' in findTask('a1')) && findTask('a1').date === shift(1));
  closeOverlay($('tasksOv')); await wait(420);
  show({ habits: [], log: {} });
}

{
  show({ habits: [habit], log: {}, tasks: [A('f1', { date: T }), A('f2', { date: T }), A('f3', { date: T, done: true, doneAt: T })] });
  localStorage.removeItem(TASKS_FOLD_STORE); renderDayTasks();
  const box = $('dayTasks'), head = () => box.querySelector('[data-act=day-fold]');
  ok('block starts open with its count', head().getAttribute('aria-expanded') === 'true' && box.querySelectorAll('.t-row').length === 3 && head().textContent.includes('Задачи') && head().querySelector('.cnt').textContent === '1 из 3');
  head().click(); await wait(20);
  ok('tap folds to a heading with the count', head().getAttribute('aria-expanded') === 'false' && !box.querySelector('.t-row') && head().querySelector('.cnt').textContent === '1 из 3');
  render(); await wait(20);
  ok('fold survives a redraw', !box.querySelector('.t-row'));
  ok('fold is remembered', getPref(TASKS_FOLD_STORE, '0') === '1');
  ok('folded block keeps the badge', $('tasksBadge').textContent === '2');
  head().click(); await wait(20);
  ok('second tap opens the block', box.querySelectorAll('.t-row').length === 3);
  localStorage.removeItem(TASKS_FOLD_STORE);
}

{
  show({ habits: [habit], log: {}, tasks: [], goals: [{ id: 'g1', title: 'Цель', start: T, due: shift(30), status: 'active' }] });
  shownOverlays().forEach(closeOverlay); await wait(420);
  const cur = () => document.body.dataset.tab, mark = () => $('tabbar').querySelector('[aria-current=page]')?.dataset.tab;
  const fabOn = () => getComputedStyle($('fab')).pointerEvents !== 'none';
  ok('home is the first tab', cur() === 'today' && mark() === 'today' && $('fab').getAttribute('aria-label') === 'Новая привычка');
  const hist0 = history.length;
  $('tasksBtn').click(); await wait(300);
  ok('tab opens its section', $('tasksOv')._shown && cur() === 'tasks' && mark() === 'tasks');
  ok('section does not cover the bar', $('tabbar').getBoundingClientRect().bottom <= innerHeight && document.elementFromPoint(innerWidth / 2, $('tabbar').getBoundingClientRect().top + 20)?.closest('#tabbar'));
  $('goalsBtn').click(); await wait(300);
  ok('next tab replaces the section', $('goalsOv')._shown && !$('tasksOv')._shown && shownOverlays().length === 1 && mark() === 'goals' && fabOn());
  ok('switching tabs does not grow the history', history.length <= hist0 + 1, [hist0, history.length]);
  $('fab').click(); await wait(420);
  ok('plus opens a new goal', $('gFormOv')._shown && document.body.classList.contains('tabs-off') && getComputedStyle($('tabbar')).opacity !== '1');
  closeOverlay($('gFormOv')); await wait(420);
  ok('bar returns after the sheet', !document.body.classList.contains('tabs-off') && mark() === 'goals');
  openGoal('g1'); await wait(100);
  ok('no plus inside a goal', !fabOn() && !$('gBack').hidden && getComputedStyle($('gBack')).display !== 'none');
  $('setBtn').click(); await wait(300);
  ok('settings is a tab with plus', $('setOv')._shown && !$('goalsOv')._shown && mark() === 'settings' && fabOn());
  ok('highlight stays inside the bar', getComputedStyle($('tabLens').parentElement).overflow === 'hidden');
  ok('account row matches the card', getComputedStyle(document.querySelector('.set-card .set-user')).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(document.querySelector('.set-card .set-user')).borderRadius === '0px');
  $('fab').click(); await wait(420);
  ok('plus on settings opens a new habit over home', $('formOv')._shown && !$('setOv')._shown);
  closeOverlay($('formOv')); await wait(420);
  ok('closing it lands on home', !shownOverlays().length && cur() === 'today' && mark() === 'today');
  $('setBtn').click(); await wait(300);
  $('todayTab').click(); await wait(420);
  ok('today tab closes the section', !shownOverlays().length && cur() === 'today' && fabOn());
  $('fab').click(); await wait(420);
  ok('plus on home opens a new habit', $('formOv')._shown);
  closeOverlay($('formOv')); await wait(420);
  $('viewBtn').click(); await wait(420);
  ok('other pages hide the bar', document.body.classList.contains('tabs-off'));
  closeOverlay($('viewOv')); await wait(420);
  ok('top keeps only view and sync', !document.querySelector('.top-actions #setBtn, .top-actions #tasksBtn, .top-actions #goalsBtn, .top-actions #fab') && !!document.querySelector('.top-actions #viewBtn') && !!document.querySelector('.top-actions #acctBtn'));
  show({ habits: [], log: {} });
}
ok('old calendar mark is dropped', normTasks([A('m', { calAt: T })], T).every(t => !('calAt' in t)));
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
