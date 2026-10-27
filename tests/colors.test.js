window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const root = document.documentElement;
const css = v => getComputedStyle(root).getPropertyValue(v).trim();
const rgb = el => getComputedStyle(el).backgroundColor;
const probe = c => { const s = document.createElement('i'); s.style.background = c; document.body.append(s); const v = getComputedStyle(s).backgroundColor; s.remove(); return v; };
const ago = n => key(addDays(new Date(), -n));
const lum = hex => { const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

try { localStorage.removeItem(ACCENT_STORE); localStorage.removeItem(DATA_STORE); } catch {}
applyTheme('light'); applyColors(); await wait(50);
ok('defaults: cobalt interface, red data', colorPrefs().accent === 'cobalt' && colorPrefs().data === 'red' && probe('var(--accent)') === probe('#2563eb') && probe('var(--data)') === probe('#dc2626'), [css('--accent'), css('--data')]);
ok('default interface not red', !root.hasAttribute('data-ui-red'));
ok('twelve presets', Object.keys(PALETTES).length === 12);
const bad = Object.values(PALETTES).flatMap(([n, l, d, il, id]) => [[n, 'light', ratio(l, il)], [n, 'dark', ratio(d, id)]]).filter(x => x[2] < 4.5);
ok('text on accent at least 4.5:1 in both themes', bad.length === 0, bad);

renderSettings(); openOverlay($('setOv')); await wait(400);
ok('colors section next to theme', $('themeSeg').closest('.set-group').nextElementSibling.querySelector('h3').textContent === 'Цвета');
ok('two rows of swatches', $('accentRow').querySelectorAll('.swatch').length === 12 && $('dataRow').querySelectorAll('.swatch').length === 12);
ok('checked swatch matches prefs', $('accentRow').querySelector('[aria-checked=true]').dataset.c === 'cobalt' && $('dataRow').querySelector('[aria-checked=true]').dataset.c === 'red');
ok('live preview has button and 5 levels', !!document.querySelector('.color-prev .cp-btn') && document.querySelectorAll('.color-prev .heat-strip i').length === 5);
const strip = [...document.querySelectorAll('.color-prev .heat-strip i')].map(rgb);
ok('preview levels all different', new Set(strip).size === 5, strip);

$('dataRow').querySelector('[data-c=emerald]').click(); await wait(50);
ok('data color applies at once', probe('var(--data)') === probe('#047857') && rgb(document.querySelector('.heat-strip .lv4')) === probe('color-mix(in srgb, #047857 100%, var(--card))'));
$('accentRow').querySelector('[data-c=red]').click(); await wait(50);
ok('interface color applies at once', probe('var(--accent)') === probe('#dc2626') && rgb(document.querySelector('.color-prev .cp-btn')) === probe('#dc2626'));
ok('choice saved to storage', localStorage.getItem(ACCENT_STORE) === 'red' && localStorage.getItem(DATA_STORE) === 'emerald');
root.style.cssText = ''; root.removeAttribute('data-ui-red');
applyColors(); await wait(30);
ok('saved colors restored', probe('var(--accent)') === probe('#dc2626') && probe('var(--data)') === probe('#047857') && root.hasAttribute('data-ui-red'));
applyTheme('dark'); await wait(50);
ok('dark theme uses dark values', probe('var(--accent)') === probe('#f87171') && probe('var(--accent-ink)') === probe('#2a0707') && probe('var(--data)') === probe('#34d399'));
applyTheme('light');
closeOverlay($('setOv')); await wait(300);

ok('red interface: confirm button outlined with trash', (() => {
  askConfirm('Удалить навсегда?', 'x', 'Удалить');
  const b = $('cYes'), cs = getComputedStyle(b), r = cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.borderTopColor === probe('var(--danger)') && cs.color === probe('var(--danger)') && getComputedStyle(b.querySelector('.del-ic')).display !== 'none';
  closeConfirm(false); return r;
})(), getComputedStyle($('cYes')).backgroundColor);

state = normalize({ habits: [{ id: 'a', name: 'Старая', icon: 'book', color: '#4f46e5', created: ago(30), archived: ago(2) }], log: {} });
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(200);
const del = document.querySelector('.arch-item .del');
ok('red interface: archive delete outlined', getComputedStyle(del).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(del).borderTopColor === probe('var(--danger)') && getComputedStyle(del.querySelector('.del-ic')).display !== 'none');
del.click(); await wait(300);
ok('delete asks for confirmation', $('confirm')._shown && findHabit('a'));
closeConfirm(false); await wait(300);
ok('existing habit color untouched', findHabit('a').color === '#4f46e5');

state.categories = [{ id: 'k', name: 'Пустая' }];
openCats(); await wait(400);
document.querySelector('#catList [data-act=del]').click(); await wait(300);
ok('red interface: empty category delete confirmed', $('confirm')._shown && state.categories.length === 1);
closeConfirm(false); await wait(300);
closeOverlay(document.getElementById('catOv')); await wait(300);

localStorage.setItem(ACCENT_STORE, 'cobalt'); applyColors(); await wait(30);
ok('other interface: delete filled as before', !root.hasAttribute('data-ui-red') && getComputedStyle(document.querySelector('.arch-item .del .del-ic')).display === 'none');
askConfirm('Удалить навсегда?', 'x', 'Удалить');
ok('other interface: confirm filled', getComputedStyle($('cYes')).backgroundColor === probe('var(--danger)'));
closeConfirm(false); await wait(300);

localStorage.setItem(ACCENT_STORE, 'zzz'); localStorage.setItem(DATA_STORE, 'zzz');
ok('unknown saved value falls back to defaults', colorPrefs().accent === 'cobalt' && colorPrefs().data === 'red');
localStorage.removeItem(ACCENT_STORE); localStorage.removeItem(DATA_STORE); applyColors();

ok('habit palette has no indigo', !COLORS.includes('#4f46e5') && COLORS.includes('#2563eb') && TEMPLATES.find(t => t.name === 'Чтение').color === '#2563eb');
const srcs = ['styles.css', ...['core', 'icons', 'storage', 'ui', 'render', 'form', 'history', 'settings', 'sync', 'push', 'summary'].map(m => `js/${m}.js`)];
const hits = [];
for (const f of srcs) if (/#4f46e5|#8b85ff/i.test(await (await fetch(f + '?x=' + Date.now())).text())) hits.push(f);
ok('no indigo in styles.css and js/', hits.length === 0, hits);

state = normalize({ habits: [{ id: 'w', name: 'Вода', icon: 'water', color: '#0ea5e9', target: 4, created: ago(40) }],
  log: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [ago(i + 1), { w: i % 5 }])) });
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(200);
openHistory('w'); await wait(600);
$('hTabs').querySelector('[data-r=year]').click(); await wait(400);
const cells = [...$('hSheet').querySelectorAll('rect.cell')].filter(c => /lv\d/.test(c.getAttribute('class')));
const byLv = lv => cells.find(c => c.classList.contains(lv));
ok('history heatmap uses data color, not habit color', getComputedStyle(byLv('lv4')).fill === probe('color-mix(in srgb, var(--data) 100%, var(--card))'), byLv('lv4') && getComputedStyle(byLv('lv4')).fill);
const fills = ['lv0', 'lv1', 'lv2', 'lv3', 'lv4'].map(l => byLv(l) && getComputedStyle(byLv(l)).fill);
ok('history heatmap has 5 distinct levels', fills.every(Boolean) && new Set(fills).size === 5, fills);
const lg = [...$('hSheet').querySelectorAll('.legend i')].map(rgb);
ok('legend matches heatmap levels', lg.length === 5 && lg.every((c, i) => c === fills[i]), [lg, fills]);
ok('history header keeps habit color', getComputedStyle($('hSheet')).getPropertyValue('--c').trim() === '#0ea5e9');
closeOverlay($('histOv')); await wait(300);

ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
