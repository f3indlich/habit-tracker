window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n)), ahead = n => key(addDays(new Date(), n));

const log = {}, notes = {}, skip = {};
for (let i = 0; i < 90; i++) log[ago(i)] = { z: i % 3 ? 1 : 0, v: i % 4 ? 8 : 3, s: 9000 + i * 137, q: i ? 100 : 40, c: i % 2, m: i % 5 ? 1 : 0, w: i % 7 ? 1 : 0 };
notes[ago(1)] = { z: 'Сделал всё, кроме планки: болела спина после вчерашней тренировки в зале и долгой прогулки' };
skip[ago(4)] = { c: 1 };
state = normalize({
  categories: [{ id: 'a', name: 'Здоровье и спорт' }, { id: 'b', name: 'Учёба, языки и саморазвитие на каждый день' }],
  habits: [
    { id: 'z', name: 'Утренняя зарядка с растяжкой, планкой и дыхательными упражнениями', icon: 'strong', color: '#22c55e', created: ago(89), cat: 'a', time: 'morning', why: 'Чтобы спина не болела и было больше сил на весь день' },
    { id: 'v', name: 'Вода', icon: 'water', color: '#3b82f6', target: 8, unit: 'стаканов', created: ago(89), cat: 'a', time: 'any' },
    { id: 's', name: 'Шаги', icon: 'walk', color: '#0ea5e9', target: 10000, step: 1000, unit: 'шагов', created: ago(89), cat: 'a', time: 'day' },
    { id: 'q', name: 'Испанский язык: карточки и грамматика', icon: 'books', color: '#8b5cf6', target: 100, unit: 'вопросов', created: ago(89), cat: 'b', time: 'evening' },
    { id: 'c', name: 'Чтение', icon: 'books', color: '#f97316', created: ago(89), cat: 'b', time: 'evening', schedule: { type: 'weekdays', days: [1, 3, 5] } },
    { id: 'm', name: 'Медитация', icon: 'meditate', color: '#14b8a6', created: ago(89), time: 'morning' },
    { id: 'w', name: 'Прогулка перед сном', icon: 'walk', color: '#ec4899', created: ago(89), time: 'evening', archived: ago(3) },
  ],
  log, notes, skip,
  goals: [
    { id: 'g1', title: 'Сдать теорию ПДД с первого раза и без единой ошибки на экзамене в ГИБДД', start: ago(10), due: ahead(15), status: 'active', total: 800, unit: 'вопросов', auto: true, habitIds: ['q'], note: 'Решать билеты каждый вечер, ошибки разбирать отдельно и повторять через день', steps: [
      { id: 's1', text: 'Билеты 1–10', done: true, order: 0, updatedAt: 1 },
      { id: 's2', text: 'Разобрать все ошибки из пробных экзаменов и выписать правила, в которых путаюсь чаще всего', done: false, order: 1, updatedAt: 1 },
      { id: 's3', text: 'Пробный экзамен', done: false, order: 2, updatedAt: 1 },
    ], dueHistory: [{ at: Date.now() - 5e8, from: ahead(5), to: ahead(15) }], createdAt: 1, updatedAt: 1 },
    { id: 'g2', title: 'Прочитать 5 книг', start: ago(20), due: ahead(40), status: 'active', habitIds: ['c', 'm'], steps: [], dueHistory: [], createdAt: 1, updatedAt: 1 },
    { id: 'g3', title: 'Пробежать полумарафон', start: ago(60), due: ago(2), status: 'active', total: 21, done: 9, unit: 'км', habitIds: [], steps: [], dueHistory: [], createdAt: 1, updatedAt: 1 },
    { id: 'g4', title: 'Выучить 500 слов', start: ago(60), due: ago(10), status: 'done', finishedAt: ago(12), habitIds: [], steps: [{ id: 'x', text: 'Первые сто', done: true, order: 0, updatedAt: 1 }], dueHistory: [], createdAt: 1, updatedAt: 1 },
  ],
});
viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); await wait(400);
ok('stress data loaded', state.habits.length === 7 && state.goals.length === 4, [state.habits.length, state.goals.length]);
if (window.__seedOnly) return R.join('\n');

