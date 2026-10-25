window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const T = todayKey(), Y = key(addDays(new Date(), -1));
const fresh = s => { state = normalize(s); cards.forEach(e => e.remove()); cards.clear(); render(); };
const card = id => document.querySelector(`.habit[data-id="${id}"]`);
const sh = () => $('formOv').querySelector('.sheet');

let s = normalize({ habits: [
  { id: 'a', name: 'A', target: 500 }, { id: 'b', name: 'B', target: 100, step: 150 }, { id: 'c', name: 'C', target: 1, step: 5 },
  { id: 'd', name: 'D', target: 60, step: 15, remind: { spread: { from: '09:00', to: '21:00' } } }, { id: 'e', name: 'E', target: 1, remind: '08:30' },
  { id: 'f', name: 'F', target: 20000, step: 'x' }, { id: 'g', name: 'G', icon: '🧠' }, { id: 'h', name: 'H', icon: '📚' },
], log: { [T]: { a: 3 } } });
ok('normalize target cap without step', s.habits[0].target === 100, s.habits[0]);
ok('normalize step clamped to target', s.habits[1].step === 100 && s.habits[1].target === 100, s.habits[1]);
ok('normalize step dropped for once', s.habits[2].step === undefined && s.habits[2].target === 1, s.habits[2]);
ok('normalize step spread kept', !!s.habits[3].remind?.spread, s.habits[3].remind);
ok('normalize legacy remind string', JSON.stringify(s.habits[4].remind) === '{"times":["08:30"]}', s.habits[4].remind);
ok('normalize bad step', s.habits[5].step === undefined && s.habits[5].target === 100, s.habits[5]);
ok('legacy emoji brain', s.habits[6].icon === 'brain', s.habits[6].icon);
ok('legacy emoji books', s.habits[7].icon === 'books', s.habits[7].icon);
const hs = { target: 60, step: 15 }, h100 = { target: 100, step: 15 };
ok('stepUp', stepUp(hs, 0) === 15 && stepUp(hs, 45) === 60 && stepUp(hs, 60) === 60 && stepUp(h100, 90) === 100);
ok('stepDown', stepDown(h100, 100) === 90 && stepDown(h100, 90) === 75 && stepDown(hs, 15) === 0 && stepDown(hs, 0) === 0 && stepDown({ target: 8 }, 3) === 2);
ok('units', units(h100) === 7 && units(hs) === 4 && units({ target: 8 }) === 8 && units({ target: 1 }) === 1);

