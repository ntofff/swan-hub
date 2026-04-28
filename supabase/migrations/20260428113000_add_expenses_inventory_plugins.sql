-- SWAN HUB business tools: expense receipts + equipment inventory.
-- Documents are private, scoped by auth.uid() in the first storage folder.

CREATE TABLE IF NOT EXISTS public.expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Note de frais',
  vendor text,
  expense_date date,
  category text NOT NULL DEFAULT 'Autre',
  status text NOT NULL DEFAULT 'A verifier',
  amount_ht numeric(12,2),
  amount_ttc numeric(12,2),
  vat_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',
  annotation text,
  document_path text,
  document_name text,
  document_mime_type text,
  analysis_status text NOT NULL DEFAULT 'manuel',
  analysis_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Materiel',
  reference text,
  serial_number text,
  assigned_to text,
  location text,
  status text NOT NULL DEFAULT 'operationnel',
  last_maintenance_at date,
  next_maintenance_at date,
  notes text,
  photo_path text,
  photo_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_receipts_user_created
ON public.expense_receipts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_status
ON public.inventory_items(user_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_next_maintenance
ON public.inventory_items(user_id, next_maintenance_at);

ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expense receipts" ON public.expense_receipts;
CREATE POLICY "Users manage own expense receipts"
ON public.expense_receipts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own inventory items" ON public.inventory_items;
CREATE POLICY "Users manage own inventory items"
ON public.inventory_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_expense_receipts_updated_at ON public.expense_receipts;
CREATE TRIGGER update_expense_receipts_updated_at
BEFORE UPDATE ON public.expense_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-documents',
  'business-documents',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[];

DROP POLICY IF EXISTS "Users view own business documents" ON storage.objects;
CREATE POLICY "Users view own business documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users upload own business documents" ON storage.objects;
CREATE POLICY "Users upload own business documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own business documents" ON storage.objects;
CREATE POLICY "Users update own business documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'business-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own business documents" ON storage.objects;
CREATE POLICY "Users delete own business documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
