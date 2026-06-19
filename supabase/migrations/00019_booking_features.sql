-- Service sequencing + AI blacklist + waitlist + customer profiles + recall tracking

-- ===== Services: sequence ordering + AI action toggles =====
ALTER TABLE public.services ADD COLUMN sequence_order INT DEFAULT 0;
ALTER TABLE public.services ADD COLUMN allow_ai_booking BOOLEAN DEFAULT true;
ALTER TABLE public.services ADD COLUMN allow_ai_reschedule BOOLEAN DEFAULT true;
ALTER TABLE public.services ADD COLUMN allow_ai_cancel BOOLEAN DEFAULT true;

-- ===== Customer profiles (per-phone-number tracking for no-show dunning) =====
CREATE TABLE public.customer_profiles (
  phone                   TEXT NOT NULL,
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                    TEXT,
  total_cancellations     INT NOT NULL DEFAULT 0,
  late_cancellations      INT NOT NULL DEFAULT 0,
  last_appointment_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (phone, user_id)
);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer_profiles"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own customer_profiles"
  ON public.customer_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_customer_profiles_user ON public.customer_profiles(user_id);

-- ===== Waitlist =====
CREATE TABLE public.waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
  preferred_day   TEXT,      -- e.g. "monday", "tuesday"
  preferred_time  TEXT,      -- e.g. "morning", "afternoon", "evening"
  notes           TEXT,
  sent_offers     INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'booked', 'expired')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist"
  ON public.waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own waitlist"
  ON public.waitlist FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_waitlist_user_status ON public.waitlist(user_id, status);
CREATE INDEX idx_waitlist_service ON public.waitlist(service_id);

-- ===== Recall tracking (automated rebooking cycles) =====
CREATE TABLE public.recall_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
  interval_days   INT NOT NULL,   -- e.g. 42 for 6-week hair color
  message_template TEXT NOT NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.recall_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recall_schedules"
  ON public.recall_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recall_schedules"
  ON public.recall_schedules FOR ALL
  USING (auth.uid() = user_id);

-- Track when each customer was last notified for recall
CREATE TABLE public.recall_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_phone  TEXT NOT NULL,
  service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
  recall_schedule_id UUID REFERENCES public.recall_schedules(id) ON DELETE CASCADE,
  notified_at     TIMESTAMPTZ DEFAULT now(),
  responded       BOOLEAN DEFAULT false,
  UNIQUE (customer_phone, recall_schedule_id)
);
ALTER TABLE public.recall_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recall_notifications"
  ON public.recall_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recall_notifications"
  ON public.recall_notifications FOR ALL
  USING (auth.uid() = user_id);

-- ===== Appointment: add cancellation tracking =====
ALTER TABLE public.appointments ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN cancellation_type TEXT CHECK (cancellation_type IN ('normal', 'late', 'no_show'));

-- ===== Upsell offers (for smart upselling at checkout) =====
CREATE TABLE public.upsell_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  upsell_service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  upsell_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  upsell_label    TEXT,           -- e.g. "Add a 15-min eye lift"
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.upsell_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upsell_offers"
  ON public.upsell_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own upsell_offers"
  ON public.upsell_offers FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_upsell_offers_service ON public.upsell_offers(service_id);
