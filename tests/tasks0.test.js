window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const frame = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await frame(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const acts = (box, id) => [...box.querySelectorAll(`.t-row[data-id="${id}"] .t-acts button`)].map(b => b.dataset.act).join();
const openForm = async t => { openTaskForm(t); await until(() => $('tFormOv')._shown); };
const closeForm = async () => { closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const setTime = v => { $('tfTime').value = v; $('tfTime').dispatchEvent(new Event('input', { bubbles: true })); };
const openArch = () => { const h = $('tItems').querySelector('[data-act=arch-toggle]'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); };
const pressed = () => [...$('tfRem').querySelectorAll('[aria-pressed=true]')].map(b => b.textContent);

{
  const L = remindLabel;
  ok('label at the time itself', L(0) === 'В срок');
  ok('labels in minutes', L(1) === 'За 1 мин' && L(59) === 'За 59 мин');
  ok('labels in hours', L(60) === 'За 1 ч' && L(120) === 'За 2 ч');
  ok('labels in hours and minutes', L(61) === 'За 1 ч 1 мин' && L(90) === 'За 1 ч 30 мин' && L(1500) === 'За 25 ч', [L(61), L(90), L(1500)]);
  ok('labels in days', L(1440) === 'За 1 дн.' && L(43200) === 'За 30 дн.');
  ok('label for a value above the limit still reads', L(43201) === 'За 720 ч 1 мин', L(43201));
  const n = v => normTasks([A('r', { date: T, time: '10:00', remind: v })], T)[0];
  ok('any whole minutes up to 30 days are kept', [0, 1, 7, 59, 61, 150, 20000, 43200].every(v => n(v).remind === v));
  ok('reminder above 30 days is dropped, time stays', !('remind' in n(43201)) && n(43201).time === '10:00');
  ok('fractional, negative and text reminders are dropped', [1.5, -1, '15', null, NaN, Infinity].every(v => !('remind' in n(v))));
}

{
  const at = (d, h, m) => { const [y, mo, dd] = d.split('-').map(Number); return new Date(y, mo - 1, dd, h, m); };
  const D = '2026-11-07', S = remindState;
  ok('reminder ahead is fine', S(D, '15:00', 0, at(D, 14, 30)) === 'ok');
  ok('reminder a few minutes ago still comes', S(D, '14:20', 0, at(D, 14, 30)) === 'soon' && S(D, '14:01', 0, at(D, 14, 30)) === 'soon');
  ok('reminder 30 minutes ago and more is missed', S(D, '14:00', 0, at(D, 14, 30)) === 'missed' && S(D, '09:00', 0, at(D, 14, 30)) === 'missed');
  ok('reminder before the time counts', S(D, '15:00', 60, at(D, 14, 20)) === 'soon' && S(D, '15:00', 60, at(D, 14, 30)) === 'missed' && S(D, '15:00', 15, at(D, 14, 30)) === 'ok');
  ok('past midnight: one hour before 00:10', S('2026-11-08', '00:10', 60, at(D, 23, 0)) === 'ok' && S('2026-11-08', '00:10', 60, at(D, 23, 20)) === 'soon' && S('2026-11-08', '00:10', 60, at(D, 23, 50)) === 'missed');
  ok('past midnight: one day before 00:10', S('2026-11-08', '00:10', 1440, at(D, 0, 5)) === 'ok' && S('2026-11-08', '00:10', 1440, at(D, 0, 20)) === 'soon' && S('2026-11-08', '00:10', 1440, at(D, 1, 0)) === 'missed');
  ok('another date changes the state', S('2026-11-09', '09:00', 0, at(D, 14, 30)) === 'ok' && S('2026-11-06', '20:00', 0, at(D, 14, 30)) === 'missed');
  ok('custom reminders work', S(D, '18:00', 150, at(D, 15, 0)) === 'ok' && S(D, '18:00', 150, at(D, 15, 40)) === 'soon' && S(D, '18:00', 150, at(D, 16, 0)) === 'missed' && S('2026-11-20', '10:00', 20000, at(D, 14, 30)) === 'missed' && S('2026-11-30', '10:00', 20000, at(D, 14, 30)) === 'ok');
  ok('no time or no reminder is fine', S(D, null, 0, at(D, 14, 30)) === 'ok' && S(D, '09:00', null, at(D, 14, 30)) === 'ok');
}

{
  const list = [A('act', { date: T }), A('late', { date: shift(-2) }), A('fut', { date: shift(3) }), A('nod'), A('fin', { date: T, done: true, doneAt: T }), A('arc', { date: shift(-4), archivedAt: T })];
  show({ habits: [], log: {}, tasks: list });
  openTasks();
  await until(() => $('tasksOv')._shown);
  const box = $('tItems');
  openArch();
  ok('active row: archive, then delete', acts(box, 'act') === 'arch,del');
  ok('overdue row: archive, then delete', acts(box, 'late') === 'arch,del');
  ok('future row: archive, then delete', acts(box, 'fut') === 'arch,del');
  ok('row without a date: archive, then delete', acts(box, 'nod') === 'arch,del');
  ok('finished row: delete only', acts(box, 'fin') === 'del');
  ok('archived row: return, then delete', acts(box, 'arc') === 'restore,del');
  ok('nothing offers to move', !document.querySelector('[data-act=move]'));
  const row = box.querySelector('.t-row[data-id=act]'), btns = [...row.querySelectorAll('.t-acts button')];
  ok('delete is at the right edge', btns[1].getBoundingClientRect().right > btns[0].getBoundingClientRect().right && Math.abs(btns[1].getBoundingClientRect().right - row.getBoundingClientRect().right) <= 6);
  ok('swipe width matches two buttons', getComputedStyle(row).getPropertyValue('--sw').trim() === SWIPE_W + 'px' && SWIPE_W === swipeW(2));
  ok('finished row opens only for one button', getComputedStyle(box.querySelector('.t-row[data-id=fin]')).getPropertyValue('--sw').trim() === swipeW(1) + 'px');
  ok('rows are at least 56 px high', row.getBoundingClientRect().height >= 56, row.getBoundingClientRect().height);
  ok('buttons are big enough to tap', btns.every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
  ok('buttons have a text label', btns.map(b => b.textContent.trim()).join() === 'В архив,Удалить');
  const cap = b => getComputedStyle(b.querySelector('i')).backgroundColor;
  ok('delete capsule uses the danger color', cap(btns[1]) === getComputedStyle(document.querySelector('.t-acts [data-act=del] i')).backgroundColor && cap(btns[1]) !== cap(btns[0]));
  ok('archive and return capsules share the grey', cap(btns[0]) === cap(box.querySelector('.t-row[data-id=arc] [data-act=restore]')));
  ok('capsule icons are white', getComputedStyle(btns[0].querySelector('svg')).stroke === 'rgb(255, 255, 255)');
  ok('labels are 12 px', getComputedStyle(btns[0]).fontSize === '12px');

  $('tTabs').querySelector('[data-t=month]').click();
  tv.day = shift(3); tv.month = new Date(parseKey(tv.day).getFullYear(), parseKey(tv.day).getMonth(), 1); renderTasks();
  ok('month rows have the same buttons', acts($('tMonthItems'), 'fut') === 'arch,del');
  closeOverlay($('tasksOv'));
  await until(() => $('tasksOv').hidden);
  ok('home block rows have the same buttons', acts($('dayTasks'), 'act') === 'arch,del' && acts($('dayTasks'), 'fin') === 'del');
}

{
  show({ habits: [], log: {}, tasks: [A('f', { date: shift(2), time: '10:00', remind: 15 }), A('t', { date: T }), A('n')] });
  archiveTask(findTask('f'));
  ok('future task can be archived', findTask('f').archivedAt === T);
  ok('archived future task leaves its day', !dayTasks(state.tasks, shift(2), T).length);
  ok('archived future task leaves the month dots', !dayMarks(state.tasks, T)[shift(2)]);
  ok('archived future task is in the archive group', taskGroups(state.tasks, T).archived.map(t => t.id).join() === 'f' && !taskGroups(state.tasks, T).upcoming.length);
  ok('archive survives normalize', normalize(JSON.parse(JSON.stringify(state))).tasks.find(t => t.id === 'f').archivedAt === T);
  restoreTask(findTask('f'));
  ok('return puts it back on its day', dayTasks(state.tasks, shift(2), T).map(t => t.id).join() === 'f' && dayMarks(state.tasks, T)[shift(2)].n === 1);
  archiveTask(findTask('t'));
  ok('archived today task leaves the badge and the home block', $('tasksBadge').hidden && pendingToday(state.tasks, T) === 0 && !$('dayTasks').querySelector('[data-id=t]'));
  archiveTask(findTask('n'));
  ok('task without a date can be archived', findTask('n').archivedAt === T && !taskGroups(state.tasks, T).nodate.length);
  openTasks(); await until(() => $('tasksOv')._shown);
  openArch();
  ok('archived task without a date has no date line', !$('tItems').querySelector('.t-row[data-id=n] .t-meta'));
  $('tItems').querySelector('.t-row[data-id=t] .t-box').click();
  ok('checking an archived task finishes it and leaves the archive', findTask('t').done && !('archivedAt' in findTask('t')));
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  restoreTask(findTask('n'));
  await openForm(findTask('n'));
  ok('form offers archive for a task without a date', !$('tfArchive').hidden && $('tfArchive').textContent === 'В архив');
  $('tfArchive').click(); await until(() => $('tFormOv').hidden);
  ok('archive from the form works for any task', findTask('n').archivedAt === T);
  await openForm(findTask('t'));
  ok('finished task has no archive button', $('tfArchive').hidden);
  await closeForm();
}

{
  show({ habits: [], log: {}, tasks: [A('w', { date: shift(1) })] });
  await openForm(findTask('w'));
  const row = $('tfTimeRow'), ph = $('tfTimePh');
  ok('empty time shows a muted label', row.classList.contains('empty') && visible(ph) && ph.textContent === 'Не задано');
  ok('empty time has no grey box', getComputedStyle($('tfTime')).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle($('tfTime')).borderTopWidth === '0px');
  ok('time field keeps its label and description', $('tfTime').labels[0]?.textContent === 'Время' && $('tfTime').getAttribute('aria-describedby') === 'tfTimePh');
  ok('time input is 16 px and fills the row', parseFloat(getComputedStyle($('tfTime')).fontSize) >= 16 && $('tfTime').getBoundingClientRect().width > 120);
  setTime('09:30');
  ok('picked time is shown without the label', !row.classList.contains('empty') && !visible(ph) && $('tfTime').value === '09:30' && visible($('tfTimeClear')));
  $('tfTimeClear').click();
  ok('reset moves focus to the time field', document.activeElement === $('tfTime'));
  $('tfNote').focus();
  ok('reset brings the label back', row.classList.contains('empty') && visible(ph) && $('tfTime').value === '' && !visible($('tfTimeClear')));
  await closeForm();
}

{
  show({ habits: [], log: {}, tasks: [A('r', { date: shift(2), time: '18:00', remind: 0 })] });
  await openForm(findTask('r'));
  ok('chips offer the presets and other', [...$('tfRem').querySelectorAll('button')].map(b => b.textContent).join() === 'Нет,В срок,За 15 мин,За час,За день,Другое…');
  ok('chips sit in even rows', (() => { const tops = [...$('tfRem').children].map(b => Math.round(b.getBoundingClientRect().top)); return new Set(tops).size === 2 && tops.filter(t => t === tops[0]).length === 3; })());
  ok('custom row starts closed', $('tfRemCustom').hidden && $('tfRem').querySelector('[data-v=other]').getAttribute('aria-expanded') === 'false');
  $('tfRem').querySelector('[data-v=other]').click();
  ok('other opens number, units and done', visible($('tfRemCustom')) && visible($('tfRemNum')) && $('tfRemUnit').querySelectorAll('button').length === 3 && visible($('tfRemOk')) && $('tfRem').querySelector('[data-v=other]').getAttribute('aria-expanded') === 'true');
  ok('number field is 16 px with a label', parseFloat(getComputedStyle($('tfRemNum')).fontSize) >= 16 && !!$('tfRemNum').getAttribute('aria-label'));
  ok('controls are tall enough', [$('tfRemNum'), $('tfRemOk')].every(el => el.getBoundingClientRect().height >= 44));
  $('tfRemNum').value = '0'; $('tfRemOk').click();
  ok('zero is not accepted', visible($('tfRemErr')) && $('tfRemErr').textContent === 'Введите целое число от 1' && pressed().join() === 'В срок');
  $('tfRemNum').value = '1.5'; $('tfRemOk').click();
  ok('fraction is not accepted', visible($('tfRemErr')) && pressed().join() === 'В срок');
  $('tfRemNum').value = '31'; $('tfRemUnit').querySelector('[data-u="1440"]').click(); $('tfRemOk').click();
  ok('more than 30 days is not accepted', visible($('tfRemErr')) && $('tfRemErr').textContent === 'Не больше 30 дней' && pressed().join() === 'В срок');
  $('tfRemNum').value = '721'; $('tfRemUnit').querySelector('[data-u="60"]').click(); $('tfRemOk').click();
  ok('limit applies to hours too', $('tfRemErr').textContent === 'Не больше 30 дней' && visible($('tfRemErr')));
  $('tfRemNum').value = '150'; $('tfRemUnit').querySelector('[data-u="1"]').click();
  ok('unit choice is shown', $('tfRemUnit').querySelector('[aria-checked=true]').dataset.u === '1' && !visible($('tfRemErr')));
  $('tfRemNum').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('enter applies the value', !visible($('tfRemCustom')) && pressed().join() === 'За 2 ч 30 мин', pressed());
  const wide = $('tfRem').querySelector('.t-chip-wide');
  ok('custom value is a separate full-width chip', !!wide && wide.getBoundingClientRect().width >= $('tfRem').getBoundingClientRect().width - 1 && !!$('tfRem').querySelector('[data-v=other]'));
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('custom value is saved', findTask('r').remind === 150);
  await openForm(findTask('r'));
  ok('custom value comes back on open', pressed().join() === 'За 2 ч 30 мин');
  $('tfRem').querySelector('[data-v=other]').click();
  ok('other starts from the saved value', $('tfRemNum').value === '150' && $('tfRemUnit').querySelector('[aria-checked=true]').dataset.u === '1');
  $('tfRemNum').value = '3'; $('tfRemUnit').querySelector('[data-u="1440"]').click(); $('tfRemOk').click();
  ok('days are applied', pressed().join() === 'За 3 дн.' && !$('tfRem').querySelector('.t-chip-wide + .t-chip-wide'));
  $('tfRem').querySelector('[data-v="60"]').click();
  ok('preset replaces the custom chip', pressed().join() === 'За час' && !$('tfRem').querySelector('.t-chip-wide'));
  $('tfRem').querySelector('[data-v=other]').click();
  ok('other starts from a preset in hours', $('tfRemNum').value === '1' && $('tfRemUnit').querySelector('[aria-checked=true]').dataset.u === '60');
  $('tfRem').querySelector('[data-v=other]').click();
  ok('second tap on other closes it', !visible($('tfRemCustom')));
  $('tfRem').querySelector('[data-v=""]').click();
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('turning the reminder off removes it', !('remind' in findTask('r')) && findTask('r').time === '18:00');
  show({ habits: [], log: {}, tasks: [A('big', { date: shift(40), time: '10:00', remind: 43200 })] });
  await openForm(findTask('big'));
  ok('30 days reads in days', pressed().join() === 'За 30 дн.');
  await closeForm();
}

{
  const now = new Date(), pad = n => String(n).padStart(2, '0'), ago = new Date(now.getTime() - 2 * 3600e3);
  const pastDay = key(ago), past = `${pad(ago.getHours())}:${pad(ago.getMinutes())}`;
  show({ habits: [], log: {}, tasks: [A('p', { date: pastDay, time: past, remind: 0 }), A('q', { date: shift(3), time: '10:00', remind: 0 }), A('d', { date: pastDay, time: past, remind: 0, done: true, doneAt: T })] });
  await openForm(findTask('p'));
  ok('missed reminder shows a warning', visible($('tfRemLate')) && $('tfRemLate').textContent.startsWith('Это время уже прошло'));
  $('tfRem').querySelector('[data-v=""]').click();
  ok('no reminder means no warning', !visible($('tfRemLate')));
  await closeForm();
  await openForm(findTask('q'));
  ok('future reminder has no warning', !visible($('tfRemLate')));
  $('tfRem').querySelector('[data-v=other]').click();
  $('tfRemNum').value = '30'; $('tfRemUnit').querySelector('[data-u="1440"]').click(); $('tfRemOk').click();
  ok('custom reminder in the past shows the warning', visible($('tfRemLate')));
  await closeForm();
  await openForm(findTask('d'));
  ok('finished task has no warning', !visible($('tfRemLate')));
  await closeForm();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, date: T, time: '10:00', remind: 150 }), A('y', { text: x, date: shift(1), archivedAt: T })] });
  openTasks(); await until(() => $('tasksOv')._shown);
  openArch();
  ok('swipe rows escape the text', !document.querySelector('#tItems img, #dayTasks img') && [...$('tItems').querySelectorAll('.t-text')].every(e => e.textContent.startsWith('<img')));
  await openForm(findTask('x'));
  ok('form with a custom reminder escapes the text', !document.querySelector('#tFormOv img') && $('tfText').value === x);
  await closeForm();
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
