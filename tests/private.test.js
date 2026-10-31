window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const SECRET = 'ZZZ_PRIVATE_TEST', NOTE = 'ZZZ_NOTE_TEXT';
const reset = () => { lockNow(); localStorage.removeItem(LOCK_STORE); };
const leaks = () => {
  const out = [];
  if (document.body.textContent.includes(SECRET) || document.body.textContent.includes(NOTE)) out.push('text');
  if (document.body.innerHTML.includes(SECRET) || document.body.innerHTML.includes(NOTE)) out.push('html');
  if (document.title.includes(SECRET)) out.push('title');
  for (const el of document.querySelectorAll('[aria-label], [title]')) if ((el.getAttribute('aria-label') || '').includes(SECRET) || (el.title || '').includes(SECRET)) out.push('attr');
  for (const el of document.querySelectorAll('input, textarea')) if (el.value.includes(SECRET) || el.value.includes(NOTE)) out.push('value');
  return out;
};
const base = () => {
  const log = {};
  for (let i = 0; i < 30; i++) log[ago(i)] = { a: i % 2, b: i % 3 ? 1 : 0, p: 1 };
  return normalize({
    habits: [
      { id: 'a', name: 'Вода', icon: 'water', color: '#3b82f6', created: ago(30) },
      { id: 'b', name: 'Чтение', icon: 'books', color: '#f97316', created: ago(30) },
      { id: 'p', name: SECRET, icon: 'meditate', color: '#14b8a6', created: ago(40), private: true, why: SECRET },
      { id: 'q', name: SECRET + '_ARCH', icon: 'walk', color: '#0ea5e9', created: ago(40), private: true, archived: ago(2) },
      { id: 'z', name: 'Старое', icon: 'check', color: '#22c55e', created: ago(40), archived: ago(3) },
    ],
    log, notes: { [ago(1)]: { p: NOTE } },
  });
};
const noPriv = () => { const s = base(); s.habits = s.habits.filter(h => !h.private); for (const m of [s.log, s.notes]) for (const k in m) { delete m[k].p; delete m[k].q; } return normalize(s); };
const show = s => { state = s; viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };

reset();
ok('isPrivate only for true', isPrivate({ private: true }) && !isPrivate({ private: 'true' }) && !isPrivate({}) && !isPrivate(null));
const st = { habits: [{ id: 'x' }, { id: 'y', private: true }] };
ok('locked: visible has only regular, private is empty', visibleHabits(st).map(h => h.id).join() === 'x' && privateHabits(st).length === 0);
unlocked = true;
ok('unlocked: private habits listed, visible still regular only', privateHabits(st).map(h => h.id).join() === 'y' && visibleHabits(st).map(h => h.id).join() === 'x');
unlocked = false;

