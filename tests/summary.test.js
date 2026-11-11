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
ok('partial 5 of 8 is not a done mark', d2.vals.find(x => x.h.id === 'A').v === .625 && periodStats([day(2)]).habits.find(x => x.h.id === 'A').done === 0);
ok('partial day is not a full day', !isFull(d2) && periodStats([day(2)]).full === 0 && periodStats([day(2)]).partial === 1);
ok('overfilled day counts as done', dayInfo(day(3)).vals.find(x => x.h.id === 'A').v === 1 && periodStats(span(10, 1)).pct <= 100);
ok('skipped day not in denominator', !dayInfo(day(3)).vals.some(x => x.h.id === 'B'));
ok('off-schedule days not in denominator', periodStats(span(6, 1)).habits.find(x => x.h.id === 'C').n === 1);
ok('archived habit counts only until archive day', dayInfo(day(4)).vals.some(x => x.h.id === 'D') && !dayInfo(day(3)).vals.some(x => x.h.id === 'D'));
const p6 = periodStats(span(6, 1));
ok('period counts done marks of planned marks', p6.total === 15 && p6.done === 11 && p6.pct === 73 && p6.total === p6.habits.reduce((s, x) => s + x.n, 0), [p6.done, p6.total, p6.pct]);
ok('days split into full, partial and missed', p6.full === 4 && p6.partial === 1 && p6.missed === 1 && p6.days === 6, [p6.full, p6.partial, p6.missed]);
ok('habit row counts its own days', p6.habits.find(x => x.h.id === 'A').done === 4 && p6.habits.find(x => x.h.id === 'A').n === 6);

await fresh({ habits: [{ id: 'X', name: 'Чтение', icon: 'book', created: ago(6) }],
  log: { [ago(6)]: { X: 1 }, [ago(5)]: { X: 1 }, [ago(3)]: { X: 1 }, [ago(2)]: { X: 1 }, [ago(1)]: { X: 1 } }, skip: { [ago(4)]: { X: 1 } } });
ok('day without scheduled habits is not full', !isFull(dayInfo(day(4))) && dayInfo(day(4)).vals.length === 0 && dayKind(dayInfo(day(4))) === null);
ok('day without scheduled habits does not break streak', streakInfo().cur === 5);
ok('unfinished today does not break streak', dayInfo(new Date()).pending && streakInfo().cur === 5 && dayKind(dayInfo(new Date())) === null);
state.log[todayKey()] = { X: 1 };
ok('finished today extends streak', streakInfo().cur === 6);
delete state.log[todayKey()]; state.log[ago(1)] = {};
ok('missed day breaks streak', streakInfo().cur === 0);

ok('trend hidden with fewer than 3 days before', trend({ pct: 80 }, { pct: 50, days: 2 }) === null && trend({ pct: 80 }, { pct: 50, days: 3 }) === 30 && trend({ pct: 80 }, { pct: null, days: 0 }) === null);
const P = s => parseKey(s), firsts = c => [key(c.cur[0]), key(c.cur.at(-1)), key(c.prev[0]), key(c.prev.at(-1))].join();
const wkWed = compareRange('week', rangeDays('week', P('2026-11-11')), P('2026-11-11'), P('2026-11-11'));
ok('mid-week compares the same weekdays', wkWed.live && firsts(wkWed) === '2026-11-09,2026-11-11,2026-11-02,2026-11-04' && wkWed.label === 'пн–ср прошлой недели', [firsts(wkWed), wkWed.label]);
ok('on Monday compares with last Monday', compareRange('week', rangeDays('week', P('2026-11-09')), P('2026-11-09'), P('2026-11-09')).label === 'в прошлый понедельник');
const wkPast = compareRange('week', rangeDays('week', P('2026-10-28')), P('2026-10-28'), P('2026-11-11'));
ok('finished week compares with the whole week before', !wkPast.live && wkPast.prev.length === 7 && wkPast.label === 'неделей раньше');
const moLive = compareRange('month', rangeDays('month', P('2026-10-27')), P('2026-10-27'), P('2026-10-27'));
ok('month in progress compares the same dates', moLive.cur.length === 27 && moLive.prev.length === 27 && moLive.label === '1–27 сентября', moLive.label);
ok('past month compares with the month before', compareRange('month', rangeDays('month', P('2026-10-10')), P('2026-10-10'), P('2026-11-11')).label === 'в сентябре'
  && compareRange('month', rangeDays('month', P('2026-01-10')), P('2026-01-10'), P('2026-11-11')).label === 'в декабре 2025 года');
