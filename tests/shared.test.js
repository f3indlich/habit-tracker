window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
tv.lateOpen = true;
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const T = todayKey();
const X = '<img src=x onerror=alert(1)>';
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222', U3 = '33333333-3333-4333-8333-333333333333';
let n = 0;
const uuid = () => { n++; return `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`; };

const db = { lists: [], members: [], items: [], invites: [] }, net = { down: false, calls: 0 };
const TABLES = { shared_lists: 'lists', shared_members: 'members', shared_items: 'items' };
let me = U1;
const member = (list, uid = me) => db.members.some(m => m.list_id === list && m.user_id === uid);
const visibleRows = t => db[TABLES[t]].filter(r => member(t === 'shared_lists' ? r.id : r.list_id));
function Q(t) {
  const f = []; let op = 'select', payload = null;
  const b = {
    select() { return b; }, order() { return b; },
    in(c, v) { f.push(r => v.includes(r[c])); return b; }, eq(c, v) { f.push(r => r[c] === v); return b; },
    insert(rows) { op = 'insert'; payload = rows; return b; }, update(p) { op = 'update'; payload = p; return b; }, delete() { op = 'delete'; return b; },
    then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
  };
  function run() {
    net.calls++;
    if (net.down) return { data: null, error: { message: 'Failed to fetch' } };
    const rows = visibleRows(t).filter(r => f.every(fn => fn(r)));
    if (op === 'select') return { data: rows.map(r => ({ ...r })), error: null };
    if (op === 'insert') {
      for (const r of payload) {
        if (!member(r.list_id) || r.created_by !== me) return { data: null, error: { message: 'new row violates row-level security policy' } };
        if (db.items.filter(x => x.list_id === r.list_id).length >= 500) return { data: null, error: { message: 'shared_items_full' } };
        db.items.push({ id: uuid(), done: false, done_by: null, done_at: null, created_at: new Date(Date.now() + n).toISOString(), ...r });
      }
      return { data: null, error: null };
    }
    if (op === 'update') {
      for (const r of rows) {
        if (t === 'shared_lists' && r.owner_id !== me) continue;
        Object.assign(r, payload);
        if ('done' in payload) { r.done_by = payload.done ? me : null; r.done_at = payload.done ? new Date().toISOString() : null; }
      }
      return { data: null, error: null };
    }
    if (op === 'delete') {
      const kill = new Set(rows.filter(r => t !== 'shared_lists' || r.owner_id === me));
      db[TABLES[t]] = db[TABLES[t]].filter(r => !kill.has(r));
      if (t === 'shared_lists') for (const l of kill) { db.members = db.members.filter(m => m.list_id !== l.id); db.items = db.items.filter(x => x.list_id !== l.id); }
      return { data: null, error: null };
    }
  }
  return b;
}
const fake = {
  from: t => Q(t),
  async rpc(name, a) {
    net.calls++;
    if (net.down) return { data: null, error: { message: 'Failed to fetch' } };
    const mine = db.members.filter(m => m.user_id === me).length;
    if (name === 'create_shared_list') {
      if (mine >= 10) return { data: null, error: { message: 'shared_too_many_lists' } };
      const id = uuid();
      db.lists.push({ id, name: a.p_name, owner_id: me, created_at: new Date().toISOString() });
      db.members.push({ list_id: id, user_id: me, display_name: a.p_display_name });
      return { data: id, error: null };
    }
    if (name === 'create_invite') {
      const l = db.lists.find(x => x.id === a.p_list_id);
      if (!l || l.owner_id !== me) return { data: null, error: { message: 'shared_not_owner' } };
      db.invites = db.invites.filter(i => i.list_id !== l.id);
      const code = 'K7M2Q9XPAB';
      db.invites.push({ code, list_id: l.id, uses: 0 });
      return { data: code, error: null };
    }
    if (name === 'join_shared_list') {
      if (a.p_code === 'TOOMANY000') return { data: { ok: false, error: 'too_many' }, error: null };
      const inv = db.invites.find(i => i.code === a.p_code && i.uses === 0);
      if (!inv) return { data: { ok: false, error: 'bad_code' }, error: null };
      if (db.members.filter(m => m.list_id === inv.list_id).length >= 5) return { data: { ok: false, error: 'full' }, error: null };
      if (mine >= 10) return { data: { ok: false, error: 'too_many_lists' }, error: null };
      inv.uses = 1;
      db.members.push({ list_id: inv.list_id, user_id: me, display_name: a.p_display_name });
      return { data: { ok: true, list_id: inv.list_id }, error: null };
    }
    if (name === 'leave_shared_list') { db.members = db.members.filter(m => !(m.list_id === a.p_list_id && m.user_id === me)); return { data: null, error: null }; }
    if (name === 'remove_shared_member') { db.members = db.members.filter(m => !(m.list_id === a.p_list_id && m.user_id === a.p_user_id)); return { data: null, error: null }; }
    return { data: null, error: { message: 'unknown' } };
  },
};
const keep = { sb: cloud.sb, session: cloud.session };
const signIn = uid => { me = uid; cloud.sb = fake; cloud.session = { user: { id: uid } }; };
const signOut = () => { cloud.sb = keep.sb; cloud.session = keep.session; };
const onLine = v => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };
const sheetBtn = text => [...$('shBody').querySelectorAll('button')].find(b => b.textContent.trim() === text);
const form = kind => $('shBody').querySelector(`form[data-f=${kind}]`);
const items = () => [...$('shItems').querySelectorAll('.sh-row')].map(r => r.querySelector('.t-text').textContent);
const waitToast = text => until(() => $('toast').classList.contains('show') && $('toastText').textContent === text);
const paste = (el, text) => { const dt = new DataTransfer(); dt.setData('text/plain', text); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); };

