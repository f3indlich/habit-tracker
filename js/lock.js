import { $, esc, isIOS } from './core.js?v=2.0';
import { IC } from './icons.js?v=2.0';
import { findHabit, save, setMap, state } from './storage.js?v=2.0';
import { closeMenu, closeOverlay, openOverlay, shownOverlays, toast } from './ui.js?v=2.0';
import { purgePrivate, render } from './render.js?v=2.0';
import { editingId, form, syncPrivRow } from './form.js?v=2.0';
import { day, hist, setHist } from './history.js?v=2.0';
import { exportData } from './settings.js?v=2.0';
import { goalsLocked } from './goalsui.js?v=2.0';
import { cloud } from './sync.js?v=2.0';
import { addLongPress, b64, hasPin, IDLE_MS, isPrivate, LOCK_STORE, lockWait, readLock, setPin, setUnlocked, tryPin, unb64, unlocked, validPin, writeLock } from './privacy.js?v=2.0';

export const FACE = isIOS ? 'Face ID или Touch ID' : 'отпечаток пальца или распознавание лица';
export const WIPE_WORD = 'СТЕРЕТЬ';
export let lockMode = null;
let idleTimer = null, waitTimer = null, privBar = null;

// Face ID / Touch ID здесь — только локальная проверка «владелец у телефона».
// Подпись от WebAuthn нигде не проверяется на сервере: приложение лишь просит
// платформенный аутентификатор подтвердить пользователя (флаг UV). PIN остаётся запасным способом.
export async function faceAvailable() {
  try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}
async function faceCreate() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Трекер привычек', id: location.hostname },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'Трекер привычек', displayName: 'Трекер привычек' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    attestation: 'none', timeout: 60000,
  } });
  return b64(cred.rawId);
}
async function faceCheck(id) {
  const a = await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rpId: location.hostname,
    allowCredentials: [{ type: 'public-key', id: unb64(id), transports: ['internal'] }],
    userVerification: 'required', timeout: 60000,
  } });
  const flags = a && new Uint8Array(a.response.authenticatorData)[32];
  return !!(flags & 4);
}

export function unlock() {
  setUnlocked(true);
  showBar();
  bumpIdle();
  render();
}
export function lockNow() {
  clearTimeout(idleTimer);
  const was = unlocked;
  setUnlocked(false);
  scrub();
  purgePrivate();
  privBar?.remove();
  privBar = null;
  if (was) render();
}

const hideNow = ov => { closeOverlay(ov); ov.hidden = true; };
function scrub() {
  closeMenu();
  const hh = hist && findHabit(hist.id);
  if (!$('histOv')._shown || isPrivate(hh)) {
    if ($('histOv')._shown) { hideNow($('histOv')); setHist(null); }
    for (const id of ['hIcon', 'hName', 'hTags', 'hWhy', 'hTiles', 'hPlan', 'hStats', 'hChart', 'hHeat']) $(id).innerHTML = '';
    $('hTiles')._html = null;
  }
  if (!$('dayOv')._shown || isPrivate(findHabit(day?.id))) {
    if ($('dayOv')._shown) hideNow($('dayOv'));
    for (const id of ['dIcon', 'dName', 'dDate', 'dFacts']) $(id).innerHTML = '';
    $('dNote').value = '';
  }
  if (!$('formOv')._shown || form.priv || isPrivate(findHabit(editingId))) {
    if ($('formOv')._shown) hideNow($('formOv'));
    $('form').reset();
    form.priv = false;
  }
  syncPrivRow();
  goalsLocked();
  if ($('lockOv')._shown) hideNow($('lockOv'));
  clearBody();
}
function clearBody() {
  clearInterval(waitTimer);
  lockMode = null;
  $('lockTitle').textContent = '';
  $('lockBody').innerHTML = '';
}

