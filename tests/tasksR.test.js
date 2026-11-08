window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const J = JSON.stringify;
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };
const openForm = async (t, d) => { openTaskForm(t, d); await until(() => $('tFormOv')._shown); };
const closeForm = async () => { $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden); };
const pressed = box => [...box.querySelectorAll('[aria-pressed=true]')].map(b => b.textContent).join();
const C = (n, u, x = {}) => ({ m: 'cal', n, u, ...x }), F = (n, u) => ({ m: 'after', n, u });

{
  const rows = [
    [C(1, 'd'), '2026-11-07', '2026-11-07', '2026-11-08'],
    [C(2, 'd'), '2026-11-07', '2026-11-07', '2026-11-09'],
    [C(1, 'd'), '2026-11-01', '2026-11-07', '2026-11-08'],
    [C(3, 'd'), '2026-11-01', '2026-11-07', '2026-11-10'],
    [C(1, 'd'), '2026-11-10', '2026-11-07', '2026-11-11'],
    [C(1, 'd'), '2026-12-31', '2026-12-31', '2027-01-01'],
    [C(1, 'w'), '2026-11-06', '2026-11-07', '2026-11-13'],
    [C(1, 'w', { wd: [0, 2, 4] }), '2026-11-09', '2026-11-07', '2026-11-11'],
    [C(1, 'w', { wd: [0, 2, 4] }), '2026-11-06', '2026-11-07', '2026-11-09'],
    [C(2, 'w', { wd: [0] }), '2026-11-02', '2026-11-03', '2026-11-16'],
    [C(2, 'w', { wd: [1, 3] }), '2026-11-03', '2026-11-03', '2026-11-05'],
    [C(1, 'mo', { md: 31 }), '2027-01-31', '2027-01-31', '2027-02-28'],
    [C(1, 'mo', { md: 31 }), '2028-01-31', '2028-01-31', '2028-02-29'],
    [C(1, 'mo', { md: 31 }), '2027-02-28', '2027-02-28', '2027-03-31'],
    [C(1, 'mo', { md: 'last' }), '2026-11-30', '2026-11-30', '2026-12-31'],
    [C(1, 'mo', { md: 'last' }), '2027-02-28', '2027-02-28', '2027-03-31'],
    [C(1, 'mo', { md: 5 }), '2026-10-05', '2026-11-07', '2026-12-05'],
    [C(2, 'mo', { md: 15 }), '2026-11-15', '2026-11-15', '2027-01-15'],
    [C(1, 'mo', { md: 5 }), '2026-12-05', '2026-12-05', '2027-01-05'],
    [C(1, 'y'), '2028-02-29', '2028-02-29', '2029-02-28'],
    [C(1, 'y'), '2026-11-07', '2026-11-07', '2027-11-07'],
    [C(4, 'y'), '2028-02-29', '2028-02-29', '2032-02-29'],
    [F(3, 'd'), '2026-11-01', '2026-11-07', '2026-11-10'],
    [F(2, 'w'), '2026-11-20', '2026-11-07', '2026-11-21'],
    [F(1, 'mo'), '2027-01-31', '2027-01-31', '2027-02-28'],
    [F(1, 'y'), '2028-02-29', '2028-02-29', '2029-02-28'],
    [F(1, 'mo'), '2026-12-15', '2026-12-31', '2027-01-31'],
  ];
  for (const [rep, old, today, want] of rows) ok(`next ${J(rep)} from ${old} on ${today}`, nextOccurrence(rep, old, today) === want, nextOccurrence(rep, old, today));
  ok('first date includes today when it fits', firstOn(C(1, 'w', { wd: [5] }), '2026-11-07') === '2026-11-07' && firstOn(C(1, 'w', { wd: [4] }), '2026-11-07') === '2026-11-13' && firstOn(C(1, 'mo', { md: 5 }), '2026-11-07') === '2026-12-05' && firstOn(C(1, 'mo', { md: 'last' }), '2026-11-07') === '2026-11-30');
  const L = repLabel;
  const labels = [[C(1, 'd'), 'Каждый день'], [C(2, 'd'), 'Каждые 2 дня'], [C(5, 'd'), 'Каждые 5 дней'], [C(21, 'd'), 'Каждый 21 день'], [C(1, 'w'), 'Каждую неделю'], [C(2, 'w'), 'Каждые 2 недели'], [C(1, 'w', { wd: [4] }), 'Каждую пятницу'], [C(1, 'w', { wd: [0, 2, 4] }), 'По пн, ср, пт'], [C(1, 'w', { wd: [0, 1, 2, 3, 4] }), 'По будням'], [C(1, 'mo', { md: 5 }), 'Каждый месяц, 5-го числа'], [C(1, 'mo', { md: 'last' }), 'Последний день каждого месяца'], [C(3, 'mo'), 'Каждые 3 месяца'], [C(1, 'y'), 'Каждый год'], [C(5, 'y'), 'Каждые 5 лет'], [F(2, 'w'), 'Через 2 недели после выполнения'], [F(1, 'd'), 'Через день после выполнения'], [F(5, 'mo'), 'Через 5 месяцев после выполнения']];
  for (const [r, want] of labels) ok('label ' + want, L(r) === want, L(r));
  const n = normTasks([A('a', { date: T, rep: C(1, 'w', { wd: [9, 2, 2, 0] }), doneCount: 3, lastDone: shift(-1) }), A('b', { date: T, rep: C(400, 'd') }), A('c', { rep: C(1, 'd') }), A('d', { date: T, rep: { m: 'x', n: 1, u: 'd' }, doneCount: -2, lastDone: 'вчера' }), A('e', { date: T, rep: C(1, 'mo', { md: 40, wd: [1] }) }), A('f', { date: T, rep: F(1, 'w', { until: '2026-02-30' }) })], T);
  ok('repeat is cleaned', J(n[0].rep) === J(C(1, 'w', { wd: [0, 2] })) && n[0].doneCount === 3 && n[0].lastDone === shift(-1));
  ok('limits drop bad repeats', !n[1].rep && !n[3].rep && !('doneCount' in n[3]) && !('lastDone' in n[3]));
  ok('repeat needs a date', !n[2].rep);
  ok('wrong extras are dropped', J(n[4].rep) === J(C(1, 'mo')) && J(n[5].rep) === J(F(1, 'w')));
}

