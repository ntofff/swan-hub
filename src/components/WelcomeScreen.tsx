import { useState, useEffect } from "react";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car, Sparkles, Rocket, Users, Heart, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const APP_BUILD = "1.0.12";
const WELCOME_KEY = "swan_welcome_dismissed";
const WELCOME_BUILD_KEY = "swan_welcome_build";

const plugins = [
  { icon: FileText, name: "Outil Rapport", desc: "Rapports professionnels en quelques secondes" },
  { icon: BookOpen, name: "Journal de bord", desc: "Notes chronologiques horodatées" },
  { icon: CheckSquare, name: "Tâches", desc: "Gestionnaire de tâches avec priorités et deadlines" },
  { icon: Target, name: "Missions", desc: "Suivi missions, clients et checklists" },
  { icon: Receipt, name: "Devis & Factures", desc: "Facturation complète avec export PDF" },
  { icon: Car, name: "Carnet véhicule", desc: "Kilométrage, IK et suivi conducteurs" },
];

const recentUpdates = [
  "Tâches : export calendrier, deadlines, archivage intelligent",
  "Missions : montant devis, collaborateur, archivage",
  "Devis & Factures : prévisualisation PDF, filigrane, mentions légales, RIB, remises",
  "Émetteur : profil complet auto-injecté sur les documents",
  "Classement par couleur sur devis et factures",
];

export const WelcomeScreen = ({ onClose }: { onClose: () => void }) => {
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [isNewUpdates, setIsNewUpdates] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_KEY);
    const lastBuild = localStorage.getItem(WELCOME_BUILD_KEY);

    if (dismissed === "true" && lastBuild === APP_BUILD) {
      onClose();
      return;
    }

    if (dismissed === "true" && lastBuild !== APP_BUILD) {
      setIsNewUpdates(true);
    }

    requestAnimationFrame(() => setVisible(true));
  }, [onClose]);

  const handleClose = () => {
    if (dontShow) {
      localStorage.setItem(WELCOME_KEY, "true");
      localStorage.setItem(WELCOME_BUILD_KEY, APP_BUILD);
    }
    setVisible(false);
    setTimeout(onClose, 350);
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl overflow-y-auto transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        {/* Close */}
        <div className="flex justify-end">
          <button onClick={handleClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Logo animation */}
        <div className={`text-center space-y-3 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h1 className="text-5xl font-bold font-heading text-gradient-gold">SWAN</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Simple Work Activity Network</p>
          <p className="text-[10px] text-muted-foreground">v{APP_BUILD}</p>
        </div>

        {/* Only updates mode */}
        {isNewUpdates ? (
          <div className={`space-y-6 transition-all duration-500 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="glass-card-glow p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-sm font-bold font-heading">Derniers ajouts et mises à jour</h2>
              </div>
              <ul className="space-y-2">
                {recentUpdates.map((u, i) => (
                  <li key={i} className="text-xs text-secondary-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-4 flex items-start gap-3">
              <Heart size={16} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                SWAN est en <span className="text-foreground font-semibold">constante évolution</span>. Vous faites partie intégrante du processus — chaque retour compte pour rendre l'app utile à tous.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Philosophy */}
            <div className={`space-y-4 transition-all duration-500 delay-400 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Rocket, title: "Gain de temps", desc: "3 taps max pour toute action" },
                  { icon: Sparkles, title: "Tout en un", desc: "Hub d'outils pro essentiels" },
                  { icon: Users, title: "Sur mesure", desc: "Modulaire, adapté à vous" },
                  { icon: Heart, title: "Abordable", desc: "Premium à prix accessible" },
                ].map(b => (
                  <div key={b.title} className="glass-card p-4 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <b.icon size={18} className="text-primary" />
                    </div>
                    <div className="text-sm font-semibold">{b.title}</div>
                    <div className="text-[10px] text-muted-foreground">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plugins */}
            <div className={`transition-all duration-500 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Vos outils</h2>
              <div className="space-y-1.5">
                {plugins.map(p => (
                  <div key={p.name} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <p.icon size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent updates */}
            <div className={`transition-all duration-500 delay-[600ms] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Derniers ajouts</h2>
              <div className="glass-card p-4 space-y-2">
                {recentUpdates.map((u, i) => (
                  <div key={i} className="text-xs text-secondary-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {u}
                  </div>
                ))}
              </div>
            </div>

            {/* Evolution message */}
            <div className={`transition-all duration-500 delay-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <div className="glass-card-glow p-5 text-center space-y-2">
                <p className="text-sm text-secondary-foreground leading-relaxed">
                  SWAN est en <span className="text-foreground font-bold">constante évolution</span>.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vous faites partie intégrante de cette aventure — vos retours façonnent l'app pour la rendre utile à tous, à un prix très abordable.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Checkbox + CTA */}
        <div className={`space-y-4 pb-4 transition-all duration-500 delay-[800ms] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(v === true)} />
            <span className="text-xs text-muted-foreground">Ne plus afficher au lancement</span>
          </label>
          <button onClick={handleClose} className="w-full btn-primary-glow py-3.5 text-sm font-semibold">
            {isNewUpdates ? "C'est noté !" : "Commencer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { APP_BUILD };