function showBar() {
  if (privBar) return;
  privBar = document.createElement('button');
  privBar.type = 'button';
  privBar.className = 'priv-bar';
  privBar.innerHTML = `${IC.lock}<span>Личное открыто · закрыть</span>`;
  privBar.onclick = () => { lockNow(); toast('Личное закрыто', null, ''); };
  $('hero').before(privBar);
}

function bumpIdle() {
  clearTimeout(idleTimer);
  if (unlocked) idleTimer = setTimeout(lockNow, IDLE_MS);
}
for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(t, () => { if (unlocked) bumpIdle(); }, { capture: true, passive: true });
addEventListener('scroll', () => { if (unlocked) bumpIdle(); }, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lockNow(); });
addEventListener('pagehide', lockNow);

const pinField = (id, label, auto) => `${label ? `<label class="pin-lbl" for="${id}">${label}</label>` : ''}
  <input class="pin-in" id="${id}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"${label ? '' : ' aria-label="PIN"'}${auto ? ' autofocus' : ''}>`;
const note = text => `<p class="acct-note">${text}</p>`;

function sheet(mode, title, html) {
  clearInterval(waitTimer);
  lockMode = mode;
  $('lockTitle').textContent = title;
  $('lockBody').innerHTML = html;
  if (!$('lockOv')._shown) openOverlay($('lockOv'));
  const f = $('lockBody').querySelector('input');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
}
const err = text => { const e = $('lockErr'); if (e) { e.textContent = text; e.hidden = !text; } };
const digits = id => $(id).value.replace(/\D/g, '');

export function openLock() {
  if (unlocked) return;
  if (!hasPin()) return showSetup();
  showEnter();
}
addLongPress($('setBtn'), () => {
  if (shownOverlays().length) return;
  if (unlocked) { lockNow(); toast('Личное закрыто', null, ''); } else openLock();
});

function showSetup() {
  const cloudOnes = state.habits.some(isPrivate);
  sheet('setup', 'Личные привычки', `
    ${note(cloudOnes ? 'На этом устройстве нужно задать PIN. Личные привычки из облака откроются после этого.' : `Привычки, которые не видно при обычном просмотре. Открываются по PIN${isIOS ? ', Face ID или Touch ID' : ' или отпечатку пальца'}.`)}
    <form class="lock-form" id="lockForm" novalidate>
      ${pinField('lockPin', 'Придумайте PIN: от 4 до 6 цифр', true)}
      ${pinField('lockPin2', 'Повторите PIN')}
      <p class="lock-err" id="lockErr" role="alert" hidden></p>
      <button type="submit" class="primary lock-go">Создать PIN</button>
    </form>
    <p class="lock-hint">Это защита от случайного взгляда. Сами данные хранятся на устройстве и в облаке как обычно.</p>`);
  $('lockForm').onsubmit = async e => {
    e.preventDefault();
    const a = digits('lockPin'), b = digits('lockPin2');
    if (!validPin(a)) return err('PIN должен состоять из 4–6 цифр');
    if (a !== b) return err('PIN не совпадает');
    await setPin(a);
    unlock();
    if (await faceAvailable()) return showFaceOffer();
    closeOverlay($('lockOv'));
  };
}

function showFaceOffer() {
  sheet('face', 'Открывать без PIN?', `
    ${note(`Можно открывать личные привычки через ${FACE}. PIN останется запасным способом.`)}
    <p class="lock-err" id="lockErr" role="alert" hidden></p>
    <div class="form-actions"><button type="button" id="lockFaceNo">Не сейчас</button><button type="button" class="primary" id="lockFaceYes">Включить</button></div>`);
  $('lockFaceNo').onclick = () => closeOverlay($('lockOv'));
  $('lockFaceYes').onclick = async () => {
    if (await enableFace()) closeOverlay($('lockOv'));
  };
}
async function enableFace() {
  try {
    const id = await faceCreate();
    const rec = readLock();
    rec.cred = id;
    writeLock(rec);
    toast(`${FACE[0].toUpperCase() + FACE.slice(1)}: включено`, null, '');
    return true;
  } catch {
    err('Не получилось включить. Можно попробовать позже в настройках личного.');
    return false;
  }
}

