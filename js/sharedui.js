import { $, esc, getPref, NS, plural, setPref } from './core.js?v=3.4c';
import { IC } from './icons.js?v=3.4c';
import { askConfirm, closeOverlay, openOverlay, toast } from './ui.js?v=3.4c';
import { openAccount } from './sync.js?v=3.4c';
import { userName } from './settings.js?v=3.4c';
import { openTasks, parseLines, renderTasks, taskHooks, tv } from './tasksui.js?v=3.4c';
import {
  addSharedItems, assignSharedItem, clearShared, createSharedInvite, createSharedList, deleteSharedItem, deleteSharedList, editSharedItem, fetchShared,
  findOpenDup, findShared, flushQueue, hasNews, inviteUrl, isSharedOwner, joinSharedList, leaveSharedList, markSeen, memberName, myId, myNotify, normCode,
  pendingIds, rememberHint, removeSharedMember, renameSharedList, seedSeen, setSharedDone, setSharedNotify, setSharedSection, sh, sharedHints,
  SHARED_LIM, SHARED_OK, SHARED_POLL_LIVE_MS, SHARED_POLL_MS, sharedReady, showCode, startLive, stopLive,
} from './shared.js?v=3.4c';

const IC_PEOPLE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 13.6A5.5 5.5 0 0 1 20.5 19"/></svg>';
const IC_CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_UP = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const IC_DN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const SW = 80, UNDO_MS = 5200, SEC_ORDER = NS + '-shared-secorder', JOIN_KEY = NS + '-shared-join';
export const CONSENT = 'Участники списка видят название списка, записи и Ваше имя в этом списке. Они не видят Ваши привычки, задачи и цели.';
const ui = { doneOpen: false, open: null, invite: null, timer: 0, tick: 0, edit: null, hidden: new Set(), fetching: false, toldQueue: false, join: null };

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

