import { addDays, key, parseKey } from './core.js?v=3.4b';
import { firstOn, REP_MAX } from './repeat.js?v=3.4b';

const WEEK_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
const WEEK_GEN = ['понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы', 'воскресенья'];
const WEEK_DAT = ['понедельнику', 'вторнику', 'среде', 'четвергу', 'пятнице', 'субботе', 'воскресенью'];
const WEEK_PL = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];
const WD_ABBR = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MON_RE = '(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сент|сен|окт|ноя|дек)\\.?';
const MON_KEYS = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const monthOf = w => MON_KEYS.findIndex(k => w.startsWith(k) && !(k === 'ма' && w.startsWith('мар'))) + 1;
const NUMS = { один: 1, одну: 1, одна: 1, два: 2, две: 2, пару: 2, пара: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, пятнадцать: 15, двадцать: 20, тридцать: 30, сорок: 40 };
const NUM = '(\\d{1,3}|' + Object.keys(NUMS).join('|') + ')';
const num = s => /^\d/.test(s) ? +s : NUMS[s];
const ORD = ['первого', 'второго', 'третьего', 'четвертого', 'пятого', 'шестого', 'седьмого', 'восьмого', 'девятого', 'десятого', 'одиннадцатого', 'двенадцатого'];
const DUE_PRE = '(?:до|не\\s+позже|дедлайн|срок(?:\\s+до)?)\\s+', DUE_K = '(?:до|не\\s+позже|дедлайн|срок(?:\\s+до)?|к)\\s+';
const NOT_AFTER_DUE = '(?<!(?:до|позже)\\s+)';
const L = '(?<![\\p{L}\\p{N}])', Rb = '(?![\\p{L}\\p{N}])';
const re = s => new RegExp(L + s + Rb, 'gu');
const pad = n => String(n).padStart(2, '0');
const hhmm = (h, m) => `${pad(h)}:${pad(m)}`;
const dayOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const validDate = (y, m, d) => { const x = new Date(y, m - 1, d); return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? x : null; };
const weekdayOf = d => (d.getDay() + 6) % 7;
const lastOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => { const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate(); return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last)); };
const wdIndex = w => [WEEK_ACC, WEEK_GEN, WEEK_DAT, WEEK_PL, WD_ABBR].reduce((i, list) => i >= 0 ? i : list.indexOf(w), -1);
const nextWd = (today, w) => { const n = (w - weekdayOf(today) + 7) % 7; return addDays(today, n || 7); };
const weekStart = d => addDays(d, -weekdayOf(d));
const saturday = today => { const w = weekdayOf(today); return w >= 5 ? today : addDays(today, 5 - w); };
const nearDay = (today, md) => {
  for (let i = 0; i < 3; i++) {
    const b = new Date(today.getFullYear(), today.getMonth() + i, 1), x = validDate(b.getFullYear(), b.getMonth() + 1, md);
    if (x && x >= today) return x;
  }
  return null;
};
const PART = { утра: h => (h >= 1 && h <= 11 ? h : null), дня: h => (h === 12 ? 12 : h >= 1 && h <= 5 ? h + 12 : null), вечера: h => (h >= 4 && h <= 11 ? h + 12 : null), ночи: h => (h === 12 ? 0 : h >= 1 && h <= 5 ? h : h >= 9 && h <= 11 ? h + 12 : null) };
const PART_RE = '(утра|дня|вечера|ночи)';
const DAY_PART = { утром: '09:00', днем: '13:00', вечером: '19:00' };
const withPart = (h, m, part) => { const x = part ? PART[part](h) : h; return x == null ? null : hhmm(x, m); };

