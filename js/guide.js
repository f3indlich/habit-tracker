import { $, addDays, getPref, HERO_C, key, NS, setPref, TEST_MODE, todayKey } from './core.js?v=1.06a';
import { normalize, save, setState, state } from './storage.js?v=1.06a';
import { closeOverlay, openOverlay, toast, trackTouch } from './ui.js?v=1.06a';
import { buildCard, render, updateCard } from './render.js?v=1.06a';
import { openForm } from './form.js?v=1.06a';
import { NAME_ASKED } from './settings.js?v=1.06a';
import { cloud } from './sync.js?v=1.06a';
import { queueTips, resetTips } from './tips.js?v=1.06a';
import { visibleHabits } from './privacy.js?v=1.06a';

export const ONBOARD_STORE = NS + '-onboarded';
export const OB_SLIDES = 3;
export let obStep = 0;

const IC_PLUS = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const DEMO = [
  { id: 'demo-z', name: 'Зарядка', icon: 'strong', color: '#22c55e', time: 'morning' },
  { id: 'demo-c', name: 'Чтение', icon: 'books', color: '#f97316', time: 'evening' },
  { id: 'demo-v', name: 'Вода', icon: 'water', color: '#3b82f6', target: 8, unit: 'стаканов' },
];

export function demoCards(today) {
  const ago = n => key(addDays(new Date(), -n));
  const log = {};
  for (let i = 1; i < 14; i++) log[ago(i)] = { ...(i % 3 && { 'demo-z': 1 }), ...(i % 2 && { 'demo-c': 1 }), ...(i % 4 && { 'demo-v': 8 }) };
  log[todayKey()] = today;
  const real = state, demo = normalize({ habits: DEMO.map(h => ({ ...h, created: ago(30) })), log }), out = {};
  setState(demo);
  try {
    for (const h of demo.habits) {
      const el = buildCard(h.id);
      el.classList.remove('enter');
      el.style.animationDelay = '';
      el.querySelectorAll('[tabindex]').forEach(n => n.removeAttribute('tabindex'));
      updateCard(el, h);
      out[h.id.slice(5)] = el;
    }
  } finally { setState(real); }
  return out;
}

function heroArt() {
  const div = document.createElement('div');
  div.className = 'card hero';
  div.innerHTML = `<div class="hero-text"><div class="hero-n"><b>2</b>из 3 выполнено</div><div class="hero-msg">Осталось 1 — Вы справитесь</div>
    <div class="chips"><span class="chip">⭐ Идеально 3 дня подряд</span></div></div>
    <div class="hero-ring"><svg viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="36"/><circle class="prog" cx="42" cy="42" r="36" style="stroke-dasharray:${HERO_C};stroke-dashoffset:${HERO_C / 3}"/></svg><span>67%</span></div>`;
  return div;
}
const caption = t => Object.assign(document.createElement('p'), { className: 'set-hint', textContent: t });

function buildArt() {
  const a = demoCards({ 'demo-z': 1, 'demo-v': 8 });
  $('obArt0').replaceChildren(heroArt(), a.z, a.v);
  const b = demoCards({ 'demo-z': 1, 'demo-v': 3 });
  b.c.classList.add('swiping', 'sw-done');
  b.c.style.setProperty('--sw', '.55');
  b.c.style.transform = 'translateX(34px)';
  const wrap = Object.assign(document.createElement('div'), { className: 'ob-swiped' });
  wrap.append(b.c);
  $('obArt1').replaceChildren(
    b.z, caption('Нажмите на кружок — выполнено. Ещё раз — отменить.'),
    b.v, caption('Нажатие — плюс один, удержание — сразу вся цель. Кнопка − убирает лишнее.'),
    wrap, caption('Или смахните карточку вправо. Влево — сбросить отметку.'));
}

