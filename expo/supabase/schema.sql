-- Nettoyer complètement toutes les anciennes structures
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Supprimer toutes les politiques RLS
DROP POLICY IF EXISTS "Enable all operations for games" ON games;
DROP POLICY IF EXISTS "Enable all operations for players" ON players;
DROP POLICY IF EXISTS "Enable all operations for votes" ON votes;

-- Supprimer toutes les tables (CASCADE pour supprimer toutes les dépendances)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- Table pour les parties (admin_id peut être null maintenant)
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
  category_options TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  round_number INTEGER DEFAULT 0
);

-- Table pour les joueurs
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  card TEXT,
  player_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les votes
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, voter_id)
);

-- Table pour les statistiques de partie
CREATE TABLE game_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
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

-- Index pour améliorer les performances
CREATE INDEX idx_games_game_code ON games(game_code);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_votes_game_id ON votes(game_id);
CREATE INDEX idx_game_stats_game_id ON game_stats(game_id);

-- Function pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at sur games
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security) - Tout le monde peut tout lire/écrire pour ce jeu
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Autoriser toutes les opérations (adapté pour un jeu en soirée)
CREATE POLICY "Enable all operations for games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for votes" ON votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for game_stats" ON game_stats FOR ALL USING (true) WITH CHECK (true);