fresh({ habits: [
  { id: 'o', name: 'Once', target: 1 }, { id: 'm', name: 'Multi', target: 3 },
  { id: 'p', name: 'Step', target: 100, step: 5, unit: 'раз' }, { id: 'y', name: 'Yoga', target: 60, step: 15 },
], log: {} });
document.body.dataset.view = '7d'; render(); await wait(300);
card('o').querySelector('.check').click(); await wait(80);
ok('once check', count(findHabit('o'), new Date()) === 1 && card('o').classList.contains('complete'));
card('o').querySelector('.check').click(); await wait(80);
ok('once uncheck', count(findHabit('o'), new Date()) === 0);
for (let i = 0; i < 3; i++) { card('m').querySelector('.check').click(); await wait(40); }
ok('multi to done', count(findHabit('m'), new Date()) === 3 && card('m').classList.contains('complete'));
card('m').querySelector('.check').click(); await wait(40);
ok('multi done click removes one', count(findHabit('m'), new Date()) === 2);
card('m').querySelector('.step-minus').click(); await wait(40);
ok('multi minus', count(findHabit('m'), new Date()) === 1);
for (let i = 0; i < 3; i++) { card('p').querySelector('.check').click(); await wait(40); }
ok('step +5 x3', count(findHabit('p'), new Date()) === 15, count(findHabit('p'), new Date()));
ok('step meta text', card('p').querySelector('.m-lead').textContent.trim() === '15 / 100 раз', card('p').querySelector('.m-lead').textContent);
await wait(700); ok('step num', card('p').querySelector('.num').textContent.trim() === '15', card('p').querySelector('.num').textContent);
ok('step title', card('p').querySelector('.check').title.includes('+5'), card('p').querySelector('.check').title);
card('p').querySelector('.step-minus').click(); await wait(40);
ok('step minus', count(findHabit('p'), new Date()) === 10);
for (let i = 0; i < 4; i++) { card('y').querySelector('.check').click(); await wait(40); }
ok('yoga 4 steps done', count(findHabit('y'), new Date()) === 60 && card('y').classList.contains('complete'));
ok('yoga segmented ring 4', card('y').querySelectorAll('.seg-f').length === 4 && card('y').querySelectorAll('.seg-f.on').length === 4);
card('y').querySelector('.check').click(); await wait(40);
ok('yoga done click -> 45', count(findHabit('y'), new Date()) === 45 && card('y').querySelectorAll('.seg-f.on').length === 3);
changeCount(findHabit('p'), new Date(), 100); await wait(40);
ok('step complete via full', card('p').classList.contains('complete'));
card('p').querySelector('.check').click(); await wait(40);
ok('step done click -> 95', count(findHabit('p'), new Date()) === 95);
const dcols = card('p').querySelectorAll('.dcol');
ok('dots row 7 cols, last cur', dcols.length === 7 && dcols[6].classList.contains('cur') && !dcols[5].classList.contains('cur'));
ok('dots in info', !!card('p').querySelector('.info .dots'));
const wr = dcols[6].querySelector('.dw').getBoundingClientRect(), dr = dcols[6].querySelector('.dot').getBoundingClientRect();
ok('weekday label not overlapped', dr.top - wr.bottom >= 4, { w: wr.bottom, d: dr.top });
const cr = card('p').getBoundingClientRect(), lr = dcols[6].getBoundingClientRect();
ok('cur column inside card', lr.right <= cr.right - 8 && lr.left >= cr.left, { lr: lr.right, cr: cr.right });
dcols[5].querySelector('.dot').click(); await wait(40);

const menuItems = () => [...document.querySelectorAll('.menu button')].map(b => b.textContent.trim());
card('p').querySelector('.more').click(); await wait(250);
ok('menu step label', menuItems().some(t => t.startsWith('Убрать шаг (−5)')), menuItems());
closeMenu(); await wait(250);

openForm(); await wait(600);
ok('form opens at top', sh().scrollTop === 0);
sh().scrollTop = 900; closeOverlay($('formOv')); await wait(450); openForm(); await wait(500);
ok('form reopens at top', sh().scrollTop === 0, sh().scrollTop);
$('goalSeg').querySelector('[data-v=step]').click(); await wait(500);
ok('step wrap open', $('stepWrap').classList.contains('open') && $('goalWrap').classList.contains('open'));
$('target').value = 100; $('target').dispatchEvent(new Event('input')); await wait(50);
$('step').value = 5; $('step').dispatchEvent(new Event('input')); await wait(50);
ok('step sum', $('stepSum').textContent.includes('20'), $('stepSum').textContent);
ok('step viz 20', $('stepViz').querySelectorAll('i').length === 20);
$('stepChips').querySelector('[data-v="25"]').click(); await wait(50);
ok('chip sets step', $('step').value === '25' && $('stepSum').textContent.startsWith('4'), [$('step').value, $('stepSum').textContent]);
ok('preview meta step', $('fpMeta').textContent.includes('шаг 25'), $('fpMeta').textContent);
$('tPlus').click(); await wait(30);
ok('target plus by step', $('target').value === '125', $('target').value);
$('tMinus').click(); $('tMinus').click(); await wait(30);
ok('target minus by step', $('target').value === '75', $('target').value);
$('target').value = 70; $('target').dispatchEvent(new Event('input')); await wait(30);
ok('uneven last segment', $('stepViz').querySelectorAll('i').length === 3 && Math.abs(parseFloat($('stepViz').lastElementChild.style.flex) - .8) < .01, $('stepViz').innerHTML);
$('step').value = 999; $('step').dispatchEvent(new Event('change')); await wait(30);
ok('step clamped to target', $('step').value === '70', $('step').value);
$('step').value = 10; $('step').dispatchEvent(new Event('change'));
$('remSwitch').click(); await wait(400);
ok('rem spread default for step', remIsSpread() && remTarget() === 7, [remIsSpread(), remTarget()]);
ok('spread note units', $('remSpreadNote').textContent.startsWith('7 напоминаний'), $('remSpreadNote').textContent);
$('name').value = 'Отжимания'; $('unit').value = 'раз';
$('form').requestSubmit(); await wait(400);
const nh = state.habits.find(h => h.name === 'Отжимания');
ok('saved step habit', nh && nh.target === 70 && nh.step === 10 && nh.unit === 'раз' && !!nh.remind?.spread, nh);

