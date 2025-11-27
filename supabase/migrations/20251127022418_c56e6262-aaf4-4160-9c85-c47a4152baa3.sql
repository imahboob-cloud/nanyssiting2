
-- 🔒 RENFORCEMENT SÉCURITÉ : Bloquer explicitement les accès anonymes non autorisés

-- Pour la table clients : Bloquer SELECT, UPDATE, DELETE pour non-authentifiés
-- (Le INSERT public existe déjà pour le formulaire de contact)
CREATE POLICY "Block anonymous select on clients"
ON public.clients
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous update on clients"
ON public.clients
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Block anonymous delete on clients"
ON public.clients
FOR DELETE
TO anon
USING (false);

-- Pour toutes les autres tables sensibles : Bloquer TOUT accès anonyme
CREATE POLICY "Block all anonymous access to company_info"
ON public.company_info
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to invoices"
ON public.invoices
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to missions"
ON public.missions
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to nannysitters"
ON public.nannysitters
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to quotes"
ON public.quotes
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to tarifs"
ON public.tarifs
TO anon
USING (false);

CREATE POLICY "Block all anonymous access to user_roles"
ON public.user_roles
TO anon
USING (false);
