window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const tick = () => new Promise(r => setTimeout(r, 16));
const until = async (f, ms = 3000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; await tick(); } return true; };
const T = todayKey(), shift = n => key(addDays(parseKey(T), n));
const A = (id, extra = {}) => ({ id, text: 'Дело ' + id, done: false, createdAt: 1, updatedAt: 1, ...extra });
const show = s => { state = normalize(s); viewDate = new Date(); render(); };
const visible = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const ids = l => l.map(t => t.id).sort().join();
const openPage = async () => { openTasks(); await until(() => $('tasksOv')._shown); };
const closePage = async () => { closeOverlay($('tasksOv')); await until(() => $('tasksOv').hidden); };

const set = () => [
  A('t0', { date: T }), A('t7', { date: shift(7) }), A('t8', { date: shift(8) }), A('l1', { date: shift(-1) }),
  A('d3', { due: shift(3) }), A('d9', { date: shift(20), due: shift(9) }), A('dl', { due: shift(-1) }),
  A('im', { important: true }), A('nd'), A('rp', { date: shift(2), rep: { m: 'cal', n: 1, u: 'd' }, lastDone: shift(-2) }),
  A('pv', { date: T, private: true }), A('w1', { done: true, doneAt: shift(-6) }), A('w2', { done: true, doneAt: shift(-7) }),
  A('ar', { date: shift(1), archivedAt: T }), A('rd', { date: shift(5), rep: { m: 'cal', n: 1, u: 'w' }, lastDone: shift(-9) }),
];

{
  const f = (id, o = {}) => ids(smartFilter(id, set(), T, o));
  ok('soon: today to +7 by day or due, no overdue', f('soon') === ids([{ id: 't0' }, { id: 't7' }, { id: 'd3' }, { id: 'rp' }, { id: 'rd' }]), f('soon'));
  ok('with due: only tasks with a due, earliest first', smartFilter('due', set(), T).map(t => t.id).join() === 'dl,d3,d9');
  ok('important', f('imp') === 'im');
  ok('overdue by date or due', f('late') === 'dl,l1');
  ok('no date: neither when nor due', f('nodate') === 'im,nd');
  ok('repeating', f('rep') === 'rd,rp');
  ok('private hidden while locked', f('priv') === '' && !smartFilter('soon', set(), T).some(t => t.id === 'pv'));
  ok('private shown after unlock', f('priv', { unlocked: true }) === 'pv' && smartFilter('soon', set(), T, { unlocked: true }).some(t => t.id === 'pv'));
  ok('done in a week: last 7 days, with repeats done', f('week') === 'rp,w1', f('week'));
  ok('archived never shows', !Object.values(smartCounts(set(), T, { unlocked: true })).some((n, i) => false) && !SMART.some(([id]) => smartFilter(id, set(), T, { unlocked: true }).some(t => t.id === 'ar')));
  const c = smartCounts(set(), T), cu = smartCounts(set(), T, { unlocked: true });
  ok('counts', c.soon === 5 && c.due === 3 && c.late === 2 && c.priv === 0 && cu.priv === 1 && cu.soon === 6);
}