const yearOf = y => y && (y.length === 2 ? 2000 + +y : +y);
const nearRules = (pre, preK, today) => [
  [re(preK + 'послезавтра'), () => addDays(today, 2)],
  [re(preK + 'завтра'), () => addDays(today, 1)],
  [re(pre + 'сегодня'), () => today],
  [re(pre + 'через\\s+' + NUM + '\\s+(?:дней|дня|день)'), m => num(m[1]) > 0 ? addDays(today, num(m[1])) : null],
  [re(pre + 'через\\s+неделю'), () => addDays(today, 7)],
];
const exactRules = (pre, today) => [
  [re(pre + '(\\d{1,2})\\s+' + MON_RE + '(?:\\s+(\\d{4})(?:\\s*(?:года|г\\.|г))?)?'), m => fullDate(today, +m[1], monthOf(m[2]), yearOf(m[3]))],
  [new RegExp('(?<![\\p{L}\\p{N}.,/])(?<!(?:^|\\s)в\\s)' + pre + '(\\d{1,2})[./](\\d{2})(?:[./](\\d{4}|\\d{2}))?(?![\\p{L}\\p{N}]|[.,/]\\d)', 'gu'), m => fullDate(today, +m[1], +m[2], yearOf(m[3]))],
];

const WD_ANY = [...WEEK_ACC, ...WD_ABBR].join('|');
const WEEK_ACC_RE = '(?:в|во)\\s+(?:(следующ(?:ий|ую|ее)|эт(?:от|у|о)|ближайш(?:ий|ую|ее))\\s+)?(' + WD_ANY + ')';
function dateRules(today) {
  return [
    ...nearRules('(?:на\\s+)?', '(?:на\\s+)?', today).slice(0, 3),
    ...nearRules('', '', today).slice(3),
    [re('через\\s+' + NUM + '\\s+(?:недель|недели|неделю)'), m => num(m[1]) > 0 && num(m[1]) < 100 ? addDays(today, 7 * num(m[1])) : null],
    [re('через\\s+месяц'), () => addMonths(today, 1)],
    [re('через\\s+полгода'), () => addMonths(today, 6)],
    [re('через\\s+' + NUM + '\\s+(?:месяцев|месяца)'), m => num(m[1]) > 0 && num(m[1]) <= 36 ? addMonths(today, num(m[1])) : null],
    [re('через\\s+год'), () => addMonths(today, 12)],
    [re('через\\s+' + NUM + '\\s+(?:лет|года)'), m => num(m[1]) > 0 && num(m[1]) <= 10 ? addMonths(today, 12 * num(m[1])) : null],
    [re(WEEK_ACC_RE), m => {
      const w = wdIndex(m[2]), mod = m[1] || '';
      if (mod.startsWith('следующ')) return addDays(weekStart(today), 7 + w);
      if (mod.startsWith('эт')) { const d = addDays(weekStart(today), w); return d < today ? addDays(d, 7) : d; }
      return nextWd(today, w);
    }],
    [re('(?:на\\s+выходных|в\\s+выходные)'), () => saturday(today)],
    [re('на\\s+следующей\\s+неделе'), () => addDays(weekStart(today), 7)],
    [re('в\\s+конце\\s+месяца'), () => lastOfMonth(today)],
    ...exactRules('(?:на\\s+)?', today),
    [re('(?:на\\s+)?(\\d{1,2})-?го\\s+числа'), m => nearDay(today, +m[1])],
    [new RegExp(L + '(?:на\\s+)?(\\d{1,2})-?го(?=\\s*(?:$|[,.;!?]))', 'gu'), m => nearDay(today, +m[1])],
  ];
}