export function goSlide(i) {
  obStep = Math.max(0, Math.min(OB_SLIDES - 1, i));
  const last = obStep === OB_SLIDES - 1;
  $('obTrack').style.transform = `translateX(${-100 * obStep}%)`;
  [...$('obDots').children].forEach((d, j) => d.classList.toggle('on', j === obStep));
  [...$('obTrack').children].forEach((s, j) => { s.inert = j !== obStep; });
  $('obBack').style.visibility = obStep ? '' : 'hidden';
  $('obSkip').style.visibility = last ? 'hidden' : '';
  $('obNext').innerHTML = last ? IC_PLUS + (visibleHabits(state).some(h => !h.archived) ? 'Новая привычка' : 'Создать первую привычку') : 'Далее';
  $('obTpl').hidden = !last;
}

export function openOnboarding() {
  buildArt();
  $('obName').value = state.profile?.name || '';
  goSlide(0);
  openOverlay($('obOv'));
}

function obDone(quiet) {
  const name = $('obName').value.trim().slice(0, 40);
  setPref(ONBOARD_STORE, '1');
  setPref(NAME_ASKED, '1');
  if (name && name !== (state.profile?.name || '')) {
    state.profile = { name };
    save(); render();
    if (!quiet) toast(`Приятно познакомиться, ${name}!`);
  }
}
$('obOv')._guard = () => { obDone(); queueTips(800); return true; };

export function finishOnboarding(next) {
  obDone(!!next);
  closeOverlay($('obOv'));
  if (!next) return queueTips(800);
  setTimeout(() => openForm(), 350);
}

$('obNext').onclick = () => obStep < OB_SLIDES - 1 ? goSlide(obStep + 1) : finishOnboarding('form');
$('obTpl').onclick = () => finishOnboarding('tpl');
$('obBack').onclick = () => goSlide(obStep - 1);
trackTouch($('obView'), {
  start: g => g.x0 > 24,
  move: g => {
    if (g.lock) return;
    if (Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) g.lock = 'x';
    else if (Math.abs(g.dy) > 12) return false;
  },
  end: (g, dt, cancel) => { if (!cancel && Math.abs(g.dx) >= 50) goSlide(obStep + (g.dx < 0 ? 1 : -1)); },
});

export function maybeOnboard() {
  if (getPref(ONBOARD_STORE, '')) return false;
  if (state.habits.length || cloud.session) { setPref(ONBOARD_STORE, '1'); return false; }
  if (TEST_MODE || /access_token|refresh_token|error/.test(location.hash) || new URLSearchParams(location.search).has('action')) return false;
  openOnboarding();
  return true;
}

const P = {
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  steps: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  note: '<path d="M5.5 3.5h9l4 4v13h-13z"/><path d="M14.5 3.5v4h4M8.5 12h7M8.5 15.5h5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a5 5 0 0 1-.5 10z"/>',
  hand: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 10.5V4a1.5 1.5 0 0 1 3 0v7M15 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.5 15.5a1.6 1.6 0 0 1 2.4-2.1L9 16V11"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/>',
  play: '<path d="M7 4v16l13-8z"/>',
};
const g = d => `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true">${d}</svg>`;
const GESTURES = [
  [g('<circle cx="20" cy="20" r="11" stroke="var(--good)" stroke-width="3"/><path d="M15 20.5l3.5 3.5 7-7.5" stroke="var(--good)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'), 'Нажатие на кружок', 'отметить или снять отметку; если цель несколько раз — плюс один'],
  [g('<circle cx="20" cy="20" r="11" stroke="var(--border)" stroke-width="3"/><path d="M20 9a11 11 0 1 1-10.4 7.4" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="20" r="3" fill="var(--accent)"/>'), 'Удержание кружка', 'засчитать всю цель сразу'],
  [g('<rect x="13" y="13" width="22" height="14" rx="4" fill="var(--faint)"/><path d="M3 20h7M7 17l3 3-3 3" stroke="var(--good)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'), 'Смахнуть карточку', 'вправо — выполнено, влево — сбросить'],
  [g('<rect x="7" y="8" width="23" height="9" rx="3" fill="var(--faint)"/><rect x="7" y="23" width="23" height="9" rx="3" fill="var(--accent)"/><path d="M35 14v12M32 17l3-3 3 3M32 23l3 3 3-3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'), 'Удержать карточку и тянуть', 'поменять порядок привычек'],
  [g('<path d="M9 29V19M16 29V10M23 29v-7M30 29V14" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M6 35h28M12 35l-3-2.5M12 35l-3 2.5" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>'), 'Смахнуть график', 'листать недели, месяцы и годы'],
  [g('<rect x="8" y="16" width="24" height="20" rx="5" fill="var(--faint)"/><path d="M20 4v8M17 9l3 3 3-3" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'), 'Потянуть окно вниз', 'закрыть карточку, сводку или форму'],
  [g('<rect x="11" y="6" width="22" height="28" rx="4" fill="var(--faint)"/><path d="M5 8v24" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/><path d="M8 20h10M15 17l3 3-3 3" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'), 'Смахнуть от левого края', 'назад из настроек и других страниц'],
];
const gestHTML = GESTURES.map(([svg, b, t]) => `<div class="gest"><span>${svg}</span><p><b>${b}</b> — ${t}.</p></div>`).join('')
  + '<div class="gest"><span><kbd>T</kbd></span><p><b>Клавиша T</b> на компьютере — вернуться к сегодняшнему дню.</p></div>'
  + '<div class="gest"><span><kbd>Esc</kbd></span><p><b>Клавиша Esc</b> — закрыть окно или меню.</p></div>';

