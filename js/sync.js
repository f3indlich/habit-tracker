import { $, isIOS, isStandalone, NS, TEST_MODE } from './core.js?v=1.05a';
import { findHabit, normalize, save, setState, state } from './storage.js?v=1.05a';
import { askConfirm, closeOverlay, openOverlay, toast } from './ui.js?v=1.05a';
import { render } from './render.js?v=1.05a';
import { pick } from './form.js?v=1.05a';
import { hist, renderHistory, setHist } from './history.js?v=1.05a';
import { pushDisable, pushRefresh, renderPush } from './push.js?v=1.05a';

export const cloudCfg = { ...(window.HABIT_CONFIG || {}) };
cloudCfg.supabaseUrl = String(cloudCfg.supabaseUrl || '').trim().replace(/\/(rest|auth|realtime|storage)\/v\d+\/?.*$/, '').replace(/\/+$/, '');
cloudCfg.supabaseKey = String(cloudCfg.supabaseKey || '').trim();
cloudCfg.vapidPublicKey = String(cloudCfg.vapidPublicKey || '').trim();
export const cloud = {
  enabled: !TEST_MODE && /^https:\/\/[^/]+\.supabase\.(co|in)\/?$/.test(cloudCfg.supabaseUrl || '') && (cloudCfg.supabaseKey || '').length > 20,
  sb: null, session: null, channel: null,
  status: 'off',
  lastSync: null, error: '',
  pushing: false, again: false, timer: null, applying: false, sizeWarned: false,
};
export const SIZE_TOAST = 'Данные не помещаются в облако. Всё сохранено на устройстве — удалите старые заметки или архивные привычки.';
export const SIZE_STATUS = 'Не синхронизировано: данных слишком много';
export const isSizeError = e => !!e && (String(e.code) === '23514' || e.status === 400)
  && /habit_data_size_limit/.test([e.message, e.details, e.hint].join(' '));
export const BASE_STORE = NS + '-sync-base';
export const OWNER_STORE = NS + '-owner';

export const emptyState = () => ({ habits: [], categories: [], log: {}, skip: {}, notes: {} });
export const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x);
export const same = (a, b) => canon(a) === canon(b);
export function loadBase() {
  try { const b = JSON.parse(localStorage.getItem(BASE_STORE)); if (b && b.uid === cloud.session?.user.id) return b; } catch {}
  return { uid: cloud.session?.user.id, version: null, data: null };
}
export function saveBase(version, data) {
  try { localStorage.setItem(BASE_STORE, JSON.stringify({ uid: cloud.session.user.id, version, data })); } catch {}
}

export function mergeStates(base, local, remote) {
  base = base || emptyState();
  const mergeList = (B, L, R) => {
    const bm = new Map(B.map(x => [x.id, x])), lm = new Map(L.map(x => [x.id, x])), rm = new Map(R.map(x => [x.id, x]));
    const pick = id => (same(lm.get(id), bm.get(id)) ? rm.get(id) : lm.get(id));
    const localReordered = !same(L.map(x => x.id).filter(id => bm.has(id)), B.map(x => x.id).filter(id => lm.has(id)));
    const lead = localReordered ? L : R, rest = localReordered ? R : L;
    const ids = [...new Set([...lead.map(x => x.id), ...rest.map(x => x.id)])];
    return ids.map(pick).filter(Boolean);
  };
  const mergeDays = (B, L, R) => {
    const out = {};
    for (const day of new Set([...Object.keys(B), ...Object.keys(L), ...Object.keys(R)])) {
      const b = B[day] || {}, l = L[day] || {}, r = R[day] || {};
      for (const id of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const v = l[id] !== b[id] ? l[id] : r[id];
        if (v) (out[day] ??= {})[id] = v;
      }
    }
    return out;
  };
  return {
    habits: mergeList(base.habits || [], local.habits || [], remote.habits || []),
    categories: mergeList(base.categories || [], local.categories || [], remote.categories || []),
    log: mergeDays(base.log || {}, local.log || {}, remote.log || {}),
    skip: mergeDays(base.skip || {}, local.skip || {}, remote.skip || {}),
    notes: mergeDays(base.notes || {}, local.notes || {}, remote.notes || {}),
    profile: same(local.profile, base.profile) ? remote.profile : local.profile,
  };
}

export function applyState(next) {
  cloud.applying = true;
  setState(normalize(next));
  save();
  cloud.applying = false;
  render();
  if (hist) { if (findHabit(hist.id)) renderHistory(); else { closeOverlay($('histOv')); setHist(null); } }
}

