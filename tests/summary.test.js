window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const day = n => addDays(parseKey(todayKey()), -n);
const span = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => day(from - i));
const fresh = async data => { state = normalize(data); viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(250); };

await fresh({ habits: [
  { id: 'A', name: 'Вода', target: 8, unit: 'стаканов', icon: 'water', color: '#0ea5e9', created: ago(10) },
  { id: 'B', name: 'Бег', icon: 'run', color: '#f97316', created: ago(10) },
  { id: 'C', name: 'Уборка', icon: 'home', color: '#eab308', created: ago(10), days: [weekday(day(3))] },
  { id: 'D', name: 'Не курить', icon: 'nosmoke', color: '#64748b', created: ago(10), archived: ago(4) },
], log: {
  [ago(6)]: { A: 8, B: 1, D: 1 }, [ago(5)]: { A: 8, B: 1, D: 1 }, [ago(3)]: { A: 40, C: 1 },
  [ago(2)]: { A: 5, B: 1 }, [ago(1)]: { A: 8, B: 1 },
}, skip: { [ago(3)]: { B: 1 } } });

const d2 = dayInfo(day(2));
ok('partial 5 of 8 gives share 0.625', d2.vals.find(x => x.h.id === 'A').v === .625 && periodStats([day(2)]).habits.find(x => x.h.id === 'A').pct === 63);
ok('partial day is not a full day', !isFull(d2) && periodStats([day(2)]).full === 0);
ok('overfilled day counts as 100%', dayInfo(day(3)).vals.find(x => x.h.id === 'A').v === 1 && periodStats(span(10, 1)).pct <= 100);
ok('skipped day not in denominator', !dayInfo(day(3)).vals.some(x => x.h.id === 'B'));
ok('off-schedule days not in denominator', periodStats(span(6, 1)).habits.find(x => x.h.id === 'C').n === 1);
ok('archived habit counts only until archive day', dayInfo(day(4)).vals.some(x => x.h.id === 'D') && !dayInfo(day(3)).vals.some(x => x.h.id === 'D'));
const p6 = periodStats(span(6, 1));
ok('period percent averages scheduled marks only', p6.n === p6.habits.reduce((s, x) => s + x.n, 0) && p6.n === 15 && p6.pct === Math.round((3 + 3 + 0 + 2 + 1.625 + 2) / 15 * 100), [p6.pct, p6.n]);
ok('full day needs every scheduled habit done', isFull(dayInfo(day(1))) && !isFull(dayInfo(day(4))) && p6.full === 4 && p6.days === 6, [p6.full, p6.days]);

await fresh({ habits: [{ id: 'X', name: 'Чтение', icon: 'book', created: ago(6) }],
  log: { [ago(6)]: { X: 1 }, [ago(5)]: { X: 1 }, [ago(3)]: { X: 1 }, [ago(2)]: { X: 1 }, [ago(1)]: { X: 1 } }, skip: { [ago(4)]: { X: 1 } } });
ok('day without scheduled habits is not full', !isFull(dayInfo(day(4))) && dayInfo(day(4)).vals.length === 0);
let st = streakInfo();
ok('day without scheduled habits does not enter or break streak', st.cur === 5 && st.best === 5, st);
ok('unfinished today does not break streak', dayInfo(new Date()).pending && st.cur === 5);
state.log[todayKey()] = { X: 1 };
ok('finished today extends streak', streakInfo().cur === 6);
delete state.log[todayKey()]; state.log[ago(1)] = {};
st = streakInfo();
ok('missed day breaks streak', st.cur === 0 && st.lastAgo === 2, st);
ok('zero streak shows when last full day was', streakNote(st, true) === 'Последний полный день — 2 дня назад' && streakNote({ cur: 0, lastAgo: null }, true) === 'Новая серия начинается сегодня'
  && streakNote({ cur: 0, lastAgo: 1 }, true) === 'Последний полный день — вчера' && streakNote({ cur: 3 }, true) === 'Сейчас: 3 дня подряд' && streakNote({ cur: 4 }, false) === 'На конец периода: 4 дня подряд');

