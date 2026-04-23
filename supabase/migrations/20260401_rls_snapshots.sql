-- Database Migration: 20260401_rls_snapshots.sql
-- Goal: Hardening Snapshot Security for Scripted Collection

-- 1. Enable RLS
ALTER TABLE public.traffic_snapshots ENABLE ROW LEVEL SECURITY;

-- 2. RESET POLICIES (Idempotency)
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.traffic_snapshots;
DROP POLICY IF EXISTS "Allow authenticated selects" ON public.traffic_snapshots;

-- 3. INSERT POLICY: Only authenticated users can save snapshots
CREATE POLICY "Allow authenticated inserts"
ON public.traffic_snapshots
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. SELECT POLICY: Authenticated users can view snapshots
CREATE POLICY "Allow authenticated selects"
ON public.traffic_snapshots
FOR SELECT
TO authenticated
USING (true);

-- 🛰️ Staff Engineer Audit Log (Optional but recommended)
COMMENT ON TABLE public.traffic_snapshots IS 'Stores gzipped real-time traffic captures. RLS enforced for authenticated service roles or users.';