export function setSync(status, error = '') {
  cloud.status = status; cloud.error = error;
  if (status === 'ok') cloud.lastSync = new Date();
  renderAccount();
}

export function cloudQueue() {
  if (!cloud.session || cloud.applying) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(cloudPush, 700);
  if (cloud.status !== 'syncing') setSync('syncing');
}

export async function cloudPull() {
  const uid = cloud.session.user.id;
  const { data: row, error } = await cloud.sb.from('habit_data').select('data, version').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  const base = loadBase();
  if (!row) {
    if (base.version != null) saveBase(null, null);
    return true;
  }
  if (row.version === base.version) return !same(state, base.data);
  const remote = normalize(row.data);
  const merged = normalize(mergeStates(base.data, state, remote));
  saveBase(row.version, remote);
  if (!same(merged, state)) applyState(merged);
  return !same(merged, remote);
}

export async function cloudPush() {
  if (!cloud.session) return;
  if (cloud.pushing) { cloud.again = true; return; }
  cloud.pushing = true;
  setSync('syncing');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const base = loadBase(), uid = cloud.session.user.id;
      if (base.version != null && same(state, base.data)) break;
      const payload = JSON.parse(JSON.stringify(state));
      if (base.version == null) {
        const { error, status } = await cloud.sb.from('habit_data').insert({ user_id: uid, data: payload, version: 1 });
        if (!error) { saveBase(1, payload); break; }
        if (error.code !== '23505') throw Object.assign(error, { status });
      } else {
        const { data, error, status } = await cloud.sb.from('habit_data')
          .update({ data: payload, version: base.version + 1, updated_at: new Date().toISOString() })
          .eq('user_id', uid).eq('version', base.version).select('version');
        if (error) throw Object.assign(error, { status });
        if (data?.length) { saveBase(base.version + 1, payload); break; }
      }
      if (!(await cloudPull())) break;
    }
    setSync('ok');
  } catch (e) {
    clearTimeout(cloud.timer);
    if (isSizeError(e)) {
      setSync('error', SIZE_STATUS);
      if (!cloud.sizeWarned) { cloud.sizeWarned = true; toast(SIZE_TOAST, null, ''); }
    } else {
      console.warn('sync failed', e);
      setSync(navigator.onLine ? 'error' : 'offline', e?.message || String(e));
      cloud.timer = setTimeout(cloudPush, navigator.onLine ? 15000 : 60000);
    }
  } finally {
    cloud.pushing = false;
    if (cloud.again) { cloud.again = false; cloudPush(); }
  }
}

export async function cloudCheck() {
  if (!cloud.session || cloud.pushing || cloud.status === 'syncing') return;
  try {
    const { data: row, error } = await cloud.sb.from('habit_data').select('version').eq('user_id', cloud.session.user.id).maybeSingle();
    if (error) throw error;
    const base = loadBase();
    if (row?.version === base.version && same(state, base.data)) return;
  } catch {}
  cloudSync();
}

export async function cloudSync() {
  if (!cloud.session || cloud.pushing) return;
  try {
    setSync('syncing');
    if (await cloudPull()) await cloudPush(); else setSync('ok');
  } catch (e) { console.warn('sync failed', e); setSync(navigator.onLine ? 'error' : 'offline', e?.message || String(e)); }
}

export async function startSync() {
  const uid = cloud.session.user.id;
  let owner = null; try { owner = localStorage.getItem(OWNER_STORE); } catch {}
  if (owner && owner !== uid) {
    try { localStorage.removeItem(BASE_STORE); } catch {}
    applyState(emptyState());
  }
  try { localStorage.setItem(OWNER_STORE, uid); } catch {}
  await cloudSync();
  pushRefresh();
  cloud.channel?.unsubscribe();
  cloud.channel = cloud.sb.channel('habit_data:' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_data', filter: `user_id=eq.${uid}` }, p => {
      if (p.new?.version !== loadBase().version) cloudSync();
    })
    .subscribe();
}
export function stopSync() {
  cloud.channel?.unsubscribe(); cloud.channel = null;
  clearTimeout(cloud.timer);
  setSync('off');
}

