import { $, addDays, COLORS, days, HHMM, isToday, key, monday, monthDays, NS, parseKey, plural, SCHED_TYPES, schedDue, scheduleOf, STORE, TIMES, todayKey, toMin, weekday } from './core.js?v=1.1e';
import { EMOJI_TO_ICON, ICONS } from './icons.js?v=1.1e';
import { toast } from './ui.js?v=1.1e';
import { render } from './render.js?v=1.1e';
import { cloud, cloudQueue } from './sync.js?v=1.1e';
import { visibleHabits } from './privacy.js?v=1.1e';
import { normGoals } from './goals.js?v=1.1e';
import { normInboxName, normTaskLists, normTasks } from './tasks.js?v=1.1e';

export let state;
export function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE)); } catch {}
  return normalize(s);
}
export function normRemind(r, target) {
  if (typeof r === 'string') r = { times: [r] };
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const out = {};
  const times = [...new Set((Array.isArray(r.times) ? r.times : []).filter(t => typeof t === 'string' && HHMM.test(t)))].sort().slice(0, 6);
  if (times.length) out.times = times;
  const sp = r.spread;
  if (target > 1 && sp && HHMM.test(sp.from || '') && HHMM.test(sp.to || '') && toMin(sp.to) > toMin(sp.from)) out.spread = { from: sp.from, to: sp.to };
  if (!out.times && !out.spread) return null;
  if ([15, 30, 60].includes(r.repeat)) { out.repeat = r.repeat; out.repeatN = Math.max(1, Math.min(3, parseInt(r.repeatN) || 1)); }
  const days = Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter(x => x >= 0 && x <= 6))].sort() : [];
  if (days.length && days.length < 7) out.days = days;
  if (isDay(r.from)) out.from = r.from;
  if (isDay(r.to)) out.to = r.to;
  if (out.from && out.to && out.from > out.to) [out.from, out.to] = [out.to, out.from];
  return out;
}
export const SMART_DEF = { on: false, at: '21:00', repeat: 0, quiet: ['23:00', '08:00'] };
export const SMART_REPEATS = [30, 60, 120];
export function normSmart(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const t = (x, d) => typeof x === 'string' && HHMM.test(x) ? x : d;
  const q = Array.isArray(v.quiet) ? v.quiet : [];
  return {
    on: v.on === true,
    at: t(v.at, SMART_DEF.at),
    repeat: SMART_REPEATS.includes(v.repeat) ? v.repeat : 0,
    quiet: [t(q[0], SMART_DEF.quiet[0]), t(q[1], SMART_DEF.quiet[1])],
  };
}
export const smartOf = (s = state) => s.smart || { ...SMART_DEF, quiet: [...SMART_DEF.quiet] };
export const GOAL_REMIND_DEF = { on: true, at: '10:00' };
export function normGoalRemind(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return { on: v.on !== false, at: typeof v.at === 'string' && HHMM.test(v.at) ? v.at : GOAL_REMIND_DEF.at };
}
export const goalRemindOf = (s = state) => s.goalRemind || { ...GOAL_REMIND_DEF };
export function normSchedule(s, created) {
  if (!s || typeof s !== 'object' || Array.isArray(s) || !SCHED_TYPES.includes(s.type)) return null;
  const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;
  const ds = Array.isArray(s.days) ? [...new Set(s.days.filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  switch (s.type) {
    case 'daily': return { type: 'daily' };
    case 'weekdays': return ds.length === 7 ? { type: 'daily' } : ds.length ? { type: 'weekdays', days: ds } : null;
    case 'perWeek': { const t = int(s.times, 1, 6); return t ? { type: 'perWeek', times: t } : null; }
    case 'everyNWeeks': {
      const e = int(s.every, 2, 8);
      if (!e || !ds.length) return null;
      return { type: 'everyNWeeks', every: e, days: ds, anchor: typeof s.anchor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.anchor) ? s.anchor : created };
    }
    case 'monthly': { const d = int(s.dom, 0, 31); return d === null ? null : { type: 'monthly', dom: d }; }
  }
  return null;
}
export function normalize(s) {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const isKey = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isObj(s) || !Array.isArray(s.habits) || !isObj(s.log)) s = { habits: [], log: {} };
  if (!isObj(s.skip)) s.skip = {};
  if (!isObj(s.notes)) s.notes = {};
  if (!isObj(s.logAt)) s.logAt = {};
  const catIds = new Set();
  s.categories = (Array.isArray(s.categories) ? s.categories : []).filter(c => {
    if (!isObj(c) || typeof c.id !== 'string' || !c.id || catIds.has(c.id)) return false;
    c.name = String(c.name ?? '').trim().slice(0, 40);
    if (!c.name) return false;
    catIds.add(c.id);
    return true;
  }).map(c => ({ id: c.id, name: c.name }));
  const seen = new Set();
  s.habits = s.habits.filter(isObj);
  s.habits.forEach((h, i) => {
    if (typeof h.id !== 'string' || !h.id || seen.has(h.id)) h.id = `h${Date.now().toString(36)}${i}`;
    seen.add(h.id);
    h.name = String(h.name ?? '').trim().slice(0, 60) || 'Привычка';
    h.target = Math.max(1, Math.min(10000, parseInt(h.target) || 1));
    const st = parseInt(h.step) || 0;
    if (st >= 1 && h.target > 1) h.step = Math.min(st, h.target); else { delete h.step; h.target = Math.min(100, h.target); }
    if (typeof h.icon !== 'string' || !h.icon || h.icon.length > 10) h.icon = 'check';
    if (!ICONS[h.icon]) h.icon = EMOJI_TO_ICON[h.icon] || EMOJI_TO_ICON[h.icon.replace(/️/g, '')] || (/[\x00-\x7f]/.test(h.icon) ? 'check' : h.icon);
    if (typeof h.color !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(h.color)) h.color = COLORS[i % COLORS.length];
    if (!TIMES.some(t => t.v === h.time)) h.time = 'any';
    h.days = Array.isArray(h.days) ? [...new Set(h.days.map(Number).filter(x => x >= 0 && x <= 6))].sort() : null;
    if (!h.days?.length || h.days.length === 7) h.days = null;
    h.unit = typeof h.unit === 'string' ? h.unit.slice(0, 20) : '';
    h.why = typeof h.why === 'string' ? h.why.slice(0, 120) : '';
    h.remind = normRemind(h.remind, units(h));
    if (!h.remind) delete h.remind;
    if (!isKey(h.created)) h.created = todayKey();
    if (h.archived != null && !isKey(h.archived)) delete h.archived;
    if (h.updated != null && !isKey(h.updated)) delete h.updated;
    if (!catIds.has(h.cat)) h.cat = null;
    const sc = normSchedule(h.schedule, h.created);
    if (sc && (sc.type === 'weekdays' ? String(sc.days) === String(h.days) : !h.days)) h.schedule = sc;
    else delete h.schedule;
    h.goals = (Array.isArray(h.goals) ? h.goals.slice(-GOALS_MAX * 5) : []).filter(g => isObj(g) && isKey(g.until) && g.until >= h.created && parseInt(g.target) > 0)
      .map(g => {
        const t = Math.max(1, Math.min(10000, parseInt(g.target) || 1)), st = parseInt(g.step) || 0, o = { until: g.until, target: t, unit: typeof g.unit === 'string' ? g.unit.slice(0, 20) : '' };
        if (st >= 1 && t > 1) o.step = Math.min(st, t);
        const gs = normSchedule(g.sched, h.created);
        if (gs) o.sched = gs;
        return o;
      })
      .filter((g, i, a) => !a.slice(i + 1).some(x => x.until === g.until))
      .sort((a, b) => a.until < b.until ? -1 : 1).slice(-GOALS_MAX);
    if (!h.goals.length) delete h.goals;
    if (h.private !== true) delete h.private;
    if (h.stat !== true) delete h.stat;
    if (h.abstain !== true) delete h.abstain;
    else {
      h.target = 1;
      delete h.step;
      h.unit = '';
      delete h.goals;
    }
  });
  const pname = isObj(s.profile) && typeof s.profile.name === 'string' ? s.profile.name.trim().slice(0, 40) : '';
  if (pname) s.profile = { name: pname }; else delete s.profile;
  s.goals = normGoals(s.goals, seen);
  s.taskLists = normTaskLists(s.taskLists);
  const inbox = normInboxName(s.inboxName);
  if (inbox) s.inboxName = inbox; else delete s.inboxName;
  s.tasks = normTasks(s.tasks);
  const listIds = new Set(s.taskLists.map(l => l.id));
  for (const t of s.tasks) if (t.list && !listIds.has(t.list)) delete t.list;
  const sm = normSmart(s.smart);
  if (sm) s.smart = sm; else delete s.smart;
  const gr = normGoalRemind(s.goalRemind);
  if (gr) s.goalRemind = gr; else delete s.goalRemind;
  for (const map of [s.log, s.skip]) for (const k of Object.keys(map)) {
    if (!isKey(k) || !isObj(map[k])) { delete map[k]; continue; }
    for (const id of Object.keys(map[k])) {
      const v = Math.min(MAX_COUNT, Math.floor(Number(map[k][id])));
      if (!seen.has(id) || !(v > 0)) delete map[k][id]; else map[k][id] = map === s.skip ? 1 : v;
    }
    if (!Object.keys(map[k]).length) delete map[k];
  }
  const habitsById = new Map(s.habits.map(h => [h.id, h]));
  for (const k of Object.keys(s.logAt)) {
    if (!isKey(k) || !isObj(s.logAt[k])) { delete s.logAt[k]; continue; }
    for (const id of Object.keys(s.logAt[k])) {
      const c = s.log[k]?.[id] || 0;
      const h = habitsById.get(id);
      const step = h ? stepOf(goalOn(h, parseKey(k))) : 1;
      const times = compressLogAtTimes(s.logAt[k][id], c, step);
      if (!seen.has(id) || !c || !times.length) delete s.logAt[k][id]; else s.logAt[k][id] = times;
    }
    if (!Object.keys(s.logAt[k]).length) delete s.logAt[k];
  }
  for (const k of Object.keys(s.notes)) {
    if (!isKey(k) || !isObj(s.notes[k])) { delete s.notes[k]; continue; }
    for (const id of Object.keys(s.notes[k])) {
      const t = typeof s.notes[k][id] === 'string' ? s.notes[k][id].slice(0, NOTE_MAX) : '';
      if (!seen.has(id) || !t.trim()) delete s.notes[k][id]; else s.notes[k][id] = t;
    }
    if (!Object.keys(s.notes[k]).length) delete s.notes[k];
  }
  return s;
}
export let saveWarned = false;
export function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); saveWarned = false; }
  catch {
    if (!saveWarned && !cloud.session) { saveWarned = true; setTimeout(() => toast('Не удалось сохранить: в браузере закончилось место или сохранение запрещено'), 0); }
  }
  cloudQueue();
}

