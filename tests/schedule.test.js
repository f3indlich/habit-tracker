window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const P = parseKey, T = todayKey();
const show = s => { state = s; viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };
const H = (sc, extra = {}) => ({ id: 'x', name: 'X', created: '2020-01-01', target: 1, ...(sc ? { schedule: sc } : {}), ...extra });
const empty = { habits: [], log: {}, skip: {} };

ok('daily is due every day', ['2026-03-01', '2026-03-02', '2026-07-15'].every(k => isDue(H({ type: 'daily' }), P(k), empty)));
const wd = H({ type: 'weekdays', days: [0, 2] });
ok('weekdays: Monday and Wednesday only', isDue(wd, P('2026-03-02'), empty) && !isDue(wd, P('2026-03-03'), empty) && isDue(wd, P('2026-03-04'), empty) && !isDue(wd, P('2026-03-08'), empty));
const ew = H({ type: 'everyNWeeks', every: 2, days: [0, 4], anchor: '2026-01-07' });
ok('every 2 weeks: anchor week is due', isDue(ew, P('2026-01-05'), empty) && isDue(ew, P('2026-01-09'), empty));
ok('every 2 weeks: odd week is not due', !isDue(ew, P('2026-01-12'), empty) && !isDue(ew, P('2026-01-16'), empty));
ok('every 2 weeks: even week again', isDue(ew, P('2026-01-19'), empty) && !isDue(ew, P('2026-01-20'), empty));
ok('every 2 weeks: weeks before anchor follow the same rhythm', isDue(ew, P('2025-12-22'), empty) && !isDue(ew, P('2025-12-29'), empty));
const e3 = H({ type: 'everyNWeeks', every: 3, days: [6], anchor: '2026-12-27' });
ok('every 3 weeks across new year', isDue(e3, P('2026-12-27'), empty) && !isDue(e3, P('2027-01-03'), empty) && !isDue(e3, P('2027-01-10'), empty) && isDue(e3, P('2027-01-17'), empty));
const m31 = H({ type: 'monthly', dom: 31 });
ok('monthly 31: 31st in long months', isDue(m31, P('2026-01-31'), empty) && !isDue(m31, P('2026-01-30'), empty));
ok('monthly 31: April falls on the 30th', isDue(m31, P('2026-04-30'), empty) && !isDue(m31, P('2026-04-29'), empty));
ok('monthly 31: February 28 in common year', isDue(m31, P('2026-02-28'), empty) && !isDue(m31, P('2026-02-27'), empty));
ok('monthly 31: February 29 in leap year', isDue(m31, P('2028-02-29'), empty) && !isDue(m31, P('2028-02-28'), empty));
const m30 = H({ type: 'monthly', dom: 30 }), m28 = H({ type: 'monthly', dom: 28 });
ok('monthly 30: last day of February, 30th otherwise', isDue(m30, P('2026-02-28'), empty) && isDue(m30, P('2026-04-30'), empty) && !isDue(m30, P('2026-05-31'), empty));
ok('monthly 28: only the 28th', isDue(m28, P('2028-02-28'), empty) && !isDue(m28, P('2028-02-29'), empty) && isDue(m28, P('2026-03-28'), empty));
ok('not due before creation or after archive', !isDue(H({ type: 'daily' }, { created: '2026-03-10' }), P('2026-03-09'), empty) && !isDue(H({ type: 'daily' }, { archived: '2026-03-10' }), P('2026-03-11'), empty) && isDue(H({ type: 'daily' }, { archived: '2026-03-10' }), P('2026-03-10'), empty));
ok('skip does not cancel due', isDue(H({ type: 'daily' }), P('2026-03-02'), { log: {}, skip: { '2026-03-02': { x: 1 } } }));

const old = normalize({ habits: [{ id: 'a', name: 'A', days: [1, 3, 5], created: '2026-01-01' }, { id: 'b', name: 'B', created: '2026-01-01' }], log: {} }).habits;
let same = true;
for (let i = 0; i < 70; i++) { const d = addDays(P('2026-01-01'), i); for (const h of old) if (isDue(h, d, empty) !== (!h.days || h.days.includes(weekday(d)))) same = false; }
ok('old habits without schedule behave as before', same && !('schedule' in old[0]) && !('schedule' in old[1]));
ok('schedule text for old habits unchanged', schedText(old[0]) === 'Вт, Чт, Сб' && schedText(old[1]) === 'каждый день');

