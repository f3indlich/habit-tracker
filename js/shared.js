import { NS } from './core.js?v=3.2a';
import { cloud } from './sync.js?v=3.2a';

export const SHARED_LIM = { lists: 10, members: 5, items: 500, text: 200, name: 40, who: 24, batch: 50 };
export const SHARED_CACHE = NS + '-shared-cache', SHARED_OK = NS + '-shared-ok';
export const SHARED_CACHE_MAX = 600000;
export const SHARED_POLL_MS = 30000;
export const OFFLINE_EDIT = 'Нет сети. Изменения сейчас не сохранить';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const isTime = v => typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v));
const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';

export const sh = { uid: null, lists: [], members: {}, items: {}, at: 0, offline: false, error: '', loaded: false };

export function normShared(raw) {
  const out = { lists: [], members: {}, items: {}, at: 0 };
  if (!isObj(raw)) return out;
  const ids = new Set();
  for (const l of Array.isArray(raw.lists) ? raw.lists : []) {
    if (!isObj(l) || !isId(l.id) || ids.has(l.id) || !isId(l.owner_id)) continue;
    const name = str(l.name, SHARED_LIM.name);
    if (!name) continue;
    ids.add(l.id);
    out.lists.push({ id: l.id, name, owner_id: l.owner_id });
    if (out.lists.length >= SHARED_LIM.lists) break;
  }
  for (const id of ids) {
    const ms = Array.isArray(raw.members?.[id]) ? raw.members[id] : [], seen = new Set();
    out.members[id] = ms.filter(m => isObj(m) && isId(m.user_id) && !seen.has(m.user_id) && seen.add(m.user_id) && str(m.display_name, SHARED_LIM.who))
      .slice(0, SHARED_LIM.members).map(m => ({ user_id: m.user_id, display_name: str(m.display_name, SHARED_LIM.who) }));
    const its = Array.isArray(raw.items?.[id]) ? raw.items[id] : [], iseen = new Set();
    out.items[id] = its.filter(x => isObj(x) && isId(x.id) && !iseen.has(x.id) && iseen.add(x.id) && str(x.text, SHARED_LIM.text)).slice(0, SHARED_LIM.items).map(x => ({
      id: x.id, text: str(x.text, SHARED_LIM.text), done: x.done === true,
      done_by: isId(x.done_by) ? x.done_by : null, done_at: isTime(x.done_at) ? x.done_at : null,
      created_by: isId(x.created_by) ? x.created_by : null, created_at: isTime(x.created_at) ? x.created_at : null,
    }));
  }
  out.at = Number.isFinite(raw.at) ? raw.at : 0;
  return out;
}

export function loadSharedCache(uid) {
  try {
    const raw = JSON.parse(localStorage.getItem(SHARED_CACHE));
    if (!raw || raw.uid !== uid || !uid) return false;
    Object.assign(sh, normShared(raw), { uid });
    return true;
  } catch { return false; }
}
export function saveSharedCache() {
  if (!sh.uid) return;
  try {
    const text = JSON.stringify({ uid: sh.uid, lists: sh.lists, members: sh.members, items: sh.items, at: sh.at });
    if (text.length > SHARED_CACHE_MAX) localStorage.removeItem(SHARED_CACHE);
    else localStorage.setItem(SHARED_CACHE, text);
  } catch {}
}
export function clearShared() {
  Object.assign(sh, { uid: null, lists: [], members: {}, items: {}, at: 0, offline: false, error: '', loaded: false });
  try { localStorage.removeItem(SHARED_CACHE); } catch {}
}

export const sharedReady = () => !!(cloud.sb && cloud.session?.user?.id);
export const myId = () => cloud.session?.user?.id || null;
const netError = e => !navigator.onLine || /fetch|network|load failed|timeout/i.test(String(e?.message || e || ''));

const ERRORS = {
  shared_too_many_lists: `Можно участвовать не больше чем в ${SHARED_LIM.lists} общих списках`,
  too_many_lists: `Можно участвовать не больше чем в ${SHARED_LIM.lists} общих списках`,
  shared_list_full: `В списке уже ${SHARED_LIM.members} участников`,
  full: `В списке уже ${SHARED_LIM.members} участников`,
  shared_items_full: `В списке может быть до ${SHARED_LIM.items} записей`,
  shared_bad_name: `Название — от 1 до ${SHARED_LIM.name} знаков`,
  shared_bad_display_name: `Имя — от 1 до ${SHARED_LIM.who} знаков`,
  bad_display_name: `Имя — от 1 до ${SHARED_LIM.who} знаков`,
  bad_code: 'Код не подходит. Попросите новый код у владельца списка',
  too_many: 'Слишком много попыток. Попробуйте через 10 минут',
  already: 'Вы уже участник этого списка',
  shared_not_owner: 'Это может сделать только владелец списка',
  shared_owner_cannot_leave: 'Владелец не может выйти из списка — его можно только удалить',
  offline: OFFLINE_EDIT,
};
export const sharedErrorText = code => ERRORS[code] || 'Не получилось. Попробуйте ещё раз';
export class SharedError extends Error { constructor(code) { super(sharedErrorText(code)); this.code = code; } }
function check(res) {
  if (res?.error) {
    const m = String(res.error.message || ''), code = Object.keys(ERRORS).find(k => m.includes(k));
    throw new SharedError(code || (netError(res.error) ? 'offline' : 'unknown'));
  }
  return res?.data;
}
function guard() {
  if (!sharedReady()) throw new SharedError('unknown');
  if (!navigator.onLine) throw new SharedError('offline');
}

