import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Puzzle, Zap, Shield, Layers, Play, FileText, BookOpen, CheckSquare, Target, Receipt, Car, Users, Wallet, Calendar, ArrowRight, Star, Globe, Coffee, Heart, Sparkles } from "lucide-react";

const benefits = [
  { icon: Puzzle, title: "À la carte", desc: "Activez uniquement les outils utiles — payez uniquement ce que vous utilisez" },
  { icon: Zap, title: "Ultra rapide", desc: "3 touches max pour chaque action principale" },
  { icon: Shield, title: "Sécurisé", desc: "Données protégées, conforme RGPD, connexion biométrique" },
  { icon: Layers, title: "Toutes activités", desc: "Gérez vos activités professionnelles au même endroit" },
  { icon: Globe, title: "Accessible", desc: "Web, mobile, tablette — partout, tout le temps, sans installation" },
  { icon: Star, title: "Soigné", desc: "Une expérience claire, fiable et agréable au quotidien" },
];

const plugins = [
  { name: "Outil Rapport", desc: "Rapports photo professionnels en quelques secondes avec partage intégré", icon: FileText, active: true },
  { name: "Journal de bord", desc: "Notes chronologiques avec horodatage, priorités et code couleur", icon: BookOpen, active: true },
  { name: "Tâches", desc: "Tâches avec priorités, dates limites et archivage intelligent", icon: CheckSquare, active: true },
  { name: "Missions", desc: "Suivi complet : clients, listes de contrôle, équipe, montants devis", icon: Target, active: true },
  { name: "Devis & Factures", desc: "Facturation complète : PDF, filigrane, RIB, mentions légales, remises", icon: Receipt, active: true },
  { name: "Carnet véhicule", desc: "Kilométrage, calcul IK automatique, suivi conducteurs et véhicules", icon: Car, active: true },
  { name: "Contacts clients", desc: "Suivi simple des clients et relances", icon: Users, active: false },
  { name: "Suivi budget", desc: "Vue financière complète de vos activités", icon: Wallet, active: false },
  { name: "Réservations", desc: "Prise de rendez-vous intelligente", icon: Calendar, active: false },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <PageHeader title="À propos" />
      <div className="px-4 md:px-0">
        {/* Hero */}
        <div className="glass-card-glow p-8 text-center mb-6 space-y-4">
          <h2 className="text-4xl font-bold font-heading text-gradient-gold">SWAN · HUB</h2>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Simple Work</p>
          <p className="text-base text-secondary-foreground leading-relaxed max-w-md mx-auto">
            La plateforme de productivité modulaire pensée pour les professionnels indépendants, artisans et multi-activités.
          </p>
          <p className="text-sm text-muted-foreground">
            Simple. Puissant. Élégant. Accessible.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {[
            { label: "Outils", value: "9" },
            { label: "Par outil", value: "1,20€" },
            { label: "Conforme", value: "RGPD" },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className="text-lg font-bold font-heading text-primary">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="glass-card-glow p-6 mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-primary" />
            <h2 className="text-sm font-bold font-heading">Notre mission</h2>
          </div>
          <p className="text-sm text-secondary-foreground leading-relaxed">
            Rendre accessible à tous des outils professionnels habituellement réservés aux grandes structures. 
            SWAN · HUB est né d'un constat simple : les indépendants et artisans méritent des outils modernes, 
            sans la complexité ni le prix des solutions existantes.
          </p>
          <p className="text-sm text-secondary-foreground leading-relaxed">
            Notre prix est <span className="text-primary font-semibold">volontairement bas</span> — parce que notre objectif n'est pas de vendre un logiciel, 
            mais de permettre à chaque professionnel de se concentrer sur ce qu'il fait de mieux.
          </p>
        </div>

        {/* Pricing teaser */}
        <div className="glass-card p-6 mb-6 space-y-4 text-center">
          <Coffee size={32} className="text-primary mx-auto" />
          <h2 className="text-lg font-bold font-heading">Moins cher qu'un café</h2>
          <p className="text-sm text-secondary-foreground leading-relaxed max-w-sm mx-auto">
            <span className="text-primary font-bold">1,20 € TTC/mois par outil</span>. C'est tout.
            Pas de frais cachés, pas d'engagement.
            Ça coûte moins qu'un expresso — mais ça vous permettra de prendre le temps d'en savourer davantage.
          </p>
          <div className="glass-card p-4 inline-block">
            <p className="text-xs text-muted-foreground">🎉 <span className="text-foreground font-semibold">2 mois gratuits</span> avec 3 outils au choix à l'inscription</p>
          </div>
          <button onClick={() => navigate("/pricing")} className="btn btn-primary btn-full btn-sm">
            Voir les tarifs <ArrowRight size={16} />
          </button>
        </div>

        {/* Benefits */}
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Pourquoi SWAN · HUB</h2>
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          {benefits.map(b => (
            <div key={b.title} className="glass-card p-4 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon size={18} className="text-primary" />
              </div>
              <div className="text-sm font-semibold">{b.title}</div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Outils */}
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Vos outils</h2>
        <div className="space-y-2 mb-8">
          {plugins.map(p => (
            <div key={p.name} className={`glass-card p-4 flex items-center gap-3 transition-all ${!p.active ? 'opacity-50' : 'hover:border-primary/20'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.active ? 'bg-primary/10' : 'bg-secondary'}`}>
                <p.icon size={18} className={p.active ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.desc}</div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {p.active ? "1€/mois" : "Bientôt"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Engagement */}
        <div className="glass-card-glow p-6 mb-8 space-y-3 text-center">
          <Sparkles size={24} className="text-primary mx-auto" />
          <h2 className="text-sm font-bold font-heading">En constante évolution</h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Vous faites partie intégrante de cette aventure. Chaque retour, chaque suggestion façonne SWAN · HUB
            pour le rendre utile à tous. Vos retours construisent l'app de demain.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-2.5 mb-8">
          <button onClick={() => navigate("/signup")} className="btn btn-primary btn-full">
            Commencer gratuitement <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate("/login")} className="w-full py-3.5 text-sm text-center rounded-xl border border-border text-secondary-foreground hover:bg-secondary transition-colors">
            J'ai déjà un compte
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-[10px] text-muted-foreground">SWAN · HUB v1.1.0 · Simple Work</p>
          <p className="text-[10px] text-muted-foreground mt-1">© {new Date().getFullYear()} SWAN · HUB. Tous droits réservés.</p>
        </div>
      </div>
      <FeedbackButton context="about" />
    </div>
  );
};

export default AboutPage;
