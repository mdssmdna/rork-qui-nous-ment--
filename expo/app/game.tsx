import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import {
  Eye,
  EyeOff,
  Vote,
  Clock,
  Trophy,
  XCircle,
  ArrowLeft,

  LogOut,
  Home,
} from "lucide-react-native";

export default function GameScreen() {
  const router = useRouter();
  const {
    gameState,
    currentPlayer,
    selectWordAndDistribute,
    startVoting,
    vote,
    tieBreakerVote,
    playAgain,
    resetGame,

    cancelGame,
    leaveGame,
  } = useGame();
  const [showControls, setShowControls] = useState(false);
  const insets = useSafeAreaInsets();

  const cardFlipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameState.phase === "card-reveal") {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(cardFlipAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (!currentPlayer) {
      router.replace("/" as any);
    }
  }, [currentPlayer]);

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
    if (gameState.phase === "admin-lobby" || gameState.phase === "waiting-room") {
      router.replace("/admin-lobby" as any);
    }
  }, [gameState.phase, router]);

  if (!currentPlayer) {
    return null;
  }

  const myCard = gameState.players.find((p) => p.id === currentPlayer.id)?.card;
  const isLiar = myCard === "MENTEUR";
  const hasVoted = gameState.votes[currentPlayer.id] !== undefined;
  const isTieBreakerVoter = gameState.tieBreakerId === currentPlayer.id;

  const handleVote = (targetId: string) => {
    if (gameState.phase === "voting" && !hasVoted) {
      vote(currentPlayer.id, targetId);
    } else if (gameState.phase === "tie-breaker" && isTieBreakerVoter) {
      tieBreakerVote(targetId);
    }
  };

  const handleLeaveGame = () => {
    Alert.alert(
      "Quitter la partie",
      "Êtes-vous sûr de vouloir quitter cette partie ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, quitter",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGame();
              router.replace("/" as any);
            } catch (error: any) {
              Alert.alert("Erreur", error.message || "Erreur lors du départ");
            }
          },
        },
      ]
    );
  };

  const handleCancelGame = () => {
    Alert.alert(
      "Annuler la partie",
      "Êtes-vous sûr de vouloir annuler cette partie ? Tous les joueurs seront déconnectés.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelGame();
              router.replace("/" as any);
            } catch (error: any) {
              Alert.alert("Erreur", error.message || "Erreur lors de l'annulation");
            }
          },
        },
      ]
    );
  };



  const renderCardReveal = () => {
    const cardScale = scaleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    const startingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === gameState.startingPlayerId
    );
    const startingPlayer = gameState.players[startingPlayerIndex];

    return (
      <View style={styles.cardRevealContainer}>
        <View style={styles.cardRevealContent}>
          {startingPlayer && (
            <View style={styles.startingPlayerBanner}>
              <Text style={styles.startingPlayerText}>
                🎯 {startingPlayer.name} commence le jeu !
              </Text>
              <Text style={styles.startingPlayerOrder}>
                Ordre: {gameState.players.map((p, i) => `${i + 1}. ${p.name}`).join(' → ')}
              </Text>
            </View>
          )}
          <Text style={styles.cardRevealTitle}>Votre carte</Text>

          <Animated.View
            style={[
              styles.card,
              isLiar ? styles.liarCard : styles.playerCard,
              {
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {isLiar ? (
              <>
                <EyeOff color="#fff" size={60} />
                <Text style={styles.cardText}>MENTEUR</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {gameState.currentWord?.category}
                  </Text>
                </View>
                <Text style={styles.cardHint}>
                  Vous avez le droit de dire un seul mot pour faire deviner ce mot !
                </Text>
              </>
            ) : (
              <>
                <Eye color="#fff" size={60} />
                <Text style={styles.cardText}>{myCard}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {gameState.currentWord?.category}
                  </Text>
                </View>
                <Text style={styles.cardHint}>
                  Vous avez le droit de dire un seul mot pour faire deviner ce mot !
                </Text>
              </>
            )}
          </Animated.View>

          <Text style={styles.waitingText}>
            En attente que l&apos;administrateur lance le vote...
          </Text>

          {currentPlayer.isAdmin && (
            <TouchableOpacity
              style={styles.adminVoteButton}
              onPress={startVoting}
            >
              <Vote color="#fff" size={24} />
              <Text style={styles.adminVoteButtonText}>Lancer le vote</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderVoting = () => {
    const isMyTurn =
      gameState.phase === "tie-breaker" ? isTieBreakerVoter : !hasVoted;

    return (
      <View style={styles.votingContainer}>
        <View style={styles.timerContainer}>
          <Clock color="#fff" size={32} />
          <Text style={styles.timerText}>{gameState.timeLeft}s</Text>
        </View>

        {gameState.phase === "tie-breaker" && (
          <View style={styles.tieBreakerBanner}>
            <Text style={styles.tieBreakerText}>
              ⚖️ ÉGALITÉ ! {isTieBreakerVoter ? "À vous de départager !" : "Vote de départage en cours..."}
            </Text>
          </View>
        )}

        <Text style={styles.votingTitle}>
          {isMyTurn ? "Votez pour éliminer un joueur" : "Vous avez voté !"}
        </Text>

        <ScrollView
          contentContainerStyle={styles.playersList}
          showsVerticalScrollIndicator={false}
        >
          {gameState.players
            .filter((p) => p.id !== currentPlayer.id)
            .map((player) => {
              const voted = gameState.votes[currentPlayer.id] === player.id;
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerVoteCard,
                    voted && styles.playerVoteCardSelected,
                    !isMyTurn && styles.playerVoteCardDisabled,
                  ]}
                  onPress={() => handleVote(player.id)}
                  disabled={!isMyTurn}
                >
                  <Text style={styles.playerVoteName}>{player.name}</Text>
                  {voted && <Text style={styles.votedCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>
    );
  };

  const renderResults = () => {
    const playersWon = gameState.winner === "players";
    const liarPlayer = gameState.players.find((p) => p.id === gameState.liarId);

    return (
      <View style={styles.resultsContainer}>
        {playersWon ? (
          <Trophy color="#00FF7F" size={100} />
        ) : (
          <XCircle color="#FF6B6B" size={100} />
        )}

        <View style={[styles.resultsBanner, playersWon ? styles.resultsBannerWin : styles.resultsBannerLose]}>
          <Text style={styles.resultsTitle}>
            {playersWon ? "✅ Le menteur a été éliminé !" : "❌ Le menteur gagne !"}
          </Text>
          <Text style={styles.resultsSubtitle}>
            {playersWon ? "Les joueurs ont gagné !" : "La mauvaise personne a été éliminée !"}
          </Text>
        </View>

        <View style={styles.resultsCard}>
          <Text style={styles.resultsLabel}>Le menteur était :</Text>
          <Text style={styles.resultsLiar}>{liarPlayer?.name}</Text>

          <Text style={styles.resultsLabel}>Le mot était :</Text>
          <Text style={styles.resultsWord}>{gameState.currentWord?.word}</Text>
          <Text style={styles.resultsCategory}>
            ({gameState.currentWord?.category})
          </Text>
        </View>

        {currentPlayer.isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={styles.playAgainButton} onPress={playAgain}>
              <Text style={styles.playAgainButtonText}>Rejouer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quitButton}
              onPress={() => {
                resetGame();
                router.replace("/" as any);
              }}
            >
              <Text style={styles.quitButtonText}>Quitter</Text>
            </TouchableOpacity>
          </View>
        )}

        {!currentPlayer.isAdmin && (
          <Text style={styles.waitingAdminText}>
            En attente de l&apos;administrateur...
          </Text>
        )}
      </View>
    );
  };

  const renderCategorySelection = () => {
    const startingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === gameState.startingPlayerId
    );
    const startingPlayer = gameState.players[startingPlayerIndex];
    const isStartingPlayer = currentPlayer?.id === gameState.startingPlayerId;
    const isLiar = gameState.liarId === currentPlayer?.id;

    const categoriesWithWords: { [key: string]: typeof gameState.wordOptions } = {};
    gameState.wordOptions.forEach(wordOption => {
      if (!categoriesWithWords[wordOption.category]) {
        categoriesWithWords[wordOption.category] = [];
      }
      categoriesWithWords[wordOption.category].push(wordOption);
    });

    return (
      <View style={styles.categorySelectionContainer}>
        <Text style={styles.categoryTitle}>🎯 Choix du mot</Text>
        
        {startingPlayer && (
          <View style={styles.startingPlayerInfoCategory}>
            <Text style={styles.startingPlayerTextCategory}>
              {isStartingPlayer ? (isLiar ? "À vous de choisir une catégorie !" : "À vous de choisir un mot !") : `${startingPlayer.name} choisit...`}
            </Text>
          </View>
        )}

        {isStartingPlayer ? (
          <ScrollView style={styles.wordSelectionScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              <Text style={styles.categorySubtitle}>
                {isLiar ? "Sélectionnez une catégorie :" : "Sélectionnez un mot :"}
              </Text>
              {Object.entries(categoriesWithWords).map(([category, words]) => (
                <View key={category} style={styles.categoryGroup}>
                  <Text style={styles.categoryGroupTitle}>{category}</Text>
                  {isLiar ? (
                    <>
                      <View style={styles.wordsGrid}>
                        {words.map((wordOption, idx) => (
                          <View
                            key={`liar-word-${idx}`}
                            style={[styles.wordButton, styles.liarWordButton]}
                          >
                            <Text style={styles.liarWordButtonText}>MENTEUR</Text>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={styles.categoryButtonLiar}
                        onPress={async () => {
                          try {
                            const randomWord = words[Math.floor(Math.random() * words.length)];
                            await selectWordAndDistribute(randomWord);
                          } catch (error: any) {
                            console.error('❌ Error selecting category:', error);
                            const errorMsg = error?.message || error?.toString() || "Erreur inconnue";
                            Alert.alert("Erreur", errorMsg);
                          }
                        }}
                      >
                        <Text style={styles.categoryButtonLiarText}>Choisir cette catégorie</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.wordsGrid}>
                      {words.map((wordOption, idx) => (
                        <TouchableOpacity
                          key={`${wordOption.word}-${idx}`}
                          style={styles.wordButton}
                          onPress={async () => {
                            try {
                              await selectWordAndDistribute(wordOption);
                            } catch (error: any) {
                              console.error('❌ Error selecting word:', error);
                              const errorMsg = error?.message || error?.toString() || "Erreur inconnue";
                              Alert.alert("Erreur", errorMsg);
                            }
                          }}
                        >
                          <Text style={styles.wordButtonText}>{wordOption.word}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.waitingCategory}>
            <Text style={styles.waitingCategoryText}>⏳ En attente du choix...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderWaitingRoom = () => {
    return (
      <View style={styles.waitingRoomContainer}>
        <Text style={styles.waitingRoomTitle}>Salle d&apos;attente</Text>
        <Text style={styles.waitingRoomSubtitle}>
          En attente que l&apos;admin distribue les cartes...
        </Text>

        <View style={styles.playersListWaiting}>
          {gameState.players.map((player) => (
            <View key={player.id} style={styles.waitingPlayerCard}>
              <Text style={styles.waitingPlayerName}>{player.name}</Text>
              {player.isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              )}
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
      <View style={[styles.topBar, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowControls(!showControls)}
        >
          <Text style={styles.menuButtonText}>⚙️</Text>
        </TouchableOpacity>

        {showControls && (
          <View style={styles.controlsDropdown}>
            {currentPlayer.isAdmin ? (
              <>
                <TouchableOpacity
                  style={styles.controlItem}
                  onPress={() => {
                    setShowControls(false);
                    handleCancelGame();
                  }}
                >
                  <XCircle color="#fff" size={20} />
                  <Text style={styles.controlText}>Annuler la partie</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.controlItem}
                onPress={() => {
                  setShowControls(false);
                  handleLeaveGame();
                }}
              >
                <LogOut color="#fff" size={20} />
                <Text style={styles.controlText}>Quitter la partie</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >

        {gameState.phase === "waiting-room" && renderWaitingRoom()}
        {gameState.phase === "category-selection" && renderCategorySelection()}
        {gameState.phase === "card-reveal" && renderCardReveal()}
        {(gameState.phase === "voting" || gameState.phase === "tie-breaker") &&
          renderVoting()}
        {gameState.phase === "results" && renderResults()}
      </ScrollView>

      <View style={[styles.floatingHomeButton, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.homeButtonFloating}
          onPress={async () => {
            Alert.alert(
              "Retour à l'accueil",
              "Voulez-vous vraiment quitter cette partie ?",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Quitter",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await leaveGame();
                      router.replace("/" as any);
                    } catch (error: any) {
                      Alert.alert("Erreur", error.message || "Erreur lors du départ");
                    }
                  },
                },
              ]
            );
          }}
        >
          <Home color="#fff" size={28} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardRevealContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardRevealContent: {
    width: "100%",
    alignItems: "center",
    gap: 30,
  },
  startingPlayerBanner: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.6)",
  },
  startingPlayerText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  startingPlayerOrder: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  cardRevealTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 20,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  liarCard: {
    backgroundColor: "rgba(255, 50, 50, 0.3)",
  },
  playerCard: {
    backgroundColor: "rgba(50, 200, 100, 0.3)",
  },
  cardText: {
    fontSize: 36,
    fontWeight: "900" as const,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  categoryText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
  },
  cardHint: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  waitingText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  adminVoteButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adminVoteButtonText: {
    color: "#C239B3",
    fontSize: 18,
    fontWeight: "800" as const,
  },
  votingContainer: {
    flex: 1,
    gap: 20,
  },
  timerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "900" as const,
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tieBreakerBanner: {
    backgroundColor: "rgba(255, 200, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 200, 0, 0.6)",
  },
  tieBreakerText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  votingTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  playersList: {
    gap: 12,
  },
  playerVoteCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  playerVoteCardSelected: {
    backgroundColor: "rgba(100, 255, 150, 0.3)",
    borderColor: "#00FF7F",
  },
  playerVoteCardDisabled: {
    opacity: 0.5,
  },
  playerVoteName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#fff",
  },
  votedCheck: {
    fontSize: 28,
    color: "#fff",
  },
  resultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  resultsBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 8,
    borderWidth: 3,
  },
  resultsBannerWin: {
    backgroundColor: "rgba(0, 255, 127, 0.2)",
    borderColor: "#00FF7F",
  },
  resultsBannerLose: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderColor: "#FF6B6B",
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultsSubtitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  resultsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    alignItems: "center",
    gap: 12,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  resultsLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.9,
  },
  resultsLiar: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#FF6B6B",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultsWord: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultsCategory: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
    opacity: 0.8,
  },
  adminActions: {
    width: "100%",
    gap: 16,
  },
  playAgainButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  playAgainButtonText: {
    color: "#C239B3",
    fontSize: 18,
    fontWeight: "800" as const,
  },
  quitButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  waitingAdminText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  waitingRoomContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  waitingRoomTitle: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  waitingRoomSubtitle: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  playersListWaiting: {
    width: "100%",
    gap: 12,
  },
  waitingPlayerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  waitingPlayerName: {
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
  topBar: {
    position: "absolute" as const,
    top: 0,
    right: 20,
    zIndex: 1000,
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingHomeButton: {
    position: "absolute" as const,
    left: 20,
    zIndex: 1000,
  },
  homeButtonFloating: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 100, 100, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  menuButtonText: {
    fontSize: 24,
  },
  controlsDropdown: {
    marginTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    gap: 4,
  },
  controlItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  controlText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  categorySelectionContainer: {
    flex: 1,
    paddingTop: 20,
    gap: 20,
  },
  categoryTitle: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categorySubtitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  startingPlayerInfoCategory: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.6)",
  },
  startingPlayerTextCategory: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  wordSelectionScroll: {
    flex: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  categoryGroup: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  categoryGroupTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  categoryButtonLiar: {
    backgroundColor: "rgba(255, 50, 50, 0.4)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 50, 50, 0.6)",
  },
  categoryButtonLiarText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
  },
  wordsGrid: {
    gap: 8,
  },
  wordButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  wordButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
  },
  liarWordButton: {
    backgroundColor: "rgba(255, 50, 50, 0.2)",
    borderColor: "rgba(255, 50, 50, 0.4)",
    opacity: 0.6,
  },
  liarWordButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
    opacity: 0.8,
  },
  categoryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  categoryButtonText: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  waitingCategory: {
    width: "100%",
    gap: 20,
  },
  waitingCategoryText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#fff",
    textAlign: "center",
  },
  categoriesPreview: {
    gap: 12,
  },
  categoryPreviewItem: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  categoryPreviewText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#fff",
    opacity: 0.9,
  },
});
