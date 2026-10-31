import { $, addDays, COLORS, esc, getPref, key, NS, plural, setPref, todayKey } from './core.js?v=1.06a';
import { IC, iconHTML } from './icons.js?v=1.06a';
import { count, findHabit, isDue, isQuant, save, state, streak, streakText, targetOn } from './storage.js?v=1.06a';
import { askConfirm, closeMenu, closeOverlay, openMenu, openOverlay, toast } from './ui.js?v=1.06a';
import { queueTips } from './tips.js?v=1.06a';
import { addLongPress, isPrivate, unlocked } from './privacy.js?v=1.06a';
import { autoHabit, canAuto, dayDiff, dueText, GOAL_LIM, goalColor, goalProgress, goalStatus, habitPace, isActive, leftParts, newId, paceText, progressText, sortActive, sortFinished, statusText, unitOf } from './goals.js?v=1.06a';
import { openHistory } from './history.js?v=1.06a';
import { openForm } from './form.js?v=1.06a';

export const gv = { tab: 'active', id: null, hist: false };
const IC_UP = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const IC_DOWN = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const IC_FLAG = '<svg class="ic" viewBox="0 0 24 24"><path d="M5.5 21V4.5M5.5 4.5h11.5l-2.5 4.25 2.5 4.25H5.5"/></svg>';
const IC_X = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const STATUS_TONE = { ontrack: 'good', ahead: 'accent', behind: 'warn', overdue: 'danger', done: 'good', closed: 'muted' };

export const shownGoals = (s = state) => (s.goals || []).filter(g => !isPrivate(g) || unlocked);
export const findGoal = id => (state.goals || []).find(g => g.id === id);
const visibleGoal = id => { const g = findGoal(id); return g && (!isPrivate(g) || unlocked) ? g : null; };
const goalIndex = g => Math.max(0, (state.goals || []).indexOf(g));

export function touchGoal(g) {
  g.updatedAt = Date.now();
  save();
  renderGoals();
  window.dispatchEvent(new Event('goals-changed'));
}

export function openGoals(id = null) {
  gv.id = id && visibleGoal(id) ? id : null;
  if (!gv.id) gv.tab = 'active';
  renderGoals();
  openOverlay($('goalsOv'));
  $('gSheet').scrollTop = 0;
  queueTips(700);
}
export function openGoal(id) {
  if (!$('goalsOv')._shown) return openGoals(id);
  gv.id = visibleGoal(id) ? id : null;
  gv.hist = false;
  renderGoals();
  $('gSheet').scrollTop = 0;
}
function backToList() {
  gv.id = null;
  pendingLink = null;
  renderGoals();
  $('gSheet').scrollTop = 0;
}
$('goalsOv')._guard = () => {
  if (!gv.id) return true;
  backToList();
  return false;
};
$('gClose').onclick = () => { gv.id = null; closeOverlay($('goalsOv')); };
$('goalsBtn').onclick = () => openGoals();
$('gTabs').onclick = e => {
  const b = e.target.closest('button[data-t]');
  if (!b || b.dataset.t === gv.tab) return;
  gv.tab = b.dataset.t;
  renderGoals();
};
$('gAdd').onclick = () => openGoalForm();

export function renderGoals() {
  const g = gv.id ? visibleGoal(gv.id) : null;
  if (gv.id && !g) gv.id = null;
  $('gBack').hidden = !g;
  $('gMore').hidden = !g;
  $('gTitle').textContent = g ? g.title : 'Цели';
  $('gListView').hidden = !!g;
  $('gGoalView').hidden = !g;
  if (g) renderGoal(g); else { $('gGoalView').innerHTML = ''; renderList(); }
}

function barHTML(p, cls = '') {
  return `<div class="g-bar${cls}" aria-hidden="true"><i style="width:${Math.round(p.fraction * 1000) / 10}%"></i></div>`;
}

