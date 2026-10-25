import { $, addDays, COLORS, DAY_C, days, EASE, esc, fmtLong, GROUP_STORE, HERO_C, isDue, isToday, key, MONTHS_SHORT, parseKey, reducedMotion, RING_C, schedText, setPref, STORE, TIMES, todayKey, VIEW_STORE, VIEWS, weekday, WEEKDAYS, withYear } from './core.js?v=1.00a';
import { IC, setIcon } from './icons.js?v=1.00a';
import { activeOn, count, dayProgress, findHabit, isSkipped, lifeEnd, load, missBadge, perfectStreak, save, setCount, setMap, setSkip, setState, state, stepDown, stepOf, stepUp, streak, units } from './storage.js?v=1.00a';
import { askConfirm, buildSegments, closeMenu, closeOverlay, countTo, flash, menuEl, openMenu, openOverlay, openPopover, paintSegments, rollNumber, SEG_MAX, shownOverlays, toast } from './ui.js?v=1.00a';
import { openCats, openForm } from './form.js?v=1.00a';
import { dayTip, hist, openHistory, renderHistory, setHist } from './history.js?v=1.00a';
import { userName } from './settings.js?v=1.00a';

export let viewDate = new Date();
export const cards = new Map();

export function habitMenu(anchor, id) {
  const h = findHabit(id), c = count(h, viewDate), skipped = isSkipped(h, viewDate);
  const dayWord = isToday(viewDate) ? 'сегодня' : 'в этот день';
  openMenu(anchor, [
    { icon: IC.history, label: 'История и статистика', run: () => openHistory(id) },
    '-',
    h.target > 1 && c < h.target && { icon: IC.full, label: 'Выполнить полностью', run: () => changeCount(h, viewDate, h.target) },
    h.target > 1 && c > 0 && { icon: IC.minus, label: h.step ? `Убрать шаг (−${c % h.step || h.step})` : 'Убрать одно повторение', run: () => changeCount(h, viewDate, stepDown(h, c)) },
    c > 0 && { icon: IC.reset, label: 'Сбросить отметку', run: () => changeCount(h, viewDate, 0) },
    (skipped || (isDue(h, viewDate) && !c)) && { icon: IC.skip, label: skipped ? `Отменить пропуск` : `Пропустить ${dayWord}`, run: () => setSkip(h, viewDate, !skipped) },
    '-',
    { icon: IC.edit, label: 'Изменить', run: () => openForm(id) },
    { icon: IC.order, label: 'Изменить порядок', run: () => setReorder(true) },
    { icon: IC.archive, label: 'В архив', run: () => archiveHabit(id) },
  ].filter(Boolean));
}

export const GROUPS = {
  time: { label: 'По времени дня', hint: 'Утро, день, вечер' },
  custom: { label: 'По типам', hint: 'Ваши группы, например «Спорт»' },
  none: { label: 'Одним списком', hint: 'Без групп, в Вашем порядке' },
};
export let groupMode = 'time';
export const catName = id => state.categories.find(c => c.id === id)?.name;

export function sectionDefs() {
  const defs = groupMode === 'time' ? TIMES.map(t => ({ id: 't:' + t.v, label: `${t.icon} ${t.v === 'any' ? 'В любое время' : t.label}` }))
    : groupMode === 'custom' ? [...state.categories.map(c => ({ id: 'c:' + c.id, label: c.name })), { id: 'c:', label: 'Без типа' }]
    : [{ id: 'all', label: '' }];
  return [...defs, { id: 'off', label: '💤 Не по расписанию' }];
}
export function sectionOf(h) {
  if (!isDue(h, viewDate) && !count(h, viewDate)) return 'off';
  return groupMode === 'time' ? 't:' + h.time : groupMode === 'custom' ? 'c:' + (h.cat || '') : 'all';
}

export const sectionEls = new Map();
export function sectionEl(id) {
  let el = sectionEls.get(id);
  if (!el) {
    el = document.createElement('section');
    el.className = 'section';
    el.hidden = true;
    el.innerHTML = `<div class="sec-h"><span class="sec-t"></span><span class="cnt"></span></div><div class="list"></div>`;
    sectionEls.set(id, el);
  }
  return el;
}

