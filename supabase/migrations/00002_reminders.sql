-- Reminder tracking
CREATE TABLE public.reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'confirmed', 'cancelled', 'no_response')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_reminders_appointment ON public.reminders(appointment_id);
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_sent ON public.reminders(user_id, sent_at);

-- Reminder settings per business
CREATE TABLE public.reminder_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  enabled         BOOLEAN DEFAULT true,
  template        TEXT NOT NULL DEFAULT 'Hi {customer_name}, this is a reminder for your {service} appointment tomorrow at {start_time}. Reply CONFIRM or CANCEL.',
  remind_at_hours INTEGER DEFAULT 24,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminder_settings"
  ON public.reminder_settings FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create reminder_settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_reminder_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.reminder_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_reminder_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_reminder_settings();
