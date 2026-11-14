import { esc } from './core.js?v=3.4c';

export const WHEEL_ROW = 40, WHEEL_ROWS = 5;

export function makeWheel(el, onPick) {
  const w = { el, items: [], i: 0, timer: 0, quiet: false };
  const near = () => Math.max(0, Math.min(w.items.length - 1, Math.round(el.scrollTop / WHEEL_ROW)));
  const mark = i => {
    el.querySelector('.wheel-it.on')?.classList.remove('on');
    el.children[i + 1]?.classList.add('on');
    el.setAttribute('aria-valuenow', i);
    el.setAttribute('aria-valuetext', w.items[i]?.label || '');
  };
  w.fill = (items, i = 0) => {
    w.items = items;
    el.setAttribute('aria-valuemin', 0);
    el.setAttribute('aria-valuemax', items.length - 1);
    el.innerHTML = '<div class="wheel-pad"></div>' + items.map((x, n) => `<div class="wheel-it" data-n="${n}">${esc(x.label)}</div>`).join('') + '<div class="wheel-pad"></div>';
    w.set(i);
  };
  w.set = (i, smooth = false) => {
    w.i = Math.max(0, Math.min(w.items.length - 1, i));
    w.quiet = true;
    clearTimeout(w.timer);
    el.scrollTo({ top: w.i * WHEEL_ROW, behavior: smooth ? 'smooth' : 'auto' });
    mark(w.i);
    w.timer = setTimeout(() => { w.quiet = false; }, smooth ? 400 : 60);
  };
  w.value = () => w.items[w.i]?.v;
  const pick = i => {
    if (i === w.i) return;
    w.i = i;
    mark(i);
    onPick?.(w);
  };
  el.addEventListener('scroll', () => {
    const i = near();
    mark(i);
    clearTimeout(w.timer);
    w.timer = setTimeout(() => {
      if (w.quiet) { w.quiet = false; w.i = near(); mark(w.i); return; }
      pick(near());
    }, 90);
  }, { passive: true });
  el.addEventListener('click', e => {
    const it = e.target.closest('.wheel-it');
    if (!it) return;
    const i = +it.dataset.n, prev = w.i;
    w.set(i, true);
    if (i !== prev) onPick?.(w);
  });
  el.addEventListener('keydown', e => {
    const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -WHEEL_ROWS, PageDown: WHEEL_ROWS }[e.key];
    let i = step != null ? w.i + step : e.key === 'Home' ? 0 : e.key === 'End' ? w.items.length - 1 : null;
    if (i == null) return;
    e.preventDefault();
    i = Math.max(0, Math.min(w.items.length - 1, i));
    const prev = w.i;
    w.set(i);
    if (i !== prev) onPick?.(w);
  });
  return w;
}
