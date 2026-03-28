import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { ArrowLeft, Users, Home } from "lucide-react-native";

export default function JoinGameScreen() {
  const router = useRouter();
  const { joinGame, gameState, currentPlayer, resetGame } = useGame();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [gameCode, setGameCode] = useState("");

  useEffect(() => {
    if (currentPlayer && !currentPlayer.isAdmin) {
      if (gameState.phase === "waiting-room") {
        router.replace("/admin-lobby" as any);
      } else if (gameState.phase === "card-reveal" || gameState.phase === "voting") {
        router.replace("/game" as any);
      }
    }
  }, [currentPlayer, gameState.phase]);

  const handleJoin = async () => {
    if (!name.trim() || !gameCode.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (gameCode.length !== 8) {
      Alert.alert("Erreur", "Le code doit contenir 8 caractères");
      return;
    }

    try {
      await joinGame(gameCode.toUpperCase(), name);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Impossible de rejoindre la partie"
      );
    }
  };

  return (
    <LinearGradient
      colors={["#FF6B9D", "#C239B3", "#4776E6", "#8E54E9"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topButtonsRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#fff" size={28} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={async () => {
                await resetGame();
                router.replace("/" as any);
              }}
            >
              <Home color="#fff" size={28} />
            </TouchableOpacity>
          </View>

          <Users color="#fff" size={80} style={styles.icon} />

          <Text style={styles.title}>Rejoindre une partie</Text>
          <Text style={styles.subtitle}>
            Entrez le code partagé par l&apos;administrateur
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Votre nom / pseudo</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Entrez votre nom"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Code de la partie</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={gameCode}
                onChangeText={(text) => setGameCode(text.toUpperCase())}
                placeholder="XXXXXXXX"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

            <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
              <Text style={styles.joinButtonText}>Rejoindre la partie</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  topButtonsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 30,
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
  icon: {
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 40,
    textAlign: "center",
    opacity: 0.9,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#fff",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700" as const,
    textAlign: "center",
    letterSpacing: 4,
  },
  joinButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  joinButtonText: {
    color: "#C239B3",
    fontSize: 18,
    fontWeight: "700" as const,
  },
});