export const logVal = (h, d, s = state) => Math.min(MAX_COUNT, Math.max(0, Math.floor(s.log?.[key(d)]?.[h.id] || 0)));
export const rawCount = (h, d) => logVal(h, d, state);
export const targetOn = (h, d) => h.goals ? goalOn(h, d).target : h.target;
export const MAX_COUNT = 100000;
export const countCap = t => t > 1 ? Math.min(MAX_COUNT, 20 * t) : 1;
/** Эффективное выполнение: для воздержания нет записи = успех, запись = срыв. */
export function countIn(h, d, s = state) {
  const t = Math.max(1, goalOn(h, d).target), raw = logVal(h, d, s), k = key(d);
  if (!isAbstain(h)) return t > 1 ? Math.min(raw, MAX_COUNT) : Math.min(raw, 1);
  if (k > todayKey() || !inLifeKey(h, k) || s.skip?.[k]?.[h.id]) return 0;
  if (!isDue(h, d, s)) return 0;
  return raw > 0 ? 0 : 1;
}
export const count = (h, d) => countIn(h, d, state);
export const frac = (h, d) => Math.min(count(h, d) / targetOn(h, d), 1);
export function at(h, d) {
  if (!h?.goals) return h;
  const g = goalOn(h, d);
  if (g.target === h.target && (g.step || 0) === (h.step || 0) && g.unit === h.unit) return h;
  return Object.assign(Object.create(h), { target: g.target, step: g.step, unit: g.unit });
}
export const NOTE_MAX = 500;
export const noteOf = (h, d) => state.notes[key(d)]?.[h.id] || '';
export function setNote(h, d, text) {
  text = String(text).slice(0, NOTE_MAX);
  setMap(state.notes, key(d), h.id, text.trim() ? text : '');
  save();
}
export function goalOn(h, d) {
  const k = key(d), g = (h.goals || []).find(g => k <= g.until) || h;
  return { target: g.target, step: g.step, unit: g.unit || '' };
}
export const GOALS_MAX = 200;
export function noteGoalChange(h, next, scope = 'today') {
  const cur = goalOn(h, new Date()), y = key(addDays(new Date(), -1));
  const curSc = scheduleOf(h), schedMoved = !sameSchedule(curSc, scheduleOf(next));
  if (scope === 'all' && cur.target !== next.target) { delete h.goals; return; }
  if (scope === 'all' && schedMoved) { h.goals?.forEach(g => delete g.sched); return; }
  if (cur.target === next.target && (cur.step || 0) === (next.step || 0) && cur.unit === (next.unit || '') && !schedMoved) return;
  if (y < h.created) return;
  const same = (h.goals || []).find(g => g.until === y);
  if (same) { if (schedMoved && !same.sched) same.sched = curSc; return; }
  const g = { until: y, target: cur.target, unit: cur.unit, sched: curSc };
  if (cur.step) g.step = cur.step;
  h.goals = [...(h.goals || []), g].slice(-GOALS_MAX);
}
export const sameSchedule = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const isQuant = h => h.target > 1 || !!h.goals?.some(g => g.target > 1);
export const isSkipped = (h, d) => !!state.skip[key(d)]?.[h.id];
export const findHabit = id => state.habits.find(h => h.id === id);
export function lifeEnd(h) {
  const t = todayKey();
  return h.archived && h.archived < t ? h.archived : t;
}
export const inLife = (h, k) => k >= h.created && k <= lifeEnd(h);

