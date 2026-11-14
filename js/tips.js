import { $, EASE_STD, esc, getPref, isToday, NS, reducedMotion, setPref, TEST_MODE, todayKey, viewportHeight } from './core.js?v=3.4b';
import { confirmResolve, menuEl, shownOverlays } from './ui.js?v=3.4b';
import { reordering, viewDate } from './render.js?v=3.4b';
import { state } from './storage.js?v=3.4b';
import { cloud } from './sync.js?v=3.4b';
import { visibleHabits } from './privacy.js?v=3.4b';

export const TIPS_STORE = NS + '-tips';
export const USED_STORE = NS + '-used';
export const TIPS_ON_STORE = NS + '-tips-on';
export const HEAD_TIPS = [
  ['viewBtn', 'Кнопка вида вверху', ' — как показывать привычки и сколько дней истории видно на карточках.'],
  ['acctBtn', 'Облако вверху', ' — вход по почте и синхронизация между устройствами.'],
  ['tasksBtn', 'Задачи', ' — разовые дела с датами.'],
  ['goalsBtn', 'Цели', ' — цели со сроком и шагами.'],
  ['setBtn', 'Настройки', ' — тема, цвета, напоминания, данные.'],
];
export const TIP_TEXT = {
  head: { title: 'Что где находится', lines: [] },
  mark: { title: 'Отметьте первую привычку', text: 'Нажмите на кружок, когда выполните её. Нажмёте ещё раз — отметка снимется.' },
  steps: { title: 'Если цель — несколько раз', lines: [['Нажатие на кружок', ' — плюс один.'], ['Удержание кружка', ' — сразу вся цель.'], ['Кнопка −', ' — убрать последнее.']] },
  swipe: { bar: 'Смахните карточку вправо — выполнено. Влево — сбросить отметку.' },
  days: { title: 'Забыли отметить вчера?', text: 'Нажмите на день в полоске недели — список покажет привычки на этот день, их можно отметить. Кнопка «Сегодня» рядом с заголовком вернёт назад.' },
  order: { bar: 'Удерживайте карточку и тяните, чтобы поменять порядок привычек.' },
  hist: { title: 'История по дням', lines: [['Нажмите на день', ' — увидите подробности и сможете добавить заметку.'], ['Смахните график', ' влево или вправо, чтобы листать периоды.'], ['Потяните окно вниз', ', чтобы закрыть его.']] },
  sum: { title: 'Как читать сводку', text: 'Нажмите на день — покажется, что в этот день сделано. Смахните в сторону, чтобы перейти к прошлому периоду.' },
  goals: { title: 'Цель со сроком', text: 'Добавьте цель, дату и шаги. Приложение покажет, сколько осталось дней, какой нужен темп и успеваете ли Вы.' },
  sync: { bar: 'Включите синхронизацию, чтобы не потерять привычки при смене телефона.' },
};
export const MOUSE_TIP_TEXT = {
  hist: { title: 'История по дням', lines: [['Нажмите на день', ' — увидите подробности и сможете добавить заметку.'], ['Стрелки у названия периода', ' листают недели, месяцы и годы.']] },
  sum: { title: 'Как читать сводку', text: 'Наведите на день — покажется, что в этот день сделано. Стрелки у названия периода показывают прошлые периоды.' },
};
export const touchScreen = () => !!window.__touch || matchMedia('(pointer: coarse)').matches;
const SESSION_MAX = 3;

let seen = {};
try { seen = JSON.parse(localStorage.getItem(TIPS_STORE)) || {}; } catch {}
const saveSeen = () => { try { localStorage.setItem(TIPS_STORE, JSON.stringify(seen)); } catch {} };
export const tipSeen = id => !!seen[id];
export function markTip(id) { seen[id] = 1; saveSeen(); }
export function resetTips() {
  seen = {}; shownThisRun = 0; saveSeen();
  closeTip(false);
  setTipsOn(true);
}
export const tipsWanted = () => getPref(TIPS_ON_STORE, '1') !== '0';
export function renderTipsSwitch() { $('tipsSwitch').setAttribute('aria-checked', tipsWanted()); }
export function setTipsOn(on) {
  setPref(TIPS_ON_STORE, on ? '1' : '0');
  if (!on) { clearTimeout(timer); closeTip(false); }
  renderTipsSwitch();
}

