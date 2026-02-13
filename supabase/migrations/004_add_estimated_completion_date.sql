-- Add estimated_completion_date column to production_sheets
ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP WITH TIME ZONE;

-- Update existing "printing" records to "in_production"
UPDATE public.production_sheets SET status = 'in_production' WHERE status = 'printing';

-- Drop old status constraint and add new one with "in_production"
ALTER TABLE public.production_sheets DROP CONSTRAINT IF EXISTS production_sheets_status_check;
ALTER TABLE public.production_sheets
  ADD CONSTRAINT production_sheets_status_check
  CHECK (status IN ('draft', 'in_production', 'completed'));

-- Update analytics_events to accept "in_production" event type
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN ('created', 'printed', 'in_production', 'completed'));

-- Update existing "printed" analytics events to "in_production"
UPDATE public.analytics_events SET event_type = 'in_production' WHERE event_type = 'printed';