ok('trend hidden with fewer than 3 days before', trend({ pct: 80 }, { pct: 50, days: 2 }) === null && trend({ pct: 80 }, { pct: 50, days: 3 }) === 30 && trend({ pct: 80 }, { pct: null, days: 0 }) === null);
ok('trend written as percent', fmtTrend(5) === '+5%' && fmtTrend(-18) === '−18%' && fmtTrend(0) === '0%');
ok('attention below 60%: 59 yes, 60 no', needsAttention({ pct: 59, delta: null }) && !needsAttention({ pct: 60, delta: null }));
ok('attention on drop of 10% or more', needsAttention({ pct: 80, delta: -10 }) && !needsAttention({ pct: 80, delta: -9 }));
const rows = [{ h: { id: 'a' }, pct: 90, delta: -20, n: 9 }, { h: { id: 'b' }, pct: 50, delta: -5, n: 9 }, { h: { id: 'c' }, pct: 95, delta: 2, n: 9 }, { h: { id: 'd' }, pct: 70, delta: -12, n: 9 }];
ok('attention sorted by drop, best by percent', habitList(rows, 'attn').map(x => x.h.id).join() === 'a,d,b' && habitList(rows, 'best').map(x => x.h.id).join() === 'c,a,d,b');
ok('row aria label in words', rowLabel({ h: { name: 'Медитация' }, pct: 62, delta: -18 }) === 'Медитация: 62%, ниже прошлого периода на 18%' && rowLabel({ h: { name: 'Бег' }, pct: 70, delta: null }) === 'Бег: 70%');

const oct = rangeDays('month', new Date(2026, 9, 15)), now = new Date(2026, 9, 27);
ok('summary sentence with comparison', summaryText(summaryParts('month', oct, { pct: 78 }, { pct: 73, days: 30 }, now)) === 'В октябре Вы выполнили 78% запланированного, на 5% больше, чем в сентябре.');
ok('summary sentence without comparison', summaryText(summaryParts('month', oct, { pct: 78 }, { pct: 90, days: 2 }, now)) === 'В октябре Вы выполнили 78% запланированного.');
ok('summary sentence for less and same', summaryText(summaryParts('month', oct, { pct: 70 }, { pct: 75, days: 20 }, now)).endsWith('на 5% меньше, чем в сентябре.') && summaryText(summaryParts('month', oct, { pct: 70 }, { pct: 70, days: 20 }, now)).endsWith('столько же, сколько в сентябре.'));
ok('summary names for week, past month and year', periodNames('week', rangeDays('week', now), now).lead === 'На этой неделе' && periodNames('week', rangeDays('week', now), now).prev === 'на прошлой неделе'
  && periodNames('month', rangeDays('month', new Date(2026, 0, 10)), now).prev === 'в декабре 2025 года' && periodNames('year', rangeDays('year', now), now).lead === 'В 2026 году');
const sp = summaryParts('month', oct, { pct: 78 }, { pct: 73, days: 30 }, now);
ok('only the number is highlighted', sp.num === '78%' && !/\d/.test(sp.before));

