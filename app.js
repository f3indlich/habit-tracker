import { getPref, GROUP_STORE, ICON_STORE, setPref, TEST_MODE, THEME_STORE, VIEW_STORE } from './js/core.js?v=1.03a';
import { ICON_STYLES } from './js/icons.js?v=1.03a';
import { load, setState } from './js/storage.js?v=1.03a';
import { shownOverlays, toast } from './js/ui.js?v=1.03a';
import { applyView, GROUPS, render, setGroupMode } from './js/render.js?v=1.03a';
import { openForm } from './js/form.js?v=1.03a';
import { applyColors, applyTheme, NAME_ASKED, openName, updateInstallBtn, userName } from './js/settings.js?v=1.03a';
import { cloud, initCloud } from './js/sync.js?v=1.03a';
import { markDoneFromPush } from './js/push.js?v=1.03a';
import * as core from './js/core.js?v=1.03a';
import * as icons from './js/icons.js?v=1.03a';
import * as storage from './js/storage.js?v=1.03a';
import * as ui from './js/ui.js?v=1.03a';
import * as renderMod from './js/render.js?v=1.03a';
import * as formMod from './js/form.js?v=1.03a';
import * as historyMod from './js/history.js?v=1.03a';
import * as settings from './js/settings.js?v=1.03a';
import * as sync from './js/sync.js?v=1.03a';
import * as pushMod from './js/push.js?v=1.03a';
import * as summaryMod from './js/summary.js?v=1.03a';

if (TEST_MODE) {
  for (const m of [core, icons, storage, ui, renderMod, formMod, historyMod, settings, sync, pushMod, summaryMod]) {
    for (const k of Object.keys(m)) {
      const set = typeof m[k] !== 'function' && m['set' + k[0].toUpperCase() + k.slice(1)];
      try { Object.defineProperty(window, k, { configurable: true, get: () => m[k], set: set || undefined }); } catch {}
    }
  }
}

setState(load());

applyTheme(getPref(THEME_STORE, 'auto'));
applyColors();
applyView(getPref(VIEW_STORE, 'list'));
document.body.dataset.icons = ICON_STYLES[getPref(ICON_STORE, 'color')] ? getPref(ICON_STORE, 'color') : 'color';
setGroupMode(GROUPS[getPref(GROUP_STORE, 'time')] ? getPref(GROUP_STORE, 'time') : 'time');
render();

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
if (new URLSearchParams(location.search).get('action') === 'new') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => openForm(), 300);
}
navigator.storage?.persist?.().catch(() => {});
{
  const doneId = new URLSearchParams(location.search).get('done');
  if (doneId) { history.replaceState(null, '', location.pathname); setTimeout(() => markDoneFromPush(doneId), 300); }
}

initCloud();

if (!TEST_MODE && !getPref(NAME_ASKED, '') && !/access_token|refresh_token|error/.test(location.hash) && !new URLSearchParams(location.search).has('action')) {
  setTimeout(() => {
    if (userName() || shownOverlays().length || cloud.status === 'syncing') return;
    setPref(NAME_ASKED, '1');
    openName(true);
  }, 2500);
}
