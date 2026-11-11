window.wait = ms => new Promise(r => setTimeout(r, ms));
window.waitFor = async (cond, timeout = 3000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > timeout) return false; await wait(30); } return true; };
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const consoleErrs = [], origErr = console.error;
console.error = (...a) => { consoleErrs.push(a.map(String).join(' ')); origErr.apply(console, a); };
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));

const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
const pathError = d => {
  const num = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y, sp = /[\s,]*/y;
  let i = 0, cmd = null;
  const skip = () => { sp.lastIndex = i; sp.exec(d); i = sp.lastIndex; };
  skip();
  while (i < d.length) {
    const ch = d[i].toLowerCase();
    if (ch in ARGS) { cmd = ch; i++; if (cmd === 'z') { skip(); continue; } }
    else if (!cmd) return 'no command at ' + i;
    for (let k = 0; k < ARGS[cmd]; k++) {
      skip();
      if (cmd === 'a' && (k === 3 || k === 4)) { if (d[i] === '0' || d[i] === '1') { i++; continue; } return `bad arc flag at ${i}: ${d.slice(i - 15, i + 15)}`; }
      num.lastIndex = i;
      if (!num.exec(d)) return `expected number for ${cmd} at ${i}: ${d.slice(i - 20, i + 20)}`;
      i = num.lastIndex;
    }
    skip();
  }
  return null;
};
const pathsOf = html => [...html.matchAll(/\bd="([^"]*)"/g)].map(m => m[1]);

{
  const bad = [];
  for (const [k, v] of Object.entries(ICONS)) for (const d of pathsOf(v.s)) { const e = pathError(d); if (e) bad.push(['line', k, e]); }
  for (const [k, v] of Object.entries(ICON_ART)) for (const d of pathsOf(v)) { const e = pathError(d); if (e) bad.push(['art', k, e]); }
  for (const [k, v] of Object.entries(IC)) for (const d of pathsOf(String(v))) { const e = pathError(d); if (e) bad.push(['ui', k, e]); }
  for (const p of document.querySelectorAll('path[d]')) { const e = pathError(p.getAttribute('d')); if (e) bad.push(['page', p.closest('[id]')?.id, e]); }
  ok('every svg path in icons and page is well formed', bad.length === 0, bad);
  ok('path checker catches a broken arc', !!pathError('M12 2.5c3.8 4.8 6.8 8.6 6.8 12.2c6.8 6.8 0 0 1-13.6 0z') && !pathError('M12 2.5c3.8 4.8 6.8 8.6 6.8 12.2a6.8 6.8 0 0 1-13.6 0z'));

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:40px;opacity:0;pointer-events:none';
  document.body.append(box);
  const style = document.body.dataset.icons, empty = [];
  for (const st of ['line', 'art']) {
    document.body.dataset.icons = st;
    for (const k of ICON_KEYS) {
      box.innerHTML = iconHTML(k);
      const svg = box.querySelector('svg'), b = svg?.getBBox();
      if (!b || b.width <= 0 || b.height <= 0) empty.push(st + ':' + k);
      for (const p of svg.querySelectorAll('path')) { const pb = p.getBBox(); if (pb.width <= 0 && pb.height <= 0) empty.push(st + ':' + k + ':path'); }
    }
  }
  document.body.dataset.icons = style;
  box.remove();
  ok('every icon draws in line and art styles', empty.length === 0, empty);
  const w = ICON_ART.water;
  ok('water drop uses arcs, not broken curves', /12\.2a6\.8 6\.8 0 0 1-13\.6 0/.test(w) && /12\.2a6\.8 6\.8 0 0 1-6\.8 6\.8z/.test(w));
}

{
  const win = (top, origin) => { const w = { location: { origin } }; w.self = w; w.top = top === 'self' ? w : top; return w; };
  const throwing = { get location() { throw new Error('cross-origin'); } };
  ok('not framed when opened directly', framedByOther(win('self', 'https://a.example')) === false);
  ok('same-origin frame is allowed', framedByOther(win({ location: { origin: 'https://a.example' } }, 'https://a.example')) === false);
  ok('frame from another site is blocked', framedByOther(win({ location: { origin: 'https://evil.example' } }, 'https://a.example')) === true);
  ok('unreadable parent counts as another site', framedByOther(win(throwing, 'https://a.example')) === true);
  ok('test page frame shows the app', framedByOther(window) === false && !document.querySelector('.framed') && !$('fab').closest('[hidden]'));
}

