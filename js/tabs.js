import { $, todayKey } from './core.js?v=3.2b';
import { closeOverlay, shownOverlays, syncTabs } from './ui.js?v=3.2b';
import { openForm } from './form.js?v=3.2b';
import { openGoalForm } from './goalsui.js?v=3.2b';
import { openTaskForm, tv } from './tasksui.js?v=3.2b';

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
$('fab').onclick = () => addForTab();
syncTabs();