export const HELP = [
  { group: 'Основы', items: [
    { id: 'marks', icon: P.check, title: 'Отметки', sub: 'Нажатие, отмена, прошлые дни', body: [
      'Нажмите на кружок справа от привычки, когда выполните её. Ещё одно нажатие снимет отметку.',
      'Чтобы отметить или снять отметку за прошлый день, выберите его в полоске недели над списком — стрелки ‹ › листают недели. Кнопка «Сегодня» рядом с заголовком вернёт к текущему дню.',
      'Последние семь дней можно отметить прямо с главного экрана: нажмите на кружок с датой под названием привычки. Ещё одно нажатие снимет отметку.',
      'Можно и жестом: смахните карточку вправо — выполнено, влево — сбросить.'] },
    { id: 'steps', icon: P.steps, title: 'Несколько раз в день', sub: 'Стаканы, страницы, километры', body: [
      'Если цель — несколько раз в день, каждое нажатие на кружок добавляет один раз или одну порцию. Кольцо вокруг кружка показывает, сколько уже сделано.',
      '<b>Удерживайте кружок</b>, чтобы сразу засчитать всю цель. Кнопка − убирает последнее нажатие.',
      'После выполнения цели можно продолжать: всё сверх плана тоже сохранится.'] },
    { id: 'sched', icon: P.cal, title: 'Расписание и пропуски', sub: 'Когда нужна привычка и как пропустить день', body: [
      'В форме привычки выберите, когда она нужна: каждый день, в определённые дни недели, несколько раз в неделю, раз в несколько недель или раз в месяц. В остальные дни привычка не нужна и не прерывает серию.',
      'Если день выпал по уважительной причине, выберите «Пропустить» в меню ⋮ у привычки — серия сохранится.'] },
    { id: 'notes', icon: P.note, title: 'Заметки к дням', sub: 'Пара слов о том, как прошло', body: [
      'Откройте привычку и нажмите на нужный день в её истории. В окне дня видно, сколько сделано, и можно написать заметку.',
      'Заметку к сегодняшнему дню можно добавить и из меню ⋮ у привычки. Дни с заметкой помечены точкой.'] },
  ] },
  { group: 'Статистика и настройка', items: [
    { id: 'stats', icon: P.chart, title: 'Серии и сводка', sub: 'Как считаются проценты и серии', body: [
      '<b>Серия</b> — сколько дней подряд привычка выполнена полностью. Сегодняшний день не прерывает серию, пока он не закончился.',
      'Нажмите на кольцо прогресса вверху главного экрана, чтобы открыть сводку за неделю, месяц или год. Значок ⓘ рядом с показателем объясняет, как он считается.'] },
    { id: 'remind', icon: P.bell, title: 'Напоминания', sub: 'Время, повтор, вечернее напоминание', body: [
      'Напоминания настраиваются в форме привычки: в своё время, с повтором, если привычка ещё не отмечена, или равномерно в течение дня, если цель — несколько раз.',
      'Чтобы уведомления приходили, включите их в настройках, в разделе «Напоминания». На iPhone приложение нужно сначала установить на экран «Домой».', 'Там же можно включить вечернее напоминание: одно уведомление, если на сегодня что-то осталось.'] },
    { id: 'sync', icon: P.cloud, title: 'Синхронизация и данные', sub: 'Вход по почте, копия в файл', body: [
      'Привычки хранятся на этом устройстве и работают без интернета. Войдите по почте в настройках, без пароля, — и они появятся на всех Ваших устройствах.',
      'Копию всех данных можно сохранить в файл: «Сохранить копию» в настройках.'] },
  ] },
  { group: 'Управление', items: [
    { id: 'gestures', icon: P.hand, title: 'Жесты и клавиши', sub: 'Смахивание, удержание, клавиши', html: gestHTML },
    { id: 'reset', icon: P.reset, title: 'Показать подсказки заново', act: true },
    { id: 'replay', icon: P.play, title: 'Пройти приветствие ещё раз', act: true },
  ] },
];

