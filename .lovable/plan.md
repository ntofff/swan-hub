
# Bloc 2 — SWAN : Admin, RBAC & Plugins métiers

## Étape 1 : RBAC & Admin Console
- Le RBAC est déjà en place (user_roles + has_role + AdminGuard)
- **Admin Console** : connecter aux vraies données DB
  - Dashboard KPI (count users, signups récents, plugins actifs, feedback)
  - Liste utilisateurs avec recherche, détail, gestion plugins
  - Gestion promotions (CRUD)
  - Feedback admin (filtres, notes, statut résolu/ouvert)
  - Analytics plugins
  - Theme manager (CRUD thèmes)
  - Audit logs

**Migration nécessaire** : ajouter colonnes `admin_note` et `status` à la table `feedback`

## Étape 2 : Quotes & Invoices
- Page détail devis avec édition
- Page détail facture
- Conversion devis → facture
- Historique paiements
- Filtres par statut/client
- Badges statut colorés

## Étape 3 : Vehicle Logbook / IK
- CRUD complet véhicules, conducteurs, trajets, trajets fréquents
- Calcul km auto (fin - début)
- Calcul IK auto (barème fiscal FR)
- Totaux par période/véhicule/conducteur
- Filtres et presets trajets
- Interface export Excel prête

## Étape 4 : Feedback amélioré
- Bouton déjà présent sur chaque écran ✓
- Auto-attacher écran courant (pathname)
- Types déjà implémentés ✓

## Ordre d'exécution
1. Migration DB (feedback status + admin_note)
2. Admin Console complète
3. Quotes/Invoices détail + conversion
4. Vehicle Logbook complet
5. Feedback screen tracking
