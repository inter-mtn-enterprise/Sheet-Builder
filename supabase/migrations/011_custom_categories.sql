-- Migration: Add support for custom categories
-- Makes salesforce_id nullable, adds is_custom flag, and updates constraints
-- to allow custom categories that persist through Salesforce imports

-- Step 1: Drop existing unique constraint on salesforce_id (to allow NULLs)
ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS product_categories_salesforce_id_key;

-- Step 2: Make salesforce_id nullable
ALTER TABLE public.product_categories
  ALTER COLUMN salesforce_id DROP NOT NULL;

-- Step 3: Add is_custom column
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false NOT NULL;

-- Step 4: Create new unique constraint that allows NULLs (PostgreSQL allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_salesforce_id_unique
  ON public.product_categories(salesforce_id)
  WHERE salesforce_id IS NOT NULL;

-- Step 5: Create index on is_custom for efficient filtering
CREATE INDEX IF NOT EXISTS idx_product_categories_is_custom
  ON public.product_categories(is_custom);

-- Step 6: Make salesforce fields nullable in assignments for custom categories
ALTER TABLE public.product_category_assignments
  ALTER COLUMN salesforce_product_id DROP NOT NULL;

ALTER TABLE public.product_category_assignments
  ALTER COLUMN salesforce_category_id DROP NOT NULL;

-- Step 7: Update RLS policies to allow managers to delete custom categories only
CREATE POLICY "Managers can delete custom categories"
  ON public.product_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
    AND is_custom = true
  );

-- Step 8: Update existing update policy to only allow updates to custom categories
DROP POLICY IF EXISTS "Managers can update categories" ON public.product_categories;

CREATE POLICY "Managers can update custom categories"
  ON public.product_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
    AND is_custom = true
  );

-- Step 9: Update insert policy to ensure custom categories have is_custom = true
DROP POLICY IF EXISTS "Managers can insert categories" ON public.product_categories;

CREATE POLICY "Managers can insert categories"
  ON public.product_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'manager'
    )
    AND (
      (is_custom = true AND salesforce_id IS NULL) OR
      (is_custom = false AND salesforce_id IS NOT NULL)
    )
  );

