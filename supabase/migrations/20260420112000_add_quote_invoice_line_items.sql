-- Add simple product/service lines for quotes and invoices.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS line_items jsonb;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS line_items jsonb;