{
  show({ habits: [], log: {}, tasks: [A('r', { date: T, due: shift(2), time: '09:00', remind: 0, rep: C(1, 'd'), subs: [{ id: 's1', text: 'Шаг', done: true }, { id: 's2', text: 'Ещё', done: true }], doneCount: 4, lastDone: shift(-1) })] });
  await openPage();
  $('tItems').querySelector('.t-row[data-id=r] .t-box').click();
  const t = findTask('r');
  ok('checking a repeat keeps the task and moves its date', !t.done && t.date === shift(1) && state.tasks.length === 1);
  ok('due moves by the same days, time and reminder stay', t.due === shift(3) && t.time === '09:00' && t.remind === 0);
  ok('subtasks are cleared, count grows', t.subs.every(s => !s.done) && t.doneCount === 5 && t.lastDone === T);
  ok('toast says the next time', $('toastText').textContent === 'Следующий раз: ' + dayShort(shift(1), T) && $('toastUndo').textContent === 'Отменить');
  ok('row shows the repeat', !!$('tItems').querySelector('.t-row[data-id=r] .t-rep') && $('tItems').querySelector('.t-row[data-id=r] .t-rep').textContent === 'Каждый день');
  $('toastUndo').click();
  ok('undo returns date, due, subtasks and counters', t.date === T && t.due === shift(2) && t.subs.every(s => s.done) && t.doneCount === 4 && t.lastDone === shift(-1));
  await closePage();
  show({ habits: [], log: {}, tasks: [A('u', { date: T, rep: C(1, 'w', { until: shift(3) }) })] });
  toggleTask(findTask('u'));
  ok('past the end date the repeat finishes normally', findTask('u').done && findTask('u').doneAt === T && !!findTask('u').rep);
  toggleTask(findTask('u'));
  ok('finished repeat can be returned', !findTask('u').done);
  show({ habits: [], log: {}, tasks: [A('o', { date: shift(-3), rep: C(2, 'd'), doneCount: 1 })] });
  toggleTask(findTask('o'));
  ok('overdue repeat jumps after today, no catching up', findTask('o').date > T && findTask('o').doneCount === 2);
}

