-- Fix pool_models RLS policies: use permissive policies so catalog reads work in Add Pool dialog
ALTER TABLE public.pool_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Admins can insert pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Admins can update pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Admins can delete pool models" ON public.pool_models;

CREATE POLICY "Authenticated users can view pool models"
ON public.pool_models
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert pool models"
ON public.pool_models
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update pool models"
ON public.pool_models
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete pool models"
ON public.pool_models
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));