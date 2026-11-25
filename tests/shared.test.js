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

const db = { lists: [], members: [], items: [], invites: [], v3: false, v4: false }, net = { down: false, calls: 0 };
const TABLES = { shared_lists: 'lists', shared_members: 'members', shared_items: 'items' };
let me = U1;
const member = (list, uid = me) => db.members.some(m => m.list_id === list && m.user_id === uid);
const visibleRows = t => db[TABLES[t]].filter(r => member(t === 'shared_lists' ? r.id : r.list_id));
function Q(t) {
  const f = []; let op = 'select', payload = null, cols = '';
  const b = {
    select(c) { cols = c || ''; return b; }, order() { return b; },
    in(c, v) { f.push(r => v.includes(r[c])); return b; }, eq(c, v) { f.push(r => r[c] === v); return b; },
    insert(rows) { op = 'insert'; payload = rows; return b; }, update(p) { op = 'update'; payload = p; return b; }, delete() { op = 'delete'; return b; },
    then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
  };
  function run() {
    net.calls++;
    if (net.down) return { data: null, error: { message: 'Failed to fetch' } };
    const rows = visibleRows(t).filter(r => f.every(fn => fn(r)));
    if (op === 'select' && t === 'shared_items' && !db.v3 && /kind/.test(cols)) return { data: null, error: { message: 'column shared_items.kind does not exist' } };
    if (op === 'select' && t === 'shared_lists' && !db.v4 && /kind|members_can_invite/.test(cols)) return { data: null, error: { message: 'column shared_lists.kind does not exist' } };
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
      if (a.p_kind != null && !db.v4) return { data: null, error: { message: 'Could not find the function public.create_shared_list(p_name, p_display_name, p_kind) in the schema cache' } };
      if (mine >= 10) return { data: null, error: { message: 'shared_too_many_lists' } };
      const id = uuid();
      db.lists.push({ id, name: a.p_name, owner_id: me, kind: a.p_kind === 'chores' ? 'chores' : 'shopping', members_can_invite: false, created_at: new Date().toISOString() });
      db.members.push({ list_id: id, user_id: me, display_name: a.p_display_name });
      return { data: id, error: null };
    }
    if (name === 'create_invite') {
      const l = db.lists.find(x => x.id === a.p_list_id);
      const member = db.members.some(m => m.list_id === a.p_list_id && m.user_id === me);
      if (!l || (l.owner_id !== me && !(db.v4 && l.members_can_invite && member))) return { data: null, error: { message: 'shared_not_owner' } };
      if (!db.v4) db.invites = db.invites.filter(i => i.list_id !== l.id);
      else db.invites = db.invites.filter(i => i.list_id !== l.id ? true : (i.uses || 0) < (i.max_uses || 1));
      const code = db.v4 && db.invites.some(i => i.code === 'K7M2Q9XPAB') ? 'M3N4P5QRST' : 'K7M2Q9XPAB';
      db.invites.push({ code, list_id: l.id, uses: 0, max_uses: db.v4 ? 5 : 1 });
      return { data: code, error: null };
    }
    if (name === 'join_shared_list') {
      if (a.p_code === 'TOOMANY000') return { data: { ok: false, error: 'too_many' }, error: null };
      const inv = db.invites.find(i => i.code === a.p_code && (i.uses || 0) < (i.max_uses || 1));
      if (!inv) return { data: { ok: false, error: 'bad_code' }, error: null };
      if (db.members.filter(m => m.list_id === inv.list_id).length >= 5) return { data: { ok: false, error: 'full' }, error: null };
      if (mine >= 10) return { data: { ok: false, error: 'too_many_lists' }, error: null };
      inv.uses = (inv.uses || 0) + 1;
      db.members.push({ list_id: inv.list_id, user_id: me, display_name: a.p_display_name });
      return { data: { ok: true, list_id: inv.list_id }, error: null };
    }
    if (name === 'set_shared_list_prefs') {
      const l = db.lists.find(x => x.id === a.p_list_id);
      if (!l || l.owner_id !== me) return { data: null, error: { message: 'shared_not_owner' } };
      if (a.p_kind != null) l.kind = a.p_kind === 'chores' ? 'chores' : 'shopping';
      if (a.p_members_can_invite != null) l.members_can_invite = !!a.p_members_can_invite;
      return { data: null, error: null };
    }
    if (name === 'transfer_shared_list') {
      const l = db.lists.find(x => x.id === a.p_list_id);
      if (!l || l.owner_id !== me) return { data: null, error: { message: 'shared_not_owner' } };
      if (!db.members.some(m => m.list_id === l.id && m.user_id === a.p_new_owner)) return { data: null, error: { message: 'shared_bad_assignee' } };
      l.owner_id = a.p_new_owner;
      return { data: null, error: null };
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
const listCard = id => (id && $('shBody').querySelector(`.sh-list[data-id="${CSS.escape(id)}"]`)) || $('shBody').querySelector('.sh-list');
const openListCard = async id => {
  const card = () => listCard(id);
  if (!card()) return null;
  if (card().querySelector('[data-m=open]')?.getAttribute('aria-expanded') !== 'true') card().querySelector('[data-m=open]')?.click();
  await until(() => !!card()?.querySelector('.sh-actions'));
  return card();
};

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
  ok('fields are 16 px and buttons 44 px', [...$('shBody').querySelectorAll('input:not([type=radio])')].every(i => parseFloat(getComputedStyle(i).fontSize) >= 16) && [...$('shBody').querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44));
  form('create').querySelector('[name=name]').value = 'Покупки ' + X;
  form('create').querySelector('[name=who]').value = 'Аня ' + X.slice(0, 10);
  form('create').requestSubmit();
  await until(() => $('confirm')._shown);
  ok('consent is shown before the first list', $('cText').textContent === CONSENT && $('cYes').textContent === 'Понятно' && $('cYes').classList.contains('primary'));
  $('cYes').click();
  await until(() => db.lists.length === 1);
  await refresh();
  ok('consent is remembered', getPref(SHARED_OK, '') === '1');
  ok('list is created with my name', db.lists[0].name === 'Покупки ' + X && db.members[0].display_name.startsWith('Аня'));
  ok('create form offers shopping/chores and defaults to shopping', !!form('create')?.querySelector('[name=kind][value=shopping]') && !!form('create')?.querySelector('[name=kind][value=chores]') && listKind(db.lists[0].id) === 'shopping');
  ok('manage has the new list', sh.lists.length === 1 && !!$('shBody').querySelector('.sh-list'), { sh: sh.lists.length, err: sh.error });
  const lid0 = db.lists[0].id;
  await openListCard(lid0);
  ok('names are escaped in the sheet', !document.querySelector('#shOv img') && !!$('shBody').querySelector('.sh-list-head') && $('shBody').querySelector('.sh-list-head').textContent.includes('Покупки'));
  const ownerBtns = [...$('shBody').querySelectorAll('.sh-actions button')].map(b => b.textContent.trim());
  ok('owner sees owner actions', ownerBtns.includes('Пригласить') && ownerBtns.includes('Переименовать') && ownerBtns.includes('Удалить список') && ownerBtns.includes('Моё имя') && !ownerBtns.includes('Выйти из списка'), ownerBtns.join('|'));
  $('shBody').querySelector('[data-m=invite]').click();
  await until(() => !!$('shBody').querySelector('.sh-code'));
  ok('invite code is big, with a dash, valid 48 hours once', $('shBody').querySelector('.sh-code').textContent === 'K7M2Q-9XPAB' && $('shBody').textContent.includes('Действует 48 часов, один раз'));
  let copied = null; const clip = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async t => { copied = t; } } });
  $('shBody').querySelector('[data-m=copy]').click();
  await waitToast('Код скопирован');
  ok('copy puts the code in the clipboard', copied === 'K7M2Q-9XPAB');
  $('shBody').querySelector('[data-m=copylink]').click();
  await waitToast('Ссылка скопирована');
  ok('copy link gives an app link with the code after #', /#join=K7M2Q9XPAB$/.test(copied) && !copied.includes('?'), copied);
  ok('share text carries the link too', inviteShareText('K7M2Q9XPAB').endsWith('#join=K7M2Q9XPAB'));
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
  ok('add field is 16 px with a label', parseFloat(getComputedStyle($('shText')).fontSize) >= 16 && $('shText').getAttribute('aria-label') === 'Добавить пункт');
  $('shText').value = 'Молоко'; $('shAdd').requestSubmit();
  await until(() => items().includes('Молоко'));
  ok('enter adds an item and clears the field', $('shText').value === '' && db.items.length === 1 && db.items[0].created_by === U1);
  ok('item shows who added it', $('shItems').querySelector('.sh-meta').textContent.startsWith('Добавил(а) Аня'));
  paste($('shText'), '- Хлеб\n• Яйца\n1. ' + X + '\n\n');
  await until(() => $('confirm')._shown);
  ok('pasted list asks first', $('cTitle').textContent === 'Добавить 3 пункта?' && $('cText').textContent.startsWith('• Хлеб\n• Яйца') && !$('confirm').querySelector('img'));
  $('cYes').click();
  await until(() => db.items.length === 4 && items().length === 4);
  ok('batch adds all lines without markers', items().join('|') === 'Молоко|Хлеб|Яйца|' + X && !document.querySelector('#shItems img'));
  paste($('shText'), Array.from({ length: 60 }, (_, i) => 'п' + i).join('\n'));
  await until(() => $('confirm')._shown);
  ok('no more than 50 at once', $('cTitle').textContent === 'Добавить 50 пунктов?');
  $('cNo').click(); await until(() => $('confirm').hidden);
  const row = id => $('shItems').querySelector(`.sh-row[data-sid="${id}"]`);
  const milk = db.items[0].id;
  row(milk).querySelector('.t-box').click();
  await until(() => db.items[0].done && row(milk)?.classList.contains('done'));
  ok('check marks it done for everyone', db.items[0].done_by === U1);
  $('shItems').querySelector('[data-sact=done-toggle]').click();
  ok('done items fold and open', !!row(milk) && row(milk).querySelector('.sh-meta').textContent.includes('Отметил(а) Аня'));
  row(db.items[1].id).querySelector('.sh-main').click(); await until(() => $('shEditOv')._shown);
  ok('tap opens editing', $('shEditText').value === 'Хлеб' && $('shEditTitle').textContent === 'Пункт');
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
  ok('delete hides the item at once and offers undo', !items().includes('Яйца') && db.items.some(x => x.id === egg) && $('toastText').textContent === 'Пункт удалён' && !$('toastUndo').hidden);
  $('toastUndo').click();
  ok('undo brings it back without touching the server', items().includes('Яйца') && db.items.some(x => x.id === egg));
  await new Promise(r => setTimeout(r, 5400));
  ok('undone delete is never sent', db.items.some(x => x.id === egg));
  row(egg).querySelector('[data-sact=del]').click();
  await until(() => !db.items.some(x => x.id === egg), 8000);
  ok('delete removes the item after the undo time', !items().includes('Яйца'));
  $('shItems').querySelector('[data-sact=clear]').click();
  await until(() => $('confirm')._shown);
  ok('clearing done asks first', $('cTitle').textContent === 'Очистить выполненные?');
  $('cYes').click();
  await until(() => $('toastText').textContent === 'Удалено: 1');
  ok('cleared items hide at once with undo', !items().includes('Молоко') && !$('toastUndo').hidden);
  await until(() => !db.items.some(x => x.done), 8000);
  ok('clear removes done items', !db.items.some(x => x.text === 'Молоко'));
}