export function buildCard(id) {
  const el = document.createElement('div');
  el.className = 'card habit enter';
  if (firstRender) el.style.animationDelay = Math.min(entering++, 10) * 40 + 'ms';
  el.innerHTML = `
    <div class="hicon"></div>
    <div class="info" tabindex="0" role="button" title="История и статистика">
      <div class="name"></div>
      <div class="meta"><span class="m-lead"></span><span class="m-streak"></span><span class="badge warn m-warn"><span class="w-long"></span></span></div>
      <div class="dots">${'<div class="dcol"><span class="dw"></span><button class="dot"></button></div>'.repeat(7)}</div>
    </div>
    <div class="ctl">
    <button class="step-minus idle" title="Убрать одно повторение">${IC.minus}</button>
    <button class="check">
      <svg class="ring" viewBox="0 0 48 48">
        <circle class="track" cx="24" cy="24" r="22"/>
        <circle class="prog" cx="24" cy="24" r="22" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>
      </svg>
      <span class="flash"></span>
      <svg class="ic plus" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>
      <span class="num"></span>
      <svg class="tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
    </button>
    <button class="ghost more" title="Действия">${IC.more}</button>
    </div>
    <button class="ghost drag-handle" title="Перетащите, чтобы изменить порядок (или стрелки ↑ ↓)" aria-label="Переместить привычку">${IC.grip}</button>
    <div class="mh"></div>`;
  el.dataset.id = id;
  el.addEventListener('animationend', e => { if (e.target === el) el.classList.remove('enter'); });
  el.querySelector('.mh').addEventListener('pointerover', e => {
    const mh = e.currentTarget, L = stripCache.get(mh.dataset.k), i = e.target.tagName === 'I' ? mh._cells?.indexOf(e.target) : -1;
    if (L && i >= 0) e.target.title = dayTip(findHabit(id), L.days[i]);
  });
  addDrag(el);

  const check = el.querySelector('.check');
  check.onclick = () => {
    if (el._held) { el._held = false; return; }
    const h = findHabit(id), c = count(h, viewDate);
    changeCount(h, viewDate, c >= h.target ? stepDown(h, c) : stepUp(h, c));
  };
  let holdTimer = null, holdShow = null;
  const endHold = () => { clearTimeout(holdTimer); clearTimeout(holdShow); check.classList.remove('holding'); };
  check.addEventListener('pointerdown', e => {
    el._held = false;
    const h = findHabit(id);
    if (e.button !== 0 || h.target === 1 || count(h, viewDate) >= h.target) return;
    holdShow = setTimeout(() => check.classList.add('holding'), 200);
    holdTimer = setTimeout(() => { endHold(); el._held = true; changeCount(h, viewDate, h.target); }, 550);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => check.addEventListener(t, endHold));
  check.addEventListener('contextmenu', e => e.preventDefault());

  el.querySelector('.step-minus').onclick = () => {
    const h = findHabit(id);
    changeCount(h, viewDate, stepDown(h, count(h, viewDate)));
  };
  el.querySelector('.more').onclick = e => habitMenu(e.currentTarget, id);
  el.querySelector('.m-warn').addEventListener('click', e => {
    if (!e.currentTarget.classList.contains('stale') || el._swiped || reordering) return;
    e.stopPropagation();
    staleTip(e.currentTarget, id);
  });
  const info = el.querySelector('.info');
  info.onclick = e => { if (!e.target.closest('.dot') && !el._swiped && !reordering) openHistory(id); };
  addSwipe(el, id);
  info.onkeydown = e => { if (e.target === info && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openHistory(id); } };
  el.querySelectorAll('.dot').forEach((dot, i) => dot.onclick = () => {
    if (el._swiped) return;
    const h = findHabit(id), d = addDays(viewDate, i - 6);
    changeCount(h, d, count(h, d) >= h.target ? 0 : h.target);
  });
  return el;
}

export function staleTip(anchor, id) {
  if (menuEl?._anchor === anchor) return closeMenu();
  const h = findHabit(id), b = missBadge(h);
  if (!b?.stale) return;
  openPopover(anchor, `<div class="pop-title">Давно не было</div>
    <p class="pop-lead">${b.never ? `Привычка «${esc(h.name)}» ещё ни разу не выполнялась` : `Последний раз привычка «${esc(h.name)}» выполнялась ${b.ago}`}</p>
    <div class="pop-sec">Вернуться можно в любой день: просто отметьте выполнение. Если привычка больше не актуальна, перенесите её в архив — история и статистика сохранятся.</div>
    <div class="pop-actions"><button type="button" data-a="keep">Оставить</button><button type="button" class="primary" data-a="arch">В архив</button></div>`, h.color);
  menuEl.querySelector('[data-a=keep]').onclick = closeMenu;
  menuEl.querySelector('[data-a=arch]').onclick = () => { closeMenu(); archiveHabit(id); };
}

export let reordering = false;
export function setReorder(on) {
  if (reordering === on) return;
  reordering = on;
  closeMenu();
  document.body.classList.toggle('reordering', on);
  $('reorderBar').hidden = !on;
  if (on) $('sections').querySelector('.section:not([hidden]) .habit:not(.leaving) .drag-handle')?.focus({ preventScroll: true });
}
$('reorderDone').onclick = () => setReorder(false);

export const liveCards = list => [...list.children].filter(c => c.classList.contains('habit') && !c.classList.contains('leaving'));

export function commitOrder(list) {
  const ids = liveCards(list).map(c => c.dataset.id), set = new Set(ids);
  const byId = new Map(state.habits.map(h => [h.id, h]));
  const slots = state.habits.map((h, i) => set.has(h.id) ? i : -1).filter(i => i >= 0);
  slots.forEach((slot, k) => { state.habits[slot] = byId.get(ids[k]); });
  save();
}

export function flip(els, mutate) {
  const before = new Map(els.map(e => [e, e.getBoundingClientRect().top]));
  mutate();
  if (reducedMotion) return;
  for (const e of els) {
    const d = before.get(e) - e.getBoundingClientRect().top;
    if (d) e.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 220, easing: EASE });
  }
}