export function setMap(map, k, id, v) {
  map[k] ??= {};
  if (v) map[k][id] = v; else delete map[k][id];
  if (!Object.keys(map[k]).length) delete map[k];
}
/** Убрать все записи привычки в map-ах лога (служебно). */
export function clearHabitMarks(id) {
  let n = 0;
  for (const map of [state.log, state.logAt, state.skip]) {
    if (!map) continue;
    for (const k of Object.keys(map)) {
      if (!map[k]?.[id]) continue;
      delete map[k][id];
      n++;
      if (!Object.keys(map[k]).length) delete map[k];
    }
  }
  return n;
}
/** Включение воздержания: было выполнено → чисто, не выполнено → срыв; пропуски сохраняются. */
export function migrateAbstainOn(h) {
  if (!h?.id || !h.created) return 0;
  const id = h.id, end = lifeEnd(h);
  let n = 0;
  state.logAt ??= {};
  for (let d = parseKey(h.created); key(d) <= end; d = addDays(d, 1)) {
    const k = key(d);
    if (state.skip?.[k]?.[id]) {
      setMap(state.log, k, id, 0);
      setMap(state.logAt, k, id, 0);
      continue;
    }
    if (!isDue(h, d)) {
      if (state.log?.[k]?.[id]) { setMap(state.log, k, id, 0); n++; }
      setMap(state.logAt, k, id, 0);
      continue;
    }
    const need = Math.max(1, goalOn(h, d).target);
    const done = (state.log?.[k]?.[id] || 0) >= need;
    setMap(state.log, k, id, done ? 0 : 1);
    setMap(state.logAt, k, id, 0);
    n++;
  }
  return n;
}
/** Выключение воздержания: чисто → выполнено, срыв → без отметки; пропуски сохраняются. */
export function migrateAbstainOff(h) {
  if (!h?.id || !h.created) return 0;
  const id = h.id, end = lifeEnd(h);
  let n = 0;
  state.logAt ??= {};
  for (let d = parseKey(h.created); key(d) <= end; d = addDays(d, 1)) {
    const k = key(d);
    if (state.skip?.[k]?.[id]) {
      setMap(state.log, k, id, 0);
      setMap(state.logAt, k, id, 0);
      continue;
    }
    if (!isDue(h, d)) {
      if (state.log?.[k]?.[id]) { setMap(state.log, k, id, 0); n++; }
      setMap(state.logAt, k, id, 0);
      continue;
    }
    const slip = (state.log?.[k]?.[id] || 0) > 0;
    setMap(state.log, k, id, slip ? 0 : 1);
    setMap(state.logAt, k, id, 0);
    n++;
  }
  return n;
}
export function stepOf(h) { return h.step || 1; }
export function units(h) { return Math.ceil(h.target / stepOf(h)); }
export function stepUp(h, c) { return Math.min(countCap(h.target), c + stepOf(h)); }
export function stepDown(h, c) { return Math.max(0, c - (c % stepOf(h) || stepOf(h))); }
/** Сколько подходов (или отметок при step=1) в сыром счётчике повторений. */
export function approachesOf(count, step = 1) {
  step = Math.max(1, parseInt(step, 10) || 1);
  if (!(count > 0)) return 0;
  return Math.floor(count / step);
}
/** Сжать старый logAt (1 метка на повтор) до 1 метки на подход; уже сжатый список и смену шага не ломает. */
export function compressLogAtTimes(times, count, step = 1) {
  step = Math.max(1, parseInt(step, 10) || 1);
  const want = approachesOf(count, step);
  if (!want) return [];
  const clean = (Array.isArray(times) ? times : []).filter(t => typeof t === 'string' && HHMM.test(t));
  if (!clean.length) return [];
  if (step === 1) return clean.slice(0, want);
  if (clean.length <= want) return clean.slice(0, want);
  // Старый формат: примерно по метке на каждый повтор
  if (clean.length >= Math.min(count, want * step)) {
    const out = [];
    for (let i = 0; i < clean.length && out.length < want; i += step) out.push(clean[i]);
    return out;
  }
  // Уже подходы (в т.ч. после смены шага) — оставляем как есть
  return clean;
}
export const heatByApproach = h => !!(h && (stepOf(h) > 1 || (h.goals || []).some(g => (g.step || 0) > 1)));
export function nowHHMM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function syncLogAt(id, k, prev, n, atTime, step = 1) {
  step = Math.max(1, parseInt(step, 10) || 1);
  state.logAt ??= {};
  let times = [...(state.logAt[k]?.[id] || [])];
  const prevU = approachesOf(prev, step), nextU = approachesOf(n, step), delta = nextU - prevU;
  if (step > 1 && times.length > prevU && times.length >= Math.min(prev || 0, prevU * step || 0)) {
    times = compressLogAtTimes(times, prev, step);
  }
  if (delta > 0) {
    const stamp = typeof atTime === 'string' && HHMM.test(atTime) ? atTime : nowHHMM();
    for (let i = 0; i < delta; i++) times.push(stamp);
  } else if (delta < 0) times.length = Math.max(0, times.length + delta);
  setMap(state.logAt, k, id, n && times.length ? times : 0);
}
export function setCount(h, d, n, atTime) {
  const k = key(d), prev = state.log[k]?.[h.id] || 0;
  if (isAbstain(h)) {
    const slip = n < 1 ? 1 : 0;
    setMap(state.log, k, h.id, slip);
    setMap(state.skip, k, h.id, 0);
    syncLogAt(h.id, k, prev ? 1 : 0, slip, atTime, 1);
    save(); render();
    return;
  }
  n = Math.max(0, Math.min(countCap(targetOn(h, d)), n));
  const step = stepOf(goalOn(h, d));
  setMap(state.log, k, h.id, n);
  if (n) setMap(state.skip, k, h.id, 0);
  syncLogAt(h.id, k, prev, n, atTime, step);
  save(); render();
}
export function setSkip(h, d, on) {
  const k = key(d);
  setMap(state.skip, k, h.id, on ? 1 : 0);
  if (on) {
    setMap(state.log, k, h.id, 0);
    state.logAt ??= {};
    setMap(state.logAt, k, h.id, 0);
  }
  save(); render();
}

