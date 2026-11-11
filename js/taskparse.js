import { addDays, key, parseKey } from './core.js?v=3.2d';
import { firstOn, REP_MAX } from './repeat.js?v=3.2d';

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEK_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
const WEEK_GEN = ['понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы', 'воскресенья'];
const DUE_PRE = '(?:до|не\\s+позже|дедлайн|срок(?:\\s+до)?)\\s+';
const NOT_AFTER_DUE = '(?<!(?:до|позже)\\s+)';
const L = '(?<![\\p{L}\\p{N}])', Rb = '(?![\\p{L}\\p{N}])';
const re = s => new RegExp(L + s + Rb, 'gu');
const pad = n => String(n).padStart(2, '0');
const hhmm = (h, m) => `${pad(h)}:${pad(m)}`;
const dayOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const validDate = (y, m, d) => { const x = new Date(y, m - 1, d); return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? x : null; };
const weekdayOf = d => (d.getDay() + 6) % 7;

function dateRules(today) {
  return [
    [re('(?:на\\s+)?послезавтра'), () => addDays(today, 2)],
    [re('(?:на\\s+)?завтра'), () => addDays(today, 1)],
    [re('(?:на\\s+)?сегодня'), () => today],
    [re('через\\s+(\\d{1,3})\\s+(?:дней|дня|день)'), m => +m[1] > 0 ? addDays(today, +m[1]) : null],
    [re('через\\s+неделю'), () => addDays(today, 7)],
    [re('через\\s+(\\d{1,2})\\s+(?:недель|недели|неделю)'), m => +m[1] > 0 ? addDays(today, 7 * +m[1]) : null],
    [re('(?:в|во)\\s+(' + WEEK_ACC.join('|') + ')'), m => { const w = WEEK_ACC.indexOf(m[1]); let n = (w - weekdayOf(today) + 7) % 7; return addDays(today, n || 7); }],
    [re('(?:на\\s+)?(\\d{1,2})\\s+(' + MONTHS_GEN.join('|') + ')(?:\\s+(\\d{4})(?:\\s*(?:года|г\\.|г))?)?'), m => fullDate(today, +m[1], MONTHS_GEN.indexOf(m[2]) + 1, m[3] && +m[3])],
    [new RegExp('(?<![\\p{L}\\p{N}.,])(?:на\\s+)?(\\d{1,2})\\.(\\d{2})(?:\\.(\\d{4}))?(?![\\p{L}\\p{N}]|[.,]\\d)', 'gu'), m => fullDate(today, +m[1], +m[2], m[3] && +m[3])],
  ];
}
const UNIT_RE = '(дней|дня|день|недель|недели|неделю|месяцев|месяца|месяц|лет|года|год)';
const unitOf = w => w.startsWith('д') ? 'd' : w.startsWith('нед') ? 'w' : w.startsWith('мес') ? 'mo' : 'y';
const WEEK_PL = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];
const NOT_NEG = '(?!\\s+не(?![\\p{L}\\p{N}]))';
const mk = (m, n, u, extra = {}) => Number.isInteger(n) && n >= 1 && n <= REP_MAX[u] ? { m, n, u, ...extra } : null;
function repRules() {
  return [
    [re('(?:через|раз\\s+в)\\s+(?:(\\d{1,3})\\s+)?' + UNIT_RE + '\\s+после\\s+выполнения'), m => mk('after', m[1] ? +m[1] : 1, unitOf(m[2]))],
    [re('каждый\\s+день|ежедневно'), () => mk('cal', 1, 'd')],
    [re('каждые\\s+(\\d{1,3})\\s+' + UNIT_RE), m => mk('cal', +m[1], unitOf(m[2]))],
    [re('(?:каждый|каждую|каждое)\\s+(' + WEEK_ACC.join('|') + ')'), m => mk('cal', 1, 'w', { wd: [WEEK_ACC.indexOf(m[1])] })],
    [re('по\\s+(' + WEEK_PL.join('|') + ')' + NOT_NEG), m => mk('cal', 1, 'w', { wd: [WEEK_PL.indexOf(m[1])] })],
    [re('по\\s+будням' + NOT_NEG), () => mk('cal', 1, 'w', { wd: [0, 1, 2, 3, 4] })],
    [re('по\\s+выходным' + NOT_NEG), () => mk('cal', 1, 'w', { wd: [5, 6] })],
    [re('(\\d{1,2})(?:-?го)?\\s+числа\\s+каждого\\s+месяца'), m => +m[1] >= 1 && +m[1] <= 31 ? mk('cal', 1, 'mo', { md: +m[1] }) : null],
    [re('каждую\\s+неделю|раз\\s+в\\s+неделю|еженедельно'), () => mk('cal', 1, 'w')],
    [re('каждый\\s+месяц|раз\\s+в\\s+месяц|ежемесячно'), () => mk('cal', 1, 'mo')],
    [re('каждый\\s+год|раз\\s+в\\s+год|ежегодно'), () => mk('cal', 1, 'y')],
    [re('раз\\s+в\\s+(\\d{1,3})\\s+' + UNIT_RE), m => mk('cal', +m[1], unitOf(m[2]))],
  ];
}