export function addDrag(el) {
  const handle = el.querySelector('.drag-handle');
  let drag = null;

  const step = () => {
    if (!drag) return;
    const list = el.parentElement;
    const desired = drag.top0 + (drag.y - drag.y0) + (scrollY - drag.scroll0);
    el.style.transform = `translateY(${desired - el.offsetTop}px)`;
    for (let guard = 0; guard < 100; guard++) {
      const sibs = liveCards(list), i = sibs.indexOf(el);
      const prev = sibs[i - 1], next = sibs[i + 1];
      if (prev && desired < prev.offsetTop + prev.offsetHeight / 2) flip([prev], () => list.insertBefore(el, prev));
      else if (next && desired + el.offsetHeight > next.offsetTop + next.offsetHeight / 2) flip([next], () => list.insertBefore(next, el));
      else break;
    }
    el.style.transform = `translateY(${desired - el.offsetTop}px)`;
    const edge = 70, v = drag.y < edge ? -(edge - drag.y) / 5 : drag.y > innerHeight - edge ? (drag.y - innerHeight + edge) / 5 : 0;
    if (v) { scrollBy(0, v); drag.raf = requestAnimationFrame(step); }
    else drag.raf = null;
  };

  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !reordering) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y0: e.clientY, y: e.clientY, top0: el.offsetTop, scroll0: scrollY, raf: null };
    el.classList.add('dragging');
  });
  handle.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.y = e.clientY;
    if (!drag.raf) step();
  });
  const end = () => {
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    const off = parseFloat(el.style.transform.slice(11)) || 0;
    drag = null;
    el.style.transform = '';
    el.classList.remove('dragging');
    if (off && !reducedMotion) el.animate([{ transform: `translateY(${off}px)` }, { transform: 'none' }], { duration: 200, easing: EASE });
    commitOrder(el.parentElement);
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const list = el.parentElement, sibs = liveCards(list), i = sibs.indexOf(el);
    const other = sibs[e.key === 'ArrowUp' ? i - 1 : i + 1];
    if (!other) return;
    flip([el, other], () => e.key === 'ArrowUp' ? list.insertBefore(el, other) : list.insertBefore(other, el));
    commitOrder(list);
    handle.focus({ preventScroll: true });
  });
}

