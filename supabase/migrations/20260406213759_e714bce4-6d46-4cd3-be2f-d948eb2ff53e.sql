ALTER TABLE public.log_entries
  ADD COLUMN color text DEFAULT '38 50% 58%',
  ADD COLUMN priority text DEFAULT 'normale',
  ADD COLUMN entry_date timestamp with time zone DEFAULT now();
