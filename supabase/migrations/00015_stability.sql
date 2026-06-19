-- Dead letter queue for failed background jobs
CREATE TABLE public.failed_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_type      TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  error         TEXT NOT NULL DEFAULT '',
  retry_count   INTEGER NOT NULL DEFAULT 0,
  max_retries   INTEGER NOT NULL DEFAULT 3,
  last_error_at TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.failed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own failed jobs"
  ON public.failed_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own failed jobs"
  ON public.failed_jobs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_failed_jobs_user ON public.failed_jobs(user_id);
CREATE INDEX idx_failed_jobs_type ON public.failed_jobs(job_type);

-- Audit log for security-critical actions
CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  metadata      JSONB DEFAULT '{}',
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- Idempotency keys for booking creation (admin client bypasses RLS)
ALTER TABLE public.appointments ADD COLUMN idempotency_key TEXT UNIQUE;
