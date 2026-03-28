# Migration vers Supabase Auth

## Changements importants

L'application utilise maintenant **Supabase Auth** au lieu d'une table `admins` personnalisée. Les mots de passe sont maintenant sécurisés et gérés par Supabase.

## Avantages de ce changement

✅ **Sécurité**: Les mots de passe ne sont plus stockés en clair dans la base de données  
✅ **Email de confirmation**: Possibilité d'activer la vérification par email  
✅ **Réinitialisation de mot de passe**: Fonctionnalité intégrée  
✅ **Visibilité**: Les utilisateurs apparaissent dans Authentication > Users dans le dashboard Supabase  

## Instructions pour mettre à jour votre base de données

### Étape 1: Activer l'authentification par email dans Supabase

1. Connectez-vous à votre dashboard Supabase: https://supabase.com/dashboard/project/koqvellenvwhboblrhau
2. Allez dans **Authentication** > **Providers**
3. Assurez-vous que **Email** est activé
4. **Important**: Désactivez "Confirm email" pour faciliter les tests (vous pouvez l'activer plus tard)

### Étape 2: Mettre à jour le schéma de la base de données

1. Allez dans **SQL Editor** dans votre dashboard Supabase
2. Créez une nouvelle requête
3. Copiez et exécutez **tout le contenu** du fichier `supabase/schema.sql`

Le script va:
- Supprimer l'ancienne table `admins` (qui stockait les mots de passe en clair)
- Recréer la table `games` avec une référence vers `auth.users` au lieu de `admins`
- Conserver les tables `players` et `votes` sans modification

### Étape 3: Activer Realtime (IMPORTANT)

Pour que le jeu fonctionne en temps réel, vous devez activer la réplication:

1. Allez dans **Database** > **Replication** dans le menu de gauche
2. Activez la réplication pour ces 3 tables:
   - ✅ `games`
   - ✅ `players`
   - ✅ `votes`

**Si vous n'avez pas d'abonnement payant et que Replication n'est pas disponible:**

L'application utilisera un système de polling (rafraîchissement régulier) au lieu du temps réel. Le jeu fonctionnera quand même, mais avec un léger délai.

### Étape 4: Testez l'application

1. **Créer un compte**: Utilisez l'écran "Créer un compte" avec email et mot de passe
2. **Vérifier dans Supabase**: Allez dans **Authentication** > **Users**, vous devriez voir votre utilisateur créé
3. **Tester la connexion**: Déconnectez-vous et reconnectez-vous avec vos identifiants
4. **Créer une partie**: Entrez votre pseudo et créez une partie de test

## Récupération des données existantes

⚠️ **Attention**: Si vous aviez des comptes dans l'ancienne table `admins`, ils seront supprimés lors de la migration. Les utilisateurs devront créer de nouveaux comptes avec Supabase Auth.

Les parties en cours ne seront **pas affectées** car elles sont stockées dans la table `games` qui est conservée (seule la foreign key change).

## Vérification que tout fonctionne

✅ Les nouveaux utilisateurs apparaissent dans Authentication > Users  
✅ La création de compte fonctionne  
✅ La connexion fonctionne  
✅ La création de parties fonctionne  
✅ Les joueurs peuvent rejoindre les parties  
✅ Le jeu se synchronise en temps réel (si Realtime activé)  

## En cas de problème

### Erreur "User already registered"
L'email est déjà utilisé. Utilisez un autre email ou connectez-vous avec cet email.

### Les utilisateurs n'apparaissent pas dans Authentication
Vérifiez que vous avez bien exécuté le nouveau `schema.sql` et que l'application utilise bien `supabase.auth.signUp()`.

### Le jeu ne se synchronise pas
Activez la réplication pour les tables `games`, `players` et `votes` dans Database > Replication.

### Erreur "relation auth.users does not exist"
Exécutez le script SQL complet depuis `supabase/schema.sql`.

## Structure finale

```
auth.users (géré par Supabase Auth)
├── id (UUID)
├── email
└── encrypted_password

games
├── id (UUID)
├── game_code (TEXT)
├── admin_id (UUID) → référence auth.users(id)
├── phase (TEXT)
├── current_word (TEXT)
├── word_category (TEXT)
├── liar_id (UUID)
└── ...

players
├── id (UUID)
├── game_id (UUID) → référence games(id)
├── name (TEXT)
├── is_admin (BOOLEAN)
└── card (TEXT)

votes
├── id (UUID)
├── game_id (UUID) → référence games(id)
├── voter_id (UUID)
└── target_id (UUID)
```
