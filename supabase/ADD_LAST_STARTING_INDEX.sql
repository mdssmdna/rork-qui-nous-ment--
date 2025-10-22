-- Migration pour ajouter le champ last_starting_index
-- Exécutez ce script dans votre console Supabase SQL Editor

ALTER TABLE games ADD COLUMN IF NOT EXISTS last_starting_index INTEGER DEFAULT -1;
