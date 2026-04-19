// ============================================================
// SWAN · HUB — Page d'inscription
// Étapes : Infos → Mot de passe (avec popup sécurité) → Consentements RGPD
// ============================================================

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, Shield, ChevronLeft, Info, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Step = 'info' | 'password' | 'consent';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, updateProfile } = useAuth();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);

  // Popup sécurité : forcé au premier affichage de l'étape password
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [hasSeenSecurityInfo, setHasSeenSecurityInfo] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Données du formulaire
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Consentements
  const [acceptTerms, setAcceptTerms]       = useState(false);
  const [acceptPrivacy, setAcceptPrivacy]   = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  // ── Validation ──
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const canProceedInfo = fullName.trim().length >= 2 && emailValid;
  const canProceedPassword = passwordValid && hasSeenSecurityInfo;
  const canSignup = acceptTerms && acceptPrivacy;

  // ── Déclenche le popup sécurité automatiquement à l'arrivée sur l'étape password ──
  useEffect(() => {
    if (step === 'password' && !hasSeenSecurityInfo) {
      // Petit délai pour laisser l'animation de transition se terminer
      const timer = setTimeout(() => {
        setShowSecurityInfo(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step, hasSeenSecurityInfo]);

  // ── Quand le popup se ferme, focus sur le champ mot de passe ──
  const closeSecurityPopup = () => {
    setShowSecurityInfo(false);
    setHasSeenSecurityInfo(true);
    // Focus sur le champ mot de passe après fermeture
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 200);
  };

  // ── Soumission ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSignup) {
      toast.error('Acceptez les conditions obligatoires');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);

    if (error) {
      setLoading(false);
      toast.error(error.message || 'Erreur lors de la création du compte');
      return;
    }

    if (phone.trim()) {
      setTimeout(async () => {
        await updateProfile({ phone: phone.trim() });
      }, 1500);
    }

    setLoading(false);
    toast.success('Compte créé. Bienvenue !');
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
      <div style={{ marginBottom: 'var(--space-6)' }}>
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

        <h1
          className="text-gold"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}
        >
          SWAN · HUB
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginTop: '2px' }}>
          Créez votre compte en quelques instants
        </p>
      </div>

      {/* ── Indicateur d'étape ── */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
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

      <form
        onSubmit={handleSubmit}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        className="slide-up"
      >
        {/* ═══ ÉTAPE 1 : INFOS ═══ */}
        {step === 'info' && (
          <>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Votre nom complet <span style={{ color: 'var(--color-danger)' }}>*</span>
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
                Téléphone <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                className="input"
                type="tel"
                placeholder="06 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p
                style={{
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--color-text-3)',
                  marginTop: 'var(--space-1)',
                  lineHeight: 1.4,
                }}
              >
                Modifiable à tout moment, utile pour automatiser certaines tâches (SMS, rappels).
              </p>
            </div>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Votre email <span style={{ color: 'var(--color-danger)' }}>*</span>
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <label className="text-label">Choisissez votre mot de passe</label>
                <button
                  type="button"
                  onClick={() => setShowSecurityInfo(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    padding: 'var(--space-1)',
                  }}
                >
                  <Info size={14} />
                  Revoir les conseils
                </button>
              </div>

              {/* Champ masqué tant que le popup n'a pas été vu */}
              <div style={{ position: 'relative' }}>
                <input
                  ref={passwordInputRef}
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={hasSeenSecurityInfo ? '8 caractères minimum' : 'Lisez les conseils de sécurité...'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={!hasSeenSecurityInfo}
                  style={{
                    opacity: hasSeenSecurityInfo ? 1 : 0.5,
                    cursor: hasSeenSecurityInfo ? 'text' : 'not-allowed',
                  }}
                />
                {hasSeenSecurityInfo && (
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
                )}
              </div>

              {/* Message si le popup n'a pas encore été vu */}
              {!hasSeenSecurityInfo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3)',
                    background: 'var(--color-warning-bg)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--space-3)',
                  }}
                >
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-1)', lineHeight: 1.5, margin: 0 }}>
                    Un message de sécurité important va s'afficher. Merci de le lire attentivement avant de créer votre mot de passe.
                  </p>
                </div>
              )}

              {/* Critères affichés seulement après le popup */}
              {hasSeenSecurityInfo && (
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <PasswordCriterion met={password.length >= 8} text="Au moins 8 caractères" />
                  <PasswordCriterion met={/[A-Z]/.test(password)} text="Une majuscule (recommandé)" />
                  <PasswordCriterion met={/[0-9]/.test(password)} text="Un chiffre (recommandé)" />
                  <PasswordCriterion met={/[^A-Za-z0-9]/.test(password)} text="Un caractère spécial (fortement recommandé)" />
                </div>
              )}
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

      {/* ═══ POPUP SÉCURITÉ ═══ */}
      {showSecurityInfo && (
        <SecurityInfoModal
          onClose={closeSecurityPopup}
          isFirstTime={!hasSeenSecurityInfo}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// POPUP D'INFORMATION SÉCURITÉ
// ════════════════════════════════════════════════════════════
function SecurityInfoModal({ onClose, isFirstTime }: { onClose: () => void; isFirstTime: boolean }) {
  return (
    <div
      onClick={isFirstTime ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        zIndex: 'var(--z-modal)',
        animation: 'fadeIn var(--duration-normal) var(--ease-out)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scale-in"
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          maxWidth: 440,
          width: '100%',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        {/* Icône bouclier */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-full)',
            background: 'var(--gradient-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Shield size={28} style={{ color: 'var(--color-primary-text)' }} />
        </div>

        <h3
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            marginBottom: 'var(--space-4)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.3,
          }}
        >
          {isFirstTime ? 'Avant de créer votre mot de passe' : 'Conseils de sécurité'}
        </h3>

        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-2)',
            lineHeight: 1.7,
            marginBottom: 'var(--space-5)',
          }}
        >
          <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-1)' }}>
            Environ <strong style={{ color: 'var(--color-primary)' }}>60% des cyberattaques</strong> ciblent aujourd'hui les TPE et PME.
          </p>
          <p style={{ marginBottom: 'var(--space-3)' }}>
            Chez SWAN, nous mettons en œuvre des standards de sécurité élevés afin de protéger vos données au mieux.
          </p>
          <p style={{ marginBottom: 'var(--space-3)' }}>
            Toutefois, la sécurité repose également sur des bonnes pratiques individuelles. Nous vous recommandons vivement d'utiliser un <strong style={{ color: 'var(--color-text-1)' }}>mot de passe robuste, unique et non réutilisé</strong>, car les identifiants compromis restent la première cause de fuite de données.
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-3)',
              fontStyle: 'italic',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            Sources : Verizon DBIR, ANSSI, Cybermalveillance.gouv — 2025-2026
          </p>
        </div>

        <button onClick={onClose} className="btn btn-primary btn-lg btn-full">
          {isFirstTime ? "J'ai compris, créer mon mot de passe" : 'Fermer'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════

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

// END
