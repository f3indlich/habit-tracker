window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const T = new Date(), TK = todayKey();

state = normalize({ habits: [
  { id: 'w', name: 'Вода', target: 8, unit: 'стаканов', icon: 'water', color: '#0ea5e9', created: ago(10) },
  { id: 'p', name: 'Подтягивания', target: 80, step: 10, unit: 'подтягиваний', icon: 'pullup', color: '#3b82f6', created: ago(10) },
  { id: 'o', name: 'Медитация', icon: 'meditate', color: '#a855f7', created: ago(10) },
], log: { [ago(3)]: { w: 8 }, [ago(2)]: { w: 12, p: 999999 }, [ago(1)]: { w: 9, o: 7 } } });
viewDate = new Date(); document.body.dataset.view = '7d';
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(300);
const w = findHabit('w'), p = findHabit('p'), o = findHabit('o');
const card = id => document.querySelector(`.habit[data-id="${id}"]`);
const badge = id => card(id).querySelector('.check .over');
const shown = id => badge(id).classList.contains('on') && getComputedStyle(badge(id)).display !== 'none';

ok('normalize keeps values above goal', state.log[ago(2)].w === 12 && count(w, parseKey(ago(2))) === 12);
ok('normalize enforces absolute limit', state.log[ago(2)].p === MAX_COUNT, state.log[ago(2)].p);
ok('target 1 never counts above 1', count(o, parseKey(ago(1))) === 1);
setCount(w, T, 11); await wait(50);
ok('can record more than goal', state.log[TK].w === 11 && count(w, T) === 11);
setCount(w, T, 5000); await wait(50);
ok('cap is 20 x goal', state.log[TK].w === 160, state.log[TK].w);
ok('cap never above 100000', countCap(80000) === MAX_COUNT && countCap(1) === 1 && countCap(8) === 160);
setCount(o, T, 5); await wait(50);
ok('target 1 stored as 1', state.log[TK].o === 1);
setCount(o, T, 0); setCount(w, T, 0); await wait(50);

ok('overfilled day counts as done', dayState(w, parseKey(ago(2))) === 'full' && streak(w, ago(1)) === 3, streak(w, ago(1)));
ok('percent never above 100', frac(w, parseKey(ago(2))) === 1 && lifeStats(w).score <= 1 && dayProgress(parseKey(ago(2))).frac <= 1);
const sp = periodStats([parseKey(ago(3)), parseKey(ago(2)), parseKey(ago(1))]);
ok('summary percent capped', sp.habits.find(x => x.h.id === 'w').pct === 100 && sp.pct <= 100, sp.habits.map(x => [x.h.id, x.pct]));
ok('day tooltip shows overflow', dayTip(w, parseKey(ago(2))).endsWith('12 из 8 стаканов (+4)'), dayTip(w, parseKey(ago(2))));

openForm('w'); await wait(400);
$('target').value = 5; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
ok('lowering goal keeps recorded values', state.log[ago(2)].w === 12 && state.log[ago(1)].w === 9);
openForm('w'); await wait(400);
$('target').value = 8; $('target').dispatchEvent(new Event('input', { bubbles: true }));
$('submit').click(); await wait(400);
hideToast();