export async function fetchShared() {
  if (!sharedReady()) return false;
  const uid = myId();
  if (sh.uid !== uid) { Object.assign(sh, { lists: [], members: {}, items: {}, at: 0, loaded: false }); loadSharedCache(uid); sh.uid = uid; }
  if (!navigator.onLine) { sh.offline = true; return false; }
  try {
    const sb = cloud.sb;
    const lists = check(await sb.from('shared_lists').select('id, name, owner_id').order('created_at')) || [];
    const ids = lists.map(l => l.id), members = {}, items = {};
    if (ids.length) {
      for (const m of check(await sb.from('shared_members').select('list_id, user_id, display_name').in('list_id', ids).order('joined_at')) || []) (members[m.list_id] ??= []).push(m);
      for (const x of check(await sb.from('shared_items').select('id, list_id, text, done, done_by, done_at, created_by, created_at').in('list_id', ids).order('created_at')) || []) (items[x.list_id] ??= []).push(x);
    }
    Object.assign(sh, normShared({ lists, members, items, at: Date.now() }), { uid, offline: false, error: '', loaded: true });
    saveSharedCache();
    return true;
  } catch (e) {
    sh.offline = e?.code === 'offline' || netError(e);
    sh.error = sh.offline ? '' : e.message;
    return false;
  }
}

export async function addSharedItems(listId, texts) {
  guard();
  const uid = myId(), rows = texts.map(t => String(t).trim().slice(0, SHARED_LIM.text)).filter(Boolean).slice(0, SHARED_LIM.batch).map(text => ({ list_id: listId, text, created_by: uid }));
  if (!rows.length) return 0;
  check(await cloud.sb.from('shared_items').insert(rows));
  return rows.length;
}
export async function setSharedDone(id, done) { guard(); check(await cloud.sb.from('shared_items').update({ done }).eq('id', id)); }
export async function editSharedItem(id, text) { guard(); check(await cloud.sb.from('shared_items').update({ text: String(text).trim().slice(0, SHARED_LIM.text) }).eq('id', id)); }
export async function deleteSharedItem(id) { guard(); check(await cloud.sb.from('shared_items').delete().eq('id', id)); }
export async function clearSharedDone(listId) { guard(); check(await cloud.sb.from('shared_items').delete().eq('list_id', listId).eq('done', true)); }
export async function createSharedList(name, who) { guard(); return check(await cloud.sb.rpc('create_shared_list', { p_name: name, p_display_name: who })); }
export async function joinSharedList(code, who) {
  guard();
  const r = check(await cloud.sb.rpc('join_shared_list', { p_code: normCode(code), p_display_name: who }));
  if (!r?.ok) throw new SharedError(r?.error || 'unknown');
  return r.list_id;
}
export async function createSharedInvite(listId) { guard(); return check(await cloud.sb.rpc('create_invite', { p_list_id: listId })); }
export async function renameSharedList(id, name) { guard(); check(await cloud.sb.from('shared_lists').update({ name: String(name).trim().slice(0, SHARED_LIM.name) }).eq('id', id)); }
export async function deleteSharedList(id) { guard(); check(await cloud.sb.from('shared_lists').delete().eq('id', id)); }
export async function leaveSharedList(id) { guard(); check(await cloud.sb.rpc('leave_shared_list', { p_list_id: id })); }
export async function removeSharedMember(listId, userId) { guard(); check(await cloud.sb.rpc('remove_shared_member', { p_list_id: listId, p_user_id: userId })); }

export const normCode = c => String(c ?? '').toUpperCase().replace(/[\s-]/g, '');
export const showCode = c => { const n = normCode(c); return n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n; };
export const findShared = id => sh.lists.find(l => l.id === id) || null;
export const isSharedOwner = (l, uid = myId()) => !!l && l.owner_id === uid;
export const memberName = (listId, uid) => sh.members[listId]?.find(m => m.user_id === uid)?.display_name || null;

export function sharedExport(uid = myId()) {
  if (!uid || !sh.lists.length || sh.uid !== uid) return null;
  return sh.lists.map(l => ({ name: l.name, items: (sh.items[l.id] || []).filter(x => x.created_by === uid).map(x => ({ text: x.text, done: x.done, created_at: x.created_at })) }));
}