function itemRow(listId, x, wait) {
  const me = myId(), meta = [`<span>Добавил(а) ${esc(who(listId, x.created_by))}</span>`];
  if (x.assigned_to && !x.done) meta.unshift(`<span class="sh-to">→ ${x.assigned_to === me ? 'Вам' : esc(who(listId, x.assigned_to))}</span>`);
  if (x.done) meta.push(`<span>Отметил(а) ${esc(who(listId, x.done_by))}${x.done_at ? ', ' + esc(fmtDay(x.done_at)) : ''}</span>`);
  if (wait) meta.push('<span class="sh-wait">ждёт отправки</span>');
  return `<div class="t-row sh-row${x.done ? ' done' : ''}${wait ? ' wait' : ''}" data-sid="${esc(x.id)}" style="--sw:${SW}px">
    <div class="t-acts"><button type="button" data-sact="del"><i aria-hidden="true">${IC.trash.replace(' del-ic', '')}</i><span>Удалить</span></button></div>
    <div class="t-fg"><button type="button" class="t-box" role="checkbox" aria-checked="${x.done}" aria-label="${esc(x.text)}">${IC_CHECK}</button><button type="button" class="t-main sh-main"><span class="t-text">${esc(x.text)}</span><span class="t-meta sh-meta">${meta.join('')}</span></button></div>
  </div>`;
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
  const wait = pendingIds(), items = (sh.items[id] || []).filter(x => !ui.hidden.has(x.id)), open = items.filter(x => !x.done), done = items.filter(x => x.done);
  const rows = list => `<div class="card t-list">${list.map(x => itemRow(id, x, wait.has(x.id))).join('')}</div>`;
  const plain = open.filter(x => !x.section), secs = secOrder(id, [...new Set(open.filter(x => x.section).map(x => x.section))]);
  const body = open.length ? (plain.length ? rows(plain) : '') + secs.map((s, i) => {
    const list = open.filter(x => x.section === s);
    const move = secs.length > 1 ? `<button type="button" class="ghost icon-btn sh-secmove" data-sact="secup" aria-label="Раздел «${esc(s)}» выше"${i ? '' : ' disabled'}>${IC_UP}</button><button type="button" class="ghost icon-btn sh-secmove" data-sact="secdown" aria-label="Раздел «${esc(s)}» ниже"${i < secs.length - 1 ? '' : ' disabled'}>${IC_DN}</button>` : '';
    return `<section class="t-group sh-sec" data-sec="${esc(s)}"><h3 class="sec-h"><span>${esc(s)}</span><span class="cnt">${list.length}</span>${move}</h3>${rows(list)}</section>`;
  }).join('') : `<p class="t-snone">${items.length ? 'Всё отмечено' : 'Пока пусто. Добавьте первую запись'}</p>`;
  const head = done.length ? `<section class="t-group${ui.doneOpen ? ' open' : ''}"><div class="sh-done-bar"><button type="button" class="t-done-head" data-sact="done-toggle" aria-expanded="${ui.doneOpen}"><span>Выполнено</span><span class="cnt">${done.length}</span><svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>${ui.doneOpen ? '<button type="button" class="t-link" data-sact="clear">Очистить выполненные</button>' : ''}</div>${ui.doneOpen ? rows(done) : ''}</section>` : '';
  $('shItems').innerHTML = body + head;
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
  const dup = findOpenDup(tv.shared, v);
  if (dup) { toast('Уже есть в списке'); flash(dup.id); return false; }
  const ok = await act(() => addSharedItems(tv.shared, [v]));
  if (ok) rememberHint(tv.shared, v);
  return !!ok;
}
function paintHints() {
  const box = $('shHints'), list = tv.shared ? sharedHints(tv.shared, $('shText').value) : [];
  box.hidden = !list.length;
  box.innerHTML = list.map(t => `<button type="button" class="t-chip" data-hint="${esc(t)}">${esc(t)}</button>`).join('');
}
$('shText').addEventListener('input', paintHints);
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
  const lines = parseLines(text).map(x => x.text.slice(0, SHARED_LIM.text));
  if (!lines.length || !tv.shared) return;
  if (lines.length === 1) { $('shText').value = lines[0]; return; }
  const room = Math.max(0, SHARED_LIM.items - (sh.items[tv.shared]?.length || 0)), n = Math.min(lines.length, SHARED_LIM.batch, room);
  if (!n) return toast(`В списке может быть до ${SHARED_LIM.items} записей`);
  const preview = lines.slice(0, Math.min(n, 5)).map(x => `• ${x}`);
  if (n > 5) preview.push(`и ещё ${n - 5}`);
  if (n < lines.length) preview.push(`Сразу можно добавить ${n} из ${lines.length}.`);
  if (!(await askConfirm(`Добавить ${n} ${plural(n, 'запись', 'записи', 'записей')}?`, preview.join('\n'), 'Добавить'))) return;
  const listId = tv.shared, done = await act(() => addSharedItems(listId, lines.slice(0, n)));
  if (done) { lines.slice(0, n).forEach(t => rememberHint(listId, t)); toast(`Добавлено ${done} ${plural(done, 'запись', 'записи', 'записей')}`); }
});