{
  show({ habits: [], log: {}, tasks: [A('s', { date: T, rep: C(1, 'w'), doneCount: 2, lastDone: shift(-7) }), A('n', { date: T })] });
  await openForm(findTask('s'));
  ok('skip button for a repeat', visible($('tfSkip')) && $('tfSkip').textContent === 'Пропустить этот раз' && $('tfSkip').getBoundingClientRect().height >= 44);
  ok('statistics line', $('tfRepStat').textContent === 'Выполнено 2 раза, последний раз ' + dayShort(shift(-7), T));
  $('tfSkip').click(); await until(() => $('tFormOv').hidden);
  ok('skip moves the date without counting', findTask('s').date === shift(7) && findTask('s').doneCount === 2 && $('toastText').textContent.startsWith('Пропущено'));
  $('toastUndo').click();
  ok('skip can be undone', findTask('s').date === T);
  await openForm(findTask('n'));
  ok('plain task has no skip or statistics', !visible($('tfSkip')) && !visible($('tfRepStat')));
  await closeForm();
  archiveTask(findTask('s'));
  ok('archive pauses with the date kept', findTask('s').archivedAt === T && findTask('s').date === T);
  restoreTask(findTask('s'));
  ok('return resumes from the same date', !findTask('s').archivedAt && findTask('s').date === T);
  const p = deleteTask(findTask('s'));
  await until(() => $('confirm')._shown);
  ok('deleting a repeat asks first', $('cTitle').textContent === 'Удалить повторяющуюся задачу?');
  $('cNo').click(); await p;
  ok('cancel keeps it', !!findTask('s'));
  const p2 = deleteTask(findTask('s'));
  await until(() => $('confirm')._shown);
  $('cYes').click(); await p2;
  ok('confirm deletes it', !findTask('s'));
  deleteTask(findTask('n'));
  ok('plain task deletes without asking', !findTask('n') && !$('confirm')._shown);
}

{
  show({ habits: [], log: {}, tasks: [A('f', { date: T }), A('z')] });
  await openForm(findTask('f'));
  ok('repeat chips', [...$('tfRep').querySelectorAll('button')].map(b => b.textContent).join() === 'Нет,Каждый день,Каждую неделю,Каждый месяц,Другое…' && pressed($('tfRep')) === 'Нет');
  $('tfRep').querySelector('[data-v=w]').click();
  ok('weekly preset uses the weekday of When', pressed($('tfRep')) === 'Каждую неделю');
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('weekly repeat is saved', J(findTask('f').rep) === J(C(1, 'w', { wd: [weekday(parseKey(T))] })));
  await openForm(findTask('f'));
  ok('preset comes back', pressed($('tfRep')) === 'Каждую неделю');
  $('tfRep').querySelector('[data-v=other]').click(); await until(() => $('tRepOv')._shown);
  ok('other opens the repeat sheet from the saved value', $('trN').value === '1' && $('trUnit').querySelector('[aria-checked=true]').dataset.u === 'w' && visible($('trWd')) && $('trWd').querySelector('[aria-pressed=true]').dataset.wd === String(weekday(parseKey(T))));
  ok('sheet controls are big enough and labelled', [...$('trWd').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44 && b.getAttribute('aria-label')) && parseFloat(getComputedStyle($('trN')).fontSize) >= 16);
  $('trWd').querySelectorAll('button').forEach(b => { if (b.getAttribute('aria-pressed') === 'true') b.click(); });
  $('trOk').click();
  ok('weekly with no days is refused', visible($('trErr')) && $('trErr').textContent === 'Выберите хотя бы один день недели');
  [0, 2, 4].forEach(i => $('trWd').querySelector(`[data-wd="${i}"]`).click());
  ok('preview reads', $('trPreview').textContent === 'По пн, ср, пт');
  $('trUnit').querySelector('[data-u=d]').click();
  $('trN').value = '400'; $('trN').dispatchEvent(new Event('input', { bubbles: true }));
  $('trOk').click();
  ok('limit for days', $('trErr').textContent === 'Для дней — от 1 до 365' && $('tRepOv')._shown);
  $('trMode').querySelector('[data-m=after]').click();
  $('trUnit').querySelector('[data-u=w]').click();
  $('trN').value = '2'; $('trN').dispatchEvent(new Event('input', { bubbles: true }));
  ok('after mode hides weekdays and reads well', !visible($('trWd')) && $('trPreview').textContent === 'Через 2 недели после выполнения' && $('trEvery').textContent === 'Через');
  $('trOk').click(); await until(() => $('tRepOv').hidden);
  ok('custom value is a separate chip', pressed($('tfRep')) === 'Через 2 недели после выполнения' && !!$('tfRep').querySelector('.t-chip-wide'));
  $('tfRep').querySelector('[data-v=other]').click(); await until(() => $('tRepOv')._shown);
  $('trMode').querySelector('[data-m=cal]').click();
  $('trUnit').querySelector('[data-u=mo]').click();
  $('trN').value = '1'; $('trN').dispatchEvent(new Event('input', { bubbles: true }));
  ok('month options show the day of When', visible($('trMd')) && $('trMd').querySelector('[data-md=day]').textContent === parseKey(T).getDate() + '-го числа');
  $('trMd').querySelector('[data-md=last]').click();
  ok('last day preview', $('trPreview').textContent === 'Последний день каждого месяца');
  $('trOk').click(); await until(() => $('tRepOv').hidden);
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('custom repeat is saved', J(findTask('f').rep) === J(C(1, 'mo', { md: 'last' })));
  await openForm(findTask('z'));
  $('tfRep').querySelector('[data-v=d]').click();
  ok('repeat without When sets today', $('tfDateVal').textContent === 'Сегодня');
  $('tfDate').click(); await until(() => $('tDateOv')._shown);
  $('tdQuick').querySelector('[data-v=""]').click(); $('tdOk').click(); await until(() => $('tDateOv').hidden);
  ok('removing When removes the repeat', pressed($('tfRep')) === 'Нет');
  await closeForm();
}

