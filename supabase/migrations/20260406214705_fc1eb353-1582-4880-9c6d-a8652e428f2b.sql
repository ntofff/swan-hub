ALTER TABLE public.tasks
  ADD COLUMN deadline timestamp with time zone DEFAULT NULL,
  ADD COLUMN location text DEFAULT NULL,
  ADD COLUMN entry_date timestamp with time zone DEFAULT now(),
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
