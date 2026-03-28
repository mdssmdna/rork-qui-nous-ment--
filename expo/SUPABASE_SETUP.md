# 🎮 Configuration Supabase pour "Qui nous ment ?"

## ✅ Configuration actuelle

Votre application est déjà configurée avec :
- **URL Supabase** : `https://koqvellenvwhboblrhau.supabase.co`
- **Clé API** : Configurée dans `lib/supabase.ts`

## 📋 Étapes d'installation (À FAIRE)

### 1️⃣ Exécuter le schéma SQL

1. Allez sur [https://supabase.com](https://supabase.com) et connectez-vous
2. Ouvrez votre projet : `koqvellenvwhboblrhau`
3. Dans la barre latérale, allez dans **SQL Editor**
4. Cliquez sur **New Query**
5. Copiez-collez **TOUT** le contenu du fichier `supabase/schema.sql`
6. Cliquez sur **Run** (ou `Ctrl+Enter`)
7. ✅ Vérifiez qu'il n'y a pas d'erreurs

### 2️⃣ Activer Realtime (GRATUIT - Pas besoin de Database Replication)

**IMPORTANT** : Vous n'avez PAS besoin de Database Replication (fonctionnalité payante). Nous utilisons **Realtime** qui est GRATUIT et fonctionne parfaitement !

1. Dans votre projet Supabase, allez dans **Database** (barre latérale)
2. Cliquez sur **Replication** dans le sous-menu
3. Vous verrez une section "**Publications**" (pas "Replication")
4. Trouvez la publication `supabase_realtime`
5. Activez les tables suivantes en les cochant :
   - ✅ `games`
   - ✅ `players`
   - ✅ `votes`
6. Cliquez sur **Save**

**Alternative** : Si vous ne trouvez pas cette section, allez dans **SQL Editor** et exécutez :

```sql
-- Activer Realtime pour la table games
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Activer Realtime pour la table players
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Activer Realtime pour la table votes
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
```

### 3️⃣ Vérifier la configuration RLS (Row Level Security)

Les politiques RLS sont déjà configurées dans le schéma SQL pour autoriser toutes les opérations (adapté pour un jeu en soirée).

Pour vérifier :
1. Allez dans **Authentication** → **Policies**
2. Vérifiez que les tables ont bien des politiques activées
3. Si elles n'apparaissent pas, c'est que le schéma SQL n'a pas été exécuté (retournez à l'étape 1)

## 🎉 C'est tout !

Votre application est maintenant prête à fonctionner avec Supabase !

## 🧪 Tester l'application

### Étape 1 : Créer un compte admin

1. Lancez l'application
2. Cliquez sur **"Créer une partie"**
3. Remplissez le formulaire :
   - Nom complet ou pseudo
   - Email (exemple : `admin@test.com`)
   - Mot de passe

### Étape 2 : Créer une partie

1. Une fois connecté, l'application crée automatiquement une partie
2. **Notez le code** de 8 caractères affiché (exemple : `ABC12DEF`)
3. Vous êtes maintenant dans le **lobby admin**

### Étape 3 : Rejoindre depuis un autre appareil

1. Sur un autre téléphone/navigateur, ouvrez l'application
2. Cliquez sur **"Rejoindre une partie"**
3. Entrez votre nom/pseudo
4. Entrez le code de 8 caractères
5. Cliquez sur **"Rejoindre"**

### Étape 4 : Vérifier la synchronisation temps réel

- Les deux écrans doivent se synchroniser instantanément ! 🎯
- Quand un joueur rejoint, il apparaît sur tous les écrans
- Quand l'admin distribue les cartes, tout le monde les reçoit en même temps

## 🔍 Vérifier que tout fonctionne

### Dans Supabase

1. Allez dans **Table Editor** (barre latérale)
2. Cliquez sur la table `admins` :
   - Vous devriez voir votre compte admin
3. Cliquez sur la table `games` :
   - Vous devriez voir votre partie avec le code
4. Cliquez sur la table `players` :
   - Vous devriez voir tous les joueurs connectés

### Dans l'application

1. **Test de base** :
   - Créez un compte admin → OK si vous arrivez au lobby
   - Créez une partie → OK si vous voyez un code de 8 caractères

2. **Test temps réel** :
   - Ouvrez 2 navigateurs/téléphones
   - Rejoignez la même partie
   - Vous devriez voir les joueurs apparaître en temps réel

3. **Test du jeu** :
   - Avec au moins 2 joueurs, cliquez sur "Distribuer les cartes"
   - Chaque joueur devrait voir sa carte
   - L'admin peut lancer le vote
   - Tout le monde vote → Résultats affichés

## 📊 Structure de la base de données

