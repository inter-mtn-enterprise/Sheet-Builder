-- Migration: Fix category upsert by creating proper unique constraint
-- Supabase upsert requires a named unique constraint, not just a partial index

-- Drop the partial unique index we created
DROP INDEX IF EXISTS idx_product_categories_salesforce_id_unique;

-- Create a unique constraint that allows NULLs
-- PostgreSQL unique constraints allow multiple NULLs by default
-- We'll use a unique index with WHERE clause to enforce uniqueness only for non-NULL values
CREATE UNIQUE INDEX idx_product_categories_salesforce_id_unique
  ON public.product_categories(salesforce_id)
  WHERE salesforce_id IS NOT NULL;

-- Note: Supabase's upsert with onConflict should work with this unique index
-- If it doesn't, we may need to use a different approach in the import code

