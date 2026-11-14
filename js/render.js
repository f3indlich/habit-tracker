import { $, addDays, COLORS, DAY_C, days, EASE, EASE_IN, EASE_STD, esc, fmtLong, getPref, GROUP_STORE, HERO_C, isToday, isVivid, key, LEGEND_STORE, MONTHS_SHORT, mv, NS, ofDays, OVER_HINT, parseKey, plural, reducedMotion, RING_C, schedText, setPref, spring, STORE, TIMES, todayKey, VIEW_STORE, VIEWS, weekday, WEEKDAYS, withYear } from './core.js?v=1.1a';
import { IC, setIcon } from './icons.js?v=1.1a';
import { activeOn, at, count, isDue, isStat, statLead, isWeekly, nextDue, streakText, weekDone, weekQuota, countCap, dayProgress, findHabit, inLife, isSkipped, lifeEnd, load, missBadge, noteOf, perfectStreak, save, setCount, setMap, setSkip, setState, state, targetOn, stepDown, stepOf, stepUp, streak, units } from './storage.js?v=1.1a';
import { askConfirm, buildSegments, closeMenu, closeOverlay, countTo, flash, menuEl, openMenu, openOverlay, openPopover, paintSegments, rollNumber, SEG_MAX, shownOverlays, toast, flipAfter } from './ui.js?v=1.1a';
import { drawEmptyTpl, openCats, openForm } from './form.js?v=1.1a';
import { day, dayTip, hist, openDay, openHistory, renderDay, renderHistory, setHist } from './history.js?v=1.1a';
import { userName } from './settings.js?v=1.1a';
import { queueTips } from './tips.js?v=1.1a';
import { isPrivate, privateHabits, shownTasks, unlocked, visibleHabits } from './privacy.js?v=1.1a';
import { openLockSettings } from './lock.js?v=1.1a';
import { renderGoalStrip } from './goalsui.js?v=1.1a';
import { dayMarks } from './tasks.js?v=1.1a';
import { dotsOn, renderDayTasks, tasksOf } from './tasksui.js?v=1.1a';

export function paintTaskMarks() {
  const marks = dotsOn() ? dayMarks(shownTasks(tasksOf()), todayKey()) : {};
  for (const b of document.querySelectorAll('#days > *, .peek > *')) {
    if (!b._k) continue;
    b.classList.toggle('has-tasks', !!marks[b._k]);
    b.classList.toggle('late-tasks', !!marks[b._k]?.late);
  }
}

export let viewDate = new Date();
export const cards = new Map();

export function habitMenu(anchor, id) {
  const h = at(findHabit(id), viewDate), c = count(h, viewDate), skipped = isSkipped(h, viewDate);
  const dayWord = isToday(viewDate) ? 'сегодня' : 'в этот день';
  openMenu(anchor, [
    { icon: IC.history, label: 'История и статистика', run: () => openHistory(id) },
    '-',
    h.target > 1 && c < h.target && { icon: IC.full, label: 'Выполнить полностью', run: () => changeCount(h, viewDate, h.target) },
    h.target > 1 && c > 0 && { icon: IC.minus, label: h.step ? `Убрать ${c % h.step || h.step}` : 'Убрать одно', run: () => changeCount(h, viewDate, stepDown(h, c)) },
    c > 0 && { icon: IC.reset, label: 'Сбросить отметку', run: () => changeCount(h, viewDate, 0) },
    key(viewDate) <= todayKey() && (skipped || (isDue(h, viewDate) && !c && !isWeekly(h, viewDate))) && { icon: IC.skip, label: skipped ? `Отменить пропуск` : `Пропустить ${dayWord}`, run: () => setSkip(h, viewDate, !skipped) },
    inLife(h, key(viewDate)) && { icon: IC.note, label: noteOf(h, viewDate) ? 'Заметка' : 'Добавить заметку', run: () => openDay(id, viewDate) },
    '-',
    { icon: IC.edit, label: 'Изменить', run: () => openForm(id) },
    { icon: IC.order, label: 'Изменить порядок', run: () => setReorder(true) },
    { icon: IC.archive, label: 'В архив', run: () => archiveHabit(id) },
  ].filter(Boolean));
}

export const GROUPS = {
  time: { label: 'По времени дня', hint: 'Утро, день, вечер' },
  custom: { label: 'По категориям', hint: 'Ваши группы, например «Спорт»' },
  none: { label: 'Одним списком', hint: 'Без групп, в Вашем порядке' },
};
export let groupMode = 'time';
export const catName = id => state.categories.find(c => c.id === id)?.name;

export function sectionDefs() {
  const defs = groupMode === 'time' ? TIMES.map(t => ({ id: 't:' + t.v, label: `${t.icon} ${t.v === 'any' ? 'В любое время' : t.label}` }))
    : groupMode === 'custom' ? [...state.categories.map(c => ({ id: 'c:' + c.id, label: c.name })), { id: 'c:', label: 'Без категории' }]
    : [{ id: 'all', label: '' }];
  return [...defs, { id: 'off', label: '💤 Не сегодня' }];
}
export function sectionOf(h) {
  if (!isDue(h, viewDate) && !count(h, viewDate)) return 'off';
  return groupMode === 'time' ? 't:' + h.time : groupMode === 'custom' ? 'c:' + (h.cat || '') : 'all';
}

