import { addDays, COLORS, HHMM, key, monday, parseKey, plural, todayKey, WEEKDAYS, weekday, withYear } from './core.js?v=3.2';
import { mergeById, mergeFields, newId } from './goals.js?v=3.2';
import { normRep, repGhosts } from './repeat.js?v=3.2';

export const TASK_LIM = { text: 200, note: 1000, total: 1000, doneDays: 180, sub: 120, subs: 30, subsTotal: 3000, lists: 12, listName: 24 };
export const newListId = () => newId('l');
export const newSubId = () => newId('s');
export const newTaskId = () => newId('t');
export const TASK_REMINDS = [[null, 'Нет'], [0, 'В срок'], [15, 'За 15 мин'], [60, 'За час'], [1440, 'За день']];
export const REMIND_MAX = 43200;
export const isRemind = v => Number.isInteger(v) && v >= 0 && v <= REMIND_MAX;
export const isPresetRemind = v => TASK_REMINDS.some(x => x[0] === v);
export function remindLabel(m) {
  if (m === 0) return 'В срок';
  if (m < 60) return `За ${m} мин`;
  if (m % 1440 === 0) return `За ${m / 1440} дн.`;
  if (m % 60 === 0) return `За ${m / 60} ч`;
  return `За ${Math.floor(m / 60)} ч ${m % 60} мин`;
}
// Должна совпадать с WINDOW_MIN в supabase/functions/send-reminders/index.ts
export const REMIND_WINDOW = 30;
export const REMINDS_MAX = 5, REMIND_DAYS_MAX = 30;
const ABS_RE = /^(\d{1,2})@([01]\d|2[0-3]):([0-5]\d)$/;
export const isAbsRemind = v => typeof v === 'string' && ABS_RE.test(v) && +v.split('@')[0] <= REMIND_DAYS_MAX;
export const absRemind = (days, hhmm) => `${days}@${hhmm}`;
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function remindOffset(time, r) {
  if (isRemind(r)) return time && HHMM.test(time) ? toMin(time) - r : null;
  if (isAbsRemind(r)) { const [d, t] = r.split('@'); return toMin(t) - +d * 1440; }
  return null;
}
export function normReminds(list, time) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(list) ? list : []) {
    const off = remindOffset(time, r);
    if (off == null || seen.has(off)) continue;
    seen.add(off);
    out.push([off, r]);
  }
  return out.sort((a, b) => a[0] - b[0]).slice(0, REMINDS_MAX).map(x => x[1]);
}
export const remindsOf = t => Array.isArray(t?.reminds) ? t.reminds : [];
export function remindAt(date, time, r) {
  const off = date ? remindOffset(time, r) : null;
  if (off == null) return null;
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, 0, off);
}
export function remindState(date, time, r, now = new Date()) {
  const fire = remindAt(date, time, r);
  if (!fire) return 'ok';
  const past = (now.getTime() - fire.getTime()) / 60000;
  return past < 0 ? 'ok' : past < REMIND_WINDOW ? 'soon' : 'missed';
}
export function remDay(k, today = todayKey()) {
  if (k === today) return 'Сегодня';
  if (k === tomorrowOf(today)) return 'Завтра';
  return `${WEEKDAYS[weekday(parseKey(k))]}, ${dayShort(k, today)}`;
}
export function remindText(date, time, r, today = todayKey()) {
  const at = remindAt(date, time, r);
  if (!at) return '';
  const s = `${remDay(key(at), today)}, ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return isRemind(r) ? `${s} · ${(TASK_REMINDS.find(x => x[0] === r)?.[1] || remindLabel(r)).toLowerCase()}` : s;
}

export const DUE_SOON_DAYS = 2;
export const DUE_REMIND_HOUR = 9;
export const DUE_REMINDS = [[null, 'Нет'], [0, 'В день срока'], [1, 'За день'], [3, 'За 3 дня']];
const DUE_REMIND_VALUES = [0, 1, 3];

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isKey = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isDay = v => isKey(v) && key(parseKey(v)) === v;
export const daysBetween = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5);
const num = v => Number.isFinite(v) ? v : 0;

export function normSubs(list) {
  const seen = new Set(), out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (!isObj(s)) continue;
    const text = String(s.text ?? '').trim().slice(0, TASK_LIM.sub);
    if (!text) continue;
    let id = typeof s.id === 'string' && s.id && s.id.length <= 40 ? s.id : '';
    if (!id || seen.has(id)) id = newSubId();
    seen.add(id);
    out.push({ id, text, done: s.done === true });
    if (out.length >= TASK_LIM.subs) break;
  }
  return out;
}
export const subStats = t => ({ done: (t.subs || []).filter(s => s.done).length, total: (t.subs || []).length });

function normTask(x, ids, today) {
  if (!isObj(x)) return null;
  const text = String(x.text ?? '').trim().slice(0, TASK_LIM.text);
  if (!text) return null;
  let id = typeof x.id === 'string' && x.id && x.id.length <= 40 ? x.id : '';
  if (!id || ids.has(id)) id = newTaskId();
  ids.add(id);
  const o = { id, text, done: x.done === true, createdAt: num(x.createdAt), updatedAt: num(x.updatedAt) };
  if (isKey(x.date)) o.date = x.date;
  if (o.date && typeof x.time === 'string' && HHMM.test(x.time)) o.time = x.time;
  const rs = o.date ? normReminds(Array.isArray(x.reminds) ? x.reminds : isRemind(x.remind) ? [x.remind] : [], o.time) : [];
  if (rs.length) o.reminds = rs;
  if (isDay(x.due)) o.due = x.due;
  const rep = o.date ? normRep(x.rep) : null;
  if (rep) o.rep = rep;
  if (Number.isInteger(x.doneCount) && x.doneCount > 0) o.doneCount = Math.min(x.doneCount, 100000);
  if (isDay(x.lastDone)) o.lastDone = x.lastDone;
  if (o.due && DUE_REMIND_VALUES.includes(x.dueRemind)) o.dueRemind = x.dueRemind;
  if (!o.date && !o.due && x.someday === true) o.someday = true;
  if (typeof x.note === 'string' && x.note.trim()) o.note = x.note.slice(0, TASK_LIM.note);
  const subs = normSubs(x.subs);
  if (subs.length) o.subs = subs;
  if (x.private === true) o.private = true;
  if (x.important === true) o.important = true;
  if (Number.isFinite(x.ord)) o.ord = x.ord;
  if (typeof x.list === 'string' && x.list && x.list.length <= 40) o.list = x.list;
  if (o.done) o.doneAt = isKey(x.doneAt) ? x.doneAt : o.date && o.date < today ? o.date : today;
  else if (isKey(x.archivedAt)) o.archivedAt = x.archivedAt;
  return o;
}

export function normTasks(list, today = todayKey()) {
  const ids = new Set(), cutoff = key(addDays(parseKey(today), -TASK_LIM.doneDays));
  const out = (Array.isArray(list) ? list : []).map(x => normTask(x, ids, today)).filter(t => t && !(t.done && t.doneAt < cutoff));
  let extra = out.reduce((n, t) => n + (t.subs?.length || 0), 0) - TASK_LIM.subsTotal;
  for (let i = out.length - 1; i >= 0 && extra > 0; i--) {
    const t = out[i];
    if (!t.subs) continue;
    const cut = Math.min(extra, t.subs.length);
    t.subs = t.subs.slice(0, t.subs.length - cut);
    extra -= cut;
    if (!t.subs.length) delete t.subs;
  }
  if (out.length <= TASK_LIM.total) return out;
  const closedAt = t => t.doneAt || t.archivedAt;
  const active = out.filter(t => !t.done && !t.archivedAt).slice(0, TASK_LIM.total);
  const closed = out.filter(t => t.done || t.archivedAt).sort((a, b) => closedAt(a) < closedAt(b) ? 1 : closedAt(a) > closedAt(b) ? -1 : 0).slice(0, TASK_LIM.total - active.length);
  const keep = new Set([...active, ...closed]);
  return out.filter(t => keep.has(t));
}

export function normTaskLists(list) {
  const ids = new Set(), out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!isObj(x) || typeof x.id !== 'string' || !x.id || x.id.length > 40 || ids.has(x.id)) continue;
    ids.add(x.id);
    out.push({ id: x.id, name: String(x.name ?? '').trim().slice(0, TASK_LIM.listName) || 'Список', color: COLORS.includes(x.color) ? x.color : COLORS[0], updatedAt: num(x.updatedAt) });
    if (out.length >= TASK_LIM.lists) break;
  }
  return out;
}
export const mergeTaskLists = (B = [], L = [], R = []) => mergeById(B || [], L || [], R || [], (b, l, r) => mergeFields(b, l, r, ['updatedAt']));
export const mergeTasks = (B = [], L = [], R = []) => mergeById(B || [], L || [], R || [], (b, l, r) => mergeFields(b, l, r, ['updatedAt']));

export const effDay = t => t.date || t.due || null;
export const isOverdue = (t, today = todayKey()) => !t.done && !t.archivedAt && ((!!t.date && t.date < today) || (!!t.due && t.due < today));
export const overdueDay = (t, today = todayKey()) => t.date && t.date < today ? t.date : t.due;
export const dueIn = (t, today = todayKey()) => t.due ? daysBetween(t.due, today) : null;
export const dueSoon = (t, today = todayKey()) => !t.done && !t.archivedAt && !!t.due && !isOverdue(t, today) && dueIn(t, today) <= DUE_SOON_DAYS;
export function dueLabel(t, today = todayKey()) {
  const n = dueIn(t, today);
  if (n === null) return null;
  const text = n === 0 ? 'Срок сегодня' : n === 1 ? 'Срок завтра' : n === 2 ? 'Срок послезавтра' : n > 2 && n <= 7 ? `Срок через ${n} ${plural(n, 'день', 'дня', 'дней')}` : `Срок ${dayShort(t.due, today)}`;
  return { text, tone: n <= 0 ? 'late' : n <= 3 ? 'soon' : '' };
}
export const overdueText = (t, today = todayKey()) => t.date && t.date < today ? dayShort(t.date, today) : `срок ${dayShort(t.due, today)}`;

const byTime = (a, b) => a.time && b.time ? (a.time < b.time ? -1 : a.time > b.time ? 1 : 0) : a.time ? -1 : b.time ? 1 : 0;
export const orderOf = t => Number.isFinite(t.ord) ? t.ord : num(t.createdAt);
export const byDay = (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || byTime(a, b) || orderOf(a) - orderOf(b);
const byKey = f => (a, b) => { const x = f(a) || '', y = f(b) || ''; return x < y ? -1 : x > y ? 1 : byDay(a, b); };
const byDate = byKey(effDay);

export function taskGroups(tasks = [], today = todayKey()) {
  const active = tasks.filter(t => !t.done && !t.archivedAt), done = tasks.filter(t => t.done);
  const rest = active.filter(t => !isOverdue(t, today)), soon = t => effDay(t) === today || dueSoon(t, today);
  return {
    overdue: active.filter(t => isOverdue(t, today)).sort(byKey(t => overdueDay(t, today))),
    today: [...rest.filter(soon).sort(byDate), ...done.filter(t => t.doneAt === today)],
    upcoming: rest.filter(t => effDay(t) && effDay(t) > today && !soon(t)).sort(byDate),
    nodate: rest.filter(t => !t.date && !t.due && !t.someday).sort(byDay),
    someday: rest.filter(t => !t.date && !t.due && t.someday).sort(byDay),
    done: done.sort((a, b) => a.doneAt < b.doneAt ? 1 : a.doneAt > b.doneAt ? -1 : num(b.updatedAt) - num(a.updatedAt)),
    archived: tasks.filter(t => !t.done && t.archivedAt).sort((a, b) => a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
  };
}

export function dayTasks(tasks = [], k, today = todayKey()) {
  const onDay = t => !t.done && !t.archivedAt && (t.date === k || t.due === k);
  if (k > today) return tasks.filter(t => onDay(t) && !isOverdue(t, today)).sort(byDate);
  if (k < today) return [...tasks.filter(onDay).sort(byDate), ...tasks.filter(t => t.done && t.doneAt === k)];
  const g = taskGroups(tasks, today);
  return [...g.overdue, ...g.today];
}

export function ghostMarks(tasks, from, last, today = todayKey(), max = 60) {
  const out = {};
  let n = 0;
  for (const t of tasks) {
    if (!t.rep || t.done || t.archivedAt || !t.date) continue;
    for (const k of repGhosts(t.rep, t.date, last, today, max)) {
      if (k < from || n >= max) continue;
      out[k] = true;
      n++;
    }
  }
  return out;
}

export const SMART = [['soon', 'Скоро'], ['due', 'Со сроком'], ['imp', 'Важные'], ['late', 'Просрочено'], ['nodate', 'Без даты'], ['rep', 'Повторяющиеся'], ['priv', 'Личные'], ['week', 'Выполнено за неделю']];
export const SMART_DAYS = 7;
export function smartFilter(id, tasks = [], today = todayKey(), { unlocked = false } = {}) {
  const list = unlocked ? tasks : tasks.filter(t => t.private !== true), act = t => !t.done && !t.archivedAt;
  const end = key(addDays(parseKey(today), SMART_DAYS)), from = key(addDays(parseKey(today), -(SMART_DAYS - 1)));
  const near = k => !!k && k >= today && k <= end;
  if (id === 'soon') return list.filter(t => act(t) && !isOverdue(t, today) && (near(effDay(t)) || near(t.due))).sort(byDate);
  if (id === 'due') return list.filter(t => act(t) && t.due).sort(byKey(t => t.due));
  if (id === 'imp') return list.filter(t => act(t) && t.important).sort(byDate);
  if (id === 'late') return list.filter(t => isOverdue(t, today)).sort(byKey(t => overdueDay(t, today)));
  if (id === 'nodate') return list.filter(t => act(t) && !t.date && !t.due && !t.someday).sort(byDay);
  if (id === 'rep') return list.filter(t => act(t) && t.rep).sort(byDate);
  if (id === 'priv') return unlocked ? list.filter(t => act(t) && t.private === true).sort(byDate) : [];
  if (id === 'week') return list.filter(t => (t.done && t.doneAt >= from && t.doneAt <= today) || (!t.done && t.rep && t.lastDone && t.lastDone >= from && t.lastDone <= today)).sort((a, b) => { const x = a.done ? a.doneAt : a.lastDone, y = b.done ? b.doneAt : b.lastDone; return x < y ? 1 : x > y ? -1 : 0; });
  return [];
}
export const smartCounts = (tasks, today = todayKey(), opts = {}) => Object.fromEntries(SMART.map(([id]) => [id, smartFilter(id, tasks, today, opts).length]));

export function dayMarks(tasks = [], today = todayKey()) {
  const out = {};
  for (const t of tasks) {
    const e = effDay(t);
    if (t.done || t.archivedAt || !e) continue;
    const m = out[e] ??= { n: 0, late: false };
    m.n++;
    if (e < today) m.late = true;
    if (t.due) (out[t.due] ??= { n: 0, late: false }).due = true;
    if (isOverdue(t, today)) (out[today] ??= { n: 0, late: false }).late = true;
  }
  return out;
}

export const pendingToday = (tasks = [], today = todayKey()) => tasks.filter(t => !t.done && !t.archivedAt && (isOverdue(t, today) || effDay(t) === today || dueSoon(t, today))).length;

export function dayShort(k, today = todayKey()) {
  const d = parseKey(k), s = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return d.getFullYear() === parseKey(today).getFullYear() ? s : `${s} ${d.getFullYear()} г.`;
}
export function dayLong(k, today = todayKey()) {
  const d = parseKey(k), s = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return d.getFullYear() === parseKey(today).getFullYear() ? s : withYear(`${s} ${d.getFullYear()}`);
}
export function taskWhen(k, today = todayKey()) {
  if (k === today) return 'Сегодня';
  if (k === key(addDays(parseKey(today), 1))) return `Завтра, ${dayShort(k, today)}`;
  if (k > today) return `${WEEKDAYS[weekday(parseKey(k))]}, ${dayShort(k, today)}`;
  return dayShort(k, today);
}
export function doneHeading(k, today = todayKey()) {
  if (k === today) return 'Сегодня';
  if (k === key(addDays(parseKey(today), -1))) return `Вчера, ${dayLong(k, today)}`;
  return dayLong(k, today);
}
export const nextMonday = (today = todayKey()) => key(addDays(monday(parseKey(today)), 7));
export const nextWeekend = (today = todayKey()) => { const d = parseKey(today), w = weekday(d); return key(addDays(d, w >= 5 ? 7 - w + 5 : 5 - w)); };
export const SOMEDAY = 'someday';
export function moveLabel(v, today = todayKey()) {
  if (v === SOMEDAY) return 'Когда-нибудь';
  if (!v) return 'Без даты';
  if (v === today) return 'на сегодня';
  if (v === tomorrowOf(today)) return 'на завтра';
  return `на ${WEEKDAYS[weekday(parseKey(v))].toLowerCase()}, ${dayShort(v, today)}`;
}
export const tomorrowOf = (today = todayKey()) => key(addDays(parseKey(today), 1));
export const monthEnd = (today = todayKey()) => { const d = parseKey(today); return key(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
export function dueWhen(k, today = todayKey()) {
  if (k === today) return 'сегодня';
  if (k === tomorrowOf(today)) return 'завтра';
  return `${parseKey(k).toLocaleDateString('ru-RU', { weekday: 'long' })}, ${dayShort(k, today)}`;
}
