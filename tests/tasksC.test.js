window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const S = (id, text, done = false) => ({ id, text, done });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const paste = (el, text) => { const dt = new DataTransfer(); dt.setData('text/plain', text); const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev.defaultPrevented; };
const ins = () => [...$('tfSubs').querySelectorAll('.t-sin')];
const setSub = (i, v) => { ins()[i].value = v; ins()[i].dispatchEvent(new Event('input', { bubbles: true })); };

{
  const n = normTasks([A('a', { subs: [S('s1', '  Купить краску  '), S('s1', 'Дубль', true), { id: 'x', text: '   ' }, 'мусор', null, S('', 'Без номера'), S('s3', 'y'.repeat(300), 'да')] }), A('b', { subs: 'не список' })], T);
  const a = n[0];
  ok('subtasks are cleaned', a.subs.length === 4 && a.subs[0].text === 'Купить краску' && a.subs[1].text === 'Дубль' && a.subs[1].id !== 's1', a.subs);
  ok('subtask text is limited and done is strict', a.subs[3].text.length === TASK_LIM.sub && a.subs[3].done === false && a.subs[1].done === true);
  ok('subtask ids are unique', new Set(a.subs.map(s => s.id)).size === a.subs.length && a.subs.every(s => s.id));
  ok('bad subtask list is dropped', !('subs' in n[1]));
  const many = normTasks([A('m', { subs: Array.from({ length: 40 }, (_, i) => S('m' + i, 'шаг ' + i)) })], T)[0];
  ok('no more than 30 subtasks in a task', many.subs.length === TASK_LIM.subs && many.subs.at(-1).text === 'шаг 29');
  const lots = Array.from({ length: 110 }, (_, i) => A('t' + i, { subs: Array.from({ length: 30 }, (_, j) => S('s' + j, 'шаг')) }));
  const cut = normTasks(lots, T), total = cut.reduce((s, t) => s + (t.subs?.length || 0), 0);
  ok('no more than 3000 subtasks in all, cut from the end', total === TASK_LIM.subsTotal && cut[0].subs.length === 30 && !cut.at(-1).subs, [total, cut.at(-1).subs?.length]);
  ok('old tasks without subtasks still open', normTasks([A('o')], T)[0].subs === undefined);
  ok('progress counts', JSON.stringify(subStats({ subs: [S('a', 'a', true), S('b', 'b')] })) === '{"done":1,"total":2}');
}

{
  const base = A('m', { subs: [S('a', 'Первый'), S('b', 'Второй')], updatedAt: 1 });
  const left = A('m', { subs: [S('a', 'Первый', true), S('b', 'Второй')], updatedAt: 5 });
  const right = A('m', { subs: [S('a', 'Первый'), S('b', 'Второй'), S('c', 'Третий')], updatedAt: 9 });
  ok('subtasks from one device win when the other did not touch them', mergeTasks([base], [left], [base])[0].subs[0].done === true);
  const m = mergeTasks([base], [left], [right])[0];
  ok('when both changed subtasks, the newer list wins whole', m.subs.length === 3 && m.subs[0].done === false, m.subs);
  const textOnly = A('m', { text: 'Новое имя', subs: base.subs, updatedAt: 3 });
  const m2 = mergeTasks([base], [textOnly], [left])[0];
  ok('name and subtasks changed on different devices are joined', m2.text === 'Новое имя' && m2.subs[0].done === true, m2);
  const st = normalize(mergeStates({ habits: [], log: {}, tasks: [base] }, { habits: [], log: {}, tasks: [left] }, { habits: [], log: {}, tasks: [right] }));
  ok('full state merge keeps subtasks', st.tasks[0].subs.length === 3);
}