export const SEC_FOLD_STORE = NS + '-sec-fold';
export function secFolded() {
  try { const v = JSON.parse(getPref(SEC_FOLD_STORE, '[]')); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function toggleSection(sec) {
  const id = sec.dataset.sec, list = sec.querySelector('.list'), cur = secFolded(), fold = !cur.includes(id);
  setPref(SEC_FOLD_STORE, JSON.stringify(fold ? [...cur, id] : cur.filter(x => x !== id)));
  sec.querySelector('.sec-h').setAttribute('aria-expanded', !fold);
  list.getAnimations().forEach(a => a.cancel());
  flipAfter(sec, () => sec.classList.toggle('folded', fold));
  if (!fold && !reducedMotion) list.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}
$('sections').addEventListener('click', e => {
  const h = e.target.closest('.sec-h[role=button]');
  if (h && !e.target.closest('button, a, input')) toggleSection(h.closest('.section'));
});
$('sections').addEventListener('keydown', e => {
  const h = e.target.closest?.('.sec-h[role=button]');
  if (h && e.target === h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleSection(h.closest('.section')); }
});
export const sectionEls = new Map();
export function sectionEl(id) {
  let el = sectionEls.get(id);
  if (!el) {
    el = document.createElement('section');
    el.className = 'section';
    el.hidden = true;
    el.dataset.sec = id;
    el.innerHTML = `<div class="sec-h" role="button" tabindex="0" aria-expanded="true"><span class="sec-t"></span><span class="cnt"></span><svg class="ic sec-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div><div class="list"></div>`;
    sectionEls.set(id, el);
  }
  return el;
}

let refitRaf = 0;
const metaRO = 'ResizeObserver' in window ? new ResizeObserver(list => {
  let moved = false;
  for (const e of list) { const w = e.target.clientWidth; if (e.target._w !== w) { if (e.target._w != null) moved = true; e.target._w = w; } }
  if (moved && !refitRaf) refitRaf = requestAnimationFrame(() => { refitRaf = 0; render(); });
}) : null;
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
    <button class="step-minus idle" title="Убрать одно">${IC.minus}</button>
    <button class="check">
      <svg class="ring" viewBox="0 0 48 48">
        <circle class="track" cx="24" cy="24" r="22"/>
        <circle class="prog" cx="24" cy="24" r="22" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>
      </svg>
      <span class="flash"></span>
      <svg class="ic plus" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>
      <span class="num"></span>
      <svg class="tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      <span class="over" aria-hidden="true"></span>
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
    const h = at(findHabit(id), viewDate), c = count(h, viewDate);
    changeCount(h, viewDate, h.target > 1 ? stepUp(h, c) : c ? 0 : 1);
  };
  let holdTimer = null, holdShow = null;
  const endHold = () => { clearTimeout(holdTimer); clearTimeout(holdShow); check.classList.remove('holding'); };
  check.addEventListener('pointerdown', e => {
    el._held = false;
    const h = at(findHabit(id), viewDate);
    if (e.button !== 0 || h.target === 1 || count(h, viewDate) >= h.target) return;
    holdShow = setTimeout(() => check.classList.add('holding'), 200);
    holdTimer = setTimeout(() => { endHold(); el._held = true; changeCount(h, viewDate, h.target); }, 550);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => check.addEventListener(t, endHold));
  check.addEventListener('contextmenu', e => e.preventDefault());

  el.querySelector('.step-minus').onclick = () => {
    const h = at(findHabit(id), viewDate);
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
    openDay(id, addDays(viewDate, i - 6));
  });
  metaRO?.observe(el.querySelector('.meta'));
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
  syncFutureNote();
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

export const LONG_PRESS = 450;
let dragOn = false;
document.addEventListener('touchmove', e => { if (dragOn) e.preventDefault(); }, { passive: false });

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

  const begin = (id, y, cap) => {
    try { cap.setPointerCapture(id); } catch {}
    drag = { id, y0: y, y, top0: el.offsetTop, scroll0: scrollY, raf: null };
    dragOn = true;
    el.classList.add('dragging');
  };
  const move = e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.y = e.clientY;
    if (!drag.raf) step();
  };
  const end = () => {
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    const off = parseFloat(el.style.transform.slice(11)) || 0;
    drag = null;
    dragOn = false;
    el._swiped = true;
    setTimeout(() => el._swiped = false, 50);
    el.style.transform = '';
    el.classList.remove('dragging');
    if (off && !reducedMotion) el.animate([{ transform: `translateY(${off}px)` }, { transform: 'none' }], { duration: 200, easing: EASE });
    commitOrder(el.parentElement);
  };
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !reordering) return;
    e.preventDefault();
    begin(e.pointerId, e.clientY, handle);
  });
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);

  let press = null;
  const cancelPress = () => { if (press) { clearTimeout(press.t); press = null; } };
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || reordering || drag || e.target.closest('.check, .more, .ctl, .step-minus, .drag-handle, .dot, .m-warn.stale')) return;
    if (liveCards(el.parentElement).length < 2) return;
    cancelPress();
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
    press.t = setTimeout(() => {
      const p = press;
      press = null;
      if (!p || el.classList.contains('swiping')) return;
      navigator.vibrate?.(15);
      begin(p.id, p.y, el);
    }, LONG_PRESS);
  });
  el.addEventListener('pointermove', e => {
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancelPress();
    if (!e.target.closest('.drag-handle')) move(e);
  });
  for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, e => { cancelPress(); if (!e.target.closest('.drag-handle')) end(); });
  el.addEventListener('contextmenu', e => { if (drag || press) e.preventDefault(); });
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
    if (el.classList.contains('dragging')) { start = null; return; }
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) {
        if (Math.abs(my) > 12) start = null;
        return;
      }
      dragging = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
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
    const h = at(findHabit(id), viewDate);
    if (dx >= LIMIT) { if (count(h, viewDate) < h.target) changeCount(h, viewDate, h.target); }
    else if (dx <= -LIMIT && (count(h, viewDate) || isSkipped(h, viewDate))) changeCount(h, viewDate, 0, true);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export function changeCount(h, d, n, clearSkip = false, announce = false) {
  if (key(d) > todayKey()) return;
  h = at(h, d);
  const prev = count(h, d), prevSkip = isSkipped(h, d);
  n = Math.max(0, Math.min(countCap(h.target), n));
  if (n === prev && !(clearSkip && prevSkip)) return;
  if (clearSkip && prevSkip) setMap(state.skip, key(d), h.id, 0);
  setCount(h, d, n);
  const wasDone = prev >= h.target, isDone = n >= h.target;
  if (isDone && !wasDone && key(d) === key(viewDate)) markFx(cards.get(h.id), h.color);
  navigator.vibrate?.(wasDone && isDone && n > prev ? 6 : n > prev ? 12 : [6, 40, 6]);
  if (announce || wasDone !== isDone || (n === 0 && prev > 1)) {
    const dayNote = isToday(d) ? '' : ` (${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})`;
    let text = `${h.name}${dayNote}: ${isDone && !(announce && h.target > 1) ? 'выполнено' : n ? `${n} из ${h.target}` : 'отметка снята'}`;
    if (isDone && !wasDone && h.target > 1 && getPref(OVER_HINT, '') !== '1') { setPref(OVER_HINT, '1'); text = 'Цель выполнена! Нажмите ещё раз, чтобы записать сверх плана'; }
    if (isPrivate(h) && text.startsWith(h.name)) text = 'Привычка' + text.slice(h.name.length);
    toast(text, () => {
      if (!findHabit(h.id)) return;
      setMap(state.log, key(d), h.id, prev);
      if (prevSkip) setMap(state.skip, key(d), h.id, 1);
      save(); render();
      if (day?.id === h.id && key(day.d) === key(d)) renderDay();
      if (hist) renderHistory();
    });
  }
}

