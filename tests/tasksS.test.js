window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
tv.lateOpen = true;
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
  ok('only four filters are left', SMART.map(x => x[0]).join() === 'imp,due,rep,priv');
  ok('with due: only tasks with a due, earliest first', smartFilter('due', set(), T).map(t => t.id).join() === 'dl,d3,d9');
  ok('important', f('imp') === 'im');
  ok('repeating', f('rep') === 'rd,rp');
  ok('private hidden while locked', f('priv') === '');
  ok('private shown after unlock', f('priv', { unlocked: true }) === 'pv');
  ok('archived and done never show', !SMART.some(([id]) => smartFilter(id, set(), T, { unlocked: true }).some(t => ['ar', 'w1', 'w2'].includes(t.id))));
  ok('dropped slices return nothing', ['soon', 'late', 'nodate', 'week'].every(id => !smartFilter(id, set(), T).length));
}

{
  show({ habits: [], log: {}, taskLists: [{ id: 'home', name: 'Дом', color: '#22c55e' }], tasks: [...set(), A('h1', { date: T, list: 'home' }), A('h2', { important: true, list: 'home' })] });
  await openPage();
  const chips = () => [...$('tsFilters').querySelectorAll('.t-chip')].map(b => b.textContent);
  ok('no slices button and no slices sheet', !$('tSmartBtn') && !$('tSmartOv') && !$('tSmartSet'));
  ok('filters are hidden until search opens', $('tsFilters').hidden);
  $('tSearchBtn').click(); await tick();
  ok('search shows filter chips with counts, no private while locked', !$('tsFilters').hidden && chips().join('|') === 'Важные2|Со сроком3|Повторяющиеся2', chips());
  ok('filter chips are big enough', [...$('tsFilters').querySelectorAll('.t-chip')].every(b => b.getBoundingClientRect().height >= 40));
  $('tsFilters').querySelector('[data-f=due]').click(); await tick();
  ok('a filter shows its tasks and hides the week', $('tsFilters').querySelector('[data-f=due]').getAttribute('aria-pressed') === 'true' && !visible($('tTabs')) && [...$('tItems').querySelectorAll('.t-row')].map(r => r.dataset.id).join() === 'dl,d3,d9');
  $('tsText').value = 'Дело d'; $('tsText').dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => !$('tsResults').hidden);
  ok('search goes inside the filter', [...$('tsResults').querySelectorAll('.t-sres')].map(b => b.dataset.id).sort().join() === 'd3,d9,dl', [...$('tsResults').querySelectorAll('.t-sres')].map(b => b.dataset.id));
  $('tsText').value = ''; $('tsText').dispatchEvent(new Event('input', { bubbles: true })); await until(() => $('tsResults').hidden);
  ok('filters take the place of the list chips', $('tLists').hidden && $('tsFilters').previousElementSibling === $('tLists'));
  $('tsFilters').querySelector('[data-f=due]').click(); await tick();
  ok('second tap removes the filter', !tv.smart && visible($('tWeekRow')));
  $('tsClose').click(); await tick();
  ok('list chips come back after search', visible($('tLists')) && $('tsFilters').hidden);
  $('tLists').querySelector('[data-l=home]').click(); await tick();
  $('tSearchBtn').click(); await tick();
  $('tsFilters').querySelector('[data-f=imp]').click(); await tick();
  ok('filter works inside the chosen list', [...$('tItems').querySelectorAll('.t-row')].map(r => r.dataset.id).join() === 'h2');
  $('tsFilters').querySelector('[data-f=imp]').click(); await tick();
  $('tsClose').click(); await tick();
  $('tLists').querySelector('[data-l=all]').click();
  $('tSearchBtn').click(); await tick();
  $('tsFilters').querySelector('[data-f=rep]').click(); await tick();
  $('tsClose').click(); await tick();
  ok('closing search drops the filter', !tv.smart && $('tsFilters').hidden && visible($('tWeekRow')) && !!$('tItems').querySelector('.t-group.late'));
  $('tSearchBtn').click(); await tick();
  $('tsFilters').querySelector('[data-f=imp]').click(); await tick();
  await closePage(); await openPage();
  ok('filter resets when leaving the screen', !tv.smart && $('tsFilters').hidden);
  unlocked = true; renderTasks();
  $('tSearchBtn').click(); await tick();
  ok('private filter appears after unlock', chips().includes('Личные1'));
  $('tsFilters').querySelector('[data-f=priv]').click(); await tick();
  ok('private filter shows private tasks', !!$('tItems').querySelector('.t-row[data-id=pv]'));
  lockNow(); await tick();
  ok('locking drops the private filter', !tv.smart && !$('tItems').querySelector('.t-row[data-id=pv]'));
  $('tsClose').click(); await tick();
  show({ habits: [], log: {}, tasks: Array.from({ length: 45 }, (_, i) => A('m' + i, { important: true })) });
  $('tSearchBtn').click(); await tick();
  $('tsFilters').querySelector('[data-f=imp]').click(); await tick();
  ok('filter shows 20 and more', $('tItems').querySelectorAll('.t-row').length === 20 && $('tItems').querySelector('[data-act=smart-more]').textContent === 'Показать ещё 20');
  $('tItems').querySelector('[data-act=smart-more]').click();
  ok('more adds 20', $('tItems').querySelectorAll('.t-row').length === 40);
  show({ habits: [], log: {}, tasks: [A('z', { important: true })] });
  renderTasks();
  findTask('z').important = false; touchTasks(); await tick();
  ok('emptied filter says so and stays on', $('tItems').textContent === 'Таких задач нет' && $('tsFilters').querySelector('[data-f=imp]').getAttribute('aria-pressed') === 'true');
  ok('empty filters are off', $('tsFilters').querySelector('[data-f=due]').disabled);
  $('tsClose').click(); await tick();
  await closePage();
}

{
  const x = '<img src=x onerror=alert(1)>';
  show({ habits: [], log: {}, tasks: [A('x', { text: x, important: true })] });
  await openPage();
  $('tSearchBtn').click(); await tick();
  $('tsFilters').querySelector('[data-f=imp]').click(); await tick();
  ok('filter rows are escaped', !document.querySelector('#tItems img, #tsFilters img'));
  $('tsClose').click(); await tick();
  await closePage();
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
