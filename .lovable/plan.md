## Plan de développement — Bloc 1

### Étape 1 : Schéma de base de données
Créer toutes les tables via migrations :
- `profiles` (lié à auth.users, nom, plan, avatar)
- `user_roles` (RBAC admin/user)
- `user_activities` (activités métier avec couleur/tag)
- `plugins`, `user_plugins` (activation de plugins par utilisateur)
- `feedback` (type, message, contexte, plugin, user_id)
- `reports` (titre, notes, timestamp)
- `log_entries` (texte, date/heure)
- `tasks` (texte, priorité, activité, statut)
- `missions` (titre, client, statut, dates, notes)
- `mission_checklist_items`, `mission_activity_logs`
- `quotes`, `invoices`, `payments`
- `vehicles`, `drivers`, `frequent_routes`, `trips`
- `promotions`, `themes`, `audit_logs`
- RLS sur toutes les tables (user_id = auth.uid())
- Trigger auto-création profil à l'inscription

### Étape 2 : Authentification
- Pages : Login, Signup, Mot de passe oublié, Réinitialisation
- Client Supabase configuré
- Hook `useAuth` avec session persistante
- Écrans en français, design premium SWAN

### Étape 3 : Protection des routes
- `AuthGuard` : redirige vers /login si non connecté
- `AdminGuard` : vérifie le rôle admin via `user_roles`
- Page "Accès refusé" pour admin
- About reste publique

### Étape 4 : Profil utilisateur
- Afficher User ID, email, nom, plan
- Gestion des activités (CRUD avec couleurs)
- Plugins actifs liés à la DB
- Bouton déconnexion

### Étape 5 : Connecter les plugins à la DB
- Wiring CRUD sur Reports, LogEntries, Tasks, Missions, Quotes, Vehicles, Trips
- États vides premium
- Données de démo insérées au signup si besoin