function cardHTML(g, today) {
  const st = goalStatus(g, state, today), p = goalProgress(g, state, today), left = leftParts(g, today), fin = !isActive(g);
  const side = fin
    ? `<div class="g-left fin"><span>${g.status === 'done' ? 'Выполнена' : 'Закрыта'}</span><span>${esc(dueText(g.completedAt || g.closedAt || g.due, today))}</span></div>`
    : left.n === 0 && !left.late
      ? `<div class="g-left"><b>0</b><span>последний день</span></div>`
      : `<div class="g-left">${left.pre ? `<span>${left.pre}</span>` : ''}<b>${left.n}</b><span>${left.label}</span></div>`;
  const acts = st === 'overdue' ? `<div class="g-acts">
      <button type="button" data-act="due">Перенести срок</button>
      <button type="button" data-act="done">Выполнена</button>
      <button type="button" data-act="close">Закрыть</button></div>` : '';
  return `<article class="g-card" data-id="${esc(g.id)}" data-st="${st}" style="--c:${goalColor(g, goalIndex(g))}">
    <button type="button" class="g-open" aria-label="${esc(g.title)}, ${esc(statusText(g, state, today))}"></button>
    <div class="g-top">
      <div class="g-main">
        <div class="g-name">${isPrivate(g) ? `<span class="g-lock" aria-label="Личная">${IC.lock}</span>` : ''}${esc(g.title)}</div>
        <div class="g-due">${IC.cal}<span>до ${esc(dueText(g.due, today))}</span></div>
      </div>
      ${side}
    </div>
    ${barHTML(p)}
    <div class="g-foot"><span>${esc(progressText(g, state, today))}</span><span class="g-st" data-tone="${STATUS_TONE[st]}">${esc(statusText(g, state, today))}</span></div>
    ${acts}
  </article>`;
}

function renderList() {
  const today = todayKey(), all = shownGoals();
  const list = gv.tab === 'active' ? sortActive(all.filter(isActive), today) : sortFinished(all.filter(g => !isActive(g)));
  for (const b of $('gTabs').querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.t === gv.tab);
  $('gItems').innerHTML = list.length ? list.map(g => cardHTML(g, today)).join('')
    : `<div class="empty g-empty"><div class="g-empty-ic">${IC_FLAG}</div><p>${gv.tab === 'active' ? 'Поставьте цель с датой. Приложение подскажет, какой нужен темп.' : 'Здесь появятся выполненные и закрытые цели.'}</p></div>`;
  $('gAdd').hidden = gv.tab !== 'active';
}

$('gItems').onclick = e => {
  const card = e.target.closest('.g-card');
  if (!card) return;
  const g = visibleGoal(card.dataset.id);
  if (!g) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'due') return openGoalForm(g, 'due');
  if (act === 'done') return finishGoal(g);
  if (act === 'close') return closeGoal(g);
  openGoal(g.id);
};

function statsHTML(g, today) {
  const end = g.completedAt || g.closedAt || today, steps = g.steps || [], doneSteps = steps.filter(x => x.done).length;
  const n = Math.max(1, dayDiff(end, g.start) + 1), rows = [`<li><span>Дней от начала</span><b>${n}</b></li>`];
  if (steps.length) rows.push(`<li><span>Шагов выполнено</span><b>${doneSteps} из ${steps.length}</b></li>`);
  if (g.volume) rows.push(`<li><span>Объём</span><b>${esc(progressText(g, state, end))}</b></li>`);
  return `<section class="g-sec g-result" data-status="${g.status}">
    <h3>${g.status === 'done' ? 'Цель достигнута' : 'Цель закрыта'}</h3>
    <ul class="g-stats">${rows.join('')}</ul>
    <button type="button" class="link-btn" data-act="reopen">Вернуть в активные</button>
  </section>`;
}

function stepHTML(x, i, n, active) {
  return `<li class="g-step${x.done ? ' done' : ''}" data-sid="${esc(x.id)}">
    <button type="button" class="g-check" role="checkbox" aria-checked="${x.done}"${active ? '' : ' disabled'}><svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span class="g-stext">${esc(x.text)}</span></button>
    ${active ? `<button type="button" class="ghost icon-btn g-smore" aria-label="Действия с шагом ${i + 1} из ${n}" aria-haspopup="menu">${IC.more}</button>` : ''}
  </li>`;
}

