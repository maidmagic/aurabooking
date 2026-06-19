CREATE TABLE IF NOT EXISTS public.review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT false,
  business_name TEXT DEFAULT '',
  google_review_url TEXT DEFAULT '',
  feedback_gate_enabled BOOLEAN DEFAULT true,
  initial_delay_minutes INTEGER DEFAULT 120,
  follow_up_delay_minutes INTEGER DEFAULT 1440,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own review settings"
  ON public.review_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'opted_out', 'completed')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  sent_at TIMESTAMPTZ,
  followed_up_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own review requests"
  ON public.review_requests FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_review_requests_appointment ON public.review_requests(appointment_id);
CREATE INDEX idx_review_requests_user_status ON public.review_requests(user_id, status);

-- Auto-create review_settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_review_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.review_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_review_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_review_settings();
