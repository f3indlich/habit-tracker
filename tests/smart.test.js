window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const T = todayKey(), ago = n => key(addDays(new Date(), -n));

const src = await (await fetch((window.__serverSrc || 'supabase/functions/send-reminders/index.ts') + '?x=' + Date.now())).text();
const S = new parent.Function(src.replace(/^import .*$/mg, '').replace(/if \(typeof Deno[\s\S]*$/, '') + '\nreturn { pendingToday, smartDue, smartPayload, smartCfg, inQuiet, dueReminders, payloadFor, localNow, SMART_TAG, SMART_KEYS };')();

const H = (id, extra = {}) => ({ id, name: 'Н-' + id, created: ago(60), ...extra });
const ids = l => l.map(h => h.id).join();

{
  const d = { habits: [H('a'), H('b', { target: 8, unit: 'км' }), H('c')], log: { [T]: { a: 1, b: 8, c: 1 } } };
  ok('all done: nothing pending', S.pendingToday(d, T).length === 0, S.pendingToday(d, T));
  const sk = { habits: [H('a'), H('b')], log: { [T]: { a: 1 } }, skip: { [T]: { b: 1 } } };
  ok('skipped habit does not count', S.pendingToday(sk, T).length === 0);
  const pq = S.pendingToday({ habits: [H('q', { target: 8, unit: 'км' })], log: { [T]: { q: 5 } } }, T);
  ok('partial quantitative is pending with done/target', pq.length === 1 && pq[0].done === 5 && pq[0].target === 8 && pq[0].unit === 'км', pq);
  const wd = (weekday(new Date()) + 1) % 7;
  const nt = S.pendingToday({ habits: [H('w', { days: [wd], schedule: { type: 'weekdays', days: [wd] } }), H('m', { schedule: { type: 'monthly', dom: new Date().getDate() === 1 ? 2 : 1 } })], log: {} }, T);
  ok('habits not scheduled today are not pending', nt.length === 0, nt);
  ok('archived habits are not pending', S.pendingToday({ habits: [H('x', { archived: ago(2) }), H('y', { archived: T })], log: {} }, T).length === 0);
  ok('habit created tomorrow is not pending', S.pendingToday({ habits: [H('f', { created: key(addDays(new Date(), 1)) })], log: {} }, T).length === 0);
  const pv = S.pendingToday({ habits: [H('p', { private: true }), H('o')], log: {} }, T);
  ok('pending marks private flag', pv.length === 2 && pv[0].private === true && pv[1].private === false, pv);
  const g = S.pendingToday({ habits: [H('g', { target: 3, goals: [{ until: ago(1), target: 10, unit: '' }] })], log: { [T]: { g: 3 }, [ago(1)]: { g: 3 } } }, T);
  ok('uses today goal from history', g.length === 0, g);
}

const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
const pick = a => a[Math.floor(rnd() * a.length)];
function randomData(n) {
  const habits = [], log = {}, skip = {};
  for (let i = 0; i < n; i++) {
    const id = 'r' + i, target = pick([1, 1, 1, 3, 8, 30]);
    const sc = pick([null, { type: 'daily' }, { type: 'weekdays', days: [pick([0, 1, 2, 3, 4, 5, 6]), pick([0, 1, 2, 3, 4, 5, 6])].sort().filter((x, j, a) => a.indexOf(x) === j) },
      { type: 'perWeek', times: pick([1, 2, 3, 5]) }, { type: 'everyNWeeks', every: pick([2, 3]), days: [pick([0, 1, 2, 3, 4, 5, 6])], anchor: ago(pick([0, 3, 9, 20])) },
      { type: 'monthly', dom: pick([1, new Date().getDate(), 31]) }]);
    const h = { id, name: 'Р' + i, target, created: ago(pick([0, 3, 12, 40])), private: rnd() < .2 };
    if (sc) { h.schedule = sc; if (sc.type === 'weekdays') h.days = sc.days; }
    if (rnd() < .15) h.archived = ago(pick([0, 2]));
    if (rnd() < .25) h.goals = [{ until: ago(pick([1, 3])), target: pick([1, 5, 10]), unit: '', ...(rnd() < .5 ? { sched: { type: 'perWeek', times: 2 } } : {}) }];
    habits.push(h);
    for (let k = 0; k < 8; k++) {
      const day = ago(k), r = rnd();
      if (r < .3) (log[day] ??= {})[id] = target > 1 ? pick([1, target - 1, target, target + 2]) : 1;
      else if (r < .4) (skip[day] ??= {})[id] = 1;
    }
  }
  return { habits, log, skip };
}
const keepState = state;
let mismatch = [];
for (let round = 0; round < 6; round++) {
  const s = normalize(randomData(25));
  state = s;
  const today = new Date();
  const client = s.habits.filter(h => !h.archived && counts(h, today) && count(h, today) < targetOn(h, today)).map(h => h.id + ':' + count(h, today) + '/' + targetOn(h, today));
  const server = S.pendingToday(JSON.parse(JSON.stringify(s)), T).map(h => h.id + ':' + h.done + '/' + h.target);
  if (client.join() !== server.join()) mismatch.push({ round, client, server });
}
state = keepState;
ok('server pending equals client on random data sets', mismatch.length === 0, mismatch.slice(0, 1));

const it = (id, extra = {}) => ({ id, name: 'Имя-' + id, unit: '', done: 0, target: 1, private: false, ...extra });
{
  const p1 = S.smartPayload([it('a')]);
  ok('text: one habit', p1.title === 'Осталась одна привычка' && p1.body === 'Имя-a' && p1.tag === S.SMART_TAG, p1);
  const p2 = S.smartPayload([it('a'), it('b')]);
  ok('text: two habits', p2.title === 'Осталось 2 привычки' && p2.body === 'Имя-a, Имя-b', p2);
  const p3 = S.smartPayload([it('a'), it('b'), it('c')]);
  ok('text: three habits', p3.title === 'Осталось 3 привычки' && p3.body === 'Имя-a, Имя-b, Имя-c', p3);
  const p5 = S.smartPayload(['a', 'b', 'c', 'd', 'e'].map(x => it(x)));
  ok('text: more than three', p5.title === 'Осталось 5 привычек' && p5.body === 'Загляните в приложение', p5);
  const p21 = S.smartPayload(Array.from({ length: 21 }, (_, i) => it('z' + i)));
  ok('text: plural for 21', p21.title === 'Осталась 21 привычка', p21.title);
  const pp = S.smartPayload([it('q', { done: 5, target: 8, unit: 'км' })]);
  ok('text: partial quantitative', pp.body === 'Имя-q: 5 из 8 км, осталось 3', pp);
  const pp2 = S.smartPayload([it('q', { done: 5, target: 8, unit: 'км' }), it('a')]);
  ok('text: partial inside list', pp2.body === 'Имя-q (5 из 8 км), Имя-a', pp2);
  const only = S.smartPayload([it('s', { private: true, name: 'СЕКРЕТ' }), it('s2', { private: true, name: 'СЕКРЕТ2' })]);
  ok('text: only private gives neutral text', only.title === 'Трекер привычек' && only.body === 'Пора заглянуть в приложение' && only.ids.length === 0 && !JSON.stringify(only).includes('СЕКРЕТ'), only);
  const mix = S.smartPayload([it('s', { private: true, name: 'СЕКРЕТ' }), it('a'), it('t', { private: true, name: 'СЕКРЕТ2' })]);
  ok('text: mix shows only regular, no private count', JSON.stringify(mix) === JSON.stringify(S.smartPayload([it('a')])) && !JSON.stringify(mix).includes('СЕКРЕТ'), mix);
  const mix4 = S.smartPayload([it('a'), it('b'), it('c'), it('s', { private: true }), it('t', { private: true })]);
  ok('text: private not counted in N', mix4.title === 'Осталось 3 привычки', mix4.title);
  ok('tag is shared and has no id or name', [p1, p5, only, mix].every(p => p.tag === 'habit-smart') && !/Имя|habit-a/.test(p1.tag));
  ok('smart payload is marked to hide the done action', p1.smart === true);
}

{
  ok('quiet hours over midnight', S.inQuiet(23 * 60 + 30, ['23:00', '08:00']) && S.inQuiet(7 * 60, ['23:00', '08:00']) && !S.inQuiet(8 * 60, ['23:00', '08:00']) && !S.inQuiet(21 * 60, ['23:00', '08:00']));
  ok('quiet hours within day', S.inQuiet(14 * 60, ['13:00', '15:00']) && !S.inQuiet(16 * 60, ['13:00', '15:00']) && !S.inQuiet(5, ['10:00', '10:00']));
  ok('settings defaults', JSON.stringify(S.smartCfg(undefined)) === JSON.stringify({ on: false, at: '21:00', repeat: 0, quiet: ['23:00', '08:00'] }));
  ok('settings sanitized', JSON.stringify(S.smartCfg({ on: true, at: '25:00', repeat: 45, quiet: ['x'] })) === JSON.stringify({ on: true, at: '21:00', repeat: 0, quiet: ['23:00', '08:00'] }));

  const base = day => ({ habits: [{ id: 'a', name: 'A', created: '2026-01-01' }], log: {}, smart: { on: true, at: '21:00', repeat: 60, quiet: ['23:00', '08:00'] }, day });
  const at = iso => new Date(iso);
  const d = base();
  ok('evening off by default', S.smartDue({ ...d, smart: undefined }, 'UTC', at('2026-10-31T21:05:00Z')) === null);
  const e = S.smartDue(d, 'UTC', at('2026-10-31T21:05:00Z'));
  ok('evening fires in window', e?.kind === 'evening' && e.key === S.SMART_KEYS.evening && e.day === '2026-10-31', e);
  ok('not before time and not after window', S.smartDue(d, 'UTC', at('2026-10-31T20:59:00Z')) === null && S.smartDue(d, 'UTC', at('2026-10-31T21:31:00Z')) === null);
  ok('evening uses user time zone', S.smartDue(d, 'Europe/Moscow', at('2026-10-31T18:10:00Z'))?.kind === 'evening' && S.smartDue(d, 'Europe/Moscow', at('2026-10-31T21:05:00Z')) === null);
  const night = { ...d, smart: { ...d.smart, at: '23:30' } };
  ok('no reminder in quiet hours', S.smartDue(night, 'UTC', at('2026-10-31T23:35:00Z')) === null);
  ok('night in user zone is quiet', S.smartDue({ ...d, smart: { ...d.smart, at: '02:00', quiet: ['23:00', '08:00'] } }, 'Asia/Tokyo', at('2026-10-31T17:05:00Z')) === null);
  const tk = { habits: [{ id: 'a', name: 'A', created: '2026-01-01' }], log: { '2026-10-31': { a: 1 } }, smart: { on: true, at: '07:00', repeat: 0, quiet: ['23:00', '06:00'] } };
  const tky = S.smartDue(tk, 'Asia/Tokyo', at('2026-10-31T22:10:00Z'));
  ok('today follows time zone (Tokyo is already Nov 1)', tky?.day === '2026-11-01' && tky.list.length === 1, tky);
  ok('done in user day: no reminder', S.smartDue({ ...tk, log: { '2026-11-01': { a: 1 } } }, 'Asia/Tokyo', at('2026-10-31T22:10:00Z')) === null);
  const allDone = { ...d, log: { '2026-10-31': { a: 1 } } };
  ok('all done: no evening', S.smartDue(allDone, 'UTC', at('2026-10-31T21:05:00Z')) === null);
  ok('all skipped: no evening', S.smartDue({ ...d, skip: { '2026-10-31': { a: 1 } } }, 'UTC', at('2026-10-31T21:05:00Z')) === null);

  const sentLog = {}, sent = [];
  const run = now => {
    const r = S.smartDue(d, 'UTC', now, { ...sentLog }, null);
    if (!r) return;
    const k = r.kind;
    if (sentLog[k]) return;
    sentLog[k] = now.toISOString(); sent.push(k);
  };
  run(at('2026-10-31T21:05:00Z')); run(at('2026-10-31T21:05:00Z')); run(at('2026-10-31T21:10:00Z'));
  ok('double run sends one evening', sent.join() === 'evening', sent);
  ok('second run sees evening in log', S.smartDue(d, 'UTC', at('2026-10-31T21:05:30Z'), { evening: '2026-10-31T21:05:00Z' }) === null);
  run(at('2026-10-31T21:50:00Z'));
  ok('repeat waits for interval', sent.join() === 'evening', sent);
  run(at('2026-10-31T22:06:00Z')); run(at('2026-10-31T22:10:00Z')); run(at('2026-10-31T22:40:00Z'));
  ok('one repeat at most', sent.join() === 'evening,repeat', sent);
  const ev = { evening: '2026-10-31T21:05:00Z' };
  ok('repeat sent when still pending', S.smartDue(d, 'UTC', at('2026-10-31T22:06:00Z'), ev)?.kind === 'repeat');
  ok('no repeat once all is marked', S.smartDue(allDone, 'UTC', at('2026-10-31T22:06:00Z'), ev) === null);
  ok('no repeat if app opened after evening', S.smartDue(d, 'UTC', at('2026-10-31T22:06:00Z'), ev, '2026-10-31T21:30:00Z') === null
    && S.smartDue(d, 'UTC', at('2026-10-31T22:06:00Z'), ev, '2026-10-31T20:00:00Z')?.kind === 'repeat');
  ok('no repeat when setting off', S.smartDue({ ...d, smart: { ...d.smart, repeat: 0 } }, 'UTC', at('2026-10-31T22:06:00Z'), ev) === null);
  ok('repeat respects quiet hours', S.smartDue({ ...d, smart: { ...d.smart, repeat: 120 } }, 'UTC', at('2026-10-31T23:10:00Z'), ev) === null);
  ok('no repeat without evening', S.smartDue(d, 'UTC', at('2026-10-31T22:06:00Z'), {}) === null);
}

{
  const rd = { habits: [{ id: 'w', name: 'W', created: '2026-01-01', schedule: { type: 'perWeek', times: 2 }, remind: { times: ['09:00'] } }], log: { '2026-10-26': { w: 1 }, '2026-10-27': { w: 1 } } };
  ok('regular reminder skips perWeek habit with quota met', S.dueReminders(rd, 'UTC', new Date('2026-10-31T09:05:00Z')).length === 0);
  const rm = { habits: [{ id: 'm', name: 'M', created: '2026-01-01', schedule: { type: 'monthly', dom: 15 }, remind: { times: ['09:00'] } }], log: {} };
  ok('regular reminder follows monthly schedule', S.dueReminders(rm, 'UTC', new Date('2026-10-31T09:05:00Z')).length === 0 && S.dueReminders(rm, 'UTC', new Date('2026-10-15T09:05:00Z')).length === 1);
  ok('server source: smart replaces regular in one run', /smart \? smartPayload\(smart\.list\) : payloadFor\(fresh\)/.test(src));
  ok('server source: no habit names in logs', !/console\.[a-z]+\([^)]*(\.name\b|title|payload|smart\.list|fresh)/.test(src) && /console\.error/.test(src));
}

ok('normalize keeps smart settings', JSON.stringify(normalize({ habits: [], log: {}, smart: { on: true, at: '20:30', repeat: 30, quiet: ['22:00', '07:00'] } }).smart) === JSON.stringify({ on: true, at: '20:30', repeat: 30, quiet: ['22:00', '07:00'] }));
ok('normalize drops junk smart', !('smart' in normalize({ habits: [], log: {}, smart: 'x' })) && normalize({ habits: [], log: {}, smart: { repeat: 7, at: 'bad' } }).smart.repeat === 0);
const mg = mergeStates({ habits: [], log: {} }, { habits: [], log: {} }, { habits: [], log: {}, smart: { on: true, at: '20:00', repeat: 0, quiet: ['23:00', '08:00'] } });
ok('merge takes remote smart when local unchanged', mg.smart?.at === '20:00');

{
  const keep = { enabled: cloud.enabled, session: cloud.session, sub: push.sub, smart: state.smart };
  const perm = Object.getOwnPropertyDescriptor(Notification, 'permission');
  Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
  cloud.enabled = true; cloud.session = { user: { id: 'x' } }; push.sub = null;
  renderPush();
  ok('settings hidden when push is not on', $('smartBox').hidden === true);
  push.sub = {};
  renderPush();
  ok('settings shown when push is on', $('smartBox').hidden === false);
  cloud.session = null;
  delete state.smart; renderSmart();
  ok('defaults in UI', $('smartSwitch').getAttribute('aria-checked') === 'false' && $('smartAt').value === '21:00' && $('smartQFrom').value === '23:00' && $('smartQTo').value === '08:00' && !$('smartWrap').classList.contains('open'));
  $('smartSwitch').click();
  ok('switch turns on and opens options', state.smart?.on === true && $('smartWrap').classList.contains('open') && $('smartSwitch').getAttribute('aria-checked') === 'true');
  $('smartAt').value = '20:15'; $('smartAt').dispatchEvent(new Event('change'));
  ok('time saved', state.smart.at === '20:15');
  $('smartRepSwitch').click();
  ok('repeat on with 60 by default', state.smart.repeat === 60 && $('smartRepWrap').classList.contains('open') && $('smartRep').querySelector('[data-v="60"]').getAttribute('aria-pressed') === 'true');
  $('smartRep').querySelector('[data-v="120"]').click();
  ok('repeat interval saved', state.smart.repeat === 120 && $('smartRep').querySelector('[data-v="120"]').getAttribute('aria-pressed') === 'true');
  $('smartQFrom').value = '22:30'; $('smartQFrom').dispatchEvent(new Event('change'));
  $('smartQTo').value = '07:15'; $('smartQTo').dispatchEvent(new Event('change'));
  ok('quiet hours saved', state.smart.quiet.join() === '22:30,07:15');
  const stored = JSON.parse(localStorage.getItem(STORE)).smart;
  ok('settings stored with habit data', stored?.on === true && stored.at === '20:15' && stored.repeat === 120 && stored.quiet.join() === '22:30,07:15', stored);
  state = load(); renderSmart();
  ok('settings restored after reload', $('smartSwitch').getAttribute('aria-checked') === 'true' && $('smartAt').value === '20:15' && $('smartQFrom').value === '22:30' && $('smartRep').querySelector('[data-v="120"]').getAttribute('aria-pressed') === 'true');
  $('smartRepSwitch').click(); $('smartSwitch').click();
  ok('switches turn off', state.smart.on === false && state.smart.repeat === 0 && !$('smartWrap').classList.contains('open'));
  if (keep.smart) state.smart = keep.smart; else delete state.smart;
  save();
  Object.assign(cloud, { enabled: keep.enabled, session: keep.session }); push.sub = keep.sub;
  if (perm) Object.defineProperty(Notification, 'permission', perm); else delete Notification.permission;
  renderPush();
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
