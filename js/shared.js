import { NS } from './core.js?v=1.1b';
import { cloud } from './sync.js?v=1.1b';

export const SHARED_LIM = { lists: 10, members: 5, items: 500, text: 200, name: 40, who: 24, batch: 50, paste: 300, section: 24, hints: 200 };
export const SHARED_CACHE = NS + '-shared-cache', SHARED_OK = NS + '-shared-ok', SHARED_QUEUE = NS + '-shared-queue', SHARED_SEEN = NS + '-shared-seen';
export const SHARED_CACHE_MAX = 600000;
export const SHARED_POLL_MS = 30000;
export const SHARED_POLL_LIVE_MS = 120000;
export const OFFLINE_EDIT = 'Нет сети. Изменения сейчас не сохранить';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const isTime = v => typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v));
const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const newId = () => crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));

export const sh = { uid: null, lists: [], members: {}, items: {}, at: 0, offline: false, error: '', loaded: false, v2: null, v3: null, live: false, queue: [] };
const KINDS = new Set(['item', 'h1', 'h2']);
const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;

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
      .slice(0, SHARED_LIM.members).map(m => ({ user_id: m.user_id, display_name: str(m.display_name, SHARED_LIM.who), notify: m.notify === true }));
    const its = Array.isArray(raw.items?.[id]) ? raw.items[id] : [], iseen = new Set();
    out.items[id] = its.filter(x => isObj(x) && isId(x.id) && !iseen.has(x.id) && iseen.add(x.id) && str(x.text, SHARED_LIM.text)).slice(0, SHARED_LIM.items).map(x => ({
      id: x.id, text: str(x.text, SHARED_LIM.text), done: x.done === true,
      done_by: isId(x.done_by) ? x.done_by : null, done_at: isTime(x.done_at) ? x.done_at : null,
      created_by: isId(x.created_by) ? x.created_by : null, created_at: isTime(x.created_at) ? x.created_at : null,
      updated_at: isTime(x.updated_at) ? x.updated_at : null,
      assigned_to: isId(x.assigned_to) ? x.assigned_to : null, assigned_by: isId(x.assigned_by) ? x.assigned_by : null,
      section: str(x.section, SHARED_LIM.section) || null,
      kind: KINDS.has(x.kind) ? x.kind : 'item', pos: num(x.pos), indent: x.indent === 1 && (!x.kind || x.kind === 'item') ? 1 : 0,
    }));
  }
  out.at = Number.isFinite(raw.at) ? raw.at : 0;
  return out;
}

const OPS = new Set(['add', 'done', 'edit', 'del', 'assign', 'section', 'move', 'indent']);
export function normQueue(raw) {
  return (Array.isArray(raw) ? raw : []).filter(o => isObj(o) && OPS.has(o.op) && isId(o.id) && isId(o.list)).slice(0, 300).map(o => ({
    op: o.op, id: o.id, list: o.list, text: str(o.text, SHARED_LIM.text) || undefined, done: o.done === true,
    to: isId(o.to) ? o.to : null, section: str(o.section, SHARED_LIM.section) || null, at: isTime(o.at) ? o.at : new Date().toISOString(),
    kind: KINDS.has(o.kind) ? o.kind : 'item', pos: num(o.pos), indent: o.indent === 1 ? 1 : 0,
  }));
}

