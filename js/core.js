
export const TEST_MODE = new URLSearchParams(location.search).has('test');
export const NS = TEST_MODE ? 'habit-tracker-test' : 'habit-tracker';
export const STORE = NS + '-v1';
export const THEME_STORE = NS + '-theme';
export const VIEW_STORE = NS + '-view';
export const GROUP_STORE = NS + '-group';
export const ICON_STORE = NS + '-icons';
export const NOTIFY_STORE = NS + '-notify';
export const OVER_HINT = NS + '-over-hint';
export const ACCENT_STORE = NS + '-accent';
export const DATA_STORE = NS + '-data';
export const PRIVACY_EMAIL = '';
export const viewportHeight = () => window.visualViewport?.height ?? innerHeight;
export const VIEWS = {
  '7d': { id: '7d', short: 'Неделя', label: 'За последние 7 дней' },
  '30d': { id: '30d', short: 'Месяц', label: 'За последний месяц', head: 'Последние 30 дней', cells: 'days', days: 30 },
  '90d': { id: '90d', short: 'Квартал', label: 'За последний квартал', head: 'Последние 13 недель', cells: 'weeks', weeks: 13 },
  '365d': { id: '365d', short: 'Год', label: 'За последний год', head: 'Последние 12 месяцев', cells: 'weeks', weeks: 53 },
};
export const $ = id => document.getElementById(id);
export const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export let reducedMotion = motionQuery.matches;
motionQuery.addEventListener?.('change', e => { reducedMotion = e.matches; });
export const RING_C = 2 * Math.PI * 22;
export const DAY_C = 2 * Math.PI * 15.5;
export const HERO_C = 2 * Math.PI * 36;
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b'];
export const TIMES = [
  { v: 'morning', label: 'Утро', icon: '🌅' },
  { v: 'day', label: 'День', icon: '☀️' },
  { v: 'evening', label: 'Вечер', icon: '🌙' },
  { v: 'any', label: 'Любое', icon: '🕐' },
];
export const TEMPLATES = [
  { name: 'Пить воду', icon: 'water', color: '#0ea5e9', target: 8, unit: 'стаканов', time: 'any' },
  { name: 'Зарядка', icon: 'dumbbell', color: '#f97316', target: 1, time: 'morning' },
  { name: 'Медитация', icon: 'meditate', color: '#a855f7', target: 1, time: 'morning' },
  { name: 'Чтение', icon: 'book', color: '#2563eb', target: 20, unit: 'страниц', time: 'evening' },
  { name: '10 000 шагов', icon: 'walk', color: '#22c55e', target: 1, time: 'any' },
  { name: 'Лечь до 23:00', icon: 'sleep', color: '#64748b', target: 1, time: 'evening' },
  { name: 'Без соцсетей утром', icon: 'phoneoff', color: '#ef4444', target: 1, time: 'morning' },
  { name: 'Овощи и фрукты', icon: 'salad', color: '#14b8a6', target: 3, unit: 'порции', time: 'day' },
  { name: 'Дневник', icon: 'pen', color: '#eab308', target: 1, time: 'evening' },
  { name: 'Витамины', icon: 'pill', color: '#ec4899', target: 1, time: 'morning' },
  { name: 'Без алкоголя', icon: 'noalcohol', color: '#8b5cf6', target: 1, time: 'any' },
  { name: 'Йога', icon: 'meditate', color: '#14b8a6', target: 60, step: 15, unit: 'минут', time: 'morning' },
  { name: 'Подтягивания', icon: 'strong', color: '#f97316', target: 100, step: 5, unit: 'раз', time: 'any' },
];
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export const fromMin = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const todayKey = () => key(new Date());
export const isToday = d => key(d) === todayKey();
export const weekday = d => (d.getDay() + 6) % 7;
export const SCHED_TYPES = ['daily', 'weekdays', 'perWeek', 'everyNWeeks', 'monthly'];
export const scheduleOf = h => h.schedule || (h.days ? { type: 'weekdays', days: h.days } : { type: 'daily' });
export const monday = d => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -weekday(d));
export const monthDays = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
export const domOn = (dom, d) => Math.min(dom, monthDays(d));
export function weekIndex(anchor, d) {
  return Math.round((monday(d) - monday(parseKey(anchor))) / (7 * 864e5));
}
export function schedDue(sc, d) {
  switch (sc.type) {
    case 'weekdays': return sc.days.includes(weekday(d));
    case 'everyNWeeks': { const w = weekIndex(sc.anchor, d); return ((w % sc.every) + sc.every) % sc.every === 0 && sc.days.includes(weekday(d)); }
    case 'monthly': return d.getDate() === domOn(sc.dom, d);
    default: return true;
  }
}
export const withYear = s => s.replace(/\s?г\.?$/, '') + ' г.';
export const fmtLong = k => withYear(parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const days = n => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
export const ofDays = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'дня' : 'дней'}`;
export const daysText = ds => ds.length === 7 ? 'каждый день' : ds.length === 5 && ds.every(x => x < 5) ? 'по будням'
  : ds.length === 2 && ds.every(x => x >= 5) ? 'по выходным' : ds.map(x => WEEKDAYS[x]).join(', ');
export function schedText(h) {
  const sc = h.schedule || (h.days ? { type: 'weekdays', days: h.days } : { type: 'daily' });
  switch (sc.type) {
    case 'weekdays': return daysText(sc.days);
    case 'perWeek': return `${sc.times} ${plural(sc.times, 'раз', 'раза', 'раз')} в неделю`;
    case 'everyNWeeks': return `${sc.every === 2 ? 'раз в две недели' : `раз в ${sc.every} ${plural(sc.every, 'неделю', 'недели', 'недель')}`}: ${daysText(sc.days)}`;
    case 'monthly': return `раз в месяц, ${sc.dom} числа`;
    default: return 'каждый день';
  }
}

export const EMOJI_FONT_URL = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
export function hasColorEmoji() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = `24px ${getComputedStyle(document.documentElement).getPropertyValue('--f-emoji').trim() || 'sans-serif'}`;
    x.textBaseline = 'top';
    x.fillStyle = '#000';
    x.fillText('🙂', 2, 2);
    const d = x.getImageData(0, 0, 32, 32).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 128 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) return true;
    }
    return false;
  } catch { return false; }
}
let emojiChecked = false;
export function ensureEmojiFont(check = hasColorEmoji) {
  if (emojiChecked) return false;
  emojiChecked = true;
  if (check()) return false;
  document.head.append(Object.assign(document.createElement('link'), { id: 'emojiFont', rel: 'stylesheet', href: EMOJI_FONT_URL }));
  return true;
}
export const resetEmojiCheck = () => { emojiChecked = false; document.getElementById('emojiFont')?.remove(); };

export const redUi = () =>document.documentElement.hasAttribute('data-ui-red');
export const getPref = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
export const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
export const UA = navigator.userAgent;
export const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isMacSafari = !isIOS && /Macintosh/.test(UA) && /Safari\//.test(UA) && !/Chrome|Chromium|Edg|Firefox/.test(UA);
export const isAndroid = /Android/.test(UA);