function renderGoal(g) {
  const today = todayKey(), st = goalStatus(g, state, today), p = goalProgress(g, state, today), left = leftParts(g, today), active = isActive(g);
  const steps = g.steps || [], pace = active ? paceText(g, state, today) : '';
  const allDone = active && p.kind !== 'time' && p.fraction >= 1 && !g.hinted;
  const moves = (g.dueHistory || []).length;
  const tiles = active ? `<div class="g-tiles">
      <div class="g-tile"><small>${left.late ? 'Срок прошёл' : 'Осталось'}</small><b>${left.late ? left.text.replace(/^Просрочено на /, '') : left.n === 0 ? 'Последний день' : left.text}</b></div>
      ${pace ? `<div class="g-tile"><small>Нужный темп</small><b>${esc(pace)}</b></div>` : ''}
    </div>` : '';
  const auto = autoHabit(g, state);
  const vol = g.volume && active && !auto ? `<div class="g-volrow">
      <label for="gVolDone">Сделано</label>
      <input type="number" id="gVolDone" min="0" step="any" inputmode="decimal" value="${g.volume.done}">
      <span>из ${g.volume.total}${esc(unitOf(g, state))}</span>
    </div>` : '';
  const due = `<div class="g-sum">
      <div class="g-due">${IC.cal}<span>до ${esc(dueText(g.due, today))}</span><span class="g-st" data-tone="${STATUS_TONE[st]}">${esc(statusText(g, state, today))}</span></div>
      ${barHTML(p, ' big')}
      <div class="g-prog">${esc(progressText(g, state, today))}</div>
    </div>`;
  const hint = allDone ? `<div class="g-hint" role="status"><span>Всё выполнено. Отметить цель выполненной?</span>
      <div><button type="button" class="primary" data-act="done">Отметить</button><button type="button" class="ghost" data-act="nohint">Не сейчас</button></div></div>` : '';
  const late = st === 'overdue' ? `<div class="g-acts g-acts-wide">
      <button type="button" data-act="due">Перенести срок</button>
      <button type="button" data-act="done">Отметить выполненной</button>
      <button type="button" data-act="close">Закрыть без выполнения</button></div>` : '';
  const stepsSec = `<section class="g-sec">
      <h3>Шаги${steps.length ? ` <span>${steps.filter(x => x.done).length} из ${steps.length}</span>` : ''}</h3>
      ${steps.length ? `<ul class="g-steps">${steps.map((x, i) => stepHTML(x, i, steps.length, active)).join('')}</ul>` : active ? '' : '<p class="g-muted">Шагов нет</p>'}
      ${active && steps.length < GOAL_LIM.steps ? `<form class="g-step-add" id="gStepForm"><input type="text" id="gStepNew" maxlength="${GOAL_LIM.step}" enterkeyhint="done" autocomplete="off" placeholder="Добавить шаг" aria-label="Новый шаг"><button type="submit" class="ghost icon-btn" aria-label="Добавить шаг">${IC.plus}</button></form>` : ''}
    </section>`;
  const note = g.note ? `<section class="g-sec"><h3>Заметка</h3><p class="g-note">${esc(g.note)}</p></section>` : '';
  const habits = habitsHTML(g, today, active);
  const hist = moves ? `<div class="g-moves"><button type="button" class="link-btn" data-act="moves" aria-expanded="${gv.hist}">Срок переносился: ${moves} ${plural(moves, 'раз', 'раза', 'раз')}</button>
      ${gv.hist ? `<ul>${g.dueHistory.map(h => `<li>${esc(dueText(h.from, today))} → ${esc(dueText(h.to, today))}</li>`).join('')}</ul>` : ''}</div>` : '';
  const view = $('gGoalView');
  view.style.setProperty('--c', goalColor(g, goalIndex(g)));
  view.dataset.st = st;
  view.innerHTML = due + late + hint + (active ? '' : statsHTML(g, today)) + tiles + vol + stepsSec + habits + note + hist;
  for (const li of view.querySelectorAll('.g-step')) addLongPress(li.querySelector('.g-check'), () => stepMenu(g, li.dataset.sid, li.querySelector('.g-smore') || li));
}

function setVolDone(g, v) {
  const n = Math.max(0, Math.min(1e9, Math.round(Number(v) * 100) / 100));
  if (!isFinite(n) || n === g.volume.done) return;
  g.volume.done = n;
  touchGoal(g);
}

