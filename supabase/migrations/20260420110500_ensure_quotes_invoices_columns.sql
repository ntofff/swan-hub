-- Ensure quotes and invoices match the app on projects where early migrations were partial.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  quote_number text,
  title text,
  client text,
  client_id uuid,
  amount numeric,
  amount_ht numeric,
  status text DEFAULT 'Brouillon',
  due_date date,
  color text,
  payment_method text,
  tva_mention text,
  tva_rate numeric,
  discount_type text,
  discount_value numeric,
  notes text,
  issue_date date DEFAULT CURRENT_DATE,
  payment_terms integer,
  period_description text,
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS quote_number text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS client text,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS amount_ht numeric,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Brouillon',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS tva_mention text,
  ADD COLUMN IF NOT EXISTS tva_rate numeric,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_terms integer,
  ADD COLUMN IF NOT EXISTS period_description text,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.quotes
SET
  status = COALESCE(status, 'Brouillon'),
  issue_date = COALESCE(issue_date, CURRENT_DATE),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.quotes
  ALTER COLUMN status SET DEFAULT 'Brouillon',
  ALTER COLUMN issue_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'Users manage own quotes'
  ) THEN
    CREATE POLICY "Users manage own quotes"
    ON public.quotes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_quotes_updated_at'
  ) THEN
    CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  invoice_number text,
  title text,
  client text,
  client_id uuid,
  quote_id uuid,
  amount numeric,
  amount_ht numeric,
  status text DEFAULT 'Brouillon',
  due_date date,
  color text,
  payment_method text,
  tva_mention text,
  tva_rate numeric,
  rib_details jsonb,
  discount_type text,
  discount_value numeric,
  notes text,
  issue_date date DEFAULT CURRENT_DATE,
  payment_terms integer,
  period_description text,
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS client text,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS amount_ht numeric,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Brouillon',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS tva_mention text,
  ADD COLUMN IF NOT EXISTS tva_rate numeric,
  ADD COLUMN IF NOT EXISTS rib_details jsonb,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_terms integer,
  ADD COLUMN IF NOT EXISTS period_description text,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.invoices
SET
  status = COALESCE(status, 'Brouillon'),
  issue_date = COALESCE(issue_date, CURRENT_DATE),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.invoices
  ALTER COLUMN status SET DEFAULT 'Brouillon',
  ALTER COLUMN issue_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Users manage own invoices'
  ) THEN
    CREATE POLICY "Users manage own invoices"
    ON public.invoices FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_invoices_updated_at'
  ) THEN
    CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'quotes_client_id_fkey'
        AND conrelid = 'public.quotes'::regclass
    )
  THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES public.clients(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'invoices_client_id_fkey'
        AND conrelid = 'public.invoices'::regclass
    )
  THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES public.clients(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_quote_id_fkey'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_quote_id_fkey
      FOREIGN KEY (quote_id)
      REFERENCES public.quotes(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_activities') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'quotes_activity_id_fkey'
        AND conrelid = 'public.quotes'::regclass
    )
  THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_activity_id_fkey
      FOREIGN KEY (activity_id)
      REFERENCES public.user_activities(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_activities') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'invoices_activity_id_fkey'
        AND conrelid = 'public.invoices'::regclass
    )
  THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_activity_id_fkey
      FOREIGN KEY (activity_id)
      REFERENCES public.user_activities(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
