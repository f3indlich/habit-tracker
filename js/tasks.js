import { addDays, HHMM, key, monday, parseKey, todayKey, WEEKDAYS, weekday, withYear } from './core.js?v=3.0';
import { mergeById, mergeFields, newId } from './goals.js?v=3.0';

export const TASK_LIM = { text: 200, note: 1000, total: 1000, doneDays: 180 };
export const newTaskId = () => newId('t');
export const TASK_REMINDS = [[null, 'Нет'], [0, 'В срок'], [15, 'За 15 мин'], [60, 'За час'], [1440, 'За день']];
const REMIND_VALUES = TASK_REMINDS.map(x => x[0]).filter(x => x !== null);

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isKey = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = v => Number.isFinite(v) ? v : 0;

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
  if (o.time && REMIND_VALUES.includes(x.remind)) o.remind = x.remind;
  if (typeof x.note === 'string' && x.note.trim()) o.note = x.note.slice(0, TASK_LIM.note);
  if (isKey(x.calAt)) o.calAt = x.calAt;
  if (o.done) o.doneAt = isKey(x.doneAt) ? x.doneAt : o.date && o.date < today ? o.date : today;
  else if (o.date && o.date < today && isKey(x.archivedAt)) o.archivedAt = x.archivedAt;
  return o;
}

export function normTasks(list, today = todayKey()) {
  const ids = new Set(), cutoff = key(addDays(parseKey(today), -TASK_LIM.doneDays));
  const out = (Array.isArray(list) ? list : []).map(x => normTask(x, ids, today)).filter(t => t && !(t.done && t.doneAt < cutoff));
  if (out.length <= TASK_LIM.total) return out;
  const closedAt = t => t.doneAt || t.archivedAt;
  const active = out.filter(t => !t.done && !t.archivedAt).slice(0, TASK_LIM.total);
  const closed = out.filter(t => t.done || t.archivedAt).sort((a, b) => closedAt(a) < closedAt(b) ? 1 : closedAt(a) > closedAt(b) ? -1 : 0).slice(0, TASK_LIM.total - active.length);
  const keep = new Set([...active, ...closed]);
  return out.filter(t => keep.has(t));
}

export const mergeTasks = (B = [], L = [], R = []) => mergeById(B || [], L || [], R || [], (b, l, r) => mergeFields(b, l, r, ['updatedAt']));

export const isOverdue = (t, today = todayKey()) => !t.done && !t.archivedAt && !!t.date && t.date < today;

const byTime = (a, b) => a.time && b.time ? (a.time < b.time ? -1 : a.time > b.time ? 1 : 0) : a.time ? -1 : b.time ? 1 : 0;
const byDate = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : byTime(a, b) || num(a.createdAt) - num(b.createdAt);

export function taskGroups(tasks = [], today = todayKey()) {
  const active = tasks.filter(t => !t.done && !t.archivedAt), done = tasks.filter(t => t.done);
  return {
    overdue: active.filter(t => isOverdue(t, today)).sort(byDate),
    today: [...active.filter(t => t.date === today).sort(byDate), ...done.filter(t => t.doneAt === today)],
    upcoming: active.filter(t => t.date && t.date > today).sort(byDate),
    nodate: active.filter(t => !t.date),
    done: done.sort((a, b) => a.doneAt < b.doneAt ? 1 : a.doneAt > b.doneAt ? -1 : num(b.updatedAt) - num(a.updatedAt)),
    archived: tasks.filter(t => !t.done && t.archivedAt).sort((a, b) => a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
  };
}

export function dayTasks(tasks = [], k, today = todayKey()) {
  if (k > today) return tasks.filter(t => !t.done && t.date === k).sort(byDate);
  if (k < today) return [...tasks.filter(t => !t.done && !t.archivedAt && t.date === k).sort(byDate), ...tasks.filter(t => t.done && t.doneAt === k)];
  const g = taskGroups(tasks, today);
  return [...g.overdue, ...g.today];
}

export function dayMarks(tasks = [], today = todayKey()) {
  const out = {};
  for (const t of tasks) {
    if (t.done || t.archivedAt || !t.date) continue;
    const m = out[t.date] ??= { n: 0, late: false };
    m.n++;
    if (t.date < today) m.late = true;
    if (t.date < today) (out[today] ??= { n: 0, late: false }).late = true;
  }
  return out;
}

export const pendingToday = (tasks = [], today = todayKey()) => tasks.filter(t => !t.done && !t.archivedAt && t.date && t.date <= today).length;

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
export const tomorrowOf = (today = todayKey()) => key(addDays(parseKey(today), 1));

const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) {
  const enc = new TextEncoder(), parts = [];
  let cur = '', size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > 73) { parts.push(cur); cur = ' '; size = 1; }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join('\r\n');
}
const icsPad = n => String(n).padStart(2, '0');
const icsLocal = d => `${d.getFullYear()}${icsPad(d.getMonth() + 1)}${icsPad(d.getDate())}T${icsPad(d.getHours())}${icsPad(d.getMinutes())}00`;
const icsDay = d => `${d.getFullYear()}${icsPad(d.getMonth() + 1)}${icsPad(d.getDate())}`;
export function taskIcs(t, now = new Date()) {
  const day = parseKey(t.date), lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Habit Tracker//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${t.id}@habit-tracker`, `DTSTAMP:${now.toISOString().replace(/[-:]|\.\d+/g, '')}`, `SUMMARY:${icsText(t.text)}`];
  if (t.time) {
    const [h, m] = t.time.split(':').map(Number), start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    lines.push(`DTSTART:${icsLocal(start)}`, `DTEND:${icsLocal(new Date(start.getFullYear(), start.getMonth(), start.getDate(), h + 1, m))}`);
  } else lines.push(`DTSTART;VALUE=DATE:${icsDay(day)}`, `DTEND;VALUE=DATE:${icsDay(addDays(day, 1))}`);
  if (t.note) lines.push(`DESCRIPTION:${icsText(t.note)}`);
  if (t.time && t.remind != null) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(t.text)}`, `TRIGGER:${t.remind ? `-PT${t.remind}M` : 'PT0M'}`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