const wd = ps => ps.map(p => ({ pct: p, n: 4 }));
const base = { days: 28, habits: [] };
ok('no weekday phrase under 15 points', !observations({ cur: { pct: 70, days: 28 }, prev: null, obsCur: { ...base, weekdays: wd([80, 70, 75, 72, 74, 76, 66]) }, obsPrev: { ...base, weekdays: wd([0, 0, 0, 0, 0, 0, 0]) } }).length);
const wdObs = observations({ cur: { pct: 70, days: 28 }, prev: null, obsCur: { ...base, weekdays: wd([81, 70, 75, 72, 74, 76, 66]) }, obsPrev: { ...base, weekdays: wd([0, 0, 0, 0, 0, 0, 0]) } });
ok('weekday phrase at 15 points', wdObs.length === 1 && wdObs[0].text === 'Лучше всего по понедельникам: 81%, хуже всего по воскресеньям: 66%', wdObs);
const H = (id, name, pct, n = 20) => ({ h: { id, name }, pct, n });
const dropCur = { days: 28, weekdays: wd([90, 60, 75, 72, 74, 76, 66]), habits: [H('a', 'Бег', 60), H('b', 'Чтение', 62), H('c', 'Вода', 95), H('d', 'Сон', 85)] };
const dropPrev = { days: 28, weekdays: wd([0, 0, 0, 0, 0, 0, 0]), habits: [H('a', 'Бег', 90), H('b', 'Чтение', 80), H('c', 'Вода', 90), H('d', 'Сон', 88)] };
const all3 = observations({ streak: 7, cur: { pct: 70, days: 28 }, prev: { pct: 60, days: 28 }, obsCur: dropCur, obsPrev: dropPrev });
ok('positive first, then drop, then weekday, max three', all3.length === 3 && all3[0].text === 'Полных дней подряд: 7' && all3[1].text === 'Бег: 60% против 90% в прошлом периоде' && /^Лучше всего по понедельникам/.test(all3[2].text), all3);
ok('only one hint, from steady habit', all3.filter(o => o.hint).length === 1 && all3[1].hint === 'Попробуйте делать её сразу после привычки «Вода»');
ok('growth phrase when no streak', observations({ streak: 0, cur: { pct: 80, days: 30 }, prev: { pct: 70, days: 30 }, obsCur: { ...base, weekdays: wd([70, 70, 70, 70, 70, 70, 70]) }, obsPrev: base })[0]?.text === 'Выполнение выросло на 10% к прошлому периоду');
ok('nothing without enough data', observations({ streak: 0, cur: { pct: 80, days: 10 }, prev: { pct: 50, days: 10 }, obsCur: { ...dropCur, days: 10 }, obsPrev: dropPrev }).length === 0);
ok('streak phrase works without three weeks', observations({ streak: 5, cur: { pct: 80, days: 5 }, prev: null, obsCur: { ...base, days: 5, weekdays: wd([0, 0, 0, 0, 0, 0, 0]) }, obsPrev: null })[0]?.text === 'Полных дней подряд: 5');
ok('legend levels match heatmap', heatLv(true, 0) === 'lv0' && heatLv(true, .49) === 'lv1' && heatLv(true, .5) === 'lv2' && heatLv(true, .75) === 'lv3' && heatLv(true, .99) === 'lv3' && heatLv(true, 1) === 'lv4');

await fresh({ habits: [{ id: 'n', name: 'Новая', icon: 'book', created: ago(2) }], log: {} });
openSummary(); await wait(500);
ok('too little history shows waiting text', $('sSum').textContent === 'Сводка появится через несколько недель отметок' && $('sBody').hidden);
closeOverlay($('sumOv')); await wait(400);

const evil = '<img src=x onerror="window.__xss=1">Йога';
const names = ['Вода', 'Бег', 'Чтение', 'Сон', 'Медитация', 'Зарядка', evil];
await fresh({ habits: names.map((name, i) => ({ id: 'h' + i, name, icon: 'book', color: '#22c55e', created: ago(70) })),
  log: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [ago(i + 1), Object.fromEntries(names.map((_, j) => ['h' + j, (i + j) % (j + 2) ? 1 : 0]))])) });
