-- ============================================================
-- Migration 008: Product-level status tracking for work logs
-- ============================================================

-- 1. Add status and completion tracking columns to sheet_items
ALTER TABLE public.sheet_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'working', 'partially_complete', 'complete'));

ALTER TABLE public.sheet_items
  ADD COLUMN IF NOT EXISTS qty_in_order_completed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.sheet_items
  ADD COLUMN IF NOT EXISTS stock_qty_completed INTEGER NOT NULL DEFAULT 0;

-- 2. Add product-tracking columns to work_logs
ALTER TABLE public.work_logs
  ADD COLUMN IF NOT EXISTS work_type TEXT NOT NULL DEFAULT 'log_completion'
    CHECK (work_type IN ('start_working', 'log_completion'));

ALTER TABLE public.work_logs
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.sheet_items(id) ON DELETE SET NULL;

-- 3. Update production_sheets status constraint to include 'production_started'
ALTER TABLE public.production_sheets
  DROP CONSTRAINT IF EXISTS production_sheets_status_check;

ALTER TABLE public.production_sheets
  ADD CONSTRAINT production_sheets_status_check
    CHECK (status IN ('draft', 'in_production', 'production_started', 'completed'));

-- Update any existing 'in_production' rows to 'production_started' since
-- 'in_production' was the old "sent to production" status and 'production_started'
-- means work has actually begun. Keep them as-is for now; both are valid.

-- 4. Index for the new item_id FK on work_logs
CREATE INDEX IF NOT EXISTS idx_work_logs_item_id ON public.work_logs(item_id);

-- 5. Index for sheet_items status for fast filtering
CREATE INDEX IF NOT EXISTS idx_sheet_items_status ON public.sheet_items(status);

