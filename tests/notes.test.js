window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const dAgo = n => parseKey(ago(n));

state = normalize({ habits: [
  { id: 'r', name: 'Бег', target: 5, unit: 'км', icon: 'run', color: '#f97316', created: ago(20) },
  { id: 'w', name: 'Вода', icon: 'water', color: '#0ea5e9', created: ago(20) },
], log: { [ago(4)]: { r: 5 }, [ago(3)]: { r: 5 }, [ago(2)]: { r: 3 }, [ago(1)]: { r: 5 } }, notes: {
  [ago(1)]: { r: 'Пробежал за 20 минут', w: '   ', ghost: 'нет такой' },
  [ago(5)]: { r: 'x'.repeat(700) },
  bad: { r: 'плохой ключ' },
} });
viewDate = new Date(); document.body.dataset.view = '7d';
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const h = findHabit('r');

ok('notes normalized', noteOf(h, dAgo(1)) === 'Пробежал за 20 минут' && !state.notes[ago(1)].w && !state.notes[ago(1)].ghost && !state.notes.bad && noteOf(h, dAgo(5)).length === 500, state.notes);
ok('streak on a date', streak(h, ago(1)) === 1 && streak(h, ago(2)) === 0 && streak(h, ago(3)) === 2 && streak(h) === 1, [streak(h, ago(1)), streak(h, ago(2)), streak(h, ago(3)), streak(h)]);
ok('notes survive export and import', same(normalize(JSON.parse(JSON.stringify(state))).notes, state.notes));

openHistory('r'); await wait(500);
$('hTabs').querySelector('[data-r=week]').click(); await wait(200);
const cell = k => $('hChart').querySelector(`[data-day="${k}"]`);
const inWeek = n => periodDays().some(d => key(d) === ago(n));
ok('past days are tappable, future are not', !!cell(todayKey()) && !$('hChart').querySelector(`[data-day="${key(addDays(new Date(), 1))}"]`));
if (!inWeek(2)) { $('hPrev').click(); await wait(200); }
ok('day with note is marked', cell(ago(1)) ? cell(ago(1)).classList.contains('note') && !cell(ago(2)).classList.contains('note') : true);

cell(ago(2)).click(); await wait(450);
const facts = () => $('dFacts').textContent.replace(/\s+/g, ' ');
ok('day window opens above history', $('dayOv')._shown && $('histOv')._shown && $('dayOv').contains(document.elementFromPoint(innerWidth / 2, innerHeight - 40)));
ok('day window shows date', $('dDate').textContent.startsWith(fmtLong(ago(2))) && $('dName').textContent === 'Бег', $('dDate').textContent);
ok('partial day facts', facts().includes('5 км в день') && facts().includes('Частично') && facts().includes('3 из 5 км') && /Серия\s*Нет/.test(facts()), facts());
ok('empty note field and no delete', $('dNote').value === '' && $('dNoteDel').hidden);

$('dNote').value = 'Подвернул ногу, не смогу бежать';
$('dNote').dispatchEvent(new Event('input', { bubbles: true })); await wait(250);
ok('typing saves note', noteOf(h, dAgo(2)) === 'Подвернул ногу, не смогу бежать' && !$('dNoteDel').hidden);
ok('history marks new note', cell(ago(2)).classList.contains('note'));
ok('note persisted to storage', JSON.parse(localStorage.getItem(STORE)).notes[ago(2)].r === 'Подвернул ногу, не смогу бежать');
$('dNote').value = 'x'.repeat(450); $('dNote').dispatchEvent(new Event('input', { bubbles: true }));
ok('length counter near limit', $('dNoteCount').textContent === '450 / 500' && $('dNote').maxLength === 500, $('dNoteCount').textContent);
$('dNote').value = 'Подвернул ногу'; $('dNote').dispatchEvent(new Event('input', { bubbles: true }));

