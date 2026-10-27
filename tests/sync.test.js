window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const clone = v => JSON.parse(JSON.stringify(v));

const db = { rows: {}, fail: null, ops: [] };
const exec = f => {
  db.ops.push(f.op);
  if (db.fail) return { data: null, error: { message: db.fail } };
  const uid = f.eq.user_id, row = db.rows[uid];
  if (f.op === 'select') return { data: row ? { data: clone(row.data), version: row.version } : null, error: null };
  if (f.op === 'insert') {
    if (row) return { error: { code: '23505', message: 'duplicate' } };
    db.rows[f.vals.user_id] = { data: clone(f.vals.data), version: f.vals.version };
    return { error: null };
  }
  if (!row || row.version !== f.eq.version) return { data: [], error: null };
  Object.assign(row, { data: clone(f.vals.data), version: f.vals.version });
  return { data: [{ version: row.version }], error: null };
};
const table = () => {
  const f = { op: null, eq: {}, vals: null };
  const q = {
    select() { f.op ??= 'select'; return q; },
    eq(k, v) { f.eq[k] = v; return q; },
    maybeSingle() { return q; },
    insert(v) { f.op = 'insert'; f.vals = v; f.eq.user_id = v.user_id; return q; },
    update(v) { f.op = 'update'; f.vals = v; return q; },
    then(res, rej) { return Promise.resolve().then(() => exec(f)).then(res, rej); },
  };
  return q;
};
let authCb = null, session = null;
const fake = {
  from: () => table(),
  channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
  auth: {
    onAuthStateChange: cb => { authCb = cb; },
    getSession: async () => ({ data: { session } }),
    signOut: async () => { session = null; authCb('SIGNED_OUT', null); },
    stopAutoRefresh() {},
  },
};
const user = id => ({ user: { id, email: id + '@example.test' }, refresh_token: 'r-' + id });

state = normalize({ habits: [{ id: 'g', name: 'Чтение', icon: 'book', color: '#22c55e', created: ago(30) }], log: { [ago(3)]: { g: 1 } } });
save(); render();
session = user('u1');
await initCloud(fake);
await wait(400);
const row1 = () => db.rows.u1;
ok('first sign-in uploads local habits', row1()?.version === 1 && row1().data.habits[0]?.name === 'Чтение' && row1().data.log[ago(3)]?.g === 1, row1());
ok('status is synced', cloud.status === 'ok' && $('setStatus').textContent.startsWith('Всё синхронизировано'), [cloud.status, $('setStatus').textContent]);

setCount(findHabit('g'), new Date(), 1);
const other = clone(row1().data);
other.log[ago(1)] = { g: 1 };
other.habits.push({ id: 'p', name: 'Прогулка', icon: 'walk', color: '#3b82f6', created: ago(2) });
db.rows.u1 = { data: other, version: 2 };
await wait(1300);
ok('conflicting edits from two devices are merged', !!row1().data.log[todayKey()]?.g && !!row1().data.log[ago(1)]?.g && row1().data.habits.length === 2, row1());
ok('merged version is pushed once', row1().version === 3, row1().version);
ok('local state receives remote edits', !!findHabit('p') && state.log[ago(1)]?.g === 1 && state.log[todayKey()]?.g === 1);
ok('local and cloud are equal after merge', same(state, normalize(clone(row1().data))));

const renamed = clone(row1().data);
renamed.habits.find(h => h.id === 'g').name = 'Чтение книг';
db.rows.u1 = { data: renamed, version: 4 };
await cloudCheck(); await wait(300);
ok('remote rename arrives on check', findHabit('g').name === 'Чтение книг' && cloud.status === 'ok');

const before = db.ops.length;
await cloudCheck(); await wait(200);
ok('check without changes only reads', db.ops.slice(before).every(o => o === 'select'), db.ops.slice(before));

const gone = clone(row1().data);
gone.habits = gone.habits.filter(h => h.id !== 'p');
db.rows.u1 = { data: gone, version: 5 };
setCount(findHabit('g'), addDays(new Date(), -2), 1);
await wait(1300);
ok('habit deleted elsewhere disappears here', !findHabit('p') && !row1().data.habits.some(h => h.id === 'p'));
ok('local mark made at the same time is kept', state.log[ago(2)]?.g === 1 && row1().data.log[ago(2)]?.g === 1);

