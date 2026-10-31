window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const T = todayKey();
const show = s => { state = s; viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };

ok('default plan window is week', planWin === 'week' && PLAN_STORE === NS + '-planwin');
const h0 = { id: 'x', target: 8, created: ago(30) };
ok('targetOn without history is current goal', targetOn(h0, parseKey(ago(5))) === 8 && targetOn(h0, new Date()) === 8);
const hg = normalize({ habits: [{ id: 'g', name: 'G', target: 8, created: ago(60), goals: [{ until: ago(20), target: 4 }, { until: ago(10), target: 6 }] }], log: {} }).habits[0];
ok('targetOn picks goal of each date', targetOn(hg, parseKey(ago(25))) === 4 && targetOn(hg, parseKey(ago(20))) === 4 && targetOn(hg, parseKey(ago(15))) === 6 && targetOn(hg, parseKey(ago(10))) === 6 && targetOn(hg, parseKey(ago(9))) === 8 && targetOn(hg, new Date()) === 8);
// Записи хранят цель «по дату until включительно», поэтому самая ранняя запись действует и для всех дней до неё.
ok('date before first entry uses first entry', targetOn(hg, parseKey(ago(59))) === 4);
ok('targetOn always positive', [25, 15, 5, 0].every(n => targetOn(hg, parseKey(ago(n))) > 0));

const ng = normalize({ habits: [{ id: 'n', name: 'N', target: 8, created: ago(60), goals: [
  null, 'x', { until: 'вчера', target: 3 }, { until: ago(5), target: -2 }, { until: ago(5), target: 0 }, { until: ago(90), target: 3 },
  { until: ago(30), target: 3 }, { until: ago(40), target: 2 }, { until: ago(30), target: 5 },
] }], log: {} }).habits[0];
ok('normalize drops junk goals', ng.goals.length === 2, ng.goals);
ok('normalize sorts goals', ng.goals[0].until === ago(40) && ng.goals[1].until === ago(30), ng.goals);
ok('normalize keeps last duplicate', ng.goals[1].target === 5, ng.goals);
const many = normalize({ habits: [{ id: 'm', name: 'M', target: 8, created: ago(400), goals: Array.from({ length: 300 }, (_, i) => ({ until: ago(399 - i), target: 2 + i % 5 })) }], log: {} }).habits[0];
ok('normalize caps goals at 200', many.goals.length === GOALS_MAX && GOALS_MAX === 200);
ok('normalize keeps old data without goals', !('goals' in normalize({ habits: [{ id: 'o', name: 'O', target: 4 }], log: {} }).habits[0]));

const H = goals => ({ id: 'h', name: 'H', target: 8, created: ago(60), ...(goals ? { goals } : {}) });
const B = { habits: [H([{ until: ago(30), target: 4 }])], log: {} };
const L = { habits: [H([{ until: ago(30), target: 4 }, { until: ago(1), target: 6 }])], log: {} };
const Rm = { habits: [{ ...H([{ until: ago(30), target: 4 }, { until: ago(3), target: 5 }]), name: 'H2' }], log: {} };
const mg = mergeStates(B, L, Rm).habits[0];
ok('merge unions goal history from two devices', mg.goals.map(g => g.until).join() === [ago(30), ago(3), ago(1)].join() && mg.goals.find(g => g.until === ago(1)).target === 6 && mg.goals.find(g => g.until === ago(3)).target === 5, mg.goals);
const md = mergeStates(B, { habits: [H()], log: {} }, B).habits[0];
ok('merge keeps removal for whole history', !md.goals, md.goals);
const mc = mergeStates(B, { habits: [H([{ until: ago(30), target: 3 }])], log: {} }, { habits: [H([{ until: ago(30), target: 7 }])], log: {} }).habits[0];
ok('merge conflict on same date takes changed local side', mc.goals[0].target === 3, mc.goals);

const ex = { id: 'e', name: 'Вода', target: 8, created: ago(10), unit: 'стаканов' };
const vals = [16, 4, 4, 8, 8, 4, 9];
const exLog = Object.fromEntries(vals.map((v, i) => [ago(7 - i), { e: v }]));
const S = { habits: [ex], log: exLog, skip: {} };
const p = planStats(ex, S, ago(7), T, T);
ok('example: plan 56', p.plan === 56 && p.plannedDays === 7, p);
ok('example: fact 53 with overflow', p.fact === 53, p);
ok('example: credited 44', p.credited === 44, p);
ok('example: over 9 (8 + 1)', p.over === 9, p);
ok('example: days done 4, over 2, partial 3, missed 0', p.daysDone === 4 && p.daysOver === 2 && p.daysPartial === 3 && p.daysMissed === 0, p);
ok('example: percent 78 and never above 100', planPct(p) === 78 && planPct({ plan: 8, credited: 8 }) === 100);