export const HEAT_MIN = 5;
export const HEAT_MODES = [6, 12, 24];
export const HEAT_MODE_STORE = NS + '-heat-mode';
export const HEAT_WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
export const heatModeOf = v => { const n = +v; return n === 6 || n === 24 ? n : 12; };
export const heatStepOf = mode => ({ 6: 4, 12: 2, 24: 1 }[heatModeOf(mode)] || 2);
/** Сумма отметок по слотам времени (все дни недели). */
export function heatProfile(hm) {
  const values = (hm?.slots || []).map((_, s) => {
    let n = 0;
    for (let wd = 0; wd < 7; wd++) n += hm.grid?.[wd]?.[s] || 0;
    return n;
  });
  let peakSlot = 0, max = 0;
  for (let i = 0; i < values.length; i++) if (values[i] > max) { max = values[i]; peakSlot = i; }
  return { values, max, peakSlot };
}
export const heatHour = t => Math.min(23, Math.max(0, parseInt(String(t).slice(0, 2), 10) || 0));
export const heatPeriod = hour => hour < 6 ? { noun: 'ночь', adv: 'ночью' } : hour < 12 ? { noun: 'утро', adv: 'утром' } : hour < 18 ? { noun: 'день', adv: 'днём' } : { noun: 'вечер', adv: 'вечером' };
export const heatSlotOfHour = (hour, mode = 12) => Math.floor(Math.min(23, Math.max(0, hour | 0)) / heatStepOf(mode));
export const heatSlotOfHHMM = (t, mode = 12) => heatSlotOfHour(heatHour(t), mode);
export const heatBandStart = hour => hour === 6 || hour === 12 || hour === 18;
export function heatSlots(mode = 12) {
  mode = heatModeOf(mode);
  const step = heatStepOf(mode), out = [];
  for (let h = 0; h < 24; h += step) {
    const p = heatPeriod(h), to = h + step - 1;
    out.push({
      hour: h, from: h, to,
      label: String(h),
      tip: mode === 24 ? `${h}:00` : `${p.noun} ${h}–${to}`,
      adv: p.adv,
      band: heatBandStart(h),
    });
  }
  return out;
}
export const heatLevel = (n, max) => !n || !max ? 0 : Math.max(1, Math.ceil(n / max * 3));
export function heatPeakText(peak, mode = 12, slots = heatSlots(mode)) {
  if (!peak?.n) return '';
  const s = slots[peak.slot];
  if (!s) return '';
  mode = heatModeOf(mode);
  const when = mode === 24 ? String(s.hour) : `${s.hour}–${s.to}`;
  return `Чаще: ${HEAT_WD_SHORT[peak.wd]} · ${when}`;
}
/** Чистая агрегация отметок по слотам «день недели × час». mode: 6/12/24. Без DOM. */
export function habitHeatmap(h, s, from, to, mode = 12) {
  mode = heatModeOf(mode);
  const slots = heatSlots(mode);
  const grid = Array.from({ length: 7 }, () => Array(slots.length).fill(0));
  let total = 0;
  if (!h || !s) return { grid, total, peak: null, peakText: '', empty: true, max: 0, mode, slots };
  const log = s.log || {}, logAt = s.logAt || {};
  const lifeTo = h.archived && h.archived < to ? h.archived : to;
  for (const k of Object.keys(log)) {
    if (k < h.created || k < from || k > lifeTo) continue;
    const c = log[k]?.[h.id] || 0;
    if (!(c > 0)) continue;
    const day = parseKey(k), wd = weekday(day);
    const step = stepOf(goalOn(h, day));
    const times = compressLogAtTimes(logAt[k]?.[h.id], c, step);
    for (const t of times) {
      grid[wd][heatSlotOfHHMM(t, mode)]++;
      total++;
    }
  }
  let peak = null, max = 0;
  for (let wd = 0; wd < 7; wd++) for (let slot = 0; slot < slots.length; slot++) {
    const n = grid[wd][slot];
    if (n > max) { max = n; peak = { wd, slot, n, hour: slots[slot].hour }; }
  }
  return { grid, total, peak, peakText: heatPeakText(peak, mode, slots), empty: total < HEAT_MIN, max, mode, slots };
}

