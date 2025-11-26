-- Add INSERT policy for company_info table
CREATE POLICY "Owners can insert company info"
ON public.company_info
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));