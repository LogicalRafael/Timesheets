-- ============================================================
-- LogicalJupiter — Supabase Schema (source of truth)
-- Run this only on a fresh project.
-- For existing databases use supabase/migrations/ instead.
-- ============================================================

-- ---- Profiles -----------------------------------------------
CREATE TABLE public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role      TEXT NOT NULL DEFAULT 'consultant'
            CHECK (role IN ('consultant', 'manager', 'admin', 'employee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on sign-up
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: current user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  );
$$;

-- RLS: profiles
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE USING (id = auth.uid());


-- ---- Timesheets ---------------------------------------------
CREATE TABLE public.timesheets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_hours  NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_select"
  ON public.timesheets FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_manager()
    OR public.is_admin()
  );

CREATE POLICY "timesheets_insert"
  ON public.timesheets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Explicit WITH CHECK prevents the implicit default (= USING) that would block
-- consultants from changing status to 'submitted'.
CREATE POLICY "timesheets_update"
  ON public.timesheets FOR UPDATE
  USING (
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR (public.is_manager() AND status = 'submitted')
    OR public.is_admin()
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('draft', 'submitted'))
    OR (public.is_manager() AND status IN ('approved', 'rejected'))
    OR public.is_admin()
  );

CREATE POLICY "timesheets_delete"
  ON public.timesheets FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');


-- ---- Timesheet Entries --------------------------------------
CREATE TABLE public.timesheet_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id  UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  hours         NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  description   TEXT,
  UNIQUE (timesheet_id, work_date)
);

ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

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


-- ---- Vacation Requests --------------------------------------
CREATE TABLE public.vacation_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL CHECK (end_date >= start_date),
  type         TEXT NOT NULL CHECK (type IN ('vacation', 'sick_leave', 'personal')),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  reason       TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacation_select"
  ON public.vacation_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "vacation_insert"
  ON public.vacation_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vacation_delete"
  ON public.vacation_requests FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "vacation_update"
  ON public.vacation_requests FOR UPDATE
  USING (public.is_admin());
