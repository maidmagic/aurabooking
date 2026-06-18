ALTER TABLE public.services ADD COLUMN deposit_required BOOLEAN DEFAULT false;
ALTER TABLE public.services ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE public.appointments ADD COLUMN payment_intent_id TEXT;
