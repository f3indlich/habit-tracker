import { $, EASE, EASE_IN, EASE_STD, esc, isIOS, isStandalone, mv, reducedMotion, RING_C, spring, TEST_MODE, viewportHeight } from './core.js?v=2.4a';
import { IC } from './icons.js?v=2.4a';
import { reordering, setReorder } from './render.js?v=2.4a';
import { setHist } from './history.js?v=2.4a';
import { hintPull } from './tips.js?v=2.4a';

export function rollNumber(slot, text, dir, animate) {
  if (slot._val === text) return;
  slot._val = text;
  const nu = document.createElement('span');
  nu.textContent = text;
  const old = [...slot.children];
  slot.append(nu);
  if (!animate || reducedMotion || !text) { old.forEach(o => o.remove()); return; }
  const opts = { duration: 300, easing: EASE_STD };
  if (!old.length) {
    nu.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: spring() });
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

export const SEG_MAX = 12;
export function buildSegments(svg, n) {
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
export function paintSegments(svg, filled, animate) {
  const C = RING_C;
  svg.querySelectorAll('.seg-f').forEach((s, i) => {
    const on = i < filled, was = s.classList.contains('on');
    if (on === was) return;
    s.classList.toggle('on', on);
    const full = `${s.dataset.len} ${C}`, empty = `0 ${C}`;
    s.setAttribute('stroke-dasharray', on ? full : empty);
    if (animate && !reducedMotion) {
      s.animate([{ strokeDasharray: on ? empty : full }, { strokeDasharray: on ? full : empty }],
        { duration: on ? 320 : 200, easing: on ? EASE_STD : EASE_IN });
    }
  });
}
export const numOf = s => { const n = parseInt(String(s).replace(/[\s ]/g, '')); return isNaN(n) ? null : n; };
export function countTo(el, to, suffix = '', { from = numOf(el.textContent) ?? 0, fmt = String } = {}) {
  cancelAnimationFrame(el._raf);
  if (from === to || reducedMotion || !el.isConnected || !el.offsetParent) { el.textContent = fmt(to) + suffix; return; }
  const t0 = performance.now(), dur = Math.min(700, 380 + Math.abs(to - from) * 6);
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e)) + suffix;
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
let lastTap = null;
addEventListener('pointerdown', e => { lastTap = [e.clientX, e.clientY]; }, true);
export function morph(fn, reveal = false) {
  if (reducedMotion || TEST_MODE || !document.startViewTransition || document.hidden) return fn();
  const root = document.documentElement, [x, y] = lastTap || [innerWidth / 2, innerHeight / 2];
  if (reveal) root.classList.add('vt-reveal');
  const t = document.startViewTransition(fn);
  if (!reveal) return;
  t.ready.then(() => {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: mv(420, 680), easing: EASE, pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
  t.finished.finally(() => root.classList.remove('vt-reveal'));
}
const SEGS = '.seg, .pseg, .mini-seg';
const picked = box => box.querySelector(':scope > [aria-pressed=true], :scope > [aria-checked=true]');
export function slidePick(box, from) {
  const el = picked(box);
  if (!el || !box.isConnected || reducedMotion) return;
  const to = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (!to.width || (Math.abs(to.left - from.left) < 1 && Math.abs(to.top - from.top) < 1)) return;
  const cs = getComputedStyle(el), g = document.createElement('i');
  g.className = 'seg-ghost';
  g.setAttribute('aria-hidden', 'true');
  Object.assign(g.style, { left: to.left - b.left - box.clientLeft + 'px', top: to.top - b.top - box.clientTop + 'px', width: to.width + 'px', height: to.height + 'px',
    background: cs.backgroundColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius });
  box.querySelectorAll(':scope > .seg-ghost').forEach(x => x.remove());
  box.prepend(g);
  el.classList.add('seg-under');
  const a = g.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: 'none' }],
    { duration: mv(280, 440), easing: mv('cubic-bezier(.3, .9, .3, 1)', spring()) });
  a.onfinish = a.oncancel = () => { g.remove(); el.classList.remove('seg-under'); };
}
document.addEventListener('click', e => {
  const box = e.target.closest?.(SEGS);
  const from = box && !reducedMotion && picked(box)?.getBoundingClientRect();
  if (from) setTimeout(() => slidePick(box, from));
}, true);
export function flash(el) {
  el.animate([{ opacity: .22, transform: 'scale(.72)' }, { opacity: 0, transform: 'scale(1)' }],
    { duration: 420, easing: EASE_STD });
}