openForm(nh.id); await wait(500);
ok('edit opens step mode', form.goal === 'step' && $('step').value === '10' && $('target').value === '70');
$('goalSeg').querySelector('[data-v=multi]').click(); await wait(300);
ok('switch to multi clamps', $('target').value === '70' && !$('stepWrap').classList.contains('open'));
$('form').requestSubmit(); await wait(300);
ok('multi save drops step', nh.step === undefined && nh.target === 70, nh);
openForm(nh.id); await wait(400);
$('goalSeg').querySelector('[data-v=step]').click(); await wait(200);
$('target').value = 2000; $('target').dispatchEvent(new Event('change')); await wait(30);
ok('step target allows 2000', $('target').value === '2000', $('target').value);
$('goalSeg').querySelector('[data-v=multi]').click(); await wait(200);
ok('multi re-clamps to 100', $('target').value === '100', $('target').value);
$('goalSeg').querySelector('[data-v=once]').click(); await wait(200);
$('form').requestSubmit(); await wait(300);
ok('once save', nh.target === 1 && nh.step === undefined && nh.unit === '', nh);

openForm(); await wait(400);
const yi = TEMPLATES.findIndex(t => t.name === 'Йога');
$('templates').querySelector(`[data-i="${yi}"]`).click(); await wait(300);
ok('template yoga step', form.goal === 'step' && $('target').value === '60' && $('step').value === '15' && $('unit').value === 'минут');
$('remSwitch').click(); await wait(300); $('remMode').querySelector('[data-v=times]').click(); await wait(300);
ok('repeat wrap open in times', $('remRepeatWrap').classList.contains('open') && !$('remRepeatWrap').inert);
ok('repeat off note', $('remRepeatNote').textContent.includes('один раз') && $('remRepeatNRow').classList.contains('off'));
$('remRepeat').querySelector('[data-v="15"]').click(); await wait(200);
ok('repeat on note', $('remRepeatNote').textContent.startsWith('Ещё раз в ') && !$('remRepeatNRow').classList.contains('off'), $('remRepeatNote').textContent);
$('remRepeatN').querySelector('[data-v="3"]').click(); await wait(200);
ok('repeat n note', /Ещё 3 раза в \d\d:\d\d, \d\d:\d\d и \d\d:\d\d/.test($('remRepeatNote').textContent), $('remRepeatNote').textContent);
$('remMode').querySelector('[data-v=spread]').click(); await wait(500);
ok('repeat hidden in spread', !$('remRepeatWrap').classList.contains('open'));
const rb = $('rem').getBoundingClientRect();
const outs = [...$('rem').querySelectorAll('.seg, .mini-seg, .tchip, .pick, .rem-days')].filter(e => e.offsetParent && e.getBoundingClientRect().width && e.getBoundingClientRect().right > rb.right - 10).length;
ok('rem nothing overflows', outs === 0, outs);
closeOverlay($('formOv')); await wait(400);

openForm('p'); await wait(500);
sh().scrollTop = 700; await wait(200);
const dock = document.querySelector('.prev-dock').getBoundingClientRect(), prev = $('formPrev').getBoundingClientRect(), shr = sh().getBoundingClientRect();
ok('preview gap from top when stuck', prev.top - shr.top >= 12 && dock.top <= shr.top + 1, { prev: prev.top, sheet: shr.top, dock: dock.top });
closeOverlay($('formOv')); await wait(400);