export function addSwipe(el, id) {
  const LIMIT = 90;
  let start = null, dx = 0, dragging = false;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || reordering || e.target.closest('.ctl, .more, .check, .step-minus, .drag-handle')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dx = 0; dragging = false;
  });
  el.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) {
        if (Math.abs(my) > 12) start = null;
        return;
      }
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('swiping');
    }
    dx = Math.max(-140, Math.min(140, mx));
    el.style.transform = `translateX(${dx * .85}px)`;
    el.style.setProperty('--sw', Math.min(Math.abs(dx) / LIMIT, 1));
    el.classList.toggle('sw-done', dx > 0);
    el.classList.toggle('sw-undo', dx < 0);
  });
  const end = () => {
    if (!start) return;
    start = null;
    if (!dragging) return;
    el._swiped = true;
    setTimeout(() => el._swiped = false, 50);
    el.classList.remove('swiping', 'sw-done', 'sw-undo');
    el.style.removeProperty('--sw');
    el.animate([{ transform: `translateX(${dx * .85}px)` }, { transform: 'none' }], { duration: 300, easing: EASE });
    el.style.transform = '';
    const h = findHabit(id);
    if (dx >= LIMIT) changeCount(h, viewDate, h.target);
    else if (dx <= -LIMIT && (count(h, viewDate) || isSkipped(h, viewDate))) changeCount(h, viewDate, 0, true);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export function changeCount(h, d, n, clearSkip = false) {
  const prev = count(h, d), prevSkip = isSkipped(h, d);
  n = Math.max(0, Math.min(h.target, n));
  if (n === prev && !(clearSkip && prevSkip)) return;
  if (clearSkip && prevSkip) setMap(state.skip, key(d), h.id, 0);
  setCount(h, d, n);
  navigator.vibrate?.(n > prev ? 12 : [6, 40, 6]);
  const wasDone = prev >= h.target, isDone = n >= h.target;
  if (wasDone !== isDone || (n === 0 && prev > 1)) {
    const dayNote = isToday(d) ? '' : ` (${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})`;
    toast(`${h.name}${dayNote}: ${isDone ? 'выполнено' : n ? `${n} из ${h.target}` : 'отметка снята'}`, () => {
      if (!findHabit(h.id)) return;
      setMap(state.log, key(d), h.id, prev);
      if (prevSkip) setMap(state.skip, key(d), h.id, 1);
      save(); render();
    });
  }
}

export function updateCard(el, h) {
  const day = key(viewDate);
  const c = count(h, viewDate), done = c >= h.target, multi = h.target > 1;
  const skipped = isSkipped(h, viewDate), due = isDue(h, viewDate);
  const s = streak(h);

  el.style.setProperty('--c', h.color);
  el.classList.toggle('complete', done);
  el.classList.toggle('skipped', skipped);
  el.classList.toggle('offday', !due && !done);
  el.classList.toggle('has-count', c > 0);
  setIcon(el.querySelector('.hicon'), h.icon);
  const sameDay = el._day === day;
  const u = units(h), ringSvg = el.querySelector('.ring'), segmented = multi && u > 1 && u <= SEG_MAX;
  if (segmented) {
    if (el._segN !== u) { buildSegments(ringSvg, u); el._segN = u; }
    paintSegments(ringSvg, done ? u : Math.floor(c / stepOf(h)), sameDay);
  } else if (el._segN) { ringSvg.querySelectorAll('.seg').forEach(s => s.remove()); el._segN = 0; }
  ringSvg.classList.toggle('segmented', segmented);
  el.querySelector('.prog').style.strokeDashoffset = RING_C * (1 - c / h.target);
  const check = el.querySelector('.check');
  check.title = done ? (multi ? 'Выполнено — нажмите, чтобы убрать последнее повторение' : 'Выполнено — нажмите, чтобы снять отметку')
    : multi ? `Нажмите: +${stepOf(h)} · удерживайте: выполнить целиком` : 'Отметить выполненной';
  check.setAttribute('aria-label', `${h.name}: ${multi ? `${c} из ${h.target}` : done ? 'выполнено' : 'не выполнено'}. ${check.title}`);
  check.setAttribute('aria-pressed', done);
  const minusBtn = el.querySelector('.step-minus');
  minusBtn.hidden = !multi;
  minusBtn.classList.toggle('idle', c === 0);
  minusBtn.disabled = c === 0;

  const num = el.querySelector('.num');
  const numText = multi && c > 0 && c < h.target ? String(c) : '';
  num.classList.toggle('long', numText.length > 3);
  minusBtn.title = h.step ? `Убрать шаг (−${c % h.step || h.step})` : 'Убрать одно повторение';
  if (numText) rollNumber(num, numText, c > (el._c ?? c) ? 1 : -1, sameDay);
  else if (!done) rollNumber(num, '', 1, false);
  const grew = sameDay && c > (el._c ?? c);
  if (grew && !reducedMotion) {
    flash(el.querySelector('.flash'));
  }
  el._day = day; el._c = c;

  el.querySelector('.name').textContent = h.name;
  const meta = el.querySelector('.meta');
  const lead = skipped ? '<span class="badge skip">Пропущено</span>'
    : multi ? `<span>${c} / ${h.target}${h.unit ? ' ' + esc(h.unit) : ''}</span>`
    : `<span>${esc(schedText(h)[0].toUpperCase() + schedText(h).slice(1))}</span>`;
  const badge = isToday(viewDate) && !skipped && due ? missBadge(h) : null, warn = !!badge;
  if (meta.dataset.lead !== lead) {
    meta.querySelector('.m-lead').innerHTML = lead; meta.dataset.lead = lead;
    if (multi && grew && !reducedMotion) meta.querySelector('.m-lead > span').animate([{ color: h.color }, { color: h.color, offset: .35 }, {}], { duration: 700, easing: 'ease-out' });
  }
  const st = meta.querySelector('.m-streak');
  st.textContent = s ? `🔥 ${days(s)}` : st.textContent;
  st.classList.toggle('on', !!s);
  const warnEl = meta.querySelector('.m-warn');
  warnEl.classList.toggle('on', warn);
  if (warn) {
    warnEl.title = badge.title;
    warnEl.classList.toggle('calm', badge.calm);
    warnEl.classList.toggle('stale', !!badge.stale);
    const room = meta.clientWidth - meta.querySelector('.m-lead').offsetWidth - (s ? meta.querySelector('.m-streak').scrollWidth + 8 : 0) - 8;
    const label = warnEl.querySelector('.w-long');
    for (const t of badge.texts) { label.textContent = t; if (label.offsetWidth + 14 <= room) break; }
    if (label.offsetWidth + 14 > room) warnEl.classList.remove('on');
  }

  const todayK = todayKey();
  el.querySelectorAll('.dcol').forEach((col, i) => {
    const d = addDays(viewDate, i - 6), k = key(d), v = count(h, d), dot = col.lastElementChild;
    dot.className = 'dot ' + (v >= h.target ? 'full' : v > 0 ? 'part' : isSkipped(h, d) ? 'skip' : !isDue(h, d) ? 'off' : '');
    col.classList.toggle('cur', i === 6);
    col.classList.toggle('today', k === todayK);
    dot.textContent = d.getDate();
    dot.disabled = k > todayK || k < h.created;
    dot.title = dayTip(h, d);
    col.firstElementChild.textContent = WEEKDAYS[weekday(d)];
  });

  const mh = el.querySelector('.mh');
  const view = VIEWS[document.body.dataset.view];
  if (!view.cells) return;
  const layoutKey = `${view.id}|${day}`;
  const L = stripLayout(view, layoutKey);
  if (mh.dataset.k !== layoutKey) { mh.dataset.k = layoutKey; mh.className = `mh ${L.cls}`; mh.innerHTML = L.html; mh._cells = [...mh.querySelectorAll('i')]; }
  const { log, skip } = state, id = h.id, tgt = h.target, end = lifeEnd(h);
  let dueN = 0, fullN = 0;
  mh._cells.forEach((cell, i) => {
    const k = L.keys[i], v = log[k]?.[id] || 0, sk = !!skip[k]?.[id], out = k > todayK || k < h.created;
    const cls = (out ? 'x' : v >= tgt ? 'l3' : v * 2 >= tgt ? 'l2' : v > 0 ? 'l1' : sk ? 'sk' : '')
      + (k === day ? ' cur' : '');
    if (cell.className !== cls) cell.className = cls;
    if (!out && k <= end && !sk && (!h.days || h.days.includes(L.wd[i])) && !(k === todayK && v < tgt)) { dueN++; if (v >= tgt) fullN++; }
  });
  mh.querySelector('.sh-r').textContent = dueN ? `${fullN} из ${days(dueN)} · ${Math.round(fullN / dueN * 100)}%` : 'пока нет данных';
}

export const stripCache = new Map();
export function stripLayout(view, cacheKey) {
  let L = stripCache.get(cacheKey);
  if (!L) {
    if (stripCache.size > 8) stripCache.clear();
    L = buildStripLayout(view);
    L.keys = L.days.map(key);
    L.wd = L.days.map(weekday);
    stripCache.set(cacheKey, L);
  }
  return L;
}
export function buildStripLayout(view) {
  const vd = viewDate, mon = d => MONTHS_SHORT[d.getMonth()];
  if (view.cells === 'days') {
    const n = view.days, days = Array.from({ length: n }, (_, i) => addDays(vd, i - n + 1));
    const col = [], tracks = [];
    days.forEach((d, i) => {
      if (i > 0 && weekday(d) === 0) tracks.push('4px');
      tracks.push('minmax(0, 1fr)');
      col.push(tracks.length);
    });
    let html = '', end = -1;
    days.forEach((d, i) => {
      const first = d.getDate() === 1;
      const soonFirst = days.slice(i + 1, i + 4).some(x => x.getDate() === 1);
      let text = null, span = 2;
      if (i === 0 || first) { text = `${d.getDate()} ${mon(d)}`; span = 4; }
      else if (weekday(d) === 0 && !soonFirst) text = String(d.getDate());
      if (text && i > end && i + span <= n + 1) { html += `<span class="sl" style="grid-column:${col[i]} / span ${span}">${text}</span>`; end = i + span - 1; }
    });
    return {
      cls: 'row', days,
      html: `<div class="sh"><span>${view.head}</span><b class="sh-r"></b></div><div class="srow" style="grid-template-columns:${tracks.join(' ')}">${days.map((_, i) => `<i style="grid-column:${col[i]}"></i>`).join('')}${html}</div>`,
    };
  }
  const W = view.weeks, start = addDays(vd, -weekday(vd) - (W - 1) * 7);
  const days = Array.from({ length: W * 7 }, (_, i) => addDays(start, i));
  let months = '', end = -1;
  for (let c = 0; c < W; c++) {
    const wk = days.slice(c * 7, c * 7 + 7), firstOf = wk.find(d => d.getDate() === 1);
    const label = firstOf || (c === 0 && !days.slice(7, 21).some(d => d.getDate() === 1) ? wk[0] : null);
    if (label && c > end) { months += `<span class="ml" style="grid-column:${c + 2} / span 3">${mon(label)}</span>`; end = c + 2; }
  }
  const wl = [0, 2, 4].map(r => `<span class="wl" style="grid-row:${r + 2}">${WEEKDAYS[r]}</span>`).join('');
  const cells = days.map((_, i) => `<i style="grid-area:${(i % 7) + 2} / ${Math.floor(i / 7) + 2}"></i>`).join('');
  return {
    cls: W > 20 ? 'y' : 'q', days,
    html: `<div class="sh"><span>${view.head}</span><b class="sh-r"></b></div><div class="sgrid" style="--w:${W}">${months}${wl}${cells}</div>`,
  };
}

export function renderLegend() {
  const v = VIEWS[document.body.dataset.view];
  $('viewLegend').hidden = !state.habits.some(h => !h.archived);
  $('viewLegend').classList.toggle('round', !v.cells);
  $('viewLegend').title = v.label;
  $('viewLegend').innerHTML = `<span><i class="lg3"></i>выполнено</span><span><i class="lg1"></i>частично</span>
    <span><i class="lgs"></i>пропуск</span>${v.cells ? '' : '<span><i class="lgo"></i>не в плане</span>'}`;
}

export function removeCard(el) {
  el.classList.add('leaving');
  if (reducedMotion) return el.remove();
  const h = el.offsetHeight;
  el.animate([
    { opacity: 1, transform: 'none', height: h + 'px' },
    { opacity: 0, transform: 'translateX(-16px)', height: h + 'px', offset: .45 },
    { opacity: 0, transform: 'translateX(-16px)', height: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0, marginBottom: '-10px' },
  ], { duration: 420, easing: EASE }).onfinish = () => el.remove();
}

export let wasAllDone = null;
export let firstRender = true, entering = 0;
export function render() {
  const now = new Date(), hr = now.getHours();
  const uname = userName();
  $('setNameVal').textContent = uname || 'Не указано';
  $('hello').innerHTML = isToday(viewDate)
    ? esc(hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер') + (uname ? ', ' + esc(uname) : '') +
      ` · <span class="hello-date">${withYear(now.toLocaleDateString('ru-RU'))}</span>`
    : esc(viewDate.toLocaleDateString('ru-RU', { weekday: 'long' }));
  const otherYear = viewDate.getFullYear() !== now.getFullYear();
  $('title').textContent = isToday(viewDate) ? 'Сегодня'
    : otherYear ? withYear(viewDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }))
    : viewDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  $('todayBtn').hidden = isToday(viewDate);
  renderWeek();

  const active = state.habits.filter(h => !h.archived);
  const habits = activeOn(viewDate);
  $('empty').hidden = active.length > 0;
  document.body.classList.toggle('no-habits', !active.length);
  $('hint').hidden = !active.length;

  const ids = new Set(habits.map(h => h.id));
  for (const [id, el] of cards) if (!ids.has(id)) { cards.delete(id); removeCard(el); }

  const defs = sectionDefs();
  const bySection = Object.fromEntries(defs.map(s => [s.id, []]));
  for (const h of habits) (bySection[sectionOf(h)] ?? bySection.off).push(h);

  const box = $('sections');
  let prevSec = null;
  for (const s of defs) {
    const sec = sectionEl(s.id);
    const want = prevSec ? prevSec.nextElementSibling : box.firstElementChild;
    if (sec !== want) box.insertBefore(sec, want);
    prevSec = sec;
    sec.querySelector('.sec-t').textContent = s.label;
    sec.classList.toggle('plain', !s.label);
  }

  const nextLive = n => { while (n && n.classList.contains('leaving')) n = n.nextElementSibling; return n; };
  for (const s of defs) {
    const sec = sectionEl(s.id), list = sec.querySelector('.list'), hs = bySection[s.id];
    let prev = null;
    for (const h of hs) {
      let el = cards.get(h.id);
      if (!el) { el = buildCard(h.id); cards.set(h.id, el); }
      const want = nextLive(prev ? prev.nextElementSibling : list.firstElementChild);
      if (el !== want) list.insertBefore(el, want);
      prev = el;
      sec.hidden = false;
      updateCard(el, h);
    }
    sec.hidden = !hs.length;
    const doneN = hs.filter(h => count(h, viewDate) >= h.target).length;
    sec.querySelector('.cnt').textContent = s.id === 'off' ? '' : `${doneN} / ${hs.length}`;
  }
  const live = new Set(defs.map(s => s.id));
  for (const [id, sec] of sectionEls) {
    if (live.has(id)) continue;
    sec.hidden = true;
    if (!sec.querySelector('.habit')) { sec.remove(); sectionEls.delete(id); }
  }

  renderHero();
  firstRender = false;
  renderLegend();
  renderArchive();
}

