import { addDays, key, NS, parseKey, plural, weekday } from './core.js?v=2.1a';
import { goalOn, isDue, MAX_COUNT } from './storage.js?v=2.1a';

export const PLAN_STORE = NS + '-planwin';
export const PLAN_WINDOWS = { week: { label: 'Неделя', days: 7 }, month: { label: 'Месяц', days: 30 }, all: { label: 'Всё время', days: 0 } };

export function windowRange(h, win, today) {
  const n = PLAN_WINDOWS[win]?.days;
  return { from: n ? key(addDays(parseKey(today), 1 - n)) : h.created, to: today };
}

export function planStats(h, s, from, to, today) {
  const out = { plannedDays: 0, plan: 0, fact: 0, credited: 0, over: 0, daysDone: 0, daysOver: 0, daysPartial: 0, daysMissed: 0 };
  if (!h?.created) return out;
  let end = to < today ? to : today;
  if (h.archived && h.archived < end) end = h.archived;
  const log = s.log || {}, skip = s.skip || {};
  for (let d = parseKey(from > h.created ? from : h.created); key(d) <= end; d = addDays(d, 1)) {
    const k = key(d);
    if (skip[k]?.[h.id] || !isDue(h, d, s)) continue;
    const t = Math.max(1, goalOn(h, d).target), c = Math.min(MAX_COUNT, Math.max(0, Math.floor(log[k]?.[h.id] || 0)));
    if (k === today && !c) continue;
    out.plannedDays++;
    out.plan += t;
    out.fact += c;
    out.credited += Math.min(c, t);
    out.over += Math.max(0, c - t);
    if (c >= t) out.daysDone++;
    if (c > t) out.daysOver++;
    if (c > 0 && c < t) out.daysPartial++;
    if (!c) out.daysMissed++;
  }
  return out;
}

export const planPct = p => p.plan ? Math.min(100, Math.floor(p.credited / p.plan * 100)) : null;

export function unitChanged(h, from) {
  return !!h.goals?.some(g => g.until >= from && (g.unit || '') !== (h.unit || ''));
}

export function overWeekday(habits, s, from, to, today) {
  const wd = Array(7).fill(0);
  let total = 0;
  for (const h of habits) {
    let end = to < today ? to : today;
    if (h.archived && h.archived < end) end = h.archived;
    for (let d = parseKey(from > h.created ? from : h.created); key(d) <= end; d = addDays(d, 1)) {
      const k = key(d);
      if (s.skip?.[k]?.[h.id] || !isDue(h, d, s)) continue;
      if ((s.log?.[k]?.[h.id] || 0) > goalOn(h, d).target) { wd[weekday(d)]++; total++; }
    }
  }
  return { wd, total };
}

export const overText = p => `Сверх плана +${p.over} за ${p.daysOver} ${plural(p.daysOver, 'день', 'дня', 'дней')}`;