function dueRules(today) {
  const nextWd = w => { const n = (w - weekdayOf(today) + 7) % 7; return addDays(today, n || 7); };
  return [
    [re(DUE_PRE + 'послезавтра'), () => addDays(today, 2)],
    [re(DUE_PRE + 'завтра'), () => addDays(today, 1)],
    [re(DUE_PRE + 'сегодня'), () => today],
    [re(DUE_PRE + 'через\\s+(\\d{1,3})\\s+(?:дней|дня|день)'), m => +m[1] > 0 ? addDays(today, +m[1]) : null],
    [re(DUE_PRE + 'через\\s+неделю'), () => addDays(today, 7)],
    [re(DUE_PRE + '(?:(?:в|во)\\s+)?(' + WEEK_GEN.join('|') + '|' + WEEK_ACC.join('|') + ')'), m => nextWd(Math.max(WEEK_GEN.indexOf(m[1]), WEEK_ACC.indexOf(m[1])))],
    [re(DUE_PRE + '(\\d{1,2})\\s+(' + MONTHS_GEN.join('|') + ')(?:\\s+(\\d{4})(?:\\s*(?:года|г\\.|г))?)?'), m => fullDate(today, +m[1], MONTHS_GEN.indexOf(m[2]) + 1, m[3] && +m[3])],
    [new RegExp('(?<![\\p{L}\\p{N}.,])' + DUE_PRE + '(\\d{1,2})\\.(\\d{2})(?:\\.(\\d{4}))?(?![\\p{L}\\p{N}]|[.,]\\d)', 'gu'), m => fullDate(today, +m[1], +m[2], m[3] && +m[3])],
  ];
}
function fullDate(today, d, mo, y) {
  if (y) return y >= 2000 && y <= 2100 ? validDate(y, mo, d) : null;
  const x = validDate(today.getFullYear(), mo, d);
  if (!x) return validDate(today.getFullYear() + 1, mo, d);
  return x < today ? validDate(today.getFullYear() + 1, mo, d) : x;
}

const PART = { утра: h => (h >= 1 && h <= 11 ? h : null), дня: h => (h === 12 ? 12 : h >= 1 && h <= 5 ? h + 12 : null), вечера: h => (h >= 4 && h <= 11 ? h + 12 : null), ночи: h => (h === 12 ? 0 : h >= 1 && h <= 5 ? h : h >= 9 && h <= 11 ? h + 12 : null) };

