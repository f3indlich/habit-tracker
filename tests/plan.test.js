window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const T = todayKey();
const show = s => { state = s; viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };

try { localStorage.removeItem(HIST_STORE); } catch {}
ok('default period is week, stored as hist-period', savedRange() === 'week' && HIST_STORE === NS + '-hist-period' && HIST_RANGES.join() === 'week,month,year');
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
ok('numbers use non-breaking thousands', fmtNum(12450) === '12\u00a0450' && fmtNum(600) === '600');
ok('bar math without overflow', JSON.stringify(planBar({ plan: 600, fact: 600, credited: 600, over: 0 })) === JSON.stringify({ inW: 100, overW: 0, mark: null }));
const gx = { ...ex, target: 8, goals: [{ until: ago(4), target: 4 }] };
const gp = planStats(gx, { habits: [gx], log: exLog, skip: {} }, ago(7), T, T);
ok('plan uses goal of each day', gp.plan === 4 * 4 + 8 * 3 && gp.daysDone === 6, gp);
ok('unit change detected in window', unitChanged({ unit: 'км', goals: [{ until: ago(3), target: 5, unit: 'м' }] }, ago(6)) && !unitChanged({ unit: 'км', goals: [{ until: ago(30), target: 5, unit: 'м' }] }, ago(6)));
ok('weekday overflow needs at least 4 days', overDayText({ wd: [3, 0, 0, 0, 0, 0, 0], total: 3 }) === '' && overDayText({ wd: [3, 1, 0, 0, 0, 0, 0], total: 4 }) === 'Чаще всего Вы перевыполняете цель по понедельникам' && overDayText({ wd: [2, 2, 0, 0, 0, 0, 0], total: 4 }) === '');

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

closeOverlay($('histOv')); hist = null; await wait(400);
setCount(w, parseKey(ago(1)), 12);
w.goals = [{ until: ago(20), target: 6, unit: 'стаканов' }]; save();
openHistory('w'); await wait(600);
shiftPeriod(-1); await wait(800);
ok('plan block shown for quantity habit', !$('hPlan').hidden && $('hPlan').textContent.includes('Сделано'));
ok('norm history list', $('hPlan').querySelector('.plan-goals summary').textContent === 'Как менялась норма' && $('hPlan').querySelector('.plan-goals').textContent.includes('— 8') && $('hPlan').querySelector('.plan-goals').textContent.includes('— 6'));
closeOverlay($('histOv')); hist = null; await wait(400);
openHistory('b'); await wait(600);
ok('yes/no habit shows a ring instead of the plan block', $('hPlan').hidden && !$('hPlan').textContent && !$('hRing').hidden && /из \d+ (дня|дней)/.test($('hRing').textContent));
closeOverlay($('histOv')); hist = null; await wait(400);

setCount(w, new Date(), 10); render(); await wait(300);
const card = cards.get('w');
ok('card +N badge unchanged', card.querySelector('.over').textContent === '+2' && card.querySelector('.check').classList.contains('overdone'));
ok('day ring unchanged by overflow', $('heroDone').textContent === '1' && $('heroTotal').textContent === '2');
openSummary(); await wait(900);
closeOverlay($('sumOv')); await wait(400);

const mon0 = monday(new Date()), wk = n => addDays(mon0, -7 * n), dk = (n, i) => key(addDays(wk(n), i));
const plog = {};
[20, 45, 0, 65, 140, 105].forEach((v, i) => { plog[dk(1, i)] = { q: v }; });
[150, 150, 150, 100, 0, 90].forEach((v, i) => { plog[dk(2, i)] = { q: v }; });
[100, 100, 100, 100, 100, 100].forEach((v, i) => { plog[dk(3, i)] = { q: v }; });
const qdays = [0, 1, 2, 3, 4, 5];
show(normalize({ habits: [
  { id: 'q', name: 'Изучение ПДД', icon: 'car', target: 100, unit: 'вопросов', created: dk(5, 0), days: qdays, schedule: { type: 'weekdays', days: qdays } },
  { id: 'b', name: 'Чтение', icon: 'books', created: dk(5, 0) },
], log: plog }));
await wait(300);
try { localStorage.removeItem(HIST_STORE); } catch {}
const q = findHabit('q');
const blk = () => $('hPlan').textContent.replace(/[ \t\n]+/g, ' ').trim();
const l1 = () => $('hPlan').querySelector('.plan-l1')?.textContent.replace(/[ \t\n]+/g, ' ').trim();
const l2 = () => { const e = $('hPlan').querySelector('.plan-l2'), c = e?.querySelector('.s-cmp'); return e ? (c ? e.textContent.replace(c.textContent, '') : e.textContent).trim() : undefined; };
const wpct = sel => parseFloat($('hPlan').querySelector(sel)?.style.width);
const same = () => {
  const ds = periodDays(), per = period(), days = [...$('hChart').querySelectorAll('[data-day]')].map(e => e.dataset.day);
  return per.start === key(ds[0]) && per.end === key(ds[ds.length - 1]) && (hist.range === 'all' || $('hLabel').textContent === rangeLabel(hist.range, ds))
    && days.every(d => d >= per.start && d <= per.end);
};
const blockMatches = () => {
  const per = period(), pp = planStats(q, state, per.start, per.end, T);
  return pp.plannedDays ? l1() === `Сделано ${fmtNum(pp.fact)} из ${fmtNum(pp.plan)} вопросов ${Math.round(pp.fact / pp.plan * 100)}%` : !$('hPlan').querySelector('.plan-bar');
};