$('dNoteDel').click(); await wait(250);
ok('delete removes note', !noteOf(h, dAgo(2)) && $('dNote').value === '' && $('dNoteDel').hidden && !cell(ago(2)).classList.contains('note'));
$('toastUndo').click(); await wait(250);
ok('undo restores note', noteOf(h, dAgo(2)) === 'Подвернул ногу' && $('dNote').value === 'Подвернул ногу');
$('dNote').value = '   '; $('dNote').dispatchEvent(new Event('input', { bubbles: true }));
ok('blank text deletes note', !noteOf(h, dAgo(2)) && !state.notes[ago(2)]);
$('dNote').value = 'Подвернул ногу'; $('dNote').dispatchEvent(new Event('input', { bubbles: true }));
$('dSheet').querySelector('[data-close]').click(); await wait(400);
ok('closing day keeps history', !$('dayOv')._shown && $('histOv')._shown);

if (inWeek(1) || cell(ago(1))) {
  cell(ago(1)).click(); await wait(400);
  ok('full day facts and streak', facts().includes('Полностью') && facts().includes('5 из 5 км') && facts().includes('1 день') && $('dNote').value === 'Пробежал за 20 минут', facts());
  $('dSheet').querySelector('[data-close]').click(); await wait(400);
}
$('hTabs').querySelector('[data-r=month]').click(); await wait(250);
if (!cell(ago(3))) { $('hPrev').click(); await wait(250); }
cell(ago(3)).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
ok('month day opens by keyboard', $('dayOv')._shown && facts().includes('Полностью') && facts().includes('2 дня'), facts());
$('dSheet').querySelector('[data-close]').click(); await wait(400);
ok('days before creation are not tappable', !$('hChart').querySelector(`[data-day="${ago(21)}"]`) && (!periodDays().some(d => key(d) === ago(21)) || !!$('hChart').querySelector('[data-tip]:not([data-day])')));
closeOverlay($('histOv')); hist = null; await wait(400);

const card = id => document.querySelector(`.habit[data-id="${id}"]`);
card('w').querySelector('.more').click(); await wait(300);
const item = [...menuEl.querySelectorAll('button')].find(b => b.textContent.includes('заметк'));
ok('card menu offers note', item?.textContent.trim() === 'Добавить заметку', menuEl.textContent);
item.click(); await wait(450);
ok('card menu opens today window', $('dayOv')._shown && $('dName').textContent === 'Вода' && $('dDate').textContent.includes('сегодня') && facts().includes('Пока не выполнено'), facts());
$('dNote').value = 'Выпил 2 стакана'; $('dNote').dispatchEvent(new Event('input', { bubbles: true }));
closeOverlay($('dayOv')); await wait(400);
card('w').querySelector('.more').click(); await wait(300);
ok('menu label for existing note', [...menuEl.querySelectorAll('button')].some(b => b.textContent.trim() === 'Заметка'));
closeMenu();

const base = { habits: state.habits, categories: [], log: {}, skip: {}, notes: { [ago(1)]: { r: 'старая' }, [ago(3)]: { r: 'общая' } } };
const loc = { ...base, notes: { [ago(1)]: { r: 'изменена здесь' }, [ago(3)]: { r: 'общая' }, [ago(6)]: { w: 'новая здесь' } } };
const rem = { ...base, notes: { [ago(1)]: { r: 'старая' }, [ago(4)]: { r: 'новая там' } } };
const mg = mergeStates(base, loc, rem);
ok('merge keeps notes from both devices', mg.notes[ago(1)].r === 'изменена здесь' && mg.notes[ago(6)].w === 'новая здесь' && mg.notes[ago(4)].r === 'новая там', mg.notes);
ok('merge respects remote delete', !mg.notes[ago(3)], mg.notes);

state.habits = state.habits.filter(x => x.id !== 'w');
state = normalize(state);
ok('notes of deleted habit dropped', !Object.values(state.notes).some(m => m.w));