let usedDays = [];
try { usedDays = JSON.parse(localStorage.getItem(USED_STORE)) || []; } catch {}
if (!usedDays.includes(todayKey())) {
  usedDays = [...usedDays, todayKey()].slice(-7);
  try { localStorage.setItem(USED_STORE, JSON.stringify(usedDays)); } catch {}
}

export const tipsOn = () => (!TEST_MODE || !!window.__tipsOn) && tipsWanted();
export let tip = null;
let shownThisRun = 0, lastClose = 0, timer = 0, layer = null;

function buildLayer() {
  layer = document.createElement('div');
  layer.className = 'tip-layer';
  layer.id = 'tipLayer';
  layer.hidden = true;
  layer.innerHTML = `<div class="tip-spot"></div>
    <div class="tip-box" role="dialog" aria-modal="false" aria-labelledby="tipTitle" aria-describedby="tipBody">
      <i class="tip-arrow"></i>
      <b class="tip-title" id="tipTitle"></b>
      <div class="tip-body" id="tipBody"></div>
      <button type="button" class="tip-ok" id="tipOk">Понятно</button>
    </div>`;
  document.body.append(layer);
  $('tipOk').onclick = () => closeTip(true);
}

const unionRect = els => {
  const rs = els.filter(e => e?.isConnected && e.offsetParent !== null).map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
  if (!rs.length) return null;
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top));
  return { left: l, top: t, right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
};

function canShow(id, els) {
  if (!tipsOn() || tip || seen[id] || shownThisRun >= SESSION_MAX || Date.now() - lastClose < 1500) return false;
  if (menuEl || reordering || confirmResolve || document.visibilityState === 'hidden') return false;
  if (!els.length || !els.every(e => e?.isConnected)) return false;
  const top = shownOverlays().pop();
  return !top || els.every(e => top.contains(e) || e.closest('#tabbar') && top.classList.contains('tab-page'));
}

export async function showTip(id, target, opts = {}) {
  const els = (Array.isArray(target) ? target : [target]).filter(Boolean);
  if (!canShow(id, els)) return false;
  tip = { id, els, opts };
  let r = unionRect(els);
  if (!r) { tip = null; return false; }
  const vh = viewportHeight();
  if (r.top < 70 || r.bottom > vh - 150) {
    els[0].scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    await new Promise(res => setTimeout(res, reducedMotion ? 30 : 450));
    if (tip?.id !== id) return false;
    r = unionRect(els);
    if (!r) { tip = null; return false; }
  }
  if (!layer) buildLayer();
  const t = (!touchScreen() && MOUSE_TIP_TEXT[id]) || TIP_TEXT[id], bar = !!t.bar;
  layer.classList.toggle('bar', bar);
  $('tipTitle').hidden = bar;
  $('tipTitle').textContent = t.title || '';
  $('tipBody').innerHTML = bar ? esc(t.bar) : t.lines
    ? t.lines.map(([b, rest]) => `<p><b>${esc(b)}</b>${esc(rest)}</p>`).join('')
    : `<p>${esc(t.text)}</p>`;
  layer.hidden = false;
  document.body.classList.add('tip-on');
  place(r, bar);
  layer.classList.remove('show');
  requestAnimationFrame(() => layer.classList.add('show'));
  if (opts.nudge && !reducedMotion) nudge(els[0]);
  shownThisRun++;
  addEventListener('pointerdown', outside, true);
  addEventListener('keydown', onKey, true);
  setTimeout(() => {
    if (tip?.id !== id) return;
    addEventListener('scroll', onMove, true);
    addEventListener('resize', onMove);
  }, 400);
  return true;
}

function place(r, bar) {
  const pad = bar ? 0 : 8, spot = layer.querySelector('.tip-spot'), box = layer.querySelector('.tip-box'), arrow = layer.querySelector('.tip-arrow');
  const s = { left: r.left - pad, top: r.top - pad, w: r.right - r.left + pad * 2, h: r.bottom - r.top + pad * 2 };
  Object.assign(spot.style, { left: s.left + 'px', top: s.top + 'px', width: s.w + 'px', height: s.h + 'px', borderRadius: Math.min(s.h / 2, 24) + 'px' });
  const vw = document.documentElement.clientWidth, w = Math.min(vw - 32, 400);
  const cx = (r.left + r.right) / 2, left = Math.max(16, Math.min(vw - 16 - w, cx - w / 2));
  box.style.width = w + 'px';
  box.style.left = left + 'px';
  const bh = box.offsetHeight, below = viewportHeight() - (s.top + s.h) > bh + 30 || s.top < bh + 30;
  box.style.top = below ? s.top + s.h + 14 + 'px' : '';
  box.style.bottom = below ? '' : innerHeight + (parseFloat(document.documentElement.style.getPropertyValue('--vgap')) || 0) - s.top + 14 + 'px';
  box.classList.toggle('above', !below);
  arrow.style.left = Math.max(16, Math.min(w - 30, cx - left - 7)) + 'px';
}

