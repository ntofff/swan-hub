// ============================================================
// SWAN · HUB — Pages simples : Notifications, NotFound, Legal
// Re-exports pour ResetPassword et UnlockAccount depuis ForgotPassword
// ============================================================

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronLeft, FileText, Home as HomeIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Re-exports pour ResetPassword et UnlockAccount
export { ResetPassword, UnlockAccount } from './ForgotPassword';

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
      const { data } = await supabase
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
// LEGAL — Documents juridiques (CGV, CGU, Privacy, Mentions)
// ════════════════════════════════════════════════════════════
export function Legal() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const docs: Record<string, { title: string; content: string }> = {
    cgv: {
      title: 'Conditions Générales de Vente',
      content: `SWAN HUB — SASU · Siret à venir · Siège social : [à compléter]

En vigueur au [DATE]. Version 1.0.

1. OBJET
Les présentes conditions régissent les ventes de services proposés par SWAN HUB SASU (ci-après "l'Éditeur"). Toute souscription à un abonnement payant implique l'acceptation sans réserve des présentes CGV.

2. TARIFS
Tous les prix sont indiqués en euros, hors taxes (HT) et toutes taxes comprises (TTC), TVA française 20% incluse.
— Plan Découverte : gratuit, 2 mois, 3 plugins au choix
— Plan À la carte : 1,00 € HT / 1,20 € TTC par plugin par mois
— Plan Pro Total : 9,00 € HT / 10,80 € TTC par mois, tous plugins inclus

3. PAIEMENT
Le règlement est effectué par prélèvement mensuel via notre prestataire de paiement sécurisé Stripe. Carte bancaire requise à partir du plan À la carte.

4. DROIT DE RÉTRACTATION
Conformément à l'article L221-28 du Code de la consommation, en souscrivant à un plan payant et en commençant à utiliser les services immédiatement, le client renonce expressément à son droit de rétractation de 14 jours.

5. RÉSILIATION
Chaque abonnement est sans engagement de durée, résiliable à tout moment depuis l'espace client. La résiliation prend effet à la fin de la période de facturation en cours.

6. RESPONSABILITÉ
L'Éditeur s'engage à fournir un service de qualité mais ne peut garantir une disponibilité de 100%. La responsabilité de l'Éditeur est limitée au montant des sommes versées par le Client au cours des 12 derniers mois.

7. DONNÉES PERSONNELLES
Les données personnelles sont traitées conformément à notre Politique de Confidentialité et au RGPD. Voir : /legal/privacy

8. LOI APPLICABLE ET JURIDICTION
Droit français applicable. Tout litige sera soumis aux tribunaux compétents du siège social de l'Éditeur.

Pour toute question : contact@swanhub.fr`,
    },
    cgu: {
      title: "Conditions Générales d'Utilisation",
      content: `SWAN HUB — Conditions Générales d'Utilisation

En vigueur au [DATE]. Version 1.0.

1. ACCÈS AU SERVICE
L'accès aux services SWAN HUB nécessite la création d'un compte utilisateur. Le Client garantit que les informations fournies sont exactes et s'engage à les maintenir à jour.

2. USAGE AUTORISÉ
Le Client s'engage à utiliser les services conformément à leur destination et aux présentes CGU. Est notamment interdit :
— tout usage commercial détourné
— toute tentative de contournement des sécurités
— tout téléchargement massif ou automatisé non autorisé
— toute atteinte aux droits des tiers
— l'envoi de spam ou contenu malveillant

3. CONTENU UTILISATEUR
Le Client conserve la pleine propriété de ses données (rapports, tâches, factures, etc.). Il accorde à l'Éditeur une licence limitée d'hébergement et de traitement pour la fourniture du service.

4. SUSPENSION & BANNISSEMENT
En cas de violation des présentes CGU, l'Éditeur se réserve le droit de suspendre ou supprimer le compte du Client sans préavis, après une alerte préalable sauf en cas de manquement grave. Les sanctions vont de l'avertissement au bannissement permanent.

5. PROPRIÉTÉ INTELLECTUELLE
L'ensemble des éléments de l'application (design, code, marques, logo, textes) est la propriété exclusive de l'Éditeur. Toute reproduction ou utilisation non autorisée est strictement interdite.

6. ÉVOLUTION DU SERVICE
L'Éditeur se réserve le droit de faire évoluer le service à tout moment. Les modifications significatives font l'objet d'une notification préalable.

Pour toute question : contact@swanhub.fr`,
    },
    privacy: {
      title: 'Politique de Confidentialité',
      content: `SWAN HUB — Politique de Confidentialité (RGPD)

En vigueur au [DATE]. Version 1.0.

1. RESPONSABLE DU TRAITEMENT
SWAN HUB SASU, représentée par son président. Contact RGPD : rgpd@swanhub.fr

2. DONNÉES COLLECTÉES
— Identité : nom, prénom, email, téléphone
— Authentification : mot de passe (haché), code anti-phishing
— Facturation : informations de paiement (via Stripe, non stockées chez nous)
— Métier : activité professionnelle déclarée
— Contenu utilisateur : rapports, tâches, factures, etc.
— Techniques : IP, user agent, logs de connexion

3. FINALITÉS
— Exécution du contrat (fourniture du service)
— Facturation et comptabilité (obligation légale)
— Sécurité (prévention des fraudes et intrusions)
— Communication produit (avec consentement explicite)

4. HÉBERGEMENT
Vos données sont hébergées exclusivement en Union Européenne (Supabase, Francfort - Allemagne). Aucun transfert hors UE sans garanties appropriées.

5. DURÉES DE CONSERVATION
— Compte actif : pendant toute la durée de l'abonnement
— Compte inactif : 3 ans après dernière connexion
— Factures : 10 ans (obligation légale comptable)
— Logs de connexion : 1 an
— Données supprimées : 30 jours (corbeille), puis purge définitive

6. SOUS-TRAITANTS
— Supabase (hébergement) - UE
— Stripe (paiement) - conformité PCI DSS
— Anthropic (IA, résumés) - DPA signé, données anonymisées
— Resend (emails) - UE
— Vercel (frontend) - UE/US avec DPA

7. VOS DROITS (RGPD)
— Accès à vos données
— Rectification
— Effacement ("droit à l'oubli")
— Portabilité (export complet)
— Opposition au traitement
— Réclamation auprès de la CNIL

Pour exercer vos droits : rgpd@swanhub.fr (réponse sous 30 jours)

8. COOKIES
L'application utilise uniquement des cookies techniques essentiels au fonctionnement (authentification, préférences). Pas de cookies tiers à des fins publicitaires.

9. SÉCURITÉ
— Chiffrement TLS 1.3 en transit
— Chiffrement AES-256 au repos
— Authentification sécurisée avec rate limiting
— Monitoring temps réel
— Audits de sécurité réguliers
— Notification CNIL sous 72h en cas de violation

Pour toute question : rgpd@swanhub.fr`,
    },
    mentions: {
      title: 'Mentions légales',
      content: `SWAN HUB — Mentions légales

ÉDITEUR
SWAN HUB SASU
Capital social : [à compléter]
SIREN : [à compléter]
Siège social : [à compléter]
Directeur de publication : [à compléter]

CONTACT
Email : contact@swanhub.fr
RGPD : rgpd@swanhub.fr
Sécurité : security@swanhub.fr

HÉBERGEMENT
Supabase Inc. (base de données) - Francfort, Allemagne
Vercel Inc. (frontend) - Paris, France
TLS 1.3, AES-256, conformité RGPD

PROPRIÉTÉ INTELLECTUELLE
L'ensemble des contenus, design, code et marques de l'application SWAN HUB sont la propriété exclusive de SWAN HUB SASU et protégés par les lois françaises et internationales relatives à la propriété intellectuelle.

CRÉDITS
— Typographies : Syne, DM Sans, JetBrains Mono (Google Fonts)
— Icônes : Lucide Icons (ISC License)

SIGNALEMENT
Tout contenu illégal peut être signalé à : legal@swanhub.fr`,
    },
  };

  const doc = docs[type || ''] || { title: 'Document', content: 'Document non trouvé.' };

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-header-title">{doc.title}</h1>
          <p className="page-header-subtitle">Document juridique</p>
        </div>
      </header>

      <div className="px-4">
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <pre
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-1)',
              lineHeight: 1.7,
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
  if (diff < 60_000)    return 'À l\'instant';
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// ════════════════════════════════════════════════════════════
// DEFAULT EXPORTS POUR LAZY LOADING
// ════════════════════════════════════════════════════════════
export default NotFound;
