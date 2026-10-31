import { COLORS, parseKey, plural, todayKey } from './core.js?v=2.1a';
import { ICONS } from './icons.js?v=2.1a';
import { isQuant, targetOn } from './storage.js?v=2.1a';
import { planStats } from './plan.js?v=2.1a';

export const GOAL_LIM = { active: 20, total: 100, steps: 30, habits: 3, title: 80, step: 120, note: 1000, unit: 20, history: 20 };
export const GOAL_TOL = 0.1;
export const GOAL_STATUSES = ['active', 'done', 'closed'];
const EPS = 1e-9;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isKey = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseKey(v));
const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const clamp01 = x => Math.max(0, Math.min(1, x));
export const dayDiff = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5);
export const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const isActive = g => g.status === 'active';
export const daysLeft = (g, today = todayKey()) => dayDiff(g.due, today);

export function expectedFraction(g, today = todayKey()) {
  const span = dayDiff(g.due, g.start);
  return span <= 0 ? 1 : clamp01(dayDiff(today, g.start) / span);
}

const habitOf = (s, id) => (s?.habits || []).find(h => h.id === id);
export const linkedHabits = (g, s) => (g.habitIds || []).map(id => habitOf(s, id)).filter(Boolean);
export function canAuto(g, s) {
  const hs = linkedHabits(g, s);
  return (g.habitIds || []).length === 1 && hs.length === 1 && isQuant(hs[0]) && (hs[0].private !== true || g.private === true);
}
export const autoHabit = (g, s) => g.volume?.auto && canAuto(g, s) ? linkedHabits(g, s)[0] : null;

export function volumeDone(g, s, today = todayKey()) {
  const h = autoHabit(g, s);
  if (h) return g.start > today ? 0 : planStats(h, s, g.start, today, today).fact;
  return Math.max(0, num(g.volume?.done));
}

export function habitPace(g, s, today = todayKey()) {
  const h = autoHabit(g, s), need = pacePerDay(g, s, today);
  if (!h || !need) return '';
  const t = targetOn(h, parseKey(today));
  return t >= need ? `Ваша дневная цель ${fmtNum(t)} — этого хватает` : `При текущей цели ${fmtNum(t)} в день Вы не успеете: нужно ${fmtNum(need)}`;
}

export function goalProgress(g, s, today = todayKey()) {
  if (g.volume) {
    const total = g.volume.total, done = volumeDone(g, s, today);
    return { kind: 'volume', done, total, fraction: clamp01(done / total) };
  }
  const steps = g.steps || [];
  if (steps.length) {
    const done = steps.filter(x => x.done).length;
    return { kind: 'steps', done, total: steps.length, fraction: done / steps.length };
  }
  return { kind: 'time', done: 0, total: 0, fraction: expectedFraction(g, today) };
}

export function goalStatus(g, s, today = todayKey()) {
  if (g.status === 'done' || g.status === 'closed') return g.status;
  if (g.due < today) return 'overdue';
  const p = goalProgress(g, s, today);
  if (p.kind === 'time') return 'ontrack';
  const e = expectedFraction(g, today);
  if (p.fraction > e + GOAL_TOL + EPS) return 'ahead';
  if (p.fraction >= e - GOAL_TOL - EPS) return 'ontrack';
  return 'behind';
}

export function shortfall(g, s, today = todayKey()) {
  const p = goalProgress(g, s, today);
  if (p.kind === 'time') return 0;
  const gap = Math.ceil(expectedFraction(g, today) * p.total - p.done - EPS);
  return goalStatus(g, s, today) === 'behind' ? Math.max(1, gap) : Math.max(0, gap);
}

export function pacePerDay(g, s, today = todayKey()) {
  if (!g.volume) return null;
  const rest = g.volume.total - volumeDone(g, s, today);
  return rest <= 0 ? 0 : Math.ceil(rest / Math.max(daysLeft(g, today), 1) - EPS);
}

const fmtNum = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',');
export const stepsWord = n => plural(n, 'шаг', 'шага', 'шагов');
export const ofSteps = n => (n % 10 === 1 && n % 100 !== 11 ? 'шага' : 'шагов');
export const unitOf = (g, s = null) => { const u = autoHabit(g, s)?.unit ?? g.volume?.unit; return u ? ' ' + u : ''; };
export const amountText = (g, n, s = null) => g.volume ? fmtNum(n) + unitOf(g, s) : `${n} ${stepsWord(n)}`;

