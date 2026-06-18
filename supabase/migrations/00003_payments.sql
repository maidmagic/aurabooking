-- Text to Pay
CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount                INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);

ALTER TABLE public.appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded'));
