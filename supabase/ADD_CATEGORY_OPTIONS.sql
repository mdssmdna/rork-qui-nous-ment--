-- Ajouter la colonne category_options à la table games
ALTER TABLE games ADD COLUMN IF NOT EXISTS category_options TEXT;
