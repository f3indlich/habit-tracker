window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));

const log = {};
for (let i = 1; i < 60; i++) log[ago(i)] = { z: i % 3 ? 1 : 0, v: i % 4 ? 8 : 3, q: 40 };
state = normalize({ categories: [{ id: 'a', name: 'Здоровье и спорт' }], habits: [
  { id: 'z', name: 'Утренняя зарядка с растяжкой и планкой', icon: 'strong', color: '#22c55e', created: ago(60), cat: 'a' },
  { id: 'v', name: 'Вода', icon: 'water', color: '#3b82f6', target: 8, unit: 'стаканов', created: ago(60), cat: 'a' },
  { id: 'q', name: 'Испанский', icon: 'books', color: '#8b5cf6', target: 100, unit: 'вопросов', created: ago(60) },
  { id: 'c', name: 'Чтение', icon: 'books', color: '#f97316', created: ago(60) },
  { id: 'm', name: 'Медитация', icon: 'meditate', color: '#14b8a6', created: ago(60) },
  { id: 'w', name: 'Прогулка', icon: 'walk', color: '#0ea5e9', created: ago(60) },
], log });
viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(400);

const coarse = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
  .filter(r => r instanceof CSSMediaRule && r.conditionText === '(pointer: coarse)')
  .flatMap(r => [...r.cssRules].map(x => x.cssText)).join('\n');
const touch = document.createElement('style');
touch.textContent = coarse;
ok('touch rules found', coarse.includes('.more::after') && coarse.includes('.dot::after'));

const fe = frameElement, w0 = fe.style.width, h0 = fe.style.height;
const size = async (w, h) => { fe.style.maxWidth = 'none'; fe.style.width = w + 'px'; fe.style.height = h + 'px'; await wait(150); render(); await wait(350); };
const inside = (el, x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
const span = el => {
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let w = 0, h = 0;
  for (let x = r.left - 30; x <= r.right + 30; x++) if (inside(el, x, cy)) w++;
  for (let y = r.top - 30; y <= r.bottom + 30; y++) if (inside(el, cx, y)) h++;
  return [w, h];
};
const hit = el => { const [w, h] = span(el); return w >= 44 && h >= 44; };
const inView = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; };
const fontOk = () => [...document.querySelectorAll('input:not([type=checkbox]):not([type=file]):not([type=hidden]), textarea, select')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.className);