export function progressText(g, s, today = todayKey()) {
  const p = goalProgress(g, s, today);
  if (p.kind === 'volume') return `${fmtNum(p.done)} из ${fmtNum(p.total)}${unitOf(g, s)}`;
  if (p.kind === 'steps') return `${p.done} из ${p.total} ${ofSteps(p.total)}`;
  return `Прошло ${Math.round(p.fraction * 100)}% срока`;
}

export function statusText(g, s, today = todayKey()) {
  const st = goalStatus(g, s, today);
  if (st === 'behind') return 'Отстаёте на ' + amountText(g, shortfall(g, s, today), s);
  return { done: 'Выполнена', closed: 'Закрыта', overdue: 'Срок прошёл', ahead: 'Опережаете', ontrack: 'В графике' }[st];
}

export function paceText(g, s, today = todayKey()) {
  const p = pacePerDay(g, s, today);
  if (p == null) return '';
  return p === 0 ? 'Объём выполнен' : `${fmtNum(p)}${unitOf(g, s)} в день`;
}

export function leftParts(g, today = todayKey()) {
  const n = daysLeft(g, today);
  if (n > 0) return { n, label: plural(n, 'день', 'дня', 'дней'), text: `${n} ${plural(n, 'день', 'дня', 'дней')}` };
  if (n === 0) return { n: 0, label: 'последний день', text: 'Сегодня последний день' };
  const m = -n;
  return { n: m, pre: 'просрочено на', label: plural(m, 'день', 'дня', 'дней'), text: `Просрочено на ${m} ${plural(m, 'день', 'дня', 'дней')}`, late: true };
}

export function dueText(k, today = todayKey()) {
  const d = parseKey(k), opts = { day: 'numeric', month: 'long' };
  if (k.slice(0, 4) !== today.slice(0, 4)) opts.year = 'numeric';
  return d.toLocaleDateString('ru-RU', opts).replace(/\s?г\.?$/, '');
}

export function sortActive(list, today = todayKey()) {
  return [...list].sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : (a.createdAt || 0) - (b.createdAt || 0));
}
export function sortFinished(list) {
  const at = g => g.completedAt || g.closedAt || '';
  return [...list].sort((a, b) => at(a) > at(b) ? -1 : at(a) < at(b) ? 1 : (b.updatedAt || 0) - (a.updatedAt || 0));
}

function normStep(x, i, ids) {
  if (!isObj(x)) return null;
  const text = String(x.text ?? '').trim().slice(0, GOAL_LIM.step);
  if (!text) return null;
  let id = typeof x.id === 'string' && x.id && x.id.length <= 40 ? x.id : '';
  if (!id || ids.has(id)) id = 's' + i.toString(36) + Math.random().toString(36).slice(2, 7);
  ids.add(id);
  const o = { id, text, done: x.done === true, order: num(x.order), updatedAt: num(x.updatedAt) };
  if (o.done && num(x.doneAt)) o.doneAt = x.doneAt;
  return o;
}