const n = normalize({ habits: [{ id: 'a', name: 'A', private: true }, { id: 'b', name: 'B', private: 'yes' }, { id: 'c', name: 'C', private: 1 }, { id: 'd', name: 'D', private: false }], log: {} });
ok('normalize keeps only boolean true', n.habits[0].private === true && !('private' in n.habits[1]) && !('private' in n.habits[2]) && !('private' in n.habits[3]));
const B = { habits: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', private: true }], log: {} };
const L = { habits: [{ id: 'a', name: 'A', private: true }, { id: 'b', name: 'B', private: true }], log: {} };
const Rm = { habits: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B2', private: true }], log: {} };
const m = mergeStates(B, L, Rm);
ok('merge keeps local private flag', m.habits.find(h => h.id === 'a').private === true);
ok('merge keeps remote private flag', m.habits.find(h => h.id === 'b').private === true && m.habits.find(h => h.id === 'b').name === 'B2');
const m2 = mergeStates(B, { habits: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], log: {} }, B);
ok('merge carries flag removal', !m2.habits.find(h => h.id === 'b').private);

const r1 = await makePin('1234', 1000), r2 = await makePin('1234', 1000);
ok('right PIN matches hash', await checkPin('1234', r1));
ok('wrong PIN does not match', !(await checkPin('1235', r1)) && !(await checkPin('12a4', r1)) && !(await checkPin('123', r1)));
ok('same PIN with different salt gives different hash', r1.salt !== r2.salt && r1.hash !== r2.hash);
ok('PIN itself is not stored', !JSON.stringify(r1).includes('1234'));
ok('default iterations at least 150000', PIN_ITER >= 150000);
ok('hash compare', sameHash('abc', 'abc') && !sameHash('abc', 'abd') && !sameHash('abc', 'abcd'));
ok('PIN format', validPin('1234') && validPin('123456') && !validPin('123') && !validPin('1234567') && !validPin('12 34'));

await setPin('2468');
const rec = readLock();
ok('lock record on device only, with salt and hash', hasPin(rec) && rec.salt && rec.hash && !localStorage.getItem(LOCK_STORE).includes('2468'));
ok('lock key is separate from data', LOCK_STORE === NS + '-lock' && !localStorage.getItem(STORE)?.includes(rec.hash));
const t0 = Date.now();
let res;
for (let i = 0; i < 4; i++) res = await tryPin('0000', t0);
ok('four wrong attempts give no pause', !res.ok && res.wait === 0 && res.fails === 4, res);
res = await tryPin('0000', t0);
ok('fifth wrong attempt pauses 30 s', !res.ok && res.wait === 30000, res);
res = await tryPin('2468', t0 + 1000);
ok('right PIN refused during pause', !res.ok && res.wait > 0, res);
ok('pause survives reload', lockWait(JSON.parse(localStorage.getItem(LOCK_STORE)), t0 + 1000) === 29000 && readLock().fails === 5);
res = await tryPin('0000', t0 + 31000);
ok('next wrong attempt pauses 1 min', res.wait === 60000, res);
res = await tryPin('0000', t0 + 92000);
ok('then 5 min', res.wait === 300000, res);
res = await tryPin('0000', t0 + 393000);
ok('then 15 min', res.wait === 900000, res);
res = await tryPin('0000', t0 + 1294000);
ok('stays at 15 min', res.wait === 900000, res);
ok('delay table', delayAfter(4) === 0 && delayAfter(5) === 30000 && delayAfter(6) === 60000 && delayAfter(7) === 300000 && delayAfter(8) === 900000 && delayAfter(20) === 900000);
res = await tryPin('2468', t0 + 2195000);
ok('right PIN after pause resets counter', res.ok && readLock().fails === 0 && !readLock().until, res);

const btn = document.createElement('button');
document.body.append(btn);
let longs = 0, clicks = 0;
addLongPress(btn, () => longs++, 120, 10);
btn.addEventListener('click', () => clicks++);
const pe = (t, x = 10, y = 10) => btn.dispatchEvent(new PointerEvent(t, { bubbles: true, button: 0, pointerId: 7, clientX: x, clientY: y }));
pe('pointerdown'); await wait(40); pe('pointerup'); btn.click(); await wait(150);
ok('short press is a click', longs === 0 && clicks === 1, [longs, clicks]);
pe('pointerdown'); await wait(180); pe('pointerup'); btn.click();
ok('long press fires and swallows click', longs === 1 && clicks === 1, [longs, clicks]);
pe('pointerdown', 10, 10); pe('pointermove', 22, 10); await wait(180); pe('pointerup', 22, 10);
ok('moving more than 10 px cancels', longs === 1, longs);
pe('pointerdown', 10, 10); pe('pointermove', 15, 14); await wait(180); pe('pointerup', 15, 14);
ok('small wobble keeps long press', longs === 2, longs);
btn.remove();
ok('gear long press threshold about 600 ms', LONG_MS >= 500 && LONG_MS <= 700 && LONG_SLOP === 10);

reset();
show(noPriv()); await wait(400);
const heroOf = () => [$('heroDone').textContent, $('heroTotal').textContent, $('heroPct').textContent, $('heroMsg').textContent, $('heroChips').textContent];
const daysOf = () => [...$('days').children].map(b => b.title + b.querySelector('.prog').style.strokeDashoffset + b.className).join('|');
await wait(900);
const hero0 = heroOf(), days0 = daysOf();
openSummary(); await wait(900);
const sum0 = $('sSheet').innerHTML.replace(/style="[^"]*"/g, '');
closeOverlay($('sumOv')); await wait(400);
const arch0 = $('archCount').textContent;

show(base()); await wait(1300);
ok('locked: private habit not in DOM', !leaks().length && !document.querySelector('.priv-sec, .priv-bar'), leaks());
ok('locked: ring and N of M ignore private', JSON.stringify(heroOf()) === JSON.stringify(hero0), [heroOf(), hero0]);
ok('locked: header chips ignore private streak', !$('heroChips').textContent.includes(SECRET) && heroOf()[4] === hero0[4], heroOf()[4]);
ok('locked: week rings ignore private', daysOf() === days0);
ok('locked: archive count ignores private', $('archCount').textContent === arch0 && !$('archList').textContent.includes(SECRET), $('archCount').textContent);
openSummary(); await wait(900);
ok('summary identical with private habits', $('sSheet').innerHTML.replace(/style="[^"]*"/g, '') === sum0);
ok('summary leaks nothing', !leaks().length, leaks());
closeOverlay($('sumOv')); await wait(400);
openHistory('a'); await wait(600);
ok('history of regular habit leaks nothing', !leaks().length, leaks());
closeOverlay($('histOv')); setHist(null); await wait(400);
setArchiveOpen(true); render(); await wait(300);
ok('archive leaks nothing', !leaks().length, leaks());
setArchiveOpen(false);
ok('day progress ignores private', dayProgress(new Date()).total === 2);

await setPin('2468');
unlock(); await wait(500);
ok('unlocked: private section shown', !!document.querySelector('.priv-sec') && document.querySelector('.priv-sec').textContent.includes(SECRET));
ok('unlocked: open indicator shown', !!document.querySelector('.priv-bar'));
ok('unlocked: private archive inside section only', document.querySelector('.priv-sec .priv-arch').textContent.includes(SECRET + '_ARCH') && !$('archList').textContent.includes(SECRET));
ok('unlocked: ring still ignores private', JSON.stringify(heroOf()) === JSON.stringify(hero0), [heroOf(), hero0]);
ok('unlocked: chips still ignore private', !$('heroChips').textContent.includes(SECRET));
const pcard = cards.get('p');
pcard.querySelector('.check').click(); await wait(300);
ok('marking private changes nothing in hero', JSON.stringify(heroOf().slice(0, 3)) === JSON.stringify(hero0.slice(0, 3)), heroOf());
ok('toast has no habit name', !$('toastText').textContent.includes(SECRET), $('toastText').textContent);
openSummary(); await wait(900);
ok('unlocked: summary still identical', $('sSheet').innerHTML.replace(/style="[^"]*"/g, '') === sum0);
closeOverlay($('sumOv')); await wait(400);
openHistory('p'); await wait(600);
ok('unlocked: private history opens', $('hName').textContent === SECRET && $('histOv')._shown);
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
document.dispatchEvent(new Event('visibilitychange'));
ok('hidden: locked synchronously', !unlocked && !document.querySelector('.priv-sec, .priv-bar') && !leaks().length, leaks());
ok('hidden: private history closed', !$('histOv')._shown && $('histOv').hidden);
delete document.visibilityState;
await wait(400);
ok('after hidden still nothing', !leaks().length, leaks());

unlock(); await wait(200);
addEventListener('pagehide', () => {}, { once: true });
dispatchEvent(new Event('pagehide'));
ok('pagehide locks', !unlocked && !document.querySelector('.priv-sec'));

const realST = window.setTimeout;
let idleFn = null;
window.setTimeout = (fn, ms, ...a) => { if (ms === IDLE_MS) { idleFn = fn; return 0; } return realST(fn, ms, ...a); };
unlock();
window.setTimeout = realST;
ok('idle timer set for 2 minutes', typeof idleFn === 'function' && IDLE_MS === 120000);
idleFn?.();
ok('idle timer locks', !unlocked && !document.querySelector('.priv-sec') && !leaks().length);

openForm(); await wait(400);
ok('form switch absent while locked', !$('formOv').textContent.includes('Личная привычка'));
closeOverlay($('formOv')); await wait(400);
unlock(); await wait(200);
openForm('a'); await wait(400);
const sw = $('formOv').querySelector('.priv-rem .switch');
ok('form switch present while unlocked', !!sw && sw.getAttribute('aria-checked') === 'false');
sw.closest('.rem-head').click();
$('form').requestSubmit(); await wait(500);
ok('switch moves habit to private', findHabit('a').private === true && $('toastText').textContent === 'Перенесено в личное', $('toastText').textContent);
ok('moved habit leaves main list', !$('sections').querySelector('.section:not(.priv-sec) .habit[data-id="a"]') && !!document.querySelector('.priv-sec .habit[data-id="a"]'));
openForm('a'); await wait(400);
$('formOv').querySelector('.priv-rem .rem-head').click();
$('form').requestSubmit(); await wait(500);
ok('switch moves habit back', !findHabit('a').private && $('toastText').textContent === 'Перенесено в обычные');
document.querySelector('.priv-sec .priv-add').click(); await wait(400);
ok('plus in private section starts private habit', $('formOv').querySelector('.priv-rem .switch').getAttribute('aria-checked') === 'true');
openForm('p'); await wait(400);
ok('private form leaks name while open', $('name').value === SECRET);
lockNow(); await wait(50);
ok('lock closes private form and clears it', !$('formOv')._shown && !leaks().length && !$('formOv').querySelector('.priv-rem'), leaks());
await wait(400);

$('setBtn').click(); await wait(500);
ok('short click opens settings', $('setOv')._shown && !$('lockOv')._shown);
closeOverlay($('setOv')); await wait(500);
const gear = $('setBtn'), gr = gear.getBoundingClientRect();
const gp = t => gear.dispatchEvent(new PointerEvent(t, { bubbles: true, button: 0, pointerId: 3, clientX: gr.left + 5, clientY: gr.top + 5 }));
gp('pointerdown'); await wait(LONG_MS + 100); gp('pointerup'); gear.click(); await wait(500);
ok('long press opens PIN sheet, not settings', $('lockOv')._shown && !$('setOv')._shown && lockMode === 'enter', lockMode);
ok('PIN field numeric, 16px+, focused', $('lockPin').inputMode === 'numeric' && parseFloat(getComputedStyle($('lockPin')).fontSize) >= 16 && document.activeElement === $('lockPin'));
ok('no gesture hint in settings/help', !$('setOv').textContent.includes('долгое') && !$('setOv').textContent.includes('Личн'));
$('lockPin').value = '1111'; $('lockForm').requestSubmit(); await wait(400);
ok('wrong PIN keeps it closed', !unlocked && !document.querySelector('.priv-sec') && !$('lockErr').hidden);
$('lockPin').value = '2468'; $('lockForm').requestSubmit(); await wait(400);
ok('right PIN opens', unlocked && !!document.querySelector('.priv-sec'));
await wait(400);
gp('pointerdown'); await wait(LONG_MS + 100); gp('pointerup'); gear.click(); await wait(400);
ok('long press when open locks again', !unlocked && !document.querySelector('.priv-sec') && !$('setOv')._shown);
await wait(400);

localStorage.removeItem(LOCK_STORE);
gp('pointerdown'); await wait(LONG_MS + 100); gp('pointerup'); await wait(500);
ok('no PIN on device with cloud private habits: setup with notice', lockMode === 'setup' && $('lockBody').textContent.includes('На этом устройстве нужно задать PIN'));
$('lockPin').value = '1357'; $('lockPin2').value = '1358'; $('lockForm').requestSubmit(); await wait(200);
ok('mismatched PIN rejected', !unlocked && !hasPin());
$('lockPin2').value = '1357'; $('lockForm').requestSubmit(); await wait(800);
ok('setup creates PIN and opens', hasPin() && unlocked);
closeOverlay($('lockOv')); await wait(400);
lockNow();
const keep = state;
state = normalize({ habits: [], log: {} }); localStorage.removeItem(LOCK_STORE);
gp('pointerdown'); await wait(LONG_MS + 100); gp('pointerup'); await wait(500);
ok('first setup explains feature', lockMode === 'setup' && $('lockBody').textContent.includes('Привычки, которые не видно при обычном просмотре'));
closeOverlay($('lockOv')); await wait(400);
state = keep; await setPin('2468'); render();

gp('pointerdown'); await wait(LONG_MS + 100); gp('pointerup'); await wait(500);
$('lockForgot').click(); await wait(200);
ok('forgot PIN offers wipe with word', lockMode === 'wipe' && $('lockBody').textContent.includes('СТЕРЕТЬ'));
$('lockWord').value = 'стер'; $('lockForm').requestSubmit(); await wait(200);
ok('wrong word does not wipe', state.habits.some(isPrivate));
$('lockWord').value = 'СТЕРЕТЬ'; $('lockForm').requestSubmit(); await wait(300);
ok('wipe removes private habits, notes and PIN', !state.habits.some(isPrivate) && !hasPin() && !JSON.stringify(state).includes(NOTE) && state.habits.some(h => h.id === 'b'));
await wait(400);

show(base()); await setPin('2468'); unlock(); await wait(300);
openLockSettings(); await wait(400);
ok('settings sheet has change PIN and disable', !!$('lockChange') && !!$('lockOff'));
$('lockOff').click(); await wait(200);
ok('disable defaults to make regular', $('lockForm').lockOffWhat.value === 'keep');
$('lockForm').requestSubmit(); await wait(400);
ok('disable returns habits to regular', !state.habits.some(isPrivate) && state.habits.some(h => h.id === 'p') && !hasPin() && !unlocked);
await wait(400);

show(base()); await wait(300);
let blob = null;
const realURL = URL.createObjectURL, realClick = HTMLAnchorElement.prototype.click;
URL.createObjectURL = b => { blob = b; return 'blob:x'; };
HTMLAnchorElement.prototype.click = function () {};
await exportData();
URL.createObjectURL = realURL; HTMLAnchorElement.prototype.click = realClick;
const exported = JSON.parse(await blob.text());
ok('export while locked includes private habits', exported.habits.find(h => h.id === 'p')?.private === true);
ok('export hint mentions all data', $('exportBtn').textContent.includes('со всеми данными'));
state = normalize({ habits: [], log: {} });
const dt = new DataTransfer();
dt.items.add(new File([JSON.stringify(exported)], 'h.json', { type: 'application/json' }));
$('importFile').files = dt.files;
$('importFile').dispatchEvent(new Event('change'));
await wait(400); closeConfirm(true); await wait(400);
ok('import keeps private flag', findHabit('p')?.private === true && !findHabit('a')?.private);
ok('import leaks nothing while locked', !leaks().length, leaks());

const src = await (await fetch((window.__serverSrc || 'supabase/functions/send-reminders/index.ts') + '?x=' + Date.now())).text();
const S = new parent.Function(src.replace(/^import .*$/mg, '').replace(/if \(typeof Deno[\s\S]*$/, '') + '\nreturn { payloadFor };')();
const slot = { kind: 'time', need: 1, at: 540 };
const P = { id: 'pp1', name: SECRET, private: true, target: 1, done: 0, left: 1, day: key(new Date()), slot };
const P2 = { ...P, id: 'pp2', name: SECRET + '2' };
const O = { id: 'oo1', name: 'Вода', target: 1, done: 0, left: 1, day: key(new Date()), slot };
const O2 = { ...O, id: 'oo2', name: 'Чтение' };
const p1 = S.payloadFor([P]), pm = S.payloadFor([P, P2]);
ok('push: private only gives neutral text', p1.title === 'Трекер привычек' && p1.body === 'Пора заглянуть в приложение' && p1.tag === 'habit-private' && p1.ids.length === 0, p1);
ok('push: several private share tag', pm.tag === 'habit-private' && !JSON.stringify(pm).includes('pp'), pm);
const mix = S.payloadFor([O, P]), mix2 = S.payloadFor([O, O2, P]);
ok('push: mixed shows only regular as before', JSON.stringify(mix) === JSON.stringify(S.payloadFor([O])), mix);
ok('push: mixed hides private count', mix2.title === 'Ждут привычки: 2' && JSON.stringify(mix2) === JSON.stringify(S.payloadFor([O, O2])), mix2);
ok('push: no private name or id anywhere', ![p1, pm, mix, mix2].some(x => JSON.stringify(x).includes(SECRET) || JSON.stringify(x).includes('pp1')));

unlocked = false;
setMap(state.log, key(new Date()), 'p', 0);
markDoneFromPush('p'); await wait(200);
ok('push done link ignored for locked private habit', !count(findHabit('p'), new Date()), count(findHabit('p'), new Date()));

reset();
ok('unlock state not persisted', ![...Object.keys(localStorage), ...Object.keys(sessionStorage)].some(k => /unlock/i.test(k + localStorage.getItem(k))));
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
