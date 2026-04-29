-- Repair profiles where the planning rollout appended to a NULL visibility array,
-- leaving VIP/Pro users with only the new planning tool on the home page.

UPDATE public.profiles
SET
  active_plugins = ARRAY[
    'report',
    'tasks',
    'planning',
    'missions',
    'quotes',
    'logbook',
    'vehicle',
    'expenses',
    'inventory'
  ]::text[],
  visible_plugin_ids = ARRAY[
    'report',
    'tasks',
    'planning',
    'missions',
    'quotes',
    'logbook',
    'vehicle',
    'expenses',
    'inventory'
  ]::text[]
WHERE
  (plan = 'pro' OR is_vip = true)
  AND (
    visible_plugin_ids IS NULL
    OR cardinality(visible_plugin_ids) = 0
    OR visible_plugin_ids = ARRAY['planning']::text[]
  );
