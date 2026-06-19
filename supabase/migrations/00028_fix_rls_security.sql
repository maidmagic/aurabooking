-- Fix critical RLS security vulnerabilities found during security audit

-- 1. feedback_logs: was USING (true) WITH CHECK (true) — any user could read/write all feedback
DROP POLICY IF EXISTS "Service role has full access to feedback_logs" ON public.feedback_logs;
CREATE POLICY "Service role full access to feedback_logs"
  ON public.feedback_logs AS permissive FOR ALL
  USING (auth.role() = 'service_role');

-- 2. data_deletion_requests: was USING (true) WITH CHECK (true) — GDPR data exposed
DROP POLICY IF EXISTS "Service role has full access to data_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "Service role full access to data_deletion_requests"
  ON public.data_deletion_requests AS permissive FOR ALL
  USING (auth.role() = 'service_role');

-- 3. is_admin: was USING (true) WITH CHECK (true) — any user could self-grant admin
DROP POLICY IF EXISTS "Only service role can set is_admin" ON public.users;
CREATE POLICY "Only service role can set is_admin"
  ON public.users FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. subscriptions: was FOR ALL — users could self-modify plan/status/trial fields
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscriptions;
-- Keep SELECT only — billing mutations go through Stripe webhooks (service role)
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 5. payments: was FOR ALL — users could delete payment records
DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);
-- Allow INSERT for checkout sessions (called from API routes with service role)
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- 6. audit_logs: was WITH CHECK (true) — any user could spam audit logs
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 7. opt_outs: was USING (true) — all users could see all opt-outs across tenants
DROP POLICY IF EXISTS "Users can view own opt-outs" ON public.opt_outs;
CREATE POLICY "Users can view own opt-outs"
  ON public.opt_outs FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.integrations WHERE twilio_phone = opt_outs.phone
  ));

-- 8/9. suggestions/suggestion_upvotes: stale plan check ('free' no longer exists after migration 00021)
DROP POLICY IF EXISTS "Paid users can create suggestions" ON public.suggestions;
CREATE POLICY "Paid users can create suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid()
        AND plan IN ('solo', 'growth', 'scale')
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Paid users can upvote" ON public.suggestion_upvotes;
CREATE POLICY "Paid users can upvote"
  ON public.suggestion_upvotes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid()
        AND plan IN ('solo', 'growth', 'scale')
        AND status = 'active'
    )
  );