const IC_PLUS_SM = '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>';
export const shortNum = n => n < 1000 ? String(n) : n < 10000 ? `${(Math.round(n / 100) / 10).toString().replace('.', ',')} тыс.` : `${Math.round(n / 1000)} тыс.`;

export function updateCard(el, h) {
  h = at(h, viewDate);
  const day = key(viewDate);
  const c = count(h, viewDate), done = c >= h.target, multi = h.target > 1;
  const skipped = isSkipped(h, viewDate), due = isDue(h, viewDate);
  const stat = isStat(h), s = streak(h);

  el.style.setProperty('--c', h.color);
  el.classList.toggle('stat', stat);
  el.classList.toggle('complete', done);
  el.classList.toggle('skipped', skipped);
  el.classList.toggle('offday', !due && !done);
  const future = day > todayKey();
  el.classList.toggle('future', future);
  el.querySelector('.check').disabled = future;
  el.classList.toggle('has-count', c > 0);
  setIcon(el.querySelector('.hicon'), h.icon);
  const sameDay = el._day === day;
  const u = units(h), ringSvg = el.querySelector('.ring'), segmented = multi && u > 1 && u <= SEG_MAX;
  if (segmented) {
    if (el._segN !== u) { buildSegments(ringSvg, u); el._segN = u; }
    paintSegments(ringSvg, done ? u : Math.floor(c / stepOf(h)), sameDay);
  } else if (el._segN) { ringSvg.querySelectorAll('.seg').forEach(s => s.remove()); el._segN = 0; }
  ringSvg.classList.toggle('segmented', segmented);
  el.querySelector('.prog').style.strokeDashoffset = RING_C * (1 - Math.min(c / h.target, 1));
  const check = el.querySelector('.check'), extra = c - h.target;
  check.title = !multi ? (done ? 'Выполнено — нажмите, чтобы снять отметку' : 'Отметить выполненной')
    : `Нажмите: +${stepOf(h)}, кнопка − убирает лишнее` + (done ? '' : ' · удерживайте: выполнить целиком');
  check.setAttribute('aria-label', `${h.name}: ` + (!multi ? `${done ? 'выполнено' : 'не выполнено'}. ${check.title}`
    : extra > 0 ? `${c} из ${h.target}, перевыполнено на ${extra}. Нажмите, чтобы добавить ещё`
    : extra === 0 ? `${c} из ${h.target}, выполнено. Нажмите, чтобы добавить сверх цели`
    : `${c} из ${h.target}. ${check.title}`));
  check.setAttribute('aria-pressed', done);
  const ob = check.querySelector('.over'), overState = multi && done ? (extra > 0 ? '+' + shortNum(extra) : '+') : '';
  check.classList.toggle('overdone', multi && extra > 0);
  if (ob._s !== overState) {
    const was = ob._s || '';
    ob._s = overState;
    ob.classList.toggle('on', !!overState);
    ob.classList.toggle('pill', overState.length > 3);
    ob.innerHTML = overState === '+' ? IC_PLUS_SM : esc(overState);
    ob.title = overState === '+' ? 'Цель выполнена — можно добавить сверх плана' : overState ? `Сверх цели: ${extra}` : '';
    if (sameDay && overState && !reducedMotion) ob.animate(was
      ? [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }]
      : [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: was ? 220 : 250, easing: was ? 'ease-out' : spring() });
  }
  const minusBtn = el.querySelector('.step-minus');
  minusBtn.hidden = !multi;
  minusBtn.classList.toggle('idle', c === 0);
  minusBtn.disabled = c === 0;

  const num = el.querySelector('.num');
  const numText = multi && c > 0 && c < h.target ? String(c) : '';
  num.classList.toggle('long', numText.length > 3);
  minusBtn.title = h.step ? `Убрать ${c % h.step || h.step}` : 'Убрать одно';
  if (numText) rollNumber(num, numText, c > (el._c ?? c) ? 1 : -1, sameDay);
  else if (!done) rollNumber(num, '', 1, false);
  const grew = sameDay && c > (el._c ?? c);
  if (grew && !reducedMotion) {
    flash(el.querySelector('.flash'));
  }
  el._day = day; el._c = c;

  el.querySelector('.name').textContent = h.name;
  const meta = el.querySelector('.meta');
  const weekly = isWeekly(h, viewDate), nd = !due && !c && !weekly ? nextDue(h, viewDate) : null;
  const lead = stat ? `<span>${esc(statLead(h))}</span>`
    : skipped ? '<span class="badge skip">Пропущено</span>'
    : weekly ? `<span>${weekDone(h, state, viewDate) >= weekQuota(h, viewDate) ? 'На эту неделю всё сделано' : `${weekDone(h, state, viewDate)} из ${weekQuota(h, viewDate)}<span class="m-unit"> ${isToday(viewDate) ? 'на этой неделе' : 'за неделю'}</span>`}</span>`
    : nd ? `<span>Следующий раз: ${nd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>`
    : multi ?`<span>${c} / ${h.target}${h.unit ? `<span class="m-unit"> ${esc(h.unit)}</span>` : ''}</span>`
    : `<span class="m-sched">${esc(schedText(h)[0].toUpperCase() + schedText(h).slice(1))}</span>`;
  const badge = !stat && isToday(viewDate) && !skipped && due ? missBadge(h) : null, warn = !!badge;
  if (meta.dataset.lead !== lead) {
    meta.querySelector('.m-lead').innerHTML = lead; meta.dataset.lead = lead;
    if (multi && grew && !reducedMotion) meta.querySelector('.m-lead > span').animate([{ color: h.color }, { color: h.color, offset: .35 }, {}], { duration: 700, easing: 'ease-out' });
  }
  const st = meta.querySelector('.m-streak'), warnEl = meta.querySelector('.m-warn'), label = warnEl.querySelector('.w-long'), leadEl = meta.querySelector('.m-lead');
  if (warn) {
    warnEl.title = badge.title;
    warnEl.classList.toggle('calm', badge.calm);
    warnEl.classList.toggle('stale', !!badge.stale);
  }
  const full = s ? `🔥 ${streakText(h, s)}` : '', short = s && !/недел/.test(full) ? `🔥 ${s}` : full, W = meta._w ?? (meta._w = meta.clientWidth);
  let pick = { unit: true, streak: full, warn: warn ? badge.texts[0] : null };
  if (W) {
    const width = el => el.scrollWidth;
    const leadW = unit => { leadEl.classList.toggle('m-short', !unit); return width(leadEl); };
    const streakW = t => { if (!t) return 0; st.textContent = t; return width(st) + 8; };
    const warnFit = room => warn ? badge.texts.find(t => { label.textContent = t; return label.offsetWidth + 22 <= Math.min(room, 268); }) ?? null : null;
    const tries = [[true, full], [true, short], [false, full], [false, short], [false, '']];
    const sig = `${W}|${s}|${warn ? badge.texts.join('/') : ''}|${lead}`, prev = meta._fit;
    pick = prev?.sig === sig ? prev : null;
    if (!pick) for (const [unit, sTxt] of tries) {
      const room = W - leadW(unit) - streakW(sTxt);
      if (room < 0) continue;
      const w = warnFit(room);
      if (!warn || w) { pick = { unit, streak: sTxt, warn: w }; break; }
    }
    if (!pick) {
      pick = { unit: false, streak: '', warn: null };
      for (const [unit, sTxt] of tries) if (W - leadW(unit) - streakW(sTxt) >= 0) { pick = { unit, streak: sTxt, warn: null }; break; }
    }
    pick.sig = sig; meta._fit = pick;
    leadEl.classList.toggle('m-short', !pick.unit);
  }
  meta.classList.toggle('m-nolead', !pick.unit && !!leadEl.querySelector('.m-sched'));
  if (pick.streak) st.textContent = pick.streak;
  meta.classList.toggle('still', !sameDay);
  st.classList.toggle('on', !!pick.streak);
  if (pick.warn) label.textContent = pick.warn;
  warnEl.classList.toggle('on', !!pick.warn);

  const todayK = todayKey();
  el.querySelectorAll('.dcol').forEach((col, i) => {
    const d = addDays(viewDate, i - 6), k = key(d), v = count(h, d), dot = col.lastElementChild;
    dot.className = 'dot ' + (v >= targetOn(h, d) ? 'full' : v > 0 ? 'part' : isSkipped(h, d) ? 'skip' : !isDue(h, d) || isStat(h) ? 'off' : '');
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
  const { log, skip } = state, id = h.id, end = lifeEnd(h);
  let dueN = 0, fullN = 0, marks = 0;
  mh._cells.forEach((cell, i) => {
    const k = L.keys[i], tgt = targetOn(h, L.days[i]), v = log[k]?.[id] || 0, sk = !!skip[k]?.[id], out = k > todayK || k < h.created;
    const cls = (out ? 'x' : v >= tgt ? 'l3' : v * 2 >= tgt ? 'l2' : v > 0 ? 'l1' : sk ? 'sk' : '')
      + (k === day ? ' cur' : '');
    if (cell.className !== cls) cell.className = cls;
    if (!out && v > 0) marks++;
    if (!out && k <= end && !sk && isDue(h, L.days[i]) && !(k === todayK && v < tgt)) { dueN++; if (v >= tgt) fullN++; }
  });
  mh.querySelector('.sh-r').textContent = isStat(h) ? (marks ? `${marks} ${plural(marks, 'раз', 'раза', 'раз')}` : 'отметок нет') : dueN ? `${fullN} из ${ofDays(dueN)} · ${Math.round(fullN / dueN * 100)}%` : 'пока нет данных';
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
    if (label && c > end && (W <= 20 || (label.getMonth() - vd.getMonth()) % 2 === 0)) { months += `<span class="ml" style="grid-column:${c + 2} / span 3">${mon(label)}</span>`; end = c + 2; }
  }
  const wl = [0, 2, 4].map(r => `<span class="wl" style="grid-row:${r + 2}">${WEEKDAYS[r]}</span>`).join('');
  const cells = days.map((_, i) => `<i style="grid-area:${(i % 7) + 2} / ${Math.floor(i / 7) + 2}"></i>`).join('');
  return {
    cls: W > 20 ? 'y' : 'q', days,
    html: `<div class="sh"><span>${view.head}</span><b class="sh-r"></b></div><div class="sgrid" style="--w:${W}">${months}${wl}${cells}</div>`,
  };
}