```
admins
├─ id (UUID)
├─ name (TEXT)
├─ email (TEXT - UNIQUE)
├─ password (TEXT)
└─ created_at (TIMESTAMP)

games
├─ id (UUID)
├─ game_code (TEXT - UNIQUE) → Code à 8 caractères
├─ admin_id (UUID) → Référence à admins
├─ phase (TEXT) → welcome|auth|admin-lobby|waiting-room|card-reveal|voting|tie-breaker|results
├─ current_word (TEXT) → Mot à deviner
├─ word_category (TEXT) → Catégorie du mot
├─ liar_id (UUID) → ID du menteur
├─ time_left (INTEGER) → Temps restant pour voter
├─ tie_breaker_id (UUID) → Joueur qui brise l'égalité
├─ winner (TEXT) → players|liar
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

players
├─ id (UUID)
├─ game_id (UUID) → Référence à games
├─ name (TEXT)
├─ is_admin (BOOLEAN)
├─ card (TEXT) → MENTEUR ou le mot à deviner
└─ created_at (TIMESTAMP)

votes
├─ id (UUID)
├─ game_id (UUID) → Référence à games
├─ voter_id (UUID) → ID du joueur qui vote
├─ target_id (UUID) → ID du joueur voté
├─ created_at (TIMESTAMP)
└─ UNIQUE(game_id, voter_id) → Un vote par joueur par partie
```

## ⚡ Comment fonctionne le temps réel

L'application utilise **Supabase Realtime** (GRATUIT) :

1. **Connexion au channel** :
   ```typescript
   const channel = supabase.channel(`game:${gameId}`)
   ```

2. **Écoute des changements** :
   - Changements sur la table `games` → Recharge l'état du jeu
   - Changements sur la table `players` → Met à jour la liste des joueurs
   - Changements sur la table `votes` → Met à jour les votes

3. **Synchronisation automatique** :
   - Quand un joueur rejoint → Tous les écrans se mettent à jour
   - Quand l'admin lance le vote → Tout le monde voit le timer
   - Quand quelqu'un vote → Les votes sont comptabilisés en temps réel

**Pas besoin de Database Replication !** Realtime suffit amplement pour ce type d'application.

## ⚠️ Sécurité

- ✅ La clé `anon public` peut être dans le code (c'est fait pour)
- ✅ Les politiques RLS sont configurées pour autoriser toutes les opérations
- ✅ Adapté pour un jeu en soirée entre amis
- ⚠️ Ne partagez JAMAIS votre clé `service_role`

## 🆘 Problèmes courants

### ❌ "Error: relation does not exist"

**Cause** : Le schéma SQL n'a pas été exécuté.

**Solution** :
1. Allez dans **SQL Editor**
2. Copiez-collez le contenu de `supabase/schema.sql`
3. Cliquez sur **Run**

### ❌ "Invalid API key"

**Cause** : La clé API est incorrecte.

**Solution** :
1. Vérifiez dans **Settings** → **API** que l'URL et la clé correspondent
2. La clé est déjà configurée dans `lib/supabase.ts`

### ❌ "Partie non trouvée"

**Cause** : Le code de partie n'existe pas ou a été mal saisi.

**Solution** :
1. Vérifiez que le code est bien en MAJUSCULES
2. Vérifiez qu'il n'y a pas d'espaces
3. Vérifiez dans **Table Editor** → `games` que la partie existe

### ❌ Les joueurs ne se synchronisent pas

**Cause** : Realtime n'est pas activé sur les tables.

**Solution** :
1. Allez dans **Database** → **Replication**
2. Trouvez la publication `supabase_realtime`
3. Cochez les tables `games`, `players`, `votes`
4. OU exécutez le SQL suivant :
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
```

### ❌ "Network request failed"

**Cause** : Problème de connexion réseau ou URL incorrecte.

**Solution** :
1. Vérifiez votre connexion Internet
2. Vérifiez que l'URL Supabase est correcte dans `lib/supabase.ts`
3. Essayez de recharger l'application

## 🚀 Fonctionnalités implémentées

- ✅ Inscription/Connexion admin
- ✅ Création de partie avec code unique
- ✅ Rejoindre une partie
- ✅ Synchronisation temps réel (Realtime)
- ✅ Distribution des cartes
- ✅ Vote avec timer (10 secondes)
- ✅ Gestion des égalités (tie-breaker)
- ✅ Résultats avec gagnant
- ✅ Rejouer une partie
- ✅ Catégories de mots
- ✅ Interface multicolore et moderne

## 📱 Tester sur mobile

1. Scannez le QR code affiché dans l'application web
2. Ouvrez avec **Expo Go**
3. Jouez avec vos amis en temps réel !

## 💡 Astuce

Pour tester rapidement :
1. Ouvrez 3 onglets de navigateur
2. Premier onglet : Créez un compte admin et une partie
3. Deuxième et troisième onglets : Rejoignez avec des pseudos différents
4. Jouez ! Vous verrez la synchronisation en temps réel 🎮
