-- CTIA compliance: opt-out tracking, quiet hours, warm-up ramp
-- Extends ai_settings, adds opt_outs + warmup_state tables

-- Opt-out registry (permanent block per phone number)
CREATE TABLE public.opt_outs (
  phone         TEXT PRIMARY KEY,
  opted_out_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.opt_outs ENABLE ROW LEVEL SECURITY;

-- Only the system (service_role) reads this, but allow users to view their own opt-outs
CREATE POLICY "Users can view own opt-outs"
  ON public.opt_outs FOR SELECT
  USING (true);

-- Warm-up ramp per user (progressive daily limits for new businesses)
CREATE TABLE public.warmup_state (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  current_day         INTEGER DEFAULT 1,
  messages_sent_today INTEGER DEFAULT 0,
  last_message_date   DATE DEFAULT CURRENT_DATE,
  max_daily_limit     INTEGER DEFAULT 100,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.warmup_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own warmup_state"
  ON public.warmup_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own warmup_state"
  ON public.warmup_state FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create warmup_state on user signup (appended to existing trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_warmup()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.warmup_state (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_warmup
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_warmup();

-- Quiet hours on ai_settings
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end   TEXT DEFAULT '08:00';

-- Conversation flag for first-interaction HELP/STOP footer
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS opt_out_footer_sent BOOLEAN DEFAULT false;

-- Track missed-call followups (persistence ladder)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS missed_call_followup_15min BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS missed_call_followup_24h   BOOLEAN DEFAULT false;

-- RPC to atomically increment warmup counter
CREATE OR REPLACE FUNCTION public.increment_warmup_counter(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.warmup_state
  SET messages_sent_today = messages_sent_today + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
