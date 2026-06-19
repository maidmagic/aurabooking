-- Compliance pages for Twilio A2P 10DLC registration
-- Each client gets a hosted Privacy Policy and Terms of Service page

CREATE TABLE public.legal_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own legal_pages"
  ON public.legal_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own legal_pages"
  ON public.legal_pages FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_legal_pages_slug ON public.legal_pages(slug);
CREATE INDEX idx_legal_pages_user ON public.legal_pages(user_id);
