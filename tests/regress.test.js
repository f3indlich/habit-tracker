window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const T = todayKey();
state = normalize({ habits: [
  { id: 'p', name: 'Подтягивания', target: 100, step: 5, unit: 'раз', icon: 'strong', color: '#f97316', created: key(addDays(new Date(), -40)) },
  { id: 'o', name: 'Чтение', icon: 'books', color: '#4f46e5', created: key(addDays(new Date(), -40)) },
], categories: [{ id: 'c1', name: 'Спорт' }], log: { [T]: { p: 50 } } });
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const card = id => document.querySelector(`.habit[data-id="${id}"]`);
openHistory('p'); await wait(600);
ok('history tag step', [...$('hTags').children].some(t => t.textContent.includes('шаг 5')), $('hTags').textContent);
ok('history renders chart', $('hChart').innerHTML.length > 100);
for (const r of ['month', 'year']) { $('hTabs').querySelector(`[data-r=${r}]`).click(); await wait(300); }
ok('history year heat', !$('hHeatWrap').hidden);
closeOverlay($('histOv')); hist = null; await wait(400);
for (const v of Object.keys(VIEWS)) {
  document.body.dataset.view = v; render(); await wait(120);
  const c = card('p'), dots = getComputedStyle(c.querySelector('.dots')).display, mh = getComputedStyle(c.querySelector('.mh')).display;
  ok('view ' + v, v === '7d' ? dots !== 'none' && mh === 'none' : dots === 'none', { dots, mh });
}
document.body.dataset.view = '7d'; render();
setReorder(true); await wait(200);
ok('reorder hides dots and fab', getComputedStyle(card('p').querySelector('.dots')).display === 'none' && getComputedStyle($('fab')).display === 'none');
setReorder(false); await wait(200);
setSkip(findHabit('o'), new Date(), true); await wait(100);
ok('skip', isSkipped(findHabit('o'), new Date()) && card('o').classList.contains('skipped'));
setSkip(findHabit('o'), new Date(), false);
changeCount(findHabit('o'), new Date(), 1); await wait(100);
ok('undo toast shown', $('toast').classList.contains('show') && !$('toastUndo').hidden);
$('toastUndo').click(); await wait(100);
ok('undo works', count(findHabit('o'), new Date()) === 0);
archiveHabit('o'); await wait(500);
ok('archive', !!findHabit('o').archived && !card('o')?.isConnected || card('o')?.classList.contains('leaving'));
renderSettings(); openOverlay($('setOv')); await wait(500);
ok('settings cats info', $('setCatsInfo').textContent.startsWith('1 тип: Спорт'), $('setCatsInfo').textContent);
$('setCats').click(); await wait(500);
ok('cats sheet over settings', $('catOv')._shown && $('setOv')._shown);
$('catNewName').value = 'Ум'; $('catNewAdd').click(); await wait(100);
ok('add cat updates info', $('setCatsInfo').textContent.startsWith('2 типа'), $('setCatsInfo').textContent);
closeOverlay($('catOv')); closeOverlay($('setOv')); await wait(400);
openForm(); await wait(400);
const before = state.habits.length;
$('name').value = 'Тест'; $('form').requestSubmit(); await wait(300);
ok('create once habit', state.habits.length === before + 1 && state.habits.at(-1).target === 1 && !state.habits.at(-1).step);
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
