CREATE OR REPLACE FUNCTION public.normalize_currency_code(input_currency text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN input_currency IS NULL OR btrim(input_currency) = '' THEN 'EUR'
    WHEN lower(btrim(input_currency)) IN ('€', 'eur', 'euro', 'euros') THEN 'EUR'
    WHEN lower(btrim(input_currency)) IN ('$', 'usd', 'dollar', 'dollars') THEN 'USD'
    WHEN lower(btrim(input_currency)) IN ('£', 'gbp', 'pound', 'pounds', 'livre') THEN 'GBP'
    WHEN upper(btrim(input_currency)) ~ '^[A-Z]{3}$' THEN upper(btrim(input_currency))
    ELSE 'EUR'
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_expense_receipt_currency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.currency = public.normalize_currency_code(NEW.currency);
  RETURN NEW;
END;
$$;

UPDATE public.expense_receipts
SET currency = public.normalize_currency_code(currency)
WHERE currency IS NULL
   OR currency <> public.normalize_currency_code(currency)
   OR currency !~ '^[A-Z]{3}$';

DROP TRIGGER IF EXISTS normalize_expense_receipts_currency ON public.expense_receipts;
CREATE TRIGGER normalize_expense_receipts_currency
BEFORE INSERT OR UPDATE OF currency ON public.expense_receipts
FOR EACH ROW
EXECUTE FUNCTION public.normalize_expense_receipt_currency();
