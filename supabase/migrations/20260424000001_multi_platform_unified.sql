-- ============================================================================
-- Aurzo Multi-Platform Unified Backend Migration
-- ============================================================================
-- Goals
--   1. Register every Aurzo platform in aurzo_core.apps AND public.platforms
--      so one login (auth.users) powers every app.
--   2. Make payments/entitlements the single source of truth (managed by
--      morning-growth-loop). aurzo_core.subscriptions + entitlements +
--      public.platform_access all stay in sync.
--   3. Track exactly which apps a user clicks on / uses the most
--      (platform_clicks + platform_activity + v_user_top_platforms view).
--   4. Keep everything efficient: indexes on lookup columns, RLS on every
--      user-owned row, idempotent DDL so we can re-run safely.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. APP CATALOG — seed every Aurzo platform
-- ---------------------------------------------------------------------------
INSERT INTO aurzo_core.apps (id, name, tagline, description, route, accent_color, is_active, sort_order)
VALUES
  ('morning_hub',     'Morning Growth Hub',    'Your 30-day micro-learning habit',     'Daily bite-sized lessons, quizzes, flashcards, and streaks.',       '/hub',            '#F59E0B', true,  5),
  ('financials',      'Aurzo Financials',      'Budgets, accounts, bills, and goals',  'Track spending, automate bills, and grow net worth.',               '/financials',     '#10B981', true, 10),
  ('health',          'Aurzo Health',          'Fitness, mood, breathing, nutrition',  'Workouts, meditations, mood logs, and body metrics in one place.',  '/health',         '#EF4444', true, 20),
  ('sports',          'Aurzo Sports',          'Betting tracker, fantasy, news',       'Personalized sports news, betting accounts, fantasy leagues.',      '/sports',         '#0EA5E9', true, 30),
  ('career',          'Aurzo Professional',    'Jobs, resumes, interviews, coaching',  'Full career OS: resume builder, interview prep, AI coach.',         '/career',         '#6366F1', true, 40),
  ('education',       'Aurzo Student Life',    'Courses, GPA, degree plan, flashcards','Track assignments, plan degrees, and master topics.',               '/student',        '#8B5CF6', true, 50),
  ('chef',            'Aurzo Chef',            'Recipes, pantry, meal plans, cooking', 'Cook more at home with pantry-aware recipes and meal calendar.',    '/chef',           '#F97316', true, 60),
  ('travel',          'Aurzo Travel',          'Trips, flights, hotels, itineraries',  'Plan every trip with AI, budgets, and day-by-day itineraries.',     '/travel',         '#06B6D4', true, 70),
  ('games',           'Aurzo Games',           'Daily puzzles, trivia, leagues',       'Wordle, trivia, sudoku, word scramble, and office leagues.',        '/games',          '#EC4899', true, 80),
  ('life_manager',    'Aurzo Life Manager',    'Smart tasks, habits, focus, calendar', 'Plan days, track habits, run focus timers, and see insights.',      '/life-manager',   '#14B8A6', true, 90),
  ('parenting',       'Aurzo Family',          'Children, milestones, routines',       'Everything for parents: health records, routines, caregivers.',     '/parenting',      '#22C55E', true,100),
  ('relationship_os', 'Relationship OS',       'People, dates, gifts, memories',       'Stay close to who matters: dates, gifts, outreach, memories.',      '/relationships',  '#E11D48', true,110)
ON CONFLICT (id) DO UPDATE
SET name         = EXCLUDED.name,
    tagline      = EXCLUDED.tagline,
    description  = EXCLUDED.description,
    route        = EXCLUDED.route,
    accent_color = EXCLUDED.accent_color,
    is_active    = EXCLUDED.is_active,
    sort_order   = EXCLUDED.sort_order;

