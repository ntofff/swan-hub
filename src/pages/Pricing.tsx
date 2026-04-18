// ============================================================
// SWAN · HUB — Page Pricing
// 3 plans : Découverte · À la carte · Pro Total
// ============================================================

import { useState } from 'react';
import { Check, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, PLAN_BREAKEVEN_PLUGINS, BUSINESS } from '@/config/tokens';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [pluginCount, setPluginCount] = useState(
    profile?.active_plugins?.length || 3
  );

  // Calcul coût à la carte
  const carteCost = pluginCount * BUSINESS.PLUGIN_PRICE_TTC;
  const proIsCheaper = carteCost >= BUSINESS.PRO_PRICE_TTC;

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

      {/* ── Simulateur ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card card-glow" style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            Combien de plugins utilisez-vous ?
          </h3>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <button
                onClick={() => setPluginCount(Math.max(1, pluginCount - 1))}
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
            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
              plugin{pluginCount > 1 ? 's' : ''} activé{pluginCount > 1 ? 's' : ''}
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
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: 4 }}>
                Pro Total
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
              ? `✓ Le Pro Total est plus avantageux à partir de ${PLAN_BREAKEVEN_PLUGINS} plugins`
              : `À partir de ${PLAN_BREAKEVEN_PLUGINS} plugins, le Pro Total devient plus avantageux`}
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                      letterSpacing: '-0.03em',
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
                      €TTC / {plan.id === 'carte' ? 'plugin · ' : ''}mois
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
                disabled={isCurrent}
                className={`btn btn-full btn-lg ${plan.id === 'pro' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  if (!isCurrent) {
                    toast.info('Paiement Stripe à venir à l\'étape 1.7');
                  }
                }}
              >
                {isCurrent ? 'Plan actuel' : plan.priceTTC === null ? 'Commencer' : 'Choisir ce plan'}
                {!isCurrent && <ChevronRight size={16} />}
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
