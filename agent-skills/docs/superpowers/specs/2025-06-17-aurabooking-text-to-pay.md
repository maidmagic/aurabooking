# Text to Pay — Feature Spec

## Goal
Send SMS payment requests to patients with a Stripe Checkout link. Track payment status on appointments.

## Flow
1. Business clicks "Send Payment Request" on an appointment (Appointments page or Inbox conversation toolbar)
2. API creates a Stripe Checkout Session with the service price
3. SMS sent to patient: *"You have a balance of $X for your {service}. Pay here: {link}"*
4. `payments` row created with status `pending`
5. Patient pays on Stripe's hosted Checkout (card, Google Pay, Apple Pay)
6. Stripe webhook `POST /api/webhooks/stripe` fires with `checkout.session.completed`
7. We update `payments.status → paid`, `appointments.payment_status → paid`

## Data Model

### `payments` table (new)
```sql
CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount                INTEGER NOT NULL, -- cents
  currency              TEXT DEFAULT 'usd',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);
```

### `appointments` table alteration
Add column `payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded'))`

## New Endpoints

### `POST /api/payments/create-session`
- Auth required
- Body: `{ appointment_id: string }`
- Looks up appointment + service price
- Creates Stripe Checkout Session with `mode=payment`, `line_items` with service name + price
- Creates `payments` row with `status: pending`
- Sends SMS via Twilio with checkout URL
- Returns `{ url: stripe_checkout_url }`

### `POST /api/webhooks/stripe`
- No auth (validated by Stripe signature)
- Verifies webhook signature with `stripe.webhooks.constructEvent`
- Handles `checkout.session.completed` → updates `payments` + `appointments`
- Handles `checkout.session.expired` → updates `payments.status = failed`
- Returns 200

## UI Changes

### Appointments page
- Add "Send Payment Request" button per row (only when `payment_status = 'unpaid'`)
- On click: calls `POST /api/payments/create-session`, shows success/toast

### Inbox
- Add "Send Payment Request" button in conversation toolbar when conversation has a linked appointment with `payment_status = 'unpaid'`
- Same API call + toast

## Configuration
- `STRIPE_SECRET_KEY` env var
- `STRIPE_WEBHOOK_SECRET` env var (for webhook signature verification)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var (for future client-side use)

## Files
- `supabase/migrations/00003_payments.sql` — payments table + appointments alter
- `apps/web/src/app/api/payments/create-session/route.ts` — create Stripe Checkout + send SMS
- `apps/web/src/app/api/webhooks/stripe/route.ts` — Stripe event handler
- `apps/web/src/app/(dashboard)/appointments/page.tsx` — add payment button
- `apps/web/src/app/(dashboard)/inbox/page.tsx` — add payment button to conversation toolbar

## Security
- Stripe webhook validated via `stripe.webhooks.constructEvent` (cryptographic signature)
- All API routes check auth
- Payments RLS policy scoped to user_id

## Future (not building now)
- Online Bill Pay patient portal
- Payment history dashboard
- Refund flow in UI
- Auto-payment request after booking (AI pipeline)
