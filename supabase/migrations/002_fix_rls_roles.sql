-- ============================================================
-- Migration 002: Fix RLS policies, add consultant/manager roles
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- ---- 1. Extend profiles.role to include consultant and manager ----

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('employee', 'consultant', 'manager', 'admin'));

-- Rename legacy 'employee' to 'consultant' for consistency
UPDATE public.profiles SET role = 'consultant' WHERE role = 'employee';

-- New users default to 'consultant'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'consultant'
  );
  RETURN NEW;
END;
$$;


-- ---- 2. Add is_manager() helper ----

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  );
$$;


-- ---- 3. Fix timesheets RLS policies ----

-- Root cause: the old UPDATE policy had no WITH CHECK clause.
-- PostgreSQL defaulted WITH CHECK = USING, so the new status='submitted'
-- row failed because 'submitted' NOT IN ('draft', 'rejected').

DROP POLICY IF EXISTS "Employees update own draft timesheets; admins update any" ON public.timesheets;
DROP POLICY IF EXISTS "Employees see own timesheets; admins see all" ON public.timesheets;
DROP POLICY IF EXISTS "Employees insert own timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Employees delete own draft timesheets" ON public.timesheets;

-- SELECT: own rows, or manager sees all, or admin sees all
CREATE POLICY "timesheets_select"
  ON public.timesheets FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_manager()
    OR public.is_admin()
  );

-- INSERT: consultants/employees insert their own rows
CREATE POLICY "timesheets_insert"
  ON public.timesheets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: explicit WITH CHECK so consultants can transition to 'submitted'
-- USING  → which existing rows may be touched
-- WITH CHECK → what the new row values must satisfy
CREATE POLICY "timesheets_update"
  ON public.timesheets FOR UPDATE
  USING (
    -- Consultants can edit their own draft or rejected timesheets
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    -- Managers can act on submitted timesheets
    OR (public.is_manager() AND status = 'submitted')
    -- Admins can touch anything
    OR public.is_admin()
  )
  WITH CHECK (
    -- Consultants may save as draft or submit their own timesheets
    (user_id = auth.uid() AND status IN ('draft', 'submitted'))
    -- Managers may approve or reject
    OR (public.is_manager() AND status IN ('approved', 'rejected'))
    -- Admins may set any status
    OR public.is_admin()
  );

-- DELETE: only own draft rows
CREATE POLICY "timesheets_delete"
  ON public.timesheets FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');


-- ---- 4. Fix timesheet_entries RLS policies ----

DROP POLICY IF EXISTS "Access entries via timesheet ownership" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Insert entries for own timesheets" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Delete entries for own timesheets" ON public.timesheet_entries;

CREATE POLICY "entries_select"
  ON public.timesheet_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id
        AND (t.user_id = auth.uid() OR public.is_manager() OR public.is_admin())
    )
  );

CREATE POLICY "entries_insert"
  ON public.timesheet_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id AND t.user_id = auth.uid()
    )
  );

-- UPDATE entries for own draft/rejected timesheets (for future direct-edit flows)
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

CREATE POLICY "entries_delete"
  ON public.timesheet_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = timesheet_id AND t.user_id = auth.uid()
    )
  );