export const VGAP_MIN = 120;
export const viewportGap = ({ ios, standalone, typing, inner, full }) => ios && standalone && !typing && full - inner >= VGAP_MIN ? Math.round(full - inner) : 0;
const typingNow = () => !!document.activeElement?.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]');
export function fixViewport() {
  const full = innerHeight >= innerWidth ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const gap = viewportGap({ ios: isIOS, standalone: isStandalone(), typing: typingNow(), inner: innerHeight, full });
  const v = gap + 'px', root = document.documentElement;
  if (root.style.getPropertyValue('--vgap') !== v) gap ? root.style.setProperty('--vgap', v) : root.style.removeProperty('--vgap');
}
if (isIOS) {
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fixViewport); };
  for (const ev of ['resize', 'orientationchange', 'pageshow']) addEventListener(ev, later);
  addEventListener('scroll', later, { passive: true });
  window.visualViewport?.addEventListener('resize', later);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { later(); setTimeout(fixViewport, 500); } });
  document.addEventListener('focusout', () => setTimeout(fixViewport, 400));
  fixViewport();
}

export const shownOverlays = () => [...document.querySelectorAll('.overlay')].filter(o => o._shown);
let histHeld = false, histSkip = 0, histWant = false;
export const usesHistory = ios => !ios;
const HIST = usesHistory(isIOS);
const keepFieldInView = () => {
  const el = document.activeElement;
  if (el?.matches('input:not([type=checkbox]), textarea') && el.closest('.overlay')?._shown) el.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
};
document.addEventListener('click', e => {
  const s = e.target.closest?.('details > summary');
  const d = s?.parentElement;
  if (!d || reducedMotion || e.defaultPrevented || !d.isConnected) return;
  e.preventDefault();
  d._anim?.cancel();
  const from = d.offsetHeight, closing = d.open;
  if (!closing) d.open = true;
  const to = closing ? s.offsetHeight : d.offsetHeight;
  d.style.overflow = 'hidden';
  const a = d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: closing ? 260 : 340, easing: 'cubic-bezier(.3, .8, .3, 1)' });
  if (!closing) [...d.children].filter(c => c !== s).forEach(c => c.animate({ opacity: [0, 1], transform: ['translateY(-4px)', 'none'] }, { duration: 300, delay: 60, easing: 'ease-out', fill: 'backwards' }));
  a.onfinish = () => { if (closing) d.open = false; d.style.overflow = ''; d._anim = null; };
  a.oncancel = () => { d.style.overflow = ''; };
});
function cascade(sheet) {
  const items = [...sheet.children].filter(e => !e.hidden && e.offsetParent !== null && !e.matches('[data-close], .tip-layer')).slice(0, 9);
  items.forEach((e, i) => e.animate([{ opacity: 0, transform: mv('translateY(8px)', 'translateY(18px) scale(.97)') }, { opacity: 1, transform: 'none' }],
    { duration: mv(260, 460), delay: mv(50, 70) + i * mv(24, 38), easing: mv(EASE_STD, spring()), fill: 'backwards' }));
}
function syncRecede() {
  const on = !reducedMotion && shownOverlays().some(o => !o.classList.contains('page'));
  if (on && !document.body.classList.contains('recede')) document.documentElement.style.setProperty('--recede-y', Math.round(scrollY + innerHeight / 2) + 'px');
  document.body.classList.toggle('recede', on);
}
const flingOut = (el, dist, speed) => {
  if (reducedMotion) return;
  const ms = Math.round(Math.max(130, Math.min(300, dist / Math.max(speed, .6))));
  el.style.transition = `transform ${ms}ms cubic-bezier(.2, .7, .3, 1)`;
  setTimeout(() => { el.style.transition = ''; }, ms + 40);
};
export function openOverlay(ov) {
  const fresh = !ov._shown;
  if (!shownOverlays().length) window.visualViewport?.addEventListener('resize', keepFieldInView);
  if (fresh && HIST && !histHeld) {
    if (histSkip) histWant = true;
    else { history.pushState({ sheet: true }, ''); histHeld = true; }
  }
  if (fresh) { ov._opener = document.activeElement; hideToast(); }
  ov._shown = true;
  ov.hidden = false;
  syncRecede();
  document.body.classList.add('locked');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (ov._shown) ov.classList.add('open'); }));
  const sheet = ov.querySelector('.sheet');
  if (fresh) { sheet.scrollTop = 0; hintPull(sheet); }
  if (fresh && !reducedMotion && !ov.classList.contains('page')) cascade(sheet);
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}
export function closeOverlay(ov) {
  closeMenu();
  if (!ov._shown) return;
  ov._shown = false;
  ov.classList.remove('open');
  syncRecede();
  if (!shownOverlays().length) {
    document.body.classList.remove('locked');
    window.visualViewport?.removeEventListener('resize', keepFieldInView);
    if (histHeld) { histHeld = false; histSkip++; history.back(); }
  }
  setTimeout(() => { if (!ov._shown) ov.hidden = true; }, reducedMotion ? 0 : 320);
  if (ov._opener?.isConnected) ov._opener.focus({ preventScroll: true });
  ov._opener = null;
}
addEventListener('popstate', async () => {
  if (histSkip) {
    if (--histSkip || !histWant) return;
    histWant = false;
    if (HIST && shownOverlays().length && !histHeld) { history.pushState({ sheet: true }, ''); histHeld = true; }
    return;
  }
  histHeld = false;
  const top = shownOverlays().pop();
  if (!top) return;
  if (top === $('confirm')) closeConfirm(false); else await requestClose(top);
  if (HIST && shownOverlays().length && !histHeld) { history.pushState({ sheet: true }, ''); histHeld = true; }
});
addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const ov = shownOverlays().pop();
  if (!ov) return;
  const items = [...ov.querySelectorAll('button, input, textarea, [tabindex="0"]')].filter(x => !x.disabled && x.offsetParent && !x.closest('[inert]'));
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || !ov.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !ov.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
});
for (const ov of document.querySelectorAll('.overlay')) {
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-close]')) ov === $('confirm') ? closeConfirm(false) : requestClose(ov);
  });
}
export async function requestClose(ov) {
  if (ov._guard && !(await ov._guard())) return;
  closeOverlay(ov);
}

