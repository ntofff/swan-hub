// ============================================================
// SWAN · HUB — Page d'inscription
// Étapes : Infos → Mot de passe → Consentements RGPD
// ============================================================

import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, Shield, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Step = 'info' | 'password' | 'consent';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);

  // Données du formulaire
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Consentements
  const [acceptTerms, setAcceptTerms]       = useState(false);
  const [acceptPrivacy, setAcceptPrivacy]   = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  // ── Validation ──
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canProceedInfo = fullName.trim().length >= 2 && emailValid;
  const canProceedPassword = passwordValid;
  const canSignup = acceptTerms && acceptPrivacy;

  // ── Soumission ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSignup) {
      toast.error('Acceptez les conditions obligatoires');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Erreur lors de la création du compte');
      return;
    }
    toast.success('Compte créé. Vérifiez votre email pour confirmer.');
    navigate('/onboarding');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-4)',
        paddingTop: 'calc(env(safe-area-inset-top) + var(--space-4))',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--space-4))',
        maxWidth: '440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Header ── */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        {step !== 'info' && (
          <button
            onClick={() => setStep(step === 'consent' ? 'password' : 'info')}
            className="back-button"
            style={{ marginBottom: 'var(--space-4)' }}
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <h1 className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>
          SWAN · HUB
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginTop: '2px' }}>
          Créez votre compte en quelques instants
        </p>
      </div>

      {/* ── Indicateur d'étape ── */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
        {['info', 'password', 'consent'].map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: 'var(--radius-full)',
              background:
                s === step || ['info', 'password', 'consent'].indexOf(step) > i
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
              transition: 'background var(--duration-normal) var(--ease-out)',
            }}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} className="slide-up">
        {/* ═══ ÉTAPE 1 : INFOS ═══ */}
        {step === 'info' && (
          <>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Votre nom complet
              </label>
              <input
                className="input"
                type="text"
                placeholder="Marie Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Votre email
              </label>
              <input
                className="input"
                type="email"
                placeholder="marie@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setStep('password')}
              disabled={!canProceedInfo}
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: 'var(--space-2)' }}
            >
              Continuer
              <ArrowRight size={18} />
            </button>
          </>
        )}

        {/* ═══ ÉTAPE 2 : MOT DE PASSE ═══ */}
        {step === 'password' && (
          <>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Choisissez votre mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 'var(--space-2)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-3)',
                    padding: 'var(--space-2)',
                  }}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicateur de force */}
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <PasswordCriterion met={password.length >= 8} text="Au moins 8 caractères" />
                <PasswordCriterion met={/[A-Z]/.test(password)} text="Une majuscule (recommandé)" />
                <PasswordCriterion met={/[0-9]/.test(password)} text="Un chiffre (recommandé)" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('consent')}
              disabled={!canProceedPassword}
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Continuer
              <ArrowRight size={18} />
            </button>
          </>
        )}

        {/* ═══ ÉTAPE 3 : CONSENTEMENTS RGPD ═══ */}
        {step === 'consent' && (
          <>
            <div
              className="card"
              style={{
                background: 'var(--color-primary-glow)',
                borderColor: 'rgba(201,169,97,0.3)',
                marginBottom: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Shield size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Vos données sont protégées
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                Hébergement en France, chiffrement total, conformité RGPD. Nous ne vendons jamais vos données.
              </p>
            </div>

            <Checkbox
              checked={acceptTerms}
              onChange={setAcceptTerms}
              label={
                <>
                  J'accepte les{' '}
                  <Link to="/legal/cgv" target="_blank" style={{ color: 'var(--color-primary)' }}>
                    Conditions Générales
                  </Link>{' '}
                  <span style={{ color: 'var(--color-danger)' }}>*</span>
                </>
              }
            />

            <Checkbox
              checked={acceptPrivacy}
              onChange={setAcceptPrivacy}
              label={
                <>
                  J'accepte la{' '}
                  <Link to="/legal/privacy" target="_blank" style={{ color: 'var(--color-primary)' }}>
                    Politique de Confidentialité
                  </Link>{' '}
                  <span style={{ color: 'var(--color-danger)' }}>*</span>
                </>
              }
            />

            <Checkbox
              checked={acceptMarketing}
              onChange={setAcceptMarketing}
              label={
                <span style={{ color: 'var(--color-text-2)' }}>
                  Recevoir les actualités produit (facultatif)
                </span>
              }
            />

            <button
              type="submit"
              disabled={!canSignup || loading}
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: 'var(--space-4)' }}
            >
              {loading ? 'Création en cours…' : 'Créer mon compte'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </>
        )}

        {/* ── Lien vers login ── */}
        <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
            Vous avez déjà un compte ?{' '}
          </span>
          <Link
            to="/login"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600 }}
          >
            Se connecter
          </Link>
        </div>
      </form>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────

function PasswordCriterion({ met, text }: { met: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <Check
        size={12}
        style={{
          color: met ? 'var(--color-success)' : 'var(--color-text-3)',
          opacity: met ? 1 : 0.4,
        }}
      />
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: met ? 'var(--color-success)' : 'var(--color-text-3)',
        }}
      >
        {text}
      </span>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        cursor: 'pointer',
        background: checked ? 'var(--color-primary-glow)' : 'transparent',
        border: `1px solid ${checked ? 'rgba(201,169,97,0.3)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--duration-fast) var(--ease-out)',
        minHeight: 'var(--tap-min)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-sm)',
          border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-hover)'}`,
          background: checked ? 'var(--color-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          transition: 'all var(--duration-fast) var(--ease-out)',
        }}
      >
        {checked && <Check size={14} style={{ color: 'var(--color-primary-text)' }} strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', lineHeight: 1.5 }}>
        {label}
      </span>
    </label>
  );
}