const ic = d => `<svg class="ic" viewBox="0 0 24 24">${d}</svg>`;
const CHEV = '<svg class="ic set-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
export const helpNorm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/<[^>]+>/g, ' ');
const bodyHTML = it => it.html || it.body.map(p => `<p>${p}</p>`).join('');
let helpOpen = new Set();

export function renderHelp() {
  const q = helpNorm($('helpQ').value.trim());
  let any = false;
  $('helpList').innerHTML = HELP.map(gr => {
    const items = gr.items.filter(it => !q || helpNorm(`${it.title} ${it.sub || ''} ${it.act ? '' : bodyHTML(it)}`).includes(q));
    if (!items.length) return '';
    any = true;
    return `<section class="set-group"><h3>${gr.group}</h3><div class="set-card">${items.map(it => {
      if (it.act) return `<div class="help-item"><button type="button" class="set-row help-act" data-act="${it.id}"><span class="set-ic">${ic(it.icon)}</span><span class="set-txt"><b>${it.title}</b></span></button></div>`;
      const open = helpOpen.has(it.id) || (!!q && !helpNorm(`${it.title} ${it.sub}`).includes(q));
      return `<div class="help-item${open ? ' open' : ''}" data-id="${it.id}"><button type="button" class="set-row" aria-expanded="${open}" aria-controls="hb-${it.id}"><span class="set-ic">${ic(it.icon)}</span><span class="set-txt"><b>${it.title}</b><small>${it.sub}</small></span>${CHEV}</button><div class="help-body" id="hb-${it.id}"${open ? '' : ' hidden'}>${bodyHTML(it)}</div></div>`;
    }).join('')}</div></section>`;
  }).join('');
  $('helpEmpty').hidden = any;
}

export function openHelp() {
  helpOpen = new Set();
  $('helpQ').value = '';
  renderHelp();
  openOverlay($('helpOv'));
}

$('helpList').addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'reset') { resetTips(); toast('Подсказки появятся снова, когда Вы дойдёте до нужного места'); }
    else openOnboarding();
    return;
  }
  const item = e.target.closest('.help-item[data-id]');
  if (!item || !e.target.closest('.set-row')) return;
  const id = item.dataset.id, open = !item.classList.contains('open');
  open ? helpOpen.add(id) : helpOpen.delete(id);
  item.classList.toggle('open', open);
  item.querySelector('.set-row').setAttribute('aria-expanded', open);
  item.querySelector('.help-body').hidden = !open;
});
$('helpQ').addEventListener('input', renderHelp);
$('helpBtn').onclick = openHelp;
