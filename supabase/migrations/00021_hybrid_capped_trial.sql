-- Hybrid Capped Trial: time-bound + hard resource ceiling
-- Adds quota tracking fields and expanded plan/status enums

-- 1. Widen subscription plan enum
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('trial', 'solo', 'growth', 'scale'));

-- 2. Widen subscription status enum
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'active', 'past_due', 'unpaid', 'canceled', 'expired'));

-- 3. Add trial quota columns
ALTER TABLE public.subscriptions
  ADD COLUMN trial_started_at            TIMESTAMPTZ,
  ADD COLUMN trial_sms_allowance         INT NOT NULL DEFAULT 100,
  ADD COLUMN trial_sms_used              INT NOT NULL DEFAULT 0,
  ADD COLUMN trial_ai_cost_allowance_cents INT NOT NULL DEFAULT 500,
  ADD COLUMN trial_ai_cost_used_cents    INT NOT NULL DEFAULT 0,
  ADD COLUMN monthly_booking_limit       INT NOT NULL DEFAULT 50,
  ADD COLUMN monthly_booking_used        INT NOT NULL DEFAULT 0,
  ADD COLUMN overage_cost_per_booking    NUMERIC(6,2) NOT NULL DEFAULT 0.25;

-- 4. Fast index for background quota sweeps
CREATE INDEX idx_subscriptions_status_lookup ON public.subscriptions(user_id, status);

-- 5. Update the auto-create trigger for trial defaults
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, trial_started_at, trial_sms_allowance, trial_ai_cost_allowance_cents, monthly_booking_limit)
  VALUES (new.id, 'trial', 'trial', now() + interval '14 days', now(), 100, 500, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_subscription
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 6. Migrate existing free subs to trial with preserved trial_ends_at
UPDATE public.subscriptions
SET
  plan = 'trial',
  status = 'trial',
  trial_started_at = created_at,
  trial_sms_allowance = 100,
  trial_ai_cost_allowance_cents = 500,
  monthly_booking_limit = 50
WHERE plan = 'free';

-- 7. Exempt pre-existing users (trial_ends_at = 2124) from time-based expiry
UPDATE public.subscriptions
SET trial_ends_at = '2124-01-01'::timestamptz
WHERE trial_ends_at IS NULL AND plan = 'trial';

-- 8. RPC to increment usage counters atomically
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_resource TEXT, p_amount INT DEFAULT 1)
RETURNS void AS $$
BEGIN
  IF p_resource = 'sms' THEN
    UPDATE public.subscriptions SET trial_sms_used = trial_sms_used + p_amount WHERE user_id = p_user_id;
  ELSIF p_resource = 'ai_cost' THEN
    UPDATE public.subscriptions SET trial_ai_cost_used_cents = trial_ai_cost_used_cents + p_amount WHERE user_id = p_user_id;
  ELSIF p_resource = 'booking' THEN
    UPDATE public.subscriptions SET monthly_booking_used = monthly_booking_used + p_amount WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