export function scheduleOn(h, d) {
  const k = typeof d === 'string' ? d : key(d), gs = h.goals || [];
  let i = gs.findIndex(g => k <= g.until);
  if (i >= 0) for (; i < gs.length; i++) if (gs[i].sched) return gs[i].sched;
  return scheduleOf(h);
}
export const isWeekly = (h, d = new Date()) => scheduleOn(h, d).type === 'perWeek';
const inLifeKey = (h, k) => k >= h.created && !(h.archived && k > h.archived);
export function weekQuota(h, weekStart) {
  const ws = monday(weekStart), sc = scheduleOn(h, addDays(ws, 6) > new Date() ? new Date() : addDays(ws, 6));
  if (sc.type !== 'perWeek') return 0;
  let n = 0;
  for (let i = 0; i < 7; i++) if (inLifeKey(h, key(addDays(ws, i)))) n++;
  return Math.min(sc.times, n);
}
export function weekDone(h, s, weekStart) {
  const ws = monday(weekStart), t = todayKey();
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i), k = key(d);
    if (k > t) break;
    if (inLifeKey(h, k) && (s.log[k]?.[h.id] || 0) >= goalOn(h, d).target) n++;
  }
  return n;
}
export const weekRemaining = (h, s, weekStart) => Math.max(0, weekQuota(h, weekStart) - weekDone(h, s, weekStart));
const isAnyDayOfMonth = sc => sc.type === 'monthly' && !sc.dom;
function monthHas(h, s, d, need) {
  const t = todayKey();
  for (let i = 1, n = monthDays(d); i <= n; i++) {
    const day = new Date(d.getFullYear(), d.getMonth(), i), k = key(day);
    if (k > t) break;
    if (inLifeKey(h, k) && (s.log[k]?.[h.id] || 0) >= need(day)) return true;
  }
  return false;
}
const monthDone = (h, s, d) => monthHas(h, s, d, day => goalOn(h, day).target);
export function isDue(h, d, s = state) {
  const k = key(d);
  if (!inLifeKey(h, k)) return false;
  const sc = scheduleOn(h, k);
  if (isAnyDayOfMonth(sc)) {
    const c = s.log[k]?.[h.id] || 0, t = todayKey();
    if (k > t) return false;
    if (k === t) return c > 0 || !monthDone(h, s, d);
    return c > 0 || (d.getDate() === monthDays(d) && !monthHas(h, s, d, () => 1));
  }
  if (sc.type !== 'perWeek') return schedDue(sc, d);
  if ((s.log[k]?.[h.id] || 0) > 0) return true;
  const t = todayKey();
  if (k === t) return weekRemaining(h, s, d) > 0;
  return k < t && weekday(d) === 6 && weekRemaining(h, s, d) > 0;
}
export function nextDue(h, from = new Date()) {
  const sc = scheduleOn(h, from);
  if (sc.type === 'perWeek' || (isAnyDayOfMonth(sc) && !monthDone(h, state, from))) return null;
  for (let i = 1; i <= 400; i++) { const d = addDays(from, i); if (schedDue(scheduleOn(h, d), d)) return d; }
  return null;
}
export const counts = (h, d) => isDue(h, d) && !isSkipped(h, d);
export const isStat = h => h?.stat === true;
export const isAbstain = h => h?.abstain === true;

