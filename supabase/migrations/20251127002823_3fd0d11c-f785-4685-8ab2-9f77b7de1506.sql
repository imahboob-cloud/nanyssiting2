-- Fonction pour calculer automatiquement le statut d'une mission
CREATE OR REPLACE FUNCTION public.auto_update_mission_status()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Créer un trigger qui s'exécute avant l'insertion ou la mise à jour
DROP TRIGGER IF EXISTS trigger_auto_update_mission_status ON public.missions;
CREATE TRIGGER trigger_auto_update_mission_status
  BEFORE INSERT OR UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_mission_status();

-- Mettre à jour toutes les missions existantes (sauf celles annulées ou à attribuer)
UPDATE public.missions
SET statut = CASE
  WHEN statut IN ('annule'::mission_status, 'a_attribuer'::mission_status) THEN statut
  WHEN date > CURRENT_DATE THEN 'planifie'::mission_status
  WHEN date < CURRENT_DATE THEN 'termine'::mission_status
  WHEN heure_debut > CURRENT_TIME THEN 'planifie'::mission_status
  WHEN heure_fin < CURRENT_TIME THEN 'termine'::mission_status
  ELSE 'en_cours'::mission_status
END
WHERE statut NOT IN ('annule'::mission_status, 'a_attribuer'::mission_status);