-- Migration: Rename banner_catalog to product_catalog and add product_id field

-- Step 1: Create new product_catalog table with product_id field
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT, -- Salesforce Product ID
  sku TEXT NOT NULL UNIQUE,
  name TEXT,
  product_code TEXT,
  image_url TEXT,
  category TEXT,
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Migrate data from banner_catalog to product_catalog (if banner_catalog exists)
-- This ensures all existing banner data is preserved in product_catalog
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'banner_catalog') THEN
    INSERT INTO public.product_catalog (id, sku, name, product_code, image_url, category, imported_by, created_at)
    SELECT id, sku, name, product_code, image_url, category, imported_by, created_at
    FROM public.banner_catalog
    ON CONFLICT (sku) DO UPDATE SET
      name = EXCLUDED.name,
      product_code = EXCLUDED.product_code,
      image_url = COALESCE(EXCLUDED.image_url, product_catalog.image_url),
      category = EXCLUDED.category,
      updated_at = TIMEZONE('utc'::text, NOW());
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_catalog_sku ON public.product_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_product_catalog_product_id ON public.product_catalog(product_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON public.product_catalog(category);

-- Step 4: Enable Row Level Security
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for product_catalog (drop existing if they exist, then create)
DROP POLICY IF EXISTS "Users can view all products" ON public.product_catalog;
DROP POLICY IF EXISTS "Users can create products" ON public.product_catalog;
DROP POLICY IF EXISTS "Users can update products" ON public.product_catalog;
DROP POLICY IF EXISTS "Users can delete products" ON public.product_catalog;

CREATE POLICY "Users can view all products"
  ON public.product_catalog FOR SELECT
  USING (true);

CREATE POLICY "Users can create products"
  ON public.product_catalog FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update products"
  ON public.product_catalog FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete products"
  ON public.product_catalog FOR DELETE
  USING (true);

-- Step 6: Drop old banner_catalog table after migration
DROP TABLE IF EXISTS public.banner_catalog CASCADE;


