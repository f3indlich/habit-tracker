window.wait = ms => new Promise(r => setTimeout(r, ms));
window.__errs = [];
addEventListener('error', e => __errs.push(String(e.message)));
addEventListener('unhandledrejection', e => __errs.push(String(e.reason?.message || e.reason)));
const R = [], ok = (name, cond, info = '') => R.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + JSON.stringify(info)));
const ago = n => key(addDays(new Date(), -n));
const T = todayKey();

const fresh = async (habits, log = {}) => {
  setState(normalize({ habits, log, skip: {} }));
  viewDate = new Date();
  cards.forEach(e => e.remove());
  cards.clear();
  render();
  await wait(200);
};

try {
  const n0 = normalize({ habits: [{ id: 'a', name: 'Не пить', abstain: true, target: 8, step: 5, unit: 'раз', created: ago(5) }], log: {} }).habits[0];
  ok('normalize forces once for abstain', n0.abstain === true && n0.target === 1 && !n0.step && n0.unit === '');
  ok('normalize drops false abstain', !('abstain' in normalize({ habits: [{ id: 'b', name: 'B', abstain: false, created: ago(1) }], log: {} }).habits[0]));

  await fresh([{ id: 'a', name: 'Не пить', abstain: true, target: 1, created: ago(5), stat: true }], {});
  const h = () => findHabit('a');
  ok('today is done without a log entry', count(h(), new Date()) === 1 && dayState(h(), new Date()) === 'full');
  ok('yesterday is done without a log entry', count(h(), parseKey(ago(1))) === 1);
  ok('streak counts clean days', streak(h()) >= 5, streak(h()));

  setCount(h(), new Date(), 0);
  ok('setCount 0 stores a slip', state.log[T]?.a === 1 && count(h(), new Date()) === 0, state.log[T]);
  ok('slip day is miss/pending', dayState(h(), new Date()) === 'pending' || dayState(h(), new Date()) === 'miss', dayState(h(), new Date()));

  setCount(h(), new Date(), 1);
  ok('setCount 1 clears the slip', !state.log[T]?.a && count(h(), new Date()) === 1);

  setCount(h(), parseKey(ago(1)), 0);
  ok('statFacts counts slip days', statFacts(h()).n === 1 && statFacts(h()).days[0] === ago(1), statFacts(h()));
  ok('statLead mentions slip', /срыв/i.test(statLead(h())), statLead(h()));

  const p = planStats(h(), state, ago(3), T, T);
  ok('planStats treats clean days as done', p.daysDone >= 2 && p.daysMissed <= 1, p);

  openForm('a');
  await wait(100);
  ok('form shows abstain on', !!form.abstain && document.querySelector('.abstain-rem')?.classList.contains('on'));
  closeOverlay($('formOv'));

  const el = cards.get('a');
  ok('card is complete by default after clear', count(h(), new Date()) === 1);
  if (el) {
    ok('card has abstain class', el.classList.contains('abstain'));
    el.querySelector('.check').click();
    await wait(100);
    ok('tap records a slip', state.log[T]?.a === 1 && count(h(), new Date()) === 0);
    el.querySelector('.check').click();
    await wait(100);
    ok('second tap clears the slip', !state.log[T]?.a && count(h(), new Date()) === 1);
  } else ok('card exists', false);

  await fresh([
    { id: 'm', name: 'Не пить', target: 1, created: ago(5), stat: true },
  ], { [ago(2)]: { m: 1 }, [ago(1)]: { m: 1 }, [T]: { m: 1 } });
  state.logAt = { [ago(1)]: { m: ['10:00'] } };
  state.skip = { [ago(3)]: { m: 1 } };
  ok('clearHabitMarks removes log logAt skip', clearHabitMarks('m') >= 3 && !state.log[ago(1)]?.m && !state.logAt[ago(1)]?.m && !state.skip[ago(3)]?.m, state.log);

  await fresh([
    { id: 'm', name: 'Не пить', target: 1, created: ago(5), stat: true },
  ], { [ago(1)]: { m: 1 }, [T]: { m: 1 } });
  openForm('m');
  await wait(80);
  form.abstain = true;
  $('name').value = 'Не пить';
  await $('form').onsubmit(new Event('submit', { cancelable: true }));
  await wait(150);
  const mh = findHabit('m');
  ok('enabling abstain: done days become clean', mh?.abstain === true && !state.log[ago(1)]?.m && !state.log[T]?.m && count(mh, new Date()) === 1, state.log);
  ok('enabling abstain: unmarked due days become slips', state.log[ago(2)]?.m === 1 && count(mh, parseKey(ago(2))) === 0, state.log);
  ok('migration toast shown', /чистые|срыв/i.test(document.querySelector('.toast')?.textContent || ''), document.querySelector('.toast')?.textContent);

  setCount(mh, parseKey(ago(1)), 0);
  ok('slip on yesterday before disable', state.log[ago(1)]?.m === 1 && count(mh, new Date()) === 1);
  openForm('m');
  await wait(80);
  form.abstain = false;
  $('name').value = 'Не пить';
  await $('form').onsubmit(new Event('submit', { cancelable: true }));
  await wait(150);
  const off = findHabit('m');
  ok('disabling abstain marks clean days done', !off?.abstain && state.log[T]?.m === 1 && count(off, new Date()) === 1, state.log);
  ok('disabling abstain clears slip days', !state.log[ago(1)]?.m && count(off, parseKey(ago(1))) === 0, state.log);
  ok('reverse migration toast', /выполненными|срывы сняты/i.test(document.querySelector('.toast')?.textContent || ''), document.querySelector('.toast')?.textContent);

  await fresh([{ id: 'on', name: 'On', target: 1, created: ago(2) }], { [ago(1)]: { on: 1 } });
  migrateAbstainOn(findHabit('on'));
  ok('migrateAbstainOn inverts done and empty', !state.log[ago(1)]?.on && state.log[ago(2)]?.on === 1 && state.log[T]?.on === 1, state.log);

  await fresh([{ id: 'r', name: 'R', abstain: true, target: 1, created: ago(3) }], { [ago(1)]: { r: 1 } });
  migrateAbstainOff(findHabit('r'));
  ok('migrateAbstainOff keeps skips and fills clean days', state.log[T]?.r === 1 && state.log[ago(2)]?.r === 1 && !state.log[ago(1)]?.r, state.log);

  await fresh([{ id: 'sk', name: 'Sk', abstain: true, target: 1, created: ago(2) }], {});
  setSkip(findHabit('sk'), new Date(), true);
  ok('skip clears effective count', count(findHabit('sk'), new Date()) === 0 && isSkipped(findHabit('sk'), new Date()));
  setCount(findHabit('sk'), new Date(), 1);
  ok('setCount clean clears skip', !isSkipped(findHabit('sk'), new Date()) && count(findHabit('sk'), new Date()) === 1 && !state.log[T]?.sk);

  await fresh([{ id: 'q', name: 'Q', target: 8, created: ago(2), goals: [{ until: ago(1), target: 8 }] }], { [ago(1)]: { q: 8 }, [T]: { q: 3 } });
  migrateAbstainOn(findHabit('q'));
  ok('migrateAbstainOn uses goal target threshold', !state.log[ago(1)]?.q && state.log[T]?.q === 1, state.log);
  const nq = normalize({ habits: [{ id: 'q', name: 'Q', abstain: true, target: 8, goals: [{ until: ago(1), target: 8 }], created: ago(2) }], log: {} }).habits[0];
  ok('normalize drops goals for abstain', nq.abstain && nq.target === 1 && !nq.goals, nq);

  await fresh([{ id: 'b', name: 'B', abstain: true, target: 1, created: ago(3) }], { [ago(1)]: { b: 1 } });
  const badge = missBadge(findHabit('b'));
  ok('missBadge shows yesterday slip when today clean', badge && /срыв/i.test(badge.texts[0]) && count(findHabit('b'), new Date()) === 1, badge);

  ok('dayTip uses abstain words', /чисто|срыв/.test(dayTip(findHabit('b'), parseKey(ago(1)))) && /чисто|срыв/.test(dayTip(findHabit('b'), new Date())), dayTip(findHabit('b'), new Date()));

  ok('no errors', !__errs.length, __errs);
} catch (e) {
  ok('suite crashed', false, String(e && e.stack || e));
}

return R.join('\n');
