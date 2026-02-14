-- Migration: Add Salesforce ProductCategory support
-- Creates product_categories table, product_category_assignments junction table,
-- and adds primary_category_id to product_catalog for hybrid model

-- Step 1: Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salesforce_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  catalog_id TEXT,
  parent_category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Create product_category_assignments junction table
CREATE TABLE IF NOT EXISTS public.product_category_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  salesforce_product_id TEXT NOT NULL,
  salesforce_category_id TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, category_id)
);

-- Step 3: Add primary_category_id to product_catalog
ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS primary_category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_salesforce_id ON public.product_categories(salesforce_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_catalog_id ON public.product_categories(catalog_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_product_id ON public.product_category_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_category_id ON public.product_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_salesforce_product ON public.product_category_assignments(salesforce_product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_assignments_salesforce_category ON public.product_category_assignments(salesforce_category_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_primary_category_id ON public.product_catalog(primary_category_id);

-- Step 5: Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for product_categories
CREATE POLICY "Users can view all categories"
  ON public.product_categories FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert categories"
  ON public.product_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Managers can update categories"
  ON public.product_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

-- Step 7: RLS Policies for product_category_assignments
CREATE POLICY "Users can view all category assignments"
  ON public.product_category_assignments FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert category assignments"
  ON public.product_category_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Managers can update category assignments"
  ON public.product_category_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete category assignments"
  ON public.product_category_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
  );