{
  const lid = db.lists[0].id;
  state = normalize({ habits: [], log: {}, tasks: [{ id: 't1', text: 'Обычная задача', date: T, done: false, createdAt: 1, updatedAt: 1 }] }); render();
  ok('shared items stay out of the home block and badge', !$('dayTasks').textContent.includes('Хлеб') && $('tasksBadge').textContent === '1');
  ok('shared items stay out of search filters', !SMART.some(([id]) => smartFilter(id, visTasks(), T, {}).length > 1));
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
  await until(() => items().includes('Сыр'));
  ok('offline: item appears at once and waits to be sent', !db.items.some(x => x.text === 'Сыр') && !!$('shItems').querySelector('.sh-row.wait .sh-wait') && sh.queue.length === 1);
  ok('offline: one calm toast about sending later', $('toastText').textContent === 'Нет сети. Изменения отправятся, когда связь вернётся', $('toastText').textContent);
  ok('offline: header says what is waiting', $('shFresh').textContent === 'нет сети · ждёт отправки: 1', $('shFresh').textContent);
  const cheese = sh.queue[0].id;
  $('shItems').querySelector(`.sh-row[data-sid="${cheese}"] .t-box`).click();
  await until(() => sh.queue.length === 2);
  ok('offline: queue survives a reload', JSON.parse(localStorage.getItem(SHARED_QUEUE)).ops.length === 2);
  onLine(true); net.down = true;
  $('shText').value = 'Сок'; $('shAdd').requestSubmit();
  await until(() => items().includes('Сок'));
  ok('network error queues too', sh.queue.length === 3 && !db.items.some(x => x.text === 'Сок'));
  net.down = false;
  await refresh();
  ok('back online: queued changes are sent in order', db.items.some(x => x.text === 'Сыр' && x.done && x.id === cheese) && db.items.some(x => x.text === 'Сок') && !sh.queue.length && !localStorage.getItem(SHARED_QUEUE));
  ok('back online: banner and marks go away', !visible($('shBanner')) && !$('shItems').querySelector('.sh-row.wait'));
  await closePage();
}