openForm(); await wait(400);
ok('name is typed in the preview card', $('formPrev').contains($('name')) && document.activeElement === $('name') && $('name').placeholder === 'Название привычки'
  && ![...$('form').querySelectorAll('.field > .lbl')].some(l => l.textContent.trim() === 'Название'));
const nBefore = state.habits.length;
$('name').value = '   '; $('form').requestSubmit(); await wait(200);
ok('empty name is not saved', state.habits.length === nBefore && $('formOv')._shown);
const pr = $('formPrev').getBoundingClientRect(), nr = $('name').getBoundingClientRect();
ok('name field fits in preview', nr.left >= pr.left && nr.right <= pr.right && nr.height >= 20 && getComputedStyle($('name')).fontSize === '16px', [pr, nr]);
closeOverlay($('formOv')); await wait(400);
openForm('r'); await wait(400);
ok('edit shows name in preview', $('name').value === 'Бег');
$('target').value = 8; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
const r2 = findHabit('r');
ok('goal change remembered', r2.target === 8 && r2.goals?.length === 1 && r2.goals[0].until === ago(1) && r2.goals[0].target === 5 && r2.goals[0].unit === 'км', r2.goals);
ok('goal on a date', goalOn(r2, dAgo(2)).target === 5 && goalOn(r2, new Date()).target === 8);
openForm('r'); await wait(400);
$('target').value = 3; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
ok('second change same day keeps one entry', r2.target === 3 && r2.goals.length === 1 && r2.goals[0].target === 5, r2.goals);
ok('lower goal keeps real counts', state.log[ago(1)].r === 5 && rawCount(r2, dAgo(1)) === 5 && count(r2, dAgo(1)) === 5 && targetOn(r2, dAgo(1)) === 5 && targetOn(r2, new Date()) === 3);
ok('stats use goal of each day', streak(r2, ago(1)) === 1 && streak(r2, ago(3)) === 2 && lifeStats(r2).full === 3 && lifeStats(r2).best === 2, [streak(r2, ago(1)), lifeStats(r2)]);
state.log[todayKey()] = { ...(state.log[todayKey()] || {}), r: 3 };
ok('today counts against new goal', streak(r2) === 2 && lifeStats(r2).full === 4 && dayProgress(new Date()).done === 1, [streak(r2), lifeStats(r2)]);
viewDate = dAgo(2); render(); await wait(300);
const rc = document.querySelector('.habit[data-id="r"]');
ok('card on old day shows that day goal', rc.querySelector('.m-lead').textContent.includes('3 / 5'), rc.querySelector('.m-lead').textContent);
rc.querySelector('.check').click(); await wait(200);
ok('marking old day caps at that day goal', state.log[ago(2)].r === 4);
rc.querySelector('.check').click(); await wait(200);
ok('old day completes at its own goal', state.log[ago(2)].r === 5 && streak(r2, ago(1)) === 4, [state.log[ago(2)].r, streak(r2, ago(1))]);
hideToast();
viewDate = new Date(); render(); await wait(200);
openHistory('r'); await wait(400);
const bar = $('hTiles').querySelector('.bar i');
$('hTabs').querySelector('[data-r=month]').click(); await wait(150);
$('hPrev').click(); await wait(150); $('hNext').click(); await wait(150);
$('hTabs').querySelector('[data-r=week]').click(); await wait(150);
ok('stat tiles not redrawn when paging', $('hTiles').querySelector('.bar i') === bar);
ok('history ring of old day uses its goal', dayState(r2, dAgo(2)) === 'full' && dayState(r2, new Date()) === 'full');
closeOverlay($('histOv')); hist = null; await wait(400);
openDay('r', dAgo(2)); await wait(400);
ok('day window uses goal of that day', facts().includes('5 км в день') && facts().includes('Полностью') && facts().includes('5 из 5 км') && facts().includes('3 дня'), facts());
closeOverlay($('dayOv')); await wait(400);
openDay('r', new Date()); await wait(400);
ok('today uses current goal', facts().includes('3 км в день'), facts());
closeOverlay($('dayOv')); await wait(400);
ok('goal history survives normalize', same(normalize(JSON.parse(JSON.stringify(state))).habits[0].goals, r2.goals));

