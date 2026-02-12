-- Migration: Add product filtering columns to sheet_templates

-- Add categories_to_include column (array of category strings)
ALTER TABLE public.sheet_templates
  ADD COLUMN IF NOT EXISTS categories_to_include JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add products_to_include column (array of product SKUs)
ALTER TABLE public.sheet_templates
  ADD COLUMN IF NOT EXISTS products_to_include JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add products_to_exclude column (array of product SKUs)
ALTER TABLE public.sheet_templates
  ADD COLUMN IF NOT EXISTS products_to_exclude JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add categories_to_exclude column (array of category strings)
ALTER TABLE public.sheet_templates
  ADD COLUMN IF NOT EXISTS categories_to_exclude JSONB NOT NULL DEFAULT '[]'::jsonb;