export async function initCloud(client) {
  if (!cloud.enabled && !client) { renderAccount(); return; }
  const fromLink = /access_token|refresh_token/.test(location.hash);
  const hashParams = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const linkError = hashParams.get('error_code') || hashParams.get('error');
  if (linkError) history.replaceState(null, '', location.pathname);
  try {
    if (!client) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.min.js';
        s.integrity = 'sha384-D3HBLJnDxXL59BXo26GFWjGTcyxip2IVM0I+EqfCMwOhTc5jUTZxISDtfdXFaUOm';
        s.crossOrigin = 'anonymous';
        s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить библиотеку Supabase'));
        document.head.append(s);
      });
      client = window.supabase.createClient(cloudCfg.supabaseUrl, cloudCfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
      });
    }
    cloud.sb = client;
    cloud.sb.auth.onAuthStateChange((event, s) => {
      const was = cloud.session?.user.id;
      cloud.session = s;
      if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname + location.search);
      if (s && s.user.id !== was) startSync();
      if (!s && was) stopSync();
      renderAccount();
    });
    const { data } = await cloud.sb.auth.getSession();
    if (data.session && !cloud.session) { cloud.session = data.session; startSync(); }
    if (fromLink && cloud.session && isIOS && !isStandalone()) { authStep = 'handoff'; openOverlay($('acctOv')); }
    else if (fromLink && cloud.session) toast(`Вы вошли как ${cloud.session.user.email}. Синхронизация включена`, null, '');
    else if (linkError && !cloud.session) {
      $('acctLinkError').textContent = /expired|invalid|denied/i.test(linkError + hashParams.get('error_description'))
        ? 'Ссылка из письма устарела или уже использована. Она срабатывает один раз и только из последнего письма — запросите новое.'
        : 'Не удалось войти по ссылке: ' + (hashParams.get('error_description') || linkError);
      authStep = 'email';
      openOverlay($('acctOv'));
    }
  } catch (e) { setSync('error', e.message); }
  renderAccount();
  if (!cloud.session) pushRefresh();
}

addEventListener('storage', async e => {
  if (!cloud.sb || cloud.session || !e.key?.startsWith('sb-')) return;
  const { data } = await cloud.sb.auth.getSession();
  if (data.session && !cloud.session) { cloud.session = data.session; startSync(); renderAccount(); }
});

export function sendErrorText(err) {
  const m = err?.message || String(err);
  if (/rate limit|too many|over_email_send_rate_limit/i.test(m + err?.code))
    return 'Лимит писем исчерпан: бесплатный почтовый сервер Supabase отправляет лишь несколько писем в час. Попробуйте через час — или откройте ссылку из последнего полученного письма.';
  if (/seconds/i.test(m)) return 'Слишком часто — подождите минуту и попробуйте снова';
  return 'Не удалось отправить письмо: ' + m;
}

addEventListener('online', () => cloud.session && cloudSync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.session) cloudCheck(); });
setInterval(() => { if (document.visibilityState === 'visible' && cloud.session) cloudCheck(); }, 15 * 60 * 1000);

export let authStep = 'email', authEmail = '', resendAt = 0;
export const SYNC_TEXT = { off: 'Синхронизация выключена', syncing: 'Синхронизация…', ok: 'Всё синхронизировано', offline: 'Нет сети — изменения сохранены на устройстве и отправятся позже', error: 'Ошибка синхронизации' };