function nudge(el) {
  el.animate([{ transform: 'none' }, { transform: 'translateX(34px)', offset: .35 }, { transform: 'translateX(34px)', offset: .6 }, { transform: 'none' }],
    { duration: 1100, easing: EASE_STD });
}

const outside = e => { if (!e.target.closest('.tip-box')) closeTip(true); };
const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); closeTip(true); } };
const onMove = () => closeTip(true);

export function closeTip(remember = true) {
  if (!tip) return;
  if (remember) markTip(tip.id);
  tip = null;
  lastClose = Date.now();
  removeEventListener('pointerdown', outside, true);
  removeEventListener('keydown', onKey, true);
  removeEventListener('scroll', onMove, true);
  removeEventListener('resize', onMove);
  layer.classList.remove('show');
  document.body.classList.remove('tip-on');
  setTimeout(() => { if (!tip) layer.hidden = true; }, reducedMotion ? 0 : 200);
}

export function queueTips(delay = 900) {
  if (!tipsOn()) return;
  clearTimeout(timer);
  timer = setTimeout(runTips, delay);
}

export function runTips() {
  if (tip || $('obOv')?._shown) return false;
  const top = shownOverlays().pop();
  if (top === $('histOv')) return showTip('hist', $('hChart'));
  if (top === $('sumOv')) return showTip('sum', $('sDays'));
  if (top === $('goalsOv')) return $('gListView').hidden ? false : showTip('goals', $('goalsBtn'));
  if (top || !isToday(viewDate)) return false;
  const vis = [...document.querySelectorAll('#sections .habit')].filter(e => e.offsetParent !== null);
  if (!vis.length) return false;
  const cardOf = h => vis.find(e => e.dataset.id === h.id);
  if (!seen.head && !seen.mark) {
    const head = HEAD_TIPS.filter(([id]) => $(id) && !$(id).hidden && $(id).offsetParent !== null);
    TIP_TEXT.head.lines = head.map(([, b, rest]) => [b, rest]);
    if (head.length) return showTip('head', head.map(([id]) => $(id)).filter(e => e.closest('#tabbar')));
  }
  if (!seen.mark) return showTip('mark', vis[0].querySelector('.check'));
  const multi = visibleHabits(state).find(h => !h.archived && h.target > 1 && cardOf(h));
  if (!seen.steps && multi) { const el = cardOf(multi); return showTip('steps', [el.querySelector('.step-minus:not(.idle)'), el.querySelector('.check')]); }
  const marked = Object.keys(state.log[todayKey()] || {}).length > 0;
  const touch = touchScreen();
  if (touch && !seen.swipe && marked) return showTip('swipe', vis.find(e => !e.classList.contains('complete')) || vis[0], { nudge: true });
  if (!seen.days && (seen.swipe || !touch && marked) && visibleHabits(state).some(h => !h.archived && h.created < todayKey())) return showTip('days', $('days'));
  if (!seen.order && seen.days && vis.length >= 3) return showTip('order', vis[1]);
  if (!seen.sync && seen.mark && usedDays.length >= 5 && (cloud.enabled || cloud.sb) && !cloud.session && !$('acctBtn').hidden) return showTip('sync', $('acctBtn'));
  return false;
}

$('tipsSwitch').onclick = () => setTipsOn(!tipsWanted());
renderTipsSwitch();

export function hintPull(sheet) {
  if (!tipsOn() || seen.pull || !sheet.classList.contains('pull') || reducedMotion || !matchMedia('(pointer: coarse)').matches) return;
  markTip('pull');
  setTimeout(() => sheet.classList.add('pull-hint'), 450);
  setTimeout(() => sheet.classList.remove('pull-hint'), 2200);
}
