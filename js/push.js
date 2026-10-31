import { $, getPref, HHMM, isIOS, isStandalone, isToday, key, NOTIFY_STORE, setPref, TEST_MODE } from './core.js?v=2.1a';
import { count, findHabit, goalRemindOf, normGoalRemind, normSmart, save, smartOf, state, targetOn } from './storage.js?v=2.1a';
import { closeOverlay, openOverlay, toast } from './ui.js?v=2.1a';
import { changeCount, render, setViewDate, viewDate } from './render.js?v=2.1a';
import { form } from './form.js?v=2.1a';
import { renderSettings } from './settings.js?v=2.1a';
import { cloud, cloudCfg, renderAccount } from './sync.js?v=2.1a';
import { isPrivate, unlocked, visibleHabits } from './privacy.js?v=2.1a';

export const push = {
  supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  sub: null, busy: false,
};
export const pushTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export function tzName() {
  try { return new Intl.DateTimeFormat('ru-RU', { timeZoneName: 'long' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value; } catch { return pushTz(); }
}
export const b64uBytes = s => Uint8Array.from(atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export function pushState() {
  if (!cloudCfg.vapidPublicKey || !cloud.enabled) return 'off';
  if (isIOS && !isStandalone()) return 'ios';
  if (!push.supported) return 'unsupported';
  if (!cloud.session) return 'login';
  if (Notification.permission === 'denied') return 'denied';
  return push.sub ? 'on' : 'ready';
}
export const PUSH_TEXT = {
  ios: ['Только в установленном приложении', 'На iPhone напоминания приходят, если трекер добавлен на экран «Домой» (iOS 16.4 и новее). Откройте его оттуда и включите здесь.'],
  unsupported: ['Недоступны', 'Этот браузер не умеет показывать уведомления.'],
  login: ['Нужен вход в аккаунт', 'Чтобы напоминания приходили, даже когда приложение закрыто, войдите в аккаунт.'],
  denied: ['Запрещены', 'Уведомления заблокированы для этого сайта. Разрешите их в настройках браузера или iPhone и вернитесь сюда.'],
  ready: ['Выключены', 'Включите, чтобы получать напоминания в заданное время.'],
  on: ['Включены на этом устройстве', ''],
};
export const NOTIFY_MODES = {
  show: { label: 'Показывать название привычки', hint: 'Например: «Бег» — пора выполнить, осталось 3 из 5 км' },
  hide: { label: 'Скрывать содержимое', hint: 'Только «Пора отметить привычку», без названий и цифр' },
};
export const notifyMode = () => NOTIFY_MODES[getPref(NOTIFY_STORE, 'show')] ? getPref(NOTIFY_STORE, 'show') : 'show';
export async function storeNotifyMode(mode) {
  try { await (await caches.open('prefs')).put(new URL(TEST_MODE ? '__prefs/notify-test' : '__prefs/notify', document.baseURI).href, new Response(mode)); } catch {}
}
export function renderNotify() {
  const cur = notifyMode();
  $('notifyList').innerHTML = Object.entries(NOTIFY_MODES).map(([id, m]) =>
    `<button type="button" class="set-row" role="radio" aria-checked="${id === cur}" data-n="${id}">
      <span class="set-txt"><b>${m.label}</b><small>${m.hint}</small></span><span class="check"></span>
    </button>`).join('');
}
$('notifyList').onclick = e => {
  const b = e.target.closest('[data-n]');
  if (!b) return;
  setPref(NOTIFY_STORE, b.dataset.n);
  storeNotifyMode(b.dataset.n);
  renderNotify();
};
if ('caches' in window) storeNotifyMode(notifyMode());

export function renderPush() {
  const st = pushState();
  $('pushGroup').hidden = st === 'off';
  renderNotify();
  if (st === 'off') return renderRemindHint();
  const [title, text] = PUSH_TEXT[st];
  $('pushTitle').textContent = title;
  $('pushText').textContent = st === 'on' ? `Часовой пояс: ${tzName()}` : text;
  $('pushIc').dataset.on = st === 'on';
  $('pushOn').hidden = !(st === 'ready' || st === 'login');
  $('pushOnLabel').textContent = st === 'login' ? 'Войти в аккаунт' : 'Включить напоминания';
  $('pushOn').disabled = push.busy;
  $('pushTest').hidden = $('pushOff').hidden = st !== 'on';
  $('notifyBox').hidden = !['on', 'ready', 'login'].includes(st);
  $('smartBox').hidden = st !== 'on';
  $('goalRemBox').hidden = st !== 'on';
  renderSmart();
  renderGoalRemind();
  renderRemindHint();
}
export function renderSmart() {
  const s = smartOf();
  $('smartSwitch').setAttribute('aria-checked', s.on);
  $('smartWrap').classList.toggle('open', s.on);
  $('smartWrap').inert = !s.on;
  if (document.activeElement !== $('smartAt')) $('smartAt').value = s.at;
  if (document.activeElement !== $('smartQFrom')) $('smartQFrom').value = s.quiet[0];
  if (document.activeElement !== $('smartQTo')) $('smartQTo').value = s.quiet[1];
  $('smartRepSwitch').setAttribute('aria-checked', !!s.repeat);
  $('smartRepWrap').classList.toggle('open', !!s.repeat);
  $('smartRepWrap').inert = !s.repeat;
  for (const b of $('smartRep').children) b.setAttribute('aria-pressed', +b.dataset.v === (s.repeat || 60));
}
export function setSmart(patch) {
  state.smart = normSmart({ ...smartOf(), ...patch });
  save();
  renderSmart();
}
$('smartSwitch').onclick = () => setSmart({ on: !smartOf().on });
$('smartRepSwitch').onclick = () => setSmart({ repeat: smartOf().repeat ? 0 : 60 });
$('smartRep').onclick = e => { const b = e.target.closest('[data-v]'); if (b) setSmart({ repeat: +b.dataset.v }); };
$('smartAt').onchange = e => { if (HHMM.test(e.target.value)) setSmart({ at: e.target.value }); else renderSmart(); };
for (const [id, i] of [['smartQFrom', 0], ['smartQTo', 1]]) $(id).onchange = e => {
  if (!HHMM.test(e.target.value)) return renderSmart();
  const q = [...smartOf().quiet]; q[i] = e.target.value;
  setSmart({ quiet: q });
};
export function renderGoalRemind() {
  const g = goalRemindOf();
  $('goalRemSwitch').setAttribute('aria-checked', g.on);
  $('goalRemWrap').classList.toggle('open', g.on);
  $('goalRemWrap').inert = !g.on;
  if (document.activeElement !== $('goalRemAt')) $('goalRemAt').value = g.at;
}
export function setGoalRemind(patch) {
  state.goalRemind = normGoalRemind({ ...goalRemindOf(), ...patch });
  save();
  renderGoalRemind();
}
$('goalRemSwitch').onclick = () => setGoalRemind({ on: !goalRemindOf().on });
$('goalRemAt').onchange = e => { if (HHMM.test(e.target.value)) setGoalRemind({ at: e.target.value }); else renderGoalRemind(); };
export function renderRemindHint() {
  const el = $('remindHint');
  const st = pushState();
  if (!form.rem?.on || st === 'on' || st === 'off') { el.textContent = ''; return; }
  el.innerHTML = st === 'ios'
    ? 'Напоминания придут только в приложении, установленном на экран «Домой».'
    : 'Чтобы напоминание пришло, включите уведомления в <button type="button" data-open-push>Настройках</button>.';
}
$('remindHint').onclick = e => {
  if (!e.target.closest('[data-open-push]')) return;
  closeOverlay($('formOv')); renderSettings(); openOverlay($('setOv'));
};
export async function pushSave(sub) {
  const j = sub.toJSON();
  const { error } = await cloud.sb.from('push_subscriptions').upsert({
    endpoint: j.endpoint, user_id: cloud.session.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth,
    tz: pushTz(), user_agent: navigator.userAgent.slice(0, 200), last_seen: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) throw error;
}
export async function pushRefresh() {
  if (!push.supported || !cloudCfg.vapidPublicKey) return renderPush();
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    push.sub = reg ? await reg.pushManager.getSubscription() : null;
    if (push.sub && Notification.permission !== 'granted') push.sub = null;
    if (push.sub && cloud.session) await pushSave(push.sub);
  } catch {}
  renderPush();
}
export async function pushEnable() {
  if (push.busy) return;
  push.busy = true; renderPush();
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast(perm === 'denied' ? 'Уведомления запрещены — разрешите их в настройках браузера' : 'Разрешение не выдано', null, '');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    const key = b64uBytes(cloudCfg.vapidPublicKey);
    const cur = sub?.options?.applicationServerKey && new Uint8Array(sub.options.applicationServerKey);
    if (sub && cur && (cur.length !== key.length || cur.some((b, i) => b !== key[i]))) { await sub.unsubscribe(); sub = null; }
    sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await pushSave(sub);
    push.sub = sub;
    toast('Напоминания включены', null, '');
  } catch (err) {
    toast('Не удалось включить напоминания: ' + (err?.message || err), null, '');
  } finally {
    push.busy = false; renderPush();
  }
}
export async function pushDisable() {
  const sub = push.sub;
  push.sub = null;
  if (sub) {
    if (cloud.session) await cloud.sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  renderPush();
}
$('pushOn').onclick = () => {
  if (pushState() === 'login') { closeOverlay($('setOv')); openOverlay($('acctOv')); renderAccount(); return; }
  pushEnable();
};
$('pushOff').onclick = () => pushDisable().then(() => toast('Напоминания на этом устройстве выключены', null, ''), err => toast('Не удалось выключить: ' + err.message, null, ''));
$('pushTest').onclick = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const h = notifyMode() === 'show' && visibleHabits(state).find(x => !x.archived);
    await reg.showNotification(h ? h.name : 'Трекер привычек', { body: h ? 'Пора выполнить привычку' : 'Пора отметить привычку', icon: 'icons/icon-192.png', tag: 'test' });
  } catch (err) { toast('Не удалось показать уведомление: ' + err.message, null, ''); }
};
export function markDoneFromPush(id) {
  const h = findHabit(id);
  if (!h || h.archived || (isPrivate(h) && !unlocked)) return;
  if (!isToday(viewDate)) setViewDate(new Date());
  if (count(h, new Date()) < targetOn(h, new Date())) changeCount(h, new Date(), h.target, true);
  render();
}
navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'done') markDoneFromPush(e.data.id); });
let seenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !push.sub || !cloud.session || Date.now() - seenAt < 60000) return;
  seenAt = Date.now();
  pushSave(push.sub).catch(() => {});
});
