-- Function to automatically assign owner role to specific email
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign owner role to contact@nannysitting.be
  IF NEW.email = 'contact@nannysitting.be' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to execute the function after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();