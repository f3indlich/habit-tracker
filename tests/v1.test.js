window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));

const app = document.querySelector('script[src*="app.js"]');
const ver = (app.src.match(/[?&]v=([^&#]+)/) || [])[1];
ok('app loads as module', app.type === 'module');
ok('version format', ver === APP_VERSION && /^\d+\.\d{2}[a-z]?$/.test(ver), ver);
const mods = performance.getEntriesByType('resource').map(e => e.name).filter(n => /\/js\/\w+\.js/.test(n));
ok('all modules loaded with app version', mods.length === 10 && mods.every(n => n.endsWith('?v=' + ver)), mods);
const css = document.querySelector('link[href*="styles.css"]').getAttribute('href');
ok('styles use app version', css === 'styles.css?v=' + ver, css);
const swSrc = await (await fetch('sw.js?x=' + Date.now())).text();
ok('service worker uses app version', swSrc.includes(`const VERSION = '${ver}'`) && swSrc.includes("'core', 'icons', 'storage', 'ui', 'render', 'form', 'history', 'settings', 'sync', 'push'"));

const syncSrc = await (await fetch(`js/sync.js?v=${ver}`)).text();
const sri = (syncSrc.match(/s\.integrity = '(sha384-[^']+)'/) || [])[1];
const cdn = (syncSrc.match(/s\.src = '([^']+)'/) || [])[1];
ok('supabase script has integrity and crossorigin', !!sri && syncSrc.includes("s.crossOrigin = 'anonymous'") && /@\d+\.\d+\.\d+\//.test(cdn), { sri, cdn });
let sriOk = false;
try {
  const buf = await (await fetch(cdn, { cache: 'no-store' })).arrayBuffer();
  const dig = new Uint8Array(await crypto.subtle.digest('SHA-384', buf));
  sriOk = 'sha384-' + btoa(String.fromCharCode(...dig)) === sri;
} catch (e) { sriOk = String(e); }
ok('integrity matches CDN file', sriOk === true, sriOk);

ok('agoText', [3, 6, 7, 15, 29, 45, 90, 400].map(agoText).join('|') === '3 дня назад|6 дней назад|неделю назад|2 недели назад|4 недели назад|месяц назад|3 месяца назад|больше года назад', [3, 6, 7, 15, 29, 45, 90, 400].map(agoText));
state = normalize({ habits: [
  { id: 'y', name: 'Вода', icon: 'water', created: ago(10) },
  { id: 'f', name: 'Бег', icon: 'run', created: ago(10) },
  { id: 's', name: 'Испанский язык', icon: 'book', color: '#0ea5e9', created: ago(40) },
  { id: 'n', name: 'Йога', icon: 'meditate', created: ago(30) },
  { id: 'r', name: 'Дневник', icon: 'pen', created: ago(5) },
], log: { [ago(2)]: { y: 1 }, [ago(5)]: { f: 1 }, [ago(25)]: { s: 1 } } });
viewDate = new Date(); document.body.dataset.view = '7d';
cards.forEach(e => e.remove()); cards.clear(); render(); await wait(500);
const mb = id => missBadge(findHabit(id));
ok('one miss stays a gentle nudge', mb('y').texts[0] === 'Вчера пропуск' && !mb('y').stale);
ok('short gap shows last time', mb('f').texts[0] === 'Последний раз 5 дней назад' && mb('f').texts.includes('5 дней назад') && !mb('f').stale, mb('f'));
ok('long gap says long time', mb('s').texts[0] === 'Давно не было' && mb('s').stale && mb('s').ago === '3 недели назад', mb('s'));
ok('old never-done habit is stale', mb('n').stale && mb('n').never, mb('n'));
ok('new never-done habit not stale', mb('r').texts[0] === 'Ещё не выполнялась' && !mb('r').stale, mb('r'));
const allTexts = ['y', 'f', 's', 'n', 'r'].flatMap(id => mb(id).texts).join(' ');
ok('no miss counters in badges', !/пропуск(а|ов)|×\d|\d+ раз/.test(allTexts), allTexts);
const card = id => document.querySelector(`.habit[data-id="${id}"]`);
const warn = id => card(id).querySelector('.m-warn');
ok('card shows soft badge text', warn('f').classList.contains('on') && mb('f').texts.includes(warn('f').textContent), warn('f').textContent);
ok('stale badge marked tappable', warn('s').classList.contains('stale') && !warn('f').classList.contains('stale') && getComputedStyle(warn('s')).cursor === 'pointer');

warn('s').click(); await wait(350);
ok('stale tap opens archive offer, not history', menuEl?.querySelector('.pop-actions') && !$('histOv')._shown && menuEl.textContent.includes('3 недели назад'), menuEl?.textContent);
const pr = menuEl?.getBoundingClientRect();
ok('archive offer centered', pr && Math.abs(pr.left - (innerWidth - pr.right)) <= 1 && pr.bottom <= innerHeight, pr);
menuEl.querySelector('[data-a=keep]').click(); await wait(250);
ok('keep closes offer', !menuEl && !findHabit('s').archived);
warn('s').click(); await wait(350);
warn('s').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); warn('s').click(); await wait(250);
ok('second tap on badge closes offer', !menuEl);
warn('n').click(); await wait(350);
ok('never-done offer text', menuEl?.querySelector('.pop-lead')?.textContent.includes('ещё ни разу не выполнялась'), menuEl?.textContent);
menuEl.querySelector('[data-a=arch]').click(); await wait(600);
ok('archive from offer', !!findHabit('n').archived && !card('n'), findHabit('n').archived);
hideToast();

ok('long date has year suffix', fmtLong('2026-10-25') === '25 октября 2026 г.', fmtLong('2026-10-25'));
viewDate = new Date(new Date().getFullYear() - 1, 0, 15); render(); await wait(200);
ok('title of other year has suffix', $('title').textContent === `15 января ${new Date().getFullYear() - 1} г.`, $('title').textContent);
viewDate = new Date(); render(); await wait(200);
ok('greeting date has suffix', / г\.$/.test($('hello').textContent), $('hello').textContent);
state.categories = [{ id: 'c1', name: 'Иностранные языки и культура' }]; findHabit('s').cat = 'c1'; findHabit('s').step = 5; findHabit('s').target = 60; findHabit('s').unit = 'минут';
openHistory('s'); await wait(500);
const labels = [];
for (const r of ['week', 'month', 'year']) { $('hTabs').querySelector(`[data-r=${r}]`).click(); await wait(150); labels.push($('hLabel').textContent); }
ok('period labels have suffix', labels.every(l => /(^| )\d{4} г\.$/.test(l)), labels);
ok('created date in facts has suffix', (() => { $('hInfo').click(); const t = menuEl?.querySelector('.facts')?.textContent || ''; closeMenu(); return / \d{4} г\./.test(t); })());
await wait(200);
const tags = $('hTags');
ok('overflowing tag row uses own class', tags.classList.contains('overflow') && !tags.classList.contains('more'), tags.className);
ok('overflowing tag row keeps full height', tags.getBoundingClientRect().height >= 24 && tags.getBoundingClientRect().width > 300, tags.getBoundingClientRect());
ok('card action button keeps its size', card('s').querySelector('.more').getBoundingClientRect().width === 28);
closeOverlay($('histOv')); hist = null; await wait(400);
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
