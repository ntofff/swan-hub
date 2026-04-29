-- SWAN HUB planning tool: profiles, projects and visual timeline events.

CREATE TABLE IF NOT EXISTS public.planning_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  color text NOT NULL DEFAULT '199 89% 48%',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planning_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  client text,
  color text NOT NULL DEFAULT '217 91% 60%',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.planning_profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.planning_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'Planifié',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_events_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_planning_profiles_user_name
ON public.planning_profiles(user_id, name);

CREATE INDEX IF NOT EXISTS idx_planning_projects_user_name
ON public.planning_projects(user_id, name);

CREATE INDEX IF NOT EXISTS idx_planning_events_user_start
ON public.planning_events(user_id, start_at);

CREATE INDEX IF NOT EXISTS idx_planning_events_user_project
ON public.planning_events(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_planning_events_user_profile
ON public.planning_events(user_id, profile_id);

ALTER TABLE public.planning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own planning profiles" ON public.planning_profiles;
CREATE POLICY "Users manage own planning profiles"
ON public.planning_profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own planning projects" ON public.planning_projects;
CREATE POLICY "Users manage own planning projects"
ON public.planning_projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own planning events" ON public.planning_events;
CREATE POLICY "Users manage own planning events"
ON public.planning_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_planning_profiles_updated_at ON public.planning_profiles;
CREATE TRIGGER update_planning_profiles_updated_at
BEFORE UPDATE ON public.planning_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_planning_projects_updated_at ON public.planning_projects;
CREATE TRIGGER update_planning_projects_updated_at
BEFORE UPDATE ON public.planning_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_planning_events_updated_at ON public.planning_events;
CREATE TRIGGER update_planning_events_updated_at
BEFORE UPDATE ON public.planning_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plugins visible to all authenticated" ON public.plugins;
CREATE POLICY "Plugins visible to all authenticated"
ON public.plugins
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.plugins (slug, name, description, icon, is_active, is_locked)
VALUES (
  'planning',
  'Plannings',
  'Timeline visuelle pour profils, projets et exports calendrier/PDF/Excel',
  'Calendar',
  true,
  false
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true,
  is_locked = false;

UPDATE public.profiles
SET
  active_plugins = CASE
    WHEN NOT ('planning' = ANY(active_plugins)) THEN array_append(active_plugins, 'planning')
    ELSE active_plugins
  END,
  visible_plugin_ids = CASE
    WHEN (plan = 'pro' OR is_vip = true) AND NOT ('planning' = ANY(visible_plugin_ids)) THEN array_append(visible_plugin_ids, 'planning')
    ELSE visible_plugin_ids
  END
WHERE plan = 'pro' OR is_vip = true;