$('gGoalView').addEventListener('change', e => {
  if (e.target.id !== 'gVolDone') return;
  const g = visibleGoal(gv.id);
  if (g?.volume && e.target.value !== '') setVolDone(g, e.target.value);
});
$('gGoalView').addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id !== 'gStepForm') return;
  const g = visibleGoal(gv.id), input = $('gStepNew'), text = input.value.trim().slice(0, GOAL_LIM.step);
  if (!g || !text) return;
  if (g.steps.length >= GOAL_LIM.steps) return toast(`В цели может быть до ${GOAL_LIM.steps} шагов`);
  const now = Date.now();
  g.steps.push({ id: newId('s'), text, done: false, order: g.steps.length, updatedAt: now });
  touchGoal(g);
  $('gStepNew')?.focus({ preventScroll: true });
});
$('gGoalView').addEventListener('click', e => {
  const g = visibleGoal(gv.id);
  if (!g) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'due') return openGoalForm(g, 'due');
  if (act === 'done') return finishGoal(g);
  if (act === 'close') return closeGoal(g);
  if (act === 'reopen') return reopenGoal(g);
  if (act === 'nohint') { g.hinted = true; return touchGoal(g); }
  if (act === 'moves') { gv.hist = !gv.hist; return renderGoals(); }
  if (act === 'link') return linkMenu(g, e.target.closest('[data-act]'));
  if (act === 'auto') return setAuto(g, !g.volume?.auto);
  const hab = e.target.closest('.g-hab');
  if (hab && e.target.closest('.g-hunlink')) return unlinkHabit(g, hab.dataset.hid);
  if (hab && e.target.closest('.g-hopen')) return findHabit(hab.dataset.hid) && openHistory(hab.dataset.hid);
  const li = e.target.closest('.g-step');
  if (!li) return;
  if (e.target.closest('.g-smore')) return stepMenu(g, li.dataset.sid, e.target.closest('.g-smore'));
  if (e.target.closest('.g-check') && !li.querySelector('.g-sedit')) toggleStep(g, li.dataset.sid);
});

function toggleStep(g, sid) {
  const x = g.steps.find(s => s.id === sid);
  if (!x || !isActive(g)) return;
  x.done = !x.done;
  if (x.done) x.doneAt = Date.now(); else delete x.doneAt;
  x.updatedAt = Date.now();
  touchGoal(g);
}

function moveStep(g, sid, d) {
  const i = g.steps.findIndex(s => s.id === sid), j = i + d;
  if (i < 0 || j < 0 || j >= g.steps.length) return;
  [g.steps[i], g.steps[j]] = [g.steps[j], g.steps[i]];
  const now = Date.now();
  g.steps.forEach((s, k) => { if (s.order !== k) { s.order = k; s.updatedAt = now; } });
  touchGoal(g);
  $('gGoalView').querySelector(`.g-step[data-sid="${CSS.escape(sid)}"] .g-smore`)?.focus({ preventScroll: true });
}

function deleteStep(g, sid) {
  const i = g.steps.findIndex(s => s.id === sid);
  if (i < 0) return;
  const [x] = g.steps.splice(i, 1);
  g.steps.forEach((s, k) => { s.order = k; });
  touchGoal(g);
  toast('Шаг удалён', () => {
    const cur = findGoal(g.id);
    if (!cur || cur.steps.some(s => s.id === x.id)) return;
    cur.steps.splice(Math.min(i, cur.steps.length), 0, { ...x, updatedAt: Date.now() });
    cur.steps.forEach((s, k) => { s.order = k; });
    touchGoal(cur);
  });
}

function editStep(g, sid) {
  const li = $('gGoalView').querySelector(`.g-step[data-sid="${CSS.escape(sid)}"]`), x = g.steps.find(s => s.id === sid);
  if (!li || !x) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'g-sedit';
  input.maxLength = GOAL_LIM.step;
  input.enterKeyHint = 'done';
  input.value = x.text;
  input.setAttribute('aria-label', 'Текст шага');
  li.querySelector('.g-stext').replaceWith(input);
  let done = false;
  const finish = keep => {
    if (done) return;
    done = true;
    const t = input.value.trim().slice(0, GOAL_LIM.step);
    if (keep && t && t !== x.text) { x.text = t; x.updatedAt = Date.now(); touchGoal(g); } else renderGoals();
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  };
  input.onblur = () => finish(true);
  input.onclick = e => e.stopPropagation();
  input.focus();
  input.select();
}

function stepMenu(g, sid, anchor) {
  const i = g.steps.findIndex(s => s.id === sid);
  if (i < 0 || !isActive(g)) return;
  const items = [{ icon: IC.edit, label: 'Изменить', run: () => editStep(g, sid) }];
  if (i > 0) items.push({ icon: IC_UP, label: 'Выше', run: () => moveStep(g, sid, -1) });
  if (i < g.steps.length - 1) items.push({ icon: IC_DOWN, label: 'Ниже', run: () => moveStep(g, sid, 1) });
  items.push('-', { icon: IC.trash, label: 'Удалить', danger: true, run: () => deleteStep(g, sid) });
  openMenu(anchor, items);
}