db.fail = 'Failed to fetch';
setCount(findHabit('g'), addDays(new Date(), -4), 1);
await wait(1100);
ok('network error is shown', cloud.status === 'error' && $('setError').textContent === 'Failed to fetch', [cloud.status, $('setError').textContent]);
ok('mark stays on device during error', state.log[ago(4)]?.g === 1 && JSON.parse(localStorage.getItem(STORE)).log[ago(4)]?.g === 1);
db.fail = null;
await cloudSync(); await wait(300);
ok('change is uploaded after network returns', cloud.status === 'ok' && row1().data.log[ago(4)]?.g === 1, [cloud.status, row1().version]);

const v = row1().version;
setNote(findHabit('g'), new Date(), 'Тест <b>заметки</b>');
await wait(1100);
ok('notes sync as plain text', row1().data.notes[todayKey()]?.g === 'Тест <b>заметки</b>' && row1().version === v + 1);

session = user('u2');
authCb('SIGNED_IN', session);
await wait(600);
ok('another account does not get previous user data', !state.habits.length && !Object.keys(state.log).length && !db.rows.u2?.data.habits.length, db.rows.u2);
ok('first account data is untouched', row1().data.habits.length === 1 && row1().version === v + 1);

session = user('u1');
authCb('SIGNED_IN', session);
await wait(600);
ok('switching back loads own habits', findHabit('g')?.name === 'Чтение книг' && state.log[ago(4)]?.g === 1);

await fake.auth.signOut(); await wait(200);
ok('sign out stops sync and keeps data on device', cloud.status === 'off' && !!findHabit('g'));
setCount(findHabit('g'), addDays(new Date(), -5), 1);
await wait(1000);
ok('no uploads after sign out', !row1().data.log[ago(5)]);

const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '';
const dir = n => (csp.split(';').map(s => s.trim().split(/\s+/)).find(p => p[0] === n) || []).slice(1);
ok('page has a content security policy', !!csp && csp === document.head.querySelector('meta[http-equiv]').content && document.head.firstElementChild.matches('meta[charset]') && document.head.children[1].matches('meta[http-equiv="Content-Security-Policy"]'));
ok('scripts only from own site and exact Supabase build', dir('script-src').every(s => s === "'self'" || /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[\d.]+\/dist\/umd\/supabase\.min\.js$/.test(s)), dir('script-src'));
ok('no unsafe script sources', !/'unsafe-eval'|'unsafe-inline'|\*/.test(dir('script-src').join(' ') + dir('default-src').join(' ')));
ok('plugins and base tag are blocked', dir('object-src').join() === "'none'" && dir('base-uri').join() === "'self'");
const syncSrc = await (await fetch('js/sync.js?x=' + Date.now())).text();
const libSrc = syncSrc.match(/s\.src = '([^']+)'/)?.[1];
ok('Supabase library URL is allowed', !!libSrc && dir('script-src').includes(libSrc), libSrc);
const host = new URL(window.HABIT_CONFIG.supabaseUrl).host;
ok('Supabase project is allowed for requests and live updates', dir('connect-src').includes('https://' + host) && dir('connect-src').includes('wss://' + host), dir('connect-src'));

let swOk = '';
try { const reg = await navigator.serviceWorker.register('sw.js', { scope: './csp-check/' }); swOk = true; await reg.unregister(); } catch (e) { swOk = e.message; }
ok('service worker can register under the policy', swOk === true, swOk);

window.__cspExpected = 3;
let evalBlocked = false;
try { eval('1'); } catch { evalBlocked = true; }
ok('eval is blocked', evalBlocked);
const inl = document.createElement('script');
inl.textContent = 'window.__inl = 1';
document.body.append(inl); await wait(100); inl.remove();
ok('inline script is blocked', window.__inl === undefined);
const box = document.createElement('div');
box.innerHTML = '<img src="nope.png" onerror="window.__xss = 1">';
document.body.append(box); await wait(400); box.remove();
ok('injected event handler is blocked', window.__xss === undefined);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
