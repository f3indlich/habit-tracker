import { ensureEmojiFont, framedByOther, getPref, GROUP_STORE, ICON_STORE, setPref, TEST_MODE, THEME_STORE, VIEW_STORE } from './js/core.js?v=2.4a';
import { ICON_STYLES } from './js/icons.js?v=2.4a';
import { load, setState, state } from './js/storage.js?v=2.4a';
import { shownOverlays, toast } from './js/ui.js?v=2.4a';
import { applyView, GROUPS, render, setGroupMode } from './js/render.js?v=2.4a';
import { openForm } from './js/form.js?v=2.4a';
import { applyColors, applyTheme, keepOldDataColor, NAME_ASKED, openName, updateInstallBtn, userName } from './js/settings.js?v=2.4a';
import { cloud, initCloud } from './js/sync.js?v=2.4a';
import { markDoneFromPush } from './js/push.js?v=2.4a';
import * as core from './js/core.js?v=2.4a';
import * as icons from './js/icons.js?v=2.4a';
import * as storage from './js/storage.js?v=2.4a';
import * as ui from './js/ui.js?v=2.4a';
import * as renderMod from './js/render.js?v=2.4a';
import * as formMod from './js/form.js?v=2.4a';
import * as historyMod from './js/history.js?v=2.4a';
import * as settings from './js/settings.js?v=2.4a';
import * as sync from './js/sync.js?v=2.4a';
import * as pushMod from './js/push.js?v=2.4a';
import * as summaryMod from './js/summary.js?v=2.4a';
import * as tipsMod from './js/tips.js?v=2.4a';
import * as guideMod from './js/guide.js?v=2.4a';
import * as privacyMod from './js/privacy.js?v=2.4a';
import * as lockMod from './js/lock.js?v=2.4a';
import * as planMod from './js/plan.js?v=2.4a';
import * as goalsMod from './js/goals.js?v=2.4a';
import * as goalsUi from './js/goalsui.js?v=2.4a';
import * as tasksMod from './js/tasks.js?v=2.4a';
import * as tasksUi from './js/tasksui.js?v=2.4a';
import * as tabsMod from './js/tabs.js?v=2.4a';

if (framedByOther(window)) {
  const app = document.createElement('div');
  app.hidden = true;
  app.inert = true;
  app.append(...document.body.childNodes);
  const msg = document.createElement('p');
  msg.className = 'framed';
  const link = Object.assign(document.createElement('a'), { href: location.href, target: '_top', rel: 'noopener', textContent: 'Откройте приложение по прямой ссылке' });
  msg.append(link);
  document.body.replaceChildren(msg, app);
}

if (TEST_MODE) {
  for (const m of [core, icons, storage, ui, renderMod, formMod, historyMod, settings, sync, pushMod, summaryMod, tipsMod, guideMod, privacyMod, lockMod, planMod, goalsMod, goalsUi, tasksMod, tasksUi, tabsMod]) {
    for (const k of Object.keys(m)) {
      const set = typeof m[k] !== 'function' && m['set' + k[0].toUpperCase() + k.slice(1)];
      try { Object.defineProperty(window, k, { configurable: true, get: () => m[k], set: set || undefined }); } catch {}
    }
  }
}

setState(load());
keepOldDataColor(state.habits.length > 0);

applyTheme(getPref(THEME_STORE, 'auto'));
applyColors();
applyView(getPref(VIEW_STORE, 'list'));
document.body.dataset.icons = ICON_STYLES[getPref(ICON_STORE, 'color')] ? getPref(ICON_STORE, 'color') : 'color';
setGroupMode(GROUPS[getPref(GROUP_STORE, 'time')] ? getPref(GROUP_STORE, 'time') : 'time');
render();
if (!TEST_MODE) requestAnimationFrame(() => ensureEmojiFont());
if (!CSS.supports('color', 'color-mix(in srgb, red 50%, blue)') || !CSS.supports('height', '100dvh')) {
  const bar = document.createElement('div');
  bar.className = 'legacy soft';
  bar.setAttribute('role', 'status');
  bar.textContent = 'Ваш браузер устарел, часть оформления может отображаться неправильно. Обновите его, чтобы пользоваться трекером.';
  bar.onclick = () => bar.remove();
  document.body.append(bar);
}

const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
if (LOCAL && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
} else if (!TEST_MODE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'activated' && hadController) toast('Доступна новая версия приложения', () => location.reload(), 'Обновить');
        });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch {}
  });
}

updateInstallBtn();
{
  const open = { new: () => openForm(), goals: () => goalsUi.openGoals(), summary: () => summaryMod.openSummary() }[new URLSearchParams(location.search).get('action')];
  if (open) { history.replaceState(null, '', location.pathname); setTimeout(open, 300); }
}
navigator.storage?.persist?.().catch(() => {});
{
  const doneId = new URLSearchParams(location.search).get('done');
  if (doneId) { history.replaceState(null, '', location.pathname); setTimeout(() => markDoneFromPush(doneId), 300); }
}

initCloud().finally(() => guideMod.maybeOnboard());

if (!TEST_MODE && !getPref(NAME_ASKED, '') && !/access_token|refresh_token|error/.test(location.hash) && !new URLSearchParams(location.search).has('action')) {
  setTimeout(() => {
    if (getPref(NAME_ASKED, '') || userName() || shownOverlays().length || cloud.status === 'syncing') return;
    setPref(NAME_ASKED, '1');
    openName(true);
  }, 2500);
}
