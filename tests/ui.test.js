window.wait = ms => new Promise(r => setTimeout(r, ms));
window.waitFor = async (cond, timeout = 3000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > timeout) return false; await wait(30); } return true; };
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
lg.hidden = false;
ok('legend single line', lg.getBoundingClientRect().height < 22 && lg.scrollWidth <= lg.clientWidth + 1, { h: lg.getBoundingClientRect().height, sw: lg.scrollWidth, cw: lg.clientWidth });
ok('legend items', [...lg.children].map(s => s.textContent).join(',') === 'выполнено,частично,пропуск,не в плане', lg.textContent);
renderLegend();

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
ok('tab bar stays on scroll', getComputedStyle($('tabbar')).opacity === '1' && $('fab').getBoundingClientRect().width > 0);
scrollTo(0, 0); await wait(150);

renderSettings(); openOverlay($('setOv')); await wait(500);
const order = [...$('setOv').querySelectorAll('.set-group > h3')].map(h => h.textContent);
ok('settings order', order.join(',') === 'Тема,Профиль,Напоминания,Главный экран,Цели,Задачи,Цвета,Анимации,Иконки привычек,Помощь,Данные', order);
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
const jsonb = v => Array.isArray(v) ? v.map(jsonb) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).map(k => [k, jsonb(v[k])])) : v;
ok('same ignores key order', same({ a: 1, b: { c: 2, d: [1, { e: 3, f: 4 }] } }, { b: { d: [1, { f: 4, e: 3 }], c: 2 }, a: 1 }) && !same({ a: 1 }, { a: 2 }));
selects = [];
let updates = 0;
const reordered = { data: jsonb(JSON.parse(JSON.stringify(state))), version: 6 };
cloud.sb = { from: () => ({
  select: cols => { selects.push(cols); return { eq: () => ({ maybeSingle: async () => ({ data: cols === 'version' ? { version: 6 } : reordered, error: null }) }) }; },
  update: () => { updates++; return { eq: () => ({ eq: () => ({ select: async () => ({ data: [{ version: 7 }], error: null }) }) }) }; },
}) };
saveBase(5, JSON.parse(JSON.stringify(state)));
await cloudSync(); await wait(900);
ok('reordered remote keys cause no push', updates === 0 && cloud.status === 'ok', { updates, status: cloud.status });
selects = [];
await cloudCheck(); await wait(900);
ok('no repeated sync after reordered pull', selects.join() === 'version' && updates === 0, { selects, updates });
cloud.session = null; cloud.sb = null; setSync('off');
try { localStorage.removeItem(BASE_STORE); } catch {}

state.profile = { name: 'Андрей' }; viewDate = new Date(); render();
const hl = $('hello'), dt = hl.querySelector('.hello-date');
ok('greeting has numeric date', /^\d{2}\.\d{2}\.\d{4} г\.$/.test(dt?.textContent) && hl.textContent.includes(', Андрей · '), hl.textContent);
ok('greeting fits one line in full', hl.getBoundingClientRect().height < 22 && hl.scrollWidth <= hl.clientWidth + 1 && getComputedStyle(hl).textOverflow !== 'ellipsis', { h: hl.getBoundingClientRect().height, sw: hl.scrollWidth, cw: hl.clientWidth });
ok('greeting spans full header width', Math.abs(hl.getBoundingClientRect().right - document.querySelector('.top').getBoundingClientRect().right) < 1);
const tr = $('title').getBoundingClientRect(), sb = $('acctBtn').getBoundingClientRect();
ok('title and buttons share a row', Math.abs((tr.top + tr.bottom) / 2 - (sb.top + sb.bottom) / 2) < 8, { title: tr.top, btn: sb.top });
state.profile = { name: 'Александра Константиновна' }; render();
ok('long name keeps date whole', hl.querySelector('.hello-date').getClientRects().length === 1 && getComputedStyle(hl).overflow !== 'hidden', hl.getBoundingClientRect().height);