{
  const src = await fetch('sw.js', { cache: 'no-store' }).then(r => r.text());
  const line = src.split('\n').find(l => l.startsWith('const noCache'));
  ok('service worker does not cache itself or tests', !!line && line.includes("path.endsWith('/sw.js')") && line.includes("path.includes('/tests/')") && !/app\.js|index\.html/.test(line), line);
  ok('service worker fetch handler uses the exclusion', /if \(noCache\(url\.pathname\)\) return;/.test(src));

  const sql = await fetch('supabase-size-limit.sql', { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
  ok('size limit sql is idempotent and raises the known error', /create or replace function public\.habit_data_size_check\(\)/.test(sql) && /drop trigger if exists habit_data_size_check on public\.habit_data/.test(sql)
    && /before insert or update on public\.habit_data/.test(sql) && /errcode = 'check_violation'/.test(sql) && /message = 'habit_data_size_limit'/.test(sql) && /octet_length\(new\.data::text\)/.test(sql));
  const limit = +(sql.match(/if size > (\d+)/) || [])[1];
  ok('size limit error is recognised by the app', isSizeError({ code: '23514', message: 'habit_data_size_limit', details: `habit_data_size_limit: ${limit + 1} bytes, limit ${limit}` }) && !isSizeError({ code: '23514', message: 'other' }));
  const big = normalize({ habits: Array.from({ length: 20 }, (_, i) => ({ id: 'h' + i, name: 'Привычка номер ' + i, icon: 'book', created: ago(1100), target: 8, unit: 'стаканов' })), log: {} });
  for (let d = 0; d < 1095; d++) { const k = ago(d); big.log[k] = Object.fromEntries(big.habits.map(h => [h.id, 1 + (d % 8)])); }
  big.notes = {};
  for (let d = 0; d < 1095; d++) big.notes[ago(d)] = { h0: 'ж'.repeat(300) };
  const bytes = new TextEncoder().encode(JSON.stringify(big)).length;
  ok('size limit leaves room for three heavy years', limit === 5242880 && bytes < limit / 2, { bytes, limit });
}

const fe = frameElement, w0 = fe.style.width, h0 = fe.style.height;
const size = async (w, h = 800) => { fe.style.maxWidth = 'none'; fe.style.width = w + 'px'; fe.style.height = h + 'px'; await waitFor(() => innerWidth === w); render(); await wait(300); };
const restoreSize = async () => { fe.style.maxWidth = ''; fe.style.width = w0; fe.style.height = h0; await wait(150); render(); await wait(250); };
const fresh = async (habits, log = {}) => { setState(normalize({ habits, log })); viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(350); };
const cardOf = id => document.querySelector(`.habit[data-id="${id}"]`);
const view0 = document.body.dataset.view;

{
  document.body.dataset.view = '7d';
  await fresh([{ id: 'd1', name: 'Кружки', icon: 'book', color: '#ef4444', created: ago(20) }]);
  const el = cardOf('d1'), dots = [...el.querySelectorAll('.dot')];
  el.scrollIntoView({ block: 'center' }); await wait(100);
  const h = () => findHabit('d1');
  dots[3].click(); await waitFor(() => $('dayOv')._shown);
  ok('tap on a day three days ago opens the day sheet', $('dayOv')._shown && key(day.d) === ago(3) && day.id === 'd1');
  ok('tap on an older day does not change the mark', count(h(), parseKey(ago(3))) === 0);
  closeOverlay($('dayOv')); await waitFor(() => !document.body.classList.contains('locked'));
  await wait(200);
  dots[5].click(); await waitFor(() => $('dayOv')._shown);
  ok('tap on yesterday opens the day instead of marking it', $('dayOv')._shown && key(day.d) === ago(1) && count(h(), parseKey(ago(1))) === 0);
  closeOverlay($('dayOv')); await waitFor(() => !document.body.classList.contains('locked')); await wait(200);
  dots[6].click(); await waitFor(() => $('dayOv')._shown);
  ok('tap on today opens the day instead of marking it', $('dayOv')._shown && count(h(), new Date()) === 0);
  closeOverlay($('dayOv')); await waitFor(() => !document.body.classList.contains('locked')); await wait(200);
  hideToast();

  const r = dots.map(d => d.getBoundingClientRect()), hits = [];
  for (let i = 0; i < r.length; i++) {
    const cx = r[i].left + r[i].width / 2, cy = r[i].top + r[i].height / 2;
    for (const [x, y] of [[cx, cy - 15.5], [cx, cy + 15.5]]) if (document.elementFromPoint(x, y) !== dots[i]) hits.push(['v', i, y - cy, document.elementFromPoint(x, y)?.className]);
    if (i < r.length - 1) {
      const seen = [];
      for (let x = r[i].right - 1; x <= r[i + 1].left + 1; x += .25) { const k = dots.indexOf(document.elementFromPoint(x, cy)); if (seen.at(-1) !== k) seen.push(k); }
      if (seen.join() !== `${i},${i + 1}`) hits.push(['gap', i, seen]);
    }
  }
  const ps = getComputedStyle(dots[0], '::after'), gap = r[1].left - r[0].right;
  if (parseFloat(ps.left) + parseFloat(ps.right) < -gap - .01 || -parseFloat(ps.left) > gap / 2 + .01) hits.push(['overlap', ps.left, ps.right, gap]);
  ok('dot tap zone is at least 32px tall and fills the gap without overlap', hits.length === 0, { hits, dot: Math.round(r[0].width), pitch: r[1].left - r[0].left });

  const sx = r[3].left + 5, sy = r[3].top + 5;
  const pe = (t, x) => dots[3].dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: sy, bubbles: true, isPrimary: true, button: 0 }));
  pe('pointerdown', sx); pe('pointermove', sx + 40); pe('pointermove', sx + 120); pe('pointerup', sx + 120); await wait(400);
  ok('dragging from a dot neither swipes nor marks the card', !el.style.transform && count(h(), parseKey(ago(3))) === 0 && count(h(), new Date()) === 1 && !document.body.classList.contains('reordering'));

  const fs = sel => Math.min(...[...document.querySelectorAll(sel)].map(x => parseFloat(getComputedStyle(x).fontSize)));
  ok('day labels and numbers in the card are at least 11px', fs('.habit .dw') >= 11 && fs('.habit .dot') >= 11, { dw: fs('.habit .dw'), dot: fs('.habit .dot') });
  await size(320);
  const e2 = cardOf('d1'), lab = [...e2.querySelectorAll('.dw')], nums = [...e2.querySelectorAll('.dot')];
  const textW = x => { const rg = document.createRange(); rg.selectNodeContents(x); return rg.getBoundingClientRect().width; };
  const over = [...lab, ...nums].filter(x => textW(x) > x.getBoundingClientRect().width + .5).map(x => [x.textContent, textW(x), x.getBoundingClientRect().width]);
  const dr = e2.querySelector('.dots').getBoundingClientRect(), last = nums.at(-1).getBoundingClientRect(), ctl = e2.querySelector('.ctl').getBoundingClientRect();
  ok('day strip fits at 320px with 11px text', over.length === 0 && last.right <= dr.right + .5 && last.right <= ctl.left && lab.every(x => x.textContent.trim()), { over, last: last.right, dots: dr.right, ctl: ctl.left, labels: lab.map(x => x.textContent) });
  await restoreSize();
}

