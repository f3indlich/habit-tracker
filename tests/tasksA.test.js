window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };
const openForm = async t => { openTaskForm(t); await until(() => $('tFormOv')._shown); };
const closeForm = async () => { $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const group = cls => [...$('tItems').querySelectorAll('.t-group')].find(g => g.querySelector('.sec-h span')?.textContent === cls);
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];

{
  const big = Array.from({ length: 1000 }, (_, i) => A('b' + i, { date: i % 4 === 0 ? shift(-1 - i % 30) : i % 4 === 1 ? T : i % 4 === 2 ? shift(1 + i % 60) : undefined }));
  show({ habits: [], log: {}, tasks: big });
  await openPage();
  const rows = () => $('tItems').querySelectorAll('.t-row').length;
  ok('1000 tasks: only first portions are in the page', rows() === 80, rows());
  ok('each group shows 20 rows', ['Просрочено', 'Сегодня', 'Предстоящие', 'Без даты'].every(n => group(n).querySelectorAll('.t-row').length === 20));
  ok('headers show the full counts', group('Просрочено').querySelector('.cnt').textContent === '250' && group('Сегодня').querySelector('.cnt').textContent === '250' && group('Предстоящие').querySelector('.cnt').textContent === '250' && group('Без даты').querySelector('.cnt').textContent === '250');
  ok('show more button offers the next portion', group('Предстоящие').querySelector('[data-act=more]').textContent === 'Показать ещё 20');
  ok('tasks screen stays under 3000 elements', $('tasksOv').querySelectorAll('*').length < 3000, $('tasksOv').querySelectorAll('*').length);
  group('Предстоящие').querySelector('[data-act=more]').click();
  ok('show more adds a portion', group('Предстоящие').querySelectorAll('.t-row').length === 40 && group('Без даты').querySelectorAll('.t-row').length === 20);
  await closePage(); await openPage();
  ok('portions reset when the screen opens again', group('Предстоящие').querySelectorAll('.t-row').length === 20);
  $('tItems').querySelector('[data-act=all-today]').click();
  ok('all to today moves every overdue task, not only shown ones', state.tasks.filter(t => isOverdue(t, T)).length === 0 && state.tasks.filter(t => t.date === T).length === 500);
  $('toastUndo').click();
  ok('undo returns all 250', state.tasks.filter(t => isOverdue(t, T)).length === 250);
  $('tItems').querySelector('[data-act=all-arch]').click();
  ok('all to archive takes every overdue task', state.tasks.filter(t => t.archivedAt).length === 250 && !group('Просрочено'));
  $('toastUndo').click();
  const opens = [], checks = [];
  for (let i = 0; i < 5; i++) {
    await closePage();
    const t0 = performance.now(); openTasks(); $('tItems').getBoundingClientRect(); document.body.offsetHeight; opens.push(performance.now() - t0);
    await until(() => $('tasksOv')._shown);
  }
  for (let i = 0; i < 5; i++) {
    const b = $('tItems').querySelector('.t-row:not(.done) .t-box');
    const t0 = performance.now(); b.click(); document.body.offsetHeight; checks.push(performance.now() - t0);
  }
  window.__perfA = { open: med(opens), check: med(checks), dom: $('tasksOv').querySelectorAll('*').length };
  ok('opening the screen with 1000 tasks takes under 300 ms', med(opens) < 300, opens.map(Math.round));
  ok('checking a task with 1000 tasks takes under 150 ms', med(checks) < 150, checks.map(Math.round));
  await closePage();
}

{
  show({ habits: [{ id: 'h', name: 'Вода', icon: 'water', color: '#3b82f6', created: shift(-5) }], log: {}, tasks: [A('d', { date: T }), A('w', { date: shift(1) })] });
  const before = $('days').querySelector('.today');
  const t0 = performance.now(); toggleTask(findTask('d')); const dt = performance.now() - t0;
  ok('checking a task updates the badge and the home block without a full redraw', $('tasksBadge').hidden && $('dayTasks').querySelector('[data-id=d]').classList.contains('done') && $('days').querySelector('.today') === before, dt);
  ok('week dots follow the change', !$('days').querySelector('.today').classList.contains('has-tasks'));
  toggleTask(findTask('d'));
  ok('week dots come back', $('days').querySelector('.today').classList.contains('has-tasks'));
}

