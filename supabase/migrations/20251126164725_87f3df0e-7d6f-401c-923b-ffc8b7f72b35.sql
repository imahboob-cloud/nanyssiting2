-- Modifier la table missions pour avoir date + heures au lieu de datetime
ALTER TABLE missions 
  RENAME COLUMN date_debut TO date;

ALTER TABLE missions 
  DROP COLUMN date_fin;

ALTER TABLE missions 
  ADD COLUMN heure_debut TIME NOT NULL DEFAULT '09:00:00',
  ADD COLUMN heure_fin TIME NOT NULL DEFAULT '18:00:00';

-- Mettre à jour les données existantes (extraire les heures)
UPDATE missions 
SET heure_debut = date::time,
    heure_fin = (date + INTERVAL '4 hours')::time;

-- Convertir la colonne date en DATE uniquement
ALTER TABLE missions 
  ALTER COLUMN date TYPE DATE USING date::DATE;