export function weekRun(h, end = lifeEnd(h)) {
  let s = 0, best = 0, run = 0;
  const t = todayKey();
  for (let ws = monday(parseKey(end)); key(addDays(ws, 6)) >= h.created; ws = addDays(ws, -7)) {
    const q = weekQuota(h, ws);
    if (!q) continue;
    if (weekDone(h, state, ws) >= q) s++;
    else if (key(addDays(ws, 6)) < t) break;
  }
  for (let ws = monday(parseKey(h.created)), e = key(monday(parseKey(end))); key(ws) <= e; ws = addDays(ws, 7)) {
    const q = weekQuota(h, ws);
    if (!q) continue;
    if (weekDone(h, state, ws) >= q) best = Math.max(best, ++run);
    else if (key(addDays(ws, 6)) < t) run = 0;
  }
  return { cur: s, best };
}
export const streakText = (h, n) => isWeekly(h, parseKey(lifeEnd(h))) ? `${n} ${plural(n, 'неделя', 'недели', 'недель')}` : days(n);

export function streak(h, end = lifeEnd(h)) {
  if (isWeekly(h, parseKey(end))) return weekRun(h, end).cur;
  let s = 0;
  const t = todayKey();
  for (let d = parseKey(end); key(d) >= h.created; d = addDays(d, -1)) {
    if (!counts(h, d)) continue;
    if (count(h, d) >= targetOn(h, d)) s++;
    else if (key(d) !== t) break;
  }
  return s;
}

