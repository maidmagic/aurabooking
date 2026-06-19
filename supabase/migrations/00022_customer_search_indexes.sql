-- Performance indexes for multi-tenant customer search and message log access

-- Phone search index for exact/numeric lookup
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone
  ON public.customer_profiles (phone);

-- Multi-column index for name-based search (ILIRE on name field)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_name_search
  ON public.customer_profiles (user_id, name);

-- Fast conversation lookup by user + recency for admin inbox
CREATE INDEX IF NOT EXISTS idx_conversations_user_recency
  ON public.conversations (user_id, updated_at DESC);

-- Fast message retrieval by conversation (chronological order)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_chrono
  ON public.messages (conversation_id, created_at ASC);
