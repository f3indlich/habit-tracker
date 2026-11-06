import { $, todayKey } from './core.js?v=2.4a';
import { closeOverlay, shownOverlays, syncTabs } from './ui.js?v=2.4a';
import { openForm } from './form.js?v=2.4a';
import { openGoalForm } from './goalsui.js?v=2.4a';
import { openTaskForm, tv } from './tasksui.js?v=2.4a';

export function goToday() {
  const pages = shownOverlays().filter(o => o.classList.contains('tab-page'));
  if (pages.length) return pages.forEach(closeOverlay);
  if (!$('todayBtn').hidden) $('todayBtn').click();
  scrollTo({ top: 0, behavior: 'smooth' });
}
export function addForTab(tab = document.body.dataset.tab) {
  if (tab === 'goals') return openGoalForm();
  if (tab !== 'tasks') return openForm();
  const today = todayKey();
  openTaskForm(null, tv.tab === 'month' && tv.day > today ? tv.day : today);
}
$('todayTab').onclick = () => goToday();
$('fab').onclick = () => addForTab();
syncTabs();
