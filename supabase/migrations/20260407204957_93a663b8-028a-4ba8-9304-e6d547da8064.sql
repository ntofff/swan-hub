
CREATE TABLE public.report_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  caption_position TEXT DEFAULT 'bottom-center',
  caption_font TEXT DEFAULT 'sans-serif',
  caption_size INTEGER DEFAULT 24,
  caption_color TEXT DEFAULT '#FFFFFF',
  caption_opacity NUMERIC DEFAULT 0.8,
  sort_order INTEGER NOT NULL DEFAULT 0,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own report photos"
ON public.report_photos
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_report_photos_report_id ON public.report_photos(report_id);
CREATE INDEX idx_report_photos_user_id ON public.report_photos(user_id);
