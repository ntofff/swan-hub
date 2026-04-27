// ============================================================
// SWAN · HUB — Page Outils
// Catalogue : outils actifs + outils à venir
// ============================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
  Lock, Clock, Crown, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ACTIVE_PLUGINS, LOCKED_PLUGINS, TRADES } from '@/config/tokens';
import { toast } from 'sonner';

const ICON_MAP: Record<string, any> = {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
};

export default function Plugins() {
  const navigate = useNavigate();
  const { profile, hasAccessToPlugin, updateProfile } = useAuth();
  const [savingVisibility, setSavingVisibility] = useState<string | null>(null);
  const visiblePluginIds = profile?.visible_plugin_ids?.length
    ? profile.visible_plugin_ids
    : profile?.plan === 'pro'
      ? ACTIVE_PLUGINS.map((plugin) => plugin.id)
      : profile?.paid_plugin_ids?.length
        ? profile.paid_plugin_ids
        : profile?.trial_plugin_ids || [];
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const trialIsActive = trialDaysLeft !== null && trialDaysLeft > 0;

  const toggleProVisibility = async (pluginId: string) => {
    if (profile?.plan !== 'pro') return;
    setSavingVisibility(pluginId);
    const next = visiblePluginIds.includes(pluginId)
      ? visiblePluginIds.filter((id) => id !== pluginId)
      : [...visiblePluginIds, pluginId];
    const { error } = await updateProfile({ visible_plugin_ids: next });
    setSavingVisibility(null);
    if (error) toast.error(error.message);
  };

  // Tri : outils pertinents pour le métier en premier
  const sortedActive = useMemo(() => {
    if (!profile?.trade) return ACTIVE_PLUGINS;
    const userTrade = TRADES.find(t => t.id === profile.trade);
    if (!userTrade) return ACTIVE_PLUGINS;

    return [...ACTIVE_PLUGINS].sort((a, b) => {
      const aRelevant = userTrade.pluginIds.includes(a.id) ? 0 : 1;
      const bRelevant = userTrade.pluginIds.includes(b.id) ? 0 : 1;
      return aRelevant - bRelevant;
    });
  }, [profile?.trade]);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <div>
          <h1 className="page-header-title">Outils</h1>
          <p className="page-header-subtitle">
            {ACTIVE_PLUGINS.length} outils disponibles · {LOCKED_PLUGINS.length} à venir
          </p>
        </div>
      </header>

      <section className="px-4" style={{ marginBottom: 'var(--space-5)' }}>
        <div
          className="card card-glow"
          style={{
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="plugin-icon-wrapper" style={{ background: 'var(--color-primary-glow)' }}>
              <Crown size={22} style={{ color: 'var(--color-primary)' }} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                Vos outils disponibles
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.45 }}>
                {profile?.plan === 'pro'
                  ? 'Pro illimité : tous les outils sont inclus. Choisissez ceux à afficher dans votre espace.'
                  : profile?.plan === 'carte'
                    ? `${profile.paid_plugin_ids?.length || 0} outil${(profile.paid_plugin_ids?.length || 0) > 1 ? 's' : ''} payé${(profile.paid_plugin_ids?.length || 0) > 1 ? 's' : ''} ce mois-ci.`
                    : trialIsActive
                      ? `Essai : ${trialDaysLeft} jour${trialDaysLeft && trialDaysLeft > 1 ? 's' : ''} restant${trialDaysLeft && trialDaysLeft > 1 ? 's' : ''} sur vos 3 outils.`
                      : 'Votre essai est terminé. Choisissez les outils à conserver.'}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/pricing')}>
            Voir les formules
          </button>
        </div>
      </section>

      {/* ── Outils actifs ── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
          Disponibles maintenant
        </h2>

        <div className="field-responsive-grid stagger">
          {sortedActive.map((plugin) => {
            const Icon = ICON_MAP[plugin.icon] || FileText;
            const hasAccess = hasAccessToPlugin(plugin.id);

            return (
              <button
                key={plugin.id}
                onClick={() => hasAccess ? navigate(plugin.route) : navigate('/pricing')}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  textAlign: 'left',
                  width: '100%',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div
                  className="plugin-icon-wrapper"
                  style={{ backgroundColor: `hsl(${plugin.color} / 0.12)`, flexShrink: 0 }}
                >
                  <Icon size={22} style={{ color: `hsl(${plugin.color})` }} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{plugin.name}</h3>
                    {!hasAccess && <Lock size={12} style={{ color: 'var(--color-text-3)' }} />}
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.45, fontWeight: 600 }}>
                    {plugin.description}
                  </p>
                  {profile?.plan === 'pro' && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleProVisibility(plugin.id);
                      }}
                      disabled={savingVisibility === plugin.id}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'var(--space-2)' }}
                    >
                      {visiblePluginIds.includes(plugin.id) ? 'Masquer du menu' : 'Afficher'}
                    </button>
                  )}
                </div>

                {hasAccess ? (
                  <Sparkles size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                ) : (
                  <span className="badge badge-warning" style={{ flexShrink: 0 }}>
                    Débloquer
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Outils à venir ── */}
      {LOCKED_PLUGINS.length > 0 && (
        <section className="px-4">
          <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
            Bientôt disponibles
          </h2>

          <div className="field-responsive-grid">
            {LOCKED_PLUGINS.map((plugin) => {
              const Icon = ICON_MAP[plugin.icon] || FileText;
              return (
                <div
                  key={plugin.id}
                  className="card"
                  style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    alignItems: 'center',
                    opacity: 0.7,
                  }}
                >
                  <div
                    className="plugin-icon-wrapper"
                    style={{ backgroundColor: `hsl(${plugin.color} / 0.08)`, flexShrink: 0 }}
                  >
                    <Icon size={22} style={{ color: `hsl(${plugin.color} / 0.6)` }} strokeWidth={2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text-2)' }}>
                        {plugin.name}
                      </h3>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.45, fontWeight: 600 }}>
                      {plugin.description}
                    </p>
                  </div>

                  <span className="badge badge-info" style={{ flexShrink: 0, gap: 4 }}>
                    <Clock size={10} />
                    {plugin.eta || 'À venir'}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="card"
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: 'var(--color-primary-glow)',
              borderColor: 'rgba(201,169,97,0.3)',
              textAlign: 'center',
            }}
          >
            <Crown size={20} style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }} />
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              Un besoin spécifique ?
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              Proposez un nouvel outil et votez pour les prochaines fonctions utiles.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/profile')}>
              Donner mon avis
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// END