{
  show({ habits: [], log: {}, tasks: [A('f', { date: T })] });
  openTaskForm(findTask('f')); await until(() => $('tFormOv')._shown);
  ok('form has a subtasks section above the note', visible($('tfSubAdd')) && $('tfSubAdd').textContent === 'Подзадача' && !ins().length && ($('tfSubAdd').compareDocumentPosition($('tfNote')) & Node.DOCUMENT_POSITION_FOLLOWING) && ($('tfText').compareDocumentPosition($('tfSubs')) & Node.DOCUMENT_POSITION_FOLLOWING));
  $('tfSubAdd').click();
  ok('add creates a focused row', ins().length === 1 && document.activeElement === ins()[0]);
  ok('row has a checkbox, a field and a delete button with labels', !!$('tfSubs').querySelector('.t-sbox[role=checkbox][aria-label]') && !!$('tfSubs').querySelector('.t-sdel[aria-label="Удалить подзадачу"]') && ins()[0].getAttribute('aria-label') === 'Подзадача 1');
  ok('subtask field is 16 px and controls are 44 px', parseFloat(getComputedStyle(ins()[0]).fontSize) >= 16 && [...$('tfSubs').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 40) && $('tfSubAdd').getBoundingClientRect().height >= 40);
  setSub(0, 'Купить краску');
  ins()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok('enter makes the next row', ins().length === 2 && document.activeElement === ins()[1]);
  setSub(1, 'Покрасить');
  ins()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok('third row is created', ins().length === 3);
  $('tfNote').focus();
  ok('empty row is removed on leave', ins().length === 2);
  ok('several lines paste as several subtasks', paste(ins()[1], '- Грунтовка\n• Кисти\n\n[ ] Плёнка'));
  ok('pasted lines become rows after the current one', ins().map(i => i.value).join('|') === 'Купить краску|ПокраситьГрунтовка|Кисти|Плёнка', ins().map(i => i.value));
  $('tfSubs').querySelectorAll('.t-sbox')[0].click();
  ok('checkbox in the form marks the subtask', $('tfSubs').querySelectorAll('.t-sbox')[0].getAttribute('aria-checked') === 'true');
  $('tfSubs').querySelectorAll('.t-sdel')[3].click();
  ok('delete removes a row', ins().length === 3);
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('subtasks are saved', findTask('f').subs.map(s => s.text).join('|') === 'Купить краску|ПокраситьГрунтовка|Кисти' && findTask('f').subs[0].done === true, findTask('f').subs);
  ok('subtasks reach storage', JSON.parse(localStorage.getItem(STORE)).tasks[0].subs.length === 3);

  openTaskForm(findTask('f')); await until(() => $('tFormOv')._shown);
  ok('subtasks come back in the form', ins().map(i => i.value).join('|') === 'Купить краску|ПокраситьГрунтовка|Кисти');
  setSub(2, 'Кисти и валик');
  requestClose($('tFormOv'));
  ok('closing after editing subtasks asks first', await until(() => $('confirm')._shown));
  $('cNo').click(); await until(() => $('confirm').hidden);
  ok('cancel keeps the form open', $('tFormOv')._shown && findTask('f').subs[2].text === 'Кисти');
  $('tfSubs').querySelectorAll('.t-sbox')[1].click();
  setSub(2, 'Кисти');
  requestClose($('tFormOv'));
  ok('checking a subtask also counts as a change', await until(() => $('confirm')._shown));
  $('cYes').click(); await until(() => $('confirm').hidden && $('tFormOv').hidden);
  ok('closing without saving keeps the old subtasks', findTask('f').subs[1].done === false);
  openTaskForm(findTask('f')); await until(() => $('tFormOv')._shown);
  for (let i = 0; i < 30; i++) $('tfSubAdd').click(), ins().at(-1) && setSub(ins().length - 1, 'шаг ' + i);
  ok('form stops at 30 subtasks', ins().length === TASK_LIM.subs && $('tfSubAdd').hidden);
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
}

{
  show({ habits: [], log: {}, tasks: [A('l', { date: T, subs: [S('a', 'Первый', true), S('b', 'Второй'), S('c', 'Третий')] }), A('p', { date: T })] });
  ok('home block shows the count without opening', $('dayTasks').querySelector('.t-row[data-id=l] .t-subs')?.tagName === 'SPAN' && $('dayTasks').querySelector('.t-subs').textContent.includes('1 из 3') && !$('dayTasks').querySelector('.t-sublist'));
  openTasks(); await until(() => $('tasksOv')._shown);
  const btn = () => $('tItems').querySelector('.t-row[data-id=l] [data-act=subs]');
  ok('list row shows the count and a bar', btn().textContent === '1 из 3' && btn().querySelector('.t-sp b').style.width === '33%' && btn().getAttribute('aria-label') === 'Подзадачи: 1 из 3');
  ok('count button is big enough', btn().getBoundingClientRect().height >= 44 && btn().getBoundingClientRect().width >= 44);
  ok('task without subtasks has no count', !$('tItems').querySelector('.t-row[data-id=p] .t-subs'));
  btn().click();
  const list = () => $('tItems').querySelector('.t-sublist');
  ok('tap opens subtasks under the row', visible(list()) && list().querySelectorAll('[role=checkbox]').length === 3 && btn().getAttribute('aria-expanded') === 'true' && !$('tFormOv')._shown);
  list().querySelector('[data-s=b]').click();
  ok('checking a subtask in the list saves it', findTask('l').subs[1].done && btn().textContent === '2 из 3' && visible(list()));
  list().querySelector('[data-s=c]').click();
  ok('last subtask offers to finish the task', $('toastText').textContent === 'Все подзадачи выполнены' && $('toastUndo').textContent === 'Завершить задачу' && !findTask('l').done);
  $('toastUndo').click();
  ok('finish button completes the task, subtasks stay', findTask('l').done && findTask('l').subs.every(s => s.done));
  toggleTask(findTask('l'));
  ok('returning the task keeps subtasks', !findTask('l').done && findTask('l').subs.every(s => s.done));
  hideToast();
  list().querySelector('[data-s=a]').click();
  ok('unchecking does not offer to finish', !findTask('l').subs[0].done && !$('toast').classList.contains('show'));
  btn().click();
  ok('second tap closes the subtasks', !list());
  $('tTabs').querySelector('[data-t=month]').click();
  const mb = $('tMonthItems').querySelector('.t-row[data-id=l] [data-act=subs]');
  ok('month rows can open subtasks too', !!mb);
  mb.click();
  ok('month shows the subtasks', !!$('tMonthItems').querySelector('.t-sublist [data-s=a]'));
  $('tTabs').querySelector('[data-t=list]').click();
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { date: T, subs: [S('a', x), S('b', x, true)] })] });
  openTasks(); await until(() => $('tasksOv')._shown);
  $('tItems').querySelector('[data-act=subs]').click();
  ok('subtask text is escaped in the list', !document.querySelector('#tItems img') && $('tItems').querySelector('.t-subtext').textContent === x);
  openTaskForm(findTask('x')); await until(() => $('tFormOv')._shown);
  ok('subtask text is escaped in the form', !document.querySelector('#tFormOv img') && ins()[0].value === x);
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
