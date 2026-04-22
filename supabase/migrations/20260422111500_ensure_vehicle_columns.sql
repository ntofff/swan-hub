-- Ensure vehicle log tables match the app on projects where early migrations were partial.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  name text,
  brand_model text,
  license_plate text,
  fiscal_power text,
  starting_mileage integer DEFAULT 0,
  current_mileage integer DEFAULT 0,
  status text DEFAULT 'active',
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS brand_model text,
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS fiscal_power text,
  ADD COLUMN IF NOT EXISTS starting_mileage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_mileage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.vehicles
SET
  starting_mileage = COALESCE(starting_mileage, 0),
  current_mileage = COALESCE(current_mileage, starting_mileage, 0),
  status = COALESCE(status, 'active'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.vehicles
  ALTER COLUMN starting_mileage SET DEFAULT 0,
  ALTER COLUMN current_mileage SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vehicles'
      AND policyname = 'Users manage own vehicles'
  ) THEN
    CREATE POLICY "Users manage own vehicles"
    ON public.vehicles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_vehicles_updated_at'
  ) THEN
    CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  name text,
  role text,
  default_vehicle_id uuid,
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS default_vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.drivers
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.drivers
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drivers'
      AND policyname = 'Users manage own drivers'
  ) THEN
    CREATE POLICY "Users manage own drivers"
    ON public.drivers FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_drivers_updated_at'
  ) THEN
    CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.frequent_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  name text,
  start_location text,
  end_location text,
  default_distance integer,
  default_driver_id uuid,
  default_vehicle_id uuid,
  activity_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.frequent_routes
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS start_location text,
  ADD COLUMN IF NOT EXISTS end_location text,
  ADD COLUMN IF NOT EXISTS default_distance integer,
  ADD COLUMN IF NOT EXISTS default_driver_id uuid,
  ADD COLUMN IF NOT EXISTS default_vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

UPDATE public.frequent_routes
SET created_at = COALESCE(created_at, now());

ALTER TABLE public.frequent_routes
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.frequent_routes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'frequent_routes'
      AND policyname = 'Users manage own routes'
  ) THEN
    CREATE POLICY "Users manage own routes"
    ON public.frequent_routes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  date date DEFAULT CURRENT_DATE,
  vehicle_id uuid,
  driver_id uuid,
  activity_id uuid,
  purpose text,
  start_location text,
  end_location text,
  start_mileage integer,
  end_mileage integer,
  distance integer,
  ik_amount numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS activity_id uuid,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS start_location text,
  ADD COLUMN IF NOT EXISTS end_location text,
  ADD COLUMN IF NOT EXISTS start_mileage integer,
  ADD COLUMN IF NOT EXISTS end_mileage integer,
  ADD COLUMN IF NOT EXISTS distance integer,
  ADD COLUMN IF NOT EXISTS ik_amount numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.trips
SET
  date = COALESCE(date, CURRENT_DATE),
  distance = COALESCE(distance, CASE WHEN end_mileage IS NOT NULL AND start_mileage IS NOT NULL THEN end_mileage - start_mileage ELSE NULL END),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.trips
  ALTER COLUMN date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'Users manage own trips'
  ) THEN
    CREATE POLICY "Users manage own trips"
    ON public.trips FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_trips_updated_at'
  ) THEN
    CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_user_id_fkey' AND conrelid = 'public.vehicles'::regclass) THEN
      ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_user_id_fkey' AND conrelid = 'public.drivers'::regclass) THEN
      ALTER TABLE public.drivers ADD CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'frequent_routes_user_id_fkey' AND conrelid = 'public.frequent_routes'::regclass) THEN
      ALTER TABLE public.frequent_routes ADD CONSTRAINT frequent_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_user_id_fkey' AND conrelid = 'public.trips'::regclass) THEN
      ALTER TABLE public.trips ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_default_vehicle_id_fkey' AND conrelid = 'public.drivers'::regclass) THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_default_vehicle_id_fkey FOREIGN KEY (default_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'frequent_routes_default_driver_id_fkey' AND conrelid = 'public.frequent_routes'::regclass) THEN
    ALTER TABLE public.frequent_routes ADD CONSTRAINT frequent_routes_default_driver_id_fkey FOREIGN KEY (default_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'frequent_routes_default_vehicle_id_fkey' AND conrelid = 'public.frequent_routes'::regclass) THEN
    ALTER TABLE public.frequent_routes ADD CONSTRAINT frequent_routes_default_vehicle_id_fkey FOREIGN KEY (default_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_driver_id_fkey' AND conrelid = 'public.trips'::regclass) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_vehicle_id_fkey' AND conrelid = 'public.trips'::regclass) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_activities') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_activity_id_fkey' AND conrelid = 'public.vehicles'::regclass) THEN
      ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.user_activities(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_activity_id_fkey' AND conrelid = 'public.drivers'::regclass) THEN
      ALTER TABLE public.drivers ADD CONSTRAINT drivers_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.user_activities(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'frequent_routes_activity_id_fkey' AND conrelid = 'public.frequent_routes'::regclass) THEN
      ALTER TABLE public.frequent_routes ADD CONSTRAINT frequent_routes_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.user_activities(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trips_activity_id_fkey' AND conrelid = 'public.trips'::regclass) THEN
      ALTER TABLE public.trips ADD CONSTRAINT trips_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.user_activities(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
END $$;
