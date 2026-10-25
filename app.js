const TEST_MODE = new URLSearchParams(location.search).has('test');
const NS = TEST_MODE ? 'habit-tracker-test' : 'habit-tracker';
const STORE = NS + '-v1';
const THEME_STORE = NS + '-theme';
const VIEW_STORE = NS + '-view';
const GROUP_STORE = NS + '-group';
const ICON_STORE = NS + '-icons';
const cloudCfg = { ...(window.HABIT_CONFIG || {}) };
cloudCfg.supabaseUrl = String(cloudCfg.supabaseUrl || '').trim().replace(/\/(rest|auth|realtime|storage)\/v\d+\/?.*$/, '').replace(/\/+$/, '');
cloudCfg.supabaseKey = String(cloudCfg.supabaseKey || '').trim();
cloudCfg.vapidPublicKey = String(cloudCfg.vapidPublicKey || '').trim();
const cloud = {
  enabled: !TEST_MODE && /^https:\/\/[^/]+\.supabase\.(co|in)\/?$/.test(cloudCfg.supabaseUrl || '') && (cloudCfg.supabaseKey || '').length > 20,
  sb: null, session: null, channel: null,
  status: 'off',
  lastSync: null, error: '',
  pushing: false, again: false, timer: null, applying: false,
};
const VIEWS = {
  '7d': { id: '7d', short: 'Неделя', label: 'За последние 7 дней' },
  '30d': { id: '30d', short: 'Месяц', label: 'За последний месяц', head: 'Последние 30 дней', cells: 'days', days: 30 },
  '90d': { id: '90d', short: 'Квартал', label: 'За последний квартал', head: 'Последние 13 недель', cells: 'weeks', weeks: 13 },
  '365d': { id: '365d', short: 'Год', label: 'За последний год', head: 'Последние 12 месяцев', cells: 'weeks', weeks: 53 },
};
const $ = id => document.getElementById(id);
const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RING_C = 2 * Math.PI * 22;
const DAY_C = 2 * Math.PI * 15.5;
const HERO_C = 2 * Math.PI * 36;
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const COLORS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b'];
const ICONS = {
  check:    { e: '✅', s: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5.3"/>' },
  water:    { e: '💧', s: '<path d="M12 3.5c3.2 4.1 5.5 7.4 5.5 10.6a5.5 5.5 0 0 1-11 0C6.5 10.9 8.8 7.6 12 3.5z"/><path d="M9.3 14.5a2.8 2.8 0 0 0 2.4 2.6"/>' },
  run:      { e: '🏃', s: '<path d="M3 12h3.5l2.5-6 4 12 2.5-6H21"/>' },
  meditate: { e: '🧘', s: '<circle cx="12" cy="5.5" r="2"/><path d="M12 9v4.5M7 11.5l5 2 5-2M4.5 19c2.5-1.8 5-2.5 7.5-2.5s5 .7 7.5 2.5"/>' },
  book:     { e: '📖', s: '<path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2zM12 6.5v13"/>' },
  books:    { e: '📚', s: '<rect x="3.5" y="15.5" width="17" height="4.5" rx="1.2"/><rect x="5.5" y="11" width="14" height="4.5" rx="1.2"/><rect x="4.5" y="6.5" width="13" height="4.5" rx="1.2"/><path d="M7 17.75h7M9 13.25h6.5M7.5 8.75h5"/>' },
  dumbbell: { e: '💪', s: '<path d="M7 7.5v9M17 7.5v9M4 9.5v5M20 9.5v5M7 12h10"/>' },
  strong:   { e: '🏋️', s: '<path d="M4.5 3.5v5M19.5 3.5v5M3 6h18"/><circle cx="12" cy="9.8" r="1.9"/><path d="M7.5 6l2 6.5h5l2-6.5M10 12.5l.6 4.5h2.8l.6-4.5M10.8 17l-1.8 3.5M13.2 17l1.8 3.5"/>' },
  salad:    { e: '🥗', s: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 11.5a4 4 0 0 1 4-4M13.5 11.5c0-3 1.5-5.5 4.5-6.5"/>' },
  sleep:    { e: '😴', s: '<path d="M19.5 14.5A7.8 7.8 0 0 1 9.5 4.5a7.8 7.8 0 1 0 10 10z"/><path d="M15 4.5h3l-3 3.5h3"/>' },
  walk:     { e: '🚶', s: '<path d="M8.5 3.5c1.6 0 2.5 1.8 2.5 4.2S10.1 12 8.5 12 6 10.1 6 7.7 6.9 3.5 8.5 3.5zM6.5 15h4v1.8a2 2 0 0 1-4 0zM15.5 8c1.6 0 2.5 1.8 2.5 4.2s-.9 4.3-2.5 4.3-2.5-1.9-2.5-4.3.9-4.2 2.5-4.2zM13.5 19.5h4v.3a2 2 0 0 1-4 0z"/>' },
  tooth:    { e: '🦷', s: '<path d="M8 4c1.6 0 2.4.8 4 .8S14.4 4 16 4c2.3 0 3.5 1.9 3.5 4.3 0 2.8-1.8 3.9-2 6.6-.2 2.6-.8 5.1-2.2 5.1-1.6 0-1.6-4-3.3-4s-1.7 4-3.3 4c-1.4 0-2-2.5-2.2-5.1-.2-2.7-2-3.8-2-6.6C4.5 5.9 5.7 4 8 4z"/>' },
  pill:     { e: '💊', s: '<path d="M10.2 4.7a4.6 4.6 0 0 1 6.5 6.5l-6.5 6.5a4.6 4.6 0 0 1-6.5-6.5z"/><path d="M7 8l6.5 6.5"/>' },
  pen:      { e: '✍️', s: '<path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="M12.5 7.5l4 4M4 21h16"/>' },
  target:   { e: '🎯', s: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>' },
  brain:    { e: '🧠', s: '<path d="M12 5.2C11.2 3.9 9.9 3.5 8.7 3.8 7.4 4.1 6.6 5.2 6.5 6.4 5 6.8 4 8.1 4.1 9.7 3.1 10.5 2.6 11.7 2.8 13 3 14.2 3.8 15.2 4.9 15.7 5 17.4 6.2 18.8 7.9 19.1 9.6 19.5 11 19.3 12 18.2zM12 5.2C12.8 3.9 14.1 3.5 15.3 3.8 16.6 4.1 17.4 5.2 17.5 6.4 19 6.8 20 8.1 19.9 9.7 20.9 10.5 21.4 11.7 21.2 13 21 14.2 20.2 15.2 19.1 15.7 19 17.4 17.8 18.8 16.1 19.1 14.4 19.5 13 19.3 12 18.2z"/><path d="M6.5 6.4c.1 1.2.9 2 2 2.3M4.1 9.7c.5.6 1.3 1 2.2 1M4.9 15.7c1.2.4 2.5 0 3.3-.9M17.5 6.4c-.1 1.2-.9 2-2 2.3M19.9 9.7c-.5.6-1.3 1-2.2 1M19.1 15.7c-1.2.4-2.5 0-3.3-.9"/>' },
  bulb:     { e: '💡', s: '<path d="M9.5 17.5h5M10.5 20.5h3M12 3.5a5.8 5.8 0 0 0-3.7 10.3c.8.7 1.2 1.6 1.2 2.6v1.1h5v-1.1c0-1 .4-1.9 1.2-2.6A5.8 5.8 0 0 0 12 3.5z"/>' },
  sunrise:  { e: '🌅', s: '<path d="M3 17.5h18M7 17.5a5 5 0 0 1 10 0M12 4v4.5M9.5 6.5L12 4l2.5 2.5M4.8 10.3l1.4 1.4M19.2 10.3l-1.4 1.4M8 20.5h8"/>' },
  nosmoke:  { e: '🚭', s: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>' },
  noalcohol: { e: '🚫', s: '<circle cx="12" cy="12" r="8.5"/><path d="M9 6.5h6l-.4 3.4a2.6 2.6 0 0 1-5.2 0zM12 12.5v4M10 16.5h4M6 6l12 12"/>' },
  phoneoff: { e: '📵', s: '<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 17.5h2M4 4l16 16"/>' },
  apple:    { e: '🍎', s: '<path d="M12 7.5c-1.8-1.2-6.5-1.3-6.5 4.3 0 4 2.3 8.2 4.3 8.2 1 0 1.4-.6 2.2-.6s1.2.6 2.2.6c2 0 4.3-4.2 4.3-8.2 0-5.6-4.7-5.5-6.5-4.3z"/><path d="M12 7.5c0-1.9.9-3.3 2.8-4"/>' },
  bike:     { e: '🚴', s: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="M6 16.5L9.5 9h5.5M18 16.5L14.5 7.5h2.5M9.5 9l3 7.5h-6.5"/>' },
  swim:     { e: '🏊', s: '<path d="M2.5 17c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.1-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.1 1.2M2.5 20.5c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.1-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.1 1.2"/><circle cx="16.5" cy="7" r="2"/><path d="M5 13.5l4.5-4.5 3.5 3"/>' },
  music:    { e: '🎸', s: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>' },
  coin:     { e: '💰', s: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.6.9 2.6 2.1-1.1 2-2.6 2c-1.2 0-2.2-.6-2.6-1.5M12 6.3v1.5M12 16.2v1.5"/>' },
  home:     { e: '🧹', s: '<path d="M4 11l8-6.5 8 6.5M6 9.5v10h12v-10M10 19.5v-5h4v5"/>' },
  leaf:     { e: '🌿', s: '<path d="M5 19c0-8.3 5.7-14 15-14 0 9.3-5.7 15-14 15"/><path d="M5 19l7.5-7.5"/>' },
  heart:    { e: '❤️', s: '<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>' },
  sun:      { e: '☀️', s: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>' },
  smile:    { e: '🙏', s: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 13.8c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2M9.2 9.6h.01M14.8 9.6h.01"/>' },
  chat:     { e: '🗣️', s: '<path d="M4.5 5.5h15v10.5H9.5L5.5 19.5v-3.5h-1z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>' },
  car:      { e: '🚗', s: '<path d="M5.6 16.5H4v-3.4c0-.8.5-1.4 1.2-1.7l1.5-.5 1.8-3.5c.4-.8 1.2-1.4 2.1-1.4h2.8c.9 0 1.7.6 2.1 1.4l1.8 3.5 1.5.5c.7.3 1.2.9 1.2 1.7v3.4h-1.6M9.4 16.5h5.2M6.7 10.9h10.6"/><circle cx="7.5" cy="16.7" r="1.9"/><circle cx="16.5" cy="16.7" r="1.9"/>' },
  laptop:   { e: '💻', s: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 18.5h19"/>' },
  paw:      { e: '🐶', s: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.3" cy="6.3" r="1.8"/><circle cx="13.7" cy="6.3" r="1.8"/><circle cx="17" cy="10" r="1.8"/><path d="M12 11.5c-2.6 0-5 3.6-5 5.6 0 1.5 1.1 2.4 2.5 2.4 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.4 0 2.5-.9 2.5-2.4 0-2-2.4-5.6-5-5.6z"/>' },
  coffee:   { e: '☕', s: '<path d="M4.5 9.5h12v4.5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.3a2.3 2.3 0 0 1 0 4.6h-1.5M8.5 3.5v2.5M12.5 3.5v2.5"/>' },
  clock:    { e: '⏰', s: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M4.5 5.5l2.5-2M19.5 5.5l-2.5-2"/>' },
};
const ICON_ART = {
  check: '<circle cx="12" cy="12" r="10" fill="#22c55e"/><path d="M12 2a10 10 0 0 1 9.5 7A10 10 0 0 0 4 6.5 10 10 0 0 1 12 2z" fill="#4ade80"/><path d="M7.5 12.4l3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  water: '<path d="M12 2.5c3.8 4.8 6.8 8.6 6.8 12.2a6.8 6.8 0 0 1-13.6 0C5.2 11.1 8.2 7.3 12 2.5z" fill="#38bdf8"/><path d="M12 2.5c3.8 4.8 6.8 8.6 6.8 12.2a6.8 6.8 0 0 1-6.8 6.8z" fill="#0ea5e9"/><ellipse cx="9.3" cy="14.6" rx="1.4" ry="2.4" fill="#e0f2fe" transform="rotate(-18 9.3 14.6)"/>',
  run: '<path d="M2.5 15.5l1.3-7 4.9 1.3 2.6 2.3 5.6 1.6c2.6.8 4.6 1.7 4.6 3.6v.7H2.5z" fill="#f97316"/><path d="M2.5 17.6h19v1.2a1.7 1.7 0 0 1-1.7 1.7H4.2a1.7 1.7 0 0 1-1.7-1.7z" fill="#334155"/><path d="M8.6 11l1.7-1.4M10.6 12.6l1.7-1.4M12.8 13.6l1.5-1.3" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><path d="M3.8 8.5l4.9 1.3-.6 2.4-4.8-.7z" fill="#fdba74"/>',
  meditate: '<ellipse cx="12" cy="19.5" rx="9" ry="2.5" fill="#e9d5ff"/><path d="M12 9.5c-2.6 0-4.3 1.8-4.6 4.8l-.4 3.7h10l-.4-3.7c-.3-3-2-4.8-4.6-4.8z" fill="#a855f7"/><path d="M3.5 18c2-1.8 4.6-2.6 8.5-2.6s6.5.8 8.5 2.6c-2.3.9-5 1.3-8.5 1.3S5.8 18.9 3.5 18z" fill="#7e22ce"/><circle cx="12" cy="6" r="3" fill="#fbbf24"/><path d="M7.4 13.5L5 15.5M16.6 13.5l2.4 2" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>',
  book: '<path d="M12 6.2C9.8 4.6 7 4 3 4v14c4 0 6.8.6 9 2.2z" fill="#60a5fa"/><path d="M12 6.2C14.2 4.6 17 4 21 4v14c-4 0-6.8.6-9 2.2z" fill="#3b82f6"/><path d="M4.5 5.4c3.1.1 5.3.6 7 1.7v11.4c-1.8-1-4-1.6-7-1.7zM19.5 5.4c-3.1.1-5.3.6-7 1.7v11.4c1.8-1 4-1.6 7-1.7z" fill="#fff"/><path d="M6 8.5c1.6.1 2.9.4 4 .9M6 11c1.6.1 2.9.4 4 .9M14 9.4c1.1-.5 2.4-.8 4-.9M14 11.9c1.1-.5 2.4-.8 4-.9" stroke="#bfdbfe" stroke-width="1" stroke-linecap="round"/>',
  dumbbell: '<rect x="7.5" y="11" width="9" height="2" rx="1" fill="#94a3b8"/><rect x="4.5" y="6.5" width="3.5" height="11" rx="1.4" fill="#475569"/><rect x="16" y="6.5" width="3.5" height="11" rx="1.4" fill="#475569"/><rect x="2" y="8.8" width="3" height="6.4" rx="1.2" fill="#334155"/><rect x="19" y="8.8" width="3" height="6.4" rx="1.2" fill="#334155"/><path d="M5.6 8v8M17.1 8v8" stroke="#64748b" stroke-width="1" stroke-linecap="round"/>',
  salad: '<path d="M8 10.5c-1.5-2.8.3-5.6 3.5-5.5-.5 2.9-1.4 4.5-3.5 5.5z" fill="#22c55e"/><path d="M12.5 10.5c.3-3.4 3-5.4 6.3-4.6-1.3 2.7-3 4-6.3 4.6z" fill="#16a34a"/><circle cx="10.5" cy="10" r="2.2" fill="#ef4444"/><circle cx="15.3" cy="10.4" r="1.6" fill="#f97316"/><path d="M2.5 11h19a9.5 9.5 0 0 1-19 0z" fill="#14b8a6"/><path d="M2.5 11h19a9.6 9.6 0 0 1-.4 2.6H2.9A9.6 9.6 0 0 1 2.5 11z" fill="#2dd4bf"/>',
  sleep: '<path d="M18.5 15.5A8.3 8.3 0 0 1 8.5 5.5a8.3 8.3 0 1 0 10 10z" fill="#facc15"/><path d="M18.5 15.5a8.3 8.3 0 0 1-12.3 3.6A8.3 8.3 0 0 0 18.5 15.5z" fill="#eab308"/><path d="M14 3h4l-4 4.5h4" fill="none" stroke="#6366f1" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="9.5" r=".9" fill="#a5b4fc"/>',
  walk: '<path d="M8.3 2.5c1.9 0 3 2.1 3 4.9S10.2 12.5 8.3 12.5 5.3 10.3 5.3 7.4 6.4 2.5 8.3 2.5z" fill="#8b5cf6"/><rect x="5.8" y="14" width="5" height="4" rx="2" fill="#8b5cf6"/><path d="M15.7 7c1.9 0 3 2.1 3 4.9s-1.1 5.1-3 5.1-3-2.2-3-5.1 1.1-4.9 3-4.9z" fill="#a78bfa"/><rect x="13.2" y="18.5" width="5" height="3.5" rx="1.75" fill="#a78bfa"/>',
  tooth: '<path d="M7.8 3c1.8 0 2.6.9 4.2.9S14.4 3 16.2 3c2.6 0 4 2.1 4 4.8 0 3.1-2 4.4-2.3 7.3-.3 2.9-.9 5.9-2.6 5.9-1.9 0-1.8-4.4-3.3-4.4s-1.4 4.4-3.3 4.4c-1.7 0-2.3-3-2.6-5.9C5.8 12.2 3.8 10.9 3.8 7.8 3.8 5.1 5.2 3 7.8 3z" fill="#fff" stroke="#cbd5e1" stroke-width="1.2"/><path d="M7 6.2c.6-.9 1.6-1 2.6-.6" stroke="#93c5fd" stroke-width="1.4" stroke-linecap="round" fill="none"/>',
  pill: '<path d="M10.4 3.9a5.2 5.2 0 0 1 7.4 7.4L14.1 15 6.7 7.6z" fill="#ef4444"/><path d="M6.7 7.6l7.4 7.4-3.7 3.7a5.2 5.2 0 0 1-7.4-7.4z" fill="#f1f5f9" stroke="#e2e8f0" stroke-width=".8"/><path d="M12 5.6a3 3 0 0 1 3.4-.2" stroke="#fecaca" stroke-width="1.3" stroke-linecap="round" fill="none"/>',
  pen: '<path d="M4 16.5L15.5 5l3.5 3.5L7.5 20z" fill="#facc15"/><path d="M15.5 5l1.8-1.8a1.6 1.6 0 0 1 2.2 0l1.3 1.3a1.6 1.6 0 0 1 0 2.2L19 8.5z" fill="#f472b6"/><path d="M4 16.5l3.5 3.5L3 21z" fill="#fde68a"/><path d="M3.6 19.4l1 1L3 21z" fill="#334155"/><path d="M6 18.5L17.2 7.3" stroke="#eab308" stroke-width="1"/>',
  target: '<circle cx="11" cy="13" r="9" fill="#ef4444"/><circle cx="11" cy="13" r="6.4" fill="#fff"/><circle cx="11" cy="13" r="3.8" fill="#ef4444"/><circle cx="11" cy="13" r="1.4" fill="#fff"/><path d="M11 13l9-9" stroke="#334155" stroke-width="1.6" stroke-linecap="round"/><path d="M17.5 3.5l3 .1.1 3-2 .2-1.3-1.3z" fill="#0ea5e9"/>',
  bulb: '<path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.8.7 1.2 1.6 1.2 2.6v.8h5.6v-.8c0-1 .4-1.9 1.2-2.6A6.5 6.5 0 0 0 12 2.5z" fill="#fde047"/><path d="M12 2.5a6.5 6.5 0 0 1 4 11.6c-.8.7-1.2 1.6-1.2 2.6v.8H12z" fill="#facc15"/><rect x="9" y="17.5" width="6" height="2.2" rx=".8" fill="#94a3b8"/><rect x="10" y="19.7" width="4" height="1.8" rx=".9" fill="#64748b"/><path d="M9.4 6.4a3.4 3.4 0 0 1 2.4-1.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none"/>',
  sunrise: '<path d="M5 16.5a7 7 0 0 1 14 0z" fill="#fb923c"/><path d="M8 16.5a4 4 0 0 1 8 0z" fill="#fdba74"/><path d="M12 3v3M4.6 8.6l1.8 1.8M19.4 8.6l-1.8 1.8M2 13.5h2.3M19.7 13.5H22" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/><rect x="2" y="16.5" width="20" height="5" rx="1.5" fill="#38bdf8"/><path d="M5 19h4M12 19.2h6" stroke="#e0f2fe" stroke-width="1.2" stroke-linecap="round"/>',
  nosmoke: '<rect x="4.5" y="10.5" width="12" height="3" rx=".8" fill="#f8fafc" stroke="#cbd5e1" stroke-width=".8"/><rect x="16.5" y="10.5" width="3" height="3" rx=".8" fill="#fb923c"/><path d="M17.5 8.5c0-1.2 1.2-1.4 1.2-2.6" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round" fill="none"/><circle cx="12" cy="12" r="9" fill="none" stroke="#ef4444" stroke-width="2.4"/><path d="M5.8 5.8l12.4 12.4" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>',
  phoneoff: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6" fill="#334155"/><rect x="8" y="5" width="8" height="12.5" rx="1" fill="#93c5fd"/><circle cx="12" cy="19.4" r=".9" fill="#94a3b8"/><path d="M3.5 3.5l17 17" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>',
  apple: '<path d="M12 7.6c-2-1.3-7.5-1.3-7.5 5 0 4.4 2.6 9 4.9 9 1.1 0 1.6-.6 2.6-.6s1.5.6 2.6.6c2.3 0 4.9-4.6 4.9-9 0-6.3-5.5-6.3-7.5-5z" fill="#ef4444"/><path d="M12 7.6c2-1.3 7.5-1.3 7.5 5 0 4.4-2.6 9-4.9 9-1.1 0-1.6-.6-2.6-.6z" fill="#dc2626"/><path d="M12 7.6c0-2 .7-3.5 2-4.6" stroke="#92400e" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M13 5.5c.5-2 2.5-2.9 4.6-2.4-.5 2-2.5 2.9-4.6 2.4z" fill="#22c55e"/><ellipse cx="8" cy="11.5" rx="1.1" ry="1.9" fill="#fca5a5" transform="rotate(20 8 11.5)"/>',
  bike: '<circle cx="5.8" cy="16.2" r="4" fill="none" stroke="#334155" stroke-width="2"/><circle cx="18.2" cy="16.2" r="4" fill="none" stroke="#334155" stroke-width="2"/><path d="M5.8 16.2L9.5 8.5h6M18.2 16.2l-3.6-9h2.6M9.5 8.5l3.2 7.7H5.8" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7.5h3.5" stroke="#334155" stroke-width="2" stroke-linecap="round"/><circle cx="12.7" cy="16.2" r="1.2" fill="#334155"/>',
  swim: '<rect x="2" y="14" width="20" height="8" rx="2" fill="#38bdf8"/><path d="M2 15.5c1.7 0 1.7-1.3 3.3-1.3s1.7 1.3 3.4 1.3 1.6-1.3 3.3-1.3 1.7 1.3 3.3 1.3 1.7-1.3 3.4-1.3 1.6 1.3 3.3 1.3M2 19c1.7 0 1.7-1.3 3.3-1.3s1.7 1.3 3.4 1.3 1.6-1.3 3.3-1.3 1.7 1.3 3.3 1.3 1.7-1.3 3.4-1.3 1.6 1.3 3.3 1.3" stroke="#e0f2fe" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M4.5 13l5-5 4 3.4" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16.5" cy="8" r="2.6" fill="#fbbf24"/><path d="M13.9 8a2.6 2.6 0 0 1 5.2 0z" fill="#ef4444"/>',
  music: '<path d="M9 17.5V5.8l11-2.3v12" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linejoin="round"/><path d="M9 5.8l11-2.3v3.4L9 9.2z" fill="#7c3aed"/><ellipse cx="6.2" cy="17.8" rx="3.2" ry="2.6" fill="#a855f7"/><ellipse cx="17.2" cy="15.8" rx="3.2" ry="2.6" fill="#a855f7"/>',
  coin: '<circle cx="12" cy="12" r="9.5" fill="#eab308"/><circle cx="12" cy="12" r="7.3" fill="#facc15"/><path d="M14.6 9.4c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.6.9 2.6 2.1-1.1 2-2.6 2c-1.2 0-2.2-.6-2.6-1.5M12 6.4v1.5M12 16.1v1.5" fill="none" stroke="#a16207" stroke-width="1.6" stroke-linecap="round"/>',
  home: '<path d="M5 10.5h14V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="#fde68a"/><path d="M2.5 11.5L12 3.5l9.5 8-1.4 1.6L12 6.3l-8.1 6.8z" fill="#ef4444"/><rect x="10" y="14.5" width="4" height="6.5" rx=".6" fill="#a16207"/><rect x="6.5" y="13" width="2.5" height="2.5" rx=".4" fill="#38bdf8"/><rect x="15" y="13" width="2.5" height="2.5" rx=".4" fill="#38bdf8"/>',
  leaf: '<path d="M4.5 19.5C4.5 10.5 10.5 4 21 4c0 10-6.2 16.5-15 16.5z" fill="#22c55e"/><path d="M21 4c0 10-6.2 16.5-15 16.5z" fill="#16a34a"/><path d="M4.5 19.5l9.5-9.5M9.5 14.5h3.4M12.3 11.7V8.6" stroke="#bbf7d0" stroke-width="1.3" stroke-linecap="round"/>',
  heart: '<path d="M12 20.5S3 15.3 3 9.2A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 9 2.2c0 6.1-9 11.3-9 11.3z" fill="#ef4444"/><path d="M12 20.5s9-5.2 9-11.3a4.7 4.7 0 0 0-.4-1.9c-1 5.7-8.6 10.6-8.6 13.2z" fill="#dc2626"/><ellipse cx="7.3" cy="8.8" rx="1.3" ry="1.8" fill="#fca5a5" transform="rotate(35 7.3 8.8)"/>',
  sun: '<path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="5.2" fill="#facc15"/><path d="M12 6.8a5.2 5.2 0 0 1 0 10.4z" fill="#eab308"/>',
  smile: '<circle cx="12" cy="12" r="9.5" fill="#facc15"/><path d="M12 2.5a9.5 9.5 0 0 1 0 19 9.5 9.5 0 0 0 0-19z" fill="#eab308" opacity=".5"/><circle cx="8.8" cy="10" r="1.3" fill="#78350f"/><circle cx="15.2" cy="10" r="1.3" fill="#78350f"/><path d="M8 13.8c.9 1.6 2.3 2.4 4 2.4s3.1-.8 4-2.4" fill="none" stroke="#78350f" stroke-width="1.6" stroke-linecap="round"/><circle cx="6.8" cy="13.4" r="1.1" fill="#fb923c" opacity=".6"/><circle cx="17.2" cy="13.4" r="1.1" fill="#fb923c" opacity=".6"/>',
  chat: '<path d="M3.5 5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5l-4.5 4v-4h.5a2 2 0 0 1-2-2z" fill="#3b82f6"/><path d="M7.5 8h9M7.5 11.5h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  laptop: '<rect x="4" y="4" width="16" height="11.5" rx="1.6" fill="#1e293b"/><rect x="5.5" y="5.5" width="13" height="8.5" rx=".6" fill="#60a5fa"/><path d="M7 8h6M7 10.5h4" stroke="#dbeafe" stroke-width="1.1" stroke-linecap="round"/><path d="M1.5 17h21l-1 2.5a1.5 1.5 0 0 1-1.4 1H3.9a1.5 1.5 0 0 1-1.4-1z" fill="#94a3b8"/><rect x="9.5" y="17" width="5" height="1" rx=".5" fill="#64748b"/>',
  paw: '<ellipse cx="6.4" cy="10.2" rx="2" ry="2.5" fill="#b45309" transform="rotate(-18 6.4 10.2)"/><ellipse cx="10" cy="6" rx="2" ry="2.6" fill="#b45309"/><ellipse cx="14" cy="6" rx="2" ry="2.6" fill="#b45309"/><ellipse cx="17.6" cy="10.2" rx="2" ry="2.5" fill="#b45309" transform="rotate(18 17.6 10.2)"/><path d="M12 11.3c-2.9 0-5.6 4-5.6 6.2 0 1.7 1.2 2.8 2.8 2.8 1.1 0 1.8-.6 2.8-.6s1.7.6 2.8.6c1.6 0 2.8-1.1 2.8-2.8 0-2.2-2.7-6.2-5.6-6.2z" fill="#92400e"/>',
  coffee: '<path d="M8 2.8c-.8 1 .8 1.8 0 2.8M11.5 2.8c-.8 1 .8 1.8 0 2.8" stroke="#94a3b8" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M17 10h1.6a2.6 2.6 0 0 1 0 5.2H16.6" fill="none" stroke="#ef4444" stroke-width="2"/><path d="M3.5 8h14v6.2a5.5 5.5 0 0 1-5.5 5.5H9a5.5 5.5 0 0 1-5.5-5.5z" fill="#ef4444"/><path d="M4.5 9h12v1.6h-12z" fill="#92400e"/><rect x="2.5" y="20" width="16" height="1.8" rx=".9" fill="#cbd5e1"/>',
  clock: '<path d="M3.5 6.5l3-3M20.5 6.5l-3-3" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="13" r="8.5" fill="#ef4444"/><circle cx="12" cy="13" r="6.6" fill="#fff"/><path d="M12 9v4l2.8 2" fill="none" stroke="#334155" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 21l1.5-1.6M17 21l-1.5-1.6" stroke="#334155" stroke-width="1.6" stroke-linecap="round"/>',
  books: '<rect x="2.5" y="15.5" width="19" height="5.5" rx="1.4" fill="#3b82f6"/><rect x="18" y="16.5" width="2.5" height="3.5" rx=".5" fill="#eff6ff"/><rect x="4.5" y="10" width="16" height="5.5" rx="1.4" fill="#22c55e"/><rect x="5.5" y="11" width="2.5" height="3.5" rx=".5" fill="#f0fdf4"/><rect x="3.5" y="4.5" width="15" height="5.5" rx="1.4" fill="#f97316" transform="rotate(-4 11 7.2)"/><path d="M5 18.2h9M10 12.7h7.5M7 7.3h6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>',
  strong: '<rect x="2.2" y="2.5" width="3" height="7" rx="1.2" fill="#334155"/><rect x="18.8" y="2.5" width="3" height="7" rx="1.2" fill="#334155"/><path d="M4 6h16" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 6l2.2 6.5M16.5 6l-2.2 6.5" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/><path d="M9.3 12h5.4l-.9 5.2h-3.6z" fill="#f97316"/><path d="M10.8 17l-1.9 3.6M13.2 17l1.9 3.6" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="9.6" r="2.2" fill="#fbbf24"/>',
  brain: '<path d="M12 5.2C11.2 3.9 9.9 3.5 8.7 3.8 7.4 4.1 6.6 5.2 6.5 6.4 5 6.8 4 8.1 4.1 9.7 3.1 10.5 2.6 11.7 2.8 13 3 14.2 3.8 15.2 4.9 15.7 5 17.4 6.2 18.8 7.9 19.1 9.6 19.5 11 19.3 12 18.2z" fill="#f9a8d4"/><path d="M12 5.2C12.8 3.9 14.1 3.5 15.3 3.8 16.6 4.1 17.4 5.2 17.5 6.4 19 6.8 20 8.1 19.9 9.7 20.9 10.5 21.4 11.7 21.2 13 21 14.2 20.2 15.2 19.1 15.7 19 17.4 17.8 18.8 16.1 19.1 14.4 19.5 13 19.3 12 18.2z" fill="#f472b6"/><path d="M12 5.2v13M6.5 6.4c.1 1.2.9 2 2 2.3M4.1 9.7c.5.6 1.3 1 2.2 1M4.9 15.7c1.2.4 2.5 0 3.3-.9M17.5 6.4c-.1 1.2-.9 2-2 2.3M19.9 9.7c-.5.6-1.3 1-2.2 1M19.1 15.7c-1.2.4-2.5 0-3.3-.9" fill="none" stroke="#be185d" stroke-width="1.3" stroke-linecap="round"/>',
  noalcohol: '<path d="M8.4 5.5h7.2l-.5 4.3a3.1 3.1 0 0 1-6.2 0z" fill="#a855f7"/><path d="M8.6 7.6h6.8l-.3 2.2a3.1 3.1 0 0 1-6.2 0z" fill="#7e22ce"/><path d="M12 13v3.8M9.6 17h4.8" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="#ef4444" stroke-width="2.4"/><path d="M5.8 5.8l12.4 12.4" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>',
  car: '<path d="M6.5 10.5l1.9-3.7c.4-.8 1.2-1.3 2.1-1.3h3c.9 0 1.7.5 2.1 1.3l1.9 3.7z" fill="#93c5fd"/><path d="M12 5.5v5" stroke="#ef4444" stroke-width="1.3"/><path d="M3 13c0-1.1.7-2 1.7-2.3l2-.7h10.6l2 .7c1 .3 1.7 1.2 1.7 2.3v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#ef4444"/><path d="M3 13.6h2.2M18.8 13.6H21" stroke="#fde68a" stroke-width="1.6" stroke-linecap="round"/><circle cx="7.5" cy="17" r="2.6" fill="#334155"/><circle cx="16.5" cy="17" r="2.6" fill="#334155"/><circle cx="7.5" cy="17" r="1" fill="#cbd5e1"/><circle cx="16.5" cy="17" r="1" fill="#cbd5e1"/>',
};
const ICON_KEYS = Object.keys(ICONS);
const EMOJI_TO_ICON = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [v.e, k]));
const ICON_STYLES = Object.fromEntries(Object.entries({
  color: 'Объёмные', tile: 'Неон', mono: 'Чёрно-белые', art: 'Иллюстрации', emoji: 'Эмодзи', line: 'Контурные',
}).sort((a, b) => a[1].localeCompare(b[1], 'ru')));
function applyIcons(style) {
  document.body.dataset.icons = style;
  render();
  if (hist) renderHistory();
  if ($('formOv')._shown) { drawIconPickers(); syncForm(); }
}
function setIcon(box, icon) {
  const html = iconHTML(icon);
  if (box._ic !== html) { box.innerHTML = html; box._ic = html; }
}
function iconHTML(icon) {
  const def = ICONS[icon];
  if (!def) return esc(icon);
  if (document.body.dataset.icons === 'emoji') return def.e;
  if (document.body.dataset.icons === 'art') return `<svg class="ha" viewBox="0 0 24 24" aria-hidden="true">${ICON_ART[icon]}</svg>`;
  return `<svg class="hi" viewBox="0 0 24 24" aria-hidden="true">${def.s}</svg>`;
}
const TIMES = [
  { v: 'morning', label: 'Утро', icon: '🌅' },
  { v: 'day', label: 'День', icon: '☀️' },
  { v: 'evening', label: 'Вечер', icon: '🌙' },
  { v: 'any', label: 'Любое', icon: '🕐' },
];
const TEMPLATES = [
  { name: 'Пить воду', icon: 'water', color: '#0ea5e9', target: 8, unit: 'стаканов', time: 'any' },
  { name: 'Зарядка', icon: 'dumbbell', color: '#f97316', target: 1, time: 'morning' },
  { name: 'Медитация', icon: 'meditate', color: '#a855f7', target: 1, time: 'morning' },
  { name: 'Чтение', icon: 'book', color: '#4f46e5', target: 20, unit: 'страниц', time: 'evening' },
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
const IC = {
  history: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  skip: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></svg>',
  minus: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  full: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  reset: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/></svg>',
  edit: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  archive: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>',
  more: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>',
  cal: '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  order: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg>',
  grip: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/></svg>',
  sun: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  auto: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
};

let state;
let viewDate = new Date();
const cards = new Map();

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE)); } catch {}
  return normalize(s);
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const fromMin = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function normRemind(r, target) {
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
function normalize(s) {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const isKey = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isObj(s) || !Array.isArray(s.habits) || !isObj(s.log)) s = { habits: [], log: {} };
  if (!isObj(s.skip)) s.skip = {};
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
  });
  const pname = isObj(s.profile) && typeof s.profile.name === 'string' ? s.profile.name.trim().slice(0, 40) : '';
  if (pname) s.profile = { name: pname }; else delete s.profile;
  for (const map of [s.log, s.skip]) for (const k of Object.keys(map)) {
    if (!isKey(k) || !isObj(map[k])) { delete map[k]; continue; }
    for (const id of Object.keys(map[k])) {
      const v = Math.floor(Number(map[k][id]));
      if (!seen.has(id) || !(v > 0)) delete map[k][id]; else map[k][id] = map === s.skip ? 1 : v;
    }
    if (!Object.keys(map[k]).length) delete map[k];
  }
  return s;
}
let saveWarned = false;
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); saveWarned = false; }
  catch {
    if (!saveWarned && !cloud.session) { saveWarned = true; setTimeout(() => toast('Не удалось сохранить: хранилище браузера недоступно или заполнено'), 0); }
  }
  cloudQueue();
}

const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayKey = () => key(new Date());
const isToday = d => key(d) === todayKey();
const weekday = d => (d.getDay() + 6) % 7;
const count = (h, d) => state.log[key(d)]?.[h.id] || 0;
const isSkipped = (h, d) => !!state.skip[key(d)]?.[h.id];
const isDue = (h, d) => !h.days || h.days.includes(weekday(d));
const findHabit = id => state.habits.find(h => h.id === id);
const fmtLong = k => parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
state = load();

function lifeEnd(h) {
  const t = todayKey();
  return h.archived && h.archived < t ? h.archived : t;
}
const inLife = (h, k) => k >= h.created && k <= lifeEnd(h);

function setMap(map, k, id, v) {
  map[k] ??= {};
  if (v) map[k][id] = v; else delete map[k][id];
  if (!Object.keys(map[k]).length) delete map[k];
}
function stepOf(h) { return h.step || 1; }
function units(h) { return Math.ceil(h.target / stepOf(h)); }
function stepUp(h, c) { return Math.min(h.target, c + stepOf(h)); }
function stepDown(h, c) { return Math.max(0, c - (c % stepOf(h) || stepOf(h))); }
function setCount(h, d, n) {
  n = Math.max(0, Math.min(h.target, n));
  setMap(state.log, key(d), h.id, n);
  if (n) setMap(state.skip, key(d), h.id, 0);
  save(); render();
}
function setSkip(h, d, on) {
  setMap(state.skip, key(d), h.id, on ? 1 : 0);
  if (on) setMap(state.log, key(d), h.id, 0);
  save(); render();
}

const counts = (h, d) => isDue(h, d) && !isSkipped(h, d);

function streak(h) {
  let s = 0;
  const t = todayKey(), end = lifeEnd(h);
  for (let d = parseKey(end); key(d) >= h.created; d = addDays(d, -1)) {
    if (!counts(h, d)) continue;
    if (count(h, d) >= h.target) s++;
    else if (key(d) !== t) break;
  }
  return s;
}

function lifeStats(h) {
  let best = 0, run = 0, full = 0, due = 0, reps = 0, score = 0;
  const alpha = 1 - Math.pow(.5, 1 / 13);
  for (let d = parseKey(h.created), end = lifeEnd(h); key(d) <= end; d = addDays(d, 1)) {
    const c = count(h, d);
    reps += c;
    if (!counts(h, d)) continue;
    const v = Math.min(c / h.target, 1);
    const isTodayUnfinished = key(d) === todayKey() && v < 1;
    if (!isTodayUnfinished) { due++; score = score * (1 - alpha) + alpha * v; }
    if (v >= 1) { full++; run++; best = Math.max(best, run); } else if (!isTodayUnfinished) run = 0;
  }
  return { best, full, due, reps, score };
}

function missRun(h) {
  let m = 0, ever = false;
  for (let d = addDays(new Date(), -1), guard = 0; key(d) >= h.created && guard < 800; d = addDays(d, -1), guard++) {
    if (!counts(h, d)) continue;
    if (count(h, d) >= h.target) { ever = true; break; }
    m++;
  }
  return { m, ever };
}

function missBadge(h) {
  if (count(h, new Date()) >= h.target) return null;
  const { m, ever } = missRun(h);
  if (!m) return null;
  if (!ever) return count(h, new Date()) ? null : { texts: ['Ещё не выполнялась', 'Не выполнялась'], title: 'С момента создания привычка ни разу не была выполнена', calm: true };
  if (m === 1) return { texts: ['Вчера пропуск', 'Пропуск', '!'], title: 'Вчера пропущено — не пропускай второй раз подряд', calm: false };
  const word = plural(m, 'пропуск', 'пропуска', 'пропусков');
  return { texts: [`${m} ${word} подряд`, `${m} ${word}`, `×${m}`], title: `Не выполнялась ${m} ${plural(m, 'раз', 'раза', 'раз')} подряд по расписанию`, calm: true };
}

function activeOn(d) {
  const k = key(d);
  return state.habits.filter(h => !h.archived && k >= h.created);
}

function dayProgress(d) {
  const hs = activeOn(d).filter(h => counts(h, d));
  if (!hs.length) return { frac: 0, done: 0, total: 0 };
  const done = hs.filter(h => count(h, d) >= h.target).length;
  return { frac: hs.reduce((s, h) => s + Math.min(count(h, d) / h.target, 1), 0) / hs.length, done, total: hs.length };
}

function perfectStreak() {
  const first = state.habits.filter(h => !h.archived).map(h => h.created).sort()[0];
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

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const days = n => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
const schedText = h => !h.days ? 'каждый день' : h.days.length === 5 && h.days.every(x => x < 5) ? 'по будням'
  : h.days.length === 2 && h.days.every(x => x >= 5) ? 'по выходным' : h.days.map(x => WEEKDAYS[x]).join(', ');

function rollNumber(slot, text, dir, animate) {
  if (slot._val === text) return;
  slot._val = text;
  const nu = document.createElement('span');
  nu.textContent = text;
  const old = [...slot.children];
  slot.append(nu);
  if (!animate || reducedMotion || !text) { old.forEach(o => o.remove()); return; }
  const opts = { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  if (!old.length) {
    nu.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    return;
  }
  for (const o of old) {
    if (o._leaving) continue;
    o._leaving = true;
    const cs = getComputedStyle(o), from = { transform: cs.transform === 'none' ? 'none' : cs.transform, opacity: cs.opacity };
    o.getAnimations().forEach(a => a.cancel());
    o.animate([from,{ transform: `translateY(${-100 * dir}%)`, opacity: 0 }], opts).finished.then(() => o.remove(), () => {});
  }
  nu.animate([{ transform: `translateY(${100 * dir}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], opts);
}

const SEG_MAX = 12;
function buildSegments(svg, n) {
  const C = RING_C, gap = n > 8 ? 2.6 : 3.2, len = C / n - gap;
  svg.querySelectorAll('.seg').forEach(s => s.remove());
  for (let i = 0; i < n; i++) {
    const off = -(i * C / n + gap / 2);
    for (const cls of ['seg seg-t', 'seg seg-f']) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', cls);
      c.setAttribute('cx', 24); c.setAttribute('cy', 24); c.setAttribute('r', 22);
      c.setAttribute('stroke-dasharray', cls.includes('-f') ? `0 ${C}` : `${len} ${C}`);
      c.setAttribute('stroke-dashoffset', off);
      c.dataset.len = len;
      svg.append(c);
    }
  }
}
function paintSegments(svg, filled, animate) {
  const C = RING_C;
  svg.querySelectorAll('.seg-f').forEach((s, i) => {
    const on = i < filled, was = s.classList.contains('on');
    if (on === was) return;
    s.classList.toggle('on', on);
    const full = `${s.dataset.len} ${C}`, empty = `0 ${C}`;
    s.setAttribute('stroke-dasharray', on ? full : empty);
    if (animate && !reducedMotion) {
      s.animate([{ strokeDasharray: on ? empty : full }, { strokeDasharray: on ? full : empty }],
        { duration: on ? 320 : 200, easing: on ? 'cubic-bezier(.2, .8, .2, 1)' : 'cubic-bezier(.55, 0, .75, .2)' });
    }
  });
}
function countTo(el, to, suffix = '') {
  const from = parseInt(el.textContent) || 0;
  cancelAnimationFrame(el._raf);
  if (from === to || reducedMotion || !el.isConnected || !el.offsetParent) { el.textContent = to + suffix; return; }
  const t0 = performance.now(), dur = 450;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e) + suffix;
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
function flash(el) {
  el.animate([{ opacity: .22, transform: 'scale(.72)' }, { opacity: 0, transform: 'scale(1)' }],
    { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}

const shownOverlays = () => [...document.querySelectorAll('.overlay')].filter(o => o._shown);
function openOverlay(ov) {
  const fresh = !ov._shown;
  if (fresh) ov._opener = document.activeElement;
  ov._shown = true;
  ov.hidden = false;
  document.body.classList.add('locked');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (ov._shown) ov.classList.add('open'); }));
  const sheet = ov.querySelector('.sheet');
  if (fresh) sheet.scrollTop = 0;
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}
function closeOverlay(ov) {
  closeMenu();
  if (!ov._shown) return;
  ov._shown = false;
  ov.classList.remove('open');
  if (!shownOverlays().length) document.body.classList.remove('locked');
  setTimeout(() => { if (!ov._shown) ov.hidden = true; }, reducedMotion ? 0 : 320);
  if (ov._opener?.isConnected) ov._opener.focus({ preventScroll: true });
  ov._opener = null;
}
addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const ov = shownOverlays().pop();
  if (!ov) return;
  const items = [...ov.querySelectorAll('button, input, [tabindex="0"]')].filter(x => !x.disabled && x.offsetParent && !x.closest('[inert]'));
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || !ov.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !ov.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
});
for (const ov of document.querySelectorAll('.overlay')) {
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-close]')) ov === $('confirm') ? closeConfirm(false) : closeOverlay(ov);
  });
}
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (menuEl) return closeMenu();
  if (confirmResolve) return closeConfirm(false);
  const open = shownOverlays().pop();
  if (open) { closeOverlay(open); if (open === $('histOv')) hist = null; }
  else if (reordering) setReorder(false);
});

let confirmResolve = null;
function askConfirm(title, text, yesLabel) {
  $('cTitle').textContent = title;
  $('cText').textContent = text;
  $('cYes').textContent = yesLabel;
  openOverlay($('confirm'));
  $('cNo').focus({ preventScroll: true });
  return new Promise(res => confirmResolve = res);
}
function closeConfirm(result) {
  if (!confirmResolve) return;
  closeOverlay($('confirm'));
  const res = confirmResolve;
  confirmResolve = null;
  res(result);
}
$('cYes').onclick = () => closeConfirm(true);
$('cNo').onclick = () => closeConfirm(false);

let toastTimer = null, toastSwipe = null;
function toast(text, action, label = 'Отменить') {
  $('toastText').textContent = text;
  $('toastUndo').hidden = !action;
  $('toastUndo').textContent = label;
  $('toastUndo').onclick = () => { action?.(); hideToast(); };
  toastSwipe = null;
  Object.assign($('toast').style, { transform: '', opacity: '', transition: '' });
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, label === 'Отменить' ? 5000 : 12000);
}
function hideToast() { $('toast').classList.remove('show'); }
$('toast').addEventListener('pointerdown', e => {
  const t = $('toast');
  if (e.target.closest('button') || !t.classList.contains('show')) return;
  toastSwipe = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  try { t.setPointerCapture(e.pointerId); } catch {}
  clearTimeout(toastTimer);
  t.style.transition = 'none';
});
$('toast').addEventListener('pointermove', e => {
  const s = toastSwipe;
  if (!s || e.pointerId !== s.id) return;
  s.dx = e.clientX - s.x;
  s.dy = e.clientY - s.y;
  const dy = s.dy > 0 ? s.dy : s.dy / 4;
  $('toast').style.transform = `translate(calc(-50% + ${s.dx}px), ${dy}px)`;
  $('toast').style.opacity = 1 - Math.min(.7, Math.max(Math.abs(s.dx) / 260, Math.max(0, s.dy) / 140));
});
const endToastSwipe = e => {
  const s = toastSwipe, t = $('toast');
  if (!s || e.pointerId !== s.id) return;
  toastSwipe = null;
  const side = Math.abs(s.dx) > 70 && Math.abs(s.dx) > s.dy, down = s.dy > 36 && !side;
  if (side || down) {
    t.style.transition = 'transform .24s cubic-bezier(.55, 0, .75, .2), opacity .2s linear';
    t.style.transform = side ? `translate(calc(-50% + ${Math.sign(s.dx) * 110}vw), ${Math.max(0, s.dy)}px)` : 'translate(-50%, calc(100% + 40px))';
    t.style.opacity = '0';
    setTimeout(() => { if (toastSwipe) return; hideToast(); Object.assign(t.style, { transform: '', opacity: '', transition: '' }); }, 250);
  } else {
    Object.assign(t.style, { transform: '', opacity: '', transition: '' });
    toastTimer = setTimeout(hideToast, 3000);
  }
};
$('toast').addEventListener('pointerup', endToastSwipe);
$('toast').addEventListener('pointercancel', endToastSwipe);

let fabY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY, d = y - fabY;
  if (Math.abs(d) < 8 && y > 80) return;
  document.body.classList.toggle('fab-away', d > 0 && y > 80);
  fabY = y;
}, { passive: true });

let menuEl = null;
function closeMenu() {
  const m = menuEl;
  if (!m) return;
  menuEl = null;
  if (reducedMotion) return m.remove();
  m.style.pointerEvents = 'none';
  m.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.97)' }], { duration: 120, easing: 'cubic-bezier(.55, 0, .75, .2)' }).onfinish = () => m.remove();
}
function openMenu(anchor, items) {
  closeMenu();
  menuEl = document.createElement('div');
  menuEl.className = 'menu';
  for (const it of items) {
    if (it === '-') { menuEl.append(document.createElement('hr')); continue; }
    if (it.header) { const h = document.createElement('div'); h.className = 'menu-h'; h.textContent = it.header; menuEl.append(h); continue; }
    const b = document.createElement('button');
    b.innerHTML = `${it.icon}<span class="lbl"></span>`;
    b.querySelector('.lbl').textContent = it.label;
    if (it.danger) b.classList.add('danger');
    b.onclick = () => { closeMenu(); it.run(); };
    menuEl.append(b);
  }
  placeMenu(anchor);
  menuEl.querySelector('button')?.focus({ preventScroll: true });
}
function placeMenu(anchor) {
  document.body.append(menuEl);
  const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth;
  const roomBelow = innerHeight - r.bottom - 6 - 28, roomAbove = r.top - 6 - 16;
  const below = menuEl.offsetHeight <= roomBelow || roomBelow >= roomAbove;
  menuEl.style.maxHeight = Math.max(160, below ? roomBelow : roomAbove) + 'px';
  const mh = menuEl.offsetHeight;
  menuEl.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + scrollX + 'px';
  menuEl.style.top = (below ? r.bottom + 6 : r.top - mh - 6) + scrollY + 'px';
  menuEl.style.transformOrigin = below ? 'top right' : 'bottom right';
}
function openPopover(anchor, html, color) {
  closeMenu();
  menuEl = document.createElement('div');
  menuEl.className = 'menu pop';
  menuEl.setAttribute('role', 'dialog');
  if (color) menuEl.style.setProperty('--c', color);
  menuEl.innerHTML = html;
  menuEl._anchor = anchor;
  document.body.append(menuEl);
  const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth;
  const mh = menuEl.offsetHeight, ax = r.left + r.width / 2, left = Math.round((innerWidth - mw) / 2);
  const side = mh + 8 <= innerHeight - r.bottom - 16 ? 'below' : mh + 8 <= r.top - 16 ? 'above' : 'center';
  menuEl.dataset.side = side;
  menuEl.style.left = left + 'px';
  if (side === 'center') {
    menuEl.style.maxHeight = innerHeight - 32 + 'px';
    menuEl.style.top = Math.max(16, Math.round((innerHeight - menuEl.offsetHeight) / 2)) + 'px';
    menuEl.style.transformOrigin = 'center';
    return;
  }
  menuEl.style.top = Math.round(side === 'below' ? r.bottom + 8 : r.top - mh - 8) + 'px';
  menuEl.style.setProperty('--ax', Math.max(18, Math.min(mw - 18, ax - left)) + 'px');
  menuEl.style.transformOrigin = `${Math.round(ax - left)}px ${side === 'below' ? 'top' : 'bottom'}`;
}
document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('.more, .info-btn, .tile-i, #viewBtn')) closeMenu(); });
addEventListener('scroll', closeMenu, { passive: true });
$('hSheet').addEventListener('scroll', closeMenu, { passive: true });

function habitMenu(anchor, id) {
  const h = findHabit(id), c = count(h, viewDate), skipped = isSkipped(h, viewDate);
  const dayWord = isToday(viewDate) ? 'сегодня' : 'в этот день';
  openMenu(anchor, [
    { icon: IC.history, label: 'История и статистика', run: () => openHistory(id) },
    '-',
    h.target > 1 && c < h.target && { icon: IC.full, label: 'Выполнить полностью', run: () => changeCount(h, viewDate, h.target) },
    h.target > 1 && c > 0 && { icon: IC.minus, label: h.step ? `Убрать шаг (−${c % h.step || h.step})` : 'Убрать одно повторение', run: () => changeCount(h, viewDate, stepDown(h, c)) },
    c > 0 && { icon: IC.reset, label: 'Сбросить отметку', run: () => changeCount(h, viewDate, 0) },
    (skipped || (isDue(h, viewDate) && !c)) && { icon: IC.skip, label: skipped ? `Отменить пропуск` : `Пропустить ${dayWord}`, run: () => setSkip(h, viewDate, !skipped) },
    '-',
    { icon: IC.edit, label: 'Изменить', run: () => openForm(id) },
    { icon: IC.order, label: 'Изменить порядок', run: () => setReorder(true) },
    { icon: IC.archive, label: 'В архив', run: () => archiveHabit(id) },
  ].filter(Boolean));
}

const GROUPS = {
  time: { label: 'По времени дня', hint: 'Утро, день, вечер' },
  custom: { label: 'По типам', hint: 'Ваши группы, например «Спорт»' },
  none: { label: 'Одним списком', hint: 'Без групп, в Вашем порядке' },
};
let groupMode = 'time';
const catName = id => state.categories.find(c => c.id === id)?.name;

function sectionDefs() {
  const defs = groupMode === 'time' ? TIMES.map(t => ({ id: 't:' + t.v, label: `${t.icon} ${t.v === 'any' ? 'В любое время' : t.label}` }))
    : groupMode === 'custom' ? [...state.categories.map(c => ({ id: 'c:' + c.id, label: c.name })), { id: 'c:', label: 'Без типа' }]
    : [{ id: 'all', label: '' }];
  return [...defs, { id: 'off', label: '💤 Не по расписанию' }];
}
function sectionOf(h) {
  if (!isDue(h, viewDate) && !count(h, viewDate)) return 'off';
  return groupMode === 'time' ? 't:' + h.time : groupMode === 'custom' ? 'c:' + (h.cat || '') : 'all';
}

const sectionEls = new Map();
function sectionEl(id) {
  let el = sectionEls.get(id);
  if (!el) {
    el = document.createElement('section');
    el.className = 'section';
    el.hidden = true;
    el.innerHTML = `<div class="sec-h"><span class="sec-t"></span><span class="cnt"></span></div><div class="list"></div>`;
    sectionEls.set(id, el);
  }
  return el;
}

function buildCard(id) {
  const el = document.createElement('div');
  el.className = 'card habit enter';
  if (firstRender) el.style.animationDelay = Math.min(entering++, 10) * 40 + 'ms';
  el.innerHTML = `
    <div class="hicon"></div>
    <div class="info" tabindex="0" role="button" title="История и статистика">
      <div class="name"></div>
      <div class="meta"><span class="m-lead"></span><span class="m-streak"></span><span class="badge warn m-warn"><span class="w-long"></span></span></div>
      <div class="dots">${'<div class="dcol"><span class="dw"></span><button class="dot"></button></div>'.repeat(7)}</div>
    </div>
    <div class="ctl">
    <button class="step-minus idle" title="Убрать одно повторение">${IC.minus}</button>
    <button class="check">
      <svg class="ring" viewBox="0 0 48 48">
        <circle class="track" cx="24" cy="24" r="22"/>
        <circle class="prog" cx="24" cy="24" r="22" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>
      </svg>
      <span class="flash"></span>
      <svg class="ic plus" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>
      <span class="num"></span>
      <svg class="tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
    </button>
    <button class="ghost more" title="Действия">${IC.more}</button>
    </div>
    <button class="ghost drag-handle" title="Перетащите, чтобы изменить порядок (или стрелки ↑ ↓)" aria-label="Переместить привычку">${IC.grip}</button>
    <div class="mh"></div>`;
  el.dataset.id = id;
  el.addEventListener('animationend', e => { if (e.target === el) el.classList.remove('enter'); });
  el.querySelector('.mh').addEventListener('pointerover', e => {
    const mh = e.currentTarget, L = stripCache.get(mh.dataset.k), i = e.target.tagName === 'I' ? mh._cells?.indexOf(e.target) : -1;
    if (L && i >= 0) e.target.title = dayTip(findHabit(id), L.days[i]);
  });
  addDrag(el);

  const check = el.querySelector('.check');
  check.onclick = () => {
    if (el._held) { el._held = false; return; }
    const h = findHabit(id), c = count(h, viewDate);
    changeCount(h, viewDate, c >= h.target ? stepDown(h, c) : stepUp(h, c));
  };
  let holdTimer = null, holdShow = null;
  const endHold = () => { clearTimeout(holdTimer); clearTimeout(holdShow); check.classList.remove('holding'); };
  check.addEventListener('pointerdown', e => {
    el._held = false;
    const h = findHabit(id);
    if (e.button !== 0 || h.target === 1 || count(h, viewDate) >= h.target) return;
    holdShow = setTimeout(() => check.classList.add('holding'), 200);
    holdTimer = setTimeout(() => { endHold(); el._held = true; changeCount(h, viewDate, h.target); }, 550);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => check.addEventListener(t, endHold));
  check.addEventListener('contextmenu', e => e.preventDefault());

  el.querySelector('.step-minus').onclick = () => {
    const h = findHabit(id);
    changeCount(h, viewDate, stepDown(h, count(h, viewDate)));
  };
  el.querySelector('.more').onclick = e => habitMenu(e.currentTarget, id);
  const info = el.querySelector('.info');
  info.onclick = e => { if (!e.target.closest('.dot') && !el._swiped && !reordering) openHistory(id); };
  addSwipe(el, id);
  info.onkeydown = e => { if (e.target === info && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openHistory(id); } };
  el.querySelectorAll('.dot').forEach((dot, i) => dot.onclick = () => {
    if (el._swiped) return;
    const h = findHabit(id), d = addDays(viewDate, i - 6);
    changeCount(h, d, count(h, d) >= h.target ? 0 : h.target);
  });
  return el;
}

let reordering = false;
function setReorder(on) {
  if (reordering === on) return;
  reordering = on;
  closeMenu();
  document.body.classList.toggle('reordering', on);
  $('reorderBar').hidden = !on;
  if (on) $('sections').querySelector('.section:not([hidden]) .habit:not(.leaving) .drag-handle')?.focus({ preventScroll: true });
}
$('reorderDone').onclick = () => setReorder(false);

const liveCards = list => [...list.children].filter(c => c.classList.contains('habit') && !c.classList.contains('leaving'));

function commitOrder(list) {
  const ids = liveCards(list).map(c => c.dataset.id), set = new Set(ids);
  const byId = new Map(state.habits.map(h => [h.id, h]));
  const slots = state.habits.map((h, i) => set.has(h.id) ? i : -1).filter(i => i >= 0);
  slots.forEach((slot, k) => { state.habits[slot] = byId.get(ids[k]); });
  save();
}

function flip(els, mutate) {
  const before = new Map(els.map(e => [e, e.getBoundingClientRect().top]));
  mutate();
  if (reducedMotion) return;
  for (const e of els) {
    const d = before.get(e) - e.getBoundingClientRect().top;
    if (d) e.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 220, easing: EASE });
  }
}

function addDrag(el) {
  const handle = el.querySelector('.drag-handle');
  let drag = null;

  const step = () => {
    if (!drag) return;
    const list = el.parentElement;
    const desired = drag.top0 + (drag.y - drag.y0) + (scrollY - drag.scroll0);
    el.style.transform = `translateY(${desired - el.offsetTop}px)`;
    for (let guard = 0; guard < 100; guard++) {
      const sibs = liveCards(list), i = sibs.indexOf(el);
      const prev = sibs[i - 1], next = sibs[i + 1];
      if (prev && desired < prev.offsetTop + prev.offsetHeight / 2) flip([prev], () => list.insertBefore(el, prev));
      else if (next && desired + el.offsetHeight > next.offsetTop + next.offsetHeight / 2) flip([next], () => list.insertBefore(next, el));
      else break;
    }
    el.style.transform = `translateY(${desired - el.offsetTop}px)`;
    const edge = 70, v = drag.y < edge ? -(edge - drag.y) / 5 : drag.y > innerHeight - edge ? (drag.y - innerHeight + edge) / 5 : 0;
    if (v) { scrollBy(0, v); drag.raf = requestAnimationFrame(step); }
    else drag.raf = null;
  };

  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !reordering) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y0: e.clientY, y: e.clientY, top0: el.offsetTop, scroll0: scrollY, raf: null };
    el.classList.add('dragging');
  });
  handle.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.y = e.clientY;
    if (!drag.raf) step();
  });
  const end = () => {
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    const off = parseFloat(el.style.transform.slice(11)) || 0;
    drag = null;
    el.style.transform = '';
    el.classList.remove('dragging');
    if (off && !reducedMotion) el.animate([{ transform: `translateY(${off}px)` }, { transform: 'none' }], { duration: 200, easing: EASE });
    commitOrder(el.parentElement);
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const list = el.parentElement, sibs = liveCards(list), i = sibs.indexOf(el);
    const other = sibs[e.key === 'ArrowUp' ? i - 1 : i + 1];
    if (!other) return;
    flip([el, other], () => e.key === 'ArrowUp' ? list.insertBefore(el, other) : list.insertBefore(other, el));
    commitOrder(list);
    handle.focus({ preventScroll: true });
  });
}

function addSwipe(el, id) {
  const LIMIT = 90;
  let start = null, dx = 0, dragging = false;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || reordering || e.target.closest('.ctl, .more, .check, .step-minus, .drag-handle')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dx = 0; dragging = false;
  });
  el.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x, my = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.3) {
        if (Math.abs(my) > 12) start = null;
        return;
      }
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('swiping');
    }
    dx = Math.max(-140, Math.min(140, mx));
    el.style.transform = `translateX(${dx * .85}px)`;
    el.style.setProperty('--sw', Math.min(Math.abs(dx) / LIMIT, 1));
    el.classList.toggle('sw-done', dx > 0);
    el.classList.toggle('sw-undo', dx < 0);
  });
  const end = () => {
    if (!start) return;
    start = null;
    if (!dragging) return;
    el._swiped = true;
    setTimeout(() => el._swiped = false, 50);
    el.classList.remove('swiping', 'sw-done', 'sw-undo');
    el.style.removeProperty('--sw');
    el.animate([{ transform: `translateX(${dx * .85}px)` }, { transform: 'none' }], { duration: 300, easing: EASE });
    el.style.transform = '';
    const h = findHabit(id);
    if (dx >= LIMIT) changeCount(h, viewDate, h.target);
    else if (dx <= -LIMIT && (count(h, viewDate) || isSkipped(h, viewDate))) changeCount(h, viewDate, 0, true);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function changeCount(h, d, n, clearSkip = false) {
  const prev = count(h, d), prevSkip = isSkipped(h, d);
  n = Math.max(0, Math.min(h.target, n));
  if (n === prev && !(clearSkip && prevSkip)) return;
  if (clearSkip && prevSkip) setMap(state.skip, key(d), h.id, 0);
  setCount(h, d, n);
  navigator.vibrate?.(n > prev ? 12 : [6, 40, 6]);
  const wasDone = prev >= h.target, isDone = n >= h.target;
  if (wasDone !== isDone || (n === 0 && prev > 1)) {
    const dayNote = isToday(d) ? '' : ` (${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})`;
    toast(`${h.name}${dayNote}: ${isDone ? 'выполнено' : n ? `${n} из ${h.target}` : 'отметка снята'}`, () => {
      if (!findHabit(h.id)) return;
      setMap(state.log, key(d), h.id, prev);
      if (prevSkip) setMap(state.skip, key(d), h.id, 1);
      save(); render();
    });
  }
}

function updateCard(el, h) {
  const day = key(viewDate);
  const c = count(h, viewDate), done = c >= h.target, multi = h.target > 1;
  const skipped = isSkipped(h, viewDate), due = isDue(h, viewDate);
  const s = streak(h);

  el.style.setProperty('--c', h.color);
  el.classList.toggle('complete', done);
  el.classList.toggle('skipped', skipped);
  el.classList.toggle('offday', !due && !done);
  el.classList.toggle('has-count', c > 0);
  setIcon(el.querySelector('.hicon'), h.icon);
  const sameDay = el._day === day;
  const u = units(h), ringSvg = el.querySelector('.ring'), segmented = multi && u > 1 && u <= SEG_MAX;
  if (segmented) {
    if (el._segN !== u) { buildSegments(ringSvg, u); el._segN = u; }
    paintSegments(ringSvg, done ? u : Math.floor(c / stepOf(h)), sameDay);
  } else if (el._segN) { ringSvg.querySelectorAll('.seg').forEach(s => s.remove()); el._segN = 0; }
  ringSvg.classList.toggle('segmented', segmented);
  el.querySelector('.prog').style.strokeDashoffset = RING_C * (1 - c / h.target);
  const check = el.querySelector('.check');
  check.title = done ? (multi ? 'Выполнено — нажмите, чтобы убрать последнее повторение' : 'Выполнено — нажмите, чтобы снять отметку')
    : multi ? `Нажмите: +${stepOf(h)} · удерживайте: выполнить целиком` : 'Отметить выполненной';
  check.setAttribute('aria-label', `${h.name}: ${multi ? `${c} из ${h.target}` : done ? 'выполнено' : 'не выполнено'}. ${check.title}`);
  check.setAttribute('aria-pressed', done);
  const minusBtn = el.querySelector('.step-minus');
  minusBtn.hidden = !multi;
  minusBtn.classList.toggle('idle', c === 0);
  minusBtn.disabled = c === 0;

  const num = el.querySelector('.num');
  const numText = multi && c > 0 && c < h.target ? String(c) : '';
  num.classList.toggle('long', numText.length > 3);
  minusBtn.title = h.step ? `Убрать шаг (−${c % h.step || h.step})` : 'Убрать одно повторение';
  if (numText) rollNumber(num, numText, c > (el._c ?? c) ? 1 : -1, sameDay);
  else if (!done) rollNumber(num, '', 1, false);
  const grew = sameDay && c > (el._c ?? c);
  if (grew && !reducedMotion) {
    flash(el.querySelector('.flash'));
  }
  el._day = day; el._c = c;

  el.querySelector('.name').textContent = h.name;
  const meta = el.querySelector('.meta');
  const lead = skipped ? '<span class="badge skip">Пропущено</span>'
    : multi ? `<span>${c} / ${h.target}${h.unit ? ' ' + esc(h.unit) : ''}</span>`
    : `<span>${esc(schedText(h)[0].toUpperCase() + schedText(h).slice(1))}</span>`;
  const badge = isToday(viewDate) && !skipped && due ? missBadge(h) : null, warn = !!badge;
  if (meta.dataset.lead !== lead) {
    meta.querySelector('.m-lead').innerHTML = lead; meta.dataset.lead = lead;
    if (multi && grew && !reducedMotion) meta.querySelector('.m-lead > span').animate([{ color: h.color }, { color: h.color, offset: .35 }, {}], { duration: 700, easing: 'ease-out' });
  }
  const st = meta.querySelector('.m-streak');
  st.textContent = s ? `🔥 ${days(s)}` : st.textContent;
  st.classList.toggle('on', !!s);
  const warnEl = meta.querySelector('.m-warn');
  warnEl.classList.toggle('on', warn);
  if (warn) {
    warnEl.title = badge.title;
    warnEl.classList.toggle('calm', badge.calm);
    const room = meta.clientWidth - meta.querySelector('.m-lead').offsetWidth - (s ? meta.querySelector('.m-streak').scrollWidth + 8 : 0) - 8;
    const label = warnEl.querySelector('.w-long');
    for (const t of badge.texts) { label.textContent = t; if (label.offsetWidth + 14 <= room) break; }
    if (label.offsetWidth + 14 > room) warnEl.classList.remove('on');
  }

  const todayK = todayKey();
  el.querySelectorAll('.dcol').forEach((col, i) => {
    const d = addDays(viewDate, i - 6), k = key(d), v = count(h, d), dot = col.lastElementChild;
    dot.className = 'dot ' + (v >= h.target ? 'full' : v > 0 ? 'part' : isSkipped(h, d) ? 'skip' : !isDue(h, d) ? 'off' : '');
    col.classList.toggle('cur', i === 6);
    col.classList.toggle('today', k === todayK);
    dot.textContent = d.getDate();
    dot.disabled = k > todayK || k < h.created;
    dot.title = dayTip(h, d);
    col.firstElementChild.textContent = WEEKDAYS[weekday(d)];
  });

  const mh = el.querySelector('.mh');
  const view = VIEWS[document.body.dataset.view];
  if (!view.cells) return;
  const layoutKey = `${view.id}|${day}`;
  const L = stripLayout(view, layoutKey);
  if (mh.dataset.k !== layoutKey) { mh.dataset.k = layoutKey; mh.className = `mh ${L.cls}`; mh.innerHTML = L.html; mh._cells = [...mh.querySelectorAll('i')]; }
  const { log, skip } = state, id = h.id, tgt = h.target, end = lifeEnd(h);
  let dueN = 0, fullN = 0;
  mh._cells.forEach((cell, i) => {
    const k = L.keys[i], v = log[k]?.[id] || 0, sk = !!skip[k]?.[id], out = k > todayK || k < h.created;
    const cls = (out ? 'x' : v >= tgt ? 'l3' : v * 2 >= tgt ? 'l2' : v > 0 ? 'l1' : sk ? 'sk' : '')
      + (k === day ? ' cur' : '');
    if (cell.className !== cls) cell.className = cls;
    if (!out && k <= end && !sk && (!h.days || h.days.includes(L.wd[i])) && !(k === todayK && v < tgt)) { dueN++; if (v >= tgt) fullN++; }
  });
  mh.querySelector('.sh-r').textContent = dueN ? `${fullN} из ${days(dueN)} · ${Math.round(fullN / dueN * 100)}%` : 'пока нет данных';
}

const stripCache = new Map();
function stripLayout(view, cacheKey) {
  let L = stripCache.get(cacheKey);
  if (!L) {
    if (stripCache.size > 8) stripCache.clear();
    L = buildStripLayout(view);
    L.keys = L.days.map(key);
    L.wd = L.days.map(weekday);
    stripCache.set(cacheKey, L);
  }
  return L;
}
function buildStripLayout(view) {
  const vd = viewDate, mon = d => MONTHS_SHORT[d.getMonth()];
  if (view.cells === 'days') {
    const n = view.days, days = Array.from({ length: n }, (_, i) => addDays(vd, i - n + 1));
    const col = [], tracks = [];
    days.forEach((d, i) => {
      if (i > 0 && weekday(d) === 0) tracks.push('4px');
      tracks.push('minmax(0, 1fr)');
      col.push(tracks.length);
    });
    let html = '', end = -1;
    days.forEach((d, i) => {
      const first = d.getDate() === 1;
      const soonFirst = days.slice(i + 1, i + 4).some(x => x.getDate() === 1);
      let text = null, span = 2;
      if (i === 0 || first) { text = `${d.getDate()} ${mon(d)}`; span = 4; }
      else if (weekday(d) === 0 && !soonFirst) text = String(d.getDate());
      if (text && i > end && i + span <= n + 1) { html += `<span class="sl" style="grid-column:${col[i]} / span ${span}">${text}</span>`; end = i + span - 1; }
    });
    return {
      cls: 'row', days,
      html: `<div class="sh"><span>${view.head}</span><b class="sh-r"></b></div><div class="srow" style="grid-template-columns:${tracks.join(' ')}">${days.map((_, i) => `<i style="grid-column:${col[i]}"></i>`).join('')}${html}</div>`,
    };
  }
  const W = view.weeks, start = addDays(vd, -weekday(vd) - (W - 1) * 7);
  const days = Array.from({ length: W * 7 }, (_, i) => addDays(start, i));
  let months = '', end = -1;
  for (let c = 0; c < W; c++) {
    const wk = days.slice(c * 7, c * 7 + 7), firstOf = wk.find(d => d.getDate() === 1);
    const label = firstOf || (c === 0 && !days.slice(7, 21).some(d => d.getDate() === 1) ? wk[0] : null);
    if (label && c > end) { months += `<span class="ml" style="grid-column:${c + 2} / span 3">${mon(label)}</span>`; end = c + 2; }
  }
  const wl = [0, 2, 4].map(r => `<span class="wl" style="grid-row:${r + 2}">${WEEKDAYS[r]}</span>`).join('');
  const cells = days.map((_, i) => `<i style="grid-area:${(i % 7) + 2} / ${Math.floor(i / 7) + 2}"></i>`).join('');
  return {
    cls: W > 20 ? 'y' : 'q', days,
    html: `<div class="sh"><span>${view.head}</span><b class="sh-r"></b></div><div class="sgrid" style="--w:${W}">${months}${wl}${cells}</div>`,
  };
}

function renderLegend() {
  const v = VIEWS[document.body.dataset.view];
  $('viewLegend').hidden = !state.habits.some(h => !h.archived);
  $('viewLegend').classList.toggle('round', !v.cells);
  $('viewLegend').title = v.label;
  $('viewLegend').innerHTML = `<span><i class="lg3"></i>выполнено</span><span><i class="lg1"></i>частично</span>
    <span><i class="lgs"></i>пропуск</span>${v.cells ? '' : '<span><i class="lgo"></i>не в плане</span>'}`;
}

function removeCard(el) {
  el.classList.add('leaving');
  if (reducedMotion) return el.remove();
  const h = el.offsetHeight;
  el.animate([
    { opacity: 1, transform: 'none', height: h + 'px' },
    { opacity: 0, transform: 'translateX(-16px)', height: h + 'px', offset: .45 },
    { opacity: 0, transform: 'translateX(-16px)', height: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0, marginBottom: '-10px' },
  ], { duration: 420, easing: EASE }).onfinish = () => el.remove();
}

let wasAllDone = null;
let firstRender = true, entering = 0;
function render() {
  const now = new Date(), hr = now.getHours();
  const uname = userName();
  $('setNameVal').textContent = uname || 'Не указано';
  $('hello').innerHTML = isToday(viewDate)
    ? esc(hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер') + (uname ? ', ' + esc(uname) : '') +
      ` · <span class="hello-date">${now.toLocaleDateString('ru-RU')}</span>`
    : esc(viewDate.toLocaleDateString('ru-RU', { weekday: 'long' }));
  const otherYear = viewDate.getFullYear() !== now.getFullYear();
  $('title').textContent = isToday(viewDate) ? 'Сегодня'
    : viewDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(otherYear && { year: 'numeric' }) }).replace(/\s?г\.$/, '');
  $('todayBtn').hidden = isToday(viewDate);
  renderWeek();

  const active = state.habits.filter(h => !h.archived);
  const habits = activeOn(viewDate);
  $('empty').hidden = active.length > 0;
  document.body.classList.toggle('no-habits', !active.length);
  $('hint').hidden = !active.length;

  const ids = new Set(habits.map(h => h.id));
  for (const [id, el] of cards) if (!ids.has(id)) { cards.delete(id); removeCard(el); }

  const defs = sectionDefs();
  const bySection = Object.fromEntries(defs.map(s => [s.id, []]));
  for (const h of habits) (bySection[sectionOf(h)] ?? bySection.off).push(h);

  const box = $('sections');
  let prevSec = null;
  for (const s of defs) {
    const sec = sectionEl(s.id);
    const want = prevSec ? prevSec.nextElementSibling : box.firstElementChild;
    if (sec !== want) box.insertBefore(sec, want);
    prevSec = sec;
    sec.querySelector('.sec-t').textContent = s.label;
    sec.classList.toggle('plain', !s.label);
  }

  const nextLive = n => { while (n && n.classList.contains('leaving')) n = n.nextElementSibling; return n; };
  for (const s of defs) {
    const sec = sectionEl(s.id), list = sec.querySelector('.list'), hs = bySection[s.id];
    let prev = null;
    for (const h of hs) {
      let el = cards.get(h.id);
      if (!el) { el = buildCard(h.id); cards.set(h.id, el); }
      const want = nextLive(prev ? prev.nextElementSibling : list.firstElementChild);
      if (el !== want) list.insertBefore(el, want);
      prev = el;
      sec.hidden = false;
      updateCard(el, h);
    }
    sec.hidden = !hs.length;
    const doneN = hs.filter(h => count(h, viewDate) >= h.target).length;
    sec.querySelector('.cnt').textContent = s.id === 'off' ? '' : `${doneN} / ${hs.length}`;
  }
  const live = new Set(defs.map(s => s.id));
  for (const [id, sec] of sectionEls) {
    if (live.has(id)) continue;
    sec.hidden = true;
    if (!sec.querySelector('.habit')) { sec.remove(); sectionEls.delete(id); }
  }

  renderHero();
  firstRender = false;
  renderLegend();
  renderArchive();
}

function renderWeek() {
  const start = addDays(viewDate, -weekday(viewDate)), tk = todayKey();
  [...$('days').children].forEach((b, i) => {
    const d = addDays(start, i), k = key(d), p = dayProgress(d);
    b.querySelector('.dn').textContent = d.getDate();
    b.querySelector('.prog').style.strokeDashoffset = DAY_C * (1 - p.frac);
    b.classList.toggle('sel', k === key(viewDate));
    b.classList.toggle('today', k === tk);
    b.classList.toggle('perfect', p.total > 0 && p.done === p.total);
    b.disabled = k > tk;
    b.title = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + (p.total ? ` — ${p.done} из ${p.total}` : '');
    b.onclick = () => { if (k !== key(viewDate)) goTo(d); };
  });
  $('next').disabled = key(addDays(start, 6)) >= tk;
  const first = firstHabitDay();
  $('prev').disabled = !first || key(start) <= first;
}

function renderHero() {
  const p = dayProgress(viewDate), today = isToday(viewDate);
  const anyHabits = state.habits.some(h => !h.archived);
  $('hero').hidden = !anyHabits;
  countTo($('heroDone'), p.done);
  $('heroTotal').textContent = p.total;
  countTo($('heroPct'), Math.round(p.frac * 100), '%');
  $('heroProg').style.strokeDashoffset = HERO_C * (1 - p.frac);
  const left = p.total - p.done, allDone = p.total > 0 && !left;
  $('heroMsg').textContent = !p.total && !activeOn(viewDate).length ? 'Привычек ещё не было'
    : !p.total ? 'Выходной — отдыхайте'
    : allDone ? (today ? 'Всё выполнено! 🎉' : 'Идеальный день 🎉')
    : !p.done ? (today ? 'Начните с простой привычки' : 'Ничего не отмечено')
    : `Осталось ${left} — Вы справитесь`;

  const chips = [];
  const ps = perfectStreak();
  if (ps) chips.push(`⭐ Идеально ${days(ps)} подряд`);
  const best = state.habits.filter(h => !h.archived).map(h => ({ h, s: streak(h) })).sort((a, b) => b.s - a.s)[0];
  if (best?.s >= 2) chips.push(`🔥 ${best.h.name} · ${days(best.s)}`);
  if (!chips.length) {
    let done = 0, total = 0;
    for (let i = 0; i < 7; i++) { const d = dayProgress(addDays(viewDate, -i)); done += d.done; total += d.total; }
    chips.push(`📅 За 7 дней: ${total ? Math.round(done / total * 100) : 0}%`);
  }
  const box = $('heroChips');
  box.innerHTML = chips.map(c => `<span class="chip" title="${esc(c)}">${esc(c)}</span>`).join('');
  while (box.children.length > 1 && box.scrollWidth > box.clientWidth) box.lastElementChild.remove();

  if (today && allDone && wasAllDone === false) celebrate();
  if (today) wasAllDone = allDone;
}

function celebrate() {
  if (reducedMotion) return;
  const r = $('heroProg').closest('.hero-ring').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.background = COLORS[i % COLORS.length];
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 120;
    p.animate([
      { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx * 1.2}px, ${dy + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2, .7, .4, 1)' }).onfinish = () => p.remove();
  }
}

function archiveHabit(id) {
  const h = findHabit(id);
  h.archived = todayKey();
  save(); render();
  toast(`«${h.name}» — в архиве`, () => { const x = findHabit(id); if (x) { delete x.archived; save(); render(); } });
}

async function deleteForever(id) {
  const h = findHabit(id);
  const ok = await askConfirm('Удалить навсегда?',
    `Привычка «${h.name}» и вся её история будут стёрты. Это нельзя отменить.`, 'Удалить');
  if (!ok || !findHabit(id)) return;
  state.habits = state.habits.filter(x => x.id !== id);
  for (const map of [state.log, state.skip]) for (const k in map) setMap(map, k, id, 0);
  if (hist?.id === id) { closeOverlay($('histOv')); hist = null; }
  save(); render();
}

function setArchiveOpen(open) {
  $('archToggle').setAttribute('aria-expanded', open);
  $('archBody').classList.toggle('open', open);
  $('archBody').inert = !open;
}
$('archToggle').onclick = () => setArchiveOpen($('archToggle').getAttribute('aria-expanded') !== 'true');

function renderArchive() {
  const archived = state.habits.filter(h => h.archived);
  $('archive').hidden = !archived.length;
  if (!archived.length) setArchiveOpen(false);
  $('archCount').textContent = archived.length;

  const list = $('archList');
  const known = new Set();
  for (const h of archived) {
    known.add(h.id);
    let row = list.querySelector(`[data-id="${h.id}"]`);
    if (!row) {
      row = document.createElement('div');
      row.className = 'card arch-item enter';
      row.dataset.id = h.id;
      row.innerHTML = `
        <div class="hicon"></div>
        <div class="info" tabindex="0" role="button" title="История и статистика"><div class="name"></div><div class="meta"></div></div>
        <div class="acts">
          <button class="restore">Вернуть</button>
          <button class="danger del">Удалить</button>
        </div>`;
      const info = row.querySelector('.info');
      info.onclick = () => openHistory(h.id);
      info.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHistory(h.id); } };
      row.querySelector('.restore').onclick = () => { const x = findHabit(h.id); if (!x) return; delete x.archived; save(); render(); };
      row.querySelector('.del').onclick = () => deleteForever(h.id);
      list.prepend(row);
    }
    row.style.setProperty('--c', h.color);
    setIcon(row.querySelector('.hicon'), h.icon);
    row.querySelector('.name').textContent = h.name;
    row.querySelector('.meta').textContent = `В архиве с ${fmtLong(h.archived)}`;
  }
  for (const row of [...list.children]) if (!known.has(row.dataset.id)) row.remove();
}

let editingId = null;
const form = {
  icon: 'check', color: COLORS[0], goal: 'once', sched: 'daily', days: [0, 1, 2, 3, 4], time: 'any', cat: null, newCat: false,
  rem: { on: false, touched: false, mode: 'times', times: ['09:00'], repeat: 0, repeatN: 1, from: '09:00', to: '21:00', days: null, dates: false, dFrom: '', dTo: '' },
};

function drawIconPickers() {
  $('emojis').innerHTML = ICON_KEYS.map(k => `<button type="button" data-v="${k}" title="${k}"><span class="hicon">${iconHTML(k)}</span></button>`).join('');
  $('templates').innerHTML = TEMPLATES.map((t, i) => `<button type="button" data-i="${i}"><span class="hicon ti" style="--c:${t.color}">${iconHTML(t.icon)}</span>${esc(t.name)}</button>`).join('');
}
$('colors').innerHTML = COLORS.map(c => `<button type="button" data-v="${c}" style="--sw:${c}" aria-label="Цвет ${c}"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`).join('');
$('weekdays').innerHTML = WEEKDAYS.map((w, i) => `<button type="button" data-v="${i}">${w}</button>`).join('');
$('timeSeg').innerHTML = TIMES.map(t => `<button type="button" data-v="${t.v}"><span class="t-ic">${t.icon}</span><span class="t-lb">${t.label}</span></button>`).join('');

function syncPreview() {
  const box = $('formPrev');
  const changed = box.style.getPropertyValue('--c') && box.style.getPropertyValue('--c') !== form.color;
  box.style.setProperty('--c', form.color);
  $('form').style.setProperty('--fc', form.color);
  $('emojis').style.setProperty('--c', form.color);
  setIcon($('fpIcon'), form.icon);
  const name = $('name').value.trim();
  $('fpName').textContent = name || 'Название привычки';
  $('fpName').classList.toggle('ph', !name);
  const n = formTarget(), unit = $('unit').value.trim();
  const goal = form.goal === 'once' ? 'Один раз в день'
    : `${n} ${unit || plural(n, 'раз', 'раза', 'раз')} в день` + (form.goal === 'step' ? ` · шаг ${formStep()}` : '');
  const sched = form.sched === 'daily' || form.days.length === 7 ? 'каждый день'
    : form.days.length ? schedText({ days: form.days }) : 'дни не выбраны';
  const time = TIMES.find(t => t.v === form.time);
  $('fpMeta').textContent = [goal, sched, form.time !== 'any' && time ? time.label.toLowerCase() : '', remShort()].filter(Boolean).join(' · ');
  renderRemindHint();
  if (changed && !reducedMotion) {
    box.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    $('fpIcon').animate([{ transform: 'scale(.82) rotate(-8deg)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  }
}
for (const id of ['name', 'unit']) $(id).addEventListener('input', syncPreview);
$('target').addEventListener('input', () => goalInput());

const REM_DEFAULT = { morning: ['08:00', '07:00', '12:00'], day: ['13:00', '10:00', '18:00'], evening: ['20:00', '17:00', '22:00'], any: ['09:00', '09:00', '21:00'] };
const remDefaults = () => REM_DEFAULT[form.time] || REM_DEFAULT.any;
const formTarget = () => form.goal === 'once' ? 1 : clampTarget($('target').value);
const formStep = () => form.goal === 'step' ? clampStep($('step').value) : 1;
const remTarget = () => Math.ceil(formTarget() / formStep());
const habitDays = () => form.sched === 'days' && form.days.length && form.days.length < 7 ? form.days : [0, 1, 2, 3, 4, 5, 6];
const remDays = () => { const all = habitDays(), d = (form.rem.days || all).filter(x => all.includes(x)); return d.length ? d : all; };
const remIsSpread = () => form.rem.mode === 'spread' && remTarget() > 1;
const fmtDur = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return [h && `${h} ч`, mm && `${mm} мин`].filter(Boolean).join(' ') || 'меньше минуты'; };
const fmtShortDay = k => parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
const fmtPickDay = k => {
  const d = parseKey(k), other = d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: other ? 'short' : 'long', ...(other && { year: 'numeric' }) })
    .replace(/\./g, '').replace(/\s?г$/, '').trim();
};
const joinAnd = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1];

function remFromHabit(h) {
  const [t, f, to] = remDefaults();
  const r = h?.remind;
  return {
    on: !!r, touched: !!r, mode: r?.spread ? 'spread' : r ? 'times' : (form.goal !== 'once' ? 'spread' : 'times'),
    times: r?.times ? [...r.times] : [t], repeat: r?.repeat || 0, repeatN: r?.repeatN || 1,
    from: r?.spread?.from || f, to: r?.spread?.to || to,
    days: r?.days ? [...r.days] : null, dates: !!(r?.from || r?.to), dFrom: r?.from || '', dTo: r?.to || '',
  };
}
function remToData() {
  const r = form.rem;
  if (!r.on) return undefined;
  const out = {};
  if (remIsSpread()) out.spread = { from: r.from, to: r.to };
  else { out.times = [...r.times]; if (r.repeat) { out.repeat = r.repeat; out.repeatN = r.repeatN; } }
  const all = habitDays(), days = remDays();
  if (days.length < all.length) out.days = [...days];
  if (r.dates) { if (r.dFrom) out.from = r.dFrom; if (r.dTo) out.to = r.dTo; }
  return normRemind(out, remTarget()) || undefined;
}
function remSummaryText() {
  const r = form.rem;
  if (!r.on) return 'Выключены';
  const parts = [];
  if (remIsSpread()) {
    const n = remTarget();
    parts.push(`${n} ${plural(n, 'раз', 'раза', 'раз')} с ${r.from} до ${r.to}`);
  } else {
    parts.push('в ' + joinAnd(r.times));
    if (r.repeat) parts.push(`повтор через ${r.repeat === 60 ? 'час' : r.repeat + ' мин'}`);
  }
  const days = remDays();
  if (days.length < 7) parts.push(schedText({ days }));
  if (r.dates && (r.dFrom || r.dTo)) parts.push(r.dFrom && r.dTo ? `${fmtShortDay(r.dFrom)} — ${fmtShortDay(r.dTo)}` : r.dTo ? `до ${fmtShortDay(r.dTo)}` : `с ${fmtShortDay(r.dFrom)}`);
  const s = parts.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function remShort() {
  const r = form.rem;
  if (!r?.on) return '';
  if (remIsSpread()) return `🔔 ${remTarget()}× ${r.from}–${r.to}`;
  return '🔔 ' + (r.times.length > 2 ? `${r.times.slice(0, 2).join(', ')} +${r.times.length - 2}` : r.times.join(', '));
}

const setCollapse = (el, open) => { el.classList.toggle('open', open); el.inert = !open; };
$('remDays').innerHTML = WEEKDAYS.map((w, i) => `<button type="button" data-v="${i}">${w}</button>`).join('');

function renderTimes(enterIndex = -1) {
  const t = form.rem.times;
  $('remTimes').innerHTML = t.map((v, i) => `<span class="tchip${t.length > 1 ? '' : ' solo'}" data-i="${i}">
      <label class="tpick"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><b>${v}</b><input class="native" type="time" step="300" value="${v}" aria-label="Время напоминания ${i + 1}"></label>
      ${t.length > 1 ? `<button type="button" class="x" aria-label="Убрать ${v}"><svg class="ic" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>` : ''}
    </span>`).join('')
    + (t.length < 6 ? `<button type="button" class="tadd" id="remAdd"><svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Добавить</button>` : '');
  const chip = $('remTimes').querySelector(`.tchip[data-i="${enterIndex}"]`);
  if (chip && !reducedMotion) chip.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
}

function renderRem() {
  const r = form.rem, multi = remTarget() > 1;
  if (!r.touched) {
    const [t, f, to] = remDefaults();
    const before = r.times.join();
    Object.assign(r, { mode: multi ? 'spread' : 'times', times: [t], from: f, to });
    if (before !== r.times.join()) renderTimes();
  }
  if (!multi && r.mode === 'spread') r.mode = 'times';
  $('rem').classList.toggle('on', r.on);
  $('remSwitch').setAttribute('aria-checked', r.on);
  setCollapse($('remWrap'), r.on);
  setCollapse($('remModeWrap'), multi);
  $('remMode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (remIsSpread() ? 'spread' : 'times')));
  setCollapse($('remSpreadWrap'), remIsSpread());
  setCollapse($('remTimesWrap'), !remIsSpread());
  if (document.activeElement !== $('remFrom')) $('remFrom').value = r.from;
  if (document.activeElement !== $('remTo')) $('remTo').value = r.to;
  $('remFromVal').textContent = r.from;
  $('remToVal').textContent = r.to;
  const n = remTarget(), span = toMin(r.to) - toMin(r.from);
  $('remSpreadNote').textContent = span <= 0
    ? 'Конец промежутка должен быть позже начала.'
    : `${n} ${plural(n, 'напоминание', 'напоминания', 'напоминаний')}, примерно каждые ${fmtDur(span / Math.max(1, n - 1))}. Придут, только если Вы отстаёте от плана.`;
  $('remSpreadNote').style.color = span <= 0 ? 'var(--danger)' : '';
  $('remRepeat').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === r.repeat));
  setCollapse($('remRepeatWrap'), !remIsSpread());
  const rOn = r.repeat > 0, row = $('remRepeatNRow');
  row.classList.toggle('off', !rOn);
  row.querySelectorAll('button').forEach(b => { b.disabled = !rOn; });
  let note = 'Напоминание придёт один раз в указанное время.';
  if (rOn) {
    const after = Array.from({ length: r.repeatN }, (_, k) => (k + 1) * r.repeat);
    const fmtAfter = m => m % 60 ? `${m} мин` : m === 60 ? 'час' : `${m / 60} ч`;
    note = r.times.length === 1
      ? (r.repeatN === 1 ? 'Ещё раз' : `Ещё ${r.repeatN} ${plural(r.repeatN, 'раз', 'раза', 'раз')}`) + ` в ${joinAnd(after.map(m => toMin(r.times[0]) + m).filter(m => m < 1440).map(fromMin))}, если привычка не отмечена.`
      : `Через ${joinAnd(after.map(fmtAfter))} после каждого времени, если привычка не отмечена.`;
  }
  $('remRepeatNote').textContent = note;
  $('remRepeatN').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === r.repeatN));
  $('remRepeatWord').textContent = plural(r.repeatN, 'раза', 'раз', 'раз');
  const all = habitDays(), sel = remDays();
  $('remDays').querySelectorAll('button').forEach(b => {
    const d = +b.dataset.v;
    b.disabled = !all.includes(d);
    b.setAttribute('aria-pressed', sel.includes(d));
  });
  $('remDatesSwitch').setAttribute('aria-checked', r.dates);
  setCollapse($('remDatesWrap'), r.dates);
  if (document.activeElement !== $('remDFrom')) $('remDFrom').value = r.dFrom;
  if (document.activeElement !== $('remDTo')) $('remDTo').value = r.dTo;
  $('remDFromVal').textContent = r.dFrom ? fmtPickDay(r.dFrom) : 'Не выбрано';
  $('remDToVal').textContent = r.dTo ? fmtPickDay(r.dTo) : 'Не выбрано';
  const sum = $('remSummary'), text = remSummaryText();
  if (sum.textContent !== text) {
    const had = sum.textContent;
    sum.textContent = text;
    if (had && !reducedMotion) sum.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
}
function remChanged() { form.rem.touched = true; renderRem(); syncPreview(); }

function remToggle() {
  const r = form.rem;
  r.on = !r.on;
  if (r.on && !reducedMotion) {
    const ic = $('remIc');
    ic.classList.remove('ringing'); void ic.offsetWidth; ic.classList.add('ringing');
    setTimeout(() => $('rem').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 380);
  }
  remChanged();
}
$('remHead').onclick = e => { if (!e.target.closest('#remSwitch')) remToggle(); };
const noTimePopup = /Firefox\//.test(navigator.userAgent);
function openPicker(input) {
  if (isIOS) return input.focus();
  try {
    if (input.type === 'time' && noTimePopup) throw new Error('no popup');
    input.showPicker();
  } catch {
    const box = input.parentElement;
    box.classList.add('editing');
    input.focus();
    input.addEventListener('blur', () => {
      box.classList.remove('editing');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { once: true });
  }
}
$('rem').addEventListener('click', e => {
  const input = e.target.closest('.native');
  if (!input || isIOS || input.parentElement.classList.contains('editing')) return;
  e.preventDefault();
  openPicker(input);
});
$('rem').addEventListener('input', e => {
  const input = e.target.closest('.native');
  if (!input) return;
  const b = input.parentElement.querySelector('b');
  if (input.type === 'time' && HHMM.test(input.value)) b.textContent = input.value;
  if (input.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) b.textContent = fmtPickDay(input.value);
});
$('remSwitch').onclick = remToggle;
$('remMode').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.mode = b.dataset.v; remChanged(); } };
$('remRepeat').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.repeat = +b.dataset.v; remChanged(); } };
$('remRepeatN').onclick = e => { const b = e.target.closest('button'); if (b) { form.rem.repeatN = +b.dataset.v; remChanged(); } };
for (const [id, k] of [['remFrom', 'from'], ['remTo', 'to']]) {
  $(id).addEventListener('change', e => {
    if (e.target.parentElement.classList.contains('editing')) return;
    if (HHMM.test(e.target.value)) form.rem[k] = e.target.value; else e.target.value = form.rem[k];
    remChanged();
  });
}
$('remDays').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = +b.dataset.v, cur = remDays();
  const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort();
  if (!next.length) { $('remDays').classList.remove('shake'); void $('remDays').offsetWidth; $('remDays').classList.add('shake'); return toast('Нужен хотя бы один день', null, ''); }
  form.rem.days = next.length === habitDays().length ? null : next;
  remChanged();
};
$('remDatesRow').onclick = e => {
  const r = form.rem;
  r.dates = !r.dates;
  if (r.dates && !r.dFrom && !r.dTo) { r.dFrom = todayKey(); r.dTo = key(addDays(new Date(), 30)); }
  remChanged();
};
for (const [id, k] of [['remDFrom', 'dFrom'], ['remDTo', 'dTo']]) {
  $(id).addEventListener('change', e => {
    if (e.target.parentElement.classList.contains('editing')) return;
    const r = form.rem;
    r[k] = /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : '';
    if (r.dFrom && r.dTo && r.dFrom > r.dTo) { if (k === 'dFrom') r.dTo = r.dFrom; else r.dFrom = r.dTo; }
    remChanged();
  });
}
$('remTimes').addEventListener('change', e => {
  const input = e.target.closest('input'), chip = input?.closest('.tchip');
  if (!chip || input.parentElement.classList.contains('editing')) return;
  const i = +chip.dataset.i, t = form.rem.times, v = input.value;
  const revert = () => { input.value = t[i]; input.parentElement.querySelector('b').textContent = t[i]; };
  if (!HHMM.test(v)) return revert();
  if (t.some((x, j) => x === v && j !== i)) { chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake'); revert(); return toast('Такое время уже есть', null, ''); }
  t[i] = v; t.sort();
  renderTimes(); remChanged();
});
$('remTimes').addEventListener('click', e => {
  const t = form.rem.times;
  if (e.target.closest('#remAdd')) {
    let m = t.length ? toMin(t[t.length - 1]) + 180 : toMin(remDefaults()[0]);
    if (m > 22 * 60) m = t.length && toMin(t[0]) - 180 >= 6 * 60 ? toMin(t[0]) - 180 : 12 * 60;
    for (let k = 0; k < 48 && t.includes(fromMin(m % 1440)); k++) m += 30;
    const v = fromMin(m % 1440);
    t.push(v); t.sort();
    renderTimes(t.indexOf(v)); remChanged();
    openPicker($('remTimes').querySelector(`.tchip[data-i="${t.indexOf(v)}"] .native`));
    return;
  }
  const x = e.target.closest('.x');
  if (!x) return;
  const chip = x.closest('.tchip'), i = +chip.dataset.i;
  const done = () => { t.splice(i, 1); renderTimes(); remChanged(); };
  if (reducedMotion) return done();
  chip.style.pointerEvents = 'none';
  chip.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 180, easing: 'cubic-bezier(.55, 0, .75, .2)' }).finished.then(done, done);
});

function syncForm() {
  const press = (box, fn) => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', fn(b.dataset.v)));
  press($('emojis'), v => v === form.icon);
  press($('colors'), v => v === form.color);
  press($('goalSeg'), v => v === form.goal);
  press($('schedSeg'), v => v === form.sched);
  press($('weekdays'), v => form.days.includes(+v));
  press($('timeSeg'), v => v === form.time);
  setCollapse($('goalWrap'), form.goal !== 'once');
  setCollapse($('stepWrap'), form.goal === 'step');
  $('target').max = form.goal === 'step' ? 10000 : 100;
  if (form.goal !== 'once') $('target').value = clampTarget($('target').value);
  renderStep();
  setCollapse($('daysWrap'), form.sched === 'days');
  if (form.cat && !catName(form.cat)) form.cat = null;
  $('catChips').innerHTML = [{ id: '', name: 'Без типа' }, ...state.categories]
    .map(c => `<button type="button" data-v="${esc(c.id)}" aria-pressed="${(form.cat || '') === c.id}">${esc(c.name)}</button>`).join('')
    + `<button type="button" class="add-chip" data-v="__new" aria-pressed="${form.newCat}">+ Новый тип</button>`;
  setCollapse($('newCatWrap'), form.newCat);
  renderRem();
  syncPreview();
}
const pick = (box, fn) => box.onclick = e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); syncForm(); } };
pick($('emojis'), v => form.icon = v);
pick($('colors'), v => form.color = v);
pick($('goalSeg'), v => form.goal = v);
pick($('schedSeg'), v => form.sched = v);
pick($('timeSeg'), v => form.time = v);
pick($('catChips'), v => {
  if (v === '__new') { form.newCat = !form.newCat; if (form.newCat) setTimeout(() => $('newCatName').focus(), 80); }
  else { form.cat = v || null; form.newCat = false; }
});
function addCategory(name) {
  name = name.trim().slice(0, 40);
  if (!name) return null;
  const existing = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  state.categories.push({ id, name });
  save();
  return id;
}
$('newCatAdd').onclick = () => {
  const id = addCategory($('newCatName').value);
  if (!id) return $('newCatName').focus();
  form.cat = id; form.newCat = false; $('newCatName').value = '';
  syncForm(); render();
};
$('newCatName').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('newCatAdd').click(); } };
$('formManageCats').onclick = () => openCats();
pick($('weekdays'), v => {
  v = +v;
  form.days = form.days.includes(v) ? form.days.filter(x => x !== v) : [...form.days, v].sort();
});
$('templates').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = TEMPLATES[b.dataset.i];
  $('name').value = t.name;
  Object.assign(form, { icon: t.icon, color: t.color, time: t.time, goal: t.step ? 'step' : t.target > 1 ? 'multi' : 'once' });
  if (t.target > 1) $('target').value = t.target;
  if (t.step) $('step').value = t.step;
  $('unit').value = t.unit || '';
  syncForm();
};
const clampTarget = v => Math.max(2, Math.min(form.goal === 'step' ? 10000 : 100, parseInt(v) || 2));
const clampStep = v => Math.max(1, Math.min(clampTarget($('target').value), parseInt(v) || 1));
const goalInput = () => { renderStep(); renderRem(); syncPreview(); };
const targetBy = dir => {
  const t = clampTarget($('target').value), s = form.goal === 'step' ? formStep() : 1;
  $('target').value = clampTarget(dir > 0 ? (Math.floor(t / s) + 1) * s : (Math.ceil(t / s) - 1) * s);
  goalInput();
};
$('tMinus').onclick = () => targetBy(-1);
$('tPlus').onclick = () => targetBy(1);
$('sMinus').onclick = () => { $('step').value = clampStep(formStep() - 1); goalInput(); };
$('sPlus').onclick = () => { $('step').value = clampStep(formStep() + 1); goalInput(); };
$('step').addEventListener('input', goalInput);
$('step').addEventListener('change', () => { $('step').value = formStep(); goalInput(); });
$('target').addEventListener('change', () => { $('target').value = clampTarget($('target').value); goalInput(); });
$('stepChips').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  $('step').value = clampStep(b.dataset.v);
  goalInput();
};
const STEP_PRESETS = [2, 5, 10, 15, 20, 25, 30, 50, 100, 250, 500];
function renderStep() {
  if (form.goal !== 'step') return;
  const t = formTarget(), s = formStep(), u = Math.ceil(t / s);
  if (document.activeElement !== $('step')) $('step').value = s;
  $('step').max = t;
  $('stepSum').innerHTML = `<b>${u}</b> ${plural(u, 'нажатие', 'нажатия', 'нажатий')} до цели`;
  const presets = STEP_PRESETS.filter(v => v < t && t / v <= 60);
  const chips = (presets.length > 5 ? presets.filter((v, i) => i >= presets.length - 5) : presets);
  const chipKey = chips.join();
  if ($('stepChips').dataset.k !== chipKey) {
    $('stepChips').dataset.k = chipKey;
    $('stepChips').innerHTML = chips.map(v => `<button type="button" data-v="${v}">${v}</button>`).join('');
  }
  $('stepChips').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === s));
  const viz = $('stepViz'), show = Math.min(u, 20), vizKey = `${t}/${s}`;
  if (viz.dataset.k === vizKey) return;
  const prevN = +viz.dataset.n || 0;
  viz.dataset.k = vizKey; viz.dataset.n = show;
  const last = (t % s || s) / s;
  viz.innerHTML = Array.from({ length: show }, (_, i) => `<i style="flex:${i === u - 1 ? last : 1}"></i>`).join('')
    + (u > show ? `<span>+${u - show}</span>` : '');
  if (!reducedMotion && $('formOv')._shown) viz.querySelectorAll('i').forEach((el, i) => {
    if (i >= prevN) el.animate([{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: Math.min(i - prevN, 10) * 22, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'backwards' });
  });
}

function openForm(id = null) {
  const h = id && findHabit(id);
  editingId = h ? id : null;
  $('form').reset();
  $('formTitle').textContent = h ? 'Изменить привычку' : 'Новая привычка';
  $('submit').innerHTML = h
    ? '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Сохранить'
    : '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Добавить привычку';
  $('tplField').hidden = !!h;
  Object.assign(form, h
    ? { icon: h.icon, color: h.color, goal: h.step ? 'step' : h.target > 1 ? 'multi' : 'once', sched: h.days ? 'days' : 'daily', days: h.days ? [...h.days] : [0, 1, 2, 3, 4], time: h.time, cat: h.cat }
    : { icon: 'check', color: COLORS[state.habits.length % COLORS.length], goal: 'once', sched: 'daily', days: [0, 1, 2, 3, 4], time: 'any', cat: null },
    { newCat: false });
  $('newCatName').value = '';
  $('name').value = h?.name || '';
  $('target').value = h && h.target > 1 ? h.target : 8;
  $('step').value = h?.step || 5;
  delete $('stepViz').dataset.k; delete $('stepViz').dataset.n;
  $('unit').value = h?.unit || '';
  $('why').value = h?.why || '';
  form.rem = remFromHabit(h);
  renderTimes();
  $('formPrev').style.removeProperty('--c');
  drawIconPickers();
  syncForm();
  openOverlay($('formOv'));
  setTimeout(() => $('name').focus({ preventScroll: true }), 60);
}

function openCats() {
  renderCats();
  openOverlay($('catOv'));
}
function renderCatsInfo() {
  const cats = state.categories, n = cats.length;
  $('setCatsInfo').textContent = n
    ? `${n} ${plural(n, 'тип', 'типа', 'типов')}: ${cats.map(c => c.name).join(', ')}`
    : 'Пока нет — создайте свои группы';
}
function catsChanged() {
  save(); render(); renderCats(); renderCatsInfo();
  if ($('formOv')._shown) syncForm();
  if (hist) renderHistory();
}
function renderCats() {
  const list = $('catList');
  if (!state.categories.length) {
    list.innerHTML = '<div class="cat-empty">Пока нет ни одного типа. Добавьте первый ниже.</div>';
    return;
  }
  const IC_UP = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
  const IC_DOWN = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  const IC_DEL = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  list.innerHTML = state.categories.map((c, i) => {
    const n = state.habits.filter(h => h.cat === c.id).length;
    return `<div class="cat-row" data-id="${esc(c.id)}">
      <input type="text" class="cat-name" maxlength="40" value="${esc(c.name)}" aria-label="Название типа">
      <span class="cat-cnt" title="Привычек этого типа">${n}</span>
      <button class="ghost icon-btn" data-act="up" title="Выше" ${i ? '' : 'disabled'}>${IC_UP}</button>
      <button class="ghost icon-btn" data-act="down" title="Ниже" ${i < state.categories.length - 1 ? '' : 'disabled'}>${IC_DOWN}</button>
      <button class="ghost icon-btn danger" data-act="del" title="Удалить тип">${IC_DEL}</button>
    </div>`;
  }).join('');
}
$('catList').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const id = b.closest('.cat-row').dataset.id, i = state.categories.findIndex(c => c.id === id);
  if (i < 0) return;
  const cats = state.categories;
  if (b.dataset.act === 'up' && i > 0) [cats[i - 1], cats[i]] = [cats[i], cats[i - 1]];
  else if (b.dataset.act === 'down' && i < cats.length - 1) [cats[i + 1], cats[i]] = [cats[i], cats[i + 1]];
  else if (b.dataset.act === 'del') {
    const n = state.habits.filter(h => h.cat === id).length;
    if (n && !await askConfirm('Удалить тип?', `«${cats[i].name}» будет удалён. ${n} ${plural(n, 'привычка останется', 'привычки останутся', 'привычек останутся')} без типа — сами привычки и их история не пострадают.`, 'Удалить')) return;
    state.categories = state.categories.filter(c => c.id !== id);
    state.habits.forEach(h => { if (h.cat === id) h.cat = null; });
  }
  catsChanged();
});
$('catList').addEventListener('change', e => {
  const inp = e.target.closest('.cat-name');
  if (!inp) return;
  const c = state.categories.find(x => x.id === inp.closest('.cat-row').dataset.id);
  const name = inp.value.trim().slice(0, 40);
  if (!c || !name) { inp.value = c?.name || ''; return; }
  c.name = name;
  catsChanged();
});
$('catList').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.cat-name')) e.target.blur(); });
$('catNewAdd').onclick = () => {
  if (!addCategory($('catNewName').value)) return $('catNewName').focus();
  $('catNewName').value = '';
  catsChanged();
  $('catNewName').focus();
};
$('catNewName').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('catNewAdd').click(); } };

$('addBtn').onclick = () => openForm();
$('fab').onclick = () => openForm();
$('emptyAdd').onclick = () => openForm();

$('form').onsubmit = e => {
  e.preventDefault();
  const name = $('name').value.trim();
  if (!name) return;
  if (form.sched === 'days' && !form.days.length) return toast('Выберите хотя бы один день недели');
  if (form.rem.on && remIsSpread() && toMin(form.rem.to) <= toMin(form.rem.from)) {
    $('rem').scrollIntoView({ block: 'center', behavior: 'smooth' });
    return toast('Напоминания: конец промежутка должен быть позже начала', null, '');
  }
  const target = formTarget(), step = form.goal === 'step' ? formStep() : 0;
  const data = {
    name, target, icon: form.icon, color: form.color, time: form.time,
    unit: form.goal !== 'once' ? $('unit').value.trim() : '',
    days: form.sched === 'days' && form.days.length < 7 ? [...form.days] : null,
    why: $('why').value.trim(),
    cat: form.cat && catName(form.cat) ? form.cat : null,
    remind: remToData(),
  };
  if (step) data.step = step;
  const h = editingId && findHabit(editingId);
  if (h) {
    Object.assign(h, data, { updated: todayKey() });
    if (!step) delete h.step;
    for (const k in state.log) if (state.log[k][h.id] > target) state.log[k][h.id] = target;
  } else {
    state.habits.push({ id: crypto.randomUUID?.() || String(Date.now()), created: todayKey(), ...data });
  }
  save(); render();
  closeOverlay($('formOv'));
  if (hist) renderHistory();
};

let hist = null;
const IC_I = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/></svg>';
const STAT_INFO = {
  streak: {
    icon: '🔥', title: 'Серия',
    lead: 'Сколько запланированных дней подряд цель выполнена полностью.',
    how: 'Дни вне расписания и отмеченные пропуском цепочку не рвут. Сегодняшний день засчитывается после выполнения, а до конца дня серия не сгорает. Один невыполненный день обнуляет счёт.',
    why: 'Помогает держать ритм: чем длиннее цепочка, тем жальче её прерывать. Лучшая серия становится рекордом.',
  },
  best: {
    icon: '🏆', title: 'Рекорд',
    lead: 'Самая длинная серия за всё время существования привычки.',
    how: 'Считается по тем же правилам, что и серия. Обновляется, когда текущая серия становится длиннее, и не уменьшается после срыва.',
    why: 'Показывает, на что Вы уже способны, и даёт ориентир, который хочется превзойти.',
  },
  done: {
    icon: '✅', title: 'Выполнено',
    lead: 'Доля запланированных дней, когда цель выполнена полностью.',
    how: 'Полностью выполненные дни делятся на все запланированные с момента создания. Частичное выполнение не засчитывается, пропуски и дни вне расписания не учитываются, сегодняшний день — только после выполнения.',
    why: 'Честная общая картина регулярности: один срыв почти не меняет процент, а долгие перерывы заметно его снижают.',
  },
  power: {
    icon: '💪', title: 'Сила',
    lead: 'Насколько прочно привычка закрепилась именно сейчас.',
    how: 'Учитывается каждый запланированный день, частичное выполнение — частично. Свежие дни весят больше: вклад дня уменьшается вдвое примерно за две недели.',
    why: 'В отличие от серии, один пропуск лишь немного снижает силу, а не обнуляет её. Регулярность в последние недели поднимает шкалу быстрее всего.',
  },
};

function openHistory(id) {
  const h = findHabit(id);
  hist = { id, range: hist?.range || 'week', anchor: parseKey(lifeEnd(h)) };
  renderHistory();
  openOverlay($('histOv'));
}
$('histOv').addEventListener('click', e => { if (e.target === $('histOv') || e.target.closest('[data-close]')) hist = null; });

$('hTabs').onclick = e => {
  const r = e.target.closest('button')?.dataset.r;
  if (!r || !hist || r === hist.range) return;
  hist.range = r;
  renderHistory();
};
function shiftPeriod(dir) {
  const a = hist.anchor;
  hist.anchor = hist.range === 'week' ? addDays(a, 7 * dir)
              : hist.range === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1)
              : new Date(a.getFullYear() + dir, 0, 1);
  renderHistory();
}
$('hPrev').onclick = () => shiftPeriod(-1);
$('hNext').onclick = () => shiftPeriod(1);

function periodDays() {
  const a = hist.anchor;
  let start, n;
  if (hist.range === 'week') { start = addDays(a, -weekday(a)); n = 7; }
  else if (hist.range === 'month') { start = new Date(a.getFullYear(), a.getMonth(), 1); n = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate(); }
  else { start = new Date(a.getFullYear(), 0, 1); n = Math.round((new Date(a.getFullYear() + 1, 0, 1) - start) / 864e5); }
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

function periodLabel(ds) {
  const a = ds[0], b = ds[ds.length - 1];
  if (hist.range === 'year') return String(a.getFullYear());
  if (hist.range === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.getDate()}${sameMonth ? '' : ' ' + MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

function dayTip(h, d) {
  const k = key(d), c = count(h, d);
  const date = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  if (k > todayKey()) return `${date}: ещё впереди`;
  if (k < h.created) return `${date}: привычки ещё не было`;
  if (h.archived && k > h.archived) return `${date}: в архиве`;
  if (isSkipped(h, d)) return `${date}: пропуск`;
  if (!isDue(h, d) && !c) return `${date}: не по расписанию`;
  if (h.target === 1) return `${date}: ${c ? 'выполнено' : 'не выполнено'}`;
  return `${date}: ${c} из ${h.target}${h.unit ? ' ' + h.unit : ''}`;
}

function renderHistory() {
  const h = findHabit(hist.id);
  if (!h) return;
  const ls = lifeStats(h), cur = h.archived ? 0 : streak(h);
  $('hSheet').style.setProperty('--c', h.color);
  setIcon($('hIcon'), h.icon);
  $('hName').textContent = h.name;
  const time = TIMES.find(t => t.v === h.time);
  const goal = (h.target > 1 ? `${h.target} ${h.unit || 'раз'} в день` : '1 раз в день') + (h.step > 1 ? ` · шаг ${h.step}` : '');
  $('hTags').innerHTML = [
    h.archived ? '<span class="tag arch">В архиве</span>' : '',
    `<span class="tag">${esc(h.step > 1 ? `${h.target} ${h.unit || 'раз'} · шаг ${h.step}` : goal)}</span>`,
    `<span class="tag">${time.icon} ${time.v === 'any' ? 'Любое время' : time.label}</span>`,
    h.cat && catName(h.cat) ? `<span class="tag cat">${esc(catName(h.cat))}</span>` : '',
  ].join('');
  requestAnimationFrame(() => $('hTags').classList.toggle('more', $('hTags').scrollWidth > $('hTags').clientWidth + 1));
  $('hWhy').hidden = !h.why;
  $('hWhy').innerHTML = `<b>Зачем мне это</b>${esc(h.why)}`;

  const pct = ls.due ? Math.round(ls.full / ls.due * 100) : 0, strength = Math.round(ls.score * 100);
  const tile = (k, icon, l, v, sub, bar) => `<div class="tile">
    <div class="l"><span>${icon}</span>${l}</div><div class="v">${v}</div>
    ${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : `<div class="s">${sub}</div>`}
    <button class="tile-i" data-k="${k}" aria-label="Что значит «${l}»" aria-haspopup="dialog">${IC_I}</button></div>`;
  $('hTiles').innerHTML =
    tile('streak', '🔥', 'Серия', cur, cur ? `${plural(cur, 'день', 'дня', 'дней')} подряд`
      : h.archived ? 'в архиве' : isDue(h, new Date()) ? 'начните сегодня' : 'пока нет серии') +
    tile('best', '🏆', 'Рекорд', ls.best, plural(ls.best, 'день', 'дня', 'дней')) +
    tile('done', '✅', 'Выполнено', pct + '%', `${ls.full} из ${days(ls.due)}`) +
    tile('power', '💪', 'Сила', strength + '%', '', strength);
  $('hTiles').onclick = e => {
    const b = e.target.closest('.tile-i');
    if (!b) return;
    if (menuEl?._anchor === b) return closeMenu();
    const t = STAT_INFO[b.dataset.k];
    openPopover(b, `<div class="pop-title">${t.icon} ${t.title}</div><p class="pop-lead">${t.lead}</p>
      <div class="pop-sec"><b>Как считается</b>${t.how}</div><div class="pop-sec"><b>На что влияет</b>${t.why}</div>`, h.color);
  };

  $('hInfo').onclick = e => {
    if (menuEl?._anchor === e.currentTarget) return closeMenu();
    openPopover(e.currentTarget, `<div class="pop-title">Сведения</div><div class="facts">${factsHTML()}</div>`, h.color);
  };
  const factsHTML = () => {
  const ago = k => {
    const n = Math.round((parseKey(todayKey()) - parseKey(k)) / 864e5);
    return n === 0 ? 'сегодня' : n === 1 ? 'вчера' : `${days(n)} назад`;
  };
  const IC_CAL = '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  const IC_PEN = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>';
  const IC_GOAL = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></svg>';
  const IC_REP = '<svg class="ic" viewBox="0 0 24 24"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/></svg>';
  const IC_BOX = '<svg class="ic" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>';
  const fact = (icon, l, v, sub = '') => `<div class="fact"><span class="fi">${icon}</span><span class="fl">${l}</span>
    <span class="fv">${esc(v)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
  const sched = schedText(h);
  return fact(IC_CAL, 'Создана', fmtLong(h.created), ago(h.created)) +
    (h.updated && h.updated !== h.created ? fact(IC_PEN, 'Изменена', fmtLong(h.updated), ago(h.updated)) : '') +
    fact(IC_GOAL, 'Цель', goal) +
    fact(IC_REP, 'Расписание', sched[0].toUpperCase() + sched.slice(1)) +
    fact(IC_BOX.replace('M10 12h4', 'M8 12h8'), 'Тип', catName(h.cat) || 'Без типа') +
    (h.archived ? fact(IC_BOX, 'В архиве', fmtLong(h.archived), ago(h.archived)) : '');
  };

  for (const b of $('hTabs').children) b.setAttribute('aria-pressed', b.dataset.r === hist.range);

  const ds = periodDays();
  $('hLabel').textContent = periodLabel(ds);
  $('hPrev').disabled = key(ds[0]) <= h.created;
  $('hNext').disabled = key(ds[ds.length - 1]) >= lifeEnd(h);

  const live = ds.filter(d => inLife(h, key(d)) && counts(h, d) && !(isToday(d) && count(h, d) < h.target));
  const full = live.filter(d => count(h, d) >= h.target).length;
  const avg = live.length ? live.reduce((s, d) => s + Math.min(count(h, d) / h.target, 1), 0) / live.length : 0;
  $('hStats').innerHTML = live.length
    ? `Выполнено <b>${full}</b> из ${days(live.length)} · средний прогресс <b>${Math.round(avg * 100)}%</b>`
    : 'В этот период данных нет';

  if (hist.range === 'year') {
    const months = Array.from({ length: 12 }, (_, m) => {
      const md = ds.filter(d => d.getMonth() === m && inLife(h, key(d)) && counts(h, d));
      const fullM = md.filter(d => count(h, d) >= h.target).length;
      const pct = md.length ? Math.round(md.reduce((s, d) => s + Math.min(count(h, d) / h.target, 1), 0) / md.length * 100) : 0;
      return {
        value: pct, active: md.length > 0, label: MONTHS_SHORT[m],
        tip: md.length ? `${MONTHS[m]}: ${pct}% · выполнено ${fullM} из ${days(md.length)}` : `${MONTHS[m]}: нет данных`,
      };
    });
    barChart($('hChart'), months, { yMax: 100, ticks: [0, 50, 100], fmt: v => v + '%' });
    $('hHeatWrap').hidden = false;
    heatmap($('hHeat'), h, ds);
  } else {
    $('hChart').innerHTML = (hist.range === 'week' ? weekView(h, ds) : monthView(h, ds)) + '<div class="tip"></div>';
    $('hHeatWrap').hidden = true;
  }
}

function dayState(h, d) {
  const k = key(d), c = count(h, d);
  if (k > todayKey()) return 'future';
  if (k < h.created) return 'before';
  if (h.archived && k > h.archived) return 'after';
  if (isSkipped(h, d)) return 'skip';
  if (c >= h.target) return 'full';
  if (c > 0) return 'part';
  if (!isDue(h, d)) return 'off';
  return k === todayKey() ? 'pending' : 'miss';
}

function dayRing(h, d, i, size) {
  const st = dayState(h, d), sw = size > 40 ? 4 : 3, r = size / 2 - sw / 2 - 1, C = 2 * Math.PI * r;
  const frac = st === 'full' ? 1 : st === 'part' ? count(h, d) / h.target : 0;
  const c = size / 2;
  return `<div class="dring s-${st}" style="--i:${i}; --C:${C}; width:${size}px; height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}"/>${frac
      ? `<circle class="prog" cx="${c}" cy="${c}" r="${r}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/>` : ''}</svg>
    <span>${d.getDate()}</span></div>`;
}

function weekView(h, ds) {
  const val = d => {
    const st = dayState(h, d), c = count(h, d), multi = h.target > 1;
    return {
      full: multi ? `${c}/${h.target}` : 'готово', part: `${c}/${h.target}`, skip: 'пропуск', off: 'не в плане',
      miss: multi ? `0/${h.target}` : 'нет', pending: multi ? `0/${h.target}` : 'сегодня',
    }[st] || '';
  };
  return `<div class="wk">${ds.map((d, i) => `
    <div class="wk-day${isToday(d) ? ' today' : ''}" data-tip="${esc(dayTip(h, d))}">
      <div class="wk-wd">${WEEKDAYS[weekday(d)]}</div>
      ${dayRing(h, d, i, 46)}
      <div class="wk-val s-${dayState(h, d)}">${val(d)}</div>
    </div>`).join('')}</div>${legend()}`;
}

function monthView(h, ds) {
  const pad = weekday(ds[0]);
  return `<div class="cal">
    ${WEEKDAYS.map(w => `<div class="cal-wd">${w}</div>`).join('')}
    ${'<div></div>'.repeat(pad)}
    ${ds.map((d, i) => `<div class="cal-day${isToday(d) ? ' today' : ''}" data-tip="${esc(dayTip(h, d))}">${dayRing(h, d, i, 38)}</div>`).join('')}
  </div>${legend()}`;
}

const legend = () => `<div class="cal-legend">
  <span><i class="lg full"></i>выполнено</span><span><i class="lg part"></i>частично</span>
  <span><i class="lg miss"></i>не выполнено</span><span><i class="lg skip"></i>пропуск</span><span><i class="lg off"></i>не в плане</span>
</div>`;

const svgEl = (w, hgt, inner) => `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" role="img">${inner}</svg>`;

function colPath(x, y, w, hgt) {
  const r = Math.min(4, w / 2, hgt);
  return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
}

function barChart(box, items, { yMax, ticks, fmt }) {
  const W = box.clientWidth || 540, H = 200, L = 34, R = 4, T = 10, B = items[0].sub ? 40 : 24;
  const iw = W - L - R, ih = H - T - B, band = iw / items.length;
  const bw = Math.max(2, Math.min(24, band - Math.max(2, band * .3)));
  const y = v => T + ih - ih * Math.min(v / yMax, 1);
  let s = '';
  for (const t of ticks) {
    s += `<line class="${t ? 'gridl' : 'base'}" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/>`;
    s += `<text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  }
  items.forEach((it, i) => {
    const cx = L + band * i + band / 2;
    s += `<rect class="hit" x="${L + band * i}" y="${T}" width="${band}" height="${ih}" data-tip="${esc(it.tip)}"/>`;
    if (it.active && it.value > 0) {
      const top = y(it.value);
      s += `<path class="bar" style="--i:${i}" d="${colPath(cx - bw / 2, top, bw, T + ih - top)}" pointer-events="none"/>`;
    }
    const lbl = items.length === 12 && band < 30 ? it.label.slice(0, 1) : it.label;
    if (lbl) s += `<text x="${cx}" y="${T + ih + 17}" text-anchor="middle">${lbl}</text>`;
    if (it.sub) s += `<text x="${cx}" y="${T + ih + 33}" text-anchor="middle">${it.sub}</text>`;
  });
  box.innerHTML = svgEl(W, H, s) + '<div class="tip"></div>';
}

function heatmap(box, h, ds) {
  const LW = 24, L = 0, T = 18, W = (box.clientWidth || 540) - LW;
  const offset = weekday(ds[0]), cols = Math.ceil((ds.length + offset) / 7);
  const cs = Math.max(11, Math.min(14, Math.floor(W / cols))), sz = cs - 2;
  const H = T + cs * 7, SW = L + cols * cs;
  const tk = todayKey();
  let s = '', lastX = 0;
  const labels = `<div class="hlabels" style="width:${LW}px;padding-top:${T}px">${WEEKDAYS.map((w, r) => `<span style="height:${cs}px">${r % 2 ? '' : w}</span>`).join('')}</div>`;
  ds.forEach((d, i) => {
    const k = key(d);
    if (k > tk) return;
    const col = Math.floor((i + offset) / 7), row = weekday(d);
    if (d.getDate() === 1 && cs * 4 > 24) s += `<text x="${L + col * cs}" y="${T - 6}">${MONTHS_SHORT[d.getMonth()]}</text>`;
    const f = count(h, d) / h.target;
    const lv = !inLife(h, k) ? 'lvx' : f >= 1 ? 'lv3' : f >= .5 ? 'lv2' : f > 0 ? 'lv1' : 'lv0';
    s += `<rect class="cell ${lv}" style="--i:${col}" x="${L + col * cs}" y="${T + row * cs}" width="${sz}" height="${sz}" rx="2" data-tip="${esc(dayTip(h, d))}"/>`;
    lastX = L + col * cs + cs;
  });
  box.innerHTML = `<div class="heatwrap">${labels}<div class="hscroll">${svgEl(SW, H, s)}</div></div><div class="tip"></div>`;
  const sc = box.querySelector('.hscroll');
  sc.scrollLeft = Math.max(0, lastX + 8 - sc.clientWidth);
}

for (const box of [$('hChart'), $('hHeat')]) {
  let on = null;
  box.addEventListener('pointermove', e => {
    const t = e.target.closest('[data-tip]'), tip = box.querySelector('.tip');
    if (t === on) return;
    on?.classList.remove('on');
    on = t;
    if (!t) return tip.classList.remove('show');
    t.classList.add('on');
    const r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
    tip.textContent = t.dataset.tip;
    const half = tip.offsetWidth / 2;
    tip.style.left = Math.max(half, Math.min(b.width - half, r.left - b.left + r.width / 2)) + 'px';
    tip.style.top = (t.classList.contains('hit') ? 10 : r.top - b.top) + 'px';
    tip.classList.add('show');
  });
  box.addEventListener('pointerleave', () => {
    on?.classList.remove('on'); on = null;
    box.querySelector('.tip')?.classList.remove('show');
  });
}

let resizeTimer, lastWidth = innerWidth;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    render();
    if (hist) renderHistory();
  }, 150);
});

$('heroProg').setAttribute('stroke-dasharray', HERO_C);
$('heroProg').style.strokeDashoffset = HERO_C;
$('days').innerHTML = WEEKDAYS.map(wd => `
  <button class="day">
    <span class="wd">${wd}</span>
    <span class="dr"><svg viewBox="0 0 36 36"><circle class="track" cx="18" cy="18" r="15.5"/><circle class="prog" cx="18" cy="18" r="15.5" stroke-dasharray="${DAY_C}" stroke-dashoffset="${DAY_C}"/></svg><span class="dn"></span></span>
  </button>`).join('');

function goTo(d) {
  const dir = key(d) > key(viewDate) ? 1 : -1;
  viewDate = d;
  render();
  if (reducedMotion) return;
  const opts = { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  $('title').animate([{ opacity: 0, transform: `translateX(${8 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
  $('sections').animate([{ opacity: .35, transform: `translateX(${10 * dir}px)` }, { opacity: 1, transform: 'none' }], opts);
}
const firstHabitDay = () => state.habits.filter(h => !h.archived).map(h => h.created).sort()[0];
$('prev').onclick = () => {
  const d = addDays(viewDate, -7), first = firstHabitDay();
  goTo(first && key(d) < first ? parseKey(first) : d);
};
$('todayBtn').onclick = () => goTo(new Date());
addEventListener('keydown', e => {
  if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && !e.ctrlKey && !e.metaKey && !e.altKey
      && !e.target.closest?.('input, textarea') && !shownOverlays().length && !isToday(viewDate)) goTo(new Date());
});
$('next').onclick = () => {
  const d = addDays(viewDate, 7);
  goTo(key(d) > todayKey() ? new Date() : d);
};

const getPref = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

function applyView(v) {
  if (v === 'list') v = '7d'; else if (v === 'heat') v = '90d';
  if (!VIEWS[v]) v = '7d';
  document.body.dataset.view = v;
  $('viewBtn').innerHTML = `${IC.cal}<span>${VIEWS[v].short}</span>`;
  $('viewBtn').title = `На карточках: ${VIEWS[v].label.toLowerCase()}`;
}
function renderViewPage() {
  const cur = document.body.dataset.view;
  $('viewSeg').innerHTML = Object.values(VIEWS).map(v =>
    `<button type="button" role="radio" aria-checked="${v.id === cur}" data-v="${v.id}">${v.short}</button>`).join('');
  $('viewHint').textContent = `Под каждой привычкой — отметки ${VIEWS[cur].label.toLowerCase()}.`;
  $('groupList').innerHTML = Object.entries(GROUPS).map(([id, g]) =>
    `<button type="button" class="set-row" role="radio" aria-checked="${id === groupMode}" data-g="${id}">
      <span class="set-txt"><b>${g.label}</b><small>${g.hint}</small></span><span class="check"></span>
    </button>`).join('');
  $('editCats').hidden = groupMode !== 'custom';
}
$('viewBtn').onclick = () => { renderViewPage(); openOverlay($('viewOv')); };
$('viewSeg').onclick = e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  setPref(VIEW_STORE, b.dataset.v); applyView(b.dataset.v); render(); renderViewPage();
};
$('groupList').onclick = e => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  groupMode = b.dataset.g; setPref(GROUP_STORE, groupMode); render(); renderViewPage();
  if (groupMode === 'custom' && !state.categories.length) openCats();
};
$('editCats').onclick = openCats;
$('reorderBtn').onclick = () => { closeOverlay($('viewOv')); setReorder(true); };

function previewIcon(style, icon, c) {
  const def = ICONS[icon];
  const inner = style === 'emoji' ? def.e
    : style === 'art' ? `<svg class="ha" viewBox="0 0 24 24" aria-hidden="true">${ICON_ART[icon]}</svg>`
    : `<svg class="hi" viewBox="0 0 24 24" aria-hidden="true">${def.s}</svg>`;
  return `<span class="hicon" data-st="${style}" style="--c:${c}">${inner}</span>`;
}
function renderSettings() {
  const cur = document.body.dataset.icons;
  const sample = [['run', '#f97316'], ['book', '#3b82f6'], ['water', '#06b6d4'], ['leaf', '#22c55e']].filter(([k]) => ICONS[k]);
  $('iconStyles').innerHTML = Object.entries(ICON_STYLES).map(([id, label]) =>
    `<button type="button" class="icon-style" role="radio" aria-checked="${id === cur}" data-s="${id}">
      <span class="row">${sample.map(([k, c]) => previewIcon(id, k, c)).join('')}</span><b>${label}</b>
    </button>`).join('');
  renderCatsInfo();
  renderAccount();
  renderAbout();
}
const APP_SRC = document.querySelector('script[src*="app.js"]')?.src || '';
const APP_VERSION = (APP_SRC.match(/\?v(\d+)/) || [])[1] || '';
let aboutDone = false;
async function renderAbout() {
  $('appVersion').textContent = APP_VERSION ? `Версия ${APP_VERSION}` : 'Версия неизвестна';
  if (aboutDone || !APP_SRC) return;
  try {
    const lm = (await fetch(APP_SRC)).headers.get('last-modified');
    const d = lm && new Date(lm);
    if (!d || isNaN(d)) return;
    aboutDone = true;
    $('appUpdated').textContent = `Обновлено ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '')} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    $('appUpdated').hidden = false;
  } catch {}
}
$('setBtn').onclick = () => { renderSettings(); openOverlay($('setOv')); };
$('setCats').onclick = openCats;
$('iconStyles').onclick = e => {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  setPref(ICON_STORE, b.dataset.s); applyIcons(b.dataset.s); renderSettings();
};

const THEMES = { auto: ['Системная', 'auto'], light: ['Светлая', 'sun'], dark: ['Тёмная', 'moon'] };
function applyTheme(t) {
  if (!THEMES[t]) t = 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => {
    m.content = t === 'dark' ? '#0e1015' : t === 'light' ? '#f4f5f9' : m.media.includes('dark') ? '#0e1015' : '#f4f5f9';
  });
  $('themeSeg').innerHTML = Object.entries(THEMES).map(([id, [label, ic]]) =>
    `<button type="button" role="radio" aria-checked="${id === t}" data-t="${id}">${IC[ic]}<span>${label}</span></button>`).join('');
}
$('themeSeg').onclick = e => {
  const b = e.target.closest('[data-t]');
  if (!b) return;
  setPref(THEME_STORE, b.dataset.t); applyTheme(b.dataset.t);
};

$('exportBtn').onclick = async () => {
  const name = `habits-${todayKey()}.json`;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (matchMedia('(display-mode: standalone)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Трекер привычек' }); return; }
    catch (err) { if (err.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { return toast('Не удалось прочитать файл'); }
  if (!data || !Array.isArray(data.habits) || !data.log || typeof data.log !== 'object') return toast('Это не файл трекера привычек');
  const ok = await askConfirm('Заменить данные?', `Текущие привычки будут заменены данными из файла (${data.habits.length} шт.).`, 'Заменить');
  if (!ok) return;
  state = normalize(data);
  cards.forEach(el => el.remove()); cards.clear();
  wasAllDone = null;
  save(); render();
  toast('Данные импортированы');
};

applyTheme(getPref(THEME_STORE, 'auto'));
applyView(getPref(VIEW_STORE, 'list'));
document.body.dataset.icons = ICON_STYLES[getPref(ICON_STORE, 'color')] ? getPref(ICON_STORE, 'color') : 'color';
groupMode = GROUPS[getPref(GROUP_STORE, 'time')] ? getPref(GROUP_STORE, 'time') : 'time';
render();

if (!TEST_MODE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  addEventListener('load', async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'activated' && hadController) toast('Доступна новая версия приложения', () => location.reload(), 'Обновить');
        });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch {}
  });
}

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
const UA = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMacSafari = !isIOS && /Macintosh/.test(UA) && /Safari\//.test(UA) && !/Chrome|Chromium|Edg|Firefox/.test(UA);
const isAndroid = /Android/.test(UA);
let installPrompt = null;

addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; updateInstallBtn(); });
addEventListener('appinstalled', () => { installPrompt = null; updateInstallBtn(); toast('Приложение установлено'); });
function updateInstallBtn() {
  $('installBtn').hidden = isStandalone() || !(installPrompt || isIOS || isMacSafari || isAndroid);
}
$('installBtn').onclick = async () => {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice.catch(() => ({}));
    if (outcome === 'accepted') installPrompt = null;
    updateInstallBtn();
    return;
  }
  const share = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 15V3.5M8 7.5l4-4 4 4M7 10.5H5.5v10h13v-10H17"/></svg>';
  const plus = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  const steps = isIOS ? [
    /CriOS|FxiOS|EdgiOS/.test(UA)
      ? `Нажмите <span class="k">${share} Поделиться</span> в адресной строке`
      : `Нажмите <span class="k">${share} Поделиться</span> внизу экрана Safari`,
    `Выберите <span class="k">${plus} На экран «Домой»</span> (если не видно — пролистайте список вниз)`,
    'Нажмите <span class="k">Добавить</span> — иконка «Привычки» появится на экране',
  ] : isMacSafari ? [
    'В меню Safari откройте <span class="k">Файл</span>',
    'Выберите <span class="k">Добавить в Dock…</span>',
    'Нажмите <span class="k">Добавить</span> — приложение появится в Dock и Launchpad',
  ] : [
    'Откройте меню браузера <span class="k">⋮</span>',
    'Выберите <span class="k">Установить приложение</span> или <span class="k">Добавить на главный экран</span>',
    'Подтвердите — иконка «Привычки» появится среди приложений',
  ];
  $('installSteps').innerHTML = steps.map(s => `<li><span>${s}</span></li>`).join('');
  openOverlay($('installOv'));
};
updateInstallBtn();
matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallBtn);

if (new URLSearchParams(location.search).get('action') === 'new') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => openForm(), 300);
}
navigator.storage?.persist?.().catch(() => {});
let lastDay = todayKey();
function checkDayChange() {
  if (document.visibilityState !== 'visible' || todayKey() === lastDay) return;
  if (key(viewDate) === lastDay) viewDate = new Date();
  lastDay = todayKey();
  wasAllDone = null;
  render();
  if (hist) renderHistory();
}
document.addEventListener('visibilitychange', checkDayChange);
setInterval(checkDayChange, 60 * 1000);

addEventListener('storage', e => {
  if (e.key !== STORE) return;
  state = load();
  render();
  if (hist) { if (findHabit(hist.id)) renderHistory(); else { closeOverlay($('histOv')); hist = null; } }
});

const BASE_STORE = NS + '-sync-base';
const OWNER_STORE = NS + '-owner';

const emptyState = () => ({ habits: [], categories: [], log: {}, skip: {} });
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x);
const same = (a, b) => canon(a) === canon(b);
function loadBase() {
  try { const b = JSON.parse(localStorage.getItem(BASE_STORE)); if (b && b.uid === cloud.session?.user.id) return b; } catch {}
  return { uid: cloud.session?.user.id, version: null, data: null };
}
function saveBase(version, data) {
  try { localStorage.setItem(BASE_STORE, JSON.stringify({ uid: cloud.session.user.id, version, data })); } catch {}
}

function mergeStates(base, local, remote) {
  base = base || emptyState();
  const mergeList = (B, L, R) => {
    const bm = new Map(B.map(x => [x.id, x])), lm = new Map(L.map(x => [x.id, x])), rm = new Map(R.map(x => [x.id, x]));
    const pick = id => (same(lm.get(id), bm.get(id)) ? rm.get(id) : lm.get(id));
    const localReordered = !same(L.map(x => x.id).filter(id => bm.has(id)), B.map(x => x.id).filter(id => lm.has(id)));
    const lead = localReordered ? L : R, rest = localReordered ? R : L;
    const ids = [...new Set([...lead.map(x => x.id), ...rest.map(x => x.id)])];
    return ids.map(pick).filter(Boolean);
  };
  const mergeDays = (B, L, R) => {
    const out = {};
    for (const day of new Set([...Object.keys(B), ...Object.keys(L), ...Object.keys(R)])) {
      const b = B[day] || {}, l = L[day] || {}, r = R[day] || {};
      for (const id of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const v = l[id] !== b[id] ? l[id] : r[id];
        if (v) (out[day] ??= {})[id] = v;
      }
    }
    return out;
  };
  return {
    habits: mergeList(base.habits || [], local.habits || [], remote.habits || []),
    categories: mergeList(base.categories || [], local.categories || [], remote.categories || []),
    log: mergeDays(base.log || {}, local.log || {}, remote.log || {}),
    skip: mergeDays(base.skip || {}, local.skip || {}, remote.skip || {}),
    profile: same(local.profile, base.profile) ? remote.profile : local.profile,
  };
}

function applyState(next) {
  cloud.applying = true;
  state = normalize(next);
  save();
  cloud.applying = false;
  render();
  if (hist) { if (findHabit(hist.id)) renderHistory(); else { closeOverlay($('histOv')); hist = null; } }
}

function setSync(status, error = '') {
  cloud.status = status; cloud.error = error;
  if (status === 'ok') cloud.lastSync = new Date();
  renderAccount();
}

function cloudQueue() {
  if (!cloud.session || cloud.applying) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(cloudPush, 700);
  if (cloud.status !== 'syncing') setSync('syncing');
}

async function cloudPull() {
  const uid = cloud.session.user.id;
  const { data: row, error } = await cloud.sb.from('habit_data').select('data, version').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  const base = loadBase();
  if (!row) {
    if (base.version != null) saveBase(null, null);
    return true;
  }
  if (row.version === base.version) return !same(state, base.data);
  const remote = normalize(row.data);
  const merged = normalize(mergeStates(base.data, state, remote));
  saveBase(row.version, remote);
  if (!same(merged, state)) applyState(merged);
  return !same(merged, remote);
}

async function cloudPush() {
  if (!cloud.session) return;
  if (cloud.pushing) { cloud.again = true; return; }
  cloud.pushing = true;
  setSync('syncing');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const base = loadBase(), uid = cloud.session.user.id;
      if (base.version != null && same(state, base.data)) break;
      const payload = JSON.parse(JSON.stringify(state));
      if (base.version == null) {
        const { error } = await cloud.sb.from('habit_data').insert({ user_id: uid, data: payload, version: 1 });
        if (!error) { saveBase(1, payload); break; }
        if (error.code !== '23505') throw error;
      } else {
        const { data, error } = await cloud.sb.from('habit_data')
          .update({ data: payload, version: base.version + 1, updated_at: new Date().toISOString() })
          .eq('user_id', uid).eq('version', base.version).select('version');
        if (error) throw error;
        if (data?.length) { saveBase(base.version + 1, payload); break; }
      }
      if (!(await cloudPull())) break;
    }
    setSync('ok');
  } catch (e) {
    setSync(navigator.onLine ? 'error' : 'offline', e?.message || String(e));
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(cloudPush, navigator.onLine ? 15000 : 60000);
  } finally {
    cloud.pushing = false;
    if (cloud.again) { cloud.again = false; cloudPush(); }
  }
}

async function cloudCheck() {
  if (!cloud.session || cloud.pushing || cloud.status === 'syncing') return;
  try {
    const { data: row, error } = await cloud.sb.from('habit_data').select('version').eq('user_id', cloud.session.user.id).maybeSingle();
    if (error) throw error;
    const base = loadBase();
    if (row?.version === base.version && same(state, base.data)) return;
  } catch {}
  cloudSync();
}

async function cloudSync() {
  if (!cloud.session || cloud.pushing) return;
  try {
    setSync('syncing');
    if (await cloudPull()) await cloudPush(); else setSync('ok');
  } catch (e) { setSync(navigator.onLine ? 'error' : 'offline', e?.message || String(e)); }
}

async function startSync() {
  const uid = cloud.session.user.id;
  let owner = null; try { owner = localStorage.getItem(OWNER_STORE); } catch {}
  if (owner && owner !== uid) {
    try { localStorage.removeItem(BASE_STORE); } catch {}
    applyState(emptyState());
  }
  try { localStorage.setItem(OWNER_STORE, uid); } catch {}
  await cloudSync();
  pushRefresh();
  cloud.channel?.unsubscribe();
  cloud.channel = cloud.sb.channel('habit_data:' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_data', filter: `user_id=eq.${uid}` }, p => {
      if (p.new?.version !== loadBase().version) cloudSync();
    })
    .subscribe();
}
function stopSync() {
  cloud.channel?.unsubscribe(); cloud.channel = null;
  clearTimeout(cloud.timer);
  setSync('off');
}

async function initCloud(client) {
  if (!cloud.enabled && !client) { renderAccount(); return; }
  const fromLink = /access_token|refresh_token/.test(location.hash);
  const hashParams = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const linkError = hashParams.get('error_code') || hashParams.get('error');
  if (linkError) history.replaceState(null, '', location.pathname);
  try {
    if (!client) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.min.js';
        s.onload = res; s.onerror = () => rej(new Error('Не удалось загрузить библиотеку Supabase'));
        document.head.append(s);
      });
      client = window.supabase.createClient(cloudCfg.supabaseUrl, cloudCfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
      });
    }
    cloud.sb = client;
    cloud.sb.auth.onAuthStateChange((event, s) => {
      const was = cloud.session?.user.id;
      cloud.session = s;
      if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname + location.search);
      if (s && s.user.id !== was) startSync();
      if (!s && was) stopSync();
      renderAccount();
    });
    const { data } = await cloud.sb.auth.getSession();
    if (data.session && !cloud.session) { cloud.session = data.session; startSync(); }
    if (fromLink && cloud.session && isIOS && !isStandalone()) { authStep = 'handoff'; openOverlay($('acctOv')); }
    else if (fromLink && cloud.session) toast(`Вы вошли как ${cloud.session.user.email}. Синхронизация включена`, null, '');
    else if (linkError && !cloud.session) {
      $('acctLinkError').textContent = /expired|invalid|denied/i.test(linkError + hashParams.get('error_description'))
        ? 'Ссылка из письма устарела или уже использована. Она срабатывает один раз и только из последнего письма — запросите новое.'
        : 'Не удалось войти по ссылке: ' + (hashParams.get('error_description') || linkError);
      authStep = 'email';
      openOverlay($('acctOv'));
    }
  } catch (e) { setSync('error', e.message); }
  renderAccount();
  if (!cloud.session) pushRefresh();
}

addEventListener('storage', async e => {
  if (!cloud.sb || cloud.session || !e.key?.startsWith('sb-')) return;
  const { data } = await cloud.sb.auth.getSession();
  if (data.session && !cloud.session) { cloud.session = data.session; startSync(); renderAccount(); }
});

function sendErrorText(err) {
  const m = err?.message || String(err);
  if (/rate limit|too many|over_email_send_rate_limit/i.test(m + err?.code))
    return 'Лимит писем исчерпан: бесплатный почтовый сервер Supabase отправляет лишь несколько писем в час. Попробуйте через час — или откройте ссылку из последнего полученного письма.';
  if (/seconds/i.test(m)) return 'Слишком часто — подождите минуту и попробуйте снова';
  return 'Не удалось отправить письмо: ' + m;
}

addEventListener('online', () => cloud.session && cloudSync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.session) cloudCheck(); });
setInterval(() => { if (document.visibilityState === 'visible' && cloud.session) cloudCheck(); }, 15 * 60 * 1000);

let authStep = 'email', authEmail = '', resendAt = 0;
const SYNC_TEXT = { off: 'Синхронизация выключена', syncing: 'Синхронизация…', ok: 'Всё синхронизировано', offline: 'Нет сети — изменения сохранены на устройстве и отправятся позже', error: 'Ошибка синхронизации' };

function renderAccount() {
  const btn = $('acctBtn');
  btn.dataset.sync = cloud.session ? cloud.status : 'none';
  btn.title = !cloud.enabled && !cloud.sb ? 'Синхронизация не настроена' : 'Войти и синхронизировать';
  btn.hidden = !!cloud.session;
  $('setBtn').dataset.sync = cloud.session ? cloud.status : 'none';
  $('setCloudIn').hidden = !cloud.session;
  $('setLogin').hidden = !!cloud.session || (!cloud.enabled && !cloud.sb);
  renderPush();
  if (cloud.session) {
    $('setEmail').textContent = cloud.session.user.email;
    const when = cloud.lastSync ? ` · ${cloud.lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : '';
    $('setStatus').textContent = SYNC_TEXT[cloud.status] + (cloud.status === 'ok' ? when : '');
    $('setStatus').dataset.sync = cloud.status;
    $('setError').textContent = cloud.status === 'error' ? cloud.error : '';
    if ($('acctOv')._shown && authStep !== 'handoff') { authStep = 'email'; closeOverlay($('acctOv')); toast(`Вы вошли как ${cloud.session.user.email}`); }
  }
  if (!$('acctOv')._shown) return;
  const view = !cloud.enabled && !cloud.sb ? 'setup' : cloud.session ? 'handoff' : authStep;
  for (const v of ['setup', 'email', 'code', 'handoff', 'copied']) $('acct-' + v).hidden = v !== view;
  if (view === 'code') {
    for (const el of document.querySelectorAll('.acctSentTo')) el.textContent = authEmail;
    const iosApp = isIOS && isStandalone();
    $('acctCodeHow').innerHTML = iosApp
      ? 'Нажмите в нём ссылку — откроется Safari. Там нажмите <b>«Скопировать код»</b>, вернитесь сюда и вставьте его.'
      : 'Нажмите ссылку в нём — вход произойдёт сам. Если в письме есть код, можно ввести его здесь.';
    $('acctPaste').hidden = !(iosApp && navigator.clipboard?.readText);
  }
  const wait = Math.ceil((resendAt - Date.now()) / 1000);
  $('acctResend').disabled = wait > 0;
  $('acctResend').textContent = wait > 0 ? `Отправить снова через ${wait} с` : 'Отправить письмо снова';
}
setInterval(() => { if ($('acctOv')._shown && authStep === 'code') renderAccount(); }, 1000);

async function sendLink(email) {
  const { error } = await cloud.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
  if (error) throw error;
  $('acctLinkError').textContent = '';
  authEmail = email; authStep = 'code'; resendAt = Date.now() + 60000;
  renderAccount();
  setTimeout(() => $('acctCode').focus(), 100);
}

$('acctBtn').onclick = () => { openOverlay($('acctOv')); renderAccount(); };
$('acctEmailForm').onsubmit = async e => {
  e.preventDefault();
  const email = $('acctEmailInput').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Проверьте адрес почты');
  $('acctSend').disabled = true;
  try { await sendLink(email); }
  catch (err) { toast(sendErrorText(err), null, ''); }
  finally { $('acctSend').disabled = false; }
};
$('acctCodeForm').onsubmit = async e => {
  e.preventDefault();
  await signInWithCode($('acctCode').value);
};
async function signInWithCode(raw) {
  const value = raw.trim().replace(/^["'«]+|["'»]+$/g, '');
  const digits = value.replace(/[\s-]/g, '');
  if (!value) return toast('Вставьте код входа');
  $('acctVerify').disabled = true;
  try {
    const { error } = /^\d{6,8}$/.test(digits)
      ? await cloud.sb.auth.verifyOtp({ email: authEmail, token: digits, type: 'email' })
      : await cloud.sb.auth.refreshSession({ refresh_token: value });
    if (error) throw error;
    $('acctCode').value = '';
  } catch (err) {
    const m = err?.message || '';
    toast(/already used|revoked|not found|invalid refresh/i.test(m)
      ? 'Этот код уже недействителен. Запросите новое письмо и скопируйте свежий код'
      : 'Код не подошёл: ' + (m || 'неизвестная ошибка'), null, '');
  }
  finally { $('acctVerify').disabled = false; }
}
$('acctPaste').onclick = async () => {
  try {
    const text = await navigator.clipboard.readText();
    $('acctCode').value = text.trim();
    if (text.trim()) await signInWithCode(text);
  } catch { toast('Не удалось вставить — нажмите на поле и выберите «Вставить»'); }
};
$('acctCopy').onclick = async () => {
  const token = cloud.session?.refresh_token;
  if (!token) return;
  try { await navigator.clipboard.writeText(token); }
  catch { return toast('Не удалось скопировать код'); }
  cloud.sb.auth.stopAutoRefresh();
  stopSync();
  try { for (const k of Object.keys(localStorage)) if (/^sb-.+-auth-token/.test(k)) localStorage.removeItem(k); } catch {}
  cloud.session = null;
  authStep = 'copied';
  renderAccount();
};
$('acctStay').onclick = () => { authStep = 'email'; closeOverlay($('acctOv')); };
$('acctResend').onclick = async () => {
  try { await sendLink(authEmail); toast('Письмо отправлено ещё раз. Открывайте ссылку только из этого, последнего письма'); } catch (err) { toast(sendErrorText(err), null, ''); }
};
$('acctBack').onclick = () => { authStep = 'email'; renderAccount(); };
$('setSyncNow').onclick = () => cloudSync();
$('setSignOut').onclick = async () => {
  const ok = await askConfirm('Выйти из аккаунта?', 'Синхронизация остановится. Привычки останутся на этом устройстве, а в облаке — в Вашем аккаунте.', 'Выйти');
  if (!ok) return;
  await pushDisable().catch(() => {});
  await cloud.sb.auth.signOut({ scope: 'local' });
  authStep = 'email';
  renderAccount();
};

const push = {
  supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  sub: null, busy: false,
};
const pushTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const b64uBytes = s => Uint8Array.from(atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
function pushState() {
  if (!cloudCfg.vapidPublicKey || !cloud.enabled) return 'off';
  if (isIOS && !isStandalone()) return 'ios';
  if (!push.supported) return 'unsupported';
  if (!cloud.session) return 'login';
  if (Notification.permission === 'denied') return 'denied';
  return push.sub ? 'on' : 'ready';
}
const PUSH_TEXT = {
  ios: ['Только в установленном приложении', 'На iPhone напоминания приходят, если трекер добавлен на экран «Домой» (iOS 16.4 и новее). Откройте его оттуда и включите здесь.'],
  unsupported: ['Недоступны', 'Этот браузер не поддерживает push-уведомления.'],
  login: ['Нужен вход в аккаунт', 'Напоминания отправляет сервер, поэтому сначала войдите — тогда он будет знать Ваши привычки.'],
  denied: ['Запрещены', 'Уведомления заблокированы для этого сайта. Разрешите их в настройках браузера или iPhone и вернитесь сюда.'],
  ready: ['Выключены', 'Включите, чтобы получать напоминания в заданное время.'],
  on: ['Включены на этом устройстве', ''],
};
function renderPush() {
  const st = pushState();
  $('pushGroup').hidden = st === 'off';
  if (st === 'off') return renderRemindHint();
  const [title, text] = PUSH_TEXT[st];
  $('pushTitle').textContent = title;
  $('pushText').textContent = st === 'on' ? `Часовой пояс: ${pushTz()}` : text;
  $('pushIc').dataset.on = st === 'on';
  $('pushOn').hidden = !(st === 'ready' || st === 'login');
  $('pushOnLabel').textContent = st === 'login' ? 'Войти в аккаунт' : 'Включить напоминания';
  $('pushOn').disabled = push.busy;
  $('pushTest').hidden = $('pushOff').hidden = st !== 'on';
  renderRemindHint();
}
function renderRemindHint() {
  const el = $('remindHint');
  const st = pushState();
  if (!form.rem?.on || st === 'on' || st === 'off') { el.textContent = ''; return; }
  el.innerHTML = st === 'ios'
    ? 'Напоминания придут только в приложении, установленном на экран «Домой».'
    : 'Чтобы напоминание пришло, включите уведомления в <button type="button" data-open-push>Настройках</button>.';
}
$('remindHint').onclick = e => {
  if (!e.target.closest('[data-open-push]')) return;
  closeOverlay($('formOv')); renderSettings(); openOverlay($('setOv'));
};
async function pushSave(sub) {
  const j = sub.toJSON();
  const { error } = await cloud.sb.from('push_subscriptions').upsert({
    endpoint: j.endpoint, user_id: cloud.session.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth,
    tz: pushTz(), user_agent: navigator.userAgent.slice(0, 200), last_seen: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) throw error;
}
async function pushRefresh() {
  if (!push.supported || !cloudCfg.vapidPublicKey) return renderPush();
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    push.sub = reg ? await reg.pushManager.getSubscription() : null;
    if (push.sub && Notification.permission !== 'granted') push.sub = null;
    if (push.sub && cloud.session) await pushSave(push.sub);
  } catch {}
  renderPush();
}
async function pushEnable() {
  if (push.busy) return;
  push.busy = true; renderPush();
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast(perm === 'denied' ? 'Уведомления запрещены — разрешите их в настройках браузера' : 'Разрешение не выдано', null, '');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    const key = b64uBytes(cloudCfg.vapidPublicKey);
    const cur = sub?.options?.applicationServerKey && new Uint8Array(sub.options.applicationServerKey);
    if (sub && cur && (cur.length !== key.length || cur.some((b, i) => b !== key[i]))) { await sub.unsubscribe(); sub = null; }
    sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await pushSave(sub);
    push.sub = sub;
    toast('Напоминания включены', null, '');
  } catch (err) {
    toast('Не удалось включить напоминания: ' + (err?.message || err), null, '');
  } finally {
    push.busy = false; renderPush();
  }
}
async function pushDisable() {
  const sub = push.sub;
  push.sub = null;
  if (sub) {
    if (cloud.session) await cloud.sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  renderPush();
}
$('pushOn').onclick = () => {
  if (pushState() === 'login') { closeOverlay($('setOv')); openOverlay($('acctOv')); renderAccount(); return; }
  pushEnable();
};
$('pushOff').onclick = () => pushDisable().then(() => toast('Напоминания на этом устройстве выключены', null, ''), err => toast('Не удалось выключить: ' + err.message, null, ''));
$('pushTest').onclick = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Трекер привычек', { body: 'Так будут выглядеть напоминания о привычках', icon: 'icons/icon-192.png', tag: 'test' });
  } catch (err) { toast('Не удалось показать уведомление: ' + err.message, null, ''); }
};
function markDoneFromPush(id) {
  const h = findHabit(id);
  if (!h || h.archived) return;
  if (!isToday(viewDate)) viewDate = new Date();
  changeCount(h, new Date(), h.target, true);
  render();
}
navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'done') markDoneFromPush(e.data.id); });
{
  const doneId = new URLSearchParams(location.search).get('done');
  if (doneId) { history.replaceState(null, '', location.pathname); setTimeout(() => markDoneFromPush(doneId), 300); }
}

initCloud();

const NAME_ASKED = NS + '-name-asked';
function userName() { return state.profile?.name || ''; }
function openName(first) {
  $('nameTitle').textContent = first ? 'Как Вас зовут?' : 'Ваше имя';
  $('nameSkip').textContent = first ? 'Пропустить' : 'Отмена';
  $('nameInput').value = userName();
  openOverlay($('nameOv'));
  setTimeout(() => $('nameInput').focus({ preventScroll: true }), 80);
}
$('nameForm').onsubmit = e => {
  e.preventDefault();
  const name = $('nameInput').value.trim().slice(0, 40);
  if (name === userName()) return closeOverlay($('nameOv'));
  if (name) state.profile = { name }; else delete state.profile;
  save(); render();
  closeOverlay($('nameOv'));
  if (name) toast(`Приятно познакомиться, ${name}!`);
};
$('nameSkip').onclick = () => closeOverlay($('nameOv'));
$('setName').onclick = () => openName(false);
$('setLogin').onclick = () => { openOverlay($('acctOv')); renderAccount(); };
if (!TEST_MODE && !getPref(NAME_ASKED, '') && !/access_token|refresh_token|error/.test(location.hash) && !new URLSearchParams(location.search).has('action')) {
  setTimeout(() => {
    if (userName() || shownOverlays().length || cloud.status === 'syncing') return;
    setPref(NAME_ASKED, '1');
    openName(true);
  }, 2500);
}
