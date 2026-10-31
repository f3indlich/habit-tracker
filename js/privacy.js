import { NS } from './core.js?v=2.0';

export const LOCK_STORE = NS + '-lock';
export const PIN_ITER = 200000;
export const FAIL_FREE = 5;
export const FAIL_DELAYS = [30, 60, 300, 900];
export const IDLE_MS = 2 * 60 * 1000;

export let unlocked = false;
export function setUnlocked(v) { unlocked = !!v; }

export const isPrivate = h => h?.private === true;
export const visibleHabits = s => s.habits.filter(h => !isPrivate(h));
export const privateHabits = s => unlocked ? s.habits.filter(isPrivate) : [];

export function readLock() {
  try { const v = JSON.parse(localStorage.getItem(LOCK_STORE)); if (v && typeof v === 'object') return v; } catch {}
  return {};
}
export function writeLock(v) {
  try { localStorage.setItem(LOCK_STORE, JSON.stringify(v)); return true; } catch { return false; }
}
export const hasPin = (rec = readLock()) => typeof rec.hash === 'string' && typeof rec.salt === 'string';
export const validPin = p => typeof p === 'string' && /^\d{4,6}$/.test(p);

export const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function hashPin(pin, salt, iter = PIN_ITER) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
}
export async function makePin(pin, iter = PIN_ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), iter, hash: await hashPin(pin, salt, iter) };
}
export function sameHash(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export async function checkPin(pin, rec) {
  if (!validPin(pin) || !hasPin(rec)) return false;
  return sameHash(await hashPin(pin, unb64(rec.salt), rec.iter || PIN_ITER), rec.hash);
}

export const delayAfter = fails => fails < FAIL_FREE ? 0 : FAIL_DELAYS[Math.min(fails - FAIL_FREE, FAIL_DELAYS.length - 1)] * 1000;
export const lockWait = (rec = readLock(), now = Date.now()) => Math.max(0, (rec.until || 0) - now);

export async function tryPin(pin, now = Date.now()) {
  const rec = readLock();
  if (!hasPin(rec)) return { ok: false, wait: 0 };
  const wait = lockWait(rec, now);
  if (wait) return { ok: false, wait };
  const ok = await checkPin(pin, rec);
  const cur = readLock();
  if (ok) { cur.fails = 0; cur.until = 0; }
  else { cur.fails = (cur.fails || 0) + 1; const d = delayAfter(cur.fails); cur.until = d ? now + d : 0; }
  writeLock(cur);
  return { ok, wait: lockWait(cur, now), fails: cur.fails };
}

export async function setPin(pin) {
  const rec = readLock();
  Object.assign(rec, await makePin(pin), { fails: 0, until: 0 });
  writeLock(rec);
}

export const LONG_MS = 600, LONG_SLOP = 10;
export function addLongPress(el, onLong, ms = LONG_MS, slop = LONG_SLOP) {
  let p = null, fired = false;
  const cancel = () => { if (p) { clearTimeout(p.t); p = null; } el.classList.remove('pressing'); };
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    cancel();
    fired = false;
    el.classList.add('pressing');
    p = { id: e.pointerId, x: e.clientX, y: e.clientY };
    p.t = setTimeout(() => { p = null; fired = true; el.classList.remove('pressing'); navigator.vibrate?.(15); onLong(); }, ms);
  });
  el.addEventListener('pointermove', e => {
    if (p && e.pointerId === p.id && Math.hypot(e.clientX - p.x, e.clientY - p.y) > slop) cancel();
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, cancel);
  el.addEventListener('contextmenu', e => { if (p || fired) e.preventDefault(); });
  el.addEventListener('click', e => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
