
-- Table to store WebAuthn passkey credentials
CREATE TABLE public.user_passkeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

-- Users can view their own passkeys
CREATE POLICY "Users can view own passkeys"
ON public.user_passkeys FOR SELECT
USING (auth.uid() = user_id);

-- Users can create passkeys for themselves
CREATE POLICY "Users can create own passkeys"
ON public.user_passkeys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own passkeys
CREATE POLICY "Users can delete own passkeys"
ON public.user_passkeys FOR DELETE
USING (auth.uid() = user_id);

-- Service role needs full access for the edge function (verification during login)
-- The edge function uses service role key, which bypasses RLS

-- Index for fast lookup by credential_id during authentication
CREATE INDEX idx_user_passkeys_credential_id ON public.user_passkeys (credential_id);