{
  await fresh([{ id: 's1', name: 'Красная', icon: 'book', color: '#ef4444', created: ago(30) }]);
  const w = cardOf('s1').querySelector('.m-warn'), cs = getComputedStyle(w);
  ok('stale badge is neutral, not in the habit color', w.classList.contains('stale') && cs.color !== 'rgb(239, 68, 68)' && !/239, 68, 68/.test(cs.backgroundColor), { color: cs.color, bg: cs.backgroundColor });

  localStorage.removeItem(LEGEND_STORE);
  await fresh([{ id: 'l1', name: 'Новая', icon: 'book', created: ago(6) }]);
  ok('legend shown in the first week', !$('viewLegend').hidden && !localStorage.getItem(LEGEND_STORE));
  await fresh([{ id: 'l1', name: 'Новая', icon: 'book', created: ago(6) }, { id: 'l2', name: 'Старая', icon: 'book', created: ago(7) }]);
  ok('legend hidden after seven days and remembered', $('viewLegend').hidden && localStorage.getItem(LEGEND_STORE) === '1');
  await fresh([{ id: 'l3', name: 'Ещё новее', icon: 'book', created: ago(0) }]);
  ok('legend stays hidden once dismissed', $('viewLegend').hidden);
  ok('help still explains the dot colors', /штриховка — пропуск/.test(await fetch('js/guide.js').then(r => r.text())));
}

