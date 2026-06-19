-- Stripe idempotency + tenant lock for production hardening

-- Idempotent events table for Stripe webhook deduplication
-- Primary key IS the Stripe event id — unique constraint is the atomic guard
CREATE TABLE public.idempotent_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.idempotent_events ENABLE ROW LEVEL SECURITY;

-- Service role only; no public access needed
CREATE POLICY "Service role only — idempotent_events"
  ON public.idempotent_events
  USING (false);

-- Add is_active flag to users for subscription gating
ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add stripe_customer_id to subscriptions for portal access
ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id TEXT;

-- SMS delivery logs for Twilio status tracking
CREATE TABLE public.sms_delivery_logs (
  message_sid TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES public.users(id),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own delivery logs"
  ON public.sms_delivery_logs FOR SELECT
  USING (auth.uid() = tenant_id);
