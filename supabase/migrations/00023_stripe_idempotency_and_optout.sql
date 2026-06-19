-- Stripe idempotency table (dedicated, matches Stripe event ID naming)
CREATE TABLE IF NOT EXISTS public.stripe_idempotency (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stripe_idempotency ENABLE ROW LEVEL SECURITY;
-- No public access — service-role only

-- Add is_subscribed flag to customer_profiles for CTIA compliance
ALTER TABLE public.customer_profiles ADD COLUMN is_subscribed BOOLEAN DEFAULT true;

-- Index for outbound cron queries filtering on subscribed customers
CREATE INDEX IF NOT EXISTS idx_customer_profiles_subscribed
  ON public.customer_profiles (user_id, is_subscribed)
  WHERE is_subscribed = true;
