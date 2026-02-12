-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase Auth handles auth.users, this is for app-specific user data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sheet templates table
CREATE TABLE IF NOT EXISTS public.sheet_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  field_definitions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Production sheets table
CREATE TABLE IF NOT EXISTS public.production_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.sheet_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'printing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Sheet items table
CREATE TABLE IF NOT EXISTS public.sheet_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  banner_sku TEXT NOT NULL,
  banner_name TEXT,
  image_url TEXT,
  quantity INTEGER DEFAULT 1,
  qty_in_order INTEGER DEFAULT 0,
  stock_qty INTEGER DEFAULT 0,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Banner catalog table
CREATE TABLE IF NOT EXISTS public.banner_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT,
  product_code TEXT,
  image_url TEXT,
  category TEXT,
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'printed', 'completed')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sheet_templates_user_id ON public.sheet_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sheet_templates_is_shared ON public.sheet_templates(is_shared);
CREATE INDEX IF NOT EXISTS idx_production_sheets_user_id ON public.production_sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_production_sheets_template_id ON public.production_sheets(template_id);
CREATE INDEX IF NOT EXISTS idx_production_sheets_status ON public.production_sheets(status);
CREATE INDEX IF NOT EXISTS idx_sheet_items_sheet_id ON public.sheet_items(sheet_id);
CREATE INDEX IF NOT EXISTS idx_banner_catalog_sku ON public.banner_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_banner_catalog_category ON public.banner_catalog(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_sheet_id ON public.analytics_events(sheet_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for sheet_templates
CREATE POLICY "Users can view their own templates or shared templates"
  ON public.sheet_templates FOR SELECT
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can create their own templates"
  ON public.sheet_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.sheet_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.sheet_templates FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for production_sheets
CREATE POLICY "Users can view all sheets (shared access)"
  ON public.production_sheets FOR SELECT
  USING (true);

CREATE POLICY "Users can create sheets"
  ON public.production_sheets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update sheets"
  ON public.production_sheets FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete sheets"
  ON public.production_sheets FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for sheet_items
CREATE POLICY "Users can view all sheet items"
  ON public.sheet_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create sheet items"
  ON public.sheet_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update sheet items"
  ON public.sheet_items FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete sheet items"
  ON public.sheet_items FOR DELETE
  USING (true);

-- RLS Policies for banner_catalog
CREATE POLICY "Users can view all banners"
  ON public.banner_catalog FOR SELECT
  USING (true);

CREATE POLICY "Users can create banners"
  ON public.banner_catalog FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update banners"
  ON public.banner_catalog FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete banners"
  ON public.banner_catalog FOR DELETE
  USING (true);

-- RLS Policies for analytics_events
CREATE POLICY "Users can view all analytics events"
  ON public.analytics_events FOR SELECT
  USING (true);

CREATE POLICY "Users can create analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, image)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

