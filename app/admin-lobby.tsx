import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  PanResponder,
  Animated,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { useGame, Player, GameStat } from "@/contexts/GameContext";
import { Users, Share2, Play, ArrowLeft, XCircle, LogOut, Home, GripVertical, TrendingUp, Trophy, Target } from "lucide-react-native";

export default function AdminLobbyScreen() {
  const router = useRouter();
  const { gameState, currentPlayer, startCategorySelection, leaveGame, cancelGame, reorderPlayers } =
    useGame();
  const insets = useSafeAreaInsets();
  const [showStats, setShowStats] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const panHandlersRef = useRef<{ [key: number]: any }>({});

  useEffect(() => {
    setPlayers(gameState.players);
  }, [gameState.players]);

  useEffect(() => {
    if (!currentPlayer) {
      router.replace("/" as any);
      return;
    }
  }, [currentPlayer, router]);

  useEffect(() => {
    if (gameState.phase === "welcome" && !currentPlayer) {
      console.log('👉 Game was deleted, redirecting to home');
      router.replace("/" as any);
    }
  }, [gameState.phase, currentPlayer]);

  useEffect(() => {
    if (!currentPlayer?.isAdmin && gameState.players.length > 0) {
      const playerStillExists = gameState.players.find(p => p.id === currentPlayer?.id);
      if (!playerStillExists) {
        console.log('👉 Player was kicked, redirecting to home');
        router.replace("/" as any);
      }
    }
  }, [gameState.players, currentPlayer, router]);

  useEffect(() => {
    if (gameState.phase === "card-reveal" || gameState.phase === "category-selection") {
      router.replace("/game" as any);
    }
  }, [gameState.phase]);

  const handleDistributeCards = async () => {
    if (gameState.players.length < 3) {
      Alert.alert(
        "Joueurs insuffisants",
        "Il faut au moins 3 joueurs pour commencer une partie"
      );
      return;
    }
    try {
      await startCategorySelection();
    } catch (error: any) {
      console.error('❌ Error distributing cards:', error);
      const errorMsg = error?.message || error?.toString() || "Erreur inconnue";
      Alert.alert("Erreur", errorMsg);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Rejoins ma partie "Qui nous ment ?" !\n\nCode: ${gameState.gameCode}\n\nTélécharge l'app et rejoins maintenant !`;
      
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(message);
        Alert.alert("Copié !", "Le code a été copié dans le presse-papier");
      } else {
        const result = await Share.share({
          message,
          title: "Rejoins ma partie",
        });

        if (result.action === Share.sharedAction) {
          console.log('✅ Shared successfully');
        } else if (result.action === Share.dismissedAction) {
          console.log('❌ Share dismissed');
        }
      }
    } catch (error: any) {
      console.error('❌ Error sharing:', error);
      Alert.alert(
        "Erreur",
        "Impossible de partager le code pour le moment"
      );
    }
  };



  const handleCancelGame = () => {
    Alert.alert(
      "Annuler la partie",
      "Êtes-vous sûr de vouloir annuler la partie ? Tous les joueurs seront déconnectés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Admin canceling game...');
              await cancelGame();
              console.log('✅ Game canceled, redirecting...');
              router.replace("/" as any);
            } catch (error: any) {
              console.error('❌ Cancel error:', error);
              const errorMsg = error?.message || error?.toString() || "Erreur lors de l'annulation";
              Alert.alert("Erreur", errorMsg);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGame = () => {
    Alert.alert(
      "Quitter la partie",
      "Êtes-vous sûr de vouloir quitter cette partie ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGame();
              router.replace("/join-game" as any);
            } catch (error: any) {
              Alert.alert("Erreur", error.message || "Erreur lors de la déconnexion");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!currentPlayer?.isAdmin) {
      panHandlersRef.current = {};
      return;
    }

    const handlers: { [key: number]: any } = {};
    players.forEach((_, index) => {
      handlers[index] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setDraggingIndex(index);
        },
        onPanResponderMove: (_, gestureState) => {
          const moveDistance = gestureState.dy;
          const itemHeight = 80;
          const newIndex = Math.max(
            0,
            Math.min(
              players.length - 1,
              index + Math.round(moveDistance / itemHeight)
            )
          );
          
          if (newIndex !== index) {
            const newPlayers = [...players];
            const [removed] = newPlayers.splice(index, 1);
            newPlayers.splice(newIndex, 0, removed);
            setPlayers(newPlayers);
          }
        },
        onPanResponderRelease: () => {
          setDraggingIndex(null);
        },
      }).panHandlers;
    });
    panHandlersRef.current = handlers;
  }, [players, currentPlayer?.isAdmin]);

  const handleSaveOrder = async () => {
    try {
      await reorderPlayers(players);
      Alert.alert("Succès", "L'ordre des joueurs a été mis à jour");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Erreur lors de la mise à jour");
    }
  };

  const stats = useMemo(() => {
    const liarWins = gameState.stats.filter(s => s.liarWon).length;
    const playerWins = gameState.stats.filter(s => !s.liarWon).length;

    const liarCounts: Record<string, number> = {};
    const liarGames: Record<string, number> = {};
    const eliminationCounts: Record<string, number> = {};
    const categoryUsage: Record<string, number> = {};

    gameState.stats.forEach(stat => {
      liarCounts[stat.liarPlayerName] = (liarCounts[stat.liarPlayerName] || 0) + (stat.liarWon ? 1 : 0);
      liarGames[stat.liarPlayerName] = (liarGames[stat.liarPlayerName] || 0) + 1;
      eliminationCounts[stat.eliminatedPlayerName] = (eliminationCounts[stat.eliminatedPlayerName] || 0) + 1;
      categoryUsage[stat.category] = (categoryUsage[stat.category] || 0) + 1;
    });

    const bestLiar = Object.entries(liarCounts).sort((a, b) => b[1] - a[1])[0];
    const mostEliminated = Object.entries(eliminationCounts).sort((a, b) => b[1] - a[1])[0];
    const favoriteCategory = Object.entries(categoryUsage).sort((a, b) => b[1] - a[1])[0];

    const liarSuccessRates = Object.entries(liarGames).map(([name, games]) => ({
      name,
      rate: Math.round(((liarCounts[name] || 0) / games) * 100),
      games,
    })).sort((a, b) => b.rate - a.rate)[0];

    return {
      totalRounds: gameState.stats.length,
      liarWins,
      playerWins,
      winRate: gameState.stats.length > 0 ? Math.round((playerWins / gameState.stats.length) * 100) : 0,
      bestLiar: bestLiar ? { name: bestLiar[0], wins: bestLiar[1] } : null,
      mostEliminated: mostEliminated ? { name: mostEliminated[0], times: mostEliminated[1] } : null,
      favoriteCategory: favoriteCategory ? { name: favoriteCategory[0], times: favoriteCategory[1] } : null,
      bestLiarSuccessRate: liarSuccessRates || null,
    };
  }, [gameState.stats]);

  const renderStats = () => {
    if (gameState.stats.length === 0) {
      return (
        <View style={styles.emptyStats}>
          <Text style={styles.emptyStatsText}>Aucune statistique disponible</Text>
          <Text style={styles.emptyStatsSubtext}>Jouez des manches pour voir les statistiques !</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsContent}>
        <View style={styles.statsOverview}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalRounds}</Text>
            <Text style={styles.statLabel}>Manches jouées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats.liarWins}</Text>
            <Text style={styles.statLabel}>Victoires menteur</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#00FF7F' }]}>{stats.playerWins}</Text>
            <Text style={styles.statLabel}>Victoires joueurs</Text>
          </View>
        </View>

        <View style={styles.winRateCard}>
          <Target color="#fff" size={28} />
          <View style={styles.winRateInfo}>
            <Text style={styles.winRateLabel}>Taux de victoire joueurs</Text>
            <Text style={styles.winRateNumber}>{stats.winRate}%</Text>
          </View>
        </View>

        {stats.bestLiar && (
          <View style={styles.bestLiarCard}>
            <Trophy color="#FFD700" size={32} />
            <View style={styles.bestLiarInfo}>
              <Text style={styles.bestLiarLabel}>Meilleur menteur</Text>
              <Text style={styles.bestLiarName}>{stats.bestLiar.name}</Text>
              <Text style={styles.bestLiarWins}>{stats.bestLiar.wins} victoires</Text>
            </View>
          </View>
        )}

        {stats.mostEliminated && (
          <View style={styles.mostEliminatedCard}>
            <XCircle color="#FF6B6B" size={28} />
            <View style={styles.mostEliminatedInfo}>
              <Text style={styles.mostEliminatedLabel}>Le plus éliminé</Text>
              <Text style={styles.mostEliminatedName}>{stats.mostEliminated.name}</Text>
              <Text style={styles.mostEliminatedTimes}>{stats.mostEliminated.times} fois</Text>
            </View>
          </View>
        )}

        {stats.favoriteCategory && (
          <View style={styles.favoriteCategoryCard}>
            <Text style={styles.favoriteCategoryEmoji}>🏆</Text>
            <View style={styles.favoriteCategoryInfo}>
              <Text style={styles.favoriteCategoryLabel}>Catégorie favorite</Text>
              <Text style={styles.favoriteCategoryName}>{stats.favoriteCategory.name}</Text>
              <Text style={styles.favoriteCategoryTimes}>{stats.favoriteCategory.times} fois jouée</Text>
            </View>
          </View>
        )}

        {stats.bestLiarSuccessRate && stats.bestLiarSuccessRate.games >= 2 && (
          <View style={styles.successRateCard}>
            <TrendingUp color="#9333EA" size={28} />
            <View style={styles.successRateInfo}>
              <Text style={styles.successRateLabel}>Meilleur taux de réussite (menteur)</Text>
              <Text style={styles.successRateName}>{stats.bestLiarSuccessRate.name}</Text>
              <Text style={styles.successRateNumber}>{stats.bestLiarSuccessRate.rate}%</Text>
              <Text style={styles.successRateGames}>({stats.bestLiarSuccessRate.games} parties)</Text>
            </View>
          </View>
        )}

        <View style={styles.roundsHistory}>
          <Text style={styles.roundsTitle}>📋 Historique des manches</Text>
          {gameState.stats.map((stat: GameStat) => (
            <View key={stat.id} style={styles.roundCard}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundNumber}>Manche {stat.roundNumber}</Text>
                <Text style={[styles.roundResult, stat.liarWon ? styles.liarWon : styles.playersWon]}>
                  {stat.liarWon ? '❌ Menteur gagne' : '✅ Joueurs gagnent'}
                </Text>
              </View>
              <View style={styles.roundDetails}>
                <Text style={styles.roundDetailText}>Mot: <Text style={styles.boldText}>{stat.word}</Text></Text>
                <Text style={styles.roundDetailText}>Catégorie: <Text style={styles.boldText}>{stat.category}</Text></Text>
                <Text style={styles.roundDetailText}>Menteur: <Text style={styles.boldText}>{stat.liarPlayerName}</Text></Text>
                <Text style={styles.roundDetailText}>Éliminé: <Text style={styles.boldText}>{stat.eliminatedPlayerName}</Text></Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#FF6B9D", "#C239B3", "#4776E6", "#8E54E9"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.topButtonsRow}>
          {currentPlayer?.isAdmin && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/" as any)}
            >
              <ArrowLeft color="#fff" size={28} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.homeButton}
            onPress={async () => {
              try {
                await leaveGame();
                router.replace("/" as any);
              } catch (error: any) {
                Alert.alert("Erreur", error.message || "Erreur lors du retour à l'accueil");
              }
            }}
          >
            <Home color="#fff" size={28} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Salle d&apos;attente</Text>
        <Text style={styles.subtitle}>
          Code de la partie : {gameState.gameCode}
        </Text>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 color="#fff" size={20} />
          <Text style={styles.shareButtonText}>Partager le code</Text>
        </TouchableOpacity>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>CODE</Text>
          <Text style={styles.codeText}>{gameState.gameCode}</Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, !showStats && styles.tabActive]}
            onPress={() => setShowStats(false)}
          >
            <Users color="#fff" size={20} />
            <Text style={styles.tabText}>Joueurs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showStats && styles.tabActive]}
            onPress={() => setShowStats(true)}
          >
            <TrendingUp color="#fff" size={20} />
            <Text style={styles.tabText}>Statistiques</Text>
          </TouchableOpacity>
        </View>

        {!showStats ? (
          <>
            <View style={styles.playersSection}>
              <View style={styles.playersTitleContainer}>
                <Users color="#fff" size={24} />
                <Text style={styles.playersTitle}>
                  Joueurs ({gameState.players.length})
                </Text>
              </View>

              {currentPlayer?.isAdmin && (
                <Text style={styles.orderHint}>
                  👆 Ordre de parole pour la partie
                </Text>
              )}

              <View style={styles.playersList}>
                {players.map((player, index) => {
                  const panHandlers = currentPlayer?.isAdmin ? panHandlersRef.current[index] : undefined;
                  return (
                    <Animated.View
                      key={player.id}
                      {...(panHandlers || {})}
                      style={[
                        styles.playerCard,
                        player.id === currentPlayer?.id && styles.currentPlayerCard,
                        draggingIndex === index && styles.draggingCard,
                      ]}
                    >
                      {currentPlayer?.isAdmin && (
                        <View style={styles.dragHandle}>
                          <GripVertical color="rgba(255,255,255,0.5)" size={20} />
                        </View>
                      )}
                      <View style={styles.playerNumber}>
                        <Text style={styles.playerNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.isAdmin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>

              {currentPlayer?.isAdmin && players.length > 0 && (
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={handleSaveOrder}
                  >
                    <Text style={styles.reorderButtonText}>💾 Sauvegarder l&apos;ordre</Text>
                  </TouchableOpacity>
                </View>
              )}

              {gameState.players.length < 3 && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    ⚠️ Minimum 3 joueurs requis
                  </Text>
                </View>
              )}
            </View>

            {currentPlayer?.isAdmin ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    gameState.players.length < 3 && styles.startButtonDisabled,
                  ]}
                  onPress={handleDistributeCards}
                  disabled={gameState.players.length < 3}
                >
                  <Play color="#fff" size={24} />
                  <Text style={styles.startButtonText}>Distribuer les cartes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelGameButton}
                  onPress={handleCancelGame}
                >
                  <XCircle color="#fff" size={20} />
                  <Text style={styles.cancelGameButtonText}>Annuler la partie</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    En attente de l&apos;administrateur pour distribuer les cartes...
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={handleLeaveGame}
                >
                  <LogOut color="#fff" size={20} />
                  <Text style={styles.leaveButtonText}>Rejoindre un autre jeu</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.statsSection}>
            {renderStats()}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  topButtonsRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  homeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 100, 100, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  shareButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  codeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#fff",
    opacity: 0.8,
    marginBottom: 10,
    letterSpacing: 2,
  },
  codeText: {
    fontSize: 48,
    fontWeight: "900" as const,
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tabsContainer: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  playersSection: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  playersTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playersTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#fff",
  },
  orderHint: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
    fontStyle: "italic" as const,
  },
  playersList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  currentPlayerCard: {
    borderColor: "#FFD700",
  },
  draggingCard: {
    opacity: 0.7,
    transform: [{ scale: 1.05 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dragHandle: {
    marginRight: 4,
  },
  playerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumberText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
  },
  playerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#fff",
  },
  adminBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#8E54E9",
  },
  reorderButtons: {
    gap: 8,
  },
  reorderButton: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.6)",
  },
  reorderButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  warningContainer: {
    backgroundColor: "rgba(255, 200, 0, 0.2)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 200, 0, 0.5)",
  },
  warningText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: "#C239B3",
    fontSize: 20,
    fontWeight: "800" as const,
  },
  waitingContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  waitingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center",
  },

  leaveButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginTop: 12,
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  cancelGameButton: {
    backgroundColor: "rgba(255, 100, 100, 0.3)",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 100, 100, 0.6)",
    marginTop: 12,
  },
  cancelGameButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  statsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  emptyStats: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyStatsText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  emptyStatsSubtext: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
  },
  statsContent: {
    gap: 20,
  },
  statsOverview: {
    flexDirection: "row" as const,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  bestLiarCard: {
    backgroundColor: "rgba(255, 215, 0, 0.25)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  bestLiarInfo: {
    flex: 1,
    gap: 4,
  },
  bestLiarLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  bestLiarName: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: "#fff",
  },
  bestLiarWins: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  roundsHistory: {
    gap: 12,
  },
  roundsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  roundCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  roundHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundNumber: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
  },
  roundResult: {
    fontSize: 14,
    fontWeight: "700" as const,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  liarWon: {
    backgroundColor: "rgba(255, 107, 107, 0.3)",
    color: "#fff",
  },
  playersWon: {
    backgroundColor: "rgba(0, 255, 127, 0.3)",
    color: "#fff",
  },
  roundDetails: {
    gap: 6,
  },
  roundDetailText: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  boldText: {
    fontWeight: "700" as const,
  },
  winRateCard: {
    backgroundColor: "rgba(138, 43, 226, 0.25)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(138, 43, 226, 0.5)",
  },
  winRateInfo: {
    flex: 1,
    gap: 4,
  },
  winRateLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  winRateNumber: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#fff",
  },
  mostEliminatedCard: {
    backgroundColor: "rgba(255, 107, 107, 0.25)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 107, 107, 0.5)",
  },
  mostEliminatedInfo: {
    flex: 1,
    gap: 4,
  },
  mostEliminatedLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  mostEliminatedName: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: "#fff",
  },
  mostEliminatedTimes: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  favoriteCategoryCard: {
    backgroundColor: "rgba(0, 255, 127, 0.25)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 127, 0.5)",
  },
  favoriteCategoryEmoji: {
    fontSize: 32,
  },
  favoriteCategoryInfo: {
    flex: 1,
    gap: 4,
  },
  favoriteCategoryLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  favoriteCategoryName: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: "#fff",
  },
  favoriteCategoryTimes: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  successRateCard: {
    backgroundColor: "rgba(147, 51, 234, 0.25)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(147, 51, 234, 0.5)",
  },
  successRateInfo: {
    flex: 1,
    gap: 4,
  },
  successRateLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  successRateName: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#fff",
  },
  successRateNumber: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#fff",
  },
  successRateGames: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.8,
  },
});