$('gMore').onclick = e => {
  const g = visibleGoal(gv.id);
  if (!g) return;
  const items = [{ icon: IC.edit, label: 'Изменить', run: () => openGoalForm(g) }];
  if (isActive(g)) items.push(
    { icon: IC.cal, label: 'Перенести срок', run: () => openGoalForm(g, 'due') },
    { icon: IC.full, label: 'Отметить выполненной', run: () => finishGoal(g) },
    { icon: IC_X, label: 'Закрыть без выполнения', run: () => closeGoal(g) },
  );
  else items.push({ icon: IC.reset, label: 'Вернуть в активные', run: () => reopenGoal(g) });
  items.push('-', { icon: IC.trash, label: 'Удалить', danger: true, run: () => deleteGoal(g) });
  openMenu(e.currentTarget, items);
};

export function finishGoal(g) {
  g.status = 'done';
  g.completedAt = todayKey();
  delete g.closedAt;
  gv.id = g.id;
  touchGoal(g);
  $('gSheet').scrollTop = 0;
}
export function closeGoal(g) {
  g.status = 'closed';
  g.closedAt = todayKey();
  delete g.completedAt;
  touchGoal(g);
  toast('Цель закрыта');
}
function reopenGoal(g) {
  if (shownGoals().filter(isActive).length >= GOAL_LIM.active && (state.goals || []).filter(isActive).length >= GOAL_LIM.active) return toast(`Можно вести до ${GOAL_LIM.active} целей одновременно`);
  g.status = 'active';
  delete g.completedAt;
  delete g.closedAt;
  touchGoal(g);
}
export async function deleteGoal(g) {
  const ok = await askConfirm('Удалить цель?', `${isPrivate(g) ? 'Цель' : `Цель «${g.title}»`} и её шаги будут стёрты. Это нельзя отменить.`, 'Удалить');
  if (!ok || !findGoal(g.id)) return;
  state.goals = state.goals.filter(x => x.id !== g.id);
  if (gv.id === g.id) gv.id = null;
  touchGoal(g);
}

const gf = { id: null, mode: 'new', color: null, base: '', start0: '', priv: false };
const fields = ['gfName', 'gfDue', 'gfStart', 'gfTotal', 'gfDone', 'gfUnit', 'gfNote'];
const snap = () => JSON.stringify([gf.color, gf.priv, ...fields.map(id => $(id).value)]);
function syncGoalPriv() {
  const slot = $('gfPrivSlot'), show = unlocked && gf.mode !== 'due';
  if (!show) { slot.innerHTML = ''; return; }
  if (!slot.firstChild) slot.innerHTML = `<div class="g-priv"><span id="gfPrivLbl">Личная цель</span><button type="button" class="switch" id="gfPriv" role="switch" aria-labelledby="gfPrivLbl"><span></span></button></div>`;
  $('gfPriv').setAttribute('aria-checked', gf.priv);
}
$('gfPrivSlot').onclick = e => {
  if (!e.target.closest('#gfPriv') || !unlocked) return;
  gf.priv = !gf.priv;
  syncGoalPriv();
};
$('gfColors').innerHTML = COLORS.map(c => `<button type="button" data-v="${c}" style="--sw:${c}" aria-label="Цвет ${c}"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`).join('');
const paintColors = () => { for (const b of $('gfColors').children) b.setAttribute('aria-pressed', b.dataset.v === gf.color); };
$('gfColors').onclick = e => {
  const b = e.target.closest('button[data-v]');
  if (!b) return;
  gf.color = b.dataset.v;
  paintColors();
};
const endOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);
$('gfQuick').onclick = e => {
  const q = e.target.closest('button[data-q]')?.dataset.q;
  if (!q) return;
  const t = new Date();
  const d = q === 'week' ? addDays(t, 7) : q === 'month' ? new Date(t.getFullYear(), t.getMonth() + 1, Math.min(t.getDate(), endOfMonth(new Date(t.getFullYear(), t.getMonth() + 1, 1)).getDate())) : endOfMonth(t);
  $('gfDue').value = key(d);
  dueHint();
};
function dueHint() {
  const v = $('gfDue').value, t = todayKey();
  $('gfDueHint').textContent = /^\d{4}-\d{2}-\d{2}$/.test(v) ? (v < t ? 'Эта дата уже прошла' : v === t ? 'Срок — сегодня' : `Через ${dayDiff(v, t)} ${plural(dayDiff(v, t), 'день', 'дня', 'дней')}`) : '';
}
$('gfDue').addEventListener('input', dueHint);
$('gfName').addEventListener('input', () => $('gfName').removeAttribute('aria-invalid'));
for (const id of ['gfTotal', 'gfDone']) $(id).addEventListener('input', () => { $('gfTotal').removeAttribute('aria-invalid'); $('gfVolHint').textContent = ''; });

