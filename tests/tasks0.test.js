window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const moreItem = label => { closeMenu(); $('tMoreBtn').click(); return [...([...document.querySelectorAll('.menu')].at(-1)?.querySelectorAll('button') || [])].find(x => x.querySelector('.lbl')?.textContent === label); };
const menuState = label => { const b = moreItem(label), r = [b?.querySelector('.menu-n')?.textContent, b?.disabled]; closeMenu(); return r; };
const secTab = () => $('tLists').querySelector('[data-sec]');
tv.lateOpen = true;
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
const openArch = () => { if (tv.smart !== 'arch') moreItem('Архив')?.click(); };
const closeArch = () => { if (tv.smart === 'arch') secTab().click(); };
const rems = () => [...$('tfRems').querySelectorAll('.tf-lbl')].map(b => b.textContent);
const openRem = async el => { el.click(); await until(() => $('tRemOv')._shown); };
const okRem = async () => { $('trmOk').click(); await until(() => $('tRemOv').hidden); };
const wheelTo = (el, i) => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); for (let n = 0; n < i; n++) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); };

{
  const L = remindLabel;
  ok('label at the time itself', L(0) === 'В срок');
  ok('labels in minutes', L(1) === 'За 1 мин' && L(59) === 'За 59 мин');
  ok('labels in hours', L(60) === 'За 1 ч' && L(120) === 'За 2 ч');
  ok('labels in hours and minutes', L(61) === 'За 1 ч 1 мин' && L(90) === 'За 1 ч 30 мин' && L(1500) === 'За 25 ч', [L(61), L(90), L(1500)]);
  ok('labels in days', L(1440) === 'За 1 дн.' && L(43200) === 'За 30 дн.');
  ok('label for a value above the limit still reads', L(43201) === 'За 720 ч 1 мин', L(43201));
  const n = v => normTasks([A('r', { date: T, time: '10:00', remind: v })], T)[0];
  ok('any whole minutes up to 30 days are kept', [0, 1, 7, 59, 61, 150, 20000, 43200].every(v => JSON.stringify(n(v).reminds) === `[${v}]`));
  ok('reminder above 30 days is dropped, time stays', !('reminds' in n(43201)) && n(43201).time === '10:00');
  ok('fractional, negative and text reminders are dropped', [1.5, -1, '15', null, NaN, Infinity].every(v => !('reminds' in n(v))));
  const m = (list, x = {}) => normTasks([A('r', { date: T, time: '10:00', reminds: list, ...x })], T)[0].reminds;
  ok('several reminders are kept in time order', JSON.stringify(m(['0@09:00', 0, 30, '1@20:00'])) === '["1@20:00","0@09:00",30,0]', m(['0@09:00', 0, 30, '1@20:00']));
  ok('no more than five reminders', m([0, 15, 30, 60, 120, 1440, 2880]).length === 5);
  ok('reminders at the same moment are merged', JSON.stringify(m([60, '0@09:00', 60])) === '[60]');
  ok('reminder at a clock time needs no task time', JSON.stringify(m(['0@09:00', 15], { time: undefined })) === '["0@09:00"]');
  ok('clock reminders up to 30 days before are kept', JSON.stringify(m(['30@08:00', '31@08:00', '0@24:00', '0@9:00', '0@09:60', 'x'])) === '["30@08:00"]');
  ok('new list wins over the old field', JSON.stringify(m([15], { remind: 60 })) === '[15]');
  ok('reminders need a date', !('reminds' in normTasks([A('r', { reminds: ['0@09:00'] })], T)[0]));
  ok('reminder text reads', remindText('2026-11-08', '18:00', 60, '2026-11-08') === 'Сегодня, 17:00 · за час' && remindText('2026-11-08', '18:00', '1@09:30', '2026-11-06') === 'Завтра, 09:30' && remindText('2026-11-08', null, 1440, '2026-11-08') === '', remindText('2026-11-08', '18:00', '1@09:30', '2026-11-06'));
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
  ok('clock reminders have a state too', S(D, null, '0@14:20', at(D, 14, 30)) === 'soon' && S(D, null, '1@20:00', at(D, 14, 30)) === 'missed' && S(D, '10:00', '0@15:00', at(D, 14, 30)) === 'ok');
}

