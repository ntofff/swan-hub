-- Add new columns to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS color text DEFAULT '38 50% 58%';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normale';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report photos
CREATE POLICY "Users can view own report photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own report photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own report photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);