-- Allow anon to insert into golem_state (scoped to whoop token persistence)
-- Idempotent: skips if policy already exists (applied directly before this migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golem_state'
      AND policyname = 'anon_insert_golem_state'
  ) THEN
    CREATE POLICY "anon_insert_golem_state" ON public.golem_state
      FOR INSERT TO anon
      WITH CHECK (key = 'whoop_refresh_token');
  END IF;
END $$;

-- Allow anon to update golem_state (scoped to whoop token rotation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golem_state'
      AND policyname = 'anon_update_golem_state'
  ) THEN
    CREATE POLICY "anon_update_golem_state" ON public.golem_state
      FOR UPDATE TO anon
      USING (key = 'whoop_refresh_token')
      WITH CHECK (key = 'whoop_refresh_token');
  END IF;
END $$;
