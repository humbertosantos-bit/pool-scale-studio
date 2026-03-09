
-- Drop the duplicate restrictive SELECT policies on pool_models
DROP POLICY IF EXISTS "Allow authenticated users to read pool_models" ON public.pool_models;
DROP POLICY IF EXISTS "Authenticated users can view pool models" ON public.pool_models;

-- Create a single PERMISSIVE SELECT policy
CREATE POLICY "Authenticated users can view pool models"
ON public.pool_models
FOR SELECT
TO authenticated
USING (true);
