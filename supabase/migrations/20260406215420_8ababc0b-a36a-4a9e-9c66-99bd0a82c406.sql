ALTER TABLE public.missions
  ADD COLUMN collaborator text DEFAULT NULL,
  ADD COLUMN contact text DEFAULT NULL,
  ADD COLUMN quote_amount numeric DEFAULT NULL,
  ADD COLUMN archived boolean NOT NULL DEFAULT false;
