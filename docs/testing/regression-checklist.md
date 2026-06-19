# AuraBooking Regression Testing Checklist

Run this full sequence before any production deployment or after any significant code change.

---

## 1. Sign-Up & Onboarding

- [ ] **Fresh user sign-up**: Register at `/auth/register` with a real email. Verify redirect to onboarding.
- [ ] **Confirmation email**: Check inbox for Supabase Auth confirmation link. Click it.
- [ ] **Trial creation**: Verify `subscriptions` table gets a row with `plan='trial'`, `status='trial'`, `trial_sms_allowance=100`, `trial_ai_cost_allowance_cents=500`.
- [ ] **Stripe checkout**: Navigate to `/settings/billing`, click a plan, complete Stripe Checkout with a real test card.
- [ ] **Webhook receipt**: Verify `checkout.session.completed` webhook fires. Check `stripe_idempotency` table for the event id.
- [ ] **Trial → Active conversion**: After checkout, verify `subscriptions.status` changed to `active` and `plan` matches selected tier.

## 2. Payment Lifecycle

- [ ] **Successful payment**: Use card `4242 4242 4242 4242`, any future date, any CVC. Confirm subscription activates.
- [ ] **Past due handling**: Use card `4000 0000 0000 3220` (declines but retryable). Verify `customer.subscription.updated` webhook fires, `status` becomes `past_due`.
- [ ] **Suspension**: After past_due, verify AI calls and non-OTP SMS are blocked by tenant gate. Verify Redis suspension cache key is set.
- [ ] **Recovery**: Update card to `4242 4242 4242 4242` via Stripe Customer Portal. Verify webhook fires `status=active` again and suspension clears.
- [ ] **Unpaid → Canceled**: Let invoice remain unpaid for Stripe's retry period. Verify `customer.subscription.deleted` webhook fires, `is_active` set to false.

## 3. SMS Flow (10DLC Compliance)

- [ ] **Send SMS**: Trigger a reminder or campaign SMS. Verify `sms_delivery_logs` row created with `status='sent'` or `status='queued'`.
- [ ] **STOP command**: Text "STOP" from a test number. Verify `customer_profiles.is_subscribed` flips to `false`. Verify no further messages sent to that number.
- [ ] **UNSTOP command**: Text "UNSTOP". Verify `is_subscribed` flips back to `true`.
- [ ] **Opt-out bypass check**: Verify tenant gate blocks non-OTP SMS to opted-out numbers.
- [ ] **Status callback**: Check Twilio status callback webhook fires. Verify `sms_delivery_logs` row updated with `delivery_status`.
- [ ] **Overage enforcement**: For a trial account, send enough SMS to exceed `trial_sms_allowance`. Verify tenant gate blocks further sends.

## 4. AI Pipeline

- [ ] **AI response**: Send an inbound SMS. Verify AI generates a response via OpenRouter. Check `messages` table for both inbound and outbound messages.
- [ ] **Cost ceiling**: For a trial account, let AI cost exceed `trial_ai_cost_allowance_cents`. Verify tenant gate blocks further AI calls.
- [ ] **Fallback**: Temporarily misconfigure `OPENROUTER_API_KEY`. Verify AI gracefully falls back to "Transfer to human" message.
- [ ] **Human handoff**: In Inbox, click "Pause AI & Take Over". Verify `conversations.ai_active` toggles to `false`. Send another SMS and verify AI does NOT respond.

## 5. Booking & Calendar

- [ ] **Create booking**: Through widget, complete a booking. Verify Google Calendar event created. Verify slot_hold released.
- [ ] **Double-click test**: Rapidly click "Book" button multiple times. Verify only one appointment created (idempotency guard).
- [ ] **Hold release**: Start booking, do not complete. Verify slot_hold in `slot_holds` table released after 5 minutes.
- [ ] **Conflict handling**: Book a slot that overlaps with existing appointment. Verify AI offers next 3 available slots.

## 6. Admin Dashboard

- [ ] **Customer search**: Navigate to `/admin/customers`. Search by phone number (with and without formatting). Verify results appear.
- [ ] **Conversation viewer**: Click a customer card. Verify message history loads with correct inbound/outbound direction.
- [ ] **Analytics cards**: Navigate to `/admin`. Verify all 5 funnel cards show correct counts.

## 7. Cron Jobs

- [ ] **Reminders**: Check `/api/cron/reminders` logs. Verify SMS are sent in batches of 25 via `chunkedMap`.
- [ ] **Calendar sync**: Check `/api/cron/calendar-sync` logs. Verify Redis distributed lock acquired and released.
- [ ] **Daily summary**: Verify summary SMS sent to active tenants.
- [ ] **All crons**: Verify every cron route has `maxDuration=60` and `runtime=nodejs`.

## 8. Error & Edge Cases

- [ ] **Expired trial**: Manually set `subscriptions.trial_ends_at` to yesterday. Verify tenant gate blocks all non-OTP usage.
- [ ] **No subscription**: Delete a user's subscription row. Verify tenant gate returns `subscription_missing`.
- [ ] **Webhook idempotency**: Send the same Stripe event id twice. Verify second attempt is silently ignored (23505 PK guard).
- [ ] **Redis unavailable**: Stop Redis. Verify tenant gate falls through to database lookup (no crash).
- [ ] **Missing env var**: Remove `NEXT_PUBLIC_SUPABASE_URL`. Verify build fails with clear error (NOT silently).

## 9. Legal Pages

- [ ] **Privacy Policy**: Navigate to `/privacy`. Verify header/footer match landing page style. Verify all sections render.
- [ ] **Terms of Service**: Navigate to `/terms`. Verify acceptable use policy includes spam/10DLC clause.
- [ ] **GDPR form**: Navigate to `/gdpr`. Submit a data deletion request. Verify row created in `data_deletion_requests` table.
- [ ] **Footer links**: Scroll to landing page footer. Click Privacy → `/privacy`, Terms → `/terms`, GDPR/CCPA → `/gdpr`.

## 10. Feedback

- [ ] **Feedback dialog**: In dashboard, click the bug icon in topbar. Verify dialog opens.
- [ ] **Submit feedback**: Fill out the form and submit. Verify row created in `feedback_logs` table.
- [ ] **Validation**: Try submitting with empty email or description. Verify client-side validation blocks it.

---

## Environment Verification

- [ ] **Stripe keys** are pointing to **Live mode** (not Test).
- [ ] `DATABASE_URL` uses **port 6543** (Supavisor), not 5432.
- [ ] `STRIPE_WEBHOOK_SECRET` is the **Live** signing secret (not the CLI test secret).
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain.
- [ ] `RESEND_API_KEY` is set (for feedback/GDPR email notifications).
- [ ] `FEEDBACK_EMAIL_TO` and `GDPR_EMAIL_TO` are set to the monitoring inbox.
- [ ] Supabase automated backups are enabled in project settings.
- [ ] Uptime monitor (e.g. UptimeRobot) is pinging `/api/health` every 5 minutes.
- [ ] All 4 new migrations (00020–00024) have been applied.