export function trackTouch(el, { start, move, end }) {
  let t = null;
  el.addEventListener('touchstart', e => {
    t = null;
    if (e.touches.length !== 1) return;
    const p = e.touches[0];
    const g = { x0: p.clientX, y0: p.clientY, t0: e.timeStamp, dx: 0, dy: 0, lock: null, target: e.target };
    if (start(g) !== false) t = g;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (!t) return;
    const p = e.touches[0];
    t.dx = p.clientX - t.x0; t.dy = p.clientY - t.y0;
    if (move(t) === false) t = null;
    else if (t.lock && e.cancelable) e.preventDefault();
  }, { passive: false });
  const fin = e => {
    const g = t;
    t = null;
    if (g?.lock) end(g, Math.max(1, e.timeStamp - g.t0), e.type === 'touchcancel');
  };
  el.addEventListener('touchend', fin);
  el.addEventListener('touchcancel', fin);
}
const isTop = ov => ov._shown && shownOverlays().pop() === ov && !menuEl;
export const closeVia = ov => { const b = ov.querySelector('[data-close]'); b ? b.click() : closeOverlay(ov); };
export const EDGE = 24;

export function addEdgeBack(ov) {
  trackTouch(ov, {
    start: g => isTop(ov) && g.x0 <= EDGE,
    move: g => {
      if (!g.lock) {
        if (Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy)) { g.lock = 'x'; ov.classList.add('edging'); }
        else if (Math.abs(g.dy) > 10) return false;
        else return;
      }
      ov.style.transform = `translateX(${Math.max(0, g.dx)}px)`;
    },
    end: (g, dt, cancel) => {
      const leave = !cancel && (g.dx > innerWidth / 3 || (g.dx > 40 && g.dx / dt > .5));
      if (leave) flingOut(ov, innerWidth - g.dx, g.dx / dt);
      ov.classList.remove('edging');
      ov.style.transform = '';
      if (leave) closeVia(ov);
    },
  });
}