const still = document.createElement('style');
still.textContent = '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }';
const probe = document.createElement('style');
probe.textContent = '* { pointer-events: auto !important; } *::before, *::after { pointer-events: none !important; }';
document.head.append(still);

const FLOAT = '.fab, .toast, #toast, .tip, .menu, .pop';
const desc = el => el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.textContent.trim() ? ' «' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) + '»' : '')) : '';
const shown = el => {
  for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false;
  }
  return true;
};
const pinned = (el, root) => { for (let e = el; e && e !== root && e !== document.documentElement; e = e.parentElement) if (/sticky|fixed/.test(getComputedStyle(e).position)) return e; return null; };
const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
const solid = el => {
  if (el.matches('button, a, input, textarea, select, img, svg, [role=button], [role=switch]')) return true;
  if (el instanceof SVGElement) return true;
  const s = getComputedStyle(el);
  return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none' || ownText(el);
};
const boxed = el => {
  const s = getComputedStyle(el);
  return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none' || parseFloat(s.borderLeftWidth) > 0;
};
const clippers = el => {
  const out = [];
  for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') out.push([e, s]);
  }
  return out;
};

const seen = new Set(), problems = [];
const report = (where, msg) => { const k = where + ' | ' + msg; if (!seen.has(msg)) { seen.add(msg); problems.push(k); } };

function scanText(where, root) {
  const vw = innerWidth, vh = innerHeight;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 2 });
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement;
    if (!p || !shown(p) || p.closest('[inert], script, style, .sr, .sr-only, .visually-hidden, option')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const snippet = n.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
    const lines = [...range.getClientRects()].filter(r => r.width >= 2);
    const letters = n.textContent.replace(/\s+/g, '').length;
    if (letters >= 8 && lines.length >= 3 && letters / lines.length < 4 && !p.closest('.wk, .dots, .days, .cal, .mh, svg')) report(where, `text squeezed into a narrow column: «${snippet}» (${lines.length} lines)`);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      let L = r.left, Rt = r.right, T = r.top, B = r.bottom, hidden = false;
      for (const [c, s] of clippers(p)) {
        const cr = c.getBoundingClientRect();
        const scrollX = /auto|scroll/.test(s.overflowX), scrollY = /auto|scroll/.test(s.overflowY);
        if (Rt <= cr.left + 1 || L >= cr.right - 1 || B <= cr.top + 1 || T >= cr.bottom - 1) { hidden = true; break; }
        const ell = s.textOverflow === 'ellipsis' || getComputedStyle(p).textOverflow === 'ellipsis';
        const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none';
        if (!scrollX && !ell && (L < cr.left - 1.5 || Rt > cr.right + 1.5) && s.overflowX !== 'visible') report(where, `text cut sideways: «${snippet}» in ${desc(c)}`);
        if (!scrollY && !clamp && (T < cr.top - 3 || B > cr.bottom + 3) && s.overflowY !== 'visible') report(where, `text cut vertically: «${snippet}» in ${desc(c)}`);
        L = Math.max(L, cr.left); Rt = Math.min(Rt, cr.right); T = Math.max(T, cr.top); B = Math.min(B, cr.bottom);
      }
      if (hidden) continue;
      if (Rt > vw + 1 && !p.closest('.days-vp')) report(where, `text beyond screen edge: «${snippet}»`);
      const box = p.closest('button, .chip, .badge, [role=button]');
      if (box && box !== root && boxed(box) && !clippers(p).some(([c]) => box.contains(c) || c === box)) {
        const br = box.getBoundingClientRect();
        if (r.left < br.left - 1 || r.right > br.right + 1) report(where, `text spills out of ${desc(box)}`);
      }
      const y = (T + B) / 2;
      if (y < 0 || y > vh) continue;
      for (const x of [L + 2, (L + Rt) / 2, Rt - 2]) {
        if (x < 0 || x > vw || Rt - L < 4) continue;
        for (const el of document.elementsFromPoint(x, y)) {
          if (el === p || p.contains(el) || el.contains(p)) break;
          if (el.closest(FLOAT) && !p.closest(FLOAT)) break;
          if (!shown(el) || !solid(el)) continue;
          const pin = root.contains(el) ? pinned(el, root) : null;
          if (pin && !pin.contains(p)) break;
          if (el instanceof SVGElement && (el.ownerSVGElement || el).parentElement.contains(p)) continue;
          report(where, `«${snippet}» (${desc(p)}) covered by ${desc(el)}`);
          break;
        }
      }
    }
  }
}

