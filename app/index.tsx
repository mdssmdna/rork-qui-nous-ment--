import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, Modal, ScrollView, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useGame } from "@/contexts/GameContext";
import { UserPlus, Play, Users, Zap, Heart, Smartphone, Share2 } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";

export default function WelcomeScreen() {
  const router = useRouter();
  const { currentPlayer, gameState, createGame } = useGame();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (currentPlayer && gameState.gameCode && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      if (currentPlayer.isAdmin) {
        router.replace("/admin-lobby" as any);
      } else {
        router.replace("/game" as any);
      }
    }
  }, [currentPlayer, gameState.gameCode, router]);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un pseudo");
      return;
    }
    
    setIsCreating(true);
    try {
      await createGame(playerName.trim());
      setShowModal(false);
      setPlayerName("");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Erreur lors de la création de la partie");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer une partie</Text>
            <Text style={styles.modalSubtitle}>
              Entrez votre pseudo
            </Text>
            <TextInput
              style={styles.modalInput}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Votre pseudo"
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              autoCapitalize="words"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowModal(false);
                  setPlayerName("");
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCreateGame}
                disabled={isCreating}
              >
                <Text style={styles.modalButtonText}>
                  {isCreating ? "Création..." : "Créer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={["#FF6B9D", "#C239B3", "#4776E6", "#8E54E9"]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{
              uri: "https://r2-pub.rork.com/generated-images/c0476528-f5b3-497e-8b63-df35eded9846.png",
            }}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Qui nous ment ?</Text>
          <Text style={styles.tagline}>
            Le jeu de l&apos;imposteur pour vos soirées !
          </Text>

          <TouchableOpacity
            style={styles.shareAppButton}
            onPress={async () => {
              try {
                const message = `Découvre "Qui nous ment ?" - Le jeu de l'imposteur pour tes soirées !\n\nTélécharge l'app maintenant et rejoins tes amis pour des parties endiablées ! 🎭🎉`;
                
                if (Platform.OS === 'web') {
                  await Clipboard.setStringAsync(message);
                  Alert.alert("Copié !", "Le message a été copié dans le presse-papier");
                } else {
                  await Share.share({
                    message,
                    title: "Qui nous ment ?",
                  });
                }
              } catch (error) {
                console.error('❌ Error sharing app:', error);
                Alert.alert("Erreur", "Impossible de partager pour le moment");
              }
            }}
          >
            <Share2 color="#fff" size={20} />
            <Text style={styles.shareAppButtonText}>Partager l&apos;app</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowModal(true)}
            >
              <Play color="#fff" size={24} />
              <Text style={styles.buttonText}>Créer une partie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push("/join-game" as any)}
            >
              <UserPlus color="#fff" size={24} />
              <Text style={styles.buttonText}>Rejoindre un jeu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>🎭 Comment ça marche ?</Text>
            <Text style={styles.descriptionText}>
              Un joueur reçoit la carte virtuelle <Text style={styles.boldText}>« MENTEUR »</Text> et connaît seulement la catégorie. Les autres reçoivent le mot exact.
            </Text>
            <Text style={styles.descriptionText}>
              Tout le monde doit dire <Text style={styles.boldText}>un seul mot</Text> pour faire deviner ce qu&apos;ils ont, sans être trop précis !
            </Text>
            <Text style={styles.descriptionText}>
              Le menteur doit se fondre dans la masse en disant un mot à son tour grâce aux indices des autres. <Text style={styles.boldText}>Sans jamais dire le fameux mot</Text> sinon il sera immédiatement découvert !
            </Text>
            <Text style={styles.descriptionText}>
              Ensuite, <Text style={styles.boldText}>votez</Text> pour éliminer qui vous pensez être le menteur ! Si vous éliminez le bon joueur, vous gagnez ! 🏆
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <View style={styles.featureCard}>
              <Users color="#fff" size={32} />
              <Text style={styles.featureTitle}>3-10 joueurs</Text>
              <Text style={styles.featureText}>Idéal entre amis ou en famille</Text>
            </View>
            
            <View style={styles.featureCard}>
              <Zap color="#fff" size={32} />
              <Text style={styles.featureTitle}>Parties rapides</Text>
              <Text style={styles.featureText}>5-10 minutes par manche</Text>
            </View>

            <View style={styles.featureCard}>
              <Heart color="#fff" size={32} />
              <Text style={styles.featureTitle}>100% écologique</Text>
              <Text style={styles.featureText}>Pas de cartes physiques !</Text>
            </View>

            <View style={styles.featureCard}>
              <Smartphone color="#fff" size={32} />
              <Text style={styles.featureTitle}>Ultra simple</Text>
              <Text style={styles.featureText}>Juste un pseudo, aucun compte</Text>
            </View>
          </View>

          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>🎉 Perfect pour vos soirées !</Text>
            <Text style={styles.highlightText}>
              Parlez de vive voix, rigolez ensemble, et laissez l&apos;appli gérer le jeu. 
              Pas de préparation, pas de matériel : <Text style={styles.boldText}>tous à vos smartphones</Text> et c&apos;est parti !
            </Text>
          </View>

          <View style={styles.gameplaySection}>
            <Text style={styles.gameplaySectionTitle}>🎮 Déroulement d&apos;une partie</Text>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Réunissez vos amis{"\n"}</Text>
                  Rassemblez au minimum 3 personnes (idéal entre 4 et 8 joueurs). Chacun a besoin de son smartphone.
                </Text>
              </View>
              
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Créez la partie{"\n"}</Text>
                  Un joueur crée la partie et devient l&apos;organisateur. Un code unique est généré automatiquement.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Rejoignez tous{"\n"}</Text>
                  Les autres joueurs entrent le code pour rejoindre. Tout le monde se voit dans le lobby !
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Distribution des cartes{"\n"}</Text>
                  L&apos;organisateur lance la partie. Chaque joueur reçoit sa carte secrète : le mot à faire deviner, ou la terrible carte <Text style={styles.boldText}>MENTEUR</Text>.
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>5.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Donnez vos indices{"\n"}</Text>
                  À tour de rôle, chaque joueur donne <Text style={styles.boldText}>un seul mot</Text> pour faire deviner ce qu&apos;il a, sans être trop précis. Le menteur doit improviser avec la catégorie !
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>6.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Votez pour le menteur{"\n"}</Text>
                  Après le tour de table, tout le monde vote en même temps pour désigner le joueur suspect. Qui est le menteur ?
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>7.</Text>
                <Text style={styles.stepText}>
                  <Text style={styles.stepTitle}>Découvrez le résultat{"\n"}</Text>
                  Si le menteur est démasqué, les joueurs honnêtes gagnent ! S&apos;il échappe au vote, c&apos;est lui qui remporte la manche. Rejouez pour prendre votre revanche !
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>🎯 Dans le jeu</Text>
            <View style={styles.statsList}>
              <Text style={styles.statsItem}>• Plus de 200 mots à deviner</Text>
              <Text style={styles.statsItem}>• 10 catégories variées</Text>
              <Text style={styles.statsItem}>• Vote à l&apos;aveugle avec timer</Text>
              <Text style={styles.statsItem}>• Système de départage en cas d&apos;égalité</Text>
              <Text style={styles.statsItem}>• Synchronisation temps réel ultra-rapide</Text>
              <Text style={styles.statsItem}>• Statistiques détaillées de vos parties</Text>
              <Text style={styles.statsItem}>• Réorganisation de l&apos;ordre des joueurs</Text>
            </View>
          </View>

          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>⚡ On ne peut pas faire plus simple !</Text>
            <Text style={styles.ctaText}>
              1. Créez une partie en 2 secondes{"\n"}
              2. Partagez le code avec vos amis{"\n"}
              3. Jouez et amusez-vous !
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  title: {
    fontSize: 42,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    opacity: 0.95,
    marginBottom: 10,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 350,
    gap: 16,
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    gap: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#C239B3",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#333",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#C239B3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: "#e0e0e0",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  modalButtonSecondaryText: {
    color: "#666",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  descriptionSection: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  descriptionText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
    textAlign: "left",
    opacity: 0.95,
  },
  boldText: {
    fontWeight: "800" as const,
  },
  featuresSection: {
    width: "100%",
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "center",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  featureText: {
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  highlightBox: {
    width: "100%",
    backgroundColor: "rgba(255, 215, 0, 0.25)",
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 3,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  highlightTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  highlightText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.95,
  },
  statsSection: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  statsList: {
    gap: 10,
  },
  statsItem: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
    opacity: 0.95,
  },
  ctaBox: {
    width: "100%",
    backgroundColor: "rgba(138, 43, 226, 0.3)",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 3,
    borderColor: "rgba(138, 43, 226, 0.6)",
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  ctaText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 28,
    textAlign: "center",
    opacity: 0.95,
  },
  gameplaySection: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 24,
    gap: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  gameplaySectionTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  stepsList: {
    gap: 20,
  },
  stepItem: {
    flexDirection: "row" as const,
    gap: 12,
    alignItems: "flex-start",
  },
  stepNumber: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "rgba(255, 215, 0, 0.9)",
    minWidth: 32,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    lineHeight: 22,
    opacity: 0.95,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#fff",
  },
  shareAppButton: {
    backgroundColor: "rgba(0, 200, 100, 0.3)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "rgba(0, 200, 100, 0.5)",
    width: "100%",
    maxWidth: 350,
  },
  shareAppButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
