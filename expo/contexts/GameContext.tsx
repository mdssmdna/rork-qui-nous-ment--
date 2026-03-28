import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRandomWord, WordData, WORDS_DATABASE } from "@/mocks/words";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type GamePhase =
  | "welcome"
  | "auth"
  | "admin-lobby"
  | "player-join"
  | "waiting-room"
  | "category-selection"
  | "card-reveal"
  | "voting"
  | "tie-breaker"
  | "results";

export interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
  card?: string;
  vote?: string;
  playerOrder?: number;
}

export interface GameStat {
  id: string;
  roundNumber: number;
  liarPlayerId: string;
  liarPlayerName: string;
  eliminatedPlayerId: string;
  eliminatedPlayerName: string;
  liarWon: boolean;
  word: string;
  category: string;
  createdAt: string;
}



export interface WordOption {
  word: string;
  category: string;
}

export interface GameState {
  gameCode: string;
  players: Player[];
  phase: GamePhase;
  currentWord: WordData | null;
  liarId: string | null;
  startingPlayerId: string | null;
  votes: Record<string, string>;
  timeLeft: number;
  tieBreakerId: string | null;
  winner: "players" | "liar" | null;
  roundNumber: number;
  stats: GameStat[];
  categoryOptions: string[];
  wordOptions: WordOption[];
}

const STORAGE_KEY = "@current_player";

