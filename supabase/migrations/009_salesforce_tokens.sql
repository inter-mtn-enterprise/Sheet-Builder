-- Table to store Salesforce OAuth tokens per user
CREATE TABLE IF NOT EXISTS public.salesforce_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  instance_url TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_salesforce_tokens_user_id ON public.salesforce_tokens(user_id);

-- Enable RLS
ALTER TABLE public.salesforce_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view their own tokens"
  ON public.salesforce_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tokens"
  ON public.salesforce_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tokens"
  ON public.salesforce_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tokens"
  ON public.salesforce_tokens FOR DELETE
  USING (user_id = auth.uid());