export function addPullDown(ov) {
  const sheet = ov.querySelector('.sheet');
  sheet.classList.add('pull');
  let top = 0;
  trackTouch(sheet, {
    start: g => { top = sheet.scrollTop; return isTop(ov) && !g.target.closest('input, textarea'); },
    move: g => {
      if (!g.lock) {
        if (Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy)) return false;
        if (g.dy < -10 || (g.dy > 10 && (top > 0 || sheet.scrollTop > 0))) return false;
        if (g.dy <= 10) return;
        g.lock = 'y';
        sheet.classList.add('pulling');
      }
      const d = Math.max(0, g.dy - 10);
      sheet.style.transform = `translateY(${d}px)`;
      ov.style.setProperty('--fade', Math.max(0, 1 - d / sheet.offsetHeight).toFixed(3));
    },
    end: (g, dt, cancel) => {
      const d = g.dy - 10, h = sheet.offsetHeight;
      const leave = !cancel && (d > Math.min(140, h / 3) || (d > 30 && g.dy / dt > .5));
      if (leave) flingOut(sheet, h - d, g.dy / dt);
      sheet.classList.remove('pulling');
      sheet.style.transform = '';
      ov.style.removeProperty('--fade');
      if (leave) closeVia(ov);
    },
  });
}

export function periodSlider({ sheet, zone, track, prev, next, tabs, active, get, set, step, render, paint = render }) {
  const vp = track.parentElement, GAP = 16;
  let peeks = {}, off = 0, anim = null, after = null;
  const page = () => vp.offsetWidth + GAP;
  const btn = s => s < 0 ? prev : next;
  const move = x => { off = x; track.style.transform = x ? `translateX(${x}px)` : ''; };
  const shift = s => { set(step(get(), s)); track.classList.add('no-anim'); render(); };
  const peek = s => {
    if (peeks[s] || btn(s).disabled) return;
    const a = get();
    track.classList.add('no-anim');
    set(step(a, s));
    paint();
    const p = track.cloneNode(true);
    set(a);
    paint();
    p.querySelectorAll('.per-peek').forEach(e => e.remove());
    [p, ...p.querySelectorAll('[id]')].forEach(e => e.removeAttribute('id'));
    p.className = 'per-track per-peek no-anim';
    p.inert = true;
    p.setAttribute('aria-hidden', 'true');
    p.style.transform = '';
    p.style.left = s * page() + 'px';
    track.append(p);
    peeks[s] = p;
  };
  const clear = () => { Object.values(peeks).forEach(p => p.remove()); peeks = {}; move(0); };
  const flush = () => {
    if (!anim) return;
    const a = anim, f = after;
    anim = after = null;
    a.cancel();
    f();
  };
  const settle = (to, ms, done) => {
    const a = anim = track.animate([{ transform: `translateX(${off}px)` }, { transform: `translateX(${to}px)` }], { duration: ms, easing: 'cubic-bezier(.22, .75, .25, 1)' });
    after = done;
    move(to);
    a.onfinish = () => { if (anim !== a) return; anim = after = null; done(); };
  };
  const land = s => () => { clear(); shift(s); };
  const go = s => {
    flush();
    if (!active() || btn(s).disabled) return;
    if (reducedMotion) return shift(s);
    peek(s);
    settle(-s * page(), 340, land(s));
  };
  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  tabs.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.getAttribute('aria-pressed') !== 'true') { flush(); clear(); track.classList.remove('no-anim'); }
  }, true);
  trackTouch(sheet, {
    start: g => {
      if (!active() || !g.target.closest(zone) || g.target.closest('.hscroll')) return false;
      flush();
    },
    move: g => {
      if (!g.lock) {
        if (Math.abs(g.dx) >= 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) {
          g.lock = 'x';
          sheet.querySelectorAll('.tip.show').forEach(t => t.classList.remove('show'));
          sheet.querySelectorAll('[data-tip].on').forEach(t => t.classList.remove('on'));
          if (!reducedMotion) [-1, 1].forEach(peek);
        } else if (Math.abs(g.dy) >= 6) return false;
        else return;
      }
      if (reducedMotion) return;
      const w = page(), s = g.dx < 0 ? 1 : -1;
      move(peeks[s] ? Math.max(-w, Math.min(w, g.dx)) : g.dx / (1 + Math.abs(g.dx) / 80));
    },
    end: (g, dt, cancel) => {
      const s = g.dx < 0 ? 1 : -1, w = page(), v = g.dx / dt;
      const ok = !cancel && !btn(s).disabled && (Math.abs(g.dx) >= w * .25 || (Math.abs(v) > .35 && Math.abs(g.dx) > 24));
      if (ok && reducedMotion) return shift(s);
      if (ok) { peek(s); settle(-s * w, Math.round(Math.min(340, Math.max(160, (w - Math.abs(off)) / Math.max(Math.abs(v), .9)))), land(s)); }
      else if (off) settle(0, Math.round(Math.min(320, 160 + Math.abs(off))), clear);
      else clear();
    },
  });
  return { reset: () => { flush(); clear(); track.classList.remove('no-anim'); } };
}