const ring = document.querySelector('.hero-ring');
ok('ring is a button', ring.getAttribute('role') === 'button' && ring.tabIndex === 0 && getComputedStyle(ring).cursor === 'pointer');
ring.click(); await wait(600);
ok('ring opens summary', $('sumOv')._shown && $('sTitle').textContent === 'Сводка');
const pressed = (box = 'sTabs') => [...$(box).children].find(b => b.getAttribute('aria-pressed') === 'true')?.dataset[box === 'sTabs' ? 'r' : 'f'];
ok('week by default, next disabled', pressed() === 'week' && $('sNext').disabled && !$('sPrev').disabled);
ok('summary sentence first, one bold number', /^На этой неделе Вы выполнили \d+% запланированного/.test($('sSum').textContent) && $('sSum').querySelectorAll('b').length === 1, $('sSum').textContent);
ok('three tiles with plain words', $('sTiles').querySelectorAll('.tile').length === 3 && ['Выполнено', 'Полных дней', 'Лучшая серия'].every(t => $('sTiles').textContent.includes(t))
  && /из запланированного/.test($('sTiles').textContent) && /дней подряд без пропусков/.test($('sTiles').textContent) && !/идеальн|п\.п\.|Сила/i.test($('sSheet').textContent));
ok('tiles have info buttons', $('sTiles').querySelectorAll('.tile-i').length === 3);
$('sTiles').querySelector('.tile-i').click(); await wait(150);
ok('tile info explains', document.querySelector('.menu.pop')?.textContent.includes('Как считается'));
closeMenu(); await wait(150);
ok('old blocks removed', !$('sRank') && !$('sAttn') && !$('sWeek') && !/Рейтинг привычек|Требует внимания|По дням недели/.test($('sSheet').textContent));
const weekSoFar = rangeDays('week', new Date()).filter(d => key(d) <= todayKey()).length;
const heatCells = () => [...$('sHeat').querySelectorAll('rect.cell')], futCells = () => [...$('sHeat').querySelectorAll('rect.cell.fut')];
ok('future days of week shown as placeholders', futCells().length === 7 - weekSoFar && $('sFutLg').hidden === (weekSoFar === 7));
ok('numbered legend', [...document.querySelectorAll('#sBody .legend-num > span:not(.lg-fut)')].map(s => s.textContent).join('|') === '0%|до 50%|50–75%|75–99%|100%');
const tipCell = heatCells().find(c => !c.classList.contains('fut') && c.classList.contains('lvx') === false && c.dataset.tip && !c.classList.contains('today'));
ok('day tip names missed habits', /^\d+ \S+: \d+ из 7 привычек, (не выполнено: .+|всё выполнено)$/.test(tipCell?.dataset.tip || ''), tipCell?.dataset.tip);
tipCell?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(100);
ok('tap on day shows tip', $('sHeat').querySelector('.tip').classList.contains('show') && $('sHeat').querySelector('.tip').textContent === tipCell?.dataset.tip);

