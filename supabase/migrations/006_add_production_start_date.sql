-- Add production_start_date to allow scheduling when a job starts
ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS production_start_date DATE;

-- When null, the gantt chart falls back to created_at