const junk = normalize({ habits: [
  { id: 'j1', name: 'a', schedule: { type: 'hourly' } }, { id: 'j2', name: 'b', schedule: { type: 'perWeek', times: 9 } },
  { id: 'j3', name: 'c', schedule: { type: 'monthly', dom: 0 } }, { id: 'j4', name: 'd', schedule: { type: 'everyNWeeks', every: 1, days: [0] } },
  { id: 'j5', name: 'e', schedule: { type: 'everyNWeeks', every: 3, days: [] } }, { id: 'j6', name: 'f', schedule: 'perWeek' },
  { id: 'j7', name: 'g', schedule: { type: 'weekdays', days: [1, 2] }, days: [3] }, { id: 'j8', name: 'h', schedule: { type: 'perWeek', times: 2 }, days: [1] },
  { id: 'g1', name: 'i', schedule: { type: 'perWeek', times: 4, extra: 1 } }, { id: 'g2', name: 'j', created: '2026-02-02', schedule: { type: 'everyNWeeks', every: 2, days: [4, 0, 4, 9], anchor: 'x' } },
  { id: 'g3', name: 'k', schedule: { type: 'monthly', dom: 31 } }, { id: 'g4', name: 'l', schedule: { type: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] } },
], log: {} }).habits;
ok('normalize drops junk schedules', junk.slice(0, 6).every(h => !('schedule' in h)), junk.slice(0, 6).map(h => h.schedule));
ok('old device edits of days win over schedule', !('schedule' in junk[6]) && !('schedule' in junk[7]) && String(junk[6].days) === '3');
ok('normalize keeps valid schedules', JSON.stringify(junk[8].schedule) === '{"type":"perWeek","times":4}' && JSON.stringify(junk[9].schedule) === '{"type":"everyNWeeks","every":2,"days":[0,4],"anchor":"2026-02-02"}' && junk[10].schedule.dom === 31, [junk[8].schedule, junk[9].schedule]);
ok('weekdays with all days becomes daily', junk[11].schedule?.type === 'daily' || !junk[11].schedule, junk[11].schedule);

const Bm = { habits: [{ id: 'a', name: 'A', created: '2026-01-01' }], log: {} };
const Lm = { habits: [{ id: 'a', name: 'A', created: '2026-01-01', schedule: { type: 'perWeek', times: 3 } }], log: {} };
const Rm = { habits: [{ id: 'a', name: 'A', created: '2026-01-01' }, { id: 'b', name: 'B', created: '2026-01-01', schedule: { type: 'monthly', dom: 5 } }], log: {} };
const mm = mergeStates(Bm, Lm, Rm);
ok('merge keeps schedule from both devices', mm.habits.find(h => h.id === 'a').schedule?.times === 3 && mm.habits.find(h => h.id === 'b').schedule?.dom === 5, mm.habits);
const sg = { id: 's', created: '2026-01-01', target: 1, schedule: { type: 'monthly', dom: 1 }, goals: [{ until: '2026-02-28', target: 1, unit: '', sched: { type: 'weekdays', days: [0] } }] };
ok('scheduleOn uses schedule of the day', scheduleOn(sg, '2026-02-10').type === 'weekdays' && scheduleOn(sg, '2026-03-10').type === 'monthly');
ok('history keeps past days due', isDue(sg, P('2026-02-02'), empty) && !isDue(sg, P('2026-02-01'), empty) && isDue(sg, P('2026-03-01'), empty) && !isDue(sg, P('2026-03-02'), empty));
const sg2 = { ...sg, goals: [{ until: '2026-01-31', target: 2, unit: '' }, { until: '2026-02-28', target: 1, unit: '', sched: { type: 'weekdays', days: [0] } }] };
ok('old entry without schedule uses next known', scheduleOn(sg2, '2026-01-15').type === 'weekdays');

