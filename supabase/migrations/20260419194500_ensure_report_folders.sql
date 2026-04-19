-- Ensure report folders exist on projects where the original migration was not applied.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.report_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  color text NOT NULL DEFAULT '38 50% 58%',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_folders
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '📁',
  ADD COLUMN IF NOT EXISTS color text DEFAULT '38 50% 58%',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.report_folders
SET
  icon = COALESCE(icon, '📁'),
  color = COALESCE(color, '38 50% 58%'),
  sort_order = COALESCE(sort_order, 0),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.report_folders
  ALTER COLUMN icon SET NOT NULL,
  ALTER COLUMN color SET NOT NULL,
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.report_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_folders'
      AND policyname = 'Users manage own report folders'
  ) THEN
    CREATE POLICY "Users manage own report folders"
    ON public.report_folders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_report_folders_updated_at'
  ) THEN
    CREATE TRIGGER update_report_folders_updated_at
    BEFORE UPDATE ON public.report_folders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS folder_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_folder_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_folder_id_fkey
      FOREIGN KEY (folder_id)
      REFERENCES public.report_folders(id)
      ON DELETE SET NULL;
  END IF;
END $$;
