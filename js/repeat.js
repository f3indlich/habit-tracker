import { addDays, key, monday, parseKey, plural, weekday } from './core.js?v=3.4';

export const REP_MAX = { d: 365, w: 52, mo: 24, y: 10 };
export const REP_UNITS = [['d', 'дн.'], ['w', 'нед.'], ['mo', 'мес.'], ['y', 'лет']];
export const WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WD_EVERY = ['Каждый понедельник', 'Каждый вторник', 'Каждую среду', 'Каждый четверг', 'Каждую пятницу', 'Каждую субботу', 'Каждое воскресенье'];
const LOOKAHEAD = 800;

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && key(parseKey(v)) === v;
const diff = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5);
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();

export function normRep(x) {
  if (!isObj(x) || (x.m !== 'cal' && x.m !== 'after') || !(x.u in REP_MAX)) return null;
  if (!Number.isInteger(x.n) || x.n < 1 || x.n > REP_MAX[x.u]) return null;
  const o = { m: x.m, n: x.n, u: x.u };
  if (x.m === 'cal' && x.u === 'w' && Array.isArray(x.wd)) {
    const wd = [...new Set(x.wd.filter(v => Number.isInteger(v) && v >= 0 && v <= 6))].sort((a, b) => a - b);
    if (wd.length) o.wd = wd;
  }
  if (x.m === 'cal' && x.u === 'mo' && (x.md === 'last' || (Number.isInteger(x.md) && x.md >= 1 && x.md <= 31))) o.md = x.md;
  if (isDay(x.until)) o.until = x.until;
  return o;
}

export function addMonths(k, n, md) {
  const d = parseKey(k), y = d.getFullYear(), m = d.getMonth() + n, ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
  const want = md === 'last' ? 31 : md || d.getDate();
  return key(new Date(ty, tm, Math.min(want, lastDay(ty, tm))));
}

function stepFrom(rep, k) {
  if (rep.u === 'd') return key(addDays(parseKey(k), rep.n));
  if (rep.u === 'w') return key(addDays(parseKey(k), 7 * rep.n));
  if (rep.u === 'mo') return addMonths(k, rep.n, rep.md);
  return addMonths(k, 12 * rep.n, rep.md);
}

function calAfter(rep, old, from) {
  if (rep.u === 'w' && rep.wd) {
    const base = monday(parseKey(old));
    for (let i = 1; i <= LOOKAHEAD; i++) {
      const d = addDays(parseKey(from), i), weeks = Math.round((monday(d) - base) / (7 * 864e5));
      if (rep.wd.includes(weekday(d)) && ((weeks % rep.n) + rep.n) % rep.n === 0) return key(d);
    }
    return null;
  }
  if (rep.u === 'd' || rep.u === 'w') {
    const step = rep.u === 'd' ? rep.n : 7 * rep.n, k = Math.floor(diff(from, old) / step) + 1;
    return key(addDays(parseKey(old), Math.max(1, k) * step));
  }
  const months = rep.u === 'mo' ? rep.n : 12 * rep.n;
  for (let i = 1; i <= LOOKAHEAD; i++) {
    const c = addMonths(old, months * i, rep.u === 'mo' ? rep.md : undefined);
    if (c > from) return c;
  }
  return null;
}

export function nextOccurrence(rep, oldDate, today) {
  if (!rep) return null;
  if (rep.m === 'after') return stepFrom(rep, today);
  return calAfter(rep, oldDate, oldDate >= today ? oldDate : today);
}

export function matchesOn(rep, k, anchor = k) {
  if (!rep || rep.m === 'after') return true;
  const d = parseKey(k);
  if (rep.u === 'w' && rep.wd) return rep.wd.includes(weekday(d));
  if (rep.u === 'w') return weekday(d) === weekday(parseKey(anchor));
  if (rep.u === 'mo') {
    const md = rep.md ?? parseKey(anchor).getDate(), last = lastDay(d.getFullYear(), d.getMonth());
    return md === 'last' ? d.getDate() === last : d.getDate() === Math.min(md, last);
  }
  return true;
}

export function firstOn(rep, today) {
  if (!rep || rep.m === 'after' || rep.u === 'd' || rep.u === 'y') return today;
  if (matchesOn(rep, today)) return today;
  if (rep.u === 'w' && rep.wd) {
    for (let i = 1; i <= 7; i++) { const d = key(addDays(parseKey(today), i)); if (rep.wd.includes(weekday(parseKey(d)))) return d; }
  }
  if (rep.u === 'mo' && rep.md) {
    const d = parseKey(today), last = lastDay(d.getFullYear(), d.getMonth()), want = rep.md === 'last' ? last : Math.min(rep.md, last);
    return want >= d.getDate() ? key(new Date(d.getFullYear(), d.getMonth(), want)) : addMonths(key(new Date(d.getFullYear(), d.getMonth(), 1)), 1, rep.md);
  }
  return today;
}

const UNIT_WORDS = { d: ['день', 'дня', 'дней'], w: ['неделю', 'недели', 'недель'], mo: ['месяц', 'месяца', 'месяцев'], y: ['год', 'года', 'лет'] };
const EVERY_ONE = { d: 'Каждый день', w: 'Каждую неделю', mo: 'Каждый месяц', y: 'Каждый год' };
const every = (n, u) => {
  const [one, few, many] = UNIT_WORDS[u], word = plural(n, one, few, many);
  return `${word === one ? (u === 'w' ? 'Каждую' : 'Каждый') : 'Каждые'} ${n} ${word}`;
};
const wdList = wd => wd.length === 5 && wd.every((v, i) => v === i) ? 'по будням' : wd.length === 2 && wd[0] === 5 && wd[1] === 6 ? 'по выходным' : 'по ' + wd.map(i => WD_SHORT[i]).join(', ');

export function repLabel(rep) {
  if (!rep) return '';
  const { n, u } = rep;
  if (rep.m === 'after') {
    const [one, few, many] = UNIT_WORDS[u];
    return n === 1 ? `Через ${one} после выполнения` : `Через ${n} ${plural(n, one, few, many)} после выполнения`;
  }
  const base = n === 1 ? EVERY_ONE[u] : every(n, u);
  if (u === 'w' && rep.wd) {
    const list = wdList(rep.wd);
    if (n === 1) return rep.wd.length === 1 ? WD_EVERY[rep.wd[0]] : list[0].toUpperCase() + list.slice(1);
    return `${base}, ${list}`;
  }
  if (u === 'mo' && rep.md === 'last') return n === 1 ? 'Последний день каждого месяца' : `${base}, в последний день`;
  if (u === 'mo' && rep.md) return `${base}, ${rep.md}-го числа`;
  return base;
}

export function repGhosts(rep, from, last, today, max = 60) {
  const out = [];
  if (!rep) return out;
  let cur = from;
  for (let i = 0; i < max * 4 && out.length < max; i++) {
    const nx = rep.m === 'after' ? nextOccurrence(rep, cur, cur) : nextOccurrence(rep, cur, cur < today ? today : cur);
    if (!nx || nx > last || (rep.until && nx > rep.until)) break;
    out.push(nx);
    cur = nx;
  }
  return out;
}