export const [GameProvider, useGame] = createContextHook(() => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    gameCode: "",
    players: [],
    phase: "welcome",
    currentWord: null,
    liarId: null,
    startingPlayerId: null,
    votes: {},
    timeLeft: 0,
    tieBreakerId: null,
    winner: null,
    roundNumber: 0,
    stats: [],
    categoryOptions: [],
    wordOptions: [],
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const votesProcessedRef = useRef<boolean>(false);
  const resultShownRef = useRef<boolean>(false);

  const loadGameState = useCallback(async (gameId: string) => {
    try {
      const { data: games, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId);

      if (gameError) {
        console.log('⚠️ Game query error:', gameError.message);
        throw gameError;
      }
      if (!games || games.length === 0) {
        console.log('⚠️ Game not found:', gameId);
        throw new Error('Partie non trouvée');
      }
      
      const game = games[0];

      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId);

      if (playersError) throw playersError;

      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('game_id', gameId);

      if (votesError) throw votesError;

      const { data: stats, error: statsError } = await supabase
        .from('game_stats')
        .select('*')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true });

      if (statsError) throw statsError;

      const votesRecord: Record<string, string> = {};
      votes?.forEach((vote) => {
        votesRecord[vote.voter_id] = vote.target_id;
      });

      const wordData = game.current_word
        ? { word: game.current_word, category: game.word_category || '' }
        : null;

      const sortedPlayers = players?.sort((a, b) => (a.player_order || 0) - (b.player_order || 0)) || [];

      const categoryOptions = game.category_options ? JSON.parse(game.category_options) : [];
      const wordOptions = game.word_options ? JSON.parse(game.word_options) : [];

      setGameState({
        gameCode: game.game_code,
        players: sortedPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          isAdmin: p.is_admin,
          card: p.card || undefined,
          playerOrder: p.player_order || 0,
        })),
        phase: game.phase as GamePhase,
        currentWord: wordData,
        liarId: game.liar_id,
        startingPlayerId: game.starting_player_id || null,
        votes: votesRecord,
        timeLeft: game.time_left,
        tieBreakerId: game.tie_breaker_id,
        winner: game.winner as any,
        roundNumber: game.round_number || 0,
        stats: stats?.map((s) => ({
          id: s.id,
          roundNumber: s.round_number,
          liarPlayerId: s.liar_player_id,
          liarPlayerName: s.liar_player_name,
          eliminatedPlayerId: s.eliminated_player_id,
          eliminatedPlayerName: s.eliminated_player_name,
          liarWon: s.liar_won,
          word: s.word,
          category: s.category,
          createdAt: s.created_at,
        })) || [],
        categoryOptions,
        wordOptions,
      });

      gameIdRef.current = gameId;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.log("⚠️ Could not load game state:", errorMessage);
      throw error;
    }
  }, []);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetGame = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    votesProcessedRef.current = false;
    resultShownRef.current = false;
    setCurrentPlayer(null);
    gameIdRef.current = null;
    const emptyState = {
      gameCode: "",
      players: [],
      phase: "welcome" as GamePhase,
      currentWord: null,
      liarId: null,
      startingPlayerId: null,
      votes: {},
      timeLeft: 0,
      tieBreakerId: null,
      winner: null,
      roundNumber: 0,
      stats: [],
      categoryOptions: [],
      wordOptions: [],
    };
    setGameState(emptyState);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const subscribeToGame = useCallback((gameId: string) => {
    console.log('🔔 Setting up realtime subscription for game:', gameId);
    
    if (channelRef.current) {
      console.log('🔔 Removing old channel');
      supabase.removeChannel(channelRef.current);
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const channel = supabase
      .channel(`game:${gameId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: gameId },
        },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        async (payload) => {
          console.log('🔔 Realtime: games table changed', payload.eventType);
          if (payload.eventType === 'DELETE') {
            console.log('🚨 Game deleted - Admin left the game');
            await resetGame();
            return;
          }
          loadGameState(gameId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          console.log('🔔 Realtime: players table changed', payload.eventType);
          loadGameState(gameId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
        (payload) => {
          console.log('🔔 Realtime: votes table changed', payload.eventType);
          loadGameState(gameId);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
      });

    channelRef.current = channel;

    console.log('⏱️ Starting polling (every 1000ms)');
    pollingIntervalRef.current = setInterval(() => {
      console.log('⏱️ Polling game state...');
      loadGameState(gameId);
    }, 1000);
  }, [loadGameState, resetGame]);



  const loadCurrentPlayerRef = useRef<boolean>(false);

  const loadCurrentPlayer = useCallback(async () => {
    if (loadCurrentPlayerRef.current) {
      return;
    }
    loadCurrentPlayerRef.current = true;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const player = JSON.parse(stored);
        if (player.gameId) {
          try {
            await loadGameState(player.gameId);
            setCurrentPlayer(player);
            subscribeToGame(player.gameId);
            console.log('✅ Successfully restored game session');
          } catch (error: any) {
            console.log('⚠️ Stored game no longer exists, clearing storage');
            await AsyncStorage.removeItem(STORAGE_KEY);
            setCurrentPlayer(null);
            setGameState({
              gameCode: "",
              players: [],
              phase: "welcome",
              currentWord: null,
              liarId: null,
              startingPlayerId: null,
              votes: {},
              timeLeft: 0,
              tieBreakerId: null,
              winner: null,
              roundNumber: 0,
              stats: [],
              categoryOptions: [],
              wordOptions: [],
            });
          }
        }
      }
    } catch (error: any) {
      console.log('⚠️ Error reading AsyncStorage, clearing...');
      await AsyncStorage.removeItem(STORAGE_KEY);
      setCurrentPlayer(null);
    }
  }, [loadGameState, subscribeToGame]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await loadCurrentPlayer();
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);



  const generateGameCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createGame = useCallback(async (playerName: string) => {
    try {
      console.log('🎮 Creating game...');
      const gameCode = generateGameCode();
      console.log('🔑 Generated code:', gameCode);

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          game_code: gameCode,
          admin_id: null,
          phase: 'admin-lobby',
        })
        .select()
        .single();

      if (gameError) {
        console.error('❌ Game creation error:', gameError);
        const errorMsg = gameError?.message || gameError?.toString() || 'Erreur inconnue';
        throw new Error(`Erreur lors de la création de la partie: ${errorMsg}`);
      }

      console.log('✅ Game created:', game.id);

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          name: playerName,
          is_admin: true,
          player_order: 0,
        })
        .select()
        .single();

      if (playerError) {
        console.error('❌ Player creation error:', playerError);
        const errorMsg = playerError?.message || playerError?.toString() || 'Erreur inconnue';
        throw new Error(`Erreur lors de la création du joueur: ${errorMsg}`);
      }

      console.log('✅ Admin player created:', player.id);

      const adminPlayer: Player = {
        id: player.id,
        name: player.name,
        isAdmin: player.is_admin,
      };

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...adminPlayer, gameId: game.id })
      );

      console.log('✅ Admin saved to AsyncStorage');

      setCurrentPlayer(adminPlayer);
      const gameId = game.id;
      await loadGameState(gameId);
      subscribeToGame(gameId);
      
      console.log('✅ Game creation complete!');
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error('❌ Error creating game:', errorMessage, error);
      throw new Error(errorMessage);
    }
  }, [loadGameState, subscribeToGame]);

  const joinGame = useCallback(async (gameCode: string, playerName: string) => {
    try {
      console.log("🔍 Attempting to join game with code:", gameCode);

      const { data: games, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', gameCode);

      console.log("📊 Query result:", { games, error: gameError });

      if (gameError) {
        console.error("❌ Database error:", gameError);
        throw new Error(`Erreur base de données: ${gameError.message}`);
      }

      if (!games || games.length === 0) {
        console.error("❌ No game found with code:", gameCode);
        throw new Error("Partie non trouvée. Vérifiez le code.");
      }

      const game = games[0];
      console.log("✅ Game found:", game.id, "Phase:", game.phase);

      if (game.phase !== "admin-lobby" && game.phase !== "waiting-room") {
        throw new Error("La partie a déjà commencé");
      }

      const { data: existingPlayers } = await supabase
        .from('players')
        .select('player_order')
        .eq('game_id', game.id)
        .order('player_order', { ascending: false })
        .limit(1);

      const maxOrder = existingPlayers && existingPlayers.length > 0 ? existingPlayers[0].player_order : -1;
      const newPlayerOrder = maxOrder + 1;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          name: playerName,
          is_admin: false,
          player_order: newPlayerOrder,
        })
        .select()
        .single();

      if (playerError) {
        console.error("❌ Player creation error:", playerError);
        throw new Error(`Erreur lors de la création du joueur: ${playerError.message}`);
      }

      console.log("✅ Player created:", player.id);

      await supabase
        .from('games')
        .update({ phase: 'waiting-room' })
        .eq('id', game.id);

      const newPlayer: Player = {
        id: player.id,
        name: player.name,
        isAdmin: player.is_admin,
      };

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...newPlayer, gameId: game.id })
      );

      setCurrentPlayer(newPlayer);
      const gameId = game.id;
      await loadGameState(gameId);
      subscribeToGame(gameId);

      console.log("✅ Game joined successfully");
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error("❌ Error joining game:", errorMessage, error);
      throw new Error(errorMessage);
    }
  }, [loadGameState, subscribeToGame]);

  const startCategorySelection = useCallback(async () => {
    if (!gameIdRef.current) return;

    try {
      console.log('🎯 Starting word selection...');
      
      const { data: currentGame } = await supabase
        .from('games')
        .select('last_starting_index')
        .eq('id', gameIdRef.current)
        .single();

      const lastStartingIndex = currentGame?.last_starting_index ?? -1;
      const nextStartingIndex = (lastStartingIndex + 1) % gameState.players.length;
      const startingPlayerId = gameState.players[nextStartingIndex].id;

      const liarIndex = Math.floor(Math.random() * gameState.players.length);
      const liarId = gameState.players[liarIndex].id;

      const categories = Array.from(new Set(WORDS_DATABASE.map(w => w.category)));
      const shuffled = categories.sort(() => Math.random() - 0.5);
      const selectedCategories = shuffled.slice(0, 2);

      const wordOptions: WordOption[] = [];
      selectedCategories.forEach(category => {
        const wordsInCategory = WORDS_DATABASE.filter(w => w.category === category);
        const shuffledWords = wordsInCategory.sort(() => Math.random() - 0.5);
        const selectedWords = shuffledWords.slice(0, 5);
        wordOptions.push(...selectedWords);
      });

      console.log('🎯 Categories:', selectedCategories, '| Starting:', startingPlayerId, '| Liar:', liarId);
      console.log('🎯 Word options:', wordOptions);

      const { error: gameError } = await supabase
        .from('games')
        .update({
          phase: 'category-selection',
          starting_player_id: startingPlayerId,
          last_starting_index: nextStartingIndex,
          category_options: JSON.stringify(selectedCategories),
          word_options: JSON.stringify(wordOptions),
          liar_id: liarId,
        })
        .eq('id', gameIdRef.current);

      if (gameError) {
        console.error('❌ Error updating game for word selection:', gameError);
        const errorMsg = gameError?.message || JSON.stringify(gameError) || 'Unknown error';
        throw new Error(`Failed to start word selection: ${errorMsg}`);
      }

      console.log('✅ Word selection started with liar already assigned');
      await loadGameState(gameIdRef.current);
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error) || 'Unknown error';
      console.error('❌ Error starting word selection:', errorMsg, error);
      throw new Error(errorMsg.includes('Failed to') ? errorMsg : `Error starting word selection: ${errorMsg}`);
    }
  }, [gameState.players, loadGameState]);

  const selectWordAndDistribute = useCallback(async (selectedWord: WordOption) => {
    if (!gameIdRef.current) return;

    try {
      console.log('🎴 Distributing cards with word:', selectedWord);
      
      const { data: currentGame } = await supabase
        .from('games')
        .select('liar_id')
        .eq('id', gameIdRef.current)
        .single();

      const liarId = currentGame?.liar_id;
      if (!liarId) {
        throw new Error('Liar ID not found');
      }

      console.log('🎴 Word:', selectedWord.word, '| Category:', selectedWord.category, '| Liar:', liarId);

      const { error: gameError } = await supabase
        .from('games')
        .update({
          phase: 'card-reveal',
          current_word: selectedWord.word,
          word_category: selectedWord.category,
          category_options: null,
          word_options: null,
        })
        .eq('id', gameIdRef.current);

      if (gameError) {
        console.error('❌ Error updating game for card distribution:', gameError);
        const errorMsg = gameError?.message || JSON.stringify(gameError) || 'Unknown error';
        throw new Error(`Failed to update game for card distribution: ${errorMsg}`);
      }

      console.log('✅ Game updated to card-reveal phase');

      for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        const card = player.id === liarId ? "MENTEUR" : selectedWord.word;
        const { error: playerError } = await supabase
          .from('players')
          .update({ card })
          .eq('id', player.id);
        
        if (playerError) {
          console.error(`❌ Error updating player ${player.name}:`, playerError);
          const errorMsg = playerError?.message || JSON.stringify(playerError) || 'Unknown error';
          throw new Error(`Failed to distribute card to ${player.name}: ${errorMsg}`);
        }
        console.log(`✅ Card distributed to ${player.name}: ${card}`);
      }

      console.log('🎴 All cards distributed successfully!');
      
      await loadGameState(gameIdRef.current);
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error) || 'Unknown error';
      console.error('❌ Error distributing cards:', errorMsg, error);
      throw new Error(errorMsg.includes('Failed to') ? errorMsg : `Error distributing cards: ${errorMsg}`);
    }
  }, [gameState.players, loadGameState]);

  const showResults = useCallback(
    async (eliminatedId: string, liarId: string) => {
      if (!gameIdRef.current) return;

      if (resultShownRef.current) {
        console.log('⛔ Results already shown, skipping...');
        return;
      }

      console.log('🔒 LOCKING RESULTS NOW');
      resultShownRef.current = true;
      votesProcessedRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const winner = eliminatedId === liarId ? "players" : "liar";
      const liarWon = winner === "liar";

      console.log('=== SHOWING RESULTS ===');
      console.log('Eliminated player:', eliminatedId);
      console.log('Liar ID:', liarId);
      console.log('Winner:', winner);

      try {
        const { data: currentGame } = await supabase
          .from('games')
          .select('round_number, current_word, word_category')
          .eq('id', gameIdRef.current)
          .single();

        if (currentGame) {
          const { data: liarPlayer } = await supabase
            .from('players')
            .select('name')
            .eq('id', liarId)
            .single();

          const { data: eliminatedPlayer } = await supabase
            .from('players')
            .select('name')
            .eq('id', eliminatedId)
            .single();

          const newRoundNumber = (currentGame.round_number || 0) + 1;

          await supabase
            .from('game_stats')
            .insert({
              game_id: gameIdRef.current,
              round_number: newRoundNumber,
              liar_player_id: liarId,
              liar_player_name: liarPlayer?.name || 'Unknown',
              eliminated_player_id: eliminatedId,
              eliminated_player_name: eliminatedPlayer?.name || 'Unknown',
              liar_won: liarWon,
              word: currentGame.current_word || '',
              category: currentGame.word_category || '',
            });

          await supabase
            .from('games')
            .update({
              phase: 'results',
              winner,
              time_left: 0,
              round_number: newRoundNumber,
            })
            .eq('id', gameIdRef.current);
        }
      } catch (error) {
        console.error('Error showing results:', error);
      }
    },
    []
  );

  const processVotes = useCallback(async () => {
    if (!gameIdRef.current) return;

    if (votesProcessedRef.current || resultShownRef.current) {
      console.log('⛔ Votes already processed or results shown, skipping...');
      return;
    }

    const { data: currentGames } = await supabase
      .from('games')
      .select('phase, liar_id')
      .eq('id', gameIdRef.current);
    
    const currentGame = currentGames?.[0];

    if (!currentGame || currentGame.phase === 'results' || currentGame.phase === 'tie-breaker') {
      console.log('⛔ Skipping processVotes - game phase is:', currentGame?.phase);
      return;
    }

    console.log('🔒 LOCKING VOTES - Setting flags NOW');
    votesProcessedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('⏱️ Timer cleared in processVotes');
    }

    const { data: allVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('game_id', gameIdRef.current);

    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameIdRef.current);

    if (!allVotes || !allPlayers) return;

    const totalPlayers = allPlayers.length;
    const totalVotes = allVotes.length;
    const liarId = currentGame.liar_id;

    console.log('=== VOTE PROCESSING ===');
    console.log('Total players:', totalPlayers);
    console.log('Total votes received:', totalVotes);
    console.log('All votes:', allVotes);
    console.log('Liar ID:', liarId);

    if (totalVotes === 0) {
      console.log('No votes, liar wins by default');
      const randomNonLiarId = allPlayers.find((p) => p.id !== liarId)?.id || '';
      await showResults(randomNonLiarId, liarId);
      return;
    }

    const voteCounts: Record<string, number> = {};
    allVotes.forEach((vote) => {
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
    });

    console.log('Vote counts per player:', voteCounts);

    const maxVotes = Math.max(...Object.values(voteCounts));
    const mostVotedPlayers = Object.keys(voteCounts).filter(
      (id) => voteCounts[id] === maxVotes
    );

    console.log('Max votes:', maxVotes);
    console.log('Players with most votes:', mostVotedPlayers);

    if (mostVotedPlayers.length === 1) {
      console.log('Clear winner - Eliminating player:', mostVotedPlayers[0]);
      const eliminatedPlayerName = allPlayers.find(p => p.id === mostVotedPlayers[0])?.name;
      const isLiarEliminated = mostVotedPlayers[0] === liarId;
      console.log(`${eliminatedPlayerName} eliminated (is liar: ${isLiarEliminated})`);
      await showResults(mostVotedPlayers[0], liarId);
    } else if (mostVotedPlayers.length > 1) {
      console.log('TRUE TIE DETECTED - Multiple players with', maxVotes, 'votes');
      console.log('Starting tie-breaker process...');
      
      const nonLiarPlayers = allPlayers.filter(
        (p) => p.id !== liarId
      );
      const randomPlayer =
        nonLiarPlayers[Math.floor(Math.random() * nonLiarPlayers.length)];

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      await supabase
        .from('games')
        .update({
          phase: 'tie-breaker',
          tie_breaker_id: randomPlayer.id,
          time_left: 10,
        })
        .eq('id', gameIdRef.current);

      let timeLeft = 10;
      timerRef.current = setInterval(async () => {
        timeLeft -= 1;
        await supabase
          .from('games')
          .update({ time_left: timeLeft })
          .eq('id', gameIdRef.current!);

        if (timeLeft <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          console.log('Tie-breaker timeout - Eliminating first tied player:', mostVotedPlayers[0]);
          await showResults(mostVotedPlayers[0], liarId);
        }
      }, 1000);
    }
  }, [showResults]);

  const startVoting = useCallback(async () => {
    if (!gameIdRef.current) return;

    try {
      console.log('🔄 Starting new voting round - RESETTING ALL FLAGS AND TIMER');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      votesProcessedRef.current = false;
      resultShownRef.current = false;

      await supabase
        .from('votes')
        .delete()
        .eq('game_id', gameIdRef.current);

      await supabase
        .from('games')
        .update({
          phase: 'voting',
          time_left: 10,
        })
        .eq('id', gameIdRef.current);

      let timeLeft = 10;

      timerRef.current = setInterval(async () => {
        if (votesProcessedRef.current || resultShownRef.current) {
          console.log('⛔ Votes already processed, stopping timer immediately');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        timeLeft -= 1;
        console.log(`⏱️ Voting timer: ${timeLeft}s remaining`);
        await supabase
          .from('games')
          .update({ time_left: timeLeft })
          .eq('id', gameIdRef.current!);

        if (timeLeft <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (!votesProcessedRef.current && !resultShownRef.current) {
            console.log('⏱️ Timer expired, processing votes...');
            await processVotes();
          } else {
            console.log('⛔ Timer expired but votes already processed');
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting voting:', error);
    }
  }, [processVotes]);

  const vote = useCallback(
    async (voterId: string, targetId: string) => {
      if (!gameIdRef.current) return;

      try {
        console.log(`👤 Player ${voterId} voting for ${targetId}`);
        
        await supabase
          .from('votes')
          .upsert({
            game_id: gameIdRef.current,
            voter_id: voterId,
            target_id: targetId,
          });

        console.log('⏱️ Waiting 100ms for database to propagate...');
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: allVotes } = await supabase
          .from('votes')
          .select('*')
          .eq('game_id', gameIdRef.current);

        const { data: allPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('game_id', gameIdRef.current);

        console.log(`📊 Vote count: ${allVotes?.length}/${allPlayers?.length} players`);

        if (allVotes && allPlayers && allVotes.length === allPlayers.length) {
          console.log('✅ ALL PLAYERS HAVE VOTED! Processing results immediately...');
          
          if (!votesProcessedRef.current && !resultShownRef.current) {
            console.log('🔒 All votes received - stopping timer and processing now');
            
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              console.log('⏱️ Timer cleared because all votes are in');
            }
            
            await processVotes();
          } else {
            console.log('⛔ Already processing/processed, skipping');
          }
        } else {
          console.log('⏳ Waiting for more votes...');
        }
      } catch (error) {
        console.error('Error voting:', error);
      }
    },
    [processVotes]
  );

  const tieBreakerVote = useCallback(async (targetId: string) => {
    if (!gameIdRef.current) return;

    const { data: currentGames } = await supabase
      .from('games')
      .select('liar_id')
      .eq('id', gameIdRef.current);
    
    const currentGame = currentGames?.[0];

    if (!currentGame) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    await showResults(targetId, currentGame.liar_id);
  }, [showResults]);

  const playAgain = useCallback(async () => {
    if (!gameIdRef.current) return;

    try {
      votesProcessedRef.current = false;
      resultShownRef.current = false;
      console.log('🔄 Play again - reset flags');

      await supabase
        .from('votes')
        .delete()
        .eq('game_id', gameIdRef.current);

      await supabase
        .from('players')
        .update({ card: null })
        .eq('game_id', gameIdRef.current);

      const { data: currentGameData } = await supabase
        .from('games')
        .select('last_starting_index')
        .eq('id', gameIdRef.current)
        .single();

      const currentIndex = currentGameData?.last_starting_index ?? -1;

      await supabase
        .from('games')
        .update({
          phase: 'admin-lobby',
          current_word: null,
          word_category: null,
          liar_id: null,
          starting_player_id: null,
          time_left: 0,
          tie_breaker_id: null,
          winner: null,
          last_starting_index: currentIndex,
        })
        .eq('id', gameIdRef.current);
    } catch (error) {
      console.error('Error playing again:', error);
    }
  }, []);

  const leaveGame = useCallback(async () => {
    if (!currentPlayer || !gameIdRef.current) return;

    try {
      if (currentPlayer.isAdmin) {
        console.log('🚨 Admin is leaving - Deleting entire game');
        
        await supabase
          .from('votes')
          .delete()
          .eq('game_id', gameIdRef.current);

        await supabase
          .from('players')
          .delete()
          .eq('game_id', gameIdRef.current);

        await supabase
          .from('games')
          .delete()
          .eq('id', gameIdRef.current);
      } else {
        console.log('👤 Regular player leaving');
        await supabase
          .from('players')
          .delete()
          .eq('id', currentPlayer.id);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      setCurrentPlayer(null);
      gameIdRef.current = null;
      const emptyState = {
        gameCode: "",
        players: [],
        phase: "welcome" as GamePhase,
        currentWord: null,
        liarId: null,
        startingPlayerId: null,
        votes: {},
        timeLeft: 0,
        tieBreakerId: null,
        winner: null,
        roundNumber: 0,
        stats: [],
        categoryOptions: [],
        wordOptions: [],
      };
      setGameState(emptyState);
      await AsyncStorage.removeItem('@current_player');
    } catch (error) {
      console.error('Error leaving game:', error);
      throw error;
    }
  }, [currentPlayer]);

  const cancelGame = useCallback(async () => {
    if (!currentPlayer?.isAdmin || !gameIdRef.current) return;

    try {
      await supabase
        .from('votes')
        .delete()
        .eq('game_id', gameIdRef.current);

      await supabase
        .from('players')
        .delete()
        .eq('game_id', gameIdRef.current);

      await supabase
        .from('games')
        .delete()
        .eq('id', gameIdRef.current);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      setCurrentPlayer(null);
      gameIdRef.current = null;
      const emptyState = {
        gameCode: "",
        players: [],
        phase: "welcome" as GamePhase,
        currentWord: null,
        liarId: null,
        startingPlayerId: null,
        votes: {},
        timeLeft: 0,
        tieBreakerId: null,
        winner: null,
        roundNumber: 0,
        stats: [],
        categoryOptions: [],
        wordOptions: [],
      };
      setGameState(emptyState);
      await AsyncStorage.removeItem('@current_player');
    } catch (error) {
      console.error('Error canceling game:', error);
      throw error;
    }
  }, [currentPlayer]);

  const resetToLobby = useCallback(async () => {
    if (!currentPlayer?.isAdmin || !gameIdRef.current) {
      console.log('❌ Cannot reset: no admin or no game');
      throw new Error('Non autorisé ou pas de partie en cours');
    }

    try {
      console.log('🔄 Starting resetToLobby...');
      const newGameCode = generateGameCode();
      console.log('🔑 New game code:', newGameCode);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      votesProcessedRef.current = false;
      resultShownRef.current = false;

      console.log('🗑️ Deleting votes...');
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('game_id', gameIdRef.current);
      
      if (votesError) {
        console.error('Error deleting votes:', votesError);
        throw votesError;
      }

      console.log('🗑️ Deleting non-admin players...');
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .eq('game_id', gameIdRef.current)
        .neq('is_admin', true);
      
      if (playersError) {
        console.error('Error deleting non-admin players:', playersError);
        throw playersError;
      }

      console.log('♻️ Resetting admin player card...');
      const { error: cardError } = await supabase
        .from('players')
        .update({ card: null })
        .eq('game_id', gameIdRef.current)
        .eq('is_admin', true);
      
      if (cardError) {
        console.error('Error resetting card:', cardError);
        throw cardError;
      }

      console.log('🎮 Kicking all non-admin players...');
      const { error: gameError } = await supabase
        .from('games')
        .update({
          game_code: newGameCode,
          phase: 'admin-lobby',
          current_word: null,
          word_category: null,
          liar_id: null,
          starting_player_id: null,
          time_left: 0,
          tie_breaker_id: null,
          winner: null,
        })
        .eq('id', gameIdRef.current);
      
      if (gameError) {
        console.error('Error updating game:', gameError);
        throw gameError;
      }

      console.log('⏱️ Waiting for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🔄 Reloading game state...');
      await loadGameState(gameIdRef.current);

      console.log('✅ Reset complete!');
      return newGameCode;
    } catch (error) {
      console.error('❌ Error resetting to lobby:', error);
      throw error;
    }
  }, [currentPlayer, loadGameState]);



  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const reorderPlayers = useCallback(async (newOrder: Player[]) => {
    if (!currentPlayer?.isAdmin || !gameIdRef.current) {
      throw new Error('Non autorisé');
    }

    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from('players')
          .update({ player_order: i })
          .eq('id', newOrder[i].id);
      }

      await loadGameState(gameIdRef.current);
    } catch (error) {
      console.error('Error reordering players:', error);
      throw error;
    }
  }, [currentPlayer, loadGameState]);

  return {
    currentPlayer,
    gameState,
    createGame,
    joinGame,
    startCategorySelection,
    selectWordAndDistribute,
    startVoting,
    vote,
    tieBreakerVote,
    playAgain,
    resetGame,
    leaveGame,
    cancelGame,
    resetToLobby,
    reorderPlayers,
  };
});