{
  const long = 'Очень длинное название задачи, которое точно не поместится в две строки на узком экране телефона и будет обрезано многоточием в конце';
  show({ habits: [{ id: 'h', name: 'Вода', icon: 'water', color: '#3b82f6', created: shift(-5) }], log: {}, tasks: [A('l', { date: T, text: long })] });
  const text = $('dayTasks').querySelector('.t-text'), cs = getComputedStyle(text);
  ok('home block clamps names to two lines', cs.webkitLineClamp === '2' && cs.overflow === 'hidden' && text.getBoundingClientRect().height <= parseFloat(cs.lineHeight) * 2 + 2, [cs.webkitLineClamp, text.getBoundingClientRect().height]);
  ok('full name stays in the page text', text.textContent === long);
  await openPage();
  const lt = $('tItems').querySelector('.t-text');
  ok('list keeps the full name', getComputedStyle(lt).webkitLineClamp !== '2' && lt.getBoundingClientRect().height > text.getBoundingClientRect().height);
  await closePage();

  ok('home block is above the habits by default', dayPos() === 'top' && !!($('dayTasks').compareDocumentPosition($('sections')) & Node.DOCUMENT_POSITION_FOLLOWING));
  const seg = $('tPosSeg');
  ok('setting offers above and below', [...seg.querySelectorAll('button')].map(b => b.textContent).join() === 'Над привычками,Под привычками' && seg.querySelector('[aria-checked=true]').dataset.v === 'top' && seg.getAttribute('role') === 'radiogroup');
  seg.querySelector('[data-v=bottom]').click();
  ok('block moves under the habits', getPref(TASKS_POS_STORE, '') === 'bottom' && !!($('sections').compareDocumentPosition($('dayTasks')) & Node.DOCUMENT_POSITION_FOLLOWING) && !$('dayTasks').hidden);
  render();
  ok('position survives a redraw', !!($('sections').compareDocumentPosition($('dayTasks')) & Node.DOCUMENT_POSITION_FOLLOWING) && $('tPosSeg').querySelector('[aria-checked=true]').dataset.v === 'bottom');
  $('tPosSeg').querySelector('[data-v=top]').click();
  ok('block goes back above', !!($('dayTasks').compareDocumentPosition($('sections')) & Node.DOCUMENT_POSITION_FOLLOWING));
  localStorage.removeItem(TASKS_POS_STORE);
}

{
  show({ habits: [], log: {}, tasks: [A('n', { date: T, note: 'Было' })] });
  const paste = text => { const dt = new DataTransfer(); dt.setData('text/plain', text); const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }); $('tfText').dispatchEvent(ev); return ev.defaultPrevented; };
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  ok('single line paste is left to the browser', !paste('Купить хлеб'));
  $('tfText').value = '';
  ok('several lines are split', paste('\n  Купить хлеб  \n\nмолоко\r\nяйца\n'));
  ok('first line becomes the name', $('tfText').value === 'Купить хлеб');
  ok('the rest goes to the note', $('tfNote').value === 'молоко\nяйца');
  ok('toast says where the rest went', $('toastText').textContent === 'Остальное перенесено в заметку' && $('toast').classList.contains('show'));
  await closeForm();
  await openForm(findTask('n'));
  $('tfText').value = ''; paste('Новое\nещё строка');
  ok('existing note gets the rest at the end', $('tfNote').value === 'Было\nещё строка');
  $('tfText').value = ''; paste('<img src=x onerror=alert(1)>\n<b>жирный</b>');
  ok('pasted markup stays text', !document.querySelector('#tFormOv img, #tFormOv b') && $('tfText').value === '<img src=x onerror=alert(1)>');
  await closeForm();
  ok('split helper skips empty lines', JSON.stringify(splitPaste('\n a \n\n b \n')) === JSON.stringify({ first: 'a', rest: ['b'] }));
}

{
  show({ habits: [], log: {}, tasks: [A('x', { date: shift(-1), done: true, doneAt: shift(-1) }), A('y', { date: T }), A('z', { date: shift(2), done: true, doneAt: T })] });
  await openPage();
  $('tTabs').querySelector('[data-t=month]').click();
  const cell = k => $('tCal').querySelector(`[data-k="${k}"]`);
  ok('day with finished tasks gets a grey dot', !!cell(shift(-1))?.querySelector('.t-dots b.done') || parseKey(shift(-1)).getMonth() !== parseKey(T).getMonth());
  ok('today has its colored dot and a grey one', !!cell(T).querySelector('.t-dots b:not(.done)') && !!cell(T).querySelector('.t-dots b.done'));
  ok('grey dot uses the faint color', getComputedStyle(cell(T).querySelector('.t-dots b.done')).backgroundColor !== getComputedStyle(cell(T).querySelector('.t-dots b:not(.done)')).backgroundColor);
  ok('day with only planned finished tasks has no grey dot', !cell(shift(2))?.querySelector('.t-dots b.done'));
  ok('week strip ignores finished tasks', !dayMarks(state.tasks, T)[shift(-1)]);
  await closePage();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: Array.from({ length: 30 }, (_, i) => A('x' + i, { text: x, date: T })) });
  await openPage();
  group('Сегодня').querySelector('[data-act=more]').click();
  ok('rows from show more are escaped', !document.querySelector('#tItems img, #dayTasks img') && $('tItems').querySelectorAll('.t-row').length === 30);
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
