
ALTER TABLE public.quotes ADD COLUMN tva_rate numeric DEFAULT NULL;
ALTER TABLE public.invoices ADD COLUMN tva_rate numeric DEFAULT NULL;
