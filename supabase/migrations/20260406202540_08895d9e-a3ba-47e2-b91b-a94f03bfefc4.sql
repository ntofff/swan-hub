
CREATE TABLE public.report_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  color text NOT NULL DEFAULT '38 50% 58%',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own report folders"
ON public.report_folders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_report_folders_updated_at
BEFORE UPDATE ON public.report_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.report_folders(id) ON DELETE SET NULL;