const sizes = [[320, 812], [360, 812], [375, 568], [375, 812], [375, 932], [414, 812], [768, 1024], [1024, 768], [1440, 900], [740, 360]];
for (const [w, h] of sizes) {
  await size(w, h);
  const tag = `${w}x${h}`;
  scrollTo(0, 0);
  ok(`${tag}: no horizontal scroll`, document.documentElement.scrollWidth <= document.documentElement.clientWidth, [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  scrollTo(0, 1e6); await wait(200);
  const fab = $('fab'), last = [...document.querySelectorAll('#sections .habit')].pop();
  const fr = fab.getBoundingClientRect(), lr = last.getBoundingClientRect();
  const fabShown = getComputedStyle(fab).display !== 'none' && fr.width > 0;
  ok(`${tag}: add button does not cover last card`, !fabShown || fr.top >= lr.bottom - 1 || fr.bottom <= lr.top, [fabShown, Math.round(fr.top), Math.round(lr.bottom)]);
  ok(`${tag}: inputs at least 16px`, !fontOk().length, fontOk());
  scrollTo(0, 0); await wait(100);

  document.head.append(touch); await wait(50);
  last.scrollIntoView({ block: 'center' });
  const card = last;
  await wait(100);
  const more = card.querySelector('.more'), check = card.querySelector('.check'), dot = card.querySelector('.dot');
  ok(`${tag}: menu button has 44px touch area`, hit(more), span(more));
  ok(`${tag}: check has 44px touch area`, hit(check), span(check));
  ok(`${tag}: day dot is 44px tall to touch`, span(dot)[1] >= 44, span(dot));
  const ck = check.getBoundingClientRect(), mr = more.getBoundingClientRect();
  ok(`${tag}: check and menu do not overlap`, inside(check, ck.right - 3, ck.top + ck.height / 2) && inside(more, mr.left + 2, mr.top + mr.height / 2));
  scrollTo(0, 0); await wait(100);

  for (const [name, open, ov] of [['settings', () => $('setBtn').click(), 'setOv'], ['summary', () => openSummary(), 'sumOv'], ['form', () => openForm(), 'formOv']]) {
    open(); await wait(600);
    const o = $(ov), sheet = o.querySelector('.sheet'), sr = sheet.getBoundingClientRect();
    const close = o.classList.contains('tab-page') ? $('todayTab') : o.querySelector('[data-close], .page-head .icon-btn');
    const scrolls = sheet.scrollHeight <= sheet.clientHeight + 1 || ['auto', 'scroll'].includes(getComputedStyle(sheet).overflowY);
    ok(`${tag}: ${name} fits or scrolls, close visible`, sr.top >= -1 && sr.bottom <= innerHeight + 1 && scrolls && close && inView(close) && hit(close), [Math.round(sr.top), Math.round(sr.bottom), innerHeight, scrolls, close && inView(close), close && span(close), close?.className]);
    if (name === 'form') {
      sheet.scrollTop = 1e6; await wait(250);
      ok(`${tag}: form save button reachable`, inView($('submit')) && inside($('submit'), $('submit').getBoundingClientRect().left + 20, $('submit').getBoundingClientRect().top + 10));
      ok(`${tag}: inputs in open form at least 16px`, !fontOk().length, fontOk());
    }
    closeOverlay(o); await wait(450);
  }
  touch.remove();
}
ok('code field has one-time-code', $('acctCode').autocomplete === 'one-time-code');
ok('email field has autocomplete email', $('acctEmailInput').autocomplete === 'email' && parseFloat(getComputedStyle($('acctEmailInput')).fontSize) >= 16);
ok('enter key hints set', $('helpQ').enterKeyHint === 'search' && $('acctEmailInput').enterKeyHint === 'send' && $('name').enterKeyHint === 'done');
ok('viewport resizes with keyboard', document.querySelector('meta[name=viewport]').content.includes('interactive-widget=resizes-content'));
ok('viewport height helper', viewportHeight() > 0 && viewportHeight() <= innerHeight + 1);

await size(390, 844);
const hlen = history.length;
$('setBtn').click(); await wait(500);
openName(false); await wait(500);
ok('one history entry for open sheets', history.state?.sheet === true, history.state);
history.back(); await wait(500);
ok('back closes top sheet only', !$('nameOv')._shown && $('setOv')._shown);
history.back(); await wait(500);
ok('second back closes settings', !$('setOv')._shown && !shownOverlays().length);
$('setBtn').click(); await wait(500);
closeOverlay($('setOv')); await wait(500);
ok('closing by button keeps page in place', !shownOverlays().length && location.search.includes('test'));
openForm(); await wait(500);
$('name').value = 'Новая'; $('name').dispatchEvent(new Event('input', { bubbles: true }));
history.back(); await wait(500);
ok('back on changed form asks first', $('formOv')._shown && $('confirm')._shown);
closeConfirm(true); await wait(500);
ok('confirm closes form', !$('formOv')._shown && !shownOverlays().length);

fe.style.maxWidth = ''; fe.style.width = w0; fe.style.height = h0; await wait(150); render(); await wait(200);
{
  const vg = o => viewportGap({ ios: true, standalone: true, typing: false, inner: 588, full: 874, ...o });
  ok('stuck iOS viewport after keyboard is measured', vg({}) === 286);
  ok('no shift while typing, in Safari, on Android or for status bar', vg({ typing: true }) === 0 && vg({ standalone: false }) === 0 && vg({ ios: false }) === 0 && vg({ inner: 812 }) === 0);
  const root = document.documentElement, fab = $('fab'), ov = $('histOv');
  root.style.setProperty('--vgap', '200px');
  ok('button, sheets and toast follow the shift', getComputedStyle($('tabbar')).bottom === '-190px' && getComputedStyle(ov).bottom === '-200px' && getComputedStyle($('dayOv')).bottom === '-200px');
  root.style.removeProperty('--vgap');
  ok('no shift by default', getComputedStyle($('tabbar')).bottom === '10px' && getComputedStyle(ov).bottom === '0px');
  fixViewport();
  ok('desktop browser gets no shift', !root.style.getPropertyValue('--vgap'));
}

{
  const ago2 = n => key(addDays(new Date(), -n));
  state = normalize({ habits: [{ id: 'sq', name: 'Приседания', icon: 'squat', target: 100, step: 10, unit: 'приседаний', created: ago2(14) }],
    log: Object.fromEntries(Array.from({ length: 9 }, (_, j) => [ago2(j + 5), { sq: 100 }])) });
  viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(700);
  const meta = document.querySelector('.habit .meta'), lead = meta?.querySelector('.m-lead'), warn = meta?.querySelector('.m-warn.on');
  ok('stale badge shown next to counter', !!warn && /дней назад/.test(warn.textContent), meta?.textContent);
  ok('counter not cut by badge', lead && lead.scrollWidth <= lead.clientWidth + 1, lead && [lead.scrollWidth, lead.clientWidth]);
  ok('badge ends with ellipsis when tight', warn && (warn.scrollWidth <= warn.clientWidth + 1 || getComputedStyle(warn).textOverflow === 'ellipsis'));
  ok('badge stays inside meta', warn && warn.getBoundingClientRect().right <= meta.getBoundingClientRect().right + 1);
}

{
  const probe = w => {
    const box = document.createElement('div');
    box.className = 'tiles';
    box.style.cssText = `position:fixed;left:0;top:0;width:${w * 2 + 8}px;grid-template-columns:repeat(2,1fr)`;
    box.innerHTML = '<div class="tile"><div class="l"><span>✅</span>Выполнено</div><div class="v">50%</div></div>';
    document.body.append(box);
    const sp = box.querySelector('.l span'), l = box.querySelector('.l');
    const r = { shown: getComputedStyle(sp).display !== 'none', fits: l.scrollWidth <= l.clientWidth + 1 };
    box.remove();
    return r;
  };
  const phone = probe(170), mini = probe(150), tiny = probe(132);
  ok('tile emoji shown on regular iPhone width', phone.shown && phone.fits, phone);
  ok('tile emoji shown on small iPhone width', mini.shown && mini.fits, mini);
  ok('tile emoji hidden only on very narrow screens', !tiny.shown && tiny.fits, tiny);
}

ok('iOS sheets add no history entry, so the system back swipe cannot show a second screen', usesHistory(true) === false && usesHistory(false) === true);
{
  const rows = els => { const m = new Map(); els.forEach(e => { const r = e.getBoundingClientRect(), k = Math.round(r.top); m.set(k, [...(m.get(k) || []), r]); }); return [...m.values()]; };
  const even = (box, label) => {
    const rs = rows([...box.children].filter(e => e.tagName === 'BUTTON' && e.offsetParent)), b = box.getBoundingClientRect();
    const fullRows = rs.filter(r => r.length === 1).every(([r]) => Math.abs(r.left - b.left) < 1 && Math.abs(r.right - b.right) < 1);
    const pairs = rs.filter(r => r.length > 1).every(r => r.every(x => Math.abs(x.width - r[0].width) < 1));
    const heights = rs.flat().every(r => Math.abs(r.height - rs[0][0].height) < 1);
    ok(`${label}: rows even, single item spans full width, equal heights`, fullRows && pairs && heights, rs.map(r => r.map(x => [Math.round(x.left), Math.round(x.width), Math.round(x.height)])));
  };
  ['Учёба', 'Физическая подготовка', 'Здоровье'].forEach(n => addCategory(n));
  openForm(); await wait(500);
  even($('schedSeg'), 'schedule options');
  even($('catChips'), 'categories (odd count)');
  ok('add category button spans full width', Math.abs($('catChips').querySelector('.add-chip').getBoundingClientRect().width - $('catChips').getBoundingClientRect().width) < 1);
  closeOverlay($('formOv')); await wait(400);
  addCategory('Работа');
  openForm(); await wait(500);
  even($('catChips'), 'categories (even count)');
  const cs = [...$('colors').children].map(e => e.getBoundingClientRect()), cr = rows([...$('colors').children]);
  ok('colors in two equal rows', cr.length === 2 && cr[0].length === cr[1].length && cr[0].every((r, i) => Math.abs(r.left - cr[1][i].left) < 1), cr.map(r => r.length));
  const sub = $('formOv').querySelector('.form > .form-actions .primary');
  ok('submit label stays on one line', sub.scrollWidth <= sub.clientWidth + 1 && getComputedStyle(sub).whiteSpace === 'nowrap');
  closeOverlay($('formOv')); await wait(400);
}

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