export function loadSharedCache(uid) {
  try {
    const raw = JSON.parse(localStorage.getItem(SHARED_CACHE));
    const q = JSON.parse(localStorage.getItem(SHARED_QUEUE) || 'null');
    sh.queue = q?.uid === uid ? normQueue(q.ops) : [];
    if (!raw || raw.uid !== uid || !uid) return false;
    Object.assign(sh, normShared(raw), { uid });
    applyQueue();
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
function saveQueue() {
  try {
    if (sh.queue.length && sh.uid) localStorage.setItem(SHARED_QUEUE, JSON.stringify({ uid: sh.uid, ops: sh.queue }));
    else localStorage.removeItem(SHARED_QUEUE);
  } catch {}
}
export function clearShared() {
  stopLive();
  Object.assign(sh, { uid: null, lists: [], members: {}, items: {}, at: 0, offline: false, error: '', loaded: false, v2: null, v3: null, queue: [] });
  try { localStorage.removeItem(SHARED_CACHE); localStorage.removeItem(SHARED_QUEUE); } catch {}
}

export const sharedReady = () => !!(cloud.sb && cloud.session?.user?.id);
export const myId = () => cloud.session?.user?.id || null;
const netError = e => !navigator.onLine || /fetch|network|load failed|timeout/i.test(String(e?.message || e || ''));

const ERRORS = {
  shared_too_many_lists: `Можно участвовать не больше чем в ${SHARED_LIM.lists} общих списках`,
  too_many_lists: `Можно участвовать не больше чем в ${SHARED_LIM.lists} общих списках`,
  shared_list_full: `В списке уже ${SHARED_LIM.members} участников`,
  full: `В списке уже ${SHARED_LIM.members} участников`,
  shared_items_full: `В списке может быть до ${SHARED_LIM.items} строк`,
  shared_bad_name: `Название — от 1 до ${SHARED_LIM.name} знаков`,
  shared_bad_display_name: `Имя — от 1 до ${SHARED_LIM.who} знаков`,
  bad_display_name: `Имя — от 1 до ${SHARED_LIM.who} знаков`,
  shared_bad_assignee: 'Назначить можно только участнику списка',
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
const noColumn = e => /column|does not exist|schema cache/i.test(String(e?.message || ''));

const ITEM_COLS = 'id, list_id, text, done, done_by, done_at, created_by, created_at, updated_at';
const ITEM_COLS2 = ITEM_COLS + ', assigned_to, assigned_by, assigned_at, section';
async function selectV(table, cols, cols2, ids, order) {
  const sb = cloud.sb;
  if (sh.v2 !== false) {
    const r = await sb.from(table).select(cols2).in('list_id', ids).order(order);
    if (!r.error) { sh.v2 = true; return r.data || []; }
    if (!noColumn(r.error)) return check(r);
    sh.v2 = false;
  }
  return check(await sb.from(table).select(cols).in('list_id', ids).order(order)) || [];
}
const ITEM_COLS3 = ITEM_COLS2 + ', kind, pos, indent';
async function selectItems(ids) {
  if (sh.v3 !== false && sh.v2 !== false) {
    const r = await cloud.sb.from('shared_items').select(ITEM_COLS3).in('list_id', ids).order('created_at');
    if (!r.error) { sh.v2 = sh.v3 = true; return r.data || []; }
    if (!noColumn(r.error)) return check(r);
    sh.v3 = false;
  }
  return selectV('shared_items', ITEM_COLS, ITEM_COLS2, ids, 'created_at');
}

let fetchGen = 0;
export async function fetchShared() {
  if (!sharedReady()) return false;
  const gen = ++fetchGen;
  const uid = myId();
  if (sh.uid !== uid) { Object.assign(sh, { lists: [], members: {}, items: {}, at: 0, loaded: false, v2: null, v3: null }); sh.uid = uid; loadSharedCache(uid); }
  if (!navigator.onLine) { sh.offline = true; return false; }
  try {
    if (sh.queue.length) await flushQueue();
    const lists = check(await cloud.sb.from('shared_lists').select('id, name, owner_id').order('created_at')) || [];
    const ids = lists.map(l => l.id), members = {}, items = {};
    if (ids.length) {
      for (const m of await selectV('shared_members', 'list_id, user_id, display_name', 'list_id, user_id, display_name, notify', ids, 'joined_at')) (members[m.list_id] ??= []).push(m);
      for (const x of await selectItems(ids)) (items[x.list_id] ??= []).push(x);
    }
    if (gen !== fetchGen) return false;
    Object.assign(sh, normShared({ lists, members, items, at: Date.now() }), { uid, offline: false, error: '', loaded: true });
    applyQueue();
    saveSharedCache();
    return true;
  } catch (e) {
    sh.offline = e?.code === 'offline' || netError(e);
    sh.error = sh.offline ? '' : e.message;
    return false;
  }
}

export const pendingIds = () => new Set(sh.queue.map(o => o.id));
function applyOp(o) {
  const list = sh.items[o.list] ||= [], i = list.findIndex(x => x.id === o.id), x = list[i];
  if (o.op === 'add') {
    if (!x) list.push({ id: o.id, text: o.text, done: o.done === true && (o.kind || 'item') === 'item', done_by: o.done ? sh.uid : null, done_at: o.done ? o.at : null, created_by: sh.uid, created_at: o.at, updated_at: o.at, assigned_to: o.to, assigned_by: o.to ? sh.uid : null, section: o.section, kind: o.kind || 'item', pos: o.pos ?? null, indent: (o.kind || 'item') === 'item' ? o.indent || 0 : 0 });
    return;
  }
  if (!x) return;
  if (o.op === 'done') Object.assign(x, { done: o.done, done_by: o.done ? sh.uid : null, done_at: o.done ? o.at : null });
  else if (o.op === 'edit') x.text = o.text;
  else if (o.op === 'del') list.splice(i, 1);
  else if (o.op === 'assign') Object.assign(x, { assigned_to: o.to, assigned_by: o.to ? sh.uid : null });
  else if (o.op === 'section') x.section = o.section;
  else if (o.op === 'move') { if (o.pos != null) x.pos = o.pos; if (x.kind === 'item' && o.indent != null) x.indent = o.indent; }
  else if (o.op === 'indent') { if (x.kind === 'item') x.indent = o.indent; }
}
function applyQueue() { for (const o of sh.queue) applyOp(o); }

function addRow(o) {
  const row = { id: o.id, list_id: o.list, text: o.text, created_by: sh.uid };
  if (sh.v2) { if (o.to) row.assigned_to = o.to; if (o.section) row.section = o.section; }
  if (sh.v3) { row.kind = o.kind || 'item'; if (o.pos != null) row.pos = o.pos; row.indent = o.indent || 0; if (o.done) row.done = true; }
  return row;
}
async function sendOp(o) {
  const t = cloud.sb.from('shared_items');
  if (o.op === 'add') {
    return check(await t.insert([addRow(o)]));
  }
  if (o.op === 'move') return sh.v3 ? check(await t.update({ pos: o.pos, indent: o.indent }).eq('id', o.id)) : null;
  if (o.op === 'indent') return sh.v3 ? check(await t.update({ indent: o.indent }).eq('id', o.id)) : null;
  if (o.op === 'done') return check(await t.update({ done: o.done }).eq('id', o.id));
  if (o.op === 'edit') return check(await t.update({ text: o.text }).eq('id', o.id));
  if (o.op === 'del') return check(await t.delete().eq('id', o.id));
  if (o.op === 'assign') return check(await t.update({ assigned_to: o.to }).eq('id', o.id));
  if (o.op === 'section') return check(await t.update({ section: o.section }).eq('id', o.id));
}

let flushing = null;
export function flushQueue() {
  if (flushing) return flushing;
  flushing = (async () => {
    let failed = 0;
    while (sh.queue.length && navigator.onLine && sharedReady()) {
      const o = sh.queue[0];
      try { await sendOp(o); }
      catch (e) { if (e?.code === 'offline') break; failed++; }
      sh.queue.shift();
      saveQueue();
    }
    return failed;
  })().finally(() => { flushing = null; });
  return flushing;
}

export async function sharedOp(o) {
  if (!sharedReady()) throw new SharedError('unknown');
  const op = { ...o, at: new Date().toISOString() };
  if (op.op === 'add') op.id ||= newId();
  if (op.text != null) op.text = String(op.text).trim().slice(0, SHARED_LIM.text);
  if (op.section != null) op.section = String(op.section).trim().slice(0, SHARED_LIM.section) || null;
  if (op.op === 'add' && (sh.items[op.list]?.length || 0) >= SHARED_LIM.items) throw new SharedError('shared_items_full');
  applyOp(op);
  if (navigator.onLine && !sh.queue.length) {
    try { await sendOp(op); saveSharedCache(); return { id: op.id, queued: false }; }
    catch (e) { if (e?.code !== 'offline') { await fetchShared(); throw e; } }
  }
  sh.queue.push(op);
  saveQueue();
  saveSharedCache();
  sh.offline = !navigator.onLine || sh.offline;
  return { id: op.id, queued: true };
}

export async function addSharedRows(listId, rows, afterId = null) {
  if (!sharedReady()) throw new SharedError('unknown');
  const list = rows.map(r => {
    const kind = KINDS.has(r.kind) ? r.kind : 'item';
    return { kind, text: String(r.text || '').trim().slice(0, SHARED_LIM.text), done: r.done === true && kind === 'item', indent: r.indent === 1 && kind === 'item' ? 1 : 0 };
  }).filter(r => r.text).slice(0, SHARED_LIM.paste);
  if (!list.length) return { n: 0, last: null };
  if ((sh.items[listId]?.length || 0) + list.length > SHARED_LIM.items) throw new SharedError('shared_items_full');
  const pos = slots(listId, afterId, list.length), at = new Date().toISOString();
  const ops = list.map((r, i) => ({ op: 'add', id: newId(), list: listId, text: r.text, kind: r.kind, done: r.done, indent: r.indent, pos: pos[i], to: null, section: null, at }));
  for (const o of ops) applyOp(o);
  const res = { n: ops.length, last: ops[ops.length - 1].id };
  if (navigator.onLine && !sh.queue.length) {
    try { check(await cloud.sb.from('shared_items').insert(ops.map(addRow))); saveSharedCache(); return res; }
    catch (e) { if (e?.code !== 'offline') { await fetchShared(); throw e; } }
  }
  sh.queue.push(...ops);
  saveQueue();
  saveSharedCache();
  sh.offline = !navigator.onLine || sh.offline;
  return res;
}
export async function addSharedItems(listId, texts, extra = {}) {
  const list = texts.map(t => String(t).trim().slice(0, SHARED_LIM.text)).filter(Boolean).slice(0, SHARED_LIM.batch);
  if ((sh.items[listId]?.length || 0) + list.length > SHARED_LIM.items) throw new SharedError('shared_items_full');
  for (const text of list) await sharedOp({ op: 'add', list: listId, text, section: extra.section || null, to: extra.to || null });
  return list.length;
}
export const setSharedDone = (listId, id, done) => sharedOp({ op: 'done', list: listId, id, done });
export const editSharedItem = (listId, id, text) => sharedOp({ op: 'edit', list: listId, id, text });
export const deleteSharedItem = (listId, id) => sharedOp({ op: 'del', list: listId, id });
export const assignSharedItem = (listId, id, to) => sharedOp({ op: 'assign', list: listId, id, to });
export const setSharedSection = (listId, id, section) => sharedOp({ op: 'section', list: listId, id, section });
export const setSharedIndent = (listId, id, indent) => sharedOp({ op: 'indent', list: listId, id, indent: indent ? 1 : 0 });
export const moveSharedItem = (listId, id, pos, indent) => sharedOp({ op: 'move', list: listId, id, pos, indent: indent == null ? (sh.items[listId] || []).find(x => x.id === id)?.indent || 0 : indent ? 1 : 0 });

export const isHead = x => x.kind === 'h1' || x.kind === 'h2';
export const ordered = listId => [...(sh.items[listId] || [])].sort((a, b) => (a.pos ?? Infinity) - (b.pos ?? Infinity) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
export function sectionEnd(listId, headId) {
  const rows = ordered(listId), i = rows.findIndex(x => x.id === headId);
  if (i < 0) return null;
  const top = rows[i].kind === 'h1';
  let j = i;
  while (j + 1 < rows.length && !(rows[j + 1].kind === 'h1' || (!top && rows[j + 1].kind === 'h2'))) j++;
  return rows[j].id;
}
export function sectionRows(listId, headId) {
  const rows = ordered(listId), i = rows.findIndex(x => x.id === headId), end = rows.findIndex(x => x.id === sectionEnd(listId, headId));
  return i < 0 ? [] : rows.slice(i + 1, end + 1).filter(x => !isHead(x));
}
export function slots(listId, afterId, n) {
  const rows = ordered(listId).filter(x => x.pos != null);
  let i = afterId ? rows.findIndex(x => x.id === afterId) : rows.length - 1;
  if (afterId && i < 0) i = rows.length - 1;
  const lo = i >= 0 ? rows[i].pos : 0, hi = i + 1 < rows.length ? rows[i + 1].pos : lo + 1024 * (n + 1);
  const step = (hi - lo) / (n + 1);
  return Array.from({ length: n }, (_, k) => lo + step * (k + 1));
}

const MARK_OPEN = /^(?:[-*•–—▪◦○◯□☐]|\[\s?\]|\d{1,3}[.)])\s*/u;
const MARK_DONE = /^(?:[✓✔☑✅☒]|\[[xхXХ]\])\s*/u;
const PICTO = /^\p{Extended_Pictographic}/u;
export function parseOutline(text) {
  const out = [];
  for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim()) continue;
    const lead = /^(\t| {2,}| {2,})/.test(raw);
    let t = raw.trim(), kind = 'item', done = false, marked = false;
    if (MARK_DONE.test(t)) { t = t.replace(MARK_DONE, ''); done = true; marked = true; }
    else if (MARK_OPEN.test(t)) { t = t.replace(MARK_OPEN, ''); marked = true; }
    t = t.trim();
    if (!t) continue;
    if (!marked && !lead) {
      const letters = t.replace(/[^\p{L}]/gu, '');
      if (/[:：]$/.test(t)) { kind = 'h2'; t = t.replace(/\s*[:：]$/, ''); }
      else if (PICTO.test(t) || (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase())) kind = 'h1';
    }
    out.push({ kind, text: t.slice(0, SHARED_LIM.text), done: kind === 'item' && done, indent: kind === 'item' && lead ? 1 : 0 });
  }
  if (out.length && !out.some(r => r.kind === 'item')) out.forEach(r => { r.kind = 'item'; });
  return out;
}
export function outlineText(listId) {
  const list = findShared(listId), lines = list ? [list.name, ''] : [];
  ordered(listId).forEach((x, i) => {
    if (x.kind === 'h1') { if (i) lines.push(''); lines.push(x.text); }
    else if (x.kind === 'h2') lines.push(x.text.replace(/[:：]$/, '') + ':');
    else lines.push(`${x.indent ? '    ' : ''}${x.done ? '✓' : '☐'} ${x.text}`);
  });
  return lines.join('\n').trim();
}
export async function setSharedNotify(listId, on) {
  guard();
  check(await cloud.sb.from('shared_members').update({ notify: !!on }).eq('list_id', listId).eq('user_id', myId()));
  const m = sh.members[listId]?.find(x => x.user_id === myId());
  if (m) m.notify = !!on;
}
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

let channel = null, liveTimer = 0;
export function startLive(onChange) {
  if (channel || !sharedReady() || typeof cloud.sb.channel !== 'function') return false;
  const known = () => new Set(Object.values(sh.items).flat().map(x => x.id));
  const fire = () => { clearTimeout(liveTimer); liveTimer = setTimeout(onChange, 250); };
  channel = cloud.sb.channel('shared-' + myId());
  for (const table of ['shared_items', 'shared_members', 'shared_lists']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, p => {
      if (p.eventType === 'DELETE' && table === 'shared_items' && !known().has(p.old?.id)) return;
      fire();
    });
  }
  channel.subscribe(status => { sh.live = status === 'SUBSCRIBED'; });
  return true;
}
export function stopLive() {
  clearTimeout(liveTimer);
  if (channel) { try { cloud.sb.removeChannel(channel); } catch {} }
  channel = null;
  sh.live = false;
}