state.categories = [{ id: 'c1', name: 'Интеллект' }]; Object.assign(findHabit('m'), { cat: 'c1', step: 5 });
openHistory('m'); await wait(600);
const tags = $('hTags');
ok('habit tags in one row', tags.children.length === 3 && [...tags.children].every(t => Math.abs(t.getBoundingClientRect().top - tags.children[0].getBoundingClientRect().top) < 1), [...tags.children].map(t => t.getBoundingClientRect().top));
ok('habit tags fit without scroll', tags.scrollWidth <= tags.clientWidth + 1, { sw: tags.scrollWidth, cw: tags.clientWidth });
const symmetric = el => { const r = el.getBoundingClientRect(); return Math.abs(r.left - (innerWidth - r.right)) <= 1 && r.top >= 0 && r.bottom <= innerHeight; };
ok('no info buttons on the numbers', !$('hSheet').querySelector('.tile-i, .plan-i') && $('hTrio').children.length === 3);
$('hHow').click(); await waitFor(() => menuEl?._anchor === $('hHow') && !menuEl.getAnimations().length);
const secs = [...(menuEl?.querySelectorAll('.pop-sec b') || [])].map(b => b.textContent);
ok('one how-it-works lists the numbers of this habit', menuEl && symmetric(menuEl) && secs.join() === 'Серия,Рекорд,Всего,Сделано и норма,Сравнение,По дням недели', secs);
$('hHow').click(); await waitFor(() => !menuEl);
ok('second tap closes how-it-works', !menuEl);
$('hInfo').click(); await waitFor(() => menuEl && symmetric(menuEl) && !menuEl.getAnimations().length);
ok('habit info popover centered', menuEl && symmetric(menuEl) && menuEl.querySelector('.facts'), menuEl?.getBoundingClientRect());
const arrowX = menuEl && parseFloat(menuEl.style.getPropertyValue('--ax')) + menuEl.getBoundingClientRect().left;
const hr = $('hInfo').getBoundingClientRect();
ok('popover arrow points at button', Math.abs(arrowX - (hr.left + hr.width / 2)) < 2, { arrowX, btn: hr.left + hr.width / 2 });
$('hInfo').click(); await waitFor(() => !menuEl);
ok('second tap closes habit info', !menuEl);
closeOverlay($('histOv')); hist = null; await wait(400);

