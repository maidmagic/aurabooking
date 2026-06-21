-- Multi-window reminders (24h + 1h) with Y/N confirmation
ALTER TABLE public.reminder_settings
  ADD COLUMN IF NOT EXISTS windows JSONB DEFAULT '[24, 1]'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_1h_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT '24h' CHECK (reminder_type IN ('24h', '1h'));

-- Index for looking up pending reminders by phone for Y/N reply handling
CREATE INDEX IF NOT EXISTS idx_reminders_pending_reply
  ON public.reminders (user_id, appointment_id, status)
  WHERE status = 'sent';
