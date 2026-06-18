# Appointment Reminders — Feature Spec

## Goal
Auto-send SMS appointment reminders 24h before the appointment, with text-to-confirm/cancel. Businesses configure the message template.

## Architecture
- **Vercel Cron Job**: `GET /api/cron/reminders` runs every 5 minutes
- Queries appointments starting in ~24h with no reminder sent
- Sends Twilio SMS with templated message
- Patient replies "confirm" or "cancel" → existing Twilio webhook catches it
- Status tracked in new `reminders` table

## Data Model

### `reminders` table
```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  sent_at timestamptz default timezone('utc'::text, now()) not null,
  status text not null default 'sent' check (status in ('sent', 'confirmed', 'cancelled', 'no_response')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);
```

### `reminder_settings` table
```sql
create table public.reminder_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique not null,
  enabled boolean default true not null,
  template text not null default 'Hi {customer_name}, this is a reminder for your {service} appointment tomorrow at {start_time}. Reply CONFIRM or CANCEL.',
  remind_at_hours integer default 24 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.reminder_settings enable row level security;
create policy "Users can manage their own reminder settings"
  on public.reminder_settings for all using (auth.uid() = user_id);
```

### Indexes
```sql
create index idx_reminders_appointment on public.reminders(appointment_id);
create index idx_reminders_status on public.reminders(status);
```

## Endpoints

### `GET /api/cron/reminders`
- No auth (Vercel Cron internal, protected by `CRON_SECRET` header)
- Query: select appointments where `start_time` is between 23h55m and 24h from now, `status = 'booked'`, and no `reminders` record exists with `sent_at` within the last 23h for that appointment
- For each match: look up `reminder_settings`, render template, send SMS, create `reminders` record
- Returns `{ sent: number }`

### Twilio webhook update (existing `POST /api/webhooks/twilio`)
- After storing incoming message, check if body contains "confirm" or "cancel" (case-insensitive, trimmed, match word boundaries for punctuation)
- If confirm: find latest pending reminder for that phone number, update `reminders.status = 'confirmed'` (appointment stays booked)
- If cancel: update `reminders.status = 'cancelled'`, update `appointments.status = 'cancelled'`, send confirmation SMS back: *"Your appointment has been cancelled. Let us know if you'd like to reschedule!"*

## Template Variables
- `{customer_name}` — from `appointments.customer_name`
- `{service}` — from `services.name` (JOIN)
- `{start_time}` — formatted as "Tue, Jun 18 at 2:00 PM"
- `{business_name}` — from `users.company_name`

## UI: Reminder Settings Page
- New route: `/(dashboard)/settings/reminders/page.tsx`
- Sidebar link: Settings → Reminders
- Toggle: Enable/disable reminders
- Textarea: Message template with variable buttons that insert `{customer_name}`, `{service}`, etc. at cursor
- Preview panel showing rendered template with sample data
- Save button

## Sidebar Update
- Add "Reminders" nav link under existing nav items

## Files
- `supabase/migrations/00002_reminders.sql` — new tables + indexes + RLS
- `apps/web/src/app/api/cron/reminders/route.ts` — cron job handler
- `apps/web/src/app/(dashboard)/settings/reminders/page.tsx` — settings page
- `apps/web/src/components/dashboard/sidebar.tsx` — add Reminders link
- `apps/web/src/app/api/webhooks/twilio/route.ts` — add confirm/cancel parsing

## Security
- Cron endpoint protected by `CRON_SECRET` env var (checked via request header)
- RLS on both new tables
- Twilio validation already on SMS webhook

## Future (not building now)
- Multiple reminder windows (24h + 1h)
- Email reminders
- Calendar attachment (.ics)
- Reminder history dashboard