ok('year compares the same span or the whole year', compareRange('year', rangeDays('year', P('2026-11-11')), P('2026-11-11'), P('2026-11-11')).label === 'за тот же срок 2025 года'
  && compareRange('year', rangeDays('year', P('2025-05-01')), P('2025-05-01'), P('2026-11-11')).label === 'в 2024 году');
ok('comparison in plain words', compareText(9, 'пн–ср прошлой недели') === '▲ на 9% лучше, чем пн–ср прошлой недели' && compareText(-4, 'в сентябре') === '▼ на 4% хуже, чем в сентябре' && compareText(0, 'в сентябре') === 'Так же, как в сентябре' && compareText(null, 'x') === '');
ok('marks counted in words', marksText(14, 18) === '14 из 18 отметок' && marksText(1, 1) === '1 из 1 отметки' && marksText(5, 21) === '5 из 21 отметки');
ok('period line says how much is left today', heroSub('week', true, 3, 4) === 'за 3 дня, на сегодня осталось 4' && heroSub('week', true, 1, 0) === 'за 1 день' && heroSub('month', false, 31, 0) === 'за весь месяц' && heroSub('year', true, 300, 0) === 'с 1 января по сегодня');
ok('day kinds in words', kindWords({ full: 1, partial: 2, missed: 5 }).map(x => x[1] + ' ' + x[2]).join() === '1 полный,2 частичных,5 пропусков');

const wd = ps => ps.map(p => ({ pct: p, n: 4 }));
const base = { days: 28, habits: [] };
ok('no weekday phrase under 15 points', !observations({ cur: { ...base, weekdays: wd([80, 70, 75, 72, 74, 76, 66]) }, prev: null }).length);
const wdObs = observations({ cur: { ...base, weekdays: wd([81, 70, 75, 72, 74, 76, 66]) }, prev: null });
ok('weekday phrase at 15 points', wdObs.length === 1 && wdObs[0].text === 'Лучший день недели — понедельник: 81%, слабее всего — воскресенье: 66%', wdObs);
const H = (id, name, pct, n = 20) => ({ h: { id, name }, pct, n, done: Math.round(pct * n / 100) });
const dropCur = { days: 28, weekdays: wd([90, 60, 75, 72, 74, 76, 66]), habits: [H('a', 'Бег', 60), H('b', 'Чтение', 70), H('c', 'Вода', 95)] };
const dropPrev = { days: 28, weekdays: wd([0, 0, 0, 0, 0, 0, 0]), habits: [H('a', 'Бег', 90), H('b', 'Чтение', 80), H('c', 'Вода', 90)] };
const two = observations({ streak: 7, cur: dropCur, prev: dropPrev });
ok('at most two observations: streak first, then the biggest drop', two.length === 2 && two[0].text === 'Уже 7 полных дней подряд' && two[1].text === '«Бег» получается реже: 60% дней, а раньше было 90%', two);
ok('drop needs 15 points', !observations({ cur: { ...dropCur, habits: [H('b', 'Чтение', 70)], weekdays: wd([70, 70, 70, 70, 70, 70, 70]) }, prev: dropPrev }).length);
ok('nothing without enough days', observations({ streak: 0, cur: { ...dropCur, days: 10 }, prev: dropPrev }).length === 0);
ok('streak phrase works on a short period', observations({ streak: 5, cur: { ...base, days: 5, weekdays: wd([0, 0, 0, 0, 0, 0, 0]) }, prev: null })[0]?.text === 'Уже 5 полных дней подряд');

await fresh({ habits: [{ id: 'n', name: 'Новая', icon: 'book', created: ago(2) }], log: {} });
openSummary(); await wait(500);
ok('too little history shows waiting text', $('sSum').textContent === 'Сводка появится через 5 дней' && $('sBody').hidden && getComputedStyle($('sRing')).display === 'none', $('sSum').textContent);
const wk0 = rangeDays('week', parseKey('2026-11-02')), mo0 = rangeDays('month', parseKey('2026-11-01'));
ok('just started period text', emptyText('week', wk0, '2026-11-02') === 'Неделя только началась' && emptyText('month', mo0, '2026-11-01') === 'Месяц только начался'
  && emptyText('week', wk0, '2026-11-03') === 'За этот период нет запланированных привычек');