export const LEGEND_DAYS = 7;
export function legendOff() {
  if (getPref(LEGEND_STORE, '')) return true;
  const first = state.habits.reduce((m, h) => (!m || h.created < m ? h.created : m), '');
  if (!first || first > key(addDays(new Date(), -LEGEND_DAYS))) return false;
  setPref(LEGEND_STORE, '1');
  return true;
}
export function renderLegend() {
  const v = VIEWS[document.body.dataset.view];
  $('viewLegend').hidden = !visibleHabits(state).some(h => !h.archived) || legendOff() || listTucked();
  $('viewLegend').classList.toggle('round', !v.cells);
  $('viewLegend').title = v.label;
  $('viewLegend').innerHTML = `<span><i class="lg3"></i>выполнено</span><span><i class="lg1"></i>частично</span>
    <span><i class="lgs"></i>пропуск</span>${v.cells ? '' : '<span><i class="lgo"></i>не в плане</span>'}`;
}

export function glow(el) {
  if (reducedMotion || !el?.isConnected) return;
  el.querySelector(':scope > .glow')?.remove();
  const g = document.createElement('i');
  g.className = 'glow';
  g.setAttribute('aria-hidden', 'true');
  el.append(g);
  g.animate([{ backgroundPosition: '130% 0', opacity: 0 }, { opacity: 1, offset: .15 }, { backgroundPosition: '-30% 0', opacity: 1, offset: .8 }, { backgroundPosition: '-30% 0', opacity: 0 }],
    { duration: 820, easing: 'cubic-bezier(.35, .6, .3, 1)' }).onfinish = () => g.remove();
}