const pw = { id: 'p', name: 'P', created: '2025-12-01', target: 1, schedule: { type: 'perWeek', times: 3 } };
const ws = P('2025-12-29');
const pwLog = { '2025-12-29': { p: 1 }, '2026-01-02': { p: 1 }, '2026-01-04': { p: 1 }, '2026-01-06': { p: 1 } };
const pwS = { habits: [pw], log: pwLog, skip: {} };
ok('week quota', weekQuota(pw, ws) === 3 && weekQuota(pw, P('2026-01-01')) === 3);
ok('week done across new year', weekDone(pw, pwS, ws) === 3 && weekDone(pw, pwS, P('2026-01-04')) === 3, weekDone(pw, pwS, ws));
ok('week remaining', weekRemaining(pw, pwS, ws) === 0 && weekRemaining(pw, pwS, P('2026-01-05')) === 2);
ok('quota limited in first week', weekQuota({ ...pw, created: '2026-01-03' }, ws) === 2);
const pwMonth = { habits: [pw], log: { '2026-01-26': { p: 1 }, '2026-02-01': { p: 1 } }, skip: {} };
ok('week across months', weekDone(pw, pwMonth, P('2026-01-28')) === 2 && weekDone(pw, pwMonth, P('2026-02-01')) === 2);
ok('perWeek: done day is due', isDue(pw, P('2026-01-02'), pwS));
ok('perWeek: empty weekday is not a miss', !isDue(pw, P('2026-01-07'), pwS) && !isDue(pw, P('2026-01-08'), pwS));
ok('perWeek: shortfall counted once on Sunday', isDue(pw, P('2026-01-11'), pwS) && !isDue(pw, P('2026-01-10'), pwS));
ok('perWeek: full week Sunday not a miss', !isDue(pw, P('2026-01-03'), pwS));

const mon = monday(new Date()), tk = T;
const daysBack = Math.round((P(tk) - mon) / 864e5);
const log = {};
for (let i = 0; i < 30; i++) log[ago(i + 1)] = { d: 1 };
show(normalize({ habits: [
  { id: 'd', name: 'Каждый день', created: ago(40) },
  { id: 'm', name: 'Раз в месяц', created: ago(400), schedule: { type: 'monthly', dom: new Date().getDate() === 1 ? 2 : 1 } },
  { id: 'q', name: 'Неделя', created: ago(400), schedule: { type: 'perWeek', times: 2 } },
], log }));
await wait(400);
ok('ring counts due habits and open week quota', $('heroTotal').textContent === '2', $('heroTotal').textContent);
ok('not due monthly sits in the not-today group', cards.get('m').closest('.section').querySelector('.sec-t').textContent.includes('Не сегодня'));
ok('not due monthly shows next date', cards.get('m').querySelector('.m-lead').textContent.startsWith('Следующий раз:'));
ok('not due monthly has no miss badge', !cards.get('m').querySelector('.m-warn.on'));
ok('weekly card shows week progress', /из 2 на этой неделе/.test(cards.get('q').querySelector('.m-lead').textContent), cards.get('q').querySelector('.m-lead').textContent);
habitMenu(cards.get('q').querySelector('.more'), 'q');
const qMenu = menuEl?.textContent || '';
closeMenu();
ok('weekly has no skip action', qMenu.includes('История') && !qMenu.includes('Пропустить'), qMenu);
const q = findHabit('q');
setCount(q, new Date(), 1); render(); await wait(300);
ok('weekly done today stays counted', $('heroTotal').textContent === '2' && dayProgress(new Date()).done === 1, [$('heroTotal').textContent, dayProgress(new Date())]);
setCount(q, new Date(), 0);
if (daysBack >= 2) {
  setCount(q, addDays(new Date(), -1), 1); setCount(q, addDays(new Date(), -2), 1); render(); await wait(300);
  ok('weekly drops out of ring after quota met', $('heroTotal').textContent === '1' && /На эту неделю всё сделано/.test(cards.get('q').querySelector('.m-lead').textContent), [$('heroTotal').textContent, cards.get('q').querySelector('.m-lead').textContent]);
} else ok('weekly drops out after quota met (early in week: checked on a past week)', !isDue(pw, P('2026-01-03'), pwS) && !isDue(pw, P('2026-01-01'), pwS));

