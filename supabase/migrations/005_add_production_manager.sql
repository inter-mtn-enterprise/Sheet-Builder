-- Add sort_order column to production_sheets for priority ordering
ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create sheet_dependencies table for Gantt dependency links
CREATE TABLE IF NOT EXISTS public.sheet_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  predecessor_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(predecessor_id, successor_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sheet_dependencies_predecessor ON public.sheet_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_sheet_dependencies_successor ON public.sheet_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_production_sheets_sort_order ON public.production_sheets(sort_order);

-- Enable Row Level Security
ALTER TABLE public.sheet_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheet_dependencies (all authenticated users can manage)
CREATE POLICY "Users can view all sheet dependencies"
  ON public.sheet_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Users can create sheet dependencies"
  ON public.sheet_dependencies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete sheet dependencies"
  ON public.sheet_dependencies FOR DELETE
  USING (true);
