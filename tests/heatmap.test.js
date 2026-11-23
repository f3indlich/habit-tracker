window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const mondayOf = d => key(addDays(d, -weekday(d)));

try { localStorage.removeItem(HEAT_MODE_STORE); } catch {}

ok('heat slots: 24 hours and 12 pairs', heatSlots(24).length === 24 && heatSlots(12).length === 12 && heatSlots(24)[19].label === '19' && heatSlots(12)[4].label === '8', [heatSlots(12)[0].label, heatSlots(12)[4].label]);
ok('band starts at 6/12/18', heatSlots(24)[6].band && heatSlots(24)[12].band && heatSlots(24)[18].band && !heatSlots(24)[7].band);

const empty = habitHeatmap({ id: 'h', created: ago(30), time: 'morning' }, { log: {}, logAt: {} }, ago(30), todayKey(), 24);
ok('empty data: zero total and empty flag', empty.total === 0 && empty.empty === true && empty.peakText === '' && empty.max === 0);

const oneDay = ago(1), oneWd = weekday(parseKey(oneDay));
const one24 = habitHeatmap(
  { id: 'h', created: ago(30), time: 'any' },
  { log: { [oneDay]: { h: 1 } }, logAt: { [oneDay]: { h: ['07:30'] } } },
  ago(30), todayKey(), 24
);
ok('24: one mark at hour 7', one24.total === 1 && one24.grid[oneWd][7] === 1 && one24.empty === true, one24);
const one12 = habitHeatmap(
  { id: 'h', created: ago(30), time: 'any' },
  { log: { [oneDay]: { h: 1 } }, logAt: { [oneDay]: { h: ['07:30'] } } },
  ago(30), todayKey(), 12
);
ok('12: hour 7 goes to slot 3 (6–7)', one12.grid[oneWd][3] === 1 && one12.slots[3].label === '6', one12.slots[3]);

ok('slot edges 24: 23:59→23, 00:00→0', heatSlotOfHHMM('23:59', 24) === 23 && heatSlotOfHHMM('00:00', 24) === 0 && heatSlotOfHHMM('05:59', 24) === 5 && heatSlotOfHHMM('06:00', 24) === 6);
ok('slot edges 12: 23:59→11, 00:00→0, 06:00→3', heatSlotOfHHMM('23:59', 12) === 11 && heatSlotOfHHMM('00:00', 12) === 0 && heatSlotOfHHMM('06:00', 12) === 3 && heatSlotOfHHMM('07:59', 12) === 3);

const mon = mondayOf(new Date()), sun = key(addDays(parseKey(mon), 6));
const weekLog = { [mon]: { h: 1 }, [sun]: { h: 1 } };
const weekAt = { [mon]: { h: ['09:00'] }, [sun]: { h: ['21:00'] } };
const weekHm = habitHeatmap({ id: 'h', created: ago(60), time: 'any' }, { log: weekLog, logAt: weekAt }, mon, sun, 24);
ok('week bounds: Monday 9 and Sunday 21', weekHm.grid[0][9] === 1 && weekHm.grid[6][21] === 1 && weekHm.total === 2, weekHm.grid);

const tz = habitHeatmap(
  { id: 'h', created: ago(10), time: 'any' },
  { log: { [ago(2)]: { h: 2 } }, logAt: { [ago(2)]: { h: ['01:15', '22:40'] } } },
  ago(10), todayKey(), 24
);
ok('local HH:MM slots (1 and 22)', tz.total === 2 && tz.grid[weekday(parseKey(ago(2)))][1] === 1 && tz.grid[weekday(parseKey(ago(2)))][22] === 1, tz.grid);

const old = habitHeatmap(
  { id: 'h', created: ago(20), time: 'evening' },
  { log: { [ago(3)]: { h: 1 }, [ago(4)]: { h: 1 }, [ago(5)]: { h: 1 } }, logAt: {} },
  ago(20), todayKey(), 24
);
ok('old marks without time use habit preference (20:00)', old.total === 3 && old.grid.reduce((s, row) => s + row[20], 0) === 3, old);

const peakH = { id: 'p', created: ago(40), time: 'any' };
const peakLog = {}, peakAt = {};
for (let i = 1; i <= 8; i++) {
  const day = key(addDays(parseKey(mondayOf(addDays(new Date(), -i * 7))), 4));
  peakLog[day] = { p: 1 };
  peakAt[day] = { p: ['19:30'] };
}
const peak24 = habitHeatmap(peakH, { log: peakLog, logAt: peakAt }, ago(90), todayKey(), 24);
ok('peak text 24: пт · 19', !peak24.empty && peak24.peak.wd === 4 && peak24.peak.slot === 19 && peak24.peakText === 'Чаще: пт · 19', peak24);
const peak12 = habitHeatmap(peakH, { log: peakLog, logAt: peakAt }, ago(90), todayKey(), 12);
ok('peak text 12: пт · 18–19', !peak12.empty && peak12.peak.slot === 9 && peak12.peakText === 'Чаще: пт · 18–19', peak12);