{
  const g = n => guessIcon(n);
  const cases = { 'Пить воду': 'water', 'Вода 2 литра': 'water', 'Чтение': 'book', 'Читать 20 страниц': 'book', 'Зарядка': 'dumbbell', 'Спорт': 'dumbbell', 'Тренировка в зале': 'dumbbell',
    'Не курить': 'nosmoke', 'Без алкоголя': 'noalcohol', 'Не пить алкоголь': 'noalcohol', 'Медитация': 'meditate', 'Лечь спать до 23': 'sleep', 'Бег': 'run', 'Утренняя пробежка': 'run',
    'Почистить зубы': 'tooth', 'Витамины': 'pill', 'Английский': 'books', 'Подтягивания': 'pullup', 'Прогулка': 'walk', 'Без соцсетей': 'phoneoff', 'Полить цветы': 'wateringcan' };
  const wrong = Object.entries(cases).filter(([n, k]) => g(n) !== k).map(([n, k]) => [n, g(n), k]);
  ok('icon guessed from the habit name', wrong.length === 0, wrong);
  ok('no guess for unknown names', g('Абракадабра') === null && g('') === null);
  ok('every hint points to an existing icon', ICON_HINTS.every(([, k]) => ICONS[k]));

  await fresh([]);
  openForm(); await waitFor(() => $('formOv')._shown);
  $('name').value = 'Пить воду'; $('name').dispatchEvent(new Event('input')); await wait(50);
  ok('form preview follows the guessed icon', form.icon === 'water' && $('emojis').querySelector('[data-v=water]').getAttribute('aria-pressed') === 'true');
  $('form').requestSubmit(); await waitFor(() => !$('formOv')._shown);
  ok('saved habit gets the guessed icon', state.habits.at(-1)?.icon === 'water', state.habits.at(-1));
  const c1 = state.habits.at(-1).color;

  openForm(); await waitFor(() => $('formOv')._shown);
  $('emojis').querySelector('[data-v=music]').click();
  $('name').value = 'Пить воду'; $('name').dispatchEvent(new Event('input')); await wait(50);
  ok('manual icon is kept while typing', form.icon === 'music');
  ok('next habit gets a different color', form.color !== c1, [form.color, c1]);
  $('form').requestSubmit(); await waitFor(() => !$('formOv')._shown);
  ok('manual icon wins on save', state.habits.at(-1)?.icon === 'music');

  openForm(); await waitFor(() => $('formOv')._shown);
  $('name').value = 'Абракадабра'; $('name').dispatchEvent(new Event('input')); await wait(50);
  $('form').requestSubmit(); await waitFor(() => !$('formOv')._shown);
  ok('unknown name keeps the check icon', state.habits.at(-1)?.icon === 'check');
  const cs = state.habits.map(h => h.color);
  ok('neighbouring new habits differ in color', cs.every((c, i) => !i || c !== cs[i - 1]), cs);

  openForm(state.habits[0].id); await waitFor(() => $('formOv')._shown);
  $('name').value = 'Чтение книг'; $('name').dispatchEvent(new Event('input')); await wait(50);
  ok('editing does not swap an existing icon', form.icon === 'water');
  closeOverlay($('formOv')); await wait(300);
}
document.body.dataset.view = view0;

if (usesHistory(isIOS)) {
  const href = location.href;
  for (let i = 0; i < 4; i++) { openOverlay($('setOv')); closeOverlay($('setOv')); openOverlay($('setOv')); await wait(120); closeOverlay($('setOv')); }
  await wait(400);
  ok('quick close and reopen keeps history on the app page', location.href === href && history.state?.sheet !== true && !shownOverlays().length, history.state);
  openOverlay($('setOv')); closeOverlay($('setOv')); openOverlay($('setOv')); await wait(400);
  ok('sheet reopened right after closing owns a history entry', history.state?.sheet === true && $('setOv')._shown, history.state);
  history.back(); await wait(500);
  ok('back closes that sheet and stays in the app', !$('setOv')._shown && location.href === href);
}