export function renderWeek() {
  const start = addDays(viewDate, -weekday(viewDate)), tk = todayKey();
  [...$('days').children].forEach((b, i) => {
    const d = addDays(start, i), k = key(d), p = dayProgress(d);
    b.querySelector('.dn').textContent = d.getDate();
    b.querySelector('.prog').style.strokeDashoffset = DAY_C * (1 - p.frac);
    b.classList.toggle('sel', k === key(viewDate));
    b.classList.toggle('today', k === tk);
    b.classList.toggle('perfect', p.total > 0 && p.done === p.total);
    b.disabled = k > tk;
    b.title = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + (p.total ? ` — ${p.done} из ${p.total}` : '');
    b.onclick = () => { if (k !== key(viewDate)) goTo(d); };
  });
  $('next').disabled = key(addDays(start, 6)) >= tk;
  const first = firstHabitDay();
  $('prev').disabled = !first || key(start) <= first;
}

export function renderHero() {
  const p = dayProgress(viewDate), today = isToday(viewDate);
  const anyHabits = state.habits.some(h => !h.archived);
  $('hero').hidden = !anyHabits;
  countTo($('heroDone'), p.done);
  $('heroTotal').textContent = p.total;
  countTo($('heroPct'), Math.round(p.frac * 100), '%');
  $('heroProg').style.strokeDashoffset = HERO_C * (1 - p.frac);
  const left = p.total - p.done, allDone = p.total > 0 && !left;
  $('heroMsg').textContent = !p.total && !activeOn(viewDate).length ? 'Привычек ещё не было'
    : !p.total ? 'Выходной — отдыхайте'
    : allDone ? (today ? 'Всё выполнено! 🎉' : 'Идеальный день 🎉')
    : !p.done ? (today ? 'Начните с простой привычки' : 'Ничего не отмечено')
    : `Осталось ${left} — Вы справитесь`;

  const chips = [];
  const ps = perfectStreak();
  if (ps) chips.push(`⭐ Идеально ${days(ps)} подряд`);
  const best = state.habits.filter(h => !h.archived).map(h => ({ h, s: streak(h) })).sort((a, b) => b.s - a.s)[0];
  if (best?.s >= 2) chips.push(`🔥 ${best.h.name} · ${days(best.s)}`);
  if (!chips.length) {
    let done = 0, total = 0;
    for (let i = 0; i < 7; i++) { const d = dayProgress(addDays(viewDate, -i)); done += d.done; total += d.total; }
    chips.push(`📅 За 7 дней: ${total ? Math.round(done / total * 100) : 0}%`);
  }
  const box = $('heroChips');
  box.innerHTML = chips.map(c => `<span class="chip" title="${esc(c)}">${esc(c)}</span>`).join('');
  while (box.children.length > 1 && box.scrollWidth > box.clientWidth) box.lastElementChild.remove();

  if (today && allDone && wasAllDone === false) celebrate();
  if (today) wasAllDone = allDone;
}

