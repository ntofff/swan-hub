
-- User invoice settings
CREATE TABLE public.invoice_settings (
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoice settings"
  ON public.invoice_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to quotes
ALTER TABLE public.quotes
  ADD COLUMN color text DEFAULT NULL,
  ADD COLUMN payment_method text DEFAULT NULL,
  ADD COLUMN tva_mention text DEFAULT NULL,
  ADD COLUMN discount_type text DEFAULT NULL,
  ADD COLUMN discount_value numeric DEFAULT NULL,
  ADD COLUMN amount_ht numeric DEFAULT NULL;

-- Add columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN color text DEFAULT NULL,
  ADD COLUMN payment_method text DEFAULT NULL,
  ADD COLUMN tva_mention text DEFAULT NULL,
  ADD COLUMN rib_details jsonb DEFAULT NULL,
  ADD COLUMN discount_type text DEFAULT NULL,
  ADD COLUMN discount_value numeric DEFAULT NULL,
  ADD COLUMN amount_ht numeric DEFAULT NULL;
