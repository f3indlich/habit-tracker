window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const touch = (el, type, x, y) => {
  const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
};
const swipe = async (el, from, to, steps = 8, dt = 12, onMid) => {
  touch(el, 'touchstart', ...from);
  for (let i = 1; i <= steps; i++) {
    await wait(dt);
    touch(el, 'touchmove', from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps);
    if (i === steps >> 1) onMid?.();
  }
  await wait(dt);
  touch(el, 'touchend', ...to);
  await wait(450);
};

state = normalize({ habits: [{ id: 'g', name: 'Чтение', icon: 'book', color: '#22c55e', created: ago(70) }],
  log: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [ago(i + 1), i % 3 ? { g: 1 } : {}])) });
viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const W = innerWidth || 375, H = innerHeight || 812;
shownOverlays().forEach(closeOverlay); closeMenu(); await wait(400);

renderSettings(); openOverlay($('setOv')); await wait(500);
let mid = '';
await swipe($('setOv'), [6, 300], [W * .8, 310], 8, 12, () => mid = $('setOv').style.transform);
ok('settings follow finger from left edge', /translateX\(\d+/.test(mid) && $('setOv').classList.contains('open') === false, mid);
ok('edge swipe closes settings', !$('setOv')._shown);
openOverlay($('setOv')); await wait(500);
await swipe($('setOv'), [6, 300], [60, 300], 4, 80);
ok('short slow edge swipe snaps back', $('setOv')._shown && $('setOv').style.transform === '' && !$('setOv').classList.contains('edging'));
await swipe($('setOv'), [120, 300], [W - 10, 300]);
ok('swipe not from edge keeps settings open', $('setOv')._shown);
await swipe($('setOv'), [6, 200], [20, 600]);
ok('vertical move from edge keeps settings open', $('setOv')._shown && $('setOv').style.transform === '');
openCats(); await wait(400);
await swipe($('setOv'), [6, 300], [W * .8, 300]);
ok('edge swipe ignored while a sheet is on top', $('setOv')._shown && $('catOv')._shown);
closeOverlay($('catOv')); await wait(350);
ok('category note in plain words', /^Категории помогают разложить привычки по темам\. Например: «Здоровье» — вода, сон, витамины/.test(document.querySelector('.cat-note').textContent));
closeOverlay($('setOv')); await wait(400);

openHistory('g'); await wait(600);
const hs = $('hSheet'), head = hs.querySelector('.sheet-head');
ok('habit sheet has a pull handle', hs.classList.contains('pull') && getComputedStyle(hs, '::before').width === '36px');
hs.scrollTop = 0;
await swipe(head, [W / 2, 200], [W / 2, 240], 4, 90);
ok('small pull snaps back', $('histOv')._shown && hs.style.transform === '' && !hs.classList.contains('pulling'));
hs.scrollTop = 200; await wait(50);
const scrolled = hs.scrollTop > 0;
if (scrolled) await swipe(hs.querySelector('#hStats'), [W / 2, 300], [W / 2, 650]);
ok('pull ignored when sheet is scrolled', !scrolled || $('histOv')._shown, hs.scrollTop);
hs.scrollTop = 0; await wait(50);

$('hTabs').querySelector('[data-r=week]').click(); await wait(300);
const lbl0 = $('hLabel').textContent;
await swipe($('hChart'), [W * .8, 420], [W * .15, 425]);
ok('swipe left on current week does nothing', $('hLabel').textContent === lbl0 && $('hNext').disabled);
await swipe($('hChart'), [W * .15, 420], [W * .8, 425]);
const lbl1 = $('hLabel').textContent;
ok('swipe right shows previous week', lbl1 !== lbl0 && !$('hNext').disabled, [lbl0, lbl1]);
await swipe($('hStats'), [W * .15, 380], [W * .85, 380]);
ok('swipe works on period stats too', $('hLabel').textContent !== lbl1);
await swipe($('hChart'), [W * .8, 420], [W * .15, 425]);
await swipe($('hChart'), [W * .8, 420], [W * .15, 425]);
ok('swipe left goes forward again', $('hLabel').textContent === lbl0, $('hLabel').textContent);
await swipe($('hChart'), [W * .5, 600], [W * .55, 380], 6, 20);
ok('vertical drag on chart does not change period', $('hLabel').textContent === lbl0);
$('hTabs').querySelector('[data-r=month]').click(); await wait(300);
const m0 = $('hLabel').textContent;
await swipe($('hChart'), [W * .15, 450], [W * .8, 455]);
ok('month swipe shows previous month', $('hLabel').textContent !== m0 && $('hLabel').textContent === rangeLabel('month', rangeDays('month', shiftAnchor('month', new Date(), -1))));
$('hTabs').querySelector('[data-r=week]').click(); await wait(300);

mid = '';
await swipe(head, [W / 2, 160], [W / 2, 600], 8, 12, () => mid = hs.style.transform + '|' + getComputedStyle($('histOv')).getPropertyValue('--fade'));
ok('sheet follows finger and backdrop fades', /translateY\(\d+/.test(mid) && parseFloat(mid.split('|')[1]) < 1, mid);
ok('pull down closes habit card', !$('histOv')._shown && !hist);
ok('styles cleared after pull', hs.style.transform === '' && !$('histOv').style.getPropertyValue('--fade'));

document.querySelector('.hero-ring').click(); await wait(600);
const s0 = $('sLabel').textContent;
await swipe($('sTiles'), [W * .15, 300], [W * .85, 305]);
ok('summary swipe right shows previous period', $('sLabel').textContent !== s0 && !$('sNext').disabled);
await swipe($('sTiles'), [W * .85, 300], [W * .15, 305]);
ok('summary swipe left returns', $('sLabel').textContent === s0);
$('sTabs').querySelector('[data-r=year]').click(); await wait(300);
const y0 = $('sLabel').textContent, hsc = $('sHeat').querySelector('.hscroll');
if (hsc) await swipe(hsc, [W * .2, 500], [W * .9, 500]);
ok('year heatmap scroll does not change period', !hsc || $('sLabel').textContent === y0);
$('sTabs').querySelector('[data-r=week]').click(); await wait(300);
await swipe($('sSheet').querySelector('.sheet-head'), [W / 2, 160], [W / 2, 650]);
ok('pull down closes summary', !$('sumOv')._shown);

openDay('g', addDays(new Date(), -1)); await wait(500);
await swipe($('dNote'), [W / 2, H - 200], [W / 2, H - 20]);
ok('dragging inside note field does not close day window', $('dayOv')._shown);
await swipe($('dSheet'), [W / 2, H - 300], [W / 2, H - 20], 4, 10);
ok('fast flick closes day window', !$('dayOv')._shown);

openForm(); await wait(500);
const fs = $('formOv').querySelector('.sheet');
ok('new habit sheet has a pull handle', fs.classList.contains('pull'));
await swipe($('name'), [W / 2, 200], [W / 2, 650]);
ok('dragging on name field does not close form', $('formOv')._shown);
fs.scrollTop = 0;
await swipe(fs.querySelector('.sheet-head'), [W / 2, 160], [W / 2, 650]);
ok('pull down closes new habit form', !$('formOv')._shown);
await wait(350);

openForm(); await wait(500);
$('name').value = 'Бег'; $('name').dispatchEvent(new Event('input'));
await swipe(fs.querySelector('.sheet-head'), [W / 2, 160], [W / 2, 650]);
ok('pull with unsaved text asks before closing', $('formOv')._shown && $('confirm')._shown);
$('cNo').click(); await wait(350);
ok('keep editing leaves text in place', $('formOv')._shown && $('name').value === 'Бег');
$('formOv').click(); await wait(350);
ok('backdrop tap also asks', $('confirm')._shown && $('formOv')._shown);
$('cYes').click(); await wait(400);
ok('confirm closes form without adding habit', !$('formOv')._shown && !state.habits.some(h => h.name === 'Бег'));
openForm('g'); await wait(500);
dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(350);
ok('untouched edit form closes without asking', !$('formOv')._shown && !$('confirm')._shown);
openForm('g'); await wait(500);
document.querySelector('#colors button:not(.on)')?.click(); await wait(50);
dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(350);
ok('changed color asks on Escape', $('confirm')._shown);
$('cYes').click(); await wait(400);
ok('habit keeps old color after discard', findHabit('g').color === '#22c55e' && !$('formOv')._shown);

for (const [id, open] of [['catOv', openCats], ['nameOv', () => openName(false)], ['installOv', () => openOverlay($('installOv'))]]) {
  open(); await wait(500);
  const sh = $(id).querySelector('.sheet');
  sh.scrollTop = 0;
  await swipe(sh.querySelector('.sheet-head'), [W / 2, H - 300], [W / 2, H - 10]);
  ok(id + ' closes by pull down', !$(id)._shown && sh.classList.contains('pull'));
  await wait(350);
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
