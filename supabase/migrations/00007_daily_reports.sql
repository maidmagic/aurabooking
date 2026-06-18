CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily_reports"
  ON public.daily_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_reports_user_date ON public.daily_reports(user_id, report_date DESC);
