// ============================================================
// SWAN · HUB — Pages auth manquantes
// ForgotPassword · ResetPassword · UnlockAccount
// ============================================================

import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Mail, CheckCircle2, ChevronLeft, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ
// ════════════════════════════════════════════════════════════
export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast.error('Erreur : ' + error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthContainer>
      <BackLink />
      <h1 className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        Mot de passe oublié
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginBottom: 'var(--space-6)' }}>
        Nous vous enverrons un lien pour le réinitialiser
      </p>

      {sent ? (
        <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-3)' }} />
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Email envoyé
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Consultez votre boîte mail pour le lien de réinitialisation. Pensez à vérifier les spams.
          </p>
          <Link to="/login" className="btn btn-secondary btn-full" style={{ marginTop: 'var(--space-4)' }}>
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Votre email
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading || !email} className="btn btn-primary btn-lg btn-full">
            {loading ? 'Envoi...' : <><Mail size={18} /> Envoyer le lien</>}
          </button>
        </form>
      )}
    </AuthContainer>
  );
}

// ════════════════════════════════════════════════════════════
// RÉINITIALISATION MOT DE PASSE
// ════════════════════════════════════════════════════════════
export function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      toast.error('Minimum 8 caractères');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error('Erreur : ' + error.message);
      return;
    }
    toast.success('Mot de passe mis à jour');
    navigate('/');
  };

  return (
    <AuthContainer>
      <BackLink />
      <h1 className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        Nouveau mot de passe
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginBottom: 'var(--space-6)' }}>
        Choisissez un mot de passe fort
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            Nouveau mot de passe
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 caractères minimum"
            required
            minLength={8}
            autoFocus
          />
        </div>

        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            Confirmation
          </label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Retapez le mot de passe"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
          {loading ? 'Mise à jour...' : <><Lock size={18} /> Mettre à jour</>}
        </button>
      </form>
    </AuthContainer>
  );
}

// ════════════════════════════════════════════════════════════
// DÉBLOCAGE VIA TOKEN EMAIL
// ════════════════════════════════════════════════════════════
export function UnlockAccount() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus]   = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Lien invalide');
      return;
    }

    (async () => {
      const { data, error } = await (supabase as any).rpc('unlock_with_token', { input_token: token });
      if (error || !data?.[0]?.success) {
        setStatus('error');
        setMessage(data?.[0]?.message || 'Lien invalide ou expiré');
        return;
      }
      setStatus('success');
      setMessage('Votre compte a été débloqué avec succès');
    })();
  }, [params]);

  return (
    <AuthContainer>
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', marginTop: 'var(--space-8)' }}>
        {status === 'pending' && (
          <>
            <div className="pulse-gold" style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--gradient-gold)', margin: '0 auto var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={32} style={{ color: 'var(--color-primary-text)' }} />
            </div>
            <p>Vérification en cours…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={64} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Compte débloqué</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              {message}. Vous pouvez maintenant vous reconnecter.
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-primary btn-full">
              Se connecter <ArrowRight size={16} />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} style={{ color: 'var(--color-danger)', margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Lien invalide</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              {message}. Veuillez attendre 3 minutes ou contacter le support.
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-secondary btn-full">
              Retour
            </button>
          </>
        )}
      </div>
    </AuthContainer>
  );
}

// ════════════════════════════════════════════════════════════
// COMPOSANTS COMMUNS
// ════════════════════════════════════════════════════════════

function AuthContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-4)',
        paddingTop: 'calc(env(safe-area-inset-top) + var(--space-6))',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--space-4))',
        maxWidth: 440,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/login"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-3)',
        marginBottom: 'var(--space-5)',
        textDecoration: 'none',
      }}
    >
      <ChevronLeft size={14} /> Retour
    </Link>
  );
}

// ════════════════════════════════════════════════════════════
// DEFAULT EXPORT pour lazy loading dans App.tsx
// ════════════════════════════════════════════════════════════
export default ForgotPassword;

// END
