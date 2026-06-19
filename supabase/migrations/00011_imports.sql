CREATE TABLE IF NOT EXISTS public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own imports"
  ON public.imports FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE public.appointments ADD COLUMN pms_appointment_id TEXT;
ALTER TABLE public.appointments ADD COLUMN import_id UUID REFERENCES public.imports(id);