{
  const RealDate = Date, real = new RealDate();
  const at = d => new RealDate(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).getTime();
  const fake = ms => { window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(ms); } static now() { return ms; } }; };
  const mon = addDays(new RealDate(real.getFullYear(), real.getMonth(), real.getDate()), -weekday(real) - 7);
  window.__pastStart = true;
  try {
    fake(at(mon));
    const T = key(new Date()), dk = n => key(addDays(new Date(), -n));
    ok('fake clock is on a Monday', weekday(new Date()) === 0 && todayKey() === key(mon));
    const log = {};
    for (let i = 1; i <= 40; i++) log[dk(i)] = { p1: 1 };
    await fresh([{ id: 'p1', name: 'Период', icon: 'book', created: dk(40) }], log);
    const prevWeek = rangeLabel('week', rangeDays('week', addDays(new Date(), -7))), thisWeek = rangeLabel('week', rangeDays('week', new Date()));

    openSummary(); await waitFor(() => $('sumOv')._shown);
    ok('Monday summary opens last week', $('sLabel').textContent === prevWeek && !$('sBack').hidden && $('sBack').querySelector('span').textContent === 'Итоги прошлой недели' && $('sBack').querySelector('button').textContent === 'Эта неделя →', [$('sLabel').textContent, prevWeek, $('sBack').textContent]);
    ok('last week summary has real numbers', !$('sBody').hidden && /\d/.test($('sSum').textContent), $('sSum').textContent);
    $('sBack').querySelector('button').click(); await wait(100);
    ok('this week button returns to the current week', $('sLabel').textContent === thisWeek && $('sBack').hidden);
    $('sPrev').click(); await wait(400);
    ok('arrows work as before without the caption', $('sLabel').textContent === prevWeek && $('sBack').hidden);
    closeOverlay($('sumOv')); await wait(400);

    openHistory('p1'); await waitFor(() => $('histOv')._shown);
    if (hist.range !== 'week') { $('hTabs').querySelector('[data-r=week]').click(); closeOverlay($('histOv')); await wait(400); openHistory('p1'); await waitFor(() => $('histOv')._shown); }
    ok('Monday habit history opens last week', $('hLabel').textContent === prevWeek && !$('hBack').hidden && $('hBack').textContent.includes('Итоги прошлой недели'));
    ok('last week history is not empty', !/нет данных/.test($('hTiles').textContent), $('hTiles').textContent);
    $('hBack').querySelector('button').click(); await wait(100);
    ok('history returns to this week', $('hLabel').textContent === thisWeek && $('hBack').hidden);
    closeOverlay($('histOv')); await wait(400);

    await fresh([{ id: 'p2', name: 'Новичок', icon: 'book', created: T }], { [T]: { p2: 1 } });
    openSummary(); await waitFor(() => $('sumOv')._shown);
    ok('new user on Monday sees the current week', $('sLabel').textContent === thisWeek && $('sBack').hidden);
    closeOverlay($('sumOv')); await wait(400);

    fake(at(addDays(mon, 1)));
    await fresh([{ id: 'p1', name: 'Период', icon: 'book', created: dk(40) }], log);
    openSummary(); await waitFor(() => $('sumOv')._shown);
    ok('Tuesday summary opens the current week', $('sLabel').textContent === rangeLabel('week', rangeDays('week', new Date())) && $('sBack').hidden);
    closeOverlay($('sumOv')); await wait(400);

    const first = new RealDate(real.getFullYear(), real.getMonth(), 1);
    fake(at(first));
    const mlog = {};
    for (let i = 1; i <= 70; i++) mlog[key(addDays(new Date(), -i))] = { p1: 1 };
    await fresh([{ id: 'p1', name: 'Период', icon: 'book', created: key(addDays(new Date(), -70)) }], mlog);
    openSummary(); await waitFor(() => $('sumOv')._shown);
    $('sTabs').querySelector('[data-r=month]').click(); await wait(100);
    closeOverlay($('sumOv')); await wait(400);
    openSummary(); await waitFor(() => $('sumOv')._shown);
    ok('first day of month opens last month', $('sLabel').textContent === rangeLabel('month', rangeDays('month', addDays(new Date(), -1))) && $('sBack').textContent.includes('Итоги прошлого месяца') && $('sBack').textContent.includes('Этот месяц →'));
    $('sTabs').querySelector('[data-r=week]').click(); await wait(100);
    ok('switching tabs shows the current period', $('sLabel').textContent === rangeLabel('week', rangeDays('week', new Date())) && $('sBack').hidden);
    closeOverlay($('sumOv')); await wait(400);
  } finally { window.Date = RealDate; window.__pastStart = false; }
  await fresh([{ id: 't1', name: 'Тост', icon: 'book', created: ago(5) }]);
}

{
  toast('Проверка', () => {}); await wait(100);
  openOverlay($('setOv')); await wait(50);
  ok('opening a sheet hides the toast', !$('toast').classList.contains('show'));
  closeOverlay($('setOv')); await wait(400);

  openDay('t1', parseKey(ago(3))); await waitFor(() => $('dayOv')._shown); await wait(400);
  toast('Внутри листа', () => {}); await wait(500);
  const tr = $('toast').getBoundingClientRect();
  const hitBtn = [...$('dayOv').querySelectorAll('button, textarea, input')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height && r.top < tr.bottom && r.bottom > tr.top && r.left < tr.right && r.right > tr.left; });
  ok('toast inside a sheet does not cover its buttons', $('toast').classList.contains('show') && hitBtn.length === 0, hitBtn.map(b => b.textContent.trim() || b.id));
  hideToast(); closeOverlay($('dayOv')); await wait(400);
  toast('Снаружи'); await wait(100);
  ok('toast outside sheets keeps its usual place', !$('toast').style.bottom);
  hideToast();
}

