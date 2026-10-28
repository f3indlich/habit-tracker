window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const layerOn = () => !!$('tipLayer') && !$('tipLayer').hidden && !!tip;
const inside = (a, b) => a.left <= b.left + 1 && a.top <= b.top + 1 && a.right >= b.right - 1 && a.bottom >= b.bottom - 1;
const fresh = async (habits, log = {}) => {
  shownOverlays().forEach(closeOverlay); closeMenu(); closeTip(false); await wait(350);
  state = normalize({ habits, log }); viewDate = new Date();
  cards.forEach(e => e.remove()); cards.clear(); render(); scrollTo(0, 0); await wait(400);
};
const touch = (el, type, x, y) => {
  const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
};
const swipe = async (el, from, to) => {
  touch(el, 'touchstart', ...from);
  for (let i = 1; i <= 6; i++) { await wait(12); touch(el, 'touchmove', from[0] + (to[0] - from[0]) * i / 6, from[1] + (to[1] - from[1]) * i / 6); }
  touch(el, 'touchend', ...to); await wait(500);
};

ok('old hint paragraph removed', !$('hint') && !/Свайп вправо — выполнить, влево — сбросить/.test(document.body.innerHTML));
ok('tips are off in tests by default', !tipsOn() && runTips() === false && !layerOn());

window.__tipsOn = true;
resetTips();
await fresh([{ id: 'z', name: 'Зарядка', icon: 'strong', color: '#22c55e', created: todayKey(), time: 'morning' }]);
await runTips(); await wait(300);
const zc = document.querySelector('.habit[data-id="z"] .check');
ok('first habit gets the mark tip', layerOn() && tip.id === 'mark' && $('tipTitle').textContent === 'Отметьте первую привычку', tip?.id);
const spot = document.querySelector('.tip-spot').getBoundingClientRect(), box = document.querySelector('.tip-box').getBoundingClientRect();
ok('spotlight surrounds the check button', inside(spot, zc.getBoundingClientRect()), [spot, zc.getBoundingClientRect()]);
ok('bubble stays on screen', box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, box);
ok('bubble is an accessible dialog', document.querySelector('.tip-box').getAttribute('role') === 'dialog' && $('tipTitle').id === document.querySelector('.tip-box').getAttribute('aria-labelledby'));
ok('only one tip at a time', await runTips() === false && await showTip('days', $('days')) === false && tip.id === 'mark');
const arrow = document.querySelector('.tip-arrow').getBoundingClientRect(), zr = zc.getBoundingClientRect();
ok('arrow points at the target', Math.abs((arrow.left + arrow.right) / 2 - (zr.left + zr.right) / 2) < 12, [arrow.left, zr.left]);
$('tipOk').click(); await wait(250);
ok('«Понятно» closes and remembers', !layerOn() && tipSeen('mark') && JSON.parse(localStorage.getItem(TIPS_STORE)).mark === 1);
await wait(1600);
ok('seen tip never comes back', await runTips() === false || tip?.id !== 'mark');
closeTip(false);

resetTips();
await fresh([{ id: 'z', name: 'Зарядка', icon: 'strong', color: '#22c55e', created: ago(5) },
  { id: 'v', name: 'Вода', icon: 'water', color: '#3b82f6', target: 8, unit: 'стаканов', created: ago(5) }], { [todayKey()]: { v: 3 } });
markTip('mark');
await runTips(); await wait(300);
const vc = document.querySelector('.habit[data-id="v"]');
const sp2 = document.querySelector('.tip-spot').getBoundingClientRect();
ok('habit with repeats gets the steps tip', tip?.id === 'steps' && $('tipBody').querySelectorAll('p').length === 3, tip?.id);
ok('steps spotlight covers minus and check', inside(sp2, vc.querySelector('.check').getBoundingClientRect()) && inside(sp2, vc.querySelector('.step-minus').getBoundingClientRect()));
document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(250);
ok('tap outside closes the tip', !layerOn() && tipSeen('steps'));
await wait(1600);
await runTips(); await wait(300);
ok('after a mark the swipe bar shows', tip?.id === 'swipe' && $('tipLayer').classList.contains('bar') && $('tipTitle').hidden, tip?.id);
ok('swipe bar is not dimmed', getComputedStyle(document.querySelector('.tip-spot')).boxShadow === 'none');
ok('new habit button hides under a tip', document.body.classList.contains('tip-on') && getComputedStyle($('fab')).pointerEvents === 'none');
ok('swipe bar points at a card that is not done', !document.querySelector('.habit.complete') || tip.els[0].classList.contains('habit') && !tip.els[0].classList.contains('complete'));
$('tipOk').click(); await wait(1700);
await runTips(); await wait(300);
ok('third tip: past days', tip?.id === 'days' && inside(document.querySelector('.tip-spot').getBoundingClientRect(), $('days').getBoundingClientRect()), tip?.id);
$('tipOk').click(); await wait(1700);
ok('no more than three tips per launch', await runTips() === false && !layerOn());

