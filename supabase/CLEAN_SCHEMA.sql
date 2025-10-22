-- ========================================
-- SCHEMA COMPLET POUR LE JEU MENTEUR
-- ========================================
-- Ce script supprime et recrée toutes les tables
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ÉTAPE 1: Nettoyer complètement la base de données
-- ========================================

-- Supprimer les triggers
DROP TRIGGER IF EXISTS update_games_updated_at ON games CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Enable all operations for games" ON games;
DROP POLICY IF EXISTS "Enable all operations for players" ON players;
DROP POLICY IF EXISTS "Enable all operations for votes" ON votes;
DROP POLICY IF EXISTS "Enable all operations for game_stats" ON game_stats;

-- Supprimer les tables (CASCADE supprime toutes les dépendances)
DROP TABLE IF EXISTS game_stats CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;


-- ÉTAPE 2: Créer les tables
-- ========================================

-- Table principale des parties
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT UNIQUE NOT NULL,
  admin_id UUID,
  phase TEXT NOT NULL DEFAULT 'admin-lobby',
  current_word TEXT,
  word_category TEXT,
  liar_id UUID,
  starting_player_id UUID,
  last_starting_index INTEGER DEFAULT -1,
  time_left INTEGER DEFAULT 0,
  tie_breaker_id UUID,
  winner TEXT,
  round_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des joueurs
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  card TEXT,
  player_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des votes
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, voter_id)
);

-- Table des statistiques de partie
CREATE TABLE game_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  liar_player_id UUID NOT NULL,
  liar_player_name TEXT NOT NULL,
  eliminated_player_id UUID NOT NULL,
  eliminated_player_name TEXT NOT NULL,
  liar_won BOOLEAN NOT NULL,
  word TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ÉTAPE 3: Créer les index pour améliorer les performances
-- ========================================

CREATE INDEX idx_games_game_code ON games(game_code);
CREATE INDEX idx_games_phase ON games(phase);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_is_admin ON players(is_admin);
CREATE INDEX idx_players_player_order ON players(player_order);
CREATE INDEX idx_votes_game_id ON votes(game_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_game_stats_game_id ON game_stats(game_id);
CREATE INDEX idx_game_stats_round_number ON game_stats(round_number);


-- ÉTAPE 4: Créer les fonctions
-- ========================================

-- Fonction pour mettre à jour automatiquement le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ÉTAPE 5: Créer les triggers
-- ========================================

CREATE TRIGGER update_games_updated_at 
BEFORE UPDATE ON games
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();


-- ÉTAPE 6: Activer Row Level Security (RLS)
-- ========================================

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;


-- ÉTAPE 7: Créer les politiques RLS
-- ========================================
-- Pour un jeu en soirée entre amis, on autorise tout le monde à tout faire

CREATE POLICY "Enable all operations for games" 
ON games 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all operations for players" 
ON players 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all operations for votes" 
ON votes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all operations for game_stats" 
ON game_stats 
FOR ALL 
USING (true) 
WITH CHECK (true);


-- ÉTAPE 8: Activer Realtime pour toutes les tables
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE game_stats;


-- ========================================
-- FIN DU SCHEMA
-- ========================================
-- Votre base de données est maintenant prête!