export function sparks(el, color) {
  if (reducedMotion || !isVivid() || !el?.isConnected) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, n = weakDevice() ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'spark';
    p.style.background = color;
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    document.body.append(p);
    const a = (i / n) * Math.PI * 2 + Math.random() * .4, v = 38 + Math.random() * 34, x = Math.cos(a) * v, y = Math.sin(a) * v;
    p.animate([
      { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1 },
      { transform: `translate(calc(-50% + ${x * .8}px), calc(-50% + ${y * .8}px)) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(.3)`, opacity: 0 },
    ], { duration: 540 + Math.random() * 180, easing: 'cubic-bezier(.15, .7, .3, 1)' }).onfinish = () => p.remove();
  }
}
export function markFx(el, color) {
  if (reducedMotion || !el?.isConnected) return;
  glow(el);
  el.animate({ scale: [1, mv(1.012, 1.03), 1] }, { duration: mv(320, 480), easing: EASE_STD });
  el.querySelector('.check')?.animate({ scale: [1, mv(1.1, 1.26), 1] }, { duration: mv(360, 560), easing: EASE_STD });
  if (!isVivid()) return;
  el.querySelector('.hicon')?.animate({ rotate: ['0deg', '-10deg', '8deg', '0deg'], scale: [1, 1.14, 1, 1] }, { duration: 520, easing: 'ease-out' });
  sparks(el.querySelector('.check'), color);
}

export function removeCard(el) {
  metaRO?.unobserve(el.querySelector('.meta'));
  el.classList.add('leaving');
  if (reducedMotion) return el.remove();
  const h = el.offsetHeight, out = mv('translateX(-16px)', 'translateX(-36px) scale(.94)');
  el.animate([
    { opacity: 1, transform: 'none', height: h + 'px' },
    { opacity: 0, transform: out, height: h + 'px', offset: .45 },
    { opacity: 0, transform: out, height: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0, marginBottom: '-10px' },
  ], { duration: mv(380, 480), easing: EASE }).onfinish = () => el.remove();
}

export let wasAllDone = null;
let futureOpen = '';
const dayAhead = () => key(viewDate) > todayKey();
const listTucked = () => dayAhead() && futureOpen !== key(viewDate) && !reordering && visibleHabits(state).some(h => !h.archived);
function syncFutureNote() {
  const note = $('futureNote'), tucked = listTucked();
  note.hidden = !dayAhead() || !visibleHabits(state).some(h => !h.archived);
  $('sections').hidden = tucked;
  if (note.hidden) return;
  const planned = dayProgress(viewDate).total, any = activeOn(viewDate).length > 0;
  $('fnTitle').textContent = planned ? 'Время привычек ещё не пришло' : 'На этот день привычек нет';
  $('fnText').textContent = planned ? `Отметить их можно будет, когда наступит этот день. Запланировано: ${planned}.` : 'Ничего отмечать не нужно.';
  $('fnToggle').hidden = !any;
  $('fnToggle').textContent = tucked ? 'Показать привычки' : 'Скрыть привычки';
  $('fnToggle').setAttribute('aria-expanded', !tucked);
}
$('fnToggle').onclick = () => {
  futureOpen = futureOpen === key(viewDate) ? '' : key(viewDate);
  syncFutureNote();
  if (!$('sections').hidden && !reducedMotion) $('sections').animate({ opacity: [0, 1], transform: ['translateY(10px)', 'none'] }, { duration: 340, easing: EASE_STD });
  renderLegend();
  renderArchive();
};
const IC_VIEW = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
export let firstRender = true, entering = 0;
let lastOrder = '', lastDayKey = '';
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

  const active = visibleHabits(state).filter(h => !h.archived);
  const habits = activeOn(viewDate);
  const priv = privateHabits(state), privLive = priv.filter(h => !h.archived && key(viewDate) >= h.created);
  $('empty').hidden = active.length > 0;
  if (!active.length) drawEmptyTpl();
  document.body.classList.toggle('no-habits', !active.length);

  const ids = new Set([...habits, ...privLive].map(h => h.id));
  for (const [id, el] of cards) if (!ids.has(id)) { cards.delete(id); removeCard(el); }

  const defs = sectionDefs();
  const bySection = Object.fromEntries(defs.map(s => [s.id, []]));
  for (const h of habits) (bySection[sectionOf(h)] ?? bySection.off).push(h);

  const order = defs.map(s => s.id + ':' + bySection[s.id].map(h => h.id).join()).join('|'), dayK = key(viewDate);
  const before = !firstRender && !reducedMotion && !reordering && order !== lastOrder && dayK === lastDayKey
    ? new Map([...cards].filter(([, el]) => el.isConnected && !el.classList.contains('leaving') && el.offsetParent).map(([id, el]) => [id, el.getBoundingClientRect().top])) : null;
  lastOrder = order; lastDayKey = dayK;

  const box = $('sections');
  let prevSec = null;
  for (const s of defs) {
    const sec = sectionEl(s.id);
    const want = prevSec ? prevSec.nextElementSibling : box.firstElementChild;
    if (sec !== want) box.insertBefore(sec, want);
    prevSec = sec;
    sec.querySelector('.sec-t').textContent = s.label;
    sec.classList.toggle('plain', !s.label);
    const fold = !!s.label && secFolded().includes(s.id);
    sec.classList.toggle('folded', fold);
    sec.querySelector('.sec-h').setAttribute('aria-expanded', !fold);
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
    const doneN = hs.filter(h => count(h, viewDate) >= targetOn(h, viewDate)).length;
    sec.querySelector('.cnt').textContent = s.id === 'off' ? '' : `${doneN} / ${hs.length}`;
  }
  const live = new Set(defs.map(s => s.id));
  for (const [id, sec] of sectionEls) {
    if (live.has(id)) continue;
    sec.hidden = true;
    if (!sec.querySelector('.habit')) { sec.remove(); sectionEls.delete(id); }
  }
  if (before) for (const [id, top] of before) {
    const el = cards.get(id);
    if (!el?.isConnected || el.classList.contains('leaving') || !el.offsetParent) continue;
    const dy = top - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: mv(360, 560), easing: mv(EASE, spring()) });
  }
  renderPrivate(privLive, priv.filter(h => h.archived));

  renderHero();
  syncFutureNote();
  firstRender = false;
  renderLegend();
  renderArchive();
  renderGoalStrip();
  renderDayTasks();
  queueTips();
}