{
  show({ habits: [], log: {}, taskLists: [{ id: 'home', name: 'Дом', color: '#22c55e' }], tasks: [...set(), A('h1', { date: T, list: 'home' }), A('h2', { important: true, list: 'home' })] });
  await openPage();
  ok('slices button is in the header', visible($('tSmartBtn')) && $('tSmartBtn').getAttribute('aria-label') === 'Срезы' && $('tSmartBtn').getBoundingClientRect().height >= 44);
  $('tSmartBtn').click(); await until(() => $('tSmartOv')._shown);
  const rows = () => [...$('tsmItems').querySelectorAll('.t-smart-row')].map(b => b.textContent);
  ok('sheet lists slices with counts, no private while locked', rows().join('|') === 'Скоро6|Со сроком3|Важные2|Просрочено2|Без даты3|Повторяющиеся2|Выполнено за неделю2', rows());
  ok('rows are big enough', [...$('tsmItems').querySelectorAll('.t-smart-row')].every(b => b.getBoundingClientRect().height >= 44));
  $('tsmItems').querySelector('[data-sm=soon]').click(); await until(() => $('tSmartOv').hidden);
  ok('slice shows a bar and hides list/month switch', visible($('tSmartBar')) && $('tSmartName').textContent === 'Срез: Скоро' && !visible($('tTabs')) && $('tSmartBtn').getAttribute('aria-pressed') === 'true');
  ok('slice list is grouped by day', [...$('tItems').querySelectorAll('.sec-h span:first-child')][0].textContent === 'Сегодня' && $('tItems').querySelectorAll('.t-row').length === 6);
  $('tLists').querySelector('[data-l=home]').click();
  ok('slice works inside the chosen list', $('tItems').querySelectorAll('.t-row').length === 1 && !!$('tItems').querySelector('.t-row[data-id=h1]') && visible($('tSmartBar')));
  $('tLists').querySelector('[data-l=all]').click();
  $('tSearchBtn').click();
  $('tsText').value = 'Дело t'; $('tsText').dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => !$('tsResults').hidden);
  ok('search goes inside the slice', [...$('tsResults').querySelectorAll('.t-sres')].map(b => b.dataset.id).sort().join() === 't0,t7', [...$('tsResults').querySelectorAll('.t-sres')].map(b => b.dataset.id));
  $('tsClose').click();
  $('tSmartOff').click();
  ok('cross brings the normal view back', !visible($('tSmartBar')) && visible($('tTabs')) && !!$('tItems').querySelector('.t-group.late'));
  setSmart('late');
  await closePage(); await openPage();
  ok('slice resets when leaving the screen', !tv.smart && !visible($('tSmartBar')));
  unlocked = true; renderTasks();
  $('tSmartBtn').click(); await until(() => $('tSmartOv')._shown);
  ok('private slice appears after unlock', rows().includes('Личные1'));
  $('tsmItems').querySelector('[data-sm=priv]').click(); await until(() => $('tSmartOv').hidden);
  ok('private slice shows private tasks', !!$('tItems').querySelector('.t-row[data-id=pv]'));
  lockNow();
  ok('locking drops the private slice', !tv.smart && !$('tItems').querySelector('.t-row[data-id=pv]') && !visible($('tSmartBar')));
  show({ habits: [], log: {}, tasks: Array.from({ length: 45 }, (_, i) => A('m' + i, { important: true })) });
  setSmart('imp');
  ok('slice shows 20 and more', $('tItems').querySelectorAll('.t-row').length === 20 && $('tItems').querySelector('[data-act=smart-more]').textContent === 'Показать ещё 20');
  $('tItems').querySelector('[data-act=smart-more]').click();
  ok('more adds 20', $('tItems').querySelectorAll('.t-row').length === 40);
  show({ habits: [], log: {}, tasks: [] });
  setSmart('imp');
  ok('empty slice says so', $('tItems').textContent === 'В этом срезе нет задач');
  setSmart(null);
  await closePage();
}

{
  const sw = () => [...$('tSmartSet').querySelectorAll('.switch')];
  renderDayTasks();
  ok('settings list a switch per slice, private only when unlocked', sw().length === SMART.length - 1 && sw().every(b => b.getAttribute('aria-checked') === 'true' && b.getAttribute('aria-labelledby')));
  $('tSmartSet').querySelector('[data-sm=nodate]').click();
  ok('switch turns a slice off', getPref(SMART_STORE + 'nodate', '') === '0' && $('tSmartSet').querySelector('[data-sm=nodate]').getAttribute('aria-checked') === 'false');
  show({ habits: [], log: {}, tasks: [A('n1')] });
  await openPage();
  $('tSmartBtn').click(); await until(() => $('tSmartOv')._shown);
  ok('hidden slice is not in the sheet', !$('tsmItems').querySelector('[data-sm=nodate]'));
  closeOverlay($('tSmartOv')); await until(() => $('tSmartOv').hidden);
  $('tSmartSet').querySelector('[data-sm=nodate]').click();
  localStorage.removeItem(SMART_STORE + 'nodate');
  await closePage();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, important: true })] });
  await openPage();
  setSmart('imp');
  ok('slice rows are escaped', !document.querySelector('#tItems img'));
  $('tSmartBtn').click(); await until(() => $('tSmartOv')._shown);
  ok('slice sheet is escaped', !document.querySelector('#tSmartOv img'));
  closeOverlay($('tSmartOv')); await until(() => $('tSmartOv').hidden);
  setSmart(null);
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
