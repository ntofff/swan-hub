// ============================================================
// SWAN · HUB — Onboarding post-inscription
// Étapes : Bienvenue SWAN → Métier → Thème → Code anti-phishing
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Shield, Check, Sparkles, AlertCircle,
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { ACTIVE_PLUGINS, THEMES, TRADES } from '@/config/tokens';
import { toast } from 'sonner';

type Step = 'welcome' | 'trade' | 'plugins' | 'theme' | 'phishing' | 'done';

const ICON_MAP: Record<string, any> = {
  FileText,
  CheckSquare,
  Target,
  Receipt,
  BookOpen,
  Car,
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, setAntiPhishingCode } = useAuth();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState<Step>('welcome');
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [selectedTrialPlugins, setSelectedTrialPlugins] = useState<string[]>([]);
  const [phishingCode, setPhishingCode]   = useState('');
  const [loading, setLoading] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const selectedTradeConfig = TRADES.find((trade) => trade.id === selectedTrade);

  // ── Validation du code anti-phishing ──────────────────────
  const codeValid = phishingCode.length >= 4 && phishingCode.length <= 20 && !/\s/.test(phishingCode);

  // ── Finalisation ─────────────────────────────────────────
  const finish = async () => {
    if (selectedTrialPlugins.length !== 3) {
      toast.error('Choisissez exactement 3 outils pour démarrer.');
      return;
    }

    setLoading(true);

    // 1. Enregistrer le métier
    const { error: profileError } = await updateProfile({
      trade: selectedTrade,
      active_plugins: selectedTrialPlugins,
      trial_plugin_ids: selectedTrialPlugins,
      visible_plugin_ids: selectedTrialPlugins,
    });
    if (profileError) {
      toast.error(profileError.message);
      setLoading(false);
      return;
    }

    // 2. Enregistrer le code anti-phishing
    const { error } = await setAntiPhishingCode(phishingCode);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('done');

    // Redirection après animation
    setTimeout(() => navigate('/'), 1800);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-4)',
        paddingTop: 'calc(env(safe-area-inset-top) + var(--space-6))',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--space-4))',
        maxWidth: '500px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ═══ ÉTAPE : BIENVENUE ═══ */}
      {step === 'welcome' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div
              className="pulse-gold"
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-full)',
                background: 'var(--gradient-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                color: 'var(--color-primary-text)',
                margin: '0 auto var(--space-6)',
              }}
            >
              S
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
              Bonjour{firstName ? ` ${firstName}` : ''}
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Je suis <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>SWAN</span>, votre assistant.
            </p>
          </div>

          <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', lineHeight: 1.7 }}>
              Je vais vous accompagner pour configurer votre espace en moins d'une minute.
              Nous allons définir votre activité, votre préférence visuelle et mettre en place 
              une protection anti-phishing pour sécuriser nos échanges.
            </p>
          </div>

          <button onClick={() => setStep('trade')} className="btn btn-primary btn-lg btn-full">
            Commencer
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ═══ ÉTAPE : MÉTIER ═══ */}
      {step === 'trade' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header
            step={1}
            total={4}
            title="Quel est votre métier ?"
            subtitle="J'adapterai les outils et suggestions à votre activité"
          />

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', lineHeight: 1.6, marginBottom: 'var(--space-4)', padding: '0 var(--space-1)' }}>
            Ce choix sert uniquement à personnaliser les suggestions — vous aurez accès à tous les outils quelle que soit votre sélection.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {TRADES.map((trade) => (
              <button
                key={trade.id}
                onClick={() => {
                  setSelectedTrade(trade.id);
                  const recommended = ACTIVE_PLUGINS
                    .filter((plugin) => trade.pluginIds.includes(plugin.id))
                    .slice(0, 3)
                    .map((plugin) => plugin.id);
                  setSelectedTrialPlugins(recommended);
                }}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  border: `1.5px solid ${selectedTrade === trade.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedTrade === trade.id ? 'var(--color-primary-glow)' : 'var(--color-surface)',
                  textAlign: 'left',
                  width: '100%',
                  minHeight: 'var(--tap-comfort)',
                }}
              >
                <span style={{ fontSize: 28 }}>{trade.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
                    {trade.label}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                    {trade.pluginIds.length} outils recommandés
                  </div>
                </div>
                {selectedTrade === trade.id && (
                  <Check size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={3} />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('plugins')}
            disabled={!selectedTrade}
            className="btn btn-primary btn-lg btn-full"
            style={{ marginTop: 'auto' }}
          >
            Continuer
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ═══ ÉTAPE : PLUGINS D'ESSAI ═══ */}
      {step === 'plugins' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header
            step={2}
            total={4}
            title="Choisissez vos 3 outils"
            subtitle="Ils sont offerts pendant 2 mois, puis restent payants uniquement si vous les validez"
          />

          <div
            className="card"
            style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              background: 'var(--color-primary-glow)',
              borderColor: 'rgba(201,169,97,0.3)',
            }}
          >
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.55 }}>
              Sélection : <strong>{selectedTrialPlugins.length}/3</strong>. Après l'essai, chaque outil gardé coûte 1,20 € TTC / mois.
              Un paiement valide l'outil choisi pour le mois en cours.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {ACTIVE_PLUGINS.map((plugin) => {
              const Icon = ICON_MAP[plugin.icon] || Sparkles;
              const selected = selectedTrialPlugins.includes(plugin.id);
              const recommended = selectedTradeConfig?.pluginIds.includes(plugin.id);
              return (
                <button
                  key={plugin.id}
                  onClick={() => {
                    setSelectedTrialPlugins((current) => {
                      if (current.includes(plugin.id)) return current.filter((id) => id !== plugin.id);
                      if (current.length >= 3) {
                        toast.info('Vous pouvez choisir 3 outils gratuits pour démarrer.');
                        return current;
                      }
                      return [...current, plugin.id];
                    });
                  }}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: selected ? 'var(--color-primary-glow)' : 'var(--color-surface)',
                    textAlign: 'left',
                    width: '100%',
                    minHeight: 'var(--tap-comfort)',
                  }}
                >
                  <div className="plugin-icon-wrapper" style={{ backgroundColor: `hsl(${plugin.color} / 0.12)`, flexShrink: 0 }}>
                    <Icon size={22} style={{ color: `hsl(${plugin.color})` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 3 }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-1)' }}>
                        {plugin.name}
                      </span>
                      {recommended && <span className="badge badge-info">recommandé</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.45 }}>
                      {plugin.description}
                    </div>
                  </div>
                  {selected && <Check size={18} style={{ color: 'var(--color-primary)' }} strokeWidth={3} />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep('theme')}
            disabled={selectedTrialPlugins.length !== 3}
            className="btn btn-primary btn-lg btn-full"
            style={{ marginTop: 'auto' }}
          >
            Continuer
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ═══ ÉTAPE : THÈME ═══ */}
      {step === 'theme' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header
            step={3}
            total={4}
            title="Quelle ambiance préférez-vous ?"
            subtitle="Vous pourrez la changer à tout moment"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: `1.5px solid ${theme === t.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: t.preview.bg,
                  color: t.preview.text,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  minHeight: '120px',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7, lineHeight: 1.4 }}>
                  {t.description}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'var(--space-3)',
                    right: 'var(--space-3)',
                    width: 12,
                    height: 12,
                    borderRadius: 'var(--radius-full)',
                    background: t.preview.accent,
                    border: `2px solid ${t.preview.bg}`,
                  }}
                />
                {theme === t.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'var(--space-2)',
                      right: 'var(--space-2)',
                      width: 20,
                      height: 20,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} style={{ color: 'var(--color-primary-text)' }} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setStep('phishing')} className="btn btn-primary btn-lg btn-full" style={{ marginTop: 'auto' }}>
            Continuer
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ═══ ÉTAPE : ANTI-PHISHING ═══ */}
      {step === 'phishing' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header
            step={4}
            total={4}
            title="Votre protection anti-phishing"
            subtitle="Une mesure de sécurité essentielle"
          />

          <div
            className="card"
            style={{
              background: 'var(--color-primary-glow)',
              borderColor: 'rgba(201,169,97,0.3)',
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Shield size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)', marginBottom: 'var(--space-2)' }}>
                  À quoi ça sert ?
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                  Votre code personnel apparaîtra dans tous nos messages (email, SMS). 
                  Si vous recevez un message prétendu venir de nous <strong>sans ce code</strong>, c'est une tentative d'arnaque.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Choisissez votre code personnel
            </label>
            <input
              className="input"
              type="text"
              placeholder="Ex: Jardin42, Marseille2026..."
              value={phishingCode}
              onChange={(e) => setPhishingCode(e.target.value.replace(/\s/g, ''))}
              maxLength={20}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--space-2)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-3)',
              }}
            >
              <span>4 à 20 caractères, sans espace</span>
              <span>{phishingCode.length}/20</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'flex-start',
              padding: 'var(--space-3)',
              background: 'var(--color-warning-bg)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <AlertCircle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Ne partagez jamais ce code. Notre équipe ne vous le demandera jamais.
            </p>
          </div>

          <button
            onClick={finish}
            disabled={!codeValid || loading}
            className="btn btn-primary btn-lg btn-full"
            style={{ marginTop: 'auto' }}
          >
            {loading ? 'Finalisation…' : 'Terminer'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      )}

      {/* ═══ ÉTAPE : TERMINÉ ═══ */}
      {step === 'done' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <div
            className="scale-in"
            style={{
              width: 80,
              height: 80,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
            }}
          >
            <Sparkles size={36} style={{ color: 'var(--color-primary-text)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
            Votre espace est prêt
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Bienvenue dans SWAN HUB. Je vous accompagne dès maintenant.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Header étapes ────────────────────────────────────────────
function Header({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 'var(--radius-full)',
              background: i < step ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'background var(--duration-normal)',
            }}
          />
        ))}
      </div>
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>{title}</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>{subtitle}</p>
    </div>
  );
}