for (const ov of document.querySelectorAll('.overlay.page')) addEdgeBack(ov);
for (const id of ['histOv', 'sumOv', 'dayOv', 'formOv', 'catOv', 'nameOv', 'acctOv', 'installOv', 'delOv', 'lockOv', 'gFormOv']) addPullDown($(id));
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (menuEl) return closeMenu();
  if (confirmResolve) return closeConfirm(false);
  const open = shownOverlays().pop();
  if (open) { requestClose(open); if (open === $('histOv')) setHist(null); }
  else if (reordering) setReorder(false);
});

export let confirmResolve = null;
export function askConfirm(title, text, yesLabel, choices = null) {
  $('cTitle').textContent = title;
  $('cText').textContent = text;
  $('cChoices').hidden = !choices;
  $('cChoices').innerHTML = choices ? choices.items.map((c, i) =>
    `<label class="del-check"><input type="radio" name="cChoice" value="${esc(c.v)}"${i ? '' : ' checked'}><span>${esc(c.label)}</span></label>`).join('')
    + (choices.hint ? `<p class="c-hint">${esc(choices.hint)}</p>` : '') : '';
  $('cYes').className = choices ? 'primary' : 'danger-fill';
  $('cYes').innerHTML = (/^Удалить/.test(yesLabel) ? IC.trash : '') + '<span></span>';
  $('cYes').lastChild.textContent = yesLabel;
  openOverlay($('confirm'));
  $('cNo').focus({ preventScroll: true });
  return new Promise(res => confirmResolve = res);
}
export function closeConfirm(result) {
  if (!confirmResolve) return;
  closeOverlay($('confirm'));
  const res = confirmResolve, pick = $('cChoices').hidden ? null : $('cChoices').querySelector('input:checked')?.value;
  confirmResolve = null;
  res(result && pick != null ? pick : result);
}
$('cYes').onclick = () => closeConfirm(true);
$('cNo').onclick = () => closeConfirm(false);