const scroller = () => {
  const ov = shownOverlays().pop();
  if (!ov) return null;
  const sh = ov.querySelector('.sheet');
  return [sh, ...sh.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) || sh;
};
async function audit(where) {
  document.head.append(probe);
  const ov = shownOverlays().pop(), root = ov ? ov.querySelector('.sheet') : document.querySelector('.wrap');
  const sc = scroller();
  const docW = document.documentElement.scrollWidth;
  if (docW > innerWidth + 1) report(where, `page scrolls sideways: ${docW} > ${innerWidth}`);
  if (sc && sc.scrollWidth > sc.clientWidth + 1 && !/hidden|clip/.test(getComputedStyle(sc).overflowX)) report(where, `sheet scrolls sideways: ${desc(sc).slice(0, 40)} ${sc.scrollWidth} > ${sc.clientWidth}`);
  const steps = [];
  if (sc) { for (let t = 0; t < sc.scrollHeight; t += Math.max(200, sc.clientHeight * 0.7)) steps.push(t); }
  else { for (let t = 0; t < document.documentElement.scrollHeight; t += Math.max(200, innerHeight * 0.7)) steps.push(t); }
  for (const t of steps.length ? steps : [0]) {
    if (sc) sc.scrollTop = t; else scrollTo(0, t);
    await wait(30);
    scanText(where, root);
  }
  if (sc) sc.scrollTop = 0; else scrollTo(0, 0);
  for (const m of document.querySelectorAll('.menu, .pop')) if (shown(m)) scanText(where + ' menu', m);
  probe.remove();
  if (__errs.length) { report(where, 'errors: ' + __errs.join('; ')); __errs.length = 0; }
}
const stateOf = b => b.getAttribute('aria-pressed') ?? b.getAttribute('aria-checked') ?? b.getAttribute('aria-selected') ?? (b.classList.contains('on') || b.classList.contains('active') ? 'true' : null);
async function segments(where, root, skipIds = []) {
  for (const seg of root.querySelectorAll('.seg, .pseg, .mini-seg, .plan-seg')) {
    if (!shown(seg) || skipIds.includes(seg.id) || seg.closest('[inert]')) continue;
    const list = () => [...seg.querySelectorAll(':scope > button')].filter(x => !x.disabled && shown(x));
    const btns = list();
    for (let i = 0; i < btns.length; i++) {
      const b = list()[i];
      if (!b) continue;
      const label = b.textContent.trim() || b.getAttribute('aria-label') || '?';
      const before = (shownOverlays().pop()?.querySelector('.sheet') || document.body).innerHTML.length;
      b.click(); await wait(250);
      const live = b.isConnected ? b : [...(seg.isConnected ? seg : root).querySelectorAll('button')].find(x => (x.textContent.trim() || x.getAttribute('aria-label')) === label);
      if (live && stateOf(live) !== null && stateOf(live) !== 'true') report(where, `switch «${label}» in #${seg.id || seg.className} did not become active`);
      await audit(`${where} → ${label}`);
      void before;
    }
    if (list()[0]) { list()[0].click(); await wait(200); }
  }
}
const dropMenus = () => { closeMenu(); document.querySelectorAll('.menu').forEach(m => m.remove()); };
const closeAll = async () => { dropMenus(); for (const ov of shownOverlays().reverse()) closeOverlay(ov); await wait(400); };

