import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import webpush from 'npm:web-push@3.6.7';

const WINDOW_MIN = 30;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function localNow(tz, now) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    });
  } catch {
    return localNow('UTC', now);
  }
  const p = Object.fromEntries(fmt.formatToParts(now).map(x => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    minutes: (+p.hour % 24) * 60 + +p.minute,
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = t => (HHMM.test(t || '') ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);

function slotsFor(h, local) {
  const r = typeof h.remind === 'string' ? { times: [h.remind] } : h.remind;
  if (!r || typeof r !== 'object') return [];
  if (r.from && local.day < r.from) return [];
  if (r.to && local.day > r.to) return [];
  if (Array.isArray(r.days) && r.days.length && !r.days.includes(local.weekday)) return [];
  const target = Math.max(1, h.target || 1);
  const per = Math.max(1, Math.min(target, parseInt(h.step) || 1));
  const n = Math.ceil(target / per);
  const a = toMin(r.spread?.from), b = toMin(r.spread?.to);
  if (n > 1 && a != null && b != null && b > a) {
    return Array.from({ length: n }, (_, i) => ({
      at: Math.round(a + (b - a) * i / (n - 1)), need: Math.min(target, (i + 1) * per), kind: 'spread',
    }));
  }
  const step = [15, 30, 60].includes(r.repeat) ? r.repeat : 0;
  const repeats = step ? Math.max(1, Math.min(3, parseInt(r.repeatN) || 1)) : 0;
  const out = [];
  for (const t of Array.isArray(r.times) ? r.times : []) {
    const m = toMin(t);
    if (m == null) continue;
    out.push({ at: m, need: target, kind: 'time' });
    for (let k = 1; k <= repeats; k++) if (m + k * step < 1440) out.push({ at: m + k * step, need: target, kind: 'repeat' });
  }
  return out;
}

const DAY_MS = 864e5;
const keyDate = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)));
const dateKey = d => d.toISOString().slice(0, 10);
const shiftKey = (k, n) => dateKey(new Date(keyDate(k).getTime() + n * DAY_MS));
const weekdayOf = k => (keyDate(k).getUTCDay() + 6) % 7;
const mondayOf = k => shiftKey(k, -weekdayOf(k));

function scheduleOf(h) {
  const days = Array.isArray(h.days) && h.days.length && h.days.length < 7 ? h.days : null;
  const s = h.schedule;
  if (s && typeof s === 'object' && (s.type === 'weekdays' ? String(s.days) === String(days) : !days)) return s;
  return days ? { type: 'weekdays', days } : { type: 'daily' };
}
function scheduleOn(h, k) {
  const gs = Array.isArray(h.goals) ? h.goals : [];
  let i = gs.findIndex(g => k <= g.until);
  if (i >= 0) for (; i < gs.length; i++) if (gs[i].sched) return gs[i].sched;
  return scheduleOf(h);
}
const goalOn = (h, k) => (Array.isArray(h.goals) ? h.goals : []).find(g => k <= g.until) || h;
const targetOn = (h, k) => Math.max(1, goalOn(h, k).target || 1);
const inLife = (h, k) => !(h.created && k < h.created) && !(h.archived && k > h.archived);

function schedDue(sc, k) {
  const wd = weekdayOf(k);
  switch (sc.type) {
    case 'weekdays': return sc.days.includes(wd);
    case 'everyNWeeks': {
      const w = Math.round((keyDate(mondayOf(k)) - keyDate(mondayOf(sc.anchor))) / (7 * DAY_MS));
      return ((w % sc.every) + sc.every) % sc.every === 0 && sc.days.includes(wd);
    }
    case 'monthly': {
      const last = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
      return +k.slice(8, 10) === Math.min(sc.dom, last);
    }
    default: return true;
  }
}

function weekLeft(h, log, today) {
  const sc = scheduleOn(h, today), ws = mondayOf(today);
  let quota = 0, done = 0;
  for (let i = 0; i < 7; i++) {
    const k = shiftKey(ws, i);
    if (!inLife(h, k)) continue;
    quota++;
    if (k <= today && (log[k]?.[h.id] || 0) >= targetOn(h, k)) done++;
  }
  return Math.max(0, Math.min(sc.times, quota) - done);
}

