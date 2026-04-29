// ============================================================
// SWAN · HUB — Pages simples : Notifications, NotFound, Legal
// Re-exports pour ResetPassword et UnlockAccount depuis ForgotPassword
// ============================================================

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronLeft, Home as HomeIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ════════════════════════════════════════════════════════════
// 404 NOT FOUND
// ════════════════════════════════════════════════════════════
export function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 800,
          color: 'var(--color-primary)',
          marginBottom: 'var(--space-3)',
        }}
        className="text-gold"
      >
        404
      </div>
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
        Page introuvable
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginBottom: 'var(--space-6)', maxWidth: 320 }}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <button onClick={() => navigate('/')} className="btn btn-primary">
        <HomeIcon size={16} /> Retour à l'accueil
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS — Panneau "nouveautés" in-app
// ════════════════════════════════════════════════════════════
export function Notifications() {
  const navigate = useNavigate();

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('broadcasts')
        .select('*')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-header-title">Nouveautés</h1>
          <p className="page-header-subtitle">Les annonces de l'équipe SWAN</p>
        </div>
      </header>

      <div className="px-4">
        {broadcasts.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <Bell size={32} style={{ color: 'var(--color-text-3)', margin: '0 auto var(--space-3)' }} />
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>
              Aucune nouveauté
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
              Vous serez notifié dès qu'il y aura du nouveau.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {broadcasts.map((b: any) => (
              <div key={b.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span className={`badge badge-${getCategoryTone(b.category)}`}>
                    {getCategoryLabel(b.category)}
                  </span>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)' }}>
                    {formatDate(b.sent_at)}
                  </span>
                </div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                  {b.title}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LEGAL — Documents juridiques solides
// ════════════════════════════════════════════════════════════
export function Legal() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const docs: Record<string, { title: string; subtitle: string; content: string }> = {
    cgv: {
      title: 'Conditions Générales de Vente',
      subtitle: 'Version 1.0 · En vigueur à compter de 2026',
      content: `ARTICLE 1 — OBJET

Les présentes Conditions Générales de Vente (ci-après "CGV") régissent sans restriction ni réserve l'ensemble des ventes de services d'abonnement proposées par SWAN HUB SASU (ci-après "l'Éditeur") via l'application SWAN HUB (ci-après "l'Application"), aux utilisateurs (ci-après "le Client").

Toute souscription à un abonnement payant emporte acceptation pleine et entière des présentes CGV par le Client.


ARTICLE 2 — IDENTIFICATION DE L'ÉDITEUR

Raison sociale : SWAN HUB SASU
Forme juridique : Société par Actions Simplifiée Unipersonnelle
Capital social : [à compléter]
Numéro SIREN : [à compléter]
Siège social : [à compléter]
Représentant légal : [à compléter]
Contact : contact@swanhub.fr
RGPD : rgpd@swanhub.fr


ARTICLE 3 — DESCRIPTION DES SERVICES

L'Application SWAN HUB est une boîte à outils numérique destinée aux artisans, indépendants et petites entreprises, permettant la gestion centralisée de leur activité professionnelle via des outils activables à la carte.

Les services comprennent :
— Accès à l'Application en mode SaaS via navigateur web et applications mobiles
— Hébergement sécurisé des données utilisateur
— Mises à jour régulières et correctives
— Support utilisateur par email


ARTICLE 4 — TARIFS ET FORMULES D'ABONNEMENT

Les prix sont indiqués en euros, hors taxes (HT) et toutes taxes comprises (TTC), TVA française de 20% incluse.

4.1 — Formule Découverte
— Gratuit pendant 2 mois
— Accès à 3 outils au choix parmi les outils disponibles
— Aucune carte bancaire requise

4.2 — Formule À la carte
— 1,00 € HT / 1,20 € TTC par outil actif par mois
— Activation et désactivation libre des outils
— Paiement mensuel par prélèvement automatique

4.3 — Formule Pro illimité
— 9,00 € HT / 10,80 € TTC par mois
— Accès illimité à tous les outils actuels et futurs
— Accès IA illimité
— Support prioritaire

L'Éditeur se réserve le droit de modifier les tarifs à tout moment, moyennant un préavis de trente (30) jours par email au Client. Les modifications s'appliquent au terme de la période de facturation en cours.


ARTICLE 5 — SOUSCRIPTION ET PAIEMENT

5.1 — Modalités de paiement
Le règlement des abonnements s'effectue exclusivement en ligne par carte bancaire via notre prestataire de paiement sécurisé Stripe Payments Europe Limited, conforme aux normes PCI DSS.

L'Éditeur ne stocke aucune donnée bancaire sur ses serveurs.

5.2 — Facturation
Les factures sont émises mensuellement et mises à disposition du Client dans son espace personnel. Elles sont conservées pendant dix (10) ans conformément aux obligations légales françaises.

5.3 — Défaut de paiement
En cas de rejet du prélèvement, l'Éditeur se réserve le droit de suspendre l'accès au Service après une mise en demeure restée infructueuse pendant sept (7) jours.


ARTICLE 6 — DURÉE ET RÉSILIATION

6.1 — Durée
Les abonnements sont conclus pour une durée indéterminée à compter de la première facturation, reconductibles tacitement de mois en mois.

6.2 — Résiliation par le Client
Le Client peut résilier son abonnement à tout moment depuis son espace personnel, sans préavis et sans justification. La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement au prorata n'est effectué.

6.3 — Résiliation par l'Éditeur
L'Éditeur peut résilier l'abonnement en cas de manquement grave du Client aux présentes CGV ou aux Conditions Générales d'Utilisation, après mise en demeure restée infructueuse pendant quinze (15) jours.


ARTICLE 7 — DROIT DE RÉTRACTATION

Conformément à l'article L221-28 du Code de la consommation, le Client renonce expressément à son droit de rétractation de quatorze (14) jours en souscrivant à un abonnement payant et en demandant le commencement immédiat de l'exécution du service.

Cette renonciation est sans préjudice du droit de résiliation prévu à l'article 6.2.


ARTICLE 8 — DONNÉES PERSONNELLES

Le traitement des données personnelles du Client est régi par notre Politique de Confidentialité, conforme au Règlement Général sur la Protection des Données (RGPD).

Voir la Politique de Confidentialité : /legal/privacy


ARTICLE 9 — PROPRIÉTÉ INTELLECTUELLE

9.1 — Propriété de l'Éditeur
L'ensemble des éléments composant l'Application (code source, design, marques, logo, textes, images, icônes, etc.) est la propriété exclusive de l'Éditeur et protégé par les lois françaises et internationales en vigueur.

9.2 — Licence d'utilisation
L'Éditeur concède au Client une licence d'utilisation non exclusive, non transférable et révocable, limitée à la durée de son abonnement.

9.3 — Données du Client
Le Client conserve la pleine propriété de ses données. L'Éditeur ne dispose que d'une licence limitée d'hébergement et de traitement nécessaire à la fourniture du Service.


ARTICLE 10 — DISPONIBILITÉ DU SERVICE

L'Éditeur s'engage à fournir un service accessible 24h/24 et 7j/7 avec un taux de disponibilité cible de 99,5% mensuel, hors périodes de maintenance programmée.

L'Éditeur ne saurait être tenu responsable des interruptions dues à la force majeure, aux attaques informatiques externes, aux défaillances des prestataires tiers (hébergeur, fournisseur de paiement, etc.) ou aux problèmes de connexion internet du Client.


ARTICLE 11 — LIMITATION DE RESPONSABILITÉ

La responsabilité de l'Éditeur est limitée au montant total des sommes effectivement versées par le Client au cours des douze (12) mois précédant la survenance du dommage.

L'Éditeur ne saurait être tenu responsable des dommages indirects, notamment la perte de chiffre d'affaires, la perte d'opportunité commerciale ou les dommages immatériels.


ARTICLE 12 — RÉCLAMATIONS ET MÉDIATION

Toute réclamation doit être adressée à : contact@swanhub.fr

Conformément à l'article L.612-1 du Code de la consommation, le Client peut recourir gratuitement au service de médiation de la consommation en cas de litige persistant.


ARTICLE 13 — DROIT APPLICABLE ET JURIDICTION

Les présentes CGV sont soumises au droit français. Tout litige relatif à leur interprétation ou à leur exécution sera soumis à la compétence exclusive des tribunaux du siège social de l'Éditeur, sauf disposition légale contraire.


ARTICLE 14 — MODIFICATION DES CGV

L'Éditeur se réserve le droit de modifier les présentes CGV à tout moment. Toute modification substantielle fait l'objet d'une notification préalable au Client par email, au moins trente (30) jours avant sa prise d'effet.


Pour toute question : contact@swanhub.fr`,
    },

    cgu: {
      title: "Conditions Générales d'Utilisation",
      subtitle: "Version 1.0 · En vigueur à compter de 2026",
      content: `ARTICLE 1 — OBJET

Les présentes Conditions Générales d'Utilisation (ci-après "CGU") définissent les règles d'accès et d'utilisation de l'application SWAN HUB (ci-après "l'Application") par ses utilisateurs (ci-après "le Client" ou "l'Utilisateur").

L'accès à l'Application implique l'acceptation pleine et entière des présentes CGU.


ARTICLE 2 — ACCÈS AU SERVICE

2.1 — Conditions d'inscription
L'inscription à l'Application est réservée aux personnes physiques majeures capables juridiquement, ainsi qu'aux personnes morales représentées par une personne dûment habilitée.

L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son inscription, et à les maintenir à jour pendant toute la durée de son utilisation.

2.2 — Création de compte
La création d'un compte nécessite :
— Une adresse email valide et accessible
— Un mot de passe conforme aux exigences de sécurité (minimum 8 caractères)
— L'acceptation des présentes CGU et de la Politique de Confidentialité
— La création d'un code personnel anti-phishing


ARTICLE 3 — USAGE AUTORISÉ

L'Utilisateur s'engage à utiliser l'Application conformément à sa destination et aux présentes CGU.

Sont notamment INTERDITS :
— Tout usage contraire à la législation en vigueur
— Toute tentative de contournement des mesures de sécurité
— Tout téléchargement massif ou automatisé non autorisé de données
— Toute atteinte aux droits des tiers (propriété intellectuelle, droit à l'image, etc.)
— L'envoi de contenus illégaux, injurieux, diffamatoires, racistes ou à caractère haineux
— L'envoi de spam ou de contenus malveillants (virus, malwares, etc.)
— L'usurpation d'identité ou la création de faux comptes
— L'utilisation de l'Application pour des activités concurrentielles à l'Éditeur


ARTICLE 4 — CONTENU UTILISATEUR

4.1 — Propriété des données
L'Utilisateur conserve la pleine propriété des données qu'il saisit dans l'Application (rapports, tâches, factures, clients, etc.).

4.2 — Licence accordée à l'Éditeur
L'Utilisateur concède à l'Éditeur une licence non exclusive, gratuite, limitée à la durée de l'abonnement, pour héberger, traiter et afficher ses données dans le cadre de la fourniture du Service.

4.3 — Responsabilité du contenu
L'Utilisateur est seul responsable du contenu qu'il publie ou stocke dans l'Application. L'Éditeur ne saurait être tenu responsable des contenus publiés par les Utilisateurs.


ARTICLE 5 — PROTECTION ANTI-PHISHING

Chaque Utilisateur doit définir un code personnel anti-phishing (4 à 20 caractères) lors de son inscription. Ce code est inséré dans tous les messages (email, SMS, notification) envoyés par l'Éditeur.

L'Utilisateur s'engage à ne jamais partager ce code avec des tiers, y compris avec l'équipe de l'Éditeur qui ne le demandera jamais.

Tout message prétendu venir de l'Éditeur sans ce code doit être considéré comme une tentative de phishing et signalé à security@swanhub.fr.


ARTICLE 6 — SUSPENSION ET BANNISSEMENT

L'Éditeur se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes CGU.

Les sanctions possibles, par ordre de gravité :

6.1 — Avertissement
Email informatif en cas de premier comportement suspect.

6.2 — Limitation temporaire (rate limiting)
Limitation des actions par minute pendant 24h en cas d'abus modéré.

6.3 — Suspension temporaire
Suspension du compte pour 1 à 30 jours en cas de violation répétée ou grave.

6.4 — Bannissement permanent
Suppression définitive du compte en cas de violation majeure (fraude, contenu illégal, etc.). Les données sont conservées 30 jours puis purgées définitivement.

6.5 — Bannissement et purge immédiate
En cas d'activité illégale, les données peuvent être supprimées immédiatement et transmises aux autorités compétentes sur réquisition.

Toute décision de suspension ou bannissement est notifiée à l'Utilisateur par email avec indication du motif.


ARTICLE 7 — SÉCURITÉ

L'Éditeur met en œuvre des mesures techniques et organisationnelles adaptées pour protéger les données :

— Chiffrement TLS 1.3 en transit
— Chiffrement AES-256 au repos
— Authentification sécurisée avec rate limiting
— Monitoring temps réel
— Backups quotidiens redondants
— Audits de sécurité réguliers
— Notification CNIL sous 72h en cas de violation

L'Utilisateur s'engage à contribuer à la sécurité de son compte :
— Mot de passe robuste, unique et non réutilisé
— Non-partage des identifiants
— Déconnexion sur les appareils partagés
— Signalement immédiat de toute activité suspecte


ARTICLE 8 — PROPRIÉTÉ INTELLECTUELLE

L'ensemble des éléments de l'Application (interface, code, marques, logo, contenus éditoriaux, design, illustrations) est la propriété exclusive de l'Éditeur.

Toute reproduction, modification, distribution ou utilisation non autorisée est strictement interdite et constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.


ARTICLE 9 — DISPONIBILITÉ ET MAINTENANCE

L'Éditeur s'efforce d'assurer la disponibilité de l'Application 24h/24 et 7j/7.

Des interruptions peuvent survenir pour :
— Maintenance programmée (notifiée au moins 48h à l'avance)
— Correction de failles de sécurité critiques (intervention immédiate)
— Cas de force majeure ou défaillances de prestataires tiers

L'Éditeur ne garantit pas une disponibilité de 100% et ne saurait être tenu responsable des interruptions, dans les limites prévues par la loi.


ARTICLE 10 — ÉVOLUTION DU SERVICE

L'Éditeur peut faire évoluer l'Application à tout moment : ajout, modification ou suppression de fonctionnalités, évolution de l'interface, etc.

Les modifications significatives font l'objet d'une notification préalable à l'Utilisateur.


ARTICLE 11 — RESPONSABILITÉ

11.1 — Responsabilité de l'Éditeur
L'Éditeur ne saurait être tenu responsable :
— Des dommages résultant d'un usage non conforme de l'Application
— Des pertes de données dues à un défaut de sauvegarde côté Utilisateur
— Des interruptions dues à la force majeure
— Des dommages causés par des tiers

11.2 — Responsabilité de l'Utilisateur
L'Utilisateur est responsable de tout dommage direct ou indirect causé par sa violation des CGU, et s'engage à indemniser l'Éditeur de toute réclamation de tiers résultant d'un tel manquement.


ARTICLE 12 — MODIFICATION DES CGU

L'Éditeur peut modifier les présentes CGU à tout moment. Les modifications substantielles sont notifiées à l'Utilisateur par email et affichées dans l'Application.

L'Utilisateur qui continue d'utiliser l'Application après notification est réputé avoir accepté les nouvelles CGU. En cas de refus, il peut résilier son compte conformément aux modalités prévues.


ARTICLE 13 — DROIT APPLICABLE ET LITIGES

Les présentes CGU sont soumises au droit français. Tout litige relève des tribunaux compétents du siège social de l'Éditeur.


Pour toute question : contact@swanhub.fr`,
    },

    privacy: {
      title: 'Politique de Confidentialité',
      subtitle: 'Conforme RGPD · Version 1.0 · En vigueur à compter de 2026',
      content: `PRÉAMBULE

SWAN HUB SASU (ci-après "l'Éditeur") attache une importance capitale à la protection des données personnelles de ses utilisateurs.

La présente Politique de Confidentialité explique de manière transparente comment nous collectons, utilisons, conservons et protégeons vos données personnelles, conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi française "Informatique et Libertés" modifiée.


ARTICLE 1 — RESPONSABLE DU TRAITEMENT

Raison sociale : SWAN HUB SASU
Forme juridique : SASU
Numéro SIREN : [à compléter]
Siège social : [à compléter]

Contact Délégué à la Protection des Données (DPO) :
Email : rgpd@swanhub.fr
Délai de réponse : 30 jours maximum


ARTICLE 2 — DONNÉES COLLECTÉES

2.1 — Données d'identification
— Nom et prénom
— Adresse email
— Numéro de téléphone (optionnel)
— Code anti-phishing personnel

2.2 — Données d'authentification
— Mot de passe (haché via bcrypt, jamais stocké en clair)
— Tokens de session (temporaires, chiffrés)
— Historique des connexions (IP, date, device)

2.3 — Données de facturation
— Informations de paiement : traitées exclusivement par Stripe Payments Europe Limited (aucune donnée bancaire stockée par l'Éditeur)
— Historique des factures émises

2.4 — Données d'activité professionnelle
— Métier/secteur déclaré
— Contenu créé : rapports, tâches, missions, factures, devis, clients, etc.
— Données des outils activés

2.5 — Données techniques
— Adresse IP
— User agent du navigateur
— Logs d'accès
— Cookies techniques (authentification uniquement)


ARTICLE 3 — FINALITÉS ET BASES LÉGALES

3.1 — Exécution du contrat
Base légale : article 6.1.b du RGPD
— Fourniture du service SaaS
— Gestion du compte utilisateur
— Support client

3.2 — Obligation légale
Base légale : article 6.1.c du RGPD
— Facturation et comptabilité (conservation 10 ans)
— Lutte contre la fraude et le blanchiment

3.3 — Intérêt légitime
Base légale : article 6.1.f du RGPD
— Sécurité de la plateforme (détection d'intrusions)
— Amélioration du service (statistiques anonymisées)

3.4 — Consentement
Base légale : article 6.1.a du RGPD
— Communications marketing (désabonnement libre)
— Traitement via IA tiers (Claude/Anthropic)


ARTICLE 4 — DURÉES DE CONSERVATION

— Compte actif : pendant toute la durée de l'abonnement
— Compte inactif (sans connexion) : 3 ans
— Factures et données comptables : 10 ans (obligation légale Code de commerce art. L.123-22)
— Logs de connexion : 1 an
— Logs de sécurité critiques : 5 ans
— Données supprimées (soft delete) : 30 jours puis purge définitive
— Consentements marketing : 3 ans après dernier contact


ARTICLE 5 — HÉBERGEMENT ET LOCALISATION

Toutes les données personnelles sont hébergées exclusivement au sein de l'Union Européenne.

Hébergeur principal : Supabase Inc. (via AWS Frankfurt - Allemagne)
CDN frontend : Vercel Inc. (conformité RGPD, DPA signé)

Aucun transfert de données hors de l'Union Européenne n'est effectué sans les garanties appropriées (clauses contractuelles types, certifications Data Privacy Framework, etc.).


ARTICLE 6 — SOUS-TRAITANTS

L'Éditeur fait appel aux sous-traitants suivants, encadrés par des accords de traitement des données (DPA) conformes à l'article 28 du RGPD :

— Supabase Inc. (hébergement base de données) — UE
— Vercel Inc. (hébergement frontend) — UE avec DPA
— Stripe Payments Europe Limited (paiements) — conformité PCI DSS
— Anthropic PBC (IA générative, résumés) — DPA signé, données anonymisées
— Resend (envoi d'emails transactionnels) — UE

La liste complète et à jour est disponible sur demande à rgpd@swanhub.fr.


ARTICLE 7 — VOS DROITS RGPD

Conformément au RGPD, vous disposez des droits suivants :

7.1 — Droit d'accès (article 15)
Obtenir la confirmation que vos données sont traitées et en recevoir une copie.

7.2 — Droit de rectification (article 16)
Faire corriger des données inexactes ou incomplètes.

7.3 — Droit à l'effacement / "droit à l'oubli" (article 17)
Demander la suppression de vos données (sauf obligations légales contraires, notamment comptables).

7.4 — Droit à la limitation du traitement (article 18)
Demander que le traitement soit limité dans certains cas.

7.5 — Droit à la portabilité (article 20)
Récupérer vos données dans un format structuré et couramment utilisé (JSON/CSV/PDF).
Premier export gratuit, les suivants sur devis selon le volume.

7.6 — Droit d'opposition (article 21)
Vous opposer au traitement pour des raisons tenant à votre situation particulière, notamment au marketing direct.

7.7 — Droit de ne pas faire l'objet d'une décision automatisée (article 22)
Aucune décision automatisée produisant des effets juridiques n'est prise dans notre Application.

EXERCICE DES DROITS
Pour exercer ces droits, contactez-nous à : rgpd@swanhub.fr
Nous répondrons dans un délai maximum de 30 jours (prolongeable à 60 jours pour les demandes complexes).

Une pièce d'identité peut être demandée en cas de doute sur l'identité du demandeur.


ARTICLE 8 — COOKIES

L'Application utilise exclusivement des cookies techniques essentiels :
— Cookie de session (authentification)
— Cookie de préférences (thème, langue)

Aucun cookie tiers, publicitaire ou de tracking n'est déposé.
Aucun consentement cookies n'est donc requis, conformément à l'exception de l'article 82 de la loi Informatique et Libertés.


ARTICLE 9 — SÉCURITÉ

L'Éditeur met en œuvre des mesures techniques et organisationnelles appropriées pour garantir la sécurité des données :

9.1 — Mesures techniques
— Chiffrement en transit (TLS 1.3)
— Chiffrement au repos (AES-256)
— Hachage des mots de passe (bcrypt avec salt)
— Pare-feu applicatif (WAF)
— Protection anti-DDoS
— Rate limiting sur les endpoints sensibles
— Backups automatiques quotidiens chiffrés, géo-redondants
— Monitoring 24/7 avec alertes temps réel

9.2 — Mesures organisationnelles
— Accès restreint aux données (principe du moindre privilège)
— Journalisation des accès administratifs
— Formations régulières à la sécurité
— Gestion des incidents documentée
— Audits de sécurité réguliers

9.3 — Notification de violation
En cas de violation de données susceptible d'engendrer un risque pour les droits et libertés, l'Éditeur s'engage à :
— Notifier la CNIL sous 72 heures (art. 33 RGPD)
— Informer les personnes concernées dans les meilleurs délais si le risque est élevé (art. 34 RGPD)


ARTICLE 10 — TRAITEMENT PAR IA

Certaines fonctionnalités d'assistance utilisent des modèles d'intelligence artificielle (Claude d'Anthropic).

Les données envoyées à l'IA sont :
— Anonymisées dans la mesure du possible
— Non utilisées pour l'entraînement de modèles tiers
— Soumises à un accord DPA conforme RGPD

L'Utilisateur peut désactiver les fonctions IA dans les paramètres de son compte.


ARTICLE 11 — RÉCLAMATIONS

En cas de réclamation non résolue, l'Utilisateur peut saisir la Commission Nationale de l'Informatique et des Libertés (CNIL) :

Commission Nationale de l'Informatique et des Libertés
3 Place de Fontenoy
TSA 80715
75334 PARIS CEDEX 07
Tél : 01 53 73 22 22
Site : www.cnil.fr


ARTICLE 12 — MODIFICATION DE LA POLITIQUE

L'Éditeur se réserve le droit de modifier la présente Politique de Confidentialité à tout moment.

Toute modification substantielle fait l'objet d'une notification préalable par email et/ou par affichage dans l'Application.


Contact : rgpd@swanhub.fr
Dernière mise à jour : 2026`,
    },

    mentions: {
      title: 'Mentions légales',
      subtitle: 'Informations légales SWAN HUB',
      content: `IDENTIFICATION DE L'ÉDITEUR

Raison sociale : SWAN HUB SASU
Forme juridique : Société par Actions Simplifiée Unipersonnelle (SASU)
Capital social : [à compléter]
Numéro SIREN : [à compléter]
Siège social : [à compléter]
Représentant légal : [à compléter]


CONTACTS

Contact général : contact@swanhub.fr
Protection des données (RGPD) : rgpd@swanhub.fr
Sécurité : security@swanhub.fr
Signalement de contenu illégal : legal@swanhub.fr


DIRECTEUR DE LA PUBLICATION

[à compléter]


HÉBERGEMENT

Hébergeur base de données :
Supabase Inc.
970 Toa Payoh North
Singapore 318992
Site : supabase.com
(Serveurs physiques situés à Francfort, Allemagne - UE)

Hébergeur frontend :
Vercel Inc.
440 N Barranca Ave #4133
Covina, CA 91723, USA
Site : vercel.com
(Infrastructure edge EU avec conformité RGPD)


SÉCURITÉ

— Chiffrement TLS 1.3 en transit
— Chiffrement AES-256 au repos
— Hébergement certifié ISO 27001
— Conformité RGPD complète


PROPRIÉTÉ INTELLECTUELLE

L'ensemble des éléments de l'Application SWAN HUB (design, code source, marques, logo, textes, icônes, illustrations) sont la propriété exclusive de SWAN HUB SASU, sauf mentions contraires.

Toute reproduction, représentation, modification, publication, adaptation totale ou partielle des éléments de l'Application, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de SWAN HUB SASU, sous peine de poursuites judiciaires.


CRÉDITS TECHNIQUES

Typographies : Manrope, DM Sans, JetBrains Mono — Google Fonts (SIL Open Font License)
Icônes : Lucide Icons (ISC License)
Framework : React (MIT License), Vite (MIT License)
Base de données : PostgreSQL (PostgreSQL License)


DROIT APPLICABLE

Les présentes mentions légales et tout litige relatif à l'Application sont régis par le droit français.

Les tribunaux français sont seuls compétents pour connaître de tout litige relatif à l'Application.


SIGNALEMENT DE CONTENU

Pour signaler un contenu illégal ou contraire aux conditions d'utilisation, veuillez contacter legal@swanhub.fr en fournissant :
— Description précise du contenu
— URL ou localisation dans l'Application
— Motif du signalement


Dernière mise à jour : 2026`,
    },
  };

  const doc = docs[type || ''] || {
    title: 'Document',
    subtitle: '',
    content: 'Document non trouvé.',
  };

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-header-title">{doc.title}</h1>
          <p className="page-header-subtitle">{doc.subtitle}</p>
        </div>
      </header>

      <div className="px-4">
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <pre
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-1)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {doc.content}
          </pre>
        </div>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {Object.entries(docs).filter(([k]) => k !== type).map(([k, d]) => (
            <Link
              key={k}
              to={`/legal/${k}`}
              className="card card-interactive"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'var(--color-text-1)',
              }}
            >
              <span style={{ fontSize: 'var(--text-sm)' }}>{d.title}</span>
              <ExternalLink size={14} style={{ color: 'var(--color-text-3)' }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function getCategoryLabel(cat: string): string {
  return (
    {
      news: 'Nouveauté',
      promo: 'Promotion',
      maintenance: 'Maintenance',
      seasonal: 'Saisonnier',
      critical: 'Important',
    } as Record<string, string>
  )[cat] || 'Information';
}

function getCategoryTone(cat: string): string {
  return (
    {
      news: 'gold',
      promo: 'success',
      maintenance: 'warning',
      seasonal: 'info',
      critical: 'danger',
    } as Record<string, string>
  )[cat] || 'info';
}

function formatDate(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default NotFound;

// END