{
  const P = s => parseQuick(s, new Date(2026, 10, 7, 14, 30));
  const cases = [
    ['полить цветы каждый день', 'полить цветы', C(1, 'd'), '2026-11-07'],
    ['каждые 2 дня поливать', 'поливать', C(2, 'd'), '2026-11-07'],
    ['каждые 3 недели стрижка', 'стрижка', C(3, 'w', { wd: [5] }), '2026-11-07'],
    ['каждые 2 месяца фильтр', 'фильтр', C(2, 'mo', { md: 7 }), '2026-11-07'],
    ['каждые 2 года паспорт', 'паспорт', C(2, 'y'), '2026-11-07'],
    ['бассейн каждую пятницу', 'бассейн', C(1, 'w', { wd: [4] }), '2026-11-13'],
    ['каждый понедельник планёрка', 'планёрка', C(1, 'w', { wd: [0] }), '2026-11-09'],
    ['каждое воскресенье звонок маме', 'звонок маме', C(1, 'w', { wd: [6] }), '2026-11-08'],
    ['каждую субботу рынок', 'рынок', C(1, 'w', { wd: [5] }), '2026-11-07'],
    ['по пятницам отчёт', 'отчёт', C(1, 'w', { wd: [4] }), '2026-11-13'],
    ['отчёт по пятницам', 'отчёт', C(1, 'w', { wd: [4] }), '2026-11-13'],
    ['зарядка по будням', 'зарядка', C(1, 'w', { wd: [0, 1, 2, 3, 4] }), '2026-11-09'],
    ['уборка по выходным', 'уборка', C(1, 'w', { wd: [5, 6] }), '2026-11-07'],
    ['оплатить интернет каждый месяц', 'оплатить интернет', C(1, 'mo', { md: 7 }), '2026-11-07'],
    ['аренда 5-го числа каждого месяца', 'аренда', C(1, 'mo', { md: 5 }), '2026-12-05'],
    ['аренда 10 числа каждого месяца', 'аренда', C(1, 'mo', { md: 10 }), '2026-11-10'],
    ['техосмотр каждый год', 'техосмотр', C(1, 'y'), '2026-11-07'],
    ['раз в неделю пылесосить', 'пылесосить', C(1, 'w', { wd: [5] }), '2026-11-07'],
    ['раз в месяц счётчики', 'счётчики', C(1, 'mo', { md: 7 }), '2026-11-07'],
    ['раз в год страховка', 'страховка', C(1, 'y'), '2026-11-07'],
    ['раз в 2 недели созвон', 'созвон', C(2, 'w', { wd: [5] }), '2026-11-07'],
    ['поменять щётку через 2 недели после выполнения', 'поменять щётку', F(2, 'w'), '2026-11-07'],
    ['стрижка раз в 2 недели после выполнения', 'стрижка', F(2, 'w'), '2026-11-07'],
    ['полить кактус через месяц после выполнения', 'полить кактус', F(1, 'mo'), '2026-11-07'],
    ['каждый день в 8 утра зарядка', 'зарядка', C(1, 'd'), '2026-11-08'],
    ['с понедельника каждую среду йога', 'с понедельника йога', C(1, 'w', { wd: [2] }), '2026-11-11'],
  ];
  for (const [input, text, rep, date] of cases) { const r = P(input); ok('repeat: ' + input, r.text === text && J(r.rep) === J(rep) && r.date === date, r); }
  const neg = ['каждый раз проверять почту', 'отправить каждому коллеге', 'по пятницам не работает', 'каждые выходные', 'каждые 400 дней', 'каждый день', 'через неделю после выполнения', 'каждыйдень тест'];
  for (const s of neg) { const r = P(s); ok('no repeat: ' + s, !r.rep && r.text === s, r); }
  ok('repeat table has at least 25 phrases', cases.length + neg.length >= 25);
  show({ habits: [], log: {}, tasks: [] });
  await openPage();
  $('tqText').value = 'бассейн каждую пятницу'; $('tqText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('chip shows the repeat', $('tqChipText').textContent.includes('Повтор: каждую пятницу'));
  $('tQuick').requestSubmit();
  ok('quick add saves the repeat with the nearest date', J(state.tasks.at(-1).rep) === J(C(1, 'w', { wd: [4] })) && weekday(parseKey(state.tasks.at(-1).date)) === 4 && state.tasks.at(-1).date >= T);
  await closePage();
}

{
  const base = A('m', { date: T, rep: C(1, 'd'), doneCount: 2, updatedAt: 1 });
  const done = (d, u) => ({ ...base, date: d, doneCount: 3, lastDone: T, updatedAt: u });
  const m = mergeTasks([base], [done(shift(1), 5)], [done(shift(1), 6)]);
  ok('two devices marking the same calendar repeat agree, no duplicates', m.length === 1 && m[0].date === shift(1) && m[0].doneCount === 3, m);
  const ab = A('a', { date: T, rep: F(3, 'd'), updatedAt: 1 });
  const m2 = mergeTasks([ab], [{ ...ab, date: shift(3), doneCount: 1, lastDone: T, updatedAt: 5 }], [{ ...ab, date: shift(4), doneCount: 1, lastDone: shift(1), updatedAt: 9 }]);
  ok('after-repeat: newer change wins, no duplicates', m2.length === 1 && m2[0].date === shift(4) && m2[0].lastDone === shift(1), m2);
  const st = normalize(mergeStates({ habits: [], log: {}, tasks: [base] }, { habits: [], log: {}, tasks: [done(shift(1), 5)] }, { habits: [], log: {}, tasks: [base] }));
  ok('state merge keeps the moved repeat', st.tasks.length === 1 && st.tasks[0].date === shift(1));
}

{
  const month = new Date(parseKey(T).getFullYear(), parseKey(T).getMonth(), 1);
  const last = key(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const marks = monthMarks([A('g', { date: T, rep: C(2, 'd') }), A('p', { date: T, rep: C(1, 'd'), done: true, doneAt: T })], T, month);
  const ghosts = Object.keys(marks).filter(k => marks[k].g);
  ok('month shows ghost dots for coming repeats', ghosts.length === Math.floor(daysBetween(last, T) / 2) && ghosts.every(k => k > T && k <= last), ghosts.length);
  const many = monthMarks(Array.from({ length: 5 }, (_, i) => A('m' + i, { date: T, rep: C(1, 'd') })), T, month);
  ok('no more than 60 ghosts in a month', Object.values(many).filter(m => m.g).length <= 60);
  show({ habits: [], log: {}, tasks: [A('g', { date: T, rep: C(1, 'd') }), A('x', { date: T, rep: C(1, 'd'), private: true })] });
  ok('private repeats leave no ghosts while locked', (() => { const mm = monthMarks(visTasks(), T, month); return Object.values(mm).filter(m => m.g).length === Math.min(60, daysBetween(last, T)); })());
  await openPage();
  $('tTabs').querySelector('[data-t=month]').click();
  if (T < last) ok('ghost dot is drawn', !!$('tCal').querySelector(`[data-k="${shift(1)}"] .t-dots b.t-ghost`));
  $('tTabs').querySelector('[data-t=list]').click();
  await closePage();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, date: T, rep: C(1, 'd'), doneCount: 1, lastDone: T })] });
  await openPage();
  $('tItems').querySelector('.t-row[data-id=x] .t-box').click();
  ok('repeat rows and toast are escaped', !document.querySelector('#tItems img, #dayTasks img, #toast img'));
  await openForm(findTask('x'));
  $('tfRep').querySelector('[data-v=other]').click(); await until(() => $('tRepOv')._shown);
  ok('repeat form and sheet are escaped', !document.querySelector('#tFormOv img, #tRepOv img'));
  closeOverlay($('tRepOv')); await until(() => $('tRepOv').hidden);
  await closeForm();
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
