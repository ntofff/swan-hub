import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-gradient-gold">SWAN</h1>
        </div>
        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold font-heading">Mot de passe oublié</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Entrez votre email pour réinitialiser</p>
          </div>
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-primary">Email envoyé !</p>
              <p className="text-xs text-muted-foreground">Vérifiez votre boîte de réception pour le lien de réinitialisation.</p>
              <Link to="/login" className="block btn-primary-glow py-3 text-sm text-center mt-4">Retour connexion</Link>
            </div>
          ) : (
            <>
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50">
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
              <p className="text-xs text-center"><Link to="/login" className="text-primary hover:underline">Retour connexion</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