{
  const saved = localStorage.getItem(DATA_STORE), acc = localStorage.getItem(ACCENT_STORE);
  localStorage.removeItem(DATA_STORE); localStorage.setItem(ACCENT_STORE, 'cobalt');
  keepOldDataColor(true);
  ok('existing user without a saved statistics color keeps red', localStorage.getItem(DATA_STORE) === 'red' && colorPrefs().data === 'red');
  localStorage.removeItem(DATA_STORE);
  keepOldDataColor(false);
  ok('new install: statistics color equals the interface accent', !localStorage.getItem(DATA_STORE) && colorPrefs().data === colorPrefs().accent);
  localStorage.setItem(ACCENT_STORE, 'emerald');
  ok('statistics follow a changed accent until chosen', colorPrefs().data === 'emerald');
  localStorage.setItem(DATA_STORE, 'sea');
  keepOldDataColor(true);
  ok('a chosen statistics color is never overwritten', localStorage.getItem(DATA_STORE) === 'sea');
  saved == null ? localStorage.removeItem(DATA_STORE) : localStorage.setItem(DATA_STORE, saved);
  acc == null ? localStorage.removeItem(ACCENT_STORE) : localStorage.setItem(ACCENT_STORE, acc);
  applyColors();
  const src = await fetch('app.js', { cache: 'no-store' }).then(r => r.text());
  ok('migration runs on start before colors apply', src.indexOf('keepOldDataColor(state.habits.length > 0)') > -1 && src.indexOf('keepOldDataColor(state.habits.length > 0)') < src.indexOf('applyColors();'));
}