renderSettings(); openOverlay($('setOv')); await wait(700);
const ver = (document.querySelector('script[src*="app.js"]').src.match(/[?&]v=([^&#]+)/) || [])[1];
ok('about version', /^\d+\.\d{1,2}[a-z]?$/.test(ver) && $('appVersion').textContent === `Версия ${ver}`, $('appVersion').textContent);
{
  const lm = await fetch(APP_SRC).then(r => r.headers.get('last-modified')).catch(() => null);
  if (lm) await waitFor(() => !$('appUpdated').hidden);
  ok('about updated date', lm ? !$('appUpdated').hidden && /^Обновлено \d{1,2} [а-я]+ \d{4} г\.$/.test($('appUpdated').textContent) : $('appUpdated').hidden, [lm, $('appUpdated').textContent]);
}
ok('about has no filler note', !$('setOv').querySelector('.about-txt small'));
ok('about is last in data block', $('importFile').nextElementSibling.classList.contains('app-about'));
closeOverlay($('setOv')); await wait(400);

const html = await (await fetch('index.html?x=' + Date.now())).text();
ok('index.html has no Google Fonts links', !/<link[^>]+fonts\.(googleapis|gstatic)\.com/.test(html) && !document.querySelector('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]'));
ok('emoji font stays in the font list', /Apple Color Emoji.*Noto Color Emoji.*Segoe UI Emoji/.test(getComputedStyle(document.documentElement).getPropertyValue('--f-emoji')));
ok('emoji font is not loaded on start in test mode', !$('emojiFont'));
const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
ok('policy still allows the font on demand', /style-src[^;]*https:\/\/fonts\.googleapis\.com/.test(csp) && /font-src[^;]*https:\/\/fonts\.gstatic\.com/.test(csp));
ok('this browser draws color emoji', hasColorEmoji() === true);
const links = () => document.head.querySelectorAll('link[href*="Noto+Color+Emoji"]').length;
resetEmojiCheck();
let calls = 0;
ok('no link when system emoji exists', ensureEmojiFont(() => { calls++; return true; }) === false && links() === 0);
ok('check runs only once', ensureEmojiFont(() => { calls++; return false; }) === false && calls === 1 && links() === 0);
resetEmojiCheck();
const added = ensureEmojiFont(() => false), again = ensureEmojiFont(() => false);
ok('link added exactly once without system emoji', added && !again && links() === 1);
const ln = $('emojiFont');
ok('font link is async stylesheet in head', ln.parentElement === document.head && ln.rel === 'stylesheet' && ln.href === EMOJI_FONT_URL && !ln.hasAttribute('blocking'));
resetEmojiCheck();
const realCanvas = document.createElement;
document.createElement = function (t) { if (t === 'canvas') throw new Error('no canvas'); return realCanvas.call(document, t); };
const noCanvas = hasColorEmoji();
document.createElement = realCanvas;
ok('without canvas the font is treated as missing', noCanvas === false);
resetEmojiCheck();
ok('reset leaves no font link', links() === 0);
const appSrc = await (await fetch('app.js?x=' + Date.now())).text();
ok('app checks emoji font once after first render', (appSrc.match(/ensureEmojiFont\(/g) || []).length === 1 && /render\(\);\nif \(!TEST_MODE\) requestAnimationFrame\(\(\) => ensureEmojiFont\(\)\);/.test(appSrc.replace(/\r/g, '')));
openForm(); await wait(500);
$('remSwitch').click(); await wait(400);
const tIn = document.querySelector('#remTimes .native');
tIn.focus();
const tFocused = document.activeElement === tIn;
for (const v of ['07:05', '07:35']) { tIn.value = v; tIn.dispatchEvent(new Event('input', { bubbles: true })); tIn.dispatchEvent(new Event('change', { bubbles: true })); await wait(80); }
ok('reminder time picker stays open while changing', tIn.type !== 'time' || tIn.isConnected && (document.activeElement === tIn || !tFocused) && document.querySelector('#remTimes .native') === tIn && tIn.parentElement.querySelector('b').textContent === '07:35');
tIn.blur(); tIn.dispatchEvent(new FocusEvent('blur')); await wait(150);
ok('reminder time applied after picker closes', form.rem.times.includes('07:35') && document.querySelector('#remTimes b').textContent === '07:35', form.rem.times);
closeOverlay($('formOv')); await wait(400);
{
  const saved = state, calls = [];
  const stub = (k, f) => Object.defineProperty(navigator, k, { value: f, configurable: true });
  stub('setAppBadge', n => { calls.push(n); return Promise.resolve(); });
  stub('clearAppBadge', () => { calls.push(0); return Promise.resolve(); });
  setState(normalize({ habits: [
    { id: 'b1', name: 'Один', icon: 'book', created: c0 },
    { id: 'b2', name: 'Два', icon: 'book', created: c0 },
  ], log: {} }));
  viewDate = new Date(); setBadge(-1); calls.length = 0;
  cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
  ok('app badge shows habits left today', calls.at(-1) === 2 && badgeLeft() === 2, calls);
  setCount(state.habits[0], new Date(), 1); render(); await wait(300);
  ok('app badge counts down after a mark', calls.at(-1) === 1, calls);
  const n = calls.length; render(); await wait(100);
  ok('app badge not reset when unchanged', calls.length === n, calls);
  setCount(state.habits[1], new Date(), 1); render(); await wait(300);
  ok('app badge cleared when day is done', calls.at(-1) === 0, calls);

  setState(normalize({ habits: [], log: {} }));
  cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
  const tb = [...$('emptyTpl').children];
  ok('empty screen offers four templates', !$('empty').hidden && tb.length === 4 && tb.map(b => b.textContent).join() === EMPTY_TPL.map(i => TEMPLATES[i].name).join(), tb.map(b => b.textContent));
  const w = tb.map(b => Math.round(b.getBoundingClientRect().width)), top = tb.map(b => Math.round(b.getBoundingClientRect().top));
  ok('empty templates sit in an even grid', new Set(w).size === 1 && top[0] === top[1] && top[2] === top[3] && top[2] > top[0], { w, top });
  tb[1].click(); await wait(400);
  ok('empty template opens a prefilled form', $('formOv')._shown && $('name').value === TEMPLATES[EMPTY_TPL[1]].name && form.icon === TEMPLATES[EMPTY_TPL[1]].icon && $('tplField').hidden);
  closeOverlay($('formOv')); await wait(400);
  openForm(); await wait(400);
  ok('new form still offers popular templates', !$('tplField').hidden);
  closeOverlay($('formOv')); await wait(400);
  setState(saved); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);

  const man = await fetch('manifest.webmanifest').then(r => r.json());
  ok('home screen shortcuts for new habit, goals and summary', man.shortcuts.map(s => s.url).join() === './?action=new,./?action=goals,./?action=summary' && man.shortcuts.every(s => s.name && s.icons?.length), man.shortcuts);
}
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