$('sTabs').querySelector('[data-r=month]').click(); await wait(300);
const mStats = periodStats(rangeDays('month', new Date()));
ok('month tab recalculates', pressed() === 'month' && $('sTiles').textContent.includes(mStats.pct + '%') && $('sTiles').textContent.includes(`${mStats.full} из ${mStats.days}`), [mStats, $('sTiles').textContent]);
ok('habit list shows 5 rows and show-all', $('sHabits').querySelectorAll('.hab-row').length === 5 && !$('sMore').hidden && $('sMore').textContent === 'Показать все (7)');
$('sMore').click(); await wait(150);
ok('show all expands', $('sHabits').querySelectorAll('.hab-row').length === 7 && $('sMore').textContent === 'Свернуть');
ok('html in habit names shown as text', $('sHabits').textContent.includes(evil) && !$('sHabits').querySelector('img') && !$('sHeat').querySelector('img') && !window.__xss);
const bestPcts = [...$('sHabits').querySelectorAll('.hr-pct')].map(e => parseInt(e.textContent));
ok('best sorted by percent', bestPcts.every((p, i) => !i || bestPcts[i - 1] >= p), bestPcts);
const row0 = $('sHabits').querySelector('.hab-row');
ok('row has icon, percent, label', !!row0.querySelector('.hicon') && /^\S.*: \d+%/.test(row0.getAttribute('aria-label')));
ok('trend arrow with sign and text', [...$('sHabits').querySelectorAll('.trend')].filter(t => t.textContent).every(t => /^[↑↓→] (\+\d+%|−\d+%|0%)$/.test(t.textContent)) && $('sHabits').querySelectorAll('.trend').length > 0);
$('sFilter').querySelector('[data-f=attn]').click(); await wait(150);
const attnRows = [...$('sHabits').querySelectorAll('.hab-row')];
ok('attention filter lists only weak or dropping habits', pressed('sFilter') === 'attn' && (attnRows.length ? attnRows.every(r => { const p = parseInt(r.querySelector('.hr-pct').textContent), t = r.querySelector('.trend')?.textContent || ''; return p < 60 || /↓ −(1\d|[2-9]\d)%/.test(t); }) : $('sHabits').textContent === 'Все привычки выполняются стабильно'), attnRows.map(r => r.getAttribute('aria-label')));
ok('observations hidden or short list', $('sObsWrap').hidden ? !$('sObs').children.length : $('sObs').children.length <= 3);
$('sPrev').click(); await wait(250);
ok('past month has no placeholders', futCells().length === 0 && $('sFutLg').hidden && /^В \S+ Вы выполнили/.test($('sSum').textContent));
ok('past month streak note', /На конец периода/.test($('sTiles').textContent));
$('sNext').click(); await wait(200);
const tilesEl = $('sTiles').firstElementChild;
renderSummary(); await wait(100);
ok('tiles not redrawn when values same', $('sTiles').firstElementChild === tilesEl);
$('sTabs').querySelector('[data-r=year]').click(); await wait(300);
ok('year keeps wide heatmap', !!$('sHeat').querySelector('.hscroll') && /^В \d{4} году/.test($('sSum').textContent));
$('sFilter').querySelector('[data-f=best]').click(); await wait(150);
$('sHabits').querySelector('.hab-row').click(); await wait(500);
ok('habit row opens history above summary', $('histOv')._shown && $('sumOv')._shown);
closeOverlay($('histOv')); hist = null; await wait(400);
$('sHow').click(); await wait(150);
ok('how-it-works popover lists rules', ['Запланированный день', 'Полный день', 'Серия', 'Нужно внимание'].every(t => document.querySelector('.menu.pop')?.textContent.includes(t)));
closeMenu();
ok('no horizontal scroll in sheet', $('sSheet').scrollWidth <= $('sSheet').clientWidth + 1, [innerWidth, $('sSheet').scrollWidth, $('sSheet').clientWidth, ...[...$('sSheet').querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > $('sSheet').getBoundingClientRect().right - 2 && !e.closest('svg')).slice(0, 6).map(e => e.tagName + '.' + e.className + '#' + e.id + ':' + Math.round(e.getBoundingClientRect().right))]);
closeOverlay($('sumOv')); await wait(400);

const skipPrev = Object.fromEntries(rangeDays('month', shiftAnchor('month', new Date(), -1)).map(d => [key(d), { e: 1 }]));
await fresh({ habits: [{ id: 'e', name: 'Одна', icon: 'book', color: '#22c55e', created: ago(70) }],
  log: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [ago(i + 1), { e: i % 3 ? 1 : 0 }])), skip: skipPrev });
openSummary(); await wait(400);
$('sTabs').querySelector('[data-r=month]').click(); await wait(250);
ok('one habit month works', $('sHabits').querySelectorAll('.hab-row').length === 1 && $('sMore').hidden && !$('sBody').hidden);
$('sPrev').click(); await wait(250);
ok('empty month says so', $('sSum').textContent === 'За этот период нет запланированных привычек' && $('sBody').hidden);
closeOverlay($('sumOv')); await wait(400);
ring.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
ok('ring opens by keyboard', $('sumOv')._shown);
closeOverlay($('sumOv')); await wait(400);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
