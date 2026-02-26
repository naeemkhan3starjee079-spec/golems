-- Enable RLS on EmailGolem tables
-- SECURITY FIX: Blocks anon key access, only service_role can query
-- Run via: Supabase Dashboard → SQL Editor → paste and run

-- Enable RLS (idempotent - safe to run multiple times)
ALTER TABLE IF EXISTS emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled (check output)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('emails', 'subscriptions', 'payments');
