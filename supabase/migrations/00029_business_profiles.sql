-- Business profile columns for LLM context
-- Each business can store info the AI receptionist uses to answer accurately

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS ai_greeting TEXT,
  ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;

-- RLS: users can read/update their own business profile
CREATE POLICY "users_can_read_own_business_profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_can_update_own_business_profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- service_role can manage all (super admin)
CREATE POLICY "service_role_manage_business_profiles"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
