import { $, esc, getPref, plural, setPref } from './core.js?v=3.2a';
import { IC } from './icons.js?v=3.2a';
import { askConfirm, closeOverlay, openOverlay, toast } from './ui.js?v=3.2a';
import { openAccount } from './sync.js?v=3.2a';
import { userName } from './settings.js?v=3.2a';
import { parseLines, renderTasks, taskHooks, tv } from './tasksui.js?v=3.2a';
import {
  addSharedItems, clearSharedDone, createSharedInvite, createSharedList, deleteSharedItem, deleteSharedList, editSharedItem, fetchShared,
  findShared, isSharedOwner, joinSharedList, leaveSharedList, memberName, myId, removeSharedMember, renameSharedList, setSharedDone, sh,
  clearShared, SHARED_LIM, SHARED_OK, SHARED_POLL_MS, sharedReady, showCode,
} from './shared.js?v=3.2a';

const IC_PEOPLE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17.5 13.6A5.5 5.5 0 0 1 20.5 19"/></svg>';
const IC_CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const SW = 80;
export const CONSENT = 'Участники списка видят название списка, записи и Ваше имя в этом списке. Они не видят Ваши привычки, задачи и цели.';
const ui = { doneOpen: false, open: null, invite: null, timer: 0, edit: null };

const fmtDay = iso => { try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); } catch { return ''; } };
const who = (listId, uid) => uid ? memberName(listId, uid) || 'бывший участник' : 'бывший участник';

function sharedChips(cur) {
  if (!sharedReady() && sh.uid) clearShared();
  if (!sharedReady()) return `<button type="button" class="t-chip t-chip-shared" data-l="shared" aria-label="Общие списки">${IC_PEOPLE}<span>Общие</span></button>`;
  return sh.lists.map(l => `<button type="button" class="t-chip t-chip-shared" data-sl="${esc(l.id)}" aria-pressed="${cur === l.id}">${IC_PEOPLE}<span>${esc(l.name)}</span></button>`).join('')
    + `<button type="button" class="t-chip t-chip-shared" data-l="shared" aria-label="Общие списки…">${IC_PEOPLE}<span>${sh.lists.length ? '…' : 'Общие'}</span></button>`;
}

function itemRow(listId, x) {
  const meta = [`<span>Добавил(а) ${esc(who(listId, x.created_by))}</span>`];
  if (x.done) meta.push(`<span>Отметил(а) ${esc(who(listId, x.done_by))}${x.done_at ? ', ' + esc(fmtDay(x.done_at)) : ''}</span>`);
  return `<div class="t-row sh-row${x.done ? ' done' : ''}" data-sid="${esc(x.id)}" style="--sw:${SW}px">
    <div class="t-acts"><button type="button" data-sact="del"><i aria-hidden="true">${IC.trash.replace(' del-ic', '')}</i><span>Удалить</span></button></div>
    <div class="t-fg"><button type="button" class="t-box" role="checkbox" aria-checked="${x.done}" aria-label="${esc(x.text)}">${IC_CHECK}</button><button type="button" class="t-main sh-main"><span class="t-text">${esc(x.text)}</span><span class="t-meta sh-meta">${meta.join('')}</span></button></div>
  </div>`;
}

export function renderShared(id) {
  const l = findShared(id);
  if (!l) { tv.shared = null; return renderTasks(); }
  $('shBanner').hidden = !sh.offline;
  $('shTitle').textContent = l.name;
  const items = sh.items[id] || [], open = items.filter(x => !x.done), done = items.filter(x => x.done);
  const head = done.length ? `<section class="t-group${ui.doneOpen ? ' open' : ''}"><div class="sh-done-bar"><button type="button" class="t-done-head" data-sact="done-toggle" aria-expanded="${ui.doneOpen}"><span>Выполнено</span><span class="cnt">${done.length}</span><svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>${ui.doneOpen ? '<button type="button" class="t-link" data-sact="clear">Очистить выполненные</button>' : ''}</div>${ui.doneOpen ? `<div class="card t-list">${done.map(x => itemRow(id, x)).join('')}</div>` : ''}</section>` : '';
  $('shItems').innerHTML = (open.length ? `<div class="card t-list">${open.map(x => itemRow(id, x)).join('')}</div>` : `<p class="t-snone">${items.length ? 'Всё отмечено' : 'Пока пусто. Добавьте первую запись'}</p>`) + head;
}

function startPoll() {
  clearInterval(ui.timer);
  ui.timer = setInterval(() => { if (!tv.shared || !$('tasksOv')._shown) return stopPoll(); refresh(); }, SHARED_POLL_MS);
}
function stopPoll() { clearInterval(ui.timer); ui.timer = 0; }
export async function refresh() {
  await fetchShared();
  if ($('tasksOv')._shown) renderTasks();
  if ($('shOv')._shown) paintManage();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('tasksOv')._shown && sharedReady()) refresh(); });

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

