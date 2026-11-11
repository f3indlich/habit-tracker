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

{
  ok('line helper', JSON.stringify(parseLines('- [x] готово\n1) раз\n[] пусто')) === JSON.stringify([{ text: 'готово', done: true }, { text: 'раз', done: false }, { text: 'пусто', done: false }]));
}

{
  show({ habits: [], log: {}, tasks: [A('e', { date: T })] });
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  const ft = v => { $('tfText').value = v; $('tfText').dispatchEvent(new Event('input', { bubbles: true })); };
  ft('купить цветы');
  ok('form shows no chip for plain text', !visible($('tfParse')));
  ft('купить цветы завтра в 18:00');
  ok('form shows what was understood', visible($('tfParse')) && $('tfParseText').textContent === 'Завтра, 18:00 · напоминание в срок' && $('tfParseOk').textContent === 'Применить');
  ok('form does not apply by itself', $('tfDateVal').textContent === 'Сегодня' && $('tfText').value === 'купить цветы завтра в 18:00');
  $('tfParseOk').click();
  ok('apply sets date and time and cuts the phrase', $('tfText').value === 'купить цветы' && $('tfDateVal').textContent.startsWith('Завтра') && $('tfTime').value === '18:00' && !visible($('tfParse')));
  ft('купить цветы послезавтра');
  ok('after a manual change the chip stays hidden', !visible($('tfParse')));
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  const t = state.tasks.at(-1);
  ok('applied values are saved', t.date === shift(1) && t.time === '18:00' && JSON.stringify(t.reminds) === '[0]', t);
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  $('tfTime').value = '09:00'; $('tfTime').dispatchEvent(new Event('input', { bubbles: true }));
  ft('забрать посылку завтра');
  ok('chip is not offered after the time was set by hand', !visible($('tfParse')));
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
  openTaskForm(findTask('e')); await until(() => $('tFormOv')._shown);
  ft('Дело завтра');
  ok('existing task form has no chip', !visible($('tfParse')));
  ft('<img src=x onerror=alert(1)> завтра');
  ok('form chip is safe', !document.querySelector('#tFormOv img'));
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
  state.taskLists = [{ id: 'home', name: 'Дом', color: '#22c55e' }];
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  ft('купить молоко #дом завтра вечером срочно');
  ok('chip names list, time and importance', $('tfParseText').textContent === 'Завтра, 19:00 · напоминание в срок · Список: Дом · Важная', $('tfParseText').textContent);
  $('tfParseOk').click();
  ok('apply puts the task into the list', $('tfList').value === 'home' && $('tfText').value === 'купить молоко');
  $('tForm').requestSubmit(); await until(() => $('tFormOv').hidden);
  const lt = state.tasks.at(-1);
  ok('list, time and importance are saved', lt.list === 'home' && lt.date === shift(1) && lt.time === '19:00' && lt.important === true, lt);
  openTaskForm(null, T); await until(() => $('tFormOv')._shown);
  $('tFormOv')._guard = null; closeOverlay($('tFormOv')); await until(() => $('tFormOv').hidden);
  show({ habits: [], log: {} });
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
