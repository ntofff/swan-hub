import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const ResetPasswordPage = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Minimum 6 caractères"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/");
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="glass-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Lien invalide ou expiré.</p>
          <button onClick={() => navigate("/login")} className="btn-primary-glow py-2 px-6 text-sm">Retour connexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-gradient-gold">SWAN</h1>
        </div>
        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold font-heading">Nouveau mot de passe</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choisissez un nouveau mot de passe</p>
          </div>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Confirmer</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50">
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
