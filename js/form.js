import { $, addDays, COLORS, days, esc, scheduleOf, fromMin, HHMM, isIOS, key, parseKey, plural, reducedMotion, redUi, schedText, TEMPLATES, TIMES, todayKey, toMin, weekday, WEEKDAYS } from './core.js?v=1.05a';
import { IC, ICON_KEYS, iconHTML, setIcon } from './icons.js?v=1.05a';
import { isPrivate, privateHabits, unlocked, visibleHabits } from './privacy.js?v=1.05a';
import { findHabit, goalOn, normRemind, normSchedule, noteGoalChange, sameSchedule, save, state } from './storage.js?v=1.05a';
import { askConfirm, closeOverlay, openOverlay, toast } from './ui.js?v=1.05a';
import { catName, render } from './render.js?v=1.05a';
import { hist, renderHistory } from './history.js?v=1.05a';
import { renderRemindHint } from './push.js?v=1.05a';

export let editingId = null;
export const form = {
  icon: 'check', color: COLORS[0], goal: 'once', sched: 'daily', days: [0, 1, 2, 3, 4], times: 3, every: 2, anchor: '', dom: 1, time: 'any', cat: null, newCat: false,
  rem: { on: false, touched: false, mode: 'times', times: ['09:00'], repeat: 0, repeatN: 1, from: '09:00', to: '21:00', days: null, dates: false, dFrom: '', dTo: '' },
};