ok('empty state under threshold', habitHeatmap(peakH, { log: { [ago(1)]: { p: 2 } }, logAt: { [ago(1)]: { p: ['10:00', '10:05'] } } }, ago(5), todayKey(), 24).empty === true);
ok('heatPeakText helper', heatPeakText({ wd: 1, slot: 8, n: 5 }, 24) === 'Чаще: вт · 8' && heatPeakText({ wd: 1, slot: 4, n: 5 }, 12) === 'Чаще: вт · 8–9' && heatPeakText(null) === '');
ok('heatLevel steps', heatLevel(0, 10) === 0 && heatLevel(1, 10) === 1 && heatLevel(10, 10) === 3 && heatLevel(4, 10) === 2);

const fresh = async data => { state = normalize(data); viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(200); };
await fresh({ habits: [{ id: 't', name: 'Тест', target: 1, time: 'morning', color: '#2563eb', created: ago(40) }], log: {}, logAt: {} });
setCount(findHabit('t'), new Date(), 1, '08:15');
ok('setCount stores local HH:MM in logAt', state.log[todayKey()]?.t === 1 && state.logAt[todayKey()]?.t?.[0] === '08:15', state.logAt);
setCount(findHabit('t'), new Date(), 0);
ok('clearing count clears logAt', !state.log[todayKey()]?.t && !state.logAt[todayKey()]?.t);

const many = {};
const manyAt = {};
for (let i = 1; i <= 12; i++) {
  const d = ago(i);
  many[d] = { t: 1 };
  manyAt[d] = { t: [i % 2 ? '08:00' : '20:00'] };
}
await fresh({ habits: [{ id: 't', name: 'Тест', target: 1, time: 'morning', color: '#0ea5e9', created: ago(40) }], log: many, logAt: manyAt });
openHistory('t');
$('hTabs').querySelector('[data-r="month"]').click();
await wait(80);
ok('default mode is 12', savedHeatMode() === 12 && $('hHeat').querySelector('.hm-grid')?.dataset.mode === '12', savedHeatMode());
ok('heatmap block visible in habit sheet', !$('hHeatWrap').hidden && $('hHeat').querySelector('.hm-grid') && $('hHeat').querySelector('.hm-peak'), $('hHeat').innerHTML.slice(0, 200));
ok('modes live in the title row', $('hHeatModes') && $('hHeatModes').closest('.heat-head') && $('hHeatModes').querySelector('[data-hm="12"][aria-pressed="true"]'));
ok('12 mode has 84 cells and hot peak', $('hHeat').querySelectorAll('.hm-cell[data-tip]').length === 84 && $('hHeat').querySelector('.hm-hot') && $('hHeat').querySelector('.hm-grad'), $('hHeat').querySelectorAll('.hm-cell').length);

$('hHeatModes').querySelector('[data-hm="24"]').click();
await wait(40);
ok('switch to 24 keeps preference and 168 cells', savedHeatMode() === 24 && $('hHeat').querySelector('.hm-grid')?.dataset.mode === '24' && $('hHeat').querySelectorAll('.hm-cell').length === 168 && getPref(HEAT_MODE_STORE) === '24');

const merged = mergeStates(
  { habits: [], log: {}, logAt: {} },
  { habits: [{ id: 't', name: 'T', created: ago(5) }], log: { [ago(1)]: { t: 1 } }, logAt: { [ago(1)]: { t: ['09:00'] } } },
  { habits: [{ id: 't', name: 'T', created: ago(5) }], log: {}, logAt: {} }
);
ok('sync merge keeps logAt', merged.logAt[ago(1)]?.t?.[0] === '09:00', merged.logAt);

const norm = normalize({ habits: [{ id: 't', name: 'T', created: ago(5) }], log: { [ago(1)]: { t: 2 } }, logAt: { [ago(1)]: { t: ['09:00', 'bad', '21:00', '22:00'] } } });
ok('normalize trims logAt to count and drops bad times', JSON.stringify(norm.logAt[ago(1)].t) === JSON.stringify(['09:00', '21:00']), norm.logAt);

ok('no runtime errors', !__errs.length, __errs);
return R.join('\n');