function showEnter() {
  const rec = readLock();
  sheet('enter', 'Введите PIN', `
    <form class="lock-form" id="lockForm" novalidate>
      ${pinField('lockPin', '', true)}
      <p class="lock-err" id="lockErr" role="alert" hidden></p>
      <button type="submit" class="primary lock-go" id="lockGo">Открыть</button>
    </form>
    ${rec.cred ? `<button type="button" class="lock-face" id="lockFace" hidden>${IC.face}<span>Открыть: ${esc(FACE)}</span></button>` : ''}
    <button type="button" class="link-btn lock-forgot" id="lockForgot">Забыли PIN?</button>`);
  if (rec.cred) faceAvailable().then(ok => { if (ok && $('lockFace')) { $('lockFace').hidden = false; $('lockFace').onclick = tryFace; } });
  $('lockForgot').onclick = showWipe;
  $('lockForm').onsubmit = async e => {
    e.preventDefault();
    const res = await tryPin(digits('lockPin'));
    if (lockMode !== 'enter') return;
    if (res.ok) { closeOverlay($('lockOv')); unlock(); return; }
    $('lockPin').value = '';
    if (res.wait) showWait(); else err('Неверный PIN');
  };
  if (lockWait(rec)) showWait();
}
function showWait() {
  const tick = () => {
    const ms = lockWait();
    const ok = !ms || lockMode !== 'enter';
    $('lockPin').disabled = $('lockGo').disabled = !ok;
    if (ok) { clearInterval(waitTimer); err(''); return; }
    const s = Math.ceil(ms / 1000);
    err(`Слишком много попыток. Попробуйте через ${s < 60 ? s + ' с' : Math.ceil(s / 60) + ' мин'}`);
  };
  clearInterval(waitTimer);
  tick();
  waitTimer = setInterval(tick, 1000);
}
async function tryFace() {
  const rec = readLock();
  try {
    if (await faceCheck(rec.cred)) { closeOverlay($('lockOv')); unlock(); return; }
  } catch {}
  err('Не получилось. Введите PIN');
}

function showWipe() {
  sheet('wipe', 'Забыли PIN?', `
    ${note(`PIN нельзя восстановить. Единственный способ — стереть личные привычки${cloud.session ? '. Вы вошли в аккаунт, поэтому они будут удалены и из облака, и со всех устройств' : ' на этом устройстве'}. Обычные привычки не пострадают.`)}
    <button type="button" class="del-export" id="lockExport"><svg class="ic" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/></svg>Сначала скачать копию данных</button>
    <form class="lock-form" id="lockForm" novalidate>
      <label class="del-label" for="lockWord">Чтобы подтвердить, введите слово <b>${WIPE_WORD}</b></label>
      <input type="text" id="lockWord" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <p class="lock-err" id="lockErr" role="alert" hidden></p>
      <button type="submit" class="danger-fill del-go">Стереть личные привычки</button>
    </form>`);
  $('lockExport').onclick = exportData;
  $('lockForm').onsubmit = e => {
    e.preventDefault();
    if ($('lockWord').value.trim().toUpperCase() !== WIPE_WORD) return err(`Введите слово ${WIPE_WORD}`);
    dropPrivate(true);
    try { localStorage.removeItem(LOCK_STORE); } catch {}
    lockNow();
    toast('Личные привычки стёрты, PIN сброшен', null, '');
  };
}

function dropPrivate(remove) {
  const ids = state.habits.filter(isPrivate).map(h => h.id);
  if (remove) {
    state.habits = state.habits.filter(h => !isPrivate(h));
    for (const map of [state.log, state.skip, state.notes]) for (const k in map) for (const id of ids) setMap(map, k, id, 0);
    state.goals = (state.goals || []).filter(g => !isPrivate(g));
    for (const g of state.goals) if (g.habitIds?.some(id => ids.includes(id))) { g.habitIds = g.habitIds.filter(id => !ids.includes(id)); g.updatedAt = Date.now(); }
  } else {
    state.habits.forEach(h => { delete h.private; });
    for (const g of state.goals || []) if (isPrivate(g)) { delete g.private; g.updatedAt = Date.now(); }
  }
  save();
}

