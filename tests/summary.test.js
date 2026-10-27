window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const span = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => addDays(new Date(), -(from - i)));

state = normalize({ habits: [
  { id: 'A', name: 'Вода', icon: 'water', color: '#0ea5e9', created: ago(10) },
  { id: 'B', name: 'Бег', target: 4, unit: 'км', icon: 'run', color: '#f97316', created: ago(10) },
  { id: 'C', name: 'Уборка', icon: 'home', color: '#eab308', created: ago(10), days: [weekday(addDays(new Date(), -3))] },
  { id: 'D', name: 'Не курить', icon: 'nosmoke', color: '#64748b', created: ago(10), archived: ago(4) },
  { id: 'E', name: 'Подтягивания', target: 5, icon: 'pullup', color: '#3b82f6', created: ago(5), goals: [{ until: ago(4), target: 2 }] },
], log: {
  [ago(10)]: { A: 1 }, [ago(9)]: { A: 1 }, [ago(8)]: { A: 1 }, [ago(7)]: { A: 1 },
  [ago(6)]: { A: 1, B: 4, D: 1 }, [ago(5)]: { A: 1, B: 1, D: 1, E: 2 }, [ago(4)]: { A: 1, D: 1 },
  [ago(3)]: { A: 1, B: 4, E: 3 }, [ago(2)]: { B: 4 }, [ago(1)]: { A: 1, B: 4 },
}, skip: { [ago(4)]: { B: 1 } } });
viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);

const cur = periodStats(span(6, 1)), prev = periodStats(span(12, 7));
ok('period percent counts partial as share and skips nothing scheduled', cur.pct === 69 && cur.n === 20, cur);
ok('skip is not a failure', !dayValues(addDays(new Date(), -4)).vals.some(x => x.h.id === 'B'));
ok('archived habit counts only until archive day', dayValues(addDays(new Date(), -4)).vals.some(x => x.h.id === 'D') && !dayValues(addDays(new Date(), -3)).vals.some(x => x.h.id === 'D'));
ok('off-schedule days ignored', cur.habits.find(x => x.h.id === 'C').n === 1);
ok('goal of that day used', dayValues(addDays(new Date(), -5)).vals.find(x => x.h.id === 'E').v === 1 && dayValues(addDays(new Date(), -3)).vals.find(x => x.h.id === 'E').v === .6);
ok('perfect days and decided days', cur.perfect === 1 && cur.decided === 6, [cur.perfect, cur.decided]);
ok('habit ranking by percent', cur.habits.map(x => `${x.h.id}${x.pct}`).join() === 'D100,B85,A83,E32,C0', cur.habits.map(x => `${x.h.id}${x.pct}`));
ok('weekday totals add up', cur.weekdays.reduce((s, w) => s + w.n, 0) === cur.n);
ok('previous period percent', prev.pct === 31, prev.pct);
ok('comparison text', compareText(cur, prev, 'week') === '+38 п.п. к прошлой неделе' && compareText(cur, cur, 'month') === 'как в прошлом месяце'
  && compareText(prev, cur, 'year') === '−38 п.п. к прошлому году' && compareText(cur, { pct: null }, 'week') === 'нет данных для сравнения');
const att = attention(cur, prev, 'week');
ok('needs attention: low percent and big drop, archived excluded', att.map(x => x.h.id).join() === 'C,E,A' && att[0].reason === '0% за неделю'
  && att[1].reason === '32% за неделю' && att[2].reason === '−17 п.п. к прошлой неделе', att.map(x => [x.h.id, x.reason]));
ok('weak weekday found', weakDay({ pct: 70, weekdays: [80, 75, 42, 70, 72, 68, 85].map(p => ({ pct: p, n: 5 })) }).text === 'Слабее всего — среда: 42%, на 28 п.п. ниже среднего');
ok('no weak day when spread small', weakDay({ pct: 70, weekdays: [72, 68, 65, 70, 74, 69, 71].map(p => ({ pct: p, n: 5 })) }).i === -1);
ok('no weak day with too little data', weakDay({ pct: 70, weekdays: [80, 10, 75, 70, 72, 68, 85].map((p, i) => ({ pct: p, n: i === 1 ? 2 : 5 })) }).i !== 1);

state = normalize({ habits: [{ id: 'X', name: 'Чтение', icon: 'book', created: ago(5) }],
  log: { [ago(5)]: { X: 1 }, [ago(4)]: { X: 1 }, [ago(2)]: { X: 1 }, [todayKey()]: { X: 1 } }, skip: { [ago(1)]: { X: 1 } } });
let s = perfectStreaks();
ok('perfect streaks: skipped day is neutral', s.cur === 2 && s.best === 2, s);
state.log[todayKey()] = {};
s = perfectStreaks();
ok('unfinished today does not break streak', s.cur === 1 && s.best === 2, s);
ok('today pending excluded from percent', dayValues(new Date()).pending && !dayValues(new Date()).vals.length);
state.log[ago(4)] = {};
s = perfectStreaks();
ok('missed day breaks streak', s.cur === 1 && s.best === 1, s);

state = normalize({ habits: [{ id: 'X', name: 'Чтение', icon: 'book', created: ago(20) }],
  log: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [ago(i + 1), i + 1 === 10 ? {} : { X: 1 }])) });