export function openGoalForm(g = null, mode = g ? 'edit' : 'new') {
  closeMenu();
  gf.id = g?.id || null;
  gf.mode = mode;
  gf.color = g ? goalColor(g, goalIndex(g)) : COLORS[(state.goals || []).length % COLORS.length];
  $('gfTitle').textContent = mode === 'due' ? 'Перенести срок' : g ? 'Изменить цель' : 'Новая цель';
  $('gfSubmit').textContent = mode === 'due' ? 'Перенести' : g ? 'Сохранить' : 'Создать';
  $('gfName').value = g?.title || '';
  $('gfDue').value = g?.due || '';
  $('gfStart').value = gf.start0 = g?.start || todayKey();
  $('gfTotal').value = g?.volume?.total ?? '';
  $('gfDone').value = g?.volume ? g.volume.done : '';
  $('gfUnit').value = g?.volume?.unit || '';
  $('gfNote').value = g?.note || '';
  $('gfVolHint').textContent = '';
  gf.priv = !!g && isPrivate(g);
  $('gfName').removeAttribute('aria-invalid');
  $('gfTotal').removeAttribute('aria-invalid');
  $('gfNameField').hidden = mode === 'due';
  $('gfMore').hidden = mode === 'due';
  $('gfMore').open = mode === 'edit' && !!(g.volume || g.note);
  paintColors();
  syncGoalPriv();
  dueHint();
  gf.base = snap();
  openOverlay($('gFormOv'));
  setTimeout(() => (mode === 'due' ? $('gfDue') : mode === 'new' ? $('gfName') : null)?.focus({ preventScroll: true }), 60);
}
$('gFormOv')._guard = () => snap() === gf.base || askConfirm('Закрыть без сохранения?', gf.id ? 'Изменения в цели не сохранятся.' : 'Новая цель не будет добавлена.', 'Закрыть');

const invalid = (el, text) => {
  el.setAttribute('aria-invalid', 'true');
  el.focus({ preventScroll: false });
  toast(text);
  return false;
};

$('gForm').onsubmit = async e => {
  e.preventDefault();
  const g = gf.id ? findGoal(gf.id) : null;
  if (gf.id && !g) return closeOverlay($('gFormOv'));
  const title = $('gfName').value.trim().slice(0, GOAL_LIM.title), due = $('gfDue').value, t = todayKey();
  let start = $('gfStart').value || todayKey();
  if (gf.mode !== 'due' && !title) return invalid($('gfName'), 'Введите название цели');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return invalid($('gfDue'), 'Выберите срок');
  let volume = null;
  if (gf.mode !== 'due') {
    if (start > due && start === gf.start0) start = due;
    if (start > due) { $('gfMore').open = true; return invalid($('gfStart'), 'Дата начала позже срока'); }
    const tv = $('gfTotal').value.trim(), dv = $('gfDone').value.trim();
    if (tv !== '' || dv !== '') {
      const total = Number(tv), done = dv === '' ? 0 : Number(dv);
      if (!(total > 0) || !isFinite(total)) { $('gfMore').open = true; $('gfVolHint').textContent = 'Объём должен быть больше нуля'; return invalid($('gfTotal'), 'Объём должен быть больше нуля'); }
      if (!(done >= 0) || !isFinite(done)) { $('gfMore').open = true; return invalid($('gfDone'), 'Сделанное не может быть меньше нуля'); }
      volume = { total: Math.round(total * 100) / 100, done: Math.round(done * 100) / 100, unit: $('gfUnit').value.trim().slice(0, GOAL_LIM.unit), auto: !!g?.volume?.auto };
    }
  }
  if (!g && (state.goals || []).filter(isActive).length >= GOAL_LIM.active) return toast(`Можно вести до ${GOAL_LIM.active} целей одновременно`);
  if (due < t && (!g || due !== g.due) && !await askConfirm('Срок уже прошёл', 'Эта дата раньше сегодняшней. Всё равно сохранить?', 'Сохранить')) return;
  const now = Date.now();
  if (gf.mode === 'due') {
    if (due !== g.due) {
      g.dueHistory = [...(g.dueHistory || []), { from: g.due, to: due, at: now }].slice(-GOAL_LIM.history);
      g.due = due;
      if (g.start > due) g.start = due;
    }
    closeOverlay($('gFormOv'));
    touchGoal(g);
    return;
  }
  const target = g || { id: newId('g'), status: 'active', steps: [], habitIds: [], dueHistory: [], createdAt: now };
  if (g && due !== g.due) g.dueHistory = [...(g.dueHistory || []), { from: g.due, to: due, at: now }].slice(-GOAL_LIM.history);
  Object.assign(target, { title, due, start, note: $('gfNote').value.slice(0, GOAL_LIM.note), color: gf.color });
  if (unlocked) { if (gf.priv) target.private = true; else delete target.private; }
  if (!target.private) target.habitIds = (target.habitIds || []).filter(id => !isPrivate(findHabit(id)));
  if (volume) target.volume = volume; else delete target.volume;
  if (!g) (state.goals ||= []).push(target);
  gf.base = snap();
  closeOverlay($('gFormOv'));
  gv.id = target.id;
  touchGoal(target);
  if (!$('goalsOv')._shown) openGoals(target.id);
  $('gSheet').scrollTop = 0;
};

