-- ============================================================
-- Migration 003: Fix admin visibility and approval RLS
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================
-- This migration uses a dynamic DO block to drop ALL policies
-- on timesheets and timesheet_entries regardless of their names,
-- then recreates them cleanly. Safe to re-run.
-- ============================================================

-- ---- 1. Ensure helper functions are up-to-date ----

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  );
$$;


-- ---- 2. Drop ALL policies on timesheets and timesheet_entries ----
-- (dynamic so it works regardless of current policy names)

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timesheets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.timesheets', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timesheet_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.timesheet_entries', pol.policyname);
  END LOOP;
END $$;


-- ---- 3. Timesheets policies (clean) ----

-- SELECT
-- Consultants see only their own rows.
-- Managers and admins see all rows.
CREATE POLICY "timesheets_select"
  ON public.timesheets FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_manager()
    OR public.is_admin()
  );

-- INSERT
-- Consultants can only insert rows where they are the owner.
CREATE POLICY "timesheets_insert"
  ON public.timesheets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE (with explicit WITH CHECK to avoid the default-to-USING trap)
-- USING  → which existing rows may be touched
-- WITH CHECK → what values the updated row may have
CREATE POLICY "timesheets_update"
  ON public.timesheets FOR UPDATE
  USING (
    -- Consultants: own draft/rejected rows
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    -- Managers: submitted rows only (to approve/reject)
    OR (public.is_manager() AND status = 'submitted')
    -- Admins: any row, any status
    OR public.is_admin()
  )
  WITH CHECK (
    -- Consultants: may save as draft or submit
    (user_id = auth.uid() AND status IN ('draft', 'submitted'))
    -- Managers: may approve or reject
    OR (public.is_manager() AND status IN ('approved', 'rejected'))
    -- Admins: may set any status
    OR public.is_admin()
  );

-- DELETE
-- Consultants can only delete their own draft rows.
CREATE POLICY "timesheets_delete"
  ON public.timesheets FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');


-- ---- 4. Timesheet entries policies (clean) ----

-- SELECT via parent timesheet ownership
CREATE POLICY "entries_select"
  ON public.timesheet_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id
        AND (t.user_id = auth.uid() OR public.is_manager() OR public.is_admin())
    )
  );

-- INSERT: only for own timesheets
CREATE POLICY "entries_insert"
  ON public.timesheet_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id AND t.user_id = auth.uid()
    )
  );

-- UPDATE: only for own draft/rejected timesheets
CREATE POLICY "entries_update"
  ON public.timesheet_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id
        AND t.user_id = auth.uid()
        AND t.status IN ('draft', 'rejected')
    )
  );

-- DELETE: only for own timesheets
CREATE POLICY "entries_delete"
  ON public.timesheet_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id AND t.user_id = auth.uid()
    )
  );


-- ---- 5. Verify (informational) ----
-- After running, you can check active policies with:
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename IN ('timesheets', 'timesheet_entries')
--   ORDER BY tablename, cmd;
