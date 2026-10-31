window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const clone = v => JSON.parse(JSON.stringify(v));

ok('email matches ignoring case and spaces', emailMatches('  Anna@Mail.RU ', 'anna@mail.ru'));
ok('empty email does not match', !emailMatches('', 'anna@mail.ru') && !emailMatches('   ', 'anna@mail.ru') && !emailMatches('', ''));
ok('other email does not match', !emailMatches('anna@mail.com', 'anna@mail.ru'));
ok('user_not_found means gone', isAccountGone({ code: 'user_not_found', status: 403 }) && isAccountGone({ message: 'User from sub claim in JWT does not exist', status: 403 }));
ok('foreign key error means gone', isAccountGone({ code: '23503', message: 'insert or update on table "habit_data" violates foreign key constraint' }));
ok('network error is not gone', !isAccountGone({ message: 'Failed to fetch' }) && !isAccountGone(new TypeError('Failed to fetch')) && !isAccountGone({ name: 'AuthRetryableFetchError', status: 0 }));
ok('server error is not gone', !isAccountGone({ status: 500, message: 'Internal Server Error' }) && !isAccountGone({ status: 503, code: '503' }));
ok('empty error is not gone', !isAccountGone({}) && !isAccountGone(null) && !isAccountGone(undefined));

const db = { rows: {}, fail: null, ops: [] };
const exec = f => {
  db.ops.push(f.table === 'push_subscriptions' ? 'push-' + f.op : f.op);
  if (f.table === 'push_subscriptions') return { error: null };
  if (db.fail && f.op !== 'select') return { data: null, error: clone(db.fail) };
  const uid = f.eq.user_id, row = db.rows[uid];
  if (f.op === 'select') return { data: row ? { data: clone(row.data), version: row.version } : null, error: null };
  if (f.op === 'insert') { if (row) return { error: { code: '23505' } }; db.rows[uid] = { data: clone(f.vals.data), version: f.vals.version }; return { error: null }; }
  if (!row || row.version !== f.eq.version) return { data: [], error: null };
  Object.assign(row, { data: clone(f.vals.data), version: f.vals.version });
  return { data: [{ version: row.version }], error: null };
};
const table = name => {
  const f = { table: name, op: null, eq: {}, vals: null };
  const q = {
    select() { f.op ??= 'select'; return q; },
    eq(k, v) { f.eq[k] = v; return q; },
    maybeSingle() { return q; },
    insert(v) { f.op = 'insert'; f.vals = v; f.eq.user_id = v.user_id; return q; },
    update(v) { f.op = 'update'; f.vals = v; return q; },
    upsert(v) { f.op = 'upsert'; f.vals = v; return q; },
    delete() { f.op = 'delete'; return q; },
    then(res, rej) { return Promise.resolve().then(() => exec(f)).then(res, rej); },
  };
  return q;
};
let authCb = null, session = null, rpcFail = null, rpcDelay = 0, userErr = null;
const fake = {
  from: name => table(name),
  rpc: async name => {
    db.ops.push('rpc:' + name);
    await wait(rpcDelay);
    if (rpcFail) return { data: null, error: rpcFail };
    delete db.rows[session.user.id];
    return { data: null, error: null };
  },
  channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
  auth: {
    onAuthStateChange: cb => { authCb = cb; },
    getSession: async () => ({ data: { session } }),
    getUser: async () => userErr ? { data: { user: null }, error: userErr } : { data: { user: session?.user ?? null }, error: null },
    signOut: async () => { db.ops.push('signOut'); session = null; authCb('SIGNED_OUT', null); },
    stopAutoRefresh() {},
  },
};
const user = id => ({ user: { id, email: id + '@Example.test' }, refresh_token: 'r-' + id });
const signIn = async id => { session = user(id); authCb('SIGNED_IN', session); await wait(500); };
const toasts = [], realToast = $('toastText');
new MutationObserver(() => toasts.push(realToast.textContent)).observe(realToast, { childList: true, characterData: true, subtree: true });

state = normalize({ habits: [{ id: 'g', name: 'Чтение', icon: 'book', color: '#22c55e', created: ago(10) }], log: { [ago(2)]: { g: 1 } } });
save(); render();
await initCloud(fake);
ok('delete button hidden without account', $('setDelCard').hidden);
await signIn('u1');
ok('delete button visible when signed in', !$('setDelCard').hidden && $('setDelete').textContent.includes('Удалить аккаунт') && getComputedStyle($('setDelete')).color === getComputedStyle($('setSignOut')).color);
ok('data uploaded before delete', db.rows.u1?.version === 1);

openOverlay($('setOv')); renderSettings(); await wait(400);
$('setDelete').click(); await wait(450);
const dov = $('delOv');
ok('delete sheet opens over settings', dov._shown && $('setOv')._shown && dov.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 40)));
ok('sheet shows account email and texts', $('delAcctEmail').textContent === 'u1@Example.test' && $('delTitle').textContent === 'Удалить аккаунт?' && dov.textContent.includes('без возможности восстановления') && dov.textContent.includes('Сначала скачать копию данных'));
ok('device checkbox off by default', !$('delLocal').checked && dov.textContent.includes('приложением можно пользоваться без аккаунта'));
ok('email field is large enough for iOS', parseFloat(getComputedStyle($('delEmail')).fontSize) >= 16 && $('delEmail').type === 'email' && $('delEmail').autocomplete === 'off');
ok('mail line hidden while address is empty', PRIVACY_EMAIL !== '' || $('delMail').hidden);
ok('sheet closes by pull down', dov.querySelector('.sheet').classList.contains('pull'));