function seenMap() { try { const v = JSON.parse(localStorage.getItem(SHARED_SEEN) || '{}'); return isObj(v) ? v : {}; } catch { return {}; } }
const stamp = x => [x.created_at, x.updated_at].filter(Boolean).sort().pop() || '';
export function markSeen(listId) {
  const m = seenMap(), last = (sh.items[listId] || []).map(stamp).sort().pop() || new Date().toISOString();
  m[listId] = last > (m[listId] || '') ? last : m[listId] || last;
  try { localStorage.setItem(SHARED_SEEN, JSON.stringify(m)); } catch {}
}
export function hasNews(listId, uid = myId()) {
  const seen = seenMap()[listId];
  if (!seen) return false;
  return (sh.items[listId] || []).some(x => stamp(x) > seen && ((x.created_by && x.created_by !== uid && x.created_at > seen) || (x.done_by && x.done_by !== uid && (x.done_at || '') > seen) || (x.assigned_to === uid && x.assigned_by !== uid)));
}
export function seedSeen() {
  const m = seenMap();
  let changed = false;
  for (const l of sh.lists) if (!m[l.id]) { m[l.id] = (sh.items[l.id] || []).map(stamp).sort().pop() || new Date().toISOString(); changed = true; }
  if (changed) try { localStorage.setItem(SHARED_SEEN, JSON.stringify(m)); } catch {}
}

