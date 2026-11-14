import { $, esc, getPref, NS, plural, setPref } from './core.js?v=1.1a';
import { IC } from './icons.js?v=1.1a';
import { askConfirm, closeOverlay, openMenu, openOverlay, toast } from './ui.js?v=1.1a';
import { openAccount } from './sync.js?v=1.1a';
import { userName } from './settings.js?v=1.1a';
import { openTasks, parseLines, renderTasks, taskHooks, tv } from './tasksui.js?v=1.1a';
import {
  addSharedItems, addSharedRows, assignSharedItem, clearShared, createSharedInvite, createSharedList, deleteSharedItem, deleteSharedList, editSharedItem, fetchShared,
  hintCount, isHead, lastSection, moveSharedItem, ordered, outlineText, parseOutline, sectionEnd, sectionLook, sectionRows, setSharedIndent, splitQty,
  findOpenDup, findShared, flushQueue, hasNews, inviteUrl, isSharedOwner, joinSharedList, leaveSharedList, markSeen, memberName, myId, myNotify, normCode,
  pendingIds, rememberHint, removeSharedMember, renameSharedList, seedSeen, setSharedDone, setSharedNotify, setSharedSection, sh, sharedHints,
  SHARED_LIM, SHARED_OK, SHARED_POLL_LIVE_MS, SHARED_POLL_MS, sharedReady, showCode, startLive, stopLive,
} from './shared.js?v=1.1a';

const IC_PEOPLE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 13.6A5.5 5.5 0 0 1 20.5 19"/></svg>';
const IC_CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_UP = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const IC_DN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const SW = 80, UNDO_MS = 5200, SEC_ORDER = NS + '-shared-secorder', JOIN_KEY = NS + '-shared-join';
export const CONSENT = 'Участники списка видят название списка, его пункты и Ваше имя в этом списке. Они не видят Ваши привычки, задачи и цели.';
const ui = { doneOpen: false, open: null, invite: null, timer: 0, tick: 0, edit: null, hidden: new Set(), fetching: false, toldQueue: false, join: null, kind: 'item', after: null, reorder: false, paste: null, filter: 'all' };
const v3 = () => sh.v3 === true;
const KIND_PH = { item: 'Добавить пункт', h1: 'Новая группа разделов', h2: 'Новый раздел' };
const KIND_NAME = { item: 'Пункт', h1: 'Группа', h2: 'Раздел' };
const FOLD = NS + '-shared-fold', PALETTE = ['#7c5cff', '#f08c2e', '#1fa5a0', '#e5484d', '#2f80ed'];
const IC_MORE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/></svg>';
const IC_CHEV = '<svg class="ic sh-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const IC_GRIP = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg>';
const IC_PLUS = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const IC_ALL = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5.3"/></svg>';
const IC_MOVE = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/></svg>';
const IC_X = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const fmtDay = iso => { try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); } catch { return ''; } };
const who = (listId, uid) => uid ? memberName(listId, uid) || 'бывший участник' : 'бывший участник';
const dot = '<i class="sh-dot" role="img" aria-label="Есть новое"></i>';

function sharedChips(cur) {
  if (!sharedReady() && sh.uid) clearShared();
  if (!sharedReady()) return `<button type="button" class="t-chip t-chip-shared" data-l="shared" aria-label="Общие списки">${IC_PEOPLE}<span>Общие</span></button>`;
  if (!ui.fetching && Date.now() - sh.at > 60000 && navigator.onLine) {
    ui.fetching = true;
    fetchShared().then(ok => { seedSeen(); if (ok && $('tasksOv')._shown && !tv.sel) renderTasks(); }).finally(() => { ui.fetching = false; });
  }
  return sh.lists.map(l => `<button type="button" class="t-chip t-chip-shared" data-sl="${esc(l.id)}" aria-pressed="${cur === l.id}">${IC_PEOPLE}<span>${esc(l.name)}</span>${l.id !== cur && hasNews(l.id) ? dot : ''}</button>`).join('')
    + `<button type="button" class="t-chip t-chip-shared" data-l="shared" aria-label="Общие списки…">${IC_PEOPLE}<span>${sh.lists.length ? '…' : 'Общие'}</span></button>`;
}

