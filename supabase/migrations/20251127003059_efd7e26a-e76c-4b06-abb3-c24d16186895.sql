-- Corriger le fuseau horaire pour la fonction auto_update_mission_status
CREATE OR REPLACE FUNCTION public.auto_update_mission_status()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_datetime timestamptz;
  current_date_local date;
  current_time_local time;
BEGIN
  -- Ne pas écraser si le statut est "annule" ou "a_attribuer"
  IF NEW.statut IN ('annule'::mission_status, 'a_attribuer'::mission_status) THEN
    RETURN NEW;
  END IF;

  -- Utiliser le fuseau horaire Europe/Brussels
  current_datetime := now() AT TIME ZONE 'Europe/Brussels';
  current_date_local := (current_datetime)::date;
  current_time_local := (current_datetime)::time;

  -- Calculer le statut basé sur la date et l'heure locale
  IF NEW.date > current_date_local THEN
    -- Mission dans le futur
    NEW.statut := 'planifie'::mission_status;
  ELSIF NEW.date < current_date_local THEN
    -- Mission dans le passé
    NEW.statut := 'termine'::mission_status;
  ELSE
    -- Mission aujourd'hui, vérifier l'heure
    IF NEW.heure_debut > current_time_local THEN
      NEW.statut := 'planifie'::mission_status;
    ELSIF NEW.heure_fin < current_time_local THEN
      NEW.statut := 'termine'::mission_status;
    ELSE
      NEW.statut := 'en_cours'::mission_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Mettre à jour toutes les missions existantes avec le bon fuseau horaire
DO $$
DECLARE
  current_datetime timestamptz;
  current_date_local date;
  current_time_local time;
BEGIN
  current_datetime := now() AT TIME ZONE 'Europe/Brussels';
  current_date_local := (current_datetime)::date;
  current_time_local := (current_datetime)::time;

  UPDATE public.missions
  SET statut = CASE
    WHEN statut IN ('annule'::mission_status, 'a_attribuer'::mission_status) THEN statut
    WHEN date > current_date_local THEN 'planifie'::mission_status
    WHEN date < current_date_local THEN 'termine'::mission_status
    WHEN heure_debut > current_time_local THEN 'planifie'::mission_status
    WHEN heure_fin < current_time_local THEN 'termine'::mission_status
    ELSE 'en_cours'::mission_status
  END
  WHERE statut NOT IN ('annule'::mission_status, 'a_attribuer'::mission_status);
END $$;