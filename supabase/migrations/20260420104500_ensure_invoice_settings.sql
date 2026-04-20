-- Ensure invoice settings exist on projects where the original migration was not applied.
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  quote_prefix text NOT NULL DEFAULT 'D',
  quote_counter integer NOT NULL DEFAULT 1,
  invoice_prefix text NOT NULL DEFAULT 'F',
  invoice_counter integer NOT NULL DEFAULT 1,
  year_in_number boolean NOT NULL DEFAULT true,
  rib_iban text DEFAULT NULL,
  rib_bic text DEFAULT NULL,
  rib_bank text DEFAULT NULL,
  rib_holder text DEFAULT NULL,
  default_tva_mention text DEFAULT NULL,
  default_payment_method text DEFAULT NULL,
  emitter_first_name text DEFAULT NULL,
  emitter_last_name text DEFAULT NULL,
  emitter_company text DEFAULT NULL,
  emitter_siret text DEFAULT NULL,
  emitter_address text DEFAULT NULL,
  emitter_email text DEFAULT NULL,
  emitter_phone text DEFAULT NULL,
  default_legal_mentions text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS quote_prefix text DEFAULT 'D',
  ADD COLUMN IF NOT EXISTS quote_counter integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS invoice_counter integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS year_in_number boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS rib_iban text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rib_bic text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rib_bank text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rib_holder text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_tva_mention text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_payment_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_first_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_last_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_company text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_siret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emitter_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_legal_mentions text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.invoice_settings
SET
  quote_prefix = COALESCE(quote_prefix, 'D'),
  quote_counter = COALESCE(quote_counter, 1),
  invoice_prefix = COALESCE(invoice_prefix, 'F'),
  invoice_counter = COALESCE(invoice_counter, 1),
  year_in_number = COALESCE(year_in_number, true),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.invoice_settings
  ALTER COLUMN quote_prefix SET NOT NULL,
  ALTER COLUMN quote_prefix SET DEFAULT 'D',
  ALTER COLUMN quote_counter SET NOT NULL,
  ALTER COLUMN quote_counter SET DEFAULT 1,
  ALTER COLUMN invoice_prefix SET NOT NULL,
  ALTER COLUMN invoice_prefix SET DEFAULT 'F',
  ALTER COLUMN invoice_counter SET NOT NULL,
  ALTER COLUMN invoice_counter SET DEFAULT 1,
  ALTER COLUMN year_in_number SET NOT NULL,
  ALTER COLUMN year_in_number SET DEFAULT true,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoice_settings_user_id_key'
      AND conrelid = 'public.invoice_settings'::regclass
  ) THEN
    ALTER TABLE public.invoice_settings
      ADD CONSTRAINT invoice_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoice_settings'
      AND policyname = 'Users manage own invoice settings'
  ) THEN
    CREATE POLICY "Users manage own invoice settings"
    ON public.invoice_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_invoice_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_invoice_settings_updated_at
    BEFORE UPDATE ON public.invoice_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
