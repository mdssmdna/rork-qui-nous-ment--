# Mise à jour de la base de données Supabase

## Changements effectués

Le champ `name` a été retiré de la table `admins`. Les utilisateurs entrent maintenant uniquement leur email et mot de passe lors de l'inscription/connexion. Le pseudo est demandé au moment de créer une partie.

## Étapes pour mettre à jour votre base de données

### Option 1: Supprimer et recréer les tables (⚠️ Perd toutes les données)

1. Connectez-vous à votre dashboard Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Exécutez le script complet dans `supabase/schema.sql`

### Option 2: Mise à jour incrémentale (Conserve les comptes existants)

Si vous avez déjà des comptes administrateurs et souhaitez les conserver:

1. Connectez-vous à votre dashboard Supabase
2. Allez dans "SQL Editor"
3. Exécutez cette requête SQL:

```sql
-- Retirer la colonne name de la table admins
ALTER TABLE admins DROP COLUMN IF EXISTS name;
```

## Vérification

Après la mise à jour, vérifiez que la structure de la table `admins` est:
- `id` (UUID)
- `email` (TEXT)
- `password` (TEXT)
- `created_at` (TIMESTAMP)

## Impact sur l'application

- **Inscription**: Demande uniquement email et mot de passe
- **Connexion**: Demande uniquement email et mot de passe
- **Création de partie**: Une popup demande le pseudo au moment de créer la partie
- **Avantage**: Possibilité de changer de pseudo à chaque nouvelle partie

## Notes importantes

- Les comptes existants seront conservés si vous utilisez l'Option 2
- Les parties en cours ne seront pas affectées
- Le pseudo de l'administrateur est maintenant stocké uniquement dans la table `players`
