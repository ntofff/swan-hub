import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const AccessDeniedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="glass-card p-8 text-center space-y-4 max-w-sm fade-in">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
        <Shield size={28} className="text-destructive" />
      </div>
      <h1 className="text-xl font-bold font-heading">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
      <Link to="/" className="block btn-primary-glow py-3 text-sm text-center">Retour à l'accueil</Link>
    </div>
  </div>
);

export default AccessDeniedPage;
