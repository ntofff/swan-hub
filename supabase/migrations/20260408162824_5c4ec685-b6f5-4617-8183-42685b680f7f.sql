
-- 1. Make report-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'report-photos';

-- 2. Ensure storage SELECT policy exists for authenticated users viewing own photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own report photos' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can view own report photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 3. Drop the permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- 4. Create a SECURITY DEFINER function for audit log insertion
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _table_name text DEFAULT NULL,
  _record_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_actions text[] := ARRAY[
    'login', 'logout', 'create', 'update', 'delete',
    'admin_action', 'export', 'import', 'config_change',
    'promotion_created', 'promotion_updated', 'promotion_deleted',
    'theme_created', 'theme_updated', 'plugin_toggled',
    'feedback_updated', 'user_role_changed'
  ];
BEGIN
  IF _action IS NULL OR trim(_action) = '' THEN
    RAISE EXCEPTION 'Action is required';
  END IF;

  IF NOT (_action = ANY(allowed_actions)) THEN
    RAISE EXCEPTION 'Invalid audit action: %', _action;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), _action, _table_name, _record_id, _details);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) TO authenticated;