openHistory('q'); await wait(600);
ok('opens on current week', hist.range === 'week' && period().start === key(mon0), period());
const p7 = planStats(q, state, ago(6), T, T);
ok('block shows current week, not last 7 days', (!p7.fact || !blk().includes(`Сделано ${fmtNum(p7.fact)}`)) && blockMatches(), [blk(), p7.fact]);
ok('next arrow off on current period', $('hNext').disabled);
shiftPeriod(-1); await wait(800);
ok('previous week: done line', l1() === 'Сделано 375 из 600 вопросов 63%', l1());
ok('previous week: norm line', l2() === 'Норма выполнена в 2 из 6 дней', l2());
ok('previous week: bar parts 55% and 7.5%', Math.abs(wpct('.plan-bar .pb-in') - 55) < .01 && Math.abs(wpct('.plan-bar .pb-over') - 7.5) < .01 && Math.abs(wpct('.plan-bar .pb-in') + wpct('.plan-bar .pb-over') - 62.5) < .01);
ok('previous week: legend', $('hPlan').querySelector('.plan-lg').textContent.replace(/\s+/g, ' ').includes('в норму 330') && $('hPlan').querySelector('.plan-lg').textContent.includes('сверх нормы 45'));
ok('previous week: no plan mark when under plan', !$('hPlan').querySelector('.pb-mark'));
ok('bar is an image with label', $('hPlan').querySelector('.plan-bar').getAttribute('role') === 'img' && $('hPlan').querySelector('.plan-bar').getAttribute('aria-label') === 'Сделано 375 из 600, из них сверх нормы 45');
ok('week bars show each day amount', [...$('hChart').querySelectorAll('.hb-bar em')].map(e => e.textContent).join() === '20,45,65,140,105' && $('hChart').querySelectorAll('.hb-ov').length === 2);
ok('week bars mark the norm and the days below it', $('hChart').querySelector('.hb-norm').textContent === 'норма 100' && $('hChart').querySelectorAll('.hb-bar.part').length === 4, $('hChart').querySelectorAll('.hb-bar.part').length);
ok('week foot names the average and the best day', /^В среднем 62,5 в день/.test($('hChart').querySelector('.h-foot').textContent) && $('hChart').querySelector('.h-foot').textContent.includes('Лучший день: пт, 140'), $('hChart').querySelector('.h-foot')?.textContent);
ok('label, calendar and block share one period', same() && blockMatches());
shiftPeriod(-1); await wait(800);
ok('overflow week: done line', l1() === 'Сделано 640 из 600 вопросов 107%', l1());
ok('overflow week: not every day', l2() === 'Норма выполнена в 4 из 6 дней, но не во все дни', l2());
const mk = $('hPlan').querySelector('.pb-mark');
ok('overflow week: scaled by fact with plan mark at 93.75%', !!mk && Math.abs(parseFloat(mk.style.left) - 93.75) < .01 && mk.textContent.includes('план 600') && Math.abs(wpct('.plan-bar .pb-in') - 490 / 640 * 100) < .01 && Math.abs(wpct('.plan-bar .pb-over') - 150 / 640 * 100) < .01);
const mr = mk?.querySelector('span').getBoundingClientRect(), br = $('hPlan').getBoundingClientRect();
ok('plan mark label stays inside', !!mr && mr.right <= br.right + 1 && mr.left >= br.left - 1);
shiftPeriod(-1); await wait(800);
ok('exact plan: one color, no overflow legend', l1() === 'Сделано 600 из 600 вопросов 100%' && !$('hPlan').querySelector('.plan-bar .pb-over') && !$('hPlan').querySelector('.plan-lg') && Math.abs(wpct('.plan-bar .pb-in') - 100) < .01, blk());
ok('no overflow: no day marks', !$('hChart').querySelector('.hb-ov'));
shiftPeriod(-1); await wait(800);
ok('zero done: empty bar', l1() === 'Сделано 0 из 600 вопросов 0%' && wpct('.plan-bar .pb-in') === 0, blk());
for (let i = 0; i < 3; i++) shiftPeriod(-1);
await wait(100);
ok('before creation: no data, no bar, no numbers', blk().startsWith('В этом периоде данных нет') && !$('hPlan').querySelector('.plan-bar, .plan-l1'), blk());
hist.anchor = addDays(mon0, 7); renderHistory(); await wait(100);
ok('future week: no data, no bar, no numbers', blk().startsWith('В этом периоде данных нет') && !$('hPlan').querySelector('.plan-bar, .plan-l1') && same(), blk());
hist.anchor = new Date(); renderHistory(); await wait(100);
for (let i = 0; i < 4; i++) $('hPrev').click();
await wait(1200);
shiftPeriod(-1); await wait(40);
ok('paging shows the new total at once, without counting', blockMatches(), l1());
shiftPeriod(1); await wait(800);
ok('fast arrow taps end on the right period', period().start === key(wk(4)) && same() && blockMatches(), [period(), $('hLabel').textContent, l1()]);

