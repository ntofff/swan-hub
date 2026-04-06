import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-gradient-gold">SWAN</h1>
          <p className="text-xs text-muted-foreground mt-1">Simple Work Activity Network</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold font-heading">Connexion</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Accédez à votre espace</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="flex justify-between text-xs">
            <Link to="/forgot-password" className="text-primary hover:underline">Mot de passe oublié ?</Link>
            <Link to="/signup" className="text-primary hover:underline">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
