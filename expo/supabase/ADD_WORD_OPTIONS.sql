-- Ajouter la colonne word_options à la table games
ALTER TABLE games ADD COLUMN IF NOT EXISTS word_options TEXT;