export const linkable = g => state.habits.filter(h => !h.archived && !(g.habitIds || []).includes(h.id) && (!isPrivate(h) || (isPrivate(g) && unlocked)));
const linkedShown = g => (g.habitIds || []).map(findHabit).filter(h => h && (!isPrivate(h) || (isPrivate(g) && unlocked)));

function habitLine(h, today) {
  if (h.archived) return 'В архиве';
  const d = new Date(), n = streak(h), tail = ` · серия ${streakText(h, n)}`;
  if (!isDue(h, d)) return 'Сегодня не в плане' + tail;
  if (isQuant(h)) return `Сегодня ${count(h, d)} из ${targetOn(h, d)}${h.unit ? ' ' + h.unit : ''}` + tail;
  return (count(h, d) ? 'Сегодня выполнено' : 'Сегодня не выполнено') + tail;
}

function habitsHTML(g, today, active) {
  const hs = linkedShown(g), free = (g.habitIds || []).filter(findHabit).length < GOAL_LIM.habits;
  if (!hs.length && !active) return '';
  const auto = g.volume && active && canAuto(g, state) && !isPrivateMismatch(g, hs[0]) ? `<div class="g-auto">
      <span class="g-auto-txt" id="gAutoLbl">Считать «Сделано» по привычке</span>
      <button type="button" class="switch sm" role="switch" data-act="auto" aria-checked="${!!g.volume.auto}" aria-labelledby="gAutoLbl"><span></span></button>
    </div>` : '';
  const pace = active ? habitPace(g, state, today) : '';
  return `<section class="g-sec">
    <h3>Привычки цели</h3>
    ${hs.length ? `<ul class="g-habits">${hs.map(h => `<li class="g-hab${h.archived ? ' arch' : ''}" data-hid="${esc(h.id)}" style="--c:${h.color}">
      <button type="button" class="g-hopen"><span class="hicon" aria-hidden="true">${iconHTML(h.icon)}</span><span class="g-htxt"><b>${esc(h.name)}</b><small>${esc(habitLine(h, today))}</small></span></button>
      ${active ? `<button type="button" class="ghost icon-btn g-hunlink" aria-label="Отвязать привычку «${esc(h.name)}»">${IC_X}</button>` : ''}
    </li>`).join('')}</ul>` : '<p class="g-muted">Привяжите привычки, которые ведут к цели. Их серии и статистика не изменятся.</p>'}
    ${active && free ? `<button type="button" class="link-btn g-link" data-act="link" aria-haspopup="menu">+ Привязать привычку</button>` : ''}
    ${auto}
    ${pace ? `<p class="g-pace">${esc(pace)}</p>` : ''}
  </section>`;
}
const isPrivateMismatch = (g, h) => !!h && isPrivate(h) && !isPrivate(g);