const miss = planStats(ex, { habits: [ex], log: { [ago(2)]: { e: 16 } }, skip: {} }, ago(3), ago(1), T);
ok('overflow does not close a missed day', miss.credited === 8 && miss.plan === 24 && miss.daysMissed === 2 && miss.over === 8 && planPct(miss) === 33, miss);
const sk = planStats(ex, { habits: [ex], log: exLog, skip: { [ago(5)]: { e: 1 } } }, ago(7), T, T);
ok('skip day not in plan', sk.plannedDays === 6 && sk.plan === 48, sk);
const early = planStats(ex, S, ago(20), T, T);
ok('days before creation not in plan', early.plannedDays === 10 && early.plan === 80, early);
const fut = planStats(ex, S, ago(7), key(addDays(new Date(), 5)), T);
ok('future days not in plan', fut.plannedDays === 7, fut);
const wd = { ...ex, days: [0, 2, 4] };
const sched = planStats(wd, { habits: [wd], log: exLog, skip: {} }, ago(7), T, T);
ok('days off schedule not in plan', sched.plannedDays === [1, 2, 3, 4, 5, 6, 7].filter(n => [0, 2, 4].includes(weekday(addDays(new Date(), -n)))).length, sched);
const arch = { ...ex, archived: ago(3) };
ok('days after archive not in plan', planStats(arch, { habits: [arch], log: exLog, skip: {} }, ago(7), T, T).plannedDays === 5);
ok('today with zero does not count', planStats(ex, S, ago(6), T, T).plannedDays === 6);
const withToday = { ...exLog, [T]: { e: 3 } };
const pt = planStats(ex, { habits: [ex], log: withToday, skip: {} }, ago(6), T, T);
ok('today with a mark counts', pt.plannedDays === 7 && pt.daysPartial === 4 && pt.plan === 56, pt);
ok('windows: week 7 days, month 30, all from creation', windowRange(ex, 'week', T).from === ago(6) && windowRange(ex, 'month', T).from === ago(29) && windowRange(ex, 'all', T).from === ex.created);
const gx = { ...ex, target: 8, goals: [{ until: ago(4), target: 4 }] };
const gp = planStats(gx, { habits: [gx], log: exLog, skip: {} }, ago(7), T, T);
ok('plan uses goal of each day', gp.plan === 4 * 4 + 8 * 3 && gp.daysDone === 6, gp);
ok('unit change detected in window', unitChanged({ unit: 'км', goals: [{ until: ago(3), target: 5, unit: 'м' }] }, ago(6)) && !unitChanged({ unit: 'км', goals: [{ until: ago(30), target: 5, unit: 'м' }] }, ago(6)));
ok('weekday overflow needs at least 4 days', overDayText({ wd: [3, 0, 0, 0, 0, 0, 0], total: 3 }) === '' && overDayText({ wd: [3, 1, 0, 0, 0, 0, 0], total: 4 }) === 'Вы чаще перевыполняете цель по понедельникам' && overDayText({ wd: [2, 2, 0, 0, 0, 0, 0], total: 4 }) === '');

