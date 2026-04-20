-- Consolidate profile fields expected by the app and provide safe login helpers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '2 months'),
  ADD COLUMN IF NOT EXISTS active_plugins text[] NOT NULL DEFAULT ARRAY['report', 'tasks', 'quotes']::text[],
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_beta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_granted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS anti_phishing_code text,
  ADD COLUMN IF NOT EXISTS free_export_used boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET
  active_plugins = COALESCE(active_plugins, ARRAY['report', 'tasks', 'quotes']::text[]),
  is_vip = COALESCE(is_vip, false),
  is_beta = COALESCE(is_beta, false),
  free_export_used = COALESCE(free_export_used, false),
  trial_ends_at = COALESCE(trial_ends_at, now() + interval '2 months');

ALTER TABLE public.profiles
  ALTER COLUMN active_plugins SET NOT NULL,
  ALTER COLUMN active_plugins SET DEFAULT ARRAY['report', 'tasks', 'quotes']::text[],
  ALTER COLUMN is_vip SET NOT NULL,
  ALTER COLUMN is_vip SET DEFAULT false,
  ALTER COLUMN is_beta SET NOT NULL,
  ALTER COLUMN is_beta SET DEFAULT false,
  ALTER COLUMN free_export_used SET NOT NULL,
  ALTER COLUMN free_export_used SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.anti_phishing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.anti_phishing_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'anti_phishing_history'
      AND policyname = 'Users view own anti phishing history'
  ) THEN
    CREATE POLICY "Users view own anti phishing history"
    ON public.anti_phishing_history FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'anti_phishing_history'
      AND policyname = 'Users insert own anti phishing history'
  ) THEN
    CREATE POLICY "Users insert own anti phishing history"
    ON public.anti_phishing_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.check_login_block(text);

CREATE OR REPLACE FUNCTION public.check_login_block(check_email text)
RETURNS TABLE(is_blocked boolean, retry_after_seconds integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) >= 8 AS is_blocked,
    900::integer AS retry_after_seconds
  FROM public.failed_login_attempts
  WHERE lower(email) = lower(check_email)
    AND created_at > now() - interval '15 minutes';
$$;

DROP FUNCTION IF EXISTS public.log_failed_login(text);

CREATE OR REPLACE FUNCTION public.log_failed_login(login_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email)
  VALUES (login_email);

  DELETE FROM public.failed_login_attempts
  WHERE created_at < now() - interval '1 day';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_block(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_failed_login(text) TO anon, authenticated;
