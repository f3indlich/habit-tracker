import { $, addDays, days, ofDays, esc, fmtLong, isDue, isToday, key, MONTHS, MONTHS_SHORT, parseKey, plural, redUi, schedText, TIMES, todayKey, weekday, WEEKDAYS } from './core.js?v=1.03a';
import { setIcon } from './icons.js?v=1.03a';
import { at, count, counts, findHabit, frac, goalOn, inLife, isSkipped, lifeEnd, lifeStats, NOTE_MAX, noteOf, rawCount, setNote, streak, targetOn } from './storage.js?v=1.03a';
import { addPeriodSwipe, askConfirm, closeMenu, menuEl, openOverlay, openPopover, toast } from './ui.js?v=1.03a';
import { catName } from './render.js?v=1.03a';
import { openForm } from './form.js?v=1.03a';

export let hist = null;
export const IC_I = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/></svg>';
export const STAT_INFO = {
  streak: {
    icon: '🔥', title: 'Серия',
    lead: 'Сколько запланированных дней подряд цель выполнена полностью.',
    how: 'Дни вне расписания и отмеченные пропуском цепочку не рвут. Сегодняшний день засчитывается после выполнения, а до конца дня серия не сгорает. Один невыполненный день обнуляет счёт. Если цель менялась, каждый день сравнивается с целью, которая действовала в тот день.',
    why: 'Помогает держать ритм: чем длиннее цепочка, тем жальче её прерывать. Лучшая серия становится рекордом.',
  },
  best: {
    icon: '🏆', title: 'Рекорд',
    lead: 'Самая длинная серия за всё время существования привычки.',
    how: 'Считается по тем же правилам, что и серия. Обновляется, когда текущая серия становится длиннее, и не уменьшается после срыва.',
    why: 'Показывает, на что Вы уже способны, и даёт ориентир, который хочется превзойти.',
  },
  done: {
    icon: '✅', title: 'Выполнено',
    lead: 'Доля запланированных дней, когда цель выполнена полностью.',
    how: 'Полностью выполненные дни делятся на все запланированные с момента создания. Частичное выполнение не засчитывается, пропуски и дни вне расписания не учитываются, сегодняшний день — только после выполнения. Если цель менялась, день сравнивается с целью, действовавшей в тот день.',
    why: 'Честная общая картина регулярности: один срыв почти не меняет процент, а долгие перерывы заметно его снижают.',
  },
  power: {
    icon: '💪', title: 'Сила',
    lead: 'Насколько прочно привычка закрепилась именно сейчас.',
    how: 'Учитывается каждый запланированный день, частичное выполнение — частично. Свежие дни весят больше: вклад дня уменьшается вдвое примерно за две недели.',
    why: 'В отличие от серии, один пропуск лишь немного снижает силу, а не обнуляет её. Регулярность в последние недели поднимает шкалу быстрее всего.',
  },
};