export function normGoal(g, i, habitIds, ids) {
  if (!isObj(g) || !isKey(g.due)) return null;
  let id = typeof g.id === 'string' && g.id && g.id.length <= 40 ? g.id : '';
  if (!id || ids.has(id)) id = 'g' + Date.now().toString(36) + i.toString(36);
  ids.add(id);
  const o = {
    id,
    title: String(g.title ?? '').trim().slice(0, GOAL_LIM.title) || 'Цель',
    start: isKey(g.start) ? g.start : todayKey(),
    due: g.due,
    status: GOAL_STATUSES.includes(g.status) ? g.status : 'active',
  };
  if (o.due < o.start) o.start = o.due;
  if (o.status === 'done') o.completedAt = isKey(g.completedAt) ? g.completedAt : o.due;
  if (o.status === 'closed') o.closedAt = isKey(g.closedAt) ? g.closedAt : o.due;
  const sids = new Set();
  o.steps = (Array.isArray(g.steps) ? g.steps : []).map((x, j) => normStep(x, j, sids)).filter(Boolean)
    .map((x, j) => [x, j]).sort((a, b) => a[0].order - b[0].order || a[1] - b[1]).map(([x]) => x)
    .slice(0, GOAL_LIM.steps).map((x, j) => ({ ...x, order: j }));
  const v = g.volume;
  if (isObj(v) && num(Number(v.total)) > 0) {
    const total = Math.min(1e9, Math.round(Number(v.total) * 100) / 100);
    o.volume = { total, done: Math.min(1e9, Math.max(0, Math.round(num(Number(v.done)) * 100) / 100)), unit: typeof v.unit === 'string' ? v.unit.trim().slice(0, GOAL_LIM.unit) : '', auto: v.auto === true };
  }
  o.habitIds = [...new Set((Array.isArray(g.habitIds) ? g.habitIds : []).filter(x => typeof x === 'string' && habitIds.has(x)))].slice(0, GOAL_LIM.habits);
  o.note = typeof g.note === 'string' ? g.note.slice(0, GOAL_LIM.note) : '';
  if (typeof g.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(g.color)) o.color = g.color;
  if (typeof g.icon === 'string' && ICONS[g.icon]) o.icon = g.icon;
  if (g.private === true) o.private = true;
  if (g.hinted === true) o.hinted = true;
  o.dueHistory = (Array.isArray(g.dueHistory) ? g.dueHistory : []).filter(h => isObj(h) && isKey(h.from) && isKey(h.to))
    .map(h => ({ from: h.from, to: h.to, at: num(h.at) })).sort((a, b) => a.at - b.at).slice(-GOAL_LIM.history);
  o.createdAt = num(g.createdAt);
  o.updatedAt = num(g.updatedAt);
  return o;
}

export function normGoals(list, habitIds = new Set()) {
  const ids = new Set();
  const all = (Array.isArray(list) ? list : []).map((g, i) => normGoal(g, i, habitIds, ids)).filter(Boolean);
  let active = 0;
  const kept = all.filter(g => !isActive(g) || ++active <= GOAL_LIM.active);
  const finished = sortFinished(kept.filter(g => !isActive(g))).slice(GOAL_LIM.total - Math.min(active, GOAL_LIM.active));
  const drop = new Set(finished);
  return kept.filter(g => !drop.has(g));
}

export const goalColor = (g, i = 0) => g.color || COLORS[i % COLORS.length];

const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x);
const same = (a, b) => canon(a) === canon(b);

function mergeFields(b, l, r, skip) {
  const newer = num(r.updatedAt) > num(l.updatedAt) ? r : l, out = {};
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    if (skip.includes(k)) continue;
    const v = same(l[k], b[k]) ? r[k] : same(r[k], b[k]) ? l[k] : newer[k];
    if (v !== undefined) out[k] = v;
  }
  out.updatedAt = Math.max(num(l.updatedAt), num(r.updatedAt));
  return out;
}

function mergeById(B, L, R, merge) {
  const bm = new Map(B.map(x => [x.id, x])), lm = new Map(L.map(x => [x.id, x])), rm = new Map(R.map(x => [x.id, x]));
  return [...new Set([...L.map(x => x.id), ...R.map(x => x.id)])].map(id => {
    const b = bm.get(id), l = lm.get(id), r = rm.get(id);
    if (same(l, b)) return r;
    if (same(r, b)) return l;
    if (!l || !r) return l;
    return merge(b || {}, l, r);
  }).filter(Boolean);
}

export function mergeGoals(B = [], L = [], R = []) {
  return mergeById(B || [], L || [], R || [], (b, l, r) => {
    const out = mergeFields(b, l, r, ['steps', 'dueHistory', 'updatedAt']);
    out.steps = mergeById(b.steps || [], l.steps || [], r.steps || [], (sb, sl, sr) => mergeFields(sb, sl, sr, ['updatedAt']))
      .sort((x, y) => num(x.order) - num(y.order) || (x.id < y.id ? -1 : 1));
    const seen = new Set();
    out.dueHistory = [...(l.dueHistory || []), ...(r.dueHistory || [])]
      .filter(h => { const k = `${h.at}|${h.from}|${h.to}`; return !seen.has(k) && seen.add(k); })
      .sort((x, y) => num(x.at) - num(y.at)).slice(-GOAL_LIM.history);
    return out;
  });
}