const FUTURE_WEEKS = 52;
const weekStart = d => addDays(d, -weekday(d));
function fillWeek(el, vd) {
  const start = weekStart(vd), tk = todayKey(), marks = dotsOn() ? dayMarks(shownTasks(tasksOf()), tk) : {};
  [...el.children].forEach((b, i) => {
    const d = addDays(start, i), k = key(d), p = dayProgress(d);
    b.querySelector('.dn').textContent = d.getDate();
    b.querySelector('.prog').style.strokeDashoffset = DAY_C * (1 - p.frac);
    b.classList.toggle('sel', k === key(vd));
    b.classList.toggle('today', k === tk);
    const was = b._k === k && b.classList.contains('perfect'), perfect = p.total > 0 && p.done === p.total;
    b.classList.toggle('perfect', perfect);
    if (perfect && !was && b._k === k && el.id === 'days' && !reducedMotion)
      b.querySelector('.dr').animate([{ transform: 'scale(1)' }, { transform: `scale(${mv(1.2, 1.36)})`, offset: .35 }, { transform: 'scale(1)' }], { duration: mv(520, 680), easing: 'cubic-bezier(.3, .7, .3, 1)' });
    b._k = k;
    b.classList.toggle('has-tasks', !!marks[k]);
    b.classList.toggle('late-tasks', !!marks[k]?.late);
    b.title = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + (p.total ? ` — ${p.done} из ${p.total}` : '');
    b.onclick = () => { if (k !== key(viewDate)) goTo(d); };
  });
  return start;
}

export function renderWeek() {
  const start = fillWeek($('days'), viewDate), tk = todayKey();
  $('next').disabled = key(start) >= key(addDays(parseKey(tk), 7 * FUTURE_WEEKS));
  const first = firstHabitDay();
  $('prev').disabled = !first || key(start) <= first;
}

export function placeBand() {
  const el = [$('hero'), $('empty')].find(e => !e.hidden);
  const r = (el || $('days')).getBoundingClientRect();
  document.body.style.setProperty('--band', Math.round((el ? r.top + Math.min(r.height / 2, 70) : r.bottom + 14) + scrollY) + 'px');
}
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(() => placeBand());
  [$('hero'), $('empty'), document.querySelector('.top'), $('days')].forEach(el => ro.observe(el));
}

export function renderHero() {
  const p = dayProgress(viewDate), today = isToday(viewDate), future = key(viewDate) > todayKey();
  const anyHabits = visibleHabits(state).some(h => !h.archived);
  $('hero').hidden = !anyHabits;
  countTo($('heroDone'), p.done);
  $('heroTotal').textContent = p.total;
  if (p.partial) $('heroPart').textContent = `и ${p.partial} частично`;
  $('heroPart').classList.toggle('off', !p.partial);
  $('heroPart').setAttribute('aria-hidden', !p.partial);
  $('hero').classList.toggle('ahead', future);
  if (future) { cancelAnimationFrame($('heroPct')._raf); $('heroPct').textContent = '—'; }
  else countTo($('heroPct'), Math.round(p.frac * 100), '%');
  $('heroProg').style.strokeDashoffset = HERO_C * (1 - p.frac);
  $('heroProg').style.opacity = p.frac > 0 && !future ? '' : '0';
  const left = p.total - p.done, allDone = p.total > 0 && !left;
  $('heroMsg').textContent = !p.total && !activeOn(viewDate).length ? 'Привычек ещё не было'
    : !p.total ? 'Выходной — отдыхайте'
    : future ? 'День ещё впереди'
    : allDone ? (today ? 'Всё выполнено! 🎉' : 'Идеальный день 🎉')
    : !p.done && !p.partial ? (today ? 'Начните с простой привычки' : 'Ничего не отмечено')
    : !today ? `Не выполнено: ${left}`
    : !p.done ? 'Хорошее начало!'
    : `Осталось ${left} — Вы справитесь`;

  const chips = [];
  if (today) {
    const ps = perfectStreak();
    if (ps) chips.push(`⭐ Идеально ${days(ps)} подряд`);
    const best = visibleHabits(state).filter(h => !h.archived && !isStat(h)).map(h => ({ h, s: streak(h) })).sort((a, b) => b.s - a.s)[0];
    if (best?.s >= 2) chips.push(`🔥 ${streakText(best.h, best.s)} · ${best.h.name}`);
  }
  if (!chips.length && !future) {
    let done = 0, total = 0, planned = 0;
    for (let i = 0; i < 7; i++) { const d = dayProgress(addDays(viewDate, -i)); done += d.done; total += d.total; if (d.total) planned++; }
    if (planned >= 3) chips.push(`📅 За 7 дней: ${Math.round(done / total * 100)}%`);
  }
  const box = $('heroChips');
  box.innerHTML = chips.map(c => `<span class="chip" title="${esc(c)}">${esc(c)}</span>`).join('');
  while (box.children.length > 1 && box.scrollWidth > box.clientWidth) box.lastElementChild.remove();

  if (today && allDone && wasAllDone === false) celebrate();
  if (today) wasAllDone = allDone;
  setBadge();
}