-- Mirror catalog into public.platforms (used by the morning-growth-loop hub UI).
INSERT INTO public.platforms (key, name, slug, tagline, description, theme_color, enabled, sort_order)
VALUES
  ('morning_hub',     'Morning Growth Hub',    'morning-hub',     'Your 30-day micro-learning habit',      'Daily bite-sized lessons, quizzes, flashcards, and streaks.',      '#F59E0B', true,  5),
  ('finance',         'Aurzo Financials',      'finance',         'Budgets, accounts, bills, and goals',   'Track spending, automate bills, and grow net worth.',              '#10B981', true, 10),
  ('health',          'Aurzo Health',          'health',          'Fitness, mood, breathing, nutrition',   'Workouts, meditations, mood logs, and body metrics in one place.', '#EF4444', true, 20),
  ('sports',          'Aurzo Sports',          'sports',          'Betting tracker, fantasy, news',        'Personalized sports news, betting accounts, fantasy leagues.',     '#0EA5E9', true, 30),
  ('career',          'Aurzo Professional',    'career',          'Jobs, resumes, interviews, coaching',   'Full career OS: resume builder, interview prep, AI coach.',        '#6366F1', true, 40),
  ('student',         'Aurzo Student Life',    'student',         'Courses, GPA, degree plan, flashcards', 'Track assignments, plan degrees, and master topics.',              '#8B5CF6', true, 50),
  ('chef',            'Aurzo Chef',            'chef',            'Recipes, pantry, meal plans, cooking',  'Cook more at home with pantry-aware recipes and meal calendar.',   '#F97316', true, 60),
  ('travel',          'Aurzo Travel',          'travel',          'Trips, flights, hotels, itineraries',   'Plan every trip with AI, budgets, and day-by-day itineraries.',    '#06B6D4', true, 70),
  ('games',           'Aurzo Games',           'games',           'Daily puzzles, trivia, leagues',        'Wordle, trivia, sudoku, word scramble, and office leagues.',       '#EC4899', true, 80),
  ('tasks',           'Aurzo Life Manager',    'life-manager',    'Smart tasks, habits, focus, calendar',  'Plan days, track habits, run focus timers, and see insights.',     '#14B8A6', true, 90),
  ('parenting',       'Aurzo Family',          'parenting',       'Children, milestones, routines',        'Everything for parents: health records, routines, caregivers.',    '#22C55E', true,100),
  ('relationships',   'Relationship OS',       'relationships',   'People, dates, gifts, memories',        'Stay close to who matters: dates, gifts, outreach, memories.',     '#E11D48', true,110)
ON CONFLICT (key) DO UPDATE
SET name        = EXCLUDED.name,
    slug        = EXCLUDED.slug,
    tagline     = EXCLUDED.tagline,
    description = EXCLUDED.description,
    theme_color = EXCLUDED.theme_color,
    enabled     = EXCLUDED.enabled,
    sort_order  = EXCLUDED.sort_order,
    updated_at  = NOW();