{
  const raw = { lists: [{ id: U1, name: '  Покупки ', owner_id: U2 }, { id: 'bad', name: 'x', owner_id: U2 }, { id: U3, name: '', owner_id: U2 }, { id: U1, name: 'Дубль', owner_id: U2 }, ...Array.from({ length: 12 }, (_, i) => ({ id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`, name: 'L' + i, owner_id: U2 }))],
    members: { [U1]: [{ user_id: U2, display_name: 'Аня' }, { user_id: U2, display_name: 'Дубль' }, { user_id: 'x', display_name: 'Плохой' }, { user_id: U3, display_name: '   ' }] },
    items: { [U1]: [{ id: U3, text: X, done: 'да', created_by: U2, created_at: 'вчера' }, { id: U3, text: 'дубль' }, { id: U2, text: 'y'.repeat(300), done: true, done_by: U2, done_at: '2026-11-03T10:00:00Z' }] } };
  const c = normShared(raw);
  ok('cache: junk lists dropped, limit 10', c.lists.length === SHARED_LIM.lists && c.lists[0].name === 'Покупки');
  ok('cache: members cleaned', c.members[U1].length === 1 && c.members[U1][0].display_name === 'Аня');
  ok('cache: items cleaned and limited', c.items[U1].length === 2 && c.items[U1][0].done === false && c.items[U1][0].created_at === null && c.items[U1][1].text.length === SHARED_LIM.text && c.items[U1][1].done);
  ok('cache: markup stays text', c.items[U1][0].text === X);
  ok('cache: broken input is safe', normShared(null).lists.length === 0 && normShared({ lists: 'x' }).lists.length === 0);
  localStorage.setItem(SHARED_CACHE, '{bad json');
  ok('broken cache is ignored', loadSharedCache(U1) === false);
  ok('codes are read without dashes and case', normCode(' k7m2q-9xpab ') === 'K7M2Q9XPAB' && showCode('k7m2q9xpab') === 'K7M2Q-9XPAB');
}

{
  signOut(); clearShared();
  await openPage();
  ok('signed out: one chip leads to shared lists', !!$('tLists').querySelector('[data-l=shared]') && !$('tLists').querySelector('[data-sl]'));
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown);
  ok('signed out: sheet asks to sign in', $('shBody').textContent.includes('Войдите в аккаунт, чтобы вести общие списки') && !!sheetBtn('Войти'));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  await closePage();
}

{
  localStorage.removeItem(SHARED_OK);
  signIn(U1); onLine(true);
  await openPage();
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown);
  await until(() => !!form('create'));
  ok('signed in: create and join forms', !!form('create') && !!form('join') && form('create').querySelector('[name=who]').value.length > 0);
  ok('fields are 16 px and buttons 44 px', [...$('shBody').querySelectorAll('input')].every(i => parseFloat(getComputedStyle(i).fontSize) >= 16) && [...$('shBody').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44));
  form('create').querySelector('[name=name]').value = 'Покупки ' + X;
  form('create').querySelector('[name=who]').value = 'Аня ' + X.slice(0, 10);
  form('create').requestSubmit();
  await until(() => $('confirm')._shown);
  ok('consent is shown before the first list', $('cText').textContent === CONSENT && $('cYes').textContent === 'Понятно' && $('cYes').classList.contains('primary'));
  $('cYes').click();
  await until(() => db.lists.length === 1 && sh.lists.length === 1);
  ok('consent is remembered', getPref(SHARED_OK, '') === '1');
  ok('list is created with my name', db.lists[0].name === 'Покупки ' + X && db.members[0].display_name.startsWith('Аня'));
  await until(() => !!$('shBody').querySelector('.sh-list'));
  ok('names are escaped in the sheet', !document.querySelector('#shOv img') && $('shBody').querySelector('.sh-list-head span').textContent === 'Покупки ' + X);
  ok('owner sees owner actions', !!sheetBtn('Пригласить') && !!sheetBtn('Переименовать') && !!sheetBtn('Удалить список') && !sheetBtn('Выйти из списка'));
  sheetBtn('Пригласить').click();
  await until(() => !!$('shBody').querySelector('.sh-code'));
  ok('invite code is big, with a dash, valid 48 hours once', $('shBody').querySelector('.sh-code').textContent === 'K7M2Q-9XPAB' && $('shBody').textContent.includes('Действует 48 часов, один раз'));
  let copied = null; const clip = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async t => { copied = t; } } });
  sheetBtn('Скопировать').click();
  await waitToast('Код скопирован');
  ok('copy puts the code in the clipboard', copied === 'K7M2Q-9XPAB');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clip });
  ok('share text says where to enter it', inviteText('K7M2Q9XPAB') === 'Код приглашения в «Трекер привычек»: K7M2Q-9XPAB. Введите его: Задачи → Общие списки → Присоединиться');
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  const chip = $('tLists').querySelector('[data-sl]');
  ok('shared list chip with people icon', !!chip && !!chip.querySelector('svg') && chip.textContent === 'Покупки ' + X && !document.querySelector('#tLists img'));
}

{
  const lid = db.lists[0].id;
  $('tLists').querySelector(`[data-sl="${lid}"]`).click();
  await until(() => !$('tShared').hidden);
  ok('checklist view replaces the task list', visible($('tShared')) && !visible($('tTabs')) && !visible($('tListView')) && visible($('shText')));
  $('fab').click();
  ok('plus in a shared list focuses the add field', document.activeElement === $('shText') && !$('tFormOv')._shown);
  ok('add field is 16 px with a label', parseFloat(getComputedStyle($('shText')).fontSize) >= 16 && $('shText').getAttribute('aria-label') === 'Добавить запись');
  $('shText').value = 'Молоко'; $('shAdd').requestSubmit();
  await until(() => items().includes('Молоко'));
  ok('enter adds an item and clears the field', $('shText').value === '' && db.items.length === 1 && db.items[0].created_by === U1);
  ok('item shows who added it', $('shItems').querySelector('.sh-meta').textContent.startsWith('Добавил(а) Аня'));
  paste($('shText'), '- Хлеб\n• Яйца\n1. ' + X + '\n\n');
  await until(() => $('confirm')._shown);
  ok('pasted list asks first', $('cTitle').textContent === 'Добавить 3 записи?' && $('cText').textContent.startsWith('• Хлеб\n• Яйца') && !$('confirm').querySelector('img'));
  $('cYes').click();
  await until(() => db.items.length === 4 && items().length === 4);
  ok('batch adds all lines without markers', items().join('|') === 'Молоко|Хлеб|Яйца|' + X && !document.querySelector('#shItems img'));
  paste($('shText'), Array.from({ length: 60 }, (_, i) => 'п' + i).join('\n'));
  await until(() => $('confirm')._shown);
  ok('no more than 50 at once', $('cTitle').textContent === 'Добавить 50 записей?');
  $('cNo').click(); await until(() => $('confirm').hidden);
  const row = id => $('shItems').querySelector(`.sh-row[data-sid="${id}"]`);
  const milk = db.items[0].id;
  row(milk).querySelector('.t-box').click();
  await until(() => db.items[0].done && row(milk)?.classList.contains('done'));
  ok('check marks it done for everyone', db.items[0].done_by === U1);
  $('shItems').querySelector('[data-sact=done-toggle]').click();
  ok('done items fold and open', !!row(milk) && row(milk).querySelector('.sh-meta').textContent.includes('Отметил(а) Аня'));
  row(db.items[1].id).querySelector('.sh-main').click(); await until(() => $('shEditOv')._shown);
  ok('tap opens editing', $('shEditText').value === 'Хлеб' && $('shEditTitle').textContent === 'Запись');
  $('shEditText').value = 'Хлеб чёрный'; $('shEditForm').requestSubmit();
  await until(() => items().includes('Хлеб чёрный'));
  ok('edit saves for everyone', db.items[1].text === 'Хлеб чёрный');
  const egg = db.items[2].id, fg = row(egg).querySelector('.t-fg'), r0 = fg.getBoundingClientRect();
  const fire = (type, x) => fg.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 5, clientX: x, clientY: r0.top + 10 }));
  fire('pointerdown', r0.right - 10); fire('pointermove', r0.right - 60); fire('pointermove', r0.right - 120); fire('pointerup', r0.right - 120);
  await until(() => row(egg).classList.contains('open'));
  const del = row(egg).querySelector('[data-sact=del]');
  ok('swipe shows one delete capsule', row(egg).querySelectorAll('.t-acts button').length === 1 && del.textContent === 'Удалить' && del.getBoundingClientRect().height >= 44);
  await until(() => !$('shItems')._swiped);
  del.click();
  await until(() => !db.items.some(x => x.id === egg));
  ok('delete removes the item', !items().includes('Яйца'));
  $('shItems').querySelector('[data-sact=clear]').click();
  await until(() => $('confirm')._shown);
  ok('clearing done asks first', $('cTitle').textContent === 'Очистить выполненные?');
  $('cYes').click();
  await until(() => !db.items.some(x => x.done));
  ok('clear removes done items', !db.items.some(x => x.text === 'Молоко'));
}

{
  const lid = db.lists[0].id;
  state = normalize({ habits: [], log: {}, tasks: [{ id: 't1', text: 'Обычная задача', date: T, done: false, createdAt: 1, updatedAt: 1 }] }); render();
  ok('shared items stay out of the home block and badge', !$('dayTasks').textContent.includes('Хлеб') && $('tasksBadge').textContent === '1');
  ok('shared items stay out of smart lists', !Object.values(smartCounts(visTasks(), T, {})).some(x => x > 1));
  ok('shared items stay out of task search', searchTasks('Хлеб') && searchTasks('Хлеб').active.length === 0);
  const exp = sharedExport(U1);
  db.items.push({ id: uuid(), list_id: lid, text: 'Чужая запись', done: false, created_by: U2, created_at: new Date().toISOString() });
  await refresh();
  const exp2 = sharedExport(U1);
  ok('export has list names and only my items', exp2.length === 1 && exp2[0].name === db.lists[0].name && exp2[0].items.every(x => x.text !== 'Чужая запись') && exp2[0].items.length === exp[0].items.length);
  saveSharedCache();
  const before = JSON.stringify(sh.items);
  sh.items = {}; sh.lists = []; sh.uid = null;
  ok('cache restores the last data for the same user', loadSharedCache(U1) && JSON.stringify(sh.items) === before);
  ok('cache is not shown to another user', loadSharedCache(U2) === false);
}

{
  const lid = db.lists[0].id;
  onLine(false);
  await refresh();
  ok('offline: banner over saved data', visible($('shBanner')) && $('shBanner').textContent === 'Нет сети. Показаны сохранённые данные' && items().length > 0);
  $('shText').value = 'Сыр'; $('shAdd').requestSubmit();
  ok('offline: change is refused with a toast', await waitToast(OFFLINE_EDIT) && !db.items.some(x => x.text === 'Сыр'));
  onLine(true); net.down = true;
  $('shText').value = 'Сыр'; $('shAdd').requestSubmit();
  ok('network error is reported too', await waitToast(OFFLINE_EDIT));
  net.down = false;
  await refresh();
  ok('back online: banner goes away', !visible($('shBanner')));
  await closePage();
}

{
  const lid = db.lists[0].id;
  signIn(U2);
  await openPage();
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown && !!form('join'));
  form('join').querySelector('[name=code]').value = 'wrong-code';
  form('join').requestSubmit();
  ok('wrong code shows one general message', await waitToast('Код не подходит. Попросите новый код у владельца списка'));
  form('join').querySelector('[name=code]').value = 'TOOMANY000';
  form('join').requestSubmit();
  ok('too many tries is reported', await waitToast('Слишком много попыток. Попробуйте через 10 минут'));
  form('join').querySelector('[name=code]').value = 'k7m2q-9xpab';
  form('join').querySelector('[name=who]').value = 'Боря';
  form('join').requestSubmit();
  await until(() => sh.lists.length === 1 && !!$('shBody').querySelector('.sh-list'));
  ok('join works with dash and lower case', db.members.some(m => m.user_id === U2 && m.list_id === lid && m.display_name === 'Боря'));
  ok('member sees only leave', !!sheetBtn('Выйти из списка') && !sheetBtn('Пригласить') && !sheetBtn('Удалить список') && !sheetBtn('Переименовать') && !$('shBody').querySelector('[data-m=remove]'));
  ok('member list shows everyone with escaped names', $('shBody').querySelectorAll('.sh-members li').length === 2 && !document.querySelector('#shOv img'));
  db.invites = [{ code: 'FULLLIST00', list_id: lid, uses: 0 }];
  for (const u of ['c', 'd', 'e']) db.members.push({ list_id: lid, user_id: `cccccccc-cccc-4ccc-8ccc-00000000000${u}`, display_name: 'Гость' });
  signIn(U3);
  await refresh();
  form('join').querySelector('[name=code]').value = 'FULLLIST00';
  form('join').requestSubmit();
  ok('full list is reported', await waitToast('В списке уже 5 участников'));
  signIn(U2);
  await refresh();
  await until(() => !!sheetBtn('Выйти из списка'));
  sheetBtn('Выйти из списка').click();
  await until(() => $('confirm')._shown);
  ok('leaving asks first', $('cTitle').textContent === 'Выйти из списка?');
  $('cYes').click();
  await until(() => !db.members.some(m => m.user_id === U2 && m.list_id === lid) && sh.lists.length === 0);
  ok('member left the list', !$('tLists').querySelector('[data-sl]'));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  signIn(U1);
  await refresh();
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown && !!$('shBody').querySelector('.sh-list'));
  if ($('shBody').querySelector('[data-m=open]').getAttribute('aria-expanded') !== 'true') $('shBody').querySelector('[data-m=open]').click();
  await until(() => !!$('shBody').querySelector('[data-m=remove]'));
  ok('owner can remove members', $('shBody').querySelectorAll('[data-m=remove]').length === 3 && $('shBody').querySelector('[data-m=remove]').getAttribute('aria-label').startsWith('Убрать участника'));
  sheetBtn('Удалить список').click();
  await until(() => $('confirm')._shown);
  ok('deleting asks and warns about everyone', $('cTitle').textContent === 'Удалить список?' && $('cText').textContent.includes('для всех участников'));
  $('cYes').click();
  await until(() => db.lists.length === 0 && sh.lists.length === 0);
  ok('list is deleted', !$('tLists').querySelector('[data-sl]'));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  await closePage();
}

{
  ok('account deletion warns about owned shared lists', $('delOv').textContent.includes('Общие списки, которыми Вы владеете, будут удалены для всех участников.'));
  signOut(); clearShared(); onLine(true);
  delete navigator.onLine;
  localStorage.removeItem(SHARED_OK);
  state = normalize({ habits: [], log: {} }); render();
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