export function celebrate() {
  if (reducedMotion) return;
  const r = $('heroProg').closest('.hero-ring').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.background = COLORS[i % COLORS.length];
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 120;
    p.animate([
      { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx * 1.2}px, ${dy + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2, .7, .4, 1)' }).onfinish = () => p.remove();
  }
}

export function archiveHabit(id) {
  const h = findHabit(id);
  h.archived = todayKey();
  save(); render();
  toast(`«${h.name}» — в архиве`, () => { const x = findHabit(id); if (x) { delete x.archived; save(); render(); } });
}

export async function deleteForever(id) {
  const h = findHabit(id);
  const ok = await askConfirm('Удалить навсегда?',
    `Привычка «${h.name}» и вся её история будут стёрты. Это нельзя отменить.`, 'Удалить');
  if (!ok || !findHabit(id)) return;
  state.habits = state.habits.filter(x => x.id !== id);
  for (const map of [state.log, state.skip]) for (const k in map) setMap(map, k, id, 0);
  if (hist?.id === id) { closeOverlay($('histOv')); setHist(null); }
  save(); render();
}

export function setArchiveOpen(open) {
  $('archToggle').setAttribute('aria-expanded', open);
  $('archBody').classList.toggle('open', open);
  $('archBody').inert = !open;
}
$('archToggle').onclick = () => setArchiveOpen($('archToggle').getAttribute('aria-expanded') !== 'true');

export function renderArchive() {
  const archived = state.habits.filter(h => h.archived);
  $('archive').hidden = !archived.length;
  if (!archived.length) setArchiveOpen(false);
  $('archCount').textContent = archived.length;

  const list = $('archList');
  const known = new Set();
  for (const h of archived) {
    known.add(h.id);
    let row = list.querySelector(`[data-id="${h.id}"]`);
    if (!row) {
      row = document.createElement('div');
      row.className = 'card arch-item enter';
      row.dataset.id = h.id;
      row.innerHTML = `
        <div class="hicon"></div>
        <div class="info" tabindex="0" role="button" title="История и статистика"><div class="name"></div><div class="meta"></div></div>
        <div class="acts">
          <button class="restore">Вернуть</button>
          <button class="danger del">Удалить</button>
        </div>`;
      const info = row.querySelector('.info');
      info.onclick = () => openHistory(h.id);
      info.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHistory(h.id); } };
      row.querySelector('.restore').onclick = () => { const x = findHabit(h.id); if (!x) return; delete x.archived; save(); render(); };
      row.querySelector('.del').onclick = () => deleteForever(h.id);
      list.prepend(row);
    }
    row.style.setProperty('--c', h.color);
    setIcon(row.querySelector('.hicon'), h.icon);
    row.querySelector('.name').textContent = h.name;
    row.querySelector('.meta').textContent = `В архиве с ${fmtLong(h.archived)}`;
  }
  for (const row of [...list.children]) if (!known.has(row.dataset.id)) row.remove();
}

