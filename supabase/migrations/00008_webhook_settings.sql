ALTER TABLE public.ai_settings ADD COLUMN webhook_api_key_hash TEXT;
ALTER TABLE public.ai_settings ADD COLUMN webhook_enabled BOOLEAN DEFAULT true;