{
  await fresh([{ id: 'f1', name: 'Форма', icon: 'book', created: ago(5) }]);
  const lineOf = el => { const t = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()), rg = document.createRange(); rg.selectNodeContents(t); const h = rg.getBoundingClientRect().height, fs = parseFloat(getComputedStyle(el).fontSize); return { one: el.scrollWidth <= el.clientWidth + 1 && h < fs * 1.8, h, sw: el.scrollWidth, cw: el.clientWidth }; };
  const bad = [];
  for (const w of [320, 375, 390, 430]) {
    await size(w, 800);
    openForm(); await waitFor(() => $('formOv')._shown); await wait(350);
    const b = $('submit'), l = lineOf(b), ic = b.querySelector('svg.ic');
    if (!l.one || b.textContent.trim() !== 'Добавить' || !ic || getComputedStyle(ic).display === 'none') bad.push([w, l, b.textContent.trim()]);
    closeOverlay($('formOv')); await wait(350);
  }
  ok('form button says «Добавить» with a plus on one line at 320–430px', bad.length === 0, bad);
  await size(375, 760);
  openForm('f1'); await waitFor(() => $('formOv')._shown); await wait(350);
  ok('editing button says «Сохранить»', $('submit').textContent.trim() === 'Сохранить' && lineOf($('submit')).one);
  closeOverlay($('formOv')); await wait(350);

  openForm(); await waitFor(() => $('formOv')._shown); await wait(350);
  const fields = [...$('form').querySelectorAll(':scope > .field')].filter(f => f.offsetParent !== null);
  const gaps = fields.slice(1).map((f, i) => {
    const prev = fields[i], kids = [...prev.querySelectorAll(':scope > *')].filter(k => k.getBoundingClientRect().height > 0);
    const bottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
    return [f.querySelector(':scope > .lbl')?.textContent, Math.round(f.getBoundingClientRect().top - bottom)];
  });
  const sched = gaps.find(g => g[0] === 'Расписание');
  ok('gap before «Расписание» matches the other sections', !!sched && gaps.every(g => Math.abs(g[1] - gaps[0][1]) <= 1), gaps);

  const why = $('why'), cs = getComputedStyle(why), cv = document.createElement('canvas').getContext('2d');
  cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const room = why.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  ok('«Зачем мне это?» hint is short and not cut', why.placeholder === 'Например: больше энергии' && cv.measureText(why.placeholder).width <= room, [cv.measureText(why.placeholder).width, room]);

  const grid = $('emojis'), cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const shown = () => [...grid.children].filter(b => !b.hidden);
  const rows = () => new Set(shown().map(b => Math.round(b.getBoundingClientRect().top))).size;
  ok('icon grid shows two rows and an «Все иконки» button', rows() === 2 && shown().length === cols * 2 && !$('iconsMore').hidden && $('iconsMore').textContent === 'Все иконки' && $('iconsMore').getAttribute('aria-expanded') === 'false', [rows(), shown().length, cols]);
  $('iconsMore').click(); await wait(50);
  ok('«Все иконки» opens the full list', shown().length === ICON_KEYS.length && $('iconsMore').textContent === 'Свернуть' && $('iconsMore').getAttribute('aria-expanded') === 'true');
  const far = ICON_KEYS[ICON_KEYS.length - 3];
  grid.querySelector(`[data-v="${far}"]`).click(); await wait(50);
  $('iconsMore').click(); await wait(50);
  const fb = grid.querySelector(`[data-v="${far}"]`);
  ok('chosen icon stays visible when the list is folded', !fb.hidden && fb.getAttribute('aria-pressed') === 'true' && rows() === 2 && shown().length === cols * 2, [rows(), shown().length]);

  const sheet = $('formOv').querySelector('.sheet'), dock = sheet.querySelector('.prev-dock');
  const over = [];
  for (const id of ['emojis', 'colors', 'goalSeg']) {
    $(id).scrollIntoView({ block: 'start' }); await wait(120);
    const d = dock.getBoundingClientRect(), t = $(id).getBoundingClientRect();
    if (t.top < d.bottom - 1) over.push([id, Math.round(d.bottom), Math.round(t.top)]);
  }
  ok('sticky preview does not cover fields scrolled to the top', over.length === 0, over);
  closeOverlay($('formOv')); await wait(350);
  await restoreSize();

  renderSettings?.();
  const grp = $('setAcctGroup');
  ok('settings section is called «Профиль»', grp.querySelector('h3').textContent === 'Профиль');
  ok('profile has an «Аккаунт и синхронизация» row', !$('setLogin').hidden && $('setLogin').querySelector('b').textContent === 'Аккаунт и синхронизация' && grp.contains($('setLogin')));
  openOverlay($('setOv')); await wait(300);
  $('setLogin').click(); await waitFor(() => $('acctOv')._shown);
  ok('the row opens the same sheet as the cloud button', $('acctOv')._shown);
  while (shownOverlays().length) { closeOverlay(shownOverlays().pop()); }
  await wait(400);

  const lockSrc = await fetch('js/lock.js').then(r => r.text());
  ok('PIN prompt suggests 6 digits', /Придумайте PIN: от 4 до 6 цифр\. Лучше 6 цифр/.test(lockSrc) && /Новый PIN: от 4 до 6 цифр\. Лучше 6 цифр/.test(lockSrc));

  window.__tipsOn = true;
  resetTips(); markTip('mark'); await wait(1700);
  await fresh([{ id: 'f1', name: 'Форма', icon: 'book', created: ago(5) }]);
  await runTips(); await wait(300);
  ok('header tip is skipped for people who already saw tips', tip?.id !== 'head' && !tipSeen('head'));
  closeTip?.(false); await wait(1700);

  window.__touch = false;
  resetTips(); ['mark', 'steps', 'head'].forEach(markTip);
  await fresh([{ id: 'm1', name: 'Мышь', icon: 'book', created: ago(5) }, { id: 'm2', name: 'Клик', icon: 'book', created: ago(5) }]);
  setCount(findHabit('m1'), new Date(), 1); render(); await wait(300);
  await runTips(); await wait(300);
  ok('mouse users skip the swipe tip', tip?.id === 'days' && !tipSeen('swipe'), tip?.id);
  closeTip(false); await wait(1700);
  markTip('days');
  openHistory('m1'); await waitFor(() => $('histOv')._shown); await wait(350);
  await runTips(); await wait(300);
  ok('mouse history tip has no touch gestures', tip?.id === 'hist' && !/Смахните|Потяните/.test($('tipBody').textContent) && /Стрелки/.test($('tipBody').textContent), $('tipBody')?.textContent);
  closeTip(false); closeOverlay($('histOv')); await wait(400);
  window.__tipsOn = false;
}