const log = {};
for (let i = 1; i <= 10; i++) log[ago(i)] = { w: 6, b: 1 };
show(normalize({ habits: [
  { id: 'w', name: 'Вода', icon: 'water', color: '#3b82f6', target: 6, unit: 'стаканов', created: ago(12) },
  { id: 'b', name: 'Зарядка', icon: 'strong', color: '#22c55e', created: ago(12) },
], log }));
await wait(400);
const w = findHabit('w');
const doneBefore = planStats(w, state, ago(10), T, T).daysDone;
openForm('w'); await wait(400);
$('target').value = 8; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
ok('goal change asks for scope', $('confirm')._shown && $('cChoices').textContent.includes('С сегодняшнего дня') && $('cChoices').textContent.includes('И для прошлых дней') && $('cChoices').textContent.includes('ошиблись при вводе'));
ok('today is the default scope', $('cChoices').querySelector('input:checked').value === 'today');
closeConfirm(true); await wait(500);
ok('from today: history entry written', w.target === 8 && w.goals?.length === 1 && w.goals[0].until === ago(1) && w.goals[0].target === 6, w.goals);
ok('from today: past days stay done', planStats(w, state, ago(10), T, T).daysDone === doneBefore && doneBefore === 10);
openForm('w'); await wait(400);
$('target').value = 9; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
closeConfirm(true); await wait(500);
ok('second change same day overwrites today', w.target === 9 && w.goals.length === 1 && w.goals[0].target === 6, w.goals);
openForm('w'); await wait(400);
$('target').value = 8; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
$('cChoices').querySelector('[value=all]').checked = true;
closeConfirm(true); await wait(500);
ok('whole history: entries removed', w.target === 8 && !w.goals, w.goals);
ok('whole history: past days recalculated', planStats(w, state, ago(10), T, T).daysDone === 0 && planStats(w, state, ago(10), T, T).daysPartial === 10);
openForm('w'); await wait(400);
$('target').value = 10; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
closeConfirm(false); await wait(500);
ok('cancel keeps goal and form', w.target === 8 && $('formOv')._shown);
closeOverlay($('formOv')); await wait(400);
openForm('w'); await wait(400);
$('unit').value = 'кружек'; $('unit').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(500);
ok('unit change asks nothing', !$('confirm')._shown && !$('formOv')._shown && w.unit === 'кружек');
w.unit = 'стаканов'; delete w.goals; save();

try { localStorage.removeItem(PLAN_STORE); } catch {}
openHistory('w'); await wait(600);
ok('plan block shown for quantity habit', !$('hPlan').hidden && $('hPlan').textContent.includes('Засчитано'));
ok('plan block shows the chosen window', $('hPlan').querySelector('[aria-pressed=true]').dataset.w === planWin);
const weekText = $('hPlan').querySelector('.plan-l1').textContent;
$('hPlan').querySelector('[data-w=all]').click(); await wait(200);
ok('window switch changes numbers', $('hPlan').querySelector('.plan-l1').textContent !== weekText && planWin === 'all', [weekText, $('hPlan').querySelector('.plan-l1').textContent]);
ok('window choice remembered', localStorage.getItem(PLAN_STORE) === 'all');
ok('text is neutral, no percent above 100', !/рекорд|!/.test($('hPlan').textContent) && !/1[0-9]{2}%/.test($('hPlan').textContent));
$('hPlan').querySelector('[data-w=week]').click(); await wait(200);
closeOverlay($('histOv')); hist = null; await wait(400);
setCount(w, parseKey(ago(1)), 12);
w.goals = [{ until: ago(20), target: 6, unit: 'стаканов' }]; save();
openHistory('w'); await wait(600);
ok('overflow line shown', $('hPlan').textContent.includes('Сверх плана +4 за 1 день'), $('hPlan').textContent);
ok('bar has overflow layer within box', !!$('hPlan').querySelector('.plan-bar b') && $('hPlan').querySelector('.plan-bar').scrollWidth <= $('hPlan').querySelector('.plan-bar').clientWidth + 1);
ok('goal history list', $('hPlan').querySelector('.plan-goals').textContent.includes('— 8') && $('hPlan').querySelector('.plan-goals').textContent.includes('— 6'));
closeOverlay($('histOv')); hist = null; await wait(400);
openHistory('b'); await wait(600);
ok('plan block hidden for yes/no habit', $('hPlan').hidden && !$('hPlan').textContent);
closeOverlay($('histOv')); hist = null; await wait(400);

setCount(w, new Date(), 10); render(); await wait(300);
const card = cards.get('w');
ok('card +N badge unchanged', card.querySelector('.over').textContent === '+2' && card.querySelector('.check').classList.contains('overdone'));
ok('day ring unchanged by overflow', $('heroDone').textContent === '1' && $('heroTotal').textContent === '2');
openSummary(); await wait(900);
ok('summary has overflow tile', $('sTiles').textContent.includes('Сверх плана'));
ok('summary row shows credited and overflow', [...$('sHabits').querySelectorAll('.hr-sub')].some(s => /^Засчитано \d+%( · \+\d+ сверх)?$/.test(s.textContent)));
ok('yes/no habit row has no plan line', !$('sHabits').querySelector('[data-id=b] .hr-sub'));
closeOverlay($('sumOv')); await wait(400);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