resetTips();
['mark', 'steps', 'swipe', 'days'].forEach(markTip);
await fresh([{ id: 'v', name: 'Вода', icon: 'water', color: '#3b82f6', target: 8, created: ago(20) }],
  Object.fromEntries(Array.from({ length: 20 }, (_, i) => [ago(i + 1), { v: 8 }])));
renderSettings(); openOverlay($('setOv')); await wait(500);
ok('no tips over another page', await runTips() === false && !layerOn());
closeOverlay($('setOv')); await wait(400);
openHistory('v'); await wait(500);
await runTips(); await wait(300);
ok('habit card gets the history tip', tip?.id === 'hist' && $('tipBody').querySelectorAll('p').length === 3, tip?.id);
document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(300);
ok('Escape closes only the tip', !layerOn() && $('histOv')._shown && tipSeen('hist'));
closeOverlay($('histOv')); setHist(null); await wait(400);

resetTips();
['mark', 'steps', 'swipe', 'days'].forEach(markTip);
await wait(1600);
document.querySelector('.hero-ring').click(); await wait(500);
await runTips(); await wait(300);
ok('summary gets the ⓘ tip', tip?.id === 'sum' && inside(document.querySelector('.tip-spot').getBoundingClientRect(), $('sSheet').querySelector('.tile-i').getBoundingClientRect()), tip?.id);
$('tipOk').click(); await wait(300);
closeOverlay($('sumOv')); await wait(400);

resetTips();
ok('reset forgets every tip', !tipSeen('mark') && !tipSeen('hist') && !localStorage.getItem(TIPS_STORE)?.includes('mark'));
window.__tipsOn = false;
closeTip(false);

state = normalize({ habits: [], log: {} }); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const before = JSON.stringify(state);
localStorage.removeItem(ONBOARD_STORE); localStorage.removeItem(NAME_ASKED);
openOnboarding(); await wait(600);
ok('welcome opens on slide 1', $('obOv')._shown && obStep === 0 && $('obBack').style.visibility === 'hidden' && $('obNext').textContent === 'Далее');
ok('slide 1 shows a real day card and habit cards', $('obArt0').querySelector('.card.hero') && $('obArt0').querySelectorAll('.habit').length === 2 && $('obArt0').querySelector('.habit .hicon svg'));
ok('demo cards do not touch real data', JSON.stringify(state) === before && !state.habits.length);
ok('pictures are not interactive', $('obArt0').inert && $('obArt1').inert);
$('obNext').click(); await wait(500);
const water = [...$('obArt1').querySelectorAll('.habit')].find(e => e.querySelector('.name').textContent === 'Вода');
ok('slide 2 explains marks with three cards', obStep === 1 && $('obArt1').querySelectorAll('.habit').length === 3 && $('obArt1').querySelectorAll('.set-hint').length === 3);
ok('demo water card shows 3 of 8 and minus', water.querySelector('.meta').textContent.includes('3 / 8') && !water.querySelector('.step-minus').classList.contains('idle'));
ok('demo swipe card is tinted', !!$('obArt1').querySelector('.habit.sw-done'));
ok('hidden slides are inert', [...$('obTrack').children].every((s, i) => s.inert === (i !== 1)));
const W = innerWidth || 375;
await swipe($('obView'), [W * .85, 400], [W * .15, 405]);
ok('swipe left goes to slide 3', obStep === 2 && $('obNext').textContent.includes('Создать первую привычку') && !$('obTpl').hidden && $('obSkip').style.visibility === 'hidden');
await swipe($('obView'), [W * .2, 400], [W * .85, 405]);
ok('swipe right goes back', obStep === 1);
$('obNext').click(); await wait(400);
$('obName').value = 'Аня';
$('obNext').click(); await wait(800);
ok('finish saves name and opens the form', state.profile?.name === 'Аня' && getPref(ONBOARD_STORE, '') === '1' && getPref(NAME_ASKED, '') === '1' && !$('obOv')._shown && $('formOv')._shown);
closeOverlay($('formOv')); await wait(400);
delete state.profile; save(); render();