export function openLockSettings() {
  if (!unlocked) return;
  const rec = readLock();
  sheet('settings', 'Личные привычки', `
    <div class="set-card">
      <button type="button" class="set-row" id="lockChange"><span class="set-ic">${IC.lock}</span><span class="set-txt"><b>Сменить PIN</b></span></button>
      <button type="button" class="set-row" id="lockFaceRow" hidden><span class="set-ic">${IC.face}</span><span class="set-txt"><b>${esc(FACE[0].toUpperCase() + FACE.slice(1))}</b><small>${rec.cred ? 'Включено' : 'Выключено'}</small></span>
        <span class="switch" role="switch" aria-checked="${!!rec.cred}"><span></span></span></button>
      <button type="button" class="set-row danger" id="lockOff"><span class="set-ic">${IC.trash.replace(' del-ic', '')}</span><span class="set-txt"><b>Отключить личные привычки</b></span></button>
    </div>
    <p class="lock-err" id="lockErr" role="alert" hidden></p>`);
  faceAvailable().then(ok => { if (ok && $('lockFaceRow')) $('lockFaceRow').hidden = false; });
  $('lockChange').onclick = showChange;
  $('lockFaceRow').onclick = async () => {
    const r = readLock();
    if (r.cred) { delete r.cred; writeLock(r); toast(`${FACE[0].toUpperCase() + FACE.slice(1)}: выключено`, null, ''); openLockSettings(); }
    else if (await enableFace()) openLockSettings();
  };
  $('lockOff').onclick = showOff;
}

function showChange() {
  sheet('change', 'Новый PIN', `
    <form class="lock-form" id="lockForm" novalidate>
      ${pinField('lockPin', 'Новый PIN: от 4 до 6 цифр', true)}
      ${pinField('lockPin2', 'Повторите PIN')}
      <p class="lock-err" id="lockErr" role="alert" hidden></p>
      <button type="submit" class="primary lock-go">Сохранить</button>
    </form>`);
  $('lockForm').onsubmit = async e => {
    e.preventDefault();
    const a = digits('lockPin'), b = digits('lockPin2');
    if (!validPin(a)) return err('PIN должен состоять из 4–6 цифр');
    if (a !== b) return err('PIN не совпадает');
    await setPin(a);
    toast('PIN изменён', null, '');
    openLockSettings();
  };
}

function showOff() {
  sheet('off', 'Отключить личные привычки?', `
    ${note(`PIN и ${FACE} будут отключены на этом устройстве. Что сделать с личными привычками?`)}
    <form class="lock-form" id="lockForm">
      <label class="del-check"><input type="radio" name="lockOffWhat" value="keep" checked><span>Сделать обычными</span></label>
      <label class="del-check"><input type="radio" name="lockOffWhat" value="drop"><span>Удалить вместе с историей</span></label>
      <div class="form-actions"><button type="button" id="lockOffNo">Отмена</button><button type="submit" class="danger-fill">Отключить</button></div>
    </form>`);
  $('lockOffNo').onclick = openLockSettings;
  $('lockForm').onsubmit = e => {
    e.preventDefault();
    const drop = $('lockForm').lockOffWhat.value === 'drop';
    dropPrivate(drop);
    try { localStorage.removeItem(LOCK_STORE); } catch {}
    lockNow();
    toast(drop ? 'Личные привычки удалены' : 'Личные привычки стали обычными', null, '');
  };
}

$('lockOv')._guard = () => { setTimeout(() => { if (!$('lockOv')._shown) clearBody(); }, 400); return true; };