const storeBefore = localStorage.getItem(STORE), baseBefore = localStorage.getItem(BASE_STORE);
const ops0 = db.ops.length;
$('delEmail').value = 'someone@example.test';
$('delForm').requestSubmit(); await wait(300);
ok('wrong email does not delete', !db.ops.slice(ops0).some(o => o.startsWith('rpc')) && cloud.session && toasts.at(-1) === 'Почта не совпадает с почтой аккаунта', db.ops.slice(ops0));

rpcFail = { message: 'boom', code: 'P0001' };
$('delEmail').value = ' U1@example.TEST ';
toasts.length = 0;
$('delForm').requestSubmit(); await wait(400);
ok('rpc error keeps session and data', cloud.session?.user.id === 'u1' && localStorage.getItem(STORE) === storeBefore && localStorage.getItem(BASE_STORE) === baseBefore && !!findHabit('g') && dov._shown);
ok('rpc error shows message and frees button', toasts.includes(delFailText()) && !$('delGo').disabled && $('delGo').textContent === 'Удалить навсегда' && !cloud.deleting, toasts);
rpcFail = null;

push.sub = { endpoint: 'https://push.example/e1', unsubscribe: async () => true };
rpcDelay = 200;
const ops1 = db.ops.length;
$('delForm').requestSubmit(); $('delForm').requestSubmit();
await wait(60);
ok('button locked while deleting', $('delGo').disabled && $('delGo').textContent === 'Удаляем…');
await wait(600);
const seq = db.ops.slice(ops1);
ok('double tap calls rpc once', seq.filter(o => o === 'rpc:delete_my_account').length === 1, seq);
ok('push disabled before rpc', seq.indexOf('push-delete') > -1 && seq.indexOf('push-delete') < seq.indexOf('rpc:delete_my_account') && !push.sub, seq);
ok('signed out after rpc', seq.indexOf('signOut') > seq.indexOf('rpc:delete_my_account') && !cloud.session, seq);
ok('without checkbox local data stays', localStorage.getItem(STORE) === storeBefore && !!findHabit('g'));
ok('sync base and owner removed', localStorage.getItem(BASE_STORE) === null && localStorage.getItem(OWNER_STORE) === null);
ok('screen shows signed out', !$('setLogin').hidden && $('setCloudIn').hidden && $('setDelCard').hidden && authStep === 'email' && !dov._shown);
ok('success toast', toasts.at(-1) === 'Аккаунт и данные в облаке удалены', toasts.at(-1));
ok('no cloud row left', !db.rows.u1);
rpcDelay = 0;

localStorage.setItem(THEME_STORE, 'dark'); localStorage.setItem(ACCENT_STORE, 'red');
await signIn('u2');
ok('new account gets local habits', db.rows.u2?.data.habits[0]?.name === 'Чтение', db.rows.u2);
$('setDelete').click(); await wait(450);
$('delEmail').value = 'u2@example.test';
$('delLocal').checked = true;
$('delForm').requestSubmit(); await wait(500);
ok('with checkbox habits removed', !cloud.session && state.habits.length === 0 && JSON.parse(localStorage.getItem(STORE)).habits.length === 0 && !document.querySelector('#sections .habit'));
ok('with checkbox theme and accent kept', localStorage.getItem(THEME_STORE) === 'dark' && localStorage.getItem(ACCENT_STORE) === 'red');
ok('device toast mentions device', toasts.at(-1) === 'Аккаунт и данные в облаке и на этом устройстве удалены', toasts.at(-1));
localStorage.removeItem(THEME_STORE); localStorage.removeItem(ACCENT_STORE);
closeOverlay($('setOv')); await wait(300);

await signIn('u5');
Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
const ops5 = db.ops.length;
const offRes = await deleteAccount(false);
ok('offline delete does nothing', offRes === false && toasts.at(-1) === 'Нужно подключение к интернету' && cloud.session && !db.ops.slice(ops5).some(o => o.startsWith('rpc')));
delete navigator.onLine;
await fake.auth.signOut(); await wait(200);
localStorage.removeItem(OWNER_STORE);

state = normalize({ habits: [{ id: 'k', name: 'Бег', icon: 'run', color: '#f97316', created: ago(5) }], log: {} });
save(); render();
await signIn('u3');
db.rows = {};
db.fail = { code: '23503', message: 'insert or update on table "habit_data" violates foreign key constraint "habit_data_user_id_fkey"' };
toasts.length = 0;
setCount(findHabit('k'), new Date(), 1);
await wait(1500);
ok('deleted elsewhere signs out', !cloud.session && localStorage.getItem(BASE_STORE) === null);
ok('deleted elsewhere keeps local data', !!findHabit('k') && JSON.parse(localStorage.getItem(STORE)).habits[0]?.id === 'k');
ok('deleted elsewhere toast once', toasts.filter(t => t === GONE_TOAST).length === 1, toasts);
const ops3 = db.ops.length;
await wait(400);
ok('no more sync after gone', db.ops.length === ops3 && cloud.status === 'off');
db.fail = null;

userErr = { code: 'user_not_found', status: 403, message: 'User from sub claim in JWT does not exist' };
await signIn('u4');
ok('gone on start signs out without second toast', !cloud.session && toasts.filter(t => t === GONE_TOAST).length === 1 && !!findHabit('k'), toasts);
userErr = null;

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
