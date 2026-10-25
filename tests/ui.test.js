window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const T = todayKey(), c0 = key(addDays(new Date(), -10));
state = normalize({ habits: [
  { id: 'o', name: 'Изучение билетов ПДД', icon: 'book', created: c0 },
  { id: 'a', name: 'Не пить алкоголь', icon: 'noalcohol', color: '#22c55e', created: c0 },
  { id: 'm', name: 'Чтение', target: 15, unit: 'Минут', icon: 'book', color: '#0ea5e9', created: c0 },
  { id: 'p', name: 'Подтягивания', target: 100, step: 5, icon: 'strong', color: '#f97316', created: c0 },
], log: { [T]: { p: 20 } } });
document.body.dataset.view = '7d';
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(500);
const card = id => document.querySelector(`.habit[data-id="${id}"]`);
const ends = ['o', 'a', 'm', 'p'].map(id => Math.round(card(id).querySelector('.dots').lastElementChild.getBoundingClientRect().right));
const starts = ['o', 'a', 'm', 'p'].map(id => Math.round(card(id).querySelector('.dots').firstElementChild.getBoundingClientRect().left));
ok('week strip ends at same x', new Set(ends).size === 1, ends);
ok('week strip starts at same x', new Set(starts).size === 1, starts);
const pd = card('p').querySelector('.dots').getBoundingClientRect(), pc = card('p').querySelector('.ctl').getBoundingClientRect();
ok('week strip clear of controls', pd.right <= pc.left, { dots: pd.right, ctl: pc.left });

const lg = $('viewLegend');
ok('legend single line', lg.getBoundingClientRect().height < 22 && lg.scrollWidth <= lg.clientWidth + 1, { h: lg.getBoundingClientRect().height, sw: lg.scrollWidth, cw: lg.clientWidth });
ok('legend items', [...lg.children].map(s => s.textContent).join(',') === 'выполнено,частично,пропуск,не в плане', lg.textContent);

toast('Проверка', () => {}); await wait(450);
const tt = $('toast'), r0 = tt.getBoundingClientRect();
const ev = (type, x, y) => tt.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
ev('pointerdown', r0.left + 20, r0.top + 10); ev('pointermove', r0.left + 60, r0.top + 12);
ok('toast follows finger', tt.style.transform.includes('40px'), tt.style.transform);
ev('pointermove', r0.left + 160, r0.top + 12); ev('pointerup', r0.left + 160, r0.top + 12); await wait(400);
ok('toast swiped aside hides', !tt.classList.contains('show') && !tt.style.transform, [tt.className, tt.style.transform]);
toast('Проверка вниз', () => {}); await wait(450);
const r1 = tt.getBoundingClientRect();
ev('pointerdown', r1.left + 20, r1.top + 10); ev('pointermove', r1.left + 22, r1.top + 70); ev('pointerup', r1.left + 22, r1.top + 70); await wait(400);
ok('toast swiped down hides', !tt.classList.contains('show'));
toast('Короткий жест', () => {}); await wait(450);
const r2 = tt.getBoundingClientRect();
ev('pointerdown', r2.left + 20, r2.top + 10); ev('pointermove', r2.left + 35, r2.top + 12); ev('pointerup', r2.left + 35, r2.top + 12); await wait(300);
ok('short drag returns toast', tt.classList.contains('show') && !tt.style.transform);
hideToast();

for (let i = 0; i < 8; i++) { state.habits.push({ id: 'x' + i, name: 'Привычка ' + i, icon: 'check', target: 1, color: '#64748b', created: c0 }); }
state = normalize(state); render(); await wait(400);
scrollTo(0, 0); await wait(100); scrollTo(0, 400); await wait(150);
ok('fab hides on scroll down', document.body.classList.contains('fab-away'));
scrollTo(0, 300); await wait(150);
ok('fab returns on scroll up', !document.body.classList.contains('fab-away'));
scrollTo(0, 500); await wait(150); scrollTo(0, 0); await wait(150);
ok('fab visible at top', !document.body.classList.contains('fab-away'));

