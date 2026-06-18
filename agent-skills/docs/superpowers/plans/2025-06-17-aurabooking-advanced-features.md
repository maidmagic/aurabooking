# AuraBooking Advanced Features Plan

## Priority: Sprint — "The Frictionless Booking" (Deposits + Payments)

### 1. Deposit-Required Flag on Services
- Add `deposit_required` (bool) and `deposit_amount` (decimal, nullable) columns to `services` table
- Update AI Config → Services Catalog UI with toggle + amount input
- When deposit_required=true, AI sends payment link during booking flow
- Release slot hold if payment not completed in 10 minutes

### 2. Embedded Payment During Booking Flow
- Update AI pipeline to check `services.deposit_required`
- If true, generate Stripe PaymentIntent/Payment Link during booking confirmation
- Send secure payment link via SMS
- Listen for `payment_intent.succeeded` webhook → confirm appointment
- Auto-release slot_hold after 10 minutes via cron or webhook timeout

### 3. Lead Prioritization
- Add `lead_score` column to `conversations` table (default 0)
- Scoring rules: new_conversation (+10), high_value_service (+20), repeat_customer (+15)
- Flag High-Value conversations in Inbox with priority badge
- Send dashboard notification for high-value leads

### 4. Smart Waitlist
- New `waitlist` table: id, user_id, service_id, customer_name, customer_phone, created_at
- Background job: scan newly cancelled appointments, match waitlisted leads
- Auto-SMS: "A slot opened up for [service] at [time]. Book now: [link]"

### 5. Contextual Memory (AI)
- Add `customer_notes` JSONB column to `conversations`
- AI pipeline: prepend relevant previous context from same phone/email
- System prompt injection: "The customer previously mentioned: [notes]"

### 6. No-Show Recovery Loop
- Cron job: scan completed-but-unpaid appointments where customer didn't arrive
- Send empathetic "Are you okay?" SMS
- If no reply in 24h, send rebooking discount link (Stripe coupon)

### 7. Multi-Channel Stitching
- Match incoming messages by phone/email across channels
- Merge conversations or display unified history in Inbox
- Single "Golden Record" per customer

### 8. Dynamic Buffers + Slot Clustering
- AI pipeline: prefer slots adjacent to existing bookings
- Per-service buffer stored in services table
- Calendar availability check accounts for service-specific buffers
