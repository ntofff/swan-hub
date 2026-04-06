
-- Emitter info on invoice_settings
ALTER TABLE public.invoice_settings
  ADD COLUMN emitter_first_name text DEFAULT NULL,
  ADD COLUMN emitter_last_name text DEFAULT NULL,
  ADD COLUMN emitter_company text DEFAULT NULL,
  ADD COLUMN emitter_siret text DEFAULT NULL,
  ADD COLUMN emitter_address text DEFAULT NULL,
  ADD COLUMN emitter_email text DEFAULT NULL,
  ADD COLUMN emitter_phone text DEFAULT NULL,
  ADD COLUMN default_legal_mentions text DEFAULT NULL;

-- New columns on quotes
ALTER TABLE public.quotes
  ADD COLUMN notes text DEFAULT NULL,
  ADD COLUMN issue_date date DEFAULT CURRENT_DATE,
  ADD COLUMN payment_terms integer DEFAULT NULL,
  ADD COLUMN period_description text DEFAULT NULL;

-- New columns on invoices
ALTER TABLE public.invoices
  ADD COLUMN notes text DEFAULT NULL,
  ADD COLUMN issue_date date DEFAULT CURRENT_DATE,
  ADD COLUMN payment_terms integer DEFAULT NULL,
  ADD COLUMN period_description text DEFAULT NULL;
