-- Ensure logbook entries match the app on projects where early migrations were partial.
CREATE TABLE IF NOT EXISTS public.log_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  text text,
  color text DEFAULT '38 50% 58%',
  priority text DEFAULT 'normale',
  entry_date timestamp with time zone DEFAULT now(),
  seq_number text,
  archived boolean DEFAULT false,
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.log_entries
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT '38 50% 58%',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS entry_date timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS seq_number text,
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

UPDATE public.log_entries
SET
  color = COALESCE(color, '38 50% 58%'),
  priority = COALESCE(priority, 'normale'),
  entry_date = COALESCE(entry_date, created_at, now()),
  archived = COALESCE(archived, false),
  created_at = COALESCE(created_at, now());

ALTER TABLE public.log_entries
  ALTER COLUMN color SET DEFAULT '38 50% 58%',
  ALTER COLUMN priority SET DEFAULT 'normale',
  ALTER COLUMN entry_date SET DEFAULT now(),
  ALTER COLUMN archived SET NOT NULL,
  ALTER COLUMN archived SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'log_entries'
      AND policyname = 'Users manage own log entries'
  ) THEN
    CREATE POLICY "Users manage own log entries"
    ON public.log_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.logbook_counters (
  user_id uuid PRIMARY KEY,
  letter_group integer NOT NULL DEFAULT 0,
  current_number integer NOT NULL DEFAULT 0
);

ALTER TABLE public.logbook_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'logbook_counters'
      AND policyname = 'Users manage own logbook counter'
  ) THEN
    CREATE POLICY "Users manage own logbook counter"
    ON public.logbook_counters FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.next_logbook_seq(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group integer;
  v_num integer;
  v_old_num integer;
BEGIN
  SELECT letter_group, current_number INTO v_group, v_old_num
  FROM public.logbook_counters
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.logbook_counters (user_id, letter_group, current_number)
    VALUES (p_user_id, 0, 1);
    v_group := 0;
    v_num := 1;
  ELSE
    IF v_old_num >= 999 THEN
      v_group := v_group + 1;
      v_num := 1;
    ELSE
      v_num := v_old_num + 1;
    END IF;

    UPDATE public.logbook_counters
    SET letter_group = v_group,
        current_number = v_num
    WHERE user_id = p_user_id;
  END IF;

  RETURN chr(65 + (v_group / 26)) || chr(65 + (v_group % 26)) || lpad(v_num::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_logbook_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seq_number IS NULL THEN
    NEW.seq_number := public.next_logbook_seq(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_assign_logbook_seq'
  ) THEN
    CREATE TRIGGER trg_assign_logbook_seq
    BEFORE INSERT ON public.log_entries
    FOR EACH ROW EXECUTE FUNCTION public.assign_logbook_seq();
  END IF;
END $$;

DO $$
DECLARE
  r record;
  v_seq text;
BEGIN
  FOR r IN (
    SELECT id, user_id
    FROM public.log_entries
    WHERE seq_number IS NULL
      AND user_id IS NOT NULL
    ORDER BY entry_date ASC, created_at ASC
  )
  LOOP
    v_seq := public.next_logbook_seq(r.user_id);
    UPDATE public.log_entries
    SET seq_number = v_seq
    WHERE id = r.id;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'log_entries_user_id_fkey'
        AND conrelid = 'public.log_entries'::regclass
    )
  THEN
    ALTER TABLE public.log_entries
      ADD CONSTRAINT log_entries_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_activities') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'log_entries_activity_id_fkey'
        AND conrelid = 'public.log_entries'::regclass
    )
  THEN
    ALTER TABLE public.log_entries
      ADD CONSTRAINT log_entries_activity_id_fkey
      FOREIGN KEY (activity_id)
      REFERENCES public.user_activities(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