export function lifeStats(h) {
  let best = 0, run = 0, full = 0, due = 0, reps = 0, score = 0;
  const alpha = 1 - Math.pow(.5, 1 / 13);
  for (let d = parseKey(h.created), end = lifeEnd(h); key(d) <= end; d = addDays(d, 1)) {
    const c = count(h, d);
    reps += c;
    if (!counts(h, d)) continue;
    const v = Math.min(c / targetOn(h, d), 1);
    const isTodayUnfinished = key(d) === todayKey() && v < 1;
    if (!isTodayUnfinished) { due++; score = score * (1 - alpha) + alpha * v; }
    if (v >= 1) { full++; run++; best = Math.max(best, run); } else if (!isTodayUnfinished) run = 0;
  }
  if (isWeekly(h, parseKey(lifeEnd(h)))) best = weekRun(h).best;
  return { best, full, due, reps, score };
}

export function missRun(h) {
  let m = 0, last = null;
  for (let d = addDays(new Date(), -1), guard = 0; key(d) >= h.created && guard < 800; d = addDays(d, -1), guard++) {
    if (!counts(h, d)) continue;
    if (count(h, d) >= targetOn(h, d)) { last = key(d); break; }
    m++;
  }
  return { m, last };
}

export const STALE_DAYS = 21;
export const daysSince = k => Math.round((parseKey(todayKey()) - parseKey(k)) / 864e5);
export function agoText(n) {
  if (n < 7) return `${days(n)} назад`;
  if (n < 14) return 'неделю назад';
  if (n < 30) { const w = Math.floor(n / 7); return `${w} ${plural(w, 'неделю', 'недели', 'недель')} назад`; }
  if (n < 60) return 'месяц назад';
  if (n < 365) { const mo = Math.floor(n / 30); return `${mo} ${plural(mo, 'месяц', 'месяца', 'месяцев')} назад`; }
  return 'больше года назад';
}
export function statFacts(h, from = h.created, to = lifeEnd(h)) {
  const log = state.log || {}, days = Object.keys(log).filter(k => k >= h.created && k >= from && k <= to && (log[k]?.[h.id] || 0) > 0).sort();
  const gaps = days.slice(1).map((k, i) => Math.round((parseKey(k) - parseKey(days[i])) / 864e5));
  return { n: days.length, days, last: days.at(-1) || null, avg: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null };
}
export function statLead(h) {
  const { last } = statFacts(h);
  if (isAbstain(h)) {
    if (!last) return 'Срывов ещё не было';
    const n = daysSince(last);
    return n === 0 ? 'Срыв сегодня' : n === 1 ? 'Срыв вчера' : `Срыв ${agoText(n)}`;
  }
  if (!last) return 'Ещё не отмечалась';
  const n = daysSince(last);
  return n === 0 ? 'Последний раз сегодня' : n === 1 ? 'Последний раз вчера' : `Последний раз ${agoText(n)}`;
}
export function missBadge(h) {
  if (isAnyDayOfMonth(scheduleOn(h, new Date()))) return null;
  if (isAbstain(h)) {
    const todayDone = count(h, new Date()) >= targetOn(h, new Date());
    const { m, last } = missRun(h);
    if (!m) return null;
    if (m === 1 && todayDone) return { texts: ['Вчера срыв', 'Срыв'], title: 'Вчера был срыв — сегодня снова чистый день, пока не отметите иначе', calm: false };
    if (m === 1) return { texts: ['Вчера срыв', 'Срыв'], title: 'Вчера был срыв', calm: false };
    if (!last) return null;
    const ago = agoText(daysSince(last));
    return { texts: [`Срыв ${ago}`, `Срыв`], title: `Последний чистый день был ${ago}`, ago, calm: true };
  }
  const c = count(h, new Date());
  if (c >= targetOn(h, new Date())) return null;
  const { m, last } = missRun(h);
  if (!m) return null;
  if (!last) {
    let part = false;
    for (let d = parseKey(h.created), end = todayKey(); key(d) <= end && !part; d = addDays(d, 1)) part = count(h, d) > 0;
    if (part) return { texts: ['Пока частично', 'Частично'], title: 'Полностью привычка ещё не выполнялась, но Вы уже начали', calm: true };
    return daysSince(h.created) >= STALE_DAYS
      ? { texts: ['Давно не было', 'Давно'], title: 'С момента создания привычка ещё не выполнялась', stale: true, never: true, calm: true }
      : { texts: ['Ещё не выполнялась', 'Не выполнялась'], title: 'С момента создания привычка ещё не выполнялась', calm: true };
  }
  if (m === 1 && isWeekly(h)) return { texts: ['На прошлой неделе не хватило', 'Не хватило'], title: 'На прошлой неделе сделано меньше, чем задумано, — эта неделя начинается заново', calm: true };
  if (m === 1) return { texts: ['Вчера пропуск', 'Пропуск'], title: 'Вчера не получилось — сегодня отличный день вернуться', calm: false };
  const ago = agoText(daysSince(last));
  if (daysSince(last) >= STALE_DAYS) return { texts: ['Давно не было', 'Давно'], title: `Последний раз ${ago}`, ago, stale: true, calm: true };
  return { texts: [`Последний раз ${ago}`, `Был ${ago}`], title: `Последний раз выполнялась ${ago}`, calm: true };
}

export function activeOn(d) {
  const k = key(d);
  return visibleHabits(state).filter(h => !h.archived && k >= h.created);
}

export function dayProgress(d) {
  const hs = activeOn(d).filter(h => !isStat(h) && counts(h, d));
  if (!hs.length) return { frac: 0, done: 0, total: 0, partial: 0 };
  const done = hs.filter(h => count(h, d) >= targetOn(h, d)).length;
  const partial = hs.filter(h => count(h, d) > 0 && count(h, d) < targetOn(h, d)).length;
  return { frac: hs.reduce((s, h) => s + frac(h, d), 0) / hs.length, done, total: hs.length, partial };
}

export function perfectStreak() {
  const first = visibleHabits(state).filter(h => !h.archived && !isStat(h)).map(h => h.created).sort()[0];
  if (!first) return 0;
  let s = 0;
  for (let d = new Date(); key(d) >= first; d = addDays(d, -1)) {
    const p = dayProgress(d);
    if (!p.total) continue;
    if (p.done === p.total) s++;
    else if (!isToday(d)) break;
  }
  return s;
}

export function setState(v) { state = v; }
