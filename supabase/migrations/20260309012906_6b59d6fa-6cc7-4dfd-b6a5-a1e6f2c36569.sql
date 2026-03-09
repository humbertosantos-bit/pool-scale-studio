
-- Create pool_models table for admin-managed pool catalog
CREATE TABLE public.pool_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  width_feet INTEGER NOT NULL DEFAULT 0,
  width_inches NUMERIC(4,1) NOT NULL DEFAULT 0,
  length_feet INTEGER NOT NULL DEFAULT 0,
  length_inches NUMERIC(4,1) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pool_models ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read pool models
CREATE POLICY "Authenticated users can view pool models"
  ON public.pool_models FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert pool models"
  ON public.pool_models FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update pool models"
  ON public.pool_models FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete pool models"
  ON public.pool_models FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for pool images
INSERT INTO storage.buckets (id, name, public) VALUES ('pool-images', 'pool-images', true);

-- Storage policies: anyone authenticated can read, admins can upload/delete
CREATE POLICY "Anyone can view pool images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pool-images');

CREATE POLICY "Admins can upload pool images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pool-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pool images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pool-images' AND public.has_role(auth.uid(), 'admin'));