try { localStorage.removeItem(OVER_HINT); } catch {}
setCount(w, T, 6); render(); await wait(200);
const chk = card('w').querySelector('.check');
ok('no badge below goal', !shown('w'));
chk.click(); await wait(80);
chk.click(); await wait(300);
ok('reaching goal shows + badge', count(w, T) === 8 && shown('w') && !!badge('w').querySelector('svg') && badge('w').textContent === '', badge('w').innerHTML);
ok('one-time hint shown at first goal', $('toastText').textContent === 'Цель выполнена! Нажмите ещё раз, чтобы записать сверх плана');
ok('aria at goal', chk.getAttribute('aria-label').endsWith('8 из 8, выполнено. Нажмите, чтобы добавить сверх цели'), chk.getAttribute('aria-label'));
hideToast(); await wait(50);
const toastsBefore = $('toast').classList.contains('show');
for (let i = 0; i < 3; i++) { chk.click(); await wait(80); }
ok('tap after goal adds step without toast', count(w, T) === 11 && !$('toast').classList.contains('show') && !toastsBefore);
ok('badge shows +3 at 11/8', badge('w').textContent === '+3' && card('w').classList.contains('complete'));
ok('aria when overfilled', chk.getAttribute('aria-label').endsWith('11 из 8, перевыполнено на 3. Нажмите, чтобы добавить ещё'), chk.getAttribute('aria-label'));
ok('card text 11 / 8', card('w').querySelector('.m-lead').textContent.trim() === '11 / 8 стаканов');
ok('ring capped at full circle', parseFloat(card('w').querySelector('.prog').style.strokeDashoffset) === 0);
ok('ring glows when overfilled', chk.classList.contains('overdone') && getComputedStyle(card('w').querySelector('.ring')).filter.includes('drop-shadow'));
const minus = card('w').querySelector('.step-minus');
ok('minus visible after goal', !minus.classList.contains('idle') && !minus.disabled && getComputedStyle(minus).opacity !== '0');
minus.click(); await wait(80);
ok('minus removes one', count(w, T) === 10 && badge('w').textContent === '+2');
chk.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); await wait(650);
chk.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 })); await wait(80);
ok('hold does nothing when done', count(w, T) === 10);
{
  const el = card('w'), r = el.getBoundingClientRect(), y = r.top + 20, o2 = { bubbles: true, pointerId: 5, isPrimary: true, button: 0, clientY: y };
  el.querySelector('.info').dispatchEvent(new PointerEvent('pointerdown', { ...o2, clientX: r.left + 40 }));
  for (let i = 1; i <= 6; i++) el.dispatchEvent(new PointerEvent('pointermove', { ...o2, clientX: r.left + 40 + 25 * i }));
  el.dispatchEvent(new PointerEvent('pointerup', { ...o2, clientX: r.left + 190 })); await wait(400);
}
ok('swipe right does nothing when done', count(w, T) === 10);
setCount(p, T, 1280); render(); await wait(200);
ok('big overflow shortened in pill', badge('p').textContent === '+1,2 тыс.' && badge('p').classList.contains('pill'), badge('p').textContent);
for (const id of ['p', 'w']) {
  const br = badge(id).getBoundingClientRect(), mr = card(id).querySelector('.more').getBoundingClientRect(), cr = card(id).getBoundingClientRect();
  ok(`badge does not cover menu button or leave card (${id})`, br.right <= mr.left && br.top >= cr.top && br.left >= cr.left, [br.left, br.right, mr.left, br.top, cr.top]);
}
setCount(p, T, 0);
setCount(w, T, 0); render(); await wait(200);
ok('badge gone at zero', !shown('w'));
setCount(w, T, 7); render(); await wait(100);
card('w').querySelector('.check').click(); await wait(200);
ok('one-time hint not shown again', $('toastText').textContent !== 'Цель выполнена! Нажмите ещё раз, чтобы записать сверх плана', $('toastText').textContent);
hideToast();

card('o').querySelector('.check').click(); await wait(80);
card('o').querySelector('.check').click(); await wait(80);
ok('target 1 toggles, no overflow, no badge', count(o, T) === 0 && !shown('o'));
card('o').querySelector('.check').click(); await wait(80);
ok('target 1 done has no badge', count(o, T) === 1 && !shown('o'));
hideToast();

const base = { habits: state.habits, categories: [], log: { [ago(5)]: { w: 8 } }, skip: {}, notes: {} };
const mg = mergeStates(base, { ...base, log: { [ago(5)]: { w: 14 }, [ago(4)]: { p: 130 } } }, { ...base, log: { [ago(5)]: { w: 8 }, [ago(6)]: { w: 20 } } });
ok('merge keeps values above goal', mg.log[ago(5)].w === 14 && mg.log[ago(4)].p === 130 && mg.log[ago(6)].w === 20, mg.log);
ok('export and import keep overflow', normalize(JSON.parse(JSON.stringify(state))).log[ago(2)].w === 12);
ok('short numbers', shortNum(30) === '30' && shortNum(1200) === '1,2 тыс.' && shortNum(1000) === '1 тыс.' && shortNum(25400) === '25 тыс.');

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