function pendingToday(data, day) {
  const log = data?.log || {}, skip = data?.skip?.[day] || {}, out = [];
  for (const h of data?.habits || []) {
    if (!h || !h.id || h.archived || !inLife(h, day) || skip[h.id]) continue;
    const sc = scheduleOn(h, day), done = log[day]?.[h.id] || 0;
    const due = sc.type === 'perWeek' ? done > 0 || weekLeft(h, log, day) > 0 : schedDue(sc, day);
    if (!due) continue;
    const g = goalOn(h, day), target = targetOn(h, day);
    if (done >= target) continue;
    out.push({ id: h.id, name: h.name, unit: g.unit || '', done, target, private: h.private === true });
  }
  return out;
}

function dueReminders(data, tz, now) {
  const local = localNow(tz, now);
  const pending = new Map(pendingToday(data, local.day).map(p => [p.id, p]));
  const out = [];
  for (const raw of data?.habits || []) {
    const p = pending.get(raw?.id);
    if (!p || !raw.remind) continue;
    const h = { ...raw, target: p.target, step: goalOn(raw, local.day).step, unit: p.unit };
    const done = p.done, target = p.target;
    const due = slotsFor(h, local)
      .filter(s => local.minutes >= s.at && local.minutes - s.at < WINDOW_MIN && done < s.need)
      .sort((x, y) => x.at - y.at);
    if (!due.length) continue;
    const slot = due[due.length - 1];
    out.push({ ...h, target, done, left: target - done, day: local.day, slot, slotKeys: due.map(s => `${h.id}#${s.at}`) });
  }
  return out;
}

function payloadFor(all) {
  const habits = all.filter(h => h.private !== true);
  if (!habits.length) return { title: 'Трекер привычек', body: 'Пора заглянуть в приложение', tag: 'habit-private', ids: [] };
  if (habits.length === 1) {
    const h = habits[0], unit = h.unit ? ' ' + h.unit : '';
    const body = h.slot.kind === 'spread'
      ? `По плану к этому времени — ${h.slot.need} из ${h.target}${unit}, отмечено ${h.done}`
      : h.slot.kind === 'repeat'
        ? `Напоминаю ещё раз: привычка пока не отмечена${h.target > 1 ? ` — осталось ${h.left} из ${h.target}${unit}` : ''}`
        : `Пора выполнить привычку${h.target > 1 ? ` — осталось ${h.left} из ${h.target}${unit}` : ''}`;
    return { title: h.name, body, tag: 'habit-' + h.id, ids: [h.id] };
  }
  return {
    title: `Ждут привычки: ${habits.length}`,
    body: habits.map(h => h.name).join(', '),
    tag: 'habits-' + habits[0].day,
    ids: habits.map(h => h.id),
  };
}

const SMART_TAG = 'habit-smart';
const SMART_KEYS = { evening: 'smart:evening', repeat: 'smart:repeat' };

function smartCfg(v) {
  const t = (x, d) => (HHMM.test(x || '') ? x : d);
  const q = Array.isArray(v?.quiet) ? v.quiet : [];
  return { on: v?.on === true, at: t(v?.at, '21:00'), repeat: [30, 60, 120].includes(v?.repeat) ? v.repeat : 0, quiet: [t(q[0], '23:00'), t(q[1], '08:00')] };
}

function inQuiet(min, quiet) {
  const a = toMin(quiet[0]), b = toMin(quiet[1]);
  if (a == null || b == null || a === b) return false;
  return a < b ? min >= a && min < b : min >= a || min < b;
}

function ruPlural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}

function smartDue(data, tz, now, sent = {}, lastSeen = null) {
  const cfg = smartCfg(data?.smart);
  if (!cfg.on) return null;
  const local = localNow(tz, now);
  if (inQuiet(local.minutes, cfg.quiet)) return null;
  let kind = null;
  if (!sent.evening) {
    const at = toMin(cfg.at);
    if (local.minutes >= at && local.minutes - at < WINDOW_MIN) kind = 'evening';
  } else if (cfg.repeat && !sent.repeat) {
    const at = new Date(sent.evening).getTime();
    const seen = lastSeen ? new Date(lastSeen).getTime() : 0;
    if (now.getTime() >= at + cfg.repeat * 60000 && !(seen > at)) kind = 'repeat';
  }
  if (!kind) return null;
  const list = pendingToday(data, local.day);
  return list.length ? { kind, key: SMART_KEYS[kind], day: local.day, list } : null;
}

