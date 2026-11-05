window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const fresh = habits => { state = normalize({ habits, log: {} }); viewDate = new Date(); cards.forEach(e => e.remove()); cards.clear(); render(); };
fresh([
  { id: 'a', name: 'Вода', icon: 'water', color: '#3b82f6', created: ago(10) },
  { id: 'b', name: 'Чтение', icon: 'book', color: '#22c55e', created: ago(10) },
  { id: 'c', name: 'Бег', icon: 'run', color: '#f97316', target: 5, unit: 'км', created: ago(10) },
]);
await wait(700);

openHistory('c'); await wait(600);
{
  const tabs = $('hTabs'), month = tabs.querySelector('[data-r=month]');
  month.click(); await wait(40);
  const ghost = tabs.querySelector(':scope > .seg-ghost');
  ok('segment selection slides to the new tab', !!ghost && ghost.getAnimations().length === 1 && month.classList.contains('seg-under') && month.getAttribute('aria-pressed') === 'true');
  await wait(450);
  ok('slide leaves no traces', !tabs.querySelector('.seg-ghost') && !month.classList.contains('seg-under') && getComputedStyle(month).backgroundColor !== 'rgba(0, 0, 0, 0)');
  month.click(); await wait(40);
  ok('same tab does not slide', !tabs.querySelector('.seg-ghost'));
}
closeOverlay($('histOv')); await wait(450);

{
  const el = document.createElement('b');
  el.textContent = '10';
  $('sections').append(el);
  countTo(el, 40, '%'); await wait(150);
  const mid = numOf(el.textContent);
  ok('numbers count up smoothly', mid > 10 && mid < 40 && el.textContent.endsWith('%'), el.textContent);
  await wait(700);
  ok('count ends on the exact value', el.textContent === '40%', el.textContent);
  countTo(el, 12345, '', { from: 9000, fmt: fmtNum }); await wait(800);
  ok('formatted numbers count too', el.textContent === fmtNum(12345), el.textContent);
  el.remove();
}

{
  changeCount(findHabit('a'), new Date(), 1); render(); await wait(60);
  const ca = document.querySelector('.habit[data-id="a"]');
  ok('completed habit gets a glow sweep', !!ca.querySelector(':scope > .glow') && ca.querySelector(':scope > .glow').getAnimations().length === 1);
  await wait(950);
  ok('glow disappears', !ca.querySelector(':scope > .glow'));
  changeCount(findHabit('a'), new Date(), 0); render(); await wait(60);
  ok('undoing a mark gives no glow', !ca.querySelector(':scope > .glow'));
  changeCount(findHabit('a'), new Date(), 1); render(); await wait(900);
  const day = [...$('days').children].find(b => b.classList.contains('today'));
  changeCount(findHabit('b'), new Date(), 1); render(); await wait(30);
  ok('day not yet perfect has no pulse', !day.classList.contains('perfect') && !day.querySelector('.dr').getAnimations().length);
  changeCount(findHabit('c'), new Date(), 5); render(); await wait(40);
  ok('perfect day pulses in the week strip', day.classList.contains('perfect') && day.querySelector('.dr').getAnimations().length === 1);
  await wait(700);
  render(); await wait(40);
  ok('pulse plays once', !day.querySelector('.dr').getAnimations().length);
}
await wait(1500);

{
  state = normalize({ habits: [{ id: 'n', name: 'Новая', icon: 'check', color: '#ec4899', created: todayKey() }, ...state.habits], log: state.log });
  render(); await wait(40);
  const moved = ['a', 'b', 'c'].map(id => document.querySelector(`.habit[data-id="${id}"]`).getAnimations().some(x => String(x.effect.getKeyframes()[0].transform).startsWith('translateY')));
  ok('cards below a new one slide down', moved.every(Boolean), moved);
  await wait(600);
  render(); await wait(40);
  ok('no slide when order is unchanged', ['a', 'b', 'c'].every(id => !document.querySelector(`.habit[data-id="${id}"]`).getAnimations().length));
}

{
  openHistory('a'); await wait(60);
  const kids = [...$('hSheet').children].filter(e => !e.hidden && e.offsetParent !== null);
  const delays = kids.map(e => e.getAnimations().map(x => x.effect.getTiming().delay).find(d => d >= 70)).filter(d => d != null);
  ok('sheet content appears in a cascade', delays.length >= 4 && delays.every((d, i) => !i || d > delays[i - 1]), delays);
  await wait(800);
  ok('cascade leaves content in place', kids.every(e => !e.getAnimations().length && getComputedStyle(e).opacity === '1'));
  closeOverlay($('histOv')); await wait(450);
}

