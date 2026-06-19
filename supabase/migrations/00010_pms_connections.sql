CREATE TABLE IF NOT EXISTS public.pms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('opendental', 'eaglesoft', 'dentrix', 'other')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pms connections"
  ON public.pms_connections FOR ALL
  USING (auth.uid() = user_id);