export const IC_GOAL = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></svg>';
export const IC_DONE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5.3"/></svg>';
export const IC_FIRE = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.6-4.2-6.6-4.6-11.5-2.6 2-4 4.6-4 7.3-1.1-.6-1.9-1.7-2.1-3.2-1.5 1.8-2.3 4.4-2.3 7.4A6.5 6.5 0 0 0 12 21z"/></svg>';
export const fact = (icon, l, v, sub = '') => `<div class="fact"><span class="fi">${icon}</span><span class="fl">${l}</span>
    <span class="fv">${esc(v)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
export const goalText = g => (g.target > 1 ? `${g.target} ${g.unit || 'раз'} в день` : '1 раз в день') + (g.step > 1 ? ` · шаг ${g.step}` : '');

export function openHistory(id) {
  const h = findHabit(id);
  hist = { id, range: hist?.range || 'week', anchor: parseKey(lifeEnd(h)) };
  $('hTiles')._html = null;
  renderHistory();
  openOverlay($('histOv'));
}
$('histOv').addEventListener('click', e => { if (e.target === $('histOv') || e.target.closest('[data-close]')) hist = null; });
$('hEdit').onclick = () => openForm(hist.id);

$('hTabs').onclick = e => {
  const r = e.target.closest('button')?.dataset.r;
  if (!r || !hist || r === hist.range) return;
  hist.range = r;
  renderHistory();
};
export const shiftAnchor = (range, a, dir) => range === 'week' ? addDays(a, 7 * dir)
  : range === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1)
  : new Date(a.getFullYear() + dir, 0, 1);
export function shiftPeriod(dir) {
  hist.anchor = shiftAnchor(hist.range, hist.anchor, dir);
  renderHistory();
}
$('hPrev').onclick = () => shiftPeriod(-1);
$('hNext').onclick = () => shiftPeriod(1);
addPeriodSwipe($('hSheet'), '#hSheet .pnav, #hStats, #hChart', $('hPrev'), $('hNext'));

export const periodDays = () => rangeDays(hist.range, hist.anchor);
export function rangeDays(range, a) {
  let start, n;
  if (range === 'week') { start = addDays(a, -weekday(a)); n = 7; }
  else if (range === 'month') { start = new Date(a.getFullYear(), a.getMonth(), 1); n = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate(); }
  else { start = new Date(a.getFullYear(), 0, 1); n = Math.round((new Date(a.getFullYear() + 1, 0, 1) - start) / 864e5); }
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

export const periodLabel = ds => rangeLabel(hist.range, ds);
export function rangeLabel(range, ds) {
  const a = ds[0], b = ds[ds.length - 1];
  if (range === 'year') return `${a.getFullYear()} г.`;
  if (range === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()} г.`;
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.getDate()}${sameMonth ? '' : ' ' + MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()} г.`;
}

export function dayTip(h, d) {
  h = at(h, d);
  const k = key(d), c = count(h, d);
  const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  if (k > todayKey()) return `${date}: ещё впереди`;
  if (k < h.created) return `${date}: привычки ещё не было`;
  if (h.archived && k > h.archived) return `${date}: в архиве`;
  if (isSkipped(h, d)) return `${date}: пропуск`;
  if (!isDue(h, d) && !c) return `${date}: не по расписанию`;
  if (h.target === 1) return `${date}: ${c ? 'выполнено' : 'не выполнено'}`;
  return `${date}: ${c} из ${h.target}${h.unit ? ' ' + h.unit : ''}${c > h.target ? ` (+${c - h.target})` : ''}`;
}

export function renderHistory() {
  const h = findHabit(hist.id);
  if (!h) return;
  const ls = lifeStats(h), cur = h.archived ? 0 : streak(h);
  $('hSheet').style.setProperty('--c', h.color);
  setIcon($('hIcon'), h.icon);
  $('hName').textContent = h.name;
  $('hEdit').hidden = !!h.archived;
  const time = TIMES.find(t => t.v === h.time);
  const goal = goalText(h);
  $('hTags').innerHTML = [
    h.archived ? '<span class="tag arch">В архиве</span>' : '',
    `<span class="tag">${esc(h.step > 1 ? `${h.target} ${h.unit || 'раз'} · шаг ${h.step}` : goal)}</span>`,
    `<span class="tag">${time.icon} ${time.v === 'any' ? 'Любое время' : time.label}</span>`,
    h.cat && catName(h.cat) ? `<span class="tag cat">${esc(catName(h.cat))}</span>` : '',
  ].join('');
  requestAnimationFrame(() => $('hTags').classList.toggle('overflow', $('hTags').scrollWidth > $('hTags').clientWidth + 1));
  $('hWhy').hidden = !h.why;
  $('hWhy').innerHTML = `<b>Зачем мне это</b>${esc(h.why)}`;

  const pct = ls.due ? Math.round(ls.full / ls.due * 100) : 0, strength = Math.round(ls.score * 100);
  const tile = (k, icon, l, v, sub, bar) => `<div class="tile">
    <div class="l"><span>${icon}</span>${l}</div><div class="v">${v}</div>
    ${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : `<div class="s">${sub}</div>`}
    <button class="tile-i" data-k="${k}" aria-label="Что значит «${l}»" aria-haspopup="dialog">${IC_I}</button></div>`;
  const tiles =
    tile('streak', '🔥', 'Серия', cur, cur ? `${plural(cur, 'день', 'дня', 'дней')} подряд`
      : h.archived ? 'в архиве' : isDue(h, new Date()) ? 'начните сегодня' : 'пока нет серии') +
    tile('best', '🏆', 'Рекорд', ls.best, plural(ls.best, 'день', 'дня', 'дней')) +
    tile('done', '✅', 'Выполнено', pct + '%', `${ls.full} из ${ofDays(ls.due)}`) +
    tile('power', '💪', 'Сила', strength + '%', '', strength);
  if ($('hTiles')._html !== tiles) { $('hTiles').innerHTML = tiles; $('hTiles')._html = tiles; }
  $('hTiles').onclick = e => {
    const b = e.target.closest('.tile-i');
    if (!b) return;
    if (menuEl?._anchor === b) return closeMenu();
    const t = STAT_INFO[b.dataset.k];
    openPopover(b, `<div class="pop-title">${t.icon} ${t.title}</div><p class="pop-lead">${t.lead}</p>
      <div class="pop-sec"><b>Как считается</b>${t.how}</div><div class="pop-sec"><b>На что влияет</b>${t.why}</div>`, h.color);
  };

  $('hInfo').onclick = e => {
    if (menuEl?._anchor === e.currentTarget) return closeMenu();
    openPopover(e.currentTarget, `<div class="pop-title">Сведения</div><div class="facts">${factsHTML()}</div>`, h.color);
  };
  const factsHTML = () => {
  const ago = k => {
    const n = Math.round((parseKey(todayKey()) - parseKey(k)) / 864e5);
    return n === 0 ? 'сегодня' : n === 1 ? 'вчера' : `${days(n)} назад`;
  };
  const IC_CAL = '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const IC_PEN = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>';
  const IC_REP = '<svg class="ic" viewBox="0 0 24 24"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/></svg>';
  const IC_BOX = '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>';
  const sched = schedText(h);
  return fact(IC_CAL, 'Создана', fmtLong(h.created), ago(h.created)) +
    (h.updated && h.updated !== h.created ? fact(IC_PEN, 'Изменена', fmtLong(h.updated), ago(h.updated)) : '') +
    fact(IC_GOAL, 'Цель', goal) +
    fact(IC_REP, 'Расписание', sched[0].toUpperCase() + sched.slice(1)) +
    fact(IC_BOX.replace('M10 12h4', 'M8 12h8'), 'Категория', catName(h.cat) || 'Без категории') +
    (h.archived ? fact(IC_BOX, 'В архиве', fmtLong(h.archived), ago(h.archived)) : '');
  };

  for (const b of $('hTabs').children) b.setAttribute('aria-pressed', b.dataset.r === hist.range);

  const ds = periodDays();
  $('hLabel').textContent = periodLabel(ds);
  $('hPrev').disabled = key(ds[0]) <= h.created;
  $('hNext').disabled = key(ds[ds.length - 1]) >= lifeEnd(h);

  const live = ds.filter(d => inLife(h, key(d)) && counts(h, d) && !(isToday(d) && count(h, d) < targetOn(h, d)));
  const full = live.filter(d => count(h, d) >= targetOn(h, d)).length;
  const avg = live.length ? live.reduce((s, d) => s + frac(h, d), 0) / live.length : 0;
  $('hStats').innerHTML = live.length
    ? `Выполнено <b>${full}</b> из ${ofDays(live.length)} · средний прогресс <b>${Math.round(avg * 100)}%</b>`
    : 'В этот период данных нет';

  if (hist.range === 'year') {
    const months = Array.from({ length: 12 }, (_, m) => {
      const md = ds.filter(d => d.getMonth() === m && inLife(h, key(d)) && counts(h, d));
      const fullM = md.filter(d => count(h, d) >= targetOn(h, d)).length;
      const pct = md.length ? Math.round(md.reduce((s, d) => s + frac(h, d), 0) / md.length * 100) : 0;
      return {
        value: pct, active: md.length > 0, label: MONTHS_SHORT[m],
        tip: md.length ? `${MONTHS[m]}: ${pct}% · выполнено ${fullM} из ${ofDays(md.length)}` : `${MONTHS[m]}: нет данных`,
      };
    });
    barChart($('hChart'), months, { yMax: 100, ticks: [0, 50, 100], fmt: v => v + '%' });
    $('hHeatWrap').hidden = false;
    heatmap($('hHeat'), ds, d => ({ live: inLife(h, key(d)), f: frac(h, d), tip: dayTip(h, d) }));
  } else {
    $('hChart').innerHTML = (hist.range === 'week' ? weekView(h, ds) : monthView(h, ds)) + '<div class="tip"></div>';
    $('hHeatWrap').hidden = true;
  }
}

export function dayState(h, d) {
  const k = key(d), c = count(h, d);
  if (k > todayKey()) return 'future';
  if (k < h.created) return 'before';
  if (h.archived && k > h.archived) return 'after';
  if (isSkipped(h, d)) return 'skip';
  if (c >= targetOn(h, d)) return 'full';
  if (c > 0) return 'part';
  if (!isDue(h, d)) return 'off';
  return k === todayKey() ? 'pending' : 'miss';
}

export function dayRing(h, d, i, size) {
  const st = dayState(h, d), sw = size > 40 ? 4 : 3, r = size / 2 - sw / 2 - 1, C = 2 * Math.PI * r;
  const share = st === 'full' ? 1 : st === 'part' ? frac(h, d) : 0;
  const c = size / 2;
  return `<div class="dring s-${st}" style="--i:${i}; --C:${C}; width:${size}px; height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>${share
      ? `<circle class="prog" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - share)}"/>` : ''}</svg>
    <span>${d.getDate()}</span></div>`;
}

export function weekView(h, ds) {
  const val = d => {
    const st = dayState(h, d), c = count(h, d), t = targetOn(h, d), multi = t > 1;
    return {
      full: multi ? `${c}/${t}` : 'готово', part: `${c}/${t}`, skip: 'пропуск', off: 'не в плане',
      miss: multi ? `0/${t}` : 'нет', pending: multi ? `0/${t}` : 'сегодня',
    }[st] || '';
  };
  return `<div class="wk">${ds.map((d, i) => `
    <div class="wk-day${isToday(d) ? ' today' : ''}${dayAttrs(h, d)}>
      <div class="wk-wd">${WEEKDAYS[weekday(d)]}</div>
      ${dayRing(h, d, i, 46)}
      <div class="wk-val s-${dayState(h, d)}">${val(d)}</div>
    </div>`).join('')}</div>${legend()}`;
}

export function monthView(h, ds) {
  const pad = weekday(ds[0]);
  return `<div class="cal">
    ${WEEKDAYS.map(w => `<div class="cal-wd">${w}</div>`).join('')}
    ${'<div></div>'.repeat(pad)}
    ${ds.map((d, i) => `<div class="cal-day${isToday(d) ? ' today' : ''}${dayAttrs(h, d)}>${dayRing(h, d, i, 38)}</div>`).join('')}
  </div>${legend()}`;
}

export function dayAttrs(h, d) {
  const tip = esc(dayTip(h, d));
  if (!inLife(h, key(d))) return `" data-tip="${tip}"`;
  const note = noteOf(h, d);
  return `${note ? ' note' : ''}" data-tip="${tip}" data-day="${key(d)}" role="button" tabindex="0" aria-label="${tip}${note ? ', есть заметка' : ''}"`;
}