const wdLog = {};
for (let i = 1; i <= 21; i++) { const d = addDays(new Date(), -i); if (weekday(d) < 5) wdLog[key(d)] = { w: 1 }; }
show(normalize({ habits: [{ id: 'w', name: 'Будни', created: ago(30), days: [0, 1, 2, 3, 4] }], log: wdLog }));
ok('weekday streak not broken by weekends', streak(findHabit('w')) >= 14);
const wkLog = {};
for (let w = 1; w <= 3; w++) { const m0 = addDays(monday(new Date()), -7 * w); wkLog[key(m0)] = { k: 1 }; wkLog[key(addDays(m0, 2))] = { k: 1 }; }
show(normalize({ habits: [{ id: 'k', name: 'Неделя', created: ago(60), schedule: { type: 'perWeek', times: 2 } }], log: wkLog }));
ok('weekly streak counts weeks', streak(findHabit('k')) === 3 && streakText(findHabit('k'), 3) === '3 недели');
ok('weekly streak card text says weeks', cards.get('k').querySelector('.m-streak').textContent.includes('недел'));
openHistory('k'); await wait(600);
ok('history tile says weeks in a row', $('hTiles').textContent.includes('недели подряд'));
closeOverlay($('histOv')); hist = null; await wait(400);

const mLog = {};
for (let i = 1; i <= 60; i++) mLog[ago(i)] = { e: 1 };
show(normalize({ habits: [
  { id: 'e', name: 'Каждый', created: ago(60) },
  { id: 'n', name: 'Месяц', created: ago(60), schedule: { type: 'monthly', dom: 15 } },
], log: { ...mLog } }));
const offDay = [...Array(20).keys()].map(i => addDays(new Date(), -i - 1)).find(d => d.getDate() !== 15);
ok('summary: not due days are not misses', dayInfo(offDay).vals.length === 1 && dayInfo(offDay).vals.every(x => x.h.id === 'e'));
openSummary(); await wait(900);
ok('summary renders with new schedules', $('sSum').textContent.length > 0);
closeOverlay($('sumOv')); await wait(400);

show(normalize({ habits: [{ id: 'f', name: 'Форма', created: ago(20) }], log: { [ago(3)]: { f: 1 } } }));
openForm(); await wait(500);
const vis = id => $(id).classList.contains('open');
const seg = v => $('schedSeg').querySelector(`[data-v=${v}]`).click();
seg('perWeek'); await wait(50);
ok('perWeek shows only count field', vis('timesWrap') && !vis('daysWrap') && !vis('everyWrap') && !vis('domWrap'));
seg('everyNWeeks'); await wait(50);
ok('every N weeks shows N, days and start date', vis('everyWrap') && vis('daysWrap') && !vis('timesWrap'));
seg('monthly'); await wait(50);
$('dom').value = 31; $('dom').dispatchEvent(new Event('input', { bubbles: true })); await wait(50);
ok('monthly shows day field and hint for 31', vis('domWrap') && !vis('daysWrap') && $('schedHint').textContent.includes('последний день'));
ok('schedule inputs at least 16px', ['dom', 'anchor'].every(id => parseFloat(getComputedStyle($(id)).fontSize) >= 16));
seg('perWeek'); $('timesChips').querySelector('[data-v="4"]').click();
$('name').value = 'Бассейн'; $('form').requestSubmit(); await wait(500);
const nb = state.habits.find(h => h.name === 'Бассейн');
ok('save perWeek', nb?.schedule?.type === 'perWeek' && nb.schedule.times === 4 && nb.days === null, nb?.schedule);
openForm(nb.id); await wait(500);
ok('reopen restores perWeek', $('schedSeg').querySelector('[aria-pressed=true]').dataset.v === 'perWeek' && $('timesChips').querySelector('[aria-pressed=true]').dataset.v === '4');
closeOverlay($('formOv')); await wait(400);

const f = findHabit('f');
openForm('f'); await wait(500);
seg('monthly'); $('dom').value = 10; $('dom').dispatchEvent(new Event('input', { bubbles: true }));
$('form').requestSubmit(); await wait(500);
ok('schedule change asks for scope', $('confirm')._shown && $('cText').textContent.includes('расписание'));
closeConfirm(true); await wait(500);
ok('from today: history entry keeps old schedule', f.schedule?.type === 'monthly' && f.goals?.[0]?.sched?.type === 'daily' && isDue(f, P(ago(3))), f.goals);
openForm('f'); await wait(500);
seg('days'); $('weekdays').querySelectorAll('[aria-pressed=true]').forEach(b => b.click());
$('weekdays').querySelector('[data-v="2"]').click();
$('form').requestSubmit(); await wait(500);
$('cChoices').querySelector('[value=all]').checked = true;
closeConfirm(true); await wait(500);
ok('whole history: past days follow new schedule', String(f.days) === '2' && !f.goals?.some(g => g.sched) && isDue(f, P(ago(3))) === (weekday(P(ago(3))) === 2));

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
