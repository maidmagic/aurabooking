-- Trial tracking for free-to-paid conversion
ALTER TABLE public.subscriptions ADD COLUMN trial_ends_at TIMESTAMPTZ;

-- Auto-create subscription row on user signup with 14-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (new.id, 'free', 'active', now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_subscription
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Exempt pre-existing users from trial expiry
UPDATE public.subscriptions
SET trial_ends_at = '2124-01-01'::timestamptz
WHERE trial_ends_at IS NULL AND plan = 'free';