$('shAdd').onsubmit = async e => {
  e.preventDefault();
  const v = $('shText').value.trim();
  if (!v || !tv.shared) return;
  if (await run(() => addSharedItems(tv.shared, [v]))) { $('shText').value = ''; $('shText').focus({ preventScroll: true }); }
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
  const done = await run(() => addSharedItems(tv.shared, lines.slice(0, n)));
  if (done) toast(`Добавлено ${done} ${plural(done, 'запись', 'записи', 'записей')}`);
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
  const act = e.target.closest('[data-sact]'), row = e.target.closest('.sh-row'), item = row && (sh.items[tv.shared] || []).find(x => x.id === row.dataset.sid);
  if (act?.dataset.sact === 'done-toggle') { ui.doneOpen = !ui.doneOpen; return renderShared(tv.shared); }
  if (act?.dataset.sact === 'clear') {
    const n = (sh.items[tv.shared] || []).filter(x => x.done).length;
    if (await askConfirm('Очистить выполненные?', `${n} ${plural(n, 'запись будет удалена', 'записи будут удалены', 'записей будут удалены')} для всех участников.`, 'Удалить')) await run(() => clearSharedDone(tv.shared));
    return;
  }
  if (!item) return;
  if (row.classList.contains('open') && !e.target.closest('.t-acts')) return closeRow();
  if (act?.dataset.sact === 'del') { closeRow(); return run(() => deleteSharedItem(item.id), 'Запись удалена'); }
  if (e.target.closest('.t-box')) return run(() => setSharedDone(item.id, !item.done));
  if (e.target.closest('.sh-main')) openEdit(item);
});

function openEdit(item, kind = 'item') {
  ui.edit = { kind, id: item.id };
  $('shEditTitle').textContent = kind === 'list' ? 'Название списка' : 'Запись';
  $('shEditText').maxLength = kind === 'list' ? SHARED_LIM.name : SHARED_LIM.text;
  $('shEditText').value = kind === 'list' ? item.name : item.text;
  openOverlay($('shEditOv'));
  setTimeout(() => $('shEditText').focus({ preventScroll: true }), 60);
}
$('shEditForm').onsubmit = async e => {
  e.preventDefault();
  const v = $('shEditText').value.trim(), { kind, id } = ui.edit || {};
  if (!v) return toast(kind === 'list' ? 'Введите название списка' : 'Введите текст записи');
  closeOverlay($('shEditOv'));
  if (kind === 'list') return findShared(id) && run(() => renameSharedList(id, v), 'Список переименован');
  if (!(sh.items[tv.shared] || []).some(x => x.id === id)) return;
  await run(() => editSharedItem(id, v));
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
    body.innerHTML = '<p class="sh-note">Войдите в аккаунт, чтобы вести общие списки.</p><button type="button" class="primary sh-wide" data-m="login">Войти</button>';
    return;
  }
  const me = myId(), lists = sh.lists;
  const rows = lists.map(l => {
    const own = isSharedOwner(l, me), ms = sh.members[l.id] || [], opened = ui.open === l.id;
    const members = ms.map(m => `<li><span>${esc(m.display_name)}${(t => t ? ` <small>${t}</small>` : '')([m.user_id === l.owner_id ? 'владелец' : '', m.user_id === me ? 'это Вы' : ''].filter(Boolean).join(' · '))}</span>${own && m.user_id !== me ? `<button type="button" class="t-link" data-m="remove" data-u="${esc(m.user_id)}" aria-label="Убрать участника ${esc(m.display_name)}">Убрать</button>` : ''}</li>`).join('');
    const inv = own && ui.invite?.list === l.id ? `<div class="sh-invite"><b class="sh-code">${esc(showCode(ui.invite.code))}</b><small>Действует 48 часов, один раз</small><div class="sh-actions"><button type="button" data-m="copy">Скопировать</button>${navigator.share ? '<button type="button" data-m="share">Поделиться</button>' : ''}</div></div>` : '';
    const acts = own
      ? `<button type="button" data-m="invite"${ms.length >= SHARED_LIM.members ? ' disabled' : ''}>Пригласить</button><button type="button" data-m="rename">Переименовать</button><button type="button" class="danger" data-m="delete">Удалить список</button>`
      : '<button type="button" class="danger" data-m="leave">Выйти из списка</button>';
    return `<div class="sh-list" data-id="${esc(l.id)}"><button type="button" class="sh-list-head" data-m="open" aria-expanded="${opened}"><span>${esc(l.name)}</span><small>${own ? 'Вы владелец' : 'Вы участник'} · ${ms.length} ${plural(ms.length, 'участник', 'участника', 'участников')}</small></button>${opened ? `<ul class="sh-members">${members}</ul>${inv}<div class="sh-actions">${acts}</div>` : ''}</div>`;
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
    if (id) { ui.open = id; paintManage(); }
  }
});
$('shBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  const m = b.dataset.m, id = b.closest('.sh-list')?.dataset.id, l = id && findShared(id);
  if (m === 'login') { closeOverlay($('shOv')); return openAccount(); }
  if (m === 'open') { ui.open = ui.open === id ? null : id; return paintManage(); }
  if (!l) return;
  if (m === 'invite') { const code = await run(() => createSharedInvite(id)); if (code) { ui.invite = { list: id, code }; paintManage(); } return; }
  if (m === 'copy') { try { await navigator.clipboard.writeText(showCode(ui.invite.code)); toast('Код скопирован'); } catch { toast('Не удалось скопировать. Выделите код вручную'); } return; }
  if (m === 'share') { try { await navigator.share({ text: inviteText(ui.invite.code) }); } catch {} return; }
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

taskHooks.chips = sharedChips;
taskHooks.render = id => { if (!sharedReady()) { tv.shared = null; return renderTasks(); } renderShared(id); if (!ui.timer) startPoll(); };
taskHooks.open = openManage;
taskHooks.select = id => { ui.doneOpen = false; tv.shared = id; renderTasks(); refresh(); };
taskHooks.leave = () => { stopPoll(); closeRow(); };