viewDate = new Date(); render(); await wait(200);
const strip = $('days'), sb = strip.getBoundingClientRect(), y = sb.top + sb.height / 2;
const swipe = async (from, to) => {
  const o = { bubbles: true, pointerId: 7, isPrimary: true, button: 0, clientY: y };
  strip.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: from }));
  for (let i = 1; i <= 5; i++) strip.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: from + (to - from) * i / 5 }));
  strip.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: to }));
  await wait(400);
};
const before = key(viewDate);
await swipe(sb.left + 40, sb.left + 240);
ok('swipe right shows previous week', key(viewDate) === key(addDays(parseKey(before), -7)), key(viewDate));
await swipe(sb.left + 240, sb.left + 40);
ok('swipe left shows next week', key(viewDate) === before, key(viewDate));
await swipe(sb.left + 240, sb.left + 40);
ok('cannot swipe past current week', key(viewDate) === before && !strip.style.transform, key(viewDate));
await swipe(sb.left + 100, sb.left + 130);
ok('short swipe does nothing', key(viewDate) === before);
state = normalize({ categories: [{ id: 'a', name: 'Спорт' }, { id: 'b', name: 'Дом' }], habits: [
  { id: 'h1', name: 'Первая', cat: 'a', created: ago(5) }, { id: 'h2', name: 'Вторая', cat: 'a', created: ago(5) },
  { id: 'h3', name: 'Третья', cat: 'a', created: ago(5) }, { id: 'h4', name: 'Дома', cat: 'b', created: ago(5) },
], log: {} });
setGroupMode('custom'); viewDate = new Date();
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const hc = id => document.querySelector(`.habit[data-id="${id}"]`);
const order = () => state.habits.map(x => x.id).join();
const press = async (el, dy, hold = LONG_PRESS + 80, at = '.info') => {
  const t = el.querySelector(at) || el, r = t.getBoundingClientRect(), x = r.left + 20, y0 = r.top + r.height / 2;
  const o = { bubbles: true, pointerId: 9, isPrimary: true, button: 0, clientX: x };
  t.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientY: y0 }));
  await wait(hold);
  const lifted = el.classList.contains('dragging');
  for (let i = 1; i <= 8; i++) { el.dispatchEvent(new PointerEvent('pointermove', { ...o, clientY: y0 + dy * i / 8 })); await wait(16); }
  el.dispatchEvent(new PointerEvent('pointerup', { ...o, clientY: y0 + dy }));
  el.click();
  await wait(300);
  return lifted;
};
const step1 = hc('h2').offsetTop - hc('h1').offsetTop;
ok('long press lifts card', await press(hc('h1'), step1));
ok('long press drag reorders within category', order() === 'h2,h1,h3,h4' && liveCards(hc('h1').parentElement).map(c => c.dataset.id).join() === 'h2,h1,h3', order());
ok('release after drag does not open history', !$('histOv')._shown);
ok('order saved', JSON.parse(localStorage.getItem(STORE)).habits.map(x => x.id).join() === 'h2,h1,h3,h4');
await press(hc('h3'), step1 * 3);
ok('drag cannot leave its category', order() === 'h2,h1,h3,h4' && hc('h3').parentElement !== hc('h4').parentElement, order());
await press(hc('h2'), step1 * 1.6, 120);
ok('short press does not drag', order() === 'h2,h1,h3,h4' && !hc('h2').classList.contains('dragging'));
closeOverlay($('histOv')); hist = null; await wait(400);
await press(hc('h2'), step1 * 1.6, LONG_PRESS + 80, '.check');
ok('long press on check does not drag', order() === 'h2,h1,h3,h4');
ok('single card in section cannot be lifted', !(await press(hc('h4'), 0)));
closeOverlay($('histOv')); hist = null; await wait(400);
setGroupMode('time'); render();