$('hTabs').querySelector('[data-r=month]').click(); await wait(800);
ok('month follows the same state', period().kind === 'month' && period().start === key(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) && same() && blockMatches());
shiftPeriod(-1); await wait(800);
ok('month paging changes block', same() && blockMatches());
$('hTabs').querySelector('[data-r=year]').click(); await wait(800);
ok('year follows the same state', period().kind === 'year' && period().start === `${new Date().getFullYear()}-01-01` && same() && blockMatches());
ok('year shows rows for the months the habit lived', [...$('hChart').querySelectorAll('.mrow')].every(r => /\d+ из \d+ дн\.|нет плана/.test(r.textContent)) && $('hChart').querySelectorAll('.mrow').length >= 1 && $('hDaysTitle').textContent === 'По месяцам');
ok('no all-time tab: totals live at the top', !$('hTabs').querySelector('[data-r=all]') && $('hTrio').textContent.includes('вопросов всего'));
ok('period choice remembered', localStorage.getItem(HIST_STORE) === 'year');
$('hChart').querySelector('.mrow').click(); await wait(400);
ok('month row opens that month', hist.range === 'month' && !!$('hChart').querySelector('.cal'));
closeOverlay($('histOv')); hist = null; await wait(400);
openHistory('q'); await wait(500);
ok('reopen keeps mode, shows current period', hist.range === 'month' && period().end >= T);
$('hTabs').querySelector('[data-r=week]').click(); await wait(800);
shiftPeriod(-1); await wait(800);

const prefs = colorPrefs();
const bg = sel => getComputedStyle($('hPlan').querySelector(sel)).backgroundColor;
const rootColor = v => { const t = document.createElement('i'); t.style.color = `var(${v})`; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; };
applyColors({ accent: 'emerald', data: 'amber' }); await wait(50);
const c1 = [bg('.plan-bar .pb-in'), bg('.plan-bar .pb-over')];
ok('bar colors come from settings', c1[0] === rootColor('--accent') && c1[1] === rootColor('--data'), [c1, rootColor('--accent'), rootColor('--data')]);
ok('over part of a day bar uses data color', getComputedStyle($('hChart').querySelector('.hb-ov')).backgroundColor === rootColor('--data'));
applyColors({ accent: 'cobalt', data: 'sea' }); await wait(50);
ok('changing colors repaints bar', bg('.plan-bar .pb-in') !== c1[0] && bg('.plan-bar .pb-over') !== c1[1] && bg('.plan-bar .pb-in') === rootColor('--accent'));
applyColors({ accent: 'red', data: 'red' }); await wait(50);
ok('same accent and data: overflow part stays distinct', bg('.plan-bar .pb-over') !== bg('.plan-bar .pb-in'), [bg('.plan-bar .pb-in'), bg('.plan-bar .pb-over')]);
applyColors(prefs); await wait(50);
ok('how-it-works explains norm and overflow', HABIT_HOW.some(([t, d]) => t === 'Сделано и норма' && d.includes('Перевыполнение в один день не закрывает пропуск')) && !HABIT_HOW.some(([t]) => t === 'Сила'));
closeOverlay($('histOv')); hist = null; await wait(400);
openHistory('b'); await wait(500);
ok('yes/no habit: no plan block in new period too', $('hPlan').hidden && !$('hPlan').textContent && !$('hRing').hidden);
closeOverlay($('histOv')); hist = null; await wait(400);
try { localStorage.removeItem(HIST_STORE); } catch {}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