let swipe = null, openRow = null;
const closeRow = () => { if (openRow) { openRow.classList.remove('open'); openRow = null; } };
const box = () => $('shItems');
$('shItems').addEventListener('pointerdown', e => {
  const fg = e.target.closest('.t-fg');
  if (!fg || e.button !== 0 || e.target.closest('.t-box')) return;
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
  if (a?.dataset.sact === 'secup' || a?.dataset.sact === 'secdown') return moveSec(listId, a.closest('.sh-sec').dataset.sec, a.dataset.sact === 'secup' ? -1 : 1);
  if (a?.dataset.sact === 'clear') {
    const ids = (sh.items[listId] || []).filter(x => x.done && !ui.hidden.has(x.id)).map(x => x.id), n = ids.length;
    if (await askConfirm('Очистить выполненные?', `${n} ${plural(n, 'запись будет удалена', 'записи будут удалены', 'записей будут удалены')} для всех участников.`, 'Удалить')) deleteLater(listId, ids, `Удалено: ${n}`);
    return;
  }
  if (!item) return;
  if (row.classList.contains('open') && !e.target.closest('.t-acts')) return closeRow();
  if (a?.dataset.sact === 'del') { closeRow(); return deleteLater(listId, [item.id], 'Запись удалена'); }
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

function openEdit(item, kind = 'item') {
  ui.edit = { kind, id: item.id };
  $('shEditTitle').textContent = kind === 'list' ? 'Название списка' : 'Запись';
  $('shEditText').maxLength = kind === 'list' ? SHARED_LIM.name : SHARED_LIM.text;
  $('shEditText').value = kind === 'list' ? item.name : item.text;
  const ex = kind === 'item' && sh.v2 === true;
  $('shEditEx').hidden = !ex;
  if (ex) {
    const listId = tv.shared, me = myId();
    $('shSecList').innerHTML = [...new Set((sh.items[listId] || []).map(x => x.section).filter(Boolean))].map(s => `<option value="${esc(s)}"></option>`).join('');
    $('shEditSec').value = item.section || '';
    $('shEditWho').innerHTML = '<option value="">Никому</option>' + (sh.members[listId] || []).map(m => `<option value="${esc(m.user_id)}">${esc(m.user_id === me ? `${m.display_name} (Вы)` : m.display_name)}</option>`).join('');
    $('shEditWho').value = item.assigned_to || '';
  }
  openOverlay($('shEditOv'));
  setTimeout(() => $('shEditText').focus({ preventScroll: true }), 60);
}
$('shEditForm').onsubmit = async e => {
  e.preventDefault();
  const v = $('shEditText').value.trim(), { kind, id } = ui.edit || {};
  if (!v) return toast(kind === 'list' ? 'Введите название списка' : 'Введите текст записи');
  closeOverlay($('shEditOv'));
  if (kind === 'list') return findShared(id) && run(() => renameSharedList(id, v), 'Список переименован');
  const listId = tv.shared, item = (sh.items[listId] || []).find(x => x.id === id);
  if (!item) return;
  if (v !== item.text) await act(() => editSharedItem(listId, id, v));
  if ($('shEditEx').hidden) return;
  const sec = $('shEditSec').value.trim().slice(0, SHARED_LIM.section) || null, to = $('shEditWho').value || null;
  if (sec !== (item.section || null)) await act(() => setSharedSection(listId, id, sec));
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
    const notify = sh.v2 === true ? `<div class="set-row static sh-notify"><span class="set-txt"><b id="shN-${esc(l.id)}">Сообщать о новых записях</b><small>Одним уведомлением. О назначенном Вам сообщаем всегда</small></span><button type="button" class="switch" role="switch" data-m="notify" aria-checked="${myNotify(l.id)}" aria-labelledby="shN-${esc(l.id)}"><span></span></button></div>` : '';
    const acts = own
      ? `<button type="button" data-m="invite"${ms.length >= SHARED_LIM.members ? ' disabled' : ''}>Пригласить</button><button type="button" data-m="rename">Переименовать</button><button type="button" class="danger" data-m="delete">Удалить список</button>`
      : '<button type="button" class="danger" data-m="leave">Выйти из списка</button>';
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
  if (m === 'notify') { const on = !myNotify(id); if (await run(() => setSharedNotify(id, on), on ? 'Будем сообщать о новых записях' : 'Сообщения о новых записях выключены')) paintManage(); return; }
  if (m === 'invite') { const code = await run(() => createSharedInvite(id)); if (code) { ui.invite = { list: id, code }; paintManage(); } return; }
  if (m === 'copy' || m === 'copylink') {
    try { await navigator.clipboard.writeText(m === 'copy' ? showCode(ui.invite.code) : inviteUrl(ui.invite.code)); toast(m === 'copy' ? 'Код скопирован' : 'Ссылка скопирована'); }
    catch { toast('Не удалось скопировать. Выделите код вручную'); }
    return;
  }
  if (m === 'share') { try { await navigator.share({ text: inviteShareText(ui.invite.code) }); } catch {} return; }
  if (m === 'rename') return openEdit(l, 'list');
  if (m === 'delete') {
    if (await askConfirm('Удалить список?', `Список «${l.name}» и все его записи будут удалены для всех участников.`, 'Удалить')) { if (await run(() => deleteSharedList(id), 'Список удалён') && tv.shared === id) tv.shared = null; }
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
taskHooks.select = id => { ui.doneOpen = false; tv.shared = id; $('shText').value = ''; paintHints(); renderTasks(); refresh(); };
taskHooks.leave = () => { stopPoll(); closeRow(); };