let pendingLink = null;
function linkMenu(g, anchor) {
  const hs = linkable(g);
  const items = hs.length ? [{ header: 'Выберите привычку' }, ...hs.map(h => ({ icon: `<span class="hicon menu-hicon" style="--c:${h.color}" aria-hidden="true">${iconHTML(h.icon)}</span>`, label: h.name, run: () => linkHabit(g, h.id) })), '-'] : [];
  items.push({ icon: IC.plus, label: 'Создать привычку', run: () => { pendingLink = g.id; openForm(); } });
  openMenu(anchor, items);
}
export function linkHabit(g, id) {
  const h = findHabit(id);
  if (!h) return false;
  if (isPrivate(h) && !isPrivate(g)) { toast('Личную привычку можно привязать только к личной цели'); return false; }
  g.habitIds = (g.habitIds || []).filter(findHabit);
  if (g.habitIds.includes(id)) return true;
  if (g.habitIds.length >= GOAL_LIM.habits) { toast(`К цели можно привязать до ${GOAL_LIM.habits} привычек`); return false; }
  g.habitIds.push(id);
  if (g.volume?.auto && !canAuto(g, state)) g.volume.auto = false;
  touchGoal(g);
  return true;
}
function unlinkHabit(g, id) {
  g.habitIds = (g.habitIds || []).filter(x => x !== id);
  if (g.volume?.auto && !canAuto(g, state)) g.volume.auto = false;
  touchGoal(g);
}
function setAuto(g, on) {
  if (!g.volume || (on && !canAuto(g, state))) return;
  g.volume.auto = on;
  touchGoal(g);
}
window.addEventListener('habit-added', e => {
  const g = pendingLink && $('goalsOv')._shown ? visibleGoal(pendingLink) : null;
  pendingLink = null;
  if (g && gv.id === g.id) linkHabit(g, e.detail);
});

export const STRIP_STORE = NS + '-goal-strip', STRIP_HIDE = NS + '-goal-strip-hide';
export const stripOn = () => getPref(STRIP_STORE, '1') !== '0';
export function nearestGoal(s = state) {
  return sortActive((s.goals || []).filter(g => isActive(g) && !isPrivate(g)))[0] || null;
}
export function renderGoalStrip() {
  const el = $('goalStrip');
  $('gStripSwitch').setAttribute('aria-checked', stripOn());
  const g = stripOn() && getPref(STRIP_HIDE, '') !== todayKey() ? nearestGoal() : null;
  el.hidden = !g;
  if (!g) { $('gsText').textContent = ''; delete el.dataset.id; return; }
  const left = leftParts(g);
  $('gsText').textContent = `Ближайшая цель: ${g.title} · ${left.late ? 'срок прошёл' : left.n === 0 ? 'сегодня последний день' : left.text}`;
  el.style.setProperty('--c', goalColor(g, goalIndex(g)));
  el.dataset.id = g.id;
}
$('gsOpen').onclick = () => { const id = $('goalStrip').dataset.id; if (id) openGoals(id); };
$('gsHide').onclick = () => { setPref(STRIP_HIDE, todayKey()); renderGoalStrip(); };
$('gStripSwitch').onclick = () => { setPref(STRIP_STORE, stripOn() ? '0' : '1'); renderGoalStrip(); };
window.addEventListener('goals-changed', () => { renderGoalStrip(); if ($('sumOv')._shown) renderSumGoals(); });

export function goalCounts(s = state, today = todayKey()) {
  const gs = (s.goals || []).filter(g => !isPrivate(g)), act = gs.filter(isActive);
  return { active: act.length, done: gs.filter(g => g.status === 'done').length, late: act.filter(g => ['behind', 'overdue'].includes(goalStatus(g, s, today))).length };
}
export function renderSumGoals() {
  const el = $('sGoals'), c = goalCounts();
  el.hidden = !c.active && !c.done;
  el.innerHTML = el.hidden ? '' : `<span class="sg-head">${IC_FLAG}<b>Цели</b></span>
    <span class="sg-n"><small>Активные</small><b>${c.active}</b></span>
    <span class="sg-n"><small>Выполнено</small><b>${c.done}</b></span>
    <span class="sg-n${c.late ? ' late' : ''}"><small>Отстают</small><b>${c.late}</b></span>`;
  el.setAttribute('aria-label', `Цели: активные ${c.active}, выполнено ${c.done}, отстают ${c.late}. Открыть цели`);
}
$('sGoals').onclick = () => openGoals();

export function goalsLocked() {
  pendingLink = null;
  if (gv.id && !visibleGoal(gv.id)) { gv.id = null; gv.hist = false; }
  if ((gf.id && !visibleGoal(gf.id)) || gf.priv) {
    if ($('gFormOv')._shown) { closeOverlay($('gFormOv')); $('gFormOv').hidden = true; }
    $('gForm').reset();
    gf.id = null;
    gf.priv = false;
  }
  syncGoalPriv();
  gf.base = snap();
  if ($('goalsOv')._shown) renderGoals(); else { $('gItems').innerHTML = ''; $('gGoalView').innerHTML = ''; $('gTitle').textContent = 'Цели'; }
  renderGoalStrip();
}
