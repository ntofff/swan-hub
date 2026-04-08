import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Coffee, Check, ArrowRight, FileText, BookOpen, CheckSquare, Target, Receipt, Car, Sparkles, Gift } from "lucide-react";

const allPlugins = [
  { id: "report", name: "Outil Rapport", icon: FileText },
  { id: "logbook", name: "Journal de bord", icon: BookOpen },
  { id: "tasks", name: "Tâches", icon: CheckSquare },
  { id: "missions", name: "Missions", icon: Target },
  { id: "quotes", name: "Devis & Factures", icon: Receipt },
  { id: "vehicle", name: "Carnet véhicule", icon: Car },
];

const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <PageHeader title="Tarifs" subtitle="Simple, transparent, accessible" />
      <div className="px-4 md:px-0">

        {/* Hero pricing */}
        <div className="glass-card-glow p-8 text-center mb-6 space-y-4">
          <Coffee size={40} className="text-primary mx-auto" />
          <h2 className="text-2xl font-bold font-heading">Moins cher qu'un café</h2>
          <p className="text-sm text-secondary-foreground leading-relaxed max-w-sm mx-auto">
            Chaque plugin coûte seulement <span className="text-primary font-bold text-lg">1€/mois</span>.
            C'est le prix d'un expresso — mais ça vous fera gagner des heures.
          </p>
          <p className="text-xs text-muted-foreground italic max-w-xs mx-auto">
            Un prix volontairement bas pour permettre le développement de tous avec des outils simplifiés mais efficaces.
          </p>
        </div>

        {/* Free trial */}
        <div className="glass-card border-primary/30 p-6 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Gift size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading">Essai gratuit</h3>
              <p className="text-xs text-muted-foreground">1 mois complet, aucun engagement</p>
            </div>
          </div>
          <ul className="space-y-2">
            {[
              "3 plugins de votre choix pendant 30 jours",
              "Toutes les fonctionnalités incluses",
              "Aucune carte bancaire requise",
              "Résiliation automatique si vous ne continuez pas",
            ].map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-secondary-foreground">
                <Check size={16} className="text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing per plugin */}
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Choisissez vos plugins</h2>
        <div className="space-y-2 mb-6">
          {allPlugins.map(p => (
            <div key={p.id} className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <p.icon size={18} className="text-primary" />
              </div>
              <span className="text-sm font-medium flex-1">{p.name}</span>
              <span className="text-sm font-bold text-primary">1€<span className="text-xs font-normal text-muted-foreground">/mois</span></span>
            </div>
          ))}
        </div>

        {/* Examples */}
        <div className="glass-card p-5 mb-6 space-y-3">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> Exemples
          </h3>
          <div className="space-y-2">
            {[
              { plugins: 3, price: "3€/mois", desc: "Rapport + Tâches + Missions — le kit de base" },
              { plugins: 5, price: "5€/mois", desc: "Presque tout — le pro complet" },
              { plugins: 6, price: "6€/mois", desc: "Tous les plugins — zéro limite" },
            ].map(e => (
              <div key={e.plugins} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg font-bold text-primary w-14 text-center">{e.price}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold">{e.plugins} plugins</p>
                  <p className="text-[10px] text-muted-foreground">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketing message */}
        <div className="glass-card-glow p-6 mb-6 text-center space-y-3">
          <p className="text-sm text-secondary-foreground leading-relaxed">
            ☕ C'est moins cher qu'un café, mais ça vous permettra de <span className="text-foreground font-bold">prendre le temps d'en boire plus</span>.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Notre prix est volontairement bas parce que nous croyons que des outils simples et efficaces 
            doivent être accessibles à tous les professionnels, pas seulement ceux qui ont les moyens 
            de s'offrir des solutions complexes et coûteuses.
          </p>
        </div>

        {/* CTA */}
        <button onClick={() => navigate("/signup")} className="w-full btn-primary-glow py-3.5 text-sm flex items-center justify-center gap-2 mb-8">
          Essayer gratuitement 1 mois <ArrowRight size={16} />
        </button>
      </div>
      <FeedbackButton context="pricing" />
    </div>
  );
};

export default PricingPage;