function smartPayload(list) {
  const vis = list.filter(h => !h.private);
  const base = { tag: SMART_TAG, smart: true, ids: vis.map(h => h.id) };
  if (!vis.length) return { ...base, title: 'Трекер привычек', body: 'Пора заглянуть в приложение' };
  const n = vis.length;
  const unit = h => (h.unit ? ' ' + h.unit : '');
  const partial = h => h.target > 1 && h.done > 0;
  const title = `${ruPlural(n, 'Осталась', 'Осталось', 'Осталось')} ${n === 1 ? 'одна' : n} ${ruPlural(n, 'привычка', 'привычки', 'привычек')}`;
  if (n === 1) {
    const h = vis[0];
    return { ...base, title, body: partial(h) ? `${h.name}: ${h.done} из ${h.target}${unit(h)}, осталось ${h.target - h.done}` : h.name };
  }
  if (n <= 3) return { ...base, title, body: vis.map(h => (partial(h) ? `${h.name} (${h.done} из ${h.target}${unit(h)})` : h.name)).join(', ') };
  return { ...base, title, body: 'Загляните в приложение' };
}

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

if (typeof Deno !== 'undefined') {
  const env = k => Deno.env.get(k) ?? '';
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'https://f3indlich.github.io/habit-tracker/', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  const db = createClient(env('SUPABASE_URL'), env('SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  Deno.serve(async req => {
    if (!env('CRON_SECRET') || !safeEqual(req.headers.get('x-cron-secret') ?? '', env('CRON_SECRET'))) {
      return new Response('forbidden', { status: 403 });
    }
    const now = new Date();
    const { data: subs, error } = await db.from('push_subscriptions').select('*');
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const byUser = new Map();
    for (const s of subs) (byUser.get(s.user_id) ?? byUser.set(s.user_id, []).get(s.user_id)).push(s);
    const users = [...byUser.keys()];
    const { data: rows, error: e2 } = users.length
      ? await db.from('habit_data').select('user_id, data').in('user_id', users)
      : { data: [], error: null };
    if (e2) return Response.json({ error: e2.message }, { status: 500 });

    const summary = { users: users.length, notified: 0, smart: 0, repeat: 0, sent: 0, removed: 0, failed: 0 };
    for (const row of rows) {
      const list = byUser.get(row.user_id);
      const latestSub = [...list].sort((a, b) => String(b.last_seen).localeCompare(String(a.last_seen)))[0];
      const tz = latestSub.tz || 'UTC';
      let smart = null;
      if (smartCfg(row.data?.smart).on) {
        const day = localNow(tz, now).day;
        const { data: logs } = await db.from('push_log').select('habit_id, sent_at')
          .eq('user_id', row.user_id).eq('day', day).in('habit_id', Object.values(SMART_KEYS));
        const sent = {};
        for (const l of logs || []) sent[l.habit_id === SMART_KEYS.evening ? 'evening' : 'repeat'] = l.sent_at;
        smart = smartDue(row.data, tz, now, sent, latestSub.last_seen);
        if (smart) {
          const { error: dup } = await db.from('push_log').insert({ user_id: row.user_id, habit_id: smart.key, day: smart.day });
          if (dup) smart = null;
        }
      }
      const due = dueReminders(row.data, tz, now);
      const fresh = [];
      for (const h of due) {
        const rows = h.slotKeys.map(k => ({ user_id: row.user_id, habit_id: k, day: h.day }));
        const latest = rows[rows.length - 1];
        const { error: dup } = await db.from('push_log').insert(latest);
        if (rows.length > 1) await db.from('push_log').upsert(rows.slice(0, -1), { onConflict: 'user_id,habit_id,day', ignoreDuplicates: true });
        if (!dup) fresh.push(h);
      }
      if (!fresh.length && !smart) continue;
      summary.notified++;
      if (smart) summary[smart.kind === 'evening' ? 'smart' : 'repeat']++;
      const body = JSON.stringify({ ...(smart ? smartPayload(smart.list) : payloadFor(fresh)), url: './' });
      let delivered = 0, transient = 0;
      for (const s of list) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600, urgency: 'high' });
          summary.sent++; delivered++;
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
            summary.removed++;
          } else {
            summary.failed++; transient++;
            console.error('push failed', err?.statusCode, err?.body || err?.message);
          }
        }
      }
      if (!delivered && transient) {
        for (const h of fresh) await db.from('push_log').delete().eq('user_id', row.user_id).eq('day', h.day).in('habit_id', h.slotKeys);
        if (smart) await db.from('push_log').delete().eq('user_id', row.user_id).eq('day', smart.day).eq('habit_id', smart.key);
      }
    }

    const old = new Date(now.getTime() - 3 * 864e5).toISOString().slice(0, 10);
    await db.from('push_log').delete().lt('day', old);
    return Response.json(summary);
  });
}
