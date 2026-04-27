// ============================================================
// SWAN · HUB — Page Pricing
// 3 plans : Découverte · À la carte · Pro illimité
// ============================================================

import { useEffect, useState } from 'react';
import { Check, Sparkles, ChevronRight, ChevronLeft, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, PLAN_BREAKEVEN_PLUGINS, BUSINESS, FREE_PLUGIN_ALLOWANCE } from '@/config/tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Pricing() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const [pluginCount, setPluginCount] = useState(
    Math.max(profile?.active_plugins?.length || FREE_PLUGIN_ALLOWANCE, FREE_PLUGIN_ALLOWANCE)
  );

  // Calcul coût à la carte : 3 outils restent gratuits, seuls les outils supplémentaires sont facturés.
  const paidPluginCount = Math.max(0, pluginCount - FREE_PLUGIN_ALLOWANCE);
  const carteCost = paidPluginCount * BUSINESS.PLUGIN_PRICE_TTC;
  const proIsCheaper = carteCost >= BUSINESS.PRO_PRICE_TTC;
  const hasStripeSubscription = !!profile?.stripe_customer_id && profile?.plan !== 'free';

  useEffect(() => {
    const checkoutStatus = new URLSearchParams(window.location.search).get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('Paiement validé. Votre abonnement va se synchroniser dans quelques instants.');
      refreshProfile();
      window.history.replaceState({}, '', '/pricing');
    }
    if (checkoutStatus === 'cancel') {
      toast.info('Paiement annulé. Aucun changement appliqué.');
      window.history.replaceState({}, '', '/pricing');
    }
  }, [refreshProfile]);

  const handlePlanClick = (plan: (typeof PLANS)[number], isCurrent: boolean) => {
    if (isCurrent) return;

    if (plan.id === 'free') {
      navigate('/plugins');
      return;
    }

    setLoadingPlan(plan.id);
    supabase.functions.invoke('create-checkout-session', {
      body: { planId: plan.id, pluginCount },
    }).then(({ data, error }) => {
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('Session de paiement introuvable.');
      window.location.href = data.url;
    }).catch((error) => {
      toast.error(error.message || 'Impossible d’ouvrir le paiement.');
      setLoadingPlan(null);
    });
  };

  const handlePortalClick = () => {
    setPortalLoading(true);
    supabase.functions.invoke('create-portal-session').then(({ data, error }) => {
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('Portail client introuvable.');
      window.location.href = data.url;
    }).catch((error) => {
      toast.error(error.message || 'Impossible d’ouvrir la gestion de l’abonnement.');
      setPortalLoading(false);
    });
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-header-title">Tarifs</h1>
          <p className="page-header-subtitle">Transparents, flexibles, sans engagement</p>
        </div>
      </header>

      <section className="px-4" style={{ marginBottom: 'var(--space-5)' }}>
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', fontWeight: 700, marginBottom: 4 }}>
            Paiement sécurisé
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Les abonnements sont gérés par Stripe. Vous pouvez changer de plan ou résilier depuis votre espace client.
          </p>
          {hasStripeSubscription && (
            <button
              onClick={handlePortalClick}
              disabled={portalLoading}
              className="btn btn-secondary btn-full btn-sm"
              style={{ marginTop: 'var(--space-3)' }}
            >
              <CreditCard size={16} />
              {portalLoading ? 'Ouverture...' : 'Gérer mon abonnement'}
            </button>
          )}
        </div>
      </section>

      {/* ── Simulateur ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card card-glow" style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            Combien d'outils utilisez-vous ?
          </h3>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <button
                onClick={() => setPluginCount(Math.max(FREE_PLUGIN_ALLOWANCE, pluginCount - 1))}
                className="btn btn-icon btn-secondary"
              >
                <ChevronLeft size={18} />
              </button>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 500,
                  minWidth: 80,
                  textAlign: 'center',
                  color: 'var(--color-primary)',
                }}
              >
                {pluginCount}
              </div>
              <button
                onClick={() => setPluginCount(Math.min(13, pluginCount + 1))}
                className="btn btn-icon btn-secondary"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
              {pluginCount} outil{pluginCount > 1 ? 's' : ''} activé{pluginCount > 1 ? 's' : ''}
              <span style={{ color: 'var(--color-text-3)' }}>
                {' '}· {paidPluginCount} facturé{paidPluginCount > 1 ? 's' : ''}
              </span>
            </p>
          </div>

          {/* Comparaison visuelle */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 4 }}>
                À la carte
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 500,
                  color: !proIsCheaper ? 'var(--color-success)' : 'var(--color-text-2)',
                }}
              >
                {carteCost.toFixed(2)} €
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)', marginTop: 4 }}>
                3 gratuits inclus
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 4 }}>
                Pro illimité
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 500,
                  color: proIsCheaper ? 'var(--color-success)' : 'var(--color-text-2)',
                }}
              >
                {BUSINESS.PRO_PRICE_TTC.toFixed(2)} €
              </div>
            </div>
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: 'var(--text-xs)',
              color: proIsCheaper ? 'var(--color-success)' : 'var(--color-text-3)',
              marginTop: 'var(--space-3)',
              fontWeight: proIsCheaper ? 600 : 400,
            }}
          >
            {proIsCheaper
              ? `✓ Le Pro illimité est plus avantageux à partir de ${PLAN_BREAKEVEN_PLUGINS} outils activés`
              : `À partir de ${PLAN_BREAKEVEN_PLUGINS} outils activés, le Pro illimité devient plus avantageux`}
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="px-4 field-responsive-grid field-responsive-grid-3">
        {PLANS.map((plan) => {
          const isCurrent = profile?.plan === plan.id;

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: 'var(--space-5)',
                border: `1.5px solid ${plan.id === 'pro' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: plan.id === 'pro' ? 'linear-gradient(145deg, rgba(201,169,97,0.04), var(--color-surface))' : undefined,
                position: 'relative',
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: 'var(--space-4)',
                    padding: '4px 10px',
                    background: 'var(--gradient-gold)',
                    color: 'var(--color-primary-text)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h3
                  style={{
                    fontSize: 'var(--text-xl)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  {plan.name}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                  {plan.description}
                </p>
              </div>

              {/* Prix */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                {plan.priceTTC === null ? (
                  <span
                    className="text-gold"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-3xl)',
                      fontWeight: 800,
                      letterSpacing: 0,
                    }}
                  >
                    Gratuit
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 500,
                        color: 'var(--color-text-1)',
                      }}
                    >
                      {plan.priceTTC.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                      €TTC / {plan.id === 'carte' ? 'outil · ' : ''}mois
                    </span>
                  </>
                )}
              </div>

              {plan.priceHT !== null && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 'var(--space-4)' }}>
                  ({plan.priceHT.toFixed(2)} € HT · TVA 20% incluse)
                </div>
              )}

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                {plan.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <Check
                      size={14}
                      style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 3 }}
                      strokeWidth={3}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', lineHeight: 1.5 }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                disabled={isCurrent || loadingPlan === plan.id}
                className={`btn btn-full btn-lg ${plan.id === 'pro' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePlanClick(plan, isCurrent)}
              >
                {isCurrent ? 'Plan actuel' : loadingPlan === plan.id ? 'Ouverture...' : plan.priceTTC === null ? 'Commencer' : 'Choisir ce plan'}
                {!isCurrent && loadingPlan !== plan.id && <ChevronRight size={16} />}
              </button>
            </div>
          );
        })}
      </section>

      {/* ── Info ── */}
      <div className="px-4" style={{ marginTop: 'var(--space-6)' }}>
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-info-bg)',
            borderColor: 'var(--color-info)',
            textAlign: 'center',
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--color-info)', marginBottom: 'var(--space-2)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', fontWeight: 600, marginBottom: 4 }}>
            Sans engagement
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Résiliable à tout moment · Aucune carte requise pour la découverte · Paiement 100% sécurisé
          </p>
        </div>
      </div>
    </div>
  );
}
