CREATE TABLE IF NOT EXISTS public.outgoing_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_type, target_url)
);

ALTER TABLE public.outgoing_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own outgoing webhooks"
  ON public.outgoing_webhooks FOR ALL
  USING (auth.uid() = user_id);