const UNIT_RE = '(дней|дня|день|недель|недели|неделю|месяцев|месяца|месяц|лет|года|год)';
const unitOf = w => w.startsWith('д') ? 'd' : w.startsWith('нед') ? 'w' : w.startsWith('мес') ? 'mo' : 'y';
const NOT_NEG = '(?!\\s+не(?![\\p{L}\\p{N}]))';
const mk = (m, n, u, extra = {}) => Number.isInteger(n) && n >= 1 && n <= REP_MAX[u] ? { m, n, u, ...extra } : null;
const listOf = alt => '((?:' + alt + ')(?:(?:\\s*,\\s*|\\s+и\\s+)(?:' + alt + '))*)';
const days = s => [...new Set(s.split(/[\s,]+/).map(wdIndex).filter(i => i >= 0))].sort((a, b) => a - b);
function repRules() {
  return [
    [re('(?:через|раз\\s+в)\\s+(?:' + NUM + '\\s+)?' + UNIT_RE + '\\s+после\\s+выполнения'), m => mk('after', m[1] ? num(m[1]) : 1, unitOf(m[2]))],
    [re('каждое\\s+утро'), () => ({ rep: mk('cal', 1, 'd'), time: '09:00' })],
    [re('каждый\\s+вечер'), () => ({ rep: mk('cal', 1, 'd'), time: '19:00' })],
    [re('каждый\\s+день|ежедневно'), () => mk('cal', 1, 'd')],
    [re('через\\s+день'), () => mk('cal', 2, 'd')],
    [re('каждые\\s+выходные'), () => mk('cal', 1, 'w', { wd: [5, 6] })],
    [re('каждые\\s+' + NUM + '\\s+' + UNIT_RE), m => mk('cal', num(m[1]), unitOf(m[2]))],
    [re('(?:каждый|каждую|каждое)\\s+' + listOf(WD_ANY)), m => mk('cal', 1, 'w', { wd: days(m[1]) })],
    [re('по\\s+' + listOf([...WEEK_PL, ...WD_ABBR].join('|')) + NOT_NEG), m => mk('cal', 1, 'w', { wd: days(m[1]) })],
    [re('по\\s+будням' + NOT_NEG), () => mk('cal', 1, 'w', { wd: [0, 1, 2, 3, 4] })],
    [re('по\\s+выходным' + NOT_NEG), () => mk('cal', 1, 'w', { wd: [5, 6] })],
    [re('(\\d{1,2})(?:-?го)?\\s+числа\\s+каждого\\s+месяца'), m => +m[1] >= 1 && +m[1] <= 31 ? mk('cal', 1, 'mo', { md: +m[1] }) : null],
    [re('каждую\\s+неделю|раз\\s+в\\s+неделю|еженедельно'), () => mk('cal', 1, 'w')],
    [re('каждый\\s+месяц|раз\\s+в\\s+месяц|ежемесячно'), () => mk('cal', 1, 'mo')],
    [re('каждый\\s+год|раз\\s+в\\s+год|ежегодно'), () => mk('cal', 1, 'y')],
    [re('раз\\s+в\\s+' + NUM + '\\s+' + UNIT_RE), m => mk('cal', num(m[1]), unitOf(m[2]))],
  ];
}

function dueRules(today) {
  return [
    ...nearRules(DUE_PRE, DUE_K, today),
    [re('(?:до\\s+конца|к\\s+концу)\\s+недели'), () => addDays(weekStart(today), 6)],
    [re('(?:до\\s+конца|к\\s+концу)\\s+месяца'), () => lastOfMonth(today)],
    [re(DUE_K + '(?:(?:в|во)\\s+)?(' + [...WEEK_GEN, ...WEEK_ACC, ...WEEK_DAT, ...WD_ABBR].join('|') + ')'), m => nextWd(today, wdIndex(m[1]))],
    ...exactRules(DUE_K, today),
  ];
}
function fullDate(today, d, mo, y) {
  if (!mo) return null;
  if (y) return y >= 2000 && y <= 2100 ? validDate(y, mo, d) : null;
  const x = validDate(today.getFullYear(), mo, d);
  if (!x) return validDate(today.getFullYear() + 1, mo, d);
  return x < today ? validDate(today.getFullYear() + 1, mo, d) : x;
}

const timeRules = () => [
  [new RegExp(L + NOT_AFTER_DUE + '(?:в\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s+(?:(?:часов|часа|час)\\s+)?' + PART_RE + Rb, 'gu'), m => { const mi = m[2] ? +m[2] : 0; return mi > 59 ? null : withPart(+m[1], mi, m[3]); }],
  [new RegExp('(?<![\\p{L}\\p{N}:.])' + NOT_AFTER_DUE + '(?:в\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)(?![\\p{L}\\p{N}]|[:.]\\d)', 'gu'), m => hhmm(+m[1], +m[2])],
  [new RegExp(L + 'в\\s+([01]?\\d|2[0-3])\\.([0-5]\\d)(?![\\p{L}\\p{N}]|[:.]\\d)', 'gu'), m => hhmm(+m[1], +m[2])],
  [re('в\\s+([01]?\\d|2[0-3])\\s*(?:часов|часа|час|ч\\.?)'), m => hhmm(+m[1], 0)],
  [re('(?:в\\s+(?:половине|пол)\\s+|(?:в\\s+)?пол-?)(' + ORD.join('|') + ')(?:\\s+' + PART_RE + ')?'), m => withPart(ORD.indexOf(m[1]) || 12, 30, m[2])],
  [re('в\\s+обед'), () => '13:00'],
  [re('в\\s+полдень'), () => '12:00'],
];