export let resizeTimer, lastWidth = innerWidth;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    render();
    if (hist) renderHistory();
  }, 150);
});

$('heroProg').setAttribute('stroke-dasharray', HERO_C);
$('heroProg').style.strokeDashoffset = HERO_C;
$('days').innerHTML = WEEKDAYS.map(wd => `
  <button class="day">
    <span class="wd">${wd}</span>
    <span class="dr"><svg viewBox="0 0 36 36"><circle class="track" cx="18" cy="18" r="15.5"/><circle class="prog" cx="18" cy="18" r="15.5" stroke-dasharray="${DAY_C}" stroke-dashoffset="${DAY_C}"/></svg><span class="dn"></span></span>
  </button>`).join('');

export function goTo(d) {
  const dir = key(d) > key(viewDate) ? 1 : -1;
  viewDate = d;
  render();
  if (reducedMotion) return;
  const opts = { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  $('title').animate([{ opacity: 0, transform: `translateX(${8 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
  $('sections').animate([{ opacity: .35, transform: `translateX(${10 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
}
export const firstHabitDay = () => state.habits.filter(h => !h.archived).map(h => h.created).sort()[0];
$('prev').onclick = () => {
  const d = addDays(viewDate, -7), first = firstHabitDay();
  goTo(first && key(d) < first ? parseKey(first) : d);
};
$('todayBtn').onclick = () => goTo(new Date());
addEventListener('keydown', e => {
  if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && !e.ctrlKey && !e.metaKey && !e.altKey
      && !e.target.closest?.('input, textarea') && !shownOverlays().length && !isToday(viewDate)) goTo(new Date());
});
$('next').onclick = () => {
  const d = addDays(viewDate, 7);
  goTo(key(d) > todayKey() ? new Date() : d);
};

export function applyView(v) {
  if (v === 'list') v = '7d'; else if (v === 'heat') v = '90d';
  if (!VIEWS[v]) v = '7d';
  document.body.dataset.view = v;
  $('viewBtn').innerHTML = `${IC.cal}<span>${VIEWS[v].short}</span>`;
  $('viewBtn').title = `На карточках: ${VIEWS[v].label.toLowerCase()}`;
}
export function renderViewPage() {
  const cur = document.body.dataset.view;
  $('viewSeg').innerHTML = Object.values(VIEWS).map(v =>
    `<button type="button" role="radio" aria-checked="${v.id === cur}" data-v="${v.id}">${v.short}</button>`).join('');
  $('viewHint').textContent = `Под каждой привычкой — отметки ${VIEWS[cur].label.toLowerCase()}.`;
  $('groupList').innerHTML = Object.entries(GROUPS).map(([id, g]) =>
    `<button type="button" class="set-row" role="radio" aria-checked="${id === groupMode}" data-g="${id}">
      <span class="set-txt"><b>${g.label}</b><small>${g.hint}</small></span><span class="check"></span>
    </button>`).join('');
  $('editCats').hidden = groupMode !== 'custom';
}
$('viewBtn').onclick = () => { renderViewPage(); openOverlay($('viewOv')); };
$('viewSeg').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  setPref(VIEW_STORE, b.dataset.v); applyView(b.dataset.v); render(); renderViewPage();
};
$('groupList').onclick = e => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  groupMode = b.dataset.g; setPref(GROUP_STORE, groupMode); render(); renderViewPage();
  if (groupMode === 'custom' && !state.categories.length) openCats();
};
$('editCats').onclick = openCats;
$('reorderBtn').onclick = () => { closeOverlay($('viewOv')); setReorder(true); };

export let lastDay = todayKey();
export function checkDayChange() {
  if (document.visibilityState !== 'visible' || todayKey() === lastDay) return;
  if (key(viewDate) === lastDay) viewDate = new Date();
  lastDay = todayKey();
  wasAllDone = null;
  render();
  if (hist) renderHistory();
}
document.addEventListener('visibilitychange', checkDayChange);
setInterval(checkDayChange, 60 * 1000);

addEventListener('storage', e => {
  if (e.key !== STORE) return;
  setState(load());
  render();
  if (hist) { if (findHabit(hist.id)) renderHistory(); else { closeOverlay($('histOv')); setHist(null); } }
});

export function setGroupMode(v) { groupMode = v; }
export function setViewDate(v) { viewDate = v; }
export function setWasAllDone(v) { wasAllDone = v; }
