
-- Add columns to log_entries
ALTER TABLE public.log_entries ADD COLUMN seq_number text;
ALTER TABLE public.log_entries ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Counter table
CREATE TABLE public.logbook_counters (
  user_id uuid PRIMARY KEY,
  letter_group integer NOT NULL DEFAULT 0,
  current_number integer NOT NULL DEFAULT 0
);
ALTER TABLE public.logbook_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own logbook counter" ON public.logbook_counters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to get next seq
CREATE OR REPLACE FUNCTION public.next_logbook_seq(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group integer; v_num integer; v_old_num integer;
BEGIN
  SELECT letter_group, current_number INTO v_group, v_old_num
  FROM public.logbook_counters WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.logbook_counters (user_id, letter_group, current_number) VALUES (p_user_id, 0, 1);
    v_group := 0; v_num := 1;
  ELSE
    IF v_old_num >= 999 THEN v_group := v_group + 1; v_num := 1;
    ELSE v_num := v_old_num + 1; END IF;
    UPDATE public.logbook_counters SET letter_group = v_group, current_number = v_num WHERE user_id = p_user_id;
  END IF;
  RETURN chr(65 + (v_group / 26)) || chr(65 + (v_group % 26)) || lpad(v_num::text, 3, '0');
END; $$;

-- Trigger
CREATE OR REPLACE FUNCTION public.assign_logbook_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.seq_number IS NULL THEN NEW.seq_number := public.next_logbook_seq(NEW.user_id); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_assign_logbook_seq BEFORE INSERT ON public.log_entries FOR EACH ROW EXECUTE FUNCTION public.assign_logbook_seq();

-- Backfill existing entries
DO $$ DECLARE r RECORD; v_seq text;
BEGIN
  FOR r IN (SELECT id, user_id FROM public.log_entries WHERE seq_number IS NULL ORDER BY entry_date ASC, created_at ASC)
  LOOP
    v_seq := public.next_logbook_seq(r.user_id);
    UPDATE public.log_entries SET seq_number = v_seq WHERE id = r.id;
  END LOOP;
END; $$;