export function renderAccount() {
  const btn = $('acctBtn');
  btn.dataset.sync = cloud.session ? cloud.status : 'none';
  btn.title = !cloud.enabled && !cloud.sb ? 'Синхронизация не настроена' : 'Войти и синхронизировать';
  btn.hidden = !!cloud.session;
  $('setBtn').dataset.sync = cloud.session ? cloud.status : 'none';
  $('setCloudIn').hidden = !cloud.session;
  $('setLogin').hidden = !!cloud.session || (!cloud.enabled && !cloud.sb);
  renderPush();
  if (cloud.session) {
    $('setEmail').textContent = cloud.session.user.email;
    const when = cloud.lastSync ? ` · ${cloud.lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : '';
    $('setStatus').textContent = SYNC_TEXT[cloud.status] + (cloud.status === 'ok' ? when : '');
    $('setStatus').dataset.sync = cloud.status;
    $('setError').textContent = cloud.status === 'error' ? cloud.error : '';
    if ($('acctOv')._shown && authStep !== 'handoff') { authStep = 'email'; closeOverlay($('acctOv')); toast(`Вы вошли как ${cloud.session.user.email}`); }
  }
  if (!$('acctOv')._shown) return;
  const view = !cloud.enabled && !cloud.sb ? 'setup' : cloud.session ? 'handoff' : authStep;
  for (const v of ['setup', 'email', 'code', 'handoff', 'copied']) $('acct-' + v).hidden = v !== view;
  if (view === 'code') {
    for (const el of document.querySelectorAll('.acctSentTo')) el.textContent = authEmail;
    const iosApp = isIOS && isStandalone();
    $('acctCodeHow').innerHTML = iosApp
      ? 'Нажмите в нём ссылку — откроется Safari. Там нажмите <b>«Скопировать код»</b>, вернитесь сюда и вставьте его.'
      : 'Нажмите ссылку в нём — вход произойдёт сам. Если в письме есть код, можно ввести его здесь.';
    $('acctPaste').hidden = !(iosApp && navigator.clipboard?.readText);
  }
  const wait = Math.ceil((resendAt - Date.now()) / 1000);
  $('acctResend').disabled = wait > 0;
  $('acctResend').textContent = wait > 0 ? `Отправить снова через ${wait} с` : 'Отправить письмо снова';
}
setInterval(() => { if ($('acctOv')._shown && authStep === 'code') renderAccount(); }, 1000);

export async function sendLink(email) {
  const { error } = await cloud.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
  if (error) throw error;
  $('acctLinkError').textContent = '';
  authEmail = email; authStep = 'code'; resendAt = Date.now() + 60000;
  renderAccount();
  setTimeout(() => $('acctCode').focus(), 100);
}

$('acctBtn').onclick = () => { openOverlay($('acctOv')); renderAccount(); };
$('acctEmailForm').onsubmit = async e => {
  e.preventDefault();
  const email = $('acctEmailInput').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Проверьте адрес почты');
  $('acctSend').disabled = true;
  try { await sendLink(email); }
  catch (err) { toast(sendErrorText(err), null, ''); }
  finally { $('acctSend').disabled = false; }
};
$('acctCodeForm').onsubmit = async e => {
  e.preventDefault();
  await signInWithCode($('acctCode').value);
};
export async function signInWithCode(raw) {
  const value = raw.trim().replace(/^["'«]+|["'»]+$/g, '');
  const digits = value.replace(/[\s-]/g, '');
  if (!value) return toast('Вставьте код входа');
  $('acctVerify').disabled = true;
  try {
    const { error } = /^\d{6,8}$/.test(digits)
      ? await cloud.sb.auth.verifyOtp({ email: authEmail, token: digits, type: 'email' })
      : await cloud.sb.auth.refreshSession({ refresh_token: value });
    if (error) throw error;
    $('acctCode').value = '';
  } catch (err) {
    const m = err?.message || '';
    toast(/already used|revoked|not found|invalid refresh/i.test(m)
      ? 'Этот код уже недействителен. Запросите новое письмо и скопируйте свежий код'
      : 'Код не подошёл: ' + (m || 'неизвестная ошибка'), null, '');
  }
  finally { $('acctVerify').disabled = false; }
}
$('acctPaste').onclick = async () => {
  try {
    const text = await navigator.clipboard.readText();
    $('acctCode').value = text.trim();
    if (text.trim()) await signInWithCode(text);
  } catch { toast('Не удалось вставить — нажмите на поле и выберите «Вставить»'); }
};
$('acctCopy').onclick = async () => {
  const token = cloud.session?.refresh_token;
  if (!token) return;
  try { await navigator.clipboard.writeText(token); }
  catch { return toast('Не удалось скопировать код'); }
  cloud.sb.auth.stopAutoRefresh();
  stopSync();
  try { for (const k of Object.keys(localStorage)) if (/^sb-.+-auth-token/.test(k)) localStorage.removeItem(k); } catch {}
  cloud.session = null;
  authStep = 'copied';
  renderAccount();
};
$('acctStay').onclick = () => { authStep = 'email'; closeOverlay($('acctOv')); };
$('acctResend').onclick = async () => {
  try { await sendLink(authEmail); toast('Письмо отправлено ещё раз. Открывайте ссылку только из этого, последнего письма'); } catch (err) { toast(sendErrorText(err), null, ''); }
};
$('acctBack').onclick = () => { authStep = 'email'; renderAccount(); };
$('setSyncNow').onclick = () => cloudSync();
$('setSignOut').onclick = async () => {
  const ok = await askConfirm('Выйти из аккаунта?', 'Синхронизация остановится. Привычки останутся на этом устройстве, а в облаке — в Вашем аккаунте.', 'Выйти');
  if (!ok) return;
  await pushDisable().catch(() => {});
  await cloud.sb.auth.signOut({ scope: 'local' });
  authStep = 'email';
  renderAccount();
};