export let toastTimer = null, toastSwipe = null;
export function toast(text, action, label = 'Отменить') {
  $('toastText').textContent = text;
  $('toastUndo').hidden = !action;
  $('toastUndo').textContent = label;
  $('toastUndo').onclick = () => { action?.(); hideToast(); };
  toastSwipe = null;
  Object.assign($('toast').style, { transform: '', opacity: '', transition: '', bottom: toastLift() });
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, label === 'Отменить' ? 5000 : 12000);
}
export function toastLift() {
  const ov = shownOverlays().pop();
  if (!ov) return '';
  const vh = innerHeight, zone = vh - 160;
  let top = vh;
  for (const el of ov.querySelectorAll('button, input, textarea, select, [role=button]')) {
    const r = el.getBoundingClientRect();
    if (r.height && r.width && r.bottom > zone && r.top < vh && getComputedStyle(el).visibility !== 'hidden') top = Math.min(top, r.top);
  }
  return top < vh ? `${Math.round(vh - top + 10)}px` : '';
}
export function hideToast() { $('toast').classList.remove('show'); }
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
export const endToastSwipe = e => {
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

export let fabY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY, d = y - fabY;
  if (Math.abs(d) < 8 && y > 80) return;
  document.body.classList.toggle('fab-away', d > 0 && y > 80);
  fabY = y;
}, { passive: true });

export let menuEl = null;
export function closeMenu() {
  const m = menuEl;
  if (!m) return;
  menuEl = null;
  if (reducedMotion) return m.remove();
  m.style.pointerEvents = 'none';
  m.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.97)' }], { duration: 120, easing: EASE_IN }).onfinish = () => m.remove();
}
export function openMenu(anchor, items) {
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
export function placeMenu(anchor) {
  document.body.append(menuEl);
  const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth;
  const roomBelow = viewportHeight() - r.bottom - 6 - 28, roomAbove = r.top - 6 - 16;
  const below = menuEl.offsetHeight <= roomBelow || roomBelow >= roomAbove;
  menuEl.style.maxHeight = Math.max(160, below ? roomBelow : roomAbove) + 'px';
  const mh = menuEl.offsetHeight;
  menuEl.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + scrollX + 'px';
  menuEl.style.top = (below ? r.bottom + 6 : r.top - mh - 6) + scrollY + 'px';
  menuEl.style.transformOrigin = below ? 'top right' : 'bottom right';
}
export function openPopover(anchor, html, color) {
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
  const side = mh + 8 <= viewportHeight() - r.bottom - 16 ? 'below' : mh + 8 <= r.top - 16 ? 'above' : 'center';
  menuEl.dataset.side = side;
  menuEl.style.left = left + 'px';
  if (side === 'center') {
    menuEl.style.maxHeight = viewportHeight() - 32 + 'px';
    menuEl.style.top = Math.max(16, Math.round((viewportHeight() - menuEl.offsetHeight) / 2)) + 'px';
    menuEl.style.transformOrigin = 'center';
    return;
  }
  menuEl.style.top = Math.round(side === 'below' ? r.bottom + 8 : r.top - mh - 8) + 'px';
  menuEl.style.setProperty('--ax', Math.max(18, Math.min(mw - 18, ax - left)) + 'px');
  menuEl.style.transformOrigin = `${Math.round(ax - left)}px ${side === 'below' ? 'top' : 'bottom'}`;
}
document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('.more, .info-btn, .tile-i, .m-warn.stale, #viewBtn')) closeMenu(); });
addEventListener('scroll', closeMenu, { passive: true });
$('hSheet').addEventListener('scroll', closeMenu, { passive: true });

