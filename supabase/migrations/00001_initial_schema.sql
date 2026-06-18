-- AuraBooking initial schema
-- Extends Supabase Auth with multi-tenant tables for AI appointment booking

-- Users extension table (extends Supabase Auth)
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  company_name TEXT,
  phone       TEXT,
  industry    TEXT CHECK (industry IN ('dental', 'beauty_wellness', 'medical', 'auto', 'other')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Integrations table (OAuth tokens + Twilio numbers)
CREATE TABLE public.integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google_calendar', 'twilio')),
  access_token  TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  twilio_phone  TEXT,
  calendar_channel_id TEXT,
  calendar_channel_expiry TIMESTAMPTZ,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own integrations"
  ON public.integrations FOR ALL
  USING (auth.uid() = user_id);

-- AI Settings per user
CREATE TABLE public.ai_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  business_hours    JSONB NOT NULL DEFAULT '{}',
  booking_rules     JSONB DEFAULT '{"min_notice_minutes": 60, "max_bookings_per_day": 3, "buffer_minutes": 15}',
  ai_persona        TEXT DEFAULT '',
  timezone          TEXT DEFAULT 'America/New_York',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_settings"
  ON public.ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai_settings"
  ON public.ai_settings FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create ai_settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.ai_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Services offered by the business
CREATE TABLE public.services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  duration    INTEGER NOT NULL,
  price       DECIMAL(10,2),
  description TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
  ON public.services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own services"
  ON public.services FOR ALL
  USING (auth.uid() = user_id);

-- Conversations / leads
CREATE TABLE public.conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('sms', 'web_chat', 'messenger', 'outreach')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'qualifying', 'booked', 'failed', 'archived')),
  ai_active     BOOLEAN DEFAULT true,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- Individual messages within conversations
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('customer', 'ai', 'human_agent', 'system')),
  content         TEXT NOT NULL,
  msg_type        TEXT DEFAULT 'text' CHECK (msg_type IN ('text', 'booking_confirmed', 'booking_request', 'reminder', 'system')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Booked appointments
CREATE TABLE public.appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id),
  service_id      UUID REFERENCES public.services(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  customer_email  TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled', 'completed')),
  google_event_id TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own appointments"
  ON public.appointments FOR ALL
  USING (auth.uid() = user_id);

-- Temporary slot holds for concurrency prevention
CREATE TABLE public.slot_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  conversation_id UUID REFERENCES public.conversations(id),
  released        BOOLEAN DEFAULT false
);
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own slot_holds"
  ON public.slot_holds FOR ALL
  USING (auth.uid() = user_id);

-- Rate limiting for spam prevention
CREATE TABLE public.rate_limits (
  phone       TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES public.users(id),
  msg_count   INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (phone, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Outreach campaigns
CREATE TABLE public.campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT CHECK (type IN ('reminder', 'promotion', 'follow_up')),
  message_template TEXT NOT NULL,
  audience        JSONB DEFAULT '{}',
  schedule        TIMESTAMPTZ,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own campaigns"
  ON public.campaigns FOR ALL
  USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_conversations_user_channel ON public.conversations(user_id, channel);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_appointments_user_time ON public.appointments(user_id, start_time);
CREATE INDEX idx_appointments_google_event ON public.appointments(google_event_id);
CREATE INDEX idx_integrations_user ON public.integrations(user_id);
CREATE INDEX idx_slot_holds_expires ON public.slot_holds(expires_at);
CREATE INDEX idx_slot_holds_user_time ON public.slot_holds(user_id, start_time, end_time);