for (const st of Object.keys(ICON_STYLES)) {
  applyIcons(st); await wait(30); ok('icon style ' + st, document.body.dataset.icons === st && !!card('p').querySelector('.hicon').innerHTML);
}
applyIcons('tile'); await wait(30);
ok('neon dark bg', getComputedStyle(card('p').querySelector('.hicon')).backgroundImage.includes('radial-gradient'));
applyIcons('color'); await wait(30);
ok('glossy gradient', getComputedStyle(card('p').querySelector('.hicon')).backgroundImage.includes('linear-gradient'));
renderSettings();
const prevs = [...$('iconStyles').querySelectorAll('.icon-style')].map(b => getComputedStyle(b.querySelector('.hicon')).backgroundImage + '|' + getComputedStyle(b.querySelector('.hicon')).borderRadius);
ok('settings previews differ', new Set(prevs).size >= 4, prevs);
ok('style labels', Object.values(ICON_STYLES).join() === 'Иллюстрации,Контурные,Неон,Объёмные,Чёрно-белые,Эмодзи', Object.values(ICON_STYLES));

const exported = JSON.parse(JSON.stringify(state));
const re = normalize(exported);
ok('export/import keeps step', re.habits.find(h => h.id === 'p').step === 5);
const base = JSON.parse(JSON.stringify(state)), loc = JSON.parse(JSON.stringify(state)), rem = JSON.parse(JSON.stringify(state));
loc.habits.find(h => h.id === 'p').step = 10;
rem.log[T] = { ...(rem.log[T] || {}), y: 30 };
const mg = mergeStates(base, loc, rem);
ok('merge keeps local step & remote log', mg.habits.find(h => h.id === 'p').step === 10 && mg.log[T].y === 30);

const src = await (await fetch((window.__serverSrc || 'supabase/functions/send-reminders/index.ts') + '?x=' + Date.now())).text();
const code = src.replace(/^import .*$/mg, '').replace(/if \(typeof Deno[\s\S]*$/, '') + '\nreturn { slotsFor, dueReminders, payloadFor, localNow };';
const S = new Function(code)();
const loc9 = { day: '2026-10-25', minutes: 9 * 60, weekday: 6 };
const sl = S.slotsFor({ target: 60, step: 15, remind: { spread: { from: '09:00', to: '21:00' } } }, loc9);
ok('server step spread slots', sl.length === 4 && sl.map(x => x.need).join() === '15,30,45,60' && sl.map(x => x.at).join() === '540,780,1020,1260', sl);
const sl2 = S.slotsFor({ target: 100, step: 15, remind: { spread: { from: '09:00', to: '21:00' } } }, loc9);
ok('server uneven step', sl2.length === 7 && sl2[6].need === 100 && sl2[5].need === 90, sl2.map(x => x.need));
const sl3 = S.slotsFor({ target: 8, remind: { spread: { from: '09:00', to: '21:00' } } }, loc9);
ok('server multi unchanged', sl3.length === 8 && sl3[7].need === 8);
const sl4 = S.slotsFor({ target: 1, remind: { times: ['09:00'], repeat: 30, repeatN: 2 } }, loc9);
ok('server repeats', sl4.map(x => x.at).join() === '540,570,600');
const now = new Date(Date.UTC(2026, 9, 25, 9, 20));
const due = S.dueReminders({ habits: [{ id: 'z', name: 'Z', target: 60, step: 15, remind: { spread: { from: '09:00', to: '21:00' } } }], log: {} }, 'UTC', now);
ok('server due step', due.length === 1 && due[0].slot.need === 15, due);
const due2 = S.dueReminders({ habits: [{ id: 'z', name: 'Z', target: 60, step: 15, remind: { spread: { from: '09:00', to: '21:00' } } }], log: { '2026-10-25': { z: 15 } } }, 'UTC', now);
ok('server not due when on plan', due2.length === 0, due2);

applyIcons('tile'); openForm('p'); await wait(500);
ok('picker uses style', getComputedStyle($('emojis').querySelector('.hicon')).backgroundImage.includes('radial') && getComputedStyle(document.querySelector('#templates .hicon')).backgroundImage.includes('radial'));
$('goalSeg').querySelector('[data-v=multi]').click(); await wait(500);
ok('goal row not clipped', $('goalWrap').getBoundingClientRect().bottom >= $('target').getBoundingClientRect().bottom, [$('goalWrap').getBoundingClientRect().bottom, $('target').getBoundingClientRect().bottom]);
closeOverlay($('formOv')); applyIcons('color'); await wait(400);
ok('card compact', card('p').getBoundingClientRect().height < 125, card('p').getBoundingClientRect().height);
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