closeOverlay($('sumOv')); await wait(400);

const evil = '<img src=x onerror="window.__xss=1">Йога';
const names = ['Вода', 'Бег', 'Чтение', 'Сон', 'Медитация', 'Зарядка', evil];
await fresh({ habits: names.map((name, i) => ({ id: 'h' + i, name, icon: 'book', color: '#22c55e', created: ago(70) })),
  log: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [ago(i + 1), Object.fromEntries(names.map((_, j) => ['h' + j, (i + j) % (j + 2) ? 1 : 0]))])) });
if (key(rangeDays('week', new Date())[0]) === todayKey()) { state.log[todayKey()] = Object.fromEntries(names.map((_, j) => ['h' + j, 1])); render(); await wait(250); }
const ring = document.querySelector('.hero-ring');
ok('ring is a button', ring.getAttribute('role') === 'button' && ring.tabIndex === 0 && getComputedStyle(ring).cursor === 'pointer');
ring.click(); await wait(600);
ok('ring opens summary', $('sumOv')._shown && $('sTitle').textContent === 'Сводка');
const pressed = () => [...$('sTabs').children].find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.r;
ok('week by default, next disabled', pressed() === 'week' && $('sNext').disabled && !$('sPrev').disabled);
const sofar = r => rangeDays(r, new Date()).filter(d => key(d) <= todayKey());
const wst = periodStats(sofar('week'));
ok('main line counts marks', $('sSum').textContent === marksText(wst.done, wst.total) && $('sRing').textContent === wst.pct + '%', [$('sSum').textContent, $('sRing').textContent, wst.done, wst.total]);
ok('day kinds add up to the days with a plan', [...$('sKinds').querySelectorAll('b')].map(b => +b.textContent).reduce((a, b) => a + b, 0) === wst.days && /полн/.test($('sKinds').textContent) && /частичн/.test($('sKinds').textContent) && /пропуск/.test($('sKinds').textContent));
ok('no tiles, info buttons or goals', !$('sSheet').querySelector('.tile, .tile-i') && !$('sGoals') && !$('sFilter') && !/Лучшая серия|сверх нормы/.test($('sSheet').textContent));
ok('comparison is plain or hidden', $('sCmp').hidden || /^(▲ на \d+% лучше, чем|▼ на \d+% хуже, чем|Так же, как) /.test($('sCmp').textContent), $('sCmp').textContent);
const weekSoFar = sofar('week').length, cells = () => [...$('sDays').querySelectorAll('.s-d')];
ok('week shows seven day rings, future ones dashed', cells().length === 7 && cells().filter(c => c.classList.contains('fut')).length === 7 - weekSoFar && $('sDaysTitle').textContent === 'По дням');
const tipCell = cells().filter(c => !c.classList.contains('fut') && !c.classList.contains('now'))[0] || cells()[0];
ok('day tip names missed habits', /^\d+ \S+: \d+ из 7 привычек, (не выполнено: .+|всё выполнено|ещё не отмечено: .+)$/.test(tipCell.dataset.tip), tipCell.dataset.tip);
tipCell.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(100);
ok('tap on day shows tip', $('sDays').querySelector('.tip')?.classList.contains('show') && $('sDays').querySelector('.tip').textContent === tipCell.dataset.tip);