ok('strip allows vertical scroll only', getComputedStyle(strip).touchAction === 'pan-y');

{
  const keep = { enabled: cloud.enabled, session: cloud.session, sub: push.sub };
  const perm = Object.getOwnPropertyDescriptor(Notification, 'permission');
  let p = 'default';
  Object.defineProperty(Notification, 'permission', { get: () => p, configurable: true });
  const vis = id => !$(id).hidden;
  const seen = {};
  for (const [s, pp] of [['off'], ['login'], ['ready'], ['on', 'granted'], ['denied', 'denied']]) {
    p = pp || 'default';
    cloud.enabled = s !== 'off'; cloud.session = s === 'login' ? null : { user: { id: 'x' } }; push.sub = s === 'on' ? {} : null;
    renderPush();
    seen[s] = [pushState(), vis('pushGroup'), $('pushTitle').textContent !== '', vis('pushOn'), vis('pushTest'), vis('pushOff'), vis('notifyBox')].join();
  }
  ok('reminder block per state', seen.off.startsWith('off,false') && seen.login === 'login,true,true,true,false,false,true' && seen.ready === 'ready,true,true,true,false,false,true'
    && seen.on === 'on,true,true,false,true,true,true' && seen.denied === 'denied,true,true,false,false,false,false', seen);
  Object.assign(cloud, { enabled: keep.enabled, session: keep.session }); push.sub = keep.sub;
  if (perm) Object.defineProperty(Notification, 'permission', perm); else delete Notification.permission;
  renderPush();
}
localStorage.removeItem(NOTIFY_STORE);
renderNotify();
const radios = () => [...$('notifyList').querySelectorAll('[role=radio]')];
ok('notify privacy offers two modes, names shown by default', radios().length === 2 && radios()[0].getAttribute('aria-checked') === 'true' && radios()[0].textContent.includes('Показывать название') && radios()[1].textContent.includes('Скрывать содержимое'));
radios()[1].click(); await wait(300);
const cached = await (await (await caches.open('prefs')).match(new URL('__prefs/notify-test', document.baseURI).href))?.text();
ok('hide mode saved for device and service worker', localStorage.getItem(NOTIFY_STORE) === 'hide' && radios()[1].getAttribute('aria-checked') === 'true' && cached === 'hide', cached);
ok('test run does not touch real setting key', NOTIFY_STORE.includes('-test'));
radios()[0].click(); await wait(200);
ok('switch back to showing names', notifyMode() === 'show');
localStorage.removeItem(NOTIFY_STORE);

const swSrc = await (await fetch('sw.js?x=' + Date.now())).text();
const notifyView = new Function(swSrc.match(/function notifyView[\s\S]*?\n\}/)[0] + '\nreturn notifyView;')();
const one = { title: 'Бег', body: 'Пора выполнить привычку — осталось 3 из 5 км', ids: ['r'] };
const many = { title: 'Ждут привычки: 2', body: 'Бег, Вода', ids: ['r', 'w'] };
const s1 = notifyView(one, 'show'), h1 = notifyView(one, 'hide'), h2 = notifyView(many, 'hide');
ok('shown notification keeps name and done button', s1.title === 'Бег' && s1.body.includes('3 из 5 км') && s1.done);
ok('hidden notification has no names or numbers', h1.title === 'Трекер привычек' && h1.body === 'Пора отметить привычку' && !h1.done && h1.ids[0] === 'r', h1);
ok('hidden group notification only counts', h2.body === 'Пора отметить привычки: 2' && !/Бег|Вода/.test(h2.title + h2.body) && !h2.done, h2);
ok('missing mode falls back to showing', notifyView(one, undefined).title === 'Бег');
ok('service worker keeps setting across versions', /k !== PREFS/.test(swSrc) && swSrc.includes("__prefs/notify'"));

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
