-- Add plugin-level entitlements for trial, à la carte, pro display and manual admin access.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_plugin_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS paid_plugin_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS visible_plugin_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS manual_access_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS manual_access_note text;

UPDATE public.profiles
SET
  trial_plugin_ids = CASE
    WHEN COALESCE(cardinality(trial_plugin_ids), 0) = 0 THEN (COALESCE(active_plugins, ARRAY['report', 'tasks', 'quotes']::text[]))[1:3]
    ELSE trial_plugin_ids
  END,
  paid_plugin_ids = CASE
    WHEN COALESCE(cardinality(paid_plugin_ids), 0) = 0 AND plan = 'carte' THEN COALESCE(active_plugins, ARRAY[]::text[])
    ELSE paid_plugin_ids
  END,
  visible_plugin_ids = CASE
    WHEN COALESCE(cardinality(visible_plugin_ids), 0) = 0 THEN COALESCE(active_plugins, ARRAY['report', 'tasks', 'quotes']::text[])
    ELSE visible_plugin_ids
  END,
  subscription_cancel_at_period_end = COALESCE(subscription_cancel_at_period_end, false);

ALTER TABLE public.profiles
  ALTER COLUMN trial_plugin_ids SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN paid_plugin_ids SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN visible_plugin_ids SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN subscription_cancel_at_period_end SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_profile_billing_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
    OR NEW.plan_updated_at IS DISTINCT FROM OLD.plan_updated_at
    OR NEW.paid_plugin_ids IS DISTINCT FROM OLD.paid_plugin_ids
    OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
    OR NEW.trial_reminder_sent_at IS DISTINCT FROM OLD.trial_reminder_sent_at
    OR NEW.manual_access_until IS DISTINCT FROM OLD.manual_access_until
    OR NEW.manual_access_note IS DISTINCT FROM OLD.manual_access_note
  THEN
    RAISE EXCEPTION 'Billing fields are managed by the server';
  END IF;

  IF NEW.trial_plugin_ids IS DISTINCT FROM OLD.trial_plugin_ids THEN
    IF COALESCE(cardinality(OLD.trial_plugin_ids), 0) > 0
      AND OLD.anti_phishing_code IS NOT NULL
    THEN
      RAISE EXCEPTION 'Trial plugins cannot be changed after setup';
    END IF;

    IF COALESCE(cardinality(NEW.trial_plugin_ids), 0) <> 3 THEN
      RAISE EXCEPTION 'Exactly 3 trial plugins are required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_billing_field_changes ON public.profiles;

CREATE TRIGGER prevent_profile_billing_field_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_billing_field_changes();

CREATE TABLE IF NOT EXISTS public.admin_subscription_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_subscription_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_subscription_actions'
      AND policyname = 'Admins view subscription actions'
  ) THEN
    CREATE POLICY "Admins view subscription actions"
    ON public.admin_subscription_actions FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'
      )
    );
  END IF;
END $$;
