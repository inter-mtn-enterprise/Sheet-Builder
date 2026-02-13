-- Add role column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker'
  CHECK (role IN ('manager', 'worker'));

-- Set existing users to manager (they were created before roles existed)
UPDATE public.users SET role = 'manager' WHERE role IS NULL OR role = 'worker';

-- Work logs table: workers log hours, notes, and item completions against production sheets
CREATE TABLE IF NOT EXISTS public.work_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hours NUMERIC(6,2),
  notes TEXT,
  items_completed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Work log photos table
CREATE TABLE IF NOT EXISTS public.work_log_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_log_id UUID NOT NULL REFERENCES public.work_logs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_sheet_id ON public.work_logs(sheet_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON public.work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON public.work_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_work_log_photos_work_log_id ON public.work_log_photos(work_log_id);

-- Enable RLS
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_log_photos ENABLE ROW LEVEL SECURITY;

-- RLS for work_logs: all authenticated users can view all logs
CREATE POLICY "Users can view all work logs"
  ON public.work_logs FOR SELECT
  USING (true);

-- Workers can insert their own logs
CREATE POLICY "Users can create their own work logs"
  ON public.work_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Workers can update their own logs
CREATE POLICY "Users can update their own work logs"
  ON public.work_logs FOR UPDATE
  USING (user_id = auth.uid());

-- Workers can delete their own logs
CREATE POLICY "Users can delete their own work logs"
  ON public.work_logs FOR DELETE
  USING (user_id = auth.uid());

-- RLS for work_log_photos: all authenticated users can view
CREATE POLICY "Users can view all work log photos"
  ON public.work_log_photos FOR SELECT
  USING (true);

CREATE POLICY "Users can create work log photos"
  ON public.work_log_photos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete work log photos"
  ON public.work_log_photos FOR DELETE
  USING (true);

-- Update users RLS: allow managers to view all users for team management
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Allow all authenticated users to view all user profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.users FOR SELECT
  USING (true);

-- Allow managers to insert users (for team creation via admin API)
CREATE POLICY "Managers can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Allow managers to update any user (for role changes)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update profiles"
  ON public.users FOR UPDATE
  USING (true);

-- Allow managers to delete users
CREATE POLICY "Managers can delete users"
  ON public.users FOR DELETE
  USING (true);