export let day = null;
export function openDay(id, d) {
  const h = findHabit(id);
  if (!h || !inLife(h, key(d))) return;
  day = { id, d };
  renderDay();
  $('dNote').value = noteOf(h, d);
  noteUi();
  openOverlay($('dayOv'));
}
export function renderDay() {
  const h = findHabit(day.id), d = day.d;
  if (!h) return;
  $('dSheet').style.setProperty('--c', h.color);
  setIcon($('dIcon'), h.icon);
  $('dName').textContent = h.name;
  $('dDate').textContent = fmtLong(key(d)) + (isToday(d) ? ' · сегодня' : '');
  const g = goalOn(h, d), c = rawCount(h, d), part = `${c} из ${g.target} ${g.unit || 'раз'}`;
  const [done, sub] = isSkipped(h, d) ? ['Пропуск', '']
    : g.target > 1 && c > g.target ? ['Перевыполнено', `${part} (+${c - g.target})`]
    : c >= g.target ? ['Полностью', g.target > 1 ? part : '']
    : c > 0 ? ['Частично', part]
    : !isDue(h, d) ? ['Не по расписанию', '']
    : [isToday(d) ? 'Пока не выполнено' : 'Не выполнено', g.target > 1 ? part : ''];
  const s = streak(h, key(d));
  $('dFacts').innerHTML = fact(IC_GOAL, 'Цель', goalText(g)) + fact(IC_DONE, 'Выполнение', done, sub) +
    fact(IC_FIRE, 'Серия', s ? `${s} ${plural(s, 'день', 'дня', 'дней')}` : 'Нет', s ? 'подряд на этот день' : '');
}
function noteUi() {
  const h = findHabit(day.id), v = $('dNote').value;
  $('dNoteDel').hidden = !noteOf(h, day.d);
  $('dNoteCount').textContent = v.length > NOTE_MAX - 100 ? `${v.length} / ${NOTE_MAX}` : '';
}
$('dNote').addEventListener('input', () => {
  const h = findHabit(day?.id);
  if (!h) return;
  const had = !!noteOf(h, day.d);
  setNote(h, day.d, $('dNote').value);
  noteUi();
  if (had !== !!noteOf(h, day.d) && hist) renderHistory();
});
$('dNoteDel').onclick = async () => {
  const h = findHabit(day?.id), was = noteOf(h, day.d), d = day.d;
  if (redUi() && !await askConfirm('Удалить заметку?', 'Текст заметки за этот день будет стёрт.', 'Удалить')) return;
  setNote(h, d, '');
  $('dNote').value = '';
  noteUi();
  if (hist) renderHistory();
  toast('Заметка удалена', () => {
    setNote(h, d, was);
    if (day?.id === h.id && key(day.d) === key(d)) { $('dNote').value = was; noteUi(); }
    if (hist) renderHistory();
  });
};
$('dayOv').addEventListener('click', e => { if (e.target === $('dayOv') || e.target.closest('[data-close]')) day = null; });
$('hChart').addEventListener('click', e => {
  const t = e.target.closest('[data-day]');
  if (!t || !hist) return;
  $('hChart').querySelector('.tip')?.classList.remove('show');
  openDay(hist.id, parseKey(t.dataset.day));
});
$('hChart').addEventListener('keydown', e => {
  const t = e.target.closest?.('[data-day]');
  if (!t || !hist || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  openDay(hist.id, parseKey(t.dataset.day));
});

export const legend = () => `<div class="cal-legend">
  <span><i class="lg full"></i>выполнено</span><span><i class="lg part"></i>частично</span>
  <span><i class="lg miss"></i>не выполнено</span><span><i class="lg skip"></i>пропуск</span><span><i class="lg off"></i>не в плане</span>
</div>`;

export const svgEl = (w, hgt, inner) => `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" role="img">${inner}</svg>`;

export function colPath(x, y, w, hgt) {
  const r = Math.min(4, w / 2, hgt);
  return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
}

export function barChart(box, items, { yMax, ticks, fmt }) {
  const W = box.clientWidth || 540, H = 200, L = 34, R = 4, T = 10, B = items[0].sub ? 40 : 24;
  const iw = W - L - R, ih = H - T - B, band = iw / items.length;
  const bw = Math.max(2, Math.min(24, band - Math.max(2, band * .3)));
  const y = v => T + ih - ih * Math.min(v / yMax, 1);
  let s = '';
  for (const t of ticks) {
    s += `<line class="${t ? 'gridl' : 'base'}" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>`;
    s += `<text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  }
  items.forEach((it, i) => {
    const cx = L + band * i + band / 2;
    s += `<rect class="hit" x="${L + band * i}" y="${T}" width="${band}" height="${ih}" data-tip="${esc(it.tip)}"/>`;
    if (it.active && it.value > 0) {
      const top = y(it.value);
      s += `<path class="bar" style="--i:${i}" d="${colPath(cx - bw / 2, top, bw, T + ih - top)}" pointer-events="none"/>`;
    }
    const lbl = items.length === 12 && band < 30 ? it.label.slice(0, 1) : it.label;
    if (lbl) s += `<text x="${cx}" y="${T + ih + 17}" text-anchor="middle">${lbl}</text>`;
    if (it.sub) s += `<text x="${cx}" y="${T + ih + 33}" text-anchor="middle">${it.sub}</text>`;
  });
  box.innerHTML = svgEl(W, H, s) + '<div class="tip"></div>';
}

export const heatLv = (live, f) => !live ? 'lvx' : f >= 1 ? 'lv4' : f >= .75 ? 'lv3' : f >= .5 ? 'lv2' : f > 0 ? 'lv1' : 'lv0';
export function heatmap(box, ds, cell) {
  const LW = 24, L = 0, T = 18, W = (box.clientWidth || 540) - LW;
  const offset = weekday(ds[0]), cols = Math.ceil((ds.length + offset) / 7);
  const cs = Math.max(11, Math.min(14, Math.floor(W / cols))), sz = cs - 2;
  const H = T + cs * 7, SW = L + cols * cs;
  const tk = todayKey();
  let s = '', lastX = 0;
  const labels = `<div class="hlabels" style="width:${LW}px;padding-top:${T}px">${WEEKDAYS.map((w, r) => `<span style="height:${cs}px">${r % 2 ? '' : w}</span>`).join('')}</div>`;
  ds.forEach((d, i) => {
    const k = key(d);
    if (k > tk) return;
    const col = Math.floor((i + offset) / 7), row = weekday(d);
    if (d.getDate() === 1 && cs * 4 > 24) s += `<text x="${L + col * cs}" y="${T - 6}">${MONTHS_SHORT[d.getMonth()]}</text>`;
    const c = cell(d), f = c.f;
    const lv = heatLv(c.live, f);
    s += `<rect class="cell ${lv}" style="--i:${col}" x="${L + col * cs}" y="${T + row * cs}" width="${sz}" height="${sz}" rx="2" data-tip="${esc(c.tip)}"/>`;
    lastX = L + col * cs + cs;
  });
  box.innerHTML = `<div class="heatwrap">${labels}<div class="hscroll">${svgEl(SW, H, s)}</div></div><div class="tip"></div>`;
  const sc = box.querySelector('.hscroll');
  sc.scrollLeft = Math.max(0, lastX + 8 - sc.clientWidth);
}

export function calendarHeat(box, ds, cell) {
  const offset = weekday(ds[0]), rows = Math.ceil((ds.length + offset) / 7), tk = todayKey();
  const LW = 30, T = 18, gap = 3, rh = 20, W = (box.clientWidth || 340) - LW, cw = (W - gap * 6) / 7;
  let s = WEEKDAYS.map((w, i) => `<text x="${LW + i * (cw + gap) + cw / 2}" y="11" text-anchor="middle">${w}</text>`).join(''), lastM = -1;
  ds.forEach((d, i) => {
    const row = Math.floor((i + offset) / 7), y = T + row * (rh + gap);
    if ((weekday(d) === 0 || i === 0) && d.getMonth() !== lastM) { lastM = d.getMonth(); s += `<text x="0" y="${y + rh / 2 + 4}">${MONTHS_SHORT[lastM]}</text>`; }
    const x = (LW + weekday(d) * (cw + gap)).toFixed(1), k = key(d);
    if (k > tk) {
      const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
      s += `<rect class="cell fut" style="--i:${row}" x="${+x + .75}" y="${y + .75}" width="${(cw - 1.5).toFixed(1)}" height="${rh - 1.5}" rx="4" data-tip="${esc(date)}: ещё впереди"/>`;
      return;
    }
    const c = cell(d), f = c.f;
    const lv = heatLv(c.live, f);
    s += `<rect class="cell ${lv}${k === tk ? ' today' : ''}" style="--i:${row}" x="${x}" y="${y}" width="${cw.toFixed(1)}" height="${rh}" rx="4" data-tip="${esc(c.tip)}"/>`;
  });
  box.innerHTML = svgEl(W + LW, T + rows * (rh + gap) - gap, s) + '<div class="tip"></div>';
}

export function bindTips(box) {
  let on = null;
  const show = e => {
    const t = e.target.closest('[data-tip]'), tip = box.querySelector('.tip');
    if (!tip || (t === on && e.type !== 'click')) return;
    on?.classList.remove('on');
    on = t;
    if (!t) return tip.classList.remove('show');
    t.classList.add('on');
    const r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
    tip.textContent = t.dataset.tip;
    const half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(b.width - half, r.left - b.left + r.width / 2)) + 'px';
    tip.style.top = (t.classList.contains('hit') ? 10 : r.top - b.top) + 'px';
    tip.classList.add('show');
  };
  box.addEventListener('pointermove', show);
  box.addEventListener('click', show);
  box.addEventListener('pointerleave', () => {
    on?.classList.remove('on'); on = null;
    box.querySelector('.tip')?.classList.remove('show');
  });
}
bindTips($('hChart'));
bindTips($('hHeat'));

export function setHist(v) { hist = v; }
