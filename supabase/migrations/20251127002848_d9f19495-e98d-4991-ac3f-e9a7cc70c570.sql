-- Corriger le search_path pour la fonction auto_update_mission_status
CREATE OR REPLACE FUNCTION public.auto_update_mission_status()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ne pas écraser si le statut est "annule" ou "a_attribuer"
  IF NEW.statut IN ('annule'::mission_status, 'a_attribuer'::mission_status) THEN
    RETURN NEW;
  END IF;

  -- Calculer le statut basé sur la date et l'heure
  IF NEW.date > CURRENT_DATE THEN
    -- Mission dans le futur
    NEW.statut := 'planifie'::mission_status;
  ELSIF NEW.date < CURRENT_DATE THEN
    -- Mission dans le passé
    NEW.statut := 'termine'::mission_status;
  ELSE
    -- Mission aujourd'hui, vérifier l'heure
    IF NEW.heure_debut > CURRENT_TIME THEN
      NEW.statut := 'planifie'::mission_status;
    ELSIF NEW.heure_fin < CURRENT_TIME THEN
      NEW.statut := 'termine'::mission_status;
    ELSE
      NEW.statut := 'en_cours'::mission_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;