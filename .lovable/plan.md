
# Plan SWAN - Audit & Améliorations Majeures

## Phase 1 — Corrections immédiates
1. **Fix Welcome Screen** : ne s'affiche qu'une fois après login (pas à chaque retour sur `/`). Utiliser un flag session (`sessionStorage`) au lieu de `localStorage`.
2. **Renommer en "SWAN · HUB"** avec tagline "Simple Work" partout (nav, welcome, about, footer).

## Phase 2 — Compte Admin
3. **Créer le compte admin** avec les identifiants fournis (`admin-64600` / `Delt@25395-64600`). Note : Supabase utilise un email pour l'auth, donc on utilisera `admin-64600@swan-hub.app` comme email.
4. **Attribuer le rôle admin** via la table `user_roles`.

## Phase 3 — Page À propos enrichie
5. Remplir la page About avec contenu marketing complet : vision, pricing, argument café, écosystème plugins.

## Phase 4 — Système d'abonnement (UI)
6. **Page Pricing/Abonnement** avec :
   - 1 mois gratuit (3 plugins au choix)
   - Abonnement : 1€/mois par plugin
   - Argument marketing "moins cher qu'un café"
   - Note : l'intégration Stripe réelle sera une étape séparée

## Phase 5 — UX & Animations
7. Animations d'entrée sur les pages principales (fade-in, slide-up)
8. Audit des flux : réduire les taps, simplifier les parcours
9. Optimisation performance (lazy loading des pages)

## Phase 6 — Admin amélioré
10. Boutons d'édition inline pour l'admin sur les pages clés
11. Onglet Admin enrichi avec paramètres app

## ⚠️ Points d'attention
- Le mot de passe admin sera stocké via Supabase Auth (hashé côté serveur) — jamais en clair dans le code
- Le système de paiement réel (Stripe) nécessitera une phase dédiée
- On procède phase par phase pour garder le contrôle