s = perfectStreaks();
ok('whole history streaks', s.cur === 9 && s.best === 10, s);
s = perfectStreaks(span(5, 0));
ok('best streak clipped to period, current on today', s.cur === 9 && s.best === 5, s);
s = perfectStreaks(span(15, 10));
ok('current streak at end of past period', s.cur === 0 && s.best === 5, s);
s = perfectStreaks(span(15, 11));
ok('current streak at period end reaches back before period', s.cur === 10 && s.best === 5, s);
s = perfectStreaks(span(9, 1));
ok('best streak inside period only', s.cur === 9 && s.best === 9, s);

state = normalize({ habits: [
  { id: 'A', name: 'Вода', icon: 'water', color: '#0ea5e9', created: ago(40) },
  { id: 'B', name: 'Бег', icon: 'run', color: '#f97316', created: ago(40) },
], log: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [ago(i + 1), { A: 1, ...(i % 2 ? { B: 1 } : {}) }])) });
viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const ring = document.querySelector('.hero-ring');
ok('ring is a button', ring.getAttribute('role') === 'button' && ring.tabIndex === 0 && getComputedStyle(ring).cursor === 'pointer');
ring.click(); await wait(500);
ok('ring opens summary', $('sumOv')._shown && $('sTitle').textContent === 'Сводка');
ok('charts sized to sheet on first open', Math.abs($('sWeek').querySelector('svg').getAttribute('width') - $('sWeek').clientWidth) <= 1, [$('sWeek').querySelector('svg').getAttribute('width'), $('sWeek').clientWidth]);
const pressed = () => [...$('sTabs').children].find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.r;
ok('week by default, next disabled', pressed() === 'week' && $('sNext').disabled && !$('sPrev').disabled && $('sLabel').textContent === rangeLabel('week', rangeDays('week', new Date())));
ok('four summary tiles', $('sTiles').querySelectorAll('.tile').length === 4 && /За период/.test($('sTiles').textContent));
const tileSub = i => $('sTiles').children[i].querySelector('.s').textContent;
ok('streak tiles say perfect days, today and period', /идеальн\S+ д\S+ подряд на сегодня$/.test(tileSub(2)) && /идеальн/.test(tileSub(3)) && tileSub(3).endsWith('за неделю'), [tileSub(2), tileSub(3)]);
const weekSoFar = rangeDays('week', new Date()).filter(d => key(d) <= todayKey()).length;
const heatCells = () => [...$('sHeat').querySelectorAll('rect.cell')];
const futCells = () => [...$('sHeat').querySelectorAll('rect.cell.fut')];
ok('future days of week shown as placeholders', futCells().length === 7 - weekSoFar && futCells().every(c => c.dataset.tip.endsWith('ещё впереди')) && $('sHeat').querySelectorAll('rect.cell.today').length === 1
  && $('sFutLg').hidden === (weekSoFar === 7), [futCells().length, weekSoFar]);
ok('week heatmap shows only selected week', heatCells().length - futCells().length === weekSoFar && new Set(heatCells().filter(c => !c.classList.contains('fut')).map(c => c.getAttribute('y'))).size === 1 && heatCells().some(c => /%/.test(c.dataset.tip)), [heatCells().length, weekSoFar]);
ok('ranking rows with bars', $('sRank').querySelectorAll('.rank-row').length === 2 && $('sRank').querySelector('.rank-row .rk-bar i').style.width === '100%');
const heatH = () => $('sHeat').getBoundingClientRect().height;
const cols = () => new Set([...$('sHeat').querySelectorAll('rect.cell:not(.fut)')].map(c => c.getAttribute('x'))).size;
ok('week heatmap is one short row with weekday heads', heatH() <= 50 && WEEKDAYS.every(w => $('sHeat').textContent.includes(w)), heatH());
$('sTabs').querySelector('[data-r=month]').click(); await wait(250);
ok('month heatmap is a compact calendar', heatH() <= 160 && cols() === 7, [heatH(), cols()]);
const m = periodStats(rangeDays('month', new Date()));
ok('month tab recalculates', pressed() === 'month' && $('sTiles').textContent.includes(m.pct + '%'), [m.pct, $('sTiles').textContent]);
$('sPrev').click(); await wait(200);
ok('past month has no placeholders', futCells().length === 0 && $('sFutLg').hidden);
const pm = perfectStreaks(rangeDays('month', shiftAnchor('month', new Date(), -1)));
ok('past period streak captions', tileSub(2).endsWith('на конец периода') && tileSub(3).endsWith('за месяц') && $('sTiles').children[3].querySelector('.v').textContent === String(pm.best), [tileSub(2), tileSub(3), pm]);
ok('previous month shown', $('sLabel').textContent === rangeLabel('month', rangeDays('month', shiftAnchor('month', new Date(), -1))) && !$('sNext').disabled);
$('sNext').click(); await wait(200);
const tilesEl = $('sTiles').firstElementChild;
renderSummary(); await wait(100);
ok('tiles not redrawn when values same', $('sTiles').firstElementChild === tilesEl);
$('sTabs').querySelector('[data-r=year]').click(); await wait(250);
ok('year keeps wide heatmap', $('sHeat').querySelector('.hscroll') && cols() > 7);
ok('year tab', pressed() === 'year' && $('sWeek').querySelectorAll('.hit').length === 7 && $('sWeekNote').textContent.length > 5);
$('sRank').querySelector('.rank-row').click(); await wait(500);
ok('rank row opens habit history above summary', $('histOv')._shown && $('sumOv')._shown && $('histOv').contains(document.elementFromPoint(innerWidth / 2, innerHeight - 60)));
closeOverlay($('histOv')); hist = null; await wait(400);
closeOverlay($('sumOv')); await wait(400);
ring.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
ok('ring opens by keyboard', $('sumOv')._shown);
closeOverlay($('sumOv')); await wait(400);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
