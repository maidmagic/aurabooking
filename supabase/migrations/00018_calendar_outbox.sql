-- Calendar outbox: reliable Google Calendar sync via transactional outbox pattern
-- Prevents dual-write failures where DB commits but Calendar API call fails

CREATE TABLE public.calendar_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('create', 'update', 'delete')),
  summary         TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  last_error      TEXT,
  google_event_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.calendar_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar_outbox"
  ON public.calendar_outbox FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar_outbox"
  ON public.calendar_outbox FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_calendar_outbox_status ON public.calendar_outbox(status, created_at);
CREATE INDEX idx_calendar_outbox_user ON public.calendar_outbox(user_id);