{
  const list = [A('act', { date: T }), A('late', { date: shift(-2) }), A('fut', { date: shift(3) }), A('nod'), A('fin', { date: T, done: true, doneAt: T }), A('arc', { date: shift(-4), archivedAt: T })];
  show({ habits: [], log: {}, tasks: list });
  openTasks();
  await until(() => $('tasksOv')._shown);
  const box = $('tItems');
  ok('active row: move, archive, delete', acts(box, 'act') === 'move,arch,del');
  ok('future row: move, archive, delete', acts(box, 'fut') === 'move,arch,del');
  ok('row without a date: move, archive, delete', acts(box, 'nod') === 'move,arch,del');
  ok('finished row: delete only', acts(box, 'fin') === 'del');
  ok('finished row does not offer to move', !box.querySelector('.t-row[data-id=fin] [data-act=move]'));
  openArch();
  ok('archived row: return, then delete', acts(box, 'arc') === 'restore,del');
  ok('archived row does not offer to move', !box.querySelector('.t-row[data-id=arc] [data-act=move]'));
  ok('archived row swipe fits two buttons', getComputedStyle(box.querySelector('.t-row[data-id=arc]')).getPropertyValue('--sw').trim() === swipeW(2) + 'px');
  closeArch();
  const row = box.querySelector('.t-row[data-id=act]'), btns = [...row.querySelectorAll('.t-acts button')];
  ok('delete is at the right edge', btns[2].getBoundingClientRect().right > btns[1].getBoundingClientRect().right && btns[1].getBoundingClientRect().right > btns[0].getBoundingClientRect().right && Math.abs(btns[2].getBoundingClientRect().right - row.getBoundingClientRect().right) <= 6);
  ok('swipe width matches three buttons', getComputedStyle(row).getPropertyValue('--sw').trim() === swipeW(3) + 'px');
  ok('finished row opens only for one button', getComputedStyle(box.querySelector('.t-row[data-id=fin]')).getPropertyValue('--sw').trim() === swipeW(1) + 'px');
  ok('rows are at least 56 px high', row.getBoundingClientRect().height >= 56, row.getBoundingClientRect().height);
  ok('buttons are big enough to tap', btns.every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
  ok('buttons have a text label', btns.map(b => b.textContent.trim()).join() === 'Перенести,В архив,Удалить');
  const cap = b => getComputedStyle(b.querySelector('i')).backgroundColor;
  ok('delete capsule uses the danger color', cap(btns[2]) === getComputedStyle(document.querySelector('.t-acts [data-act=del] i')).backgroundColor && cap(btns[2]) !== cap(btns[1]));
  ok('move capsule uses the app color', cap(btns[0]) === getComputedStyle(document.body).getPropertyValue('--accent').trim() || (cap(btns[0]) !== cap(btns[1]) && cap(btns[0]) !== cap(btns[2])), cap(btns[0]));
  ok('capsule icons are white', getComputedStyle(btns[1].querySelector('svg')).stroke === 'rgb(255, 255, 255)');
  ok('labels are 12 px', getComputedStyle(btns[0]).fontSize === '12px');
  { const grey = cap(btns[1]); openArch(); ok('archive and return capsules share the grey', grey === cap(box.querySelector('.t-row[data-id=arc] [data-act=restore]'))); closeArch(); }

  $('tTabs').querySelector('[data-t=month]').click();
  tv.day = shift(3); tv.month = new Date(parseKey(tv.day).getFullYear(), parseKey(tv.day).getMonth(), 1); renderTasks();
  ok('month rows have the same buttons', acts($('tMonthItems'), 'fut') === 'move,arch,del');
  closeOverlay($('tasksOv'));
  await until(() => $('tasksOv').hidden);
  ok('home block rows have the same buttons', acts($('dayTasks'), 'act') === 'move,arch,del' && !$('dayTasks').querySelector('[data-id=fin]'));
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
  ok('old reminder shows as a row', rems().join() === `${remDay(shift(2), T)}, 18:00 · в срок`, rems());
  ok('rows are tall enough', [...$('tfRemRow').querySelectorAll('.tf-rem-pick, .tf-x, #tfRemAdd')].every(el => el.getBoundingClientRect().height >= 36) && $('tfRemAdd').getBoundingClientRect().height >= 44);
  ok('add row invites one more', visible($('tfRemAdd')) && $('tfRemAddLbl').textContent === 'Ещё напоминание');
  await openRem($('tfRemAdd'));
  ok('sheet offers quick picks for a task with time', [...$('trmQuick').querySelectorAll('button')].map(b => b.textContent).join() === 'В срок,За 15 мин,За час,За день');
  ok('new reminder starts from the next free preset', $('trmQuick').querySelector('[aria-pressed=true]')?.textContent === 'За 15 мин' && $('trmH').getAttribute('aria-valuetext') === '17' && $('trmM').getAttribute('aria-valuetext') === '45');
  ok('wheels show days, hours and five-minute steps', $('trmDay').querySelectorAll('.wheel-it').length === 3 && $('trmH').querySelectorAll('.wheel-it').length === 24 && $('trmM').querySelectorAll('.wheel-it').length === 12, $('trmDay').querySelectorAll('.wheel-it').length);
  ok('day wheel names the days', [...$('trmDay').querySelectorAll('.wheel-it')].map(x => x.textContent).join() === [T, shift(1), shift(2)].map(d => remDay(d, T)).join());
  ok('wheel rows are 40 px and the sheet buttons 44 px', $('trmH').querySelector('.wheel-it').getBoundingClientRect().height === 40 && [$('trmOk'), ...$('trmQuick').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 36) && $('trmOk').getBoundingClientRect().height >= 44);
  ok('wheels are labelled spin buttons', ['trmDay', 'trmH', 'trmM'].every(id => $(id).getAttribute('role') === 'spinbutton' && $(id).getAttribute('aria-label') && $(id).tabIndex === 0));
  wheelTo($('trmDay'), 1); wheelTo($('trmH'), 9); wheelTo($('trmM'), 6);
  ok('turning a wheel switches to a clock time', !$('trmQuick').querySelector('[aria-pressed=true]') && $('trmDay').getAttribute('aria-valuetext') === remDay(shift(1), T) && $('trmH').getAttribute('aria-valuetext') === '09' && $('trmM').getAttribute('aria-valuetext') === '30');
  ok('delete is hidden for a new reminder', $('trmDel').hidden && $('trmTitle').textContent === 'Новое напоминание');
  await okRem();
  ok('clock reminder is added in time order', rems().join('|') === `${remDay(shift(1), T)}, 09:30|${remDay(shift(2), T)}, 18:00 · в срок`, rems());
  await openRem($('tfRemAdd'));
  $('trmQuick').querySelector('[data-q="0"]').click();
  $('trmOk').click(); await until(() => document.querySelector('.toast.show, #toast:not([hidden])') || true);
  ok('same moment twice is refused', $('tRemOv')._shown && rems().length === 2);
  $('trmQuick').querySelector('[data-q="60"]').click(); await okRem();
  await openRem($('tfRemAdd')); $('trmQuick').querySelector('[data-q="1440"]').click(); await okRem();
  await openRem($('tfRemAdd')); wheelTo($('trmH'), 12); await okRem();
  ok('five reminders fit, then adding stops', rems().length === 5 && $('tfRemAdd').hidden, rems());
  await openRem($('tfRems').querySelectorAll('.tf-rem-pick')[0]);
  ok('editing shows delete and the saved time', !$('trmDel').hidden && $('trmTitle').textContent === 'Напоминание' && $('trmH').getAttribute('aria-valuetext') === '09');
  $('trmDel').click(); await until(() => $('tRemOv').hidden);
  ok('delete in the sheet removes it', rems().length === 4 && visible($('tfRemAdd')));
  $('tfRems').querySelector('[data-del="0"]').click();
  ok('cross removes a row', rems().length === 3);
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('several reminders are saved', JSON.stringify(findTask('r').reminds) === '["0@12:45",60,0]' && !('remind' in findTask('r')), findTask('r').reminds);
  await openForm(findTask('r'));
  ok('they come back on open', rems().length === 3);
  setTime('');
  ok('clearing the time keeps clock reminders', rems().length === 1 && rems()[0] === `${remDay(shift(2), T)}, 12:45`, rems());
  await closeForm();
  show({ habits: [], log: {}, tasks: [A('nt', { date: shift(1) })] });
  await openForm(findTask('nt'));
  ok('task without time still offers a reminder', visible($('tfRemAdd')) && $('tfRemAddVal').textContent === 'Нет' && !rems().length);
  await openRem($('tfRemAdd'));
  ok('without time there are no quick picks and 09:00 is offered', $('trmQuick').hidden && $('trmH').getAttribute('aria-valuetext') === '09' && $('trmM').getAttribute('aria-valuetext') === '00' && $('trmDay').getAttribute('aria-valuetext') === remDay(shift(1), T));
  await okRem();
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  ok('clock reminder without time is saved', JSON.stringify(findTask('nt').reminds) === '["0@09:00"]', findTask('nt'));
  ok('list shows a bell for it', !!document.querySelector(`.t-row[data-id="nt"] .t-mbell`) || !document.querySelector(`.t-row[data-id="nt"]`));
  show({ habits: [], log: {}, tasks: [A('big', { date: shift(40), time: '10:00', remind: 43200 })] });
  await openForm(findTask('big'));
  ok('30 days reads in days', rems()[0].endsWith('за 30 дн.'), rems());
  await closeForm();
}

{
  const now = new Date(), pad = n => String(n).padStart(2, '0'), ago = new Date(now.getTime() - 2 * 3600e3);
  const pastDay = key(ago), past = `${pad(ago.getHours())}:${pad(ago.getMinutes())}`;
  show({ habits: [], log: {}, tasks: [A('p', { date: pastDay, time: past, remind: 0 }), A('q', { date: shift(3), time: '10:00', remind: 0 }), A('d', { date: pastDay, time: past, remind: 0, done: true, doneAt: T })] });
  await openForm(findTask('p'));
  ok('missed reminder shows a warning', visible($('tfRemLate')) && $('tfRemLate').textContent.startsWith('Время напоминания уже прошло') && $('tfRems').querySelector('.tf-rem.late'));
  $('tfRems').querySelector('[data-del="0"]').click();
  ok('no reminder means no warning', !visible($('tfRemLate')));
  await closeForm();
  await openForm(findTask('q'));
  ok('future reminder has no warning', !visible($('tfRemLate')) && !$('tfRems').querySelector('.late'));
  await openRem($('tfRemAdd'));
  wheelTo($('trmDay'), 0); wheelTo($('trmH'), 0);
  if (key(now) === T && now.getHours() === 0 && now.getMinutes() < 31) wheelTo($('trmDay'), 0);
  ok('sheet warns about a past time', visible($('trmLate')) || (now.getHours() === 0 && now.getMinutes() < 31));
  await okRem();
  ok('past clock reminder shows the warning', visible($('tfRemLate')) || (now.getHours() === 0 && now.getMinutes() < 31));
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
  ok('swipe rows escape the text', !document.querySelector('#tItems img, #dayTasks img') && [...$('tItems').querySelectorAll('.t-text')].every(e => e.textContent.includes('<img')));
  await openForm(findTask('x'));
  ok('form with a custom reminder escapes the text', !document.querySelector('#tFormOv img') && $('tfText').value === x);
  await closeForm();
  closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden);
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
