
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Admins can delete pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Admins can insert pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Admins can update pool models" ON public.pool_models;

-- Recreate as permissive policies
CREATE POLICY "Admins can insert pool models" ON public.pool_models
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pool models" ON public.pool_models
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pool models" ON public.pool_models
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