renderSettings(); openOverlay($('setOv')); await wait(500);
const order = [...$('setOv').querySelectorAll('.set-group > h3')].map(h => h.textContent);
ok('settings order', order.join(',') === 'Тема,Аккаунт,Напоминания,Привычки,Иконки привычек,Данные', order);
ok('theme compact', $('themeSeg').querySelector('button').getBoundingClientRect().height <= 36);
ok('account group visible without login', !$('setAcctGroup').hidden && !$('setName').hidden && $('setCloudIn').hidden);
ok('name shows not set', $('setNameVal').textContent === 'Не указано', $('setNameVal').textContent);
$('setName').click(); await wait(400);
ok('name sheet opens over settings', $('nameOv')._shown && $('nameTitle').textContent === 'Ваше имя' && $('nameSkip').textContent === 'Отмена');
$('nameInput').value = '  Андрей  '; $('nameForm').requestSubmit(); await wait(400);
ok('name saved', state.profile?.name === 'Андрей' && !$('nameOv')._shown, state.profile);
ok('name in settings', $('setNameVal').textContent === 'Андрей');
ok('name in greeting', $('hello').textContent.includes(', Андрей'), $('hello').textContent);
ok('name persisted', JSON.parse(localStorage.getItem(STORE)).profile?.name === 'Андрей');
closeOverlay($('setOv')); await wait(400);
ok('name normalize trims', normalize({ habits: [], log: {}, profile: { name: '  Ира ' } }).profile.name === 'Ира' && !('profile' in normalize({ habits: [], log: {}, profile: { name: '' } })));
const base = { habits: [], categories: [], log: {}, skip: {}, profile: { name: 'А' } };
ok('merge name local change', mergeStates(base, { ...base, profile: { name: 'Б' } }, base).profile.name === 'Б');
ok('merge name remote change', mergeStates(base, base, { ...base, profile: { name: 'В' } }).profile.name === 'В');
ok('no name prompt in test mode', !$('nameOv')._shown);

let selects = [];
const fakeRow = { data: JSON.parse(JSON.stringify(state)), version: 5 };
cloud.sb = { from: () => ({ select: cols => { selects.push(cols); return { eq: () => ({ maybeSingle: async () => ({ data: cols === 'version' ? { version: 5 } : fakeRow, error: null }) }) }; } }) };
cloud.session = { user: { id: 'u1', email: 't@example.com' } };
saveBase(5, JSON.parse(JSON.stringify(state)));
const statusBefore = cloud.status;
await cloudCheck(); await wait(50);
ok('check asks only version when nothing changed', selects.join() === 'version' && cloud.status === statusBefore, [selects, cloud.status]);
selects = [];
saveBase(4, JSON.parse(JSON.stringify(state)));
await cloudCheck(); await wait(100);
ok('check pulls data when version changed', selects.includes('version') && selects.includes('data, version'), selects);
cloud.session = null; cloud.sb = null; setSync('off');
try { localStorage.removeItem(BASE_STORE); } catch {}

renderSettings(); openOverlay($('setOv')); await wait(700);
const ver = (document.querySelector('script[src*="app.js"]').src.match(/\?v(\d+)/) || [])[1];
ok('about version', $('appVersion').textContent === `Версия ${ver}`, $('appVersion').textContent);
ok('about updated date', !$('appUpdated').hidden && /^Обновлено \d{1,2} [а-я]+ \d{4} в \d\d:\d\d$/.test($('appUpdated').textContent), $('appUpdated').textContent);
ok('about note', $('setOv').querySelector('.about-txt small').textContent === 'Реализовано для удобства');
ok('about is last in data block', $('importFile').nextElementSibling.classList.contains('app-about'));
closeOverlay($('setOv')); await wait(400);
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