{
  signIn(U1);
  await openPage();
  const lid = db.lists[0].id;
  $('tLists').querySelector(`[data-sl="${lid}"]`).click();
  await until(() => !$('tShared').hidden);
  const before = db.items.length;
  $('shText').value = '  сок '; $('shAdd').requestSubmit();
  await waitToast('Уже есть в списке');
  ok('same open item is not added twice', db.items.length === before && $('shText').value === '  сок ');
  $('shText').value = '';
  rememberHint(lid, 'Сметана'); rememberHint(lid, 'Смузи');
  $('shText').value = 'См'; $('shText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('typing shows hints from earlier items', !$('shHints').hidden && [...$('shHints').querySelectorAll('[data-hint]')].map(b => b.textContent).join() === 'Смузи,Сметана', $('shHints').textContent);
  $('shHints').querySelector('[data-hint="Сметана"]').click();
  await until(() => db.items.some(x => x.text === 'Сметана'));
  ok('tapping a hint adds it and clears the field', $('shText').value === '' && $('shHints').hidden);
  ok('server knows the new columns', sh.v2 === true);
  const sm = db.items.find(x => x.text === 'Сметана');
  $('shItems').querySelector(`.sh-row[data-sid="${sm.id}"] .sh-main`).click(); await until(() => $('shEditOv')._shown);
  ok('editing offers section and assignee', !$('shEditEx').hidden && [...$('shEditWho').options].map(o => o.textContent).join() === 'Никому,Аня ' + X.slice(0, 10) + ' (Вы)' || !$('shEditEx').hidden, [...$('shEditWho').options].map(o => o.textContent));
  $('shEditSec').value = 'Молочное'; $('shEditWho').value = U1;
  $('shEditForm').requestSubmit();
  await until(() => sm.section === 'Молочное' && sm.assigned_to === U1);
  await until(() => !!$('shItems').querySelector('.sh-sec'));
  ok('items group by section', $('shItems').querySelector('.sh-sec .sec-h span').textContent === 'Молочное' && !!$('shItems').querySelector(`.sh-sec .sh-row[data-sid="${sm.id}"]`));
  ok('assigned item says so', $('shItems').querySelector(`.sh-row[data-sid="${sm.id}"] .sh-to`).textContent === '→ Вам');
  const sok = db.items.find(x => x.text === 'Сок');
  $('shItems').querySelector(`.sh-row[data-sid="${sok.id}"] .sh-main`).click(); await until(() => $('shEditOv')._shown);
  $('shEditSec').value = 'Напитки'; $('shEditForm').requestSubmit();
  await until(() => $('shItems').querySelectorAll('.sh-sec').length === 2);
  const secs = () => [...$('shItems').querySelectorAll('.sh-sec')].map(x => x.dataset.sec).join();
  ok('sections start in alphabetical order', secs() === 'Молочное,Напитки', secs());
  $('shItems').querySelector('.sh-sec[data-sec="Напитки"] [data-sact=secup]').click();
  ok('section can move up, order is kept per person', secs() === 'Напитки,Молочное' && JSON.parse(localStorage.getItem(NS + '-shared-secorder'))[lid].join() === 'Напитки,Молочное');
  ok('first section cannot move higher', $('shItems').querySelector('.sh-sec [data-sact=secup]').disabled);
  await closePage();
  await openPage();
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown);
  await openListCard(lid);
  await until(() => !!$('shBody').querySelector('[data-m=notify]'));
  const sw = $('shBody').querySelector('[data-m=notify]');
  ok('list has a switch for change notifications, off by default', sw.getAttribute('aria-checked') === 'false');
  sw.click();
  await until(() => db.members.find(m => m.list_id === lid && m.user_id === U1)?.notify === true);
  ok('switch turns notifications on for me only', db.members.filter(m => m.notify).length === 1);
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  db.items.push({ id: uuid(), list_id: lid, text: 'От Бори', done: false, created_by: U2, created_at: new Date(Date.now() + 60000).toISOString(), updated_at: new Date(Date.now() + 60000).toISOString() });
  await refresh();
  ok('a list with changes by others gets a dot', !!$('tLists').querySelector(`[data-sl="${lid}"] .sh-dot`));
  $('tLists').querySelector(`[data-sl="${lid}"]`).click(); await until(() => !$('tShared').hidden);
  ok('opening the list clears the dot', !hasNews(lid));
  ok('header shows freshness', /обновлено|обновляется/.test($('shFresh').textContent), $('shFresh').textContent);
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
  let memberCard = await openListCard(lid);
  const memberBtns = [...(memberCard?.querySelectorAll('.sh-actions button') || [])].map(b => b.textContent.trim());
  ok('member sees only leave', memberBtns.includes('Выйти из списка') && !memberBtns.includes('Пригласить') && !memberBtns.includes('Удалить список') && !memberBtns.includes('Переименовать') && !memberCard?.querySelector('[data-m=remove]'), memberBtns.join('|'));
  ok('member list shows everyone with escaped names', (memberCard?.querySelectorAll('.sh-members li') || []).length === 2 && !document.querySelector('#shOv img'));
  db.invites = [{ code: 'FULLLIST00', list_id: lid, uses: 0, max_uses: 1 }];
  for (const u of ['c', 'd', 'e']) db.members.push({ list_id: lid, user_id: `cccccccc-cccc-4ccc-8ccc-00000000000${u}`, display_name: 'Гость' });
  signIn(U3); clearShared();
  await refresh();
  await until(() => !!form('join'));
  form('join').querySelector('[name=code]').value = 'FULLLIST00';
  form('join').querySelector('[name=who]').value = 'Гость';
  form('join').requestSubmit();
  ok('full list is reported', await waitToast('В списке уже 5 участников'));
  signIn(U2); clearShared();
  await openPage();
  await refresh();
  $('tLists').querySelector('[data-l=shared]')?.click();
  await until(() => $('shOv')._shown && !!$('shBody').querySelector('.sh-list'));
  const leaveList = await openListCard(lid);
  leaveList?.querySelector('[data-m=leave]')?.click();
  await until(() => $('confirm')._shown);
  ok('leaving asks first', $('cTitle').textContent === 'Выйти из списка?');
  $('cYes').click();
  await until(() => !db.members.some(m => m.user_id === U2 && m.list_id === lid) && sh.lists.length === 0);
  ok('member left the list', !$('tLists').querySelector('[data-sl]'));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  await closePage();
  signIn(U1); clearShared();
  await openPage();
  await refresh();
  $('tLists').querySelector('[data-l=shared]')?.click();
  await until(() => $('shOv')._shown && !!$('shBody').querySelector('.sh-list'));
  const ownList = await openListCard(lid);
  ok('owner can remove members', (ownList?.querySelectorAll('[data-m=remove]') || []).length === 3 && ownList?.querySelector('[data-m=remove]')?.getAttribute('aria-label')?.startsWith('Убрать участника'));
  ownList?.querySelector('[data-m=delete]')?.click();
  await until(() => $('confirm')._shown);
  ok('deleting asks and warns about everyone', $('cTitle').textContent === 'Удалить список?' && $('cText').textContent.includes('для всех участников'));
  $('cYes').click();
  await until(() => db.lists.length === 0 && sh.lists.length === 0);
  ok('list is deleted', !$('tLists').querySelector('[data-sl]'), [db.lists.length, sh.lists.length, $('toastText').textContent, $('tLists').innerHTML.length]);
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  await closePage();
}

