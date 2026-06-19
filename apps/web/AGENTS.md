<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:deployment-rules -->
# Vercel Deployment Configuration

## Supabase Connection Pooling
**CRITICAL:** In Vercel environment variables, `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must use the **Supavisor transaction pooler** endpoint, NOT the direct database URL.

- Use port **6543** (transaction mode), NOT port 5432
- Format: `https://<project-ref>.supabase.co` (same URL — the pooler port is configured in Supabase dashboard > Database > Connection pooling)
- Why: Vercel spins up one serverless container per concurrent request. Without connection pooling, 100+ simultaneous containers during SMS marketing bursts will exhaust Postgres connection limits and drop the database.

## Runtime Settings
- No route should use `export const runtime = 'edge'` — Webhook routes (Stripe, Twilio) require Node.js crypto/Buffer modules. All webhook routes explicitly export `runtime = 'nodejs'`.
- All 11 cron routes have `export const maxDuration = 60` — prevents Vercel from killing long-running batch SMS crons mid-execution.

## Webhook Signature Sanity (Stripe)
**CRITICAL:** Stripe sends a different `STRIPE_WEBHOOK_SECRET` for Test mode vs Live mode.
- In the Stripe Dashboard, toggle to **Live Mode** → Developers → Webhooks → find your endpoint → copy the **Live** signing secret
- Set `STRIPE_WEBHOOK_SECRET` in Vercel env vars to the Live secret (not your local CLI test secret)
- If wrong, `constructEvent()` silently rejects every payment — zero error visibility until you check Vercel logs

## Cron Fan-Out Safety
- Crons that send bulk SMS (`reminders`, `daily-summary`) use `chunkedMap()` from `lib/batch.ts` — batches of 25 concurrent sends via `Promise.allSettled`
- Every cron has `maxDuration = 60` to prevent mid-execution kills that would leave Redis locks dangling
- All crons authenticate via `Authorization: Bearer ${CRON_SECRET}` (cryptographic, not session-based)

## Feedback & GDPR Email
- `RESEND_API_KEY` — required if you want feedback submissions and GDPR requests to be emailed.
- `FEEDBACK_EMAIL_TO` — inbox where bug reports/feature requests land.
- `GDPR_EMAIL_TO` — inbox where data deletion/subject access requests land.
- `FEEDBACK_EMAIL_FROM` — sender address for feedback notifications (default: feedback@aurabooking.com).
- `GDPR_EMAIL_FROM` — sender address for GDPR notifications (default: gdpr@aurabooking.com).
- If `RESEND_API_KEY` is not set, submissions are still stored in `feedback_logs` and `data_deletion_requests` tables — you just won't get email notifications.
<!-- END:deployment-rules -->

<!-- BEGIN:day-1-verification -->
# Day 1 Verification Checklist

## Environment Integrity
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are **Live mode** (not Test).
- [ ] `DATABASE_URL` uses **port 6543** (Supavisor transaction pooler), not 5432.
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain exactly.
- [ ] `RESEND_API_KEY` is set if email notifications for feedback/GDPR are desired.
- [ ] `FEEDBACK_EMAIL_TO` and `GDPR_EMAIL_TO` are set to your monitoring inbox.
- [ ] `CRON_SECRET` is a strong random string matching the `Authorization` header in vercel.json cron configs.

## Infrastructure
- [ ] **Uptime monitor** configured: ping `https://<your-domain>/api/health` every 5 minutes (UptimeRobot, Better Stack, or similar).
- [ ] **Supabase automated backups** enabled: Project Settings → Database → Backups → Enable automated backups.
- [ ] **Supabase connection pooling** configured: In Dashboard → Database → Connection pooling, ensure port 6543 (transaction mode) is enabled.

## Legal & Compliance
- [ ] Privacy Policy at `/privacy` — verify it accurately describes your data collection and third-party sharing (Twilio, OpenRouter, Stripe).
- [ ] Terms of Service at `/terms` — verify the Acceptable Use Policy includes the spam/10DLC termination clause.
- [ ] GDPR/CCPA form at `/gdpr` — verify submissions create rows in `data_deletion_requests` table.
- [ ] Landing page footer links to all three legal pages.

## Migrations Applied
- [ ] `00020_idempotency_and_tenant_lock.sql`
- [ ] `00021_hybrid_capped_trial.sql`
- [ ] `00022_customer_search_indexes.sql`
- [ ] `00023_stripe_idempotency_and_optout.sql`
- [ ] `00024_legal_and_feedback.sql`
- [ ] `00025_admin_users.sql`

## Admin Setup (user_metadata.role)
Admin access uses `raw_user_meta_data->>'role' = 'super_admin'` — the role travels with the JWT, no extra DB query needed.

1. Register via `/auth/register` with the email you want as admin.
2. Grant admin access via the setup API:
   ```bash
   curl -X POST https://aurabooking.vercel.app/api/admin/setup \
     -H "Content-Type: application/json" \
     -H "x-admin-secret: <CRON_SECRET>" \
     -d '{"email": "your-admin@example.com"}'
   ```
   This calls `supabase.auth.admin.updateUserById()` to set `user_metadata: { role: "super_admin" }`.
3. Log in at `/admin/login` — after Supabase auth, the page checks `user.user_metadata.role === "super_admin"`. Non-admin accounts are signed back out with "Access Denied".
4. The admin console at `/admin/console` has a server-side layout (`layout.tsx`) that runs `getUser()` and redirects to `/admin/login` if the role is missing — no flash of unprotected content.

## Admin Routes
| Path | Access | Auth |
|------|--------|------|
| `/admin/login` | Public | None |
| `/admin/console` | super_admin only | Server-side layout guard |
| `/admin/console/customers` | super_admin only | Server-side layout guard |
| `/api/admin/*` | super_admin only | `requireAdmin()` cookie-based check |

## Migrations
- `00025_admin_users.sql` — adds `is_admin boolean default false` to `public.users` (secondary, denormalized)
- `00026_seed_admin_user.sql` — commented-out seed SQL for direct auth.users insertion (fallback)
<!-- END:day-1-verification -->
