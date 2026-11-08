window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const frame = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await frame(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { exitSelect(false); closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };
const rowOf = id => $('tItems').querySelector(`.t-row[data-id="${id}"]`);
const lbls = () => [...$('tdQuick').querySelectorAll('.tf-lbl')].map(x => x.textContent).join();
const toastText = () => $('toastText').textContent;
const undo = async () => { $('toastUndo').click(); await frame(); };

{
  ok('weekend from a weekday is the coming Saturday', nextWeekend('2026-11-09') === '2026-11-14' && nextWeekend('2026-11-13') === '2026-11-14');
  ok('weekend on Saturday and Sunday is the next one', nextWeekend('2026-11-14') === '2026-11-21' && nextWeekend('2026-11-15') === '2026-11-21');
  ok('move labels read', moveLabel(T, T) === 'на сегодня' && moveLabel(shift(1), T) === 'на завтра' && moveLabel('2026-11-14', '2026-11-08') === 'на сб, 14 нояб.' && moveLabel('someday') === 'Когда-нибудь' && moveLabel('') === 'Без даты');
  const n = normTasks([A('a', { someday: true }), A('b', { someday: true, date: T }), A('c', { someday: true, due: T }), A('d', { someday: 'yes' })], T);
  ok('someday is kept only without date and due', n[0].someday === true && !('someday' in n[1]) && !('someday' in n[2]) && !('someday' in n[3]));
  const g = taskGroups(normTasks([A('s', { someday: true }), A('n'), A('t', { date: T })], T), T);
  ok('someday has its own group', g.someday.map(t => t.id).join() === 's' && g.nodate.map(t => t.id).join() === 'n');
  ok('someday is not in the no-date slice nor in today counts', !smartFilter('nodate', normTasks([A('s', { someday: true })], T), T).length && pendingToday(normTasks([A('s', { someday: true })], T), T) === 0);
  const p = parseQuick('когда-нибудь выучить испанский');
  ok('quick input understands someday', p.someday === true && p.text === 'выучить испанский' && !p.date, p);
  ok('someday word is ignored with a date', !parseQuick('завтра когда-нибудь позвонить').someday);
  ok('quick label names someday', quickLabel({ someday: true }) === 'Когда-нибудь');
}

{
  show({ habits: [], log: {}, tasks: [A('a', { date: shift(-1), time: '09:00', reminds: [0] }), A('r', { date: T, rep: { m: 'cal', n: 1, u: 'd' } }), A('d', { date: T, due: shift(2) })] });
  await openPage();
  rowOf('a').querySelector('[data-act=move]').click();
  await until(() => $('tDateOv')._shown);
  ok('move sheet has its title and options', $('tdTitle').textContent === 'Перенести' && lbls() === 'Сегодня,Завтра,Выходные,Следующая неделя,Когда-нибудь,Без даты', lbls());
  ok('options show the date on the right', $('tdQuick').querySelector(`[data-v="${shift(1)}"] em`).textContent === pickDayText(shift(1), T) && !$('tdQuick').querySelector('[data-v=someday] em'));
  ok('next week is never tomorrow', $('tdQuick').querySelectorAll(`[data-v="${shift(1)}"]`).length === 1);
  ok('current date is marked', $('tdQuick').querySelector(`[aria-pressed=true]`) === null && $('tdCal').querySelector('.t-d.pick')?.dataset.k === shift(-1));
  ok('rows are tall enough', [...$('tdQuick').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44));
  ok('there is a calendar in the sheet', $('tdCal').querySelectorAll('.t-d').length === 42);
  $('tdQuick').querySelector(`[data-v="${shift(1)}"]`).click();
  await until(() => $('tDateOv').hidden);
  ok('task moves and keeps time and reminders', findTask('a').date === shift(1) && findTask('a').time === '09:00' && JSON.stringify(findTask('a').reminds) === '[0]');
  ok('toast tells where', toastText().startsWith('Перенесено на завтра'), toastText());
  await undo();
  ok('undo brings the date back', findTask('a').date === shift(-1));
  rowOf('a').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  $('tdCal').querySelector(`[data-k="${shift(5)}"]`).click(); await until(() => $('tDateOv').hidden);
  ok('calendar day moves at once', findTask('a').date === shift(5));
  rowOf('a').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  $('tdQuick').querySelector('[data-v=someday]').click(); await until(() => $('tDateOv').hidden);
  const a = findTask('a');
  ok('someday drops date, time and reminders', a.someday === true && !a.date && !a.time && !a.reminds, a);
  ok('someday toast', toastText().startsWith('Отложено: когда-нибудь'));
  rowOf('r').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  ok('repeating task cannot lose its date here', lbls() === 'Сегодня,Завтра,Выходные,Следующая неделя');
  closeOverlay($('tDateOv')); await until(() => $('tDateOv').hidden);
  rowOf('d').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  $('tdCal').querySelector(`[data-k="${shift(4)}"]`).click(); await until(() => $('tDateOv').hidden);
  ok('moving past the due warns and keeps the due', findTask('d').date === shift(4) && findTask('d').due === shift(2) && toastText().includes('позже срока'), toastText());
  rowOf('d').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  $('tdQuick').querySelector('[data-v=""]').click(); await until(() => $('tDateOv').hidden);
  ok('no date keeps the due', !findTask('d').date && findTask('d').due === shift(2) && !findTask('d').someday);
  await closePage();
}

{
  show({ habits: [], log: {}, tasks: [A('s', { someday: true }), A('n')] });
  await openPage();
  const head = [...$('tItems').querySelectorAll('.t-done-head')].find(b => b.textContent.startsWith('Когда-нибудь'));
  ok('someday group starts folded with a count', !!head && head.getAttribute('aria-expanded') === 'false' && head.querySelector('.cnt').textContent === '1' && !rowOf('s'));
  head.click();
  ok('it opens', !!rowOf('s') && !!rowOf('n'));
  ok('home block does not show someday', !$('dayTasks').querySelector('.t-row[data-id=s]'));
  rowOf('s').querySelector('.t-main').click(); await until(() => $('tFormOv')._shown);
  ok('card shows Someday', $('tfDateVal').textContent === 'Когда-нибудь');
  $('tfDate').click(); await until(() => $('tDateOv')._shown);
  ok('Someday is checked in the sheet', $('tdQuick').querySelector('[data-v=someday]').getAttribute('aria-pressed') === 'true');
  $('tdQuick').querySelector(`[data-v="${T}"]`).click(); await until(() => $('tDateOv').hidden);
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('a date clears Someday', findTask('s').date === T && !findTask('s').someday);
  rowOf('n').querySelector('.t-main').click(); await until(() => $('tFormOv')._shown);
  $('tfDate').click(); await until(() => $('tDateOv')._shown);
  $('tdQuick').querySelector('[data-v=someday]').click(); await until(() => $('tDateOv').hidden);
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('card saves Someday', findTask('n').someday === true && !findTask('n').date);
  $('tqText').value = 'когда-нибудь съездить на Байкал';
  $('tQuick').requestSubmit(); await frame();
  const q = tasksOf().find(t => t.text === 'съездить на Байкал');
  ok('quick add creates a someday task', !!q && q.someday === true && !q.date, q);
  await closePage();
}

{
  show({ habits: [], log: {}, tasks: [A('x', { date: T }), A('y', { date: T })] });
  await openPage();
  doneDelay.ms = 250;
  rowOf('x').querySelector('.t-box').click();
  ok('tick waits a moment before finishing', !findTask('x').done && rowOf('x').classList.contains('t-pend') && rowOf('x').querySelector('.t-box').getAttribute('aria-checked') === 'true');
  await until(() => findTask('x').done, 1500);
  ok('then the task is done', findTask('x').done);
  rowOf('y').querySelector('.t-box').click();
  rowOf('y').querySelector('.t-box').click();
  await new Promise(r => setTimeout(r, 400));
  ok('second tap cancels', !findTask('y').done && !rowOf('y').classList.contains('t-pend'));
  doneDelay.ms = 0;
  await closePage();
}

{
  const L = [{ id: 'l1', name: 'Дом', color: COLORS[0], updatedAt: 1 }];
  show({ habits: [], log: {}, taskLists: L, tasks: [A('a', { date: T }), A('b', { date: T }), A('c', { date: shift(2) }), A('r', { date: T, rep: { m: 'cal', n: 1, u: 'd' } }), A('f', { date: T, done: true, doneAt: T })] });
  await openPage();
  ok('select button is in the header', visible($('tSelBtn')) && $('tSelBtn').getAttribute('aria-label') === 'Выбрать задачи');
  $('tSelBtn').click();
  ok('selection mode starts empty', document.body.classList.contains('t-selecting') && $('tTitle').textContent === 'Выберите задачи' && visible($('tSelBar')) && visible($('tSelAll')) && visible($('tSelDone')));
  await until(() => getComputedStyle(document.querySelector('.tabbar')).opacity === '0');
  ok('tab bar, quick add and back are hidden', getComputedStyle(document.querySelector('.tabbar')).opacity === '0' && !visible($('tQuick')) && !visible($('tasksOv').querySelector('.page-head [data-close]')));
  ok('actions wait for a choice', [...$('tSelBar').querySelectorAll('button')].filter(b => !b.hidden).every(b => b.disabled));
  ok('rows show selection circles', !!rowOf('a').querySelector('.t-selbox[role=checkbox]') && rowOf('a').querySelector('.t-selbox').getAttribute('aria-label') === 'Выбрать: Дело a');
  rowOf('a').querySelector('.t-main').click();
  rowOf('b').querySelector('.t-box').click();
  ok('tapping rows selects them', $('tTitle').textContent === 'Выбрано: 2' && rowOf('a').classList.contains('on') && rowOf('b').querySelector('.t-selbox').getAttribute('aria-checked') === 'true' && !findTask('b').done);
  ok('selected row is tinted', getComputedStyle(rowOf('a').querySelector('.t-fg')).backgroundColor !== getComputedStyle(rowOf('c').querySelector('.t-fg')).backgroundColor);
  rowOf('a').querySelector('.t-main').click();
  ok('tap again unselects', $('tTitle').textContent === 'Выбрано: 1');
  ok('toolbar buttons are big and labelled', [...$('tSelBar').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44 && b.textContent.trim()));
  $('tSelAll').click();
  ok('All selects every open task', tv.sel.size === 4 && !tv.sel.has('f') && $('tSelAll').textContent === 'Снять');
  $('tSelAll').click();
  ok('second tap clears', tv.sel.size === 0);
  ['a', 'b', 'r'].forEach(id => rowOf(id).querySelector('.t-main').click());
  $('tSelBar').querySelector('[data-s=done]').click();
  ok('done finishes and moves repeats on', findTask('a').done && findTask('b').done && !findTask('r').done && findTask('r').date === shift(1) && !tv.sel && !document.body.classList.contains('t-selecting'));
  ok('one toast for all', toastText().startsWith('Выполнено: 3 задачи'), toastText());
  await undo();
  ok('undo reverts them all', !findTask('a').done && !findTask('b').done && findTask('r').date === T);
  $('tSelBtn').click(); ['a', 'c'].forEach(id => rowOf(id).querySelector('.t-main').click());
  $('tSelBar').querySelector('[data-s=list]').click(); await until(() => $('tPickOv')._shown);
  ok('list picker offers lists', [...$('tpList').querySelectorAll('.tf-lbl')].map(x => x.textContent).join() === 'Без списка,Дом');
  $('tpList').querySelector('[data-v=l1]').click(); await until(() => $('tPickOv').hidden);
  ok('tasks go to the list', findTask('a').list === 'l1' && findTask('c').list === 'l1' && !tv.sel);
  $('tSelBtn').click(); ['a', 'c'].forEach(id => rowOf(id).querySelector('.t-main').click());
  $('tSelBar').querySelector('[data-s=move]').click(); await until(() => $('tDateOv')._shown);
  $('tdQuick').querySelector(`[data-v="${shift(1)}"]`).click(); await until(() => $('tDateOv').hidden);
  ok('move works for many', findTask('a').date === shift(1) && findTask('c').date === shift(1) && toastText().includes('2 задачи') && !tv.sel, toastText());
  $('tSelBtn').click(); rowOf('a').querySelector('.t-main').click();
  $('tSelBar').querySelector('[data-s=arch]').click();
  ok('archive works', findTask('a').archivedAt === T);
  await undo();
  $('tSelBtn').click(); ['a', 'b'].forEach(id => rowOf(id).querySelector('.t-main').click());
  $('tSelBar').querySelector('[data-s=del]').click(); await until(() => $('confirm')._shown);
  ok('delete asks first', $('cTitle').textContent === 'Удалить 2 задачи?');
  $('cYes').click(); await until(() => !findTask('a'));
  ok('delete removes them', !findTask('a') && !findTask('b'));
  await undo();
  ok('undo restores deleted tasks', !!findTask('a') && !!findTask('b'));
  $('tSelBtn').click();
  await requestClose($('tasksOv')); await frame();
  ok('back leaves selection, not the page', !tv.sel && $('tasksOv')._shown);
  $('tSelBtn').click(); rowOf('a').querySelector('.t-main').click();
  $('tSelDone').click();
  ok('Done leaves selection', !tv.sel && $('tTitle').textContent === 'Задачи' && !visible($('tSelBar')) && !rowOf('a').querySelector('.t-selbox'));
  $('tTabs').querySelector('[data-t=month]').click();
  ok('select button hides in the month view', !visible($('tSelBtn')));
  $('tTabs').querySelector('[data-t=list]').click();
  await closePage();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, date: T })] });
  await openPage();
  $('tSelBtn').click();
  rowOf('x').querySelector('[data-act=move]').click(); await until(() => $('tDateOv')._shown);
  ok('selection labels and sheets escape the text', !document.querySelector('#tItems img, #tDateOv img'));
  closeOverlay($('tDateOv')); await until(() => $('tDateOv').hidden);
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