const HINTS = NS + '-shared-hints';
const hintKey = t => String(t).trim().toLowerCase().replace(/ё/g, 'е');
function hintList(listId) {
  try {
    const all = JSON.parse(localStorage.getItem(HINTS) || '{}');
    return (Array.isArray(all[listId]) ? all[listId] : []).map(h => typeof h === 'string' ? { t: h, n: 1 } : isObj(h) && typeof h.t === 'string' ? { t: h.t, n: Number.isFinite(h.n) ? h.n : 1, s: typeof h.s === 'string' ? h.s : undefined } : null).filter(Boolean);
  } catch { return []; }
}
function saveHints(listId, list) {
  try { const all = JSON.parse(localStorage.getItem(HINTS) || '{}'); all[listId] = list.slice(0, SHARED_LIM.hints); localStorage.setItem(HINTS, JSON.stringify(all)); } catch {}
}
export function rememberHint(listId, text, section) {
  const key = hintKey(text), list = hintList(listId), old = list.find(h => hintKey(h.t) === key);
  const h = { t: String(text).trim(), n: (old?.n || 0) + 1 };
  const sec = section === undefined ? old?.s : section || undefined;
  if (sec) h.s = sec;
  saveHints(listId, [h, ...list.filter(x => x !== old)]);
}
export const hintCount = (listId, text) => hintList(listId).find(h => hintKey(h.t) === hintKey(text))?.n || 0;
export const lastSection = (listId, text) => hintList(listId).find(h => hintKey(h.t) === hintKey(text))?.s || null;
export function sharedHints(listId, q) {
  const f = hintKey(q);
  if (f.length < 2) return [];
  const stored = hintList(listId).map(h => h.t);
  const open = new Set((sh.items[listId] || []).filter(x => !x.done && !isHead(x)).map(x => hintKey(x.text)));
  const pool = [...stored, ...(sh.items[listId] || []).filter(x => x.done && !isHead(x)).map(x => x.text)];
  const out = [];
  for (const t of pool) {
    const k = hintKey(t);
    if (!k.startsWith(f) || k === f || open.has(k) || out.some(x => hintKey(x) === k)) continue;
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}
const QTY_UNIT = '(?:кг|г|гр|л|мл|шт|штук[аи]?|бух\\S*|голов\\S*|пач\\S*|бан\\S*|уп\\S*|бут\\S*|десят\\S*|пуч\\S*|кор\\S*|рул\\S*|пак\\S*)';
const QTY_DASH = new RegExp(`^(.+?)\\s*[—–]\\s*((?:по\\s+)?[\\d.,]+(?:\\s*[-–]\\s*[\\d.,]+)?\\s*${QTY_UNIT}?\\.?|(?:по\\s+)?[\\d.,]+.{0,12})$`, 'iu');
const QTY_HYPHEN = new RegExp(`^(.+?)\\s+-\\s+((?:по\\s+)?[\\d.,]+(?:\\s*[-–]\\s*[\\d.,]+)?\\s*${QTY_UNIT}?\\.?)$`, 'iu');
const QTY_PAREN = /^(.+?)\s*\(([^()]*\d[^()]*)\)$/u;
export function splitQty(text) {
  const t = String(text || '').trim();
  for (const re of [QTY_PAREN, QTY_DASH, QTY_HYPHEN]) {
    const m = re.exec(t);
    if (m && m[1].trim() && m[2].trim().length <= 20) return { name: m[1].trim(), qty: m[2].trim() };
  }
  return { name: t, qty: '' };
}
const SEC_ICONS = [
  [/молоч|молок|сыр|кефир|йогурт/, '🥛'], [/мяс|рыб|птиц|колбас/, '🥩'], [/круп|макарон|рис|греч/, '🌾'], [/бакал|специ|приправ|соус/, '🧂'],
  [/овощ|фрукт|зелен|ягод/, '🥬'], [/хлеб|выпеч|тест/, '🍞'], [/напит|вод|сок|чай|кофе/, '🥤'], [/сладк|конфет|десерт|шокол/, '🍫'],
  [/замороз|мороз/, '🧊'], [/быт|хими|уборк|стир/, '🧴'], [/гигиен|аптек|лекар|космет/, '💊'], [/яйц/, '🥚'], [/дет/, '🧸'], [/живот|корм|кош|собак/, '🐾'],
];
const LEAD_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;
export function sectionLook(name) {
  const t = String(name || '').trim(), m = LEAD_EMOJI.exec(t);
  if (m) return { icon: m[1], title: t.slice(m[0].length) || t };
  const k = t.toLowerCase();
  return { icon: SEC_ICONS.find(([re]) => re.test(k))?.[1] || '🛒', title: t };
}
export const findOpenDup = (listId, text) => (sh.items[listId] || []).find(x => !x.done && !isHead(x) && x.text.trim().toLowerCase().replace(/ё/g, 'е') === String(text).trim().toLowerCase().replace(/ё/g, 'е')) || null;

export const normCode = c => String(c ?? '').toUpperCase().replace(/[\s-]/g, '');
export const showCode = c => { const n = normCode(c); return n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n; };
export const inviteUrl = code => new URL('./#join=' + normCode(code), location.href.split('#')[0].split('?')[0]).href;
export const findShared = id => sh.lists.find(l => l.id === id) || null;
export const isSharedOwner = (l, uid = myId()) => !!l && l.owner_id === uid;
export const memberName = (listId, uid) => sh.members[listId]?.find(m => m.user_id === uid)?.display_name || null;
export const myNotify = listId => !!sh.members[listId]?.find(m => m.user_id === myId())?.notify;

export function sharedExport(uid = myId()) {
  if (!uid || !sh.lists.length || sh.uid !== uid) return null;
  return sh.lists.map(l => ({ name: l.name, items: (sh.items[l.id] || []).filter(x => x.created_by === uid).map(x => ({ text: x.text, kind: x.kind || 'item', done: x.done, created_at: x.created_at })) }));
}