export function drawIconPickers() {
  $('emojis').innerHTML = ICON_KEYS.map(k => `<button type="button" data-v="${k}" title="${k}"><span class="hicon">${iconHTML(k)}</span></button>`).join('');
  $('templates').innerHTML = TEMPLATES.map((t, i) => `<button type="button" data-i="${i}"><span class="hicon ti" style="--c:${t.color}">${iconHTML(t.icon)}</span>${esc(t.name)}</button>`).join('');
}
$('colors').innerHTML = COLORS.map(c => `<button type="button" data-v="${c}" style="--sw:${c}" aria-label="Цвет ${c}"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`).join('');
$('weekdays').innerHTML = WEEKDAYS.map((w, i) => `<button type="button" data-v="${i}">${w}</button>`).join('');
$('timesChips').innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<button type="button" data-v="${n}">${n}</button>`).join('');
$('everyChips').innerHTML = [2, 3, 4, 5, 6, 7, 8].map(n => `<button type="button" data-v="${n}">${n}</button>`).join('');
export const SCHED_OF_FORM = { daily: 'daily', days: 'weekdays', perWeek: 'perWeek', everyNWeeks: 'everyNWeeks', monthly: 'monthly' };
export function formSchedule(created = todayKey()) {
  const t = SCHED_OF_FORM[form.sched];
  return normSchedule({ type: t, days: [...form.days], times: form.times, every: form.every, anchor: form.anchor || created, dom: form.dom }, created);
}
export function schedHint() {
  switch (form.sched) {
    case 'perWeek': return 'В любые удобные дни с понедельника по воскресенье. Когда наберёте нужное число раз, до конца недели привычки не будет в списке на день.';
    case 'everyNWeeks': return `Привычка будет в списке в неделю с выбранной датой, а дальше — ${form.every === 2 ? 'через неделю' : `раз в ${form.every} ${plural(form.every, 'неделю', 'недели', 'недель')}`}.`;
    case 'monthly': return form.dom > 28 ? `В месяцах без ${form.dom} числа — в последний день месяца.` : `Каждый месяц ${form.dom} числа.`;
    default: return '';
  }
}
$('timeSeg').innerHTML = TIMES.map(t => `<button type="button" data-v="${t.v}"><span class="t-ic">${t.icon}</span><span class="t-lb">${t.label}</span></button>`).join('');

export function syncPreview() {
  const box = $('formPrev');
  const changed = box.style.getPropertyValue('--c') && box.style.getPropertyValue('--c') !== form.color;
  box.style.setProperty('--c', form.color);
  $('form').style.setProperty('--fc', form.color);
  $('emojis').style.setProperty('--c', form.color);
  setIcon($('fpIcon'), form.icon);
  const n = formTarget(), unit = $('unit').value.trim();
  const goal = form.goal === 'once' ? 'Один раз в день'
    : `${n} ${unit || plural(n, 'раз', 'раза', 'раз')} в день` + (form.goal === 'step' ? ` · по ${formStep()} за нажатие` : '');
  const sc = formSchedule();
  const sched = sc ? schedText({ schedule: sc }) : 'дни не выбраны';
  const time = TIMES.find(t => t.v === form.time);
  $('fpMeta').textContent = [goal, sched, form.time !== 'any' && time ? time.label.toLowerCase() : '', remShort()].filter(Boolean).join(' · ');
  renderRemindHint();
  if (changed && !reducedMotion) {
    box.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    $('fpIcon').animate([{ transform: 'scale(.82) rotate(-8deg)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  }
}
for (const id of ['name', 'unit']) $(id).addEventListener('input', syncPreview);
$('target').addEventListener('input', () => goalInput());

export const REM_DEFAULT = { morning: ['08:00', '07:00', '12:00'], day: ['13:00', '10:00', '18:00'], evening: ['20:00', '17:00', '22:00'], any: ['09:00', '09:00', '21:00'] };
export const remDefaults = () => REM_DEFAULT[form.time] || REM_DEFAULT.any;
export const formTarget = () => form.goal === 'once' ? 1 : clampTarget($('target').value);
export const formStep = () => form.goal === 'step' ? clampStep($('step').value) : 1;
export const remTarget = () => Math.ceil(formTarget() / formStep());
export const habitDays = () => (form.sched === 'days' || form.sched === 'everyNWeeks') && form.days.length && form.days.length < 7 ? form.days : [0, 1, 2, 3, 4, 5, 6];
export const remDays = () => { const all = habitDays(), d = (form.rem.days || all).filter(x => all.includes(x)); return d.length ? d : all; };
export const remIsSpread = () => form.rem.mode === 'spread' && remTarget() > 1;
export const fmtDur = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return [h && `${h} ч`, mm && `${mm} мин`].filter(Boolean).join(' ') || 'меньше минуты'; };
export const fmtShortDay = k => parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
export const fmtPickDay = k => {
  const d = parseKey(k), other = d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: other ? 'short' : 'long', ...(other && { year: 'numeric' }) })
    .replace(/\./g, '').replace(/\s?г$/, '').trim() + (other ? ' г.' : '');
};
export const joinAnd = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1];

export function remFromHabit(h) {
  const [t, f, to] = remDefaults();
  const r = h?.remind;
  return {
    on: !!r, touched: !!r, mode: r?.spread ? 'spread' : r ? 'times' : (form.goal !== 'once' ? 'spread' : 'times'),
    times: r?.times ? [...r.times] : [t], repeat: r?.repeat || 0, repeatN: r?.repeatN || 1,
    from: r?.spread?.from || f, to: r?.spread?.to || to,
    days: r?.days ? [...r.days] : null, dates: !!(r?.from || r?.to), dFrom: r?.from || '', dTo: r?.to || '',
  };
}
export function remToData() {
  const r = form.rem;
  if (!r.on) return undefined;
  const out = {};
  if (remIsSpread()) out.spread = { from: r.from, to: r.to };
  else { out.times = [...r.times]; if (r.repeat) { out.repeat = r.repeat; out.repeatN = r.repeatN; } }
  const all = habitDays(), days = remDays();
  if (days.length < all.length) out.days = [...days];
  if (r.dates) { if (r.dFrom) out.from = r.dFrom; if (r.dTo) out.to = r.dTo; }
  return normRemind(out, remTarget()) || undefined;
}
export function remSummaryText() {
  const r = form.rem;
  if (!r.on) return 'Выключены';
  const parts = [];
  if (remIsSpread()) {
    const n = remTarget();
    parts.push(`${n} ${plural(n, 'раз', 'раза', 'раз')} с ${r.from} до ${r.to}`);
  } else {
    parts.push('в ' + joinAnd(r.times));
    if (r.repeat) parts.push(`повтор через ${r.repeat === 60 ? 'час' : r.repeat + ' мин'}`);
  }
  const days = remDays();
  if (days.length < 7) parts.push(schedText({ days }));
  if (r.dates && (r.dFrom || r.dTo)) parts.push(r.dFrom && r.dTo ? `${fmtShortDay(r.dFrom)} — ${fmtShortDay(r.dTo)}` : r.dTo ? `до ${fmtShortDay(r.dTo)}` : `с ${fmtShortDay(r.dFrom)}`);
  const s = parts.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function remShort() {
  const r = form.rem;
  if (!r?.on) return '';
  if (remIsSpread()) return `🔔 ${remTarget()}× ${r.from}–${r.to}`;
  return '🔔 ' + (r.times.length > 2 ? `${r.times.slice(0, 2).join(', ')} +${r.times.length - 2}` : r.times.join(', '));
}

export const setCollapse = (el, open) => { el.classList.toggle('open', open); el.inert = !open; };
$('remDays').innerHTML = WEEKDAYS.map((w, i) => `<button type="button" data-v="${i}">${w}</button>`).join('');

export function renderTimes(enterIndex = -1) {
  const t = form.rem.times;
  $('remTimes').innerHTML = t.map((v, i) => `<span class="tchip${t.length > 1 ? '' : ' solo'}" data-i="${i}">
      <label class="tpick"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><b>${v}</b><input class="native" type="time" step="300" value="${v}" aria-label="Время напоминания ${i + 1}"></label>
      ${t.length > 1 ? `<button type="button" class="x" aria-label="Убрать ${v}"><svg class="ic" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>` : ''}
    </span>`).join('')
    + (t.length < 6 ? `<button type="button" class="tadd" id="remAdd"><svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Добавить</button>` : '');
  const chip = $('remTimes').querySelector(`.tchip[data-i="${enterIndex}"]`);
  if (chip && !reducedMotion) chip.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
}

export function renderRem() {
  const r = form.rem, multi = remTarget() > 1;
  if (!r.touched) {
    const [t, f, to] = remDefaults();
    const before = r.times.join();
    Object.assign(r, { mode: multi ? 'spread' : 'times', times: [t], from: f, to });
    if (before !== r.times.join()) renderTimes();
  }
  if (!multi && r.mode === 'spread') r.mode = 'times';
  $('rem').classList.toggle('on', r.on);
  $('remSwitch').setAttribute('aria-checked', r.on);
  setCollapse($('remWrap'), r.on);
  setCollapse($('remModeWrap'), multi);
  $('remMode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (remIsSpread() ? 'spread' : 'times')));
  setCollapse($('remSpreadWrap'), remIsSpread());
  setCollapse($('remTimesWrap'), !remIsSpread());
  if (document.activeElement !== $('remFrom')) $('remFrom').value = r.from;
  if (document.activeElement !== $('remTo')) $('remTo').value = r.to;
  $('remFromVal').textContent = r.from;
  $('remToVal').textContent = r.to;
  const n = remTarget(), span = toMin(r.to) - toMin(r.from);
  $('remSpreadNote').textContent = span <= 0
    ? 'Конец промежутка должен быть позже начала.'
    : `${n} ${plural(n, 'напоминание', 'напоминания', 'напоминаний')}, примерно каждые ${fmtDur(span / Math.max(1, n - 1))}. Придут, только если Вы отстаёте от плана.`;
  $('remSpreadNote').classList.toggle('bad', span <= 0);
  $('remRepeat').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === r.repeat));
  setCollapse($('remRepeatWrap'), !remIsSpread());
  const rOn = r.repeat > 0, row = $('remRepeatNRow');
  row.classList.toggle('off', !rOn);
  row.querySelectorAll('button').forEach(b => { b.disabled = !rOn; });
  let note = 'Напоминание придёт один раз в указанное время.';
  if (rOn) {
    const after = Array.from({ length: r.repeatN }, (_, k) => (k + 1) * r.repeat);
    const fmtAfter = m => m % 60 ? `${m} мин` : m === 60 ? 'час' : `${m / 60} ч`;
    note = r.times.length === 1
      ? (r.repeatN === 1 ? 'Ещё раз' : `Ещё ${r.repeatN} ${plural(r.repeatN, 'раз', 'раза', 'раз')}`) + ` в ${joinAnd(after.map(m => toMin(r.times[0]) + m).filter(m => m < 1440).map(fromMin))}, если привычка не отмечена.`
      : `Через ${joinAnd(after.map(fmtAfter))} после каждого времени, если привычка не отмечена.`;
  }
  $('remRepeatNote').textContent = note;
  $('remRepeatN').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === r.repeatN));
  $('remRepeatWord').textContent = plural(r.repeatN, 'раза', 'раз', 'раз');
  const all = habitDays(), sel = remDays();
  $('remDays').querySelectorAll('button').forEach(b => {
    const d = +b.dataset.v;
    b.disabled = !all.includes(d);
    b.setAttribute('aria-pressed', sel.includes(d));
  });
  $('remDatesSwitch').setAttribute('aria-checked', r.dates);
  setCollapse($('remDatesWrap'), r.dates);
  if (document.activeElement !== $('remDFrom')) $('remDFrom').value = r.dFrom;
  if (document.activeElement !== $('remDTo')) $('remDTo').value = r.dTo;
  $('remDFromVal').textContent = r.dFrom ? fmtPickDay(r.dFrom) : 'Не выбрано';
  $('remDToVal').textContent = r.dTo ? fmtPickDay(r.dTo) : 'Не выбрано';
  const sum = $('remSummary'), text = remSummaryText();
  if (sum.textContent !== text) {
    const had = sum.textContent;
    sum.textContent = text;
    if (had && !reducedMotion) sum.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
}
export function remChanged() { form.rem.touched = true; renderRem(); syncPreview(); }

export function remToggle() {
  const r = form.rem;
  r.on = !r.on;
  if (r.on && !reducedMotion) {
    const ic = $('remIc');
    ic.classList.remove('ringing'); void ic.offsetWidth; ic.classList.add('ringing');
    setTimeout(() => $('rem').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 380);
  }
  remChanged();
}
$('remHead').onclick = e => { if (!e.target.closest('#remSwitch')) remToggle(); };
export const noTimePopup = /Firefox\//.test(navigator.userAgent);
export function openPicker(input) {
  if (isIOS) return input.focus();
  try {
    if (input.type === 'time' && noTimePopup) throw new Error('no popup');
    input.showPicker();
  } catch {
    const box = input.parentElement;
    box.classList.add('editing');
    input.focus();
    input.addEventListener('blur', () => {
      box.classList.remove('editing');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { once: true });
  }
}
$('rem').addEventListener('click', e => {
  const input = e.target.closest('.native');
  if (!input || isIOS || input.parentElement.classList.contains('editing')) return;
  e.preventDefault();
  openPicker(input);
});
$('rem').addEventListener('input', e => {
  const input = e.target.closest('.native');
  if (!input) return;
  const b = input.parentElement.querySelector('b');
  if (input.type === 'time' && HHMM.test(input.value)) b.textContent = input.value;
  if (input.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) b.textContent = fmtPickDay(input.value);
});
$('remSwitch').onclick = remToggle;
$('remMode').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.mode = b.dataset.v; remChanged(); } };
$('remRepeat').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.repeat = +b.dataset.v; remChanged(); } };
$('remRepeatN').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.repeatN = +b.dataset.v; remChanged(); } };
for (const [id, k] of [['remFrom', 'from'], ['remTo', 'to']]) {
  $(id).addEventListener('change', e => {
    if (e.target.parentElement.classList.contains('editing')) return;
    if (HHMM.test(e.target.value)) form.rem[k] = e.target.value; else e.target.value = form.rem[k];
    remChanged();
  });
}
$('remDays').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = +b.dataset.v, cur = remDays();
  const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort();
  if (!next.length) { $('remDays').classList.remove('shake'); void $('remDays').offsetWidth; $('remDays').classList.add('shake'); return toast('Нужен хотя бы один день', null, ''); }
  form.rem.days = next.length === habitDays().length ? null : next;
  remChanged();
};
$('remDatesRow').onclick = e => {
  const r = form.rem;
  r.dates = !r.dates;
  if (r.dates && !r.dFrom && !r.dTo) { r.dFrom = todayKey(); r.dTo = key(addDays(new Date(), 30)); }
  remChanged();
};
for (const [id, k] of [['remDFrom', 'dFrom'], ['remDTo', 'dTo']]) {
  $(id).addEventListener('change', e => {
    if (e.target.parentElement.classList.contains('editing')) return;
    const r = form.rem;
    r[k] = /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : '';
    if (r.dFrom && r.dTo && r.dFrom > r.dTo) { if (k === 'dFrom') r.dTo = r.dFrom; else r.dFrom = r.dTo; }
    remChanged();
  });
}
$('remTimes').addEventListener('change', e => {
  const input = e.target.closest('input'), chip = input?.closest('.tchip');
  if (!chip || input.parentElement.classList.contains('editing')) return;
  const i = +chip.dataset.i, t = form.rem.times, v = input.value;
  const revert = () => { input.value = t[i]; input.parentElement.querySelector('b').textContent = t[i]; };
  if (!HHMM.test(v)) return revert();
  if (t.some((x, j) => x === v && j !== i)) { chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake'); revert(); return toast('Такое время уже есть', null, ''); }
  t[i] = v; t.sort();
  renderTimes(); remChanged();
});
$('remTimes').addEventListener('click', e => {
  const t = form.rem.times;
  if (e.target.closest('#remAdd')) {
    let m = t.length ? toMin(t[t.length - 1]) + 180 : toMin(remDefaults()[0]);
    if (m > 22 * 60) m = t.length && toMin(t[0]) - 180 >= 6 * 60 ? toMin(t[0]) - 180 : 12 * 60;
    for (let k = 0; k < 48 && t.includes(fromMin(m % 1440)); k++) m += 30;
    const v = fromMin(m % 1440);
    t.push(v); t.sort();
    renderTimes(t.indexOf(v)); remChanged();
    openPicker($('remTimes').querySelector(`.tchip[data-i="${t.indexOf(v)}"] .native`));
    return;
  }
  const x = e.target.closest('.x');
  if (!x) return;
  const chip = x.closest('.tchip'), i = +chip.dataset.i;
  const done = () => { t.splice(i, 1); renderTimes(); remChanged(); };
  if (reducedMotion) return done();
  chip.style.pointerEvents = 'none';
  chip.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 180, easing: 'cubic-bezier(.55, 0, .75, .2)' }).finished.then(done, done);
});

export function syncForm() {
  const press = (box, fn) => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', fn(b.dataset.v)));
  press($('emojis'), v => v === form.icon);
  press($('colors'), v => v === form.color);
  press($('goalSeg'), v => v === form.goal);
  press($('schedSeg'), v => v === form.sched);
  press($('weekdays'), v => form.days.includes(+v));
  press($('timeSeg'), v => v === form.time);
  setCollapse($('goalWrap'), form.goal !== 'once');
  setCollapse($('stepWrap'), form.goal === 'step');
  $('target').max = form.goal === 'step' ? 10000 : 100;
  if (form.goal !== 'once') $('target').value = clampTarget($('target').value);
  renderStep();
  setCollapse($('daysWrap'), form.sched === 'days' || form.sched === 'everyNWeeks');
  setCollapse($('timesWrap'), form.sched === 'perWeek');
  setCollapse($('everyWrap'), form.sched === 'everyNWeeks');
  setCollapse($('domWrap'), form.sched === 'monthly');
  press($('timesChips'), v => +v === form.times);
  press($('everyChips'), v => +v === form.every);
  $('timesLbl').innerHTML = `<b>${form.times} ${plural(form.times, 'раз', 'раза', 'раз')}</b> в неделю, в любые дни`;
  $('everyLbl').innerHTML = `Каждые <b>${form.every} ${plural(form.every, 'неделю', 'недели', 'недель')}</b>, в выбранные дни`;
  if ($('anchor').value !== form.anchor) $('anchor').value = form.anchor;
  if (document.activeElement !== $('dom')) $('dom').value = form.dom;
  $('schedHint').textContent = schedHint();
  $('schedHint').hidden = !$('schedHint').textContent;
  if (form.cat && !catName(form.cat)) form.cat = null;
  $('catChips').innerHTML = [{ id: '', name: 'Без категории' }, ...state.categories]
    .map(c => `<button type="button" data-v="${esc(c.id)}" aria-pressed="${(form.cat || '') === c.id}">${esc(c.name)}</button>`).join('')
    + `<button type="button" class="add-chip" data-v="__new" aria-pressed="${form.newCat}">+ Новая категория</button>`;
  setCollapse($('newCatWrap'), form.newCat);
  renderRem();
  syncPreview();
}
export const pick = (box, fn) => box.onclick = e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); syncForm(); } };
pick($('emojis'), v => form.icon = v);
pick($('colors'), v => form.color = v);
pick($('goalSeg'), v => form.goal = v);
pick($('schedSeg'), v => {
  if (v === 'everyNWeeks' && !['everyNWeeks', 'days'].includes(form.sched)) form.days = [weekday(new Date())];
  form.sched = v;
});
pick($('timesChips'), v => form.times = +v);
pick($('everyChips'), v => form.every = +v);
$('anchor').addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test($('anchor').value)) form.anchor = $('anchor').value; syncForm(); });
$('dom').addEventListener('input', () => { const n = parseInt($('dom').value); if (n >= 1 && n <= 31) { form.dom = n; syncForm(); } });
$('dom').addEventListener('change', () => { $('dom').value = form.dom; });
pick($('timeSeg'), v => form.time = v);
pick($('catChips'), v => {
  if (v === '__new') { form.newCat = !form.newCat; if (form.newCat) setTimeout(() => $('newCatName').focus(), 80); }
  else { form.cat = v || null; form.newCat = false; }
});
export function addCategory(name) {
  name = name.trim().slice(0, 40);
  if (!name) return null;
  const existing = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  state.categories.push({ id, name });
  save();
  return id;
}
$('newCatAdd').onclick = () => {
  const id = addCategory($('newCatName').value);
  if (!id) return $('newCatName').focus();
  form.cat = id; form.newCat = false; $('newCatName').value = '';
  syncForm(); render();
};
$('newCatName').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('newCatAdd').click(); } };
$('formManageCats').onclick = () => openCats();
pick($('weekdays'), v => {
  v = +v;
  form.days = form.days.includes(v) ? form.days.filter(x => x !== v) : [...form.days, v].sort();
});
$('templates').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = TEMPLATES[b.dataset.i];
  $('name').value = t.name;
  Object.assign(form, { icon: t.icon, color: t.color, time: t.time, goal: t.step ? 'step' : t.target > 1 ? 'multi' : 'once' });
  if (t.target > 1) $('target').value = t.target;
  if (t.step) $('step').value = t.step;
  $('unit').value = t.unit || '';
  syncForm();
};
export const clampTarget = v => Math.max(2, Math.min(form.goal === 'step' ? 10000 : 100, parseInt(v) || 2));
export const clampStep = v => Math.max(1, Math.min(clampTarget($('target').value), parseInt(v) || 1));
export const goalInput = () => { renderStep(); renderRem(); syncPreview(); };
export const targetBy = dir => {
  const t = clampTarget($('target').value), s = form.goal === 'step' ? formStep() : 1;
  $('target').value = clampTarget(dir > 0 ? (Math.floor(t / s) + 1) * s : (Math.ceil(t / s) - 1) * s);
  goalInput();
};
$('tMinus').onclick = () => targetBy(-1);
$('tPlus').onclick = () => targetBy(1);
$('sMinus').onclick = () => { $('step').value = clampStep(formStep() - 1); goalInput(); };
$('sPlus').onclick = () => { $('step').value = clampStep(formStep() + 1); goalInput(); };
$('step').addEventListener('input', goalInput);
$('step').addEventListener('change', () => { $('step').value = formStep(); goalInput(); });
$('target').addEventListener('change', () => { $('target').value = clampTarget($('target').value); goalInput(); });
$('stepChips').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  $('step').value = clampStep(b.dataset.v);
  goalInput();
};
export const STEP_PRESETS = [2, 5, 10, 15, 20, 25, 30, 50, 100, 250, 500];
export function renderStep() {
  if (form.goal !== 'step') return;
  const t = formTarget(), s = formStep(), u = Math.ceil(t / s);
  if (document.activeElement !== $('step')) $('step').value = s;
  $('step').max = t;
  $('stepSum').innerHTML = `<b>${u}</b> ${plural(u, 'нажатие', 'нажатия', 'нажатий')} до цели`;
  const presets = STEP_PRESETS.filter(v => v < t && t / v <= 60);
  const chips = (presets.length > 5 ? presets.filter((v, i) => i >= presets.length - 5) : presets);
  const chipKey = chips.join();
  if ($('stepChips').dataset.k !== chipKey) {
    $('stepChips').dataset.k = chipKey;
    $('stepChips').innerHTML = chips.map(v => `<button type="button" data-v="${v}">${v}</button>`).join('');
  }
  $('stepChips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === s));
  const viz = $('stepViz'), show = Math.min(u, 20), vizKey = `${t}/${s}`;
  if (viz.dataset.k === vizKey) return;
  const prevN = +viz.dataset.n || 0;
  viz.dataset.k = vizKey; viz.dataset.n = show;
  const last = (t % s || s) / s;
  viz.innerHTML = Array.from({ length: show }, (_, i) => `<i style="flex:${i === u - 1 ? last : 1}"></i>`).join('')
    + (u > show ? `<span>+${u - show}</span>` : '');
  if (!reducedMotion && $('formOv')._shown) viz.querySelectorAll('i').forEach((el, i) => {
    if (i >= prevN) el.animate([{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: Math.min(i - prevN, 10) * 22, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'backwards' });
  });
}

let privRow = null;
export function syncPrivRow() {
  if (!unlocked) { privRow?.remove(); privRow = null; return; }
  if (!privRow) {
    privRow = document.createElement('div');
    privRow.className = 'field';
    privRow.innerHTML = `<div class="rem priv-rem"><div class="rem-head"><span class="rem-ic">${IC.lock}</span>
      <span class="rem-tt"><b>Личная привычка</b><small>Только в разделе «Личное»</small></span>
      <button type="button" class="switch" role="switch" aria-label="Личная привычка"><span></span></button></div></div>`;
    privRow.querySelector('.rem-head').onclick = () => { form.priv = !form.priv; syncPrivRow(); };
  }
  if (!privRow.isConnected) $('why').closest('.field').before(privRow);
  privRow.querySelector('.rem').classList.toggle('on', form.priv);
  privRow.querySelector('.switch').setAttribute('aria-checked', form.priv);
}

export function openForm(id = null, priv = false) {
  const h = id && findHabit(id);
  editingId = h ? id : null;
  form.priv = unlocked && (h ? isPrivate(h) : priv);
  syncPrivRow();
  $('form').reset();
  $('formTitle').textContent = h ? 'Изменить привычку' : 'Новая привычка';
  $('submit').innerHTML = h
    ? '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Сохранить'
    : '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Добавить привычку';
  $('tplField').hidden = !!h;
  Object.assign(form, h
    ? { icon: h.icon, color: h.color, goal: h.step ? 'step' : h.target > 1 ? 'multi' : 'once', sched: h.days ? 'days' : 'daily', days: h.days ? [...h.days] : [0, 1, 2, 3, 4], time: h.time, cat: h.cat }
    : { icon: 'check', color: COLORS[visibleHabits(state).length % COLORS.length], goal: 'once', sched: 'daily', days: [0, 1, 2, 3, 4], time: 'any', cat: null },
    { newCat: false });
  const sc = h ? scheduleOf(h) : { type: 'daily' }, FORM_OF_SCHED = { daily: 'daily', weekdays: 'days', perWeek: 'perWeek', everyNWeeks: 'everyNWeeks', monthly: 'monthly' };
  Object.assign(form, { sched: FORM_OF_SCHED[sc.type], days: sc.days ? [...sc.days] : [0, 1, 2, 3, 4], times: sc.times || 3, every: sc.every || 2, anchor: sc.anchor || todayKey(), dom: sc.dom || new Date().getDate() });
  $('newCatName').value = '';
  $('name').value = h?.name || '';
  $('name').removeAttribute('aria-invalid');
  $('target').value = h && h.target > 1 ? h.target : 8;
  $('step').value = h?.step || 5;
  delete $('stepViz').dataset.k; delete $('stepViz').dataset.n;
  $('unit').value = h?.unit || '';
  $('why').value = h?.why || '';
  form.rem = remFromHabit(h);
  renderTimes();
  $('formPrev').style.removeProperty('--c');
  drawIconPickers();
  syncForm();
  openOverlay($('formOv'));
  formBase = formSnap();
  setTimeout(() => $('name').focus({ preventScroll: true }), 60);
}
let formBase = '';
export const formSnap = () => JSON.stringify([form.icon, form.color, form.goal, form.sched, form.days, form.times, form.every, form.anchor, form.dom, form.time, form.cat,
  form.newCat && $('newCatName').value.trim(), { ...form.rem, touched: undefined }, form.priv, ...['name', 'target', 'step', 'unit', 'why'].map(id => $(id).value)]);
$('formOv')._guard = () => formSnap() === formBase || askConfirm('Закрыть без сохранения?',
  editingId ? 'Изменения в привычке не сохранятся.' : 'Новая привычка не будет добавлена.', 'Закрыть');

const shownHabits = () => [...visibleHabits(state), ...privateHabits(state)];
export function openCats() {
  renderCats();
  openOverlay($('catOv'));
}
export function renderCatsInfo() {
  const cats = state.categories, n = cats.length;
  $('setCatsInfo').textContent = n
    ? `${n} ${plural(n, 'категория', 'категории', 'категорий')}: ${cats.map(c => c.name).join(', ')}`
    : 'Пока нет — создайте свои группы';
}
export function catsChanged() {
  save(); render(); renderCats(); renderCatsInfo();
  if ($('formOv')._shown) syncForm();
  if (hist) renderHistory();
}
export function renderCats() {
  const list = $('catList');
  if (!state.categories.length) {
    list.innerHTML = '<div class="cat-empty">Пока нет ни одной категории. Добавьте первую ниже.</div>';
    return;
  }
  const IC_UP = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
  const IC_DOWN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  const IC_DEL = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  list.innerHTML = state.categories.map((c, i) => {
    const n = shownHabits().filter(h => h.cat === c.id).length;
    return `<div class="cat-row" data-id="${esc(c.id)}">
      <input type="text" class="cat-name" maxlength="40" value="${esc(c.name)}" aria-label="Название категории">
      <span class="cat-cnt" title="Привычек этой категории">${n}</span>
      <button class="ghost icon-btn" data-act="up" title="Выше" ${i ? '' : 'disabled'}>${IC_UP}</button>
      <button class="ghost icon-btn" data-act="down" title="Ниже" ${i < state.categories.length - 1 ? '' : 'disabled'}>${IC_DOWN}</button>
      <button class="ghost icon-btn danger" data-act="del" title="Удалить категорию">${IC_DEL}</button>
    </div>`;
  }).join('');
}
$('catList').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const id = b.closest('.cat-row').dataset.id, i = state.categories.findIndex(c => c.id === id);
  if (i < 0) return;
  const cats = state.categories;
  if (b.dataset.act === 'up' && i > 0) [cats[i - 1], cats[i]] = [cats[i], cats[i - 1]];
  else if (b.dataset.act === 'down' && i < cats.length - 1) [cats[i + 1], cats[i]] = [cats[i], cats[i + 1]];
  else if (b.dataset.act === 'del') {
    const n = shownHabits().filter(h => h.cat === id).length;
    if ((n || redUi()) && !await askConfirm('Удалить категорию?', `«${cats[i].name}» будет удалена.` + (n ? ` ${n} ${plural(n, 'привычка останется', 'привычки останутся', 'привычек останутся')} без категории — сами привычки и их история не пострадают.` : ''), 'Удалить')) return;
    state.categories = state.categories.filter(c => c.id !== id);
    state.habits.forEach(h => { if (h.cat === id) h.cat = null; });
  }
  catsChanged();
});
$('catList').addEventListener('change', e => {
  const inp = e.target.closest('.cat-name');
  if (!inp) return;
  const c = state.categories.find(x => x.id === inp.closest('.cat-row').dataset.id);
  const name = inp.value.trim().slice(0, 40);
  if (!c || !name) { inp.value = c?.name || ''; return; }
  c.name = name;
  catsChanged();
});
$('catList').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.cat-name')) e.target.blur(); });
$('catNewAdd').onclick = () => {
  if (!addCategory($('catNewName').value)) return $('catNewName').focus();
  $('catNewName').value = '';
  catsChanged();
  $('catNewName').focus();
};
$('catNewName').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('catNewAdd').click(); } };

$('addBtn').onclick = () => openForm();
$('fab').onclick = () => openForm();
$('emptyAdd').onclick = () => openForm();

$('form').onsubmit = async e => {
  e.preventDefault();
  const name = $('name').value.trim();
  if (!name) {
    const box = $('name').parentElement;
    $('name').setAttribute('aria-invalid', 'true');
    $('name').focus();
    box.classList.remove('shake'); box.offsetWidth; box.classList.add('shake');
    return toast('Введите название привычки', null, '');
  }
  if ((form.sched === 'days' || form.sched === 'everyNWeeks') && !form.days.length) return toast('Выберите хотя бы один день недели');
  if (form.rem.on && remIsSpread() && toMin(form.rem.to) <= toMin(form.rem.from)) {
    $('rem').scrollIntoView({ block: 'center', behavior: 'smooth' });
    return toast('Напоминания: конец промежутка должен быть позже начала', null, '');
  }
  const target = formTarget(), step = form.goal === 'step' ? formStep() : 0;
  const data = {
    name, target, icon: form.icon, color: form.color, time: form.time,
    unit: form.goal !== 'once' ? $('unit').value.trim() : '',
    days: form.sched === 'days' && form.days.length < 7 ? [...form.days] : null,
    why: $('why').value.trim(),
    cat: form.cat && catName(form.cat) ? form.cat : null,
    remind: remToData(),
  };
  if (step) data.step = step;
  const h = editingId && findHabit(editingId);
  const priv = unlocked ? form.priv : isPrivate(h), moved = !!h && unlocked && priv !== isPrivate(h);
  if (priv) data.private = true;
  const sc = formSchedule(h?.created), oldSc = h ? scheduleOf(h) : { type: 'daily' }, schedMoved = !sameSchedule(sc, oldSc);
  data.days = sc.type === 'weekdays' ? [...sc.days] : null;
  data.schedule = !['daily', 'weekdays'].includes(sc.type) || (h && (schedMoved || h.schedule)) ? sc : undefined;
  let scope = 'today';
  const old = h && goalOn(h, new Date()).target, goalMoved = h && old > 1 && old !== target;
  if (h && (goalMoved || schedMoved) && h.created < todayKey()) {
    const what = [goalMoved && `цель: было ${old}, станет ${target}`, schedMoved && `расписание: было «${schedText(h)}», станет «${schedText({ schedule: sc })}»`].filter(Boolean).join('; ');
    scope = await askConfirm('С какого дня действуют изменения?', `Меняется ${what}.`, 'Сохранить', {
      items: [{ v: 'today', label: 'С сегодняшнего дня' }, { v: 'all', label: 'И для прошлых дней' }],
      hint: '«И для прошлых дней» — если ошиблись при вводе. «С сегодняшнего дня» — прошлые дни останутся как были.',
    });
    if (!scope || !findHabit(h.id)) return;
  }
  if (h) {
    noteGoalChange(h, data, scope);
    Object.assign(h, data, { updated: todayKey() });
    if (!step) delete h.step;
    if (!priv) delete h.private;
  } else {
    state.habits.push({ id: crypto.randomUUID?.() || String(Date.now()), created: todayKey(), ...data });
  }
  save(); render();
  closeOverlay($('formOv'));
  if (hist) renderHistory();
  if (moved) toast(priv ? 'Перенесено в личное' : 'Перенесено в обычные', null, '');
};

$('name').addEventListener('input', () => $('name').removeAttribute('aria-invalid'));