let badgeLast = null;
export const badgeLeft = () => { const p = dayProgress(new Date()); return Math.max(0, p.total - p.done); };
export function setBadge(n = badgeLeft()) {
  if (n === badgeLast || !('setAppBadge' in navigator)) return;
  badgeLast = n;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

export const CHEER = [18, 70, 18, 70, 45];
export const CONFETTI = 40;
export const CONFETTI_VIVID = 90;
export const weakDevice = (nav = navigator) => nav.hardwareConcurrency <= 4 || nav.deviceMemory <= 4;
export const confettiCount = (nav = navigator) => mv(CONFETTI, CONFETTI_VIVID) / (weakDevice(nav) ? 2 : 1);
export function celebrate() {
  if (reducedMotion) return;
  navigator.vibrate?.(CHEER);
  requestAnimationFrame(() => requestAnimationFrame(burst));
}
function shock(cx, cy, delay) {
  const s = document.createElement('i');
  s.className = 'shock';
  s.style.left = cx + 'px'; s.style.top = cy + 'px';
  document.body.append(s);
  s.animate([{ transform: 'translate(-50%, -50%) scale(.5)', opacity: .7 }, { transform: `translate(-50%, -50%) scale(${mv(1.5, 2.6)})`, opacity: 0 }],
    { duration: mv(560, 780), delay, easing: EASE_STD, fill: 'backwards' }).onfinish = () => s.remove();
}
function burst() {
  const ring = $('heroProg').closest('.hero-ring'), r = ring.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, n = confettiCount(), spread = mv(190, 320);
  ring.animate({ scale: [1, mv(1.08, 1.2), 1] }, { duration: mv(520, 720), easing: EASE_STD });
  glow($('hero'));
  shock(cx, cy, 0);
  if (isVivid()) shock(cx, cy, 170);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.background = COLORS[i % COLORS.length];
    if (i % 3 === 0) p.style.borderRadius = '50%';
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * spread;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 110, sc = .7 + Math.random() * .6;
    p.animate([
      { transform: `translate(-50%, -50%) scale(${sc}) rotate3d(1, 1, 0, 0deg)`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate3d(1, 1, 0, ${Math.random() * 720}deg)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx * 1.25}px, ${dy + 300}px) scale(${sc}) rotate3d(1, .4, 0, ${720 + Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: mv(1200, 1500) + Math.random() * 700, easing: 'cubic-bezier(.2, .7, .4, 1)' }).onfinish = () => p.remove();
  }
}

export function archiveHabit(id) {
  const h = findHabit(id);
  h.archived = todayKey();
  save(); render();
  toast(isPrivate(h) ? 'Перенесено в архив' : `«${h.name}» — в архиве`, () => { const x = findHabit(id); if (x) { delete x.archived; save(); render(); } });
}

export async function deleteForever(id) {
  const h = findHabit(id);
  const ok = await askConfirm('Удалить навсегда?',
    `${isPrivate(h) ? 'Привычка' : `Привычка «${h.name}»`} и вся её история будут стёрты. Это нельзя отменить.`, 'Удалить');
  if (!ok || !findHabit(id)) return;
  state.habits = state.habits.filter(x => x.id !== id);
  for (const map of [state.log, state.skip, state.notes]) for (const k in map) setMap(map, k, id, 0);
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
  const archived = visibleHabits(state).filter(h => h.archived);
  $('archive').hidden = !archived.length || listTucked();
  if (!archived.length) setArchiveOpen(false);
  $('archCount').textContent = archived.length;
  fillArchive($('archList'), archived);
}

export let privSec = null;
export function purgePrivate() {
  for (const [id, el] of cards) if (el.closest('.priv-sec') || isPrivate(findHabit(id))) { cards.delete(id); el.remove(); }
  privSec?.remove();
  privSec = null;
}
export function renderPrivate(live, archived) {
  if (!unlocked) return purgePrivate();
  if (!privSec) {
    privSec = document.createElement('section');
    privSec.className = 'section priv-sec enter';
    privSec.innerHTML = `<div class="sec-h"><span class="sec-t">${IC.lock}<span>Личное</span></span>
      <span class="priv-acts"><button type="button" class="ghost icon-btn priv-set" title="Настройки личного" aria-label="Настройки личного">${IC.more}</button>
      <button type="button" class="ghost icon-btn priv-add" title="Новая личная привычка" aria-label="Новая личная привычка">${IC.plus}</button></span></div>
      <div class="list"></div><p class="priv-empty">Здесь пока пусто. Нажмите «+», чтобы добавить личную привычку.</p><div class="arch-list priv-arch"></div>`;
    privSec.querySelector('.priv-add').onclick = () => openForm(null, true);
    privSec.querySelector('.priv-set').onclick = openLockSettings;
    privSec.addEventListener('animationend', e => { if (e.target === privSec) privSec.classList.remove('enter'); });
  }
  if ($('sections').lastElementChild !== privSec) $('sections').append(privSec);
  const list = privSec.querySelector('.list');
  const nextLive = n => { while (n && n.classList.contains('leaving')) n = n.nextElementSibling; return n; };
  let prev = null;
  for (const h of live) {
    let el = cards.get(h.id);
    if (!el) { el = buildCard(h.id); cards.set(h.id, el); }
    const want = nextLive(prev ? prev.nextElementSibling : list.firstElementChild);
    if (el !== want) list.insertBefore(el, want);
    prev = el;
    updateCard(el, h);
  }
  privSec.querySelector('.priv-empty').hidden = live.length + archived.length > 0;
  fillArchive(privSec.querySelector('.priv-arch'), archived);
}

function fillArchive(list, archived) {
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
          <button class="danger del">${IC.trash}<span>Удалить</span></button>
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
  const opts = { duration: 320, easing: EASE_STD };
  $('title').animate([{ opacity: 0, transform: `translateX(${8 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
  $('sections').animate([{ opacity: .35, transform: `translateX(${10 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
}
export const firstHabitDay = () => [...visibleHabits(state), ...privateHabits(state)].filter(h => !h.archived).map(h => h.created).sort()[0];

{
  const strip = $('days'), track = $('daysTrack'), GAP = 16;
  let start = null, dx = 0, dragging = false, swiped = false, pts = [], off = 0, peeks = {}, anim = null, after = null;
  const page = () => strip.offsetWidth + GAP;
  const target = s => {
    const d = addDays(weekStart(viewDate), s < 0 ? -1 : 7), first = firstHabitDay();
    if (key(weekStart(d)) === key(weekStart(new Date()))) return new Date();
    return s < 0 && first && key(d) < first ? parseKey(first) : d;
  };
  const move = x => { off = x; track.style.transform = x ? `translateX(${x}px)` : ''; };
  const peek = (s, d) => {
    if (peeks[s]) return;
    const p = strip.cloneNode(true);
    p.removeAttribute('id');
    p.classList.add('peek');
    p.inert = true;
    p.setAttribute('aria-hidden', 'true');
    p.style.left = s * page() + 'px';
    fillWeek(p, d);
    track.append(p);
    peeks[s] = p;
  };
  const clear = () => { Object.values(peeks).forEach(p => p.remove()); peeks = {}; move(0); };
  const flush = () => {
    if (!anim) return;
    const a = anim, f = after;
    anim = after = null;
    a.cancel();
    f();
  };
  const settle = (to, ms, done) => {
    const a = anim = track.animate([{ transform: `translateX(${off}px)` }, { transform: `translateX(${to}px)` }], { duration: ms, easing: 'cubic-bezier(.22, .75, .25, 1)' });
    after = done;
    move(to);
    a.onfinish = () => { if (anim !== a) return; anim = after = null; done(); };
  };
  const land = d => () => {
    clear();
    document.body.classList.add('jump');
    goTo(d);
    strip.offsetWidth;
    document.body.classList.remove('jump');
  };
  const flip = (s, d) => {
    flush();
    if (reducedMotion || key(weekStart(d)) === key(weekStart(viewDate))) return goTo(d);
    peek(s, d);
    settle(-s * page(), 360, land(d));
  };

  strip.addEventListener('pointerdown', e => {
    if (e.button !== 0 || reordering) return;
    flush();
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dx = 0; dragging = false; pts = [];
  });
  strip.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) {
        if (Math.abs(my) > 12) start = null;
        return;
      }
      dragging = true;
      try { strip.setPointerCapture(e.pointerId); } catch {}
      if (!reducedMotion) [-1, 1].forEach(s => { if (!$(s < 0 ? 'prev' : 'next').disabled) peek(s, target(s)); });
    }
    dx = mx;
    pts = [...pts.filter(p => e.timeStamp - p.t < 100), { x: e.clientX, t: e.timeStamp }];
    if (reducedMotion) return;
    const w = page(), s = dx < 0 ? 1 : -1;
    move(peeks[s] ? Math.max(-w, Math.min(w, dx)) : dx / (1 + Math.abs(dx) / 80));
  });
  const end = e => {
    if (!start) return;
    start = null;
    if (!dragging) return;
    swiped = true;
    setTimeout(() => swiped = false, 50);
    const s = dx < 0 ? 1 : -1, w = page(), a = pts[0], b = pts[pts.length - 1];
    const v = a && b && b.t - a.t > 8 ? (b.x - a.x) / (b.t - a.t) : 0;
    const go = e.type === 'pointerup' && !$(s < 0 ? 'prev' : 'next').disabled
      && (Math.abs(dx) >= w * .25 || (Math.abs(v) > .35 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 24));
    if (go && reducedMotion) return goTo(target(s));
    if (go) {
      const d = target(s);
      peek(s, d);
      settle(-s * w, Math.round(Math.min(340, Math.max(160, (w - Math.abs(off)) / Math.max(Math.abs(v), .9)))), land(d));
    } else if (off) settle(0, Math.round(Math.min(320, 160 + Math.abs(off))), clear);
    else clear();
  };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  strip.addEventListener('click', e => { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);

  $('prev').onclick = () => { flush(); flip(-1, target(-1)); };
  $('next').onclick = () => { flush(); flip(1, target(1)); };
  const toToday = () => flip(key(viewDate) > todayKey() ? -1 : 1, new Date());
  $('todayBtn').onclick = toToday;
  addEventListener('keydown', e => {
    if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && !e.ctrlKey && !e.metaKey && !e.altKey
        && !e.target.closest?.('input, textarea') && !shownOverlays().length && !isToday(viewDate)) toToday();
  });
}

export function applyView(v) {
  if (v === 'list') v = '7d'; else if (v === 'heat') v = '90d';
  if (!VIEWS[v]) v = '7d';
  document.body.dataset.view = v;
  $('viewBtn').innerHTML = `${IC_VIEW}<span>${VIEWS[v].short}</span>`;
  $('viewBtn').title = `На карточках: ${VIEWS[v].label.toLowerCase()}`;
  $('viewBtn').setAttribute('aria-label', `Вид карточек: ${VIEWS[v].label.toLowerCase()}`);
}
export const CARDS_STORE = NS + '-cards';
export const CARDS = { full: ['Подробные', 'Иконка, название, отметки за неделю и кнопки действий.'], rings: ['Кольца', 'Компактная сетка колец. Касание кольца отмечает привычку, касание названия открывает её карточку.'] };
export function applyCards(v) {
  document.body.dataset.cards = CARDS[v] ? v : 'full';
}
export function renderViewPage() {
  const cur = document.body.dataset.view, cards = document.body.dataset.cards || 'full';
  $('cardsSeg').innerHTML = Object.entries(CARDS).map(([id, [l]]) => `<button type="button" role="radio" aria-checked="${id === cards}" data-c="${id}">${l}</button>`).join('');
  $('cardsHint').textContent = CARDS[cards][1];
  $('viewHistGroup').hidden = cards === 'rings';
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
$('cardsSeg').onclick = e => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  setPref(CARDS_STORE, b.dataset.c); applyCards(b.dataset.c); render(); renderViewPage();
};
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
