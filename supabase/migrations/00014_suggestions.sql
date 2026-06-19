-- Paid member suggestions board (Reddit-style voting)
CREATE TABLE public.suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'shipped', 'declined')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suggestions"
  ON public.suggestions FOR SELECT
  USING (true);

CREATE POLICY "Paid users can create suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid() AND plan != 'free' AND status = 'active'
    )
  );

CREATE POLICY "Users can update own suggestions"
  ON public.suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions"
  ON public.suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Upvotes (unique per user per suggestion)
CREATE TABLE public.suggestion_upvotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id   UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);
ALTER TABLE public.suggestion_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upvotes"
  ON public.suggestion_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Paid users can upvote"
  ON public.suggestion_upvotes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid() AND plan != 'free' AND status = 'active'
    )
  );

CREATE POLICY "Users can remove own upvotes"
  ON public.suggestion_upvotes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_suggestion_upvotes_suggestion ON public.suggestion_upvotes(suggestion_id);
