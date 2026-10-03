-- Supabase serves every table in the public schema over its REST API, and
-- the publishable key that unlocks it ships to every browser. AROHA never
-- uses that API: the server talks to Postgres directly as the table owner,
-- which row level security does not restrict. Turning RLS on with no
-- policies therefore closes the REST API completely and changes nothing for
-- the app. (Plain Postgres ignores this for the owner too.)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
