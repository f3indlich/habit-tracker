import { $, reducedMotion, todayKey } from './core.js?v=3.2d';
import { closeMenu, closeOverlay, shownOverlays, syncTabs } from './ui.js?v=3.2d';
import { openForm } from './form.js?v=3.2d';
import { openGoalForm } from './goalsui.js?v=3.2d';
import { openTaskForm, tv } from './tasksui.js?v=3.2d';

export function goToday() {
  const pages = shownOverlays().filter(o => o.classList.contains('tab-page'));
  if (pages.length) return pages.forEach(closeOverlay);
  if (!$('todayBtn').hidden) $('todayBtn').click();
  scrollTo({ top: 0, behavior: 'smooth' });
}
export function addForTab(tab = document.body.dataset.tab) {
  if (tab === 'goals') return openGoalForm();
  if (tab === 'settings') goToday();
  if (tab !== 'tasks') return openForm();
  if (tv.shared && !$('tShared').hidden) return $('shText').focus();
  const today = todayKey();
  openTaskForm(null, tv.tab === 'month' && tv.day > today ? tv.day : today);
}
$('todayTab').onclick = () => goToday();
$('fab').onclick = () => {
  if (dialOpen()) return closeAddMenu();
  const tab = document.body.dataset.tab;
  if (tab === 'tasks' || tab === 'goals') return addForTab(tab);
  openAddMenu();
};
const IC_ADD = {
  habit: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/></svg>',
  task: '<svg class="ic" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17"/></svg>',
  goal: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 21V4h11l-2 4 2 4H6"/></svg>',
};
const ADD_ITEMS = [
  ['goal', 'Цель', () => openGoalForm()],
  ['task', 'Задача', () => openTaskForm(null, todayKey())],
  ['habit', 'Привычка', () => { if (document.body.dataset.tab === 'settings') goToday(); openForm(); }],
];
const dial = document.createElement('div');
dial.className = 'add-dial';
dial.id = 'addDial';
dial.hidden = true;
dial.innerHTML = `<div class="add-scrim"></div><div class="add-items" role="menu" aria-label="Что добавить">${ADD_ITEMS.map(([k, l], i) =>
  `<button type="button" class="add-item" role="menuitem" data-add="${k}" style="--i:${ADD_ITEMS.length - 1 - i}"><span class="lbl">${l}</span><span class="add-ic">${IC_ADD[k]}</span></button>`).join('')}</div>`;
document.body.append(dial);
export const dialOpen = () => !dial.hidden && dial.classList.contains('on');
export function openAddMenu() {
  closeMenu();
  const items = dial.querySelector('.add-items');
  dial.hidden = false;
  items.style.right = '0px';
  items.style.bottom = '0px';
  const r = $('fab').getBoundingClientRect(), box = items.getBoundingClientRect();
  items.style.right = Math.max(8, box.right - r.right) + 'px';
  items.style.bottom = Math.max(8, box.bottom - r.top + 12) + 'px';
  void dial.offsetWidth;
  dial.classList.add('on');
  document.body.classList.add('dial-on');
  $('fab').setAttribute('aria-expanded', 'true');
  dial.querySelector('.add-item:last-child')?.focus({ preventScroll: true });
}
export function closeAddMenu() {
  if (dial.hidden) return;
  dial.classList.remove('on');
  document.body.classList.remove('dial-on');
  $('fab').setAttribute('aria-expanded', 'false');
  const done = () => { if (!dial.classList.contains('on')) dial.hidden = true; };
  if (reducedMotion) return done();
  setTimeout(done, 220);
}
dial.addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  closeAddMenu();
  if (b) ADD_ITEMS.find(x => x[0] === b.dataset.add)[2]();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && dialOpen()) { e.stopPropagation(); closeAddMenu(); } }, true);
addEventListener('resize', () => { if (dialOpen()) closeAddMenu(); });
$('fab').addEventListener('contextmenu', e => e.preventDefault());
syncTabs();