{
  await fresh([{ id: 'p1', name: 'Вода', icon: 'water', target: 8, created: ago(5) }, { id: 'p2', name: 'Чай', icon: 'book', created: ago(5) }]);
  setCount(findHabit('p1'), new Date(), 3); render(); await wait(300);
  ok('hero praises a partial start', $('heroMsg').textContent === 'Хорошее начало!', $('heroMsg').textContent);
  setCount(findHabit('p1'), addDays(new Date(), -1), 3); viewDate = addDays(new Date(), -1); render(); await wait(300);
  ok('past day with partial marks counts what is left', $('heroMsg').textContent === 'Не выполнено: 2', $('heroMsg').textContent);
  viewDate = new Date(); render(); await wait(200);
  const cap = document.querySelector('.hero-sum'), hr = $('hero').getBoundingClientRect(), cr = cap.getBoundingClientRect();
  ok('summary caption is visible inside the hero', cap.textContent.startsWith('Сводка') && cr.height > 0 && cr.bottom <= hr.bottom && cr.right <= hr.right, [cr.bottom, hr.bottom]);
  cap.click(); await waitFor(() => $('sumOv')._shown);
  ok('summary caption opens the summary', $('sumOv')._shown);
  closeOverlay($('sumOv')); await wait(400);
}

{
  ok('confetti halves on weak devices', confettiCount({ hardwareConcurrency: 4 }) === CONFETTI / 2 && confettiCount({ hardwareConcurrency: 8, deviceMemory: 4 }) === CONFETTI / 2
    && confettiCount({ hardwareConcurrency: 8, deviceMemory: 8 }) === CONFETTI && confettiCount({}) === CONFETTI);
  document.querySelectorAll('.confetti').forEach(x => x.remove());
  celebrate();
  const now = document.querySelectorAll('.confetti').length;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  const later = document.querySelectorAll('.confetti').length;
  ok('confetti starts after the card has been drawn', now === 0 && later === confettiCount(), { now, later });
  document.querySelectorAll('.confetti').forEach(x => x.remove());
}

{
  await fresh([{ id: 'c1', name: 'Экраны', icon: 'book', created: ago(20), target: 3 }, { id: 'c2', name: 'Второй', icon: 'run', created: ago(10) }], { [ago(1)]: { c1: 2, c2: 1 } });
  const before = consoleErrs.length, errs0 = __errs.length;
  const screens = [
    ['form', () => openForm(), 'formOv'], ['history', () => openHistory('c1'), 'histOv'], ['summary', () => openSummary(), 'sumOv'],
    ['goals', () => openGoals(), 'goalsOv'], ['settings', () => { renderSettings(); openOverlay($('setOv')); }, 'setOv'],
  ];
  const opened = [];
  for (const [name, open, id] of screens) {
    open(); if (await waitFor(() => $(id)._shown)) opened.push(name);
    await wait(500);
    closeOverlay($(id)); await wait(400);
  }
  ok('main screen and every sheet open without console errors', opened.length === screens.length && consoleErrs.length === before && __errs.length === errs0, { opened, errs: consoleErrs.slice(before), page: __errs.slice(errs0) });
}

{
  const sec = await fetch('.well-known/security.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
  const exp = new Date((sec.match(/^Expires: (.+)$/m) || [])[1]);
  ok('security.txt names the privacy address', PRIVACY_EMAIL && sec.includes(`Contact: mailto:${PRIVACY_EMAIL}`) && /^Preferred-Languages: ru, en$/m.test(sec), sec);
  ok('security.txt expires within a year', exp > Date.now() && exp - Date.now() <= 366 * 864e5, String(exp));
  const cfg = await fetch('_config.yml', { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
  ok('github pages publishes .well-known', /^include:\s*\n\s*- \.well-known/m.test(cfg.replace(/\r/g, '')), cfg);
  ok('failed account deletion points to the address', delFailText().includes(PRIVACY_EMAIL));
}

{
  const files = ['index.html', 'app.js', 'sw.js', 'manifest.webmanifest', ...['core', 'icons', 'storage', 'ui', 'render', 'form', 'history', 'settings', 'sync', 'push', 'summary', 'tips', 'guide', 'privacy', 'lock', 'plan', 'goals', 'goalsui', 'tasks', 'tasksui', 'tabs'].map(m => `js/${m}.js`)];
  const low = /(?<![\p{L}\p{N}_])(вы|вас|вам|вами|ваш[а-я]*)(?![\p{L}\p{N}_])/gu, hits = [];
  for (const f of files) {
    const src = await fetch(f, { cache: 'no-store' }).then(r => r.text());
    for (const m of src.matchAll(low)) hits.push([f, src.slice(Math.max(0, m.index - 30), m.index + 20)]);
  }
  const shown = document.body.innerText.match(low);
  ok('polite «Вы» is always capitalized in app texts', hits.length === 0 && !shown, hits);
}

console.error = origErr;
ok('no console errors', consoleErrs.length === 0, consoleErrs);
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