{
  const d = document.createElement('details');
  d.innerHTML = '<summary>Ещё</summary><p style="margin:0;height:80px">Текст</p>';
  $('sections').append(d);
  const h0 = d.offsetHeight;
  d.querySelector('summary').click(); await wait(110);
  ok('details opens smoothly', d.open && d.offsetHeight > h0 && d.offsetHeight < h0 + 80, [h0, d.offsetHeight]);
  await wait(400);
  ok('details fully open', d.offsetHeight >= h0 + 80 && d.style.overflow === '', d.offsetHeight);
  d.querySelector('summary').click(); await wait(100);
  ok('details closes smoothly', d.open && d.offsetHeight < h0 + 80 && d.offsetHeight > h0, d.offsetHeight);
  await wait(400);
  ok('details closed after animation', !d.open && d.offsetHeight === h0 && d.style.overflow === '');
  d.remove();
}

{
  const got = [];
  Object.defineProperty(navigator, 'vibrate', { value: p => { got.push(p); return true; }, configurable: true });
  celebrate(); await wait(50);
  ok('finished day vibrates with its own pattern', got.length === 1 && JSON.stringify(got[0]) === JSON.stringify(CHEER) && CHEER.length > 3);
  document.querySelectorAll('.confetti').forEach(x => x.remove());
}
{
  const root = document.documentElement, radios = () => [...$('motionSeg').children], pick = m => radios().find(b => b.dataset.m === m).click();
  ok('calm animations by default', root.dataset.motion === 'calm' && radios().length === 2 && radios().find(b => b.getAttribute('aria-checked') === 'true').dataset.m === 'calm' && !!$('motionHint').textContent);
  ok('spring eases animations', !!spring() && mv(1, 2) === 1 && confettiCount({}) === CONFETTI);

  await wait(300);
  fresh([{ id: 'x', name: 'Вода', icon: 'water', color: '#3b82f6', created: ago(10) }, { id: 'y', name: 'Чтение', icon: 'book', color: '#22c55e', created: ago(10) }]);
  await wait(600);
  changeCount(findHabit('x'), new Date(), 1); render(); await wait(60);
  const card = document.querySelector('.habit[data-id="x"]');
  ok('calm mark has no sparks', !document.querySelector('.spark') && card.getAnimations().length >= 1);
  await wait(700);

  pick('vivid'); await wait(60);
  ok('vivid mode switches and is remembered', root.dataset.motion === 'vivid' && getPref(MOTION_STORE, '') === 'vivid' && radios().find(b => b.dataset.m === 'vivid').getAttribute('aria-checked') === 'true' && $('motionHint').textContent.includes('частицы'));
  ok('vivid uses another spring and more confetti', spring() !== '' && mv(1, 2) === 2 && confettiCount({}) === CONFETTI_VIVID && confettiCount({ hardwareConcurrency: 4 }) === CONFETTI_VIVID / 2);
  ok('vivid sheets are slower than calm', parseFloat(getComputedStyle(root).getPropertyValue('--dur-sheet')) === .46);
  await wait(800);
  document.querySelectorAll('.spark').forEach(x => x.remove());
  changeCount(findHabit('y'), new Date(), 1); render(); await wait(60);
  ok('vivid mark throws sparks', document.querySelectorAll('.spark').length >= 6, document.querySelectorAll('.spark').length);
  await wait(900);
  ok('sparks clean up', !document.querySelector('.spark'));

  openSummary(); await wait(60);
  ok('sheet makes the screen recede', document.body.classList.contains('recede') && getComputedStyle($('sSheet').closest('.overlay')).position === 'fixed');
  await wait(600);
  ok('vivid screen shrinks behind the sheet', document.querySelector('.wrap').getBoundingClientRect().width < document.documentElement.clientWidth * .97);
  closeOverlay($('sumOv')); await wait(600);
  ok('screen returns after closing', !document.body.classList.contains('recede') && getComputedStyle(document.querySelector('.wrap')).transform === 'none');
  openOverlay($('setOv')); await wait(60);
  ok('full pages do not recede', !document.body.classList.contains('recede'));
  closeOverlay($('setOv')); await wait(450);

  celebrate(); await wait(120);
  ok('finished day has a shock wave in vivid', document.querySelectorAll('.shock').length === 2 && document.querySelectorAll('.confetti').length === confettiCount(), [document.querySelectorAll('.shock').length, document.querySelectorAll('.confetti').length]);
  document.querySelectorAll('.confetti, .shock').forEach(x => x.remove());

  applyMotion('nonsense');
  ok('unknown mode falls back to calm', root.dataset.motion === 'calm');
  setPref(MOTION_STORE, 'calm');
}
ok('no page errors', __errs.length === 0, __errs);
return R.join('\n');