const grip = x => ui.reorder ? `<button type="button" class="ghost icon-btn sh-grip" data-grip aria-label="Переставить «${esc(x.text)}». Стрелки вверх и вниз двигают строку">${IC_GRIP}</button>` : '';
function avatar(listId, uid) {
  const ms = sh.members[listId] || [], i = Math.max(0, ms.findIndex(m => m.user_id === uid)), name = who(listId, uid);
  return `<span class="sh-av" style="--av:${PALETTE[i % PALETTE.length]}" title="${esc(name)}" aria-label="Назначено: ${esc(uid === myId() ? 'Вам' : name)}">${esc(([...name.trim()][0] || '?').toUpperCase())}</span>`;
}
function itemRow(listId, x, wait, notes = false, shop = false) {
  const me = myId(), meta = notes ? [] : [`<span>Добавил(а) ${esc(who(listId, x.created_by))}</span>`];
  if (x.assigned_to && !x.done && !shop) meta.unshift(`<span class="sh-to">→ ${x.assigned_to === me ? 'Вам' : esc(who(listId, x.assigned_to))}</span>`);
  if (x.done && !notes) meta.push(`<span>Отметил(а) ${esc(who(listId, x.done_by))}${x.done_at ? ', ' + esc(fmtDay(x.done_at)) : ''}</span>`);
  if (wait) meta.push('<span class="sh-wait">ждёт отправки</span>');
  return `<div class="t-row sh-row${x.done ? ' done' : ''}${wait ? ' wait' : ''}${notes ? ' sh-note-row' : ''}${x.indent ? ' sub' : ''}" data-sid="${esc(x.id)}" style="--sw:${SW}px">
    <div class="t-acts"><button type="button" data-sact="del"><i aria-hidden="true">${IC.trash.replace(' del-ic', '')}</i><span>Удалить</span></button></div>
    <div class="t-fg"><button type="button" class="t-box" role="checkbox" aria-checked="${x.done}" aria-label="${esc(x.text)}"${ui.reorder ? ' disabled' : ''}>${IC_CHECK}</button><button type="button" class="t-main sh-main">${shop ? shopText(x) : `<span class="t-text">${esc(x.text)}</span>`}${meta.length ? `<span class="t-meta sh-meta">${meta.join('')}</span>` : ''}</button>${shop && x.assigned_to && !x.done ? avatar(listId, x.assigned_to) : ''}${grip(x)}</div>
  </div>`;
}
function shopText(x) {
  const q = splitQty(x.text);
  return `<span class="sh-line"><span class="t-text">${esc(q.name)}</span>${q.qty ? `<span class="sh-qty">${esc(q.qty)}</span>` : ''}</span>`;
}
const headRow = (x, wait) => `<div class="sh-head sh-${x.kind}${wait ? ' wait' : ''}" data-sid="${esc(x.id)}" role="heading" aria-level="${x.kind === 'h1' ? 3 : 4}"><button type="button" class="sh-htext" data-sact="head" aria-haspopup="menu">${esc(x.text)}</button>${wait ? '<span class="sh-wait">ждёт отправки</span>' : ''}${grip(x)}</div>`;
function headOf(listId, id) {
  const rows = ordered(listId);
  for (let i = rows.findIndex(x => x.id === id); i >= 0; i--) if (isHead(rows[i])) return rows[i];
  return null;
}
function target(listId, text) {
  if (ui.toEnd) return { head: null, after: null, picked: true };
  if (ui.after) return { head: headOf(listId, ui.after), after: ui.after, picked: true };
  const name = text && lastSection(listId, text), key = String(name || '').toLowerCase();
  const head = key && ordered(listId).find(x => isHead(x) && x.text.toLowerCase() === key);
  return head ? { head, after: sectionEnd(listId, head.id), picked: false } : { head: null, after: null, picked: false };
}
function paintAddBar(listId) {
  const on = v3();
  $('shKinds').hidden = !on;
  if (!on) { ui.kind = 'item'; ui.after = null; }
  if (ui.after && !(sh.items[listId] || []).some(x => x.id === ui.after)) ui.after = null;
  for (const b of $('shKinds').querySelectorAll('[data-kind]')) b.setAttribute('aria-checked', b.dataset.kind === ui.kind);
  $('shText').placeholder = KIND_PH[ui.kind];
  $('shText').setAttribute('aria-label', KIND_PH[ui.kind]);
  const secs = on && ordered(listId).some(isHead), t = secs ? target(listId, $('shText').value.trim()) : null;
  $('shTarget').hidden = !secs;
  if (!secs) { $('shTarget').innerHTML = ''; return; }
  const look = t.head && sectionLook(t.head.text);
  $('shTarget').innerHTML = (t.head ? `<span>${ui.kind === 'item' ? 'Попадёт в раздел' : 'Встанет после раздела'} <b>${esc(look.icon)} ${esc(look.title)}</b></span>` : `<span>${ui.kind === 'item' ? 'Попадёт в конец списка' : 'Встанет в конец списка'}</span>`)
    + `<button type="button" class="t-link" data-target-pick aria-haspopup="menu">${t.head ? 'сменить' : 'выбрать раздел'}</button>`;
}
function pickTarget(anchor) {
  const listId = tv.shared, heads = ordered(listId).filter(isHead);
  openMenu(anchor, [
    ...heads.map(h => { const l = sectionLook(h.text); return { icon: `<span class="menu-emoji">${esc(l.icon)}</span>`, label: (h.kind === 'h1' ? '' : '  ') + l.title, run: () => { ui.toEnd = false; ui.after = sectionEnd(listId, h.id); paintAddBar(listId); $('shText').focus({ preventScroll: true }); } }; }),
    '-',
    { icon: IC_X, label: 'В конец списка', run: () => { ui.after = null; ui.toEnd = true; paintAddBar(listId); $('shText').focus({ preventScroll: true }); } },
  ]);
}

function secOrder(listId, names) {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(SEC_ORDER) || '{}')[listId] || []; } catch {}
  const known = saved.filter(n => names.includes(n));
  return [...known, ...names.filter(n => !known.includes(n)).sort((a, b) => a.localeCompare(b, 'ru'))];
}
function moveSec(listId, name, dir) {
  const names = [...new Set((sh.items[listId] || []).filter(x => !x.done && x.section).map(x => x.section))], order = secOrder(listId, names), i = order.indexOf(name), j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  try { const all = JSON.parse(localStorage.getItem(SEC_ORDER) || '{}'); all[listId] = order; localStorage.setItem(SEC_ORDER, JSON.stringify(all)); } catch {}
  renderShared(listId);
}

function freshText() {
  const q = sh.queue.length;
  if (sh.offline || !navigator.onLine) return q ? `нет сети · ждёт отправки: ${q}` : 'нет сети';
  if (q) return `отправляем: ${q}`;
  if (sh.live) return 'обновляется сразу';
  if (!sh.at) return '';
  const s = Math.round((Date.now() - sh.at) / 1000);
  if (s < 60) return 'обновлено только что';
  const m = Math.round(s / 60);
  return m < 60 ? `обновлено ${m} мин назад` : 'обновлено давно';
}
const paintFresh = () => { $('shFresh').textContent = freshText(); };

