import { $, reducedMotion, RING_C } from './core.js?v=1.05a';
import { IC } from './icons.js?v=1.05a';
import { reordering, setReorder } from './render.js?v=1.05a';
import { setHist } from './history.js?v=1.05a';
import { hintPull } from './tips.js?v=1.05a';

export function rollNumber(slot, text, dir, animate) {
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
        { duration: on ? 320 : 200, easing: on ? 'cubic-bezier(.2, .8, .2, 1)' : 'cubic-bezier(.55, 0, .75, .2)' });
    }
  });
}
export function countTo(el, to, suffix = '') {
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
export function flash(el) {
  el.animate([{ opacity: .22, transform: 'scale(.72)' }, { opacity: 0, transform: 'scale(1)' }],
    { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}

export const shownOverlays = () => [...document.querySelectorAll('.overlay')].filter(o => o._shown);
export function openOverlay(ov) {
  const fresh = !ov._shown;
  if (fresh) ov._opener = document.activeElement;
  ov._shown = true;
  ov.hidden = false;
  document.body.classList.add('locked');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (ov._shown) ov.classList.add('open'); }));
  const sheet = ov.querySelector('.sheet');
  if (fresh) { sheet.scrollTop = 0; hintPull(sheet); }
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}
export function closeOverlay(ov) {
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
      ov.classList.remove('edging');
      ov.style.transform = '';
      if (!cancel && (g.dx > innerWidth / 3 || (g.dx > 40 && g.dx / dt > .5))) closeVia(ov);
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
      const d = g.dy - 10;
      sheet.classList.remove('pulling');
      sheet.style.transform = '';
      ov.style.removeProperty('--fade');
      if (!cancel && (d > Math.min(140, sheet.offsetHeight / 3) || (d > 30 && g.dy / dt > .5))) closeVia(ov);
    },
  });
}

export function addPeriodSwipe(sheet, zone, prev, next) {
  trackTouch(sheet, {
    start: g => !!g.target.closest(zone) && !g.target.closest('.hscroll'),
    move: g => {
      if (g.lock) return;
      if (Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) g.lock = 'x';
      else if (Math.abs(g.dy) > 12) return false;
    },
    end: (g, dt, cancel) => {
      if (cancel || Math.abs(g.dx) < 50) return;
      const b = g.dx > 0 ? prev : next;
      if (!b.disabled) b.click();
    },
  });
}

for (const ov of document.querySelectorAll('.overlay.page')) addEdgeBack(ov);
for (const id of ['histOv', 'sumOv', 'dayOv', 'formOv', 'catOv', 'nameOv', 'acctOv', 'installOv']) addPullDown($(id));
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (menuEl) return closeMenu();
  if (confirmResolve) return closeConfirm(false);
  const open = shownOverlays().pop();
  if (open) { requestClose(open); if (open === $('histOv')) setHist(null); }
  else if (reordering) setReorder(false);
});

export let confirmResolve = null;
export function askConfirm(title, text, yesLabel) {
  $('cTitle').textContent = title;
  $('cText').textContent = text;
  $('cYes').innerHTML = (/^Удалить/.test(yesLabel) ? IC.trash : '') + '<span></span>';
  $('cYes').lastChild.textContent = yesLabel;
  openOverlay($('confirm'));
  $('cNo').focus({ preventScroll: true });
  return new Promise(res => confirmResolve = res);
}
export function closeConfirm(result) {
  if (!confirmResolve) return;
  closeOverlay($('confirm'));
  const res = confirmResolve;
  confirmResolve = null;
  res(result);
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
  Object.assign($('toast').style, { transform: '', opacity: '', transition: '' });
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, label === 'Отменить' ? 5000 : 12000);
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
  m.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.97)' }], { duration: 120, easing: 'cubic-bezier(.55, 0, .75, .2)' }).onfinish = () => m.remove();
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
  const roomBelow = innerHeight - r.bottom - 6 - 28, roomAbove = r.top - 6 - 16;
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
document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('.more, .info-btn, .tile-i, .m-warn.stale, #viewBtn')) closeMenu(); });
addEventListener('scroll', closeMenu, { passive: true });
$('hSheet').addEventListener('scroll', closeMenu, { passive: true });