$('sTabs').querySelector('[data-r=month]').click(); await wait(300);
const mst = periodStats(sofar('month'));
ok('month tab recalculates', pressed() === 'month' && ($('sSum').textContent === marksText(mst.done, mst.total) || (!mst.total && $('sSum').textContent === 'Месяц только начался')), [$('sSum').textContent, mst.done, mst.total]);
ok('month shows a calendar of rings', cells().length === rangeDays('month', new Date()).length && $('sDays').querySelectorAll('.s-cal > small').length === 7);
ok('habit list shows 5 rows and the rest on demand', $('sHabits').querySelectorAll('.hab-row').length === 5 && !$('sMore').hidden && $('sMore').textContent === 'Ещё 2 привычки', $('sMore').textContent);
$('sMore').click(); await wait(150);
ok('show all expands', $('sHabits').querySelectorAll('.hab-row').length === 7 && $('sMore').textContent === 'Свернуть');
ok('html in habit names shown as text', $('sHabits').textContent.includes(evil) && !$('sHabits').querySelector('img') && !$('sDays').querySelector('img') && !window.__xss);
const rowPct = r => +r.getAttribute('aria-label').match(/(\d+)%$/)[1], hrows = [...$('sHabits').querySelectorAll('.hab-row')];
ok('lagging habits come first', hrows.every((r, i) => !i || rowPct(hrows[i - 1]) <= rowPct(r)), hrows.map(rowPct));
ok('lagging habits are marked', hrows.every(r => r.classList.contains('low') === rowPct(r) < 60));
ok('row says how many days', hrows.every(r => /^\d+ из \d+ (дня|дней)$/.test(r.querySelector('.hr-val').textContent)) && !!hrows[0].querySelector('.hicon'));
ok('observations: two at most', $('sObsWrap').hidden ? !$('sObs').children.length : $('sObs').children.length <= 2);
$('sPrev').click(); await wait(450);
ok('past month is whole', $('sSub').textContent === 'за весь месяц' && !cells().some(c => c.classList.contains('fut')) && ($('sCmp').hidden || / в \S+/.test($('sCmp').textContent)), [$('sSub').textContent, $('sCmp').textContent]);
$('sNext').click(); await wait(450);
const kindsEl = $('sKinds').firstElementChild;
renderSummary(); await wait(100);
ok('blocks not redrawn when values same', $('sKinds').firstElementChild === kindsEl);
$('sTabs').querySelector('[data-r=year]').click(); await wait(300);
const rows = [...$('sDays').querySelectorAll('.mrow')], m = new Date().getMonth();
ok('year shows rows for past months, newest first', rows.length >= 1 && rows.length <= m + 1 && $('sDaysTitle').textContent === 'По месяцам' && +rows[0].dataset.m === m && rows[0].classList.contains('now') && rows.every(r => /\d+%|нет плана/.test(r.querySelector('.mv').textContent)), rows.map(r => r.textContent));
ok('month row says marks in words', !rows[0].querySelector('.mv small') || /^\d+ из \d+ отмет(ки|ок)$/.test(rows[0].querySelector('.mv small').textContent));
rows[0].click(); await wait(300);
ok('month bar opens that month', pressed() === 'month' && $('sLabel').textContent.startsWith(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][m]), $('sLabel').textContent);
$('sHabits').querySelector('.hab-row').click(); await wait(500);
ok('habit row opens history above summary', $('histOv')._shown && $('sumOv')._shown);
closeOverlay($('histOv')); hist = null; await wait(400);
$('sHow').click(); await wait(150);
ok('how-it-works lists the rules', ['Отметка', 'Выполнено', 'Дни', 'Сравнение', 'Привычки'].every(t => document.querySelector('.menu.pop')?.textContent.includes(t)));
closeMenu();
ok('no horizontal scroll in sheet', $('sSheet').scrollWidth <= $('sSheet').clientWidth + 1, [innerWidth, $('sSheet').scrollWidth, $('sSheet').clientWidth]);
closeOverlay($('sumOv')); await wait(400);

const skipPrev = Object.fromEntries(rangeDays('month', shiftAnchor('month', new Date(), -1)).map(d => [key(d), { e: 1 }]));
await fresh({ habits: [{ id: 'e', name: 'Одна', icon: 'book', color: '#22c55e', created: ago(70) }],
  log: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [ago(i + 1), { e: i % 3 ? 1 : 0 }])), skip: skipPrev });
openSummary(); await wait(400);
$('sTabs').querySelector('[data-r=month]').click(); await wait(250);
ok('one habit month works', $('sHabits').querySelectorAll('.hab-row').length === 1 && $('sMore').hidden && !$('sBody').hidden);
$('sPrev').click(); await wait(450);
ok('empty month says so', $('sSum').textContent === 'За этот период нет запланированных привычек' && $('sBody').hidden);
closeOverlay($('sumOv')); await wait(400);
ring.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
ok('ring opens by keyboard', $('sumOv')._shown);
closeOverlay($('sumOv')); await wait(400);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