localStorage.removeItem(ONBOARD_STORE);
openOnboarding(); await wait(500);
$('obSkip').click(); await wait(400);
ok('skip closes and remembers', !$('obOv')._shown && getPref(ONBOARD_STORE, '') === '1');
localStorage.removeItem(ONBOARD_STORE);
state.habits.push({ id: 'x', name: 'Бег', icon: 'run', color: '#22c55e', created: todayKey() }); state = normalize(state);
ok('existing users skip the welcome', maybeOnboard() === false && getPref(ONBOARD_STORE, '') === '1' && !$('obOv')._shown);

renderSettings(); openOverlay($('setOv')); await wait(500);
const groups = [...$('setOv').querySelectorAll('.set-group > h3')].map(h => h.textContent);
ok('settings have a help group before data', groups.indexOf('Помощь') === groups.indexOf('Данные') - 1, groups);
$('helpBtn').click(); await wait(500);
ok('help page opens over settings', $('helpOv')._shown && shownOverlays().pop() === $('helpOv'));
const rows = () => [...$('helpList').querySelectorAll('.help-item')];
ok('help has three groups and ten rows', $('helpList').querySelectorAll('.set-group').length === 3 && rows().length === 10, rows().length);
ok('articles start closed', rows().filter(r => r.dataset.id).every(r => r.querySelector('.help-body').hidden));
rows()[0].querySelector('.set-row').click(); await wait(100);
ok('tap opens an article', !rows()[0].querySelector('.help-body').hidden && rows()[0].querySelector('.set-row').getAttribute('aria-expanded') === 'true');
const q = $('helpQ');
q.value = 'пропуск'; q.dispatchEvent(new Event('input')); await wait(50);
ok('search finds the skip article', rows().some(r => r.dataset.id === 'sched') && rows().length < 10, rows().map(r => r.dataset.id || r.textContent));
q.value = 'ЭКСПОРТ'; q.dispatchEvent(new Event('input')); await wait(50);
ok('search looks inside articles and opens them', rows().length === 1 && rows()[0].dataset.id === 'sync' && !rows()[0].querySelector('.help-body').hidden);
q.value = 'ёлка-палка'; q.dispatchEvent(new Event('input')); await wait(50);
ok('nothing found message', !rows().length && !$('helpEmpty').hidden);
q.value = ''; q.dispatchEvent(new Event('input')); await wait(50);
const g = rows().find(r => r.dataset.id === 'gestures');
g.querySelector('.set-row').click(); await wait(100);
ok('gestures list has seven gestures and two keys', g.querySelectorAll('.gest').length === 9 && g.querySelectorAll('kbd').length === 2);
markTip('mark');
$('helpList').querySelector('[data-act="reset"]').click(); await wait(100);
ok('show tips again clears memory', !tipSeen('mark') && $('toastText').textContent.startsWith('Подсказки появятся снова'));
$('helpList').querySelector('[data-act="replay"]').click(); await wait(500);
ok('welcome can be replayed from help', $('obOv')._shown && obStep === 0 && shownOverlays().pop() === $('obOv'));
ok('replay offers a new habit when habits exist', (goSlide(2), $('obNext').textContent.includes('Новая привычка')));
closeOverlay($('obOv')); await wait(400);
closeOverlay($('helpOv')); await wait(400);
closeOverlay($('setOv')); await wait(400);

const sw = await (await fetch('sw.js?x=' + Date.now())).text();
ok('offline cache includes new modules', /'tips', 'guide'/.test(sw));
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
