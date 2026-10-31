import { $, ACCENT_STORE, DATA_STORE, esc, getPref, ICON_STORE, isAndroid, isIOS, isMacSafari, isStandalone, NS, PRIVACY_EMAIL, reducedMotion, setPref, THEME_STORE, todayKey, UA, withYear } from './core.js?v=2.1a';
import { IC, ICON_ART, ICON_STYLES, ICONS } from './icons.js?v=2.1a';
import { normalize, save, setState, state } from './storage.js?v=2.1a';
import { askConfirm, closeOverlay, openOverlay, toast } from './ui.js?v=2.1a';
import { cards, render, setWasAllDone } from './render.js?v=2.1a';
import { drawIconPickers, openCats, renderCatsInfo, syncForm } from './form.js?v=2.1a';
import { hist, renderHistory } from './history.js?v=2.1a';
import { cloud, deleteAccount, emailMatches, renderAccount } from './sync.js?v=2.1a';

export function applyIcons(style) {
  document.body.dataset.icons = style;
  render();
  if (hist) renderHistory();
  if ($('formOv')._shown) { drawIconPickers(); syncForm(); }
}
export function previewIcon(style, icon, c) {
  const def = ICONS[icon];
  const inner = style === 'emoji' ? def.e
    : style === 'art' ? `<svg class="ha" viewBox="0 0 24 24" aria-hidden="true">${ICON_ART[icon]}</svg>`
    : `<svg class="hi" viewBox="0 0 24 24" aria-hidden="true">${def.s}</svg>`;
  return `<span class="hicon" data-st="${style}" style="--c:${c}">${inner}</span>`;
}
export function renderSettings() {
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
export const APP_SRC = document.querySelector('script[src*="app.js"]')?.src || '';
export const APP_VERSION = (APP_SRC.match(/[?&]v=([^&#]+)/) || [])[1] || '';
export let aboutDone = false;
export async function renderAbout() {
  $('appVersion').textContent = APP_VERSION ? `Версия ${APP_VERSION}` : 'Версия неизвестна';
  if (aboutDone || !APP_SRC) return;
  try {
    const lm = (await fetch(APP_SRC)).headers.get('last-modified');
    const d = lm && new Date(lm);
    if (!d || isNaN(d)) return;
    aboutDone = true;
    $('appUpdated').textContent = `Обновлено ${withYear(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }))} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    $('appUpdated').hidden = false;
  } catch {}
}
$('setBtn').onclick = () => { renderSettings(); openOverlay($('setOv')); showChosenSwatch(); };
$('setCats').onclick = openCats;
$('iconStyles').onclick = e => {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  setPref(ICON_STORE, b.dataset.s); applyIcons(b.dataset.s); renderSettings();
};

export const THEMES = { auto: ['Системная', 'auto'], light: ['Светлая', 'sun'], dark: ['Тёмная', 'moon'] };
export function applyTheme(t) {
  if (!THEMES[t]) t = 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
  syncThemeColor();
  $('themeSeg').innerHTML = Object.entries(THEMES).map(([id, [label, ic]]) =>
    `<button type="button" role="radio" aria-checked="${id === t}" data-t="${id}">${IC[ic]}<span>${label}</span></button>`).join('');
}
$('themeSeg').onclick = e => {
  const b = e.target.closest('[data-t]');
  if (!b) return;
  setPref(THEME_STORE, b.dataset.t); applyTheme(b.dataset.t);
};

export const PALETTES = {
  graphite: ['Графит', '#1f2328', '#e8e9ec', '#ffffff', '#111111'],
  red: ['Красный', '#dc2626', '#f87171', '#ffffff', '#2a0707'],
  cherry: ['Вишнёвый', '#be123c', '#fb7185', '#ffffff', '#2b0612'],
  coral: ['Коралловый', '#c8461f', '#ff8a65', '#ffffff', '#3a1206'],
  amber: ['Янтарный', '#b45309', '#fbbf24', '#ffffff', '#2a1a02'],
  coffee: ['Кофейный', '#8b5e3c', '#d4a373', '#ffffff', '#2a1a0e'],
  sage: ['Шалфей', '#5f7a3a', '#a9c47f', '#ffffff', '#1a2410'],
  emerald: ['Изумрудный', '#047857', '#34d399', '#ffffff', '#032b1e'],
  teal: ['Бирюзовый', '#0f766e', '#2dd4bf', '#ffffff', '#04342c'],
  sea: ['Морской', '#0e7490', '#22d3ee', '#ffffff', '#042a33'],
  cobalt: ['Кобальт', '#2563eb', '#60a5fa', '#ffffff', '#071a3a'],
  fuchsia: ['Фуксия', '#be185d', '#f472b6', '#ffffff', '#3a0a1e'],
};
export const RED_UI = ['red', 'cherry', 'coral'];
export const colorPrefs = () => {
  const a = getPref(ACCENT_STORE, 'cobalt'), d = getPref(DATA_STORE, 'red');
  return { accent: PALETTES[a] ? a : 'cobalt', data: PALETTES[d] ? d : 'red' };
};
export function applyColors({ accent, data } = colorPrefs()) {
  const st = document.documentElement.style, [, al, ad, ail, aid] = PALETTES[accent], [, dl, dd, dil, did] = PALETTES[data];
  for (const [k, v] of Object.entries({ 'accent-l': al, 'accent-d': ad, 'accent-ink-l': ail, 'accent-ink-d': aid, 'data-l': dl, 'data-d': dd, 'data-ink-l': dil, 'data-ink-d': did })) st.setProperty('--' + k, v);
  document.documentElement.toggleAttribute('data-ui-red', RED_UI.includes(accent));
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.data = data;
  syncThemeColor(accent);
  renderColors();
}
const hexMix = (a, b, p) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0')).join('');
export function syncThemeColor(accent = colorPrefs().accent) {
  const t = document.documentElement.dataset.theme, [, light, ad] = PALETTES[accent], dark = hexMix(ad, '#0e1015', .42);
  document.querySelectorAll('meta[name=theme-color]').forEach(m => {
    m.content = t === 'dark' ? dark : t === 'light' ? light : m.media.includes('dark') ? dark : light;
  });
}
export const COLOR_KINDS = { accent: ['Интерфейс', ACCENT_STORE], data: ['Статистика', DATA_STORE] };
export let colorKind = 'accent';
const putHTML = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html; } };
export function renderColors() {
  const cur = colorPrefs();
  putHTML($('colorSeg'), Object.entries(COLOR_KINDS).map(([k, [label]]) => {
    const [name, l, d] = PALETTES[cur[k]];
    return `<button type="button" role="radio" aria-checked="${k === colorKind}" data-k="${k}" style="--sw-l:${l};--sw-d:${d}"><i class="sw-dot"></i><span><b>${label}</b><small>${name}</small></span></button>`;
  }).join(''));
  putHTML($('swRow'), Object.entries(PALETTES).map(([id, [name, l, d]]) =>
    `<button type="button" class="swatch" role="radio" aria-checked="${id === cur[colorKind]}" aria-label="${name}" title="${name}" data-c="${id}" style="--sw-l:${l};--sw-d:${d}"></button>`).join(''));
  $('swRow').setAttribute('aria-label', `Цвет: ${COLOR_KINDS[colorKind][0].toLowerCase()}`);
}
export function showChosenSwatch(smooth) {
  const row = $('swRow'), b = row.querySelector('[aria-checked=true]');
  if (!b || !row.clientWidth) return;
  const left = b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2;
  row.scrollTo({ left: Math.max(0, left), behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
}
$('colorSeg').onclick = e => {
  const b = e.target.closest('[data-k]');
  if (!b || b.dataset.k === colorKind) return;
  colorKind = b.dataset.k;
  renderColors();
  showChosenSwatch(true);
};
$('swRow').onclick = e => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  setPref(COLOR_KINDS[colorKind][1], b.dataset.c);
  applyColors();
  $('swRow').querySelector(`[data-c="${b.dataset.c}"]`)?.focus({ preventScroll: true });
};

export async function exportData() {
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
}
$('exportBtn').onclick = exportData;
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { return toast('Не удалось прочитать файл'); }
  if (!data || !Array.isArray(data.habits) || !data.log || typeof data.log !== 'object') return toast('Это не файл трекера привычек');
  const ok = await askConfirm('Заменить данные?', `Текущие привычки будут заменены данными из файла (привычек в нём: ${data.habits.length}).`, 'Заменить');
  if (!ok) return;
  setState(normalize(data));
  cards.forEach(el => el.remove()); cards.clear();
  setWasAllDone(null);
  save(); render();
  toast('Данные восстановлены из файла');
};

export let installPrompt = null;

addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; updateInstallBtn(); });
addEventListener('appinstalled', () => { installPrompt = null; updateInstallBtn(); toast('Приложение установлено'); });
export function updateInstallBtn() {
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
matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallBtn);

export const NAME_ASKED = NS + '-name-asked';
export function userName() { return state.profile?.name || ''; }
export function openName(first) {
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

$('setDelete').onclick = () => {
  if (!cloud.session) return;
  $('delAcctEmail').textContent = cloud.session.user.email;
  $('delEmail').value = '';
  $('delLocal').checked = false;
  $('delMail').hidden = !PRIVACY_EMAIL;
  $('delMail').innerHTML = PRIVACY_EMAIL ? `Не получается удалить? Напишите на <a href="mailto:${esc(PRIVACY_EMAIL)}">${esc(PRIVACY_EMAIL)}</a>, удалим в течение 30 дней.` : '';
  openOverlay($('delOv'));
};
$('delExport').onclick = exportData;
$('delForm').onsubmit = e => {
  e.preventDefault();
  if (!cloud.session) return;
  if (!emailMatches($('delEmail').value, cloud.session.user.email)) { toast('Почта не совпадает с почтой аккаунта'); $('delEmail').focus(); return; }
  deleteAccount($('delLocal').checked);
};
