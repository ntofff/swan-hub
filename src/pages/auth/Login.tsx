// ============================================================
// SWAN · HUB — Page de connexion
// Protection anti-brute-force · Lien magique · Déblocage auto
// ============================================================

import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertTriangle, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [blocked, setBlocked]   = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error, blocked: isBlocked } = await signIn(email, password);
    setLoading(false);

    if (isBlocked) {
      setBlocked(true);
      toast.error(
        'Compte temporairement verrouillé. Consultez votre email pour le débloquer.',
        { duration: 6000 }
      );
      return;
    }

    if (error) {
      setFailedAttempts((n) => n + 1);
      toast.error('Identifiants incorrects');
      return;
    }

    toast.success('Connexion réussie');
    navigate('/');
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
      <div style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        <h1
          className="text-gold"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          SWAN · HUB
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginTop: '2px' }}>
          Bon retour parmi nous
        </p>
      </div>

      {/* ── Alerte blocage ── */}
      {blocked && (
        <div
          className="card"
          style={{
            background: 'var(--color-danger-bg)',
            borderColor: 'var(--color-danger)',
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <AlertTriangle
              size={20}
              style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-1)',
                  marginBottom: 4,
                }}
              >
                Compte temporairement verrouillé
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                Trop de tentatives de connexion. Un email vous a été envoyé avec un lien de déblocage
                immédiat. Sinon, réessayez dans 3 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulaire ── */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            Email
          </label>
          <input
            className="input"
            type="email"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={blocked}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-2)',
            }}
          >
            <label className="text-label">Mot de passe</label>
            <Link
              to="/forgot-password"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Oublié ?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={blocked}
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
        </div>

        {failedAttempts >= 3 && !blocked && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-warning-bg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-warning)',
            }}
          >
            <AlertTriangle size={14} />
            {10 - failedAttempts} tentatives restantes avant verrouillage
          </div>
        )}

        <button
          type="submit"
          disabled={loading || blocked || !email || !password}
          className="btn btn-primary btn-lg btn-full"
          style={{ marginTop: 'var(--space-2)' }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      {/* ── Séparateur ── */}
      <div className="divider-text" style={{ margin: 'var(--space-5) 0 var(--space-4)' }}>
        Pas encore de compte ?
      </div>

      {/* ── Bouton Créer mon compte — AUSSI GROS que Se connecter ── */}
      <button
        onClick={() => navigate('/signup')}
        className="btn btn-lg btn-full"
        style={{
          background: 'transparent',
          border: '1.5px solid var(--color-primary)',
          color: 'var(--color-primary)',
          fontWeight: 600,
        }}
      >
        <UserPlus size={18} />
        Créer mon compte
      </button>

      {/* ── Sécurité ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          marginTop: 'auto',
          paddingTop: 'var(--space-8)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-3)',
        }}
      >
        <ShieldCheck size={14} />
        <span>Connexion sécurisée · Protection anti-phishing active</span>
      </div>
    </div>
  );
}

// END