async function pass(label) {
  await closeAll();
  render(); await wait(300);
  await audit(`${label} main`);
  $('archToggle').click(); await wait(300); await audit(`${label} main archive open`); $('archToggle').click(); await wait(200);
  $('viewBtn').click(); await wait(400); await audit(`${label} view page`);
  const modes = [...$('viewSeg').querySelectorAll('button')];
  for (const b of modes) {
    const lab = b.textContent.trim();
    b.click(); await wait(200); closeOverlay($('viewOv')); await wait(400);
    await audit(`${label} main view «${lab}»`);
    $('viewBtn').click(); await wait(400);
  }
  modes[0].click(); await wait(200); await closeAll();
  const more = document.querySelector('.habit .more');
  if (more) { more.click(); await wait(300); await audit(`${label} habit menu`); dropMenus(); await wait(200); }
  for (const h of state.habits) {
    openHistory(h.id); await wait(250);
    await audit(`${label} habit «${h.name.slice(0, 12)}»`);
    await segments(`${label} habit «${h.name.slice(0, 12)}»`, $('hSheet'));
    for (const i of [...$('hSheet').querySelectorAll('.tile-i, .plan-i')].slice(0, 2)) { i.click(); await wait(300); await audit(`${label} habit popover`); dropMenus(); await wait(150); }
    await closeAll();
  }
  openDay('z', addDays(new Date(), -1)); await wait(250); await audit(`${label} day sheet`); await closeAll();
  openDay('v', new Date()); await wait(250); await audit(`${label} day sheet quant`); await closeAll();
  openSummary(); await wait(300); await audit(`${label} summary`);
  await segments(`${label} summary`, $('sSheet'));
  await closeAll();
  openForm(); await wait(250); await audit(`${label} new habit form`);
  await segments(`${label} new habit form`, $('formOv'));
  await closeAll();
  openForm('s'); await wait(250); await audit(`${label} edit habit form`); await closeAll();
  openCats(); await wait(250); await audit(`${label} categories`); await closeAll();
  $('setBtn').click(); await wait(250); await audit(`${label} settings`);
  await segments(`${label} settings`, $('setOv'), ['themeSeg']);
  await closeAll();
  openHelp(); await wait(250); await audit(`${label} help`); await closeAll();
  $('acctBtn').click(); await wait(250); await audit(`${label} account`); await closeAll();
  openName(false); await wait(250); await audit(`${label} name`); await closeAll();
  openGoals(); await wait(250); await audit(`${label} goals list`);
  await segments(`${label} goals list`, $('goalsOv'));
  for (const g of state.goals) { openGoal(g.id); await wait(250); await audit(`${label} goal «${g.title.slice(0, 12)}»`); }
  await closeAll();
  openGoalForm(); await wait(250); await audit(`${label} new goal form`);
  $('gfMore').open = true; await wait(200); await audit(`${label} new goal form more`); await closeAll();
  openGoalForm(state.goals[0], 'edit'); await wait(250); $('gfMore').open = true; await wait(200); await audit(`${label} edit goal form`); await closeAll();
  askConfirm('Удалить привычку «Утренняя зарядка с растяжкой, планкой и дыхательными упражнениями»?', 'Это действие нельзя отменить. История отметок и заметки тоже будут удалены.', 'Удалить'); await wait(250); await audit(`${label} confirm`); closeConfirm(false); await wait(400);
  toast('Привычка «Утренняя зарядка с растяжкой, планкой и дыхательными упражнениями» перенесена в архив', 'Отменить', () => {}); await wait(400);
  document.head.append(probe); scanText(`${label} toast`, $('toast')); probe.remove(); hideToast(); await wait(300);
  openOnboarding(); await wait(300); await audit(`${label} onboarding`); await closeAll();
}

const fe = frameElement, w0 = fe.style.width, h0 = fe.style.height;
const size = async (w, h) => { fe.style.maxWidth = 'none'; fe.style.width = w + 'px'; fe.style.height = h + 'px'; await wait(200); render(); await wait(300); };
const theme0 = document.documentElement.dataset.theme;
for (const [w, h, th] of [[320, 640, 'light'], [393, 852, 'light'], [393, 852, 'dark'], [768, 1024, 'light']]) {
  await size(w, h);
  document.documentElement.dataset.theme = th;
  await pass(`${w}px ${th}`);
}
if (theme0) document.documentElement.dataset.theme = theme0; else delete document.documentElement.dataset.theme;
fe.style.maxWidth = ''; fe.style.width = w0; fe.style.height = h0; await wait(150);
still.remove(); await closeAll();
window.__layoutProblems = problems;
ok('no layout problems on any screen', problems.length === 0, problems.slice(0, 60));
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