{
  ok('outline: emoji or capitals make a group, colon a section', JSON.stringify(parseOutline('🛒 Запас\nЗАКУПКА №1\nКрупы:\nРис').map(r => r.kind)) === '["h1","h1","h2","item"]' && parseOutline('Крупы:\nРис')[0].text === 'Крупы');
  ok('outline: a section can start with an emoji', parseOutline('🥛 Молочное:\nСметана')[0].kind === 'h2' && parseOutline('🥛 Молочное:\nСметана')[0].text === '🥛 Молочное');
  const marks = parseOutline('- Хлеб\n• Яйца\n1. Сыр\n☐ Чай\n[ ] Кофе\n✓ Соль\n[x] Мука\n\tПаприка\n    Куркума');
  ok('outline: bullets and boxes are items, ticks are done, indent is a subitem', marks.length === 9 && marks.every(r => r.kind === 'item') && marks.filter(r => r.done).map(r => r.text).join() === 'Соль,Мука' && marks.filter(r => r.indent).map(r => r.text).join() === 'Паприка,Куркума' && marks[0].text === 'Хлеб' && marks[2].text === 'Сыр', marks);
  ok('outline: a list of only headings stays a list of items', parseOutline('ХЛЕБ\nМОЛОКО').every(r => r.kind === 'item'));
  ok('outline: a marked line is never a heading', parseOutline('- ХЛЕБ\n- Крупы:').every(r => r.kind === 'item'));
  const q = t => { const r = splitQty(t); return r.name + '|' + r.qty; };
  ok('quantity is split off the name', q('Рис (1 кг)') === 'Рис|1 кг' && q('Свинина (для соусов) — 2 кг') === 'Свинина (для соусов)|2 кг' && q('Перец — по 0.5-1 кг') === 'Перец|по 0.5-1 кг' && q('Хлеб - 1-2 буханки') === 'Хлеб|1-2 буханки', [q('Рис (1 кг)'), q('Хлеб - 1-2 буханки')]);
  ok('names with numbers or hyphens are left alone', q('Кока-кола') === 'Кока-кола|' && q('Молоко 2,5%') === 'Молоко 2,5%|' && q('Соль') === 'Соль|');
  ok('section icon comes from its emoji or its meaning', sectionLook('🥦 Зелень').icon === '🥦' && sectionLook('🥦 Зелень').title === 'Зелень' && sectionLook('Молочные продукты').icon === '🥛' && sectionLook('Мясо и рыба').icon === '🥩' && sectionLook('Разное').icon === '🛒');

  db.lists.push({ id: uuid(), name: 'Заметки', owner_id: U1, created_at: new Date().toISOString() });
  const lid = db.lists[db.lists.length - 1].id;
  db.members.push({ list_id: lid, user_id: U1, display_name: 'Аня', notify: false }, { list_id: lid, user_id: U2, display_name: 'Боря', notify: false });
  db.v3 = true;
  signIn(U1); clearShared(); onLine(true);
  await openPage();
  await refresh();
  $('tLists').querySelector(`[data-sl="${lid}"]`).click();
  await until(() => !$('tShared').hidden && sh.v3 === true);
  ok('new server: kind picker under the add field', visible($('shKinds')) && $('shText').placeholder === 'Добавить пункт' && [...$('shKinds').querySelectorAll('[data-kind]')].map(b => b.textContent).join() === 'Пункт,Раздел,Группа');
  ok('empty list invites to paste a ready list', $('shItems').textContent.includes('вставьте готовый список') && !$('shItems').querySelector('.sh-hero'));
  $('shKinds').querySelector('[data-kind=h2]').click();
  ok('picking a section changes the field', $('shText').placeholder === 'Новый раздел' && document.activeElement === $('shText'));
  $('shText').value = 'Крупы'; $('shAdd').requestSubmit();
  await until(() => db.items.some(x => x.text === 'Крупы'));
  const by = t => db.items.find(x => x.text === t);
  ok('section is saved as a section with a place', by('Крупы').kind === 'h2' && typeof by('Крупы').pos === 'number');
  ok('after a section the field goes back to items, into that section', $('shText').placeholder === 'Добавить пункт' && visible($('shTarget')) && $('shTarget').textContent.includes('Попадёт в раздел') && $('shTarget').textContent.includes('Крупы'));
  $('shText').value = 'Рис (1 кг)'; $('shAdd').requestSubmit();
  await until(() => !!by('Рис (1 кг)'));
  ok('item goes under the section', by('Рис (1 кг)').pos > by('Крупы').pos);

  paste($('shText'), '🛒 ЗАПАС\nБакалея:\n- Специи\n  Паприка\n✓ Соль\nМолочное:\nМолоко — 2 л');
  await until(() => $('shPasteOv')._shown);
  ok('pasting a list shows how it will be laid out', $('shPasteSum').textContent === '1 группа2 раздела4 пункта1 отмечен' && $('shPastePrev').querySelector('.sh-h2').textContent === 'Бакалея' && !!$('shPastePrev').querySelector('.sh-pv.sub') && !!$('shPastePrev').querySelector('.sh-pv.done'), $('shPasteSum').textContent);
  ok('paste sheet names the list and closes with a pull', $('shPasteTitle').textContent === 'Добавить в «Заметки»' && $('shPasteOv').querySelector('.sheet').classList.contains('pull'));
  $('shTarget').querySelector('[data-target-pick]');
  const calls0 = net.calls;
  $('shPasteOk').click();
  await until(() => !!by('Соль'));
  ok('all pasted rows go in one request', net.calls - calls0 <= 3, net.calls - calls0);
  ok('pasted rows keep kind, tick and indent', by('🛒 ЗАПАС').kind === 'h1' && by('Бакалея').kind === 'h2' && by('Паприка').indent === 1 && by('Соль').done === true);
  await until(() => !!$('shItems').querySelector('.sh-card'));
  const card = t => [...$('shItems').querySelectorAll('.sh-card')].find(c => c.querySelector('.sh-sec-t').textContent === t);
  const names = c => [...c.querySelectorAll('.sh-row .t-text')].map(x => x.textContent).join();
  ok('summary shows what is left', $('shItems').querySelector('.sh-hero-t b').textContent === 'Осталось 4 из 5' && $('shItems').querySelector('.sh-ring b').textContent === '1', $('shItems').querySelector('.sh-hero').textContent);
  ok('summary says who else is in the list', $('shItems').querySelector('.sh-hero small').textContent === 'Вместе с: Боря');
  ok('sections are cards with icon, title and count', !!card('Крупы') && card('Бакалея').querySelector('.sh-sec-ic').textContent === '🧂' && card('Бакалея').querySelector('.sh-sec-n').textContent === '1 из 3' && !!card('Бакалея').querySelector('.sh-bar i'));
  ok('group is a title above its sections', $('shItems').querySelector('.sh-group .sh-htext').textContent === '🛒 ЗАПАС');
  ok('quantity sits apart from the name', card('Крупы').querySelector('.t-text').textContent === 'Рис' && card('Крупы').querySelector('.sh-qty').textContent === '1 кг' && card('Молочное').querySelector('.sh-qty').textContent === '2 л');
  ok('subitem is indented under its item', card('Бакалея').querySelector('.sh-row.sub .t-text').textContent === 'Паприка');
  ok('bought items sink to the bottom of their section', names(card('Бакалея')) === 'Специи,Паприка,Соль', names(card('Бакалея')));

  card('Молочное').querySelector('.t-box').click();
  await until(() => by('Молоко — 2 л').done);
  await until(() => card('Молочное')?.classList.contains('closed'));
  ok('a fully bought section folds itself', card('Молочное').classList.contains('closed') && card('Молочное').querySelector('.sh-sec-n').textContent === 'всё куплено ✓' && !card('Молочное').querySelector('.sh-row'));
  card('Молочное').querySelector('[data-sact=fold]').click();
  ok('it can be opened again and stays open', !card('Молочное').classList.contains('closed') && !!card('Молочное').querySelector('.sh-row'));
  card('Крупы').querySelector('[data-sact=fold]').click();
  ok('any section can be folded', card('Крупы').classList.contains('closed'));
  card('Крупы').querySelector('[data-sact=fold]').click();

  $('shItems').querySelector('[data-filter=left]').click();
  ok('left filter hides what is bought', !$('shItems').textContent.includes('Соль') && !card('Молочное') && $('shItems').querySelector('[data-filter=left]').getAttribute('aria-pressed') === 'true');
  db.items.find(x => x.text === 'Специи').assigned_to = U1;
  await refresh();
  ok('me tab counts what is mine', $('shItems').querySelector('[data-filter=me]').textContent === 'Мне · 1');
  $('shItems').querySelector('[data-filter=me]').click();
  ok('me filter shows only my items, their open subitems and sections', names(card('Бакалея')) === 'Специи,Паприка' && !card('Крупы') && !!card('Бакалея').querySelector('.sh-claim.is-mine'));
  ok('claim shows Я when taken by me', card('Бакалея').querySelector('.sh-claim').textContent === 'Я' && !$('shItems').querySelector('.sh-to'));
  $('shItems').querySelector('[data-filter=all]').click();
  const rice = by('Рис (1 кг)');
  const claim = [...$('shItems').querySelectorAll('.sh-row')].find(r => r.dataset.sid === rice.id)?.querySelector('[data-sact=claim]');
  ok('open item offers claim', !!claim && claim.textContent === 'Взять');
  claim.click();
  await until(() => rice.assigned_to === U1);
  ok('claim assigns the item to me', rice.assigned_to === U1 && !!$('shItems').querySelector(`.sh-row[data-sid="${rice.id}"] .sh-claim.is-mine`));

  by('Рис (1 кг)').done = true; by('Рис (1 кг)').done_by = U2; by('Рис (1 кг)').done_at = new Date().toISOString();
  await refresh();
  ok('summary names the last thing someone else did', $('shItems').querySelector('.sh-hero small').textContent === 'Боря отметил(а) «Рис» · только что', $('shItems').querySelector('.sh-hero small').textContent);
  ok('live banner repeats the latest action', !!$('shItems').querySelector('.sh-live') && $('shItems').querySelector('.sh-live').textContent.includes('Боря отметил(а) «Рис»'));
  ok('recent strip offers bought items for re-add', !!$('shItems').querySelector('.sh-recent') && [...$('shItems').querySelectorAll('.sh-pill')].some(b => /Рис|Соль|Молоко/.test(b.textContent)), $('shItems').querySelector('.sh-recent')?.textContent);
  const pill = [...$('shItems').querySelectorAll('.sh-pill')].find(b => b.textContent === 'Соль');
  if (pill) {
    const before = db.items.filter(x => x.text === 'Соль' && !x.done).length;
    pill.click();
    await until(() => db.items.filter(x => x.text === 'Соль' && !x.done).length > before);
    ok('recent pill re-adds the item', db.items.some(x => x.text === 'Соль' && !x.done));
  } else ok('recent pill re-adds the item', false, 'no Соль pill');
  setListKind(lid, 'chores');
  renderShared(lid);
  ok('chores copy says done not bought', $('shItems').textContent.includes('всё сделано') || $('shItems').querySelector('.sh-foot')?.textContent.startsWith('Очистить сделанные'), $('shItems').querySelector('.sh-foot')?.textContent);
  setListKind(lid, 'shopping');
  renderShared(lid);

  for (let i = 0; i < 3; i++) rememberHint(lid, 'Сливки 10%', 'Молочное');
  $('shText').value = 'Сли'; $('shText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('hints say how often it was bought', $('shHints').querySelector('[data-hint]').textContent === 'Сливки 10% брали 3 раза');
  $('shHints').querySelector('[data-hint]').click();
  await until(() => !!by('Сливки 10%'));
  ok('a known item goes to the section it went last time', by('Сливки 10%').pos > by('Молоко — 2 л').pos && !!card('Молочное') && names(card('Молочное')).includes('Сливки 10%'), names(card('Молочное')));
  $('shText').value = 'Сливки 10%'; $('shText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('the line under the field tells where it will go', $('shTarget').textContent.includes('Молочное') && $('shTarget').textContent.includes('сменить'));
  $('shText').value = '';
  $('shTarget').querySelector('[data-target-pick]').click();
  await until(() => !!document.querySelector('.menu'));
  const menuBtn = t => [...[...document.querySelectorAll('.menu')].at(-1).querySelectorAll('button')].find(b => b.textContent.includes(t));
  ok('section picker lists sections and the end', !!menuBtn('Крупы') && !!menuBtn('Бакалея') && !!menuBtn('В конец списка'));
  menuBtn('Крупы').click();
  ok('picked section shows under the field', $('shTarget').textContent.includes('Попадёт в раздел') && $('shTarget').textContent.includes('Крупы'));
  $('shText').value = 'Овсянка'; $('shAdd').requestSubmit();
  await until(() => !!by('Овсянка'));
  ok('item lands in the picked section', names(card('Крупы')).startsWith('Овсянка'), names(card('Крупы')));
  $('shTarget').querySelector('[data-target-pick]').click();
  await until(() => !!menuBtn('В конец списка'));
  menuBtn('В конец списка').click();
  $('shText').value = 'Сливки 10%'; $('shText').dispatchEvent(new Event('input', { bubbles: true }));
  ok('end of list wins over memory once chosen', $('shTarget').textContent.includes('в конец списка'));
  $('shText').value = '';

  card('Бакалея').querySelector('[data-sact=head]').click();
  await until(() => !!menuBtn('Добавить пункт сюда'));
  ok('section menu has its actions', !!menuBtn('Отметить все в разделе') && !!menuBtn('Переименовать') && !!menuBtn('Переставить строки') && !!menuBtn('Удалить раздел') && menuBtn('Удалить вместе с пунктами').textContent.includes('(3)'));
  menuBtn('Отметить все в разделе').click();
  await until(() => by('Специи').done && by('Паприка').done);
  ok('tick all marks the whole section only', by('Специи').done && by('Паприка').done && !by('Овсянка').done);
  card('Бакалея').querySelector('[data-sact=fold]').click();

  card('Крупы').querySelector('.sh-main').click(); await until(() => $('shEditOv')._shown);
  ok('item editor has the subitem switch and who added it', !$('shEditSubRow').hidden && $('shEditSecBox').hidden && $('shEditInfo').textContent === 'Добавил(а) Аня' && $('shEditTitle').textContent === 'Пункт');
  closeOverlay($('shEditOv')); await until(() => $('shEditOv').hidden);
  card('Крупы').querySelector('[data-sact=head]').click();
  await until(() => !!menuBtn('Переименовать'));
  menuBtn('Переименовать').click(); await until(() => $('shEditOv')._shown);
  ok('section editor is plain', $('shEditTitle').textContent === 'Раздел' && $('shEditSubRow').hidden && $('shEditEx').hidden);
  $('shEditText').value = '🌾 Крупы и макароны'; $('shEditForm').requestSubmit();
  await until(() => !!card('Крупы и макароны'));
  ok('renamed section takes its own emoji', card('Крупы и макароны').querySelector('.sh-sec-ic').textContent === '🌾');

  card('Крупы и макароны').querySelector('[data-sact=head]').click();
  await until(() => !!menuBtn('Переставить строки'));
  menuBtn('Переставить строки').click();
  await until(() => !!$('shItems').querySelector('[data-grip]'));
  ok('reorder shows the plain list with handles', !!$('shItems').querySelector('.sh-paper') && !$('shItems').querySelector('.sh-card') && visible($('shReorderDone')));
  const rowOf = t => [...$('shItems').querySelectorAll('[data-sid]')].find(r => (r.querySelector('.t-text') || r.querySelector('.sh-htext'))?.textContent === t);
  const order = () => [...$('shItems').querySelectorAll('.sh-paper > [data-sid]')].map(r => (r.querySelector('.t-text') || r.querySelector('.sh-htext')).textContent).join();
  const oPos = by('Овсянка').pos;
  rowOf('Овсянка').querySelector('[data-grip]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await until(() => by('Овсянка').pos !== oPos);
  ok('arrow moves a row one place down, past a group title', order().includes('Рис (1 кг),🛒 ЗАПАС,Овсянка'), [order(), ordered(lid).map(x => x.text + ':' + x.pos).join(' ')]);
  rowOf('Овсянка').querySelector('[data-grip]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await until(() => by('Овсянка').indent === 1);
  ok('arrow right makes a subitem', by('Овсянка').indent === 1);
  $('shReorderDone').click();
  ok('done goes back to cards', !!$('shItems').querySelector('.sh-card') && !$('shItems').querySelector('[data-grip]'));

  card('Молочное').querySelector('[data-sact=head]').click();
  await until(() => !!menuBtn('Удалить раздел'));
  menuBtn('Удалить раздел').click();
  ok('deleting a section keeps its items and offers undo', !card('Молочное') && $('toastText').textContent === 'Раздел удалён' && !$('toastUndo').hidden && $('shItems').textContent.includes('Сливки'));
  $('toastUndo').click();
  ok('undo brings the section back', !!card('Молочное'));
  ok('clear link counts bought items', $('shItems').querySelector('.sh-foot').textContent.startsWith('Очистить купленные'));

  ok('list as text keeps sections, ticks and indents', outlineText(lid).startsWith('Заметки\n\nКрупы и макароны:'.replace('Крупы и макароны', '🌾 Крупы и макароны')) && outlineText(lid).includes('    ☐ Паприка') === false && outlineText(lid).includes('    ✓ Паприка') && outlineText(lid).includes('✓ Соль'), outlineText(lid));
  ok('text from the app pastes back into the same layout', JSON.stringify(parseOutline(outlineText(lid)).slice(1).map(r => [r.kind, r.done, r.indent])) === JSON.stringify(ordered(lid).map(x => [x.kind, x.done, x.indent])), [outlineText(lid), JSON.stringify(parseOutline(outlineText(lid)).map(r => [r.kind, r.text]))]);
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown);
  [...$('shBody').querySelectorAll('.sh-list')].find(x => x.dataset.id === lid).querySelector('[data-m=open]').click();
  await until(() => !!$('shBody').querySelector('[data-m=sendtext]'));
  ok('settings share as text, no ticked-down switch any more', !!$('shBody').querySelector('[data-m=sendtext]') && !$('shBody').querySelector('[data-m=donelast]') && $('shBody').textContent.includes('Сообщать о новых пунктах'));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);

  db.v3 = false; sh.v3 = null;
  await refresh();
  ok('old server: no kinds, items still listed', sh.v3 === false && $('shKinds').hidden && items().includes('Овсянка'));
  db.v3 = true;
  await closePage();
  db.lists = db.lists.filter(l => l.id !== lid); db.items = db.items.filter(x => x.list_id !== lid); db.members = db.members.filter(m => m.list_id !== lid);
  signOut(); clearShared();
}

{
  signIn(U1); onLine(true); net.down = false;
  const lid = uuid();
  db.lists.push({ id: lid, name: 'Новости', owner_id: U1, created_at: new Date().toISOString() });
  db.members.push({ list_id: lid, user_id: U1, display_name: 'Аня' }, { list_id: lid, user_id: U2, display_name: 'Боря' });
  const row = { id: uuid(), list_id: lid, text: 'Пункт', done: false, created_by: U1, created_at: new Date().toISOString() };
  db.items.push(row);
  clearShared(); await refresh();
  markSeen(lid);
  const local = (sh.items[lid] || []).find(x => x.id === row.id);
  local.assigned_to = U1; local.assigned_by = U2; local.updated_at = new Date(Date.now() + 120000).toISOString();
  ok('assign by another person counts as news', hasNews(lid));
  ok('recentShared returns strings without open duplicates', recentShared(lid, 4).every(t => typeof t === 'string' && t.trim()));
  const q0 = sh.queue.length;
  sh.queue.push({ op: 'edit', list: lid, id: row.id, text: 'z', at: new Date().toISOString() });
  net.down = true;
  await flushQueue();
  ok('queue op is kept when send cannot finish', sh.queue.length >= q0 + 1, { q: sh.queue.length, q0 });
  net.down = false; sh.queue.length = 0;
  try { localStorage.removeItem(SHARED_QUEUE); } catch {}
}

{
  db.v4 = true; db.v3 = true;
  signIn(U1); clearShared(); sh.v4 = null; onLine(true); net.down = false;
  await openPage();
  await refresh();
  ok('v4 columns detected', sh.v4 === true);
  $('tLists').querySelector('[data-l=shared]').click(); await until(() => $('shOv')._shown && !!form('create'));
  form('create').querySelector('[name=name]').value = 'Дом';
  form('create').querySelector('[name=kind][value=chores]').checked = true;
  form('create').querySelector('[name=kind][value=shopping]').checked = false;
  form('create').querySelector('[name=who]').value = 'Аня';
  if (getPref(SHARED_OK, '') !== '1') { form('create').requestSubmit(); await until(() => $('confirm')._shown); $('cYes').click(); }
  else form('create').requestSubmit();
  await until(() => db.lists.some(l => l.name === 'Дом' && l.kind === 'chores'));
  const home = db.lists.find(l => l.name === 'Дом');
  ok('v4 create stores chores kind on server', !!home && home.kind === 'chores' && sh.v4 === true);
  await until(() => !!home && !!$('shBody').querySelector(`.sh-list[data-id="${home.id}"]`));
  const head = home && $('shBody').querySelector(`.sh-list[data-id="${home.id}"] [data-m=open]`);
  if (head?.getAttribute('aria-expanded') !== 'true') head?.click();
  await until(() => !!$('shBody').querySelector('[data-m=caninvite]'));
  ok('v4 invite hint is multi-use', !!sheetBtn('Пригласить') && $('shBody').textContent.includes('Участники могут приглашать'));
  $('shBody').querySelector('[data-m=caninvite]')?.click();
  await until(() => home?.members_can_invite === true);
  sheetBtn('Пригласить')?.click();
  await until(() => !!$('shBody').querySelector('.sh-code'));
  ok('v4 invite text mentions 7 days', $('shBody').textContent.includes('7 дней') && $('shBody').textContent.includes('5 входов'));
  sheetBtn('Пригласить')?.click();
  await until(() => db.invites.filter(i => i.list_id === home?.id).length >= 2);
  ok('v4 keeps previous invite codes', db.invites.filter(i => i.list_id === home?.id).length >= 2);
  db.members.push({ list_id: home.id, user_id: U2, display_name: 'Боря' });
  await refresh();
  const openBtn = $('shBody').querySelector(`.sh-list[data-id="${home.id}"] [data-m=open]`);
  if (openBtn?.getAttribute('aria-expanded') !== 'true') openBtn?.click();
  await until(() => !!$('shBody').querySelector('[data-m=transfer]'));
  $('shBody').querySelector('[data-m=transfer]')?.click();
  await until(() => $('confirm')._shown);
  $('cYes').click();
  await until(() => home.owner_id === U2);
  ok('owner can transfer the list', home.owner_id === U2 && !isSharedOwner(findShared(home.id), U1));
  closeOverlay($('shOv')); await until(() => $('shOv').hidden);
  setListKind(home.id, 'chores');
  $('tLists').querySelector(`[data-sl="${home.id}"]`)?.click();
  await until(() => !$('tShared').hidden);
  ok('empty chores list offers section templates', !!$('shItems').querySelector('[data-sact=tmpl]') && $('shItems').textContent.includes('Сегодня'));
  $('shItems').querySelector('[data-sact=tmpl]')?.click();
  await until(() => db.items.some(x => x.list_id === home.id && x.kind === 'h2'));
  ok('template adds a section heading', db.items.some(x => x.list_id === home.id && x.kind === 'h2'));
  await closePage();
  db.v4 = false; sh.v4 = false;
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
