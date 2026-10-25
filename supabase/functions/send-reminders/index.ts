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

function dueReminders(data, tz, now) {
  const local = localNow(tz, now);
  const log = data?.log?.[local.day] || {};
  const skip = data?.skip?.[local.day] || {};
  return (data?.habits || []).filter(h => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(h?.remind || '');
    if (!m || h.archived || !h.id) return false;
    if (h.created && h.created > local.day) return false;
    if (Array.isArray(h.days) && h.days.length && !h.days.includes(local.weekday)) return false;
    if (skip[h.id]) return false;
    if ((log[h.id] || 0) >= Math.max(1, h.target || 1)) return false;
    const at = +m[1] * 60 + +m[2];
    return local.minutes >= at && local.minutes - at < WINDOW_MIN;
  }).map(h => ({ ...h, left: Math.max(1, h.target || 1) - (log[h.id] || 0), day: local.day }));
}

function payloadFor(habits) {
  if (habits.length === 1) {
    const h = habits[0];
    const rest = h.target > 1 ? ` — осталось ${h.left} из ${h.target}${h.unit ? ' ' + h.unit : ''}` : '';
    return { title: h.name, body: `Пора выполнить привычку${rest}`, tag: 'habit-' + h.id, ids: [h.id] };
  }
  return {
    title: `Ждут привычки: ${habits.length}`,
    body: habits.map(h => h.name).join(', '),
    tag: 'habits-' + habits[0].day,
    ids: habits.map(h => h.id),
  };
}

if (typeof Deno !== 'undefined') {
  const env = k => Deno.env.get(k) ?? '';
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'https://f3indlich.github.io/habit-tracker/', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  const db = createClient(env('SUPABASE_URL'), env('SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  Deno.serve(async req => {
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) {
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

    const summary = { users: users.length, notified: 0, sent: 0, removed: 0, failed: 0 };
    for (const row of rows) {
      const list = byUser.get(row.user_id);
      const tz = [...list].sort((a, b) => String(b.last_seen).localeCompare(String(a.last_seen)))[0].tz || 'UTC';
      const due = dueReminders(row.data, tz, now);
      const fresh = [];
      for (const h of due) {
        const { error: dup } = await db.from('push_log').insert({ user_id: row.user_id, habit_id: h.id, day: h.day });
        if (!dup) fresh.push(h);
      }
      if (!fresh.length) continue;
      summary.notified++;
      const body = JSON.stringify({ ...payloadFor(fresh), url: './' });
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
        for (const h of fresh) await db.from('push_log').delete().match({ user_id: row.user_id, habit_id: h.id, day: h.day });
      }
    }

    const old = new Date(now.getTime() - 3 * 864e5).toISOString().slice(0, 10);
    await db.from('push_log').delete().lt('day', old);
    return Response.json(summary);
  });
}