export function parseQuick(text, now = new Date(), lists = []) {
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

  let repTime = null, date = null, time = null, dayWord = null, important = false, due = null, rep = null, list = null;
  const bang = /\s*!+\s*$/u.exec(src);
  if (bang && src.slice(0, bang.index).trim()) { important = true; taken.push([bang.index, src.length]); }
  const imp = first([[new RegExp(L + '(?<!не\\s)(?:срочно|важно)' + Rb, 'gu'), () => true]]);
  if (imp) { important = true; taken.push([imp.from, imp.to]); }
  if (lists.length) {
    const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[\s_-]+/g, '');
    const tag = first([[/(?<![\p{L}\p{N}])#([\p{L}\p{N}_-]{1,40})/gu, m => {
      const t = norm(m[1]);
      return lists.find(l => norm(l.name) === t) || (t.length >= 2 ? lists.find(l => norm(l.name).startsWith(t)) : null) || null;
    }]]);
    if (tag) { list = tag.v; taken.push([tag.from, tag.to]); }
  }
  const rr = first(repRules());
  if (rr) {
    if (rr.v.rep) { rep = rr.v.rep; repTime = rr.v.time; } else rep = rr.v;
    taken.push([rr.from, rr.to]);
  }
  const dd = first(dueRules(today));
  if (dd) { due = dd.v; taken.push([dd.from, dd.to]); }
  const rel = first([
    [re('через\\s+час'), () => 60],
    [re('через\\s+полчаса'), () => 30],
    [re('через\\s+полтора\\s+часа'), () => 90],
    [re('через\\s+' + NUM + '\\s+(?:минут|минуты|минуту|мин\\.?)'), m => num(m[1])],
    [re('через\\s+' + NUM + '\\s+(?:часов|часа|час)'), m => num(m[1]) <= 48 ? num(m[1]) * 60 : null],
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
    const tm = first(timeRules());
    if (tm) { time = tm.v; taken.push([tm.from, tm.to]); }
  }
  if (!time) {
    const edge = (a, b) => !/[\p{L}\p{N}]/u.test(low.slice(0, a)) || !/[\p{L}\p{N}]/u.test(low.slice(b))
      || (dayWord && (/^\s*$/.test(low.slice(dayWord.to, a)) || /^\s*$/.test(low.slice(b, dayWord.from))));
    const pw = first([[re('(?<!с\\s)(утром|днем|вечером)'), m => edge(m.index, m.index + m[0].length) ? DAY_PART[m[1]] : null]]);
    if (pw) { time = pw.v; taken.push([pw.from, pw.to]); }
    else if (dayWord || rr) {
      const at = dayWord || rr;
      const after = /^\s+в\s+([01]?\d|2[0-3])(?![\p{L}\p{N}:.,])/u.exec(low.slice(at.to));
      const before = /(?<![\p{L}\p{N}])в\s+([01]?\d|2[0-3])\s+$/u.exec(low.slice(0, at.from));
      if (after) { time = hhmm(+after[1], 0); taken.push([at.to, at.to + after[0].length]); }
      else if (before) { time = hhmm(+before[1], 0); taken.push([before.index, at.from]); }
    }
  }
  if (!time && repTime) time = repTime;
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
  if (list) { res.list = list.id; res.listName = list.name; }
  if (rep) {
    const base = date || today;
    if (rep.m === 'cal' && rep.u === 'w' && !rep.wd?.length) rep.wd = [weekdayOf(base)];
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