export function parseQuick(text, now = new Date()) {
  const src = String(text ?? ''), low = src.toLowerCase().replace(/ё/g, 'е'), today = dayOf(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const none = { text: src, found: [] };
  const taken = [];
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  const first = (rules) => {
    let best = null;
    for (const [rx, fn] of rules) {
      rx.lastIndex = 0;
      for (let m; (m = rx.exec(low));) {
        if (!free(m.index, m.index + m[0].length)) continue;
        const v = fn(m);
        if (v == null) continue;
        if (!best || m.index < best.from) best = { from: m.index, to: m.index + m[0].length, v };
        break;
      }
    }
    return best;
  };

  let date = null, time = null, dayWord = null, important = false, due = null, rep = null;
  const bang = /\s*!+\s*$/u.exec(src);
  if (bang && src.slice(0, bang.index).trim()) { important = true; taken.push([bang.index, src.length]); }
  const rr = first(repRules());
  if (rr) { rep = rr.v; taken.push([rr.from, rr.to]); }
  const dd = first(dueRules(today));
  if (dd) { due = dd.v; taken.push([dd.from, dd.to]); }
  const rel = first([
    [re('через\\s+(?:час|(\\d{1,3})\\s+(?:минут|минуты|минуту|мин))'), m => (m[1] ? +m[1] : 60)],
    [re('через\\s+(\\d{1,2})\\s+(?:часов|часа|час)'), m => +m[1] * 60],
    [re('через\\s+полчаса'), () => 30],
  ]);
  if (rel && rel.v > 0) {
    const total = Math.ceil((nowMin + rel.v) / 5) * 5, d = addDays(today, Math.floor(total / 1440)), mm = total % 1440;
    date = d; time = hhmm(Math.floor(mm / 60), mm % 60);
    taken.push([rel.from, rel.to]);
  }
  if (!date) {
    const dm = first(dateRules(today));
    if (dm) { date = dm.v; dayWord = dm; taken.push([dm.from, dm.to]); }
  }
  if (!time) {
    const tm = first([
      [new RegExp('(?<![\\p{L}\\p{N}])' + NOT_AFTER_DUE + '(?:в\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s+(утра|дня|вечера|ночи)(?![\\p{L}\\p{N}])', 'gu'), m => { const h = PART[m[3]](+m[1]), mi = m[2] ? +m[2] : 0; return h == null || mi > 59 ? null : hhmm(h, mi); }],
      [new RegExp('(?<![\\p{L}\\p{N}:.])' + NOT_AFTER_DUE + '(?:в\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)(?![\\p{L}\\p{N}]|[:.]\\d)', 'gu'), m => hhmm(+m[1], +m[2])],
    ]);
    if (tm) { time = tm.v; taken.push([tm.from, tm.to]); }
    else if (dayWord) {
      const after = /^\s+в\s+([01]?\d|2[0-3])(?![\p{L}\p{N}:.,])/u.exec(low.slice(dayWord.to));
      const before = /(?<![\p{L}\p{N}])в\s+([01]?\d|2[0-3])\s+$/u.exec(low.slice(0, dayWord.from));
      if (after) { time = hhmm(+after[1], 0); taken.push([dayWord.to, dayWord.to + after[0].length]); }
      else if (before) { time = hhmm(+before[1], 0); taken.push([before.index, dayWord.from]); }
    }
  }
  let someday = false;
  if (!date && !time && !due && !rep) { const sd = first([[/(?<![\p{L}\p{N}])когда[\s-]?нибудь(?![\p{L}\p{N}])/gu, () => true]]); if (sd) { someday = true; taken.push([sd.from, sd.to]); } }
  if (time && !date) date = time < hhmm(Math.floor(nowMin / 60), nowMin % 60) ? addDays(today, 1) : today;
  if (!taken.length) return none;
  taken.sort((a, b) => a[0] - b[0]);
  let out = '', pos = 0;
  for (const [a, b] of taken) { out += src.slice(pos, a) + ' '; pos = b; }
  out = (out + src.slice(pos)).replace(/\s+/g, ' ').replace(/^[\s,.;:—–-]+|[\s,;:—–-]+$/g, '').replace(/\s+([,.;:!?])/g, '$1').trim();
  if (!out) return none;
  const res = { text: out, found: taken.map(([from, to]) => ({ label: src.slice(from, to).trim(), from, to })) };
  if (important) res.important = true;
  if (rep) {
    const base = date || today;
    if (rep.m === 'cal' && rep.u === 'w' && !rep.wd) rep.wd = [weekdayOf(base)];
    if (rep.m === 'cal' && rep.u === 'mo' && !rep.md) rep.md = base.getDate();
    res.rep = rep;
    if (!date) date = parseKey(firstOn(rep, key(today)));
  }
  if (date) res.date = key(date);
  if (due) res.due = key(due);
  if (time) res.time = time;
  if (someday) res.someday = true;
  return res;
}