-- ---------------------------------------------------------------------------
-- 2. Canonical platform-key mapping
--    Some callers use public.platforms.key (e.g. 'finance','student','tasks')
--    while internal analytics use aurzo_core.apps.id (e.g. 'financials',
--    'education','life_manager'). Provide a resolver so both work.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aurzo_core.resolve_app_id(p_key TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE lower(p_key)
    WHEN 'finance'         THEN 'financials'
    WHEN 'student'         THEN 'education'
    WHEN 'tasks'           THEN 'life_manager'
    WHEN 'relationships'   THEN 'relationship_os'
    WHEN 'life-manager'    THEN 'life_manager'
    WHEN 'morning-hub'     THEN 'morning_hub'
    ELSE lower(p_key)
  END;
$$;

-- ---------------------------------------------------------------------------
-- 3. CLICK TRACKING — fine-grained record of every platform tile/deeplink click
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_key  TEXT NOT NULL,
  source        TEXT,                 -- 'hub_tile','nav','deeplink','email','push','search'
  referrer      TEXT,
  device        TEXT,                 -- 'web','ios','android'
  user_agent    TEXT,
  ip            INET,
  session_id    UUID,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_clicks_user_time
  ON public.platform_clicks (user_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_clicks_user_platform
  ON public.platform_clicks (user_id, platform_key);
CREATE INDEX IF NOT EXISTS idx_platform_clicks_platform_time
  ON public.platform_clicks (platform_key, clicked_at DESC);

ALTER TABLE public.platform_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_clicks_select_own" ON public.platform_clicks;
CREATE POLICY "platform_clicks_select_own"
  ON public.platform_clicks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "platform_clicks_insert_own" ON public.platform_clicks;
CREATE POLICY "platform_clicks_insert_own"
  ON public.platform_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. AGGREGATE VIEWS — "which apps has each user clicked on the most"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_user_platform_usage AS
WITH clicks AS (
  SELECT user_id,
         aurzo_core.resolve_app_id(platform_key) AS app_id,
         COUNT(*)                                 AS click_count,
         MAX(clicked_at)                          AS last_click_at
  FROM public.platform_clicks
  GROUP BY user_id, aurzo_core.resolve_app_id(platform_key)
),
activity AS (
  SELECT user_id,
         aurzo_core.resolve_app_id(platform)      AS app_id,
         COUNT(*)                                 AS activity_count,
         MAX(created_at)                          AS last_activity_at
  FROM public.platform_activity
  GROUP BY user_id, aurzo_core.resolve_app_id(platform)
),
sessions AS (
  SELECT user_id,
         app_id,
         COUNT(*)                                 AS session_count,
         MAX(last_seen_at)                        AS last_seen_at
  FROM aurzo_core.sessions
  GROUP BY user_id, app_id
)
SELECT COALESCE(c.user_id, a.user_id, s.user_id)            AS user_id,
       COALESCE(c.app_id,  a.app_id,  s.app_id)             AS app_id,
       COALESCE(c.click_count, 0)                           AS click_count,
       COALESCE(a.activity_count, 0)                        AS activity_count,
       COALESCE(s.session_count, 0)                         AS session_count,
       COALESCE(c.click_count, 0)
         + COALESCE(a.activity_count, 0)
         + COALESCE(s.session_count, 0)                     AS total_interactions,
       GREATEST(
         COALESCE(c.last_click_at,    '-infinity'::timestamptz),
         COALESCE(a.last_activity_at, '-infinity'::timestamptz),
         COALESCE(s.last_seen_at,     '-infinity'::timestamptz)
       )                                                    AS last_interaction_at
FROM clicks c
FULL OUTER JOIN activity a ON a.user_id = c.user_id AND a.app_id = c.app_id
FULL OUTER JOIN sessions s ON s.user_id = COALESCE(c.user_id, a.user_id)
                          AND s.app_id  = COALESCE(c.app_id,  a.app_id);

GRANT SELECT ON public.v_user_platform_usage TO authenticated;

-- Per-user top platform (for hub "jump back in" UI).
CREATE OR REPLACE VIEW public.v_user_top_platforms AS
SELECT user_id,
       app_id,
       click_count,
       activity_count,
       session_count,
       total_interactions,
       last_interaction_at,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_interactions DESC, last_interaction_at DESC) AS rank
FROM public.v_user_platform_usage;

GRANT SELECT ON public.v_user_top_platforms TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPCs — uniform logging API every platform can call
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_platform_click(
  p_platform TEXT,
  p_source   TEXT  DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aurzo_core
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.platform_clicks (user_id, platform_key, source, metadata)
  VALUES (v_uid, p_platform, p_source, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  -- Update app_access "first_used_at" / "last_used_at" in aurzo_core.
  INSERT INTO aurzo_core.app_access (user_id, app_id, enabled, first_used_at, last_used_at)
  VALUES (v_uid, aurzo_core.resolve_app_id(p_platform), true, NOW(), NOW())
  ON CONFLICT (user_id, app_id) DO UPDATE
  SET last_used_at  = NOW(),
      first_used_at = COALESCE(aurzo_core.app_access.first_used_at, EXCLUDED.first_used_at);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_platform_click(TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_platform_activity(
  p_platform TEXT,
  p_action   TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aurzo_core
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.platform_activity (user_id, platform, action, metadata)
  VALUES (v_uid, p_platform, p_action, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  INSERT INTO aurzo_core.activity_log (user_id, app_id, kind, title, metadata)
  VALUES (v_uid, aurzo_core.resolve_app_id(p_platform), p_action, p_action, COALESCE(p_metadata, '{}'::jsonb));

  INSERT INTO aurzo_core.app_access (user_id, app_id, enabled, first_used_at, last_used_at)
  VALUES (v_uid, aurzo_core.resolve_app_id(p_platform), true, NOW(), NOW())
  ON CONFLICT (user_id, app_id) DO UPDATE
  SET last_used_at  = NOW(),
      first_used_at = COALESCE(aurzo_core.app_access.first_used_at, EXCLUDED.first_used_at);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_platform_activity(TEXT, TEXT, JSONB) TO authenticated;

-- Most-used platforms for a given user (top N).
CREATE OR REPLACE FUNCTION public.get_user_top_platforms(p_limit INT DEFAULT 5)
RETURNS TABLE (
  app_id              TEXT,
  click_count         BIGINT,
  activity_count      BIGINT,
  session_count       BIGINT,
  total_interactions  BIGINT,
  last_interaction_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_id, click_count, activity_count, session_count,
         total_interactions, last_interaction_at
  FROM public.v_user_platform_usage
  WHERE user_id = auth.uid()
  ORDER BY total_interactions DESC, last_interaction_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_top_platforms(INT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. CROSS-SCHEMA SIGNUP — make sure aurzo_core.profiles exists for every user
--    in addition to the legacy public.user_profiles row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aurzo_core.ensure_profile(p_user_id UUID, p_email TEXT DEFAULT NULL, p_full_name TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO aurzo_core.profiles (id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE
  SET email      = COALESCE(EXCLUDED.email,      aurzo_core.profiles.email),
      full_name  = COALESCE(EXCLUDED.full_name,  aurzo_core.profiles.full_name),
      updated_at = NOW();
END;
$$;

-- Backfill aurzo_core.profiles for any existing users missing it.
INSERT INTO aurzo_core.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
FROM auth.users u
LEFT JOIN aurzo_core.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Useful covering indexes on existing activity tables
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_platform_activity_user_platform_time
  ON public.platform_activity (user_id, platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aurzo_core_activity_log_user_app_time
  ON aurzo_core.activity_log (user_id, app_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_aurzo_core_sessions_user_app
  ON aurzo_core.sessions (user_id, app_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_aurzo_core_app_access_user
  ON aurzo_core.app_access (user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_aurzo_core_entitlements_user_app
  ON aurzo_core.entitlements (user_id, app_id);

-- ---------------------------------------------------------------------------
-- 8. Entitlement helper — the single "can this user use this app?" check
--    (morning-growth-loop calls this after processing Stripe/etc. events.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_platform_access(p_user_id UUID, p_platform TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, aurzo_core
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_access
    WHERE user_id = p_user_id
      AND platform = p_platform
      AND is_active = true
      AND (subscription_ends_at IS NULL OR subscription_ends_at > NOW())
  )
  OR EXISTS (
    SELECT 1 FROM aurzo_core.entitlements
    WHERE user_id = p_user_id
      AND app_id  = aurzo_core.resolve_app_id(p_platform)
      AND (current_period_end IS NULL OR current_period_end > NOW())
      AND cancelled_at IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_memberships um
    JOIN public.membership_plans mp ON mp.id = um.plan_id
    WHERE um.user_id = p_user_id
      AND um.status = 'active'
      AND mp.name   = 'aurzo_premium'
      AND (um.current_period_end IS NULL OR um.current_period_end > NOW())
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_platform_access(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.me_has_platform_access(p_platform TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_platform_access(auth.uid(), p_platform);
$$;

GRANT EXECUTE ON FUNCTION public.me_has_platform_access(TEXT) TO authenticated;

COMMIT;