export function renderShared(id) {
  const l = findShared(id);
  if (!l) { tv.shared = null; return renderTasks(); }
  $('shBanner').hidden = !sh.offline;
  $('shTitle').textContent = l.name;
  paintFresh();
  markSeen(id);
  paintAddBar(id);
  $('shReorderDone').hidden = !ui.reorder;
  if (v3()) return ui.reorder ? renderNotes(id) : renderShop(id);
  const wait = pendingIds(), items = (sh.items[id] || []).filter(x => !ui.hidden.has(x.id)), open = items.filter(x => !x.done), done = items.filter(x => x.done);
  const rows = list => `<div class="card t-list">${list.map(x => itemRow(id, x, wait.has(x.id))).join('')}</div>`;
  const plain = open.filter(x => !x.section), secs = secOrder(id, [...new Set(open.filter(x => x.section).map(x => x.section))]);
  const body = open.length ? (plain.length ? rows(plain) : '') + secs.map((s, i) => {
    const list = open.filter(x => x.section === s);
    const move = secs.length > 1 ? `<button type="button" class="ghost icon-btn sh-secmove" data-sact="secup" aria-label="Раздел «${esc(s)}» выше"${i ? '' : ' disabled'}>${IC_UP}</button><button type="button" class="ghost icon-btn sh-secmove" data-sact="secdown" aria-label="Раздел «${esc(s)}» ниже"${i < secs.length - 1 ? '' : ' disabled'}>${IC_DN}</button>` : '';
    return `<section class="t-group sh-sec" data-sec="${esc(s)}"><h3 class="sec-h"><span>${esc(s)}</span><span class="cnt">${list.length}</span>${move}</h3>${rows(list)}</section>`;
  }).join('') : `<p class="t-snone">${items.length ? 'Всё отмечено' : 'Пока пусто. Добавьте первый пункт'}</p>`;
  const head = done.length ? `<section class="t-group${ui.doneOpen ? ' open' : ''}"><div class="sh-done-bar"><button type="button" class="t-done-head" data-sact="done-toggle" aria-expanded="${ui.doneOpen}"><span>Выполнено</span><span class="cnt">${done.length}</span><svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>${ui.doneOpen ? '<button type="button" class="t-link" data-sact="clear">Очистить выполненные</button>' : ''}</div>${ui.doneOpen ? rows(done) : ''}</section>` : '';
  $('shItems').innerHTML = body + head;
}
function foldMap(listId) { try { const v = JSON.parse(localStorage.getItem(FOLD) || '{}')[listId]; return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
function setFold(listId, key, v) { try { const all = JSON.parse(localStorage.getItem(FOLD) || '{}'); (all[listId] ||= {})[key] = v; localStorage.setItem(FOLD, JSON.stringify(all)); } catch {} }
function agoText(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!(m >= 0)) return '';
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} ч назад` : h < 48 ? 'вчера' : fmtDay(iso);
}
function lastAction(listId) {
  const me = myId(), ev = [];
  for (const x of sh.items[listId] || []) {
    if (isHead(x)) continue;
    if (x.created_by && x.created_by !== me && x.created_at) ev.push([x.created_at, `${who(listId, x.created_by)} добавил(а) «${splitQty(x.text).name}»`]);
    if (x.done && x.done_by && x.done_by !== me && x.done_at) ev.push([x.done_at, `${who(listId, x.done_by)} отметил(а) «${splitQty(x.text).name}»`]);
  }
  ev.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  if (ev.length) return `${ev[0][1]} · ${agoText(ev[0][0])}`;
  const others = (sh.members[listId] || []).filter(m => m.user_id !== me).map(m => m.display_name);
  return others.length ? `Вместе с: ${others.join(', ')}` : 'Пригласите участников в карточке списка';
}
function shopGroups(rows) {
  const out = [];
  let cur = null;
  for (const x of rows) {
    if (x.kind === 'h1') { out.push({ label: x }); cur = null; continue; }
    if (x.kind === 'h2') { cur = { head: x, key: x.id, blocks: [] }; out.push(cur); continue; }
    if (!cur) { cur = { head: null, key: 'none-' + out.length, blocks: [] }; out.push(cur); }
    if (x.indent && cur.blocks.length) cur.blocks[cur.blocks.length - 1].subs.push(x); else cur.blocks.push({ item: x, subs: [] });
  }
  return out;
}
function renderShop(id) {
  const me = myId(), wait = pendingIds(), rows = ordered(id).filter(x => !ui.hidden.has(x.id)), items = rows.filter(x => !isHead(x));
  const total = items.length, doneN = items.filter(x => x.done).length, mine = items.filter(x => !x.done && x.assigned_to === me).length, f = ui.filter;
  if (!rows.length) { $('shItems').innerHTML = '<p class="t-snone">Пока пусто. Добавьте первый пункт или вставьте готовый список</p>'; return; }
  const pct = total ? Math.round(doneN / total * 100) : 0;
  const hero = `<div class="card sh-hero"><div class="sh-ring" style="--p:${pct}"><b>${doneN}</b></div><div class="sh-hero-t"><b>${!total ? 'Пунктов пока нет' : doneN === total ? 'Всё куплено' : `Осталось ${total - doneN} из ${total}`}</b><small>${esc(lastAction(id))}</small></div></div>`;
  const tabs = `<div class="seg sh-filter" role="group" aria-label="Что показывать">${[['all', 'Все'], ['me', mine ? `Мне · ${mine}` : 'Мне'], ['left', 'Осталось']].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>`;
  const fm = foldMap(id), keep = b => f === 'all' || (f === 'left' ? !b.item.done || b.subs.some(s => !s.done) : (!b.item.done && b.item.assigned_to === me) || b.subs.some(s => !s.done && s.assigned_to === me));
  const subsOf = b => f === 'left' ? b.subs.filter(s => !s.done) : f === 'me' ? b.subs.filter(s => !s.done && (b.item.assigned_to === me || s.assigned_to === me)) : b.subs;
  let body = '', shown = 0, label = '';
  for (const g of shopGroups(rows)) {
    if (g.label) { label = `<h3 class="sh-group" data-sid="${esc(g.label.id)}"><button type="button" class="sh-htext" data-sact="head" aria-haspopup="menu">${esc(g.label.text)}</button>${wait.has(g.label.id) ? '<span class="sh-wait">ждёт отправки</span>' : ''}</h3>`; if (f === 'all' || ui.reorder) { body += label; label = ''; } continue; }
    const all = g.blocks.flatMap(b => [b.item, ...b.subs]), n = all.length, d = all.filter(x => x.done).length, full = n > 0 && d === n;
    const blocks = g.blocks.filter(keep).sort((a, b) => (a.item.done ? 1 : 0) - (b.item.done ? 1 : 0));
    if (f !== 'all' && !blocks.length) continue;
    if (!g.head && !n) continue;
    shown++;
    body += label; label = '';
    const closed = fm[g.key] === 1 || (fm[g.key] !== 0 && full && f === 'all');
    const look = g.head ? sectionLook(g.head.text) : { icon: '📝', title: 'Без раздела' };
    const count = full ? '<span class="sh-sec-n ok">всё куплено ✓</span>' : `<span class="sh-sec-n">${d} из ${n}</span>`;
    body += `<section class="card sh-card${closed ? ' closed' : ''}${g.head && wait.has(g.head.id) ? ' wait' : ''}"${g.head ? ` data-sid="${esc(g.head.id)}"` : ''}>
      <div class="sh-card-h"><button type="button" class="sh-fold" data-sact="fold" data-key="${esc(g.key)}" aria-expanded="${!closed}"><span class="sh-sec-ic" aria-hidden="true">${esc(look.icon)}</span><span class="sh-sec-t">${esc(look.title)}</span>${count}${IC_CHEV}</button>${g.head ? `<button type="button" class="ghost icon-btn sh-sec-more" data-sact="head" aria-haspopup="menu" aria-label="Раздел «${esc(look.title)}»: действия">${IC_MORE}</button>` : ''}</div>
      ${closed ? '' : `${n ? `<div class="sh-bar" aria-hidden="true"><i style="width:${Math.round(d / n * 100)}%"></i></div>` : ''}<div class="t-list sh-card-list">${blocks.map(b => itemRow(id, b.item, wait.has(b.item.id), true, true) + subsOf(b).map(s => itemRow(id, s, wait.has(s.id), true, true)).join('')).join('') || '<p class="sh-sec-empty">Пусто. Нажмите «⋯» → «Добавить пункт сюда»</p>'}</div>`}
    </section>`;
  }
  if (!shown && f !== 'all') body += `<p class="t-snone">${f === 'me' ? 'Вам ничего не назначено' : 'Всё куплено'}</p>`;
  const foot = f === 'all' && doneN ? `<div class="sh-foot"><button type="button" class="t-link" data-sact="clear">Очистить купленные (${doneN})</button></div>` : '';
  $('shItems').innerHTML = hero + tabs + body + foot;
}
function renderNotes(id) {
  const wait = pendingIds(), rows = ordered(id).filter(x => !ui.hidden.has(x.id));
  $('shItems').innerHTML = rows.length ? `<div class="card t-list sh-paper${ui.reorder ? ' reorder' : ''}">${rows.map(x => isHead(x) ? headRow(x, wait.has(x.id)) : itemRow(id, x, wait.has(x.id), true)).join('')}</div>` : '<p class="t-snone">Пока пусто</p>';
}

function schedule() {
  clearInterval(ui.timer);
  ui.timer = setInterval(() => { if (!tv.shared || !$('tasksOv')._shown) return stopPoll(); refresh(); }, sh.live ? SHARED_POLL_LIVE_MS : SHARED_POLL_MS);
  clearInterval(ui.tick);
  ui.tick = setInterval(paintFresh, 15000);
}
function startPoll() {
  startLive(() => { if (tv.shared && $('tasksOv')._shown) refresh(); });
  schedule();
}
function stopPoll() { clearInterval(ui.timer); clearInterval(ui.tick); ui.timer = ui.tick = 0; stopLive(); }
export async function refresh() {
  const failed = sh.queue.length && navigator.onLine ? await flushQueue() : 0;
  await fetchShared();
  seedSeen();
  if (failed) toast(`Не удалось отправить: ${failed}. Список обновлён с сервера`);
  if ($('tasksOv')._shown && !tv.sel) renderTasks();
  if ($('shOv')._shown) paintManage();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('tasksOv')._shown && sharedReady()) refresh(); });
addEventListener('online', () => { if (sharedReady() && (sh.queue.length || $('tasksOv')._shown)) refresh(); });
addEventListener('offline', () => { sh.offline = true; if (tv.shared && $('tasksOv')._shown) renderTasks(); });

async function run(fn, okText) {
  try {
    const r = await fn();
    await refresh();
    if (okText) toast(okText);
    return r ?? true;
  } catch (e) {
    toast(e.message || 'Не получилось. Попробуйте ещё раз');
    if (e.code === 'offline') { sh.offline = true; if (tv.shared) renderTasks(); }
    return null;
  }
}
async function act(fn, okText) {
  try {
    const q0 = sh.queue.length, r = await fn();
    if (tv.shared) renderTasks();
    if (sh.queue.length > q0 && !ui.toldQueue) { ui.toldQueue = true; toast('Нет сети. Изменения отправятся, когда связь вернётся'); }
    else if (okText) toast(okText);
    return r ?? true;
  } catch (e) {
    toast(e.message || 'Не получилось. Попробуйте ещё раз');
    if (tv.shared) renderTasks();
    return null;
  }
}

function deleteLater(listId, ids, text) {
  for (const id of ids) ui.hidden.add(id);
  renderShared(listId);
  let undone = false;
  toast(text, () => { undone = true; for (const id of ids) ui.hidden.delete(id); if (tv.shared === listId) renderShared(listId); });
  setTimeout(async () => {
    if (undone) return;
    for (const id of ids) {
      try { await deleteSharedItem(listId, id); } catch (e) { toast(e.message || 'Не получилось удалить'); }
      ui.hidden.delete(id);
    }
    if (tv.shared === listId && $('tasksOv')._shown) renderTasks();
  }, UNDO_MS);
}

function flash(id) {
  const r = $('shItems').querySelector(`.sh-row[data-sid="${id}"]`);
  if (!r) return;
  r.scrollIntoView({ block: 'center', behavior: 'smooth' });
  r.classList.remove('sh-flash');
  void r.offsetWidth;
  r.classList.add('sh-flash');
}
async function addText(v) {
  const listId = tv.shared, kind = v3() ? ui.kind : 'item';
  if (kind === 'item') {
    const dup = findOpenDup(listId, v);
    if (dup) { toast('Уже есть в списке'); flash(dup.id); return false; }
  }
  if (!v3()) {
    const ok = await act(() => addSharedItems(listId, [v]));
    if (ok) rememberHint(listId, v);
    return !!ok;
  }
  const t = kind === 'item' ? target(listId, v) : { after: ui.after, picked: !!ui.after };
  const r = await act(() => addSharedRows(listId, [{ kind, text: v }], t.after));
  if (!r) return false;
  if (kind === 'item') { const h = headOf(listId, r.last); rememberHint(listId, v, h ? h.text : ''); }
  if (t.picked && t.after) ui.after = r.last;
  if (kind !== 'item') { ui.kind = 'item'; ui.after = r.last; }
  paintAddBar(listId);
  return true;
}
$('shKinds').onclick = e => {
  const b = e.target.closest('[data-kind]');
  if (!b || !tv.shared) return;
  ui.kind = b.dataset.kind;
  paintAddBar(tv.shared);
  $('shText').focus({ preventScroll: true });
};
$('shTarget').onclick = e => {
  const b = e.target.closest('[data-target-pick]');
  if (b && tv.shared) pickTarget(b);
};
function paintHints() {
  const box = $('shHints'), list = tv.shared ? sharedHints(tv.shared, $('shText').value) : [];
  box.hidden = !list.length;
  box.innerHTML = list.map(t => { const n = hintCount(tv.shared, t); return `<button type="button" class="t-chip" data-hint="${esc(t)}">${esc(t)}${n > 1 ? ` <em>брали ${n} ${plural(n, 'раз', 'раза', 'раз')}</em>` : ''}</button>`; }).join('');
}
$('shText').addEventListener('input', () => { paintHints(); if (tv.shared && v3()) paintAddBar(tv.shared); });
$('shHints').addEventListener('pointerdown', e => { if (e.target.closest('[data-hint]')) e.preventDefault(); });
$('shHints').onclick = async e => {
  const b = e.target.closest('[data-hint]');
  if (!b || !tv.shared) return;
  if (await addText(b.dataset.hint)) { $('shText').value = ''; paintHints(); $('shText').focus({ preventScroll: true }); }
};
$('shAdd').onsubmit = async e => {
  e.preventDefault();
  const v = $('shText').value.trim();
  if (!v || !tv.shared) return;
  if (await addText(v)) { $('shText').value = ''; paintHints(); $('shText').focus({ preventScroll: true }); }
};
$('shText').addEventListener('paste', async e => {
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!/[\r\n]/.test(text)) return;
  e.preventDefault();
  if (v3()) return pasteOutline(text);
  const lines = parseLines(text).map(x => x.text.slice(0, SHARED_LIM.text));
  if (!lines.length || !tv.shared) return;
  if (lines.length === 1) { $('shText').value = lines[0]; return; }
  const room = Math.max(0, SHARED_LIM.items - (sh.items[tv.shared]?.length || 0)), n = Math.min(lines.length, SHARED_LIM.batch, room);
  if (!n) return toast(`В списке может быть до ${SHARED_LIM.items} строк`);
  const preview = lines.slice(0, Math.min(n, 5)).map(x => `• ${x}`);
  if (n > 5) preview.push(`и ещё ${n - 5}`);
  if (n < lines.length) preview.push(`Сразу можно добавить ${n} из ${lines.length}.`);
  if (!(await askConfirm(`Добавить ${n} ${plural(n, 'пункт', 'пункта', 'пунктов')}?`, preview.join('\n'), 'Добавить'))) return;
  const listId = tv.shared, done = await act(() => addSharedItems(listId, lines.slice(0, n)));
  if (done) { lines.slice(0, n).forEach(t => rememberHint(listId, t)); toast(`Добавлено ${done} ${plural(done, 'пункт', 'пункта', 'пунктов')}`); }
});
const countText = rows => {
  const n = k => rows.filter(r => r.kind === k).length, d = rows.filter(r => r.done).length, out = [];
  if (n('h1')) out.push(`${n('h1')} ${plural(n('h1'), 'группа', 'группы', 'групп')}`);
  if (n('h2')) out.push(`${n('h2')} ${plural(n('h2'), 'раздел', 'раздела', 'разделов')}`);
  if (n('item')) out.push(`${n('item')} ${plural(n('item'), 'пункт', 'пункта', 'пунктов')}`);
  if (d) out.push(`${d} ${plural(d, 'отмечен', 'отмечены', 'отмечены')}`);
  return out;
};
function pasteOutline(text) {
  const listId = tv.shared, rows = parseOutline(text);
  if (!rows.length || !listId) return;
  if (rows.length === 1 && rows[0].kind === 'item') { $('shText').value = rows[0].text; return; }
  const room = Math.max(0, SHARED_LIM.items - (sh.items[listId]?.length || 0)), n = Math.min(rows.length, SHARED_LIM.paste, room);
  if (!n) return toast(`В списке может быть до ${SHARED_LIM.items} строк`);
  ui.paste = { listId, rows: rows.slice(0, n), cut: rows.length - n };
  const l = findShared(listId), shown = ui.paste.rows.slice(0, 14);
  $('shPasteTitle').textContent = `Добавить в «${l?.name || 'список'}»`;
  $('shPasteSum').innerHTML = countText(ui.paste.rows).map(t => `<span>${esc(t)}</span>`).join('');
  $('shPasteCut').hidden = !ui.paste.cut;
  $('shPasteCut').textContent = ui.paste.cut ? `Поместится ${n} из ${rows.length} строк: в списке может быть до ${SHARED_LIM.items}.` : '';
  $('shPastePrev').innerHTML = shown.map(r => r.kind === 'item'
    ? `<div class="sh-pv${r.done ? ' done' : ''}${r.indent ? ' sub' : ''}"><span class="sh-pv-box" aria-hidden="true">${r.done ? IC_CHECK : ''}</span><span>${esc(r.text)}</span></div>`
    : `<div class="sh-head sh-${r.kind}"><span class="sh-htext">${esc(r.text)}</span></div>`).join('')
    + (n > shown.length ? `<p class="sh-pv-more">и ещё ${n - shown.length} ${plural(n - shown.length, 'строка', 'строки', 'строк')}</p>` : '');
  openOverlay($('shPasteOv'));
}
$('shPasteOk').onclick = async () => {
  const p = ui.paste;
  if (!p) return;
  ui.paste = null;
  closeOverlay($('shPasteOv'));
  const r = await act(() => addSharedRows(p.listId, p.rows, tv.shared === p.listId ? ui.after : null));
  if (!r) return;
  p.rows.filter(x => x.kind === 'item').forEach(x => rememberHint(p.listId, x.text));
  if (ui.after) ui.after = r.last;
  if (tv.shared === p.listId) renderShared(p.listId);
  if (sh.queue.length === 0) toast(`Добавлено ${r.n} ${plural(r.n, 'строка', 'строки', 'строк')}`);
};

let swipe = null, openRow = null;
const closeRow = () => { if (openRow) { openRow.classList.remove('open'); openRow = null; } };
const box = () => $('shItems');
$('shItems').addEventListener('pointerdown', e => {
  const fg = e.target.closest('.t-fg');
  if (!fg || e.button !== 0 || ui.reorder || e.target.closest('.t-box')) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, fg, row: fg.parentElement, base: fg.parentElement.classList.contains('open') ? -SW : 0, dx: 0, drag: false };
});
$('shItems').addEventListener('pointermove', e => {
  const s = swipe;
  if (!s || e.pointerId !== s.id) return;
  const mx = e.clientX - s.x, my = e.clientY - s.y;
  if (!s.drag) {
    if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) { if (Math.abs(my) > 12) swipe = null; return; }
    s.drag = true;
    s.fg.classList.add('dragging');
    s.row.classList.add('swiping');
    try { s.fg.setPointerCapture(e.pointerId); } catch {}
    if (openRow && openRow !== s.row) closeRow();
  }
  s.dx = Math.max(-SW, Math.min(0, s.base + mx));
  s.fg.style.transform = `translateX(${s.dx}px)`;
});
const endSwipe = e => {
  const s = swipe;
  if (!s || e.pointerId !== s.id) return;
  swipe = null;
  if (!s.drag) return;
  s.fg.classList.remove('dragging');
  s.fg.style.transform = '';
  const open = e.type === 'pointerup' && s.dx < -SW / 2;
  s.row.classList.toggle('open', open);
  setTimeout(() => { if (!s.row.classList.contains('open')) s.row.classList.remove('swiping'); }, 320);
  openRow = open ? s.row : null;
  box()._swiped = true;
  setTimeout(() => { box()._swiped = false; }, 50);
};
$('shItems').addEventListener('pointerup', endSwipe);
$('shItems').addEventListener('pointercancel', endSwipe);
$('shItems').addEventListener('click', async e => {
  if (box()._swiped || !tv.shared) return;
  const listId = tv.shared, a = e.target.closest('[data-sact]'), row = e.target.closest('.sh-row'), item = row && (sh.items[listId] || []).find(x => x.id === row.dataset.sid);
  if (a?.dataset.sact === 'done-toggle') { ui.doneOpen = !ui.doneOpen; return renderShared(listId); }
  const fb = e.target.closest('[data-filter]');
  if (fb) { ui.filter = fb.dataset.filter; return renderShared(listId); }
  if (a?.dataset.sact === 'fold') { setFold(listId, a.dataset.key, a.getAttribute('aria-expanded') === 'true' ? 1 : 0); return renderShared(listId); }
  if (a?.dataset.sact === 'secup' || a?.dataset.sact === 'secdown') return moveSec(listId, a.closest('.sh-sec').dataset.sec, a.dataset.sact === 'secup' ? -1 : 1);
  if (a?.dataset.sact === 'clear') {
    const ids = (sh.items[listId] || []).filter(x => x.done && !isHead(x) && !ui.hidden.has(x.id)).map(x => x.id), n = ids.length;
    if (await askConfirm(v3() ? 'Очистить купленные?' : 'Очистить выполненные?', `${n} ${plural(n, 'пункт будет удалён', 'пункта будут удалены', 'пунктов будут удалены')} для всех участников.`, 'Удалить')) deleteLater(listId, ids, `Удалено: ${n}`);
    return;
  }
  if (a?.dataset.sact === 'head' && !ui.reorder) return headMenu(listId, a);
  if (!item || ui.reorder) return;
  if (row.classList.contains('open') && !e.target.closest('.t-acts')) return closeRow();
  if (a?.dataset.sact === 'del') { closeRow(); return deleteLater(listId, [item.id], 'Пункт удалён'); }
  if (e.target.closest('.t-box')) return act(() => setSharedDone(listId, item.id, !item.done));
  if (e.target.closest('.sh-main')) openEdit(item);
});

{
  const area = $('tShared'), pull = $('shPull');
  let p = null;
  const reset = () => { p = null; pull.style.height = ''; pull.textContent = ''; pull.classList.remove('ready'); };
  area.addEventListener('touchstart', e => { if ($('tSheet').scrollTop <= 0 && tv.shared && !e.target.closest('input, .sh-row.open, .sh-row.swiping')) p = { y: e.touches[0].clientY }; }, { passive: true });
  area.addEventListener('touchmove', e => {
    if (!p) return;
    const d = e.touches[0].clientY - p.y;
    if (d <= 0) { pull.style.height = ''; return; }
    const h = Math.min(64, d * 0.5);
    pull.style.height = h + 'px';
    pull.classList.toggle('ready', h >= 48);
    pull.textContent = h >= 48 ? 'Отпустите, чтобы обновить' : 'Потяните, чтобы обновить';
  }, { passive: true });
  area.addEventListener('touchend', async () => {
    if (!p) return;
    const go = pull.classList.contains('ready');
    reset();
    if (!go) return;
    pull.textContent = 'Обновляем…';
    pull.style.height = '36px';
    await refresh();
    reset();
  });
  area.addEventListener('touchcancel', reset);
}

function headMenu(listId, anchor) {
  const id = anchor.closest('[data-sid]')?.dataset.sid, x = (sh.items[listId] || []).find(r => r.id === id);
  if (!x) return;
  const rs = sectionRows(listId, x.id), open = rs.filter(r => !r.done);
  openMenu(anchor, [
    { icon: IC_PLUS, label: 'Добавить пункт сюда', run: () => { ui.toEnd = false; ui.after = sectionEnd(listId, x.id); ui.kind = 'item'; paintAddBar(listId); $('shText').focus({ preventScroll: true }); $('shText').scrollIntoView({ block: 'center', behavior: 'smooth' }); } },
    { icon: IC_ALL, label: open.length || !rs.length ? 'Отметить все в разделе' : 'Снять отметки в разделе', disabled: !rs.length, run: () => act(async () => { for (const r of (open.length ? open : rs)) await setSharedDone(listId, r.id, !!open.length); }) },
    { icon: IC.edit, label: 'Переименовать', run: () => openEdit(x) },
    { icon: IC_MOVE, label: 'Переставить строки', run: () => { ui.reorder = true; closeRow(); renderShared(listId); } },
    '-',
    { icon: IC.trash, label: x.kind === 'h1' ? 'Удалить группу' : 'Удалить раздел', danger: true, run: () => deleteLater(listId, [x.id], x.kind === 'h1' ? 'Группа удалена' : 'Раздел удалён') },
    ...(rs.length ? [{ icon: IC.trash, label: `Удалить вместе с пунктами (${rs.length})`, danger: true, run: async () => {
      if (await askConfirm(x.kind === 'h1' ? 'Удалить группу?' : 'Удалить раздел?', `«${x.text}» и ${rs.length} ${plural(rs.length, 'пункт', 'пункта', 'пунктов')} в нём будут удалены для всех участников.`, 'Удалить')) deleteLater(listId, [x.id, ...rs.map(r => r.id)], `Удалено: ${rs.length + 1}`);
    } }] : []),
  ]);
}
$('shReorderDone').onclick = () => { ui.reorder = false; if (tv.shared) renderShared(tv.shared); };
function dropAt(listId, id, toIndex, indent) {
  const rows = ordered(listId).filter(x => !ui.hidden.has(x.id)), me = rows.find(x => x.id === id);
  if (!me) return;
  const rest = rows.filter(x => x.id !== id), prev = rest[toIndex - 1], next = rest[toIndex];
  const lo = prev?.pos ?? (next?.pos != null ? next.pos - 2048 : 0), hi = next?.pos ?? lo + 2048;
  const pos = (lo + hi) / 2, sub = me.kind === 'item' ? indent : 0;
  if (pos === me.pos && sub === me.indent) return renderShared(listId);
  act(() => moveSharedItem(listId, id, pos, sub));
}
{
  const area = $('shItems');
  let d = null;
  area.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-grip]');
    if (!g || !ui.reorder || e.button !== 0) return;
    e.preventDefault();
    const row = g.closest('[data-sid]'), rows = [...area.querySelectorAll('.sh-paper > [data-sid]')];
    const tops = rows.map(r => r.offsetTop + r.offsetHeight / 2), from = rows.indexOf(row), item = (sh.items[tv.shared] || []).find(x => x.id === row.dataset.sid);
    d = { id: e.pointerId, row, rows, tops, from, to: from, x0: e.clientX, y0: e.clientY, h: row.offsetHeight, indent: item?.indent || 0, base: item?.indent || 0, item: item?.kind === 'item' };
    try { g.setPointerCapture(e.pointerId); } catch {}
    row.classList.add('dragging');
  });
  area.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0, dx = e.clientX - d.x0, mid = d.tops[d.from] + dy;
    let to = d.from;
    while (to < d.rows.length - 1 && mid > d.tops[to + 1]) to++;
    while (to > 0 && mid < d.tops[to - 1]) to--;
    d.to = to;
    if (d.item) { d.indent = dx > 32 ? 1 : dx < -32 ? 0 : d.base; d.row.classList.toggle('sub', !!d.indent); }
    d.row.style.transform = `translateY(${dy}px)`;
    d.rows.forEach((r, i) => {
      if (r === d.row) return;
      const s = d.from < to && i > d.from && i <= to ? -d.h : d.from > to && i < d.from && i >= to ? d.h : 0;
      r.style.transform = s ? `translateY(${s}px)` : '';
    });
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const { row, rows, from, to, indent } = d;
    d = null;
    for (const r of rows) r.style.transform = '';
    row.classList.remove('dragging');
    if (tv.shared) dropAt(tv.shared, row.dataset.sid, to, indent);
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
  area.addEventListener('keydown', e => {
    const g = e.target.closest('[data-grip]');
    if (!g || !ui.reorder || !tv.shared || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const listId = tv.shared, id = g.closest('[data-sid]').dataset.sid, rows = ordered(listId).filter(x => !ui.hidden.has(x.id)), i = rows.findIndex(x => x.id === id), x = rows[i];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (x.kind === 'item') act(() => setSharedIndent(listId, id, e.key === 'ArrowRight')); }
    else { const to = i + (e.key === 'ArrowUp' ? -1 : 1); if (to < 0 || to >= rows.length) return; dropAt(listId, id, to, x.indent); }
    setTimeout(() => area.querySelector(`[data-sid="${CSS.escape(id)}"] [data-grip]`)?.focus(), 30);
  });
}
function openEdit(item, kind = 'item') {
  ui.edit = { kind, id: item.id, sub: !!item.indent };
  const head = kind === 'item' && isHead(item), listId = tv.shared;
  $('shEditTitle').textContent = kind === 'list' ? 'Название списка' : KIND_NAME[item.kind || 'item'];
  $('shEditText').maxLength = kind === 'list' ? SHARED_LIM.name : SHARED_LIM.text;
  $('shEditText').value = kind === 'list' ? item.name : item.text;
  const ex = kind === 'item' && sh.v2 === true && !head;
  $('shEditEx').hidden = !ex;
  $('shEditSecBox').hidden = v3();
  $('shEditSubRow').hidden = !(kind === 'item' && v3() && !head);
  $('shEditSub').setAttribute('aria-checked', ui.edit.sub);
  const info = kind === 'item' && v3() ? [`Добавил(а) ${who(listId, item.created_by)}`, item.done ? `отметил(а) ${who(listId, item.done_by)}${item.done_at ? ', ' + fmtDay(item.done_at) : ''}` : ''].filter(Boolean).join(' · ') : '';
  $('shEditInfo').hidden = !info;
  $('shEditInfo').textContent = info;
  if (ex) {
    const me = myId();
    $('shSecList').innerHTML = [...new Set((sh.items[listId] || []).map(x => x.section).filter(Boolean))].map(s => `<option value="${esc(s)}"></option>`).join('');
    $('shEditSec').value = item.section || '';
    $('shEditWho').innerHTML = '<option value="">Никому</option>' + (sh.members[listId] || []).map(m => `<option value="${esc(m.user_id)}">${esc(m.user_id === me ? `${m.display_name} (Вы)` : m.display_name)}</option>`).join('');
    $('shEditWho').value = item.assigned_to || '';
  }
  openOverlay($('shEditOv'));
  setTimeout(() => $('shEditText').focus({ preventScroll: true }), 60);
}
$('shEditSub').onclick = () => { if (!ui.edit) return; ui.edit.sub = !ui.edit.sub; $('shEditSub').setAttribute('aria-checked', ui.edit.sub); };
$('shEditForm').onsubmit = async e => {
  e.preventDefault();
  const v = $('shEditText').value.trim(), { kind, id } = ui.edit || {};
  if (!v) return toast(kind === 'list' ? 'Введите название списка' : 'Введите текст');
  closeOverlay($('shEditOv'));
  if (kind === 'list') return findShared(id) && run(() => renameSharedList(id, v), 'Список переименован');
  const listId = tv.shared, item = (sh.items[listId] || []).find(x => x.id === id);
  if (!item) return;
  if (v !== item.text) await act(() => editSharedItem(listId, id, v));
  if (!$('shEditSubRow').hidden && ui.edit.sub !== !!item.indent) await act(() => setSharedIndent(listId, id, ui.edit.sub));
  if ($('shEditEx').hidden) return;
  const sec = $('shEditSec').value.trim().slice(0, SHARED_LIM.section) || null, to = $('shEditWho').value || null;
  if (!v3() && sec !== (item.section || null)) await act(() => setSharedSection(listId, id, sec));
  if (to !== (item.assigned_to || null)) await act(() => assignSharedItem(listId, id, to));
};

async function consent() {
  if (getPref(SHARED_OK, '') === '1') return true;
  const yes = await askConfirm('Общие списки', CONSENT, 'Понятно');
  if (yes) setPref(SHARED_OK, '1');
  return !!yes;
}

function paintManage() {
  const body = $('shBody');
  if (!sharedReady()) {
    body.innerHTML = `<p class="sh-note">${ui.join ? 'Чтобы вступить в список по приглашению, войдите в аккаунт.' : 'Войдите в аккаунт, чтобы вести общие списки.'}</p><button type="button" class="primary sh-wide" data-m="login">Войти</button>`;
    return;
  }
  const me = myId(), lists = sh.lists;
  const rows = lists.map(l => {
    const own = isSharedOwner(l, me), ms = sh.members[l.id] || [], opened = ui.open === l.id;
    const members = ms.map(m => `<li><span>${esc(m.display_name)}${(t => t ? ` <small>${t}</small>` : '')([m.user_id === l.owner_id ? 'владелец' : '', m.user_id === me ? 'это Вы' : ''].filter(Boolean).join(' · '))}</span>${own && m.user_id !== me ? `<button type="button" class="t-link" data-m="remove" data-u="${esc(m.user_id)}" aria-label="Убрать участника ${esc(m.display_name)}">Убрать</button>` : ''}</li>`).join('');
    const inv = own && ui.invite?.list === l.id ? `<div class="sh-invite"><b class="sh-code">${esc(showCode(ui.invite.code))}</b><small>Действует 48 часов, один раз. По ссылке вступить ещё проще</small><div class="sh-actions"><button type="button" data-m="copylink">Скопировать ссылку</button><button type="button" data-m="copy">Скопировать код</button>${navigator.share ? '<button type="button" data-m="share">Поделиться</button>' : ''}</div></div>` : '';
    const notify = (sh.v2 === true ? `<div class="set-row static sh-notify"><span class="set-txt"><b id="shN-${esc(l.id)}">Сообщать о новых пунктах</b><small>Одним уведомлением. О назначенном Вам сообщаем всегда</small></span><button type="button" class="switch" role="switch" data-m="notify" aria-checked="${myNotify(l.id)}" aria-labelledby="shN-${esc(l.id)}"><span></span></button></div>` : '');
    const send = (sh.items[l.id] || []).length ? '<button type="button" data-m="sendtext">Поделиться текстом</button>' : '';
    const acts = own
      ? `<button type="button" data-m="invite"${ms.length >= SHARED_LIM.members ? ' disabled' : ''}>Пригласить</button>${send}<button type="button" data-m="rename">Переименовать</button><button type="button" class="danger" data-m="delete">Удалить список</button>`
      : `${send}<button type="button" class="danger" data-m="leave">Выйти из списка</button>`;
    return `<div class="sh-list" data-id="${esc(l.id)}"><button type="button" class="sh-list-head" data-m="open" aria-expanded="${opened}"><span>${esc(l.name)}${hasNews(l.id) ? dot : ''}</span><small>${own ? 'Вы владелец' : 'Вы участник'} · ${ms.length} ${plural(ms.length, 'участник', 'участника', 'участников')}</small></button>${opened ? `<ul class="sh-members">${members}</ul>${notify}${inv}<div class="sh-actions">${acts}</div>` : ''}</div>`;
  }).join('');
  const full = lists.length >= SHARED_LIM.lists;
  body.innerHTML = `${sh.offline ? '<p class="sh-banner">Нет сети. Показаны сохранённые данные</p>' : ''}
    ${rows ? `<div class="sh-lists">${rows}</div>` : '<p class="sh-note">Общих списков пока нет. Создайте свой или присоединитесь по коду.</p>'}
    <form class="sh-form" data-f="create"><h3>Новый общий список</h3>
      <input type="text" name="name" maxlength="${SHARED_LIM.name}" placeholder="Название, например «Покупки»" aria-label="Название списка" autocomplete="off"${full ? ' disabled' : ''}>
      <input type="text" name="who" maxlength="${SHARED_LIM.who}" aria-label="Ваше имя в списке" placeholder="Ваше имя в списке" autocomplete="off"${full ? ' disabled' : ''}>
      <button type="submit" class="primary"${full ? ' disabled' : ''}>Создать</button></form>
    <form class="sh-form" data-f="join"><h3>Присоединиться по коду</h3>
      <input type="text" name="code" maxlength="16" placeholder="Код приглашения" aria-label="Код приглашения" autocomplete="off" autocapitalize="characters" spellcheck="false"${full ? ' disabled' : ''}>
      <input type="text" name="who" maxlength="${SHARED_LIM.who}" aria-label="Ваше имя в списке" placeholder="Ваше имя в списке" autocomplete="off"${full ? ' disabled' : ''}>
      <button type="submit"${full ? ' disabled' : ''}>Присоединиться</button></form>
    ${full ? `<p class="sh-note">Можно участвовать не больше чем в ${SHARED_LIM.lists} общих списках.</p>` : ''}`;
  const def = (userName() || 'Участник').slice(0, SHARED_LIM.who);
  body.querySelectorAll('input[name=who]').forEach(i => { i.value = def; });
  if (ui.join) body.querySelector('[data-f=join] input[name=code]').value = showCode(ui.join);
}

export async function openManage() {
  ui.invite = null;
  paintManage();
  openOverlay($('shOv'));
  if (sharedReady()) refresh();
}

$('shBody').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, kind = f.dataset.f, d = Object.fromEntries(new FormData(f)), nm = String(d.who || '').trim();
  if (!nm) return toast(`Имя — от 1 до ${SHARED_LIM.who} знаков`);
  if (!(await consent())) return;
  if (kind === 'create') {
    const name = String(d.name || '').trim();
    if (!name) return toast('Введите название списка');
    const id = await run(() => createSharedList(name, nm), 'Список создан');
    if (id) { ui.open = id; paintManage(); }
  } else {
    const code = String(d.code || '').trim();
    if (!code) return toast('Введите код приглашения');
    const id = await run(() => joinSharedList(code, nm), 'Вы в списке');
    if (id) { ui.open = id; ui.join = null; try { sessionStorage.removeItem(JOIN_KEY); } catch {} paintManage(); }
  }
});
$('shBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  const m = b.dataset.m, id = b.closest('.sh-list')?.dataset.id, l = id && findShared(id);
  if (m === 'login') { closeOverlay($('shOv')); return openAccount(); }
  if (m === 'open') { ui.open = ui.open === id ? null : id; return paintManage(); }
  if (!l) return;
  if (m === 'notify') { const on = !myNotify(id); if (await run(() => setSharedNotify(id, on), on ? 'Будем сообщать о новых пунктах' : 'Сообщения о новых пунктах выключены')) paintManage(); return; }
  if (m === 'sendtext') {
    const text = outlineText(id);
    if (navigator.share) { try { await navigator.share({ text }); } catch {} return; }
    try { await navigator.clipboard.writeText(text); toast('Список скопирован текстом'); } catch { toast('Не удалось скопировать'); }
    return;
  }
  if (m === 'invite') { const code = await run(() => createSharedInvite(id)); if (code) { ui.invite = { list: id, code }; paintManage(); } return; }
  if (m === 'copy' || m === 'copylink') {
    try { await navigator.clipboard.writeText(m === 'copy' ? showCode(ui.invite.code) : inviteUrl(ui.invite.code)); toast(m === 'copy' ? 'Код скопирован' : 'Ссылка скопирована'); }
    catch { toast('Не удалось скопировать. Выделите код вручную'); }
    return;
  }
  if (m === 'share') { try { await navigator.share({ text: inviteShareText(ui.invite.code) }); } catch {} return; }
  if (m === 'rename') return openEdit(l, 'list');
  if (m === 'delete') {
    if (await askConfirm('Удалить список?', `Список «${l.name}» и все его пункты будут удалены для всех участников.`, 'Удалить')) { if (await run(() => deleteSharedList(id), 'Список удалён') && tv.shared === id) tv.shared = null; }
    return;
  }
  if (m === 'leave') {
    if (await askConfirm('Выйти из списка?', `Список «${l.name}» пропадёт у Вас. Вернуться можно только по новому коду.`, 'Выйти')) { if (await run(() => leaveSharedList(id), 'Вы вышли из списка') && tv.shared === id) tv.shared = null; }
    return;
  }
  if (m === 'remove') {
    const name = memberName(id, b.dataset.u) || 'участника';
    if (await askConfirm('Убрать участника?', `${name} больше не увидит список «${l.name}».`, 'Убрать')) await run(() => removeSharedMember(id, b.dataset.u), 'Участник убран');
  }
});
export const inviteText = code => `Код приглашения в «Трекер привычек»: ${showCode(code)}. Введите его: Задачи → Общие списки → Присоединиться`;
export const inviteShareText = code => `${inviteText(code)}. Или откройте ссылку: ${inviteUrl(code)}`;

async function whenReady(ms = 15000) {
  const t0 = Date.now();
  while (!sharedReady() && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 300));
  return sharedReady();
}
export async function openSharedFromPush(id) {
  if (!(await whenReady())) return;
  if (!$('tasksOv')._shown) openTasks();
  await refresh();
  if (id && findShared(id)) taskHooks.select(id); else openManage();
}
export async function openJoinLink(code) {
  ui.join = normCode(code);
  try { sessionStorage.setItem(JOIN_KEY, ui.join); } catch {}
  await whenReady(8000);
  if (!$('tasksOv')._shown) openTasks();
  await openManage();
  if (sharedReady()) toast('Проверьте имя и нажмите «Присоединиться»');
}
{
  const hash = /^#join=([A-Za-z0-9-]{6,16})$/.exec(location.hash), qs = new URLSearchParams(location.search);
  if (hash) { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => openJoinLink(hash[1]), 600); }
  else { try { const saved = sessionStorage.getItem(JOIN_KEY); if (saved) ui.join = saved; } catch {} }
  if (qs.has('shared')) {
    const id = qs.get('shared') || '';
    qs.delete('shared');
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
    setTimeout(() => openSharedFromPush(/^[0-9a-f-]{36}$/i.test(id) ? id : ''), 600);
  }
}
navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'shared') openSharedFromPush(typeof e.data.id === 'string' ? e.data.id : ''); });

taskHooks.chips = sharedChips;
taskHooks.render = id => { if (!sharedReady()) { tv.shared = null; return renderTasks(); } renderShared(id); if (!ui.timer) startPoll(); };
taskHooks.open = openManage;
taskHooks.select = id => { ui.doneOpen = false; ui.kind = 'item'; ui.after = null; ui.toEnd = false; ui.reorder = false; ui.filter = 'all'; tv.shared = id; $('shText').value = ''; paintHints(); renderTasks(); refresh(); };
taskHooks.leave = () => { stopPoll(); closeRow(); ui.reorder = false; ui.after = null; };
